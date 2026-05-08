// services/ocrService.js — CommonJS version (matches server.js style)
const Tesseract = require('tesseract.js');
const sharp     = require('sharp');
const config    = require('../config/index');

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE PREPROCESSING
// ─────────────────────────────────────────────────────────────────────────────
async function preprocessImage(imageBuffer) {
  try {
    return await sharp(imageBuffer)
      .resize({ width: 1200, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 })
      .toBuffer();
  } catch (err) {
    console.warn('[OCR] Preprocessing failed, using original:', err.message);
    return imageBuffer;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN OCR EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────
async function extractIDCardText(imageBuffer) {
  const startTime = Date.now();
  const preprocessed = await preprocessImage(imageBuffer);

  const result = await Tesseract.recognize(preprocessed, config.ocr.language, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write('\r[OCR] Progress: ' + Math.round(m.progress * 100) + '%');
      }
    },
  });

  console.log('\n[OCR] Recognition complete in ' + (Date.now() - startTime) + 'ms');

  const rawText   = result.data.text;
  const confidence = result.data.confidence;
  const words      = result.data.words || [];
  const fields     = parseIDCardFields(rawText, words);

  return {
    rawText,
    confidence,
    fields,
    processingTimeMs: Date.now() - startTime,
    wordCount: words.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD PARSER
// ─────────────────────────────────────────────────────────────────────────────
function parseIDCardFields(rawText, words) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const fields = {
    name: null, dateOfBirth: null, idNumber: null,
    expiryDate: null, issueDate: null, nationality: null,
    gender: null, address: null, allText: rawText,
  };

  // ── Name ──────────────────────────────────────────────────────────────────
  const namePatterns = [
    /(?:name|full name|surname)[:\s]+([A-Za-z\s,'-]{3,50})/i,
    /(?:last name|first name)[:\s]+([A-Za-z\s,'-]{2,30})/i,
    /^([A-Z][A-Z\s,'-]{6,40})$/,
  ];
  for (const pattern of namePatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        const candidate = match[1].trim().replace(/\s+/g, ' ');
        if (candidate.length >= 4) { fields.name = titleCase(candidate); break; }
      }
    }
    if (fields.name) break;
  }
  if (!fields.name) {
    const capsLines = lines.filter(l => /^[A-Z\s,'-]+$/.test(l) && l.length > 5);
    if (capsLines.length > 0)
      fields.name = titleCase(capsLines.sort((a, b) => b.length - a.length)[0]);
  }

  // ── Date of Birth ─────────────────────────────────────────────────────────
  const dobMatch = rawText.match(/(?:dob|date of birth|birth date|born)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (dobMatch) fields.dateOfBirth = dobMatch[1].trim();

  // ── ID Number ─────────────────────────────────────────────────────────────
  const idPatterns = [
    /(?:id no|id number|document no|card no|license no|number)[:\s]+([A-Z0-9-]{5,20})/i,
    /\b([A-Z]{1,3}[0-9]{6,10})\b/,
    /\b([0-9]{8,12})\b/,
  ];
  for (const pattern of idPatterns) {
    const match = rawText.match(pattern);
    if (match) { fields.idNumber = match[1].trim(); break; }
  }

  // ── Expiry Date ───────────────────────────────────────────────────────────
  const expiryMatch = rawText.match(/(?:expiry|expires|valid until|exp)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{2}[-/]\d{2})/i);
  if (expiryMatch) fields.expiryDate = expiryMatch[1];

  // ── Nationality ───────────────────────────────────────────────────────────
  const natMatch = rawText.match(/(?:nationality|citizen)[:\s]+([A-Za-z\s]{3,30})/i);
  if (natMatch) fields.nationality = natMatch[1].trim();

  // ── Gender ────────────────────────────────────────────────────────────────
  const genderMatch = rawText.match(/(?:sex|gender)[:\s]*(M|F|Male|Female)/i);
  if (genderMatch) fields.gender = genderMatch[1].toUpperCase().startsWith('M') ? 'Male' : 'Female';

  return fields;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAME COMPARISON (Levenshtein)
// ─────────────────────────────────────────────────────────────────────────────
function compareNames(name1, name2) {
  if (!name1 || !name2) return 0;

  const normalize = (s) => s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  if (n1 === n2) return 100;

  const distance    = levenshtein(n1, n2);
  const maxLen      = Math.max(n1.length, n2.length);
  const similarity  = ((maxLen - distance) / maxLen) * 100;
  const containsScore = (n1.includes(n2) || n2.includes(n1)) ? 80 : 0;

  return Math.round(Math.max(similarity, containsScore));
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─────────────────────────────────────────────────────────────────────────────
// ID CARD VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function validateIDCard(ocrResult) {
  const issues = [];
  const { fields, confidence, wordCount } = ocrResult;

  if (confidence < 30)  issues.push('OCR confidence too low — image may be blurry');
  if (wordCount < 5)    issues.push('Too few words detected — may not be a valid ID card');
  if (!fields.name)     issues.push('Could not extract name from ID card');
  if (!fields.idNumber) issues.push('Could not extract ID number');

  if (fields.expiryDate) {
    const expiry = parseDate(fields.expiryDate);
    if (expiry && expiry < new Date())
      issues.push('ID card appears expired (' + fields.expiryDate + ')');
  }

  return {
    isValid: issues.length === 0,
    issues,
    score: Math.max(0, 100 - issues.length * 25),
  };
}

function parseDate(dateStr) {
  try { return new Date(dateStr); } catch { return null; }
}

function titleCase(str) {
  return str.toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { extractIDCardText, compareNames, validateIDCard };