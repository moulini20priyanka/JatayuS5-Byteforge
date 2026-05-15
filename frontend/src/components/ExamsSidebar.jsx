// ExamsSidebar.jsx — Slide-in right drawer: all exams with filters
// Usage: <ExamsSidebar open={open} onClose={() => setOpen(false)} />

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Design tokens (match CreateExam palette) ──────────────────────────────────
const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#c4b5fd',
  teal: '#0891b2', tealBg: '#f0f9ff', tealBd: '#bae6fd',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// Status → visual config
const STATUS_MAP = {
  scheduled: { label: 'Scheduled', color: C.amber,  bg: C.amberBg,  border: C.amberBd },
  live:       { label: 'Live',      color: C.green,  bg: C.greenBg,  border: C.greenBd },
  active:     { label: 'Live',      color: C.green,  bg: C.greenBg,  border: C.greenBd },
  completed:  { label: 'Done',      color: C.inkSub, bg: C.subtle,   border: C.border  },
  cancelled:  { label: 'Cancelled', color: C.red,    bg: C.redBg,    border: C.redBd   },
};

const TYPE_MAP = {
  placement: { label: 'Placement', color: C.blue,   bg: C.blueLt,  border: C.blueBd  },
  skill_cert:{ label: 'Cert',      color: C.purple, bg: C.purpleBg,border: C.purpleBd },
  university:{ label: 'University',color: C.teal,   bg: C.tealBg,  border: C.tealBd  },
};

const COLLEGES   = ['All Colleges','RMKEC','RMDEC','RMKCET'];
const EXAM_TYPES = ['All Types','placement','skill_cert','university'];
const STATUSES   = ['All Status','scheduled','live','completed','cancelled'];

// ── Styles injected once ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600;700&display=swap');

.es-overlay{
  position:fixed;inset:0;background:rgba(15,31,61,.38);z-index:1200;
  opacity:0;transition:opacity .25s ease;pointer-events:none;
}
.es-overlay.open{opacity:1;pointer-events:all;}

.es-drawer{
  position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100vw;
  background:${C.surface};z-index:1201;
  display:flex;flex-direction:column;
  box-shadow:-8px 0 48px rgba(15,31,61,.18);
  transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);
  font-family:${C.font};
}
.es-drawer.open{transform:translateX(0);}

/* Header */
.es-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 20px 14px;border-bottom:1px solid ${C.border};
  background:${C.navy};flex-shrink:0;
}
.es-hdr-title{font-size:15px;font-weight:800;color:#fff;letter-spacing:-.2px;}
.es-hdr-sub{font-size:11px;color:rgba(255,255,255,.55);margin-top:2px;}
.es-close{
  width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.12);
  border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:#fff;transition:background .15s;flex-shrink:0;
}
.es-close:hover{background:rgba(255,255,255,.22);}

/* Filters bar */
.es-filters{
  padding:12px 16px;border-bottom:1px solid ${C.border};
  background:${C.subtle};flex-shrink:0;display:flex;flex-direction:column;gap:8px;
}
.es-search{
  display:flex;align-items:center;gap:8px;
  background:${C.surface};border:1.5px solid ${C.border};border-radius:8px;
  padding:7px 10px;transition:border-color .15s;
}
.es-search:focus-within{border-color:${C.blue};}
.es-search input{
  border:none;outline:none;flex:1;font-size:12.5px;color:${C.ink};
  background:transparent;font-family:${C.font};
}
.es-search input::placeholder{color:${C.inkMuted};}
.es-chips{display:flex;gap:6px;flex-wrap:wrap;}
.es-chip{
  padding:4px 10px;border-radius:99px;border:1.5px solid ${C.border};
  background:${C.surface};font-size:11px;font-weight:600;color:${C.inkMid};
  cursor:pointer;transition:all .12s;white-space:nowrap;
}
.es-chip:hover{border-color:${C.blueBd};color:${C.blue};background:${C.blueLt};}
.es-chip.active{border-color:${C.blue};background:${C.blueLt};color:${C.blue};}

/* Stats strip */
.es-stats{
  display:flex;gap:0;border-bottom:1px solid ${C.border};flex-shrink:0;
}
.es-stat{
  flex:1;padding:10px 0;text-align:center;border-right:1px solid ${C.border};
}
.es-stat:last-child{border-right:none;}
.es-stat-n{font-size:17px;font-weight:800;color:${C.navy};font-family:${C.mono};}
.es-stat-l{font-size:10px;color:${C.inkMuted};font-weight:600;margin-top:1px;}

/* List */
.es-list{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;}
.es-list::-webkit-scrollbar{width:4px;}
.es-list::-webkit-scrollbar-track{background:transparent;}
.es-list::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px;}

/* Card */
.es-card{
  border:1.5px solid ${C.border};border-radius:11px;background:${C.surface};
  padding:13px 15px;cursor:pointer;transition:all .15s;
}
.es-card:hover{border-color:${C.blueBd};box-shadow:0 2px 12px rgba(37,99,235,.1);transform:translateY(-1px);}
.es-card.expanded{border-color:${C.blue};background:${C.blueLt};}

.es-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.es-card-name{font-size:13px;font-weight:700;color:${C.ink};line-height:1.35;flex:1;}
.es-card.expanded .es-card-name{color:${C.blue};}
.es-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;border:1px solid;flex-shrink:0;}
.es-card-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;align-items:center;}
.es-meta-item{display:flex;align-items:center;gap:3px;font-size:11px;color:${C.inkMuted};}

/* Expanded detail */
.es-detail{
  margin-top:12px;padding-top:12px;border-top:1px solid ${C.blueBd};
  display:flex;flex-direction:column;gap:8px;
}
.es-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.es-detail-item{background:${C.surface};border-radius:7px;padding:8px 10px;border:1px solid ${C.blueBd};}
.es-detail-label{font-size:9.5px;color:${C.inkMuted};font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
.es-detail-value{font-size:12.5px;color:${C.ink};font-weight:700;margin-top:2px;}
.es-detail-actions{display:flex;gap:7px;margin-top:4px;}
.es-btn-sm{
  flex:1;padding:7px 12px;border-radius:7px;font-size:11.5px;font-weight:700;
  font-family:${C.font};cursor:pointer;transition:all .13s;border:none;display:flex;align-items:center;justify-content:center;gap:5px;
}

/* Section chips */
.es-sections{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;}
.es-sec-chip{
  padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid;
}

/* Empty / loading */
.es-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:12px;}
.es-empty-icon{width:48px;height:48px;border-radius:12px;background:${C.hover};display:flex;align-items:center;justify-content:center;}
.es-spinner{
  width:20px;height:20px;border:2px solid ${C.border};border-top-color:${C.blue};
  border-radius:50%;animation:es-spin .7s linear infinite;
}
@keyframes es-spin{to{transform:rotate(360deg)}}

/* Nav btn at bottom */
.es-footer{
  padding:12px 16px;border-top:1px solid ${C.border};flex-shrink:0;
  background:${C.subtle};display:flex;gap:8px;
}
`;

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const IC = {
  x:       'M18 6L6 18M6 6l12 12',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  list:    'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  user:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  clock:   'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-14v4l3 3',
  check:   'M20 6L9 17L4 12',
  eye:     'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  arrow:   'M5 12h14M12 5l7 7-7 7',
  filter:  'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  tag:     'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
  grid:    'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
};

// ── Status dot live pulse ─────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: C.green,
        animation: 'es-pulse 1.4s ease-in-out infinite',
      }} />
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, position: 'relative' }} />
      <style>{`@keyframes es-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(2);opacity:0}}`}</style>
    </span>
  );
}

// ── Compute live status from dates ────────────────────────────────────────────
function computeStatus(exam) {
  const now = Date.now();
  const start = exam.start_date ? new Date(exam.start_date).getTime() : null;
  const end   = exam.end_date   ? new Date(exam.end_date).getTime()   : null;
  if (exam.status === 'cancelled') return 'cancelled';
  if (exam.status === 'completed') return 'completed';
  if (start && end && now >= start && now <= end) return 'live';
  if (start && now < start) return 'scheduled';
  if (end   && now > end)   return 'completed';
  return exam.status || 'scheduled';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── ExamCard ──────────────────────────────────────────────────────────────────
function ExamCard({ exam, navigate, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const status  = computeStatus(exam);
  const sc      = STATUS_MAP[status] || STATUS_MAP.scheduled;
  const tc      = TYPE_MAP[(exam.exam_type || '').toLowerCase()] || TYPE_MAP.placement;
  const sections = typeof exam.sections === 'object' ? exam.sections : {};
  const secKeys = Object.entries(sections).filter(([, v]) => v).map(([k]) => k);

  const QB_COLORS = {
    mcq:      { color: C.blue,   bg: C.blueLt,  border: C.blueBd },
    sql:      { color: C.purple, bg: C.purpleBg, border: C.purpleBd },
    coding:   { color: C.amber,  bg: C.amberBg,  border: C.amberBd },
    aptitude: { color: C.teal,   bg: C.tealBg,   border: C.tealBd },
    verbal:   { color: '#db2777', bg: '#fdf2f8',  border: '#fbcfe8' },
    written:  { color: C.inkMid, bg: C.hover,    border: C.border  },
  };

  return (
    <div className={`es-card${expanded ? ' expanded' : ''}`} onClick={() => setExpanded(v => !v)}>
      <div className="es-card-top">
        <div className="es-card-name">{exam.title || exam.exam_name || '—'}</div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span className="es-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
            {status === 'live' && <LiveDot />}
            {status !== 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, marginRight: 2 }} />}
            {sc.label}
          </span>
          <span className="es-badge" style={{ color: tc.color, background: tc.bg, borderColor: tc.border }}>
            {tc.label}
          </span>
        </div>
      </div>

      <div className="es-card-meta">
        <span className="es-meta-item"><Ic d={IC.user} size={11} color={C.teal} />{exam.college || '—'}</span>
        <span className="es-meta-item" style={{ color: C.inkMuted }}>·</span>
        <span className="es-meta-item"><Ic d={IC.tag} size={11} color={C.inkMuted} />Batch {exam.batch_year || '—'}</span>
        <span className="es-meta-item" style={{ color: C.inkMuted }}>·</span>
        <span className="es-meta-item"><Ic d={IC.clock} size={11} color={C.inkMuted} />{exam.duration_minutes || '—'} min</span>
        <span className="es-meta-item" style={{ color: C.inkMuted }}>·</span>
        <span className="es-meta-item">
          <Ic d={IC.user} size={11} color={C.inkMuted} />
          <strong style={{ color: C.blue, fontFamily: C.mono }}>{exam.student_count ?? exam.candidates ?? 0}</strong> students
        </span>
      </div>

      {secKeys.length > 0 && (
        <div className="es-sections">
          {secKeys.map(k => {
            const m = QB_COLORS[k.toLowerCase()] || { color: C.inkSub, bg: C.subtle, border: C.border };
            return (
              <span key={k} className="es-sec-chip" style={{ color: m.color, background: m.bg, borderColor: m.border }}>
                {k.toUpperCase()}
              </span>
            );
          })}
        </div>
      )}

      {expanded && (
        <div className="es-detail" onClick={e => e.stopPropagation()}>
          <div className="es-detail-grid">
            {[
              ['Exam Key', exam.exam_key || '—'],
              ['Questions', exam.question_count ?? '—'],
              ['Start', fmtDateTime(exam.start_date)],
              ['End',   fmtDateTime(exam.end_date)],
              ['Total Marks', exam.total_marks ?? '—'],
              ['Pass Mark',   exam.pass_mark   ?? exam.cutoff_score ?? '—'],
            ].map(([l, v]) => (
              <div key={l} className="es-detail-item">
                <div className="es-detail-label">{l}</div>
                <div className="es-detail-value" style={{ fontFamily: l === 'Exam Key' ? C.mono : C.font, fontSize: l === 'Exam Key' ? 11 : 12.5 }}>{v}</div>
              </div>
            ))}
          </div>

          {exam.description && (
            <div style={{ padding: '8px 10px', background: C.surface, borderRadius: 7, border: `1px solid ${C.blueBd}`, fontSize: 11.5, color: C.inkMid, lineHeight: 1.55 }}>
              {exam.description}
            </div>
          )}

          <div className="es-detail-actions">
            <button
              className="es-btn-sm"
              style={{ background: C.blueLt, color: C.blue, border: `1.5px solid ${C.blueBd}` }}
              onClick={() => { onClose(); navigate(`/admin-exams/${exam.id}`); }}
            >
              <Ic d={IC.eye} size={12} color={C.blue} /> View Details
            </button>
            <button
              className="es-btn-sm"
              style={{ background: C.navy, color: '#fff' }}
              onClick={() => { onClose(); navigate(`/admin-exams/${exam.id}/students`); }}
            >
              <Ic d={IC.user} size={12} color="#fff" /> Students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function ExamsSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterStat, setFilterStat] = useState('All Status');
  const [filterCol,  setFilterCol]  = useState('All Colleges');
  const styleRef = useRef(false);

  // Inject CSS once
  if (!styleRef.current) {
    styleRef.current = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'All Types')    params.set('exam_type', filterType);
      if (filterStat !== 'All Status')   params.set('status',    filterStat);
      if (filterCol  !== 'All Colleges') params.set('college',   filterCol);
      const res  = await fetch(`${API}/api/exams?${params}`, { headers: authHeader() });
      const data = await res.json();
      setExams(data.exams || []);
    } catch {
      setExams([]);
    }
    setLoading(false);
  }, [filterType, filterStat, filterCol]);

  useEffect(() => { if (open) fetchExams(); }, [open, fetchExams]);

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Filtered by search
  const displayed = exams.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.title || '').toLowerCase().includes(q) ||
      (e.college || '').toLowerCase().includes(q) ||
      (e.exam_key || '').toLowerCase().includes(q) ||
      String(e.batch_year || '').includes(q)
    );
  });

  // Stats
  const statuses = exams.map(computeStatus);
  const liveCount      = statuses.filter(s => s === 'live').length;
  const scheduledCount = statuses.filter(s => s === 'scheduled').length;
  const doneCount      = statuses.filter(s => s === 'completed').length;

  return (
    <>
      {/* Overlay */}
      <div className={`es-overlay${open ? ' open' : ''}`} onClick={onClose} />

      {/* Drawer */}
      <div className={`es-drawer${open ? ' open' : ''}`} role="dialog" aria-label="All Exams">

        {/* Header */}
        <div className="es-hdr">
          <div>
            <div className="es-hdr-title">All Exams</div>
            <div className="es-hdr-sub">{exams.length} total · click any card to expand</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="es-close" onClick={fetchExams} title="Refresh">
              <Ic d={IC.refresh} size={14} color="#fff" />
            </button>
            <button className="es-close" onClick={onClose} title="Close">
              <Ic d={IC.x} size={14} color="#fff" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="es-filters">
          {/* Search */}
          <div className="es-search">
            <Ic d={IC.search} size={13} color={C.inkMuted} />
            <input
              placeholder="Search title, college, exam key…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: C.inkMuted }}>
                <Ic d={IC.x} size={12} color={C.inkMuted} />
              </button>
            )}
          </div>

          {/* Type chips */}
          <div className="es-chips">
            <Ic d={IC.filter} size={11} color={C.inkMuted} />
            {EXAM_TYPES.map(t => (
              <button key={t} className={`es-chip${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
                {t === 'skill_cert' ? 'Cert' : t === 'All Types' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Status chips */}
          <div className="es-chips">
            {STATUSES.map(s => (
              <button key={s} className={`es-chip${filterStat === s ? ' active' : ''}`} onClick={() => setFilterStat(s)}>
                {s === 'All Status' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* College chips */}
          <div className="es-chips">
            {COLLEGES.map(c => (
              <button key={c} className={`es-chip${filterCol === c ? ' active' : ''}`} onClick={() => setFilterCol(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="es-stats">
          {[
            { n: exams.length, l: 'Total' },
            { n: liveCount,      l: 'Live',      c: C.green },
            { n: scheduledCount, l: 'Scheduled',  c: C.amber },
            { n: doneCount,      l: 'Completed',  c: C.inkSub },
          ].map(({ n, l, c }) => (
            <div key={l} className="es-stat">
              <div className="es-stat-n" style={c ? { color: c } : {}}>{n}</div>
              <div className="es-stat-l">{l}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="es-empty">
            <div className="es-spinner" />
            <div style={{ fontSize: 12, color: C.inkMuted }}>Fetching exams…</div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="es-empty">
            <div className="es-empty-icon">
              <Ic d={IC.list} size={22} color={C.inkMuted} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMid }}>No exams found</div>
            <div style={{ fontSize: 11.5, color: C.inkMuted, textAlign: 'center', maxWidth: 220 }}>
              {search ? 'Try a different search term.' : 'Change the filters or create your first exam.'}
            </div>
          </div>
        ) : (
          <div className="es-list">
            {displayed.map(exam => (
              <ExamCard key={exam.id} exam={exam} navigate={navigate} onClose={onClose} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="es-footer">
          <button
            onClick={() => { onClose(); navigate('/admin-exams'); }}
            style={{
              flex: 1, padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${C.border}`,
              background: C.surface, color: C.inkMid, fontSize: 12.5, fontWeight: 700,
              fontFamily: C.font, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Ic d={IC.grid} size={13} color={C.inkMid} /> Full Exams Page
          </button>
        </div>
      </div>
    </>
  );
}