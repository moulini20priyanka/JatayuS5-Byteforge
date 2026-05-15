// services/ai/agents/codingAgent.js
// v3: Mixed difficulty support — generates easy/medium/hard problems separately
//     One-by-one generation preserved to avoid TPM rate limits

const groq = require('../utils/groqClient');

const CODING_AGENT_INFO = {
  key:         'coding',
  name:        'Coding Agent',
  emoji:       '💻',
  color:       '#f59e0b',
  description: 'Programming and algorithmic problems',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Difficulty-specific guidance for coding problems
const DIFF_GUIDE = {
  easy:   'simple loops, basic array/string manipulation, single function, O(n) solutions, beginner-friendly',
  medium: 'two-pointer, sorting, hash maps, moderate recursion, standard data structures, intermediate algorithms',
  hard:   'dynamic programming, graph algorithms, complex recursion, advanced data structures, optimization problems',
};

async function generateSingleCodingQuestion(topic, difficulty, platform, attempt = 0) {
  const prompt = `Generate exactly 1 ${difficulty} difficulty coding problem about "${topic}".
Platform style: ${platform || 'LeetCode'}.
Difficulty guide for ${difficulty}: ${DIFF_GUIDE[difficulty] || DIFF_GUIDE.medium}.

Return ONLY this JSON object (no array, no markdown):
{
  "type": "coding",
  "title": "Problem Title",
  "question": "Brief problem statement in 1-2 sentences.",
  "description": "Detailed description: what input is given, what output is expected.",
  "constraints": "1 <= n <= 1000",
  "sample_input": "nums = [1,2,3]",
  "sample_output": "6",
  "explanation": "Add all numbers: 1+2+3 = 6",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "platform": "${platform || 'LeetCode'}",
  "starter_code": "def solution(nums):\\n    pass"
}`;

  const response = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    max_tokens:  600,
    temperature: 0.7,
    messages: [
      {
        role:    'system',
        content: 'You are a coding problem generator. Return ONLY a valid JSON object. No markdown, no backticks, no extra text. Start with { end with }.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  return parseSingleJSON(text);
}

function parseSingleJSON(text) {
  try {
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    return null;
  } catch (e) {
    console.error('[Coding Agent] JSON parse error:', e.message, '| text:', text.substring(0, 200));
    return null;
  }
}

// Generate N coding problems for a given difficulty
async function generateCodingBatch(topic, count, difficulty, platform) {
  if (count <= 0) return [];

  const results  = [];
  const maxCount = Math.min(count, 10);

  for (let i = 0; i < maxCount; i++) {
    try {
      if (i > 0) await sleep(1500);

      const q = await generateSingleCodingQuestion(topic, difficulty, platform);

      if (q && (q.question || q.title || q.description)) {
        results.push({
          ...q,
          id:         `coding_${Date.now()}_${i}`,
          type:       'coding',
          agentType:  'coding',
          agentName:  CODING_AGENT_INFO.name,
          agentEmoji: CODING_AGENT_INFO.emoji,
          topic:      q.topic || topic,
          difficulty: difficulty,
          question:   q.question || q.title || q.description || '',
          examples:   q.examples || (q.sample_input !== undefined ? [{
            input:       q.sample_input  || '',
            output:      q.sample_output || '',
            explanation: q.explanation   || '',
          }] : []),
        });
        console.log(`[Coding Agent] ✓ ${difficulty} Q${i + 1}/${maxCount} for "${topic}"`);
      } else {
        console.warn(`[Coding Agent] ${difficulty} Q${i + 1} returned null for "${topic}"`);
      }

    } catch (err) {
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Rate limit')) {
        console.warn(`[Coding Agent] Rate limit on ${difficulty} Q${i + 1}. Waiting 10s...`);
        await sleep(10000);
        try {
          const q = await generateSingleCodingQuestion(topic, difficulty, platform);
          if (q && (q.question || q.title)) {
            results.push({
              ...q,
              id:         `coding_${Date.now()}_${i}`,
              type:       'coding',
              agentType:  'coding',
              agentName:  CODING_AGENT_INFO.name,
              agentEmoji: CODING_AGENT_INFO.emoji,
              topic:      q.topic || topic,
              difficulty: difficulty,
              question:   q.question || q.title || q.description || '',
              examples:   q.examples || (q.sample_input !== undefined ? [{
                input: q.sample_input || '', output: q.sample_output || '',
              }] : []),
            });
          }
        } catch (retryErr) {
          console.error(`[Coding Agent] Retry failed for ${difficulty} Q${i + 1}:`, retryErr.message);
        }
      } else {
        console.error(`[Coding Agent] Error on ${difficulty} Q${i + 1} for "${topic}":`, err.message);
      }
    }
  }

  return results;
}

async function runCodingAgent(topic, count, difficulty, onProgress, platform, extraConfig) {
  const mixedCounts = extraConfig?.mixedCounts || null;

  onProgress?.({
    agent:   'coding',
    status:  'generating',
    message: mixedCounts
      ? `💻 Coding Agent generating mixed (E:${mixedCounts.easy} M:${mixedCounts.medium} H:${mixedCounts.hard}) problems on "${topic}"...`
      : `💻 Coding Agent generating ${count} problems on "${topic}"...`,
  });

  let allResults = [];

  if (mixedCounts) {
    // ── Mixed mode: generate each difficulty batch in sequence ──
    // Use larger delay between difficulty batches (3s) to avoid rate limits
    const BATCH_DELAY = 3000;

    const easyQs = await generateCodingBatch(topic, mixedCounts.easy || 0, 'easy', platform);
    if ((mixedCounts.medium || 0) > 0) await sleep(BATCH_DELAY);
    const mediumQs = await generateCodingBatch(topic, mixedCounts.medium || 0, 'medium', platform);
    if ((mixedCounts.hard   || 0) > 0) await sleep(BATCH_DELAY);
    const hardQs = await generateCodingBatch(topic, mixedCounts.hard || 0, 'hard', platform);

    allResults = [...easyQs, ...mediumQs, ...hardQs];
  } else {
    // ── Normal mode ──
    allResults = await generateCodingBatch(topic, count, difficulty || 'medium', platform);
  }

  console.log(`[Coding Agent] Generated ${allResults.length} problems for "${topic}"`);

  onProgress?.({
    agent:   'coding',
    status:  'done',
    message: `💻 Coding Agent generated ${allResults.length} problems on "${topic}"`,
  });

  return allResults;
}

module.exports = { runCodingAgent, CODING_AGENT_INFO };