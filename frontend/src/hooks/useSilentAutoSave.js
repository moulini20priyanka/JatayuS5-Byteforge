// hooks/useSilentAutoSave.js
import { useEffect, useRef } from "react";

const SAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useSilentAutoSave({ code, studentId, examId }) {
  const codeRef = useRef(code);
  const lastSavedRef = useRef(null);

  // Keep codeRef updated
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Main save effect
  useEffect(() => {
    // Validate required params
    if (!studentId || examId === undefined || examId === null) {
      console.warn("[useSilentAutoSave] Missing studentId or examId");
      return;
    }

    // ✅ CRITICAL: Ensure examId is an integer (database expects INT)
    const numericExamId = typeof examId === 'string' ? parseInt(examId, 10) : examId;
    
    if (isNaN(numericExamId) || !Number.isInteger(numericExamId)) {
      console.error(
        "[useSilentAutoSave] examId must be an integer database ID. " +
        `Received: ${examId} (type: ${typeof examId}). ` +
        "Did you pass exam.exam_key instead of exam.id?"
      );
      return;
    }

    // Initial save
    saveCode(studentId, numericExamId, codeRef.current);

    // Periodic auto-save
    const interval = setInterval(() => {
      if (codeRef.current !== lastSavedRef.current) {
        saveCode(studentId, numericExamId, codeRef.current);
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [studentId, examId]); // Re-run if examId changes (e.g., navigating between exams)

  // Silent save function
  async function saveCode(sId, eId, currentCode) {
    try {
      await fetch("http://localhost:5000/api/code/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sId,      // VARCHAR from candidates.id
          examId: eId,         // ✅ INTEGER from exams.id
          code: currentCode,
        }),
        keepalive: true, // Continue request even if page unloads
      });
      lastSavedRef.current = currentCode;
    } catch (err) {
      // ✅ Fail silently — student must NEVER know about background checks
      console.debug("[useSilentAutoSave] Save failed (silent):", err?.message);
    }
  }
}