import { useEffect } from "react"
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/AdminDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import StudentDashboard from "./pages/Studentdashboard "
import ExamVerify from "./pages/Examverify"
import Instruction from "./pages/Instruction"
import ExamPage from "./pages/ExamPage";
import ExamRouter from "./pages/Examrouter";
import SQLExamPage from "./pages/SQLExamPage";
import { AppProvider } from './context/AppContext';
import CreateExam from './pages/CreateExam';
import QuestionBank from './pages/QuestionBank';
import Candidates from './pages/Candidates';
import LiveMonitoring from './pages/LiveMonitoring';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CodeExamPage from "./pages/CodeExamPage";
import ResumeUpload from "./pages/ResumeUpload";
import AIVivaPage from "./pages/AIVivaPage";

// ── Round 1: MCQ ─────────────────────────────────────────────────────────────
function ExamPageWrapper() {
  const navigate = useNavigate();
  const handleNavigate = (page) => {
    if (page === "sql") navigate("/sql-exam");
    else navigate("/student-dashboard");
  };
  return <ExamPage onNavigate={handleNavigate} />;
}

// ── Round 2: SQL ─────────────────────────────────────────────────────────────
function SQLExamWrapper() {
  const navigate = useNavigate();
  const handleNavigate = (page) => {
    if (page === "code-exam") navigate("/code-exam");
    else navigate("/student-dashboard");
  };
  return <SQLExamPage onNavigate={handleNavigate} />;
}

// ── Round 3: Coding ───────────────────────────────────────────────────────────
// onStartViva(score) is called when student clicks "Start AI Viva Round"
// It navigates to /ai-viva and passes the coding score via router state
function CodeExamWrapper() {
  const navigate = useNavigate();

  const handleNavigate = (page) => {
    navigate("/student-dashboard");
  };

  const handleStartViva = (score) => {
    navigate("/ai-viva", { state: { codingScore: score } });
  };

  return <CodeExamPage onNavigate={handleNavigate} onStartViva={handleStartViva} />;
}

// ── Round 4: AI Viva ──────────────────────────────────────────────────────────
// Reads codingScore from router state so it shows correctly in the viva topbar
function AIVivaWrapper() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const codingScore = location.state?.codingScore;

  const handleNavigate = (page) => {
    navigate("/student-dashboard");
  };

  return <AIVivaPage onNavigate={handleNavigate} codingScore={codingScore} />;
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/"                    element={<LandingPage />} />
          <Route path="/login"               element={<LoginPage />} />
          <Route path="/admin-dashboard"     element={<AdminDashboard />} />
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route path="/student-dashboard"   element={<StudentDashboard />} />
          <Route path="/exam-verify"         element={<ExamVerify />} />
          <Route path="/instruction"         element={<Instruction />} />
          <Route path="/resume-upload"       element={<ResumeUpload />} />

          <Route path="/exam"                element={<ExamPageWrapper />} />
          <Route path="/exam-router"         element={<ExamRouter />} />
          <Route path="/sql-exam"            element={<SQLExamWrapper />} />
          <Route path="/code-exam"           element={<CodeExamWrapper />} />
          <Route path="/ai-viva"             element={<AIVivaWrapper />} />

          <Route path="/create-exam"         element={<CreateExam />} />
          <Route path="/question-bank"       element={<QuestionBank />} />
          <Route path="/candidates"          element={<Candidates />} />
          <Route path="/live-monitoring"     element={<LiveMonitoring />} />
          <Route path="/reports"             element={<Reports />} />
          <Route path="/settings"            element={<Settings />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;