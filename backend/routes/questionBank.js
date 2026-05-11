// routes/questionBank.js
// GET    /api/question-bank                        — list individual questions
// GET    /api/question-bank/sessions               — list QB sessions
// GET    /api/question-bank/sessions/:code         — preview one session's questions
// GET    /api/question-bank/sessions/:code/pdf     — download session as PDF (server-side)
// POST   /api/question-bank/import                 — save AI questions + create/update session
// DELETE /api/question-bank/sessions/:code         — soft-delete a whole session
// DELETE /api/question-bank/sessions/:code/:qbId   — soft-delete ONE question from a session
// DELETE /api/question-bank/:id                    — soft-delete one question by id/qb_id
// GET    /api/question-bank/stats                  — type breakdown counts
// GET    /api/question-bank/exam-names             — list distinct exam names for CreateExam picker
// GET    /api/exam-requests/approved               — list approved requests for exam name suggestions
//
// AUDIT LOG ADDITIONS:
//   • POST /api/question-bank/import  → logQuestionsBulkImported after successful commit

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditLogger = require('../services/auditLogger'); // ← ADDED
console.log('✅ questionBank.js — AuditLogger loaded:', typeof AuditLogger.logQuestionsBulkImported);

// ── Helpers ───────────────────────────────────────────────────────────────────

function genQbId() {
  return 'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function genSessionCode() {
  return 'QBS-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function normaliseAnswer(q) {
  const raw = (
    q.answer || q.correct_ans || q.correctAnswer ||
    q.correct_answer || q.correct || ''
  ).toString().trim();
  const match = raw.match(/^([A-Da-d])/);
  return match ? match[1].toUpperCase() : null;
}

function normaliseOptions(q) {
  if (Array.isArray(q.options) && q.options.length > 0) {
    if (typeof q.options[0] === 'object') {
      return {
        option_a: q.options[0]?.text || q.options[0]?.value || null,
        option_b: q.options[1]?.text || q.options[1]?.value || null,
        option_c: q.options[2]?.text || q.options[2]?.value || null,
        option_d: q.options[3]?.text || q.options[3]?.value || null,
      };
    }
    return {
      option_a: q.options[0] || null,
      option_b: q.options[1] || null,
      option_c: q.options[2] || null,
      option_d: q.options[3] || null,
    };
  }
  if (q.option_a || q.option_b) {
    return {
      option_a: q.option_a || null, option_b: q.option_b || null,
      option_c: q.option_c || null, option_d: q.option_d || null,
    };
  }
  return { option_a: null, option_b: null, option_c: null, option_d: null };
}

// ── Parse coding explanation blob ─────────────────────────────────────────────
function parseCodingExplanation(explanationStr) {
  if (!explanationStr) return null;
  try {
    const parsed = JSON.parse(explanationStr);
    if (parsed && typeof parsed === 'object' && parsed.starterCode) return parsed;
  } catch (_) { /* not JSON */ }
  return null;
}

// ── Helper: extract IP + user-agent from request ──────────────────────────────
function getClientInfo(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim()
               || req.connection?.remoteAddress
               || 'Unknown',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

// ── GET /api/question-bank/sessions ──────────────────────────────────────────
router.get(
  '/question-bank/sessions',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const [tableCheck] = await db.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_sessions'`
      );
      if (tableCheck[0].cnt === 0) return res.json({ sessions: [] });

      const [rows] = await db.query(
        `SELECT
           qbs.id, qbs.session_code, qbs.exam_name, qbs.exam_type,
           qbs.types, qbs.topics_summary, qbs.total_questions,
           qbs.difficulty, qbs.created_at, qbs.exam_request_id,
           er.company_name, er.job_role,
           COUNT(DISTINCT qb.id) AS live_count
         FROM question_bank_sessions qbs
         LEFT JOIN question_bank qb
           ON (qb.session_id = qbs.id OR qb.session_code = qbs.session_code)
           AND qb.is_active = 1
         LEFT JOIN exam_requests er ON er.id = qbs.exam_request_id
         WHERE qbs.is_active = 1
         GROUP BY qbs.id
         ORDER BY qbs.created_at DESC`
      );

      res.json({
        sessions: rows.map(r => ({
          id:             r.id,
          sessionCode:    r.session_code,
          examName:       r.exam_name,
          examType:       r.exam_type || 'placement',
          types:          typeof r.types === 'string' ? JSON.parse(r.types || '[]') : (r.types || []),
          topicsSummary:  r.topics_summary || '',
          totalQuestions: r.live_count || r.total_questions || 0,
          difficulty:     r.difficulty || 'mixed',
          createdAt:      r.created_at,
          companyName:    r.company_name || null,
          jobRole:        r.job_role || null,
          examRequestId:  r.exam_request_id || null,
        })),
      });
    } catch (err) {
      console.error('[QB Sessions]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/question-bank/sessions/:code — preview ──────────────────────────
router.get(
  '/question-bank/sessions/:code',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const [sessions] = await db.query(
        `SELECT * FROM question_bank_sessions WHERE session_code = ? AND is_active = 1`,
        [req.params.code]
      );
      if (!sessions.length) return res.status(404).json({ error: 'Session not found' });
      const session = sessions[0];

      const [questions] = await db.query(
        `SELECT
           id, qb_id, topic, question_text, type, difficulty,
           option_a, option_b, option_c, option_d, correct_ans,
           explanation, created_at
         FROM question_bank
         WHERE (session_id = ? OR session_code = ?) AND is_active = 1
         ORDER BY type, topic, id`,
        [session.id, session.session_code]
      );

      const grouped = {};
      for (const q of questions) {
        const t = q.type || 'mcq';
        if (!grouped[t]) grouped[t] = [];

        const codingMeta = q.type === 'coding' ? parseCodingExplanation(q.explanation) : null;

        grouped[t].push({
          id:           q.qb_id,
          dbId:         q.id,
          topic:        q.topic,
          question:     q.question_text,
          type:         q.type,
          difficulty:   q.difficulty,
          options:      [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
          answer:       q.correct_ans,
          explanation:  codingMeta || q.explanation,
          ...(codingMeta ? {
            description:     codingMeta.description,
            constraints:     codingMeta.constraints,
            sampleCases:     codingMeta.sampleCases,
            starterCode:     codingMeta.starterCode,
            platform:        codingMeta.platform,
            timeComplexity:  codingMeta.timeComplexity,
            spaceComplexity: codingMeta.spaceComplexity,
          } : {}),
        });
      }

      const topicBreakdown = {};
      for (const q of questions) {
        const key = `${q.type}::${q.topic}`;
        if (!topicBreakdown[key]) topicBreakdown[key] = { type: q.type, topic: q.topic, count: 0 };
        topicBreakdown[key].count++;
      }

      res.json({
        session: {
          id:             session.id,
          sessionCode:    session.session_code,
          examName:       session.exam_name,
          types:          typeof session.types === 'string' ? JSON.parse(session.types || '[]') : (session.types || []),
          topicsSummary:  session.topics_summary,
          totalQuestions: questions.length,
          difficulty:     session.difficulty,
          createdAt:      session.created_at,
        },
        grouped,
        topicBreakdown: Object.values(topicBreakdown),
        totalByType:    Object.entries(grouped).map(([type, qs]) => ({ type, count: qs.length })),
      });
    } catch (err) {
      console.error('[QB Session Preview]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/question-bank/sessions/:code/:qbId — remove one question ─────
router.delete(
  '/question-bank/sessions/:code/:qbId',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { code, qbId } = req.params;

      const [result] = await db.query(
        `UPDATE question_bank
         SET is_active = 0
         WHERE qb_id = ? AND session_code = ?`,
        [qbId, code]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Question not found in this session' });
      }

      await db.query(
        `UPDATE question_bank_sessions qbs
         SET total_questions = (
           SELECT COUNT(*) FROM question_bank
           WHERE (session_id = qbs.id OR session_code = qbs.session_code) AND is_active = 1
         )
         WHERE session_code = ?`,
        [code]
      );

      res.json({ success: true, qbId, sessionCode: code });
    } catch (err) {
      console.error('[QB Delete Question from Session]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/question-bank/import ───────────────────────────────────────────
// AUDIT: logs QUESTIONS_BULK_IMPORTED after a successful commit
router.post(
  '/question-bank/import',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    const {
      questions: incoming,
      examName,
      sessionCode: providedCode,
      examRequestId,
      difficulty,
    } = req.body;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: 'questions array is required and must not be empty' });
    }
    if (!examName || !examName.trim()) {
      return res.status(400).json({ error: 'examName is required' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const sessionCode = providedCode || genSessionCode();
      const typeSet     = new Set(incoming.map(q => (q.type || 'mcq').toLowerCase()));
      const topicSet    = new Set(incoming.map(q => q.topic).filter(Boolean));
      const typesList   = JSON.stringify([...typeSet]);
      const topicsStr   = [...topicSet].slice(0, 10).join(', ');

      const [tblCheck] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_sessions'`
      );

      let sessionId = null;
      if (tblCheck[0].cnt > 0) {
        const [sessResult] = await conn.query(
          `INSERT INTO question_bank_sessions
             (session_code, exam_name, exam_type, exam_request_id, types, topics_summary,
              total_questions, difficulty, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sessionCode, examName.trim(),
            (req.body.examType || 'placement').toLowerCase(),
            examRequestId || null, typesList, topicsStr,
            incoming.length, difficulty || 'mixed', req.user.id,
          ]
        );
        sessionId = sessResult.insertId;
      }

      const rows = incoming.map(q => {
        const type  = (q.type || 'mcq').toLowerCase();
        const qText = (q.question || q.question_text || q.text || q.problem || q.title || q.prompt || '').toString().trim();
        const opts  = normaliseOptions(q);
        const diff  = (q.difficulty || 'medium').toLowerCase();
        const topic = (q.topic || qText.substring(0, 100)).trim() || 'General';

        return [
          genQbId(), topic, qText, type, diff,
          opts.option_a, opts.option_b, opts.option_c, opts.option_d,
          normaliseAnswer(q),
          (q.explanation || '').toString().trim() || null,
          null, topic.substring(0, 100), 'NeuroGenerate AI',
          req.user.id, 1, sessionId, examName.trim(), sessionCode,
        ];
      });

      await conn.query(
        `INSERT INTO question_bank
           (qb_id, topic, question_text, type, difficulty,
            option_a, option_b, option_c, option_d,
            correct_ans, explanation,
            language_tag, topic_tag, source, created_by, is_active,
            session_id, exam_name, session_code)
         VALUES ?`,
        [rows]
      );

      await conn.commit();
      console.log(`[QB Import] Session=${sessionCode} ExamName="${examName}" Questions=${rows.length}`);

      // ── AUDIT LOG: question bank created ─────────────────────────────────
      try {
        const { ipAddress, userAgent } = getClientInfo(req);
        await AuditLogger.logQuestionsBulkImported(
          req.user.id,
          req.user.username || req.user.email || 'Unknown',
          rows.length,
          `Question Bank — ${examName.trim()} (session: ${sessionCode})`,
          ipAddress,
          userAgent,
        );
        console.log(`[AuditLogger] ✅ QUESTIONS_BULK_IMPORTED logged — ${rows.length} questions, session ${sessionCode}`);
      } catch (auditErr) {
        console.error('[AuditLogger] ❌ logQuestionsBulkImported failed:', auditErr.message);
      }
      // ─────────────────────────────────────────────────────────────────────

      res.status(201).json({
        success: true, imported: rows.length, count: rows.length,
        sessionCode, examName: examName.trim(), sessionId,
      });
    } catch (err) {
      await conn.rollback();
      console.error('[QB Import]', err);
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ── DELETE /api/question-bank/sessions/:code ─────────────────────────────────
router.delete(
  '/question-bank/sessions/:code',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE question_bank_sessions SET is_active = 0 WHERE session_code = ?`,
        [req.params.code]
      );
      await conn.query(
        `UPDATE question_bank SET is_active = 0 WHERE session_code = ?`,
        [req.params.code]
      );
      await conn.commit();
      res.json({ success: true, sessionCode: req.params.code });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ── GET /api/question-bank/exam-names ────────────────────────────────────────
router.get(
  '/question-bank/exam-names',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const [tblCheck] = await db.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_sessions'`
      );

      let qbEntries = [];
      if (tblCheck[0].cnt > 0) {
        const [rows] = await db.query(
          `SELECT session_code, exam_name, types, total_questions, created_at
           FROM question_bank_sessions
           WHERE is_active = 1
           ORDER BY created_at DESC`
        );
        qbEntries = rows.map(r => ({
          sessionCode:    r.session_code,
          examName:       r.exam_name,
          types:          typeof r.types === 'string' ? JSON.parse(r.types || '[]') : (r.types || []),
          totalQuestions: r.total_questions,
          createdAt:      r.created_at,
        }));
      }

      const [requests] = await db.query(
        `SELECT id, title, job_role, company_name, target_college, target_batch_year,
                section_config, sectional_cutoffs, sectional_cutoff_required,
                eligibility_criteria, schedule_date, schedule_time
         FROM exam_requests WHERE status = 'approved' ORDER BY created_at DESC LIMIT 20`
      );

      res.json({
        qbSessions: qbEntries,
        approvedRequests: requests.map(r => ({
          id:            r.id,
          title:         r.title || `${r.job_role} — ${r.company_name}`,
          jobRole:       r.job_role,
          companyName:   r.company_name,
          college:       r.target_college,
          batchYear:     r.target_batch_year,
          sectionConfig: typeof r.section_config === 'string' ? JSON.parse(r.section_config || '{}') : (r.section_config || {}),
          cutoffs:       typeof r.sectional_cutoffs === 'string' ? JSON.parse(r.sectional_cutoffs || '{}') : (r.sectional_cutoffs || {}),
          cutoffRequired: !!r.sectional_cutoff_required,
          eligibility:   typeof r.eligibility_criteria === 'string' ? JSON.parse(r.eligibility_criteria || '{}') : (r.eligibility_criteria || {}),
          scheduleDate:  r.schedule_date,
          scheduleTime:  r.schedule_time,
        })),
      });
    } catch (err) {
      console.error('[QB ExamNames]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/question-bank/stats ─────────────────────────────────────────────
router.get(
  '/question-bank/stats',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const [byType] = await db.query(
        `SELECT type, COUNT(*) AS count FROM question_bank
         WHERE is_active = 1 GROUP BY type ORDER BY count DESC`
      );
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM question_bank WHERE is_active = 1`
      );
      res.json({ total, breakdown: byType });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/question-bank ────────────────────────────────────────────────────
router.get(
  '/question-bank',
  authenticateToken,
  requireRole('admin', 'recruiter'),
  async (req, res) => {
    try {
      const { type, difficulty, search, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let where    = 'WHERE is_active = 1';
      const params = [];

      if (type && type !== 'All') {
        where += ' AND type = ?';
        params.push(type.toLowerCase());
      }
      if (difficulty && difficulty !== 'All') {
        where += ' AND difficulty = ?';
        params.push(difficulty.toLowerCase());
      }
      if (search) {
        where += ' AND (topic LIKE ? OR question_text LIKE ? OR qb_id LIKE ? OR exam_name LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM question_bank ${where}`, params
      );

      const [rows] = await db.query(
        `SELECT id, qb_id, type, topic, difficulty, source, exam_name, session_code, created_at,
                LEFT(question_text, 120) AS question_preview
         FROM question_bank ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );

      const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

      res.json({
        questions: rows.map(r => ({
          id:          r.qb_id || r.id,
          db_id:       r.id,
          topic:       r.topic || '—',
          type:        r.type === 'mcq' ? 'MCQ' : cap(r.type || ''),
          difficulty:  cap(r.difficulty || 'medium'),
          source:      r.source || 'Manual',
          examName:    r.exam_name || '—',
          sessionCode: r.session_code || null,
          createdDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—',
        })),
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/question-bank/:id ────────────────────────────────────────────
router.delete(
  '/question-bank/:id',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const isQbId    = isNaN(req.params.id);
      const col       = isQbId ? 'qb_id' : 'id';
      const [result]  = await db.query(
        `UPDATE question_bank SET is_active = 0 WHERE ${col} = ?`,
        [req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;