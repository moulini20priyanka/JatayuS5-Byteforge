// services/ai/agents/theoryAgent.js
// v4: LangSmith token tracking via tracer

const groq           = require('../utils/groqClient');
const { trace }      = require('../../../utils/tracer');   // adjust path if needed

const THEORY_AGENT_INFO = {
  key:         'theory',
  name:        'Theory Agent',
  emoji:       '📝',
  color:       '#2563eb',
  description: 'University-style theory & descriptive questions',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseJSON(text, agentName = 'TheoryAgent') {
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

function buildSystemPrompt(markType) {
  const configs = {
    2: { wordRange:'30-60',   depth:'short definition or single key concept',                                               keyPoints:'2-3', keywords:'3-5',  bloomLevels:'Remember, Understand',       example:'Define process scheduling. / What is deadlock?' },
    5: { wordRange:'100-150', depth:'explanation with example or comparison',                                               keyPoints:'4-5', keywords:'5-8',  bloomLevels:'Understand, Apply, Analyse',  example:'Explain paging with a neat diagram. / Compare TCP and UDP.' },
    8: { wordRange:'200-300', depth:'detailed explanation, diagram hints, advantages/disadvantages or case study',          keyPoints:'6-8', keywords:'8-12', bloomLevels:'Analyse, Evaluate, Create',   example:'Explain virtual memory management. / Discuss OSI model layers.' },
  };
  const cfg = configs[markType] || configs[5];
  return `You are an expert university exam question paper setter specialising in engineering and computer science subjects.
Generate ONLY a valid raw JSON array. No markdown, no backticks, no explanation outside the JSON.
Start with [ and end with ].
Each object MUST have: question, marks (${markType}), mark_type ("${markType}m"), bloom_level, difficulty, topic, subject, unit, key_points (array of ${cfg.keyPoints} strings), keywords (comma-separated string of ${cfg.keywords} terms), expected_answer (${cfg.wordRange} words), model_answer_outline.
Bloom levels for ${markType}-mark: ${cfg.bloomLevels}. Depth: ${cfg.depth}. Example styles: "${cfg.example}".
NEVER include the answer or key_points in the question text.`;
}

async function generateForMarkType(topic, count, markType, difficulty, onProgress, retryCount = 0) {
  if (count === 0) return [];

  onProgress?.({ agent:'theory', status:'generating', message:`📝 Theory Agent generating ${count} × ${markType}-mark on "${topic}"...` });

  return trace(
    {
      name:    `theory-agent-${markType}m`,
      runType: 'llm',
      inputs:  { topic, count, markType, difficulty },
      tags:    ['theory-agent', 'groq', `${markType}m`],
    },
    async () => {
      try {
        const response = await groq.chat.completions.create({
          model:       'llama-3.3-70b-versatile',
          max_tokens:  3000,
          temperature: 0.65,
          messages: [
            { role:'system', content: buildSystemPrompt(markType) },
            { role:'user',   content: `Generate exactly ${count} ${markType}-mark university exam questions about: "${topic}". Difficulty: ${difficulty || 'medium'}. Bloom: ${markType===2?'Remember, Understand':markType===5?'Understand, Apply, Analyse':'Analyse, Evaluate, Create'}. Mix bloom levels. Return ONLY the JSON array.` },
          ],
        });

        const usage     = response.usage || null;
        const text      = response.choices[0]?.message?.content || '';
        const questions = parseJSON(text, `TheoryAgent-${markType}m`);

        if (!Array.isArray(questions) || questions.length === 0) {
          console.warn(`[TheoryAgent] ${markType}m "${topic}": 0 questions returned`);
          return { __result: [], __usage: usage };
        }
        console.log(`[TheoryAgent] ${markType}m "${topic}" → ${questions.length} questions`);
        return { __result: questions, __usage: usage };

      } catch (err) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit');
        if (is429 && retryCount < 2) {
          const retryAfterMatch = err?.message?.match(/try again in ([\d.]+)s/i);
          const waitMs = retryAfterMatch
            ? Math.ceil(parseFloat(retryAfterMatch[1]) * 1000) + 1000
            : (retryCount + 1) * 20000;
          console.warn(`[TheoryAgent] 429 ${markType}m "${topic}" — waiting ${Math.round(waitMs/1000)}s (retry ${retryCount+1}/2)`);
          onProgress?.({ agent:'theory', status:'generating', message:`⏳ Rate limited — retrying ${markType}-mark in ${Math.round(waitMs/1000)}s...` });
          await sleep(waitMs);
          return { __result: [], __usage: null };
        }
        console.error(`[TheoryAgent] FAILED ${markType}m "${topic}":`, err.message);
        return { __result: [], __usage: null };
      }
    }
  );
}

async function generateForMarkTypeWithRetry(topic, count, markType, difficulty, onProgress) {
  const result = await generateForMarkType(topic, count, markType, difficulty, onProgress);
  return Array.isArray(result) ? result : [];
}

// Sequential execution with 3s gap — prevents TPM limit hits
async function runTheoryAgent(topic, totalCount, difficulty, onProgress, platform, extraConfig) {
  onProgress?.({ agent:'theory', status:'start', message:`📝 Theory Agent starting for "${topic}" — ${totalCount} questions...` });

  const distribution = extraConfig?.markDistribution || deriveDefaultDistribution(totalCount);
  const { two = 0, five = 0, eight = 0 } = distribution;
  console.log(`[TheoryAgent] "${topic}": 2m×${two} 5m×${five} 8m×${eight} (sequential + 3s gap)`);

  const DELAY = 3000;

  const twos   = await generateForMarkTypeWithRetry(topic, two,   2, difficulty, onProgress);
  if (five  > 0) await sleep(DELAY);
  const fives  = await generateForMarkTypeWithRetry(topic, five,  5, difficulty, onProgress);
  if (eight > 0) await sleep(DELAY);
  const eights = await generateForMarkTypeWithRetry(topic, eight, 8, difficulty, onProgress);

  const all = [...twos, ...fives, ...eights];

  onProgress?.({ agent:'theory', status:'done', message:`📝 Theory Agent done — ${all.length} questions for "${topic}"` });

  return all.map((q, i) => ({
    id:                   `theory_${Date.now()}_${i}`,
    type:                 'theory',
    agentType:            'theory',
    agentName:            THEORY_AGENT_INFO.name,
    agentEmoji:           THEORY_AGENT_INFO.emoji,
    question:             q.question              || '',
    marks:                q.marks                 || 5,
    mark_type:            q.mark_type             || `${q.marks || 5}m`,
    difficulty:           q.difficulty            || difficulty || 'medium',
    bloom_level:          q.bloom_level           || '',
    topic:                q.topic                 || topic,
    subject:              q.subject               || topic,
    unit:                 q.unit                  || '',
    key_points:           Array.isArray(q.key_points) ? q.key_points : [],
    keywords:             q.keywords              || '',
    expected_answer:      q.expected_answer       || '',
    model_answer_outline: q.model_answer_outline  || '',
    options:              [],
    answer:               null,
    explanation:          q.expected_answer       || '',
  }));
}

function deriveDefaultDistribution(total) {
  if (total <= 0) return { two:0, five:0, eight:0 };
  if (total === 1) return { two:0, five:1, eight:0 };
  if (total === 2) return { two:1, five:1, eight:0 };
  if (total === 3) return { two:1, five:1, eight:1 };
  const eight = Math.max(1, Math.floor(total * 0.2));
  const five  = Math.max(1, Math.floor(total * 0.4));
  const two   = total - five - eight;
  return { two: Math.max(0, two), five, eight };
}

module.exports = { runTheoryAgent, THEORY_AGENT_INFO, deriveDefaultDistribution, generateForMarkType };