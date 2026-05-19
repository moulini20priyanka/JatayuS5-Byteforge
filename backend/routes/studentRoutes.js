const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

function safeJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function formatDeadline(date) {
  const d   = new Date(date);
  const now = new Date();
  const hrs = (d - now) / 36e5;
  if (hrs < 0)  return 'Ended';
  if (hrs < 1)  return `In ${Math.round(hrs * 60)} min`;
  if (hrs < 24) return `Today, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  if (hrs < 48) return `Tomorrow, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatRelative(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date);
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ── resolveStudentId ──────────────────────────────────────────────────────────
// ROOT CAUSE FIX: JWT stores numeric id=1 which matches the admin row, NOT
// the candidate. candidates.id is a string like 's_022'.
// Email lookup is the ONLY reliable method — always try it first.
async function resolveStudentId(req) {
  const tokenId = req.user?.id;
  const email   = req.user?.email;

  // 1. EMAIL FIRST — token id=1 is admin, not student
  if (email) {
    try {
      const [rows] = await db.query(
        `SELECT TOP 1 id FROM candidates WHERE email = ?`, [email]
      );
      if (rows.length) {
        console.log(`[resolveStudentId] ✅ by email (${email}): ${rows[0].id}`);
        return rows[0].id;
      }
    } catch (e) {
      console.warn('[resolveStudentId] email lookup failed:', e.message);
    }
  }

  // 2. Try token id as string ('s_022')
  if (tokenId) {
    try {
      const [rows] = await db.query(
        `SELECT TOP 1 id FROM candidates WHERE id = ?`, [String(tokenId)]
      );
      if (rows.length) {
        console.log(`[resolveStudentId] ✅ by string id: ${rows[0].id}`);
        return rows[0].id;
      }
    } catch (e) {
      console.warn('[resolveStudentId] string id lookup failed:', e.message);
    }
  }

  console.warn(`[resolveStudentId] ⚠️ fallback raw tokenId: ${tokenId} — dashboard will be empty`);
  return tokenId;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/exams
// ─────────────────────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req);
    const [rows] = await db.query(
      `SELECT
         e.id, e.title, e.exam_type, e.college, e.duration_minutes,
         e.start_date, e.end_date, e.total_marks, e.sections, e.allowed_languages,
         ea.exam_key, ea.status AS assignment_status, ea.score,
         ea.assigned_at, ea.submitted_at,
         er.company_name
       FROM exam_assignments ea
       JOIN exams e               ON e.id  = ea.exam_id
       LEFT JOIN exam_requests er ON er.id = e.exam_request_id
       WHERE ea.student_id = ?
         AND e.exam_type  != 'university'
       ORDER BY e.start_date ASC`,
      [studentId]
    );
    res.json({
      exams: rows.map(r => ({
        ...r,
        sections:          safeJson(r.sections,          {}),
        allowed_languages: safeJson(r.allowed_languages, []),
      })),
    });
  } catch (err) {
    console.error('[StudentExams] failed:', err.message);
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', authenticateToken, async (req, res) => {
  const now = new Date();
  try {
    const studentId = await resolveStudentId(req);
    console.log('[StudentDashboard] resolvedStudentId:', studentId);

    // 1. Hiring exam counts
    let counts = { active_exams: 0, completed_exams: 0, live_exams: 0 };
    try {
      const [[raw]] = await db.query(
        `SELECT
           COUNT(CASE WHEN ea.status != 'submitted' THEN 1 END) AS active_exams,
           COUNT(CASE WHEN ea.status  = 'submitted' THEN 1 END) AS completed_exams,
           COUNT(CASE WHEN ea.status != 'submitted'
                       AND e.start_date <= GETDATE()
                       AND e.end_date   >= GETDATE() THEN 1 END) AS live_exams
         FROM exam_assignments ea
         JOIN exams e ON e.id = ea.exam_id
         WHERE ea.student_id = ?
           AND e.exam_type != 'university'`,
        [studentId]
      );
      if (raw) counts = raw;
    } catch (e) { console.warn('[Dashboard] counts query failed:', e.message); }

    // 2. University exams
    let universityExamCount = 0;
    let universityLiveCount = 0;
    let universityLiveList  = [];
    try {
      const [[univCount]] = await db.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(CASE WHEN GETDATE() BETWEEN e.start_date AND e.end_date THEN 1 END) AS live_count
         FROM exam_assignments uea
         JOIN exams e ON e.id = uea.exam_id
         WHERE uea.student_id = ? AND e.exam_type = 'university'`,
        [studentId]
      );
      universityExamCount = univCount?.total      || 0;
      universityLiveCount = univCount?.live_count || 0;

      if (universityLiveCount > 0) {
        const [liveUniRows] = await db.query(
          `SELECT e.id, e.title, e.end_date, e.subject_name
           FROM exam_assignments uea
           JOIN exams e ON e.id = uea.exam_id
           WHERE uea.student_id = ?
             AND e.exam_type = 'university'
             AND GETDATE() BETWEEN e.start_date AND e.end_date
             AND uea.status != 'completed'
           ORDER BY e.end_date ASC`,
          [studentId]
        );
        universityLiveList = liveUniRows.map(r => ({
          id:       r.id,
          title:    r.title + (r.subject_name ? ` — ${r.subject_name}` : ''),
          college:  'University Exam',
          end_date: r.end_date,
          type:     'university',
        }));
      }
    } catch (e) { console.warn('[Dashboard] university query failed:', e.message); }

    // 3. Live hiring exams
    let liveRows = [];
    try {
      const [rows] = await db.query(
        `SELECT e.id, e.title, e.end_date, ea.exam_key,
                er.company_name, e.college
         FROM exam_assignments ea
         JOIN exams e               ON e.id  = ea.exam_id
         LEFT JOIN exam_requests er ON er.id = e.exam_request_id
         WHERE ea.student_id = ?
           AND ea.status    != 'submitted'
           AND e.exam_type  != 'university'
           AND e.start_date <= GETDATE()
           AND e.end_date   >= GETDATE()
         ORDER BY e.end_date ASC`,
        [studentId]
      );
      liveRows = rows;
    } catch (e) { console.warn('[Dashboard] live exams query failed:', e.message); }

    // 4. Upcoming deadlines
    let deadlines = [];
    try {
      const [deadlineRows] = await db.query(
        `SELECT TOP 10
           e.title, e.start_date, e.end_date, e.exam_type,
           er.company_name, e.college
         FROM exam_assignments ea
         JOIN exams e               ON e.id  = ea.exam_id
         LEFT JOIN exam_requests er ON er.id = e.exam_request_id
         WHERE ea.student_id = ?
           AND ea.status    != 'submitted'
           AND e.exam_type  != 'university'
           AND e.end_date   >= GETDATE()
         ORDER BY e.start_date ASC`,
        [studentId]
      );
      deadlines = deadlineRows.map(d => {
        const hoursAway = (new Date(d.start_date) - now) / 36e5;
        return {
          label:   d.title,
          sub:     `${d.company_name || d.college || 'Exam'} · ${d.exam_type}`,
          date:    formatDeadline(d.start_date),
          urgency: hoursAway <= 3 ? 'high' : hoursAway <= 24 ? 'medium' : 'low',
        };
      });
    } catch (e) { console.warn('[Dashboard] deadlines query failed:', e.message); }

    // 5. Recent activity
    let activity = [];
    try {
      const [activityRows] = await db.query(
        `SELECT TOP 10
           e.title, ea.status, ea.submitted_at, ea.assigned_at, ea.score,
           er.company_name, e.college
         FROM exam_assignments ea
         JOIN exams e               ON e.id  = ea.exam_id
         LEFT JOIN exam_requests er ON er.id = e.exam_request_id
         WHERE ea.student_id = ?
         ORDER BY ISNULL(ea.submitted_at, ea.assigned_at) DESC`,
        [studentId]
      );
      activity = activityRows.map(a => ({
        label: a.status === 'submitted'
          ? `${a.title} submitted${a.score != null ? ` · Score ${a.score}` : ''}`
          : `${a.title} assigned by ${a.company_name || a.college || 'Admin'}`,
        type:  a.status === 'submitted' ? 'completed' : 'assigned',
        color: a.status === 'submitted' ? '#0a8f5c' : '#2BB1A8',
        time:  formatRelative(a.submitted_at || a.assigned_at),
      }));
    } catch (e) { console.warn('[Dashboard] activity query failed:', e.message); }

    res.json({
      active_exams:          counts?.active_exams   || 0,
      live_exams:            counts?.live_exams      || 0,
      completed_exams:       counts?.completed_exams || 0,
      university_exams:      universityExamCount,
      university_live_exams: universityLiveCount,
      certifications:        0,
      live_exam_list:        liveRows,
      university_live_list:  universityLiveList,
      upcoming_deadlines:    deadlines,
      recent_activity:       activity,
    });

  } catch (err) {
    console.error('[StudentDashboard]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;