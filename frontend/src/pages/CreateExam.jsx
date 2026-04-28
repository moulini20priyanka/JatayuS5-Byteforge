
// CreateExam.jsx — Professional dashboard UI matching AdminDashboard theme
// Background: #f0f7ff | Integrated sidebar | 3 distinct exam type color identities
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/Toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Session ────────────────────────────────────────────────────
const SESSION_KEYS = [
  'token','role','user_name','user_email','student_id',
  'admin_token','recruiter_token','student_token','admin_name','admin_email','admin_role',
];
function resolveAdminToken() {
  return {
    token: localStorage.getItem('admin_token') || localStorage.getItem('recruiter_token') || localStorage.getItem('token'),
    role:  localStorage.getItem('role') || 'admin',
  };
}

// ── Per-type color identities ─────────────────────────────────
const TYPE_THEMES = {
  placement: {
    primary:    '#7c3aed',
    dark:       '#6d28d9',
    light:      '#f5f3ff',
    border:     '#ddd6fe',
    mid:        '#8b5cf6',
    grad:       'linear-gradient(135deg,#7c3aed,#6d28d9)',
    gradSoft:   'linear-gradient(135deg,#f5f3ff,#ede9fe)',
    headerGrad: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#6d28d9 100%)',
    panelAccent:'#7c3aed',
    badge:      { bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe' },
    icon:       '💼',
    name:       'Placement Exam',
  },
  skill_certification: {
    primary:    '#059669',
    dark:       '#047857',
    light:      '#ecfdf5',
    border:     '#6ee7b7',
    mid:        '#10b981',
    grad:       'linear-gradient(135deg,#059669,#047857)',
    gradSoft:   'linear-gradient(135deg,#ecfdf5,#d1fae5)',
    headerGrad: 'linear-gradient(135deg,#064e3b 0%,#059669 50%,#047857 100%)',
    panelAccent:'#059669',
    badge:      { bg:'#ecfdf5', color:'#065f46', border:'#6ee7b7' },
    icon:       '🏆',
    name:       'Skill Certification',
  },
  university: {
    primary:    '#2563eb',
    dark:       '#1d4ed8',
    light:      '#eff6ff',
    border:     '#bfdbfe',
    mid:        '#3b82f6',
    grad:       'linear-gradient(135deg,#2563eb,#1d4ed8)',
    gradSoft:   'linear-gradient(135deg,#eff6ff,#dbeafe)',
    headerGrad: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#1d4ed8 100%)',
    panelAccent:'#2563eb',
    badge:      { bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe' },
    icon:       '🎓',
    name:       'University Exam',
  },
};

// ── Global design tokens ───────────────────────────────────────
const G = {
  bg:     '#f0f7ff',    // matches AdminDashboard
  white:  '#ffffff',
  text:   '#1e3a8a',
  muted:  '#475569',
  dim:    '#64748b',
  dimmer: '#94a3b8',
  border: '#dbeafe',
  borderSoft: '#e2e8f0',
  green:  '#059669', greenBg:'#ecfdf5', greenBorder:'#6ee7b7',
  amber:  '#d97706', amberBg:'#fffbeb', amberBorder:'#fcd34d',
  red:    '#dc2626', redBg:'#fef2f2',   redBorder:'#fecaca',
  teal:   '#0891b2', tealBg:'#f0f9ff',  tealBorder:'#bae6fd',
};

// ── Static data ────────────────────────────────────────────────
const COLLEGES    = ['RMKEC','RMDEC','RMKCET'];
const BATCH_YEARS = ['2023','2024','2025','2026','2027','2028'];
const LANGUAGES   = ['HTML','CSS','JavaScript','SQL','Java','Python','C','C++','Go','Kotlin','TypeScript'];
const DEPARTMENTS = [
  { label:'Computer Science & Engineering', value:'CSE'   },
  { label:'Information Technology',         value:'IT'    },
  { label:'Electronics & Communication',    value:'ECE'   },
  { label:'Electrical Engineering',         value:'EEE'   },
  { label:'Mechanical Engineering',         value:'MECH'  },
  { label:'Civil Engineering',              value:'CIVIL' },
];
const SEMESTERS = ['I','II','III','IV','V','VI','VII','VIII'];

const PLACEMENT_SECTIONS = {
  mcq:        { label:'MCQ',        color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
  sql:        { label:'SQL',        color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  coding:     { label:'Coding',     color:'#059669', bg:'#ecfdf5', border:'#6ee7b7' },
  aptitude:   { label:'Aptitude',   color:'#d97706', bg:'#fffbeb', border:'#fcd34d' },
  behavioral: { label:'Behavioral', color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8' },
};

const EXAM_TYPES_LIST = [
  {
    key:'placement', label:'Placement Exam',
    subtitle:'Campus recruitment & hiring assessments',
    features:['MCQ, Coding, SQL, Aptitude sections','Per-student unique exam keys','Auto email to eligible students','Adaptive difficulty MCQ engine'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    key:'skill_certification', label:'Skill Certification',
    subtitle:'Certify students in specific technical skills',
    features:['AI-generated targeted MCQs','Instant certificate on passing','Score badge on student profile','Configurable retake policy'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    key:'university', label:'University Exam',
    subtitle:'Internal college semester & unit assessments',
    features:['MCQ + Written 8-mark questions','Unique randomized paper per student','Semester & mid-term support','PDF question bank upload'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="6 11.5 6 17 12 20 18 17 18 11.5"/>
      </svg>
    ),
  },
];

const safeParse = (v, fb = {}) => { if (!v) return fb; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return fb; } };
const buildDT   = (d, t) => d ? `${d.split('T')[0]}T${t||'09:00'}` : '';
function examStatus(e) {
  const now=new Date(),s=new Date(e.start_date),en=new Date(e.end_date);
  return now<s?'upcoming':now>en?'completed':'live';
}
const STATUS_ST = {
  live:      { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0', label:'Live'      },
  upcoming:  { color:'#d97706', bg:'#fffbeb', border:'#fcd34d', label:'Upcoming'  },
  completed: { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0', label:'Completed' },
};

// ── Sidebar nav ────────────────────────────────────────────────
const NAV_SECTIONS = [
  { section:'Overview',        items:[{ path:'/admin-dashboard',      label:'Dashboard',          icon:'grid'       }] },
  { section:'Exam Management', items:[{ path:'/create-exam',          label:'Create Exam',        icon:'plus'       },
                                       { path:'/question-bank',        label:'Question Bank',      icon:'database'   },
                                       { path:'/candidates',           label:'Candidates',         icon:'users'      }]},
  { section:'Monitoring',      items:[{ path:'/live-monitoring',      label:'Live Monitoring',    icon:'eye'        },
                                       { path:'/ai-detection',         label:'AI Detection',       icon:'cpu'        },
                                       { path:'/reports',              label:'Reports',            icon:'bar-chart'  }]},
  { section:'Admin',           items:[{ path:'/admin-exam-requests',  label:'Exam Requests',      icon:'clipboard'  },
                                       { path:'/admin-approvals',      label:'Recruiter Approvals',icon:'check-sq'   },
                                       { path:'/settings',             label:'Settings',           icon:'settings'   }]},
];
function SidebarIcon({ name }) {
  const icons = {
    'grid':      <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    'plus':      <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    'database':  <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    'users':     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    'eye':       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    'cpu':       <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    'bar-chart': <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>,
    'clipboard': <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></>,
    'check-sq':  <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    'settings':  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  };
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

// ── Global CSS ─────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  /* Sidebar nav items */
  .adm-nav{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:7px;font-size:12.5px;font-weight:500;color:#475569;text-decoration:none;margin-bottom:1px;transition:all 0.18s ease;cursor:pointer;position:relative;overflow:hidden;border:1px solid transparent;user-select:none;font-family:'Inter',sans-serif;}
  .adm-nav::before{content:'';position:absolute;left:0;top:0;height:100%;width:3px;background:#3b82f6;border-radius:0 2px 2px 0;transform:scaleY(0);transition:transform 0.2s;}
  .adm-nav:hover{background:#dbeafe;color:#2563eb;transform:translateX(3px);}
  .adm-nav.active{background:#dbeafe;color:#2563eb;font-weight:600;transform:translateX(3px);}
  .adm-nav.active::before{transform:scaleY(1);}
  .adm-nav .adm-ni{display:flex;flex-shrink:0;color:#94a3b8;transition:color 0.18s;}
  .adm-nav:hover .adm-ni,.adm-nav.active .adm-ni{color:#2563eb;}

  /* Logo */
  .adm-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.35);transition:all 0.2s;cursor:pointer;flex-shrink:0;}
  .adm-logo:hover{transform:scale(1.08) rotate(4deg);box-shadow:0 4px 14px rgba(59,130,246,0.45);}

  /* Logout */
  .adm-out{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 12px;border-radius:8px;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.18);color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.18s;}
  .adm-out:hover{background:rgba(220,38,38,0.13);border-color:rgba(220,38,38,0.35);transform:translateY(-1px);}

  /* Sidebar scroll */
  .adm-scroll::-webkit-scrollbar{width:3px;}
  .adm-scroll::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.18);border-radius:4px;}

  /* Main scroll */
  .adm-main::-webkit-scrollbar{width:5px;}
  .adm-main::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.22);border-radius:8px;}

  /* Form inputs */
  .f-input{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:'Inter',sans-serif;transition:all 0.15s;}
  .f-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1);}
  .f-input.err{border-color:#fca5a5;background:#fef9f9;}
  .f-input.err:focus{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,0.1);}

  /* Exam type cards */
  .et-card{border-radius:14px;padding:24px 22px;cursor:pointer;transition:all 0.22s cubic-bezier(0.4,0,0.2,1);border:2px solid;position:relative;overflow:hidden;}
  .et-card:hover{transform:translateY(-5px);}

  /* Panel */
  .ce-panel{background:#fff;border-radius:12px;border:1px solid #dbeafe;box-shadow:0 2px 10px rgba(37,99,235,0.06);margin-bottom:16px;overflow:hidden;}
  .ce-ph{padding:13px 20px;border-bottom:1px solid #eff6ff;background:linear-gradient(to right,#f0f9ff,#fff);display:flex;align-items:center;gap:10px;}

  /* Section block */
  .sec-block{border-radius:10px;border:1.5px solid;overflow:hidden;transition:all 0.18s;}

  /* Toggle */
  .tog{border-radius:10px;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s;}
  .tog-k{position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}

  /* Diff box */
  .diff-box{border-radius:10px;padding:14px 12px;text-align:center;border:1.5px solid;transition:all 0.18s;}
  .diff-box:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,0.08);}

  /* Exam drawer */
  .ex-drawer{position:fixed;top:0;right:0;bottom:0;width:400px;background:#fff;z-index:901;display:flex;flex-direction:column;box-shadow:-6px 0 32px rgba(37,99,235,0.12);border-left:1px solid #dbeafe;}

  /* Nav card */
  .dash-nav-card{padding:14px 18px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all 0.18s;border:1px solid;}
  .dash-nav-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,0.1);}

  /* Stat card */
  .stat-c{background:#fff;border-radius:12px;padding:18px 20px;border:1px solid #dbeafe;border-top:3px solid;box-shadow:0 2px 10px rgba(37,99,235,0.06);transition:all 0.18s;}
  .stat-c:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,0.1);}

  /* Modal */
  .m-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;animation:cfIn 0.15s ease;}
  .m-box{background:#fff;border-radius:16px;padding:28px 30px 24px;max-width:340px;width:90%;box-shadow:0 20px 60px rgba(37,99,235,0.18);text-align:center;animation:cfUp 0.18s ease;border:1px solid #dbeafe;font-family:'Inter',sans-serif;}

  /* Btn */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;font-size:12.5px;font-weight:600;border:none;font-family:'Inter',sans-serif;cursor:pointer;transition:all 0.18s;padding:9px 18px;}
  .btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 10px rgba(37,99,235,0.28);}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,99,235,0.38);}
  .btn-ghost{background:#fff;color:#475569;border:1.5px solid #e2e8f0;}
  .btn-ghost:hover{background:#f8fafc;border-color:#cbd5e1;}
  .btn-soft{background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;}
  .btn-soft:hover{background:#dbeafe;}
  .btn-lg{padding:11px 26px;font-size:13.5px;}
  .btn-sm{padding:6px 12px;font-size:11.5px;}

  /* PDF zone */
  .pdf-zone{border:2px dashed;border-radius:10px;padding:20px;text-align:center;transition:all 0.15s;cursor:pointer;}
  .pdf-zone:hover{opacity:0.9;}

  /* Table */
  .tbl{width:100%;border-collapse:collapse;font-size:13px;}
  .tbl thead tr{background:#f0f9ff;border-bottom:1.5px solid #dbeafe;}
  .tbl th{padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.6px;}
  .tbl tbody tr{border-bottom:1px solid #f0f9ff;transition:background 0.12s;}
  .tbl tbody tr:hover{background:#f0f9ff;}
  .tbl td{padding:11px 16px;vertical-align:middle;}

  @keyframes cfIn{from{opacity:0}to{opacity:1}}
  @keyframes cfUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes pulse-d{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.4)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
`;

// ── Tiny SVG helper ────────────────────────────────────────────
const Svg = ({ d, size=14, color='currentColor', sw=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={d}/></svg>
);
const PATHS = {
  back:    "M19 12H5M12 19l-7-7 7-7",
  upload:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  file:    "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
  x:       "M18 6L6 18M6 6L18 18",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  list:    "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  clock:   "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  cal:     "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  bld:     "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4h6v4",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  key:     "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  mail:    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  db:      "M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5",
  spark:   "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z",
  send:    "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  award:   "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  info:    "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  check:   "M20 6L9 17L4 12",
  logout:  "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  lock:    "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
};

// ── Shared sub-components ──────────────────────────────────────
const Tog = ({ on, color, toggle, size=38 }) => (
  <div className="tog" onClick={toggle} style={{ width:size, height:20, background: on ? color : '#cbd5e1' }}>
    <div className="tog-k" style={{ left: on ? size-17 : 3 }}/>
  </div>
);

const FL = ({ children, req }) => (
  <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#334155', marginBottom:6, letterSpacing:'0.15px' }}>
    {children}{req && <span style={{color:G.red,marginLeft:3}}>*</span>}
  </label>
);

const Err = ({ msg, style }) => msg ? (
  <div style={{ fontSize:11, color:G.red, marginTop:4, display:'flex', alignItems:'center', gap:4, ...style }}>
    <span>⚠</span>{msg}
  </div>
) : null;

function FInput({ value, onChange, placeholder, type='text', err, style, min, max }) {
  return (
    <input className={`f-input${err?' err':''}`} value={value} onChange={onChange}
      placeholder={placeholder} type={type} min={min} max={max}
      style={{ ...style }} />
  );
}
function FSelect({ value, onChange, err, children }) {
  return <select className={`f-input${err?' err':''}`} value={value} onChange={onChange}>{children}</select>;
}

function Panel({ num, title, color, children }) {
  return (
    <div className="ce-panel">
      <div className="ce-ph">
        <span style={{ width:26,height:26,borderRadius:'50%',background:color,color:'#fff',fontSize:11.5,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 2px 8px ${color}55` }}>{num}</span>
        <span style={{ fontSize:13.5, fontWeight:700, color:'#1e3a8a' }} dangerouslySetInnerHTML={{__html:title}} />
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}

function MiniF({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ fontSize:10, color:G.dim, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>
      <input type="number" min="1" className="f-input" value={value} onChange={e=>onChange(e.target.value)} style={{ padding:'5px 8px', width:68, fontSize:12 }} />
    </div>
  );
}

function SectionBadge({ label, on, color, bg, border }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:5, background: on?bg:'#f8fafc', border:`1px solid ${on?border:'#e2e8f0'}` }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:on?color:'#94a3b8' }}/>
      <span style={{ fontSize:11,fontWeight:700,color:on?color:'#94a3b8' }}>{label}</span>
    </span>
  );
}

function PdfZone({ file, onFile, onRemove, color, bg, border, error, hint }) {
  const ref = useRef(null);
  const name = file?.name; const size = file?.size;
  if (name) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',background:bg,borderRadius:9,border:`1.5px solid ${border}` }}>
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:8,background:'#fff',border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Svg d={PATHS.file} size={17} color={color}/>
        </div>
        <div>
          <div style={{ fontSize:12.5,fontWeight:600,color:'#0f172a' }}>{name}</div>
          {size && <div style={{ fontSize:10.5,color:G.dim,marginTop:1 }}>{size}</div>}
        </div>
      </div>
      <button onClick={onRemove} style={{ padding:'5px 11px',borderRadius:7,border:`1px solid ${G.redBorder}`,background:G.redBg,color:G.red,cursor:'pointer',fontSize:11.5,fontWeight:600 }}>Remove</button>
    </div>
  );
  return (
    <label style={{ display:'block', cursor:'pointer' }}>
      <div className="pdf-zone" style={{ borderColor: error?G.redBorder:border, background: error?G.redBg:bg+'44' }}
        onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)onFile(f);}}>
        <div style={{ width:42,height:42,borderRadius:10,background:error?G.redBg:bg,border:`1.5px solid ${error?G.redBorder:border}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px' }}>
          <Svg d={PATHS.upload} size={20} color={error?G.red:color}/>
        </div>
        <div style={{ fontSize:13,fontWeight:600,color:error?G.red:color,marginBottom:3 }}>Drop PDF here or click to browse</div>
        {hint && <div style={{ fontSize:10.5,color:G.dimmer,marginTop:2 }}>{hint}</div>}
      </div>
      <input ref={ref} type="file" accept="application/pdf" style={{ display:'none' }} onChange={e=>{if(e.target.files[0])onFile(e.target.files[0]);}}/>
    </label>
  );
}

function SecBlock({ enabled, toggle, color, bg, border, label, sublabel, config, children }) {
  return (
    <div className="sec-block" style={{ borderColor:enabled?border:'#e2e8f0', background:enabled?bg+'55':'#f8fafc' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 15px',flexWrap:'wrap',gap:9 }}>
        <div style={{ display:'flex',alignItems:'center',gap:9 }}>
          <Tog on={enabled} color={color} toggle={toggle}/>
          <SectionBadge label={label} on={enabled} color={color} bg={bg} border={border}/>
          {sublabel && <span style={{ fontSize:11.5,color:G.dim }}>{sublabel}</span>}
        </div>
        {config}
      </div>
      {children}
    </div>
  );
}

// ── Exams Drawer ───────────────────────────────────────────────
function ExamsDrawer({ open, onClose, navigate }) {
  const [exams,  setExams]  = useState([]);
  const [loading,setLoading]= useState(false);
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    const { token } = resolveAdminToken(); if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/exams`,{headers:{Authorization:`Bearer ${token}`}});
      const d = await r.json(); if (r.ok) setExams(d.exams||[]);
    } catch(e){console.error(e);} finally{setLoading(false);}
  },[]);
  useEffect(()=>{if(open)load();},[open,load]);

  const filtered = exams.filter(e => filter==='all' || examStatus(e)===filter);
  const cnt = (s) => exams.filter(e=>examStatus(e)===s).length;

  return (
    <>
      {open && <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:900,backdropFilter:'blur(2px)' }}/>}
      <div className="ex-drawer" style={{ transform:open?'translateX(0)':'translateX(100%)', transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        {/* Header */}
        <div style={{ padding:'15px 16px 11px',borderBottom:`1px solid ${G.border}`,background:'linear-gradient(135deg,#f8fafc,#eff6ff)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:11 }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:30,height:30,borderRadius:7,background:'#eff6ff',border:'1px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Svg d={PATHS.list} size={13} color="#2563eb"/>
              </div>
              <div>
                <div style={{ fontSize:13.5,fontWeight:700,color:'#1e3a8a' }}>Created Exams</div>
                <div style={{ fontSize:10.5,color:G.dim }}>{exams.length} total</div>
              </div>
            </div>
            <div style={{ display:'flex',gap:6 }}>
              <button onClick={load} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${G.border}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Svg d={PATHS.refresh} size={12} color={G.dim}/></button>
              <button onClick={onClose} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${G.border}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Svg d={PATHS.x} size={12} color={G.dim}/></button>
            </div>
          </div>
          <div style={{ display:'flex',gap:5 }}>
            {[{k:'all',l:'All',c:exams.length},{k:'live',l:'Live',c:cnt('live')},{k:'upcoming',l:'Upcoming',c:cnt('upcoming')},{k:'completed',l:'Done',c:cnt('completed')}].map(f=>{
              const act = filter===f.k; const st = STATUS_ST[f.k];
              return <button key={f.k} onClick={()=>setFilter(f.k)} style={{ flex:1,padding:'5px 3px',borderRadius:7,cursor:'pointer',fontSize:10,fontWeight:700,border:`1px solid ${act?(st?.border||'#bfdbfe'):G.borderSoft}`,background:act?(st?.bg||'#eff6ff'):'#fff',color:act?(st?.color||'#2563eb'):G.dim,transition:'all 0.12s' }}>{f.l}{f.c>0&&` ${f.c}`}</button>;
            })}
          </div>
        </div>
        {/* Body */}
        <div style={{ flex:1,overflow:'auto',padding:'11px 13px' }}>
          {loading && <div style={{ textAlign:'center',padding:'36px 0',color:G.dim,fontSize:13 }}>Loading exams…</div>}
          {!loading && filtered.length===0 && (
            <div style={{ textAlign:'center',padding:'44px 16px' }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#eff6ff',border:'1px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 11px' }}><Svg d={PATHS.list} size={20} color="#2563eb"/></div>
              <div style={{ fontSize:13,fontWeight:600,color:G.muted }}>No exams found</div>
            </div>
          )}
          {!loading && filtered.map(exam=>{
            const s=examStatus(exam); const st=STATUS_ST[s];
            const tt = TYPE_THEMES[exam.exam_type]||TYPE_THEMES.placement;
            return (
              <div key={exam.id} style={{ background:'#fff',border:`1px solid ${G.borderSoft}`,borderLeft:`3px solid ${tt.primary}`,borderRadius:9,padding:'12px 14px',marginBottom:7,cursor:'pointer',transition:'all 0.14s' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 3px 14px rgba(37,99,235,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
                onClick={()=>navigate(`/admin-exam/${exam.id}`)}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7 }}>
                  <div style={{ fontSize:12.5,fontWeight:700,color:'#1e3a8a',flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{exam.title}</div>
                  <span style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:20,background:st.bg,border:`1px solid ${st.border}`,flexShrink:0,marginLeft:8 }}>
                    <span style={{ width:5,height:5,borderRadius:'50%',background:st.color,animation:s==='live'?'pulse-d 1.5s infinite':'none' }}/>
                    <span style={{ fontSize:9.5,fontWeight:700,color:st.color }}>{st.label}</span>
                  </span>
                </div>
                <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:6 }}>
                  {exam.college && <span style={{ fontSize:10,color:G.dim,display:'flex',alignItems:'center',gap:3 }}><Svg d={PATHS.bld} size={9} color={G.dimmer}/>{exam.college}</span>}
                  {exam.batch_year && <span style={{ fontSize:10,color:G.dim }}>{exam.batch_year}</span>}
                </div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <span style={{ fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:4,background:tt.light,color:tt.primary,border:`1px solid ${tt.border}` }}>{exam.exam_type?.toUpperCase()}</span>
                  <span style={{ fontSize:10,color:G.dim,display:'flex',alignItems:'center',gap:3 }}><Svg d={PATHS.clock} size={9} color={G.dimmer}/>{exam.duration_minutes}m</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:'11px 13px',borderTop:`1px solid ${G.border}`,flexShrink:0 }}>
          <button className="btn btn-ghost" style={{ width:'100%',justifyContent:'center' }} onClick={()=>navigate('/admin-exams')}><Svg d={PATHS.list} size={13} color={G.dim}/>View All Exams</button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function CreateExam() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { showToast } = useApp();

  const fromRequest = location.state?.fromRequest||false;
  const requestData = location.state?.requestData ||null;
  const initialType = location.state?.examType||(fromRequest?'placement':null);

  const [examType,   setExamType]  = useState(initialType);
  const [typeHover,  setTypeHover] = useState(null);
  const [drawerOpen, setDrawer]    = useState(false);
  const [showLogout, setLogoutM]   = useState(false);
  const [submitting, setSubmitting]= useState(false);
  const [submitted,  setSubmitted] = useState(false);
  const [createdExam,setCreated]   = useState(null);
  const [errors,     setErrors]    = useState({});

  const isU  = examType==='university';
  const isSC = examType==='skill_certification';
  const TT   = examType ? TYPE_THEMES[examType] : null;

  const reqSec  = safeParse(requestData?.section_config,      {});
  const reqCut  = safeParse(requestData?.sectional_cutoffs,   {});
  const reqElig = safeParse(requestData?.eligibility_criteria,{});
  const totalMin= Object.values(reqSec).reduce((t,s)=>t+(s.enabled&&s.minutes?parseInt(s.minutes):0),0);

  const [form, setForm] = useState({
    title: requestData?`${requestData.job_role} — ${requestData.company_name||'Placement'} Assessment`:'',
    college: requestData?.target_college||'', batchYear: requestData?.target_batch_year?.toString()||'',
    department:'', semester:'', examName:'', subjectCode:'', subjectName:'',
    startDate: buildDT(requestData?.schedule_date,requestData?.schedule_time),
    endDate:'', duration: totalMin>0?totalMin.toString():'60',
    totalMarks:'100', passMark:'40', cutoffScore:'', description: requestData?.specifications||'',
    languages:['Python','Java'],
    mcqCount:'20',mcqMarks:'1',mcqMinutes:'30',
    writtenCount:'5',writtenMarks:'8',writtenMinutes:'60',
  });

  const [sections,     setSections]      = useState(()=>{ const e={}; Object.entries(reqSec).forEach(([k,v])=>{if(v.enabled)e[k]=true;}); return Object.keys(e).length>0?e:{mcq:true,coding:true}; });
  const [univSec,      setUnivSec]       = useState({mcq:true,written:true});
  const [secCfg,       setSecCfg]        = useState(()=>{ const c={}; Object.entries(reqSec).forEach(([k,v])=>{if(v.enabled)c[k]={questions:v.questions?.toString()||'',minutes:v.minutes?.toString()||''};}); return c; });
  const [scCfg,        setScCfg]         = useState({ certName:'',certProvider:'',questionCount:'30',durationMinutes:'60',passingScore:'70',difficulty:{easy:'33',medium:'34',hard:'33'},allowRetake:false,generateBadge:true });
  const [adaptiveMcq,  setAdaptive]      = useState(true);
  const [mcqDiff,      setMcqDiff]       = useState({easy:'30',medium:'50',hard:'20'});
  const [cutoffEnabled,setCutoffEnabled] = useState(requestData?.sectional_cutoff_required||false);
  const [cutoffs,      setCutoffs]       = useState(()=>{ const c={}; Object.entries(reqCut).forEach(([k,v])=>{if(v)c[k]=v.toString();}); return c; });
  const [mcqPdf,       setMcqPdf]        = useState(null);
  const [writtenPdf,   setWrittenPdf]    = useState(null);
  const [pdfFiles,     setPdfFiles]      = useState({});
  const [pdfPrev,      setPdfPrev]       = useState({});

  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleLang = l => setF('languages',form.languages.includes(l)?form.languages.filter(x=>x!==l):[...form.languages,l]);
  const addPdf = (sec,file) => {
    if(!file||file.type!=='application/pdf'){showToast('Please upload a valid PDF file','error');return;}
    setPdfFiles(p=>({...p,[sec]:file})); setPdfPrev(p=>({...p,[sec]:{name:file.name,size:(file.size/1024).toFixed(1)+' KB'}}));
  };
  const rmPdf = sec => { setPdfFiles(p=>{const n={...p};delete n[sec];return n;}); setPdfPrev(p=>{const n={...p};delete n[sec];return n;}); };
  const addUnivPdf = (t,f) => { if(!f||f.type!=='application/pdf'){showToast('Please upload a valid PDF file','error');return;} t==='mcq'?setMcqPdf(f):setWrittenPdf(f); };

  const userName = localStorage.getItem('user_name')||localStorage.getItem('admin_name')||'Admin';
  const userRole = localStorage.getItem('role')||'admin';
  const initials = userName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const handleLogout = () => { SESSION_KEYS.forEach(k=>localStorage.removeItem(k)); navigate('/',{replace:true}); };

  const isActive = path => { const p=location.pathname; if(path==='/admin-dashboard')return p==='/admin-dashboard'; return p===path||p.startsWith(path+'/'); };

  const validate = () => {
    const e={};
    if(!form.title.trim()) e.title='Exam title is required';
    if(!form.college)      e.college='Select a college';
    if(!form.batchYear)    e.batchYear='Select a batch year';
    if(!form.startDate)    e.startDate='Start date required';
    if(!form.endDate)      e.endDate='End date required';
    if(!form.duration||+form.duration<=0) e.duration='Duration required';
    if(isU){
      if(!form.department)      e.department='Select a department';
      if(!form.semester)        e.semester='Select a semester';
      if(!form.subjectName.trim()) e.subjectName='Subject name required';
      if(!Object.values(univSec).some(v=>v)) e.sections='At least one section required';
      if(univSec.mcq&&!mcqPdf)      e.mcqPdf='Upload MCQ PDF';
      if(univSec.written&&!writtenPdf) e.writtenPdf='Upload written PDF';
    } else if(isSC){
      if(!scCfg.certName.trim()) e.skillCertName='Certification name required';
      if(!scCfg.questionCount||+scCfg.questionCount<10) e.skillCertQ='At least 10 questions';
      if(!scCfg.durationMinutes||+scCfg.durationMinutes<15) e.skillCertD='Minimum 15 minutes';
      const tot=+scCfg.difficulty.easy + +scCfg.difficulty.medium + +scCfg.difficulty.hard;
      if(tot!==100) e.skillCertDiff=`Must sum to 100 (currently ${tot})`;
    } else {
      if(form.languages.length===0) e.languages='Select at least one language';
      if(Object.values(sections).every(v=>!v)) e.sections='At least one section required';
      if(adaptiveMcq&&sections.mcq){
        const tot=+mcqDiff.easy + +mcqDiff.medium + +mcqDiff.hard;
        if(tot!==100) e.mcqDiff=`Must sum to 100 (currently ${tot})`;
      }
    }
    return e;
  };

  const handleSubmit = async () => {
    const e=validate(); if(Object.keys(e).length>0){setErrors(e);showToast('Please fix errors before submitting','error');return;}
    setErrors({}); setSubmitting(true);
    try {
      const { token, role:r } = resolveAdminToken();
      if(!token){showToast('Session expired — please log in again.','error');setSubmitting(false);return;}
      if(r==='student'){showToast('Access denied.','error');setSubmitting(false);return;}
      const fd=new FormData();
      fd.append('exam_type',examType||'placement'); fd.append('title',form.title); fd.append('college',form.college); fd.append('batch_year',form.batchYear);
      fd.append('start_date',form.startDate); fd.append('end_date',form.endDate); fd.append('duration_minutes',form.duration);
      fd.append('total_marks',form.totalMarks); fd.append('pass_mark',form.passMark); fd.append('description',form.description);
      if(isU){
        fd.append('department',form.department); fd.append('semester',form.semester); fd.append('exam_name',form.examName); fd.append('subject_code',form.subjectCode); fd.append('subject_name',form.subjectName);
        fd.append('sections',JSON.stringify(univSec));
        fd.append('section_config',JSON.stringify({mcq:{count:form.mcqCount,marks:form.mcqMarks,minutes:form.mcqMinutes},written:{count:form.writtenCount,marks:form.writtenMarks,minutes:form.writtenMinutes}}));
        if(mcqPdf)fd.append('pdf_mcq',mcqPdf); if(writtenPdf)fd.append('pdf_written',writtenPdf);
      } else if(isSC){
        fd.append('cert_name',scCfg.certName); fd.append('cert_provider',scCfg.certProvider); fd.append('question_count',scCfg.questionCount);
        fd.append('passing_score',scCfg.passingScore); fd.append('allow_retake',scCfg.allowRetake?'1':'0'); fd.append('generate_badge',scCfg.generateBadge?'1':'0');
        fd.append('skill_cert_difficulty',JSON.stringify(scCfg.difficulty)); fd.set('duration_minutes',scCfg.durationMinutes); fd.append('allowed_languages',JSON.stringify(form.languages));
      } else {
        fd.append('allowed_languages',JSON.stringify(form.languages)); fd.append('sections',JSON.stringify(sections)); fd.append('section_config',JSON.stringify(secCfg));
        fd.append('adaptive_mcq',adaptiveMcq?'1':'0'); fd.append('mcq_difficulty',JSON.stringify(mcqDiff)); fd.append('cutoff_enabled',cutoffEnabled?'1':'0'); fd.append('cutoffs',JSON.stringify(cutoffs));
        if(form.cutoffScore) fd.append('cutoff_score',form.cutoffScore); fd.append('exam_request_id',requestData?.id||''); fd.append('eligibility',JSON.stringify(reqElig));
        Object.entries(pdfFiles).forEach(([s,f])=>fd.append(`pdf_${s}`,f));
      }
      const res=await fetch(`${API}/api/exams/create`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||data.message||`Server error (${res.status})`);
      setCreated(data); setSubmitted(true);
      showToast(isU?'University exam created!':isSC?'Certification exam created!':'Exam created — keys sent to students.','success');
    } catch(err){console.error(err);showToast(err.message||'Something went wrong','error');} finally{setSubmitting(false);}
  };

  const enabledSecs = Object.entries(sections).filter(([,v])=>v);

  // ── Shared sidebar element ─────────────────────────────────
  const SBEl = (
    <aside style={{ width:220,flexShrink:0,background:G.white,borderRight:`1px solid ${G.border}`,display:'flex',flexDirection:'column',position:'sticky',top:56,height:'calc(100vh - 56px)',boxShadow:'2px 0 8px rgba(37,99,235,0.05)' }}>
      <div className="adm-scroll" style={{ flex:1,padding:'10px 8px',overflowY:'auto' }}>
        {NAV_SECTIONS.map(s=>(
          <div key={s.section}>
            <div style={{ fontSize:9.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.9px',padding:'9px 9px 3px' }}>{s.section}</div>
            {s.items.map(item=>(
              <NavLink key={item.path} to={item.path} end={item.path==='/admin-dashboard'}
                className={()=>`adm-nav${isActive(item.path)?' active':''}`}>
                <span className="adm-ni"><SidebarIcon name={item.icon}/></span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop:`1px solid ${G.border}`,padding:'10px',flexShrink:0,background:'linear-gradient(135deg,rgba(37,99,235,0.02) 0%,transparent 100%)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:'#f8fafc',border:`1px solid ${G.border}`,borderRadius:8,padding:'8px 10px',marginBottom:7 }}>
          <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#2563eb)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11.5,fontWeight:700,color:'#fff',flexShrink:0,border:'2px solid #bfdbfe' }}>{initials}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:600,color:'#1e3a8a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{userName}</div>
            <div style={{ fontSize:10,color:G.dim,textTransform:'capitalize',marginTop:1 }}>{userRole}</div>
          </div>
        </div>
        <button className="adm-out" onClick={()=>setLogoutM(true)}><Svg d={PATHS.logout} size={13} color={G.red}/>Sign Out</button>
      </div>
    </aside>
  );

  // ── Shared header ──────────────────────────────────────────
  const HeaderEl = (
    <header style={{ background:G.white,borderBottom:`1px solid ${G.border}`,height:56,padding:'0 22px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50,flexShrink:0,boxShadow:'0 1px 4px rgba(37,99,235,0.07)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:9 }}>
        <div className="adm-logo"><svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <span style={{ fontSize:14.5,fontWeight:700,color:'#1e3a8a',letterSpacing:'-.4px' }}>NeuroAssess</span>
        <span style={{ fontSize:10,fontWeight:600,color:'#93c5fd',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:20,padding:'2px 8px',marginLeft:4 }}>Admin</span>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:9,background:'#f8fafc',border:`1px solid ${G.border}`,borderRadius:7,padding:'7px 12px',width:320,transition:'all 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='#93c5fd';e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.boxShadow='none';}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Search exams, candidates…" style={{ background:'none',border:'none',outline:'none',fontSize:12.5,color:'#1e3a8a',width:'100%',fontFamily:"'Inter',sans-serif" }}/>
      </div>
      <div style={{ width:34,height:34,borderRadius:8,background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all 0.18s',boxShadow:'0 2px 8px rgba(37,99,235,0.28)' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1) rotate(4deg)';}}
        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) rotate(0)';}}>
        {initials}
      </div>
    </header>
  );

  // ── Layout wrapper ─────────────────────────────────────────
  const Wrap = ({ children }) => (
    <div style={{ display:'flex',flexDirection:'column',minHeight:'100vh',background:G.bg,fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>
      {HeaderEl}
      <div style={{ display:'flex',flex:1 }}>
        {SBEl}
        <main className="adm-main" style={{ flex:1,padding:'22px 24px',overflowY:'auto' }}>
          {/* Breadcrumb bar */}
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:18,fontSize:12,color:G.dim }}>
            <span style={{ color:'#93c5fd' }}>Admin</span>
            <span>›</span>
            <span style={{ color:'#93c5fd',cursor:'pointer' }} onClick={()=>navigate('/admin-dashboard')}>Dashboard</span>
            <span>›</span>
            <span style={{ fontWeight:600,color:'#1e3a8a' }}>Create Exam{examType?` — ${TYPE_THEMES[examType]?.name}`:''}</span>
          </div>
          {children}
        </main>
      </div>
      <ExamsDrawer open={drawerOpen} onClose={()=>setDrawer(false)} navigate={navigate}/>
      {showLogout&&(
        <div className="m-overlay" onClick={()=>setLogoutM(false)}>
          <div className="m-box" onClick={e=>e.stopPropagation()}>
            <div style={{ width:50,height:50,borderRadius:13,background:G.redBg,border:`1.5px solid ${G.redBorder}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 15px' }}>
              <Svg d={PATHS.logout} size={21} color={G.red} sw={2}/>
            </div>
            <div style={{ fontSize:16,fontWeight:700,color:'#1e3a8a',marginBottom:7 }}>Log out?</div>
            <div style={{ fontSize:13,color:G.dim,lineHeight:1.55,marginBottom:20 }}>You'll be returned to the home page and need to sign in again.</div>
            <div style={{ display:'flex',gap:9 }}>
              <button className="btn btn-soft" style={{ flex:1 }} onClick={()=>setLogoutM(false)}>Cancel</button>
              <button className="btn" style={{ flex:1,background:G.red,color:'#fff',border:'none' }} onClick={handleLogout}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer/>
    </div>
  );

  // ── SUCCESS ────────────────────────────────────────────────
  if(submitted&&createdExam){
    return (
      <Wrap>
        <div style={{ maxWidth:580,margin:'0 auto',animation:'fadeUp 0.4s ease-out' }}>
          <div style={{ background:G.white,borderRadius:14,border:`1px solid ${G.border}`,boxShadow:'0 4px 24px rgba(37,99,235,0.08)',overflow:'hidden' }}>
            <div style={{ background: TT?.headerGrad||'linear-gradient(135deg,#1e3a8a,#2563eb)', padding:'32px 32px 52px',textAlign:'center',position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:-25,right:-25,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.07)',animation:'floatY 6s ease-in-out infinite' }}/>
              <div style={{ width:62,height:62,borderRadius:'50%',background:'rgba(255,255,255,0.18)',border:'2px solid rgba(255,255,255,0.38)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 4px 20px rgba(0,0,0,0.14)' }}>
                <Svg d={PATHS.check} size={30} color="#fff" sw={2.5}/>
              </div>
              <div style={{ fontSize:21,fontWeight:800,color:'#fff',marginBottom:6 }}>Exam Created Successfully!</div>
              <div style={{ fontSize:13,color:'rgba(255,255,255,0.8)',lineHeight:1.6 }}>
                {isU?'Unique randomized papers sent to all enrolled students.':isSC?'AI-generated questions prepared and ready for students.':'Unique exam keys emailed to eligible students.'}
              </div>
            </div>
            <div style={{ padding:'26px 28px 22px',marginTop:-14,borderRadius:'14px 14px 0 0',background:G.white,position:'relative' }}>
              <div style={{ background: TT?.gradSoft||'#eff6ff',border:`1px solid ${TT?.border||'#bfdbfe'}`,borderRadius:10,padding:'15px 18px',marginBottom:20 }}>
                <div style={{ fontSize:9.5,fontWeight:700,color: TT?.primary||'#2563eb',letterSpacing:'0.5px',marginBottom:11 }}>EXAM SUMMARY</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                  {[
                    ['Title',form.title],
                    isU?['Department',form.department]:isSC?['Certification',scCfg.certName]:['Students Notified',createdExam.student_count||'—'],
                    ['College',form.college],
                    isU?['Semester',form.semester]:isSC?['Provider',scCfg.certProvider||'—']:['Batch',form.batchYear],
                    ['Start',new Date(form.startDate).toLocaleString()],
                    ['Duration',`${form.duration} min`],
                    ['Questions',createdExam.questions_saved||'—'],
                    isSC?['Pass Score',`${scCfg.passingScore}%`]:['Languages',form.languages.join(', ')],
                  ].filter(Boolean).map(([k,v])=>(
                    <div key={k}><div style={{ fontSize:10,color:G.dim,fontWeight:600 }}>{k}</div><div style={{ fontSize:12.5,color:'#1e3a8a',fontWeight:600,marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex',gap:9 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>navigate('/admin-exam-requests')}>Back to Requests</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={()=>setDrawer(true)}>View Created Exams</button>
              </div>
            </div>
          </div>
        </div>
      </Wrap>
    );
  }

  // ── TYPE SELECTOR ──────────────────────────────────────────
  if(!examType){
    return (
      <Wrap>
        <div style={{ maxWidth:920,margin:'0 auto' }}>
          {/* Page title row */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22 }}>
            <div style={{ display:'flex',alignItems:'center',gap:11 }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>navigate(-1)}><Svg d={PATHS.back} size={13} color={G.dim}/></button>
              <div>
                <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:'#1e3a8a',letterSpacing:'-.4px' }}>Create New Exam</h1>
                <p style={{ margin:'2px 0 0',fontSize:12.5,color:'#60a5fa' }}>Choose the exam type to get started</p>
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-soft btn-sm" onClick={()=>navigate('/admin-question-bank')}><Svg d={PATHS.db} size={12} color="#2563eb"/>Question Bank</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDrawer(true)}><Svg d={PATHS.list} size={12} color={G.dim}/>Created Exams</button>
            </div>
          </div>

          {/* 3 type cards — each with unique color */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18,marginBottom:22 }}>
            {EXAM_TYPES_LIST.map(t=>{
              const tt  = TYPE_THEMES[t.key];
              const hov = typeHover===t.key;
              return (
                <div key={t.key} className="et-card"
                  style={{ borderColor: hov?'transparent':tt.border, background: hov ? tt.grad : G.white, boxShadow: hov?`0 12px 36px ${tt.primary}44`:'0 2px 8px rgba(37,99,235,0.06)', transform: hov?'translateY(-5px)':'none' }}
                  onClick={()=>setExamType(t.key)} onMouseEnter={()=>setTypeHover(t.key)} onMouseLeave={()=>setTypeHover(null)}>

                  {/* Type badge top-right */}
                  <div style={{ position:'absolute',top:14,right:14,fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:hov?'rgba(255,255,255,0.2)':tt.light,color:hov?'#fff':tt.primary,border:`1px solid ${hov?'rgba(255,255,255,0.3)':tt.border}` }}>
                    {t.key==='placement'?'HIRING':t.key==='skill_certification'?'SKILL CERT':'UNIVERSITY'}
                  </div>

                  {/* Icon */}
                  <div style={{ width:52,height:52,borderRadius:14,background:hov?'rgba(255,255,255,0.18)':tt.light,border:`1.5px solid ${hov?'rgba(255,255,255,0.32)':tt.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,color:hov?'#fff':tt.primary,boxShadow:hov?'0 4px 16px rgba(0,0,0,0.1)':`0 2px 8px ${tt.primary}22` }}>
                    {t.icon}
                  </div>

                  <div style={{ fontSize:16,fontWeight:800,color:hov?'#fff':'#1e3a8a',marginBottom:5,letterSpacing:'-.3px' }}>{t.label}</div>
                  <div style={{ fontSize:12,color:hov?'rgba(255,255,255,0.75)':G.dim,marginBottom:18,lineHeight:1.55 }}>{t.subtitle}</div>

                  {/* Feature list */}
                  <div style={{ display:'flex',flexDirection:'column',gap:7,marginBottom:20 }}>
                    {t.features.map((f,i)=>(
                      <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:hov?'rgba(255,255,255,0.88)':G.muted }}>
                        <div style={{ width:17,height:17,borderRadius:'50%',background:hov?'rgba(255,255,255,0.2)':tt.light,border:`1px solid ${hov?'rgba(255,255,255,0.3)':tt.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1 }}>
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={hov?'#fff':tt.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA row */}
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderRadius:9,background:hov?'rgba(255,255,255,0.15)':tt.light,border:`1px solid ${hov?'rgba(255,255,255,0.25)':tt.border}` }}>
                    <span style={{ fontSize:12.5,fontWeight:700,color:hov?'#fff':tt.primary }}>Select &amp; Configure</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={hov?'#fff':tt.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div style={{ background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'11px 15px',display:'flex',gap:9,alignItems:'center',fontSize:12,color:'#0369a1' }}>
            <Svg d={PATHS.info} size={14} color="#0891b2"/>
            <span>Coming from an approved recruiter request? Go to <strong>Exam Requests → Approved → Create Exam</strong> for auto-filled forms.</span>
          </div>
        </div>
      </Wrap>
    );
  }

  // ── FORM ───────────────────────────────────────────────────
  const diffCols = [
    {key:'easy',  label:'Easy',   color:G.green,  bg:G.greenBg,  border:G.greenBorder},
    {key:'medium',label:'Medium', color:G.amber,  bg:G.amberBg,  border:G.amberBorder},
    {key:'hard',  label:'Hard',   color:G.red,    bg:G.redBg,    border:G.redBorder  },
  ];

  return (
    <Wrap>
      <div style={{ maxWidth:880,margin:'0 auto' }}>

        {/* Page title + type tabs */}
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,gap:12,flexWrap:'wrap' }}>
          <div style={{ display:'flex',alignItems:'center',gap:11 }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>fromRequest?navigate(-1):setExamType(null)}><Svg d={PATHS.back} size={13} color={G.dim}/></button>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3 }}>
                {/* Type tab switcher */}
                {EXAM_TYPES_LIST.map((t,i)=>{
                  const tt=TYPE_THEMES[t.key]; const act=examType===t.key;
                  return (
                    <React.Fragment key={t.key}>
                      {i>0&&<span style={{color:G.dimmer,fontSize:11}}>›</span>}
                      <button onClick={()=>!fromRequest&&setExamType(t.key)}
                        style={{ padding:'3px 10px',borderRadius:20,fontSize:10.5,fontWeight:700,border:`1px solid ${act?'transparent':G.borderSoft}`,background:act?tt.grad:'#f8fafc',color:act?'#fff':G.dim,cursor:fromRequest?'default':'pointer',transition:'all 0.15s' }}>
                        {t.label}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <h1 style={{ margin:0,fontSize:19,fontWeight:800,color:'#1e3a8a',letterSpacing:'-.4px' }}>Create {TT?.name}</h1>
              <p style={{ margin:'2px 0 0',fontSize:12,color:'#60a5fa' }}>
                {isU?'Upload PDFs — unique randomized papers generated per student':isSC?'AI-generated questions based on certification title':fromRequest?`Auto-filled from Request #${requestData?.id}`:'Configure and deploy assessment'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            {!isU&&!isSC&&<button className="btn btn-soft btn-sm" onClick={()=>navigate('/admin-question-bank')}><Svg d={PATHS.db} size={12} color="#2563eb"/>Question Bank</button>}
            <button className="btn btn-ghost btn-sm" onClick={()=>setDrawer(true)}><Svg d={PATHS.list} size={12} color={G.dim}/>Created Exams</button>
          </div>
        </div>

        {/* Colored accent bar below title — unique per type */}
        <div style={{ height:3,borderRadius:2,background: TT?.grad, marginBottom:20,boxShadow:`0 2px 8px ${TT?.primary}44` }}/>

        {/* ── 1. Exam Details ── */}
        <Panel num="1" title="Exam Details" color={TT?.primary||'#2563eb'}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr',gap:14 }}>
            <div>
              <FL req>Exam Title</FL>
              <FInput value={form.title} onChange={e=>setF('title',e.target.value)} err={errors.title}
                placeholder={isU?'e.g. Operating Systems — End Semester':isSC?'e.g. AWS Certified Solutions Architect':'e.g. Infosys — Full Stack Developer Assessment'}/>
              <Err msg={errors.title}/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:13 }}>
              <div><FL req>Target College</FL>
                <FSelect value={form.college} onChange={e=>setF('college',e.target.value)} err={errors.college}>
                  <option value="">Select college…</option>{COLLEGES.map(c=><option key={c}>{c}</option>)}
                </FSelect><Err msg={errors.college}/></div>
              <div><FL req>Batch Year</FL>
                <FSelect value={form.batchYear} onChange={e=>setF('batchYear',e.target.value)} err={errors.batchYear}>
                  <option value="">Select batch…</option>{BATCH_YEARS.map(y=><option key={y}>{y}</option>)}
                </FSelect><Err msg={errors.batchYear}/></div>
              {isU&&(<>
                <div><FL req>Department</FL>
                  <FSelect value={form.department} onChange={e=>setF('department',e.target.value)} err={errors.department}>
                    <option value="">Select department…</option>{DEPARTMENTS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                  </FSelect><Err msg={errors.department}/></div>
                <div><FL req>Semester</FL>
                  <FSelect value={form.semester} onChange={e=>setF('semester',e.target.value)} err={errors.semester}>
                    <option value="">Select semester…</option>{SEMESTERS.map(s=><option key={s} value={s}>Semester {s}</option>)}
                  </FSelect><Err msg={errors.semester}/></div>
                <div><FL>Subject Code</FL><FInput value={form.subjectCode} onChange={e=>setF('subjectCode',e.target.value)} placeholder="e.g. CS3401"/></div>
                <div><FL req>Subject Name</FL><FInput value={form.subjectName} onChange={e=>setF('subjectName',e.target.value)} err={errors.subjectName} placeholder="e.g. Operating Systems"/><Err msg={errors.subjectName}/></div>
                <div><FL>Exam Name / Type</FL><FInput value={form.examName} onChange={e=>setF('examName',e.target.value)} placeholder="e.g. Mid Term I, End Semester"/></div>
              </>)}
              <div><FL req>Start Date &amp; Time</FL><FInput type="datetime-local" value={form.startDate} onChange={e=>setF('startDate',e.target.value)} err={errors.startDate}/><Err msg={errors.startDate}/></div>
              <div><FL req>End Date &amp; Time</FL><FInput type="datetime-local" value={form.endDate} onChange={e=>setF('endDate',e.target.value)} err={errors.endDate}/><Err msg={errors.endDate}/></div>
              <div><FL req>Duration (minutes)</FL><FInput type="number" min="1" value={form.duration} onChange={e=>setF('duration',e.target.value)} err={errors.duration} placeholder="e.g. 90"/><Err msg={errors.duration}/></div>
              {!isU&&!isSC&&<>
                <div>
                  <FL>MCQ Cutoff (%) <span style={{fontWeight:400,color:G.dim}}>(optional)</span></FL>
                  <FInput type="number" min="0" max="100" value={form.cutoffScore} onChange={e=>setF('cutoffScore',e.target.value)} placeholder="Leave blank = all continue"/>
                  <div style={{ fontSize:10.5,color:G.dim,marginTop:3 }}>Students below this % won't advance to Round 2. <span style={{color:G.green,fontWeight:600}}>Blank = no cutoff.</span></div>
                </div>
                <div><FL>Pass Mark / Total Marks</FL>
                  <div style={{ display:'flex',gap:8 }}>
                    <FInput type="number" value={form.passMark}   onChange={e=>setF('passMark',e.target.value)}   placeholder="Pass"/>
                    <FInput type="number" value={form.totalMarks} onChange={e=>setF('totalMarks',e.target.value)} placeholder="Total"/>
                  </div>
                </div>
              </>}
            </div>
            <div><FL>Instructions / Description</FL>
              <textarea className="f-input" value={form.description} onChange={e=>setF('description',e.target.value)} rows={3} placeholder="Add special instructions for students…" style={{ resize:'vertical',fontFamily:'inherit' }}/>
            </div>
          </div>
        </Panel>

        {/* ── Skill Cert Settings ── */}
        {isSC&&(
          <Panel num="2" title="Certification Settings" color={TT.primary}>
            <div style={{ background:G.greenBg,border:`1px solid ${G.greenBorder}`,borderRadius:8,padding:'10px 13px',marginBottom:16,display:'flex',gap:8,fontSize:12,color:'#065f46' }}>
              <Svg d={PATHS.spark} size={13} color={G.green}/>
              AI generates questions via LangChain + Cohere. Offline fallback for Oracle Java, AWS, GCP certifications.
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:13 }}>
              <div style={{ gridColumn:'1/-1' }}><FL req>Certification Name</FL>
                <FInput value={scCfg.certName} onChange={e=>setScCfg(p=>({...p,certName:e.target.value}))} err={errors.skillCertName} placeholder="e.g. AWS Certified Solutions Architect – Associate"/>
                <div style={{ fontSize:10.5,color:G.dim,marginTop:3 }}>Must match the official certification title exactly.</div><Err msg={errors.skillCertName}/></div>
              <div><FL>Certification Provider</FL><FInput value={scCfg.certProvider} onChange={e=>setScCfg(p=>({...p,certProvider:e.target.value}))} placeholder="e.g. Amazon Web Services"/></div>
              <div><FL req>Number of Questions</FL><FInput type="number" min="10" max="50" value={scCfg.questionCount} onChange={e=>setScCfg(p=>({...p,questionCount:e.target.value}))} err={errors.skillCertQ}/><Err msg={errors.skillCertQ}/></div>
              <div><FL req>Duration (minutes)</FL><FInput type="number" min="15" value={scCfg.durationMinutes} onChange={e=>setScCfg(p=>({...p,durationMinutes:e.target.value}))} err={errors.skillCertD}/><Err msg={errors.skillCertD}/></div>
              <div><FL>Passing Score (%)</FL><FInput type="number" min="1" max="100" value={scCfg.passingScore} onChange={e=>setScCfg(p=>({...p,passingScore:e.target.value}))}/></div>
            </div>
            <div style={{ marginTop:18 }}>
              <FL>Difficulty Distribution (%)</FL>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:11,marginTop:8 }}>
                {diffCols.map(d=>(
                  <div key={d.key} className="diff-box" style={{ background:d.bg,borderColor:d.border }}>
                    <div style={{ fontSize:11.5,fontWeight:700,color:d.color,marginBottom:7 }}>{d.label}</div>
                    <input type="number" min="0" max="100" className="f-input" value={scCfg.difficulty[d.key]} onChange={e=>setScCfg(p=>({...p,difficulty:{...p.difficulty,[d.key]:e.target.value}}))}
                      style={{ textAlign:'center',fontWeight:800,fontSize:20,padding:'6px',borderColor:d.border }}/>
                    <div style={{ fontSize:10,color:d.color,marginTop:5,fontWeight:600 }}>% of questions</div>
                  </div>
                ))}
              </div>
              <Err msg={errors.skillCertDiff} style={{marginTop:6}}/>
            </div>
            <div style={{ marginTop:16,display:'flex',flexDirection:'column',gap:9 }}>
              {[{key:'allowRetake',l:'Allow Retake',d:'Students may retake this certification exam'},{key:'generateBadge',l:'Generate Score Badge',d:'Passing students receive a badge on their profile'}].map(o=>(
                <div key={o.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',background:'#f8fafc',borderRadius:9,border:`1px solid ${G.border}` }}>
                  <div><div style={{ fontSize:13,fontWeight:600,color:'#1e3a8a' }}>{o.l}</div><div style={{ fontSize:11,color:G.dim,marginTop:1 }}>{o.d}</div></div>
                  <Tog on={scCfg[o.key]} color={TT.primary} toggle={()=>setScCfg(p=>({...p,[o.key]:!p[o.key]}))} size={40}/>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ── University Sections ── */}
        {isU&&(
          <Panel num="2" title="Question Sections &amp; PDF Upload" color={TT.primary}>
            <div style={{ background:G.amberBg,border:`1px solid ${G.amberBorder}`,borderRadius:8,padding:'9px 13px',marginBottom:14,display:'flex',gap:8,fontSize:12,color:'#92400e' }}>
              <Svg d={PATHS.info} size={13} color={G.amber}/>
              Upload PDF question banks — the system parses, randomizes, and generates unique papers per student.
            </div>
            <Err msg={errors.sections} style={{marginBottom:10}}/>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <SecBlock enabled={univSec.mcq} toggle={()=>setUnivSec(p=>({...p,mcq:!p.mcq}))} color="#2563eb" bg="#eff6ff" border="#bfdbfe" label="MCQ" sublabel="Multiple Choice Questions"
                config={univSec.mcq&&<div style={{display:'flex',gap:8}}><MiniF label="Questions" value={form.mcqCount} onChange={v=>setF('mcqCount',v)}/><MiniF label="Marks Each" value={form.mcqMarks} onChange={v=>setF('mcqMarks',v)}/><MiniF label="Time (min)" value={form.mcqMinutes} onChange={v=>setF('mcqMinutes',v)}/></div>}>
                {univSec.mcq&&<div style={{ borderTop:'1px solid #bfdbfe',padding:'12px 14px',background:'#fff' }}>
                  <PdfZone file={mcqPdf?{name:mcqPdf.name,size:(mcqPdf.size/1024).toFixed(1)+' KB'}:null} onFile={f=>addUnivPdf('mcq',f)} onRemove={()=>setMcqPdf(null)} color="#2563eb" bg="#eff6ff" border="#bfdbfe" error={errors.mcqPdf} hint="PDF format · Questions numbered · Options labeled A B C D"/>
                  <Err msg={errors.mcqPdf} style={{marginTop:5}}/>
                </div>}
              </SecBlock>
              <SecBlock enabled={univSec.written} toggle={()=>setUnivSec(p=>({...p,written:!p.written}))} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" label="Written / 8-Mark" sublabel="Short answer, long answer, descriptive"
                config={univSec.written&&<div style={{display:'flex',gap:8}}><MiniF label="Questions" value={form.writtenCount} onChange={v=>setF('writtenCount',v)}/><MiniF label="Marks Each" value={form.writtenMarks} onChange={v=>setF('writtenMarks',v)}/><MiniF label="Time (min)" value={form.writtenMinutes} onChange={v=>setF('writtenMinutes',v)}/></div>}>
                {univSec.written&&<div style={{ borderTop:'1px solid #ddd6fe',padding:'12px 14px',background:'#fff' }}>
                  <PdfZone file={writtenPdf?{name:writtenPdf.name,size:(writtenPdf.size/1024).toFixed(1)+' KB'}:null} onFile={f=>addUnivPdf('written',f)} onRemove={()=>setWrittenPdf(null)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" error={errors.writtenPdf} hint="PDF format · Each question per line · Marks noted"/>
                  <Err msg={errors.writtenPdf} style={{marginTop:5}}/>
                </div>}
              </SecBlock>
            </div>
            {(univSec.mcq||univSec.written)&&(
              <div style={{ marginTop:12,padding:'11px 16px',background: TT.gradSoft,border:`1px solid ${TT.border}`,borderRadius:9,display:'flex',gap:18,alignItems:'center',flexWrap:'wrap' }}>
                <span style={{ fontSize:11,fontWeight:700,color:G.dim }}>MARKS BREAKDOWN</span>
                {univSec.mcq&&<span style={{ fontSize:12,color:'#1e3a8a' }}><strong style={{color:'#2563eb'}}>{form.mcqCount} MCQ</strong> × {form.mcqMarks} = <strong>{+form.mcqCount * +form.mcqMarks} marks</strong></span>}
                {univSec.written&&<span style={{ fontSize:12,color:'#1e3a8a' }}><strong style={{color:'#7c3aed'}}>{form.writtenCount} Written</strong> × {form.writtenMarks} = <strong>{+form.writtenCount * +form.writtenMarks} marks</strong></span>}
                <span style={{ marginLeft:'auto',fontSize:13,fontWeight:800,color:'#1e3a8a' }}>Total: {(univSec.mcq?+form.mcqCount*+form.mcqMarks:0)+(univSec.written?+form.writtenCount*+form.writtenMarks:0)} marks</span>
              </div>
            )}
          </Panel>
        )}

        {/* ── Placement Sections ── */}
        {!isU&&!isSC&&(
          <Panel num="2" title="Exam Sections &amp; Question PDFs" color={TT.primary}>
            <div style={{ background:G.amberBg,border:`1px solid ${G.amberBorder}`,borderRadius:8,padding:'9px 13px',marginBottom:14,display:'flex',gap:8,fontSize:12,color:'#92400e' }}>
              <Svg d={PATHS.info} size={13} color={G.amber}/>
              {fromRequest?'Pattern from recruiter — sections pre-selected below.':'Enable sections you want. Upload PDF per section, or auto-load from question bank by language.'}
            </div>
            <Err msg={errors.sections} style={{marginBottom:9}}/>
            <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
              {Object.entries(PLACEMENT_SECTIONS).map(([key,meta])=>{
                const on=!!sections[key]; const cfg=secCfg[key]||{}; const pv=pdfPrev[key];
                return (
                  <div key={key} className="sec-block" style={{ borderColor:on?meta.border:'#e2e8f0',background:on?meta.bg+'55':'#f8fafc' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',flexWrap:'wrap',gap:9 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                        <Tog on={on} color={meta.color} toggle={()=>setSections(p=>({...p,[key]:!p[key]}))}/>
                        <SectionBadge label={meta.label} on={on} color={meta.color} bg={meta.bg} border={meta.border}/>
                        {reqSec[key]?.enabled&&<span style={{ fontSize:9.5,color:G.green,fontWeight:700,background:G.greenBg,padding:'2px 7px',borderRadius:20,border:`1px solid ${G.greenBorder}` }}>from request</span>}
                      </div>
                      {on&&<div style={{ display:'flex',gap:8 }}>
                        <MiniF label="Questions" value={cfg.questions||''} onChange={v=>setSecCfg(p=>({...p,[key]:{...p[key],questions:v}}))}/>
                        <MiniF label="Minutes"   value={cfg.minutes||''}   onChange={v=>setSecCfg(p=>({...p,[key]:{...p[key],minutes:v}}))}/>
                      </div>}
                    </div>
                    {on&&<div style={{ borderTop:`1px solid ${meta.border}`,padding:'11px 14px',background:'#fff' }}>
                      <div style={{ fontSize:11.5,fontWeight:700,color:'#1e3a8a',marginBottom:8,display:'flex',alignItems:'center',gap:5 }}>
                        <Svg d={PATHS.file} size={11} color={meta.color}/> Question Bank PDF
                        <span style={{ fontSize:10,fontWeight:400,color:G.dim }}>(optional — auto-loads from bank if blank)</span>
                      </div>
                      <PdfZone file={pdfFiles[key]?{name:pv?.name,size:pv?.size}:null} onFile={f=>addPdf(key,f)} onRemove={()=>rmPdf(key)} color={meta.color} bg={meta.bg} border={meta.border} hint="PDF format only"/>
                    </div>}
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* ── Adaptive MCQ ── */}
        {!isU&&!isSC&&sections.mcq&&(
          <Panel num="3" title="Adaptive MCQ Configuration" color={TT.primary}>
            <div style={{ background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'9px 13px',marginBottom:13,display:'flex',gap:8,fontSize:12,color:'#1e40af' }}>
              <Svg d={PATHS.spark} size={13} color="#2563eb"/>
              <div><strong>Adaptive Engine:</strong> First question is medium difficulty. Correct → hard; Incorrect → easy. Personalized sequence per student.</div>
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#f8fafc',borderRadius:9,border:`1px solid ${G.border}`,marginBottom:14 }}>
              <div><div style={{ fontSize:13,fontWeight:600,color:'#1e3a8a' }}>Enable Adaptive MCQ</div><div style={{ fontSize:11,color:G.dim,marginTop:1 }}>Questions adapt to each student's real-time performance</div></div>
              <Tog on={adaptiveMcq} color={TT.primary} toggle={()=>setAdaptive(v=>!v)} size={40}/>
            </div>
            {adaptiveMcq&&<>
              <FL>Question Pool Distribution (%)</FL>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:11,marginTop:8 }}>
                {diffCols.map(d=>(
                  <div key={d.key} className="diff-box" style={{ background:d.bg,borderColor:d.border }}>
                    <div style={{ fontSize:11.5,fontWeight:700,color:d.color,marginBottom:7 }}>{d.label}</div>
                    <input type="number" min="0" max="100" className="f-input" value={mcqDiff[d.key]} onChange={e=>setMcqDiff(p=>({...p,[d.key]:e.target.value}))}
                      style={{ textAlign:'center',fontWeight:800,fontSize:20,padding:'6px',borderColor:d.border }}/>
                    <div style={{ fontSize:10,color:d.color,marginTop:5,fontWeight:600 }}>% of questions</div>
                  </div>
                ))}
              </div>
              <Err msg={errors.mcqDiff} style={{marginTop:8}}/>
            </>}
          </Panel>
        )}

        {/* ── Languages ── */}
        {!isU&&!isSC&&(
          <Panel num={sections.mcq?"4":"3"} title="Allowed Programming Languages" color={TT.primary}>
            <div style={{ background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'9px 13px',marginBottom:13,display:'flex',gap:8,fontSize:12,color:'#1e40af' }}>
              <Svg d={PATHS.db} size={13} color="#2563eb"/>
              Languages selected here are used to match questions from the bank when no PDF is uploaded.
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:7 }}>
              {LANGUAGES.map(l=>{
                const on=form.languages.includes(l);
                return (
                  <button key={l} onClick={()=>toggleLang(l)}
                    style={{ padding:'7px 15px',borderRadius:20,border:`1.5px solid ${on?TT.primary:G.borderSoft}`,background:on?TT.primary+'18':'#f8fafc',color:on?TT.primary:G.dim,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.14s',display:'flex',alignItems:'center',gap:5 }}>
                    {on&&<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={TT.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {l}
                  </button>
                );
              })}
            </div>
            <Err msg={errors.languages} style={{marginTop:8}}/>
          </Panel>
        )}

        {/* ── Sectional Cutoffs ── */}
        {!isU&&!isSC&&enabledSecs.length>1&&(
          <Panel num={sections.mcq?"5":"4"} title="Sectional Cutoff" color={TT.primary}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:cutoffEnabled?13:0 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:600,color:'#1e3a8a' }}>Require minimum score per section</div>
                {requestData?.sectional_cutoff_required&&<div style={{ fontSize:11,color:G.green,marginTop:2 }}>Required by recruiter</div>}
              </div>
              <Tog on={cutoffEnabled} color={TT.primary} toggle={()=>setCutoffEnabled(v=>!v)} size={40}/>
            </div>
            {cutoffEnabled&&(
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:11 }}>
                {enabledSecs.map(([key])=>{ const m=PLACEMENT_SECTIONS[key]; return (
                  <div key={key}>
                    <div style={{ fontSize:10.5,fontWeight:700,color:m.color,marginBottom:6 }}>{m.label} (%)</div>
                    <div style={{ position:'relative' }}>
                      <FInput type="number" min="0" max="100" value={cutoffs[key]||''} onChange={e=>setCutoffs(p=>({...p,[key]:e.target.value}))} placeholder="0–100" style={{ borderColor:m.border,paddingRight:26 }}/>
                      <span style={{ position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',fontSize:11,color:G.dim,fontWeight:600 }}>%</span>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </Panel>
        )}

        {/* ── Info note ── */}
        <div style={{ background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'14px 16px',marginBottom:20,display:'flex',flexDirection:'column',gap:11 }}>
          {(isU?[
            {d:PATHS.key,   t:'Unique exam key per student',     s:'Each enrolled student receives a unique, single-use exam key.'},
            {d:PATHS.shuffle,t:'Randomized question paper',      s:'Questions shuffled uniquely per student from uploaded PDFs.'},
            {d:PATHS.users, t:'Deployed to enrolled students',   s:'All students matching college, batch, department, semester receive it.'},
          ]:isSC?[
            {d:PATHS.spark, t:'AI-Generated Questions',          s:'Questions generated by LangChain + Cohere based on certification name.'},
            {d:PATHS.award, t:'Instant Certification',           s:'Students receive certificates and badges upon passing.'},
            {d:PATHS.lock,  t:'Proctored Environment',           s:'Face detection, eye gaze tracking, and tab-switch monitoring enabled.'},
          ]:[
            {d:PATHS.key,  t:'Per-Student Unique Exam Keys',     s:'Each eligible student receives a unique, single-use exam key via email.'},
            {d:PATHS.mail, t:'Automatic Email Notification',     s:'Students get an email with their key and exam instructions.'},
            {d:PATHS.db,   t:'Question Bank Fallback',           s:'If no PDF uploaded, questions auto-loaded from bank by selected languages.'},
          ]).map(({d,t,s})=>(
            <div key={t} style={{ display:'flex',gap:10,alignItems:'flex-start' }}>
              <div style={{ width:32,height:32,borderRadius:8,background:'#e0f2fe',border:'1px solid #bae6fd',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Svg d={d} size={14} color="#0369a1"/></div>
              <div><div style={{ fontSize:12.5,fontWeight:700,color:'#0369a1' }}>{t}</div><div style={{ fontSize:11.5,color:G.dim,marginTop:2,lineHeight:1.5 }}>{s}</div></div>
            </div>
          ))}
        </div>

        {/* ── Submit ── */}
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',paddingBottom:48,alignItems:'center' }}>
          <button className="btn btn-ghost" onClick={()=>fromRequest?navigate(-1):setExamType(null)}>Cancel</button>
          <button className="btn btn-lg" disabled={submitting} onClick={handleSubmit}
            style={{ background: submitting?'#e2e8f0':TT?.grad, color: submitting?G.dim:'#fff', border:'none', boxShadow: submitting?'none':`0 4px 14px ${TT?.primary}44`, cursor: submitting?'not-allowed':'pointer', fontWeight:800 }}>
            <Svg d={isU?PATHS.send:isSC?PATHS.award:PATHS.mail} size={15} color="currentColor"/>
            {submitting?'Creating…':isU?'Create & Publish University Exam':isSC?'Create Certification Exam':'Create Exam & Send Keys to Students'}
          </button>
        </div>
      </div>
    </Wrap>
  );
}
