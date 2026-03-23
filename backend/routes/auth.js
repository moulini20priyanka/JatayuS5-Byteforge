const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const router   = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'neuroassess_secret_2024';

// ── POST /api/auth/login  (Admin + Recruiter) ────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'pending')
      return res.status(403).json({ error: 'Your account is pending admin approval' });

    if (user.status === 'suspended')
      return res.status(403).json({ error: 'Your account has been suspended' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role, name: user.full_name, email: user.email });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/student/login ─────────────────────────────────
router.post('/student/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await db.query('SELECT * FROM candidates WHERE email = ?', [email]);
    const student = rows[0];

    if (!student)
      return res.status(401).json({ error: 'Invalid credentials' });

    if (student.status === 'inactive' || student.status === 'banned')
      return res.status(403).json({ error: 'Account inactive. Contact admin.' });

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    await db.query('UPDATE candidates SET last_login_at = NOW() WHERE id = ?', [student.id]);

    const token = jwt.sign(
      { id: student.id, role: 'student', email: student.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      role: 'student',
      name: student.name,
      email: student.email,
      studentId: student.id
    });

  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/recruiter/signup ──────────────────────────────
router.post('/recruiter/signup', async (req, res) => {
  const { email, password, full_name, company_name } = req.body;
  if (!email || !password || !company_name)
    return res.status(400).json({ error: 'Email, password and company name are required' });

  try {
    const [existing] = await db.query(
      'SELECT id FROM recruiter_signups WHERE email = ?', [email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'An application for this email already exists' });

    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existingUser.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO recruiter_signups (email, password_hash, full_name, company_name)
       VALUES (?, ?, ?, ?)`,
      [email, password_hash, full_name, company_name]
    );

    res.json({ message: 'Application submitted! Admin will review and notify you by email.' });

  } catch (err) {
    console.error('Recruiter signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/admin/approve-recruiter ───────────────────────
router.post('/admin/approve-recruiter', async (req, res) => {
  const { signup_id, admin_id } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM recruiter_signups WHERE id = ? AND status = "pending"',
      [signup_id]
    );
    const signup = rows[0];
    if (!signup)
      return res.status(404).json({ error: 'Pending signup not found' });

    await db.query(
      `INSERT INTO users (role, email, password_hash, full_name, company_name, status, approved_by, approved_at)
       VALUES ('recruiter', ?, ?, ?, ?, 'active', ?, NOW())`,
      [signup.email, signup.password_hash, signup.full_name, signup.company_name, admin_id]
    );

    await db.query(
      'UPDATE recruiter_signups SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [admin_id, signup_id]
    );

    res.json({ message: 'Recruiter approved successfully' });

  } catch (err) {
    console.error('Approve recruiter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/admin/signups ──────────────────────────────────
// Returns all recruiter signup requests for admin review
router.get('/admin/signups', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, email, full_name, company_name, status, reject_reason, created_at
       FROM recruiter_signups
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get signups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/admin/reject-recruiter ────────────────────────
// Admin rejects a pending recruiter signup
router.post('/admin/reject-recruiter', async (req, res) => {
  const { signup_id, admin_id, reason } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM recruiter_signups WHERE id = ? AND status = "pending"',
      [signup_id]
    );
    if (!rows[0])
      return res.status(404).json({ error: 'Pending signup not found' });

    await db.query(
      'UPDATE recruiter_signups SET status = "rejected", reviewed_by = ?, reviewed_at = NOW(), reject_reason = ? WHERE id = ?',
      [admin_id, reason || null, signup_id]
    );

    res.json({ message: 'Recruiter signup rejected' });

  } catch (err) {
    console.error('Reject recruiter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, role: decoded.role, email: decoded.email });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;