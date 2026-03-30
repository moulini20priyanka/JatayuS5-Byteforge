import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

<<<<<<< HEAD
// ─────────────────────────────────────────────────────────────────
// WHAT CHANGED FROM YOUR ORIGINAL & WHY
//
// KEPT (zero changes):
//   - Entire VIVA_CSS string                     ✓
//   - VIVA_QUESTIONS array                       ✓
//   - CODE_LINES array                           ✓
//   - WAVE_DELAYS constant                       ✓
//   - All SVG icon components (IcoBrain etc.)    ✓
//   - All state variables + useEffects           ✓
//   - startRecording / stopRecording / handleSubmit / handleNext ✓
//   - Entire topbar                              ✓
//   - Left code panel                            ✓
//   - Examiner bar + wave animation              ✓
//   - Question card + skeleton loading           ✓
//   - Answer textarea + recording badge          ✓
//   - Buttons row (record/stop/clear/submit/next) ✓
//   - Progress dots                              ✓
//   - Completion overlay                         ✓
//
// CHANGED:
//   1. candidateId prop added (alongside existing
//      codingScore and onNavigate).
//      Used to fetch the agent evaluation from
//      GET /api/report/evaluate/:candidateId.
//      Falls back gracefully if not provided.
//
//   2. CandidateContextPanel component added —
//      a collapsible drawer on the LEFT side of
//      the examiner bar that shows the candidate's
//      agent evaluation signals: overall score,
//      decision, top skills, GitHub languages,
//      LeetCode solved counts.
//      Purpose: gives the viva examiner context
//      about the candidate's technical background
//      so they can tailor follow-up questions.
//
//   3. showContext state + toggle button added
//      to the topbar (right side, next to existing
//      pills). Defaults to collapsed.
//
//   4. Completion overlay: shows agent decision
//      badge alongside the existing coding score
//      stat if evaluation data is available.
//
//   Everything else is unchanged — the viva
//   flow, recording, speech recognition, CSS
//   all work exactly as before.
// ─────────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api';

// KEPT: identical CSS
=======
// All Groq calls go through your backend (routes/viva.js) using process.env.GROQ_API_KEY
const API = "http://localhost:5000/api";

// ─── BACKEND API HELPERS ──────────────────────────────────────────────────────

async function generateQuestions(code) {
  const res = await fetch(`${API}/viva/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.questions;
}

async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  const ext = audioBlob.type.includes("ogg") ? "ogg" : audioBlob.type.includes("mp4") ? "mp4" : "webm";
  formData.append("audio", audioBlob, `recording.${ext}`);
  const res = await fetch(`${API}/viva/transcribe`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}

async function evaluateAnswer(code, question, answer) {
  const res = await fetch(`${API}/viva/evaluate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, question, answer }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
const VIVA_CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#f4f6fb; --surface:#ffffff; --surface2:#f8f9fd; --surface3:#f1f4f9;
  --border:#e4e8f0; --border2:#cdd3e0;
  --accent:#0284c7; --accent-s:#f0f9ff; --accent-m:rgba(2,132,199,0.12);
  --green:#16a34a; --green-s:#f0fdf4;
  --red:#dc2626; --red-s:#fef2f2;
  --amber:#d97706; --amber-s:#fffbeb;
  --purple:#7c3aed; --purple-s:#f5f3ff;
  --text:#0f172a; --text2:#334155; --muted:#64748b; --dim:#94a3b8;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg:0 12px 40px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.06);
}
html, body { height: 100%; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }
.vv-layout { display: grid; grid-template-rows: 52px 1fr; height: 100vh; overflow: hidden; background: var(--bg); }
<<<<<<< HEAD

=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-topbar { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; z-index: 100; box-shadow: var(--shadow-sm); }
.vv-brand-icon { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg,#0284c7,#0369a1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vv-brand-name { font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
.vv-brand-sub  { font-size: 9px; color: var(--muted); font-family: 'JetBrains Mono',monospace; letter-spacing: 0.8px; margin-top: 1px; }
.vv-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
.vv-session-info { font-size: 12px; font-weight: 600; color: var(--text); }
.vv-session-sub  { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono',monospace; margin-top: 1px; }
.vv-spacer { flex: 1; }
.vv-q-pill { background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--accent); letter-spacing: 0.5px; }
.vv-status-pill { display: flex; align-items: center; gap: 6px; background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 100px; padding: 4px 10px; }
.vv-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: vv-pulse 2s ease infinite; }
.vv-status-label { font-size: 9px; font-weight: 700; color: var(--accent); font-family: 'JetBrains Mono',monospace; letter-spacing: 0.8px; }
<<<<<<< HEAD

.vv-body { display: grid; grid-template-columns: 300px 1fr; overflow: hidden; height: 100%; }

=======
.vv-body { display: grid; grid-template-columns: 300px 1fr; overflow: hidden; height: 100%; }
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-code-panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.vv-panel-header { padding: 14px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.vv-panel-label { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
.vv-code-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.vv-code-tag { font-family: 'JetBrains Mono',monospace; font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; }
.vv-tag-blue   { background: var(--accent-s);  color: var(--accent);  border: 1px solid var(--accent-m); }
.vv-tag-purple { background: var(--purple-s);  color: var(--purple);  border: 1px solid rgba(124,58,237,0.2); }
.vv-code-scroll { flex: 1; overflow-y: auto; padding: 14px 16px; }
.vv-code-block { background: #0f172a; border: 1px solid #1e293b; border-radius: 9px; padding: 14px; font-family: 'JetBrains Mono',monospace; font-size: 11px; line-height: 1.8; color: #94a3b8; white-space: pre-wrap; word-break: break-all; position: relative; overflow: hidden; }
.vv-code-block::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,var(--accent),var(--purple)); }
.vv-code-line-num { color: #475569; margin-right: 12px; user-select: none; }
<<<<<<< HEAD
.vv-code-kw  { color: #c084fc; }
.vv-code-fn  { color: #60a5fa; }
.vv-code-str { color: #6ee7b7; }
.vv-code-num { color: #fbbf24; }
.vv-code-cmt { color: #475569; font-style: italic; }

.vv-stage { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }

=======
.vv-stage { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-examiner-bar { flex-shrink: 0; padding: 14px 24px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 16px; }
.vv-examiner-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent-s); border: 2px solid var(--accent-m); display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; transition: box-shadow 0.3s; }
.vv-examiner-avatar.speaking { box-shadow: 0 0 0 4px rgba(2,132,199,0.12); animation: vv-avatar-glow 1.4s ease-in-out infinite; }
.vv-examiner-ring { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid transparent; background: linear-gradient(white,white) padding-box, linear-gradient(135deg,var(--accent),var(--purple)) border-box; animation: vv-ring-spin 3s linear infinite; opacity: 0; transition: opacity 0.4s; }
.vv-examiner-avatar.speaking .vv-examiner-ring { opacity: 1; }
.vv-examiner-name { font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
.vv-examiner-role { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono',monospace; margin-top: 2px; }
.vv-wave { display: flex; gap: 3px; align-items: center; height: 14px; margin-top: 5px; }
.vv-wave-bar { width: 3px; border-radius: 2px; background: var(--accent); animation: vv-wave 1.2s ease-in-out infinite; opacity: 0; transition: opacity 0.3s; }
.vv-wave-bar.active { opacity: 1; }
.vv-wave-status { font-family: 'JetBrains Mono',monospace; font-size: 9px; color: var(--dim); margin-left: 6px; letter-spacing: 0.5px; }
<<<<<<< HEAD

=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-q-zone { flex-shrink: 0; padding: 20px 24px 14px; }
.vv-q-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; box-shadow: var(--shadow-sm); }
.vv-q-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg,var(--accent),var(--purple)); }
.vv-q-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.vv-q-num { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; }
.vv-q-type { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; padding: 2px 8px; border-radius: 4px; background: var(--accent-s); color: var(--accent); border: 1px solid var(--accent-m); letter-spacing: 0.5px; }
.vv-followup-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; letter-spacing: 1px; background: var(--purple-s); color: var(--purple); border: 1px solid rgba(124,58,237,0.2); margin-left: 8px; }
.vv-skeleton { background: linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%); background-size: 400% 100%; border-radius: 6px; animation: vv-shimmer 1.4s ease infinite; }
<<<<<<< HEAD

=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-answer-zone { flex: 1; display: flex; flex-direction: column; padding: 14px 24px 20px; min-height: 0; }
.vv-answer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.vv-answer-label { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; }
.vv-answer-meta { display: flex; align-items: center; gap: 10px; }
.vv-wc { font-family: 'JetBrains Mono',monospace; font-size: 10px; color: var(--dim); }
.vv-rec-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--red-s); border: 1px solid rgba(220,38,38,0.2); border-radius: 6px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--red); }
.vv-rec-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); animation: vv-rec-blink 1s ease infinite; flex-shrink: 0; }
.vv-mic-info { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 7px; font-size: 11px; font-family: 'JetBrains Mono',monospace; line-height: 1.5; margin-bottom: 8px; flex-shrink: 0; }
.vv-mic-info.warn  { background: var(--amber-s); border: 1px solid rgba(217,119,6,0.2); color: var(--amber); }
.vv-mic-info.ok    { background: var(--green-s);  border: 1px solid rgba(22,163,74,0.2);  color: var(--green); }
.vv-mic-info.info  { background: var(--accent-s); border: 1px solid var(--accent-m);      color: var(--accent); }
.vv-transcript { flex: 1; min-height: 0; background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px; padding: 14px 16px; font-size: 13px; color: var(--text); line-height: 1.75; overflow-y: auto; resize: none; outline: none; font-family: 'Inter',sans-serif; transition: border-color 0.2s, box-shadow 0.2s; caret-color: var(--accent); display: block; }
.vv-transcript:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-m); }
.vv-transcript.recording { border-color: var(--red); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
.vv-transcript.submitted { border-color: rgba(22,163,74,0.3); background: var(--green-s); color: var(--text2); }
.vv-transcript::placeholder { color: var(--dim); }
.vv-submitted-notice { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 9px 14px; background: var(--green-s); border: 1px solid rgba(22,163,74,0.25); border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--green); font-family: 'JetBrains Mono',monospace; }
<<<<<<< HEAD

=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
.vv-controls { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-shrink: 0; }
.vv-btn { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 7px; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono',monospace; cursor: pointer; transition: all 0.15s; letter-spacing: 0.4px; border: none; white-space: nowrap; }
.vv-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.vv-btn-record  { background: var(--surface2); color: var(--text2); border: 1.5px solid var(--border2); }
.vv-btn-record:hover:not(:disabled) { border-color: var(--red); color: var(--red); background: var(--red-s); }
.vv-btn-record.active { background: var(--red); color: #fff; border-color: var(--red); animation: vv-rec-pulse 1.2s ease infinite; }
.vv-btn-clear   { background: var(--surface2); color: var(--muted); border: 1.5px solid var(--border2); }
.vv-btn-clear:hover:not(:disabled) { color: var(--text2); }
.vv-btn-submit  { flex: 1; justify-content: center; background: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(2,132,199,0.22); }
.vv-btn-submit:hover:not(:disabled) { background: #0369a1; }
.vv-btn-next    { flex: 1; justify-content: center; background: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(2,132,199,0.22); }
.vv-btn-next:hover:not(:disabled)   { background: #0369a1; }
<<<<<<< HEAD

.vv-progress { display: flex; gap: 6px; margin-top: 12px; align-items: center; }
.vv-prog-dot { height: 5px; border-radius: 99px; transition: all 0.3s; }
.vv-prog-label { font-family: 'JetBrains Mono',monospace; font-size: 9px; color: var(--dim); margin-left: 6px; }

.vv-complete-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(244,246,251,0.97); backdrop-filter: blur(18px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: vv-fade-in 0.35s ease; }
.vv-complete-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: var(--shadow-lg); animation: vv-slide-up 0.45s cubic-bezier(.22,1,.36,1); }
.vv-complete-top { padding: 28px 28px 22px; }
.vv-complete-badge { display: inline-flex; padding: 3px 10px; border-radius: 4px; background: var(--accent-s); border: 1px solid var(--accent-m); font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--accent); letter-spacing: 1.2px; margin-bottom: 14px; }
.vv-complete-title { font-size: 19px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; }
.vv-complete-sub   { font-size: 12.5px; color: var(--muted); line-height: 1.75; }
.vv-complete-divider { height: 1px; background: var(--border); }
.vv-complete-stats { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: var(--border); }
.vv-complete-cell { background: var(--surface2); padding: 16px 20px; }
.vv-complete-val { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 3px; }
.vv-complete-lbl { font-family: 'JetBrains Mono',monospace; font-size: 8px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }
.vv-complete-bottom { padding: 18px 22px; }
.vv-complete-btn { width: 100%; padding: 13px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; font-family: 'Inter',sans-serif; cursor: pointer; box-shadow: 0 2px 10px rgba(2,132,199,0.22); transition: background 0.15s; }
.vv-complete-btn:hover { background: #0369a1; }

=======
.vv-progress { display: flex; gap: 6px; margin-top: 12px; align-items: center; }
.vv-prog-dot { height: 5px; border-radius: 99px; transition: all 0.3s; }
.vv-prog-label { font-family: 'JetBrains Mono',monospace; font-size: 9px; color: var(--dim); margin-left: 6px; }
.vv-gen-screen { flex: 1; display: flex; align-items: center; justify-content: center; }
.vv-gen-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 40px 48px; text-align: center; box-shadow: var(--shadow-lg); animation: vv-slide-up 0.4s cubic-bezier(.22,1,.36,1); }
.vv-gen-spinner { width: 44px; height: 44px; border: 3px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: vv-spin 0.8s linear infinite; margin: 0 auto 20px; }
.vv-gen-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.vv-gen-sub { font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono',monospace; }
.vv-gen-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; text-align: left; }
.vv-gen-step { display: flex; align-items: center; gap: 10px; font-size: 11px; font-family: 'JetBrains Mono',monospace; color: var(--dim); }
.vv-gen-step.done   { color: var(--green); }
.vv-gen-step.active { color: var(--accent); }
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
@keyframes vv-pulse       { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
@keyframes vv-wave        { 0%,100%{transform:scaleY(0.3);} 50%{transform:scaleY(1);} }
@keyframes vv-shimmer     { 0%{background-position:100% 0;} 100%{background-position:-100% 0;} }
@keyframes vv-ring-spin   { to{transform:rotate(360deg);} }
@keyframes vv-avatar-glow { 0%,100%{box-shadow:0 0 0 0 rgba(2,132,199,0.1);} 50%{box-shadow:0 0 0 10px rgba(2,132,199,0);} }
@keyframes vv-rec-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.25);} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0);} }
@keyframes vv-rec-blink   { 0%,100%{opacity:1;} 50%{opacity:0.25;} }
@keyframes vv-fade-in     { from{opacity:0;} to{opacity:1;} }
@keyframes vv-slide-up    { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:none;} }
@keyframes vv-appear      { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:none;} }
@keyframes vv-spin        { to{transform:rotate(360deg);} }
`;

<<<<<<< HEAD
// KEPT: identical constants
const VIVA_QUESTIONS = [
  { id: 1, type: "TIME COMPLEXITY",  question: "What is the time complexity of your solution, and why?" },
  { id: 2, type: "LOGIC",            question: "Walk me through the core logic of your solution step by step." },
  { id: 3, type: "EDGE CASES",       question: "What edge cases does your solution handle? Are there inputs that could cause it to fail?" },
  { id: 4, type: "SPACE COMPLEXITY", question: "What is the space complexity of your solution, and can it be optimised?" },
];

const CODE_LINES = [
  { num:  1, tokens: [{ t:"import", c:"kw" }, { t:" java.util.HashMap;", c:"str" }] },
  { num:  2, tokens: [{ t:"import", c:"kw" }, { t:" java.util.Map;", c:"str" }] },
  { num:  3, tokens: [] },
  { num:  4, tokens: [{ t:"class", c:"kw" }, { t:" Solution {", c:"" }] },
  { num:  5, tokens: [{ t:"  public", c:"kw" }, { t:" int[]", c:"kw" }, { t:" ", c:"" }, { t:"twoSum", c:"fn" }, { t:"(int[] nums, int target) {", c:"" }] },
  { num:  6, tokens: [{ t:"    // complement lookup via HashMap", c:"cmt" }] },
  { num:  7, tokens: [{ t:"    Map<Integer,Integer>", c:"kw" }, { t:" seen = ", c:"" }, { t:"new", c:"kw" }, { t:" HashMap<>();", c:"" }] },
  { num:  8, tokens: [{ t:"    for", c:"kw" }, { t:" (int i = ", c:"" }, { t:"0", c:"num" }, { t:"; i < nums.length; i++) {", c:"" }] },
  { num:  9, tokens: [{ t:"      int", c:"kw" }, { t:" complement = target - nums[i];", c:"" }] },
  { num: 10, tokens: [{ t:"      if", c:"kw" }, { t:" (seen.", c:"" }, { t:"containsKey", c:"fn" }, { t:"(complement)) {", c:"" }] },
  { num: 11, tokens: [{ t:"        return", c:"kw" }, { t:" new", c:"kw" }, { t:" int[]{seen.", c:"" }, { t:"get", c:"fn" }, { t:"(complement), i};", c:"" }] },
  { num: 12, tokens: [{ t:"      }", c:"" }] },
  { num: 13, tokens: [{ t:"      seen.", c:"" }, { t:"put", c:"fn" }, { t:"(nums[i], i);", c:"" }] },
  { num: 14, tokens: [{ t:"    }", c:"" }] },
  { num: 15, tokens: [{ t:"    return", c:"kw" }, { t:" new", c:"kw" }, { t:" int[]{};", c:"" }] },
  { num: 16, tokens: [{ t:"  }", c:"" }] },
  { num: 17, tokens: [{ t:"}", c:"" }] },
];

const WAVE_DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.15, 0.25, 0.35];

// KEPT: identical icon components
=======
const WAVE_DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.15, 0.25, 0.35];
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
const IcoBrain = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/></svg>;
const IcoUser  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IcoMic   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcoStop  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoArrow = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcoOk    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;
const IcoInfo  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

<<<<<<< HEAD
// ── NEW: Candidate context panel ──────────────────────────────────
// Shows agent evaluation signals to help the examiner ask relevant
// follow-up questions. Collapsible — defaults closed.
function CandidateContextPanel({ evaluation }) {
  if (!evaluation) return null;

  const dim      = evaluation.dimension_scores || {};
  const decision = evaluation.decision;
  const decisionColor =
    decision === 'Hire'   ? '#16a34a' :
    decision === 'Reject' ? '#dc2626' : '#d97706';

  const skills  = evaluation.insights
    ?.filter(i => i.section === 'resume' || i.section === 'linkedin')
    ?.slice(0, 2) || [];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
      fontSize: 11,
      marginTop: 8,
      animation: 'vv-appear 0.2s ease',
    }}>
      {/* Decision + score row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 4,
          background: decisionColor + '18', color: decisionColor,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
        }}>{decision || '—'}</span>
        <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 10 }}>
          Score: <strong style={{ color: 'var(--text)' }}>{evaluation.overall_score ?? '—'}</strong>/100
        </span>
        {evaluation.confidence && (
          <span style={{ color: 'var(--dim)', fontSize: 9, fontFamily: 'monospace' }}>
            {evaluation.confidence} confidence
          </span>
        )}
      </div>

      {/* Dimension mini bars */}
      {Object.entries({
        'Coding':     dim.coding_skill,
        'Problem':    dim.problem_solving,
        'Consistency': dim.consistency,
      }).map(([label, score]) => score !== null && score !== undefined ? (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ color: 'var(--muted)', width: 68, flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{
              width: `${Math.min(score, 100)}%`, height: '100%',
              background: score >= 70 ? '#16a34a' : score >= 45 ? '#d97706' : '#dc2626',
              borderRadius: 2,
            }}/>
          </div>
          <span style={{ color: 'var(--text2)', fontFamily: 'monospace', fontSize: 10, width: 24, textAlign: 'right' }}>{Math.round(score)}</span>
        </div>
      ) : null)}

      {/* Key insight */}
      {skills[0] && (
        <div style={{
          marginTop: 8, padding: '6px 8px',
          background: 'var(--accent-s)', borderRadius: 6,
          color: 'var(--muted)', lineHeight: 1.4, fontSize: 10,
        }}>
          💡 {skills[0].message}
        </div>
      )}
    </div>
  );
}

// CHANGED: added candidateId prop
export default function AIVivaPage({ onNavigate, codingScore, candidateId }) {
=======
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AIVivaPage({ onNavigate, codingScore, submittedCode, studentName: studentNameProp, problemName: problemNameProp }) {
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
  useEffect(() => {
    const old = document.getElementById("vv-styles");
    if (old) old.remove();
    const s = document.createElement("style");
    s.id = "vv-styles"; s.textContent = VIVA_CSS;
    document.head.appendChild(s);
    document.body.style.background = "";
    return () => { document.body.style.background = ""; };
  }, []);

<<<<<<< HEAD
  // KEPT: identical viva state
  const [qIndex,      setQIndex]     = useState(0);
  const [phase,       setPhase]      = useState("question");
  const [transcript,  setTranscript] = useState("");
  const [isRecording, setIsRecording]= useState(false);
  const [aiSpeaking,  setAiSpeaking] = useState(true);
  const [recSecs,     setRecSecs]    = useState(0);
  const [complete,    setComplete]   = useState(false);
  const [answers,     setAnswers]    = useState([]);

  // NEW: evaluation context state
  const [evaluation,   setEvaluation]   = useState(null);
  const [showContext,  setShowContext]   = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  const recRef      = useRef(null);
  const recTimerRef = useRef(null);
  const currentQ    = VIVA_QUESTIONS[qIndex];

  // NEW: fetch agent evaluation for context panel
  useEffect(() => {
    if (!candidateId) return;
    setContextLoading(true);
    axios.get(`${API}/report/evaluate/${candidateId}`)
      .then(res => { setEvaluation(res.data); setContextLoading(false); })
      .catch(() => setContextLoading(false));
  }, [candidateId]);

  // KEPT: identical question reset effect
=======
  const [screen,       setScreen]      = useState(submittedCode ? "generating" : "input");
  const [codeInput,    setCodeInput]   = useState(submittedCode || "");
  const [studentName,  setStudentName] = useState(studentNameProp || "");
  const [problemName,  setProblemName] = useState(problemNameProp || "");
  const [genStep,      setGenStep]     = useState(0);
  const [questions,    setQuestions]   = useState([]);
  const [qIndex,       setQIndex]      = useState(0);
  const [phase,        setPhase]       = useState("question");
  const [transcript,   setTranscript]  = useState("");
  const [isRecording,  setIsRecording] = useState(false);
  const [aiSpeaking,   setAiSpeaking]  = useState(true);
  const [recSecs,      setRecSecs]     = useState(0);
  const [answers,      setAnswers]     = useState([]);
  const [micBanner,    setMicBanner]   = useState(null);
  const [evaluations,  setEvaluations] = useState([]);
  const [evalLoading,  setEvalLoading] = useState(false);
  const [playCount,    setPlayCount]   = useState(0);
  const [isSpeaking,   setIsSpeaking]  = useState(false);

  const recRef         = useRef(null);
  const recTimerRef    = useRef(null);
  const finalBufferRef = useRef("");
  const speechRef      = useRef(null);
  const MAX_PLAYS      = 2;

  const currentQuestions = questions.length > 0 ? questions : [
    { id: 1, type: "LOGIC",      question: "Walk me through the core logic of your solution step by step.", isFollowUp: true, followUpIndex: 1, totalFollowUps: 3 },
    { id: 2, type: "COMPLEXITY", question: "What is the time and space complexity of your solution?",       isFollowUp: true, followUpIndex: 2, totalFollowUps: 3 },
    { id: 3, type: "EDGE CASES", question: "What edge cases does your solution handle?",                    isFollowUp: true, followUpIndex: 3, totalFollowUps: 3 },
  ];
  const activeQ = currentQuestions[qIndex] || currentQuestions[0];

  // Reset per question
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
  useEffect(() => {
    if (screen !== "viva") return;
    setAiSpeaking(true);
    setPhase("question");
    setTranscript("");
    setIsRecording(false);
    setRecSecs(0);
    setMicBanner(null);
    finalBufferRef.current = "";
    setPlayCount(0);
    setIsSpeaking(false);
    window.speechSynthesis.cancel();
    const t = setTimeout(() => setAiSpeaking(false), 2500);
    return () => { clearTimeout(t); window.speechSynthesis.cancel(); };
  }, [qIndex, screen]);

<<<<<<< HEAD
  // KEPT: identical recording timer
=======
  // Recording timer
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
  useEffect(() => {
    if (isRecording) {
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } else {
      clearInterval(recTimerRef.current);
    }
    return () => clearInterval(recTimerRef.current);
  }, [isRecording]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

<<<<<<< HEAD
  // KEPT: identical handlers
  const startRecording = useCallback(() => {
    setPhase("answering");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsRecording(true); recRef.current = null; return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e) => {
      let f = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) f += e.results[i][0].transcript + " ";
      }
      if (f) setTranscript(p => p + f);
=======
  // ── TTS — FIX: removed duplicate setPlayCount at bottom, only onend increments ──
  const speakQuestion = useCallback((text) => {
    if (playCount >= MAX_PLAYS || isSpeaking) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang   = "en-US";
    utterance.rate   = 0.88;
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;
    const voices    = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => {
      setIsSpeaking(false);
      setPlayCount(c => c + 1); // ← only increments ONCE, after speech finishes
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
    };
    utterance.onerror = () => setIsSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    // ← NO duplicate setPlayCount here anymore (was the bug)
  }, [playCount, isSpeaking]);

  // Auto-play question once aiSpeaking intro finishes
  useEffect(() => {
    if (screen !== "viva" || aiSpeaking || !activeQ?.question) return;
    if (playCount === 0) {
      const timer = setTimeout(() => speakQuestion(activeQ.question), 400);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSpeaking, screen, qIndex]);

  // Auto-start when submittedCode passed as prop
  useEffect(() => {
    if (!submittedCode) return;
    (async () => {
      setGenStep(0);
      await new Promise(r => setTimeout(r, 500));
      setGenStep(1);
      const qs = await generateQuestions(submittedCode);
      setGenStep(2);
      await new Promise(r => setTimeout(r, 400));
      setQuestions(qs);
      setQIndex(0);
      setAnswers([]);
      setEvaluations([]);
      setScreen("viva");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual start
  const handleStart = async () => {
    if (!codeInput.trim()) return;
    setScreen("generating");
    setGenStep(0);
    await new Promise(r => setTimeout(r, 500));
    setGenStep(1);
    const qs = await generateQuestions(codeInput);
    setGenStep(2);
    await new Promise(r => setTimeout(r, 400));
    setQuestions(qs);
    setQIndex(0);
    setAnswers([]);
    setEvaluations([]);
    setScreen("viva");
  };

  // Recording
  const startRecording = useCallback(async () => {
    setPhase("answering");
    setMicBanner(null);
    finalBufferRef.current = transcript;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : "audio/ogg;codecs=opus";
      const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setMicBanner({ kind: "info", text: "Transcribing with Whisper AI… please wait." });
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const text = await transcribeAudio(blob);
          const combined = (finalBufferRef.current + " " + text).trim();
          finalBufferRef.current = combined;
          setTranscript(combined);
          setMicBanner({ kind: "ok", text: "Transcription complete — review and edit if needed." });
        } catch (err) {
          setMicBanner({ kind: "warn", text: `Transcription failed: ${err.message}. Please type your answer.` });
        }
      };
      mr.start(250);
      recRef.current = mr;
      setIsRecording(true);
      setMicBanner({ kind: "ok", text: "Recording — speak clearly. Click Stop & Transcribe when done." });
    } catch (err) {
      setMicBanner({ kind: "warn", text: err.name === "NotAllowedError" ? "Microphone access denied. Please type your answer." : "Could not access microphone. Please type your answer." });
    }
  }, [transcript]);

  const stopRecording = useCallback(() => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    recRef.current = null;
  }, []);

  const handleSubmit = useCallback(() => {
    if (!transcript.trim()) return;
    if (isRecording) stopRecording();
    setAnswers(prev => [...prev, {
      questionId: activeQ.id, questionType: activeQ.type,
      question: activeQ.question, transcript: transcript.trim(), durationSecs: recSecs,
    }]);
    setPhase("submitted");
    setMicBanner(null);
  }, [transcript, activeQ, recSecs, isRecording, stopRecording]);

  const handleNext = useCallback(async () => {
    if (qIndex + 1 < currentQuestions.length) {
      setQIndex(i => i + 1);
    } else {
      const allAnswers = [...answers];
      setEvalLoading(true);
      setScreen("submitting");
      try {
        const evals = [];
        for (const ans of allAnswers) {
          const ev = await evaluateAnswer(
            codeInput,
            { type: ans.questionType, question: ans.question },
            ans.transcript
          );
          evals.push({ ...ans, evaluation: ev });
        }
        setEvaluations(evals);

        const overallScore = evals.length ? Math.round(evals.reduce((a, e) => a + e.evaluation.score, 0) / evals.length * 10) / 10 : 0;
        const authScore    = evals.length ? Math.round(evals.reduce((a, e) => a + e.evaluation.authenticityScore, 0) / evals.length * 10) / 10 : 0;
        const verdictMap   = evals.reduce((acc, e) => { const v = e.evaluation.verdict; acc[v] = (acc[v] || 0) + 1; return acc; }, {});
        const finalVerdict = Object.entries(verdictMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Genuine";

        const payload = {
          studentName:   studentName || "Unknown",
          problemName:   problemName || "Solution",
          submittedCode: codeInput,
          codingScore:   codingScore ?? null,
          completedAt:   new Date().toISOString(),
          overallScore, authScore, finalVerdict,
          vivaAnswers: evals.map((e, idx) => ({
            questionNumber:     idx + 1,
            questionType:       e.questionType,
            question:           e.question,
            studentAnswer:      e.transcript,
            durationSecs:       e.durationSecs,
            score:              e.evaluation.score,
            technicalAccuracy:  e.evaluation.technicalAccuracy,
            relevance:          e.evaluation.relevance,
            completeness:       e.evaluation.completeness,
            authenticityScore:  e.evaluation.authenticityScore,
            verdict:            e.evaluation.verdict,
            authenticityReason: e.evaluation.authenticityReason,
            plagiarismRisk:     e.evaluation.plagiarismRisk,
            signals:            e.evaluation.signals,
            isRelevant:         e.evaluation.isRelevant,
            isSpecificToCode:   e.evaluation.isSpecificToCode,
            relevanceFeedback:  e.evaluation.relevanceFeedback,
            feedback:           e.evaluation.feedback,
            strengths:          e.evaluation.strengths,
            improvements:       e.evaluation.improvements,
          })),
        };

        await fetch(`${API}/viva-results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setScreen("complete");
      } catch (err) {
        console.error("Failed to submit viva result:", err);
        setScreen("complete");
      } finally {
        setEvalLoading(false);
      }
    }
  }, [qIndex, currentQuestions.length, answers, codeInput, studentName, problemName, codingScore]);

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="vv-layout">
<<<<<<< HEAD
      {/* KEPT: topbar — added context toggle button */}
=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
      <header className="vv-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div className="vv-brand-icon"><IcoBrain /></div>
          <div>
            <div className="vv-brand-name">NeuroAssess</div>
            <div className="vv-brand-sub">AI VIVA ENGINE</div>
          </div>
        </div>
        <div className="vv-divider" />
        <div>
          <div className="vv-session-info">{problemName || "Data Structures & Algorithms"} — Viva Round</div>
          <div className="vv-session-sub">{studentName ? `Student: ${studentName} · ` : ""}Round 4 · Verbal Assessment</div>
        </div>
        <div className="vv-spacer" />
        {screen === "viva" && (
          <div className="vv-q-pill">FOLLOW-UP {activeQ.followUpIndex} / {activeQ.totalFollowUps}</div>
        )}
<<<<<<< HEAD
        {/* NEW: context toggle — only shown if evaluation loaded */}
        {evaluation && (
          <button
            onClick={() => setShowContext(v => !v)}
            style={{
              background: showContext ? 'var(--purple-s)' : 'var(--surface2)',
              border: `1px solid ${showContext ? 'rgba(124,58,237,0.3)' : 'var(--border2)'}`,
              borderRadius: 6, padding: '4px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, fontWeight: 700,
              color: showContext ? 'var(--purple)' : 'var(--muted)',
              cursor: 'pointer', letterSpacing: '0.5px',
            }}
          >
            {showContext ? '▲ HIDE PROFILE' : '▼ CANDIDATE PROFILE'}
          </button>
        )}
        {contextLoading && (
          <span style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'monospace' }}>
            Loading profile…
          </span>
        )}
        <div className="vv-q-pill">Q {qIndex + 1} / {VIVA_QUESTIONS.length}</div>
=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
        <div className="vv-status-pill">
          <div className="vv-status-dot" />
          <span className="vv-status-label">
            {screen === "input" ? "READY" : screen === "generating" ? "GENERATING" : screen === "viva" ? "VIVA ACTIVE" : "COMPLETE"}
          </span>
        </div>
      </header>

<<<<<<< HEAD
      <div className="vv-body">
        {/* KEPT: identical left code panel */}
        <div className="vv-code-panel">
          <div className="vv-panel-header">
            <div className="vv-panel-label">Your Submitted Code</div>
            <div className="vv-code-tags">
              <span className="vv-code-tag vv-tag-blue">TWO SUM</span>
              <span className="vv-code-tag vv-tag-green">JAVA</span>
              <span className="vv-code-tag vv-tag-purple">READ ONLY</span>
            </div>
          </div>
          <div className="vv-code-scroll">
            <div className="vv-code-block">
              {CODE_LINES.map(line => (
                <div key={line.num} style={{ display:"flex" }}>
                  <span className="vv-code-line-num">{String(line.num).padStart(2," ")}</span>
                  <span>
                    {line.tokens.map((tok, i) => (
                      <span key={i} className={tok.c ? `vv-code-${tok.c}` : ""}>{tok.t}</span>
                    ))}
                  </span>
                </div>
              ))}
=======
      {(screen === "generating" || screen === "submitting") && (
        <div className="vv-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="vv-gen-screen">
            <div className="vv-gen-card">
              <div className="vv-gen-spinner" />
              <div className="vv-gen-title">
                {screen === "generating" ? "Generating Viva Questions…" : "Evaluating & Submitting…"}
              </div>
              <div className="vv-gen-sub">
                {screen === "generating" ? "AI agent is analyzing the submitted code" : "AI is scoring your answers and saving results"}
              </div>
              <div className="vv-gen-steps">
                {screen === "generating"
                  ? [[0,"Parsing code structure"],[1,"Generating 3 follow-up questions"],[2,"Questions ready"]].map(([step, label]) => (
                      <div key={step} className={`vv-gen-step ${genStep > step ? "done" : genStep === step ? "active" : ""}`}>
                        <span>{genStep > step ? "✓" : genStep === step ? "→" : "·"}</span><span>{label}</span>
                      </div>
                    ))
                  : [[0,"Evaluating answers with AI"],[1,"Calculating scores and authenticity"],[2,"Saving to database"]].map(([step, label]) => (
                      <div key={step} className={`vv-gen-step ${!evalLoading && step < 2 ? "done" : step === 0 ? "active" : ""}`}>
                        <span>{!evalLoading && step < 2 ? "✓" : step === 0 ? "→" : "·"}</span><span>{label}</span>
                      </div>
                    ))
                }
              </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
        {/* KEPT: right stage — identical except context panel inserted */}
        <div className="vv-stage">
          {/* KEPT: identical examiner bar */}
          <div className="vv-examiner-bar">
            <div className={`vv-examiner-avatar ${aiSpeaking ? "speaking" : ""}`}>
              <IcoUser />
              <div className="vv-examiner-ring" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="vv-examiner-name">AI Viva Examiner</div>
              <div className="vv-examiner-role">NEUROASSESS · ROUND 4</div>
              <div className="vv-wave">
                {WAVE_DELAYS.map((d, i) => (
                  <div key={i} className={`vv-wave-bar ${aiSpeaking ? "active" : ""}`}
                    style={{ animationDelay:`${d}s`, height:`${10 + (i % 3) * 4}px` }} />
=======
      {screen === "viva" && (
        <div className="vv-body">
          <div className="vv-code-panel">
            <div className="vv-panel-header">
              <div className="vv-panel-label">Submitted Code</div>
              <div className="vv-code-tags">
                <span className="vv-code-tag vv-tag-blue">{problemName || "SOLUTION"}</span>
                <span className="vv-code-tag vv-tag-purple">READ ONLY</span>
              </div>
            </div>
            <div className="vv-code-scroll">
              <div className="vv-code-block">
                {codeInput.split("\n").map((line, i) => (
                  <div key={i} style={{ display: "flex" }}>
                    <span className="vv-code-line-num">{String(i + 1).padStart(2, " ")}</span>
                    <span>{line || " "}</span>
                  </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
                ))}
              </div>
              {/* NEW: inline context panel below examiner info */}
              {showContext && <CandidateContextPanel evaluation={evaluation}/>}
            </div>
          </div>

<<<<<<< HEAD
          {/* KEPT: identical question zone */}
          <div className="vv-q-zone">
            <div className="vv-q-card">
              <div className="vv-q-eyebrow">
                <span className="vv-q-num">QUESTION {qIndex + 1} OF {VIVA_QUESTIONS.length}</span>
                <span className="vv-q-type">{currentQ.type}</span>
=======
          <div className="vv-stage">
            <div className="vv-examiner-bar">
              <div className={`vv-examiner-avatar ${aiSpeaking ? "speaking" : ""}`}>
                <IcoUser />
                <div className="vv-examiner-ring" />
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
              </div>
              <div>
                <div className="vv-examiner-name">AI Viva Examiner</div>
                <div className="vv-examiner-role">NEUROASSESS · ROUND 4</div>
                <div className="vv-wave">
                  {WAVE_DELAYS.map((d, i) => (
                    <div key={i} className={`vv-wave-bar ${aiSpeaking ? "active" : ""}`}
                      style={{ animationDelay: `${d}s`, height: `${10 + (i % 3) * 4}px` }} />
                  ))}
                  <span className="vv-wave-status">
                    {aiSpeaking ? "ASKING QUESTION…" : phase === "submitted" ? "ANSWER RECEIVED" : "AWAITING RESPONSE"}
                  </span>
                </div>
              </div>
            </div>

<<<<<<< HEAD
          {/* KEPT: identical answer zone */}
          <div className="vv-answer-zone">
            <div className="vv-answer-header">
              <span className="vv-answer-label">Your Answer</span>
              <div className="vv-answer-meta">
                {wordCount > 0 && <span className="vv-wc">{wordCount} words</span>}
                {isRecording && (
                  <div className="vv-rec-badge">
                    <div className="vv-rec-dot" /> REC {fmt(recSecs)}
=======
            <div className="vv-q-zone">
              <div className="vv-q-card">
                <div className="vv-q-eyebrow">
                  <span className="vv-q-num">FOLLOW-UP {activeQ.followUpIndex} OF {activeQ.totalFollowUps}</span>
                  <span className="vv-q-type">{activeQ.type}</span>
                  <span className="vv-followup-badge">&#x21B3; FOLLOW-UP</span>
                </div>
                {aiSpeaking ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <div className="vv-skeleton" style={{ height: 18, width: "86%" }} />
                    <div className="vv-skeleton" style={{ height: 18, width: "62%" }} />
                  </div>
                ) : (
                  <div style={{ animation: "vv-appear 0.4s ease" }}>
                    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                        background: isSpeaking ? "var(--accent)" : "var(--accent-s)",
                        border: `2px solid ${isSpeaking ? "var(--accent)" : "var(--accent-m)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s",
                        animation: isSpeaking ? "vv-avatar-glow 1.4s ease-in-out infinite" : "none",
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isSpeaking ? "white" : "var(--accent)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                          {isSpeaking && <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>}
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                          {isSpeaking ? "Question is being read aloud…" : playCount === 0 ? "Question loading…" : "Question played"}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {Array.from({ length: MAX_PLAYS }).map((_, i) => (
                            <div key={i} style={{ width: 28, height: 5, borderRadius: 3, background: i < playCount ? "var(--accent)" : "var(--border2)", transition: "background 0.3s" }} />
                          ))}
                          <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", marginLeft: 4 }}>
                            {playCount >= MAX_PLAYS ? "MAX PLAYS REACHED" : `${MAX_PLAYS - playCount} play${MAX_PLAYS - playCount !== 1 ? "s" : ""} remaining`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => speakQuestion(activeQ.question)}
                        disabled={playCount >= MAX_PLAYS || isSpeaking}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                          borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                          cursor: playCount >= MAX_PLAYS ? "not-allowed" : "pointer", border: "none",
                          background: isSpeaking ? "var(--accent-s)" : playCount >= MAX_PLAYS ? "var(--surface3)" : "var(--surface2)",
                          color: isSpeaking ? "var(--accent)" : playCount >= MAX_PLAYS ? "var(--dim)" : "var(--text2)",
                          opacity: playCount >= MAX_PLAYS ? 0.5 : 1, transition: "all 0.15s",
                        }}
                      >
                        {isSpeaking ? "Speaking…" : playCount >= MAX_PLAYS ? "No replays" : `Replay (${MAX_PLAYS - playCount} left)`}
                      </button>
                    </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
                  </div>
                )}
              </div>
            </div>

<<<<<<< HEAD
            <textarea
              className={`vv-transcript${isRecording ? " recording" : ""}${phase === "submitted" ? " submitted" : ""}`}
              value={transcript}
              onChange={e => { if (phase !== "submitted") setTranscript(e.target.value); }}
              placeholder={
                aiSpeaking         ? "Please wait for the question…" :
                phase==="submitted"? "Answer submitted." :
                "Click 'Start Recording' to speak, or type your answer here."
              }
              readOnly={phase === "submitted"}
            />

            {phase === "submitted" && (
              <div className="vv-submitted-notice">
                <IcoOk /> Answer recorded — {wordCount} word{wordCount !== 1 ? "s" : ""}, {fmt(recSecs)} duration
=======
            <div className="vv-answer-zone">
              <div className="vv-answer-header">
                <span className="vv-answer-label">Your Answer</span>
                <div className="vv-answer-meta">
                  {wordCount > 0 && <span className="vv-wc">{wordCount} words</span>}
                  {isRecording && <div className="vv-rec-badge"><div className="vv-rec-dot" /> REC {fmt(recSecs)}</div>}
                </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
              </div>

<<<<<<< HEAD
            {/* KEPT: identical controls */}
            <div className="vv-controls">
              {phase !== "submitted" && (
                <>
                  {!isRecording ? (
                    <button className="vv-btn vv-btn-record" onClick={startRecording} disabled={aiSpeaking}>
                      <IcoMic /> Start Recording
                    </button>
                  ) : (
                    <button className="vv-btn vv-btn-record active" onClick={stopRecording}>
                      <IcoStop /> Stop Recording
                    </button>
                  )}
                  <button className="vv-btn vv-btn-clear" onClick={() => setTranscript("")} disabled={isRecording || aiSpeaking || !transcript}>Clear</button>
                  <button className="vv-btn vv-btn-submit" onClick={handleSubmit} disabled={!transcript.trim() || aiSpeaking || isRecording}>
                    <IcoCheck /> Submit Answer
                  </button>
                </>
=======
              {micBanner && phase !== "submitted" && (
                <div className={`vv-mic-info ${micBanner.kind}`}><IcoInfo /><span>{micBanner.text}</span></div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
              )}

              <textarea
                className={`vv-transcript${isRecording ? " recording" : ""}${phase === "submitted" ? " submitted" : ""}`}
                value={transcript}
                onChange={e => { if (phase !== "submitted") { setTranscript(e.target.value); finalBufferRef.current = e.target.value; } }}
                placeholder={
                  aiSpeaking            ? "Please wait for the question…" :
                  phase === "submitted"  ? "Answer submitted." :
                  isRecording            ? "Recording… click Stop & Transcribe when done." :
                  micBanner?.kind === "info" ? "Transcribing your speech…" :
                  "Click 'Start Recording' to speak, or type your answer here."
                }
                readOnly={phase === "submitted"}
              />

              {phase === "submitted" && (
<<<<<<< HEAD
                <button className="vv-btn vv-btn-next" onClick={handleNext}>
                  {qIndex + 1 < VIVA_QUESTIONS.length ? <><IcoArrow /> Next Question</> : <><IcoCheck /> Finish Viva</>}
                </button>
=======
                <div className="vv-submitted-notice">
                  <IcoOk /> Answer recorded — {wordCount} word{wordCount !== 1 ? "s" : ""}, {fmt(recSecs)} duration
                </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
              )}

<<<<<<< HEAD
            {/* KEPT: identical progress dots */}
            <div className="vv-progress">
              {VIVA_QUESTIONS.map((_, i) => (
                <div key={i} className="vv-prog-dot" style={{
                  width: i === qIndex ? 20 : 6,
                  background: i < qIndex ? "var(--green)" : i === qIndex ? "var(--accent)" : "var(--border2)",
                }} />
              ))}
              <span className="vv-prog-label">{qIndex} / {VIVA_QUESTIONS.length} COMPLETE</span>
=======
              <div className="vv-controls">
                {phase !== "submitted" && (
                  <>
                    {!isRecording ? (
                      <button className="vv-btn vv-btn-record" onClick={startRecording} disabled={aiSpeaking || micBanner?.kind === "info"}>
                        <IcoMic />{micBanner?.kind === "info" ? "Transcribing…" : "Start Recording"}
                      </button>
                    ) : (
                      <button className="vv-btn vv-btn-record active" onClick={stopRecording}>
                        <IcoStop /> Stop &amp; Transcribe
                      </button>
                    )}
                    <button className="vv-btn vv-btn-clear" onClick={() => { setTranscript(""); finalBufferRef.current = ""; }} disabled={isRecording || aiSpeaking || !transcript}>Clear</button>
                    <button className="vv-btn vv-btn-submit" onClick={handleSubmit} disabled={!transcript.trim() || aiSpeaking || isRecording}>
                      <IcoCheck /> Submit Answer
                    </button>
                  </>
                )}
                {phase === "submitted" && (
                  <button className="vv-btn vv-btn-next" onClick={handleNext}>
                    {qIndex + 1 < currentQuestions.length
                      ? <><IcoArrow /> Next Follow-up ({qIndex + 2}/{currentQuestions.length})</>
                      : <><IcoCheck /> Finish &amp; Evaluate</>}
                  </button>
                )}
              </div>

              <div className="vv-progress">
                {currentQuestions.map((_, i) => (
                  <div key={i} className="vv-prog-dot" style={{
                    width: i === qIndex ? 20 : 6,
                    background: i < qIndex ? "var(--purple)" : i === qIndex ? "var(--accent)" : "var(--border2)",
                  }} />
                ))}
                <span className="vv-prog-label">{qIndex} / {currentQuestions.length} FOLLOW-UPS DONE</span>
              </div>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* KEPT: completion overlay — NEW: agent decision stat cell added */}
      {complete && (
        <div className="vv-complete-overlay">
          <div className="vv-complete-card">
            <div style={{ height:3, background:"linear-gradient(90deg,var(--accent),var(--purple))" }} />
            <div className="vv-complete-top">
              <div className="vv-complete-badge">VIVA ROUND COMPLETE</div>
              <div className="vv-complete-title">All Questions Answered</div>
              <div className="vv-complete-sub">
                Your responses have been recorded and will be reviewed by the evaluation team.
                Results will be communicated through the platform.
              </div>
            </div>
            <div className="vv-complete-divider" />

            {/* CHANGED: grid now 2 or 3 cells depending on evaluation */}
            <div className="vv-complete-stats" style={{
              gridTemplateColumns: evaluation?.decision ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
            }}>
              <div className="vv-complete-cell">
                <div className="vv-complete-val" style={{ color:"var(--accent)" }}>{answers.length}</div>
                <div className="vv-complete-lbl">Questions Answered</div>
              </div>
              <div className="vv-complete-cell">
                <div className="vv-complete-val" style={{ color:"var(--green)" }}>
                  {codingScore !== undefined ? `${codingScore}%` : "—"}
=======
      {screen === "complete" && (
        <div className="vv-body" style={{ gridTemplateColumns: "1fr" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, maxWidth: 480, width: "100%", overflow: "hidden", boxShadow: "var(--shadow-lg)", animation: "vv-slide-up 0.4s cubic-bezier(.22,1,.36,1)" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg,var(--accent),var(--purple))" }} />
              <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green-s)", border: "2px solid rgba(22,163,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--green)", letterSpacing: 2, marginBottom: 10 }}>VIVA COMPLETE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3, marginBottom: 12 }}>All Answers Submitted</div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.75, marginBottom: 24 }}>
                  Your viva responses have been recorded, evaluated, and submitted to the assessment team. Your examiner will review the results and communicate your final outcome.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
                  {[
                    { val: evaluations.length, label: "Questions Answered", color: "var(--accent)" },
                    { val: "✓ Submitted",       label: "Status",             color: "var(--green)"  },
                  ].map(({ val, label, color }) => (
                    <div key={label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 10px" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 3 }}>{val}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--muted)", letterSpacing: 1 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate?.("lobby")}
                  style={{ width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Inter',sans-serif", cursor: "pointer", boxShadow: "0 2px 10px rgba(2,132,199,0.22)", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0369a1"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                >
                  Return to Dashboard
                </button>
              </div>
              {/* NEW: agent decision cell */}
              {evaluation?.decision && (
                <div className="vv-complete-cell">
                  <div className="vv-complete-val" style={{
                    color: evaluation.decision === 'Hire'   ? 'var(--green)'  :
                           evaluation.decision === 'Reject' ? 'var(--red)'    : 'var(--amber)',
                    fontSize: 18,
                  }}>
                    {evaluation.decision}
                  </div>
                  <div className="vv-complete-lbl">AI Decision</div>
                </div>
              )}
            </div>
<<<<<<< HEAD

            <div className="vv-complete-bottom">
              <button className="vv-complete-btn" onClick={() => onNavigate?.("lobby")}>
                Return to Dashboard
              </button>
            </div>
=======
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
          </div>
        </div>
      )}
    </div>
  );
}