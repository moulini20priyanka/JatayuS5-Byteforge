const express = require('express');
const db      = require('../config/db');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AuditLogger = require('../services/auditLogger');

const getClientInfo = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || 'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

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
        recruiter_email    || null,
        company_name       || null,
        job_role, job_description, exam_type, assessment_pattern,
        JSON.stringify(section_config        || {}),
        sectional_cutoff_required ? 1 : 0,
        JSON.stringify(sectional_cutoffs     || {}),
        ai_viva_mode       || 'both',
        schedule_date, schedule_time,
        JSON.stringify(eligibility_criteria  || {}),
        specifications     || null,
        target_college     || null,
        target_batch_year  || null,
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Exam request submitted successfully' });
  } catch (err) {
    console.error('Create exam request error:', err);
    res.status(500).json({ error: 'Failed to create exam request' });
  }
});

router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT er.*,
              u.full_name    AS recruiter_name,
              u.email        AS recruiter_email,
              u.company_name AS company_name
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

router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { id }                                 = req.params;
  const { status, approved_by, reject_reason } = req.body;
  const { ipAddress, userAgent }               = getClientInfo(req);

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // Fetch request title for logging
    const [requestRows] = await db.query('SELECT title FROM exam_requests WHERE id = ?', [id]);

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

    // Log approval or rejection
    const requestTitle = requestRows[0]?.title || `Request #${id}`;
    if (status === 'approved') {
      await AuditLogger.logExamRequestApproved(
        req.user.id, req.user.email || req.user.name,
        id, requestTitle,
        ipAddress, userAgent
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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT er.*, u.full_name AS recruiter_name, u.email AS recruiter_email
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