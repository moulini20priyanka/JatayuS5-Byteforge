// backend/routes/candidatesValidation.js


'use strict';

const express  = require('express');
const router   = express.Router();
const { validateStudents, validateSingleStudent } = require('../services/studentValidationAgent');
const { authenticateToken, authorizeAdmin }       = require('../middleware/auth');

function getClientInfo(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim()
               || req.connection?.remoteAddress || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/candidates/validate/health
// Quick health check — confirms the route is mounted correctly.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success:  true,
    service:  'ValidationAgent',
    aiEngine: process.env.GROQ_API_KEY ? `Groq (llama-3.3-70b-versatile)` : 'Rule-based only (GROQ_API_KEY not set)',
    time:     new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/candidates/validate/single
// Validate one student before Add Student form submission.
//
// Body: { name, email, college, branch, batch, cgpa }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/single', authenticateToken, authorizeAdmin, async (req, res) => {
  const { name, email, college, branch, batch, cgpa } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ success: false, message: 'email is required for validation' });
  }

  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const result = await validateSingleStudent(
      { name, email, college, branch, batch, cgpa },
      {
        adminId:    req.user?.id,
        adminName:  req.user?.username || req.user?.email || 'Admin',
        ipAddress,
        userAgent,
        writeAudit: true,
      }
    );

    return res.json({
      success: true,
      validation: result,
      canProceed: result.verdict !== 'BLOCK',
      summary: {
        verdict:      result.verdict,
        riskScore:    result.riskScore,
        errorCount:   result.issues.filter(i => i.severity === 'error').length,
        warningCount: [...result.warnings, ...result.aiFlags].length,
        isDuplicate:  result.isDuplicate,
        aiUsed:       result.aiVerdict !== null,
      },
    });
  } catch (err) {
    console.error('[/validate/single]', err);
    return res.status(500).json({ success: false, message: 'Validation service error: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/candidates/validate/bulk
// Validate an array of students (import wizard step 2.5).
//
// Body: { students: [{name, email, ...}] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bulk', authenticateToken, authorizeAdmin, async (req, res) => {
  const students = req.body?.students;

  if (!Array.isArray(students) || !students.length) {
    return res.status(400).json({ success: false, message: 'students[] array is required' });
  }
  if (students.length > 5000) {
    return res.status(400).json({ success: false, message: 'Maximum 5,000 students per validation call.' });
  }

  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const results = await validateStudents(students, {
      adminId:    req.user?.id,
      adminName:  req.user?.username || req.user?.email || 'Admin',
      ipAddress,
      userAgent,
      writeAudit: true,
    });

    const blocked  = results.filter(r => r.verdict === 'BLOCK');
    const warned   = results.filter(r => r.verdict === 'WARN');
    const passed   = results.filter(r => r.verdict === 'PASS');
    const dupCount = results.filter(r => r.isDuplicate).length;

    return res.json({
      success: true,
      results,
      summary: {
        total:      results.length,
        passed:     passed.length,
        warned:     warned.length,
        blocked:    blocked.length,
        duplicates: dupCount,
        canImport:  passed.length + warned.length,
        aiUsed:     results.some(r => r.aiVerdict !== null),
      },
    });
  } catch (err) {
    console.error('[/validate/bulk]', err);
    return res.status(500).json({ success: false, message: 'Bulk validation failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/candidates/validate/audit
// Fetch recent AI validation audit log entries (admin only).
//
// Query: ?limit=50&verdict=BLOCK|WARN
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit', authenticateToken, authorizeAdmin, async (req, res) => {
  const limit   = Math.min(parseInt(req.query.limit || '50',  10), 500);
  const verdict = req.query.verdict;

  const db = require('../config/db');
  try {
    let q = `SELECT id, admin_name, action, entity_id as student_email,
                    details, ip_address, created_at
             FROM audit_logs
             WHERE action IN ('AI_VALIDATION_BLOCKED','AI_VALIDATION_FLAGGED')`;
    const params = [];
    if (verdict === 'BLOCK') q += ` AND action = 'AI_VALIDATION_BLOCKED'`;
    if (verdict === 'WARN')  q += ` AND action = 'AI_VALIDATION_FLAGGED'`;
    q += ` ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY`;
    params.push(limit);

    const [rows] = await db.query(q, params);
    return res.json({
      success: true,
      logs: rows.map(row => ({
        ...row,
        details: (() => { try { return JSON.parse(row.details); } catch { return {}; } })(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;