// backend/routes/upload.js
// CHANGE: After resume parse, automatically triggers GitHub + LeetCode agents
// in the background for HIRING/PLACEMENT candidates only.

const express = require("express");
const multer  = require("multer");
const router  = express.Router();
const db      = require("../config/db");
const { parseResume }      = require("../agents/resumeParser");
const { runEvaluation }    = require("../orchestrator");
const { fetchGitHubData }  = require("../agents/githubAgent");
const { fetchLeetCodeData } = require("../agents/leetcodeAgent");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
});

const SAFE_STATUS = { processing: "processing", ready: "ready", failed: "failed" };

// ── POST /api/upload-resume ──────────────────────────────────────
router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  const { student_id, name, email, college } = req.body;
  if (!student_id) return res.status(400).json({ error: "student_id is required" });
  if (!req.file)   return res.status(400).json({ error: "Resume file is required" });

  // Step 1: Parse resume
  let parsedResume = null;
  try {
    parsedResume = await parseResume(req.file.buffer);
  } catch (parseErr) {
    console.warn("[upload] Resume parse warning:", parseErr.message);
  }

  const githubUrl   = req.body.github_url   || parsedResume?.github   || null;
  const linkedinUrl = req.body.linkedin_url || parsedResume?.linkedin || null;
  const leetcodeUrl = req.body.leetcode_url || parsedResume?.leetcode || null;

  console.log("[upload] URLs — GitHub:", githubUrl, "| LeetCode:", leetcodeUrl);

  // Step 2: Upsert candidate row
  try {
    await db.execute(
      `INSERT INTO candidates
         (id, name, email, college, github_url, linkedin_url, leetcode_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name         = COALESCE(VALUES(name),         name),
         email        = COALESCE(VALUES(email),        email),
         college      = COALESCE(VALUES(college),      college),
         github_url   = COALESCE(VALUES(github_url),   github_url),
         linkedin_url = COALESCE(VALUES(linkedin_url), linkedin_url),
         leetcode_url = COALESCE(VALUES(leetcode_url), leetcode_url),
         status       = ?,
         updated_at   = NOW()`,
      [
        student_id,
        name    || parsedResume?.full_name || null,
        email   || parsedResume?.email     || null,
        college || null,
        githubUrl, linkedinUrl, leetcodeUrl,
        SAFE_STATUS.processing,
        SAFE_STATUS.processing,
      ]
    );
  } catch (dbErr) {
    console.error("[upload] DB insert error:", dbErr.message);
    return res.status(500).json({ error: "Failed to save candidate: " + dbErr.message });
  }

  // Step 3: Respond immediately
  res.json({
    success: true,
    message: "Resume received. Agent analysis starting in background.",
    student_id,
    urls_found: { github: !!githubUrl, linkedin: !!linkedinUrl, leetcode: !!leetcodeUrl },
  });

  // Step 4: Fire GitHub + LeetCode agents immediately — parallel, non-blocking
  runAgentsInBackground({
    student_id,
    github_url:    githubUrl,
    leetcode_url:  leetcodeUrl,
    linkedin_url:  linkedinUrl,
    parsed_resume: parsedResume,
    resume_buffer: req.file.buffer,
    test_scores:   safeJSON(req.body.test_scores, null),
  });
});

// ── POST /api/upload-resume/retrigger ────────────────────────────
router.post("/upload-resume/retrigger", async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: "student_id required" });
  try {
    const [rows] = await db.query("SELECT * FROM candidates WHERE id = ?", [student_id]);
    if (!rows.length) return res.status(404).json({ error: "Candidate not found" });
    const c = rows[0];
    await db.execute("UPDATE candidates SET status=?, updated_at=NOW() WHERE id=?",
      [SAFE_STATUS.processing, student_id]);
    res.json({ success: true, message: "Re-evaluation triggered", student_id });
    runAgentsInBackground({
      student_id,
      github_url:   c.github_url,
      leetcode_url: c.leetcode_url,
      linkedin_url: c.linkedin_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/upload-resume/status/:studentId ─────────────────────
router.get("/upload-resume/status/:studentId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.status, c.updated_at,
              c.github_url, c.leetcode_url, c.linkedin_url,
              ca.github_fetched_at, ca.leetcode_fetched_at
       FROM candidates c
       LEFT JOIN candidate_agent_cache ca ON ca.candidate_id = c.id
       WHERE c.id = ?`,
      [req.params.studentId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────
// Background agent runner — GitHub + LeetCode in parallel
// ─────────────────────────────────────────────────────────────────
async function runAgentsInBackground(input) {
  const { student_id, github_url, leetcode_url, linkedin_url,
          parsed_resume, resume_buffer, test_scores } = input;

  console.log(`[agents] Starting for ${student_id} | GH:${github_url||"—"} LC:${leetcode_url||"—"}`);

  await ensureCacheTable();

  const [ghResult, lcResult] = await Promise.allSettled([
    github_url   ? fetchGitHubData(github_url)     : Promise.resolve(null),
    leetcode_url ? fetchLeetCodeData(leetcode_url) : Promise.resolve(null),
  ]);

  const githubData   = ghResult.status === "fulfilled" ? ghResult.value   : null;
  const leetcodeData = lcResult.status === "fulfilled" ? lcResult.value   : null;

  if (githubData)   console.log(`[agents] GitHub OK ${student_id} score=${githubData.coding_skill_score??0}`);
  if (leetcodeData) console.log(`[agents] LeetCode OK ${student_id} solved=${leetcodeData.total_solved??0}`);

  try {
    await db.execute(
      `INSERT INTO candidate_agent_cache
         (candidate_id, github_data, leetcode_data,
          github_fetched_at, leetcode_fetched_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         github_data         = COALESCE(VALUES(github_data),         github_data),
         leetcode_data       = COALESCE(VALUES(leetcode_data),       leetcode_data),
         github_fetched_at   = COALESCE(VALUES(github_fetched_at),   github_fetched_at),
         leetcode_fetched_at = COALESCE(VALUES(leetcode_fetched_at), leetcode_fetched_at),
         updated_at          = NOW()`,
      [
        student_id,
        githubData   ? JSON.stringify(githubData)   : null,
        leetcodeData ? JSON.stringify(leetcodeData) : null,
        githubData   ? new Date() : null,
        leetcodeData ? new Date() : null,
      ]
    );
  } catch (err) {
    console.error(`[agents] Cache write failed ${student_id}:`, err.message);
  }

  // Also run full orchestrator evaluation if buffer available
  if (resume_buffer || parsed_resume) {
    try {
      await runEvaluation({
        candidate_id:    student_id,
        resume_buffer:   resume_buffer || null,
        github_url:      github_url    || null,
        linkedin_url:    null,
        leetcode_url:    leetcode_url  || null,
        test_scores:     test_scores   || null,
        pasted_linkedin: null,
        __emit:          () => {},
      });
      await db.execute("UPDATE candidates SET status=?,updated_at=NOW() WHERE id=?",
        [SAFE_STATUS.ready, student_id]);
    } catch (err) {
      console.error(`[agents] Evaluation failed ${student_id}:`, err.message);
      await db.execute("UPDATE candidates SET status=?,updated_at=NOW() WHERE id=?",
        [SAFE_STATUS.failed, student_id]).catch(() => {});
    }
  } else {
    await db.execute("UPDATE candidates SET status=?,updated_at=NOW() WHERE id=?",
      [SAFE_STATUS.ready, student_id]).catch(() => {});
  }
}

async function ensureCacheTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS candidate_agent_cache (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id        VARCHAR(100) NOT NULL UNIQUE,
        github_data         JSON DEFAULT NULL,
        leetcode_data       JSON DEFAULT NULL,
        report_data         JSON DEFAULT NULL,
        github_fetched_at   DATETIME DEFAULT NULL,
        leetcode_fetched_at DATETIME DEFAULT NULL,
        report_generated_at DATETIME DEFAULT NULL,
        updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_candidate (candidate_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (err) {
    if (!err.message.includes("already exists"))
      console.warn("[agents] Cache table:", err.message);
  }
}

function safeJSON(val, fb) {
  if (!val) return fb;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fb; }
}

module.exports = router;