'use strict';
// backend/services/pdfQuestionParser.js
//
// Robust PDF question parser for NeuroAssess placement exams.
//
// Supported PDF formats (all sections):
//
//  FORMAT A — Tagged header (original format):
//    "1 MCQ What is …"
//    "24 SQL How would you …"
//    "32 CODING Special Binary Tree"
//
//  FORMAT B — Classic numbered (most common):
//    "1. What is …"        "1) What is …"
//    "Q1. What is …"       "Q.1 What is …"
//    "Question 1. …"
//
//  FORMAT C — Bold-numbered (no dot):
//    "1  What is …"   (two spaces after number)
//
//  FORMAT D — Section heading then questions:
//    "Section A: MCQ"  followed by numbered questions
//
//  Options:  A) / A. / (A) / A :   [A-D or a-d]
//  Answers:  "Answer: A"  "Ans: B"  "Correct: C"  "Answer: A) text"
//  Explain:  "Explanation: …"
//  Diff:     "Difficulty: Hard"
//
//  CODING blocks additionally parse:
//    Platform line (HackerEarth / LeetCode / …)
//    "Problem" / "Example" / "Constraints" / "Starter Code" sections

let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch { /* optional */ }

// ─────────────────────────────────────────────────────────────────
// Text cleaning
// ─────────────────────────────────────────────────────────────────

function cleanLines(raw) {
  return raw
    .split('\n')
    .map(l => l.replace(/\r/g, '').trimEnd()) // keep leading spaces for code detection
    .map(l => l.replace(/\s{3,}/g, '  '))     // collapse runs of 3+ spaces to 2
    .map(l => l.trim())                        // now trim fully
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────

function parseDifficulty(text) {
  const t = (text || '').toLowerCase();
  if (/\b(hard|difficult|advanced)\b/.test(t))  return 'hard';
  if (/\b(easy|simple|basic|beginner)\b/.test(t)) return 'easy';
  return 'medium';
}

function extractDifficultyFromLine(line) {
  const m = line.match(/^Difficulty\s*[:=]\s*(easy|medium|hard)/i);
  return m ? m[1].toLowerCase() : null;
}

// Detects if a line is a question header and returns { num, tag, text } or null.
// tag is one of: MCQ, SQL, CODING, APTITUDE, BEHAVIORAL, or null (plain numbered)
function detectQuestionHeader(line) {
  // FORMAT A+ (NEW): "1MCQ text" or "1MCQ" (no space between number and tag)
  // Supports: 1MCQ, 2SQL, 32CODING, 5APTITUDE, 3BEHAVIORAL
  const fmtAplus = line.match(/^(\d+)(MCQ|SQL|CODING|APTITUDE|BEHAVIORAL)\s*([\s\S]*)/i);
  if (fmtAplus) {
    return {
      num: fmtAplus[1],
      tag: fmtAplus[2].toUpperCase(),
      text: fmtAplus[3].trim() || '', // text may be empty if on next line
    };
  }

  // FORMAT A: "1 MCQ text"  /  "1 SQL text"  /  "1 CODING text" (with space)
  const fmtA = line.match(
    /^(\d+)\s+(MCQ|SQL|CODING|APTITUDE|BEHAVIORAL)\s+([\s\S]+)/i
  );
  if (fmtA) return { num: fmtA[1], tag: fmtA[2].toUpperCase(), text: fmtA[3].trim() };

  // FORMAT A (no text after tag — title on next line):
  // "32 CODING" or "5 MCQ" (tag alone with optional space)
  const fmtA2 = line.match(/^(\d+)\s+(MCQ|SQL|CODING|APTITUDE|BEHAVIORAL)\s*$/i);
  if (fmtA2) return { num: fmtA2[1], tag: fmtA2[2].toUpperCase(), text: '' };

  // FORMAT B: "1. text"  "1) text"  "Q1. text"  "Q.1 text"  "Question 1. text"
  const fmtB = line.match(
    /^(?:Q(?:uestion)?\.?\s*)?(\d+)\s*[.):]\s+(.+)/i
  );
  if (fmtB && fmtB[2].length >= 5) return { num: fmtB[1], tag: null, text: fmtB[2].trim() };

  // FORMAT C: "1  text" (double space — rare)
  const fmtC = line.match(/^(\d+)\s{2,}(.+)/);
  if (fmtC && fmtC[2].length >= 5) return { num: fmtC[1], tag: null, text: fmtC[2].trim() };

  return null;
}

// Detects option line → { key: 'A', text: '…' } or null
// Matches: "A) text", "A. text", "(A) text", "A: text", etc.
function detectOption(line) {
  const m = line.match(/^([A-Da-d])\s*[.):\-]\s*(.+)/);
  if (m) return { key: m[1].toUpperCase(), text: m[2].trim() };
  return null;
}

// Detects answer marker → letter ('A'–'D') or null
// Matches: "Answer: A", "Ans: B", "Correct Answer: C", "Answer: A) text…"
function detectAnswer(line) {
  const m = line.match(/^(?:Correct\s+)?Ans(?:wer)?\s*[:=]\s*([A-Da-d])/i);
  if (m) return m[1].toUpperCase();
  
  // Also try: "Answer Key: B" or similar variations
  const m2 = line.match(/^(?:Answer|Ans|Key|Correct)\s*(?:Key|Answer)?\s*[:=]\s*([A-Da-d])/i);
  if (m2) return m2[1].toUpperCase();
  
  return null;
}

// ─────────────────────────────────────────────────────────────────
// MCQ / SQL / Aptitude / Behavioral parser
// ─────────────────────────────────────────────────────────────────

function parseMcqLines(lines, sectionType) {
  const questions = [];
  let cur = null;
  let inExplanation = false;
  let bodyLines = []; // lines between question header and first option
  let qCount = 0; // track questions found

  const flushCurrent = () => {
    if (!cur) return;

    // Validation: minimum requirements
    if (!cur.text || cur.text.length < 5) {
      console.log(`[PdfParser] ✗ Question ${qCount + 1}: text too short ("${(cur.text || '').slice(0, 40)}…")`);
      cur = null;
      return;
    }

    if (cur.options.length < 2) {
      console.log(`[PdfParser] ✗ Question ${qCount + 1}: only ${cur.options.length} options found (need ≥2). Text: "${cur.text.slice(0, 50)}…"`);
      cur = null;
      return;
    }

    // If still no answer key, try to infer from marked options
    if (!cur.answer) {
      for (const opt of cur.options) {
        if (/^[✓●✔\*►]/.test(opt.text)) {
          cur.answer = opt.key;
          opt.text = opt.text.replace(/^[✓●✔\*►]\s*/, '');
          console.log(`[PdfParser] ℹ Question ${qCount + 1}: inferred answer from marked option: ${cur.answer}`);
          break;
        }
      }
    }

    if (!cur.answer) {
      console.log(`[PdfParser] ⚠ Question ${qCount + 1}: no answer found (will store as null)`);
    }

    qCount++;
    const dbType = sectionType === 'sql' ? 'sql' : 'mcq';
    questions.push({
      type:            dbType,
      question_text:   cur.text.trim(),
      option_a:        cur.options[0]?.text || null,
      option_b:        cur.options[1]?.text || null,
      option_c:        cur.options[2]?.text || null,
      option_d:        cur.options[3]?.text || null,
      correct_ans:     cur.answer || null,
      explanation:     cur.explanation || null,
      description:     cur.codeBlock || null,
      platform:        null,
      starter_code:    null,
      constraints_text: null,
      difficulty:      cur.difficulty || 'medium',
    });
    console.log(`[PdfParser] ✓ Question ${qCount} saved: "${cur.text.slice(0, 50)}…" (${cur.options.length} options, ans=${cur.answer})`);

    cur = null;
    inExplanation = false;
    bodyLines = [];
  };

  console.log(`[PdfParser] Starting MCQ parse of ${lines.length} lines (section: ${sectionType})…`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Section heading lines (skip) ──────────────────────────────────
    if (/^(?:Section\s+[A-Z][:.]?\s+|MCQ\s+Section|SQL\s+Questions?|Coding\s+Section)/i.test(line)) {
      flushCurrent();
      continue;
    }

    // ── Explicit answer line ──────────────────────────────────────────
    const ansLetter = detectAnswer(line);
    if (ansLetter) {
      if (cur) {
        console.log(`[PdfParser] ℹ Found answer line: "${line.slice(0, 40)}…" → ${ansLetter}`);
        cur.answer = ansLetter;
      }
      inExplanation = false;
      continue;
    }

    // ── Explanation line ──────────────────────────────────────────────
    const expStart = line.match(/^Explanation\s*[:=]\s*(.*)/i);
    if (expStart) {
      if (cur) {
        cur.explanation = expStart[1].trim();
        inExplanation = true;
        console.log(`[PdfParser] ℹ Explanation started: "${cur.explanation.slice(0, 40)}…"`);
      }
      continue;
    }
    
    // Accumulate multi-line explanations
    if (inExplanation && cur) {
      if (!detectQuestionHeader(line) && !detectOption(line)) {
        cur.explanation += (cur.explanation ? '\n' : '') + line;
        continue;
      }
      inExplanation = false;
      // Fall through to normal processing
    }

    // ── Difficulty inline ─────────────────────────────────────────────
    const diff = extractDifficultyFromLine(line);
    if (diff && cur) { 
      cur.difficulty = diff;
      console.log(`[PdfParser] ℹ Difficulty set: ${diff}`);
      continue;
    }

    // ── Question header ───────────────────────────────────────────────
    const header = detectQuestionHeader(line);
    if (header && (header.tag === null || ['MCQ','SQL','APTITUDE','BEHAVIORAL'].includes(header.tag))) {
      flushCurrent();
      cur = {
        text:       header.text,
        options:    [],
        answer:     null,
        explanation: null,
        difficulty:  parseDifficulty(header.text),
        codeBlock:   null,
      };
      console.log(`[PdfParser] ▶ New question detected: Q${header.num}${header.tag ? ` (${header.tag})` : ''} — text: "${header.text.slice(0, 50)}${header.text.length > 50 ? '…' : ''}"`);
      bodyLines = [];
      inExplanation = false;
      continue;
    }

    if (!cur) continue;

    // ── Option line ───────────────────────────────────────────────────
    const opt = detectOption(line);
    if (opt && cur.options.length < 4) {
      cur.options.push(opt);
      console.log(`[PdfParser] ℹ Option ${opt.key} added: "${opt.text.slice(0, 40)}…"`);
      // If question text was empty (title on separate line from tag), use body as question
      if (!cur.text && bodyLines.length > 0) {
        cur.text = bodyLines.join(' ');
        console.log(`[PdfParser] ℹ Question text assembled from body lines: "${cur.text.slice(0, 50)}…"`);
        bodyLines = [];
      }
      inExplanation = false;
      continue;
    }

    // ── Body / description line (before options appear) ───────────────
    if (cur.options.length === 0) {
      // Could be continuation of question text or a code block
      if (!cur.text) {
        cur.text = line;
        console.log(`[PdfParser] ℹ Question text set: "${line.slice(0, 50)}…"`);
      } else if (looksLikeCode(line)) {
        cur.codeBlock = (cur.codeBlock ? cur.codeBlock + '\n' : '') + line;
      } else {
        // Continuation of question sentence
        bodyLines.push(line);
        cur.text += ' ' + line;
        console.log(`[PdfParser] ℹ Question text extended: "${cur.text.slice(0, 50)}…"`);
      }
    }
    // Lines after options started but before Answer/Explanation → ignore (trailing noise)
  }

  flushCurrent();
  console.log(`[PdfParser] ✓ MCQ parse complete: extracted ${questions.length} questions from ${lines.length} lines`);
  return questions;
}

function looksLikeCode(line) {
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|FROM|WHERE|JOIN|GROUP|ORDER|HAVING|UNION|function|class|def |import |var |let |const |if\s*\(|for\s*\(|\{|\}|\/\/|#\s)/i.test(line);
}

// ─────────────────────────────────────────────────────────────────
// CODING parser — handles both tagged and plain formats
// ─────────────────────────────────────────────────────────────────

const PLATFORM_NAMES = [
  'hackerearth','leetcode','hackerrank','codeforces',
  'geeksforgeeks','codechef','interviewbit','topcoder',
];

const CODING_SECTION_HEADERS = new Map([
  ['problem',               'problem'],
  ['problem statement',     'problem'],
  ['problem description',   'problem'],
  ['example',               'example'],
  ['examples',              'example'],
  ['sample input',          'example'],
  ['function description',  'funcDesc'],
  ['function signature',    'funcDesc'],
  ['parameters',            'funcDesc'],
  ['parameters:',           'funcDesc'],
  ['returns',               'funcDesc'],
  ['returns:',              'funcDesc'],
  ['input format',          'funcDesc'],
  ['output format',         'funcDesc'],
  ['constraints',           'constraints'],
  ['constraints:',          'constraints'],
  ['note',                  'constraints'],
  ['starter code',          'starterCode'],
  ['starter code:',         'starterCode'],
  ['template',              'starterCode'],
  ['solution template',     'starterCode'],
]);

function parseCodingLines(lines) {
  const questions = [];
  let cur = null;
  let activeSection = null;
  let problemCount = 0;

  const flushCurrent = () => {
    if (!cur || !cur.title || cur.title.length < 3) {
      if (cur) console.log(`[PdfParser] ✗ Coding problem rejected: title too short ("${(cur.title || '').slice(0, 30)}…")`);
      cur = null;
      return;
    }
    problemCount++;
    questions.push(buildCodingRow(cur));
    console.log(`[PdfParser] ✓ Coding problem ${problemCount} saved: "${cur.title.slice(0, 50)}…"`);
    cur = null;
    activeSection = null;
  };

  console.log(`[PdfParser] ▶ Starting coding section parse (${lines.length} lines)`);

  for (let i = 0; i < lines.length; i++) {
    const line  = lines[i];
    const lower = line.toLowerCase().trim();

    // ── Coding question header ────────────────────────────────────────
    // FORMAT A: "32 CODING Title"
    const codingTagged = line.match(/^(\d+)\s+CODING\s*(.*)/i);
    if (codingTagged) {
      if (cur) console.log(`[PdfParser] ℹ Found new problem, flushing previous`);
      flushCurrent();
      const title = codingTagged[2].trim() || `Problem ${codingTagged[1]}`;
      cur = newCodingProblem(title);
      console.log(`[PdfParser] ▶ Coding problem detected: "${title}"`);
      activeSection = null;
      continue;
    }

    // FORMAT B: plain numbered — only treat as coding header if we're in a coding
    // section context OR the line looks like a problem title (Title Case, no options)
    if (!cur) {
      const header = detectQuestionHeader(line);
      if (header && header.tag === null) {
        // Heuristic: coding titles are usually title-case phrases without "?"
        if (looksLikeCodingTitle(header.text)) {
          const title = header.text || `Problem ${header.num}`;
          cur = newCodingProblem(title);
          console.log(`[PdfParser] ▶ Coding problem detected (auto): "${title}"`);
          activeSection = null;
          continue;
        }
      }
    }

    if (!cur) continue;

    // ── Platform tag ──────────────────────────────────────────────────
    if (!cur.platform && PLATFORM_NAMES.some(p => lower.includes(p))) {
      cur.platform = line.trim();
      console.log(`[PdfParser] ℹ Platform: ${cur.platform}`);
      continue;
    }

    // ── Section header ────────────────────────────────────────────────
    const sectionKey = CODING_SECTION_HEADERS.get(lower);
    if (sectionKey) {
      activeSection = sectionKey;
      console.log(`[PdfParser] ℹ Section: ${sectionKey}`);
      continue;
    }

    // ── Difficulty ────────────────────────────────────────────────────
    const diff = extractDifficultyFromLine(line);
    if (diff) {
      cur.difficulty = diff;
      console.log(`[PdfParser] ℹ Difficulty: ${diff}`);
      continue;
    }

    // ── Section content ───────────────────────────────────────────────
    switch (activeSection) {
      case 'problem':
        cur.description += (cur.description ? '\n' : '') + line;
        break;
      case 'example':
        cur.examples.push(line);
        break;
      case 'funcDesc':
        cur.funcDesc += (cur.funcDesc ? '\n' : '') + line;
        break;
      case 'constraints':
        cur.constraints += (cur.constraints ? '\n' : '') + line;
        break;
      case 'starterCode':
        cur.starterCode += (cur.starterCode ? '\n' : '') + line;
        break;
      default:
        // Before first section header — append to description
        if (!cur.platform && line.length < 50) {
          // Could be platform or subtitle
          cur.subtitle = (cur.subtitle || '') + ' ' + line;
        } else {
          cur.description += (cur.description ? '\n' : '') + line;
        }
    }
  }

  flushCurrent();
  console.log(`[PdfParser] ✓ Coding parse complete: extracted ${questions.length} problems`);
  return questions;
}

function newCodingProblem(title) {
  return {
    title, platform: null, subtitle: '',
    description: '', examples: [],
    funcDesc: '', constraints: '',
    starterCode: '', difficulty: 'medium',
  };
}

function looksLikeCodingTitle(text) {
  // Coding problem titles tend to be title-case noun phrases, not questions
  const hasQuestion = text.includes('?');
  const hasOptionLike = /^[A-D][.)]\s/.test(text);
  const wordCount = text.split(/\s+/).length;
  return !hasQuestion && !hasOptionLike && wordCount >= 2 && wordCount <= 12;
}

function buildCodingRow(cur) {
  let fullDesc = cur.description.trim();
  if (cur.subtitle.trim()) fullDesc = cur.subtitle.trim() + '\n' + fullDesc;
  if (cur.examples.length > 0) fullDesc += '\n\nExamples:\n' + cur.examples.join('\n');
  if (cur.funcDesc)            fullDesc += '\n\nFunction Description:\n' + cur.funcDesc;

  const starterCode = cur.starterCode.trim() ||
    'function solve(input) {\n  // your code here\n  return "";\n}';

  return {
    type:            'coding',
    question_text:   cur.title.trim(),
    option_a:        null, option_b: null, option_c: null, option_d: null,
    correct_ans:     null,
    explanation:     null,
    description:     fullDesc.trim() || null,
    platform:        cur.platform || null,
    starter_code:    starterCode,
    constraints_text: cur.constraints.trim() || null,
    difficulty:      cur.difficulty || 'medium',
  };
}

// ─────────────────────────────────────────────────────────────────
// Keyword / topic extraction (used for fallback matching)
// ─────────────────────────────────────────────────────────────────

const TOPIC_KEYWORDS = {
  sql:        ['select','join','where','group by','order by','aggregate','index','subquery',
               'foreign key','primary key','normalization','transaction','trigger','view',
               'stored procedure','union','having','distinct','null','constraint'],
  javascript: ['javascript','js','async','promise','closure','prototype','event loop',
               'dom','arrow function','hoisting','scope','callback','fetch','node'],
  python:     ['python','list comprehension','django','flask','pandas','numpy','generator',
               'decorator','lambda','dictionary','tuple','module','pip'],
  java:       ['java','jvm','oop','inheritance','polymorphism','interface','generics',
               'thread','spring','maven','gradle','abstract','overloading'],
  dsa:        ['array','linked list','tree','graph','hash','sort','search','recursion',
               'dynamic programming','stack','queue','heap','binary','complexity'],
  networking: ['tcp','udp','http','dns','ip','subnet','osi','protocol','bandwidth','latency'],
  os:         ['process','thread','scheduling','memory','paging','semaphore','deadlock',
               'file system','cache','kernel','interrupt'],
  dbms:       ['dbms','er diagram','relational','schema','acid','cap theorem','nosql',
               'mongodb','redis','cassandra','indexing','replication','sharding'],
};

/**
 * Extract topic keywords from question text + options.
 * Returns array of matched topic keys e.g. ['sql','dbms']
 */
function extractTopics(questionText, options = []) {
  const combined = [questionText, ...options].join(' ').toLowerCase();
  const matched = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) matched.push(topic);
  }
  return matched;
}

/**
 * Compute a relevance score (0–1) between a bank question and a set of topic tags.
 */
function topicRelevanceScore(bankQuestion, targetTopics) {
  const qTopics = extractTopics(
    bankQuestion.question_text || '',
    [bankQuestion.option_a, bankQuestion.option_b,
     bankQuestion.option_c, bankQuestion.option_d].filter(Boolean)
  );
  if (targetTopics.length === 0 || qTopics.length === 0) return 0;
  const intersection = qTopics.filter(t => targetTopics.includes(t)).length;
  return intersection / Math.max(targetTopics.length, qTopics.length);
}

// ─────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────

async function parsePdfForExam(buffer, sectionType) {
  if (!pdfParse) {
    console.warn('[PdfParser] pdf-parse not installed. Run: npm install pdf-parse');
    return null;
  }

  let rawText;
  try {
    const result = await pdfParse(buffer, {
      normalizeWhitespace: true,
    });
    rawText = result.text;
    console.log(`[PdfParser] ✓ Extracted ${rawText.length} chars from ${sectionType} PDF`);
  } catch (err) {
    console.error(`[PdfParser] ✗ pdf-parse failed for ${sectionType}:`, err.message);
    return null;
  }

  const lines = cleanLines(rawText);
  console.log(`[PdfParser] Processing ${lines.length} lines for section '${sectionType}'`);

  // Debug: log first 30 lines to help diagnose parse issues
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PdfParser] ─── First 30 lines preview ───');
    lines.slice(0, 30).forEach((l, i) => console.log(`  ${String(i+1).padStart(3,'0')} | ${l}`));
  }

  let questions;
  if (sectionType === 'coding') {
    questions = parseCodingLines(lines);
    // If coding parser found nothing, the PDF may be MCQ-styled — try MCQ parser
    if (!questions || questions.length === 0) {
      console.warn('[PdfParser] Coding parser returned 0 — trying MCQ parser as fallback');
      questions = parseMcqLines(lines, 'mcq').map(q => ({
        ...q, type: 'coding',
        starter_code: 'function solve(input) {\n  // your code here\n  return "";\n}',
      }));
    }
  } else {
    questions = parseMcqLines(lines, sectionType);
  }

  // ── Validation Report ──────────────────────────────────────────────
  if (!questions || questions.length === 0) {
    console.error(`[PdfParser] ✗ PARSE FAILED: 0 questions extracted from ${sectionType} PDF (${lines.length} lines)`);
    console.error(`[PdfParser]    Possible causes:`);
    console.error(`[PdfParser]    1. PDF format doesn't match known patterns (1MCQ, 1. text, etc.)`);
    console.error(`[PdfParser]    2. Questions missing options (need ≥2 options per question)`);
    console.error(`[PdfParser]    3. Options not recognized (look for A), B), etc.)`);
    console.error(`[PdfParser]    4. Text extraction failed (check PDF readability)`);
    return null;
  }

  // Log extraction summary
  console.log(`[PdfParser] ✓ PARSE SUCCESS: ${questions.length} questions extracted`);
  console.log(`[PdfParser] ─── Validation Report ───`);

  // Group by type
  const byType = {};
  questions.forEach(q => {
    if (!byType[q.type]) byType[q.type] = [];
    byType[q.type].push(q);
  });

  // Verify completeness
  let allValid = true;
  questions.forEach((q, idx) => {
    const issuesPerQ = [];
    if (!q.question_text || q.question_text.length < 5) issuesPerQ.push('missing/short question');
    if (!q.option_a || !q.option_b) issuesPerQ.push('missing options');
    if (!q.correct_ans && q.type !== 'coding') issuesPerQ.push('missing answer key');
    
    if (issuesPerQ.length > 0) {
      console.warn(`[PdfParser] ⚠ Q${idx + 1}: ${issuesPerQ.join(', ')}`);
      allValid = false;
    } else {
      console.log(`[PdfParser] ✓ Q${idx + 1}: text="${q.question_text.slice(0, 45)}…" opts=[${q.option_a ? 'A' : '-'}${q.option_b ? 'B' : '-'}${q.option_c ? 'C' : '-'}${q.option_d ? 'D' : '-'}] ans=${q.correct_ans || '?'}`);
    }
  });

  // Summary by type
  console.log(`[PdfParser] ─── Summary ───`);
  Object.entries(byType).forEach(([type, qs]) => {
    const withAnswers = qs.filter(q => q.correct_ans).length;
    console.log(`[PdfParser]   ${type}: ${qs.length} questions (${withAnswers} with answer keys)`);
  });

  if (allValid) {
    console.log(`[PdfParser] ✓ All questions valid and ready to store`);
  } else {
    console.log(`[PdfParser] ⚠ Some questions may be incomplete, but will store anyway`);
  }

  console.log(`[PdfParser] ✓ Returning ${questions.length} questions from ${sectionType} PDF`);
  return questions;
}

module.exports = { parsePdfForExam, extractTopics, topicRelevanceScore };