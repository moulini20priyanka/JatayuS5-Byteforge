// server.js
if (typeof DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof Path2D    === 'undefined') { global.Path2D    = class Path2D    {}; }

const express        = require("express");
const cors           = require("cors");
const dotenv         = require("dotenv");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const app = express();

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json());

// ── resolveRouter ─────────────────────────────────────────────────────────────
function resolveRouter(mod, filePath) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (typeof mod === 'object') {
    const keys = ['router', 'default', 'handler'];
    for (const key of keys) {
      if (mod[key] && typeof mod[key] === 'function') {
        console.log(`  ℹ️  ${filePath} — using export.${key}`);
        return mod[key];
      }
    }
    console.error(`❌ [server] ${filePath} exports an object but has no usable router key`);
    console.error(`   Keys found: ${Object.keys(mod).join(', ')}`);
    return null;
  }
  return null;
}

function safeRequire(filePath) {
  try {
    const raw = require(filePath);
    const mod = resolveRouter(raw, filePath);
    if (mod) {
      console.log(`✅ ${filePath}`);
    }
    return mod;
  } catch (err) {
    console.error(`❌ [server] Failed to load: ${filePath}\n   Reason: ${err.message}`);
    return null;
  }
}

function useRoute(mountPath, mod, label) {
  if (!mod) {
    console.error(`⚠️  Skipping ${label} — not a valid router`);
    return;
  }
  app.use(mountPath, mod);
  console.log(`🔗 Mounted ${label} at ${mountPath}`);
}

// ─── Load all routes ──────────────────────────────────────────────────────────
const authRoutes           = safeRequire('./routes/auth');
const uploadRoutes         = safeRequire('./routes/upload');
const reportRoutes         = safeRequire('./routes/report');
const examRequestRoutes    = safeRequire('./routes/examRequests');
const vivaRoutes           = safeRequire('./routes/viva');
const geoRoutes            = safeRequire('./routes/geo');
const examRoutes           = safeRequire('./routes/exams');
const questionRoutes       = safeRequire('./routes/questions');
const studentRoutes        = safeRequire('./routes/studentRoutes');
const candidateRoutes      = safeRequire('./routes/candidates');
const universityExamRoutes = safeRequire('./routes/universityExamRoutes');

app.get("/", (req, res) => res.send("NeuroAssess Backend Running"));

// ─── MOUNT ROUTES ─────────────────────────────────────────────────────────────
// ⚠️ IMPORTANT: Mount universityExamRoutes BEFORE examRoutes to avoid conflicts
// universityExamRoutes handles /api/exams/university/* paths
useRoute('/api', universityExamRoutes, 'universityExamRoutes');

// Then mount other routes
useRoute('/api/auth',          authRoutes,           'authRoutes');
useRoute('/api',               uploadRoutes,         'uploadRoutes');
useRoute('/api',               reportRoutes,         'reportRoutes');
useRoute('/api/exam-requests', examRequestRoutes,    'examRequestRoutes');
useRoute('/api/viva',          vivaRoutes,           'vivaRoutes');
useRoute('/api/geo',           geoRoutes,            'geoRoutes');
useRoute('/api',               examRoutes,           'examRoutes');
useRoute('/api/questions',     questionRoutes,       'questionRoutes');
useRoute('/api/student',       studentRoutes,        'studentRoutes');
useRoute('/api/candidates',    candidateRoutes,      'candidateRoutes');

// ─── Question Bank import from QuizForge ─────────────────────────────────────
app.post("/api/question-bank/import", (req, res) => {
  const { questions } = req.body;
  if (!questions?.length) return res.status(400).json({ error: "No questions" });

  const mapped = questions.map((q) => ({
    id:                     "QB-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    topic:                  q.topic || q.question?.substring(0, 40) || "QuizForge Question",
    type:                   q.type === "mcq"      ? "MCQ"      :
                            q.type === "coding"   ? "Coding"   :
                            q.type === "sql"      ? "SQL"      :
                            q.type === "aptitude" ? "Aptitude" : "MCQ",
    difficulty:             q.difficulty
                              ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
                              : "Medium",
    createdDate:            new Date().toLocaleDateString("en-GB"),
    source:                 "QuizForge AI",
    questionText:           q.question               || "",
    options:                q.options                || [],
    answer:                 q.answer                 || "",
    explanation:            q.explanation            || "",
    platform:               q.platform               || "",
    description:            q.description            || "",
    functionalRequirements: q.functionalRequirements || "",
    constraints:            q.constraints            || "",
    examples:               q.examples               || [],
    starterCode:            q.starterCode            || "",
  }));

  console.log(`[QuestionBank] Imported ${mapped.length} questions from QuizForge AI`);
  res.json({ success: true, questions: mapped });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n🚀 NeuroAssess backend running on port ${PORT}\n`));