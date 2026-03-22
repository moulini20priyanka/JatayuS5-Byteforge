const express = require('express');
const db      = require('../config/db');
const router  = express.Router();

// ── POST /api/exam-requests ──────────────────────────────────────
// Recruiter submits a new exam request
router.post('/exam-requests', async (req, res) => {
  const {
    recruiter_id, recruiter_email, company_name,
    job_role, exam_type, assessment_pattern,
    duration_minutes, specifications,
    target_college, target_batch_year
  } = req.body;

  if (!recruiter_id || !job_role || !exam_type)
    return res.status(400).json({ error: 'recruiter_id, job_role and exam_type are required' });

  try {
    const title = `${job_role} — ${exam_type}`;
    const [result] = await db.query(
      `INSERT INTO exam_requests
        (recruiter_id, recruiter_email, company_name, title, job_role, exam_type,
         assessment_pattern, duration_minutes, specifications, target_college, target_batch_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recruiter_id, recruiter_email || null, company_name || null,
        title, job_role, exam_type,
        assessment_pattern || null,
        duration_minutes   || 120,
        specifications     || null,
        target_college     || null,
        target_batch_year  || null,
      ]
    );
    res.json({ message: 'Exam request submitted successfully', id: result.insertId });
  } catch (err) {
    console.error('Create exam request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/exam-requests ───────────────────────────────────────
// Get all exam requests for a recruiter
router.get('/exam-requests', async (req, res) => {
  const { recruiter_id } = req.query;
  try {
    let query  = 'SELECT * FROM exam_requests';
    let params = [];
    if (recruiter_id) {
      query  += ' WHERE recruiter_id = ?';
      params  = [recruiter_id];
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get exam requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/exam-requests/all ───────────────────────────────────
// Admin gets all exam requests
router.get('/exam-requests/all', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT er.*, u.full_name as recruiter_name, u.company_name
       FROM exam_requests er
       LEFT JOIN users u ON er.recruiter_id = u.id
       ORDER BY er.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get all exam requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/exam-requests/:id/status ─────────────────────────
// Admin approves or rejects an exam request
router.patch('/exam-requests/:id/status', async (req, res) => {
  const { id }                      = req.params;
  const { status, approved_by, reject_reason } = req.body;

  if (!['approved','rejected','completed'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  try {
    await db.query(
      `UPDATE exam_requests
       SET status = ?, approved_by = ?, reject_reason = ?,
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE NULL END,
           updated_at  = NOW()
       WHERE id = ?`,
      [status, approved_by || null, reject_reason || null, status, id]
    );
    res.json({ message: `Request ${status} successfully` });
  } catch (err) {
    console.error('Update exam request status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;