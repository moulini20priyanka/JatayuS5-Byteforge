import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildDetectionRecord, persistDetectionRecord } from '../utils/detectionEngine';

const API_URL = (() => {
  try { return import.meta.env?.VITE_API_URL || 'http://localhost:5000'; }
  catch { return 'http://localhost:5000'; }
})();

let useAIProctoring = null;
let ProctoringOverlay = null;
try {
  useAIProctoring   = require('../hooks/useAIProctoring').useAIProctoring;
  ProctoringOverlay = require('./ProctoringOverlay').default;
} catch {}

const MAX_WARNINGS = 15;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f0f7ff;--surface:#fff;--surface2:#f8faff;
  --border:#dbeafe;--border2:#bfdbfe;
  --accent:#2563eb;--accent-h:#1d4ed8;--accent-s:#eff6ff;
  --green:#16a34a;--green-s:#f0fdf4;--green-b:#bbf7d0;
  --red:#dc2626;--red-s:#fef2f2;--red-b:#fca5a5;
  --amber:#d97706;--amber-s:#fffbeb;--amber-b:#fcd34d;
  --text:#0f172a;--text2:#1e3a8a;--muted:#64748b;--dim:#94a3b8;
  --ebg:#fafbff;--efg:#1e293b;--eline:#f1f5f9;--enum:#94a3b8;--ecur:#2563eb;
}
html,body{height:100%;font-family:'IBM Plex Sans',sans-serif;background:var(--bg);color:var(--text);}
.ce-root{display:grid;grid-template-rows:52px 1fr;height:100vh;overflow:hidden;}
.ce-hdr{display:flex;align-items:center;justify-content:space-between;padding:0 20px;
  border-bottom:1.5px solid var(--border);background:var(--surface);z-index:50;
  box-shadow:0 1px 8px rgba(37,99,235,.07);}
.ce-body{display:flex;overflow:hidden;}
.ce-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#4f46e5);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,.28);}
.ce-bname{font-size:15px;font-weight:700;color:#1e3a8a;letter-spacing:-.3px;}
.ce-qbadge{font-size:11px;color:var(--accent);background:var(--accent-s);padding:2px 10px;
  border-radius:20px;border:1px solid var(--border2);font-weight:600;font-family:'JetBrains Mono',monospace;}
.ce-langpill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;
  background:var(--accent-s);border:1.5px solid var(--border2);font-size:12px;font-weight:700;
  color:var(--accent);font-family:'JetBrains Mono',monospace;}
.ce-langdot{width:7px;height:7px;border-radius:50%;background:var(--accent);}
.ce-timer{display:flex;align-items:center;gap:7px;background:var(--surface2);border:1.5px solid var(--border);
  border-radius:100px;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:14px;
  font-weight:700;color:#1e3a8a;letter-spacing:1.5px;}
.ce-timer.warn{background:var(--amber-s);border-color:var(--amber-b);color:var(--amber);}
.ce-timer.danger{background:var(--red-s);border-color:var(--red-b);color:var(--red);animation:ce-tp 1s ease infinite;}
.ce-tdot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ce-ping 2s ease infinite;flex-shrink:0;}
.ce-timer.warn .ce-tdot{background:var(--amber);}
.ce-timer.danger .ce-tdot{background:var(--red);}
.ce-wbadge{display:flex;align-items:center;gap:5px;font-size:11px;background:var(--amber-s);
  border:1px solid var(--amber-b);color:var(--amber);padding:4px 11px;border-radius:20px;
  font-family:'JetBrains Mono',monospace;font-weight:700;}
.ce-btn{border:none;border-radius:8px;padding:0 16px;height:34px;font-size:13px;font-weight:600;
  font-family:'IBM Plex Sans',sans-serif;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.ce-btn:hover:not(:disabled){transform:translateY(-1px);}
.ce-btn:disabled{opacity:.45;cursor:not-allowed;}
.ce-btn-save{background:var(--surface);color:var(--accent);border:1.5px solid var(--border2);}
.ce-btn-save:hover:not(:disabled){background:var(--accent-s);}
.ce-btn-run{background:linear-gradient(135deg,#059669,#047857);color:#fff;box-shadow:0 2px 8px rgba(5,150,105,.25);}
.ce-btn-sub{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.28);}
.ce-left{width:420px;min-width:320px;border-right:1.5px solid var(--border);display:flex;
  flex-direction:column;overflow:hidden;background:var(--surface);}
.ce-tabs{display:flex;border-bottom:1.5px solid var(--border);flex-shrink:0;background:var(--surface2);}
.ce-tab{flex:1;padding:11px 4px;background:none;border:none;border-bottom:2.5px solid transparent;
  color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
  transition:all .15s;text-transform:uppercase;letter-spacing:.6px;}
.ce-tab.active{color:var(--accent);border-bottom-color:var(--accent);background:var(--surface);}
.ce-lbody{flex:1;overflow-y:auto;padding:16px;}
.ce-qtitle{font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;line-height:1.45;}
.ce-diffbadge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;}
.ce-diff-easy{background:#dcfce7;color:#15803d;border:1px solid #86efac;}
.ce-diff-medium{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;}
.ce-diff-hard{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.ce-slbl{font-size:10px;font-weight:700;color:var(--accent);margin:14px 0 6px;text-transform:uppercase;
  letter-spacing:.8px;font-family:'JetBrains Mono',monospace;}
.ce-desc{font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;}
.ce-ex{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;
  margin-bottom:8px;border-left:3px solid var(--accent);}
.ce-exlbl{font-size:11px;color:var(--accent);margin-bottom:5px;font-weight:700;}
.ce-exrow{font-size:12px;font-family:'JetBrains Mono',monospace;color:#334155;margin-bottom:2px;}
.ce-exkey{color:var(--dim);margin-right:4px;}
.ce-constraint{font-size:12px;color:#334155;padding:3px 0;font-family:'JetBrains Mono',monospace;border-bottom:1px dashed var(--border);}
.ce-constraint:last-child{border-bottom:none;}
.ce-hint{background:#fffbeb;border:1px solid var(--amber-b);border-radius:8px;padding:14px;border-left:3px solid var(--amber);}
.ce-hinttxt{font-size:13px;color:#78350f;line-height:1.7;}
.ce-empty{text-align:center;color:var(--dim);font-size:12px;padding:32px 0;font-family:'JetBrains Mono',monospace;}
/* JUDGE PANEL */
.jp-wrap{display:flex;flex-direction:column;height:100%;}
.jp-banner{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:10px;
  margin-bottom:12px;border:1.5px solid;flex-shrink:0;}
.jp-banner.idle{background:var(--surface2);border-color:var(--border);color:var(--muted);}
.jp-banner.running{background:var(--accent-s);border-color:var(--border2);color:var(--accent);}
.jp-banner.accepted{background:var(--green-s);border-color:var(--green-b);color:var(--green);}
.jp-banner.wrong{background:var(--red-s);border-color:var(--red-b);color:var(--red);}
.jp-banner.error{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.jp-btitle{font-size:13px;font-weight:700;line-height:1.3;}
.jp-bsub{font-size:11px;opacity:.8;margin-top:2px;}
.jp-casetabs{display:flex;gap:5px;margin-bottom:10px;flex-shrink:0;flex-wrap:wrap;}
.jp-ctab{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;
  border:1.5px solid var(--border);background:var(--surface2);color:var(--muted);
  font-size:11px;font-weight:600;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all .12s;}
.jp-ctab.sel{background:var(--accent-s);color:var(--accent);border-color:var(--border2);}
.jp-ctab.pass{border-color:var(--green-b);}
.jp-ctab.pass.sel{background:var(--green-s);color:var(--green);border-color:var(--green-b);}
.jp-ctab.fail{border-color:var(--red-b);}
.jp-ctab.fail.sel{background:var(--red-s);color:var(--red);border-color:var(--red-b);}
.jp-cdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--dim);}
.jp-ctab.sel:not(.pass):not(.fail) .jp-cdot{background:var(--accent);}
.jp-ctab.pass .jp-cdot{background:var(--green);}
.jp-ctab.fail .jp-cdot{background:var(--red);}
.jp-body{flex:1;overflow-y:auto;}
.jp-row{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;}
.jp-lbl{font-size:10px;font-weight:700;color:var(--dim);font-family:'JetBrains Mono',monospace;
  min-width:72px;padding-top:6px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;}
.jp-val{font-size:12px;font-family:'JetBrains Mono',monospace;color:#334155;
  background:var(--surface2);border:1px solid var(--border);border-radius:6px;
  padding:6px 10px;flex:1;word-break:break-all;line-height:1.6;}
.jp-val.pass{background:var(--green-s);border-color:var(--green-b);color:var(--green);}
.jp-val.fail{background:var(--red-s);border-color:var(--red-b);color:var(--red);}
.jp-err{font-size:11px;color:var(--red);background:var(--red-s);border:1px solid var(--red-b);
  border-radius:6px;padding:7px 10px;margin-top:4px;font-family:'JetBrains Mono',monospace;
  line-height:1.6;white-space:pre-wrap;}
.jp-pending{text-align:center;color:var(--dim);font-size:12px;padding:24px 0;font-family:'JetBrains Mono',monospace;}
.jp-summary{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;
  border-radius:8px;border:1.5px solid;margin-top:10px;flex-shrink:0;}
.jp-summary.all{background:var(--green-s);border-color:var(--green-b);}
.jp-summary.some{background:var(--red-s);border-color:var(--red-b);}
.jp-sumtxt.all{color:var(--green);font-size:12px;font-weight:700;}
.jp-sumtxt.some{color:var(--red);font-size:12px;font-weight:700;}
.jp-dots{display:flex;gap:4px;}
.jp-dot{width:9px;height:9px;border-radius:50%;}
.jp-dot.p{background:var(--green);}
.jp-dot.f{background:var(--red);}
.jp-dot.n{background:var(--dim);}
.ce-spin-sm{width:11px;height:11px;border:2px solid var(--border2);border-top-color:var(--accent);
  border-radius:50%;animation:ce-rot .5s linear infinite;display:inline-block;vertical-align:middle;}
.ce-ed{flex:1;display:flex;flex-direction:column;background:var(--ebg);overflow:hidden;}
.ce-edtop{padding:8px 16px;border-bottom:1.5px solid var(--border);background:var(--surface);
  display:flex;align-items:center;gap:10px;flex-shrink:0;}
.ce-fname{font-size:12px;color:var(--accent);font-family:'JetBrains Mono',monospace;margin-left:auto;}
.ce-edarea{flex:1;position:relative;overflow:hidden;display:flex;}
.ce-lnums{background:var(--eline);padding:16px 8px;text-align:right;color:var(--enum);font-size:13px;
  font-family:'JetBrains Mono',monospace;line-height:1.6;user-select:none;min-width:46px;
  border-right:1.5px solid var(--border);overflow:hidden;flex-shrink:0;}
.ce-lnum{height:20.8px;}
.ce-ta{flex:1;background:var(--ebg);color:var(--efg);font-family:'JetBrains Mono',monospace;font-size:13px;
  border:none;outline:none;padding:16px;resize:none;line-height:1.6;tab-size:4;caret-color:var(--ecur);}
.ce-ta::selection{background:rgba(37,99,235,.12);}
.ce-out{background:#f8faff;border-top:1.5px solid var(--border);max-height:80px;flex-shrink:0;overflow:auto;}
.ce-outhd{display:flex;align-items:center;justify-content:space-between;padding:5px 14px 0;}
.ce-outlbl{font-size:9px;font-weight:700;color:var(--dim);font-family:'JetBrains Mono',monospace;letter-spacing:.8px;}
.ce-outclr{font-size:10px;color:var(--dim);background:none;border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;}
.ce-outclr:hover{color:var(--accent);}
.ce-outpre{margin:0;padding:4px 14px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;white-space:pre-wrap;line-height:1.6;}
.ce-ok{color:#15803d;}.ce-err{color:var(--red);}
.ce-side{width:260px;background:var(--surface);border-left:1.5px solid var(--border);
  overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;}
.ce-ssec{padding:14px 12px;border-bottom:1px solid var(--border);}
.ce-cam{background:linear-gradient(160deg,#0f172a,#1e3a5f);border-radius:10px;overflow:hidden;
  aspect-ratio:4/3;position:relative;border:1.5px solid var(--border2);}
.ce-camin{width:100%;height:100%;position:relative;}
.ce-sil{position:absolute;bottom:0;left:50%;transform:translateX(-50%);}
.ce-silh{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.1);margin:0 auto 4px;}
.ce-silb{width:64px;height:64px;border-radius:50% 50% 0 0;background:rgba(255,255,255,.06);margin:0 auto;}
.ce-camov{position:absolute;top:7px;left:7px;display:flex;align-items:center;gap:4px;
  background:rgba(0,0,0,.45);border-radius:5px;padding:3px 7px;}
.ce-camrec{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:ce-pulse 1.5s ease infinite;}
.ce-camrlbl{font-size:8px;font-weight:700;color:rgba(255,255,255,.8);font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.ce-camstat{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
.ce-camdot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:ce-pulse 2s ease infinite;}
.ce-camact{font-size:9px;color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:700;display:flex;align-items:center;gap:4px;}
.ce-camface{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
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
.ce-wlimit{padding:10px 12px;border-bottom:1px solid var(--border);}
.ce-wbar-bg{background:var(--border);border-radius:99px;height:5px;overflow:hidden;margin:5px 0 3px;}
.ce-wbar-fill{height:100%;border-radius:99px;transition:width .4s,background .4s;}
/* live scores panel */
.ce-scores{padding:10px 12px;border-bottom:1px solid var(--border);}
.ce-score-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.ce-score-lbl{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.5px;}
.ce-score-val{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.ce-score-bar{background:var(--border);border-radius:99px;height:4px;overflow:hidden;margin-bottom:8px;}
.ce-score-fill{height:100%;border-radius:99px;transition:width .5s ease,background .5s;}
.ce-bar{position:fixed;bottom:0;left:0;right:260px;background:rgba(255,255,255,.96);
  backdrop-filter:blur(12px);border-top:1.5px solid var(--border);padding:10px 16px;
  display:flex;gap:8px;align-items:center;z-index:50;box-shadow:0 -2px 12px rgba(37,99,235,.07);}
.ce-bbar{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 20px;
  height:38px;border-radius:8px;border:none;font-size:13px;font-weight:600;
  font-family:'IBM Plex Sans',sans-serif;cursor:pointer;transition:all .15s;}
.ce-bbar:hover{transform:translateY(-1px);}
.ce-bbar-out{flex:1;background:transparent;color:var(--accent);border:1.5px solid var(--accent);}
.ce-bbar-out:hover{background:var(--accent-s);}
.ce-bbar-next{flex:2;background:var(--surface2);color:#1e3a8a;border:1.5px solid var(--border2);}
.ce-bbar-prim{flex:2;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 2px 10px rgba(37,99,235,.28);}
.ce-ov{position:fixed;inset:0;background:rgba(30,58,138,.15);backdrop-filter:blur(4px);
  display:flex;align-items:center;justify-content:center;z-index:200;}
.ce-modal{background:var(--surface);border:1.5px solid var(--border2);border-radius:14px;padding:26px;
  max-width:400px;width:90%;box-shadow:0 16px 50px rgba(37,99,235,.15);animation:ce-up .2s ease;}
.ce-modal h3{font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:8px;}
.ce-modal p{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:14px;}
.ce-mbtns{display:flex;gap:8px;justify-content:flex-end;}
.ce-vbanner{margin:8px 16px;background:var(--amber-s);border:1.5px solid var(--amber-b);
  border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;}
.ce-vmsg{font-size:12px;color:#78350f;font-weight:600;line-height:1.5;}
.ce-res-ov{position:fixed;inset:0;background:rgba(240,247,255,.97);z-index:300;
  display:flex;align-items:center;justify-content:center;padding:24px;}
.ce-res-card{background:var(--surface);border:1.5px solid var(--border2);border-radius:18px;
  overflow:hidden;max-width:500px;width:100%;box-shadow:0 16px 50px rgba(37,99,235,.13);animation:ce-up .4s ease;}
.ce-res-hdr{padding:28px 28px 18px;text-align:center;background:linear-gradient(160deg,#eff6ff,#fff);}
.ce-res-icon{width:64px;height:64px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:30px;}
.ce-res-title{font-size:20px;font-weight:700;color:#1e3a8a;margin-bottom:4px;}
.ce-res-sub{font-size:13px;color:var(--muted);}
.ce-res-body{padding:18px 28px 28px;}
.ce-res-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
.ce-res-stat{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;}
.ce-res-val{font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#1e3a8a;}
.ce-res-lbl{font-size:10px;color:var(--dim);font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin-top:2px;}
.ce-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;margin-bottom:18px;}
.ce-chip{border-radius:6px;padding:6px 10px;}
.ce-chip.pass{background:var(--green-s);border:1px solid var(--green-b);color:var(--green);}
.ce-chip.fail{background:var(--red-s);border:1px solid var(--red-b);color:var(--red);}
.ce-chip-lbl{font-size:11px;font-weight:600;display:block;}
.ce-chip-meta{font-size:10px;color:var(--muted);margin-top:1px;display:block;font-family:'JetBrains Mono',monospace;}
.ce-load{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);gap:14px;}
.ce-spin{width:34px;height:34px;border:3px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:ce-rot .8s linear infinite;}
.ce-ltxt{color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;}
@keyframes ce-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes ce-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
@keyframes ce-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes ce-rot{to{transform:rotate(360deg)}}
@keyframes ce-tp{0%,100%{opacity:1}50%{opacity:.5}}
`;

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAX_WARNINGS = 3; // ✅ FIX 1: was referenced but never defined

// ─── Java starter ─────────────────────────────────────────────────────────────
const JAVA_STARTER = `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        // Write your solution here
    }
}
`;

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
  const meta = parseMeta(q?.explanation);
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
  const meta = parseMeta(q?.explanation);
  if (meta?.sampleCases?.length) return meta.sampleCases;
  if (meta?.examples?.length)    return meta.examples;   // some AI uses "examples"
  if (q.sample_input != null || q.sample_output != null)
    return [{ input: q.sample_input ?? null, output: q.sample_output ?? null }];
  return [];
}
function getHint(q) {
  const meta = parseMeta(q?.explanation);
  return meta?.hint || meta?.approach || q?.hint || null;
}

// ─── Test cases ───────────────────────────────────────────────────────────────
function getTestCases(q) {
  let cases = [];
  const meta = parseMeta(q?.explanation);
  if (meta?.testCases?.length) {
    cases = meta.testCases.map((tc, i) => ({
      id: `tc_${tc.id ?? i}`, displayId: tc.id ?? i + 1,
      input: String(tc.input ?? tc.args ?? ''),
      expected: String(tc.expected ?? tc.output ?? ''),
      hidden: Boolean(tc.hidden ?? false), explanation: tc.explanation ?? '', synthetic: false,
    }));
  }
  if (!cases.length && q?.test_cases) {
    try {
      const arr = typeof q.test_cases === 'string' ? JSON.parse(q.test_cases) : q.test_cases;
      if (Array.isArray(arr) && arr.length) {
        cases = arr.map((tc, i) => ({
          id: `tc_${i}`, displayId: i + 1,
          input: String(tc.input ?? tc.args ?? ''),
          expected: String(tc.expected ?? tc.output ?? ''),
          hidden: Boolean(tc.hidden ?? false), explanation: tc.explanation ?? '', synthetic: false,
        }));
      }
    } catch {}
  }
  if (!cases.length) {
    const samples = getSamples(q);
    cases = samples.map((s, i) => ({
      id: `tc_s${i}`, displayId: i + 1,
      input: String(s.input ?? ''), expected: String(s.output ?? ''),
      hidden: false, explanation: s.explanation ?? '', synthetic: false,
    }));
  }
  if (cases.length === 0) {
    for (let i = 0; i < 3; i++)
      cases.push({ id: `tc_syn${i}`, displayId: i + 1, input: `Input ${i+1}`, expected: `Output ${i+1}`, hidden: false, synthetic: true, explanation: '' });
  }
  const visCount = cases.filter(c => !c.hidden).length;
  if (visCount > 0 && visCount < 3) {
    const base = cases.find(c => !c.hidden);
    for (let i = visCount; i < 3; i++)
      cases.push({ id: `tc_pad${i}`, displayId: cases.length + 1, input: base.input, expected: base.expected, hidden: false, synthetic: true, explanation: '' });
  }
  if (!cases.some(c => c.hidden))
    cases.push({ id: 'tc_hid0', displayId: cases.length + 1, input: '???', expected: '???', hidden: true, synthetic: true, explanation: '' });
  return cases;
}

// ─── Student info from localStorage ──────────────────────────────────────────
function getStudentInfo() {
  return {
    studentId:   localStorage.getItem('student_id')     || localStorage.getItem('user_id')     || 'unknown',
    studentName: localStorage.getItem('student_name')   || localStorage.getItem('user_name')   || 'Student',
    email:       localStorage.getItem('student_email')  || localStorage.getItem('user_email')  || '',
    branch:      localStorage.getItem('student_branch') || '',
    batch:       localStorage.getItem('student_batch')  || '',
    college:     localStorage.getItem('student_college')|| '',
  };
}

function getToken() { return localStorage.getItem('token') || localStorage.getItem('student_token') || ''; }
function resolveExamId(p, rs) {
  if (p) return typeof p === 'string' ? parseInt(p, 10) : p;
  const s = rs?.exam_id || rs?.examId || rs?.exam?.id;
  if (s) return typeof s === 'string' ? parseInt(s, 10) : s;
  const ls = localStorage.getItem('exam_id');
  return ls ? parseInt(ls, 10) : null;
}
function resolveAssignId(p, rs) {
  return p || rs?.assignment_id || rs?.assignmentId || rs?.exam?.assignment_id || localStorage.getItem('assignment_id') || null;
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
  return (<>
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color:'var(--accent)', fontFamily:"'JetBrains Mono',monospace", marginBottom:8, textTransform:'uppercase', display:'block' }}>AI Proctoring — Active</span>
    <div className="ce-cam"><div className="ce-camin">
      <div className="ce-sil"><div className="ce-silh"/><div className="ce-silb"/></div>
      <div className="ce-camov"><div className="ce-camrec"/><span className="ce-camrlbl">LIVE</span></div>
    </div></div>
    <div className="ce-camstat">
      <div style={{ display:'flex', alignItems:'center', gap:5 }}><div className="ce-camdot"/><span className="ce-camact">ACTIVE</span></div>
      <span className="ce-camface">Face detected</span>
    </div>
  </>);
}

// ─── Judge Panel ──────────────────────────────────────────────────────────────
function JudgePanel({ testCases, testResults, running, activeTabId, onTabChange }) {
  const visibleTCs = testCases.filter(tc => !tc.hidden);
  const hiddenTCs  = testCases.filter(tc =>  tc.hidden);
  const ranCount   = Object.keys(testResults).length;
  const passCount  = Object.values(testResults).filter(r => r.passed).length;
  const allRan     = !running && ranCount > 0 && ranCount >= visibleTCs.length;
  const anyError   = Object.values(testResults).some(r => r.error);

  let state = 'idle', title = 'Run your code to see results';
  let sub = `${visibleTCs.length} visible · ${hiddenTCs.length} hidden`, icon = '⚡';
  if (running) { state = 'running'; title = 'Judging on server (Java)…'; sub = 'Running each test case…'; icon = null; }
  else if (allRan) {
    if (anyError)                            { state = 'error';    title = 'Runtime Error';                                        sub = `Error on ${Object.values(testResults).filter(r=>r.error).length} case(s)`;  icon = '💥'; }
    else if (passCount === visibleTCs.length){ state = 'accepted'; title = `Accepted — ${passCount}/${visibleTCs.length} passed`;  sub = 'Hidden cases evaluated on submission'; icon = '✓'; }
    else                                     { state = 'wrong';    title = `Wrong Answer — ${passCount}/${visibleTCs.length}`;     sub = `${visibleTCs.length - passCount} case(s) failed`;                               icon = '✗'; }
  }
  const activeTc  = testCases.find(tc => tc.id === activeTabId) || visibleTCs[0] || null;
  const activeRes = activeTc ? testResults[activeTc.id] : null;
  function tabCls(tc) {
    const r = testResults[tc.id], sel = tc.id === activeTabId;
    if (r?.passed === true)  return sel ? 'pass sel' : 'pass';
    if (r?.passed === false) return sel ? 'fail sel' : 'fail';
    return sel ? 'sel' : '';
  }
  return (
    <div className="jp-wrap">
      <div className={`jp-banner ${state}`}>
        <span style={{ fontSize:16, flexShrink:0, paddingTop:1 }}>{running ? <span className="ce-spin-sm"/> : icon}</span>
        <div>
          <div className="jp-btitle">{title}</div>
          <div className="jp-bsub">{sub} <span style={{ marginLeft:8, fontSize:10, opacity:.65 }}>🖥 server (Java)</span></div>
        </div>
      </div>
      <div className="jp-casetabs">
        {visibleTCs.map(tc => (
          <button key={tc.id} className={`jp-ctab ${tabCls(tc)}`} onClick={() => onTabChange(tc.id)}>
            {testResults[tc.id]?.running ? <span className="ce-spin-sm"/> : <span className="jp-cdot"/>}
            Case {tc.displayId}
          </button>
        ))}
        {hiddenTCs.map(tc => (
          <button key={tc.id} className="jp-ctab" style={{ opacity:.45, cursor:'default' }}>🔒 Case {tc.displayId}</button>
        ))}
      </div>
      <div className="jp-body">
        {!activeTc ? (
          <div className="jp-pending">No test cases configured.</div>
        ) : activeTc.hidden ? (
          <div style={{ textAlign:'center', padding:'18px', color:'var(--dim)', fontSize:12, fontStyle:'italic' }}>🔒 Hidden — revealed after submission</div>
        ) : !activeRes || activeRes.running ? (
          <div className="jp-pending">{activeRes?.running ? <><span className="ce-spin-sm"/> &nbsp;Running…</> : 'Click ▶ Run to execute Java on the backend'}</div>
        ) : (
          <div>
            <div className="jp-row"><span className="jp-lbl">Input</span><span className="jp-val">{activeTc.input || '(empty)'}</span></div>
            <div className="jp-row"><span className="jp-lbl">Expected</span><span className="jp-val">{activeTc.expected}</span></div>
            <div className="jp-row">
              <span className="jp-lbl">Your Output</span>
              <span className={`jp-val ${activeRes.passed ? 'pass' : 'fail'}`}>{activeRes.actual ?? '(no output)'}</span>
            </div>
            {activeRes.error && <div className="jp-err">{activeRes.error}</div>}
          </div>
        )}
      </div>
      {allRan && visibleTCs.length > 0 && (
        <div className={`jp-summary ${passCount === visibleTCs.length ? 'all' : 'some'}`}>
          <span className={`jp-sumtxt ${passCount === visibleTCs.length ? 'all' : 'some'}`}>
            {passCount === visibleTCs.length ? `✅ All ${visibleTCs.length} visible passed` : `${passCount}/${visibleTCs.length} tests passed`}
          </span>
          <div className="jp-dots">
            {visibleTCs.map(tc => {
              const r = testResults[tc.id];
              return <div key={tc.id} className={`jp-dot ${r?.passed ? 'p' : r ? 'f' : 'n'}`}/>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────
function ResultScreen({ data, onNext }) {
  const { allResults = [], passedCount, total, timeTaken, score } = data;
  const fmtT = s => `${Math.floor(s/60)}m ${s%60}s`;
  const allPass = passedCount === total && total > 0;
  return (
    <div className="ce-res-ov"><div className="ce-res-card">
      <div className="ce-res-hdr">
        <div className="ce-res-icon" style={{ background: allPass ? '#dcfce7' : '#eff6ff' }}>{allPass ? '✅' : '📝'}</div>
        <div className="ce-res-title">{allPass ? 'All Tests Passed!' : 'Submission Complete'}</div>
        <div className="ce-res-sub">Your Java solution has been submitted</div>
      </div>
      <div className="ce-res-body">
        <div className="ce-res-grid">
          <div className="ce-res-stat"><div className="ce-res-val" style={{ color: score>=80?'#16a34a':score>=50?'#d97706':'#dc2626' }}>{score}%</div><div className="ce-res-lbl">Score</div></div>
          <div className="ce-res-stat"><div className="ce-res-val">{passedCount}/{total}</div><div className="ce-res-lbl">Tests Passed</div></div>
          <div className="ce-res-stat"><div className="ce-res-val" style={{ fontSize:14, paddingTop:4 }}>{fmtT(timeTaken)}</div><div className="ce-res-lbl">Time Used</div></div>
          <div className="ce-res-stat"><div className="ce-res-val" style={{ color:'#2563eb' }}>{allResults.filter(r=>!r.hidden&&r.passed).length}/{allResults.filter(r=>!r.hidden).length||'—'}</div><div className="ce-res-lbl">Visible Tests</div></div>
        </div>
        {allResults.length > 0 && (<>
          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:8 }}>Test Results</div>
          <div className="ce-chips">
            {allResults.map(tc => (
              <div key={tc.id} className={`ce-chip ${tc.passed ? 'pass' : 'fail'}`}>
                <span className="ce-chip-lbl">{tc.passed?'✓':'✗'} Case {tc.displayId}{tc.hidden?' 🔒':''}</span>
                {!tc.hidden && tc.actual && !tc.passed && <span className="ce-chip-meta">Got: {tc.actual}</span>}
              </div>
            ))}
          </div>
        </>)}
        <button className="ce-btn ce-btn-sub" style={{ width:'100%', height:42, fontSize:14, borderRadius:9, justifyContent:'center' }} onClick={onNext}>
          Continue to Next Round <IcArrow/>
        </button>
      </div>
    </div></div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CodeExam({
  examId: examIdProp, assignmentId: assignmentIdProp,
  onNavigate, onStartViva,
  examTitle: examTitleProp, durationMins: durationMinsProp,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const rs = location.state || {};
  const examId       = resolveExamId(examIdProp, rs);
  const assignmentId = resolveAssignId(assignmentIdProp, rs);
  const examTitle    = examTitleProp || rs.title || rs.examTitle || 'Coding Round';
  const durationMins = durationMinsProp || rs.duration || rs.durationMins || 45;

  useEffect(() => {
    if (!document.getElementById('ce-css6')) {
      const s = document.createElement('style'); s.id = 'ce-css6'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    return () => document.getElementById('ce-css6')?.remove();
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

  const ph = (useAIProctoring || (() => ({
    videoRef:{current:null}, canvasRef:{current:null},
    proctoringState:{}, violations:[], isReady:false, modelError:null,
  })))({ onViolation: e => triggerViol(e.message), assignmentId, examId, token: getToken(), enabled: !submitted });
  const { videoRef, canvasRef, proctoringState, violations: aiViol, isReady: procReady, modelError } = ph;
  const hasOverlay = !!ProctoringOverlay;

  // ── Fetch questions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId || isNaN(examId)) { setLoading(false); return; }
    const url = `${API_URL}/api/questions/${examId}/coding${assignmentId ? `?assignment_id=${assignmentId}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const qs = data.questions || [];
        setQuestions(qs);
        const cm = {};
        qs.forEach(q => { cm[q.id] = getStarter(q); });
        setCodeMap(cm);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [examId, assignmentId]); // eslint-disable-line

  // Clear output when question or language changes
  useEffect(() => { setOutput(null); }, [current, lang]);

  const q           = questions[current] || null;
  const currentCode = q ? (codeMap[q.id] ?? getStarter(q)) : '';
  const lineCount   = Math.max((currentCode.match(/\n/g) || []).length + 1, 20);
  const testCases   = q ? getTestCases(q) : [];
  const visibleTCs  = testCases.filter(tc => !tc.hidden);
  const answered    = Object.keys(answers).length;
  const syncScroll  = () => { if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop; };
  const passCount   = Object.values(testResults).filter(r => r.passed).length;
  const allRan      = !running && Object.keys(testResults).length > 0 && Object.keys(testResults).length >= visibleTCs.length;
  const wPct        = Math.min(100, (violations.length / MAX_WARNINGS) * 100);
  const wColor      = wPct < 40 ? '#16a34a' : wPct < 70 ? '#d97706' : '#dc2626';
  const aiColor     = liveAI < 30 ? '#16a34a' : liveAI < 60 ? '#d97706' : '#dc2626';
  const simColor    = liveSim < 30 ? '#16a34a' : liveSim < 60 ? '#d97706' : '#dc2626';

  // Default active tab
  useEffect(() => {
    if (testCases.length > 0 && !activeTabId)
      setActiveTabId(testCases.find(tc => !tc.hidden)?.id ?? null);
  }, [testCases.length]); // eslint-disable-line

  // Timer
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); doSubmit(true); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]); // eslint-disable-line

  // Violation listeners
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
    violsRef.current = [...violsRef.current, { reason, time: new Date().toLocaleTimeString() }];
    setViolations([...violsRef.current]);
    // ✅ FIX 1: MAX_WARNINGS is now defined as a constant above
    setViolMsg(`⚠ ${reason} · ${violsRef.current.length}/${MAX_WARNINGS} warnings`);
    setShowViol(true);
    clearTimeout(vTRef.current);
    vTRef.current = setTimeout(() => setShowViol(false), 5000);
    if (violsRef.current.length >= 3) doSubmit();
  }, []); // eslint-disable-line

  // ── Detection helper — runs analyzeCode via detectionEngine, persists ──────
  function runDetection(code, tcResults = []) {
    const info = getStudentInfo();
    const record = buildDetectionRecord({
      ...info, code, tcResults,
      totalCases: testCases.length,
      examId: String(examId || 'unknown'),
      examName: examTitle,
    });
    persistDetectionRecord(record);
    // Update live sidebar scores
    setLiveAI(record.ai_score);
    setLiveSim(record.similarity_score);
    setLiveVerdict(record.verdict);
    return record;
  }

  function handleCode(val) { if (!q) return; setCodeMap(p => ({ ...p, [q.id]: val })); }
  function handleTab(e) {
    if (e.key !== 'Tab') return; e.preventDefault();
    const s = e.target.selectionStart, end = e.target.selectionEnd;
    handleCode(currentCode.substring(0, s) + '    ' + currentCode.substring(end));
    requestAnimationFrame(() => { if (taRef.current) { taRef.current.selectionStart = s + 4; taRef.current.selectionEnd = s + 4; } });
  }
  function saveAnswer() { if (!q) return; setAnswers(p => ({ ...p, [q.id]: { lang: 'java', code: currentCode } })); }

  // ── RUN ───────────────────────────────────────────────────────────────────
  async function runCode() {
    if (!q) return;
    setRunning(true); setOutput(null); setLeftTab('testcases');
    const visible = testCases.filter(tc => !tc.hidden);
    const initState = {};
    visible.forEach(tc => { initState[tc.id] = { running: true, passed: false, actual: null, error: null }; });
    setTestResults(initState);
    if (visible[0]) setActiveTabId(visible[0].id);

    // Run detection immediately on current code (before server results)
    runDetection(currentCode, []);

    try {
      const res = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ language: 'java', code: currentCode, test_cases: visible.map(tc => ({ input: tc.input, expected: tc.expected })) }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Server ${res.status} — POST /api/execute not implemented yet`);
      }
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const finalResults = {};
        for (let i = 0; i < visible.length; i++) {
          const tc = visible[i], r = data.results[i] || {};
          await new Promise(resolve => setTimeout(resolve, 80 + i * 80));
          finalResults[tc.id] = { passed: Boolean(r.passed), actual: r.actual ?? r.stdout ?? null, error: r.error ?? r.stderr ?? null, running: false };
          setTestResults(prev => ({ ...prev, [tc.id]: finalResults[tc.id] }));
        }
        const firstFail = visible.find(tc => !finalResults[tc.id]?.passed);
        if (firstFail) setActiveTabId(firstFail.id);
        const resultsArr = visible.map(tc => ({ ...tc, ...finalResults[tc.id] }));
        const passed = resultsArr.filter(r => r.passed).length;
        setOutput({ text: `${passed}/${visible.length} test${visible.length !== 1 ? 's' : ''} passed`, ok: passed === visible.length });
        // Re-run detection with actual test results
        runDetection(currentCode, resultsArr);
      } else {
        const sOut = data.output ?? data.stdout ?? null;
        const sErr = data.error  ?? data.stderr  ?? null;
        const fr = {};
        visible.forEach(tc => { fr[tc.id] = { passed: false, actual: sOut, error: sErr, running: false }; });
        setTestResults(fr);
        setOutput({ text: sErr || sOut || 'No output', ok: !sErr });
      }
    } catch (err) {
      const msg = err.message || 'Unknown error';
      const fr = {};
      visible.forEach(tc => { fr[tc.id] = { passed: false, actual: null, error: msg, running: false }; });
      setTestResults(fr);
      setOutput({ text: `Java execution failed: ${msg}\n\nEnsure your backend has POST /api/execute.\nCode saved — submit to evaluate on server.`, ok: false });
    }
    setRunning(false);
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  const doSubmit = useCallback((auto = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(timerRef.current);
    setShowConf(false);
    const finals = { ...answers };
    if (q) finals[q.id] = { lang, code: currentCode };
    localStorage.setItem('last_code_submission', JSON.stringify(finals));
    const primaryCode = finals[q?.id]?.code || currentCode;
    const allTCResults = testCases.map(tc => ({ ...tc, passed: false, actual: null, error: 'Evaluated on server' }));

    // Final detection push with definitive scores
    runDetection(primaryCode, allTCResults);

    if (assignmentId && examId && !isNaN(examId)) {
      fetch(`${API_URL}/api/questions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ assignment_id: assignmentId, exam_id: examId, code_answers: finals, violations: violsRef.current, round: 'coding' }),
      }).catch(() => {});
    }
    const passedCount = allTCResults.filter(r => r.passed).length;
    setResultData({
      allResults: allTCResults, passedCount, total: testCases.length,
      timeTaken: (durationMins * 60) - timeLeft, autoSubmit: auto,
      score: testCases.length > 0 ? Math.round(passedCount / testCases.length * 100) : 0,
    });
    setSubmitted(true);
  }, [answers, q, currentCode, assignmentId, examId, testCases, timeLeft, durationMins, examTitle]); // eslint-disable-line

  function goNext() {
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

  if (loading) return <div className="ce-load"><style>{CSS}</style><div className="ce-spin"/><p className="ce-ltxt">Loading coding problems…</p></div>;
  if (submitted && resultData) return <><style>{CSS}</style><ResultScreen data={resultData} onNext={goNext}/></>;

  return (
    <>
      <style>{CSS}</style>
      <div className="ce-root">
        <header className="ce-hdr">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="ce-logo"><IcCode/></div>
            <span className="ce-bname">NeuroAssess</span>
            <span className="ce-qbadge">Q{current+1} / {Math.max(questions.length,1)}</span>
            <div className="ce-langpill"><div className="ce-langdot"/>Java</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {violations.length > 0 && <span className="ce-wbadge"><IcWarn/> {violations.length} Warning{violations.length>1?'s':''}</span>}
            <div className={timerCls}><div className="ce-tdot"/><span>{mm}:{ss}</span></div>
            <button className="ce-btn ce-btn-save" onClick={saveAnswer}><IcSave/> Save</button>
            <button className="ce-btn ce-btn-run" onClick={runCode} disabled={running}><IcPlay/> {running?'Running…':'Run'}</button>
            <button className="ce-btn ce-btn-sub" onClick={() => setShowConf(true)}><IcSend/> Submit</button>
          </div>
        </header>

        <div className="ce-body">
          {/* LEFT PANEL */}
          <div className="ce-left">
            <div className="ce-tabs">
              {['problem','testcases','hint'].map(t => (
                <button key={t} className={`ce-tab${leftTab===t?' active':''}`} onClick={() => setLeftTab(t)}>
                  {t==='testcases' ? <>Test Cases{allRan && <span style={{ marginLeft:5, fontSize:10, fontWeight:700, color:passCount===visibleTCs.length?'var(--green)':'var(--red)' }}>{passCount}/{visibleTCs.length}</span>}</> : t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <div className="ce-lbody">
              {!q ? <div className="ce-empty">No coding problems found for this exam.</div>
              : leftTab==='problem' ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <h2 className="ce-qtitle" style={{ margin:0, flex:1 }}>{q.question_text||q.title}</h2>
                    {q.difficulty && <span className={`ce-diffbadge ce-diff-${(q.difficulty||'').toLowerCase()}`}>{q.difficulty}</span>}
                  </div>
                  {desc && <><p className="ce-slbl">Description</p><p className="ce-desc">{desc}</p></>}
                  {samples.length > 0 && (<><p className="ce-slbl">Examples</p>
                    {samples.map((ex,i) => (
                      <div className="ce-ex" key={i}>
                        <p className="ce-exlbl">Example {i+1}</p>
                        {ex.input  != null && <div className="ce-exrow"><span className="ce-exkey">Input:</span>{String(ex.input)}</div>}
                        {ex.output != null && <div className="ce-exrow"><span className="ce-exkey">Output:</span>{String(ex.output)}</div>}
                        {ex.explanation && <p style={{ fontSize:11, color:'var(--muted)', marginTop:5, lineHeight:1.6 }}>{ex.explanation}</p>}
                      </div>
                    ))}</>
                  )}
                  {constraints.length > 0 && (<><p className="ce-slbl">Constraints</p>
                    {constraints.map((c,i) => <div className="ce-constraint" key={i}>• {c}</div>)}</>
                  )}
                </>
              ) : leftTab==='testcases' ? (
                <JudgePanel testCases={testCases} testResults={testResults} running={running} activeTabId={resolvedTab} onTabChange={setActiveTabId}/>
              ) : (
                hint ? <div className="ce-hint"><p className="ce-hinttxt">{hint}</p></div>
                     : <div className="ce-empty">No hint available.</div>
              )}
            </div>
          </div>

          {/* EDITOR */}
          <div className="ce-ed">
            <div className="ce-edtop">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A14.47 14.47 0 0 1 6 17.99"/><path d="m6 17.99-.28-1.99"/><path d="m10 13 1 4"/><path d="m11 13 1 4"/><path d="M9 5.5A11.5 11.5 0 0 1 12 2a11.5 11.5 0 0 1 3 3.5C16.5 8.5 16.5 11 12 11s-4.5-2.5-3-5.5z"/></svg>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)', fontFamily:"'JetBrains Mono',monospace" }}>Java</span>
                <span style={{ fontSize:11, color:'var(--dim)', fontFamily:"'JetBrains Mono',monospace" }}>· executed on server</span>
              </div>
              <span className="ce-fname">Solution.java</span>
            </div>
            {showViol && <div className="ce-vbanner"><IcWarn/><span className="ce-vmsg">{violMsg}</span></div>}
            <div className="ce-edarea">
              <div className="ce-lnums" ref={lnRef}>
                {Array.from({ length: lineCount }, (_, i) => <div key={i} className="ce-lnum">{i+1}</div>)}
              </div>
              <textarea ref={taRef} className="ce-ta" value={currentCode}
                onChange={e => handleCode(e.target.value)} onScroll={syncScroll}
                onKeyDown={handleTab} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"/>
            </div>
            {output && (
              <div className="ce-out">
                <div className="ce-outhd">
                  <span className="ce-outlbl">OUTPUT</span>
                  <button className="ce-outclr" onClick={() => { setOutput(null); setTestResults({}); }}>✕ clear</button>
                </div>
                <pre className={`ce-outpre ${output.ok ? 'ce-ok' : 'ce-err'}`}>{output.text}</pre>
              </div>
            )}
          </div>

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

      {/* BOTTOM BAR */}
      <div className="ce-bar">
        <button className="ce-bbar ce-bbar-out" onClick={saveAnswer}><IcSave/> Save</button>
        {current+1 < questions.length
          ? <button className="ce-bbar ce-bbar-next" onClick={() => { saveAnswer(); setCurrent(c=>c+1); }}>Next Problem <IcArrow/></button>
          : <button className="ce-bbar ce-bbar-prim" onClick={() => setShowConf(true)}>Submit &amp; Proceed <IcSend/></button>}
      </div>

      {/* MODAL */}
      {showConf && (
        <div className="ce-ov"><div className="ce-modal">
          <h3>Submit Java Solutions?</h3>
          <p>{answered} of {questions.length} problem{questions.length!==1?'s':''} saved. You cannot edit after submitting.</p>
          {violations.length>0 && (
            <div style={{ background:'var(--amber-s)', border:'1px solid var(--amber-b)', borderRadius:8, padding:'9px 12px', marginBottom:14, fontSize:12, color:'#78350f' }}>
              ⚠ {violations.length} proctoring warning{violations.length>1?'s':''} will be recorded.
            </div>
          )}
          <div className="ce-mbtns">
            <button className="ce-btn ce-btn-save" style={{ padding:'0 18px', height:36 }} onClick={() => setShowConf(false)}>Cancel</button>
            <button className="ce-btn ce-btn-sub" style={{ padding:'0 22px', height:36 }} onClick={() => doSubmit(false)}><IcSend/> Submit</button>
          </div>
        </div></div>
      )}
    </>
  );
}