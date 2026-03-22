// ─────────────────────────────────────────────────────────────────
// reportGenerator.js
//
// WHAT CHANGED FROM YOUR ORIGINAL & WHY
//
// KEPT:
//   - All 4 section text strings (github, leetcode, linkedin, recommendation)
//   - Your exact recommendation thresholds (70/50/30)
//   - The "No X data found." fallback strings
//   - generateReport() function name and export
//
// CHANGED:
//   1. Input shape         → now accepts the full AgentState-shaped
//                            report from orchestrator instead of the
//                            old { githubData, leetcodeData, linkedinData, scores }
//                            Old shape still works via legacyAdapter().
//
//   2. Return value        → was a plain text string.
//                            Now returns a structured object with:
//                              - text        (your original string — kept)
//                              - sections[]  (for InsightCards.jsx)
//                              - chartData   (for ScoreCharts.jsx)
//                              - decisionBlock (for DecisionBanner.jsx)
//                              - meta        (for report header)
//
//   3. generateTextReport() extracted → your original string-building
//                            logic moved into its own function so it
//                            can be called independently if needed.
//
//   4. Added buildChartData()  → formats pie + bar data for Recharts.
//                            Falls back gracefully if unified_scores
//                            or chart_data is missing.
//
//   5. Added buildSections()   → converts insights[] array from
//                            inferenceAgent into the card format
//                            InsightCards.jsx renders.
//
//   6. Added buildDecisionBlock() → formats decision/confidence/risk
//                            into the shape DecisionBanner.jsx expects.
//
//   7. Backward-compat adapter → if old callers pass the original
//                            { githubData, leetcodeData, scores }
//                            shape, legacyAdapter() maps it to the
//                            new shape so nothing breaks.
// ─────────────────────────────────────────────────────────────────

// ── KEPT: your exact text generation logic ────────────────────────
// Extracted into its own function — called from generateReport()
// and also exportable standalone if needed.
function generateTextReport({ githubData, leetcodeData, linkedinData, scores }) {
  // KEPT: your exact strings — zero changes
  const github = githubData
    ? `GitHub: ${githubData.public_repos} repos, top languages: ${githubData.top_languages?.join(", ")}.`
    : "No GitHub data found.";

  const leetcode = leetcodeData
    ? `LeetCode: ${leetcodeData.total_solved} problems solved (Easy: ${leetcodeData.easy}, Medium: ${leetcodeData.medium}, Hard: ${leetcodeData.hard}).`
    : "No LeetCode data found.";

  const linkedin = linkedinData?.summary
    ? `LinkedIn: ${linkedinData.summary.substring(0, 200)}`
    : "No LinkedIn data found.";

  // KEPT: your exact recommendation thresholds
  const recommendation =
    scores.totalScore >= 70 ? "Strong Yes" :
    scores.totalScore >= 50 ? "Yes"         :
    scores.totalScore >= 30 ? "Maybe"       : "No";

  // KEPT: your exact template string format
  return `
Technical Profile: ${github}

Problem Solving: ${leetcode}

Professional Presence: ${linkedin}

Score Breakdown — GitHub: ${scores.githubScore}, LeetCode: ${scores.leetcodeScore}, LinkedIn: ${scores.linkedinScore}, Test: ${scores.testScore}, Total: ${scores.totalScore}/100.

Hiring Recommendation: ${recommendation}
  `.trim();
}

// ── NEW: chart data builder ───────────────────────────────────────
// Formats the chart_data from inferenceAgent into the exact shape
// Recharts expects. Falls back to building from raw scores if
// chart_data is missing (e.g. called from legacy path).
function buildChartData(report) {
  // If orchestrator already built chart_data, use it directly
  if (report.chart_data) return report.chart_data;

  // Fallback: build from whatever scores are available
  const dim = report.dimension_scores || {};
  const unified = report.unified_scores || {};

  const codingScore  = dim.coding_skill          ?? unified.coding_skill?.score          ?? 0;
  const problemScore = dim.problem_solving        ?? unified.problem_solving?.score       ?? 0;
  const consScore    = dim.consistency            ?? unified.consistency?.score           ?? 0;
  const presScore    = dim.professional_presence  ?? unified.professional_presence?.score ?? 0;
  const testScore    = dim.test_performance       ?? unified.test_performance?.overall    ?? 0;

  // Pie: distribute weight across sources that have real data
  const sourceStatus = report.source_status || {};
  const pieSlices = [
    { name: "GitHub",   value: sourceStatus.github   === "real" ? 30 : 0 },
    { name: "LeetCode", value: sourceStatus.leetcode === "real" ? 25 : 0 },
    { name: "LinkedIn", value: sourceStatus.linkedin === "real" ? 20 : 0 },
    { name: "Test",     value: report.test_scores             ? 25 : 0 },
  ].filter((s) => s.value > 0);

  // Normalise pie to always sum to 100
  const pieTotal = pieSlices.reduce((s, p) => s + p.value, 0);
  const pie = pieTotal > 0
    ? pieSlices.map((s) => ({ ...s, value: Math.round((s.value / pieTotal) * 100) }))
    : [{ name: "Overall", value: 100 }];

  return {
    pie,
    skillBar: [
      { name: "Coding skill",          score: codingScore  },
      { name: "Problem solving",       score: problemScore },
      { name: "Consistency",           score: consScore    },
      { name: "Professional presence", score: presScore    },
    ],
    testBar: testScore > 0
      ? [
          { name: "MCQ",    score: report.test_scores?.mcq    ?? 0 },
          { name: "SQL",    score: report.test_scores?.sql    ?? 0 },
          { name: "Coding", score: report.test_scores?.coding ?? 0 },
        ]
      : [],
  };
}

// ── NEW: insight sections builder ────────────────────────────────
// Converts the insights[] array from inferenceAgent into the
// card format InsightCards.jsx renders.
// Also merges in the decision_insights[] strings from decisionAgent.
function buildSections(report) {
  const insightCards = [];

  // From inferenceAgent — cross-check warnings + positive signals
  const agentInsights = Array.isArray(report.insights) ? report.insights : [];
  for (const insight of agentInsights) {
    insightCards.push({
      section:  insight.section  || "overall",
      type:     insight.type     || "info",     // "positive"|"warning"|"info"
      severity: insight.severity || "none",
      message:  insight.message  || "",
    });
  }

  // From decisionAgent — one string per dimension
  const decisionInsights = Array.isArray(report.decision_insights)
    ? report.decision_insights
    : [];

  const dimensionLabels = [
    "Coding ability",
    "Problem solving",
    "Consistency",
    "Professional presence",
    "Test performance",
  ];

  decisionInsights.forEach((message, i) => {
    if (message) {
      insightCards.push({
        section:  "decision",
        type:     "info",
        severity: "none",
        label:    dimensionLabels[i] || `Dimension ${i + 1}`,
        message,
      });
    }
  });

  // Group by section for ordered rendering
  const order = ["overall", "github", "leetcode", "linkedin", "resume", "cross_check", "decision"];
  insightCards.sort((a, b) => {
    const ai = order.indexOf(a.section);
    const bi = order.indexOf(b.section);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return insightCards;
}

// ── NEW: decision block builder ───────────────────────────────────
// Formats the decision layer into the shape DecisionBanner.jsx
// expects. Maps your old "Strong Yes/Yes/Maybe/No" strings onto
// the new Hire/Reject/Maybe system — both coexist in the output.
function buildDecisionBlock(report) {
  const decision      = report.decision      || null;
  const confidence    = report.confidence    || null;
  const risk          = report.risk          || null;
  const overallScore  = report.overall_score ?? null;
  const recommendation = report.recommendation || null;

  // KEPT: map new decision values back to your original text labels
  // so any existing code reading legacyRecommendation still works
  const legacyRecommendation =
    overallScore >= 70 ? "Strong Yes" :
    overallScore >= 50 ? "Yes"        :
    overallScore >= 30 ? "Maybe"      : "No";

  // Badge colours for DecisionBanner.jsx
  const decisionColor = {
    Hire:   "success",  // green
    Maybe:  "warning",  // amber
    Reject: "danger",   // red
  }[decision] || "info";

  const riskColor = {
    Low:    "success",
    Medium: "warning",
    High:   "danger",
  }[risk] || "info";

  return {
    decision,
    confidence,
    risk,
    overall_score:          overallScore,
    recommendation,                       // LLM-generated paragraph
    legacy_recommendation:  legacyRecommendation, // your original string
    decision_color:         decisionColor,
    risk_color:             riskColor,
    missing_sources:        report.missing_sources || [],
    source_status:          report.source_status   || {},
  };
}

// ── NEW: report header / meta builder ────────────────────────────
function buildMeta(report) {
  return {
    candidate_id:    report.candidate_id   || null,
    candidate_name:  report.candidate_name || report.linkedin_data?.name || report.resume_data?.full_name || "Unknown",
    candidate_email: report.candidate_email || report.resume_data?.email || null,
    urls:            report.urls           || {},
    evaluated_at:    report.evaluated_at   || new Date().toISOString(),
    method:          report.method         || null,
    errors:          report.errors         || [],
  };
}

// ── BACKWARD-COMPAT ADAPTER ───────────────────────────────────────
// If any existing code calls generateReport() with the old shape:
//   { githubData, leetcodeData, linkedinData, scores }
// this maps it to the new shape so nothing breaks.
function legacyAdapter(oldInput) {
  const { githubData, leetcodeData, linkedinData, scores } = oldInput;
  return {
    github_data:   githubData   || null,
    leetcode_data: leetcodeData || null,
    linkedin_data: linkedinData || null,
    resume_data:   null,
    decision:      scores?.totalScore >= 70 ? "Hire" : scores?.totalScore >= 30 ? "Maybe" : "Reject",
    confidence:    "Low",  // legacy calls have no source validation
    risk:          "Medium",
    overall_score: scores?.totalScore || 0,
    dimension_scores: {
      coding_skill:          scores?.githubScore   || 0,
      problem_solving:       scores?.leetcodeScore || 0,
      consistency:           0,
      professional_presence: scores?.linkedinScore || 0,
      test_performance:      scores?.testScore     || 0,
    },
    decision_insights: [],
    insights:          [],
    chart_data:        null,
    source_status:     {},
    missing_sources:   [],
    recommendation:    null,
    test_scores: scores?.testScore
      ? { mcq: scores.testScore, sql: scores.testScore, coding: scores.testScore }
      : null,
  };
}

// ── MAIN EXPORT (signature backward-compatible) ───────────────────
// Accepts EITHER:
//   (a) Full AgentState-shaped report from orchestrator/report.js
//   (b) Old { githubData, leetcodeData, linkedinData, scores } shape
//
// Always returns an object with both the original `text` string
// AND the new structured fields.
async function generateReport(input) {
  // Detect which input shape we received
  const isLegacyInput = !!(input.githubData || input.scores?.totalScore !== undefined);
  const report = isLegacyInput ? legacyAdapter(input) : input;

  // Build the legacy text string (KEPT — identical to your original)
  const text = generateTextReport({
    githubData:   report.github_data,
    leetcodeData: report.leetcode_data,
    linkedinData: report.linkedin_data,
    scores: {
      githubScore:   report.dimension_scores?.coding_skill          || 0,
      leetcodeScore: report.dimension_scores?.problem_solving       || 0,
      linkedinScore: report.dimension_scores?.professional_presence || 0,
      testScore:     report.dimension_scores?.test_performance      || 0,
      totalScore:    report.overall_score                           || 0,
    },
  });

  // Build structured output for React components
  const chartData     = buildChartData(report);
  const sections      = buildSections(report);
  const decisionBlock = buildDecisionBlock(report);
  const meta          = buildMeta(report);

  return {
    // KEPT: your original plain text string — any code reading .text still works
    text,

    // NEW: structured fields for React components
    meta,           // → report header (name, email, urls, evaluated_at)
    decisionBlock,  // → DecisionBanner.jsx
    chartData,      // → ScoreCharts.jsx  (pie + skillBar + testBar)
    sections,       // → InsightCards.jsx (ordered insight cards)

    // Raw scores — pass-through for any component that needs them directly
    overall_score:     report.overall_score    || 0,
    dimension_scores:  report.dimension_scores || {},
    source_status:     report.source_status    || {},
    missing_sources:   report.missing_sources  || [],
  };
}

module.exports = {
  generateReport,
  // Also export individual builders so components can call them directly
  // without going through generateReport() if needed
  generateTextReport,
  buildChartData,
  buildSections,
  buildDecisionBlock,
  buildMeta,
};