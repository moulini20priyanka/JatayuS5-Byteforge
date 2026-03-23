// inferenceAgent.js

function classifySources(state) {
  const classify = (data, realValue) => {
    if (!data || data.data_source === "failed")  return "missing";
    if (data.data_source === "not_found")         return "missing";
    if (data.data_source === "pasted_text")       return "estimated";
    if (data.data_source === "regex_only")        return "estimated";
    return realValue;
  };
  return {
    github:   classify(state.github_data,   "real"),
    leetcode: classify(state.leetcode_data, "real"),
    linkedin: classify(state.linkedin_data, "real"),
    resume:   classify(state.resume_data,   state.resume_data?.data_source === "llm_parsed" ? "real" : "estimated"),
  };
}

function estimateProblemSolving(githubData, resumeData) {
  if (!githubData || githubData.data_source === "failed") {
    const skillCount = resumeData?.skills?.length || 0;
    return {
      score:      Math.min(Math.round((skillCount / 20) * 60), 60),
      source:     "resume_skills_proxy",
      confidence: "low",
      note:       "Estimated from resume skill count — neither GitHub nor LeetCode available",
    };
  }
  const proxy       = githubData.inference_hints?.problem_solving_proxy || 0;
  const consistency = githubData.consistency?.score || 0;
  const estimated   = Math.min(Math.round(proxy * 0.6 + consistency * 0.4), 70);
  return {
    score:      estimated,
    source:     "github_proxy",
    confidence: estimated > 50 ? "medium" : "low",
    note:       "Estimated from GitHub repo complexity and consistency — LeetCode missing",
  };
}

function estimateCodingSkill(resumeData, leetcodeData) {
  const projects  = resumeData?.projects?.length   || 0;
  const techStack = resumeData?.tech_stack?.length || 0;
  const lcScore   = leetcodeData?.problem_solving_score || 0;
  const fromResume = Math.min(Math.round((projects * 10) + (techStack * 3)), 50);
  const fromLC     = Math.round(lcScore * 0.5);
  return {
    score:      Math.min(fromResume + fromLC, 65),
    source:     "resume_and_leetcode_proxy",
    confidence: "low",
    note:       "Estimated from resume projects and LeetCode — GitHub missing",
  };
}

function estimateProfessionalPresence(resumeData) {
  if (!resumeData || resumeData.data_source === "failed") {
    return { score: 0, source: "none", confidence: "low", note: "No LinkedIn and no resume" };
  }
  const hasName    = resumeData.full_name             ? 15 : 0;
  const hasSummary = resumeData.summary               ? 20 : 0;
  const expScore   = Math.min((resumeData.experience?.length    || 0) * 15, 40);
  const certScore  = Math.min((resumeData.certifications?.length || 0) * 10, 25);
  return {
    score:      Math.min(hasName + hasSummary + expScore + certScore, 75),
    source:     "resume_proxy",
    confidence: "medium",
    note:       "Estimated from resume — LinkedIn missing",
  };
}

function crossCheckAll(state, sourceStatus) {
  const flags    = [];
  const insights = [];
  const github   = state.github_data;
  const leetcode = state.leetcode_data;
  const linkedin = state.linkedin_data;
  const resume   = state.resume_data;

  if (sourceStatus.github === "real" && sourceStatus.resume !== "missing") {
    const resumeStack      = resume?.inference_hints?.primary_tech_stack || [];
    const githubLangs      = github?.inference_hints?.all_languages || [];
    const resumeClaimsLang = resumeStack.map((s) => s.toLowerCase());
    const hasOverlap = resumeClaimsLang.some((lang) =>
      githubLangs.some((gl) => gl.toLowerCase().includes(lang) || lang.includes(gl.toLowerCase()))
    );
    if (resumeClaimsLang.length > 0 && githubLangs.length > 0 && !hasOverlap) {
      flags.push("resume_github_tech_mismatch");
      insights.push({
        type: "warning", section: "cross_check", severity: "medium",
        message: `Resume claims ${resumeStack.slice(0,2).join(", ")} but GitHub primary language is ${github?.inference_hints?.primary_language || "unknown"}. Verify during interview.`,
      });
    }
  }

  if (sourceStatus.github === "real" && sourceStatus.leetcode === "real") {
    const lcScore = leetcode?.problem_solving_score || 0;
    const ghProxy = github?.inference_hints?.problem_solving_proxy || 0;
    const gap     = Math.abs(lcScore - ghProxy);
    if (gap > 25) {
      flags.push("problem_solving_score_gap");
      insights.push({
        type: "info", section: "cross_check", severity: "low",
        message: `LeetCode score (${lcScore}) and GitHub activity proxy (${ghProxy}) differ by ${gap} points.`,
      });
    }
  }

  if (sourceStatus.linkedin === "real" && sourceStatus.resume !== "missing") {
    const liSkills = (linkedin?.skills || []).map((s) => s.toLowerCase());
    const rvSkills = (resume?.skills   || []).map((s) => s.toLowerCase());
    if (liSkills.length > 0 && rvSkills.length > 0) {
      const overlap      = liSkills.filter((s) => rvSkills.includes(s)).length;
      const overlapRatio = overlap / Math.max(liSkills.length, rvSkills.length);
      if (overlapRatio < 0.2) {
        flags.push("linkedin_resume_skills_mismatch");
        insights.push({
          type: "warning", section: "cross_check", severity: "medium",
          message: "LinkedIn skills and resume skills have very low overlap.",
        });
      }
    }
  }

  if (sourceStatus.github === "real") {
    if (github?.inference_hints?.low_consistency) {
      flags.push("low_github_consistency");
      insights.push({
        type: "warning", section: "github", severity: "low",
        message: `GitHub shows low coding consistency in recent weeks.`,
      });
    }
    if (github?.inference_hints?.flags?.includes("no_public_repos")) {
      flags.push("no_public_repos");
      insights.push({
        type: "warning", section: "github", severity: "high",
        message: "No public repositories found. Cannot validate coding skills from GitHub.",
      });
    }
  }

  if (sourceStatus.leetcode === "real") {
    if ((leetcode?.hard || 0) === 0) {
      flags.push("no_hard_lc_problems");
      insights.push({
        type: "info", section: "leetcode", severity: "low",
        message: `Solved ${leetcode?.easy || 0} Easy and ${leetcode?.medium || 0} Medium but no Hard problems.`,
      });
    }
    if ((leetcode?.total_solved || 0) < 20) {
      flags.push("very_few_lc_problems");
      insights.push({
        type: "warning", section: "leetcode", severity: "medium",
        message: `Only ${leetcode?.total_solved || 0} problems solved on LeetCode. Limited data to assess depth.`,
      });
    }
  }

  if (sourceStatus.resume !== "missing") {
    if (resume?.inference_hints?.flags?.includes("no_skills_found")) {
      flags.push("resume_no_skills");
      insights.push({
        type: "warning", section: "resume", severity: "high",
        message: "No technical skills detected in resume.",
      });
    }
  }

  // FIX 1 — missingSources must include "estimated" sources too flagged as missing
  // Previously only "missing" was counted — "estimated" sources were silently ignored
  // which caused missingSources to be shorter than expected and confidence to be inflated.
  const missingSources = Object.entries(sourceStatus)
    .filter(([, v]) => v === "missing" || v === "estimated")
    .map(([k]) => k);

  if (missingSources.includes("github") && missingSources.includes("leetcode")) {
    flags.push("no_coding_validation");
    insights.push({
      type: "warning", section: "overall", severity: "high",
      message: "Neither GitHub nor LeetCode available. Rely on test scores for coding validation.",
    });
  }
  if (missingSources.includes("linkedin")) {
    insights.push({
      type: "info", section: "linkedin", severity: "low",
      message: "LinkedIn data unavailable. Professional presence estimated from resume only.",
    });
  }

  return { flags, insights, missingSources };
}

function buildUnifiedScores(state, sourceStatus, estimates) {
  const github   = state.github_data;
  const leetcode = state.leetcode_data;
  const linkedin = state.linkedin_data;
  const test     = state.test_scores || null;

  const codingSkill = sourceStatus.github === "real"
    ? { score: github?.coding_skill_score || 0, source: "github", confidence: "high" }
    : (estimates.coding_skill || { score: 0, source: "none", confidence: "low" });

  const problemSolving = sourceStatus.leetcode === "real"
    ? { score: leetcode?.problem_solving_score || 0, source: "leetcode", confidence: "high" }
    : (estimates.problem_solving || { score: 0, source: "none", confidence: "low" });

  let consistencyScore  = 0;
  let consistencySource = "none";
  if (sourceStatus.github === "real" && sourceStatus.leetcode === "real") {
    const ghScore = github?.consistency?.score   || 0;
    const lcScore = leetcode?.consistency?.score || 0;
    consistencyScore  = Math.round((ghScore + lcScore) / 2);
    consistencySource = "github_and_leetcode";
  } else if (sourceStatus.github === "real") {
    consistencyScore  = github?.consistency?.score || 0;
    consistencySource = "github";
  } else if (sourceStatus.leetcode === "real") {
    consistencyScore  = leetcode?.consistency?.score || 0;
    consistencySource = "leetcode";
  }
  const consistency = {
    score:      consistencyScore,
    source:     consistencySource,
    confidence: consistencySource === "github_and_leetcode" ? "high" : "medium",
  };

  const professionalPresence = sourceStatus.linkedin === "real"
    ? { score: linkedin?.sub_scores?.professional_presence || 0, source: "linkedin", confidence: "high" }
    : (estimates.professional_presence || { score: 0, source: "none", confidence: "low" });

  const testPerformance = test
    ? {
        mcq:     test.mcq    || 0,
        sql:     test.sql    || 0,
        coding:  test.coding || 0,
        overall: Math.round(((test.mcq || 0) * 0.3) + ((test.sql || 0) * 0.3) + ((test.coding || 0) * 0.4)),
        source:     "test",
        confidence: "high",
      }
    : { mcq: null, sql: null, coding: null, overall: null, source: "none", confidence: "low" };

  return {
    coding_skill:          codingSkill,
    problem_solving:       problemSolving,
    consistency,
    professional_presence: professionalPresence,
    test_performance:      testPerformance,
  };
}

function calcConfidenceLevel(sourceStatus, unifiedScores) {
  // FIX 2 — "estimated" sources were being counted as real, inflating confidence.
  // Only "real" sources should count toward confidence.
  const realCount = Object.values(sourceStatus).filter((v) => v === "real").length;
  const hasTest   = unifiedScores.test_performance?.source === "test";
  if (realCount >= 3 || (realCount >= 2 && hasTest)) return "high";
  if (realCount >= 2 || (realCount >= 1 && hasTest)) return "medium";
  return "low";
}

function buildChartData(sourceStatus, unifiedScores) {
  const hasGitHub   = sourceStatus.github   === "real";
  const hasLeetCode = sourceStatus.leetcode === "real";
  const hasLinkedIn = sourceStatus.linkedin === "real";
  const hasTest     = unifiedScores.test_performance?.source === "test";
  const available   = [hasGitHub, hasLeetCode, hasLinkedIn, hasTest].filter(Boolean).length || 1;
  const share       = Math.floor(100 / available);
  const remainder   = 100 - share * available;

  return {
    pie: [
      { name: "GitHub",   value: hasGitHub   ? share + remainder : 0 },
      { name: "LeetCode", value: hasLeetCode ? share : 0 },
      { name: "LinkedIn", value: hasLinkedIn ? share : 0 },
      { name: "Test",     value: hasTest     ? share : 0 },
    ].filter((d) => d.value > 0),

    skillBar: [
      { name: "Coding Skill",          score: unifiedScores.coding_skill?.score          || 0 },
      { name: "Problem Solving",       score: unifiedScores.problem_solving?.score       || 0 },
      { name: "Consistency",           score: unifiedScores.consistency?.score           || 0 },
      { name: "Professional Presence", score: unifiedScores.professional_presence?.score || 0 },
    ],

    testBar: hasTest ? [
      { name: "MCQ",    score: unifiedScores.test_performance?.mcq    || 0 },
      { name: "SQL",    score: unifiedScores.test_performance?.sql    || 0 },
      { name: "Coding", score: unifiedScores.test_performance?.coding || 0 },
    ] : [],
  };
}

async function runInference(state) {
  const sourceStatus = classifySources(state);

  const estimates = {
    problem_solving:       sourceStatus.leetcode === "missing" ? estimateProblemSolving(state.github_data, state.resume_data)   : null,
    coding_skill:          sourceStatus.github   === "missing" ? estimateCodingSkill(state.resume_data, state.leetcode_data)    : null,
    professional_presence: sourceStatus.linkedin === "missing" ? estimateProfessionalPresence(state.resume_data)                : null,
  };

  const { flags, insights, missingSources } = crossCheckAll(state, sourceStatus);
  const unifiedScores   = buildUnifiedScores(state, sourceStatus, estimates);
  const confidenceLevel = calcConfidenceLevel(sourceStatus, unifiedScores);
  const chartData       = buildChartData(sourceStatus, unifiedScores);

  const allInsights = [
    ...insights,
    ...((unifiedScores.coding_skill?.score    || 0) > 75 ? [{ type: "positive", section: "github",   message: "Strong GitHub activity with broad tech stack.",                severity: "none" }] : []),
    ...((unifiedScores.problem_solving?.score || 0) > 75 ? [{ type: "positive", section: "leetcode", message: "Strong LeetCode performance — solid algorithmic foundation.",  severity: "none" }] : []),
    ...((unifiedScores.consistency?.score     || 0) > 75 ? [{ type: "positive", section: "overall",  message: "Consistent coding activity across platforms.",                  severity: "none" }] : []),
    ...((unifiedScores.test_performance?.overall || 0) > 75 ? [{ type: "positive", section: "test", message: "High test performance — strong validation signal.",             severity: "none" }] : []),
    {
      type:     confidenceLevel === "low" ? "warning" : "info",
      section:  "overall",
      severity: confidenceLevel === "low" ? "medium" : "none",
      message:  confidenceLevel === "high"
        ? "Decision based on multiple verified data sources — high confidence."
        : confidenceLevel === "medium"
        ? `Decision based on ${4 - missingSources.length} of 4 sources — medium confidence.`
        : `Only ${4 - missingSources.length} of 4 sources available — treat decision as indicative only.`,
    },
  ];

  return {
    ...state,
    source_status:     sourceStatus,
    missing_sources:   missingSources,
    inferred:          estimates,
    unified_scores:    unifiedScores,
    insights:          allInsights,
    cross_check_flags: flags,
    chart_data:        chartData,
    confidence_level:  confidenceLevel,
  };
}

module.exports = { runInference };