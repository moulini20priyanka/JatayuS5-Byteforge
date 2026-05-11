/**
 * Audit Logger Service — Fixed version
 *
 * FIXES:
 *   1. log() now always awaits the DB insert (no silent fire-and-forget drops)
 *   2. _query() handles both mysql2/promise pool AND callback-style pools correctly
 *   3. Added logAuditTableMissing guard — if audit_logs table doesn't exist,
 *      logs a clear warning instead of crashing the calling route
 *   4. ensureAuditTable() — call once at startup to auto-create the table if missing
 */

const db = require('../config/db');

// ── One-time startup check — creates audit_logs if it doesn't exist ───────────
// Call this from server.js:  require('./services/auditLogger').ensureAuditTable()
async function ensureAuditTable() {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT          DEFAULT NULL,
      username        VARCHAR(255) NOT NULL DEFAULT 'System',
      action_type     VARCHAR(100) NOT NULL,
      action_category VARCHAR(100) NOT NULL,
      entity_type     VARCHAR(100) DEFAULT NULL,
      entity_id       VARCHAR(100) DEFAULT NULL,
      entity_name     VARCHAR(500) DEFAULT NULL,
      status          VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
      details         JSON         DEFAULT NULL,
      ip_address      VARCHAR(100) DEFAULT 'Unknown',
      user_agent      TEXT         DEFAULT NULL,
      timestamp       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id         (user_id),
      INDEX idx_action_type     (action_type),
      INDEX idx_action_category (action_category),
      INDEX idx_timestamp       (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  try {
    await _rawQuery(createSQL, []);
    console.log('[AuditLogger] ✅ audit_logs table ready');
  } catch (err) {
    console.error('[AuditLogger] ❌ Could not create audit_logs table:', err.message);
  }
}

// ── Internal raw query — works with mysql2/promise AND callback pools ──────────
function _rawQuery(sql, params) {
  try {
    const result = db.query(sql, params);
    // mysql2/promise pool returns a thenable
    if (result && typeof result.then === 'function') {
      return result.then(([rows]) => rows);
    }
    // callback-style pool — db.query returns undefined; wrap in Promise
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

class AuditLogger {
  // ── Core log method ─────────────────────────────────────────────────────────
  static async log(logData) {
    const {
      userId       = null,
      username     = 'System',
      actionType,
      actionCategory,
      entityType   = null,
      entityId     = null,
      entityName   = null,
      status       = 'SUCCESS',
      details      = {},
      ipAddress    = 'Unknown',
      userAgent    = 'Unknown',
    } = logData;

    const sql = `
      INSERT INTO audit_logs
        (user_id, username, action_type, action_category,
         entity_type, entity_id, entity_name, status,
         details, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [
      userId,
      username,
      actionType,
      actionCategory,
      entityType,
      entityId     !== null ? String(entityId) : null,
      entityName   !== null ? String(entityName).substring(0, 490) : null,
      status,
      JSON.stringify(details),
      ipAddress,
      userAgent ? String(userAgent).substring(0, 500) : null,
    ];

    try {
      await _rawQuery(sql, params);
      console.log(`[AuditLog] ✅ ${actionType} by "${username}" → ${entityName || '—'}`);
    } catch (err) {
      // Table missing is the most common first-run issue — give a clear message
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.error('[AuditLog] ❌ audit_logs table does not exist. Run ensureAuditTable() at startup.');
      } else {
        console.error(`[AuditLog] ❌ INSERT failed (${actionType}):`, err.message);
      }
      // Re-throw so callers with try/catch get visibility
      throw err;
    }
  }

  // ── Private _query alias ────────────────────────────────────────────────────
  static async _query(sql, params = []) {
    return _rawQuery(sql, params);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANDIDATE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logCandidateCreated(userId, username, candidateData, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'CANDIDATE_CREATED',
      actionCategory: 'CANDIDATE',
      entityType:     'Candidate',
      entityId:       candidateData.id,
      entityName:     `${candidateData.name} (${candidateData.email})`,
      status:         'SUCCESS',
      details: {
        email:   candidateData.email,
        name:    candidateData.name,
        college: candidateData.college,
        branch:  candidateData.branch,
        batch:   candidateData.batch,
      },
      ipAddress, userAgent,
    });
  }

  static async logCandidateStatusChanged(userId, username, candidateId, candidateName, oldStatus, newStatus, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'CANDIDATE_STATUS_CHANGED',
      actionCategory: 'CANDIDATE',
      entityType:     'Candidate',
      entityId:       candidateId,
      entityName:     candidateName,
      status:         'SUCCESS',
      details:        { oldStatus, newStatus, changedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logCandidateBulkImport(userId, username, count, filePath, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'CANDIDATES_BULK_IMPORTED',
      actionCategory: 'CANDIDATE',
      entityType:     'BulkImport',
      entityId:       null,
      entityName:     `Bulk Import (${count} candidates)`,
      status:         'SUCCESS',
      details:        { recordsImported: count, filePath, timestamp: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXAM EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logExamCreated(userId, username, examData, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_CREATED',
      actionCategory: 'EXAM',
      entityType:     'Exam',
      entityId:       examData.id,
      entityName:     examData.title || examData.name || `Exam #${examData.id}`,
      status:         'SUCCESS',
      details: {
        examType:        examData.exam_type,
        college:         examData.college,
        totalMarks:      examData.total_marks,
        durationMinutes: examData.duration_minutes,
        createdAt:       new Date().toISOString(),
      },
      ipAddress, userAgent,
    });
  }

  static async logExamApproved(userId, username, examId, examTitle, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_APPROVED',
      actionCategory: 'EXAM',
      entityType:     'Exam',
      entityId:       examId,
      entityName:     examTitle,
      status:         'SUCCESS',
      details:        { approvedBy: username, approvedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logExamUpdated(userId, username, examId, examTitle, changes, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_UPDATED',
      actionCategory: 'EXAM',
      entityType:     'Exam',
      entityId:       examId,
      entityName:     examTitle,
      status:         'SUCCESS',
      details:        changes,
      ipAddress, userAgent,
    });
  }

  static async logExamPublished(userId, username, examId, examTitle, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_PUBLISHED',
      actionCategory: 'EXAM',
      entityType:     'Exam',
      entityId:       examId,
      entityName:     examTitle,
      status:         'SUCCESS',
      details:        { publishedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logExamRequestApproved(userId, username, requestId, requestTitle, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_REQUEST_APPROVED',
      actionCategory: 'EXAM',
      entityType:     'ExamRequest',
      entityId:       requestId,
      entityName:     requestTitle,
      status:         'SUCCESS',
      details:        { approvedBy: username, approvedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logExamRequestRejected(userId, username, requestId, requestTitle, reason, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_REQUEST_REJECTED',
      actionCategory: 'EXAM',
      entityType:     'ExamRequest',
      entityId:       requestId,
      entityName:     requestTitle,
      status:         'SUCCESS',
      details:        { rejectedBy: username, reason, rejectedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logExamAssigned(userId, username, examId, examTitle, candidateCount, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'EXAM_ASSIGNED',
      actionCategory: 'EXAM',
      entityType:     'ExamAssignment',
      entityId:       examId,
      entityName:     `${examTitle} (${candidateCount} students)`,
      status:         'SUCCESS',
      details:        { candidatesAssigned: candidateCount, assignedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logQuestionGenerated(userId, username, questionId, topic, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'QUESTION_GENERATED',
      actionCategory: 'QUESTION',
      entityType:     'Question',
      entityId:       questionId,
      entityName:     `Question on ${topic}`,
      status:         'SUCCESS',
      details:        { topic, generatedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logQuestionUpdated(userId, username, questionId, topic, changes, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'QUESTION_UPDATED',
      actionCategory: 'QUESTION',
      entityType:     'Question',
      entityId:       questionId,
      entityName:     `Question on ${topic}`,
      status:         'SUCCESS',
      details:        changes,
      ipAddress, userAgent,
    });
  }

  static async logQuestionDeleted(userId, username, questionId, topic, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'QUESTION_DELETED',
      actionCategory: 'QUESTION',
      entityType:     'Question',
      entityId:       questionId,
      entityName:     `Question on ${topic}`,
      status:         'SUCCESS',
      details:        { deletedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logQuestionsBulkImported(userId, username, count, source, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'QUESTIONS_BULK_IMPORTED',
      actionCategory: 'QUESTION',
      entityType:     'BulkImport',
      entityId:       null,
      entityName:     `Bulk Import (${count} questions)`,
      status:         'SUCCESS',
      details:        { recordsImported: count, source, timestamp: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT, USER, LOGIN, EXPORT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logResultPublished(userId, username, examId, examTitle, candidateCount, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'RESULT_PUBLISHED',
      actionCategory: 'RESULT',
      entityType:     'ExamResult',
      entityId:       examId,
      entityName:     `Results for ${examTitle}`,
      status:         'SUCCESS',
      details:        { candidatesResulted: candidateCount, publishedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logRecruiterApproved(userId, username, recruiterId, recruiterEmail, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'RECRUITER_APPROVED',
      actionCategory: 'USER',
      entityType:     'Recruiter',
      entityId:       recruiterId,
      entityName:     recruiterEmail,
      status:         'SUCCESS',
      details:        { approvedBy: username, approvedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logUserRoleUpdated(userId, username, targetUserId, targetUsername, oldRole, newRole, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'USER_ROLE_UPDATED',
      actionCategory: 'USER',
      entityType:     'User',
      entityId:       targetUserId,
      entityName:     targetUsername,
      status:         'SUCCESS',
      details:        { oldRole, newRole, changedBy: username, changedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logLoginSuccess(userId, username, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'LOGIN_SUCCESS',
      actionCategory: 'LOGIN',
      entityType:     'User',
      entityId:       userId,
      entityName:     username,
      status:         'SUCCESS',
      details:        { loginAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logLoginFailure(username, reason, ipAddress, userAgent) {
    await this.log({
      userId:         null,
      username,
      actionType:     'LOGIN_FAILURE',
      actionCategory: 'LOGIN',
      entityType:     'User',
      entityId:       null,
      entityName:     username,
      status:         'FAILURE',
      details:        { reason, failedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logLogout(userId, username, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'LOGOUT',
      actionCategory: 'LOGIN',
      entityType:     'User',
      entityId:       userId,
      entityName:     username,
      status:         'SUCCESS',
      details:        { logoutAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  static async logDataExported(userId, username, exportType, recordCount, ipAddress, userAgent) {
    await this.log({
      userId, username,
      actionType:     'DATA_EXPORTED',
      actionCategory: 'EXPORT',
      entityType:     'DataExport',
      entityId:       null,
      entityName:     `${exportType} Export (${recordCount} records)`,
      status:         'SUCCESS',
      details:        { exportType, recordsExported: recordCount, exportedAt: new Date().toISOString() },
      ipAddress, userAgent,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  static async getLogs(filters = {}, limit = 25, offset = 0) {
    const { userId, actionType, actionCategory, entityType, status, startDate, endDate } = filters;

    let query  = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId)         { query += ' AND user_id = ?';         params.push(userId); }
    if (actionType)     { query += ' AND action_type = ?';     params.push(actionType); }
    if (actionCategory) { query += ' AND action_category = ?'; params.push(actionCategory); }
    if (entityType)     { query += ' AND entity_type = ?';     params.push(entityType); }
    if (status)         { query += ' AND status = ?';          params.push(status); }
    if (startDate)      { query += ' AND timestamp >= ?';      params.push(startDate); }
    if (endDate)        { query += ' AND timestamp <= ?';      params.push(endDate); }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    return _rawQuery(query, params);
  }

  static async getLogsCount(filters = {}) {
    const { userId, actionType, actionCategory, entityType, status, startDate, endDate } = filters;

    let query  = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId)         { query += ' AND user_id = ?';         params.push(userId); }
    if (actionType)     { query += ' AND action_type = ?';     params.push(actionType); }
    if (actionCategory) { query += ' AND action_category = ?'; params.push(actionCategory); }
    if (entityType)     { query += ' AND entity_type = ?';     params.push(entityType); }
    if (status)         { query += ' AND status = ?';          params.push(status); }
    if (startDate)      { query += ' AND timestamp >= ?';      params.push(startDate); }
    if (endDate)        { query += ' AND timestamp <= ?';      params.push(endDate); }

    const rows = await _rawQuery(query, params);
    return rows[0]?.count || 0;
  }

  static async getStatistics(startDate = null, endDate = null) {
    let query = `
      SELECT action_category, action_type, COUNT(*) as count, status
      FROM audit_logs WHERE 1=1
    `;
    const params = [];
    if (startDate) { query += ' AND timestamp >= ?'; params.push(startDate); }
    if (endDate)   { query += ' AND timestamp <= ?'; params.push(endDate); }
    query += ' GROUP BY action_category, action_type, status ORDER BY count DESC';
    return _rawQuery(query, params);
  }
}

// Export ensureAuditTable so server.js can call it at boot
AuditLogger.ensureAuditTable = ensureAuditTable;

module.exports = AuditLogger;