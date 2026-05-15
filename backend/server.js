// server.js
// CHANGES vs previous version:
//   • POST /api/question-bank/import — theory questions now saved with full
//     rubric columns: marks, mark_type, bloom_level, subject, key_points,
//     keywords, expected_answer, model_answer_outline.
//     MCQ/coding/sql/aptitude/verbal rows get NULL for those columns.
//   • FIX: removed -- SQL comments from inside INSERT string (caused
//     ER_WRONG_VALUE_COUNT_ON_ROW because MySQL2 treated them as SQL comments
//     and silently dropped column names after each --)
//   • QB_TYPE_MAP extended to include 'theory'

if (typeof DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof Path2D    === 'undefined') { global.Path2D    = class Path2D    {}; }

const express            = require("express");
const cors               = require("cors");
const dotenv             = require("dotenv");
const { v4: uuidv4 }     = require("uuid");
const mysql              = require("mysql2/promise");
const cron               = require("node-cron");
const stringSimilarity   = require("string-similarity");
const esprima            = require("esprima");
const crypto             = require("crypto");
const jwt                = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    callback(new Error("CORS: origin not allowed — " + origin));
  },
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
  credentials:    true,
}));

app.options(/.*/, cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: process.env.PORT || 5000, time: new Date().toISOString() });
});

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "root",
  database:           process.env.DB_NAME     || "neuroassess",
  waitForConnections: true,
  connectionLimit:    10,
});

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "neuroassess_secret_2024";

app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

// ── AuditLogger ───────────────────────────────────────────────────────────────
let AuditLogger = null;
try {
  AuditLogger = require("./services/auditLogger");
  console.log("✅ AuditLogger loaded in server.js");
} catch (e) {
  console.error("❌ AuditLogger failed to load:", e.message);
}

async function auditLog(method, ...args) {
  if (!AuditLogger || typeof AuditLogger[method] !== "function") {
    console.warn(`[AuditLog] skipped — ${method} not available`);
    return;
  }
  try {
    await AuditLogger[method](...args);
  } catch (e) {
    console.error(`[AuditLog] ${method} failed:`, e.message);
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function getStudentId(req, res) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) { res.status(401).json({ error: 'No token' }); return null; }
    const secret = process.env.JWT_SECRET || 'neuroassess_secret_2024';
    const dec    = jwt.verify(token, secret);
    let studentId = dec.id || dec.student_id;
    if (dec.email) {
      const [rows] = await pool.query(
        'SELECT id FROM candidates WHERE email = ? LIMIT 1', [dec.email]
      );
      if (rows.length) studentId = rows[0].id;
    }
    if (!studentId) { res.status(401).json({ error: 'Student not found' }); return null; }
    console.log(`[Auth] studentId=${studentId}`);
    return studentId;
  } catch (err) {
    console.error('[Auth error]', err.message);
    res.status(401).json({ error: 'Invalid token: ' + err.message });
    return null;
  }
}

async function getAuditUser(req) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return { userId: null, username: 'Unknown' };
    const secret = process.env.JWT_SECRET || 'neuroassess_secret_2024';
    const dec = jwt.verify(token, secret);
    return {
      userId:   dec.id   || dec.userId || null,
      username: dec.email || dec.name  || dec.username || 'Unknown',
    };
  } catch {
    return { userId: null, username: 'Unknown' };
  }
}

function getClientInfo(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim()
               || req.connection?.remoteAddress
               || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

// ── Router loading helpers ────────────────────────────────────────────────────
function resolveRouter(mod, filePath) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (typeof mod === 'object') {
    const keys = ['router', 'default', 'handler'];
    for (const key of keys) {
      if (mod[key] && typeof mod[key] === 'function') {
        console.log(`  ℹ️  ${filePath} — using export.${key}`);
        return mod[key];
      }
    }
    console.error(`❌ [server] ${filePath} exports an object but has no usable router key`);
    console.error(`   Keys found: ${Object.keys(mod).join(", ")}`);
    return null;
  }
  return null;
}

function safeRequire(filePath) {
  try {
    const raw = require(filePath);
    const mod = resolveRouter(raw, filePath);
    if (mod) console.log(`✅ ${filePath}`);
    return mod;
  } catch (err) {
    console.error(`❌ [server] Failed to load: ${filePath}\n   Reason: ${err.message}`);
    return null;
  }
}

function useRoute(mountPath, mod, label) {
  if (!mod) { console.error(`⚠️  Skipping ${label} — not a valid router`); return; }
  app.use(mountPath, mod);
  console.log(`🔗 Mounted ${label} at ${mountPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION BANK HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function genQBId() {
  return 'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function resolveCorrectAns(q) {
  const raw = q.correct_ans || q.answer || null;
  if (!raw) return null;
  if (/^[A-Da-d]$/.test(String(raw).trim())) return String(raw).trim().toUpperCase();
  const opts = [
    { key: 'A', text: q.option_a || q.options?.[0]?.text },
    { key: 'B', text: q.option_b || q.options?.[1]?.text },
    { key: 'C', text: q.option_c || q.options?.[2]?.text },
    { key: 'D', text: q.option_d || q.options?.[3]?.text },
  ];
  const match = opts.find(
    o => o.text && o.text.trim().toLowerCase() === String(raw).trim().toLowerCase()
  );
  return match ? match.key : null;
}

const QB_TYPE_MAP = {
  mcq:      'mcq',      MCQ:      'mcq',
  coding:   'coding',   Coding:   'coding',
  sql:      'sql',      SQL:      'sql',
  aptitude: 'aptitude', Aptitude: 'aptitude',
  verbal:   'verbal',   Verbal:   'verbal',
  theory:   'theory',   Theory:   'theory',
};

const QB_DIFF_MAP = {
  easy:   'easy',   Easy:   'easy',
  medium: 'medium', Medium: 'medium',
  hard:   'hard',   Hard:   'hard',
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION BANK ROUTES (inline in server.js)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/question-bank', async (req, res) => {
  try {
    const { type, difficulty, search } = req.query;
    let sql    = 'SELECT * FROM question_bank WHERE is_active = 1';
    const params = [];
    if (type && type !== 'All') {
      sql += ' AND type = ?'; params.push(type.toLowerCase());
    }
    if (difficulty && difficulty !== 'All') {
      sql += ' AND difficulty = ?'; params.push(difficulty.toLowerCase());
    }
    if (search) {
      sql += ' AND (topic LIKE ? OR question_text LIKE ? OR qb_id LIKE ?)';
      const s = `%${search}%`; params.push(s, s, s);
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(q => ({
      id:                   q.qb_id,
      _dbId:                q.id,
      topic:                q.topic,
      type:                 q.type === 'mcq' ? 'MCQ' : q.type.charAt(0).toUpperCase() + q.type.slice(1),
      difficulty:           q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1),
      source:               q.source || 'QuizForge AI',
      createdDate:          new Date(q.created_at).toLocaleDateString('en-GB'),
      question_text:        q.question_text,
      option_a:             q.option_a,
      option_b:             q.option_b,
      option_c:             q.option_c,
      option_d:             q.option_d,
      correct_ans:          q.correct_ans,
      marks:                q.marks                 || null,
      mark_type:            q.mark_type             || null,
      bloom_level:          q.bloom_level           || null,
      subject:              q.subject               || null,
      key_points:           q.key_points            || null,
      keywords:             q.keywords              || null,
      expected_answer:      q.expected_answer       || null,
      model_answer_outline: q.model_answer_outline  || null,
    })));
  } catch (err) {
    console.error('[QB GET]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/question-bank/stats', async (req, res) => {
  try {
    const [byType] = await pool.query(
      `SELECT type, COUNT(*) AS count FROM question_bank
       WHERE is_active = 1 GROUP BY type ORDER BY count DESC`
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM question_bank WHERE is_active = 1`
    );
    res.json({ total, breakdown: byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/question-bank/import
//
// FIX: All -- SQL comments removed from inside the INSERT string.
// MySQL2 treats -- as a SQL line comment, silently dropping column names
// that appear after --, causing ER_WRONG_VALUE_COUNT_ON_ROW.
//
// Column count: 25 | Value tokens: 25 | ? params: 22
// Hardcoded in SQL (not params): 'QuizForge AI', 1, NOW()
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/question-bank/import', async (req, res) => {
  const { questions, examName, sessionCode, examType } = req.body;
  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'questions array required' });

  const { userId, username } = await getAuditUser(req);
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const saved = [];

    for (const q of questions) {
      const qbId     = genQBId();
      const qType    = QB_TYPE_MAP[q.type] || 'mcq';
      const qDiff    = QB_DIFF_MAP[q.difficulty] || 'medium';
      const isTheory = qType === 'theory';
      const topic    = (
        q.topic || q.subject || (q.question || '').substring(0, 60) || 'QuizForge Question'
      ).trim();

      const qText = (q.question || q.question_text || topic).toString().trim();

      // ── Column list: 25 columns (NO -- comments inside the string) ────────
      // Columns:  qb_id, topic, question_text, question, type, difficulty,
      //           option_a, option_b, option_c, option_d, correct_ans,
      //           marks, mark_type, bloom_level, subject,
      //           key_points, keywords, expected_answer, model_answer_outline,
      //           explanation, language_tag, topic_tag,
      //           source, created_by, created_at
      // Values:   6 params, 5 params, 4 params, 4 params, 3 params = 22 ?
      //           + 'QuizForge AI', 1, NOW() hardcoded = 25 total tokens
      const [result] = await pool.query(
        `INSERT INTO question_bank
           (qb_id, topic, question_text, question, type, difficulty,
            option_a, option_b, option_c, option_d, correct_ans,
            marks, mark_type, bloom_level, subject,
            key_points, keywords, expected_answer, model_answer_outline,
            explanation, language_tag, topic_tag,
            source, created_by, created_at)
         VALUES
           (?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            'QuizForge AI', 1, NOW())`,
        [
          // 1-6: core identity
          qbId,
          topic,
          qText,
          qText,
          qType,
          qDiff,

          // 7-11: MCQ columns (NULL for theory)
          isTheory ? null : (q.option_a || q.options?.[0]?.text || null),
          isTheory ? null : (q.option_b || q.options?.[1]?.text || null),
          isTheory ? null : (q.option_c || q.options?.[2]?.text || null),
          isTheory ? null : (q.option_d || q.options?.[3]?.text || null),
          isTheory ? null : resolveCorrectAns(q),

          // 12-15: Theory columns (NULL for non-theory)
          isTheory ? (q.marks      || 5)                          : null,
          isTheory ? (q.mark_type  || `${q.marks || 5}m`)        : null,
          isTheory ? (q.bloom_level|| null)                       : null,
          isTheory ? (q.subject    || topic)                      : null,

          // 16-19: Theory rubric columns (NULL for non-theory)
          isTheory ? JSON.stringify(Array.isArray(q.key_points) ? q.key_points : []) : null,
          isTheory ? (Array.isArray(q.keywords) ? q.keywords.join(', ') : (q.keywords || null)) : null,
          isTheory ? (q.expected_answer || q.explanation || null) : null,
          isTheory ? (q.model_answer_outline || null)             : null,

          // 20-22: Shared
          q.explanation || null,
          isTheory ? null : (q.language_tag || q.language || null),
          q.topic_tag   || topic || null,

          // 23-25: hardcoded in SQL → 'QuizForge AI', 1, NOW()
        ]
      );

      saved.push({
        id:          qbId,
        _dbId:       result.insertId,
        topic,
        type:        qType === 'mcq' ? 'MCQ'
                     : qType.charAt(0).toUpperCase() + qType.slice(1),
        difficulty:  qDiff.charAt(0).toUpperCase() + qDiff.slice(1),
        source:      'QuizForge AI',
        createdDate: new Date().toLocaleDateString('en-GB'),
        question:      qText,
        question_text: qText,
        options:                isTheory ? [] : (q.options || []),
        answer:                 isTheory ? null : (q.answer || ''),
        explanation:            q.explanation || '',
        platform:               q.platform || '',
        description:            q.description || '',
        functionalRequirements: q.functionalRequirements || '',
        constraints:            q.constraints || '',
        examples:               q.examples || [],
        starterCode:            q.starterCode || '',
        marks:                isTheory ? (q.marks || 5)                    : null,
        mark_type:            isTheory ? (q.mark_type || `${q.marks||5}m`) : null,
        bloom_level:          isTheory ? (q.bloom_level || null)           : null,
        subject:              isTheory ? (q.subject || topic)              : null,
        key_points:           isTheory ? (Array.isArray(q.key_points) ? q.key_points : []) : [],
        keywords:             isTheory ? (q.keywords || '')                : '',
        expected_answer:      isTheory ? (q.expected_answer || q.explanation || '') : '',
        model_answer_outline: isTheory ? (q.model_answer_outline || '')    : '',
      });
    }

    console.log(`[QB Import] Saved ${saved.length} questions from QuizForge AI`);

    const source = examName
      ? `${examName}${sessionCode ? ` (session: ${sessionCode})` : ''}`
      : 'QuizForge AI — server.js inline import';
    await auditLog(
      'logQuestionsBulkImported',
      userId, username, saved.length, source, ipAddress, userAgent
    );

    res.status(201).json({ success: true, count: saved.length, questions: saved });
  } catch (err) {
    console.error('[QB Import]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/question-bank', async (req, res) => {
  try {
    const { topic, type, difficulty } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });
    const qbId  = genQBId();
    const qType = QB_TYPE_MAP[type] || 'mcq';
    const qDiff = QB_DIFF_MAP[difficulty] || 'medium';
    const [result] = await pool.query(
      `INSERT INTO question_bank
         (qb_id, topic, question_text, type, difficulty, source, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'Manual', 1, NOW())`,
      [qbId, topic, topic, qType, qDiff]
    );
    res.status(201).json({
      id:          qbId,
      _dbId:       result.insertId,
      topic,
      type:        qType === 'mcq' ? 'MCQ' : qType.charAt(0).toUpperCase() + qType.slice(1),
      difficulty:  qDiff.charAt(0).toUpperCase() + qDiff.slice(1),
      source:      'Manual',
      createdDate: new Date().toLocaleDateString('en-GB'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/question-bank/:qbId', async (req, res) => {
  try {
    await pool.query(
      'UPDATE question_bank SET is_active = 0 WHERE qb_id = ?',
      [req.params.qbId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAM ROUTES (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/exams', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, COUNT(DISTINCT eq.id) AS question_count, COUNT(DISTINCT ea.id) AS student_count
       FROM exams e
       LEFT JOIN exam_questions eq ON eq.exam_id = e.id
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       GROUP BY e.id ORDER BY e.created_at DESC`
    );
    res.json({
      exams: rows.map(e => ({
        ...e,
        sections: typeof e.sections === 'string'
          ? JSON.parse(e.sections || '{}')
          : (e.sections || {}),
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams/:id/submit-approval', async (req, res) => {
  try {
    const { start_date, end_date, duration_minutes } = req.body;
    const updates = ['status = ?'];
    const params  = ['pending_approval'];
    if (start_date)       { updates.push('start_date = ?');       params.push(new Date(start_date)); }
    if (end_date)         { updates.push('end_date = ?');         params.push(new Date(end_date)); }
    if (duration_minutes) { updates.push('duration_minutes = ?'); params.push(parseInt(duration_minutes)); }
    params.push(req.params.id);
    await pool.query(`UPDATE exams SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, status: 'pending_approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams/:id/approve', async (req, res) => {
  const { start_date, end_date, duration_minutes } = req.body;
  if (!start_date || !end_date)
    return res.status(400).json({ error: 'start_date and end_date required' });
  try {
    await pool.query(
      `UPDATE exams SET status='approved', approved_at=NOW(),
       start_date=?, end_date=?, duration_minutes=COALESCE(?,duration_minutes) WHERE id=?`,
      [new Date(start_date), new Date(end_date),
       duration_minutes ? parseInt(duration_minutes) : null, req.params.id]
    );
    const [[exam]] = await pool.query('SELECT * FROM exams WHERE id=?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    let students = [];
    if (exam.college && exam.college !== 'default') {
      const [byColl] = await pool.query(
        `SELECT id, name, email FROM candidates WHERE college = ? AND status = 'active'`,
        [exam.college]
      );
      students = byColl;
    }
    if (students.length === 0) {
      const [all] = await pool.query(
        `SELECT id, name, email FROM candidates WHERE status = 'active'`
      );
      students = all;
    }

    let assigned = 0;
    for (const s of students) {
      const [ex] = await pool.query(
        'SELECT id FROM exam_assignments WHERE exam_id=? AND student_id=?',
        [exam.id, s.id]
      );
      if (ex.length) continue;
      const key = crypto.randomBytes(5).toString('hex').toUpperCase();
      await pool.query(
        `INSERT INTO exam_assignments (exam_id, student_id, exam_key, status, assigned_at)
         VALUES (?,?,?,'assigned',NOW())`,
        [exam.id, s.id, key]
      );
      assigned++;
    }
    res.json({ success: true, status: 'approved', students_assigned: assigned });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams/:id/reject', async (req, res) => {
  try {
    await pool.query(`UPDATE exams SET status='scheduled' WHERE id=?`, [req.params.id]);
    res.json({ success: true, status: 'scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT EXAM ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/student/exams', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No token' });

    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(
      Buffer.from(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp)
      return res.status(401).json({ error: 'Token expired' });

    const email = payload.email || payload.student_email;
    let studentId = payload.id || payload.student_id;

    if (email) {
      const [rows] = await pool.query(
        'SELECT id FROM candidates WHERE email = ? LIMIT 1', [email]
      );
      if (rows.length) studentId = rows[0].id;
    }

    if (!studentId) return res.status(401).json({ error: 'Student not found' });

    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.exam_type, e.college,
              e.start_date, e.end_date, e.duration_minutes,
              e.total_marks, e.sections, e.status AS exam_status,
              ea.id AS assignment_id, ea.exam_key,
              ea.status AS assignment_status,
              ea.score, ea.submitted_at,
              COUNT(eq.id) AS question_count
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       LEFT JOIN exam_questions eq ON eq.exam_id = e.id
       WHERE ea.student_id = ?
         AND e.status IN ('approved','live','completed','scheduled')
       GROUP BY e.id, ea.id
       ORDER BY e.start_date DESC`,
      [studentId]
    );
    res.json({
      exams: rows.map(r => ({
        ...r,
        sections: typeof r.sections === 'string'
          ? JSON.parse(r.sections || '{}')
          : (r.sections || {}),
        company_name: r.college,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams/validate-key', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No token' });
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    const email = payload.email || payload.student_email;
    let studentId = payload.id || payload.student_id;
    if (email) {
      const [r] = await pool.query('SELECT id FROM candidates WHERE email=? LIMIT 1', [email]);
      if (r.length) studentId = r[0].id;
    }
    if (!studentId) return res.status(401).json({ error: 'Student not found' });

    const { exam_key } = req.body;
    if (!exam_key) return res.status(400).json({ error: 'exam_key required' });

    const [rows] = await pool.query(
      `SELECT ea.id AS assignment_id, ea.status AS assignment_status,
              e.id AS exam_id, e.title, e.duration_minutes,
              e.total_marks, e.start_date, e.end_date
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ? AND ea.student_id = ?`,
      [exam_key.trim(), studentId]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.assignment_status === 'submitted')
      return res.status(400).json({ valid: false, error: 'Already submitted' });
    const now = new Date();
    if (row.start_date && now < new Date(row.start_date))
      return res.status(403).json({ valid: false, error: 'Exam not started yet' });
    if (row.end_date && now > new Date(row.end_date))
      return res.status(403).json({ valid: false, error: 'Exam window closed' });

    const [questions] = await pool.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks
       FROM exam_questions WHERE exam_id = ? ORDER BY RAND()`,
      [row.exam_id]
    );
    await pool.query(
      `UPDATE exam_assignments SET status='started', started_at=NOW() WHERE id=?`,
      [row.assignment_id]
    );
    res.json({
      valid: true, exam_id: row.exam_id, assignment_id: row.assignment_id,
      title: row.title, duration: row.duration_minutes,
      total_marks: row.total_marks, questions,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams/:examId/submit', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    const email = payload.email || payload.student_email;
    let studentId = payload.id || payload.student_id;
    if (email) {
      const [r] = await pool.query('SELECT id FROM candidates WHERE email=? LIMIT 1', [email]);
      if (r.length) studentId = r[0].id;
    }
    if (!studentId) return res.status(401).json({ error: 'Student not found' });

    const { answers } = req.body;
    const [[asgn]] = await pool.query(
      'SELECT id, status FROM exam_assignments WHERE exam_id=? AND student_id=?',
      [req.params.examId, studentId]
    );
    if (!asgn) return res.status(404).json({ error: 'Assignment not found' });
    if (asgn.status === 'submitted') return res.status(400).json({ error: 'Already submitted' });

    const [qs] = await pool.query(
      'SELECT id, correct_ans, marks FROM exam_questions WHERE exam_id=?',
      [req.params.examId]
    );
    let score = 0;
    for (const q of qs) {
      if (answers?.[q.id] && answers[q.id].toUpperCase() === (q.correct_ans || '').toUpperCase())
        score += (q.marks || 1);
    }
    await pool.query(
      `UPDATE exam_assignments SET status='submitted', submitted_at=NOW(), score=?, answers=? WHERE id=?`,
      [score, JSON.stringify(answers || {}), asgn.id]
    );
    const [[exam]] = await pool.query(
      'SELECT total_marks FROM exams WHERE id=?', [req.params.examId]
    );
    res.json({
      success: true, score,
      total_marks: exam?.total_marks || 100,
      percentage:  Math.round((score / (exam?.total_marks || 100)) * 100),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

console.log('✅ Question Bank + Exam routes registered');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TABLES
// ─────────────────────────────────────────────────────────────────────────────
async function createTables() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS viva_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_name VARCHAR(255),
        problem_name VARCHAR(255),
        submitted_code LONGTEXT,
        coding_score FLOAT,
        overall_score FLOAT,
        auth_score FLOAT,
        final_verdict VARCHAR(50),
        completed_at VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS viva_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        viva_result_id INT NOT NULL,
        question_number INT,
        question_type VARCHAR(100),
        question TEXT,
        student_answer LONGTEXT,
        duration_secs INT,
        score FLOAT,
        technical_accuracy FLOAT,
        relevance FLOAT,
        completeness FLOAT,
        authenticity_score FLOAT,
        verdict VARCHAR(50),
        feedback TEXT,
        strengths TEXT,
        improvements TEXT,
        authenticity_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (viva_result_id) REFERENCES viva_results(id) ON DELETE CASCADE
      )`);

    console.log("✓ Viva tables ready");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS code_snapshots (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        exam_id INT NOT NULL,
        code LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_exam (student_id, exam_id),
        INDEX idx_exam_time (exam_id, created_at),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES candidates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS plagiarism_reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        exam_id INT NOT NULL,
        score FLOAT DEFAULT 0,
        matched_with VARCHAR(100) DEFAULT NULL,
        change_count INT DEFAULT 0,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_exam (student_id, exam_id),
        INDEX idx_exam_score (exam_id, score DESC),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES candidates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log("✓ Plagiarism tables ready");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ai_detection_reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        exam_id INT NOT NULL,
        ai_score FLOAT DEFAULT 0,
        verdict VARCHAR(50) DEFAULT 'Human Written',
        confidence VARCHAR(20) DEFAULT 'Low',
        signals TEXT,
        ast_depth INT DEFAULT 0,
        unique_vars INT DEFAULT 0,
        avg_line_length FLOAT DEFAULT 0,
        comment_ratio FLOAT DEFAULT 0,
        sudden_paste TINYINT DEFAULT 0,
        perfect_structure TINYINT DEFAULT 0,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ai_student_exam (student_id, exam_id),
        INDEX idx_ai_exam (exam_id, ai_score DESC),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES candidates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log("✓ AI Detection table ready");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT          DEFAULT NULL,
        username        VARCHAR(255) NOT NULL DEFAULT 'System',
        action_type     VARCHAR(100) NOT NULL,
        action_category VARCHAR(100) NOT NULL,
        entity_type     VARCHAR(100) DEFAULT NULL,
        entity_id       VARCHAR(100) DEFAULT NULL,
        entity_name     VARCHAR(500) DEFAULT NULL,
        status          VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
        details         JSON         DEFAULT NULL,
        ip_address      VARCHAR(100) DEFAULT 'Unknown',
        user_agent      TEXT         DEFAULT NULL,
        timestamp       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id         (user_id),
        INDEX idx_action_type     (action_type),
        INDEX idx_action_category (action_category),
        INDEX idx_timestamp       (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log("✓ audit_logs table ready");

  } catch (err) {
    console.error("Error creating tables:", err.message);
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CODE DETECTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function detectAIGeneratedCode(code, snapshots) {
  const signals       = [];
  let   aiScore       = 0;
  const lines         = code.split("\n");
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  let suddenPaste = 0;
  if (snapshots && snapshots.length >= 2) {
    for (let i = 1; i < snapshots.length; i++) {
      const jump = snapshots[i].code.length - snapshots[i - 1].code.length;
      if (jump > 300) {
        suddenPaste = 1;
        signals.push("Large code block appeared suddenly — possible AI paste");
        aiScore += 25;
        break;
      }
    }
  }

  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")
        || t.startsWith("#") || t.startsWith('"""');
  });
  const commentRatio = commentLines.length / Math.max(lines.length, 1);
  if (commentRatio > 0.20) { signals.push(`High comment ratio (${(commentRatio * 100).toFixed(0)}% lines are comments)`); aiScore += 20; }

  const avgLineLength = nonEmptyLines.reduce((a, l) => a + l.length, 0) / Math.max(nonEmptyLines.length, 1);
  if (avgLineLength > 40) { signals.push(`Long average line length (${avgLineLength.toFixed(0)} chars/line)`); aiScore += 15; }

  if (snapshots && snapshots.length <= 2 && code.length > 200) { signals.push("Very few edits for a long code submission — possible paste"); aiScore += 20; }

  const indentedLines = lines.filter(l => l.startsWith("    ") || l.startsWith("\t"));
  const indentRatio   = indentedLines.length / Math.max(lines.length, 1);
  if (indentRatio > 0.45 && lines.length > 8) { signals.push("Perfectly consistent indentation throughout"); aiScore += 10; }

  const aiStyleNames = ["complement","solution","result","current","target","helper","optimal","efficient","HashMap","ArrayList","StringBuilder","initialize","iterate","traverse","compute","calculate","implement","approach","algorithm","complexity","containsKey","getOrDefault","entrySet","keySet","putIfAbsent"];
  const codeWords     = code.split(/\W+/);
  const aiNameMatches = codeWords.filter(w => aiStyleNames.includes(w)).length;
  if (aiNameMatches >= 2) { signals.push(`AI-style variable/method names detected (${aiNameMatches} matches)`); aiScore += 15; }

  if (code.includes("class Solution") || code.includes("public static") || code.includes("public int") || code.includes("public boolean")) {
    const hasCompleteStructure = code.includes("public") && (code.includes("return") || code.includes("void")) && code.includes("{") && code.includes("}");
    if (hasCompleteStructure && nonEmptyLines.length > 8) { signals.push("Complete Java class structure — typical of AI-generated solutions"); aiScore += 10; }
    if (code.includes("HashMap") || code.includes("Map<")) { signals.push("Uses optimized data structure (HashMap/Map) — common in AI solutions"); aiScore += 10; }
    if ((code.includes("left") && code.includes("right")) || (code.includes("slow") && code.includes("fast")) || (code.includes("start") && code.includes("end"))) { signals.push("Classic algorithm pattern with AI-style pointer naming"); aiScore += 5; }
  }

  if (code.includes("def ") && code.includes(":")) {
    if (code.includes("enumerate") || code.includes("zip(") || code.includes("defaultdict")) { signals.push("Uses advanced Python patterns — typical of AI solutions"); aiScore += 15; }
    if (code.includes("List[") || code.includes("Dict[") || code.includes("Optional[")) { signals.push("Uses Python type hints — common in AI-generated code"); aiScore += 10; }
  }

  let perfectStructure = 0, astDepth = 0, uniqueVars = 0;
  try {
    esprima.parseScript(code, { tolerant: false });
    if (lines.length > 10) { perfectStructure = 1; signals.push("Syntactically perfect JavaScript — no errors at all"); aiScore += 10; }
  } catch { /* not JS or has errors */ }

  try {
    const ast = esprima.parseScript(code, { tolerant: true });
    function measureDepth(node, d = 0) {
      if (!node || typeof node !== "object") return d;
      if (Array.isArray(node)) return Math.max(0, ...node.map(n => measureDepth(n, d)));
      let max = d;
      for (const k of Object.keys(node)) { if (k !== "type") { const c = measureDepth(node[k], d + 1); if (c > max) max = c; } }
      return max;
    }
    const varNames = new Set();
    function collectVars(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(collectVars); return; }
      if (node.type === "Identifier" && node.name) varNames.add(node.name);
      Object.values(node).forEach(v => collectVars(v));
    }
    astDepth = measureDepth(ast);
    collectVars(ast);
    uniqueVars = varNames.size;
    if (astDepth   > 12) { signals.push(`Deep AST structure (depth ${astDepth}) — highly optimized JS`); aiScore += 10; }
    if (uniqueVars > 15) { signals.push(`Many unique identifiers (${uniqueVars}) — AI-style JS naming`); aiScore += 5; }
  } catch { /* not JS */ }

  aiScore = Math.min(Math.round(aiScore), 100);
  let verdict = "Human Written", confidence = "High";
  if      (aiScore >= 70) { verdict = "AI Generated"; confidence = "High";   }
  else if (aiScore >= 45) { verdict = "Likely AI";    confidence = "Medium"; }
  else if (aiScore >= 25) { verdict = "Possibly AI";  confidence = "Low";    }

  return { aiScore, verdict, confidence, signals, astDepth, uniqueVars, avgLineLength: parseFloat(avgLineLength.toFixed(2)), commentRatio: parseFloat((commentRatio * 100).toFixed(2)), suddenPaste, perfectStructure };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAGIARISM HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function normalizeCodeAST(code) {
  try {
    const ast = esprima.parseScript(code, { tolerant: true });
    let counter = 0;
    const nameMap = new Map();
    function rename(n) { if (!nameMap.has(n)) nameMap.set(n, `v${counter++}`); return nameMap.get(n); }
    function walk(node) {
      if (!node || typeof node !== "object") return node;
      if (Array.isArray(node)) return node.map(walk);
      const out = {};
      for (const key of Object.keys(node)) {
        if (key === "type") out[key] = node[key];
        else if ((node.type === "Identifier" || node.type === "VariableDeclarator") && key === "name") out[key] = rename(node[key]);
        else out[key] = walk(node[key]);
      }
      return out;
    }
    return JSON.stringify(walk(ast));
  } catch {
    return code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  }
}

async function checkPlagiarism(studentId, examId, studentCode) {
  const [others] = await pool.execute(
    `SELECT cs.student_id, cs.code FROM code_snapshots cs
     INNER JOIN (
       SELECT student_id, MAX(created_at) AS latest
       FROM code_snapshots WHERE exam_id = ? AND student_id != ?
       GROUP BY student_id
     ) t ON cs.student_id = t.student_id AND cs.created_at = t.latest`,
    [examId, studentId]
  );
  if (!others.length) return { score: 0, matchedWith: null };
  const ns = normalizeCodeAST(studentCode);
  let maxScore = 0, matchedWith = null;
  for (const row of others) {
    const no = normalizeCodeAST(row.code);
    const combined = Math.max(
      stringSimilarity.compareTwoStrings(ns, no),
      stringSimilarity.compareTwoStrings(studentCode.replace(/\s+/g, " ").trim(), row.code.replace(/\s+/g, " ").trim())
    );
    if (combined > maxScore) { maxScore = combined; matchedWith = row.student_id; }
  }
  return { score: parseFloat((maxScore * 100).toFixed(2)), matchedWith };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEALTH CRON
// ─────────────────────────────────────────────────────────────────────────────
cron.schedule("*/2 * * * *", async () => {
  try {
    const [activePairs] = await pool.execute(
      `SELECT DISTINCT student_id, exam_id FROM code_snapshots WHERE created_at >= NOW() - INTERVAL 10 MINUTE`
    );
    for (const { student_id, exam_id } of activePairs) {
      const parsedExamId = typeof exam_id === "string" ? parseInt(exam_id) : exam_id;
      if (isNaN(parsedExamId)) continue;
      const [[latest]] = await pool.execute(
        `SELECT code FROM code_snapshots WHERE student_id = ? AND exam_id = ? ORDER BY created_at DESC LIMIT 1`,
        [student_id, parsedExamId]
      );
      if (!latest?.code) continue;
      const [snapshots] = await pool.execute(
        `SELECT code, created_at FROM code_snapshots WHERE student_id = ? AND exam_id = ? ORDER BY created_at ASC`,
        [student_id, parsedExamId]
      );
      const { score, matchedWith } = await checkPlagiarism(student_id, parsedExamId, latest.code);
      const [[{ change_count }]] = await pool.execute(
        `SELECT COUNT(*) AS change_count FROM code_snapshots WHERE student_id = ? AND exam_id = ?`,
        [student_id, parsedExamId]
      );
      await pool.execute(
        `INSERT INTO plagiarism_reports (student_id, exam_id, score, matched_with, change_count, checked_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score=GREATEST(score,VALUES(score)), matched_with=IF(VALUES(score)>score, VALUES(matched_with), matched_with), change_count=VALUES(change_count), checked_at=NOW()`,
        [student_id, parsedExamId, score, matchedWith, change_count]
      );
      const ai = detectAIGeneratedCode(latest.code, snapshots);
      await pool.execute(
        `INSERT INTO ai_detection_reports (student_id, exam_id, ai_score, verdict, confidence, signals, ast_depth, unique_vars, avg_line_length, comment_ratio, sudden_paste, perfect_structure, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE ai_score = VALUES(ai_score), verdict = VALUES(verdict), confidence = VALUES(confidence), signals = VALUES(signals), ast_depth = VALUES(ast_depth), unique_vars = VALUES(unique_vars), avg_line_length = VALUES(avg_line_length), comment_ratio = VALUES(comment_ratio), sudden_paste = VALUES(sudden_paste), perfect_structure = VALUES(perfect_structure), checked_at = NOW()`,
        [student_id, parsedExamId, ai.aiScore, ai.verdict, ai.confidence, JSON.stringify(ai.signals), ai.astDepth, ai.uniqueVars, ai.avgLineLength, ai.commentRatio, ai.suddenPaste, ai.perfectStructure]
      );
    }
    console.log("✓ Plagiarism + AI detection completed");
  } catch (err) {
    console.error("[Cron] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VIVA RESULTS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/viva-results", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { studentName, problemName, submittedCode, codingScore, overallScore, authScore, finalVerdict, completedAt, vivaAnswers } = req.body;
    const [resultRow] = await conn.execute(
      `INSERT INTO viva_results (student_name, problem_name, submitted_code, coding_score, overall_score, auth_score, final_verdict, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentName || "Unknown", problemName || "Solution", submittedCode || "", codingScore ?? null, overallScore ?? null, authScore ?? null, finalVerdict || "Genuine", completedAt || new Date().toISOString()]
    );
    const vivaResultId = resultRow.insertId;
    if (Array.isArray(vivaAnswers)) {
      for (const ans of vivaAnswers) {
        await conn.execute(
          `INSERT INTO viva_answers (viva_result_id, question_number, question_type, question, student_answer, duration_secs, score, technical_accuracy, relevance, completeness, authenticity_score, verdict, feedback, strengths, improvements, authenticity_reason, plagiarism_risk, signals, is_relevant, is_specific_to_code, relevance_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [vivaResultId, ans.questionNumber ?? null, ans.questionType || "", ans.question || "", ans.studentAnswer || "", ans.durationSecs ?? null, ans.score ?? null, ans.technicalAccuracy ?? null, ans.relevance ?? null, ans.completeness ?? null, ans.authenticityScore ?? null, ans.verdict || "", ans.feedback || "", JSON.stringify(ans.strengths || []), JSON.stringify(ans.improvements || []), ans.authenticityReason || "", ans.plagiarismRisk || "Low", JSON.stringify(ans.signals || []), ans.isRelevant ? 1 : 0, ans.isSpecificToCode ? 1 : 0, ans.relevanceFeedback || ""]
        );
      }
    }
    await conn.commit();
    res.json({ success: true, vivaResultId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally { conn.release(); }
});

app.get("/api/viva-results", async (req, res) => {
  try { const [rows] = await pool.execute(`SELECT * FROM viva_results ORDER BY created_at DESC`); res.json(rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/viva-results/:id", async (req, res) => {
  try {
    const [results] = await pool.execute(`SELECT * FROM viva_results WHERE id = ?`, [req.params.id]);
    if (!results.length) return res.status(404).json({ error: "Not found" });
    const [answers] = await pool.execute(`SELECT * FROM viva_answers WHERE viva_result_id = ? ORDER BY question_number`, [req.params.id]);
    res.json({ ...results[0], vivaAnswers: answers.map(a => ({ ...a, strengths: JSON.parse(a.strengths || "[]"), improvements: JSON.parse(a.improvements || "[]") })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/viva-results/student/:name", async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT vr.*, COUNT(va.id) as total_answers FROM viva_results vr LEFT JOIN viva_answers va ON vr.id = va.viva_result_id WHERE vr.student_name = ? GROUP BY vr.id ORDER BY vr.created_at DESC`, [req.params.name]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CODE SNAPSHOT & REPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/code/save", async (req, res) => {
  try {
    const { studentId, examId, code } = req.body;
    const parsedExamId = parseInt(examId);
    if (isNaN(parsedExamId)) return res.status(400).json({ error: "examId must be a valid integer" });
    if (!studentId || !parsedExamId || code === undefined) return res.status(400).json({ error: "Missing fields" });
    await pool.execute(`INSERT INTO code_snapshots (student_id, exam_id, code, created_at) VALUES (?, ?, ?, NOW())`, [studentId, parsedExamId, code]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/:examId", async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) return res.status(400).json({ error: "Invalid examId" });
    const [rows] = await pool.execute(`SELECT pr.student_id, pr.score AS plagiarism_score, pr.matched_with, pr.change_count, pr.checked_at, MIN(cs.created_at) AS started_at, MAX(cs.created_at) AS last_active, ai.ai_score, ai.verdict AS ai_verdict, ai.confidence AS ai_confidence FROM plagiarism_reports pr JOIN code_snapshots cs ON pr.student_id = cs.student_id AND pr.exam_id = cs.exam_id LEFT JOIN ai_detection_reports ai ON pr.student_id = ai.student_id AND pr.exam_id = ai.exam_id WHERE pr.exam_id = ? GROUP BY pr.student_id, pr.score, pr.matched_with, pr.change_count, pr.checked_at, ai.ai_score, ai.verdict, ai.confidence ORDER BY pr.score DESC`, [examId]);
    res.json({ examId, students: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/:examId/:studentId/timeline", async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) return res.status(400).json({ error: "Invalid examId" });
    const [snapshots] = await pool.execute(`SELECT id, code, created_at FROM code_snapshots WHERE exam_id = ? AND student_id = ? ORDER BY created_at ASC`, [examId, req.params.studentId]);
    res.json({ studentId: req.params.studentId, examId, timeline: snapshots.map((s, i) => ({ snapshot: i + 1, timestamp: s.created_at, chars: s.code.length, lines: s.code.split("\n").length, code: s.code })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/:examId/:studentId/compare", async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) return res.status(400).json({ error: "Invalid examId" });
    const [[pr]] = await pool.execute(`SELECT matched_with FROM plagiarism_reports WHERE student_id = ? AND exam_id = ?`, [req.params.studentId, examId]);
    if (!pr?.matched_with) return res.json({ match: null });
    const getLatest = async (sid) => { const [[row]] = await pool.execute(`SELECT code FROM code_snapshots WHERE student_id = ? AND exam_id = ? ORDER BY created_at DESC LIMIT 1`, [sid, examId]); return row?.code || ""; };
    const [codeA, codeB] = await Promise.all([getLatest(req.params.studentId), getLatest(pr.matched_with)]);
    res.json({ studentA: { id: req.params.studentId, code: codeA }, studentB: { id: pr.matched_with, code: codeB } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/ai-detection/:examId", async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) return res.status(400).json({ error: "Invalid examId" });
    const [rows] = await pool.execute(`SELECT ai.*, pr.change_count, pr.score AS plagiarism_score FROM ai_detection_reports ai LEFT JOIN plagiarism_reports pr ON ai.student_id = pr.student_id AND ai.exam_id = pr.exam_id WHERE ai.exam_id = ? ORDER BY ai.ai_score DESC`, [examId]);
    res.json({ examId, students: rows.map(r => ({ ...r, signals: JSON.parse(r.signals || "[]") })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/ai-detection/:examId/:studentId", async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    if (isNaN(examId)) return res.status(400).json({ error: "Invalid examId" });
    const [[row]] = await pool.execute(`SELECT * FROM ai_detection_reports WHERE student_id = ? AND exam_id = ?`, [req.params.studentId, examId]);
    if (!row) return res.json({ found: false });
    res.json({ found: true, ...row, signals: JSON.parse(row.signals || "[]") });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOAD EXTERNAL ROUTE FILES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("NeuroAssess Backend Running"));

app.locals.candidateImportSessions = new Map();
const authRoutes           = safeRequire("./routes/auth");
const uploadRoutes         = safeRequire("./routes/upload");
const reportRoutes         = safeRequire("./routes/report");
const examRequestRoutes    = safeRequire("./routes/examRequests");
const vivaRoutes           = safeRequire("./routes/viva");
const geoRoutes            = safeRequire("./routes/geo");
const examRoutes           = safeRequire("./routes/exams");
const questionRoutes       = safeRequire("./routes/questions");
const studentRoutes        = safeRequire("./routes/studentRoutes");
const candidateRoutes      = safeRequire("./routes/candidates");
const verifyRoutes         = safeRequire("./routes/verify");
const questionBankRoutes   = safeRequire("./routes/questionBank");
const proctoringRoutes     = safeRequire("./routes/proctoring");
const aiRoutes             = safeRequire("./routes/ai");
const auditLogsRoutes      = safeRequire("./routes/auditLogs");
const validateRouter       = safeRequire("./routes/candidatesValidation");

// ← DELETE these two lines entirely — wrong path, crashes server
// const universityRoutes = require('./universityExamRoutes');
// const { scoreTheoryAnswer } = require('./universityExamRoutes');
useRoute("/api/auth",                authRoutes,           "authRoutes");
useRoute("/api",                     uploadRoutes,         "uploadRoutes");
useRoute("/api",                     reportRoutes,         "reportRoutes");
useRoute("/api/exam-requests",       examRequestRoutes,    "examRequestRoutes");
useRoute("/api/viva",                vivaRoutes,           "vivaRoutes");
useRoute("/api",                     geoRoutes,            "geoRoutes");
useRoute("/api",                     examRoutes,           "examRoutes");
useRoute("/api/questions",           questionRoutes,       "questionRoutes");
useRoute("/api/student",             studentRoutes,        "studentRoutes");
useRoute("/api/candidates/validate", validateRouter,       "candidatesValidation");
useRoute("/api/candidates",          candidateRoutes,      "candidateRoutes");
useRoute("/api",                     verifyRoutes,         "verifyRoutes");
useRoute("/api",                     questionBankRoutes,   "questionBankRoutes");
useRoute("/api/ai",                  aiRoutes,             "aiRoutes");
useRoute("/api/audit-logs",          auditLogsRoutes,      "auditLogsRoutes");
useRoute("/api",                     proctoringRoutes,     "proctoringRoutes");

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 NeuroAssess backend running on port ${PORT}\n`);
  try {
    await createTables();
  } catch (err) {
    console.error("❌ createTables failed:", err.message);
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server error:", err.message);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});