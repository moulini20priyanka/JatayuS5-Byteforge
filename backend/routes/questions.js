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
    const j = seed !== null
      ? Math.floor(seededRandom(seed + i) * (i + 1))
      : Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectQuestionsIntelligently(all, target, studentId, examId) {
  if (!all.length) return [];
  if (all.length <= target) return all;
  const byDiff = { easy: [], medium: [], hard: [] };
  all.forEach(q => (byDiff[(q.difficulty || 'medium').toLowerCase()] || byDiff.medium).push(q));
  const seed = `${studentId}:${examId}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const eT = Math.floor(target * 0.25), mT = Math.floor(target * 0.50), hT = target - eT - mT;
  const selected = [
    ...shuffleArray(byDiff.easy,   seed + 1).slice(0, eT),
    ...shuffleArray(byDiff.medium, seed + 2).slice(0, mT),
    ...shuffleArray(byDiff.hard,   seed + 3).slice(0, hT),
  ];
  if (selected.length < target) {
    const rem = all.filter(q => !selected.includes(q));
    selected.push(...shuffleArray(rem, seed + 4).slice(0, target - selected.length));
  }
  return selected.slice(0, target);
}

function shuffleOptions(q) {
  if (q.type === 'coding' || !q.option_a) return q;
  const opts = ['A', 'B', 'C', 'D']
    .map(k => ({ key: k, text: q[`option_${k.toLowerCase()}`] }))
    .filter(o => o.text);
  if (opts.length < 2) return q;
  const correctText = opts.find(o => o.key === q.correct_ans)?.text;
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return {
    ...q,
    option_a: opts[0]?.text || null,
    option_b: opts[1]?.text || null,
    option_c: opts[2]?.text || null,
    option_d: opts[3]?.text || null,
    correct_ans: correctText
      ? (opts.find(o => o.text === correctText)?.key || q.correct_ans)
      : q.correct_ans,
  };
}

function adaptiveSort(qs) {
  const O = { easy: 0, medium: 1, hard: 2 };
  return [...qs].sort(
    (a, b) =>
      (O[(a.difficulty || 'medium').toLowerCase()] ?? 1) -
      (O[(b.difficulty || 'medium').toLowerCase()] ?? 1)
  );
}

async function fetchQuestionsForExam(examId, type, assignmentId, userId) {
  const [examRows] = await db.query(
    `SELECT section_config FROM exams WHERE id = ?`,
    [examId]
  );
  if (!examRows.length) return { error: `Exam ${examId} not found`, status: 404 };

  const sectionConfig = (() => {
    try {
      const r = examRows[0].section_config;
      return r ? (typeof r === 'string' ? JSON.parse(r) : r) : {};
    } catch { return {}; }
  })();
  const configuredCount =
    parseInt(sectionConfig?.[type]?.questions || sectionConfig?.[type]?.count || 0) || 0;

  const [pool] = await db.query(
    `SELECT id, type, question_text, option_a, option_b, option_c, option_d,
            correct_ans, explanation, difficulty, marks, order_index
     FROM exam_questions WHERE exam_id = ? AND type = ?
     ORDER BY order_index ASC, id ASC`,
    [examId, type]
  );

  if (!pool.length) {
    return { questions: [], total: 0, message: `No ${type} questions for this exam.` };
  }

  let assigned = [], isNew = false;

  if (assignmentId) {
    const [rows] = await db.query(
      `SELECT question_ids FROM student_exam_questions
       WHERE assignment_id = ? AND question_type = ?`,
      [assignmentId, type]
    );
    if (rows.length && rows[0].question_ids) {
      const ids = (
        typeof rows[0].question_ids === 'string'
          ? JSON.parse(rows[0].question_ids)
          : rows[0].question_ids
      ).map(id => parseInt(id, 10));
      assigned = pool.filter(q => ids.includes(q.id));
      if (!assigned.length) isNew = true;
    } else {
      isNew = true;
    }

    if (isNew) {
      const target = configuredCount > 0 ? configuredCount : pool.length;
      assigned = selectQuestionsIntelligently(pool, target, userId || assignmentId, examId);
      try {
        await db.query(
          `INSERT INTO student_exam_questions
             (assignment_id, question_type, question_ids, created_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             question_ids = VALUES(question_ids), created_at = NOW()`,
          [assignmentId, type, JSON.stringify(assigned.map(q => q.id))]
        );
      } catch (e) {
        console.warn('[Questions] assignment store failed:', e.message);
      }
    }
  } else {
    const target = configuredCount > 0 ? configuredCount : pool.length;
    assigned = pool.slice(0, target);
  }

  const result = shuffleArray(adaptiveSort(assigned)).map(q => shuffleOptions(q));
  return { questions: result, total: result.length, poolSize: pool.length, isNew, configuredCount };
}

// GET /api/questions/exam/:examId
router.get('/exam/:examId', authenticateToken, async (req, res) => {
  const type  = (req.query.type || 'mcq').toLowerCase();
  const numId = parseInt(req.params.examId, 10);
  if (!['mcq', 'sql', 'coding'].includes(type))
    return res.status(400).json({ error: 'Invalid type' });
  if (isNaN(numId)) return res.status(400).json({ error: 'examId must be a number' });
  try {
    const r = await fetchQuestionsForExam(
      numId, type, req.query.assignment_id || null, req.user?.id
    );
    if (r.error) return res.status(r.status || 500).json({ error: r.error });
    return res.json(r);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/questions/:examId/:type
router.get('/:examId/:type', authenticateToken, async (req, res) => {
  const { examId, type } = req.params;
  if (!['mcq', 'sql', 'coding'].includes(type))
    return res.status(400).json({ error: 'Invalid type' });
  const numId = parseInt(examId, 10);
  if (isNaN(numId)) return res.status(400).json({ error: 'examId must be a number' });
  try {
    const r = await fetchQuestionsForExam(
      numId, type, req.query.assignment_id || null, req.user?.id
    );
    if (r.error) return res.status(r.status || 500).json({ error: r.error });
    return res.json(r);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/questions/answer
router.post('/answer', authenticateToken, async (req, res) => {
  const { assignment_id, question_id, selected_ans } = req.body;
  if (!assignment_id || !question_id)
    return res.status(400).json({ error: 'assignment_id and question_id required' });
  const realId = /^\d+$/.test(String(question_id)) ? parseInt(question_id, 10) : null;
  if (!realId) return res.json({ success: true, skipped: true });
  try {
    await db.query(
      `INSERT INTO exam_answers (assignment_id, question_id, selected_ans, answered_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE selected_ans = VALUES(selected_ans), answered_at = NOW()`,
      [assignment_id, realId, selected_ans]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[SaveAnswer]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/questions/submit
// Scores MCQ (1 mark each) and SQL (2 marks each) from correct_ans in DB,
// stores score + answers in exam_assignments so Reports page can read them
router.post('/submit', authenticateToken, async (req, res) => {
  const {
    assignment_id, exam_id, answers, violations, violation_count, round,
  } = req.body;

  if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' });

  try {
    let score = null;
    let breakdown = [];

    if (answers && exam_id && ['mcq', 'sql'].includes(round)) {
      const marksMap = { mcq: 1, sql: 2 };
      const markPer  = marksMap[round];

      const [qs] = await db.query(
        `SELECT id, correct_ans, marks FROM exam_questions
         WHERE exam_id = ? AND type = ?`,
        [exam_id, round]
      );

      score = 0;
      for (const q of qs) {
        const studentAns = (answers[String(q.id)] || '').trim().toUpperCase();
        const correctAns = (q.correct_ans || '').trim().toUpperCase();
        const pts        = studentAns && studentAns === correctAns
          ? (q.marks || markPer)
          : 0;
        score += pts;
        breakdown.push({
          questionId:    q.id,
          studentAnswer: studentAns,
          correctAnswer: correctAns,
          isCorrect:     pts > 0,
          marks:         pts,
        });
      }
    }

    const answersPayload = JSON.stringify({
      answers,
      score,
      round,
      breakdown,
    });

    const fields = [`status = 'submitted'`, `submitted_at = NOW()`];
    const params = [];

    if (score !== null)         { fields.push('score = ?');            params.push(score); }
    fields.push('answers = ?'); params.push(answersPayload);
    if (violations)             { fields.push('violations = ?');       params.push(JSON.stringify(violations)); }
    if (violation_count != null){ fields.push('violation_count = ?');  params.push(violation_count); }
    params.push(assignment_id);

    await db.query(
      `UPDATE exam_assignments SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, score, breakdown });
  } catch (e) {
    console.error('[Submit]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/questions/:id/starter
function defaultStarter(lang) {
  const d = {
    python:     'def solution():\n    pass\n',
    java:       'public class Solution {\n    public static void main(String[] args) {}\n}\n',
    cpp:        '#include<bits/stdc++.h>\nusing namespace std;\nint main(){return 0;}\n',
    javascript: 'function solution(input){}\n',
  };
  return d[lang] || `// ${lang} solution\n`;
}

router.get('/:id/starter', authenticateToken, async (req, res) => {
  const qId  = parseInt(req.params.id, 10);
  const lang = (req.query.lang || 'python').toLowerCase();
  if (isNaN(qId)) return res.status(400).json({ error: 'Invalid id' });
  if (!['python', 'java', 'cpp', 'javascript'].includes(lang))
    return res.status(400).json({ error: 'Unsupported lang' });
  try {
    for (const table of ['exam_questions', 'question_bank']) {
      const [rows] = await db.query(
        `SELECT explanation, starter_code, starter_python, starter_java, starter_cpp, starter_javascript
         FROM ${table} WHERE id = ? LIMIT 1`,
        [qId]
      ).catch(() => [[]]);
      const row = rows?.[0];
      if (!row) continue;
      try {
        const meta =
          typeof row.explanation === 'string'
            ? JSON.parse(row.explanation)
            : row.explanation;
        if (meta?.starterCode?.[lang])
          return res.json({ starter_code: meta.starterCode[lang], language: lang });
      } catch {}
      if (row[`starter_${lang}`])
        return res.json({ starter_code: row[`starter_${lang}`], language: lang });
      if (lang === 'python' && row.starter_code)
        return res.json({ starter_code: row.starter_code, language: lang });
    }
    return res.json({ starter_code: defaultStarter(lang), language: lang });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;