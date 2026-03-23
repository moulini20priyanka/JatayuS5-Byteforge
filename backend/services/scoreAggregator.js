// ─────────────────────────────────────────────────────────────────
// scoreAggregator.js
//
// WHAT CHANGED FROM YOUR ORIGINAL & WHY
//
// KEPT (zero changes):
//   - All 4 weight values: github 0.25, leetcode 0.20,
//     linkedin 0.15, test 0.40                          ✓
//   - All 4 output field names: githubScore, leetcodeScore,
//     linkedinScore, testScore, totalScore              ✓
//   - aggregateScores() function name and export        ✓
//   - || 0 fallback for missing scores                  ✓
//
// CHANGED:
//   1. Fixed weight problem    → your original always divides by
//                                the full weight sum (1.00) even
//                                when sources are missing. If GitHub
//                                is null, its 0.25 weight just
//                                disappears — the total is pulled
//                                down unfairly. New version
//                                redistributes missing weights
//                                across available sources.
//
//   2. Added sub-score input   → reads sub_scores from each agent
//                                (repo_volume, difficulty_balance,
//                                etc.) to produce per-dimension
//                                scores instead of one number.
//
//   3. Added confidence penalty → estimated scores (from inference
//                                agent) are capped lower than real
//                                scores so the total never looks
//                                artificially high when data is
//                                missing.
//
//   4. Old shape still returned → githubScore, leetcodeScore,
//                                linkedinScore, testScore,
//                                totalScore all still present.
//                                New fields added alongside them.
//
//   5. aggregateFromState()    → new function that reads directly
//                                from AgentState (used by
//                                orchestrator). Original
//                                aggregateScores() still works
//                                for any existing callers.
// ─────────────────────────────────────────────────────────────────

// ── BASE WEIGHTS ─────────────────────────────────────────────────
// KEPT: your exact values — only used as starting point before
// dynamic redistribution kicks in.
const BASE_WEIGHTS = Object.freeze({
  github:   0.25,
  leetcode: 0.20,
  linkedin: 0.15,
  test:     0.40,
});

// ── NEW: dynamic weight redistribution ───────────────────────────
// Problem with fixed weights: if GitHub score is 0 because the
// source is missing (not because the candidate is bad), the 0.25
// weight silently drags the total down.
// Solution: remove missing sources from the pool and redistribute
// their weight proportionally across remaining sources.
//
// Example — GitHub missing, test present:
//   Before: total = 0*0.25 + lc*0.20 + li*0.15 + t*0.40  (biased low)
//   After:  total = lc*0.267 + li*0.200 + t*0.533          (fair)
function redistributeWeights(available) {
  // available: { github: bool, leetcode: bool, linkedin: bool, test: bool }
  const active = Object.entries(BASE_WEIGHTS)
    .filter(([key]) => available[key]);

  if (active.length === 0) return BASE_WEIGHTS; // nothing available — use base

  const activeSum = active.reduce((sum, [, w]) => sum + w, 0);

  // Normalise so active weights sum to 1.0
  const redistributed = {};
  for (const [key, weight] of active) {
    redistributed[key] = weight / activeSum;
  }
  // Missing sources get 0
  for (const key of Object.keys(BASE_WEIGHTS)) {
    if (!(key in redistributed)) redistributed[key] = 0;
  }
  return redistributed;
}

// ── NEW: confidence penalty ───────────────────────────────────────
// Estimated scores (inferred by inferenceAgent when a source is
// missing) are less reliable than real scores. Cap them to avoid
// the total looking artificially strong.
//
// Real score:      used as-is
// Estimated score: capped at 70 (medium confidence cap)
// No score:        0
function applyConfidenceCap(score, sourceStatus) {
  if (!score) return 0;
  if (sourceStatus === "real")      return score;
  if (sourceStatus === "estimated") return Math.min(score, 70);
  return 0; // "missing" or unknown
}

// ── NEW: dimension score builder ──────────────────────────────────
// Extracts the most meaningful per-dimension score from each
// agent's sub_scores object. Produces the 5 named dimensions
// that decisionAgent and reportGenerator use.
function buildDimensionScores(githubData, leetcodeData, linkedinData, resumeData, testScores) {
  // Coding skill — primary: GitHub sub_scores.repo_volume + language_breadth
  const codingSkill = githubData?.coding_skill_score
    ?? githubData?.github_score  // backward compat
    ?? 0;

  // Problem solving — primary: LeetCode problem_solving_score
  const problemSolving = leetcodeData?.problem_solving_score
    ?? leetcodeData?.leetcode_score  // backward compat
    ?? 0;

  // Consistency — average of GitHub + LeetCode consistency if both present
  const ghConsistency = githubData?.consistency?.score   ?? null;
  const lcConsistency = leetcodeData?.consistency?.score ?? null;
  let consistency = 0;
  if (ghConsistency !== null && lcConsistency !== null) {
    consistency = Math.round((ghConsistency + lcConsistency) / 2);
  } else {
    consistency = ghConsistency ?? lcConsistency ?? 0;
  }

  // Professional presence — primary: LinkedIn sub_scores.professional_presence
  const professionalPresence =
    linkedinData?.sub_scores?.professional_presence
    ?? linkedinData?.linkedin_score  // backward compat
    ?? resumeData?.resume_score      // fallback to resume if LinkedIn missing
    ?? 0;

  // Test performance — weighted average of MCQ + SQL + coding
  let testPerformance = 0;
  if (testScores) {
    testPerformance = Math.round(
      (testScores.mcq    || 0) * 0.30 +
      (testScores.sql    || 0) * 0.30 +
      (testScores.coding || 0) * 0.40
    );
  }

  return {
    coding_skill:          Math.round(codingSkill),
    problem_solving:       Math.round(problemSolving),
    consistency:           Math.round(consistency),
    professional_presence: Math.round(professionalPresence),
    test_performance:      Math.round(testPerformance),
  };
}

// ── KEPT: original aggregateScores() — signature unchanged ────────
// Still works exactly as before for any existing callers.
// Now also returns dimension_scores and weights_used alongside
// the original fields.
function aggregateScores({ githubData, leetcodeData, linkedinData, testScore }) {
  // KEPT: your exact field reads
  const g = githubData?.github_score     || 0;
  const l = leetcodeData?.leetcode_score || 0;
  const k = linkedinData?.linkedin_score || 0;
  const t = testScore                    || 0;

  // NEW: determine which sources are actually present
  const available = {
    github:   g > 0,
    leetcode: l > 0,
    linkedin: k > 0,
    test:     t > 0,
  };

  // NEW: redistribute weights so missing sources don't drag total down
  const weights = redistributeWeights(available);

  // KEPT: same weighted sum formula — now uses redistributed weights
  const total = g * weights.github   +
                l * weights.leetcode +
                k * weights.linkedin +
                t * weights.test;

  // NEW: dimension scores from sub_scores
  const dimensionScores = buildDimensionScores(
    githubData, leetcodeData, linkedinData, null,
    testScore ? { mcq: testScore, sql: testScore, coding: testScore } : null
  );

  return {
    // KEPT: all original field names — zero breaking changes
    githubScore:   g,
    leetcodeScore: l,
    linkedinScore: k,
    testScore:     t,
    totalScore:    Math.round(total),

    // NEW fields alongside originals
    dimension_scores: dimensionScores,
    weights_used:     weights,          // useful for debugging / report transparency
    sources_present:  available,
  };
}

// ── NEW: aggregateFromState() ─────────────────────────────────────
// Used by orchestrator.js and report.js when working with the
// full AgentState object. Reads source_status from inferenceAgent
// to apply confidence caps on estimated scores.
function aggregateFromState(state) {
  const github   = state.github_data;
  const leetcode = state.leetcode_data;
  const linkedin = state.linkedin_data;
  const resume   = state.resume_data;
  const test     = state.test_scores;
  const status   = state.source_status || {};

  // Raw scores from each agent
  const rawScores = {
    github:   github?.coding_skill_score    ?? github?.github_score     ?? 0,
    leetcode: leetcode?.problem_solving_score ?? leetcode?.leetcode_score ?? 0,
    linkedin: linkedin?.sub_scores?.professional_presence ?? linkedin?.linkedin_score ?? 0,
    test:     test
      ? Math.round((test.mcq||0)*0.30 + (test.sql||0)*0.30 + (test.coding||0)*0.40)
      : 0,
  };

  // NEW: apply confidence cap based on source_status from inferenceAgent
  // "real" → full score, "estimated" → capped at 70, "missing" → 0
  const cappedScores = {
    github:   applyConfidenceCap(rawScores.github,   status.github),
    leetcode: applyConfidenceCap(rawScores.leetcode, status.leetcode),
    linkedin: applyConfidenceCap(rawScores.linkedin, status.linkedin),
    test:     rawScores.test, // test scores are always real — no cap
  };

  // Redistribute weights based on capped availability
  const available = {
    github:   cappedScores.github   > 0,
    leetcode: cappedScores.leetcode > 0,
    linkedin: cappedScores.linkedin > 0,
    test:     cappedScores.test     > 0,
  };
  const weights = redistributeWeights(available);

  // Weighted total with redistributed weights
  const total = Math.round(
    cappedScores.github   * weights.github   +
    cappedScores.leetcode * weights.leetcode +
    cappedScores.linkedin * weights.linkedin +
    cappedScores.test     * weights.test
  );

  // Full dimension breakdown
  const dimensionScores = buildDimensionScores(github, leetcode, linkedin, resume, test);

  return {
    // KEPT: same field names as original aggregateScores()
    githubScore:   rawScores.github,
    leetcodeScore: rawScores.leetcode,
    linkedinScore: rawScores.linkedin,
    testScore:     rawScores.test,
    totalScore:    total,

    // NEW
    dimension_scores:  dimensionScores,
    capped_scores:     cappedScores,
    weights_used:      weights,
    sources_present:   available,
    source_status:     status,
  };
}

module.exports = {
  aggregateScores,      // original — unchanged signature, backward compat
  aggregateFromState,   // new — reads full AgentState
  redistributeWeights,  // exported for unit testing
  buildDimensionScores, // exported for use in reportGenerator if needed
};