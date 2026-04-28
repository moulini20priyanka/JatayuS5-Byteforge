// frontend/src/pages/CodeExam.jsx
// STATIC FALLBACK: If backend returns no questions, uses hardcoded Two Sum (Two Pointer).
// ROUTING: After submit → always calls onStartViva() / onNavigate("viva"). No score shown.

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STATIC_CODING_QUESTIONS } from '../data/staticExamData';

const API_URL = "http://localhost:5000";

export default function CodeExam({
  examId:       examIdProp,
  assignmentId: assignmentIdProp,
  onNavigate,
  onStartViva,
  examTitle:    examTitleProp,
  durationMins: durationMinsProp,
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const examCtx   = location.state || {};

  const examId       = examIdProp       || examCtx.exam_id       || examCtx.examId       || examCtx.exam?.id;
  const assignmentId = assignmentIdProp || examCtx.assignment_id || examCtx.assignmentId || examCtx.exam?.assignment_id;
  const examTitle    = examTitleProp    || examCtx.title         || 'Round 3 — Coding';
  const durationMins = durationMinsProp || examCtx.duration      || 45;
  const numericExamId = typeof examId === 'string' ? parseInt(examId, 10) : examId;

  const [questions, setQuestions] = useState([]);
  const [answers,   setAnswers]   = useState({});
  const [loading,   setLoading]   = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [code,      setCode]      = useState('');
  const [timeLeft,  setTimeLeft]  = useState(durationMins * 60);
  const [showConf,  setShowConf]  = useState(false);
  const [output,    setOutput]    = useState('');
  const [running,   setRunning]   = useState(false);
  const timerRef = useRef(null);

  // ── Fetch coding questions; fall back to static ────────────────────────
  useEffect(() => {
    if (!numericExamId || isNaN(numericExamId)) {
      setQuestions(STATIC_CODING_QUESTIONS);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    fetch(`${API_URL}/api/questions/${numericExamId}/coding?assignment_id=${assignmentId || ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("not ok"); return r.json(); })
      .then(data => {
        const qs = data.questions || [];
        setQuestions(qs.length > 0 ? qs : STATIC_CODING_QUESTIONS);
      })
      .catch(() => setQuestions(STATIC_CODING_QUESTIONS))
      .finally(() => setLoading(false));
  }, [numericExamId, assignmentId]);

  // ── Set starter code when question changes ─────────────────────────────
  useEffect(() => {
    if (questions[current]) {
      const saved = answers[questions[current].id];
      setCode(saved || questions[current].starter_code || '// Write your solution here\n');
      setOutput('');
    }
  }, [current, questions]); // eslint-disable-line

  // ── Timer ──────────────────────────────────────────────────────────────
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

  const fmt           = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = Object.values(answers).filter(v => v && v.trim().length > 0).length;
  const totalCount    = questions.length;

  function handleCodeChange(val) {
    setCode(val);
    if (questions[current]) {
      setAnswers(prev => ({ ...prev, [questions[current].id]: val }));
    }
  }

  async function handleSubmit() {
    clearInterval(timerRef.current);
    setShowConf(false);

    if (questions[current]) {
      setAnswers(prev => ({ ...prev, [questions[current].id]: code }));
    }

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (assignmentId && numericExamId && !isNaN(numericExamId)) {
      fetch(`${API_URL}/api/questions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: numericExamId, code_answers: answers }),
      }).catch(() => {});
    }

    setSubmitted(true);
  }

  function runCode() {
    setRunning(true);
    setOutput('');
    try {
      const logs = [];
      const fakeConsole = { log: (...args) => logs.push(args.map(String).join(' ')) };
      // eslint-disable-next-line no-new-func
      const fn = new Function('console', code);
      fn(fakeConsole);
      setOutput(logs.join('\n') || '(no output)');
    } catch (e) {
      setOutput('Error: ' + e.message);
    }
    setRunning(false);
  }

  const goNext = () => {
    if (onStartViva) onStartViva(answeredCount);
    else if (onNavigate) onNavigate("viva");
    else navigate("/student-dashboard");
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <div style={{ width: 36, height: 36, border: "3px solid #1e3a5f", borderTopColor: "#2BB1A8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: '#7aacba', marginTop: 12, fontSize: 14 }}>Loading coding problem…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Result / Submitted ────────────────────────────────────────────────────
  if (submitted) return (
    <div style={S.center}>
      <div style={S.resultCard}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Coding Round Complete!</h2>
        <p style={{ color: '#7aacba', marginBottom: 20, fontSize: 13, lineHeight: 1.6 }}>
          Your solution has been submitted and will be reviewed.
        </p>
        <div style={{ background: '#0d1f30', borderRadius: 10, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2BB1A8', marginBottom: 4 }}>🎤 AI Viva Round Next</div>
          <div style={{ fontSize: 12, color: '#7aacba', lineHeight: 1.6 }}>Proceed to the AI-powered oral assessment round.</div>
        </div>
        <button style={{ ...S.btn, width: '100%', padding: '13px', fontSize: 15 }} onClick={goNext}>
          Start AI Viva Round →
        </button>
      </div>
    </div>
  );

  const q = questions[current];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.examTitle}>{examTitle}</div>
          <div style={S.subtitle}>Problem {current + 1} of {totalCount}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...S.timer, color: timeLeft < 600 ? '#e53e3e' : '#e2e8f0' }}>⏱ {fmt(timeLeft)}</div>
          <button style={S.btnOutline} onClick={() => setShowConf(true)}>Submit All</button>
        </div>
      </div>

      {/* Problem tabs */}
      <div style={S.tabs}>
        {questions.map((p, idx) => {
          const done = !!(answers[p.id] && answers[p.id].trim().length > 0);
          return (
            <button key={idx}
              style={{ ...S.tab, ...(current === idx ? S.tabActive : {}), ...(done ? S.tabDone : {}) }}
              onClick={() => setCurrent(idx)}>
              P{idx + 1}
            </button>
          );
        })}
      </div>

      {q ? (
        <div style={S.layout}>
          {/* Problem description */}
          <div style={S.problemPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={S.problemTitle}>{q.question_text}</h2>
              <span style={{ ...S.badge, ...diffBadge(q.difficulty) }}>{q.difficulty || 'medium'}</span>
            </div>
            {q.description && (
              <>
                <h4 style={S.sectionHead}>Problem Statement</h4>
                <p style={S.descText}>{q.description}</p>
              </>
            )}
            {q.constraints_text && (
              <>
                <h4 style={S.sectionHead}>Constraints</h4>
                <pre style={S.constraintsBox}>{q.constraints_text}</pre>
              </>
            )}
          </div>

          {/* Code editor */}
          <div style={S.editorPanel}>
            <div style={S.editorHeader}>
              <span style={{ fontSize: 13, color: '#7aacba' }}>JavaScript</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.runBtn} onClick={runCode} disabled={running}>
                  {running ? 'Running…' : '▶ Run'}
                </button>
                <button style={S.saveBtn} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: code }))}>
                  💾 Save
                </button>
              </div>
            </div>
            <textarea
              style={S.editor}
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
              spellCheck={false}
              placeholder="// Write your solution here"
            />
            {output && (
              <div style={S.outputBox}>
                <div style={S.outputHead}>Output</div>
                <pre style={S.outputText}>{output}</pre>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showConf && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={{ margin: '0 0 12px', color: '#0A2A41' }}>Submit Solution?</h3>
            <p style={{ color: '#3d6878', marginBottom: 20 }}>
              Your code will be submitted for review. You cannot edit after submitting.
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
  page:           { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A2A41' },
  center:         { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A2A41', gap: 16 },
  header:         { background: '#061929', color: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  examTitle:      { fontSize: 16, fontWeight: 700, color: '#fff' },
  subtitle:       { fontSize: 12, color: '#7aacba', marginTop: 2 },
  timer:          { fontFamily: 'monospace', fontSize: 18, fontWeight: 700, background: '#0A2A41', padding: '5px 12px', borderRadius: 8 },
  tabs:           { display: 'flex', gap: 4, padding: '8px 24px', background: '#061929', borderBottom: '1px solid #1e3a5f', flexShrink: 0 },
  tab:            { padding: '6px 14px', borderRadius: 6, border: '1px solid #1e3a5f', background: 'transparent', color: '#7aacba', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tabActive:      { background: '#1e3a5f', color: '#fff', border: '1px solid #2BB1A8' },
  tabDone:        { borderColor: '#2BB1A8', color: '#2BB1A8' },
  layout:         { display: 'flex', flex: 1, overflow: 'hidden' },
  problemPanel:   { width: 380, background: '#fff', padding: '24px 20px', overflowY: 'auto', flexShrink: 0 },
  problemTitle:   { fontSize: 16, color: '#0A2A41', margin: 0, flex: 1 },
  badge:          { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', flexShrink: 0 },
  sectionHead:    { fontSize: 13, fontWeight: 700, color: '#3d6878', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 },
  descText:       { fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' },
  constraintsBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 },
  editorPanel:    { flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e2e', overflow: 'hidden' },
  editorHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#161622', borderBottom: '1px solid #2d2d44' },
  editor:         { flex: 1, background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'monospace', fontSize: 14, border: 'none', outline: 'none', padding: '16px', resize: 'none', lineHeight: 1.6, tabSize: 2 },
  runBtn:         { padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2BB1A8', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  saveBtn:        { padding: '6px 14px', borderRadius: 6, border: '1px solid #3d6878', background: 'transparent', color: '#7aacba', cursor: 'pointer', fontSize: 13 },
  outputBox:      { background: '#11111b', borderTop: '1px solid #2d2d44', maxHeight: 160, overflow: 'auto', flexShrink: 0 },
  outputHead:     { fontSize: 12, color: '#7aacba', padding: '6px 16px 0', fontWeight: 600 },
  outputText:     { margin: 0, padding: '6px 16px 12px', color: '#a6e3a1', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' },
  btn:            { background: '#2BB1A8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnOutline:     { background: 'transparent', color: '#2BB1A8', border: '1.5px solid #2BB1A8', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:          { background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%' },
  resultCard:     { background: '#0d1f30', border: '1px solid #1e3a5f', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 420, width: '90%' },
};