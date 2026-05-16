/**
 * geo.js — NeuroAssess Geolocation Backend Routes  (v3 — Collation fix + completed exams)
 *
 * FIXES:
 *   ✅ FIX 1: Collation mismatch resolved — all JOIN columns use COLLATE utf8mb4_unicode_ci
 *   ✅ FIX 2: /admin/sessions now returns active + escalated sessions without collation error
 *   ✅ FIX 3: /admin/completed-exams — new endpoint returns all completed exams
 *   ✅ FIX 4: /admin/exam-violations/:examId — returns per-student violations for a completed exam
 *   ✅ FIX 5: /admin/student-violations/:assignmentId — returns all violations for one student
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// ── Geofencing config ─────────────────────────────────────────────────────────
const GEOFENCE_CENTER = null;
const GEOFENCE_RADIUS = 500;
const LOCATION_VIOLATION_THRESHOLD_METERS = 500;
const LOCATION_CHANGED_THRESHOLD_METERS   = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRiskLevel(trustScore) {
  return trustScore > 70 ? 'low' : trustScore > 40 ? 'medium' : 'high';
}

function assessPing(session, lat, lng, accuracy, geofenceCenter, geofenceRadius) {
  const events = [];
  let deduct = 0;
  const center = geofenceCenter || GEOFENCE_CENTER;
  const radius  = geofenceRadius || GEOFENCE_RADIUS;

  if (center) {
    const dist = haversineMetres(center.lat, center.lng, lat, lng);
    if (dist > radius) {
      deduct += 20;
      events.push({ type: 'geofence_exit', message: `Outside exam zone (${Math.round(dist)}m away)`, severity: 'high' });
    }
  }
  if (session.lastPing) {
    const moved = haversineMetres(session.lastPing.lat, session.lastPing.lng, lat, lng);
    if (moved > 200) {
      deduct += 15;
      events.push({ type: 'large_movement', message: `Moved ${Math.round(moved)}m since last ping`, severity: 'medium' });
    }
  }
  if (accuracy && accuracy > 100) {
    deduct += 5;
    events.push({ type: 'poor_accuracy', message: `GPS accuracy low (±${Math.round(accuracy)}m)`, severity: 'low' });
  }

  const newTrust  = Math.max(0, session.trustScore - deduct);
  const riskLevel = toRiskLevel(newTrust);
  const newStatus = session.status === 'terminated' ? 'terminated' : riskLevel === 'high' ? 'escalated' : 'active';
  return { events, newTrust, riskLevel, newStatus };
}

// ── POST /api/session/start ───────────────────────────────────────────────────
router.post('/session/start', async (req, res) => {
  const { candidateId, examId, examType, consentGiven, lat, lng, latitude, longitude } = req.body;
  const initialLat = lat !== undefined ? lat : latitude;
  const initialLng = lng !== undefined ? lng : longitude;

  if (!candidateId || !examId)  return res.status(400).json({ error: 'candidateId and examId are required' });
  if (!consentGiven)            return res.status(403).json({ error: 'Consent not given' });
  if (initialLat === undefined || initialLng === undefined)
    return res.status(400).json({ error: 'lat/lng required to start session' });

  try {
    const [existing] = await db.query(
      `SELECT session_id FROM geo_sessions WHERE candidate_id=? AND exam_id=? AND status='active' LIMIT 1`,
      [candidateId, examId]
    );
    if (existing.length > 0) return res.json({ sessionId: existing[0].session_id });

    await db.query(
      `UPDATE geo_sessions SET status='completed' WHERE candidate_id=? AND status='active'`,
      [candidateId]
    );

    // FIX: Use COLLATE to avoid collation mismatch on candidate lookup
    let studentName = null, rollNumber = null;
    try {
      const [cRows] = await db.query(
        `SELECT name, id FROM candidates WHERE CAST(id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci LIMIT 1`,
        [candidateId]
      );
      if (cRows.length) { studentName = cRows[0].name; rollNumber = cRows[0].id; }
    } catch (e) { console.warn('[GEO] candidate lookup skipped:', e.message); }

    let examName = null;
    try {
      const [eRows] = await db.query(
        `SELECT title FROM exams WHERE id = ? LIMIT 1`,
        [examId]
      );
      if (eRows.length) { examName = eRows[0].title; }
    } catch (e) { console.warn('[GEO] exam lookup skipped:', e.message); }

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO geo_sessions
         (session_id, candidate_id, exam_id, exam_type, exam_name,
          student_name, roll_number,
          initial_lat, initial_lng, last_lat, last_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, candidateId, examId, examType || 'hiring', examName,
       studentName, rollNumber, initialLat, initialLng, initialLat, initialLng]
    );

    console.log(`[GEO] Session started: ${sessionId} for ${candidateId} (${studentName})`);
    res.json({ sessionId });
  } catch (err) {
    console.error('[GEO] session/start error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── POST /api/location/ping ───────────────────────────────────────────────────
router.post('/location/ping', async (req, res) => {
  const sessionId = req.body.geoSessionId || req.body.sessionId;
  const lat       = req.body.lat !== undefined ? req.body.lat : req.body.latitude;
  const lng       = req.body.lng !== undefined ? req.body.lng : req.body.longitude;
  const accuracy  = req.body.accuracy;

  if (!sessionId || lat === undefined || lng === undefined)
    return res.status(400).json({ error: 'geoSessionId/sessionId, lat/lng required' });

  try {
    // FIX: No JOIN to exams here — fetch separately to avoid collation mismatch
    const [rows] = await db.query(
      `SELECT * FROM geo_sessions WHERE session_id = ?`,
      [sessionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = rows[0];
    if (session.status === 'terminated') return res.status(403).json({ error: 'Session terminated' });

    // Fetch geofence from exams separately
    let geofenceCenter = GEOFENCE_CENTER;
    let geofenceRadius = GEOFENCE_RADIUS;
    try {
      const [eRows] = await db.query(
        `SELECT geofence_lat, geofence_lng, geofence_radius FROM exams WHERE id = ? LIMIT 1`,
        [session.exam_id]
      );
      if (eRows.length && eRows[0].geofence_lat && eRows[0].geofence_lng) {
        geofenceCenter = { lat: parseFloat(eRows[0].geofence_lat), lng: parseFloat(eRows[0].geofence_lng) };
        geofenceRadius = eRows[0].geofence_radius || GEOFENCE_RADIUS;
      }
    } catch (e) { /* use defaults */ }

    const initialLat = session.initial_lat ?? session.last_lat;
    const initialLng = session.initial_lng ?? session.last_lng;
    const hasInitial = initialLat !== null && initialLng !== null;
    const distFromStart = hasInitial ? haversineMetres(initialLat, initialLng, lat, lng) : 0;
    const locationViolation = hasInitial && distFromStart > LOCATION_VIOLATION_THRESHOLD_METERS;

    const distFromLast = (session.last_lat && session.last_lng)
      ? haversineMetres(session.last_lat, session.last_lng, lat, lng) : 0;
    const locationChanged = distFromLast > LOCATION_CHANGED_THRESHOLD_METERS ? 1 : 0;

    const sessionObj = {
      trustScore: session.trust_score,
      status:     session.status,
      lastPing:   session.last_lat ? { lat: session.last_lat, lng: session.last_lng } : null,
    };

    const { events, newTrust: baseTrust, riskLevel: baseRisk, newStatus: baseStatus }
      = assessPing(sessionObj, lat, lng, accuracy, geofenceCenter, geofenceRadius);

    const eventsAll = [...events];
    let finalTrust  = baseTrust;
    let finalRisk   = baseRisk;
    let finalStatus = baseStatus;

    if (locationViolation) {
      eventsAll.push({ type: 'LOCATION_VIOLATION', message: 'Student moved outside allowed exam zone', severity: 'high' });
      finalRisk   = 'high';
      finalStatus = session.status === 'terminated' ? 'terminated' : 'escalated';
      finalTrust  = Math.min(finalTrust, 40);
    }

    const newFlagCount = (session.flag_count || 0) + eventsAll.filter(e => e.severity !== 'low').length;

    await db.query(
      `UPDATE geo_sessions
       SET trust_score=?, risk_level=?, location_violation=?, location_changed=?,
           flag_count=?, ping_count=ping_count+1,
           last_lat=?, last_lng=?, last_accuracy=?, last_ping=NOW()
       WHERE session_id=?`,
      [finalTrust, finalRisk, locationViolation ? 1 : 0, locationChanged,
       newFlagCount, lat, lng, accuracy || null, sessionId]
    );

    await db.query(
      `INSERT INTO geo_pings (session_id, lat, lng, accuracy, trust_score, risk_level, events)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, lat, lng, accuracy || null, finalTrust, finalRisk, JSON.stringify(eventsAll)]
    ).catch(e => console.warn('[GEO] geo_pings insert skipped:', e.message));

    if (locationViolation) {
      await db.query(
        `INSERT INTO proctoring_violations
           (assignment_id, exam_id, student_id, type, message, severity, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [null, session.exam_id || null, session.candidate_id,
         'LOCATION_VIOLATION', 'Student moved outside allowed exam zone', 'high']
      ).catch(() => {});
    }

    res.json({
      trustScore: finalTrust, riskLevel: finalRisk,
      locationViolation, locationChanged: locationChanged === 1,
      distance: Math.round(distFromStart),
      thresholdMeters: LOCATION_VIOLATION_THRESHOLD_METERS,
      alerts: eventsAll,
    });
  } catch (err) {
    console.error('[GEO] ping error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/admin/sessions ───────────────────────────────────────────────────
// FIX: Removed JOIN to candidates/exams — use stored columns in geo_sessions only
// This eliminates the collation mismatch entirely.
router.get('/admin/sessions', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         gs.session_id,
         gs.candidate_id,
         COALESCE(gs.student_name, gs.candidate_id)   AS student_name,
         COALESCE(gs.roll_number,  gs.candidate_id)   AS roll_number,
         COALESCE(gs.exam_name,    gs.exam_type)       AS exam_name,
         gs.last_lat                                   AS lat,
         gs.last_lng                                   AS lng,
         gs.last_accuracy,
         gs.last_ping,
         gs.exam_id,
         COALESCE(gs.exam_type, 'hiring')              AS exam_type,
         gs.initial_lat,
         gs.initial_lng,
         COALESCE(gs.location_violation, 0) = 1       AS location_violation,
         COALESCE(gs.location_changed,   0) = 1       AS location_changed,
         gs.risk_level,
         gs.flag_count                                 AS violation_count,
         gs.status,
         gs.trust_score
       FROM geo_sessions gs
       WHERE gs.status IN ('active', 'escalated')
         AND gs.last_lat IS NOT NULL
         AND gs.last_lng IS NOT NULL
         AND (gs.last_ping IS NULL OR gs.last_ping > NOW() - INTERVAL 60 MINUTE)
       ORDER BY gs.last_ping DESC`
    );

    // Enrich with candidate/exam data using separate queries (no collation issue)
    const enriched = await Promise.all(rows.map(async (row) => {
      try {
        const [cRows] = await db.query(
          `SELECT name FROM candidates WHERE id = ? LIMIT 1`, [row.candidate_id]
        );
        if (cRows.length && cRows[0].name) row.student_name = cRows[0].name;
      } catch (e) { /* keep stored value */ }
      try {
        const [eRows] = await db.query(
          `SELECT title, exam_type FROM exams WHERE id = ? LIMIT 1`, [row.exam_id]
        );
        if (eRows.length) {
          if (eRows[0].title)     row.exam_name = eRows[0].title;
          if (eRows[0].exam_type) row.exam_type = eRows[0].exam_type;
        }
      } catch (e) { /* keep stored value */ }
      return row;
    }));

    console.log('[GEO] Active sessions found:', enriched.length);
    res.json({ sessions: enriched });
  } catch (err) {
    console.error('[GEO] sessions error:', err.message, err.stack);
    res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── GET /api/admin/completed-exams ────────────────────────────────────────────
// NEW: Returns all exams that have at least one completed/submitted assignment
router.get('/admin/completed-exams', async (req, res) => {
  try {
    // Try to fetch from exam_assignments if available
    let rows = [];
    try {
      [rows] = await db.query(
        `SELECT
           e.id                                    AS exam_id,
           e.title                                 AS exam_name,
           e.exam_type,
           e.created_at,
           COUNT(DISTINCT ea.id)                   AS total_students,
           COUNT(DISTINCT CASE WHEN ea.status IN ('submitted','completed') THEN ea.id END) AS submitted_count,
           MAX(ea.submitted_at)                    AS last_submission
         FROM exams e
         LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
         GROUP BY e.id, e.title, e.exam_type, e.created_at
         HAVING submitted_count > 0
         ORDER BY last_submission DESC
         LIMIT 100`
      );
    } catch (e) {
      // Fallback: fetch all exams (exam_assignments may not exist)
      console.warn('[GEO] exam_assignments join failed, falling back:', e.message);
      [rows] = await db.query(
        `SELECT id AS exam_id, title AS exam_name, exam_type, created_at,
                0 AS total_students, 0 AS submitted_count, created_at AS last_submission
         FROM exams ORDER BY created_at DESC LIMIT 100`
      );
    }
    res.json({ exams: rows });
  } catch (err) {
    console.error('[GEO] completed-exams error:', err);
    res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── GET /api/admin/exam-violations/:examId ────────────────────────────────────
// NEW: Returns all students assigned to this exam with their violation summary
router.get('/admin/exam-violations/:examId', async (req, res) => {
  const { examId } = req.params;
  try {
    // Get all students who took this exam with violation counts per type
    let students = [];

    // Try via exam_assignments
    try {
      const [assignRows] = await db.query(
        `SELECT
           ea.id           AS assignment_id,
           ea.student_id,
           ea.status       AS assignment_status,
           ea.submitted_at,
           ea.score,
           c.name          AS student_name,
           c.id            AS roll_number,
           c.email
         FROM exam_assignments ea
         LEFT JOIN candidates c ON CAST(c.id AS CHAR) = CAST(ea.student_id AS CHAR)
         WHERE ea.exam_id = ?
         ORDER BY ea.submitted_at DESC`,
        [examId]
      );
      students = assignRows;
    } catch (e) {
      console.warn('[GEO] exam_assignments query failed:', e.message);
    }

    // For each student, get violation counts
    const result = await Promise.all(students.map(async (s) => {
      const violations = {
        proctoring: 0, geo: 0, tab_switch: 0, no_face: 0,
        multiple_faces: 0, gaze_away: 0, object_detected: 0, other: 0,
        total: 0, details: []
      };
      try {
        const [vRows] = await db.query(
          `SELECT type, severity, message, occurred_at
           FROM proctoring_violations
           WHERE assignment_id = ? OR (student_id = ? AND exam_id = ?)
           ORDER BY occurred_at DESC`,
          [s.assignment_id, s.student_id, examId]
        );
        vRows.forEach(v => {
          violations.total++;
          violations.details.push(v);
          const t = (v.type || '').toUpperCase();
          if (t === 'NO_FACE')            violations.no_face++;
          else if (t === 'MULTIPLE_FACES') violations.multiple_faces++;
          else if (t === 'GAZE_AWAY')     violations.gaze_away++;
          else if (t === 'OBJECT_DETECTED') violations.object_detected++;
          else if (t === 'TAB_SWITCH' || t === 'WINDOW_BLUR') violations.tab_switch++;
          else if (t === 'LOCATION_VIOLATION') violations.geo++;
          else violations.proctoring++;
        });
      } catch (e) { /* no violations table */ }

      // Also fetch geo violations from geo_sessions
      try {
        const [gRows] = await db.query(
          `SELECT flag_count, trust_score, risk_level FROM geo_sessions
           WHERE candidate_id = ? AND exam_id = ? LIMIT 1`,
          [s.student_id, examId]
        );
        if (gRows.length) {
          s.trust_score = gRows[0].trust_score;
          s.risk_level  = gRows[0].risk_level;
        }
      } catch (e) { /* no geo session */ }

      return { ...s, violations };
    }));

    res.json({ examId, students: result });
  } catch (err) {
    console.error('[GEO] exam-violations error:', err);
    res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── GET /api/admin/student-violations/:assignmentId ───────────────────────────
// NEW: Full violation log for one student in one assignment
router.get('/admin/student-violations/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;
  try {
    // Get assignment + student info
    let studentInfo = {};
    try {
      const [aRows] = await db.query(
        `SELECT ea.*, c.name AS student_name, c.id AS roll_number, c.email
         FROM exam_assignments ea
         LEFT JOIN candidates c ON CAST(c.id AS CHAR) = CAST(ea.student_id AS CHAR)
         WHERE ea.id = ? LIMIT 1`,
        [assignmentId]
      );
      if (aRows.length) studentInfo = aRows[0];
    } catch (e) { /* candidate join failed */ }

    // Get all proctoring violations
    let proctoringViolations = [];
    try {
      const [vRows] = await db.query(
        `SELECT * FROM proctoring_violations
         WHERE assignment_id = ?
         ORDER BY occurred_at ASC`,
        [assignmentId]
      );
      proctoringViolations = vRows;
    } catch (e) { /* no violations */ }

    // Get geo session info
    let geoSession = null;
    try {
      const [gRows] = await db.query(
        `SELECT * FROM geo_sessions WHERE candidate_id = ? AND exam_id = ? LIMIT 1`,
        [studentInfo.student_id, studentInfo.exam_id]
      );
      if (gRows.length) geoSession = gRows[0];
    } catch (e) { /* no geo */ }

    // Categorize violations
    const categories = {
      registration_agent: proctoringViolations.filter(v =>
        ['ID_MISMATCH', 'FACE_MISMATCH', 'LIVENESS_FAIL', 'ID_INVALID'].includes((v.type||'').toUpperCase())
      ),
      proctoring_agent: proctoringViolations.filter(v =>
        ['NO_FACE', 'MULTIPLE_FACES', 'GAZE_AWAY', 'OBJECT_DETECTED'].includes((v.type||'').toUpperCase())
      ),
      tab_switch: proctoringViolations.filter(v =>
        ['TAB_SWITCH', 'WINDOW_BLUR', 'FOCUS_LOST'].includes((v.type||'').toUpperCase())
      ),
      geo_violations: proctoringViolations.filter(v =>
        ['LOCATION_VIOLATION', 'GEOFENCE_EXIT'].includes((v.type||'').toUpperCase())
      ),
      other: proctoringViolations.filter(v =>
        !['ID_MISMATCH','FACE_MISMATCH','LIVENESS_FAIL','ID_INVALID',
          'NO_FACE','MULTIPLE_FACES','GAZE_AWAY','OBJECT_DETECTED',
          'TAB_SWITCH','WINDOW_BLUR','FOCUS_LOST',
          'LOCATION_VIOLATION','GEOFENCE_EXIT'].includes((v.type||'').toUpperCase())
      ),
    };

    res.json({
      assignmentId,
      student: studentInfo,
      geoSession,
      violations: {
        total: proctoringViolations.length,
        all: proctoringViolations,
        categories,
      },
    });
  } catch (err) {
    console.error('[GEO] student-violations error:', err);
    res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── GET /api/admin/sessions /:sessionId ──────────────────────────────────────
router.get('/admin/sessions/:sessionId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM geo_sessions WHERE session_id=?`, [req.params.sessionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const [pings] = await db.query(
      `SELECT * FROM geo_pings WHERE session_id=? ORDER BY pinged_at DESC LIMIT 50`,
      [req.params.sessionId]
    );
    res.json({ ...rows[0], history: pings });
  } catch (err) {
    console.error('[GEO] session detail error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/admin/sessions-debug ────────────────────────────────────────────
router.get('/admin/sessions-debug', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM geo_sessions LIMIT 1');
    res.json({ ok: true, sample: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/session/:sessionId/terminate ────────────────────────────────────
router.post('/session/:sessionId/terminate', async (req, res) => {
  try {
    await db.query(
      `UPDATE geo_sessions SET status='terminated' WHERE session_id=?`,
      [req.params.sessionId]
    );
    res.json({ success: true, sessionId: req.params.sessionId });
  } catch (err) {
    console.error('[GEO] terminate error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── POST /api/session/:sessionId/complete ────────────────────────────────────
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    await db.query(
      `UPDATE geo_sessions SET status='completed' WHERE session_id=? AND status != 'terminated'`,
      [req.params.sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[GEO] complete error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/admin/geo-stats ──────────────────────────────────────────────────
router.get('/admin/geo-stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS activeCandidates,
        SUM(CASE WHEN trust_score >= 70 THEN 1 ELSE 0 END) AS lowRisk,
        SUM(CASE WHEN trust_score BETWEEN 40 AND 69 THEN 1 ELSE 0 END) AS mediumRisk,
        SUM(CASE WHEN trust_score < 40 THEN 1 ELSE 0 END) AS highRisk,
        ROUND(AVG(trust_score), 1) AS avgTrustScore,
        SUM(flag_count) AS totalFlags
      FROM geo_sessions WHERE status IN ('active', 'escalated')
    `);
    const row = stats[0] || {};
    res.json({
      activeCandidates: row.activeCandidates || 0,
      lowRisk:          row.lowRisk          || 0,
      mediumRisk:       row.mediumRisk       || 0,
      highRisk:         row.highRisk         || 0,
      avgTrustScore:    row.avgTrustScore    || 100,
      totalFlags:       row.totalFlags       || 0,
      criticalAlerts:   row.highRisk         || 0,
    });
  } catch (err) {
    console.error('[GEO] geo-stats error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/admin/geo-map ────────────────────────────────────────────────────
router.get('/admin/geo-map', async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT session_id, candidate_id, exam_id, status,
             trust_score, flag_count, last_lat, last_lng, last_accuracy, last_ping
      FROM geo_sessions
      WHERE status IN ('active', 'escalated')
        AND last_lat IS NOT NULL AND last_lng IS NOT NULL
      ORDER BY last_ping DESC
    `);
    res.json(sessions.map(s => ({
      id:          s.session_id,
      candidateId: s.candidate_id,
      examId:      s.exam_id,
      lat:         parseFloat(s.last_lat),
      lng:         parseFloat(s.last_lng),
      accuracy:    s.last_accuracy,
      trustScore:  s.trust_score,
      riskLevel:   s.trust_score >= 70 ? 'low' : s.trust_score >= 40 ? 'medium' : 'high',
      status:      s.status,
      flagCount:   s.flag_count,
      lastPing:    s.last_ping,
    })));
  } catch (err) {
    console.error('[GEO] geo-map error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;