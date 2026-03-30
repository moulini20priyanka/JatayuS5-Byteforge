// backend/routes/pdfParser.js
// Handles MULTIPLE PDF formats:
//   Format A (QuizForge): "1 MCQ  Question\nA) ...\nB) ..."
//   Format B (numbered):  "1. Question text\nA. opt\nB. opt\nAnswer: B"
//   Format C (plain):     "Q1. Question\n(A) opt\n(B) opt\nAns: A"

const pdfParse = require('pdf-parse');

async function parsePDFToQuestions(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  return extractQuestions(data.text);
}

function extractQuestions(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ── Try Format A (QuizForge) first ──────────────────────────────────────
  const quizForgeBlocks = normalized.split(/\n(?=\d+\s+(MCQ|SQL|CODING)\b)/i)
    .filter(b => /\d+\s+(MCQ|SQL|CODING)\b/i.test(b));

  if (quizForgeBlocks.length > 0) {
    console.log(`[pdfParser] Detected QuizForge format — ${quizForgeBlocks.length} blocks`);
    const results = [];
    for (const block of quizForgeBlocks) {
      try {
        const typeMatch = block.match(/^\d+\s+(MCQ|SQL|CODING)\b/i);
        if (!typeMatch) continue;
        const qType = typeMatch[1].toUpperCase();
        if (qType === 'CODING') {
          const q = parseCoding(block);
          if (q) results.push(q);
        } else {
          const q = parseMCQorSQL(block, qType);
          if (q) results.push(q);
        }
      } catch (e) {
        console.warn('[pdfParser] QuizForge block skipped:', e.message);
      }
    }
    if (results.length > 0) return results;
  }

  // ── Format B & C: numbered questions (most common PDF formats) ───────────
  console.log('[pdfParser] Falling back to generic numbered-question parser');
  return parseGenericMCQ(normalized);
}

// ─── Format A: QuizForge MCQ/SQL ─────────────────────────────────────────────
function parseMCQorSQL(block, qType) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0].replace(/^\d+\s+(MCQ|SQL)\s*/i, '').trim();

  const questionLines = [firstLine];
  let i = 1;
  while (i < lines.length && !/^[A-D][)\.]\s/i.test(lines[i])) {
    if (/^\d+\s*\/\s*\d+$/.test(lines[i])) { i++; continue; }
    questionLines.push(lines[i]);
    i++;
  }
  const questionText = questionLines.join(' ').trim();

  const options = {};
  while (i < lines.length) {
    const m = lines[i].match(/^([A-D])[)\.]\s*(.+)/i);
    if (m) {
      options[m[1].toUpperCase()] = m[2].trim();
    } else if (/^(Explanation|Answer|Ans)[\s:]/i.test(lines[i])) {
      break;
    }
    i++;
  }

  let explanation = '';
  let correctAns = null;
  while (i < lines.length) {
    const ansMatch = lines[i].match(/^(Answer|Ans|Correct)[:\s]+([A-D])/i);
    if (ansMatch) { correctAns = ansMatch[2].toUpperCase(); i++; continue; }
    if (/^Explanation:/i.test(lines[i])) {
      explanation = lines[i].replace(/^Explanation:\s*/i, '').trim();
    }
    i++;
  }

  if (!options.A || !options.B) return null;
  if (!questionText) return null;

  correctAns = correctAns || inferCorrectAnswer(explanation, options) || 'A';

  return {
    type: qType === 'SQL' ? 'sql' : 'mcq',
    question_text: questionText,
    option_a: options.A || '',
    option_b: options.B || '',
    option_c: options.C || '',
    option_d: options.D || '',
    correct_ans: correctAns,
    explanation: explanation.trim(),
    difficulty: inferDifficulty(block),
  };
}

// ─── Format A: QuizForge CODING ───────────────────────────────────────────────
function parseCoding(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0].replace(/^\d+\s+CODING\s*/i, '').trim();
  const platformMatch = firstLine.match(/(GeeksForGeeks|LeetCode|HackerRank)/i);
  const platform = platformMatch ? platformMatch[1] : '';
  const title = firstLine.replace(/(GeeksForGeeks|LeetCode|HackerRank)/i, '').trim();

  let inProblem = false, inStarter = false, inConstraints = false;
  const problemLines = [], starterLines = [], constraintLines = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^Problem$/i.test(line))       { inProblem = true;  inStarter = false; inConstraints = false; continue; }
    if (/^Starter Code$/i.test(line))  { inStarter = true;  inProblem = false; inConstraints = false; continue; }
    if (/^Constraints$/i.test(line))   { inConstraints = true; inStarter = false; inProblem = false; continue; }
    if (/^\d+\s*\/\s*\d+$/.test(line)) continue;
    if (inProblem)      problemLines.push(line);
    else if (inStarter) starterLines.push(line);
    else if (inConstraints) constraintLines.push(line);
  }

  return {
    type: 'coding',
    question_text: title || 'Coding Problem',
    description: problemLines.join(' ').trim(),
    platform,
    starter_code: starterLines.join('\n').trim(),
    constraints: constraintLines.join('\n').trim(),
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_ans: null,
    explanation: '',
    difficulty: inferDifficulty(block),
  };
}

// ─── Format B/C: Generic numbered MCQ (handles most real-world PDF exports) ───
//
// Supports:
//   "1. Question"  or  "Q1. Question"  or  "1) Question"
//   "A. opt"  or  "A) opt"  or  "(A) opt"
//   "Answer: B"  or  "Ans: B"  or  "Correct Answer: B"
//   Optional "Explanation: ..."
//
function parseGenericMCQ(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];

  // Regex to detect start of a new question
  const qStartRe = /^(?:Q\.?\s*)?(\d+)[.)]\s+(.+)/i;
  // Regex for option lines
  const optRe = /^\(?([A-D])[.)]\s*(.+)/i;
  // Regex for answer line
  const ansRe = /^(?:Answer|Ans|Correct\s*Answer|Key)[:\s]+([A-D])/i;
  // Regex for explanation
  const expRe = /^(?:Explanation|Reason|Solution)[:\s]+(.+)/i;

  let cur = null;

  const pushCurrent = () => {
    if (!cur) return;
    const { questionText, options, correctAns, explanation, marksHint } = cur;
    if (!questionText || !options.A || !options.B) return; // need at least A and B

    questions.push({
      type: 'mcq',
      question_text: questionText,
      option_a: options.A || '',
      option_b: options.B || '',
      option_c: options.C || '',
      option_d: options.D || '',
      correct_ans: correctAns || 'A',
      explanation: explanation || '',
      difficulty: marksHint > 3 ? 'hard' : marksHint > 1 ? 'medium' : 'easy',
    });
  };

  for (const line of lines) {
    // Skip page headers/footers
    if (/^\d+\s*\/\s*\d+$/.test(line)) continue;
    if (/^page\s+\d+/i.test(line))     continue;

    // Answer line — can appear before or after options
    const ansMatch = line.match(ansRe);
    if (ansMatch && cur) {
      cur.correctAns = ansMatch[1].toUpperCase();
      continue;
    }

    // Explanation line
    const expMatch = line.match(expRe);
    if (expMatch && cur) {
      cur.explanation = expMatch[1];
      continue;
    }

    // New question start
    const qMatch = line.match(qStartRe);
    if (qMatch) {
      pushCurrent();
      // Extract marks hint e.g. "[2 marks]" or "(2M)"
      const marksMatch = qMatch[2].match(/\[(\d+)\s*m(?:arks?)?\]|\((\d+)\s*[Mm]\)/i);
      const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2]) : 1;
      cur = {
        questionText: qMatch[2].replace(/\[.*?\]|\(\d+\s*[Mm]\)/g, '').trim(),
        options: {},
        correctAns: null,
        explanation: '',
        marksHint: marks,
      };
      continue;
    }

    // Option line
    const optMatch = line.match(optRe);
    if (optMatch && cur) {
      cur.options[optMatch[1].toUpperCase()] = optMatch[2].trim();
      continue;
    }

    // Continuation of question text (before any options)
    if (cur && Object.keys(cur.options).length === 0 && !cur.correctAns) {
      cur.questionText += ' ' + line;
    }
  }

  pushCurrent(); // don't forget last question

  console.log(`[pdfParser] Generic parser found ${questions.length} questions`);
  return questions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function inferCorrectAnswer(explanation, options) {
  if (!explanation) return null;
  const expLower = explanation.toLowerCase();
  for (const [key, val] of Object.entries(options)) {
    if (val && expLower.includes(val.toLowerCase().substring(0, 15))) return key;
  }
  return null;
}

function inferDifficulty(block) {
  const m = block.match(/Difficulty:\s*(easy|medium|hard)/i);
  if (m) return m[1].toLowerCase();
  if (/CODING/i.test(block)) return 'hard';
  return 'medium';
}

module.exports = { parsePDFToQuestions };