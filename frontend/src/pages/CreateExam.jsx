import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ExamsSidebar from '../components/ExamsSidebar';

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
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#c4b5fd',
  teal: '#0891b2', tealBg: '#f0f9ff', tealBd: '#bae6fd',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box}
.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:28px 24px}
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px}
.ap-title{font-size:22px;font-weight:800;color:${C.navy};margin:0 0 4px;letter-spacing:-0.3px}
.ap-sub{font-size:13px;color:${C.inkSub};margin:0}
.breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:18px;font-size:12px;color:${C.inkMuted}}
.breadcrumb-link{color:${C.blue};cursor:pointer;font-weight:500}
.breadcrumb-link:hover{text-decoration:underline}
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-submit{display:inline-flex;align-items:center;gap:7px;padding:11px 28px;background:${C.navy};color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:700;font-family:${C.font};cursor:pointer;transition:all .15s;box-shadow:0 4px 14px rgba(15,31,61,.25)}
.btn-submit:hover{background:#162d55;transform:translateY(-1px);box-shadow:0 6px 18px rgba(15,31,61,.3)}
.btn-submit:disabled{background:${C.border};color:${C.inkMuted};cursor:not-allowed;transform:none;box-shadow:none}
.btn-view-exams{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;font-family:${C.font};cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(37,99,235,.22);white-space:nowrap;flex-shrink:0}
.btn-view-exams:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 14px rgba(37,99,235,.32)}
.btn-view-exams .ve-dot{width:7px;height:7px;border-radius:50%;background:${C.green};box-shadow:0 0 0 2px rgba(5,150,105,.3);flex-shrink:0}
.panel{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);margin-bottom:16px;overflow:hidden}
.panel-hdr{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.panel-num{width:26px;height:26px;border-radius:50%;background:${C.blue};color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.panel-title{font-size:13.5px;font-weight:700;color:${C.navy};flex:1}
.panel-badge{font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:99px;background:${C.blueLt};color:${C.blue};border:1px solid ${C.blueBd}}
.panel-body{padding:20px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fld{display:flex;flex-direction:column;gap:5px}
.fld-lbl{font-size:11.5px;font-weight:700;color:${C.inkMid}}
.fld-inp{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;transition:all .15s;width:100%}
.fld-inp:focus{border-color:${C.blue};background:${C.surface};box-shadow:0 0 0 3px rgba(37,99,235,.07)}
.fld-inp.err{border-color:${C.red};background:${C.redBg}}
.fld-err{font-size:11px;color:${C.red};margin-top:3px;display:flex;align-items:center;gap:4px}
.auto-marks{padding:10px 14px;background:${C.greenBg};border:1.5px solid ${C.greenBd};border-radius:8px;display:flex;align-items:center;justify-content:space-between}
.purpose-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.purpose-card{padding:16px;border-radius:10px;cursor:pointer;border:2px solid ${C.border};background:${C.surface};transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.purpose-card:hover{border-color:${C.blueBd};background:${C.blueLt}}
.purpose-card.active{border-color:${C.blue};background:${C.blueLt}}
.purpose-label{font-size:13px;font-weight:700;color:${C.ink}}
.purpose-card.active .purpose-label{color:${C.blue}}
.purpose-desc{font-size:11px;color:${C.inkMuted};line-height:1.4}
.qb-list{display:flex;flex-direction:column;gap:8px}
.qb-item{padding:14px 18px;border-radius:10px;cursor:pointer;border:1.5px solid ${C.border};background:${C.surface};transition:all .15s;display:flex;align-items:flex-start;gap:14px}
.qb-item:hover{border-color:${C.blueBd};background:${C.blueLt}}
.qb-item.active{border-color:${C.blue};background:${C.blueLt}}
.qb-radio{width:20px;height:20px;border-radius:50%;border:2px solid ${C.borderMid};background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all .15s}
.qb-item.active .qb-radio{border-color:${C.blue};background:${C.blue}}
.type-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid}
.section-row{border:1.5px solid ${C.border};border-radius:10px;overflow:hidden;transition:all .18s;margin-bottom:8px}
.section-row.active{border-color:${C.blueBd};background:rgba(239,246,255,.3)}
.section-main{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;flex-wrap:wrap;gap:10px}
.section-lang{border-top:1px solid ${C.border};padding:10px 16px;background:${C.surface}}
.tog{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}
.tog input{opacity:0;width:0;height:0;position:absolute}
.tog-sl{position:absolute;cursor:pointer;inset:0;background:${C.borderMid};border-radius:22px;transition:.2s}
.tog-sl::before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
input:checked+.tog-sl{background:${C.blue}}
input:checked+.tog-sl::before{transform:translateX(18px)}
.stepper{display:flex;align-items:center;gap:8px}
.stepper-btn{width:26px;height:26px;border-radius:5px;border:1.5px solid ${C.border};background:${C.surface};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:${C.inkMid};transition:all .12s;flex-shrink:0}
.stepper-btn:hover{background:${C.hover};border-color:${C.borderMid}}
.stepper-inp{width:52px;text-align:center;border:1.5px solid ${C.border};border-radius:6px;padding:4px;font-size:14px;font-weight:700;font-family:${C.mono};color:${C.ink};background:${C.surface};outline:none}
.diff-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
.diff-card{border-radius:12px;padding:16px 14px;text-align:center;border:1.5px solid}
.allot-summary{padding:10px 16px;background:${C.blueLt};border:1px solid ${C.blueBd};border-radius:8px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:12px}
.info-hint{padding:10px 14px;background:${C.blueLt};border:1px solid ${C.blueBd};border-radius:8px;font-size:12px;color:${C.blue};line-height:1.6;margin-bottom:14px}
.submit-row{display:flex;gap:10px;justify-content:flex-end;padding-bottom:48px}
.err-box{padding:12px 16px;background:${C.redBg};border:1px solid ${C.redBd};border-radius:8px;font-size:13px;color:${C.red};margin-bottom:16px}
.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ce-spin .7s linear infinite;display:inline-block}
@keyframes ce-spin{to{transform:rotate(360deg)}}
.success-wrap{max-width:540px;margin:0 auto}
.success-card{background:${C.surface};border-radius:14px;border:1px solid ${C.border};box-shadow:0 4px 24px rgba(15,31,61,.1);overflow:hidden}
.success-banner{padding:32px 32px 44px;text-align:center;background:linear-gradient(135deg,${C.navy},${C.blue})}
.mono{font-family:${C.mono}}
.theory-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${C.subtle};border-radius:10px;border:1px solid ${C.border};margin-bottom:18px}
.theory-info-hint{padding:10px 14px;background:${C.purpleBg};border:1px solid ${C.purpleBd};border-radius:8px;font-size:12px;color:${C.purple};line-height:1.6;margin-bottom:14px;display:flex;gap:10px;align-items:flex-start}
`;

const QB_COLORS = {
  mcq:      { color: C.blue,   bg: C.blueLt,   border: C.blueBd   },
  sql:      { color: C.purple, bg: C.purpleBg,  border: C.purpleBd },
  coding:   { color: C.amber,  bg: C.amberBg,   border: C.amberBd  },
  aptitude: { color: C.teal,   bg: C.tealBg,    border: C.tealBd   },
  verbal:   { color: '#db2777',bg: '#fdf2f8',   border: '#fbcfe8'  },
  theory:   { color: '#7c3aed',bg: '#f5f3ff',   border: '#ddd6fe'  },
};

const EXAM_TYPE_BADGE = {
  placement:           { color: C.blue,  bg: C.blueLt,  border: C.blueBd,  label: 'Placement'     },
  hiring:              { color: C.blue,  bg: C.blueLt,  border: C.blueBd,  label: 'Hiring'        },
  general:             { color: C.inkSub,bg: C.subtle,  border: C.border,  label: 'General'       },
  university:          { color: C.teal,  bg: C.tealBg,  border: C.tealBd,  label: 'University'    },
  academic:            { color: C.teal,  bg: C.tealBg,  border: C.tealBd,  label: 'University'    },
  skill_cert:          { color: C.green, bg: C.greenBg, border: C.greenBd, label: 'Certification' },
  skill_certification: { color: C.green, bg: C.greenBg, border: C.greenBd, label: 'Certification' },
  certification:       { color: C.green, bg: C.greenBg, border: C.greenBd, label: 'Certification' },
};

const EXAM_PURPOSES = [
  { key: 'placement',    label: 'Placement / Hiring',    dbValue: 'placement',  desc: 'Campus drives, off-campus hiring assessments',        showTypes: ['placement','hiring','general'],                   iconKey: 'briefcase',   iconColor: C.blue  },
  { key: 'certification',label: 'Skill Certification',   dbValue: 'skill_cert', desc: 'Skill certifications, professional badges',            showTypes: ['skill_cert','skill_certification','certification'], iconKey: 'award',       iconColor: C.green },
  { key: 'university',   label: 'University / Internal', dbValue: 'university', desc: 'Academic exams, semester and internal assessments',    showTypes: ['university','academic'],                          iconKey: 'mortarboard', iconColor: C.teal  },
];

const THEORY_MARKS = [
  { key: 'two',  label: '2 Mark',   marks: 2,  color: C.teal,   bg: C.tealBg,   border: C.tealBd,   desc: 'Short answer / define' },
  { key: 'five', label: '5 Mark',   marks: 5,  color: C.purple, bg: C.purpleBg, border: C.purpleBd, desc: 'Explain / elaborate'   },
  { key: 'ten',  label: '10 Mark',  marks: 10, color: C.amber,  bg: C.amberBg,  border: C.amberBd,  desc: 'Essay / long answer'   },
  { key: 'part', label: 'Part-A/B', marks: 3,  color: C.green,  bg: C.greenBg,  border: C.greenBd,  desc: 'Structured / parts'    },
];

const COLLEGES    = ['RMKEC','RMDEC','RMKCET'];
const BATCH_YEARS = ['2023','2024','2025','2026','2027','2028'];
const CODING_LANGS= ['Python','Java','JavaScript','C','C++','TypeScript','Go','Kotlin'];

const IC = {
  send:        'M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z',
  check:       'M20 6L9 17L4 12',
  arrow:       'M5 12h14M12 5l7 7-7 7',
  info:        'M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z',
  list:        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  briefcase:   'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
  award:       'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  mortarboard: 'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5',
  lightbulb:   'M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.62-1.38 4.92-3.46 6.22L15 17H9l-.54-1.78C6.38 13.92 5 11.62 5 9a7 7 0 0 1 7-7z',
  book:        'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  zap:         'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  sparkles:    'M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
};

const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

function Toggle({ on, onToggle }) {
  return (
    <label className="tog">
      <input type="checkbox" checked={on} onChange={onToggle} />
      <span className="tog-sl" />
    </label>
  );
}

function TypeChip({ type }) {
  const m = QB_COLORS[(type || '').toLowerCase()] || { color: C.inkSub, bg: C.subtle, border: C.border };
  return <span className="type-chip" style={{ color: m.color, background: m.bg, borderColor: m.border }}>{(type || '').toLowerCase() === 'theory' ? 'THEORY' : (type || '').toUpperCase()}</span>;
}

function ExamTypeBadge({ type }) {
  const m = EXAM_TYPE_BADGE[(type || 'general').toLowerCase()] || EXAM_TYPE_BADGE.general;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{m.label}</span>;
}

function Panel({ num, title, badge, badgeColor, children }) {
  return (
    <div className="panel">
      <div className="panel-hdr">
        <span className="panel-num">{num}</span>
        <span className="panel-title">{title}</span>
        {badge && <span className="panel-badge" style={badgeColor ? { background: badgeColor.bg, color: badgeColor.color, borderColor: badgeColor.border } : {}}>{badge}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

function FErr({ msg }) {
  return msg ? <span className="fld-err"><Ic d={IC.info} size={12} color={C.red} />{msg}</span> : null;
}

function TheoryMarkPanel({ num, theoryMarkOn, setTheoryMarkOn, theoryMarkDist, setTheoryMarkDist, theoryBankCount }) {
  const totalQ = THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0), 0);
  const totalM = THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0) * m.marks, 0);
  function adj(key, delta) { setTheoryMarkDist(p => ({ ...p, [key]: Math.max(0, (p[key] || 0) + delta) })); }
  return (
    <Panel num={num} title="Theory Section — Mark Distribution" badge="AI-scored" badgeColor={{ bg: C.purpleBg, color: C.purple, border: C.purpleBd }}>
      <div className="theory-toggle-row">
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Custom mark distribution</div>
          <div style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 2 }}>When ON — set exact question counts per mark slot. When OFF — all theory questions carry equal weight.</div>
        </div>
        <Toggle on={theoryMarkOn} onToggle={() => setTheoryMarkOn(v => !v)} />
      </div>
      {theoryMarkOn ? (
        <>
          <div className="theory-info-hint">
            <Ic d={IC.sparkles} size={15} color={C.purple} sw={1.8} />
            <div>Theory answers are <strong>AI-scored</strong> using key points. Total marks auto-calculate from these slots.{theoryBankCount > 0 && <span style={{ color: C.inkSub }}> ({theoryBankCount} theory questions in bank)</span>}</div>
          </div>
          <div className="diff-grid">
            {THEORY_MARKS.map(m => {
              const val = theoryMarkDist[m.key] || 0;
              return (
                <div key={m.key} className="diff-card" style={{ background: m.bg, borderColor: m.border }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: C.inkMuted, marginBottom: 12, lineHeight: 1.4 }}>{m.desc}</div>
                  <div className="stepper" style={{ justifyContent: 'center' }}>
                    <button className="stepper-btn" style={{ borderColor: m.border, color: m.color }} onClick={() => adj(m.key, -1)}>−</button>
                    <input type="number" min={0} max={999} value={val} className="stepper-inp" style={{ borderColor: m.border, color: m.color, fontSize: 20, fontWeight: 800, width: 58 }} onChange={e => setTheoryMarkDist(p => ({ ...p, [m.key]: Math.max(0, parseInt(e.target.value) || 0) }))} />
                    <button className="stepper-btn" style={{ borderColor: m.border, color: m.color }} onClick={() => adj(m.key, 1)}>+</button>
                  </div>
                  <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 6 }}>questions</div>
                  <div style={{ marginTop: 8, padding: '4px 10px', background: C.surface, borderRadius: 6, border: `1px solid ${m.border}`, fontSize: 11.5, fontWeight: 700, color: m.color, fontFamily: C.mono }}>{val * m.marks} marks</div>
                </div>
              );
            })}
          </div>
          <div className="allot-summary">
            <span style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted }}>THEORY TOTAL:</span>
            {THEORY_MARKS.filter(m => (theoryMarkDist[m.key] || 0) > 0).map(m => (
              <span key={m.key} style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{theoryMarkDist[m.key]}×{m.label}</span>
            ))}
            {totalQ === 0 && <span style={{ fontSize: 12, color: C.inkMuted }}>No questions configured yet</span>}
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: C.purple, fontFamily: C.mono }}>{totalQ} questions · {totalM} marks</span>
          </div>
        </>
      ) : (
        <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: C.purpleBg, border: `1.5px solid ${C.purpleBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic d={IC.book} size={22} color={C.purple} sw={1.6} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Equal weight — all {theoryBankCount || 0} theory questions allotted</div>
            <div style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 2 }}>Marks are taken directly from each question's mark value in the question bank.</div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function SuccessPage({ exam, navigate, onOpenSidebar }) {
  return (
    <div className="success-wrap">
      <div className="success-card">
        <div className="success-banner">
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Ic d={IC.check} size={28} color="#fff" sw={2.5} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Exam Created Successfully</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.82)', lineHeight: 1.6 }}>Students have been assigned and notified via email.</div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ background: C.blueLt, border: `1px solid ${C.blueBd}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.blue, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 12 }}>Exam Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Title', exam.title], ['College', exam.college], ['Batch', exam.batchYear], ['Duration', `${exam.duration} min`], ['Total Marks', exam.total_marks || '—'], ['Students', exam.student_count || 0]].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600 }}>{k}</div><div style={{ fontSize: 12.5, color: C.ink, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => navigate('/admin-dashboard')} className="btn-sec" style={{ flex: 1 }}>Dashboard</button>
            <button onClick={onOpenSidebar} className="btn-view-exams" style={{ flex: 2 }}>
              <span className="ve-dot" /><Ic d={IC.list} size={13} color="#fff" />View All Exams
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auto total marks calculation ─────────────────────────────────────────────
function calcAutoMarks(sectEnabled, allotment, adaptiveOn, adaptTotal, theoryMarkOn, theoryMarkDist) {
  let total = 0;
  for (const [type, on] of Object.entries(sectEnabled)) {
    if (!on) continue;
    if (type === 'mcq')    total += (adaptiveOn ? adaptTotal : (allotment.mcq || 0)) * 1;
    if (type === 'sql')    total += (allotment.sql || 0) * 2;
    if (type === 'theory') {
      if (theoryMarkOn) {
        total += THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0) * m.marks, 0);
      }
    }
  }
  return total;
}

export default function CreateExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const preselect = location.state?.preselectedSession || null;

  const [sidebarOpen,     setSidebarOpen]  = useState(false);
  const [qbSessions,      setQBSessions]   = useState([]);
  const [loadingQB,       setLoadingQB]    = useState(true);
  const [selectedSession, setSession]      = useState(null);
  const [sessionDetail,   setDetail]       = useState(null);
  const [loadingDetail,   setLoadingDetail]= useState(false);
  const [selectedPurpose, setPurpose]      = useState('placement');

  const [form, setForm] = useState({
    title: '', college: '', batchYear: '',
    startDate: '', endDate: '', duration: '60',
    description: '', codingLanguages: ['Python', 'Java'],
  });
  const [allotment,     setAllotment]    = useState({});
  const [sectEnabled,   setSectEnabled]  = useState({});
  const [adaptiveOn,    setAdaptiveOn]   = useState(true);
  const [adaptCounts,   setAdaptCounts]  = useState({ easy: 10, medium: 15, hard: 5 });
  const [cutoffEnabled, setCutoffEnabled]= useState(false);
  const [cutoffs,       setCutoffs]      = useState({});
  const [overallCutoff, setOverallCutoff]= useState('');
  const [theoryMarkOn,  setTheoryMarkOn] = useState(true);
  const [theoryMarkDist,setTheoryMarkDist]=useState({ two: 3, five: 4, ten: 2, part: 1 });

  const [errors,      setErrors]    = useState({});
  const [submitting,  setSubmitting] = useState(false);
  const [submitted,   setSubmitted]  = useState(false);
  const [createdExam, setCreatedExam]= useState(null);

  const setF = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);
  const purposeCfg = EXAM_PURPOSES.find(p => p.key === selectedPurpose) || EXAM_PURPOSES[0];
  const filteredQB = qbSessions.filter(s => purposeCfg.showTypes.includes((s.examType || 'placement').toLowerCase().trim()));

  const mcqAvail       = (sessionDetail?.totalByType || []).find(t => t.type === 'mcq')?.count    || 0;
  const theoryBankCount= (sessionDetail?.totalByType || []).find(t => t.type === 'theory')?.count || 0;
  const adaptTotal     = adaptiveOn ? (adaptCounts.easy + adaptCounts.medium + adaptCounts.hard) : (allotment.mcq || 0);

  const autoTotalMarks = calcAutoMarks(sectEnabled, allotment, adaptiveOn, adaptTotal, theoryMarkOn, theoryMarkDist);

  useEffect(() => {
    fetch(`${API}/question-bank/exam-names`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setQBSessions(d.qbSessions || []); setLoadingQB(false); })
      .catch(() => setLoadingQB(false));
  }, []);

  useEffect(() => {
    if (preselect && qbSessions.length > 0) {
      const f = qbSessions.find(s => s.sessionCode === preselect.sessionCode);
      if (f) {
        const matchPurpose = EXAM_PURPOSES.find(p => p.showTypes.includes((f.examType || 'placement').toLowerCase()));
        if (matchPurpose) setPurpose(matchPurpose.key);
        handleSelectSession(f);
      }
    }
  }, [preselect, qbSessions]);

  useEffect(() => {
    if (selectedSession && !purposeCfg.showTypes.includes((selectedSession.examType || 'placement').toLowerCase())) {
      setSession(null); setDetail(null); setAllotment({}); setSectEnabled({});
    }
  }, [selectedPurpose]);

  async function handleSelectSession(s) {
    setSession(s); setF('title', s.examName); setLoadingDetail(true);
    try {
      const res  = await fetch(`${API}/question-bank/sessions/${s.sessionCode}`, { headers: authHeader() });
      const data = await res.json();
      setDetail(data);
      const newA = {}, newE = {};
      if (data.totalByType) {
        data.totalByType.forEach(({ type, count }) => {
          newA[type] = Math.min(count, type === 'theory' ? count : 10);
          newE[type] = true;
        });
      }
      setAllotment(newA); setSectEnabled(newE);
      if (newA.mcq) {
        const t = newA.mcq;
        setAdaptCounts({ easy: Math.round(t * .3), medium: Math.round(t * .5), hard: Math.round(t * .2) });
      }
      if (newA.theory) {
        const tc = newA.theory;
        setTheoryMarkDist({ two: Math.max(1, Math.round(tc * 0.3)), five: Math.max(1, Math.round(tc * 0.4)), ten: Math.max(0, Math.round(tc * 0.2)), part: Math.max(0, Math.round(tc * 0.1)) });
      }
    } catch (err) { console.error('Session detail error:', err); }
    setLoadingDetail(false);
  }

  function validate() {
    const e = {};
    if (!selectedSession)                      e.qbSession = 'Select a Question Bank';
    if (!form.title.trim())                    e.title     = 'Exam title required';
    if (!form.college)                         e.college   = 'Select a college';
    if (!form.batchYear)                       e.batchYear = 'Select a batch year';
    if (!form.startDate)                       e.startDate = 'Start date required';
    if (!form.endDate)                         e.endDate   = 'End date required';
    if (!form.duration || +form.duration <= 0) e.duration  = 'Duration required';
    if (Object.entries(sectEnabled).filter(([, v]) => v).length === 0) e.sections = 'Enable at least one section';
    if (adaptiveOn && sectEnabled.mcq && adaptTotal > mcqAvail) e.adaptive = `Total (${adaptTotal}) exceeds available MCQ (${mcqAvail})`;
    if (sectEnabled.theory && theoryMarkOn && THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0), 0) === 0) e.theory = 'Set at least one theory question in mark distribution';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const sectionConfig = {};
      Object.entries(sectEnabled).forEach(([type, enabled]) => {
        if (!enabled) return;
        const isTheory = type === 'theory';
        const qCount   = (type === 'mcq' && adaptiveOn) ? adaptTotal : isTheory ? (theoryMarkOn ? THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0), 0) : theoryBankCount) : (allotment[type] || 5);
        sectionConfig[type] = { questions: qCount, minutes: isTheory ? 60 : 20, ...(isTheory ? { type: 'theory', markDistribution: true } : {}) };
      });

      let mcqDiff = { easy: 30, medium: 50, hard: 20 };
      if (adaptiveOn && adaptTotal > 0) {
        mcqDiff = {
          easy:   Math.round((adaptCounts.easy   / adaptTotal) * 100),
          medium: Math.round((adaptCounts.medium / adaptTotal) * 100),
          hard:   100 - Math.round((adaptCounts.easy / adaptTotal) * 100) - Math.round((adaptCounts.medium / adaptTotal) * 100),
        };
      }

      const body = {
        exam_type:                  purposeCfg.dbValue,
        title:                      form.title,
        college:                    form.college,
        batch_year:                 form.batchYear,
        start_date:                 form.startDate,
        end_date:                   form.endDate,
        duration_minutes:           form.duration,
        description:                form.description,
        sections:                   JSON.stringify(Object.fromEntries(Object.entries(sectEnabled).filter(([, v]) => v).map(([k]) => [k, true]))),
        section_config:             JSON.stringify(sectionConfig),
        adaptive_mcq:               adaptiveOn ? 1 : 0,
        mcq_difficulty:             JSON.stringify(mcqDiff),
        adaptive_counts:            JSON.stringify(adaptCounts),
        cutoff_enabled:             cutoffEnabled ? 1 : 0,
        cutoffs:                    JSON.stringify(cutoffs),
        cutoff_score:               overallCutoff || '',
        question_bank_session_code: selectedSession.sessionCode,
        allowed_languages:          JSON.stringify(form.codingLanguages),
        exam_request_id:            selectedSession.examRequestId || '',
        has_theory:                 sectEnabled.theory ? 1 : 0,
        university_exam:            selectedPurpose === 'university' ? 1 : 0,
        theory_mark_on:             sectEnabled.theory && theoryMarkOn ? 1 : 0,
        theory_mark_distribution:   JSON.stringify(sectEnabled.theory && theoryMarkOn ? theoryMarkDist : null),
      };

      const res  = await fetch(`${API}/exams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Exam creation failed');

      setCreatedExam({ ...data, title: form.title, college: form.college, batchYear: form.batchYear, duration: form.duration });
      setSubmitted(true);
    } catch (err) { setErrors({ submit: err.message }); }
    finally { setSubmitting(false); }
  }

  let panelNum = 0;
  const nextNum = () => { panelNum++; return panelNum; };

  if (submitted && createdExam) {
    return (
      <div className="ap"><style>{G}</style><Sidebar /><Navbar />
        <ExamsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="ap-main" style={{ paddingTop: 40 }}>
          <SuccessPage exam={createdExam} navigate={navigate} onOpenSidebar={() => setSidebarOpen(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className="ap"><style>{G}</style><Sidebar /><Navbar />
      <ExamsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="ap-main">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div className="breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate('/admin-dashboard')}>Dashboard</span>
            <span>›</span>
            <span style={{ fontWeight: 600, color: C.inkMid }}>Create Exam</span>
          </div>

          <div className="ap-hdr">
            <div>
              <h1 className="ap-title">Create Exam</h1>
              <p className="ap-sub">Select exam purpose, choose a Question Bank, configure sections and deploy.</p>
            </div>
            <button className="btn-view-exams" onClick={() => setSidebarOpen(true)}>
              <span className="ve-dot" /><Ic d={IC.list} size={13} color="#fff" />View All Exams
            </button>
          </div>

          {/* Panel 1: Purpose */}
          <Panel num={nextNum()} title="Select Exam Purpose">
            <div className="purpose-grid">
              {EXAM_PURPOSES.map(p => {
                const active = selectedPurpose === p.key;
                return (
                  <div key={p.key} className={`purpose-card${active ? ' active' : ''}`} onClick={() => setPurpose(p.key)}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: active ? C.blueLt : C.hover, border: `1.5px solid ${active ? C.blueBd : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                      <Ic d={IC[p.iconKey]} size={20} color={active ? p.iconColor : C.inkSub} sw={1.8} />
                    </div>
                    <div className="purpose-label">{p.label}</div>
                    <div className="purpose-desc">{p.desc}</div>
                    {active && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: C.blue, color: '#fff' }}>Selected</span>}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Panel 2: Question Bank */}
          <Panel num={nextNum()} title="Select Question Bank" badge={`${filteredQB.length} available for ${purposeCfg.label}`}>
            {loadingQB ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: C.inkMuted, fontSize: 13 }}>Loading question banks…</div>
            ) : filteredQB.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: C.hover, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Ic d={IC[purposeCfg.iconKey]} size={24} color={C.inkMuted} sw={1.6} />
                </div>
                <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 6 }}>No <strong>{purposeCfg.label}</strong> Question Banks found.</div>
                <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 14, lineHeight: 1.6 }}>
                  {qbSessions.length > 0 ? `${qbSessions.length} Question Bank${qbSessions.length > 1 ? 's' : ''} exist but none are categorised as ${purposeCfg.label}.` : 'No Question Banks have been generated yet.'}
                </div>
                {selectedPurpose === 'university' && (
                  <div style={{ fontSize: 12, color: '#0891b2', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'left', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Ic d={IC.lightbulb} size={16} color="#0891b2" sw={1.8} />
                    <div><strong>To create a University Question Bank:</strong><br />Go to <strong>Question Bank → NeuroGenerate AI</strong> → select <strong>University / Internal</strong> → configure Theory + MCQ agents → Generate &amp; Save.</div>
                  </div>
                )}
                {selectedPurpose === 'certification' && (
                  <div style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'left', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Ic d={IC.zap} size={16} color="#059669" sw={1.8} />
                    <div><strong>To create a Certification Question Bank:</strong><br />Go to <strong>Question Bank → NeuroGenerate AI</strong> → select <strong>Skill Certification</strong> → Generate &amp; Save.</div>
                  </div>
                )}
                {selectedPurpose === 'placement' && (
                  <div style={{ fontSize: 12, color: C.blue, background: C.blueLt, border: `1px solid ${C.blueBd}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'left', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Ic d={IC.briefcase} size={16} color={C.blue} sw={1.8} />
                    <div><strong>To create a Placement Question Bank:</strong><br />Go to <strong>Question Bank → NeuroGenerate AI</strong> → select <strong>Placement / Hiring</strong> → Generate &amp; Save.</div>
                  </div>
                )}
                <button className="btn-pri" onClick={() => navigate('/question-bank')}>Go to Question Bank<Ic d={IC.arrow} size={13} color="#fff" /></button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: C.inkMuted, marginBottom: 12 }}>Showing <strong>{filteredQB.length}</strong> Question Bank{filteredQB.length !== 1 ? 's' : ''} for <strong>{purposeCfg.label}</strong>.</div>
                <div className="qb-list">
                  {filteredQB.map(s => {
                    const active = selectedSession?.sessionCode === s.sessionCode;
                    return (
                      <div key={s.sessionCode} className={`qb-item${active ? ' active' : ''}`} onClick={() => handleSelectSession(s)}>
                        <div className="qb-radio">{active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                            <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: active ? C.blue : C.navy, background: C.blueLt, padding: '2px 8px', borderRadius: 4 }}>{s.sessionCode}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? C.blue : C.ink }}>{s.examName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <ExamTypeBadge type={s.examType || 'placement'} />
                            {(s.types || []).map(t => <TypeChip key={t} type={t} />)}
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{s.totalQuestions} questions</span>
                            {s.topicsSummary && <span style={{ fontSize: 11, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>· {s.topicsSummary}</span>}
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: C.inkMuted, flexShrink: 0 }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—'}</div>
                      </div>
                    );
                  })}
                </div>
                <FErr msg={errors.qbSession} />
              </>
            )}
          </Panel>

          {/* Panel 3: Question Allotment */}
          {selectedSession && (
            <Panel num={nextNum()} title="Question Allotment per Section">
              <div className="info-hint">
                <strong>Question Bank has {selectedSession.totalQuestions} questions.</strong> Set how many to allot per student — system randomises per student.
                {selectedPurpose === 'university' && <span style={{ color: '#0891b2' }}> Theory questions are AI-scored using key points.</span>}
              </div>
              {loadingDetail ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: C.inkMuted, fontSize: 12 }}>Loading question breakdown…</div>
              ) : sessionDetail?.totalByType?.length > 0 ? (
                <div>
                  {sessionDetail.totalByType.map(({ type, count }) => {
                    const on = !!sectEnabled[type], allot = allotment[type] || 1;
                    const m  = QB_COLORS[type.toLowerCase()] || { color: C.inkSub, bg: C.subtle, border: C.border };
                    const isTheory = type === 'theory';
                    return (
                      <div key={type} className={`section-row${on ? ' active' : ''}`}>
                        <div className="section-main">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Toggle on={on} onToggle={() => setSectEnabled(p => ({ ...p, [type]: !p[type] }))} />
                            <TypeChip type={type} />
                            <span style={{ fontSize: 12, color: C.inkMuted }}>{count} in bank</span>
                            {isTheory && on && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '1px 7px' }}>AI-scored</span>}
                            {isTheory && on && theoryMarkOn && <span style={{ fontSize: 10, color: C.teal, fontWeight: 600, background: C.tealBg, border: `1px solid ${C.tealBd}`, borderRadius: 99, padding: '1px 7px' }}>Mark dist. on</span>}
                          </div>
                          {on && (
                            <div className="stepper">
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.inkMid }}>{isTheory ? 'All' : 'Allot:'}</span>
                              {isTheory ? (
                                <span style={{ fontSize: 14, fontWeight: 800, color: m.color, fontFamily: C.mono, minWidth: 32, textAlign: 'center' }}>{count}</span>
                              ) : (
                                <>
                                  <button className="stepper-btn" onClick={() => setAllotment(p => ({ ...p, [type]: Math.max(1, (p[type] || 1) - 1) }))} style={{ borderColor: m.border, color: m.color }}>−</button>
                                  <input type="number" min={1} max={count} value={allot} className="stepper-inp" style={{ borderColor: m.border, color: m.color }} onChange={e => setAllotment(p => ({ ...p, [type]: Math.max(1, Math.min(count, parseInt(e.target.value) || 1)) }))} />
                                  <button className="stepper-btn" onClick={() => setAllotment(p => ({ ...p, [type]: Math.min(count, (p[type] || 1) + 1) }))} style={{ borderColor: m.border, color: m.color }}>+</button>
                                  <span style={{ fontSize: 11, color: C.inkMuted }}>/ {count}</span>
                                  {allot < count && <span style={{ fontSize: 10, color: C.green, fontWeight: 600, background: C.greenBg, padding: '2px 7px', borderRadius: 99, border: `1px solid ${C.greenBd}` }}>Randomised</span>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {on && type === 'coding' && (
                          <div className="section-lang">
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.inkMid, marginBottom: 6 }}>Allowed Languages</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {CODING_LANGS.map(l => {
                                const ac = form.codingLanguages.includes(l);
                                return <button key={l} onClick={() => setF('codingLanguages', ac ? form.codingLanguages.filter(x => x !== l) : [...form.codingLanguages, l])} style={{ padding: '3px 11px', borderRadius: 99, fontSize: 11.5, border: `1px solid ${ac ? C.blueBd : C.border}`, background: ac ? C.blueLt : C.surface, color: ac ? C.blue : C.inkMuted, fontWeight: ac ? 700 : 400, cursor: 'pointer' }}>{l}</button>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <FErr msg={errors.sections} />
                  {Object.entries(sectEnabled).some(([, v]) => v) && (
                    <div className="allot-summary">
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted }}>STUDENT GETS:</span>
                      {Object.entries(sectEnabled).filter(([, v]) => v).map(([type]) => (
                        <span key={type} style={{ fontSize: 12, color: C.ink }}>
                          <strong style={{ color: QB_COLORS[type]?.color || C.blue }}>
                            {type === 'mcq' && adaptiveOn ? adaptTotal : type === 'theory' ? (theoryMarkOn ? THEORY_MARKS.reduce((s, m) => s + (theoryMarkDist[m.key] || 0), 0) : (allotment[type] || (sessionDetail?.totalByType?.find(t => t.type === 'theory')?.count || 0))) : (allotment[type] || 0)} {type.toUpperCase()}
                          </strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.inkMuted, padding: '16px 0' }}>No question breakdown available.</div>
              )}
            </Panel>
          )}

          {/* Panel 4: Theory Mark Distribution */}
          {sectEnabled.theory && (
            <>
              <TheoryMarkPanel num={nextNum()} theoryMarkOn={theoryMarkOn} setTheoryMarkOn={setTheoryMarkOn} theoryMarkDist={theoryMarkDist} setTheoryMarkDist={setTheoryMarkDist} theoryBankCount={theoryBankCount} />
              <FErr msg={errors.theory} />
            </>
          )}

          {/* Panel 5: Exam Details — no pass mark, auto total marks */}
          <Panel num={nextNum()} title="Exam Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fld">
                <label className="fld-lbl">Exam Title *</label>
                <input className={`fld-inp${errors.title ? ' err' : ''}`} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Computer Networks — Internal Exam 2026" />
                <FErr msg={errors.title} />
              </div>
              <div className="grid-2">
                <div className="fld">
                  <label className="fld-lbl">Target College *</label>
                  <select className={`fld-inp${errors.college ? ' err' : ''}`} value={form.college} onChange={e => setF('college', e.target.value)}>
                    <option value="">Select college…</option>
                    {COLLEGES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <FErr msg={errors.college} />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Batch Year *</label>
                  <select className={`fld-inp${errors.batchYear ? ' err' : ''}`} value={form.batchYear} onChange={e => setF('batchYear', e.target.value)}>
                    <option value="">Select batch…</option>
                    {BATCH_YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                  <FErr msg={errors.batchYear} />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Start Date &amp; Time *</label>
                  <input type="datetime-local" className={`fld-inp${errors.startDate ? ' err' : ''}`} value={form.startDate} onChange={e => setF('startDate', e.target.value)} />
                  <FErr msg={errors.startDate} />
                </div>
                <div className="fld">
                  <label className="fld-lbl">End Date &amp; Time *</label>
                  <input type="datetime-local" className={`fld-inp${errors.endDate ? ' err' : ''}`} value={form.endDate} onChange={e => setF('endDate', e.target.value)} />
                  <FErr msg={errors.endDate} />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Duration (minutes) *</label>
                  <input type="number" min="1" className={`fld-inp${errors.duration ? ' err' : ''}`} value={form.duration} onChange={e => setF('duration', e.target.value)} />
                  <FErr msg={errors.duration} />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Total Marks (auto-calculated)</label>
                  <div className="auto-marks">
                    <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>MCQ×1 + SQL×2 + Theory (per question mark)</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.green, fontFamily: C.mono }}>{autoTotalMarks || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="fld">
                <label className="fld-lbl">Instructions / Description</label>
                <textarea rows={3} className="fld-inp" style={{ resize: 'vertical' }} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Add exam instructions for students…" />
              </div>
            </div>
          </Panel>

          {/* Panel 6: Adaptive MCQ */}
          {sectEnabled.mcq && (
            <Panel num={nextNum()} title="Adaptive Questioning — MCQ">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.subtle, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: adaptiveOn ? 18 : 0 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Adaptive Questioning</div>
                  <div style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 2 }}>When ON — select exact counts per difficulty level. When OFF — questions are randomly picked.</div>
                </div>
                <Toggle on={adaptiveOn} onToggle={() => setAdaptiveOn(v => !v)} />
              </div>
              {adaptiveOn && (
                <>
                  <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 14, lineHeight: 1.6 }}>Available in bank: <strong style={{ color: C.blue }}>{mcqAvail} MCQ questions</strong></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                    {[{ key: 'easy', label: 'Easy', color: C.green, bg: C.greenBg, border: C.greenBd, desc: 'Fundamental recall' }, { key: 'medium', label: 'Medium', color: C.amber, bg: C.amberBg, border: C.amberBd, desc: 'Applied understanding' }, { key: 'hard', label: 'Hard', color: C.red, bg: C.redBg, border: C.redBd, desc: 'Analytical reasoning' }].map(d => {
                      const val = adaptCounts[d.key];
                      return (
                        <div key={d.key} className="diff-card" style={{ background: d.bg, borderColor: d.border }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: d.color, marginBottom: 2 }}>{d.label}</div>
                          <div style={{ fontSize: 10, color: C.inkMuted, marginBottom: 10, lineHeight: 1.4 }}>{d.desc}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <button onClick={() => setAdaptCounts(p => ({ ...p, [d.key]: Math.max(0, p[d.key] - 1) }))} className="stepper-btn" style={{ borderColor: d.border, color: d.color }}>−</button>
                            <input type="number" min={0} max={mcqAvail} value={val} onChange={e => setAdaptCounts(p => ({ ...p, [d.key]: Math.max(0, Math.min(mcqAvail, parseInt(e.target.value) || 0)) }))} className="stepper-inp" style={{ width: 54, fontSize: 20, fontWeight: 800, borderColor: d.border, color: d.color }} />
                            <button onClick={() => setAdaptCounts(p => ({ ...p, [d.key]: Math.min(mcqAvail, p[d.key] + 1) }))} className="stepper-btn" style={{ borderColor: d.border, color: d.color }}>+</button>
                          </div>
                          <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 6 }}>questions</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="allot-summary">
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted }}>TOTAL MCQ:</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: adaptTotal > mcqAvail ? C.red : C.blue, fontFamily: C.mono }}>{adaptTotal}</span>
                    {[{ l: 'Easy', v: adaptCounts.easy, c: C.green }, { l: 'Medium', v: adaptCounts.medium, c: C.amber }, { l: 'Hard', v: adaptCounts.hard, c: C.red }].map(d => (
                      <span key={d.l} style={{ fontSize: 12, color: d.c, fontWeight: 600 }}>{d.l}: {d.v}{adaptTotal > 0 && <span style={{ fontSize: 10, color: C.inkMuted, fontWeight: 400 }}> ({Math.round((d.v / adaptTotal) * 100)}%)</span>}</span>
                    ))}
                    {adaptTotal > mcqAvail && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.red, fontWeight: 600 }}>Exceeds {mcqAvail} available</span>}
                    {adaptTotal <= mcqAvail && adaptTotal > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.green, fontWeight: 600 }}>Within pool size</span>}
                  </div>
                  <FErr msg={errors.adaptive} />
                </>
              )}
            </Panel>
          )}

          {/* Panel 7: Sectional Cutoffs */}
          <Panel num={nextNum()} title="Sectional Cutoffs">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cutoffEnabled ? 16 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Require minimum score per section</div>
                <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>Students below cutoff in any section will not advance</div>
              </div>
              <Toggle on={cutoffEnabled} onToggle={() => setCutoffEnabled(v => !v)} />
            </div>
            {cutoffEnabled && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 11, marginBottom: 14 }}>
                  {Object.entries(sectEnabled).filter(([, v]) => v).map(([type]) => {
                    const m = QB_COLORS[type] || { color: C.inkSub, bg: C.subtle, border: C.border };
                    return (
                      <div key={type}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: m.color, marginBottom: 6, textTransform: 'uppercase' }}>{type} (%)</div>
                        <input type="number" min="0" max="100" value={cutoffs[type] || ''} onChange={e => setCutoffs(p => ({ ...p, [type]: e.target.value }))} placeholder="0–100" className="fld-inp" style={{ textAlign: 'center', fontWeight: 800, fontSize: 18, borderColor: m.border, background: m.bg, color: m.color }} />
                      </div>
                    );
                  })}
                </div>
                <div className="fld" style={{ maxWidth: 220 }}>
                  <label className="fld-lbl">Overall Cutoff (%) <span style={{ color: C.inkMuted, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input type="number" min="0" max="100" value={overallCutoff} onChange={e => setOverallCutoff(e.target.value)} placeholder="Leave blank = no cutoff" className="fld-inp" />
                </div>
              </>
            )}
          </Panel>

          {errors.submit && <div className="err-box">{errors.submit}</div>}

          <div className="submit-row">
            <button className="btn-sec" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner" />Creating…</> : <><Ic d={IC.send} size={14} color="#fff" />Create Exam &amp; Notify Students</>}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}


