// hooks/useSilentAutoSave.js
import { useEffect, useRef } from "react";

const SAVE_INTERVAL_MS = 2 * 60 * 1000;
const API_BASE = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';

export function useSilentAutoSave({ code, studentId, examId }) {
  const codeRef = useRef(code);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!studentId || examId === undefined || examId === null) {
      console.warn("[useSilentAutoSave] Missing studentId or examId");
      return;
    }

    const numericExamId = typeof examId === 'string' ? parseInt(examId, 10) : examId;
    
    if (isNaN(numericExamId) || !Number.isInteger(numericExamId)) {
      console.error(
        "[useSilentAutoSave] examId must be an integer database ID. " +
        `Received: ${examId} (type: ${typeof examId}). ` +
        "Did you pass exam.exam_key instead of exam.id?"
      );
      return;
    }

    saveCode(studentId, numericExamId, codeRef.current);

    const interval = setInterval(() => {
      if (codeRef.current !== lastSavedRef.current) {
        saveCode(studentId, numericExamId, codeRef.current);
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [studentId, examId]);

  async function saveCode(sId, eId, currentCode) {
    try {
      await fetch(`${API_BASE}/api/code/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sId,
          examId: eId,
          code: currentCode,
        }),
        keepalive: true,
      });
      lastSavedRef.current = currentCode;
    } catch (err) {
      console.debug("[useSilentAutoSave] Save failed (silent):", err?.message);
    }
  }
}