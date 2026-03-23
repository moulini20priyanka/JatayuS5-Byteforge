-- ─────────────────────────────────────────────────────────────────
-- schema.sql
--
-- WHAT CHANGED FROM YOUR ORIGINAL & WHY
--
-- KEPT (zero changes):
--   CREATE DATABASE neuroassess            ✓
--   CREATE TABLE candidate_reports (...)   ✓  every column unchanged
--
-- ADDED:
--   ALTER TABLE candidate_reports          → adds 4 missing columns
--                                            that report.js now writes:
--                                            updated_at, confidence,
--                                            risk, decision
--                                            Uses IF NOT EXISTS so safe
--                                            to run on existing DB.
--
--   CREATE TABLE evaluations               → full agent pipeline output.
--                                            Written by persist_node in
--                                            orchestrator.js. One row
--                                            per evaluation run.
--
--   CREATE TABLE scrape_cache              → caches Crawl4AI + GitHub
--                                            + LeetCode responses by URL.
--                                            Prevents re-scraping the
--                                            same profile on every run.
--                                            TTL enforced in Node, not SQL.
--
--   CREATE TABLE evaluation_insights       → stores each insight card
--                                            as a separate row so
--                                            recruiters can filter/search
--                                            by section, type, severity
--                                            without parsing JSON.
--
-- HOW TO RUN:
--   First time (empty DB):
--     mysql -u root -p neuroassess < schema.sql
--
--   Existing DB (safe — all statements are IF NOT EXISTS / IF NOT EXIST):
--     mysql -u root -p neuroassess < schema.sql
-- ─────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS neuroassess;
USE neuroassess;

-- ─────────────────────────────────────────────────────────────────
-- KEPT: your existing table — zero changes to any existing column
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_reports (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   VARCHAR(100) NOT NULL,
  name         VARCHAR(200),
  github_url   VARCHAR(500),
  linkedin_url VARCHAR(500),
  leetcode_url VARCHAR(500),

  -- GitHub data
  github_repos            INT   DEFAULT 0,
  github_followers        INT   DEFAULT 0,
  github_top_languages    JSON,
  github_total_commits    INT   DEFAULT 0,
  github_score            FLOAT DEFAULT 0,

  -- LeetCode data
  leetcode_total_solved   INT   DEFAULT 0,
  leetcode_easy           INT   DEFAULT 0,
  leetcode_medium         INT   DEFAULT 0,
  leetcode_hard           INT   DEFAULT 0,
  leetcode_ranking        INT   DEFAULT 0,
  leetcode_score          FLOAT DEFAULT 0,

  -- LinkedIn data
  linkedin_summary        TEXT,
  linkedin_certifications JSON,
  linkedin_experience     JSON,
  linkedin_score          FLOAT DEFAULT 0,

  -- Test scores
  mcq_score               FLOAT DEFAULT 0,
  sql_score               FLOAT DEFAULT 0,
  coding_score            FLOAT DEFAULT 0,
  test_score              FLOAT DEFAULT 0,

  -- Final
  total_score             FLOAT DEFAULT 0,
  report_text             TEXT,
  status ENUM('processing', 'ready') DEFAULT 'processing',
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- ADDED: 4 new columns on candidate_reports
--
-- report.js route now writes decision/confidence/risk/updated_at
-- after the pipeline completes. Using ALTER + IF NOT EXISTS so
-- this is safe to run against your existing populated table —
-- it will no-op if the columns already exist.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE candidate_reports
  ADD COLUMN IF NOT EXISTS decision    ENUM('Hire','Maybe','Reject') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confidence  ENUM('High','Medium','Low')   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk        ENUM('High','Medium','Low')   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP NULL DEFAULT NULL
    ON UPDATE CURRENT_TIMESTAMP;

-- Index for recruiter dashboard — filter by decision
CREATE INDEX IF NOT EXISTS idx_candidate_reports_decision
  ON candidate_reports(decision);

-- Index your existing reports/all query uses (ORDER BY total_score)
CREATE INDEX IF NOT EXISTS idx_candidate_reports_total_score
  ON candidate_reports(total_score DESC);

-- ─────────────────────────────────────────────────────────────────
-- NEW: evaluations
--
-- One row per full agent pipeline run. Written by persist_node
-- inside orchestrator.js after decisionAgent completes.
--
-- Stores the complete output so recruiters can reload a previous
-- report (GET /report/evaluate/:candidateId) without re-running
-- the full pipeline.
--
-- Why separate from candidate_reports?
--   candidate_reports = your existing exam platform table.
--   evaluations       = the new agentic hiring report table.
--   They are joined by candidate_id. Keeping them separate means
--   your existing exam functionality is never at risk from the
--   new pipeline writing bad data.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id   VARCHAR(100) NOT NULL,

  -- Decision layer output
  decision       ENUM('Hire','Maybe','Reject') DEFAULT NULL,
  confidence     ENUM('High','Medium','Low')   DEFAULT NULL,
  risk           ENUM('High','Medium','Low')   DEFAULT NULL,
  overall_score  FLOAT DEFAULT NULL,
  recommendation TEXT,
  method         VARCHAR(50) DEFAULT NULL,  -- "llm" | "rule_based" | "rule_based:..."

  -- Raw agent outputs (full JSON blobs)
  -- Stored separately so they can be queried independently
  github_raw     JSON DEFAULT NULL,    -- githubAgent return shape
  leetcode_raw   JSON DEFAULT NULL,    -- leetcodeAgent return shape
  linkedin_raw   JSON DEFAULT NULL,    -- linkedinAgent return shape
  resume_raw     JSON DEFAULT NULL,    -- resumeParser return shape (no raw_text)

  -- Aggregated scoring
  -- scores.unified    = UnifiedScores object from inferenceAgent
  -- scores.dimensions = { coding_skill, problem_solving, ... }
  -- scores.sub        = per-agent sub_scores objects
  scores         JSON DEFAULT NULL,

  -- Source metadata
  -- { github: "real"|"estimated"|"missing", leetcode: ..., ... }
  source_status  JSON DEFAULT NULL,
  missing_sources JSON DEFAULT NULL,   -- string[] e.g. ["leetcode","linkedin"]

  -- Insight cards (also stored normalised in evaluation_insights)
  insights       JSON DEFAULT NULL,    -- Insight[] from inferenceAgent
  chart_data     JSON DEFAULT NULL,    -- ChartData for Recharts

  -- Non-fatal errors accumulated during the run
  errors         JSON DEFAULT NULL,    -- [{ agent, error }]

  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Allow one evaluation per candidate (latest wins via ON DUPLICATE KEY)
  -- Remove this UNIQUE if you want full history of every run
  UNIQUE KEY uq_evaluations_candidate (candidate_id)
);

-- Recruiter dashboard queries
CREATE INDEX IF NOT EXISTS idx_evaluations_decision
  ON evaluations(decision);

CREATE INDEX IF NOT EXISTS idx_evaluations_score
  ON evaluations(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_created
  ON evaluations(created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- NEW: scrape_cache
--
-- Caches Crawl4AI, GitHub API, and LeetCode API responses by URL.
-- Prevents re-fetching the same profile on every evaluation run.
--
-- TTL is enforced in Node (linkedinAgent.js checks fetched_at
-- before calling the sidecar). SQL stores the data — expiry
-- logic lives in the application layer, not in the DB.
--
-- Default TTL:
--   GitHub API   → 24h  (commits don't change that fast)
--   LeetCode API → 24h
--   LinkedIn     → 48h  (Crawl4AI scrapes are slow + costly)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_cache (
  id          INT AUTO_INCREMENT PRIMARY KEY,

  -- Full URL used as the cache key
  -- e.g. "https://github.com/torvalds"
  --      "https://leetcode.com/user123"
  --      "https://linkedin.com/in/johndoe"
  url         VARCHAR(512)  NOT NULL,

  -- Which agent populated this row
  source      ENUM('github','leetcode','linkedin','resume') NOT NULL,

  -- The full structured JSON the agent returned
  -- Same shape as github_data / leetcode_data / linkedin_data
  data        JSON          NOT NULL,

  -- TTL control — Node reads this and compares to NOW()
  ttl_hours   INT           NOT NULL DEFAULT 24,
  fetched_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Unique on URL so INSERT ... ON DUPLICATE KEY UPDATE refreshes the cache
  UNIQUE KEY uq_scrape_cache_url (url)
);

-- Expire check: Node runs SELECT * FROM scrape_cache WHERE url=?
-- then checks: (NOW() - fetched_at) / 3600 < ttl_hours
-- This index makes that lookup fast even with 100k+ cache rows
CREATE INDEX IF NOT EXISTS idx_scrape_cache_fetched
  ON scrape_cache(source, fetched_at);

-- ─────────────────────────────────────────────────────────────────
-- NEW: evaluation_insights
--
-- Stores each insight card as an individual row.
-- Mirrors the insights JSON array in evaluations.insights
-- but normalised so recruiters can:
--   - Filter all "warning" severity insights across all candidates
--   - Search for specific flags (e.g. "resume_github_tech_mismatch")
--   - Build a dashboard of common issues across all evaluations
--
-- Written by persist_node after it saves the evaluations row.
-- Safe to skip if persist_node fails — insights are still in
-- evaluations.insights JSON column as fallback.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluation_insights (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id  INT          NOT NULL,   -- FK → evaluations.id
  candidate_id   VARCHAR(100) NOT NULL,   -- denormalised for fast lookups

  -- Mirrors the Insight typedef from agentState.js
  section        VARCHAR(50)  NOT NULL,   -- "github"|"leetcode"|"linkedin"|"resume"|"cross_check"|"overall"|"decision"
  type           ENUM('positive','warning','info') NOT NULL DEFAULT 'info',
  severity       ENUM('high','medium','low','none') NOT NULL DEFAULT 'none',
  message        TEXT         NOT NULL,

  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_insight_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    ON DELETE CASCADE
);

-- Recruiter dashboard: "show me all candidates with high-severity warnings"
CREATE INDEX IF NOT EXISTS idx_insights_severity
  ON evaluation_insights(severity, type);

-- Per-evaluation lookup: "show insights for this candidate"
CREATE INDEX IF NOT EXISTS idx_insights_candidate
  ON evaluation_insights(candidate_id);

-- Per-section analytics: "what % of candidates have github warnings?"
CREATE INDEX IF NOT EXISTS idx_insights_section
  ON evaluation_insights(section, type);

-- ─────────────────────────────────────────────────────────────────
-- VERIFY: quick sanity check queries (run manually after migration)
-- ─────────────────────────────────────────────────────────────────
-- SHOW TABLES;
-- DESCRIBE candidate_reports;
-- DESCRIBE evaluations;
-- DESCRIBE scrape_cache;
-- DESCRIBE evaluation_insights;