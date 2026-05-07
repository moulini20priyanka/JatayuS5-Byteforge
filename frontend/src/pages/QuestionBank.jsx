// src/pages/QuestionBank.jsx
// FIXED:
//  1. QuizForge finalize → saves to question_bank DB table (no PDF)
//  2. Exam creation pulls from question_bank → students see exams in hiring dashboard
//  3. Admin sets exam date/time → auto-assigned to matched students

import React, { useState, useEffect } from 'react';
import Navbar          from '../components/Navbar';
import Sidebar         from '../components/Sidebar';
import ToastContainer  from '../components/Toast';
import ConfigurePanel  from '../components/QuizForge/ConfigurePanel';
import GeneratingPanel from '../components/QuizForge/GeneratingPanel';
import ReviewPanel     from '../components/QuizForge/ReviewPanel';   // ← use fixed one
import StepIndicator   from '../components/QuizForge/StepIndicator';
import { useGeneration } from '../hooks/useGeneration';

const API = 'http://localhost:5000/api';

function authHeader() {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Create Exam Modal (after questions saved) ─────────────────────────────────
function CreateExamModal({ savedCount, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', college: '', batch_year: new Date().getFullYear(),
    start_date: '', end_date: '', duration_minutes: 60,
    total_marks: 100, pass_mark: 40,
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleCreate() {
    if (!form.title || !form.college || !form.batch_year) {
      return setErr('Title, college and batch year are required');
    }
    setBusy(true); setErr('');
    try {
      // Step 1: create exam in draft (auto-pulls questions from question_bank)
      const res  = await fetch(`${API}/exams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          ...form,
          sections: { mcq: true, coding: true, sql: true },
          section_config: {
            mcq:    { questions: Math.ceil(savedCount * 0.6) },
            coding: { questions: Math.floor(savedCount * 0.2) },
            sql:    { questions: Math.floor(savedCount * 0.2) },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Exam creation failed');

      // Step 2: if dates provided, auto-approve (shortcut for admin)
      if (form.start_date && form.end_date) {
        await fetch(`${API}/exams/${data.exam_id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            start_date:       form.start_date,
            end_date:         form.end_date,
            duration_minutes: form.duration_minutes,
          }),
        });
      }
      onCreated(data);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, width: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1060', marginBottom: 4 }}>
            Create Exam from Question Bank
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            <span style={{
              background: 'rgba(112,85,200,0.1)', color: '#7055C8',
              padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12,
            }}>{savedCount} questions</span>
            {' '}saved to bank. Create an exam and assign to students.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Exam Title *</label>
            <input style={inputStyle} placeholder="e.g. React Developer Assessment"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>College / Company *</label>
              <input style={inputStyle} placeholder="e.g. MIT, Google"
                value={form.college} onChange={e => set('college', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Batch Year *</label>
              <input style={inputStyle} type="number" placeholder="2024"
                value={form.batch_year} onChange={e => set('batch_year', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input style={inputStyle} type="number" min={10} max={300}
                value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Total Marks</label>
              <input style={inputStyle} type="number" min={10}
                value={form.total_marks} onChange={e => set('total_marks', e.target.value)} />
            </div>
          </div>

          {/* Scheduling (optional — can also do from Exam Approval page) */}
          <div style={{
            background: '#f8faff', border: '1px solid #e8e4f8',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7055C8', marginBottom: 10 }}>
              📅 Schedule Now (optional — or approve later from Exam Approval)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Start Date & Time</label>
                <input style={inputStyle} type="datetime-local"
                  value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Date & Time</label>
                <input style={inputStyle} type="datetime-local"
                  value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>
            {form.start_date && form.end_date && (
              <p style={{ fontSize: 11, color: '#059669', marginTop: 8, fontWeight: 600 }}>
                ✓ Exam will be auto-approved and students will be notified by email.
              </p>
            )}
          </div>

          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '10px', border: '1.5px solid #e2e8f0',
              background: '#fff', borderRadius: 8, fontSize: 13,
              fontWeight: 600, color: '#64748b', cursor: 'pointer',
            }}>Skip for Now</button>
            <button onClick={handleCreate} disabled={busy} style={{
              flex: 2, padding: '10px',
              background: busy ? '#a5b4fc' : 'linear-gradient(135deg,#7055C8,#C060C0)',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 700, color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(112,85,200,0.3)',
            }}>
              {busy ? 'Creating Exam…' : '🚀 Create Exam & Assign Students'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Question Modal ────────────────────────────────────────────────────────
function AddQuestionModal({ onClose, onSave }) {
  const [form, setForm] = useState({ type: 'MCQ', difficulty: 'Medium', topic: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Add Question</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Topic / Title</label>
              <input className="form-input" placeholder="e.g. Binary Search Trees"
                value={form.topic} onChange={e => set('topic', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option>MCQ</option><option>Coding</option><option>SQL</option><option>Aptitude</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.topic.trim()) return alert('Please enter a topic/title');
            onSave(form);
          }}>Save Question</button>
        </div>
      </div>
    </div>
  );
}

// ── QuizForge Full-screen Panel ───────────────────────────────────────────────
function QuizForgePanel({ onImported, onClose }) {
  const [step,          setStep]          = useState('configure');
  const [config,        setConfig]        = useState(null);
  const [savedCount,    setSavedCount]    = useState(0);
  const [showExamModal, setShowExamModal] = useState(false);

  const { state, progress, questions, stats, generate, reset } = useGeneration();

  async function handleStart(params) {
    setConfig(params);
    setStep('generate');
    await generate(params);
  }

  // ── Called from ReviewPanel "Save to Question Bank" button ────────────────
  async function handleFinalize(selectedQuestions) {
    // Save directly to DB — NO PDF
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const res = await fetch(`${API}/question-bank/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questions: selectedQuestions }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');

    // Notify parent (QuestionBank page) to refresh list
    onImported(data.questions || []);
    setSavedCount(data.count || selectedQuestions.length);

    // Offer to create exam immediately
    setShowExamModal(true);
  }

  function handleStartOver() { reset(); setStep('configure'); setConfig(null); }
  const selectedAgents = config ? Object.keys(config.agentTopics || {}) : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#FAF7FC',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid rgba(112,85,200,0.12)',
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', gap: 20,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent',
          border: '1px solid rgba(112,85,200,0.25)',
          borderRadius: 7, padding: '6px 14px',
          fontSize: 13, color: '#7055C8', fontWeight: 600, cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Question Bank
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <StepIndicator currentStep={step} />
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          background: 'linear-gradient(135deg,rgba(112,85,200,0.1),rgba(192,96,192,0.1))',
          border: '1px solid rgba(112,85,200,0.25)',
          color: '#7055C8', padding: '5px 14px', borderRadius: 99,
        }}>QuizForge AI</div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 'configure' && <ConfigurePanel onStart={handleStart} />}

        {step === 'generate' && (
          <div>
            <GeneratingPanel progress={progress} state={state} selectedAgents={selectedAgents} />

            {state === 'done' && (
              <div style={{
                maxWidth: 500, margin: '0 auto 40px',
                background: '#fff',
                border: '1px solid rgba(112,85,200,0.2)',
                borderRadius: 14, padding: '28px 32px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(112,85,200,0.1)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(112,85,200,0.15),rgba(192,96,192,0.15))',
                  border: '1px solid rgba(112,85,200,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11L8.5 15.5L18 6" stroke="#7055C8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2a1860', marginBottom: 6 }}>
                  {questions.length} Questions Generated
                </h3>
                <p style={{ fontSize: 13, color: '#9080B8', marginBottom: 22 }}>
                  Review and select questions → Save to Question Bank → Create exam for students.
                </p>
                {stats && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
                    {Object.entries(stats.byAgent || {}).map(([key, count]) =>
                      count > 0 ? (
                        <span key={key} style={{
                          padding: '3px 12px', borderRadius: 99, fontSize: 12,
                          background: '#f0ecfc', border: '1px solid rgba(112,85,200,0.2)',
                          color: '#7055C8', fontWeight: 500,
                        }}>{count} {key}</span>
                      ) : null
                    )}
                  </div>
                )}
                <button onClick={() => setStep('review')} style={{
                  padding: '11px 32px', borderRadius: 8,
                  background: 'linear-gradient(135deg,#7055C8,#C060C0)',
                  color: '#fff', border: 'none', fontSize: 14,
                  fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(112,85,200,0.3)',
                }}>Review Questions →</button>
              </div>
            )}

            {state === 'error' && (
              <div style={{
                maxWidth: 400, margin: '0 auto',
                background: '#fff0f5', border: '1px solid #f0b0c8',
                borderRadius: 10, padding: 22, textAlign: 'center',
              }}>
                <p style={{ color: '#c04060', marginBottom: 14, fontSize: 13 }}>
                  Generation failed. Make sure the multiagent backend is running on port 3001.
                </p>
                <button onClick={handleStartOver} className="btn btn-secondary">Start Over</button>
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <ReviewPanel
            questions={questions}
            stats={stats}
            onFinalize={handleFinalize}
            onRegenerate={handleStartOver}
          />
        )}
      </div>

      {/* Create Exam Modal after saving */}
      {showExamModal && (
        <CreateExamModal
          savedCount={savedCount}
          onClose={() => { setShowExamModal(false); onClose(); }}
          onCreated={(examData) => {
            setShowExamModal(false);
            onClose();
            alert(`✓ Exam created! ${examData.questions_saved || ''} questions assigned. Students will receive email invites.`);
          }}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main QuestionBank Page ────────────────────────────────────────────────────
export default function QuestionBank() {
  const [showModal,     setShowModal]     = useState(false);
  const [showQuizForge, setShowQuizForge] = useState(false);
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('All');
  const [filterDiff,    setFilterDiff]    = useState('All');
  const [questions,     setQuestions]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType !== 'All') params.set('type', filterType);
    if (filterDiff !== 'All') params.set('difficulty', filterDiff);
    if (search)               params.set('search', search);

    fetch(`${API}/question-bank?${params}`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setQuestions(Array.isArray(data) ? data : (data.questions || [])))
      .catch(err => { console.error('[QB] fetch error:', err); setQuestions([]); })
      .finally(() => setLoading(false));
  }, [filterType, filterDiff, search]);

  function handleAIImport(importedQuestions) {
    setQuestions(prev => [...importedQuestions, ...prev]);
    showToast(`✓ ${importedQuestions.length} questions saved to database`);
    setShowQuizForge(false);
  }

  function handleManualAdd(form) {
    const payload = {
      topic: form.topic, type: form.type, difficulty: form.difficulty,
    };
    fetch(`${API}/question-bank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(newQ => setQuestions(prev => [newQ, ...prev]))
      .catch(() => {});
  }

  function handleDelete(q) {
    setQuestions(prev => prev.filter(x => x.id !== q.id));
    fetch(`${API}/question-bank/${q.id}`, { method: 'DELETE', headers: authHeader() }).catch(() => {});
    showToast('Question deleted');
  }

  const filtered = questions.filter(q => {
    const matchSearch =
      q.topic?.toLowerCase().includes(search.toLowerCase()) ||
      String(q.id)?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || q.type?.toUpperCase() === filterType.toUpperCase();
    const matchDiff = filterDiff === 'All' || q.difficulty?.toLowerCase() === filterDiff.toLowerCase();
    return matchSearch && matchType && matchDiff;
  });

  const aiCount = questions.filter(q => q.source === 'QuizForge AI').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: '#1a1060', color: '#fff', padding: '12px 20px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>{toast}</div>
      )}

      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div>
          <div className="page-header">
            <div className="page-header-left">
              <h1>Question Bank</h1>
              <p>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
                {aiCount > 0 && (
                  <span style={{
                    marginLeft: 10, fontSize: 11, fontWeight: 600,
                    background: 'linear-gradient(135deg,rgba(112,85,200,0.12),rgba(192,96,192,0.12))',
                    border: '1px solid rgba(112,85,200,0.25)',
                    color: '#7055C8', padding: '2px 9px', borderRadius: 99,
                  }}>{aiCount} from QuizForge AI</span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowQuizForge(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 8,
                background: 'linear-gradient(135deg,#7055C8,#C060C0)',
                color: '#fff', border: 'none', fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(112,85,200,0.3)',
              }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1L9.18 5.41L14 5.41L10.16 8.09L11.84 12.5L7.5 9.82L3.16 12.5L4.84 8.09L1 5.41L5.82 5.41L7.5 1Z" fill="currentColor"/>
                </svg>
                Generate with QuizForge AI
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                + Add Manually
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span className="panel-title">All Questions</span>
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ width: 220 }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input placeholder="Search questions..." value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }}
                  value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option>MCQ</option><option>Coding</option>
                  <option>SQL</option><option>Aptitude</option><option>Verbal</option>
                </select>
                <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }}
                  value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                  <option value="All">All Difficulty</option>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Loading question bank…
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Question ID</th><th>Topic</th><th>Type</th>
                      <th>Difficulty</th><th>Source</th><th>Created Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📋</div>
                          {questions.length === 0
                            ? <>
                                <span
                                  style={{ color: '#7055C8', cursor: 'pointer', fontWeight: 600 }}
                                  onClick={() => setShowQuizForge(true)}>
                                  Generate with QuizForge AI
                                </span>
                                {' '}to save questions to the database.
                              </>
                            : 'No questions match your filters.'}
                        </div>
                      </td></tr>
                    ) : (
                      filtered.map(q => (
                        <tr key={q.id}>
                          <td><span className="tag">{q.id}</span></td>
                          <td style={{ fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.topic || '—'}
                          </td>
                          <td>
                            <span className={`badge ${
                              ['mcq','MCQ'].includes(q.type)         ? 'badge-blue'   :
                              ['coding','Coding'].includes(q.type)   ? 'badge-yellow' :
                              ['sql','SQL'].includes(q.type)         ? 'badge-teal'   :
                              'badge-gray'
                            }`}>{(q.type || '').toUpperCase()}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              (q.difficulty||'').toLowerCase() === 'hard'   ? 'badge-red'    :
                              (q.difficulty||'').toLowerCase() === 'medium' ? 'badge-yellow' :
                              'badge-green'
                            }`}>{q.difficulty}</span>
                          </td>
                          <td>
                            {q.source === 'QuizForge AI' ? (
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                                background: 'linear-gradient(135deg,rgba(112,85,200,0.1),rgba(192,96,192,0.1))',
                                border: '1px solid rgba(112,85,200,0.2)', color: '#7055C8',
                              }}>QuizForge AI</span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Manual</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                            {q.createdDate || '—'}
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q)}>Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showModal && (
            <AddQuestionModal
              onClose={() => setShowModal(false)}
              onSave={q => { handleManualAdd(q); setShowModal(false); }}
            />
          )}
        </div>
      </main>

      {showQuizForge && (
        <QuizForgePanel
          onImported={handleAIImport}
          onClose={() => setShowQuizForge(false)}
        />
      )}

      <ToastContainer />
    </div>
  );
}