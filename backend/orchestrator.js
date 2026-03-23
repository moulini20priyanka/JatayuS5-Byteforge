const { StateGraph, END } = require("@langchain/langgraph");
const { fetchGitHubData }   = require("./agents/githubAgent");
const { fetchLeetCodeData } = require("./agents/leetcodeAgent");
const { fetchLinkedInData } = require("./agents/linkedinAgent");
const { parseResume }       = require("./agents/resumeParser");
const { runInference }      = require("./agents/inferenceAgent");
const { runDecision }       = require("./agents/decisionAgent");
const db                    = require("./config/db");

if (typeof DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof Path2D    === 'undefined') { global.Path2D    = class Path2D    {}; }

function createInitialState(input) {
  return {
    candidate_id:    input.candidate_id   || null,
    resume_buffer:   input.resume_buffer  || null,
    pasted_linkedin: input.pasted_linkedin || null,
    override_urls: {
      github:   input.github_url   || null,
      linkedin: input.linkedin_url || null,
      leetcode: input.leetcode_url || null,
    },
    test_scores: input.test_scores || null,
    urls: { github: null, linkedin: null, leetcode: null, hackerrank: null },
    github_data:   null,
    leetcode_data: null,
    linkedin_data: null,
    resume_data:   null,
    source_status:     null,
    missing_sources:   null,
    inferred:          null,
    unified_scores:    null,
    insights:          null,
    cross_check_flags: null,
    chart_data:        null,
    confidence_level:  null,
    decision:          null,
    confidence:        null,
    risk:              null,
    overall_score:     null,
    dimension_scores:  null,
    decision_insights: null,
    recommendation:    null,
    method:            null,
    evaluated_at:      null,
    __emit:   input.__emit || (() => {}),
    __errors: [],
  };
}

// FIX 1 — guard against missing __emit before calling it
function emit(state, event) {
  const fn = (state && typeof state.__emit === "function") ? state.__emit : () => {};
  fn({
    type:      event.type    || "progress",
    agent:     event.agent   || "orchestrator",
    status:    event.status  || "running",
    message:   event.message || "",
    data:      event.data    || null,
    timestamp: new Date().toISOString(),
  });
}

async function resumeNode(state) {
  emit(state, { agent: "resume", status: "running", message: "Parsing resume PDF…" });
  try {
    if (!state.resume_buffer) {
      emit(state, { agent: "resume", status: "skipped", message: "No resume provided" });
      return { ...state, resume_data: null, urls: state.override_urls };
    }
    const parsed = await parseResume(state.resume_buffer);
    const urls = {
      github:     state.override_urls.github   || parsed.github    || null,
      linkedin:   state.override_urls.linkedin || parsed.linkedin  || null,
      leetcode:   state.override_urls.leetcode || parsed.leetcode  || null,
      hackerrank: parsed.hackerrank || null,
    };
    emit(state, {
      agent: "resume", status: "done",
      message: `Resume parsed (${parsed.data_source}). URLs found: ${Object.values(urls).filter(Boolean).length}/4`,
      data: { urls, skills_count: parsed.skills?.length || 0 },
    });
    return { ...state, resume_data: parsed, urls };
  } catch (err) {
    emit(state, { agent: "resume", status: "failed", message: err.message });
    return {
      ...state,
      resume_data: null,
      urls: state.override_urls,
      __errors: [...state.__errors, { agent: "resume", error: err.message }],
    };
  }
}

async function collectNode(state) {
  emit(state, { agent: "collect", status: "running", message: "Fetching GitHub, LeetCode, LinkedIn in parallel…" });
  const { github, linkedin, leetcode } = state.urls;

  const [githubResult, leetcodeResult, linkedinResult] = await Promise.allSettled([
    github   ? fetchGitHubData(github)                             : Promise.resolve(null),
    leetcode ? fetchLeetCodeData(leetcode)                         : Promise.resolve(null),
    (linkedin || state.pasted_linkedin)
             ? fetchLinkedInData(linkedin, state.pasted_linkedin)  : Promise.resolve(null),
  ]);

  const githubData   = githubResult.status   === "fulfilled" ? githubResult.value   : null;
  const leetcodeData = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : null;
  const linkedinData = linkedinResult.status === "fulfilled" ? linkedinResult.value : null;

  const errors = [...state.__errors];
  if (githubResult.status   === "rejected") errors.push({ agent: "github",   error: githubResult.reason?.message });
  if (leetcodeResult.status === "rejected") errors.push({ agent: "leetcode", error: leetcodeResult.reason?.message });
  if (linkedinResult.status === "rejected") errors.push({ agent: "linkedin", error: linkedinResult.reason?.message });

  emit(state, {
    agent:   "github",
    status:  githubData?.data_source === "github_api" ? "done" : "failed",
    message: githubData?.data_source === "github_api"
      ? `GitHub: ${githubData.public_repos} repos, ${githubData.top_languages?.join(", ")}`
      : `GitHub: ${githubData?.error || "no data"}`,
    data: githubData ? { score: githubData.coding_skill_score } : null,
  });
  emit(state, {
    agent:   "leetcode",
    status:  leetcodeData?.data_source === "leetcode_graphql" ? "done" : "failed",
    message: leetcodeData?.data_source === "leetcode_graphql"
      ? `LeetCode: ${leetcodeData.total_solved} solved (E:${leetcodeData.easy} M:${leetcodeData.medium} H:${leetcodeData.hard})`
      : `LeetCode: ${leetcodeData?.error || "no data"}`,
    data: leetcodeData ? { score: leetcodeData.problem_solving_score } : null,
  });
  emit(state, {
    agent:   "linkedin",
    status:  linkedinData && linkedinData.data_source !== "failed" ? "done" : "failed",
    message: linkedinData && linkedinData.data_source !== "failed"
      ? `LinkedIn: ${linkedinData.name || "name unknown"}, ${linkedinData.skills?.length || 0} skills`
      : `LinkedIn: ${linkedinData?.error || "no data"}`,
    data: linkedinData ? { score: linkedinData.linkedin_score } : null,
  });

  return {
    ...state,
    github_data:   githubData,
    leetcode_data: leetcodeData,
    linkedin_data: linkedinData,
    __errors:      errors,
  };
}

function routeAfterCollect(state) {
  const hasGitHub   = state.github_data   && state.github_data.data_source   !== "failed";
  const hasLeetCode = state.leetcode_data && state.leetcode_data.data_source !== "failed";
  const hasLinkedIn = state.linkedin_data && state.linkedin_data.data_source !== "failed";
  const hasResume   = state.resume_data   && state.resume_data.data_source   !== "failed";
  const hasTest     = !!state.test_scores;

  if (!hasGitHub && !hasLeetCode && !hasLinkedIn && !hasResume && !hasTest) {
    // FIX 1 — safe emit inside route function (no crash if __emit missing)
    emit(state, { agent: "router", status: "running", message: "No data from any source — skipping inference" });
    return "no_data";
  }
  return "has_data";
}

async function inferenceNode(state) {
  emit(state, { agent: "inference", status: "running", message: "Cross-checking sources and building unified scores…" });
  try {
    const enriched = await runInference(state);
    emit(state, {
      agent: "inference", status: "done",
      message: `Inference complete. ${enriched.missing_sources?.length || 0} missing. ${enriched.cross_check_flags?.length || 0} flags.`,
      data: {
        confidence_level: enriched.confidence_level,
        missing:          enriched.missing_sources,
        flags:            enriched.cross_check_flags,
      },
    });
    return enriched;
  } catch (err) {
    emit(state, { agent: "inference", status: "failed", message: err.message });
    return { ...state, __errors: [...state.__errors, { agent: "inference", error: err.message }] };
  }
}

async function decisionNode(state) {
  emit(state, { agent: "decision", status: "running", message: "Running hiring decision analysis…" });
  try {
    const decided = await runDecision(state);
    emit(state, {
      agent: "decision", status: "done",
      message: `Decision: ${decided.decision} (confidence: ${decided.confidence}, risk: ${decided.risk}, score: ${decided.overall_score}/100)`,
      data: {
        decision:      decided.decision,
        confidence:    decided.confidence,
        risk:          decided.risk,
        overall_score: decided.overall_score,
        method:        decided.method,
      },
    });
    return decided;
  } catch (err) {
    emit(state, { agent: "decision", status: "failed", message: err.message });
    return {
      ...state,
      decision:      "Maybe",
      confidence:    "Low",
      risk:          "High",
      overall_score: 0,
      method:        "error_fallback",
      __errors:      [...state.__errors, { agent: "decision", error: err.message }],
    };
  }
}

async function persistNode(state) {
  emit(state, { agent: "persist", status: "running", message: "Saving report to database…" });
  try {
    const scoresJson = JSON.stringify({
      unified:    state.unified_scores,
      dimensions: state.dimension_scores,
    });

    // FIX 2 — safely strip raw_text without crashing when resume_data is null
    const resumeForDB = state.resume_data
      ? JSON.stringify({ ...state.resume_data, raw_text: undefined })
      : null;

    const sql = `
      INSERT INTO evaluations (
        candidate_id, github_raw, leetcode_raw, linkedin_raw, resume_raw,
        scores, decision, confidence, risk, overall_score,
        insights, decision_insights, chart_data, recommendation, method, errors, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        scores            = VALUES(scores),
        decision          = VALUES(decision),
        confidence        = VALUES(confidence),
        risk              = VALUES(risk),
        overall_score     = VALUES(overall_score),
        insights          = VALUES(insights),
        decision_insights = VALUES(decision_insights),
        chart_data        = VALUES(chart_data),
        recommendation    = VALUES(recommendation),
        method            = VALUES(method),
        errors            = VALUES(errors),
        created_at        = NOW()
    `;

    await db.query(sql, [
      state.candidate_id,
      JSON.stringify(state.github_data),
      JSON.stringify(state.leetcode_data),
      JSON.stringify(state.linkedin_data),
      resumeForDB,
      scoresJson,
      state.decision,
      state.confidence,
      state.risk,
      state.overall_score,
      JSON.stringify(state.insights),
      JSON.stringify(state.decision_insights),
      JSON.stringify(state.chart_data),
      state.recommendation,
      state.method,
      JSON.stringify(state.__errors),
    ]);

    emit(state, { agent: "persist", status: "done", message: "Report saved." });
  } catch (err) {
    console.error("Persist node error:", err.message);
    emit(state, { agent: "persist", status: "failed", message: `DB save failed: ${err.message}` });
  }
  return state;
}

function buildGraph() {
  const graph = new StateGraph({
    channels: {
      candidate_id:      { value: (x, y) => y ?? x, default: () => null },
      resume_buffer:     { value: (x, y) => y ?? x, default: () => null },
      pasted_linkedin:   { value: (x, y) => y ?? x, default: () => null },
      override_urls:     { value: (x, y) => y ?? x, default: () => ({}) },
      test_scores:       { value: (x, y) => y ?? x, default: () => null },
      urls:              { value: (x, y) => y ?? x, default: () => ({}) },
      github_data:       { value: (x, y) => y ?? x, default: () => null },
      leetcode_data:     { value: (x, y) => y ?? x, default: () => null },
      linkedin_data:     { value: (x, y) => y ?? x, default: () => null },
      resume_data:       { value: (x, y) => y ?? x, default: () => null },
      source_status:     { value: (x, y) => y ?? x, default: () => null },
      missing_sources:   { value: (x, y) => y ?? x, default: () => null },
      inferred:          { value: (x, y) => y ?? x, default: () => null },
      unified_scores:    { value: (x, y) => y ?? x, default: () => null },
      insights:          { value: (x, y) => y ?? x, default: () => [] },
      cross_check_flags: { value: (x, y) => y ?? x, default: () => [] },
      chart_data:        { value: (x, y) => y ?? x, default: () => null },
      confidence_level:  { value: (x, y) => y ?? x, default: () => null },
      decision:          { value: (x, y) => y ?? x, default: () => null },
      confidence:        { value: (x, y) => y ?? x, default: () => null },
      risk:              { value: (x, y) => y ?? x, default: () => null },
      overall_score:     { value: (x, y) => y ?? x, default: () => null },
      dimension_scores:  { value: (x, y) => y ?? x, default: () => null },
      decision_insights: { value: (x, y) => y ?? x, default: () => [] },
      recommendation:    { value: (x, y) => y ?? x, default: () => null },
      method:            { value: (x, y) => y ?? x, default: () => null },
      evaluated_at:      { value: (x, y) => y ?? x, default: () => null },
      __emit:            { value: (x, y) => y ?? x, default: () => () => {} },
      __errors:          { value: (x, y) => [...(x||[]), ...(y||[])], default: () => [] },
    },
  });

  graph.addNode("resume_node",    resumeNode);
  graph.addNode("collect_node",   collectNode);
  graph.addNode("inference_node", inferenceNode);
  graph.addNode("decision_node",  decisionNode);
  graph.addNode("persist_node",   persistNode);

  graph.setEntryPoint("resume_node");
  graph.addEdge("resume_node", "collect_node");
  graph.addConditionalEdges("collect_node", routeAfterCollect, {
    has_data: "inference_node",
    no_data:  "decision_node",
  });
  graph.addEdge("inference_node", "decision_node");
  graph.addEdge("decision_node",  "persist_node");
  graph.addEdge("persist_node",   END);

  return graph.compile();
}

const compiledGraph = buildGraph();

async function runEvaluation(input) {
  const initialState = createInitialState(input);
  emit(initialState, {
    agent: "orchestrator", status: "running",
    message: "Evaluation started",
    data: { candidate_id: input.candidate_id },
  });
  try {
    const finalState = await compiledGraph.invoke(initialState);
    emit(finalState, {
      agent: "orchestrator", status: "done",
      message: "Evaluation complete",
      data: { decision: finalState.decision, overall_score: finalState.overall_score },
    });
    return buildReport(finalState);
  } catch (err) {
    emit(initialState, { agent: "orchestrator", status: "failed", message: `Evaluation failed: ${err.message}` });
    throw err;
  }
}

function buildReport(state) {
  return {
    candidate_id:      state.candidate_id,
    decision:          state.decision,
    confidence:        state.confidence,
    risk:              state.risk,
    overall_score:     state.overall_score,
    recommendation:    state.recommendation,
    dimension_scores:  state.dimension_scores,
    unified_scores:    state.unified_scores,
    insights:          state.insights          || [],
    decision_insights: state.decision_insights || [],
    cross_check_flags: state.cross_check_flags || [],
    chart_data:        state.chart_data,
    source_status:     state.source_status,
    missing_sources:   state.missing_sources   || [],
    confidence_level:  state.confidence_level,
    candidate_name:    state.linkedin_data?.name || state.resume_data?.full_name || null,
    candidate_email:   state.resume_data?.email  || null,
    urls:              state.urls,
    method:            state.method,
    // FIX 3 — evaluated_at was always null; set it here at report build time
    evaluated_at:      new Date().toISOString(),
    errors:            state.__errors,
    github_raw:        state.github_data,
    leetcode_raw:      state.leetcode_data,
    linkedin_raw:      state.linkedin_data,
  };
}

module.exports = { runEvaluation };