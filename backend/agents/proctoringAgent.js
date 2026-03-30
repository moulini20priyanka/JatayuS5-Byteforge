// backend/agents/proctoringAgent.js
<<<<<<< HEAD
// LangChain agent for proctoring report generation
const { ChatCohere }         = require("@langchain/cohere");
const { PromptTemplate }     = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence }   = require("@langchain/core/runnables");

const REPORT_PROMPT = PromptTemplate.fromTemplate(`
You are an AI exam proctoring report generator.
Generate a professional exam integrity report based on the following data.

=======
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
>>>>>>> correct-version
Student: {studentName}
Certification: {certName}
Score: {score}%
Total Questions: {totalQuestions}
Correct Answers: {correct}
Violations Detected: {violations}
<<<<<<< HEAD

Respond with ONLY valid JSON, no markdown, no extra text:
{{
  "summary": "2-3 sentence professional overview of the exam session",
  "integrity_score": <number 0-100>,
  "recommendation": "pass or review or fail",
  "details": "detailed analysis of performance and integrity"
}}
`);

async function generateReport(data) {
  try {
    if (!process.env.COHERE_API_KEY) throw new Error("No COHERE_API_KEY");

=======
Respond with ONLY valid JSON:
{{
  "summary": "2-3 sentence overview",
  "integrity_score": <number 0-100>,
  "recommendation": "pass or review or fail",
  "details": "detailed analysis"
}}
`);

>>>>>>> correct-version
    const llm = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command-r",
      temperature: 0.2,
      maxTokens: 500,
    });

<<<<<<< HEAD
    const chain = RunnableSequence.from([
      REPORT_PROMPT,
      llm,
      new StringOutputParser(),
    ]);

    console.log("[ProctoringAgent] Generating AI report via LangChain...");
    const output = await chain.invoke({
=======
    const chain = RunnableSequence.from([REPORT_PROMPT, llm, new StringOutputParser()]);
    console.log("[ProctoringAgent] Generating AI report...");

    const output  = await chain.invoke({
>>>>>>> correct-version
      studentName:    data.studentName || "Student",
      certName:       data.certName,
      score:          data.score,
      totalQuestions: data.totalQuestions,
      correct:        data.correct,
      violations:     JSON.stringify(data.violations || []),
    });

    const cleaned = output.replace(/```json|```/g, "").trim();
<<<<<<< HEAD
    const start   = cleaned.indexOf("{");
    const end     = cleaned.lastIndexOf("}");
    const parsed  = JSON.parse(cleaned.slice(start, end + 1));
=======
    const parsed  = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
>>>>>>> correct-version
    console.log("[ProctoringAgent] ✅ AI report generated");
    return parsed;

  } catch (e) {
<<<<<<< HEAD
    console.log("[ProctoringAgent] ⚠️ LangChain report failed:", e.message, "— using default");
    const integ = Math.max(0, 100 - (data.violations || []).length * 5);
    return {
      summary: `The student completed the ${data.certName} exam with a score of ${data.score}%. ${(data.violations||[]).length} proctoring violations were recorded during the session.`,
      integrity_score: integ,
      recommendation: data.score >= 70 ? "pass" : "fail",
      details: `Score: ${data.score}%, Violations: ${(data.violations||[]).length}, Integrity: ${integ}%`,
=======
    console.log("[ProctoringAgent] Using fallback:", e.message);
    const violCount = (data.violations || []).length;
    const integ     = Math.max(0, 100 - violCount * 5);
    return {
      summary:         `${data.studentName || "The student"} completed the ${data.certName} exam scoring ${data.score}%. ${violCount} violation${violCount !== 1 ? "s" : ""} recorded.`,
      integrity_score: integ,
      recommendation:  data.score >= 70 ? "pass" : data.score >= 40 ? "review" : "fail",
      details:         `Score: ${data.score}%, Correct: ${data.correct}/${data.totalQuestions}, Violations: ${violCount}, Integrity: ${integ}%`,
>>>>>>> correct-version
    };
  }
}

<<<<<<< HEAD
module.exports = { generateReport };
=======
module.exports = { generateReport };
>>>>>>> correct-version
