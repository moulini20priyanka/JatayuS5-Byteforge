// src/pages/CreateExam.jsx
// Fixes:
//   1. Exam purpose (Placement/Hiring/Certification/University) stored correctly
//   2. QB list filtered by selected purpose
//   3. Adaptive Questioning panel with Easy/Medium/Hard count inputs (not %)
//   4. Consistent blue-white professional theme matching Dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const safeJSON = (v, fb) => {
  if (!v) return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
};

// ── Design tokens — Blue/White professional theme ─────────────────────────────
const T = {
  primary:    '#1e3a8a',
  accent:     '#2563eb',
  accentLt:   '#eff6ff',
  accentBd:   '#bfdbfe',
  accentHov:  '#1d4ed8',
  text:       '#1e293b',
  text2:      '#475569',
  text3:      '#94a3b8',
  border:     '#e2e8f0',
  bg:         '#f0f7ff',
  white:      '#ffffff',
  green:      '#059669',
  greenBg:    '#ecfdf5',
  greenBd:    '#6ee7b7',
  amber:      '#d97706',
  amberBg:    '#fffbeb',
  amberBd:    '#fcd34d',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  redBd:      '#fca5a5',
};

// Exam purpose config — what maps to what DB value + which QB types show
const EXAM_PURPOSES = [
  {
    key:       'placement',
    label:     '💼 Placement',
    dbValue:   'placement',
    desc:      'Campus drives, off-campus hiring assessments',
    showTypes: ['placement', 'general', 'placement'],   // QB examType values to include
  },

  {
    key:       'certification',
    label:     '🏆 Certification',
    dbValue:   'skill_cert',
    desc:      'Skill certifications, professional badges',
    showTypes: ['skill_cert', 'skill_certification', 'certification', 'general'],
  },
  {
    key:       'university',
    label:     '🎓 University',
    dbValue:   'university',
    desc:      'Academic exams, semester assessments',
    showTypes: ['university', 'academic', 'general'],
  },
];

const QB_TYPE_COLORS = {
  mcq:      { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
  sql:      { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  coding:   { color:'#d97706', bg:'#fffbeb', border:'#fcd34d' },
  aptitude: { color:'#0891b2', bg:'#f0f9ff', border:'#bae6fd' },
  verbal:   { color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8' },
};

const COLLEGES    = ['RMKEC','RMDEC','RMKCET'];
const BATCH_YEARS = ['2023','2024','2025','2026','2027','2028'];
const CODING_LANGS= ['Python','Java','JavaScript','C','C++','TypeScript','Go','Kotlin'];

// ── Shared UI components ──────────────────────────────────────────────────────
function TypeChip({ type }) {
  const m = QB_TYPE_COLORS[(type||'').toLowerCase()] || { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' };
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
      background:m.bg, border:`1px solid ${m.border}`, color:m.color }}>
      {(type||'').toUpperCase()}
    </span>
  );
}

function FLabel({ children, required }) {
  return (
    <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#334155', marginBottom:6 }}>
      {children}{required && <span style={{ color:T.red, marginLeft:3 }}>*</span>}
    </label>
  );
}
function FErr({ msg }) {
  return msg ? <div style={{ fontSize:11, color:T.red, marginTop:4 }}>⚠ {msg}</div> : null;
}

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width:42, height:24, borderRadius:12, cursor:'pointer',
      position:'relative', background:on ? T.accent : '#cbd5e1', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:4, width:16, height:16, borderRadius:'50%',
        background:'#fff', transition:'left 0.2s', left:on ? 22 : 4,
        boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </div>
  );
}

function Panel({ num, title, children, badge }) {
  return (
    <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
      boxShadow:'0 2px 8px rgba(37,99,235,0.06)', marginBottom:16, overflow:'hidden' }}>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`,
        background:'linear-gradient(to right,#f0f7ff,#fff)',
        display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ width:26, height:26, borderRadius:'50%',
          background:T.accent, color:'#fff', fontSize:11.5, fontWeight:800,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {num}
        </span>
        <span style={{ fontSize:13.5, fontWeight:700, color:T.primary }}>{title}</span>
        {badge && (
          <span style={{ marginLeft:'auto', fontSize:10.5, fontWeight:700, padding:'2px 10px',
            borderRadius:99, background:T.accentLt, color:T.accent, border:`1px solid ${T.accentBd}` }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessPage({ exam, navigate }) {
  return (
    <div style={{ maxWidth:540, margin:'0 auto' }}>
      <div style={{ background:T.white, borderRadius:14, border:`1px solid ${T.border}`,
        boxShadow:'0 4px 24px rgba(37,99,235,0.1)', overflow:'hidden' }}>
        <div style={{ background:`linear-gradient(135deg,${T.primary},${T.accent})`,
          padding:'32px 32px 44px', textAlign:'center' }}>
          <div style={{ width:62, height:62, borderRadius:'50%',
            background:'rgba(255,255,255,0.18)', border:'2px solid rgba(255,255,255,0.38)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M20 6L9 17L4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:21, fontWeight:800, color:'#fff', marginBottom:6 }}>
            Exam Created Successfully!
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.6 }}>
            Students have been assigned and notified via email.
          </div>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <div style={{ background:T.accentLt, border:`1px solid ${T.accentBd}`,
            borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:9.5, fontWeight:700, color:T.accent, letterSpacing:'0.5px', marginBottom:12 }}>
              EXAM SUMMARY
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Title',     exam.title],
                ['College',   exam.college],
                ['Batch',     exam.batchYear],
                ['Duration',  `${exam.duration} min`],
                ['Questions', exam.questions_saved || '—'],
                ['Students',  exam.student_count || 0],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10, color:T.text3, fontWeight:600 }}>{k}</div>
                  <div style={{ fontSize:12.5, color:T.text, fontWeight:600, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:9 }}>
            <button onClick={() => navigate('/admin-dashboard')}
              style={{ flex:1, padding:'10px', border:`1.5px solid ${T.border}`,
                background:T.white, borderRadius:8, fontSize:13, fontWeight:600, color:T.text2, cursor:'pointer' }}>
              Dashboard
            </button>
            <button onClick={() => navigate('/admin-exams')}
              style={{ flex:2, padding:'10px',
                background:`linear-gradient(135deg,${T.primary},${T.accent})`,
                border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
              View All Exams
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const preselect = location.state?.preselectedSession || null;

  // ── State ─────────────────────────────────────────────────────────────────
  const [qbSessions,      setQBSessions]    = useState([]);
  const [approvedReqs,    setApprovedReqs]  = useState([]);
  const [loadingQB,       setLoadingQB]     = useState(true);
  const [selectedSession, setSession]       = useState(null);
  const [sessionDetail,   setSessionDetail] = useState(null);
  const [loadingDetail,   setLoadingDetail] = useState(false);

  // Purpose selection — drives DB value + QB filter
  const [selectedPurpose, setSelectedPurpose] = useState('placement'); // key from EXAM_PURPOSES

  const [form, setForm] = useState({
    title:'', college:'', batchYear:'',
    startDate:'', endDate:'',
    duration:'60', totalMarks:'100', passMark:'40', description:'',
    codingLanguages:['Python','Java'],
  });

  const [allotment,       setAllotment]      = useState({});
  const [sectionsEnabled, setSectionsEnabled] = useState({});

  // Adaptive questioning
  const [adaptiveOn,     setAdaptiveOn]     = useState(true);
  const [adaptiveCounts, setAdaptiveCounts] = useState({ easy: 10, medium: 15, hard: 5 });

  const [cutoffEnabled,  setCutoffEnabled]  = useState(false);
  const [cutoffs,        setCutoffs]        = useState({});
  const [overallCutoff,  setOverallCutoff]  = useState('');
  const [errors,         setErrors]         = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [createdExam,    setCreatedExam]    = useState(null);

  const setF = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const purposeConfig = EXAM_PURPOSES.find(p => p.key === selectedPurpose) || EXAM_PURPOSES[0];

  // QB sessions filtered by selected purpose
  const filteredQBSessions = qbSessions.filter(s => {
    const type = (s.examType || 'placement').toLowerCase();
    return purposeConfig.showTypes.includes(type);
  });

  // Load QB sessions
  useEffect(() => {
    fetch(`${API}/api/question-bank/exam-names`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setQBSessions(d.qbSessions || []);
          setApprovedReqs(d.approvedRequests || []);
        }
        setLoadingQB(false);
      })
      .catch(() => setLoadingQB(false));
  }, []);

  // Pre-select session from QB page navigation
  useEffect(() => {
    if (preselect && qbSessions.length > 0) {
      const found = qbSessions.find(s => s.sessionCode === preselect.sessionCode);
      if (found) handleSelectSession(found);
    }
  }, [preselect, qbSessions]);

  // When purpose changes, clear session if it no longer fits the filter
  useEffect(() => {
    if (selectedSession) {
      const type = (selectedSession.examType || 'placement').toLowerCase();
      const cfg  = EXAM_PURPOSES.find(p => p.key === selectedPurpose);
      if (cfg && !cfg.showTypes.includes(type)) {
        setSession(null);
        setSessionDetail(null);
        setAllotment({});
        setSectionsEnabled({});
      }
    }
  }, [selectedPurpose]);

  async function handleSelectSession(s) {
    setSession(s);
    setForm(p => ({ ...p, title: s.examName }));
    setLoadingDetail(true);
    try {
      const res  = await fetch(`${API}/api/question-bank/sessions/${s.sessionCode}`, { headers: authHeader() });
      const data = await res.json();
      setSessionDetail(data);

      const newAllotment = {}, newEnabled = {};
      if (data.totalByType) {
        data.totalByType.forEach(({ type, count }) => {
          newAllotment[type] = Math.min(count, 10);
          newEnabled[type]   = true;
        });
      }
      setAllotment(newAllotment);
      setSectionsEnabled(newEnabled);

      // Auto-fill from linked request
      if (s.examRequestId) {
        const req = approvedReqs.find(r => r.id === s.examRequestId);
        if (req) {
          setForm(p => ({
            ...p,
            college:   req.college || p.college,
            batchYear: req.batchYear?.toString() || p.batchYear,
          }));
          if (req.cutoffRequired) { setCutoffEnabled(true); setCutoffs(req.cutoffs || {}); }
        }
      }

      // Sync adaptive counts with mcq allotment
      if (newAllotment.mcq) {
        const total = newAllotment.mcq;
        setAdaptiveCounts({
          easy:   Math.round(total * 0.3),
          medium: Math.round(total * 0.5),
          hard:   Math.round(total * 0.2),
        });
      }
    } catch { }
    setLoadingDetail(false);
  }

  // Adaptive: total questions from counts
  const adaptiveTotal = adaptiveOn
    ? (adaptiveCounts.easy + adaptiveCounts.medium + adaptiveCounts.hard)
    : (allotment.mcq || 0);

  function validate() {
    const e = {};
    if (!selectedSession)               e.qbSession = 'Select a Question Bank';
    if (!form.title.trim())             e.title     = 'Exam title required';
    if (!form.college)                  e.college   = 'Select a college';
    if (!form.batchYear)                e.batchYear = 'Select a batch year';
    if (!form.startDate)                e.startDate = 'Start date required';
    if (!form.endDate)                  e.endDate   = 'End date required';
    if (!form.duration || +form.duration <= 0) e.duration = 'Duration required';
    const enabledTypes = Object.entries(sectionsEnabled).filter(([,v]) => v);
    if (enabledTypes.length === 0)      e.sections  = 'Enable at least one section';
    if (adaptiveOn && sectionsEnabled.mcq) {
      const mcqAvail = (sessionDetail?.totalByType || []).find(t => t.type === 'mcq')?.count || 0;
      if (adaptiveTotal > mcqAvail)
        e.adaptive = `Total (${adaptiveTotal}) exceeds available MCQ questions (${mcqAvail})`;
      if (adaptiveCounts.easy < 0 || adaptiveCounts.medium < 0 || adaptiveCounts.hard < 0)
        e.adaptive = 'Counts cannot be negative';
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');

      const sectionConfig = {};
      Object.entries(sectionsEnabled).forEach(([type, enabled]) => {
        if (!enabled) return;
        const qCount = (type === 'mcq' && adaptiveOn) ? adaptiveTotal : (allotment[type] || 5);
        sectionConfig[type] = { questions: qCount, minutes: 20 };
      });

      // Build mcq_difficulty as percentages from counts (backend expects %)
      let mcqDiffPayload = { easy: 30, medium: 50, hard: 20 };
      if (adaptiveOn && adaptiveTotal > 0) {
        mcqDiffPayload = {
          easy:   Math.round((adaptiveCounts.easy   / adaptiveTotal) * 100),
          medium: Math.round((adaptiveCounts.medium / adaptiveTotal) * 100),
          hard:   100 - Math.round((adaptiveCounts.easy / adaptiveTotal) * 100)
                      - Math.round((adaptiveCounts.medium / adaptiveTotal) * 100),
        };
      }

      const body = {
        // FIX: use purposeConfig.dbValue so "Hiring" → "placement", "Certification" → "skill_cert"
        exam_type:                  purposeConfig.dbValue,
        title:                      form.title,
        college:                    form.college,
        batch_year:                 form.batchYear,
        start_date:                 form.startDate,
        end_date:                   form.endDate,
        duration_minutes:           form.duration,
        total_marks:                form.totalMarks,
        pass_mark:                  form.passMark,
        description:                form.description,
        sections:                   JSON.stringify(
          Object.fromEntries(
            Object.entries(sectionsEnabled).filter(([,v]) => v).map(([k]) => [k, true])
          )
        ),
        section_config:             JSON.stringify(sectionConfig),
        adaptive_mcq:               adaptiveOn ? 1 : 0,
        mcq_difficulty:             JSON.stringify(mcqDiffPayload),
        // Store the easy/medium/hard counts as well for display
        adaptive_counts:            JSON.stringify(adaptiveCounts),
        cutoff_enabled:             cutoffEnabled ? 1 : 0,
        cutoffs:                    JSON.stringify(cutoffs),
        cutoff_score:               overallCutoff || '',
        question_bank_session_code: selectedSession.sessionCode,
        allowed_languages:          JSON.stringify(form.codingLanguages),
        exam_request_id:            selectedSession.examRequestId || '',
      };

      const res  = await fetch(`${API}/api/exams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:   JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Exam creation failed');

      setCreatedExam({
        ...data,
        title:     form.title,
        college:   form.college,
        batchYear: form.batchYear,
        duration:  form.duration,
      });
      setSubmitted(true);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const inp = (err) => ({
    width:'100%', padding:'9px 12px',
    border:`1.5px solid ${err ? T.red : T.border}`,
    borderRadius:8, fontSize:13, color:T.text,
    background:T.white, outline:'none', boxSizing:'border-box', fontFamily:'inherit',
  });

  if (submitted && createdExam) {
    return (
      <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh', background:T.bg }}>
        <Sidebar/><Navbar/>
        <main style={{ flex:1, overflow:'auto', padding:'40px 24px' }}>
          <SuccessPage exam={createdExam} navigate={navigate}/>
        </main>
      </div>
    );
  }

  const mcqAvailableCount = (sessionDetail?.totalByType || []).find(t => t.type === 'mcq')?.count || 0;

  return (
    <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh',
      background:T.bg, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar/><Navbar/>
      <main style={{ flex:1, overflow:'auto', padding:'22px 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>

          {/* Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, fontSize:12, color:T.text3 }}>
            <span style={{ color:T.accent, cursor:'pointer' }}
              onClick={() => navigate('/admin-dashboard')}>Dashboard</span>
            <span>›</span>
            <span style={{ fontWeight:600, color:T.text }}>Create Exam</span>
          </div>

          <div style={{ marginBottom:20 }}>
            <h1 style={{ fontSize:20, fontWeight:800, color:T.primary, margin:0 }}>Create Exam</h1>
            <p style={{ fontSize:13, color:T.text3, marginTop:4 }}>
              Select exam purpose, choose a Question Bank, configure sections and deploy.
            </p>
          </div>

          {/* ── PANEL 1: Exam Purpose ──────────────────────────────────────── */}
          <Panel num="1" title="Select Exam Purpose">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {EXAM_PURPOSES.map(p => {
                const active = selectedPurpose === p.key;
                return (
                  <div key={p.key}
                    onClick={() => setSelectedPurpose(p.key)}
                    style={{ padding:'14px 16px', borderRadius:10, cursor:'pointer',
                      border:`2px solid ${active ? T.accent : T.border}`,
                      background:active ? T.accentLt : T.white,
                      transition:'all 0.15s', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                      border:`2px solid ${active ? T.accent : '#cbd5e1'}`,
                      background:active ? T.accent : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:active ? T.accent : T.text }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12, padding:'9px 14px', background:T.accentLt,
              border:`1px solid ${T.accentBd}`, borderRadius:8, fontSize:12, color:T.accent }}>
              <strong>Selected:</strong> {purposeConfig.label} — stored as{' '}
              <code style={{ fontFamily:'monospace', fontWeight:700 }}>{purposeConfig.dbValue}</code> in DB.
              Showing Question Banks of type:{' '}
              <strong>{purposeConfig.showTypes.join(', ')}</strong>
            </div>
          </Panel>

          {/* ── PANEL 2: Select Question Bank (filtered by purpose) ───────── */}
          <Panel num="2" title="Select Question Bank"
            badge={`${filteredQBSessions.length} available for ${purposeConfig.label}`}>
            {loadingQB ? (
              <div style={{ padding:'24px 0', textAlign:'center', color:T.text3, fontSize:13 }}>
                Loading question banks…
              </div>
            ) : filteredQBSessions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'28px 0' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
                <div style={{ fontSize:13, color:T.text3, marginBottom:6 }}>
                  No Question Banks found for <strong>{purposeConfig.label}</strong>.
                </div>
                <div style={{ fontSize:12, color:T.text3, marginBottom:16 }}>
                  {qbSessions.length > 0
                    ? `${qbSessions.length} banks exist but none match this purpose type.`
                    : 'Generate questions in the Question Bank first.'}
                </div>
                <button onClick={() => navigate('/question-bank')}
                  style={{ padding:'9px 20px', borderRadius:8,
                    background:`linear-gradient(135deg,${T.primary},${T.accent})`,
                    color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Go to Question Bank →
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:11.5, color:T.text3, marginBottom:12 }}>
                  Showing Question Banks matching <strong>{purposeConfig.label}</strong> purpose.
                  Select one to use for this exam.
                </div>
                <div style={{ display:'grid', gap:8 }}>
                  {filteredQBSessions.map(s => {
                    const active = selectedSession?.sessionCode === s.sessionCode;
                    return (
                      <div key={s.sessionCode} onClick={() => handleSelectSession(s)}
                        style={{ padding:'14px 18px', borderRadius:10, cursor:'pointer',
                          border:`1.5px solid ${active ? T.accent : T.border}`,
                          background:active ? T.accentLt : T.white,
                          transition:'all 0.15s', display:'flex', alignItems:'flex-start', gap:14 }}>
                        {/* Radio */}
                        <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, marginTop:2,
                          border:`2px solid ${active ? T.accent : '#cbd5e1'}`,
                          background:active ? T.accent : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                            <span style={{ fontSize:10.5, fontFamily:'monospace', fontWeight:700,
                              color:active ? T.accent : T.primary, background:'#eff6ff',
                              padding:'2px 8px', borderRadius:4 }}>
                              {s.sessionCode}
                            </span>
                            <span style={{ fontSize:13.5, fontWeight:700, color:active ? T.accent : T.text }}>
                              {s.examName}
                            </span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, color:T.text3, fontWeight:600, background:'#f0f9ff',
                              border:'1px solid #bae6fd', borderRadius:99, padding:'1px 8px',
                              color:'#0891b2' }}>
                              {s.examType || 'placement'}
                            </span>
                            {(s.types || []).map(t => <TypeChip key={t} type={t}/>)}
                            <span style={{ fontSize:11, color:T.text3 }}>·</span>
                            <span style={{ fontSize:11, fontWeight:700, color:T.accent }}>
                              {s.totalQuestions} questions
                            </span>
                            {s.topicsSummary && (
                              <span style={{ fontSize:11, color:T.text3, overflow:'hidden',
                                textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
                                · {s.topicsSummary}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:T.text3, flexShrink:0, whiteSpace:'nowrap' }}>
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FErr msg={errors.qbSession}/>
              </>
            )}
          </Panel>

          {/* ── PANEL 3: Section Allotment ────────────────────────────────── */}
          {selectedSession && (
            <Panel num="3" title="Question Allotment per Section">
              <div style={{ background:T.accentLt, border:`1px solid ${T.accentBd}`,
                borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:T.text }}>
                <strong>Question Bank has {selectedSession.totalQuestions} questions.</strong>{' '}
                Set how many to <strong>allot per student</strong> per section — system randomises per student.
              </div>

              {loadingDetail ? (
                <div style={{ padding:'20px 0', textAlign:'center', color:T.text3, fontSize:12 }}>
                  Loading question breakdown…
                </div>
              ) : sessionDetail?.totalByType?.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {sessionDetail.totalByType.map(({ type, count }) => {
                    const on   = !!sectionsEnabled[type];
                    const allot= allotment[type] || 1;
                    const m    = QB_TYPE_COLORS[type.toLowerCase()] || { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' };
                    return (
                      <div key={type}
                        style={{ border:`1.5px solid ${on ? m.border : T.border}`, borderRadius:10,
                          background:on ? m.bg + '33' : '#fafafa', overflow:'hidden', transition:'all 0.18s' }}>
                        <div style={{ display:'flex', alignItems:'center',
                          justifyContent:'space-between', padding:'13px 16px', flexWrap:'wrap', gap:10 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Toggle on={on} onToggle={() => setSectionsEnabled(p => ({ ...p, [type]: !p[type] }))}/>
                            <TypeChip type={type}/>
                            <span style={{ fontSize:12, color:T.text3 }}>{count} in bank</span>
                          </div>
                          {on && (
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:11.5, fontWeight:600, color:T.text2 }}>Allot:</span>
                              <button onClick={() => setAllotment(p => ({ ...p, [type]: Math.max(1,(p[type]||1)-1) }))}
                                style={{ width:26, height:26, borderRadius:5, border:`1px solid ${m.border}`,
                                  background:'#fff', color:m.color, fontSize:16, cursor:'pointer',
                                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>−</button>
                              <input type="number" min={1} max={count} value={allot}
                                onChange={e => setAllotment(p => ({ ...p, [type]: Math.max(1,Math.min(count,parseInt(e.target.value)||1)) }))}
                                style={{ width:54, textAlign:'center', border:`1px solid ${m.border}`,
                                  borderRadius:5, padding:'4px', fontSize:13, fontWeight:700,
                                  color:m.color, outline:'none' }}/>
                              <button onClick={() => setAllotment(p => ({ ...p, [type]: Math.min(count,(p[type]||1)+1) }))}
                                style={{ width:26, height:26, borderRadius:5, border:`1px solid ${m.border}`,
                                  background:'#fff', color:m.color, fontSize:16, cursor:'pointer',
                                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>+</button>
                              <span style={{ fontSize:11, color:T.text3 }}>/ {count}</span>
                              {allot < count && (
                                <span style={{ fontSize:10.5, color:T.green, fontWeight:600,
                                  background:T.greenBg, padding:'2px 7px', borderRadius:99,
                                  border:`1px solid ${T.greenBd}` }}>Randomised</span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Coding languages */}
                        {on && type === 'coding' && (
                          <div style={{ borderTop:`1px solid ${m.border}`, padding:'10px 16px', background:'#fff' }}>
                            <div style={{ fontSize:10.5, fontWeight:700, color:T.text2, marginBottom:7 }}>
                              Allowed Languages
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                              {CODING_LANGS.map(l => {
                                const active = form.codingLanguages.includes(l);
                                return (
                                  <button key={l}
                                    onClick={() => setF('codingLanguages',
                                      active ? form.codingLanguages.filter(x => x !== l)
                                             : [...form.codingLanguages, l])}
                                    style={{ padding:'4px 11px', borderRadius:99, fontSize:11.5,
                                      border:`1px solid ${active ? T.accentBd : T.border}`,
                                      background:active ? T.accentLt : '#fff',
                                      color:active ? T.accent : T.text3,
                                      fontWeight:active ? 700 : 400, cursor:'pointer' }}>
                                    {l}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize:12, color:T.text3, padding:'16px 0' }}>
                  No question breakdown available for this session.
                </div>
              )}
              <FErr msg={errors.sections}/>

              {/* Allotment summary */}
              {Object.entries(sectionsEnabled).some(([,v]) => v) && (
                <div style={{ marginTop:12, padding:'10px 14px',
                  background:T.accentLt, border:`1px solid ${T.accentBd}`,
                  borderRadius:8, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:T.text3 }}>STUDENT GETS:</span>
                  {Object.entries(sectionsEnabled).filter(([,v]) => v).map(([type]) => (
                    <span key={type} style={{ fontSize:12, color:T.text }}>
                      <strong style={{ color:QB_TYPE_COLORS[type]?.color || T.accent }}>
                        {type === 'mcq' && adaptiveOn ? adaptiveTotal : (allotment[type] || 0)} {type.toUpperCase()}
                      </strong>
                    </span>
                  ))}
                  <span style={{ marginLeft:'auto', fontSize:13, fontWeight:800, color:T.accent }}>
                    Total:{' '}
                    {Object.entries(sectionsEnabled).filter(([,v]) => v).reduce((s,[t]) =>
                      s + (t === 'mcq' && adaptiveOn ? adaptiveTotal : (allotment[t] || 0)), 0)}{' '}
                    questions
                  </span>
                </div>
              )}
            </Panel>
          )}

          {/* ── PANEL 4: Exam Details ─────────────────────────────────────── */}
          <Panel num="4" title="Exam Details">
            <div style={{ display:'grid', gap:14 }}>
              <div>
                <FLabel required>Exam Title</FLabel>
                <input style={inp(errors.title)} value={form.title}
                  onChange={e => setF('title', e.target.value)}
                  placeholder="e.g. Infosys — Full Stack Developer Assessment"/>
                <FErr msg={errors.title}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <FLabel required>Target College</FLabel>
                  <select style={inp(errors.college)} value={form.college}
                    onChange={e => setF('college', e.target.value)}>
                    <option value="">Select college…</option>
                    {COLLEGES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <FErr msg={errors.college}/>
                </div>
                <div>
                  <FLabel required>Batch Year</FLabel>
                  <select style={inp(errors.batchYear)} value={form.batchYear}
                    onChange={e => setF('batchYear', e.target.value)}>
                    <option value="">Select batch…</option>
                    {BATCH_YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                  <FErr msg={errors.batchYear}/>
                </div>
                <div>
                  <FLabel required>Start Date & Time</FLabel>
                  <input type="datetime-local" style={inp(errors.startDate)}
                    value={form.startDate} onChange={e => setF('startDate', e.target.value)}/>
                  <FErr msg={errors.startDate}/>
                </div>
                <div>
                  <FLabel required>End Date & Time</FLabel>
                  <input type="datetime-local" style={inp(errors.endDate)}
                    value={form.endDate} onChange={e => setF('endDate', e.target.value)}/>
                  <FErr msg={errors.endDate}/>
                </div>
                <div>
                  <FLabel required>Duration (minutes)</FLabel>
                  <input type="number" min="1" style={inp(errors.duration)}
                    value={form.duration} onChange={e => setF('duration', e.target.value)}/>
                  <FErr msg={errors.duration}/>
                </div>
                <div>
                  <FLabel>Pass / Total Marks</FLabel>
                  <div style={{ display:'flex', gap:8 }}>
                    <input type="number" style={inp()} value={form.passMark}
                      onChange={e => setF('passMark', e.target.value)} placeholder="Pass"/>
                    <input type="number" style={inp()} value={form.totalMarks}
                      onChange={e => setF('totalMarks', e.target.value)} placeholder="Total"/>
                  </div>
                </div>
              </div>
              <div>
                <FLabel>Instructions / Description</FLabel>
                <textarea rows={3} style={{ ...inp(), resize:'vertical' }}
                  value={form.description} onChange={e => setF('description', e.target.value)}
                  placeholder="Add exam instructions for students…"/>
              </div>
            </div>
          </Panel>

          {/* ── PANEL 5: Adaptive Questioning ────────────────────────────── */}
          {sectionsEnabled.mcq && (
            <Panel num="5" title="Adaptive Questioning — MCQ">
              {/* ON/OFF toggle row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 16px', background:'#f8fafc', borderRadius:10,
                border:`1px solid ${T.border}`, marginBottom:adaptiveOn ? 18 : 0 }}>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:T.text }}>
                    Adaptive Questioning
                  </div>
                  <div style={{ fontSize:11.5, color:T.text3, marginTop:2 }}>
                    When ON — select exact counts per difficulty level.
                    When OFF — questions are randomly picked from the full pool.
                  </div>
                </div>
                <Toggle on={adaptiveOn} onToggle={() => setAdaptiveOn(v => !v)}/>
              </div>

              {adaptiveOn && (
                <>
                  <div style={{ fontSize:12, color:T.text2, marginBottom:14, lineHeight:1.6 }}>
                    Set how many questions of each difficulty to include for MCQ.
                    Available in bank:{' '}
                    <strong style={{ color:T.accent }}>{mcqAvailableCount} MCQ questions</strong>
                  </div>

                  {/* Difficulty count cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                    {[
                      { key:'easy',   label:'Easy',   color:T.green, bg:T.greenBg, border:T.greenBd,
                        icon:'🟢', desc:'Fundamental recall questions' },
                      { key:'medium', label:'Medium', color:T.amber, bg:T.amberBg, border:T.amberBd,
                        icon:'🟡', desc:'Applied understanding questions' },
                      { key:'hard',   label:'Hard',   color:T.red,   bg:T.redBg,   border:T.redBd,
                        icon:'🔴', desc:'Analytical & reasoning questions' },
                    ].map(d => {
                      const val = adaptiveCounts[d.key];
                      return (
                        <div key={d.key}
                          style={{ borderRadius:12, border:`1.5px solid ${d.border}`,
                            background:d.bg, padding:'16px 14px', textAlign:'center' }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>{d.icon}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:d.color, marginBottom:2 }}>
                            {d.label}
                          </div>
                          <div style={{ fontSize:10, color:T.text3, marginBottom:10, lineHeight:1.4 }}>
                            {d.desc}
                          </div>
                          {/* Stepper */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                            <button
                              onClick={() => setAdaptiveCounts(p => ({ ...p, [d.key]: Math.max(0, p[d.key] - 1) }))}
                              style={{ width:28, height:28, borderRadius:6,
                                border:`1px solid ${d.border}`, background:'#fff',
                                color:d.color, fontSize:18, cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontWeight:700, lineHeight:1 }}>
                              −
                            </button>
                            <input
                              type="number" min={0} max={mcqAvailableCount}
                              value={val}
                              onChange={e => setAdaptiveCounts(p => ({
                                ...p,
                                [d.key]: Math.max(0, Math.min(mcqAvailableCount, parseInt(e.target.value) || 0)),
                              }))}
                              style={{ width:52, textAlign:'center', fontWeight:800, fontSize:20,
                                padding:'5px', borderRadius:7,
                                border:`1px solid ${d.border}`,
                                background:'#fff', color:d.color, outline:'none' }}
                            />
                            <button
                              onClick={() => setAdaptiveCounts(p => ({ ...p, [d.key]: Math.min(mcqAvailableCount, p[d.key] + 1) }))}
                              style={{ width:28, height:28, borderRadius:6,
                                border:`1px solid ${d.border}`, background:'#fff',
                                color:d.color, fontSize:18, cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontWeight:700, lineHeight:1 }}>
                              +
                            </button>
                          </div>
                          <div style={{ fontSize:10, color:T.text3, marginTop:6 }}>
                            questions
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary bar */}
                  <div style={{ padding:'10px 16px', background:T.accentLt,
                    border:`1px solid ${T.accentBd}`, borderRadius:8,
                    display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:T.text3 }}>TOTAL MCQ:</span>
                    <span style={{ fontSize:16, fontWeight:800,
                      color: adaptiveTotal > mcqAvailableCount ? T.red : T.accent }}>
                      {adaptiveTotal}
                    </span>
                    {adaptiveTotal > 0 && (
                      <>
                        <span style={{ fontSize:11, color:T.text3 }}>Distribution:</span>
                        {[
                          { label:'Easy',   val:adaptiveCounts.easy,   color:T.green },
                          { label:'Medium', val:adaptiveCounts.medium, color:T.amber },
                          { label:'Hard',   val:adaptiveCounts.hard,   color:T.red   },
                        ].map(d => (
                          <span key={d.label} style={{ fontSize:12, color:d.color, fontWeight:600 }}>
                            {d.label}: {d.val}
                            {adaptiveTotal > 0 && (
                              <span style={{ fontSize:10, color:T.text3, fontWeight:400 }}>
                                {' '}({Math.round((d.val / adaptiveTotal) * 100)}%)
                              </span>
                            )}
                          </span>
                        ))}
                      </>
                    )}
                    {adaptiveTotal > mcqAvailableCount && (
                      <span style={{ marginLeft:'auto', fontSize:11, color:T.red, fontWeight:600 }}>
                        ⚠ Exceeds {mcqAvailableCount} available
                      </span>
                    )}
                    {adaptiveTotal <= mcqAvailableCount && adaptiveTotal > 0 && (
                      <span style={{ marginLeft:'auto', fontSize:11, color:T.green, fontWeight:600 }}>
                        ✓ Within pool size
                      </span>
                    )}
                  </div>
                  <FErr msg={errors.adaptive}/>
                </>
              )}
            </Panel>
          )}

          {/* ── PANEL 6: Sectional Cutoffs ───────────────────────────────── */}
          <Panel num={sectionsEnabled.mcq ? '6' : '5'} title="Sectional Cutoffs">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:cutoffEnabled ? 16 : 0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
                  Require minimum score per section
                </div>
                <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>
                  Students below cutoff in any section will not advance
                </div>
              </div>
              <Toggle on={cutoffEnabled} onToggle={() => setCutoffEnabled(v => !v)}/>
            </div>
            {cutoffEnabled && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',
                  gap:11, marginBottom:14 }}>
                  {Object.entries(sectionsEnabled).filter(([,v]) => v).map(([type]) => {
                    const m = QB_TYPE_COLORS[type] || { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' };
                    return (
                      <div key={type}>
                        <div style={{ fontSize:10.5, fontWeight:700, color:m.color,
                          marginBottom:6, textTransform:'uppercase' }}>
                          {type} (%)
                        </div>
                        <div style={{ position:'relative' }}>
                          <input type="number" min="0" max="100" value={cutoffs[type] || ''}
                            onChange={e => setCutoffs(p => ({ ...p, [type]: e.target.value }))}
                            placeholder="0–100"
                            style={{ width:'100%', textAlign:'center', fontWeight:800, fontSize:18,
                              padding:'8px 28px 8px 8px', borderRadius:7,
                              border:`1px solid ${m.border}`, background:m.bg,
                              color:m.color, outline:'none', boxSizing:'border-box' }}/>
                          <span style={{ position:'absolute', right:8, top:'50%',
                            transform:'translateY(-50%)', fontSize:11, color:T.text3 }}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <FLabel>Overall Cutoff (%){' '}
                    <span style={{ fontSize:11, color:T.text3, fontWeight:400 }}>(optional)</span>
                  </FLabel>
                  <div style={{ position:'relative', maxWidth:200 }}>
                    <input type="number" min="0" max="100" value={overallCutoff}
                      onChange={e => setOverallCutoff(e.target.value)}
                      placeholder="Leave blank = no cutoff"
                      style={{ ...inp(), paddingRight:30 }}/>
                    {overallCutoff && (
                      <span style={{ position:'absolute', right:10, top:'50%',
                        transform:'translateY(-50%)', fontSize:11, color:T.text3 }}>%</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </Panel>

          {errors.submit && (
            <div style={{ padding:'12px 16px', background:T.redBg, border:`1px solid ${T.redBd}`,
              borderRadius:8, fontSize:13, color:T.red, marginBottom:16 }}>
              ⚠ {errors.submit}
            </div>
          )}

          {/* Submit row */}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingBottom:48 }}>
            <button onClick={() => navigate(-1)}
              style={{ padding:'10px 24px', borderRadius:8, border:`1.5px solid ${T.border}`,
                background:T.white, fontSize:13, fontWeight:600, color:T.text2, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ padding:'11px 28px', borderRadius:8, border:'none', fontSize:14, fontWeight:700,
                background: submitting ? '#e2e8f0' : `linear-gradient(135deg,${T.primary},${T.accent})`,
                color: submitting ? T.text3 : '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                display:'flex', alignItems:'center', gap:7 }}>
              {submitting ? (
                <>
                  <span style={{ width:14, height:14, borderRadius:'50%',
                    border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff',
                    animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                  Creating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                  </svg>
                  Create Exam & Notify Students
                </>
              )}
            </button>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}