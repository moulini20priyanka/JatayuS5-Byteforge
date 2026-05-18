// services/ai/agents/verbalAgent.js
// v4: LangSmith token tracking via tracer

const groq           = require('../utils/groqClient');
const { trace }      = require('../../../utils/tracer');   // adjust path if needed

const VERBAL_AGENT_INFO = {
  key:         'verbal',
  name:        'Verbal Agent',
  emoji:       '📖',
  color:       '#db2777',
  description: 'English verbal ability questions',
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

async function generateVerbalBatch(topic, count, difficulty, retryCount = 0) {
  if (count <= 0) return [];

  const diffGuide = {
    easy:   'common everyday words, simple grammar rules, basic sentence structures, high-frequency vocabulary',
    medium: 'moderately uncommon words, compound sentence correction, moderate comprehension passages',
    hard:   'advanced vocabulary, complex grammar structures, nuanced usage, difficult reading comprehension',
  };

  return trace(
    {
      name:    `verbal-agent-${difficulty}`,
      runType: 'llm',
      inputs:  { topic, count, difficulty },
      tags:    ['verbal-agent', 'groq', difficulty],
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
              content: `You are an expert verbal ability question generator.
Return ONLY a valid raw JSON array. No markdown, no backticks.
Start with [ end with ].
Structure:
[
  {
    "type": "verbal",
    "question": "Choose the word most similar in meaning to: BENEVOLENT",
    "options": ["A) Malicious", "B) Kind", "C) Greedy", "D) Arrogant"],
    "answer": "B) Kind",
    "explanation": "Benevolent means well-meaning and kindly.",
    "difficulty": "${difficulty}",
    "topic": "Vocabulary"
  }
]`,
            },
            {
              role:    'user',
              content: `Generate exactly ${count} ${difficulty} difficulty verbal ability questions about: "${topic}".
Difficulty guide for ${difficulty}: ${diffGuide[difficulty] || diffGuide.medium}.
ALL questions must be ${difficulty} difficulty level.
Include grammar, vocabulary, comprehension, or verbal reasoning as appropriate to the topic.
Return ONLY the JSON array.`,
            },
          ],
        });

        const usage     = response.usage || null;
        const text      = response.choices[0]?.message?.content || '';
        const questions = parseJSON(text, `Verbal-${difficulty}`);
        console.log(`[Verbal Agent] ${difficulty} batch: ${questions.length} questions for "${topic}"`);

        return { __result: questions, __usage: usage };

      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');
        if (is429 && retryCount < 2) {
          const retryAfterMatch = err?.message?.match(/try again in ([\d.]+)s/i);
          const waitMs = retryAfterMatch
            ? Math.ceil(parseFloat(retryAfterMatch[1]) * 1000) + 500
            : (retryCount + 1) * 15000;
          console.warn(`[Verbal Agent] 429 on "${topic}" ${difficulty} — waiting ${Math.round(waitMs / 1000)}s`);
          await sleep(waitMs);
          return { __result: [], __usage: null };
        }
        console.error(`[Verbal Agent] FAILED ${difficulty} on "${topic}":`, err.message);
        return { __result: [], __usage: null };
      }
    }
  );
}

async function generateVerbalBatchWithRetry(topic, count, difficulty) {
  const result = await generateVerbalBatch(topic, count, difficulty);
  return Array.isArray(result) ? result : [];
}

async function runVerbalAgent(topic, count, difficulty, onProgress, platform, extraConfig) {
  const mixedCounts = extraConfig?.mixedCounts || null;

  onProgress?.({
    agent:   'verbal',
    status:  'generating',
    message: mixedCounts
      ? `📖 Verbal Agent generating mixed (E:${mixedCounts.easy} M:${mixedCounts.medium} H:${mixedCounts.hard}) on "${topic}"...`
      : `📖 Verbal Agent generating ${count} questions on "${topic}"...`,
  });

  let allQuestions = [];

  if (mixedCounts) {
    const DELAY = 2500;
    const easyQs   = await generateVerbalBatchWithRetry(topic, mixedCounts.easy   || 0, 'easy');
    if ((mixedCounts.medium || 0) > 0) await sleep(DELAY);
    const mediumQs = await generateVerbalBatchWithRetry(topic, mixedCounts.medium || 0, 'medium');
    if ((mixedCounts.hard   || 0) > 0) await sleep(DELAY);
    const hardQs   = await generateVerbalBatchWithRetry(topic, mixedCounts.hard   || 0, 'hard');
    allQuestions   = [...easyQs, ...mediumQs, ...hardQs];
  } else {
    allQuestions = await generateVerbalBatchWithRetry(topic, count, difficulty || 'medium');
  }

  onProgress?.({
    agent:   'verbal',
    status:  'done',
    message: `📖 Verbal Agent generated ${allQuestions.length} questions on "${topic}"`,
  });

  return allQuestions.map((q, i) => ({
    ...q,
    id:         `verbal_${Date.now()}_${i}`,
    type:       'verbal',
    agentType:  'verbal',
    agentName:  VERBAL_AGENT_INFO.name,
    agentEmoji: VERBAL_AGENT_INFO.emoji,
    topic:      q.topic || topic,
  }));
}

module.exports = { runVerbalAgent, VERBAL_AGENT_INFO };