// Dashboard.jsx — Admin Platform · Unified Design System v2 · Redesigned
// Dashboard.jsx — with LangSmith panel embedded
// CHANGES FROM ORIGINAL:
//   Line 1  → import LangSmithPanel
//   After stat cards section → <LangSmithPanel /> added
//   Everything else is EXACTLY the same as your original

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Navbar        from '../components/Navbar';
import Sidebar       from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import LangSmithPanel from '../components/LangSmithPanel'; // ← NEW

const API      = 'http://localhost:5000/api';
const getToken = () =>
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token')       ||
  localStorage.getItem('authToken')   ||
  sessionStorage.getItem('token')     || '';
const authFetch = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });

const T = {
  primary:   '#1e3a8a',
  accent:    '#2563eb',
  accentLt:  '#eff6ff',
  accentBd:  '#bfdbfe',
  text:      '#1e293b',
  text2:     '#475569',
  text3:     '#94a3b8',
  border:    '#e2e8f0',
  bg:        '#f0f7ff',
  white:     '#ffffff',
  green:     '#059669',
  greenBg:   '#ecfdf5',
  greenBd:   '#6ee7b7',
  red:       '#dc2626',
  redBg:     '#fef2f2',
  redBd:     '#fca5a5',
};

const dashStyles = `/* Keep your existing styles here */`;

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', navyMid: '#1e3a5f',
  blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  live: '#7c3aed', liveBg: '#f5f3ff', liveBd: '#ddd6fe',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const CHART_COLORS = ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#1e40af'];

// ─── Helper: is this exam "live"? ─────────────────────────────────────────────
// An exam is considered live if its status is 'active' (case-insensitive).
// No need to hit /students — the exam status itself tells us it's running.
const isLiveStatus = (status = '') =>
  (status || '').toLowerCase() === 'active';

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box}

.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:28px 32px}

/* Header */
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.ap-title{font-size:21px;font-weight:800;color:${C.navy};margin:0 0 3px;letter-spacing:-.3px;line-height:1.2}
.ap-sub{font-size:12.5px;color:${C.inkSub};margin:0;font-weight:400}
.ap-hdr-r{display:flex;align-items:center;gap:8px;flex-shrink:0}

/* Buttons */
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:12.5px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:12.5px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}

/* Cards */
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13px;font-weight:700;color:${C.navy}}
.card-sub{font-size:11.5px;color:${C.inkSub};margin-top:2px}

/* Stat grid */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.stat-card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;padding:18px 20px;box-shadow:0 1px 4px rgba(15,31,61,.06);transition:box-shadow .15s}
.stat-card:hover{box-shadow:0 4px 14px rgba(15,31,61,.09)}
.stat-lbl{font-size:10px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
.stat-val{font-size:28px;font-weight:800;color:${C.navy};line-height:1;margin-bottom:4px;font-family:${C.mono}}
.stat-desc{font-size:11.5px;color:${C.inkMuted}}
.stat-bl{border-top:3px solid ${C.blue}}
.stat-gr{border-top:3px solid ${C.green}}

/* Two-column grid */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}

/* Table */
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl td{padding:11px 14px;vertical-align:middle}

/* Badges */
.bdg{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid;white-space:nowrap}
.bdg-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.bdg-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.bdg-am{background:${C.amberBg};color:${C.amber};border-color:${C.amberBd}}
.bdg-rd{background:${C.redBg};color:${C.red};border-color:${C.redBd}}
.bdg-nt{background:${C.subtle};color:${C.inkSub};border-color:${C.border}}
.bdg-lv{background:${C.liveBg};color:${C.live};border-color:${C.liveBd}}

/* Live exam cards */
.live-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;padding:16px}
.live-card{background:${C.surface};border:1.5px solid ${C.liveBd};border-radius:12px;padding:16px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.live-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(124,58,237,.15);border-color:${C.live}}
.live-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${C.live},#a78bfa)}
.live-pulse{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;background:${C.liveBg};border:1px solid ${C.liveBd};border-radius:20px;font-size:10px;font-weight:700;color:${C.live};margin-bottom:10px}
.live-dot{width:6px;height:6px;border-radius:50%;background:${C.live};animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
.live-title{font-size:13.5px;font-weight:700;color:${C.navy};margin-bottom:4px;line-height:1.3}
.live-meta{font-size:11.5px;color:${C.inkSub};margin-bottom:12px;line-height:1.5}
.live-stats{display:flex;gap:16px}
.live-stat{text-align:center}
.live-stat-val{font-size:18px;font-weight:800;color:${C.navy};font-family:${C.mono};line-height:1}
.live-stat-lbl{font-size:10px;color:${C.inkMuted};text-transform:uppercase;letter-spacing:.5px;margin-top:2px}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(15,31,61,.45);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center}
.modal{background:${C.surface};border-radius:16px;padding:28px;width:380px;box-shadow:0 20px 60px rgba(15,31,61,.2);border:1px solid ${C.border}}
.modal-title{font-size:16px;font-weight:800;color:${C.navy};margin:0 0 6px}
.modal-sub{font-size:13px;color:${C.inkSub};margin:0 0 20px;line-height:1.5}
.modal-btns{display:flex;flex-direction:column;gap:8px}
.modal-btn{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;border:1.5px solid ${C.border};background:${C.surface};cursor:pointer;transition:all .15s;text-align:left;width:100%}
.modal-btn:hover{border-color:${C.blueBd};background:${C.blueLt}}
.modal-btn-ico{width:36px;height:36px;border-radius:8px;background:${C.blueLt};border:1px solid ${C.blueBd};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.modal-btn-lbl{font-size:13px;font-weight:700;color:${C.navy}}
.modal-btn-desc{font-size:11.5px;color:${C.inkSub};margin-top:1px}
.modal-cancel{margin-top:8px;padding:8px;border:none;background:none;color:${C.inkSub};font-size:12.5px;font-family:${C.font};cursor:pointer;width:100%;border-radius:8px;transition:background .12s}
.modal-cancel:hover{background:${C.hover};color:${C.inkMid}}

/* Misc */
.mono{font-family:${C.mono};font-size:11.5px}
.spinner{width:24px;height:24px;border:2.5px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:36px;text-align:center;color:${C.inkMuted};font-size:12.5px}
.loading{padding:28px;text-align:center;color:${C.inkMuted};font-size:12.5px}
.section-mb{margin-bottom:16px}
.candidate-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${C.blue},${C.blueDk});display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
`;

// ─── Icon helper ──────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const IC = {
  refresh:  'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15',
  plus:     'M12 5v14M5 12h14',
  cpu:      'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
  monitor:  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  arrow:    'M5 12h14M12 5l7 7-7 7',
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  clip:     'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5c0-1.105 0-2 2-2s2 .895 2 2',
  zap:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  close:    'M18 6 6 18M6 6l12 12',
  school:   'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    { cls: 'bdg-gr', dot: C.green },
    completed: { cls: 'bdg-bl', dot: C.blue },
    draft:     { cls: 'bdg-nt', dot: C.inkMuted },
    scheduled: { cls: 'bdg-am', dot: C.amber },
  };
  const key   = (status || '').toLowerCase();
  const m   = map[key] || map.draft;
  return (
    <span className={`bdg ${m.cls}`}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft'}
    </span>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 13px', boxShadow: '0 4px 14px rgba(0,0,0,.1)', fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: C.navy, margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: C.blue, margin: 0, fontFamily: C.mono }}>{payload[0].value} candidates</p>
    </div>
  );
}

function CandidateInitials({ name }) {
  const parts = (name || '').split(' ').filter(Boolean);
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (name || '?').substring(0, 2);
  return <div className="candidate-avatar">{initials.toUpperCase()}</div>;
}

// ─── Live Exam Modal ───────────────────────────────────────────────────────────
function LiveExamModal({ exam, onClose, onNavigate }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="live-pulse" style={{ marginBottom: 8 }}>
              <span className="live-dot" />
              LIVE NOW
            </div>
            <div className="modal-title">{exam.title || exam.name}</div>
            <p className="modal-sub" style={{ marginBottom: 0 }}>
              {exam.college} · {exam.candidates ?? exam.student_count ?? 0} candidates assigned
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: C.inkSub }}>
            <Ic d={IC.close} size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: C.inkSub, margin: '0 0 14px', fontWeight: 600 }}>
          Where would you like to go?
        </p>

        <div className="modal-btns">
          <button className="modal-btn" onClick={() => onNavigate('/live-monitoring', exam.id)}>
            <div className="modal-btn-ico"><Ic d={IC.monitor} size={16} color={C.blue} /></div>
            <div>
              <div className="modal-btn-lbl">Live Monitoring</div>
              <div className="modal-btn-desc">Watch candidate activity and submissions in real time</div>
            </div>
          </button>
          <button className="modal-btn" onClick={() => onNavigate('/ai-detection', exam.id)}>
            <div className="modal-btn-ico"><Ic d={IC.cpu} size={16} color={C.blue} /></div>
            <div>
              <div className="modal-btn-lbl">AI Code Detection</div>
              <div className="modal-btn-desc">Analyse submissions for AI-generated code patterns</div>
            </div>
          </button>
        </div>
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  // ── State ──
  const [allExams,     setAllExams]     = useState([]);
  const [candidates,   setCandidates]   = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingCands, setLoadingCands] = useState(true);
  const [error,        setError]        = useState(null);
  const [selectedLive, setSelectedLive] = useState(null);
  const [refreshKey,   setRefreshKey]   = useState(0);

  // ── Fetch all exams ────────────────────────────────────────────────────────
  const fetchExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const r = await authFetch(`${API}/exams`);
      if (r.status === 401) throw new Error('Session expired — please log in again');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.exams || []);
      setAllExams(arr);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  // ── Fetch candidates ───────────────────────────────────────────────────────
  const fetchCandidates = useCallback(async () => {
    setLoadingCands(true);
    try {
      const r = await authFetch(`${API}/candidates`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.students || []);
      setCandidates(arr);
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCands(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    fetchCandidates();
  }, [refreshKey]);

  // ── Auto-refresh every 30s ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => fetchExams(), 30_000);
    return () => clearInterval(id);
  }, [fetchExams]);

  // ── Derived data ───────────────────────────────────────────────────────────
  // Live exams = status is 'active' — derived directly from allExams, no extra API call
  const liveExams  = allExams.filter(e => isLiveStatus(e.status));
  const active     = liveExams.length;
  const completed  = allExams.filter(e => ['completed', 'Completed'].includes(e.status)).length;
  const totalCands = allExams.reduce((a, e) => a + (Number(e.candidates) || Number(e.student_count) || 0), 0);

  // Recent 5 exams sorted by created_at
  const recentExams = [...allExams]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Recent 5 candidates
  const recentCandidates = [...candidates]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Chart data
  const chartData = [...allExams]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .reverse()
    .map(e => ({
      name: ((e.name || e.title || 'Unnamed').length > 14
        ? (e.name || e.title || 'Unnamed').slice(0, 14) + '…'
        : (e.name || e.title || 'Unnamed')),
      candidates: Number(e.candidates) || Number(e.student_count) || 0,
    }));

  const handleRefresh = () => {
    setError(null);
    setRefreshKey(k => k + 1);
  };

  const handleLiveNav = (path, examId) => {
    setSelectedLive(null);
    navigate(`${path}?exam_id=${examId}`);
  };

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar /><Navbar />

      <main className="ap-main">

        {/* ── ── Header ── ── */}
        <div className="ap-hdr">
          <div>
            <h1 className="ap-title">Dashboard</h1>
            <p className="ap-sub">Real-time overview of your assessment platform</p>
          </div>
          <div className="ap-hdr-r">
            <button className="btn-sec" onClick={handleRefresh}>
              <Ic d={IC.refresh} size={13} color={C.inkSub} /> Refresh
            </button>
            <button className="btn-pri" onClick={() => navigate('/create-exam')}>
              <Ic d={IC.plus} size={13} color="#fff" /> Create Exam
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div style={{ background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: C.red }}>
            <span>{error}</span>
            {error.includes('log in') && (
              <button className="btn-pri" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/login')}>Log in</button>
            )}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="stat-grid">
          {[
            { lbl: 'Total Exams',      val: loadingExams ? '…' : allExams.length, desc: 'All time created',      cls: 'stat-bl' },
            { lbl: 'Active Exams',     val: loadingExams ? '…' : active,           desc: 'Currently running',     cls: 'stat-gr' },
            { lbl: 'Total Candidates', val: loadingExams ? '…' : totalCands,       desc: 'Across all exams',      cls: 'stat-bl' },
            { lbl: 'Completed Exams',  val: loadingExams ? '…' : completed,        desc: 'Successfully finished', cls: 'stat-gr' },
          ].map(s => (
            <div key={s.lbl} className={`stat-card ${s.cls}`}>
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Live Exams Section ── */}
        <div className="card section-mb">
          <div className="card-hdr">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="live-dot" style={{ display: 'inline-block' }} />
                Live Exams
                {!loadingExams && liveExams.length > 0 && (
                  <span className="bdg bdg-lv" style={{ marginLeft: 4 }}>{liveExams.length} active</span>
                )}
              </div>
              <div className="card-sub">Exams with status "Active" are shown here</div>
            </div>
            <button className="btn-sec" style={{ fontSize: 11.5, padding: '5px 10px' }} onClick={handleRefresh}>
              <Ic d={IC.refresh} size={12} color={C.inkSub} /> Refresh
            </button>
          </div>

          {loadingExams ? (
            <div className="loading"><div className="spinner" style={{ marginBottom: 10 }} />Loading exams…</div>
          ) : liveExams.length === 0 ? (
            <div className="empty" style={{ padding: '28px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🟢</div>
              <div style={{ fontWeight: 600, color: C.inkMid, marginBottom: 3 }}>No exams are live right now</div>
              <div style={{ color: C.inkMuted, fontSize: 12 }}>Exams set to "Active" will appear here automatically</div>
            </div>
          ) : (
            <div className="live-grid">
              {liveExams.map(exam => (
                <div key={exam.id} className="live-card" onClick={() => setSelectedLive(exam)}>
                  <div className="live-pulse">
                    <span className="live-dot" />
                    LIVE
                  </div>
                  <div className="live-title">{exam.title || exam.name}</div>
                  <div className="live-meta">
                    {exam.college || '—'} · {exam.exam_type || 'Placement'}
                    {exam.batch_year && ` · Batch ${exam.batch_year}`}
                  </div>
                  <div className="live-stats">
                    <div className="live-stat">
                      <div className="live-stat-val" style={{ color: C.live }}>
                        {exam.candidates ?? exam.student_count ?? 0}
                      </div>
                      <div className="live-stat-lbl">Candidates</div>
                    </div>
                    {exam.duration_minutes && (
                      <div className="live-stat">
                        <div className="live-stat-val">{exam.duration_minutes}</div>
                        <div className="live-stat-lbl">Min Duration</div>
                      </div>
                    )}
                    {exam.batch_year && (
                      <div className="live-stat">
                        <div className="live-stat-val">{exam.batch_year}</div>
                        <div className="live-stat-lbl">Batch</div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, color: C.live, fontSize: 11.5, fontWeight: 600 }}>
                    Click to monitor <Ic d={IC.arrow} size={12} color={C.live} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Two-column: Recent Exams + Recent Candidates ── */}
        <div className="two-col">

          {/* Recent Exams */}
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Recent Exams</div>
              </div>
              <button className="btn-pri" style={{ fontSize: 11.5, padding: '5px 12px' }} onClick={() => navigate('/create-exam')}>
                <Ic d={IC.plus} size={12} color="#fff" /> New
              </button>
            </div>
            <div className="tbl-wrap">
              {loadingExams ? (
                <div className="loading"><div className="spinner" style={{ marginBottom: 8 }} />Loading…</div>
              ) : recentExams.length === 0 ? (
                <div className="empty">
                  No exams yet.{' '}
                  <span style={{ color: C.blue, cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/create-exam')}>
                    Create one
                  </span>
                </div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Candidates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExams.map((e, i) => (
                      <tr key={e.id || i}>
                        <td>
                          <div style={{ fontWeight: 600, color: C.navy, fontSize: 12.5, marginBottom: 2 }}>
                            {(e.name || e.title || '—').length > 28
                              ? (e.name || e.title || '—').slice(0, 28) + '…'
                              : (e.name || e.title || '—')}
                          </div>
                          <div style={{ fontSize: 11, color: C.inkMuted }}>
                            {e.college || '—'}
                            {e.batch_year ? ` · ${e.batch_year}` : ''}
                          </div>
                        </td>
                        <td>
                          <span className="mono" style={{ fontWeight: 700, color: C.navy }}>
                            {e.candidates ?? e.student_count ?? 0}
                          </span>
                        </td>
                        <td><StatusBadge status={e.status || 'Draft'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Candidates */}
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Recent Candidates</div>
              </div>
              <button className="btn-sec" style={{ fontSize: 11.5, padding: '5px 12px' }} onClick={() => navigate('/candidates')}>
                View All
              </button>
            </div>
            <div className="tbl-wrap">
              {loadingCands ? (
                <div className="loading"><div className="spinner" style={{ marginBottom: 8 }} />Loading…</div>
              ) : recentCandidates.length === 0 ? (
                <div className="empty">No candidates found.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>College</th>
                      <th>Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCandidates.map((c, i) => (
                      <tr key={c.id || i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CandidateInitials name={c.name} />
                            <div>
                              <div style={{ fontWeight: 600, color: C.navy, fontSize: 12.5 }}>
                                {(c.name || '—').length > 20 ? c.name.slice(0, 20) + '…' : (c.name || '—')}
                              </div>
                              <div style={{ fontSize: 10.5, color: C.inkMuted }}>
                                {(c.email || '').length > 22 ? c.email.slice(0, 22) + '…' : (c.email || '—')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: C.inkSub, fontSize: 12 }}>
                          {c.college || '—'}
                          {c.branch ? (
                            <div style={{ fontSize: 10.5, color: C.inkMuted }}>{c.branch}</div>
                          ) : null}
                        </td>
                        <td>
                          {c.batch ? (
                            <span className="bdg bdg-nt">{c.batch}</span>
                          ) : (
                            <span style={{ color: C.inkMuted, fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>


      </main>

      {/* ── Live Exam Navigation Modal ── */}
      {selectedLive && (
        <LiveExamModal
          exam={selectedLive}
          onClose={() => setSelectedLive(null)}
          onNavigate={handleLiveNav}
        />
      )}

      <ToastContainer />
    </div>
  );
}
