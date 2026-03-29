// backend/agents/proctoringAgent.js
// Works WITHOUT @langchain/cohere installed.
// If COHERE_API_KEY is set and packages are installed, upgrades to AI report.
// Otherwise uses the built-in fallback — server still starts fine either way.

async function generateReport(data) {
  try {
    require.resolve('@langchain/cohere');
    require.resolve('@langchain/core');

    if (!process.env.COHERE_API_KEY) throw new Error("No COHERE_API_KEY");

    const { ChatCohere }         = require("@langchain/cohere");
    const { PromptTemplate }     = require("@langchain/core/prompts");
    const { StringOutputParser } = require("@langchain/core/output_parsers");
    const { RunnableSequence }   = require("@langchain/core/runnables");

    const REPORT_PROMPT = PromptTemplate.fromTemplate(`
You are an AI exam proctoring report generator.
Student: {studentName}
Certification: {certName}
Score: {score}%
Total Questions: {totalQuestions}
Correct Answers: {correct}
Violations Detected: {violations}
Respond with ONLY valid JSON:
{{
  "summary": "2-3 sentence overview",
  "integrity_score": <number 0-100>,
  "recommendation": "pass or review or fail",
  "details": "detailed analysis"
}}
`);

    const llm = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command-r",
      temperature: 0.2,
      maxTokens: 500,
    });

    const chain = RunnableSequence.from([REPORT_PROMPT, llm, new StringOutputParser()]);
    console.log("[ProctoringAgent] Generating AI report...");

    const output  = await chain.invoke({
      studentName:    data.studentName || "Student",
      certName:       data.certName,
      score:          data.score,
      totalQuestions: data.totalQuestions,
      correct:        data.correct,
      violations:     JSON.stringify(data.violations || []),
    });

    const cleaned = output.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    console.log("[ProctoringAgent] ✅ AI report generated");
    return parsed;

  } catch (e) {
    console.log("[ProctoringAgent] Using fallback:", e.message);
    const violCount = (data.violations || []).length;
    const integ     = Math.max(0, 100 - violCount * 5);
    return {
      summary:         `${data.studentName || "The student"} completed the ${data.certName} exam scoring ${data.score}%. ${violCount} violation${violCount !== 1 ? "s" : ""} recorded.`,
      integrity_score: integ,
      recommendation:  data.score >= 70 ? "pass" : data.score >= 40 ? "review" : "fail",
      details:         `Score: ${data.score}%, Correct: ${data.correct}/${data.totalQuestions}, Violations: ${violCount}, Integrity: ${integ}%`,
    };
  }
}

module.exports = { generateReport };