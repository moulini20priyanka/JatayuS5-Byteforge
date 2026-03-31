// routes/auth.js
const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const db        = require('../config/db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET  || 'neuroassess_secret_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, role = 'recruiter', company_name } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email and password are required' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, company_name)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, hash, role, company_name || null]
    );

    const token = jwt.sign(
      { id: result.insertId, email, role, name: full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({
      message: 'Registered successfully',
      token,
      role,
      name:  full_name,
      email,
      user: { id: result.insertId, name: full_name, full_name, email, role },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login  (admin + recruiter) ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const resolvedRole = (user.role || 'admin').toLowerCase().trim();

    // Embed 'name' in JWT payload so middleware sets req.user.name correctly
    const token = jwt.sign(
      { id: user.id, email: user.email, role: resolvedRole, name: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // ✅ Consistent top-level fields — Login.jsx reads these directly
    res.json({
      message: 'Login successful',
      token,
      role:    resolvedRole,
      name:    user.full_name,   // top-level 'name' — Login.jsx uses this
      email:   user.email,
      user: {                    // nested object — backward compat
        id:           user.id,
        name:         user.full_name,
        full_name:    user.full_name,
        email:        user.email,
        role:         resolvedRole,
        company_name: user.company_name || null,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/student/login ──────────────────────────────────────────────
// Students are in the candidates table (separate from users)
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query(
      'SELECT * FROM candidates WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const student = rows[0];

    if (!student.password_hash) {
      return res.status(401).json({
        error: 'Account not activated. Contact your administrator.',
      });
    }

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login timestamp
    await db.query(
      'UPDATE candidates SET last_login_at = NOW() WHERE id = ?',
      [student.id]
    );

    const token = jwt.sign(
      { id: student.id, email: student.email, role: 'student', name: student.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // ✅ Consistent top-level fields — same shape as admin/recruiter login
    res.json({
      message:   'Login successful',
      token,
      role:      'student',
      name:      student.name,   // top-level 'name'
      email:     student.email,
      studentId: String(student.id),
      user: {                    // nested object — backward compat
        id:      student.id,
        name:    student.name,
        email:   student.email,
        role:    'student',
        college: student.college || null,
        batch:   student.batch   || null,
      },
    });
  } catch (err) {
    console.error('[Auth] Student login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// ── GET /api/auth/admin/signups ──────────────────────────────────────────────
// Fetch all recruiter signup requests (pending, approved, rejected)
router.get('/admin/signups', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, company_name, status, 
              approved_by, approved_at, created_at 
       FROM users 
       WHERE role = 'recruiter' 
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[Auth] Fetch signups error:', err);
    res.status(500).json({ error: 'Failed to fetch signups' });
  }
});
// ── POST /api/auth/admin/approve-recruiter ───────────────────────────────────
router.post('/admin/approve-recruiter', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { signup_id, admin_id } = req.body;

    if (!signup_id) {
      return res.status(400).json({ error: 'signup_id is required' });
    }

    // Update user status to 'active' and set approved_by and approved_at
    await db.query(
      `UPDATE users 
       SET status = 'active', approved_by = ?, approved_at = NOW() 
       WHERE id = ? AND role = 'recruiter'`,
      [admin_id || req.user.id, signup_id]
    );

    res.json({ message: 'Recruiter approved successfully' });
  } catch (err) {
    console.error('[Auth] Approve recruiter error:', err);
    res.status(500).json({ error: 'Failed to approve recruiter' });
  }
});

// ── POST /api/auth/admin/reject-recruiter ────────────────────────────────────
router.post('/admin/reject-recruiter', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { signup_id, admin_id, reason } = req.body;

    if (!signup_id) {
      return res.status(400).json({ error: 'signup_id is required' });
    }

    // Update user status to 'rejected' and store reason
    await db.query(
      `UPDATE users 
       SET status = 'rejected', reject_reason = ?, approved_by = ?, approved_at = NOW() 
       WHERE id = ? AND role = 'recruiter'`,
      [reason || null, admin_id || req.user.id, signup_id]
    );

    res.json({ message: 'Recruiter rejected successfully' });
  } catch (err) {
    console.error('[Auth] Reject recruiter error:', err);
    res.status(500).json({ error: 'Failed to reject recruiter' });
  }
});

module.exports = router;