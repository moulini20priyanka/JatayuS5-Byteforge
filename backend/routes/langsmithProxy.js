

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const BASE = 'https://api.smith.langchain.com';

function headers() {
  return {
    'x-api-key':    process.env.LANGCHAIN_API_KEY || '',
    'Content-Type': 'application/json',
  };
}

// ── GET /api/langsmith/ping ───────────────────────────────────────
router.get('/ping', (req, res) => res.json({ ok: true }));

// ── Helper: get or create project, return session_id ─────────────
let cachedSessionId = null;

async function getOrCreateSessionId() {
  if (cachedSessionId) return cachedSessionId;

  const project = process.env.LANGCHAIN_PROJECT || 'neuroassess-dev';
  const apiKey  = process.env.LANGCHAIN_API_KEY || '';
  if (!apiKey) throw new Error('LANGCHAIN_API_KEY not set in backend .env');

  // Try to find existing session
  try {
    const { data } = await axios.get(`${BASE}/sessions`, { headers: headers(), params: { limit: 100 } });
    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    const match    = sessions.find(s => s.name === project);
    if (match) { cachedSessionId = match.id; return cachedSessionId; }
  } catch (e) {
    console.error('[langsmithProxy] list sessions:', e.response?.data || e.message);
  }

  // Create project if not found
  try {
    const { data } = await axios.post(`${BASE}/sessions`, { name: project }, { headers: headers() });
    console.log(`[langsmithProxy] Project "${project}" created: ${data.id}`);
    cachedSessionId = data.id;
    return cachedSessionId;
  } catch (e) {
    cachedSessionId = null;
    throw new Error('Could not create project: ' + (e.response?.data?.detail || e.message));
  }
}

// ── Helper: query runs via POST /runs/query ───────────────────────
async function queryRuns(sessionId, limit = 30) {
  const { data } = await axios.post(
    `${BASE}/runs/query`,
    {
      session:  [sessionId],
      limit:    Number(limit),
      is_root:  true,
    },
    { headers: headers() }
  );
  return Array.isArray(data) ? data : (data.runs || []);
}

// ── GET /api/langsmith/runs ───────────────────────────────────────
router.get('/runs', async (req, res) => {
  try {
    const sessionId = await getOrCreateSessionId();
    const runs      = await queryRuns(sessionId, req.query.limit || 30);
    return res.json(runs);
  } catch (err) {
    cachedSessionId = null;
    console.error('[langsmithProxy] /runs:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: err.response?.data?.detail || err.message,
    });
  }
});

// ── GET /api/langsmith/stats ──────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const sessionId  = await getOrCreateSessionId();
    const runs       = await queryRuns(sessionId, 100);
    const successful = runs.filter(r => r.status === 'success');
    const errored    = runs.filter(r => r.status === 'error');
    const totalTokens = runs.reduce((a, r) => a + (r.total_tokens || 0), 0);
    const totalCost   = runs.reduce((a, r) => a + (r.total_cost   || 0), 0);
    const latencies   = successful
      .filter(r => r.start_time && r.end_time)
      .map(r => new Date(r.end_time) - new Date(r.start_time))
      .filter(ms => ms > 0);

    return res.json({
      total:        runs.length,
      successful:   successful.length,
      errored:      errored.length,
      totalTokens,
      totalCost,
      avgLatencyMs: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
    });
  } catch (err) {
    cachedSessionId = null;
    console.error('[langsmithProxy] /stats:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: err.response?.data?.detail || err.message,
    });
  }
});

module.exports = router;