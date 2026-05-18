

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

function safeJSON(v, fb = []) {
  if (!v) return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

// ── GET /api/monitoring/completed-exams ───────────────────────────
router.get('/completed-exams', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        e.id          AS exam_id,
        e.title       AS exam_name,
        e.exam_type,
        e.college,
        e.total_marks,
        COUNT(DISTINCT ea.student_id)                              AS total_students,
        SUM(ea.status IN ('submitted','completed'))                 AS submitted_count,
        SUM(ea.status = 'started')                                  AS in_progress_count,
        COALESCE(SUM(pv_agg.viol_count), 0)                        AS total_violations,
        COALESCE(SUM(pv_agg.high_count), 0)                        AS high_violations,
        MAX(ea.submitted_at)                                        AS last_submission
      FROM exams e
      JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN (
        SELECT exam_id, COUNT(*) AS viol_count, SUM(severity='high') AS high_count
        FROM proctoring_violations GROUP BY exam_id
      ) pv_agg ON pv_agg.exam_id = e.id
      GROUP BY e.id
      HAVING submitted_count > 0
      ORDER BY last_submission DESC
    `);
    res.json({ exams: rows });
  } catch(e) {
    console.error('[monitoring/completed-exams]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/monitoring/exam/:examId/students ─────────────────────
router.get('/exam/:examId/students', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id           AS student_id,
        c.name         AS student_name,
        c.email,
        ea.id          AS assignment_id,
        ea.status      AS assignment_status,
        ea.score,
        ea.submitted_at,
        ea.answers,
        e.total_marks,
        e.title        AS exam_title,
        e.exam_type,
        COALESCE(vc.total_violations, 0) AS total_violations,
        COALESCE(vc.high_count, 0)       AS high_violations,
        gs.trust_score,
        gs.risk_level,
        gs.flag_count                    AS geo_flags,
        gs.location_violation
      FROM exam_assignments ea
      JOIN candidates c ON c.id = ea.student_id
      JOIN exams e      ON e.id = ea.exam_id
      LEFT JOIN (
        SELECT assignment_id, COUNT(*) AS total_violations, SUM(severity='high') AS high_count
        FROM proctoring_violations GROUP BY assignment_id
      ) vc ON vc.assignment_id = ea.id
      LEFT JOIN geo_sessions gs ON gs.candidate_id = c.id AND gs.exam_id = ea.exam_id
      WHERE ea.exam_id = ?
      ORDER BY ea.submitted_at DESC, c.name ASC
    `, [req.params.examId]);

    res.json({
      exam_id: req.params.examId,
      students: rows.map(r => {
        const answers = safeJSON(r.answers, {});
        const mcqAnswers = answers.mcq_answers || answers;
        return {
          student_id:        r.student_id,
          student_name:      r.student_name || '—',
          email:             r.email || '—',
          assignment_id:     r.assignment_id,
          assignment_status: r.assignment_status,
          score:             r.score,
          total_marks:       r.total_marks,
          submitted_at:      r.submitted_at,
          total_violations:  r.total_violations,
          high_violations:   r.high_violations,
          risk_level:        r.risk_level || 'low',
          trust_score:       r.trust_score,
          location_violation:r.location_violation,
        };
      }),
    });
  } catch(e) {
    console.error('[monitoring/exam-students]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/monitoring/student/:assignmentId/violations ──────────
router.get('/student/:assignmentId/violations', async (req, res) => {
  try {
    const aid = req.params.assignmentId;

    const [proctoring] = await db.query(`
      SELECT id, type, message, severity, occurred_at,
             snapshot_b64 IS NOT NULL AS has_snapshot
      FROM proctoring_violations WHERE assignment_id = ?
      ORDER BY occurred_at ASC
    `, [aid]).catch(() => [[]]);

    const [assignment] = await db.query(`
      SELECT ea.student_id, ea.exam_id FROM exam_assignments ea WHERE ea.id = ? LIMIT 1
    `, [aid]).catch(() => [[]]);

    const aRow = assignment[0] || {};

    const [geo] = await db.query(`
      SELECT gp.id, gp.lat, gp.lng, gp.trust_score, gp.risk_level,
             gp.events, gp.pinged_at AS occurred_at
      FROM geo_pings gp
      JOIN geo_sessions gs ON gs.session_id = gp.session_id
      WHERE gs.candidate_id = ? AND gs.exam_id = ?
        AND (gp.risk_level = 'high' OR JSON_LENGTH(gp.events) > 0)
      ORDER BY gp.pinged_at ASC LIMIT 50
    `, [aRow.student_id, aRow.exam_id]).catch(() => [[]]);

    const [ai] = await db.query(`
      SELECT * FROM ai_detection_reports
      WHERE student_id = ? AND exam_id = ? LIMIT 1
    `, [aRow.student_id, aRow.exam_id]).catch(() => [[]]);

    const [plag] = await db.query(`
      SELECT * FROM plagiarism_reports
      WHERE student_id = ? AND exam_id = ? LIMIT 1
    `, [aRow.student_id, aRow.exam_id]).catch(() => [[]]);

    const [[{ snap_count }]] = await db.query(`
      SELECT COUNT(*) AS snap_count FROM code_snapshots
      WHERE student_id = ? AND exam_id = ?
    `, [aRow.student_id, aRow.exam_id]).catch(() => [[{ snap_count: 0 }]]);

    res.json({
      assignment_id: aid,
      proctoring: proctoring,
      geo: (geo || []).map(g => ({ ...g, events: safeJSON(g.events, []) })),
      ai_detection: ai[0] ? { ...ai[0], signals: safeJSON(ai[0].signals, []) } : null,
      plagiarism:   plag[0] || null,
      code_snap_count: snap_count,
    });
  } catch(e) {
    console.error('[monitoring/violations]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;