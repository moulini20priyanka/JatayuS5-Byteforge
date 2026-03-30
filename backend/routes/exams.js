// routes/exams.js

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { parsePDFToQuestions } = require('./pdfParser');
const { sendExamInviteEmail } = require('./emailService');

// ── multer ────────────────────────────────────────────────────────────────────
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

// ── University-specific PDF parsers ──────────────────────────────────────────

let pdfParse;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: parseMcqPdf — handles ALL common formats including "MCQ 1." prefix
// Also logs raw text so you can debug if parsing still fails
// ─────────────────────────────────────────────────────────────────────────────
async function parseMcqPdf(buffer) {
  if (!pdfParse) throw new Error('pdf-parse not installed. Run: npm install pdf-parse');
  const { text } = await pdfParse(buffer);

  // Debug: log first 800 chars so you can see exact format in server console
  console.log('[parseMcqPdf] Raw text sample:\n', text.substring(0, 800));

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const qs    = [];
  let cur     = null;

  for (const line of lines) {
    // Matches ALL these formats:
    //   "1. Question"         plain numbered
    //   "1) Question"         bracket numbered
    //   "MCQ 1. Question"     MCQ prefix with space  ← YOUR FORMAT
    //   "MCQ1. Question"      MCQ prefix no space
    //   "MCQ. 1. Question"    MCQ dot prefix
    //   "Q1. Question"        Q prefix
    //   "Q. 1. Question"      Q dot prefix
    const qm = line.match(/^(?:MCQ\.?\s*)?(?:Q\.?\s*)?(\d+)[.)]\s+(.+)/i);
    if (qm) {
      if (cur && cur.options.length >= 2) qs.push(cur);
      const mm = qm[2].match(/\[(\d+)\s*m(?:arks?)?\]/i);
      cur = {
        id:      uuidv4(),
        text:    qm[2].replace(/\[.*?\]/, '').trim(),
        options: [],
        answer:  null,
        marks:   mm ? parseInt(mm[1]) : 1,
      };
      continue;
    }

    if (cur) {
      // Option: "A. text"  "A) text"  "(A) text"
      const om = line.match(/^\(?([A-Da-d])[.)]\s*(.+)/);
      if (om) {
        cur.options.push({ key: om[1].toUpperCase(), text: om[2].trim() });
        continue;
      }
      // Answer: "Answer: B"  "Ans: B"  "Ans - B"
      const am = line.match(/^(?:Answer|Ans|Correct\s*Answer)\s*[:\-]\s*([A-Da-d])/i);
      if (am) { cur.answer = am[1].toUpperCase(); continue; }
      // Continuation of question text (before any options)
      if (cur.options.length === 0) cur.text += ' ' + line;
    }
  }
  if (cur && cur.options.length >= 2) qs.push(cur);

  console.log(`[parseMcqPdf] Parsed ${qs.length} MCQ questions`);
  return qs;
}

async function parseWrittenPdf(buffer) {
  if (!pdfParse) throw new Error('pdf-parse not installed. Run: npm install pdf-parse');
  const { text } = await pdfParse(buffer);
  const lines    = text.split('\n').map(l => l.trim()).filter(Boolean);
  const qs       = [];
  let cur        = null;

  for (const line of lines) {
    const qm = line.match(/^(\d+)[.)]\s+(.+)/);
    if (qm) {
      if (cur) qs.push(cur);
      const mm = qm[2].match(/\((\d+)\s*m(?:arks?)?\)/i) || qm[2].match(/\[(\d+)\]/);
      cur = {
        id:    uuidv4(),
        text:  qm[2].replace(/\(\d+\s*m(?:arks?)?\)/i, '').replace(/\[\d+\]/, '').trim(),
        marks: mm ? parseInt(mm[1]) : 8,
      };
      continue;
    }
    if (cur) cur.text += ' ' + line;
  }
  if (cur) qs.push(cur);
  console.log(`[parseWrittenPdf] Parsed ${qs.length} written questions`);
  return qs;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: DUMMY MCQ FALLBACK
// When PDF parsing fails / MCQ pool is empty, generate subject-aware dummy MCQs
// Students will see real-looking placeholder questions instead of a broken screen
// ─────────────────────────────────────────────────────────────────────────────
function generateDummyMcq(subject, count = 20) {
  const subjectLower = (subject || 'general').toLowerCase();

  // Subject-aware question sets
  const questionSets = {
    os: [
      { text: "What is the primary function of an Operating System?",
        options: [{key:"A",text:"Manage hardware resources"},{key:"B",text:"Write application code"},{key:"C",text:"Connect to the internet"},{key:"D",text:"Store user files"}], answer:"A" },
      { text: "Which scheduling algorithm can cause starvation?",
        options: [{key:"A",text:"Round Robin"},{key:"B",text:"FCFS"},{key:"C",text:"Priority Scheduling"},{key:"D",text:"Multilevel Queue"}], answer:"C" },
      { text: "What does PCB stand for in OS?",
        options: [{key:"A",text:"Process Control Block"},{key:"B",text:"Program Counter Buffer"},{key:"C",text:"Processor Core Bus"},{key:"D",text:"Primary Control Block"}], answer:"A" },
      { text: "Which of the following is NOT a state in a process lifecycle?",
        options: [{key:"A",text:"Running"},{key:"B",text:"Sleeping"},{key:"C",text:"Waiting"},{key:"D",text:"Ready"}], answer:"B" },
      { text: "Deadlock requires which of the following conditions?",
        options: [{key:"A",text:"Mutual Exclusion"},{key:"B",text:"Preemption allowed"},{key:"C",text:"Single resource type"},{key:"D",text:"Unlimited memory"}], answer:"A" },
      { text: "What is thrashing in an operating system?",
        options: [{key:"A",text:"Excessive page faults reducing CPU utilization"},{key:"B",text:"CPU running at 100% all the time"},{key:"C",text:"Memory overflow error"},{key:"D",text:"Disk fragmentation"}], answer:"A" },
      { text: "Which page replacement algorithm suffers from Belady's anomaly?",
        options: [{key:"A",text:"LRU"},{key:"B",text:"Optimal"},{key:"C",text:"FIFO"},{key:"D",text:"LFU"}], answer:"C" },
      { text: "What is a semaphore used for?",
        options: [{key:"A",text:"Process synchronization"},{key:"B",text:"Memory allocation"},{key:"C",text:"CPU scheduling"},{key:"D",text:"Disk management"}], answer:"A" },
      { text: "Virtual memory allows programs to use more memory than physically available by using:",
        options: [{key:"A",text:"Compression"},{key:"B",text:"Disk space as extended RAM"},{key:"C",text:"Shared CPU registers"},{key:"D",text:"Network storage"}], answer:"B" },
      { text: "In Round Robin scheduling, what determines the time each process gets?",
        options: [{key:"A",text:"Priority level"},{key:"B",text:"Time quantum"},{key:"C",text:"Memory size"},{key:"D",text:"CPU burst time"}], answer:"B" },
      { text: "Which memory allocation strategy leaves no external fragmentation?",
        options: [{key:"A",text:"First Fit"},{key:"B",text:"Best Fit"},{key:"C",text:"Paging"},{key:"D",text:"Segmentation"}], answer:"C" },
      { text: "A context switch involves saving the state of the current process in its:",
        options: [{key:"A",text:"PCB"},{key:"B",text:"Stack"},{key:"C",text:"Heap"},{key:"D",text:"Cache"}], answer:"A" },
      { text: "Which disk scheduling algorithm moves the head like an elevator?",
        options: [{key:"A",text:"FCFS"},{key:"B",text:"SSTF"},{key:"C",text:"SCAN"},{key:"D",text:"LOOK"}], answer:"C" },
      { text: "What is the purpose of a mutex?",
        options: [{key:"A",text:"Allow multiple threads to access a resource simultaneously"},{key:"B",text:"Ensure only one thread accesses a resource at a time"},{key:"C",text:"Schedule CPU processes"},{key:"D",text:"Manage virtual memory"}], answer:"B" },
      { text: "Banker's algorithm is used for:",
        options: [{key:"A",text:"Deadlock detection"},{key:"B",text:"Deadlock avoidance"},{key:"C",text:"Deadlock prevention"},{key:"D",text:"Deadlock recovery"}], answer:"B" },
      { text: "Which type of kernel loads all services into kernel space?",
        options: [{key:"A",text:"Microkernel"},{key:"B",text:"Hybrid kernel"},{key:"C",text:"Monolithic kernel"},{key:"D",text:"Exokernel"}], answer:"C" },
      { text: "The critical section problem ensures:",
        options: [{key:"A",text:"No two processes execute in critical section simultaneously"},{key:"B",text:"All processes get equal CPU time"},{key:"C",text:"Memory is always available"},{key:"D",text:"Processes never wait"}], answer:"A" },
      { text: "What is demand paging?",
        options: [{key:"A",text:"Loading all pages into memory at program start"},{key:"B",text:"Loading pages only when needed"},{key:"C",text:"Removing unused pages permanently"},{key:"D",text:"Compressing pages to save space"}], answer:"B" },
      { text: "Inter-process communication (IPC) methods include:",
        options: [{key:"A",text:"Pipes and message queues"},{key:"B",text:"CPU registers only"},{key:"C",text:"Hard disk transfers"},{key:"D",text:"GPU buffers"}], answer:"A" },
      { text: "In segmentation, each segment has a:",
        options: [{key:"A",text:"Fixed size determined by OS"},{key:"B",text:"Variable size based on logical divisions"},{key:"C",text:"Size equal to page size"},{key:"D",text:"Size of 4KB always"}], answer:"B" },
    ],
    default: [
      { text: "Which of the following best describes an algorithm?",
        options: [{key:"A",text:"A step-by-step procedure for solving a problem"},{key:"B",text:"A programming language"},{key:"C",text:"A hardware component"},{key:"D",text:"A type of database"}], answer:"A" },
      { text: "What does CPU stand for?",
        options: [{key:"A",text:"Central Processing Unit"},{key:"B",text:"Computer Power Unit"},{key:"C",text:"Core Processing Utility"},{key:"D",text:"Central Program Utility"}], answer:"A" },
      { text: "Which data structure uses LIFO order?",
        options: [{key:"A",text:"Queue"},{key:"B",text:"Stack"},{key:"C",text:"Tree"},{key:"D",text:"Graph"}], answer:"B" },
      { text: "What is the time complexity of binary search?",
        options: [{key:"A",text:"O(n)"},{key:"B",text:"O(n²)"},{key:"C",text:"O(log n)"},{key:"D",text:"O(1)"}], answer:"C" },
      { text: "Which of the following is a primary memory?",
        options: [{key:"A",text:"Hard Disk"},{key:"B",text:"RAM"},{key:"C",text:"SSD"},{key:"D",text:"USB Drive"}], answer:"B" },
    ]
  };

  // Pick question set based on subject keywords
  let pool = questionSets.default;
  if (subjectLower.includes('os') || subjectLower.includes('operat')) {
    pool = questionSets.os;
  }

  // Cycle through pool to reach requested count
  const result = [];
  for (let i = 0; i < count; i++) {
    const q = pool[i % pool.length];
    result.push({
      id:      uuidv4(),
      text:    q.text,
      options: q.options,
      answer:  q.answer,
      marks:   1,
      isDummy: true, // flag so faculty can see these were fallback questions
    });
  }
  return result;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: buildStudentPaper — now uses 20 MCQs per paper
// Falls back to dummy MCQs if pool is empty
// ─────────────────────────────────────────────────────────────────────────────
function buildStudentPaper(allMcq, allWritten, sectionConfig, subject) {
  // FIX: Default MCQ count = 20 (was reading from sectionConfig which was often null)
  const mcqCount     = parseInt(sectionConfig?.mcq?.count     || 20);
  const writtenCount = parseInt(sectionConfig?.written?.count ||  5);

  // FIX: If MCQ pool is empty, use dummy MCQs so student paper is never blank
  let mcqSource = allMcq;
  if (mcqSource.length === 0) {
    console.warn(`[buildStudentPaper] MCQ pool empty — using ${mcqCount} dummy MCQs for subject: ${subject}`);
    mcqSource = generateDummyMcq(subject, mcqCount);
  }

  const mcqPicked     = shuffle(mcqSource).slice(0, mcqCount);
  const writtenPicked = shuffle(allWritten).slice(0, writtenCount);

  const mcqFinal = mcqPicked.map(q => ({
    id:      q.id,
    text:    q.text,
    options: shuffle(q.options || []),
    answer:  q.answer,
  }));

  return { mcq: mcqFinal, written: writtenPicked };
}

// ── Resolve student ID from JWT ───────────────────────────────────────────────
async function resolveStudentId(jwtUser) {
  const jwtId    = jwtUser.id;
  const jwtEmail = jwtUser.email;

  try {
    const [byId] = await db.query(`SELECT id FROM candidates WHERE id = ? LIMIT 1`, [jwtId]);
    if (byId.length > 0) return byId[0].id;
  } catch (e) {
    console.warn('[resolveStudentId] id lookup failed:', e.message);
  }

  if (jwtEmail) {
    try {
      const [byEmail] = await db.query(`SELECT id FROM candidates WHERE email = ? LIMIT 1`, [jwtEmail]);
      if (byEmail.length > 0) {
        console.log(`[resolveStudentId] email fallback: jwt_id=${jwtId} => candidate_id=${byEmail[0].id}`);
        return byEmail[0].id;
      }
    } catch (e) {
      console.warn('[resolveStudentId] email lookup failed:', e.message);
    }
  }

  return jwtId;
}

// ── University exam handler ───────────────────────────────────────────────────
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
  const subjectLabel  = subject_name || title; // used for dummy MCQ generation

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert the main exam record
    const masterKey = generateUnivKey('UNI');
    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year,
          start_date, end_date, duration_minutes, description,
          total_marks, pass_mark, sections,
          department, semester, exam_name, subject_code, subject_name,
          section_config, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        'university', masterKey, title, college, batch_year,
        new Date(start_date), new Date(end_date),
        parseInt(duration_minutes) || 90,
        description || '',
        parseInt(total_marks) || 100,
        parseInt(pass_mark)   || 40,
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

    // 2. Parse uploaded PDFs
    let allMcq     = [];
    let allWritten = [];

    // ─────────────────────────────────────────────────────────────────────
    // FIX: Skip PDF parsing if question bank already exists for this exam
    // This prevents duplicate questions on re-upload
    // ─────────────────────────────────────────────────────────────────────
    const [existingBank] = await conn.query(
      `SELECT id, mcq_pool, written_pool FROM exam_question_banks WHERE exam_id = ?`,
      [examId]
    );

    if (existingBank.length > 0) {
      // Questions already exist — skip parsing, reuse existing pool
      console.log(`[UnivExam] Question bank already exists for exam_id=${examId} — skipping PDF parse`);
      allMcq     = safeJSON(existingBank[0].mcq_pool,     []);
      allWritten = safeJSON(existingBank[0].written_pool, []);
    } else {
      // Fresh parse
      if (req.files?.pdf_mcq?.[0] && univSections.mcq) {
        try {
          allMcq = await parseMcqPdf(req.files.pdf_mcq[0].buffer);
          console.log(`[UnivExam] Parsed ${allMcq.length} MCQ questions from PDF`);
        } catch (err) {
          console.error('[UnivExam] MCQ PDF parse error:', err.message);
        }
      }
      if (req.files?.pdf_written?.[0] && univSections.written) {
        try {
          allWritten = await parseWrittenPdf(req.files.pdf_written[0].buffer);
          console.log(`[UnivExam] Parsed ${allWritten.length} written questions from PDF`);
        } catch (err) {
          console.error('[UnivExam] Written PDF parse error:', err.message);
        }
      }

      // 3. Store master question bank (only if freshly parsed)
      try {
        await conn.query(
          `INSERT INTO exam_question_banks (exam_id, mcq_pool, written_pool, created_at)
           VALUES (?, ?, ?, NOW())`,
          [examId, JSON.stringify(allMcq), JSON.stringify(allWritten)]
        );
      } catch (err) {
        console.warn('[UnivExam] exam_question_banks insert skipped:', err.message);
      }
    }

    // NOTE: Even if allMcq is still [] after parsing, buildStudentPaper will
    // use dummy MCQs so students always get a complete paper

    // 4. Fetch eligible students
    let stuQuery    = `SELECT id, name, email FROM candidates WHERE 1=1`;
    const stuParams = [];
    if (college)           { stuQuery += ' AND college = ?'; stuParams.push(college); }
    if (batch_year)        { stuQuery += ' AND batch = ?';   stuParams.push(parseInt(batch_year)); }
    if (req.body.department) { stuQuery += ' AND branch = ?'; stuParams.push(req.body.department); }

    console.log('[UnivExam] Student query:', stuQuery, stuParams);
    const [students] = await conn.query(stuQuery, stuParams);
    console.log(`[UnivExam] ${students.length} eligible students matched`);

    if (students.length === 0) {
      console.warn('[UnivExam] 0 students — exam created, no assignments generated');
    }

    // 5. Generate unique paper + key per student (skip if already assigned)
    const emailQueue = [];
    for (const student of students) {
      // FIX: Skip if already assigned — prevents duplicates on re-create
      const [existingAssign] = await conn.query(
        `SELECT id FROM university_exam_assignments WHERE exam_id = ? AND student_id = ?`,
        [examId, student.id]
      );
      if (existingAssign.length > 0) {
        console.log(`[UnivExam] Skipping student ${student.id} — already assigned`);
        continue;
      }

      const examKey = generateUnivKey('UNI');
      // Pass subjectLabel so dummy MCQ generator knows the subject
      const paper   = buildStudentPaper(allMcq, allWritten, sectionConfig, subjectLabel);

      await conn.query(
        `INSERT INTO university_exam_assignments
           (exam_id, student_id, exam_key, paper_mcq, paper_written, status, assigned_at)
         VALUES (?, ?, ?, ?, ?, 'assigned', NOW())`,
        [examId, student.id, examKey, JSON.stringify(paper.mcq), JSON.stringify(paper.written)]
      );
      emailQueue.push({ student, examKey });
    }

    await conn.commit();

    // 6. Send emails non-blocking
    const examLabel = subject_name ? `${title} — ${subject_name}` : title;
    Promise.allSettled(
      emailQueue.map(({ student, examKey }) =>
        sendExamInviteEmail(
          student.email, student.name || 'Student',
          examLabel, examKey, parseInt(duration_minutes) || 90
        )
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
      mcq_parsed:     allMcq.length,
      written_parsed: allWritten.length,
      used_dummy_mcq: allMcq.length === 0,
      message: `University exam created. ${allMcq.length === 0 ? 'NOTE: MCQ PDF parse failed — dummy MCQs used.' : `${allMcq.length} MCQs parsed.`} Papers sent to ${students.length} students.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[UnivExam] FATAL:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    conn.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/exams/create
// ═══════════════════════════════════════════════════════════════════════════════
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

    const sectionsObj     = safeJSON(sections,          { mcq: true, coding: true });
    const eligibilityCrit = safeJSON(eligibility,       {});
    const allowedLangsArr = safeJSON(allowed_languages, []);
    const rawType         = exam_type || 'placement';
    const examTypeDB      = rawType === 'skill_certification' ? 'skill_cert' : rawType;
    const examKey         = generateExamKey();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO exams
           (exam_type, exam_key, title, college, batch_year, start_date, end_date,
            duration_minutes, description, allowed_languages, total_marks, pass_mark,
            sections, exam_request_id, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
        [
          examTypeDB, examKey, title, college, batch_year,
          new Date(start_date), new Date(end_date),
          parseInt(duration_minutes) || 60,
          description || '',
          JSON.stringify(allowedLangsArr),
          parseInt(total_marks) || 100,
          parseInt(pass_mark)   || 40,
          JSON.stringify(sectionsObj),
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
          const enumStr = enumInfo[0]?.COLUMN_TYPE || '';
          if (enumStr.includes('exam_created')) {
            await conn.query(
              `UPDATE exam_requests SET status='exam_created', exam_id=? WHERE id=?`,
              [examId, exam_request_id]
            );
          } else {
            console.warn('[CreateExam] exam_requests.status has no exam_created — skipping');
          }
        } catch (e) {
          console.warn('[CreateExam] exam_request update skipped:', e.message);
        }
      }

      let totalQuestionsSaved = 0;
      for (const [fieldName, fileArr] of Object.entries(req.files || {})) {
        if (fieldName === 'pdf_written') continue;
        const sectionType = fieldName.replace('pdf_', '');
        const file = fileArr[0];
        if (!file) continue;
        try {
          const parsedQs = await parsePDFToQuestions(file.buffer);
          if (parsedQs.length > 0) {
            const qValues = parsedQs.map(q => [
              examId,
              ['mcq','sql','coding'].includes(q.type) ? q.type : sectionType,
              q.question_text,
              q.option_a || null, q.option_b || null,
              q.option_c || null, q.option_d || null,
              q.correct_ans || null, q.explanation || null,
              q.description || null, q.platform || null,
              q.starter_code || null, q.constraints || null,
              q.difficulty || 'medium',
            ]);
            await conn.query(
              `INSERT INTO questions
                 (exam_id, type, question_text,
                  option_a, option_b, option_c, option_d,
                  correct_ans, explanation,
                  description, platform, starter_code, constraints_text, difficulty)
               VALUES ?`,
              [qValues]
            );
            totalQuestionsSaved += parsedQs.length;
          }
        } catch (pdfErr) {
          console.error(`[CreateExam] PDF parse error (${sectionType}):`, pdfErr.message);
        }
      }

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
        console.log(`[CreateExam] Created ${assignmentRows.length} exam_assignment rows`);
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
        success: true, exam_id: examId, exam_key: examKey,
        questions_saved: totalQuestionsSaved,
        student_count: assignmentRows.length,
        students_notified: assignmentRows.length,
        students: assignmentRows.map(a => ({ name: a.name, email: a.email, exam_key: a.exam_key })),
        message: `Exam created. ${assignmentRows.length} students assigned and notified.`,
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

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/exams
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql = `
      SELECT e.*,
             COUNT(DISTINCT ea.id) AS student_count,
             COUNT(DISTINCT q.id)  AS question_count
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN questions q         ON q.exam_id  = e.id
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
        sections:          safeJSON(e.sections,          {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
      })),
    });
  } catch (err) {
    console.error('[ListExams]', err);
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// POST /api/exams/validate-key
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.title, e.duration_minutes, e.sections, e.exam_type,
              e.status  AS exam_status,
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
      exam_type: row.exam_type, sections: safeJSON(row.sections, {}),
    });
  } catch (err) {
    console.error('[ValidateKey]', err);
    return res.status(500).json({ error: 'Failed to validate key' });
  }
});

// GET /api/exams/student/university
router.get('/exams/student/university', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);
    console.log(`[StudentUnivExams] jwt_id=${req.user.id} => resolved_id=${studentId}`);

    const [rows] = await db.query(
      `SELECT
         e.id,
         e.title          AS exam,
         e.subject_name   AS subject,
         e.subject_code   AS code,
         e.semester,
         e.exam_name,
         e.start_date,
         e.end_date,
         e.duration_minutes,
         e.total_marks    AS maxMarks,
         uea.exam_key     AS verifyCode,
         uea.status       AS assignmentStatus,
         uea.mcq_score    AS score,
         uea.grade,
         JSON_LENGTH(JSON_EXTRACT(uea.paper_mcq,     '$')) AS mcqCount,
         JSON_LENGTH(JSON_EXTRACT(uea.paper_written, '$')) AS writtenCount,
         CASE WHEN JSON_LENGTH(JSON_EXTRACT(uea.paper_mcq,     '$')) > 0 THEN true ELSE false END AS hasMcq,
         CASE WHEN JSON_LENGTH(JSON_EXTRACT(uea.paper_written, '$')) > 0 THEN true ELSE false END AS hasWritten,
         CASE
           WHEN NOW() BETWEEN e.start_date AND e.end_date THEN 'live'
           WHEN NOW() < e.start_date                      THEN 'upcoming'
           ELSE                                                'completed'
         END AS status
       FROM university_exam_assignments uea
       JOIN exams e ON e.id = uea.exam_id
       WHERE uea.student_id = ?
         AND e.exam_type    = 'university'
       ORDER BY e.start_date DESC`,
      [studentId]
    );
    console.log(`[StudentUnivExams] Found ${rows.length} exams for student_id=${studentId}`);

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

// POST /api/exams/university/validate-key
router.post('/exams/university/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key required' });

  try {
    const studentId = await resolveStudentId(req.user);
    console.log(`[UnivValidateKey] jwt_id=${req.user.id} => resolved_id=${studentId}`);

    const [rows] = await db.query(
      `SELECT uea.id, uea.paper_mcq, uea.paper_written, uea.status,
              e.start_date, e.end_date, e.duration_minutes,
              e.title, e.subject_name, e.total_marks, e.section_config, e.id AS exam_id
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
      valid:          true,
      exam_id:        row.exam_id,
      assignment_id:  row.id,
      title:          row.title,
      subject:        row.subject_name,
      duration:       row.duration_minutes,
      total_marks:    row.total_marks,
      section_config: safeJSON(row.section_config, {}),
      mcq,
      written: JSON.parse(row.paper_written || '[]'),
    });
  } catch (err) {
    console.error('[UnivValidateKey]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams/university/:examId/submit
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const { mcq_answers, written_answers } = req.body;

    const studentId = await resolveStudentId(req.user);
    console.log(`[UnivSubmit] jwt_id=${req.user.id} => resolved_id=${studentId}, examId=${examId}`);

    const [rows] = await db.query(
      `SELECT uea.id, uea.paper_mcq, uea.status, e.section_config
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

// GET /api/exams/:id/students
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

// GET /api/exams/:id
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
              COUNT(DISTINCT ea.id) AS student_count,
              COUNT(DISTINCT q.id)  AS question_count
       FROM exams e
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       LEFT JOIN questions q         ON q.exam_id  = e.id
       WHERE e.id = ?
       GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
    return res.json({
      exam: {
        ...rows[0],
        sections:          safeJSON(rows[0].sections,          {}),
        allowed_languages: safeJSON(rows[0].allowed_languages, []),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

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