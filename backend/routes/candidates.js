// routes/candidates.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

const authMiddleware = require('../middleware/auth');

// ✅ SAFE IMPORT: works whether auth.js exports authorizeAdmin directly
// or only exports authenticateToken (defines it inline as fallback)
const authenticateToken = authMiddleware.authenticateToken || authMiddleware.authenticate;

const authorizeAdmin = authMiddleware.authorizeAdmin || function(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

if (!authenticateToken || typeof authenticateToken !== 'function') {
  throw new Error('[candidates.js] authenticateToken is not a function — check middleware/auth.js exports');
}

// ── DEBUG (no auth) — remove after confirming data loads ─────────────────────
router.get('/debug', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, college, branch, batch, status FROM candidates LIMIT 20'
    );
    res.json({ success: true, count: rows.length, candidates: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Static routes BEFORE /:id ────────────────────────────────────────────────
router.get('/stats/summary', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [[total]]    = await db.query('SELECT COUNT(*) as count FROM candidates');
    const [[colleges]] = await db.query('SELECT COUNT(DISTINCT college) as count FROM candidates WHERE college IS NOT NULL AND college != ""');
    const [[batches]]  = await db.query('SELECT COUNT(DISTINCT batch) as count FROM candidates WHERE batch IS NOT NULL');
    const [[active]]   = await db.query('SELECT COUNT(*) as count FROM candidates WHERE status = "active"');
    res.json({
      total:    total.count,
      colleges: colleges.count,
      batches:  batches.count,
      active:   active.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters/colleges', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT college FROM candidates WHERE college IS NOT NULL AND college != "" ORDER BY college'
    );
    res.json(rows.map(r => r.college));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters/batches', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT batch FROM candidates WHERE batch IS NOT NULL ORDER BY batch DESC'
    );
    res.json(rows.map(r => r.batch));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters/branches', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT branch FROM candidates WHERE branch IS NOT NULL AND branch != "" ORDER BY branch'
    );
    res.json(rows.map(r => r.branch));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/candidates ──────────────────────────────────────────────────────
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { college, batch, branch, status, search } = req.query;
    console.log('[Candidates] GET / | user:', req.user?.id, '| role:', req.user?.role, '| params:', req.query);

    let query = `
      SELECT id, name, email, college, branch, batch, cgpa, status,
             tenth_percentage, twelfth_percentage, backlogs,
             github_url, linkedin_url, leetcode_url, created_at, last_login_at,
             (CASE WHEN cgpa >= 9 THEN 90 WHEN cgpa >= 8 THEN 80
                   WHEN cgpa >= 7 THEN 70 WHEN cgpa >= 6 THEN 60 ELSE 50
              END) AS total_score
      FROM candidates WHERE 1=1`;

    const params = [];
    if (college && college !== 'All') { query += ' AND college = ?';  params.push(college); }
    if (batch   && batch   !== 'All') { query += ' AND batch = ?';    params.push(batch);   }
    if (branch  && branch  !== 'All') { query += ' AND branch = ?';   params.push(branch);  }
    if (status  && status  !== 'All') { query += ' AND status = ?';   params.push(status.toLowerCase()); }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR college LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    console.log(`[Candidates] Returning ${rows.length} rows`);
    res.json(rows.map(c => ({ ...c, department: c.branch, score: c.total_score })));
  } catch (err) {
    console.error('[Candidates] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates', details: err.message });
  }
});

// ── GET /api/candidates/:id ──────────────────────────────────────────────────
router.get('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT id, name, email, college, branch, batch, cgpa,
              github_url, linkedin_url, leetcode_url, status,
              last_login_at, created_at, updated_at,
              tenth_percentage, twelfth_percentage, backlogs
       FROM candidates WHERE id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    const candidate = rows[0];

    try {
      const [exams] = await db.query(
        `SELECT er.exam_id, er.score, er.status, er.submitted_at,
                e.title AS exam_name, e.exam_type, e.total_marks
         FROM exam_results er
         JOIN exams e ON e.id = er.exam_id
         WHERE er.student_id = ?
         ORDER BY er.submitted_at DESC LIMIT 10`,
        [id]
      );
      candidate.exams = exams;
    } catch {
      candidate.exams = [];
    }

    res.json(candidate);
  } catch (err) {
    console.error('[Candidates] GET /:id error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate details', details: err.message });
  }
});

module.exports = router;