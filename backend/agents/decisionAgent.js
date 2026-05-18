// ── agents/decisionAgent.js ───────────────────────────────────────
const axios     = require("axios");
const { trace } = require("../utils/tracer");

function preScreen(state) {
  const unified   = state.unified_scores;
  const flags     = state.cross_check_flags || [];
  const missing   = state.missing_sources   || [];
  const testScore = unified?.test_performance?.overall;

  if (testScore !== null && testScore !== undefined && testScore < 25)
    return { decision: "Reject", confidence: "High", risk: "Low", rule: "test_score_hard_fail", reason: `Test score of ${testScore}/100 is below the minimum threshold.` };

  if (flags.includes("no_coding_validation") && (testScore === null || testScore === undefined))
    return { decision: "Maybe", confidence: "Low", risk: "High", rule: "no_coding_validation", reason: "No coding data available from any source. Manual technical interview required." };

  if (flags.includes("resume_no_skills") && missing.includes("github") && missing.includes("leetcode"))
    return { decision: "Reject", confidence: "Medium", risk: "Medium", rule: "no_technical_signals", reason: "No technical skills detected in resume and no external coding profiles found." };

  const allReal     = state.source_status?.github === "real" && state.source_status?.leetcode === "real" && state.source_status?.linkedin === "real";
  const codingScore = unified?.coding_skill?.score    || 0;
  const lcScore     = unified?.problem_solving?.score || 0;
  const consScore   = unified?.consistency?.score     || 0;

  if (allReal && codingScore > 75 && lcScore > 75 && consScore > 70)
    return { decision: "Hire", confidence: "High", risk: "Low", rule: "strong_all_sources", reason: "Strong signals across all verified sources.", fast_track: true };

  return null;
}

function ruleBasedDecision(state) {
  const unified    = state.unified_scores;
  const flags      = state.cross_check_flags || [];
  const confidence = state.confidence_level  || "low";
  const scores = {
    coding_skill:          unified?.coding_skill?.score          || 0,
    problem_solving:       unified?.problem_solving?.score       || 0,
    consistency:           unified?.consistency?.score           || 0,
    professional_presence: unified?.professional_presence?.score || 0,
    test_performance:      unified?.test_performance?.overall    || 0,
  };
  const hasTest    = unified?.test_performance?.source === "test";
  const overall    = Math.round(
    scores.coding_skill          * (hasTest ? 0.20 : 0.30) +
    scores.problem_solving       * (hasTest ? 0.20 : 0.25) +
    scores.consistency           * (hasTest ? 0.15 : 0.20) +
    scores.professional_presence * (hasTest ? 0.15 : 0.25) +
    scores.test_performance      * (hasTest ? 0.30 : 0.00)
  );
  const finalScore = Math.max(overall - flags.filter((f) => f.includes("mismatch")).length * 3, 0);
  let decision, risk;
  if      (finalScore >= 70) { decision = "Hire";   risk = finalScore >= 80 ? "Low" : "Medium"; }
  else if (finalScore >= 45) { decision = "Maybe";  risk = "Medium"; }
  else                       { decision = "Reject"; risk = "High"; }
  return {
    decision,
    confidence: { high: "High", medium: "Medium", low: "Low" }[confidence] || "Low",
    risk,
    overall_score:     finalScore,
    dimension_scores:  scores,
    decision_insights: state.insights?.map((i) => i.message) || [],
    recommendation:    `Rule-based: score ${finalScore}/100.`,
    method:            "rule_based",
    evaluated_at:      new Date().toISOString(),
  };
}

function buildPrompt(state, preScreenResult) {
  const unified  = state.unified_scores;
  const flags    = state.cross_check_flags || [];
  const missing  = state.missing_sources   || [];
  const status   = state.source_status     || {};
  const insights = state.insights          || [];
  return `You are an experienced technical recruiter. Return ONLY valid JSON.
${preScreenResult ? `Pre-screen note: ${preScreenResult.reason}` : ""}
SOURCES: ${Object.entries(status).map(([k, v]) => `${k}:${v}`).join(", ")}
${missing.length ? `Missing: ${missing.join(", ")}` : "All sources available."}
SCORES:
- Coding: ${unified?.coding_skill?.score          ?? "N/A"}/100
- Problem solving: ${unified?.problem_solving?.score   ?? "N/A"}/100
- Consistency: ${unified?.consistency?.score        ?? "N/A"}/100
- Professional: ${unified?.professional_presence?.score ?? "N/A"}/100
- Test: ${unified?.test_performance?.overall       ?? "N/A"}/100
FLAGS: ${flags.join(", ") || "none"}
WARNINGS: ${insights.filter(i => i.type === "warning").map(i => i.message).join(", ") || "none"}
Return JSON: {"decision":"Hire|Reject|Maybe","confidence":"High|Medium|Low","risk":"High|Medium|Low","overall_score":0,"dimension_scores":{"coding_skill":0,"problem_solving":0,"consistency":0,"professional_presence":0,"test_performance":0},"decision_insights":["","","","",""],"recommendation":""}`;
}

// ── Calls Groq and returns BOTH the parsed decision AND token usage ──
async function callLLM(prompt) {
  if (!process.env.GROQ_API_KEY) return { decision: null, usage: null };

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model:       "llama-3.3-70b-versatile",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  // ── Extract token usage from Groq response ───────────────────────
  const usage = res.data.usage
    ? {
        prompt_tokens:     res.data.usage.prompt_tokens     || 0,
        completion_tokens: res.data.usage.completion_tokens || 0,
        total_tokens:      res.data.usage.total_tokens      || 0,
      }
    : null;

  return {
    decision: res.data.choices[0].message.content.trim(),
    usage,
  };
}

function parseLLMResponse(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, "").trim());
    const required = ["decision", "confidence", "risk", "overall_score", "dimension_scores", "decision_insights", "recommendation"];
    if (required.some(f => !(f in parsed))) return null;
    if (!["Hire", "Reject", "Maybe"].includes(parsed.decision)) return null;
    return parsed;
  } catch { return null; }
}

async function runDecision(state) {
  return trace(
    {
      name:    "decision-agent",
      runType: "chain",
      inputs: {
        candidate_id:   state.candidate_id    || "unknown",
        unified_scores: state.unified_scores,
        flags:          state.cross_check_flags || [],
      },
      tags: ["decision-agent", "groq", "hiring"],
    },
    async () => {
      const pre = preScreen(state);

      // ── Hard rule triggered (no LLM call) ──────────────────────
      if (pre && !pre.fast_track) {
        const rb     = ruleBasedDecision(state);
        const result = {
          ...state,
          decision:          pre.decision,
          confidence:        pre.confidence,
          risk:              pre.risk,
          overall_score:     rb.overall_score,
          dimension_scores:  rb.dimension_scores,
          decision_insights: [pre.reason, ...rb.decision_insights.slice(0, 4)],
          recommendation:    pre.reason,
          method:            `rule_based:${pre.rule}`,
          evaluated_at:      new Date().toISOString(),
        };
        // No LLM call → no tokens to report; return plain state
        return result;
      }

      // ── No Groq key → pure rule-based ──────────────────────────
      if (!process.env.GROQ_API_KEY) {
        return ruleBasedDecision(state);
      }

      // ── LLM path ───────────────────────────────────────────────
      try {
        const { decision: rawText, usage } = await callLLM(buildPrompt(state, pre));
        const llmResult = parseLLMResponse(rawText);

        if (!llmResult) {
          // LLM returned unparseable output → fall back, but still report tokens
          const fallback = ruleBasedDecision(state);
          return { __result: { ...state, ...fallback }, __usage: usage };
        }

        const insights = pre?.fast_track
          ? [pre.reason, ...llmResult.decision_insights.slice(0, 4)]
          : llmResult.decision_insights;

        const result = {
          ...state,
          decision:          llmResult.decision,
          confidence:        llmResult.confidence,
          risk:              llmResult.risk,
          overall_score:     llmResult.overall_score,
          dimension_scores:  llmResult.dimension_scores,
          decision_insights: insights,
          recommendation:    llmResult.recommendation,
          method:            "llm",
          evaluated_at:      new Date().toISOString(),
        };

        // ── Return token usage to tracer via __result/__usage envelope ──
        return { __result: result, __usage: usage };

      } catch (err) {
        console.error("[DecisionAgent] LLM call failed:", err.message);
        return { ...state, ...ruleBasedDecision(state) };
      }
    }
  );
}

module.exports = { runDecision };