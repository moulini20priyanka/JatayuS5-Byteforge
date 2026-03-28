// routes/universityExamRoutes.js
// Handles: fallback-mcq, submit, admin report, faculty written review

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { assignPapersToStudents, generateDummyMcq, shuffle } = require('./universityQuestionShuffler');

const safeJSON = (val, fallback = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORD SCORER
// ─────────────────────────────────────────────────────────────────────────────
function scoreWrittenAnswer(answerText, keywordsString, maxMarks = 8) {
  if (!answerText || !keywordsString) {
    return { score: 0, maxScore: maxMarks, matchedKeywords: [], missingKeywords: [], percentage: 0 };
  }

  const keywords = keywordsString
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    return { score: 0, maxScore: maxMarks, matchedKeywords: [], missingKeywords: [], percentage: 0 };
  }

  const answerLower = answerText.toLowerCase();
  const matched = [];
  const missing = [];

  for (const kw of keywords) {
    const parts = kw.replace(/[()]/g, '').split(/[,\s\/]+/).filter(w => w.length > 2);
    const found = parts.some(part => answerLower.includes(part));
    if (found) matched.push(kw);
    else        missing.push(kw);
  }

  const percentage = Math.round((matched.length / keywords.length) * 100);
  const rawScore   = (matched.length / keywords.length) * maxMarks;
  const score      = Math.round(rawScore * 2) / 2;

  return {
    score,
    maxScore:        maxMarks,
    matchedKeywords: matched,
    missingKeywords: missing,
    percentage,
    keywordTotal:    keywords.length,
    keywordMatched:  matched.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exams/university/:examId/fallback-mcq
// Called by frontend when mcq array is empty after PDF parse failure.
// Creates assignment on-the-fly if needed. Pulls from DB, not just PDF.
// ALWAYS returns questions - never returns 404.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams/university/:examId/fallback-mcq', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId  = req.user.id;

    console.log(`[FallbackMCQ] examId=${examId} studentId=${studentId}`);

    // 1. Fetch exam metadata (optional - if not found, use default subject)
    let subject = 'General';
    let mcqCount = 20;
    let examTitle = `Exam ${examId}`;
    
    const [examRows] = await db.query(
      `SELECT id, subject_name, subject_code, section_config, title FROM exams WHERE id = ? LIMIT 1`,
      [examId]
    );

    if (examRows.length > 0) {
      const exam = examRows[0];
      subject = exam.subject_name || exam.subject_code || 'General';
      examTitle = exam.title || examTitle;
      const cfg = safeJSON(exam.section_config, {});
      mcqCount = parseInt(cfg?.mcq?.count ?? 20);
      console.log(`[FallbackMCQ] Found exam: subject=${subject} title=${examTitle} mcqCount=${mcqCount}`);
    } else {
      console.log(`[FallbackMCQ] Exam ${examId} not found - will use defaults and generate questions`);
    }

    // 2. Try to find or create assignment
    let [assignRows] = await db.query(
      `SELECT id, paper_mcq, status FROM university_exam_assignments
       WHERE student_id = ? AND exam_id = ?
       LIMIT 1`,
      [studentId, examId]
    );

    let assignmentId = null;
    let paperMcq = [];

    if (assignRows.length > 0) {
      assignmentId = assignRows[0].id;
      paperMcq = safeJSON(assignRows[0].paper_mcq, []);
      console.log(`[FallbackMCQ] Found assignment: id=${assignmentId} paper_mcq.length=${paperMcq.length}`);

      // If assignment already has MCQs, return them
      if (paperMcq.length > 0) {
        const stripped = paperMcq.map(q => ({
          id:      q.id,
          text:    q.text || q.question_text || '',
          options: q.options || [],
          marks:   q.marks || 1,
        }));
        console.log(`[FallbackMCQ] Returning ${stripped.length} existing MCQs from assignment`);
        return res.json({ mcq: stripped, source: 'assignment' });
      }
    } else {
      // No assignment exists — create one now
      console.log(`[FallbackMCQ] No assignment found, creating one for student=${studentId} exam=${examId}`);
      try {
        const [insertResult] = await db.query(
          `INSERT INTO university_exam_assignments
           (student_id, exam_id, status, created_at)
           VALUES (?, ?, 'in_progress', NOW())`,
          [studentId, examId]
        );
        assignmentId = insertResult.insertId;
        console.log(`[FallbackMCQ] Created assignment: id=${assignmentId}`);
      } catch (createErr) {
        console.warn(`[FallbackMCQ] Could not create assignment:`, createErr.message);
        assignmentId = null;  // Continue anyway
      }
    }

    // 3. Pull MCQ questions from database sources
    let selected = [];

    // 3a. Try exam_question_banks first
    const [bankRows] = await db.query(
      `SELECT mcq_pool FROM exam_question_banks WHERE exam_id = ? LIMIT 1`,
      [examId]
    );

    if (bankRows.length > 0 && bankRows[0].mcq_pool) {
      const bankPool = safeJSON(bankRows[0].mcq_pool, []);
      if (bankPool.length > 0) {
        console.log(`[FallbackMCQ] Found ${bankPool.length} questions in exam_question_banks`);
        selected = shuffle(bankPool).slice(0, mcqCount).map(q => ({
          id:      q.id || require('uuid').v4(),
          text:    q.text || q.question_text || '',
          options: q.options || [
            { key: 'A', text: q.option_a || '' },
            { key: 'B', text: q.option_b || '' },
            { key: 'C', text: q.option_c || '' },
            { key: 'D', text: q.option_d || '' },
          ].filter(o => o.text),
          answer:  q.answer || q.correct_answer || '',
          marks:   q.marks || 1,
        }));
      }
    }

    // 3b. If bank empty, try questions table
    if (selected.length === 0) {
      try {
        const [qRows] = await db.query(
          `SELECT * FROM questions WHERE exam_id = ? LIMIT ?`,
          [examId, mcqCount * 2]
        );

        if (qRows.length > 0) {
          console.log(`[FallbackMCQ] Found ${qRows.length} questions in questions table`);
          selected = shuffle(qRows).slice(0, mcqCount).map(q => ({
            id:      q.id || require('uuid').v4(),
            text:    q.question_text || q.text || '',
            options: q.options ? (typeof q.options === 'string' ? safeJSON(q.options, []) : q.options) : [
              { key: 'A', text: q.option_a || '' },
              { key: 'B', text: q.option_b || '' },
              { key: 'C', text: q.option_c || '' },
              { key: 'D', text: q.option_d || '' },
            ].filter(o => o.text),
            answer:  q.answer || q.correct_answer || '',
            marks:   q.marks || 1,
          }));
        }
      } catch (qErr) {
        console.warn(`[FallbackMCQ] Error querying questions table:`, qErr.message);
      }
    }

    // 4. If still nothing, generate dummy MCQs (ALWAYS has fallback)
    if (selected.length === 0) {
      console.log(`[FallbackMCQ] No DB questions found, generating ${mcqCount} dummy MCQs for subject: ${subject}`);
      const pool = generateDummyMcq(subject, Math.max(mcqCount * 2, 40));
      selected   = pool.slice(0, mcqCount);
    }

    // 5. Persist with answers for grading later (if assignment exists)
    if (assignmentId) {
      const withAnswers = selected.map(q => ({
        id:      q.id,
        text:    q.text,
        options: q.options,
        answer:  q.answer,
        marks:   q.marks || 1,
      }));

      try {
        await db.query(
          `UPDATE university_exam_assignments SET paper_mcq = ? WHERE id = ?`,
          [JSON.stringify(withAnswers), assignmentId]
        );
      } catch (updateErr) {
        console.warn(`[FallbackMCQ] Could not update assignment:`, updateErr.message);
      }
    }

    // 6. Return to client WITHOUT answers, with shuffled options
    const forClient = selected.map(q => ({
      id:      q.id,
      text:    q.text,
      options: shuffle(q.options || []),
      marks:   q.marks || 1,
    }));

    console.log(`[FallbackMCQ] Returning ${forClient.length} MCQs to client (source: ${assignmentId ? 'database/generated' : 'generated'})`);
    return res.json({ mcq: forClient, source: 'generated' });

  } catch (err) {
    console.error('[FallbackMCQ] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exams/university/:examId/submit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exams/university/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { examId }                       = req.params;
    const { mcq_answers, written_answers } = req.body;
    const studentId = req.user.id;

    const [rows] = await db.query(
      `SELECT uea.id, uea.paper_mcq, uea.paper_written, uea.status,
              e.section_config, e.total_marks
       FROM university_exam_assignments uea
       JOIN exams e ON e.id = uea.exam_id
       WHERE uea.student_id = ? AND uea.exam_id = ?
       LIMIT 1`,
      [studentId, examId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const row = rows[0];
    if (row.status === 'completed') return res.status(400).json({ error: 'Already submitted' });

    const cfg        = safeJSON(row.section_config, {});
    const mcqMarkPer = parseInt(cfg?.mcq?.marks ?? 1);

    // ── MCQ Grading ──────────────────────────────────────────────────────────
    const paper        = safeJSON(row.paper_mcq, []);
    const answers      = mcq_answers || {};
    let   mcqScore     = 0;
    const mcqBreakdown = [];

    for (const q of paper) {
      const studentAnswer = (answers[q.id] || '').toUpperCase();
      const correctAnswer = (q.answer      || '').toUpperCase();
      const isCorrect     = studentAnswer === correctAnswer && studentAnswer !== '';
      if (isCorrect) mcqScore += mcqMarkPer;
      mcqBreakdown.push({
        questionId:   q.id,
        questionText: q.text,
        studentAnswer,
        correctAnswer,
        isCorrect,
        marks: isCorrect ? mcqMarkPer : 0,
      });
    }

    // ── Written Keyword Scoring ───────────────────────────────────────────────
    const writtenPaper     = safeJSON(row.paper_written, []);
    const writtenAnswers   = written_answers || {};
    let   writtenAutoScore = 0;
    const writtenBreakdown = [];

    for (const q of writtenPaper) {
      const answerText = writtenAnswers[q.id] || '';
      const result     = scoreWrittenAnswer(answerText, q.keywords, q.marks || 8);
      writtenAutoScore += result.score;
      writtenBreakdown.push({
        questionId:      q.id,
        questionText:    q.text,
        keywords:        q.keywords,
        studentAnswer:   answerText,
        autoScore:       result.score,
        maxScore:        result.maxScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        percentage:      result.percentage,
        facultyScore:    null,
        facultyComment:  null,
        finalScore:      null,
      });
    }

    const combined = Math.round((mcqScore + writtenAutoScore) * 100) / 100;

    await db.query(
      `UPDATE university_exam_assignments
       SET status             = 'completed',
           submitted_at       = NOW(),
           mcq_score          = ?,
           written_auto_score = ?,
           total_score        = ?,
           mcq_answers        = ?,
           written_answers    = ?,
           mcq_breakdown      = ?,
           written_breakdown  = ?
       WHERE id = ?`,
      [
        mcqScore,
        Math.round(writtenAutoScore * 100) / 100,
        combined,
        JSON.stringify(answers),
        JSON.stringify(writtenAnswers),
        JSON.stringify(mcqBreakdown),
        JSON.stringify(writtenBreakdown),
        row.id,
      ]
    );

    return res.json({
      success: true,
      message: 'Exam submitted successfully. Your answers have been recorded.',
    });

  } catch (err) {
    console.error('[UnivSubmit]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/university-exam/:examId/report
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/university-exam/:examId/report', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;

    const [examRows] = await db.query(
      `SELECT id, title, subject_name, subject_code, semester,
              duration_minutes, total_marks, pass_mark, college, batch_year
       FROM exams WHERE id = ?`,
      [examId]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];

    const [assignRows] = await db.query(
      `SELECT
         uea.id,
         uea.student_id,
         c.name             AS student_name,
         c.email            AS student_email,
         c.roll_no,
         uea.status,
         uea.assigned_at,
         uea.started_at,
         uea.submitted_at,
         uea.mcq_score,
         uea.written_auto_score,
         uea.total_score,
         uea.mcq_breakdown,
         uea.written_breakdown,
         JSON_LENGTH(uea.paper_mcq)     AS mcq_count,
         JSON_LENGTH(uea.paper_written) AS written_count
       FROM university_exam_assignments uea
       JOIN candidates c ON c.id = uea.student_id
       WHERE uea.exam_id = ?
       ORDER BY uea.total_score DESC`,
      [examId]
    );

    // Per-question MCQ analytics
    const questionStats = {};
    for (const row of assignRows) {
      const breakdown = safeJSON(row.mcq_breakdown, []);
      for (const item of breakdown) {
        if (!questionStats[item.questionId]) {
          questionStats[item.questionId] = {
            questionId:    item.questionId,
            questionText:  item.questionText,
            correctAnswer: item.correctAnswer,
            total: 0, correct: 0,
            answerDist: { A: 0, B: 0, C: 0, D: 0 },
          };
        }
        const qs = questionStats[item.questionId];
        qs.total++;
        if (item.isCorrect) qs.correct++;
        if (item.studentAnswer) {
          qs.answerDist[item.studentAnswer] = (qs.answerDist[item.studentAnswer] || 0) + 1;
        }
      }
    }

    const questionAnalytics = Object.values(questionStats).map(q => ({
      ...q,
      correctRate: q.total > 0 ? Math.round((q.correct / q.total) * 100) : null,
      difficulty:  q.total > 0
        ? (q.correct / q.total >= 0.7 ? 'easy' : q.correct / q.total >= 0.4 ? 'medium' : 'hard')
        : 'unknown',
    })).sort((a, b) => (a.correctRate ?? 100) - (b.correctRate ?? 100));

    // Per-question written analytics
    const writtenStats = {};
    for (const row of assignRows) {
      const breakdown = safeJSON(row.written_breakdown, []);
      for (const item of breakdown) {
        if (!writtenStats[item.questionId]) {
          writtenStats[item.questionId] = {
            questionId: item.questionId, questionText: item.questionText,
            keywords: item.keywords, total: 0, totalPct: 0, totalScore: 0, maxScore: item.maxScore,
          };
        }
        const ws = writtenStats[item.questionId];
        ws.total++;
        ws.totalPct   += item.percentage || 0;
        ws.totalScore += item.autoScore  || 0;
      }
    }

    const writtenAnalytics = Object.values(writtenStats).map(w => ({
      ...w,
      avgKeywordMatch: w.total > 0 ? Math.round(w.totalPct / w.total) : null,
      avgScore:        w.total > 0 ? Math.round((w.totalScore / w.total) * 10) / 10 : null,
    }));

    const submitted   = assignRows.filter(r => r.status === 'completed');
    const scores      = submitted.map(r => r.total_score || 0);
    const passMark    = exam.pass_mark || 40;
    const passPercent = Math.round((scores.filter(s => s >= passMark).length / (scores.length || 1)) * 100);
    const avg         = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;

    const studentList = assignRows.map((r, rank) => ({
      rank:             r.status === 'completed' ? rank + 1 : null,
      studentId:        r.student_id,
      studentName:      r.student_name,
      studentEmail:     r.student_email,
      rollNo:           r.roll_no,
      status:           r.status,
      assignedAt:       r.assigned_at,
      startedAt:        r.started_at,
      submittedAt:      r.submitted_at,
      mcqScore:         r.mcq_score,
      writtenAutoScore: r.written_auto_score,
      totalScore:       r.total_score,
      totalMarks:       exam.total_marks,
      percentage:       r.total_score != null ? Math.round((r.total_score / exam.total_marks) * 100) : null,
      passed:           r.total_score != null ? r.total_score >= passMark : null,
      mcqCount:         r.mcq_count,
      writtenCount:     r.written_count,
      writtenBreakdown: safeJSON(r.written_breakdown, []),
    }));

    return res.json({
      exam,
      summary: {
        totalStudents: assignRows.length,
        submitted:     submitted.length,
        notStarted:    assignRows.filter(r => r.status === 'assigned').length,
        inProgress:    assignRows.filter(r => r.status === 'started').length,
        avgScore:      avg,
        highestScore:  scores.length ? Math.max(...scores) : 0,
        lowestScore:   scores.length ? Math.min(...scores) : 0,
        passRate:      passPercent,
        passMark,
      },
      students:         studentList,
      mcqAnalytics:     questionAnalytics,
      writtenAnalytics,
    });

  } catch (err) {
    console.error('[UnivAdminReport]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/university-exam/review-written
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/university-exam/review-written', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { assignmentId, questionId, facultyScore, facultyComment } = req.body;

    if (!assignmentId || !questionId || facultyScore == null) {
      return res.status(400).json({ error: 'assignmentId, questionId, facultyScore required' });
    }

    const [rows] = await db.query(
      `SELECT written_breakdown, written_auto_score, mcq_score
       FROM university_exam_assignments WHERE id = ?`,
      [assignmentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });

    const breakdown = safeJSON(rows[0].written_breakdown, []);
    let newWrittenTotal = 0;

    const updated = breakdown.map(item => {
      if (item.questionId === questionId) {
        const finalScore = Math.min(parseFloat(facultyScore), item.maxScore);
        newWrittenTotal += finalScore;
        return { ...item, facultyScore: finalScore, facultyComment: facultyComment || '', finalScore };
      }
      newWrittenTotal += item.facultyScore != null ? item.facultyScore : item.autoScore;
      return item;
    });

    const newTotal = Math.round(((rows[0].mcq_score || 0) + newWrittenTotal) * 100) / 100;

    await db.query(
      `UPDATE university_exam_assignments
       SET written_breakdown = ?, written_auto_score = ?, total_score = ?
       WHERE id = ?`,
      [JSON.stringify(updated), Math.round(newWrittenTotal * 100) / 100, newTotal, assignmentId]
    );

    return res.json({ success: true, newWrittenTotal, newTotal });

  } catch (err) {
    console.error('[ReviewWritten]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper used by exam creation (called from exams.js)
// ─────────────────────────────────────────────────────────────────────────────
async function assignRandomizedPapers(conn, examId, students, mcqPool, writtenPool, sectionConfig, subject) {
  const assignments = assignPapersToStudents(students, mcqPool, writtenPool, sectionConfig, subject);
  const { v4: uuidv4 } = require('uuid');

  const generateUnivKey = (prefix = 'UNI') =>
    `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`;

  const emailQueue = [];

  for (const assignment of assignments) {
    const { studentId, mcq, written } = assignment;

    const [existing] = await conn.query(
      `SELECT id FROM university_exam_assignments WHERE exam_id = ? AND student_id = ?`,
      [examId, studentId]
    );
    if (existing.length > 0) {
      console.log(`[AssignPapers] Skipping student ${studentId} — already assigned`);
      continue;
    }

    const examKey = generateUnivKey('UNI');

    await conn.query(
      `INSERT INTO university_exam_assignments
         (exam_id, student_id, exam_key, paper_mcq, paper_written, status, assigned_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', NOW())`,
      [examId, studentId, examKey, JSON.stringify(mcq), JSON.stringify(written)]
    );

    emailQueue.push({ studentId, examKey });
  }

  return emailQueue;
}

module.exports = router;
module.exports.scoreWrittenAnswer     = scoreWrittenAnswer;
module.exports.assignRandomizedPapers = assignRandomizedPapers;