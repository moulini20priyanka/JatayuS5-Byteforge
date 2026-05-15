// services/ai/orchestratorAgent.js
// v3: Passes mixedCounts per topic through extraConfig to all agents
//     mixedCounts shape: { easy: N, medium: N, hard: N }

const { runMCQAgent,      MCQ_AGENT_INFO      } = require('./agents/mcqAgent');
const { runSQLAgent,      SQL_AGENT_INFO      } = require('./agents/sqlAgent');
const { runCodingAgent,   CODING_AGENT_INFO   } = require('./agents/codingAgent');
const { runAptitudeAgent, APTITUDE_AGENT_INFO } = require('./agents/aptitudeAgent');
const { runVerbalAgent,   VERBAL_AGENT_INFO   } = require('./agents/verbalAgent');
const { runTheoryAgent,   THEORY_AGENT_INFO   } = require('./agents/theoryAgent');

const AGENT_REGISTRY = {
  mcq:      { info: MCQ_AGENT_INFO,      runner: runMCQAgent      },
  sql:      { info: SQL_AGENT_INFO,      runner: runSQLAgent      },
  coding:   { info: CODING_AGENT_INFO,   runner: runCodingAgent   },
  aptitude: { info: APTITUDE_AGENT_INFO, runner: runAptitudeAgent },
  verbal:   { info: VERBAL_AGENT_INFO,   runner: runVerbalAgent   },
  theory:   { info: THEORY_AGENT_INFO,   runner: runTheoryAgent   },
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
    if (!agentEntry) {
      console.warn(`[Orchestrator] Unknown agent: "${agentKey}"`);
      continue;
    }

    // Config shapes:
    // 1. Array of strings (legacy):      ['topic1', 'topic2']
    // 2. Standard object:                { topics: [...], questionCounts: {t: n}, platform? }
    // 3. Mixed difficulty object:        { topics: [...], questionCounts: {t: n}, mixedCounts: {t: {easy,medium,hard}} }
    // 4. Theory extended:                { topics: [...], questionCounts: {...}, markDistribution: {t: {two,five,eight}} }

    let topics           = [];
    let platform         = null;
    let questionCounts   = {};
    let mixedCounts      = {}; // per-topic { easy, medium, hard } — for non-theory agents
    let markDistribution = {}; // theory only

    if (Array.isArray(config)) {
      topics = config;
    } else {
      topics           = config.topics           || [];
      platform         = config.platform         || null;
      questionCounts   = config.questionCounts   || {};
      mixedCounts      = config.mixedCounts      || {}; // NEW: per-topic mixed counts
      markDistribution = config.markDistribution || {};
    }

    for (const topic of topics) {
      if (!topic?.trim()) continue;

      const count = questionCounts[topic] || defaultCount;

      let extraConfig = null;

      if (agentKey === 'theory') {
        // Theory agent: pass mark distribution (two/five/eight) per topic
        extraConfig = {
          markDistribution: markDistribution[topic] || null,
        };
      } else if (mixedCounts[topic]) {
        // Mixed mode: pass per-topic easy/medium/hard counts
        extraConfig = {
          mixedCounts: mixedCounts[topic],
        };
      }
      // If difficulty is 'mixed' globally but no per-topic mixedCounts exist,
      // fall back to normal generation with difficulty='mixed' (agent handles it)

      tasks.push({
        agentKey,
        topic:      topic.trim(),
        count,
        runner:     agentEntry.runner,
        platform,
        extraConfig,
      });
    }
  }

  if (tasks.length === 0) {
    console.error('[Orchestrator] No valid tasks. agentTopics:', JSON.stringify(agentTopics));
    return {
      questions: [],
      errors:    [{ error: 'No valid topics provided' }],
      stats:     { total: 0, byAgent: {} },
    };
  }

  onProgress?.({
    agent: 'orchestrator', status: 'topic',
    message: `📋 ${tasks.length} task(s) queued — running...`,
  });

  console.log(
    '[Orchestrator] Tasks:',
    tasks.map(t => {
      const mc = t.extraConfig?.mixedCounts;
      return mc
        ? `${t.agentKey}:"${t.topic}" E${mc.easy}M${mc.medium}H${mc.hard}`
        : `${t.agentKey}:"${t.topic}"×${t.count}`;
    }),
  );

  const settled = await Promise.allSettled(
    tasks.map(async ({ agentKey, topic, count, runner, platform, extraConfig }) => {
      try {
        const result = await runner(topic, count, difficulty, onProgress, platform, extraConfig);
        console.log(`[Orchestrator] ${agentKey}:"${topic}" → ${result.length} questions`);
        agentStats[agentKey] = (agentStats[agentKey] || 0) + result.length;
        return result;
      } catch (err) {
        console.error(`[Orchestrator] FAILED — ${agentKey}:"${topic}":`, err.message);
        errors.push({ agent: agentKey, topic, error: err.message });
        agentStats[agentKey] = agentStats[agentKey] || 0;
        return [];
      }
    }),
  );

  settled.forEach(r => {
    if (r.status === 'fulfilled') allResults.push(...r.value);
  });

  console.log(`[Orchestrator] Total: ${allResults.length} questions, ${errors.length} errors`);

  onProgress?.({
    agent:   'orchestrator',
    status:  'complete',
    message: `✅ Done! Generated ${allResults.length} questions.`,
    total:   allResults.length,
  });

  return {
    questions: allResults,
    errors,
    stats: { total: allResults.length, byAgent: agentStats },
  };
}

module.exports = { orchestrateAgents, AGENT_REGISTRY };