// backend/routes/examRequests.js
// Matches actual DB schema from DESCRIBE exam_requests
// Columns: id, recruiter_id, recruiter_email, company_name, title, job_role,
//          exam_type, assessment_pattern, duration_minutes, specifications,
//          target_college, target_batch_year, status, approved_by, approved_at,
//          reject_reason, scheduled_at, created_at, updated_at, exam_id,
//          job_description, section_config, sectional_cutoff_required,
//          sectional_cutoffs, ai_viva_mode, schedule_date, schedule_time,
//          eligibility_criteria

const express               = require('express');
const db                    = require('../config/db');
const router                = express.Router();
const { authenticateToken } = require('../middleware/auth');

// ── Safe AuditLogger (won't crash if missing) ─────────────────────────────────
let AuditLogger = null;
try { AuditLogger = require('../services/auditLogger'); } catch (_) {}

// ── Safe NotificationService (won't crash if missing) ─────────────────────────
let NotificationService = null;
try { NotificationService = require('../services/notificationService'); } catch (_) {}

const getClientInfo = req => ({
  ipAddress:
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection?.remoteAddress ||
    'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-requests
// Create a new exam request (recruiter)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      recruiter_id,
      recruiter_email,
      company_name,
      job_role,
      job_description,
      exam_type            = 'Placement',
      assessment_pattern,
      duration_minutes     = 120,
      specifications,
      target_college,
      target_batch_year,
      section_config,
      sectional_cutoff_required = false,
      sectional_cutoffs,
      ai_viva_mode         = 'both',
      schedule_date,
      schedule_time,
      eligibility_criteria,
    } = req.body;

    if (!job_role) {
      return res.status(400).json({ error: 'job_role is required' });
    }

    // Validate exam_type against DB enum
    const validTypes = ['Placement', 'Skill Certificate', 'Internship'];
    const safeType   = validTypes.includes(exam_type) ? exam_type : 'Placement';

    const title = `${job_role} — ${safeType}`;

    const [result] = await db.query(
      `INSERT INTO exam_requests
         (title, recruiter_id, recruiter_email, company_name,
          job_role, job_description,
          exam_type, assessment_pattern, duration_minutes,
          specifications, target_college, target_batch_year,
          section_config, sectional_cutoff_required, sectional_cutoffs,
          ai_viva_mode, schedule_date, schedule_time,
          eligibility_criteria, status)
       VALUES
         (?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, 'pending')`,
      [
        title,
        recruiter_id              || req.user?.id  || null,
        recruiter_email           || req.user?.email || null,
        company_name              || null,

        job_role,
        job_description           || null,

        safeType,
        assessment_pattern        || null,
        parseInt(duration_minutes) || 120,

        specifications            || null,
        target_college            || null,
        target_batch_year         || null,

        section_config
          ? JSON.stringify(section_config)
          : null,
        sectional_cutoff_required ? 1 : 0,
        sectional_cutoffs
          ? JSON.stringify(sectional_cutoffs)
          : null,

        ai_viva_mode              || 'both',
        schedule_date             || null,
        schedule_time             || null,

        eligibility_criteria
          ? JSON.stringify(eligibility_criteria)
          : null,
      ]
    );

    // Resolve recruiter display name for notification
    let recruiterName = req.user?.name || recruiter_email || 'A recruiter';
    if (recruiter_id || req.user?.id) {
      try {
        const [userRows] = await db.query(
          'SELECT full_name FROM users WHERE id = ? LIMIT 1',
          [recruiter_id || req.user?.id]
        );
        if (userRows.length) recruiterName = userRows[0].full_name;
      } catch (_) {}
    }

    // Fire notification (non-blocking, won't crash if service missing)
    if (NotificationService?.notifyNewExamRequest) {
      NotificationService.notifyNewExamRequest({
        requestId:   result.insertId,
        jobRole:     job_role,
        examType:    safeType,
        recruiterName,
        companyName: company_name || null,
      }).catch(err =>
        console.error('[exam-requests] notification failed:', err.message)
      );
    }

    console.log(`[exam-requests] Created request #${result.insertId} — ${title}`);
    res.status(201).json({
      id:      result.insertId,
      message: 'Exam request submitted successfully',
    });

  } catch (err) {
    console.error('[exam-requests POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-requests/all
// Get all requests (admin view)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         er.id,
         er.title,
         er.recruiter_id,
         er.recruiter_email,
         er.company_name,
         er.job_role,
         er.job_description,
         er.exam_type,
         er.assessment_pattern,
         er.duration_minutes,
         er.specifications,
         er.target_college,
         er.target_batch_year,
         er.section_config,
         er.sectional_cutoff_required,
         er.sectional_cutoffs,
         er.ai_viva_mode,
         er.schedule_date,
         er.schedule_time,
         er.eligibility_criteria,
         er.status,
         er.approved_by,
         er.approved_at,
         er.reject_reason,
         er.scheduled_at,
         er.created_at,
         er.updated_at,
         er.exam_id,
         u.full_name                              AS recruiter_name,
         COALESCE(u.company_name, er.company_name) AS recruiter_company
       FROM exam_requests er
       LEFT JOIN users u ON er.recruiter_id = u.id
       ORDER BY er.created_at DESC`
    );

    // Parse JSON columns safely
    const parsed = rows.map(r => ({
      ...r,
      section_config:       safeParseJSON(r.section_config,       {}),
      sectional_cutoffs:    safeParseJSON(r.sectional_cutoffs,    {}),
      eligibility_criteria: safeParseJSON(r.eligibility_criteria, {}),
    }));

    res.json(parsed);
  } catch (err) {
    console.error('[exam-requests GET /all]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-requests
// Get requests for a specific recruiter
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const recruiter_id = req.query.recruiter_id || req.user?.id;

    let sql    = 'SELECT * FROM exam_requests';
    let params = [];

    if (recruiter_id) {
      sql   += ' WHERE recruiter_id = ?';
      params = [recruiter_id];
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);

    const parsed = rows.map(r => ({
      ...r,
      section_config:       safeParseJSON(r.section_config,       {}),
      sectional_cutoffs:    safeParseJSON(r.sectional_cutoffs,    {}),
      eligibility_criteria: safeParseJSON(r.eligibility_criteria, {}),
    }));

    res.json(parsed);
  } catch (err) {
    console.error('[exam-requests GET /]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-requests/:id
// Get a single request by ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT er.*,
              u.full_name AS recruiter_name,
              u.email     AS recruiter_user_email
       FROM exam_requests er
       LEFT JOIN users u ON er.recruiter_id = u.id
       WHERE er.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    const r = rows[0];
    res.json({
      ...r,
      section_config:       safeParseJSON(r.section_config,       {}),
      sectional_cutoffs:    safeParseJSON(r.sectional_cutoffs,    {}),
      eligibility_criteria: safeParseJSON(r.eligibility_criteria, {}),
    });
  } catch (err) {
    console.error('[exam-requests GET /:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/exam-requests/:id/status
// Admin approves or rejects a request
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { id }                                 = req.params;
  const { status, approved_by, reject_reason } = req.body;
  const { ipAddress, userAgent }               = getClientInfo(req);

  const validStatuses = ['approved', 'rejected', 'pending', 'completed', 'exam_created'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const [requestRows] = await db.query(
      'SELECT title FROM exam_requests WHERE id = ? LIMIT 1',
      [id]
    );

    if (!requestRows.length) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    const [result] = await db.query(
      `UPDATE exam_requests
       SET  status        = ?,
            approved_by   = ?,
            reject_reason = ?,
            approved_at   = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
            updated_at    = NOW()
       WHERE id = ?`,
      [
        status,
        approved_by   || req.user?.id  || null,
        reject_reason || null,
        status,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    const requestTitle = requestRows[0]?.title || `Request #${id}`;

    // Audit log (non-blocking)
    if (AuditLogger) {
      try {
        if (status === 'approved' && AuditLogger.logExamRequestApproved) {
          await AuditLogger.logExamRequestApproved(
            req.user?.id,
            req.user?.email || req.user?.name || 'Admin',
            id, requestTitle, ipAddress, userAgent
          );
        } else if (status === 'rejected' && AuditLogger.logExamRequestRejected) {
          await AuditLogger.logExamRequestRejected(
            req.user?.id,
            req.user?.email || req.user?.name || 'Admin',
            id, requestTitle,
            reject_reason || 'No reason given',
            ipAddress, userAgent
          );
        }
      } catch (auditErr) {
        console.warn('[exam-requests] audit log failed:', auditErr.message);
      }
    }

    console.log(`[exam-requests] Request #${id} → ${status}`);
    res.json({ success: true, message: `Request ${status} successfully` });

  } catch (err) {
    console.error('[exam-requests PATCH /:id/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJSON(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;