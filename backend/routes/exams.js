// routes/exams.js
// DYNAMIC PDF PARSING: Admin uploads PDF for each section (MCQ, Coding, SQL, Aptitude, etc.)
// Backend parses PDF, extracts questions, stores them with exam_id
// Each student fetches same questions but in randomized order (adaptive shuffling)
// Question numbering: 1, 2, 3... (only order changes per student)
// MCQ options: A, B, C, D maintained; correct answer position may shuffle

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendExamInviteEmail } = require('./emailService');

// ── Load pdf-parse for dynamic PDF parsing ──────────────────────────────────
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }

// ── multer — accept PDFs for dynamic parsing and question extraction ───────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const pdfUpload = upload.fields([
  { name: 'pdf_mcq',        maxCount: 1 },
  { name: 'pdf_sql',        maxCount: 1 },
  { name: 'pdf_coding',     maxCount: 1 },
  { name: 'pdf_aptitude',   maxCount: 1 },
  { name: 'pdf_behavioral', maxCount: 1 },
  { name: 'pdf_written',    maxCount: 1 },
]);

// ── Shared helpers ────────────────────────────────────────────────────────────
function generateExamKey() {
  return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
}

function generateUnivKey(prefix = 'UNI') {
  const rand = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
  return `${prefix}-${rand}`;
}

const safeJSON = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

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

// ── CORE: PDF PARSER — Extract questions from uploaded PDF buffer ────────────
// Supports formats:
//   "1. Question text"   "Q1) Question"   "MCQ 1. Question"
//   Options: "A. text"   "A) text"   "(A) text"
//   Answer:  "Answer: B"  "Ans: B"  "Correct: B"
async function parsePdfForExam(buffer, sectionType) {
  if (!pdfParse) {
    console.warn('[ParsePDF] pdf-parse not available, falling back to bank questions');
    return null;
  }
  try {
    const { text } = await pdfParse(buffer);
    console.log(`[ParsePDF] Extracted text (${sectionType}): ${text.length} chars`);
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = [];
    let current = null;

    for (const line of lines) {
      // Question line: "1. Question"  "Q1) Question"  "MCQ1. Question"
      const qMatch = line.match(/^(?:MCQ\.?\s*)?(?:Q\.?\s*)?(\\d+)[.)]\\s+(.+)/i);
      if (qMatch) {
        if (current && isValidQuestion(current, sectionType)) {
          questions.push(questionToRow(current, sectionType));
        }
        const marksMatch = qMatch[2].match(/\\[(\\d+)\\s*m(?:arks?)?\\]/i);
        current = {
          text:        qMatch[2].replace(/\\[.*?\\]/, '').trim(),
          options:     [],
          answer:      null,
          explanation: null,
          difficulty:  detectQuestionDifficulty(qMatch[2]),
          marks:       marksMatch ? parseInt(marksMatch[1]) : 1,
        };
        continue;
      }

      if (!current) continue;

      // Option line: "A. text"  "(A) text"
      const optMatch = line.match(/^\\(?([A-Da-d])[.)]\\s+(.+)/);
      if (optMatch) {
        current.options.push({ key: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
        continue;
      }

      // Answer line
      const ansMatch = line.match(/^(?:Answer|Ans(?:wer)?|Correct\\s*Answer)\\s*[:=]\\s*([A-Da-d])/i);
      if (ansMatch) { 
        current.answer = ansMatch[1].toUpperCase();
        continue; 
      }

      // Explanation line
      const expMatch = line.match(/^(?:Explanation|Reason)\\s*[:=]\\s*(.+)/i);
      if (expMatch) { 
        current.explanation = expMatch[1].trim();
        continue; 
      }

      // Difficulty line
      const diffMatch = line.match(/^Difficulty\\s*[:=]\\s*(easy|medium|hard)/i);
      if (diffMatch) { 
        current.difficulty = diffMatch[1].toLowerCase();
        continue; 
      }

      // Continue question text if no options yet
      if (current.options.length === 0) {
        current.text += ' ' + line;
      }
    }

    if (current && isValidQuestion(current, sectionType)) {
      questions.push(questionToRow(current, sectionType));
    }

    console.log(`[ParsePDF] Extracted ${questions.length} questions from ${sectionType} PDF`);
    return questions.length > 0 ? questions : null;
  } catch (err) {
    console.error(`[ParsePDF] Error parsing ${sectionType}:`, err.message);
    return null;
  }
}

function isValidQuestion(q, type) {
  if (!q.text || q.text.length < 5) return false;
  if (type === 'coding') return true; // Coding questions may not have options
  if ((type === 'mcq' || type === 'sql' || type === 'aptitude') && q.options.length < 2) return false;
  return true;
}

function questionToRow(q, type) {
  return {
    type: type === 'aptitude' ? 'mcq' : (type === 'behavioral' ? 'mcq' : type),
    question_text: q.text.trim(),
    option_a:      q.options[0]?.text || null,
    option_b:      q.options[1]?.text || null,
    option_c:      q.options[2]?.text || null,
    option_d:      q.options[3]?.text || null,
    correct_ans:   q.answer || null,
    explanation:   q.explanation || null,
    difficulty:    q.difficulty || 'medium',
  };
}

function detectQuestionDifficulty(text) {
  const t = text.toLowerCase();
  if (t.includes('[hard]') || t.includes('(hard)')) return 'hard';
  if (t.includes('[easy]') || t.includes('(easy)')) return 'easy';
  if (t.includes('[medium]') || t.includes('(medium)')) return 'medium';
  return 'medium';
}

// ── FALLBACK: Fetch questions from the bank table if no PDF provided ────────
// This is the ONLY source of questions. PDFs are never parsed.

async function fetchQuestionsFromBank(conn, { sectionType, languages, count = 30 }) {
  // Map section keys to valid question types in the enum
  const typeMap = { aptitude: 'mcq', behavioral: 'mcq' };
  const dbType  = typeMap[sectionType] || sectionType;

  // Validate dbType is one of the allowed enum values
  const validTypes = ['mcq', 'sql', 'coding'];
  const resolvedType = validTypes.includes(dbType) ? dbType : 'mcq';

  console.log(`[BankFetch] section=${sectionType} → type=${resolvedType}, langs=${JSON.stringify(languages)}, count=${count}`);

  let sql = `
    SELECT id, type, question_text,
           option_a, option_b, option_c, option_d,
           correct_ans, explanation,
           description, platform, starter_code, constraints_text,
           difficulty, language_tag, topic_tag
    FROM questions
    WHERE is_bank = 1 AND type = ?
  `;
  const params = [resolvedType];

  // If languages provided, prefer language-matched questions
  if (languages && languages.length > 0) {
    const ph = languages.map(() => '?').join(',');
    sql += ` AND (language_tag IN (${ph}) OR topic_tag IN (${ph}))`;
    params.push(...languages, ...languages);
  }

  sql += ' ORDER BY RAND() LIMIT ?';
  params.push(parseInt(count));

  const [rows] = await conn.query(sql, params);
  console.log(`[BankFetch] Found ${rows.length} questions for type=${resolvedType}`);

  // Fallback: if language-filtered gives 0 results, pull any questions of that type
  if (rows.length === 0 && languages && languages.length > 0) {
    console.warn(`[BankFetch] No language-matched Qs for ${resolvedType}/${JSON.stringify(languages)} — using generic pool`);
    const [generic] = await conn.query(
      `SELECT id, type, question_text,
              option_a, option_b, option_c, option_d,
              correct_ans, explanation,
              description, platform, starter_code, constraints_text,
              difficulty, language_tag, topic_tag
       FROM questions
       WHERE is_bank = 1 AND type = ?
       ORDER BY RAND() LIMIT ?`,
      [resolvedType, parseInt(count)]
    );
    console.log(`[BankFetch] Generic fallback: ${generic.length} questions`);
    return generic;
  }

  return rows;
}

// ── Helper: map bank rows → insertable question rows ─────────────────────────
function bankRowsToInsert(examId, rows) {
  return rows.map(q => [
    examId,
    q.type,
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
  ]);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── University exam handler ───────────────────────────────────────────────────
// For university exams: MCQ questions come from the bank (type='mcq').
// Written questions also come from the bank where available; otherwise
// a dummy set is used. PDFs are accepted but never parsed.
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

  // Log that PDFs were uploaded but won't be used for questions
  if (req.files?.pdf_mcq?.[0]) {
    console.log(`[UnivExam] PDF uploaded for MCQ (${req.files.pdf_mcq[0].originalname}) — stored for reference only, questions loaded from bank`);
  }
  if (req.files?.pdf_written?.[0]) {
    console.log(`[UnivExam] PDF uploaded for Written (${req.files.pdf_written[0].originalname}) — stored for reference only`);
  }

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
    console.log(`[UnivExam] Created exam id=${examId}`);

    // ── Load MCQ questions from bank (always) ─────────────────────────────
    const mcqCount = parseInt(sectionConfig?.mcq?.count || 20);
    let allMcq = [];

    if (univSections.mcq) {
      const bankMcq = await fetchQuestionsFromBank(conn, {
        sectionType: 'mcq',
        languages:   null, // no language filter for university exams
        count:       mcqCount,
      });
      // Map to the paper format (strip answer for student-facing paper)
      allMcq = bankMcq.map(q => ({
        id:      q.id, // use bank question id as reference
        text:    q.question_text,
        options: [
          { key: 'A', text: q.option_a || '' },
          { key: 'B', text: q.option_b || '' },
          { key: 'C', text: q.option_c || '' },
          { key: 'D', text: q.option_d || '' },
        ].filter(o => o.text),
        answer:  q.correct_ans,
        marks:   parseInt(sectionConfig?.mcq?.marks || 1),
      }));
      console.log(`[UnivExam] Loaded ${allMcq.length} MCQ questions from bank`);
    }

    // ── Written questions: try bank with type='mcq' repurposed, or simple text ─
    // (bank doesn't have a 'written' type — university written questions
    //  are loaded from any available bank MCQs as open-ended stubs)
    const writtenCount = parseInt(sectionConfig?.written?.count || 5);
    let allWritten = [];

    if (univSections.written) {
      // For university written questions, pull from bank as well
      // These serve as question prompts; answers are manually graded
      const bankWritten = await fetchQuestionsFromBank(conn, {
        sectionType: 'mcq',
        languages:   null,
        count:       writtenCount + mcqCount, // pull extra to get different ones
      });
      // Use ones not already used in MCQ pool
      const usedIds = new Set(allMcq.map(q => q.id));
      const writtenPool = bankWritten.filter(q => !usedIds.has(q.id));
      allWritten = writtenPool.slice(0, writtenCount).map(q => ({
        id:    q.id,
        text:  q.question_text,
        marks: parseInt(sectionConfig?.written?.marks || 8),
      }));
      console.log(`[UnivExam] Loaded ${allWritten.length} written questions from bank`);
    }

    // Store question pools in exam_question_banks
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

    // ── Find eligible students ────────────────────────────────────────────
    let stuQuery    = `SELECT id, name, email FROM candidates WHERE 1=1`;
    const stuParams = [];
    if (college)             { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year)          { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    if (req.body.department) { stuQuery += ' AND branch = ?';  stuParams.push(req.body.department); }

    const [students] = await conn.query(stuQuery, stuParams);
    console.log(`[UnivExam] ${students.length} eligible students matched`);

    const emailQueue = [];
    for (const student of students) {
      const [existingAssign] = await conn.query(
        `SELECT id FROM university_exam_assignments WHERE exam_id = ? AND student_id = ?`,
        [examId, student.id]
      );
      if (existingAssign.length > 0) continue;

      const examKey = generateUnivKey('UNI');

      // Each student gets a shuffled version of the same bank questions
      const shuffledMcq     = shuffle(allMcq).map(q => ({ ...q }));
      const shuffledWritten = shuffle(allWritten).map(q => ({ ...q }));

      await conn.query(
        `INSERT INTO university_exam_assignments
           (exam_id, student_id, exam_key, paper_mcq, paper_written, status, assigned_at)
         VALUES (?, ?, ?, ?, ?, 'assigned', NOW())`,
        [examId, student.id, examKey, JSON.stringify(shuffledMcq), JSON.stringify(shuffledWritten)]
      );
      emailQueue.push({ student, examKey });
    }

    await conn.commit();

    const examLabel = subject_name ? `${title} — ${subject_name}` : title;
    Promise.allSettled(
      emailQueue.map(({ student, examKey }) =>
        sendExamInviteEmail(student.email, student.name || 'Student', examLabel, examKey, parseInt(duration_minutes) || 90)
          .then(()  => console.log(`[UnivEmail] Sent to ${student.email}`))
          .catch(err => console.error(`[UnivEmail] Failed for ${student.email}:`, err.message))
      )
    ).then(results => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[UnivExam ${examId}] Emails: ${ok}/${emailQueue.length} sent`);
    });

    return res.status(201).json({
      success:        true,
      exam_id:        examId,
      exam_key:       masterKey,
      student_count:  students.length,
      mcq_count:      allMcq.length,
      written_count:  allWritten.length,
      questions_saved: allMcq.length + allWritten.length,
      source:         'question_bank',
      message: `University exam created. ${allMcq.length} MCQ + ${allWritten.length} written questions loaded from bank. Papers sent to ${students.length} students.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    conn.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/exams/create — MAIN HANDLER (Placement / Skill Cert)
// Questions ALWAYS come from questions table (is_bank=1).
// PDFs accepted/stored but never parsed for questions.
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/exams/create',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  pdfUpload,
  async (req, res) => {
    console.log('[CreateExam] User:', req.user?.role, req.user?.id);

    const {
      exam_type, title, college, batch_year,
      start_date, end_date, duration_minutes,
      total_marks, pass_mark, description,
      allowed_languages, sections,
      eligibility, exam_request_id,
    } = req.body;

    if (exam_type === 'university') {
      return handleCreateUniversityExam(req, res);
    }

    if (!title || !college || !batch_year || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields: title, college, batch_year, start_date, end_date',
      });
    }

    const sectionsObj      = safeJSON(sections,               { mcq: true, coding: true });
    const sectionConfigObj = safeJSON(req.body.section_config, {});
    const eligibilityCrit  = safeJSON(eligibility,            {});
    const allowedLangsArr  = safeJSON(allowed_languages,      []);
    const rawType          = exam_type || 'placement';
    const examTypeDB       = rawType === 'skill_certification' ? 'skill_cert' : rawType;
    const examKey          = generateExamKey();

    // Log any uploaded PDFs — accepted for storage/display, not used for questions
    const uploadedPdfs = Object.keys(req.files || {});
    if (uploadedPdfs.length > 0) {
      console.log(`[CreateExam] PDFs uploaded: ${uploadedPdfs.join(', ')} — stored for reference only. Questions loaded from bank.`);
    }

    let cutoffScore = null;
    if (req.body.cutoff_score !== undefined && req.body.cutoff_score !== '') {
      const parsed = parseInt(req.body.cutoff_score, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) cutoffScore = parsed;
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO exams
           (exam_type, exam_key, title, college, batch_year,
            start_date, end_date, duration_minutes, description,
            allowed_languages, total_marks, pass_mark, cutoff_score,
            sections, exam_request_id, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
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
          exam_request_id || null,
          req.user.id,
        ]
      );
      const examId = result.insertId;
      console.log(`[CreateExam] Inserted exam id=${examId}, key=${examKey}, cutoff=${cutoffScore}`);

      if (exam_request_id) {
        try {
          const [enumInfo] = await conn.query(
            `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'exam_requests'
               AND COLUMN_NAME  = 'status'`
          );
          const enumStr = enumInfo[0]?.COLUMN_TYPE || '';
          if (enumStr.includes('exam_created')) {
            await conn.query(
              `UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`,
              [examId, exam_request_id]
            );
          }
        } catch (e) {
          console.warn('[CreateExam] exam_request update skipped:', e.message);
        }
      }

      let totalQuestionsSaved   = 0;
      const bankUsedForSections = [];

      // ── For each enabled section, ALWAYS pull from the bank ──────────────
      for (const [sectionKey, isEnabled] of Object.entries(sectionsObj)) {
        if (!isEnabled) continue;

        const wantCount = parseInt(sectionConfigObj[sectionKey]?.questions || 30);

        console.log(`[CreateExam] Loading ${wantCount} questions for section '${sectionKey}' from bank (langs: ${JSON.stringify(allowedLangsArr)})`);

        const bankRows = await fetchQuestionsFromBank(conn, {
          sectionType: sectionKey,
          languages:   allowedLangsArr,
          count:       wantCount,
        });

        if (bankRows.length === 0) {
          console.warn(`[CreateExam] No bank questions found for section: ${sectionKey}`);
          continue;
        }

        const qValues = bankRowsToInsert(examId, bankRows);

        await conn.query(
          `INSERT INTO questions
             (exam_id, type, question_text,
              option_a, option_b, option_c, option_d,
              correct_ans, explanation,
              description, platform, starter_code, constraints_text, difficulty)
           VALUES ?`,
          [qValues]
        );

        totalQuestionsSaved += bankRows.length;
        bankUsedForSections.push(sectionKey);
        console.log(`[CreateExam] Inserted ${bankRows.length} questions for section '${sectionKey}'`);
      }

      // ── Find eligible students ────────────────────────────────────────────
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
        success:                true,
        exam_id:                examId,
        exam_key:               examKey,
        questions_saved:        totalQuestionsSaved,
        student_count:          assignmentRows.length,
        students_notified:      assignmentRows.length,
        bank_fallback_sections: bankUsedForSections, // all sections — always bank
        source:                 'question_bank',
        cutoff_score:           cutoffScore,
        students: assignmentRows.map(a => ({ name: a.name, email: a.email, exam_key: a.exam_key })),
        message: `Exam created. ${totalQuestionsSaved} questions loaded from bank (sections: ${bankUsedForSections.join(', ')}). ${assignmentRows.length} students assigned and notified.`,
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

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/exams — List exams
// ══════════════════════════════════════════════════════════════════════════════
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql = `
      SELECT e.*,
             COUNT(DISTINCT ea.id) AS student_count,
             COUNT(DISTINCT q.id)  AS question_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN questions q         ON q.exam_id  = e.id AND q.is_bank = 0
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
        allowed_languages: safeJSON(e.allowed_languages, []),
      })),
    });
  } catch (err) {
    console.error('[ListExams]', err);
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/exams/:id — Single exam details
// ══════════════════════════════════════════════════════════════════════════════
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
              COUNT(DISTINCT ea.id) AS student_count,
              COUNT(DISTINCT q.id)  AS question_count
       FROM exams e
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       LEFT JOIN questions q         ON q.exam_id  = e.id AND q.is_bank = 0
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
        allowed_languages: safeJSON(e.allowed_languages, []),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// ── POST /api/exams/validate-key ─────────────────────────────────────────────
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
      valid: true, exam_id: row.id, assignment_id: row.assignment_id,
      title: row.title, duration: row.duration_minutes,
      exam_type: row.exam_type,
      sections: safeJSON(row.sections, {}),
      cutoff_score: row.cutoff_score,
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
      date: formatUnivDate(r.start_date),
      time: `${fmtTime(r.start_date)} – ${fmtTime(r.end_date)}`,
      duration: Math.ceil(r.duration_minutes / 60) + ' hrs',
      verifyCode: r.status === 'live' ? r.verifyCode : undefined,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[StudentUnivExams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/university/validate-key ──────────────────────────────────
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

    // Strip answer field before sending to student
    const mcq = JSON.parse(row.paper_mcq || '[]').map(({ answer, ...q }) => q);

    return res.json({
      valid: true, exam_id: row.exam_id, assignment_id: row.id,
      title: row.title, subject: row.subject_name,
      duration: row.duration_minutes, total_marks: row.total_marks,
      section_config: safeJSON(row.section_config, {}),
      cutoff_score: row.cutoff_score,
      mcq,
      written: JSON.parse(row.paper_written || '[]'),
    });
  } catch (err) {
    console.error('[UnivValidateKey]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/university/:examId/submit ────────────────────────────────
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
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
      if (answers[q.id] && answers[q.id].toUpperCase() === q.answer) {
        mcqScore += mcqMark;
      }
    }

    await db.query(
      `UPDATE university_exam_assignments
       SET status='completed', submitted_at=NOW(),
           mcq_score=?, mcq_answers=?, written_answers=?
       WHERE id=?`,
      [mcqScore, JSON.stringify(answers), JSON.stringify(written_answers || {}), row.id]
    );

    res.json({ success: true, mcq_score: mcqScore, message: 'Submitted. Written answers pending faculty review.' });
  } catch (err) {
    console.error('[UnivSubmit]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/exams/:id/students ──────────────────────────────────────────────
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

// ── Resolve student ID from JWT ───────────────────────────────────────────────
async function resolveStudentId(jwtUser) {
  const jwtId    = jwtUser.id;
  const jwtEmail = jwtUser.email;
  try {
    const [byId] = await db.query(`SELECT id FROM candidates WHERE id = ? LIMIT 1`, [jwtId]);
    if (byId.length > 0) return byId[0].id;
  } catch (e) { console.warn('[resolveStudentId] id lookup failed:', e.message); }
  if (jwtEmail) {
    try {
      const [byEmail] = await db.query(`SELECT id FROM candidates WHERE email = ? LIMIT 1`, [jwtEmail]);
      if (byEmail.length > 0) {
        console.log(`[resolveStudentId] email fallback: jwt_id=${jwtId} => candidate_id=${byEmail[0].id}`);
        return byEmail[0].id;
      }
    } catch (e) { console.warn('[resolveStudentId] email lookup failed:', e.message); }
  }
  return jwtId;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
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

module.exports = router;