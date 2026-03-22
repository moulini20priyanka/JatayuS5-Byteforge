// decisionAgent.js
const axios = require("axios");

// ── PHASE 1: RULE-BASED PRE-SCREENING ────────────────────────────
function preScreen(state) {
  const unified   = state.unified_scores;
  const flags     = state.cross_check_flags || [];
  const missing   = state.missing_sources   || [];
  const testScore = unified?.test_performance?.overall;

  if (testScore !== null && testScore !== undefined && testScore < 25) {
    return {
      decision:   "Reject",
      confidence: "High",
      risk:       "Low",
      rule:       "test_score_hard_fail",
      reason:     `Test score of ${testScore}/100 is below the minimum threshold.`,
    };
  }

  if (
    flags.includes("no_coding_validation") &&
    (testScore === null || testScore === undefined)
  ) {
    return {
      decision:   "Maybe",
      confidence: "Low",
      risk:       "High",
      rule:       "no_coding_validation",
      reason:     "No coding data available from any source. Manual technical interview required.",
    };
  }

  if (
    flags.includes("resume_no_skills") &&
    missing.includes("github") &&
    missing.includes("leetcode")
  ) {
    return {
      decision:   "Reject",
      confidence: "Medium",
      risk:       "Medium",
      rule:       "no_technical_signals",
      reason:     "No technical skills detected in resume and no external coding profiles found.",
    };
  }

  const allReal =
    state.source_status?.github   === "real" &&
    state.source_status?.leetcode === "real" &&
    state.source_status?.linkedin === "real";

  const codingScore = unified?.coding_skill?.score    || 0;
  const lcScore     = unified?.problem_solving?.score || 0;
  const consScore   = unified?.consistency?.score     || 0;

  if (allReal && codingScore > 75 && lcScore > 75 && consScore > 70) {
    return {
      decision:   "Hire",
      confidence: "High",
      risk:       "Low",
      rule:       "strong_all_sources",
      reason:     "Strong signals across all verified sources.",
      fast_track: true,
    };
  }

  return null;
}

// ── RULE-BASED FALLBACK SCORING ───────────────────────────────────
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

  const hasTest = unified?.test_performance?.source === "test";
  const overall = Math.round(
    scores.coding_skill          * (hasTest ? 0.20 : 0.30) +
    scores.problem_solving       * (hasTest ? 0.20 : 0.25) +
    scores.consistency           * (hasTest ? 0.15 : 0.20) +
    scores.professional_presence * (hasTest ? 0.15 : 0.25) +
    scores.test_performance      * (hasTest ? 0.30 : 0.00)
  );

  const penalty    = flags.filter((f) => f.includes("mismatch")).length * 3;
  const finalScore = Math.max(overall - penalty, 0);

  let decision, risk;
  if (finalScore >= 70) {
    decision = "Hire";
    risk     = finalScore >= 80 ? "Low" : "Medium";
  } else if (finalScore >= 45) {
    decision = "Maybe";
    risk     = "Medium";
  } else {
    decision = "Reject";
    risk     = "High";
  }

  const confidenceMap = { high: "High", medium: "Medium", low: "Low" };

  return {
    decision,
    confidence:        confidenceMap[confidence] || "Low",
    risk,
    overall_score:     finalScore,
    dimension_scores:  scores,
    decision_insights: state.insights?.map((i) => i.message) || [],
    recommendation:    `Rule-based assessment: overall score ${finalScore}/100. ${decision === "Hire" ? "Candidate meets hiring criteria." : decision === "Maybe" ? "Candidate requires further evaluation." : "Candidate does not meet minimum requirements."}`,
    method:            "rule_based",
    evaluated_at:      new Date().toISOString(),
  };
}

// ── LLM PROMPT BUILDER ────────────────────────────────────────────
function buildPrompt(state, preScreenResult) {
  const unified  = state.unified_scores;
  const flags    = state.cross_check_flags || [];
  const missing  = state.missing_sources   || [];
  const insights = state.insights          || [];
  const status   = state.source_status     || {};

  const sourcesSummary = Object.entries(status)
    .map(([src, quality]) => `  - ${src}: ${quality}`)
    .join("\n");

  const scoresSummary = `
  - Coding skill:          ${unified?.coding_skill?.score          ?? "N/A"}/100 (source: ${unified?.coding_skill?.source          || "none"})
  - Problem solving:       ${unified?.problem_solving?.score       ?? "N/A"}/100 (source: ${unified?.problem_solving?.source       || "none"})
  - Consistency:           ${unified?.consistency?.score           ?? "N/A"}/100 (source: ${unified?.consistency?.source           || "none"})
  - Professional presence: ${unified?.professional_presence?.score ?? "N/A"}/100 (source: ${unified?.professional_presence?.source || "none"})
  - Test performance:      ${unified?.test_performance?.overall    ?? "N/A"}/100 (source: ${unified?.test_performance?.source      || "none"})
  ${unified?.test_performance?.source === "test" ? `    MCQ: ${unified.test_performance.mcq}, SQL: ${unified.test_performance.sql}, Coding: ${unified.test_performance.coding}` : ""}`.trim();

  const flagsSummary = flags.length
    ? flags.map((f) => `  - ${f.replace(/_/g, " ")}`).join("\n")
    : "  - none";

  const warningSummary = insights
    .filter((i) => i.type === "warning")
    .map((i) => `  - [${i.section}] ${i.message}`)
    .join("\n") || "  - none";

  const missingText = missing.length
    ? `Missing sources: ${missing.join(", ")}. Scores from missing sources are estimated.`
    : "All sources available.";

  const preScreenNote = preScreenResult
    ? `\nPre-screening note: ${preScreenResult.reason} (rule: ${preScreenResult.rule})`
    : "";

  return `You are an experienced technical recruiter making a hiring evaluation.
Analyse the candidate data below and produce a structured hiring decision.
${preScreenNote}

DATA SOURCES (quality):
${sourcesSummary}
${missingText}

SCORES (0-100):
${scoresSummary}

CROSS-CHECK FLAGS:
${flagsSummary}

WARNINGS FROM INFERENCE AGENT:
${warningSummary}

INSTRUCTIONS:
- Think like a senior technical recruiter — be fair, logical, and explainable
- Weight test_performance highest if available (most controlled signal)
- If sources are missing or estimated, reflect that in confidence and risk
- Cross-check flags reduce confidence — address them in your insights
- Do NOT fabricate data — only reason from what is provided above

Return ONLY a valid JSON object with exactly this shape (no markdown, no explanation):
{
  "decision": "Hire" | "Reject" | "Maybe",
  "confidence": "High" | "Medium" | "Low",
  "risk": "High" | "Medium" | "Low",
  "overall_score": <0-100 integer>,
  "dimension_scores": {
    "coding_skill": <0-100>,
    "problem_solving": <0-100>,
    "consistency": <0-100>,
    "professional_presence": <0-100>,
    "test_performance": <0-100 or null>
  },
  "decision_insights": [
    "<insight about coding ability>",
    "<insight about problem solving>",
    "<insight about consistency or activity>",
    "<insight about professional presence or LinkedIn>",
    "<insight about test performance or overall risk>"
  ],
  "recommendation": "<2-3 sentence recruiter summary explaining the decision>"
}

Rules for the JSON:
- decision_insights must have exactly 5 strings, one per dimension
- overall_score must reflect the weighted average of dimension_scores
- risk is HIGH if: many missing sources, major mismatches, or low confidence
- risk is LOW if: all sources real, scores consistent, no major flags
- Be concise in insights — max 20 words each
- recommendation should be actionable for a recruiter`;
}

// ── LLM CALL ─────────────────────────────────────────────────────
async function callLLM(prompt) {
  if (process.env.GROQ_API_KEY) {
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
    return res.data.choices[0].message.content.trim();
  }


  return null;
}

// ── PARSE LLM RESPONSE ────────────────────────────────────────────
function parseLLMResponse(raw) {
  if (!raw) return null;
  try {
    const clean  = raw.replace(/^```json|^```|```$/gm, "").trim();
    const parsed = JSON.parse(clean);

    const required = ["decision", "confidence", "risk", "overall_score",
                       "dimension_scores", "decision_insights", "recommendation"];
    for (const field of required) {
      if (!(field in parsed)) {
        console.warn(`LLM response missing field: ${field} — falling back to rule-based`);
        return null;
      }
    }

    if (!["Hire", "Reject", "Maybe"].includes(parsed.decision)) return null;

    return parsed;
  } catch (err) {
    console.warn("Failed to parse LLM response:", err.message);
    return null;
  }
}

// ── MAIN EXPORT ──────────────────────────────────────────────────
async function runDecision(state) {
  const preScreenResult = preScreen(state);

  if (preScreenResult && !preScreenResult.fast_track) {
    const ruleFallback = ruleBasedDecision(state);
    return {
      ...state,
      decision:          preScreenResult.decision,
      confidence:        preScreenResult.confidence,
      risk:              preScreenResult.risk,
      overall_score:     ruleFallback.overall_score,
      dimension_scores:  ruleFallback.dimension_scores,
      decision_insights: [
        preScreenResult.reason,
        ...ruleFallback.decision_insights.slice(0, 4),
      ],
      recommendation:    preScreenResult.reason,
      method:            `rule_based:${preScreenResult.rule}`,
      evaluated_at:      new Date().toISOString(),
    };
  }

  // FIX 3 — original checked ANTHROPIC_API_KEY || OPENAI_API_KEY but callLLM()
  // only uses GROQ_API_KEY or ANTHROPIC_API_KEY — OPENAI key was never used,
  // causing "No LLM API key" warning even when GROQ key was set.
  const hasLLMKey = !!(
    process.env.GROQ_API_KEY 
  );

  if (!hasLLMKey) {
    console.warn("No LLM API key — using rule-based decision");
    const fallback = ruleBasedDecision(state);
    return { ...state, ...fallback };
  }

  try {
    const prompt    = buildPrompt(state, preScreenResult);
    const rawText   = await callLLM(prompt);
    const llmResult = parseLLMResponse(rawText);

    if (!llmResult) {
      console.warn("LLM parse failed — falling back to rule-based");
      const fallback = ruleBasedDecision(state);
      return { ...state, ...fallback };
    }

    // FIX 4 — fast_track insight prepend had a bug: the spread `...state`
    // then `...llmResult` already set decision_insights, and the conditional
    // override below used the SAME key again, silently winning due to
    // object spread order — last key wins. Moved fast_track note into
    // decision_insights BEFORE the spread so llmResult always wins cleanly,
    // then override only when fast_track is true.
    const finalInsights = preScreenResult?.fast_track
      ? [preScreenResult.reason, ...llmResult.decision_insights.slice(0, 4)]
      : llmResult.decision_insights;

    return {
      ...state,
      decision:          llmResult.decision,
      confidence:        llmResult.confidence,
      risk:              llmResult.risk,
      overall_score:     llmResult.overall_score,
      dimension_scores:  llmResult.dimension_scores,
      decision_insights: finalInsights,
      recommendation:    llmResult.recommendation,
      method:            "llm",
      evaluated_at:      new Date().toISOString(),
    };

  } catch (err) {
    console.error("Decision agent LLM call failed:", err.message);
    const fallback = ruleBasedDecision(state);
    return { ...state, ...fallback };
  }
}

module.exports = { runDecision };