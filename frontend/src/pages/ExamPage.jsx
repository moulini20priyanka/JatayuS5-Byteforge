import { useState, useEffect, useRef, useCallback } from "react";

/* ── Fonts ── */
if (!document.getElementById("na-fonts")) {
  const l = document.createElement("link");
  l.id = "na-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

/* ── CSS ── */
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #f4f6fb;
  --surface: #ffffff;
  --surface2: #f8f9fd;
  --border: #e4e8f0;
  --border2: #cdd3e0;
  --accent: #2563eb;
  --accent-s: #eff4ff;
  --accent-m: rgba(37,99,235,0.12);
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

.na-layout {
  display: grid;
  grid-template-rows: 60px 1fr;
  grid-template-columns: 1fr 288px;
  height: 100vh;
}

.na-topbar {
  grid-column: 1 / -1;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 14px;
  z-index: 50;
  box-shadow: var(--shadow-sm);
}
.na-brand { display: flex; align-items: center; gap: 10px; }
.na-brand-icon {
  width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
}
.na-brand-name { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.na-brand-sub  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.6px; margin-top: 1px; }
.na-topbar-div { width: 1px; height: 26px; background: var(--border); flex-shrink: 0; }
.na-exam-info { display: flex; flex-direction: column; }
.na-exam-title { font-size: 12px; font-weight: 600; color: var(--text2); }
.na-exam-meta  { font-size: 10px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
.na-spacer { flex: 1; }

.na-proctor-pill {
  display: flex; align-items: center; gap: 6px;
  background: var(--green-s); border: 1px solid rgba(22,163,74,0.18);
  border-radius: 100px; padding: 5px 12px;
}
.na-proctor-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: na-pulse 2s ease infinite; }
.na-proctor-label { font-size: 10px; font-weight: 700; color: var(--green); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.8px; }

.na-viol-badge {
  display: flex; align-items: center; gap: 6px;
  background: var(--amber-s); border: 1px solid rgba(217,119,6,0.2);
  border-radius: 100px; padding: 5px 11px;
}
.na-viol-label { font-size: 10px; font-weight: 700; color: var(--amber); font-family: 'JetBrains Mono', monospace; }

.na-timer {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 100px; padding: 6px 16px; transition: all 0.4s;
}
.na-timer.warning { background: var(--amber-s); border-color: rgba(217,119,6,0.3); }
.na-timer.danger  { background: var(--red-s);   border-color: rgba(220,38,38,0.3); animation: na-timer-pulse 1s ease infinite; }
.na-timer-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: na-ping 2s ease infinite; transition: background 0.4s; }
.na-timer.warning .na-timer-dot { background: var(--amber); }
.na-timer.danger  .na-timer-dot { background: var(--red); }
.na-timer-val {
  font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700;
  color: var(--green); letter-spacing: 2.5px; transition: color 0.4s;
}
.na-timer.warning .na-timer-val { color: var(--amber); }
.na-timer.danger  .na-timer-val { color: var(--red); }

.na-main { overflow-y: auto; padding: 32px 40px 110px; position: relative; background: var(--bg); }

.na-exam-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.na-exam-progress-bar { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
.na-exam-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), #4f46e5); transition: width 0.5s cubic-bezier(.4,0,.2,1); }
.na-exam-progress-label { font-size: 11px; font-weight: 600; color: var(--muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

.na-qcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  animation: na-fadeUp 0.35s cubic-bezier(.22,1,.36,1);
}
.na-qnum-row { padding: 20px 28px 0; display: flex; align-items: center; justify-content: space-between; }
.na-qnum-badge { background: var(--accent-s); border: 1px solid var(--accent-m); border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: var(--accent); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; }
.na-qnum-of    { font-size: 11px; color: var(--dim); font-family: 'JetBrains Mono', monospace; font-weight: 500; }
.na-qtext      { padding: 18px 28px 22px; font-size: 17px; font-weight: 600; color: var(--text); line-height: 1.55; letter-spacing: -0.2px; }

.na-options { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 8px; }
.na-opt {
  display: flex; align-items: center; gap: 12px;
  width: 100%; text-align: left; cursor: pointer;
  background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 13px 16px;
  font-size: 14px; font-weight: 400; color: var(--text2);
  font-family: 'Inter', sans-serif; transition: all 0.15s ease; position: relative;
}
.na-opt:hover:not(.disabled) { background: var(--accent-s); border-color: rgba(37,99,235,0.3); color: var(--accent); }
.na-opt.selected { background: var(--accent-s); border-color: rgba(37,99,235,0.45); color: var(--accent); font-weight: 500; box-shadow: 0 0 0 3px rgba(37,99,235,0.07); }
.na-opt.locked { cursor: default; }
.na-opt.locked:hover { background: var(--surface2); border-color: var(--border); color: var(--text2); }
.na-opt.locked.selected { background: var(--accent-s); border-color: rgba(37,99,235,0.45); color: var(--accent); }
.na-opt.disabled { cursor: default; }
.na-opt-letter { width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0; background: #e8edf5; color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; transition: all 0.15px; }
.na-opt.selected .na-opt-letter { background: var(--accent); color: #fff; }
.na-opt.locked .na-opt-letter   { background: #e8edf5; color: var(--muted); }
.na-opt.locked.selected .na-opt-letter { background: var(--accent); color: #fff; }

.na-answered-notice { margin: 0 24px 20px; background: #f0f4ff; border: 1px solid rgba(37,99,235,0.15); border-radius: 10px; padding: 11px 14px; display: flex; align-items: center; gap: 9px; animation: na-fadeUp 0.3s ease; }
.na-answered-notice-text { font-size: 12.5px; font-weight: 500; color: var(--accent); line-height: 1.5; }

.na-viol-banner { display: none; margin-top: 14px; background: var(--amber-s); border: 1.5px solid rgba(217,119,6,0.25); border-radius: 10px; padding: 11px 16px; align-items: flex-start; gap: 9px; }
.na-viol-banner.show { display: flex; }

.na-action-bar {
  position: fixed; bottom: 0; left: 0; right: 289px;
  background: rgba(244,246,251,0.96); backdrop-filter: blur(14px);
  border-top: 1px solid var(--border); padding: 14px 40px;
  display: flex; gap: 10px; align-items: center; z-index: 50;
}
.na-btn { padding: 11px 22px; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: all 0.15s; }
.na-btn-primary { flex: 1; padding: 12px; background: var(--accent); color: #fff; font-size: 14px; box-shadow: 0 2px 10px rgba(37,99,235,0.28); }
.na-btn-primary:hover    { background: #1d4ed8; box-shadow: 0 4px 16px rgba(37,99,235,0.35); }
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

.na-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px; border-bottom: 1px solid var(--border); }
.na-stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 10px 8px; text-align: center; }
.na-stat-val { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
.na-stat-lbl { font-size: 9px; color: var(--dim); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; margin-top: 4px; }

.na-nav-section { padding: 14px; }
.na-nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.na-nav-dot { aspect-ratio: 1; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; border: 1.5px solid var(--border); background: var(--surface2); color: var(--dim); transition: all 0.12s; }
.na-nav-dot.current  { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.3); }
.na-nav-dot.answered { background: #e8f5e9; border-color: rgba(22,163,74,0.3); color: var(--green); }
.na-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.na-legend-item { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }
.na-legend-dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }

.na-watermark { position: fixed; top: 60px; left: 0; right: 288px; bottom: 0; pointer-events: none; z-index: 40; }
.na-shake { animation: na-shake 0.4s ease !important; }

.na-unlock-box { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid rgba(22,163,74,0.25); border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; animation: na-fadeUp 0.4s ease; }
.na-unlock-btn { margin-top: 12px; padding: 10px 20px; border-radius: 8px; border: none; background: var(--green); color: #fff; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; box-shadow: 0 2px 10px rgba(22,163,74,0.3); transition: all 0.15s; display: inline-block; }
.na-unlock-btn:hover { background: #15803d; transform: translateY(-1px); }

.na-result-overlay { display: none; position: fixed; inset: 0; background: rgba(244,246,251,0.97); backdrop-filter: blur(18px); z-index: 200; align-items: center; justify-content: center; padding: 24px; }
.na-result-overlay.show { display: flex; }

.na-redirect-bar { background: var(--border); border-radius: 99px; height: 5px; overflow: hidden; margin-top: 16px; }
.na-redirect-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--red), #f87171); transition: width 1s linear; }

@keyframes na-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes na-ping   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.3); } }
@keyframes na-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes na-shake  { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-5px); } 40%,80% { transform:translateX(5px); } }
@keyframes na-timer-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.2); } 50% { box-shadow:0 0 0 6px rgba(220,38,38,0); } }
`;

const QUESTIONS = [
  { q: "What is the time complexity of binary search?",              opts: ["O(n)", "O(log n)", "O(n²)", "O(1)"],                                                                ans: 1 },
  { q: "Which sorting algorithm guarantees O(n log n) worst-case?", opts: ["Bubble Sort", "Quick Sort", "Merge Sort", "Insertion Sort"],                                        ans: 2 },
  { q: "What is the space complexity of recursive DFS on a graph with V nodes?", opts: ["O(1)", "O(V²)", "O(V)", "O(E)"],                                                       ans: 2 },
];

const LETTERS       = ["A", "B", "C", "D"];
const TOTAL_SECS    = 5 * 60;
const CUTOFF        = 34;
const ROLL          = "240352";
const REDIRECT_SECS = 60;

/* ── SVG Icons ── */
const IconBrain = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconSuccess = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconDB = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
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
  ctx.fillStyle = "rgba(37,99,235,0.09)";
  ctx.fillText("NEUROASSESS", 0, -14);
  ctx.font = "500 13px Arial, sans-serif";
  ctx.fillStyle = "rgba(37,99,235,0.07)";
  ctx.fillText(ROLL, 0, 10);
  ctx.restore();
  return `url(${c.toDataURL()})`;
}

// ✅ FIXED: Removed SQLExamPage import entirely.
// ExamPage now delegates ALL navigation via the onNavigate prop.
// The parent (ExamPageWrapper in App.jsx or ExamRouter) is responsible
// for rendering the correct next page when onNavigate("sql") is called.

export default function ExamPage({ onNavigate }) {
  useEffect(() => {
    if (document.getElementById("na-styles")) return;
    const s = document.createElement("style"); s.id = "na-styles"; s.textContent = CSS;
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

  const violTimerRef  = useRef(null);
  const listeningRef  = useRef(false);
  const violationsRef = useRef(0);
  const examDoneRef   = useRef(false);

  // ✅ FIXED: navigate always uses the ref, never renders SQLExamPage inline.
  // "sql"   → parent (ExamPageWrapper or ExamRouter) routes to SQLExamPage
  // "lobby" → parent routes to /student-dashboard
  const navigate = useCallback((target) => {
    if (onNavigateRef.current) {
      onNavigateRef.current(target);
    } else {
      // Fallback for standalone use (no parent wrapper)
      if (target === "sql")   window.location.assign("/sql-exam");
      if (target === "lobby") window.location.assign("/");
    }
  }, []);

  useEffect(() => { setWmBg(buildWatermarkBg()); }, []);

  useEffect(() => {
    const isC = answers[current] !== null;
    setConfirmed(isC);
    setSelected(isC ? answers[current] : null);
    setCardKey(k => k + 1);
  }, [current]); // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(id); doSubmit(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // Redirect countdown on fail
  useEffect(() => {
    if (!examDone || !result || result.passed) return;
    const id = setInterval(() => {
      setRedirectLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          navigate("lobby");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [examDone, result]); // eslint-disable-line

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
    const MAX = 3; violationsRef.current += 1; const v = violationsRef.current;
    setViolations(v);
    setViolMsg(v < MAX ? `Security alert: ${reason} · ${v}/${MAX} warnings` : "Maximum violations reached. Exam is being submitted.");
    setShowViolBanner(true);
    clearTimeout(violTimerRef.current);
    violTimerRef.current = setTimeout(() => setShowViolBanner(false), 5000);
    if (v >= MAX) doSubmit();
  }, []); // eslint-disable-line

  const doSubmit = useCallback(() => {
    if (examDoneRef.current) return;
    examDoneRef.current = true; setExamDone(true);
    setAnswers(prev => {
      let correct = 0;
      QUESTIONS.forEach((q, i) => { if (prev[i] === q.ans) correct++; });
      const score = Math.round((correct / QUESTIONS.length) * 100);
      setResult({ score, correct, passed: score >= CUTOFF });
      return prev;
    });
  }, []); // eslint-disable-line

  const selectOpt     = (i) => { if (!confirmed) setSelected(i); };
  const confirmAnswer = () => {
    if (selected === null) { setShakeOpts(true); setTimeout(() => setShakeOpts(false), 500); return; }
    setAnswers(prev => { const n = [...prev]; n[current] = selected; return n; });
    setConfirmed(true);
  };
  const nextQ = () => { if (current + 1 < QUESTIONS.length) setCurrent(c => c + 1); else doSubmit(); };

  const q           = QUESTIONS[current];
  const pct         = secsLeft / TOTAL_SECS;
  const timerCls    = `na-timer${pct <= 0.1 ? " danger" : pct <= 0.25 ? " warning" : ""}`;
  const mm          = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss          = String(secsLeft % 60).padStart(2, "0");
  const answered    = answers.filter(a => a !== null).length;
  const remaining   = QUESTIONS.length - answered;
  const progressPct = Math.round(((current + 1) / QUESTIONS.length) * 100);
  const redirectPct = (redirectLeft / REDIRECT_SECS) * 100;

  return (
    <>
      <div className="na-watermark" style={{ backgroundImage: wmBg, backgroundRepeat: "repeat", backgroundSize: "420px 240px" }} />

      <div className="na-layout">
        <header className="na-topbar">
          <div className="na-brand">
            <div className="na-brand-icon"><IconBrain /></div>
            <div>
              <div className="na-brand-name">NeuroAssess</div>
              <div className="na-brand-sub">ASSESSMENT PLATFORM</div>
            </div>
          </div>
          <div className="na-topbar-div" />
          <div className="na-exam-info">
            <div className="na-exam-title">Computer Science · Round 1</div>
            <div className="na-exam-meta">MCQ · {QUESTIONS.length} Questions · 5 min</div>
          </div>
          {violations > 0 && (
            <div className="na-viol-badge">
              <IconWarn />
              <span className="na-viol-label">{violations} Warning{violations > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="na-spacer" />
          <div className="na-proctor-pill">
            <div className="na-proctor-dot" />
            <span className="na-proctor-label">PROCTORED</span>
          </div>
          <div className={timerCls}>
            <div className="na-timer-dot" />
            <span className="na-timer-val">{mm}:{ss}</span>
          </div>
        </header>

        <main className="na-main">
          <div className="na-exam-progress">
            <div className="na-exam-progress-bar">
              <div className="na-exam-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="na-exam-progress-label">{current + 1} / {QUESTIONS.length}</span>
          </div>

          <div className="na-qcard" key={cardKey}>
            <div className="na-qnum-row">
              <span className="na-qnum-badge">Q{String(current + 1).padStart(2, "0")}</span>
              <span className="na-qnum-of">{QUESTIONS.length - current - 1} remaining after this</span>
            </div>
            <div className="na-qtext">{q.q}</div>

            <div className={`na-options${shakeOpts ? " na-shake" : ""}`}>
              {q.opts.map((opt, i) => {
                let cls = "na-opt";
                if (confirmed) {
                  cls += " locked";
                  if (i === selected) cls += " selected";
                } else if (i === selected) {
                  cls += " selected";
                }
                return (
                  <button key={i} className={cls} onClick={() => selectOpt(i)}>
                    <span className="na-opt-letter">{LETTERS[i]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {confirmed && (
              <div className="na-answered-notice">
                <IconCheck />
                <span className="na-answered-notice-text">
                  Response recorded. You can proceed to the next question.
                </span>
              </div>
            )}
          </div>

          {showViolBanner && (
            <div className="na-viol-banner show">
              <IconWarn />
              <p style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{violMsg}</p>
            </div>
          )}
        </main>

        <div className="na-action-bar">
          {!confirmed && (
            <button className="na-btn na-btn-primary" onClick={confirmAnswer} disabled={selected === null}
              style={{ opacity: selected === null ? 0.5 : 1 }}>
              Save &amp; Continue
            </button>
          )}
          {confirmed && (
            <button className="na-btn na-btn-next" onClick={nextQ}>
              {current + 1 < QUESTIONS.length ? "Next Question →" : "Submit Assessment"}
            </button>
          )}
        </div>

        <aside className="na-sidebar">
          <div className="na-webcam-section">
            <div className="na-section-label">Live Monitoring</div>
            <div className="na-webcam-box">
              <div className="na-webcam-inner">
                <div className="na-sil">
                  <div className="na-sil-head" />
                  <div className="na-sil-body" />
                </div>
                <div className="na-webcam-overlay">
                  <div className="na-webcam-rec" />
                  <span className="na-webcam-rec-label">LIVE</span>
                </div>
              </div>
            </div>
            <div className="na-webcam-status">
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="na-webcam-dot" />
                <span className="na-webcam-active">ACTIVE</span>
              </div>
              <span className="na-webcam-face">Face detected</span>
            </div>
          </div>

          <div className="na-stats-row">
            {[
              { val: answered,  lbl: "ANSWERED",  color: "var(--green)"  },
              { val: remaining, lbl: "REMAINING", color: "var(--accent)" },
            ].map(({ val, lbl, color }) => (
              <div className="na-stat-card" key={lbl}>
                <div className="na-stat-val" style={{ color }}>{val}</div>
                <div className="na-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="na-nav-section">
            <div className="na-section-label">Questions</div>
            <div className="na-nav-grid">
              {QUESTIONS.map((_, i) => {
                let cls = "na-nav-dot";
                if      (i === current)       cls += " current";
                else if (answers[i] !== null) cls += " answered";
                return (
                  <div key={i} className={cls} style={{ cursor: "default" }}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
            <div className="na-legend">
              {[
                { color: "var(--accent)",   border: "none",                          label: "Active"  },
                { color: "#e8f5e9",         border: "1px solid rgba(22,163,74,0.3)", label: "Done"    },
                { color: "var(--surface2)", border: "1px solid var(--border)",       label: "Pending" },
              ].map(({ color, border, label }) => (
                <div className="na-legend-item" key={label}>
                  <div className="na-legend-dot" style={{ background: color, border }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {examDone && result && (
        <div className="na-result-overlay show">
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, overflow: "hidden", maxWidth: 460, width: "100%",
            boxShadow: "var(--shadow-lg)", animation: "na-fadeUp 0.5s cubic-bezier(.22,1,.36,1)"
          }}>
            <div style={{
              height: 5,
              background: result.passed
                ? "linear-gradient(90deg, #16a34a, #4ade80)"
                : "linear-gradient(90deg, #dc2626, #f87171)"
            }} />
            <div style={{ padding: "40px 36px", textAlign: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
                background: result.passed ? "#f0fdf4" : "#fef2f2",
                border: `2px solid ${result.passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                color: result.passed ? "var(--green)" : "var(--red)"
              }}>
                {result.passed ? <IconSuccess /> : <IconX />}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                color: result.passed ? "var(--green)" : "var(--red)",
                fontFamily: "'JetBrains Mono', monospace", marginBottom: 10
              }}>
                {result.passed ? "SECTION COMPLETE" : "ASSESSMENT ENDED"}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, marginBottom: 10 }}>
                {result.passed ? "Round 1 Submitted" : "Sorry, Better Luck Next Time"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28 }}>
                {result.passed
                  ? "You have successfully completed Round 1. Your performance qualifies you for the SQL assessment."
                  : "You did not meet the qualification threshold for Round 2. Review your algorithms and data structures, then try again."}
              </p>

              <div style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "20px 24px", marginBottom: 24,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20
              }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>YOUR SCORE</div>
                  <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2, color: result.passed ? "var(--green)" : "var(--red)", lineHeight: 1 }}>
                    {result.score}<span style={{ fontSize: 18 }}>%</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{
                      height: "100%", borderRadius: 99, width: `${result.score}%`,
                      transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
                      background: result.passed ? "linear-gradient(90deg, var(--green), #4ade80)" : "linear-gradient(90deg, var(--red), #f87171)"
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {result.correct} / {QUESTIONS.length} correct
                  </div>
                </div>
              </div>

              {result.passed && (
                <div className="na-unlock-box">
                  <div style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }}><IconDB /></div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>SQL Round Unlocked</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                      Proceed to Round 2 — SQL &amp; Database
                    </div>
                    {/* ✅ FIXED: calls navigate("sql") → parent handles routing to SQLExamPage */}
                    <button className="na-unlock-btn" onClick={() => navigate("sql")}>
                      Round 2 →
                    </button>
                  </div>
                </div>
              )}

              {!result.passed && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, textAlign: "left" }}>
                    REDIRECTING TO DASHBOARD IN {redirectLeft}s
                  </div>
                  <div className="na-redirect-bar">
                    <div className="na-redirect-fill" style={{ width: `${redirectPct}%` }} />
                  </div>
                </div>
              )}

              {!result.passed && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => navigate("lobby")}
                    style={{ flex: 1, padding: 13, borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface2)", color: "var(--text)", fontSize: 14, fontWeight: 600, fontFamily: "'Inter',sans-serif", cursor: "pointer" }}
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}