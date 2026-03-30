// routes/questions.js
// GET  /api/questions/:examId/:pageType  — fetch randomized questions for exam page
// POST /api/questions/answer             — save a student's answer
// POST /api/questions/submit             — submit exam, compute score
// GET  /api/questions/result/:assignmentId — get result after submission

const express = require('express');
const router  = express.Router();
const db       = require("../config/db");
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getQuestionsForPage } = require('./questionShuffler');

// ─── GET RANDOMIZED QUESTIONS FOR EXAM PAGE ────────────────────────────────
// Called by MCQExam.jsx, SQLExam.jsx, CodeExam.jsx when exam starts
// pageType: 'mcq' | 'sql' | 'coding'
router.get('/:examId/:pageType', authenticateToken, async (req, res) => {
  const { examId, pageType } = req.params;
  const { assignment_id } = req.query;

  if (!['mcq', 'sql', 'coding'].includes(pageType)) {
    return res.status(400).json({ error: 'Invalid pageType. Use: mcq | sql | coding' });
  }

  try {
    // Verify assignment belongs to this student
    if (assignment_id) {
      const [aRows] = await db.query(
        'SELECT id, status FROM exam_assignments WHERE id = ? AND exam_id = ?',
        [assignment_id, examId]
      );
      if (!aRows.length) {
        return res.status(403).json({ error: 'Assignment not found or not yours' });
      }
      if (aRows[0].status === 'submitted') {
        return res.status(400).json({ error: 'Exam already submitted' });
      }
    }

    // Fetch all questions for this exam of the requested type
    const [questions] = await db.query(
      `SELECT id, type, question_text,
              option_a, option_b, option_c, option_d,
              correct_ans, explanation,
              description, platform, starter_code, constraints_text,
              difficulty
       FROM questions
       WHERE exam_id = ? AND type = ?`,
      [examId, pageType]
    );

    if (questions.length === 0) {
      return res.json({ questions: [], message: 'No questions found for this section' });
    }

    // Apply adaptive shuffle (easy → medium → hard, options randomized)
    const shuffled = getQuestionsForPage(questions, pageType);

    // For security: strip correct_ans before sending to client
    // Students should NOT receive the correct answer
    const safeQuestions = shuffled.map(q => {
      const safe = { ...q };
      delete safe.correct_ans;
      delete safe.explanation;
      return safe;
    });

    return res.json({
      questions: safeQuestions,
      total: safeQuestions.length,
      pageType,
      exam_id: examId,
    });

  } catch (err) {
    console.error('[GetQuestions]', err);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ─── SAVE ANSWER (called as student answers each question) ─────────────────
router.post('/answer', authenticateToken, async (req, res) => {
  const { assignment_id, question_id, selected_ans, code_answer } = req.body;

  if (!assignment_id || !question_id) {
    return res.status(400).json({ error: 'assignment_id and question_id required' });
  }

  try {
    // Verify assignment belongs to this user's exam
    const [aRows] = await db.query(
      'SELECT id FROM exam_assignments WHERE id = ?',
      [assignment_id]
    );
    if (!aRows.length) return res.status(403).json({ error: 'Invalid assignment' });

    // Get correct answer to check
    const [qRows] = await db.query(
      'SELECT correct_ans, type FROM questions WHERE id = ?',
      [question_id]
    );
    if (!qRows.length) return res.status(404).json({ error: 'Question not found' });

    const isCorrect = qRows[0].type !== 'coding'
      ? (selected_ans === qRows[0].correct_ans)
      : false; // coding checked separately

    // Upsert: update if already answered, insert if new
    await db.query(
      `INSERT INTO student_answers (assignment_id, question_id, selected_ans, code_answer, is_correct)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         selected_ans = VALUES(selected_ans),
         code_answer  = VALUES(code_answer),
         is_correct   = VALUES(is_correct),
         answered_at  = NOW()`,
      [assignment_id, question_id, selected_ans || null, code_answer || null, isCorrect ? 1 : 0]
    );

    return res.json({ saved: true, is_correct: isCorrect });

  } catch (err) {
    console.error('[SaveAnswer]', err);
    return res.status(500).json({ error: 'Failed to save answer' });
  }
});

// ─── SUBMIT EXAM (called when student clicks "Submit") ────────────────────
router.post('/submit', authenticateToken, async (req, res) => {
  const { assignment_id, exam_id } = req.body;
  if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' });

  try {
    // Calculate scores by type
    const [answerStats] = await db.query(
      `SELECT q.type,
              COUNT(*) AS total,
              SUM(sa.is_correct) AS correct
       FROM student_answers sa
       JOIN questions q ON q.id = sa.question_id
       WHERE sa.assignment_id = ?
       GROUP BY q.type`,
      [assignment_id]
    );

    // Get total questions per type for this exam
    const [qTotals] = await db.query(
      `SELECT type, COUNT(*) AS total
       FROM questions
       WHERE exam_id = (SELECT exam_id FROM exam_assignments WHERE id = ?)
       GROUP BY type`,
      [assignment_id]
    );

    // Build score map
    const scoreMap = {};
    for (const row of answerStats) {
      scoreMap[row.type] = { correct: Number(row.correct), total: Number(row.total) };
    }

    // Compute percentage scores
    const scoreMCQ    = scoreMap.mcq    ? (scoreMap.mcq.correct    / scoreMap.mcq.total    * 100) : null;
    const scoreSQL    = scoreMap.sql    ? (scoreMap.sql.correct    / scoreMap.sql.total    * 100) : null;
    const scoreCoding = scoreMap.coding ? 0 : null; // coding scored by judge separately

    // Overall: average of attempted sections
    const attempted = [scoreMCQ, scoreSQL, scoreCoding].filter(s => s !== null);
    const overall   = attempted.length > 0
      ? attempted.reduce((a, b) => a + b, 0) / attempted.length
      : 0;

    // Update assignment
    await db.query(
      `UPDATE exam_assignments
       SET status        = 'submitted',
           submitted_at  = NOW(),
           score         = ?,
           score_mcq     = ?,
           score_sql     = ?,
           score_coding  = ?
       WHERE id = ?`,
      [
        Math.round(overall * 100) / 100,
        scoreMCQ    !== null ? Math.round(scoreMCQ    * 100) / 100 : null,
        scoreSQL    !== null ? Math.round(scoreSQL    * 100) / 100 : null,
        scoreCoding !== null ? Math.round(scoreCoding * 100) / 100 : null,
        assignment_id,
      ]
    );

    return res.json({
      submitted:    true,
      score:        Math.round(overall * 100) / 100,
      score_mcq:    scoreMCQ,
      score_sql:    scoreSQL,
      score_coding: scoreCoding,
      details:      scoreMap,
    });

  } catch (err) {
    console.error('[SubmitExam]', err);
    return res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// ─── GET RESULT ──────────────────────────────────────────────────────────────
router.get('/result/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ea.score, ea.score_mcq, ea.score_sql, ea.score_coding,
              ea.status, ea.submitted_at,
              e.title, e.pass_mark, e.total_marks
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.id = ?`,
      [req.params.assignmentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Result not found' });
    return res.json({ result: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch result' });
  }
});

module.exports = router;