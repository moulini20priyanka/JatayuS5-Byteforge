// frontend/src/hooks/useExamQuestions.js
// Reusable hook used by MCQExam, SQLExam, CodeExam pages
// Fetches randomized questions from /api/questions/:examId/:pageType

import { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';

export function useExamQuestions({ examId, assignmentId, pageType }) {
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [answers,    setAnswers]    = useState({});   // { questionId: selectedOption }
  const [submitted,  setSubmitted]  = useState(false);
  const [result,     setResult]     = useState(null);

  // ── Fetch questions on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!examId || !pageType) return;

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const url   = `${API}/questions/${examId}/${pageType}?assignment_id=${assignmentId || ''}`;
        const res   = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load questions');
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [examId, pageType, assignmentId]);

  // ── Save answer to backend immediately when student selects ──────────────
  const saveAnswer = useCallback(async (questionId, selectedAns, codeAnswer = null) => {
    // Update local state immediately for responsive UI
    setAnswers(prev => ({ ...prev, [questionId]: selectedAns }));

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/questions/answer`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          question_id:   questionId,
          selected_ans:  selectedAns,
          code_answer:   codeAnswer,
        }),
      });
    } catch (err) {
      console.warn('[saveAnswer] Failed to persist:', err.message);
      // Don't crash — answer is still in local state
    }
  }, [assignmentId]);

  // ── Submit all answers ────────────────────────────────────────────────────
  const submitExam = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/questions/submit`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          exam_id:       examId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
      setResult(data);
      return data;
    } catch (err) {
      throw err;
    }
  }, [assignmentId, examId]);

  return {
    questions,
    loading,
    error,
    answers,
    submitted,
    result,
    saveAnswer,
    submitExam,
    answeredCount: Object.keys(answers).length,
    totalCount:    questions.length,
  };
}


