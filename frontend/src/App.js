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
import AIDetectionPage from "./pages/AIDetectionPage"
import CertVerifyFlow from "./pages/CertVerifyFlow";
import ExamKeyVerification from "./pages/ExamKeyVerification"
import 'leaflet/dist/leaflet.css';
import UniversityExamVerify from "./pages/UniversityExamVerify";
import UniversityExamPage   from "./pages/UniversityExamPage";
import QuestionBankUpload from "./pages/QuestionBankUpload"
import PlagiarismPanel from "./pages/PlagiarismPanel";

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTE
// Checks: (1) token exists, (2) stored role matches required role.
// On failure → redirects to the matching login page, never to another portal.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_LOGIN_HASH = {
  admin:     "/#/login?role=admin",
  recruiter: "/#/login?role=recruiter",
  student:   "/#/login?role=student",
};

function ProtectedRoute({ role, children }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token      = localStorage.getItem("token");
    const storedRole = (localStorage.getItem("role") || "").toLowerCase().trim();
    const required   = (role || "").toLowerCase().trim();

    if (!token || storedRole !== required) {
      // Redirect using hash navigation (HashRouter compatible)
      window.location.href = ROLE_LOGIN_HASH[required] || "/#/";
      return;
    }

    setOk(true);
  }, [role]);

  // Render nothing while the auth check / redirect fires — prevents flash
  if (!ok) return null;

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL FETCH INTERCEPTOR — auto-logout on expired token
// Clears only the expired role's token, not all tokens.
// ─────────────────────────────────────────────────────────────────────────────
(function installFetchInterceptor() {
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    if (res.status === 401) {
      try {
        const clone = res.clone();
        const data  = await clone.json();
        if (data?.code === "TOKEN_EXPIRED") {
          console.warn("[Auth] Token expired — clearing session and redirecting to login");

          const currentRole = localStorage.getItem("role") || "student";

          const tokenKeyMap = {
            admin:     "admin_token",
            recruiter: "recruiter_token",
            student:   "student_token",
          };
          const tokenKey = tokenKeyMap[currentRole] || "student_token";

          // Clear only this role's session keys
          localStorage.removeItem(tokenKey);
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("user_name");
          localStorage.removeItem("user_email");
          localStorage.removeItem("student_id");

          window.location.href = `/#/login?role=${currentRole}`;
        }
      } catch {
        // non-JSON 401 — ignore
      }
    }
    return res;
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PAGE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────
function ExamPageWrapper() {
  const navigate = useNavigate();
  return (
    <ExamPage
      onNavigate={(page) =>
        page === "sql" ? navigate("/sql-exam") : navigate("/student-dashboard")
      }
    />
  );
}

function SQLExamWrapper() {
  const navigate = useNavigate();
  return (
    <SQLExamPage
      onNavigate={(page) =>
        page === "code-exam" ? navigate("/code-exam") : navigate("/student-dashboard")
      }
    />
  );
}

function CodeExamWrapper() {
  const navigate = useNavigate();
  return (
    <CodeExamPage
      onNavigate={() => navigate("/student-dashboard")}
      onStartViva={(score, submittedCode) =>
        navigate("/ai-viva", { state: { codingScore: score, submittedCode } })
      }
    />
  );
}

function AIVivaWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <AIVivaPage
      onNavigate={() => navigate("/student-dashboard")}
      codingScore={location.state?.codingScore}
      submittedCode={location.state?.submittedCode}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>

          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/"                 element={<LandingPage />} />
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/recruiter-signup" element={<RecruiterSignupPage />} />

          {/* ── Admin — every route requires role="admin" ────────────────── */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin-approvals" element={
            <ProtectedRoute role="admin"><AdminApprovalsPage /></ProtectedRoute>
          } />
          <Route path="/create-exam" element={
            <ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>
          } />
          <Route path="/admin-exam-requests" element={
            <ProtectedRoute role="admin"><AdminExamRequestsPage /></ProtectedRoute>
          } />
          <Route path="/question-bank" element={
            <ProtectedRoute role="admin"><QuestionBank /></ProtectedRoute>
          } />
          <Route path="/candidates" element={
            <ProtectedRoute role="admin"><Candidates /></ProtectedRoute>
          } />
          <Route path="/live-monitoring" element={
            <ProtectedRoute role="admin"><LiveMonitoring /></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute role="admin"><Reports /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute role="admin"><Settings /></ProtectedRoute>
          } />
          <Route path="/ai-detection" element={
            <ProtectedRoute role="admin"><AIDetectionPage /></ProtectedRoute>
          } />
          <Route path="/admin-question-bank" element={
            <ProtectedRoute role="admin"><QuestionBankUpload /></ProtectedRoute>
          } />

          {/* ── Student — every route requires role="student" ────────────── */}
          <Route path="/student-dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student-hiring" element={
            <ProtectedRoute role="student"><StudentHiring /></ProtectedRoute>
          } />
          <Route path="/student-university" element={
            <ProtectedRoute role="student"><StudentUniversity /></ProtectedRoute>
          } />
          <Route path="/student-certifications" element={
            <ProtectedRoute role="student"><StudentCertifications /></ProtectedRoute>
          } />
          <Route path="/exam-verify" element={
            <ProtectedRoute role="student"><ExamVerify /></ProtectedRoute>
          } />
          <Route path="/instruction" element={
            <ProtectedRoute role="student"><Instruction /></ProtectedRoute>
          } />
          <Route path="/verify-exam-key" element={
            <ProtectedRoute role="student"><ExamKeyVerification /></ProtectedRoute>
          } />
          <Route path="/resume-upload" element={
            <ProtectedRoute role="student"><ResumeUpload /></ProtectedRoute>
          } />
          <Route path="/exam" element={
            <ProtectedRoute role="student"><ExamPageWrapper /></ProtectedRoute>
          } />
          <Route path="/exam-router" element={
            <ProtectedRoute role="student"><ExamRouter /></ProtectedRoute>
          } />
          <Route path="/sql-exam" element={
            <ProtectedRoute role="student"><SQLExamWrapper /></ProtectedRoute>
          } />
          <Route path="/code-exam" element={
            <ProtectedRoute role="student"><CodeExamWrapper /></ProtectedRoute>
          } />
          <Route path="/ai-viva" element={
            <ProtectedRoute role="student"><AIVivaWrapper /></ProtectedRoute>
          } />
          <Route path="/test-complete" element={
            <ProtectedRoute role="student"><TestComplete /></ProtectedRoute>
          } />
          <Route path="/university-exam-verify" element={
            <ProtectedRoute role="student"><UniversityExamVerify /></ProtectedRoute>
          } />
          <Route path="/university-exam" element={
            <ProtectedRoute role="student"><UniversityExamPage /></ProtectedRoute>
          } />

          {/* ── Recruiter — every route requires role="recruiter" ────────── */}
          <Route path="/recruiter-dashboard" element={
            <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
          } />
          <Route path="/recruiter-candidates" element={
            <ProtectedRoute role="recruiter"><CandidatesPage /></ProtectedRoute>
          } />
          <Route path="/exam-requests" element={
            <ProtectedRoute role="recruiter"><ExamRequestsPage /></ProtectedRoute>
          } />
          <Route path="/recruiter-reports" element={
            <ProtectedRoute role="recruiter"><RecruiterReports /></ProtectedRoute>
          } />
          <Route path="/recruiter-plagiarism" element={
            <ProtectedRoute role="recruiter"><PlagiarismPanel /></ProtectedRoute>
          } />

          {/* ── Misc UI components (no auth needed — adjust if required) ─── */}
          <Route path="/evaluation-progress" element={<EvaluationProgress />} />
          <Route path="/decision-banner"     element={<DecisionBanner />} />
          <Route path="/insight-cards"       element={<InsightCards />} />

        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;