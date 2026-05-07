// src/pages/CreateExam.jsx
// Admin: pick questions from question_bank → create exam → set date/time → approve → students see it

import React, { useState, useEffect } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:5000/api';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Select Questions', 'Exam Details', 'Schedule & Approve'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i <= current ? 'linear-gradient(135deg,#7055C8,#C060C0)' : '#f1f5f9',
              color: i <= current ? '#fff' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>{i < current ? '✓' : i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: i <= current ? '#7055C8' : '#94a3b8', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? '#7055C8' : '#f1f5f9', margin: '0 8px', marginBottom: 20 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Step 1: Question selector ──────────────────────────────────────────────────
function QuestionSelector({ selected, setSelected }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    fetch(`${API}/question-bank`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = questions.filter(q => {
    const matchType = filterType === 'All' || q.type?.toUpperCase() === filterType.toUpperCase();
    const matchSearch = !search || q.topic?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggle = (q) => {
    setSelected(prev =>
      prev.find(x => x.id === q.id)
        ? prev.filter(x => x.id !== q.id)
        : [...prev, q]
    );
  };

  const isSelected = (q) => !!selected.find(x => x.id === q.id);

  const typeCounts = {};
  selected.forEach(q => { const t = (q.type||'MCQ').toUpperCase(); typeCounts[t] = (typeCounts[t]||0)+1; });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1060', marginBottom: 4 }}>
            Select Questions from Bank
          </h3>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{questions.length} questions available</p>
        </div>
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(typeCounts).map(([t, c]) => (
              <span key={t} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: '#f0ecfc', color: '#7055C8' }}>{c} {t}</span>
            ))}
            <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#7055C8,#C060C0)', color: '#fff' }}>
              {selected.length} selected
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', flex: 1 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics…" style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', flex: 1 }} />
        </div>
        {['All','MCQ','SQL','Coding','Aptitude'].map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{
            padding: '6px 14px', border: 'none', borderRadius: 8,
            background: filterType === t ? '#7055C8' : '#f1f5f9',
            color: filterType === t ? '#fff' : '#64748b',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{t}</button>
        ))}
        <button onClick={() => setSelected(filtered)} style={{ padding: '6px 14px', border: '1.5px solid #7055C8', borderRadius: 8, background: '#fff', color: '#7055C8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Select All ({filtered.length})
        </button>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} style={{ padding: '6px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Question list */}
      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading questions…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            No questions in bank yet.{' '}
            <a href="#/question-bank" style={{ color: '#7055C8' }}>Generate with QuizForge →</a>
          </div>
        ) : filtered.map(q => (
          <div key={q.id} onClick={() => toggle(q)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderRadius: 10, cursor: 'pointer',
            border: `1.5px solid ${isSelected(q) ? '#7055C8' : '#f1f5f9'}`,
            background: isSelected(q) ? 'rgba(112,85,200,0.04)' : '#fff',
            transition: 'all .15s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              border: `2px solid ${isSelected(q) ? '#7055C8' : '#d1d5db'}`,
              background: isSelected(q) ? '#7055C8' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isSelected(q) && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{q.topic}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{q.question_text?.substring(0, 80)}…</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed' }}>{q.type}</span>
              <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: q.difficulty?.toLowerCase()==='hard' ? '#fee2e2' : q.difficulty?.toLowerCase()==='easy' ? '#dcfce7' : '#fef9c3',
                color:      q.difficulty?.toLowerCase()==='hard' ? '#dc2626' : q.difficulty?.toLowerCase()==='easy' ? '#16a34a' : '#ca8a04',
              }}>{q.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Exam details form ──────────────────────────────────────────────────
function ExamDetails({ form, setForm }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1060', marginBottom: 20 }}>Exam Details</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={lbl}>Exam Title *</label>
          <input style={inp} placeholder="e.g. React Developer Assessment Q1 2025" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>College / Company *</label>
            <input style={inp} placeholder="e.g. MIT, Google, TCS" value={form.college} onChange={e => set('college', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Batch Year *</label>
            <input style={inp} type="number" placeholder="2025" value={form.batch_year} onChange={e => set('batch_year', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Duration (minutes)</label>
            <input style={inp} type="number" min={10} max={300} value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Total Marks</label>
            <input style={inp} type="number" min={10} value={form.total_marks} onChange={e => set('total_marks', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Pass Mark</label>
            <input style={inp} type="number" min={0} value={form.pass_mark} onChange={e => set('pass_mark', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={lbl}>Description (optional)</label>
          <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="Brief description of this exam…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Schedule & Approve ─────────────────────────────────────────────────
function ScheduleApprove({ form, setForm, examId, onDone }) {
  const set   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState('');

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };

  async function handleApprove() {
    if (!form.start_date || !form.end_date) return setErr('Start and end date/time are required');
    if (new Date(form.end_date) <= new Date(form.start_date)) return setErr('End must be after start');
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API}/exams/${examId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ start_date: form.start_date, end_date: form.end_date, duration_minutes: form.duration_minutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      setResult(data);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (result) return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginBottom: 8 }}>Exam Approved!</h3>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
        <strong>{result.students_assigned}</strong> students have been assigned and notified.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onDone} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#7055C8,#C060C0)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1060', marginBottom: 8 }}>Schedule & Approve</h3>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Set the exam window. Students matching <strong>{form.college}</strong> / Batch <strong>{form.batch_year}</strong> will be automatically assigned.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Start Date & Time *</label>
            <input style={inp} type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>End Date & Time *</label>
            <input style={inp} type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>

        {form.start_date && form.end_date && new Date(form.end_date) > new Date(form.start_date) && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#059669', fontWeight: 600 }}>
            ✓ Exam window: {new Date(form.start_date).toLocaleString('en-IN')} → {new Date(form.end_date).toLocaleString('en-IN')}
            {' '}({form.duration_minutes} min duration)
          </div>
        )}

        {err && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{err}</div>
        )}

        <button onClick={handleApprove} disabled={busy} style={{
          padding: '12px', background: busy ? '#a5b4fc' : 'linear-gradient(135deg,#059669,#10b981)',
          border: 'none', borderRadius: 8, color: '#fff', fontSize: 14,
          fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 12px rgba(5,150,105,0.3)',
        }}>
          {busy ? 'Approving…' : '✓ Approve & Notify Students'}
        </button>
      </div>
    </div>
  );
}

// ── Main CreateExam page ───────────────────────────────────────────────────────
export default function CreateExam() {
  const [step,     setStep]     = useState(0);
  const [selected, setSelected] = useState([]);
  const [examId,   setExamId]   = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const [form, setForm] = useState({
    title: '', college: '', batch_year: new Date().getFullYear(),
    duration_minutes: 60, total_marks: 100, pass_mark: 40,
    description: '', start_date: '', end_date: '',
  });

  async function handleNext() {
    if (step === 0) {
      if (selected.length === 0) return setErr('Select at least one question');
      setErr(''); setStep(1);
    } else if (step === 1) {
      if (!form.title || !form.college || !form.batch_year) return setErr('Title, college and batch year are required');
      setBusy(true); setErr('');
      try {
        // Build section config from selected questions
        const typeCounts = {};
        selected.forEach(q => { const t = (q.type||'mcq').toLowerCase(); typeCounts[t] = (typeCounts[t]||0)+1; });
        const sections = {};
        const section_config = {};
        Object.keys(typeCounts).forEach(t => {
          sections[t] = true;
          section_config[t] = { questions: typeCounts[t] };
        });

        const res = await fetch(`${API}/exams/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ ...form, sections, section_config,
            // Pass specific question IDs so only selected questions are used
            question_ids: selected.map(q => q._dbId).filter(Boolean),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Exam creation failed');
        setExamId(data.exam_id);
        setStep(2);
      } catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    }
  }

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, padding: '28px 32px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1060', marginBottom: 4 }}>
              Create Exam from Question Bank
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Select questions → set details → schedule → students get assigned automatically
            </p>
          </div>

          <Steps current={step} />

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>

            {step === 0 && <QuestionSelector selected={selected} setSelected={setSelected} />}
            {step === 1 && <ExamDetails form={form} setForm={setForm} />}
            {step === 2 && <ScheduleApprove form={form} setForm={setForm} examId={examId} onDone={() => window.location.hash = '/question-bank'} />}

            {err && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                {err}
              </div>
            )}

            {step < 2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                {step > 0 ? (
                  <button onClick={() => { setStep(s => s-1); setErr(''); }} style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                    ← Back
                  </button>
                ) : <div />}
                <button onClick={handleNext} disabled={busy} style={{
                  padding: '10px 28px',
                  background: busy ? '#a5b4fc' : 'linear-gradient(135deg,#7055C8,#C060C0)',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(112,85,200,0.3)',
                }}>
                  {busy ? 'Creating…' : step === 0 ? `Next → (${selected.length} selected)` : 'Create Exam →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
