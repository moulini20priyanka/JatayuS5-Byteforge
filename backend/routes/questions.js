// backend/routes/questions.js
// GET /api/questions/:examId/mcq     — fetch MCQ questions for exam
// GET /api/questions/:examId/sql     — fetch SQL questions for exam
// GET /api/questions/:examId/coding  — fetch coding questions for exam
// POST /api/questions/answer         — save a single answer
// POST /api/questions/submit         — mark exam submitted

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ── GET questions by type ────────────────────────────────────────────────────
// SELECT * FROM questions WHERE exam_id = ? AND type = ?
// This is the core query — no tricks, straight from the table.
router.get('/questions/:examId/:type', authenticateToken, async (req, res) => {
  const { examId, type } = req.params;
  const validTypes = ['mcq', 'sql', 'coding'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type: ${type}. Use mcq | sql | coding` });
  }

  try {
    // Fetch questions — hide correct_ans for mcq/sql (security)
    // For coding, correct_ans is null anyway so no issue
    const [rows] = await db.query(
      `SELECT
         id,
         type,
         question_text,
         option_a,
         option_b,
         option_c,
         option_d,
         ${type === 'coding' ? 'correct_ans,' : ''}
         explanation,
         difficulty,
         description,
         platform,
         starter_code,
         constraints_text
       FROM questions
       WHERE exam_id = ?
         AND type = ?
         AND (is_bank = 0 OR is_bank IS NULL)
       ORDER BY RAND()`,
      [examId, type]
    );

    // For MCQ/SQL: include correct_ans in response
    // (front-end needs it to score locally; you can remove this
    //  if you want server-side scoring only)
    if (type !== 'coding') {
      const [withAns] = await db.query(
        `SELECT
           id,
           type,
           question_text,
           option_a,
           option_b,
           option_c,
           option_d,
           correct_ans,
           difficulty,
           description
         FROM questions
         WHERE exam_id = ?
           AND type = ?
           AND (is_bank = 0 OR is_bank IS NULL)
         ORDER BY RAND()`,
        [examId, type]
      );
      return res.json({ questions: withAns, total: withAns.length });
    }

    return res.json({ questions: rows, total: rows.length });

  } catch (err) {
    console.error(`[Questions /${examId}/${type}]`, err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/questions/answer — save one answer ─────────────────────────────
router.post('/questions/answer', authenticateToken, async (req, res) => {
  const { assignment_id, question_id, selected_ans } = req.body;
  if (!assignment_id || !question_id) {
    return res.status(400).json({ error: 'assignment_id and question_id required' });
  }
  try {
    await db.query(
      `INSERT INTO exam_answers (assignment_id, question_id, selected_ans, answered_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE selected_ans = VALUES(selected_ans), answered_at = NOW()`,
      [assignment_id, question_id, selected_ans]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[SaveAnswer]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/questions/submit — mark assignment submitted ───────────────────
router.post('/questions/submit', authenticateToken, async (req, res) => {
  const {
    assignment_id,
    exam_id,
    score_sql,
    code_answers,
    violations,
    violation_count,
  } = req.body;

  if (!assignment_id) {
    return res.status(400).json({ error: 'assignment_id required' });
  }

  try {
    // Build update fields dynamically
    const fields  = [`status = 'submitted'`, `submitted_at = NOW()`];
    const params  = [];

    if (score_sql      !== undefined) { fields.push('score_sql = ?');       params.push(score_sql); }
    if (code_answers   !== undefined) { fields.push('code_answers = ?');    params.push(JSON.stringify(code_answers)); }
    if (violations     !== undefined) { fields.push('violations = ?');      params.push(JSON.stringify(violations)); }
    if (violation_count !== undefined){ fields.push('violation_count = ?'); params.push(violation_count); }

    params.push(assignment_id);

    await db.query(
      `UPDATE exam_assignments SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[SubmitExam]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;