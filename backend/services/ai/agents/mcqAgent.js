// agents/mcqAgent.js
const groq = require('../utils/groqClient');

const MCQ_AGENT_INFO = {
  key:         'mcq',
  name:        'MCQ Generator Agent',
  emoji:       '📝',
  color:       '#22c87a',
  description: 'Classic multiple choice questions',
};

async function runMCQAgent(topic, count, difficulty, onProgress) {
  onProgress?.({
    agent:   'mcq',
    status:  'generating',
    message: `📝 MCQ Agent generating ${count} questions on "${topic}"...`,
  });

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
    "difficulty": "medium",
    "topic": "Topic name here"
  }
]`,
        },
        {
          role:    'user',
          content: `Generate exactly ${count} ${difficulty || 'medium'} difficulty MCQ questions about: "${topic}".
Requirements:
- Each question must have exactly 4 options labeled A), B), C), D)
- The answer field must be the FULL text of the correct option (e.g. "A) Python")
- Questions must be technically accurate and relevant
- Vary the correct answer position (don't always make A correct)
Return ONLY the JSON array, nothing else.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    console.log(`[MCQ Agent] Raw response for "${topic}" (first 200 chars):`, text.substring(0, 200));

    const questions = parseJSON(text, 'MCQ');

    if (questions.length === 0) {
      console.error(`[MCQ Agent] Parsed 0 questions from response. Full response:\n${text}`);
    }

    onProgress?.({
      agent:   'mcq',
      status:  'done',
      message: `📝 MCQ Agent generated ${questions.length} questions on "${topic}"`,
    });

    return questions.map((q, i) => ({
      ...q,
      id:         `mcq_${Date.now()}_${i}`,
      type:       'mcq',
      agentType:  'mcq',
      agentName:  MCQ_AGENT_INFO.name,
      agentEmoji: MCQ_AGENT_INFO.emoji,
      topic:      q.topic || topic,
    }));

  } catch (err) {
    console.error(`[MCQ Agent] FAILED on topic "${topic}":`, err.message);
    onProgress?.({
      agent:   'mcq',
      status:  'error',
      message: `📝 MCQ Agent failed: ${err.message}`,
    });
    return [];
  }
}

function parseJSON(text, agentName = 'Agent') {
  try {
    // Strip markdown fences if present
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to extract a JSON array
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);

    // Try parsing as-is
    return JSON.parse(clean);
  } catch (e) {
    console.error(`[${agentName}] JSON parse error:`, e.message);
    console.error(`[${agentName}] Attempted to parse:`, text.substring(0, 500));
    return [];
  }
}

module.exports = { runMCQAgent, MCQ_AGENT_INFO };