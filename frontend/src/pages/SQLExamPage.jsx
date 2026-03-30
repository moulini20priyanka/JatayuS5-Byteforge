// frontend/src/pages/SQLExam.jsx
// Fetches randomized SQL questions from /api/questions/:examId/sql

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExamQuestions } from '../hooks/useExamQuestions';

export default function SQLExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const examCtx   = location.state || {};

  const examId       = examCtx.exam_id       || examCtx.examId;
  const assignmentId = examCtx.assignment_id || examCtx.assignmentId;
  const examTitle    = examCtx.title         || 'SQL Exam';
  const durationMins = examCtx.duration      || 60;

  const {
    questions,
    loading,
    error,
    answers,
    submitted,
    result,
    saveAnswer,
    submitExam,
    answeredCount,
    totalCount,
  } = useExamQuestions({ examId, assignmentId, pageType: 'sql' });

  const [timeLeft, setTimeLeft] = useState(durationMins * 60);
  const [current,  setCurrent]  = useState(0);
  const [showConf, setShowConf] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  async function handleSubmit() {
    clearInterval(timerRef.current);
    setShowConf(false);
    try { await submitExam(); }
    catch (e) { alert('Submission failed: ' + e.message); }
  }

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen msg={error} onBack={() => navigate(-1)} />;

  if (submitted && result) {
    const score = result.score_sql !== null ? result.score_sql : result.score;
    const passed = score >= 40;
    return (
      <div style={S.center}>
        <div style={S.resultCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{passed ? '🎉' : '📋'}</div>
          <h2 style={{ color: '#0A2A41' }}>{passed ? 'Well done!' : 'Exam Submitted'}</h2>
          <div style={{ fontSize: 56, fontWeight: 700, color: passed ? '#0a8f5c' : '#b45309', margin: '12px 0' }}>
            {Math.round(score)}%
          </div>
          <p style={{ color: '#7aacba', fontSize: 13 }}>{answeredCount} of {totalCount} answered</p>
          <button style={S.btn} onClick={() => navigate('/student/dashboard')}>Back to Dashboard</button>
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
          <div style={S.examTitle}>{examTitle}</div>
          <div style={S.subtitle}>SQL Section · Question {current + 1} of {totalCount}</div>
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
        <div style={S.questionPanel}>
          {q ? (
            <>
              <span style={{ ...S.badge, background: '#e0f2fe', color: '#0369a1' }}>SQL</span>
              <span style={{ ...S.badge, ...diffBadge(q.difficulty), marginLeft: 8 }}>{q.difficulty}</span>

              <div style={S.questionText}>{q.question_text}</div>

              {/* SQL questions may have a code snippet in description */}
              {q.description && (
                <pre style={S.codeBlock}>{q.description}</pre>
              )}

              <div style={S.optionsGrid}>
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = q[`option_${opt.toLowerCase()}`];
                  if (!text) return null;
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      style={{ ...S.option, ...(selected ? S.optionSelected : {}) }}
                      onClick={() => saveAnswer(q.id, opt)}
                    >
                      <span style={{ ...S.optLabel, ...(selected ? S.optLabelSel : {}) }}>{opt}</span>
                      {/* SQL options may be code — render in monospace */}
                      <span style={{ ...S.optText, fontFamily: text.includes('SELECT') || text.includes('JOIN') ? 'monospace' : 'inherit', fontSize: text.length > 80 ? 13 : 15 }}>
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
          ) : <p style={{ color: '#7aacba' }}>No SQL questions found.</p>}
        </div>

        {/* Palette */}
        <div style={S.palette}>
          <div style={S.paletteTitle}>Questions</div>
          <div style={S.paletteGrid}>
            {questions.map((_, idx) => {
              const ans = answers[questions[idx]?.id];
              return (
                <button key={idx}
                  style={{ ...S.paletteBtn, background: ans ? '#2BB1A8' : current === idx ? '#E6F1FB' : '#f5f5f5', color: ans ? '#fff' : '#0A2A41', border: current === idx ? '2px solid #185FA5' : '1px solid #ddd' }}
                  onClick={() => setCurrent(idx)}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showConf && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={{ margin: '0 0 12px', color: '#0A2A41' }}>Submit SQL Exam?</h3>
            <p style={{ color: '#3d6878', marginBottom: 20 }}>
              {answeredCount} of {totalCount} answered.
              {answeredCount < totalCount && ` ${totalCount - answeredCount} unanswered.`}
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

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#CFF4F7' }}>
      <p style={{ color: '#3d6878' }}>Loading SQL questions...</p>
    </div>
  );
}

function ErrorScreen({ msg, onBack }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#CFF4F7', gap: 16 }}>
      <p style={{ color: '#e53e3e' }}>Error: {msg}</p>
      <button style={S.btn} onClick={onBack}>Go Back</button>
    </div>
  );
}

const S = {
  page:         { minHeight: '100vh', background: '#CFF4F7', paddingBottom: 40 },
  center:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#CFF4F7' },
  header:       { background: '#0A2A41', color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  examTitle:    { fontSize: 18, fontWeight: 700 },
  subtitle:     { fontSize: 13, color: '#7aacba', marginTop: 2 },
  timer:        { fontFamily: 'monospace', fontSize: 20, fontWeight: 700, background: '#f0f9fa', padding: '6px 14px', borderRadius: 8 },
  progressBg:   { height: 6, background: '#b8eaee' },
  progressBar:  { height: '100%', background: '#2BB1A8', transition: 'width 0.3s' },
  progressLabel:{ textAlign: 'right', fontSize: 12, color: '#3d6878', padding: '4px 32px 0' },
  layout:       { display: 'flex', gap: 24, padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
  questionPanel:{ flex: 1, background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  badge:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', display: 'inline-block' },
  questionText: { fontSize: 16, color: '#0A2A41', lineHeight: 1.6, margin: '14px 0 12px', fontWeight: 500 },
  codeBlock:    { background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '14px 18px', fontFamily: 'monospace', fontSize: 13, overflowX: 'auto', marginBottom: 18, lineHeight: 1.6 },
  optionsGrid:  { display: 'flex', flexDirection: 'column', gap: 10 },
  option:       { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  optionSelected:{ border: '2px solid #2BB1A8', background: '#f0fdfc' },
  optLabel:     { width: 28, height: 28, borderRadius: '50%', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, color: '#3d6878', marginTop: 2 },
  optLabelSel:  { background: '#2BB1A8', color: '#fff' },
  optText:      { flex: 1, color: '#0A2A41', lineHeight: 1.5 },
  navRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  navBtn:       { padding: '10px 20px', borderRadius: 8, border: '1px solid #b8eaee', background: '#fff', color: '#0A2A41', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  palette:      { width: 200, background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', alignSelf: 'flex-start', position: 'sticky', top: 20 },
  paletteTitle: { fontWeight: 700, color: '#0A2A41', marginBottom: 12, fontSize: 14 },
  paletteGrid:  { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 },
  paletteBtn:   { width: 34, height: 34, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btn:          { background: '#2BB1A8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnOutline:   { background: '#fff', color: '#2BB1A8', border: '1.5px solid #2BB1A8', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:        { background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%' },
  resultCard:   { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 400, width: '90%' },
};