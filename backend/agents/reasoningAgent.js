// ── agents/reasoningAgent.js ──────────────────────────────────────
const Groq      = require("groq-sdk");
const config    = require("../config/index");
const { trace } = require("../utils/tracer");

const groq = new Groq({ apiKey: config.groq.apiKey });

const SYSTEM_PROMPT = `You are a biometric identity verification decision engine for an online exam proctoring platform.

Your role is to synthesise evidence from two specialist agents:
1. ID Agent — analysed the student's government-issued ID card using OCR
2. Face Agent — compared the ID card face photo with a live camera capture

IMPORTANT CONTEXT: The face comparison uses image heuristics (NOT deep learning).
A score of 45%+ from this system is considered a reasonable match.
Do NOT be overly strict — err on the side of ALLOW for borderline cases.

You must output a JSON decision object:
{
  "decision": "ALLOW" | "REJECT",
  "confidence": <number 0-100>,
  "reason": "<clear one-sentence summary>",
  "details": "<2-4 sentence detailed explanation>",
  "flags": ["<flag1>"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "recommendedAction": "<what the exam administrator should do>"
}

Decision Rules:
1. REJECT if liveness score < 20
2. REJECT if no face detected in BOTH images
3. REJECT if ID card validation score < 25 AND face confidence < 30
4. REJECT if face confidence < 30 AND name match < 40
5. REJECT if face confidence < 30
6. ALLOW with FACE_BORDERLINE flag if face confidence 30-54 AND name match >= 60
7. ALLOW if face confidence >= 55 AND (name match >= 60 OR name could not be extracted)
8. ALLOW with NAME_MISMATCH flag if face confidence >= 55 AND name match < 60

Output valid JSON ONLY. No markdown, no preamble.`;

async function runReasoningAgent(state) {
  const { idAgentResult, faceAgentResult, studentName, examContext } = state;

  return trace(
    {
      name:    "reasoning-agent",
      runType: "chain",
      inputs:  {
        studentName:    studentName               || "unknown",
        faceConfidence: faceAgentResult?.confidence || 0,
        nameMatchScore: idAgentResult?.nameMatch?.score || 0,
        livenessScore:  faceAgentResult?.liveness?.score || 0,
        examContext:    examContext?.examName     || "unknown",
      },
      tags: ["reasoning-agent", "groq", "identity-verification"],
    },
    async () => {
      console.log("[ReasoningAgent] Starting Groq LLM decision synthesis…");
      const agentStart = Date.now();

      // ── Hard rules (no LLM needed) ────────────────────────────
      const hardReject = applyHardRules(idAgentResult, faceAgentResult);
      if (hardReject) {
        console.log("[ReasoningAgent] Hard rule triggered:", hardReject.reason);
        // No LLM call → return plain state, no token usage
        return {
          ...state,
          result: {
            ...hardReject,
            processingTimeMs: Date.now() - agentStart,
            agentId:          "reasoning-agent-v1",
            source:           "hard-rule",
            timestamp:        new Date().toISOString(),
          },
        };
      }

      const evidenceSummary = buildEvidenceSummary(idAgentResult, faceAgentResult, studentName, examContext);

      let llmDecision, tokenUsage;

      try {
        // ── Call Groq — returns decision + usage ────────────────
        const { decision, usage } = await callGroqLLM(evidenceSummary);
        llmDecision = decision;
        tokenUsage  = usage;
        console.log("[ReasoningAgent] Groq decision:", llmDecision.decision, `(${llmDecision.confidence}%)`);
        console.log("[ReasoningAgent] Tokens — prompt:", tokenUsage?.prompt_tokens, "completion:", tokenUsage?.completion_tokens);
      } catch (err) {
        console.error("[ReasoningAgent] Groq failed, using heuristic fallback:", err.message);
        llmDecision = heuristicFallback(idAgentResult, faceAgentResult);
        tokenUsage  = null;
      }

      const result = {
        ...llmDecision,
        processingTimeMs: Date.now() - agentStart,
        agentId:          "reasoning-agent-v1",
        source:           llmDecision.source || "llm-groq",
        timestamp:        new Date().toISOString(),
        evidence: {
          faceConfidence:    faceAgentResult.confidence,
          nameMatchScore:    idAgentResult.nameMatch?.score    || null,
          livenessScore:     faceAgentResult.liveness?.score   || null,
          idValidationScore: idAgentResult.validation?.score   || null,
          ocrConfidence:     idAgentResult.ocrConfidence,
        },
      };

      console.log("[ReasoningAgent] Final decision:", result.decision, "in", result.processingTimeMs + "ms");

      // ── Return via __result/__usage envelope so tracer logs tokens ──
      return {
        __result: { ...state, result },
        __usage:  tokenUsage,
      };
    }
  );
}

// ── Returns { decision, usage } from Groq ────────────────────────
async function callGroqLLM(evidenceSummary) {
  const response = await groq.chat.completions.create({
    model:       config.groq.model,
    max_tokens:  900,
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: "Analyse this identity verification evidence and decide:\n\n" + evidenceSummary + "\n\nOutput ONLY the JSON decision object." },
    ],
  });

  // Groq always returns usage — extract it
  const usage = response.usage
    ? {
        prompt_tokens:     response.usage.prompt_tokens     || 0,
        completion_tokens: response.usage.completion_tokens || 0,
        total_tokens:      response.usage.total_tokens      || 0,
      }
    : null;

  const raw     = response.choices[0]?.message?.content || "";
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed  = JSON.parse(jsonStr);

  if (!parsed.decision || !["ALLOW", "REJECT"].includes(parsed.decision))
    throw new Error("Invalid decision: " + parsed.decision);
  if (typeof parsed.confidence !== "number")
    throw new Error("Non-numeric confidence");

  return { decision: { ...parsed, source: "llm-groq" }, usage };
}

function buildEvidenceSummary(idResult, faceResult, studentName, examContext) {
  const faceConf    = faceResult.confidence        || 0;
  const livenessScr = faceResult.liveness?.score   || 0;
  const nameScr     = idResult.nameMatch?.score    || 0;
  const faceInterp  = faceConf >= 65 ? "GOOD MATCH" : faceConf >= 45 ? "BORDERLINE" : faceConf >= 30 ? "LOW" : "VERY LOW";
  const livInterp   = livenessScr >= 60 ? "LIVE" : livenessScr >= 30 ? "UNCERTAIN" : "SUSPICIOUS";
  return `Student: ${studentName || "Not provided"} | Exam: ${examContext?.examName || "Unknown"}
NOTE: Heuristic system — 45%+ face confidence is a reasonable match.
ID Card: OCR=${idResult.ocrConfidence?.toFixed(1)||"N/A"}% | Name=${idResult.extractedFields?.name||"N/A"} | Name Match=${nameScr}% | Validation=${idResult.validation?.score||0}/100
Face: Confidence=${faceConf}% (${faceInterp}) | Liveness=${livenessScr}% (${livInterp}) | ID Face=${faceResult.idFace?.detected?"Yes":"No"} | Live Face=${faceResult.liveFace?.detected?"Yes":"No"}`;
}

function applyHardRules(idResult, faceResult) {
  if (faceResult.liveness && typeof faceResult.liveness.score === "number" && faceResult.liveness.score < 15) {
    return { decision: "REJECT", confidence: 98, reason: "Critical liveness failure — strong spoof attack signal.", details: `Liveness score of ${faceResult.liveness.score}% indicates a clear spoofing attempt.`, flags: ["LIVENESS_UNCERTAIN", "MANUAL_REVIEW_RECOMMENDED"], riskLevel: "HIGH", recommendedAction: "Escalate to administrator immediately." };
  }
  if (!idResult.success && !(faceResult.liveFace?.detected)) {
    return { decision: "REJECT", confidence: 90, reason: "Both ID analysis and live face detection completely failed.", details: "No text extracted from ID and no face detected in live capture.", flags: ["POOR_IMAGE_QUALITY", "MANUAL_REVIEW_RECOMMENDED"], riskLevel: "HIGH", recommendedAction: "Ask student to retry with better lighting." };
  }
  return null;
}

function heuristicFallback(idResult, faceResult) {
  const f = faceResult.confidence        || 0;
  const n = idResult.nameMatch?.score    || 0;
  const l = faceResult.liveness?.score  || 50;
  const i = idResult.validation?.score  || 50;
  const composite = f * 0.45 + n * 0.25 + l * 0.15 + i * 0.15;
  const decision  = composite >= 45 ? "ALLOW" : "REJECT";
  const flags = [];
  if (f < 55) flags.push("FACE_LOW_CONFIDENCE");
  if (n < 60) flags.push("NAME_MISMATCH");
  if (l < 45) flags.push("LIVENESS_UNCERTAIN");
  if (decision === "ALLOW" && (f < 55 || l < 45)) flags.push("MANUAL_REVIEW_RECOMMENDED");
  return {
    decision,
    confidence:          Math.round(composite),
    reason:              decision === "ALLOW" ? "Heuristic: identity signals sufficient." : "Heuristic: insufficient identity confidence.",
    details:             `Composite: ${composite.toFixed(1)}%. Face: ${f}%, Name: ${n}%, Liveness: ${l}%, ID: ${i}%.`,
    flags,
    riskLevel:           composite > 70 ? "LOW" : composite > 50 ? "MEDIUM" : "HIGH",
    recommendedAction:   decision === "ALLOW" ? "Proceed with monitored exam." : "Retry verification.",
    source:              "heuristic-fallback",
  };
}

module.exports = { runReasoningAgent };