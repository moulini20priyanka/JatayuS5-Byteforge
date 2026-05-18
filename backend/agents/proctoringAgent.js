// ── agents/proctoringAgent.js ─────────────────────────────────────
const { ChatCohere }         = require("@langchain/cohere");
const { PromptTemplate }     = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence }   = require("@langchain/core/runnables");
const { trace }              = require("../utils/tracer");

const REPORT_PROMPT = PromptTemplate.fromTemplate(`
You are an AI exam proctoring report generator.
Generate a professional exam integrity report based on the following data.

Student: {studentName}
Certification: {certName}
Score: {score}%
Total Questions: {totalQuestions}
Correct Answers: {correct}
Violations Detected: {violations}

Respond with ONLY valid JSON, no markdown, no extra text:
{{
  "summary": "2-3 sentence professional overview of the exam session",
  "integrity_score": <number 0-100>,
  "recommendation": "pass or review or fail",
  "details": "detailed analysis of performance and integrity"
}}
`);

async function generateReport(data) {
  return trace(
    {
      name:    "proctoring-agent",
      runType: "chain",
      inputs: {
        studentName: data.studentName,
        certName:    data.certName,
        score:       data.score,
        violations:  (data.violations || []).length,
      },
      tags: ["proctoring-agent", "cohere"],
    },
    async () => {
      try {
        if (!process.env.COHERE_API_KEY) throw new Error("No COHERE_API_KEY");

        // ── Token usage collector via LangChain callback ──────────────
        // LangChain's ChatCohere puts token counts in the LLMResult
        // We capture them via the handleLLMEnd callback.
        let capturedUsage = null;

        const tokenCallback = {
          handleLLMEnd(output) {
            try {
              // LangChain stores usage in llmOutput.tokenUsage
              const tokenUsage = output?.llmOutput?.tokenUsage;
              if (tokenUsage) {
                capturedUsage = {
                  prompt_tokens:     tokenUsage.promptTokens     || tokenUsage.prompt_tokens     || 0,
                  completion_tokens: tokenUsage.completionTokens || tokenUsage.completion_tokens || 0,
                  total_tokens:      tokenUsage.totalTokens      || tokenUsage.total_tokens      || 0,
                };
                console.log("[ProctoringAgent] Cohere tokens:", capturedUsage);
              }
            } catch (cbErr) {
              console.warn("[ProctoringAgent] Token callback error:", cbErr.message);
            }
          },
        };

        const llm = new ChatCohere({
          apiKey:      process.env.COHERE_API_KEY,
          model:       "command-r",
          temperature: 0.2,
          maxTokens:   500,
          callbacks:   [tokenCallback],   // ← attach callback
        });

        const chain = RunnableSequence.from([REPORT_PROMPT, llm, new StringOutputParser()]);

        console.log("[ProctoringAgent] Generating AI report via LangChain…");
        const output = await chain.invoke({
          studentName:    data.studentName    || "Student",
          certName:       data.certName,
          score:          data.score,
          totalQuestions: data.totalQuestions,
          correct:        data.correct,
          violations:     JSON.stringify(data.violations || []),
        });

        const cleaned = output.replace(/```json|```/g, "").trim();
        const start   = cleaned.indexOf("{");
        const end     = cleaned.lastIndexOf("}");
        const parsed  = JSON.parse(cleaned.slice(start, end + 1));

        console.log("[ProctoringAgent] ✅ AI report generated");

        // ── Return __result/__usage so tracer logs token counts ───────
        return {
          __result: parsed,
          __usage:  capturedUsage,
        };

      } catch (e) {
        console.log("[ProctoringAgent] ⚠️ LangChain report failed:", e.message, "— using default");
        const integ = Math.max(0, 100 - (data.violations || []).length * 5);

        // Heuristic fallback — no LLM tokens to report
        return {
          __result: {
            summary:         `The student completed the ${data.certName} exam with a score of ${data.score}%. ${(data.violations || []).length} proctoring violations were recorded.`,
            integrity_score: integ,
            recommendation:  data.score >= 70 ? "pass" : "fail",
            details:         `Score: ${data.score}%, Violations: ${(data.violations || []).length}, Integrity: ${integ}%`,
          },
          __usage: null,
        };
      }
    }
  );
}

module.exports = { generateReport };