// src/pages/ExamPage.jsx
// Student: full-screen timed exam with question navigation, auto-submit on timeout
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeader() {
  const t = localStorage.getItem('token') || localStorage.getItem('student_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function Timer({ totalSeconds, onExpire }) {
  const [left, setLeft] = useState(totalSeconds);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(ref.current); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, []);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pct = (left / totalSeconds) * 100;
  const urgent = left < 300; // < 5 min

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: urgent ? '#fef2f2' : '#f0fdf4',
      border: `1.5px solid ${urgent ? '#fca5a5' : '#bbf7d0'}`,
      borderRadius: 10, padding: '8px 16px',
    }}>
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none"
            stroke={urgent ? '#ef4444' : '#22c55e'} strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 15}`}
            strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: urgent ? '#dc2626' : '#16a34a', letterSpacing: '.5px' }}>
          {urgent ? '⚠ TIME RUNNING OUT' : 'TIME REMAINING'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: urgent ? '#dc2626' : '#1a1060', fontVariantNumeric: 'tabular-nums' }}>
          {h > 0 && `${String(h).padStart(2,'0')}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
        </div>
      </div>
    </div>
  );
}

// ── Option Button ─────────────────────────────────────────────────────────────
function OptionBtn({ label, text, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      width: '100%', padding: '14px 18px',
      border: `2px solid ${selected ? '#7055C8' : '#e2e8f0'}`,
      background: selected ? 'rgba(112,85,200,0.06)' : '#fff',
      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
      transition: 'all .15s', marginBottom: 10,
    }}>
      <span style={{
        minWidth: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? '#7055C8' : '#f1f5f9',
        color: selected ? '#fff' : '#64748b',
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>{label}</span>
      <span style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, paddingTop: 3 }}>{text}</span>
    </button>
  );
}

// ── Question Panel ─────────────────────────────────────────────────────────────
function QuestionPanel({ question, index, total, answer, onAnswer }) {
  const opts = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ].filter(o => o.text);

  const diffColor = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Question meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
            Q{index + 1} of {total}
          </span>
          <span style={{
            padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            color: diffColor[question.difficulty] || '#94a3b8',
            background: `${diffColor[question.difficulty] || '#94a3b8'}18`,
          }}>{question.difficulty?.toUpperCase() || 'MEDIUM'}</span>
          <span style={{
            padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: '#f0ecfc', color: '#7055C8',
          }}>{question.type?.toUpperCase()}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
            {question.marks || 1} mark{(question.marks || 1) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Question text */}
        <div style={{
          fontSize: 16, fontWeight: 600, color: '#1a1060',
          lineHeight: 1.7, marginBottom: 28,
          padding: '20px 24px',
          background: '#fafbff',
          border: '1px solid #e8e4f8',
          borderRadius: 12,
        }}>
          {question.question_text}
        </div>

        {/* Options */}
        {opts.map(opt => (
          <OptionBtn
            key={opt.key}
            label={opt.key}
            text={opt.text}
            selected={answer === opt.key}
            onClick={() => onAnswer(question.id, opt.key)}
          />
        ))}

        {opts.length === 0 && (
          <textarea
            placeholder="Type your answer here…"
            value={answer || ''}
            onChange={e => onAnswer(question.id, e.target.value)}
            style={{
              width: '100%', minHeight: 120, padding: '14px 18px',
              border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14,
              resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Main ExamPage ──────────────────────────────────────────────────────────────
export default function ExamPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Exam data passed from ExamVerify
  const examData = location.state?.examData;

  const [answers,   setAnswers]   = useState({});
  const [current,   setCurrent]   = useState(0);
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result,    setResult]    = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const questions = examData?.questions || [];
  const duration  = (examData?.duration || 60) * 60; // seconds

  useEffect(() => {
    if (!examData) navigate('/student-hiring');
  }, []);

  // Prevent back navigation during exam
  useEffect(() => {
    const handler = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const submitExam = useCallback(async (auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/exams/${examData.exam_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ answers, time_taken_seconds: duration }),
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
    } catch (err) {
      alert('Submission failed: ' + err.message);
      setSubmitting(false);
    }
  }, [answers, examData, submitting, submitted]);

  function setAnswer(qId, val) {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  }

  const answered   = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const q          = questions[current];

  // ── Result Screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    const pct    = result.percentage || 0;
    const passed = pct >= (examData?.cutoff_score || 40);
    return (
      <div style={{
        minHeight: '100vh', background: '#faf8ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 48,
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 8px 40px rgba(112,85,200,0.15)',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
            background: passed ? 'linear-gradient(135deg,#22c55e,#10b981)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            {passed ? '🎉' : '📝'}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1060', marginBottom: 8 }}>
            {passed ? 'Congratulations!' : 'Exam Submitted'}
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>
            {passed ? 'You passed the assessment!' : 'Keep practising — you can do it!'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
            {[
              ['Score',      `${result.score} / ${result.total_marks}`],
              ['Percentage', `${pct}%`],
              ['Answered',   `${answered} / ${questions.length}`],
              ['Result',     passed ? 'PASS ✓' : 'FAIL ✗'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: 16, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: passed ? '#059669' : '#dc2626' }}>{v}</div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/student-hiring')} style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'linear-gradient(135deg,#7055C8,#C060C0)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f8fafc', overflow: 'hidden',
    }}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1060' }}>{examData?.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {answered} of {questions.length} answered
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Timer totalSeconds={duration} onExpire={() => submitExam(true)} />
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowConfirm(true)} style={{
            padding: '9px 22px', borderRadius: 8,
            background: 'linear-gradient(135deg,#7055C8,#C060C0)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(112,85,200,0.3)',
          }}>Submit Exam</button>
        </div>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────────────── */}
      <div style={{ height: 3, background: '#f1f5f9', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg,#7055C8,#C060C0)',
          width: `${(answered / questions.length) * 100}%`,
          transition: 'width .3s',
        }} />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Question palette (left) */}
        <div style={{
          width: 240, background: '#fff', borderRight: '1px solid #f1f5f9',
          padding: '16px 12px', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
            Questions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {questions.map((qItem, i) => {
              const isAns  = !!answers[qItem.id];
              const isCur  = i === current;
              return (
                <button key={qItem.id} onClick={() => setCurrent(i)} style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: isCur ? '2px solid #7055C8' : '1.5px solid #e2e8f0',
                  background: isCur ? '#7055C8' : isAns ? '#d1fae5' : '#fff',
                  color: isCur ? '#fff' : isAns ? '#059669' : '#94a3b8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { color: '#7055C8', label: 'Current' },
              { color: '#d1fae5', label: 'Answered', textColor: '#059669' },
              { color: '#fff',    label: 'Not answered', border: true },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: item.color,
                  border: item.border ? '1.5px solid #e2e8f0' : 'none',
                }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Question content (center) */}
        <QuestionPanel
          question={q}
          index={current}
          total={questions.length}
          answer={answers[q.id]}
          onAnswer={setAnswer}
        />
      </div>

      {/* ── Bottom Nav ───────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderTop: '1px solid #e2e8f0',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <button disabled={current === 0} onClick={() => setCurrent(p => p - 1)} style={{
          padding: '8px 20px', border: '1.5px solid #e2e8f0',
          background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600,
          color: current === 0 ? '#d1d5db' : '#374151', cursor: current === 0 ? 'not-allowed' : 'pointer',
        }}>← Previous</button>

        <span style={{ fontSize: 13, color: '#94a3b8', margin: '0 auto' }}>
          {answered} answered · {unanswered} remaining
        </span>

        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(p => p + 1)} style={{
            padding: '8px 20px', border: '1.5px solid #7055C8',
            background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#7055C8', cursor: 'pointer',
          }}>Next →</button>
        ) : (
          <button onClick={() => setShowConfirm(true)} style={{
            padding: '8px 20px',
            background: 'linear-gradient(135deg,#7055C8,#C060C0)',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            color: '#fff', cursor: 'pointer',
          }}>Finish & Submit →</button>
        )}
      </div>

      {/* ── Submit Confirm Modal ──────────────────────────────────────────── */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1060', marginBottom: 8 }}>
              Submit Exam?
            </h3>
            {unanswered > 0 && (
              <p style={{ fontSize: 14, color: '#f59e0b', marginBottom: 8 }}>
                ⚠ You have {unanswered} unanswered question{unanswered !== 1 ? 's' : ''}.
              </p>
            )}
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              You answered {answered} of {questions.length} questions.<br/>
              Once submitted, you cannot change your answers.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: 11, border: '1.5px solid #e2e8f0',
                background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Go Back</button>
              <button onClick={() => { setShowConfirm(false); submitExam(false); }} disabled={submitting} style={{
                flex: 1, padding: 11,
                background: submitting ? '#a5f3c0' : 'linear-gradient(135deg,#7055C8,#C060C0)',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Submitting…' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
