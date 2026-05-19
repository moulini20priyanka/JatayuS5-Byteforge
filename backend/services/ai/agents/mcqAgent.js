// services/ai/agents/mcqAgent.js
// v6: trace() already unwraps __result — WithRetry just uses result directly

const groq        = require('../utils/groqClient');
const { trace }   = require('../../../utils/tracer');

const MCQ_AGENT_INFO = {
  key:         'mcq',
  name:        'MCQ Generator Agent',
  emoji:       '📝',
  color:       '#22c87a',
  description: 'Classic multiple choice questions',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseJSON(text, agentName = 'Agent') {
  try {
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(clean);
  } catch (e) {
    console.error(`[${agentName}] JSON parse error:`, e.message);
    console.error(`[${agentName}] Raw (first 300):`, text.substring(0, 300));
    return [];
  }
}

// trace() calls unwrap(__result) internally → returns plain array directly
async function generateMCQBatch(topic, count, difficulty, retryCount = 0) {
  if (count <= 0) return [];

  return trace(
    {
      name:    `mcq-agent-${difficulty}`,
      runType: 'llm',
      inputs:  { topic, count, difficulty },
      tags:    ['mcq-agent', 'groq', difficulty],
    },
    async () => {
      try {
        const response = await groq.chat.completions.create({
          model:       'llama-3.3-70b-versatile',
          max_tokens:  4000,
          temperature: 0.7,
          messages: [
            {
              role:    'system',
              content: `You are an expert MCQ question generator for technical assessments.
Return ONLY a valid raw JSON array. No markdown, no backticks, no explanation text.
Start your response with [ and end with ].
Each question must follow this exact structure:
[
  {
    "type": "mcq",
    "question": "Question text here?",
    "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
    "answer": "A) Option one",
    "explanation": "Brief explanation of why A is correct",
    "difficulty": "${difficulty}",
    "topic": "Topic name here"
  }
]`,
            },
            {
              role:    'user',
              content: `Generate exactly ${count} ${difficulty} difficulty MCQ questions about: "${topic}".
Requirements:
- Each question must have exactly 4 options labeled A), B), C), D)
- The answer field must be the FULL text of the correct option (e.g. "A) Python")
- Questions must be technically accurate and relevant
- ALL questions must be ${difficulty} difficulty level
- Vary the correct answer position (don't always make A correct)
Return ONLY the JSON array, nothing else.`,
            },
          ],
        });

        const usage     = response.usage || null;
        const text      = response.choices[0]?.message?.content || '';
        const questions = parseJSON(text, `MCQ-${difficulty}`);
        console.log(`[MCQ Agent] ${difficulty}: ${questions.length} questions for "${topic}"`);
        return { __result: questions, __usage: usage };

      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');
        if (is429 && retryCount < 2) {
          const match  = err?.message?.match(/try again in ([\d.]+)s/i);
          const waitMs = match
            ? Math.ceil(parseFloat(match[1]) * 1000) + 500
            : (retryCount + 1) * 20000;
          console.warn(`[MCQ Agent] 429 "${topic}" ${difficulty} — waiting ${Math.round(waitMs/1000)}s (retry ${retryCount+1}/2)`);
          await sleep(waitMs);
          // Return sentinel — trace() will unwrap __result:[] and log no usage
          return { __result: [], __usage: null, __retry: true, __retryCount: retryCount + 1 };
        }
        console.error(`[MCQ Agent] FAILED ${difficulty} "${topic}":`, err.message);
        return { __result: [], __usage: null };
      }
    }
  );
}

// FIX: trace() already returns the unwrapped array — just use it directly
// If it returned a retry sentinel (before unwrap stripped __retry), handle retry
async function generateMCQBatchWithRetry(topic, count, difficulty, retryCount = 0) {
  const result = await generateMCQBatch(topic, count, difficulty, retryCount);
  // result is already a plain array (trace unwrapped __result)
  // BUT if rate limited and retryCount < 2, we need to retry
  if (!Array.isArray(result) && result?.__retry) {
    return generateMCQBatchWithRetry(topic, count, difficulty, result.__retryCount);
  }
  return Array.isArray(result) ? result : [];
}

async function runMCQAgent(topic, count, difficulty, onProgress, platform, extraConfig) {
  const mixedCounts = extraConfig?.mixedCounts || null;

  onProgress?.({
    agent:   'mcq',
    status:  'generating',
    message: mixedCounts
      ? `📝 MCQ Agent generating ${count} mixed (E:${mixedCounts.easy} M:${mixedCounts.medium} H:${mixedCounts.hard}) on "${topic}"...`
      : `📝 MCQ Agent generating ${count} questions on "${topic}"...`,
  });

  let allQuestions = [];

  if (mixedCounts) {
    const DELAY = 3000;
    const easyQs   = await generateMCQBatchWithRetry(topic, mixedCounts.easy   || 0, 'easy');
    if ((mixedCounts.medium || 0) > 0) await sleep(DELAY);
    const mediumQs = await generateMCQBatchWithRetry(topic, mixedCounts.medium || 0, 'medium');
    if ((mixedCounts.hard   || 0) > 0) await sleep(DELAY);
    const hardQs   = await generateMCQBatchWithRetry(topic, mixedCounts.hard   || 0, 'hard');
    allQuestions   = [...easyQs, ...mediumQs, ...hardQs];
  } else {
    allQuestions = await generateMCQBatchWithRetry(topic, count, difficulty || 'medium');
  }

  onProgress?.({
    agent:   'mcq',
    status:  'done',
    message: `📝 MCQ Agent generated ${allQuestions.length} questions on "${topic}"`,
  });

  return allQuestions.map((q, i) => ({
    ...q,
    id:         `mcq_${Date.now()}_${i}`,
    type:       'mcq',
    agentType:  'mcq',
    agentName:  MCQ_AGENT_INFO.name,
    agentEmoji: MCQ_AGENT_INFO.emoji,
    topic:      q.topic || topic,
  }));
}

module.exports = { runMCQAgent, MCQ_AGENT_INFO };