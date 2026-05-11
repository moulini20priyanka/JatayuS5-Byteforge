// routes/exams.js  — Question Bank flow
// FIXES:
//   1. Removed duplicate closing block in normaliseExamType (syntax error that crashed server)
//   2. AuditLogger.logExamCreated now called with await + try/catch so failures are visible
//   3. Added console.log before/after audit call so you can confirm it fires

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendExamInviteEmail }  = require('./emailService');
const AuditLogger = require('../services/auditLogger');

const getClientInfo = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection?.remoteAddress || 'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

function generateExamKey() {
  return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
}
function generateUnivKey(prefix = 'UNI') {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`;
}

const safeJSON = (val, fallback) => {
  if (!val) return fallback;
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

async function trySendEmail({ to, studentName, examTitle, examKey, duration }) {
  try {
    await sendExamInviteEmail(to, studentName || 'Student', examTitle, examKey, duration);
    console.log(`[Email] Sent to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed for ${to}:`, err.message);
  }
}

async function findEligibleStudents(conn, { college, batch_year, eligibilityCrit }) {
  let sq = `SELECT id, name, email FROM candidates WHERE status = 'active'`;
  const sp = [];
  if (college)    { sq += ' AND college = ?';    sp.push(college); }
  if (batch_year) { sq += ' AND batch = ?';      sp.push(parseInt(batch_year)); }
  if (eligibilityCrit?.min_cgpa) {
    sq += ' AND cgpa >= ?';
    sp.push(parseFloat(eligibilityCrit.min_cgpa));
  }
  if (eligibilityCrit?.max_backlog !== undefined) {
    sq += ' AND (backlogs IS NULL OR backlogs <= ?)';
    sp.push(parseInt(eligibilityCrit.max_backlog));
  }
  const [students] = await conn.query(sq, sp);
  console.log(`[FindStudents] ${students.length} candidates matched`);
  return students;
}

async function resolveStudentId(jwtUser) {
  const jwtId    = jwtUser.id;
  const jwtEmail = jwtUser.email;
  try {
    const [byId] = await db.query(`SELECT id FROM candidates WHERE id=? LIMIT 1`, [jwtId]);
    if (byId.length > 0) return byId[0].id;
  } catch {}
  if (jwtEmail) {
    try {
      const [byEmail] = await db.query(`SELECT id FROM candidates WHERE email=? LIMIT 1`, [jwtEmail]);
      if (byEmail.length > 0) return byEmail[0].id;
    } catch {}
  }
  return jwtId;
}

// ── FIX: normaliseExamType — duplicate block removed ─────────────────────────
// The old file had the closing brace duplicated, causing a SyntaxError on load.
function normaliseExamType(raw) {
  const t = (raw || 'placement').toString().toLowerCase().trim();
  const map = {
    'placement':           'placement',
    'hiring':              'placement',
    'general':             'placement',
    'corporate':           'placement',
    'recruitment':         'placement',
    'university':          'university',
    'academic':            'university',
    'college':             'university',
    'skill_cert':          'skill_cert',
    'skill_certification': 'skill_cert',
    'certification':       'skill_cert',
    'certificate':         'skill_cert',
  };
  const mapped = map[t];
  if (!mapped) {
    console.warn(`[CreateExam] Unknown exam_type "${raw}" → defaulting to "placement"`);
  }
  return mapped || 'placement';
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/create
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/exams/create',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    const { ipAddress, userAgent } = getClientInfo(req);
    console.log('[CreateExam] User:', req.user?.role, req.user?.id);
    console.log('[CreateExam] Raw exam_type received:', req.body.exam_type);

    const {
      exam_type,
      title,
      college,
      batch_year,
      start_date,
      end_date,
      duration_minutes,
      total_marks,
      pass_mark,
      description,
      allowed_languages,
      sections,
      section_config,
      eligibility,
      exam_request_id,
      question_bank_session_code,
      adaptive_mcq,
      mcq_difficulty,
      cutoff_enabled,
      cutoffs,
      cutoff_score,
    } = req.body;

    if (exam_type === 'university') {
      return handleCreateUniversityExam(req, res);
    }

    if (!title || !college || !batch_year || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields: title, college, batch_year, start_date, end_date',
      });
    }

    const sectionsObj      = safeJSON(sections,           { mcq: true, coding: true });
    const sectionConfigObj = safeJSON(section_config,     {});
    const eligibilityCrit  = safeJSON(eligibility,        {});
    const allowedLangsArr  = safeJSON(allowed_languages,  []);
    const mcqDiffObj       = safeJSON(mcq_difficulty,     { easy: 30, medium: 50, hard: 20 });
    const cutoffsObj       = safeJSON(cutoffs,            {});

    const examTypeDB = normaliseExamType(exam_type);
    console.log(`[CreateExam] exam_type: "${exam_type}" → DB: "${examTypeDB}"`);

    const examKey = generateExamKey();

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
            allowed_languages, total_marks,
            cutoff_score,
            sections, section_config,
            adaptive_mcq, mcq_difficulty,
            cutoff_enabled, cutoffs_json,
            exam_request_id,
            question_bank_session_code,
            created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
        [
          examTypeDB,
          examKey,
          title,
          college,
          batch_year,
          new Date(start_date),
          new Date(end_date),
          parseInt(duration_minutes) || 60,
          description || '',
          JSON.stringify(allowedLangsArr),
          parseInt(total_marks) || 100,
          parsedCutoffScore,
          JSON.stringify(sectionsObj),
          JSON.stringify(sectionConfigObj),
          adaptive_mcq ? 1 : 0,
          JSON.stringify(mcqDiffObj),
          cutoff_enabled ? 1 : 0,
          JSON.stringify(cutoffsObj),
          exam_request_id || null,
          question_bank_session_code || null,
          req.user.id,
        ]
      );
      const examId = result.insertId;
      console.log(`[CreateExam] exam id=${examId}, key=${examKey}, type=${examTypeDB}`);

      if (exam_request_id) {
        try {
          await conn.query(
            `UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`,
            [examId, exam_request_id]
          );
        } catch (e) {
          console.warn('[CreateExam] exam_request update skipped:', e.message);
        }
      }

      let totalQuestionsSaved = 0;

      if (question_bank_session_code) {
        const [qbQuestions] = await conn.query(
          `SELECT qb.*, qbs.id AS session_id
           FROM question_bank qb
           LEFT JOIN question_bank_sessions qbs
             ON qbs.session_code = qb.session_code
           WHERE qb.session_code = ? AND qb.is_active = 1
           ORDER BY qb.type, qb.topic, qb.id`,
          [question_bank_session_code]
        );

        console.log(`[CreateExam] QB session ${question_bank_session_code}: ${qbQuestions.length} questions`);

        if (qbQuestions.length > 0) {
          const filteredQuestions = [];

          for (const [sectionKey, enabled] of Object.entries(sectionsObj)) {
            if (!enabled) continue;

            const cfg      = sectionConfigObj[sectionKey] || {};
            const maxCount = parseInt(cfg.questions || cfg.count || 9999);
            const dbType   = sectionKey === 'behavioral' ? 'mcq' : sectionKey;

            let sectionQs = qbQuestions.filter(q => q.type === dbType);

            if (sectionKey === 'mcq' && adaptive_mcq && mcqDiffObj) {
              const easy   = Math.round(maxCount * (mcqDiffObj.easy   || 30) / 100);
              const medium = Math.round(maxCount * (mcqDiffObj.medium || 50) / 100);
              const hard   = maxCount - easy - medium;

              const easyQs   = shuffle(sectionQs.filter(q => q.difficulty === 'easy')).slice(0, easy);
              const mediumQs = shuffle(sectionQs.filter(q => q.difficulty === 'medium')).slice(0, medium);
              const hardQs   = shuffle(sectionQs.filter(q => q.difficulty === 'hard')).slice(0, hard);
              sectionQs = shuffle([...easyQs, ...mediumQs, ...hardQs]);
            } else {
              sectionQs = shuffle(sectionQs).slice(0, maxCount);
            }

            filteredQuestions.push(...sectionQs);
          }

          if (filteredQuestions.length > 0) {
            const qValues = filteredQuestions.map((q, i) => [
              examId,
              q.id          || null,
              q.type,
              q.question_text,
              q.option_a    || null,
              q.option_b    || null,
              q.option_c    || null,
              q.option_d    || null,
              q.correct_ans || null,
              q.explanation || null,
              q.difficulty  || 'medium',
              1,
              i,
            ]);

            await conn.query(
              `INSERT INTO exam_questions
                 (exam_id, qb_id, type, question_text,
                  option_a, option_b, option_c, option_d,
                  correct_ans, explanation, difficulty, marks, order_index)
               VALUES ?`,
              [qValues]
            );

            totalQuestionsSaved = filteredQuestions.length;
            console.log(`[CreateExam] Stored ${totalQuestionsSaved} questions from QB session`);
          }
        }
      } else {
        for (const [sectionKey, enabled] of Object.entries(sectionsObj)) {
          if (!enabled) continue;
          const cfg      = sectionConfigObj[sectionKey] || {};
          const maxCount = parseInt(cfg.questions || cfg.count || 20);
          const dbType   = sectionKey;

          const [bankQs] = await conn.query(
            `SELECT * FROM question_bank WHERE type = ? AND is_active = 1 ORDER BY RAND() LIMIT ?`,
            [dbType, maxCount]
          );

          if (bankQs.length > 0) {
            const qValues = bankQs.map((q, i) => [
              examId, q.id, q.type, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d,
              q.correct_ans, q.explanation, q.difficulty || 'medium', 1, i,
            ]);
            await conn.query(
              `INSERT INTO exam_questions
                 (exam_id, qb_id, type, question_text,
                  option_a, option_b, option_c, option_d,
                  correct_ans, explanation, difficulty, marks, order_index)
               VALUES ?`,
              [qValues]
            );
            totalQuestionsSaved += bankQs.length;
          }
        }
        console.log(`[CreateExam] Stored ${totalQuestionsSaved} questions from general bank`);
      }

      // ── Student assignment ────────────────────────────────────────────────
      let students = [];
      try {
        students = await findEligibleStudents(conn, { college, batch_year, eligibilityCrit });
      } catch (err) {
        console.error('[CreateExam] Student lookup error:', err.message);
      }

      let assignmentRows = [];
      if (students.length > 0) {
        const assignValues = students.map(s => [
          examId, s.id, 'assigned', generateExamKey(), new Date(),
        ]);
        await conn.query(
          `INSERT INTO exam_assignments (exam_id, student_id, status, exam_key, assigned_at) VALUES ?`,
          [assignValues]
        );
        const [inserted] = await conn.query(
          `SELECT ea.exam_key, c.id AS student_id, c.name, c.email
           FROM exam_assignments ea
           JOIN candidates c ON c.id = ea.student_id
           WHERE ea.exam_id = ?`,
          [examId]
        );
        assignmentRows = inserted;
      }

      await conn.commit();
      console.log(`[CreateExam] ✅ Transaction committed. examId=${examId}, students=${assignmentRows.length}`);

      // ── FIX: Audit log with explicit try/catch + logging ──────────────────
      // Previously this could silently fail if AuditLogger methods weren't
      // awaited properly or the audit_logs table had a schema mismatch.
      try {
        console.log(`[AuditLog] Attempting EXAM_CREATED log for examId=${examId}…`);
        await AuditLogger.logExamCreated(
          req.user.id,
          req.user.email || req.user.name || req.user.username || 'Unknown',
          {
            id:               examId,
            title,
            exam_type:        examTypeDB,
            college,
            total_marks:      total_marks || 100,
            duration_minutes: duration_minutes || 60,
          },
          ipAddress,
          userAgent
        );
        console.log(`[AuditLog] ✅ EXAM_CREATED logged successfully for examId=${examId}`);
      } catch (auditErr) {
        // Never crash the response because of audit failure
        console.error(`[AuditLog] ❌ EXAM_CREATED failed for examId=${examId}:`, auditErr.message);
        console.error('[AuditLog] Stack:', auditErr.stack);
      }

      // ── Audit: exam assigned ──────────────────────────────────────────────
      if (assignmentRows.length > 0) {
        try {
          await AuditLogger.logExamAssigned(
            req.user.id,
            req.user.email || req.user.name || 'Unknown',
            examId,
            title,
            assignmentRows.length,
            ipAddress,
            userAgent
          );
          console.log(`[AuditLog] ✅ EXAM_ASSIGNED logged — ${assignmentRows.length} students`);
        } catch (auditErr) {
          console.error('[AuditLog] ❌ EXAM_ASSIGNED failed:', auditErr.message);
        }

        // Send emails non-blocking
        Promise.allSettled(
          assignmentRows.map(a =>
            trySendEmail({
              to:          a.email,
              studentName: a.name,
              examTitle:   title,
              examKey:     a.exam_key,
              duration:    parseInt(duration_minutes) || 60,
            })
          )
        ).then(results => {
          const ok = results.filter(r => r.status === 'fulfilled').length;
          console.log(`[Exam ${examId}] Emails: ${ok}/${assignmentRows.length} sent`);
        });
      }

      return res.status(201).json({
        success:           true,
        exam_id:           examId,
        exam_key:          examKey,
        questions_saved:   totalQuestionsSaved,
        student_count:     assignmentRows.length,
        students_notified: assignmentRows.length,
        source:            question_bank_session_code ? 'question_bank_session' : 'question_bank',
        cutoff_score:      parsedCutoffScore,
        students: assignmentRows.map(a => ({
          name:     a.name,
          email:    a.email,
          exam_key: a.exam_key,
        })),
        message: `Exam created. ${totalQuestionsSaved} questions stored. ${assignmentRows.length} students assigned and notified.`,
      });

    } catch (err) {
      await conn.rollback();
      console.error('[CreateExam] FATAL:', err.message);
      console.error('[CreateExam] SQL:', err.sql?.substring(0, 400));
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// University exam handler
// ─────────────────────────────────────────────────────────────────────────────
async function handleCreateUniversityExam(req, res) {
  const { ipAddress, userAgent } = getClientInfo(req);
  const {
    title, college, batch_year, start_date, end_date,
    duration_minutes, total_marks, pass_mark, description,
    semester, exam_name, subject_code, subject_name,
    sections: sectionsRaw, section_config: sectionConfigRaw,
  } = req.body;

  if (!title || !college || !batch_year || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const univSections  = safeJSON(sectionsRaw,      { mcq: true, written: true });
  const sectionConfig = safeJSON(sectionConfigRaw, {});

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const masterKey = generateUnivKey('UNI');

    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          total_marks, sections,
          department, semester, exam_name, subject_code, subject_name,
          section_config, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        'university', masterKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 90,
        description || '',
        parseInt(total_marks) || 100,
        JSON.stringify(univSections),
        req.body.department || null,
        semester || null, exam_name || null,
        subject_code || null, subject_name || null,
        JSON.stringify(sectionConfig),
        req.user.id,
      ]
    );
    const examId = result.insertId;

    const mcqCount = parseInt(sectionConfig?.mcq?.count || 20);
    let allMcq = [];
    if (univSections.mcq) {
      const [bankMcq] = await conn.query(
        `SELECT * FROM question_bank WHERE type = 'mcq' AND is_active = 1 ORDER BY RAND() LIMIT ?`,
        [mcqCount]
      );
      allMcq = bankMcq.map(q => ({
        id: q.id, text: q.question_text,
        options: [
          { key: 'A', text: q.option_a || '' },
          { key: 'B', text: q.option_b || '' },
          { key: 'C', text: q.option_c || '' },
          { key: 'D', text: q.option_d || '' },
        ].filter(o => o.text),
        answer: q.correct_ans,
        marks: parseInt(sectionConfig?.mcq?.marks || 1),
      }));
    }

    const writtenCount = parseInt(sectionConfig?.written?.count || 5);
    let allWritten = [];
    if (univSections.written) {
      const usedIds = new Set(allMcq.map(q => q.id));
      const [bankWritten] = await conn.query(
        `SELECT * FROM question_bank WHERE type = 'mcq' AND is_active = 1 ORDER BY RAND() LIMIT ?`,
        [writtenCount + mcqCount]
      );
      allWritten = bankWritten
        .filter(q => !usedIds.has(q.id))
        .slice(0, writtenCount)
        .map(q => ({ id: q.id, text: q.question_text, marks: parseInt(sectionConfig?.written?.marks || 8) }));
    }

    try {
      await conn.query(
        `INSERT INTO exam_question_banks (exam_id, mcq_pool, written_pool, created_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE mcq_pool=VALUES(mcq_pool), written_pool=VALUES(written_pool)`,
        [examId, JSON.stringify(allMcq), JSON.stringify(allWritten)]
      );
    } catch (err) {
      console.warn('[UnivExam] exam_question_banks insert skipped:', err.message);
    }

    let stuQuery = `SELECT id, name, email FROM candidates WHERE status = 'active'`;
    const stuParams = [];
    if (college)             { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year)          { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    if (req.body.department) { stuQuery += ' AND branch = ?';  stuParams.push(req.body.department); }
    const [students] = await conn.query(stuQuery, stuParams);

    function shuffleArr(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const emailQueue = [];
    for (const student of students) {
      const [existing] = await conn.query(
        `SELECT id FROM university_exam_assignments WHERE exam_id=? AND student_id=?`,
        [examId, student.id]
      );
      if (existing.length > 0) continue;
      const sKey = generateUnivKey('UNI');
      await conn.query(
        `INSERT INTO university_exam_assignments
           (exam_id, student_id, exam_key, paper_mcq, paper_written, status, assigned_at)
         VALUES (?, ?, ?, ?, ?, 'assigned', NOW())`,
        [examId, student.id, sKey, JSON.stringify(shuffleArr(allMcq)), JSON.stringify(shuffleArr(allWritten))]
      );
      emailQueue.push({ student, examKey: sKey });
    }

    await conn.commit();

    // ── Audit log for university exam ─────────────────────────────────────
    try {
      await AuditLogger.logExamCreated(
        req.user.id,
        req.user.email || req.user.name || 'Unknown',
        { id: examId, title, exam_type: 'university', college, total_marks, duration_minutes },
        ipAddress, userAgent
      );
      console.log(`[AuditLog] ✅ EXAM_CREATED (university) logged for examId=${examId}`);
    } catch (auditErr) {
      console.error('[AuditLog] ❌ EXAM_CREATED (university) failed:', auditErr.message);
    }

    const examLabel = subject_name ? `${title} — ${subject_name}` : title;
    Promise.allSettled(
      emailQueue.map(({ student, examKey: eKey }) =>
        sendExamInviteEmail(student.email, student.name || 'Student', examLabel, eKey, parseInt(duration_minutes) || 90)
          .catch(err => console.error(`[UnivEmail] ${student.email}:`, err.message))
      )
    );

    return res.status(201).json({
      success:         true,
      exam_id:         examId,
      exam_key:        masterKey,
      student_count:   students.length,
      questions_saved: allMcq.length + allWritten.length,
      source:          'question_bank',
      message: `University exam created. ${allMcq.length} MCQ + ${allWritten.length} written. Papers sent to ${students.length} students.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// ── GET /api/exams ────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql = `
      SELECT e.*,
             COUNT(DISTINCT ea.id) AS student_count,
             COUNT(DISTINCT eq.id) AS question_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN exam_questions   eq ON eq.exam_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (college)   { sql += ' AND e.college = ?';   params.push(college); }
    if (exam_type) { sql += ' AND e.exam_type = ?'; params.push(exam_type); }
    if (status)    { sql += ' AND e.status = ?';    params.push(status); }
    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';
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
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ── GET /api/exams/:id ────────────────────────────────────────────────────────
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
              COUNT(DISTINCT ea.id) AS student_count,
              COUNT(DISTINCT eq.id) AS question_count
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
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// ── POST /api/exams/validate-key ──────────────────────────────────────────────
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.title, e.duration_minutes, e.sections, e.exam_type,
              e.status AS exam_status, e.cutoff_score,
              ea.id   AS assignment_id,
              ea.status AS assignment_status
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.exam_status === 'completed')
      return res.status(400).json({ valid: false, error: 'This exam has ended' });
    if (['submitted', 'absent'].includes(row.assignment_status))
      return res.status(400).json({ valid: false, error: 'You have already submitted this exam' });

    const [questions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.id]
    );

    await db.query(
      "UPDATE exam_assignments SET status='started', started_at=NOW() WHERE id=?",
      [row.assignment_id]
    );

    return res.json({
      valid:         true,
      exam_id:       row.id,
      assignment_id: row.assignment_id,
      title:         row.title,
      duration:      row.duration_minutes,
      exam_type:     row.exam_type,
      sections:      safeJSON(row.sections, {}),
      cutoff_score:  row.cutoff_score,
      questions,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to validate key' });
  }
});

// ── GET /api/exams/:id/students ───────────────────────────────────────────────
router.get('/exams/:id/students', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id AS student_id, c.name, c.email,
              ea.exam_key, ea.status, ea.score,
              ea.assigned_at, ea.submitted_at
       FROM exam_assignments ea
       JOIN candidates c ON c.id = ea.student_id
       WHERE ea.exam_id = ? ORDER BY c.name ASC`,
      [req.params.id]
    );
    return res.json({ students: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ── GET /api/exams/student/university ────────────────────────────────────────
router.get('/exams/student/university', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT e.id, e.title AS exam, e.subject_name AS subject, e.subject_code AS code,
              e.semester, e.exam_name, e.start_date, e.end_date, e.duration_minutes,
              e.total_marks AS maxMarks,
              uea.exam_key AS verifyCode, uea.status AS assignmentStatus,
              uea.mcq_score AS score,
              CASE
                WHEN NOW() BETWEEN e.start_date AND e.end_date THEN 'live'
                WHEN NOW() < e.start_date THEN 'upcoming'
                ELSE 'completed'
              END AS status
       FROM university_exam_assignments uea
       JOIN exams e ON e.id = uea.exam_id
       WHERE uea.student_id = ? AND e.exam_type = 'university'
       ORDER BY e.start_date DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;