// frontend/src/pages/CodeExam.jsx
// KEY FIXES:
//   • parseCodingMeta() extracts starterCode{python,java,cpp,javascript},
//     description, sampleCases, constraints, hint from the explanation JSON blob
//   • Left panel NEVER shows raw JSON — only parsed human-readable text
//   • Java fallback uses "Solution" not the full question title as class name
//   • Language tabs update starter code correctly when switched
//   • Proper SVG icon buttons throughout (no emoji in buttons)
//   • Sidebar mirrors MCQ page exactly (camera, stats, nav, originality)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = (() => {
  try { return import.meta.env?.VITE_API_URL || 'http://localhost:5000'; }
  catch { return 'http://localhost:5000'; }
})();

let useAIProctoring = null;
let ProctoringOverlay = null;
try {
  useAIProctoring   = require('../hooks/useAIProctoring').useAIProctoring;
  ProctoringOverlay = require('./ProctoringOverlay').default;
} catch { /* static mock */ }

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
  --text:#0f172a;--text2:#334155;--muted:#64748b;--dim:#94a3b8;
  --ebg:#1a1b26;--efg:#c0caf5;--eline:#24283b;
  --sh-sm:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh-md:0 4px 16px rgba(0,0,0,.07),0 2px 6px rgba(0,0,0,.04);
  --sh-lg:0 12px 40px rgba(0,0,0,.10),0 4px 12px rgba(0,0,0,.06);
}
html,body{height:100%;font-family:'IBM Plex Sans',sans-serif;background:var(--bg);color:var(--text);}

.ce-wrap{display:grid;grid-template-rows:60px 1fr;grid-template-columns:1fr 280px;height:100vh;overflow:hidden;}

/* topbar */
.ce-top{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 20px;gap:12px;z-index:50;box-shadow:var(--sh-sm);}
.ce-brand{display:flex;align-items:center;gap:10px;}
.ce-bicon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2563eb,#4f46e5);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,.28);}
.ce-bname{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-.3px;}
.ce-bsub{font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;letter-spacing:.6px;margin-top:1px;}
.ce-vline{width:1px;height:26px;background:var(--border);flex-shrink:0;}
.ce-einfo{display:flex;flex-direction:column;}
.ce-etitle{font-size:12px;font-weight:600;color:var(--text2);}
.ce-emeta{font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-top:1px;}
.ce-spacer{flex:1;}
.ce-ppill{display:flex;align-items:center;gap:6px;background:var(--green-s);
  border:1px solid rgba(22,163,74,.18);border-radius:100px;padding:5px 12px;}
.ce-pdot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ce-pulse 2s ease infinite;}
.ce-plbl{font-size:10px;font-weight:700;color:var(--green);font-family:'JetBrains Mono',monospace;letter-spacing:.8px;}
.ce-vbadge{display:flex;align-items:center;gap:6px;background:var(--amber-s);
  border:1px solid rgba(217,119,6,.2);border-radius:100px;padding:5px 11px;color:var(--amber);}
.ce-vblbl{font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.ce-timer{display:flex;align-items:center;gap:8px;background:var(--surface2);
  border:1.5px solid var(--border);border-radius:100px;padding:6px 16px;transition:all .4s;}
.ce-timer.warn{background:var(--amber-s);border-color:rgba(217,119,6,.3);}
.ce-timer.danger{background:var(--red-s);border-color:rgba(220,38,38,.3);animation:ce-tp 1s ease infinite;}
.ce-tdot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ce-ping 2s ease infinite;transition:background .4s;}
.ce-timer.warn .ce-tdot{background:var(--amber);}
.ce-timer.danger .ce-tdot{background:var(--red);}
.ce-tval{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;
  color:var(--green);letter-spacing:2.5px;transition:color .4s;}
.ce-timer.warn .ce-tval{color:var(--amber);}
.ce-timer.danger .ce-tval{color:var(--red);}

/* main */
.ce-main{overflow:hidden;display:flex;flex-direction:column;}
.ce-pgrow{display:flex;align-items:center;gap:12px;padding:10px 18px 0;flex-shrink:0;}
.ce-pgbar{flex:1;height:4px;background:var(--border);border-radius:99px;overflow:hidden;}
.ce-pgfill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#4f46e5);transition:width .5s cubic-bezier(.4,0,.2,1);}
.ce-pglbl{font-size:11px;font-weight:600;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;}
.ce-split{display:flex;flex:1;overflow:hidden;}

/* problem panel */
.ce-prob{width:400px;min-width:290px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.ce-phdr{padding:14px 16px 0;border-bottom:1px solid var(--border);flex-shrink:0;}
.ce-qtabs{display:flex;gap:3px;margin-bottom:10px;}
.ce-qtab{padding:5px 13px;border-radius:6px;border:1.5px solid var(--border);background:transparent;
  color:var(--muted);cursor:pointer;font-size:11px;font-weight:700;
  font-family:'JetBrains Mono',monospace;transition:all .12s;}
.ce-qtab.active{background:var(--accent-s);color:var(--accent);border-color:var(--accent-m);}
.ce-qtab.done{border-color:rgba(22,163,74,.35);color:var(--green);}
.ce-qmeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding-bottom:12px;}
.ce-qnum{background:var(--accent-s);border:1px solid var(--accent-m);border-radius:6px;
  padding:3px 10px;font-size:11px;font-weight:700;color:var(--accent);font-family:'JetBrains Mono',monospace;}
.ce-diff{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:capitalize;}
.ce-diff-easy{background:#d9f5ec;color:#0a8f5c;}
.ce-diff-medium{background:#fef3c7;color:#92400e;}
.ce-diff-hard{background:#fde8e8;color:#c53030;}
.ce-ttag{font-size:10px;font-weight:600;padding:3px 9px;background:var(--purple-s);color:var(--purple);border-radius:20px;font-family:'JetBrains Mono',monospace;}

/* sub-tabs */
.ce-stabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0;}
.ce-stab{flex:1;padding:9px 4px;border:none;background:transparent;
  font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;color:var(--muted);
  border-bottom:2px solid transparent;text-transform:uppercase;letter-spacing:.8px;transition:all .15s;}
.ce-stab.active{color:var(--accent);border-bottom-color:var(--accent);}

.ce-pbody{padding:16px 16px 80px;overflow-y:auto;flex:1;}
.ce-qtitle{font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;line-height:1.45;letter-spacing:-.2px;}
.ce-slbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);
  font-family:'JetBrains Mono',monospace;text-transform:uppercase;margin:14px 0 7px;}
.ce-desc{font-size:13px;color:var(--text2);line-height:1.75;white-space:pre-wrap;}
.ce-cbox{background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:12px 14px;font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--text2);
  white-space:pre-wrap;line-height:1.7;}
.ce-sample-block{background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:10px;}
.ce-shead{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;
  background:#eef1f8;font-size:9px;font-weight:700;letter-spacing:.8px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.ce-scode{padding:10px 12px;font-size:12.5px;font-family:'JetBrains Mono',monospace;color:var(--text);white-space:pre-wrap;line-height:1.6;}
.ce-hint-box{background:#fffbeb;border:1px solid rgba(217,119,6,.2);border-radius:8px;padding:12px 14px;}
.ce-hint-txt{font-size:13px;color:#92400e;line-height:1.7;}
.ce-empty{text-align:center;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:11px;padding:28px 0;}

/* editor */
.ce-ed{flex:1;display:flex;flex-direction:column;background:var(--ebg);overflow:hidden;}
.ce-edtop{display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;height:46px;background:#16161e;border-bottom:1px solid var(--eline);flex-shrink:0;}
.ce-langs{display:flex;gap:2px;}
.ce-ltab{padding:5px 14px;border-radius:6px;border:none;background:transparent;
  color:#565f89;cursor:pointer;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;transition:all .12s;}
.ce-ltab.active{background:rgba(122,162,247,.15);color:#7aa2f7;}
.ce-ltab:hover:not(.active){background:rgba(255,255,255,.05);color:#a9b1d6;}
.ce-edbts{display:flex;gap:6px;align-items:center;}

/* icon buttons – editor */
.ce-ibtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;
  height:30px;padding:0 13px;border-radius:7px;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;
  border:none;transition:all .15s;white-space:nowrap;}
.ce-ib-save{background:transparent;border:1.5px solid #3d5166;color:#7aa2f7;}
.ce-ib-save:hover{border-color:#7aa2f7;background:rgba(122,162,247,.08);}
.ce-ib-run{background:#26a69a;color:#fff;}
.ce-ib-run:hover{background:#1e8077;}
.ce-ib-run:disabled{background:#2d4a48;color:#537270;cursor:not-allowed;}
.ce-ib-sub{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;}
.ce-ib-sub:hover{opacity:.88;}

.ce-edarea{flex:1;display:flex;overflow:hidden;}
.ce-lnums{background:#16161e;padding:14px 10px;text-align:right;
  font-size:13px;font-family:'JetBrains Mono',monospace;color:#3d4f66;
  line-height:1.6;user-select:none;min-width:46px;border-right:1px solid var(--eline);overflow:hidden;flex-shrink:0;}
.ce-lnum{height:20.8px;}
.ce-ta{flex:1;background:var(--ebg);color:var(--efg);font-family:'JetBrains Mono',monospace;
  font-size:13px;border:none;outline:none;padding:14px 16px;
  resize:none;line-height:1.6;tab-size:2;caret-color:#7aa2f7;}
.ce-ta::selection{background:rgba(122,162,247,.25);}

.ce-out{background:#13131a;border-top:1px solid var(--eline);max-height:170px;flex-shrink:0;overflow:auto;}
.ce-outhd{display:flex;align-items:center;justify-content:space-between;padding:7px 14px 0;}
.ce-outlbl{font-size:9px;font-weight:700;color:#565f89;font-family:'JetBrains Mono',monospace;letter-spacing:.8px;}
.ce-outclr{font-size:10px;color:#3d5166;background:none;border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;}
.ce-outclr:hover{color:#7aa2f7;}
.ce-outpre{margin:0;padding:6px 14px 12px;font-family:'JetBrains Mono',monospace;font-size:12.5px;white-space:pre-wrap;line-height:1.65;}
.ce-ok{color:#9ece6a;}
.ce-err{color:#f7768e;}

/* sidebar */
.ce-side{background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.ce-wsec{padding:14px 12px 12px;border-bottom:1px solid var(--border);}
.ce-slbl2{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);
  font-family:'JetBrains Mono',monospace;margin-bottom:8px;text-transform:uppercase;}
.ce-wcam{background:#0f172a;border-radius:10px;overflow:hidden;aspect-ratio:4/3;position:relative;}
.ce-wcamin{width:100%;height:100%;background:linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%);position:relative;}
.ce-sil{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:90px;height:120px;}
.ce-silh{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.10);margin:0 auto 4px;}
.ce-silb{width:72px;height:72px;border-radius:50% 50% 0 0;background:rgba(255,255,255,.07);margin:0 auto;}
.ce-wov{position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:4px;
  background:rgba(0,0,0,.45);border-radius:5px;padding:3px 7px;}
.ce-wrec{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:ce-pulse 1.5s ease infinite;}
.ce-wrlbl{font-size:8px;font-weight:700;color:rgba(255,255,255,.75);font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.ce-wstat{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
.ce-wdot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:ce-pulse 2s ease infinite;}
.ce-wact{font-size:9px;color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:700;}
.ce-wface{font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;}

.ce-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px;border-bottom:1px solid var(--border);}
.ce-sc{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 8px;text-align:center;}
.ce-sv{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:3px;}
.ce-sl{font-size:8px;font-weight:700;letter-spacing:1.2px;color:var(--dim);font-family:'JetBrains Mono',monospace;}

.ce-navsec{padding:12px;border-bottom:1px solid var(--border);}
.ce-ngrid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
.ce-ndot{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;
  border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);
  transition:all .12s;cursor:pointer;}
.ce-ndot.cur{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3);}
.ce-ndot.done{background:#e8f5e9;border-color:rgba(22,163,74,.3);color:var(--green);}
.ce-leg{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;}
.ce-li{display:flex;align-items:center;gap:4px;font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;}
.ce-ld{width:8px;height:8px;border-radius:3px;flex-shrink:0;}

.ce-plasec{padding:12px;}
.ce-placard{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;}
.ce-plabar{height:5px;border-radius:99px;background:var(--border);overflow:hidden;margin:6px 0 4px;}
.ce-plafill{height:100%;border-radius:99px;transition:width .4s,background .4s;}
.ce-plafill.low{background:var(--green);}
.ce-plafill.mid{background:var(--amber);}
.ce-plafill.high{background:var(--red);}
.ce-plalbl{font-size:9px;font-family:'JetBrains Mono',monospace;color:var(--muted);}

/* action bar */
.ce-bar{position:fixed;bottom:0;left:0;right:280px;
  background:rgba(244,246,251,.96);backdrop-filter:blur(14px);
  border-top:1px solid var(--border);padding:10px 16px;
  display:flex;gap:8px;align-items:center;z-index:50;}
.ce-bb{display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:0 20px;height:40px;border-radius:9px;border:none;
  font-size:13px;font-weight:600;font-family:'IBM Plex Sans',sans-serif;
  cursor:pointer;transition:all .15s;white-space:nowrap;}
.ce-bb-out{background:transparent;color:var(--accent);border:1.5px solid var(--accent);}
.ce-bb-out:hover{background:var(--accent-s);}
.ce-bb-dark{flex:1;background:#0f172a;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.18);}
.ce-bb-dark:hover{background:#1e293b;}
.ce-bb-prim{flex:1;background:var(--accent);color:#fff;box-shadow:0 2px 10px rgba(37,99,235,.28);}
.ce-bb-prim:hover{background:#1d4ed8;}

/* viol */
.ce-vbanner{display:none;margin:8px 16px 0;background:var(--amber-s);
  border:1.5px solid rgba(217,119,6,.25);border-radius:9px;padding:9px 12px;
  align-items:flex-start;gap:9px;}
.ce-vbanner.show{display:flex;}
.ce-vmsg{font-size:12px;color:#92400e;font-weight:600;line-height:1.6;}

/* modal */
.ce-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:200;}
.ce-modal{background:#fff;border-radius:14px;padding:26px;max-width:400px;width:90%;box-shadow:var(--sh-lg);animation:ce-up .25s ease;}

/* result */
.ce-resov{position:fixed;inset:0;background:rgba(244,246,251,.97);backdrop-filter:blur(18px);
  z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;}
.ce-rescard{background:var(--surface);border:1px solid var(--border);border-radius:18px;
  overflow:hidden;max-width:480px;width:100%;box-shadow:var(--sh-lg);animation:ce-up .5s cubic-bezier(.22,1,.36,1);}

/* loading */
.ce-load{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);gap:12px;}
.ce-spin{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:ce-rot .8s linear infinite;}
.ce-ltxt{color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;}

@keyframes ce-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes ce-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
@keyframes ce-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ce-rot{to{transform:rotate(360deg)}}
@keyframes ce-tp{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.2)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}}
`;

// ─── Language config ───────────────────────────────────────────────────────────
const LANGS = [
  { key:'python',     label:'Python'     },
  { key:'java',       label:'Java'       },
  { key:'cpp',        label:'C++'        },
  { key:'javascript', label:'JavaScript' },
];

// ─── Parse the AI-generated explanation JSON blob ──────────────────────────────
// Your DB stores coding question metadata as JSON inside the `explanation` column:
// { description, constraints, sampleCases:[{input,output,explanation}],
//   starterCode:{python,java,cpp,javascript}, hint, platform, ... }
function parseMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    // Strip leading/trailing whitespace
    const s = raw.trim();
    if (!s.startsWith('{')) return null;
    try { return JSON.parse(s); } catch (_) { return null; }
  }
  return null;
}

// Get starter code for a language — explanation blob → DB columns → fallback
function getStarter(q, lang) {
  const meta = parseMeta(q.explanation);

  // 1. Parsed explanation.starterCode object (AI-generated structure)
  if (meta?.starterCode?.[lang] && meta.starterCode[lang].trim()) {
    return meta.starterCode[lang];
  }
  // 2. Flat DB columns: starter_python / starter_java / starter_cpp / starter_javascript
  const col = `starter_${lang}`;
  if (q[col] && q[col].trim()) return q[col];
  // 3. Generic starter_code (old column) for python only
  if (lang === 'python' && q.starter_code && q.starter_code.trim()) return q.starter_code;
  // 4. Clean fallback — always "Solution" not question title
  return buildFallback(lang);
}

function buildFallback(lang) {
  switch (lang) {
    case 'python':
      return 'def solution():\n    # Write your solution here\n    pass\n';
    case 'java':
      return 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n';
    case 'cpp':
      return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n';
    case 'javascript':
      return '/**\n * @param {*} input\n * @return {*}\n */\nfunction solution(input) {\n    // Write your solution here\n}\n';
    default:
      return `// Write your ${lang} solution here\n`;
  }
}

// Extract human-readable description (NEVER raw JSON string)
function getDesc(q) {
  const meta = parseMeta(q.explanation);
  if (meta?.description) return meta.description;
  // Only use q.description if it doesn't look like JSON
  if (q.description && typeof q.description === 'string' && !q.description.trim().startsWith('{'))
    return q.description;
  return null;
}

function getConstraints(q) {
  const meta = parseMeta(q.explanation);
  return meta?.constraints || q.constraints_text || q.constraints || null;
}

// Returns array of { input, output, explanation }
function getSamples(q) {
  const meta = parseMeta(q.explanation);
  if (meta?.sampleCases?.length) return meta.sampleCases;
  if (meta?.examples?.length)    return meta.examples;   // some AI uses "examples"
  if (q.sample_input != null || q.sample_output != null)
    return [{ input: q.sample_input ?? null, output: q.sample_output ?? null }];
  return [];
}

function getHint(q) {
  const meta = parseMeta(q.explanation);
  return meta?.hint || meta?.approach || q.hint || null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}
function resolveExamId(prop, rs) {
  if (prop) return typeof prop === 'string' ? parseInt(prop, 10) : prop;
  const s = rs?.exam_id || rs?.examId || rs?.exam?.id;
  if (s) return typeof s === 'string' ? parseInt(s, 10) : s;
  const ls = localStorage.getItem('exam_id') || localStorage.getItem('examId');
  return ls ? parseInt(ls, 10) : null;
}
function resolveAssignId(prop, rs) {
  if (prop) return prop;
  const s = rs?.assignment_id || rs?.assignmentId || rs?.exam?.assignment_id;
  if (s) return s;
  return localStorage.getItem('assignment_id') || localStorage.getItem('assignmentId') || null;
}
function similarity(a, b) {
  if (!a || !b || a.length < 8 || b.length < 8) return 0;
  const tri = s => { const t = new Set(); for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i+3)); return t; };
  const ta = tri(a.replace(/\s+/g,' ')), tb = tri(b.replace(/\s+/g,' '));
  let n = 0; ta.forEach(t => { if (tb.has(t)) n++; });
  return n / (ta.size + tb.size - n);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IcBrain  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/></svg>;
const IcWarn   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcSave   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcPlay   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcSend   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcArrow  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcCheck  = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── Static webcam mock ────────────────────────────────────────────────────────
function WebcamMock() {
  return (
    <>
      <div className="ce-slbl2">Live Monitoring</div>
      <div className="ce-wcam">
        <div className="ce-wcamin">
          <div className="ce-sil"><div className="ce-silh"/><div className="ce-silb"/></div>
          <div className="ce-wov"><div className="ce-wrec"/><span className="ce-wrlbl">LIVE</span></div>
        </div>
      </div>
      <div className="ce-wstat">
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div className="ce-wdot"/><span className="ce-wact">ACTIVE</span>
        </div>
        <span className="ce-wface">Face detected</span>
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CodeExam({
  examId:       examIdProp,
  assignmentId: assignmentIdProp,
  onNavigate, onStartViva,
  examTitle:    examTitleProp,
  durationMins: durationMinsProp,
}) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const rs         = location.state || {};
  const examId       = resolveExamId(examIdProp, rs);
  const assignmentId = resolveAssignId(assignmentIdProp, rs);
  const examTitle    = examTitleProp || rs.title || rs.examTitle || 'Round 3 – Coding';
  const durationMins = durationMinsProp || rs.duration || rs.durationMins || 45;

  useEffect(() => {
    if (examId)       localStorage.setItem('exam_id',       String(examId));
    if (assignmentId) localStorage.setItem('assignment_id', String(assignmentId));
  }, [examId, assignmentId]);

  useEffect(() => {
    if (!document.getElementById('ce-css')) {
      const s = document.createElement('style'); s.id='ce-css'; s.textContent=CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── state ────────────────────────────────────────────────────────────────
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [current,    setCurrent]    = useState(0);
  const [lang,       setLang]       = useState('python');
  const [codeMap,    setCodeMap]    = useState({}); // {[qId]:{[lang]:code}}
  const [answers,    setAnswers]    = useState({}); // {[qId]:{lang,code}}
  const [output,     setOutput]     = useState(null);
  const [running,    setRunning]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [timeLeft,   setTimeLeft]   = useState(durationMins * 60);
  const [violations, setViolations] = useState([]);
  const [violMsg,    setViolMsg]    = useState('');
  const [showViol,   setShowViol]   = useState(false);
  const [plagScore,  setPlagScore]  = useState(0);
  const [subtab,     setSubtab]     = useState('problem');

  const timerRef  = useRef(null);
  const vTRef     = useRef(null);
  const listenRef = useRef(false);
  const violsRef  = useRef([]);
  const doneRef   = useRef(false);
  const taRef     = useRef(null);
  const lnRef     = useRef(null);

  // optional proctoring
  const ph = (useAIProctoring || (() => ({
    videoRef:{current:null},canvasRef:{current:null},
    proctoringState:{},violations:[],isReady:false,modelError:null,
  })))({ onViolation:e=>triggerViol(e.message), assignmentId, examId, token:getToken(), enabled:!submitted });
  const { videoRef,canvasRef,proctoringState,violations:aiViol,isReady:procReady,modelError } = ph;
  const hasOverlay = !!ProctoringOverlay;

  // ── fetch questions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId || isNaN(examId)) { setLoading(false); return; }
    const url = `${API_URL}/api/questions/${examId}/coding${assignmentId?`?assignment_id=${assignmentId}`:''}`;
    fetch(url, { headers:{ Authorization:`Bearer ${getToken()}` } })
      .then(r => { if (!r.ok) throw new Error('fetch'); return r.json(); })
      .then(data => {
        const qs = data.questions || [];
        setQuestions(qs);
        // Seed codeMap with starters for every language
        const cm = {};
        qs.forEach(q => {
          cm[q.id] = {};
          LANGS.forEach(({ key }) => { cm[q.id][key] = getStarter(q, key); });
        });
        setCodeMap(cm);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [examId, assignmentId]); // eslint-disable-line

  // Clear output when question or language changes
  useEffect(() => { setOutput(null); }, [current, lang]);

  const q           = questions[current] || null;
  const currentCode = q ? (codeMap[q.id]?.[lang] ?? getStarter(q, lang)) : '';
  const lineCount   = Math.max((currentCode.match(/\n/g)||[]).length + 1, 20);
  const syncScroll  = () => { if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop; };

  // ── timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p<=1){clearInterval(timerRef.current);doSubmit();return 0;} return p-1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]); // eslint-disable-line

  // ── violation listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { listenRef.current = true; }, 2000);
    const onH = () => { if (listenRef.current && document.hidden) triggerViol('Tab switch detected'); };
    const onB = () => { if (listenRef.current) triggerViol('Window focus lost'); };
    document.addEventListener('visibilitychange', onH);
    window.addEventListener('blur', onB);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange',onH); window.removeEventListener('blur',onB); };
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
    if (violsRef.current.length >= 3) doSubmit();
  }, []); // eslint-disable-line

  // ── code editing ──────────────────────────────────────────────────────────
  function handleCode(val) {
    if (!q) return;
    setCodeMap(p => ({ ...p, [q.id]: { ...(p[q.id]||{}), [lang]: val } }));
    setPlagScore(Math.round(similarity(val, getStarter(q, lang)) * 100));
  }
  function handleTab(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const s = e.target.selectionStart, end = e.target.selectionEnd;
    const next = currentCode.substring(0, s) + '  ' + currentCode.substring(end);
    handleCode(next);
    requestAnimationFrame(() => {
      if (taRef.current) { taRef.current.selectionStart = s+2; taRef.current.selectionEnd = s+2; }
    });
  }

  function saveAnswer() {
    if (!q) return;
    setAnswers(p => ({ ...p, [q.id]: { lang, code: currentCode } }));
  }

  function runCode() {
    setRunning(true); setOutput(null);
    try {
      if (lang === 'javascript') {
        const logs = [];
        // eslint-disable-next-line no-new-func
        new Function('console', currentCode)({ log:(...a)=>logs.push(a.map(String).join(' ')) });
        setOutput({ text: logs.join('\n') || '(no output)', ok: true });
      } else {
        setOutput({ text: `${lang.toUpperCase()} execution requires the backend sandbox.\nYour code is saved — submit to evaluate.`, ok: false });
      }
    } catch (err) {
      setOutput({ text: 'Error: ' + err.message, ok: false });
    }
    setRunning(false);
  }

  const doSubmit = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(timerRef.current);
    setShowConf(false);
    const finals = { ...answers };
    if (q) finals[q.id] = { lang, code: currentCode };
    localStorage.setItem('last_code_submission', JSON.stringify(finals));
    if (assignmentId && examId && !isNaN(examId)) {
      fetch(`${API_URL}/api/questions/submit`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
        body: JSON.stringify({ assignment_id:assignmentId, exam_id:examId, code_answers:finals, violations:violsRef.current, round:'coding' }),
      }).catch(()=>{});
    }
    setSubmitted(true);
  }, [answers, q, lang, currentCode, assignmentId, examId]); // eslint-disable-line

  function goNext() {
    const n = Object.keys(answers).length;
    if (onNavigate)  return onNavigate('viva');
    if (onStartViva) return onStartViva(n);
    navigate('/viva', { state:{ examId, assignmentId, codingScore:n } });
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const pct      = timeLeft / (durationMins * 60);
  const tCls     = `ce-timer${pct<=0.1?' danger':pct<=0.25?' warn':''}`;
  const mm       = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const ss       = String(timeLeft%60).padStart(2,'0');
  const answered = Object.keys(answers).length;
  const plagCls  = plagScore<30?'low':plagScore<60?'mid':'high';
  const plagClr  = plagScore<30?'var(--green)':plagScore<60?'var(--amber)':'var(--red)';

  const desc    = q ? getDesc(q)        : null;
  const constr  = q ? getConstraints(q) : null;
  const samples = q ? getSamples(q)     : [];
  const hint    = q ? getHint(q)        : null;

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="ce-load">
      <div className="ce-spin"/>
      <p className="ce-ltxt">Loading coding problems…</p>
      <style>{CSS}</style>
    </div>
  );

  // ── submitted ──────────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="ce-resov">
      <div className="ce-rescard">
        <div style={{height:5,background:'linear-gradient(90deg,#26a69a,#2563eb)'}}/>
        <div style={{padding:'34px 30px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:66,height:66,borderRadius:'50%',marginBottom:16,background:'var(--accent-s)',border:'2px solid var(--accent-m)',color:'var(--accent)'}}>
            <IcCheck/>
          </div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace",marginBottom:8}}>ROUND 3 COMPLETE</div>
          <h2 style={{fontSize:20,fontWeight:700,color:'var(--text)',marginBottom:10,letterSpacing:-.3}}>Coding Round Submitted</h2>
          <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:20}}>Your solutions have been recorded. Proceed to the AI Viva assessment.</p>
          {violations.length>0 && (
            <div style={{background:'var(--amber-s)',border:'1px solid rgba(217,119,6,.2)',borderRadius:9,padding:'12px 14px',marginBottom:18,textAlign:'left'}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--amber)',fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>{violations.length} WARNING{violations.length>1?'S':''}</div>
              {violations.map((v,i)=>(
                <div key={i} style={{fontSize:12,color:'#92400e',marginBottom:2}}>{v.reason} <span style={{opacity:.6,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>{v.time}</span></div>
              ))}
            </div>
          )}
          <div style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1.5px solid rgba(22,163,74,.25)',borderRadius:12,padding:18,textAlign:'left'}}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--green)',marginBottom:3}}>AI Viva Round Unlocked</div>
            <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:14}}>Proceed to Round 4 — AI-Powered Oral Assessment</div>
            <button onClick={goNext} style={{width:'100%',padding:'11px 0',borderRadius:8,border:'none',background:'var(--green)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 10px rgba(22,163,74,.3)'}}>
              Start AI Viva <IcArrow/>
            </button>
          </div>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="ce-wrap">

        {/* TOPBAR */}
        <header className="ce-top">
          <div className="ce-brand">
            <div className="ce-bicon"><IcBrain/></div>
            <div>
              <div className="ce-bname">NeuroAssess</div>
              <div className="ce-bsub">ASSESSMENT PLATFORM</div>
            </div>
          </div>
          <div className="ce-vline"/>
          <div className="ce-einfo">
            <div className="ce-etitle">{examTitle}</div>
            <div className="ce-emeta">Coding · {questions.length} Problem{questions.length!==1?'s':''}</div>
          </div>
          {violations.length>0 && (
            <div className="ce-vbadge"><IcWarn/><span className="ce-vblbl">{violations.length} Warning{violations.length>1?'s':''}</span></div>
          )}
          <div className="ce-spacer"/>
          <div className="ce-ppill"><div className="ce-pdot"/><span className="ce-plbl">PROCTORED</span></div>
          <div className={tCls}><div className="ce-tdot"/><span className="ce-tval">{mm}:{ss}</span></div>
        </header>

        {/* MAIN */}
        <main className="ce-main">
          <div className="ce-pgrow">
            <div className="ce-pgbar">
              <div className="ce-pgfill" style={{width:`${questions.length>0?Math.round(((current+1)/questions.length)*100):0}%`}}/>
            </div>
            <span className="ce-pglbl">{current+1} / {Math.max(questions.length,1)}</span>
          </div>

          {showViol && (
            <div className="ce-vbanner show">
              <span style={{color:'var(--amber)',flexShrink:0}}><IcWarn/></span>
              <span className="ce-vmsg">{violMsg}</span>
            </div>
          )}

          <div className="ce-split" style={{marginTop:8}}>

            {/* PROBLEM PANEL */}
            <div className="ce-prob">
              <div className="ce-phdr">
                <div className="ce-qtabs">
                  {questions.map((pq,i) => (
                    <button key={i} className={`ce-qtab${i===current?' active':answers[pq.id]?' done':''}`} onClick={()=>setCurrent(i)}>P{i+1}</button>
                  ))}
                  {questions.length===0 && <span className="ce-qtab active">P1</span>}
                </div>
                {q && (
                  <div className="ce-qmeta">
                    <span className="ce-qnum">Q{String(current+1).padStart(2,'0')}</span>
                    {q.difficulty && <span className={`ce-diff ce-diff-${q.difficulty}`}>{q.difficulty}</span>}
                    {(q.topic||q.topic_tag) && <span className="ce-ttag">{q.topic||q.topic_tag}</span>}
                  </div>
                )}
              </div>

              <div className="ce-stabs">
                {['problem','sample','hint'].map(t => (
                  <button key={t} className={`ce-stab${subtab===t?' active':''}`} onClick={()=>setSubtab(t)}>
                    {t==='problem'?'Problem':t==='sample'?'Sample I/O':'Hint'}
                  </button>
                ))}
              </div>

              <div className="ce-pbody">
                {!q ? (
                  <div className="ce-empty">No coding problems found for this exam.</div>
                ) : subtab==='problem' ? (
                  <>
                    <div className="ce-qtitle">{q.question_text}</div>
                    {desc && (<><div className="ce-slbl">Description</div><p className="ce-desc">{desc}</p></>)}
                    {constr && (<><div className="ce-slbl">Constraints</div><pre className="ce-cbox">{constr}</pre></>)}
                    {!desc && !constr && (
                      <p className="ce-desc" style={{color:'var(--muted)',fontStyle:'italic'}}>
                        Solve the problem as described in the title above. Use the Sample I/O tab for examples.
                      </p>
                    )}
                  </>
                ) : subtab==='sample' ? (
                  <>
                    <div className="ce-qtitle" style={{fontSize:14}}>{q.question_text}</div>
                    {samples.length>0 ? samples.map((sc,i) => (
                      <div key={i} style={{marginBottom:12}}>
                        {samples.length>1 && <div className="ce-slbl">Example {i+1}</div>}
                        {sc.input!=null && (
                          <div className="ce-sample-block">
                            <div className="ce-shead"><span>INPUT</span></div>
                            <div className="ce-scode">{String(sc.input)}</div>
                          </div>
                        )}
                        {sc.output!=null && (
                          <div className="ce-sample-block">
                            <div className="ce-shead"><span>OUTPUT</span></div>
                            <div className="ce-scode">{String(sc.output)}</div>
                          </div>
                        )}
                        {sc.explanation && (
                          <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginTop:4}}>
                            <strong>Explanation:</strong> {sc.explanation}
                          </p>
                        )}
                      </div>
                    )) : <div className="ce-empty">No sample I/O provided for this problem.</div>}
                  </>
                ) : (
                  <>
                    <div className="ce-qtitle" style={{fontSize:14}}>{q.question_text}</div>
                    {hint
                      ? <div className="ce-hint-box"><p className="ce-hint-txt">{hint}</p></div>
                      : <div className="ce-empty">No hint available. Try breaking the problem into smaller subproblems.</div>}
                  </>
                )}
              </div>
            </div>

            {/* EDITOR PANEL */}
            <div className="ce-ed">
              <div className="ce-edtop">
                <div className="ce-langs">
                  {LANGS.map(({key,label}) => (
                    <button key={key} className={`ce-ltab${lang===key?' active':''}`}
                      onClick={()=>{ setLang(key); setOutput(null); }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ce-edbts">
                  <button className="ce-ibtn ce-ib-save" onClick={saveAnswer} title="Save progress">
                    <IcSave/> Save
                  </button>
                  <button className="ce-ibtn ce-ib-run" onClick={runCode} disabled={running} title="Run code">
                    <IcPlay/> {running?'Running…':'Run'}
                  </button>
                  <button className="ce-ibtn ce-ib-sub" onClick={()=>setShowConf(true)} title="Submit all solutions">
                    <IcSend/> Submit
                  </button>
                </div>
              </div>

              <div className="ce-edarea">
                <div className="ce-lnums" ref={lnRef}>
                  {Array.from({length:lineCount},(_,i)=>(
                    <div key={i} className="ce-lnum">{i+1}</div>
                  ))}
                </div>
                <textarea
                  ref={taRef}
                  className="ce-ta"
                  value={currentCode}
                  onChange={e=>handleCode(e.target.value)}
                  onScroll={syncScroll}
                  onKeyDown={handleTab}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>

              {output && (
                <div className="ce-out">
                  <div className="ce-outhd">
                    <span className="ce-outlbl">OUTPUT</span>
                    <button className="ce-outclr" onClick={()=>setOutput(null)}>✕ clear</button>
                  </div>
                  <pre className={`ce-outpre ${output.ok?'ce-ok':'ce-err'}`}>{output.text}</pre>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="ce-side">
          <div className="ce-wsec">
            {hasOverlay
              ? <ProctoringOverlay videoRef={videoRef} canvasRef={canvasRef}
                  proctoringState={proctoringState} violations={aiViol}
                  isReady={procReady} modelError={modelError} compact={false}/>
              : <WebcamMock/>}
          </div>

          <div className="ce-sgrid">
            {[
              {val:answered,               lbl:'SAVED',    clr:'var(--green)'},
              {val:questions.length-answered, lbl:'REMAINING',clr:'var(--accent)'},
              {val:violations.length,      lbl:'WARNINGS', clr:violations.length>0?'var(--amber)':'var(--dim)'},
            ].map(({val,lbl,clr})=>(
              <div className="ce-sc" key={lbl}>
                <div className="ce-sv" style={{color:clr}}>{val}</div>
                <div className="ce-sl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="ce-navsec">
            <div className="ce-slbl2">Problems</div>
            <div className="ce-ngrid">
              {questions.map((pq,i)=>(
                <div key={i} className={`ce-ndot${i===current?' cur':answers[pq.id]?' done':''}`} onClick={()=>setCurrent(i)}>{i+1}</div>
              ))}
              {questions.length===0 && <div className="ce-ndot cur">1</div>}
            </div>
            <div className="ce-leg">
              {[
                {clr:'var(--accent)', brd:'none',                         lbl:'Active'},
                {clr:'#e8f5e9',      brd:'1px solid rgba(22,163,74,.3)', lbl:'Saved'},
                {clr:'var(--surface2)',brd:'1px solid var(--border)',     lbl:'Pending'},
              ].map(({clr,brd,lbl})=>(
                <div className="ce-li" key={lbl}>
                  <div className="ce-ld" style={{background:clr,border:brd}}/>{lbl}
                </div>
              ))}
            </div>
          </div>

          <div className="ce-plasec">
            <div className="ce-slbl2">Originality</div>
            <div className="ce-placard">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                <span style={{fontSize:10,color:'var(--text2)',fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>Similarity</span>
                <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:plagClr}}>{plagScore}%</span>
              </div>
              <div className="ce-plabar"><div className={`ce-plafill ${plagCls}`} style={{width:`${plagScore}%`}}/></div>
              <div className="ce-plalbl">{plagScore<30?'Original solution':plagScore<60?'Moderate similarity':'High similarity detected'}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* ACTION BAR */}
      <div className="ce-bar">
        <button className="ce-bb ce-bb-out" onClick={saveAnswer}>
          <IcSave/> Save
        </button>
        {current+1 < questions.length ? (
          <button className="ce-bb ce-bb-dark" onClick={()=>{ saveAnswer(); setCurrent(c=>c+1); }}>
            Next Problem <IcArrow/>
          </button>
        ) : (
          <button className="ce-bb ce-bb-prim" onClick={()=>setShowConf(true)}>
            Submit &amp; Proceed <IcSend/>
          </button>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {showConf && (
        <div className="ce-ov">
          <div className="ce-modal">
            <h3 style={{margin:'0 0 10px',color:'var(--text)',fontSize:17,fontWeight:700}}>Submit Solutions?</h3>
            <p style={{color:'var(--muted)',marginBottom:14,fontSize:13,lineHeight:1.7}}>
              {answered} of {questions.length} problem{questions.length!==1?'s':''} saved. You cannot edit after submitting.
            </p>
            {violations.length>0 && (
              <div style={{background:'var(--amber-s)',borderRadius:7,padding:'9px 12px',marginBottom:14,fontSize:12,color:'#92400e'}}>
                {violations.length} proctoring warning{violations.length>1?'s':''} will be recorded.
              </div>
            )}
            <div style={{display:'flex',gap:9,justifyContent:'flex-end'}}>
              <button className="ce-bb ce-bb-out" style={{flex:'none',height:38,padding:'0 18px'}} onClick={()=>setShowConf(false)}>Cancel</button>
              <button className="ce-bb ce-bb-prim" style={{flex:'none',height:38,padding:'0 22px',fontSize:13}} onClick={doSubmit}>
                <IcSend/> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}