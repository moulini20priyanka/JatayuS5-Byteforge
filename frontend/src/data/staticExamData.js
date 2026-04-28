// frontend/src/data/staticExamData.js
// Static fallback questions used when the backend has no questions loaded.
// Order: 10 MCQ (HTML/CSS/JS) → 5 SQL MCQ → 1 Coding (Two Pointers) → 2 Viva

export const STATIC_MCQ_QUESTIONS = [
  {
    id: "s_mcq_1",
    question_text: "Which HTML tag is used to define an internal style sheet?",
    option_a: "<css>",
    option_b: "<style>",
    option_c: "<script>",
    option_d: "<link>",
    correct_ans: "B",
    difficulty: "easy",
  },
  {
    id: "s_mcq_2",
    question_text: "Which CSS property controls the text size?",
    option_a: "font-weight",
    option_b: "text-size",
    option_c: "font-size",
    option_d: "text-style",
    correct_ans: "C",
    difficulty: "easy",
  },
  {
    id: "s_mcq_3",
    question_text: "What does the CSS `box-model` consist of?",
    option_a: "Content, Padding, Border, Margin",
    option_b: "Content, Spacing, Border, Outline",
    option_c: "Width, Height, Padding, Border",
    option_d: "Block, Inline, Flex, Grid",
    correct_ans: "A",
    difficulty: "medium",
  },
  {
    id: "s_mcq_4",
    question_text: "Which JavaScript method is used to select an element by its ID?",
    option_a: "document.querySelector()",
    option_b: "document.getElement()",
    option_c: "document.getElementById()",
    option_d: "document.selectById()",
    correct_ans: "C",
    difficulty: "easy",
  },
  {
    id: "s_mcq_5",
    question_text: "What is the correct syntax for an arrow function in JavaScript?",
    option_a: "function => (x) { return x; }",
    option_b: "const fn = (x) => x;",
    option_c: "const fn = function(x) => x;",
    option_d: "arrow fn(x) { return x; }",
    correct_ans: "B",
    difficulty: "medium",
  },
  {
    id: "s_mcq_6",
    question_text: "Which HTML attribute specifies an alternate text for an image if it cannot be displayed?",
    option_a: "title",
    option_b: "src",
    option_c: "alt",
    option_d: "href",
    correct_ans: "C",
    difficulty: "easy",
  },
  {
    id: "s_mcq_7",
    question_text: "What does `display: flex` do in CSS?",
    option_a: "Hides the element",
    option_b: "Enables a block-level box model",
    option_c: "Enables a flex container for flexible layout",
    option_d: "Sets the element to inline mode",
    correct_ans: "C",
    difficulty: "medium",
  },
  {
    id: "s_mcq_8",
    question_text: "Which of the following is NOT a JavaScript data type?",
    option_a: "undefined",
    option_b: "boolean",
    option_c: "character",
    option_d: "symbol",
    correct_ans: "C",
    difficulty: "medium",
  },
  {
    id: "s_mcq_9",
    question_text: "What is the purpose of the `z-index` property in CSS?",
    option_a: "Sets the zoom level of an element",
    option_b: "Controls the stacking order of positioned elements",
    option_c: "Sets the horizontal position",
    option_d: "Defines the element's transparency",
    correct_ans: "B",
    difficulty: "hard",
  },
  {
    id: "s_mcq_10",
    question_text: "Which method converts a JSON string into a JavaScript object?",
    option_a: "JSON.stringify()",
    option_b: "JSON.convert()",
    option_c: "JSON.parse()",
    option_d: "JSON.objectify()",
    correct_ans: "C",
    difficulty: "hard",
  },
];

export const STATIC_SQL_QUESTIONS = [
  {
    id: "s_sql_1",
    question_text: "Which SQL clause is used to filter records returned by a SELECT statement?",
    option_a: "HAVING",
    option_b: "ORDER BY",
    option_c: "WHERE",
    option_d: "GROUP BY",
    correct_ans: "C",
    difficulty: "easy",
  },
  {
    id: "s_sql_2",
    question_text: "What does the following query return?\n\nSELECT COUNT(*) FROM employees WHERE department = 'Engineering';",
    option_a: "Names of all engineers",
    option_b: "Number of employees in Engineering",
    option_c: "All columns for engineers",
    option_d: "List of departments",
    correct_ans: "B",
    difficulty: "easy",
  },
  {
    id: "s_sql_3",
    question_text: "Which JOIN returns all rows from the left table and matching rows from the right table?",
    option_a: "INNER JOIN",
    option_b: "RIGHT JOIN",
    option_c: "FULL JOIN",
    option_d: "LEFT JOIN",
    correct_ans: "D",
    difficulty: "medium",
  },
  {
    id: "s_sql_4",
    question_text: "What is the correct SQL syntax to insert a new record?\n\nTable: users (id, name, email)",
    option_a: "ADD INTO users VALUES (1, 'Alice', 'alice@email.com');",
    option_b: "INSERT INTO users VALUES (1, 'Alice', 'alice@email.com');",
    option_c: "INSERT users SET VALUES (1, 'Alice', 'alice@email.com');",
    option_d: "PUT INTO users VALUES (1, 'Alice', 'alice@email.com');",
    correct_ans: "B",
    difficulty: "easy",
  },
  {
    id: "s_sql_5",
    question_text: "Which SQL aggregate function returns the highest value in a column?",
    option_a: "TOP()",
    option_b: "MAXIMUM()",
    option_c: "MAX()",
    option_d: "HIGHEST()",
    correct_ans: "C",
    difficulty: "easy",
  },
];

export const STATIC_CODING_QUESTIONS = [
  {
    id: "s_code_1",
    question_text: "Two Sum — Two Pointer Approach",
    description:
      "Given a sorted array of integers and a target sum, find two numbers that add up to the target.\n\n" +
      "Use the two-pointer technique.\n\n" +
      "Example:\n  Input: nums = [1, 2, 3, 5, 8], target = 10\n  Output: [2, 8]  (indices or values)\n\n" +
      "Constraints:\n- The array is sorted in ascending order.\n- Exactly one solution is guaranteed.\n- Do not use the same element twice.",
    starter_code:
      "// Two Pointer — Two Sum\nfunction twoSum(nums, target) {\n  let left = 0;\n  let right = nums.length - 1;\n\n  while (left < right) {\n    // TODO: implement two-pointer logic\n  }\n\n  return [];\n}\n\n// Test\nconsole.log(twoSum([1, 2, 3, 5, 8], 10)); // [2, 8]\nconsole.log(twoSum([1, 3, 4, 6], 7));      // [3, 4]",
    difficulty: "medium",
  },
];

export const STATIC_VIVA_QUESTIONS = [
  {
    id: "s_viva_1",
    question: "Explain the two-pointer technique. When would you choose it over a brute-force O(n²) approach?",
    topic: "Algorithms",
  },
  {
    id: "s_viva_2",
    question: "What is the difference between `==` and `===` in JavaScript? Give an example where they behave differently.",
    topic: "JavaScript",
  },
];