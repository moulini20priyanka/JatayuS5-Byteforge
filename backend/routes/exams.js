// routes/exams.js
// POST /api/exams/create  — Admin creates an exam (all 3 types)
// GET  /api/exams          — List all exams
// GET  /api/exams/:id      — Get single exam

const express = require('express');
const router  = express.Router();
const db      = require('../db');           // your mysql2 pool/connection
const { authenticateToken, requireRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');   // npm install nodemailer

// ─── Email transport (configure via .env) ────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendExamKeyEmail({ to, studentName, examTitle, examKey, startDate, endDate, college }) {
  const subject = `📋 Your Exam Access Key — ${examTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
      <h2 style="color:#185FA5;margin-bottom:4px;">NeuroAssess</h2>
      <p style="color:#6b7280;font-size:13px;">Exam Notification</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
      <p>Hi <strong>${studentName || 'Student'}</strong>,</p>
      <p>You have been assigned to take the following exam:</p>
      <div style="background:#E6F1FB;border:1px solid #B5D4F4;border-radius:8px;padding:16px;margin:16px 0;">
        <div style="font-size:18px;font-weight:700;color:#185FA5;margin-bottom:4px;">${examTitle}</div>
        <div style="font-size:13px;color:#374151;">
          📅 ${new Date(startDate).toLocaleString()} — ${new Date(endDate).toLocaleString()}<br/>
          🏫 ${college}
        </div>
      </div>
      <p>Your exam access key is:</p>
      <div style="text-align:center;margin:20px 0;">
        <span style="font-family:monospace;font-size:28px;font-weight:700;letter-spacing:3px;color:#185FA5;background:#E6F1FB;padding:10px 24px;border-radius:8px;display:inline-block;">
          ${examKey}
        </span>
      </div>
      <p style="font-size:13px;color:#6b7280;">
        Use this key when prompted in <strong>Step 4</strong> of the exam flow. Keep it safe — do not share it.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
      <p style="font-size:12px;color:#9ca3af;">NeuroAssess · Automated Notification · Do not reply</p>
    </div>
  `;
  await transporter.sendMail({
    from:    `"NeuroAssess" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// ─── CREATE EXAM ─────────────────────────────────────────────────────────────
router.post('/exams/create', authenticateToken, requireRole('admin'), async (req, res) => {
  const {
    exam_type,
    exam_key,
    title,
    college,
    batch_year,
    start_date,
    end_date,
    duration_minutes,
    description,
    allowed_languages,
    total_marks,
    pass_mark,
    sections,          // { mcq, sql, coding, viva }
    exam_request_id,   // null for university/skill_cert
  } = req.body;

  // ── Validate required fields ────────────────────────────────────────────────
  if (!exam_type || !exam_key || !title || !college || !batch_year || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['placement', 'university', 'skill_cert'].includes(exam_type)) {
    return res.status(400).json({ error: 'Invalid exam_type' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Check exam_key uniqueness ────────────────────────────────────────
    const [existing] = await conn.query('SELECT id FROM exams WHERE exam_key = ?', [exam_key]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Exam key already exists. Please regenerate.' });
    }

    // ── 2. If placement, validate and link exam request ─────────────────────
    if (exam_type === 'placement') {
      if (!exam_request_id) {
        await conn.rollback();
        return res.status(400).json({ error: 'exam_request_id is required for placement exams' });
      }
      const [reqRows] = await conn.query(
        'SELECT id, status FROM exam_requests WHERE id = ?',
        [exam_request_id]
      );
      if (!reqRows.length) {
        await conn.rollback();
        return res.status(404).json({ error: 'Exam request not found' });
      }
      if (reqRows[0].status !== 'approved') {
        await conn.rollback();
        return res.status(400).json({ error: 'Exam request is not approved' });
      }
    }

    // ── 3. Insert exam ──────────────────────────────────────────────────────
    const [result] = await conn.query(
      `INSERT INTO exams
         (exam_type, exam_key, title, college, batch_year, start_date, end_date,
          duration_minutes, description, allowed_languages, total_marks, pass_mark,
          sections, exam_request_id, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        exam_type,
        exam_key,
        title,
        college,
        batch_year,
        new Date(start_date),
        new Date(end_date),
        duration_minutes || 60,
        description || '',
        JSON.stringify(allowed_languages || []),
        total_marks  || 100,
        pass_mark    || 40,
        JSON.stringify(sections || {}),
        exam_request_id || null,
        req.user.id,
      ]
    );
    const examId = result.insertId;

    // ── 4. If placement, mark request as exam_created ───────────────────────
    if (exam_type === 'placement' && exam_request_id) {
      await conn.query(
        "UPDATE exam_requests SET status = 'exam_created', exam_id = ? WHERE id = ?",
        [examId, exam_request_id]
      );
    }

    // ── 5. Fetch assigned students and send emails ──────────────────────────
    const [students] = await conn.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN candidates c ON c.user_id = u.id
       WHERE c.college = ? AND c.batch_year = ? AND u.role = 'student'`,
      [college, batch_year]
    );

    // ── 6. Insert exam_assignments for each student ─────────────────────────
    if (students.length > 0) {
      const assignValues = students.map(s => [examId, s.id, 'assigned', new Date()]);
      await conn.query(
        'INSERT INTO exam_assignments (exam_id, student_id, status, assigned_at) VALUES ?',
        [assignValues]
      );
    }

    await conn.commit();

    // ── 7. Send emails (async, don't block response) ────────────────────────
    if (students.length > 0 && process.env.SMTP_USER) {
      const emailJobs = students.map(s =>
        sendExamKeyEmail({
          to:          s.email,
          studentName: s.name,
          examTitle:   title,
          examKey,
          startDate:   start_date,
          endDate:     end_date,
          college,
        }).catch(err => console.error(`[Email] Failed for ${s.email}:`, err.message))
      );
      Promise.allSettled(emailJobs).then(results => {
        const ok   = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.filter(r => r.status === 'rejected').length;
        console.log(`[Exam ${examId}] Emails: ${ok} sent, ${fail} failed`);
      });
    }

    res.status(201).json({
      success:        true,
      exam_id:        examId,
      exam_key:       examKey,
      students_count: students.length,
      message: `Exam created. Key emailed to ${students.length} students.`,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[CreateExam]', err);
    res.status(500).json({ error: 'Server error while creating exam', detail: err.message });
  } finally {
    conn.release();
  }
});

// ─── LIST EXAMS ──────────────────────────────────────────────────────────────
router.get('/exams', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { college, exam_type, status } = req.query;
    let sql    = 'SELECT * FROM exams WHERE 1=1';
    const params = [];
    if (college)   { sql += ' AND college = ?';   params.push(college); }
    if (exam_type) { sql += ' AND exam_type = ?';  params.push(exam_type); }
    if (status)    { sql += ' AND status = ?';     params.push(status); }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    const exams  = rows.map(e => ({
      ...e,
      sections:          JSON.parse(e.sections          || '{}'),
      allowed_languages: JSON.parse(e.allowed_languages || '[]'),
    }));
    res.json({ exams });
  } catch (err) {
    console.error('[ListExams]', err);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// ─── GET SINGLE EXAM ─────────────────────────────────────────────────────────
router.get('/exams/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = {
      ...rows[0],
      sections:          JSON.parse(rows[0].sections          || '{}'),
      allowed_languages: JSON.parse(rows[0].allowed_languages || '[]'),
    };
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// ─── VALIDATE EXAM KEY (student uses this in Step 4) ─────────────────────────
router.post('/exams/validate-key', authenticateToken, async (req, res) => {
  const { exam_key } = req.body;
  if (!exam_key) return res.status(400).json({ error: 'exam_key is required' });
  try {
    const [rows] = await db.query(
      `SELECT e.*, ea.status as assignment_status
       FROM exams e
       LEFT JOIN exam_assignments ea ON ea.exam_id = e.id AND ea.student_id = ?
       WHERE e.exam_key = ?`,
      [req.user.id, exam_key.trim().toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Invalid exam key' });
    const exam = rows[0];
    if (exam.status === 'completed') return res.status(400).json({ valid: false, error: 'This exam has already ended' });
    if (exam.assignment_status !== 'assigned') {
      return res.status(403).json({ valid: false, error: 'You are not assigned to this exam' });
    }
    res.json({
      valid:    true,
      exam_id:  exam.id,
      title:    exam.title,
      duration: exam.duration_minutes,
      sections: JSON.parse(exam.sections || '{}'),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate key' });
  }
});

module.exports = router;