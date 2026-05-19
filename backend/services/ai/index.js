// services/ai/index.js
// v3: Fixed MSSQL issues — TABLE_CATALOG, is_active, non-fatal DB errors

const { orchestrateAgents }    = require('./orchestratorAgent');
const { deduplicateQuestions } = require('./deduplicator');
const db = require('../../config/db');

function genQbId() {
  return 'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function stripOptionPrefix(str) {
  return (str || '').toString().replace(/^[A-Da-d][).:\s]+/, '').trim() || null;
}

function normaliseAnswer(q) {
  const raw = (q.answer || q.correctAnswer || q.correct_answer || '').toString().trim();
  const match = raw.match(/^([A-Da-d])/);
  return match ? match[1].toUpperCase() : null;
}

function normaliseType(raw) {
  const t = (raw || 'mcq').toString().toLowerCase().trim();
  const map = {
    'mcq': 'mcq', 'multiple_choice': 'mcq', 'multiple-choice': 'mcq',
    'multiplechoice': 'mcq', 'multiple choice': 'mcq', 'single': 'mcq',
    'single_choice': 'mcq', 'objective': 'mcq', 'quiz': 'mcq',
    'msq': 'mcq', 'multi_select': 'mcq', 'checkbox': 'mcq',
    'coding': 'coding', 'code': 'coding', 'programming': 'coding',
    'program': 'coding', 'algorithmic': 'coding', 'algorithm': 'coding',
    'dsa': 'coding', 'data_structures': 'coding',
    'sql': 'sql', 'query': 'sql', 'database': 'sql', 'db': 'sql',
    'aptitude': 'aptitude', 'logical': 'aptitude', 'logical_reasoning': 'aptitude',
    'quantitative': 'aptitude', 'quant': 'aptitude', 'reasoning': 'aptitude',
    'numerical': 'aptitude', 'math': 'aptitude', 'maths': 'aptitude',
    'verbal': 'verbal', 'english': 'verbal', 'grammar': 'verbal',
    'vocabulary': 'verbal', 'reading': 'verbal', 'comprehension': 'verbal',
    'theory': 'theory', 'written': 'theory', 'descriptive': 'theory',
    'essay': 'theory', 'short_answer': 'theory', 'long_answer': 'theory',
    'theory_question': 'theory', 'university': 'theory',
  };
  const mapped = map[t];
  if (!mapped) console.warn(`[AI Service] Unknown type "${raw}" → "mcq"`);
  return mapped || 'mcq';
}

function normaliseDifficulty(raw, fallback = 'medium') {
  const d = (raw || fallback).toString().toLowerCase().trim();
  const map = {
    'easy': 'easy', 'simple': 'easy', 'basic': 'easy', 'beginner': 'easy',
    'medium': 'medium', 'moderate': 'medium', 'normal': 'medium', 'intermediate': 'medium',
    'hard': 'hard', 'difficult': 'hard', 'advanced': 'hard', 'expert': 'hard', 'tough': 'hard',
  };
  return map[d] || fallback;
}

function extractSampleCasesFromQ(q) {
  if (Array.isArray(q.sample_cases) && q.sample_cases.length)
    return q.sample_cases.map(c => ({ input: c.input ?? '', output: c.output ?? c.expected ?? '' }));
  if (Array.isArray(q.test_cases) && q.test_cases.length)
    return q.test_cases.slice(0, 3).map(c => ({ input: c.input ?? '', output: c.output ?? c.expected ?? '' }));
  if (Array.isArray(q.examples) && q.examples.length)
    return q.examples.map(c => ({ input: c.input ?? '', output: c.output ?? '' }));
  if (q.sample_input !== undefined)
    return [{ input: q.sample_input ?? '', output: q.sample_output ?? '' }];
  return [];
}

function buildMultiLangStarterCode(q) {
  const title = (q.question || q.title || q.problem || '').trim();
  const fnName = title
    .toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    .split(/\s+/).filter(Boolean).slice(0, 4)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('') || 'solution';

  const aiPython = (q.starter_code || q.starterCode || '').toString().trim();
  const python = aiPython || `def ${fnName}(nums):\n    # Write your solution here\n    pass`;
  const java   = `import java.util.*;\n\npublic class Solution {\n    public static void ${fnName}(int[] nums) {\n        // Write your solution here\n    }\n}`;
  const cpp    = `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid ${fnName}(vector<int>& nums) {\n    // Write your solution here\n}`;
  const javascript = `function ${fnName}(nums) {\n    // Write your solution here\n}`;
  return { python, java, cpp, javascript };
}

function buildCodingExplanation(q) {
  return JSON.stringify({
    description:     (q.description    || q.problem_statement || '').toString().trim(),
    constraints:     (q.constraints    || q.constraints_text  || '').toString().trim(),
    explanation:     (q.explanation    || q.hint || q.approach || '').toString().trim(),
    sampleCases:     extractSampleCasesFromQ(q),
    starterCode:     buildMultiLangStarterCode(q),
    platform:        (q.platform || 'leetcode').toLowerCase(),
    timeComplexity:  q.time_complexity  || null,
    spaceComplexity: q.space_complexity || null,
  });
}

async function generateQuestions(
  { agentTopics, questionsPerTopic, difficulty, userId, examId,
    examName, sessionCode, examType, examRequestId },
  onProgress
) {
  // 1. Run all agents
  const result = await orchestrateAgents(
    { agentTopics, questionsPerTopic, difficulty },
    onProgress
  );

  console.log(`[AI Service] ${result.questions.length} raw questions, ${result.errors.length} agent errors`);
  const rawTypes = [...new Set(result.questions.map(q => q.type || q.agentType || 'mcq'))];
  console.log('[AI Service] Raw types from agents:', rawTypes);

  // ── IMPORTANT: return early with questions even if DB fails ──────────────
  // Questions are returned to frontend regardless of DB success/failure
  if (result.questions.length === 0) {
    return { questions: [], stats: result.stats, errors: result.errors };
  }

  // 2. Deduplicate
  const { unique: dedupedQuestions, stats: dedupStats } = deduplicateQuestions(
    result.questions, 0.85
  );
  console.log(`[AI Service] After dedup: ${dedupedQuestions.length} unique (removed ${dedupStats.removed})`);

  // 3. Session — non-fatal, DB errors must not block question return
  let sessionId = null;
  const actualSessionCode = sessionCode || ('QBS-' + Math.random().toString(36).substr(2, 6).toUpperCase());
  const actualExamName    = examName || 'Question Bank';
  const actualExamType    = (examType || 'placement').toLowerCase();

  try {
    // FIX: TABLE_CATALOG not TABLE_SCHEMA for MSSQL
    const [tblCheck] = await db.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
       WHERE TABLE_CATALOG = DB_NAME() AND TABLE_NAME = 'question_bank_sessions'`
    );

    if (tblCheck[0].cnt > 0) {
      const [existing] = await db.query(
        `SELECT TOP 1 id FROM question_bank_sessions WHERE session_code = ?`,
        [actualSessionCode]
      );

      if (existing.length > 0) {
        sessionId = existing[0].id;
        console.log(`[AI Service] Using existing session id=${sessionId}`);
      } else {
        const typeSet   = new Set(dedupedQuestions.map(q => normaliseType(q.type || q.agentType)));
        const topicSet  = new Set(dedupedQuestions.map(q => q.topic || q.subject).filter(Boolean));
        const typesList = JSON.stringify([...typeSet]);
        const topicsStr = [...topicSet].slice(0, 10).join(', ');

        // FIX: added is_active = 1
        const [sessResult] = await db.query(
          `INSERT INTO question_bank_sessions
             (session_code, exam_name, exam_type, exam_request_id, types, topics_summary,
              total_questions, difficulty, created_by, created_at, is_active)
           OUTPUT INSERTED.id AS id
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), 1)`,
          [
            actualSessionCode, actualExamName, actualExamType,
            examRequestId || null, typesList, topicsStr,
            dedupedQuestions.length,
            normaliseDifficulty(difficulty, 'mixed'),
            userId || 1,
          ]
        );
        sessionId = sessResult[0]?.id;
        console.log(`[AI Service] ✅ Session created id=${sessionId} code=${actualSessionCode}`);
      }
    }
  } catch (sessErr) {
    console.error('[AI Service] Session create failed (non-fatal):', sessErr.message);
    // Continue — questions still save with session_code even without session row
  }

  // 4. Save questions — non-fatal, DB errors must NOT block question return to frontend
  let savedCount = 0;
  try {
    for (const q of dedupedQuestions) {
      const type     = normaliseType(q.type || q.agentType);
      const diff     = normaliseDifficulty(q.difficulty || difficulty);
      const isTheory = type === 'theory';
      const qText    = (q.question || q.description || q.title || '').toString().trim();
      const topic    = (q.topic || q.subject || qText.substring(0, 80)).trim() || 'General';

      let optA = null, optB = null, optC = null, optD = null;
      if (!isTheory && Array.isArray(q.options) && q.options.length > 0) {
        const opts = q.options;
        optA = typeof opts[0] === 'object' ? (opts[0]?.text || opts[0]?.value || null) : stripOptionPrefix(opts[0]);
        optB = typeof opts[1] === 'object' ? (opts[1]?.text || opts[1]?.value || null) : stripOptionPrefix(opts[1]);
        optC = typeof opts[2] === 'object' ? (opts[2]?.text || opts[2]?.value || null) : stripOptionPrefix(opts[2]);
        optD = typeof opts[3] === 'object' ? (opts[3]?.text || opts[3]?.value || null) : stripOptionPrefix(opts[3]);
      }

      const explanation = isTheory
        ? (q.expected_answer || q.explanation || null)
        : type === 'coding'
          ? buildCodingExplanation(q)
          : (q.explanation || '').toString().trim() || null;

      try {
        await db.query(
          `INSERT INTO question_bank
             (qb_id, topic, question_text, question, type, difficulty,
              option_a, option_b, option_c, option_d, correct_ans,
              marks, mark_type, bloom_level, unit, subject,
              key_points, keywords, expected_answer, model_answer_outline,
              explanation, language_tag, topic_tag,
              source, created_by, is_active,
              session_id, exam_name, session_code)
           VALUES
             (?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              'NeuroGenerate AI', ?, 1,
              ?, ?, ?)`,
          [
            genQbId(), topic, qText || topic, qText || topic, type, diff,
            isTheory ? null : optA,
            isTheory ? null : optB,
            isTheory ? null : optC,
            isTheory ? null : optD,
            isTheory ? null : normaliseAnswer(q),
            isTheory ? (q.marks      || 5)                   : null,
            isTheory ? (q.mark_type  || `${q.marks || 5}m`) : null,
            isTheory ? (q.bloom_level|| null)                : null,
            isTheory ? (q.unit       || null)                : null,
            isTheory ? (q.subject    || topic)               : null,
            isTheory ? JSON.stringify(Array.isArray(q.key_points) ? q.key_points : []) : null,
            isTheory ? (Array.isArray(q.keywords) ? q.keywords.join(', ') : (q.keywords || null)) : null,
            isTheory ? (q.expected_answer || null)           : null,
            isTheory ? (q.model_answer_outline || null)      : null,
            explanation,
            isTheory ? null : (q.language_tag || q.language || null),
            topic.substring(0, 100),
            userId || 1,
            sessionId,
            actualExamName,
            actualSessionCode,
          ]
        );
        savedCount++;
      } catch (rowErr) {
        // Log per-question error but continue saving remaining questions
        console.error(`[AI Service] Row insert failed for "${qText.substring(0,50)}":`, rowErr.message);
      }
    }

    console.log(`[AI Service] Saved ${savedCount} questions to question_bank`);

    if (sessionId && savedCount > 0) {
      await db.query(
        `UPDATE question_bank_sessions SET total_questions = ? WHERE id = ?`,
        [savedCount, sessionId]
      ).catch(e => console.warn('[AI Service] session count update failed:', e.message));
    }

  } catch (dbErr) {
    // Non-fatal — log but don't throw, so questions still reach frontend
    console.error('[AI Service] DB save failed (non-fatal):', dbErr.message);
  }

  // ── Always return questions to frontend regardless of DB success ──────────
  return {
    questions:   dedupedQuestions,
    stats:       { ...result.stats, dedup: dedupStats },
    errors:      result.errors,
    sessionCode: actualSessionCode,
    examName:    actualExamName,
  };
}

module.exports = { generateQuestions };