// frontend/src/pages/ExamPage.jsx
// Merged: Stable fetch logic (old working) + AI Proctoring + University/Certification modes
// FIX: Questions always an array, sections parsed safely, result overlay adapts to exam type

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ── Optional AI Proctoring (gracefully absent if hook not present) ──────────
let useAIProctoring = null;
let ProctoringOverlay = null;
try {
  useAIProctoring  = require("../hooks/useAIProctoring").useAIProctoring;
  ProctoringOverlay = require("./ProctoringOverlay").default;
} catch { /* hook not available — static webcam mock will be used */ }

// ── Static fallback questions ─────────────────────────────────────────────
let STATIC_MCQ_QUESTIONS = [];
try {
  STATIC_MCQ_QUESTIONS = require("../data/staticExamData").STATIC_MCQ_QUESTIONS || [];
} catch { /* no static data file */ }

/* ── Leaflet CSS (for location, if used) ── */
if (!document.getElementById("leaflet-css")) {
  const l = document.createElement("link");
  l.id = "leaflet-css"; l.rel = "stylesheet";
  l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(l);
}
if (!document.getElementById("na-fonts")) {
  const l = document.createElement("link");
  l.id = "na-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

// ── CSS (same as old working version) ────────────────────────────────────
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
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06);
}
html, body { height: 100%; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }
.na-layout { display: grid; grid-template-rows: 60px 1fr; grid-template-columns: 1fr 288px; height: 100vh; }
.na-topbar { grid-column: 1 / -1; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 14px; z-index: 50; box-shadow: var(--shadow-sm); }
.na-brand { display: flex; align-items: center; gap: 10px; }
.na-brand-icon { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg, #2563eb, #4f46e5); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(37,99,235,0.28); }
.na-brand-name { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.na-brand-sub  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.6px; margin-top: 1px; }
.na-topbar-div { width: 1px; height: 26px; background: var(--border); flex-shrink: 0; }
.na-exam-info { display: flex; flex-direction: column; }
.na-exam-title { font-size: 12px; font-weight: 600; color: var(--text2); }
.na-exam-meta  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
.na-spacer { flex: 1; }
.na-proctor-pill { display: flex; align-items: center; gap: 6px; background: var(--green-s); border: 1px solid rgba(22,163,74,0.18); border-radius: 100px; padding: 5px 12px; }
.na-proctor-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: na-pulse 2s ease infinite; }
.na-proctor-label { font-size: 10px; font-weight: 700; color: var(--green); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.8px; }
.na-viol-badge { display: flex; align-items: center; gap: 6px; background: var(--amber-s); border: 1px solid rgba(217,119,6,0.2); border-radius: 100px; padding: 5px 11px; }
.na-viol-label { font-size: 10px; font-weight: 700; color: var(--amber); font-family: 'JetBrains Mono', monospace; }
.na-timer { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 100px; padding: 6px 16px; transition: all 0.4s; }
.na-timer.warning { background: var(--amber-s); border-color: rgba(217,119,6,0.3); }
.na-timer.danger  { background: var(--red-s);   border-color: rgba(220,38,38,0.3); animation: na-timer-pulse 1s ease infinite; }
.na-timer-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: na-ping 2s ease infinite; transition: background 0.4s; }
.na-timer.warning .na-timer-dot { background: var(--amber); }
.na-timer.danger  .na-timer-dot { background: var(--red); }
.na-timer-val { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; color: var(--green); letter-spacing: 2.5px; transition: color 0.4s; }
.na-timer.warning .na-timer-val { color: var(--amber); }
.na-timer.danger  .na-timer-val { color: var(--red); }
.na-main { overflow-y: auto; padding: 32px 40px 110px; position: relative; background: var(--bg); }
.na-exam-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.na-exam-progress-bar { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
.na-exam-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), #4f46e5); transition: width 0.5s cubic-bezier(.4,0,.2,1); }
.na-exam-progress-label { font-size: 11px; font-weight: 600; color: var(--muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
.na-qcard { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-md); animation: na-fadeUp 0.35s cubic-bezier(.22,1,.36,1); }
.na-qnum-row { padding: 20px 28px 0; display: flex; align-items: center; justify-content: space-between; }
.na-qnum-badge { background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: var(--accent); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; }
.na-qnum-of    { font-size: 11px; color: var(--dim); font-family: 'JetBrains Mono', monospace; font-weight: 500; }
.na-qtext      { padding: 18px 28px 22px; font-size: 17px; font-weight: 600; color: var(--text); line-height: 1.55; letter-spacing: -0.2px; }
.na-options { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 8px; }
.na-opt { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 10px; padding: 13px 16px; font-size: 14px; font-weight: 400; color: var(--text2); font-family: 'Inter', sans-serif; transition: all 0.15s ease; position: relative; }
.na-opt:hover:not(.disabled) { background: var(--accent-s); border-color: rgba(37,99,235,0.3); color: var(--accent); }
.na-opt.selected { background: var(--accent-s); border-color: rgba(37,99,235,0.45); color: var(--accent); font-weight: 500; box-shadow: 0 0 0 3px rgba(37,99,235,0.07); }
.na-opt.locked { cursor: default; }
.na-opt.locked.selected { background: var(--accent-s); border-color: rgba(37,99,235,0.45); color: var(--accent); }
.na-opt-letter { width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0; background: #e8edf5; color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; transition: all 0.15s; }
.na-opt.selected .na-opt-letter { background: var(--accent); color: #fff; }
.na-opt.locked.selected .na-opt-letter { background: var(--accent); color: #fff; }
.na-answered-notice { margin: 0 24px 20px; background: #f0f4ff; border: 1px solid rgba(37,99,235,0.15); border-radius: 10px; padding: 11px 14px; display: flex; align-items: center; gap: 9px; animation: na-fadeUp 0.3s ease; }
.na-answered-notice-text { font-size: 12.5px; font-weight: 500; color: var(--accent); line-height: 1.5; }
.na-viol-banner { display: none; margin-top: 14px; background: var(--amber-s); border: 1.5px solid rgba(217,119,6,0.25); border-radius: 10px; padding: 11px 16px; align-items: flex-start; gap: 9px; }
.na-viol-banner.show { display: flex; }
.na-action-bar { position: fixed; bottom: 0; left: 0; right: 289px; background: rgba(244,246,251,0.96); backdrop-filter: blur(14px); border-top: 1px solid var(--border); padding: 14px 40px; display: flex; gap: 10px; align-items: center; z-index: 50; }
.na-btn { padding: 11px 22px; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: all 0.15s; }
.na-btn-primary { flex: 1; padding: 12px; background: var(--accent); color: #fff; font-size: 14px; box-shadow: 0 2px 10px rgba(37,99,235,0.28); }
.na-btn-primary:hover    { background: #1d4ed8; }
.na-btn-primary:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }
.na-btn-next { flex: 1; padding: 12px; background: #0f172a; color: #fff; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
.na-btn-next:hover { background: #1e293b; }
.na-sidebar { background: var(--surface); border-left: 1px solid var(--border); overflow-y: auto; display: flex; flex-direction: column; }
.na-webcam-section { padding: 16px 14px 14px; border-bottom: 1px solid var(--border); }
.na-section-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; text-transform: uppercase; }
.na-webcam-box { background: #0f172a; border-radius: 10px; overflow: hidden; aspect-ratio: 4/3; position: relative; }
.na-webcam-inner { width: 100%; height: 100%; background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%); position: relative; overflow: hidden; }
.na-sil { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 90px; height: 120px; }
.na-sil-head { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.10); margin: 0 auto 4px; }
.na-sil-body { width: 72px; height: 72px; border-radius: 50% 50% 0 0; background: rgba(255,255,255,0.07); margin: 0 auto; }
.na-webcam-overlay { position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.45); border-radius: 5px; padding: 3px 7px; }
.na-webcam-rec { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: na-pulse 1.5s ease infinite; }
.na-webcam-rec-label { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.75); font-family: 'JetBrains Mono', monospace; letter-spacing: 1px; }
.na-webcam-status { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.na-webcam-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: na-pulse 2s ease infinite; }
.na-webcam-active { font-size: 9px; color: var(--green); font-family: 'JetBrains Mono', monospace; font-weight: 700; letter-spacing: 0.5px; }
.na-webcam-face { font-size: 9px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }
.na-nav-section { padding: 14px; border-bottom: 1px solid var(--border); }
.na-nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.na-nav-dot { aspect-ratio: 1; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; border: 1.5px solid var(--border); background: var(--surface2); color: var(--dim); transition: all 0.12s; }
.na-nav-dot.current  { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.3); }
.na-nav-dot.answered { background: #e8f5e9; border-color: rgba(22,163,74,0.3); color: var(--green); }
.na-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.na-legend-item { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }
.na-legend-dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
.na-watermark { position: fixed; top: 60px; left: 0; right: 288px; bottom: 0; pointer-events: none; z-index: 40; }
.na-shake { animation: na-shake 0.4s ease !important; }
.na-result-overlay { display: none; position: fixed; inset: 0; background: rgba(244,246,251,0.97); backdrop-filter: blur(18px); z-index: 200; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; }
.na-result-overlay.show { display: flex; }
.na-unlock-box { border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; animation: na-fadeUp 0.4s ease; }
.na-unlock-box.green  { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid rgba(22,163,74,0.25); }
.na-unlock-box.purple { background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 1.5px solid rgba(124,58,237,0.25); }
.na-unlock-box.blue   { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1.5px solid rgba(37,99,235,0.25); }
.na-unlock-btn { margin-top: 12px; padding: 12px 24px; border-radius: 8px; border: none; font-size: 14px; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.15); transition: all 0.15s; display: inline-block; width: 100%; color: #fff; }
.na-unlock-btn.green  { background: var(--green); }
.na-unlock-btn.green:hover  { background: #15803d; transform: translateY(-1px); }
.na-unlock-btn.purple { background: var(--purple); }
.na-unlock-btn.purple:hover { background: #6d28d9; transform: translateY(-1px); }
.na-unlock-btn.blue   { background: var(--accent); }
.na-unlock-btn.blue:hover   { background: #1d4ed8; transform: translateY(-1px); }
.na-stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 10px; text-align: center; }
.na-stat-val { font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; line-height: 1; margin-bottom: 4px; }
.na-stat-lbl { font-size: 8px; font-weight: 700; letter-spacing: 1.2px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }
.na-error-box { background: var(--red-s); border: 1.5px solid rgba(220,38,38,0.25); border-radius: 12px; padding: 28px 32px; max-width: 520px; text-align: center; }
.na-error-icon  { font-size: 40px; margin-bottom: 12px; }
.na-error-title { font-size: 18px; font-weight: 700; color: var(--red); margin-bottom: 8px; }
.na-error-msg   { font-size: 13px; color: #7f1d1d; line-height: 1.7; }
@keyframes na-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes na-ping   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.3); } }
@keyframes na-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes na-shake  { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-5px); } 40%,80% { transform:translateX(5px); } }
@keyframes na-timer-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.2); } 50% { box-shadow:0 0 0 6px rgba(220,38,38,0); } }
@keyframes na-spin { to { transform:rotate(360deg); } }
`;

// ── Constants ─────────────────────────────────────────────────────────────
const API_URL = (() => {
  try { return import.meta.env?.VITE_API_URL || "http://localhost:5000"; }
  catch { return "http://localhost:5000"; }
})();

const MAX_VIOLATIONS = 3;
const LETTERS        = ["A", "B", "C", "D"];

// ── Helpers ───────────────────────────────────────────────────────────────
async function safeApiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const ct  = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Server returned non-JSON (HTTP ${res.status}). URL: ${url}`);
  }
  return res.json();
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

// FIX: safe sections parser — handles string, object, or null
function parseSections(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function buildWatermarkBg(roll) {
  const W = 420, H = 240, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-28 * Math.PI / 180);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillStyle = "rgba(37,99,235,0.09)";
  ctx.fillText("NEUROASSESS", 0, -14);
  ctx.font = "500 13px Arial, sans-serif";
  ctx.fillStyle = "rgba(37,99,235,0.07)";
  ctx.fillText(roll || "", 0, 10);
  ctx.restore();
  return `url(${c.toDataURL()})`;
}

// ── Detect exam mode from all available sources ───────────────────────────
function detectExamMode(routeState, routeExam) {
  if (routeState.isUniversity || routeExam.exam_type === "university") return "university";
  try {
    const f = JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}");
    if (f.isUniversity) return "university";
  } catch {}
  if (routeExam.exam_type === "skill_cert" || routeExam.exam_type === "certification") return "certification";
  if (routeState.isCertification) return "certification";
  return "placement";
}

// ── Icons (same as before) ────────────────────────────────────────────────
const IconBrain = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/></svg>);
const IconCheck = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>);
const IconWarn = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
const IconDB = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>);
const IconPencil = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const IconTrophy = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 4H4v2a3 3 0 0 0 3 3"/><path d="M17 4h3v2a3 3 0 0 1-3 3"/></svg>);

// ── Static webcam mock ────────────────────────────────────────────────────
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
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div className="na-webcam-dot" /><span className="na-webcam-active">ACTIVE</span></div>
        <span className="na-webcam-face">Face detected</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT OVERLAY (exam‑mode aware, same as in the new version)
// ─────────────────────────────────────────────────────────────────────────────
function ResultOverlay({ result, examMode, sections, onNavigate }) {
  if (!result) return null;
  const parsedSections = parseSections(sections);
  const getNextSection = () => {
    if (examMode === "certification") return null;
    if (examMode === "university") {
      const hasTheory = !!(parsedSections?.theory || parsedSections?.written);
      if (hasTheory) return "theory";
      if (parsedSections?.coding) return "coding";
      if (parsedSections?.sql) return "sql";
      return null;
    }
    const hasSQL = parsedSections?.sql === true || parsedSections?.sql === 1;
    const hasCoding = parsedSections?.coding === true || parsedSections?.coding === 1;
    if (hasSQL) return "sql";
    if (hasCoding) return "coding";
    return null;
  };
  const nextSection = getNextSection();
  const config = {
    theory: { badge: "MCQ COMPLETE", badgeColor: "var(--purple)", title: "MCQ Round Submitted", subtitle: "Proceed to Written Theory.", boxClass: "purple", btnClass: "purple", iconColor: "var(--purple)", icon: <IconPencil />, unlockTitle: "Theory Round Unlocked", unlockSub: "Proceed to Written / Theory Questions", btnLabel: "Proceed to Theory Round →", onClick: () => onNavigate("theory") },
    sql: { badge: "ROUND 1 COMPLETE", badgeColor: "var(--green)", title: "MCQ Round Submitted", subtitle: "Proceed to SQL Round.", boxClass: "green", btnClass: "green", iconColor: "var(--green)", icon: <IconDB />, unlockTitle: "SQL Round Unlocked", unlockSub: "Proceed to Round 2 — SQL", btnLabel: "Proceed to SQL Round →", onClick: () => onNavigate("sql") },
    coding: { badge: "ROUND 1 COMPLETE", badgeColor: "var(--green)", title: "MCQ Round Submitted", subtitle: "Proceed to Coding Round.", boxClass: "blue", btnClass: "blue", iconColor: "var(--accent)", icon: <IconDB />, unlockTitle: "Coding Round Unlocked", unlockSub: "Proceed to Round 2 — Coding", btnLabel: "Proceed to Coding Round →", onClick: () => onNavigate("coding") },
    done: { badge: examMode === "certification" ? "ASSESSMENT COMPLETE" : "EXAM COMPLETE", badgeColor: "var(--green)", title: examMode === "certification" ? "Certification MCQ Done" : "MCQ Round Submitted", subtitle: examMode === "certification" ? "Certification complete." : "MCQ section recorded.", boxClass: "green", btnClass: "green", iconColor: "var(--green)", icon: <IconTrophy />, unlockTitle: "All Done!", unlockSub: "Responses saved.", btnLabel: examMode === "certification" ? "Go to Dashboard →" : "Back to Dashboard →", onClick: () => onNavigate("done") },
  };
  const cfg = config[nextSection ?? "done"];
  return (
    <div className="na-result-overlay show">
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, maxWidth: 480, width: "100%", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 5, background: `linear-gradient(90deg,${cfg.badgeColor},${cfg.iconColor})` }} />
        <div style={{ padding: "40px 36px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: "50%", marginBottom: 20, background: "#f0fdf4", border: "2px solid rgba(22,163,74,0.2)", color: "var(--green)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: cfg.badgeColor, fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>{cfg.badge}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{cfg.title}</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>{cfg.subtitle}</p>
          {result.violations?.length > 0 && (
            <div style={{ background: "var(--amber-s)", borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amber)", marginBottom: 6 }}>{result.violations.length} PROCTORING WARNING{result.violations.length > 1 ? "S" : ""} RECORDED</div>
              {result.violations.map((v, i) => (<div key={i} style={{ fontSize: 12, color: "#92400e", marginBottom: 3 }}><span style={{ fontFamily: "'JetBrains Mono',monospace", opacity: 0.6 }}>{String(i+1).padStart(2,"0")} </span>{v.reason}<span style={{ marginLeft: 8, opacity: 0.6, fontSize: 10 }}>{v.time}</span></div>))}
            </div>
          )}
          <div className={`na-unlock-box ${cfg.boxClass}`}>
            <div style={{ color: cfg.iconColor, flexShrink: 0 }}>{cfg.icon}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: cfg.iconColor, marginBottom: 4 }}>{cfg.unlockTitle}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{cfg.unlockSub}</div>
              <button className={`na-unlock-btn ${cfg.btnClass}`} onClick={cfg.onClick}>{cfg.btnLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT – using the stable fetch logic from old working version
// ─────────────────────────────────────────────────────────────────────────────
export default function ExamPage({
  examId: examIdProp,
  assignmentId: assignmentIdProp,
  onNavigate,
  geoSessionId: geoSessionIdProp = null,
  examTitle: examTitleProp = null,
  durationSecs: durationSecsProp = null,
  locationGranted: _locationGranted = false,
  initialCoords: _initialCoords = null,
}) {
  const location = useLocation();
  const routeExam = location.state?.exam || {};
  const routeState = location.state || {};

  // Resolve IDs (exactly as old working version)
  const examId = examIdProp
    || routeState.examId
    || routeExam.id
    || (() => {
        const univId = localStorage.getItem("univ_exam_id");
        const hiringId = localStorage.getItem("exam_id");
        const v = univId || hiringId;
        return v ? parseInt(v, 10) : null;
      })();

  const assignmentId = assignmentIdProp
    || routeState.assignmentId
    || routeExam.assignment_id
    || localStorage.getItem("univ_assignment_id")
    || localStorage.getItem("assignment_id")
    || null;

  const examTitle = examTitleProp || routeExam.title || "Round 1 — MCQ";
  const durationSecs = durationSecsProp || (routeExam.duration_minutes ? routeExam.duration_minutes * 60 : 30 * 60);
  const studentId = localStorage.getItem("student_id") || localStorage.getItem("candidate_id") || "unknown";
  const examMode = detectExamMode(routeState, routeExam);

  // Persist IDs
  useEffect(() => {
    if (examId) {
      localStorage.setItem("exam_id", String(examId));
      if (examMode === "university") localStorage.setItem("univ_exam_id", String(examId));
    }
    if (assignmentId) {
      localStorage.setItem("assignment_id", String(assignmentId));
      if (examMode === "university") localStorage.setItem("univ_assignment_id", String(assignmentId));
    }
  }, [examId, assignmentId, examMode]);

  // Inject styles
  useEffect(() => {
    if (document.getElementById("na-styles")) return;
    const s = document.createElement("style");
    s.id = "na-styles"; s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  const onNavigateRef = useRef(onNavigate);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);

  const navigate = useCallback((target) => {
    if (examId) localStorage.setItem("exam_id", String(examId));
    if (assignmentId) localStorage.setItem("assignment_id", String(assignmentId));
    if (onNavigateRef.current) onNavigateRef.current(target);
  }, [examId, assignmentId]);

  // ── State ────────────────────────────────────────────────────────────────
  const [QUESTIONS, setQuestions] = useState([]);
  const [sections, setSections] = useState({});
  const [qLoading, setQLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [secsLeft, setSecsLeft] = useState(durationSecs);
  const [violations, setViolations] = useState([]);
  const [violMsg, setViolMsg] = useState("");
  const [showViolBanner, setShowViolBanner] = useState(false);
  const [examDone, setExamDone] = useState(false);
  const [result, setResult] = useState(null);
  const [shakeOpts, setShakeOpts] = useState(false);
  const [wmBg, setWmBg] = useState("");
  const [cardKey, setCardKey] = useState(0);

  const violTimerRef = useRef(null);
  const listeningRef = useRef(false);
  const violationsRef = useRef([]);
  const examDoneRef = useRef(false);
  const answersRef = useRef({});

  // ── AI Proctoring hook ───────────────────────────────────────────────────
  const proctoringHook = (useAIProctoring || (() => ({
    videoRef: { current: null }, canvasRef: { current: null },
    proctoringState: {}, violations: [], isReady: false, modelError: null,
  })))({
    onViolation: (entry) => triggerViolation(entry.message),
    assignmentId, examId, token: getToken(), enabled: !examDone,
  });
  const { videoRef, canvasRef, proctoringState, violations: aiViolations, isReady: procIsReady, modelError } = proctoringHook;
  const hasProctoringOverlay = !!ProctoringOverlay;

  useEffect(() => { setWmBg(buildWatermarkBg(studentId)); }, [studentId]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Geo ping (unchanged)
  useEffect(() => {
    if (!geoSessionIdProp || examDone) return;
    const sendPing = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`${API_URL}/api/location/ping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: geoSessionIdProp, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          }).then(r => r.json()).then(data => { if (data.riskLevel === "high") triggerViolation("Location risk flagged"); }).catch(() => {});
        }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };
    sendPing();
    const interval = setInterval(sendPing, 15000);
    return () => clearInterval(interval);
  }, [geoSessionIdProp, examDone]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH QUESTIONS – using the EXACT logic from the old working version
  // (only added safe normalisation for the response array)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setQLoading(true);
      setFetchError(null);

      try {
        const token = getToken();

        // University branch
        if (examMode === "university") {
          const univFlow = (() => {
            try { return JSON.parse(sessionStorage.getItem("na_univ_exam_flow_v1") || "{}"); }
            catch { return {}; }
          })();

          const examKey =
            univFlow.exam?.exam_key   ||
            univFlow.exam?.verifyCode ||
            routeExam.exam_key        ||
            routeExam.verifyCode      ||
            localStorage.getItem("univ_exam_key") || "";

          if (!examKey) {
            setFetchError("No exam key found. Please restart the exam flow.");
            setQLoading(false);
            return;
          }

          const data = await safeApiFetch(`${API_URL}/api/exams/university/validate-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ exam_key: examKey }),
          });

          if (cancelled) return;

          if (!data.valid) {
            setFetchError(data.error || "Invalid exam key.");
            setQLoading(false);
            return;
          }

          // Normalise questions array
          let qs = data.paper_mcq || data.questions || [];
          if (!Array.isArray(qs)) qs = [];
          if (qs.length === 0) {
            setFetchError("No MCQ questions found for this exam.");
            setQLoading(false);
            return;
          }

          const rawSections = data.sections || univFlow.exam?.sections || {};
          setSections(parseSections(rawSections));
          setQuestions(qs);
          setSecsLeft(data.duration ? data.duration * 60 : durationSecs);
          setQLoading(false);
          return;
        }

        // Placement / certification branch
        if (!examId) {
          if (STATIC_MCQ_QUESTIONS.length > 0) {
            setQuestions(STATIC_MCQ_QUESTIONS);
            setQLoading(false);
            return;
          }
          setFetchError("No exam ID found. Please restart the exam flow.");
          setQLoading(false);
          return;
        }

        const data = await safeApiFetch(
          `${API_URL}/api/questions/exam/${examId}?type=mcq`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (cancelled) return;

        const rawSections = data.sections || routeExam.sections || {};
        setSections(parseSections(rawSections));

        // NORMALISE: ensure we get an array
        let qs = data.questions || data.data?.questions || data;
        if (!Array.isArray(qs)) {
          console.warn("[ExamPage] Response questions is not an array:", qs);
          qs = [];
        }

        if (qs.length === 0 && STATIC_MCQ_QUESTIONS.length > 0) {
          setQuestions(STATIC_MCQ_QUESTIONS);
        } else if (qs.length === 0) {
          setFetchError("No questions found for this exam. Please contact support.");
        } else {
          setQuestions(qs);
        }

      } catch (err) {
        if (cancelled) return;
        console.error("[ExamPage] Question load error:", err);
        if (STATIC_MCQ_QUESTIONS.length > 0) setQuestions(STATIC_MCQ_QUESTIONS);
        else setFetchError(`Could not load questions: ${err.message}`);
      } finally {
        if (!cancelled) setQLoading(false);
      }
    }

    loadQuestions();
    return () => { cancelled = true; };
  }, [examId, examMode]); // examMode added to be safe

  // Sync selected/confirmed on question change (same as old)
  useEffect(() => {
    if (QUESTIONS.length === 0) return;
    const q = QUESTIONS[current];
    if (!q) return;
    const existing = answersRef.current[q.id];
    setConfirmed(!!existing);
    setSelected(existing || null);
    setCardKey(k => k + 1);
  }, [current, QUESTIONS]);

  // Countdown timer
  useEffect(() => {
    if (QUESTIONS.length === 0) return;
    const id = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(id); doSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [QUESTIONS.length]);

  // Tab/focus violations
  useEffect(() => {
    const t = setTimeout(() => { listeningRef.current = true; }, 2000);
    const onHide = () => { if (listeningRef.current && document.hidden) triggerViolation("Tab switch detected"); };
    const onBlur = () => { if (listeningRef.current) triggerViolation("Window focus lost"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("blur", onBlur); };
  }, []);

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
    if (v >= MAX_VIOLATIONS) doSubmit();
  }, []);

  const doSubmit = useCallback(async () => {
    if (examDoneRef.current) return;
    examDoneRef.current = true;
    setExamDone(true);

    if (geoSessionIdProp) {
      fetch(`${API_URL}/api/session/${geoSessionIdProp}/complete`, { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => {});
    }

    const latestAnswers = answersRef.current;
    let correct = 0;
    QUESTIONS.forEach(q => {
      const cf = q.correct_ans ?? q.correct_answer ?? q.answer;
      if (latestAnswers[q.id] === cf) correct++;
    });

    const violationLog = violationsRef.current;
    const score = QUESTIONS.length > 0 ? Math.round((correct / QUESTIONS.length) * 100) : 0;

    if (assignmentId) {
      safeApiFetch(`${API_URL}/api/questions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, violations: violationLog, violation_count: violationLog.length, round: "mcq" }),
      }).catch(() => {});
    }

    setResult({ score, correct, violations: violationLog });
  }, [QUESTIONS, assignmentId, examId, geoSessionIdProp]);

  const persistAnswer = useCallback((questionId, selectedOpt) => {
    if (!assignmentId) return;
    safeApiFetch(`${API_URL}/api/questions/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ assignment_id: assignmentId, question_id: questionId, selected_ans: selectedOpt, round: "mcq" }),
    }).catch(() => {});
  }, [assignmentId]);

  const selectOpt = (letter) => { if (!confirmed) setSelected(letter); };
  const confirmAnswer = () => {
    if (!selected) { setShakeOpts(true); setTimeout(() => setShakeOpts(false), 500); return; }
    const q = QUESTIONS[current];
    const newAnswers = { ...answersRef.current, [q.id]: selected };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    setConfirmed(true);
    persistAnswer(q.id, selected);
  };
  const nextQ = () => {
    if (current + 1 < QUESTIONS.length) setCurrent(c => c + 1);
    else doSubmit();
  };

  // Derived
  const pct = secsLeft / durationSecs;
  const timerCls = `na-timer${pct <= 0.1 ? " danger" : pct <= 0.25 ? " warning" : ""}`;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss = String(secsLeft % 60).padStart(2, "0");
  const answered = Object.keys(answers).length;
  const remaining = QUESTIONS.length - answered;
  const progressPct = QUESTIONS.length > 0 ? Math.round(((current + 1) / QUESTIONS.length) * 100) : 0;
  const q = QUESTIONS[current];
  const statCards = [
    { val: answered, lbl: "ANSWERED", color: "var(--green)" },
    { val: remaining, lbl: "REMAINING", color: "var(--accent)" },
    { val: violations.length, lbl: "VIOLATIONS", color: violations.length > 0 ? "var(--amber)" : "var(--dim)" },
  ];

  if (qLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6fb", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "na-spin 0.8s linear infinite" }} />
      <p style={{ color: "#64748b", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>Loading questions…</p>
      <style>{`@keyframes na-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (fetchError) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6fb", padding: 24 }}>
      <div className="na-error-box">
        <div className="na-error-icon">📄</div>
        <div className="na-error-title">Could Not Load Questions</div>
        <div className="na-error-msg">{fetchError}</div>
      </div>
      <style>{CSS}</style>
    </div>
  );

  return (
    <>
      <div className="na-watermark" style={{ backgroundImage: wmBg, backgroundRepeat: "repeat", backgroundSize: "420px 240px" }} />
      <div className="na-layout">
        <header className="na-topbar">
          <div className="na-brand"><div className="na-brand-icon"><IconBrain /></div><div><div className="na-brand-name">NeuroAssess</div><div className="na-brand-sub">ASSESSMENT PLATFORM</div></div></div>
          <div className="na-topbar-div" />
          <div className="na-exam-info"><div className="na-exam-title">{examTitle}</div><div className="na-exam-meta">{`MCQ · ${QUESTIONS.length} Questions`}</div></div>
          {violations.length > 0 && (<div className="na-viol-badge"><IconWarn /><span className="na-viol-label">{violations.length} Warning{violations.length > 1 ? "s" : ""}</span></div>)}
          <div className="na-spacer" />
          <div className="na-proctor-pill"><div className="na-proctor-dot" /><span className="na-proctor-label">PROCTORED</span></div>
          <div className={timerCls}><div className="na-timer-dot" /><span className="na-timer-val">{mm}:{ss}</span></div>
        </header>
        <main className="na-main">
          <div className="na-exam-progress"><div className="na-exam-progress-bar"><div className="na-exam-progress-fill" style={{ width: `${progressPct}%` }} /></div><span className="na-exam-progress-label">{current + 1} / {QUESTIONS.length}</span></div>
          {q && (
            <div className="na-qcard" key={cardKey}>
              <div className="na-qnum-row"><span className="na-qnum-badge">Q{String(current + 1).padStart(2, "0")}</span><span className="na-qnum-of">{QUESTIONS.length - current - 1} remaining</span></div>
              <div className="na-qtext">{q.question_text}</div>
              {q.description && (<pre style={{ background: "#1e293b", color: "#e2e8f0", borderRadius: 8, padding: "14px 18px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, overflowX: "auto", margin: "0 28px 18px", whiteSpace: "pre-wrap" }}>{q.description}</pre>)}
              <div className={`na-options${shakeOpts ? " na-shake" : ""}`}>
                {LETTERS.map(letter => {
                  const optText = q[`option_${letter.toLowerCase()}`];
                  if (!optText) return null;
                  let cls = "na-opt";
                  if (confirmed) { cls += " locked"; if (selected === letter) cls += " selected"; }
                  else if (selected === letter) cls += " selected";
                  return (<button key={letter} className={cls} onClick={() => selectOpt(letter)}><span className="na-opt-letter">{letter}</span>{optText}</button>);
                })}
              </div>
              {confirmed && (<div className="na-answered-notice"><IconCheck /><span className="na-answered-notice-text">Response recorded. You can proceed to the next question.</span></div>)}
            </div>
          )}
          {showViolBanner && (<div className="na-viol-banner show"><IconWarn /><p style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{violMsg}</p></div>)}
        </main>
        <div className="na-action-bar">
          {!confirmed && (<button className="na-btn na-btn-primary" onClick={confirmAnswer} disabled={!selected} style={{ opacity: !selected ? 0.5 : 1 }}>Save &amp; Continue</button>)}
          {confirmed && (<button className="na-btn na-btn-next" onClick={nextQ}>{current + 1 < QUESTIONS.length ? "Next Question →" : "Submit &amp; Proceed"}</button>)}
        </div>
        <aside className="na-sidebar">
          <div className="na-webcam-section">
            {hasProctoringOverlay ? (<ProctoringOverlay videoRef={videoRef} canvasRef={canvasRef} proctoringState={proctoringState} violations={aiViolations} isReady={procIsReady} modelError={modelError} compact={false} />) : (<WebcamMock />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 14, borderBottom: "1px solid var(--border)" }}>
            {statCards.map(({ val, lbl, color }) => (<div className="na-stat-card" key={lbl}><div className="na-stat-val" style={{ color }}>{val}</div><div className="na-stat-lbl">{lbl}</div></div>))}
          </div>
          <div className="na-nav-section">
            <div className="na-section-label">Questions</div>
            <div className="na-nav-grid">
              {QUESTIONS.map((q_, i) => {
                let cls = "na-nav-dot";
                if (i === current) cls += " current";
                else if (answers[q_?.id]) cls += " answered";
                return <div key={i} className={cls}>{i + 1}</div>;
              })}
            </div>
            <div className="na-legend">
              {[{ color: "var(--accent)", border: "none", label: "Active" }, { color: "#e8f5e9", border: "1px solid rgba(22,163,74,0.3)", label: "Done" }, { color: "var(--surface2)", border: "1px solid var(--border)", label: "Pending" }].map(({ color, border, label }) => (<div className="na-legend-item" key={label}><div className="na-legend-dot" style={{ background: color, border }} />{label}</div>))}
            </div>
          </div>
        </aside>
      </div>
      {examDone && result && (<ResultOverlay result={result} examMode={examMode} sections={sections} onNavigate={navigate} />)}
    </>
  );
}