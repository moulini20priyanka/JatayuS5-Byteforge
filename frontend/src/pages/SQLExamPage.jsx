// frontend/src/pages/SQLExam.jsx
// FIXED:
//   1. Fetches from /api/questions/:examId/sql — reads from questions table directly
//   2. No cutoff logic — just submit and show score
//   3. After submit → calls onNavigate("code") to go to Coding round
//   4. Props first, then location.state fallback for examId/assignmentId

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = "http://localhost:5000";

export default function SQLExam({
  examId:       examIdProp,
  assignmentId: assignmentIdProp,
  onNavigate,
  examTitle:    examTitleProp,
  durationMins: durationMinsProp,
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const examCtx   = location.state || {};

  const examId       = examIdProp       || examCtx.exam_id       || examCtx.examId       || examCtx.exam?.id;
  const assignmentId = assignmentIdProp || examCtx.assignment_id || examCtx.assignmentId || examCtx.exam?.assignment_id;
  const examTitle    = examTitleProp    || examCtx.title         || 'SQL Round';
  const durationMins = durationMinsProp || examCtx.duration      || 60;

  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [current,    setCurrent]    = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(durationMins * 60);
  const [showConf,   setShowConf]   = useState(false);
  const timerRef = useRef(null);

  // ── Fetch SQL questions from questions table ─────────────────────────────
  useEffect(() => {
    if (!examId) {
      setError("No exam ID — please go back and try again.");
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    fetch(`${API_URL}/api/questions/${examId}/sql?assignment_id=${assignmentId || ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`Server ${r.status}`); return r.json(); })
      .then(data => {
        if (data.error) throw new Error(data.error);
        const qs = data.questions || [];
        if (qs.length === 0) throw new Error("No SQL questions found for this exam.");
        setQuestions(qs);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [examId, assignmentId]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]); // eslint-disable-line

  const fmt          = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = Object.keys(answers).length;
  const totalCount    = questions.length;
  const pct           = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  function saveAnswer(qId, opt) {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    if (!assignmentId) return;
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    fetch(`${API_URL}/api/questions/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignment_id: assignmentId, question_id: qId, selected_ans: opt }),
    }).catch(() => {});
  }

  async function handleSubmit() {
    clearInterval(timerRef.current);
    setShowConf(false);

    // Score locally — check correct_ans, correct_answer, or answer field
    let correct = 0;
    questions.forEach(q => {
      const correctField = q.correct_ans ?? q.correct_answer ?? q.answer;
      if (answers[q.id] === correctField) correct++;
    });
    const score = totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0;

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (assignmentId) {
      fetch(`${API_URL}/api/questions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, score_sql: score }),
      }).catch(() => {});
    }

    setResult({ score, correct, total: totalCount });
    setSubmitted(true);
  }

  const goNext = () => {
    if (onNavigate) onNavigate("code");
    else navigate("/code-exam");
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <div style={{ width: 36, height: 36, border: "3px solid #b8eaee", borderTopColor: "#2BB1A8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: '#3d6878', marginTop: 12, fontSize: 14 }}>Loading SQL questions…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={S.center}>
      <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '32px 40px', textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: '#dc2626', marginBottom: 8, fontSize: 16 }}>SQL Round Error</h3>
        <p style={{ color: '#7f1d1d', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{error}</p>
        <button style={S.btn} onClick={() => onNavigate ? onNavigate("lobby") : navigate("/student-dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // ── Result ───────────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <div style={S.center}>
        <div style={S.resultCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ color: '#0A2A41', marginBottom: 8 }}>SQL Round Complete!</h2>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#2BB1A8', margin: '12px 0' }}>
            {result.score}%
          </div>
          <p style={{ color: '#7aacba', fontSize: 13, marginBottom: 24 }}>
            {result.correct} / {result.total} correct
          </p>
          <div style={{ background: '#f0fdfc', border: '1px solid #99f6e4', borderRadius: 10, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a8f5c', marginBottom: 4 }}>🚀 Coding Round Next</div>
            <div style={{ fontSize: 12, color: '#3d6878', lineHeight: 1.6 }}>Proceed to the Coding round.</div>
          </div>
          <button style={{ ...S.btn, width: '100%', padding: '13px', fontSize: 15 }} onClick={goNext}>
            Proceed to Coding Round →
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.examTitle}>{examTitle} — SQL Round</div>
          <div style={S.subtitle}>Question {current + 1} of {totalCount}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...S.timer, color: timeLeft < 300 ? '#e53e3e' : '#0A2A41' }}>⏱ {fmt(timeLeft)}</div>
          <button style={S.btnOutline} onClick={() => setShowConf(true)}>Submit</button>
        </div>
      </div>

      {/* Progress */}
      <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${pct}%` }} /></div>
      <div style={S.progressLabel}>{answeredCount} / {totalCount} answered</div>

      <div style={S.layout}>
        {/* Question panel */}
        <div style={S.questionPanel}>
          {q ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <span style={{ ...S.badge, background: '#e0f2fe', color: '#0369a1' }}>SQL</span>
                <span style={{ ...S.badge, ...diffBadge(q.difficulty) }}>{q.difficulty || 'medium'}</span>
              </div>

              <div style={S.questionText}>{q.question_text}</div>

              {q.description && (
                <pre style={S.codeBlock}>{q.description}</pre>
              )}

              <div style={S.optionsGrid}>
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = q[`option_${opt.toLowerCase()}`];
                  if (!text) return null;
                  const selected = answers[q.id] === opt;
                  return (
                    <button key={opt}
                      style={{ ...S.option, ...(selected ? S.optionSelected : {}) }}
                      onClick={() => saveAnswer(q.id, opt)}>
                      <span style={{ ...S.optLabel, ...(selected ? S.optLabelSel : {}) }}>{opt}</span>
                      <span style={{
                        ...S.optText,
                        fontFamily: /SELECT|JOIN|WHERE|FROM|GROUP|ORDER/i.test(text) ? 'monospace' : 'inherit',
                        fontSize: text.length > 80 ? 13 : 15,
                      }}>
                        {text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={S.navRow}>
                <button style={{ ...S.navBtn, opacity: current === 0 ? 0.4 : 1 }}
                  onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                  ← Previous
                </button>
                <span style={{ color: '#7aacba', fontSize: 13 }}>{current + 1} / {totalCount}</span>
                <button style={{ ...S.navBtn, opacity: current === totalCount - 1 ? 0.4 : 1 }}
                  onClick={() => setCurrent(c => Math.min(totalCount - 1, c + 1))} disabled={current === totalCount - 1}>
                  Next →
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#7aacba' }}>No SQL questions available.</p>
          )}
        </div>

        {/* Question palette */}
        <div style={S.palette}>
          <div style={S.paletteTitle}>Questions</div>
          <div style={S.paletteGrid}>
            {questions.map((_, idx) => {
              const isAnswered = !!answers[questions[idx]?.id];
              return (
                <button key={idx}
                  style={{
                    ...S.paletteBtn,
                    background: isAnswered ? '#2BB1A8' : current === idx ? '#E6F1FB' : '#f5f5f5',
                    color: isAnswered ? '#fff' : '#0A2A41',
                    border: current === idx ? '2px solid #185FA5' : '1px solid #ddd',
                  }}
                  onClick={() => setCurrent(idx)}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { bg: '#2BB1A8', color: '#fff',    border: 'none',              label: 'Answered' },
              { bg: '#E6F1FB', color: '#0A2A41', border: '2px solid #185FA5', label: 'Current'  },
              { bg: '#f5f5f5', color: '#0A2A41', border: '1px solid #ddd',    label: 'Pending'  },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7aacba' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: l.border, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConf && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={{ margin: '0 0 12px', color: '#0A2A41' }}>Submit SQL Round?</h3>
            <p style={{ color: '#3d6878', marginBottom: 20 }}>
              {answeredCount} of {totalCount} answered.
              {answeredCount < totalCount && ` ${totalCount - answeredCount} unanswered will be marked incorrect.`}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={S.btnOutline} onClick={() => setShowConf(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSubmit}>Yes, Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function diffBadge(d) {
  if (d === 'easy') return { background: '#d9f5ec', color: '#0a8f5c' };
  if (d === 'hard') return { background: '#fde8e8', color: '#c53030' };
  return { background: '#fef3c7', color: '#92400e' };
}

const S = {
  page:          { minHeight: '100vh', background: '#CFF4F7', paddingBottom: 40 },
  center:        { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#CFF4F7', gap: 12 },
  header:        { background: '#0A2A41', color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  examTitle:     { fontSize: 18, fontWeight: 700 },
  subtitle:      { fontSize: 13, color: '#7aacba', marginTop: 2 },
  timer:         { fontFamily: 'monospace', fontSize: 20, fontWeight: 700, background: '#f0f9fa', padding: '6px 14px', borderRadius: 8 },
  progressBg:    { height: 6, background: '#b8eaee' },
  progressBar:   { height: '100%', background: '#2BB1A8', transition: 'width 0.3s' },
  progressLabel: { textAlign: 'right', fontSize: 12, color: '#3d6878', padding: '4px 32px 0' },
  layout:        { display: 'flex', gap: 24, padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
  questionPanel: { flex: 1, background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  badge:         { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', display: 'inline-block' },
  questionText:  { fontSize: 16, color: '#0A2A41', lineHeight: 1.6, margin: '14px 0 12px', fontWeight: 500 },
  codeBlock:     { background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '14px 18px', fontFamily: 'monospace', fontSize: 13, overflowX: 'auto', marginBottom: 18, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  optionsGrid:   { display: 'flex', flexDirection: 'column', gap: 10 },
  option:        { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  optionSelected:{ border: '2px solid #2BB1A8', background: '#f0fdfc' },
  optLabel:      { width: 28, height: 28, borderRadius: '50%', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, color: '#3d6878', marginTop: 2 },
  optLabelSel:   { background: '#2BB1A8', color: '#fff' },
  optText:       { flex: 1, color: '#0A2A41', lineHeight: 1.5 },
  navRow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  navBtn:        { padding: '10px 20px', borderRadius: 8, border: '1px solid #b8eaee', background: '#fff', color: '#0A2A41', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  palette:       { width: 200, background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', alignSelf: 'flex-start', position: 'sticky', top: 20 },
  paletteTitle:  { fontWeight: 700, color: '#0A2A41', marginBottom: 12, fontSize: 14 },
  paletteGrid:   { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 },
  paletteBtn:    { width: 34, height: 34, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btn:           { background: '#2BB1A8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnOutline:    { background: '#fff', color: '#2BB1A8', border: '1.5px solid #2BB1A8', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:         { background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%' },
  resultCard:    { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 420, width: '90%' },
};