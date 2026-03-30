// frontend/src/pages/CodeExam.jsx
// FIXED:
//   1. Reads examId + assignmentId from PROPS first, then location.state fallback
//   2. After submit → calls onNavigate("viva") or shows completion screen
//   3. Fetches from /api/questions/:examId/coding directly (no hook)
//   4. No cutoff logic — just submit and proceed
//   5. ✅ examId parsed as INTEGER for all backend API calls
//   6. ✅ useSilentAutoSave hook integrated for silent background saves

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSilentAutoSave } from '../hooks/useSilentAutoSave'; // ← Added import

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

  // Props first, then location.state fallback
  const examId       = examIdProp       || examCtx.exam_id       || examCtx.examId       || examCtx.exam?.id;
  const assignmentId = assignmentIdProp || examCtx.assignment_id || examCtx.assignmentId || examCtx.exam?.assignment_id;
  const examTitle    = examTitleProp    || examCtx.title         || 'Coding Round';
  const durationMins = durationMinsProp || examCtx.duration      || 90;

  // ✅ CRITICAL: Parse examId as INTEGER for database consistency
  const numericExamId = typeof examId === 'string' ? parseInt(examId, 10) : examId;

  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});  // { [qId]: code string }
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [current,    setCurrent]    = useState(0);
  const [code,       setCode]       = useState('');
  const [timeLeft,   setTimeLeft]   = useState(durationMins * 60);
  const [showConf,   setShowConf]   = useState(false);
  const [output,     setOutput]     = useState('');
  const [running,    setRunning]    = useState(false);
  const timerRef = useRef(null);

  // ── Silent Auto-Save Hook ────────────────────────────────────────────────
  // Runs every 2 minutes in background — student NEVER notified
  useSilentAutoSave({
    code,
    studentId: localStorage.getItem('userId') || localStorage.getItem('candidateId'),
    examId: numericExamId, // ✅ Send INTEGER, not string
  });

  // ── Fetch coding questions ─────────────────────────────────────────────
  useEffect(() => {
    // ✅ Validate numericExamId before fetching
    if (!numericExamId || isNaN(numericExamId)) {
      setError("Invalid exam ID — please go back and try again.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    fetch(`${API_URL}/api/questions/${numericExamId}/coding?assignment_id=${assignmentId || ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`Server ${r.status}`); return r.json(); })
      .then(data => {
        if (data.error) throw new Error(data.error);
        const qs = data.questions || [];
        if (qs.length === 0) throw new Error("No coding questions found for this exam. Please contact your admin.");
        setQuestions(qs);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [numericExamId, assignmentId]); // ← Use numericExamId in deps

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

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = Object.values(answers).filter(v => v && v.trim().length > 0).length;
  const totalCount    = questions.length;

  function handleCodeChange(val) {
    setCode(val);
    if (questions[current]) {
      setAnswers(prev => ({ ...prev, [questions[current].id]: val }));
    }
  }

  // ── Submit Handler ─────────────────────────────────────────────────────
  async function handleSubmit() {
    clearInterval(timerRef.current);
    setShowConf(false);

    // Save current code to answers state
    if (questions[current]) {
      setAnswers(prev => ({ ...prev, [questions[current].id]: code }));
    }

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const studentId = localStorage.getItem('userId') || localStorage.getItem('candidateId');

    if (assignmentId && numericExamId && !isNaN(numericExamId)) {
      try {
        // ✅ Send integer exam_id to backend
        await fetch(`${API_URL}/api/questions/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            assignment_id: assignmentId,
            exam_id:       numericExamId, // ✅ INTEGER, not string
            code_answers:  answers,
            student_id:    studentId,     // Optional: for audit trail
          }),
        });
      } catch (err) {
        console.error("[CodeExam] Submission failed:", err);
        // Don't show error to student — submission is best-effort
      }
    }

    setSubmitted(true);
  }

  // Simple JS runner (browser sandbox)
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
      <p style={{ color: '#7aacba', marginTop: 12, fontSize: 14 }}>Loading coding problems…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={S.center}>
      <div style={{ background: '#1e1e2e', border: '1.5px solid #dc2626', borderRadius: 12, padding: '32px 40px', textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: '#f87171', marginBottom: 8, fontSize: 16 }}>Coding Round Error</h3>
        <p style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{error}</p>
        <button style={S.btn} onClick={() => onNavigate ? onNavigate("lobby") : navigate("/student-dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // ── Result / Submitted ────────────────────────────────────────────────────
  if (submitted) return (
    <div style={S.center}>
      <div style={S.resultCard}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Coding Round Complete!</h2>
        <p style={{ color: '#7aacba', marginBottom: 8, fontSize: 13 }}>
          {answeredCount} of {totalCount} problems attempted
        </p>
        <div style={{ background: '#0A2A41', border: '1px solid #2BB1A8', borderRadius: 8, padding: '12px 24px', margin: '16px 0', fontSize: 13, color: '#2BB1A8' }}>
          Solutions submitted — pending review
        </div>
        <div style={{ background: '#0d1f30', borderRadius: 10, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
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
          <div style={S.examTitle}>{examTitle} — Coding Round</div>
          <div style={S.subtitle}>
            Problem {current + 1} of {totalCount}
            {q?.platform && <span style={S.platform}>{q.platform}</span>}
          </div>
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
                <h4 style={S.sectionHead}>Problem</h4>
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
      ) : (
        <div style={S.center}>
          <p style={{ color: '#7aacba' }}>No coding problems available.</p>
        </div>
      )}

      {showConf && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={{ margin: '0 0 12px', color: '#0A2A41' }}>Submit All Solutions?</h3>
            <p style={{ color: '#3d6878', marginBottom: 20 }}>
              {answeredCount} of {totalCount} problems attempted.
              Coding answers will be reviewed manually.
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
  subtitle:       { fontSize: 12, color: '#7aacba', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 },
  platform:       { background: '#1e3a5f', color: '#7aacba', padding: '2px 8px', borderRadius: 4, fontSize: 11 },
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
  descText:       { fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 },
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