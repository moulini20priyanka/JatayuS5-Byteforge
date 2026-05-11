// agents/sqlAgent.js
const groq = require('../utils/groqClient');

const SQL_AGENT_INFO = {
  key:         'sql',
  name:        'SQL Agent',
  emoji:       '🗄️',
  color:       '#7c3aed',
  description: 'SQL query and database questions',
};

async function runSQLAgent(topic, count, difficulty, onProgress) {
  onProgress?.({
    agent:   'sql',
    status:  'generating',
    message: `🗄️ SQL Agent generating ${count} questions on "${topic}"...`,
  });

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
    "difficulty": "medium",
    "topic": "Topic name"
  }
]`,
        },
        {
          role:    'user',
          content: `Generate exactly ${count} ${difficulty || 'medium'} difficulty SQL MCQ questions about: "${topic}".
Requirements:
- Focus on SQL syntax, query writing, joins, aggregations, indexing as relevant to the topic
- Each question must have exactly 4 options labeled A), B), C), D)
- The answer field must be the FULL text of the correct option
- Include some questions with sample SQL code snippets where relevant
Return ONLY the JSON array, nothing else.`,
        },
      ],
    });

    const text      = response.choices[0]?.message?.content || '';
    const questions = parseJSON(text, 'SQL');

    console.log(`[SQL Agent] Generated ${questions.length} questions for "${topic}"`);

    onProgress?.({
      agent:   'sql',
      status:  'done',
      message: `🗄️ SQL Agent generated ${questions.length} questions on "${topic}"`,
    });

    return questions.map((q, i) => ({
      ...q,
      id:         `sql_${Date.now()}_${i}`,
      type:       'sql',
      agentType:  'sql',
      agentName:  SQL_AGENT_INFO.name,
      agentEmoji: SQL_AGENT_INFO.emoji,
      topic:      q.topic || topic,
    }));

  } catch (err) {
    console.error(`[SQL Agent] FAILED on topic "${topic}":`, err.message);
    onProgress?.({
      agent:   'sql',
      status:  'error',
      message: `🗄️ SQL Agent failed: ${err.message}`,
    });
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

module.exports = { runSQLAgent, SQL_AGENT_INFO };