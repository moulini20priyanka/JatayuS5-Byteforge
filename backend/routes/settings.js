// backend/routes/settings.js
// Handles platform settings (key-value) and email template CRUD.

const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// ─── Helper: get all settings as a flat object ────────────────
async function getAllSettings() {
  const [rows] = await db.query('SELECT [key], [value] FROM platform_settings');
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
}

// ─────────────────────────────────────────────────────────────
// GET /api/settings
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [settings, templates] = await Promise.all([
      getAllSettings(),
      db.query(`SELECT id, template_key, label, description, subject, body_html, variables, is_active, updated_at
                FROM email_templates ORDER BY id ASC`)
        .then(([rows]) => rows.map(r => ({
          ...r,
          variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : (r.variables || []),
        }))),
    ]);
    res.json({ settings, templates });
  } catch (err) {
    console.error('[Settings] GET / error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/settings
// ─────────────────────────────────────────────────────────────
router.patch('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    if (!entries.length) return res.status(400).json({ error: 'No settings provided' });

    await Promise.all(
      entries.map(([key, value]) =>
        db.query(
          `MERGE platform_settings AS target
           USING (SELECT ? AS [key], ? AS [value]) AS src ON target.[key] = src.[key]
           WHEN MATCHED THEN UPDATE SET [value] = src.[value], updated_at = GETDATE()
           WHEN NOT MATCHED THEN INSERT ([key], [value]) VALUES (src.[key], src.[value]);`,
          [key, value === null ? null : String(value)]
        )
      )
    );

    res.json({ success: true, updated: entries.map(([k]) => k) });
  } catch (err) {
    console.error('[Settings] PATCH / error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/settings/templates/:key
// ─────────────────────────────────────────────────────────────
router.get('/templates/:key', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM email_templates WHERE template_key = ?',
      [req.params.key]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const t = rows[0];
    res.json({
      ...t,
      variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : (t.variables || []),
    });
  } catch (err) {
    console.error('[Settings] GET template error:', err);
    res.status(500).json({ error: 'Failed to load template' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/settings/templates
// ─────────────────────────────────────────────────────────────
router.post('/templates', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { template_key, label, description, subject, body_html, variables = [], is_active = 1 } = req.body;
    if (!template_key || !label || !subject || !body_html) {
      return res.status(400).json({ error: 'template_key, label, subject and body_html are required' });
    }

    const [result] = await db.query(
      `INSERT INTO email_templates (template_key, label, description, subject, body_html, variables, is_active)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [template_key, label, description || null, subject, body_html, JSON.stringify(variables), is_active ? 1 : 0]
    );
    res.status(201).json({ id: result[0]?.id, success: true });
  } catch (err) {
    if (err.number === 2627 || err.message?.includes('duplicate')) {
      return res.status(409).json({ error: 'A template with this key already exists' });
    }
    console.error('[Settings] POST template error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/settings/templates/:key
// ─────────────────────────────────────────────────────────────
router.patch('/templates/:key', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { subject, body_html, is_active } = req.body;
    const fields = [];
    const params = [];

    if (subject   !== undefined) { fields.push('subject = ?');   params.push(subject); }
    if (body_html !== undefined) { fields.push('body_html = ?'); params.push(body_html); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    fields.push('updated_at = GETDATE()');
    params.push(req.params.key);

    const [result] = await db.query(
      `UPDATE email_templates SET ${fields.join(', ')} WHERE template_key = ?`,
      params
    );

    if (result.rowsAffected?.[0] === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] PATCH template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/settings/templates/:key
// ─────────────────────────────────────────────────────────────
router.delete('/templates/:key', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM email_templates WHERE template_key = ?',
      [req.params.key]
    );
    if (result.rowsAffected?.[0] === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] DELETE template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/settings/templates/:key/reset
// ─────────────────────────────────────────────────────────────
router.post('/templates/:key/reset', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { subject, body_html } = req.body;
    if (!subject || !body_html) return res.status(400).json({ error: 'subject and body_html required' });

    await db.query(
      'UPDATE email_templates SET subject = ?, body_html = ?, updated_at = GETDATE() WHERE template_key = ?',
      [subject, body_html, req.params.key]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] reset template error:', err);
    res.status(500).json({ error: 'Failed to reset template' });
  }
});

module.exports = router;