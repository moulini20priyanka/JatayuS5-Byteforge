// UniversityExamPage.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#f4f6fb; --surface:#fff; --surface2:#f8f9fd;
  --border:#e4e8f0;
  --accent:#2563eb; --accent-s:#eff4ff; --accent-m:rgba(37,99,235,0.12);
  --green:#16a34a; --green-s:#f0fdf4;
  --red:#dc2626; --red-s:#fef2f2;
  --amber:#d97706; --amber-s:#fffbeb;
  --purple:#7c3aed; --purple-s:#f5f3ff;
  --teal:#0d9488;
  --text:#0f172a; --text2:#334155; --muted:#64748b; --dim:#94a3b8;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:0 4px 16px rgba(0,0,0,0.07);
}
html,body{height:100%;font-family:'Inter','Segoe UI',sans-serif;background:var(--bg);color:var(--text);}
.ue-wrap{display:grid;grid-template-rows:60px 52px 1fr;grid-template-columns:1fr 272px;height:100vh;overflow:hidden;}
.ue-topbar{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:14px;z-index:50;box-shadow:var(--shadow-sm);}
.ue-tabrow{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:stretch;padding:0 20px;gap:2px;z-index:40;}
.ue-main{grid-column:1;grid-row:3;overflow-y:auto;padding:28px 36px 110px;background:var(--bg);}
.ue-sidebar{grid-column:2;grid-row:3;background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.ue-brand-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2563eb,#4f46e5);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,0.28);}
.ue-spacer{flex:1;}
.ue-proctor{display:flex;align-items:center;gap:6px;background:var(--green-s);border:1px solid rgba(22,163,74,0.18);border-radius:100px;padding:5px 12px;}
.ue-proctor-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ue-pulse 2s ease infinite;}
.ue-timer{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1.5px solid var(--border);border-radius:100px;padding:6px 16px;transition:all .4s;}
.ue-timer.warn{background:var(--amber-s);border-color:rgba(217,119,6,.3);}
.ue-timer.danger{background:var(--red-s);border-color:rgba(220,38,38,.3);animation:ue-timerpulse 1s ease infinite;}
.ue-timer-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ue-ping 2s ease infinite;transition:background .4s;}
.ue-timer.warn .ue-timer-dot{background:var(--amber);}
.ue-timer.danger .ue-timer-dot{background:var(--red);}
.ue-timer-val{font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:var(--green);letter-spacing:2.5px;transition:color .4s;}
.ue-timer.warn .ue-timer-val{color:var(--amber);}
.ue-timer.danger .ue-timer-val{color:var(--red);}
.ue-tab-btn{display:flex;align-items:center;gap:7px;padding:0 20px;border:none;border-bottom:2.5px solid transparent;background:transparent;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap;}
.ue-tab-btn.active-mcq{color:var(--accent);border-bottom-color:var(--accent);}
.ue-tab-btn.active-writ{color:var(--purple);border-bottom-color:var(--purple);}
.ue-tab-btn.locked{cursor:not-allowed;opacity:.4;}
.ue-tab-badge{padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;background:var(--surface2);color:var(--muted);}
.ue-tab-btn.active-mcq .ue-tab-badge{background:var(--accent-s);color:var(--accent);}
.ue-tab-btn.active-writ .ue-tab-badge{background:var(--purple-s);color:var(--purple);}
.ue-progress{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.ue-pbar{flex:1;height:4px;background:var(--border);border-radius:99px;overflow:hidden;}
.ue-pfill-mcq{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#4f46e5);transition:width .5s;}
.ue-pfill-writ{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--purple),#9333ea);transition:width .5s;}
.ue-plbl{font-size:11px;font-weight:600;color:var(--muted);font-family:'Courier New',monospace;white-space:nowrap;}
.ue-qcard{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-md);animation:ue-fadeUp .3s cubic-bezier(.22,1,.36,1);}
.ue-qnum-row{padding:20px 28px 0;display:flex;align-items:center;justify-content:space-between;}
.ue-badge-mcq{background:var(--accent-s);border:1px solid var(--accent-m);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--accent);font-family:'Courier New',monospace;}
.ue-badge-writ{background:var(--purple-s);border:1px solid rgba(124,58,237,.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--purple);font-family:'Courier New',monospace;}
.ue-qnum-of{font-size:11px;color:var(--dim);font-family:'Courier New',monospace;}
.ue-marks{padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;background:var(--purple-s);color:var(--purple);}
.ue-qtext{padding:18px 28px 22px;font-size:17px;font-weight:600;color:var(--text);line-height:1.55;letter-spacing:-.2px;}
.ue-options{padding:0 24px 24px;display:flex;flex-direction:column;gap:8px;}
.ue-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:13px 16px;font-size:14px;color:var(--text2);font-family:'Inter',sans-serif;transition:all .15s;}
.ue-opt:hover:not(.locked){background:var(--accent-s);border-color:rgba(37,99,235,.3);color:var(--accent);}
.ue-opt.sel{background:var(--accent-s);border-color:rgba(37,99,235,.45);color:var(--accent);font-weight:500;box-shadow:0 0 0 3px rgba(37,99,235,.07);}
.ue-opt.locked{cursor:default;}
.ue-opt-letter{width:30px;height:30px;border-radius:7px;flex-shrink:0;background:#e8edf5;color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Courier New',monospace;transition:all .15s;}
.ue-opt.sel .ue-opt-letter{background:var(--accent);color:#fff;}
.ue-saved-notice{margin:0 24px 20px;background:#f0f4ff;border:1px solid rgba(37,99,235,.15);border-radius:10px;padding:11px 14px;display:flex;align-items:center;gap:9px;}
.ue-textarea{width:100%;padding:16px;font-size:14px;border:1.5px solid var(--border);border-radius:10px;outline:none;resize:vertical;font-family:'Inter','Segoe UI',sans-serif;color:var(--text);line-height:1.7;background:var(--surface);transition:border-color .15s;}
.ue-textarea:focus{border-color:rgba(124,58,237,.5);box-shadow:0 0 0 3px rgba(124,58,237,.07);}
.ue-textarea.filled{border-color:rgba(124,58,237,.4);}
.ue-mcq-done{margin-bottom:20px;background:var(--green-s);border:1.5px solid rgba(22,163,74,.25);border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:14px;animation:ue-fadeUp .4s ease;}
.ue-lockwall{display:flex;align-items:flex-start;gap:12px;padding:20px 22px;background:var(--amber-s);border:1.5px solid rgba(217,119,6,.2);border-radius:12px;margin-bottom:20px;}
.ue-fallback-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:340px;gap:20px;animation:ue-fadeUp .3s ease;}
.ue-fallback-spinner{width:52px;height:52px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--accent);animation:ue-spin 0.85s linear infinite;}
.ue-fallback-card{max-width:480px;width:100%;border-radius:14px;padding:24px 28px;}
.ue-fallback-card.loading{background:var(--accent-s);border:1.5px solid var(--accent-m);text-align:center;}
.ue-fallback-card.error{background:var(--red-s);border:1.5px solid rgba(220,38,38,.2);text-align:left;}
.ue-action-bar{position:fixed;bottom:0;left:0;right:273px;background:rgba(244,246,251,.96);backdrop-filter:blur(14px);border-top:1px solid var(--border);padding:14px 36px;display:flex;gap:10px;align-items:center;z-index:50;}
.ue-btn{padding:11px 22px;border-radius:9px;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;border:none;transition:all .15s;}
.ue-btn-prev{padding:12px 20px;background:var(--surface);color:var(--muted);font-size:13px;border:1px solid var(--border);}
.ue-btn-prev:disabled{opacity:.4;cursor:not-allowed;}
.ue-btn-save{flex:1;padding:12px;background:var(--accent);color:#fff;font-size:14px;box-shadow:0 2px 10px rgba(37,99,235,.28);}
.ue-btn-save:hover{background:#1d4ed8;}
.ue-btn-save:disabled{background:#d1d5db;box-shadow:none;cursor:not-allowed;opacity:.6;}
.ue-btn-next{flex:1;padding:12px;background:#0f172a;color:#fff;font-size:14px;}
.ue-btn-next:hover{background:#1e293b;}
.ue-btn-sub{flex:1;padding:12px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-size:14px;}
.ue-btn-sub:disabled{opacity:.5;cursor:not-allowed;}
.ue-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px;border-bottom:1px solid var(--border);}
.ue-stat{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:10px;text-align:center;}
.ue-stat-val{font-size:20px;font-weight:700;line-height:1;}
.ue-stat-lbl{font-size:9px;color:var(--dim);font-family:'Courier New',monospace;letter-spacing:.5px;margin-top:4px;}
.ue-sb-sec{padding:14px;border-bottom:1px solid var(--border);}
.ue-sb-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);font-family:'Courier New',monospace;margin-bottom:10px;text-transform:uppercase;}
.ue-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
.ue-ndot{aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;font-family:'Courier New',monospace;border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);cursor:pointer;transition:all .12s;}
.ue-ndot.cur{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3);}
.ue-ndot.done{background:#e8f5e9;border-color:rgba(22,163,74,.3);color:var(--green);}
.ue-wdot{width:100%;padding:8px 10px;font-size:11px;border-radius:7px;display:flex;align-items:center;gap:8px;border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);font-weight:600;font-family:'Courier New',monospace;transition:all .12s;}
.ue-wdot.cur{background:var(--purple);border-color:var(--purple);color:#fff;}
.ue-wdot.done{background:var(--purple-s);border-color:rgba(124,58,237,.3);color:var(--purple);}
.ue-shake{animation:ue-shake .4s ease !important;}
@keyframes ue-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes ue-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
@keyframes ue-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ue-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
@keyframes ue-timerpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.2)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}}
@keyframes ue-spin{to{transform:rotate(360deg)}}
`;

const IcBrain  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/></svg>;
const IcCheck  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcCheckG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcLock   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcWarn   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

function FallbackMcqState({ state, error, onRetry }) {
  if (state === "error") {
    return (
      <div className="ue-fallback-wrap">
        <div className="ue-fallback-card error">
          <div style={{fontSize:14,fontWeight:700,color:"var(--red)",marginBottom:8}}>Could not load MCQ questions</div>
          <div style={{fontSize:12.5,color:"#991b1b",lineHeight:1.65,marginBottom:16}}>{error || "An error occurred fetching questions."}</div>
          <button onClick={onRetry} style={{padding:"9px 20px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Retry</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ue-fallback-wrap">
      <div className="ue-fallback-spinner"/>
      <div className="ue-fallback-card loading">
        <div style={{fontSize:13,fontWeight:700,color:"var(--accent)",marginBottom:6}}>Fetching your MCQ questions…</div>
        <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.65}}>Loading from server — please don't close this tab.</div>
      </div>
    </div>
  );
}

function SubmittedScreen({ examTitle, subject }) {
  return (
    <div style={{minHeight:"100vh",background:"#f4f6fb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",padding:24}}>
      <div style={{maxWidth:480,width:"100%",background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 12px 40px rgba(0,0,0,0.10)"}}>
        <div style={{height:5,background:"linear-gradient(90deg,#0d9488,#4f46e5)"}}/>
        <div style={{padding:"48px 40px",textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#f0fdf4",border:"2px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#16a34a",fontFamily:"'Courier New',monospace",marginBottom:10}}>SUBMITTED SUCCESSFULLY</div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:12}}>{examTitle || "Exam"} Complete</h2>
          {subject && <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>Subject: <strong style={{color:"#334155"}}>{subject}</strong></div>}
          <div style={{background:"#f8f9fd",border:"1px solid #e4e8f0",borderRadius:12,padding:"20px 24px",margin:"24px 0",textAlign:"left"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",fontFamily:"'Courier New',monospace",letterSpacing:1,marginBottom:12}}>WHAT HAPPENS NEXT</div>
            {[{icon:"📋",text:"Your MCQ answers have been recorded."},{icon:"✍️",text:"Written answers are pending faculty review."},{icon:"📊",text:"Results will be declared after evaluation."},{icon:"📧",text:"You will be notified when results are published."}].map(({icon,text},i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                <span style={{fontSize:13,color:"#475569",lineHeight:1.5}}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fffbeb",border:"1px solid rgba(217,119,6,0.2)",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#92400e",lineHeight:1.6,marginBottom:28,textAlign:"left"}}>
            <strong>Note:</strong> Scores are not displayed here. Results will be shared officially after evaluation.
          </div>
          <div style={{fontSize:11,color:"#94a3b8",fontFamily:"'Courier New',monospace",marginBottom:28}}>
            Submitted on {new Date().toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
          </div>
          <button onClick={()=>window.location.href="/student-university"} style={{width:"100%",padding:14,borderRadius:10,border:"none",background:"linear-gradient(135deg,#0d9488,#0f766e)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Back to My Exams
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UniversityExamPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (document.getElementById("ue-css")) return;
    const s = document.createElement("style");
    s.id = "ue-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  const raw        = location.state?.examData || {};
  const written    = Array.isArray(raw.written) ? raw.written : [];
  const hasWrit    = written.length > 0;
  const initialMcq = Array.isArray(raw.mcq) && raw.mcq.length > 0 ? raw.mcq : [];

  const [mcq,           setMcq]           = useState(initialMcq);
  const [mcqFetchState, setMcqFetchState] = useState(initialMcq.length > 0 ? "ok" : "idle");
  const [mcqFetchError, setMcqFetchError] = useState(null);

  const hasFetchedRef = useRef(false);

  const fetchFallbackMcq = useCallback(async () => {
    if (!raw.exam_id) {
      setMcqFetchError("Missing exam ID. Please go back and retry.");
      setMcqFetchState("error");
      return;
    }
    setMcqFetchState("loading");
    setMcqFetchError(null);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(
        `${API}/api/exams/university/${raw.exam_id}/fallback-mcq`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error(
          `Route not found (HTTP ${res.status}). ` +
          `Make sure universityExamRoutes.js is imported in your server.js ` +
          `and the server was restarted.`
        );
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      if (!Array.isArray(data.mcq) || data.mcq.length === 0) {
        throw new Error("No MCQ questions available for this exam. Contact your faculty.");
      }
      setMcq(data.mcq);
      setMcqFetchState("ok");
    } catch (err) {
      console.error("[FallbackMCQ]", err);
      setMcqFetchError(err.message);
      setMcqFetchState("error");
    }
  }, [raw.exam_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch exactly once on mount if MCQs are missing
  useEffect(() => {
    if (initialMcq.length === 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFallbackMcq();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!raw.exam_id) navigate("/student-university");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exam state ─────────────────────────────────────────────────────────────
  const [section,     setSection]     = useState("mcq");
  const [mcqIdx,      setMcqIdx]      = useState(0);
  const [writIdx,     setWritIdx]     = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [confirmed,   setConfirmed]   = useState({});
  const [mcqAnswers,  setMcqAnswers]  = useState({});
  const [writAnswers, setWritAnswers] = useState({});
  const [shakeOpts,   setShakeOpts]   = useState(false);
  const [cardKey,     setCardKey]     = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [showModal,   setShowModal]   = useState(false);

  const durationMins = raw.duration || 90;
  const totalSecs    = durationMins * 60;
  const [secsLeft, setSecsLeft] = useState(totalSecs);
  const timerRef  = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); submitRef.current?.(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = mcq[mcqIdx];
    if (!q) return;
    setSelected(mcqAnswers[q.id] || null);
    setCardKey(k => k + 1);
  }, [mcqIdx, mcq.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setShowModal(false);
    clearInterval(timerRef.current);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/exams/university/${raw.exam_id}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ mcq_answers: mcqAnswers, written_answers: writAnswers }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else if (!auto) alert(data.error || "Submission failed.");
      else setSubmitted(true);
    } catch {
      if (auto) setSubmitted(true); else alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, submitted, mcqAnswers, writAnswers, raw.exam_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { submitRef.current = handleSubmit; }, [handleSubmit]);

  if (submitted) return <SubmittedScreen examTitle={raw.title} subject={raw.subject}/>;

  const hasMcq          = mcq.length > 0;
  const allMcqDone      = hasMcq && mcq.every(q => confirmed[q.id]);
  const writtenUnlocked = allMcqDone;
  const mcqAnswered     = Object.keys(mcqAnswers).length;
  const writtenAnswered = Object.keys(writAnswers).filter(k => (writAnswers[k]||"").trim().length > 0).length;
  const mcqTotal        = mcq.length;
  const writtenTotal    = written.length;
  const totalAns        = mcqAnswered + writtenAnswered;
  const totalQ          = mcqTotal + writtenTotal;
  const pct   = secsLeft / totalSecs;
  const tcls  = `ue-timer${pct<=0.1?" danger":pct<=0.25?" warn":""}`;
  const mm    = String(Math.floor(secsLeft/60)).padStart(2,"0");
  const ss2   = String(secsLeft%60).padStart(2,"0");
  const isLoading = mcqFetchState==="loading"||mcqFetchState==="idle";

  const confirmMcq = () => {
    if (!selected) { setShakeOpts(true); setTimeout(()=>setShakeOpts(false),500); return; }
    const q = mcq[mcqIdx];
    setMcqAnswers(p=>({...p,[q.id]:selected}));
    setConfirmed(p=>({...p,[q.id]:true}));
  };
  const nextMcq = () => {
    if (mcqIdx+1<mcq.length) setMcqIdx(i=>i+1);
    else if (hasWrit&&writtenUnlocked) setSection("written");
  };
  const handleTabClick = tab => {
    if (tab==="written"&&!writtenUnlocked) return;
    setSection(tab);
  };
  const handleRetry = () => {
    hasFetchedRef.current = false;
    fetchFallbackMcq();
  };

  const curMcqQ        = mcq[mcqIdx];
  const curWritQ       = written[writIdx];
  const isMcqConfirmed = curMcqQ ? !!confirmed[curMcqQ.id] : false;
  const mcqPct  = mcqTotal    > 0 ? ((mcqIdx +1)/mcqTotal   )*100 : 0;
  const writPct = writtenTotal> 0 ? ((writIdx+1)/writtenTotal)*100 : 0;
  const mcqTabCls  = `ue-tab-btn${section==="mcq"    ?" active-mcq" :""}`;
  const writTabCls = `ue-tab-btn${section==="written"?" active-writ":""}${!writtenUnlocked?" locked":""}`;

  return (
    <>
      <div className="ue-wrap">

        {/* TOPBAR */}
        <header className="ue-topbar">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="ue-brand-icon"><IcBrain/></div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)",letterSpacing:-.3}}>NeuroAssess</div>
              <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Courier New',monospace",letterSpacing:.6}}>UNIVERSITY PORTAL</div>
            </div>
          </div>
          <div style={{width:1,height:26,background:"var(--border)"}}/>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>{raw.title||"University Examination"}</div>
            <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Courier New',monospace",marginTop:1}}>
              {raw.subject||""}{raw.subject?" · ":""}
              {isLoading?"Loading MCQ…":`${mcqTotal} MCQ`}
              {hasWrit?` + ${writtenTotal} Written`:""}
            </div>
          </div>
          <div className="ue-spacer"/>
          <div style={{fontSize:12,color:"var(--muted)",marginRight:4}}>
            <span style={{fontWeight:700,color:"var(--text)"}}>{totalAns}</span>/{totalQ||"—"} answered
          </div>
          <div className="ue-proctor">
            <div className="ue-proctor-dot"/>
            <span style={{fontSize:10,fontWeight:700,color:"var(--green)",fontFamily:"'Courier New',monospace",letterSpacing:.8}}>PROCTORED</span>
          </div>
          <div className={tcls}>
            <div className="ue-timer-dot"/>
            <span className="ue-timer-val">{mm}:{ss2}</span>
          </div>
        </header>

        {/* TAB BAR */}
        <div className="ue-tabrow">
          <button className={mcqTabCls} onClick={()=>handleTabClick("mcq")}>
            MCQ Section
            <span className="ue-tab-badge" style={{background:section==="mcq"?"var(--accent-s)":"#f1f5f9",color:section==="mcq"?"var(--accent)":"var(--dim)"}}>
              {isLoading?"…":mcqTotal}
            </span>
          </button>
          <button className={writTabCls} onClick={()=>handleTabClick("written")} title={!writtenUnlocked?"Complete all MCQs first":""}>
            Written Section
            <span className="ue-tab-badge" style={{background:section==="written"?"var(--purple-s)":"#f1f5f9",color:section==="written"?"var(--purple)":"var(--dim)"}}>
              {writtenTotal}
            </span>
            {!writtenUnlocked&&<IcLock/>}
          </button>
        </div>

        {/* MAIN */}
        <main className="ue-main">

          {section==="mcq" && (
            <>
              {(isLoading||mcqFetchState==="error") && (
                <FallbackMcqState state={isLoading?"loading":"error"} error={mcqFetchError} onRetry={handleRetry}/>
              )}
              {mcqFetchState==="ok" && hasMcq && (
                <>
                  <div className="ue-progress">
                    <div className="ue-pbar"><div className="ue-pfill-mcq" style={{width:`${mcqPct}%`}}/></div>
                    <span className="ue-plbl">{mcqIdx+1} / {mcqTotal}</span>
                  </div>
                  {allMcqDone && (
                    <div className="ue-mcq-done">
                      <div style={{color:"var(--green)",flexShrink:0,marginTop:2}}><IcCheckG/></div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"var(--green)",marginBottom:4}}>All MCQ questions answered!</div>
                        <div style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.6}}>{hasWrit?"You can now proceed to the Written section.":"You can review or submit the exam."}</div>
                        {hasWrit&&<button onClick={()=>setSection("written")} style={{marginTop:10,padding:"9px 20px",borderRadius:8,border:"none",background:"var(--green)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Go to Written Section →</button>}
                      </div>
                    </div>
                  )}
                  {curMcqQ && (
                    <div className={`ue-qcard${shakeOpts?" ue-shake":""}`} key={cardKey}>
                      <div className="ue-qnum-row">
                        <span className="ue-badge-mcq">Q{String(mcqIdx+1).padStart(2,"0")}</span>
                        <span className="ue-qnum-of">{mcqTotal-mcqIdx-1} remaining after this</span>
                      </div>
                      <div className="ue-qtext">{curMcqQ.text||curMcqQ.question_text||"Question text not available"}</div>
                      <div className="ue-options">
                        {(()=>{
                          const opts = Array.isArray(curMcqQ.options)&&curMcqQ.options.length>0
                            ? curMcqQ.options
                            : [
                                curMcqQ.option_a&&{key:"A",text:curMcqQ.option_a},
                                curMcqQ.option_b&&{key:"B",text:curMcqQ.option_b},
                                curMcqQ.option_c&&{key:"C",text:curMcqQ.option_c},
                                curMcqQ.option_d&&{key:"D",text:curMcqQ.option_d},
                              ].filter(Boolean);
                          return opts.map(opt=>{
                            const isSel=selected===opt.key;
                            let cls="ue-opt";
                            if(isMcqConfirmed){cls+=" locked";if(isSel)cls+=" sel";}else if(isSel)cls+=" sel";
                            return(
                              <button key={opt.key} className={cls} onClick={()=>{if(!isMcqConfirmed)setSelected(opt.key);}}>
                                <span className="ue-opt-letter">{opt.key}</span>
                                {opt.text}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      {isMcqConfirmed&&<div className="ue-saved-notice"><IcCheck/><span style={{fontSize:12.5,fontWeight:500,color:"var(--accent)"}}>Answer saved. Click Next to continue.</span></div>}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {section==="written" && (
            <>
              {!writtenUnlocked ? (
                <div className="ue-lockwall">
                  <div style={{color:"var(--amber)",flexShrink:0}}><IcWarn/></div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#92400e",marginBottom:4}}>Written section is locked</div>
                    <div style={{fontSize:12.5,color:"#92400e",lineHeight:1.6}}>Complete all {mcqTotal} MCQ questions first ({mcqAnswered}/{mcqTotal} done).</div>
                    <button onClick={()=>setSection("mcq")} style={{marginTop:10,padding:"8px 18px",borderRadius:8,border:"none",background:"var(--amber)",color:"#fff",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Back to MCQ</button>
                  </div>
                </div>
              ) : !hasWrit ? (
                <div style={{textAlign:"center",padding:60,color:"var(--muted)"}}>No written questions for this exam.</div>
              ) : curWritQ ? (
                <>
                  <div className="ue-progress">
                    <div className="ue-pbar"><div className="ue-pfill-writ" style={{width:`${writPct}%`}}/></div>
                    <span className="ue-plbl">{writIdx+1} / {writtenTotal}</span>
                  </div>
                  <div className="ue-qcard" key={`w-${writIdx}`}>
                    <div className="ue-qnum-row">
                      <span className="ue-badge-writ">W{String(writIdx+1).padStart(2,"0")}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span className="ue-marks">{curWritQ.marks||8} marks</span>
                        <span className="ue-qnum-of">{writtenTotal-writIdx-1} remaining</span>
                      </div>
                    </div>
                    <div className="ue-qtext">{curWritQ.text||curWritQ.question_text||"Question text not available"}</div>
                    <div style={{padding:"0 24px 24px"}}>
                      {(()=>{
                        const ans=writAnswers[curWritQ.id]||"";
                        const wc=ans.trim().split(/\s+/).filter(Boolean).length;
                        const hasVal=ans.trim().length>0;
                        return(
                          <>
                            <textarea className={`ue-textarea${hasVal?" filled":""}`} value={ans}
                              onChange={e=>setWritAnswers(p=>({...p,[curWritQ.id]:e.target.value}))}
                              placeholder="Type your answer here. Be clear and detailed." rows={11}/>
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                              <span style={{fontSize:11,color:"var(--muted)",fontFamily:"'Courier New',monospace"}}>{wc} words</span>
                              {hasVal&&<button onClick={()=>setWritAnswers(p=>({...p,[curWritQ.id]:""}))} style={{fontSize:11,color:"var(--muted)",background:"none",border:"none",cursor:"pointer"}}>Clear</button>}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </main>

        {/* ACTION BAR */}
        <div className="ue-action-bar">
          {section==="mcq" && (
            isLoading
              ? <div style={{flex:1,textAlign:"center",fontSize:13,color:"var(--accent)",fontWeight:600}}>Loading MCQ questions from server…</div>
              : mcqFetchState==="error"
              ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  <span style={{fontSize:13,color:"var(--red)",fontWeight:600}}>⚠ Failed to load MCQ</span>
                  <button onClick={handleRetry} style={{padding:"8px 16px",borderRadius:7,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Retry</button>
                </div>
              : hasMcq
              ? <>
                  <button className="ue-btn ue-btn-prev" disabled={mcqIdx===0} onClick={()=>setMcqIdx(i=>Math.max(0,i-1))}>← Prev</button>
                  {!isMcqConfirmed
                    ? <button className="ue-btn ue-btn-save" disabled={!selected} onClick={confirmMcq}>Save &amp; Continue</button>
                    : <button className="ue-btn ue-btn-next" onClick={nextMcq}>
                        {mcqIdx+1<mcqTotal?"Next Question →":(hasWrit&&writtenUnlocked)?"Go to Written →":"Review & Submit"}
                      </button>
                  }
                </>
              : null
          )}
          {section==="written"&&writtenUnlocked&&hasWrit&&(
            <>
              <button className="ue-btn ue-btn-prev" onClick={()=>{if(writIdx>0)setWritIdx(i=>i-1);else if(hasMcq)setSection("mcq");}}>← Prev</button>
              {writIdx<writtenTotal-1
                ?<button className="ue-btn ue-btn-next" onClick={()=>setWritIdx(i=>i+1)}>Next Question →</button>
                :<button className="ue-btn ue-btn-sub" disabled={submitting} onClick={()=>setShowModal(true)}>{submitting?"Submitting…":"Submit Exam ✓"}</button>
              }
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="ue-sidebar">
          <div className="ue-stats">
            <div className="ue-stat"><div className="ue-stat-val" style={{color:"var(--accent)"}}>{mcqAnswered}</div><div className="ue-stat-lbl">MCQ DONE</div></div>
            <div className="ue-stat"><div className="ue-stat-val" style={{color:"var(--purple)"}}>{writtenAnswered}</div><div className="ue-stat-lbl">WRITTEN DONE</div></div>
          </div>
          <div className="ue-sb-sec">
            <div className="ue-sb-lbl">MCQ Questions</div>
            {isLoading&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}><div style={{width:13,height:13,borderRadius:"50%",border:"2px solid var(--border)",borderTopColor:"var(--accent)",animation:"ue-spin 0.85s linear infinite",flexShrink:0}}/><span style={{fontSize:11,color:"var(--muted)",fontFamily:"monospace"}}>Fetching…</span></div>}
            {mcqFetchState==="error"&&<span style={{fontSize:11,color:"var(--red)",fontFamily:"monospace"}}>Failed to load</span>}
            {mcqFetchState==="ok"&&hasMcq&&(
              <div className="ue-nav-grid">
                {mcq.map((q,i)=>{
                  let cls="ue-ndot";
                  if(section==="mcq"&&i===mcqIdx)cls+=" cur";
                  else if(confirmed[q.id])cls+=" done";
                  return <div key={q.id} className={cls} onClick={()=>{setSection("mcq");setMcqIdx(i);}}>{i+1}</div>;
                })}
              </div>
            )}
          </div>
          {hasWrit&&(
            <div className="ue-sb-sec">
              <div className="ue-sb-lbl" style={{display:"flex",alignItems:"center",gap:5}}>Written Questions{!writtenUnlocked&&<span style={{color:"var(--amber)"}}><IcLock/></span>}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,opacity:writtenUnlocked?1:0.35}}>
                {written.map((q,i)=>{
                  const hasA=!!(writAnswers[q.id]?.trim());
                  const isCur=section==="written"&&i===writIdx;
                  let cls="ue-wdot";
                  if(isCur)cls+=" cur";else if(hasA)cls+=" done";
                  return(
                    <div key={q.id} className={cls} style={{cursor:writtenUnlocked?"pointer":"not-allowed"}}
                      onClick={()=>{if(!writtenUnlocked)return;setSection("written");setWritIdx(i);}}>
                      <span>W{i+1}</span><span style={{color:"var(--dim)",fontWeight:400}}>{q.marks||8}M</span>
                    </div>
                  );
                })}
              </div>
              {!writtenUnlocked&&<div style={{marginTop:8,fontSize:10,color:"var(--amber)",display:"flex",alignItems:"center",gap:4,fontFamily:"'Courier New',monospace"}}><IcLock/> Complete MCQs first</div>}
            </div>
          )}
          <div className="ue-sb-sec">
            <div className="ue-sb-lbl">Exam Info</div>
            {[{label:"Subject",value:raw.subject||"—"},{label:"Duration",value:`${durationMins} mins`},{label:"Max Marks",value:raw.total_marks!=null?String(raw.total_marks):"—"}].map(({label,value})=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,color:"var(--dim)",fontFamily:"'Courier New',monospace"}}>{label}</span>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text2)"}}>{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:16,padding:32,maxWidth:400,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Submit Exam?</div>
            <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.65,marginBottom:20}}>
              <strong style={{color:"var(--text)"}}>{mcqAnswered}/{mcqTotal}</strong> MCQ,{" "}
              <strong style={{color:"var(--text)"}}>{writtenAnswered}/{writtenTotal}</strong> written answered.
              {(totalQ-totalAns)>0&&<span style={{color:"var(--amber)"}}> {totalQ-totalAns} unanswered.</span>}
              {" "}Cannot be undone.
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:10,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--muted)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleSubmit(false)} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"linear-gradient(135deg,#0d9488,#0f766e)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit Now</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}