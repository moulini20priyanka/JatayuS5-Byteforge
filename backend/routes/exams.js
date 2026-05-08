// backend/routes/exams.js
//
// PLACEMENT EXAM FLOW — PDF-ONLY (Phase 1)
//
// Current Mode (PDF-ONLY):
//   1. Admin uploads PDF files for each enabled section (MCQ, SQL, Coding, etc.)
//   2. Backend parses PDF using pdfQuestionParser (robust multi-format support)
//   3. All parsed questions stored in `questions` table with exam_id and is_bank=0
//   4. Students fetch those exam-specific questions via GET /api/questions/:examId/:type
//   5. No fallback to question bank — all questions must come from PDFs
//   6. If PDF parsing fails or yields 0 questions, exam creation fails with clear error
//
// Future Mode (PDF + Intelligent Fallback — Phase 2):
//   The fetchFallbackQuestions() function is already implemented and documented (commented out).
//   When Phase 2 begins:
//   1. Uncomment fetchFallbackQuestions() and its call in POST /api/exams/create
//   2. If PDF yields fewer questions than configured minimum, supplement with bank
//   3. Bank selection uses topic-matching (SQL keywords, DSA concepts, difficulty, etc.)
//   4. All questions still stored in `questions` table with exam_id
//   5. No live bank queries at exam time — always fetch from exam_questions
//
// Question Storage:
//   - All questions have exam_id set and is_bank = 0 (exam-specific, not reusable bank)
//   - Parsing preserves: question_text, options (A-D), correct_ans, explanation, difficulty
//   - For coding: description, platform, starter_code, constraints_text
//
// University Exam Type:
//   - Retains its own separate logic (question bank based)
//   - Not affected by PDF-only mode

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendExamInviteEmail }  = require('./emailService');
const { parsePdfForExam } = require('../services/pdfQuestionParser');
// NOTE: extractTopics & topicRelevanceScore are imported but commented out for Phase 1 (PDF-only mode)
// They will be uncommented in Phase 2 when fallback logic is enabled
// const { parsePdfForExam, extractTopics, topicRelevanceScore } = require('../services/pdfQuestionParser');

// ── multer — PDF only, up to 20 MB per file ──────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const pdfUpload = upload.fields([
  { name: 'pdf_mcq',        maxCount: 1 },
  { name: 'pdf_sql',        maxCount: 1 },
  { name: 'pdf_coding',     maxCount: 1 },
  { name: 'pdf_aptitude',   maxCount: 1 },
  { name: 'pdf_behavioral', maxCount: 1 },
]);

// ── Key generators ────────────────────────────────────────────────────────────
function generateExamKey() {
  return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
}
function generateUnivKey(prefix = 'UNI') {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
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
  let sq = `SELECT id, name, email FROM candidates WHERE 1=1`;
  const sp = [];
  if (college)    { sq += ' AND college = ?'; sp.push(college); }
  if (batch_year) { sq += ' AND batch = ?';   sp.push(parseInt(batch_year)); }
  if (eligibilityCrit?.min_cgpa) { sq += ' AND cgpa >= ?'; sp.push(parseFloat(eligibilityCrit.min_cgpa)); }
  const [students] = await conn.query(sq, sp);
  console.log(`[FindStudents] ${students.length} candidates matched`);
  return students;
}

// ── Section key → DB type ─────────────────────────────────────────────────────
const PDF_FIELD_MAP = {
  mcq:        'pdf_mcq',
  sql:        'pdf_sql',
  coding:     'pdf_coding',
  aptitude:   'pdf_aptitude',
  behavioral: 'pdf_behavioral',
};
const SECTION_TO_DB_TYPE = {
  mcq:        'mcq',
  sql:        'sql',
  coding:     'coding',
  aptitude:   'mcq',
  behavioral: 'mcq',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveStudentId(jwtUser) {
  const jwtId    = jwtUser.id;
  const jwtEmail = jwtUser.email;
  try {
    const [byId] = await db.query(`SELECT id FROM candidates WHERE id=? LIMIT 1`, [jwtId]);
    if (byId.length > 0) return byId[0].id;
  } catch (e) { console.warn('[resolveStudentId] id lookup failed:', e.message); }
  if (jwtEmail) {
    try {
      const [byEmail] = await db.query(`SELECT id FROM candidates WHERE email=? LIMIT 1`, [jwtEmail]);
      if (byEmail.length > 0) {
        console.log(`[resolveStudentId] email fallback: jwt_id=${jwtId} => candidate_id=${byEmail[0].id}`);
        return byEmail[0].id;
      }
    } catch (e) { console.warn('[resolveStudentId] email lookup failed:', e.message); }
  }
  return jwtId;
}

function formatUnivDate(d) {
  if (!d) return '—';
  const dt   = new Date(d);
  const diff = Math.floor((dt - new Date()) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK FUNCTION (RESERVED FOR FUTURE IMPLEMENTATION — PHASE 2)
// ─────────────────────────────────────────────────────────────────────────────
//
// CURRENTLY DISABLED — PDF-ONLY MODE
//
// This function implements intelligent topic-based fallback logic to supplement
// insufficient PDF questions with relevant bank questions. It will be enabled
// in the next phase once PDF parsing is verified.
//
// Strategy:
//   1. Derive topic keywords from already-extracted PDF questions (or exam title).
//   2. Query the bank for questions of the same type.
//   3. Score each bank question by keyword overlap with derived topics (SQL keywords,
//      DSA concepts, language tags, difficulty level, etc.).
//   4. Return the top-N most relevant questions, never duplicating questions already stored.
//   5. Maintains deterministic ranking: harder questions prioritized for harder PDFs.
//
// This function will be called as:
//   bankQuestions = await fetchFallbackQuestions(conn, dbType, examId, needed, pdfQuestions, examTitle);
//
// When enabled, the POST /api/exams/create handler will use it here:
//   if (needed > 0) {
//     bankQuestions = await fetchFallbackQuestions(conn, dbType, examId, needed, pdfQuestions, title);
//   }

/*
async function fetchFallbackQuestions(conn, dbType, examId, needed, pdfQuestions, examTitle) {
  if (needed <= 0) return [];

  const allTopics = new Set();
  for (const q of pdfQuestions) {
    const topics = extractTopics(
      q.question_text || '',
      [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
    );
    topics.forEach(t => allTopics.add(t));
  }

  const titleTopics = extractTopics(examTitle || '');
  titleTopics.forEach(t => allTopics.add(t));

  const targetTopics = [...allTopics];
  console.log(`[Fallback] Section '${dbType}' — target topics: [${targetTopics.join(', ')}], need ${needed} questions`);

  let likeClause = '';
  const likeParams = [];

  const TOPIC_KEYWORDS_MAP = {
    sql:        ['SELECT','JOIN','WHERE','GROUP BY','ORDER BY','aggregate','INDEX',
                 'subquery','foreign key','primary key','normalization','TRANSACTION',
                 'TRIGGER','VIEW','stored procedure','UNION','HAVING','DISTINCT'],
    javascript: ['javascript','async','promise','closure','prototype','event loop',
                 'DOM','arrow function','hoisting','callback','fetch'],
    python:     ['python','list comprehension','generator','decorator','lambda',
                 'dictionary','tuple','django','flask'],
    java:       ['java','JVM','inheritance','polymorphism','interface','generics','thread'],
    dsa:        ['array','linked list','tree','graph','hash','sort','search','recursion',
                 'dynamic programming','stack','queue','heap','binary','complexity'],
    dbms:       ['DBMS','ER diagram','relational','schema','ACID','NoSQL','MongoDB',
                 'indexing','replication','sharding'],
  };

  const allKeywords = [];
  for (const t of targetTopics) {
    const kws = TOPIC_KEYWORDS_MAP[t] || [];
    allKeywords.push(...kws);
  }

  if (allKeywords.length > 0) {
    const uniqueKws = [...new Set(allKeywords)].slice(0, 20);
    likeClause = 'AND (' + uniqueKws.map(() => 'q.question_text LIKE ?').join(' OR ') + ')';
    likeParams.push(...uniqueKws.map(kw => `%${kw}%`));
  }

  const fetchLimit = Math.min(needed * 5, 200);
  const [bankRows] = await conn.query(
    `SELECT q.*
     FROM questions q
     WHERE q.is_bank = 1
       AND q.type = ?
       AND q.exam_id IS NULL
       ${likeClause}
     ORDER BY q.id ASC
     LIMIT ?`,
    [dbType, ...likeParams, fetchLimit]
  );

  let pool = bankRows;
  if (pool.length < needed) {
    const [broadRows] = await conn.query(
      `SELECT q.*
       FROM questions q
       WHERE q.is_bank = 1
         AND q.type = ?
         AND q.exam_id IS NULL
       ORDER BY q.id ASC
       LIMIT ?`,
      [dbType, fetchLimit]
    );
    const seen = new Set(pool.map(r => r.id));
    for (const r of broadRows) {
      if (!seen.has(r.id)) { pool.push(r); seen.add(r.id); }
    }
  }

  const scored = pool.map(q => ({
    ...q,
    _score: topicRelevanceScore(q, targetTopics),
  }));
  scored.sort((a, b) => b._score - a._score);

  return scored.slice(0, needed).map(q => ({
    type:             q.type,
    question_text:    q.question_text,
    option_a:         q.option_a        || null,
    option_b:         q.option_b        || null,
    option_c:         q.option_c        || null,
    option_d:         q.option_d        || null,
    correct_ans:      q.correct_ans     || null,
    explanation:      q.explanation     || null,
    description:      q.description     || null,
    platform:         q.platform        || null,
    starter_code:     q.starter_code    || null,
    constraints_text: q.constraints_text || null,
    difficulty:       q.difficulty      || 'medium',
    _from_bank:       true,
    _relevance:       q._score,
  }));
}
*/

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/create — placement / skill_cert exam (PDF-first)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/exams/create',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  pdfUpload,
  async (req, res) => {
    console.log('[CreateExam] User:', req.user?.role, req.user?.id);

    const {
      exam_type,
      title, college, batch_year,
      start_date, end_date,
      duration_minutes,
      total_marks, pass_mark,
      description,
      allowed_languages,
      sections,
      eligibility,
      exam_request_id,
    } = req.body;

    if (exam_type === 'university') {
      return handleCreateUniversityExam(req, res);
    }

    if (!title || !college || !batch_year || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields: title, college, batch_year, start_date, end_date',
      });
    }

    const sectionsObj     = safeJSON(sections,               { mcq: true, coding: true });
    const sectionConfig   = safeJSON(req.body.section_config, {});
    const eligibilityCrit = safeJSON(eligibility,             {});
    const allowedLangsArr = safeJSON(allowed_languages,       []);
    const rawType         = exam_type || 'placement';
    const examTypeDB      = rawType === 'skill_certification' ? 'skill_cert' : rawType;
    const examKey         = generateExamKey();

    const uploadedPdfs    = Object.keys(req.files || {});
    const enabledSections = Object.entries(sectionsObj)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    console.log(`[CreateExam] PDF-only mode — ${enabledSections.length} sections enabled: [${enabledSections.join(', ')}]`);
    console.log(`[CreateExam] PDFs received: ${uploadedPdfs.length > 0 ? uploadedPdfs.join(', ') : 'none'}`);

    let cutoffScore = null;
    if (req.body.cutoff_score !== undefined && req.body.cutoff_score !== '') {
      const parsed = parseInt(req.body.cutoff_score, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) cutoffScore = parsed;
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // ── Insert exam record ───────────────────────────────────────────────
      const [result] = await conn.query(
        `INSERT INTO exams
           (exam_type, exam_key, title, college, batch_year,
            start_date, end_date, duration_minutes, description,
            allowed_languages, total_marks, pass_mark, cutoff_score,
            sections, section_config, exam_request_id, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
        [
          examTypeDB, examKey, title, college, batch_year,
          new Date(start_date), new Date(end_date),
          parseInt(duration_minutes) || 60,
          description || '',
          JSON.stringify(allowedLangsArr),
          parseInt(total_marks) || 100,
          parseInt(pass_mark)   || 40,
          cutoffScore,
          JSON.stringify(sectionsObj),
          JSON.stringify(sectionConfig),
          exam_request_id || null,
          req.user.id,
        ]
      );
      const examId = result.insertId;
      console.log(`[CreateExam] Inserted exam id=${examId}, key=${examKey}`);

      if (exam_request_id) {
        try {
          const [enumInfo] = await conn.query(
            `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'exam_requests'
               AND COLUMN_NAME  = 'status'`
          );
          if ((enumInfo[0]?.COLUMN_TYPE || '').includes('exam_created')) {
            await conn.query(
              `UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`,
              [examId, exam_request_id]
            );
          }
        } catch (e) {
          console.warn('[CreateExam] exam_request update skipped:', e.message);
        }
      }

      // ── Per-section: PDF parse → store (PDF-ONLY MODE) ──────────────────
      // NOTE: Fallback to question bank is DISABLED for now.
      //       If PDF parsing fails or yields 0 questions for an enabled section,
      //       the section will return an error instead of using bank questions.
      //       Fallback logic is reserved for Phase 2.
      let totalQuestionsSaved = 0;
      const sectionResults    = [];

      for (const sectionKey of enabledSections) {
        const pdfFieldName = PDF_FIELD_MAP[sectionKey];
        const pdfFile      = pdfFieldName ? req.files?.[PDF_FIELD_MAP[sectionKey]]?.[0] : null;
        const dbType       = SECTION_TO_DB_TYPE[sectionKey] || 'mcq';

        // ── Step 1: PDF is REQUIRED for each enabled section ────────────────
        if (!pdfFile) {
          console.error(`[CreateExam] No PDF uploaded for enabled section '${sectionKey}' — PDF-only mode active`);
          await conn.rollback();
          return res.status(400).json({
            error:  `Missing PDF for enabled section: ${sectionKey}`,
            detail: `Section '${sectionKey}' is enabled but no PDF file was uploaded. In PDF-only mode, all enabled sections require a PDF.`,
            section: sectionKey,
          });
        }

        console.log(`[CreateExam] Parsing PDF for '${sectionKey}' (${pdfFile.originalname})…`);
        const pdfQuestions = await parsePdfForExam(pdfFile.buffer, sectionKey);

        if (!pdfQuestions || pdfQuestions.length === 0) {
          console.error(`[CreateExam] PDF parsing yielded 0 questions for '${sectionKey}' — unable to create exam`);
          await conn.rollback();
          return res.status(400).json({
            error:    `Failed to parse questions from PDF for section: ${sectionKey}`,
            detail:   `The PDF file for '${sectionKey}' could not be parsed or contained no recognizable questions. Please check the PDF format and try again.`,
            section:  sectionKey,
            filename: pdfFile.originalname,
          });
        }

        console.log(`[CreateExam] ✓ PDF yielded ${pdfQuestions.length} questions for '${sectionKey}'`);

        // ── Step 2: Store in questions table (linked to this exam) ───────────
        const qValues = pdfQuestions.map(q => [
          examId,
          q.type || dbType,
          q.question_text,
          q.option_a         || null,
          q.option_b         || null,
          q.option_c         || null,
          q.option_d         || null,
          q.correct_ans      || null,
          q.explanation      || null,
          q.description      || null,
          q.platform         || null,
          q.starter_code     || null,
          q.constraints_text || null,
          q.difficulty       || 'medium',
          0, // is_bank = 0 (exam-specific, not generic bank questions)
        ]);

        await conn.query(
          `INSERT INTO questions
             (exam_id, type, question_text,
              option_a, option_b, option_c, option_d,
              correct_ans, explanation,
              description, platform, starter_code, constraints_text,
              difficulty, is_bank)
           VALUES ?`,
          [qValues]
        );

        totalQuestionsSaved += pdfQuestions.length;
        sectionResults.push(`${sectionKey}: ${pdfQuestions.length} questions from PDF`);
        console.log(`[CreateExam] ✓ Stored ${pdfQuestions.length} '${sectionKey}' questions (exam_id=${examId}) from PDF`);
      }

      // ── Assign to eligible students ────────────────────────────────────────
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

      // Fire-and-forget emails
      if (assignmentRows.length > 0) {
        Promise.allSettled(
          assignmentRows.map(a =>
            trySendEmail({
              to: a.email, studentName: a.name, examTitle: title,
              examKey: a.exam_key, duration: parseInt(duration_minutes) || 60,
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
        sections_parsed:   sectionResults,
        source:            'pdf_only',
        mode:              'PDF-only (Phase 1)',
        cutoff_score:      cutoffScore,
        students: assignmentRows.map(a => ({ name: a.name, email: a.email, exam_key: a.exam_key })),
        message: `Exam created (PDF-only mode). ${totalQuestionsSaved} questions stored (${sectionResults.join('; ')}). ${assignmentRows.length} students assigned and notified.`,
      });

    } catch (err) {
      await conn.rollback();
      console.error('[CreateExam] FATAL:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    } finally {
      conn.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// University exam handler — uses question bank (unchanged from Doc 1)
// ─────────────────────────────────────────────────────────────────────────────
async function handleCreateUniversityExam(req, res) {
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
    let cutoffScore = null;
    if (req.body.cutoff_score !== undefined && req.body.cutoff_score !== '') {
      const parsed = parseInt(req.body.cutoff_score, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) cutoffScore = parsed;
    }

    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          total_marks, pass_mark, cutoff_score, sections,
          department, semester, exam_name, subject_code, subject_name,
          section_config, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        'university', masterKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 90,
        description || '',
        parseInt(total_marks) || 100,
        parseInt(pass_mark)   || 40,
        cutoffScore,
        JSON.stringify(univSections),
        req.body.department || null,
        semester     || null,
        exam_name    || null,
        subject_code || null,
        subject_name || null,
        JSON.stringify(sectionConfig),
        req.user.id,
      ]
    );
    const examId = result.insertId;

    const mcqCount = parseInt(sectionConfig?.mcq?.count || 20);
    let allMcq = [];
    if (univSections.mcq) {
      const [bankMcq] = await conn.query(
        `SELECT * FROM questions WHERE is_bank = 1 AND type = 'mcq' ORDER BY RAND() LIMIT ?`,
        [mcqCount]
      );
      allMcq = bankMcq.map(q => ({
        id:      q.id,
        text:    q.question_text,
        options: [
          { key: 'A', text: q.option_a || '' },
          { key: 'B', text: q.option_b || '' },
          { key: 'C', text: q.option_c || '' },
          { key: 'D', text: q.option_d || '' },
        ].filter(o => o.text),
        answer: q.correct_ans,
        marks:  parseInt(sectionConfig?.mcq?.marks || 1),
      }));
    }

    const writtenCount = parseInt(sectionConfig?.written?.count || 5);
    let allWritten = [];
    if (univSections.written) {
      const usedIds = new Set(allMcq.map(q => q.id));
      const [bankWritten] = await conn.query(
        `SELECT * FROM questions WHERE is_bank = 1 AND type = 'mcq' ORDER BY RAND() LIMIT ?`,
        [writtenCount + mcqCount]
      );
      allWritten = bankWritten
        .filter(q => !usedIds.has(q.id))
        .slice(0, writtenCount)
        .map(q => ({
          id:    q.id,
          text:  q.question_text,
          marks: parseInt(sectionConfig?.written?.marks || 8),
        }));
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

    let stuQuery = `SELECT id, name, email FROM candidates WHERE 1=1`;
    const stuParams = [];
    if (college)             { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year)          { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    if (req.body.department) { stuQuery += ' AND branch = ?';  stuParams.push(req.body.department); }
    const [students] = await conn.query(stuQuery, stuParams);

    const emailQueue = [];
    for (const student of students) {
      const [existing] = await conn.query(
        `SELECT id FROM university_exam_assignments WHERE exam_id=? AND student_id=?`,
        [examId, student.id]
      );
      if (existing.length > 0) continue;
      const sKey            = generateUnivKey('UNI');
      const shuffledMcq     = shuffle(allMcq).map(q => ({ ...q }));
      const shuffledWritten = shuffle(allWritten).map(q => ({ ...q }));
      await conn.query(
        `INSERT INTO university_exam_assignments
           (exam_id, student_id, exam_key, paper_mcq, paper_written, status, assigned_at)
         VALUES (?, ?, ?, ?, ?, 'assigned', NOW())`,
        [examId, student.id, sKey, JSON.stringify(shuffledMcq), JSON.stringify(shuffledWritten)]
      );
      emailQueue.push({ student, examKey: sKey });
    }

    await conn.commit();

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
      mcq_count:       allMcq.length,
      written_count:   allWritten.length,
      questions_saved: allMcq.length + allWritten.length,
      source:          'question_bank',
      message: `University exam created. ${allMcq.length} MCQ + ${allWritten.length} written from bank. Papers sent to ${students.length} students.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard read / validate routes
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/exams ────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql = `
      SELECT e.*,
             COUNT(DISTINCT ea.id) AS student_count,
             COUNT(DISTINCT q.id)  AS question_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN questions q         ON q.exam_id  = e.id AND (q.is_bank = 0 OR q.is_bank IS NULL)
      WHERE 1=1
    `;
    const params = [];
    if (college)   { sql += ' AND e.college = ?';   params.push(college);   }
    if (exam_type) { sql += ' AND e.exam_type = ?'; params.push(exam_type); }
    if (status)    { sql += ' AND e.status = ?';    params.push(status);    }
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
      })),
    });
  } catch (err) {
    console.error('[ListExams]', err);
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ── GET /api/exams/:id ────────────────────────────────────────────────────────
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
              COUNT(DISTINCT ea.id) AS student_count,
              COUNT(DISTINCT q.id)  AS question_count
       FROM exams e
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       LEFT JOIN questions q         ON q.exam_id  = e.id AND (q.is_bank = 0 OR q.is_bank IS NULL)
       WHERE e.id = ?
       GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
    const e = rows[0];
    return res.json({
      exam: {
        ...e,
        name:              e.title,
        exam_name:         e.title,
        candidates:        e.student_count || 0,
        sections:          safeJSON(e.sections,          {}),
        section_config:    safeJSON(e.section_config,    {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
      },
    });
  } catch (err) {
    console.error('[GetExam]', err);
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
              e.status  AS exam_status, e.cutoff_score,
              ea.id     AS assignment_id,
              ea.status AS assignment_status
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ?`,
      [exam_key.trim()]
    );
    if (!rows.length)
      return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.exam_status === 'completed')
      return res.status(400).json({ valid: false, error: 'This exam has ended' });
    if (row.assignment_status === 'submitted' || row.assignment_status === 'absent')
      return res.status(400).json({ valid: false, error: 'You have already submitted this exam' });
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
    });
  } catch (err) {
    console.error('[ValidateKey]', err);
    return res.status(500).json({ error: 'Failed to validate key' });
  }
});

// ── GET /api/exams/student/university ────────────────────────────────────────
router.get('/exams/student/university', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT
         e.id, e.title AS exam, e.subject_name AS subject, e.subject_code AS code,
         e.semester, e.exam_name, e.start_date, e.end_date, e.duration_minutes,
         e.total_marks AS maxMarks, e.cutoff_score,
         uea.exam_key AS verifyCode, uea.status AS assignmentStatus,
         uea.mcq_score AS score, uea.grade,
         JSON_LENGTH(JSON_EXTRACT(uea.paper_mcq, '$')) AS mcqCount,
         JSON_LENGTH(JSON_EXTRACT(uea.paper_written, '$')) AS writtenCount,
         CASE WHEN JSON_LENGTH(JSON_EXTRACT(uea.paper_mcq, '$')) > 0 THEN true ELSE false END AS hasMcq,
         CASE WHEN JSON_LENGTH(JSON_EXTRACT(uea.paper_written, '$')) > 0 THEN true ELSE false END AS hasWritten,
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
    const formatted = rows.map(r => ({
      ...r,
      date:       formatUnivDate(r.start_date),
      time:       `${fmtTime(r.start_date)} – ${fmtTime(r.end_date)}`,
      duration:   Math.ceil(r.duration_minutes / 60) + ' hrs',
      verifyCode: r.status === 'live' ? r.verifyCode : undefined,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('[StudentUnivExams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/university/validate-key ───────────────────────────────────
router.post('/exams/university/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key required' });
  try {
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT uea.id, uea.paper_mcq, uea.paper_written, uea.status,
              e.start_date, e.end_date, e.duration_minutes,
              e.title, e.subject_name, e.total_marks, e.section_config, e.id AS exam_id,
              e.cutoff_score
       FROM university_exam_assignments uea
       JOIN exams e ON e.id = uea.exam_id
       WHERE uea.exam_key = ? AND uea.student_id = ?`,
      [exam_key.trim(), studentId]
    );
    if (!rows.length)
      return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];
    if (row.status === 'completed')
      return res.status(400).json({ valid: false, error: 'Already submitted' });
    const now = new Date();
    if (now < new Date(row.start_date))
      return res.status(403).json({ valid: false, error: 'Exam has not started yet', start_date: row.start_date });
    if (now > new Date(row.end_date))
      return res.status(403).json({ valid: false, error: 'Exam window has closed' });
    await db.query(
      `UPDATE university_exam_assignments SET status='started', started_at=NOW() WHERE id=?`,
      [row.id]
    );
    const mcq = JSON.parse(row.paper_mcq || '[]').map(({ answer, ...q }) => q);
    return res.json({
      valid:          true,
      exam_id:        row.exam_id,
      assignment_id:  row.id,
      title:          row.title,
      subject:        row.subject_name,
      duration:       row.duration_minutes,
      total_marks:    row.total_marks,
      section_config: safeJSON(row.section_config, {}),
      cutoff_score:   row.cutoff_score,
      mcq,
      written: JSON.parse(row.paper_written || '[]'),
    });
  } catch (err) {
    console.error('[UnivValidateKey]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/university/:examId/submit ─────────────────────────────────
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId }                    = req.params;
    const { mcq_answers, written_answers } = req.body;
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT uea.id, uea.paper_mcq, uea.status, e.section_config, e.cutoff_score
       FROM university_exam_assignments uea
       JOIN exams e ON e.id = uea.exam_id
       WHERE uea.student_id = ? AND uea.exam_id = ?`,
      [studentId, examId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const row = rows[0];
    if (row.status === 'completed') return res.status(400).json({ error: 'Already submitted' });
    const paper   = JSON.parse(row.paper_mcq || '[]');
    const cfg     = safeJSON(row.section_config, {});
    const mcqMark = parseInt(cfg.mcq?.marks || 1);
    const answers = mcq_answers || {};
    let mcqScore  = 0;
    for (const q of paper) {
      if (answers[q.id] && answers[q.id].toUpperCase() === q.answer) mcqScore += mcqMark;
    }
    await db.query(
      `UPDATE university_exam_assignments
       SET status='completed', submitted_at=NOW(), mcq_score=?, mcq_answers=?, written_answers=?
       WHERE id=?`,
      [mcqScore, JSON.stringify(answers), JSON.stringify(written_answers || {}), row.id]
    );
    res.json({ success: true, mcq_score: mcqScore, message: 'Submitted. Written answers pending faculty review.' });
  } catch (err) {
    console.error('[UnivSubmit]', err);
    res.status(500).json({ error: err.message });
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
       WHERE ea.exam_id = ?
       ORDER BY c.name ASC`,
      [req.params.id]
    );
    return res.json({ students: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
});

module.exports = router;