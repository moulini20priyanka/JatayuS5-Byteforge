-- ============================================================
-- NEURO DB: Question Bank + Exam Flow Migration
-- Run this on your `neuro` MySQL database
-- ============================================================

USE neuro;

-- ── 1. question_bank: stores AI-generated questions from QuizForge ──────────
CREATE TABLE IF NOT EXISTS question_bank (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  qb_id         VARCHAR(20)  NOT NULL UNIQUE,          -- e.g. QB-A1B2C3
  topic         VARCHAR(255) NOT NULL,
  question_text TEXT         NOT NULL,
  type          ENUM('mcq','coding','sql','aptitude','verbal') NOT NULL DEFAULT 'mcq',
  difficulty    ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  option_a      TEXT,
  option_b      TEXT,
  option_c      TEXT,
  option_d      TEXT,
  correct_ans   CHAR(1),                               -- A / B / C / D
  explanation   TEXT,
  language_tag  VARCHAR(50),
  topic_tag     VARCHAR(100),
  source        VARCHAR(50)  DEFAULT 'QuizForge AI',
  created_by    INT,                                   -- admin user id
  created_at    DATETIME     DEFAULT NOW(),
  is_active     TINYINT(1)   DEFAULT 1,
  INDEX idx_type       (type),
  INDEX idx_difficulty (difficulty),
  INDEX idx_topic_tag  (topic_tag),
  INDEX idx_active     (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. exams: admin-scheduled exams (enhanced with approval flow) ────────────
-- Add columns if table already exists; CREATE if it doesn't
CREATE TABLE IF NOT EXISTS exams (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  exam_type        ENUM('placement','university','skill_cert','hackathon') DEFAULT 'placement',
  exam_key         VARCHAR(50)  UNIQUE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  college          VARCHAR(255),
  batch_year       INT,
  department       VARCHAR(100),
  allowed_languages JSON,
  sections         JSON,
  section_config   JSON,
  start_date       DATETIME,
  end_date         DATETIME,
  duration_minutes INT          DEFAULT 60,
  total_marks      INT          DEFAULT 100,
  pass_mark        INT          DEFAULT 40,
  cutoff_score     INT,
  status           ENUM('draft','pending_approval','approved','scheduled','live','completed','cancelled')
                               DEFAULT 'draft',
  approved_by      INT,
  approved_at      DATETIME,
  created_by       INT,
  created_at       DATETIME     DEFAULT NOW(),
  semester         VARCHAR(20),
  exam_name        VARCHAR(255),
  subject_code     VARCHAR(50),
  subject_name     VARCHAR(255),
  exam_request_id  INT,
  INDEX idx_status     (status),
  INDEX idx_college    (college),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Patch exams table if it already exists (safe ALTER)
ALTER TABLE exams
  MODIFY COLUMN status ENUM('draft','pending_approval','approved','scheduled','live','completed','cancelled') DEFAULT 'draft';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_by  INT      AFTER status;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_at  DATETIME AFTER approved_by;

-- ── 3. exam_questions: questions linked to a specific exam ───────────────────
CREATE TABLE IF NOT EXISTS exam_questions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  exam_id         INT NOT NULL,
  qb_id           INT,                                 -- FK → question_bank.id
  type            ENUM('mcq','coding','sql','aptitude','verbal') DEFAULT 'mcq',
  question_text   TEXT NOT NULL,
  option_a        TEXT,
  option_b        TEXT,
  option_c        TEXT,
  option_d        TEXT,
  correct_ans     CHAR(1),
  explanation     TEXT,
  difficulty      ENUM('easy','medium','hard') DEFAULT 'medium',
  marks           INT DEFAULT 1,
  order_index     INT DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  INDEX idx_exam (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. exam_assignments: per-student exam tokens ────────────────────────────
CREATE TABLE IF NOT EXISTS exam_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  exam_id       INT NOT NULL,
  student_id    INT NOT NULL,
  exam_key      VARCHAR(50) NOT NULL UNIQUE,
  status        ENUM('assigned','started','submitted','absent') DEFAULT 'assigned',
  score         INT,
  answers       JSON,
  assigned_at   DATETIME DEFAULT NOW(),
  started_at    DATETIME,
  submitted_at  DATETIME,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  INDEX idx_exam_student (exam_id, student_id),
  INDEX idx_exam_key     (exam_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. exam_submissions: detailed answer storage ────────────────────────────
CREATE TABLE IF NOT EXISTS exam_submissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  exam_id       INT NOT NULL,
  student_id    INT NOT NULL,
  answers       JSON,
  score         INT,
  total_marks   INT,
  percentage    DECIMAL(5,2),
  submitted_at  DATETIME DEFAULT NOW(),
  FOREIGN KEY (assignment_id) REFERENCES exam_assignments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. audit_logs: comprehensive system activity tracking ─────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT,                                -- User who performed action
  username          VARCHAR(255),                       -- Username for reference
  action_type       VARCHAR(100) NOT NULL,              -- e.g., 'CANDIDATE_CREATED', 'EXAM_APPROVED'
  action_category   VARCHAR(50) NOT NULL,               -- e.g., 'CANDIDATE', 'EXAM', 'QUESTION', 'USER', 'LOGIN'
  entity_type       VARCHAR(100),                       -- Type of entity affected (candidate, exam, question, etc.)
  entity_id         INT,                                -- ID of affected entity
  entity_name       VARCHAR(255),                       -- Name/title for reference
  status            VARCHAR(50),                        -- 'SUCCESS', 'FAILURE', 'PENDING'
  details           JSON,                               -- Additional context (old values, new values, etc.)
  ip_address        VARCHAR(45),                        -- IPv4/IPv6 address
  user_agent        TEXT,                               -- Browser/client info
  timestamp         DATETIME DEFAULT NOW(),
  INDEX idx_user_id     (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_category    (action_category),
  INDEX idx_entity      (entity_type, entity_id),
  INDEX idx_timestamp   (timestamp),
  INDEX idx_status      (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. View: admin dashboard summary ────────────────────────────────────────
CREATE OR REPLACE VIEW v_exam_summary AS
SELECT
  e.id, e.title, e.exam_type, e.status, e.start_date, e.end_date,
  e.duration_minutes, e.college, e.batch_year,
  COUNT(DISTINCT eq.id)  AS question_count,
  COUNT(DISTINCT ea.id)  AS student_count,
  SUM(CASE WHEN ea.status='submitted' THEN 1 ELSE 0 END) AS submitted_count,
  e.created_at, e.approved_at
FROM exams e
LEFT JOIN exam_questions eq  ON eq.exam_id = e.id
LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
GROUP BY e.id;

SELECT 'Migration complete ✓ (includes audit_logs)' AS result;