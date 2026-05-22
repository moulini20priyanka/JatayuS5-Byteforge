

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar          from '../components/Navbar';
import Sidebar         from '../components/Sidebar';
import ConfigurePanel  from '../components/QuizForge/ConfigurePanel';
import GeneratingPanel from '../components/QuizForge/GeneratingPanel';
import ReviewPanel     from '../components/QuizForge/ReviewPanel';
import StepIndicator   from '../components/QuizForge/StepIndicator';
import { useGeneration } from '../hooks/useGeneration';

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
function authHeader() { const t = localStorage.getItem('admin_token') || localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }

const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#ddd6fe',
  teal: '#0891b2', tealBg: '#f0f9ff', tealBd: '#bae6fd',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box}
.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:32px 36px}
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.ap-title{font-size:22px;font-weight:800;color:${C.navy};margin:0 0 4px;letter-spacing:-0.3px}
.ap-sub{font-size:13px;color:${C.inkSub};margin:0}
.ap-hdr-r{display:flex;align-items:center;gap:10px}
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-ghost{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:${C.inkSub};border:1px solid ${C.border};border-radius:7px;font-size:12px;font-weight:500;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-ghost:hover{background:${C.hover};color:${C.inkMid}}
.btn-sm{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:7px;font-size:11.5px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .12s;border:1px solid}
.btn-sm-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.btn-sm-bl:hover{background:${C.blueBd}}
.btn-sm-nt{background:${C.subtle};color:${C.inkMid};border-color:${C.border}}
.btn-sm-nt:hover{background:${C.hover}}
.btn-sm-rd{background:${C.redBg};color:${C.red};border-color:${C.redBd}}
.btn-sm-rd:hover{background:#fee2e2}
.btn-sm-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.btn-sm-gr:hover{background:#d1fae5}
.btn-neuro{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;background:${C.navy};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;font-family:${C.font};cursor:pointer;transition:all .15s;box-shadow:0 2px 10px rgba(15,31,61,.2)}
.btn-neuro:hover{background:#162d52;transform:translateY(-1px);box-shadow:0 4px 14px rgba(15,31,61,.28)}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden}
.stat-row{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.stat-chip{padding:10px 16px;border-radius:10px;background:${C.surface};border:1.5px solid}
.filter-bar{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:11px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.search-wrap{display:flex;align-items:center;gap:8px;background:${C.subtle};border:1px solid ${C.border};border-radius:8px;padding:7px 12px;flex:1 1 200px;min-width:180px}
.search-inp{background:none;border:none;outline:none;font-size:13px;color:${C.ink};width:100%;font-family:${C.font}}
.filter-chip{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${C.border};background:${C.surface};color:${C.inkSub};transition:all .15s;font-family:${C.font}}
.filter-chip:hover{background:${C.hover};color:${C.inkMid}}
.filter-chip.active{border-color:${C.blue};background:${C.blueLt};color:${C.blue}}
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:11px 14px;text-align:left;font-size:10.5px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl td{padding:13px 14px;vertical-align:middle}
.type-chip{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid}
.exam-type-bdg{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid}
.bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap}
.mono{font-family:${C.mono};font-size:12px}
.spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
.spin-sm{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ap-spin .7s linear infinite}
.spin-col{display:inline-block;width:13px;height:13px;border:2px solid rgba(37,99,235,.2);border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:52px;text-align:center;color:${C.inkMuted};font-size:13px}
.loading{padding:36px;text-align:center;color:${C.inkMuted};font-size:13px}
.modal-overlay{position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:ov-in .15s ease}
@keyframes ov-in{from{opacity:0}to{opacity:1}}
.modal-lg{background:${C.surface};border-radius:16px;width:min(940px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.25);animation:md-in .18s ease}
.modal-hdr{padding:18px 24px;border-bottom:1px solid ${C.border};display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;background:${C.subtle}}
.modal-sm{background:${C.surface};border-radius:16px;padding:0;width:min(420px,96vw);box-shadow:0 24px 60px rgba(0,0,0,.22);overflow:hidden;animation:md-in .18s ease}
.modal-xl{background:${C.surface};border-radius:16px;width:min(700px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.25);animation:md-in .18s ease}
@keyframes md-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.q-row{margin-bottom:7px;border:1px solid ${C.border};border-radius:9px;overflow:hidden}
.q-row-hdr{padding:10px 14px;display:flex;align-items:flex-start;gap:10px;cursor:pointer;background:${C.surface};transition:background .12s}
.q-row-hdr:hover{background:${C.hover}}
.q-row-body{padding:0 14px 14px 50px;background:${C.blueLt};border-top:1px solid ${C.border}}
.q-row-body-theory{padding:0 14px 14px 50px;background:#faf5ff;border-top:1px solid ${C.purpleBd}}
.opt-row{padding:6px 10px;border-radius:6px;font-size:12.5px;display:flex;align-items:center;gap:7px;border:1px solid;margin-bottom:4px}
.kp-row{padding:5px 10px;border-radius:6px;font-size:12px;display:flex;align-items:flex-start;gap:7px;border:1px solid ${C.purpleBd};background:#fff;margin-bottom:4px;color:${C.purple}}
.tab-bar{display:flex;border-bottom:1px solid ${C.border};flex-shrink:0}
.tab-btn{padding:10px 20px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;color:${C.inkMuted};transition:all .15s;font-family:${C.font}}
.tab-btn.active{border-bottom-color:${C.blue};color:${C.blue}}
.sub-hdr{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:16px;margin-bottom:20px;box-shadow:0 1px 4px rgba(15,31,61,.07)}
.neuro-badge{display:flex;align-items:center;gap:6px;background:${C.navy};color:#fff;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:700}
.hint-box{margin-top:14px;padding:11px 14px;background:${C.blueLt};border:1px solid ${C.blueBd};border-radius:8px;display:flex;gap:10px;align-items:flex-start;font-size:12px;color:${C.blue}}
.fld{display:flex;flex-direction:column;gap:5px}
.fld-lbl{font-size:11.5px;font-weight:700;color:${C.inkMid}}
.fld-inp{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;transition:all .15s;width:100%}
.fld-inp:focus{border-color:${C.blue};background:${C.surface};box-shadow:0 0 0 3px rgba(37,99,235,.07)}
.fld-ta{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;transition:all .15s;width:100%;resize:vertical;line-height:1.6}
.fld-ta:focus{border-color:${C.blue};background:${C.surface};box-shadow:0 0 0 3px rgba(37,99,235,.07)}
.fld-mono{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:12px;color:${C.ink};background:#1e293b;color:#e2e8f0;font-family:${C.mono};outline:none;transition:all .15s;width:100%;resize:vertical;line-height:1.6}
.fld-mono:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(37,99,235,.07)}

/* ── PDF button states ── */
.btn-pdf{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;font-size:12.5px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .2s;border:1.5px solid;white-space:nowrap}
.btn-pdf-idle{background:${C.surface};color:${C.inkMid};border-color:${C.border}}
.btn-pdf-idle:hover{background:${C.hover};border-color:${C.borderMid};transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.08)}
.btn-pdf-loading{background:#fffbeb;color:${C.amber};border-color:${C.amberBd};cursor:not-allowed}
.btn-pdf-success{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}

/* ── Add Question button ── */
.btn-add-q{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;font-size:12.5px;font-weight:700;font-family:${C.font};cursor:pointer;transition:all .2s;border:none;background:linear-gradient(135deg,${C.blue},${C.blueDk});color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.25);white-space:nowrap}
.btn-add-q:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(37,99,235,.35)}

/* ── Type selector tabs ── */
.qtype-tab{flex:1;padding:12px 8px;border-radius:10px;cursor:pointer;border:2px solid ${C.border};background:${C.surface};transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:${C.inkSub}}
.qtype-tab:hover{border-color:${C.borderMid};background:${C.hover}}
.qtype-tab.active{border-color:${C.blue};background:${C.blueLt};color:${C.blue}}

/* ── Option input row ── */
.opt-inp-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.opt-letter{width:24px;height:24px;border-radius:6px;background:${C.subtle};border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${C.inkMid};flex-shrink:0}
.opt-letter.correct{background:${C.greenBg};border-color:${C.greenBd};color:${C.green}}

/* ── Toast ── */
.toast-wrap{position:fixed;top:20px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{padding:12px 18px;border-radius:11px;font-size:13px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.18);animation:t-in .2s ease;display:flex;align-items:center;gap:9px;pointer-events:auto;max-width:360px}
@keyframes t-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
.toast-success{background:${C.navy};color:#fff}
.toast-error{background:${C.red};color:#fff}
.toast-info{background:${C.blue};color:#fff}
`;

const Ic = ({ d, size=14, color='currentColor', sw=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
    <path d={d}/>
  </svg>
);
const IC = {
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  plus:     "M12 5v14M5 12h14",
  back:     "M19 12H5M12 5l-7 7 7 7",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  x:        "M18 6L6 18M6 6L18 18",
  check:    "M20 6L9 17L4 12",
  trash:    "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  search:   "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  info:     "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  warn:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  code:     "M16 18l6-6-6-6M8 6l-6 6 6 6",
  book:     "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  db:       "M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 17c0 2.76 4.48 5 10 5s10-2.24 10-5M2 12c0 2.76 4.48 5 10 5s10-2.24 10-5",
};

const QB_COLORS = {
  mcq:      { color: C.blue,    bg: C.blueLt,   border: C.blueBd   },
  sql:      { color: C.purple,  bg: C.purpleBg, border: C.purpleBd },
  coding:   { color: C.amber,   bg: C.amberBg,  border: C.amberBd  },
  aptitude: { color: C.teal,    bg: C.tealBg,   border: C.tealBd   },
  verbal:   { color: '#db2777', bg: '#fdf2f8',  border: '#fbcfe8'  },
  theory:   { color: '#7c3aed', bg: '#f5f3ff',  border: '#ddd6fe'  },
};
const MARK_COLORS = {
  '2m': { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: '2-Mark' },
  '5m': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: '5-Mark' },
  '8m': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: '8-Mark' },
};
const BLOOM_COLORS = {
  remember:   { color: '#0891b2', bg: '#f0f9ff' },
  understand: { color: '#2563eb', bg: '#eff6ff' },
  apply:      { color: '#059669', bg: '#ecfdf5' },
  analyse:    { color: '#d97706', bg: '#fffbeb' },
  analyze:    { color: '#d97706', bg: '#fffbeb' },
  evaluate:   { color: '#dc2626', bg: '#fef2f2' },
  create:     { color: '#7c3aed', bg: '#f5f3ff' },
};
const EXAM_TYPE_META = {
  placement:           { label:'Placement',    color:C.blue,   bg:C.blueLt,  border:C.blueBd  },
  hiring:              { label:'Hiring',       color:C.blue,   bg:C.blueLt,  border:C.blueBd  },
  university:          { label:'University',   color:C.teal,   bg:C.tealBg,  border:C.tealBd  },
  skill_cert:          { label:'Certification',color:C.green,  bg:C.greenBg, border:C.greenBd },
  skill_certification: { label:'Certification',color:C.green,  bg:C.greenBg, border:C.greenBd },
  general:             { label:'General',      color:C.inkSub, bg:C.subtle,  border:C.border  },
};
const LANG_LABELS = { python:'Python', java:'Java', cpp:'C++', javascript:'JavaScript' };

function TypeChip({ type }) {
  const key = (type||'').toLowerCase();
  const m = QB_COLORS[key] || { color:C.inkSub, bg:C.subtle, border:C.border };
  return (
    <span className="type-chip" style={{color:m.color,background:m.bg,borderColor:m.border}}>
      {key === 'theory' ? ' THEORY' : (type||'').toUpperCase()}
    </span>
  );
}
function ExamTypeBadge({ type }) {
  const m = EXAM_TYPE_META[(type||'general').toLowerCase()]||EXAM_TYPE_META.general;
  return <span className="exam-type-bdg" style={{color:m.color,background:m.bg,borderColor:m.border}}>{m.label}</span>;
}

// ── Toast system ───────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <Ic d={IC.check} size={15} color="#fff" sw={2.5}/>}
          {t.type === 'error'   && <Ic d={IC.warn}  size={15} color="#fff" sw={2}/>}
          {t.type === 'info'    && <Ic d={IC.info}   size={15} color="#fff" sw={2}/>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  function push(msg, type = 'success') {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }
  return { toasts, push };
}

function parseCodingMeta(explanation) {
  if (!explanation) return null;
  if (typeof explanation === 'object' && explanation.starterCode) return explanation;
  try { const p = JSON.parse(explanation); if (p && typeof p === 'object' && p.starterCode) return p; } catch {}
  return null;
}

// ── Theory Question Body ───────────────────────────────────────────────────────
function TheoryBody({ q }) {
  const markKey  = (q.markType || q.mark_type || `${q.marks||5}m`).toLowerCase();
  const markMeta = MARK_COLORS[markKey] || MARK_COLORS['5m'];
  const bloom    = (q.bloomLevel || q.bloom_level || '').toLowerCase();
  const bloomMeta= BLOOM_COLORS[bloom] || { color:C.inkSub, bg:C.subtle };
  const keyPoints= Array.isArray(q.keyPoints) ? q.keyPoints : Array.isArray(q.key_points) ? q.key_points : [];
  const keywords = q.keywords || '';
  const expected = q.expectedAnswer || q.expected_answer || '';
  const outline  = q.modelAnswerOutline || q.model_answer_outline || '';
  return (
    <div style={{ display:'grid', gap:12, paddingTop:12 }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:markMeta.bg, color:markMeta.color, border:`1px solid ${markMeta.border}` }}>
          {markMeta.label} Question
        </span>
        {bloom && (
          <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:bloomMeta.bg, color:bloomMeta.color, border:`1px solid ${bloomMeta.color}33` }}>
             {bloom.charAt(0).toUpperCase() + bloom.slice(1)}
          </span>
        )}
        {q.subject && q.subject !== q.topic && <span style={{ fontSize:11, color:C.inkSub }}>📚 {q.subject}</span>}
      </div>
      {keywords && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Keywords (Marking Terms)</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {keywords.split(',').map((kw, i) => (
              <span key={i} style={{ padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600, background:'#ede9fe', color:'#6d28d9', border:'1px solid #ddd6fe' }}>{kw.trim()}</span>
            ))}
          </div>
        </div>
      )}
      {keyPoints.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Key Points (Marking Rubric)</div>
          <div style={{ display:'grid', gap:4 }}>
            {keyPoints.map((kp, i) => (
              <div key={i} className="kp-row">
                <span style={{ fontSize:10, fontWeight:700, color:'#7c3aed', minWidth:18, marginTop:1 }}>{i+1}.</span>
                <span>{kp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {outline && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:C.inkSub, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Answer Outline (Faculty Reference)</div>
          <div style={{ padding:'8px 12px', background:'#fff', border:`1px solid ${C.purpleBd}`, borderRadius:7, fontSize:12, color:C.inkMid, lineHeight:1.6 }}>{outline}</div>
        </div>
      )}
      {expected && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:C.inkSub, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Model Answer</div>
          <div style={{ padding:'10px 12px', background:'#fff', border:`1px solid ${C.greenBd}`, borderRadius:7, fontSize:12, color:C.inkMid, lineHeight:1.7, borderLeft:`3px solid ${C.green}` }}>{expected}</div>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteQuestionModal({ questionIndex, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" style={{ zIndex:6000 }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-sm">
        {/* Red top banner */}
        <div style={{ background:`linear-gradient(135deg,${C.red},#b91c1c)`, padding:'28px 28px 20px', textAlign:'center' }}>
          <div style={{
            width:56, height:56, borderRadius:'50%',
            background:'rgba(255,255,255,.18)', border:'2px solid rgba(255,255,255,.35)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px',
          }}>
            <Ic d={IC.trash} size={26} color="#fff" sw={2}/>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:4 }}>Delete Question?</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.82)' }}>
            Question #{questionIndex + 1} will be permanently removed from this session.
          </div>
        </div>
        {/* Body */}
        <div style={{ padding:'20px 24px 24px' }}>
          <div style={{
            padding:'11px 14px', background:C.redBg, border:`1px solid ${C.redBd}`,
            borderRadius:8, fontSize:12, color:C.red, marginBottom:20,
            display:'flex', gap:8, alignItems:'flex-start',
          }}>
            <Ic d={IC.warn} size={14} color={C.red} sw={2}/>
            <span>This action <strong>cannot be undone.</strong> The question will be removed from the bank immediately.</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={onCancel}
              disabled={deleting}
              style={{
                flex:1, padding:'11px 0', borderRadius:9, border:`1.5px solid ${C.border}`,
                background:C.surface, color:C.inkMid, fontSize:13.5, fontWeight:700,
                fontFamily:C.font, cursor:'pointer', transition:'all .15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = C.hover}
              onMouseOut={e  => e.currentTarget.style.background = C.surface}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              style={{
                flex:1, padding:'11px 0', borderRadius:9, border:'none',
                background: deleting ? C.border : `linear-gradient(135deg,${C.red},#b91c1c)`,
                color: deleting ? C.inkMuted : '#fff',
                fontSize:13.5, fontWeight:700, fontFamily:C.font,
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition:'all .15s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                boxShadow: deleting ? 'none' : `0 4px 14px rgba(220,38,38,.3)`,
              }}
            >
              {deleting
                ? <><span className="spin-col" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }}/> Deleting…</>
                : <><Ic d={IC.trash} size={14} color="#fff" sw={2}/> Yes, Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Question Row (with delete modal instead of confirm()) ──────────────────────
function QuestionRow({ q, index, sessionCode, onDelete }) {
  const [open,       setOpen]    = useState(false);
  const [activeLang, setActiveLang] = useState('python');
  const [deleting,   setDeleting]  = useState(false);
  const [showDelModal, setShowDelModal] = useState(false);
  const type      = (q.type||'mcq').toLowerCase();
  const isTheory  = type === 'theory';
  const diff      = (q.difficulty||'medium').toLowerCase();
  const dColor    = diff==='easy'?C.green:diff==='hard'?C.red:C.amber;
  const dBg       = diff==='easy'?C.greenBg:diff==='hard'?C.redBg:C.amberBg;
  const codingMeta= type==='coding'?parseCodingMeta(q.explanation):null;
  const markKey   = isTheory ? (q.markType || q.mark_type || `${q.marks||5}m`).toLowerCase() : null;
  const markMeta  = markKey ? (MARK_COLORS[markKey] || MARK_COLORS['5m']) : null;

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/question-bank/sessions/${sessionCode}/${q.id}`, { method:'DELETE', headers:authHeader() });
      if (res.ok) { onDelete(q.id); setShowDelModal(false); }
      else { const b = await res.json().catch(()=>({})); alert(b.error||'Delete failed'); setDeleting(false); }
    } catch(err) { alert('Network error: '+err.message); setDeleting(false); }
  }

  return (
    <>
      {showDelModal && (
        <DeleteQuestionModal
          questionIndex={index}
          deleting={deleting}
          onCancel={() => !deleting && setShowDelModal(false)}
          onConfirm={confirmDelete}
        />
      )}
      <div className="q-row" style={{ opacity: deleting ? .4 : 1, transition:'opacity .2s', borderColor: isTheory ? C.purpleBd : C.border }}>
        <div className="q-row-hdr" onClick={() => setOpen(o => !o)}>
          <span className="mono" style={{ color:C.inkMuted, minWidth:26, marginTop:2, fontSize:10.5 }}>#{index+1}</span>
          <TypeChip type={q.type}/>
          {isTheory && markMeta && (
            <span style={{ padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:700, background:markMeta.bg, color:markMeta.color, border:`1px solid ${markMeta.border}`, flexShrink:0 }}>
              {markMeta.label}
            </span>
          )}
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, color:C.ink, margin:0, fontWeight:500, lineHeight:1.5 }}>{q.question||'—'}</p>
            <span style={{ fontSize:10.5, color:C.inkMuted, marginTop:2, display:'block' }}>
              {q.topic}{isTheory && q.subject && q.subject !== q.topic ? ` · ${q.subject}` : ''}
            </span>
          </div>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:dBg, color:dColor, flexShrink:0 }}>{q.difficulty}</span>
          <button
            onClick={e => { e.stopPropagation(); setShowDelModal(true); }}
            disabled={deleting}
            className="btn-sm btn-sm-rd"
            style={{ padding:'3px 10px', flexShrink:0, display:'flex', alignItems:'center', gap:4 }}
          >
            <Ic d={IC.trash} size={11} color={C.red}/>
            Delete
          </button>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ transform:open?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0, marginTop:3 }}>
            <path d="M2.5 4.5L6.5 8.5L10.5 4.5" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {open && (
          <div className={isTheory ? 'q-row-body-theory' : 'q-row-body'} style={{ paddingTop:0 }}>
            {isTheory && <TheoryBody q={q} />}
            {!isTheory && (type==='mcq'||type==='aptitude'||type==='verbal'||type==='sql') && (
              <div style={{ display:'grid', gap:5, paddingTop:10 }}>
                {(q.options||[]).map((opt, i) => {
                  const letter = ['A','B','C','D'][i];
                  const isAns  = (q.answer||'').toUpperCase().startsWith(letter);
                  return (
                    <div key={i} className="opt-row" style={{ background:isAns?C.greenBg:C.surface, borderColor:isAns?C.greenBd:C.border, color:isAns?C.green:C.ink }}>
                      {isAns ? <Ic d={IC.check} size={13} color={C.green} sw={2.5}/> : <span style={{ fontSize:10, fontWeight:700, color:C.inkMuted, minWidth:14 }}>{letter})</span>}
                      {type==='sql' ? <code style={{ fontFamily:C.mono, fontSize:12 }}>{opt}</code> : opt}
                    </div>
                  );
                })}
                {q.explanation && typeof q.explanation === 'string' && (
                  <div style={{ marginTop:6, padding:'7px 10px', fontSize:11.5, background:C.blueLt, borderRadius:6, color:C.inkMid }}>
                    <strong style={{ color:C.blue }}>Explanation: </strong>{q.explanation}
                  </div>
                )}
              </div>
            )}
            {!isTheory && type==='coding' && (
              <div style={{ display:'grid', gap:10, paddingTop:10 }}>
                {codingMeta?.description && <p style={{ fontSize:12.5, color:C.inkMid, margin:0, lineHeight:1.6 }}>{codingMeta.description}</p>}
                {codingMeta?.starterCode && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.inkMuted, marginBottom:5 }}>STARTER CODE</div>
                    <div style={{ display:'flex', gap:3, marginBottom:0 }}>
                      {Object.keys(codingMeta.starterCode).map(lang => (
                        <button key={lang} onClick={e => { e.stopPropagation(); setActiveLang(lang); }}
                          style={{ padding:'4px 11px', fontSize:11, fontWeight:activeLang===lang?700:400, borderRadius:'6px 6px 0 0', border:`1px solid ${C.border}`, borderBottom:activeLang===lang?`1px solid ${C.blueLt}`:`1px solid ${C.border}`, background:activeLang===lang?C.blueLt:C.surface, color:activeLang===lang?C.blue:C.inkMuted, cursor:'pointer', fontFamily:C.font }}>
                          {LANG_LABELS[lang]||lang}
                        </button>
                      ))}
                    </div>
                    <pre style={{ margin:0, fontFamily:C.mono, fontSize:12, background:'#1e293b', color:'#e2e8f0', borderRadius:'0 6px 6px 6px', padding:'12px 14px', overflowX:'auto', lineHeight:1.6, maxHeight:200, overflowY:'auto' }}>
                      {codingMeta.starterCode[activeLang]||'// No starter code for this language'}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── PDF Download Button ────────────────────────────────────────────────────────
function PDFDownloadButton({ onClick, disabled }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success

  async function handleClick() {
    if (disabled || status !== 'idle') return;
    setStatus('loading');
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('idle');
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading' || disabled}
      className={`btn-pdf btn-pdf-${status}`}
    >
      {status === 'idle' && <><Ic d={IC.download} size={13} color={C.inkMid}/> Download PDF</>}
      {status === 'loading' && (
        <>
          <span className="spin-col"/>
          <span style={{ color:C.amber }}>Generating PDF…</span>
        </>
      )}
      {status === 'success' && (
        <>
          <Ic d={IC.check} size={13} color={C.green} sw={2.5}/>
          <span style={{ color:C.green }}>Downloaded!</span>
        </>
      )}
    </button>
  );
}

// ── Add Question Modal ─────────────────────────────────────────────────────────
const Q_TYPES = [
  { key:'mcq',     label:'MCQ',     icon:IC.info,  iconD: IC.check,  color:C.blue,   emoji:'📝' },
  { key:'sql',     label:'SQL',     icon:IC.db,    iconD: IC.db,     color:C.purple, emoji:'🗄️' },
  { key:'coding',  label:'Coding',  icon:IC.code,  iconD: IC.code,   color:C.amber,  emoji:'💻' },
  { key:'theory',  label:'Theory',  icon:IC.book,  iconD: IC.book,   color:'#7c3aed',emoji:'📖' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CODING_LANGS_ADD = ['Python', 'Java', 'JavaScript', 'C', 'C++', 'TypeScript', 'Go', 'Kotlin'];

function AddQuestionModal({ sessionCode, onClose, onAdded }) {
  const [qType,    setQType]   = useState('mcq');
  const [saving,   setSaving]  = useState(false);
  const [errors,   setErrors]  = useState({});

  // MCQ / SQL / Aptitude / Verbal shared fields
  const [question,    setQuestion]   = useState('');
  const [options,     setOptions]    = useState(['','','','']);
  const [correctAns,  setCorrectAns] = useState(0); // index 0-3
  const [explanation, setExplanation]= useState('');
  const [difficulty,  setDifficulty] = useState('medium');
  const [topic,       setTopic]      = useState('');

  // SQL extra
  const [schema,     setSchema]     = useState('');
  const [expQuery,   setExpQuery]   = useState('');
  const [expOutput,  setExpOutput]  = useState('');

  // Coding
  const [codingLang,   setCodingLang]   = useState('Python');
  const [starterCode,  setStarterCode]  = useState('');
  const [constraints,  setConstraints]  = useState('');
  const [inputFormat,  setInputFormat]  = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [testCases,    setTestCases]    = useState('');
  const [description,  setDescription] = useState('');

  // Theory
  const [keywords,    setKeywords]    = useState('');
  const [keyPoints,   setKeyPoints]   = useState('');
  const [markType,    setMarkType]    = useState('5m');
  const [bloomLevel,  setBloomLevel]  = useState('understand');
  const [modelAnswer, setModelAnswer] = useState('');

  function validate() {
    const e = {};
    if (!question.trim()) e.question = 'Question is required';
    if (!topic.trim())    e.topic    = 'Topic is required';
    if (qType === 'mcq' || qType === 'sql') {
      if (options.some(o => !o.trim())) e.options = 'All 4 options are required';
    }
    if (qType === 'coding' && !description.trim()) e.description = 'Problem description required';
    if (qType === 'theory' && !keyPoints.trim())   e.keyPoints   = 'Key points are required';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setSaving(true);

    try {
      const optArr = options.map((o, i) => `${['A','B','C','D'][i]}) ${o}`);
      const answer = optArr[correctAns] || '';

      let payload = {
        type:       qType,
        question:   question.trim(),
        topic:      topic.trim(),
        difficulty: difficulty,
      };

      if (qType === 'mcq' || qType === 'aptitude' || qType === 'verbal') {
        payload = { ...payload, options: optArr, answer, explanation };
      }
      if (qType === 'sql') {
        payload = { ...payload, options: optArr, answer, explanation, schema_details: schema, expected_query: expQuery, expected_output: expOutput };
      }
      if (qType === 'coding') {
        payload = {
          ...payload,
          description,
          constraints,
          input_format:  inputFormat,
          output_format: outputFormat,
          test_cases:    testCases,
          explanation:   JSON.stringify({
            starterCode:  { [codingLang.toLowerCase()]: starterCode },
            description,
            sample_input:  inputFormat,
            sample_output: outputFormat,
          }),
        };
      }
      if (qType === 'theory') {
        const kpArr = keyPoints.split('\n').map(k => k.trim()).filter(Boolean);
        payload = {
          ...payload,
          keywords,
          key_points:    kpArr,
          mark_type:     markType,
          marks:         markType === '2m' ? 2 : markType === '5m' ? 5 : 8,
          bloom_level:   bloomLevel,
          expected_answer: modelAnswer,
          options: [],
          answer: null,
        };
      }

      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const res = await fetch(`${API}/question-bank/sessions/${sessionCode}/add`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add question');
      onAdded(data.question || { ...payload, id: data.id || `manual_${Date.now()}` });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  }

  const th = QB_COLORS[qType] || QB_COLORS.mcq;

  return (
    <div className="modal-overlay" style={{ zIndex:6000, alignItems:'flex-start', paddingTop:32 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-xl">
        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.border}`, background:C.subtle, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy, marginBottom:2 }}>Add Question Manually</div>
            <div style={{ fontSize:12, color:C.inkSub }}>Session: <span style={{ fontFamily:'monospace', color:C.blue, fontWeight:700 }}>{sessionCode}</span></div>
          </div>
          <button onClick={onClose} style={{ padding:'6px', borderRadius:7, border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer', display:'flex' }}>
            <Ic d={IC.x} size={16} color={C.inkSub}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>

          {/* Question type selector */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.inkMid, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Question Type</div>
            <div style={{ display:'flex', gap:8 }}>
              {Q_TYPES.map(qt => (
                <button
                  key={qt.key}
                  className={`qtype-tab${qType === qt.key ? ' active' : ''}`}
                  onClick={() => setQType(qt.key)}
                  style={qType === qt.key ? { borderColor: th.border, background: th.bg, color: th.color } : {}}
                >
                 
                  <span>{qt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Common fields */}
          <div style={{ display:'grid', gap:14 }}>

            {/* Question text */}
            <div className="fld">
              <label className="fld-lbl">Question <span style={{ color:C.red }}>*</span></label>
              <textarea
                rows={3}
                className="fld-ta"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder={qType === 'coding' ? 'e.g. Given an array of integers, find the two numbers that add up to a target sum.' : 'Enter your question here…'}
              />
              {errors.question && <span style={{ fontSize:11, color:C.red }}>{errors.question}</span>}
            </div>

            {/* Topic + Difficulty row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="fld">
                <label className="fld-lbl">Topic <span style={{ color:C.red }}>*</span></label>
                <input className="fld-inp" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Arrays, SQL Joins, OOP…"/>
                {errors.topic && <span style={{ fontSize:11, color:C.red }}>{errors.topic}</span>}
              </div>
              <div className="fld">
                <label className="fld-lbl">Difficulty</label>
                <div style={{ display:'flex', gap:6, marginTop:2 }}>
                  {DIFFICULTIES.map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      style={{
                        flex:1, padding:'8px 0', borderRadius:7, border:`1.5px solid`,
                        fontSize:12, fontWeight:difficulty===d?700:400, cursor:'pointer', textTransform:'capitalize',
                        borderColor: difficulty===d ? (d==='easy'?C.greenBd:d==='hard'?C.redBd:C.amberBd) : C.border,
                        background:  difficulty===d ? (d==='easy'?C.greenBg:d==='hard'?C.redBg:C.amberBg) : C.surface,
                        color:       difficulty===d ? (d==='easy'?C.green:d==='hard'?C.red:C.amber) : C.inkMid,
                        fontFamily:  C.font,
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── MCQ / SQL / Aptitude / Verbal: Options ── */}
            {(qType === 'mcq' || qType === 'sql') && (
              <>
                <div className="fld">
                  <label className="fld-lbl">Options <span style={{ color:C.red }}>*</span> — click the letter to mark correct answer</label>
                  {options.map((opt, i) => (
                    <div key={i} className="opt-inp-row">
                      <button
                        onClick={() => setCorrectAns(i)}
                        className={`opt-letter${correctAns === i ? ' correct' : ''}`}
                        title="Mark as correct"
                      >
                        {['A','B','C','D'][i]}
                      </button>
                      <input
                        className="fld-inp"
                        value={opt}
                        onChange={e => { const n=[...options]; n[i]=e.target.value; setOptions(n); }}
                        placeholder={`Option ${['A','B','C','D'][i]}`}
                      />
                    </div>
                  ))}
                  {errors.options && <span style={{ fontSize:11, color:C.red }}>{errors.options}</span>}
                  <div style={{ fontSize:11, color:C.inkMuted, marginTop:2 }}>
                     Correct: <strong style={{ color:C.green }}>Option {['A','B','C','D'][correctAns]}</strong>
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Explanation <span style={{ color:C.inkMuted, fontWeight:400 }}>(optional)</span></label>
                  <textarea rows={2} className="fld-ta" value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Briefly explain why the correct answer is right…"/>
                </div>
              </>
            )}

            {/* ── SQL extra fields ── */}
            {qType === 'sql' && (
              <>
                <div className="fld">
                  <label className="fld-lbl">Schema Details <span style={{ color:C.inkMuted, fontWeight:400 }}>(optional)</span></label>
                  <textarea rows={3} className="fld-mono" value={schema} onChange={e => setSchema(e.target.value)} placeholder="CREATE TABLE employees (id INT, name VARCHAR(50), salary DECIMAL(10,2))…"/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="fld">
                    <label className="fld-lbl">Expected Query</label>
                    <textarea rows={3} className="fld-mono" value={expQuery} onChange={e => setExpQuery(e.target.value)} placeholder="SELECT name FROM employees WHERE salary > 50000"/>
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Expected Output</label>
                    <textarea rows={3} className="fld-ta" value={expOutput} onChange={e => setExpOutput(e.target.value)} placeholder="name&#10;Alice&#10;Bob"/>
                  </div>
                </div>
              </>
            )}

            {/* ── Coding fields ── */}
            {qType === 'coding' && (
              <>
                <div className="fld">
                  <label className="fld-lbl">Problem Description <span style={{ color:C.red }}>*</span></label>
                  <textarea rows={3} className="fld-ta" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the problem, input/output expectations…"/>
                  {errors.description && <span style={{ fontSize:11, color:C.red }}>{errors.description}</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="fld">
                    <label className="fld-lbl">Constraints</label>
                    <input className="fld-inp" value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="1 ≤ n ≤ 10⁵, 0 ≤ nums[i] ≤ 10⁴"/>
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Programming Language</label>
                    <select className="fld-inp" value={codingLang} onChange={e => setCodingLang(e.target.value)}>
                      {CODING_LANGS_ADD.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Starter Code</label>
                  <textarea rows={5} className="fld-mono" value={starterCode} onChange={e => setStarterCode(e.target.value)} placeholder={`def solution(nums, target):\n    # Write your solution here\n    pass`}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="fld">
                    <label className="fld-lbl">Input Format</label>
                    <textarea rows={2} className="fld-ta" value={inputFormat} onChange={e => setInputFormat(e.target.value)} placeholder="nums = [2,7,11,15], target = 9"/>
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Output Format</label>
                    <textarea rows={2} className="fld-ta" value={outputFormat} onChange={e => setOutputFormat(e.target.value)} placeholder="[0, 1]"/>
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Test Cases <span style={{ color:C.inkMuted, fontWeight:400 }}>(one per line: input → output)</span></label>
                  <textarea rows={3} className="fld-ta" value={testCases} onChange={e => setTestCases(e.target.value)} placeholder="[2,7,11,15], 9 → [0,1]&#10;[3,2,4], 6 → [1,2]"/>
                </div>
              </>
            )}

            {/* ── Theory fields ── */}
            {qType === 'theory' && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="fld">
                    <label className="fld-lbl">Mark Type</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { v:'2m', label:'2 Mark', color:'#059669', bg:'#ecfdf5', bd:'#a7f3d0' },
                        { v:'5m', label:'5 Mark', color:'#2563eb', bg:'#eff6ff', bd:'#bfdbfe' },
                        { v:'8m', label:'8 Mark', color:'#7c3aed', bg:'#f5f3ff', bd:'#ddd6fe' },
                      ].map(m => (
                        <button key={m.v} onClick={() => setMarkType(m.v)}
                          style={{
                            flex:1, padding:'8px 0', borderRadius:7, border:`1.5px solid`,
                            fontSize:12, fontWeight:markType===m.v?700:400, cursor:'pointer',
                            borderColor: markType===m.v ? m.bd : C.border,
                            background:  markType===m.v ? m.bg : C.surface,
                            color:       markType===m.v ? m.color : C.inkMid,
                            fontFamily:  C.font,
                          }}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Bloom's Level</label>
                    <select className="fld-inp" value={bloomLevel} onChange={e => setBloomLevel(e.target.value)}>
                      {['remember','understand','apply','analyse','evaluate','create'].map(b => (
                        <option key={b} value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Keywords / Marking Terms <span style={{ color:C.inkMuted, fontWeight:400 }}>(comma-separated)</span></label>
                  <input className="fld-inp" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. process scheduling, deadlock, semaphore, mutex"/>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Key Points / Expected Concepts <span style={{ color:C.red }}>*</span> <span style={{ color:C.inkMuted, fontWeight:400 }}>(one per line)</span></label>
                  <textarea rows={5} className="fld-ta" value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder={"Definition of deadlock\nFour necessary conditions: Mutual exclusion, Hold and wait, No preemption, Circular wait\nPrevention vs Avoidance strategies\nBanker's algorithm explanation"}/>
                  {errors.keyPoints && <span style={{ fontSize:11, color:C.red }}>{errors.keyPoints}</span>}
                </div>
                <div className="fld">
                  <label className="fld-lbl">Model Answer / Evaluation Criteria <span style={{ color:C.inkMuted, fontWeight:400 }}>(optional)</span></label>
                  <textarea rows={4} className="fld-ta" value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="Detailed model answer that AI uses as reference for scoring student responses…"/>
                </div>
              </>
            )}

            {/* Submit error */}
            {errors.submit && (
              <div style={{ padding:'10px 14px', background:C.redBg, border:`1px solid ${C.redBd}`, borderRadius:8, fontSize:12.5, color:C.red, display:'flex', gap:8 }}>
                <Ic d={IC.warn} size={14} color={C.red}/>
                {errors.submit}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, background:C.subtle, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'10px 22px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.surface, color:C.inkMid, fontSize:13, fontWeight:600, fontFamily:C.font, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding:'10px 28px', borderRadius:9, border:'none',
              background: saving ? C.border : `linear-gradient(135deg,${th.color},${th.color}cc)`,
              color: saving ? C.inkMuted : '#fff',
              fontSize:13, fontWeight:700, fontFamily:C.font,
              cursor: saving ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:7,
              boxShadow: saving ? 'none' : `0 4px 14px ${th.color}44`,
              transition:'all .15s',
            }}>
            {saving
              ? <><span className="spin-col" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.3)' }}/> Saving…</>
              : <><Ic d={IC.plus} size={14} color="#fff"/> Add to Question Bank</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────────────
function PreviewModal({ session, onClose, pushToast }) {
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [tab,      setTab]     = useState(null);
  const [search,   setSearch]  = useState('');
  const [grouped,  setGrouped] = useState({});
  const [showAddQ, setShowAddQ]= useState(false);

  useEffect(() => {
    fetch(`${API}/question-bank/sessions/${session.sessionCode}`, { headers:authHeader() })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setGrouped(d.grouped||{});
        setTab(Object.keys(d.grouped||{})[0]||null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session.sessionCode]);

  function handleDeleteQuestion(qbId) {
    setGrouped(prev => {
      const next = {};
      for (const [type, arr] of Object.entries(prev)) {
        const f = arr.filter(q => q.id !== qbId);
        if (f.length > 0) next[type] = f;
      }
      if (tab && (!next[tab] || next[tab].length === 0)) setTab(Object.keys(next)[0]||null);
      return next;
    });
    pushToast('Question removed from bank', 'success');
  }

  function handleQuestionAdded(newQ) {
    const type = (newQ.type || 'mcq').toLowerCase();
    setGrouped(prev => {
      const updated = { ...prev };
      if (updated[type]) {
        updated[type] = [...updated[type], newQ];
      } else {
        updated[type] = [newQ];
      }
      return updated;
    });
    setTab(type);
    pushToast(`${type.toUpperCase()} question added successfully`, 'success');
  }

  const totalLive = Object.values(grouped).reduce((s, a) => s + a.length, 0);
  const currentQs = tab && grouped[tab] ? grouped[tab] : [];
  const filtered  = search
    ? currentQs.filter(q =>
        q.question?.toLowerCase().includes(search.toLowerCase()) ||
        q.topic?.toLowerCase().includes(search.toLowerCase()) ||
        q.keywords?.toLowerCase().includes(search.toLowerCase())
      )
    : currentQs;

  const theoryQs = grouped['theory'] || [];
  const theory2m = theoryQs.filter(q => (q.markType||q.mark_type||'').includes('2')).length;
  const theory5m = theoryQs.filter(q => (q.markType||q.mark_type||'').includes('5')).length;
  const theory8m = theoryQs.filter(q => (q.markType||q.mark_type||'').includes('8')).length;

  async function handleDownloadPDF() {
    await downloadSessionPDF(session, grouped);
  }

  return (
    <>
      {showAddQ && (
        <AddQuestionModal
          sessionCode={session.sessionCode}
          onClose={() => setShowAddQ(false)}
          onAdded={handleQuestionAdded}
        />
      )}
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-lg">
          {/* Header */}
          <div className="modal-hdr">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <h2 style={{ fontSize:17, fontWeight:800, color:C.navy, margin:0 }}>{session.examName}</h2>
                <ExamTypeBadge type={session.examType}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span className="mono" style={{ color:C.inkMuted, background:C.blueLt, padding:'2px 8px', borderRadius:4, fontWeight:600 }}>{session.sessionCode}</span>
                <span style={{ fontSize:11, color:C.inkMuted }}>{totalLive} questions</span>
                {theoryQs.length > 0 && (
                  <span style={{ fontSize:11, color:C.purple, fontWeight:600 }}>
                    Theory: {theory2m>0?`${theory2m}×2m`:''}{theory5m>0?` ${theory5m}×5m`:''}{theory8m>0?` ${theory8m}×8m`:''}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Add Question button */}
              <button className="btn-add-q" onClick={() => setShowAddQ(true)}>
                <Ic d={IC.plus} size={13} color="#fff" sw={2.5}/>
                Add Question
              </button>
              {/* Enhanced PDF button */}
              <PDFDownloadButton onClick={handleDownloadPDF} disabled={loading}/>
              <button
                onClick={onClose}
                style={{ padding:'6px 8px', borderRadius:7, border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer', display:'flex' }}
              >
                <Ic d={IC.x} size={15} color={C.inkSub}/>
              </button>
            </div>
          </div>

          {loading && <div className="loading"><div className="spinner" style={{ marginBottom:12 }}/>Loading questions…</div>}

          {!loading && data && (
            <>
              <div style={{ padding:'11px 24px', background:C.subtle, borderBottom:`1px solid ${C.border}`, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
                {Object.entries(grouped).map(([type, arr]) => (
                  <div key={type} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <TypeChip type={type}/>
                    <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>{arr.length} Qs</span>
                  </div>
                ))}
                <div style={{ marginLeft:'auto' }}>
                  <div className="search-wrap" style={{ width:220, flex:'none', minWidth:'unset' }}>
                    <Ic d={IC.search} size={13} color={C.inkMuted}/>
                    <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions, keywords…"/>
                  </div>
                </div>
              </div>
              <div className="tab-bar">
                {Object.keys(grouped).map(type => (
                  <button key={type} className={`tab-btn${tab===type?' active':''}`}
                    onClick={() => { setTab(type); setSearch(''); }}
                    style={tab===type && type==='theory' ? { borderBottomColor:C.purple, color:C.purple } : {}}>
                    {type==='theory' ? '📝 THEORY' : type.toUpperCase()} ({(grouped[type]||[]).length})
                  </button>
                ))}
              </div>
              <div style={{ flex:1, overflow:'auto', padding:'14px 24px' }}>
                {filtered.length === 0 && (
                  <div className="empty">
                    {search ? 'No questions match your search.' : 'No questions found.'}
                  </div>
                )}
                {filtered.map((q, i) => (
                  <QuestionRow
                    key={q.id||i}
                    q={q}
                    index={i}
                    sessionCode={session.sessionCode}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

async function downloadSessionPDF(session, grouped) {
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
  const margin = 50, maxW = pw - margin * 2, lh = 16;
  let y = margin;
  function checkPage(need=lh) { if(y+need>ph-margin){doc.addPage();y=margin;} }
  function writeLine(text, {fontSize=11,style='normal',color=[30,30,30],indent=0,lineH=lh}={}) {
    doc.setFont('helvetica',style);doc.setFontSize(fontSize);doc.setTextColor(...color);
    const wrapped=doc.splitTextToSize(String(text),maxW-indent);
    for(const wl of wrapped){checkPage(lineH);doc.text(wl,margin+indent,y);y+=lineH;}
  }
  function writeDivider(){checkPage(8);doc.setDrawColor(191,219,254);doc.setLineWidth(.5);doc.line(margin,y,margin+maxW,y);y+=10;}
  writeLine(session.examName||'Question Bank',{fontSize:17,style:'bold',color:[15,31,61]});
  const totalQs=Object.values(grouped).reduce((s,a)=>s+a.length,0);
  writeLine(`Session: ${session.sessionCode}  ·  ${totalQs} questions  ·  ${session.createdAt?new Date(session.createdAt).toLocaleDateString('en-GB'):''}`,{fontSize:10,color:[100,116,139],lineH:14});
  y+=6;writeDivider();
  let qNum=0;
  for(const[type,questions] of Object.entries(grouped)){
    writeLine(type.toUpperCase(),{fontSize:13,style:'bold',color:[37,99,235]});y+=4;
    for(const q of questions){
      qNum++;
      writeLine(`${qNum}. ${q.question}`,{style:'bold'});
      if(type==='theory'){
        if(q.marks){writeLine(`[${q.marks}-Mark | ${q.bloomLevel||q.bloom_level||''}]`,{fontSize:9,style:'italic',color:[124,58,237],lineH:13});}
        const kps=Array.isArray(q.keyPoints)?q.keyPoints:Array.isArray(q.key_points)?q.key_points:[];
        if(kps.length>0){y+=3;kps.forEach((kp,i)=>writeLine(`  ${i+1}. ${kp}`,{fontSize:10,color:[80,50,150],lineH:14}));}
        if(q.keywords){writeLine(`Keywords: ${q.keywords}`,{fontSize:9,style:'italic',color:[100,80,180],lineH:13});}
      } else if(type!=='coding'){
        const opts=[q.options?.[0],q.options?.[1],q.options?.[2],q.options?.[3]].map((t,i)=>({key:['A','B','C','D'][i],text:t})).filter(o=>o.text);
        y+=3;
        opts.forEach(o=>writeLine(`  ${o.key})  ${o.text}`,{fontSize:10,color:[40,40,40],lineH:14}));
        if(q.answer){y+=3;writeLine(`Answer: ${q.answer.charAt(0).toUpperCase()}`,{fontSize:10,style:'bold',color:[5,150,105],lineH:13});}
      }
      writeLine(`Difficulty: ${q.difficulty||'medium'}  ·  Topic: ${q.topic||''}`,{fontSize:9,style:'italic',color:[148,163,184],lineH:13});
      y+=4;writeDivider();
    }
  }
  doc.save(`${(session.examName||'QB').replace(/\s+/g,'_')}_${session.sessionCode}.pdf`);
}

// ── Session Delete Confirm ─────────────────────────────────────────────────────
function DeleteSessionConfirm({ session, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-sm">
        <div style={{ background:`linear-gradient(135deg,${C.red},#b91c1c)`, padding:'28px 28px 20px', textAlign:'center' }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:'rgba(255,255,255,.18)',border:'2px solid rgba(255,255,255,.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
            <Ic d={IC.trash} size={26} color="#fff" sw={2}/>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:4 }}>Delete Question Bank?</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.82)' }}>This action cannot be undone.</div>
        </div>
        <div style={{ padding:'20px 24px 24px' }}>
          <p style={{ fontSize:13, color:C.inkMid, marginBottom:6, lineHeight:1.5 }}><strong>{session.examName}</strong></p>
          <p style={{ fontSize:12, color:C.inkMuted, marginBottom:20 }}>
            This will delete <strong>{session.totalQuestions} questions</strong> with session{' '}
            <span className="mono" style={{ background:C.blueLt, padding:'1px 6px', borderRadius:4 }}>{session.sessionCode}</span>.
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:'11px 0', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.surface, color:C.inkMid, fontSize:13, fontWeight:700, fontFamily:C.font, cursor:'pointer' }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:'11px 0', borderRadius:9, border:'none', background:`linear-gradient(135deg,${C.red},#b91c1c)`, color:'#fff', fontSize:13, fontWeight:700, fontFamily:C.font, cursor:'pointer', boxShadow:`0 4px 14px rgba(220,38,38,.3)`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Ic d={IC.trash} size={13} color="#fff" sw={2}/> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NeuroGenerate View ─────────────────────────────────────────────────────────
function NeuroGenerateView({ onImported, onBack, approvedRequests }) {
  const [step,      setStep]   = useState('configure');
  const [config,    setConfig] = useState(null);
  const [importing, setImport] = useState(false);
  const { state, progress, questions, stats, error, generate, reset } = useGeneration();

  async function handleStart(params) { setConfig(params); setStep('generate'); await generate(params); }

  async function handleFinalize(selectedQuestions) {
    if (!config?.examName) { alert('Exam name is missing.'); return; }
    setImport(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const res = await fetch(`${API}/question-bank/import`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify({ questions:selectedQuestions, examName:config.examName, examType:config.examType||'placement', sessionCode:config.sessionCode||null, examRequestId:config.examRequestId||null, difficulty:config.difficulty||'mixed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Import failed');
      onImported(data);
      setTimeout(() => onBack(), 300);
    } catch (err) { alert(`Save failed: ${err.message}`); }
    finally { setImport(false); }
  }

  function handleStartOver() { reset(); setStep('configure'); setConfig(null); }
  const selectedAgents = config ? Object.keys(config.agentTopics||{}).filter(k=>!k.endsWith('_counts')) : [];

  const Ic2 = Ic;
  return (
    <div>
      <div className="sub-hdr">
        <button className="btn-ghost" onClick={onBack}><Ic2 d={IC.back} size={13} color={C.inkSub}/> Question Bank</button>
        <div style={{ fontSize:12, color:C.inkMuted, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:C.blue, fontWeight:600 }}>Question Bank</span>
          <span>›</span>
          <span style={{ fontWeight:700, color:C.navy }}>NeuroGenerate AI</span>
        </div>
        <div style={{ flex:1, display:'flex', justifyContent:'center' }}><StepIndicator currentStep={step}/></div>
        <div className="neuro-badge"><Ic2 d={IC.star} size={12} color="#fff" sw={2}/> NeuroGenerate AI</div>
      </div>
      {step==='configure' && <ConfigurePanel onStart={handleStart} approvedRequests={approvedRequests}/>}
      {step==='generate' && (
        <div>
          <GeneratingPanel progress={progress} state={state} selectedAgents={selectedAgents}/>
          {state==='done' && (
            <div style={{ maxWidth:520,margin:'24px auto',background:C.surface,border:`1px solid ${C.blueBd}`,borderRadius:14,padding:'28px 32px',textAlign:'center',boxShadow:'0 4px 20px rgba(37,99,235,.08)' }}>
              <div style={{ width:52,height:52,borderRadius:'50%',background:C.blueLt,border:`1px solid ${C.blueBd}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
                <Ic d={IC.check} size={22} color={C.blue} sw={2.5}/>
              </div>
              <h3 style={{ fontSize:20,fontWeight:700,color:C.navy,marginBottom:4 }}>{questions.length} Questions Generated</h3>
              {config?.examName && <div style={{ fontSize:12,color:C.blue,fontWeight:600,marginBottom:10 }}>{config.examName}</div>}
              {stats && (
                <div style={{ display:'flex',gap:7,justifyContent:'center',flexWrap:'wrap',marginBottom:18 }}>
                  {Object.entries(stats.byAgent||{}).map(([k,c]) => c>0 ? (
                    <span key={k} className="bdg" style={{ background:C.blueLt,color:C.blue,borderColor:C.blueBd }}>{k.toUpperCase()}: {c}</span>
                  ) : null)}
                </div>
              )}
              <button className="btn-pri" onClick={() => setStep('review')} style={{ padding:'11px 32px' }}>
                Review and Save to Question Bank <Ic d={IC.arrow} size={13} color="#fff"/>
              </button>
            </div>
          )}
          {state==='error' && (
            <div style={{ maxWidth:420,margin:'24px auto',background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:10,padding:24,textAlign:'center' }}>
              <div style={{ fontSize:13,color:C.red,fontWeight:600,marginBottom:8 }}>Generation Failed</div>
              <div style={{ fontSize:12,color:C.inkMid,marginBottom:14 }}>{error}</div>
              <button className="btn-sec" onClick={handleStartOver}>Try Again</button>
            </div>
          )}
        </div>
      )}
      {step==='review' && (
        <ReviewPanel questions={questions} stats={stats} importing={importing} onFinalize={handleFinalize} onRegenerate={handleStartOver}/>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QuestionBank() {
  const navigate = useNavigate();
  const { toasts, push: pushToast } = useToasts();
  const [view,       setView]      = useState('list');
  const [sessions,   setSessions]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [filterType, setFilterType]= useState('All');
  const [previewing, setPreviewing]= useState(null);
  const [deleting,   setDeleting]  = useState(null);
  const [approved,   setApproved]  = useState([]);
  const [stats,      setStats]     = useState({ total:0, breakdown:[] });

  const fetchSessions = useCallback(() => {
    setLoading(true);
    fetch(`${API}/question-bank/sessions`, { headers:authHeader() })
      .then(r => r.json()).then(d => setSessions(d.sessions||[])).catch(() => setSessions([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => {
    fetch(`${API}/question-bank/stats`, { headers:authHeader() }).then(r => r.ok?r.json():null).then(d => d&&setStats(d)).catch(()=>{});
    fetch(`${API}/question-bank/exam-names`, { headers:authHeader() }).then(r => r.ok?r.json():null).then(d => d&&setApproved(d.approvedRequests||[])).catch(()=>{});
  }, [view]);

  async function handleDeleteSession(s) {
    try {
      const res = await fetch(`${API}/question-bank/sessions/${s.sessionCode}`, { method:'DELETE', headers:authHeader() });
      if (!res.ok) throw new Error();
      setSessions(prev => prev.filter(x => x.sessionCode !== s.sessionCode));
      pushToast(`Deleted: ${s.examName}`, 'success');
    } catch { pushToast('Delete failed', 'error'); }
    finally { setDeleting(null); }
  }

  const EXAM_TYPES = ['All','Placement','Hiring','Certification','University'];
  const filtered = sessions.filter(s => {
    const matchSearch = s.examName?.toLowerCase().includes(search.toLowerCase())||s.sessionCode?.toLowerCase().includes(search.toLowerCase())||s.topicsSummary?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterType==='All') return true;
    const t = (s.examType||'placement').toLowerCase();
    if (filterType==='Placement')     return t==='placement'||t==='general';
    if (filterType==='Hiring')        return t==='hiring'||t==='placement'||t==='general';
    if (filterType==='Certification') return t==='skill_cert'||t==='skill_certification'||t==='certification';
    if (filterType==='University')    return t==='university'||t==='academic';
    return true;
  });

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar/><Navbar/>
      <ToastContainer toasts={toasts}/>

      <main className="ap-main">
        {view==='neurogenerate' && (
          <NeuroGenerateView
            onImported={d => { fetchSessions(); pushToast(`${d.count} questions saved — ${d.examName||''}`, 'success'); }}
            onBack={() => setView('list')}
            approvedRequests={approved}
          />
        )}

        {view==='list' && (
          <div>
            <div className="ap-hdr">
              <div>
                <h1 className="ap-title">Question Bank</h1>
                <p className="ap-sub">{sessions.length} bank entr{sessions.length!==1?'ies':'y'} · {stats.total} total questions</p>
              </div>
              <div className="ap-hdr-r">
                <button className="btn-neuro" onClick={() => setView('neurogenerate')}>
                  <Ic d={IC.star} size={14} color="#fff" sw={2}/> NeuroGenerate AI
                </button>
                <button className="btn-sec" onClick={() => navigate('/create-exam')}>
                  <Ic d={IC.plus} size={13} color={C.inkMid}/> Create Exam
                </button>
              </div>
            </div>

            {stats.breakdown?.length > 0 && (
              <div className="stat-row">
                {stats.breakdown.map(b => {
                  const m = QB_COLORS[(b.type||'').toLowerCase()]||{color:C.inkSub,bg:C.subtle,border:C.border};
                  return (
                    <div key={b.type} className="stat-chip" style={{ borderColor:m.border }}>
                      <div style={{ fontSize:20,fontWeight:800,color:m.color,fontFamily:C.mono }}>{b.count}</div>
                      <div style={{ fontSize:10,fontWeight:700,color:C.inkMuted,marginTop:2,textTransform:'uppercase',letterSpacing:'.4px' }}>{(b.type||'').toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="filter-bar">
              <div className="search-wrap">
                <Ic d={IC.search} size={13} color={C.inkMuted}/>
                <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exam name, session ID…"/>
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {EXAM_TYPES.map(t => (
                  <button key={t} className={`filter-chip${filterType===t?' active':''}`} onClick={() => setFilterType(t)}>{t}</button>
                ))}
              </div>
              <span style={{ marginLeft:'auto', fontSize:12, color:C.inkMuted }}>{filtered.length} result{filtered.length!==1?'s':''}</span>
            </div>

            <div className="card">
              <div className="tbl-wrap">
                {loading
                  ? <div className="loading"><div className="spinner" style={{ marginBottom:12 }}/>Loading…</div>
                  : filtered.length === 0
                    ? (
                      <div className="empty">
                        <Ic d={IC.layers} size={36} color={C.blue} sw={1.2}/>
                        <div style={{ marginTop:12 }}>{sessions.length===0?'No question bank entries yet.':'No entries match your search.'}</div>
                        {sessions.length===0 && (
                          <button className="btn-neuro" style={{ marginTop:14 }} onClick={() => setView('neurogenerate')}>
                            <Ic d={IC.star} size={13} color="#fff" sw={2}/> Generate with NeuroGenerate AI
                          </button>
                        )}
                      </div>
                    )
                    : (
                      <table className="tbl">
                        <thead>
                          <tr><th>QB Session ID</th><th>Exam Name</th><th>Exam Type</th><th>Question Types</th><th>Topics</th><th>Questions</th><th>Created</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                          {filtered.map(s => (
                            <tr key={s.sessionCode}>
                              <td>
                                <span className="mono" style={{ fontWeight:700,background:C.blueLt,color:C.blue,padding:'3px 9px',borderRadius:5,display:'inline-block' }}>{s.sessionCode}</span>
                              </td>
                              <td>
                                <div style={{ fontWeight:600,color:C.navy,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200 }}>{s.examName}</div>
                                {s.companyName && <div style={{ fontSize:10.5,color:C.inkMuted,marginTop:2 }}>{s.companyName}</div>}
                                {s.theoryCount>0 && (
                                  <div style={{ marginTop:3,display:'flex',gap:4,flexWrap:'wrap' }}>
                                    {s.theory2mCount>0 && <span style={{ fontSize:9.5,padding:'1px 6px',borderRadius:99,background:'#ecfdf5',color:'#059669',border:'1px solid #a7f3d0',fontWeight:700 }}>{s.theory2mCount}×2m</span>}
                                    {s.theory5mCount>0 && <span style={{ fontSize:9.5,padding:'1px 6px',borderRadius:99,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',fontWeight:700 }}>{s.theory5mCount}×5m</span>}
                                    {s.theory8mCount>0 && <span style={{ fontSize:9.5,padding:'1px 6px',borderRadius:99,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',fontWeight:700 }}>{s.theory8mCount}×8m</span>}
                                  </div>
                                )}
                              </td>
                              <td><ExamTypeBadge type={s.examType||'placement'}/></td>
                              <td><div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>{(s.types||[]).map(t => <TypeChip key={t} type={t}/>)}</div></td>
                              <td style={{ color:C.inkMid,fontSize:11.5,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.topicsSummary||'—'}</td>
                              <td><span style={{ fontSize:16,fontWeight:800,color:C.blue,fontFamily:C.mono }}>{s.totalQuestions}</span></td>
                              <td><span className="mono">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—'}</span></td>
                              <td>
                                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                                  <button className="btn-sm btn-sm-bl" onClick={() => setPreviewing(s)}>Preview</button>
                                  <button className="btn-sm btn-sm-nt" onClick={() => navigate('/create-exam', { state:{ preselectedSession:s } })}>Use in Exam</button>
                                  <button className="btn-sm btn-sm-rd" onClick={() => setDeleting(s)}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
              </div>
            </div>

            <div className="hint-box">
              <Ic d={IC.info} size={14} color={C.blue}/>
              <span>Use <strong>NeuroGenerate AI</strong> to create question banks, then click <strong>Preview</strong> to review, add, or remove questions before using them in an exam.</span>
            </div>
          </div>
        )}
      </main>

      {previewing && (
        <PreviewModal
          session={previewing}
          onClose={() => setPreviewing(null)}
          pushToast={pushToast}
        />
      )}
      {deleting && (
        <DeleteSessionConfirm
          session={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDeleteSession(deleting)}
        />
      )}
    </div>
  );
}


