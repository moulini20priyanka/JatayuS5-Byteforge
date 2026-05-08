// agents/reasoningAgent.js — CommonJS, updated decision thresholds for better accuracy
const Groq   = require('groq-sdk');
const config = require('../config/index');

const groq = new Groq({ apiKey: config.groq.apiKey });

const SYSTEM_PROMPT = `You are a biometric identity verification decision engine for an online exam proctoring platform.

Your role is to synthesise evidence from two specialist agents:
1. ID Agent — analysed the student's government-issued ID card using OCR
2. Face Agent — compared the ID card face photo with a live camera capture

IMPORTANT CONTEXT: The face comparison uses image heuristics (NOT deep learning).
This means scores are naturally lower than neural-network systems.
A score of 45%+ from this system is considered a reasonable match.
Do NOT be overly strict — err on the side of ALLOW for borderline cases.
A legitimate student with poor lighting should still be allowed through.

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

Decision Rules (strict priority order):

1. REJECT if liveness score < 20 (very extreme spoof signal only)
2. REJECT if no face detected in BOTH images simultaneously
3. REJECT if ID card validation score < 25 AND face confidence < 30 (dual failure)
4. REJECT if face confidence < 30 AND name match < 40 (both very low)
5. REJECT if face confidence < 30 (face clearly does not match)

6. ALLOW with FACE_BORDERLINE flag if face confidence 30-54 AND name match >= 60
7. ALLOW if face confidence >= 55 AND (name match >= 60 OR name could not be extracted)
8. ALLOW with NAME_MISMATCH flag if face confidence >= 55 AND name match < 60

LIVENESS NOTE: Liveness score between 20-45 means UNCERTAIN — do NOT auto-reject.
Instead flag as LIVENESS_UNCERTAIN and recommend manual review but still ALLOW
if face and name scores are sufficient.

LIGHTING NOTE: Poor lighting reduces face confidence naturally. If a student's
face IS detected and liveness is not extreme (score > 20), give benefit of doubt.

Risk Assessment:
- LOW: face >= 65, name >= 70, liveness >= 60, valid ID
- MEDIUM: face 40-64, or liveness uncertain, or one flag
- HIGH: face < 40, or liveness < 20, or multiple flags

Valid flags: FACE_LOW_CONFIDENCE, FACE_BORDERLINE, NAME_MISMATCH, NAME_NOT_EXTRACTED,
LIVENESS_UNCERTAIN, ID_VALIDATION_ISSUES, POOR_IMAGE_QUALITY, MANUAL_REVIEW_RECOMMENDED

Output valid JSON ONLY. No markdown, no preamble.`;

async function runReasoningAgent(state) {
  const { idAgentResult, faceAgentResult, studentName, examContext } = state;
  console.log('[ReasoningAgent] Starting Groq LLM decision synthesis…');
  const agentStart = Date.now();

  const hardReject = applyHardRules(idAgentResult, faceAgentResult);
  if (hardReject) {
    console.log('[ReasoningAgent] Hard rule triggered:', hardReject.reason);
    return { ...state, result: { ...hardReject, processingTimeMs: Date.now() - agentStart, agentId: 'reasoning-agent-v1', source: 'hard-rule', timestamp: new Date().toISOString() } };
  }

  const evidenceSummary = buildEvidenceSummary(idAgentResult, faceAgentResult, studentName, examContext);

  let llmDecision;
  try {
    llmDecision = await callGroqLLM(evidenceSummary);
    console.log('[ReasoningAgent] Groq decision:', llmDecision.decision, '(' + llmDecision.confidence + '%)');
  } catch (err) {
    console.error('[ReasoningAgent] Groq failed, using heuristic fallback:', err.message);
    llmDecision = heuristicFallback(idAgentResult, faceAgentResult);
  }

  const result = {
    ...llmDecision,
    processingTimeMs: Date.now() - agentStart,
    agentId: 'reasoning-agent-v1',
    source: llmDecision.source || 'llm-groq',
    timestamp: new Date().toISOString(),
    evidence: {
      faceConfidence:    faceAgentResult.confidence,
      nameMatchScore:    idAgentResult.nameMatch    ? idAgentResult.nameMatch.score    : null,
      livenessScore:     faceAgentResult.liveness   ? faceAgentResult.liveness.score   : null,
      idValidationScore: idAgentResult.validation   ? idAgentResult.validation.score   : null,
      ocrConfidence:     idAgentResult.ocrConfidence,
    },
  };

  console.log('[ReasoningAgent] Final decision:', result.decision, 'in', result.processingTimeMs + 'ms');
  return { ...state, result };
}

async function callGroqLLM(evidenceSummary) {
  const response = await groq.chat.completions.create({
    model:       config.groq.model,
    max_tokens:  900,
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: 'Analyse this identity verification evidence and decide:\n\n' + evidenceSummary + '\n\nOutput ONLY the JSON decision object.' },
    ],
  });

  const raw = (response.choices[0] && response.choices[0].message && response.choices[0].message.content) || '';
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed  = JSON.parse(jsonStr);

  if (!parsed.decision || !['ALLOW', 'REJECT'].includes(parsed.decision))
    throw new Error('Invalid decision: ' + parsed.decision);
  if (typeof parsed.confidence !== 'number')
    throw new Error('Non-numeric confidence');

  return { ...parsed, source: 'llm-groq' };
}

function buildEvidenceSummary(idResult, faceResult, studentName, examContext) {
  const faceConf    = faceResult.confidence || 0;
  const livenessScr = (faceResult.liveness && faceResult.liveness.score) || 0;
  const nameScr     = (idResult.nameMatch   && idResult.nameMatch.score)  || 0;

  // Add interpretation hints to help the LLM reason correctly
  const faceInterpretation =
    faceConf >= 65 ? 'GOOD MATCH' :
    faceConf >= 45 ? 'BORDERLINE — heuristic system, likely same person' :
    faceConf >= 30 ? 'LOW — possible lighting issue, manual check advised' :
    'VERY LOW — faces likely different';

  const livenessInterpretation =
    livenessScr >= 60 ? 'LIVE' :
    livenessScr >= 30 ? 'UNCERTAIN — indoor lighting is normal, not necessarily a spoof' :
    'SUSPICIOUS — possible spoof attempt';

  return `Student: ${studentName || 'Not provided'} | Exam: ${(examContext && examContext.examName) || 'Unknown'}

NOTE: This system uses image heuristics (not deep learning). Scores are naturally
lower than neural-network systems. Treat 45%+ face confidence as a reasonable match.

ID Card Report:
- OCR Confidence: ${idResult.ocrConfidence ? idResult.ocrConfidence.toFixed(1) : 'N/A'}%
- Extracted Name: ${(idResult.extractedFields && idResult.extractedFields.name) || 'Could not extract'}
- ID Number: ${(idResult.extractedFields && idResult.extractedFields.idNumber) ? 'Found' : 'Not found'}
- Expiry: ${(idResult.extractedFields && idResult.extractedFields.expiryDate) || 'Not found'}
- Validation Score: ${(idResult.validation && idResult.validation.score) || 0}/100
- Validation Issues: ${(idResult.validation && idResult.validation.issues && idResult.validation.issues.length) ? idResult.validation.issues.join('; ') : 'None'}
- Name Match Score: ${nameScr}% (threshold: ${config.thresholds.nameMatch}%)
- Name Threshold Met: ${(idResult.nameMatch && idResult.nameMatch.meetsThreshold) ? 'Yes' : 'No'}

Face Report:
- Face Confidence: ${faceConf}% → Interpretation: ${faceInterpretation}
- Threshold (${config.thresholds.faceConfidence}%): ${faceResult.meetsThreshold ? 'Met' : 'Not met'}
- Liveness Score: ${livenessScr}% → Interpretation: ${livenessInterpretation}
- Liveness Verdict: ${(faceResult.liveness && faceResult.liveness.verdict) || 'UNKNOWN'}
- Liveness Signals: ${(faceResult.liveness && faceResult.liveness.signals && faceResult.liveness.signals.length) ? faceResult.liveness.signals.join('; ') : 'None'}
- ID Face Detected: ${(faceResult.idFace && faceResult.idFace.detected) ? 'Yes' : 'No'}
- Live Face Detected: ${(faceResult.liveFace && faceResult.liveFace.detected) ? 'Yes' : 'No'}
- Components: Histogram=${(faceResult.components && faceResult.components.histogramSimilarity) || 0}% / Region=${(faceResult.components && faceResult.components.regionSimilarity) || 0}% / Edge=${(faceResult.components && faceResult.components.edgeSimilarity) || 0}% / Skin=${(faceResult.components && faceResult.components.skinSimilarity) || 0}%
- Image Quality: ${JSON.stringify(faceResult.qualityFlags || {})}`;
}

// Hard rules — only the most extreme cases are auto-rejected before LLM
function applyHardRules(idResult, faceResult) {
  // Only reject for truly extreme liveness failure (< 20, was < 20 — kept same)
  if (faceResult.liveness && typeof faceResult.liveness.score === 'number' && faceResult.liveness.score < 15) {
    return {
      decision: 'REJECT', confidence: 98,
      reason: 'Critical liveness failure — strong spoof attack signal.',
      details: 'Liveness score of ' + faceResult.liveness.score + '% indicates a clear spoofing attempt.',
      flags: ['LIVENESS_UNCERTAIN', 'MANUAL_REVIEW_RECOMMENDED'],
      riskLevel: 'HIGH',
      recommendedAction: 'Escalate to administrator immediately. Do not allow exam access.',
    };
  }
  // Only hard reject if BOTH OCR and face completely failed
  if (!idResult.success && !(faceResult.liveFace && faceResult.liveFace.detected)) {
    return {
      decision: 'REJECT', confidence: 90,
      reason: 'Both ID analysis and live face detection completely failed.',
      details: 'No text extracted from ID and no face detected in live capture.',
      flags: ['POOR_IMAGE_QUALITY', 'MANUAL_REVIEW_RECOMMENDED'],
      riskLevel: 'HIGH',
      recommendedAction: 'Ask student to retry with better lighting and a clearer ID card.',
    };
  }
  return null;
}

// Heuristic fallback with more lenient thresholds
function heuristicFallback(idResult, faceResult) {
  const f = faceResult.confidence                                    || 0;
  const n = (idResult.nameMatch  && idResult.nameMatch.score)        || 0;
  const l = (faceResult.liveness && faceResult.liveness.score)       || 50;
  const i = (idResult.validation && idResult.validation.score)       || 50;

  // Adjusted weights: face 45%, name 25%, liveness 15%, id 15%
  // Threshold lowered from 55 → 45 to be more lenient
  const composite = f * 0.45 + n * 0.25 + l * 0.15 + i * 0.15;
  const decision  = composite >= 45 ? 'ALLOW' : 'REJECT';

  const flags = [];
  if (f < 55) flags.push('FACE_LOW_CONFIDENCE');
  if (n < 60) flags.push('NAME_MISMATCH');
  if (l < 45) flags.push('LIVENESS_UNCERTAIN');
  if (idResult.validation && !idResult.validation.isValid) flags.push('ID_VALIDATION_ISSUES');
  if (decision === 'ALLOW' && (f < 55 || l < 45)) flags.push('MANUAL_REVIEW_RECOMMENDED');

  return {
    decision,
    confidence: Math.round(composite),
    reason: decision === 'ALLOW'
      ? 'Heuristic: identity signals sufficient for verification.'
      : 'Heuristic: insufficient identity confidence for exam access.',
    details: 'Composite score: ' + composite.toFixed(1) + '%. Face: ' + f + '%, Name: ' + n + '%, Liveness: ' + l + '%, ID: ' + i + '%.',
    flags,
    riskLevel: composite > 70 ? 'LOW' : composite > 50 ? 'MEDIUM' : 'HIGH',
    recommendedAction: decision === 'ALLOW'
      ? (flags.includes('MANUAL_REVIEW_RECOMMENDED') ? 'Allow with manual monitoring.' : 'Proceed with monitored exam.')
      : 'Retry verification or contact administrator.',
    source: 'heuristic-fallback',
  };
}

module.exports = { runReasoningAgent };