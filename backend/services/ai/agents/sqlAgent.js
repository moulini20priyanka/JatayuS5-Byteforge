// services/ai/agents/sqlAgent.js
// v4: LangSmith token tracking via tracer

const groq           = require('../utils/groqClient');
const { trace }      = require('../../../utils/tracer');   // adjust path if needed

const SQL_AGENT_INFO = {
  key:         'sql',
  name:        'SQL Agent',
  emoji:       '🗄️',
  color:       '#7c3aed',
  description: 'SQL query and database questions',
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

async function generateSQLBatch(topic, count, difficulty, retryCount = 0) {
  if (count <= 0) return [];

  return trace(
    {
      name:    `sql-agent-${difficulty}`,
      runType: 'llm',
      inputs:  { topic, count, difficulty },
      tags:    ['sql-agent', 'groq', difficulty],
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
              content: `You are an expert SQL question generator for technical assessments.
Return ONLY a valid raw JSON array. No markdown, no backticks, no explanation text.
Start your response with [ and end with ].
Each question must follow this exact structure:
[
  {
    "type": "sql",
    "question": "Question text here?",
    "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
    "answer": "A) Option one",
    "explanation": "Brief explanation",
    "difficulty": "${difficulty}",
    "topic": "Topic name"
  }
]`,
            },
            {
              role:    'user',
              content: `Generate exactly ${count} ${difficulty} difficulty SQL MCQ questions about: "${topic}".
Requirements:
- Focus on SQL syntax, query writing, joins, aggregations, indexing as relevant to the topic
- Each question must have exactly 4 options labeled A), B), C), D)
- The answer field must be the FULL text of the correct option
- ALL questions must be ${difficulty} difficulty level
- Include some questions with sample SQL code snippets where relevant
Return ONLY the JSON array, nothing else.`,
            },
          ],
        });

        const usage     = response.usage || null;
        const text      = response.choices[0]?.message?.content || '';
        const questions = parseJSON(text, `SQL-${difficulty}`);
        console.log(`[SQL Agent] ${difficulty} batch: ${questions.length} questions for "${topic}"`);

        return { __result: questions, __usage: usage };

      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');
        if (is429 && retryCount < 2) {
          const retryAfterMatch = err?.message?.match(/try again in ([\d.]+)s/i);
          const waitMs = retryAfterMatch
            ? Math.ceil(parseFloat(retryAfterMatch[1]) * 1000) + 500
            : (retryCount + 1) * 15000;
          console.warn(`[SQL Agent] 429 on "${topic}" ${difficulty} — waiting ${Math.round(waitMs / 1000)}s`);
          await sleep(waitMs);
          return { __result: [], __usage: null };
        }
        console.error(`[SQL Agent] FAILED ${difficulty} on "${topic}":`, err.message);
        return { __result: [], __usage: null };
      }
    }
  );
}

async function generateSQLBatchWithRetry(topic, count, difficulty) {
  const result = await generateSQLBatch(topic, count, difficulty);
  if (Array.isArray(result)) return result;
  if (result?.__result && Array.isArray(result.__result)) return result.__result;
  return [];
}

async function runSQLAgent(topic, count, difficulty, onProgress, platform, extraConfig) {
  const mixedCounts = extraConfig?.mixedCounts || null;

  onProgress?.({
    agent:   'sql',
    status:  'generating',
    message: mixedCounts
      ? `🗄️ SQL Agent generating mixed (E:${mixedCounts.easy} M:${mixedCounts.medium} H:${mixedCounts.hard}) on "${topic}"...`
      : `🗄️ SQL Agent generating ${count} questions on "${topic}"...`,
  });

  let allQuestions = [];

  if (mixedCounts) {
    const DELAY = 2500;
    const easyQs   = await generateSQLBatchWithRetry(topic, mixedCounts.easy   || 0, 'easy');
    if ((mixedCounts.medium || 0) > 0) await sleep(DELAY);
    const mediumQs = await generateSQLBatchWithRetry(topic, mixedCounts.medium || 0, 'medium');
    if ((mixedCounts.hard   || 0) > 0) await sleep(DELAY);
    const hardQs   = await generateSQLBatchWithRetry(topic, mixedCounts.hard   || 0, 'hard');
    allQuestions   = [...easyQs, ...mediumQs, ...hardQs];
  } else {
    allQuestions = await generateSQLBatchWithRetry(topic, count, difficulty || 'medium');
  }

  console.log(`[SQL Agent] Generated ${allQuestions.length} questions for "${topic}"`);

  onProgress?.({
    agent:   'sql',
    status:  'done',
    message: `🗄️ SQL Agent generated ${allQuestions.length} questions on "${topic}"`,
  });

  return allQuestions.map((q, i) => ({
    ...q,
    id:         `sql_${Date.now()}_${i}`,
    type:       'sql',
    agentType:  'sql',
    agentName:  SQL_AGENT_INFO.name,
    agentEmoji: SQL_AGENT_INFO.emoji,
    topic:      q.topic || topic,
  }));
}

module.exports = { runSQLAgent, SQL_AGENT_INFO };