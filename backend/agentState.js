
/**
 * @typedef {Object} SubScores
 * @property {number} [repo_volume]          0-100 GitHub
 * @property {number} [stars]                0-100 GitHub
 * @property {number} [language_breadth]     0-100 GitHub
 * @property {number} [consistency]          0-100 GitHub / LeetCode
 * @property {number} [followers]            0-100 GitHub
 * @property {number} [volume]               0-100 LeetCode
 * @property {number} [difficulty_balance]   0-100 LeetCode
 * @property {number} [contest]              0-100 LeetCode
 * @property {number} [technical_relevance]  0-100 LinkedIn
 * @property {number} [experience_depth]     0-100 LinkedIn
 * @property {number} [professional_presence] 0-100 LinkedIn
 * @property {number} [certifications]       0-100 LinkedIn / Resume
 * @property {number} [skills_breadth]       0-100 Resume
 * @property {number} [experience_years]     0-100 Resume
 * @property {number} [project_quality]      0-100 Resume
 */

/**
 * @typedef {Object} InferenceHints
 * @property {string|null}   primary_language
 * @property {string[]}      all_languages
 * @property {number}        problem_solving_proxy
 * @property {boolean}       has_recent_activity
 * @property {boolean}       low_consistency
 * @property {string[]|null} skill_list
 * @property {string|null}   seniority_signal
 * @property {string[]}      flags
 */

/**
 * @typedef {Object} ConsistencyData
 * @property {number} score         0-100
 * @property {number} active_weeks
 * @property {number} streak_weeks
 * @property {number} [streak_days]
 */

/**
 * @typedef {Object} GitHubData
 * @property {string|null}   username
 * @property {string|null}   profile_url
 * @property {number|null}   public_repos
 * @property {number|null}   followers
 * @property {string[]}      top_languages
 * @property {Array<{language:string,bytes:number}>} detailed_languages
 * @property {number|null}   total_stars
 * @property {number[]|null} weekly_commits       12-week buckets
 * @property {ConsistencyData|null} consistency
 * @property {SubScores|null}  sub_scores
 * @property {number|null}   coding_skill_score   0-100
 * @property {InferenceHints} inference_hints
 * @property {"github_api"|"failed"} data_source
 * @property {string}        fetched_at           ISO string
 */

/**
 * @typedef {Object} LeetCodeData
 * @property {string|null}   username
 * @property {string|null}   profile_url
 * @property {{easy:number,medium:number,hard:number,total:number}} solved
 * @property {number|null}   ranking
 * @property {number}        reputation
 * @property {string[]}      skill_tags
 * @property {string[]}      badges
 * @property {string|null}   active_badge
 * @property {number}        total_active_days
 * @property {number[]|null} weekly_submissions   12-week buckets
 * @property {ConsistencyData|null} consistency
 * @property {{attended:number,rating:number,global_ranking:number,top_percentage:number}|null} contest
 * @property {SubScores|null}  sub_scores
 * @property {number|null}   problem_solving_score  0-100
 * @property {number|null}   leetcode_score         0-100  (backward compat alias)
 * @property {InferenceHints} inference_hints
 * @property {"leetcode_graphql"|"not_found"|"failed"} data_source
 * @property {string}        fetched_at
 */

/**
 * @typedef {Object} LinkedInData
 * @property {string|null}   name
 * @property {string|null}   headline
 * @property {string|null}   summary
 * @property {string[]}      skills
 * @property {string[]}      certifications
 * @property {Array<{title:string,company:string,duration:string}>} experience
 * @property {Array<{degree:string,institution:string,year:string}>} education
 * @property {string|null}   connections
 * @property {number|null}   linkedin_score        0-100  (backward compat)
 * @property {SubScores|null}  sub_scores
 * @property {InferenceHints} inference_hints
 * @property {"crawl4ai"|"pasted_text"|"failed"} data_source
 * @property {string}        fetched_at
 */

/**
 * @typedef {Object} ResumeData
 * @property {string|null}   full_name
 * @property {string|null}   email
 * @property {string|null}   summary
 * @property {string|null}   github          URL
 * @property {string|null}   linkedin        URL
 * @property {string|null}   leetcode        URL
 * @property {string|null}   hackerrank      URL
 * @property {string[]}      skills
 * @property {string[]}      tech_stack
 * @property {Array<{title:string,company:string,duration:string,description:string}>} experience
 * @property {Array<{name:string,tech_used:string[],description:string}>} projects
 * @property {Array<{degree:string,institution:string,year:string}>} education
 * @property {string[]}      certifications
 * @property {number|null}   years_of_experience
 * @property {"junior"|"mid"|"senior"|"lead"|null} seniority_level
 * @property {SubScores|null}  sub_scores
 * @property {number|null}   resume_score          0-100
 * @property {InferenceHints} inference_hints
 * @property {"llm_parsed"|"regex_only"|"failed"} data_source
 * @property {string}        fetched_at
 */

/**
 * @typedef {Object} UnifiedScore
 * @property {number|null}  score
 * @property {string}       source      which agent provided this
 * @property {"high"|"medium"|"low"} confidence
 * @property {string}       [note]      present when estimated
 */

/**
 * @typedef {Object} UnifiedScores
 * @property {UnifiedScore} coding_skill
 * @property {UnifiedScore} problem_solving
 * @property {UnifiedScore} consistency
 * @property {UnifiedScore} professional_presence
 * @property {{mcq:number|null,sql:number|null,coding:number|null,overall:number|null,source:string,confidence:string}} test_performance
 */

/**
 * @typedef {Object} Insight
 * @property {"positive"|"warning"|"info"} type
 * @property {string} section   "github"|"leetcode"|"linkedin"|"resume"|"cross_check"|"overall"
 * @property {string} message
 * @property {"high"|"medium"|"low"|"none"} severity
 */

/**
 * @typedef {Object} ChartData
 * @property {Array<{name:string,value:number}>}  pie
 * @property {Array<{name:string,score:number}>}  skillBar
 * @property {Array<{name:string,score:number}>}  testBar
 */

/**
 * @typedef {Object} AgentState
 * — INPUTS (set once at createAgentState, never mutated) —
 * @property {string|null}   candidate_id
 * @property {Buffer|null}   resume_buffer
 * @property {string|null}   pasted_linkedin
 * @property {{github:string|null,linkedin:string|null,leetcode:string|null}} override_urls
 * @property {{mcq:number,sql:number,coding:number}|null} test_scores
 * — EXTRACTED (resume_node) —
 * @property {{github:string|null,linkedin:string|null,leetcode:string|null,hackerrank:string|null}} urls
 * — AGENT OUTPUTS (collect_node) —
 * @property {GitHubData|null}   github_data
 * @property {LeetCodeData|null} leetcode_data
 * @property {LinkedInData|null} linkedin_data
 * @property {ResumeData|null}   resume_data
 * — INFERENCE LAYER (inference_node) —
 * @property {{github:string,leetcode:string,linkedin:string,resume:string}|null} source_status
 * @property {string[]|null}     missing_sources
 * @property {Object|null}       inferred
 * @property {UnifiedScores|null} unified_scores
 * @property {Insight[]|null}    insights
 * @property {string[]|null}     cross_check_flags
 * @property {ChartData|null}    chart_data
 * @property {"high"|"medium"|"low"|null} confidence_level
 * — DECISION LAYER (decision_node) —
 * @property {"Hire"|"Reject"|"Maybe"|null} decision
 * @property {"High"|"Medium"|"Low"|null}   confidence
 * @property {"High"|"Medium"|"Low"|null}   risk
 * @property {number|null}       overall_score
 * @property {Object|null}       dimension_scores
 * @property {string[]|null}     decision_insights
 * @property {string|null}       recommendation
 * @property {"llm"|"rule_based"|string|null} method
 * @property {string|null}       evaluated_at      ISO string
 * — PLUMBING (never sent to frontend) —
 * @property {Function}          __emit
 * @property {Array<{agent:string,error:string}>} __errors
 */

// ── 2. FACTORY ────────────────────────────────────────────────────
// Builds the initial state from raw request input.
// Replaces the inline createInitialState() in orchestrator.js.
// All downstream agents read from this shape — never from req directly.

/**
 * @param {Object} input
 * @param {string|null}   input.candidate_id
 * @param {Buffer|null}   input.resume_buffer
 * @param {string|null}   input.github_url
 * @param {string|null}   input.linkedin_url
 * @param {string|null}   input.leetcode_url
 * @param {string|null}   input.pasted_linkedin
 * @param {{mcq:number,sql:number,coding:number}|null} input.test_scores
 * @param {Function}      input.__emit
 * @returns {AgentState}
 */
function createAgentState(input = {}) {
  return {
    // ── inputs ──────────────────────────────────────────────────
    candidate_id:    input.candidate_id    || null,
    resume_buffer:   input.resume_buffer   || null,
    pasted_linkedin: input.pasted_linkedin || null,

    override_urls: {
      github:   normaliseUrl(input.github_url,   "github.com")   || null,
      linkedin: normaliseUrl(input.linkedin_url, "linkedin.com") || null,
      leetcode: normaliseUrl(input.leetcode_url, "leetcode.com") || null,
    },

    test_scores: input.test_scores
      ? {
          mcq:    clamp(Number(input.test_scores.mcq)    || 0, 0, 100),
          sql:    clamp(Number(input.test_scores.sql)    || 0, 0, 100),
          coding: clamp(Number(input.test_scores.coding) || 0, 0, 100),
        }
      : null,

    // ── extracted (populated by resume_node) ─────────────────
    urls: {
      github:    null,
      linkedin:  null,
      leetcode:  null,
      hackerrank: null,
    },

    // ── agent outputs (populated by collect_node) ─────────────
    github_data:   null,
    leetcode_data: null,
    linkedin_data: null,
    resume_data:   null,

    // ── inference layer (populated by inference_node) ──────────
    source_status:     null,
    missing_sources:   null,
    inferred:          null,
    unified_scores:    null,
    insights:          [],
    cross_check_flags: [],
    chart_data:        null,
    confidence_level:  null,

    // ── decision layer (populated by decision_node) ────────────
    decision:          null,
    confidence:        null,
    risk:              null,
    overall_score:     null,
    dimension_scores:  null,
    decision_insights: [],
    recommendation:    null,
    method:            null,
    evaluated_at:      null,

    // ── plumbing ───────────────────────────────────────────────
    __emit:   typeof input.__emit === "function" ? input.__emit : () => {},
    __errors: [],
  };
}

// ── 3. VALIDATOR ─────────────────────────────────────────────────
// Call after decision_node completes to catch malformed output
// before it reaches persist_node or the frontend.
// Returns { valid: boolean, errors: string[] }

/**
 * @param {AgentState} state
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateState(state) {
  const errors = [];

  // Required at the end of the pipeline
  if (!state.decision) {
    errors.push("decision is null — decision_node may have failed");
  } else if (!["Hire", "Reject", "Maybe"].includes(state.decision)) {
    errors.push(`decision has invalid value: "${state.decision}"`);
  }

  if (!state.confidence) {
    errors.push("confidence is null");
  } else if (!["High", "Medium", "Low"].includes(state.confidence)) {
    errors.push(`confidence has invalid value: "${state.confidence}"`);
  }

  if (!state.risk) {
    errors.push("risk is null");
  } else if (!["High", "Medium", "Low"].includes(state.risk)) {
    errors.push(`risk has invalid value: "${state.risk}"`);
  }

  if (state.overall_score === null || state.overall_score === undefined) {
    errors.push("overall_score is null");
  } else if (state.overall_score < 0 || state.overall_score > 100) {
    errors.push(`overall_score out of range: ${state.overall_score}`);
  }

  if (!Array.isArray(state.insights)) {
    errors.push("insights must be an array");
  }

  if (!Array.isArray(state.decision_insights)) {
    errors.push("decision_insights must be an array");
  }

  if (state.unified_scores) {
    const dims = ["coding_skill", "problem_solving", "consistency",
                  "professional_presence", "test_performance"];
    for (const dim of dims) {
      if (!(dim in state.unified_scores)) {
        errors.push(`unified_scores.${dim} is missing`);
      }
    }
  }

  // Warn (not error) if both coding sources missing and no test
  const noGitHub   = !state.github_data   || state.github_data.data_source   === "failed";
  const noLeetCode = !state.leetcode_data || state.leetcode_data.data_source === "failed";
  const noTest     = !state.test_scores;
  if (noGitHub && noLeetCode && noTest) {
    errors.push("warn: no coding validation source available — decision confidence will be Low");
  }

  return { valid: errors.filter((e) => !e.startsWith("warn:")).length === 0, errors };
}

// ── 4. SELECTOR HELPERS ──────────────────────────────────────────
// Pure functions that read from a finalised AgentState.
// Used by report.js and the React API layer to avoid
// repeating field-access logic in multiple places.

/**
 * Get the best available score for a dimension.
 * Returns { score, source, confidence } or null.
 * @param {AgentState} state
 * @param {"coding_skill"|"problem_solving"|"consistency"|"professional_presence"|"test_performance"} dimension
 */
function getScore(state, dimension) {
  return state.unified_scores?.[dimension] || null;
}

/**
 * Get insights filtered by type and/or section.
 * @param {AgentState} state
 * @param {{ type?: string, section?: string, severity?: string }} filter
 * @returns {Insight[]}
 */
function getInsights(state, filter = {}) {
  if (!Array.isArray(state.insights)) return [];
  return state.insights.filter((i) => {
    if (filter.type     && i.type     !== filter.type)     return false;
    if (filter.section  && i.section  !== filter.section)  return false;
    if (filter.severity && i.severity !== filter.severity) return false;
    return true;
  });
}

/**
 * Build a concise summary object for the report header.
 * @param {AgentState} state
 * @returns {Object}
 */
function getSummary(state) {
  return {
    candidate_name:  state.linkedin_data?.name     || state.resume_data?.full_name || "Unknown",
    candidate_email: state.resume_data?.email      || null,
    decision:        state.decision                || null,
    confidence:      state.confidence              || null,
    risk:            state.risk                    || null,
    overall_score:   state.overall_score           ?? null,
    sources_used:    Object.entries(state.source_status || {})
                       .filter(([, v]) => v === "real")
                       .map(([k]) => k),
    missing_sources: state.missing_sources         || [],
    evaluated_at:    state.evaluated_at            || null,
    has_warnings:    getInsights(state, { type: "warning" }).length > 0,
    warning_count:   getInsights(state, { type: "warning" }).length,
  };
}

/**
 * Returns true if the state has enough data to produce a meaningful report.
 * Used by report.js before sending to the frontend.
 * @param {AgentState} state
 * @returns {boolean}
 */
function isReportable(state) {
  return !!(
    state.decision &&
    state.overall_score !== null &&
    state.overall_score !== undefined
  );
}

// ── INTERNAL HELPERS ─────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Ensures a URL has the right domain and adds https:// if missing.
// Returns null if the URL clearly doesn't match the expected domain.
function normaliseUrl(url, expectedDomain) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Add protocol if missing
  const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProto);
    if (expectedDomain && !parsed.hostname.includes(expectedDomain)) {
      return null; // wrong domain — don't silently use it
    }
    return parsed.href;
  } catch {
    return null;
  }
}

// ── FIELD NAME CONSTANTS ─────────────────────────────────────────
// Import these in other agents instead of hardcoding strings.
// If a field is ever renamed, change it here and the linter
// finds every usage automatically.

const FIELDS = Object.freeze({
  // inputs
  CANDIDATE_ID:    "candidate_id",
  RESUME_BUFFER:   "resume_buffer",
  TEST_SCORES:     "test_scores",
  OVERRIDE_URLS:   "override_urls",

  // agent outputs
  GITHUB_DATA:     "github_data",
  LEETCODE_DATA:   "leetcode_data",
  LINKEDIN_DATA:   "linkedin_data",
  RESUME_DATA:     "resume_data",

  // inference
  SOURCE_STATUS:     "source_status",
  MISSING_SOURCES:   "missing_sources",
  UNIFIED_SCORES:    "unified_scores",
  INSIGHTS:          "insights",
  CROSS_CHECK_FLAGS: "cross_check_flags",
  CHART_DATA:        "chart_data",
  CONFIDENCE_LEVEL:  "confidence_level",

  // decision
  DECISION:          "decision",
  CONFIDENCE:        "confidence",
  RISK:              "risk",
  OVERALL_SCORE:     "overall_score",
  DIMENSION_SCORES:  "dimension_scores",
  DECISION_INSIGHTS: "decision_insights",
  RECOMMENDATION:    "recommendation",

  // data_source values
  SOURCE: Object.freeze({
    GITHUB_API:       "github_api",
    LEETCODE_GRAPHQL: "leetcode_graphql",
    CRAWL4AI:         "crawl4ai",
    PASTED_TEXT:      "pasted_text",
    LLM_PARSED:       "llm_parsed",
    REGEX_ONLY:       "regex_only",
    NOT_FOUND:        "not_found",
    FAILED:           "failed",
  }),

  // source_status values
  STATUS: Object.freeze({
    REAL:      "real",
    ESTIMATED: "estimated",
    MISSING:   "missing",
  }),

  // decision values
  DECISION_VALUES: Object.freeze({
    HIRE:   "Hire",
    REJECT: "Reject",
    MAYBE:  "Maybe",
  }),

  // confidence / risk values
  LEVEL: Object.freeze({
    HIGH:   "High",
    MEDIUM: "Medium",
    LOW:    "Low",
  }),
});

// ── EXPORTS ───────────────────────────────────────────────────────
module.exports = {
  createAgentState,
  validateState,
  getScore,
  getInsights,
  getSummary,
  isReportable,
  FIELDS,
};