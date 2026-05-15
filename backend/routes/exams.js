// routes/exams.js — FIXED VERSION
// KEY FIXES in this version:
//
// FIX 1 — Submit handler uses resolveStudentId() + 3 fallback strategies
//          so JWT id mismatch no longer causes silent "0 marks" failure
//
// FIX 2 — Written answers keyed by question ID string match fixed
//          (frontend may send string keys, DB ids are integers — normalised here)
//
// FIX 3 — geo_sessions 'last_ping_at' column: ALTER TABLE added as safe migration
//          at startup — won't fail if column already exists
//
// FIX 4 — assignment_id now accepted in submit body as fallback lookup
//
// FIX 5 — Detailed console logging so you can trace exactly what's happening

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendExamInvitation } = require('./emailService');
const AuditLogger = require('../services/auditLogger');

// ── Run once at startup: ensure geo_sessions has last_ping_at column ─────────
// This fixes "Unknown column 'last_ping_at' in field list" error
;(async () => {
  try {
    await db.query(`
      ALTER TABLE geo_sessions
        ADD COLUMN IF NOT EXISTS last_ping_at DATETIME NULL DEFAULT NULL
    `);
    console.log('[Startup] geo_sessions.last_ping_at column ensured');
  } catch (e) {
    // MySQL < 8.0 doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN
    // Try the safe version
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM geo_sessions LIKE 'last_ping_at'`);
      if (!cols.length) {
        await db.query(`ALTER TABLE geo_sessions ADD COLUMN last_ping_at DATETIME NULL DEFAULT NULL`);
        console.log('[Startup] geo_sessions.last_ping_at column added');
      }
    } catch (e2) {
      console.warn('[Startup] geo_sessions migration skipped:', e2.message);
    }
  }
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

const getClientInfo = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim()
             || req.connection?.remoteAddress || 'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

function generateExamKey() {
  return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
}

const safeJSON = (val, fallback) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normaliseExamType(raw) {
  const t = (raw || 'placement').toString().toLowerCase().trim();
  const map = {
    placement: 'placement', hiring: 'placement', general: 'placement',
    corporate: 'placement', recruitment: 'placement',
    university: 'university', academic: 'university', college: 'university',
    skill_cert: 'skill_cert', skill_certification: 'skill_cert',
    certification: 'skill_cert', certificate: 'skill_cert',
  };
  return map[t] || 'placement';
}

async function findEligibleStudents(conn, { college, batch_year, eligibilityCrit }) {
  let sq = `SELECT id, name, email FROM candidates WHERE status = 'active'`;
  const sp = [];
  if (college)    { sq += ' AND college = ?'; sp.push(college); }
  if (batch_year) { sq += ' AND batch = ?';   sp.push(parseInt(batch_year)); }
  if (eligibilityCrit?.min_cgpa) {
    sq += ' AND cgpa >= ?'; sp.push(parseFloat(eligibilityCrit.min_cgpa));
  }
  if (eligibilityCrit?.max_backlog !== undefined) {
    sq += ' AND (backlogs IS NULL OR backlogs <= ?)';
    sp.push(parseInt(eligibilityCrit.max_backlog));
  }
  const [students] = await conn.query(sq, sp);
  return students;
}

// resolveStudentId — handles ALL id formats including:
//   • integer ids (normal)
//   • "s_010" style string ids (candidates.id is varchar)
//   • users table ids that don't match candidates.id
// Returns the candidate id that exam_assignments.student_id was created with
async function resolveStudentId(jwtUser) {
  const jwtId    = jwtUser.id;    // may be "s_010" or integer
  const jwtEmail = jwtUser.email;

  console.log(`[resolveStudentId] jwtId=${jwtId} jwtEmail=${jwtEmail}`);

  // Strategy 1: direct id match in candidates (works if candidates.id = "s_010")
  try {
    const [r] = await db.query(`SELECT id FROM candidates WHERE id = ? LIMIT 1`, [jwtId]);
    if (r.length) {
      console.log(`[resolveStudentId] S1 matched: candidates.id=${r[0].id}`);
      return r[0].id;
    }
  } catch (e) { console.log(`[resolveStudentId] S1 error: ${e.message}`); }

  // Strategy 2: email match in candidates (most reliable cross-table link)
  if (jwtEmail) {
    try {
      const [r] = await db.query(`SELECT id FROM candidates WHERE email = ? LIMIT 1`, [jwtEmail]);
      if (r.length) {
        console.log(`[resolveStudentId] S2 matched: candidates.id=${r[0].id} by email`);
        return r[0].id;
      }
    } catch (e) { console.log(`[resolveStudentId] S2 error: ${e.message}`); }
  }

  // Strategy 3: look up via users table → candidates by email
  // (when student auth uses users table but exam_assignments uses candidates.id)
  try {
    const [userRows] = await db.query(`SELECT email FROM users WHERE id = ? LIMIT 1`, [jwtId]);
    if (userRows.length && userRows[0].email) {
      const [r] = await db.query(`SELECT id FROM candidates WHERE email = ? LIMIT 1`, [userRows[0].email]);
      if (r.length) {
        console.log(`[resolveStudentId] S3 matched via users table: candidates.id=${r[0].id}`);
        return r[0].id;
      }
    }
  } catch (e) { console.log(`[resolveStudentId] S3 error: ${e.message}`); }

  // Strategy 4: strip "s_" prefix — try numeric part as integer id
  if (typeof jwtId === 'string' && jwtId.startsWith('s_')) {
    const numericPart = parseInt(jwtId.replace('s_', ''), 10);
    if (!isNaN(numericPart)) {
      try {
        const [r] = await db.query(`SELECT id FROM candidates WHERE id = ? LIMIT 1`, [numericPart]);
        if (r.length) {
          console.log(`[resolveStudentId] S4 matched: stripped s_ prefix → candidates.id=${r[0].id}`);
          return r[0].id;
        }
      } catch (e) { console.log(`[resolveStudentId] S4 error: ${e.message}`); }
    }
  }

  // Strategy 5: look directly in exam_assignments — find what student_id was assigned
  // This is the most direct: find assignment where the student's email matches
  if (jwtEmail) {
    try {
      const [r] = await db.query(
        `SELECT DISTINCT ea.student_id 
         FROM exam_assignments ea 
         JOIN candidates c ON c.id = ea.student_id 
         WHERE c.email = ? 
         LIMIT 1`,
        [jwtEmail]
      );
      if (r.length) {
        console.log(`[resolveStudentId] S5 matched via exam_assignments: student_id=${r[0].student_id}`);
        return r[0].student_id;
      }
    } catch (e) { console.log(`[resolveStudentId] S5 error: ${e.message}`); }
  }

  console.warn(`[resolveStudentId] ALL strategies failed — returning raw jwtId=${jwtId}`);
  return jwtId;
}

// ── Theory scorer ─────────────────────────────────────────────────────────────
function scoreTheoryAnswer(answerText, question) {
  const maxMarks  = question.marks || 5;
  const keywords  = question.keywords || '';
  const keyPoints = safeJSON(question.key_points, []);

  if (!answerText || !keywords) {
    return { score: 0, maxScore: maxMarks, matchedKeywords: [], missingKeywords: [], percentage: 0, wordCount: 0 };
  }

  const kwList   = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const ansLower = answerText.toLowerCase();
  const matched  = [], missing = [];
  for (const kw of kwList) {
    const parts = kw.replace(/[()]/g, '').split(/[,\s\/]+/).filter(w => w.length > 2);
    if (parts.some(p => ansLower.includes(p))) matched.push(kw);
    else missing.push(kw);
  }

  const wordCount   = answerText.trim().split(/\s+/).filter(Boolean).length;
  const pct         = kwList.length ? Math.round((matched.length / kwList.length) * 100) : 0;
  const raw         = kwList.length ? (matched.length / kwList.length) * maxMarks : 0;
  const lengthRatio = Math.min(1, wordCount / (maxMarks * 15));
  const penalty     = lengthRatio < 0.4 ? 0.6 : lengthRatio < 0.7 ? 0.85 : 1;
  const score       = Math.min(Math.round(raw * penalty * 2) / 2, maxMarks);

  let kpMatched = 0;
  if (Array.isArray(keyPoints)) {
    for (const kp of keyPoints) {
      const kpWords = kp.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (kpWords.some(w => ansLower.includes(w))) kpMatched++;
    }
  }

  return { score, maxScore: maxMarks, matchedKeywords: matched, missingKeywords: missing, percentage: pct, wordCount, keyPointMatched: kpMatched, keyPointTotal: keyPoints.length };
}

async function trySendEmail({ to, studentName, examTitle, examKey, duration }) {
  try {
    await sendExamInvitation({ to, studentName: studentName || 'Student', examKey, examTitle, examDuration: duration });
    console.log(`[Email] Sent to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed ${to}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exams/create', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  const { ipAddress, userAgent } = getClientInfo(req);
  const {
    exam_type, title, college, batch_year, start_date, end_date,
    duration_minutes, total_marks, description,
    allowed_languages, sections, section_config, eligibility,
    exam_request_id, question_bank_session_code,
    adaptive_mcq, mcq_difficulty, cutoff_enabled, cutoffs, cutoff_score,
  } = req.body;

  if (normaliseExamType(exam_type) === 'university') {
    return handleCreateUniversityExam(req, res);
  }

  if (!title || !college || !batch_year || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sectionsObj      = safeJSON(sections,          { mcq: true, coding: true });
  const sectionConfigObj = safeJSON(section_config,    {});
  const eligibilityCrit  = safeJSON(eligibility,       {});
  const allowedLangsArr  = safeJSON(allowed_languages, []);
  const mcqDiffObj       = safeJSON(mcq_difficulty,    { easy: 30, medium: 50, hard: 20 });
  const cutoffsObj       = safeJSON(cutoffs,           {});
  const examTypeDB       = normaliseExamType(exam_type);
  const examKey          = generateExamKey();

  let parsedCutoffScore = null;
  if (cutoff_score !== undefined && cutoff_score !== '') {
    const p = parseInt(cutoff_score, 10);
    if (!isNaN(p) && p >= 0 && p <= 100) parsedCutoffScore = p;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          allowed_languages, total_marks, cutoff_score,
          sections, section_config, adaptive_mcq, mcq_difficulty,
          cutoff_enabled, cutoffs_json, exam_request_id,
          question_bank_session_code, created_by, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'scheduled',NOW())`,
      [
        examTypeDB, examKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 60, description || '',
        JSON.stringify(allowedLangsArr), parseInt(total_marks) || 100,
        parsedCutoffScore, JSON.stringify(sectionsObj), JSON.stringify(sectionConfigObj),
        adaptive_mcq ? 1 : 0, JSON.stringify(mcqDiffObj),
        cutoff_enabled ? 1 : 0, JSON.stringify(cutoffsObj),
        exam_request_id || null, question_bank_session_code || null, req.user.id,
      ]
    );
    const examId = result.insertId;

    if (exam_request_id) {
      try {
        await conn.query(`UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`, [examId, exam_request_id]);
      } catch (e) { console.warn('[CreateExam] exam_request update skipped:', e.message); }
    }

    let totalQuestionsSaved = 0;

    if (question_bank_session_code) {
      const [qbQuestions] = await conn.query(
        `SELECT * FROM question_bank WHERE session_code = ? AND is_active = 1 ORDER BY type, topic, id`,
        [question_bank_session_code]
      );
      if (qbQuestions.length > 0) {
        const filteredQuestions = [];
        for (const [sectionKey, enabled] of Object.entries(sectionsObj)) {
          if (!enabled) continue;
          const cfg      = sectionConfigObj[sectionKey] || {};
          const maxCount = parseInt(cfg.questions || cfg.count || 9999);
          let sectionQs  = qbQuestions.filter(q => q.type === sectionKey);
          if (sectionKey === 'mcq' && adaptive_mcq && mcqDiffObj) {
            const easy   = Math.round(maxCount * (mcqDiffObj.easy   || 30) / 100);
            const medium = Math.round(maxCount * (mcqDiffObj.medium || 50) / 100);
            const hard   = maxCount - easy - medium;
            sectionQs = shuffle([
              ...shuffle(sectionQs.filter(q => q.difficulty === 'easy')).slice(0, easy),
              ...shuffle(sectionQs.filter(q => q.difficulty === 'medium')).slice(0, medium),
              ...shuffle(sectionQs.filter(q => q.difficulty === 'hard')).slice(0, hard),
            ]);
          } else {
            sectionQs = shuffle(sectionQs).slice(0, maxCount);
          }
          filteredQuestions.push(...sectionQs);
        }
        if (filteredQuestions.length > 0) {
          const qValues = filteredQuestions.map((q, i) => [
            examId, q.id, q.type, q.question_text,
            q.option_a || null, q.option_b || null, q.option_c || null, q.option_d || null,
            q.correct_ans || null, q.explanation || null, q.difficulty || 'medium', 1, i,
          ]);
          await conn.query(
            `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index) VALUES ?`,
            [qValues]
          );
          totalQuestionsSaved = filteredQuestions.length;
        }
      }
    } else {
      for (const [sectionKey, enabled] of Object.entries(sectionsObj)) {
        if (!enabled) continue;
        const cfg      = sectionConfigObj[sectionKey] || {};
        const maxCount = parseInt(cfg.questions || cfg.count || 20);
        const [bankQs] = await conn.query(
          `SELECT * FROM question_bank WHERE type = ? AND is_active = 1 ORDER BY RAND() LIMIT ?`,
          [sectionKey, maxCount]
        );
        if (bankQs.length > 0) {
          const qValues = bankQs.map((q, i) => [
            examId, q.id, q.type, q.question_text,
            q.option_a, q.option_b, q.option_c, q.option_d,
            q.correct_ans, q.explanation, q.difficulty || 'medium', 1, i,
          ]);
          await conn.query(
            `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index) VALUES ?`,
            [qValues]
          );
          totalQuestionsSaved += bankQs.length;
        }
      }
    }

    let students = [];
    try { students = await findEligibleStudents(conn, { college, batch_year, eligibilityCrit }); } catch {}

    let assignmentRows = [];
    if (students.length > 0) {
      const assignValues = students.map(s => [examId, s.id, 'assigned', generateExamKey(), new Date()]);
      await conn.query(
        `INSERT INTO exam_assignments (exam_id, student_id, status, exam_key, assigned_at) VALUES ?`,
        [assignValues]
      );
      const [inserted] = await conn.query(
        `SELECT ea.exam_key, c.id AS student_id, c.name, c.email FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE ea.exam_id = ?`,
        [examId]
      );
      assignmentRows = inserted;
    }

    await conn.commit();

    try { await AuditLogger.logExamCreated(req.user.id, req.user.email || 'Unknown', { id: examId, title, exam_type: examTypeDB, college, total_marks: total_marks || 100, duration_minutes: duration_minutes || 60 }, ipAddress, userAgent); } catch {}

    if (assignmentRows.length > 0) {
      Promise.allSettled(assignmentRows.map(a => trySendEmail({ to: a.email, studentName: a.name, examTitle: title, examKey: a.exam_key, duration: parseInt(duration_minutes) || 60 })));
    }

    return res.status(201).json({
      success: true, exam_id: examId, exam_key: examKey,
      questions_saved: totalQuestionsSaved, student_count: assignmentRows.length,
      message: `Exam created. ${totalQuestionsSaved} questions. ${assignmentRows.length} students assigned.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[CreateExam] FATAL:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// handleCreateUniversityExam
// ─────────────────────────────────────────────────────────────────────────────
async function handleCreateUniversityExam(req, res) {
  const { ipAddress, userAgent } = getClientInfo(req);
  const {
    title, college, batch_year, start_date, end_date,
    duration_minutes, total_marks, pass_mark, description,
    semester, exam_name, subject_code, subject_name,
    sections: sectionsRaw, section_config: sectionConfigRaw,
    question_bank_session_code,
  } = req.body;

  if (!title || !college || !batch_year || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!question_bank_session_code) {
    return res.status(400).json({ error: 'question_bank_session_code is required for university exams' });
  }

  const univSections  = safeJSON(sectionsRaw,      { mcq: true, theory: true });
  const sectionConfig = safeJSON(sectionConfigRaw, {});
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    const examKey = generateExamKey();

    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          total_marks, pass_mark, sections, section_config,
          semester, exam_name, subject_code, subject_name,
          question_bank_session_code, created_by, status, created_at)
       VALUES ('university',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'scheduled',NOW())`,
      [
        examKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 90, description || '',
        parseInt(total_marks) || 100, parseInt(pass_mark) || 40,
        JSON.stringify(univSections), JSON.stringify(sectionConfig),
        semester || null, exam_name || null,
        subject_code || null, subject_name || null,
        question_bank_session_code, req.user.id,
      ]
    );
    const examId = result.insertId;

    const [allQbRows] = await conn.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d,
              correct_ans, explanation, difficulty, marks, mark_type,
              keywords, key_points, bloom_level, unit, subject, topic
       FROM question_bank
       WHERE session_code = ? AND is_active = 1
       ORDER BY type, marks ASC, id`,
      [question_bank_session_code]
    );

    const mcqPool    = allQbRows.filter(q => q.type === 'mcq');
    const theoryPool = allQbRows.filter(q => q.type === 'theory');

    const mcqCount    = parseInt(sectionConfig?.mcq?.count    || sectionConfig?.mcq?.questions    || mcqPool.length    || 20);
    const theoryCount = parseInt(sectionConfig?.theory?.count || sectionConfig?.theory?.questions || theoryPool.length || 0);

    const examQuestionRows = [];
    let orderIdx = 0;

    if (univSections.mcq && mcqPool.length > 0) {
      const validMcq = mcqPool.filter(q => q.option_a && q.option_a.trim() !== '');
      const selected = shuffle(validMcq).slice(0, mcqCount);
      for (const q of selected) {
        examQuestionRows.push([
          examId, q.id, 'mcq', q.question_text,
          q.option_a, q.option_b, q.option_c, q.option_d,
          q.correct_ans, q.explanation || null,
          q.difficulty || 'medium', 1, orderIdx++,
        ]);
      }
    }

    if ((univSections.theory || univSections.written) && theoryPool.length > 0) {
      const selected = theoryPool.slice(0, theoryCount);
      for (const q of selected) {
        const rubric = JSON.stringify({
          keywords:   q.keywords   || '',
          key_points: safeJSON(q.key_points, []),
          bloom_level:q.bloom_level|| '',
          unit:       q.unit       || '',
          subject:    q.subject    || '',
          mark_type:  q.mark_type  || `${q.marks || 5}m`,
        });
        examQuestionRows.push([
          examId, q.id, 'theory', q.question_text || '',
          null, null, null, null, null,
          rubric, q.difficulty || 'medium', q.marks || 5, orderIdx++,
        ]);
      }
    }

    if (examQuestionRows.length > 0) {
      await conn.query(
        `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index) VALUES ?`,
        [examQuestionRows]
      );
    }

    let stuQuery = `SELECT id, name, email FROM candidates WHERE status = 'active'`;
    const stuParams = [];
    if (college)    { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year) { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    const [students] = await conn.query(stuQuery, stuParams);

    const assignmentRows = [];
    if (students.length > 0) {
      const assignValues = students.map(s => [examId, s.id, 'assigned', generateExamKey(), new Date()]);
      await conn.query(
        `INSERT INTO exam_assignments (exam_id, student_id, status, exam_key, assigned_at) VALUES ?`,
        [assignValues]
      );
      const [inserted] = await conn.query(
        `SELECT ea.exam_key, c.name, c.email FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE ea.exam_id = ?`,
        [examId]
      );
      assignmentRows.push(...inserted);
    }

    await conn.commit();
    try { await AuditLogger.logExamCreated(req.user.id, req.user.email || 'Unknown', { id: examId, title, exam_type: 'university', college, total_marks, duration_minutes }, ipAddress, userAgent); } catch {}

    const examLabel = subject_name ? `${title} — ${subject_name}` : title;
    Promise.allSettled(assignmentRows.map(a => trySendEmail({ to: a.email, studentName: a.name, examTitle: examLabel, examKey: a.exam_key, duration: parseInt(duration_minutes) || 90 })));

    const mcqSaved    = examQuestionRows.filter(r => r[2] === 'mcq').length;
    const theorySaved = examQuestionRows.filter(r => r[2] === 'theory').length;

    return res.status(201).json({
      success: true, exam_id: examId, exam_key: examKey,
      questions_saved: examQuestionRows.length,
      mcq_saved: mcqSaved, theory_saved: theorySaved,
      student_count: assignmentRows.length,
      message: `University exam created. ${mcqSaved} MCQ + ${theorySaved} theory. ${assignmentRows.length} students assigned.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exams
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql = `
      SELECT e.*, COUNT(DISTINCT ea.id) AS student_count, COUNT(DISTINCT eq.id) AS question_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN exam_questions   eq ON eq.exam_id = e.id
      WHERE 1=1`;
    const params = [];
    if (college)   { sql += ' AND e.college = ?';   params.push(college); }
    if (exam_type) { sql += ' AND e.exam_type = ?'; params.push(exam_type); }
    if (status)    { sql += ' AND e.status = ?';    params.push(status); }
    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';
    const [rows] = await db.query(sql, params);
    return res.json({
      exams: rows.map(e => ({
        ...e, name: e.title, exam_name: e.title, candidates: e.student_count || 0,
        sections:          safeJSON(e.sections,          {}),
        section_config:    safeJSON(e.section_config,    {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
        mcq_difficulty:    safeJSON(e.mcq_difficulty,    {}),
        cutoffs_json:      safeJSON(e.cutoffs_json,      {}),
      })),
    });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch exams' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/validate-key  (placement)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.title, e.duration_minutes, e.sections, e.exam_type,
              e.status AS exam_status, e.cutoff_score,
              ea.id AS assignment_id, ea.status AS assignment_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.exam_status === 'completed') return res.status(400).json({ valid: false, error: 'Exam ended' });
    if (['submitted', 'absent'].includes(row.assignment_status))
      return res.status(400).json({ valid: false, error: 'Already submitted' });

    const [questions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.id]
    );
    await db.query(`UPDATE exam_assignments SET status='started', started_at=NOW() WHERE id=?`, [row.assignment_id]);
    return res.json({
      valid: true, exam_id: row.id, assignment_id: row.assignment_id,
      title: row.title, duration: row.duration_minutes,
      exam_type: row.exam_type, sections: safeJSON(row.sections, {}),
      cutoff_score: row.cutoff_score, questions,
    });
  } catch (err) { return res.status(500).json({ error: 'Failed to validate key' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/university/validate-key
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exams/university/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });

  try {
    const [rows] = await db.query(
      `SELECT e.id AS exam_id, e.title, e.duration_minutes, e.sections, e.section_config,
              e.exam_type, e.status AS exam_status,
              ea.id AS assignment_id, ea.status AS assignment_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );

    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];

    if (row.exam_status === 'completed') return res.status(400).json({ valid: false, error: 'Exam ended' });
    if (['submitted', 'absent'].includes(row.assignment_status))
      return res.status(400).json({ valid: false, error: 'Already submitted' });

    const [allQuestions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d,
              correct_ans, difficulty, marks, explanation
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.exam_id]
    );

    const mcqRaw    = allQuestions.filter(q => q.type === 'mcq');
    const theoryRaw = allQuestions.filter(q => q.type === 'theory');

    const paper_mcq = shuffle(mcqRaw).map(q => ({
      id: q.id, type: 'mcq',
      question_text: q.question_text || '',
      option_a: q.option_a || '', option_b: q.option_b || '',
      option_c: q.option_c || '', option_d: q.option_d || '',
      correct_ans: q.correct_ans || '',
      difficulty: q.difficulty || 'medium', marks: q.marks || 1,
    }));

    const paper_written = theoryRaw.map(q => ({
      id: q.id, type: 'theory',
      question: q.question_text || '',
      marks: q.marks || 5,
    }));

    await db.query(`UPDATE exam_assignments SET status='started', started_at=NOW() WHERE id=?`, [row.assignment_id]);

    return res.json({
      valid: true, exam_id: row.exam_id, assignment_id: row.assignment_id,
      title: row.title, duration: row.duration_minutes,
      exam_type: 'university', sections: safeJSON(row.sections, {}),
      paper_mcq, paper_written, questions: paper_mcq,
    });

  } catch (err) {
    console.error('[UnivValidateKey] ERROR:', err.message);
    return res.status(500).json({ error: 'Failed to validate university exam key' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/university/:examId/submit
//
// FIX: Uses resolveStudentId() + 3 fallback strategies so JWT id mismatch
//      no longer causes silent "0 marks saved" failure.
//      Also accepts assignment_id in request body as final fallback.
//      Detailed logging so you can trace in terminal what's happening.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const body            = req.body;
    const bodyAssignmentId = body.assignment_id;

    console.log(`[UnivSubmit] START examId=${examId} jwtUser=${JSON.stringify(req.user)}`);
    console.log(`[UnivSubmit] Body keys: ${Object.keys(body).join(', ')}`);

    // ── We MUST fetch questions FIRST so we know which IDs are MCQ vs theory ──
    // This is the only reliable way to separate flat-format answers
    const [examQsEarly] = await db.query(
      `SELECT id, type FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [examId]
    );
    const mcqIdSet    = new Set(examQsEarly.filter(q=>q.type==='mcq').map(q=>String(q.id)));
    const theoryIdSet = new Set(examQsEarly.filter(q=>q.type==='theory').map(q=>String(q.id)));
    console.log(`[UnivSubmit] MCQ question IDs: [${[...mcqIdSet].join(',')}]`);
    console.log(`[UnivSubmit] Theory question IDs: [${[...theoryIdSet].join(',')}]`);

    // ── Detect and parse payload format ──────────────────────────────────────
    // Format A: { mcq_answers:{id:letter}, written_answers:{id:text} }
    // Format B: { "241":"answer text", "231":"A" }  ← flat, keys = question IDs
    // Frontend currently sends Format B (all answers merged in one flat object)
    let mcq_answers     = {};
    let written_answers = {};

    if (body.written_answers || body.mcq_answers) {
      // Format A — structured
      mcq_answers     = body.mcq_answers     || {};
      written_answers = body.written_answers  || {};
      console.log(`[UnivSubmit] Format A: mcq=${Object.keys(mcq_answers).length} written=${Object.keys(written_answers).length}`);
    } else {
      // Format B — flat: separate by matching against known question IDs
      const NON_KEYS = new Set(['assignment_id','exam_id','token','_','__']);
      for (const [k, v] of Object.entries(body)) {
        if (NON_KEYS.has(k)) continue;
        const keyStr = String(k);
        if (mcqIdSet.has(keyStr)) {
          mcq_answers[keyStr] = String(v || '');
        } else if (theoryIdSet.has(keyStr)) {
          written_answers[keyStr] = String(v || '');
        }
        // ignore unknown keys
      }
      console.log(`[UnivSubmit] Format B (flat): mcq=${Object.keys(mcq_answers).length} written=${Object.keys(written_answers).length}`);
    }

    console.log(`[UnivSubmit] MCQ answers: ${JSON.stringify(mcq_answers)}`);
    console.log(`[UnivSubmit] Written answer keys: [${Object.keys(written_answers).join(', ')}]`);
    console.log(`[UnivSubmit] Written preview: ${JSON.stringify(written_answers).substring(0,200)}`);

    // ── Step 1: resolve the real candidate ID from JWT ─────────────────────────
    const studentId = await resolveStudentId(req.user);
    console.log(`[UnivSubmit] resolved studentId=${studentId} (raw jwtId=${req.user.id})`);

    // ── Step 2: find the assignment — 3 strategies ─────────────────────────────
    let assignRows = [];

    // Strategy A: by resolved candidate id
    [assignRows] = await db.query(
      `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.student_id = ? AND ea.exam_id = ? LIMIT 1`,
      [studentId, examId]
    );
    console.log(`[UnivSubmit] Strategy A (studentId=${studentId}): found=${assignRows.length}`);

    // Strategy B: by email join — most reliable when IDs don't match
    if (!assignRows.length && req.user.email) {
      [assignRows] = await db.query(
        `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks
         FROM exam_assignments ea
         JOIN exams e ON e.id = ea.exam_id
         JOIN candidates c ON c.id = ea.student_id
         WHERE c.email = ? AND ea.exam_id = ? LIMIT 1`,
        [req.user.email, examId]
      );
      console.log(`[UnivSubmit] Strategy B (email=${req.user.email}): found=${assignRows.length}`);
    }

    // Strategy C: assignment_id from frontend (validate-key already returned it)
    if (!assignRows.length && bodyAssignmentId) {
      [assignRows] = await db.query(
        `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks
         FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
         WHERE ea.id = ? AND ea.exam_id = ? LIMIT 1`,
        [bodyAssignmentId, examId]
      );
      console.log(`[UnivSubmit] Strategy C (assignment_id=${bodyAssignmentId}): found=${assignRows.length}`);
    }

    // Strategy D: raw JWT id directly as student_id (handles "s_010" varchar ids)
    if (!assignRows.length && req.user.id) {
      [assignRows] = await db.query(
        `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks
         FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
         WHERE ea.student_id = ? AND ea.exam_id = ? LIMIT 1`,
        [req.user.id, examId]  // raw JWT id, not resolved
      );
      console.log(`[UnivSubmit] Strategy D (raw jwtId=${req.user.id}): found=${assignRows.length}`);
    }

    // Strategy E: any assignment for this exam where status != submitted
    // (last resort — pick the started/assigned one for this exam)
    if (!assignRows.length && req.user.email) {
      [assignRows] = await db.query(
        `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks
         FROM exam_assignments ea
         JOIN exams e ON e.id = ea.exam_id
         JOIN candidates c ON c.id = ea.student_id
         WHERE c.email = ? AND ea.exam_id = ?
           AND ea.status IN ('assigned','started')
         ORDER BY ea.started_at DESC LIMIT 1`,
        [req.user.email, examId]
      );
      console.log(`[UnivSubmit] Strategy E (any non-submitted by email): found=${assignRows.length}`);
    }

    if (!assignRows.length) {
      console.error(`[UnivSubmit] ALL STRATEGIES FAILED. studentId=${studentId} jwtId=${req.user.id} email=${req.user.email} examId=${examId} bodyAssignmentId=${bodyAssignmentId}`);
      // Return the raw SQL to help debug
      const [debugRows] = await db.query(
        `SELECT ea.id, ea.student_id, ea.status FROM exam_assignments ea WHERE ea.exam_id = ? LIMIT 10`,
        [examId]
      ).catch(()=>[[]]);;
      console.error(`[UnivSubmit] All assignments for examId=${examId}:`, JSON.stringify(debugRows));
      return res.status(404).json({ error: 'Assignment not found. Contact admin.', debug: { jwtId: req.user.id, email: req.user.email, examId } });
    }

    const row = assignRows[0];
    console.log(`[UnivSubmit] Using assignment id=${row.id} student_id=${row.student_id} status=${row.status}`);

    if (row.status === 'submitted') {
      console.log(`[UnivSubmit] Already submitted — returning 400`);
      return res.status(400).json({ error: 'Already submitted' });
    }

    const cfg        = safeJSON(row.section_config, {});
    const mcqMarkPer = parseInt(cfg?.mcq?.marks ?? 1);

    // ── Step 3: fetch full exam questions (with correct_ans & explanation for grading) ──
    const [examQs] = await db.query(
      `SELECT id, type, question_text, correct_ans, marks, explanation
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [examId]
    );
    console.log(`[UnivSubmit] Exam questions: ${examQs.length} total | MCQ: ${examQs.filter(q=>q.type==='mcq').length} | Theory: ${examQs.filter(q=>q.type==='theory').length}`);

    // ── Step 4: grade MCQ ──────────────────────────────────────────────────────
    // FIX: normalise keys — frontend may send string IDs, DB ids are integers
    const rawMcqAnswers = mcq_answers || {};
    const answers = {};
    for (const [k, v] of Object.entries(rawMcqAnswers)) {
      answers[String(k)] = v; // normalise to string keys
    }

    let   mcqScore     = 0;
    const mcqBreakdown = [];

    for (const q of examQs.filter(q => q.type === 'mcq')) {
      const qIdStr  = String(q.id);
      const sa      = (answers[qIdStr] || '').toUpperCase();
      const ca      = (q.correct_ans  || '').toUpperCase();
      const correct = sa !== '' && sa === ca;
      const pts     = correct ? (q.marks || mcqMarkPer) : 0;
      mcqScore += pts;
      mcqBreakdown.push({
        questionId:    q.id,
        questionText:  q.question_text,
        studentAnswer: sa,
        correctAnswer: ca,
        isCorrect:     correct,
        marks:         pts,
      });
    }
    console.log(`[UnivSubmit] MCQ graded: score=${mcqScore} | ${mcqBreakdown.filter(m=>m.isCorrect).length}/${mcqBreakdown.length} correct`);

    // ── Step 5: grade Theory ───────────────────────────────────────────────────
    // FIX: normalise written_answers keys same way
    const rawWrittenAnswers = written_answers || {};
    const writtenAnswers = {};
    for (const [k, v] of Object.entries(rawWrittenAnswers)) {
      writtenAnswers[String(k)] = v;
    }

    let   writtenAutoScore = 0;
    const writtenBreakdown = [];

    for (const q of examQs.filter(q => q.type === 'theory')) {
      const qIdStr     = String(q.id);
      const rubric     = safeJSON(q.explanation, {});
      const answerText = writtenAnswers[qIdStr] || '';
      const scoreData  = scoreTheoryAnswer(answerText, { ...q, ...rubric });
      writtenAutoScore += scoreData.score;

      console.log(`[UnivSubmit] Theory Q${q.id}: answer="${answerText.substring(0,40)}..." autoScore=${scoreData.score}/${q.marks||5} keywords=${scoreData.matchedKeywords.length}/${(scoreData.matchedKeywords.length+scoreData.missingKeywords.length)}`);

      writtenBreakdown.push({
        questionId:      q.id,
        questionText:    q.question_text,
        marks:           q.marks || 5,
        studentAnswer:   answerText,
        wordCount:       scoreData.wordCount || 0,
        autoScore:       scoreData.score,
        maxScore:        scoreData.maxScore,
        matchedKeywords: scoreData.matchedKeywords,
        missingKeywords: scoreData.missingKeywords,
        percentage:      scoreData.percentage,
        facultyScore:    null,
        finalScore:      null,
      });
    }
    console.log(`[UnivSubmit] Theory graded: writtenAutoScore=${writtenAutoScore}`);

    const totalScore = Math.round((mcqScore + writtenAutoScore) * 100) / 100;
    console.log(`[UnivSubmit] Total score=${totalScore}`);

    // ── Step 6: save to DB ─────────────────────────────────────────────────────
    const answersJson = JSON.stringify({
      mcq_answers:        answers,
      written_answers:    writtenAnswers,
      mcq_score:          mcqScore,
      written_auto_score: Math.round(writtenAutoScore * 100) / 100,
      mcq_breakdown:      mcqBreakdown,
      written_breakdown:  writtenBreakdown,
    });

    const [updateResult] = await db.query(
      `UPDATE exam_assignments SET status='submitted', submitted_at=NOW(), score=?, answers=? WHERE id=?`,
      [totalScore, answersJson, row.id]
    );

    console.log(`[UnivSubmit] UPDATE result: affectedRows=${updateResult.affectedRows} assignmentId=${row.id}`);

    if (updateResult.affectedRows === 0) {
      console.error(`[UnivSubmit] WARNING: UPDATE affected 0 rows! Assignment id=${row.id} may not have been updated.`);
    }

    return res.json({
      success:          true,
      message:          'Submitted successfully.',
      mcqScore,
      writtenAutoScore: Math.round(writtenAutoScore * 100) / 100,
      totalScore,
    });

  } catch (err) {
    console.error('[UnivSubmit] ERROR:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exams/student/university
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams/student/university', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT e.id, e.title, e.title AS exam,
              e.subject_name AS subject, e.subject_code AS code,
              e.semester, e.exam_name, e.exam_type, e.college,
              e.start_date, e.end_date, e.duration_minutes,
              e.total_marks AS maxMarks, e.sections,
              ea.exam_key AS verifyCode, ea.exam_key,
              ea.status AS assignment_status, ea.score,
              CASE
                WHEN ea.status IN ('submitted','completed') THEN 'submitted'
                WHEN NOW() BETWEEN e.start_date AND e.end_date THEN 'live'
                WHEN NOW() < e.start_date THEN 'assigned'
                ELSE 'submitted'
              END AS computed_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.student_id = ? AND e.exam_type = 'university'
       ORDER BY e.start_date DESC`,
      [studentId]
    );
    const enriched = rows.map(r => {
      const sec = safeJSON(r.sections, {});
      return {
        ...r, status: r.computed_status, exam_type: 'university',
        hasMcq: !!(sec.mcq), hasTheory: !!(sec.theory || sec.written),
        hasWritten: !!(sec.theory || sec.written), hasCoding: !!(sec.coding), sections: sec,
      };
    });
    res.json(enriched);
  } catch (err) {
    console.error('[UnivStudentExams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/university-exam/:examId/report
// Returns assignment_id + mcqBreakdown + writtenBreakdown per student
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/university-exam/:examId/report', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;

    const [examRows] = await db.query(
      `SELECT id, title, subject_name, subject_code, semester,
              duration_minutes, total_marks, pass_mark, college, batch_year, section_config
       FROM exams WHERE id = ?`,
      [examId]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];

    const [assignRows] = await db.query(
      `SELECT ea.id          AS assignment_id,
              ea.student_id,
              c.name         AS student_name,
              c.email        AS student_email,
              ea.status,
              ea.assigned_at,
              ea.started_at,
              ea.submitted_at,
              ea.score       AS total_score,
              ea.answers
       FROM exam_assignments ea
       JOIN candidates c ON c.id = ea.student_id
       WHERE ea.exam_id = ?
       ORDER BY ea.score DESC`,
      [examId]
    );

    const passMark  = exam.pass_mark || 40;
    const submitted = assignRows.filter(r => r.status === 'submitted' || r.status === 'completed');
    const scores    = submitted.map(r => r.total_score || 0);
    const avg       = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10 : 0;
    const passRate  = Math.round((scores.filter(s=>s>=passMark).length / (scores.length||1)) * 100);

    // Fetch exam questions once — needed for rescoring flat-format submissions
    const [examQs] = await db.query(
      `SELECT id, type, question_text, correct_ans, marks, explanation
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [examId]
    );

    const studentList = assignRows.map((r, idx) => {
      // ── Parse stored answers ─────────────────────────────────────────────────
      let parsed = {};
      try {
        parsed = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {});
      } catch {}

      let mcqBreakdown     = parsed.mcq_breakdown     || [];
      let writtenBreakdown = parsed.written_breakdown  || [];
      let mcqScore         = parsed.mcq_score          != null ? parsed.mcq_score         : null;
      let writtenScore     = parsed.written_auto_score != null ? parsed.written_auto_score : null;

      // ── If breakdowns are missing, rebuild from flat answers ─────────────────
      // This handles old submissions stored as {"questionId":"answer"} flat format
      const isDone = r.status === 'submitted' || r.status === 'completed';

      if (isDone && (mcqBreakdown.length === 0 && writtenBreakdown.length === 0) && Object.keys(parsed).length > 0) {
        console.log(`[Report] Assignment ${r.assignment_id}: rebuilding breakdown from flat answers`);

        // Separate MCQ and written answers from flat object
        const NON_KEYS = new Set(['mcq_score','written_auto_score','mcq_breakdown','written_breakdown','mcq_answers','written_answers','assignment_id','token']);
        const flatAnswers = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (!NON_KEYS.has(k)) flatAnswers[String(k)] = v;
        }

        const mcqAnswers     = parsed.mcq_answers     || {};
        const writtenAnswers = parsed.written_answers  || flatAnswers; // flat = written answers

        // Rebuild MCQ breakdown
        let newMcqScore = 0;
        for (const q of examQs.filter(q => q.type === 'mcq')) {
          const sa      = (mcqAnswers[String(q.id)] || '').toUpperCase();
          const ca      = (q.correct_ans || '').toUpperCase();
          const correct = sa !== '' && sa === ca;
          const pts     = correct ? (q.marks || 1) : 0;
          newMcqScore += pts;
          mcqBreakdown.push({ questionId: q.id, questionText: q.question_text, studentAnswer: sa, correctAnswer: ca, isCorrect: correct, marks: pts });
        }

        // Rebuild theory breakdown
        let newWrittenScore = 0;
        for (const q of examQs.filter(q => q.type === 'theory')) {
          const rubric      = safeJSON(q.explanation, {});
          const answerText  = writtenAnswers[String(q.id)] || '';
          const scoreData   = scoreTheoryAnswer(answerText, { ...q, ...rubric });
          newWrittenScore  += scoreData.score;
          writtenBreakdown.push({
            questionId:      q.id,
            questionText:    q.question_text,
            marks:           q.marks || 5,
            studentAnswer:   answerText,
            wordCount:       scoreData.wordCount || 0,
            autoScore:       scoreData.score,
            maxScore:        scoreData.maxScore,
            matchedKeywords: scoreData.matchedKeywords,
            missingKeywords: scoreData.missingKeywords,
            percentage:      scoreData.percentage,
            facultyScore:    null,
            finalScore:      null,
          });
        }

        mcqScore     = newMcqScore;
        writtenScore = Math.round(newWrittenScore * 100) / 100;
        const newTotal = Math.round((newMcqScore + newWrittenScore) * 100) / 100;

        // Persist the fixed data back to DB asynchronously (don't await — keep report fast)
        const fixedAnswers = JSON.stringify({
          ...parsed,
          mcq_answers:       mcqAnswers,
          written_answers:   writtenAnswers,
          mcq_score:         newMcqScore,
          written_auto_score:writtenScore,
          mcq_breakdown:     mcqBreakdown,
          written_breakdown: writtenBreakdown,
        });
        db.query(`UPDATE exam_assignments SET score=?, answers=? WHERE id=?`, [newTotal, fixedAnswers, r.assignment_id])
          .then(() => console.log(`[Report] Auto-fixed assignment ${r.assignment_id}: score=${newTotal}`))
          .catch(e => console.error(`[Report] Auto-fix failed for ${r.assignment_id}:`, e.message));
      }

      const pct    = r.total_score != null && exam.total_marks
        ? Math.round(r.total_score / exam.total_marks * 100) : null;
      const passed = r.total_score != null ? r.total_score >= passMark : null;

      return {
        rank:          isDone ? idx + 1 : null,
        assignment_id: r.assignment_id,
        studentId:     r.student_id,
        studentName:   r.student_name,
        studentEmail:  r.student_email,
        status:        r.status,
        assignedAt:    r.assigned_at,
        startedAt:     r.started_at,
        submittedAt:   r.submitted_at,
        totalScore:    r.total_score,
        totalMarks:    exam.total_marks,
        percentage:    pct,
        passed,
        mcqScore,
        writtenScore,
        mcqBreakdown,
        writtenBreakdown,
      };
    });

    return res.json({
      exam: { ...exam, sectionConfig: safeJSON(exam.section_config, {}) },
      summary: {
        totalStudents: assignRows.length,
        submitted:     submitted.length,
        notStarted:    assignRows.filter(r=>r.status==='assigned').length,
        inProgress:    assignRows.filter(r=>r.status==='started').length,
        avgScore:      avg,
        highestScore:  scores.length ? Math.max(...scores) : 0,
        lowestScore:   scores.length ? Math.min(...scores) : 0,
        passRate,
        passMark,
      },
      students: studentList,
    });

  } catch (err) {
    console.error('[UnivAdminReport]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/university-exam/review-written
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/university-exam/review-written', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { assignmentId, questionId, facultyScore, facultyComment } = req.body;
    if (!assignmentId || !questionId || facultyScore == null)
      return res.status(400).json({ error: 'assignmentId, questionId, facultyScore required' });

    const [rows] = await db.query(
      `SELECT id, score, answers FROM exam_assignments WHERE id=?`,
      [assignmentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });

    const row       = rows[0];
    const parsed    = safeJSON(row.answers, {});
    const breakdown = parsed.written_breakdown || [];
    let   newWrittenTotal = 0;

    const updated = breakdown.map(item => {
      if (String(item.questionId) === String(questionId)) {
        const finalScore = Math.min(parseFloat(facultyScore), item.maxScore || item.marks || 8);
        newWrittenTotal += finalScore;
        return { ...item, facultyScore: finalScore, facultyComment: facultyComment || '', finalScore, reviewedAt: new Date().toISOString() };
      }
      const use = item.facultyScore != null ? item.facultyScore : (item.autoScore || 0);
      newWrittenTotal += use;
      return item;
    });

    const newTotal = Math.round(((parsed.mcq_score || 0) + newWrittenTotal) * 100) / 100;

    await db.query(
      `UPDATE exam_assignments SET score=?, answers=? WHERE id=?`,
      [
        newTotal,
        JSON.stringify({ ...parsed, written_breakdown: updated, written_auto_score: Math.round(newWrittenTotal*100)/100 }),
        assignmentId,
      ]
    );

    return res.json({ success: true, newWrittenTotal, newTotal });
  } catch (err) {
    console.error('[ReviewWritten]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exams/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, COUNT(DISTINCT ea.id) AS student_count, COUNT(DISTINCT eq.id) AS question_count
       FROM exams e
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       LEFT JOIN exam_questions   eq ON eq.exam_id = e.id
       WHERE e.id = ? GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
    const e = rows[0];
    return res.json({
      exam: {
        ...e,
        sections:          safeJSON(e.sections,          {}),
        section_config:    safeJSON(e.section_config,    {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
        mcq_difficulty:    safeJSON(e.mcq_difficulty,    {}),
      },
    });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch exam' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exams/:id/students
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams/:id/students', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id AS student_id, c.name, c.email,
              ea.id AS assignment_id, ea.exam_key, ea.status,
              ea.score, ea.assigned_at, ea.submitted_at
       FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id
       WHERE ea.exam_id = ? ORDER BY c.name ASC`,
      [req.params.id]
    );
    return res.json({ students: rows });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch students' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/university-exam/:examId/rescore
// Re-scores all submitted assignments for an exam where score=0 but answers exist
// Run this once to fix existing broken submissions
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/university-exam/:examId/rescore', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;
    console.log(`[Rescore] Starting rescore for examId=${examId}`);

    // Get exam questions for grading
    const [examQs] = await db.query(
      `SELECT id, type, question_text, correct_ans, marks, explanation
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [examId]
    );
    console.log(`[Rescore] ${examQs.length} questions found (MCQ: ${examQs.filter(q=>q.type==='mcq').length}, Theory: ${examQs.filter(q=>q.type==='theory').length})`);

    // Get all submitted assignments with score=0 and answers not null
    const [assignments] = await db.query(
      `SELECT id, student_id, answers, score FROM exam_assignments
       WHERE exam_id = ? AND status = 'submitted' AND answers IS NOT NULL`,
      [examId]
    );
    console.log(`[Rescore] ${assignments.length} submitted assignments to process`);

    const results = [];

    for (const asgn of assignments) {
      try {
        let rawAnswers = asgn.answers;
        if (typeof rawAnswers === 'string') {
          try { rawAnswers = JSON.parse(rawAnswers); } catch { rawAnswers = {}; }
        }

        // Detect format
        let mcqAnswers = {}, writtenAnswers = {};

        if (rawAnswers.written_answers && typeof rawAnswers.written_answers === 'object') {
          // Already structured format — re-extract
          mcqAnswers     = rawAnswers.mcq_answers     || {};
          writtenAnswers = rawAnswers.written_answers  || {};
        } else {
          // Flat format — extract non-meta keys as written answers
          const NON_ANSWER_KEYS = new Set(['assignment_id','exam_id','mcq_answers','written_answers','answers','token','mcq_score','written_auto_score','mcq_breakdown','written_breakdown']);
          mcqAnswers = rawAnswers.mcq_answers || {};
          for (const [k, v] of Object.entries(rawAnswers)) {
            if (!NON_ANSWER_KEYS.has(k) && typeof v === 'string' && v.length > 0) {
              writtenAnswers[k] = v;
            }
          }
        }

        console.log(`[Rescore] Assignment ${asgn.id}: mcqAnswers=${Object.keys(mcqAnswers).length} writtenAnswers=${Object.keys(writtenAnswers).length}`);

        // Grade MCQ
        let mcqScore = 0;
        const mcqBreakdown = [];
        for (const q of examQs.filter(q => q.type === 'mcq')) {
          const sa      = (mcqAnswers[String(q.id)] || '').toUpperCase();
          const ca      = (q.correct_ans || '').toUpperCase();
          const correct = sa !== '' && sa === ca;
          const pts     = correct ? (q.marks || 1) : 0;
          mcqScore += pts;
          mcqBreakdown.push({ questionId: q.id, questionText: q.question_text, studentAnswer: sa, correctAnswer: ca, isCorrect: correct, marks: pts });
        }

        // Grade Theory
        let writtenAutoScore = 0;
        const writtenBreakdown = [];
        for (const q of examQs.filter(q => q.type === 'theory')) {
          const rubric     = safeJSON(q.explanation, {});
          const answerText = writtenAnswers[String(q.id)] || '';
          const scoreData  = scoreTheoryAnswer(answerText, { ...q, ...rubric });
          writtenAutoScore += scoreData.score;
          console.log(`[Rescore] Theory Q${q.id}: answer="${answerText.substring(0,50)}..." score=${scoreData.score}/${q.marks||5}`);
          writtenBreakdown.push({
            questionId:      q.id,
            questionText:    q.question_text,
            marks:           q.marks || 5,
            studentAnswer:   answerText,
            wordCount:       scoreData.wordCount || 0,
            autoScore:       scoreData.score,
            maxScore:        scoreData.maxScore,
            matchedKeywords: scoreData.matchedKeywords,
            missingKeywords: scoreData.missingKeywords,
            percentage:      scoreData.percentage,
            facultyScore:    null,
            finalScore:      null,
          });
        }

        const totalScore = Math.round((mcqScore + writtenAutoScore) * 100) / 100;

        // Save structured answers + new score
        const newAnswers = JSON.stringify({
          mcq_answers:        mcqAnswers,
          written_answers:    writtenAnswers,
          mcq_score:          mcqScore,
          written_auto_score: Math.round(writtenAutoScore * 100) / 100,
          mcq_breakdown:      mcqBreakdown,
          written_breakdown:  writtenBreakdown,
        });

        await db.query(
          `UPDATE exam_assignments SET score=?, answers=? WHERE id=?`,
          [totalScore, newAnswers, asgn.id]
        );

        console.log(`[Rescore] Assignment ${asgn.id}: old score=${asgn.score} → new score=${totalScore}`);
        results.push({ assignmentId: asgn.id, studentId: asgn.student_id, oldScore: asgn.score, newScore: totalScore, mcqScore, writtenAutoScore });

      } catch (e) {
        console.error(`[Rescore] Assignment ${asgn.id} failed:`, e.message);
        results.push({ assignmentId: asgn.id, error: e.message });
      }
    }

    return res.json({ success: true, processed: results.length, results });

  } catch (err) {
    console.error('[Rescore] ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;