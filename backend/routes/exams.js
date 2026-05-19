const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendExamInvitation } = require('./emailService');
const AuditLogger = require('../services/auditLogger');

;(async () => {
  try {
    await db.query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('geo_sessions') AND name = 'last_ping_at'
      )
      ALTER TABLE geo_sessions ADD last_ping_at DATETIME NULL
    `);
    console.log('[Startup] geo_sessions last_ping_at column ensured');
  } catch (e) {
    console.warn('[Startup] geo_sessions migration skipped:', e.message);
  }
})();

const getClientInfo = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection?.remoteAddress || 'Unknown',
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
  if (eligibilityCrit?.min_cgpa)           { sq += ' AND cgpa >= ?'; sp.push(parseFloat(eligibilityCrit.min_cgpa)); }
  if (eligibilityCrit?.max_backlog != null) { sq += ' AND (backlogs IS NULL OR backlogs <= ?)'; sp.push(parseInt(eligibilityCrit.max_backlog)); }
  const [students] = await conn.query(sq, sp);
  return students;
}

async function resolveStudentId(jwtUser) {
  const jwtId = jwtUser.id, jwtEmail = jwtUser.email;
  try {
    const [r] = await db.query(`SELECT TOP 1 id FROM candidates WHERE id = ?`, [jwtId]);
    if (r.length) return r[0].id;
  } catch {}
  if (jwtEmail) {
    try {
      const [r] = await db.query(`SELECT TOP 1 id FROM candidates WHERE email = ?`, [jwtEmail]);
      if (r.length) return r[0].id;
    } catch {}
  }
  try {
    const [userRows] = await db.query(`SELECT TOP 1 email FROM users WHERE id = ?`, [jwtId]);
    if (userRows.length && userRows[0].email) {
      const [r] = await db.query(`SELECT TOP 1 id FROM candidates WHERE email = ?`, [userRows[0].email]);
      if (r.length) return r[0].id;
    }
  } catch {}
  if (typeof jwtId === 'string' && jwtId.startsWith('s_')) {
    const n = parseInt(jwtId.replace('s_', ''), 10);
    if (!isNaN(n)) {
      try {
        const [r] = await db.query(`SELECT TOP 1 id FROM candidates WHERE id = ?`, [n]);
        if (r.length) return r[0].id;
      } catch {}
    }
  }
  if (jwtEmail) {
    try {
      const [r] = await db.query(
        `SELECT TOP 1 ea.student_id FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE c.email = ?`,
        [jwtEmail]
      );
      if (r.length) return r[0].student_id;
    } catch {}
  }
  return jwtId;
}

function scoreTheoryAnswer(answerText, question) {
  const maxMarks  = question.marks || 5;
  const keywords  = question.keywords || '';
  const keyPoints = safeJSON(question.key_points, []);
  if (!answerText || !keywords) return { score: 0, maxScore: maxMarks, matchedKeywords: [], missingKeywords: [], percentage: 0, wordCount: 0 };
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
  } catch (err) { console.error(`[Email] Failed ${to}: ${err.message}`); }
}

function calcAutoTotalMarks(sectionsObj, sectionConfigObj, adaptiveOn, mcqDiffObj, theoryMarkDist, THEORY_MARKS) {
  let total = 0;
  for (const [type, enabled] of Object.entries(sectionsObj)) {
    if (!enabled) continue;
    const cfg = sectionConfigObj[type] || {};
    if (type === 'mcq') {
      const count = adaptiveOn
        ? Object.values(mcqDiffObj).reduce((s, v) => s + (parseInt(v) || 0), 0)
        : parseInt(cfg.questions || cfg.count || 0);
      total += count * 1;
    } else if (type === 'sql') {
      total += parseInt(cfg.questions || cfg.count || 0) * 2;
    } else if (type === 'theory' && theoryMarkDist && THEORY_MARKS) {
      for (const m of THEORY_MARKS) {
        total += (theoryMarkDist[m.key] || 0) * m.marks;
      }
    }
  }
  return total;
}

// ── POST /api/exams/create ────────────────────────────────────────────────────
router.post('/exams/create', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  const { ipAddress, userAgent } = getClientInfo(req);
  const {
    exam_type, title, college, batch_year, start_date, end_date,
    duration_minutes, total_marks, description,
    allowed_languages, sections, section_config, eligibility,
    exam_request_id, question_bank_session_code,
    adaptive_mcq, mcq_difficulty, cutoff_enabled, cutoffs, cutoff_score,
    theory_mark_distribution,
  } = req.body;

  if (normaliseExamType(exam_type) === 'university') return handleCreateUniversityExam(req, res);

  if (!title || !college || !batch_year || !start_date || !end_date)
    return res.status(400).json({ error: 'Missing required fields' });

  const sectionsObj      = safeJSON(sections,          { mcq: true, coding: true });
  const sectionConfigObj = safeJSON(section_config,    {});
  const eligibilityCrit  = safeJSON(eligibility,       {});
  const allowedLangsArr  = safeJSON(allowed_languages, []);
  const mcqDiffObj       = safeJSON(mcq_difficulty,    { easy: 30, medium: 50, hard: 20 });
  const cutoffsObj       = safeJSON(cutoffs,           {});
  const theoryMarkDist   = safeJSON(theory_mark_distribution, null);
  const examTypeDB       = normaliseExamType(exam_type);
  const examKey          = generateExamKey();

  const THEORY_MARKS_DEF = [
    { key: 'two', marks: 2 }, { key: 'five', marks: 5 },
    { key: 'ten', marks: 10 }, { key: 'part', marks: 3 },
  ];

  const autoMarks = calcAutoTotalMarks(sectionsObj, sectionConfigObj, adaptive_mcq, mcqDiffObj, theoryMarkDist, THEORY_MARKS_DEF);
  const finalTotalMarks = autoMarks > 0 ? autoMarks : (parseInt(total_marks) || 100);

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
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'scheduled',GETDATE())`,
      [
        examTypeDB, examKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 60, description || '',
        JSON.stringify(allowedLangsArr), finalTotalMarks,
        parsedCutoffScore, JSON.stringify(sectionsObj), JSON.stringify(sectionConfigObj),
        adaptive_mcq ? 1 : 0, JSON.stringify(mcqDiffObj),
        cutoff_enabled ? 1 : 0, JSON.stringify(cutoffsObj),
        exam_request_id || null, question_bank_session_code || null, req.user.id,
      ]
    );
    const examId = result[0]?.id;

    if (exam_request_id) {
      try { await conn.query(`UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`, [examId, exam_request_id]); } catch {}
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
          for (let i = 0; i < filteredQuestions.length; i++) {
            const q = filteredQuestions[i];
            await conn.query(
              `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [examId, q.id, q.type, q.question_text, q.option_a||null, q.option_b||null, q.option_c||null, q.option_d||null, q.correct_ans||null, q.explanation||null, q.difficulty||'medium', q.marks||(q.type==='sql'?2:1), i]
            );
          }
          totalQuestionsSaved = filteredQuestions.length;
        }
      }
    } else {
      for (const [sectionKey, enabled] of Object.entries(sectionsObj)) {
        if (!enabled) continue;
        const cfg      = sectionConfigObj[sectionKey] || {};
        const maxCount = parseInt(cfg.questions || cfg.count || 20);
        const [bankQs] = await conn.query(
          `SELECT TOP ${maxCount} * FROM question_bank WHERE type = ? AND is_active = 1 ORDER BY NEWID()`,
          [sectionKey]
        );
        if (bankQs.length > 0) {
          for (let i = 0; i < bankQs.length; i++) {
            const q = bankQs[i];
            await conn.query(
              `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [examId, q.id, q.type, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_ans, q.explanation, q.difficulty||'medium', q.marks||(q.type==='sql'?2:1), i]
            );
          }
          totalQuestionsSaved += bankQs.length;
        }
      }
    }

    let students = [];
    try { students = await findEligibleStudents(conn, { college, batch_year, eligibilityCrit }); } catch {}

    let assignmentRows = [];
    if (students.length > 0) {
      for (const s of students) {
        await conn.query(
          `INSERT INTO exam_assignments (exam_id, student_id, status, exam_key, assigned_at) VALUES (?,?,?,?,GETDATE())`,
          [examId, s.id, 'assigned', generateExamKey()]
        );
      }
      const [inserted] = await conn.query(
        `SELECT ea.exam_key, c.id AS student_id, c.name, c.email FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE ea.exam_id = ?`,
        [examId]
      );
      assignmentRows = inserted;
    }

    await conn.commit();

    try { await AuditLogger.logExamCreated(req.user.id, req.user.email || 'Unknown', { id: examId, title, exam_type: examTypeDB, college, total_marks: finalTotalMarks, duration_minutes: duration_minutes || 60 }, ipAddress, userAgent); } catch {}

    if (assignmentRows.length > 0) {
      Promise.allSettled(assignmentRows.map(a => trySendEmail({ to: a.email, studentName: a.name, examTitle: title, examKey: a.exam_key, duration: parseInt(duration_minutes) || 60 })));
    }

    return res.status(201).json({
      success: true, exam_id: examId, exam_key: examKey,
      total_marks: finalTotalMarks,
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

// ── handleCreateUniversityExam ────────────────────────────────────────────────
async function handleCreateUniversityExam(req, res) {
  const { ipAddress, userAgent } = getClientInfo(req);
  const {
    title, college, batch_year, start_date, end_date,
    duration_minutes, description,
    semester, exam_name, subject_code, subject_name,
    sections: sectionsRaw, section_config: sectionConfigRaw,
    question_bank_session_code,
    theory_mark_on, theory_mark_distribution,
  } = req.body;

  if (!title || !college || !batch_year || !start_date || !end_date)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!question_bank_session_code)
    return res.status(400).json({ error: 'question_bank_session_code is required for university exams' });

  const univSections   = safeJSON(sectionsRaw,      { mcq: true, theory: true });
  const sectionConfig  = safeJSON(sectionConfigRaw, {});
  const theoryMarkDist = safeJSON(theory_mark_distribution, null);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const examKey = generateExamKey();

    const [allQbRows] = await conn.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d,
              correct_ans, explanation, difficulty, marks, mark_type,
              keywords, key_points, bloom_level, unit, subject, topic
       FROM question_bank WHERE session_code = ? AND is_active = 1 ORDER BY type, marks ASC, id`,
      [question_bank_session_code]
    );

    const mcqPool    = allQbRows.filter(q => q.type === 'mcq');
    const theoryPool = allQbRows.filter(q => q.type === 'theory');

    const mcqCount    = parseInt(sectionConfig?.mcq?.count    || sectionConfig?.mcq?.questions    || mcqPool.length    || 20);
    const theoryCount = parseInt(sectionConfig?.theory?.count || sectionConfig?.theory?.questions || theoryPool.length || 0);

    const examQuestionRows = [];
    let orderIdx = 0;
    let mcqMarksTotal = 0, theoryMarksTotal = 0;

    if (univSections.mcq && mcqPool.length > 0) {
      const validMcq = mcqPool.filter(q => q.option_a && q.option_a.trim() !== '');
      const selected = shuffle(validMcq).slice(0, mcqCount);
      for (const q of selected) {
        const qMarks = q.marks || 1;
        mcqMarksTotal += qMarks;
        examQuestionRows.push([null, q.id, 'mcq', q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_ans, q.explanation||null, q.difficulty||'medium', qMarks, orderIdx++]);
      }
    }

    if ((univSections.theory || univSections.written) && theoryPool.length > 0) {
      const selected = theoryPool.slice(0, theoryCount);
      for (const q of selected) {
        const rubric = JSON.stringify({ keywords: q.keywords||'', key_points: safeJSON(q.key_points,[]), bloom_level: q.bloom_level||'', unit: q.unit||'', subject: q.subject||'', mark_type: q.mark_type||`${q.marks||5}m` });
        const qMarks = q.marks || 5;
        theoryMarksTotal += qMarks;
        examQuestionRows.push([null, q.id, 'theory', q.question_text||'', null, null, null, null, null, rubric, q.difficulty||'medium', qMarks, orderIdx++]);
      }
    }

    const autoTotalMarks = mcqMarksTotal + theoryMarksTotal || 100;

    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          total_marks, sections, section_config,
          semester, exam_name, subject_code, subject_name,
          question_bank_session_code, created_by, status, created_at)
       OUTPUT INSERTED.id
       VALUES ('university',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'scheduled',GETDATE())`,
      [examKey, title, college, batch_year, new Date(start_date), new Date(end_date), parseInt(duration_minutes)||90, description||'', autoTotalMarks, JSON.stringify(univSections), JSON.stringify(sectionConfig), semester||null, exam_name||null, subject_code||null, subject_name||null, question_bank_session_code, req.user.id]
    );
    const examId = result[0]?.id;

    if (examQuestionRows.length > 0) {
      for (const r of examQuestionRows) {
        r[0] = examId;
        await conn.query(
          `INSERT INTO exam_questions (exam_id, qb_id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, explanation, difficulty, marks, order_index) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          r
        );
      }
    }

    let stuQuery = `SELECT id, name, email FROM candidates WHERE status = 'active'`;
    const stuParams = [];
    if (college)    { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year) { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    const [students] = await conn.query(stuQuery, stuParams);

    const assignmentRows = [];
    if (students.length > 0) {
      for (const s of students) {
        await conn.query(
          `INSERT INTO exam_assignments (exam_id, student_id, status, exam_key, assigned_at) VALUES (?,?,?,?,GETDATE())`,
          [examId, s.id, 'assigned', generateExamKey()]
        );
      }
      const [inserted] = await conn.query(
        `SELECT ea.exam_key, c.name, c.email FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE ea.exam_id = ?`,
        [examId]
      );
      assignmentRows.push(...inserted);
    }

    await conn.commit();
    try { await AuditLogger.logExamCreated(req.user.id, req.user.email||'Unknown', { id: examId, title, exam_type: 'university', college, total_marks: autoTotalMarks, duration_minutes }, ipAddress, userAgent); } catch {}

    const examLabel = subject_name ? `${title} — ${subject_name}` : title;
    Promise.allSettled(assignmentRows.map(a => trySendEmail({ to: a.email, studentName: a.name, examTitle: examLabel, examKey: a.exam_key, duration: parseInt(duration_minutes)||90 })));

    const mcqSaved    = examQuestionRows.filter(r => r[2] === 'mcq').length;
    const theorySaved = examQuestionRows.filter(r => r[2] === 'theory').length;

    return res.status(201).json({ success: true, exam_id: examId, exam_key: examKey, total_marks: autoTotalMarks, questions_saved: examQuestionRows.length, mcq_saved: mcqSaved, theory_saved: theorySaved, student_count: assignmentRows.length, message: `University exam created. ${mcqSaved} MCQ + ${theorySaved} theory. ${autoTotalMarks} total marks. ${assignmentRows.length} students assigned.` });
  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// ── GET /api/exams ────────────────────────────────────────────────────────────
// FIX: replaced GROUP BY (which broke when exams table had extra columns)
//      with correlated subqueries — works regardless of schema changes.
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let conditions = 'WHERE 1=1';
    const params = [];
    if (college)   { conditions += ' AND e.college = ?';   params.push(college); }
    if (exam_type) { conditions += ' AND e.exam_type = ?'; params.push(exam_type); }
    if (status)    { conditions += ' AND e.status = ?';    params.push(status); }

    const sql = `
      SELECT e.*,
        (SELECT COUNT(*) FROM exam_assignments ea WHERE ea.exam_id = e.id) AS student_count,
        (SELECT COUNT(*) FROM exam_questions  eq WHERE eq.exam_id = e.id) AS question_count
      FROM exams e
      ${conditions}
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return res.json({
      exams: rows.map(e => ({
        ...e,
        name:              e.title,
        exam_name:         e.title,
        candidates:        e.student_count || 0,
        sections:          safeJSON(e.sections,          {}),
        section_config:    safeJSON(e.section_config,    {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
        mcq_difficulty:    safeJSON(e.mcq_difficulty,    {}),
        cutoffs_json:      safeJSON(e.cutoffs_json,      {}),
      })),
    });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch exams: ' + err.message }); }
});

// ── POST /api/exams/validate-key ──────────────────────────────────────────────
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.title, e.duration_minutes, e.sections, e.exam_type,
              e.status AS exam_status, e.cutoff_score,
              ea.id AS assignment_id, ea.status AS assignment_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.exam_status === 'completed') return res.status(400).json({ valid: false, error: 'Exam ended' });
    if (['submitted', 'absent'].includes(row.assignment_status)) return res.status(400).json({ valid: false, error: 'Already submitted' });
    const [questions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.id]
    );
    await db.query(`UPDATE exam_assignments SET status='started', started_at=GETDATE() WHERE id=?`, [row.assignment_id]);
    return res.json({ valid: true, exam_id: row.id, assignment_id: row.assignment_id, title: row.title, duration: row.duration_minutes, exam_type: row.exam_type, sections: safeJSON(row.sections, {}), cutoff_score: row.cutoff_score, questions });
  } catch (err) { return res.status(500).json({ error: 'Failed to validate key' }); }
});

// ── POST /api/exams/university/validate-key ───────────────────────────────────
router.post('/exams/university/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.id AS exam_id, e.title, e.duration_minutes, e.sections, e.section_config,
              e.exam_type, e.status AS exam_status,
              ea.id AS assignment_id, ea.status AS assignment_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.exam_status === 'completed') return res.status(400).json({ valid: false, error: 'Exam ended' });
    if (['submitted', 'absent'].includes(row.assignment_status)) return res.status(400).json({ valid: false, error: 'Already submitted' });
    const [allQuestions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, correct_ans, difficulty, marks, explanation FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.exam_id]
    );
    const mcqRaw    = allQuestions.filter(q => q.type === 'mcq');
    const theoryRaw = allQuestions.filter(q => q.type === 'theory');
    const paper_mcq     = shuffle(mcqRaw).map(q => ({ id: q.id, type: 'mcq', question_text: q.question_text||'', option_a: q.option_a||'', option_b: q.option_b||'', option_c: q.option_c||'', option_d: q.option_d||'', correct_ans: q.correct_ans||'', difficulty: q.difficulty||'medium', marks: q.marks||1 }));
    const paper_written = theoryRaw.map(q => ({ id: q.id, type: 'theory', question: q.question_text||'', marks: q.marks||5 }));
    await db.query(`UPDATE exam_assignments SET status='started', started_at=GETDATE() WHERE id=?`, [row.assignment_id]);
    return res.json({ valid: true, exam_id: row.exam_id, assignment_id: row.assignment_id, title: row.title, duration: row.duration_minutes, exam_type: 'university', sections: safeJSON(row.sections, {}), paper_mcq, paper_written, questions: paper_mcq });
  } catch (err) {
    console.error('[UnivValidateKey] ERROR:', err.message);
    return res.status(500).json({ error: 'Failed to validate university exam key' });
  }
});

// ── GET /api/exams/theory/by-exam/:examId ─────────────────────────────────────
router.get('/exams/theory/by-exam/:examId', authenticateToken, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId, 10);
    if (isNaN(examId)) return res.status(400).json({ error: 'Invalid examId' });
    const [examRows] = await db.query(`SELECT duration_minutes FROM exams WHERE id = ?`, [examId]);
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const [questions] = await db.query(
      `SELECT id, type, question_text, marks, explanation FROM exam_questions WHERE exam_id = ? AND type = 'theory' ORDER BY order_index`,
      [examId]
    );
    return res.json({ questions: questions.map(q => ({ id: q.id, question: q.question_text, text: q.question_text, marks: q.marks||5, type: 'theory', rubric: q.explanation })), total: questions.length, duration: examRows[0].duration_minutes||60 });
  } catch (err) {
    console.error('[TheoryByExam]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/university/:examId/submit ─────────────────────────────────
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const body = req.body;
    const bodyAssignmentId = body.assignment_id;
    let mcq_answers, written_answers;
    if (body.written_answers && typeof body.written_answers === 'object') {
      mcq_answers = body.mcq_answers || {}; written_answers = body.written_answers;
    } else if (body.answers && typeof body.answers === 'object') {
      mcq_answers = body.mcq_answers || {}; written_answers = body.answers;
    } else {
      const NON_KEYS = new Set(['assignment_id','exam_id','mcq_answers','written_answers','answers','token','round','violation_count','violations','auto_submitted']);
      mcq_answers = body.mcq_answers || {}; written_answers = {};
      for (const [k, v] of Object.entries(body)) {
        if (!NON_KEYS.has(k) && typeof v === 'string' && v.length > 0) written_answers[k] = v;
      }
    }
    const studentId = await resolveStudentId(req.user);
    let assignRows = [];
    const tryQuery = async (sql, params) => { const [r] = await db.query(sql, params); return r; };
    const base = `SELECT ea.id, ea.student_id, ea.status, e.section_config, e.total_marks FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id`;
    assignRows = await tryQuery(`${base} WHERE ea.student_id = ? AND ea.exam_id = ?`, [studentId, examId]);
    if (!assignRows.length && req.user.email)
      assignRows = await tryQuery(`${base} JOIN candidates c ON c.id = ea.student_id WHERE c.email = ? AND ea.exam_id = ?`, [req.user.email, examId]);
    if (!assignRows.length && bodyAssignmentId)
      assignRows = await tryQuery(`${base} WHERE ea.id = ? AND ea.exam_id = ?`, [bodyAssignmentId, examId]);
    if (!assignRows.length && req.user.id)
      assignRows = await tryQuery(`${base} WHERE ea.student_id = ? AND ea.exam_id = ?`, [req.user.id, examId]);
    if (!assignRows.length)
      return res.status(404).json({ error: 'Assignment not found. Contact admin.', debug: { jwtId: req.user.id, email: req.user.email, examId } });
    const row = assignRows[0];
    if (row.status === 'submitted') return res.status(400).json({ error: 'Already submitted' });
    const cfg        = safeJSON(row.section_config, {});
    const mcqMarkPer = parseInt(cfg?.mcq?.marks ?? 1);
    const [examQs] = await db.query(
      `SELECT id, type, question_text, correct_ans, marks, explanation FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [examId]
    );
    const answers = {};
    for (const [k, v] of Object.entries(mcq_answers || {})) answers[String(k)] = v;
    let mcqScore = 0;
    const mcqBreakdown = [];
    for (const q of examQs.filter(q => q.type === 'mcq')) {
      const sa = (answers[String(q.id)] || '').toUpperCase();
      const ca = (q.correct_ans || '').toUpperCase();
      const correct = sa !== '' && sa === ca;
      const pts = correct ? (q.marks || mcqMarkPer) : 0;
      mcqScore += pts;
      mcqBreakdown.push({ questionId: q.id, questionText: q.question_text, studentAnswer: sa, correctAnswer: ca, isCorrect: correct, marks: pts });
    }
    const writtenAnswers = {};
    for (const [k, v] of Object.entries(written_answers || {})) writtenAnswers[String(k)] = v;
    let writtenAutoScore = 0;
    const writtenBreakdown = [];
    for (const q of examQs.filter(q => q.type === 'theory')) {
      const rubric     = safeJSON(q.explanation, {});
      const answerText = writtenAnswers[String(q.id)] || '';
      const scoreData  = scoreTheoryAnswer(answerText, { ...q, ...rubric });
      writtenAutoScore += scoreData.score;
      writtenBreakdown.push({ questionId: q.id, questionText: q.question_text, marks: q.marks||5, studentAnswer: answerText, wordCount: scoreData.wordCount||0, autoScore: scoreData.score, maxScore: scoreData.maxScore, matchedKeywords: scoreData.matchedKeywords, missingKeywords: scoreData.missingKeywords, percentage: scoreData.percentage, facultyScore: null, finalScore: null });
    }
    const totalScore = Math.round((mcqScore + writtenAutoScore) * 100) / 100;
    await db.query(
      `UPDATE exam_assignments SET status='submitted', submitted_at=GETDATE(), score=?, answers=? WHERE id=?`,
      [totalScore, JSON.stringify({ mcq_answers: answers, written_answers: writtenAnswers, mcq_score: mcqScore, written_auto_score: Math.round(writtenAutoScore*100)/100, mcq_breakdown: mcqBreakdown, written_breakdown: writtenBreakdown }), row.id]
    );
    return res.json({ success: true, message: 'Submitted successfully.', mcqScore, writtenAutoScore: Math.round(writtenAutoScore*100)/100, totalScore });
  } catch (err) {
    console.error('[UnivSubmit] ERROR:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/exams/student/university ─────────────────────────────────────────
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
                WHEN GETDATE() BETWEEN e.start_date AND e.end_date THEN 'live'
                WHEN GETDATE() < e.start_date THEN 'assigned'
                ELSE 'submitted'
              END AS computed_status
       FROM exam_assignments ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.student_id = ? AND e.exam_type = 'university'
       ORDER BY e.start_date DESC`,
      [studentId]
    );
    const enriched = rows.map(r => {
      const sec = safeJSON(r.sections, {});
      return { ...r, status: r.computed_status, exam_type: 'university', hasMcq: !!(sec.mcq), hasTheory: !!(sec.theory||sec.written), hasWritten: !!(sec.theory||sec.written), hasCoding: !!(sec.coding), sections: sec };
    });
    res.json(enriched);
  } catch (err) {
    console.error('[UnivStudentExams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/university-exam/:examId/report ─────────────────────────────
router.get('/admin/university-exam/:examId/report', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;
    const [examRows] = await db.query(
      `SELECT id, title, subject_name, subject_code, semester, duration_minutes, total_marks, pass_mark, college, batch_year, section_config FROM exams WHERE id = ?`,
      [examId]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];
    const [assignRows] = await db.query(
      `SELECT ea.id AS assignment_id, ea.student_id, c.name AS student_name, c.email AS student_email,
              ea.status, ea.assigned_at, ea.started_at, ea.submitted_at, ea.score AS total_score, ea.answers
       FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id
       WHERE ea.exam_id = ? ORDER BY ea.score DESC`,
      [examId]
    );
    const passMark  = exam.pass_mark || Math.floor((exam.total_marks||100)*0.4);
    const submitted = assignRows.filter(r => r.status==='submitted'||r.status==='completed');
    const scores    = submitted.map(r => r.total_score||0);
    const avg       = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10 : 0;
    const passRate  = Math.round((scores.filter(s=>s>=passMark).length/(scores.length||1))*100);
    const studentList = assignRows.map((r, idx) => {
      let parsed = {};
      try { parsed = typeof r.answers==='string' ? JSON.parse(r.answers) : (r.answers||{}); } catch {}
      const isDone = r.status==='submitted'||r.status==='completed';
      const pct    = r.total_score!=null&&exam.total_marks ? Math.round(r.total_score/exam.total_marks*100) : null;
      return { rank: isDone?idx+1:null, assignment_id: r.assignment_id, studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email, status: r.status, assignedAt: r.assigned_at, startedAt: r.started_at, submittedAt: r.submitted_at, totalScore: r.total_score, totalMarks: exam.total_marks, percentage: pct, passed: r.total_score!=null?r.total_score>=passMark:null, mcqScore: parsed.mcq_score??null, writtenScore: parsed.written_auto_score??null, mcqBreakdown: parsed.mcq_breakdown||[], writtenBreakdown: parsed.written_breakdown||[] };
    });
    return res.json({ exam: { ...exam, sectionConfig: safeJSON(exam.section_config,{}) }, summary: { totalStudents: assignRows.length, submitted: submitted.length, notStarted: assignRows.filter(r=>r.status==='assigned').length, inProgress: assignRows.filter(r=>r.status==='started').length, avgScore: avg, highestScore: scores.length?Math.max(...scores):0, lowestScore: scores.length?Math.min(...scores):0, passRate, passMark }, students: studentList });
  } catch (err) {
    console.error('[UnivAdminReport]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/university-exam/review-written ────────────────────────────
router.post('/admin/university-exam/review-written', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { assignmentId, questionId, facultyScore, facultyComment } = req.body;
    if (!assignmentId || !questionId || facultyScore==null)
      return res.status(400).json({ error: 'assignmentId, questionId, facultyScore required' });
    const [rows] = await db.query(`SELECT id, score, answers FROM exam_assignments WHERE id=?`, [assignmentId]);
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const row       = rows[0];
    const parsed    = safeJSON(row.answers, {});
    const breakdown = parsed.written_breakdown || [];
    let   newWrittenTotal = 0;
    const updated = breakdown.map(item => {
      if (String(item.questionId)===String(questionId)) {
        const finalScore = Math.min(parseFloat(facultyScore), item.maxScore||item.marks||8);
        newWrittenTotal += finalScore;
        return { ...item, facultyScore: finalScore, facultyComment: facultyComment||'', finalScore, reviewedAt: new Date().toISOString() };
      }
      const use = item.facultyScore!=null ? item.facultyScore : (item.autoScore||0);
      newWrittenTotal += use;
      return item;
    });
    const newTotal = Math.round(((parsed.mcq_score||0)+newWrittenTotal)*100)/100;
    await db.query(`UPDATE exam_assignments SET score=?, answers=? WHERE id=?`, [newTotal, JSON.stringify({...parsed, written_breakdown: updated, written_auto_score: Math.round(newWrittenTotal*100)/100}), assignmentId]);
    return res.json({ success: true, newWrittenTotal, newTotal });
  } catch (err) {
    console.error('[ReviewWritten]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/exams/:id ────────────────────────────────────────────────────────
// FIX: replaced GROUP BY with correlated subqueries to avoid missing-column errors
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
         (SELECT COUNT(*) FROM exam_assignments ea WHERE ea.exam_id = e.id) AS student_count,
         (SELECT COUNT(*) FROM exam_questions  eq WHERE eq.exam_id = e.id) AS question_count
       FROM exams e
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
    const e = rows[0];
    return res.json({ exam: { ...e, sections: safeJSON(e.sections,{}), section_config: safeJSON(e.section_config,{}), allowed_languages: safeJSON(e.allowed_languages,[]), mcq_difficulty: safeJSON(e.mcq_difficulty,{}) } });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch exam: ' + err.message }); }
});

// ── GET /api/exams/:id/students ───────────────────────────────────────────────
router.get('/exams/:id/students', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id AS student_id, c.name, c.email, ea.id AS assignment_id, ea.exam_key, ea.status, ea.score, ea.assigned_at, ea.submitted_at
       FROM exam_assignments ea JOIN candidates c ON c.id = ea.student_id WHERE ea.exam_id = ? ORDER BY c.name ASC`,
      [req.params.id]
    );
    return res.json({ students: rows });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch students' }); }
});

// ── POST /api/admin/university-exam/:examId/rescore ───────────────────────────
router.post('/admin/university-exam/:examId/rescore', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;
    const [examQs] = await db.query(`SELECT id, type, question_text, correct_ans, marks, explanation FROM exam_questions WHERE exam_id = ? ORDER BY order_index`, [examId]);
    const [assignments] = await db.query(`SELECT id, student_id, answers, score FROM exam_assignments WHERE exam_id = ? AND status = 'submitted' AND answers IS NOT NULL`, [examId]);
    const results = [];
    for (const asgn of assignments) {
      try {
        let raw = asgn.answers;
        if (typeof raw==='string') { try { raw=JSON.parse(raw); } catch { raw={}; } }
        let mcqAnswers={}, writtenAnswers={};
        if (raw.written_answers && typeof raw.written_answers==='object') {
          mcqAnswers=raw.mcq_answers||{}; writtenAnswers=raw.written_answers;
        } else {
          const SKIP=new Set(['assignment_id','exam_id','mcq_answers','written_answers','answers','token','mcq_score','written_auto_score','mcq_breakdown','written_breakdown']);
          mcqAnswers=raw.mcq_answers||{};
          for (const [k,v] of Object.entries(raw)) { if (!SKIP.has(k)&&typeof v==='string'&&v.length>0) writtenAnswers[k]=v; }
        }
        let mcqScore=0; const mcqBreakdown=[];
        for (const q of examQs.filter(q=>q.type==='mcq')) {
          const sa=(mcqAnswers[String(q.id)]||'').toUpperCase(); const ca=(q.correct_ans||'').toUpperCase();
          const correct=sa!==''&&sa===ca; const pts=correct?(q.marks||1):0; mcqScore+=pts;
          mcqBreakdown.push({questionId:q.id,questionText:q.question_text,studentAnswer:sa,correctAnswer:ca,isCorrect:correct,marks:pts});
        }
        let writtenAutoScore=0; const writtenBreakdown=[];
        for (const q of examQs.filter(q=>q.type==='theory')) {
          const rubric=safeJSON(q.explanation,{}); const answerText=writtenAnswers[String(q.id)]||'';
          const scoreData=scoreTheoryAnswer(answerText,{...q,...rubric}); writtenAutoScore+=scoreData.score;
          writtenBreakdown.push({questionId:q.id,questionText:q.question_text,marks:q.marks||5,studentAnswer:answerText,wordCount:scoreData.wordCount||0,autoScore:scoreData.score,maxScore:scoreData.maxScore,matchedKeywords:scoreData.matchedKeywords,missingKeywords:scoreData.missingKeywords,percentage:scoreData.percentage,facultyScore:null,finalScore:null});
        }
        const totalScore=Math.round((mcqScore+writtenAutoScore)*100)/100;
        await db.query(`UPDATE exam_assignments SET score=?, answers=? WHERE id=?`, [totalScore, JSON.stringify({mcq_answers:mcqAnswers,written_answers:writtenAnswers,mcq_score:mcqScore,written_auto_score:Math.round(writtenAutoScore*100)/100,mcq_breakdown:mcqBreakdown,written_breakdown:writtenBreakdown}), asgn.id]);
        results.push({assignmentId:asgn.id,studentId:asgn.student_id,oldScore:asgn.score,newScore:totalScore,mcqScore,writtenAutoScore});
      } catch(e) { results.push({assignmentId:asgn.id,error:e.message}); }
    }
    return res.json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('[Rescore] ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;