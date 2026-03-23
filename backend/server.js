// DOMMatrix polyfill — must be first before any require()
if (typeof DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof Path2D    === 'undefined') { global.Path2D    = class Path2D    {}; }

const express        = require("express");
const cors           = require("cors");
const dotenv         = require("dotenv");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json());

// Routes
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reportRoutes = require('./routes/report');
const examRequestRoutes = require('./routes/examRequests');

app.get("/", (req, res) => res.send("NeuroAssess Backend Running"));

app.use('/api/auth',  authRoutes);
app.use("/api",       uploadRoutes);
app.use("/api",       reportRoutes);
app.use('/api', examRequestRoutes);


// Question Bank import from QuizForge
app.post("/api/question-bank/import", (req, res) => {
  const { questions } = req.body;
  if (!questions?.length) return res.status(400).json({ error: "No questions" });

  const mapped = questions.map((q) => ({
    id:          "QB-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    topic:       q.topic || q.question?.substring(0, 40) || "QuizForge Question",
    type:        q.type === "mcq"      ? "MCQ"      :
                 q.type === "coding"   ? "Coding"   :
                 q.type === "sql"      ? "SQL"       :
                 q.type === "aptitude" ? "Aptitude"  : "MCQ",
    difficulty:  q.difficulty
                   ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
                   : "Medium",
    createdDate:            new Date().toLocaleDateString("en-GB"),
    source:                 "QuizForge AI",
    questionText:           q.question            || "",
    options:                q.options             || [],
    answer:                 q.answer              || "",
    explanation:            q.explanation         || "",
    platform:               q.platform            || "",
    description:            q.description         || "",
    functionalRequirements: q.functionalRequirements || "",
    constraints:            q.constraints         || "",
    examples:               q.examples            || [],
    starterCode:            q.starterCode         || "",
  }));

  console.log(`[QuestionBank] Imported ${mapped.length} questions from QuizForge AI`);
  res.json({ success: true, questions: mapped });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`NeuroAssess backend running on port ${PORT}`));