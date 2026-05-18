
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


function shuffleOptions(question) {
  // Only for MCQ/SQL (coding has no options)
  if (question.type === 'coding' || !question.option_a) return question;

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ];

  // Remember which text was correct before shuffle
  const correctText = options.find(o => o.key === question.correct_ans)?.text;

  shuffle(options);

  // Find the new position of the correct answer
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
 * Main function: Adaptive shuffle with difficulty tiering
 * Each student gets same questions in different random order
 * Order: easy → medium → hard → other
 * Within each tier: Fisher-Yates shuffled
 * Each question's options also shuffled per student
 *
 * @param {Array} questions - raw questions from DB
 * @param {string} examType - 'mcq' | 'sql' | 'coding' | 'mixed'
 * @returns {Array} shuffled questions with shuffled options, preserving question IDs
 */
function adaptiveShuffle(questions, examType = 'mixed') {
  // Filter by type if needed
  let filtered = questions;
  if (examType !== 'mixed') {
    filtered = questions.filter(q => q.type === examType);
    // If no type-specific questions, fall back to all
    if (filtered.length === 0) filtered = questions;
  }

  // Group by difficulty
  const easy   = shuffle(filtered.filter(q => q.difficulty === 'easy' || q.difficulty === 'Easy'));
  const medium = shuffle(filtered.filter(q => q.difficulty === 'medium' || q.difficulty === 'Medium'));
  const hard   = shuffle(filtered.filter(q => q.difficulty === 'hard' || q.difficulty === 'Hard'));
  const other  = shuffle(filtered.filter(q => !['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard'].includes(q.difficulty)));

  // Combine: easy first, then medium, then hard, then other
  // This ensures progressive difficulty
  const ordered = [...easy, ...medium, ...hard, ...other];

  // Shuffle options for each question per student
  // This changes correct answer positions but keeps question IDs and numbering
  const final = ordered.map((q, idx) => ({
    ...shuffleOptions(q),
    question_index: idx + 1, // 1-based numbering (1, 2, 3...)
  }));

  return final;
}

/**
 * Get questions for a specific exam page type with adaptive shuffling
 * Each student gets the same questions in random order
 * Question numbering: 1, 2, 3... (only order changes)
 *
 * @param {Array} allQuestions - all questions for this exam from DB
 * @param {string} pageType - 'mcq' | 'sql' | 'coding'
 * @param {string} studentId - optional student ID for logging
 * @returns {Array} shuffled questions with question_index property
 */
function getQuestionsForPage(allQuestions, pageType, studentId = 'unknown') {
  const typeMap = {
    mcq:    ['mcq'],
    sql:    ['sql'],
    coding: ['coding'],
  };

  const types = typeMap[pageType] || ['mcq', 'sql', 'coding'];
  const filtered = allQuestions.filter(q => types.includes(q.type?.toLowerCase()));

  const shuffled = adaptiveShuffle(filtered, pageType);
  console.log(`[Shuffle] Student ${studentId} got ${shuffled.length} ${pageType} questions in randomized order`);
  return shuffled;
}

module.exports = { adaptiveShuffle, getQuestionsForPage, shuffle };