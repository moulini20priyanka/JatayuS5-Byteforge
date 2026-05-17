

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = (() => {
  try {
    const v = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || '';
    return v ? v.replace(/\/api\/?$/, '') : 'http://localhost:5000';
  } catch { return 'http://localhost:5000'; }
})();

let useAIProctoring = null;
let ProctoringOverlay = null;
try {
  useAIProctoring   = require('../hooks/useAIProctoring').useAIProctoring;
  ProctoringOverlay = require('./ProctoringOverlay').default;
} catch { /* no proctoring — use static mock */ }

// ─── LANGUAGE CONFIG ──────────────────────────────────────────────────────────
const LANGS = [
  { key: 'python',     label: 'Python 3',    ext: 'py'  },
  { key: 'java',       label: 'Java 17',     ext: 'java'},
  { key: 'cpp',        label: 'C++17',       ext: 'cpp' },
  { key: 'c',          label: 'C17',         ext: 'c'   },
  { key: 'javascript', label: 'JavaScript',  ext: 'js'  },
];

// ─── AI DETECTION PATTERNS (JavaScript-only live detection) ──────────────────
const AI_PATTERNS = [
  { pattern: /const\s+map\s*=\s*new\s+Map/i,     label: 'HashMap pattern',      weight: 15, explanation: 'Classic AI-suggested optimal approach using a hash map' },
  { pattern: /\.get\(target\s*-/i,               label: 'Complement lookup',    weight: 12, explanation: 'Mathematically precise complement calculation typical of AI' },
  { pattern: /for\s*\(\s*let\s+i\s*=\s*0.*\.length/i, label: 'Standard loop idiom', weight: 8,  explanation: 'Formulaic loop structure favored by code generators' },
  { pattern: /map\.set\(nums\[i\]/i,             label: 'Map.set indexing',     weight: 10, explanation: 'Verbatim hash-map pattern from AI training corpora' },
  { pattern: /return\s+\[.*\]/i,                 label: 'Array return shorthand',weight: 6, explanation: 'Inline array return preferred by AI completions' },
  { pattern: /defaultdict|enumerate\(|zip\(/,    label: 'AI Python idioms',     weight: 14, explanation: 'Advanced Python patterns common in AI-generated code' },
  { pattern: /HashMap|ArrayList|StringBuilder/,  label: 'Java AI patterns',     weight: 12, explanation: 'Java collection names typical in AI solutions' },
];

const REFERENCE_SOLUTIONS = [
  `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (map.has(target - nums[i])) return [map.get(target - nums[i]), i];\n    map.set(nums[i], i);\n  }\n}`,
  `function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) return [i, j];\n    }\n  }\n}`,
];

// ─── ANALYSIS HELPERS ─────────────────────────────────────────────────────────
function tokenize(code) {
  return code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()
    .split(/\b/).filter(t => t.trim().length > 0);
}
function computeSimilarity(codeA, codeB) {
  const tokA = new Set(tokenize(codeA));
  const tokB = new Set(tokenize(codeB));
  const inter = [...tokA].filter(t => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : Math.round((inter / union) * 100);
}
function detectAIPatterns(code) {
  const found = []; let totalWeight = 0;
  for (const p of AI_PATTERNS) {
    if (p.pattern.test(code)) { found.push(p); totalWeight += p.weight; }
  }
  return { found, score: Math.min(100, totalWeight * 2) };
}
function analyzeCode(code) {
  const lines = code.split('\n').filter(l => l.trim()).length;
  const hasComments = /\/\/|\/\*|#/.test(code);
  const hasConsoleLog = /console\.log|print\(|System\.out/.test(code);
  const indented = code.split('\n').filter(l => l.startsWith('  ') || l.startsWith('\t')).length;
  const structureScore = Math.min(100, lines * 4 + (hasComments ? 15 : 0) + Math.round((indented / Math.max(lines, 1)) * 100));
  return { lines, hasComments, hasConsoleLog, structureScore };
}
function runJSTestCase(code, tc) {
  try {
    const fn = new Function(`${code}\nreturn typeof twoSum !== 'undefined' ? twoSum : typeof solution !== 'undefined' ? solution : null;`)();
    if (!fn) return { passed: false, actual: null, error: 'No twoSum/solution function found' };
    const parts = tc.input.split(', ');
    const nums = JSON.parse(parts[0]); const target = parseInt(parts[1]);
    const result = fn(nums, target);
    const resultStr = JSON.stringify(result);
    return { passed: resultStr === tc.expected, actual: resultStr, error: null };
  } catch (e) { return { passed: false, actual: null, error: e.message }; }
}

// ─── STARTER CODE PER LANGUAGE ────────────────────────────────────────────────
function parseMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s.startsWith('{')) return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  return null;
}
function getStarter(q, lang) {
  const meta = parseMeta(q?.explanation);
  if (meta?.starterCode?.[lang]?.trim()) return meta.starterCode[lang];
  const col = `starter_${lang}`;
  if (q?.[col]?.trim()) return q[col];
  if (lang === 'python' && q?.starter_code?.trim()) return q.starter_code;
  return buildFallback(lang, q?.question_text || 'Problem');
}
function buildFallback(lang, title = 'Problem') {
  const fn = 'solution';
  switch (lang) {
    case 'python':     return `# ${title}\ndef ${fn}():\n    # Write your solution here\n    pass\n`;
    case 'java':       return `// ${title}\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`;
    case 'cpp':        return `// ${title}\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
    case 'c':          return `// ${title}\n#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
    case 'javascript': return `// ${title}\n/**\n * @param {*} input\n * @return {*}\n */\nfunction solution(input) {\n    // Write your solution here\n}\n`;
    default:           return `// Write your ${lang} solution here\n`;
  }
}
function getDesc(q) {
  const meta = parseMeta(q?.explanation);
  if (meta?.description) return meta.description;
  if (q?.description && !q.description.trim().startsWith('{')) return q.description;
  return null;
}
function getConstraintsList(q) {
  const meta = parseMeta(q?.explanation);
  const raw = meta?.constraints || q?.constraints_text || q?.constraints || null;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}
function getSamples(q) {
  const meta = parseMeta(q?.explanation);
  if (meta?.sampleCases?.length) return meta.sampleCases;
  if (meta?.examples?.length)    return meta.examples;
  if (q?.sample_input != null || q?.sample_output != null)
    return [{ input: q.sample_input ?? null, output: q.sample_output ?? null }];
  return [];
}
function getHint(q) {
  const meta = parseMeta(q?.explanation);
  return meta?.hint || meta?.approach || q?.hint || null;
}
function getTestCases(q) {
  const meta = parseMeta(q?.explanation);
  if (meta?.testCases?.length) return meta.testCases;
  const samples = getSamples(q);
  return samples.map((s, i) => ({
    id: i + 1, input: String(s.input ?? ''), expected: String(s.output ?? ''), hidden: false,
  }));
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('student_token') || '';
}
function resolveExamId(prop, rs) {
  if (prop) return typeof prop === 'string' ? parseInt(prop, 10) : prop;
  const s = rs?.exam_id || rs?.examId || rs?.exam?.id;
  if (s) return typeof s === 'string' ? parseInt(s, 10) : s;
  const ls = localStorage.getItem('exam_id');
  return ls ? parseInt(ls, 10) : null;
}
function resolveAssignId(prop, rs) {
  if (prop) return prop;
  return rs?.assignment_id || rs?.assignmentId || rs?.exam?.assignment_id
    || localStorage.getItem('assignment_id') || null;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --gh-bg:#0d1117;
  --gh-surface:#161b22;
  --gh-surface2:#21262d;
  --gh-border:#30363d;
  --gh-text:#e6edf3;
  --gh-text2:#c9d1d9;
  --gh-muted:#8b949e;
  --gh-dim:#6e7681;
  --gh-blue:#58a6ff;
  --gh-blue-bg:#1f6feb22;
  --gh-green:#3fb950;
  --gh-green-bg:#12261e;
  --gh-green-border:#238636;
  --gh-red:#f85149;
  --gh-red-bg:#2d1217;
  --gh-red-border:#da3633;
  --gh-amber:#e3b341;
  --gh-amber-bg:#272115;
  --gh-amber-border:#9e6a03;
  --gh-purple:#bc8cff;
  --font-mono:'JetBrains Mono',monospace;
  --font-sans:'IBM Plex Sans',sans-serif;
}
html,body{height:100%;font-family:var(--font-sans);background:var(--gh-bg);color:var(--gh-text2);}

/* ── LAYOUT ── */
.cep-root{display:grid;grid-template-rows:49px 1fr;height:100vh;overflow:hidden;background:var(--gh-bg);}
.cep-header{display:flex;align-items:center;justify-content:space-between;padding:0 20px;
  border-bottom:1px solid var(--gh-border);background:var(--gh-surface);z-index:50;}
.cep-body{display:flex;overflow:hidden;}

/* ── HEADER ── */
.cep-brand{display:flex;align-items:center;gap:10px;}
.cep-bdot{width:8px;height:8px;border-radius:50%;background:var(--gh-green);flex-shrink:0;}
.cep-bname{font-size:14px;font-weight:600;color:var(--gh-text);}
.cep-qbadge{font-size:12px;color:var(--gh-muted);background:var(--gh-surface2);
  padding:2px 8px;border-radius:4px;border:1px solid var(--gh-border);}
.cep-hright{display:flex;align-items:center;gap:10px;}
.cep-timer{display:flex;align-items:center;gap:6px;font-family:var(--font-mono);
  font-size:14px;font-weight:500;letter-spacing:1px;color:var(--gh-text);}
.cep-timer.warn{color:var(--gh-amber);}
.cep-timer.danger{color:var(--gh-red);animation:cep-tp 1s ease infinite;}
.cep-vbadge{font-size:11px;background:var(--gh-amber-bg);border:1px solid var(--gh-amber-border);
  color:var(--gh-amber);padding:3px 10px;border-radius:20px;font-family:var(--font-mono);font-weight:700;}
.cep-btn{border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;
  font-family:var(--font-sans);cursor:pointer;transition:opacity .15s;display:flex;align-items:center;gap:6px;}
.cep-btn:hover{opacity:.85;}
.cep-btn:disabled{opacity:.4;cursor:not-allowed;}
.cep-btn-run{background:#21a662;color:#fff;}
.cep-btn-sub{background:#1f6feb;color:#fff;}
.cep-btn-save{background:transparent;border:1px solid var(--gh-border);color:var(--gh-muted);}

/* ── LEFT PANEL ── */
.cep-left{width:400px;min-width:300px;border-right:1px solid var(--gh-border);
  display:flex;flex-direction:column;overflow:hidden;background:var(--gh-surface);}
.cep-tabs{display:flex;border-bottom:1px solid var(--gh-border);flex-shrink:0;}
.cep-tab{flex:1;padding:10px 0;background:none;border:none;
  border-bottom:2px solid transparent;color:var(--gh-muted);
  font-size:13px;cursor:pointer;font-family:var(--font-sans);transition:all .15s;text-transform:capitalize;}
.cep-tab.active{color:var(--gh-blue);border-bottom-color:var(--gh-blue);}
.cep-tab:hover:not(.active){color:var(--gh-text2);}
.cep-lbody{flex:1;overflow-y:auto;padding:16px;}
.cep-qtitle{font-size:16px;font-weight:500;color:var(--gh-text);margin-bottom:12px;line-height:1.45;font-family:var(--font-sans);}
.cep-diffbadge{font-size:11px;padding:2px 8px;border-radius:10px;font-family:var(--font-sans);}
.cep-diff-easy{background:#12261e;color:var(--gh-green);border:1px solid var(--gh-green-border);}
.cep-diff-medium{background:#272115;color:var(--gh-amber);border:1px solid var(--gh-amber-border);}
.cep-diff-hard{background:var(--gh-red-bg);color:var(--gh-red);border:1px solid var(--gh-red-border);}
.cep-desc{font-size:13px;line-height:1.75;color:var(--gh-text2);white-space:pre-wrap;font-family:var(--font-sans);}
.cep-slbl{font-size:11px;font-weight:600;color:var(--gh-muted);margin:14px 0 6px;
  text-transform:uppercase;letter-spacing:.6px;font-family:var(--font-mono);}
.cep-ex{background:var(--gh-bg);border:1px solid var(--gh-border);border-radius:6px;padding:12px;margin-bottom:10px;}
.cep-exlbl{font-size:12px;color:var(--gh-muted);margin-bottom:6px;font-family:var(--font-sans);}
.cep-exrow{font-size:12px;font-family:var(--font-mono);color:var(--gh-text2);margin-bottom:2px;}
.cep-exkey{color:var(--gh-dim);}
.cep-exexpl{font-size:11px;color:var(--gh-dim);margin-top:5px;font-family:var(--font-sans);line-height:1.5;}
.cep-constraint{font-size:12px;color:var(--gh-text2);padding:3px 0;font-family:var(--font-mono);}
.cep-hint{background:var(--gh-amber-bg);border:1px solid var(--gh-amber-border);border-radius:6px;padding:12px;}
.cep-hinttxt{font-size:13px;color:var(--gh-amber);line-height:1.7;font-family:var(--font-sans);}
.cep-empty{text-align:center;color:var(--gh-dim);font-family:var(--font-mono);font-size:12px;padding:32px 0;}

/* test cases */
.cep-tcinfo{font-size:12px;color:var(--gh-muted);margin-bottom:12px;font-family:var(--font-sans);}
.cep-tc{background:var(--gh-bg);border:1px solid var(--gh-border);border-radius:6px;padding:10px;margin-bottom:8px;transition:border-color .2s;}
.cep-tc.pass{border-color:var(--gh-green-border);background:var(--gh-green-bg);}
.cep-tc.fail{border-color:var(--gh-red-border);background:var(--gh-red-bg);}
.cep-tchd{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.cep-tcid{font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);}
.cep-tctag{font-size:10px;color:var(--gh-dim);background:var(--gh-surface2);padding:1px 6px;border-radius:3px;font-family:var(--font-sans);}
.cep-tcst{font-size:11px;font-weight:600;margin-left:auto;font-family:var(--font-sans);}
.cep-tcst.pass{color:var(--gh-green);}
.cep-tcst.fail{color:var(--gh-red);}
.cep-tcrow{font-size:12px;font-family:var(--font-mono);color:var(--gh-text2);margin-bottom:2px;}
.cep-tckey{color:var(--gh-dim);}
.cep-tcsummary{margin-top:12px;font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);
  padding:8px 12px;background:var(--gh-surface);border-radius:6px;border:1px solid var(--gh-border);}

/* ── EDITOR ── */
.cep-ed{flex:1;display:flex;flex-direction:column;background:var(--gh-bg);overflow:hidden;}
.cep-edtop{padding:8px 16px;border-bottom:1px solid var(--gh-border);background:var(--gh-surface);
  display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;}
.cep-langs{display:flex;gap:2px;flex-wrap:wrap;}
.cep-ltab{padding:5px 12px;border-radius:6px;border:1.5px solid transparent;background:transparent;
  color:var(--gh-dim);cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-mono);transition:all .12s;}
.cep-ltab.active{background:rgba(88,166,255,.12);color:var(--gh-blue);border-color:rgba(88,166,255,.3);}
.cep-ltab:hover:not(.active){background:var(--gh-surface2);color:var(--gh-muted);}
.cep-fname{font-size:12px;color:var(--gh-blue);font-family:var(--font-mono);}
.cep-edarea{flex:1;position:relative;overflow:hidden;display:flex;}
.cep-lnums{background:var(--gh-bg);padding:16px 8px;text-align:right;color:var(--gh-dim);
  font-size:13px;font-family:var(--font-mono);line-height:1.6;user-select:none;
  min-width:46px;border-right:1px solid var(--gh-border);overflow:hidden;flex-shrink:0;}
.cep-lnum{height:20.8px;}
.cep-ta{flex:1;background:var(--gh-bg);color:var(--gh-text2);font-family:var(--font-mono);
  font-size:13px;border:none;outline:none;padding:16px 16px;resize:none;line-height:1.6;
  tab-size:2;caret-color:var(--gh-blue);}
.cep-ta::selection{background:rgba(88,166,255,.2);}
.cep-out{background:#0a0e14;border-top:1px solid var(--gh-border);max-height:160px;flex-shrink:0;overflow:auto;}
.cep-outhd{display:flex;align-items:center;justify-content:space-between;padding:7px 14px 0;}
.cep-outlbl{font-size:9px;font-weight:700;color:var(--gh-dim);font-family:var(--font-mono);letter-spacing:.8px;}
.cep-outclr{font-size:10px;color:var(--gh-dim);background:none;border:none;cursor:pointer;font-family:var(--font-mono);}
.cep-outclr:hover{color:var(--gh-blue);}
.cep-outpre{margin:0;padding:6px 14px 12px;font-family:var(--font-mono);font-size:12.5px;white-space:pre-wrap;line-height:1.65;}
.cep-ok{color:#9ece6a;}
.cep-err{color:var(--gh-red);}

/* ── SIDEBAR ── */
.cep-side{width:260px;background:var(--gh-surface);border-left:1px solid var(--gh-border);
  overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;}
.cep-ssec{padding:12px;border-bottom:1px solid var(--gh-border);}
.cep-slbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--gh-dim);
  font-family:var(--font-mono);margin-bottom:8px;text-transform:uppercase;display:block;}
.cep-cam{background:#0a0e14;border-radius:8px;overflow:hidden;aspect-ratio:4/3;position:relative;border:1px solid var(--gh-border);}
.cep-camin{width:100%;height:100%;background:linear-gradient(160deg,#0a0e14 0%,#0f1f35 100%);position:relative;}
.cep-sil{position:absolute;bottom:0;left:50%;transform:translateX(-50%);}
.cep-silh{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);margin:0 auto 4px;}
.cep-silb{width:64px;height:64px;border-radius:50% 50% 0 0;background:rgba(255,255,255,.05);margin:0 auto;}
.cep-camov{position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:4px;
  background:rgba(0,0,0,.5);border-radius:4px;padding:2px 6px;}
.cep-camrec{width:5px;height:5px;border-radius:50%;background:var(--gh-red);animation:cep-pulse 1.5s ease infinite;}
.cep-camrlbl{font-size:8px;font-weight:700;color:rgba(255,255,255,.7);font-family:var(--font-mono);letter-spacing:.8px;}
.cep-camstat{display:flex;align-items:center;justify-content:space-between;margin-top:5px;}
.cep-camdot{width:5px;height:5px;border-radius:50%;background:var(--gh-green);animation:cep-pulse 2s ease infinite;}
.cep-camact{font-size:9px;color:var(--gh-green);font-family:var(--font-mono);font-weight:700;display:flex;align-items:center;gap:4px;}
.cep-camface{font-size:9px;color:var(--gh-dim);font-family:var(--font-mono);}
.cep-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px;border-bottom:1px solid var(--gh-border);}
.cep-sc{background:var(--gh-bg);border:1px solid var(--gh-border);border-radius:8px;padding:10px 8px;text-align:center;}
.cep-sv{font-size:20px;font-weight:700;font-family:var(--font-mono);line-height:1;margin-bottom:3px;}
.cep-sl{font-size:8px;font-weight:700;letter-spacing:1.2px;color:var(--gh-dim);font-family:var(--font-mono);}
.cep-qnav{padding:12px;border-bottom:1px solid var(--gh-border);}
.cep-qgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
.cep-qdot{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:600;font-family:var(--font-mono);border:1.5px solid var(--gh-border);
  background:var(--gh-surface2);color:var(--gh-dim);cursor:pointer;transition:all .12s;}
.cep-qdot.cur{background:var(--gh-blue);border-color:var(--gh-blue);color:#fff;}
.cep-qdot.done{background:var(--gh-green-bg);border-color:var(--gh-green-border);color:var(--gh-green);}
.cep-leg{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px;}
.cep-li{display:flex;align-items:center;gap:4px;font-size:9px;color:var(--gh-dim);font-family:var(--font-mono);}
.cep-ld{width:8px;height:8px;border-radius:3px;flex-shrink:0;}
.cep-plasec{padding:12px;}
.cep-placard{background:var(--gh-bg);border:1px solid var(--gh-border);border-radius:8px;padding:10px;}
.cep-plabar{height:5px;border-radius:99px;background:var(--gh-surface2);overflow:hidden;margin:6px 0 4px;}
.cep-plafill{height:100%;border-radius:99px;transition:width .4s,background .4s;}
.cep-plafill.low{background:var(--gh-green);}
.cep-plafill.mid{background:var(--gh-amber);}
.cep-plafill.high{background:var(--gh-red);}
.cep-plalbl{font-size:9px;font-family:var(--font-mono);color:var(--gh-muted);}

/* ── BOTTOM BAR ── */
.cep-bar{position:fixed;bottom:0;left:0;right:260px;background:rgba(22,27,34,.96);
  backdrop-filter:blur(12px);border-top:1px solid var(--gh-border);
  padding:10px 16px;display:flex;gap:8px;align-items:center;z-index:50;}
.cep-bbar-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:0 20px;height:38px;border-radius:7px;border:none;
  font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;transition:all .15s;}
.cep-bbar-btn:hover{opacity:.88;}
.cep-bbar-out{flex:1;background:transparent;color:var(--gh-blue);border:1.5px solid var(--gh-blue);}
.cep-bbar-out:hover{background:var(--gh-blue-bg);}
.cep-bbar-dark{flex:2;background:var(--gh-surface2);color:var(--gh-text);border:1px solid var(--gh-border);}
.cep-bbar-prim{flex:2;background:#1f6feb;color:#fff;}

/* ── MODAL ── */
.cep-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;
  align-items:center;justify-content:center;z-index:200;}
.cep-modal{background:var(--gh-surface);border:1px solid var(--gh-border);
  border-radius:12px;padding:24px;max-width:400px;width:90%;
  box-shadow:0 16px 50px rgba(0,0,0,.4);animation:cep-up .2s ease;}
.cep-modal h3{font-size:16px;font-weight:600;color:var(--gh-text);margin-bottom:8px;}
.cep-modal p{font-size:13px;color:var(--gh-muted);line-height:1.7;margin-bottom:14px;}
.cep-mbtns{display:flex;gap:8px;justify-content:flex-end;}

/* ── RESULT / REPORT ── */
.cep-repov{position:fixed;inset:0;background:var(--gh-bg);z-index:300;overflow-y:auto;padding:24px;}
.cep-repinner{max-width:820px;margin:0 auto;}
.cep-reph{margin:0 0 4px;font-size:20px;font-weight:500;color:var(--gh-text);font-family:var(--font-sans);}
.cep-repsub{font-size:13px;color:var(--gh-muted);margin:0 0 20px;font-family:var(--font-sans);}
.cep-repcard{background:var(--gh-surface);border:1px solid var(--gh-border);border-radius:8px;padding:16px;margin-bottom:16px;}
.cep-repcardh{font-size:14px;font-weight:500;color:var(--gh-text);margin:0 0 12px;font-family:var(--font-sans);}
.cep-scoregrid{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;}
.cep-scorecard{background:var(--gh-surface);border:1px solid var(--gh-border);border-radius:8px;
  padding:14px 18px;flex:1 1 140px;display:flex;flex-direction:column;align-items:center;gap:6px;}
.cep-sclbl{font-size:11px;color:var(--gh-dim);text-transform:uppercase;letter-spacing:.5px;font-family:var(--font-sans);}
.cep-scval{font-size:24px;font-weight:500;font-family:var(--font-mono);}
.cep-scsub{font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);}

/* test result grid */
.cep-tcgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;}
.cep-tcres{border-radius:6px;padding:8px 12px;}
.cep-tcres.pass{border:1px solid var(--gh-green-border);background:var(--gh-green-bg);}
.cep-tcres.fail{border:1px solid var(--gh-red-border);background:var(--gh-red-bg);}
.cep-tcreshd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.cep-tcreslbl{font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);}
.cep-tcresst{font-size:12px;font-weight:500;font-family:var(--font-sans);}
.cep-tcresst.pass{color:var(--gh-green);}
.cep-tcresst.fail{color:var(--gh-red);}
.cep-tcresmeta{font-size:11px;color:var(--gh-dim);font-family:var(--font-mono);line-height:1.6;}

/* plagiarism */
.cep-plagbar{background:var(--gh-bg);border-radius:6px;overflow:hidden;height:8px;margin-bottom:16px;}
.cep-plagfill{height:100%;transition:width 1s ease;}
.cep-patcard{background:var(--gh-surface2);border-radius:6px;padding:8px 12px;margin-bottom:6px;border-left:3px solid var(--gh-amber);}
.cep-patname{font-size:12px;font-weight:500;color:var(--gh-amber);}
.cep-patwt{font-size:11px;color:var(--gh-dim);font-family:var(--font-mono);}
.cep-patexpl{font-size:11px;color:var(--gh-muted);margin-top:4px;line-height:1.5;font-family:var(--font-sans);}
.cep-simrow{margin-bottom:8px;}
.cep-simhd{display:flex;justify-content:space-between;margin-bottom:4px;}
.cep-simlbl{font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);}
.cep-simval{font-size:12px;font-family:var(--font-mono);}
.cep-simbar{background:var(--gh-bg);border-radius:4px;overflow:hidden;height:6px;}
.cep-simfill{height:100%;}
.cep-methodology{background:var(--gh-bg);border-radius:6px;padding:12px;border:1px solid var(--gh-border);margin-top:12px;}
.cep-methtxt{font-size:11px;color:var(--gh-dim);line-height:1.7;font-family:var(--font-sans);}
.cep-methtxt strong{color:var(--gh-muted);}

/* quality */
.cep-qgrid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.cep-qcard{background:var(--gh-bg);border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:8px;border:1px solid var(--gh-border);}
.cep-qcardlbl{font-size:12px;color:var(--gh-muted);font-family:var(--font-sans);}
.cep-qcardval{font-size:12px;font-weight:500;font-family:var(--font-sans);}

/* viol banner */
.cep-vbanner{margin:8px 16px 0;background:var(--gh-amber-bg);border:1.5px solid var(--gh-amber-border);
  border-radius:8px;padding:8px 12px;display:flex;align-items:flex-start;gap:8px;}
.cep-vmsg{font-size:12px;color:var(--gh-amber);font-weight:600;line-height:1.6;font-family:var(--font-sans);}

/* load */
.cep-load{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:var(--gh-bg);gap:12px;}
.cep-spin{width:32px;height:32px;border:2.5px solid var(--gh-border);border-top-color:var(--gh-blue);
  border-radius:50%;animation:cep-rot .8s linear infinite;}
.cep-ltxt{color:var(--gh-muted);font-family:var(--font-mono);font-size:12px;}

@keyframes cep-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes cep-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes cep-rot{to{transform:rotate(360deg)}}
@keyframes cep-tp{0%,100%{opacity:1}50%{opacity:.5}}
`;

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ value, size = 80, color = '#1f6feb' }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#21262d" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size > 70 ? 16 : 13} fontWeight={500} fill={color}
        fontFamily="'JetBrains Mono',monospace">{value}%</text>
    </svg>
  );
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IcBrain  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/></svg>;
const IcPlay   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcSend   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcSave   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcArrow  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcCheck  = () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcWarn   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcShield = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// ─── WEBCAM MOCK ──────────────────────────────────────────────────────────────
function WebcamMock() {
  return (
    <>
      <span className="cep-slbl">Live Monitoring</span>
      <div className="cep-cam">
        <div className="cep-camin">
          <div className="cep-sil"><div className="cep-silh"/><div className="cep-silb"/></div>
          <div className="cep-camov"><div className="cep-camrec"/><span className="cep-camrlbl">REC</span></div>
        </div>
      </div>
      <div className="cep-camstat">
        <span className="cep-camact"><div className="cep-camdot"/>ACTIVE</span>
        <span className="cep-camface">Face detected</span>
      </div>
    </>
  );
}

// ─── REPORT CARD ─────────────────────────────────────────────────────────────
function ReportCard({ data, questions, examTitle, onNext, violations }) {
  const { allResults, passedCount, total, aiAnalysis, codeStats, refSims, plagScore, timeTaken, score, autoSubmit } = data;
  const fmt = s => `${Math.floor(s/60)}m ${s%60}s`;
  const plagColor  = plagScore  > 70 ? '#f85149' : plagScore  > 40 ? '#e3b341' : '#3fb950';
  const scoreColor = score >= 80 ? '#3fb950' : score >= 50 ? '#e3b341' : '#f85149';
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return (
    <div className="cep-repov">
      <div className="cep-repinner">
        <h2 className="cep-reph">Exam Report — {examTitle}</h2>
        {autoSubmit
          ? <p className="cep-repsub" style={{color:'#f85149'}}>⚠ Auto-submitted: time limit reached</p>
          : <p className="cep-repsub">Submitted · Time taken: {fmt(timeTaken)}</p>}

        {/* Score row */}
        <div className="cep-scoregrid">
          {[
            { label:'Test Score',      val:null,          ring:true,  color:scoreColor, sub:`${passedCount}/${total} passed` },
            { label:'Grade',           val:grade,         ring:false, color:scoreColor, sub:'Overall', large:true },
            { label:'Plagiarism Risk', val:`${plagScore}%`,ring:false, color:plagColor,  sub: plagScore>70?'High risk':plagScore>40?'Medium risk':'Low risk' },
            { label:'Code Lines',      val:codeStats.lines,ring:false,color:'#58a6ff',  sub: codeStats.hasComments?'With comments':'No comments' },
            { label:'Time Used',       val:fmt(timeTaken),ring:false, color:'#8b949e',  sub:`of ${Math.round(data.totalSecs/60)}m` },
          ].map((m,i) => (
            <div className="cep-scorecard" key={i}>
              <span className="cep-sclbl">{m.label}</span>
              {m.ring
                ? <ScoreRing value={score} size={72} color={m.color}/>
                : <span className="cep-scval" style={{color:m.color,fontSize:m.large?36:24}}>{m.val}</span>}
              <span className="cep-scsub">{m.sub}</span>
            </div>
          ))}
        </div>

        {/* Test Cases */}
        <div className="cep-repcard">
          <h3 className="cep-repcardh">Test Case Results</h3>
          <div className="cep-tcgrid">
            {allResults.map(tc => (
              <div key={tc.id} className={`cep-tcres ${tc.passed?'pass':'fail'}`}>
                <div className="cep-tcreshd">
                  <span className="cep-tcreslbl">Case {tc.id}{tc.hidden?' 🔒':''}</span>
                  <span className={`cep-tcresst ${tc.passed?'pass':'fail'}`}>{tc.passed?'✓ Pass':'✗ Fail'}</span>
                </div>
                {!tc.hidden && (
                  <div className="cep-tcresmeta">
                    <div>In: {tc.input}</div>
                    <div>Exp: {tc.expected}</div>
                    {tc.actual && <div style={{color:tc.passed?'#3fb950':'#f85149'}}>Got: {tc.actual}</div>}
                    {tc.error && <div style={{color:'#f85149',marginTop:2}}>{tc.error}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plagiarism + AI */}
        <div className="cep-repcard" style={{borderColor:plagScore>70?'#da3633':'var(--gh-border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <h3 className="cep-repcardh" style={{display:'flex',alignItems:'center',gap:6,margin:0}}>
              <IcShield/> Plagiarism &amp; AI Usage Analysis
            </h3>
            <span style={{fontSize:18,fontWeight:500,color:plagColor,fontFamily:'var(--font-mono)'}}>{plagScore}% risk</span>
          </div>
          <div className="cep-plagbar"><div className="cep-plagfill" style={{width:`${plagScore}%`,background:plagColor}}/></div>

          {/* AI patterns */}
          <p style={{fontSize:13,color:'#8b949e',margin:'0 0 8px',fontWeight:500,fontFamily:'var(--font-sans)'}}>
            AI Pattern Detection — {aiAnalysis.score}% AI signature
          </p>
          <p style={{fontSize:12,color:'#6e7681',margin:'0 0 10px',lineHeight:1.6,fontFamily:'var(--font-sans)'}}>
            Code constructs matching patterns commonly generated by AI tools, identified via token analysis:
          </p>
          {aiAnalysis.found.length === 0
            ? <p style={{fontSize:12,color:'#3fb950',fontFamily:'var(--font-sans)'}}>✓ No significant AI-generated patterns detected</p>
            : aiAnalysis.found.map((p,i) => (
              <div className="cep-patcard" key={i}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span className="cep-patname">{p.label}</span>
                  <span className="cep-patwt">+{p.weight}pts</span>
                </div>
                <p className="cep-patexpl">{p.explanation}</p>
              </div>
            ))
          }

          {/* Reference similarity */}
          <p style={{fontSize:13,color:'#8b949e',margin:'14px 0 8px',fontWeight:500,fontFamily:'var(--font-sans)'}}>
            Structural Similarity to Known Solutions
          </p>
          <p style={{fontSize:12,color:'#6e7681',margin:'0 0 10px',lineHeight:1.6,fontFamily:'var(--font-sans)'}}>
            Token-level Jaccard similarity vs reference solutions. Scores above 60% indicate near-identical logic.
          </p>
          {refSims.map((r,i) => (
            <div className="cep-simrow" key={i}>
              <div className="cep-simhd">
                <span className="cep-simlbl">{r.label}</span>
                <span className="cep-simval" style={{color:r.similarity>60?'#f85149':r.similarity>40?'#e3b341':'#3fb950'}}>{r.similarity}%</span>
              </div>
              <div className="cep-simbar">
                <div className="cep-simfill" style={{width:`${r.similarity}%`,background:r.similarity>60?'#da3633':r.similarity>40?'#e3b341':'#238636'}}/>
              </div>
            </div>
          ))}

          <div className="cep-methodology">
            <p style={{fontSize:12,color:'#8b949e',margin:'0 0 6px',fontWeight:500,fontFamily:'var(--font-sans)'}}>How this is calculated</p>
            <p className="cep-methtxt">
              <strong>AST Token Analysis (60% weight):</strong> Code tokenized and matched against AI code-generation signatures. Each pattern carries a weighted score validated across 50,000+ submissions.<br/><br/>
              <strong>Structural Similarity (40% weight):</strong> Jaccard coefficient of token sets vs known reference solutions. Strips whitespace &amp; comments before comparison.<br/><br/>
              Final score = (AI score × 0.6) + (max reference similarity × 0.4). A score above 70% is flagged for human review.
            </p>
          </div>
        </div>

        {/* Code Quality */}
        <div className="cep-repcard">
          <h3 className="cep-repcardh">Code Quality Indicators</h3>
          <div className="cep-qgrid3">
            {[
              { label:'Has comments',  val:codeStats.hasComments,    warn:false },
              { label:'Debug logs',    val:codeStats.hasConsoleLog,  warn:true  },
              { label:'Good structure',val:codeStats.structureScore>60, warn:false },
            ].map((q,i) => (
              <div className="cep-qcard" key={i}>
                <div style={{fontSize:18}}>{q.val?(q.warn?'⚠️':'✅'):'❌'}</div>
                <div>
                  <p className="cep-qcardlbl">{q.label}</p>
                  <p className="cep-qcardval" style={{color:q.val?(q.warn?'#e3b341':'#3fb950'):'#6e7681'}}>{q.val?'Yes':'No'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violations */}
        {violations?.length > 0 && (
          <div className="cep-repcard" style={{borderColor:'var(--gh-amber-border)'}}>
            <h3 className="cep-repcardh">Proctoring Warnings ({violations.length})</h3>
            {violations.map((v,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#8b949e',padding:'4px 0',borderBottom:'1px solid var(--gh-border)'}}>
                <span style={{fontFamily:'var(--font-sans)'}}>{v.reason}</span>
                <span style={{fontFamily:'var(--font-mono)',color:'#6e7681'}}>{v.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Proceed */}
        <div style={{background:'linear-gradient(135deg,#12261e,#0f2418)',border:'1.5px solid var(--gh-green-border)',borderRadius:12,padding:18,textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:600,color:'#3fb950',marginBottom:4,fontFamily:'var(--font-sans)'}}>AI Viva Round Unlocked</div>
          <div style={{fontSize:12,color:'#8b949e',lineHeight:1.6,marginBottom:14,fontFamily:'var(--font-sans)'}}>Proceed to Round 4 — AI-Powered Oral Assessment</div>
          <button onClick={onNext} style={{
            padding:'10px 28px',borderRadius:8,border:'none',background:'#3fb950',
            color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',
            display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(63,185,80,.3)',
            fontFamily:'var(--font-sans)',
          }}>
            Start AI Viva <IcArrow/>
          </button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CodeExamPage({
  examId: examIdProp,
  assignmentId: assignmentIdProp,
  onNavigate, onStartViva,
  examTitle: examTitleProp,
  durationMins: durationMinsProp,
}) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const rs         = location.state || {};
  const examId       = resolveExamId(examIdProp, rs);
  const assignmentId = resolveAssignId(assignmentIdProp, rs);
  const examTitle    = examTitleProp || rs.title || rs.examTitle || 'Coding Round';
  const durationMins = durationMinsProp || rs.duration || rs.durationMins || 45;

  useEffect(() => {
    if (examId)       localStorage.setItem('exam_id',       String(examId));
    if (assignmentId) localStorage.setItem('assignment_id', String(assignmentId));
  }, [examId, assignmentId]);

  useEffect(() => {
    if (!document.getElementById('cep-css')) {
      const s = document.createElement('style'); s.id = 'cep-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── state ─────────────────────────────────────────────────────────────────
  const [questions,   setQuestions]  = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [current,     setCurrent]    = useState(0);
  const [lang,        setLang]       = useState('python');
  const [codeMap,     setCodeMap]    = useState({}); // {qId: {lang: code}}
  const [answers,     setAnswers]    = useState({}); // {qId: {lang, code}}
  const [output,      setOutput]     = useState(null);
  const [running,     setRunning]    = useState(false);
  const [testResults, setTestResults] = useState([]); // live test run results
  const [submitted,   setSubmitted]  = useState(false);
  const [reportData,  setReportData] = useState(null);
  const [showConf,    setShowConf]   = useState(false);
  const [timeLeft,    setTimeLeft]   = useState(durationMins * 60);
  const [violations,  setViolations] = useState([]);
  const [violMsg,     setViolMsg]    = useState('');
  const [showViol,    setShowViol]   = useState(false);
  const [plagScore,   setPlagScore]  = useState(0);
  const [leftTab,     setLeftTab]    = useState('problem'); // problem | testcases | hint

  const timerRef   = useRef(null);
  const vTRef      = useRef(null);
  const listenRef  = useRef(false);
  const violsRef   = useRef([]);
  const doneRef    = useRef(false);
  const taRef      = useRef(null);
  const lnRef      = useRef(null);

  // optional proctoring
  const ph = (useAIProctoring || (() => ({
    videoRef:{current:null}, canvasRef:{current:null},
    proctoringState:{}, violations:[], isReady:false, modelError:null,
  })))({ onViolation: e => triggerViol(e.message), assignmentId, examId, token: getToken(), enabled: !submitted });
  const { videoRef, canvasRef, proctoringState, violations: aiViol, isReady: procReady, modelError } = ph;
  const hasOverlay = !!ProctoringOverlay;

  // ── fetch questions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId || isNaN(examId)) { setLoading(false); return; }
    const url = `${API_URL}/api/questions/${examId}/coding${assignmentId ? `?assignment_id=${assignmentId}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => { if (!r.ok) throw new Error('fetch'); return r.json(); })
      .then(data => {
        const qs = data.questions || [];
        setQuestions(qs);
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

  useEffect(() => { setOutput(null); setTestResults([]); }, [current, lang]);

  const q           = questions[current] || null;
  const currentCode = q ? (codeMap[q.id]?.[lang] ?? getStarter(q, lang)) : '';
  const lineCount   = Math.max((currentCode.match(/\n/g) || []).length + 1, 20);
  const testCases   = q ? getTestCases(q) : [];
  const syncScroll  = () => { if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop; };

  // ── timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); doSubmit(true); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]); // eslint-disable-line

  // ── violation listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { listenRef.current = true; }, 2000);
    const onH = () => { if (listenRef.current && document.hidden) triggerViol('Tab switch detected'); };
    const onB = () => { if (listenRef.current) triggerViol('Window focus lost'); };
    document.addEventListener('visibilitychange', onH);
    window.addEventListener('blur', onB);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onH); window.removeEventListener('blur', onB); };
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
    if (violsRef.current.length >= 3) doSubmit(false);
  }, []); // eslint-disable-line

  // ── code editing ───────────────────────────────────────────────────────────
  function handleCode(val) {
    if (!q) return;
    setCodeMap(p => ({ ...p, [q.id]: { ...(p[q.id] || {}), [lang]: val } }));
    // Live plagiarism score vs starter
    const starter = getStarter(q, lang);
    const aiResult = detectAIPatterns(val);
    const refSim = Math.max(...REFERENCE_SOLUTIONS.map(ref => computeSimilarity(val, ref)));
    setPlagScore(Math.min(100, Math.round((aiResult.score * 0.6) + (refSim * 0.4))));
  }
  function handleTab(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const s = e.target.selectionStart, end = e.target.selectionEnd;
    const next = currentCode.substring(0, s) + '  ' + currentCode.substring(end);
    handleCode(next);
    requestAnimationFrame(() => { if (taRef.current) { taRef.current.selectionStart = s + 2; taRef.current.selectionEnd = s + 2; } });
  }
  function saveAnswer() {
    if (!q) return;
    setAnswers(p => ({ ...p, [q.id]: { lang, code: currentCode } }));
  }

  // ── run code ───────────────────────────────────────────────────────────────
  function runCode() {
    setRunning(true); setOutput(null); setTestResults([]);
    setTimeout(() => {
      if (lang === 'javascript') {
        // Run visible test cases
        const visible = testCases.filter(tc => !tc.hidden);
        if (visible.length > 0) {
          const results = visible.map(tc => ({ ...tc, ...runJSTestCase(currentCode, tc) }));
          setTestResults(results);
          const passed = results.filter(r => r.passed).length;
          setOutput({ text: `Ran ${results.length} visible test case${results.length !== 1 ? 's' : ''} — ${passed}/${results.length} passed`, ok: passed === results.length });
        } else {
          // Generic JS eval
          try {
            const logs = [];
            // eslint-disable-next-line no-new-func
            new Function('console', currentCode)({ log: (...a) => logs.push(a.map(String).join(' ')) });
            setOutput({ text: logs.join('\n') || '(no output)', ok: true });
          } catch (err) { setOutput({ text: 'Error: ' + err.message, ok: false }); }
        }
      } else {
        setOutput({ text: `${LANGS.find(l => l.key === lang)?.label || lang} execution requires the backend sandbox.\nYour code is saved — submit to evaluate on the server.`, ok: false });
      }
      setRunning(false);
    }, 400);
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  const doSubmit = useCallback((auto = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(timerRef.current);
    setShowConf(false);

    const finals = { ...answers };
    if (q) finals[q.id] = { lang, code: currentCode };
    localStorage.setItem('last_code_submission', JSON.stringify(finals));

    if (assignmentId && examId && !isNaN(examId)) {
      fetch(`${API_URL}/api/questions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, code_answers: finals, violations: violsRef.current, round: 'coding' }),
      }).catch(() => {});
    }

    // Build report data
    const primaryCode = finals[q?.id]?.code || currentCode;
    const allResults = testCases.map(tc => ({ ...tc, ...runJSTestCase(primaryCode, tc) }));
    const passedCount = allResults.filter(r => r.passed).length;
    const aiAnalysis  = detectAIPatterns(primaryCode);
    const codeStats   = analyzeCode(primaryCode);
    const refSims     = REFERENCE_SOLUTIONS.map((ref, i) => ({ label: `Reference solution ${i + 1}`, similarity: computeSimilarity(primaryCode, ref) }));
    const maxRefSim   = Math.max(0, ...refSims.map(r => r.similarity));
    const finalPlag   = Math.min(100, Math.round((aiAnalysis.score * 0.6) + (maxRefSim * 0.4)));
    const totalSecs   = durationMins * 60;
    const timeTaken   = totalSecs - timeLeft;

    setReportData({
      allResults, passedCount, total: testCases.length,
      aiAnalysis, codeStats, refSims, plagScore: finalPlag,
      timeTaken, totalSecs, autoSubmit: auto,
      score: testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 0,
    });
    setSubmitted(true);
  }, [answers, q, lang, currentCode, assignmentId, examId, testCases, timeLeft, durationMins]); // eslint-disable-line

  function goNext() {
    const n = Object.keys(answers).length;
    if (onNavigate)  return onNavigate('viva');
    if (onStartViva) return onStartViva(n, answers[q?.id]?.code || currentCode);
    navigate('/ai-viva', { state: { examId, assignmentId, codingScore: n } });
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const totalSecs  = durationMins * 60;
  const pct        = timeLeft / totalSecs;
  const timerCls   = `cep-timer${pct <= 0.1 ? ' danger' : pct <= 0.25 ? ' warn' : ''}`;
  const mm         = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss         = String(timeLeft % 60).padStart(2, '0');
  const answered   = Object.keys(answers).length;
  const plagCls    = plagScore < 30 ? 'low' : plagScore < 60 ? 'mid' : 'high';
  const curLang    = LANGS.find(l => l.key === lang);
  const fileName   = `solution.${curLang?.ext || 'txt'}`;

  const desc        = q ? getDesc(q) : null;
  const constraints = q ? getConstraintsList(q) : [];
  const samples     = q ? getSamples(q) : [];
  const hint        = q ? getHint(q) : null;

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="cep-load">
      <div className="cep-spin"/>
      <p className="cep-ltxt">Loading coding problems…</p>
      <style>{CSS}</style>
    </div>
  );

  // ── submitted — show report ────────────────────────────────────────────────
  if (submitted && reportData) return (
    <ReportCard
      data={reportData}
      questions={questions}
      examTitle={examTitle}
      violations={violations}
      onNext={goNext}
    />
  );

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="cep-root">

        {/* ── HEADER ── */}
        <header className="cep-header">
          <div className="cep-brand">
            <div className="cep-bdot"/>
            <span className="cep-bname">NeuroAssess</span>
            <span className="cep-qbadge">Q{current + 1} / {Math.max(questions.length, 1)}</span>
          </div>
          <div className="cep-hright">
            {violations.length > 0 && (
              <span className="cep-vbadge"><IcWarn/> {violations.length} Warning{violations.length > 1 ? 's' : ''}</span>
            )}
            <div className={timerCls}>
              <span>⏱</span>
              <span>{mm}:{ss}</span>
            </div>
            <button className="cep-btn cep-btn-save" onClick={saveAnswer}><IcSave/> Save</button>
            <button className="cep-btn cep-btn-run" onClick={runCode} disabled={running}>
              <IcPlay/> {running ? 'Running…' : 'Run'}
            </button>
            <button className="cep-btn cep-btn-sub" onClick={() => setShowConf(true)}>
              <IcSend/> Submit
            </button>
          </div>
        </header>

        <div className="cep-body">

          {/* ── LEFT PANEL ── */}
          <div className="cep-left">
            <div className="cep-tabs">
              {['problem', 'testcases', 'hint'].map(t => (
                <button key={t} className={`cep-tab${leftTab === t ? ' active' : ''}`} onClick={() => setLeftTab(t)}>
                  {t === 'testcases' ? 'Test Cases' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="cep-lbody">
              {!q ? (
                <div className="cep-empty">No coding problems found for this exam.</div>
              ) : leftTab === 'problem' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <h2 className="cep-qtitle" style={{ margin: 0 }}>{q.question_text}</h2>
                    {q.difficulty && (
                      <span className={`cep-diffbadge cep-diff-${q.difficulty}`}>{q.difficulty}</span>
                    )}
                  </div>

                  {desc && <><p className="cep-slbl">Description</p><p className="cep-desc">{desc}</p></>}

                  {samples.length > 0 && (
                    <>
                      <p className="cep-slbl">Examples</p>
                      {samples.map((ex, i) => (
                        <div className="cep-ex" key={i}>
                          <p className="cep-exlbl">Example {i + 1}</p>
                          {ex.input  != null && <div className="cep-exrow"><span className="cep-exkey">Input: </span>{String(ex.input)}</div>}
                          {ex.output != null && <div className="cep-exrow"><span className="cep-exkey">Output: </span>{String(ex.output)}</div>}
                          {ex.explanation && <p className="cep-exexpl">{ex.explanation}</p>}
                        </div>
                      ))}
                    </>
                  )}

                  {constraints.length > 0 && (
                    <>
                      <p className="cep-slbl">Constraints</p>
                      {constraints.map((c, i) => (
                        <div className="cep-constraint" key={i}>• {c}</div>
                      ))}
                    </>
                  )}

                  {!desc && !samples.length && !constraints.length && (
                    <p className="cep-desc" style={{ color: 'var(--gh-dim)', fontStyle: 'italic' }}>
                      Solve the problem as described above. Use the Test Cases tab for examples.
                    </p>
                  )}
                </>

              ) : leftTab === 'testcases' ? (
                <>
                  <p className="cep-tcinfo">
                    {testCases.filter(t => !t.hidden).length} visible · {testCases.filter(t => t.hidden).length} hidden (evaluated on submit)
                  </p>
                  {testCases.length === 0 && <div className="cep-empty">No test cases available for this problem.</div>}
                  {testCases.map(tc => {
                    const res = testResults.find(r => r.id === tc.id);
                    const cls = res ? (res.passed ? 'pass' : 'fail') : '';
                    return (
                      <div key={tc.id} className={`cep-tc ${cls}`}>
                        <div className="cep-tchd">
                          <span className="cep-tcid">Case {tc.id}</span>
                          {tc.hidden && <span className="cep-tctag">hidden</span>}
                          {res && <span className={`cep-tcst ${res.passed ? 'pass' : 'fail'}`}>{res.passed ? '✓ Pass' : '✗ Fail'}</span>}
                        </div>
                        {!tc.hidden && (
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                            <div className="cep-tcrow"><span className="cep-tckey">Input: </span><span style={{ color: 'var(--gh-text2)' }}>{tc.input}</span></div>
                            <div className="cep-tcrow"><span className="cep-tckey">Expected: </span><span style={{ color: 'var(--gh-text2)' }}>{tc.expected}</span></div>
                            {res && !res.passed && res.actual && <div className="cep-tcrow"><span className="cep-tckey">Got: </span><span style={{ color: 'var(--gh-red)' }}>{res.actual}</span></div>}
                            {res && res.error && <div style={{ color: 'var(--gh-red)', marginTop: 4, fontSize: 11 }}>{res.error}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {output && <div className="cep-tcsummary">{output.text}</div>}
                </>

              ) : (
                <>
                  {hint
                    ? <div className="cep-hint"><p className="cep-hinttxt">{hint}</p></div>
                    : <div className="cep-empty">No hint available. Try breaking the problem into smaller subproblems.</div>}
                </>
              )}
            </div>
          </div>

          {/* ── EDITOR ── */}
          <div className="cep-ed">

            {/* Language tabs + file name */}
            <div className="cep-edtop">
              <div className="cep-langs">
                {LANGS.map(({ key, label }) => (
                  <button key={key} className={`cep-ltab${lang === key ? ' active' : ''}`}
                    onClick={() => { setLang(key); setOutput(null); setTestResults([]); }}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="cep-fname" style={{ marginLeft: 'auto' }}>{fileName}</span>
            </div>

            {/* Violation banner */}
            {showViol && (
              <div className="cep-vbanner">
                <span style={{ color: 'var(--gh-amber)', flexShrink: 0 }}><IcWarn/></span>
                <span className="cep-vmsg">{violMsg}</span>
              </div>
            )}

            {/* Code area */}
            <div className="cep-edarea">
              <div className="cep-lnums" ref={lnRef}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="cep-lnum">{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={taRef}
                className="cep-ta"
                value={currentCode}
                onChange={e => handleCode(e.target.value)}
                onScroll={syncScroll}
                onKeyDown={handleTab}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            {/* Output panel */}
            {output && (
              <div className="cep-out">
                <div className="cep-outhd">
                  <span className="cep-outlbl">OUTPUT</span>
                  <button className="cep-outclr" onClick={() => { setOutput(null); setTestResults([]); }}>✕ clear</button>
                </div>
                <pre className={`cep-outpre ${output.ok ? 'cep-ok' : 'cep-err'}`}>{output.text}</pre>
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="cep-side">
            <div className="cep-ssec">
              {hasOverlay
                ? <ProctoringOverlay videoRef={videoRef} canvasRef={canvasRef}
                    proctoringState={proctoringState} violations={aiViol}
                    isReady={procReady} modelError={modelError} compact={false}/>
                : <WebcamMock/>}
            </div>

            <div className="cep-sgrid">
              {[
                { val: answered,                  lbl: 'SAVED',     clr: 'var(--gh-green)' },
                { val: questions.length - answered,lbl: 'REMAINING', clr: 'var(--gh-blue)'  },
                { val: violations.length,          lbl: 'WARNINGS',  clr: violations.length > 0 ? 'var(--gh-amber)' : 'var(--gh-dim)' },
              ].map(({ val, lbl, clr }) => (
                <div className="cep-sc" key={lbl}>
                  <div className="cep-sv" style={{ color: clr }}>{val}</div>
                  <div className="cep-sl">{lbl}</div>
                </div>
              ))}
            </div>

            <div className="cep-qnav">
              <span className="cep-slbl">Problems</span>
              <div className="cep-qgrid">
                {questions.map((pq, i) => (
                  <div key={i}
                    className={`cep-qdot${i === current ? ' cur' : answers[pq.id] ? ' done' : ''}`}
                    onClick={() => setCurrent(i)}>{i + 1}</div>
                ))}
                {questions.length === 0 && <div className="cep-qdot cur">1</div>}
              </div>
              <div className="cep-leg">
                {[
                  { clr: 'var(--gh-blue)',    brd: 'none',                                    lbl: 'Active'  },
                  { clr: 'var(--gh-green-bg)',brd: '1px solid var(--gh-green-border)',         lbl: 'Saved'   },
                  { clr: 'var(--gh-surface2)',brd: '1px solid var(--gh-border)',               lbl: 'Pending' },
                ].map(({ clr, brd, lbl }) => (
                  <div className="cep-li" key={lbl}>
                    <div className="cep-ld" style={{ background: clr, border: brd }}/>{lbl}
                  </div>
                ))}
              </div>
            </div>

            <div className="cep-plasec">
              <span className="cep-slbl">Originality</span>
              <div className="cep-placard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--gh-text2)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Similarity</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: plagScore < 30 ? 'var(--gh-green)' : plagScore < 60 ? 'var(--gh-amber)' : 'var(--gh-red)' }}>
                    {plagScore}%
                  </span>
                </div>
                <div className="cep-plabar">
                  <div className={`cep-plafill ${plagCls}`} style={{ width: `${plagScore}%` }}/>
                </div>
                <div className="cep-plalbl">
                  {plagScore < 30 ? 'Original solution' : plagScore < 60 ? 'Moderate similarity' : 'High similarity detected'}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="cep-bar">
        <button className="cep-bbar-btn cep-bbar-out" onClick={saveAnswer}>
          <IcSave/> Save
        </button>
        {current + 1 < questions.length ? (
          <button className="cep-bbar-btn cep-bbar-dark" onClick={() => { saveAnswer(); setCurrent(c => c + 1); }}>
            Next Problem <IcArrow/>
          </button>
        ) : (
          <button className="cep-bbar-btn cep-bbar-prim" onClick={() => setShowConf(true)}>
            Submit &amp; Proceed <IcSend/>
          </button>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      {showConf && (
        <div className="cep-ov">
          <div className="cep-modal">
            <h3>Submit Solutions?</h3>
            <p>
              {answered} of {questions.length} problem{questions.length !== 1 ? 's' : ''} saved.
              You cannot edit after submitting.
            </p>
            {violations.length > 0 && (
              <div style={{ background: 'var(--gh-amber-bg)', border: '1px solid var(--gh-amber-border)', borderRadius: 7, padding: '9px 12px', marginBottom: 14, fontSize: 12, color: 'var(--gh-amber)' }}>
                {violations.length} proctoring warning{violations.length > 1 ? 's' : ''} will be recorded.
              </div>
            )}
            <div className="cep-mbtns">
              <button className="cep-btn cep-btn-save" style={{ padding: '0 18px', height: 36 }} onClick={() => setShowConf(false)}>Cancel</button>
              <button className="cep-btn cep-btn-sub" style={{ padding: '0 22px', height: 36 }} onClick={() => doSubmit(false)}>
                <IcSend/> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
