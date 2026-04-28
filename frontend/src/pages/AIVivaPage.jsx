// frontend/src/pages/AIVivaPage.jsx
// STATIC: 2 viva questions displayed one by one.
// Student types/speaks answer. After both → shows completion screen → navigate("lobby").

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATIC_VIVA_QUESTIONS } from '../data/staticExamData';

export default function AIVivaPage({ examId, assignmentId, onNavigate, codingScore }) {
  const navigate  = useNavigate();
  const questions = STATIC_VIVA_QUESTIONS;

  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [text,      setText]      = useState('');

  const q = questions[current];

  function saveAndNext() {
    const updated = { ...answers, [q.id]: text };
    setAnswers(updated);
    setText('');
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
    } else {
      // All viva questions answered
      submitViva(updated);
    }
  }

  function submitViva(finalAnswers) {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (assignmentId) {
      fetch('http://localhost:5000/api/questions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, viva_answers: finalAnswers }),
      }).catch(() => {});
    }
    setSubmitted(true);
  }

  const goLobby = () => {
    if (onNavigate) onNavigate("lobby");
    else navigate("/student-dashboard");
  };

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎓</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#2BB1A8', fontFamily: 'monospace', marginBottom: 10 }}>
            ASSESSMENT COMPLETE
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0A2A41', margin: '0 0 12px' }}>
            All Rounds Finished!
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
            You have completed all four rounds of the assessment — MCQ, SQL, Coding, and AI Viva.
            Your responses have been recorded and will be reviewed.
          </p>

          {/* Round summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '📝', label: 'MCQ Round',    desc: '10 questions', color: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
              { icon: '🗄️', label: 'SQL Round',    desc: '5 queries',    color: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
              { icon: '💻', label: 'Coding Round', desc: '1 problem',    color: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
              { icon: '🎤', label: 'AI Viva',      desc: '2 questions',  color: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
            ].map(r => (
              <div key={r.label} style={{ background: r.color, border: `1px solid ${r.border}`, borderRadius: 10, padding: '12px 14px', textAlign: 'left' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.text }}>{r.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.desc} · Submitted ✓</div>
              </div>
            ))}
          </div>

          <button style={S.btn} onClick={goLobby}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>Round 4 — AI Viva</div>
          <div style={S.headerSub}>Question {current + 1} of {questions.length}</div>
        </div>
        <div style={S.roundBadge}>🎤 AI VIVA</div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: '#e2e8f0' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#2BB1A8,#4f46e5)', width: `${((current) / questions.length) * 100}%`, transition: 'width 0.5s' }} />
      </div>

      <div style={S.body}>
        <div style={S.questionCard}>
          {/* Topic badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdfc', border: '1px solid #99f6e4', borderRadius: 20, padding: '4px 12px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2BB1A8', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace', letterSpacing: 0.5 }}>{q.topic}</span>
          </div>

          <div style={S.qNum}>Q{current + 1} of {questions.length}</div>
          <h2 style={S.qText}>{q.question}</h2>

          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
              YOUR ANSWER
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              placeholder="Type your answer here..."
              style={S.textarea}
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {text.length} characters · Speak clearly and concisely
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < current ? '#2BB1A8' : i === current ? '#4f46e5' : '#e2e8f0' }} />
              ))}
            </div>
            <button
              style={{ ...S.btn, opacity: text.trim().length < 5 ? 0.5 : 1 }}
              disabled={text.trim().length < 5}
              onClick={saveAndNext}>
              {current + 1 < questions.length ? 'Next Question →' : 'Submit Viva →'}
            </button>
          </div>
        </div>

        {/* Info panel */}
        <div style={S.infoPanel}>
          <div style={S.infoTitle}>💡 Viva Tips</div>
          <div style={S.infoItem}>Explain your reasoning, not just the answer.</div>
          <div style={S.infoItem}>Mention trade-offs and alternatives where relevant.</div>
          <div style={S.infoItem}>Use examples to demonstrate understanding.</div>
          <div style={S.infoItem}>Keep your answer focused and structured.</div>

          <div style={{ marginTop: 24, padding: '12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>ROUNDS COMPLETED</div>
            {[
              { label: 'MCQ (HTML/CSS/JS)', done: true  },
              { label: 'SQL Queries',       done: true  },
              { label: 'Coding Problem',    done: true  },
              { label: 'AI Viva',           done: false },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: r.done ? '#059669' : '#6366f1', fontWeight: r.done ? 600 : 400, marginBottom: 4 }}>
                <span>{r.done ? '✓' : '●'}</span> {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:        { minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' },
  header:      { background: '#0A2A41', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#fff' },
  headerSub:   { fontSize: 12, color: '#7aacba', marginTop: 2 },
  roundBadge:  { background: 'rgba(43,177,168,0.15)', border: '1px solid #2BB1A8', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#2BB1A8', fontFamily: 'monospace', letterSpacing: 0.5 },
  body:        { display: 'flex', gap: 24, padding: '32px', maxWidth: 1100, margin: '0 auto', width: '100%', flex: 1 },
  questionCard:{ flex: 1, background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  qNum:        { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, fontFamily: 'monospace', marginBottom: 8 },
  qText:       { fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.5, margin: 0 },
  textarea:    { width: '100%', padding: '14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  infoPanel:   { width: 260, flexShrink: 0 },
  infoTitle:   { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 },
  infoItem:    { fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 8, paddingLeft: 14, position: 'relative' },
  btn:         { background: 'linear-gradient(135deg,#2BB1A8,#0f766e)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'opacity 0.15s' },
  card:        { background: '#fff', borderRadius: 16, padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 520, width: '90%', margin: 'auto' },
};