/**
 * Audit Logger Service — SQL Server version
 */

const db = require('../config/db');

// ── One-time startup check — creates audit_logs if it doesn't exist ───────────
async function ensureAuditTable() {
  const createSQL = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' AND xtype='U')
    CREATE TABLE audit_logs (
      id              INT IDENTITY(1,1) PRIMARY KEY,
      user_id         INT           DEFAULT NULL,
      username        VARCHAR(255)  NOT NULL DEFAULT 'System',
      action_type     VARCHAR(100)  NOT NULL,
      action_category VARCHAR(100)  NOT NULL,
      entity_type     VARCHAR(100)  DEFAULT NULL,
      entity_id       VARCHAR(100)  DEFAULT NULL,
      entity_name     VARCHAR(500)  DEFAULT NULL,
      status          VARCHAR(50)   NOT NULL DEFAULT 'SUCCESS',
      details         NVARCHAR(MAX) DEFAULT NULL,
      ip_address      VARCHAR(100)  DEFAULT 'Unknown',
      user_agent      NVARCHAR(MAX) DEFAULT NULL,
      timestamp       DATETIME      NOT NULL DEFAULT GETDATE()
    )
  `;
  try {
    await _rawQuery(createSQL, []);
    console.log('[AuditLogger] ✅ audit_logs table ready');
  } catch (err) {
    console.error('[AuditLogger] ❌ Could not create audit_logs table:', err.message);
  }
}

// ── Internal raw query ────────────────────────────────────────────────────────
function _rawQuery(sql, params) {
  try {
    const result = db.query(sql, params);
    if (result && typeof result.then === 'function') {
      return result.then(([rows]) => rows);
    }
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

    // SQL Server: GETDATE() instead of NOW()
    const sql = `
      INSERT INTO audit_logs
        (user_id, username, action_type, action_category,
         entity_type, entity_id, entity_name, status,
         details, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
    `;
    const params = [
      userId,
      username,
      actionType,
      actionCategory,
      entityType,
      entityId   !== null ? String(entityId) : null,
      entityName !== null ? String(entityName).substring(0, 490) : null,
      status,
      JSON.stringify(details),
      ipAddress,
      userAgent ? String(userAgent).substring(0, 500) : null,
    ];

    try {
      await _rawQuery(sql, params);
      console.log(`[AuditLog] ✅ ${actionType} by "${username}" → ${entityName || '—'}`);
    } catch (err) {
      console.error(`[AuditLog] ❌ INSERT failed (${actionType}):`, err.message);
      throw err;
    }
  }

  static async _query(sql, params = []) {
    return _rawQuery(sql, params);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANDIDATE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logCandidateCreated(userId, username, candidateData, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'CANDIDATE_CREATED', actionCategory:'CANDIDATE', entityType:'Candidate', entityId:candidateData.id, entityName:`${candidateData.name} (${candidateData.email})`, status:'SUCCESS', details:{ email:candidateData.email, name:candidateData.name, college:candidateData.college, branch:candidateData.branch, batch:candidateData.batch }, ipAddress, userAgent });
  }

  static async logCandidateStatusChanged(userId, username, candidateId, candidateName, oldStatus, newStatus, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'CANDIDATE_STATUS_CHANGED', actionCategory:'CANDIDATE', entityType:'Candidate', entityId:candidateId, entityName:candidateName, status:'SUCCESS', details:{ oldStatus, newStatus, changedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logCandidateBulkImport(userId, username, count, filePath, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'CANDIDATES_BULK_IMPORTED', actionCategory:'CANDIDATE', entityType:'BulkImport', entityId:null, entityName:`Bulk Import (${count} candidates)`, status:'SUCCESS', details:{ recordsImported:count, filePath, timestamp:new Date().toISOString() }, ipAddress, userAgent });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXAM EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logExamCreated(userId, username, examData, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_CREATED', actionCategory:'EXAM', entityType:'Exam', entityId:examData.id, entityName:examData.title||examData.name||`Exam #${examData.id}`, status:'SUCCESS', details:{ examType:examData.exam_type, college:examData.college, totalMarks:examData.total_marks, durationMinutes:examData.duration_minutes, createdAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logExamApproved(userId, username, examId, examTitle, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_APPROVED', actionCategory:'EXAM', entityType:'Exam', entityId:examId, entityName:examTitle, status:'SUCCESS', details:{ approvedBy:username, approvedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logExamUpdated(userId, username, examId, examTitle, changes, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_UPDATED', actionCategory:'EXAM', entityType:'Exam', entityId:examId, entityName:examTitle, status:'SUCCESS', details:changes, ipAddress, userAgent });
  }

  static async logExamPublished(userId, username, examId, examTitle, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_PUBLISHED', actionCategory:'EXAM', entityType:'Exam', entityId:examId, entityName:examTitle, status:'SUCCESS', details:{ publishedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logExamRequestApproved(userId, username, requestId, requestTitle, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_REQUEST_APPROVED', actionCategory:'EXAM', entityType:'ExamRequest', entityId:requestId, entityName:requestTitle, status:'SUCCESS', details:{ approvedBy:username, approvedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logExamRequestRejected(userId, username, requestId, requestTitle, reason, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_REQUEST_REJECTED', actionCategory:'EXAM', entityType:'ExamRequest', entityId:requestId, entityName:requestTitle, status:'SUCCESS', details:{ rejectedBy:username, reason, rejectedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logExamAssigned(userId, username, examId, examTitle, candidateCount, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'EXAM_ASSIGNED', actionCategory:'EXAM', entityType:'ExamAssignment', entityId:examId, entityName:`${examTitle} (${candidateCount} students)`, status:'SUCCESS', details:{ candidatesAssigned:candidateCount, assignedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logQuestionGenerated(userId, username, questionId, topic, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'QUESTION_GENERATED', actionCategory:'QUESTION', entityType:'Question', entityId:questionId, entityName:`Question on ${topic}`, status:'SUCCESS', details:{ topic, generatedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logQuestionUpdated(userId, username, questionId, topic, changes, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'QUESTION_UPDATED', actionCategory:'QUESTION', entityType:'Question', entityId:questionId, entityName:`Question on ${topic}`, status:'SUCCESS', details:changes, ipAddress, userAgent });
  }

  static async logQuestionDeleted(userId, username, questionId, topic, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'QUESTION_DELETED', actionCategory:'QUESTION', entityType:'Question', entityId:questionId, entityName:`Question on ${topic}`, status:'SUCCESS', details:{ deletedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logQuestionsBulkImported(userId, username, count, source, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'QUESTIONS_BULK_IMPORTED', actionCategory:'QUESTION', entityType:'BulkImport', entityId:null, entityName:`Bulk Import (${count} questions)`, status:'SUCCESS', details:{ recordsImported:count, source, timestamp:new Date().toISOString() }, ipAddress, userAgent });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT, USER, LOGIN, EXPORT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  static async logResultPublished(userId, username, examId, examTitle, candidateCount, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'RESULT_PUBLISHED', actionCategory:'RESULT', entityType:'ExamResult', entityId:examId, entityName:`Results for ${examTitle}`, status:'SUCCESS', details:{ candidatesResulted:candidateCount, publishedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logRecruiterApproved(userId, username, recruiterId, recruiterEmail, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'RECRUITER_APPROVED', actionCategory:'USER', entityType:'Recruiter', entityId:recruiterId, entityName:recruiterEmail, status:'SUCCESS', details:{ approvedBy:username, approvedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logUserRoleUpdated(userId, username, targetUserId, targetUsername, oldRole, newRole, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'USER_ROLE_UPDATED', actionCategory:'USER', entityType:'User', entityId:targetUserId, entityName:targetUsername, status:'SUCCESS', details:{ oldRole, newRole, changedBy:username, changedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logLoginSuccess(userId, username, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'LOGIN_SUCCESS', actionCategory:'LOGIN', entityType:'User', entityId:userId, entityName:username, status:'SUCCESS', details:{ loginAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logLoginFailure(username, reason, ipAddress, userAgent) {
    await this.log({ userId:null, username, actionType:'LOGIN_FAILURE', actionCategory:'LOGIN', entityType:'User', entityId:null, entityName:username, status:'FAILURE', details:{ reason, failedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logLogout(userId, username, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'LOGOUT', actionCategory:'LOGIN', entityType:'User', entityId:userId, entityName:username, status:'SUCCESS', details:{ logoutAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  static async logDataExported(userId, username, exportType, recordCount, ipAddress, userAgent) {
    await this.log({ userId, username, actionType:'DATA_EXPORTED', actionCategory:'EXPORT', entityType:'DataExport', entityId:null, entityName:`${exportType} Export (${recordCount} records)`, status:'SUCCESS', details:{ exportType, recordsExported:recordCount, exportedAt:new Date().toISOString() }, ipAddress, userAgent });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ METHODS — SQL Server pagination (OFFSET/FETCH instead of LIMIT/OFFSET)
  // ═══════════════════════════════════════════════════════════════════════════
  static async getLogs(filters = {}, limit = 25, offset = 0) {
    const { userId, actionType, actionCategory, entityType, status, startDate, endDate } = filters;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId)         { query += ' AND user_id = ?';         params.push(userId); }
    if (actionType)     { query += ' AND action_type = ?';     params.push(actionType); }
    if (actionCategory) { query += ' AND action_category = ?'; params.push(actionCategory); }
    if (entityType)     { query += ' AND entity_type = ?';     params.push(entityType); }
    if (status)         { query += ' AND status = ?';          params.push(status); }
    if (startDate)      { query += ' AND timestamp >= ?';      params.push(startDate); }
    if (endDate)        { query += ' AND timestamp <= ?';      params.push(endDate); }

    // SQL Server: OFFSET/FETCH instead of LIMIT/OFFSET
    query += ` ORDER BY timestamp DESC OFFSET ${parseInt(offset)} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;

    return _rawQuery(query, params);
  }

  static async getLogsCount(filters = {}) {
    const { userId, actionType, actionCategory, entityType, status, startDate, endDate } = filters;

    let query = 'SELECT COUNT(*) AS count FROM audit_logs WHERE 1=1';
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
      SELECT action_category, action_type, COUNT(*) AS count, status
      FROM audit_logs WHERE 1=1
    `;
    const params = [];
    if (startDate) { query += ' AND timestamp >= ?'; params.push(startDate); }
    if (endDate)   { query += ' AND timestamp <= ?'; params.push(endDate); }
    query += ' GROUP BY action_category, action_type, status ORDER BY count DESC';
    return _rawQuery(query, params);
  }
}

AuditLogger.ensureAuditTable = ensureAuditTable;
module.exports = AuditLogger;