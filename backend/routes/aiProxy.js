// ── routes/aiProxy.js ────────────────────────────────────────────
// Proxy: frontend AI Analyst chat → Groq LLM
// Handles tool-use simulation + LangSmith token tracking via tracer
// ─────────────────────────────────────────────────────────────────

const express     = require("express");
const router      = express.Router();
const axios       = require("axios");
const { trace }   = require("../utils/tracer");

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile";

// ── Flatten Anthropic-style content blocks → plain string ────────
// Frontend sends: { role, content: [{type:"text", text}] }
// Groq expects:   { role, content: "string" }
function flattenContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === "text" || b.type === "tool_result")
      .map((b) => {
        if (b.type === "tool_result") {
          return `[Tool result]: ${
            typeof b.content === "string" ? b.content : JSON.stringify(b.content)
          }`;
        }
        return b.text || "";
      })
      .join("\n")
      .trim();
  }
  return String(content);
}

router.post("/chat", async (req, res) => {
  // ── Fixed: was GROQ_API_KEYY (typo) ──────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not set in backend .env" });
  }

  const { system, messages, tools } = req.body;

  // Build system prompt — append tool docs so Groq knows what tools exist
  let systemPrompt = system || "";
  if (tools?.length) {
    const toolDocs = tools
      .map(
        (t) =>
          `Tool: ${t.name}\nDescription: ${t.description}\nInput schema: ${JSON.stringify(
            t.input_schema,
            null,
            2
          )}`
      )
      .join("\n\n");
    systemPrompt += `\n\n──────────────────────────────\nYou have access to these tools.\n\n${toolDocs}`;
  }

  // Convert to OpenAI/Groq message format
  const openAiMessages = messages
    .map((m) => {
      const text = flattenContent(m.content);
      if (!text) return null;
      return {
        role:    m.role === "assistant" ? "assistant" : "user",
        content: text,
      };
    })
    .filter(Boolean);

  // ── Wrap the Groq call in tracer so tokens appear in LangSmith ─
  try {
    const { text, usage } = await trace(
      {
        name:    "ai-analyst",
        runType: "llm",
        inputs: {
          model:   MODEL,
          system:  systemPrompt.slice(0, 400),   // truncate for LangSmith display
          msgCount: openAiMessages.length,
        },
        tags: ["ai-analyst", "groq", "llama", "recruiter-dashboard"],
      },
      async () => {
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
            timeout: 30000,
          }
        );

        const text  = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
        const usage = data.usage
          ? {
              prompt_tokens:     data.usage.prompt_tokens     || 0,
              completion_tokens: data.usage.completion_tokens || 0,
              total_tokens:      data.usage.total_tokens      || 0,
            }
          : null;

        console.log("[aiProxy] Groq tokens — prompt:", usage?.prompt_tokens, "completion:", usage?.completion_tokens);

        // Return via __result/__usage so tracer logs the tokens
        return { __result: { text, usage }, __usage: usage };
      }
    );

    res.json({
      content:     [{ type: "text", text }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    console.error("[aiProxy] Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
