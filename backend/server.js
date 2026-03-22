const express = require("express");
const cors    = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => 
  res.send("NeuroAssess Backend Running"));



app.post("/api/question-bank/import", (req, res) => {
  const { questions } = req.body;
  if (!questions?.length) return res.status(400).json({ error: "No questions" });

  const mapped = questions.map((q) => ({
    id:          "QB-" + Math.random().toString(36).substr(2,6).toUpperCase(),
    topic:       q.topic || q.question?.substring(0, 40) || "QuizForge Question",
    type:        q.type === "mcq" ? "MCQ" : q.type === "coding" ? "Coding" :
                 q.type === "sql" ? "SQL" : q.type === "aptitude" ? "Aptitude" : "MCQ",
    difficulty:  q.difficulty
                   ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
                   : "Medium",
    createdDate: new Date().toLocaleDateString("en-GB"),
    source:      "QuizForge AI",
    questionText: q.question || "",
    options:      q.options  || [],
    answer:       q.answer   || "",
    explanation:  q.explanation || "",
    platform:     q.platform || "",
    description:  q.description || "",
    examples:     q.examples || [],
    starterCode:  q.starterCode || "",
  }));

  res.json({ success: true, questions: mapped });
});


// ── Question Bank import from QuizForge ──────────────────────────────────────
app.post("/api/question-bank/import", (req, res) => {
  const { questions } = req.body;
  if (!questions?.length) return res.status(400).json({ error: "No questions" });

  const mapped = questions.map((q) => ({
    id:          "QB-" + Math.random().toString(36).substr(2,6).toUpperCase(),
    topic:       q.topic || q.question?.substring(0, 40) || "QuizForge Question",
    type:        q.type === "mcq" ? "MCQ" : q.type === "coding" ? "Coding" :
                 q.type === "sql" ? "SQL" : q.type === "aptitude" ? "Aptitude" : "MCQ",
    difficulty:  q.difficulty
                   ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
                   : "Medium",
    createdDate: new Date().toLocaleDateString("en-GB"),
    source:      "QuizForge AI",
    // Full question data stored for expand view
    questionText:          q.question || "",
    options:               q.options  || [],
    answer:                q.answer   || "",
    explanation:           q.explanation || "",
    platform:              q.platform || "",
    description:           q.description || "",
    functionalRequirements:q.functionalRequirements || "",
    constraints:           q.constraints || "",
    examples:              q.examples || [],
    starterCode:           q.starterCode || "",
  }));

  console.log(`[QuestionBank] Imported ${mapped.length} questions from QuizForge AI`);
  res.json({ success: true, questions: mapped });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));