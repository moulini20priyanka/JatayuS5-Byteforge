// backend/services/studentValidationAgent.js
// AI layer now wrapped in tracer for LangSmith token tracking

'use strict';

const db         = require('../config/db');
const { trace }  = require('../utils/tracer');

const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) console.warn('[ValidationAgent] GROQ_API_KEY not set — AI layer disabled.');
  return key || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — RULE-BASED ENGINE  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','trashmail.com','dispostable.com',
  'maildrop.cc','spam4.me','tempr.email','fakeinbox.com','getairmail.com',
  'mailnull.com','discard.email','spamgourmet.com','mailnesia.com',
  '0-mail.com','0815.ru','10minutemail.com','20minutemail.com',
  'guerrillamailblock.com','bccto.me','spamhereplease.com','mailexpire.com',
  'filzmail.com','throwam.com','dumpmail.com','trashmail.at',
]);

const SUSPICIOUS_LOCAL_PATTERNS = [
  { re: /^(test|fake|dummy|temp|sample|nobody|null|undefined|noreply|admin|root)\d*$/i, code: 'RESERVED_USERNAME',  msg: 'Email username is a reserved/test word' },
  { re: /^[a-z]{1,2}\d{5,}$/i,  code: 'AUTOGEN_USERNAME',    msg: 'Email username looks auto-generated (short prefix + long number)' },
  { re: /(.)\1{4,}/,             code: 'REPEATED_CHARS',       msg: 'Email username contains excessive repeated characters' },
  { re: /^[0-9]+$/,              code: 'NUMERIC_ONLY_LOCAL',   msg: 'Email username is purely numeric — unusual for a student' },
  { re: /^[a-z]{10,}$/i,        code: 'LONG_RANDOM_STRING',   msg: 'Email username looks like a random string (long lowercase, no numbers)' },
  { re: /qwerty|asdfgh|zxcvbn/i, code: 'KEYBOARD_MASH',       msg: 'Email username contains keyboard-mash pattern' },
  { re: /^(.+)\1+$/i,           code: 'REPEATING_PATTERN',    msg: 'Email username appears to be a repeating pattern' },
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i === 0 ? Array.from({ length: n + 1 }, (_, j) => j) : [i, ...Array(n).fill(0)]);
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function canonicalEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.toLowerCase().trim().split('@');
  return `${local.replace(/\+.*$/, '').replace(/\./g, '')}@${domain}`;
}

function ruleBasedValidate(student) {
  const issues   = [];
  const warnings = [];
  let   risk     = 0;

  const email = (student.email || '').toLowerCase().trim();
  const name  = (student.name  || '').trim();

  if (!email) {
    issues.push({ code: 'MISSING_EMAIL', message: 'Email address is required', severity: 'error' }); risk += 40;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ code: 'INVALID_EMAIL_FORMAT', message: 'Email address format is invalid', severity: 'error' }); risk += 40;
  } else {
    const [local, domain] = email.split('@');
    if (DISPOSABLE_DOMAINS.has(domain)) {
      issues.push({ code: 'DISPOSABLE_DOMAIN', message: `Disposable email provider detected: @${domain}`, severity: 'error' }); risk += 55;
    }
    for (const { re, code, msg } of SUSPICIOUS_LOCAL_PATTERNS) {
      if (re.test(local)) { warnings.push({ code, message: msg, severity: 'warning' }); risk += 20; break; }
    }
    if (local.includes('+')) { warnings.push({ code: 'PLUS_ALIAS', message: 'Email uses + alias trick', severity: 'warning' }); risk += 15; }
    if (['gmail.com','yahoo.com','outlook.com','hotmail.com','rediffmail.com'].includes(domain)) {
      warnings.push({ code: 'PERSONAL_EMAIL', message: 'Personal email — verify student identity', severity: 'info' }); risk += 5;
    }
  }

  if (!name) {
    issues.push({ code: 'MISSING_NAME', message: 'Full name is required', severity: 'error' }); risk += 30;
  } else {
    if (name.length < 3)            { warnings.push({ code: 'NAME_TOO_SHORT',      message: 'Name is suspiciously short',             severity: 'warning' }); risk += 10; }
    if (/^\d+$/.test(name))         { issues.push  ({ code: 'NUMERIC_NAME',        message: 'Name is purely numeric',                 severity: 'error'   }); risk += 40; }
    if (/(.)\1{3,}/.test(name))     { warnings.push({ code: 'REPEATED_CHARS_NAME', message: 'Name has suspicious repeated characters',severity: 'warning' }); risk += 15; }
    if (/^(test|fake|dummy|sample|admin|nobody|asdf|qwerty)/i.test(name))
                                    { issues.push  ({ code: 'FAKE_NAME',           message: 'Name matches a test/fake pattern',       severity: 'error'   }); risk += 45; }
    if (name.split(' ').every(w => w.length === 1))
                                    { warnings.push({ code: 'SINGLE_CHAR_PARTS',   message: 'Name parts are single characters',       severity: 'warning' }); risk += 10; }
  }

  const batchYear = parseInt(student.batch, 10);
  if (student.batch && (isNaN(batchYear) || batchYear < 2018 || batchYear > 2030)) {
    warnings.push({ code: 'UNUSUAL_BATCH', message: `Batch year ${student.batch} is outside expected range (2018–2030)`, severity: 'warning' }); risk += 10;
  }

  if (student.cgpa !== undefined && student.cgpa !== null && student.cgpa !== '') {
    const cgpa = parseFloat(student.cgpa);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) { issues.push({ code: 'INVALID_CGPA', message: `CGPA ${student.cgpa} is out of range (0–10)`, severity: 'error' }); risk += 15; }
    if (cgpa === 10) { warnings.push({ code: 'PERFECT_CGPA', message: 'CGPA of exactly 10.0 — verify accuracy', severity: 'info' }); }
  }

  for (const field of ['tenth_percentage', 'twelfth_percentage']) {
    if (student[field] !== undefined && student[field] !== '') {
      const val = parseFloat(student[field]);
      if (isNaN(val) || val < 0 || val > 100) { issues.push({ code: `INVALID_${field.toUpperCase()}`, message: `${field.replace('_', ' ')} must be 0–100`, severity: 'error' }); risk += 10; }
    }
  }

  return { issues, warnings, riskScore: Math.min(risk, 100) };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — DATABASE DUPLICATE CHECK  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

async function checkDatabaseDuplicates(students) {
  const emails = students.map(s => (s.email || '').toLowerCase().trim()).filter(Boolean);
  if (!emails.length) return new Map();
  try {
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await db.query(`SELECT id, name, email, college, branch, batch, created_at FROM candidates WHERE email IN (${placeholders})`, emails);
    const map = new Map();
    for (const row of rows) map.set(row.email.toLowerCase(), row);
    return map;
  } catch (err) {
    console.warn('[ValidationAgent] DB duplicate check failed:', err.message);
    return new Map();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — WITHIN-BATCH NEAR-DUPLICATE DETECTION  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function detectNearDuplicates(students) {
  const canonicals = students.map((s, i) => ({ i, raw: (s.email || '').toLowerCase().trim(), canon: canonicalEmail(s.email || '') }));
  const pairs = [];
  for (let a = 0; a < canonicals.length; a++) {
    for (let b = a + 1; b < canonicals.length; b++) {
      const ca = canonicals[a], cb = canonicals[b];
      if (ca.canon === cb.canon && ca.raw !== cb.raw) { pairs.push({ indexA: a, indexB: b, emailA: ca.raw, emailB: cb.raw, distance: 0, type: 'alias' }); continue; }
      if (ca.canon && cb.canon) {
        const dist = levenshtein(ca.canon, cb.canon);
        if (dist > 0 && dist <= 2) pairs.push({ indexA: a, indexB: b, emailA: ca.raw, emailB: cb.raw, distance: dist, type: 'typo' });
      }
    }
  }
  return pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4 — AI VALIDATION  ← NOW TRACED
// ─────────────────────────────────────────────────────────────────────────────

async function aiValidateBatch(batch) {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  const systemPrompt = `You are a Student Data Integrity AI embedded in a university placement system (NeuroAssess, Chennai, Tamil Nadu, India).
Your job: detect fake, test, or fraudulent student records before they enter the database.

IMPORTANT CULTURAL CONTEXT:
- Records are for students from Tamil Nadu engineering colleges (RMKEC, RMDEC, RMKCET, etc.)
- Tamil names are perfectly valid even when they look unusual to Western systems
  (e.g. "Kavithaa K A", "Moulini S", "Anusha P M" are REAL names — never flag these)
- Institutional emails like @rmkec.ac.in, @rmdec.ac.in, @rmkcet.ac.in are PREFERRED and TRUSTED
- Personal emails (gmail, yahoo) are common for students and not inherently suspicious

Flag ONLY genuinely problematic records:
1. Clearly fake names (test, admin, aaa, 12345, keyboard mash like "asdfgh")
2. Auto-generated email patterns (random hex strings, sequential numbers)
3. Implausible combinations (name="Test User", email="test123@gmail.com")
4. Copy-paste duplicates (identical data except email)
5. Batch-level anomalies (10 records with sequential emails like user1@, user2@, ...)`;

  const userPrompt = `Validate these student records and return a JSON array.

Records (0-indexed):
${JSON.stringify(batch, null, 2)}

IMPORTANT: Return ONLY a valid JSON array — no markdown fences, no explanation, no preamble, nothing else.
One object per record in the same order:
[
  {
    "index": 0,
    "aiRiskScore": 0,
    "aiVerdict": "PASS",
    "aiReason": "One concise sentence",
    "aiFlags": []
  }
]

aiVerdict rules:
- "PASS"  → aiRiskScore 0–29
- "WARN"  → aiRiskScore 30–59
- "BLOCK" → aiRiskScore 60+

aiFlags schema:
{ "code": "SNAKE_CASE_CODE", "message": "Human readable issue", "severity": "error|warning|info" }`;

  // ── WRAPPED IN TRACE ──────────────────────────────────────────────────────
  return trace(
    {
      name:    'student-validation-agent',
      runType: 'llm',
      inputs:  { batch_size: batch.length, sample_email: batch[0]?.email || '' },
      tags:    ['validation-agent', 'groq'],
    },
    async () => {
      try {
        const response = await fetch(GROQ_API_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model:       GROQ_MODEL,
            max_tokens:  2048,
            temperature: 0.1,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt   },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[ValidationAgent] Groq API error ${response.status}:`, errText);
          return { __result: null, __usage: null };
        }

        const data   = await response.json();
        const usage  = data.usage || null;   // ← Groq always returns this
        const raw    = (data.choices?.[0]?.message?.content || '[]')
          .replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        console.log(`[ValidationAgent] AI validated ${batch.length} records via Groq ${GROQ_MODEL}`);

        return { __result: parsed, __usage: usage };

      } catch (err) {
        console.warn('[ValidationAgent] AI validation error:', err.message);
        return { __result: null, __usage: null };
      }
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6 — AUDIT LOG  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

async function writeValidationAudit({ adminId, adminName, studentEmail, studentName, allFlags, verdict, ipAddress, userAgent }) {
  try {
    const action = verdict === 'BLOCK' ? 'AI_VALIDATION_BLOCKED' : 'AI_VALIDATION_FLAGGED';
    await db.query(
      `INSERT INTO audit_logs (admin_id, admin_name, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, 'candidate_validation', ?, ?, ?, ?, NOW())`,
      [adminId||null, adminName||'System', action, studentEmail, JSON.stringify({ studentName, verdict, flags: allFlags }), ipAddress||'Unknown', userAgent||'Unknown']
    );
  } catch (err) {
    console.warn('[ValidationAgent] Audit write failed (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API  (unchanged signatures)
// ─────────────────────────────────────────────────────────────────────────────

async function validateStudents(students, options = {}) {
  const { adminId, adminName, ipAddress, userAgent, writeAudit = true } = options;

  const results = students.map((s, i) => ({
    index: i, email: (s.email || '').toLowerCase().trim(), name: (s.name || '').trim(),
    verdict: 'PASS', isDuplicate: false, existingRecord: null, nearDuplicates: [],
    aiVerdict: null, aiReason: null, aiFlags: [],
    ...ruleBasedValidate(s),
  }));

  const dbMap = await checkDatabaseDuplicates(students);
  for (const r of results) {
    const existing = dbMap.get(r.email);
    if (existing) {
      r.isDuplicate = true; r.existingRecord = existing;
      r.issues.push({ code: 'DUPLICATE_EMAIL_DB', message: `Email already in database — student ${existing.name} (ID: ${existing.id})`, severity: 'error' });
      r.riskScore = Math.min(r.riskScore + 60, 100);
    }
  }

  const nearDups = detectNearDuplicates(students);
  for (const pair of nearDups) {
    const typeLabel = pair.type === 'alias' ? 'email alias match' : `typo distance ${pair.distance}`;
    [pair.indexA, pair.indexB].forEach((idx, pos) => {
      const otherIdx   = pos === 0 ? pair.indexB : pair.indexA;
      const otherEmail = pos === 0 ? pair.emailB  : pair.emailA;
      results[idx].warnings.push({ code: 'NEAR_DUPLICATE_IN_BATCH', message: `Near-duplicate of row ${otherIdx + 1} — "${otherEmail}" (${typeLabel})`, severity: 'warning' });
      results[idx].nearDuplicates.push({ indexB: otherIdx, emailB: otherEmail, distance: pair.distance, type: pair.type });
      results[idx].riskScore = Math.min(results[idx].riskScore + 25, 100);
    });
  }

  const AI_BATCH_SIZE = 30;
  for (let i = 0; i < students.length; i += AI_BATCH_SIZE) {
    const slice = students.slice(i, i + AI_BATCH_SIZE).map((s, j) => ({
      index: i + j, name: s.name||'', email: s.email||'', batch: s.batch||'', college: s.college||'', cgpa: s.cgpa||'',
    }));
    const aiResults = await aiValidateBatch(slice);
    if (aiResults) {
      for (const ar of aiResults) {
        const r = results[ar.index];
        if (!r) continue;
        r.aiVerdict = ar.aiVerdict; r.aiReason = ar.aiReason; r.aiFlags = ar.aiFlags || [];
        r.riskScore = Math.min(Math.round((r.riskScore * 0.5) + (ar.aiRiskScore * 0.5)), 100);
      }
    }
  }

  for (const r of results) {
    const hasError = r.issues.some(i => i.severity === 'error');
    const aiBlock  = r.aiVerdict === 'BLOCK';
    const aiWarn   = r.aiVerdict === 'WARN';
    if      (hasError || aiBlock || r.riskScore >= 60)             r.verdict = 'BLOCK';
    else if (r.warnings.length > 0 || aiWarn || r.riskScore >= 30) r.verdict = 'WARN';
    else                                                             r.verdict = 'PASS';
  }

  if (writeAudit) {
    const flagged = results.filter(r => r.verdict !== 'PASS');
    await Promise.allSettled(flagged.map(r => writeValidationAudit({
      adminId, adminName, studentEmail: r.email, studentName: r.name,
      allFlags: [...r.issues, ...r.warnings, ...r.aiFlags], verdict: r.verdict, ipAddress, userAgent,
    })));
  }

  return results;
}

async function validateSingleStudent(student, options = {}) {
  const [result] = await validateStudents([student], options);
  return result;
}

module.exports = {
  validateStudents,
  validateSingleStudent,
  _ruleBasedValidate:    ruleBasedValidate,
  _detectNearDuplicates: detectNearDuplicates,
  _canonicalEmail:       canonicalEmail,
  _levenshtein:          levenshtein,
};