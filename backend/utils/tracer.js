// ── backend/utils/tracer.js ───────────────────────────────────────
// Shared LangSmith tracer — tracks tokens + cost for all agents
// ─────────────────────────────────────────────────────────────────

const axios        = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE    = "https://api.smith.langchain.com";
const API_KEY = () => process.env.LANGCHAIN_API_KEY || "";
const PROJECT = () => process.env.LANGCHAIN_PROJECT || "neuroassess-dev";

// Groq llama-3.3-70b pricing per token
const COST_PER_INPUT_TOKEN  = 0.59 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 0.79 / 1_000_000;

// Cache session ID
let _sessionId = null;

async function getSessionId() {
  if (_sessionId) return _sessionId;
  const key = API_KEY();
  if (!key) return null;

  try {
    const { data } = await axios.get(`${BASE}/sessions`, {
      headers: { "x-api-key": key },
      params:  { limit: 100 },
    });
    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    const match    = sessions.find(s => s.name === PROJECT());

    if (match) { _sessionId = match.id; return _sessionId; }

    // Create project
    const { data: created } = await axios.post(
      `${BASE}/sessions`,
      { name: PROJECT() },
      { headers: { "x-api-key": key, "Content-Type": "application/json" } }
    );
    _sessionId = created.id;
    console.log(`[Tracer] Created project "${PROJECT()}": ${_sessionId}`);
    return _sessionId;
  } catch (e) {
    console.warn("[Tracer] getSessionId failed:", e.message);
    return null;
  }
}

async function createRun({ runId, name, runType, inputs, sessionId, tags }) {
  const key = API_KEY();
  if (!key || !sessionId) return;
  try {
    await axios.post(
      `${BASE}/runs`,
      {
        id:         runId,
        name,
        run_type:   runType || "chain",
        inputs:     inputs  || {},
        start_time: new Date().toISOString(),
        session_id: sessionId,
        tags:       tags || [],
      },
      { headers: { "x-api-key": key, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.warn("[Tracer] createRun failed:", e.response?.data || e.message);
  }
}

async function updateRun({ runId, outputs, error, usage }) {
  const key = API_KEY();
  if (!key) return;

  // Calculate tokens & cost if usage provided
  const promptTokens     = usage?.prompt_tokens     || 0;
  const completionTokens = usage?.completion_tokens || 0;
  const totalTokens      = usage?.total_tokens      || (promptTokens + completionTokens);
  const totalCost        = promptTokens * COST_PER_INPUT_TOKEN + completionTokens * COST_PER_OUTPUT_TOKEN;

  const body = {
    outputs:  outputs || {},
    error:    error   || null,
    end_time: new Date().toISOString(),
  };

  // Only add token fields if we have real data
  if (totalTokens > 0) {
    body.prompt_tokens     = promptTokens;
    body.completion_tokens = completionTokens;
    body.total_tokens      = totalTokens;
    body.total_cost        = totalCost;
  }

  try {
    await axios.patch(
      `${BASE}/runs/${runId}`,
      body,
      { headers: { "x-api-key": key, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.warn("[Tracer] updateRun failed:", e.response?.data || e.message);
  }
}

/**
 * Main trace wrapper
 * @param {object} meta - { name, runType, inputs, tags }
 * @param {function} fn - async function — can return { result, usage } or just result
 */
async function trace(meta, fn) {
  const key = API_KEY();
  if (!key) return fn();   // No tracing — just run

  const runId     = uuidv4();
  const sessionId = await getSessionId();

  await createRun({
    runId,
    name:      meta.name    || "unknown-agent",
    runType:   meta.runType || "chain",
    inputs:    meta.inputs  || {},
    sessionId,
    tags:      meta.tags    || [meta.name || "agent"],
  });

  const start = Date.now();
  try {
    const raw    = await fn();

    // Support fn returning { result, usage } for token tracking
    const result = raw?.result !== undefined ? raw.result : raw;
    const usage  = raw?.usage  || null;

    await updateRun({
      runId,
      outputs: { result, latency_ms: Date.now() - start },
      usage,
    });
    return result;
  } catch (err) {
    await updateRun({
      runId,
      error:   err.message,
      outputs: { latency_ms: Date.now() - start },
    });
    throw err;
  }
}

module.exports = { trace };
