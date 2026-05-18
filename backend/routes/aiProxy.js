

const express = require("express");
const router  = express.Router();
const axios   = require("axios");

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile"; // free, fast, very capable

// ── Flatten Anthropic-style content blocks to a plain string ─────────────────
// The frontend sends Claude message format: { role, content: [{type:"text", text}] }
// Groq expects OpenAI format:               { role, content: "string" }
function flattenContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === "text" || b.type === "tool_result")
      .map((b) => {
        if (b.type === "tool_result") {
          return `[Tool result]: ${typeof b.content === "string" ? b.content : JSON.stringify(b.content)}`;
        }
        return b.text || "";
      })
      .join("\n")
      .trim();
  }
  return String(content);
}

router.post("/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEYY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEYY is not set in .env" });
  }

  const { system, messages, tools } = req.body;

  let systemPrompt = system || "";
  if (tools?.length) {
    const toolDocs = tools
      .map((t) => `Tool: ${t.name}\nDescription: ${t.description}\nInput schema: ${JSON.stringify(t.input_schema, null, 2)}`)
      .join("\n\n");
    systemPrompt += `\n\n──────────────────────────────\nYou have access to these tools.\n\n${toolDocs}`;
  }

  const openAiMessages = messages
    .map((m) => {
      const text = flattenContent(m.content);
      if (!text) return null;
      return { role: m.role === "assistant" ? "assistant" : "user", content: text };
    })
    .filter(Boolean);

  // ── Create LangSmith run BEFORE calling Groq ─────────────────
  const { trace } = require("../utils/tracer");
  let runId = null;

  // Monkey-patch trace to capture runId
  const { v4: uuidv4 } = require("uuid");
  const lsKey = process.env.LANGCHAIN_API_KEY;
  let sessionId = null;

  if (lsKey) {
    try {
      // Get session
      const { data: sessData } = await axios2.get(`${BASE_LS}/sessions`, {
        headers: { "x-api-key": lsKey },
        params:  { limit: 100 },
      });
      const sessions = Array.isArray(sessData) ? sessData : (sessData.sessions || []);
      const project  = process.env.LANGCHAIN_PROJECT || "neuroassess-dev";
      const match    = sessions.find(s => s.name === project);
      if (match) sessionId = match.id;

      if (sessionId) {
        runId = uuidv4();
        const startTime = new Date().toISOString();
        await axios2.post(
          `${BASE_LS}/runs`,
          {
            id:         runId,
            name:       "ai-analyst",
            run_type:   "llm",
            inputs:     { system: systemPrompt.slice(0, 500), messages: openAiMessages, model: MODEL },
            start_time: startTime,
            session_id: sessionId,
            tags:       ["ai-analyst", "groq", "llama"],
          },
          { headers: { "x-api-key": lsKey, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.warn("[aiProxy] LangSmith pre-run failed:", e.message);
    }
  }

  // ── Call Groq ─────────────────────────────────────────────────
  try {
    const { data } = await axios.post(
      GROQ_API,
      {
        model:      MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...openAiMessages,
        ],
      },
      {
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    const text  = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    const usage = data.usage || null;

    console.log("[aiProxy] Groq usage:", usage);

    // ── Patch LangSmith run with token counts ─────────────────
    if (runId && usage) {
      await patchRunTokens(runId, usage);
    } else if (runId) {
      // Close run even without usage
      await axios2.patch(
        `${BASE_LS}/runs/${runId}`,
        { outputs: { text }, end_time: new Date().toISOString() },
        { headers: { "x-api-key": lsKey, "Content-Type": "application/json" } }
      );
    }

    res.json({
      content:     [{ type: "text", text }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    console.error("[aiProxy] Error:", err.message);

    // Close LangSmith run with error
    if (runId && lsKey) {
      try {
        await axios2.patch(
          `${BASE_LS}/runs/${runId}`,
          { error: err.message, end_time: new Date().toISOString() },
          { headers: { "x-api-key": lsKey, "Content-Type": "application/json" } }
        );
      } catch {}
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
