// backend/routes/proctoring.js
// CRASH-PROOF VERSION
// ✅ Works even if geo_sessions table doesn't exist yet
// ✅ Shows ALL assigned students when clicking an exam
// ✅ Hiring / University / Certification tabs all work
// ✅ Real student names from candidates.name
// ✅ Real-time: 15s polling on frontend

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ── Helper: check if geo_sessions table exists ────────────────────────────────
let geoTableExists = null; // cached after first check
async function hasGeoTable() {
  if (geoTableExists !== null) return geoTableExists;
  try {
    await db.query(`SELECT 1 FROM geo_sessions LIMIT 1`);
    geoTableExists = true;
  } catch (e) {
    geoTableExists = false;
  }
  return geoTableExists;
}

// ── POST /api/proctoring/violation ───────────────────────────────────────────
router.post('/violation', authenticateToken, async (req, res) => {
  const { assignment_id, exam_id, type, message, severity = 'medium', snapshot = null, timestamp } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  try {
    const studentId = req.user?.id || req.user?.student_id || null;
    const [result] = await db.query(
      `INSERT INTO proctoring_violations
         (assignment_id, exam_id, student_id, type, message, severity, snapshot_b64, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [assignment_id || null, exam_id || null, studentId,
       type, message || '', severity, snapshot || null,
       timestamp ? new Date(timestamp) : new Date()]
    );
    let riskLevel = 'low';
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt, SUM(severity='high') AS high_cnt FROM proctoring_violations WHERE assignment_id=?`,
      [assignment_id]
    );
    if (rows[0]) {
      const cnt = parseInt(rows[0].cnt) || 0, high = parseInt(rows[0].high_cnt) || 0;
      if (high >= 3 || cnt >= 8) riskLevel = 'high';
      else if (high >= 1 || cnt >= 3) riskLevel = 'medium';
    }
    await db.query(`UPDATE exam_assignments SET risk_level=? WHERE id=?`, [riskLevel, assignment_id]).catch(() => {});
    res.json({ ok: true, violationId: result.insertId, riskLevel });
  } catch (err) {
    console.error('[proctoring] violation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/violations/:assignmentId ─────────────────────────────
router.get('/violations/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, type, message, severity, occurred_at,
              CASE WHEN snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END AS has_snapshot
       FROM proctoring_violations WHERE assignment_id=? ORDER BY occurred_at DESC`,
      [req.params.assignmentId]
    );
    res.json({ violations: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/proctoring/snapshot/:violationId ────────────────────────────────
router.get('/snapshot/:violationId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT snapshot_b64, type, message, severity, occurred_at FROM proctoring_violations WHERE id=?`,
      [req.params.violationId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ...rows[0], snapshot_b64: rows[0].snapshot_b64 || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/proctoring/admin/active-exams ───────────────────────────────────
router.get('/admin/active-exams', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });

  const geo = await hasGeoTable();

  try {
    // ── Hiring + Certification ────────────────────────────────────────────
    let hiringSQL, hiringExams;

    if (geo) {
      [hiringExams] = await db.query(`
        SELECT
          e.id AS exam_id, e.title AS exam_name,
          CASE WHEN e.exam_type='placement' THEN 'hiring'
               WHEN e.exam_type='skill_cert' THEN 'certification'
               ELSE LOWER(e.exam_type) END AS exam_type,
          e.proctor AS assigned_proctor,
          COUNT(DISTINCT ea.student_id) AS student_count,
          SUM(CASE WHEN COALESCE(gs.risk_level, ea.risk_level,'low')='high'   THEN 1 ELSE 0 END) AS high,
          SUM(CASE WHEN COALESCE(gs.risk_level, ea.risk_level,'low')='medium' THEN 1 ELSE 0 END) AS medium,
          SUM(CASE WHEN COALESCE(gs.risk_level, ea.risk_level,'low')='low'    THEN 1 ELSE 0 END) AS low,
          SUM(ea.status='started')   AS currently_taking,
          SUM(ea.status='assigned')  AS assigned_count,
          SUM(ea.status='submitted') AS submitted_count,
          MAX(COALESCE(ea.started_at, ea.assigned_at)) AS last_activity
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        LEFT JOIN geo_sessions gs ON gs.candidate_id=ea.student_id AND gs.exam_id=ea.exam_id AND gs.status='active'
        WHERE ea.status IN ('assigned','started') AND e.exam_type != 'university'
        GROUP BY e.id, e.title, e.exam_type, e.proctor
        ORDER BY currently_taking DESC, last_activity DESC
      `);
    } else {
      // No geo_sessions table — simpler query
      [hiringExams] = await db.query(`
        SELECT
          e.id AS exam_id, e.title AS exam_name,
          CASE WHEN e.exam_type='placement' THEN 'hiring'
               WHEN e.exam_type='skill_cert' THEN 'certification'
               ELSE LOWER(e.exam_type) END AS exam_type,
          e.proctor AS assigned_proctor,
          COUNT(DISTINCT ea.student_id) AS student_count,
          SUM(ea.risk_level='high')   AS high,
          SUM(ea.risk_level='medium') AS medium,
          SUM(ea.risk_level='low')    AS low,
          SUM(ea.status='started')   AS currently_taking,
          SUM(ea.status='assigned')  AS assigned_count,
          SUM(ea.status='submitted') AS submitted_count,
          MAX(COALESCE(ea.started_at, ea.assigned_at)) AS last_activity
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        WHERE ea.status IN ('assigned','started') AND e.exam_type != 'university'
        GROUP BY e.id, e.title, e.exam_type, e.proctor
        ORDER BY currently_taking DESC, last_activity DESC
      `);
    }

    // ── University ────────────────────────────────────────────────────────
    let universityExams = [];
    try {
      if (geo) {
        const [uRows] = await db.query(`
          SELECT
            e.id AS exam_id, e.title AS exam_name, 'university' AS exam_type,
            e.proctor AS assigned_proctor,
            COUNT(DISTINCT uea.student_id) AS student_count,
            SUM(COALESCE(gs.risk_level,'low')='high')   AS high,
            SUM(COALESCE(gs.risk_level,'low')='medium') AS medium,
            SUM(COALESCE(gs.risk_level,'low')='low')    AS low,
            SUM(uea.status='started')   AS currently_taking,
            SUM(uea.status='assigned')  AS assigned_count,
            SUM(uea.status='completed') AS submitted_count,
            MAX(COALESCE(uea.started_at, uea.assigned_at)) AS last_activity
          FROM exam_assignments uea
          JOIN exams e ON e.id = uea.exam_id
          LEFT JOIN geo_sessions gs ON gs.candidate_id=uea.student_id AND gs.exam_id=uea.exam_id AND gs.status='active'
          WHERE uea.status IN ('assigned','started','completed')
          GROUP BY e.id, e.title, e.proctor
          ORDER BY currently_taking DESC, last_activity DESC
        `);
        universityExams = uRows;
      } else {
        const [uRows] = await db.query(`
          SELECT
            e.id AS exam_id, e.title AS exam_name, 'university' AS exam_type,
            e.proctor AS assigned_proctor,
            COUNT(DISTINCT uea.student_id) AS student_count,
            0 AS high, 0 AS medium, COUNT(*) AS low,
            SUM(uea.status='started')   AS currently_taking,
            SUM(uea.status='assigned')  AS assigned_count,
            SUM(uea.status='completed') AS submitted_count,
            MAX(COALESCE(uea.started_at, uea.assigned_at)) AS last_activity
          FROM exam_assignments uea
          JOIN exams e ON e.id = uea.exam_id
          WHERE uea.status IN ('assigned','started','completed')
          GROUP BY e.id, e.title, e.proctor
          ORDER BY currently_taking DESC, last_activity DESC
        `);
        universityExams = uRows;
      }
    } catch (e) { console.warn('[proctoring] university query skipped:', e.message); }

    // ── Geo-only (certification exams not in assignment tables) ──────────
    let geoOnly = [];
    if (geo) {
      try {
        const allIds = new Set([...hiringExams, ...universityExams].map(e => String(e.exam_id)));
        const [gRows] = await db.query(`
          SELECT
            gs.exam_id,
            COALESCE(e.title, gs.exam_name, CONCAT('Exam #', gs.exam_id)) AS exam_name,
            CASE WHEN e.exam_type='placement'  THEN 'hiring'
                 WHEN e.exam_type='skill_cert' THEN 'certification'
                 WHEN e.exam_type='university' THEN 'university'
                 ELSE COALESCE(LOWER(gs.exam_type),'hiring') END AS exam_type,
            NULL AS assigned_proctor,
            COUNT(DISTINCT gs.candidate_id) AS student_count,
            SUM(gs.risk_level='high')   AS high,
            SUM(gs.risk_level='medium') AS medium,
            SUM(gs.risk_level='low')    AS low,
            COUNT(*) AS currently_taking, 0 AS assigned_count, 0 AS submitted_count,
            MAX(gs.last_ping) AS last_activity
          FROM geo_sessions gs
          LEFT JOIN exams e ON e.id = gs.exam_id
          WHERE gs.status='active' AND gs.last_ping > NOW() - INTERVAL 60 MINUTE
          GROUP BY gs.exam_id, e.title, gs.exam_name, e.exam_type, gs.exam_type
        `);
        geoOnly = gRows.filter(e => !allIds.has(String(e.exam_id)));
      } catch (e) { console.warn('[proctoring] geo-only skipped:', e.message); }
    }

    const merged = [...hiringExams, ...universityExams, ...geoOnly];
    console.log(`[proctoring] active-exams: ${merged.length} (H/C:${hiringExams.length} U:${universityExams.length} geo:${geoOnly.length})`);
    res.json({ exams: merged });

  } catch (err) {
    console.error('[proctoring] active-exams error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/proctoring/admin/candidates/:examId ─────────────────────────────
// Shows ALL students assigned to exam with real names + live GPS if available
router.get('/admin/candidates/:examId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });

  const examId = req.params.examId;
  const geo = await hasGeoTable();

  try {
    // ── Step 1: Try hiring/certification (exam_assignments) ───────────────
    let candidates = [];

    if (geo) {
      const [rows] = await db.query(`
        SELECT
          ea.id                                                        AS assignment_id,
          ea.student_id,
          ea.status                                                    AS assignment_status,
          COALESCE(c.name, ea.student_id)                              AS student_name,
          c.id                                                         AS roll_number,
          c.college, c.branch AS department,
          gs.last_lat, gs.last_lng, gs.last_ping,
          COALESCE(gs.trust_score, 100)                                AS trust_score,
          COALESCE(gs.risk_level, ea.risk_level, 'low')                AS risk_level,
          COALESCE(gs.location_violation, 0)                           AS location_violation,
          COALESCE(gs.location_changed, 0)                             AS location_changed,
          COALESCE(gs.flag_count, 0)                                   AS flag_count,
          COALESCE(pv.violation_count, ea.violation_count, 0)          AS violation_count,
          COALESCE(pv.critical_violations, 0)                          AS critical_violations,
          gs.initial_lat, gs.initial_lng, gs.session_id,
          e.geofence_lat, e.geofence_lng,
          COALESCE(e.geofence_radius, 500)                             AS geofence_radius
        FROM exam_assignments ea
        LEFT JOIN candidates c ON c.id = ea.student_id
        LEFT JOIN geo_sessions gs
          ON gs.candidate_id = ea.student_id AND gs.exam_id = ea.exam_id AND gs.status = 'active'
        LEFT JOIN exams e ON e.id = ea.exam_id
        LEFT JOIN (
          SELECT assignment_id, COUNT(*) AS violation_count, SUM(severity='high') AS critical_violations
          FROM proctoring_violations GROUP BY assignment_id
        ) pv ON pv.assignment_id = ea.id
        WHERE ea.exam_id = ? AND ea.status IN ('assigned','started')
        ORDER BY ea.status='started' DESC,
                 FIELD(COALESCE(gs.risk_level, ea.risk_level,'low'),'high','medium','low')
      `, [examId]);
      candidates = rows;
    } else {
      // No geo_sessions — basic query without GPS
      const [rows] = await db.query(`
        SELECT
          ea.id                                               AS assignment_id,
          ea.student_id,
          ea.status                                           AS assignment_status,
          COALESCE(c.name, ea.student_id)                     AS student_name,
          c.id                                                AS roll_number,
          c.college, c.branch AS department,
          NULL AS last_lat, NULL AS last_lng, NULL AS last_ping,
          100 AS trust_score,
          COALESCE(ea.risk_level, 'low')                      AS risk_level,
          0 AS location_violation, 0 AS location_changed, 0 AS flag_count,
          COALESCE(pv.violation_count, ea.violation_count, 0) AS violation_count,
          COALESCE(pv.critical_violations, 0)                 AS critical_violations,
          NULL AS initial_lat, NULL AS initial_lng, NULL AS session_id,
          NULL AS geofence_lat, NULL AS geofence_lng, 500 AS geofence_radius
        FROM exam_assignments ea
        LEFT JOIN candidates c ON c.id = ea.student_id
        LEFT JOIN (
          SELECT assignment_id, COUNT(*) AS violation_count, SUM(severity='high') AS critical_violations
          FROM proctoring_violations GROUP BY assignment_id
        ) pv ON pv.assignment_id = ea.id
        WHERE ea.exam_id = ? AND ea.status IN ('assigned','started')
        ORDER BY ea.status='started' DESC
      `, [examId]);
      candidates = rows;
    }

    if (candidates.length > 0) {
      console.log(`[proctoring] candidates for exam ${examId}: ${candidates.length} found`);
      return res.json({ candidates });
    }

    // ── Step 2: Try exam_assignments ───────────────────────────
    try {
      let uRows;
      if (geo) {
        [uRows] = await db.query(`
          SELECT
            uea.id AS assignment_id, uea.student_id,
            uea.status AS assignment_status,
            COALESCE(c.name, uea.student_id) AS student_name,
            c.id AS roll_number,
            c.college, c.branch AS department,
            gs.last_lat, gs.last_lng, gs.last_ping,
            COALESCE(gs.trust_score, 100) AS trust_score,
            COALESCE(gs.risk_level,'low') AS risk_level,
            COALESCE(gs.location_violation,0) AS location_violation,
            COALESCE(gs.location_changed,0)   AS location_changed,
            COALESCE(gs.flag_count,0)         AS flag_count,
            0 AS violation_count, 0 AS critical_violations,
            gs.initial_lat, gs.initial_lng, gs.session_id,
            NULL AS geofence_lat, NULL AS geofence_lng, 500 AS geofence_radius
          FROM exam_assignments uea
          LEFT JOIN candidates c ON c.id = uea.student_id
          LEFT JOIN geo_sessions gs
            ON gs.candidate_id=uea.student_id AND gs.exam_id=uea.exam_id AND gs.status='active'
          WHERE uea.exam_id=? AND uea.status IN ('assigned','started','completed')
          ORDER BY uea.status='started' DESC
        `, [examId]);
      } else {
        [uRows] = await db.query(`
          SELECT
            uea.id AS assignment_id, uea.student_id,
            uea.status AS assignment_status,
            COALESCE(c.name, uea.student_id) AS student_name,
            c.id AS roll_number,
            c.college, c.branch AS department,
            NULL AS last_lat, NULL AS last_lng, NULL AS last_ping,
            100 AS trust_score, 'low' AS risk_level,
            0 AS location_violation, 0 AS location_changed, 0 AS flag_count,
            0 AS violation_count, 0 AS critical_violations,
            NULL AS initial_lat, NULL AS initial_lng, NULL AS session_id,
            NULL AS geofence_lat, NULL AS geofence_lng, 500 AS geofence_radius
          FROM exam_assignments uea
          LEFT JOIN candidates c ON c.id = uea.student_id
          WHERE uea.exam_id=? AND uea.status IN ('assigned','started','completed')
        `, [examId]);
      }
      if (uRows.length > 0) {
        console.log(`[proctoring] uni candidates for exam ${examId}: ${uRows.length}`);
        return res.json({ candidates: uRows });
      }
    } catch (e) {
      console.warn('[proctoring] university candidates failed:', e.message);
    }

    // ── Step 3: Try geo_sessions directly (certification / new exams) ─────
    if (geo) {
      const [geoRows] = await db.query(`
        SELECT
          NULL AS assignment_id,
          gs.candidate_id AS student_id,
          'started' AS assignment_status,
          COALESCE(c.name, gs.student_name, gs.candidate_id) AS student_name,
          COALESCE(gs.roll_number, c.id, gs.candidate_id)    AS roll_number,
          c.college, c.branch AS department,
          gs.last_lat, gs.last_lng, gs.last_ping,
          COALESCE(gs.trust_score, 100) AS trust_score,
          COALESCE(gs.risk_level,'low') AS risk_level,
          COALESCE(gs.location_violation,0) AS location_violation,
          COALESCE(gs.location_changed,0)   AS location_changed,
          COALESCE(gs.flag_count,0)         AS flag_count,
          0 AS violation_count, 0 AS critical_violations,
          gs.initial_lat, gs.initial_lng, gs.session_id,
          e.geofence_lat, e.geofence_lng,
          COALESCE(e.geofence_radius,500) AS geofence_radius
        FROM geo_sessions gs
        LEFT JOIN candidates c ON c.id = gs.candidate_id
        LEFT JOIN exams e ON e.id = gs.exam_id
        WHERE gs.exam_id=? AND gs.status='active'
          AND gs.last_ping > NOW() - INTERVAL 60 MINUTE
        ORDER BY FIELD(gs.risk_level,'high','medium','low')
      `, [examId]);
      if (geoRows.length > 0) {
        console.log(`[proctoring] geo candidates for exam ${examId}: ${geoRows.length}`);
        return res.json({ candidates: geoRows });
      }
    }

    console.log(`[proctoring] no candidates found for exam ${examId}`);
    res.json({ candidates: [] });

  } catch (err) {
    console.error('[proctoring] candidates error:', err.message, err.stack);
    res.status(500).json({ error: 'DB error: ' + err.message });
  }
});

// ── GET /api/proctoring/admin/alerts ─────────────────────────────────────────
router.get('/admin/alerts', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  const offset = parseInt(req.query.offset || '0');
  try {
    const [alerts] = await db.query(`
      SELECT
        pv.id AS violation_id,
        COALESCE(c.name, pv.student_id)   AS student_name,
        COALESCE(c.id,   pv.student_id)   AS roll_number,
        COALESCE(e.title,'Unknown Exam')  AS exam_name,
        pv.type, pv.severity, pv.message,
        pv.occurred_at AS time,
        pv.student_id, pv.assignment_id,
        CASE WHEN pv.snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END AS has_snapshot
      FROM proctoring_violations pv
      LEFT JOIN candidates c        ON c.id  = pv.student_id
      LEFT JOIN exam_assignments ea ON ea.id = pv.assignment_id
      LEFT JOIN exams e             ON e.id  = COALESCE(ea.exam_id, pv.exam_id)
      ORDER BY pv.occurred_at DESC LIMIT ? OFFSET ?
    `, [limit, offset]);
    res.json({ alerts });
  } catch (err) {
    console.error('[proctoring] alerts error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── POST /api/proctoring/admin/terminate/:assignmentId ───────────────────────
router.post('/admin/terminate/:assignmentId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });
  const { reason = 'Terminated by admin/proctor' } = req.body;
  try {
    await db.query(`UPDATE exam_assignments SET status='submitted' WHERE id=?`, [req.params.assignmentId]);
    await db.query(
      `INSERT INTO proctoring_violations (assignment_id,type,message,severity,occurred_at) VALUES (?,'TERMINATED',?,'high',NOW())`,
      [req.params.assignmentId, reason]
    ).catch(() => {});
    if (await hasGeoTable()) {
      await db.query(
        `UPDATE geo_sessions gs JOIN exam_assignments ea ON ea.student_id=gs.candidate_id AND ea.id=?
         SET gs.status='terminated' WHERE gs.status='active'`,
        [req.params.assignmentId]
      ).catch(() => {});
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/proctoring/admin/flag/:assignmentId ────────────────────────────
router.post('/admin/flag/:assignmentId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });
  const { reason = 'Flagged by admin' } = req.body;
  try {
    if (await hasGeoTable()) {
      await db.query(
        `UPDATE geo_sessions gs JOIN exam_assignments ea ON ea.student_id=gs.candidate_id AND ea.id=?
         SET gs.flag_count=COALESCE(gs.flag_count,0)+1 WHERE gs.status='active'`,
        [req.params.assignmentId]
      ).catch(() => {});
    }
    await db.query(
      `INSERT INTO proctoring_violations (assignment_id,type,message,severity,occurred_at) VALUES (?,'FLAGGED',?,'medium',NOW())`,
      [req.params.assignmentId, reason]
    ).catch(() => {});
    await db.query(
      `INSERT IGNORE INTO proctoring_flags (assignment_id,flagged_by,reason,flagged_at) VALUES (?,?,?,NOW())`,
      [req.params.assignmentId, req.user?.id || null, reason]
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/proctoring/admin/logs/:assignmentId ─────────────────────────────
router.get('/admin/logs/:assignmentId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const [logs] = await db.query(
      `SELECT id, type, message, severity, occurred_at,
              CASE WHEN snapshot_b64 IS NOT NULL THEN 1 ELSE 0 END AS has_snapshot
       FROM proctoring_violations WHERE assignment_id=? ORDER BY occurred_at DESC LIMIT 100`,
      [req.params.assignmentId]
    );
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/proctoring/admin/exam-attendance/:examId ────────────────────────
router.get('/admin/exam-attendance/:examId', authenticateToken, async (req, res) => {
  const role = req.user?.role || '';
  if (!['admin', 'proctor', 'recruiter'].includes(role))
    return res.status(403).json({ error: 'Forbidden' });

  const examId = req.params.examId;
  const geo = await hasGeoTable();

  try {
    let rows = [];

    // Try hiring
    if (geo) {
      [rows] = await db.query(`
        SELECT ea.student_id AS user_id,
               COALESCE(c.name, ea.student_id) AS name, COALESCE(c.email,'') AS email,
               ea.status, ea.assigned_at, ea.started_at, ea.submitted_at, ea.id AS assignment_id,
               gs.last_lat AS lat, gs.last_lng AS lng,
               COALESCE(gs.location_changed,0) AS location_changed, gs.last_ping
        FROM exam_assignments ea
        LEFT JOIN candidates c ON c.id=ea.student_id
        LEFT JOIN geo_sessions gs ON gs.candidate_id=ea.student_id AND gs.exam_id=ea.exam_id AND gs.status='active'
        WHERE ea.exam_id=?
        ORDER BY ea.status='started' DESC, ea.status='assigned' DESC, ea.assigned_at ASC
      `, [examId]);
    } else {
      [rows] = await db.query(`
        SELECT ea.student_id AS user_id,
               COALESCE(c.name, ea.student_id) AS name, COALESCE(c.email,'') AS email,
               ea.status, ea.assigned_at, ea.started_at, ea.submitted_at, ea.id AS assignment_id,
               NULL AS lat, NULL AS lng, 0 AS location_changed, NULL AS last_ping
        FROM exam_assignments ea
        LEFT JOIN candidates c ON c.id=ea.student_id
        WHERE ea.exam_id=?
        ORDER BY ea.status='started' DESC, ea.assigned_at ASC
      `, [examId]);
    }

    // Try university
    if (rows.length === 0) {
      try {
        if (geo) {
          [rows] = await db.query(`
            SELECT uea.student_id AS user_id,
                   COALESCE(c.name,uea.student_id) AS name, COALESCE(c.email,'') AS email,
                   uea.status, uea.assigned_at, uea.started_at, uea.submitted_at, uea.id AS assignment_id,
                   gs.last_lat AS lat, gs.last_lng AS lng,
                   COALESCE(gs.location_changed,0) AS location_changed, gs.last_ping
            FROM exam_assignments uea
            LEFT JOIN candidates c ON c.id=uea.student_id
            LEFT JOIN geo_sessions gs ON gs.candidate_id=uea.student_id AND gs.exam_id=uea.exam_id AND gs.status='active'
            WHERE uea.exam_id=? ORDER BY uea.assigned_at ASC
          `, [examId]);
        } else {
          [rows] = await db.query(`
            SELECT uea.student_id AS user_id,
                   COALESCE(c.name,uea.student_id) AS name, COALESCE(c.email,'') AS email,
                   uea.status, uea.assigned_at, uea.started_at, uea.submitted_at, uea.id AS assignment_id,
                   NULL AS lat, NULL AS lng, 0 AS location_changed, NULL AS last_ping
            FROM exam_assignments uea
            LEFT JOIN candidates c ON c.id=uea.student_id
            WHERE uea.exam_id=?
          `, [examId]);
        }
      } catch (e) { console.warn('[proctoring] uni attendance fallback:', e.message); }
    }

    // Try geo-only
    if (rows.length === 0 && geo) {
      const [geoRows] = await db.query(`
        SELECT gs.candidate_id AS user_id,
               COALESCE(c.name,gs.student_name,gs.candidate_id) AS name,
               COALESCE(c.email,'') AS email,
               'started' AS status, gs.created_at AS assigned_at, gs.created_at AS started_at,
               NULL AS submitted_at, NULL AS assignment_id,
               gs.last_lat AS lat, gs.last_lng AS lng,
               COALESCE(gs.location_changed,0) AS location_changed, gs.last_ping
        FROM geo_sessions gs
        LEFT JOIN candidates c ON c.id=gs.candidate_id
        WHERE gs.exam_id=? AND gs.status='active' AND gs.last_ping > NOW() - INTERVAL 60 MINUTE
      `, [examId]);
      rows = geoRows;
    }

    const now = Date.now();
    const TIMEOUT = 60000;
    const active = [], completed = [], notStarted = [];

    for (const row of rows) {
      const lastPing = row.last_ping ? new Date(row.last_ping).getTime() : null;
      const expired  = lastPing ? (now - lastPing > TIMEOUT) : true;
      if (row.status === 'submitted' || row.status === 'completed') {
        completed.push({ ...row, exit_reason: 'Submitted' });
      } else if (row.status === 'started' && expired) {
        completed.push({ ...row, exit_reason: 'Connection lost' });
      } else if (row.status === 'started') {
        active.push(row);
      } else {
        notStarted.push(row);
      }
    }

    res.json({ active, completed, notStarted });
  } catch (err) {
    console.error('[proctoring] attendance error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
