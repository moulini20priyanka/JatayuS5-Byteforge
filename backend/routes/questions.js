// backend/routes/questions.js

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleArray(arr, seed = null) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j;
    if (seed !== null) {
      j = Math.floor(seededRandom(seed + i) * (i + 1));
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectQuestionsIntelligently(allQuestions, targetCount, studentId, examId) {
  if (allQuestions.length === 0) return [];
  if (allQuestions.length <= targetCount) return allQuestions;

  const byDifficulty = { easy: [], medium: [], hard: [] };
  allQuestions.forEach(q => {
    const diff = (q.difficulty || 'medium').toLowerCase();
    if (!byDifficulty[diff]) byDifficulty[diff] = [];
    byDifficulty[diff].push(q);
  });

  const seed = `${studentId}:${examId}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  const easyTarget   = Math.floor(targetCount * 0.25);
  const mediumTarget = Math.floor(targetCount * 0.50);
  const hardTarget   = Math.floor(targetCount * 0.25);

  const selected = [];
  selected.push(...shuffleArray(byDifficulty.easy,   seed + 1).slice(0, easyTarget));
  selected.push(...shuffleArray(byDifficulty.medium, seed + 2).slice(0, mediumTarget));
  selected.push(...shuffleArray(byDifficulty.hard,   seed + 3).slice(0, hardTarget));

  if (selected.length < targetCount) {
    const remaining = allQuestions.filter(q => !selected.includes(q));
    selected.push(...shuffleArray(remaining, seed + 4).slice(0, targetCount - selected.length));
  }

  return selected.slice(0, targetCount);
}

function shuffleOptions(question) {
  if (question.type === 'coding' || !question.option_a) return question;

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ].filter(o => o.text);

  if (options.length < 2) return question;

  const correctText = options.find(o => o.key === question.correct_ans)?.text;

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const newCorrectKey = correctText
    ? options.find(o => o.text === correctText)?.key || question.correct_ans
    : question.correct_ans;

  return {
    ...question,
    option_a:    options[0]?.text || null,
    option_b:    options[1]?.text || null,
    option_c:    options[2]?.text || null,
    option_d:    options[3]?.text || null,
    correct_ans: newCorrectKey,
  };
}

function adaptiveSort(questions) {
  const ORDER = { easy: 0, medium: 1, hard: 2 };
  return [...questions].sort((a, b) => {
    const oa = ORDER[a.difficulty?.toLowerCase()] ?? 1;
    const ob = ORDER[b.difficulty?.toLowerCase()] ?? 1;
    return oa - ob;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/questions/:examId/:type
// FIX: query exam_questions table (Question Bank flow), not old `questions` table
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:examId/:type', authenticateToken, async (req, res) => {
  const { examId, type } = req.params;
  const { assignment_id } = req.query;
  const shouldShuffle = req.query.shuffle === 'true';
  const validTypes = ['mcq', 'sql', 'coding'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type: ${type}. Use mcq | sql | coding` });
  }

  const numericExamId = parseInt(examId, 10);
  if (isNaN(numericExamId)) {
    return res.status(400).json({ error: 'examId must be a number' });
  }

  try {
    // ── Get exam config ───────────────────────────────────────────────────────
    const [examRows] = await db.query(
      `SELECT section_config FROM exams WHERE id = ?`,
      [numericExamId]
    );

    if (examRows.length === 0) {
      return res.status(404).json({ error: `Exam ${numericExamId} not found` });
    }

    const rawConfig   = examRows[0]?.section_config;
    const sectionConfig = rawConfig
      ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig)
      : {};

    const configuredCount = parseInt(
      sectionConfig?.[type]?.questions || sectionConfig?.[type]?.count || 0
    ) || 0;

    console.log(`[Questions] GET ${type} for exam=${numericExamId}, assignment=${assignment_id}, configured count=${configuredCount}`);

    // ── FIX: Query exam_questions (Question Bank flow), not old `questions` table ──
    // Column mapping:
    //   old `questions` table  →  exam_questions table
    //   platform               →  (not present, omit)
    //   starter_code           →  (not present, omit)
    //   constraints_text       →  (not present, omit)
    //   description            →  explanation (closest equivalent)
    const [allPoolRows] = await db.query(
      `SELECT
         id, type, question_text,
         option_a, option_b, option_c, option_d,
         correct_ans, explanation, difficulty,
         marks, order_index
       FROM exam_questions
       WHERE exam_id = ? AND type = ?
       ORDER BY order_index ASC, id ASC`,
      [numericExamId, type]
    );

    if (allPoolRows.length === 0) {
      console.warn(`[Questions] No ${type} questions in pool for exam_id=${numericExamId}`);
      return res.json({
        questions: [],
        total: 0,
        message: `No ${type} questions found for this exam. Make sure questions of type "${type}" were added when creating the exam.`,
      });
    }

    console.log(`[Questions] Pool size: ${allPoolRows.length} ${type} questions`);

    // ── Intelligent assignment logic ──────────────────────────────────────────
    let assignedQuestions = [];
    let isNewAssignment   = false;

    if (assignment_id) {
      const [existingAssign] = await db.query(
        `SELECT question_ids FROM student_exam_questions
         WHERE assignment_id = ? AND question_type = ?`,
        [assignment_id, type]
      );

      if (existingAssign.length > 0 && existingAssign[0].question_ids) {
        const rawIds = existingAssign[0].question_ids;
        const qIds   = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;
        assignedQuestions = allPoolRows.filter(q => qIds.includes(q.id));
        console.log(`[Questions] Using existing assignment: ${assignedQuestions.length} questions`);
      } else {
        isNewAssignment   = true;
        const targetCount = configuredCount > 0 ? configuredCount : allPoolRows.length;
        const studentId   = req.user?.id || assignment_id;

        assignedQuestions = selectQuestionsIntelligently(
          allPoolRows, targetCount, studentId, numericExamId
        );

        console.log(`[Questions] New assignment: ${assignedQuestions.length}/${allPoolRows.length} (target=${targetCount})`);

        const questionIds = assignedQuestions.map(q => q.id);
        try {
          await db.query(
            `INSERT INTO student_exam_questions (assignment_id, question_type, question_ids, created_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE question_ids = VALUES(question_ids)`,
            [assignment_id, type, JSON.stringify(questionIds)]
          );
        } catch (err) {
          console.warn(`[Questions] Could not store assignment (table may not exist):`, err.message);
        }
      }
    } else {
      const targetCount = configuredCount > 0 ? configuredCount : allPoolRows.length;
      assignedQuestions  = allPoolRows.slice(0, targetCount);
      console.log(`[Questions] No assignment_id: returning first ${assignedQuestions.length} questions`);
    }

    // ── Adaptive ordering + shuffling ─────────────────────────────────────────
    let result = adaptiveSort(assignedQuestions);

    if (shouldShuffle || !assignment_id) {
      result = shuffleArray(result);
      result = result.map(q => shuffleOptions(q));
    }

    console.log(`[Questions] ✓ Returning ${result.length} ${type} questions for exam=${numericExamId}`);
    return res.json({
      questions:      result,
      total:          result.length,
      poolSize:       allPoolRows.length,
      isNewAssignment,
      configuredCount,
    });

  } catch (err) {
    console.error(`[Questions /${examId}/${type}]`, err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/questions/answer
// ─────────────────────────────────────────────────────────────────────────────
router.post('/answer', authenticateToken, async (req, res) => {
  const { assignment_id, question_id, selected_ans } = req.body;
  if (!assignment_id || !question_id) {
    return res.status(400).json({ error: 'assignment_id and question_id required' });
  }
  try {
    await db.query(
      `INSERT INTO exam_answers (assignment_id, question_id, selected_ans, answered_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE selected_ans = VALUES(selected_ans), answered_at = NOW()`,
      [assignment_id, question_id, selected_ans]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[SaveAnswer]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/questions/submit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit', authenticateToken, async (req, res) => {
  const { assignment_id, exam_id, score_sql, code_answers, violations, violation_count } = req.body;

  if (!assignment_id) {
    return res.status(400).json({ error: 'assignment_id required' });
  }

  try {
    const fields = [`status = 'submitted'`, `submitted_at = NOW()`];
    const params = [];

    if (score_sql       !== undefined) { fields.push('score_sql = ?');       params.push(score_sql); }
    if (code_answers    !== undefined) { fields.push('code_answers = ?');    params.push(JSON.stringify(code_answers)); }
    if (violations      !== undefined) { fields.push('violations = ?');      params.push(JSON.stringify(violations)); }
    if (violation_count !== undefined) { fields.push('violation_count = ?'); params.push(violation_count); }

    params.push(assignment_id);

    await db.query(
      `UPDATE exam_assignments SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[SubmitExam]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers (local to this block) ────────────────────────────────────────────
function _parseCodingMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { const p = JSON.parse(raw); return (p && typeof p === 'object') ? p : null; }
  catch (_) { return null; }
}
 
function _defaultStarter(lang) {
  switch (lang) {
    case 'python':
      return 'def solution():\n    # Write your solution here\n    pass\n';
    case 'java':
      return 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n';
    case 'cpp':
      return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n';
    case 'javascript':
      return '/**\n * @param {*} input\n * @return {*}\n */\nfunction solution(input) {\n    // Write your solution here\n}\n';
    default:
      return `// Write your ${lang} solution here\n`;
  }
}
 
// ── GET /api/questions/:id/starter?lang=python|java|cpp|javascript ───────────
// Returns the starter code for a single question + language.
// Checks exam_questions first (explanation JSON blob → flat columns → fallback),
// then question_bank as a secondary source.
router.get('/:id/starter', authenticateToken, async (req, res) => {
  const questionId = parseInt(req.params.id, 10);
  const lang = (req.query.lang || 'python').toLowerCase();
  const VALID = ['python', 'java', 'cpp', 'javascript'];
 
  if (isNaN(questionId)) return res.status(400).json({ error: 'Invalid question id' });
  if (!VALID.includes(lang)) return res.status(400).json({ error: `Unsupported language: ${lang}` });
 
  try {
    // 1. Check exam_questions
    const [eqRows] = await db.query(
      `SELECT explanation, question_text,
              starter_code,
              starter_python, starter_java, starter_cpp, starter_javascript
       FROM exam_questions WHERE id = ? LIMIT 1`,
      [questionId]
    );
 
    const row = eqRows[0];
    if (row) {
      // Try explanation JSON blob first
      const meta = _parseCodingMeta(row.explanation);
      if (meta?.starterCode?.[lang]) {
        return res.json({ starter_code: meta.starterCode[lang], language: lang, source: 'explanation_json' });
      }
      // Try flat columns
      const col = `starter_${lang}`;
      if (row[col]) return res.json({ starter_code: row[col], language: lang, source: 'column' });
      // Generic
      if (lang === 'python' && row.starter_code)
        return res.json({ starter_code: row.starter_code, language: lang, source: 'starter_code' });
    }
 
    // 2. Fallback to question_bank
    const [qbRows] = await db.query(
      `SELECT explanation, question_text,
              starter_code,
              starter_python, starter_java, starter_cpp, starter_javascript
       FROM question_bank WHERE id = ? LIMIT 1`,
      [questionId]
    );
 
    const qb = qbRows[0];
    if (qb) {
      const meta = _parseCodingMeta(qb.explanation);
      if (meta?.starterCode?.[lang])
        return res.json({ starter_code: meta.starterCode[lang], language: lang, source: 'qb_explanation_json' });
      const col = `starter_${lang}`;
      if (qb[col]) return res.json({ starter_code: qb[col], language: lang, source: 'qb_column' });
      if (lang === 'python' && qb.starter_code)
        return res.json({ starter_code: qb.starter_code, language: lang, source: 'qb_starter_code' });
    }
 
    // 3. Always return something (frontend also does this, belt-and-suspenders)
    return res.json({ starter_code: _defaultStarter(lang), language: lang, source: 'fallback' });
 
  } catch (err) {
    console.error('[Starter]', err.message);
    return res.status(500).json({ error: 'Failed to fetch starter code' });
  }
});
module.exports = router;