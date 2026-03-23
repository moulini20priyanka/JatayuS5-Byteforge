// backend/routes/upload.js
const express = require("express");
const multer  = require("multer");
const router  = express.Router();
const db      = require("../config/db");
const { parseResume }    = require("../agents/resumeParser");
const { runEvaluation }  = require("../orchestrator");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ── POST /api/upload-resume ──────────────────────────────────────
// Called when student submits resume during test.
//
// Flow:
//   1. Parse resume immediately → extract URLs + basic info
//   2. Save candidate to DB (candidates table)
//   3. Respond to student instantly → test proceeds
//   4. Run full LangGraph evaluation in background
//   5. Persist evaluation to evaluations table
//
// The student sees only step 3.
// The recruiter sees the result of step 5 in their dashboard.

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  const { student_id, name, email, college } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Resume file is required" });
  }

  try {
    // ── Step 1: Parse resume synchronously to extract URLs ──────
    // This is fast (<1s) so we do it before responding.
    // We need the URLs to save to the candidates table.
    let parsedResume = null;
    try {
      parsedResume = await parseResume(req.file.buffer);
    } catch (parseErr) {
      console.warn("Resume parse warning:", parseErr.message);
      // Non-fatal — continue with null parsedResume
    }

    const githubUrl   = req.body.github_url   || parsedResume?.github   || null;
    const linkedinUrl = req.body.linkedin_url || parsedResume?.linkedin || null;
    const leetcodeUrl = req.body.leetcode_url || parsedResume?.leetcode || null;

    // ── Step 2: Upsert candidate row ────────────────────────────
    await db.execute(
      `INSERT INTO candidates
         (id, name, email, college, github_url, linkedin_url, leetcode_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
       ON DUPLICATE KEY UPDATE
         name         = COALESCE(VALUES(name),         name),
         email        = COALESCE(VALUES(email),        email),
         college      = COALESCE(VALUES(college),      college),
         github_url   = COALESCE(VALUES(github_url),   github_url),
         linkedin_url = COALESCE(VALUES(linkedin_url), linkedin_url),
         leetcode_url = COALESCE(VALUES(leetcode_url), leetcode_url),
         status       = 'processing',
         updated_at   = NOW()`,
      [
        student_id,
        name       || parsedResume?.full_name || null,
        email      || parsedResume?.email     || null,
        college    || null,
        githubUrl,
        linkedinUrl,
        leetcodeUrl,
      ]
    );

    // ── Step 3: Respond to student immediately ──────────────────
    // Student can now proceed to the test.
    // Do NOT await the background job.
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

    // ── Step 4: Run full LangGraph evaluation in background ─────
    // This runs AFTER res.json() — student already got their response.
    // Uses your full orchestrator: parallel agents → inference → decision → persist.
    runBackgroundEvaluation({
      student_id,
      resume_buffer: req.file.buffer,
      github_url:    githubUrl,
      linkedin_url:  linkedinUrl,
      leetcode_url:  leetcodeUrl,
      parsed_resume: parsedResume,
      test_scores:   req.body.test_scores
        ? safeJSON(req.body.test_scores, null)
        : null,
    });

  } catch (err) {
    console.error("Upload route error:", err.message);
    // Only reaches here if DB insert failed (before res.json)
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process upload" });
    }
  }
});

// ── POST /api/upload-resume/retrigger ───────────────────────────
// Lets a recruiter manually re-run evaluation for a candidate
// without re-uploading the resume. Useful after fixing agent bugs.
router.post("/upload-resume/retrigger", async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: "student_id required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM candidates WHERE id = ?",
      [student_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const candidate = rows[0];

    // Mark as processing
    await db.execute(
      "UPDATE candidates SET status = 'processing', updated_at = NOW() WHERE id = ?",
      [student_id]
    );

    res.json({ success: true, message: "Re-evaluation triggered", student_id });

    // Re-run in background
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
// Lets the student page poll to check if analysis is done.
// Used by EvaluationProgress component if needed.
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

// ── BACKGROUND EVALUATION ────────────────────────────────────────
// Runs after the HTTP response is sent.
// Calls the full LangGraph orchestrator.
// Saves result to evaluations table via orchestrator's persistNode.
// Also updates candidates.status to 'ready' or 'failed'.

async function runBackgroundEvaluation(input) {
  const { student_id } = input;
  console.log(`[background] Starting evaluation for ${student_id}`);

  try {
    // SSE emit is a no-op here — no client is connected during background run.
    // When recruiter clicks "Evaluate" from dashboard, THAT uses the SSE endpoint
    // with a live connection. This background run just populates the DB.
    const noop = () => {};

    await runEvaluation({
      candidate_id:  student_id,
      resume_buffer: input.resume_buffer   || null,
      github_url:    input.github_url      || null,
      linkedin_url:  input.linkedin_url    || null,
      leetcode_url:  input.leetcode_url    || null,
      test_scores:   input.test_scores     || null,
      pasted_linkedin: null,
      __emit: noop,
    });

    // Mark candidate as ready
    await db.execute(
      "UPDATE candidates SET status = 'ready', updated_at = NOW() WHERE id = ?",
      [student_id]
    );

    console.log(`[background] Evaluation complete for ${student_id}`);

  } catch (err) {
    console.error(`[background] Evaluation failed for ${student_id}:`, err.message);

    // Mark candidate as failed so recruiter can retrigger
    await db.execute(
      "UPDATE candidates SET status = 'failed', updated_at = NOW() WHERE id = ?",
      [student_id]
    ).catch(() => {}); // don't throw if DB update also fails
  }
}

// ── helper ───────────────────────────────────────────────────────
function safeJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;