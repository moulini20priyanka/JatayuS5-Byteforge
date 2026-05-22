
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API_BASE = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';

function getAuthHeader() {
  const keys = ['token', 'authToken', 'auth_token', 'access_token', 'jwt', 'adminToken'];
  for (const k of keys) {
    const t = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (t) return { Authorization: `Bearer ${t}` };
  }
  return {};
}

const NOTIF_TEMPLATE_KEYS = ['recruiter_signup', 'exam_request'];
const NOTIF_META = {
  recruiter_signup: { navigatesTo: '/admin/recruiter-approvals', example: 'Samson from Virtusa (samson@virtusa.com) signed up and is awaiting approval.' },
  exam_request:     { navigatesTo: '/admin/exam-requests',       example: 'John (Acme Corp) submitted a new Placement exam request for "Backend Developer".' },
};

const VAR_GROUPS = {
  platform: { label: 'Platform', vars: [{ name: '{{platform_name}}' },{ name: '{{year}}' },{ name: '{{login_url}}' },{ name: '{{exam_url}}' },{ name: '{{admin_name}}' }] },
  student:  { label: 'Student',  vars: [{ name: '{{student_name}}' },{ name: '{{student_email}}' },{ name: '{{temp_password}}' }] },
  exam:     { label: 'Exam',     vars: [{ name: '{{exam_key}}' },{ name: '{{exam_title}}' },{ name: '{{exam_role}}' },{ name: '{{exam_duration}}' },{ name: '{{exam_date}}' },{ name: '{{exam_time}}' }] },
  recruiter:{ label: 'Recruiter',vars: [{ name: '{{recruiter_name}}' },{ name: '{{recruiter_email}}' },{ name: '{{recruiter_company}}' },{ name: '{{signup_time}}' },{ name: '{{submitted_time}}' },{ name: '{{approvals_url}}' },{ name: '{{exam_requests_url}}' }] },
};
const VAR_SETS = { email: ['platform','student','exam'], notif: ['platform','recruiter','exam'], custom: ['platform','student','exam','recruiter'] };

const PROCTOR_TOGGLES = [
  { id: 'webcam',       label: 'Require Webcam',               desc: 'Candidates must have an active webcam during the exam' },
  { id: 'tabSwitch',    label: 'Tab Switch Detection',          desc: 'Alert when candidate switches to another tab or window' },
  { id: 'fullscreen',   label: 'Force Fullscreen Mode',         desc: 'Force fullscreen and detect if candidate exits' },
  { id: 'copyPaste',    label: 'Disable Copy and Paste',        desc: 'Prevent copying or pasting text during exam' },
  { id: 'audioMonitor', label: 'Audio Monitoring',              desc: 'Monitor ambient sounds for suspicious activity' },
  { id: 'aiDetection',  label: 'AI-Based Behaviour Detection',  desc: 'Use AI to detect suspicious eye movement and behaviour' },
];
const EXAM_TOGGLES = [
  { id: 'multipleAttempts', label: 'Allow Multiple Attempts',     desc: 'Candidates can retake the exam if they fail' },
  { id: 'autoTerminate',    label: 'Auto-Terminate on High Risk',  desc: 'Automatically end exam when risk score exceeds threshold' },
  { id: 'emailAlerts',      label: 'Email Alerts for High Risk',   desc: 'Receive email when a candidate is flagged as high risk' },
  { id: 'resultEmail',      label: 'Email Results to Candidates',  desc: 'Automatically email exam results after completion' },
];

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box}
.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:32px 36px}
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px}
.ap-title{font-size:22px;font-weight:800;color:${C.navy};margin:0 0 4px;letter-spacing:-0.3px}
.ap-sub{font-size:13px;color:${C.inkSub};margin:0}
.sw{max-width:860px}
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-ghost{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:${C.inkSub};border:1px solid ${C.border};border-radius:7px;font-size:12px;font-weight:500;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-ghost:hover{background:${C.hover};color:${C.inkMid}}
.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:${C.redBg};color:${C.red};border:1px solid ${C.redBd};border-radius:8px;font-size:12px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-danger:hover{background:#fee2e2}
.btn-create{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
.btn-create:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.tabs{display:flex;gap:2px;margin-bottom:24px;background:${C.border};padding:3px;border-radius:11px;border:1px solid ${C.borderMid}}
.tab{flex:1;padding:9px 6px;border:none;background:none;border-radius:8px;font-size:12.5px;font-weight:600;color:${C.inkSub};cursor:pointer;transition:all .15s;white-space:nowrap;font-family:${C.font}}
.tab:hover{color:${C.inkMid};background:rgba(255,255,255,.5)}
.tab.active{background:${C.surface};color:${C.blue};box-shadow:0 1px 6px rgba(15,31,61,.1)}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden;margin-bottom:18px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13.5px;font-weight:700;color:${C.navy}}
.card-body{padding:20px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fld{display:flex;flex-direction:column;gap:5px}
.fld-lbl{font-size:11.5px;font-weight:700;color:${C.inkMid};letter-spacing:.02em}
.fld-sub{font-size:11px;color:${C.inkMuted};font-weight:400}
.fld-inp{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;transition:all .15s;width:100%}
.fld-inp:focus{border-color:${C.blue};background:${C.surface};box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.fld-ta{padding:11px 13px;border:1.5px solid ${C.border};border-radius:8px;font-size:12px;color:${C.ink};background:${C.subtle};font-family:${C.mono};resize:vertical;outline:none;transition:all .15s;line-height:1.65;width:100%}
.fld-ta:focus{border-color:${C.blue};background:${C.surface};box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.tpl-card{border:1.5px solid ${C.border};border-radius:12px;overflow:hidden;margin-bottom:12px;transition:box-shadow .15s}
.tpl-card:hover{box-shadow:0 3px 12px rgba(15,31,61,.08)}
.tpl-hdr{padding:13px 16px;background:${C.subtle};display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;transition:background .12s}
.tpl-hdr:hover{background:${C.hover}}
.tpl-title{font-size:13px;font-weight:700;color:${C.navy}}
.tpl-desc{font-size:11px;color:${C.inkSub};margin-top:2px}
.tpl-body{padding:18px;border-top:1.5px solid ${C.border};background:${C.surface}}
.var-section-lbl{font-size:10px;font-weight:700;color:${C.inkMuted};text-transform:uppercase;letter-spacing:.07em;margin-top:10px;margin-bottom:5px;display:block}
.var-palette{display:flex;flex-wrap:wrap;gap:5px}
.var-chip{background:${C.blueLt};border:1px solid ${C.blueBd};border-radius:6px;padding:3px 9px;font-size:10.5px;font-weight:600;color:${C.blue};font-family:${C.mono};cursor:pointer;transition:all .12s;user-select:none}
.var-chip:hover{background:${C.blueBd};transform:translateY(-1px)}
.notif-strip{background:${C.subtle};border:1.5px solid ${C.border};border-radius:10px;padding:12px 14px;margin-bottom:14px}
.notif-example{font-size:12px;color:${C.inkSub};font-style:italic;margin-top:7px;padding:8px 10px;background:${C.surface};border-radius:7px;border:1px solid ${C.border};line-height:1.6}
.active-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:10px 14px;background:${C.subtle};border-radius:9px;border:1px solid ${C.border}}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid ${C.border}}
.toggle-row:last-child{border-bottom:none}
.toggle-lbl{font-size:13px;font-weight:600;color:${C.navy};margin-bottom:2px}
.toggle-desc{font-size:12px;color:${C.inkSub}}
.tog{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}
.tog input{opacity:0;width:0;height:0;position:absolute}
.tog-sl{position:absolute;cursor:pointer;inset:0;background:${C.borderMid};border-radius:22px;transition:.2s}
.tog-sl::before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
input:checked+.tog-sl{background:${C.blue}}
input:checked+.tog-sl::before{transform:translateX(18px)}
.bdg-unsaved{background:${C.amberBg};color:${C.amber};font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid ${C.amberBd}}
.bdg-active{background:${C.greenBg};color:${C.green};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid ${C.greenBd}}
.bdg-inactive{background:${C.subtle};color:${C.inkSub};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid ${C.border}}
.bdg-new{background:${C.blueLt};color:${C.blue};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid ${C.blueBd}}
.save-row{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.row-between{display:flex;align-items:center;justify-content:space-between}
.hint{font-size:12px;color:${C.inkSub};line-height:1.6;margin-bottom:0}
.info-box{background:${C.blueLt};border:1.5px dashed ${C.blueBd};border-radius:10px;padding:13px 16px;margin-top:12px}
.info-box-title{font-size:13px;font-weight:700;color:${C.blue};margin-bottom:4px}
.info-box-body{font-size:12px;color:${C.inkSub};line-height:1.7}
.del-confirm{background:${C.redBg};border:1.5px solid ${C.redBd};border-radius:10px;padding:14px 16px;margin-top:14px}
.preview-modal{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.preview-inner{background:${C.surface};border-radius:16px;width:640px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.2)}
.preview-hdr{padding:16px 20px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;background:${C.subtle}}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-box{background:${C.surface};border-radius:16px;width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2)}
.modal-hdr{padding:20px 24px 16px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:${C.surface};z-index:1}
.modal-title{margin:0;font-size:16px;font-weight:800;color:${C.navy}}
.modal-bd{padding:20px 24px}
.modal-ft{padding:16px 24px;border-top:1px solid ${C.border};display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:${C.surface}}
.empty-state{padding:40px 32px;text-align:center;background:${C.surface};border-radius:12px;border:1.5px solid ${C.border}}
.mono{font-family:${C.mono}}
.spinner{width:30px;height:30px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
.spin-sm{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ap-spin .7s linear infinite}
.spin-dk{border:2px solid ${C.blueBd};border-top-color:${C.blue}}
@keyframes ap-spin{to{transform:rotate(360deg)}}
code{background:${C.blueLt};padding:1px 6px;border-radius:4px;font-size:11px;font-family:${C.mono}}
`;

// ── Icons ──────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const IC = {
  save:    "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  x:       "M18 6L6 18M6 6L18 18",
  plus:    "M12 5v14M5 12h14",
  trash:   "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  reset:   "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  user:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mail:    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  bell:    "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
};

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="tog">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="tog-sl" />
    </label>
  );
}

// ── Variable Palette ───────────────────────────────────────────────────────────
function VarPalette({ type, onInsert }) {
  const groups = (VAR_SETS[type] || VAR_SETS.custom).map(k => VAR_GROUPS[k]);
  return (
    <div>
      {groups.map(g => (
        <div key={g.label}>
          <span className="var-section-lbl">{g.label}</span>
          <div className="var-palette">
            {g.vars.map(v => (
              <span key={v.name} className="var-chip" onClick={() => onInsert && onInsert(v.name)}>{v.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────
function TemplateCard({ template, onSave, onDelete, saving, type }) {
  const [open,    setOpen]    = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body,    setBody]    = useState(template.body_html);
  const [active,  setActive]  = useState(template.is_active !== 0 && template.is_active !== false);
  const [preview, setPreview] = useState(false);
  const [delMode, setDelMode] = useState(false);
  const bodyRef = useRef(null);

  const dirty = subject !== template.subject || body !== template.body_html || active !== (template.is_active !== 0 && template.is_active !== false);
  const isNew = template._isNew;
  const meta  = NOTIF_META[template.template_key];

  function insertVar(v) {
    const el = bodyRef.current;
    if (!el) { setBody(b => b + v); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    setBody(body.slice(0, s) + v + body.slice(e));
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + v.length; el.focus(); }, 0);
  }

  return (
    <div className="tpl-card">
      <div className="tpl-hdr" onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tpl-title">{template.label}</div>
          <div className="tpl-desc">{template.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          {isNew  && <span className="bdg-new">New</span>}
          {dirty  && <span className="bdg-unsaved">Unsaved</span>}
          {active ? <span className="bdg-active">Active</span> : <span className="bdg-inactive">Inactive</span>}
          <span style={{ color: C.inkMuted, fontSize: 12, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="tpl-body">
          {meta && (
            <div className="notif-strip">
              <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSub, marginBottom: 4 }}>
                Navigates to: <span className="mono" style={{ color: C.blue, fontSize: 11 }}>{meta.navigatesTo}</span>
              </div>
              <div className="notif-example">
                <span style={{ fontSize: 10, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Example trigger</span><br />
                {meta.example}
              </div>
            </div>
          )}

          <div className="active-row">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>Template Active</div>
              <div style={{ fontSize: 12, color: C.inkSub }}>Inactive templates fall back to hardcoded HTML</div>
            </div>
            <Toggle checked={active} onChange={() => setActive(a => !a)} />
          </div>

          <div className="fld" style={{ marginBottom: 14 }}>
            <label className="fld-lbl">Email Subject</label>
            <input className="fld-inp" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="fld" style={{ marginBottom: 12 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <label className="fld-lbl">Email Body (HTML)</label>
              <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setPreview(true)}>
                <Ic d={IC.eye} size={12} color={C.inkSub} /> Preview
              </button>
            </div>
            <textarea ref={bodyRef} className="fld-ta" rows={14} value={body} onChange={e => setBody(e.target.value)} />
          </div>

          <div style={{ marginBottom: 16, padding: '12px 14px', background: C.subtle, borderRadius: 9, border: `1px solid ${C.border}` }}>
            <div className="fld-lbl" style={{ marginBottom: 6 }}>Click to insert variable at cursor position</div>
            <VarPalette type={type} onInsert={insertVar} />
          </div>

          <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setSubject(template.subject); setBody(template.body_html); setActive(template.is_active !== 0 && template.is_active !== false); setDelMode(false); }}>
                <Ic d={IC.reset} size={12} color={C.inkSub} /> Reset
              </button>
              {!isNew && (
                <button className="btn-danger" onClick={() => setDelMode(d => !d)}>
                  <Ic d={IC.trash} size={12} color={C.red} /> Delete
                </button>
              )}
            </div>
            <button className="btn-pri" disabled={!dirty || saving}
              onClick={() => onSave(template.template_key, { subject, body_html: body, is_active: active })}>
              {saving ? <span className="spin-sm" /> : <Ic d={IC.save} size={13} color="#fff" />}
              Save Template
            </button>
          </div>

          {delMode && !isNew && (
            <div className="del-confirm">
              <p style={{ fontSize: 13, color: C.red, margin: '0 0 10px', fontWeight: 600 }}>Delete this template permanently? The hardcoded fallback will be used instead.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-danger" onClick={() => onDelete(template.template_key)}><Ic d={IC.trash} size={12} color={C.red} />Yes, Delete</button>
                <button className="btn-ghost" onClick={() => setDelMode(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="preview-modal" onClick={() => setPreview(false)}>
          <div className="preview-inner" onClick={e => e.stopPropagation()}>
            <div className="preview-hdr">
              <span style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>Preview — {template.label}</span>
              <button className="btn-ghost" onClick={() => setPreview(false)}><Ic d={IC.x} size={13} color={C.inkSub} />Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <iframe srcDoc={body} style={{ width: '100%', height: '540px', border: 'none' }} title="Email Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Template Modal ──────────────────────────────────────────────────────
function CreateModal({ templateType, onClose, onCreate }) {
  const [form, setForm] = useState({ template_key: '', label: '', description: '', subject: '', body_html: '<p>Hello {{student_name}},</p>\n\n<p>Your message here.</p>\n', is_active: true });
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function insertVar(v) {
    const el = bodyRef.current;
    if (!el) { set('body_html', form.body_html + v); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    set('body_html', form.body_html.slice(0, s) + v + form.body_html.slice(e));
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + v.length; el.focus(); }, 0);
  }
  const valid = form.template_key.trim() && form.label.trim() && form.subject.trim() && form.body_html.trim();
  async function handleCreate() {
    if (!valid) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h2 className="modal-title">Create New {templateType === 'notif' ? 'Notification' : 'Email'} Template</h2>
          <button className="btn-ghost" onClick={onClose}><Ic d={IC.x} size={13} color={C.inkSub} /></button>
        </div>
        <div className="modal-bd">
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="fld">
              <label className="fld-lbl">Template Key <span style={{ color: C.red }}>*</span></label>
              <input className="fld-inp" placeholder="e.g. result_notification" value={form.template_key}
                onChange={e => set('template_key', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))} />
              <span style={{ fontSize: 11, color: C.inkMuted }}>Lowercase + underscores only</span>
            </div>
            <div className="fld">
              <label className="fld-lbl">Display Label <span style={{ color: C.red }}>*</span></label>
              <input className="fld-inp" placeholder="e.g. Exam Result Notification" value={form.label} onChange={e => set('label', e.target.value)} />
            </div>
            <div className="fld" style={{ gridColumn: '1/-1' }}>
              <label className="fld-lbl">Description</label>
              <input className="fld-inp" placeholder="When is this email sent? (shown in admin UI)" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="fld" style={{ gridColumn: '1/-1' }}>
              <label className="fld-lbl">Email Subject <span style={{ color: C.red }}>*</span></label>
              <input className="fld-inp" placeholder="e.g. Your Exam Result — {{exam_title}}" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
          </div>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label className="fld-lbl">Email Body (HTML) <span style={{ color: C.red }}>*</span></label>
            <textarea ref={bodyRef} className="fld-ta" rows={12} value={form.body_html} onChange={e => set('body_html', e.target.value)} />
          </div>
          <div style={{ marginBottom: 14, padding: '12px 14px', background: C.subtle, borderRadius: 9, border: `1px solid ${C.border}` }}>
            <div className="fld-lbl" style={{ marginBottom: 6 }}>Click to insert variable at cursor</div>
            <VarPalette type="custom" onInsert={insertVar} />
          </div>
          <div className="active-row">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>Active on creation</div>
              <div style={{ fontSize: 12, color: C.inkSub }}>Disable to save as a draft</div>
            </div>
            <Toggle checked={form.is_active} onChange={() => set('is_active', !form.is_active)} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-pri" disabled={!valid || saving} onClick={handleCreate}>
            {saving ? <span className="spin-sm" /> : <Ic d={IC.plus} size={13} color="#fff" />}
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings ──────────────────────────────────────────────────────────────
export default function Settings() {
  const { showToast } = useApp();
  const [activeTab,       setActiveTab]       = useState('account');
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [savingTpl,       setSavingTpl]       = useState(null);
  const [showCreateEmail, setShowCreateEmail] = useState(false);
  const [showCreateNotif, setShowCreateNotif] = useState(false);

  const [account,   setAccount]   = useState({ admin_name: '', admin_email: '', organization: '', platform_name: '', login_url: '', exam_url: '', approvals_url: '', exam_requests_url: '', new_password: '' });
  const [toggles,   setToggles]   = useState({ webcam: true, tabSwitch: true, fullscreen: true, copyPaste: true, audioMonitor: false, aiDetection: true, multipleAttempts: false, autoTerminate: false, emailAlerts: true, resultEmail: true });
  const [templates, setTemplates] = useState([]);

  const emailTemplates = templates.filter(t => !NOTIF_TEMPLATE_KEYS.includes(t.template_key));
  const notifTemplates = templates.filter(t =>  NOTIF_TEMPLATE_KEYS.includes(t.template_key));

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { settings, templates: tpls } = await res.json();
      setAccount({ admin_name: settings.admin_name||'', admin_email: settings.admin_email||'', organization: settings.organization||'', platform_name: settings.platform_name||'', login_url: settings.login_url||'', exam_url: settings.exam_url||'', approvals_url: settings.approvals_url||'', exam_requests_url: settings.exam_requests_url||'', new_password: '' });
      setToggles({ webcam: settings.webcam==='1', tabSwitch: settings.tabSwitch==='1', fullscreen: settings.fullscreen==='1', copyPaste: settings.copyPaste==='1', audioMonitor: settings.audioMonitor==='1', aiDetection: settings.aiDetection==='1', multipleAttempts: settings.multipleAttempts==='1', autoTerminate: settings.autoTerminate==='1', emailAlerts: settings.emailAlerts==='1', resultEmail: settings.resultEmail==='1' });
      setTemplates(tpls.map(r => ({ ...r, variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : (r.variables || []) })));
    } catch { showToast('Failed to load settings', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      const payload = { admin_name: account.admin_name, admin_email: account.admin_email, organization: account.organization, platform_name: account.platform_name, login_url: account.login_url, exam_url: account.exam_url, approvals_url: account.approvals_url, exam_requests_url: account.exam_requests_url };
      if (account.new_password?.trim()) payload.new_password = account.new_password;
      const res = await fetch(`${API_BASE}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('Account settings saved', 'success');
      setAccount(a => ({ ...a, new_password: '' }));
    } catch { showToast('Failed to save account settings', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveExam = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(toggles).map(([k, v]) => [k, v ? '1' : '0']));
      const res = await fetch(`${API_BASE}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('Exam settings saved', 'success');
    } catch { showToast('Failed to save exam settings', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveTemplate = async (key, { subject, body_html, is_active }) => {
    setSavingTpl(key);
    try {
      const res = await fetch(`${API_BASE}/settings/templates/${key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ subject, body_html, is_active }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates(prev => prev.map(t => t.template_key === key ? { ...t, subject, body_html, is_active } : t));
      showToast('Template saved', 'success');
    } catch { showToast('Failed to save template', 'error'); }
    finally { setSavingTpl(null); }
  };

  const handleDeleteTemplate = async (key) => {
    try {
      const res = await fetch(`${API_BASE}/settings/templates/${key}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates(prev => prev.filter(t => t.template_key !== key));
      showToast('Template deleted', 'success');
    } catch { showToast('Failed to delete template', 'error'); }
  };

  const handleCreateTemplate = async (form) => {
    try {
      const res = await fetch(`${API_BASE}/settings/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ ...form, variables: [] }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
      const { id } = await res.json();
      setTemplates(prev => [...prev, { ...form, id, variables: [], _isNew: true }]);
      setShowCreateEmail(false); setShowCreateNotif(false);
      showToast('Template created successfully', 'success');
    } catch (e) { showToast(e.message || 'Failed to create template', 'error'); }
  };

  const TABS = [
    { id: 'account', label: 'Admin Account', icon: IC.user },
    { id: 'email',   label: 'Email Templates', icon: IC.mail },
    { id: 'notif',   label: 'Notifications', icon: IC.bell },
    { id: 'exam',    label: 'Exam Settings', icon: IC.settings },
  ];

  if (loading) {
    return (
      <div className="ap">
        <style>{G}</style>
        <Sidebar /><Navbar />
        <main className="ap-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ marginBottom: 14 }} />
            <div style={{ fontSize: 14, color: C.inkSub }}>Loading settings…</div>
          </div>
        </main>
        <ToastContainer />
      </div>
    );
  }

  const accountFields = [
    { k:'admin_name',        l:'Admin Name',              t:'text',     sub:'', ph:'' },
    { k:'admin_email',       l:'Admin Email',             t:'email',    sub:'', ph:'' },
    { k:'organization',      l:'Organization',            t:'text',     sub:'', ph:'' },
    { k:'platform_name',     l:'Platform Name',           t:'text',     sub:'used in all emails', ph:'' },
    { k:'login_url',         l:'Student Login URL',       t:'url',      sub:'welcome email button', ph:'https://yourdomain.com/login' },
    { k:'exam_url',          l:'Exam Portal URL',         t:'url',      sub:'exam invitation button', ph:'https://yourdomain.com/exam' },
    { k:'approvals_url',     l:'Recruiter Approvals URL', t:'url',      sub:'approval alert button', ph:'' },
    { k:'exam_requests_url', l:'Exam Requests URL',       t:'url',      sub:'exam request alert button', ph:'' },
    { k:'new_password',      l:'New Password',            t:'password', sub:'leave blank to keep current', ph:'••••••••' },
  ];

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar /><Navbar />
      <main className="ap-main">
        <div className="ap-hdr">
          <div>
            <h1 className="ap-title">Settings</h1>
            <p className="ap-sub">Configure your platform, email templates, and exam behaviour</p>
          </div>
        </div>

        <div className="sw">
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Admin Account ── */}
          {activeTab === 'account' && (
            <div className="card">
              <div className="card-hdr"><span className="card-title">Admin Account</span></div>
              <div className="card-body">
                <p className="hint" style={{ marginBottom: 18 }}>
                  <strong>Platform Name</strong> appears in all emails. <strong>Student URLs</strong> are injected into student emails. <strong>Admin URLs</strong> are injected into notification emails sent to admins.
                </p>
                <div className="grid-2">
                  {accountFields.map(f => (
                    <div key={f.k} className="fld">
                      <label className="fld-lbl">
                        {f.l} {f.sub && <span className="fld-sub">({f.sub})</span>}
                      </label>
                      <input className="fld-inp" type={f.t} value={account[f.k]} placeholder={f.ph}
                        onChange={e => setAccount(a => ({ ...a, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="save-row">
                  <button className="btn-pri" onClick={handleSaveAccount} disabled={saving}>
                    {saving ? <span className="spin-sm" /> : <Ic d={IC.save} size={13} color="#fff" />}
                    Save Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Email Templates ── */}
          {activeTab === 'email' && (
            <div>
              <div className="row-between" style={{ marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                <p className="hint" style={{ margin: 0, flex: 1 }}>
                  Manage HTML email templates sent to <strong>students</strong>. Click variable chips in the editor to insert them at the cursor position.
                </p>
                <button className="btn-create" onClick={() => setShowCreateEmail(true)}>
                  <Ic d={IC.plus} size={13} color="#fff" /> Create New Template
                </button>
              </div>
              {emailTemplates.length === 0 ? (
                <div className="empty-state">
                  <Ic d={IC.mail} size={36} color={C.blue} sw={1.2} />
                  <p style={{ fontSize: 14, color: C.inkSub, marginTop: 12 }}>No email templates found.<br />Run the SQL migration to seed defaults, or create a new template above.</p>
                </div>
              ) : emailTemplates.map(tpl => (
                <TemplateCard key={tpl.template_key} template={tpl} type="email"
                  onSave={handleSaveTemplate} onDelete={handleDeleteTemplate}
                  saving={savingTpl === tpl.template_key} />
              ))}
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notif' && (
            <div>
              <div className="row-between" style={{ marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                <p className="hint" style={{ margin: 0, flex: 1 }}>
                  Manage HTML email templates sent to <strong>admins</strong> when recruiter activity requires attention. Each card shows its trigger event and the admin page it links to.
                </p>
                <button className="btn-create" onClick={() => setShowCreateNotif(true)}>
                  <Ic d={IC.plus} size={13} color="#fff" /> Create New Template
                </button>
              </div>
              {notifTemplates.length === 0 ? (
                <div className="empty-state">
                  <Ic d={IC.bell} size={36} color={C.blue} sw={1.2} />
                  <p style={{ fontSize: 14, color: C.inkSub, marginTop: 12 }}>No notification templates found.<br />Run <strong>migration_003_notification_templates.sql</strong> to seed defaults, or create one above.</p>
                </div>
              ) : notifTemplates.map(tpl => (
                <TemplateCard key={tpl.template_key} template={tpl} type="notif"
                  onSave={handleSaveTemplate} onDelete={handleDeleteTemplate}
                  saving={savingTpl === tpl.template_key} />
              ))}
              <div className="info-box">
                <div className="info-box-title">Triggering Notification Emails from Code</div>
                <div className="info-box-body">
                  Import helpers from <code>emailService.js</code>:<br />
                  <code>sendRecruiterSignupAlert({'{ to, recruiterName, recruiterEmail, recruiterCompany }'})</code> — call from your recruiter register route.<br />
                  <code>sendExamRequestAlert({'{ to, examTitle, examRole, examDuration, recruiterName, recruiterCompany }'})</code> — call from your exam request route.
                </div>
              </div>
            </div>
          )}

          {/* ── Exam Settings ── */}
          {activeTab === 'exam' && (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-hdr"><span className="card-title">Proctoring</span></div>
                <div className="card-body">
                  {PROCTOR_TOGGLES.map(t => (
                    <div key={t.id} className="toggle-row">
                      <div><div className="toggle-lbl">{t.label}</div><div className="toggle-desc">{t.desc}</div></div>
                      <Toggle checked={!!toggles[t.id]} onChange={() => setToggles(p => ({ ...p, [t.id]: !p[t.id] }))} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-hdr"><span className="card-title">Exam Behaviour and Alerts</span></div>
                <div className="card-body">
                  {EXAM_TOGGLES.map(t => (
                    <div key={t.id} className="toggle-row">
                      <div><div className="toggle-lbl">{t.label}</div><div className="toggle-desc">{t.desc}</div></div>
                      <Toggle checked={!!toggles[t.id]} onChange={() => setToggles(p => ({ ...p, [t.id]: !p[t.id] }))} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="save-row">
                <button className="btn-sec" onClick={() => setToggles({ webcam: true, tabSwitch: true, fullscreen: true, copyPaste: true, audioMonitor: false, aiDetection: true, multipleAttempts: false, autoTerminate: false, emailAlerts: true, resultEmail: true })}>
                  <Ic d={IC.reset} size={13} color={C.inkMid} /> Reset Defaults
                </button>
                <button className="btn-pri" onClick={handleSaveExam} disabled={saving}>
                  {saving ? <span className="spin-sm" /> : <Ic d={IC.save} size={13} color="#fff" />}
                  Save Exam Settings
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {showCreateEmail && <CreateModal templateType="email" onClose={() => setShowCreateEmail(false)} onCreate={handleCreateTemplate} />}
      {showCreateNotif && <CreateModal templateType="notif" onClose={() => setShowCreateNotif(false)} onCreate={handleCreateTemplate} />}

      <ToastContainer />
    </div>
  );
}

