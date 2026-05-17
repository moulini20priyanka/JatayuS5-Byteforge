

const express = require("express");
const router  = express.Router();

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile"; // free, fast, very capable


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

  try {
    const { system, messages, tools } = req.body;

    // Build system prompt — append tool descriptions so Llama knows what it can do
    let systemPrompt = system || "";
    if (tools?.length) {
      const toolDocs = tools
        .map((t) => `Tool: ${t.name}\nDescription: ${t.description}\nInput schema: ${JSON.stringify(t.input_schema, null, 2)}`)
        .join("\n\n");
      systemPrompt += `\n\n──────────────────────────────\nYou have access to these tools. When you need data, describe clearly which tool you would use and what it returned, then give your analysis as if the tool ran successfully.\n\n${toolDocs}`;
    }

    // Convert messages to OpenAI format, skipping empty tool_use assistant turns
    const openAiMessages = messages
      .map((m) => {
        const text = flattenContent(m.content);
        if (!text) return null;
        return { role: m.role === "assistant" ? "assistant" : "user", content: text };
      })
      .filter(Boolean);

    const upstream = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...openAiMessages,
        ],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("[aiProxy/groq] upstream error:", data);
      return res.status(upstream.status).json({ error: data.error?.message || "Groq error" });
    }

    const text = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Return in Anthropic-style shape so the frontend needs zero changes
    res.json({
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    console.error("[aiProxy/groq] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
