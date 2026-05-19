// services/ai/agents/aptitudeAgent.js
// v4: LangSmith token tracking via tracer

const groq           = require('../utils/groqClient');
const { trace }      = require('../../../utils/tracer');   // adjust path if needed

const APTITUDE_AGENT_INFO = {
  key:         'aptitude',
  name:        'Aptitude Agent',
  emoji:       '🧮',
  color:       '#0891b2',
  description: 'Quantitative aptitude and reasoning',
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
    return [];
  }
}

async function generateAptitudeBatch(topic, count, difficulty, retryCount = 0) {
  if (count <= 0) return [];

  const diffGuide = {
    easy:   'single-step problems, basic formulas, direct substitution, straightforward calculations',
    medium: 'two-step problems, formula application with slight complexity, moderate word problems',
    hard:   'multi-step reasoning, complex word problems, logical deduction, time-pressure scenarios',
  };

  return trace(
    {
      name:    `aptitude-agent-${difficulty}`,
      runType: 'llm',
      inputs:  { topic, count, difficulty },
      tags:    ['aptitude-agent', 'groq', difficulty],
    },
    async () => {
      try {
        const response = await groq.chat.completions.create({
          model:       'llama-3.3-70b-versatile',
          max_tokens:  4000,
          temperature: 0.6,
          messages: [
            {
              role:    'system',
              content: `You are an expert aptitude question generator for placement assessments.
Return ONLY a valid raw JSON array. No markdown, no backticks, no explanation text.
Start with [ end with ].
Structure:
[
  {
    "type": "aptitude",
    "question": "If a train travels 120 km in 2 hours, what is its speed?",
    "options": ["A) 50 km/h", "B) 60 km/h", "C) 70 km/h", "D) 80 km/h"],
    "answer": "B) 60 km/h",
    "explanation": "Speed = Distance/Time = 120/2 = 60 km/h",
    "difficulty": "${difficulty}",
    "topic": "Topic name"
  }
]`,
            },
            {
              role:    'user',
              content: `Generate exactly ${count} ${difficulty} difficulty aptitude questions about: "${topic}".
Difficulty guide for ${difficulty}: ${diffGuide[difficulty] || diffGuide.medium}.
ALL questions must be ${difficulty} difficulty.
Include numerical problems with step-by-step explanations.
Return ONLY the JSON array.`,
            },
          ],
        });

        const usage     = response.usage || null;
        const text      = response.choices[0]?.message?.content || '';
        const questions = parseJSON(text, `Aptitude-${difficulty}`);
        console.log(`[Aptitude Agent] ${difficulty} batch: ${questions.length} questions for "${topic}"`);

        return { __result: questions, __usage: usage };

      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');
        if (is429 && retryCount < 2) {
          const retryAfterMatch = err?.message?.match(/try again in ([\d.]+)s/i);
          const waitMs = retryAfterMatch
            ? Math.ceil(parseFloat(retryAfterMatch[1]) * 1000) + 500
            : (retryCount + 1) * 15000;
          console.warn(`[Aptitude Agent] 429 on "${topic}" ${difficulty} — waiting ${Math.round(waitMs / 1000)}s`);
          await sleep(waitMs);
          // retry falls outside trace — return empty so trace completes cleanly
          return { __result: [], __usage: null };
        }
        console.error(`[Aptitude Agent] FAILED ${difficulty} on "${topic}":`, err.message);
        return { __result: [], __usage: null };
      }
    }
  );
}

async function generateAptitudeBatchWithRetry(topic, count, difficulty, retryCount = 0) {
  const result = await generateAptitudeBatch(topic, count, difficulty, retryCount);
  if (Array.isArray(result)) return result;
  if (result?.__result && Array.isArray(result.__result)) return result.__result;
  return [];
}

async function runAptitudeAgent(topic, count, difficulty, onProgress, platform, extraConfig) {
  const mixedCounts = extraConfig?.mixedCounts || null;

  onProgress?.({
    agent:   'aptitude',
    status:  'generating',
    message: mixedCounts
      ? `🧮 Aptitude Agent generating mixed (E:${mixedCounts.easy} M:${mixedCounts.medium} H:${mixedCounts.hard}) on "${topic}"...`
      : `🧮 Aptitude Agent generating ${count} questions on "${topic}"...`,
  });

  let allQuestions = [];

  if (mixedCounts) {
    const DELAY = 2500;
    const easyQs   = await generateAptitudeBatchWithRetry(topic, mixedCounts.easy   || 0, 'easy');
    if ((mixedCounts.medium || 0) > 0) await sleep(DELAY);
    const mediumQs = await generateAptitudeBatchWithRetry(topic, mixedCounts.medium || 0, 'medium');
    if ((mixedCounts.hard   || 0) > 0) await sleep(DELAY);
    const hardQs   = await generateAptitudeBatchWithRetry(topic, mixedCounts.hard   || 0, 'hard');
    allQuestions   = [...easyQs, ...mediumQs, ...hardQs];
  } else {
    allQuestions = await generateAptitudeBatchWithRetry(topic, count, difficulty || 'medium');
  }

  onProgress?.({
    agent:   'aptitude',
    status:  'done',
    message: `🧮 Aptitude Agent generated ${allQuestions.length} questions on "${topic}"`,
  });

  return allQuestions.map((q, i) => ({
    ...q,
    id:         `aptitude_${Date.now()}_${i}`,
    type:       'aptitude',
    agentType:  'aptitude',
    agentName:  APTITUDE_AGENT_INFO.name,
    agentEmoji: APTITUDE_AGENT_INFO.emoji,
    topic:      q.topic || topic,
  }));
}

module.exports = { runAptitudeAgent, APTITUDE_AGENT_INFO };