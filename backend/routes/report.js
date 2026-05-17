// routes/report.js
// Dynamic Reports API — Admin + Student
// FIXED: middleware path corrected from '../middlewares/auth' to '../middleware/auth'

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth'); // ← FIXED path

// ─── helpers ───────────────────────────────────────────────────────────────

const safeJSON = v => {
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return []; }
};

function keywordScore(answer = '', keywordsStr = '', maxMarks = 8) {
  if (!answer || !keywordsStr) return { score: 0, pct: 0, matched: [], missing: [] };
  const kws     = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const lower   = answer.toLowerCase();
  const matched = [], missing = [];
  for (const kw of kws) {
    const parts = kw.replace(/[()]/g, '').split(/[,\s/]+/).filter(w => w.length > 2);
    parts.some(p => lower.includes(p)) ? matched.push(kw) : missing.push(kw);
  }
  const pct   = kws.length ? Math.round((matched.length / kws.length) * 100) : 0;
  const score = kws.length ? Math.round((matched.length / kws.length) * maxMarks * 2) / 2 : 0;
  return { score, pct, matched, missing };
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/reports/admin/summary ─────────────────────────────────
router.get('/admin/summary', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*)                                              AS total_exams,
        SUM(status IN ('scheduled','active'))                AS active_exams,
        SUM(status = 'completed')                            AS completed_exams,
        SUM(exam_type = 'hiring')                            AS hiring_exams,
        SUM(exam_type = 'university')                        AS university_exams,
        SUM(exam_type = 'certification')                     AS cert_exams
      FROM exams
    `);

    const [students] = await db.query(`
      SELECT
        COUNT(DISTINCT student_id)   AS total_students,
        SUM(status = 'completed')    AS total_submissions
      FROM exam_assignments
    `);

    res.json({ ...rows[0], ...students[0] });
  } catch (err) {
    console.error('[report/summary]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/admin/exams ───────────────────────────────────
router.get('/admin/exams', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { type = 'all', search = '' } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (type !== 'all') { where += ' AND e.exam_type = ?'; params.push(type); }
    if (search) {
      where += ' AND (e.title LIKE ? OR e.subject_name LIKE ? OR e.college LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [exams] = await db.query(`
      SELECT
        e.id, e.title, e.exam_type, e.status, e.total_marks,
        e.subject_name, e.subject_code, e.semester, e.college, e.batch_year,
        e.created_at,
        COUNT(ea.id)                              AS assigned_count,
        SUM(ea.status = 'completed')              AS completed_count,
        SUM(ea.status = 'started')                AS in_progress_count,
        SUM(ea.status = 'assigned')               AS not_started_count,
        ROUND(AVG(CASE WHEN ea.status='completed' THEN ea.score END), 1) AS avg_score
      FROM exams e
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      ${where}
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `, params);

    res.json({ exams });
  } catch (err) {
    console.error('[report/admin/exams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/admin/exam/:examId/students ───────────────────
router.get('/admin/exam/:examId/students', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { examId } = req.params;
    const { search = '' } = req.query;

    const [[exam]] = await db.query('SELECT * FROM exams WHERE id = ?', [examId]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    let q = `
      SELECT
        ea.id              AS assignment_id,
        ea.student_id,
        ea.status,
        ea.score           AS total_score,
        ea.submitted_at,
        c.name             AS student_name,
        c.email            AS student_email
      FROM exam_assignments ea
      JOIN candidates c ON c.id = ea.student_id
      WHERE ea.exam_id = ?
    `;
    const params = [examId];
    if (search) {
      q += ' AND (c.name LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    q += ' ORDER BY ea.score DESC';

    const [students] = await db.query(q, params);

    const completed = students.filter(s => s.status === 'submitted' || s.status === 'completed');
    const scores    = completed.map(s => s.total_score).filter(v => v != null);
    const passMark  = exam.pass_mark || 40;

    const summary = {
      total:         students.length,
      completed:     completed.length,
      in_progress:   students.filter(s => s.status === 'started').length,
      not_started:   students.filter(s => s.status === 'assigned').length,
      pass_rate:     completed.length ? Math.round(completed.filter(s => (s.total_score||0) >= passMark).length / completed.length * 100) : 0,
      avg_score:     scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10 : 0,
      highest_score: scores.length ? Math.max(...scores) : null,
      lowest_score:  scores.length ? Math.min(...scores) : null,
      pass_mark:     passMark,
      total_marks:   exam.total_marks || 100,
    };

    res.json({ exam, students, summary });
  } catch (err) {
    console.error('[report/students]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/admin/student/:assignmentId ───────────────────
router.get('/admin/student/:assignmentId', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const [[assignment]] = await db.query(`
      SELECT ea.*, e.title AS exam_title, e.exam_type, e.total_marks,
             c.name AS student_name, c.email AS student_email
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN candidates c ON c.id = ea.student_id
      WHERE ea.id = ?
    `, [assignmentId]);

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Parse answers from the longtext column
    let answers = {};
    try {
      answers = typeof assignment.answers === 'string'
        ? JSON.parse(assignment.answers || '{}')
        : (assignment.answers || {});
    } catch {}

    const mcqBreakdown     = answers.mcq_breakdown     || [];
    const writtenBreakdown = answers.written_breakdown  || [];

    res.json({ assignment, mcqAnalytics: mcqBreakdown, writtenBreakdown });
  } catch (err) {
    console.error('[report/student-detail]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reports/admin/review-written ─────────────────────────
router.post('/admin/review-written', authenticateToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { assignmentId, questionId, facultyScore, facultyComment } = req.body;
    if (assignmentId == null || questionId == null || facultyScore == null)
      return res.status(400).json({ error: 'assignmentId, questionId, facultyScore required' });

    const [[row]] = await db.query(
      `SELECT id, score, answers FROM exam_assignments WHERE id = ?`,
      [assignmentId]
    );
    if (!row) return res.status(404).json({ error: 'Assignment not found' });

    let parsed = {};
    try { parsed = typeof row.answers === 'string' ? JSON.parse(row.answers) : (row.answers || {}); } catch {}

    const breakdown = parsed.written_breakdown || [];
    let newWrittenTotal = 0;

    const updated = breakdown.map(item => {
      if (String(item.questionId) === String(questionId)) {
        const finalScore = Math.min(parseFloat(facultyScore), item.maxScore || item.marks || 8);
        newWrittenTotal += finalScore;
        return { ...item, facultyScore: finalScore, facultyComment: facultyComment || '', finalScore, reviewedAt: new Date().toISOString() };
      }
      const use = item.facultyScore != null ? item.facultyScore : (item.autoScore || 0);
      newWrittenTotal += use;
      return item;
    });

    const newTotal = Math.round(((parsed.mcq_score || 0) + newWrittenTotal) * 100) / 100;

    await db.query(
      `UPDATE exam_assignments SET score=?, answers=? WHERE id=?`,
      [newTotal, JSON.stringify({ ...parsed, written_breakdown: updated, written_auto_score: Math.round(newWrittenTotal*100)/100 }), assignmentId]
    );

    res.json({ ok: true, written_score: newWrittenTotal, total_score: newTotal });
  } catch (err) {
    console.error('[report/review-written]', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// STUDENT ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── GET /api/reports/student/my-exams ──────────────────────────────
router.get('/student/my-exams', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    const [rows] = await db.query(`
      SELECT
        ea.id              AS assignment_id,
        ea.status,
        ea.submitted_at,
        e.id               AS exam_id,
        e.title,
        e.exam_type,
        e.total_marks,
        e.duration_minutes,
        e.start_date,
        e.subject_name,
        e.college
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      WHERE ea.student_id = ?
      ORDER BY ea.assigned_at DESC
    `, [studentId]);

    const now       = new Date();
    const active    = rows.filter(r => r.status === 'started' || (r.status === 'assigned' && r.start_date && new Date(r.start_date) <= now));
    const pending   = rows.filter(r => r.status === 'assigned' && (!r.start_date || new Date(r.start_date) > now));
    const completed = rows.filter(r => r.status === 'submitted' || r.status === 'completed');

    res.json({
      summary: { total: rows.length, active: active.length, completed: completed.length, pending: pending.length },
      active,
      pending,
      completed,
    });
  } catch (err) {
    console.error('[report/student/my-exams]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/student/exam/:assignmentId ─────────────────────
router.get('/student/exam/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const studentId    = req.user.id;
    const { assignmentId } = req.params;

    const [[assignment]] = await db.query(`
      SELECT ea.*, e.title, e.exam_type, e.total_marks, e.pass_mark,
             e.subject_name, e.college, e.duration_minutes, e.start_date
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      WHERE ea.id = ? AND ea.student_id = ?
    `, [assignmentId, studentId]);

    if (!assignment) return res.status(403).json({ error: 'Not found or access denied' });

    if (assignment.status !== 'submitted' && assignment.status !== 'completed') {
      return res.json({ assignment: { ...assignment, score: null } });
    }

    res.json({ assignment });
  } catch (err) {
    console.error('[report/student/exam-detail]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
