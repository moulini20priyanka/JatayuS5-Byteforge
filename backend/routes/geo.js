/**
 * geo.js  — NeuroAssess Geolocation Backend Routes
 * Mount in server.js as:  app.use('/api', require('./routes/geo'));
 *
 * Endpoints:
 *   POST /api/session/start
 *   POST /api/location/ping
 *   GET  /api/admin/sessions
 *   POST /api/session/:sessionId/terminate
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');   // npm i uuid  (already in most projects)

/* ─────────────────────────────────────────────────────
   IN-MEMORY STORE
   Replace with DB calls (Mongoose/Sequelize) as needed.
───────────────────────────────────────────────────── */
const sessions = new Map();   // sessionId → SessionDoc

function makeSession(candidateId, examId) {
  return {
    sessionId:   uuidv4(),
    candidateId,
    examId,
    status:      'active',      // active | terminated | completed
    trustScore:  100,
    flagCount:   0,
    pingCount:   0,
    consentAt:   new Date(),
    lastPing:    null,          // { lat, lng, accuracy, ts }
    history:     [],            // last 50 pings
    alerts:      [],            // risk events
  };
}

/* ─────────────────────────────────────────────────────
   TRUST SCORE ENGINE
   Deducts points for anomalies; never goes below 0.
───────────────────────────────────────────────────── */
const GEOFENCE_CENTER = null;   // Set to { lat, lng } to enable geofencing
const GEOFENCE_RADIUS = 500;    // metres

function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assessPing(session, lat, lng, accuracy) {
  const events   = [];
  let   deduct   = 0;
  let   geofenceOk = true;

  /* 1. Geofence check (only if centre is configured) */
  if (GEOFENCE_CENTER) {
    const dist = haversineMetres(GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lng, lat, lng);
    if (dist > GEOFENCE_RADIUS) {
      deduct += 20;
      events.push({ type: 'geofence_exit', message: `Outside exam zone (${Math.round(dist)}m away)`, severity: 'high' });
      geofenceOk = false;
    }
  }

  /* 2. Large sudden movement (> 200 m between pings) */
  if (session.lastPing) {
    const moved = haversineMetres(session.lastPing.lat, session.lastPing.lng, lat, lng);
    if (moved > 200) {
      deduct += 15;
      events.push({ type: 'large_movement', message: `Moved ${Math.round(moved)}m since last ping`, severity: 'medium' });
    }
  }

  /* 3. Poor accuracy (> 100 m GPS accuracy — may indicate spoofing / indoor) */
  if (accuracy && accuracy > 100) {
    deduct += 5;
    events.push({ type: 'poor_accuracy', message: `GPS accuracy low (±${Math.round(accuracy)}m)`, severity: 'low' });
  }

  const newTrust   = Math.max(0, session.trustScore - deduct);
  const riskLevel  = newTrust > 70 ? 'low' : newTrust > 40 ? 'medium' : 'high';
  const newStatus  = session.status === 'terminated' ? 'terminated'
                   : riskLevel === 'high'             ? 'escalated'
                   :                                   'active';

  return { events, newTrust, riskLevel, geofenceOk, newStatus };
}

/* ═══════════════════════════════════════════════════
   POST /api/session/start
   Body: { candidateId, examId, consentGiven }
   Returns: { sessionId }
═══════════════════════════════════════════════════ */
router.post('/session/start', (req, res) => {
  const { candidateId, examId, consentGiven } = req.body;

  if (!candidateId || !examId) {
    return res.status(400).json({ error: 'candidateId and examId are required' });
  }
  if (!consentGiven) {
    return res.status(403).json({ error: 'Consent not given' });
  }

  // If candidate already has an active session for this exam, reuse it
  for (const [, s] of sessions) {
    if (s.candidateId === candidateId && s.examId === examId && s.status === 'active') {
      return res.json({ sessionId: s.sessionId });
    }
  }

  const session = makeSession(candidateId, examId);
  sessions.set(session.sessionId, session);
  console.log(`[GEO] Session started: ${session.sessionId} for ${candidateId}`);
  res.json({ sessionId: session.sessionId });
});

/* ═══════════════════════════════════════════════════
   POST /api/location/ping
   Body: { sessionId, latitude, longitude, accuracy }
   Returns: { trustScore, riskLevel, geofenceOk, alerts }
═══════════════════════════════════════════════════ */
router.post('/location/ping', (req, res) => {
  const { sessionId, latitude: lat, longitude: lng, accuracy } = req.body;

  if (!sessionId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'sessionId, latitude, longitude required' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.status === 'terminated') {
    return res.status(403).json({ error: 'Session terminated' });
  }

  const { events, newTrust, riskLevel, geofenceOk, newStatus } = assessPing(session, lat, lng, accuracy);

  /* Persist */
  const pingRecord = { lat, lng, accuracy, ts: new Date() };
  session.lastPing   = pingRecord;
  session.trustScore = newTrust;
  session.status     = newStatus;
  session.pingCount += 1;

  if (events.length) {
    session.flagCount += events.filter(e => e.severity !== 'low').length;
    session.alerts.push(
      ...events.map(e => ({ ...e, ts: new Date() }))
    );
    // Keep only last 100 alerts
    if (session.alerts.length > 100) session.alerts = session.alerts.slice(-100);
  }

  // Keep rolling history (last 50)
  session.history.push(pingRecord);
  if (session.history.length > 50) session.history.shift();

  console.log(`[GEO] Ping from ${session.candidateId} — trust:${newTrust} risk:${riskLevel}`);

  res.json({
    trustScore:  newTrust,
    riskLevel,
    geofenceOk,
    status:      newStatus,
    alerts:      events,
  });
});

/* ═══════════════════════════════════════════════════
   GET /api/admin/sessions
   Returns: all sessions (for admin dashboard)
═══════════════════════════════════════════════════ */
router.get('/admin/sessions', (req, res) => {
  const result = Array.from(sessions.values()).map(s => ({
    sessionId:   s.sessionId,
    candidateId: s.candidateId,
    examId:      s.examId,
    status:      s.status,
    trustScore:  s.trustScore,
    flagCount:   s.flagCount,
    pingCount:   s.pingCount,
    lastPing:    s.lastPing,
    alerts:      s.alerts.slice(-10),   // last 10 alerts only
    consentAt:   s.consentAt,
  }));
  res.json(result);
});

/* ═══════════════════════════════════════════════════
   GET /api/admin/sessions/:sessionId
   Returns: full detail for one session
═══════════════════════════════════════════════════ */
router.get('/admin/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

/* ═══════════════════════════════════════════════════
   POST /api/session/:sessionId/terminate
   Body: { reason? }
═══════════════════════════════════════════════════ */
router.post('/session/:sessionId/terminate', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.status = 'terminated';
  session.alerts.push({
    type:     'admin_terminate',
    message:  `Session terminated by admin${req.body?.reason ? ': ' + req.body.reason : ''}`,
    severity: 'high',
    ts:       new Date(),
  });

  console.log(`[GEO] Session terminated: ${req.params.sessionId}`);
  res.json({ success: true, sessionId: req.params.sessionId });
});

/* ═══════════════════════════════════════════════════
   POST /api/session/:sessionId/complete
   Called when student submits exam
═══════════════════════════════════════════════════ */
router.post('/session/:sessionId/complete', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.status !== 'terminated') session.status = 'completed';
  console.log(`[GEO] Session completed: ${req.params.sessionId}`);
  res.json({ success: true });
});

module.exports = router;