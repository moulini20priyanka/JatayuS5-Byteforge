// src/pages/QuestionBank.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

import ConfigurePanel  from '../components/QuizForge/ConfigurePanel';
import GeneratingPanel from '../components/QuizForge/GeneratingPanel';
import ReviewPanel     from '../components/QuizForge/ReviewPanel';
import StepIndicator   from '../components/QuizForge/StepIndicator';
import { useGeneration } from '../hooks/useGeneration';

const API = 'http://localhost:5000/api';

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
                  <option>MCQ</option><option>Coding</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
            </div>
            {form.type === 'MCQ' && (
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea className="form-input" rows={3} placeholder="Enter your MCQ question..." />
              </div>
            )}
            {form.type === 'Coding' && (
              <div className="form-group">
                <label className="form-label">Problem Statement</label>
                <textarea className="code-editor-area" rows={4} placeholder="Describe the coding problem..." />
              </div>
            )}
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

// ── QuizForge Slide-over Panel ────────────────────────────────────────────────
function QuizForgePanel({ onImported, onClose }) {
  const [step, setStep]           = useState('configure');
  const [config, setConfig]       = useState(null);
  const [importing, setImporting] = useState(false);

  const { state, progress, questions, stats, generate, reset, downloadPDF } = useGeneration();

  async function handleStart(params) {
    setConfig(params);
    setStep('generate');
    await generate(params);
  }

  async function handleFinalize(selectedQuestions) {
    setImporting(true);

    // Step 1 — Download PDF
    try {
      await downloadPDF(selectedQuestions, {
        ...config,
        title: 'Quiz Paper',
        difficulty: config?.difficulty || 'Mixed',
      });
    } catch (err) {
      console.error('PDF error:', err.message);
      alert('PDF generation failed: ' + err.message);
      setImporting(false);
      return;
    }

    // Step 2 — Import to backend question bank
    try {
      const res = await fetch(`${API}/question-bank/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: selectedQuestions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      onImported(data.questions);
    } catch (err) {
      console.warn('Backend import failed, using local fallback:', err.message);
      const fallback = selectedQuestions.map(q => ({
        id: 'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        topic: q.topic || q.question?.substring(0, 45) || 'QuizForge Question',
        type:
          q.type === 'mcq'      ? 'MCQ'      :
          q.type === 'coding'   ? 'Coding'   :
          q.type === 'sql'      ? 'SQL'      :
          q.type === 'aptitude' ? 'Aptitude' :
          q.type === 'verbal'   ? 'Verbal'   : 'MCQ',
        difficulty: q.difficulty
          ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
          : 'Medium',
        createdDate: new Date().toLocaleDateString('en-GB'),
        source: 'QuizForge AI',
      }));
      onImported(fallback);
    } finally {
      setImporting(false);
    }
  }

  function handleStartOver() {
    reset();
    setStep('configure');
    setConfig(null);
  }

  const selectedAgents = config ? Object.keys(config.agentTopics || {}) : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(42,24,96,0.55)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }}>
      <div className="quizforge-panel" style={{
        width: '82%', maxWidth: 1100,
        background: '#FAF7FC',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(112,85,200,0.2)',
      }}>
        {/* Panel header */}
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
          }}>
            QuizForge AI
          </div>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1 }}>
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
                    Review questions → Export as PDF → Added to Question Bank automatically.
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
                  }}>
                    Review Questions
                  </button>
                </div>
              )}

              {state === 'error' && (
                <div style={{
                  maxWidth: 400, margin: '0 auto',
                  background: '#fff0f5', border: '1px solid #f0b0c8',
                  borderRadius: 10, padding: 22, textAlign: 'center',
                }}>
                  <p style={{ color: '#c04060', marginBottom: 14, fontSize: 13 }}>
                    Generation failed. Make sure multiagentai backend is running on port 3001.
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

        {importing && (
          <div style={{
            position: 'sticky', bottom: 0,
            background: 'rgba(112,85,200,0.95)',
            padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: 12,
            color: '#fff', fontSize: 14, fontWeight: 500,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              animation: 'spin 0.8s linear infinite',
            }} />
            Downloading PDF and saving to Question Bank…
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main QuestionBank Page ────────────────────────────────────────────────────
export default function QuestionBank() {
  const [showModal, setShowModal]         = useState(false);
  const [showQuizForge, setShowQuizForge] = useState(false);
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState('All');
  const [filterDiff, setFilterDiff]       = useState('All');

  // All questions come from backend + QuizForge-generated (no static seed data)
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Fetch from backend on mount
  useEffect(() => {
    fetch(`${API}/question-bank`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setQuestions(Array.isArray(data) ? data : (data.questions || []));
      })
      .catch(() => {
        // If backend not reachable, start empty (no static data)
        setQuestions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // After QuizForge import, append newly saved questions
  function handleAIImport(importedQuestions) {
    setQuestions(prev => [...prev, ...importedQuestions]);
    setShowQuizForge(false);
  }

  // Add manually
  function handleManualAdd(form) {
    const newQ = {
      id:          'QB-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      topic:       form.topic,
      type:        form.type,
      difficulty:  form.difficulty,
      createdDate: new Date().toLocaleDateString('en-GB'),
      source:      'Manual',
    };
    setQuestions(prev => [newQ, ...prev]);

    // Persist to backend if available
    fetch(`${API}/question-bank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQ),
    }).catch(() => {});
  }

  // Delete
  function handleDelete(q) {
    setQuestions(prev => prev.filter(x => x.id !== q.id));
    fetch(`${API}/question-bank/${q.id}`, { method: 'DELETE' }).catch(() => {});
  }

  const filtered = questions.filter(q => {
    const matchSearch =
      q.topic?.toLowerCase().includes(search.toLowerCase()) ||
      q.id?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || q.type === filterType;
    const matchDiff = filterDiff === 'All' || q.difficulty === filterDiff;
    return matchSearch && matchType && matchDiff;
  });

  const aiCount = questions.filter(q => q.source === 'QuizForge AI').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div>
          {/* Page header */}
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
                  }}>
                    {aiCount} from QuizForge AI
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowQuizForge(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', borderRadius: 8,
                  background: 'linear-gradient(135deg,#7055C8,#C060C0)',
                  color: '#fff', border: 'none', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(112,85,200,0.3)',
                }}
              >
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

          {/* Questions table */}
          <div className="panel">
            <div className="panel-header" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span className="panel-title">All Questions</span>
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ width: 220 }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    placeholder="Search questions..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }}
                  value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option>MCQ</option>
                  <option>Coding</option>
                  <option>SQL</option>
                  <option>Aptitude</option>
                  <option>Verbal</option>
                </select>
                <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }}
                  value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                  <option value="All">All Difficulty</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
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
                      <th>Question ID</th>
                      <th>Topic</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Source</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            {questions.length === 0
                              ? <>No questions yet. <span style={{ color: '#7055C8', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowQuizForge(true)}>Generate with QuizForge AI</span> or add manually.</>
                              : 'No questions match your filters.'
                            }
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(q => (
                        <tr key={q.id}>
                          <td><span className="tag">{q.id}</span></td>
                          <td style={{ fontWeight: 500 }}>{q.topic || '—'}</td>
                          <td>
                            <span className={`badge ${
                              q.type === 'MCQ'      ? 'badge-blue'   :
                              q.type === 'Coding'   ? 'badge-yellow' :
                              q.type === 'SQL'      ? 'badge-teal'   :
                              q.type === 'Aptitude' ? 'badge-green'  :
                              q.type === 'Verbal'   ? 'badge-navy'   :
                              'badge-gray'
                            }`}>{q.type}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              q.difficulty === 'Hard'   ? 'badge-red'    :
                              q.difficulty === 'Medium' ? 'badge-yellow' :
                              'badge-green'
                            }`}>{q.difficulty}</span>
                          </td>
                          <td>
                            {q.source === 'QuizForge AI' ? (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                padding: '2px 8px', borderRadius: 99,
                                background: 'linear-gradient(135deg,rgba(112,85,200,0.1),rgba(192,96,192,0.1))',
                                border: '1px solid rgba(112,85,200,0.2)',
                                color: '#7055C8',
                              }}>QuizForge AI</span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Manual</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {q.createdDate}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm">Edit</button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(q)}
                              >Delete</button>
                            </div>
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