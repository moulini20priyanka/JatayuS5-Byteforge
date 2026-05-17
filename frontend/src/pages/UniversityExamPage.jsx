
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRestrictionAgent } from '../restrictionAgent/useRestrictionAgent';

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";


function stripKeywordsFromText(text = '') {
  return text.replace(/\s*keywords?\s*:[\s\S]*/i, '').trim();
}


function computeTotalMarks(mcqList, writtenList, rawExamData) {
  // Prefer explicit total_marks from exam data
  if (rawExamData?.total_marks && rawExamData.total_marks > 0) {
    return rawExamData.total_marks;
  }

  const mcqTotal     = mcqList.reduce((sum, q) => sum + (q.marks || 1), 0);
  const writtenTotal = writtenList.reduce((sum, q) => sum + (parseInt(q.marks) || 8), 0);
  return mcqTotal + writtenTotal;
}


const IconBrain = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.66A3 3 0 1 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.66A3 3 0 1 0 14.5 2Z"/>
  </svg>
);

const IconCheck = ({ color = "var(--accent)" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconDocument = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const IconSubmit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
    <path d="M4 12h16"/>
  </svg>
);

// ── CSS Styles ────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#f4f6fb; --surface:#fff; --surface2:#f8f9fd;
  --border:#e4e8f0;
  --accent:#2563eb; --accent-s:#eff4ff; --accent-m:rgba(37,99,235,0.12);
  --green:#16a34a; --green-s:#f0fdf4; --green-m:rgba(22,163,74,0.12);
  --red:#dc2626; --red-s:#fef2f2; --red-m:rgba(220,38,38,0.12);
  --amber:#d97706; --amber-s:#fffbeb; --amber-m:rgba(217,119,6,0.12);
  --purple:#7c3aed; --purple-s:#f5f3ff;
  --teal:#0d9488; --teal-s:#f0fdfa;
  --text:#0f172a; --text2:#334155; --muted:#64748b; --dim:#94a3b8;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:0 4px 16px rgba(0,0,0,0.07);
  --shadow-lg:0 12px 40px rgba(0,0,0,0.10);
}
html,body{height:100%;font-family:'Inter','Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;}
.ue-wrap{display:grid;grid-template-rows:60px 52px 1fr;grid-template-columns:1fr 272px;height:100vh;overflow:hidden;}
.ue-topbar{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:14px;z-index:50;box-shadow:var(--shadow-sm);}
.ue-tabrow{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:stretch;padding:0 20px;gap:2px;z-index:40;}
.ue-main{grid-column:1;grid-row:3;overflow-y:auto;padding:28px 36px 110px;background:var(--bg);}
.ue-sidebar{grid-column:2;grid-row:3;background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.ue-brand{display:flex;align-items:center;gap:10px;}
.ue-brand-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2563eb,#4f46e5);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,0.28);}
.ue-brand-title{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-0.3px;line-height:1.2;}
.ue-brand-sub{font-size:10px;color:var(--dim);font-family:'Courier New',monospace;letter-spacing:0.6px;text-transform:uppercase;}
.ue-spacer{flex:1;}
.ue-proctor{display:flex;align-items:center;gap:6px;background:var(--green-s);border:1px solid rgba(22,163,74,0.18);border-radius:100px;padding:5px 12px;}
.ue-proctor-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ue-pulse 2s ease infinite;}
.ue-timer{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1.5px solid var(--border);border-radius:100px;padding:6px 16px;transition:all .4s;}
.ue-timer.warn{background:var(--amber-s);border-color:rgba(217,119,6,.3);}
.ue-timer.danger{background:var(--red-s);border-color:rgba(220,38,38,.3);animation:ue-timerpulse 1s ease infinite;}
.ue-timer-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:ue-ping 2s ease infinite;transition:background .4s;}
.ue-timer.warn .ue-timer-dot{background:var(--amber);}
.ue-timer.danger .ue-timer-dot{background:var(--red);}
.ue-timer-val{font-family:'SF Mono','Courier New',monospace;font-size:15px;font-weight:700;color:var(--green);letter-spacing:2.5px;transition:color .4s;}
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
.ue-plbl{font-size:11px;font-weight:600;color:var(--muted);font-family:'SF Mono','Courier New',monospace;white-space:nowrap;}
.ue-qcard{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-md);animation:ue-fadeUp .3s cubic-bezier(.22,1,.36,1);}
.ue-qnum-row{padding:20px 28px 0;display:flex;align-items:center;justify-content:space-between;}
.ue-badge-mcq{background:var(--accent-s);border:1px solid var(--accent-m);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--accent);font-family:'SF Mono','Courier New',monospace;}
.ue-badge-writ{background:var(--purple-s);border:1px solid rgba(124,58,237,.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--purple);font-family:'SF Mono','Courier New',monospace;}
.ue-qnum-of{font-size:11px;color:var(--dim);font-family:'SF Mono','Courier New',monospace;}
.ue-marks{padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;background:var(--purple-s);color:var(--purple);}
.ue-qtext{padding:18px 28px 22px;font-size:17px;font-weight:600;color:var(--text);line-height:1.55;letter-spacing:-0.2px;}
.ue-options{padding:0 24px 24px;display:flex;flex-direction:column;gap:8px;}
.ue-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:13px 16px;font-size:14px;color:var(--text2);font-family:'Inter',sans-serif;transition:all .15s;}
.ue-opt:hover:not(.locked){background:var(--accent-s);border-color:rgba(37,99,235,.3);color:var(--accent);}
.ue-opt.sel{background:var(--accent-s);border-color:rgba(37,99,235,.45);color:var(--accent);font-weight:500;box-shadow:0 0 0 3px rgba(37,99,235,.07);}
.ue-opt.locked{cursor:default;}
.ue-opt-letter{width:30px;height:30px;border-radius:7px;flex-shrink:0;background:#e8edf5;color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'SF Mono','Courier New',monospace;transition:all .15s;}
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
.ue-btn{padding:11px 22px;border-radius:9px;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
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
.ue-stat-lbl{font-size:9px;color:var(--dim);font-family:'SF Mono','Courier New',monospace;letter-spacing:0.5px;margin-top:4px;text-transform:uppercase;}
.ue-sb-sec{padding:14px;border-bottom:1px solid var(--border);}
.ue-sb-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--dim);font-family:'SF Mono','Courier New',monospace;margin-bottom:10px;text-transform:uppercase;}
.ue-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
.ue-ndot{aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;font-family:'SF Mono','Courier New',monospace;border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);cursor:pointer;transition:all .12s;}
.ue-ndot.cur{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3);}
.ue-ndot.done{background:#e8f5e9;border-color:rgba(22,163,74,.3);color:var(--green);}
.ue-wdot{width:100%;padding:8px 10px;font-size:11px;border-radius:7px;display:flex;align-items:center;gap:8px;border:1.5px solid var(--border);background:var(--surface2);color:var(--dim);font-weight:600;font-family:'SF Mono','Courier New',monospace;transition:all .12s;}
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

// ── Fallback Component for MCQ Loading ───────────────────────────────────
function FallbackMcqState({ state, error, onRetry }) {
  if (state === "error") {
    return (
      <div className="ue-fallback-wrap">
        <div className="ue-fallback-card error">
          <div style={{fontSize:14,fontWeight:700,color:"var(--red)",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
            <IconWarning/> Could not load questions
          </div>
          <div style={{fontSize:12.5,color:"#991b1b",lineHeight:1.65,marginBottom:16}}>{error || "An error occurred while fetching exam questions."}</div>
          <button onClick={onRetry} style={{padding:"9px 20px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
            <IconCheck color="#fff"/> Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="ue-fallback-wrap">
      <div className="ue-fallback-spinner"/>
      <div className="ue-fallback-card loading">
        <div style={{fontSize:13,fontWeight:700,color:"var(--accent)",marginBottom:6}}>Loading questions…</div>
        <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.65}}>Please wait while we fetch your exam. Do not close this tab.</div>
      </div>
    </div>
  );
}

// ── Professional Success Screen ──────────────────────────────────────────
function SubmittedScreen({ examName }) {
  return (
    <div style={{minHeight:"100vh",background:"#f4f6fb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{maxWidth:520,width:"100%",background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"var(--shadow-lg)"}}>
        <div style={{height:5,background:"linear-gradient(90deg,#0d9488,#4f46e5)"}}/>
        <div style={{padding:"48px 40px",textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#f0fdf4",border:"2px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
            <IconCheckCircle/>
          </div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#16a34a",fontFamily:"'SF Mono','Courier New',monospace",marginBottom:10,textTransform:"uppercase"}}>Submission Confirmed</div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:8}}>{examName || "Examination"}</h2>
          <p style={{fontSize:14,color:"#64748b",marginBottom:24}}>Your responses have been securely recorded.</p>

          <div style={{background:"#f8f9fd",border:"1px solid #e4e8f0",borderRadius:12,padding:"20px 24px",margin:"24px 0",textAlign:"left"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",fontFamily:"'SF Mono','Courier New',monospace",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>Next Steps</div>
            {[
              { icon: <IconDocument/>, text: "MCQ answers have been automatically scored." },
              { icon: <IconDocument/>, text: "Written responses are pending faculty evaluation." },
              { icon: <IconClock/>,    text: "Results will be published within 5–7 business days." },
              { icon: <IconDocument/>, text: "You will receive an email notification upon completion." }
            ].map(({icon,text},i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
                <span style={{color:"var(--accent)",flexShrink:0,marginTop:2}}>{icon}</span>
                <span style={{fontSize:13,color:"#475569",lineHeight:1.5}}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{fontSize:11,color:"#94a3b8",fontFamily:"'SF Mono','Courier New',monospace",marginBottom:28}}>
            Submitted: {new Date().toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
          </div>

          <button
            onClick={()=>window.location.href="/student-dashboard"}
            style={{width:"100%",padding:14,borderRadius:10,border:"none",background:"linear-gradient(135deg,#0d9488,#0f766e)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          >
            <IconArrowLeft/> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Inline Exam Watermark ─────────────────────────────────────────────────
// Diagonal tiled background: Student name + NeuroAssess branding
// Moderate opacity — visible enough to deter screenshot sharing
function ExamWatermark({ studentName = "Student", rollNo = "" }) {
  const tile = useMemo(() => {
    const brandLine = "NeuroAssess · University Portal";
    const studentLine = studentName + (rollNo ? "  |  " + rollNo : "");
    const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="200">',
      '<g transform="rotate(-28 220 100)" fill="#1e3a8a" font-family=\'SF Mono,Courier New,monospace\' text-anchor="middle">',
      '<text x="220" y="88" font-size="13.5" font-weight="700" opacity="1">' + esc(studentLine) + '</text>',
      '<text x="220" y="110" font-size="11" font-weight="600" opacity="0.7">' + esc(brandLine) + '</text>',
      '</g>',
      '</svg>'
    ].join('');
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }, [studentName, rollNo]);

  return (
    <div
      aria-hidden="true"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9990,
        pointerEvents:   "none",
        userSelect:      "none",
        WebkitUserSelect:"none",
        backgroundImage: `url("${tile}")`,
        backgroundRepeat:"repeat",
        backgroundSize:  "440px 200px",
        opacity:         0.11,
      }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function UniversityExamPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (document.getElementById("ue-css")) return;
    const s = document.createElement("style");
    s.id = "ue-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  const raw = location.state?.examData || {};
  const examName = raw.title || "University Examination";

  // Student info for watermark - read from location state or JWT
  const studentInfo = useMemo(() => {
    if (raw.student_name || raw.student_id || raw.roll_no) {
      return { name: raw.student_name || "Student", rollNo: raw.roll_no || raw.student_id || "" };
    }
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return { name: payload.name || payload.username || "Student", rollNo: payload.roll_no || String(payload.id || "") };
      }
    } catch (e) {}
    return { name: "Student", rollNo: "" };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Strip keywords from written questions before displaying to student
  const written = (Array.isArray(raw.written) ? raw.written : []).map(q => ({
    ...q,
    text: stripKeywordsFromText(q.text || q.question_text || ''),
    _rawText: q.text || q.question_text || '', // keep original for keyword extraction if needed
  }));
  const hasWrit    = written.length > 0;
  const initialMcq = (Array.isArray(raw.mcq) && raw.mcq.length > 0 ? raw.mcq : []).map(q => ({
    ...q,
    text: stripKeywordsFromText(q.text || q.question_text || ''),
  }));

  const [mcq,           setMcq]           = useState(initialMcq);
  const [mcqFetchState, setMcqFetchState] = useState(initialMcq.length > 0 ? "ok" : "idle");
  const [mcqFetchError, setMcqFetchError] = useState(null);
  const hasFetchedRef = useRef(false);

  const fetchFallbackMcq = useCallback(async () => {
    if (!raw.exam_id) {
      setMcqFetchError("Exam identifier not found. Please restart the exam.");
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
        throw new Error(`Server configuration error (HTTP ${res.status}). Please contact support.`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      if (!Array.isArray(data.mcq) || data.mcq.length === 0) {
        throw new Error("No questions available for this examination.");
      }
      // Strip keywords from fetched MCQ text too (safety net)
      const cleaned = data.mcq.map(q => ({
        ...q,
        text: stripKeywordsFromText(q.text || ''),
      }));
      setMcq(cleaned);
      setMcqFetchState("ok");
    } catch (err) {
      console.error("[FallbackMCQ]", err);
      setMcqFetchError(err.message);
      setMcqFetchState("error");
    }
  }, [raw.exam_id]);

  useEffect(() => {
    if (initialMcq.length === 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFallbackMcq();
    }
  }, []);

  useEffect(() => {
    if (!raw.exam_id) navigate("/student-university");
  }, [navigate, raw.exam_id]);

  // ── Exam State ────────────────────────────────────────────────────────
  const [section,    setSection]    = useState("mcq");
  const [mcqIdx,     setMcqIdx]     = useState(0);
  const [writIdx,    setWritIdx]    = useState(0);
  const [selected,   setSelected]   = useState(null);
  const [confirmed,  setConfirmed]  = useState({});
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writAnswers,setWritAnswers]= useState({});
  const [shakeOpts,  setShakeOpts]  = useState(false);
  const [cardKey,    setCardKey]    = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  const durationMins = raw.duration || 90;
  const totalSecs    = durationMins * 60;
  const [secsLeft,   setSecsLeft]   = useState(totalSecs);
  const timerRef  = useRef(null);
  const submitRef = useRef(null);

  // Dynamic total marks — computed from actual paper, not hardcoded
  const totalMarks = computeTotalMarks(mcq, written, raw);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); submitRef.current?.(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const q = mcq[mcqIdx];
    if (!q) return;
    setSelected(mcqAnswers[q.id] || null);
    setCardKey(k => k + 1);
  }, [mcqIdx, mcq.length, mcqAnswers]);

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
      else if (!auto) alert(data.error || "Submission failed. Please try again.");
      else setSubmitted(true);
    } catch {
      if (!auto) alert("Network error. Please check your connection and retry.");
      else setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, submitted, mcqAnswers, writAnswers, raw.exam_id]);

  useEffect(() => { submitRef.current = handleSubmit; }, [handleSubmit]);

  // ── Restriction Agent ─────────────────────────────────────────────────
  // Must be called unconditionally inside the component (React hook rules)
  useRestrictionAgent({
    maxAttempts: 4,
    autoStart:   true,
    onViolation: (violation) => {
      console.warn('[Exam Violation]', violation);
    },
    onExamTerminated: () => {
      // Auto-submit when exam is terminated due to violations
      submitRef.current?.(true);
    },
  });

  if (submitted) return <SubmittedScreen examName={examName}/>;

  const hasMcq         = mcq.length > 0;
  const allMcqDone     = hasMcq && mcq.every(q => confirmed[q.id]);
  const writtenUnlocked= allMcqDone;
  const mcqAnswered    = Object.keys(mcqAnswers).length;
  const writtenAnswered= Object.keys(writAnswers).filter(k => (writAnswers[k]||"").trim().length > 0).length;
  const mcqTotal       = mcq.length;
  const writtenTotal   = written.length;
  const totalAns       = mcqAnswered + writtenAnswered;
  const totalQ         = mcqTotal + writtenTotal;

  const pct  = secsLeft / totalSecs;
  const tcls = `ue-timer${pct<=0.1?" danger":pct<=0.25?" warn":""}`;
  const mm   = String(Math.floor(secsLeft/60)).padStart(2,"0");
  const ss2  = String(secsLeft%60).padStart(2,"0");
  const isLoading = mcqFetchState==="loading" || mcqFetchState==="idle";

  const confirmMcq = () => {
    if (!selected) { setShakeOpts(true); setTimeout(()=>setShakeOpts(false),500); return; }
    const q = mcq[mcqIdx];
    setMcqAnswers(p=>({...p,[q.id]:selected}));
    setConfirmed(p=>({...p,[q.id]:true}));
  };

  const nextMcq = () => {
    if (mcqIdx+1 < mcq.length) setMcqIdx(i=>i+1);
    else if (hasWrit && writtenUnlocked) setSection("written");
  };

  const handleTabClick = tab => {
    if (tab==="written" && !writtenUnlocked) return;
    setSection(tab);
  };

  const handleRetry = () => {
    hasFetchedRef.current = false;
    fetchFallbackMcq();
  };

  const curMcqQ      = mcq[mcqIdx];
  const curWritQ     = written[writIdx];
  const isMcqConfirmed = curMcqQ ? !!confirmed[curMcqQ.id] : false;
  const mcqPct       = mcqTotal > 0 ? ((mcqIdx+1)/mcqTotal)*100 : 0;
  const writPct      = writtenTotal > 0 ? ((writIdx+1)/writtenTotal)*100 : 0;
  const mcqTabCls    = `ue-tab-btn${section==="mcq" ?" active-mcq":""}`;
  const writTabCls   = `ue-tab-btn${section==="written"?" active-writ":""}${!writtenUnlocked?" locked":""}`;

  return (
    <>
      {/* ── Watermark: diagonal tiled background, student name + NeuroAssess */}
      <ExamWatermark studentName={studentInfo.name} rollNo={studentInfo.rollNo} />

      <div className="ue-wrap">
        {/* TOPBAR */}
        <header className="ue-topbar">
          <div className="ue-brand">
            <div className="ue-brand-icon"><IconBrain/></div>
            <div>
              <div className="ue-brand-title">NeuroAssess</div>
              <div className="ue-brand-sub">University Portal</div>
            </div>
          </div>
          <div style={{width:1,height:26,background:"var(--border)"}}/>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>{examName}</div>
            <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'SF Mono','Courier New',monospace",marginTop:1}}>
              {isLoading ? "Loading questions…" : `${mcqTotal} Multiple Choice`}
              {hasWrit ? ` + ${writtenTotal} Written` : ""}
              {" · "}<span style={{fontWeight:700,color:"var(--purple)"}}>{totalMarks} Marks</span>
            </div>
          </div>
          <div className="ue-spacer"/>
          <div style={{fontSize:12,color:"var(--muted)",marginRight:4}}>
            <span style={{fontWeight:700,color:"var(--text)"}}>{totalAns}</span>/{totalQ||"—"} completed
          </div>
          <div className="ue-proctor">
            <div className="ue-proctor-dot"/>
            <span style={{fontSize:10,fontWeight:700,color:"var(--green)",fontFamily:"'SF Mono','Courier New',monospace",letterSpacing:0.8}}>PROCTORED</span>
          </div>
          <div className={tcls}>
            <div className="ue-timer-dot"/>
            <span className="ue-timer-val">{mm}:{ss2}</span>
          </div>
        </header>

        {/* TAB BAR */}
        <div className="ue-tabrow">
          <button className={mcqTabCls} onClick={()=>handleTabClick("mcq")}>
            Multiple Choice
            <span className="ue-tab-badge">{isLoading ? "…" : mcqTotal}</span>
          </button>
          <button className={writTabCls} onClick={()=>handleTabClick("written")} title={!writtenUnlocked?"Complete all MCQ questions first":""}>
            Written Responses
            <span className="ue-tab-badge">{writtenTotal}</span>
            {!writtenUnlocked && <IconLock/>}
          </button>
        </div>

        {/* MAIN CONTENT */}
        <main className="ue-main">
          {section==="mcq" && (
            <>
              {(isLoading || mcqFetchState==="error") && (
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
                      <div style={{color:"var(--green)",flexShrink:0,marginTop:2}}><IconCheckCircle/></div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"var(--green)",marginBottom:4}}>All questions completed</div>
                        <div style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.6}}>{hasWrit?"Proceed to the written section or review your answers.":"Review your responses and submit when ready."}</div>
                        {hasWrit && (
                          <button onClick={()=>setSection("written")} style={{marginTop:10,padding:"9px 20px",borderRadius:8,border:"none",background:"var(--green)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                            Continue to Written <IconArrowRight/>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {curMcqQ && (
                    <div className={`ue-qcard${shakeOpts?" ue-shake":""}`} key={cardKey}>
                      <div className="ue-qnum-row">
                        <span className="ue-badge-mcq">Q{String(mcqIdx+1).padStart(2,"0")}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span className="ue-marks">{curMcqQ.marks || 1} mark{(curMcqQ.marks || 1) > 1 ? "s" : ""}</span>
                          <span className="ue-qnum-of">{mcqTotal-mcqIdx-1} remaining</span>
                        </div>
                      </div>
                      <div className="ue-qtext">{curMcqQ.text || "Question content unavailable"}</div>
                      <div className="ue-options">
                        {(()=>{
                          const opts = Array.isArray(curMcqQ.options) && curMcqQ.options.length > 0
                            ? curMcqQ.options
                            : [
                                curMcqQ.option_a && {key:"A",text:curMcqQ.option_a},
                                curMcqQ.option_b && {key:"B",text:curMcqQ.option_b},
                                curMcqQ.option_c && {key:"C",text:curMcqQ.option_c},
                                curMcqQ.option_d && {key:"D",text:curMcqQ.option_d},
                              ].filter(Boolean);
                          return opts.map(opt => {
                            const isSel = selected === opt.key;
                            let cls = "ue-opt";
                            if (isMcqConfirmed) { cls += " locked"; if (isSel) cls += " sel"; }
                            else if (isSel) cls += " sel";
                            return (
                              <button key={opt.key} className={cls} onClick={()=>{ if(!isMcqConfirmed) setSelected(opt.key); }}>
                                <span className="ue-opt-letter">{opt.key}</span>
                                {opt.text}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      {isMcqConfirmed && (
                        <div className="ue-saved-notice">
                          <IconCheck/>
                          <span style={{fontSize:12.5,fontWeight:500,color:"var(--accent)"}}>Response saved. Continue to the next question.</span>
                        </div>
                      )}
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
                  <div style={{color:"var(--amber)",flexShrink:0}}><IconWarning/></div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#92400e",marginBottom:4}}>Section unavailable</div>
                    <div style={{fontSize:12.5,color:"#92400e",lineHeight:1.6}}>Complete all {mcqTotal} multiple choice questions first ({mcqAnswered}/{mcqTotal} completed).</div>
                    <button onClick={()=>setSection("mcq")} style={{marginTop:10,padding:"8px 18px",borderRadius:8,border:"none",background:"var(--amber)",color:"#fff",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Return to MCQ</button>
                  </div>
                </div>
              ) : !hasWrit ? (
                <div style={{textAlign:"center",padding:60,color:"var(--muted)"}}>No written questions assigned for this examination.</div>
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
                        <span className="ue-marks">{curWritQ.marks || 8} marks</span>
                        <span className="ue-qnum-of">{writtenTotal-writIdx-1} remaining</span>
                      </div>
                    </div>
                    {/* Only display clean question text — no keywords shown to student */}
                    <div className="ue-qtext">{curWritQ.text || "Question content unavailable"}</div>
                    <div style={{padding:"0 24px 24px"}}>
                      {(()=>{
                        const ans = writAnswers[curWritQ.id] || "";
                        const wc  = ans.trim().split(/\s+/).filter(Boolean).length;
                        const hasVal = ans.trim().length > 0;
                        return (
                          <>
                            <textarea
                              className={`ue-textarea${hasVal?" filled":""}`}
                              value={ans}
                              onChange={e=>setWritAnswers(p=>({...p,[curWritQ.id]:e.target.value}))}
                              placeholder="Provide a clear, well-structured response. Support your answer with relevant details."
                              rows={11}
                            />
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                              <span style={{fontSize:11,color:"var(--muted)",fontFamily:"'SF Mono','Courier New',monospace"}}>{wc} words</span>
                              {hasVal && (
                                <button
                                  onClick={()=>setWritAnswers(p=>({...p,[curWritQ.id]:""}))}
                                  style={{fontSize:11,color:"var(--muted)",background:"none",border:"none",cursor:"pointer"}}
                                >
                                  Clear
                                </button>
                              )}
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
              ? <div style={{flex:1,textAlign:"center",fontSize:13,color:"var(--accent)",fontWeight:600}}>Loading examination questions…</div>
              : mcqFetchState==="error"
              ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  <span style={{fontSize:13,color:"var(--red)",fontWeight:600}}>Unable to load questions</span>
                  <button onClick={handleRetry} style={{padding:"8px 16px",borderRadius:7,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Retry</button>
                </div>
              : hasMcq
              ? <>
                  <button className="ue-btn ue-btn-prev" disabled={mcqIdx===0} onClick={()=>setMcqIdx(i=>Math.max(0,i-1))}>
                    <IconArrowLeft/> Prev
                  </button>
                  {!isMcqConfirmed
                    ? <button className="ue-btn ue-btn-save" disabled={!selected} onClick={confirmMcq}>Save & Continue</button>
                    : <button className="ue-btn ue-btn-next" onClick={nextMcq}>
                        {mcqIdx+1 < mcqTotal
                          ? <><IconArrowRight/> Next</>
                          : (hasWrit && writtenUnlocked) ? "Written Section" : "Submit Exam"
                        }
                      </button>
                  }
                </>
              : null
          )}
          {section==="written" && writtenUnlocked && hasWrit && (
            <>
              <button className="ue-btn ue-btn-prev" onClick={()=>{ if(writIdx>0) setWritIdx(i=>i-1); else if(hasMcq) setSection("mcq"); }}>
                <IconArrowLeft/> Prev
              </button>
              {writIdx < writtenTotal-1
                ? <button className="ue-btn ue-btn-next" onClick={()=>setWritIdx(i=>i+1)}>Next <IconArrowRight/></button>
                : <button className="ue-btn ue-btn-sub" disabled={submitting} onClick={()=>setShowModal(true)}>
                    {submitting ? "Processing…" : <><IconSubmit/> Submit Examination</>}
                  </button>
              }
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="ue-sidebar">
          {/* Dynamic total marks display */}
          <div className="ue-stats">
            <div className="ue-stat">
              <div className="ue-stat-val" style={{color:"var(--accent)"}}>{mcqAnswered}</div>
              <div className="ue-stat-lbl">MCQ Done</div>
            </div>
            <div className="ue-stat">
              <div className="ue-stat-val" style={{color:"var(--purple)"}}>{writtenAnswered}</div>
              <div className="ue-stat-lbl">Written Done</div>
            </div>
          </div>

          {/* Total marks info */}
          <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--surface2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:"var(--dim)",fontFamily:"'SF Mono','Courier New',monospace",textTransform:"uppercase",letterSpacing:"0.5px"}}>Total Marks</span>
              <span style={{fontSize:16,fontWeight:700,color:"var(--purple)"}}>{totalMarks}</span>
            </div>
            {mcqTotal > 0 && (
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:10,color:"var(--dim)",fontFamily:"'SF Mono','Courier New',monospace"}}>MCQ ({mcqTotal}Q)</span>
                <span style={{fontSize:10,fontWeight:600,color:"var(--accent)"}}>{mcq.reduce((s,q)=>s+(q.marks||1),0)} marks</span>
              </div>
            )}
            {writtenTotal > 0 && (
              <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                <span style={{fontSize:10,color:"var(--dim)",fontFamily:"'SF Mono','Courier New',monospace"}}>Written ({writtenTotal}Q)</span>
                <span style={{fontSize:10,fontWeight:600,color:"var(--purple)"}}>{written.reduce((s,q)=>s+(parseInt(q.marks)||8),0)} marks</span>
              </div>
            )}
          </div>

          <div className="ue-sb-sec">
            <div className="ue-sb-lbl">Multiple Choice</div>
            {isLoading && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                <div style={{width:13,height:13,borderRadius:"50%",border:"2px solid var(--border)",borderTopColor:"var(--accent)",animation:"ue-spin 0.85s linear infinite",flexShrink:0}}/>
                <span style={{fontSize:11,color:"var(--muted)",fontFamily:"monospace"}}>Fetching…</span>
              </div>
            )}
            {mcqFetchState==="error" && <span style={{fontSize:11,color:"var(--red)",fontFamily:"monospace"}}>Load failed</span>}
            {mcqFetchState==="ok" && hasMcq && (
              <div className="ue-nav-grid">
                {mcq.map((q,i)=>{
                  let cls = "ue-ndot";
                  if (section==="mcq" && i===mcqIdx) cls += " cur";
                  else if (confirmed[q.id]) cls += " done";
                  return <div key={q.id} className={cls} onClick={()=>{setSection("mcq");setMcqIdx(i);}}>{i+1}</div>;
                })}
              </div>
            )}
          </div>

          {hasWrit && (
            <div className="ue-sb-sec">
              <div className="ue-sb-lbl" style={{display:"flex",alignItems:"center",gap:5}}>
                Written {!writtenUnlocked && <span style={{color:"var(--amber)"}}><IconLock/></span>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,opacity:writtenUnlocked?1:0.35}}>
                {written.map((q,i)=>{
                  const hasA  = !!(writAnswers[q.id]?.trim());
                  const isCur = section==="written" && i===writIdx;
                  let cls = "ue-wdot";
                  if (isCur) cls += " cur"; else if (hasA) cls += " done";
                  return (
                    <div
                      key={q.id}
                      className={cls}
                      style={{cursor:writtenUnlocked?"pointer":"not-allowed"}}
                      onClick={()=>{ if(!writtenUnlocked) return; setSection("written"); setWritIdx(i); }}
                    >
                      <span>W{i+1}</span>
                      <span style={{color:"var(--dim)",fontWeight:400}}>{q.marks||8}M</span>
                    </div>
                  );
                })}
              </div>
              {!writtenUnlocked && (
                <div style={{marginTop:8,fontSize:10,color:"var(--amber)",display:"flex",alignItems:"center",gap:4,fontFamily:"'SF Mono','Courier New',monospace"}}>
                  <IconLock/> Complete MCQ first
                </div>
              )}
            </div>
          )}

          <div className="ue-sb-sec">
            <div className="ue-sb-lbl">Examination</div>
            {[
              {label:"Title",    value:examName},
              {label:"Duration", value:`${durationMins} min`},
              {label:"Total",    value:`${totalMarks} marks`},
            ].map(({label,value})=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,color:"var(--dim)",fontFamily:"'SF Mono','Courier New',monospace"}}>{label}</span>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text2)"}}>{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* SUBMISSION MODAL */}
      {showModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:16,padding:32,maxWidth:400,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Confirm Submission</div>
            <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.65,marginBottom:20}}>
              <strong style={{color:"var(--text)"}}>{mcqAnswered}/{mcqTotal}</strong> MCQ,{" "}
              <strong style={{color:"var(--text)"}}>{writtenAnswered}/{writtenTotal}</strong> written responses completed.{" "}
              {(totalQ-totalAns) > 0 && <span style={{color:"var(--amber)"}}>{totalQ-totalAns} questions unanswered.</span>}
              {" "}This action cannot be reversed.
            </p>
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"var(--muted)"}}>Total Marks Available</span>
              <span style={{fontSize:14,fontWeight:700,color:"var(--purple)"}}>{totalMarks}</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:10,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--muted)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleSubmit(false)} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"linear-gradient(135deg,#0d9488,#0f766e)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IconSubmit/> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}