// backend/routes/questions.js
//
// Questions are stored per-exam when the exam is created from uploaded PDFs.
// This router fetches ONLY questions that belong to the requested exam (exam_id match).
// There is NO fallback to the question bank for placement exam questions.
// Adaptive shuffling (Fisher-Yates) is applied per request so each student
// sees questions in a different order, but the same set.

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ── Seeded random number generator (deterministic randomness) ─────────────────
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Fisher-Yates shuffle with optional seed ──────────────────────────────────
function shuffleArray(arr, seed = null) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j;
    if (seed !== null) {
      // Deterministic random (same seed = same shuffle)
      j = Math.floor(seededRandom(seed + i) * (i + 1));
    } else {
      // Regular random
      j = Math.floor(Math.random() * (i + 1));
    }
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Intelligent question selection based on difficulty distribution ──────────
/**
 * Select N questions from a pool with fair difficulty distribution.
 * Uses seeded randomization so same student gets consistent questions.
 * But different students get different selections.
 */
function selectQuestionsIntelligently(allQuestions, targetCount, studentId, examId) {
  if (allQuestions.length === 0) return [];
  if (allQuestions.length <= targetCount) return allQuestions;

  // Group by difficulty
  const byDifficulty = { easy: [], medium: [], hard: [] };
  allQuestions.forEach(q => {
    const diff = (q.difficulty || 'medium').toLowerCase();
    if (!byDifficulty[diff]) byDifficulty[diff] = [];
    byDifficulty[diff].push(q);
  });

  const seed = `${studentId}:${examId}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  // Calculate distribution: try to maintain difficulty balance
  const easyTarget   = Math.floor(targetCount * 0.25);
  const mediumTarget = Math.floor(targetCount * 0.50);
  const hardTarget   = Math.floor(targetCount * 0.25);

  const selected = [];

  // Select from each difficulty tier
  const easyShuffled = shuffleArray(byDifficulty.easy, seed + 1);
  selected.push(...easyShuffled.slice(0, Math.min(easyTarget, easyShuffled.length)));

  const mediumShuffled = shuffleArray(byDifficulty.medium, seed + 2);
  selected.push(...mediumShuffled.slice(0, Math.min(mediumTarget, mediumShuffled.length)));

  const hardShuffled = shuffleArray(byDifficulty.hard, seed + 3);
  selected.push(...hardShuffled.slice(0, Math.min(hardTarget, hardShuffled.length)));

  // If we still need more, fill from anywhere
  if (selected.length < targetCount) {
    const remaining = allQuestions.filter(q => !selected.includes(q));
    const remainingShuffled = shuffleArray(remaining, seed + 4);
    selected.push(...remainingShuffled.slice(0, targetCount - selected.length));
  }

  return selected.slice(0, targetCount);
}

// ── Shuffle answer options per question (keeps correct_ans in sync) ──────────
function shuffleOptions(question) {
  if (question.type === 'coding' || !question.option_a) return question;

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ].filter(o => o.text); // drop empty options

  if (options.length < 2) return question;

  // Remember the correct answer text before shuffling
  const correctText = options.find(o => o.key === question.correct_ans)?.text;

  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Remap correct_ans to new position
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

// ── Adaptive difficulty sort: easy → medium → hard → other ──────────────────
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
//
// Fetches questions for a specific exam + type + student.
// INTELLIGENT DYNAMIC ASSIGNMENT:
//   1. Fetch ALL questions in the pool for this exam+type
//   2. If student has no previous assignment for this section:
//      - Select N questions intelligently (fair difficulty distribution)
//      - Store selection in `student_exam_questions` table
//      - Return those questions
//   3. If student already has assignment:
//      - Return the same questions (consistency during exam)
//   4. Apply adaptive ordering + per-student option shuffling
//
// Query params:
//   ?assignment_id=X — student's exam assignment ID
//   ?shuffle=true    — shuffle question order (always applied at fetch time)
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
    // ── Step 1: Get exam config to know how many questions should be selected ──
    const [examRows] = await db.query(
      `SELECT section_config FROM exams WHERE id = ?`,
      [numericExamId]
    );

    if (examRows.length === 0) {
      return res.status(404).json({ error: `Exam ${numericExamId} not found` });
    }

    // FIX 1: MySQL JSON columns are auto-parsed by mysql2 into objects.
    // Calling JSON.parse() on an already-parsed object throws
    // SyntaxError: "[object Object]" is not valid JSON.
    // Solution: check typeof before parsing.
    const rawConfig = examRows[0]?.section_config;
    const sectionConfig = rawConfig
      ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig)
      : {};

    // Frontend sends section_config like: { mcq: { questions: "10", minutes: "30" }, ... }
    const configuredCount = parseInt(sectionConfig?.[type]?.questions || sectionConfig?.[type]?.count || 0) || 0;

    console.log(`[Questions] GET ${type} for exam=${numericExamId}, assignment=${assignment_id}, configured count=${configuredCount}`);

    // ── Step 2: Fetch the FULL POOL of questions from PDF ──────────────────────
    const [allPoolRows] = await db.query(
      `SELECT
         id, type, question_text, option_a, option_b, option_c, option_d,
         correct_ans, explanation, difficulty, description,
         platform, starter_code, constraints_text
       FROM questions
       WHERE exam_id = ? AND type = ? AND (is_bank = 0 OR is_bank IS NULL)
       ORDER BY id ASC`,
      [numericExamId, type]
    );

    if (allPoolRows.length === 0) {
      console.warn(`[Questions] No ${type} questions in pool for exam_id=${numericExamId}`);
      return res.json({
        questions: [],
        total: 0,
        message: `No ${type} questions found for this exam.`,
      });
    }

    console.log(`[Questions] Pool size: ${allPoolRows.length} ${type} questions`);

    // ── Step 3: Intelligent assignment logic ──────────────────────────────────
    let assignedQuestions = [];
    let isNewAssignment   = false;

    if (assignment_id) {
      // Try to fetch previously assigned questions for this student+section
      const [existingAssign] = await db.query(
        `SELECT question_ids FROM student_exam_questions 
         WHERE assignment_id = ? AND question_type = ?`,
        [assignment_id, type]
      );

      if (existingAssign.length > 0 && existingAssign[0].question_ids) {
        // FIX 2: Same safe-parse for question_ids JSON column.
        const rawIds = existingAssign[0].question_ids;
        const qIds   = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;

        assignedQuestions = allPoolRows.filter(q => qIds.includes(q.id));
        console.log(`[Questions] Using existing assignment: ${assignedQuestions.length} questions for student`);
      } else {
        // Create new assignment
        isNewAssignment   = true;
        const targetCount = configuredCount > 0 ? configuredCount : allPoolRows.length;
        const studentId   = req.user?.id || assignment_id; // fallback to assignment_id

        // Intelligent selection: fair difficulty distribution + seeded randomization
        assignedQuestions = selectQuestionsIntelligently(
          allPoolRows,
          targetCount,
          studentId,
          numericExamId
        );

        console.log(`[Questions] Generated NEW assignment: ${assignedQuestions.length}/${allPoolRows.length} questions (target=${targetCount})`);

        // Store the assignment for future consistency
        const questionIds = assignedQuestions.map(q => q.id);
        try {
          await db.query(
            `INSERT INTO student_exam_questions (assignment_id, question_type, question_ids, created_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE question_ids = VALUES(question_ids)`,
            [assignment_id, type, JSON.stringify(questionIds)]
          );
          console.log(`[Questions] Stored assignment for ${assignment_id}/${type}: ${questionIds.length} question IDs`);
        } catch (err) {
          console.warn(`[Questions] Could not store assignment (table may not exist):`, err.message);
        }
      }
    } else {
      // No assignment_id provided — return limited pool based on config
      const targetCount = configuredCount > 0 ? configuredCount : allPoolRows.length;
      assignedQuestions  = allPoolRows.slice(0, targetCount);
      console.log(`[Questions] No assignment_id: returning first ${assignedQuestions.length} questions (configured count=${configuredCount})`);
    }

    // ── Step 4: Apply adaptive ordering ──────────────────────────────────────
    let result = adaptiveSort(assignedQuestions);

    // ── Step 5: Apply shuffling (question order + options) ────────────────────
    if (shouldShuffle || !assignment_id) {
      // Always shuffle on every fetch (ensures different order per request)
      result = shuffleArray(result);
      result = result.map(q => shuffleOptions(q));
      console.log(`[Questions] Applied shuffling: randomized order + option positions`);
    }

    console.log(`[Questions] ✓ Returning ${result.length} ${type} questions for exam=${numericExamId} (pool had ${allPoolRows.length})`);
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
// POST /api/questions/answer — save one answer
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
// POST /api/questions/submit — mark assignment submitted
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit', authenticateToken, async (req, res) => {
  const {
    assignment_id,
    exam_id,
    score_sql,
    code_answers,
    violations,
    violation_count,
  } = req.body;

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

module.exports = router;