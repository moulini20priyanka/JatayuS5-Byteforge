import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import AdminApprovalsPage  from './pages/AdminApprovalsPage'
import RecruiterSignupPage from './pages/RecruiterSignupPage'
import AdminDashboard from "./pages/AdminDashboard"
import StudentDashboard from "./pages/Studentdashboard "
import AdminExamRequestsPage from './pages/AdminExamRequestsPage';
import ExamRequestsPage   from "./pages/ExamRequestsPage"
import CreateExam from './pages/CreateExam'
import StudentHiring from "./pages/StudentHiring"
import StudentUniversity from "./pages/StudentUniversity"
import StudentCertifications from "./pages/StudentCertifications"
import ExamVerify from "./pages/Examverify"
import Instruction from "./pages/Instruction"
import ExamPage from "./pages/ExamPage"
import ExamRouter from "./pages/Examrouter"
import SQLExamPage from "./pages/SQLExamPage"
import RecruiterDashboard from "./pages/RecruiterDashboard"
import CandidatesPage     from "./pages/CandidatesPage"
import RecruiterReports from "./pages/RecruiterReports"
import { AppProvider } from './context/AppContext'
import QuestionBank from './pages/QuestionBank'
import Candidates from './pages/Candidates'
import LiveMonitoring from './pages/LiveMonitoring'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import CodeExamPage from "./pages/CodeExamPage"
import ResumeUpload from "./pages/ResumeUpload"
import AIVivaPage from "./pages/AIVivaPage"
import EvaluationProgress from "./components/Evaluationprogress"
import DecisionBanner from "./components/Decisionbanner"
import InsightCards from "./components/Insightcards"
import TestComplete from "./pages/TestComplete"

function ExamPageWrapper() {
  const navigate = useNavigate();
  return <ExamPage onNavigate={(page) => page === "sql" ? navigate("/sql-exam") : navigate("/student-dashboard")} />;
}

function SQLExamWrapper() {
  const navigate = useNavigate();
  return <SQLExamPage onNavigate={(page) => page === "code-exam" ? navigate("/code-exam") : navigate("/student-dashboard")} />;
}

function CodeExamWrapper() {
  const navigate = useNavigate();
  return <CodeExamPage
    onNavigate={() => navigate("/student-dashboard")}
    onStartViva={(score) => navigate("/ai-viva", { state: { codingScore: score, candidateId: localStorage.getItem("student_id") } })}
  />;
}

function AIVivaWrapper() {
  const navigate  = useNavigate();
  const location  = useLocation();
  return <AIVivaPage
    onNavigate={() => navigate("/student-dashboard")}
    codingScore={location.state?.codingScore}
    candidateId={location.state?.candidateId}
  />;
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/"                       element={<LandingPage />} />
          <Route path="/login"                  element={<LoginPage />} />
          <Route path="/recruiter-signup"       element={<RecruiterSignupPage />} />

          {/* Admin */}
          <Route path="/admin-dashboard"        element={<AdminDashboard />} />
          <Route path="/admin-approvals"        element={<AdminApprovalsPage />} />
          <Route path="/create-exam"            element={<CreateExam />} />
          <Route path="/admin-exam-requests" element={<AdminExamRequestsPage />} />
          <Route path="/question-bank"          element={<QuestionBank />} />
          <Route path="/candidates"             element={<Candidates />} />
          <Route path="/live-monitoring"        element={<LiveMonitoring />} />
          <Route path="/reports"                element={<Reports />} />
          <Route path="/settings"               element={<Settings />} />

          {/* Student */}
          <Route path="/student-dashboard"      element={<StudentDashboard />} />
          <Route path="/student-hiring"         element={<StudentHiring />} />
          <Route path="/student-university"     element={<StudentUniversity />} />
          <Route path="/student-certifications" element={<StudentCertifications />} />
          <Route path="/exam-verify"            element={<ExamVerify />} />
          <Route path="/instruction"            element={<Instruction />} />
          <Route path="/resume-upload"          element={<ResumeUpload />} />
          <Route path="/exam"                   element={<ExamPageWrapper />} />
          <Route path="/exam-router"            element={<ExamRouter />} />
          <Route path="/sql-exam"               element={<SQLExamWrapper />} />
          <Route path="/code-exam"              element={<CodeExamWrapper />} />
          <Route path="/ai-viva"                element={<AIVivaWrapper />} />
          <Route path="/test-complete"          element={<TestComplete />} />

          {/* Recruiter */}
          <Route path="/recruiter-dashboard"    element={<RecruiterDashboard />} />
          <Route path="/recruiter-candidates"   element={<CandidatesPage />} />
          <Route path="/exam-requests"          element={<ExamRequestsPage />} />
          <Route path="/recruiter-reports"      element={<RecruiterReports />} />

          {/* Misc */}
          <Route path="/evaluation-progress"   element={<EvaluationProgress />} />
          <Route path="/decision-banner"       element={<DecisionBanner />} />
          <Route path="/insight-cards"         element={<InsightCards />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;