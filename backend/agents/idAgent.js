// agents/idAgent.js — CommonJS version
const { extractIDCardText, validateIDCard, compareNames } = require('../services/ocrService');
const config = require('../config/index');

async function runIDAgent(state) {
  const { idImageBuffer, studentName } = state;
  console.log('[IDAgent] Starting ID card analysis…');
  const agentStart = Date.now();

  let ocrResult;
  try {
    ocrResult = await extractIDCardText(idImageBuffer);
    console.log('[IDAgent] OCR complete. Confidence: ' + ocrResult.confidence + '%, Words: ' + ocrResult.wordCount);
  } catch (err) {
    const errorMsg = 'OCR extraction failed: ' + err.message;
    console.error('[IDAgent]', errorMsg);
    return { ...state, result: buildFailureResult(errorMsg), error: errorMsg };
  }

  const validation = validateIDCard(ocrResult);
  console.log('[IDAgent] Validation: ' + (validation.isValid ? 'PASS' : 'FAIL') + ' (' + (validation.issues.join(', ') || 'no issues') + ')');

  let nameMatchScore = 0;
  if (studentName && ocrResult.fields.name) {
    nameMatchScore = compareNames(studentName, ocrResult.fields.name);
    console.log('[IDAgent] Name match: "' + studentName + '" <-> "' + ocrResult.fields.name + '" = ' + nameMatchScore + '%');
  }

  const result = {
    success: true,
    ocrConfidence: ocrResult.confidence,
    extractedFields: ocrResult.fields,
    rawText: ocrResult.rawText,
    wordCount: ocrResult.wordCount,
    validation: {
      isValid: validation.isValid,
      score: validation.score,
      issues: validation.issues,
    },
    nameMatch: {
      score: nameMatchScore,
      provided: studentName || null,
      extracted: ocrResult.fields.name,
      meetsThreshold: nameMatchScore >= config.thresholds.nameMatch,
    },
    processingTimeMs: Date.now() - agentStart,
    agentId: 'id-agent-v1',
    timestamp: new Date().toISOString(),
  };

  console.log('[IDAgent] Done in ' + result.processingTimeMs + 'ms. Name match: ' + nameMatchScore + '%');
  return { ...state, result };
}

function buildFailureResult(errorMsg) {
  return {
    success: false,
    error: errorMsg,
    ocrConfidence: 0,
    extractedFields: {},
    validation: { isValid: false, score: 0, issues: [errorMsg] },
    nameMatch: { score: 0, meetsThreshold: false },
    processingTimeMs: 0,
    agentId: 'id-agent-v1',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { runIDAgent };