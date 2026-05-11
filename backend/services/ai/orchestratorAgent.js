// services/ai/orchestratorAgent.js
// Supports per-topic question counts via questionCounts map

const { runMCQAgent,      MCQ_AGENT_INFO      } = require('./agents/mcqAgent');
const { runSQLAgent,      SQL_AGENT_INFO      } = require('./agents/sqlAgent');
const { runCodingAgent,   CODING_AGENT_INFO   } = require('./agents/codingAgent');
const { runAptitudeAgent, APTITUDE_AGENT_INFO } = require('./agents/aptitudeAgent');
const { runVerbalAgent,   VERBAL_AGENT_INFO   } = require('./agents/verbalAgent');

const AGENT_REGISTRY = {
  mcq:      { info: MCQ_AGENT_INFO,      runner: runMCQAgent      },
  sql:      { info: SQL_AGENT_INFO,      runner: runSQLAgent      },
  coding:   { info: CODING_AGENT_INFO,   runner: runCodingAgent   },
  aptitude: { info: APTITUDE_AGENT_INFO, runner: runAptitudeAgent },
  verbal:   { info: VERBAL_AGENT_INFO,   runner: runVerbalAgent   },
};

async function orchestrateAgents({ agentTopics, questionsPerTopic, difficulty }, onProgress) {
  onProgress?.({
    agent: 'orchestrator', status: 'start',
    message: '🤖 NeuroGenerate AI coordinating all agents...',
  });

  const defaultCount = questionsPerTopic || 3;
  const allResults   = [];
  const errors       = [];
  const agentStats   = {};
  const tasks        = [];

  for (const [agentKey, config] of Object.entries(agentTopics)) {
    const agentEntry = AGENT_REGISTRY[agentKey];
    if (!agentEntry) { console.warn(`[Orchestrator] Unknown agent: "${agentKey}"`); continue; }

    // Config can be:
    // 1. Array of strings (legacy): ['topic1', 'topic2']
    // 2. Object with topics array: { topics: [...], platform, questionCounts: {topic: count} }
    let topics         = [];
    let platform       = null;
    let questionCounts = {}; // per-topic override

    if (Array.isArray(config)) {
      topics = config;
    } else {
      topics         = config.topics         || [];
      platform       = config.platform       || null;
      questionCounts = config.questionCounts || {};
    }

    for (const topic of topics) {
      if (!topic?.trim()) continue;
      const count = questionCounts[topic] || defaultCount;
      tasks.push({ agentKey, topic: topic.trim(), count, runner: agentEntry.runner, platform });
    }
  }

  if (tasks.length === 0) {
    console.error('[Orchestrator] No valid tasks. agentTopics:', JSON.stringify(agentTopics));
    return { questions: [], errors: [{ error: 'No valid topics provided' }], stats: { total: 0, byAgent: {} } };
  }

  onProgress?.({
    agent: 'orchestrator', status: 'topic',
    message: `📋 ${tasks.length} task(s) queued — running in parallel...`,
  });

  console.log(`[Orchestrator] Tasks:`, tasks.map(t => `${t.agentKey}:"${t.topic}"×${t.count}`));

  const settled = await Promise.allSettled(
    tasks.map(async ({ agentKey, topic, count, runner, platform }) => {
      try {
        const result = await runner(topic, count, difficulty, onProgress, platform);
        console.log(`[Orchestrator] ${agentKey}:"${topic}"×${count} → ${result.length} questions`);
        agentStats[agentKey] = (agentStats[agentKey] || 0) + result.length;
        return result;
      } catch (err) {
        console.error(`[Orchestrator] FAILED — ${agentKey}:"${topic}":`, err.message);
        errors.push({ agent: agentKey, topic, error: err.message });
        agentStats[agentKey] = agentStats[agentKey] || 0;
        return [];
      }
    })
  );

  settled.forEach(r => { if (r.status === 'fulfilled') allResults.push(...r.value); });

  console.log(`[Orchestrator] Total: ${allResults.length} questions, ${errors.length} errors`);

  onProgress?.({
    agent: 'orchestrator', status: 'complete',
    message: `✅ Done! Generated ${allResults.length} questions.`,
    total: allResults.length,
  });

  return {
    questions: allResults,
    errors,
    stats: { total: allResults.length, byAgent: agentStats },
  };
}

module.exports = { orchestrateAgents, AGENT_REGISTRY };