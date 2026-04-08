

CREATE DATABASE IF NOT EXISTS neuroassess;
USE neuroassess;


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

 
  github_raw     JSON DEFAULT NULL,    -- githubAgent return shape
  leetcode_raw   JSON DEFAULT NULL,    -- leetcodeAgent return shape
  linkedin_raw   JSON DEFAULT NULL,    -- linkedinAgent return shape
  resume_raw     JSON DEFAULT NULL,    -- resumeParser return shape (no raw_text)


  scores         JSON DEFAULT NULL,


  source_status  JSON DEFAULT NULL,
  missing_sources JSON DEFAULT NULL,   -- string[] e.g. ["leetcode","linkedin"]

  
  insights       JSON DEFAULT NULL,    -- Insight[] from inferenceAgent
  chart_data     JSON DEFAULT NULL,    -- ChartData for Recharts


  errors         JSON DEFAULT NULL,    -- [{ agent, error }]

  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 
  UNIQUE KEY uq_evaluations_candidate (candidate_id)
);

-- Recruiter dashboard queries
CREATE INDEX IF NOT EXISTS idx_evaluations_decision
  ON evaluations(decision);

CREATE INDEX IF NOT EXISTS idx_evaluations_score
  ON evaluations(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_created
  ON evaluations(created_at DESC);


CREATE TABLE IF NOT EXISTS scrape_cache (
  id          INT AUTO_INCREMENT PRIMARY KEY,

  url         VARCHAR(512)  NOT NULL,

  
  source      ENUM('github','leetcode','linkedin','resume') NOT NULL,

 
  data        JSON          NOT NULL,

 
  ttl_hours   INT           NOT NULL DEFAULT 24,
  fetched_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  
  UNIQUE KEY uq_scrape_cache_url (url)
);


CREATE INDEX IF NOT EXISTS idx_scrape_cache_fetched
  ON scrape_cache(source, fetched_at);


CREATE TABLE IF NOT EXISTS evaluation_insights (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id  INT          NOT NULL,   -- FK → evaluations.id
  candidate_id   VARCHAR(100) NOT NULL,   -- denormalised for fast lookups

  
  section        VARCHAR(50)  NOT NULL,   -- "github"|"leetcode"|"linkedin"|"resume"|"cross_check"|"overall"|"decision"
  type           ENUM('positive','warning','info') NOT NULL DEFAULT 'info',
  severity       ENUM('high','medium','low','none') NOT NULL DEFAULT 'none',
  message        TEXT         NOT NULL,

  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_insight_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_insights_severity
  ON evaluation_insights(severity, type);


CREATE INDEX IF NOT EXISTS idx_insights_candidate
  ON evaluation_insights(candidate_id);


CREATE INDEX IF NOT EXISTS idx_insights_section
  ON evaluation_insights(section, type);

