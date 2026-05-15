/**
 * geo.js — NeuroAssess Geolocation Backend Routes  (v2 — Live Monitoring fix)
 *
 * Changes from v1:
 *   ✅ session/start now stores student_name, roll_number, exam_name in geo_sessions
 *   ✅ location/ping now updates location_changed flag when student moves > 50m
 *   ✅ Per-exam geofencing: reads exams.geofence_lat/lng/radius from DB
 *   ✅ /admin/sessions returns student_name, roll_number, exam_name from stored columns
 *      (with JOIN fallback for old rows that don't have them yet)
 *
 * Mount in server.js as:  app.use('/api', require('./routes/geo'));
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// ── Geofencing config ─────────────────────────────────────────────────────────
// Set GEOFENCE_CENTER to override per-exam geofencing for all exams.
// Leave null to use per-exam geofence_lat/lng/radius from the exams table.
const GEOFENCE_CENTER = null;
const GEOFENCE_RADIUS = 500;
const LOCATION_VIOLATION_THRESHOLD_METERS = 500;
const LOCATION_CHANGED_THRESHOLD_METERS   = 50; // marks location_changed = 1

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

  console.log('[GEO] Session start payload:', req.body);

  if (!candidateId || !examId)  return res.status(400).json({ error: 'candidateId and examId are required' });
  if (!consentGiven)            return res.status(403).json({ error: 'Consent not given' });
  if (initialLat === undefined || initialLng === undefined)
    return res.status(400).json({ error: 'lat/lng required to start session' });

  try {
    // Reuse active session if exists
    const [existing] = await db.query(
      `SELECT session_id FROM geo_sessions WHERE candidate_id=? AND exam_id=? AND status='active' LIMIT 1`,
      [candidateId, examId]
    );
    if (existing.length > 0) return res.json({ sessionId: existing[0].session_id });

    // End any other active sessions for this candidate
    await db.query(
      `UPDATE geo_sessions SET status='completed' WHERE candidate_id=? AND status='active'`,
      [candidateId]
    );

    // Fetch student name + roll_number from candidates table
    let studentName = null, rollNumber = null;
    try {
      const [cRows] = await db.query(
        `SELECT name, id FROM candidates WHERE id = ? LIMIT 1`,
        [candidateId]
      );
      if (cRows.length) { studentName = cRows[0].name; rollNumber = cRows[0].id; }
    } catch (e) { console.warn('[GEO] candidate lookup skipped:', e.message); }

    // Fetch exam name + per-exam geofence from exams table
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
      [
        sessionId, candidateId, examId, examType || 'hiring', examName,
        studentName, rollNumber,
        initialLat, initialLng, initialLat, initialLng,
      ]
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
    const [rows] = await db.query(
      `SELECT gs.*, e.geofence_lat, e.geofence_lng, e.geofence_radius
       FROM geo_sessions gs
       LEFT JOIN exams e ON e.id = gs.exam_id
       WHERE gs.session_id = ?`,
      [sessionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = rows[0];
    if (session.status === 'terminated') return res.status(403).json({ error: 'Session terminated' });

    // Per-exam geofence (falls back to global)
    const geofenceCenter = (session.geofence_lat && session.geofence_lng)
      ? { lat: parseFloat(session.geofence_lat), lng: parseFloat(session.geofence_lng) }
      : GEOFENCE_CENTER;
    const geofenceRadius = session.geofence_radius || GEOFENCE_RADIUS;

    const initialLat  = session.initial_lat  ?? session.last_lat;
    const initialLng  = session.initial_lng  ?? session.last_lng;
    const hasInitial  = initialLat !== null && initialLng !== null;
    const distFromStart = hasInitial ? haversineMetres(initialLat, initialLng, lat, lng) : 0;
    const locationViolation = hasInitial && distFromStart > LOCATION_VIOLATION_THRESHOLD_METERS;

    // location_changed: student moved > 50m from their last known position
    const distFromLast = (session.last_lat && session.last_lng)
      ? haversineMetres(session.last_lat, session.last_lng, lat, lng)
      : 0;
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
      eventsAll.push({ type: 'LOCATION VIOLATION', message: 'Student moved outside allowed exam zone', severity: 'high' });
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

    // Log to geo_pings
    await db.query(
      `INSERT INTO geo_pings (session_id, lat, lng, accuracy, trust_score, risk_level, events)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, lat, lng, accuracy || null, finalTrust, finalRisk, JSON.stringify(eventsAll)]
    ).catch(e => console.warn('[GEO] geo_pings insert skipped:', e.message));

    // Log location violation as proctoring violation
    if (locationViolation) {
      await db.query(
        `INSERT INTO proctoring_violations
           (assignment_id, exam_id, student_id, type, message, severity, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [null, session.exam_id || null, session.candidate_id,
         'LOCATION_VIOLATION', 'Student moved outside allowed exam zone', 'high']
      ).catch(() => {});
    }

    console.log(`[GEO] Ping — trust:${finalTrust} risk:${finalRisk} violation:${locationViolation} changed:${locationChanged}`);

    res.json({
      trustScore:      finalTrust,
      riskLevel:       finalRisk,
      locationViolation,
      locationChanged: locationChanged === 1,
      distance:        Math.round(distFromStart),
      thresholdMeters: LOCATION_VIOLATION_THRESHOLD_METERS,
      alerts:          eventsAll,
    });

  } catch (err) {
    console.error('[GEO] ping error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── GET /api/admin/sessions ───────────────────────────────────────────────────
router.get('/admin/sessions', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         gs.session_id,
         gs.candidate_id,
         COALESCE(gs.student_name, c.name, gs.candidate_id)    AS student_name,
         COALESCE(gs.roll_number,  c.id,   gs.candidate_id)    AS roll_number,
         COALESCE(gs.exam_name,    e.title, gs.exam_type)       AS exam_name,
         gs.last_lat                                            AS lat,
         gs.last_lng                                            AS lng,
         gs.last_accuracy,
         gs.last_ping,
         gs.exam_id,
         CASE
           WHEN e.exam_type = 'placement'  THEN 'hiring'
           WHEN e.exam_type = 'university' THEN 'university'
           WHEN e.exam_type = 'skill_cert' THEN 'certification'
           ELSE COALESCE(gs.exam_type, e.exam_type, 'hiring')
         END                                                    AS exam_type,
         gs.initial_lat,
         gs.initial_lng,
         COALESCE(gs.location_violation, 0) = 1                AS location_violation,
         COALESCE(gs.location_changed,   0) = 1                AS location_changed,
         gs.risk_level,
         gs.flag_count                                          AS violation_count,
         gs.status,
         gs.trust_score
       FROM geo_sessions gs
       LEFT JOIN candidates c ON c.id = gs.candidate_id
       LEFT JOIN exams e      ON e.id = gs.exam_id
       WHERE gs.status IN ('active', 'escalated')
         AND gs.last_lat IS NOT NULL
         AND gs.last_lng IS NOT NULL
         AND (gs.last_ping IS NULL OR gs.last_ping > NOW() - INTERVAL 60 MINUTE)
       ORDER BY gs.last_ping DESC`
    );

    console.log('[GEO] Active sessions found:', rows.length);
    res.json({ sessions: rows });
  } catch (err) {
    console.error('[GEO] sessions error:', err.message, err.stack);
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

// ── GET /api/admin/sessions/:sessionId ───────────────────────────────────────
router.get('/admin/sessions/:sessionId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM geo_sessions WHERE session_id=?`,
      [req.params.sessionId]
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

// ── POST /api/session/:sessionId/terminate ────────────────────────────────────
router.post('/session/:sessionId/terminate', async (req, res) => {
  try {
    await db.query(
      `UPDATE geo_sessions SET status='terminated' WHERE session_id=?`,
      [req.params.sessionId]
    );
    console.log(`[GEO] Session terminated: ${req.params.sessionId}`);
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
    console.log(`[GEO] Session completed: ${req.params.sessionId}`);
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
      FROM geo_sessions
      WHERE status IN ('active', 'escalated')
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
