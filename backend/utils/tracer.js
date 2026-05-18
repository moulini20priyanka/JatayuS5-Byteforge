// ── backend/utils/tracer.js ───────────────────────────────────────
// Shared LangSmith tracer — tracks tokens + cost for all agents
// Supports WAY 1: { __result, __usage }  ← preferred for all new agents
//         WAY 2: state.__token_usage = {...}; return state
//         WAY 3: { result, usage }  ← legacy backward-compat
// ─────────────────────────────────────────────────────────────────

const axios          = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE    = "https://api.smith.langchain.com";
const API_KEY = () => process.env.LANGCHAIN_API_KEY || "";
const PROJECT = () => process.env.LANGCHAIN_PROJECT  || "neuroassess-dev";

// ── Groq llama-3.3-70b pricing (per token) ───────────────────────
const COST_PER_INPUT_TOKEN  = 0.59 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 0.79 / 1_000_000;

// ── Session cache — keyed by project name ────────────────────────
const _sessionCache = {};

// ─────────────────────────────────────────────────────────────────
// INTERNAL: get or create the LangSmith project session ID
// ─────────────────────────────────────────────────────────────────
async function getSessionId() {
  const key     = API_KEY();
  const project = PROJECT();

  if (!key || key === "ls__your_key" || key.length < 20) {
    console.warn("[Tracer] LANGCHAIN_API_KEY is missing or still a placeholder — skipping trace");
    return null;
  }

  if (_sessionCache[project]) return _sessionCache[project];

  try {
    const { data } = await axios.get(`${BASE}/sessions`, {
      headers: { "x-api-key": key },
      params:  { limit: 100 },
      timeout: 8000,
    });

    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    const match    = sessions.find(s => s.name === project);

    if (match) {
      _sessionCache[project] = match.id;
      return _sessionCache[project];
    }

    const { data: created } = await axios.post(
      `${BASE}/sessions`,
      { name: project },
      {
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        timeout: 8000,
      }
    );
    _sessionCache[project] = created.id;
    console.log(`[Tracer] Created LangSmith project "${project}": ${_sessionCache[project]}`);
    return _sessionCache[project];

  } catch (e) {
    const status = e.response?.status;
    const msg    = e.response?.data?.detail || e.message;
    console.warn(`[Tracer] getSessionId failed (HTTP ${status || "?"}): ${msg}`);
    if (status === 429) console.warn("[Tracer] LangSmith rate limit — check your API key plan");
    if (status === 401 || status === 403) console.warn("[Tracer] LangSmith auth error — key is invalid or expired");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL: POST /runs — open a new run
// ─────────────────────────────────────────────────────────────────
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
        tags:       tags    || [],
      },
      {
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        timeout: 8000,
      }
    );
  } catch (e) {
    const status = e.response?.status;
    const msg    = e.response?.data?.detail || e.message;
    console.warn(`[Tracer] createRun failed (HTTP ${status || "?"}): ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL: PATCH /runs/:id — close run, attach tokens + cost
//
// LangSmith field mapping (verified against LangSmith source):
//
//   Tokens column  → outputs.llm_output.token_usage.*
//                    AND top-level: prompt_tokens, completion_tokens
//
//   Cost column    → top-level: total_cost
//                    (LangSmith multiplies inputs_tokens × input_cost +
//                     outputs_tokens × output_cost when these fields exist,
//                     OR reads total_cost directly)
//
//   Sidebar detail → extra.usage.*
//                    AND extra.runtime.*
// ─────────────────────────────────────────────────────────────────
async function updateRun({ runId, outputs, error, usage }) {
  const key = API_KEY();
  if (!key) return;

  const promptTokens     = Number(usage?.prompt_tokens)     || 0;
  const completionTokens = Number(usage?.completion_tokens) || 0;
  const totalTokens      = Number(usage?.total_tokens)
                           || (promptTokens + completionTokens)
                           || 0;
  const totalCost        = (promptTokens     * COST_PER_INPUT_TOKEN)
                         + (completionTokens * COST_PER_OUTPUT_TOKEN);

  if (totalTokens > 0) {
    console.log(`[Tracer] ✅ Tokens — in: ${promptTokens}, out: ${completionTokens}, total: ${totalTokens}, cost: $${totalCost.toFixed(6)}`);
  } else {
    console.warn("[Tracer] ⚠️  No token usage captured — usage was null or zero");
  }

  const safeOutputs = outputs || {};

  // outputs.llm_output.token_usage — LangSmith reads this for the Tokens column
  const outputsWithTokens = totalTokens > 0
    ? {
        ...safeOutputs,
        llm_output: {
          token_usage: {
            prompt_tokens:     promptTokens,
            completion_tokens: completionTokens,
            total_tokens:      totalTokens,
          },
          model_name: "llama-3.3-70b-versatile",
        },
      }
    : safeOutputs;

  const body = {
    outputs:  outputsWithTokens,
    error:    error || null,
    end_time: new Date().toISOString(),
  };

  if (totalTokens > 0) {
    // ── extra block — sidebar detail panel ───────────────────────
    body.extra = {
      usage: {
        prompt_tokens:     promptTokens,
        completion_tokens: completionTokens,
        total_tokens:      totalTokens,
      },
      // LangSmith reads inputs_tokens / outputs_tokens for cost calculation
      // when total_cost is not directly provided
      runtime: {
        inputs_tokens:  promptTokens,
        outputs_tokens: completionTokens,
      },
    };

    // ── Top-level token fields (multiple naming conventions) ──────
    // prompt_tokens / completion_tokens → Tokens In / Out columns
    body.prompt_tokens     = promptTokens;
    body.completion_tokens = completionTokens;
    body.total_tokens      = totalTokens;

    // inputs_tokens / outputs_tokens → used by LangSmith cost engine
    body.inputs_tokens  = promptTokens;
    body.outputs_tokens = completionTokens;

    // total_cost → Cost column (direct value, takes priority over calculation)
    body.total_cost = parseFloat(totalCost.toFixed(8));
  }

  try {
    await axios.patch(
      `${BASE}/runs/${runId}`,
      body,
      {
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        timeout: 8000,
      }
    );
    if (totalTokens > 0) {
      console.log(`[Tracer] ✅ Run patched — cost: $${totalCost.toFixed(6)} sent to LangSmith`);
    }
  } catch (e) {
    const status = e.response?.status;
    const msg    = e.response?.data?.detail || e.message;
    console.warn(`[Tracer] updateRun failed (HTTP ${status || "?"}): ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC: trace(meta, fn)
// ─────────────────────────────────────────────────────────────────
async function trace(meta, fn) {
  const key = API_KEY();

  if (!key || key === "ls__your_key" || key.length < 20) {
    const raw = await fn();
    return unwrap(raw);
  }

  const runId     = uuidv4();
  const sessionId = await getSessionId();

  if (!sessionId) {
    const raw = await fn();
    return unwrap(raw);
  }

  await createRun({
    runId,
    name:      meta.name    || "unknown-agent",
    runType:   meta.runType || "chain",
    inputs:    sanitise(meta.inputs || {}),
    sessionId,
    tags:      meta.tags    || [meta.name || "agent"],
  });

  const start = Date.now();

  try {
    const raw    = await fn();
    const result = unwrap(raw);
    const usage  = extractUsage(raw);

    console.log(`[Tracer] "${meta.name}" usage extracted:`, JSON.stringify(usage));

    await updateRun({
      runId,
      outputs: sanitise({ result, latency_ms: Date.now() - start }),
      usage,
    });

    return result;

  } catch (err) {
    await updateRun({
      runId,
      error:   err.message,
      outputs: { latency_ms: Date.now() - start },
      usage:   null,
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

function extractUsage(raw) {
  if (!raw || typeof raw !== "object") return null;

  // WAY 1: explicit __result/__usage envelope
  if ("__result" in raw && "__usage" in raw) {
    const u = raw.__usage;
    if (!u) return null;
    const pt = Number(u.prompt_tokens)     || 0;
    const ct = Number(u.completion_tokens) || 0;
    const tt = Number(u.total_tokens)      || (pt + ct);
    if (tt === 0) return null;
    return { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt };
  }

  // WAY 3: legacy { result, usage } — only if EXACTLY two keys
  const keys = Object.keys(raw);
  if (keys.length === 2 && keys.includes("result") && keys.includes("usage") && raw.usage) {
    const u  = raw.usage;
    const pt = Number(u.prompt_tokens)     || 0;
    const ct = Number(u.completion_tokens) || 0;
    const tt = Number(u.total_tokens)      || (pt + ct);
    if (tt === 0) return null;
    return { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt };
  }

  // WAY 2: __token_usage on state
  if (raw.__token_usage) {
    const u  = raw.__token_usage;
    const pt = Number(u.prompt_tokens)     || 0;
    const ct = Number(u.completion_tokens) || 0;
    const tt = Number(u.total_tokens)      || (pt + ct);
    if (tt === 0) return null;
    return { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt };
  }

  return null;
}

function unwrap(raw) {
  if (!raw || typeof raw !== "object") return raw;

  // WAY 1
  if ("__result" in raw) return raw.__result;

  // WAY 3 — only if exactly { result, usage }
  const keys = Object.keys(raw);
  if (keys.length === 2 && keys.includes("result") && keys.includes("usage")) return raw.result;

  // WAY 2
  if ("__token_usage" in raw) {
    const clean = { ...raw };
    delete clean.__token_usage;
    return clean;
  }

  return raw;
}

function sanitise(data) {
  const SKIP = new Set([
    "resume_buffer", "id_image_buffer", "live_image_buffer",
    "__emit", "__errors", "__token_usage",
  ]);
  try {
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (SKIP.has(key))               return undefined;
        if (Buffer.isBuffer(value))      return "[Buffer]";
        if (typeof value === "function") return undefined;
        return value;
      })
    );
  } catch {
    return {};
  }
}

module.exports = { trace };