// backend/services/notificationService.js
// Central service for creating and fetching admin bell notifications.
//
// ── TEMPLATE LINK ─────────────────────────────────────────────
// title and message are no longer hardcoded strings.
// They are fetched from the `notification_templates` table —
// the same table the admin edits in Settings → Notifications.
//
// Flow:
//   Admin edits template in Settings → Notifications tab
//         ↓
//   PATCH /api/settings/notification-templates/:key  →  DB updated
//         ↓
//   Next call to notifyRecruiterSignup / notifyNewExamRequest
//         ↓
//   loadNotifTemplate(key) queries notification_templates fresh
//         ↓
//   interpolate() fills {{recruiter_name}}, {{exam_title}}, etc.
//         ↓
//   INSERT notifications row with the dynamic title + message
// ─────────────────────────────────────────────────────────────

const db = require('../config/db');

// ─── Helper: load template from notification_templates ────────
async function loadNotifTemplate(templateKey) {
  try {
    const [rows] = await db.query(
      'SELECT title, message, is_active FROM notification_templates WHERE template_key = ?',
      [templateKey]
    );
    if (rows.length && rows[0].is_active) return rows[0];
  } catch (err) {
    console.error(`[NotificationService] Could not load template "${templateKey}":`, err);
  }
  return null; // triggers hardcoded fallback
}

// ─── Helper: replace {{variable}} placeholders ───────────────
function interpolate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ─── Main Service ─────────────────────────────────────────────
const NotificationService = {

  // ─── CREATE (low-level) ───────────────────────────────────
  async create({ type, title, message, metadata = {}, target_url = null }) {
    try {
      const [result] = await db.query(
        `INSERT INTO notifications (type, title, message, metadata, target_url, recipient_role)
         OUTPUT INSERTED.id AS id
         VALUES (?, ?, ?, ?, ?, 'admin')`,
        [type, title, message, JSON.stringify(metadata), target_url]
      );
      return result[0]?.id;
    } catch (err) {
      console.error('[NotificationService] create error:', err);
      return null;
    }
  },

  // ─── CONVENIENCE CREATORS ─────────────────────────────────

  /**
   * Called when a new recruiter registers and awaits approval.
   * Fetches title + message from notification_templates (template_key = 'recruiter_signup').
   * Falls back to hardcoded strings if template is missing or inactive.
   */
  async notifyRecruiterSignup({ recruiterId, recruiterName, recruiterEmail, companyName }) {
    const vars = {
      recruiter_name:    recruiterName  || '',
      recruiter_email:   recruiterEmail || '',
      recruiter_company: companyName    || '',
      signup_time:       new Date().toLocaleString(),
    };

    const tpl = await loadNotifTemplate('recruiter_signup');

    const title   = tpl
      ? interpolate(tpl.title,   vars)
      : 'Recruiter Approval Request';

    const message = tpl
      ? interpolate(tpl.message, vars)
      : `${recruiterName}${companyName ? ` from ${companyName}` : ''} (${recruiterEmail}) signed up and is awaiting approval.`;

    return this.create({
      type:       'recruiter_signup',
      title,
      message,
      metadata:   { recruiterId, recruiterName, recruiterEmail, companyName },
      target_url: '/admin/recruiter-approvals',
    });
  },

  /**
   * Called when a recruiter submits a new exam request.
   * Fetches title + message from notification_templates (template_key = 'exam_request').
   * Falls back to hardcoded strings if template is missing or inactive.
   */
  async notifyNewExamRequest({ requestId, jobRole, examType, recruiterName, companyName, examDuration }) {
    const vars = {
      recruiter_name:    recruiterName || '',
      recruiter_company: companyName   || '',
      exam_title:        jobRole       || '',
      exam_role:         examType      || '',
      exam_duration:     examDuration  || '',
      submitted_time:    new Date().toLocaleString(),
    };

    const tpl = await loadNotifTemplate('exam_request');

    const title   = tpl
      ? interpolate(tpl.title,   vars)
      : 'New Exam Request';

    const message = tpl
      ? interpolate(tpl.message, vars)
      : `${recruiterName}${companyName ? ` (${companyName})` : ''} submitted a new ${examType} exam request for "${jobRole}".`;

    return this.create({
      type:       'exam_request',
      title,
      message,
      metadata:   { requestId, jobRole, examType, recruiterName, companyName },
      target_url: '/admin/exam-requests',
    });
  },

  // ─── FETCH ────────────────────────────────────────────────

 async fetchAdminNotifications({ limit = 50, unreadOnly = false } = {}) {
  let sql = `SELECT TOP ${limit} * FROM notifications WHERE recipient_role = 'admin'`;
  if (unreadOnly) sql += ' AND is_read = 0';
  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.query(sql);
  return rows.map(r => ({
    ...r,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
  }));
},

  async countUnread() {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE recipient_role = 'admin' AND is_read = 0`
    );
    return row.cnt;
  },

  // ─── MARK READ ────────────────────────────────────────────

  async markRead(id) {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  },

  async markAllRead() {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE recipient_role = 'admin' AND is_read = 0`
    );
  },
};

module.exports = NotificationService;