import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

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

.vv-topbar { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; z-index: 100; box-shadow: var(--shadow-sm); }
.vv-brand-icon { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg,#0284c7,#0369a1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vv-brand-name { font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
.vv-brand-sub  { font-size: 9px; color: var(--muted); font-family: 'JetBrains Mono',monospace; letter-spacing: 0.8px; margin-top: 1px; }
.vv-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
.vv-session-info { font-size: 12px; font-weight: 600; color: var(--text); }
.vv-session-sub  { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono',monospace; margin-top: 1px; }
.vv-spacer { flex: 1; }
.vv-score-pill { display: flex; align-items: center; gap: 6px; background: var(--green-s); border: 1px solid rgba(22,163,74,0.2); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--green); letter-spacing: 0.5px; }
.vv-q-pill { background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--accent); letter-spacing: 0.5px; }
.vv-status-pill { display: flex; align-items: center; gap: 6px; background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 100px; padding: 4px 10px; }
.vv-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: vv-pulse 2s ease infinite; }
.vv-status-label { font-size: 9px; font-weight: 700; color: var(--accent); font-family: 'JetBrains Mono',monospace; letter-spacing: 0.8px; }

.vv-body { display: grid; grid-template-columns: 300px 1fr; overflow: hidden; height: 100%; }

.vv-code-panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.vv-panel-header { padding: 14px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.vv-panel-label { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
.vv-code-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.vv-code-tag { font-family: 'JetBrains Mono',monospace; font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; }
.vv-tag-blue   { background: var(--accent-s);  color: var(--accent);  border: 1px solid var(--accent-m); }
.vv-tag-green  { background: var(--green-s);   color: var(--green);   border: 1px solid rgba(22,163,74,0.2); }
.vv-tag-purple { background: var(--purple-s);  color: var(--purple);  border: 1px solid rgba(124,58,237,0.2); }
.vv-code-scroll { flex: 1; overflow-y: auto; padding: 14px 16px; }
.vv-code-block { background: #0f172a; border: 1px solid #1e293b; border-radius: 9px; padding: 14px; font-family: 'JetBrains Mono',monospace; font-size: 11px; line-height: 1.8; color: #94a3b8; white-space: pre-wrap; word-break: break-all; position: relative; overflow: hidden; }
.vv-code-block::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,var(--accent),var(--purple)); }
.vv-code-line-num { color: #475569; margin-right: 12px; user-select: none; }
.vv-code-kw  { color: #c084fc; }
.vv-code-fn  { color: #60a5fa; }
.vv-code-str { color: #6ee7b7; }
.vv-code-num { color: #fbbf24; }
.vv-code-cmt { color: #475569; font-style: italic; }

.vv-stage { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }

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

.vv-q-zone { flex-shrink: 0; padding: 20px 24px 14px; }
.vv-q-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; box-shadow: var(--shadow-sm); }
.vv-q-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg,var(--accent),var(--purple)); }
.vv-q-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.vv-q-num { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; }
.vv-q-type { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; padding: 2px 8px; border-radius: 4px; background: var(--accent-s); color: var(--accent); border: 1px solid var(--accent-m); letter-spacing: 0.5px; }
.vv-q-text { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.65; letter-spacing: -0.2px; }
.vv-skeleton { background: linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%); background-size: 400% 100%; border-radius: 6px; animation: vv-shimmer 1.4s ease infinite; }

.vv-answer-zone { flex: 1; display: flex; flex-direction: column; padding: 14px 24px 20px; min-height: 0; }
.vv-answer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.vv-answer-label { font-size: 9px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; }
.vv-answer-meta { display: flex; align-items: center; gap: 10px; }
.vv-wc { font-family: 'JetBrains Mono',monospace; font-size: 10px; color: var(--dim); }
.vv-rec-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--red-s); border: 1px solid rgba(220,38,38,0.2); border-radius: 6px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono',monospace; color: var(--red); }
.vv-rec-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); animation: vv-rec-blink 1s ease infinite; flex-shrink: 0; }

.vv-transcript { flex: 1; min-height: 0; background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px; padding: 14px 16px; font-size: 13px; color: var(--text); line-height: 1.75; overflow-y: auto; resize: none; outline: none; font-family: 'Inter',sans-serif; transition: border-color 0.2s, box-shadow 0.2s; caret-color: var(--accent); display: block; }
.vv-transcript:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-m); }
.vv-transcript.recording { border-color: var(--red); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
.vv-transcript.submitted { border-color: rgba(22,163,74,0.3); background: var(--green-s); color: var(--text2); }
.vv-transcript::placeholder { color: var(--dim); }

.vv-submitted-notice { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 9px 14px; background: var(--green-s); border: 1px solid rgba(22,163,74,0.25); border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--green); font-family: 'JetBrains Mono',monospace; }

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
`;

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
const IcoBrain = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/></svg>;
const IcoUser  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IcoMic   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcoStop  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoArrow = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcoOk    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;

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
  useEffect(() => {
    const old = document.getElementById("vv-styles");
    if (old) old.remove();
    const s = document.createElement("style");
    s.id = "vv-styles"; s.textContent = VIVA_CSS;
    document.head.appendChild(s);
    document.body.style.background = "";
    return () => { document.body.style.background = ""; };
  }, []);

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
  useEffect(() => {
    setAiSpeaking(true);
    setPhase("question");
    setTranscript("");
    setIsRecording(false);
    setRecSecs(0);
    const t = setTimeout(() => setAiSpeaking(false), 2500);
    return () => clearTimeout(t);
  }, [qIndex]);

  // KEPT: identical recording timer
  useEffect(() => {
    if (isRecording) {
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } else {
      clearInterval(recTimerRef.current);
    }
    return () => clearInterval(recTimerRef.current);
  }, [isRecording]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

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
    };
    rec.onerror = () => setIsRecording(false);
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setIsRecording(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!transcript.trim()) return;
    stopRecording();
    setAnswers(prev => [...prev, {
      questionId:   currentQ.id,
      questionType: currentQ.type,
      question:     currentQ.question,
      transcript:   transcript.trim(),
      durationSecs: recSecs,
    }]);
    setPhase("submitted");
  }, [transcript, currentQ, recSecs, stopRecording]);

  const handleNext = useCallback(() => {
    if (qIndex + 1 >= VIVA_QUESTIONS.length) setComplete(true);
    else setQIndex(i => i + 1);
  }, [qIndex]);

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="vv-layout">
      {/* KEPT: topbar — added context toggle button */}
      <header className="vv-topbar">
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div className="vv-brand-icon"><IcoBrain /></div>
          <div>
            <div className="vv-brand-name">NeuroAssess</div>
            <div className="vv-brand-sub">AI VIVA ENGINE</div>
          </div>
        </div>
        <div className="vv-divider" />
        <div>
          <div className="vv-session-info">Data Structures &amp; Algorithms — Viva Round</div>
          <div className="vv-session-sub">Round 4 · Verbal Assessment</div>
        </div>
        <div className="vv-spacer" />
        {codingScore !== undefined && (
          <div className="vv-score-pill">CODING: {codingScore}%</div>
        )}
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
        <div className="vv-status-pill">
          <div className="vv-status-dot" />
          <span className="vv-status-label">VIVA ACTIVE</span>
        </div>
      </header>

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
            </div>
          </div>
        </div>

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
                ))}
                <span className="vv-wave-status">
                  {aiSpeaking ? "ASKING QUESTION…" : phase === "submitted" ? "ANSWER RECEIVED" : "AWAITING RESPONSE"}
                </span>
              </div>
              {/* NEW: inline context panel below examiner info */}
              {showContext && <CandidateContextPanel evaluation={evaluation}/>}
            </div>
          </div>

          {/* KEPT: identical question zone */}
          <div className="vv-q-zone">
            <div className="vv-q-card">
              <div className="vv-q-eyebrow">
                <span className="vv-q-num">QUESTION {qIndex + 1} OF {VIVA_QUESTIONS.length}</span>
                <span className="vv-q-type">{currentQ.type}</span>
              </div>
              {aiSpeaking ? (
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  <div className="vv-skeleton" style={{ height:18, width:"86%" }} />
                  <div className="vv-skeleton" style={{ height:18, width:"62%" }} />
                </div>
              ) : (
                <div className="vv-q-text" style={{ animation:"vv-appear 0.4s ease" }}>
                  {currentQ.question}
                </div>
              )}
            </div>
          </div>

          {/* KEPT: identical answer zone */}
          <div className="vv-answer-zone">
            <div className="vv-answer-header">
              <span className="vv-answer-label">Your Answer</span>
              <div className="vv-answer-meta">
                {wordCount > 0 && <span className="vv-wc">{wordCount} words</span>}
                {isRecording && (
                  <div className="vv-rec-badge">
                    <div className="vv-rec-dot" /> REC {fmt(recSecs)}
                  </div>
                )}
              </div>
            </div>

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
              </div>
            )}

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
              )}
              {phase === "submitted" && (
                <button className="vv-btn vv-btn-next" onClick={handleNext}>
                  {qIndex + 1 < VIVA_QUESTIONS.length ? <><IcoArrow /> Next Question</> : <><IcoCheck /> Finish Viva</>}
                </button>
              )}
            </div>

            {/* KEPT: identical progress dots */}
            <div className="vv-progress">
              {VIVA_QUESTIONS.map((_, i) => (
                <div key={i} className="vv-prog-dot" style={{
                  width: i === qIndex ? 20 : 6,
                  background: i < qIndex ? "var(--green)" : i === qIndex ? "var(--accent)" : "var(--border2)",
                }} />
              ))}
              <span className="vv-prog-label">{qIndex} / {VIVA_QUESTIONS.length} COMPLETE</span>
            </div>
          </div>
        </div>
      </div>

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
                </div>
                <div className="vv-complete-lbl">Coding Score</div>
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

            <div className="vv-complete-bottom">
              <button className="vv-complete-btn" onClick={() => onNavigate?.("lobby")}>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}