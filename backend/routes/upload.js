// backend/routes/upload.js
// FIXES:
//   1. Status values guarded — only 'processing'/'ready'/'failed' inserted
//      (alter your ENUM if needed: see SQL comment at bottom of file)
//   2. PDF parse failure is handled gracefully — never crashes the route
//   3. /api/upload-resume is the one correct endpoint the frontend calls

const express = require("express");
const multer  = require("multer");
const router  = express.Router();
const db      = require("../config/db");
const { parseResume }   = require("../agents/resumeParser");
const { runEvaluation } = require("../orchestrator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Allowed status values that match your DB ENUM ────────────────
// If your ENUM is different, run this SQL to fix it:
//   ALTER TABLE candidates
//     MODIFY COLUMN status ENUM('active','inactive','pending','processing','ready','failed','new')
//     NOT NULL DEFAULT 'processing';
const SAFE_STATUS = {
  processing: "processing",
  ready:      "ready",
  failed:     "failed",
};

// ── POST /api/upload-resume ──────────────────────────────────────
router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  const { student_id, name, email, college } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Resume file is required" });
  }

  // ── Step 1: Parse resume for URLs ───────────────────────────────
  let parsedResume = null;
  try {
    parsedResume = await parseResume(req.file.buffer);
  } catch (parseErr) {
    console.warn("[upload] Resume parse warning:", parseErr.message);
    // Non-fatal — continue without parsed data
  }

  const githubUrl   = req.body.github_url   || parsedResume?.github   || null;
  const linkedinUrl = req.body.linkedin_url || parsedResume?.linkedin || null;
  const leetcodeUrl = req.body.leetcode_url || parsedResume?.leetcode || null;

  // ── Step 2: Upsert candidate row ────────────────────────────────
  // 'processing' is safe — guarded by SAFE_STATUS above.
  // If you get "Data truncated for column 'status'" run the ALTER TABLE
  // in the comment at the top of this file.
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
        githubUrl,
        linkedinUrl,
        leetcodeUrl,
        SAFE_STATUS.processing,   // INSERT value
        SAFE_STATUS.processing,   // ON DUPLICATE KEY UPDATE value
      ]
    );
  } catch (dbErr) {
    console.error("[upload] DB insert error:", dbErr.message);
    // If still getting ENUM error after the fix, log the attempted value
    if (dbErr.message.includes("truncated") || dbErr.message.includes("ENUM")) {
      console.error("[upload] ⚠️  Run this SQL to fix the ENUM:");
      console.error("  ALTER TABLE candidates MODIFY COLUMN status ENUM('active','inactive','pending','processing','ready','failed','new') NOT NULL DEFAULT 'processing';");
    }
    return res.status(500).json({ error: "Failed to save candidate record: " + dbErr.message });
  }

  // ── Step 3: Respond immediately ─────────────────────────────────
  res.json({
    success:    true,
    message:    "Resume received. Analysis running in background.",
    student_id,
    urls_found: {
      github:   !!githubUrl,
      linkedin: !!linkedinUrl,
      leetcode: !!leetcodeUrl,
    },
  });

  // ── Step 4: Background evaluation (after response is sent) ──────
  runBackgroundEvaluation({
    student_id,
    resume_buffer: req.file.buffer,
    github_url:    githubUrl,
    linkedin_url:  linkedinUrl,
    leetcode_url:  leetcodeUrl,
    parsed_resume: parsedResume,
    test_scores:   safeJSON(req.body.test_scores, null),
  });
});

// ── POST /api/upload-resume/retrigger ────────────────────────────
router.post("/upload-resume/retrigger", async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: "student_id required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM candidates WHERE id = ?",
      [student_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Candidate not found" });

    const candidate = rows[0];

    await db.execute(
      "UPDATE candidates SET status = ?, updated_at = NOW() WHERE id = ?",
      [SAFE_STATUS.processing, student_id]
    );

    res.json({ success: true, message: "Re-evaluation triggered", student_id });

    runBackgroundEvaluation({
      student_id,
      github_url:   candidate.github_url,
      linkedin_url: candidate.linkedin_url,
      leetcode_url: candidate.leetcode_url,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/upload-resume/status/:studentId ─────────────────────
router.get("/upload-resume/status/:studentId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, status, updated_at FROM candidates WHERE id = ?",
      [req.params.studentId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Background evaluation ────────────────────────────────────────
async function runBackgroundEvaluation(input) {
  const { student_id } = input;
  console.log(`[background] Starting evaluation for ${student_id}`);

  try {
    await runEvaluation({
      candidate_id:    student_id,
      resume_buffer:   input.resume_buffer   || null,
      github_url:      input.github_url      || null,
      linkedin_url:    input.linkedin_url    || null,
      leetcode_url:    input.leetcode_url    || null,
      test_scores:     input.test_scores     || null,
      pasted_linkedin: null,
      __emit:          () => {},
    });

    await db.execute(
      "UPDATE candidates SET status = ?, updated_at = NOW() WHERE id = ?",
      [SAFE_STATUS.ready, student_id]
    );

    console.log(`[background] Evaluation complete for ${student_id}`);

  } catch (err) {
    console.error(`[background] Evaluation failed for ${student_id}:`, err.message);

    await db.execute(
      "UPDATE candidates SET status = ?, updated_at = NOW() WHERE id = ?",
      [SAFE_STATUS.failed, student_id]
    ).catch(() => {});
  }
}

// ── Helper ───────────────────────────────────────────────────────
function safeJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;