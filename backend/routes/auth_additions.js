// ── ADD THESE 2 ROUTES to your backend/routes/auth.js ───────────
// Paste them just before: module.exports = router;

// ── GET /api/auth/admin/signups ──────────────────────────────────
// Returns all recruiter signup requests (admin only)
router.get('/admin/signups', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, full_name, company_name, status, reject_reason, created_at FROM recruiter_signups ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});