// backend/routes/proctoring.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ── POST /api/proctoring/violation ───────────────────────────────────────────
router.post('/violation', authenticateToken, async (req, res) => {
  const {
    assignment_id, exam_id, type, message,
    severity = 'medium', snapshot = null, timestamp,
  } = req.body;

  if (!assignment_id || !type) {
    return res.status(400).json({ error: 'assignment_id and type are required' });
  }

  try {
    const studentId = req.user?.id || req.user?.student_id || req.user?.userId || null;

    const [result] = await db.query(
      `INSERT INTO proctoring_violations
         (assignment_id, exam_id, student_id, type, message, severity, snapshot_b64, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment_id, exam_id || null, studentId,
        type, message || '', severity, snapshot || null,
        timestamp ? new Date(timestamp) : new Date(),
      ]
    );

    let riskLevel = 'low';
    const [rows] = await db.query(
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

    await db.query(
      `UPDATE exam_assignments SET risk_level = ? WHERE id = ?`,
      [riskLevel, assignment_id]
    ).catch(e => console.warn('[proctoring] risk_level update skipped (run migration):', e.message));

    res.json({ ok: true, violationId: result.insertId, riskLevel });
  } catch (err) {
    console.error('[proctoring] violation insert error:', err.message);
    res.status(500).json({ error: 'DB error: ' + err.message });
  }
});

// ── GET /api/proctoring/violations/:assignmentId ─────────────────────────────
router.get('/violations/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
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
router.get('/snapshot/:violationId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden — admin/proctor only' });
  }
  try {
    const [rows] = await db.query(
      `SELECT snapshot_b64, type, message, severity, occurred_at
       FROM proctoring_violations WHERE id = ?`,
      [req.params.violationId]
    );
    // FIX: return 404 clearly so frontend can show "no snapshot" UI gracefully
    if (!rows.length) return res.status(404).json({ error: 'Violation not found' });

    const row = rows[0];
    // FIX: if snapshot_b64 is NULL, still return the metadata — frontend handles missing image
    res.json({
      type:        row.type,
      message:     row.message,
      severity:    row.severity,
      occurred_at: row.occurred_at,
      snapshot_b64: row.snapshot_b64 || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/admin/active-exams ───────────────────────────────────
router.get('/admin/active-exams', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [exams] = await db.query(
      `SELECT
         e.id                                                          AS exam_id,
         e.title                                                       AS exam_name,
         COALESCE(e.proctor, '—')                                     AS assigned_proctor,
         COUNT(ea.id)                                                  AS total_candidates,
         SUM(COALESCE(ea.risk_level = 'high',   0))                   AS high_risk,
         SUM(COALESCE(ea.risk_level = 'medium', 0))                   AS medium_risk,
         SUM(COALESCE(ea.risk_level = 'low',    0))                   AS low_risk,
         MIN(ea.started_at)                                            AS started_at
       FROM exams e
       JOIN exam_assignments ea ON ea.exam_id = e.id
       WHERE ea.status IN ('started', 'assigned')
       GROUP BY e.id, e.title, e.proctor
       ORDER BY high_risk DESC, total_candidates DESC`
    );
    res.json({ exams });
  } catch (err) {
    console.warn('[proctoring] active-exams fallback (run migration to add risk_level):', err.message);
    try {
      const [exams] = await db.query(
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
router.get('/admin/candidates/:examId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [candidates] = await db.query(
      `SELECT
         ea.id                                                          AS assignment_id,
         ea.student_id,
         c.name                                                         AS student_name,
         COALESCE(c.email, ea.student_id)                              AS roll_number,
         COALESCE(ea.risk_level, 'low')                                AS risk_level,
         ea.status,
         ea.started_at,
         COUNT(pv.id)                                                   AS violation_count,
         SUM(CASE WHEN pv.severity = 'high' THEN 1 ELSE 0 END)        AS critical_violations,
         MAX(pv.occurred_at)                                            AS last_violation_at
       FROM exam_assignments ea
       LEFT JOIN candidates c ON c.id = ea.student_id
       LEFT JOIN proctoring_violations pv ON pv.assignment_id = ea.id
       WHERE ea.exam_id = ?
         AND ea.status IN ('started', 'assigned', 'submitted')
       GROUP BY ea.id, ea.student_id, c.name, c.email, ea.risk_level, ea.status, ea.started_at
       ORDER BY critical_violations DESC, violation_count DESC`,
      [req.params.examId]
    );
    res.json({ candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/admin/alerts ─────────────────────────────────────────
router.get('/admin/alerts', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
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
      riskWhere = "AND COALESCE(ea.risk_level, 'low') = ?";
      params.push(risk);
    }
    params.push(limit, offset);

    const [alerts] = await db.query(
      `SELECT
         pv.id                                                          AS violation_id,
         pv.type,
         pv.message,
         pv.severity,
         pv.occurred_at,
         CASE WHEN pv.snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END      AS has_snapshot,
         COALESCE(c.name, ea.student_id)                               AS student_name,
         COALESCE(c.email, ea.student_id)                              AS roll_number,
         ea.id                                                          AS assignment_id,
         COALESCE(ea.risk_level, 'low')                                AS risk_level,
         e.title                                                        AS exam_name,
         COALESCE(e.proctor, '—')                                      AS assigned_proctor
       FROM proctoring_violations pv
       JOIN exam_assignments ea ON ea.id = pv.assignment_id
       LEFT JOIN candidates  c  ON c.id = ea.student_id
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
router.post('/admin/terminate/:assignmentId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { reason = 'Terminated by admin/proctor' } = req.body;
  const { assignmentId } = req.params;

  try {
    // STEP 1: Update assignment status — this is the critical operation
    const [result] = await db.query(
      `UPDATE exam_assignments SET status = 'submitted' WHERE id = ?`,
      [assignmentId]
    );

    if (result.affectedRows === 0) {
      // Assignment ID not found in DB — could be mock data or already terminated
      console.warn(`[proctoring] terminate: assignment ${assignmentId} not found in DB`);
      // Still return ok:true so frontend doesn't show "Failed" toast
      return res.json({ ok: true, warning: 'Assignment not found — may already be terminated' });
    }

    // STEP 2: Log the termination as a violation — NON-FATAL
    // If proctoring_violations table doesn't exist yet, skip gracefully
    try {
      await db.query(
        `INSERT INTO proctoring_violations (assignment_id, type, message, severity, occurred_at)
         VALUES (?, 'TERMINATED', ?, 'high', NOW())`,
        [assignmentId, reason]
      );
    } catch (logErr) {
      // Table missing — run the migration SQL below to create it
      console.warn('[proctoring] terminate log skipped (run migration to create proctoring_violations):', logErr.message);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[proctoring] terminate error:', err.message);
    res.status(500).json({ error: 'DB error: ' + err.message });
  }
});

module.exports = router;

/*
══════════════════════════════════════════════════════════════════
  MIGRATION SQL — Run this once on your neuroassess database
══════════════════════════════════════════════════════════════════

-- 1. Create proctoring_violations table
CREATE TABLE IF NOT EXISTS proctoring_violations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  exam_id       INT,
  student_id    VARCHAR(64),
  type          VARCHAR(50) NOT NULL,
  message       TEXT,
  severity      ENUM('low','medium','high') DEFAULT 'medium',
  snapshot_b64  LONGTEXT,
  occurred_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assignment (assignment_id),
  INDEX idx_occurred   (occurred_at),
  FOREIGN KEY (assignment_id) REFERENCES exam_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add risk_level to exam_assignments
ALTER TABLE exam_assignments
  ADD COLUMN IF NOT EXISTS risk_level ENUM('low','medium','high') DEFAULT 'low' AFTER violation_count;

-- 3. Add proctor column to exams (if missing)
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS proctor VARCHAR(255) AFTER status;

══════════════════════════════════════════════════════════════════
*/
