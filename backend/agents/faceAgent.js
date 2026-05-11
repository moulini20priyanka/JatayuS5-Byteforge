// agents/faceAgent.js — CommonJS version with improved accuracy
const { analyseFace, compareFaceAnalyses } = require('../services/faceService');
const config = require('../config/index');

async function runFaceAgent(state) {
  const { idImageBuffer, liveImageBuffer } = state;
  console.log('[FaceAgent] Starting face analysis pipeline…');
  const agentStart = Date.now();

  let idAnalysis;
  try {
    idAnalysis = await analyseFace(idImageBuffer);
    console.log('[FaceAgent] ID face: detected=' + idAnalysis.faceDetected + ', lum=' + idAnalysis.avgLuminance.toFixed(1));
  } catch (err) {
    const msg = 'ID face analysis failed: ' + err.message;
    console.error('[FaceAgent]', msg);
    return { ...state, result: buildFailureResult(msg), error: msg };
  }

  let liveAnalysis;
  try {
    liveAnalysis = await analyseFace(liveImageBuffer);
    console.log('[FaceAgent] Live face: detected=' + liveAnalysis.faceDetected + ', live=' + liveAnalysis.isLikelyLive);
  } catch (err) {
    const msg = 'Live face analysis failed: ' + err.message;
    console.error('[FaceAgent]', msg);
    return { ...state, result: buildFailureResult(msg), error: msg };
  }

  const comparison   = compareFaceAnalyses(idAnalysis, liveAnalysis);
  console.log('[FaceAgent] Face confidence: ' + comparison.confidence + '%');

  const livenessResult = assessLiveness(liveAnalysis);
  console.log('[FaceAgent] Liveness: ' + livenessResult.score + '% (' + livenessResult.verdict + ')');

  const meetsThreshold = comparison.confidence >= config.thresholds.faceConfidence;

  const result = {
    success: true,
    confidence: comparison.confidence,
    meetsThreshold,
    components: comparison.components,
    liveness: livenessResult,
    idFace: {
      detected:         idAnalysis.faceDetected,
      avgLuminance:     Math.round(idAnalysis.avgLuminance),
      edgeDensity:      parseFloat(idAnalysis.edgeDensity.toFixed(4)),
      processingTimeMs: idAnalysis.processingTimeMs,
    },
    liveFace: {
      detected:         liveAnalysis.faceDetected,
      avgLuminance:     Math.round(liveAnalysis.avgLuminance),
      edgeDensity:      parseFloat(liveAnalysis.edgeDensity.toFixed(4)),
      processingTimeMs: liveAnalysis.processingTimeMs,
      isLive:           liveAnalysis.isLikelyLive,
    },
    qualityFlags:     buildQualityFlags(idAnalysis, liveAnalysis),
    processingTimeMs: Date.now() - agentStart,
    agentId:          'face-agent-v1',
    timestamp:        new Date().toISOString(),
  };

  console.log('[FaceAgent] Done in ' + result.processingTimeMs + 'ms. Verdict: ' + (meetsThreshold ? 'PASS' : 'FAIL'));
  return { ...state, result };
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVED LIVENESS — much more lenient for real-world indoor lighting
// Key insight: ID card photos are ALWAYS low-liveness by nature (flat, printed)
// so we should NOT penalize the live capture for normal indoor conditions.
// ─────────────────────────────────────────────────────────────────────────────
function assessLiveness(analysis) {
  const signals = [];
  let score = 100;
  let deductions = 0;

  // SIGNAL 1: Extremely uniform luminance (STRONG spoof signal)
  // Real face = variance > 2. Printed photo shown to camera = near 0.
  // Raised threshold from 5 → 2 to avoid penalizing dim rooms.
  if (analysis.luminanceVariance < 2) {
    deductions += 35;
    signals.push('Extremely uniform luminance — strong spoof indicator');
  } else if (analysis.luminanceVariance < 4) {
    deductions += 15;
    signals.push('Low luminance variance — possible flat display');
  }

  // SIGNAL 2: Overexposed (very bright screen/flash)
  // Raised from 0.6 → 0.75 — bright rooms are common, not spoofs.
  if (analysis.brightPixelRatio > 0.75) {
    deductions += 20;
    signals.push('Very high bright pixel ratio — possible screen glare or flash');
  } else if (analysis.brightPixelRatio > 0.65) {
    deductions += 8;
    signals.push('Elevated bright pixel ratio — check lighting');
  }

  // SIGNAL 3: Too dark (occluded or no light)
  // Raised from 0.6 → 0.70 — slightly dim rooms should not fail.
  if (analysis.darkPixelRatio > 0.70) {
    deductions += 25;
    signals.push('High dark pixel ratio — insufficient lighting');
  } else if (analysis.darkPixelRatio > 0.55) {
    deductions += 10;
    signals.push('Moderately dark image — improve lighting if possible');
  }

  // SIGNAL 4: No face detected at all
  if (!analysis.faceDetected) {
    deductions += 35;
    signals.push('No face detected in live capture');
  }

  // SIGNAL 5: Very low skin ratio (face heavily obscured)
  // Lowered threshold from 0.05 → 0.03 — darker skin tones have lower ratio.
  if (analysis.centreSkinRatio < 0.03) {
    deductions += 15;
    signals.push('Very low skin tone ratio — face may be obscured or covered');
  }

  score = Math.max(0, Math.min(100, 100 - deductions));

  // More lenient verdict thresholds:
  // Old: LIVE>=60, UNCERTAIN>=30, SPOOF<30
  // New: LIVE>=45, UNCERTAIN>=20, SPOOF<20
  // Reasoning: heuristic liveness is imprecise; err on side of letting humans through.
  return {
    score,
    verdict: score >= 45 ? 'LIVE' : score >= 20 ? 'UNCERTAIN' : 'SPOOF',
    signals,
    isLive: score >= 45,
  };
}

function buildQualityFlags(idAnalysis, liveAnalysis) {
  return {
    idImageQuality:    idAnalysis.avgLuminance > 20 && idAnalysis.avgLuminance < 240 ? 'good' : 'poor',
    liveImageQuality:  liveAnalysis.avgLuminance > 20 && liveAnalysis.avgLuminance < 240 ? 'good' : 'poor',
    idFaceVisible:     idAnalysis.faceDetected,
    liveFaceVisible:   liveAnalysis.faceDetected,
    livenessConfirmed: liveAnalysis.isLikelyLive,
  };
}

function buildFailureResult(errorMsg) {
  return {
    success: false,
    error: errorMsg,
    confidence: 0,
    meetsThreshold: false,
    liveness: { score: 0, verdict: 'UNKNOWN', signals: [errorMsg], isLive: false },
    processingTimeMs: 0,
    agentId: 'face-agent-v1',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { runFaceAgent };