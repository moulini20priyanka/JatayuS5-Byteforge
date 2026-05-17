

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExamPage   from "./ExamPage";
import AIVivaPage from "./AIVivaPage";
import SQLExamPage   from "./SQLExamPage";   
import CodeExamPage  from "./CodeExamPage";  

export default function ExamRouter() {
  const reactNavigate  = useNavigate();
  const routerLocation = useLocation();
  const routeState     = routerLocation?.state || {};

  /* ── Geo props ── */
  const locationGranted = routeState.locationGranted || false;
  const initialCoords   = routeState.initialCoords   || null;
  const geoSessionId    = routeState.geoSessionId    || null;


  const examId = (
    routeState.examId       ||
    routeState.exam_id      ||
    routeState.exam?.id     ||
    null
  );
  const assignmentId = (
    routeState.assignmentId       ||
    routeState.assignment_id      ||
    routeState.exam?.assignment_id ||
    null
  );

  const examTitle    = routeState.title    || routeState.exam?.title              || "Assessment";
  const durationMins = routeState.duration || routeState.exam?.duration_minutes   || 60;

  /* ── Round state ── */
  const [round,       setRound]       = useState("mcq");
  const [codingScore, setCodingScore] = useState(null);

  const handleNavigate = (target) => {
    if      (target === "sql")                            setRound("sql");
    else if (target === "code" || target === "code-exam") setRound("code");
    else if (target === "viva")                           setRound("viva");
    else                                                  reactNavigate("/student-dashboard");
  };

  const handleStartViva = (score) => {
    setCodingScore(score);
    setRound("viva");
  };

  /* ── Common props forwarded to every round ── */
  const commonProps = {
    examId,
    assignmentId,
    onNavigate: handleNavigate,
    examTitle,
    durationMins,
  };

  if (round === "sql") return (
    <SQLExamPage {...commonProps} />
  );

  if (round === "code") return (
    <CodeExamPage
      {...commonProps}
      onStartViva={handleStartViva}
    />
  );

  if (round === "viva") return (
    <AIVivaPage
      examId={examId}
      assignmentId={assignmentId}
      onNavigate={handleNavigate}
      codingScore={codingScore}
    />
  );

  /* ── MCQ round (default) ── */
  return (
    <ExamPage
      examId={examId}
      assignmentId={assignmentId}
      onNavigate={handleNavigate}
      locationGranted={locationGranted}
      initialCoords={initialCoords}
      geoSessionId={geoSessionId}
      examTitle={examTitle}
      durationSecs={durationMins * 60}
    />
  );
}