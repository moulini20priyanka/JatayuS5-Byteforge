// pages/Reports.jsx
// FIXED:
//  1. Fetches /api/admin/university-exam/:id/report which now returns mcqBreakdown + writtenBreakdown
//  2. ReportModal correctly reads and displays MCQ breakdown + Theory breakdown
//  3. Type filtering works correctly
//  4. Theme matches Question Bank page (white/light gray, clean table)
//  5. Only exams with assigned students shown

import React, { useState, useEffect, useCallback } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';

/* ─── Theme (Question Bank style) ───────────────────────────────── */
const T = {
  pageBg:     '#f4f8fb',
  white:      '#ffffff',
  border:     '#e8edf2',
  shadow:     '0 1px 4px rgba(0,0,0,0.06)',
  navy:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  dim:        '#94a3b8',
  accent:     '#2563eb',
  accentSoft: '#eff6ff',
  green:      '#16a34a',
  greenBg:    '#f0fdf4',
  greenBdr:   '#bbf7d0',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  orange:     '#ea580c',
  orangeBg:   '#fff7ed',
  purple:     '#7c3aed',
  purpleBg:   '#f5f3ff',
  blue:       '#2563eb',
  blueBg:     '#eff6ff',
};

const getToken = () => localStorage.getItem('token') || '';

function safeJSON(v, fb = {}) {
  if (!v) return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

function kwScore(answer = '', kwStr = '', max = 8) {
  if (!answer || !kwStr) return { score: 0, pct: 0, matched: [], missing: [] };
  const kws = kwStr.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const low = answer.toLowerCase();
  const matched = [], missing = [];
  for (const kw of kws) {
    const parts = kw.replace(/[()]/g, '').split(/[,\s/]+/).filter(w => w.length > 2);
    parts.some(p => low.includes(p)) ? matched.push(kw) : missing.push(kw);
  }
  const pct   = kws.length ? Math.round(matched.length / kws.length * 100) : 0;
  const score = kws.length ? Math.round(matched.length / kws.length * max * 2) / 2 : 0;
  return { score, pct, matched, missing };
}

async function gradeWithClaude(questionText, answer, keywords, maxMarks) {
  const prompt = `You are a strict university exam evaluator.\n\nQuestion: ${questionText}\nExpected keywords: ${keywords}\nStudent answer: ${answer}\nMax marks: ${maxMarks}\n\nReturn ONLY valid JSON:\n{"score":<0-${maxMarks}>,"percentage":<0-100>,"feedback":"<2-3 sentences>","strengths":["..."],"improvements":["..."],"keywordsCovered":["..."],"keywordsMissed":["..."]}`;
  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

/* ── Atoms ───────────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const map = {
    placement:    { label: 'Placement',    color: '#6d28d9', bg: '#ede9fe' },
    hiring:       { label: 'Hiring',       color: '#6d28d9', bg: '#ede9fe' },
    university:   { label: 'University',   color: '#0369a1', bg: '#e0f2fe' },
    skill_cert:   { label: 'Certification',color: '#c2410c', bg: '#ffedd5' },
    certification:{ label: 'Certification',color: '#c2410c', bg: '#ffedd5' },
  };
  const s = map[type] || { label: type || 'Exam', color: T.muted, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function KwChip({ text, matched }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 20, fontSize: 10.5,
      fontWeight: 600, margin: 2,
      background: matched ? T.greenBg : T.redBg,
      color:      matched ? T.green   : T.red,
      border: `1px solid ${matched ? T.greenBdr : '#fecaca'}`,
    }}>
      {matched ? '✓' : '✕'} {text}
    </span>
  );
}

function ScoreRing({ score, max = 100, size = 48 }) {
  const pct  = Math.min((score || 0) / max * 100, 100);
  const c    = pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red;
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = pct / 100 * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={T.navy} fontSize="11" fontWeight="700">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

/* ═══ THEORY CARD ═══════════════════════════════════════════════ */
function TheoryCard({ item, assignmentId, idx, onSave }) {
  const [ai,      setAi]      = useState(null);
  const [grading, setGrading] = useState(false);
  const [score,   setScore]   = useState(item.facultyScore ?? item.autoScore ?? 0);
  const [note,    setNote]    = useState(item.facultyComment ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState('');
  const [showAns, setShowAns] = useState(true); // open by default

  const max       = item.maxScore || item.marks || 8;
  const hasAns    = !!item.studentAnswer?.trim();
  const kw        = kwScore(item.studentAnswer || '', item.keywords || '', max);
  const matched   = ai?.keywordsCovered ?? kw.matched;
  const missing   = ai?.keywordsMissed  ?? kw.missing;
  const pct       = ai?.percentage      ?? kw.pct;
  const dispScore = item.facultyScore ?? (ai?.score ?? item.autoScore ?? 0);
  const srcLabel  = item.facultyScore != null ? 'FACULTY' : ai ? 'CLAUDE AI' : 'AUTO';
  const srcColor  = item.facultyScore != null ? T.purple  : ai ? T.blue      : T.dim;

  const handleGrade = async () => {
    if (!hasAns) return;
    setGrading(true); setErr('');
    const r = await gradeWithClaude(item.questionText, item.studentAnswer, item.keywords, max);
    if (r && typeof r.score === 'number') {
      setAi(r);
      if (item.facultyScore == null) setScore(r.score);
    } else {
      setErr('AI grading failed — score manually.');
    }
    setGrading(false);
  };

  const handleSave = async () => {
    const v = parseFloat(score);
    if (isNaN(v) || v < 0 || v > max) return;
    setSaving(true);
    await onSave(assignmentId, item.questionId, v, note);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14, background: T.white }}>
      {/* Header */}
      <div style={{
        padding: '13px 16px', background: '#f8fafc',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.dim,
              background: T.accentSoft, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px',
            }}>Q{idx + 1}</span>
            <span style={{ fontSize: 10, color: T.muted }}>{max} marks</span>
            {item.facultyScore != null && (
              <span style={{ fontSize: 10, background: T.greenBg, color: T.green, borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                Reviewed
              </span>
            )}
            {!hasAns && (
              <span style={{ fontSize: 10, background: T.redBg, color: T.red, borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                No Answer
              </span>
            )}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, lineHeight: 1.6 }}>{item.questionText}</div>
          {item.keywords && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: T.dim }}>KEYWORDS:</span>
              {item.keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                <span key={i} style={{
                  fontSize: 10, background: T.blueBg, border: '1px solid #bfdbfe',
                  borderRadius: 20, padding: '1px 8px', color: T.blue, fontFamily: 'monospace',
                }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: srcColor, lineHeight: 1 }}>
            {dispScore}<span style={{ fontSize: 11, fontWeight: 400, color: T.dim }}>/{max}</span>
          </div>
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700, marginTop: 3,
            fontFamily: 'monospace', display: 'inline-block',
            background: item.facultyScore != null ? T.purpleBg : ai ? T.blueBg : '#f1f5f9',
            color: srcColor,
          }}>{srcLabel}</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Student answer */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowAns(v => !v)}
            style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 7,
              padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: T.muted,
              cursor: 'pointer', marginBottom: showAns ? 9 : 0,
            }}
          >
            {showAns ? 'Hide' : 'Show'} Student Answer
          </button>
          {showAns && (
            <div style={{
              fontSize: 13, color: '#334155', lineHeight: 1.8,
              background: hasAns ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${hasAns ? T.greenBdr : '#fecaca'}`,
              padding: '12px 14px', borderRadius: 9,
              maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {hasAns
                ? item.studentAnswer.trim()
                : <em style={{ color: T.red }}>No answer submitted by this student</em>}
            </div>
          )}
        </div>

        {/* Word count */}
        {hasAns && (
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 12 }}>
            Word count: <strong style={{ color: T.text }}>{item.wordCount || item.studentAnswer?.trim().split(/\s+/).filter(Boolean).length || 0}</strong>
            {item.wordCount < 10 && <span style={{ color: T.orange }}> (very short answer)</span>}
          </div>
        )}

        {/* Keyword coverage */}
        {item.keywords && hasAns && (
          <div style={{ marginBottom: 12, padding: '11px 13px', background: '#fafbff', border: `1px solid ${T.border}`, borderRadius: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9.5, color: T.dim, fontFamily: 'monospace', fontWeight: 700 }}>KEYWORD COVERAGE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 72, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99, transition: 'width .5s',
                    background: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 10, color: T.dim }}>({matched.length}/{matched.length + missing.length} keywords)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {matched.map(k => <KwChip key={k} text={k} matched={true} />)}
              {missing.map(k => <KwChip key={k} text={k} matched={false} />)}
            </div>
          </div>
        )}

        {/* AI result */}
        {ai && (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #bfdbfe' }}>
            <div style={{ padding: '9px 14px', background: T.blueBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: T.blue }}>CLAUDE AI EVALUATION</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: T.blue, fontFamily: 'monospace' }}>
                {ai.score}<span style={{ fontSize: 11, fontWeight: 400, color: T.dim }}>/{max}</span>
              </span>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.7, margin: '0 0 9px' }}>{ai.feedback}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ai.strengths?.length > 0 && (
                  <div style={{ padding: '8px 11px', background: T.greenBg, border: `1px solid ${T.greenBdr}`, borderRadius: 7 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.green, marginBottom: 5, fontFamily: 'monospace' }}>STRENGTHS</div>
                    {ai.strengths.map((s, i) => <div key={i} style={{ fontSize: 11.5, color: '#166534', marginBottom: 2 }}>• {s}</div>)}
                  </div>
                )}
                {ai.improvements?.length > 0 && (
                  <div style={{ padding: '8px 11px', background: T.orangeBg, border: '1px solid #fed7aa', borderRadius: 7 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.orange, marginBottom: 5, fontFamily: 'monospace' }}>MISSING</div>
                    {ai.improvements.map((s, i) => <div key={i} style={{ fontSize: 11.5, color: '#9a3412', marginBottom: 2 }}>• {s}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginBottom: 9, padding: '7px 11px', background: T.redBg, border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: T.red }}>
            {err}
          </div>
        )}


        {/* Faculty override */}
        <div style={{
          padding: 14, background: '#fafbff',
          border: `1.5px solid ${saved ? T.greenBdr : T.border}`,
          borderRadius: 10, transition: 'border-color .3s',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, fontFamily: 'monospace', letterSpacing: .5, marginBottom: 10 }}>
            FACULTY REVIEW — SCORE OVERRIDE
            {item.facultyScore != null && (
              <span style={{ marginLeft: 7, color: T.purple }}> · Previously saved: {item.facultyScore}/{max}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input
              type="range" min={0} max={max} step={0.5} value={score}
              onChange={e => setScore(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: T.purple, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button onClick={() => setScore(s => Math.max(0, parseFloat((s - .5).toFixed(1))))}
                style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: T.navy }}>−</button>
              <input
                type="number" min={0} max={max} step={0.5} value={score}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v <= max) setScore(v); }}
                style={{ width: 54, padding: '4px 2px', border: `1.5px solid ${T.purple}`, borderRadius: 7, fontSize: 16, fontFamily: 'monospace', fontWeight: 800, textAlign: 'center', outline: 'none', color: T.navy }}
              />
              <button onClick={() => setScore(s => Math.min(max, parseFloat((s + .5).toFixed(1))))}
                style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: T.navy }}>+</button>
              <span style={{ fontSize: 11, color: T.dim }}>/{max}</span>
            </div>
          </div>
          {ai && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>Apply AI score:</span>
              {[ai.score, Math.max(0, +(ai.score - .5).toFixed(1)), Math.min(max, +(ai.score + .5).toFixed(1))]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map(v => (
                  <button key={v} onClick={() => setScore(v)} style={{
                    padding: '3px 10px', borderRadius: 20,
                    border: `1px solid ${T.blue}`,
                    background: score === v ? T.blue : T.white,
                    color: score === v ? '#fff' : T.blue,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>{v}</button>
                ))}
            </div>
          )}
          <input
            type="text" placeholder="Faculty comment (optional)"
            value={note} onChange={e => setNote(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', border: `1px solid ${T.border}`,
              borderRadius: 7, fontSize: 12, outline: 'none', marginBottom: 9,
              fontFamily: 'inherit', color: T.text, background: T.white, boxSizing: 'border-box',
            }}
          />
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '9px', borderRadius: 8, border: 'none',
            cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
            background: saved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
            boxShadow: saved ? '0 2px 8px rgba(22,163,74,.25)' : '0 2px 8px rgba(124,58,237,.25)',
          }}>
            {saving ? 'Saving...' : saved ? 'Score Saved' : `Save Score — ${score}/${max}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ REPORT MODAL ══════════════════════════════════════════════ */
function ReportModal({ exam, studentRow, onClose, onRefresh }) {
  const [tab, setTab] = useState('mcq');

  // studentRow comes from the report endpoint which now includes mcqBreakdown & writtenBreakdown
  const mcqBreakdown     = studentRow.mcqBreakdown     || [];
  const writtenBreakdown = studentRow.writtenBreakdown  || [];

  const mcqScore    = studentRow.mcqScore    ?? 0;
  const theoryScore = studentRow.writtenScore ?? 0;
  const totalScore  = studentRow.totalScore  ?? (mcqScore + theoryScore);
  const totalMarks  = exam.total_marks || 100;
  const pct         = totalMarks ? Math.round(totalScore / totalMarks * 100) : 0;
  const passMark    = exam.pass_mark || 40;
  const name        = studentRow.studentName || 'Student';

  // Normalise MCQ items
  const mcqItems = mcqBreakdown.map(m => ({
    questionText: m.questionText || m.question_text || '',
    selected:     (m.studentAnswer || m.student_answer || '').toUpperCase(),
    correct:      (m.correctAnswer  || m.correct_answer  || '').toUpperCase(),
    isCorrect:    !!(m.isCorrect || m.is_correct),
    marks:        m.marks || 0,
  }));

  // Normalise Theory items — extract keywords from matchedKeywords + missingKeywords
  const theoryItems = writtenBreakdown.map(w => {
    const allKws = [
      ...(w.matchedKeywords || []),
      ...(w.missingKeywords || []),
    ];
    return {
      questionId:    w.questionId   || w.question_id,
      questionText:  w.questionText || w.question_text || '',
      keywords:      allKws.length ? allKws.join(', ') : (w.keywords || ''),
      maxScore:      w.maxScore || w.marks || 8,
      studentAnswer: w.studentAnswer || w.student_answer || '',
      wordCount:     w.wordCount || 0,
      autoScore:     w.autoScore ?? w.auto_score ?? 0,
      facultyScore:  w.facultyScore ?? w.faculty_score ?? null,
      facultyComment:w.facultyComment || w.faculty_comment || '',
      facultyReviewed: w.facultyScore != null || w.faculty_score != null,
      matchedKeywords: w.matchedKeywords || [],
      missingKeywords: w.missingKeywords || [],
      percentage:    w.percentage || 0,
    };
  });

  const pending = theoryItems.filter(w => !w.facultyReviewed).length;

  // Faculty review save
  const handleSave = async (aId, qId, score, comment) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
    await fetch(`${API}/admin/university-exam/review-written`, {
      method: 'POST', headers,
      body: JSON.stringify({ assignmentId: aId, questionId: qId, facultyScore: score, facultyComment: comment }),
    }).catch(() => null);
    if (onRefresh) onRefresh();
  };

  const mcqCorrect = mcqItems.filter(m => m.isCorrect).length;
  const avgKwPct   = theoryItems.length
    ? Math.round(theoryItems.reduce((s, w) => s + kwScore(w.studentAnswer, w.keywords, w.maxScore).pct, 0) / theoryItems.length)
    : 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: T.pageBg, borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '15px 22px', background: T.white, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: T.accentSoft, border: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
            {name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{name}</div>
            <div style={{ fontSize: 11, color: T.dim }}>{studentRow.studentEmail || ''}</div>
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 1 }}>{exam.title}</div>
          </div>
          {/* Score chips */}
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '7px 12px', background: T.blueBg, borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.blue }}>{Math.round(mcqScore * 10) / 10}</div>
              <div style={{ fontSize: 8.5, color: T.dim, fontFamily: 'monospace' }}>MCQ</div>
            </div>
            {theoryItems.length > 0 && (
              <div style={{ textAlign: 'center', padding: '7px 12px', background: T.purpleBg, borderRadius: 8, border: '1px solid #ddd6fe', position: 'relative' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.purple }}>{Math.round(theoryScore * 10) / 10}</div>
                <div style={{ fontSize: 8.5, color: T.dim, fontFamily: 'monospace' }}>THEORY</div>
                {pending > 0 && <div style={{ fontSize: 8, color: T.orange, position: 'absolute', top: 2, right: 4 }}>{pending} pending</div>}
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <ScoreRing score={totalScore} max={totalMarks} size={48} />
              <div style={{ fontSize: 8.5, color: T.dim, marginTop: 1 }}>/{totalMarks}</div>
            </div>
            <div style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: pct >= passMark ? T.greenBg : T.redBg, color: pct >= passMark ? T.green : T.red }}>
              {pct >= passMark ? 'PASS' : 'FAIL'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 15, color: T.muted, flexShrink: 0 }}>×</button>
        </div>

        {/* AI summary */}
        <div style={{ padding: '9px 22px', background: 'linear-gradient(90deg,#f0f9ff,#f8faff)', borderBottom: `1px solid ${T.border}`, flexShrink: 0, fontSize: 12, color: T.text }}>
          <strong style={{ color: T.accent }}>AI Performance Summary</strong>
          {' — '}
          Score <strong style={{ color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red }}>{Math.round(totalScore * 10) / 10}/{totalMarks} ({pct}%)</strong>
          {mcqItems.length > 0 && <>{' · MCQ: '}<strong style={{ color: T.blue }}>{mcqCorrect}/{mcqItems.length} correct</strong></>}
          {theoryItems.length > 0 && <>{' · Theory keyword match: '}<strong style={{ color: T.purple }}>{avgKwPct}%</strong></>}
          {theoryItems.length > 0 && (
            pending > 0
              ? <span style={{ color: T.orange }}> · {pending} answer{pending > 1 ? 's' : ''} pending faculty review</span>
              : <span style={{ color: T.green }}> · All theory reviewed</span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: T.white, borderBottom: `1px solid ${T.border}`, paddingLeft: 14, flexShrink: 0 }}>
          {[
            { id: 'mcq',    label: `MCQ Section (${mcqItems.length} questions)` },
            { id: 'theory', label: `Theory Section (${theoryItems.length})${pending > 0 ? ` · ${pending} pending` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: 12,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? T.accent : T.muted,
              borderBottom: tab === t.id ? `2px solid ${T.accent}` : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* ── MCQ TAB ── */}
          {tab === 'mcq' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Correct',   val: mcqCorrect,                 c: T.green, bg: T.greenBg },
                  { label: 'Wrong',     val: mcqItems.length - mcqCorrect, c: T.red,   bg: T.redBg   },
                  { label: 'MCQ Score', val: Math.round(mcqScore * 10) / 10, c: T.blue,  bg: T.blueBg  },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px 14px', background: s.bg, borderRadius: 10, border: `1px solid ${s.c}22` }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.val}</div>
                    <div style={{ fontSize: 9.5, color: T.dim, fontFamily: 'monospace', marginTop: 2 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {mcqItems.length === 0 ? (
                <div style={{ padding: '50px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>—</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5 }}>No MCQ data recorded</div>
                  <div style={{ fontSize: 12, color: T.dim }}>MCQ answers were not saved for this submission, or this exam has no MCQ section.</div>
                </div>
              ) : (
                mcqItems.map((m, i) => (
                  <div key={i} style={{
                    border: `1px solid ${m.isCorrect ? T.greenBdr : '#fecaca'}`,
                    borderRadius: 10, padding: '13px 15px', marginBottom: 8,
                    background: m.isCorrect ? T.greenBg : T.redBg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: T.dim, marginBottom: 5 }}>Q{i + 1}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.55, marginBottom: 7 }}>{m.questionText}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>
                          Selected: <strong style={{ color: m.isCorrect ? T.green : T.red }}>{m.selected || '—'}</strong>
                          {!m.isCorrect && m.correct && <> · Correct: <strong style={{ color: T.green }}>{m.correct}</strong></>}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, flexShrink: 0, fontWeight: 700, color: m.isCorrect ? T.green : T.red }}>
                        {m.isCorrect ? '✓' : '✕'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── THEORY TAB ── */}
          {tab === 'theory' && (
            <div>
              {pending > 0 && (
                <div style={{ padding: '9px 14px', background: T.orangeBg, border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12, color: T.orange, marginBottom: 14 }}>
                  {pending} theory answer{pending > 1 ? 's' : ''} pending faculty review. Grade and save each to finalise scores.
                </div>
              )}
              {theoryItems.length === 0 ? (
                <div style={{ padding: '50px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>—</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5 }}>No Theory data recorded</div>
                  <div style={{ fontSize: 12, color: T.dim }}>Theory answers were not saved, or this exam has no theory section.</div>
                </div>
              ) : (
                theoryItems.map((item, qi) => (
                  <TheoryCard
                    key={item.questionId || qi}
                    item={item}
                    assignmentId={studentRow.assignment_id}
                    idx={qi}
                    onSave={handleSave}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ STUDENT LIST ══════════════════════════════════════════════ */
function StudentListView({ exam, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const isUniv = exam.exam_type === 'university';

  const load = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };

    if (isUniv) {
      const res = await fetch(`${API}/admin/university-exam/${exam.id}/report`, { headers }).catch(() => null);
      if (res && res.ok) {
        const d = await res.json();
        setStudents(d.students || []);
        setLoading(false);
        return;
      }
    }

    // Fallback for non-university exams
    const res = await fetch(`${API}/exams/${exam.id}/students`, { headers }).catch(() => null);
    if (res && res.ok) {
      const d = await res.json();
      setStudents((d.students || []).map(s => ({
        assignment_id: s.assignment_id || s.exam_key,
        studentId:     s.student_id,
        studentName:   s.name,
        studentEmail:  s.email,
        status:        s.status,
        totalScore:    s.score,
        mcqScore:      null,
        writtenScore:  null,
        mcqBreakdown:     [],
        writtenBreakdown: [],
      })));
    }
    setLoading(false);
  }, [exam, isUniv]);

  useEffect(() => { load(); }, [load]);

  const passMark   = exam.pass_mark || 40;
  const totalMarks = exam.total_marks || 100;

  const filtered = students.filter(s => {
    if (!search) return true;
    const name  = (s.studentName || '').toLowerCase();
    const email = (s.studentEmail || '').toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Status', 'MCQ', 'Theory', 'Total', '%', 'Result'],
      ...filtered.map(s => {
        const pct = s.percentage ?? (s.totalScore != null ? Math.round(s.totalScore / totalMarks * 100) : null);
        return [
          s.studentName, s.studentEmail, s.status,
          s.mcqScore ?? '—', s.writtenScore ?? '—', s.totalScore ?? '—',
          pct != null ? `${pct}%` : '—',
          s.passed ? 'PASS' : s.passed === false ? 'FAIL' : '—',
        ];
      }),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    a.download = `${exam.title}_report.csv`;
    a.click();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button onClick={onBack} style={{ padding: '7px 16px', background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>
          Back to Reports
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>{exam.title}</span>
            <TypeBadge type={exam.exam_type} />
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>
            {[exam.subject_name, exam.college, exam.batch_year ? `Batch ${exam.batch_year}` : null].filter(Boolean).join(' · ')}
            {' · '}<span style={{ color: T.purple, fontWeight: 700 }}>Max {totalMarks} marks · Pass: {passMark}</span>
          </div>
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Assigned', val: students.length, color: T.accent },
          { label: 'Completed', val: students.filter(s => s.status === 'submitted' || s.status === 'completed').length, color: T.green },
          { label: 'Not Started', val: students.filter(s => s.status === 'assigned').length, color: T.orange },
          { label: 'Pass Mark', val: `${passMark}/${totalMarks}`, color: T.purple },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`, textAlign: 'center', boxShadow: T.shadow }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 9.5, color: T.dim, fontFamily: 'monospace', marginTop: 3 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 300 }}>
            <svg width="13" height="13" fill="none" stroke={T.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
              style={{ border: 'none', outline: 'none', fontSize: 12, color: T.text, background: 'transparent', width: '100%' }} />
          </div>
          <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.muted }}>Loading students...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.dim }}>No students found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                  {['#', 'Student', 'Status', 'MCQ', ...(isUniv ? ['Theory'] : []), 'Total', '%', 'Result', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const isDone = s.status === 'submitted' || s.status === 'completed';
                  const pct    = s.percentage ?? (s.totalScore != null ? Math.round(s.totalScore / totalMarks * 100) : null);
                  const passed = s.passed ?? (pct != null ? pct >= passMark : null);
                  const barC   = pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red;
                  return (
                    <tr key={s.assignment_id || i}
                      style={{ borderBottom: `1px solid ${T.border}`, transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 14px', color: T.dim, fontFamily: 'monospace', fontSize: 11 }}>
                        {isDone ? (
                          <div style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i === 0 ? '#fbbf24' : i < 3 ? '#fcd9bd' : '#f1f5f9', color: i < 3 ? '#78350f' : T.dim }}>{i + 1}</div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <div style={{ fontWeight: 700, color: T.navy }}>{s.studentName || '—'}</div>
                        <div style={{ fontSize: 11, color: T.dim }}>{s.studentEmail}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: isDone ? T.greenBg : s.status === 'started' ? T.orangeBg : '#f1f5f9', color: isDone ? T.green : s.status === 'started' ? T.orange : T.muted }}>
                          {isDone ? 'Completed' : s.status === 'started' ? 'In Progress' : 'Not Started'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: T.blue }}>
                        {s.mcqScore != null ? s.mcqScore : '—'}
                      </td>
                      {isUniv && (
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: T.purple }}>
                          {s.writtenScore != null ? s.writtenScore : '—'}
                        </td>
                      )}
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: pct != null ? barC : T.dim }}>
                        {s.totalScore != null ? s.totalScore : '—'}
                        {s.totalScore != null && <span style={{ fontSize: 10, color: T.dim }}>/{totalMarks}</span>}
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 110 }}>
                        {pct != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: barC, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: barC, fontFamily: 'monospace' }}>{pct}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {passed === true  && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: T.greenBg, color: T.green }}>PASS</span>}
                        {passed === false && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: T.redBg, color: T.red }}>FAIL</span>}
                        {passed == null   && '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isDone ? (
                          <button
                            onClick={() => setSelected(s)}
                            style={{ padding: '5px 13px', background: T.accentSoft, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .14s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
                          >
                            View Report
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ReportModal exam={exam} studentRow={selected} onClose={() => setSelected(null)} onRefresh={load} />
      )}
    </div>
  );
}

/* ═══ MAIN PAGE ═════════════════════════════════════════════════ */
export default function Reports() {
  const [allExams,     setAllExams]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [search,       setSearch]       = useState('');
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/exams`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { exams: [] })
      .then(d => { setAllExams(d.exams || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const normType = t => {
    if (!t) return 'placement';
    const m = {
      placement:'placement', hiring:'placement', general:'placement',
      corporate:'placement', recruitment:'placement',
      university:'university', academic:'university',
      skill_cert:'skill_cert', certification:'skill_cert', certificate:'skill_cert',
    };
    return m[t.toLowerCase()] || 'placement';
  };

  const withStudents = allExams.filter(e => (e.student_count || 0) > 0);

  const filtered = withStudents.filter(e => {
    if (typeFilter !== 'all' && normType(e.exam_type) !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.title || '').toLowerCase().includes(q) ||
             (e.college || '').toLowerCase().includes(q) ||
             (e.subject_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const summary = {
    total:   withStudents.length,
    hiring:  withStudents.filter(e => normType(e.exam_type) === 'placement').length,
    univ:    withStudents.filter(e => normType(e.exam_type) === 'university').length,
    cert:    withStudents.filter(e => normType(e.exam_type) === 'skill_cert').length,
  };

  const TABS = [
    { id: 'all',        label: `All`,           count: summary.total   },
    { id: 'placement',  label: 'Hiring',         count: summary.hiring  },
    { id: 'university', label: 'University',     count: summary.univ    },
    { id: 'skill_cert', label: 'Certification',  count: summary.cert    },
  ];

  const tabColors = { all: T.accent, placement: '#6d28d9', university: '#0369a1', skill_cert: '#c2410c' };

  if (selectedExam) {
    return (
      <div style={{ marginLeft: 230, minHeight: '100vh', background: T.pageBg, fontFamily: "'Inter',sans-serif" }}>
        <style>{css}</style>
        <Sidebar /><Navbar />
        <main style={{ padding: '28px 32px' }}>
          <StudentListView exam={selectedExam} onBack={() => setSelectedExam(null)} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: 230, minHeight: '100vh', background: T.pageBg, fontFamily: "'Inter',sans-serif" }}>
      <style>{css}</style>
      <Sidebar /><Navbar />
      <main style={{ padding: '28px 32px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Reports</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: T.muted }}>
            {loading ? 'Loading...' : `${withStudents.length} exam${withStudents.length !== 1 ? 's' : ''} with assigned students`}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 26 }}>
          {[
            { label: 'Total Exams',   val: summary.total,  color: T.accent   },
            { label: 'Hiring',        val: summary.hiring, color: '#6d28d9'  },
            { label: 'University',    val: summary.univ,   color: '#0369a1'  },
            { label: 'Certification', val: summary.cert,   color: '#c2410c'  },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: T.white, borderRadius: 12, padding: '16px 20px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`, boxShadow: T.shadow }}>
              <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 7 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.navy }}>{loading ? '—' : val}</div>
            </div>
          ))}
        </div>

        {/* Type tabs — Question Bank style */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 0, borderBottom: `1px solid ${T.border}` }}>
          {TABS.map(t => {
            const active = typeFilter === t.id;
            const c = tabColors[t.id];
            return (
              <button key={t.id} onClick={() => setTypeFilter(t.id)} style={{
                padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? c : T.muted,
                borderBottom: active ? `2px solid ${c}` : '2px solid transparent',
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {t.label}
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: active ? c + '18' : '#f1f5f9', color: active ? c : T.dim }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', boxShadow: T.shadow, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 13px', flex: 1, maxWidth: 400 }}>
              <svg width="14" height="14" fill="none" stroke={T.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exam name, college..."
                style={{ border: 'none', outline: 'none', fontSize: 13, color: T.text, background: 'transparent', width: '100%' }} />
            </div>
            <span style={{ fontSize: 12, color: T.dim, fontFamily: 'monospace' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div style={{ padding: 80, textAlign: 'center', color: T.muted }}>Loading exams...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center', color: T.dim }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5 }}>No exams found</div>
              <div style={{ fontSize: 12 }}>No exams with assigned students match this filter.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                    {['Exam Name', 'Type', 'College / Batch', 'Students', 'Questions', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exam => {
                    const isDone = exam.status === 'completed';
                    const isLive = exam.status === 'scheduled' || exam.status === 'active';
                    return (
                      <tr key={exam.id} className="rep-row" onClick={() => setSelectedExam(exam)} style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontWeight: 700, color: T.navy }}>{exam.title}</div>
                          {exam.subject_name && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{exam.subject_name}</div>}
                        </td>
                        <td style={{ padding: '13px 16px' }}><TypeBadge type={exam.exam_type} /></td>
                        <td style={{ padding: '13px 16px', color: T.muted, fontSize: 12 }}>
                          <div>{exam.college || '—'}</div>
                          {exam.batch_year && <div style={{ fontSize: 11, color: T.dim }}>Batch {exam.batch_year}</div>}
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: 800, color: T.accent, fontSize: 16 }}>{exam.student_count || 0}</td>
                        <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0891b2', fontSize: 15 }}>{exam.question_count || 0}</td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: isDone ? T.greenBg : isLive ? T.accentSoft : '#f1f5f9', color: isDone ? T.green : isLive ? T.accent : T.dim }}>
                            {exam.status || 'scheduled'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedExam(exam); }}
                            style={{ padding: '5px 14px', background: T.accentSoft, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
                          >
                            View Students
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  .rep-row:hover { background: #f0f7ff !important; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;