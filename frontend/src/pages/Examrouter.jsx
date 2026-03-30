import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ExamPage     from "./ExamPage";
import SQLExamPage  from "./SQLExamPage";
import CodeExamPage from "./CodeExamPage";
import AIVivaPage   from "./AIVivaPage";


export default function ExamRouter() {
  const [round,       setRound]       = useState("mcq"); // "mcq" | "sql" | "code" | "viva"
  const [codingScore, setCodingScore] = useState(null);
  const reactNavigate = useNavigate();

  const handleNavigate = (target) => {
    if      (target === "sql")                             setRound("sql");
    else if (target === "code-exam" || target === "code")  setRound("code");
    else if (target === "lobby")                           reactNavigate("/student-dashboard");
  };

  // Called directly by CodeExamPage when student clicks "Start AI Viva Round"
  // No transition screen — this immediately swaps the component to AIVivaPage
  const handleStartViva = (score) => {
    setCodingScore(score);
    setRound("viva");
  };

  if (round === "sql")  return <SQLExamPage  onNavigate={handleNavigate} />;

  if (round === "code") return (
    <CodeExamPage
      onNavigate={handleNavigate}
      onStartViva={handleStartViva}
    />
  );

  if (round === "viva") return (
    <AIVivaPage
      onNavigate={handleNavigate}
      codingScore={codingScore}
    />
  );

  return <ExamPage onNavigate={handleNavigate} />;
}