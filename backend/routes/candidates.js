

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const XLSX       = require('xlsx');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const db         = require('../config/db');
const { authenticateToken, authorizeAdmin, authorizeRecruiter } = require('../middleware/auth');
const AuditLogger = require('../services/auditLogger');
console.log(' candidates.js — AuditLogger loaded:', typeof AuditLogger.logCandidateCreated);

// ── In-memory import sessions ─────────────────────────────────────────────────
const _fallbackSessions = new Map();
function getSessions(req) {
  return req.app.locals.candidateImportSessions || _fallbackSessions;
}

// ── Multer — 25 MB, CSV/XLSX only ────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'), ok);
  },
});
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 25 MB.'
        : err.message;
      return res.status(400).json({ success: false, message: msg });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}

// ── Helper: extract IP + user-agent ──────────────────────────────────────────
function getClientInfo(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim()
               || req.connection?.remoteAddress
               || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

// ── Generate a readable temporary password ────────────────────────────────────
// Format: 2 uppercase + 4 digits + 2 lowercase, e.g. "AB4829xy"
function generateTempPassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  let pw = '';
  for (let i = 0; i < 2; i++) pw += upper[Math.floor(Math.random() * upper.length)];
  for (let i = 0; i < 4; i++) pw += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 2; i++) pw += lower[Math.floor(Math.random() * lower.length)];
  // Shuffle
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

// ── Ensure must_change_password column exists ────────────────────────────────
// Run once at startup — safe to call multiple times (IF NOT EXISTS equivalent)
async function ensureSchema() {
  try {
    // Check if must_change_password already exists before adding
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'candidates'
         AND COLUMN_NAME  = 'must_change_password'`
    );
    if (cols.length === 0) {
      await db.query(
        `ALTER TABLE candidates
         ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1`
      );
      console.log('[candidates] Schema: must_change_password column added.');
    } else {
      console.log('[candidates] Schema: must_change_password column already exists.');
    }
  } catch (err) {
    console.warn('[candidates] Schema check warning:', err.message);
  }
}
ensureSchema();

// ── Generate next student ID in s_NNN format ─────────────────────────────────
async function nextStudentId() {
  const [rows] = await db.query(
    `SELECT id FROM candidates WHERE id REGEXP '^s_[0-9]+$' ORDER BY CAST(SUBSTRING(id,3) AS UNSIGNED) DESC LIMIT 1`
  );
  if (!rows.length) return 's_001';
  const last = parseInt(rows[0].id.replace('s_', ''), 10);
  return `s_${String(last + 1).padStart(3, '0')}`;
}

// ── Schema / column config ────────────────────────────────────────────────────
const IMPORT_FIELDS = [
  { key: 'name',               label: 'Full Name', required: true,  aliases: ['fullname','full name','student name','student_name','username'] },
  { key: 'email',              label: 'Email',     required: true,  aliases: ['mail','email id','email_id','emailid','e-mail'] },
  { key: 'college',            label: 'College',   required: false, aliases: ['institution','college name','institute','school','university'] },
  { key: 'branch',             label: 'Branch',    required: false, aliases: ['dept','department','stream','discipline','specialization'] },
  { key: 'batch',              label: 'Batch',     required: false, aliases: ['year','batch year','graduation year','grad year','passing year'] },
  { key: 'cgpa',               label: 'CGPA',      required: false, aliases: ['gpa','grade','marks','score','cgpa/gpa'] },
  { key: 'tenth_percentage',   label: '10th %',    required: false, aliases: ['10th','tenth','sslc','class10','10th percentage'] },
  { key: 'twelfth_percentage', label: '12th %',    required: false, aliases: ['12th','twelfth','hsc','class12','12th percentage'] },
  { key: 'backlogs',           label: 'Backlogs',  required: false, aliases: ['arrears','pending arrears','active backlogs'] },
];

const COLLEGES = ['RMKEC', 'RMDEC', 'RMKCET'];
const BRANCHES  = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'CSD'];
const BATCHES   = ['2021', '2022', '2023', '2024', '2025', '2026'];

function normalize(s) { return String(s).toLowerCase().replace(/[\s_\-\.]+/g, ''); }

function buildAutoMapping(fileColumns) {
  const mapping = {};
  for (const field of IMPORT_FIELDS) {
    const needles = new Set([
      normalize(field.key),
      normalize(field.label),
      ...field.aliases.map(normalize),
    ]);
    const matched = fileColumns.find(c => needles.has(normalize(c)));
    mapping[field.key] = matched || '';
  }
  return mapping;
}

// ── Welcome email with temp password ─────────────────────────────────────────
async function sendStudentWelcomeEmail({ name, email, tempPassword, setPasswordUrl }) {
  if (!process.env.SMTP_USER && !process.env.EMAIL_USER) {
    console.warn(`[candidates] SMTP not configured — skipping email to ${email}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#eef2f7;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.1);">

<tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6);padding:40px;text-align:center;">
  <div style="display:inline-block;background:rgba(255,255,255,.18);color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.25);margin-bottom:16px;">✅ Student Account Created</div>
  <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:6px;">Welcome to the Student Portal</div>
  <div style="font-size:13px;color:rgba(255,255,255,.78);">Your account is ready — please set your password to get started</div>
</td></tr>

<tr><td style="padding:36px;">
  <p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 8px;">Hi ${name},</p>
  <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 24px;">
    Your student account has been created on <strong>NeuroAssess</strong>. 
    Use the details below to log in for the first time. You'll be asked to set a new password before entering the platform.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
      <span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;">Your Login Credentials</span>
    </td></tr>
    <tr><td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Registered Email</div>
      <div style="font-size:14px;font-weight:600;color:#1e293b;">${email}</div>
    </td></tr>
    <tr><td style="padding:14px 20px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:5px;">Temporary Password</div>
      <div style="font-family:'Courier New',monospace;font-size:20px;font-weight:800;color:#1d4ed8;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:8px 16px;display:inline-block;letter-spacing:3px;">${tempPassword}</div>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:28px;">
    <tr><td style="padding:14px 16px;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:4px;">⚠️ Action Required — Set Your Password</div>
      <div style="font-size:13px;color:#78350f;line-height:1.6;">
        On your <strong>first login</strong>, you will be prompted to enter this temporary password and create a new secure password. 
        This temporary password will no longer work after you have set a new one.
      </div>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${setPasswordUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 40px;border-radius:50px;letter-spacing:.3px;">
      Log In &amp; Set Password →
    </a>
  </td></tr></table>

  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:24px 0 0;line-height:1.6;">
    If you did not expect this email, please ignore it or contact your administrator.<br/>
    © 2025 NeuroAssess. All rights reserved.
  </p>
</td></tr>

</table></td></tr></table>
</body></html>`;

  await transport.sendMail({
    from:    { name: 'NeuroAssess', address: process.env.SMTP_USER || process.env.EMAIL_USER },
    to:      email,
    subject: 'Your NeuroAssess Student Account — Set Your Password',
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/candidates/import/schema
router.get('/import/schema', authenticateToken, authorizeAdmin, (req, res) => {
  res.json({ success: true, fields: IMPORT_FIELDS });
});

// POST /api/candidates/import/parse
router.post('/import/parse', authenticateToken, authorizeAdmin, handleUpload, async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded.' });

  try {
    const ext       = req.file.originalname.toLowerCase().split('.').pop();
    const delimiter = req.body.delimiter || ',';

    let wb;
    if (ext === 'csv') {
      const text = req.file.buffer.toString('utf-8');
      wb = XLSX.read(text, { type: 'string', FS: delimiter });
    } else {
      wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    }

    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length)
      return res.status(400).json({ success: false, message: 'File is empty or has no data rows.' });
    if (rows.length > 5000)
      return res.status(400).json({ success: false, message: 'File exceeds 5,000 rows. Split into smaller batches.' });

    const columns   = Object.keys(rows[0]);
    const sessionId = crypto.randomUUID();

    getSessions(req).set(sessionId, {
      rows,
      expiresAt: Date.now() + 3_600_000,
    });

    return res.json({
      success:     true,
      sessionId,
      columns,
      totalRows:   rows.length,
      preview:     rows.slice(0, 5),
      autoMapping: buildAutoMapping(columns),
      fields:      IMPORT_FIELDS,
    });
  } catch (err) {
    console.error('[candidates/import/parse]', err.message);
    return res.status(400).json({ success: false, message: `File parsing failed: ${err.message}` });
  }
});

// POST /api/candidates/import/validate
router.post('/import/validate', authenticateToken, authorizeAdmin, async (req, res) => {
  const { mapping, sessionId } = req.body;

  if (!mapping || !sessionId)
    return res.status(400).json({ success: false, message: 'mapping and sessionId are required.' });

  const session = getSessions(req).get(sessionId);
  if (!session)
    return res.status(400).json({ success: false, message: 'Import session expired. Please re-upload your file.' });

  const data = session.rows;
  const get  = (row, field) => {
    const col = mapping[field];
    return col ? String(row[col] ?? '').trim() : '';
  };

  const errors  = [];
  let   ready   = 0;
  let   skipped = 0;

  const allEmails  = data.map(r => get(r, 'email')).filter(Boolean).map(e => e.toLowerCase());
  const seenEmails = new Set();
  let   existingSet = new Set();
  try {
    if (allEmails.length) {
      const placeholders = allEmails.map(() => '?').join(',');
      const [rows] = await db.query(`SELECT email FROM candidates WHERE email IN (${placeholders})`, allEmails);
      existingSet = new Set(rows.map(r => r.email.toLowerCase()));
    }
  } catch { /* non-fatal */ }

  for (let i = 0; i < data.length; i++) {
    const row     = data[i];
    const rowNum  = i + 1;
    const rowErrs = [];

    const name    = get(row, 'name');
    const email   = get(row, 'email').toLowerCase();
    const cgpa    = get(row, 'cgpa');
    const tenth   = get(row, 'tenth_percentage');
    const twelfth = get(row, 'twelfth_percentage');

    if (!name)  rowErrs.push({ field: 'name',  reason: 'Full name is required' });
    if (!email) rowErrs.push({ field: 'email', reason: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      rowErrs.push({ field: 'email', reason: 'Invalid email format' });
    else if (seenEmails.has(email))
      rowErrs.push({ field: 'email', reason: 'Duplicate email within this file' });
    else if (existingSet.has(email))
      rowErrs.push({ field: 'email', reason: 'Email already exists in the system — will be skipped' });

    if (email) seenEmails.add(email);

    if (cgpa && (isNaN(+cgpa) || +cgpa < 0 || +cgpa > 10))
      rowErrs.push({ field: 'cgpa', reason: 'CGPA must be between 0 and 10' });
    if (tenth && (isNaN(+tenth) || +tenth < 0 || +tenth > 100))
      rowErrs.push({ field: 'tenth_percentage', reason: '10th % must be between 0 and 100' });
    if (twelfth && (isNaN(+twelfth) || +twelfth < 0 || +twelfth > 100))
      rowErrs.push({ field: 'twelfth_percentage', reason: '12th % must be between 0 and 100' });

    if (rowErrs.length) { skipped++; errors.push({ row: rowNum, errors: rowErrs }); }
    else ready++;
  }

  return res.json({
    success: true,
    total:   data.length,
    ready,
    skipped,
    errors,
    unmappedRequired: ['name', 'email'].filter(f => !mapping[f]).length,
  });
});

// POST /api/candidates/import/execute  — SSE streaming bulk import
router.post('/import/execute', authenticateToken, authorizeAdmin, async (req, res) => {
  const {
    mapping,
    sessionId,
    duplicateHandling  = 'skip',
    sendWelcomeEmails  = true,
  } = req.body;

  if (!mapping || !sessionId)
    return res.status(400).json({ success: false, message: 'mapping and sessionId are required.' });

  const session = getSessions(req).get(sessionId);
  if (!session?.rows?.length)
    return res.status(400).json({ success: false, message: 'Import session expired. Please re-upload your file.' });

  const data = session.rows;

  // SSE headers
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const send = (payload) => { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (_) {} };

  const adminId       = req.user?.id;
  const adminUsername = req.user?.username || req.user?.email || 'Unknown';
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const get = (row, field) => {
      const col = mapping[field];
      return col ? String(row[col] ?? '').trim() : '';
    };

    const loginUrl = process.env.STUDENT_LOGIN_URL || process.env.APP_LOGIN_URL || 'http://localhost:3000/login?role=student';

    // Check which emails already exist
    const allEmails = data.map(r => get(r, 'email').toLowerCase()).filter(Boolean);
    let existingMap = new Map();
    if (allEmails.length) {
      const placeholders = allEmails.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT email, id FROM candidates WHERE email IN (${placeholders})`,
        allEmails
      );
      existingMap = new Map(rows.map(r => [r.email.toLowerCase(), r.id]));
    }

    const errorRows  = [];
    const toProcess  = [];
    const seenEmails = new Set();

    for (let i = 0; i < data.length; i++) {
      const row   = data[i];
      const name  = get(row, 'name');
      const email = get(row, 'email').toLowerCase();

      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorRows.push({ row: i + 1, error: !name ? 'Full name required' : 'Valid email required' });
        continue;
      }
      if (seenEmails.has(email)) {
        errorRows.push({ row: i + 1, error: `Duplicate email in file: ${email}` });
        continue;
      }
      seenEmails.add(email);

      const existingId = existingMap.get(email);
      if (existingId && duplicateHandling === 'skip') {
        errorRows.push({ row: i + 1, error: `${email} already exists — skipped` });
        continue;
      }

      // Always auto-generate a temp password for imports
      const tempPassword = generateTempPassword();
      const cgpa    = get(row, 'cgpa');

      toProcess.push({
        name,
        email,
        tempPassword,
        college:            get(row, 'college')            || '',
        branch:             get(row, 'branch')             || '',
        batch:              get(row, 'batch')              || '',
        cgpa:               cgpa ? parseFloat(cgpa) : null,
        tenth_percentage:   get(row, 'tenth_percentage')   ? parseFloat(get(row, 'tenth_percentage'))   : null,
        twelfth_percentage: get(row, 'twelfth_percentage') ? parseFloat(get(row, 'twelfth_percentage')) : null,
        backlogs:           get(row, 'backlogs')           ? parseInt(get(row, 'backlogs'))              : null,
        existingId,
      });
    }

    // Hash passwords in parallel batches of 20
    const HASH_BATCH = 20;
    for (let i = 0; i < toProcess.length; i += HASH_BATCH) {
      await Promise.all(toProcess.slice(i, i + HASH_BATCH).map(async u => {
        u.passwordHash = await bcrypt.hash(u.tempPassword, 10);
      }));
    }

    const total    = toProcess.length;
    let   done     = 0;
    const CHUNK    = 100;
    const toInsert = toProcess.filter(u => !u.existingId);
    const toUpdate = toProcess.filter(u =>  u.existingId);

    // ── Batch INSERT new students ─────────────────────────────────────────────
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      for (const u of chunk) {
        try {
          const newId = await nextStudentId();
          await db.query(
            `INSERT INTO candidates
               (id, name, email, password_hash, college, branch, batch, cgpa,
                tenth_percentage, twelfth_percentage, backlogs,
                status, must_change_password, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, NOW())`,
            [newId, u.name, u.email, u.passwordHash, u.college, u.branch, u.batch,
             u.cgpa, u.tenth_percentage, u.twelfth_percentage, u.backlogs]
          );
          u.insertedId = newId;
          done++;
        } catch (rowErr) {
          errorRows.push({ row: u.email, error: rowErr.message });
        }
      }
      send({ phase: 'importing', done, total });
    }

    // ── Batch UPDATE existing (duplicateHandling === 'update') ────────────────
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const chunk = toUpdate.slice(i, i + CHUNK);
      for (const u of chunk) {
        try {
          await db.query(
            `UPDATE candidates
               SET name=?, college=?, branch=?, batch=?, cgpa=?,
                   tenth_percentage=?, twelfth_percentage=?, backlogs=?,
                   password_hash=?, must_change_password=1
             WHERE id=?`,
            [u.name, u.college, u.branch, u.batch, u.cgpa,
             u.tenth_percentage, u.twelfth_percentage, u.backlogs,
             u.passwordHash, u.existingId]
          );
          u.insertedId = u.existingId;
          done++;
        } catch (rowErr) {
          errorRows.push({ row: u.email, error: rowErr.message });
        }
      }
      send({ phase: 'importing', done, total });
    }

    // ── Fire welcome emails non-blocking ──────────────────────────────────────
    if (sendWelcomeEmails) {
      const successOnes = toProcess.filter(u => u.insertedId);
      setImmediate(async () => {
        for (const u of successOnes) {
          try {
            await sendStudentWelcomeEmail({
              name:          u.name,
              email:         u.email,
              tempPassword:  u.tempPassword,
              setPasswordUrl: loginUrl,
            });
          } catch (emailErr) {
            console.warn(`[candidates] Email failed for ${u.email}:`, emailErr.message);
          }
          await new Promise(r => setTimeout(r, 80));
        }
        console.log(`[candidates] Welcome emails sent for ${successOnes.length} students`);
      });
    }

    getSessions(req).delete(sessionId);

    const skippedCount = errorRows.filter(e => e.error?.includes('skipped')).length;
    const failedCount  = errorRows.filter(e => !e.error?.includes('skipped')).length;

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await AuditLogger.logCandidateBulkImport(
        adminId, adminUsername, done,
        `Bulk CSV/XLSX Import (${done} of ${data.length} processed)`,
        ipAddress, userAgent,
      );
    } catch (auditErr) {
      console.error('[AuditLogger] logCandidateBulkImport failed:', auditErr.message);
    }

    send({
      complete:  true,
      imported:  done,
      skipped:   skippedCount,
      total:     data.length,
      failed:    failedCount,
      errors:    errorRows.slice(0, 50),
      emailNote: sendWelcomeEmails
        ? 'Welcome emails with temp passwords are being sent in the background.'
        : 'Emails skipped.',
    });
    res.end();

  } catch (err) {
    console.error('[candidates/import/execute]', err.message);
    send({ error: true, message: `Import failed: ${err.message}` });
    res.end();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/export', authenticateToken, authorizeAdmin, async (req, res) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const { college, branch, batch, status } = req.query;

  try {
    let query = `SELECT name AS "Full Name", email AS "Email", college AS "College",
                        branch AS "Branch", batch AS "Batch", cgpa AS "CGPA",
                        tenth_percentage AS "10th %", twelfth_percentage AS "12th %",
                        backlogs AS "Backlogs", status AS "Status",
                        DATE_FORMAT(created_at, '%Y-%m-%d') AS "Created At"
                 FROM candidates WHERE 1=1`;
    const params = [];
    if (college && college !== 'all') { query += ' AND college = ?'; params.push(college); }
    if (branch  && branch  !== 'all') { query += ' AND branch = ?';  params.push(branch);  }
    if (batch   && batch   !== 'all') { query += ' AND batch = ?';   params.push(batch);   }
    if (status  && status  !== 'all') { query += ' AND status = ?';  params.push(status);  }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const ts = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx') {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename="candidates_${ts}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    }
    const csv = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Disposition', `attachment; filename="candidates_${ts}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(csv);
  } catch (err) {
    console.error('[candidates/export]', err.message);
    return res.status(500).json({ success: false, message: 'Export failed: ' + err.message });
  }
});

router.get('/export/sample', authenticateToken, authorizeAdmin, async (req, res) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const sampleData = [
   
    { name: 'Moulini S',    email: 'moulini@rmkec.ac.in',   college: 'RMKEC',  branch: 'IT',  batch: '2025', cgpa: '7.8', tenth_percentage: '85', twelfth_percentage: '82', backlogs: '0' },
    { name: 'Shreya S',     email: 'shreya@rmdec.ac.in',    college: 'RMDEC',  branch: 'ECE', batch: '2025', cgpa: '8.1', tenth_percentage: '90', twelfth_percentage: '85', backlogs: '1' },

  ];

  if (format === 'csv') {
    const ws  = XLSX.utils.json_to_sheet(sampleData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Disposition', 'attachment; filename="candidates_import_sample.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(csv);
  }

  let ExcelJS;
  try { ExcelJS = require('exceljs'); } catch { ExcelJS = null; }

  if (!ExcelJS) {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates Import');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="candidates_import_sample.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  }

  const workbook  = new ExcelJS.Workbook();
  const mainSheet = workbook.addWorksheet('Candidates Import');
  const lookups   = workbook.addWorksheet('_Lookups');
  lookups.state   = 'veryHidden';

  COLLEGES.forEach((v, i) => { lookups.getCell(i + 1, 1).value = v; });
  BRANCHES.forEach((v, i) => { lookups.getCell(i + 1, 2).value = v; });
  BATCHES.forEach((v, i)  => { lookups.getCell(i + 1, 3).value = v; });

  mainSheet.columns = [
    { header: 'name',               key: 'name',               width: 22 },
    { header: 'email',              key: 'email',              width: 28 },
    { header: 'college',            key: 'college',            width: 12 },
    { header: 'branch',             key: 'branch',             width: 10 },
    { header: 'batch',              key: 'batch',              width: 10 },
    { header: 'cgpa',               key: 'cgpa',               width: 8  },
    { header: 'tenth_percentage',   key: 'tenth_percentage',   width: 12 },
    { header: 'twelfth_percentage', key: 'twelfth_percentage', width: 12 },
    { header: 'backlogs',           key: 'backlogs',           width: 10 },
  ];

  mainSheet.getRow(1).eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sampleData.forEach(row => mainSheet.addRow(row));

  const dvConfig = [
    { col: 'C', values: COLLEGES, label: 'college' },
    { col: 'D', values: BRANCHES, label: 'branch'  },
    { col: 'E', values: BATCHES,  label: 'batch'   },
  ];
  for (const { col, values, label } of dvConfig) {
    mainSheet.dataValidations.add(`${col}2:${col}5001`, {
      type: 'list', allowBlank: true,
      formulae: [`"${values.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: `Please select a valid ${label} from the list.`,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename="candidates_import_sample.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(Buffer.from(buffer));
});

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER + ADMIN CANDIDATE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

console.log('✅ CANDIDATES.JS LOADED');

router.get('/debug', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, college, branch, batch, status FROM candidates LIMIT 20');
    res.json({ success: true, count: rows.length, candidates: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/colleges', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT college, COUNT(*) as total FROM candidates WHERE college IS NOT NULL AND college != '' GROUP BY college ORDER BY college`);
    const evalStats = await Promise.all(rows.map(async (row) => {
      try {
        const [[evalCount]] = await db.query(`SELECT COUNT(DISTINCT e.candidate_id) as count FROM evaluations e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.college = ?`, [row.college]);
        const [[hireCount]] = await db.query(`SELECT COUNT(DISTINCT e.candidate_id) as count FROM evaluations e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.college = ? AND e.decision = 'Hire'`, [row.college]);
        const [[scoreData]] = await db.query(`SELECT ROUND(AVG(e.overall_score),1) as avg_score FROM evaluations e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.college = ? AND e.overall_score > 0`, [row.college]);
        const [[highRisk]]  = await db.query(`SELECT COUNT(DISTINCT e.candidate_id) as count FROM evaluations e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.college = ? AND e.overall_score < 40`, [row.college]);
        return { college: row.college, evaluated: evalCount?.count||0, hire_count: hireCount?.count||0, avg_score: scoreData?.avg_score||null, high_risk: highRisk?.count||0 };
      } catch { return { college: row.college, evaluated: 0, hire_count: 0, avg_score: null, high_risk: 0 }; }
    }));
    const evalMap = new Map(evalStats.map(e => [e.college, e]));
    res.json(rows.map(r => ({ college: r.college, total: r.total, ...evalMap.get(r.college) })));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch college stats', details: err.message }); }
});

router.get('/filters/colleges', authenticateToken, authorizeRecruiter, async (req, res) => {
  try { const [rows] = await db.query('SELECT DISTINCT college FROM candidates WHERE college IS NOT NULL AND college != "" ORDER BY college'); res.json(rows.map(r => r.college)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/filters/batches', authenticateToken, authorizeRecruiter, async (req, res) => {
  try { const [rows] = await db.query('SELECT DISTINCT batch FROM candidates WHERE batch IS NOT NULL ORDER BY batch DESC'); res.json(rows.map(r => r.batch)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/filters/branches', authenticateToken, authorizeRecruiter, async (req, res) => {
  try { const [rows] = await db.query('SELECT DISTINCT branch FROM candidates WHERE branch IS NOT NULL AND branch != "" ORDER BY branch'); res.json(rows.map(r => r.branch)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-college', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const { college } = req.query;
    if (!college) return res.status(400).json({ error: 'college parameter required' });
    const [students] = await db.query(
      `SELECT id,name,email,college,branch,batch,cgpa,tenth_percentage,twelfth_percentage,backlogs,github_url,linkedin_url,leetcode_url,status,created_at
       FROM candidates WHERE college=? ORDER BY name ASC`, [college]
    );
    const enriched = await Promise.all(students.map(async s => {
      const student = { ...s };
      try { const [r] = await db.query(`SELECT total_score,github_score,leetcode_score,linkedin_score,test_score,decision,confidence,risk FROM candidate_reports WHERE student_id=? ORDER BY created_at DESC LIMIT 1`,[s.id]); if(r[0]){student.github_score=r[0].github_score;student.leetcode_score=r[0].leetcode_score;student.total_score=r[0].total_score;student.overall_score=r[0].total_score;if(r[0].decision)student.__evaluation={decision:r[0].decision,confidence:r[0].confidence,risk:r[0].risk};} } catch {}
      if(!student.__evaluation){try{const[e]=await db.query(`SELECT decision,confidence,risk,recommendation FROM evaluations WHERE candidate_id=? ORDER BY created_at DESC LIMIT 1`,[s.id]);if(e[0])student.__evaluation={decision:e[0].decision,confidence:e[0].confidence,risk:e[0].risk,recommendation:e[0].recommendation};}catch{}}
      try{const[a]=await db.query(`SELECT ea.id,ea.exam_id,ea.status,ea.score,e.title as exam_name,e.company_name FROM exam_assignments ea JOIN exams e ON e.id=ea.exam_id WHERE ea.student_id=? ORDER BY ea.assigned_at DESC LIMIT 5`,[s.id]);student.exams=a||[];}catch{student.exams=[];}
      return student;
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch college candidates', details: err.message }); }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { college, batch, branch, status, search } = req.query;
    let query = `SELECT id,name,email,college,branch,batch,cgpa,status,must_change_password,created_at FROM candidates WHERE 1=1`;
    const params = [];
    if (college && college !== 'all') { query += ' AND college=?'; params.push(college); }
    if (batch   && batch   !== 'all') { query += ' AND batch=?';   params.push(batch);   }
    if (branch  && branch  !== 'all') { query += ' AND branch=?';  params.push(branch);  }
    if (status  && status  !== 'all') { query += ' AND status=?';  params.push(status);  }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; const s=`%${search}%`; params.push(s,s); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, students: rows.map(r => ({ ...r, account_status: r.status || 'active' })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST / — Admin creates one student manually
// Auto-generates temp password, sends welcome email with credentials
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  const { name, email, college, branch, batch, cgpa } = req.body;

  // Validate required fields (no password from frontend — we auto-generate it)
  if (!name?.trim() || !email?.trim() || !college || !branch || !batch)
    return res.status(400).json({ success: false, message: 'Name, email, college, branch, and batch are required.' });

  const cleanEmail = email.trim().toLowerCase();

  // ── Duplicate email check ────────────────────────────────────────────────
  try {
    const [existing] = await db.query('SELECT id FROM candidates WHERE email = ?', [cleanEmail]);
    if (existing.length)
      return res.status(409).json({
        success: false,
        message: `A student with email "${cleanEmail}" already exists. Please use a different email address.`,
      });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  // ── Auto-generate temp password ──────────────────────────────────────────
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  try {
    // ── FIX: Do NOT insert id; let MySQL auto-increment handle it ───────────
    const newId = await nextStudentId();
    await db.query(
      `INSERT INTO candidates
         (id, name, email, password_hash, college, branch, batch, cgpa,
          status, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, NOW())`,
      [newId, name.trim(), cleanEmail, passwordHash, college, branch, batch, cgpa || null]
    );

    // ── Send welcome email non-blocking ──────────────────────────────────────
    const loginUrl = process.env.STUDENT_LOGIN_URL || 'http://localhost:3000/login?role=student';
    setImmediate(() =>
      sendStudentWelcomeEmail({
        name:          name.trim(),
        email:         cleanEmail,
        tempPassword,
        setPasswordUrl: loginUrl,
      }).catch(e => console.warn('[candidates] email failed:', e.message))
    );

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      const { ipAddress, userAgent } = getClientInfo(req);
      await AuditLogger.logCandidateCreated(
        req.user?.id,
        req.user?.username || req.user?.email || 'Unknown',
        { id: newId, name: name.trim(), email: cleanEmail, college, branch, batch },
        ipAddress,
        userAgent,
      );
    } catch (auditErr) {
      console.error('[AuditLogger] logCandidateCreated failed:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Student created. Welcome email with temporary password sent to ${cleanEmail}.`,
      student: {
        id:      newId,
        name:    name.trim(),
        email:   cleanEmail,
        college,
        branch,
        batch,
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success: false, message: 'A student with this email already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id — Edit student details
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { name, email, college, branch, batch, cgpa, status } = req.body;
  if (!name?.trim() || !email?.trim())
    return res.status(400).json({ success: false, message: 'Name and email are required.' });

  const cleanEmail = email.trim().toLowerCase();

  // Duplicate email check (exclude self)
  try {
    const [existing] = await db.query(
      'SELECT id FROM candidates WHERE email = ? AND id != ?',
      [cleanEmail, req.params.id]
    );
    if (existing.length)
      return res.status(409).json({
        success: false,
        message: `Email "${cleanEmail}" is already used by another student.`,
      });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  try {
    await db.query(
      `UPDATE candidates SET name=?,email=?,college=?,branch=?,batch=?,cgpa=?,status=? WHERE id=?`,
      [name.trim(), cleanEmail, college, branch, batch, cgpa || null, status || 'active', req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /set-password — Student sets a new password on first login
router.post('/set-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const studentId = req.user?.id || req.user?.student_id || req.user?.userId;

  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });

  try {
    // Fetch current hash to verify the temp password
    const [rows] = await db.query(
      'SELECT password_hash, must_change_password FROM candidates WHERE id = ?',
      [studentId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Student not found.' });

    const student = rows[0];

    // If student is in must_change_password mode, verify the temp password first
    if (student.must_change_password && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, student.password_hash);
      if (!valid)
        return res.status(401).json({
          success: false,
          message: 'Temporary password is incorrect. Please check your welcome email.',
        });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE candidates SET password_hash = ?, must_change_password = 0, status = 'active' WHERE id = ?`,
      [newHash, studentId]
    );

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id — Get single candidate
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,name,email,college,branch,batch,cgpa,status,must_change_password,created_at FROM candidates WHERE id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    const c = rows[0];
    try { const [e] = await db.query('SELECT decision,confidence,risk,recommendation,overall_score as score FROM evaluations WHERE candidate_id=? ORDER BY created_at DESC LIMIT 1',[req.params.id]); c.evaluation=e[0]||null; } catch { c.evaluation=null; }
    try { const [a] = await db.query('SELECT ea.id,ea.exam_id,ea.status,ea.score,e.title as exam_name,e.company_name FROM exam_assignments ea JOIN exams e ON e.id=ea.exam_id WHERE ea.student_id=? ORDER BY ea.assigned_at DESC LIMIT 10',[req.params.id]); c.exams=a||[]; } catch { c.exams=[]; }
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;