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
import TheoryExamPage         from "./pages/TheoryExamPage";
import QuestionBankUpload     from "./pages/QuestionBankUpload"
import PlagiarismPanel        from "./pages/PlagiarismPanel";
import AuditLogs              from './pages/AuditLogs';
import SetPasswordPage        from './pages/SetPasswordPage';
import ImportStudentsPage     from './pages/ImportStudentsPage';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FLOW STATE HELPERS
// Two separate session keys — hiring and university flows never collide
// ─────────────────────────────────────────────────────────────────────────────
const FLOW_KEY      = "na_exam_flow_v2";      // hiring flow
const UNIV_FLOW_KEY = "na_univ_exam_flow_v1"; // university flow

// ── Hiring flow helpers ───────────────────────────────────────────────────────
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

// ── University flow helpers ───────────────────────────────────────────────────
export function saveUnivFlow(patch) {
  try {
    const current = getUnivFlow();
    sessionStorage.setItem(UNIV_FLOW_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}
export function getUnivFlow() {
  try { return JSON.parse(sessionStorage.getItem(UNIV_FLOW_KEY) || "{}"); }
  catch { return {}; }
}
export function clearUnivFlow() {
  try { sessionStorage.removeItem(UNIV_FLOW_KEY); } catch {}
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
// GLOBAL FETCH INTERCEPTOR — 401 TOKEN EXPIRY
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
// HELPERS — HIRING FLOW
// ─────────────────────────────────────────────────────────────────────────────
function persistExamIds(examId, assignmentId) {
  if (examId)       localStorage.setItem("exam_id",       String(examId));
  if (assignmentId) localStorage.setItem("assignment_id", String(assignmentId));
}

function resolveExamRoute(flow) {
  const exam     = flow.exam || {};
  const sections = parseSections(exam.sections);
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
// HELPERS — UNIVERSITY FLOW
// ─────────────────────────────────────────────────────────────────────────────
function resolveUnivExamRoute(flow) {
  const exam     = flow.exam || {};
  const sections = parseSections(exam.sections);

  const examId = exam.id || exam.exam_id;
  const aid    = exam.assignment_id;

  const hasMCQ    = !!(sections?.mcq);
  const hasTheory = !!(sections?.theory || sections?.written);
  const hasCoding = !!(sections?.coding);
  const hasSQL    = !!(sections?.sql);

  let route;
  if (hasMCQ)         route = "/univ-mcq-exam";
  else if (hasTheory) route = "/univ-theory-exam";
  else if (hasCoding) route = "/flow-code-exam";
  else if (hasSQL)    route = "/flow-sql-exam";
  else                route = "/univ-mcq-exam";

  return { route, examId, aid, hasMCQ, hasTheory, hasCoding, hasSQL };
}

// ── Parse sections safely (handles string or object) ─────────────────────────
function parseSections(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

// ═════════════════════════════════════════════════════════════════════════════
// ██  HIRING FLOW COMPONENTS  ██
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HIRING STEP 0: /exam-flow — clears stale state → /instruction
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
    sessionStorage.removeItem(FLOW_KEY);

    saveFlow({
      exam:             normalised,
      isUniversity:     isUniv,
      step:             "instructions",
      instructionsDone: false,
      resumeDone:       false,
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
// HIRING STEP 1: /exam-verify — ID card + face scan
// ─────────────────────────────────────────────────────────────────────────────
function ExamVerifyGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();
    saveFlow({ step: "verify" });

    if (flow.keyDone) {
      const { route, examId, aid } = resolveExamRoute(flow);
      persistExamIds(examId, aid);
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid },
      });
      return;
    }

    if (!location.state?.exam && flow.exam) {
      window.history.replaceState({ exam: flow.exam }, "", window.location.href);
    }
    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  return (
    <AfterVerifyInterceptor>
      <ExamVerify />
    </AfterVerifyInterceptor>
  );
}

function AfterVerifyInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

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
// HIRING STEP 2: /resume-upload
// ─────────────────────────────────────────────────────────────────────────────
function ExamFlowResumeBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();

    if (!flow.exam) {
      navigate("/resume-upload-normal", { replace: true, state: location.state });
      return;
    }

    if (flow.keyDone) {
      const { route, examId, aid } = resolveExamRoute(flow);
      persistExamIds(examId, aid);
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid },
      });
      return;
    }

    if (flow.isUniversity) {
      saveFlow({ resumeDone: true, step: "verify" });
      navigate("/exam-verify", { replace: true, state: { exam: flow.exam } });
      return;
    }

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

  return (
    <AfterResumeInterceptor>
      <ResumeUpload />
    </AfterResumeInterceptor>
  );
}

function AfterResumeInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      if ((path === "/verify-exam-key" || path.startsWith("/verify-exam-key/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getFlow();
        saveFlow({ resumeDone: true, step: "verify" });

        navigate("/exam-verify", { replace: true, state: { exam: flow.exam } });
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
// HIRING STEP 3: /verify-exam-key
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

    if (!location.state?.exam && flow.exam) {
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

  return (
    <AfterHiringKeyInterceptor>
      <ExamKeyVerification />
    </AfterHiringKeyInterceptor>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AfterHiringKeyInterceptor
// Catches ExamKeyVerification's navigate("/exam", { state }) call.
// Extracts exam_id + assignment_id from the validate-key API response,
// saves everything to flow + localStorage, then routes to first section.
// ─────────────────────────────────────────────────────────────────────────────
function AfterHiringKeyInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      const isExamPath =
        path === "/exam"          || path.startsWith("/exam/") ||
        path === "/flow-mcq-exam" || path.startsWith("/flow-mcq-exam/");

      if (isExamPath && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const histState    = (args[0] && typeof args[0] === "object") ? args[0] : {};
        const navState     = histState.usr || histState || {};
        const incomingExam = navState.exam || navState.examData || {};

        console.log("[AfterHiringKeyInterceptor] navState:", navState);
        console.log("[AfterHiringKeyInterceptor] incomingExam:", incomingExam);

        const flow     = getFlow();
        const baseExam = flow.exam || {};

        const examId =
          incomingExam.id               ||
          incomingExam.exam_id          ||
          navState.examId               ||
          baseExam.id                   ||
          baseExam.exam_id              ||
          localStorage.getItem("exam_id") ||
          null;

        const assignmentId =
          incomingExam.assignment_id    ||
          navState.assignmentId         ||
          baseExam.assignment_id        ||
          localStorage.getItem("assignment_id") ||
          null;

        const rawSections =
          (incomingExam.sections && Object.keys(incomingExam.sections || {}).length > 0)
            ? incomingExam.sections
            : baseExam.sections || {};
        const sections = parseSections(rawSections);

        const mergedExam = {
          ...baseExam,
          ...incomingExam,
          id:            examId,
          exam_id:       examId,
          assignment_id: assignmentId,
          sections,
        };

        console.log("[AfterHiringKeyInterceptor] examId:", examId, "assignmentId:", assignmentId, "sections:", sections);

        persistExamIds(examId, assignmentId);
        saveFlow({ exam: mergedExam, keyDone: true, step: "mcq" });

        // FIX: handles both boolean true and integer 1
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
          state: { exam: mergedExam, examId, assignmentId },
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
// HIRING STEP 4: /exam — safety net bridge
// ─────────────────────────────────────────────────────────────────────────────
function ExamStartBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state || {};
    const flow  = getFlow();

    const incomingExam = state.exam || state.examData || {};
    const baseExam     = flow.exam  || {};
    const exam         = { ...baseExam, ...incomingExam };

    const rawSections =
      (incomingExam.sections && Object.keys(incomingExam.sections || {}).length > 0)
        ? incomingExam.sections
        : baseExam.sections || {};
    const sections = parseSections(rawSections);

    const examId =
      state.examId              ||
      incomingExam.id           ||
      incomingExam.exam_id      ||
      baseExam.id               ||
      baseExam.exam_id          ||
      localStorage.getItem("exam_id") ||
      null;

    const aid =
      state.assignmentId        ||
      incomingExam.assignment_id||
      baseExam.assignment_id    ||
      localStorage.getItem("assignment_id") ||
      null;

    console.log("[ExamStartBridge] examId:", examId, "aid:", aid, "sections:", sections);

    persistExamIds(examId, aid);

    const mergedExam = { ...exam, sections };
    saveFlow({ exam: mergedExam, step: "mcq", keyDone: true });

    // FIX: handles both boolean true and integer 1
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
// HIRING — INSTRUCTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function InstructionWrapper() {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getFlow();
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
// HIRING — EXAM SECTION WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

// FIX 1 (patch): ExamPageWrapper — added parsedSections + sectionEnabled helper
// so section checks correctly handle both boolean true and integer 1
function ExamPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || localStorage.getItem("exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || localStorage.getItem("assignment_id");

  useEffect(() => {
    console.log("[ExamPageWrapper] examId:", examId, "assignmentId:", assignmentId);
    saveFlow({ step: "mcq" });
  }, []); // eslint-disable-line

  const parsedSections = parseSections(exam.sections || flow.exam?.sections);

  // Helper: check if a section is enabled (handles both boolean true and integer 1)
  const sectionEnabled = (key) => {
    const val = parsedSections?.[key];
    return val === true || val === 1 || val === '1';
  };

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

// FIX 2 (patch): SQLExamWrapper — added codingEnabled guard so navigation to
// /flow-code-exam only fires when coding section is actually enabled
function SQLExamWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || localStorage.getItem("exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || localStorage.getItem("assignment_id");

  useEffect(() => { saveFlow({ step: "sql" }); }, []); // eslint-disable-line

  const parsedSections = parseSections(exam.sections || flow.exam?.sections);
  const codingEnabled  = parsedSections?.coding === true || parsedSections?.coding === 1;

  return (
    <SQLExamPage
      examId={examId}
      assignmentId={assignmentId}
      examTitle={exam.title || exam.exam || "Assessment"}
      durationMins={30}
      onNavigate={(page) => {
        if ((page === "code" || page === "coding") && codingEnabled) {
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
      onNavigate={() => { clearFlow(); navigate("/student-dashboard"); }}
      codingScore={location.state?.codingScore}
      submittedCode={location.state?.submittedCode}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ██  UNIVERSITY FLOW COMPONENTS  ██
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// UNIV STEP 0: /university-exam-flow
// ─────────────────────────────────────────────────────────────────────────────
function UnivExamFlowEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};

  useEffect(() => {
    const exam = state.exam || state.examData || {};
    const sections = parseSections(exam.sections);

    const normalised = {
      ...exam,
      exam:             exam.title || exam.exam || exam.exam_name || "University Assessment",
      title:            exam.title || exam.exam || exam.exam_name || "University Assessment",
      id:               exam.id,
      examId:           exam.id,
      exam_type:        "university",
      duration_minutes: exam.duration_minutes || exam.duration || 60,
      duration:         exam.duration_minutes || exam.duration || 60,
      college:          exam.college || "",
      exam_key:         exam.exam_key || exam.verifyCode || "",
      verifyCode:       exam.exam_key || exam.verifyCode || "",
      sections,
    };

    if (normalised.id)      localStorage.setItem("univ_exam_id",  String(normalised.id));
    if (normalised.exam_key) localStorage.setItem("univ_exam_key", normalised.exam_key);

    sessionStorage.removeItem(UNIV_FLOW_KEY);

    saveUnivFlow({
      exam:             normalised,
      isUniversity:     true,
      step:             "instructions",
      instructionsDone: false,
      verifyDone:       false,
      keyDone:          false,
    });

    navigate("/univ-instruction", {
      replace: true,
      state: { exam: normalised, examData: normalised, isUniversity: true },
    });
  }, []); // eslint-disable-line

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIV STEP 1: /univ-instruction
// ─────────────────────────────────────────────────────────────────────────────
function UnivInstructionWrapper() {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getUnivFlow();
    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        { exam: flow.exam, examData: flow.exam, isUniversity: true },
        "",
        window.location.href
      );
    }
    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  return (
    <UnivInstructionNavInterceptor>
      <Instruction />
    </UnivInstructionNavInterceptor>
  );
}

function UnivInstructionNavInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      if ((path === "/exam-verify" || path.startsWith("/exam-verify/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getUnivFlow();
        saveUnivFlow({ instructionsDone: true, step: "verify" });

        navigate("/univ-exam-verify", {
          replace: true,
          state: { exam: flow.exam, isUniversity: true },
        });
        return;
      }

      // Legacy fallback
      if ((path === "/university-exam" || path === "/university-exam-start") && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getUnivFlow();
        saveUnivFlow({ instructionsDone: true, step: "verify" });

        navigate("/univ-exam-verify", {
          replace: true,
          state: { exam: flow.exam, isUniversity: true },
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
// UNIV STEP 2: /univ-exam-verify
// ─────────────────────────────────────────────────────────────────────────────
function UnivExamVerifyGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getUnivFlow();
    saveUnivFlow({ step: "verify" });

    if (flow.keyDone) {
      const { route, examId, aid } = resolveUnivExamRoute(flow);
      if (examId) localStorage.setItem("univ_exam_id", String(examId));
      if (aid)    localStorage.setItem("univ_assignment_id", String(aid));
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid, isUniversity: true },
      });
      return;
    }

    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        { exam: flow.exam, isUniversity: true },
        "",
        window.location.href
      );
    }

    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  return (
    <UnivAfterVerifyInterceptor>
      <ExamVerify />
    </UnivAfterVerifyInterceptor>
  );
}

function UnivAfterVerifyInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      if ((path === "/resume-upload" || path.startsWith("/resume-upload/") ||
           path === "/exam-start"    || path.startsWith("/exam-start/") ||
           path === "/verify-exam-key" || path.startsWith("/verify-exam-key/")) && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const flow = getUnivFlow();
        saveUnivFlow({ verifyDone: true, step: "key" });

        navigate("/univ-verify-key", {
          replace: true,
          state: {
            exam:            flow.exam,
            locationGranted: true,
            initialCoords:   null,
            isUniversity:    true,
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
// UNIV STEP 3: /univ-verify-key
// ─────────────────────────────────────────────────────────────────────────────
function UnivExamKeyBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const flow = getUnivFlow();

    if (flow.keyDone) {
      const { route, examId, aid } = resolveUnivExamRoute(flow);
      if (examId) localStorage.setItem("univ_exam_id", String(examId));
      if (aid)    localStorage.setItem("univ_assignment_id", String(aid));
      navigate(route, {
        replace: true,
        state: { exam: flow.exam, examId, assignmentId: aid, isUniversity: true },
      });
      return;
    }

    if (!location.state?.exam && flow.exam) {
      window.history.replaceState(
        {
          exam:            flow.exam,
          locationGranted: true,
          initialCoords:   null,
          isUniversity:    true,
        },
        "",
        window.location.href
      );
    }

    setReady(true);
  }, []); // eslint-disable-line

  if (!ready) return null;

  return (
    <UnivAfterKeyInterceptor>
      <ExamKeyVerification />
    </UnivAfterKeyInterceptor>
  );
}

function UnivAfterKeyInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    let done = false;

    const intercept = (args, isReplace) => {
      const rawUrl = typeof args[2] === "string" ? args[2] : "";
      const path   = rawUrl.replace(/^[^#]*#/, "").split("?")[0];

      const isSuccessPath =
        path === "/university-exam"  || path.startsWith("/university-exam/") ||
        path === "/exam"             || path.startsWith("/exam/")             ||
        path === "/flow-mcq-exam"    || path.startsWith("/flow-mcq-exam/");

      if (isSuccessPath && !done) {
        done = true;
        window.history.pushState    = originalPush;
        window.history.replaceState = originalReplace;

        const histState  = (args[0] && typeof args[0] === "object") ? args[0] : {};
        const navState   = histState.usr || histState || {};
        const apiResponse = navState.examData || {};

        const flow    = getUnivFlow();
        const examKey =
          navState.examKey            ||
          apiResponse.exam_key        ||
          flow.exam?.exam_key         ||
          flow.exam?.verifyCode       ||
          localStorage.getItem("univ_exam_key") ||
          "";

        const assignmentId =
          apiResponse.assignment_id   ||
          navState.assignmentId       ||
          flow.exam?.assignment_id    ||
          localStorage.getItem("univ_assignment_id") ||
          null;

        const examId =
          apiResponse.exam_id         ||
          navState.examId             ||
          flow.exam?.id               ||
          flow.exam?.exam_id          ||
          localStorage.getItem("univ_exam_id") ||
          null;

        const rawSections = apiResponse.sections || flow.exam?.sections || {};
        const sections    = parseSections(rawSections);

        const duration =
          apiResponse.duration        ||
          flow.exam?.duration_minutes ||
          flow.exam?.duration         ||
          60;

        if (examKey)      localStorage.setItem("univ_exam_key",       examKey);
        if (assignmentId) localStorage.setItem("univ_assignment_id",  String(assignmentId));
        if (examId)       localStorage.setItem("univ_exam_id",        String(examId));

        const mergedExam = {
          ...flow.exam,
          exam_key:         examKey,
          verifyCode:       examKey,
          assignment_id:    assignmentId,
          id:               examId,
          exam_id:          examId,
          sections,
          duration_minutes: duration,
          duration,
        };

        saveUnivFlow({ exam: mergedExam, keyDone: false, step: "start" });

        console.log("[UnivAfterKeyInterceptor] examKey:", examKey, "assignmentId:", assignmentId, "examId:", examId, "sections:", sections);

        navigate("/univ-exam-start", {
          replace: true,
          state: { exam: mergedExam, isUniversity: true },
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
// UNIV STEP 4: /univ-exam-start
// ─────────────────────────────────────────────────────────────────────────────
function UnivExamStartBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state || {};
    const flow  = getUnivFlow();

    const incomingExam = state.exam || state.examData || {};
    const baseExam     = flow.exam  || {};
    const exam         = { ...baseExam, ...incomingExam };
    const sections     = parseSections(incomingExam.sections || baseExam.sections || {});

    const examId       = exam.id || exam.exam_id || baseExam.id || localStorage.getItem("univ_exam_id");
    const aid          = exam.assignment_id || baseExam.assignment_id || localStorage.getItem("univ_assignment_id");
    const examKey      = exam.exam_key || exam.verifyCode || baseExam.exam_key || localStorage.getItem("univ_exam_key") || "";
    const duration     = exam.duration_minutes || exam.duration || baseExam.duration_minutes || 60;

    if (examId)  localStorage.setItem("univ_exam_id",       String(examId));
    if (aid)     localStorage.setItem("univ_assignment_id", String(aid));
    if (examKey) localStorage.setItem("univ_exam_key",      examKey);

    const mergedExam = {
      ...exam,
      sections,
      exam_key:         examKey,
      verifyCode:       examKey,
      assignment_id:    aid,
      id:               examId,
      exam_id:          examId,
      duration_minutes: duration,
      duration,
    };

    saveUnivFlow({ exam: mergedExam, keyDone: true, step: "exam" });

    const hasMCQ    = !!(sections?.mcq);
    const hasTheory = !!(sections?.theory || sections?.written);
    const hasCoding = !!(sections?.coding);
    const hasSQL    = !!(sections?.sql);

    let route;
    if (hasMCQ)         route = "/univ-mcq-exam";
    else if (hasTheory) route = "/univ-theory-exam";
    else if (hasCoding) route = "/flow-code-exam";
    else if (hasSQL)    route = "/flow-sql-exam";
    else                route = "/univ-mcq-exam";

    console.log("[UnivExamStartBridge] route:", route, "examKey:", examKey, "examId:", examId, "aid:", aid, "sections:", sections);

    navigate(route, {
      replace: true,
      state: { exam: mergedExam, examId, assignmentId: aid, isUniversity: true },
    });
  }, []); // eslint-disable-line

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIV — MCQ SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function UnivMCQWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getUnivFlow();

  const exam         = state.exam || flow.exam || {};
  const examId       = state.examId || exam.id || exam.exam_id || flow.exam?.id || flow.exam?.exam_id || localStorage.getItem("univ_exam_id");
  const assignmentId = state.assignmentId || exam.assignment_id || flow.exam?.assignment_id || localStorage.getItem("univ_assignment_id");

  useEffect(() => { saveUnivFlow({ step: "mcq" }); }, []); // eslint-disable-line

  return (
    <ExamPage
      examId={examId}
      assignmentId={assignmentId}
      onNavigate={(page) => {
        const navState = { exam, examId, assignmentId, isUniversity: true };
        if (page === "theory" || page === "written") {
          saveUnivFlow({ step: "theory" });
          navigate("/univ-theory-exam", { state: navState });
        } else if (page === "coding") {
          saveUnivFlow({ step: "coding" });
          navigate("/flow-code-exam", { state: navState });
        } else if (page === "sql") {
          saveUnivFlow({ step: "sql" });
          navigate("/flow-sql-exam", { state: navState });
        } else {
          clearUnivFlow();
          navigate("/student-dashboard");
        }
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIV — THEORY SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function UnivTheoryWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const flow     = getUnivFlow();

  const exam = state.exam || flow.exam || {};

  const examId =
    state.examId       || exam.id          || exam.exam_id    ||
    flow.exam?.id      || flow.exam?.exam_id ||
    localStorage.getItem("univ_exam_id")   || null;

  const assignmentId =
    state.assignmentId    || exam.assignment_id ||
    flow.exam?.assignment_id ||
    localStorage.getItem("univ_assignment_id") || null;

  const examTitle    = exam.title || exam.exam || flow.exam?.title || "University Assessment";
  const durationMins = exam.duration_minutes || exam.duration || flow.exam?.duration_minutes || flow.exam?.duration || 60;

  useEffect(() => {
    saveUnivFlow({ step: "theory" });
    if (examId)       localStorage.setItem("univ_exam_id",       String(examId));
    if (assignmentId) localStorage.setItem("univ_assignment_id", String(assignmentId));
  }, []); // eslint-disable-line

  return (
    <TheoryExamPage
      examId={examId}
      assignmentId={assignmentId}
      examTitle={examTitle}
      durationMins={durationMins}
      onNavigate={(page) => {
        const navState = { exam, examId, assignmentId, isUniversity: true };
        if (page === "coding") {
          saveUnivFlow({ step: "coding" });
          navigate("/flow-code-exam", { state: navState });
        } else if (page === "sql") {
          saveUnivFlow({ step: "sql" });
          navigate("/flow-sql-exam", { state: navState });
        } else {
          clearUnivFlow();
          navigate("/student-university");
        }
      }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ██  APP  ██
// ═════════════════════════════════════════════════════════════════════════════
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>

          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/"                     element={<LandingPage />} />
          <Route path="/login"                element={<LoginPage />} />
          <Route path="/recruiter-signup"     element={<RecruiterSignupPage />} />
          <Route path="/set-password"         element={<SetPasswordPage />} />
          <Route path="/student/set-password" element={<SetPasswordPage />} />

          {/* ── Admin ───────────────────────────────────────────────────── */}
          <Route path="/admin-dashboard"     element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-approvals"     element={<ProtectedRoute role="admin"><AdminApprovalsPage /></ProtectedRoute>} />
          <Route path="/create-exam"         element={<ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>} />
          <Route path="/admin-exam-requests" element={<ProtectedRoute role="admin"><AdminExamRequestsPage /></ProtectedRoute>} />
          <Route path="/question-bank"       element={<ProtectedRoute role="admin"><QuestionBank /></ProtectedRoute>} />
          <Route path="/candidates"          element={<ProtectedRoute role="admin"><Candidates /></ProtectedRoute>} />
          <Route path="/live-monitoring"     element={<ProtectedRoute role="admin"><LiveMonitoring /></ProtectedRoute>} />
          <Route path="/reports"             element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
          <Route path="/settings"            element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />
          <Route path="/ai-detection"        element={<ProtectedRoute role="admin"><AIDetectionPage /></ProtectedRoute>} />
          <Route path="/admin-question-bank" element={<ProtectedRoute role="admin"><QuestionBankUpload /></ProtectedRoute>} />
          <Route path="/audit-logs"          element={<ProtectedRoute role="admin"><AuditLogs /></ProtectedRoute>} />
          <Route path="/import-students"     element={<ProtectedRoute role="admin"><ImportStudentsPage /></ProtectedRoute>} />

          {/* ── Student ─────────────────────────────────────────────────── */}
          <Route path="/student-dashboard"      element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student-hiring"         element={<ProtectedRoute role="student"><StudentHiring /></ProtectedRoute>} />
          <Route path="/student-university"     element={<ProtectedRoute role="student"><StudentUniversity /></ProtectedRoute>} />
          <Route path="/student-certifications" element={<ProtectedRoute role="student"><StudentCertifications /></ProtectedRoute>} />
          <Route path="/cert-verify-flow"       element={<ProtectedRoute role="student"><CertVerifyFlow /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════════════════
              HIRING EXAM FLOW
              /exam-flow → /instruction → /resume-upload → /exam-verify
                        → /verify-exam-key → (intercepted) → /flow-mcq-exam
          ══════════════════════════════════════════════════════════════ */}
          <Route path="/exam-flow" element={
            <ProtectedRoute role="student"><ExamFlowEntry /></ProtectedRoute>
          } />
          <Route path="/instruction" element={
            <ProtectedRoute role="student"><InstructionWrapper /></ProtectedRoute>
          } />
          <Route path="/resume-upload" element={
            <ProtectedRoute role="student"><ExamFlowResumeBridge /></ProtectedRoute>
          } />
          <Route path="/resume-upload-normal" element={
            <ProtectedRoute role="student"><ResumeUpload /></ProtectedRoute>
          } />
          <Route path="/exam-verify" element={
            <ProtectedRoute role="student"><ExamVerifyGate /></ProtectedRoute>
          } />
          <Route path="/verify-exam-key" element={
            <ProtectedRoute role="student"><ExamKeyBridge /></ProtectedRoute>
          } />
          <Route path="/exam" element={
            <ProtectedRoute role="student"><ExamStartBridge /></ProtectedRoute>
          } />
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

          {/* ══════════════════════════════════════════════════════════════
              UNIVERSITY EXAM FLOW
          ══════════════════════════════════════════════════════════════ */}
          <Route path="/university-exam-flow" element={
            <ProtectedRoute role="student"><UnivExamFlowEntry /></ProtectedRoute>
          } />
          <Route path="/univ-instruction" element={
            <ProtectedRoute role="student"><UnivInstructionWrapper /></ProtectedRoute>
          } />
          <Route path="/univ-exam-verify" element={
            <ProtectedRoute role="student"><UnivExamVerifyGate /></ProtectedRoute>
          } />
          <Route path="/univ-verify-key" element={
            <ProtectedRoute role="student"><UnivExamKeyBridge /></ProtectedRoute>
          } />
          <Route path="/univ-exam-start" element={
            <ProtectedRoute role="student"><UnivExamStartBridge /></ProtectedRoute>
          } />
          <Route path="/univ-mcq-exam" element={
            <ProtectedRoute role="student"><UnivMCQWrapper /></ProtectedRoute>
          } />
          <Route path="/univ-theory-exam" element={
            <ProtectedRoute role="student"><UnivTheoryWrapper /></ProtectedRoute>
          } />

          {/* ── Legacy university routes ─────────────────────────────── */}
          <Route path="/university-exam-verify" element={<ProtectedRoute role="student"><UniversityExamVerify /></ProtectedRoute>} />
          <Route path="/university-exam"        element={<ProtectedRoute role="student"><UniversityExamPage /></ProtectedRoute>} />

          {/* ── Legacy / misc ────────────────────────────────────────── */}
          <Route path="/exam-router"   element={<ProtectedRoute role="student"><ExamRouter /></ProtectedRoute>} />
          <Route path="/test-complete" element={<ProtectedRoute role="student"><TestComplete /></ProtectedRoute>} />

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