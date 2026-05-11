import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import LandingPage            from "./pages/LandingPage"
import LoginPage              from "./pages/LoginPage"
import AdminApprovalsPage     from './pages/AdminApprovalsPage'
import RecruiterSignupPage    from './pages/RecruiterSignupPage'
import AdminDashboard         from "./pages/AdminDashboard"
import StudentDashboard       from "./pages/Studentdashboard "
import AdminExamRequestsPage  from './pages/AdminExamRequestsPage';
import ExamRequestsPage       from "./pages/ExamRequestsPage"
import CreateExam             from './pages/CreateExam'
import StudentHiring          from "./pages/StudentHiring"
import StudentUniversity      from "./pages/StudentUniversity"
import StudentCertifications  from "./pages/StudentCertifications"
import ExamVerify             from "./pages/Examverify"
import Instruction            from "./pages/Instruction"
import ExamPage               from "./pages/ExamPage"
import ExamRouter             from "./pages/Examrouter"
import SQLExamPage            from "./pages/SQLExamPage"
import RecruiterDashboard     from "./pages/RecruiterDashboard"
import CandidatesPage         from "./pages/CandidatesPage"
import RecruiterReports       from "./pages/RecruiterReports"
import { AppProvider }        from './context/AppContext'
import QuestionBank           from './pages/QuestionBank'
import Candidates             from './pages/Candidates'
import LiveMonitoring         from './pages/LiveMonitoring'
import Reports                from './pages/Reports'
import Settings               from './pages/Settings'
import CodeExamPage           from "./pages/CodeExamPage"
import ResumeUpload           from "./pages/ResumeUpload"
import AIVivaPage             from "./pages/AIVivaPage"
import EvaluationProgress     from "./components/Evaluationprogress"
import DecisionBanner         from "./components/Decisionbanner"
import InsightCards           from "./components/Insightcards"
import TestComplete           from "./pages/TestComplete"
import AIDetectionPage        from "./pages/AIDetectionPage"
import CertVerifyFlow         from "./pages/CertVerifyFlow";
import ExamKeyVerification    from "./pages/ExamKeyVerification"
import 'leaflet/dist/leaflet.css';
import UniversityExamVerify   from "./pages/UniversityExamVerify";
import UniversityExamPage     from "./pages/UniversityExamPage";
import QuestionBankUpload     from "./pages/QuestionBankUpload"
import PlagiarismPanel        from "./pages/PlagiarismPanel";
import AuditLogs              from './pages/AuditLogs';
import SetPasswordPage        from './pages/SetPasswordPage';
import ImportStudentsPage     from './pages/ImportStudentsPage';

// ─────────────────────────────────────────────────────────────────────────────
// EXAM FLOW STATE
//
// CORRECT FLOW (hiring/placement):
//   /exam-flow        → ExamFlowEntry  → clears stale state → /instruction
//   /instruction      → Instruction.jsx (rules + oath + geolocation)
//                       on done → navigates to /exam-verify
//                       BUT we intercept that → /resume-upload
//   /resume-upload    → ExamFlowResumeBridge shows ResumeUpload.jsx for real
//                       ResumeUpload navigates to /verify-exam-key on success
//                       BUT we intercept that → /exam-verify
//   /exam-verify      → ExamVerifyGate renders ExamVerify.jsx (ID + face scan)
//                       ExamVerify "Start Exam" navigates to /resume-upload
//                       BUT we intercept that → /verify-exam-key
//   /verify-exam-key  → ExamKeyBridge renders ExamKeyVerification.jsx
//                       on success → /exam
//   /exam             → ExamStartBridge sets keyDone=true → /flow-mcq-exam
//   /flow-mcq-exam    → ExamPageWrapper (ExamPage.jsx)
//   /flow-sql-exam    → SQLExamWrapper
//   /flow-code-exam   → CodeExamWrapper
//   /ai-viva          → AIVivaWrapper → /student-dashboard
// ─────────────────────────────────────────────────────────────────────────────
const FLOW_KEY = "na_exam_flow_v2";

export function saveFlow(patch) {
  try {
    const current = getFlow();
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function getFlow() {
  try { return JSON.parse(sessionStorage.getItem(FLOW_KEY) || "{}"); }
  catch { return {}; }
}

export function clearFlow() {
  try { sessionStorage.removeItem(FLOW_KEY); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTE
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
      window.location.href = ROLE_LOGIN_HASH[required] || "/#/";
      return;
    }
    setOk(true);
  }, [role]);
  if (!ok) return null;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL FETCH INTERCEPTOR
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
          const currentRole = localStorage.getItem("role") || "student";
          const tokenKeyMap = { admin: "admin_token", recruiter: "recruiter_token", student: "student_token" };
          localStorage.removeItem(tokenKeyMap[currentRole] || "student_token");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("user_name");
          localStorage.removeItem("user_email");
          localStorage.removeItem("student_id");
          window.location.href = `/#/login?role=${currentRole}`;
        }
      } catch {}
    }
    return res;
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function persistExamIds(examId, assignmentId) {
  if (examId)       localStorage.setItem("exam_id",       String(examId));
  if (assignmentId) localStorage.setItem("assignment_id", String(assignmentId));
}

function resolveExamRoute(flow) {
  const exam     = flow.exam || {};
  const sections = exam.sections || {};
  const examId   = exam.id || exam.exam_id;
  const aid      = exam.assignment_id;

  const hasMCQ    = sections?.mcq    !== false;
  const hasSQL    = sections?.sql    === true || sections?.sql === 1;
  const hasCoding = sections?.coding === true || sections?.coding === 1;

  let route;
  if (hasMCQ)         route = "/flow-mcq-exam";
  else if (hasSQL)    route = "/flow-sql-exam";
  else if (hasCoding) route = "/flow-code-exam";
  else                route = "/flow-mcq-exam";

  return { route, examId, aid };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 ENTRY: /exam-flow
// Clears stale flow, saves fresh, navigates to /instruction
// ─────────────────────────────────────────────────────────────────────────────
function ExamFlowEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};

  useEffect(() => {
    const exam   = state.exam || state.examData || {};
    const isUniv = state.isUniversity || false;

    const normalised = {
      ...exam,
      exam:             exam.title || exam.exam || exam.exam_name || "Assessment",
      title:            exam.title || exam.exam || exam.exam_name || "Assessment",
      id:               exam.id,
      examId:           exam.id,
      exam_type:        exam.exam_type || exam.type || "placement",
      duration_minutes: exam.duration_minutes || exam.duration || 60,
      duration:         exam.duration_minutes || exam.duration || 60,
      company:          exam.college || exam.company_name || "",
    };

    if (normalised.id) localStorage.setItem("exam_id", String(normalised.id));

    // Force-clear any stale flow state
    sessionStorage.removeItem(FLOW_KEY);

    saveFlow({
      exam:             normalised,
      isUniversity:     isUniv,
      step:             "instructions",
      instructionsDone: false,
      resumeDone:       false,   // NEW: tracks whether resume upload is done
      verifyDone:       false,
      keyDone:          false,
    });

    navigate("/instruction", {
      replace: true,
      state: { exam: normalised, examData: normalised, isUniversity: isUniv },
    });
  }, []); // eslint-disable-line

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 GATE: /exam-verify
//
// Instruction.jsx navigates to /exam-verify when location is granted.
// BUT our new flow intercepts that in ExamFlowResumeBridge (see below).
// This gate is now only reached AFTER resume upload is done.
// It renders ExamVerify.jsx for the ID card + face scan step.
// ─────────────────────────────────────────────────────────────────────────────
function ExamVerifyGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();

    saveFlow({ step: "verify" });

    // If key is already validated, skip straight to exam
    if (flow.keyDone) {
      const { route, examId, aid } = resolveExamRoute(flow);
      persistExamIds(examId, aid);
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid },
      });
      return;
    }

    // Ensure ExamVerify gets exam in location.state
    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        { exam: flow.exam },
        "",
        window.location.href
      );
    }

    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  // ExamVerify's "Start Exam" button navigates to /resume-upload.
  // We intercept that navigation (since resume is already done) and
  // redirect to /verify-exam-key instead.
  return (
    <AfterVerifyInterceptor>
      <ExamVerify />
    </AfterVerifyInterceptor>
  );
}

// Wraps ExamVerify and intercepts its outgoing navigate("/resume-upload")
// → redirects to /verify-exam-key since resume is already done at this point.
function AfterVerifyInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      // ExamVerify navigates to /resume-upload after face scan completes.
      // Since resume is already done, we skip to key verification.
      if ((path === "/resume-upload" || path.startsWith("/resume-upload/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getFlow();
        saveFlow({ verifyDone: true, step: "key" });

        navigate("/verify-exam-key", {
          replace: true,
          state: {
            exam:            flow.exam,
            locationGranted: true,
            initialCoords:   null,
            isUniversity:    flow.isUniversity || false,
          },
        });
        return;
      }

      isReplace ? originalReplace(...args) : originalPush(...args);
    };

    window.history.pushState    = (...a) => intercept(a, false);
    window.history.replaceState = (...a) => intercept(a, true);

    return () => {
      window.history.pushState    = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []); // eslint-disable-line

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: /resume-upload
//
// NEW CORRECT FLOW:
//   Instruction.jsx navigates to /exam-verify after geolocation.
//   We intercept THAT navigation here and show ResumeUpload.jsx instead.
//
//   But wait — Instruction.jsx navigates to /exam-verify, not /resume-upload.
//   So how does /resume-upload get reached?
//
//   Answer: ExamFlowEntry navigates to /instruction.
//   Instruction.jsx internally navigates to /exam-verify after location grant.
//   We intercept that /exam-verify push in InstructionWrapper and redirect to
//   /resume-upload instead. That's how the student ends up here.
//
// This component now:
//   - Shows ResumeUpload.jsx for REAL (not a bridge)
//   - Wraps it so when ResumeUpload navigates to /verify-exam-key, we
//     intercept and send to /exam-verify (ID scan) instead
//   - University mode: skips resume, goes straight to /university-exam
// ─────────────────────────────────────────────────────────────────────────────
function ExamFlowResumeBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();

    // Not in exam flow — show normal resume upload
    if (!flow.exam) {
      navigate("/resume-upload-normal", { replace: true, state: location.state });
      return;
    }

    // Already past key validation — jump to exam
    if (flow.keyDone) {
      const { route, examId, aid } = resolveExamRoute(flow);
      persistExamIds(examId, aid);
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid },
      });
      return;
    }

    // University mode: skip resume upload, go straight to key verify
    if (flow.isUniversity) {
      saveFlow({ resumeDone: true, step: "verify" });
      navigate("/exam-verify", {
        replace: true,
        state: { exam: flow.exam },
      });
      return;
    }

    // Hiring/placement mode: show the actual ResumeUpload page
    // Patch location.state so ResumeUpload gets the exam context
    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        { exam: flow.exam, isUniversity: false },
        "",
        window.location.href
      );
    }

    saveFlow({ step: "resume" });
    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  // Wrap ResumeUpload so its outgoing navigate("/verify-exam-key") is
  // intercepted and redirected to /exam-verify (ID scan) instead.
  // This enforces: Resume → ID scan → Key verify
  return (
    <AfterResumeInterceptor>
      <ResumeUpload />
    </AfterResumeInterceptor>
  );
}

// Wraps ResumeUpload and intercepts its outgoing navigate("/verify-exam-key")
// → redirects to /exam-verify (ID card + face scan) first
function AfterResumeInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      // ResumeUpload navigates to /verify-exam-key after upload completes.
      // We intercept and send to /exam-verify (ID scan) instead.
      if ((path === "/verify-exam-key" || path.startsWith("/verify-exam-key/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getFlow();
        saveFlow({ resumeDone: true, step: "verify" });

        navigate("/exam-verify", {
          replace: true,
          state: { exam: flow.exam },
        });
        return;
      }

      isReplace ? originalReplace(...args) : originalPush(...args);
    };

    window.history.pushState    = (...a) => intercept(a, false);
    window.history.replaceState = (...a) => intercept(a, true);

    return () => {
      window.history.pushState    = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []); // eslint-disable-line

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: /verify-exam-key  (wraps ExamKeyVerification)
// ─────────────────────────────────────────────────────────────────────────────
function ExamKeyBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();

    if (flow.keyDone) {
      const { route, examId, aid } = resolveExamRoute(flow);
      persistExamIds(examId, aid);
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid },
      });
      return;
    }

    const needsStateRepair = !location.state?.exam && flow.exam;
    if (needsStateRepair) {
      window.history.replaceState(
        {
          exam:            flow.exam,
          locationGranted: true,
          initialCoords:   null,
          isUniversity:    flow.isUniversity || false,
        },
        "",
        window.location.href
      );
    }

    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;
  return <ExamKeyVerification />;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 BRIDGE: /exam
// ExamKeyVerification navigates here on success.
// Sets keyDone=true and routes to the correct exam section.
// ─────────────────────────────────────────────────────────────────────────────
function ExamStartBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state || {};
    const flow  = getFlow();

    const incomingExam = state.exam || state.examData || {};
    const baseExam     = flow.exam  || {};

    const exam     = { ...baseExam, ...incomingExam };
    const sections = (incomingExam.sections && Object.keys(incomingExam.sections).length > 0)
      ? incomingExam.sections
      : baseExam.sections || {};

    const examId = exam.id || exam.exam_id || baseExam.id;
    const aid    = exam.assignment_id || baseExam.assignment_id;

    persistExamIds(examId, aid);

    const mergedExam = { ...exam, sections };
    saveFlow({
      exam:    mergedExam,
      step:    "mcq",
      keyDone: true,   // THE FLAG THAT BREAKS THE LOOP — set exactly once here
    });

    const hasMCQ    = sections?.mcq    !== false;
    const hasSQL    = sections?.sql    === true || sections?.sql === 1;
    const hasCoding = sections?.coding === true || sections?.coding === 1;

    let route;
    if (hasMCQ)         route = "/flow-mcq-exam";
    else if (hasSQL)    route = "/flow-sql-exam";
    else if (hasCoding) route = "/flow-code-exam";
    else                route = "/flow-mcq-exam";

    navigate(route, {
      replace: true,
      state: { exam: mergedExam, examId, assignmentId: aid },
    });
  }, []); // eslint-disable-line

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTION WRAPPER
//
// Instruction.jsx navigates to /exam-verify after geolocation.
// We intercept that and redirect to /resume-upload instead,
// so the flow becomes: Instructions → Resume → ID scan → Key → Exam
// ─────────────────────────────────────────────────────────────────────────────
function InstructionWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();

    // Patch location.state so Instruction.jsx gets exam info
    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        { exam: flow.exam, examData: flow.exam, isUniversity: flow.isUniversity || false },
        "",
        window.location.href
      );
    }

    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  // Wrap Instruction so its outgoing navigate("/exam-verify") is intercepted
  // and redirected to /resume-upload instead (for hiring mode).
  // University mode still goes to /university-exam (not intercepted).
  return (
    <InstructionNavInterceptor>
      <Instruction />
    </InstructionNavInterceptor>
  );
}

function InstructionNavInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      // Instruction navigates to /exam-verify after geolocation (hiring mode).
      // Redirect to /resume-upload so student uploads resume first.
      if ((path === "/exam-verify" || path.startsWith("/exam-verify/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getFlow();
        saveFlow({ instructionsDone: true, step: "resume" });

        navigate("/resume-upload", {
          replace: true,
          state: { exam: flow.exam, isUniversity: false },
        });
        return;
      }

      // University mode: /university-exam — let it through normally
      isReplace ? originalReplace(...args) : originalPush(...args);
    };

    window.history.pushState    = (...a) => intercept(a, false);
    window.history.replaceState = (...a) => intercept(a, true);

    return () => {
      window.history.pushState    = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []); // eslint-disable-line

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM SECTION WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────
function ExamPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || localStorage.getItem("exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || localStorage.getItem("assignment_id");

  useEffect(() => { saveFlow({ step: "mcq" }); }, []); // eslint-disable-line

  return (
    <ExamPage
      examId={examId}
      assignmentId={assignmentId}
      onNavigate={(page) => {
        if (page === "sql") {
          saveFlow({ step: "sql" });
          navigate("/flow-sql-exam", { state: { exam, examId, assignmentId } });
        } else if (page === "coding") {
          saveFlow({ step: "coding" });
          navigate("/flow-code-exam", { state: { exam, examId, assignmentId } });
        } else if (page === "viva") {
          saveFlow({ step: "viva" });
          navigate("/ai-viva", { state: { examId, assignmentId } });
        } else {
          clearFlow();
          navigate("/student-dashboard");
        }
      }}
    />
  );
}

function SQLExamWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || localStorage.getItem("exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || localStorage.getItem("assignment_id");

  useEffect(() => { saveFlow({ step: "sql" }); }, []); // eslint-disable-line

  return (
    <SQLExamPage
      examId={examId}
      assignmentId={assignmentId}
      examTitle={exam.title || exam.exam || "Assessment"}
      durationMins={30}
      onNavigate={(page) => {
        if (page === "code" || page === "coding") {
          saveFlow({ step: "coding" });
          navigate("/flow-code-exam", { state: { exam, examId, assignmentId } });
        } else if (page === "viva") {
          saveFlow({ step: "viva" });
          navigate("/ai-viva", { state: { examId, assignmentId } });
        } else {
          clearFlow();
          navigate("/student-dashboard");
        }
      }}
    />
  );
}

function CodeExamWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || localStorage.getItem("exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || localStorage.getItem("assignment_id");

  useEffect(() => { saveFlow({ step: "coding" }); }, []); // eslint-disable-line

  return (
    <CodeExamPage
      examId={examId}
      assignmentId={assignmentId}
      examTitle={exam.title || exam.exam || "Assessment"}
      durationMins={45}
      onNavigate={(target) => {
        if (target === "viva") {
          saveFlow({ step: "viva" });
          navigate("/ai-viva", { state: { examId, assignmentId } });
        } else {
          clearFlow();
          navigate("/student-dashboard");
        }
      }}
      onStartViva={(score, submittedCode) => {
        saveFlow({ step: "viva" });
        navigate("/ai-viva", { state: { examId, assignmentId, codingScore: score, submittedCode } });
      }}
    />
  );
}

function AIVivaWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <AIVivaPage
      onNavigate={() => {
        clearFlow();
        navigate("/student-dashboard");
      }}
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
          <Route path="/set-password"     element={<SetPasswordPage />} />
          <Route path="/student/set-password" element={<SetPasswordPage />} />

          {/* ── Admin ───────────────────────────────────────────────────── */}
          <Route path="/admin-dashboard"      element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-approvals"      element={<ProtectedRoute role="admin"><AdminApprovalsPage /></ProtectedRoute>} />
          <Route path="/create-exam"          element={<ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>} />
          <Route path="/admin-exam-requests"  element={<ProtectedRoute role="admin"><AdminExamRequestsPage /></ProtectedRoute>} />
          <Route path="/question-bank"        element={<ProtectedRoute role="admin"><QuestionBank /></ProtectedRoute>} />
          <Route path="/candidates"           element={<ProtectedRoute role="admin"><Candidates /></ProtectedRoute>} />
          <Route path="/live-monitoring"      element={<ProtectedRoute role="admin"><LiveMonitoring /></ProtectedRoute>} />
          <Route path="/reports"              element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
          <Route path="/settings"             element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />
          <Route path="/ai-detection"         element={<ProtectedRoute role="admin"><AIDetectionPage /></ProtectedRoute>} />
          <Route path="/admin-question-bank"  element={<ProtectedRoute role="admin"><QuestionBankUpload /></ProtectedRoute>} />
          <Route path="/audit-logs"           element={<ProtectedRoute role="admin"><AuditLogs /></ProtectedRoute>} />
          <Route path="/import-students"      element={<ProtectedRoute role="admin"><ImportStudentsPage /></ProtectedRoute>} />

          {/* ── Student ─────────────────────────────────────────────────── */}
          <Route path="/student-dashboard"      element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student-hiring"         element={<ProtectedRoute role="student"><StudentHiring /></ProtectedRoute>} />
          <Route path="/student-university"     element={<ProtectedRoute role="student"><StudentUniversity /></ProtectedRoute>} />
          <Route path="/student-certifications" element={<ProtectedRoute role="student"><StudentCertifications /></ProtectedRoute>} />
          <Route path="/cert-verify-flow"       element={<ProtectedRoute role="student"><CertVerifyFlow /></ProtectedRoute>} />

          {/* ── EXAM FLOW ────────────────────────────────────────────────
            HIRING FLOW:
              /exam-flow       → ExamFlowEntry: clears state → /instruction
              /instruction     → InstructionWrapper → Instruction.jsx
                                 on location grant → tries /exam-verify
                                 BUT InstructionNavInterceptor catches it → /resume-upload
              /resume-upload   → ExamFlowResumeBridge: renders ResumeUpload.jsx
                                 on success → tries /verify-exam-key
                                 BUT AfterResumeInterceptor catches it → /exam-verify
              /exam-verify     → ExamVerifyGate: renders ExamVerify.jsx (ID + face scan)
                                 on success → tries /resume-upload
                                 BUT AfterVerifyInterceptor catches it → /verify-exam-key
              /verify-exam-key → ExamKeyBridge: renders ExamKeyVerification.jsx
                                 on success → /exam
              /exam            → ExamStartBridge: sets keyDone=true → /flow-mcq-exam
              /flow-mcq-exam   → ExamPageWrapper (ExamPage.jsx)
              /flow-sql-exam   → SQLExamWrapper
              /flow-code-exam  → CodeExamWrapper
              /ai-viva         → AIVivaWrapper → /student-dashboard
          ─────────────────────────────────────────────────────────────── */}

          <Route path="/exam-flow" element={
            <ProtectedRoute role="student"><ExamFlowEntry /></ProtectedRoute>
          } />

          <Route path="/instruction" element={
            <ProtectedRoute role="student"><InstructionWrapper /></ProtectedRoute>
          } />

          {/* Resume upload — shown BEFORE ID scan in hiring flow */}
          <Route path="/resume-upload" element={
            <ProtectedRoute role="student"><ExamFlowResumeBridge /></ProtectedRoute>
          } />

          {/* Normal resume upload (not part of exam flow) */}
          <Route path="/resume-upload-normal" element={
            <ProtectedRoute role="student"><ResumeUpload /></ProtectedRoute>
          } />

          {/* ID card + face scan — shown AFTER resume upload */}
          <Route path="/exam-verify" element={
            <ProtectedRoute role="student"><ExamVerifyGate /></ProtectedRoute>
          } />

          {/* Exam key entry — shown AFTER ID scan */}
          <Route path="/verify-exam-key" element={
            <ProtectedRoute role="student"><ExamKeyBridge /></ProtectedRoute>
          } />

          {/* ExamKeyVerification success lands here → sets keyDone=true */}
          <Route path="/exam" element={
            <ProtectedRoute role="student"><ExamStartBridge /></ProtectedRoute>
          } />

          {/* Exam sections */}
          <Route path="/flow-mcq-exam" element={
            <ProtectedRoute role="student"><ExamPageWrapper /></ProtectedRoute>
          } />

          <Route path="/flow-sql-exam" element={
            <ProtectedRoute role="student"><SQLExamWrapper /></ProtectedRoute>
          } />
          <Route path="/sql-exam" element={
            <ProtectedRoute role="student"><SQLExamWrapper /></ProtectedRoute>
          } />

          <Route path="/flow-code-exam" element={
            <ProtectedRoute role="student"><CodeExamWrapper /></ProtectedRoute>
          } />
          <Route path="/code-exam" element={
            <ProtectedRoute role="student"><CodeExamWrapper /></ProtectedRoute>
          } />

          <Route path="/ai-viva" element={
            <ProtectedRoute role="student"><AIVivaWrapper /></ProtectedRoute>
          } />

          {/* Legacy routes */}
          <Route path="/exam-router"            element={<ProtectedRoute role="student"><ExamRouter /></ProtectedRoute>} />
          <Route path="/test-complete"          element={<ProtectedRoute role="student"><TestComplete /></ProtectedRoute>} />
          <Route path="/university-exam-verify" element={<ProtectedRoute role="student"><UniversityExamVerify /></ProtectedRoute>} />
          <Route path="/university-exam"        element={<ProtectedRoute role="student"><UniversityExamPage /></ProtectedRoute>} />

          {/* ── Recruiter ───────────────────────────────────────────────── */}
          <Route path="/recruiter-dashboard"  element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/recruiter-candidates" element={<ProtectedRoute role="recruiter"><CandidatesPage /></ProtectedRoute>} />
          <Route path="/exam-requests"        element={<ProtectedRoute role="recruiter"><ExamRequestsPage /></ProtectedRoute>} />
          <Route path="/recruiter-reports"    element={<ProtectedRoute role="recruiter"><RecruiterReports /></ProtectedRoute>} />
          <Route path="/recruiter-plagiarism" element={<ProtectedRoute role="recruiter"><PlagiarismPanel /></ProtectedRoute>} />

          {/* ── Misc ────────────────────────────────────────────────────── */}
          <Route path="/evaluation-progress" element={<EvaluationProgress />} />
          <Route path="/decision-banner"     element={<DecisionBanner />} />
          <Route path="/insight-cards"       element={<InsightCards />} />

        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;