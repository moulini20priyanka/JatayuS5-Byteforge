import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLLEGES = ['RMKEC', 'RMDEC', 'RMKCET'];
const BATCH_YEARS = ['2021', '2022', '2023', '2024', '2025'];
const LANGUAGES = ['Python', 'Java', 'SQL', 'C++', 'JavaScript', 'Go'];
const DURATIONS = ['30', '45', '60', '90', '120'];

const SECTIONS = {
  placement:  { mcq: true,  sql: true,  coding: true,  viva: true  },
  university: { mcq: true,  sql: false, coding: true,  viva: false },
  skill_cert: { mcq: true,  sql: false, coding: true,  viva: false },
};

const TYPE_META = {
  placement: {
    label: 'Placement Assessment',
    icon:  '🏢',
    desc:  'Triggered from an approved recruiter exam request',
    color: '#185FA5',
    bg:    '#E6F1FB',
    border:'#B5D4F4',
  },
  university: {
    label: 'University Exam',
    icon:  '🎓',
    desc:  'Internal academic assessment assigned to a college batch',
    color: '#0F6E56',
    bg:    '#E1F5EE',
    border:'#9FE1CB',
  },
  skill_cert: {
    label: 'Skill Certificate',
    icon:  '📜',
    desc:  'Standalone skill certification open to all eligible students',
    color: '#854F0B',
    bg:    '#FAEEDA',
    border:'#FAC775',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateExamKey(type, college) {
  const prefix = { placement: 'PLC', university: 'UNI', skill_cert: 'SKL' }[type] || 'EXM';
  const col    = college ? college.slice(0, 3).toUpperCase() : 'GEN';
  const rand   = Math.random().toString(36).slice(2, 8).toUpperCase();
  const year   = new Date().getFullYear().toString().slice(2);
  return `${prefix}-${col}-${year}-${rand}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
      {Object.entries(TYPE_META).map(([key, meta]) => (
        <div
          key={key}
          onClick={() => onChange(key)}
          style={{
            cursor:       'pointer',
            border:       value === key ? `2px solid ${meta.color}` : '1.5px solid var(--color-border)',
            borderRadius: 10,
            padding:      '16px 14px',
            background:   value === key ? meta.bg : 'var(--color-surface)',
            transition:   'all 0.18s ease',
            position:     'relative',
          }}
        >
          {value === key && (
            <span style={{
              position:   'absolute', top: 8, right: 8,
              width: 18, height: 18, borderRadius: '50%',
              background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
          <div style={{ fontSize: 22, marginBottom: 6 }}>{meta.icon}</div>
          <div style={{ fontWeight: 600, fontSize: 13, color: value === key ? meta.color : 'var(--color-text)' }}>
            {meta.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {meta.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionToggle({ sections, onChange }) {
  const labels = { mcq: 'MCQ', sql: 'SQL Query', coding: 'Coding', viva: 'AI Viva' };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {Object.entries(labels).map(([key, label]) => (
        <label
          key={key}
          style={{
            display:      'flex', alignItems: 'center', gap: 7,
            padding:      '6px 14px',
            borderRadius: 20,
            border:       sections[key] ? '1.5px solid #185FA5' : '1.5px solid var(--color-border)',
            background:   sections[key] ? '#E6F1FB' : 'var(--color-surface)',
            cursor:       'pointer', fontSize: 13,
            color:        sections[key] ? '#185FA5' : 'var(--color-text-muted)',
            fontWeight:   sections[key] ? 600 : 400,
            userSelect:   'none',
          }}
        >
          <input
            type="checkbox"
            checked={!!sections[key]}
            onChange={e => onChange(key, e.target.checked)}
            style={{ display: 'none' }}
          />
          {sections[key] ? '✓ ' : ''}{label}
        </label>
      ))}
    </div>
  );
}

function ExamKeyBanner({ examKey, examType }) {
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[examType] || TYPE_META.placement;
  const copy = () => {
    navigator.clipboard.writeText(examKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{
      background:   meta.bg,
      border:       `1.5px solid ${meta.border}`,
      borderRadius: 10,
      padding:      '18px 20px',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 12, color: meta.color, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
        Exam Access Key
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontFamily:   'monospace', fontSize: 22, fontWeight: 700,
          color:        meta.color, letterSpacing: 2,
        }}>
          {examKey}
        </span>
        <button
          onClick={copy}
          style={{
            background:   'white', border: `1px solid ${meta.border}`,
            borderRadius: 6, padding: '4px 12px',
            fontSize: 12, color: meta.color, cursor: 'pointer', fontWeight: 500,
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ fontSize: 11, color: meta.color, opacity: 0.7, marginTop: 6 }}>
        This key will be emailed to all assigned students after exam creation.
      </div>
    </div>
  );
}

// ─── Placement: pick from approved exam requests ───────────────────────────────
function PlacementRequestPicker({ value, onChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/exam-requests?status=approved', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setRequests(data.requests || data || []); setLoading(false); })
      .catch(() => { setRequests([]); setLoading(false); });
  }, []);

  if (loading) return <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading approved requests…</p>;
  if (!requests.length) return (
    <div style={{ padding: '14px', background: '#FAEEDA', borderRadius: 8, fontSize: 13, color: '#854F0B' }}>
      No approved exam requests found. Approve a recruiter request first from the Exam Requests page.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {requests.map(req => (
        <label
          key={req.id}
          style={{
            display:    'flex', alignItems: 'flex-start', gap: 10,
            padding:    '12px 14px', borderRadius: 8, cursor: 'pointer',
            border:     value === req.id ? '2px solid #185FA5' : '1.5px solid var(--color-border)',
            background: value === req.id ? '#E6F1FB' : 'var(--color-surface)',
          }}
        >
          <input
            type="radio" name="examRequest" value={req.id}
            checked={value === req.id}
            onChange={() => onChange(req)}
            style={{ marginTop: 2 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{req.company_name || req.companyName}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {req.role || req.position} · Requested by {req.recruiter_name || req.recruiterName}
              {req.preferred_date ? ` · ${new Date(req.preferred_date).toLocaleDateString()}` : ''}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CreateExam() {
  const navigate  = useNavigate();
  const { showToast } = useApp();

  const [examType,     setExamType]     = useState('');
  const [examKey,      setExamKey]      = useState('');
  const [step,         setStep]         = useState(1); // 1=type, 2=details, 3=sections, 4=confirm
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [errors,       setErrors]       = useState({});

  // Placement-specific
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Common fields
  const [form, setForm] = useState({
    title:       '',
    college:     '',
    batchYear:   '',
    startDate:   '',
    endDate:     '',
    duration:    '60',
    description: '',
    languages:   ['Python', 'Java'],
    totalMarks:  '100',
    passMark:    '40',
  });

  // Section toggles — auto-set per exam type
  const [sections, setSections] = useState({ mcq: true, sql: false, coding: true, viva: false });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleLang = lang =>
    setF('languages', form.languages.includes(lang)
      ? form.languages.filter(l => l !== lang)
      : [...form.languages, lang]);

  // Auto-set sections when exam type changes
  useEffect(() => {
    if (examType) {
      setSections({ ...SECTIONS[examType] });
      setExamKey(generateExamKey(examType, form.college));
    }
  }, [examType]);

  // Regenerate key when college changes
  useEffect(() => {
    if (examType) setExamKey(generateExamKey(examType, form.college));
  }, [form.college]);

  // Auto-fill title & org from placement request
  useEffect(() => {
    if (selectedRequest) {
      setF('title', `${selectedRequest.company_name || selectedRequest.companyName} — ${selectedRequest.role || selectedRequest.position || 'Assessment'}`);
    }
  }, [selectedRequest]);

  // ── Validation per step ──────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!examType)              e.examType  = 'Please select an exam type';
    if (examType === 'placement' && !selectedRequest) e.request = 'Please select an approved request';
    if (!form.title.trim())     e.title     = 'Exam title is required';
    if (!form.college)          e.college   = 'Please select a college';
    if (!form.batchYear)        e.batchYear = 'Please select a batch year';
    if (!form.startDate)        e.startDate = 'Start date is required';
    if (!form.endDate)          e.endDate   = 'End date is required';
    if (!form.duration)         e.duration  = 'Duration is required';
    if (form.languages.length === 0) e.languages = 'Select at least one language';
    if (!Object.values(sections).some(Boolean)) e.sections = 'Enable at least one exam section';
    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast('Please fix the errors before submitting', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        exam_type:         examType,
        exam_key:          examKey,
        title:             form.title,
        college:           form.college,
        batch_year:        form.batchYear,
        start_date:        form.startDate,
        end_date:          form.endDate,
        duration_minutes:  parseInt(form.duration),
        description:       form.description,
        allowed_languages: form.languages,
        total_marks:       parseInt(form.totalMarks),
        pass_mark:         parseInt(form.passMark),
        sections,
        exam_request_id:   selectedRequest?.id || null,
      };
      const res = await fetch('/api/exams/create', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create exam');
      showToast('Exam created and key emailed to students!', 'success');
      setSubmitted(true);
      setTimeout(() => navigate('/admin/exams'), 2000);
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Sidebar /><Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Exam Created!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Access key <strong style={{ fontFamily: 'monospace' }}>{examKey}</strong> has been emailed to students.
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Redirecting…</p>
          </div>
        </main>
        <ToastContainer />
      </div>
    );
  }

  const meta = examType ? TYPE_META[examType] : null;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar /><Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: 20, padding: 0,
                }}
              >←</button>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Create Exam</h1>
              {meta && (
                <span style={{
                  background: meta.bg, color: meta.color,
                  border:     `1px solid ${meta.border}`,
                  borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                }}>
                  {meta.icon} {meta.label}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
              Configure and assign a new assessment to students
            </p>
          </div>

          {/* ── Step 1: Exam Type ─────────────────────────────────────────── */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span className="panel-title">
                <span style={{ color: examType ? '#0F6E56' : '#185FA5', marginRight: 8 }}>
                  {examType ? '✓' : '1'}
                </span>
                Exam Type
              </span>
            </div>
            <div className="panel-body">
              <TypeSelector value={examType} onChange={t => { setExamType(t); setErrors({}); }} />
              {errors.examType && <p className="form-error">{errors.examType}</p>}

              {/* Placement: show request picker */}
              {examType === 'placement' && (
                <div>
                  <label className="form-label required" style={{ marginBottom: 10, display: 'block' }}>
                    Select Approved Exam Request
                  </label>
                  <PlacementRequestPicker
                    value={selectedRequest?.id}
                    onChange={req => { setSelectedRequest(req); setErrors(p => ({ ...p, request: '' })); }}
                  />
                  {errors.request && <p className="form-error">{errors.request}</p>}
                </div>
              )}
            </div>
          </div>

          {/* ── Step 2: Exam Details ──────────────────────────────────────── */}
          {examType && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-header">
                <span className="panel-title">
                  <span style={{ color: '#185FA5', marginRight: 8 }}>2</span>
                  Exam Details
                </span>
              </div>
              <div className="panel-body">
                <div className="form-grid">

                  {/* Title */}
                  <div className="form-group form-grid-full">
                    <label className="form-label required">Exam Title</label>
                    <input
                      className={`form-input ${errors.title ? 'error' : ''}`}
                      placeholder={examType === 'placement'
                        ? 'e.g. Infosys — Full Stack Developer Assessment'
                        : examType === 'university'
                        ? 'e.g. Data Structures — End Semester Exam'
                        : 'e.g. Python Programming — Skill Certificate'}
                      value={form.title}
                      onChange={e => setF('title', e.target.value)}
                    />
                    {errors.title && <span className="form-error">{errors.title}</span>}
                  </div>

                  {/* College */}
                  <div className="form-group">
                    <label className="form-label required">Assign College</label>
                    <select
                      className={`form-select ${errors.college ? 'error' : ''}`}
                      value={form.college}
                      onChange={e => setF('college', e.target.value)}
                    >
                      <option value="">Select college</option>
                      {COLLEGES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {errors.college && <span className="form-error">{errors.college}</span>}
                  </div>

                  {/* Batch Year */}
                  <div className="form-group">
                    <label className="form-label required">Batch Year</label>
                    <select
                      className={`form-select ${errors.batchYear ? 'error' : ''}`}
                      value={form.batchYear}
                      onChange={e => setF('batchYear', e.target.value)}
                    >
                      <option value="">Select batch</option>
                      {BATCH_YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                    {errors.batchYear && <span className="form-error">{errors.batchYear}</span>}
                  </div>

                  {/* Start Date */}
                  <div className="form-group">
                    <label className="form-label required">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className={`form-input ${errors.startDate ? 'error' : ''}`}
                      value={form.startDate}
                      onChange={e => setF('startDate', e.target.value)}
                    />
                    {errors.startDate && <span className="form-error">{errors.startDate}</span>}
                  </div>

                  {/* End Date */}
                  <div className="form-group">
                    <label className="form-label required">End Date & Time</label>
                    <input
                      type="datetime-local"
                      className={`form-input ${errors.endDate ? 'error' : ''}`}
                      value={form.endDate}
                      onChange={e => setF('endDate', e.target.value)}
                    />
                    {errors.endDate && <span className="form-error">{errors.endDate}</span>}
                  </div>

                  {/* Duration */}
                  <div className="form-group">
                    <label className="form-label required">Duration</label>
                    <select
                      className={`form-select ${errors.duration ? 'error' : ''}`}
                      value={form.duration}
                      onChange={e => setF('duration', e.target.value)}
                    >
                      {DURATIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                    {errors.duration && <span className="form-error">{errors.duration}</span>}
                  </div>

                  {/* Total Marks */}
                  <div className="form-group">
                    <label className="form-label">Total Marks</label>
                    <input
                      type="number" min="10" max="500"
                      className="form-input"
                      value={form.totalMarks}
                      onChange={e => setF('totalMarks', e.target.value)}
                    />
                  </div>

                  {/* Pass Mark */}
                  <div className="form-group">
                    <label className="form-label">Pass Mark</label>
                    <input
                      type="number" min="1"
                      className="form-input"
                      value={form.passMark}
                      onChange={e => setF('passMark', e.target.value)}
                    />
                  </div>

                  {/* Languages */}
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

                  {/* Description */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Description / Instructions</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Add any special instructions or notes for this exam…"
                      value={form.description}
                      onChange={e => setF('description', e.target.value)}
                    />
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Exam Sections ─────────────────────────────────────── */}
          {examType && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-header">
                <span className="panel-title">
                  <span style={{ color: '#185FA5', marginRight: 8 }}>3</span>
                  Exam Sections
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Pre-selected based on exam type. You can adjust.
                </span>
              </div>
              <div className="panel-body">
                <SectionToggle
                  sections={sections}
                  onChange={(key, val) => setSections(p => ({ ...p, [key]: val }))}
                />
                {errors.sections && <p className="form-error" style={{ marginTop: 8 }}>{errors.sections}</p>}
                <div style={{
                  marginTop: 16, padding: '10px 14px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 8, fontSize: 12,
                  color: 'var(--color-text-muted)', lineHeight: 1.6,
                }}>
                  <strong>Student flow:</strong>&nbsp;
                  ID Verification → Instructions →  Geolocation + Resume →  App Key →&nbsp;
                  {[
                    sections.mcq    && 'MCQ',
                    sections.sql    && 'SQL',
                    sections.coding && 'Coding',
                    sections.viva   && 'AI Viva',
                  ].filter(Boolean).join(' → ')}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Exam Key Preview ──────────────────────────────────── */}
          {examType && examKey && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-header">
                <span className="panel-title">
                  <span style={{ color: '#185FA5', marginRight: 8 }}>4</span>
                  Generated Exam Key
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExamKey(generateExamKey(examType, form.college))}
                >
                  ↺ Regenerate
                </button>
              </div>
              <div className="panel-body">
                <ExamKeyBanner examKey={examKey} examType={examType} />
              </div>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────────── */}
          {examType && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
              <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ minWidth: 160 }}
              >
                {submitting ? 'Creating…' : '🚀 Create Exam & Send Key'}
              </button>
            </div>
          )}

        </div>
      </main>
      <ToastContainer />
    </div>
  );
}