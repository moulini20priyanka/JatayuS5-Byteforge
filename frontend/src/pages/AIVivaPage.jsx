// frontend/src/pages/AIVivaPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FULLY DYNAMIC AI VIVA — voice-first redesign
//
// Flow:
//   1. Pull submitted code from localStorage (set by CodeExam after submit)
//   2. POST /api/viva/generate-questions → 3 AI questions (code-contextual)
//   3. Each question is READ ALOUD via Web Speech API TTS (auto-play)
//      • Replay button limited to 2 extra listens (integrity guard)
//   4. Student answers by VOICE (mic → Whisper STT) or typing
//      • Transcribed text shown for verification
//      • Edit limited to ≤ 20-word changes before submit
//   5. POST /api/viva/evaluate-answer → scores + AI-detection verdict
//   6. POST /api/viva-results → saves to DB for Admin Dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = (() => {
  try { return import.meta.env?.VITE_API_URL || 'http://localhost:5000'; }
  catch { return 'http://localhost:5000'; }
})();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAX_REPLAYS        = 2;   // max extra listens per question
const MAX_EDIT_WORDS     = 20;  // max words student may change in transcript
const VIVA_DURATION_SECS = 20 * 60; // 20 min total

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f4f6fb;--surface:#fff;--surface2:#f8f9fd;
  --border:#e4e8f0;--border2:#cdd3e0;
  --accent:#2563eb;--accent-s:#eff4ff;--accent-m:rgba(37,99,235,0.12);
  --green:#16a34a;--green-s:#f0fdf4;
  --red:#dc2626;--red-s:#fef2f2;
  --amber:#d97706;--amber-s:#fffbeb;
  --purple:#7c3aed;--purple-s:#f5f3ff;
  --teal:#0f766e;--teal-s:#f0fdfc;--teal-b:#99f6e4;
  --text:#0f172a;--text2:#334155;--muted:#64748b;--dim:#94a3b8;
  --ebg:#1a1b26;--efg:#c0caf5;--eline:#24283b;
  --sh-sm:0 1px 3px rgba(0,0,0,.06);
  --sh-md:0 4px 16px rgba(0,0,0,.07);
  --sh-lg:0 12px 40px rgba(0,0,0,.10);
}
html,body{height:100%;font-family:'IBM Plex Sans',sans-serif;background:var(--bg);color:var(--text);}

/* ── Layout ── */
.vv-wrap{display:grid;grid-template-rows:60px 1fr;grid-template-columns:1fr 280px;height:100vh;overflow:hidden;}

/* ── Topbar ── */
.vv-top{grid-column:1/-1;background:#0A2A41;border-bottom:1px solid rgba(255,255,255,0.08);
  display:flex;align-items:center;padding:0 20px;gap:12px;z-index:50;box-shadow:0 2px 12px rgba(0,0,0,.25);}
.vv-brand{display:flex;align-items:center;gap:10px;}
.vv-bicon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2BB1A8,#0f766e);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(43,177,168,.35);}
.vv-bname{font-size:15px;font-weight:700;color:#fff;letter-spacing:-.3px;}
.vv-bsub{font-size:10px;color:#7aacba;font-family:'JetBrains Mono',monospace;letter-spacing:.6px;margin-top:1px;}
.vv-vline{width:1px;height:26px;background:rgba(255,255,255,.12);flex-shrink:0;}
.vv-einfo{display:flex;flex-direction:column;}
.vv-etitle{font-size:12px;font-weight:600;color:#e2e8f0;}
.vv-emeta{font-size:10px;color:#7aacba;font-family:'JetBrains Mono',monospace;margin-top:1px;}
.vv-spacer{flex:1;}
.vv-ppill{display:flex;align-items:center;gap:6px;background:rgba(22,163,74,0.15);
  border:1px solid rgba(22,163,74,.3);border-radius:100px;padding:5px 12px;}
.vv-pdot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:vv-pulse 2s ease infinite;}
.vv-plbl{font-size:10px;font-weight:700;color:#4ade80;font-family:'JetBrains Mono',monospace;letter-spacing:.8px;}
.vv-vbadge{display:flex;align-items:center;gap:6px;background:rgba(217,119,6,0.15);
  border:1px solid rgba(217,119,6,.3);border-radius:100px;padding:5px 11px;color:#fbbf24;}
.vv-vblbl{font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.vv-timer{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);
  border:1.5px solid rgba(255,255,255,.15);border-radius:100px;padding:6px 16px;transition:all .4s;}
.vv-timer.warn{background:rgba(217,119,6,.15);border-color:rgba(217,119,6,.35);}
.vv-timer.danger{background:rgba(220,38,38,.15);border-color:rgba(220,38,38,.35);animation:vv-tp 1s ease infinite;}
.vv-tdot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:vv-ping 2s ease infinite;transition:background .4s;}
.vv-timer.warn .vv-tdot{background:var(--amber);}
.vv-timer.danger .vv-tdot{background:var(--red);}
.vv-tval{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;
  color:#4ade80;letter-spacing:2.5px;transition:color .4s;}
.vv-timer.warn .vv-tval{color:var(--amber);}
.vv-timer.danger .vv-tval{color:var(--red);}

/* ── Main ── */
.vv-main{overflow:hidden;display:flex;flex-direction:column;}
.vv-pgrow{display:flex;align-items:center;gap:12px;padding:10px 18px 0;flex-shrink:0;}
.vv-pgbar{flex:1;height:4px;background:var(--border);border-radius:99px;overflow:hidden;}
.vv-pgfill{height:100%;border-radius:99px;background:linear-gradient(90deg,#2BB1A8,#4f46e5);transition:width .5s cubic-bezier(.4,0,.2,1);}
.vv-pglbl{font-size:11px;font-weight:600;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;}
.vv-split{display:flex;flex:1;overflow:hidden;}

/* ── Question panel ── */
.vv-qpanel{width:420px;min-width:300px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.vv-qhdr{padding:14px 16px 0;border-bottom:1px solid var(--border);flex-shrink:0;}
.vv-qtabs{display:flex;gap:3px;margin-bottom:10px;}
.vv-qtab{padding:5px 13px;border-radius:6px;border:1.5px solid var(--border);background:transparent;
  color:var(--muted);cursor:pointer;font-size:11px;font-weight:700;
  font-family:'JetBrains Mono',monospace;transition:all .12s;}
.vv-qtab.active{background:var(--teal-s);color:var(--teal);border-color:var(--teal-b);}
.vv-qtab.done{border-color:rgba(22,163,74,.35);color:var(--green);}
.vv-qtab:disabled{opacity:.45;cursor:not-allowed;}
.vv-qmeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding-bottom:12px;}
.vv-qnum{background:var(--teal-s);border:1px solid var(--teal-b);border-radius:6px;
  padding:3px 10px;font-size:11px;font-weight:700;color:var(--teal);font-family:'JetBrains Mono',monospace;}
.vv-typetag{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.vv-type-logic{background:#eff6ff;color:#1d4ed8;}
.vv-type-complexity{background:#f5f3ff;color:#6d28d9;}
.vv-type-edge{background:#fff7ed;color:#9a3412;}
.vv-type-default{background:var(--surface2);color:var(--muted);}

.vv-qbody{padding:20px 18px 90px;overflow-y:auto;flex:1;}
.vv-qtitle{font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px;line-height:1.5;letter-spacing:-.2px;}

/* ── Voice Player Card ── */
.vv-voice-card{background:linear-gradient(135deg,#0A2A41,#0f3d54);border:1px solid rgba(43,177,168,.3);
  border-radius:14px;padding:18px;margin-bottom:18px;position:relative;overflow:hidden;}
.vv-voice-card::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;
  border-radius:50%;background:rgba(43,177,168,.08);}
.vv-voice-top{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.vv-voice-icon{width:38px;height:38px;border-radius:50%;background:rgba(43,177,168,.2);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.vv-voice-label{font-size:10px;font-weight:700;color:#7aacba;font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.vv-voice-status{font-size:12px;color:#c0e0e8;margin-top:2px;}

/* Wave animation */
.vv-wave{display:flex;align-items:center;gap:3px;height:28px;margin-bottom:14px;}
.vv-wave-bar{width:3px;border-radius:99px;background:#2BB1A8;transition:height .15s ease;}
.vv-wave-bar.speaking{animation:vv-wave-anim 0.6s ease infinite;}
.vv-wave-bar:nth-child(1){animation-delay:0s;}
.vv-wave-bar:nth-child(2){animation-delay:.08s;}
.vv-wave-bar:nth-child(3){animation-delay:.16s;}
.vv-wave-bar:nth-child(4){animation-delay:.24s;}
.vv-wave-bar:nth-child(5){animation-delay:.32s;}
.vv-wave-bar:nth-child(6){animation-delay:.16s;}
.vv-wave-bar:nth-child(7){animation-delay:.08s;}
@keyframes vv-wave-anim{0%,100%{height:4px}50%{height:22px}}

.vv-replay-row{display:flex;align-items:center;gap:8px;}
.vv-replay-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:8px;
  border:1.5px solid rgba(43,177,168,.4);background:rgba(43,177,168,.1);
  color:#2BB1A8;font-size:11px;font-weight:700;cursor:pointer;
  font-family:'JetBrains Mono',monospace;transition:all .15s;}
.vv-replay-btn:hover:not(:disabled){background:rgba(43,177,168,.2);border-color:rgba(43,177,168,.6);}
.vv-replay-btn:disabled{opacity:.35;cursor:not-allowed;}
.vv-replay-count{font-size:10px;color:#7aacba;font-family:'JetBrains Mono',monospace;}

/* Code snippet */
.vv-slbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);
  font-family:'JetBrains Mono',monospace;text-transform:uppercase;margin:14px 0 7px;}
.vv-codebox{background:var(--ebg);border:1px solid var(--eline);border-radius:8px;
  padding:14px 16px;font-size:12px;font-family:'JetBrains Mono',monospace;color:#a9b1d6;
  white-space:pre-wrap;line-height:1.7;max-height:200px;overflow-y:auto;}

/* ── Answer panel ── */
.vv-apanel{flex:1;display:flex;flex-direction:column;background:var(--surface);overflow:hidden;}
.vv-atop{display:flex;align-items:center;justify-content:space-between;
  padding:0 16px;height:46px;background:#f8f9fd;border-bottom:1px solid var(--border);flex-shrink:0;}
.vv-amode{display:flex;gap:3px;}
.vv-amtab{padding:5px 14px;border-radius:6px;border:1.5px solid var(--border);background:transparent;
  color:var(--muted);cursor:pointer;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;transition:all .12s;}
.vv-amtab.active{background:var(--accent-s);color:var(--accent);border-color:var(--accent-m);}
.vv-abts{display:flex;gap:6px;align-items:center;}
.vv-ibtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;
  height:30px;padding:0 13px;border-radius:7px;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;
  border:none;transition:all .15s;white-space:nowrap;}
.vv-ib-mic{background:#dc2626;color:#fff;animation:vv-pulse 1.5s ease infinite;}
.vv-ib-mic.idle{background:transparent;border:1.5px solid var(--border);color:var(--muted);animation:none;}
.vv-ib-mic.idle:hover{border-color:#dc2626;color:#dc2626;background:var(--red-s);}

.vv-abody{flex:1;display:flex;flex-direction:column;padding:16px;overflow:hidden;gap:10px;}

/* Transcript box */
.vv-transcript-wrap{background:var(--surface2);border:1.5px solid var(--teal-b);border-radius:10px;padding:14px;flex-shrink:0;}
.vv-transcript-hd{font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--teal);
  font-family:'JetBrains Mono',monospace;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
.vv-edit-hint{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.vv-edit-warn{color:var(--amber);}

/* Main textarea */
.vv-ta{flex:1;background:var(--surface2);color:var(--text);font-family:'IBM Plex Sans',sans-serif;
  font-size:14px;border:1.5px solid var(--border);border-radius:10px;outline:none;
  padding:16px;resize:none;line-height:1.7;tab-size:2;transition:border-color .15s;min-height:120px;}
.vv-ta:focus{border-color:rgba(43,177,168,.5);background:#fff;}
.vv-ta::placeholder{color:var(--dim);}
.vv-ta:disabled{opacity:.6;cursor:not-allowed;}
.vv-char-hint{font-size:11px;color:var(--dim);font-family:'JetBrains Mono',monospace;}

/* Recording indicator */
.vv-rec-banner{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--red-s);
  border:1px solid rgba(220,38,38,.2);border-radius:8px;}
.vv-rec-dot{width:8px;height:8px;border-radius:50%;background:var(--red);animation:vv-pulse 1s ease infinite;flex-shrink:0;}
.vv-rec-lbl{font-size:11px;font-weight:700;color:var(--red);font-family:'JetBrains Mono',monospace;}
.vv-trans-banner{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--accent-s);
  border:1px solid var(--accent-m);border-radius:8px;}
.vv-trans-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:vv-pulse 1s ease infinite;flex-shrink:0;}
.vv-trans-lbl{font-size:11px;font-weight:700;color:var(--accent);font-family:'JetBrains Mono',monospace;}

/* Eval result */
.vv-evalbox{background:var(--surface2);border:1px solid var(--border);border-radius:10px;
  padding:14px;flex-shrink:0;}
.vv-eval-hd{font-size:10px;font-weight:700;letter-spacing:1.2px;color:var(--dim);
  font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.vv-score-row{display:flex;gap:8px;margin-bottom:10px;}
.vv-sc{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 8px;text-align:center;}
.vv-sv{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:3px;}
.vv-sl{font-size:8px;font-weight:700;letter-spacing:1.2px;color:var(--dim);font-family:'JetBrains Mono',monospace;}
.vv-feedback{font-size:12px;color:var(--text2);line-height:1.7;padding:10px 12px;
  background:#fff;border:1px solid var(--border);border-radius:8px;margin-top:6px;}
.vv-verdict-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;
  font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-top:8px;}
.vv-verdict-genuine{background:var(--green-s);color:var(--green);border:1px solid rgba(22,163,74,.3);}
.vv-verdict-suspicious{background:var(--amber-s);color:var(--amber);border:1px solid rgba(217,119,6,.3);}
.vv-verdict-ai{background:var(--red-s);color:var(--red);border:1px solid rgba(220,38,38,.3);}

/* ── Violation banner ── */
.vv-vbanner{display:none;margin:8px 16px 0;background:var(--amber-s);
  border:1.5px solid rgba(217,119,6,.25);border-radius:9px;padding:9px 12px;align-items:flex-start;gap:9px;}
.vv-vbanner.show{display:flex;}
.vv-vmsg{font-size:12px;color:#92400e;font-weight:600;line-height:1.6;}

/* ── Sidebar ── */
.vv-side{background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.vv-wsec{padding:14px 12px 12px;border-bottom:1px solid var(--border);}
.vv-slbl2{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);
  font-family:'JetBrains Mono',monospace;margin-bottom:8px;text-transform:uppercase;}
.vv-wcam{background:#0f172a;border-radius:10px;overflow:hidden;aspect-ratio:4/3;position:relative;}
.vv-wcamin{width:100%;height:100%;background:linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%);position:relative;}
.vv-sil{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:90px;height:120px;}
.vv-silh{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.10);margin:0 auto 4px;}
.vv-silb{width:72px;height:72px;border-radius:50% 50% 0 0;background:rgba(255,255,255,.07);margin:0 auto;}
.vv-wov{position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:4px;
  background:rgba(0,0,0,.45);border-radius:5px;padding:3px 7px;}
.vv-wrec{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:vv-pulse 1.5s ease infinite;}
.vv-wrlbl{font-size:8px;font-weight:700;color:rgba(255,255,255,.75);font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.vv-wstat{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
.vv-wdot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:vv-pulse 2s ease infinite;}
.vv-wact{font-size:9px;color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:700;}
.vv-wface{font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;}

.vv-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px;border-bottom:1px solid var(--border);}
.vv-sgc{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 8px;text-align:center;}
.vv-sgv{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:3px;}
.vv-sgl{font-size:8px;font-weight:700;letter-spacing:1.2px;color:var(--dim);font-family:'JetBrains Mono',monospace;}

.vv-navsec{padding:12px;border-bottom:1px solid var(--border);}
.vv-ngrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
.vv-ndot{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;
  border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);transition:all .12s;}
.vv-ndot.cur{background:#2BB1A8;border-color:#2BB1A8;color:#fff;box-shadow:0 2px 8px rgba(43,177,168,.35);}
.vv-ndot.done{background:#e8f5e9;border-color:rgba(22,163,74,.3);color:var(--green);}
.vv-leg{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;}
.vv-li{display:flex;align-items:center;gap:4px;font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;}
.vv-ld{width:8px;height:8px;border-radius:3px;flex-shrink:0;}

.vv-scoresec{padding:12px;}
.vv-scorecard{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;}
.vv-scorebar{height:5px;border-radius:99px;background:var(--border);overflow:hidden;margin:6px 0 4px;}
.vv-scorefill{height:100%;border-radius:99px;transition:width .5s,background .5s;background:var(--green);}
.vv-scorelbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:var(--muted);}

/* ── Action bar ── */
.vv-bar{position:fixed;bottom:0;left:0;right:280px;
  background:rgba(244,246,251,.96);backdrop-filter:blur(14px);
  border-top:1px solid var(--border);padding:10px 16px;
  display:flex;gap:8px;align-items:center;z-index:50;}
.vv-bb{display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:0 20px;height:40px;border-radius:9px;border:none;
  font-size:13px;font-weight:600;font-family:'IBM Plex Sans',sans-serif;
  cursor:pointer;transition:all .15s;white-space:nowrap;}
.vv-bb-out{background:transparent;color:var(--teal);border:1.5px solid var(--teal);}
.vv-bb-out:hover{background:var(--teal-s);}
.vv-bb-prim{flex:1;background:linear-gradient(135deg,#2BB1A8,#0f766e);color:#fff;box-shadow:0 2px 10px rgba(43,177,168,.28);}
.vv-bb-prim:hover{opacity:.9;}
.vv-bb-prim:disabled{background:var(--border);color:var(--dim);cursor:not-allowed;box-shadow:none;}
.vv-bb-rec{background:var(--red);color:#fff;animation:vv-pulse 1.5s ease infinite;}
.vv-bb-rec:hover{opacity:.88;}

/* ── Loading / Completion ── */
.vv-load{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);gap:12px;}
.vv-spin{width:36px;height:36px;border:3px solid var(--border);border-top-color:#2BB1A8;border-radius:50%;animation:vv-rot .8s linear infinite;}
.vv-ltxt{color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;}

.vv-resov{position:fixed;inset:0;background:rgba(244,246,251,.97);backdrop-filter:blur(18px);
  z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;}
.vv-rescard{background:var(--surface);border:1px solid var(--border);border-radius:18px;
  overflow:hidden;max-width:520px;width:100%;box-shadow:var(--sh-lg);animation:vv-up .5s cubic-bezier(.22,1,.36,1);}

/* ── TTS speaking overlay ── */
.vv-tts-overlay{position:fixed;inset:0;background:rgba(10,42,65,.7);backdrop-filter:blur(4px);
  z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;}
.vv-tts-card{background:#fff;border-radius:18px;padding:28px 32px;max-width:460px;width:90%;text-align:center;box-shadow:var(--sh-lg);}
.vv-tts-qnum{font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--teal);font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
.vv-tts-text{font-size:16px;font-weight:600;color:var(--text);line-height:1.6;margin-bottom:16px;}
.vv-tts-wave{display:flex;align-items:center;justify-content:center;gap:4px;height:36px;}
.vv-tts-bar{width:4px;border-radius:99px;background:#2BB1A8;animation:vv-wave-anim .6s ease infinite;}
.vv-tts-bar:nth-child(1){animation-delay:0s;}
.vv-tts-bar:nth-child(2){animation-delay:.1s;}
.vv-tts-bar:nth-child(3){animation-delay:.2s;}
.vv-tts-bar:nth-child(4){animation-delay:.3s;}
.vv-tts-bar:nth-child(5){animation-delay:.2s;}
.vv-tts-bar:nth-child(6){animation-delay:.1s;}
.vv-tts-lbl{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:8px;}

/* ── Keyframes ── */
@keyframes vv-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes vv-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
@keyframes vv-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes vv-rot{to{transform:rotate(360deg)}}
@keyframes vv-tp{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.2)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}}
@keyframes vv-wave-anim{0%,100%{height:4px}50%{height:24px}}
`;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IcMic     = ({size=13}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IcStop    = ({size=13}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const IcArrow   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcCheck   = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcBrain   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/></svg>;
const IcWarn    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcSend    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcVolume  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}
function typeColor(type = '') {
  const t = type.toUpperCase();
  if (t.includes('LOGIC'))   return 'vv-type-logic';
  if (t.includes('COMPLEX')) return 'vv-type-complexity';
  if (t.includes('EDGE'))    return 'vv-type-edge';
  return 'vv-type-default';
}
function scoreColor(score) {
  if (score >= 8) return 'var(--green)';
  if (score >= 5) return 'var(--amber)';
  return 'var(--red)';
}
function wordDiff(orig, edited) {
  // Count words changed between original transcript and edited version
  const ow = (orig || '').trim().split(/\s+/).filter(Boolean);
  const ew = (edited || '').trim().split(/\s+/).filter(Boolean);
  let diff = Math.abs(ow.length - ew.length);
  const minLen = Math.min(ow.length, ew.length);
  for (let i = 0; i < minLen; i++) {
    if (ow[i] !== ew[i]) diff++;
  }
  return diff;
}

// ─── TTS Engine ───────────────────────────────────────────────────────────────
function speakText(text, onStart, onEnd) {
  if (!('speechSynthesis' in window)) { onStart?.(); setTimeout(onEnd, 100); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate  = 0.92;
  utter.pitch = 1.0;
  utter.lang  = 'en-US';
  // Prefer a natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.lang === 'en-US');
  if (preferred) utter.voice = preferred;
  utter.onstart = () => onStart?.();
  utter.onend   = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}
function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ─── Fallback questions ───────────────────────────────────────────────────────
const FALLBACK_QUESTIONS = [
  { id: 1, type: 'LOGIC',      question: 'Walk me through the core logic of your solution step by step.' },
  { id: 2, type: 'COMPLEXITY', question: 'What is the time and space complexity of your solution? Can it be optimised?' },
  { id: 3, type: 'EDGE CASES', question: 'What edge cases does your solution handle? Are there any inputs that could cause it to fail?' },
];

// ─── Webcam mock ──────────────────────────────────────────────────────────────
function WebcamMock() {
  return (
    <>
      <div className="vv-slbl2">Live Monitoring</div>
      <div className="vv-wcam">
        <div className="vv-wcamin">
          <div className="vv-sil"><div className="vv-silh"/><div className="vv-silb"/></div>
          <div className="vv-wov"><div className="vv-wrec"/><span className="vv-wrlbl">LIVE</span></div>
        </div>
      </div>
      <div className="vv-wstat">
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div className="vv-wdot"/><span className="vv-wact">ACTIVE</span>
        </div>
        <span className="vv-wface">Face detected</span>
      </div>
    </>
  );
}

// ─── TTS Speaking Overlay ─────────────────────────────────────────────────────
function TTSOverlay({ questionNum, questionText }) {
  return (
    <div className="vv-tts-overlay">
      <div className="vv-tts-card">
        <div className="vv-tts-qnum">QUESTION {questionNum} OF 3</div>
        <p className="vv-tts-text">"{questionText}"</p>
        <div className="vv-tts-wave">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="vv-tts-bar" style={{height: 4 + Math.random()*20}}/>
          ))}
        </div>
        <div className="vv-tts-lbl">🔊 Playing question aloud — please listen carefully</div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AIVivaPage({ examId, assignmentId, onNavigate, codingScore }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const rs        = location.state || {};
  const _examId   = examId       || rs.examId       || rs.exam_id;
  const _assignId = assignmentId || rs.assignmentId || rs.assignment_id;
  const _coding   = codingScore  ?? rs.codingScore  ?? null;

  // ── Core state ────────────────────────────────────────────────────────────
  const [questions,      setQuestions]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [loadMsg,        setLoadMsg]        = useState('Generating viva questions…');
  const [current,        setCurrent]        = useState(0);
  const [answers,        setAnswers]        = useState({});
  const [text,           setText]           = useState('');
  const [mode,           setMode]           = useState('type'); // 'type'|'speak'
  const [recording,      setRecording]      = useState(false);
  const [transcribing,   setTranscribing]   = useState(false);
  const [evaluating,     setEvaluating]     = useState(false);
  const [currentEval,    setCurrentEval]    = useState(null);
  const [submitted,      setSubmitted]      = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(VIVA_DURATION_SECS);
  const [violations,     setViolations]     = useState([]);
  const [violMsg,        setViolMsg]        = useState('');
  const [showViol,       setShowViol]       = useState(false);
  const [submittedCode,  setSubmittedCode]  = useState('');

  // TTS state
  const [ttsPlaying,     setTtsPlaying]     = useState(false);   // currently reading question aloud
  const [ttsOverlay,     setTtsOverlay]     = useState(false);   // fullscreen overlay
  const [replayCounts,   setReplayCounts]   = useState({});      // { [qIdx]: count }
  const [ttsReady,       setTtsReady]       = useState(false);   // voices loaded

  // Transcript / edit guard
  const [transcript,     setTranscript]     = useState('');      // raw Whisper output
  const [editedWords,    setEditedWords]    = useState(0);       // words changed so far

  const timerRef    = useRef(null);
  const vTRef       = useRef(null);
  const listenRef   = useRef(false);
  const violsRef    = useRef([]);
  const doneRef     = useRef(false);
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const startTsRef  = useRef(Date.now());

  // ── CSS ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('vv-css')) {
      const s = document.createElement('style'); s.id = 'vv-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    // Pre-load voices
    const loadVoices = () => setTtsReady(true);
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    setTtsReady(true);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // ── Load code & generate questions ───────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('last_code_submission');
    let code = '';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const entries = Object.values(parsed);
        if (entries.length > 0) {
          code = entries.map(e => `// Language: ${e.lang || 'unknown'}\n${e.code || ''}`).join('\n\n');
        }
      } catch (_) {}
    }
    if (!code) code = '// No code submission found — answering general questions';
    setSubmittedCode(code);
    setLoadMsg('Analyzing your code with AI…');

    fetch(`${API_URL}/api/viva/generate-questions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body:    JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(data => {
        const qs = data.questions?.length ? data.questions : FALLBACK_QUESTIONS;
        setQuestions(qs);
        // Auto-play first question after short delay
        setTimeout(() => playQuestion(qs, 0), 800);
      })
      .catch(() => {
        setQuestions(FALLBACK_QUESTIONS);
        setTimeout(() => playQuestion(FALLBACK_QUESTIONS, 0), 800);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // ── TTS: play question ────────────────────────────────────────────────────
  function playQuestion(qs, idx) {
    const q = qs[idx] || questions[idx];
    if (!q) return;
    setTtsOverlay(true);
    setTtsPlaying(true);
    speakText(
      q.question,
      () => {},
      () => {
        setTtsPlaying(false);
        setTtsOverlay(false);
      }
    );
  }

  function handleReplay() {
    const count = replayCounts[current] || 0;
    if (count >= MAX_REPLAYS) return;
    setReplayCounts(p => ({ ...p, [current]: count + 1 }));
    playQuestion(questions, current);
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); handleFinalSubmit(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]); // eslint-disable-line

  // ── Violation listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { listenRef.current = true; }, 2000);
    const onH = () => { if (listenRef.current && document.hidden) triggerViol('Tab switch detected'); };
    const onB = () => { if (listenRef.current) triggerViol('Window focus lost'); };
    document.addEventListener('visibilitychange', onH);
    window.addEventListener('blur', onB);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onH);
      window.removeEventListener('blur', onB);
    };
  }, []); // eslint-disable-line

  const triggerViol = useCallback((reason) => {
    if (doneRef.current) return;
    const entry = { reason, time: new Date().toLocaleTimeString() };
    violsRef.current = [...violsRef.current, entry];
    setViolations([...violsRef.current]);
    setViolMsg(`${reason} · ${violsRef.current.length}/3 warnings`);
    setShowViol(true);
    clearTimeout(vTRef.current);
    vTRef.current = setTimeout(() => setShowViol(false), 5000);
    if (violsRef.current.length >= 3) handleFinalSubmit();
  }, []); // eslint-disable-line

  // ── Text change with edit guard ───────────────────────────────────────────
  function handleTextChange(val) {
    if (transcript) {
      const diff = wordDiff(transcript, val);
      if (diff > MAX_EDIT_WORDS) return; // silently block over-editing
      setEditedWords(diff);
    }
    setText(val);
  }

  // ── Audio recording ───────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        transcribeAudio(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      alert('Microphone access denied. Please use typing mode.');
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  async function transcribeAudio(blob) {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      const r = await fetch(`${API_URL}/api/viva/transcribe`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    fd,
      });
      const data = await r.json();
      if (data.text) {
        setTranscript(data.text);
        setText(data.text);
        setEditedWords(0);
      }
    } catch { /* silent */ }
    finally { setTranscribing(false); }
  }

  // ── Evaluate ──────────────────────────────────────────────────────────────
  async function evaluateAnswer(answerText) {
    if (!answerText?.trim() || !questions[current]) return null;
    setEvaluating(true);
    try {
      const r = await fetch(`${API_URL}/api/viva/evaluate-answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ code: submittedCode, question: questions[current], answer: answerText }),
      });
      return await r.json();
    } catch { return null; }
    finally { setEvaluating(false); }
  }

  // ── Next / Submit ─────────────────────────────────────────────────────────
  async function handleNext() {
    if (text.trim().length < 5) return;
    const elapsed = Math.round((Date.now() - startTsRef.current) / 1000);
    stopSpeaking();

    const evalResult = await evaluateAnswer(text);
    setCurrentEval(evalResult);

    const entry = {
      questionNumber:     current + 1,
      questionType:       questions[current]?.type || '',
      question:           questions[current]?.question || '',
      studentAnswer:      text,
      durationSecs:       elapsed,
      wasVoiceAnswer:     !!transcript,
      editedWordCount:    editedWords,
      replayCount:        replayCounts[current] || 0,
      score:              evalResult?.score             ?? null,
      technicalAccuracy:  evalResult?.technicalAccuracy ?? null,
      relevance:          evalResult?.relevance         ?? null,
      completeness:       evalResult?.completeness      ?? null,
      authenticityScore:  evalResult?.authenticityScore ?? null,
      verdict:            evalResult?.verdict           ?? '',
      feedback:           evalResult?.feedback          ?? '',
      strengths:          evalResult?.strengths         ?? [],
      improvements:       evalResult?.improvements      ?? [],
      authenticityReason: evalResult?.authenticityReason ?? '',
      plagiarismRisk:     evalResult?.plagiarismRisk    ?? 'Low',
      signals:            evalResult?.signals           ?? [],
      isRelevant:         evalResult?.isRelevant        ?? true,
      isSpecificToCode:   evalResult?.isSpecificToCode  ?? false,
      relevanceFeedback:  evalResult?.relevanceFeedback ?? '',
    };

    const updated = { ...answers, [current]: entry };
    setAnswers(updated);

    setTimeout(() => {
      setCurrentEval(null);
      setText('');
      setTranscript('');
      setEditedWords(0);
      startTsRef.current = Date.now();
      if (current + 1 < questions.length) {
        const nextIdx = current + 1;
        setCurrent(nextIdx);
        // Auto-play next question
        setTimeout(() => playQuestion(questions, nextIdx), 400);
      } else {
        handleFinalSubmit(updated);
      }
    }, evalResult ? 2800 : 300);
  }

  const handleFinalSubmit = useCallback(async (finalAnswers) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(timerRef.current);
    stopSpeaking();

    const answersToSave = finalAnswers || answers;
    const vivaList = Object.values(answersToSave);
    const scores   = vivaList.map(a => a.score).filter(s => s != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const authScores = vivaList.map(a => a.authenticityScore).filter(s => s != null);
    const avgAuth  = authScores.length ? Math.round(authScores.reduce((a, b) => a + b, 0) / authScores.length) : null;

    const verdicts = vivaList.map(a => a.verdict);
    const finalVerdict =
      verdicts.filter(v => v === 'Likely AI-Generated').length > 1 ? 'Likely AI-Generated' :
      verdicts.filter(v => v === 'Suspicious').length > 0          ? 'Suspicious'           : 'Genuine';

    let studentName = localStorage.getItem('student_name') || localStorage.getItem('userName') || 'Unknown';

    try {
      await fetch(`${API_URL}/api/viva-results`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          studentName,
          problemName:   'Submitted Code Solution',
          submittedCode,
          codingScore:   _coding,
          overallScore:  avgScore,
          authScore:     avgAuth,
          finalVerdict,
          completedAt:   new Date().toISOString(),
          vivaAnswers:   vivaList,
        }),
      });
    } catch (_) {}

    if (_assignId) {
      try {
        await fetch(`${API_URL}/api/questions/submit`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify({
            assignment_id:   _assignId,
            exam_id:         _examId,
            viva_answers:    vivaList,
            violation_count: violsRef.current.length,
            violations:      violsRef.current,
          }),
        });
      } catch (_) {}
    }

    setSubmitted(true);
  }, [answers, submittedCode, _coding, _assignId, _examId]); // eslint-disable-line

  // ── Derived ───────────────────────────────────────────────────────────────
  const q          = questions[current] || null;
  const answered   = Object.keys(answers).length;
  const pct        = timeLeft / VIVA_DURATION_SECS;
  const tCls       = `vv-timer${pct <= 0.1 ? ' danger' : pct <= 0.25 ? ' warn' : ''}`;
  const mm         = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss_        = String(timeLeft % 60).padStart(2, '0');
  const avgScore   = answered > 0
    ? Math.round(Object.values(answers).map(a => a.score ?? 0).reduce((a, b) => a + b, 0) / answered) : 0;
  const replayUsed = replayCounts[current] || 0;
  const canReplay  = replayUsed < MAX_REPLAYS && !ttsPlaying;
  const codeSnippet = submittedCode.slice(0, 500) + (submittedCode.length > 500 ? '\n…' : '');
  const editsRemaining = MAX_EDIT_WORDS - editedWords;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="vv-load">
      <div className="vv-spin"/>
      <p className="vv-ltxt">{loadMsg}</p>
      <style>{CSS}</style>
    </div>
  );

  // ── Completion ────────────────────────────────────────────────────────────
  if (submitted) {
    const finalScores = Object.values(answers);
    const overallAvg  = finalScores.length
      ? Math.round(finalScores.map(a => a.score ?? 0).reduce((a, b) => a + b, 0) / finalScores.length)
      : 0;

    const goLobby = () => {
      if (onNavigate) onNavigate('lobby');
      else navigate('/student-dashboard');
    };

    return (
      <div className="vv-resov">
        <div className="vv-rescard">
          <div style={{ height: 5, background: 'linear-gradient(90deg,#2BB1A8,#4f46e5)' }}/>
          <div style={{ padding: '34px 30px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 66, height: 66, borderRadius: '50%', marginBottom: 16, background: 'var(--teal-s)', border: '2px solid var(--teal-b)', color: 'var(--teal)' }}>
              <IcCheck/>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--teal)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
              ASSESSMENT COMPLETE
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: -.3 }}>
              AI Viva Finished!
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              All {questions.length} viva questions answered. Your responses have been recorded and evaluated.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'OVERALL',  value: `${overallAvg}/10`, color: scoreColor(overallAvg) },
                { label: 'ANSWERED', value: `${finalScores.length}/${questions.length}`, color: 'var(--accent)' },
                { label: 'WARNINGS', value: violations.length, color: violations.length > 0 ? 'var(--amber)' : 'var(--green)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 8px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>{value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: 'var(--dim)', fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Per-question breakdown */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: 'var(--dim)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>QUESTION BREAKDOWN</div>
              {finalScores.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < finalScores.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Q{i + 1} — {a.questionType}</span>
                    {a.wasVoiceAnswer && <span style={{ fontSize: 9, marginLeft: 6, color: 'var(--teal)', fontFamily: "'JetBrains Mono',monospace" }}>🎤 voice</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(a.score ?? 0), fontFamily: "'JetBrains Mono',monospace" }}>{a.score ?? '—'}/10</span>
                    {a.verdict && (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 20,
                        background: a.verdict === 'Genuine' ? 'var(--green-s)' : a.verdict === 'Suspicious' ? 'var(--amber-s)' : 'var(--red-s)',
                        color: a.verdict === 'Genuine' ? 'var(--green)' : a.verdict === 'Suspicious' ? 'var(--amber)' : 'var(--red)',
                        fontWeight: 700, fontFamily: "'JetBrains Mono',monospace"
                      }}>{a.verdict}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={goLobby}
              style={{ width: '100%', padding: '12px 0', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#2BB1A8,#0f766e)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 12px rgba(43,177,168,.3)' }}>
              Go to Dashboard <IcArrow/>
            </button>
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      {/* TTS fullscreen overlay */}
      {ttsOverlay && q && (
        <TTSOverlay questionNum={current + 1} questionText={q.question}/>
      )}

      <div className="vv-wrap">
        {/* TOPBAR */}
        <header className="vv-top">
          <div className="vv-brand">
            <div className="vv-bicon"><IcBrain/></div>
            <div>
              <div className="vv-bname">NeuroAssess</div>
              <div className="vv-bsub">ASSESSMENT PLATFORM</div>
            </div>
          </div>
          <div className="vv-vline"/>
          <div className="vv-einfo">
            <div className="vv-etitle">Round 4 — AI Viva</div>
            <div className="vv-emeta">Voice Assessment · {questions.length} Questions</div>
          </div>
          {violations.length > 0 && (
            <div className="vv-vbadge"><IcWarn/><span className="vv-vblbl">{violations.length} Warning{violations.length > 1 ? 's' : ''}</span></div>
          )}
          <div className="vv-spacer"/>
          <div className="vv-ppill"><div className="vv-pdot"/><span className="vv-plbl">PROCTORED</span></div>
          <div className={tCls}><div className="vv-tdot"/><span className="vv-tval">{mm}:{ss_}</span></div>
        </header>

        {/* MAIN */}
        <main className="vv-main">
          <div className="vv-pgrow">
            <div className="vv-pgbar">
              <div className="vv-pgfill" style={{ width: `${questions.length > 0 ? Math.round((current / questions.length) * 100) : 0}%` }}/>
            </div>
            <span className="vv-pglbl">{current + 1} / {questions.length}</span>
          </div>

          {showViol && (
            <div className="vv-vbanner show">
              <span style={{ color: 'var(--amber)', flexShrink: 0 }}><IcWarn/></span>
              <span className="vv-vmsg">{violMsg}</span>
            </div>
          )}

          <div className="vv-split" style={{ marginTop: 8 }}>

            {/* LEFT: Question panel */}
            <div className="vv-qpanel">
              <div className="vv-qhdr">
                <div className="vv-qtabs">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      className={`vv-qtab${i === current ? ' active' : answers[i] ? ' done' : ''}`}
                      onClick={() => { if (answers[i] != null) { stopSpeaking(); setCurrent(i); } }}
                      disabled={!answers[i] && i !== current}
                    >
                      Q{i + 1}
                    </button>
                  ))}
                </div>
                {q && (
                  <div className="vv-qmeta">
                    <span className="vv-qnum">Q{String(current + 1).padStart(2, '0')}</span>
                    {q.type && <span className={`vv-typetag ${typeColor(q.type)}`}>{q.type}</span>}
                  </div>
                )}
              </div>

              <div className="vv-qbody">
                {q ? (
                  <>
                    {/* Voice player card */}
                    <div className="vv-voice-card">
                      <div className="vv-voice-top">
                        <div className="vv-voice-icon">
                          <IcVolume/>
                        </div>
                        <div>
                          <div className="vv-voice-label">VOICE QUESTION</div>
                          <div className="vv-voice-status">
                            {ttsPlaying ? '🔊 Playing question…' : '✅ Question played — ready to answer'}
                          </div>
                        </div>
                      </div>

                      {/* Animated wave */}
                      <div className="vv-wave">
                        {[1,2,3,4,5,6,7].map(i => (
                          <div
                            key={i}
                            className={`vv-wave-bar${ttsPlaying ? ' speaking' : ''}`}
                            style={{ height: ttsPlaying ? undefined : 4 }}
                          />
                        ))}
                      </div>

                      {/* Replay controls */}
                      <div className="vv-replay-row">
                        <button
                          className="vv-replay-btn"
                          onClick={handleReplay}
                          disabled={!canReplay || ttsPlaying}
                        >
                          <IcVolume/> Replay Question
                        </button>
                        <span className="vv-replay-count">
                          {replayUsed}/{MAX_REPLAYS} replays used
                        </span>
                      </div>
                    </div>

                    {/* Written question text (shown below voice card) */}
                    <h2 className="vv-qtitle">{q.question}</h2>

                    <div className="vv-slbl">Your Submitted Code</div>
                    <pre className="vv-codebox">{codeSnippet}</pre>

                    {answers[current] && (
                      <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--green-s)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>ANSWERED ✓</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                          Score: {answers[current].score ?? '—'}/10 · {answers[current].wasVoiceAnswer ? '🎤 Voice' : '✏️ Typed'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--dim)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, paddingTop: 28 }}>
                    No viva question available.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Answer panel */}
            <div className="vv-apanel">
              <div className="vv-atop">
                <div className="vv-amode">
                  <button className={`vv-amtab${mode === 'type' ? ' active' : ''}`} onClick={() => { setMode('type'); stopRecording(); }}>✏️ Type</button>
                  <button className={`vv-amtab${mode === 'speak' ? ' active' : ''}`} onClick={() => setMode('speak')}>🎤 Voice</button>
                </div>
                <div className="vv-abts">
                  {mode === 'speak' && (
                    <button
                      className={`vv-ibtn ${recording ? 'vv-ib-mic' : 'vv-ib-mic idle'}`}
                      onClick={recording ? stopRecording : startRecording}
                      disabled={transcribing || ttsPlaying}
                    >
                      {recording ? <><IcStop size={11}/> Stop</> : <><IcMic size={11}/> Record</>}
                    </button>
                  )}
                </div>
              </div>

              <div className="vv-abody">
                {/* Status banners */}
                {recording && (
                  <div className="vv-rec-banner">
                    <div className="vv-rec-dot"/>
                    <span className="vv-rec-lbl">Recording your answer… Click STOP when done.</span>
                  </div>
                )}
                {transcribing && (
                  <div className="vv-trans-banner">
                    <div className="vv-trans-dot"/>
                    <span className="vv-trans-lbl">Transcribing with Whisper AI…</span>
                  </div>
                )}

                {/* Transcript verification box (shown after voice answer) */}
                {transcript && !recording && !transcribing && (
                  <div className="vv-transcript-wrap">
                    <div className="vv-transcript-hd">
                      <span>🎤 TRANSCRIBED ANSWER — verify &amp; edit below</span>
                      <span className={`vv-edit-hint${editsRemaining <= 5 ? ' vv-edit-warn' : ''}`}>
                        {editsRemaining} word edits remaining
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      Whisper AI converted your voice to text. You may correct up to {MAX_EDIT_WORDS} words below.
                    </div>
                  </div>
                )}

                {/* Answer textarea */}
                <textarea
                  className="vv-ta"
                  value={text}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder={
                    mode === 'speak'
                      ? recording
                        ? 'Recording… speak your answer clearly.'
                        : '🎤 Click "Record" to speak, or type your answer here…'
                      : '✏️ Type your answer here. Reference your code where possible…'
                  }
                  disabled={evaluating || ttsPlaying}
                />
                <div className="vv-char-hint">
                  {text.length} characters · {text.trim().split(/\s+/).filter(Boolean).length} words
                  {evaluating && ' · Evaluating…'}
                  {transcript && ` · ${editsRemaining} word edits remaining`}
                </div>

                {/* Live eval result */}
                {currentEval && (
                  <div className="vv-evalbox">
                    <div className="vv-eval-hd">EVALUATION RESULT</div>
                    <div className="vv-score-row">
                      {[
                        { label: 'SCORE',    value: currentEval.score             ?? '—', color: scoreColor(currentEval.score ?? 0) },
                        { label: 'ACCURACY', value: currentEval.technicalAccuracy ?? '—', color: scoreColor(currentEval.technicalAccuracy ?? 0) },
                        { label: 'RELEVANCE',value: currentEval.relevance         ?? '—', color: scoreColor(currentEval.relevance ?? 0) },
                        { label: 'AUTH',     value: currentEval.authenticityScore ?? '—', color: scoreColor(currentEval.authenticityScore ?? 0) },
                      ].map(({ label, value, color }) => (
                        <div className="vv-sc" key={label}>
                          <div className="vv-sv" style={{ color }}>{value}</div>
                          <div className="vv-sl">{label}</div>
                        </div>
                      ))}
                    </div>
                    {currentEval.verdict && (
                      <div className={`vv-verdict-badge ${
                        currentEval.verdict === 'Genuine'          ? 'vv-verdict-genuine'    :
                        currentEval.verdict === 'Suspicious'       ? 'vv-verdict-suspicious' :
                        'vv-verdict-ai'
                      }`}>
                        {currentEval.verdict === 'Genuine' ? '✅' : currentEval.verdict === 'Suspicious' ? '⚠️' : '🤖'} {currentEval.verdict}
                      </div>
                    )}
                    {currentEval.feedback && (
                      <div className="vv-feedback">{currentEval.feedback}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="vv-side">
          <div className="vv-wsec"><WebcamMock/></div>

          <div className="vv-sgrid">
            {[
              { val: answered,                    lbl: 'ANSWERED',  clr: 'var(--green)' },
              { val: questions.length - answered, lbl: 'REMAINING', clr: 'var(--accent)' },
              { val: violations.length,           lbl: 'WARNINGS',  clr: violations.length > 0 ? 'var(--amber)' : 'var(--dim)' },
              { val: avgScore > 0 ? `${avgScore}/10` : '—', lbl: 'AVG SCORE', clr: avgScore > 0 ? scoreColor(avgScore) : 'var(--dim)' },
            ].map(({ val, lbl, clr }) => (
              <div className="vv-sgc" key={lbl}>
                <div className="vv-sgv" style={{ color: clr }}>{val}</div>
                <div className="vv-sgl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="vv-navsec">
            <div className="vv-slbl2">Questions</div>
            <div className="vv-ngrid">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`vv-ndot${i === current ? ' cur' : answers[i] != null ? ' done' : ''}`}
                  onClick={() => { if (answers[i] != null) { stopSpeaking(); setCurrent(i); } }}
                  style={{ cursor: answers[i] != null ? 'pointer' : 'default' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="vv-leg">
              {[
                { clr: '#2BB1A8',         brd: 'none',                          lbl: 'Active'  },
                { clr: '#e8f5e9',         brd: '1px solid rgba(22,163,74,.3)',  lbl: 'Done'    },
                { clr: 'var(--surface2)', brd: '1px solid var(--border)',        lbl: 'Pending' },
              ].map(({ clr, brd, lbl }) => (
                <div className="vv-li" key={lbl}>
                  <div className="vv-ld" style={{ background: clr, border: brd }}/>{lbl}
                </div>
              ))}
            </div>
          </div>

          <div className="vv-scoresec">
            <div className="vv-slbl2">Score Progress</div>
            <div className="vv-scorecard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>Avg Score</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: avgScore > 0 ? scoreColor(avgScore) : 'var(--dim)' }}>
                  {avgScore > 0 ? `${avgScore}/10` : '—'}
                </span>
              </div>
              <div className="vv-scorebar">
                <div className="vv-scorefill" style={{ width: `${avgScore * 10}%`, background: avgScore > 0 ? scoreColor(avgScore) : 'var(--border)' }}/>
              </div>
              <div className="vv-scorelbl">
                {avgScore === 0 ? 'No answers yet' : avgScore >= 8 ? 'Excellent' : avgScore >= 5 ? 'Good — keep going' : 'Needs more depth'}
              </div>
            </div>

            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, letterSpacing: 1.2 }}>INTEGRITY</div>
              {[
                { label: 'Replay Limit',  val: `${replayUsed}/${MAX_REPLAYS}`,      color: replayUsed >= MAX_REPLAYS ? 'var(--amber)' : 'var(--green)' },
                { label: 'Edit Guard',    val: `${editedWords}/${MAX_EDIT_WORDS}w`,  color: editedWords > 15 ? 'var(--amber)' : 'var(--green)' },
                { label: 'Violations',    val: `${violations.length}/3`,             color: violations.length > 0 ? 'var(--red)' : 'var(--green)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, color: 'var(--text2)' }}>
                  <span>{r.label}</span>
                  <span style={{ color: r.color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ACTION BAR */}
      <div className="vv-bar">
        {recording ? (
          <button className="vv-bb vv-bb-rec" style={{ flex: 1, borderRadius: 9, border: 'none', height: 40, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }} onClick={stopRecording}>
            <IcStop size={13}/> Stop Recording &amp; Transcribe
          </button>
        ) : (
          <>
            {mode === 'speak' && !recording && (
              <button className="vv-bb vv-bb-out" onClick={startRecording} disabled={transcribing || ttsPlaying}>
                <IcMic size={13}/> Record
              </button>
            )}
            <button
              className="vv-bb vv-bb-prim"
              onClick={handleNext}
              disabled={text.trim().length < 5 || evaluating || transcribing || ttsPlaying}
            >
              {evaluating
                ? 'Evaluating…'
                : current + 1 < questions.length
                ? <>Next Question <IcArrow/></>
                : <>Submit Viva <IcSend/></>}
            </button>
          </>
        )}
      </div>

      <style>{CSS}</style>
    </>
  );
}