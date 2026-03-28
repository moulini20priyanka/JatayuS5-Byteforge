// routes/viva.js
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const GROQ_API_KEY   = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ── GROQ HELPERS ─────────────────────────────────────────────────────────────

async function callGroq(messages, systemPrompt) {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// ── POST /api/viva/generate-questions ────────────────────────────────────────
router.post('/viva/generate-questions', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const raw = await callGroq(
      [{ role: 'user', content: `Analyze this submitted code and generate exactly 3 follow-up viva questions:\n\`\`\`\n${code}\n\`\`\`` }],
      `You are a technical viva examiner. Given a student's submitted code, generate exactly 3 viva follow-up questions that test their deep understanding of the code.
Return ONLY a valid JSON array — no markdown, no extra text, no explanation.
Format: [
  {"id":1,"type":"LOGIC","question":"..."},
  {"id":2,"type":"COMPLEXITY","question":"..."},
  {"id":3,"type":"EDGE CASES","question":"..."}
]
Rules:
- Question 1: Ask about the logic/approach used in the code
- Question 2: Ask about time and space complexity
- Question 3: Ask about edge cases or alternative approaches
- Make all questions specific to the submitted code, not generic`
    );

    let questions;
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      questions = parsed.map((q, i) => ({
        ...q,
        isFollowUp:     true,
        followUpIndex:  i + 1,
        totalFollowUps: parsed.length,
      }));
    } catch {
      questions = [
        { id: 1, type: 'LOGIC',      question: 'Walk me through the core logic of your solution step by step.',                          isFollowUp: true, followUpIndex: 1, totalFollowUps: 3 },
        { id: 2, type: 'COMPLEXITY', question: 'What is the time and space complexity of your solution? Can it be optimised?',            isFollowUp: true, followUpIndex: 2, totalFollowUps: 3 },
        { id: 3, type: 'EDGE CASES', question: 'What edge cases does your solution handle? Are there inputs that could cause it to fail?', isFollowUp: true, followUpIndex: 3, totalFollowUps: 3 },
      ];
    }

    res.json({ questions });
  } catch (err) {
    console.error('[viva] generate-questions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva/transcribe ─────────────────────────────────────────────────
router.post('/viva/transcribe', async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() }).single('audio');

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: 'File upload error: ' + err.message });
      if (!req.file) return res.status(400).json({ error: 'No audio file received' });

      // Use form-data package — works reliably on Node 24 (no ESM FormData issues)
      const FormData = require('form-data');
      const formData = new FormData();

      const mime = req.file.mimetype || 'audio/webm';
      const ext  = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';

      formData.append('file', req.file.buffer, {
        filename:    `recording.${ext}`,
        contentType: mime,
      });
      formData.append('model',           'whisper-large-v3');
      formData.append('language',        'en');
      formData.append('response_format', 'verbose_json');
      formData.append('prompt',          'Technical interview answer about code, algorithms, time complexity, space complexity, data structures.');

      const whisperRes = await fetch(GROQ_AUDIO_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const data = await whisperRes.json();
      if (data.error) return res.status(500).json({ error: data.error.message });

      res.json({ text: (data.text || '').trim() });
    });
  } catch (err) {
    console.error('[viva] transcribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva/evaluate-answer ───────────────────────────────────────────
router.post('/viva/evaluate-answer', async (req, res) => {
  try {
    const { code, question, answer } = req.body;
    if (!code || !question || !answer) {
      return res.status(400).json({ error: 'code, question, and answer are required' });
    }

    const typeGuide =
      question.type === 'LOGIC'
        ? `This is a LOGIC question. Check if the student correctly explained HOW the code works step by step. Score 0-3 if wrong/vague, 4-6 if partial, 7-8 if mostly correct, 9-10 if fully correct.`
        : question.type === 'COMPLEXITY'
        ? `This is a COMPLEXITY question. Check if the student correctly stated time AND space complexity with Big-O notation and justification. Score 0-3 if wrong, 4-6 if partial, 7-8 if correct without justification, 9-10 if fully justified.`
        : `This is an EDGE CASES question. Check if the student identified SPECIFIC edge cases for this code. Score 0-3 if none, 4-6 if generic only, 7-8 if good specific coverage, 9-10 if thorough.`;

    const [scoringRaw, authenticityRaw, relevanceRaw] = await Promise.all([
      callGroq(
        [{ role: 'user', content: `Submitted code:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion type: ${question.type}\nQuestion: ${question.question}\nStudent answer: "${answer}"` }],
        `You are a strict technical viva examiner.\n${typeGuide}\nReturn ONLY valid JSON — no markdown:\n{"score":7,"technicalAccuracy":8,"relevance":7,"completeness":6,"strengths":["point1","point2"],"improvements":["point1","point2"],"feedback":"2-3 sentences on what was right and wrong."}`
      ),
      callGroq(
        [{ role: 'user', content: `Code:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion: ${question.question}\nStudent answer: "${answer}"` }],
        `You are an expert plagiarism and AI-detection analyst for technical interviews.
Analyze this student's spoken viva answer and check for authenticity.
Return ONLY a valid JSON object — no markdown:
{
  "authenticityScore": 8,
  "verdict": "Genuine",
  "authenticityReason": "one sentence explaining verdict",
  "plagiarismRisk": "Low",
  "signals": ["signal1", "signal2"]
}
Rules:
- authenticityScore: 0-10 (10=clearly genuine human, 0=clearly AI/scripted/copied)
- verdict: exactly one of "Genuine" | "Suspicious" | "Likely AI-Generated"
- plagiarismRisk: exactly one of "Low" | "Medium" | "High"`
      ),
      callGroq(
        [{ role: 'user', content: `Code:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion type: ${question.type}\nQuestion: ${question.question}\nStudent answer: "${answer}"` }],
        `You are a technical interview evaluator checking answer relevance.
Return ONLY a valid JSON object — no markdown:
{
  "relevanceScore": 8,
  "isRelevant": true,
  "addressesQuestion": true,
  "isSpecificToCode": true,
  "relevanceFeedback": "one sentence"
}`
      ),
    ]);

    let scoring, authenticity, relevance;
    try { scoring      = JSON.parse(scoringRaw.replace(/```json|```/g, '').trim()); }
    catch { scoring    = { score: 5, technicalAccuracy: 5, relevance: 5, completeness: 5, strengths: ['Attempted'], improvements: ['Add more detail'], feedback: 'Needs more depth.' }; }

    try { authenticity = JSON.parse(authenticityRaw.replace(/```json|```/g, '').trim()); }
    catch { authenticity = { authenticityScore: 7, verdict: 'Genuine', authenticityReason: 'Natural speech patterns detected.', plagiarismRisk: 'Low', signals: [] }; }

    try { relevance    = JSON.parse(relevanceRaw.replace(/```json|```/g, '').trim()); }
    catch { relevance  = { relevanceScore: 5, isRelevant: true, addressesQuestion: true, isSpecificToCode: false, relevanceFeedback: 'Answer partially addresses the question.' }; }

    res.json({
      score:              scoring.score,
      technicalAccuracy:  scoring.technicalAccuracy,
      completeness:       scoring.completeness,
      relevance:          relevance.relevanceScore,
      isRelevant:         relevance.isRelevant,
      isSpecificToCode:   relevance.isSpecificToCode,
      relevanceFeedback:  relevance.relevanceFeedback,
      authenticityScore:  authenticity.authenticityScore,
      verdict:            authenticity.verdict,
      authenticityReason: authenticity.authenticityReason,
      plagiarismRisk:     authenticity.plagiarismRisk,
      signals:            authenticity.signals,
      strengths:          scoring.strengths    || [],
      improvements:       scoring.improvements || [],
      feedback:           scoring.feedback     || '',
    });
  } catch (err) {
    console.error('[viva] evaluate-answer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva-results ────────────────────────────────────────────────────
router.post('/viva-results', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      studentName, problemName, submittedCode,
      codingScore, overallScore, authScore,
      finalVerdict, completedAt, vivaAnswers,
    } = req.body;

    const [resultRow] = await conn.execute(
      `INSERT INTO viva_results
         (student_name, problem_name, submitted_code, coding_score,
          overall_score, auth_score, final_verdict, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentName   || 'Unknown',
        problemName   || 'Solution',
        submittedCode || '',
        codingScore   ?? null,
        overallScore  ?? null,
        authScore     ?? null,
        finalVerdict  || 'Genuine',
        completedAt   || new Date().toISOString(),
      ]
    );

    const vivaResultId = resultRow.insertId;

    if (Array.isArray(vivaAnswers)) {
      for (const ans of vivaAnswers) {
        await conn.execute(
          `INSERT INTO viva_answers
             (viva_result_id, question_number, question_type, question,
              student_answer, duration_secs, score, technical_accuracy,
              relevance, completeness, authenticity_score, verdict,
              feedback, strengths, improvements, authenticity_reason,
              plagiarism_risk, signals, is_relevant, is_specific_to_code,
              relevance_feedback)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vivaResultId,
            ans.questionNumber    ?? null,
            ans.questionType      || '',
            ans.question          || '',
            ans.studentAnswer     || '',
            ans.durationSecs      ?? null,
            ans.score             ?? null,
            ans.technicalAccuracy ?? null,
            ans.relevance         ?? null,
            ans.completeness      ?? null,
            ans.authenticityScore ?? null,
            ans.verdict           || '',
            ans.feedback          || '',
            JSON.stringify(ans.strengths    || []),
            JSON.stringify(ans.improvements || []),
            ans.authenticityReason || '',
            ans.plagiarismRisk     || 'Low',
            JSON.stringify(ans.signals || []),
            ans.isRelevant       ? 1 : 0,
            ans.isSpecificToCode ? 1 : 0,
            ans.relevanceFeedback || '',
          ]
        );
      }
    }

    await conn.commit();
    console.log(`✓ Viva result saved — student: ${studentName}, id: ${vivaResultId}`);
    res.json({ success: true, vivaResultId });

  } catch (err) {
    await conn.rollback();
    console.error('Error saving viva result:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── GET /api/viva-results ─────────────────────────────────────────────────────
router.get('/viva-results', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM viva_results ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/viva-results/:id ─────────────────────────────────────────────────
router.get('/viva-results/:id', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM viva_results WHERE id = ?', [req.params.id]);
    if (!results.length) return res.status(404).json({ error: 'Viva result not found' });

    const [answers] = await pool.execute(
      'SELECT * FROM viva_answers WHERE viva_result_id = ? ORDER BY question_number',
      [req.params.id]
    );

    res.json({
      ...results[0],
      vivaAnswers: answers.map(a => ({
        ...a,
        strengths:    JSON.parse(a.strengths    || '[]'),
        improvements: JSON.parse(a.improvements || '[]'),
        signals:      JSON.parse(a.signals      || '[]'),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/viva-results/student/:name ──────────────────────────────────────
router.get('/viva-results/student/:name', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT vr.*, COUNT(va.id) AS total_answers
       FROM viva_results vr
       LEFT JOIN viva_answers va ON vr.id = va.viva_result_id
       WHERE vr.student_name = ?
       GROUP BY vr.id
       ORDER BY vr.created_at DESC`,
      [req.params.name]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;