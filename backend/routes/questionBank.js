// routes/questionBank.js
// GET    /api/question-bank          — list bank questions
// POST   /api/question-bank/import   — save AI-generated questions → question_bank table
// POST   /api/question-bank/upload-pdf
// DELETE /api/question-bank/:id
// GET    /api/question-bank/stats

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

let pdfParse;
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }

function genQbId() {
  return 'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function normaliseAnswer(q) {
  const raw = (
    q.answer || q.correct_ans || q.correctAnswer ||
    q.correct_answer || q.correct || ''
  ).toString().trim();
  const match = raw.match(/^([A-Da-d])/);
  return match ? match[1].toUpperCase() : (raw.charAt(0).toUpperCase() || null);
}

function normaliseOptions(q) {
  if (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object') {
    return {
      option_a: q.options[0]?.text || q.options[0]?.value || null,
      option_b: q.options[1]?.text || q.options[1]?.value || null,
      option_c: q.options[2]?.text || q.options[2]?.value || null,
      option_d: q.options[3]?.text || q.options[3]?.value || null,
    };
  }
  if (Array.isArray(q.options) && q.options.length > 0) {
    return {
      option_a: q.options[0] || null, option_b: q.options[1] || null,
      option_c: q.options[2] || null, option_d: q.options[3] || null,
    };
  }
  if (q.option_a || q.option_b) {
    return { option_a: q.option_a||null, option_b: q.option_b||null,
             option_c: q.option_c||null, option_d: q.option_d||null };
  }
  if (Array.isArray(q.choices) && q.choices.length > 0) {
    return {
      option_a: typeof q.choices[0] === 'string' ? q.choices[0] : q.choices[0]?.text || null,
      option_b: typeof q.choices[1] === 'string' ? q.choices[1] : q.choices[1]?.text || null,
      option_c: typeof q.choices[2] === 'string' ? q.choices[2] : q.choices[2]?.text || null,
      option_d: typeof q.choices[3] === 'string' ? q.choices[3] : q.choices[3]?.text || null,
    };
  }
  return { option_a: null, option_b: null, option_c: null, option_d: null };
}

async function parseBankPdf(buffer, sectionType) {
  if (!pdfParse) throw new Error('pdf-parse not installed');
  const { text } = await pdfParse(buffer);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const qs = [];
  let cur = null;
  for (const line of lines) {
    const qm = line.match(/^(?:MCQ\.?\s*)?(?:Q\.?\s*)?(\d+)[.)]\s+(.+)/i);
    if (qm) {
      if (cur && cur.text?.length > 4) qs.push(toPdfRow(cur, sectionType));
      cur = { text: qm[2].replace(/\[.*?\]/, '').trim(), options: [], answer: null, explanation: null, difficulty: 'medium' };
      continue;
    }
    if (!cur) continue;
    const om = line.match(/^\(?([A-Da-d])[.)]\s*(.+)/);
    if (om) { cur.options.push({ key: om[1].toUpperCase(), text: om[2].trim() }); continue; }
    const am = line.match(/^(?:Answer|Ans(?:wer)?|Correct\s*Answer)\s*[:\-]\s*([A-Da-d])/i);
    if (am) { cur.answer = am[1].toUpperCase(); continue; }
    const em = line.match(/^(?:Explanation|Reason)\s*[:\-]\s*(.+)/i);
    if (em) { cur.explanation = em[1].trim(); continue; }
    if (cur.options.length === 0) cur.text += ' ' + line;
  }
  if (cur && cur.text?.length > 4) qs.push(toPdfRow(cur, sectionType));
  return qs;
}
function toPdfRow(cur, type) {
  return {
    type, question_text: cur.text.trim(),
    option_a: cur.options[0]?.text || null, option_b: cur.options[1]?.text || null,
    option_c: cur.options[2]?.text || null, option_d: cur.options[3]?.text || null,
    correct_ans: cur.answer || null, explanation: cur.explanation || null,
    difficulty: cur.difficulty || 'medium',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/question-bank/import
// Writes into `question_bank` table — the same table exams.js reads from
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/question-bank/import',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    const incoming = req.body?.questions;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: 'questions array is required and must not be empty' });
    }

    try {
      const rows = incoming.map(q => {
        const type = (q.type || 'mcq').toLowerCase();
        const questionText = (
          q.question || q.question_text || q.text ||
          q.problem  || q.title        || q.prompt || ''
        ).toString().trim();
        const opts = normaliseOptions(q);
        const diff = (q.difficulty || 'medium').toLowerCase();
        const topic = (q.topic || questionText.substring(0, 100)).trim() || 'General';

        return [
          genQbId(),          // qb_id
          topic,              // topic
          questionText,       // question_text
          type,               // type
          diff,               // difficulty
          opts.option_a,
          opts.option_b,
          opts.option_c,
          opts.option_d,
          normaliseAnswer(q), // correct_ans
          (q.explanation || q.reason || '').toString().trim() || null,
          null,               // language_tag
          topic.substring(0, 100), // topic_tag
          'QuizForge AI',     // source
          req.user.id,        // created_by
          1,                  // is_active
        ];
      });

      await db.query(
        `INSERT INTO question_bank
           (qb_id, topic, question_text, type, difficulty,
            option_a, option_b, option_c, option_d,
            correct_ans, explanation,
            language_tag, topic_tag, source, created_by, is_active)
         VALUES ?`,
        [rows]
      );

      // Fetch back the rows we just inserted
      const [inserted] = await db.query(
        `SELECT id, qb_id, topic, type, difficulty, created_at
         FROM question_bank
         WHERE created_by = ? AND source = 'QuizForge AI'
         ORDER BY created_at DESC
         LIMIT ?`,
        [req.user.id, rows.length]
      );

      const shaped = inserted.map(r => ({
        id:          r.qb_id,
        db_id:       r.id,
        topic:       r.topic || '—',
        type:        r.type === 'mcq'    ? 'MCQ'    :
                     r.type === 'coding' ? 'Coding' :
                     r.type === 'sql'    ? 'SQL'    :
                     r.type.charAt(0).toUpperCase() + r.type.slice(1),
        difficulty:  r.difficulty
                       ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)
                       : 'Medium',
        createdDate: new Date(r.created_at).toLocaleDateString('en-GB'),
        source:      'QuizForge AI',
      }));

      console.log(`[QB Import] Saved ${shaped.length} questions to question_bank table`);
      res.status(201).json({ success: true, imported: shaped.length, count: shaped.length, questions: shaped });

    } catch (err) {
      console.error('[QB Import]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/question-bank/stats ─────────────────────────────────────────────
router.get('/question-bank/stats', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [byType] = await db.query(
      `SELECT type, language_tag, COUNT(*) AS count FROM question_bank
       WHERE is_active = 1 GROUP BY type, language_tag ORDER BY type, count DESC`
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM question_bank WHERE is_active = 1`);
    res.json({ total, breakdown: byType });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/question-bank ────────────────────────────────────────────────────
router.get('/question-bank', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { type, difficulty, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE is_active = 1';
    const params = [];
    if (type)       { where += ' AND type = ?';       params.push(type.toLowerCase()); }
    if (difficulty) { where += ' AND difficulty = ?'; params.push(difficulty.toLowerCase()); }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM question_bank ${where}`, params);
    const [rows] = await db.query(
      `SELECT id, qb_id, type, topic, topic_tag, difficulty, source,
              LEFT(question_text, 120) AS question_preview, correct_ans, created_at
       FROM question_bank ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const questions = rows.map(r => ({
      id:          r.qb_id || r.id,
      db_id:       r.id,
      topic:       r.topic || r.topic_tag || '—',
      type:        r.type === 'mcq'    ? 'MCQ'    :
                   r.type === 'coding' ? 'Coding' :
                   r.type === 'sql'    ? 'SQL'    :
                   (r.type||'').charAt(0).toUpperCase() + (r.type||'').slice(1),
      difficulty:  r.difficulty
                     ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)
                     : 'Medium',
      source:      r.source || 'Manual',
      createdDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—',
    }));

    res.json({ questions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/question-bank/upload-pdf ───────────────────────────────────────
router.post('/question-bank/upload-pdf', authenticateToken, requireRole('admin'), upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
  const { type = 'mcq', topic_tag = null, difficulty_override = null } = req.body;
  if (!['mcq', 'sql', 'coding'].includes(type)) return res.status(400).json({ error: 'type must be mcq | sql | coding' });
  try {
    const parsed = await parseBankPdf(req.file.buffer, type);
    if (parsed.length === 0) return res.status(422).json({ error: 'No questions could be parsed from the PDF.' });
    const values = parsed.map(q => [
      genQbId(), topic_tag || type, q.question_text, q.type,
      difficulty_override || q.difficulty,
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.correct_ans, q.explanation,
      null, topic_tag || null, 'PDF Upload', req.user.id, 1,
    ]);
    await db.query(
      `INSERT INTO question_bank
         (qb_id, topic, question_text, type, difficulty,
          option_a, option_b, option_c, option_d,
          correct_ans, explanation, language_tag, topic_tag, source, created_by, is_active)
       VALUES ?`, [values]
    );
    res.status(201).json({ success: true, imported: parsed.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/question-bank/:id ────────────────────────────────────────────
router.delete('/question-bank/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const isQbId = isNaN(req.params.id);
    const col    = isQbId ? 'qb_id' : 'id';
    const [result] = await db.query(
      `UPDATE question_bank SET is_active = 0 WHERE ${col} = ?`, [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
