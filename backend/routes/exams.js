// routes/exams.js
// Reads questions from `question_bank` table (written by questionBank.js import)
// Assigns students matching candidates.college + candidates.batch

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

let sendExamInviteEmail = async () => {};
try { ({ sendExamInviteEmail } = require('./emailService')); } catch {}

const safeJSON = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

function genKey() {
  return uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function resolveStudentId(jwtUser) {
  try {
    const [r] = await db.query(`SELECT id FROM candidates WHERE id = ? LIMIT 1`, [jwtUser.id]);
    if (r.length) return r[0].id;
  } catch {}
  if (jwtUser.email) {
    try {
      const [r] = await db.query(`SELECT id FROM candidates WHERE email = ? LIMIT 1`, [jwtUser.email]);
      if (r.length) return r[0].id;
    } catch {}
  }
  return jwtUser.id;
}

// ── Fetch questions from `question_bank` table ────────────────────────────────
async function fetchFromBank(conn, { types, count = 20, difficulty }) {
  const normalisedTypes = (Array.isArray(types) ? types : [types]).map(t => t.toLowerCase());
  const placeholders    = normalisedTypes.map(() => '?').join(',');

  let sql = `
    SELECT id, qb_id, topic, type, question_text,
           option_a, option_b, option_c, option_d,
           correct_ans, explanation, difficulty, language_tag, topic_tag
    FROM question_bank
    WHERE is_active = 1
      AND type IN (${placeholders})
  `;
  const params = [...normalisedTypes];

  if (difficulty && difficulty !== 'Mixed') {
    sql += ' AND difficulty = ?';
    params.push(difficulty.toLowerCase());
  }

  sql += ' ORDER BY RAND() LIMIT ?';
  params.push(parseInt(count));

  const [rows] = await conn.query(sql, params);
  console.log(`[BankFetch] types=${normalisedTypes} difficulty=${difficulty||'any'} → ${rows.length} rows`);
  return rows;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/exams/create
// ══════════════════════════════════════════════════════════════════════════════
router.post('/exams/create',
  authenticateToken, requireRole('admin', 'recruiter'),
  async (req, res) => {
    const {
      title, college, batch_year,
      start_date, end_date, duration_minutes,
      total_marks, pass_mark, description,
      allowed_languages, sections, section_config,
      cutoff_score, question_ids, difficulty,
    } = req.body;

    if (!title || !college || !batch_year) {
      return res.status(400).json({ error: 'title, college, batch_year required' });
    }

    const sectionsObj      = safeJSON(sections,       { mcq: true, coding: true });
    const sectionConfigObj = safeJSON(section_config, {});
    const allowedLangs     = safeJSON(allowed_languages, []);
    const examKey          = genKey();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO exams
           (exam_type, exam_key, title, college, batch_year,
            start_date, end_date, duration_minutes, description,
            allowed_languages, total_marks, pass_mark, cutoff_score,
            sections, section_config, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())`,
        [
          'placement', examKey, title, college, batch_year,
          start_date ? new Date(start_date) : null,
          end_date   ? new Date(end_date)   : null,
          parseInt(duration_minutes) || 60,
          description || '',
          JSON.stringify(allowedLangs),
          parseInt(total_marks) || 100,
          parseInt(pass_mark)   || 40,
          cutoff_score ? parseInt(cutoff_score) : null,
          JSON.stringify(sectionsObj),
          JSON.stringify(sectionConfigObj),
          req.user.id,
        ]
      );
      const examId = result.insertId;
      let totalSaved = 0;

      if (question_ids && Array.isArray(question_ids) && question_ids.length > 0) {
        // Admin hand-picked specific question_bank ids
        const ph = question_ids.map(() => '?').join(',');
        const [picked] = await conn.query(
          `SELECT * FROM question_bank WHERE id IN (${ph}) AND is_active = 1`,
          question_ids
        );
        if (picked.length > 0) {
          await conn.query(
            `INSERT INTO exam_questions
               (exam_id, qb_id, type, question_text,
                option_a, option_b, option_c, option_d,
                correct_ans, explanation, difficulty, marks, order_index)
             VALUES ?`,
            [picked.map((q, i) => [
              examId, q.id, q.type, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d,
              q.correct_ans, q.explanation, q.difficulty || 'medium', 1, i,
            ])]
          );
          totalSaved = picked.length;
        }
      } else {
        // Auto-fetch by section from question_bank
        for (const [sectionKey, isEnabled] of Object.entries(sectionsObj)) {
          if (!isEnabled) continue;
          const wantCount = parseInt(sectionConfigObj[sectionKey]?.questions || 20);
          const bankRows  = await fetchFromBank(conn, {
            types:      [sectionKey],
            count:      wantCount,
            difficulty: difficulty || null,
          });

          if (bankRows.length === 0) {
            console.warn(`[CreateExam] No questions in question_bank for section "${sectionKey}"`);
            continue;
          }

          await conn.query(
            `INSERT INTO exam_questions
               (exam_id, qb_id, type, question_text,
                option_a, option_b, option_c, option_d,
                correct_ans, explanation, difficulty, marks, order_index)
             VALUES ?`,
            [bankRows.map((q, i) => [
              examId, q.id, q.type, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d,
              q.correct_ans, q.explanation, q.difficulty || 'medium', 1, i,
            ])]
          );
          totalSaved += bankRows.length;
        }
      }

      await conn.commit();
      return res.status(201).json({
        success: true, exam_id: examId, exam_key: examKey,
        status: 'draft', questions_saved: totalSaved,
        message: `Exam created as draft with ${totalSaved} questions.`,
      });

    } catch (err) {
      await conn.rollback();
      console.error('[CreateExam]', err);
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ── POST /api/exams/:id/submit-approval ──────────────────────────────────────
router.post('/exams/:id/submit-approval',
  authenticateToken, requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const { start_date, end_date, duration_minutes } = req.body;
      const updates = { status: 'pending_approval' };
      if (start_date)       updates.start_date       = new Date(start_date);
      if (end_date)         updates.end_date         = new Date(end_date);
      if (duration_minutes) updates.duration_minutes = parseInt(duration_minutes);
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      await db.query(
        `UPDATE exams SET ${setClauses} WHERE id = ?`,
        [...Object.values(updates), req.params.id]
      );
      return res.json({ success: true, status: 'pending_approval' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/exams/:id/approve ───────────────────────────────────────────────
// Assigns students by matching candidates.college + candidates.batch
// Falls back to ALL candidates if no match (useful during development/testing)
router.post('/exams/:id/approve',
  authenticateToken, requireRole('admin'),
  async (req, res) => {
    const { start_date, end_date, duration_minutes } = req.body;
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date required' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE exams
         SET status='approved', approved_by=?, approved_at=NOW(),
             start_date=?, end_date=?,
             duration_minutes=COALESCE(?, duration_minutes)
         WHERE id=?`,
        [req.user.id, new Date(start_date), new Date(end_date),
         duration_minutes ? parseInt(duration_minutes) : null, req.params.id]
      );

      const [[exam]] = await conn.query(`SELECT * FROM exams WHERE id = ?`, [req.params.id]);
      if (!exam) {
        await conn.rollback();
        return res.status(404).json({ error: 'Exam not found' });
      }

      // ── Match students: candidates.college + candidates.batch ─────────────
      // NOTE: candidates table uses `batch` (not batch_year) per auth.js student login
      let [students] = await conn.query(
        `SELECT id, name, email FROM candidates
         WHERE college = ? AND batch = ?`,
        [exam.college, exam.batch_year]
      );

      // Fallback: if no college+batch match, assign ALL candidates
      // (covers dev/test scenarios and QuizForge exams with generic college names)
      if (students.length === 0) {
        console.warn(
          `[Approve] No candidates match college="${exam.college}" batch="${exam.batch_year}".` +
          ` Falling back to all candidates.`
        );
        [students] = await conn.query(
          `SELECT id, name, email FROM candidates LIMIT 500`
        );
      }

      console.log(`[Approve] Assigning exam ${exam.id} to ${students.length} student(s)`);

      const emailQueue = [];
      for (const student of students) {
        const [existing] = await conn.query(
          `SELECT id FROM exam_assignments WHERE exam_id=? AND student_id=?`,
          [exam.id, student.id]
        );
        if (existing.length > 0) continue;

        const studentKey = genKey();
        await conn.query(
          `INSERT INTO exam_assignments
             (exam_id, student_id, exam_key, status, assigned_at)
           VALUES (?, ?, ?, 'assigned', NOW())`,
          [exam.id, student.id, studentKey]
        );
        emailQueue.push({ student, examKey: studentKey });
      }

      await conn.commit();

      // Fire-and-forget emails
      Promise.allSettled(
        emailQueue.map(({ student, examKey }) =>
          sendExamInviteEmail(student.email, student.name, exam.title, examKey, exam.duration_minutes)
            .catch(e => console.error('[Email]', e.message))
        )
      );

      return res.json({
        success: true, status: 'approved',
        students_assigned: emailQueue.length,
        message: `Exam approved. ${emailQueue.length} student(s) assigned.`,
      });

    } catch (err) {
      await conn.rollback();
      console.error('[Approve]', err);
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ── POST /api/exams/:id/reject ────────────────────────────────────────────────
router.post('/exams/:id/reject', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query(`UPDATE exams SET status='draft' WHERE id=?`, [req.params.id]);
    return res.json({ success: true, status: 'draft' });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── GET /api/exams ────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { status, college } = req.query;
    let sql = `
      SELECT e.*,
             COUNT(DISTINCT eq.id) AS question_count,
             COUNT(DISTINCT ea.id) AS student_count
      FROM exams e
      LEFT JOIN exam_questions   eq ON eq.exam_id = e.id
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (status)  { sql += ' AND e.status = ?';  params.push(status);  }
    if (college) { sql += ' AND e.college = ?'; params.push(college); }
    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';

    const [rows] = await db.query(sql, params);
    return res.json({
      exams: rows.map(e => ({
        ...e,
        sections:          safeJSON(e.sections, {}),
        section_config:    safeJSON(e.section_config, {}),
        allowed_languages: safeJSON(e.allowed_languages, []),
      })),
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── GET /api/exams/:id ────────────────────────────────────────────────────────
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [[exam]] = await db.query(
      `SELECT e.*, COUNT(DISTINCT eq.id) AS question_count, COUNT(DISTINCT ea.id) AS student_count
       FROM exams e
       LEFT JOIN exam_questions   eq ON eq.exam_id = e.id
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
       WHERE e.id = ? GROUP BY e.id`,
      [req.params.id]
    );
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const [questions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [req.params.id]
    );

    return res.json({
      exam: { ...exam, sections: safeJSON(exam.sections, {}), section_config: safeJSON(exam.section_config, {}), allowed_languages: safeJSON(exam.allowed_languages, []) },
      questions,
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ── POST /api/exams/validate-key ─────────────────────────────────────────────
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key required' });

  try {
    const studentId = await resolveStudentId(req.user);
    const [rows] = await db.query(
      `SELECT ea.id AS assignment_id, ea.status AS assignment_status,
              e.id AS exam_id, e.title, e.duration_minutes, e.sections,
              e.total_marks, e.cutoff_score, e.status AS exam_status,
              e.start_date, e.end_date
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.exam_key = ? AND ea.student_id = ?`,
      [exam_key.trim(), studentId]
    );

    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const row = rows[0];

    if (row.assignment_status === 'submitted') {
      return res.status(400).json({ valid: false, error: 'You have already submitted this exam' });
    }
    const now = new Date();
    if (row.start_date && now < new Date(row.start_date)) {
      return res.status(403).json({ valid: false, error: 'Exam has not started yet', start_date: row.start_date });
    }
    if (row.end_date && now > new Date(row.end_date)) {
      return res.status(403).json({ valid: false, error: 'Exam window has closed' });
    }

    const [questions] = await db.query(
      `SELECT id, type, question_text, option_a, option_b, option_c, option_d, difficulty, marks
       FROM exam_questions WHERE exam_id = ? ORDER BY order_index`,
      [row.exam_id]
    );

    await db.query(
      `UPDATE exam_assignments SET status='started', started_at=NOW() WHERE id=?`,
      [row.assignment_id]
    );

    return res.json({
      valid: true, exam_id: row.exam_id, assignment_id: row.assignment_id,
      title: row.title, duration: row.duration_minutes, total_marks: row.total_marks,
      cutoff_score: row.cutoff_score, sections: safeJSON(row.sections, {}),
      questions: shuffle(questions),
    });
  } catch (err) {
    console.error('[ValidateKey]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exams/:examId/submit ────────────────────────────────────────────
router.post('/exams/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);
    const { answers } = req.body;

    const [[assignment]] = await db.query(
      `SELECT ea.id, ea.status FROM exam_assignments ea
       WHERE ea.exam_id = ? AND ea.student_id = ?`,
      [req.params.examId, studentId]
    );
    if (!assignment)                       return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.status === 'submitted') return res.status(400).json({ error: 'Already submitted' });

    const [questions] = await db.query(
      `SELECT id, correct_ans, marks FROM exam_questions WHERE exam_id = ?`,
      [req.params.examId]
    );

    let score = 0;
    for (const q of questions) {
      if (answers?.[q.id] && answers[q.id].toUpperCase() === (q.correct_ans || '').toUpperCase()) {
        score += q.marks || 1;
      }
    }

    await db.query(
      `UPDATE exam_assignments SET status='submitted', submitted_at=NOW(), score=?, answers=? WHERE id=?`,
      [score, JSON.stringify(answers || {}), assignment.id]
    );

    const [[exam]] = await db.query(`SELECT total_marks FROM exams WHERE id=?`, [req.params.examId]);
    return res.json({
      success: true, score, total_marks: exam?.total_marks || 100,
      percentage: exam?.total_marks ? Math.round((score / exam.total_marks) * 100) : 0,
      message: 'Exam submitted successfully',
    });
  } catch (err) {
    console.error('[Submit]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/student/exams ────────────────────────────────────────────────────
router.get('/student/exams', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user);

    const [rows] = await db.query(
      `SELECT e.id, e.title, e.exam_type, e.college, e.batch_year,
              e.start_date, e.end_date, e.duration_minutes,
              e.total_marks, e.cutoff_score, e.sections, e.status AS exam_status,
              ea.id AS assignment_id, ea.exam_key,
              ea.status AS assignment_status,
              ea.score, ea.submitted_at,
              COUNT(eq.id) AS question_count
       FROM exam_assignments ea
       JOIN exams e              ON e.id  = ea.exam_id
       LEFT JOIN exam_questions eq ON eq.exam_id = e.id
       WHERE ea.student_id = ?
         AND e.status IN ('approved', 'live', 'completed')
       GROUP BY e.id, ea.id
       ORDER BY e.start_date DESC`,
      [studentId]
    );

    return res.json({
      exams: rows.map(r => ({
        ...r,
        sections:     safeJSON(r.sections, {}),
        company_name: r.college,
      })),
    });
  } catch (err) {
    console.error('[StudentExams]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/exams/:id/students ───────────────────────────────────────────────
router.get('/exams/:id/students', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id AS student_id, c.name, c.email,
              ea.exam_key, ea.status, ea.score, ea.assigned_at, ea.submitted_at
       FROM exam_assignments ea
       JOIN candidates c ON c.id = ea.student_id
       WHERE ea.exam_id = ? ORDER BY c.name`,
      [req.params.id]
    );
    return res.json({ students: rows });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
