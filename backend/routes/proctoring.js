// backend/routes/proctoring.js
// ─────────────────────────────────────────────────────────────────────────────
// Express router — AI Proctoring endpoints
//
// Mount in your main server file:
//   const proctoring = require('./routes/proctoring');
//   app.use('/api/proctoring', proctoring);
// ─────────────────────────────────────────────────────────────────────────────

const express        = require('express');
const router         = express.Router();
const db             = require('../config/db');       // matches YOUR project: backend/config/db.js
const { verifyToken } = require('../middleware/auth'); // matches YOUR project: backend/middleware/auth.js

// ── POST /api/proctoring/violation ───────────────────────────────────────────
router.post('/violation', verifyToken, async (req, res) => {
  const {
    assignment_id, exam_id, type, message,
    severity = 'medium', snapshot = null, timestamp,
  } = req.body;

  if (!assignment_id || !type) {
    return res.status(400).json({ error: 'assignment_id and type are required' });
  }

  try {
    const studentId = req.user?.id || req.user?.student_id || req.user?.userId || null;

    const [result] = await db.promise().query(
      `INSERT INTO proctoring_violations
         (assignment_id, exam_id, student_id, type, message, severity, snapshot_b64, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment_id, exam_id || null, studentId,
        type, message || '', severity, snapshot || null,
        timestamp ? new Date(timestamp) : new Date(),
      ]
    );

    // Calculate risk level from violation history
    let riskLevel = 'low';
    const [rows] = await db.promise().query(
      `SELECT COUNT(*) AS cnt, SUM(severity = 'high') AS high_cnt
       FROM proctoring_violations WHERE assignment_id = ?`,
      [assignment_id]
    );
    if (rows[0]) {
      const cnt      = parseInt(rows[0].cnt)      || 0;
      const high_cnt = parseInt(rows[0].high_cnt) || 0;
      if (high_cnt >= 3 || cnt >= 8)      riskLevel = 'high';
      else if (high_cnt >= 1 || cnt >= 3) riskLevel = 'medium';
    }

    // Update risk_level (non-fatal if column missing)
    await db.promise().query(
      `UPDATE exam_assignments SET risk_level = ? WHERE id = ?`,
      [riskLevel, assignment_id]
    ).catch(e => console.warn('[proctoring] risk_level update skipped:', e.message));

    res.json({ ok: true, violationId: result.insertId, riskLevel });
  } catch (err) {
    console.error('[proctoring] violation insert error:', err.message);
    res.status(500).json({ error: 'DB error: ' + err.message });
  }
});

// ── GET /api/proctoring/violations/:assignmentId ─────────────────────────────
router.get('/violations/:assignmentId', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id, type, message, severity, occurred_at,
              CASE WHEN snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END AS has_snapshot
       FROM proctoring_violations
       WHERE assignment_id = ?
       ORDER BY occurred_at DESC`,
      [req.params.assignmentId]
    );
    res.json({ violations: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/snapshot/:violationId ────────────────────────────────
router.get('/snapshot/:violationId', verifyToken, async (req, res) => {
  const role = req.user?.role || req.user?.userType || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden — admin only' });
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT snapshot_b64, type, message, severity, occurred_at
       FROM proctoring_violations WHERE id = ?`,
      [req.params.violationId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/admin/active-exams ───────────────────────────────────
router.get('/admin/active-exams', verifyToken, async (req, res) => {
  const role = req.user?.role || req.user?.userType || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [exams] = await db.promise().query(
      `SELECT
         e.id                        AS exam_id,
         e.title                     AS exam_name,
         COALESCE(e.proctor, '—')    AS assigned_proctor,
         COUNT(ea.id)                AS total_candidates,
         SUM(CASE WHEN ea.risk_level = 'high'   THEN 1 ELSE 0 END) AS high_risk,
         SUM(CASE WHEN ea.risk_level = 'medium' THEN 1 ELSE 0 END) AS medium_risk,
         SUM(CASE WHEN ea.risk_level = 'low'    THEN 1 ELSE 0 END) AS low_risk,
         MIN(ea.started_at)          AS started_at
       FROM exams e
       JOIN exam_assignments ea ON ea.exam_id = e.id
       WHERE ea.status IN ('started', 'assigned')
       GROUP BY e.id, e.title, e.proctor
       ORDER BY high_risk DESC, total_candidates DESC`
    );
    res.json({ exams });
  } catch (err) {
    // Fallback if risk_level column not yet added
    console.warn('[proctoring] active-exams fallback:', err.message);
    try {
      const [exams] = await db.promise().query(
        `SELECT e.id AS exam_id, e.title AS exam_name,
                '—' AS assigned_proctor, COUNT(ea.id) AS total_candidates,
                0 AS high_risk, 0 AS medium_risk, 0 AS low_risk
         FROM exams e
         JOIN exam_assignments ea ON ea.exam_id = e.id
         WHERE ea.status IN ('started', 'assigned')
         GROUP BY e.id, e.title`
      );
      res.json({ exams });
    } catch (err2) {
      res.status(500).json({ error: err2.message });
    }
  }
});

// ── GET /api/proctoring/admin/candidates/:examId ─────────────────────────────
router.get('/admin/candidates/:examId', verifyToken, async (req, res) => {
  const role = req.user?.role || req.user?.userType || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // NOTE: exam_assignments.student_id is varchar(64) — cast u.id to char for the join
    const [candidates] = await db.promise().query(
      `SELECT
         ea.id                          AS assignment_id,
         ea.student_id,
         u.name                         AS student_name,
         COALESCE(u.roll_number, u.email, ea.student_id) AS roll_number,
         COALESCE(ea.risk_level, 'low') AS risk_level,
         ea.status,
         ea.started_at,
         COUNT(pv.id)                                          AS violation_count,
         SUM(CASE WHEN pv.severity = 'high' THEN 1 ELSE 0 END) AS critical_violations,
         MAX(pv.occurred_at)                                   AS last_violation_at
       FROM exam_assignments ea
       LEFT JOIN users u ON CAST(u.id AS CHAR) = ea.student_id
       LEFT JOIN proctoring_violations pv ON pv.assignment_id = ea.id
       WHERE ea.exam_id = ?
         AND ea.status IN ('started', 'assigned', 'in_progress')
       GROUP BY ea.id, ea.student_id, u.name, u.roll_number, u.email, ea.risk_level, ea.status, ea.started_at
       ORDER BY critical_violations DESC, violation_count DESC`,
      [req.params.examId]
    );
    res.json({ candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/admin/alerts ─────────────────────────────────────────
router.get('/admin/alerts', verifyToken, async (req, res) => {
  const role = req.user?.role || req.user?.userType || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const limit  = Math.min(parseInt(req.query.limit  || '50', 10), 200);
  const offset = parseInt(req.query.offset || '0', 10);
  const risk   = req.query.risk;

  try {
    const params = [];
    let riskWhere = '';
    if (risk && ['high', 'medium', 'low'].includes(risk)) {
      riskWhere = 'AND ea.risk_level = ?';
      params.push(risk);
    }
    params.push(limit, offset);

    const [alerts] = await db.promise().query(
      `SELECT
         pv.id                          AS violation_id,
         pv.type,
         pv.message,
         pv.severity,
         pv.occurred_at,
         CASE WHEN pv.snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END AS has_snapshot,
         COALESCE(u.name, ea.student_id) AS student_name,
         COALESCE(u.roll_number, u.email, ea.student_id) AS roll_number,
         ea.id                          AS assignment_id,
         COALESCE(ea.risk_level, 'low') AS risk_level,
         e.title                        AS exam_name,
         COALESCE(e.proctor, '—')       AS assigned_proctor
       FROM proctoring_violations pv
       JOIN exam_assignments ea ON ea.id = pv.assignment_id
       LEFT JOIN users       u  ON CAST(u.id AS CHAR) = ea.student_id
       JOIN exams            e  ON e.id = ea.exam_id
       WHERE ea.status IN ('started', 'assigned', 'submitted')
       ${riskWhere}
       ORDER BY pv.occurred_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/proctoring/admin/terminate/:assignmentId ───────────────────────
router.post('/admin/terminate/:assignmentId', verifyToken, async (req, res) => {
  const role = req.user?.role || req.user?.userType || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { reason = 'Terminated by admin/proctor' } = req.body;
  const { assignmentId } = req.params;

  try {
    await db.promise().query(
      `UPDATE exam_assignments SET status = 'terminated' WHERE id = ?`,
      [assignmentId]
    );

    // Set timestamps if columns exist
    await db.promise().query(
      `UPDATE exam_assignments SET terminated_at = NOW(), termination_reason = ? WHERE id = ?`,
      [reason, assignmentId]
    ).catch(() => {});

    // Log as violation
    await db.promise().query(
      `INSERT INTO proctoring_violations (assignment_id, type, message, severity, occurred_at)
       VALUES (?, 'TERMINATED', ?, 'high', NOW())`,
      [assignmentId, reason]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;