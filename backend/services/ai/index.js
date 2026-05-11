// services/ai/index.js
// Bridge between routes/ai.js and orchestratorAgent
// Handles: deduplication, DB persistence, multi-language starter code

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

// ── Normalise AI type → valid DB enum ('mcq','coding','sql','aptitude','verbal') ──
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
  };
  const mapped = map[t];
  if (!mapped) console.warn(`[AI Service] Unknown type "${raw}" → "mcq"`);
  return mapped || 'mcq';
}

// ── Normalise difficulty → valid DB enum ('easy','medium','hard') ─────────────
function normaliseDifficulty(raw, fallback = 'medium') {
  const d = (raw || fallback).toString().toLowerCase().trim();
  const map = {
    'easy': 'easy', 'simple': 'easy', 'basic': 'easy', 'beginner': 'easy',
    'medium': 'medium', 'moderate': 'medium', 'normal': 'medium', 'intermediate': 'medium',
    'hard': 'hard', 'difficult': 'hard', 'advanced': 'hard', 'expert': 'hard', 'tough': 'hard',
  };
  return map[d] || fallback;
}

// ── Extract sample test cases from any shape the AI might return ──────────────
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

// ── Multi-language starter code generator ────────────────────────────────────
// Derives Python / Java / C++ / JavaScript stubs from the question title.
// The coding editor reads starterCode[selectedLanguage] at runtime.
function buildMultiLangStarterCode(q) {
  const title = (q.question || q.title || q.problem || '').trim();

  // camelCase function name from first 4 words of title
  const fnName = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('') || 'solution';

  // Prefer AI-provided Python starter if present
  const aiPython = (q.starter_code || q.starterCode || '').toString().trim();

  const python = aiPython ||
`def ${fnName}(nums):
    # Write your solution here
    pass

# Example usage:
# print(${fnName}([]))`;

  const java =
`import java.util.*;

public class Solution {
    public static void ${fnName}(int[] nums) {
        // Write your solution here
    }

    public static void main(String[] args) {
        // Example usage
        int[] nums = {};
        ${fnName}(nums);
    }
}`;

  const cpp =
`#include <bits/stdc++.h>
using namespace std;

void ${fnName}(vector<int>& nums) {
    // Write your solution here
}

int main() {
    vector<int> nums = {};
    ${fnName}(nums);
    return 0;
}`;

  const javascript =
`/**
 * @param {number[]} nums
 * @return {void}
 */
function ${fnName}(nums) {
    // Write your solution here
}

// Example usage:
// console.log(${fnName}([]));`;

  return { python, java, cpp, javascript };
}

/**
 * Build the explanation blob for a coding question.
 * Stored as JSON string in the `explanation` column.
 * Frontend parses this to render rich preview + multi-lang starter code.
 *
 * Shape:
 * {
 *   description, constraints, explanation,
 *   sampleCases: [{ input, output }],
 *   starterCode: { python, java, cpp, javascript },
 *   platform, timeComplexity, spaceComplexity
 * }
 */
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

// ─────────────────────────────────────────────────────────────────────────────

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

  if (result.questions.length === 0) {
    return { questions: [], stats: result.stats, errors: result.errors };
  }

  // 2. Deduplicate ──────────────────────────────────────────────────────────
  const { unique: dedupedQuestions, stats: dedupStats } = deduplicateQuestions(
    result.questions,
    0.85  // 85 % Jaccard similarity threshold
  );
  console.log(`[AI Service] After dedup: ${dedupedQuestions.length} unique (removed ${dedupStats.removed})`);

  // 3. Find or create session ───────────────────────────────────────────────
  let sessionId = null;
  const actualSessionCode = sessionCode || ('QBS-' + Math.random().toString(36).substr(2, 6).toUpperCase());
  const actualExamName    = examName || 'Question Bank';
  const actualExamType    = (examType || 'placement').toLowerCase();

  try {
    const [tblCheck] = await db.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_sessions'`
    );

    if (tblCheck[0].cnt > 0) {
      const [existing] = await db.query(
        `SELECT id FROM question_bank_sessions WHERE session_code = ? LIMIT 1`,
        [actualSessionCode]
      );

      if (existing.length > 0) {
        sessionId = existing[0].id;
        console.log(`[AI Service] Using existing session id=${sessionId}`);
      } else {
        const typeSet   = new Set(dedupedQuestions.map(q => normaliseType(q.type || q.agentType)));
        const topicSet  = new Set(dedupedQuestions.map(q => q.topic).filter(Boolean));
        const typesList = JSON.stringify([...typeSet]);
        const topicsStr = [...topicSet].slice(0, 10).join(', ');

        const [sessResult] = await db.query(
          `INSERT INTO question_bank_sessions
             (session_code, exam_name, exam_type, exam_request_id, types, topics_summary,
              total_questions, difficulty, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            actualSessionCode, actualExamName, actualExamType,
            examRequestId || null, typesList, topicsStr,
            dedupedQuestions.length,
            normaliseDifficulty(difficulty, 'mixed'),
            userId || 1,
          ]
        );
        sessionId = sessResult.insertId;
        console.log(`[AI Service] Created session id=${sessionId} code=${actualSessionCode}`);
      }
    }
  } catch (sessErr) {
    console.error('[AI Service] Session create failed (non-fatal):', sessErr.message);
  }

  // 4. Save questions to question_bank ─────────────────────────────────────
  try {
    const rows = dedupedQuestions.map(q => {
      const type  = normaliseType(q.type || q.agentType);
      const diff  = normaliseDifficulty(q.difficulty || difficulty);
      const qText = (q.question || q.description || q.title || '').toString().trim();
      const topic = (q.topic || qText.substring(0, 80)).trim() || 'General';

      let optA = null, optB = null, optC = null, optD = null;
      if (Array.isArray(q.options) && q.options.length > 0) {
        const opts = q.options;
        optA = typeof opts[0] === 'object' ? (opts[0]?.text || opts[0]?.value || null) : stripOptionPrefix(opts[0]);
        optB = typeof opts[1] === 'object' ? (opts[1]?.text || opts[1]?.value || null) : stripOptionPrefix(opts[1]);
        optC = typeof opts[2] === 'object' ? (opts[2]?.text || opts[2]?.value || null) : stripOptionPrefix(opts[2]);
        optD = typeof opts[3] === 'object' ? (opts[3]?.text || opts[3]?.value || null) : stripOptionPrefix(opts[3]);
      }

      // Coding → rich JSON blob; others → plain text
      const explanation = type === 'coding'
        ? buildCodingExplanation(q)
        : (q.explanation || '').toString().trim() || null;

      return [
        genQbId(),               // 1  qb_id
        topic,                   // 2  topic
        qText || topic,          // 3  question_text
        type,                    // 4  type        ← always valid enum
        diff,                    // 5  difficulty  ← always valid enum
        optA,                    // 6  option_a
        optB,                    // 7  option_b
        optC,                    // 8  option_c
        optD,                    // 9  option_d
        normaliseAnswer(q),      // 10 correct_ans
        explanation,             // 11 explanation (JSON string for coding)
        null,                    // 12 language_tag
        topic.substring(0, 100), // 13 topic_tag
        'NeuroGenerate AI',      // 14 source
        userId || 1,             // 15 created_by
        1,                       // 16 is_active
        sessionId,               // 17 session_id
        actualExamName,          // 18 exam_name
        actualSessionCode,       // 19 session_code
      ];
    });

    console.log('[AI Service] Sample row[0]:', JSON.stringify(rows[0]));
    console.log('[AI Service] Row count:', rows.length, '| Cols per row:', rows[0]?.length);

    await db.query(
      `INSERT INTO question_bank
         (qb_id, topic, question_text, type, difficulty,
          option_a, option_b, option_c, option_d,
          correct_ans, explanation,
          language_tag, topic_tag, source, created_by, is_active,
          session_id, exam_name, session_code)
       VALUES ?`,
      [rows]
    );

    console.log(`[AI Service] Saved ${rows.length} questions to question_bank`);

    if (sessionId) {
      await db.query(
        `UPDATE question_bank_sessions SET total_questions = ? WHERE id = ?`,
        [rows.length, sessionId]
      );
    }

  } catch (dbErr) {
    console.error('[AI Service] DB insert FAILED:');
    console.error('  message:    ', dbErr.message);
    console.error('  code:       ', dbErr.code);
    console.error('  sqlMessage: ', dbErr.sqlMessage);
    console.error('  sql:        ', dbErr.sql?.substring(0, 500));
    throw dbErr;
  }

  return {
    questions:   dedupedQuestions,
    stats:       { ...result.stats, dedup: dedupStats },
    errors:      result.errors,
    sessionCode: actualSessionCode,
    examName:    actualExamName,
  };
}

module.exports = { generateQuestions };