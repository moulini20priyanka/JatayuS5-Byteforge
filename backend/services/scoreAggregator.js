
const BASE_WEIGHTS = Object.freeze({
  github:   0.25,
  leetcode: 0.20,
  linkedin: 0.15,
  test:     0.40,
});

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


// No score:        0
function applyConfidenceCap(score, sourceStatus) {
  if (!score) return 0;
  if (sourceStatus === "real")      return score;
  if (sourceStatus === "estimated") return Math.min(score, 70);
  return 0; // "missing" or unknown
}


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
  aggregateScores,      
  aggregateFromState,   
  redistributeWeights,  
  buildDimensionScores, 
};