// routes/questionBank.js
// GET    /api/question-bank              — list bank questions (admin)
// POST   /api/question-bank/upload-pdf   — bulk import from PDF into bank
// DELETE /api/question-bank/:id          — remove a single bank question
// GET    /api/question-bank/stats        — counts per type/language

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── multer: PDF only, max 20 MB ──────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Try to load pdf-parse ────────────────────────────────────────────────────
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }

// ── PDF parser for question bank ─────────────────────────────────────────────
// Supports formats:
//   "1. Question text"   "1) Question"   "MCQ 1. Question"   "Q1. Question"
//   Options: "A. text"   "A) text"   "(A) text"
//   Answer:  "Answer: B"  "Ans: B"  "Correct: B"
async function parseBankPdf(buffer, sectionType) {
  if (!pdfParse) throw new Error('pdf-parse not installed. Run: npm install pdf-parse');

  const { text } = await pdfParse(buffer);
  console.log('[BankPDF] raw sample:\n', text.substring(0, 800));

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const qs    = [];
  let cur     = null;

  for (const line of lines) {
    // Question line
    const qm = line.match(/^(?:MCQ\.?\s*)?(?:Q\.?\s*)?(\d+)[.)]\s+(.+)/i);
    if (qm) {
      if (cur && isValidQ(cur, sectionType)) qs.push(toRow(cur, sectionType));
      const marks = qm[2].match(/\[(\d+)\s*m(?:arks?)?\]/i);
      cur = {
        text:        qm[2].replace(/\[.*?\]/, '').trim(),
        options:     [],
        answer:      null,
        explanation: null,
        difficulty:  detectDifficulty(qm[2]),
        marks:       marks ? parseInt(marks[1]) : 1,
      };
      continue;
    }

    if (!cur) continue;

    // Option line: "A. text"  "A) text"  "(A) text"
    const om = line.match(/^\(?([A-Da-d])[.)]\s*(.+)/);
    if (om) {
      cur.options.push({ key: om[1].toUpperCase(), text: om[2].trim() });
      continue;
    }

    // Answer line
    const am = line.match(/^(?:Answer|Ans(?:wer)?|Correct\s*Answer)\s*[:\-]\s*([A-Da-d])/i);
    if (am) { cur.answer = am[1].toUpperCase(); continue; }

    // Explanation line
    const em = line.match(/^(?:Explanation|Reason)\s*[:\-]\s*(.+)/i);
    if (em) { cur.explanation = em[1].trim(); continue; }

    // Explicit difficulty line
    const dm = line.match(/^Difficulty\s*[:\-]\s*(easy|medium|hard)/i);
    if (dm) { cur.difficulty = dm[1].toLowerCase(); continue; }

    // Continuation of question text (before options appear)
    if (cur.options.length === 0) cur.text += ' ' + line;
  }

  if (cur && isValidQ(cur, sectionType)) qs.push(toRow(cur, sectionType));
  console.log(`[BankPDF] Parsed ${qs.length} questions (type=${sectionType})`);
  return qs;
}

function isValidQ(cur, type) {
  if (!cur.text || cur.text.length < 5) return false;
  if (type === 'mcq' && cur.options.length < 2) return false;
  return true;
}

function toRow(cur, type) {
  return {
    type,
    question_text: cur.text.trim(),
    option_a:      cur.options[0]?.text || null,
    option_b:      cur.options[1]?.text || null,
    option_c:      cur.options[2]?.text || null,
    option_d:      cur.options[3]?.text || null,
    correct_ans:   cur.answer       || null,
    explanation:   cur.explanation  || null,
    difficulty:    cur.difficulty   || 'medium',
  };
}

function detectDifficulty(text) {
  const t = text.toLowerCase();
  if (t.includes('[hard]') || t.includes('(hard)'))   return 'hard';
  if (t.includes('[easy]') || t.includes('(easy)'))   return 'easy';
  if (t.includes('[medium]') || t.includes('(medium)')) return 'medium';
  return 'medium';
}

// ── GET /api/question-bank/stats ─────────────────────────────────────────────
router.get(
  '/question-bank/stats',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const [byType] = await db.query(
        `SELECT type, language_tag, COUNT(*) AS count
         FROM questions
         WHERE is_bank = 1
         GROUP BY type, language_tag
         ORDER BY type, count DESC`
      );
      const [total] = await db.query(
        `SELECT COUNT(*) AS total FROM questions WHERE is_bank = 1`
      );
      res.json({ total: total[0].total, breakdown: byType });
    } catch (err) {
      console.error('[BankStats]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/question-bank ────────────────────────────────────────────────────
router.get(
  '/question-bank',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const { type, language, difficulty, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let where = 'WHERE is_bank = 1';
      const params = [];

      if (type)       { where += ' AND type = ?';         params.push(type); }
      if (language)   { where += ' AND language_tag = ?'; params.push(language); }
      if (difficulty) { where += ' AND difficulty = ?';   params.push(difficulty); }

      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM questions ${where}`, params
      );

      const [rows] = await db.query(
        `SELECT id, type, language_tag, topic_tag, difficulty,
                LEFT(question_text, 120) AS question_preview,
                correct_ans, created_at
         FROM questions ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );

      res.json({ questions: rows, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      console.error('[ListBank]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/question-bank/upload-pdf ───────────────────────────────────────
// multipart fields:
//   pdf              — the PDF file
//   type             — 'mcq' | 'sql' | 'coding'
//   language_tag     — 'HTML' | 'Java' | 'Python' | etc.
//   topic_tag        — optional freetext  e.g. 'React Hooks'
//   difficulty_override — optional: force all Qs to easy|medium|hard
router.post(
  '/question-bank/upload-pdf',
  authenticateToken,
  requireRole('admin'),
  upload.single('pdf'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    const {
      type                = 'mcq',
      language_tag        = null,
      topic_tag           = null,
      difficulty_override = null,
    } = req.body;

    if (!['mcq', 'sql', 'coding'].includes(type)) {
      return res.status(400).json({ error: 'type must be mcq | sql | coding' });
    }

    try {
      const parsed = await parseBankPdf(req.file.buffer, type);

      if (parsed.length === 0) {
        return res.status(422).json({
          error: 'No questions could be parsed from the PDF.',
          hint:  [
            'Questions must be numbered: "1. Question text" or "1) Question text"',
            'Options labelled A-D: "A. option" or "A) option"',
            'Answer line: "Answer: B" or "Ans: B"',
          ].join(' | '),
        });
      }

      const values = parsed.map(q => [
        null,                              // exam_id = NULL → bank question
        q.type,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_ans,
        q.explanation,
        null,                              // description (coding)
        null,                              // platform
        null,                              // starter_code
        null,                              // constraints_text
        difficulty_override || q.difficulty,
        language_tag || null,
        topic_tag    || null,
        1,                                 // is_bank = true
      ]);

      await db.query(
        `INSERT INTO questions
           (exam_id, type, question_text,
            option_a, option_b, option_c, option_d,
            correct_ans, explanation,
            description, platform, starter_code, constraints_text,
            difficulty, language_tag, topic_tag, is_bank)
         VALUES ?`,
        [values]
      );

      res.status(201).json({
        success:      true,
        imported:     parsed.length,
        type,
        language_tag: language_tag || null,
        topic_tag:    topic_tag    || null,
        message:      `${parsed.length} questions imported into the question bank.`,
      });

    } catch (err) {
      console.error('[BankUpload]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/question-bank/:id ────────────────────────────────────────────
router.delete(
  '/question-bank/:id',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const [result] = await db.query(
        'DELETE FROM questions WHERE id = ? AND is_bank = 1',
        [req.params.id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ error: 'Bank question not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[DeleteBank]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;