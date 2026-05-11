// agents/aptitudeAgent.js
const groq = require('../utils/groqClient');

const APTITUDE_AGENT_INFO = {
  key:         'aptitude',
  name:        'Aptitude Agent',
  emoji:       '🧮',
  color:       '#0891b2',
  description: 'Quantitative aptitude and reasoning',
};

async function runAptitudeAgent(topic, count, difficulty, onProgress) {
  onProgress?.({
    agent:   'aptitude',
    status:  'generating',
    message: `🧮 Aptitude Agent generating ${count} questions on "${topic}"...`,
  });

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
    "difficulty": "easy",
    "topic": "Speed and Distance"
  }
]`,
        },
        {
          role:    'user',
          content: `Generate exactly ${count} ${difficulty || 'medium'} difficulty aptitude questions about: "${topic}".
Include numerical problems with step-by-step explanations.
Return ONLY the JSON array.`,
        },
      ],
    });

    const text      = response.choices[0]?.message?.content || '';
    const questions = parseJSON(text, 'Aptitude');

    onProgress?.({
      agent:   'aptitude',
      status:  'done',
      message: `🧮 Aptitude Agent generated ${questions.length} questions on "${topic}"`,
    });

    return questions.map((q, i) => ({
      ...q,
      id:         `aptitude_${Date.now()}_${i}`,
      type:       'aptitude',
      agentType:  'aptitude',
      agentName:  APTITUDE_AGENT_INFO.name,
      agentEmoji: APTITUDE_AGENT_INFO.emoji,
      topic:      q.topic || topic,
    }));

  } catch (err) {
    console.error(`[Aptitude Agent] FAILED on topic "${topic}":`, err.message);
    return [];
  }
}

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

module.exports = { runAptitudeAgent, APTITUDE_AGENT_INFO };