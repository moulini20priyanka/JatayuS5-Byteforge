// agents/verbalAgent.js
const groq = require('../utils/groqClient');

const VERBAL_AGENT_INFO = {
  key:         'verbal',
  name:        'Verbal Agent',
  emoji:       '📖',
  color:       '#db2777',
  description: 'English verbal ability questions',
};

async function runVerbalAgent(topic, count, difficulty, onProgress) {
  onProgress?.({
    agent:   'verbal',
    status:  'generating',
    message: `📖 Verbal Agent generating ${count} questions on "${topic}"...`,
  });

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
    "difficulty": "easy",
    "topic": "Vocabulary"
  }
]`,
        },
        {
          role:    'user',
          content: `Generate exactly ${count} ${difficulty || 'medium'} difficulty verbal ability questions about: "${topic}".
Include grammar, vocabulary, comprehension, or verbal reasoning as appropriate to the topic.
Return ONLY the JSON array.`,
        },
      ],
    });

    const text      = response.choices[0]?.message?.content || '';
    const questions = parseJSON(text, 'Verbal');

    onProgress?.({
      agent:   'verbal',
      status:  'done',
      message: `📖 Verbal Agent generated ${questions.length} questions on "${topic}"`,
    });

    return questions.map((q, i) => ({
      ...q,
      id:         `verbal_${Date.now()}_${i}`,
      type:       'verbal',
      agentType:  'verbal',
      agentName:  VERBAL_AGENT_INFO.name,
      agentEmoji: VERBAL_AGENT_INFO.emoji,
      topic:      q.topic || topic,
    }));

  } catch (err) {
    console.error(`[Verbal Agent] FAILED on topic "${topic}":`, err.message);
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

module.exports = { runVerbalAgent, VERBAL_AGENT_INFO };