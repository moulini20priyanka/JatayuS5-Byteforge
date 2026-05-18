

const express               = require('express');
const router                = express.Router();
const db                    = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter }     = require('../middleware/rateLimiter');
const aiService             = require('../services/ai');


router.post('/generate', authenticateToken, aiRateLimiter, async (req, res) => {
  const {
    agentTopics, questionsPerTopic, difficulty, examId,
    examName, sessionCode, examType, examRequestId,
  } = req.body;

  if (!agentTopics || Object.keys(agentTopics).length === 0) {
    return res.status(400).json({ error: 'agentTopics is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await aiService.generateQuestions(
      {
        agentTopics,
        questionsPerTopic: questionsPerTopic || 3,
        difficulty:        difficulty        || 'medium',
        userId:            req.user?.id      || 1,
        examId:            examId            || null,
        examName:          examName          || null,
        sessionCode:       sessionCode       || null,
        examType:          examType          || 'placement',
        examRequestId:     examRequestId     || null,
      },
      (progressEvent) => send('progress', progressEvent)
    );

    send('complete', {
      questions:   result.questions,
      stats:       result.stats,
      sessionCode: result.sessionCode,
      examName:    result.examName,
    });

  } catch (err) {
    console.error('[AI Route] Error:', err.message);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// GET /api/ai/question-banks
router.get('/question-banks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, qb_id, topic, type, difficulty, source, exam_name, session_code, created_at
       FROM question_bank
       WHERE created_by = ? AND source = 'NeuroGenerate AI' AND is_active = 1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user?.id || 1]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;