/**
 * geo.js  — NeuroAssess Geolocation Backend Routes
 * Mount in server.js as:  app.use('/api', require('./routes/geo'));
 *
 * Endpoints:
 *   POST /api/session/start
 *   POST /api/location/ping
 *   GET  /api/admin/sessions
 *   GET  /api/admin/sessions/:sessionId
 *   POST /api/session/:sessionId/terminate
 *   POST /api/session/:sessionId/complete
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db'); // your existing db.js

/* ─────────────────────────────────────────────────────
   TRUST SCORE ENGINE
───────────────────────────────────────────────────── */

const GEOFENCE_CENTER = null;   // Set to { lat, lng } to enable geofencing
const GEOFENCE_RADIUS = 500;    // metres

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

function assessPing(session, lat, lng, accuracy) {
  const events = [];
  let deduct = 0;
  let geofenceOk = true;

  /* 1. Geofence check */
  if (GEOFENCE_CENTER) {
    const dist = haversineMetres(GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lng, lat, lng);
    if (dist > GEOFENCE_RADIUS) {
      deduct += 20;
      events.push({ type: 'geofence_exit', message: `Outside exam zone (${Math.round(dist)}m away)`, severity: 'high' });
      geofenceOk = false;
    }
  }

  /* 2. Large sudden movement */
  if (session.lastPing) {
    const moved = haversineMetres(session.lastPing.lat, session.lastPing.lng, lat, lng);
    if (moved > 200) {
      deduct += 15;
      events.push({ type: 'large_movement', message: `Moved ${Math.round(moved)}m since last ping`, severity: 'medium' });
    }
  }

  /* 3. Poor GPS accuracy */
  if (accuracy && accuracy > 100) {
    deduct += 5;
    events.push({ type: 'poor_accuracy', message: `GPS accuracy low (±${Math.round(accuracy)}m)`, severity: 'low' });
  }

  const newTrust   = Math.max(0, session.trustScore - deduct);
  const riskLevel  = newTrust > 70 ? 'low' : newTrust > 40 ? 'medium' : 'high';
  const newStatus  = session.status === 'terminated' ? 'terminated' : riskLevel === 'high' ? 'escalated' : 'active';

  return { events, newTrust, riskLevel, geofenceOk, newStatus };
}

/* ═══════════════════════════════════════════════════
   POST /api/session/start
═══════════════════════════════════════════════════ */
router.post('/session/start', async (req, res) => {
  const { candidateId, examId, consentGiven } = req.body;

  if (!candidateId || !examId) {
    return res.status(400).json({ error: 'candidateId and examId are required' });
  }
  if (!consentGiven) {
    return res.status(403).json({ error: 'Consent not given' });
  }

  try {
    // Reuse active session if exists
    const [existing] = await db.query(
      `SELECT session_id FROM geo_sessions WHERE candidate_id=? AND exam_id=? AND status='active' LIMIT 1`,
      [candidateId, examId]
    );

    if (existing.length > 0) {
      return res.json({ sessionId: existing[0].session_id });
    }

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO geo_sessions (session_id, candidate_id, exam_id) VALUES (?, ?, ?)`,
      [sessionId, candidateId, examId]
    );

    console.log(`[GEO] Session started: ${sessionId} for ${candidateId}`);
    res.json({ sessionId });

  } catch (err) {
    console.error('[GEO] session/start error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ═══════════════════════════════════════════════════
   POST /api/location/ping
   FIX 1: geo_pings columns match actual DB schema:
           lat, lng (not latitude/longitude)
   FIX 2: UPDATE uses last_ping (not last_ping_at)
═══════════════════════════════════════════════════ */
router.post('/location/ping', async (req, res) => {
  const { sessionId, latitude: lat, longitude: lng, accuracy } = req.body;

  if (!sessionId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'sessionId, latitude, longitude required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM geo_sessions WHERE session_id=?`,
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = rows[0];

    if (session.status === 'terminated') {
      return res.status(403).json({ error: 'Session terminated' });
    }

    const sessionObj = {
      trustScore: session.trust_score,
      status:     session.status,
      lastPing:   session.last_lat ? { lat: session.last_lat, lng: session.last_lng } : null,
    };

    const { events, newTrust, riskLevel, geofenceOk, newStatus } = assessPing(sessionObj, lat, lng, accuracy);

    const newFlagCount = session.flag_count + events.filter(e => e.severity !== 'low').length;

    /* Update geo_sessions with new location data */
    await db.query(
      `UPDATE geo_sessions
       SET trust_score=?, status=?, flag_count=?, ping_count=ping_count+1,
           last_lat=?, last_lng=?, last_accuracy=?, last_ping_at=NOW()
       WHERE session_id=?`,
      [newTrust, newStatus, newFlagCount, lat, lng, accuracy || null, sessionId]
    );

    /* FIX 1: INSERT into geo_pings with correct columns: lat, lng (matches actual DB schema) */
    await db.query(
      `INSERT INTO geo_pings (session_id, lat, lng, accuracy, trust_score, risk_level, events)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, lat, lng, accuracy || null, newTrust, riskLevel, JSON.stringify(events)]
    );

    console.log(`[GEO] Ping — trust:${newTrust} risk:${riskLevel}`);

    res.json({ trustScore: newTrust, riskLevel, geofenceOk, status: newStatus, alerts: events });

  } catch (err) {
    console.error('[GEO] ping error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ═══════════════════════════════════════════════════
   GET /api/admin/sessions
═══════════════════════════════════════════════════ */
router.get('/admin/sessions', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM geo_sessions ORDER BY consent_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error('[GEO] admin/sessions error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ═══════════════════════════════════════════════════
   GET /api/admin/sessions/:sessionId
   FIX: geo_pings uses pinged_at (correct column name)
═══════════════════════════════════════════════════ */
router.get('/admin/sessions/:sessionId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM geo_sessions WHERE session_id=?`,
      [req.params.sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    /* geo_pings column is pinged_at — matches actual DB schema */
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

/* ═══════════════════════════════════════════════════
   POST /api/session/:sessionId/terminate
═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   POST /api/session/:sessionId/complete
═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   GET /api/admin/geo-stats
   Returns aggregated geolocation statistics for the admin dashboard
═══════════════════════════════════════════════════ */
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
      lowRisk: row.lowRisk || 0,
      mediumRisk: row.mediumRisk || 0,
      highRisk: row.highRisk || 0,
      avgTrustScore: row.avgTrustScore || 100,
      totalFlags: row.totalFlags || 0,
      criticalAlerts: row.highRisk || 0,
    });
  } catch (err) {
    console.error('[GEO] admin/geo-stats error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ═══════════════════════════════════════════════════
   GET /api/admin/geo-map
   Returns current location markers for live map visualization
═══════════════════════════════════════════════════ */
router.get('/admin/geo-map', async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT
        session_id,
        candidate_id,
        exam_id,
        status,
        trust_score,
        flag_count,
        last_lat,
        last_lng,
        last_accuracy,
        last_ping_at,
        updated_at
      FROM geo_sessions
      WHERE status IN ('active', 'escalated') AND last_lat IS NOT NULL AND last_lng IS NOT NULL
      ORDER BY updated_at DESC
    `);

    const markers = sessions.map(s => {
      const riskLevel = s.trust_score >= 70 ? 'low' : s.trust_score >= 40 ? 'medium' : 'high';
      return {
        id: s.session_id,
        candidateId: s.candidate_id,
        examId: s.exam_id,
        lat: parseFloat(s.last_lat),
        lng: parseFloat(s.last_lng),
        accuracy: s.last_accuracy,
        trustScore: s.trust_score,
        riskLevel,
        status: s.status,
        flagCount: s.flag_count,
        lastPing: s.last_ping_at,
        updated: s.updated_at,
      };
    });

    res.json(markers);
  } catch (err) {
    console.error('[GEO] admin/geo-map error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
