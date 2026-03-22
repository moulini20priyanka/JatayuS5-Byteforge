import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const LANGUAGES = ['Python', 'Java', 'SQL', 'C++', 'JavaScript', 'Go'];
const EXAM_TYPES = ['Placement Assessment', 'Skill Assessment', 'Certification Exam'];

function AddCodingQuestionModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'Medium', language: 'Python', testCases: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Add Coding Question</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Question Title</label>
              <input className="form-input" placeholder="e.g. Reverse a Linked List" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label required">Problem Description</label>
              <textarea className="form-input" rows={4} placeholder="Describe the problem in detail..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <select className="form-select" value={form.language} onChange={e => set('language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Starter Code / Template</label>
              <textarea className="code-editor-area" rows={5} placeholder="def solution(arr):\n    # Write your code here\n    pass" value={form.testCases} onChange={e => set('testCases', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!form.title.trim()) return alert('Please enter a question title');
              onSave(form);
            }}
          >
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateExam() {
  const { addExam, addQuestion, showToast } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    type: '',
    org: '',
    duration: '',
    startDate: '',
    endDate: '',
    languages: [],
  });
  const [errors, setErrors]               = useState({});
  const [showCodingModal, setShowCodingModal] = useState(false);
  const [codingQuestions, setCodingQuestions] = useState([]);
  const [submitted, setSubmitted]         = useState(false);
  const [pdfUploaded, setPdfUploaded]     = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleLang = (lang) => {
    setForm(p => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter(l => l !== lang)
        : [...p.languages, lang],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Exam name is required';
    if (!form.type) e.type = 'Please select exam type';
    if (!form.org.trim()) e.org = 'Organization name is required';
    if (!form.duration || isNaN(form.duration) || +form.duration <= 0) e.duration = 'Enter valid duration';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate) e.endDate = 'End date is required';
    if (form.languages.length === 0) e.languages = 'Select at least one language';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    addExam({ ...form });
    setSubmitted(true);
    setTimeout(() => navigate('/'), 1800);
  };

  const handleCodingQuestionSave = (q) => {
    const newQ = { ...q, type: 'Coding', topic: q.title };
    setCodingQuestions(prev => [...prev, newQ]);
    addQuestion(newQ);
    setShowCodingModal(false);
  };

  if (submitted) {
    return (
      <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Sidebar />
        <Navbar />
        <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Exam Created Successfully!</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Redirecting to Dashboard...</p>
          </div>
        </main>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: 820 }}>
          <div className="page-header">
            <div className="page-header-left">
              <h1>Create Exam</h1>
              <p>Configure a new assessment for your candidates</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span className="panel-title">Exam Details</span>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Exam Name</label>
                  <input
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="e.g. Java Backend Developer Assessment"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label required">Exam Type</label>
                  <select
                    className={`form-select ${errors.type ? 'error' : ''}`}
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    <option value="">Select exam type</option>
                    {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  {errors.type && <span className="form-error">{errors.type}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label required">Organization / Company Name</label>
                  <input
                    className={`form-input ${errors.org ? 'error' : ''}`}
                    placeholder="e.g. TechCorp India"
                    value={form.org}
                    onChange={e => set('org', e.target.value)}
                  />
                  {errors.org && <span className="form-error">{errors.org}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label required">Duration (minutes)</label>
                  <input
                    type="number"
                    className={`form-input ${errors.duration ? 'error' : ''}`}
                    placeholder="e.g. 90"
                    value={form.duration}
                    onChange={e => set('duration', e.target.value)}
                    min="1"
                  />
                  {errors.duration && <span className="form-error">{errors.duration}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label required">Start Date</label>
                  <input
                    type="date"
                    className={`form-input ${errors.startDate ? 'error' : ''}`}
                    value={form.startDate}
                    onChange={e => set('startDate', e.target.value)}
                  />
                  {errors.startDate && <span className="form-error">{errors.startDate}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label required">End Date</label>
                  <input
                    type="date"
                    className={`form-input ${errors.endDate ? 'error' : ''}`}
                    value={form.endDate}
                    onChange={e => set('endDate', e.target.value)}
                  />
                  {errors.endDate && <span className="form-error">{errors.endDate}</span>}
                </div>

                <div className="form-group form-grid-full">
                  <label className="form-label required">Allowed Programming Languages</label>
                  <div className="multi-check-group">
                    {LANGUAGES.map(lang => (
                      <div
                        key={lang}
                        className={`multi-check-item ${form.languages.includes(lang) ? 'selected' : ''}`}
                        onClick={() => toggleLang(lang)}
                      >
                        <input type="checkbox" readOnly checked={form.languages.includes(lang)} />
                        {lang}
                      </div>
                    ))}
                  </div>
                  {errors.languages && <span className="form-error">{errors.languages}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* MCQ Upload */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span className="panel-title">Upload MCQ Questions</span>
              <span className="badge badge-gray">Optional</span>
            </div>
            <div className="panel-body">
              <FileUpload onUpload={(filename) => {
                setPdfUploaded(true);
                showToast(`PDF "${filename}" uploaded and questions extracted!`, 'success');
              }} />
              {pdfUploaded && (
                <div className="info-text" style={{ marginTop: 10, color: 'var(--color-success)' }}>
                  PDF uploaded successfully. MCQs are ready to review.
                </div>
              )}
            </div>
          </div>

          {/* Coding Questions */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span className="panel-title">Coding Questions</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCodingModal(true)}>
                + Add Coding Question
              </button>
            </div>
            {codingQuestions.length === 0 ? (
              <div className="panel-body">
                <div className="empty-state">
                  <div className="empty-state-icon">💻</div>
                  <div>No coding questions added yet.</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Click "Add Coding Question" to add one.</div>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Language</th>
                      <th>Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codingQuestions.map((q, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{q.title}</td>
                        <td><span className="tag">{q.language}</span></td>
                        <td>
                          <span className={`badge ${q.difficulty === 'Hard' ? 'badge-red' : q.difficulty === 'Medium' ? 'badge-yellow' : 'badge-green'}`}>
                            {q.difficulty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Create Exam
            </button>
          </div>

          {showCodingModal && (
            <AddCodingQuestionModal
              onClose={() => setShowCodingModal(false)}
              onSave={handleCodingQuestionSave}
            />
          )}
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
