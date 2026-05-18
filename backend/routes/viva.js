// ── routes/viva.js ────────────────────────────────────────────────
const express        = require('express');
const router         = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool           = require('../config/db');
const { trace }      = require('../utils/tracer');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const GROQ_API_KEY   = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ── Groq helper — returns { text, usage } ────────────────────────
async function callGroq(messages, systemPrompt, maxTokens = 1200) {
  const res = await fetch(GROQ_CHAT_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text  = data.choices?.[0]?.message?.content || '';
  const usage = data.usage
    ? {
        prompt_tokens:     data.usage.prompt_tokens     || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens:      data.usage.total_tokens      || 0,
      }
    : null;

  return { text, usage };
}

function safeJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── AI Detection score calculator ────────────────────────────────
function computeAIDetectionScore({ verdict, authenticityScore, signals = [], plagiarismRisk }) {
  let score = Math.round((10 - (authenticityScore ?? 5)) * 10);
  if (verdict === 'Likely AI-Generated') score = Math.max(score, 75);
  else if (verdict === 'Suspicious')     score = Math.max(score, 45);
  else if (verdict === 'Genuine')        score = Math.min(score, 35);
  score += (signals?.length || 0) * 4;
  if (plagiarismRisk === 'High')        score += 15;
  else if (plagiarismRisk === 'Medium') score += 7;
  return Math.min(100, Math.max(0, score));
}

// ── POST /api/viva/generate-questions ────────────────────────────
router.post('/viva/generate-questions', async (req, res) => {
  try {
    let { code, exam_id, assignment_id } = req.body;

    // Fetch code from DB if not sent
    if ((!code || code.trim().length < 20) && (exam_id || assignment_id)) {
      try {
        let rows = [];
        if (assignment_id) {
          [rows] = await pool.query(
            `SELECT cs.code, cs.language FROM code_snapshots cs
             WHERE cs.assignment_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
            [assignment_id]
          );
        }
        if (!rows.length && exam_id) {
          [rows] = await pool.query(
            `SELECT ea.answers, e.allowed_languages FROM exam_assignments ea
             JOIN exams e ON e.id = ea.exam_id
             WHERE ea.exam_id = ? AND ea.status = 'submitted'
             ORDER BY ea.submitted_at DESC LIMIT 1`,
            [exam_id]
          );
          if (rows.length && rows[0].answers) {
            const parsed = safeJSON(rows[0].answers, {});
            if (parsed.code_answers) {
              code = Object.values(parsed.code_answers)
                .map(a => `// Language: ${a.lang || 'unknown'}\n${a.code || ''}`)
                .join('\n\n');
            }
          }
        } else if (rows.length && rows[0].code) {
          code = `// Language: ${rows[0].language || 'unknown'}\n${rows[0].code}`;
        }
      } catch (dbErr) {
        console.warn('[viva] DB code fetch skipped:', dbErr.message);
      }
    }

    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const codeForPrompt = code.length > 3000 ? code.slice(0, 3000) + '\n// ... (truncated)' : code;

    // ── Traced question generation ────────────────────────────────
    const questions = await trace(
      {
        name:    'viva-question-generator',
        runType: 'llm',
        inputs:  { codeLength: codeForPrompt.length, exam_id, assignment_id },
        tags:    ['viva', 'groq', 'question-generation'],
      },
      async () => {
        const { text: raw, usage } = await callGroq(
          [{
            role:    'user',
            content: `Analyze this submitted code solution and generate exactly 3 viva follow-up questions:\n\`\`\`\n${codeForPrompt}\n\`\`\``,
          }],
          `You are a senior software engineer conducting a technical viva/oral examination.
Given a student's submitted code solution, generate exactly 3 follow-up viva questions that:
1. Test whether the student WROTE the code themselves (not copy-pasted or AI-generated)
2. Are SPECIFIC to the exact logic, variable names, algorithms, and patterns in this code
3. Would be EASY to answer if they wrote it but HARD if they copied it

Return ONLY valid JSON array — no markdown, no extra text:
[
  {"id":1,"type":"LOGIC","question":"Ask about a specific line/function/pattern in the code"},
  {"id":2,"type":"COMPLEXITY","question":"Ask about the time/space complexity of a specific part"},
  {"id":3,"type":"EDGE CASES","question":"Ask about a specific edge case relevant to this implementation"}
]

CRITICAL RULES:
- Each question MUST reference something specific visible in the submitted code
- Mention actual variable names, function names, or specific logic from the code
- Do NOT generate generic questions that could apply to any solution`,
          1000
        );

        let parsed = null;
        try {
          const p = JSON.parse(raw.replace(/```json|```/g, '').trim());
          parsed = Array.isArray(p) ? p.map((q, i) => ({
            ...q,
            isFollowUp: true, followUpIndex: i + 1, totalFollowUps: p.length,
          })) : null;
        } catch (_) { parsed = null; }

        const result = parsed?.length ? parsed : [
          { id: 1, type: 'LOGIC',      question: 'Walk me through the core logic of your solution step by step.', isFollowUp: true, followUpIndex: 1, totalFollowUps: 3 },
          { id: 2, type: 'COMPLEXITY', question: 'What is the time and space complexity? Justify with reference to your specific loops or data structures.', isFollowUp: true, followUpIndex: 2, totalFollowUps: 3 },
          { id: 3, type: 'EDGE CASES', question: 'What edge cases does your solution handle? Are there any inputs that could cause failure?', isFollowUp: true, followUpIndex: 3, totalFollowUps: 3 },
        ];

        return { __result: result, __usage: usage };
      }
    );

    res.json({ questions });
  } catch (err) {
    console.error('[viva] generate-questions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva/transcribe ─────────────────────────────────────
// Whisper transcription — no token usage (audio API, not chat)
router.post('/viva/transcribe', async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits:  { fileSize: 25 * 1024 * 1024 },
    }).single('audio');

    upload(req, res, async (err) => {
      if (err)      return res.status(400).json({ error: 'File upload error: ' + err.message });
      if (!req.file) return res.status(400).json({ error: 'No audio file received' });

      const FormData = require('form-data');
      const formData = new FormData();
      const mime = req.file.mimetype || 'audio/webm';
      const ext  = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';

      formData.append('file', req.file.buffer, { filename: `recording.${ext}`, contentType: mime });
      formData.append('model',           'whisper-large-v3');
      formData.append('language',        'en');
      formData.append('response_format', 'verbose_json');
      formData.append('prompt',          'Technical interview answer about code, algorithms, time complexity, data structures, edge cases.');

      const whisperRes = await fetch(GROQ_AUDIO_URL, {
        method:  'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, ...formData.getHeaders() },
        body:    formData,
      });

      const data = await whisperRes.json();
      if (data.error) return res.status(500).json({ error: data.error.message });

      res.json({
        text:     (data.text || '').trim(),
        duration: data.duration || null,
        language: data.language || 'en',
      });
    });
  } catch (err) {
    console.error('[viva] transcribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva/evaluate-answer ───────────────────────────────
// 3 parallel Groq calls: scoring + authenticity + relevance
// Each run is traced individually so LangSmith shows them separately
router.post('/viva/evaluate-answer', async (req, res) => {
  try {
    const {
      code, question, answer,
      was_voice_answer  = false,
      replay_count      = 0,
      edited_word_count = 0,
    } = req.body;

    if (!code || !question || !answer) {
      return res.status(400).json({ error: 'code, question, and answer are required' });
    }

    const typeGuide =
      question.type === 'LOGIC'
        ? 'LOGIC question: Check if student correctly explains HOW the code works. Score 0-3 if wrong/vague, 4-6 if partial, 7-8 if mostly correct, 9-10 if fully correct with specific code references.'
        : question.type === 'COMPLEXITY'
        ? 'COMPLEXITY question: Check for correct Big-O with justification. Score 0-3 if wrong, 4-6 partial, 7-8 correct without full justification, 9-10 fully justified.'
        : 'EDGE CASES question: Check for SPECIFIC edge cases relevant to THIS code. Score 0-3 no edge cases, 4-6 generic only, 7-8 good coverage, 9-10 thorough with code-specific awareness.';

    const voiceContext = was_voice_answer
      ? `NOTE: This was a VOICE answer (transcribed by Whisper). Natural hesitations and informal phrasing are EXPECTED. ${replay_count > 0 ? `Student replayed the question ${replay_count} time(s).` : ''}`
      : `NOTE: This was a TYPED answer. ${edited_word_count > 15 ? `Student edited ${edited_word_count} words — high edit count is a minor suspicion signal.` : ''}`;

    const codeTrunc = code.slice(0, 2000);

    // ── Run all 3 evaluations in parallel, each individually traced ──
    const [scoringResult, authenticityResult, relevanceResult] = await Promise.all([

      // 1. Scoring
      trace(
        {
          name:    'viva-scoring',
          runType: 'llm',
          inputs:  { questionType: question.type, answerLength: answer.length },
          tags:    ['viva', 'groq', 'scoring'],
        },
        async () => {
          const { text, usage } = await callGroq(
            [{ role: 'user', content: `Submitted code:\n\`\`\`\n${codeTrunc}\n\`\`\`\n\nQuestion type: ${question.type}\nQuestion: ${question.question}\nStudent answer: "${answer}"` }],
            `You are a strict technical viva examiner. ${typeGuide}\n${voiceContext}\nReturn ONLY valid JSON — no markdown:\n{"score":7,"technicalAccuracy":8,"relevance":7,"completeness":6,"strengths":["point1","point2"],"improvements":["point1","point2"],"feedback":"2-3 sentences on what was right and wrong."}`
          );
          let parsed;
          try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
          catch { parsed = { score: 5, technicalAccuracy: 5, relevance: 5, completeness: 5, strengths: [], improvements: [], feedback: 'Unable to evaluate.' }; }
          return { __result: parsed, __usage: usage };
        }
      ),

      // 2. Authenticity / AI detection
      trace(
        {
          name:    'viva-authenticity',
          runType: 'llm',
          inputs:  { wasVoice: was_voice_answer, answerLength: answer.length },
          tags:    ['viva', 'groq', 'ai-detection'],
        },
        async () => {
          const { text, usage } = await callGroq(
            [{ role: 'user', content: `Code:\n\`\`\`\n${codeTrunc}\n\`\`\`\n\nQuestion: ${question.question}\nAnswer: "${answer}"\n\nContext: ${voiceContext}` }],
            `You are an expert AI-text detector for technical oral examinations.
Analyze the student's answer for signs of AI generation vs genuine human response.

GENUINE HUMAN SIGNALS: informal language, hesitations ("um", "so basically", "I think"), self-corrections,
personal references ("during coding I noticed"), incomplete sentences, specific references
to their own code that only someone who wrote it would know.

AI GENERATION SIGNALS: overly formal academic phrasing ("the algorithm employs", "wherein"),
perfect sentence structure, exhaustive bullet-point style listing, absence of personal voice,
generic technical descriptions not tied to the specific code.

${was_voice_answer ? 'IMPORTANT: This is a voice answer — informal speech is EXPECTED. Only flag if the spoken answer sounds like it is being READ from an AI-generated script.' : ''}

Return ONLY valid JSON — no markdown:
{
  "authenticityScore": 8,
  "verdict": "Genuine",
  "authenticityReason": "one sentence explaining the verdict with specific evidence from the answer",
  "plagiarismRisk": "Low",
  "signals": ["signal1 if any"],
  "humanSignals": ["human-like trait observed"],
  "aiSignals": ["AI-like trait observed"]
}
Rules:
- authenticityScore: 0-10 (10=clearly genuine human, 0=clearly AI/scripted)
- verdict: exactly one of "Genuine" | "Suspicious" | "Likely AI-Generated"
- plagiarismRisk: exactly one of "Low" | "Medium" | "High"`
          );
          let parsed;
          try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
          catch { parsed = { authenticityScore: 7, verdict: 'Genuine', authenticityReason: 'Natural answer detected.', plagiarismRisk: 'Low', signals: [], humanSignals: [], aiSignals: [] }; }
          return { __result: parsed, __usage: usage };
        }
      ),

      // 3. Relevance
      trace(
        {
          name:    'viva-relevance',
          runType: 'llm',
          inputs:  { questionType: question.type },
          tags:    ['viva', 'groq', 'relevance'],
        },
        async () => {
          const { text, usage } = await callGroq(
            [{ role: 'user', content: `Code:\n\`\`\`\n${codeTrunc}\n\`\`\`\n\nQuestion type: ${question.type}\nQuestion: ${question.question}\nStudent answer: "${answer}"` }],
            `You are checking whether a viva answer is relevant to the specific question asked AND specific to the submitted code.
Return ONLY valid JSON:
{
  "relevanceScore": 8,
  "isRelevant": true,
  "addressesQuestion": true,
  "isSpecificToCode": true,
  "relevanceFeedback": "one sentence"
}`
          );
          let parsed;
          try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
          catch { parsed = { relevanceScore: 5, isRelevant: true, addressesQuestion: true, isSpecificToCode: false, relevanceFeedback: 'Partially addresses the question.' }; }
          return { __result: parsed, __usage: usage };
        }
      ),
    ]);

    const scoring      = scoringResult;
    const authenticity = authenticityResult;
    const relevance    = relevanceResult;

    const aiDetectionScore = computeAIDetectionScore({
      verdict:           authenticity.verdict,
      authenticityScore: authenticity.authenticityScore,
      signals:           authenticity.signals,
      plagiarismRisk:    authenticity.plagiarismRisk,
    });

    res.json({
      // Scoring
      score:             scoring.score,
      technicalAccuracy: scoring.technicalAccuracy,
      completeness:      scoring.completeness,
      strengths:         scoring.strengths    || [],
      improvements:      scoring.improvements || [],
      feedback:          scoring.feedback     || '',
      // Relevance
      relevance:         relevance.relevanceScore,
      isRelevant:        relevance.isRelevant,
      isSpecificToCode:  relevance.isSpecificToCode,
      relevanceFeedback: relevance.relevanceFeedback,
      // Authenticity / AI detection
      authenticityScore:  authenticity.authenticityScore,
      verdict:            authenticity.verdict,
      authenticityReason: authenticity.authenticityReason,
      plagiarismRisk:     authenticity.plagiarismRisk,
      signals:            authenticity.signals      || [],
      humanSignals:       authenticity.humanSignals || [],
      aiSignals:          authenticity.aiSignals    || [],
      // Computed
      aiDetectionScore,
      humanizedScore: Math.max(0, 100 - aiDetectionScore),
      // Voice metadata
      was_voice_answer,
      replay_count,
      edited_word_count,
    });
  } catch (err) {
    console.error('[viva] evaluate-answer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/viva-results ────────────────────────────────────────
router.post('/viva-results', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      studentName, problemName, submittedCode,
      codingScore, overallScore, authScore,
      finalVerdict, completedAt, vivaAnswers,
      examId, assignmentId,
    } = req.body;

    const aiDetScores = (vivaAnswers || []).map(a => a.aiDetectionScore ?? computeAIDetectionScore({
      verdict:           a.verdict,
      authenticityScore: a.authenticityScore,
      signals:           a.signals,
      plagiarismRisk:    a.plagiarismRisk,
    }));
    const overallAiDetection = aiDetScores.length
      ? Math.round(aiDetScores.reduce((a, b) => a + b, 0) / aiDetScores.length)
      : null;

    const [resultRow] = await conn.execute(
      `INSERT INTO viva_results
         (student_name, problem_name, submitted_code, coding_score,
          overall_score, auth_score, final_verdict, completed_at,
          exam_id, assignment_id, ai_detection_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentName || 'Unknown', problemName || 'Solution',
        submittedCode || '', codingScore ?? null,
        overallScore ?? null, authScore ?? null,
        finalVerdict || 'Genuine', completedAt || new Date().toISOString(),
        examId || null, assignmentId || null, overallAiDetection,
      ]
    ).catch(async () => conn.execute(
      `INSERT INTO viva_results
         (student_name, problem_name, submitted_code, coding_score,
          overall_score, auth_score, final_verdict, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentName || 'Unknown', problemName || 'Solution', submittedCode || '',
       codingScore ?? null, overallScore ?? null, authScore ?? null,
       finalVerdict || 'Genuine', completedAt || new Date().toISOString()]
    ));

    const vivaResultId = resultRow.insertId;

    if (Array.isArray(vivaAnswers)) {
      for (const ans of vivaAnswers) {
        const aiDetScore = ans.aiDetectionScore ?? computeAIDetectionScore({
          verdict:           ans.verdict,
          authenticityScore: ans.authenticityScore,
          signals:           ans.signals,
          plagiarismRisk:    ans.plagiarismRisk,
        });

        await conn.execute(
          `INSERT INTO viva_answers
             (viva_result_id, question_number, question_type, question,
              student_answer, duration_secs, score, technical_accuracy,
              relevance, completeness, authenticity_score, verdict,
              feedback, strengths, improvements, authenticity_reason,
              plagiarism_risk, signals, is_relevant, is_specific_to_code,
              relevance_feedback, was_voice_answer, replay_count, edited_word_count,
              ai_detection_score, humanized_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vivaResultId,
            ans.questionNumber    ?? null, ans.questionType   || '',
            ans.question          || '',   ans.studentAnswer  || '',
            ans.durationSecs      ?? null, ans.score          ?? null,
            ans.technicalAccuracy ?? null, ans.relevance      ?? null,
            ans.completeness      ?? null, ans.authenticityScore ?? null,
            ans.verdict           || '',   ans.feedback       || '',
            JSON.stringify(ans.strengths    || []),
            JSON.stringify(ans.improvements || []),
            ans.authenticityReason || '',  ans.plagiarismRisk || 'Low',
            JSON.stringify(ans.signals      || []),
            ans.isRelevant       ? 1 : 0,
            ans.isSpecificToCode ? 1 : 0,
            ans.relevanceFeedback || '',
            (ans.wasVoiceAnswer || ans.was_voice_answer) ? 1 : 0,
            ans.replayCount     || ans.replay_count       || 0,
            ans.editedWordCount || ans.edited_word_count  || 0,
            aiDetScore,
            Math.max(0, 100 - aiDetScore),
          ]
        ).catch(async () => conn.execute(
          `INSERT INTO viva_answers
             (viva_result_id, question_number, question_type, question,
              student_answer, duration_secs, score, technical_accuracy,
              relevance, completeness, authenticity_score, verdict,
              feedback, strengths, improvements, authenticity_reason,
              plagiarism_risk, signals, is_relevant, is_specific_to_code, relevance_feedback)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vivaResultId, ans.questionNumber ?? null, ans.questionType || '',
            ans.question || '', ans.studentAnswer || '', ans.durationSecs ?? null,
            ans.score ?? null, ans.technicalAccuracy ?? null, ans.relevance ?? null,
            ans.completeness ?? null, ans.authenticityScore ?? null, ans.verdict || '',
            ans.feedback || '', JSON.stringify(ans.strengths || []),
            JSON.stringify(ans.improvements || []), ans.authenticityReason || '',
            ans.plagiarismRisk || 'Low', JSON.stringify(ans.signals || []),
            ans.isRelevant ? 1 : 0, ans.isSpecificToCode ? 1 : 0, ans.relevanceFeedback || '',
          ]
        ));
      }
    }

    await conn.commit();
    console.log(`✓ Viva result saved — student: ${studentName}, id: ${vivaResultId}, aiDet: ${overallAiDetection}`);
    res.json({ success: true, vivaResultId, overallAiDetection });

  } catch (err) {
    await conn.rollback();
    console.error('[viva] save error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── GET /api/viva-results ─────────────────────────────────────────
router.get('/viva-results', async (req, res) => {
  try {
    const { exam_id } = req.query;
    let sql = 'SELECT * FROM viva_results';
    const params = [];
    if (exam_id) { sql += ' WHERE exam_id = ?'; params.push(exam_id); }
    sql += ' ORDER BY created_at DESC';

    const [results] = await pool.execute(sql, params);
    const enriched  = await Promise.all(results.map(async (r) => {
      const [answers] = await pool.execute(
        'SELECT * FROM viva_answers WHERE viva_result_id = ? ORDER BY question_number',
        [r.id]
      );
      return {
        ...r,
        student_id: r.id, name: r.student_name, email: '', branch: '',
        viva_completed: answers.length > 0,
        viva_answers: answers.map(a => ({
          ...a,
          was_voice_answer: !!a.was_voice_answer,
          replay_count:     a.replay_count     || 0,
          edited_word_count:a.edited_word_count || 0,
          strengths:    safeJSON(a.strengths,    []),
          improvements: safeJSON(a.improvements, []),
          signals:      safeJSON(a.signals,      []),
        })),
      };
    }));
    res.json(enriched);
  } catch (err) {
    console.error('[viva-results GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/viva-results/:id ─────────────────────────────────────
router.get('/viva-results/:id', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM viva_results WHERE id = ?', [req.params.id]);
    if (!results.length) return res.status(404).json({ error: 'Not found' });
    const [answers] = await pool.execute(
      'SELECT * FROM viva_answers WHERE viva_result_id = ? ORDER BY question_number',
      [req.params.id]
    );
    res.json({
      ...results[0],
      vivaAnswers: answers.map(a => ({
        ...a,
        strengths:    safeJSON(a.strengths,    []),
        improvements: safeJSON(a.improvements, []),
        signals:      safeJSON(a.signals,      []),
        was_voice_answer: !!a.was_voice_answer,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai-detection/:examId ─────────────────────────────────
router.get('/ai-detection/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const [vivaRows] = await pool.execute(
      `SELECT vr.*, c.name AS candidate_name, c.email AS candidate_email,
              c.branch, ea.id AS assignment_id
       FROM viva_results vr
       LEFT JOIN exam_assignments ea ON ea.id = vr.assignment_id
       LEFT JOIN candidates c ON c.id = ea.student_id
       WHERE vr.exam_id = ?
       ORDER BY vr.created_at DESC`,
      [examId]
    );

    let rows = vivaRows;
    if (!rows.length) {
      const [allRows] = await pool.execute(
        `SELECT vr.*, c.name AS candidate_name, c.email AS candidate_email, c.branch
         FROM viva_results vr
         LEFT JOIN exam_assignments ea ON ea.id = vr.assignment_id
         LEFT JOIN candidates c ON c.id = ea.student_id
         ORDER BY vr.created_at DESC LIMIT 50`
      );
      rows = allRows;
    }

    const students = await Promise.all(rows.map(async (r) => {
      const [answers] = await pool.execute(
        'SELECT * FROM viva_answers WHERE viva_result_id = ? ORDER BY question_number',
        [r.id]
      );
      const overallAiDet = answers.length
        ? Math.round(answers.map(a => a.ai_detection_score ?? 50).reduce((x, y) => x + y, 0) / answers.length)
        : null;
      return {
        student_id:         r.assignment_id || r.id,
        name:               r.candidate_name || r.student_name,
        email:              r.candidate_email || '',
        branch:             r.branch || '',
        viva_result_id:     r.id,
        overall_score:      r.overall_score,
        auth_score:         r.auth_score,
        ai_detection_score: r.ai_detection_score || overallAiDet,
        humanized_score:    r.auth_score ? r.auth_score * 10 : null,
        final_verdict:      r.final_verdict,
        viva_completed:     answers.length > 0,
        exam_name:          examId,
        viva_answers: answers.map(a => ({
          question_number:     a.question_number,
          question_type:       a.question_type,
          question:            a.question,
          student_answer:      a.student_answer,
          score:               a.score,
          technical_accuracy:  a.technical_accuracy,
          relevance:           a.relevance,
          completeness:        a.completeness,
          authenticity_score:  a.authenticity_score,
          verdict:             a.verdict,
          feedback:            a.feedback,
          plagiarism_risk:     a.plagiarism_risk,
          was_voice_answer:    !!a.was_voice_answer,
          replay_count:        a.replay_count     || 0,
          edited_word_count:   a.edited_word_count || 0,
          ai_detection_score:  a.ai_detection_score,
          humanized_score:     a.humanized_score,
          authenticity_reason: a.authenticity_reason,
          signals:      safeJSON(a.signals,      []),
          strengths:    safeJSON(a.strengths,    []),
          improvements: safeJSON(a.improvements, []),
        })),
      };
    }));

    res.json({ students, examId });
  } catch (err) {
    console.error('[ai-detection]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;