// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'neuroassess_secret_2024';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      ...decoded,
      id:    decoded.id    || decoded.userId || decoded.user_id,
      role: (decoded.role  || 'student').toLowerCase().trim(),
      email: decoded.email || '',
    };

    console.log(`[Auth] ✓ id=${req.user.id} role=${req.user.role} email=${req.user.email}`);
    next();
  } catch (err) {
    console.log('[Auth] Verify failed:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please log in again.',
        code:  'TOKEN_EXPIRED',
      });
    }

    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Require the caller to be an admin.
 * Always use AFTER authenticateToken.
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Allow admins OR recruiters through.
 * Always use AFTER authenticateToken.
 */
const authorizeRecruiter = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'recruiter')) {
    return res.status(403).json({ error: 'Recruiter or admin access required' });
  }
  next();
};

/**
 * Generic role guard — pass one or more allowed roles.
 *
 * Example:
 *   router.get('/data', authenticateToken, requireRole('admin', 'recruiter'), handler)
 */
const requireRole = (...roles) => {
  const normalized = roles.flat().map(r => r.toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user || !normalized.includes(req.user.role)) {
      console.warn(
        `[RequireRole] DENIED — role="${req.user?.role}" required: ${normalized.join(', ')}`
      );
      return res.status(403).json({
        error:    'Access denied',
        required: normalized,
        got:      req.user?.role || 'none',
      });
    }
    next();
  };
};

// Alias for backward-compat (some route files import `authenticate`)
const authenticate = authenticateToken;

module.exports = {
  authenticateToken,
  authenticate,
  authorizeAdmin,
  authorizeRecruiter,
  requireRole,
};