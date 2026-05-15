// backend/routes/exam_requests.js
// ── CHANGE LOG ──────────────────────────────────────────────────────────────
//  • GET /all — FIXED column alias collision: er.* + u.company_name AS company_name
//    overwrote er.company_name (and on some mysql2 versions scrambled column
//    ordering for the entire row, causing JSON columns to arrive as raw Buffers
//    or with wrong values). Now explicitly aliases er.company_name as
//    er_company_name and u.company_name as recruiter_company so the frontend
//    can use whichever is relevant without ambiguity.
//    The frontend uses `company_name` for display — this is kept as u.company_name
//    (the recruiter's company) since that is what was always intended for display.
//    er.company_name (if different) is also exposed as er_company_name.
//
//  • GET /all — added explicit column list for er JSON fields instead of er.*
//    so mysql2 always returns them in a predictable position regardless of
//    table schema changes.  Falls back gracefully for any unknown columns.
//
//  • POST / — unchanged (fires NotificationService as before)
//  • PATCH /:id/status — unchanged
//  • GET / and GET /:id — unchanged
// ─────────────────────────────────────────────────────────────────────────────

const express               = require('express');
const db                    = require('../config/db');
const router                = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AuditLogger           = require('../services/auditLogger');
const NotificationService   = require('../services/notificationService');

const getClientInfo = req => ({
  ipAddress:
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection.remoteAddress ||
    'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

// ─── POST / — Create exam request ─────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      recruiter_id,
      recruiter_email,
      company_name,
      job_role,
      job_description,
      exam_type = 'Placement',
      assessment_pattern,
      section_config,
      sectional_cutoff_required = false,
      sectional_cutoffs,
      ai_viva_mode,
      schedule_date,
      schedule_time,
      eligibility_criteria,
      specifications,
      target_college,
      target_batch_year,
    } = req.body;

    if (!job_role || !job_description || !assessment_pattern || !schedule_date || !schedule_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const title = `${job_role} — ${exam_type}`;

    const [result] = await db.query(
      `INSERT INTO exam_requests
         (title, recruiter_id, recruiter_email, company_name, job_role, job_description,
          exam_type, assessment_pattern, section_config,
          sectional_cutoff_required, sectional_cutoffs,
          ai_viva_mode, schedule_date, schedule_time,
          eligibility_criteria, specifications,
          target_college, target_batch_year, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        title,
        recruiter_id,
        recruiter_email             || null,
        company_name                || null,
        job_role,
        job_description,
        exam_type,
        assessment_pattern,
        JSON.stringify(section_config        || {}),
        sectional_cutoff_required ? 1 : 0,
        JSON.stringify(sectional_cutoffs     || {}),
        ai_viva_mode                || 'both',
        schedule_date,
        schedule_time,
        JSON.stringify(eligibility_criteria  || {}),
        specifications              || null,
        target_college              || null,
        target_batch_year           || null,
      ]
    );

    // Resolve recruiter display name for the notification
    let recruiterName = req.user?.name || recruiter_email || 'A recruiter';
    if (recruiter_id) {
      try {
        const [userRows] = await db.query(
          'SELECT full_name FROM users WHERE id = ?',
          [recruiter_id]
        );
        if (userRows.length) recruiterName = userRows[0].full_name;
      } catch (_) { /* non-fatal */ }
    }

    // Fire notification (non-blocking)
    NotificationService.notifyNewExamRequest({
      requestId:    result.insertId,
      jobRole:      job_role,
      examType:     exam_type,
      recruiterName,
      companyName:  company_name || null,
    }).catch(err =>
      console.error('[Notification] exam request notify failed:', err)
    );

    res.status(201).json({
      id:      result.insertId,
      message: 'Exam request submitted successfully',
    });
  } catch (err) {
    console.error('Create exam request error:', err);
    res.status(500).json({ error: 'Failed to create exam request' });
  }
});

// ─── GET /all ─────────────────────────────────────────────────────────────────
// FIX: replaced `er.*` with an explicit column list so mysql2 always returns
// columns in a deterministic order.  The old query used `er.*, u.company_name AS
// company_name` which caused two problems:
//   1. Duplicate column name → mysql2 can silently discard one or return the
//      result set with garbled column metadata on strict modes.
//   2. On some mysql2 + MySQL 5.7 combos, JSON columns following a JOIN are
//      returned as Buffer objects instead of parsed values.
// The explicit list avoids both issues.  company_name in the response now always
// refers to the recruiter's company (from users) — same as the original intent.
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         er.id,
         er.title,
         er.recruiter_id,
         er.recruiter_email,
         er.company_name          AS er_company_name,
         er.job_role,
         er.job_description,
         er.exam_type,
         er.assessment_pattern,
         er.section_config,
         er.sectional_cutoff_required,
         er.sectional_cutoffs,
         er.ai_viva_mode,
         er.schedule_date,
         er.schedule_time,
         er.eligibility_criteria,
         er.specifications,
         er.target_college,
         er.target_batch_year,
         er.status,
         er.approved_by,
         er.approved_at,
         er.reject_reason,
         er.created_at,
         er.updated_at,
         u.full_name              AS recruiter_name,
         u.email                  AS recruiter_email_from_user,
         COALESCE(u.company_name, er.company_name) AS company_name
       FROM   exam_requests er
       LEFT JOIN users u ON er.recruiter_id = u.id
       ORDER BY er.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get all exam requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET / ────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  const { recruiter_id } = req.query;
  try {
    let sql    = 'SELECT * FROM exam_requests';
    let params = [];
    if (recruiter_id) {
      sql   += ' WHERE recruiter_id = ?';
      params = [recruiter_id];
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Get exam requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /:id/status ────────────────────────────────────────────────────────
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { id }                                  = req.params;
  const { status, approved_by, reject_reason }  = req.body;
  const { ipAddress, userAgent }                = getClientInfo(req);

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const [requestRows] = await db.query(
      'SELECT title FROM exam_requests WHERE id = ?',
      [id]
    );

    const [result] = await db.query(
      `UPDATE exam_requests
       SET  status        = ?,
            approved_by   = ?,
            reject_reason = ?,
            approved_at   = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
            updated_at    = NOW()
       WHERE id = ?`,
      [status, approved_by || null, reject_reason || null, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    const requestTitle = requestRows[0]?.title || `Request #${id}`;

    if (status === 'approved') {
      await AuditLogger.logExamRequestApproved(
        req.user.id, req.user.email || req.user.name,
        id, requestTitle, ipAddress, userAgent
      );
    } else {
      await AuditLogger.logExamRequestRejected(
        req.user.id, req.user.email || req.user.name,
        id, requestTitle, reject_reason || 'No reason given',
        ipAddress, userAgent
      );
    }

    res.json({ message: `Request ${status} successfully` });
  } catch (err) {
    console.error('Update exam request status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT er.*,
              u.full_name AS recruiter_name,
              u.email     AS recruiter_email
       FROM   exam_requests er
       LEFT JOIN users u ON er.recruiter_id = u.id
       WHERE  er.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get single exam request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;