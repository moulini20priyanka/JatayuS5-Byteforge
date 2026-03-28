// frontend/src/pages/CodeExam.jsx
// Fetches randomized Coding questions from /api/questions/:examId/coding
// Shows problem description, starter code in editor, constraints

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExamQuestions } from '../hooks/useExamQuestions';

export default function CodeExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const examCtx   = location.state || {};

  const examId       = examCtx.exam_id       || examCtx.examId;
  const assignmentId = examCtx.assignment_id || examCtx.assignmentId;
  const examTitle    = examCtx.title         || 'Coding Exam';
  const durationMins = examCtx.duration      || 90;

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
  } = useExamQuestions({ examId, assignmentId, pageType: 'coding' });

  const [timeLeft,  setTimeLeft]  = useState(durationMins * 60);
  const [current,   setCurrent]   = useState(0);
  const [code,      setCode]      = useState('');
  const [showConf,  setShowConf]  = useState(false);
  const [output,    setOutput]    = useState('');
  const [running,   setRunning]   = useState(false);
  const timerRef = useRef(null);

  // Set starter code when question changes
  useEffect(() => {
    if (questions[current]) {
      const saved = answers[questions[current].id];
      setCode(saved || questions[current].starter_code || '// Write your solution here\n');
      setOutput('');
    }
  }, [current, questions]);

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

  function handleCodeChange(val) {
    setCode(val);
    // Auto-save code answer on every change (debounced by browser)
    if (questions[current]) {
      saveAnswer(questions[current].id, null, val);
    }
  }

  async function handleSubmit() {
    clearInterval(timerRef.current);
    setShowConf(false);
    // Save current code before submitting
    if (questions[current]) {
      await saveAnswer(questions[current].id, null, code);
    }
    try { await submitExam(); }
    catch (e) { alert('Submission failed: ' + e.message); }
  }

  // Simple JS runner for demo (runs in browser sandbox)
  async function runCode() {
    setRunning(true);
    setOutput('');
    try {
      // Capture console.log output
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

  if (loading) return (
    <div style={S.center}>
      <p style={{ color: '#3d6878' }}>Loading coding problems...</p>
    </div>
  );

  if (error) return (
    <div style={S.center}>
      <p style={{ color: '#e53e3e' }}>Error: {error}</p>
      <button style={S.btn} onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );

  if (submitted && result) {
    return (
      <div style={S.center}>
        <div style={S.resultCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h2 style={{ color: '#0A2A41' }}>Coding Exam Submitted</h2>
          <p style={{ color: '#3d6878', marginBottom: 16 }}>Your solutions have been submitted for evaluation.</p>
          <p style={{ color: '#7aacba', fontSize: 13 }}>{answeredCount} of {totalCount} problems attempted</p>
          <div style={{ background: '#f0fdfc', borderRadius: 8, padding: '12px 24px', margin: '16px 0', fontSize: 14, color: '#0a8f5c' }}>
            Results will be available after manual review
          </div>
          <button style={{ ...S.btn, marginTop: 8 }} onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
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
          <div style={S.examTitle}>{examTitle}</div>
          <div style={S.subtitle}>
            Problem {current + 1} of {totalCount}
            {q?.platform && <span style={S.platform}>{q.platform}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...S.timer, color: timeLeft < 600 ? '#e53e3e' : '#0A2A41' }}>⏱ {fmt(timeLeft)}</div>
          <button style={S.btnOutline} onClick={() => setShowConf(true)}>Submit All</button>
        </div>
      </div>

      {/* Problem tabs */}
      <div style={S.tabs}>
        {questions.map((p, idx) => (
          <button key={idx}
            style={{ ...S.tab, ...(current === idx ? S.tabActive : {}), ...(answers[p.id] ? S.tabDone : {}) }}
            onClick={() => setCurrent(idx)}>
            P{idx + 1}
          </button>
        ))}
      </div>

      {q ? (
        <div style={S.layout}>
          {/* Problem description */}
          <div style={S.problemPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={S.problemTitle}>{q.question_text}</h2>
              <span style={{ ...S.badge, ...diffBadge(q.difficulty) }}>{q.difficulty}</span>
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
                  {running ? 'Running...' : '▶ Run'}
                </button>
                <button style={S.saveBtn} onClick={() => saveAnswer(q.id, null, code)}>
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
          <p style={{ color: '#7aacba' }}>No coding problems found for this exam.</p>
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
  page:         { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A2A41' },
  center:       { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A2A41', gap: 16 },
  header:       { background: '#061929', color: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  examTitle:    { fontSize: 16, fontWeight: 700, color: '#fff' },
  subtitle:     { fontSize: 12, color: '#7aacba', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 },
  platform:     { background: '#1e3a5f', color: '#7aacba', padding: '2px 8px', borderRadius: 4, fontSize: 11 },
  timer:        { fontFamily: 'monospace', fontSize: 18, fontWeight: 700, background: '#0A2A41', padding: '5px 12px', borderRadius: 8 },
  tabs:         { display: 'flex', gap: 4, padding: '8px 24px', background: '#061929', borderBottom: '1px solid #1e3a5f', flexShrink: 0 },
  tab:          { padding: '6px 14px', borderRadius: 6, border: '1px solid #1e3a5f', background: 'transparent', color: '#7aacba', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tabActive:    { background: '#1e3a5f', color: '#fff', border: '1px solid #2BB1A8' },
  tabDone:      { borderColor: '#2BB1A8', color: '#2BB1A8' },
  layout:       { display: 'flex', flex: 1, overflow: 'hidden' },
  problemPanel: { width: 380, background: '#fff', padding: '24px 20px', overflowY: 'auto', flexShrink: 0 },
  problemTitle: { fontSize: 16, color: '#0A2A41', margin: 0, flex: 1 },
  badge:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', flexShrink: 0 },
  sectionHead:  { fontSize: 13, fontWeight: 700, color: '#3d6878', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 },
  descText:     { fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 },
  constraintsBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 },
  editorPanel:  { flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e2e', overflow: 'hidden' },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#161622', borderBottom: '1px solid #2d2d44' },
  editor:       { flex: 1, background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'monospace', fontSize: 14, border: 'none', outline: 'none', padding: '16px', resize: 'none', lineHeight: 1.6, tabSize: 2 },
  runBtn:       { padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2BB1A8', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  saveBtn:      { padding: '6px 14px', borderRadius: 6, border: '1px solid #3d6878', background: 'transparent', color: '#7aacba', cursor: 'pointer', fontSize: 13 },
  outputBox:    { background: '#11111b', borderTop: '1px solid #2d2d44', maxHeight: 160, overflow: 'auto', flexShrink: 0 },
  outputHead:   { fontSize: 12, color: '#7aacba', padding: '6px 16px 0', fontWeight: 600 },
  outputText:   { margin: 0, padding: '6px 16px 12px', color: '#a6e3a1', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' },
  btn:          { background: '#2BB1A8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnOutline:   { background: 'transparent', color: '#2BB1A8', border: '1.5px solid #2BB1A8', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:        { background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%' },
  resultCard:   { background: '#0A2A41', border: '1px solid #1e3a5f', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400, width: '90%', color: '#fff' },
};