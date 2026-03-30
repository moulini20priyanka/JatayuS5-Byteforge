// backend/services/questionShuffler.js
// Adaptive MCQ: Easy → Medium → Hard
// Fisher-Yates shuffle within each tier
// Also shuffles answer options per student (so option positions differ)

/**
 * Fisher-Yates in-place shuffle
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffle the answer options of a single question
 * Remaps correct_ans to the new position
 */
function shuffleOptions(question) {
  // Only for MCQ/SQL (coding has no options)
  if (question.type === 'coding' || !question.option_a) return question;

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ];

  // Remember which text was correct
  const correctText = options.find(o => o.key === question.correct_ans)?.text;

  shuffle(options);

  const newCorrect = options.find(o => o.text === correctText)?.key || 'A';

  return {
    ...question,
    option_a: options[0].text,
    option_b: options[1].text,
    option_c: options[2].text,
    option_d: options[3].text,
    correct_ans: newCorrect,
  };
}

/**
 * Main function: takes array of questions, returns adaptive-ordered randomized list
 * Order: easy → medium → hard
 * Within each tier: Fisher-Yates shuffled
 * Each question's options also shuffled
 *
 * @param {Array} questions - raw questions from DB
 * @param {string} examType - 'mcq' | 'sql' | 'coding' | 'mixed'
 * @returns {Array} shuffled questions
 */
function adaptiveShuffle(questions, examType = 'mixed') {
  // Filter by type if needed
  let filtered = questions;
  if (examType !== 'mixed') {
    filtered = questions.filter(q => q.type === examType);
    // If no type-specific questions, fall back to all
    if (filtered.length === 0) filtered = questions;
  }

  // Split into tiers
  const easy   = shuffle(filtered.filter(q => q.difficulty === 'easy'));
  const medium = shuffle(filtered.filter(q => q.difficulty === 'medium'));
  const hard   = shuffle(filtered.filter(q => q.difficulty === 'hard'));

  // Combine: easy first, then medium, then hard
  const ordered = [...easy, ...medium, ...hard];

  // Shuffle options per question
  return ordered.map(q => shuffleOptions(q));
}

/**
 * Get questions for a specific exam page type
 * Called by the exam page endpoints
 *
 * @param {Array} allQuestions - all questions for this exam from DB
 * @param {string} pageType - 'mcq' | 'sql' | 'coding'
 * @returns {Array}
 */
function getQuestionsForPage(allQuestions, pageType) {
  const typeMap = {
    mcq:    ['mcq'],
    sql:    ['sql'],
    coding: ['coding'],
  };

  const types = typeMap[pageType] || ['mcq', 'sql', 'coding'];
  const filtered = allQuestions.filter(q => types.includes(q.type?.toLowerCase()));

  return adaptiveShuffle(filtered, pageType);
}

module.exports = { adaptiveShuffle, getQuestionsForPage, shuffle };