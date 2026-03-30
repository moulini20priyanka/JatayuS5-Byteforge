import { useState, useEffect, useRef, useCallback } from "react";

const SQL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #f4f6fb;
  --surface: #ffffff;
  --surface2: #f8f9fd;
  --border: #e4e8f0;
  --border2: #cdd3e0;
  --accent: #0284c7;
  --accent-s: #f0f9ff;
  --accent-m: rgba(2,132,199,0.12);
  --green: #16a34a;
  --green-s: #f0fdf4;
  --red: #dc2626;
  --red-s: #fef2f2;
  --amber: #d97706;
  --amber-s: #fffbeb;
  --text: #0f172a;
  --text2: #334155;
  --muted: #64748b;
  --dim: #94a3b8;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06);
}
html, body { height: 100%; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }

.sq-layout { display: grid; grid-template-rows: 60px 1fr; grid-template-columns: 1fr 288px; height: 100vh; }

.sq-topbar {
  grid-column: 1/-1; background: var(--surface); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 24px; gap: 14px; z-index: 50;
  box-shadow: var(--shadow-sm);
}
.sq-brand-icon {
  width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; box-shadow: 0 2px 8px rgba(2,132,199,0.28);
}
.sq-brand-name { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.sq-brand-sub  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.6px; margin-top: 1px; }
.sq-exam-title { font-size: 12px; font-weight: 600; color: var(--text2); }
.sq-exam-meta  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
.sq-spacer { flex: 1; }
.sq-proctor-pill { display: flex; align-items: center; gap: 6px; background: var(--green-s); border: 1px solid rgba(22,163,74,0.18); border-radius: 100px; padding: 5px 12px; }
.sq-proctor-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: sq-pulse 2s ease infinite; }
.sq-proctor-label { font-size: 10px; font-weight: 700; color: var(--green); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.8px; }

.sq-viol-badge {
  display: flex; align-items: center; gap: 6px;
  background: var(--amber-s); border: 1px solid rgba(217,119,6,0.2);
  border-radius: 100px; padding: 5px 11px;
}
.sq-viol-label { font-size: 10px; font-weight: 700; color: var(--amber); font-family: 'JetBrains Mono', monospace; }

.sq-timer { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 100px; padding: 6px 16px; transition: all 0.4s; }
.sq-timer.warning { background: var(--amber-s); border-color: rgba(217,119,6,0.3); }
.sq-timer.danger  { background: var(--red-s);   border-color: rgba(220,38,38,0.3); animation: sq-timer-pulse 1s ease infinite; }
.sq-timer-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: sq-ping 2s ease infinite; transition: background 0.4s; }
.sq-timer.warning .sq-timer-dot { background: var(--amber); }
.sq-timer.danger  .sq-timer-dot { background: var(--red); }
.sq-timer-val { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; color: var(--green); letter-spacing: 2.5px; transition: color 0.4s; }
.sq-timer.warning .sq-timer-val { color: var(--amber); }
.sq-timer.danger  .sq-timer-val { color: var(--red); }

.sq-main { overflow-y: auto; padding: 32px 40px 110px; background: var(--bg); position: relative; }

.sq-exam-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.sq-exam-progress-bar { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
.sq-exam-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), #0369a1); transition: width 0.5s cubic-bezier(.4,0,.2,1); }
.sq-exam-progress-label { font-size: 11px; font-weight: 600; color: var(--muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

.sq-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-md); animation: sq-fadeUp 0.35s cubic-bezier(.22,1,.36,1); }
.sq-qnum-row { padding: 20px 28px 0; display: flex; align-items: center; justify-content: space-between; }
.sq-qnum-badge { background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: var(--accent); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; }
.sq-qnum-of    { font-size: 11px; color: var(--dim); font-family: 'JetBrains Mono', monospace; font-weight: 500; }
.sq-qtext      { padding: 16px 28px 14px; font-size: 17px; font-weight: 600; color: var(--text); line-height: 1.55; letter-spacing: -0.2px; }

.sq-table-wrap  { margin: 0 28px 16px; overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
.sq-table       { width: 100%; border-collapse: collapse; font-size: 13px; }
.sq-table thead tr { background: var(--accent-s); }
.sq-table th    { padding: 9px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: var(--accent); letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.sq-table td    { padding: 9px 14px; color: var(--text2); font-size: 13px; border-bottom: 1px solid #f1f5f9; }
.sq-table tr:last-child td { border-bottom: none; }
.sq-table tr:nth-child(even) td { background: #fafbff; }
.sq-table td.pk      { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--accent); }
.sq-table td.missing { background: #fff7ed; color: var(--amber); font-weight: 700; font-family: 'JetBrains Mono', monospace; text-align: center; border: 2px dashed #fbbf24; border-radius: 4px; }

.sq-hint { margin: 0 28px 14px; background: #fefce8; border: 1px solid rgba(234,179,8,0.3); border-radius: 10px; padding: 10px 14px; }
.sq-hint-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #b45309; font-family: 'JetBrains Mono', monospace; margin-bottom: 5px; }
.sq-hint-text  { font-size: 12px; color: #713f12; line-height: 1.6; }

.sq-options { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 8px; }
.sq-opt {
  display: flex; align-items: flex-start; gap: 12px; width: 100%; text-align: left;
  cursor: pointer; background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 12px 16px; font-size: 13.5px; font-weight: 400;
  color: var(--text2); font-family: 'Inter', sans-serif; transition: all 0.15s;
}
.sq-opt:hover:not(.locked) { background: var(--accent-s); border-color: rgba(2,132,199,0.3); color: var(--accent); }
.sq-opt.selected { background: var(--accent-s); border-color: rgba(2,132,199,0.45); color: var(--accent); font-weight: 500; box-shadow: 0 0 0 3px rgba(2,132,199,0.07); }
.sq-opt.locked   { cursor: default; }
.sq-opt.locked:hover { background: var(--surface2); border-color: var(--border); color: var(--text2); }
.sq-opt.locked.selected { background: var(--accent-s); border-color: rgba(2,132,199,0.45); color: var(--accent); }
.sq-opt-letter { width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0; background: #e8edf5; color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; transition: all 0.15s; margin-top: 1px; }
.sq-opt.selected .sq-opt-letter      { background: var(--accent); color: #fff; }
.sq-opt.locked.selected .sq-opt-letter { background: var(--accent); color: #fff; }

.sq-opt-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 5px; }
.sq-opt-table th { background: #e0f2fe; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #0284c7; letter-spacing: 1px; text-align: left; border-bottom: 1px solid #bae6fd; }
.sq-opt-table td { padding: 5px 10px; color: var(--text2); border-bottom: 1px solid #f0f9ff; }
.sq-opt-table tr:last-child td { border-bottom: none; }

.sq-answered-notice { margin: 0 24px 20px; background: #f0f9ff; border: 1px solid rgba(2,132,199,0.15); border-radius: 10px; padding: 11px 14px; display: flex; align-items: center; gap: 9px; animation: sq-fadeUp 0.3s ease; }
.sq-answered-notice-text { font-size: 12.5px; font-weight: 500; color: var(--accent); line-height: 1.5; }

.sq-viol-banner { display: none; margin-top: 14px; background: var(--amber-s); border: 1.5px solid rgba(217,119,6,0.25); border-radius: 10px; padding: 11px 16px; align-items: flex-start; gap: 9px; }
.sq-viol-banner.show { display: flex; }

.sq-action-bar {
  position: fixed; bottom: 0; left: 0; right: 289px;
  background: rgba(244,246,251,0.96); backdrop-filter: blur(14px);
  border-top: 1px solid var(--border); padding: 14px 40px;
  display: flex; gap: 10px; align-items: center; z-index: 50;
}
.sq-btn { padding: 11px 22px; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: all 0.15s; }
.sq-btn-primary { flex: 1; padding: 12px; background: var(--accent); color: #fff; font-size: 14px; box-shadow: 0 2px 10px rgba(2,132,199,0.28); }
.sq-btn-primary:hover    { background: #0369a1; }
.sq-btn-primary:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }
.sq-btn-next { flex: 1; padding: 12px; background: #0f172a; color: #fff; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
.sq-btn-next:hover { background: #1e293b; }

.sq-sidebar { background: var(--surface); border-left: 1px solid var(--border); overflow-y: auto; display: flex; flex-direction: column; }
.sq-webcam-section { padding: 16px 14px 14px; border-bottom: 1px solid var(--border); }
.sq-section-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; text-transform: uppercase; }
.sq-webcam-box { background: #0f172a; border-radius: 10px; overflow: hidden; aspect-ratio: 4/3; position: relative; }
.sq-webcam-inner { width: 100%; height: 100%; background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%); position: relative; overflow: hidden; }
.sq-sil { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 90px; height: 120px; }
.sq-sil-head { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.10); margin: 0 auto 4px; }
.sq-sil-body { width: 72px; height: 72px; border-radius: 50% 50% 0 0; background: rgba(255,255,255,0.07); margin: 0 auto; }
.sq-webcam-overlay { position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.45); border-radius: 5px; padding: 3px 7px; }
.sq-webcam-rec { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: sq-pulse 1.5s ease infinite; }
.sq-webcam-rec-label { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.75); font-family: 'JetBrains Mono', monospace; letter-spacing: 1px; }
.sq-webcam-status { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.sq-webcam-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: sq-pulse 2s ease infinite; }
.sq-webcam-active { font-size: 9px; color: var(--green); font-family: 'JetBrains Mono', monospace; font-weight: 700; letter-spacing: 0.5px; }
.sq-webcam-face { font-size: 9px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }

.sq-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px; border-bottom: 1px solid var(--border); }
.sq-stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 10px 8px; text-align: center; }
.sq-stat-val { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
.sq-stat-lbl { font-size: 9px; color: var(--dim); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; margin-top: 4px; }

.sq-nav-section { padding: 14px; }
.sq-nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.sq-nav-dot { aspect-ratio: 1; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; border: 1.5px solid var(--border); background: var(--surface2); color: var(--dim); transition: all 0.12s; cursor: default; }
.sq-nav-dot.current  { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(2,132,199,0.3); }
.sq-nav-dot.answered { background: #e8f5e9; border-color: rgba(22,163,74,0.3); color: var(--green); }
.sq-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sq-legend-item { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }
.sq-legend-dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }

.sq-watermark { position: fixed; top: 60px; left: 0; right: 288px; bottom: 0; pointer-events: none; z-index: 40; }
.sq-result-overlay { display: none; position: fixed; inset: 0; background: rgba(244,246,251,0.97); backdrop-filter: blur(18px); z-index: 200; align-items: center; justify-content: center; padding: 24px; }
.sq-result-overlay.show { display: flex; }
.sq-shake { animation: sq-shake 0.4s ease !important; }

.sq-redirect-bar { background: var(--border); border-radius: 99px; height: 5px; overflow: hidden; margin-top: 16px; }
.sq-redirect-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--red), #f87171); transition: width 1s linear; }

.na-unlock-box {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1.5px solid rgba(22,163,74,0.25);
  border-radius: 14px; padding: 18px;
  margin-bottom: 16px; text-align: left;
  display: flex; gap: 14px; align-items: flex-start;
}
.na-unlock-btn {
  margin-top: 10px; padding: 9px 20px;
  border-radius: 8px; border: none;
  background: var(--green); color: #fff;
  font-size: 13px; font-weight: 700;
  font-family: 'Inter', sans-serif;
  cursor: pointer; transition: background 0.15s;
  box-shadow: 0 2px 8px rgba(22,163,74,0.28);
}
.na-unlock-btn:hover { background: #15803d; }

@keyframes sq-fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
@keyframes sq-ping    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.3); } }
@keyframes sq-pulse   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes sq-shake   { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-5px); } 40%,80% { transform:translateX(5px); } }
@keyframes sq-timer-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.2); } 50% { box-shadow:0 0 0 6px rgba(220,38,38,0); } }
`;

const QUESTIONS = [
  {
    q: "Given the Employees table below, which query returns only employees in 'Engineering' with a salary above 70,000?",
    table: { headers: ["emp_id","name","department","salary"], rows: [["E001","Alice","Engineering","85,000"],["E002","Bob","Marketing","62,000"],["E003","Carol","Engineering","91,000"],["E004","Dave","HR","55,000"],["E005","Eve","Engineering","68,000"]] },
    opts: [
      { text: "SELECT * FROM Employees WHERE department = 'Engineering' AND salary > 70000;" },
      { text: "SELECT * FROM Employees WHERE department = 'Engineering' OR salary > 70000;" },
      { text: "SELECT * FROM Employees WHERE salary > 70000;" },
      { text: "SELECT * FROM Employees WHERE department = 'Engineering';" },
    ],
    ans: 0,
  },
  {
    q: "The table below violates 2NF due to a partial dependency. After correct decomposition, what value belongs in the highlighted cell (?) of the Products table?",
    table: {
      headers: ["order_id","prod_id","prod_name","qty","unit_price"],
      rows: [
        ["O01","P01","Laptop","2","65000"],
        ["O01","P02","Mouse","5","850"],
        ["O02","P01","Laptop","1","65000"],
        ["O02","P03","?","3","2200"],
      ],
      missingCell: { row: 3, col: 2 }
    },
    hint: "In 2NF, prod_name depends only on prod_id — a partial dependency on part of the composite key. Move it to a Products table. The catalogue maps: P01 → Laptop, P02 → Mouse, P03 → Keyboard.",
    opts: [
      { label: "Keyboard", tableOpt: { headers: ["prod_id","prod_name","unit_price"], rows: [["P01","Laptop","65000"],["P02","Mouse","850"],["P03","Keyboard","2200"]] } },
      { label: "Monitor",  tableOpt: { headers: ["prod_id","prod_name","unit_price"], rows: [["P01","Laptop","65000"],["P02","Mouse","850"],["P03","Monitor","2200"]] } },
      { label: "Tablet",   tableOpt: { headers: ["prod_id","prod_name","unit_price"], rows: [["P01","Laptop","65000"],["P02","Mouse","850"],["P03","Tablet","2200"]] } },
      { label: "Laptop",   tableOpt: { headers: ["prod_id","prod_name","unit_price"], rows: [["P01","Laptop","65000"],["P02","Mouse","850"],["P03","Laptop","2200"]] } },
    ],
    ans: 0,
  },
];

const LETTERS        = ["A","B","C","D"];
const TOTAL_SECS     = 5 * 60;
const CUTOFF         = 50;
const ROLL           = "240352";
const REDIRECT_SECS  = 60;
const MAX_VIOLATIONS = 3;

/* ── SVG Icons ── */
const IconDB = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IconTrophy = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);
const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12m0 0L6.5 6.5M12 12l5.5-5.5"/><circle cx="12" cy="5" r="3"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconAlert = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

function buildWatermarkBg() {
  const W = 420, H = 240, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-28 * Math.PI / 180);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillStyle = "rgba(2,132,199,0.09)";
  ctx.fillText("NEUROASSESS", 0, -14);
  ctx.font = "500 13px Arial, sans-serif";
  ctx.fillStyle = "rgba(2,132,199,0.07)";
  ctx.fillText(ROLL, 0, 10);
  ctx.restore();
  return `url(${c.toDataURL()})`;
}

function DataTable({ tableData, missingCell }) {
  if (!tableData) return null;
  return (
    <div className="sq-table-wrap">
      <table className="sq-table">
        <thead><tr>{tableData.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {tableData.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isMissing = missingCell && missingCell.row === ri && missingCell.col === ci;
                return (
                  <td key={ci} className={`${ci === 0 ? "pk" : ""} ${isMissing ? "missing" : ""}`}>
                    {isMissing ? "?" : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SQLExamPage({ onNavigate }) {
  useEffect(() => {
    if (document.getElementById("sq-styles")) return;
    const s = document.createElement("style"); s.id = "sq-styles"; s.textContent = SQL_CSS;
    document.head.appendChild(s);
  }, []);

  // Store onNavigate in a ref so all closures always read the latest version
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);

  const [current,        setCurrent]        = useState(0);
  const [answers,        setAnswers]        = useState(() => new Array(QUESTIONS.length).fill(null));
  const [selected,       setSelected]       = useState(null);
  const [confirmed,      setConfirmed]      = useState(false);
  const [secsLeft,       setSecsLeft]       = useState(TOTAL_SECS);
  const [violations,     setViolations]     = useState(0);
  const [violMsg,        setViolMsg]        = useState("");
  const [showViolBanner, setShowViolBanner] = useState(false);
  const [examDone,       setExamDone]       = useState(false);
  const [result,         setResult]         = useState(null);
  const [shakeOpts,      setShakeOpts]      = useState(false);
  const [wmBg,           setWmBg]           = useState("");
  const [cardKey,        setCardKey]        = useState(0);
  const [redirectLeft,   setRedirectLeft]   = useState(REDIRECT_SECS);

  const answersRef     = useRef(new Array(QUESTIONS.length).fill(null));
  const violTimerRef   = useRef(null);
  const listeningRef   = useRef(false);
  const violationsRef  = useRef(0);
  const examDoneRef    = useRef(false);

  useEffect(() => { setWmBg(buildWatermarkBg()); }, []);

  useEffect(() => {
    const isC = answers[current] !== null;
    setConfirmed(isC); setSelected(isC ? answers[current] : null); setCardKey(k => k + 1);
  }, [current]); // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(id); doSubmit(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ── Redirect on FAIL: go to student dashboard ──
  useEffect(() => {
    if (!examDone || !result || result.passed) return;
    const id = setInterval(() => {
      setRedirectLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          // Failed → go to lobby/dashboard
          onNavigateRef.current ? onNavigateRef.current("lobby") : window.location.assign("/");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [examDone, result]);

  useEffect(() => {
    const t = setTimeout(() => { listeningRef.current = true; }, 2000);
    const onHide = () => { if (listeningRef.current && document.hidden) triggerViolation("Tab switch detected"); };
    const onBlur = () => { if (listeningRef.current) triggerViolation("Window focus lost"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, []); // eslint-disable-line

  const triggerViolation = useCallback((reason) => {
    if (examDoneRef.current) return;
    violationsRef.current += 1;
    const v = violationsRef.current;
    setViolations(v);
    const msg = v < MAX_VIOLATIONS
      ? `Security alert: ${reason} · ${v}/${MAX_VIOLATIONS} warnings`
      : "Maximum violations reached. Exam is being submitted.";
    setViolMsg(msg);
    setShowViolBanner(true);
    clearTimeout(violTimerRef.current);
    violTimerRef.current = setTimeout(() => setShowViolBanner(false), 5000);
    if (v >= MAX_VIOLATIONS) doSubmit();
  }, []); // eslint-disable-line

  const doSubmit = useCallback(() => {
    if (examDoneRef.current) return;
    examDoneRef.current = true;
    setExamDone(true);
    const latestAnswers = answersRef.current;
    let correct = 0;
    QUESTIONS.forEach((q, i) => { if (latestAnswers[i] === q.ans) correct++; });
    const score = Math.round((correct / QUESTIONS.length) * 100);
    setResult({ score, correct, passed: score >= CUTOFF });
  }, []);

  // ── Passed → go to Round 3 (code-exam) ──
  const handleGoToRound3 = useCallback(() => {
    onNavigateRef.current ? onNavigateRef.current("code-exam") : window.location.assign("/code-exam");
  }, []);

  // ── Failed → go to student dashboard ──
  const handleReturnToDashboard = useCallback(() => {
    onNavigateRef.current ? onNavigateRef.current("lobby") : window.location.assign("/");
  }, []);

  const selectOpt = (i) => { if (!confirmed) setSelected(i); };

  const confirmAnswer = () => {
    if (selected === null) { setShakeOpts(true); setTimeout(() => setShakeOpts(false), 500); return; }
    const newAnswers = [...answersRef.current];
    newAnswers[current] = selected;
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    setConfirmed(true);
  };

  const nextQ = () => {
    if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1);
    } else {
      doSubmit();
    }
  };

  const q           = QUESTIONS[current];
  const pct         = secsLeft / TOTAL_SECS;
  const timerCls    = `sq-timer${pct <= 0.1 ? " danger" : pct <= 0.25 ? " warning" : ""}`;
  const mm          = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss          = String(secsLeft % 60).padStart(2, "0");
  const answered    = answers.filter(a => a !== null).length;
  const remaining   = QUESTIONS.length - answered;
  const progressPct = Math.round(((current + 1) / QUESTIONS.length) * 100);
  const redirectPct = (redirectLeft / REDIRECT_SECS) * 100;

  return (
    <>
      <div className="sq-watermark" style={{ backgroundImage: wmBg, backgroundRepeat: "repeat", backgroundSize: "420px 240px" }} />

      <div className="sq-layout">
        {/* ── Top bar ── */}
        <header className="sq-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sq-brand-icon"><IconDB /></div>
            <div>
              <div className="sq-brand-name">NeuroAssess</div>
              <div className="sq-brand-sub">ASSESSMENT PLATFORM</div>
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: "var(--border)", flexShrink: 0 }} />
          <div>
            <div className="sq-exam-title">Database &amp; SQL · Round 2</div>
            <div className="sq-exam-meta">MCQ · {QUESTIONS.length} Questions · 5 min</div>
          </div>

          {violations > 0 && (
            <div className="sq-viol-badge">
              <IconWarn />
              <span className="sq-viol-label">{violations} Warning{violations > 1 ? "s" : ""}</span>
            </div>
          )}

          <div className="sq-spacer" />
          <div className="sq-proctor-pill">
            <div className="sq-proctor-dot" />
            <span className="sq-proctor-label">PROCTORED</span>
          </div>
          <div className={timerCls}>
            <div className="sq-timer-dot" />
            <span className="sq-timer-val">{mm}:{ss}</span>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="sq-main">
          <div className="sq-exam-progress">
            <div className="sq-exam-progress-bar">
              <div className="sq-exam-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="sq-exam-progress-label">{current + 1} / {QUESTIONS.length}</span>
          </div>

          <div className="sq-card" key={cardKey}>
            <div className="sq-qnum-row">
              <span className="sq-qnum-badge">Q{String(current + 1).padStart(2, "0")}</span>
              <span className="sq-qnum-of">{QUESTIONS.length - current - 1} remaining after this</span>
            </div>
            <div className="sq-qtext">{q.q}</div>

            {q.table && <DataTable tableData={q.table} missingCell={q.table?.missingCell} />}

            {q.hint && (
              <div className="sq-hint">
                <div className="sq-hint-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <IconPin /> CONTEXT
                </div>
                <div className="sq-hint-text">{q.hint}</div>
              </div>
            )}

            <div className={`sq-options${shakeOpts ? " sq-shake" : ""}`}>
              {q.opts.map((opt, i) => {
                let cls = "sq-opt";
                if (confirmed) {
                  cls += " locked";
                  if (i === selected) cls += " selected";
                } else if (i === selected) {
                  cls += " selected";
                }
                return (
                  <button key={i} className={cls} onClick={() => selectOpt(i)}>
                    <span className="sq-opt-letter">{LETTERS[i]}</span>
                    <div style={{ flex: 1 }}>
                      {opt.tableOpt ? (
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{opt.label}</div>
                          <table className="sq-opt-table">
                            <thead><tr>{opt.tableOpt.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                            <tbody>{opt.tableOpt.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody>
                          </table>
                        </div>
                      ) : (
                        <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.7, wordBreak: "break-all" }}>{opt.text}</code>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {confirmed && (
              <div className="sq-answered-notice">
                <IconCheck />
                <span className="sq-answered-notice-text">Response recorded. You can proceed to the next question.</span>
              </div>
            )}
          </div>

          {showViolBanner && (
            <div className="sq-viol-banner show">
              <IconWarn />
              <p style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>
                {violMsg}
              </p>
            </div>
          )}
        </main>

        {/* ── Action bar ── */}
        <div className="sq-action-bar">
          {!confirmed && (
            <button
              className="sq-btn sq-btn-primary"
              onClick={confirmAnswer}
              disabled={selected === null}
              style={{ opacity: selected === null ? 0.5 : 1 }}
            >
              Save &amp; Continue
            </button>
          )}
          {confirmed && (
            <button className="sq-btn sq-btn-next" onClick={nextQ}>
              {current + 1 < QUESTIONS.length ? "Next Question →" : "Submit Assessment"}
            </button>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="sq-sidebar">
          <div className="sq-webcam-section">
            <div className="sq-section-label">Live Monitoring</div>
            <div className="sq-webcam-box">
              <div className="sq-webcam-inner">
                <div className="sq-sil">
                  <div className="sq-sil-head" />
                  <div className="sq-sil-body" />
                </div>
                <div className="sq-webcam-overlay">
                  <div className="sq-webcam-rec" />
                  <span className="sq-webcam-rec-label">LIVE</span>
                </div>
              </div>
            </div>
            <div className="sq-webcam-status">
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="sq-webcam-dot" />
                <span className="sq-webcam-active">ACTIVE</span>
              </div>
              <span className="sq-webcam-face">Face detected</span>
            </div>
          </div>

          <div className="sq-stats-row">
            {[
              { val: answered,  lbl: "ANSWERED",  color: "var(--green)"  },
              { val: remaining, lbl: "REMAINING", color: "var(--accent)" },
            ].map(({ val, lbl, color }) => (
              <div className="sq-stat-card" key={lbl}>
                <div className="sq-stat-val" style={{ color }}>{val}</div>
                <div className="sq-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="sq-nav-section">
            <div className="sq-section-label">Questions</div>
            <div className="sq-nav-grid">
              {QUESTIONS.map((_, i) => {
                let cls = "sq-nav-dot";
                if      (i === current)       cls += " current";
                else if (answers[i] !== null) cls += " answered";
                return <div key={i} className={cls}>{i + 1}</div>;
              })}
            </div>
            <div className="sq-legend">
              {[
                { color: "var(--accent)",   border: "none",                          label: "Active"  },
                { color: "#e8f5e9",         border: "1px solid rgba(22,163,74,0.3)", label: "Done"    },
                { color: "var(--surface2)", border: "1px solid var(--border)",       label: "Pending" },
              ].map(({ color, border, label }) => (
                <div className="sq-legend-item" key={label}>
                  <div className="sq-legend-dot" style={{ background: color, border }} />{label}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Result overlay ── */}
      {examDone && result && (
        <div className="sq-result-overlay show">
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, overflow: "hidden", maxWidth: 460, width: "100%",
            boxShadow: "var(--shadow-lg)", animation: "sq-fadeUp 0.5s cubic-bezier(.22,1,.36,1)"
          }}>
            <div style={{ height: 5, background: result.passed ? "linear-gradient(90deg,#16a34a,#4ade80)" : "linear-gradient(90deg,#dc2626,#f87171)" }} />
            <div style={{ padding: "40px 36px", textAlign: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
                background: result.passed ? "#f0fdf4" : "#fef2f2",
                border: `2px solid ${result.passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                color: result.passed ? "var(--green)" : "var(--red)"
              }}>
                {result.passed ? <IconTrophy /> : <IconAlert />}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: result.passed ? "var(--green)" : "var(--red)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
                {result.passed ? "ASSESSMENT COMPLETE" : "ASSESSMENT ENDED"}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, marginBottom: 10 }}>
                {result.passed ? "Round 2 Submitted" : "Sorry, Better Luck Next Time"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28 }}>
                {result.passed
                  ? "You have successfully completed the SQL round of the NeuroAssess evaluation."
                  : "You did not meet the passing threshold for Round 2. Keep practising your SQL skills and try again when you're ready."}
              </p>

              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>YOUR SCORE</div>
                  <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2, color: result.passed ? "var(--green)" : "var(--red)", lineHeight: 1 }}>
                    {result.score}<span style={{ fontSize: 18 }}>%</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${result.score}%`, transition: "width 1.2s cubic-bezier(.4,0,.2,1)", background: result.passed ? "linear-gradient(90deg,var(--green),#4ade80)" : "linear-gradient(90deg,var(--red),#f87171)" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace" }}>{result.correct} / {QUESTIONS.length} correct</div>
                </div>
              </div>

              {/* ── PASSED: unlock Round 3 → navigate to code-exam ── */}
              {result.passed && (
                <div className="na-unlock-box">
                  <div style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }}><IconTrophy /></div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Round 3 Unlocked</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                      Proceed to Round 3 — Coding Challenge
                    </div>
                    <button
                      className="na-unlock-btn"
                      type="button"
                      onClick={handleGoToRound3}
                    >
                      Round 3 →
                    </button>
                  </div>
                </div>
              )}

              {/* ── FAILED: auto-redirect countdown + manual button ── */}
              {!result.passed && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, textAlign: "left" }}>
                    REDIRECTING TO DASHBOARD IN {redirectLeft}s
                  </div>
                  <div className="sq-redirect-bar">
                    <div className="sq-redirect-fill" style={{ width: `${redirectPct}%` }} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {!result.passed && (
                  <button
                    type="button"
                    onClick={handleReturnToDashboard}
                    style={{ flex: 1, padding: 13, borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface2)", color: "var(--text)", fontSize: 14, fontWeight: 600, fontFamily: "'Inter',sans-serif", cursor: "pointer" }}
                  >
                    Return to Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}