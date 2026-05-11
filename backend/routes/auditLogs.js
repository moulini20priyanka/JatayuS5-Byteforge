/**
 * Audit Logs Routes
 * Provides endpoints to retrieve and analyze audit logs
 */

const express = require('express');
const router = express.Router();
const AuditLogger = require('../services/auditLogger');
const { authenticateToken } = require('../middleware/auth');

// Helper to extract IP and user agent
const getClientInfo = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || 'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

// Helper to check admin access — handles 'superadmin', 'Super Admin', 'admin' etc.
const isAdmin = (req) => {
  const role = (req.user?.role || '').toLowerCase().trim().replace(/\s+/g, '');
  return role === 'admin' || role === 'superadmin';
};

/**
 * GET /api/audit-logs
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const {
      userId,
      actionType,
      actionCategory,
      entityType,
      status,
      startDate,
      endDate,
      limit = 25,
      page = 1,
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {
      ...(userId && { userId: parseInt(userId) }),
      ...(actionType && { actionType }),
      ...(actionCategory && { actionCategory }),
      ...(entityType && { entityType }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    const [logs, totalCount] = await Promise.all([
      AuditLogger.getLogs(filters, parseInt(limit), offset),
      AuditLogger.getLogsCount(filters),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[Audit Logs API] Error fetching logs:', error.message);
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
});

/**
 * GET /api/audit-logs/statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { startDate, endDate } = req.query;
    const statistics = await AuditLogger.getStatistics(startDate, endDate);

    const grouped = {};
    statistics.forEach(stat => {
      if (!grouped[stat.action_category]) {
        grouped[stat.action_category] = [];
      }
      grouped[stat.action_category].push({
        actionType: stat.action_type,
        status: stat.status,
        count: stat.count,
      });
    });

    res.json({
      success: true,
      data: grouped,
      summary: {
        totalActivities: statistics.reduce((sum, s) => sum + s.count, 0),
        dateRange: {
          startDate: startDate || 'N/A',
          endDate: endDate || 'N/A',
        },
      },
    });
  } catch (error) {
    console.error('[Audit Logs API] Error fetching statistics:', error.message);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

/**
 * GET /api/audit-logs/recent
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 100;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await AuditLogger.getLogs(
      { startDate: startDate.toISOString() },
      limit,
      0
    );

    res.json({
      success: true,
      data: logs,
      filter: {
        days,
        startDate: startDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Audit Logs API] Error fetching recent logs:', error.message);
    res.status(500).json({ message: 'Failed to fetch recent logs', error: error.message });
  }
});

/**
 * GET /api/audit-logs/user/:userId
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      AuditLogger.getLogs({ userId: parseInt(userId) }, parseInt(limit), offset),
      AuditLogger.getLogsCount({ userId: parseInt(userId) }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[Audit Logs API] Error fetching user logs:', error.message);
    res.status(500).json({ message: 'Failed to fetch user logs', error: error.message });
  }
});

/**
 * GET /api/audit-logs/activity/:actionType
 */
router.get('/activity/:actionType', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { actionType } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      AuditLogger.getLogs({ actionType }, parseInt(limit), offset),
      AuditLogger.getLogsCount({ actionType }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[Audit Logs API] Error fetching activity logs:', error.message);
    res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
  }
});

/**
 * GET /api/audit-logs/export
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { actionCategory, entityType, startDate, endDate } = req.query;

    const filters = {
      ...(actionCategory && { actionCategory }),
      ...(entityType && { entityType }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    const logs = await AuditLogger.getLogs(filters, 100000, 0);

    const headers = ['ID', 'User ID', 'Username', 'Action Type', 'Category', 'Entity Type', 'Entity ID', 'Entity Name', 'Status', 'IP Address', 'Timestamp', 'Details'];
    const csv = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id,
        log.user_id || '',
        log.username,
        log.action_type,
        log.action_category,
        log.entity_type,
        log.entity_id || '',
        `"${(log.entity_name || '').replace(/"/g, '""')}"`,
        log.status,
        log.ip_address,
        log.timestamp,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      ];
      csv.push(row.join(','));
    });

    const csvContent = csv.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

    const { ipAddress, userAgent } = getClientInfo(req);
    await AuditLogger.logDataExported(req.user.id, req.user.username || req.user.email, 'AuditLogs', logs.length, ipAddress, userAgent);
  } catch (error) {
    console.error('[Audit Logs API] Error exporting logs:', error.message);
    res.status(500).json({ message: 'Failed to export logs', error: error.message });
  }
});

module.exports = router;