// services/faceService.js — CommonJS, improved accuracy for real-world conditions
const sharp = require('sharp');

async function analyseFace(imageBuffer) {
  const startTime = Date.now();

  // ── Normalise to canonical size ───────────────────────────────────────────
  // Use 160x160 (was 128x128) — more pixels = better histogram resolution
  const canonical = await sharp(imageBuffer)
    .resize(160, 160, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .toBuffer();

  const { data: rawPixels, info } = await sharp(canonical).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const totalPixels = width * height;

  // ── Luminance histogram (64 bins) ─────────────────────────────────────────
  const histogram = new Array(64).fill(0);
  let totalLuminance = 0, darkPixels = 0, brightPixels = 0;

  for (let i = 0; i < rawPixels.length; i += 3) {
    const r = rawPixels[i], g = rawPixels[i + 1], b = rawPixels[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    histogram[Math.floor(lum / 4)]++;
    totalLuminance += lum;
    if (lum < 64)  darkPixels++;
    if (lum > 192) brightPixels++;
  }

  const avgLuminance = totalLuminance / totalPixels;

  // ── Normalise histogram before comparison ─────────────────────────────────
  // ID card photos tend to be brighter/flatter than live captures.
  // Normalising removes absolute brightness differences so we compare
  // SHAPE of histogram, not absolute exposure.
  const histSum = histogram.reduce((a, b) => a + b, 0) || 1;
  const normHistogram = histogram.map(v => v / histSum);

  // ── Edge density (Sobel) ──────────────────────────────────────────────────
  const grayData = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const p = i * 3;
    grayData[i] = Math.round(0.299 * rawPixels[p] + 0.587 * rawPixels[p+1] + 0.114 * rawPixels[p+2]);
  }

  let edgeCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = -grayData[idx-width-1] + grayData[idx-width+1]
               - 2*grayData[idx-1]      + 2*grayData[idx+1]
               - grayData[idx+width-1]  + grayData[idx+width+1];
      const gy =  grayData[idx-width-1] + 2*grayData[idx-width] + grayData[idx-width+1]
               - grayData[idx+width-1] - 2*grayData[idx+width]  - grayData[idx+width+1];
      if (Math.sqrt(gx*gx + gy*gy) > 25) edgeCount++; // lowered from 30 → 25
    }
  }
  const edgeDensity = edgeCount / totalPixels;

  // ── Region colour stats (face thirds) ────────────────────────────────────
  const regions = computeRegionStats(rawPixels, width, height);

  // ── Liveness helpers ──────────────────────────────────────────────────────
  const luminanceVariance = computeVariance(histogram);

  // More lenient isLikelyLive — indoor dim lighting (lum > 25) is fine
  const isLikelyLive = (
    avgLuminance > 25 && avgLuminance < 235 &&
    edgeDensity  > 0.03 && edgeDensity < 0.65 &&
    darkPixels   / totalPixels < 0.65 &&
    brightPixels / totalPixels < 0.65
  );

  // ── Face presence ─────────────────────────────────────────────────────────
  // Lowered skin ratio threshold (0.08 → 0.05) for darker skin tones
  const centreSkinRatio = computeSkinRatio(rawPixels, width, height);
  const faceDetected    = centreSkinRatio > 0.05 || edgeDensity > 0.06;

  return {
    histogram,
    normHistogram,   // ← NEW: used for improved comparison
    avgLuminance, edgeDensity, luminanceVariance,
    darkPixelRatio:   darkPixels   / totalPixels,
    brightPixelRatio: brightPixels / totalPixels,
    regions, centreSkinRatio, faceDetected, isLikelyLive,
    processingTimeMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVED FACE COMPARISON
// Key changes vs original:
//  1. Use normalised histograms → removes lighting difference penalty
//  2. More lenient confidence floor (penalty reduced)
//  3. Wider edge similarity tolerance (real photos vs live have different sharpness)
//  4. Added luminance-difference compensation
// ─────────────────────────────────────────────────────────────────────────────
function compareFaceAnalyses(analysisA, analysisB) {
  // Use normalised histogram if available, fall back to raw
  const hA = analysisA.normHistogram || analysisA.histogram;
  const hB = analysisB.normHistogram || analysisB.histogram;

  // Bhattacharyya on normalised histograms
  const histScore = bhattacharyyaCoefficient(hA, hB);

  // Region similarity — compensate for brightness difference between ID photo and live
  const regionScore = regionSimilarityWithCompensation(analysisA.regions, analysisB.regions);

  // Edge similarity — widen tolerance (ID photos are sharper than webcam captures)
  // Old: edgeDiff * 5. New: edgeDiff * 3 — less harsh
  const edgeDiff  = Math.abs(analysisA.edgeDensity - analysisB.edgeDensity);
  const edgeScore = Math.max(0, 1 - edgeDiff * 3);

  // Skin ratio similarity — same person, similar skin ratio
  const skinDiff  = Math.abs(analysisA.centreSkinRatio - analysisB.centreSkinRatio);
  const skinScore = Math.max(0, 1 - skinDiff * 3);

  // Luminance compensation bonus:
  // ID card photos are often brighter (scanned/photographed under good light).
  // If both images have reasonable luminance, give a small boost.
  const lumA = analysisA.avgLuminance, lumB = analysisB.avgLuminance;
  const lumDiff = Math.abs(lumA - lumB);
  // Penalise only very large luminance gaps (> 80 out of 255)
  const lumPenalty = lumDiff > 80 ? Math.min(0.15, (lumDiff - 80) / 400) : 0;

  const rawScore = (
    histScore   * 0.40 +
    regionScore * 0.30 +
    edgeScore   * 0.20 +
    skinScore   * 0.10
  ) * 100 - (lumPenalty * 100);

  // Apply face/liveness penalties — but less aggressively
  let confidence = rawScore;

  // If neither image has a face, hard penalty
  if (!analysisA.faceDetected && !analysisB.faceDetected) {
    confidence *= 0.3;
  } else if (!analysisA.faceDetected || !analysisB.faceDetected) {
    // Only one image missing face — softer penalty (was 0.4)
    confidence *= 0.6;
  }

  // Liveness penalty only for live image — ID photo will never be "live"
  // Old: penalise analysisA (ID image) for not being live — WRONG
  // New: only penalise analysisB (live capture) if clearly not live
  if (!analysisB.isLikelyLive && analysisB.darkPixelRatio > 0.65) {
    confidence *= 0.7; // much darker than old 0.6
  }

  return {
    confidence: Math.min(100, Math.max(0, Math.round(confidence))),
    components: {
      histogramSimilarity: Math.round(histScore   * 100),
      regionSimilarity:    Math.round(regionScore * 100),
      edgeSimilarity:      Math.round(edgeScore   * 100),
      skinSimilarity:      Math.round(skinScore   * 100),
    },
    livenessDetected:   analysisA.isLikelyLive || analysisB.isLikelyLive,
    faceDetectedInID:   analysisA.faceDetected,
    faceDetectedInLive: analysisB.faceDetected,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function bhattacharyyaCoefficient(h1, h2) {
  // Works on both raw (needs normalisation) and pre-normalised arrays
  const sum1 = h1.reduce((a, b) => a + b, 0);
  const sum2 = h2.reduce((a, b) => a + b, 0);
  // If already normalised (sum ≈ 1), don't re-normalise
  const n1 = sum1 > 1.01 ? h1.map(v => v / sum1) : h1;
  const n2 = sum2 > 1.01 ? h2.map(v => v / sum2) : h2;
  let bc = 0;
  for (let i = 0; i < n1.length; i++) bc += Math.sqrt(n1[i] * n2[i]);
  return Math.min(1, bc);
}

function computeRegionStats(pixels, width, height) {
  const thirds = [
    { startRow: 0,                          endRow: Math.floor(height / 3) },
    { startRow: Math.floor(height / 3),     endRow: Math.floor(2 * height / 3) },
    { startRow: Math.floor(2 * height / 3), endRow: height },
  ];
  return thirds.map(({ startRow, endRow }) => {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let y = startRow; y < endRow; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        rSum += pixels[idx]; gSum += pixels[idx+1]; bSum += pixels[idx+2]; count++;
      }
    }
    return { r: rSum/count, g: gSum/count, b: bSum/count };
  });
}

// NEW: brightness-compensated region similarity
// Shifts region colours by the mean brightness difference before comparing
function regionSimilarityWithCompensation(regA, regB) {
  if (!regA || !regB || regA.length !== regB.length) return 0;

  // Compute mean brightness of each image
  const meanA = regA.reduce((s, r) => s + (r.r + r.g + r.b) / 3, 0) / regA.length;
  const meanB = regB.reduce((s, r) => s + (r.r + r.g + r.b) / 3, 0) / regB.length;
  const brightnessDiff = meanA - meanB;

  let total = 0;
  for (let i = 0; i < regA.length; i++) {
    // Compensate: shift B region colours by the brightness difference
    const rDiff = Math.abs(regA[i].r - (regB[i].r + brightnessDiff)) / 255;
    const gDiff = Math.abs(regA[i].g - (regB[i].g + brightnessDiff)) / 255;
    const bDiff = Math.abs(regA[i].b - (regB[i].b + brightnessDiff)) / 255;
    total += 1 - Math.min(1, (rDiff + gDiff + bDiff) / 3);
  }
  return total / regA.length;
}

function computeVariance(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
}

function computeSkinRatio(pixels, width, height) {
  const x0 = Math.floor(width * 0.25),  x1 = Math.floor(width * 0.75);
  const y0 = Math.floor(height * 0.25), y1 = Math.floor(height * 0.75);
  let skin = 0, total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 3;
      if (isSkinTone(pixels[idx], pixels[idx+1], pixels[idx+2])) skin++;
      total++;
    }
  }
  return skin / (total || 1);
}

// Improved skin tone detector — wider range covers more ethnicities and lighting
function isSkinTone(r, g, b) {
  // RGB rule (classic, works for lighter tones)
  const rgbSkin = (
    r > 80 && g > 30 && b > 15 &&   // lowered minimums
    r > g  && r > b  &&
    Math.abs(r - g) > 10 &&           // lowered from 15
    r - Math.min(g, b) > 10           // lowered from 15
  );

  // YCbCr rule (works for darker tones under various lighting)
  const y  =  0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.169 * r - 0.331 * g + 0.499 * b + 128;
  const cr =  0.499 * r - 0.418 * g - 0.082 * b + 128;
  // Widened Cb/Cr ranges for better ethnic diversity coverage
  const ycbcrSkin = (y > 60 && cb >= 80 && cb <= 140 && cr >= 130 && cr <= 185);

  // HSV-based rule for very warm/amber skin tones
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
  const delta = maxC - minC;
  let hue = 0;
  if (delta > 0) {
    if (maxC === r) hue = 60 * (((g - b) / delta) % 6);
    else if (maxC === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
  }
  const saturation = maxC === 0 ? 0 : delta / maxC;
  const hsvSkin = (hue >= 0 && hue <= 40 && saturation > 0.15 && maxC > 60);

  return rgbSkin || ycbcrSkin || hsvSkin;
}

module.exports = { analyseFace, compareFaceAnalyses };