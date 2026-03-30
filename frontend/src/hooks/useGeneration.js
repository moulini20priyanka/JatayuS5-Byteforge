// src/hooks/useGeneration.js
import { useState, useCallback } from "react";

const API = process.env.REACT_APP_QUIZFORGE_API || "http://localhost:3001";

export function useGeneration() {
  const [state, setState] = useState("idle"); // idle | generating | done | error
  const [progress, setProgress] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const generate = useCallback(async (params) => {
    setState("generating");
    setProgress([]);
    setQuestions([]);
    setStats(null);
    setError(null);

    try {
      // SSE via POST — we POST first, then stream
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let event = "message";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: ")) data = line.slice(6).trim();
          }

          if (!data) continue;

          try {
            const payload = JSON.parse(data);

            if (event === "progress") {
              setProgress((prev) => [...prev, payload]);
            } else if (event === "complete") {
              setQuestions(payload.questions || []);
              setStats(payload.stats || null);
              setState("done");
            } else if (event === "error") {
              setError(payload.message);
              setState("error");
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setProgress([]);
    setQuestions([]);
    setStats(null);
    setError(null);
  }, []);

  const downloadPDF = useCallback(async (selectedQuestions, metadata) => {
    const res = await fetch(`${API}/api/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: selectedQuestions, metadata }),
    });

    if (!res.ok) throw new Error("PDF generation failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { state, progress, questions, stats, error, generate, reset, downloadPDF };
}
