import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExamPage     from "./ExamPage";
import SQLExamPage  from "./SQLExamPage";
import CodeExamPage from "./CodeExamPage";
import AIVivaPage   from "./AIVivaPage";

/**
 * ExamRouter.jsx
 *
 * Manages which exam round is currently shown.
 * Reads locationGranted + initialCoords + examId + assignmentId
 * from router state and forwards them to each exam page.
 *
 * Rounds: mcq → sql → code → viva
 *
 * FIX: reads examId/assignmentId from both flat keys AND nested exam object
 * so it works regardless of how Instruction.jsx shapes the route state.
 */
export default function ExamRouter() {
  const reactNavigate  = useNavigate();
  const routerLocation = useLocation();
  const routeState     = routerLocation?.state || {};

  /* ── Geo props passed from Instruction.jsx ── */
  const locationGranted = routeState.locationGranted || false;
  const initialCoords   = routeState.initialCoords   || null;

  /* ── Exam identity ──
     Support both shapes:
       { examId, assignmentId, ... }          (flat)
       { exam: { id, assignment_id }, ... }   (nested)
  ── */
  const examId       = routeState.examId       || routeState.exam?.id             || null;
  const assignmentId = routeState.assignmentId || routeState.exam?.assignment_id  || null;
  const geoSessionId = routeState.geoSessionId || null;

  /* ── Round state ── */
  const [round,       setRound]       = useState("mcq");
  const [codingScore, setCodingScore] = useState(null);

  const handleNavigate = (target) => {
    if      (target === "sql")                            setRound("sql");
    else if (target === "code-exam" || target === "code") setRound("code");
    else if (target === "lobby")                          reactNavigate("/student-dashboard");
  };

  /* Called by CodeExamPage when student clicks "Start AI Viva Round" */
  const handleStartViva = (score) => {
    setCodingScore(score);
    setRound("viva");
  };

  if (round === "sql") return (
    <SQLExamPage
      onNavigate={handleNavigate}
      examId={examId}
      assignmentId={assignmentId}
    />
  );

  if (round === "code") return (
    <CodeExamPage
      onNavigate={handleNavigate}
      onStartViva={handleStartViva}
      examId={examId}
      assignmentId={assignmentId}
    />
  );

  if (round === "viva") return (
    <AIVivaPage
      onNavigate={handleNavigate}
      codingScore={codingScore}
    />
  );

  /* MCQ round — passes geo + exam props */
  return (
    <ExamPage
      onNavigate={handleNavigate}
      locationGranted={locationGranted}
      initialCoords={initialCoords}
      geoSessionId={geoSessionId}
      examId={examId}
      assignmentId={assignmentId}
    />
  );
}