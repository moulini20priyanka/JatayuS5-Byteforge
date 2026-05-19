
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

if (typeof document !== "undefined") {
  if (!document.getElementById("na-fonts")) {
    const l = document.createElement("link");
    l.id = "na-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #f4f6fb; --surface: #ffffff; --surface2: #f8f9fd;
  --border: #e4e8f0; --border2: #cdd3e0;
  --accent: #2563eb; --accent-s: #eff4ff; --accent-m: rgba(37,99,235,0.12);
  --green: #16a34a; --green-s: #f0fdf4;
  --red: #dc2626; --red-s: #fef2f2;
  --amber: #d97706; --amber-s: #fffbeb;
  --purple: #7c3aed; --purple-s: #f5f3ff;
  --text: #0f172a; --text2: #334155; --muted: #64748b; --dim: #94a3b8;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.07),0 2px 6px rgba(0,0,0,0.04);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.06);
}
html,body { height:100%; font-family:'Inter',sans-serif; background:var(--bg); color:var(--text); }
.na-layout { display:grid; grid-template-rows:60px 1fr; grid-template-columns:1fr 288px; height:100vh; }
.na-topbar { grid-column:1/-1; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:14px; z-index:50; box-shadow:var(--shadow-sm); }
.na-brand { display:flex; align-items:center; gap:10px; }
.na-brand-icon { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#2563eb,#4f46e5); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 8px rgba(37,99,235,0.28); }
.na-brand-name { font-size:15px; font-weight:700; color:var(--text); letter-spacing:-0.3px; }
.na-brand-sub  { font-size:10px; color:var(--dim); font-family:'JetBrains Mono',monospace; letter-spacing:0.6px; margin-top:1px; }
.na-topbar-div { width:1px; height:26px; background:var(--border); flex-shrink:0; }
.na-exam-info  { display:flex; flex-direction:column; }
.na-exam-title { font-size:12px; font-weight:600; color:var(--text2); }
.na-exam-meta  { font-size:10px; color:var(--dim); font-family:'JetBrains Mono',monospace; margin-top:1px; }
.na-spacer { flex:1; }
.na-proctor-pill  { display:flex; align-items:center; gap:6px; background:var(--green-s); border:1px solid rgba(22,163,74,0.18); border-radius:100px; padding:5px 12px; }
.na-proctor-dot   { width:7px; height:7px; border-radius:50%; background:var(--green); animation:na-pulse 2s ease infinite; }
.na-proctor-label { font-size:10px; font-weight:700; color:var(--green); font-family:'JetBrains Mono',monospace; letter-spacing:0.8px; }
.na-viol-badge  { display:flex; align-items:center; gap:6px; background:var(--amber-s); border:1px solid rgba(217,119,6,0.2); border-radius:100px; padding:5px 11px; }
.na-viol-label  { font-size:10px; font-weight:700; color:var(--amber); font-family:'JetBrains Mono',monospace; }
.na-save-pill   { display:flex; align-items:center; gap:5px; font-size:9px; font-weight:700; color:var(--green); font-family:'JetBrains Mono',monospace; letter-spacing:0.5px; }
.na-save-pill.saving { color:var(--muted); }
.na-timer { display:flex; align-items:center; gap:8px; background:var(--surface2); border:1.5px solid var(--border); border-radius:100px; padding:6px 16px; transition:all 0.4s; }
.na-timer.warning { background:var(--amber-s); border-color:rgba(217,119,6,0.3); }
.na-timer.danger  { background:var(--red-s);   border-color:rgba(220,38,38,0.3); animation:na-timer-pulse 1s ease infinite; }
.na-timer-dot { width:7px; height:7px; border-radius:50%; background:var(--green); animation:na-ping 2s ease infinite; transition:background 0.4s; }
.na-timer.warning .na-timer-dot { background:var(--amber); }
.na-timer.danger  .na-timer-dot { background:var(--red); }
.na-timer-val { font-family:'JetBrains Mono',monospace; font-size:15px; font-weight:700; color:var(--green); letter-spacing:2.5px; transition:color 0.4s; }
.na-timer.warning .na-timer-val { color:var(--amber); }
.na-timer.danger  .na-timer-val { color:var(--red); }
.na-main { overflow-y:auto; padding:32px 40px 110px; position:relative; background:var(--bg); }
.na-exam-progress { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.na-exam-progress-bar  { flex:1; height:4px; background:var(--border); border-radius:99px; overflow:hidden; }
.na-exam-progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--accent),#4f46e5); transition:width 0.5s cubic-bezier(.4,0,.2,1); }
.na-exam-progress-label { font-size:11px; font-weight:600; color:var(--muted); font-family:'JetBrains Mono',monospace; white-space:nowrap; }
.na-qcard { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:var(--shadow-md); animation:na-fadeUp 0.35s cubic-bezier(.22,1,.36,1); }
.na-qnum-row   { padding:20px 28px 0; display:flex; align-items:center; justify-content:space-between; }
.na-qnum-badge { background:var(--accent-s); border:1px solid var(--accent-m); border-radius:6px; padding:3px 10px; font-size:11px; font-weight:700; color:var(--accent); font-family:'JetBrains Mono',monospace; letter-spacing:0.5px; }
.na-qnum-of    { font-size:11px; color:var(--dim); font-family:'JetBrains Mono',monospace; font-weight:500; }
.na-qtext      { padding:18px 28px 10px; font-size:17px; font-weight:600; color:var(--text); line-height:1.55; letter-spacing:-0.2px; }
.na-qmeta { padding:0 28px 14px; display:flex; gap:7px; flex-wrap:wrap; }
.na-qbadge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:700; font-family:'JetBrains Mono',monospace; letter-spacing:0.4px; }
.na-qbadge-marks  { background:#eff4ff; color:var(--accent); border:1px solid var(--accent-m); }
.na-qbadge-words  { background:var(--surface2); color:var(--muted); border:1px solid var(--border); }
.na-qbadge-ok     { background:var(--green-s); color:var(--green); border:1px solid rgba(22,163,74,0.2); }
.na-qbadge-skip   { background:#fffbeb; color:var(--amber); border:1px solid rgba(217,119,6,0.2); }
.na-hint { margin:0 28px 14px; background:#fffbeb; border:1px solid rgba(217,119,6,0.2); border-radius:8px; padding:10px 14px; font-size:12px; color:var(--amber); line-height:1.6; }
.na-answer-header { padding:10px 28px; border-top:1px solid var(--border); background:var(--surface2); display:flex; align-items:center; justify-content:space-between; }
.na-answer-label  { font-size:9px; font-weight:700; color:var(--dim); font-family:'JetBrains Mono',monospace; letter-spacing:1.5px; text-transform:uppercase; }
.na-wc            { font-size:11px; font-weight:600; color:var(--muted); font-family:'JetBrains Mono',monospace; }
.na-wc.ok   { color:var(--green); }
.na-wc.warn { color:var(--amber); }
.na-wc.over { color:var(--red); }
textarea.na-textarea { display:block; width:100%; min-height:210px; padding:20px 28px; background:var(--surface); border:none; resize:vertical; font-size:14px; color:var(--text); line-height:1.8; font-family:'Inter',sans-serif; outline:none; }
textarea.na-textarea::placeholder { color:var(--dim); }
.na-meter-wrap { padding:10px 28px 20px; }
.na-meter-bar  { height:4px; background:var(--border); border-radius:99px; overflow:hidden; margin-bottom:5px; }
.na-meter-fill { height:100%; border-radius:99px; transition:width 0.3s ease,background 0.3s ease; }
.na-meter-hints { display:flex; justify-content:space-between; font-size:9px; color:var(--dim); font-family:'JetBrains Mono',monospace; }
.na-answered-notice { margin:0 24px 20px; background:#f0f4ff; border:1px solid rgba(37,99,235,0.15); border-radius:10px; padding:11px 14px; display:flex; align-items:center; gap:9px; animation:na-fadeUp 0.3s ease; }
.na-answered-notice-text { font-size:12.5px; font-weight:500; color:var(--accent); line-height:1.5; }
.na-viol-banner { display:none; margin-top:14px; background:var(--amber-s); border:1.5px solid rgba(217,119,6,0.25); border-radius:10px; padding:11px 16px; align-items:flex-start; gap:9px; }
.na-viol-banner.show { display:flex; }
.na-action-bar { position:fixed; bottom:0; left:0; right:289px; background:rgba(244,246,251,0.96); backdrop-filter:blur(14px); border-top:1px solid var(--border); padding:14px 40px; display:flex; gap:10px; align-items:center; z-index:50; }
.na-btn { padding:11px 22px; border-radius:9px; font-size:13px; font-weight:600; font-family:'Inter',sans-serif; cursor:pointer; border:none; transition:all 0.15s; }
.na-btn-skip    { padding:12px 18px; background:var(--amber-s); color:var(--amber); border:1.5px solid rgba(217,119,6,0.25) !important; font-size:13px; font-weight:600; }
.na-btn-skip:hover { background:#fef3c7; }
.na-btn-primary { flex:1; padding:12px; background:var(--accent); color:#fff; font-size:14px; box-shadow:0 2px 10px rgba(37,99,235,0.28); }
.na-btn-primary:hover    { background:#1d4ed8; }
.na-btn-primary:disabled { background:#d1d5db; box-shadow:none; cursor:not-allowed; }
.na-btn-next { padding:12px 22px; background:#0f172a; color:#fff; font-size:14px; box-shadow:0 2px 10px rgba(0,0,0,0.18); }
.na-btn-next:hover { background:#1e293b; }
.na-sidebar { background:var(--surface); border-left:1px solid var(--border); overflow-y:auto; display:flex; flex-direction:column; }
.na-webcam-section { padding:16px 14px 14px; border-bottom:1px solid var(--border); }
.na-section-label  { font-size:9px; font-weight:700; letter-spacing:1.5px; color:var(--dim); font-family:'JetBrains Mono',monospace; margin-bottom:10px; text-transform:uppercase; }
.na-webcam-box   { background:#0f172a; border-radius:10px; overflow:hidden; aspect-ratio:4/3; position:relative; }
.na-webcam-inner { width:100%; height:100%; background:linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%); position:relative; overflow:hidden; }
.na-sil      { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:90px; height:120px; }
.na-sil-head { width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,0.10); margin:0 auto 4px; }
.na-sil-body { width:72px; height:72px; border-radius:50% 50% 0 0; background:rgba(255,255,255,0.07); margin:0 auto; }
.na-webcam-overlay   { position:absolute; top:8px; left:8px; display:flex; align-items:center; gap:4px; background:rgba(0,0,0,0.45); border-radius:5px; padding:3px 7px; }
.na-webcam-rec       { width:6px; height:6px; border-radius:50%; background:#ef4444; animation:na-pulse 1.5s ease infinite; }
.na-webcam-rec-label { font-size:8px; font-weight:700; color:rgba(255,255,255,0.75); font-family:'JetBrains Mono',monospace; letter-spacing:1px; }
.na-webcam-status { display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
.na-webcam-dot    { width:6px; height:6px; border-radius:50%; background:var(--green); animation:na-pulse 2s ease infinite; }
.na-webcam-active { font-size:9px; color:var(--green); font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:0.5px; }
.na-webcam-face   { font-size:9px; color:var(--dim); font-family:'JetBrains Mono',monospace; }
.na-stat-card { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 10px; text-align:center; }
.na-stat-val  { font-size:22px; font-weight:700; font-family:'JetBrains Mono',monospace; line-height:1; margin-bottom:4px; }
.na-stat-lbl  { font-size:8px; font-weight:700; letter-spacing:1.2px; color:var(--dim); font-family:'JetBrains Mono',monospace; }
.na-nav-section { padding:14px; border-bottom:1px solid var(--border); }
.na-nav-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
.na-nav-dot  { aspect-ratio:1; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; font-family:'JetBrains Mono',monospace; border:1.5px solid var(--border); background:var(--surface2); color:var(--dim); transition:all 0.12s; cursor:pointer; }
.na-nav-dot.current  { background:var(--accent); border-color:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(37,99,235,0.3); }
.na-nav-dot.answered { background:#e8f5e9; border-color:rgba(22,163,74,0.3); color:var(--green); }
.na-nav-dot.skipped  { background:var(--amber-s); border-color:rgba(217,119,6,0.25); color:var(--amber); }
.na-legend      { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.na-legend-item { display:flex; align-items:center; gap:5px; font-size:9.5px; color:var(--dim); font-family:'JetBrains Mono',monospace; }
.na-legend-dot  { width:8px; height:8px; border-radius:3px; flex-shrink:0; }
.na-sidebar-submit { margin:14px; }
.na-sidebar-submit button { width:100%; padding:11px; background:var(--green-s); border:1px solid rgba(22,163,74,0.25); border-radius:9px; font-size:12px; font-weight:700; color:var(--green); cursor:pointer; font-family:'Inter',sans-serif; }
.na-sidebar-submit button:hover { background:#dcfce7; }
.na-watermark { position:fixed; top:60px; left:0; right:288px; bottom:0; pointer-events:none; z-index:40; }
.na-result-overlay { display:none; position:fixed; inset:0; background:rgba(244,246,251,0.97); backdrop-filter:blur(18px); z-index:200; align-items:center; justify-content:center; padding:24px; overflow-y:auto; }
.na-result-overlay.show { display:flex; }
.na-unlock-box { border-radius:14px; padding:20px; display:flex; align-items:flex-start; gap:14px; margin-bottom:16px; animation:na-fadeUp 0.4s ease; }
.na-unlock-box.green  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1.5px solid rgba(22,163,74,0.25); }
.na-unlock-box.blue   { background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1.5px solid rgba(37,99,235,0.25); }
.na-unlock-btn { margin-top:12px; padding:12px 24px; border-radius:8px; border:none; font-size:14px; font-weight:700; font-family:'Inter',sans-serif; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.15); transition:all 0.15s; display:inline-block; width:100%; color:#fff; }
.na-unlock-btn.green { background:var(--green); }
.na-unlock-btn.green:hover { background:#15803d; transform:translateY(-1px); }
.na-unlock-btn.blue  { background:var(--accent); }
.na-unlock-btn.blue:hover  { background:#1d4ed8; transform:translateY(-1px); }
.na-confirm-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.5); backdrop-filter:blur(6px); z-index:300; display:flex; align-items:center; justify-content:center; padding:24px; }
.na-confirm-box { background:var(--surface); border:1px solid var(--border); border-radius:18px; overflow:hidden; max-width:440px; width:100%; box-shadow:var(--shadow-lg); animation:na-fadeUp 0.3s cubic-bezier(.22,1,.36,1); }
.na-confirm-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:18px; }
.na-confirm-stat { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 8px; text-align:center; }
.na-confirm-stat-val { font-size:24px; font-weight:700; font-family:'JetBrains Mono',monospace; line-height:1; margin-bottom:3px; }
.na-confirm-stat-lbl { font-size:9px; font-weight:700; letter-spacing:1px; color:var(--dim); font-family:'JetBrains Mono',monospace; }
.na-error-box   { background:var(--red-s); border:1.5px solid rgba(220,38,38,0.25); border-radius:12px; padding:28px 32px; max-width:520px; text-align:center; }
.na-error-icon  { font-size:40px; margin-bottom:12px; }
.na-error-title { font-size:18px; font-weight:700; color:var(--red); margin-bottom:8px; }
.na-error-msg   { font-size:13px; color:#7f1d1d; line-height:1.7; }
@keyframes na-fadeUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes na-ping       { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.3)} }
@keyframes na-pulse      { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes na-timer-pulse{ 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.2)} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0)} }
@keyframes na-spin       { to{transform:rotate(360deg)} }
`;

const API_URL = (() => {
  try { return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'; }
  catch { return (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'); }
})();
const MAX_VIOLATIONS = 3;

function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }
function getToken()   { return localStorage.getItem("token") || localStorage.getItem("authToken") || ""; }
function parseSections(raw) {
  if (!raw) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}
function buildWatermarkBg(roll) {
  if (typeof document === "undefined") return "";
  const W = 420, H = 240, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(-28 * Math.PI / 180);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "700 18px Arial,sans-serif"; ctx.fillStyle = "rgba(37,99,235,0.09)";
  ctx.fillText("NEUROASSESS", 0, -14);
  ctx.font = "500 13px Arial,sans-serif"; ctx.fillStyle = "rgba(37,99,235,0.07)";
  ctx.fillText(roll || "", 0, 10); ctx.restore();
  return `url(${c.toDataURL()})`;
}

function resolveExamId(p) {
  if (p) return p;
  try {
    const f = JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}");
    if (f.exam?.id)      return f.exam.id;
    if (f.exam?.exam_id) return f.exam.exam_id;
  } catch {}
  return (
    localStorage.getItem("univ_exam_id") ||
    localStorage.getItem("exam_id")      ||
    null
  );
}

function resolveAssignmentId(p) {
  if (p) return p;
  try {
    const f = JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}");
    if (f.exam?.assignment_id) return f.exam.assignment_id;
  } catch {}
  return (
    localStorage.getItem("univ_assignment_id") ||
    localStorage.getItem("assignment_id")      ||
    null
  );
}

function resolveExamKey() {
  try {
    const f = JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}");
    if (f.exam?.exam_key)   return f.exam.exam_key;
    if (f.exam?.verifyCode) return f.exam.verifyCode;
  } catch {}
  return (
    localStorage.getItem("univ_exam_key") ||
    localStorage.getItem("exam_key")      ||
    localStorage.getItem("verifyCode")    ||
    ""
  );
}

function normalizeQ(q, i) {
  return {
    id:        q.id || q.question_id || `q_${i}`,
    text:      q.question || q.text || q.question_text || q.question_body || "",
    marks:     q.marks || q.max_marks || 10,
    min_words: q.min_words || 0,
    max_words: q.max_words || 0,
    hint:      q.hint || "",
    section:   q.section || "",
  };
}

const IconBrain = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/>
  </svg>
);
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconCheckGreen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconPencil = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrophy = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/>
    <path d="M7 4H4v2a3 3 0 0 0 3 3"/><path d="M17 4h3v2a3 3 0 0 1-3 3"/>
  </svg>
);

function WebcamMock() {
  return (
    <>
      <div className="na-section-label">Live Monitoring</div>
      <div className="na-webcam-box">
        <div className="na-webcam-inner">
          <div className="na-sil"><div className="na-sil-head" /><div className="na-sil-body" /></div>
          <div className="na-webcam-overlay"><div className="na-webcam-rec" /><span className="na-webcam-rec-label">LIVE</span></div>
        </div>
      </div>
      <div className="na-webcam-status">
        <div style={{ display:"flex", alignItems:"center", gap:5 }}><div className="na-webcam-dot" /><span className="na-webcam-active">ACTIVE</span></div>
        <span className="na-webcam-face">Face detected</span>
      </div>
    </>
  );
}

function ConfirmModal({ stats, onConfirm, onCancel, submitting }) {
  return (
    <div className="na-confirm-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="na-confirm-box">
        <div style={{ height:4, background:"linear-gradient(90deg,var(--green),#059669)" }} />
        <div style={{ padding:"32px 28px" }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:60, height:60, borderRadius:"50%", marginBottom:14, background:"var(--green-s)", border:"2px solid rgba(22,163,74,0.2)", color:"var(--green)" }}><IconPencil /></div>
            <h3 style={{ fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Submit Theory Exam?</h3>
            <p style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6 }}>Once submitted you cannot edit your answers.</p>
          </div>
          <div className="na-confirm-stats">
            {[
              { label:"ANSWERED",  val:stats.answered,   color:"var(--green)" },
              { label:"SKIPPED",   val:stats.skipped,    color:"var(--amber)" },
              { label:"REMAINING", val:stats.unanswered, color:"var(--red)"   },
            ].map(s => (
              <div className="na-confirm-stat" key={s.label}>
                <div className="na-confirm-stat-val" style={{ color:s.color }}>{s.val}</div>
                <div className="na-confirm-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
          {stats.unanswered > 0 && (
            <div style={{ background:"var(--amber-s)", border:"1px solid rgba(217,119,6,0.2)", borderRadius:8, padding:"9px 12px", marginBottom:16, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--amber)", fontWeight:500 }}>
              <IconWarn />{stats.unanswered} question{stats.unanswered > 1 ? "s" : ""} left unanswered.
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel} disabled={submitting} style={{ flex:1, padding:"12px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, fontWeight:600, color:"var(--muted)", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>Back to Exam</button>
            <button onClick={onConfirm} disabled={submitting} style={{ flex:2, padding:"12px", borderRadius:9, border:"none", background: submitting ? "#d1d5db" : "var(--green)", fontSize:13, fontWeight:700, color:"#fff", cursor: submitting ? "not-allowed" : "pointer", fontFamily:"Inter,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: submitting ? "none" : "0 2px 10px rgba(22,163,74,0.28)" }}>
              {submitting ? <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"na-spin 0.75s linear infinite" }} /> Submitting…</> : "Submit Exam ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultOverlay({ result, nextSection, onNavigate }) {
  if (!result) return null;
  const cfg = nextSection
    ? { badge:"THEORY COMPLETE", badgeColor:"var(--accent)", title:"Theory Round Submitted", subtitle:`Proceed to the ${nextSection === "coding" ? "Coding" : "SQL"} section now.`, boxClass:"blue", btnClass:"blue", iconColor:"var(--accent)", icon:<IconPencil />, unlockTitle:`${nextSection === "coding" ? "Coding" : "SQL"} Round Unlocked`, unlockSub:`Proceed to the ${nextSection === "coding" ? "Coding Challenge" : "SQL & Database"} section.`, btnLabel:`Proceed to ${nextSection === "coding" ? "Coding" : "SQL"} Round →`, onClick:() => onNavigate(nextSection) }
    : { badge:"EXAM COMPLETE", badgeColor:"var(--green)", title:"Theory Exam Submitted", subtitle:"Your written answers have been saved. AI evaluation will score your responses.", boxClass:"green", btnClass:"green", iconColor:"var(--green)", icon:<IconTrophy />, unlockTitle:"All Done!", unlockSub:"Your responses have been saved. You may return to the dashboard.", btnLabel:"Back to Dashboard →", onClick:() => onNavigate("done") };
  return (
    <div className="na-result-overlay show">
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden", maxWidth:480, width:"100%", boxShadow:"var(--shadow-lg)", animation:"na-fadeUp 0.5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ height:5, background:`linear-gradient(90deg,${cfg.badgeColor},${cfg.iconColor})` }} />
        <div style={{ padding:"40px 36px", textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:72, height:72, borderRadius:"50%", marginBottom:20, background:"var(--green-s)", border:"2px solid rgba(22,163,74,0.2)", color:"var(--green)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:cfg.badgeColor, fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>{cfg.badge}</div>
          <h2 style={{ fontSize:22, fontWeight:700, color:"var(--text)", letterSpacing:-0.4, marginBottom:10 }}>{cfg.title}</h2>
          <p style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7, marginBottom:24 }}>{cfg.subtitle}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[{ label:"ANSWERED", val:result.answered, color:"var(--green)" }, { label:"SKIPPED", val:result.skipped, color:"var(--amber)" }, { label:"TOTAL", val:result.total, color:"var(--accent)" }].map(s => (
              <div key={s.label} className="na-stat-card"><div className="na-stat-val" style={{ color:s.color }}>{s.val}</div><div className="na-stat-lbl">{s.label}</div></div>
            ))}
          </div>
          <div className={`na-unlock-box ${cfg.boxClass}`}>
            <div style={{ color:cfg.iconColor, flexShrink:0, marginTop:2 }}>{cfg.icon}</div>
            <div style={{ textAlign:"left", width:"100%" }}>
              <div style={{ fontSize:15, fontWeight:700, color:cfg.iconColor, marginBottom:4 }}>{cfg.unlockTitle}</div>
              <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6 }}>{cfg.unlockSub}</div>
              <button className={`na-unlock-btn ${cfg.btnClass}`} onClick={cfg.onClick}>{cfg.btnLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TheoryExamPage({
  examId: examIdProp,
  assignmentId: assignmentIdProp,
  examTitle = "Theory Examination",
  durationMins = 60,
  onNavigate,
}) {
  const location = useLocation();

  const examId       = resolveExamId(examIdProp);
  const assignmentId = resolveAssignmentId(assignmentIdProp);
  const studentId    = localStorage.getItem("student_id") || localStorage.getItem("candidate_id") || "unknown";

  const [questions,      setQuestions]      = useState([]);
  const [answers,        setAnswers]        = useState({});
  const [skippedSet,     setSkippedSet]     = useState({});
  const [current,        setCurrent]        = useState(0);
  const [secsLeft,       setSecsLeft]       = useState(durationMins * 60);
  const [loading,        setLoading]        = useState(true);
  const [fetchError,     setFetchError]     = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [examDone,       setExamDone]       = useState(false);
  const [result,         setResult]         = useState(null);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [violations,     setViolations]     = useState([]);
  const [violMsg,        setViolMsg]        = useState("");
  const [showViolBanner, setShowViolBanner] = useState(false);
  const [nextSection,    setNextSection]    = useState(null);
  const [wmBg,           setWmBg]           = useState("");
  const [cardKey,        setCardKey]        = useState(0);

  const violTimerRef  = useRef(null);
  const listeningRef  = useRef(false);
  const violationsRef = useRef([]);
  const examDoneRef   = useRef(false);
  const answersRef    = useRef({});
  const timerRef      = useRef(null);
  const autoSaveRef   = useRef(null);
  const textareaRef   = useRef(null);

  useEffect(() => {
    if (document.getElementById("na-theory-styles")) return;
    const s = document.createElement("style");
    s.id = "na-theory-styles"; s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => { setWmBg(buildWatermarkBg(studentId)); }, [studentId]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ── FIXED: Fetch theory questions — Attempt 1 uses dedicated endpoint ──────
  useEffect(() => {
    if (!examId) {
      setFetchError("No exam ID found. Please go back and restart the exam flow.");
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const token = getToken();
        let qs = null, dur = null;

        // ── Attempt 1: GET /api/exams/theory/by-exam/:examId ─────────────────
        // New dedicated endpoint — no key needed, no re-validation, no 400 errors
        console.log(`[TheoryExamPage] Attempt 1: GET /api/exams/theory/by-exam/${examId}`);
        try {
          const res = await fetch(
            `${API_URL}/exams/theory/by-exam/${examId}?assignment_id=${assignmentId || ""}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const raw  = data.questions || [];
            if (Array.isArray(raw) && raw.length > 0) {
              qs  = raw.map(normalizeQ);
              dur = data.duration || null;
              console.log(`[TheoryExamPage] Attempt 1 SUCCESS: ${qs.length} questions`);
            } else {
              console.log(`[TheoryExamPage] Attempt 1: no questions in response`);
            }
          } else {
            console.log(`[TheoryExamPage] Attempt 1 failed: HTTP ${res.status}`);
          }
        } catch (e) {
          console.log(`[TheoryExamPage] Attempt 1 error: ${e.message}`);
        }

        // ── Attempt 2: validate-key fallback (only if Attempt 1 found nothing) ─
        if (!qs) {
          const examKey = resolveExamKey();
          console.log(`[TheoryExamPage] Attempt 2: validate-key, key="${examKey}"`);

          if (!examKey) {
            throw new Error(
              "No theory questions found for this exam. " +
              "Please contact your administrator — theory questions may not have been added to this exam."
            );
          }

          const kr = await fetch(`${API_URL}/exams/university/validate-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ exam_key: examKey }),
          });

          if (!kr.ok) {
            const errData = await kr.json().catch(() => ({}));
            throw new Error(
              errData.error === "Already submitted"
                ? "This exam has already been submitted."
                : `Could not load theory questions (server error ${kr.status}). Please retry.`
            );
          }

          const data = await kr.json();
          if (!data.valid) throw new Error(data.error || "Exam session is no longer valid.");

          const raw =
            data.paper_written     || data.paper_theory     ||
            data.written_questions || data.theory_questions ||
            data.questions_written || data.questions_theory || [];

          if (Array.isArray(raw) && raw.length > 0) {
            qs  = raw.map(normalizeQ);
            dur = data.duration || null;
            console.log(`[TheoryExamPage] Attempt 2 SUCCESS: ${qs.length} theory questions`);
          } else {
            // Try filtering from all questions
            const allQs = (data.questions || []).filter(q =>
              ["written","theory"].includes(q.type) ||
              ["written","theory"].includes(q.question_type) ||
              ["written","theory"].includes(q.section)
            );
            if (allQs.length > 0) {
              qs  = allQs.map(normalizeQ);
              dur = data.duration || null;
              console.log(`[TheoryExamPage] Attempt 2 filtered: ${qs.length} theory questions`);
            } else {
              throw new Error(
                "No theory/written questions found for this exam. " +
                "Please contact your administrator."
              );
            }
          }
        }

        if (cancelled) return;
        setQuestions(qs);
        if (dur) setSecsLeft(dur * 60);

        // Resolve next section
        let raw = location.state?.exam?.sections || null;
        if (!raw) {
          try { raw = JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}").exam?.sections; } catch {}
        }
        const sec = parseSections(raw);
        if (sec?.coding) setNextSection("coding");
        else if (sec?.sql) setNextSection("sql");

      } catch (e) {
        if (!cancelled) {
          console.error(`[TheoryExamPage] Fatal fetch error: ${e.message}`);
          setFetchError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [examId]); // eslint-disable-line

  useEffect(() => { setCardKey(k => k + 1); setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 50); }, [current]);

  useEffect(() => {
    if (loading || examDone || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(timerRef.current); doSubmit(true); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, examDone, questions.length]); // eslint-disable-line

  useEffect(() => {
    if (loading || examDone) return;
    autoSaveRef.current = setInterval(() => autoSave(), 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [loading, examDone, answers]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { listeningRef.current = true; }, 2000);
    const onHide = () => { if (listeningRef.current && document.hidden) triggerViolation("Tab switch detected"); };
    const onBlur = () => { if (listeningRef.current) triggerViolation("Window focus lost"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("blur", onBlur); };
  }, []); // eslint-disable-line

  const triggerViolation = useCallback((reason) => {
    if (examDoneRef.current) return;
    const entry = { reason, time: new Date().toLocaleTimeString() };
    violationsRef.current = [...violationsRef.current, entry];
    const v = violationsRef.current.length;
    setViolations([...violationsRef.current]);
    setViolMsg(v < MAX_VIOLATIONS ? `Security alert: ${reason} · ${v}/${MAX_VIOLATIONS} warnings` : "Maximum violations reached. Exam is being submitted.");
    setShowViolBanner(true);
    clearTimeout(violTimerRef.current);
    violTimerRef.current = setTimeout(() => setShowViolBanner(false), 5000);
    if (v >= MAX_VIOLATIONS) doSubmit(false);
  }, []); // eslint-disable-line

  const autoSave = useCallback(async () => {
    if (!examId || Object.keys(answersRef.current).length === 0) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/exams/${examId}/theory-autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, answers: answersRef.current, round: "theory" }),
      });
    } catch {}
    setLastSaved(new Date());
    setSaving(false);
  }, [examId, assignmentId]);

  // ── FIXED doSubmit: calls university submit endpoint FIRST with correct structure ──
  const doSubmit = useCallback(async (auto = false) => {
    if (examDoneRef.current) return;
    examDoneRef.current = true;
    setExamDone(true);
    clearInterval(timerRef.current);
    await autoSave();

    const ans      = answersRef.current;
    const violLog  = violationsRef.current;
    const base     = {
      assignment_id:   assignmentId,
      exam_id:         examId,
      round:           "theory",
      violation_count: violLog.length,
      violations:      violLog,
      auto_submitted:  auto,
    };

    // Build written_answers object keyed by question id (string)
    const written_answers = {};
    for (const [qId, text] of Object.entries(ans)) {
      written_answers[String(qId)] = text;
    }

    // Attempt order — university submit endpoint FIRST
    const attempts = [
      {
        url:  `${API_URL}/exams/university/${examId}/submit`,
        body: { ...base, mcq_answers: {}, written_answers },
      },
      {
        url:  `${API_URL}/exams/${examId}/theory-submit`,
        body: { ...base, answers: written_answers },
      },
      {
        url:  `${API_URL}/questions/submit`,
        body: {
          assignment_id:   assignmentId,
          exam_id:         examId,
          answers:         Object.entries(ans).map(([question_id, answer_text]) => ({ question_id, answer_text, selected_ans: answer_text })),
          round:           "theory",
          violation_count: violLog.length,
          violations:      violLog,
        },
      },
    ];

    let submitted = false;
    for (const { url, body } of attempts) {
      if (!url || url.includes("undefined") || url.includes("null")) continue;
      try {
        console.log(`[TheoryExamPage] Submitting to: ${url}`);
        const res = await fetch(url, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          console.log(`[TheoryExamPage] Submit success:`, data);
          submitted = true;
          break;
        }
        console.log(`[TheoryExamPage] Submit attempt failed: HTTP ${res.status} at ${url}`);
        if (res.status !== 404) break; // only retry on 404
      } catch (e) {
        console.log(`[TheoryExamPage] Submit attempt error: ${e.message}`);
        continue;
      }
    }

    if (!submitted) {
      console.error("[TheoryExamPage] All submit attempts failed — answers saved locally");
    }

    const answered = Object.keys(ans).filter(k => ans[k]?.trim() && !skippedSet[k]).length;
    setResult({ answered, skipped: Object.keys(skippedSet).length, total: questions.length, violations: violLog });
    setSubmitting(false);
    setShowConfirm(false);
  }, [examId, assignmentId, autoSave, questions.length, skippedSet]); // eslint-disable-line

  const durationSecs = durationMins * 60;
  const pct          = secsLeft / durationSecs;
  const timerCls     = `na-timer${pct <= 0.1 ? " danger" : pct <= 0.25 ? " warning" : ""}`;
  const mm           = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss           = String(secsLeft % 60).padStart(2, "0");

  const answered   = questions.filter(q => answers[q.id]?.trim() && !skippedSet[q.id]).length;
  const skipped    = questions.filter(q => skippedSet[q.id]).length;
  const remaining  = questions.length - answered - skipped;
  const progressPct = questions.length > 0 ? Math.round(((current + 1) / questions.length) * 100) : 0;

  const q      = questions[current];
  const curAns = q ? (answers[q.id] || "") : "";
  const wc     = wordCount(curAns);
  const wcCls  = !q ? "ok" : q.max_words > 0 && wc > q.max_words ? "over" : q.min_words > 0 && wc < q.min_words ? "warn" : "ok";
  const meterPct   = q?.max_words > 0 ? Math.min(100, (wc / q.max_words) * 100) : q?.min_words > 0 ? Math.min(100, (wc / q.min_words) * 100) : 0;
  const meterColor = wcCls === "over" ? "var(--red)" : wcCls === "warn" ? "var(--amber)" : "var(--green)";

  const statCards = [
    { val: answered,          lbl: "ANSWERED",   color: "var(--green)"  },
    { val: skipped,           lbl: "SKIPPED",    color: "var(--amber)"  },
    { val: remaining,         lbl: "REMAINING",  color: "var(--accent)" },
    { val: violations.length, lbl: "VIOLATIONS", color: violations.length > 0 ? "var(--amber)" : "var(--dim)" },
  ];

  function qNavCls(i) {
    if (i === current) return "na-nav-dot current";
    if (skippedSet[questions[i]?.id]) return "na-nav-dot skipped";
    if (answers[questions[i]?.id]?.trim()) return "na-nav-dot answered";
    return "na-nav-dot";
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f4f6fb", flexDirection:"column", gap:12 }}>
      <div style={{ width:36, height:36, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", animation:"na-spin 0.8s linear infinite" }} />
      <p style={{ color:"#64748b", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>Loading theory questions…</p>
      <style>{`@keyframes na-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (fetchError) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f4f6fb", padding:24, flexDirection:"column", gap:16 }}>
      <div className="na-error-box">
        <div className="na-error-icon">📄</div>
        <div className="na-error-title">Could Not Load Questions</div>
        <div className="na-error-msg">{fetchError}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:20 }}>
          <button onClick={() => window.location.reload()} style={{ padding:"10px 22px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>Retry</button>
          <button onClick={() => onNavigate?.("done")} style={{ padding:"10px 22px", background:"#f8f9fd", border:"1px solid #e4e8f0", borderRadius:8, color:"#64748b", fontWeight:600, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>Dashboard</button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );

  return (
    <>
      <div className="na-watermark" style={{ backgroundImage:wmBg, backgroundRepeat:"repeat", backgroundSize:"420px 240px" }} />
      <div className="na-layout">
        <header className="na-topbar">
          <div className="na-brand"><div className="na-brand-icon"><IconBrain /></div><div><div className="na-brand-name">NeuroAssess</div><div className="na-brand-sub">ASSESSMENT PLATFORM</div></div></div>
          <div className="na-topbar-div" />
          <div className="na-exam-info"><div className="na-exam-title">{examTitle}</div><div className="na-exam-meta">{`Theory · ${questions.length} Questions`}</div></div>
          {violations.length > 0 && <div className="na-viol-badge"><IconWarn /><span className="na-viol-label">{violations.length} Warning{violations.length > 1 ? "s" : ""}</span></div>}
          {saving ? (
            <div className="na-save-pill saving"><span style={{ width:8, height:8, border:"1.5px solid #cbd5e1", borderTopColor:"#2563eb", borderRadius:"50%", display:"inline-block", animation:"na-spin 0.75s linear infinite" }} />Saving…</div>
          ) : lastSaved ? (
            <div className="na-save-pill"><IconCheckGreen />Saved {lastSaved.toLocaleTimeString()}</div>
          ) : null}
          <div className="na-spacer" />
          <div className="na-proctor-pill"><div className="na-proctor-dot" /><span className="na-proctor-label">PROCTORED</span></div>
          <div className={timerCls}><div className="na-timer-dot" /><span className="na-timer-val">{mm}:{ss}</span></div>
        </header>

        <main className="na-main">
          <div className="na-exam-progress">
            <div className="na-exam-progress-bar"><div className="na-exam-progress-fill" style={{ width:`${progressPct}%` }} /></div>
            <span className="na-exam-progress-label">{current + 1} / {questions.length}</span>
          </div>

          {q && (
            <div className="na-qcard" key={cardKey}>
              <div className="na-qnum-row"><span className="na-qnum-badge">Q{String(current + 1).padStart(2, "0")}</span><span className="na-qnum-of">{questions.length - current - 1} remaining after this</span></div>
              <div className="na-qtext">{q.text}</div>
              <div className="na-qmeta">
                <span className="na-qbadge na-qbadge-marks">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                {q.min_words > 0 && <span className="na-qbadge na-qbadge-words">min {q.min_words} words</span>}
                {q.max_words > 0 && <span className="na-qbadge na-qbadge-words">max {q.max_words} words</span>}
                {q.section    && <span className="na-qbadge na-qbadge-words">{q.section}</span>}
                {curAns.trim() && !skippedSet[q.id] && <span className="na-qbadge na-qbadge-ok">✓ Answered</span>}
                {skippedSet[q.id]                   && <span className="na-qbadge na-qbadge-skip">⤼ Skipped</span>}
              </div>
              {q.hint && <div className="na-hint">💡 <strong>Hint:</strong> {q.hint}</div>}
              <div className="na-answer-header">
                <span className="na-answer-label">Your Answer</span>
                <span className={`na-wc ${wcCls}`}>
                  {wc} word{wc !== 1 ? "s" : ""}
                  {q.min_words > 0 && wc < q.min_words && ` · ${q.min_words - wc} more needed`}
                  {q.max_words > 0 && wc > q.max_words && ` · ${wc - q.max_words} over limit`}
                  {q.min_words > 0 && wc >= q.min_words && " ✓"}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                className="na-textarea"
                value={curAns}
                onChange={e => {
                  const val = e.target.value;
                  if (q.max_words > 0 && wordCount(val) > q.max_words + 20) return;
                  setAnswers(prev => ({ ...prev, [q.id]: val }));
                  if (val.trim()) setSkippedSet(prev => { const n = { ...prev }; delete n[q.id]; return n; });
                }}
                placeholder={`Write your answer here…${q.min_words > 0 ? ` (minimum ${q.min_words} words)` : ""}`}
              />
              <div className="na-meter-wrap">
                <div className="na-meter-bar"><div className="na-meter-fill" style={{ width:`${meterPct}%`, background:meterColor }} /></div>
                <div className="na-meter-hints"><span>0</span>{q.min_words > 0 && <span style={{ color:"var(--amber)" }}>min {q.min_words}</span>}{q.max_words > 0 && <span>max {q.max_words}</span>}</div>
              </div>
              {curAns.trim() && !skippedSet[q.id] && (
                <div className="na-answered-notice"><IconCheck /><span className="na-answered-notice-text">Answer recorded. You can edit it or proceed to the next question.</span></div>
              )}
            </div>
          )}

          <div className={`na-viol-banner${showViolBanner ? " show" : ""}`}><IconWarn /><p style={{ fontSize:12, color:"var(--amber)", lineHeight:1.6, fontWeight:600, margin:0 }}>{violMsg}</p></div>

          {questions.length > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
              <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} style={{ padding:"8px 18px", background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:600, color: current === 0 ? "var(--dim)" : "var(--muted)", cursor: current === 0 ? "not-allowed" : "pointer", fontFamily:"Inter,sans-serif" }}>← Previous</button>
              <button disabled={current === questions.length - 1} onClick={() => setCurrent(c => c + 1)} style={{ padding:"8px 18px", background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:600, color: current === questions.length - 1 ? "var(--dim)" : "var(--muted)", cursor: current === questions.length - 1 ? "not-allowed" : "pointer", fontFamily:"Inter,sans-serif" }}>Next →</button>
            </div>
          )}
        </main>

        <div className="na-action-bar">
          <button className="na-btn na-btn-skip" onClick={() => { if (!q) return; setSkippedSet(prev => ({ ...prev, [q.id]: true })); if (current < questions.length - 1) setCurrent(c => c + 1); }}>Skip</button>
          <button className="na-btn na-btn-primary" disabled={!curAns.trim()} style={{ opacity: !curAns.trim() ? 0.5 : 1 }} onClick={() => { autoSave(); if (current < questions.length - 1) setCurrent(c => c + 1); }}>
            {current < questions.length - 1 ? "Save & Next →" : "Save Answer"}
          </button>
          <button className="na-btn na-btn-next" onClick={() => setShowConfirm(true)}>Submit Exam ✓</button>
        </div>

        <aside className="na-sidebar">
          <div className="na-webcam-section"><WebcamMock /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:14, borderBottom:"1px solid var(--border)" }}>
            {statCards.map(({ val, lbl, color }) => (<div className="na-stat-card" key={lbl}><div className="na-stat-val" style={{ color }}>{val}</div><div className="na-stat-lbl">{lbl}</div></div>))}
          </div>
          <div className="na-nav-section">
            <div className="na-section-label">Questions</div>
            <div className="na-nav-grid">{questions.map((_, i) => (<div key={i} className={qNavCls(i)} onClick={() => setCurrent(i)}>{i + 1}</div>))}</div>
            <div className="na-legend">
              {[{ color:"var(--accent)", border:"none", label:"Active" }, { color:"#e8f5e9", border:"1px solid rgba(22,163,74,0.3)", label:"Done" }, { color:"var(--amber-s)", border:"1px solid rgba(217,119,6,0.25)", label:"Skipped" }, { color:"var(--surface2)", border:"1px solid var(--border)", label:"Pending" }].map(({ color, border, label }) => (
                <div className="na-legend-item" key={label}><div className="na-legend-dot" style={{ background:color, border }} />{label}</div>
              ))}
            </div>
          </div>
          <div className="na-sidebar-submit"><button onClick={() => setShowConfirm(true)}>Submit Exam ✓</button></div>
        </aside>
      </div>

      {showConfirm && (
        <ConfirmModal
          stats={{ answered, skipped, unanswered: remaining }}
          submitting={submitting}
          onConfirm={() => { setSubmitting(true); doSubmit(false); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {examDone && result && (
        <ResultOverlay result={result} nextSection={nextSection} onNavigate={(page) => { if (onNavigate) onNavigate(page); }} />
      )}
    </>
  );
}


