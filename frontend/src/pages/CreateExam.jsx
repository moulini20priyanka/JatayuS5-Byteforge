// CreateExam.jsx — Exam type selector + placement/university form
// + RIGHT-SIDE PANEL: shows created exams (live/upcoming/completed)
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const IC = {
  check:      "M20 6L9 17L4 12",
  back:       "M19 12H5M12 19l-7-7 7-7",
  upload:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  file:       "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
  trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  info:       "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  mail:       "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  key:        "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  users:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  shuffle:    "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  calendar:   "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  building:   "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4",
  sparkles:   "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 3l.9 2.1 2.1.9-2.1.9L19 9l-.9-2.1L16 6l2.1-.9zM5 17l.6 1.4 1.4.6-1.4.6L5 21l-.6-1.4L3 19l1.4-.6z",
  award:      "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  sliders:    "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  briefcase:  "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  cert:       "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  university: "M3 21h18M3 10h18M5 21V10l7-7 7 7v11",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  plus:       "M12 5v14M5 12h14",
  x:          "M18 6L6 18M6 6L18 18",
  edit:       "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  layers:     "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  lock:       "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  send:       "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  clock:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  list:       "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  chevronRight: "M9 18l6-6-6-6",
  refresh:    "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
};

const Ic = ({ d, size = 14, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const COLLEGES    = ['RMKEC', 'RMDEC', 'RMKCET'];
const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028'];
const LANGUAGES   = ['HTML', 'CSS', 'JavaScript', 'SQL', 'Java', 'Python', 'C', 'C++', 'Go', 'Kotlin', 'TypeScript'];

const DEPARTMENTS = [
  { label: 'Computer Science & Engineering', value: 'CSE' },
  { label: 'Information Technology',         value: 'IT' },
  { label: 'Electronics & Communication',    value: 'ECE' },
  { label: 'Electrical Engineering',         value: 'EEE' },
  { label: 'Mechanical Engineering',         value: 'MECH' },
  { label: 'Civil Engineering',              value: 'CIVIL' },

];

const SEMESTERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const PLACEMENT_SECTION_META = {
  mcq:        { label: "MCQ",        color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  sql:        { label: "SQL",        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  coding:     { label: "Coding",     color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  aptitude:   { label: "Aptitude",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  behavioral: { label: "Behavioral", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const UNIVERSITY_SECTION_META = {
  mcq:     { label: "MCQ",                color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  written: { label: "Written / 8-Mark",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

const PATTERN_LABELS = {
  mcq_sql_coding:  "MCQ + SQL + Coding",
  mcq_only:        "Only MCQ",
  coding_only:     "Only Coding",
  aptitude_coding: "Aptitude + Coding",
  mcq_sql:         "MCQ + SQL",
  behavioral:      "Behavioral Assessment",
  combined:        "Combined Assessment",
};

const P = {
  bg: "#f8fafc", white: "#ffffff",
  border: "#e2e8f0", text: "#0f172a", muted: "#64748b", dim: "#94a3b8",
  accent: "#7c3aed", accentDark: "#6d28d9", accentLight: "#f5f3ff", accentBorder: "#ddd6fe",
  green: "#059669", greenBg: "#ecfdf5", greenBorder: "#6ee7b7",
  red: "#dc2626", redBg: "#fef2f2",
  blue: "#2563eb", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
  orange: "#d97706", orangeBg: "#fffbeb",
};

const EXAM_TYPES = [
  {
    key: 'placement',
    label: 'Placement Exam',
    subtitle: 'Campus recruitment assessments for companies',
    icon: IC.briefcase,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    activeBg: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    features: ['MCQ, Coding, SQL, Aptitude', 'Per-student unique keys', 'Auto email to eligible students', 'Adaptive difficulty MCQ'],
  },
  {
    key: 'skill_certification',
    label: 'Skill Certification',
    subtitle: 'Certify students in specific technical skills',
    icon: IC.cert,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#6ee7b7',
    activeBg: 'linear-gradient(135deg, #059669, #047857)',
    features: ['Topic-specific assessment', 'Instant certificate generation', 'Score badge on profile', 'Multiple attempts allowed'],
  },
  {
    key: 'university',
    label: 'University Exam',
    subtitle: 'Internal college assessments and tests',
    icon: IC.university,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    activeBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    features: ['MCQ + Written 8-mark questions', 'Unique randomized paper per student', 'Semester and mid-term exams', 'PDF question bank upload'],
  },
];

const safeParse = (val, fallback = {}) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const buildDateTimeLocal = (date, time) => {
  if (!date) return '';
  const d = date.split('T')[0];
  const t = time || '09:00';
  return `${d}T${t}`;
};

function resolveAdminToken() {
  // Try all possible token key names your app might use
  const token =
    localStorage.getItem('admin_token') ||
    localStorage.getItem('recruiter_token') ||
    localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'admin';
  return { token, role };
}

// ── Exam status helpers ─────────────────────────────────────
function examStatus(exam) {
  const now = new Date();
  const start = new Date(exam.start_date);
  const end   = new Date(exam.end_date);
  if (now < start) return 'upcoming';
  if (now > end)   return 'completed';
  return 'live';
}

const STATUS_STYLES = {
  live:      { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', dot: '#059669', label: 'Live' },
  upcoming:  { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', label: 'Upcoming' },
  completed: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8', label: 'Completed' },
};

const TYPE_COLORS = {
  placement:         { color: '#7c3aed', bg: '#f5f3ff' },
  skill_cert:        { color: '#059669', bg: '#ecfdf5' },
  skill_certification: { color: '#059669', bg: '#ecfdf5' },
  university:        { color: '#2563eb', bg: '#eff6ff' },
};

// ── Created Exams Panel ─────────────────────────────────────
function CreatedExamsPanel({ open, onClose, navigate }) {
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState('all'); // all | live | upcoming | completed
  const [typeFilter,setTypeFilter]= useState('all');

  const load = async () => {
    const { token } = resolveAdminToken();
    if (!token) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/exams`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setExams(data.exams || []);
    } catch (e) { console.error('[CreatedExamsPanel]', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const filtered = exams.filter(e => {
    const s = examStatus(e);
    if (filter !== 'all' && s !== filter) return false;
    const t = e.exam_type;
    if (typeFilter !== 'all' && t !== typeFilter) return false;
    return true;
  });

  const counts = {
    live:      exams.filter(e => examStatus(e) === 'live').length,
    upcoming:  exams.filter(e => examStatus(e) === 'upcoming').length,
    completed: exams.filter(e => examStatus(e) === 'completed').length,
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 900 }} />
      )}

      {/* Slide Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420,
        background: P.white,
        zIndex: 901,
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: P.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.list} size={14} color={P.accent} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Created Exams</div>
                <div style={{ fontSize: 11, color: P.muted }}>{exams.length} total</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={load}
                style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${P.border}`, background: P.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.refresh} size={13} color={P.muted} />
              </button>
              <button onClick={onClose}
                style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${P.border}`, background: P.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.x} size={13} color={P.muted} />
              </button>
            </div>
          </div>

          {/* Status count pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[
              { key: 'all',      label: 'All',       count: exams.length },
              { key: 'live',     label: 'Live',      count: counts.live },
              { key: 'upcoming', label: 'Upcoming',  count: counts.upcoming },
              { key: 'completed',label: 'Completed', count: counts.completed },
            ].map(f => {
              const active = filter === f.key;
              const st = f.key === 'all' ? null : STATUS_STYLES[f.key];
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    flex: 1, padding: '5px 6px', borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    border: `1px solid ${active ? (st?.border || P.accentBorder) : P.border}`,
                    background: active ? (st?.bg || P.accentLight) : P.bg,
                    color: active ? (st?.color || P.accent) : P.muted,
                    transition: 'all 0.15s',
                  }}>
                  {f.label} {f.count > 0 && <span style={{ marginLeft: 3, opacity: 0.8 }}>{f.count}</span>}
                </button>
              );
            })}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { key: 'all',        label: 'All Types' },
              { key: 'placement',  label: 'Placement' },
              { key: 'university', label: 'University' },
              { key: 'skill_cert', label: 'Skill Cert' },
            ].map(f => {
              const active = typeFilter === f.key;
              const tc = TYPE_COLORS[f.key];
              return (
                <button key={f.key} onClick={() => setTypeFilter(f.key)}
                  style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${active ? (tc?.color || P.accent) + '55' : P.border}`,
                    background: active ? (tc?.bg || P.accentLight) : P.bg,
                    color: active ? (tc?.color || P.accent) : P.muted,
                    transition: 'all 0.15s',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exam List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: P.muted, fontSize: 13 }}>
              Loading exams...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: P.bg, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Ic d={IC.list} size={20} color={P.dim} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.muted, marginBottom: 4 }}>No exams found</div>
              <div style={{ fontSize: 11, color: P.dim }}>Create your first exam using the form</div>
            </div>
          )}
          {!loading && filtered.map(exam => {
            const status = examStatus(exam);
            const st     = STATUS_STYLES[status];
            const tc     = TYPE_COLORS[exam.exam_type] || TYPE_COLORS.placement;
            const sections = safeParse(exam.sections, {});
            const sectionKeys = Object.entries(sections).filter(([,v]) => v).map(([k]) => k.toUpperCase());

            return (
              <div key={exam.id}
                onClick={() => navigate(`/admin-exam/${exam.id}`)}
                style={{
                  background: P.white,
                  border: `1px solid ${P.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderLeft: `3px solid ${tc.color}`,
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exam.title}
                    </div>
                    {exam.subject_name && (
                      <div style={{ fontSize: 10, color: P.muted }}>{exam.subject_name}</div>
                    )}
                  </div>
                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot,
                      animation: status === 'live' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: st.color }}>{st.label}</span>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <MetaChip label={exam.college} icon={IC.building} />
                  <MetaChip label={exam.batch_year} icon={IC.users} />
                  {exam.department && <MetaChip label={exam.department.split(' ')[0]} icon={IC.university} />}
                  {exam.semester && <MetaChip label={`Sem ${exam.semester}`} icon={IC.layers} />}
                </div>

                {/* Sections + timing */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {/* Exam type badge */}
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.color, border: `1px solid ${tc.color}33` }}>
                      {exam.exam_type === 'skill_cert' ? 'SKILL' : exam.exam_type?.toUpperCase()}
                    </span>
                    {sectionKeys.slice(0, 3).map(s => (
                      <span key={s} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: P.bg, color: P.muted, border: `1px solid ${P.border}` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: P.dim, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Ic d={IC.clock} size={10} color={P.dim} />
                    {exam.duration_minutes}m
                    {exam.student_count > 0 && (
                      <span style={{ marginLeft: 4 }}>· {exam.student_count} students</span>
                    )}
                  </div>
                </div>

                {/* Start date */}
                <div style={{ marginTop: 7, fontSize: 10, color: P.dim, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Ic d={IC.calendar} size={10} color={P.dim} />
                  {new Date(exam.start_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${P.border}`, flexShrink: 0 }}>
          <button onClick={() => navigate('/admin-exams')}
            style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ic d={IC.list} size={12} color={P.muted} />
            View All Exams
          </button>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }`}</style>
    </>
  );
}

function MetaChip({ label, icon }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: P.muted }}>
      <Ic d={icon} size={9} color={P.dim} />
      {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
export default function CreateExam() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { showToast } = useApp();
  const mcqFileRef    = useRef(null);
  const writtenFileRef = useRef(null);

  const fromRequest = location.state?.fromRequest || false;
  const requestData = location.state?.requestData  || null;
  const initialType = location.state?.examType || (fromRequest ? 'placement' : null);

  const [examType,  setExamType]  = useState(initialType);
  const [typeHover, setTypeHover] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false); // ← NEW

  const isUniversity = examType === 'university';

  const reqSections = safeParse(requestData?.section_config,       {});
  const reqCutoffs  = safeParse(requestData?.sectional_cutoffs,    {});
  const reqElig     = safeParse(requestData?.eligibility_criteria, {});

  const [form, setForm] = useState(() => {
    const totalMin = Object.values(reqSections).reduce((t, s) =>
      t + (s.enabled && s.minutes ? parseInt(s.minutes) : 0), 0);
    return {
      title:       requestData ? `${requestData.job_role} — ${requestData.company_name || 'Placement'} Assessment` : '',
      college:     requestData?.target_college || '',
      batchYear:   requestData?.target_batch_year?.toString() || '',
      department:  '',
      semester:    '',
      examName:    '',
      subjectCode: '',
      subjectName: '',
      startDate:   buildDateTimeLocal(requestData?.schedule_date, requestData?.schedule_time),
      endDate:     '',
      duration:    totalMin > 0 ? totalMin.toString() : '60',
      totalMarks:  '100',
      passMark:    '40',
      description: requestData?.specifications || '',
      languages:   ['Python', 'Java'],
      mcqCount:    '20',
      mcqMarks:    '1',
      mcqMinutes:  '30',
      writtenCount:   '5',
      writtenMarks:   '8',
      writtenMinutes: '60',
    };
  });

  const [sections, setSections] = useState(() => {
    const enabled = {};
    Object.entries(reqSections).forEach(([k, v]) => { if (v.enabled) enabled[k] = true; });
    return Object.keys(enabled).length > 0 ? enabled : { mcq: true, coding: true };
  });

  const [univSections, setUnivSections] = useState({ mcq: true, written: true });

  const [sectionConfig, setSectionConfig] = useState(() => {
    const cfg = {};
    Object.entries(reqSections).forEach(([k, v]) => {
      if (v.enabled) cfg[k] = { questions: v.questions?.toString() || '', minutes: v.minutes?.toString() || '' };
    });
    return cfg;
  });

  const [adaptiveMcq,   setAdaptiveMcq]   = useState(true);
  const [mcqDifficulty, setMcqDifficulty] = useState({ easy: '30', medium: '50', hard: '20' });

  const [cutoffEnabled, setCutoffEnabled] = useState(requestData?.sectional_cutoff_required || false);
  const [cutoffs, setCutoffs] = useState(() => {
    const c = {};
    Object.entries(reqCutoffs).forEach(([k, v]) => { if (v) c[k] = v.toString(); });
    return c;
  });

  const [mcqPdf,     setMcqPdf]     = useState(null);
  const [writtenPdf, setWrittenPdf] = useState(null);
  const [pdfFiles,    setPdfFiles]    = useState({});
  const [pdfPreviews, setPdfPreviews] = useState({});

  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [createdExam, setCreatedExam] = useState(null);
  const [errors,      setErrors]      = useState({});

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleLang = lang =>
    setF('languages', form.languages.includes(lang)
      ? form.languages.filter(l => l !== lang)
      : [...form.languages, lang]);

  const enabledSections = Object.entries(sections).filter(([, v]) => v);

  const handlePdfUpload = (section, file) => {
    if (!file || file.type !== 'application/pdf') { showToast('Please upload a valid PDF file', 'error'); return; }
    setPdfFiles(p => ({ ...p, [section]: file }));
    setPdfPreviews(p => ({ ...p, [section]: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' } }));
  };
  const removePdf = (section) => {
    setPdfFiles(p => { const n = { ...p }; delete n[section]; return n; });
    setPdfPreviews(p => { const n = { ...p }; delete n[section]; return n; });
  };
  const handleUnivPdf = (type, file) => {
    if (!file || file.type !== 'application/pdf') { showToast('Please upload a valid PDF file', 'error'); return; }
    if (type === 'mcq')     setMcqPdf(file);
    if (type === 'written') setWrittenPdf(file);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title     = 'Exam title is required';
    if (!form.college)       e.college   = 'Select a college';
    if (!form.batchYear)     e.batchYear = 'Select a batch year';
    if (!form.startDate)     e.startDate = 'Start date and time required';
    if (!form.endDate)       e.endDate   = 'End date and time required';
    if (!form.duration || +form.duration <= 0) e.duration = 'Duration required';
    if (isUniversity) {
      if (!form.department)         e.department  = 'Select a department';
      if (!form.semester)           e.semester    = 'Select a semester';
      if (!form.subjectName.trim()) e.subjectName = 'Subject name is required';
      if (!Object.values(univSections).some(v => v)) e.sections = 'At least one section must be enabled';
      if (univSections.mcq && !mcqPdf)         e.mcqPdf     = 'Upload MCQ question bank PDF';
      if (univSections.written && !writtenPdf) e.writtenPdf = 'Upload written question bank PDF';
    } else {
      if (form.languages.length === 0) e.languages = 'Select at least one language';
      if (Object.values(sections).every(v => !v)) e.sections = 'At least one section must be enabled';
      if (adaptiveMcq && sections.mcq) {
        const total = +mcqDifficulty.easy + +mcqDifficulty.medium + +mcqDifficulty.hard;
        if (total !== 100) e.mcqDifficulty = `Difficulty % must sum to 100 (currently ${total})`;
      }
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTimeout(() => showToast('Please fix the errors before submitting', 'error'), 0);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { token, role: resolvedRole } = resolveAdminToken();
      if (!token) { showToast('Session expired — please log in again as Admin or Recruiter.', 'error'); setSubmitting(false); return; }
      if (resolvedRole === 'student' || resolvedRole === 'unknown') { showToast('Access denied — please log in as Admin or Recruiter.', 'error'); setSubmitting(false); return; }

      const fd = new FormData();
      fd.append('exam_type', examType || 'placement');
      fd.append('title', form.title);
      fd.append('college', form.college);
      fd.append('batch_year', form.batchYear);
      fd.append('start_date', form.startDate);
      fd.append('end_date', form.endDate);
      fd.append('duration_minutes', form.duration);
      fd.append('total_marks', form.totalMarks);
      fd.append('pass_mark', form.passMark);
      fd.append('description', form.description);

      if (isUniversity) {
        fd.append('department', form.department);
        fd.append('semester', form.semester);
        fd.append('exam_name', form.examName);
        fd.append('subject_code', form.subjectCode);
        fd.append('subject_name', form.subjectName);
        fd.append('sections', JSON.stringify(univSections));
        fd.append('section_config', JSON.stringify({
          mcq:     { count: form.mcqCount,     marks: form.mcqMarks,     minutes: form.mcqMinutes },
          written: { count: form.writtenCount,  marks: form.writtenMarks,  minutes: form.writtenMinutes },
        }));
        if (mcqPdf)     fd.append('pdf_mcq',    mcqPdf);
        if (writtenPdf) fd.append('pdf_written', writtenPdf);
      } else {
        fd.append('allowed_languages', JSON.stringify(form.languages));
        fd.append('sections', JSON.stringify(sections));
        fd.append('section_config', JSON.stringify(sectionConfig));
        fd.append('adaptive_mcq', adaptiveMcq ? '1' : '0');
        fd.append('mcq_difficulty', JSON.stringify(mcqDifficulty));
        fd.append('cutoff_enabled', cutoffEnabled ? '1' : '0');
        fd.append('cutoffs', JSON.stringify(cutoffs));
        fd.append('exam_request_id', requestData?.id || '');
        fd.append('eligibility', JSON.stringify(reqElig));
        Object.entries(pdfFiles).forEach(([section, file]) => fd.append(`pdf_${section}`, file));
      }

      const res  = await fetch(`${API}/api/exams/create`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Server error (${res.status})`);

      setCreatedExam(data);
      setSubmitted(true);
      showToast(
        isUniversity
          ? 'University exam created. Unique question papers sent to all enrolled students.'
          : 'Exam created. Keys emailed to eligible students.',
        'success'
      );
    } catch (err) {
      console.error('[CreateExam] Submit error:', err);
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMain = () => {
    if (submitted && createdExam) {
      return (
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 480, background: P.white, borderRadius: 16, padding: '48px 40px', border: `1px solid ${P.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: P.greenBg, border: `2px solid ${P.green}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Ic d={IC.check} size={28} color={P.green} sw={2.5} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: P.text }}>Exam Created Successfully</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: P.muted, lineHeight: 1.7 }}>
              {isUniversity
                ? 'Unique randomized question papers have been generated and exam keys sent to all enrolled students via email.'
                : 'Unique exam keys have been generated and sent to eligible students via email.'}
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: P.green, letterSpacing: '0.5px', marginBottom: 8 }}>EXAM SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                {[
                  ['Title', form.title],
                  isUniversity ? ['Department', form.department] : ['Students Notified', createdExam.student_count || '—'],
                  ['College', form.college],
                  isUniversity ? ['Semester', form.semester] : ['Batch', form.batchYear],
                  ['Start', new Date(form.startDate).toLocaleString()],
                  ['Duration', `${form.duration} min`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: P.dim, fontSize: 10, fontWeight: 600 }}>{k}</div>
                    <div style={{ color: P.text, fontWeight: 600, marginTop: 1 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => navigate('/admin-exam-requests')}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Back to Requests
              </button>
              <button onClick={() => setPanelOpen(true)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: P.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                View Created Exams
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (!examType) {
      return (
        <main style={{ flex: 1, overflow: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <button onClick={() => navigate(-1)}
                style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.back} size={15} color={P.muted} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: P.text }}>Create New Exam</h1>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: P.muted }}>Choose the type of exam you want to create</p>
              </div>
              {/* View Created Exams button on type selector screen */}
              <button onClick={() => setPanelOpen(true)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, color: P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Ic d={IC.list} size={13} color={P.muted} />
                Created Exams
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              {EXAM_TYPES.map(t => {
                const isHover = typeHover === t.key;
                return (
                  <div key={t.key}
                    onClick={() => setExamType(t.key)}
                    onMouseEnter={() => setTypeHover(t.key)}
                    onMouseLeave={() => setTypeHover(null)}
                    style={{
                      background: isHover ? t.activeBg : P.white, borderRadius: 14,
                      border: `2px solid ${isHover ? 'transparent' : t.border}`,
                      padding: '24px 20px', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: isHover ? `0 8px 28px ${t.color}44` : '0 1px 4px rgba(0,0,0,0.04)',
                      transform: isHover ? 'translateY(-3px)' : 'none',
                    }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: isHover ? 'rgba(255,255,255,0.2)' : t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, border: isHover ? '1px solid rgba(255,255,255,0.3)' : `1px solid ${t.border}` }}>
                      <Ic d={t.icon} size={22} color={isHover ? '#fff' : t.color} sw={1.7} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isHover ? '#fff' : P.text, marginBottom: 4 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: isHover ? 'rgba(255,255,255,0.75)' : P.muted, marginBottom: 16, lineHeight: 1.5 }}>{t.subtitle}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {t.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isHover ? 'rgba(255,255,255,0.85)' : P.muted }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: isHover ? 'rgba(255,255,255,0.6)' : t.color, flexShrink: 0 }} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: isHover ? 'rgba(255,255,255,0.15)' : t.bg, border: `1px solid ${isHover ? 'rgba(255,255,255,0.25)' : t.border}` }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isHover ? '#fff' : t.color }}>Select</span>
                      <Ic d={IC.arrowRight} size={13} color={isHover ? '#fff' : t.color} sw={2.5} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, padding: '12px 16px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: P.muted }}>
              <Ic d={IC.info} size={14} color={P.dim} />
              If you're creating an exam from an approved recruiter request, go to <strong style={{ color: P.text, marginLeft: 3 }}>Exam Requests &rarr; Approved &rarr; Create Exam</strong> for auto-filled forms.
            </div>
          </div>
        </main>
      );
    }

    const selectedType = EXAM_TYPES.find(t => t.key === examType);

    return (
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => fromRequest ? navigate(-1) : setExamType(null)}
              style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic d={IC.back} size={15} color={P.muted} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {EXAM_TYPES.map((t, i) => (
                  <React.Fragment key={t.key}>
                    {i > 0 && <span style={{ color: P.dim, fontSize: 11 }}>›</span>}
                    <button onClick={() => !fromRequest && setExamType(t.key)}
                      style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${examType === t.key ? 'transparent' : P.border}`, background: examType === t.key ? t.activeBg : P.bg, color: examType === t.key ? '#fff' : P.muted, cursor: fromRequest ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                      {t.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Create {selectedType?.label}</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: P.muted }}>
                {isUniversity
                  ? 'Upload MCQ and written question PDFs — unique randomized papers will be generated per student'
                  : fromRequest
                    ? `Auto-filled from Request #${requestData?.id} — ${requestData?.company_name || ''} · ${requestData?.job_role || ''}`
                    : 'Configure and deploy a new assessment'}
              </p>
            </div>
            {/* View Created Exams button — always visible in form view */}
            <button onClick={() => setPanelOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.white, color: P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <Ic d={IC.list} size={13} color={P.muted} />
              Created Exams
            </button>
          </div>

          {/* ── Section 1: Basic Info ─────────────────────────── */}
          <Panel title="1" label="Exam Details" color={selectedType?.color}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <div>
                <FieldLabel required>Exam Title</FieldLabel>
                <input value={form.title} onChange={e => setF('title', e.target.value)}
                  placeholder={isUniversity ? 'e.g. Operating Systems — End Semester Examination' : 'e.g. Infosys — Full Stack Developer Placement Assessment'}
                  style={inp(errors.title)} />
                {errors.title && <ErrMsg>{errors.title}</ErrMsg>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <FieldLabel required>Target College</FieldLabel>
                  <select value={form.college} onChange={e => setF('college', e.target.value)} style={inp(errors.college)}>
                    <option value="">Select college...</option>
                    {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.college && <ErrMsg>{errors.college}</ErrMsg>}
                </div>
                <div>
                  <FieldLabel required>Batch Year</FieldLabel>
                  <select value={form.batchYear} onChange={e => setF('batchYear', e.target.value)} style={inp(errors.batchYear)}>
                    <option value="">Select batch...</option>
                    {BATCH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {errors.batchYear && <ErrMsg>{errors.batchYear}</ErrMsg>}
                </div>

               {isUniversity && (
  <>
    <div>
      <FieldLabel required>Department</FieldLabel>
      <select value={form.department} onChange={e => setF('department', e.target.value)} style={inp(errors.department)}>
        <option value="">Select department...</option>
        {DEPARTMENTS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
      {errors.department && <ErrMsg>{errors.department}</ErrMsg>}
    </div>
                    
                    <div>
                      <FieldLabel required>Semester</FieldLabel>
                      <select value={form.semester} onChange={e => setF('semester', e.target.value)} style={inp(errors.semester)}>
                        <option value="">Select semester...</option>
                        {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                      {errors.semester && <ErrMsg>{errors.semester}</ErrMsg>}
                    </div>
                    <div>
                      <FieldLabel>Subject Code</FieldLabel>
                      <input value={form.subjectCode} onChange={e => setF('subjectCode', e.target.value)} placeholder="e.g. CS3401" style={inp()} />
                    </div>
                    <div>
                      <FieldLabel required>Subject Name</FieldLabel>
                      <input value={form.subjectName} onChange={e => setF('subjectName', e.target.value)} placeholder="e.g. Operating Systems" style={inp(errors.subjectName)} />
                      {errors.subjectName && <ErrMsg>{errors.subjectName}</ErrMsg>}
                    </div>
                    <div>
                      <FieldLabel>Exam Type / Name</FieldLabel>
                      <input value={form.examName} onChange={e => setF('examName', e.target.value)} placeholder="e.g. Mid Term I, End Semester, Unit Test" style={inp()} />
                    </div>
                  </>
                )}

                <div>
                  <FieldLabel required>Start Date &amp; Time</FieldLabel>
                  <input type="datetime-local" value={form.startDate} onChange={e => setF('startDate', e.target.value)} style={inp(errors.startDate)} />
                  {errors.startDate && <ErrMsg>{errors.startDate}</ErrMsg>}
                </div>
                <div>
                  <FieldLabel required>End Date &amp; Time</FieldLabel>
                  <input type="datetime-local" value={form.endDate} onChange={e => setF('endDate', e.target.value)} style={inp(errors.endDate)} />
                  {errors.endDate && <ErrMsg>{errors.endDate}</ErrMsg>}
                </div>
                <div>
                  <FieldLabel required>Total Duration (minutes)</FieldLabel>
                  <input type="number" min="1" value={form.duration} onChange={e => setF('duration', e.target.value)} placeholder="e.g. 90" style={inp(errors.duration)} />
                  {errors.duration && <ErrMsg>{errors.duration}</ErrMsg>}
                </div>
                {!isUniversity && (
                  <div>
                    <FieldLabel>Pass Mark / Total Marks</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="number" min="1" value={form.passMark}   onChange={e => setF('passMark',   e.target.value)} placeholder="Pass"  style={inp()} />
                      <input type="number" min="1" value={form.totalMarks} onChange={e => setF('totalMarks', e.target.value)} placeholder="Total" style={inp()} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Instructions / Description</FieldLabel>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3}
                  placeholder="Add any special instructions for students..."
                  style={{ ...inp(), resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </Panel>

          {/* ── University: Question Upload ─────────── */}
          {isUniversity && (
            <Panel title="2" label="Question Sections &amp; PDF Upload" color={selectedType?.color}>
              <div style={{ fontSize: 12, color: P.muted, marginBottom: 14, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 7, padding: '8px 12px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Ic d={IC.info} size={13} color="#d97706" />
                <span>Upload your question bank PDFs. The system will automatically parse, randomize, and generate a unique question paper for each student. No two students will receive the same paper.</span>
              </div>
              {errors.sections && <ErrMsg style={{ marginBottom: 10 }}>{errors.sections}</ErrMsg>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SectionBlock enabled={univSections.mcq} onToggle={() => setUnivSections(p => ({ ...p, mcq: !p.mcq }))} color={P.blue} bg={P.blueBg} border={P.blueBorder} label="MCQ" sublabel="Multiple Choice Questions"
                  configSlot={univSections.mcq && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <MiniField label="No. of Questions" value={form.mcqCount}   onChange={v => setF('mcqCount', v)} />
                      <MiniField label="Marks Each"       value={form.mcqMarks}   onChange={v => setF('mcqMarks', v)} />
                      <MiniField label="Time (min)"       value={form.mcqMinutes} onChange={v => setF('mcqMinutes', v)} />
                    </div>
                  )}>
                  {univSections.mcq && (
                    <div style={{ borderTop: `1px solid ${P.blueBorder}`, padding: '14px 16px', background: P.white }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: P.blue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Ic d={IC.file} size={12} color={P.blue} /> Upload MCQ Question Bank PDF
                        <span style={{ fontSize: 10, fontWeight: 400, color: P.muted }}>— questions parsed and shuffled per student</span>
                      </div>
                      <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, overflow: 'hidden' }}>
                        {[
                          { step: '1', text: 'Upload PDF with MCQ questions' },
                          { step: '2', text: 'System extracts all questions' },
                          { step: '3', text: 'Random subset assigned per student' },
                          { step: '4', text: 'Options shuffled individually' },
                        ].map((s, i) => (
                          <div key={i} style={{ flex: 1, padding: '8px 10px', borderRight: i < 3 ? '1px solid #bae6fd' : 'none' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#0369a1', marginBottom: 2 }}>STEP {s.step}</div>
                            <div style={{ fontSize: 10.5, color: '#0369a1' }}>{s.text}</div>
                          </div>
                        ))}
                      </div>
                      <PdfUploadZone file={mcqPdf} onFile={f => handleUnivPdf('mcq', f)} onRemove={() => setMcqPdf(null)} color={P.blue} bg={P.blueBg} border={P.blueBorder} error={errors.mcqPdf} hint="PDF format · Questions numbered · Options labeled A B C D" />
                      {errors.mcqPdf && <ErrMsg style={{ marginTop: 6 }}>{errors.mcqPdf}</ErrMsg>}
                    </div>
                  )}
                </SectionBlock>

                <SectionBlock enabled={univSections.written} onToggle={() => setUnivSections(p => ({ ...p, written: !p.written }))} color={P.accent} bg={P.accentLight} border={P.accentBorder} label="Written / 8-Mark" sublabel="Short answer, long answer, descriptive"
                  configSlot={univSections.written && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <MiniField label="No. of Questions" value={form.writtenCount}   onChange={v => setF('writtenCount', v)} />
                      <MiniField label="Marks Each"       value={form.writtenMarks}   onChange={v => setF('writtenMarks', v)} />
                      <MiniField label="Time (min)"       value={form.writtenMinutes} onChange={v => setF('writtenMinutes', v)} />
                    </div>
                  )}>
                  {univSections.written && (
                    <div style={{ borderTop: `1px solid ${P.accentBorder}`, padding: '14px 16px', background: P.white }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: P.accent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Ic d={IC.file} size={12} color={P.accent} /> Upload Written Question Bank PDF
                        <span style={{ fontSize: 10, fontWeight: 400, color: P.muted }}>— questions randomized across students</span>
                      </div>
                      <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: P.accentLight, border: `1px solid ${P.accentBorder}`, borderRadius: 8, overflow: 'hidden' }}>
                        {[
                          { step: '1', text: 'Upload PDF with written questions' },
                          { step: '2', text: 'System extracts question pool' },
                          { step: '3', text: 'Different questions per student' },
                          { step: '4', text: 'Students type their answers' },
                        ].map((s, i) => (
                          <div key={i} style={{ flex: 1, padding: '8px 10px', borderRight: i < 3 ? `1px solid ${P.accentBorder}` : 'none' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: P.accent, marginBottom: 2 }}>STEP {s.step}</div>
                            <div style={{ fontSize: 10.5, color: P.accent }}>{s.text}</div>
                          </div>
                        ))}
                      </div>
                      <PdfUploadZone file={writtenPdf} onFile={f => handleUnivPdf('written', f)} onRemove={() => setWrittenPdf(null)} color={P.accent} bg={P.accentLight} border={P.accentBorder} error={errors.writtenPdf} hint="PDF format · Each question on separate line · Marks noted per question" />
                      {errors.writtenPdf && <ErrMsg style={{ marginTop: 6 }}>{errors.writtenPdf}</ErrMsg>}
                    </div>
                  )}
                </SectionBlock>
              </div>

              {(univSections.mcq || univSections.written) && (
                <div style={{ marginTop: 14, padding: '12px 16px', background: '#f8fafc', border: `1px solid ${P.border}`, borderRadius: 8, display: 'flex', gap: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, marginRight: 'auto' }}>MARKS BREAKDOWN</div>
                  {univSections.mcq && (
                    <div style={{ fontSize: 12, color: P.text }}>
                      <span style={{ fontWeight: 600, color: P.blue }}>{form.mcqCount} MCQ</span>
                      <span style={{ color: P.muted }}> &times; {form.mcqMarks} = </span>
                      <span style={{ fontWeight: 700 }}>{+form.mcqCount * +form.mcqMarks} marks</span>
                    </div>
                  )}
                  {univSections.written && (
                    <div style={{ fontSize: 12, color: P.text }}>
                      <span style={{ fontWeight: 600, color: P.accent }}>{form.writtenCount} Written</span>
                      <span style={{ color: P.muted }}> &times; {form.writtenMarks} = </span>
                      <span style={{ fontWeight: 700 }}>{+form.writtenCount * +form.writtenMarks} marks</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 800, color: P.text }}>
                    Total: {(univSections.mcq ? +form.mcqCount * +form.mcqMarks : 0) + (univSections.written ? +form.writtenCount * +form.writtenMarks : 0)} marks
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* ── Placement: Exam Sections ─────────── */}
          {!isUniversity && (
            <Panel title="2" label="Exam Sections &amp; Question PDFs" color={selectedType?.color}>
              <div style={{ fontSize: 12, color: P.muted, marginBottom: 14, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 7, padding: '8px 12px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Ic d={IC.info} size={13} color="#d97706" />
                <span>
                  {fromRequest
                    ? `Pattern from recruiter: "${PATTERN_LABELS[requestData?.assessment_pattern] || requestData?.assessment_pattern || 'Custom'}". Sections pre-selected below.`
                    : 'Enable the sections you want to include. Upload a question PDF for each section.'}
                </span>
              </div>
              {errors.sections && <ErrMsg style={{ marginBottom: 10 }}>{errors.sections}</ErrMsg>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(PLACEMENT_SECTION_META).map(([key, meta]) => {
                  const isOn  = !!sections[key];
                  const cfg   = sectionConfig[key] || {};
                  const pdf   = pdfPreviews[key];
                  const fromReq = reqSections[key]?.enabled;
                  return (
                    <div key={key} style={{ borderRadius: 10, border: `1.5px solid ${isOn ? meta.border : P.border}`, background: isOn ? meta.bg + '88' : P.bg, transition: 'all 0.2s', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Toggle on={isOn} color={meta.color} onToggle={() => setSections(p => ({ ...p, [key]: !p[key] }))} />
                          <SectionBadge label={meta.label} on={isOn} color={meta.color} bg={meta.bg} border={meta.border} />
                          {fromReq && <span style={{ fontSize: 10, color: P.green, fontWeight: 600, background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, border: '1px solid #bbf7d0' }}>from request</span>}
                        </div>
                        {isOn && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 10, color: P.muted, fontWeight: 600 }}>Questions</span>
                              <input type="number" min="1" value={cfg.questions || ''} placeholder="—"
                                onChange={e => setSectionConfig(p => ({ ...p, [key]: { ...p[key], questions: e.target.value } }))}
                                style={{ ...inp(), padding: '5px 8px', width: 70 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 10, color: P.muted, fontWeight: 600 }}>Minutes</span>
                              <input type="number" min="1" value={cfg.minutes || ''} placeholder="—"
                                onChange={e => setSectionConfig(p => ({ ...p, [key]: { ...p[key], minutes: e.target.value } }))}
                                style={{ ...inp(), padding: '5px 8px', width: 70 }} />
                            </div>
                          </div>
                        )}
                      </div>
                      {isOn && (
                        <div style={{ borderTop: `1px solid ${meta.border}`, padding: '12px 14px', background: P.white }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Ic d={IC.file} size={11} color={meta.color} />
                            Question Bank PDF
                            <span style={{ fontSize: 10, fontWeight: 400, color: P.muted }}>(optional — questions will be randomized)</span>
                          </div>
                          <PdfUploadZone
                            file={pdfFiles[key] ? { name: pdf?.name, size: pdf?.size } : null}
                            onFile={f => handlePdfUpload(key, f)} onRemove={() => removePdf(key)}
                            color={meta.color} bg={meta.bg} border={meta.border} previewData={pdf} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* ── Adaptive MCQ (placement only) ─────────────── */}
          {!isUniversity && sections.mcq && (
            <Panel title="3" label="Adaptive MCQ Configuration" color={selectedType?.color}>
              <div style={{ marginBottom: 14, padding: '10px 14px', background: P.accentLight, border: `1px solid ${P.accentBorder}`, borderRadius: 8, fontSize: 12, color: P.accent, display: 'flex', gap: 8 }}>
                <Ic d={IC.sparkles} size={14} color={P.accent} />
                <div><strong>Adaptive Engine:</strong> First question is medium difficulty. Correct &rarr; hard; Incorrect &rarr; easy. Each student gets a randomized, personalized sequence.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 14px', background: P.bg, borderRadius: 8, border: `1px solid ${P.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Enable Adaptive MCQ</div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>Questions adapt to each student's performance in real-time</div>
                </div>
                <Toggle on={adaptiveMcq} color={P.accent} onToggle={() => setAdaptiveMcq(v => !v)} size={40} />
              </div>
              {adaptiveMcq && (
                <>
                  <FieldLabel>Question Pool Distribution (%)</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                    {[
                      { key: 'easy',   label: 'Easy',   color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
                      { key: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
                      { key: 'hard',   label: 'Hard',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                    ].map(d => (
                      <div key={d.key} style={{ background: d.bg, borderRadius: 8, padding: '12px', border: `1px solid ${d.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: d.color, marginBottom: 6 }}>{d.label}</div>
                        <input type="number" min="0" max="100" value={mcqDifficulty[d.key]}
                          onChange={e => setMcqDifficulty(p => ({ ...p, [d.key]: e.target.value }))}
                          style={{ ...inp(), textAlign: 'center', fontWeight: 700, fontSize: 18, padding: '6px', borderColor: d.border }} />
                        <div style={{ fontSize: 10, color: d.color, marginTop: 4 }}>% of questions</div>
                      </div>
                    ))}
                  </div>
                  {errors.mcqDifficulty && <ErrMsg>{errors.mcqDifficulty}</ErrMsg>}
                </>
              )}
            </Panel>
          )}

          {/* ── Languages (placement only) ────────────── */}
          {!isUniversity && (
            <Panel title={sections.mcq ? "4" : "3"} label="Allowed Programming Languages" color={selectedType?.color}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LANGUAGES.map(lang => {
                  const on = form.languages.includes(lang);
                  return (
                    <button key={lang} onClick={() => toggleLang(lang)}
                      style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${on ? P.accent : P.border}`, background: on ? P.accentLight : P.bg, color: on ? P.accent : P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {on && <span style={{ marginRight: 4 }}>&#10003;</span>}{lang}
                    </button>
                  );
                })}
              </div>
              {errors.languages && <ErrMsg style={{ marginTop: 8 }}>{errors.languages}</ErrMsg>}
            </Panel>
          )}

          {/* ── Sectional Cutoffs (placement only) ───────── */}
          {!isUniversity && enabledSections.length > 1 && (
            <Panel title={sections.mcq ? "5" : "4"} label="Sectional Cutoff" color={selectedType?.color}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cutoffEnabled ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Require minimum score per section</div>
                  {requestData?.sectional_cutoff_required && <div style={{ fontSize: 11, color: P.green, marginTop: 2 }}>Required by recruiter</div>}
                </div>
                <Toggle on={cutoffEnabled} color={P.accent} onToggle={() => setCutoffEnabled(v => !v)} size={40} />
              </div>
              {cutoffEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {enabledSections.map(([key]) => {
                    const m = PLACEMENT_SECTION_META[key];
                    const fromReqVal = reqCutoffs[key];
                    return (
                      <div key={key}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: m.color, marginBottom: 5 }}>
                          {m.label} (%)
                          {fromReqVal && <span style={{ fontSize: 9, color: P.green, fontWeight: 600, marginLeft: 4 }}>req: {fromReqVal}%</span>}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input type="number" min="0" max="100" value={cutoffs[key] || ''}
                            onChange={e => setCutoffs(p => ({ ...p, [key]: e.target.value }))}
                            placeholder="0–100"
                            style={{ ...inp(), padding: '7px 28px 7px 10px', borderColor: m.border }} />
                          <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: P.muted, fontWeight: 600 }}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* ── Info box ─────────────────────────────────── */}
          <div style={{ marginBottom: 20, padding: '14px 18px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(isUniversity ? [
                { icon: IC.key,     title: 'Unique exam key per student',  desc: 'Each enrolled student receives a unique, single-use exam key sent to their registered email. Keys activate only during the exam window.' },
                { icon: IC.shuffle, title: 'Randomized question paper',    desc: 'Questions are drawn from the uploaded PDF pool and shuffled differently for every student. MCQ options are also randomized individually.' },
                { icon: IC.users,   title: 'Deployed to enrolled students',desc: 'All students matching college, batch, department, and semester receive the exam automatically on their dashboard.' },
              ] : [
                { icon: IC.key,     title: 'Per-Student Unique Exam Keys',  desc: 'Each eligible student receives a unique, single-use exam key generated at submit time.' },
                { icon: IC.mail,    title: 'Automatic Email Notification',   desc: 'Students matching college, batch, and eligibility criteria receive an email with their key.' },
                { icon: IC.shuffle, title: 'Question Randomization',         desc: 'Questions are shuffled uniquely per student. MCQ uses adaptive difficulty in real-time.' },
              ]).map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ic d={icon} size={15} color="#0369a1" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Submit ───────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 48 }}>
            <button onClick={() => fromRequest ? navigate(-1) : setExamType(null)}
              style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: submitting ? '#e2e8f0' : isUniversity ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : `linear-gradient(135deg, ${P.accent}, ${P.accentDark})`,
                color: submitting ? P.dim : '#fff',
                fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: submitting ? 'none' : isUniversity ? '0 4px 12px rgba(37,99,235,0.35)' : '0 4px 12px rgba(124,58,237,0.35)',
              }}>
              <Ic d={isUniversity ? IC.send : IC.mail} size={14} color="currentColor" />
              {submitting ? 'Creating...' : isUniversity ? 'Create and Publish University Exam' : 'Create Exam and Send Keys to Students'}
            </button>
          </div>
        </div>
      </main>
    );
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: P.bg }}>
      <Sidebar />
      <Navbar />
      {renderMain()}
      <ToastContainer />

      {/* Created Exams Panel */}
      <CreatedExamsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        navigate={navigate}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function Toggle({ on, color, onToggle, size = 36 }) {
  return (
    <div onClick={onToggle}
      style={{ width: size, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', background: on ? color : '#cbd5e1', flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? size - 17 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

function SectionBadge({ label, on, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 4, background: on ? bg : '#f8fafc', border: `1px solid ${on ? border : '#e2e8f0'}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? color : '#94a3b8' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: on ? color : '#94a3b8' }}>{label}</span>
    </span>
  );
}

function SectionBlock({ enabled, onToggle, color, bg, border, label, sublabel, configSlot, children }) {
  return (
    <div style={{ borderRadius: 10, border: `1.5px solid ${enabled ? border : '#e2e8f0'}`, background: enabled ? bg + '88' : '#f8fafc', overflow: 'hidden', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle on={enabled} color={color} onToggle={onToggle} />
          <SectionBadge label={label} on={enabled} color={color} bg={bg} border={border} />
          <span style={{ fontSize: 12, color: '#64748b' }}>{sublabel}</span>
        </div>
        {configSlot}
      </div>
      {children}
    </div>
  );
}

function MiniField({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <input type="number" min="1" value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inp(), padding: '5px 8px', width: 70 }} />
    </div>
  );
}

function PdfUploadZone({ file, onFile, onRemove, color, bg, border, error, hint, previewData }) {
  const ref = useRef(null);
  const displayFile = previewData || file;
  const fileName = displayFile?.name || file?.name;
  const fileSize = displayFile?.size || (file?.size ? (file.size / 1024).toFixed(1) + ' KB' : null);

  if (fileName) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{fileName}</div>
            {fileSize && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{fileSize}</div>}
          </div>
        </div>
        <button onClick={onRemove}
          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <label style={{ display: 'block', cursor: 'pointer' }}>
      <div
        style={{ border: `2px dashed ${error ? '#fca5a5' : border}`, borderRadius: 9, padding: '20px', textAlign: 'center', background: error ? '#fef2f2' : bg + '44', transition: 'all 0.15s' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: error ? '#fca5a5' : bg, border: `1px solid ${error ? '#f87171' : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={error ? '#dc2626' : color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: error ? '#dc2626' : color, marginBottom: 4 }}>Drop PDF here or click to browse</div>
        {hint && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
      </div>
      <input ref={ref} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
    </label>
  );
}

function Panel({ title, label, color = '#7c3aed', children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fafc, #f5f3ff)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }} dangerouslySetInnerHTML={{ __html: label }} />
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function ErrMsg({ children, style }) {
  return <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, ...style }}>{children}</div>;
}

function inp(hasError) {
  return {
    width: '100%', padding: '9px 12px',
    border: `1px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: 7, fontSize: 13, color: '#0f172a',
    background: '#f8fafc', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
}