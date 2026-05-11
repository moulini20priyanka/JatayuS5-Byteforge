// services/ai/agents/codingAgent.js
// Fixed: Rate limit handling + smaller batches + retry logic + simplified JSON

const groq = require('../utils/groqClient');

const CODING_AGENT_INFO = {
  key:         'coding',
  name:        'Coding Agent',
  emoji:       '💻',
  color:       '#f59e0b',
  description: 'Programming and algorithmic problems',
};

// ── Rate limit aware sleep ────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Generate ONE question at a time to avoid TPM limits ───────
async function generateSingleCodingQuestion(topic, difficulty, platform, attempt = 0) {
  const prompt = `Generate exactly 1 ${difficulty||'medium'} difficulty coding problem about "${topic}".
Platform style: ${platform||'LeetCode'}.

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
  "difficulty": "${difficulty||'medium'}",
  "topic": "${topic}",
  "platform": "${platform||'LeetCode'}",
  "starter_code": "def solution(nums):\\n    pass"
}`;

  const response = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    max_tokens:  600,   // small — single question only
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

// ── Parse a single JSON object (not array) ────────────────────
function parseSingleJSON(text) {
  try {
    const clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    // Extract JSON object
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    return null;
  } catch (e) {
    console.error('[Coding Agent] JSON parse error:', e.message, '| text:', text.substring(0,200));
    return null;
  }
}

// ── Main agent: generates questions one by one with delays ─────
async function runCodingAgent(topic, count, difficulty, onProgress, platform) {
  onProgress?.({
    agent:   'coding',
    status:  'generating',
    message: `💻 Coding Agent generating ${count} problems on "${topic}"...`,
  });

  const results = [];
  const maxCount = Math.min(count, 10); // cap at 10 per topic to avoid rate limits

  for (let i = 0; i < maxCount; i++) {
    try {
      // Delay between requests to avoid TPM rate limit
      // Groq free tier: ~6000 TPM for llama-3.3-70b
      if (i > 0) await sleep(1500); // 1.5s between each question

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
          question:   q.question || q.title || q.description || '',
          // Normalize sample I/O into examples array
          examples: q.examples || (q.sample_input !== undefined ? [{
            input:  q.sample_input || '',
            output: q.sample_output || '',
            explanation: q.explanation || '',
          }] : []),
        });
        console.log(`[Coding Agent] ✓ Question ${i+1}/${maxCount} for "${topic}"`);
      } else {
        console.warn(`[Coding Agent] Question ${i+1} returned null/empty for "${topic}"`);
      }

    } catch (err) {
      // Handle rate limit specifically
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Rate limit')) {
        console.warn(`[Coding Agent] Rate limit hit on question ${i+1}. Waiting 10s...`);
        await sleep(10000); // wait 10s before retry

        try {
          const q = await generateSingleCodingQuestion(topic, difficulty, platform);
          if (q && (q.question || q.title)) {
            results.push({
              ...q,
              id:`coding_${Date.now()}_${i}`, type:'coding',
              agentType:'coding', agentName:CODING_AGENT_INFO.name,
              agentEmoji:CODING_AGENT_INFO.emoji,
              topic: q.topic || topic,
              question: q.question || q.title || q.description || '',
              examples: q.examples || (q.sample_input !== undefined ? [{
                input: q.sample_input||'', output: q.sample_output||'',
              }] : []),
            });
            console.log(`[Coding Agent] ✓ Question ${i+1} succeeded after retry`);
          }
        } catch (retryErr) {
          console.error(`[Coding Agent] Retry also failed for question ${i+1}:`, retryErr.message);
        }
      } else {
        console.error(`[Coding Agent] Error on question ${i+1} for "${topic}":`, err.message);
      }
    }
  }

  console.log(`[Coding Agent] Generated ${results.length}/${maxCount} questions for "${topic}"`);

  onProgress?.({
    agent:   'coding',
    status:  'done',
    message: `💻 Coding Agent generated ${results.length} problems on "${topic}"`,
  });

  return results;
}

module.exports = { runCodingAgent, CODING_AGENT_INFO };