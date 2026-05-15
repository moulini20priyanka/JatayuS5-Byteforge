// backend/routes/notifications.js
// REST endpoints consumed by the admin navbar.

const express             = require('express');
const router              = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// ─── GET /api/notifications
// Returns latest notifications + unread count for the admin panel.
// Query params:
//   limit      (number, default 50)
//   unreadOnly (boolean string 'true' | 'false')
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const limit      = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const unreadOnly = req.query.unreadOnly === 'true';

    const [notifications, unreadCount] = await Promise.all([
      NotificationService.fetchAdminNotifications({ limit, unreadOnly }),
      NotificationService.countUnread(),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('[Notifications] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── PATCH /api/notifications/:id/read
// Mark a single notification as read.
router.patch('/:id/read', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await NotificationService.markRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] PATCH read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ─── POST /api/notifications/mark-all-read
// Mark every unread admin notification as read.
router.post('/mark-all-read', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await NotificationService.markAllRead();
    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] mark-all-read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

module.exports = router;