
import { useState, useEffect, useCallback, useRef } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const API_BASE = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api';


const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#c4b5fd',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box}
.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:32px 36px}
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px}
.ap-title{font-size:22px;font-weight:800;color:${C.navy};margin:0 0 4px;letter-spacing:-0.3px}
.ap-sub{font-size:13px;color:${C.inkSub};margin:0}
.ap-hdr-r{display:flex;align-items:center;gap:10px}
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-sec:disabled{opacity:.55;cursor:not-allowed}
.btn-ghost{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:${C.inkSub};border:1px solid ${C.border};border-radius:7px;font-size:12px;font-weight:500;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-ghost:hover{background:${C.hover};color:${C.inkMid}}
.btn-sm{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:7px;font-size:11.5px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .12s}
.btn-sm:hover{background:${C.hover}} .btn-sm:disabled{opacity:.5;cursor:not-allowed}
.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.red};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-danger:hover{background:#b91c1c;transform:translateY(-1px)} .btn-danger:disabled{opacity:.55;cursor:not-allowed;transform:none}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13.5px;font-weight:700;color:${C.navy}}
.card-meta{font-size:12px;color:${C.inkSub}}
.filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.search-wrap{position:relative;flex:1;min-width:200px}
.search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none}
.search-inp{width:100%;padding:9px 12px 9px 34px;border:1.5px solid ${C.border};border-radius:9px;font-size:13px;color:${C.ink};background:${C.surface};font-family:${C.font};outline:none;transition:border-color .15s}
.search-inp:focus{border-color:${C.blue}}
.filter-sel{padding:8px 11px;font-size:12px;border:1.5px solid ${C.border};border-radius:8px;color:${C.inkMid};background:${C.surface};font-family:${C.font};outline:none;cursor:pointer;transition:border-color .15s}
.filter-sel:focus{border-color:${C.blue}}
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:11px 16px;text-align:left;font-size:10.5px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl td{padding:13px 16px;vertical-align:middle}
.bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap}
.bdg-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.bdg-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.bdg-am{background:${C.amberBg};color:${C.amber};border-color:${C.amberBd}}
.bdg-rd{background:${C.redBg};color:${C.red};border-color:${C.redBd}}
.bdg-nt{background:${C.subtle};color:${C.inkSub};border-color:${C.border}}
.bdg-pu{background:${C.purpleBg};color:${C.purple};border-color:${C.purpleBd}}
.mono{font-family:${C.mono};font-size:12px}
.avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
.spin-sm{width:13px;height:13px;border:2px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;display:inline-block}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:52px;text-align:center;color:${C.inkMuted};font-size:13px}
.loading{padding:36px;text-align:center;color:${C.inkMuted};font-size:13px}
.toast{position:fixed;top:24px;right:24px;z-index:9999;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.12);animation:ap-si .25s ease}
@keyframes ap-si{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;animation:ap-fi .2s ease;backdrop-filter:blur(3px)}
@keyframes ap-fi{from{opacity:0}to{opacity:1}}
.modal-box{background:${C.surface};border-radius:16px;width:100%;max-width:640px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,31,61,.2);overflow:hidden;border:1px solid ${C.border}}
.modal-hdr{padding:18px 24px;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:12px;background:${C.subtle};flex-shrink:0}
.modal-body{flex:1;overflow-y:auto;padding:24px}
.modal-ico{width:38px;height:38px;border-radius:9px;background:${C.blueLt};border:1.5px solid ${C.blueBd};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.modal-title{font-size:15px;font-weight:700;color:${C.navy}}
.modal-sub{font-size:11px;color:${C.inkSub};margin-top:1px}
.modal-close{background:${C.hover};border:none;border-radius:7px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.fld{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.fld-lbl{font-size:11px;font-weight:700;color:${C.inkMid};text-transform:uppercase;letter-spacing:.5px}
.fld-inp{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;transition:all .15s;width:100%}
.fld-inp:focus{border-color:${C.blue};background:${C.surface}}
.fld-inp.err{border-color:${C.redBd};background:${C.redBg}}
.fld-sel{padding:9px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;color:${C.ink};background:${C.subtle};font-family:${C.font};outline:none;cursor:pointer;width:100%}
.fld-sel.err{border-color:${C.redBd}}
.fld-err{font-size:11px;color:${C.red};margin-top:3px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.ai-panel{border:1.5px solid ${C.border};border-radius:10px;overflow:hidden;margin-top:14px}
.ai-panel-hdr{display:flex;align-items:center;gap:10px;padding:11px 16px;background:${C.subtle};border-bottom:1.5px solid ${C.border};cursor:pointer;user-select:none}
.ai-panel-body{padding:16px}
.info-box{display:flex;align-items:center;gap:10px;background:${C.blueLt};border:1px solid ${C.blueBd};border-radius:9px;padding:10px 14px;margin-bottom:16px}
.risk-bar-wrap{display:flex;align-items:center;gap:10px;margin-top:8px}
.risk-track{flex:1;height:5px;background:${C.border};border-radius:99;overflow:hidden}
.risk-fill{height:100%;border-radius:99;transition:width .5s}
.step-bar{display:flex;align-items:center;margin-bottom:28px}
.step-circle{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.step-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;margin-top:5px}
.step-line{flex:1;height:2px;margin:0 10px;margin-bottom:18px;transition:background .2s}
.drop-zone{border:2px dashed ${C.border};border-radius:12px;padding:36px 24px;text-align:center;background:${C.subtle};cursor:pointer;transition:all .2s}
.drop-zone.drag{border-color:${C.blue};background:${C.blueLt}}
.drop-zone.has-file{border-color:${C.green};background:${C.greenBg}}
.flag-row{display:flex;gap:8px;align-items:flex-start;border-radius:7px;padding:7px 10px;margin-bottom:4px}
.validation-card{border:1.5px solid ${C.border};border-radius:9px;overflow:hidden;margin-bottom:6px}
.vc-hdr{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;user-select:none}
.vc-body{padding:10px 12px;border-top:1px solid ${C.border};background:${C.surface}}
.bulk-pills{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.bulk-pill{display:flex;flex-direction:column;align-items:center;padding:8px 14px;border:1.5px solid ${C.border};border-radius:9px;background:${C.surface};cursor:pointer;transition:all .15s}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
const initials  = (n="") => n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"??";
const avatarClr = (n="") => { const h=n.charCodeAt(0)*37%360; return{bg:`hsl(${h},35%,88%)`,fg:`hsl(${h},40%,28%)`}; };
const fmtDate   = (ts) => ts ? new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const vColor    = v=>({PASS:C.green,WARN:C.amber,BLOCK:C.red}[v]||C.inkMuted);
const vBg       = v=>({PASS:C.greenBg,WARN:C.amberBg,BLOCK:C.redBg}[v]||C.subtle);
const vBd       = v=>({PASS:C.greenBd,WARN:C.amberBd,BLOCK:C.redBd}[v]||C.border);
const vLabel    = v=>({PASS:"Pass",WARN:"Warning",BLOCK:"Blocked"}[v]||v||"—");
const sBg       = s=>({error:C.redBg,warning:C.amberBg,info:C.blueLt}[s]||C.subtle);
const sBd       = s=>({error:C.redBd,warning:C.amberBd,info:C.blueBd}[s]||C.border);
const sColor    = s=>({error:C.red,warning:C.amber,info:C.blue}[s]||C.inkMid);

const COLLEGES = ["RMKEC","RMDEC","RMKCET"];
const BRANCHES = ["CSE","IT","ECE","EEE","MECH","CIVIL","AIDS","AIML","CSD"];
const BATCHES  = ["2021","2022","2023","2024","2025","2026"];
const STATUSES = ["active","inactive","suspended"];
const EMPTY    = {name:"",email:"",college:"",branch:"",batch:"",cgpa:""};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const Ic = ({ d, size=14, color="currentColor", sw=1.8, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink:0, ...style }}>
    <path d={d}/>
  </svg>
);
const IC = {
  upload:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  shield:  "M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2zM9 12l2 2 4-4",
  key:     "M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3M7.5 21a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z",
  search:  "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  user:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  plus:    "M12 5v14M5 12h14",
  x:       "M18 6L6 18M6 6L18 18",
  check:   "M20 6L9 17L4 12",
  arrow:   "M5 12h14M12 5l7 7-7 7",
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function Toast({message,type}) {
  const ok=type!=="error";
  return (
    <div className="toast" style={{ background:ok?C.greenBg:C.redBg, border:`1px solid ${ok?C.greenBd:C.redBd}`, color:ok?C.green:C.red }}>
      <Ic d={ok?IC.check:IC.x} size={15} color={ok?C.green:C.red} sw={2.5}/> {message}
    </div>
  );
}

function SpinnerPage() {
  return (
    <div style={{ display:"flex",justifyContent:"center",padding:60 }}>
      <div className="spinner"/>
    </div>
  );
}

function RiskBar({score}) {
  const color=score>=60?C.red:score>=30?C.amber:C.green;
  const label=score>=60?"High":score>=30?"Medium":"Low";
  return (
    <div className="risk-bar-wrap">
      <div className="risk-track">
        <div className="risk-fill" style={{ width:`${score}%`, background:`linear-gradient(90deg,${C.green},${color})` }}/>
      </div>
      <span className="mono" style={{ fontWeight:700,color,minWidth:24 }}>{score}</span>
      <span className="bdg" style={{ fontSize:9,fontWeight:700,color,background:sBg(score>=60?"error":score>=30?"warning":"info"),border:`1px solid ${sBd(score>=60?"error":score>=30?"warning":"info")}`,padding:"1px 8px" }}>{label} Risk</span>
    </div>
  );
}

function FlagList({flags,title}) {
  if(!flags?.length) return null;
  return (
    <div style={{marginTop:10}}>
      <div style={{fontSize:9.5,fontWeight:700,color:C.inkMuted,textTransform:"uppercase",letterSpacing:.7,marginBottom:6}}>{title}</div>
      {flags.map((f,i)=>(
        <div key={i} className="flag-row" style={{background:sBg(f.severity),border:`1px solid ${sBd(f.severity)}`}}>
          <span style={{fontSize:11,fontWeight:600,color:sColor(f.severity),flex:1}}>{f.message}</span>
          <span className="mono" style={{fontSize:9,color:C.inkMuted}}>{f.code}</span>
        </div>
      ))}
    </div>
  );
}

function ValidationCard({r}) {
  const [open,setOpen]=useState(r.verdict!=="PASS");
  const allF=[...(r.issues||[]),...(r.warnings||[]),...(r.aiFlags||[])];
  return (
    <div className="validation-card" style={{borderColor:vBd(r.verdict)}}>
      <div className="vc-hdr" style={{background:vBg(r.verdict)}} onClick={()=>setOpen(o=>!o)}>
        <div style={{width:7,height:7,borderRadius:"50%",background:vColor(r.verdict),flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:C.ink}}>{r.name||r.email}</div>
          <div style={{fontSize:11,color:C.inkMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.email}</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span className="bdg" style={{fontSize:9.5,color:vColor(r.verdict),background:"#fff",border:`1px solid ${vBd(r.verdict)}`}}>{vLabel(r.verdict)}</span>
          {r.isDuplicate&&<span className="bdg bdg-pu" style={{fontSize:9}}>Dup</span>}
          {allF.length>0&&<span style={{fontSize:10,color:C.inkMuted}}>{allF.length} flag{allF.length!==1?"s":""}</span>}
        </div>
        <span style={{fontSize:10,color:C.inkMuted}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div className="vc-body">
          <RiskBar score={r.riskScore}/>
          {r.aiReason&&<div style={{marginTop:8,background:C.blueLt,border:`1px solid ${C.blueBd}`,borderRadius:7,padding:"7px 10px",fontSize:11,color:C.blue}}><strong>AI Analysis:</strong> {r.aiReason}</div>}
          {r.isDuplicate&&r.existingRecord&&<div style={{marginTop:6,background:C.purpleBg,border:`1px solid ${C.purpleBd}`,borderRadius:7,padding:"7px 10px",fontSize:11,color:C.purple}}>Duplicate of <strong>{r.existingRecord.name}</strong> (ID: {r.existingRecord.id})</div>}
          <FlagList flags={(r.issues||[]).filter(f=>f.severity==="error")} title="Errors — Blocking"/>
          <FlagList flags={[...(r.warnings||[]),...(r.aiFlags||[])]} title="Warnings"/>
        </div>
      )}
    </div>
  );
}

function BulkBar({summary,filter,onFilter}) {
  if(!summary)return null;
  const pills=[
    {k:"all",  l:"Total",   n:summary.total,      c:C.inkSub, bg:C.subtle,   b:C.border},
    {k:"PASS", l:"Pass",    n:summary.passed,     c:C.green,  bg:C.greenBg,  b:C.greenBd},
    {k:"WARN", l:"Warning", n:summary.warned,     c:C.amber,  bg:C.amberBg,  b:C.amberBd},
    {k:"BLOCK",l:"Blocked", n:summary.blocked,    c:C.red,    bg:C.redBg,    b:C.redBd},
    {k:"DUP",  l:"Dupes",   n:summary.duplicates, c:C.purple, bg:C.purpleBg, b:C.purpleBd},
  ];
  return (
    <div className="bulk-pills">
      {pills.map(p=>(
        <div key={p.k} className="bulk-pill"
          style={{borderColor:filter===p.k?p.c:p.b,background:filter===p.k?p.bg:C.surface}}
          onClick={()=>onFilter(p.k===filter?"all":p.k)}>
          <span style={{fontSize:17,fontWeight:800,color:p.c}}>{p.n}</span>
          <span style={{fontSize:9,fontWeight:700,color:p.c,textTransform:"uppercase",letterSpacing:.6}}>{p.l}</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Validation Panel ────────────────────────────────────────────────────────
function ValidationAgentPanel({mode="single",student=null,students=[],onResult=null,onBulkResult=null}) {
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState("");
  const [result,       setResult]      = useState(null);
  const [bulkResults,  setBulkResults] = useState(null);
  const [summary,      setSummary]     = useState(null);
  const [filter,       setFilter]      = useState("all");
  const [collapsed,    setCollapsed]   = useState(false);
  const tok=()=>localStorage.getItem("token")||localStorage.getItem("authToken")||"";

  const run=useCallback(async()=>{
    setLoading(true);setError("");setResult(null);setBulkResults(null);setSummary(null);
    try{
      if(mode==="single"){
        const res=await fetch(`${API_BASE}/api/candidates/validate/single`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${tok()}`},body:JSON.stringify(student)});
        const d=await res.json();if(!d.success){setError(d.message||"Validation failed");return;}
        setResult(d.validation);onResult?.(d.validation);
      }else{
        const res=await fetch(`${API_BASE}/api/candidates/validate/bulk`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${tok()}`},body:JSON.stringify({students})});
        const d=await res.json();if(!d.success){setError(d.message||"Bulk validation failed");return;}
        setBulkResults(d.results);setSummary(d.summary);onBulkResult?.(d.results,d.summary);
      }
    }catch(e){setError("Network error: "+e.message);}
    finally{setLoading(false);}
  },[mode,student,students,onResult,onBulkResult]);

  const canRun=mode==="single"?!!student?.email:students.length>0;
  const filtered=(bulkResults||[]).filter(r=>filter==="all"?true:filter==="DUP"?r.isDuplicate:r.verdict===filter);

  return (
    <div className="ai-panel">
      <div className="ai-panel-hdr" onClick={()=>setCollapsed(c=>!c)}>
        <div className="modal-ico" style={{width:28,height:28,borderRadius:7,flexShrink:0}}>
          <Ic d={IC.shield} size={13} color={C.blue}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy}}>AI Validation</div>
          <div style={{fontSize:10,color:C.inkSub,marginTop:1}}>Rules · Duplicate detection · Semantic analysis</div>
        </div>
        {result&&!loading&&<span className="bdg" style={{fontSize:9.5,color:vColor(result.verdict),background:vBg(result.verdict),border:`1px solid ${vBd(result.verdict)}`}}>{vLabel(result.verdict)}</span>}
        <span style={{fontSize:10,color:C.inkMuted}}>{collapsed?"▼":"▲"}</span>
      </div>
      {!collapsed&&(
        <div className="ai-panel-body">
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
            <div style={{flex:1,fontSize:12,color:C.inkMid,lineHeight:1.6}}>
              {mode==="single"?"Checks email format, disposable domains, DB duplicates, near-duplicate detection, and AI semantic analysis before saving."
                :`Validates all ${students.length} record(s) through rules, DB duplicates, near-dupe scan, and AI risk scoring.`}
            </div>
            <button className="btn-sec" style={{padding:"7px 14px",flexShrink:0}} onClick={run} disabled={loading||!canRun}>
              {loading?<><div className="spin-sm"/>&nbsp;Validating…</>:<><Ic d={IC.shield} size={12} color={C.inkMid}/>Run Validation</>}
            </button>
          </div>
          {loading&&(
            <div style={{padding:"16px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div className="spinner"/>
              <div style={{fontSize:12,fontWeight:600,color:C.navy}}>Running validation pipeline…</div>
              <div style={{fontSize:11,color:C.inkMuted}}>Rules → DB Duplicates → Near-Dups → AI Analysis → Risk Score</div>
            </div>
          )}
          {error&&!loading&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.red}}>{error}</div>}
          {!loading&&result&&mode==="single"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:vBg(result.verdict),border:`1.5px solid ${vBd(result.verdict)}`,borderRadius:9,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:vColor(result.verdict),flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:vColor(result.verdict)}}>
                    {result.verdict==="PASS"&&"Validation Passed — Safe to proceed"}
                    {result.verdict==="WARN"&&"Validation Warning — Review before saving"}
                    {result.verdict==="BLOCK"&&"Blocked — Fix issues before saving"}
                  </div>
                  {result.aiReason&&<div style={{fontSize:11,color:C.inkMid,marginTop:2}}>{result.aiReason}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:vColor(result.verdict)}}>{result.riskScore}</div>
                  <div style={{fontSize:9,color:C.inkMuted,textTransform:"uppercase"}}>Risk</div>
                </div>
              </div>
              <RiskBar score={result.riskScore}/>
              <FlagList flags={(result.issues||[]).filter(f=>f.severity==="error")} title="Errors (Blocking)"/>
              <FlagList flags={[...(result.warnings||[]),...(result.aiFlags||[])]} title="Warnings / AI Flags"/>
              {result.verdict==="PASS"&&<div style={{marginTop:10,background:C.greenBg,border:`1.5px solid ${C.greenBd}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.green}}>All validation layers passed — record is clean and safe to add.</div>}
            </div>
          )}
          {!loading&&bulkResults&&mode==="bulk"&&summary&&(
            <div>
              <div style={{background:summary.blocked>0?C.redBg:summary.warned>0?C.amberBg:C.greenBg,border:`1.5px solid ${summary.blocked>0?C.redBd:summary.warned>0?C.amberBd:C.greenBd}`,borderRadius:9,padding:"11px 14px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:summary.blocked>0?C.red:summary.warned>0?C.amber:C.green}}/>
                  <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{summary.canImport} of {summary.total} records safe to import</span>
                </div>
                {summary.blocked>0&&<div style={{fontSize:11,color:C.red}}>{summary.blocked} record{summary.blocked!==1?"s":""} will be blocked.{summary.duplicates>0?` ${summary.duplicates} duplicate${summary.duplicates!==1?"s":""} detected.`:""}</div>}
              </div>
              <BulkBar summary={summary} filter={filter} onFilter={setFilter}/>
              <div style={{maxHeight:320,overflowY:"auto",paddingRight:2}}>
                {filtered.slice(0,150).map(r=><ValidationCard key={r.index} r={r}/>)}
                {filtered.length>150&&<div style={{textAlign:"center",padding:10,fontSize:11,color:C.inkMuted}}>Showing 150/{filtered.length} — use filters.</div>}
                {!filtered.length&&<div style={{textAlign:"center",padding:24,color:C.inkMuted,fontSize:13}}>No records match this filter.</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Import Step Bar ────────────────────────────────────────────────────────────
function ImportStepBar({current}) {
  const steps=["Upload File","Map & Validate","Import"];
  return (
    <div className="step-bar">
      {steps.map((label,idx)=>{
        const n=idx+1,done=current>n,active=current===n;
        return (
          <div key={n} style={{display:"flex",alignItems:"center",flex:idx<steps.length-1?1:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
              <div className="step-circle" style={{background:done?C.green:active?C.blue:C.border,color:done||active?"#fff":C.inkMuted}}>
                {done?<Ic d={IC.check} size={13} color="#fff" sw={2.5}/>:n}
              </div>
              <span className="step-label" style={{color:active?C.blue:done?C.green:C.inkMuted}}>{label}</span>
            </div>
            {idx<steps.length-1&&<div className="step-line" style={{background:done?C.green:C.border}}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Import Wizard Modal ────────────────────────────────────────────────────────
function ImportWizardModal({apiFetch,onClose,onSuccess}) {
  const fileRef=useRef();
  const [step,setStep]=useState(1);
  const [file,setFile]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [parseLoading,setParseLoading]=useState(false);
  const [parseError,setParseError]=useState("");
  const [parseResult,setParseResult]=useState(null);
  const [mapping,setMapping]=useState({});
  const [validating,setValidating]=useState(false);
  const [validateError,setValidateError]=useState("");
  const [validationResult,setValidResult]=useState(null);
  const [dupHandling,setDupHandling]=useState("skip");
  const [sendEmails,setSendEmails]=useState(true);
  const [importing,setImporting]=useState(false);
  const [importProgress,setImportProgress]=useState({done:0,total:0});
  const [importResult,setImportResult]=useState(null);
  const [importError,setImportError]=useState("");
  const [aiSummary,setAiSummary]=useState(null);
  const tok=()=>localStorage.getItem("token")||localStorage.getItem("authToken")||"";
  const fmtSz=b=>b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;

  const handleParse=async()=>{
    if(!file)return;setParseLoading(true);setParseError("");
    try{
      const fd=new FormData();fd.append("file",file);
      const res=await fetch(`${API_BASE}/api/candidates/import/parse`,{method:"POST",headers:{Authorization:`Bearer ${tok()}`},body:fd});
      const d=await res.json();
      if(!d.success){setParseError(d.message||"Failed to parse file.");return;}
      setParseResult(d);setMapping(d.autoMapping||{});setValidResult(null);setAiSummary(null);setStep(2);
    }catch{setParseError("Network error while parsing.");}
    finally{setParseLoading(false);}
  };

  const handleValidate=async()=>{
    if(!parseResult?.sessionId)return;setValidating(true);setValidateError("");
    try{
      const res=await apiFetch("/api/candidates/import/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mapping,sessionId:parseResult.sessionId})});
      const d=await res.json();
      if(!d.success){setValidateError(d.message||"Validation failed.");return;}
      setValidResult(d);setStep(3);
    }catch{setValidateError("Network error during validation.");}
    finally{setValidating(false);}
  };

  const handleImport=async()=>{
    if(!parseResult?.sessionId)return;
    setImporting(true);setImportError("");setImportProgress({done:0,total:validationResult?.ready||0});
    try{
      const res=await fetch(`${API_BASE}/api/candidates/import/execute`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${tok()}`},body:JSON.stringify({mapping,sessionId:parseResult.sessionId,duplicateHandling:dupHandling,sendWelcomeEmails:sendEmails})});
      if(!res.ok){const d=await res.json().catch(()=>({}));setImportError(d.message||"Import failed.");return;}
      const reader=res.body.getReader(),dec=new TextDecoder();let buf="";
      while(true){
        const{done,value}=await reader.read();if(done)break;
        buf+=dec.decode(value,{stream:true});
        const chunks=buf.split("\n\n");buf=chunks.pop();
        for(const chunk of chunks){
          const m=chunk.match(/^data:\s*(.+)/m);if(!m)continue;
          try{
            const evt=JSON.parse(m[1]);
            if(evt.phase==="importing")setImportProgress({done:evt.done,total:evt.total});
            if(evt.complete){setImportResult(evt);if(evt.imported>0&&onSuccess)onSuccess(evt.imported);}
            if(evt.error)setImportError(evt.message||"Import failed.");
          }catch(_){}
        }
      }
    }catch{setImportError("Network error during import.");}
    finally{setImporting(false);}
  };

  const pct=importProgress.total>0?Math.round((importProgress.done/importProgress.total)*100):0;
  const fields=parseResult?.fields||[];
  const unmappedReq=fields.filter(f=>f.required&&!mapping[f.key]);
  const previewStudents=(parseResult?.preview||[]).map(row=>({
    name:   mapping.name    ?String(row[mapping.name]   ||"").trim():"",
    email:  mapping.email   ?String(row[mapping.email]  ||"").trim():"",
    college:mapping.college ?String(row[mapping.college]||"").trim():"",
    branch: mapping.branch  ?String(row[mapping.branch] ||"").trim():"",
    batch:  mapping.batch   ?String(row[mapping.batch]  ||"").trim():"",
    cgpa:   mapping.cgpa    ?String(row[mapping.cgpa]   ||"").trim():"",
  }));

  return (
    <div className="modal-overlay" onClick={!importing?onClose:undefined}>
      <div className="modal-box" style={{maxWidth:720}} onClick={e=>e.stopPropagation()}>
        <div className="modal-hdr">
          <div className="modal-ico"><Ic d={IC.upload} size={16} color={C.blue}/></div>
          <div style={{flex:1}}>
            <div className="modal-title">Import Students</div>
            <div className="modal-sub">Auto-generates temporary passwords · AI duplicate detection</div>
          </div>
          {!importing&&<button className="modal-close" onClick={onClose}><Ic d={IC.x} size={14} color={C.inkMid}/></button>}
        </div>
        <div className="modal-body">
          <ImportStepBar current={step}/>

          {step===1&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:4}}>Upload Your File</div>
              <div style={{fontSize:12,color:C.inkMuted,marginBottom:16}}>Accepted: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> · Max 25 MB · Up to 5,000 rows</div>
              <div className="info-box" style={{marginBottom:16}}>
                <div className="modal-ico" style={{width:28,height:28,borderRadius:7,flexShrink:0}}><Ic d={IC.key} size={13} color={C.blue}/></div>
                <div style={{fontSize:12,color:C.blue,lineHeight:1.5}}>Each student receives a unique auto-generated temporary password via email. They must set a new password on first login.</div>
              </div>
              <div className={`drop-zone${dragOver?" drag":file?" has-file":""}`}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f){setFile(f);setParseError("");}}}
                onClick={()=>fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){setFile(e.target.files[0]);setParseError("");}}}/>
                <div style={{width:42,height:42,borderRadius:10,background:file?C.greenBg:C.blueLt,border:`1.5px solid ${file?C.greenBd:C.blueBd}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                  <Ic d={IC.upload} size={18} color={file?C.green:C.blue}/>
                </div>
                {file?(
                  <><div style={{fontSize:13,fontWeight:700,color:C.ink}}>{file.name}</div><div style={{fontSize:11,color:C.inkMuted,marginTop:3}}>{fmtSz(file.size)}</div><div style={{fontSize:11,color:C.green,marginTop:5,fontWeight:600}}>Selected — click to change</div></>
                ):(
                  <><div style={{fontSize:13,fontWeight:600,color:C.inkMid}}>Drag and drop or click to browse</div><div style={{fontSize:11,color:C.inkMuted,marginTop:4}}>CSV, XLSX, or XLS</div></>
                )}
              </div>
              {parseError&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.red,marginBottom:12}}>{parseError}</div>}
              {parseLoading?<div className="loading"><div className="spinner" style={{marginBottom:10}}/>Parsing file…</div>:(
                <div style={{display:"flex",gap:10,marginTop:16}}>
                  <button className="btn-sec" onClick={onClose} style={{flex:1}}>Cancel</button>
                  <button className="btn-pri" onClick={handleParse} disabled={!file} style={{flex:2}}>Next: Map &amp; Validate</button>
                </div>
              )}
            </div>
          )}

          {step===2&&parseResult&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:4}}>Map Columns</div>
              <div style={{fontSize:12,color:C.inkMuted,marginBottom:14}}>Auto-mapping applied. Adjust if needed, then validate all rows.</div>
              {validateError&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.red,marginBottom:12}}>{validateError}</div>}
              {unmappedReq.length>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.amber,marginBottom:12}}>Required field{unmappedReq.length>1?"s":""}: <strong>{unmappedReq.map(f=>f.label).join(", ")}</strong> not mapped yet.</div>}
              <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:C.subtle,padding:"9px 14px",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.inkSub,textTransform:"uppercase",letterSpacing:.6}}>Student Field</span>
                  <span style={{fontSize:10,fontWeight:700,color:C.inkSub,textTransform:"uppercase",letterSpacing:.6}}>Your File Column</span>
                </div>
                {fields.map((field,idx)=>(
                  <div key={field.key} style={{display:"grid",gridTemplateColumns:"1fr 1fr",padding:"10px 14px",alignItems:"center",borderBottom:idx<fields.length-1?`1px solid ${C.border}`:"none",background:(!mapping[field.key]&&field.required)?C.amberBg:C.surface}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{field.label}</span>
                      {field.required?<span className="bdg bdg-rd" style={{fontSize:9}}>Required</span>:<span className="bdg bdg-nt" style={{fontSize:9}}>Optional</span>}
                    </div>
                    <select className="fld-sel" value={mapping[field.key]||""} onChange={e=>setMapping(m=>({...m,[field.key]:e.target.value}))}
                      style={{borderColor:!mapping[field.key]&&field.required?C.redBd:C.border}}>
                      <option value="">— Not mapped —</option>
                      {(parseResult.columns||[]).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:14}}><ValidationAgentPanel mode="bulk" students={previewStudents} onBulkResult={(_,s)=>setAiSummary(s)}/></div>
              {aiSummary?.blocked>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.red,marginBottom:12}}>{aiSummary.blocked} preview record{aiSummary.blocked!==1?"s":""} blocked — they will be automatically skipped during import.</div>}
              <div style={{display:"flex",gap:10}}>
                <button className="btn-sec" onClick={()=>{setStep(1);setValidateError("");}}>Back</button>
                <button className="btn-pri" onClick={handleValidate} disabled={unmappedReq.length>0||validating} style={{flex:1}}>
                  {validating?<><div className="spin-sm"/>&nbsp;Validating…</>:"Validate All Rows"}
                </button>
              </div>
            </div>
          )}

          {step===3&&validationResult&&(
            <div>
              {importResult?(
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{width:54,height:54,borderRadius:14,background:importResult.failed===0?C.greenBg:C.amberBg,border:`1.5px solid ${importResult.failed===0?C.greenBd:C.amberBd}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22}}>
                    <Ic d={importResult.failed===0?IC.check:IC.shield} size={24} color={importResult.failed===0?C.green:C.amber}/>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy,marginBottom:6}}>Import {importResult.failed===0?"Complete":"Finished with issues"}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,margin:"20px 0"}}>
                    {[{label:"Imported",value:importResult.imported,c:C.green,bg:C.greenBg},{label:"Skipped",value:importResult.skipped,c:C.amber,bg:C.amberBg},{label:"Failed",value:importResult.failed,c:importResult.failed>0?C.red:C.inkMuted,bg:importResult.failed>0?C.redBg:C.subtle}].map(x=>(
                      <div key={x.label} style={{background:x.bg,borderRadius:10,padding:14,textAlign:"center"}}>
                        <div style={{fontSize:26,fontWeight:800,color:x.c}}>{x.value}</div>
                        <div style={{fontSize:10,color:C.inkMuted,fontWeight:700,textTransform:"uppercase",marginTop:3}}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-pri" onClick={onClose} style={{padding:"10px 28px"}}>Done — Close</button>
                </div>
              ):(
                <>
                  <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>Validation Results</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
                    {[{label:"Total Rows",value:validationResult.total,c:C.blue,bg:C.blueLt},{label:"Ready to Import",value:validationResult.ready,c:C.green,bg:C.greenBg},{label:"With Issues",value:validationResult.skipped,c:validationResult.skipped>0?C.red:C.inkMuted,bg:validationResult.skipped>0?C.redBg:C.subtle}].map(x=>(
                      <div key={x.label} style={{background:x.bg,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                        <div style={{fontSize:26,fontWeight:800,color:x.c}}>{x.value}</div>
                        <div style={{fontSize:10,color:C.inkMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginTop:4}}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                  {validationResult.ready===0&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.red,marginBottom:14}}>No valid rows found. Go back and fix your column mapping.</div>}
                  <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",marginBottom:18}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.inkSub,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Import Options</div>
                    <div style={{display:"flex",gap:20,marginBottom:12}}>
                      {[{v:"skip",label:"Skip duplicates",desc:"Existing records unchanged"},{v:"update",label:"Update existing",desc:"Resets temp password, overwrites profile"}].map(({v,label,desc})=>(
                        <label key={v} style={{display:"flex",alignItems:"flex-start",gap:7,cursor:"pointer"}}>
                          <input type="radio" checked={dupHandling===v} onChange={()=>setDupHandling(v)} style={{cursor:"pointer",marginTop:2}}/>
                          <div><div style={{fontSize:12,fontWeight:600,color:C.ink}}>{label}</div><div style={{fontSize:11,color:C.inkMuted}}>{desc}</div></div>
                        </label>
                      ))}
                    </div>
                    <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer"}}>
                      <input type="checkbox" checked={sendEmails} onChange={e=>setSendEmails(e.target.checked)} style={{cursor:"pointer",width:15,height:15,marginTop:2}}/>
                      <div><div style={{fontSize:12,fontWeight:600,color:C.ink}}>Send welcome emails with temporary passwords</div><div style={{fontSize:11,color:C.inkMuted}}>Each student receives their unique temp password via email</div></div>
                    </label>
                  </div>
                  {importError&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.red,marginBottom:12}}>{importError}</div>}
                  {importing&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.inkMid,marginBottom:6}}>
                        <span style={{fontWeight:600}}>{importProgress.total>0?"Importing records…":"Preparing…"}</span>
                        {importProgress.total>0&&<span style={{fontWeight:700,color:C.blue,fontFamily:C.mono}}>{importProgress.done} / {importProgress.total} ({pct}%)</span>}
                      </div>
                      <div style={{background:C.border,borderRadius:999,height:6,overflow:"hidden"}}>
                        <div style={{background:`linear-gradient(90deg,${C.blue},#60a5fa)`,height:"100%",borderRadius:999,width:`${pct}%`,transition:"width .35s ease"}}/>
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:10}}>
                    <button className="btn-sec" onClick={()=>{setStep(2);setImportError("");}} disabled={importing}>Back</button>
                    <button className="btn-pri" onClick={handleImport} disabled={importing||validationResult.ready===0} style={{flex:1,background:importing||validationResult.ready===0?C.border:C.green}}>
                      {importing?(importProgress.total>0?`Importing… ${pct}%`:"Preparing…"):`Import ${validationResult.ready} Student${validationResult.ready!==1?"s":""}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Modal ─────────────────────────────────────────────────────────────
function validateForm(f) {
  const e={};
  if(!f.name.trim())  e.name ="Full name is required.";
  if(!f.email.trim()) e.email="Email is required.";
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email="Enter a valid email address.";
  if(!f.college) e.college="Select a college.";
  if(!f.branch)  e.branch ="Select a branch.";
  if(!f.batch)   e.batch  ="Select a batch.";
  return e;
}

function StudentModal({mode,entity,onCreated,onSaved,onClose,apiFetch}) {
  const isEdit=mode==="edit";
  const [form,setForm]=useState(isEdit?{name:entity.name,email:entity.email,college:entity.college||"",branch:entity.branch||"",batch:String(entity.batch||""),cgpa:entity.cgpa||"",account_status:entity.account_status||entity.status||"active"}:{...EMPTY});
  const [fieldErrs,setFieldErrs]=useState({});
  const [saving,setSaving]=useState(false);
  const [serverErr,setServerErr]=useState("");
  const [aiResult,setAiResult]=useState(null);
  const [aiOverride,setAiOverride]=useState(false);

  const set=(k,v)=>{setForm(f=>({...f,[k]:v}));setFieldErrs(e=>({...e,[k]:undefined}));setServerErr("");if(["name","email"].includes(k)){setAiResult(null);setAiOverride(false);}};
  const aiBlocked=!isEdit&&aiResult?.verdict==="BLOCK"&&!aiOverride;

  const handleSubmit=async(ev)=>{
    ev.preventDefault();
    const errs=validateForm(form);if(Object.keys(errs).length){setFieldErrs(errs);return;}
    setSaving(true);setServerErr("");
    try{
      if(isEdit){
        const res=await apiFetch(`/api/candidates/${entity.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,email:form.email,college:form.college,branch:form.branch,batch:form.batch,cgpa:form.cgpa||null,status:form.account_status})});
        const d=await res.json();if(!res.ok){setServerErr(d.message||"Update failed.");setSaving(false);return;}
        onSaved("Student updated successfully.");
      }else{
        const res=await apiFetch("/api/candidates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,email:form.email,college:form.college,branch:form.branch,batch:form.batch,cgpa:form.cgpa||null})});
        const d=await res.json();
        if(!res.ok){if(res.status===409)setFieldErrs(e=>({...e,email:d.message}));else if(res.status===422&&d.blocked){setServerErr(d.message||"AI validation blocked this record.");if(d.validation)setAiResult(d.validation);}else setServerErr(d.message||"Failed to create student.");setSaving(false);return;}
        onCreated(`Student "${form.name}" created. Temporary password sent to ${form.email}.`);
      }
    }catch{setServerErr("Network error. Please try again.");setSaving(false);}
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-hdr">
          <div className="modal-ico"><Ic d={IC.user} size={16} color={C.blue}/></div>
          <div style={{flex:1}}>
            <div className="modal-title">{isEdit?"Edit Student":"Add New Student"}</div>
            <div className="modal-sub">{isEdit?entity.name:"Temporary password will be auto-generated and emailed"}</div>
          </div>
          <button className="modal-close" onClick={onClose}><Ic d={IC.x} size={14} color={C.inkMid}/></button>
        </div>
        <div className="modal-body">
          {!isEdit&&(
            <div className="info-box" style={{marginBottom:18}}>
              <div className="modal-ico" style={{width:28,height:28,borderRadius:7,flexShrink:0}}><Ic d={IC.key} size={13} color={C.blue}/></div>
              <div style={{fontSize:12,color:C.blue,lineHeight:1.5}}>A unique temporary password will be auto-generated and sent to the student's email. They must change it on first login.</div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="fld">
                <label className="fld-lbl">Full Name *</label>
                <input className={`fld-inp${fieldErrs.name?" err":""}`} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Riya Sharma"/>
                {fieldErrs.name&&<span className="fld-err">{fieldErrs.name}</span>}
              </div>
              <div className="fld">
                <label className="fld-lbl">Email Address *</label>
                <input className={`fld-inp${fieldErrs.email?" err":""}`} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="e.g. student@rmkec.ac.in"/>
                {fieldErrs.email&&<span className="fld-err">{fieldErrs.email}</span>}
              </div>
            </div>
            <div className="grid-3">
              <div className="fld">
                <label className="fld-lbl">College *</label>
                <select className={`fld-sel${fieldErrs.college?" err":""}`} value={form.college} onChange={e=>set("college",e.target.value)}>
                  <option value="">— Select —</option>{COLLEGES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {fieldErrs.college&&<span className="fld-err">{fieldErrs.college}</span>}
              </div>
              <div className="fld">
                <label className="fld-lbl">Branch *</label>
                <select className={`fld-sel${fieldErrs.branch?" err":""}`} value={form.branch} onChange={e=>set("branch",e.target.value)}>
                  <option value="">— Select —</option>{BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.branch&&<span className="fld-err">{fieldErrs.branch}</span>}
              </div>
              <div className="fld">
                <label className="fld-lbl">Batch *</label>
                <select className={`fld-sel${fieldErrs.batch?" err":""}`} value={form.batch} onChange={e=>set("batch",e.target.value)}>
                  <option value="">— Select —</option>{BATCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.batch&&<span className="fld-err">{fieldErrs.batch}</span>}
              </div>
            </div>
            <div className="grid-2">
              <div className="fld">
                <label className="fld-lbl">CGPA <span style={{color:C.inkMuted,fontWeight:400,textTransform:"none"}}>(optional)</span></label>
                <input className="fld-inp" type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={e=>set("cgpa",e.target.value)} placeholder="e.g. 8.5"/>
              </div>
              {isEdit&&(
                <div className="fld">
                  <label className="fld-lbl">Account Status</label>
                  <select className="fld-sel" value={form.account_status} onChange={e=>set("account_status",e.target.value)}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </div>
            {!isEdit&&(
              <div>
                <ValidationAgentPanel mode="single" student={{name:form.name,email:form.email,college:form.college,branch:form.branch,batch:form.batch,cgpa:form.cgpa}} onResult={r=>{setAiResult(r);setAiOverride(false);}}/>
                {aiResult?.verdict==="BLOCK"&&(
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10,background:C.redBg,border:`1.5px solid ${C.redBd}`,borderRadius:9,padding:"9px 12px"}}>
                    <span style={{fontSize:12,color:C.red,flex:1,fontWeight:600}}>Validation blocked this record. Fix the issues above, or override to save anyway.</span>
                    <button type="button" onClick={()=>setAiOverride(true)} className="btn-ghost" style={{borderColor:C.redBd,color:C.red,whiteSpace:"nowrap"}}>Override</button>
                  </div>
                )}
                {aiOverride&&<div style={{marginTop:6,background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.amber}}>Override active — record will be saved despite warnings. This action is logged.</div>}
              </div>
            )}
            {serverErr&&<div style={{background:C.redBg,color:C.red,padding:"10px 14px",borderRadius:8,fontSize:12,border:`1px solid ${C.redBd}`,marginTop:8}}>{serverErr}</div>}
            <div style={{display:"flex",gap:10,paddingTop:16}}>
              <button type="submit" disabled={saving||aiBlocked} className="btn-pri" style={{flex:1}}>
                {saving?(isEdit?"Saving…":"Creating…"):(isEdit?"Save Changes":"Add Student")}
              </button>
              <button type="button" onClick={onClose} className="btn-sec" style={{flex:1}}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Student List ───────────────────────────────────────────────────────────────
function StudentList({apiFetch,onEdit,refreshKey}) {
  const [students,setStudents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [fCol,setFCol]=useState("all");
  const [fBr,setFBr]=useState("all");
  const [fBatch,setFBatch]=useState("all");
  const [fSt,setFSt]=useState("all");
  const [fAI,setFAI]=useState("all");
  const [toggling,setToggling]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{const res=await apiFetch("/api/candidates");const d=await res.json();if(d.success!==false)setStudents(Array.isArray(d.students)?d.students:Array.isArray(d)?d:[]);else setError(d.message||"Failed to load.");}
    catch{setError("Network error.");}
    setLoading(false);
  },[apiFetch]);

  useEffect(()=>{load();},[load,refreshKey]);

  const toggleStatus=async(s)=>{
    const next=(s.status||s.account_status)==="active"?"inactive":"active";setToggling(s.id);
    try{await apiFetch(`/api/candidates/${s.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:s.name,email:s.email,college:s.college,branch:s.branch,batch:s.batch,status:next})});setStudents(ss=>ss.map(x=>x.id===s.id?{...x,status:next,account_status:next}:x));}catch{}
    setToggling(null);
  };

  const exportCSV=()=>{
    const hdr=["Name","Email","College","Branch","Batch","CGPA","Status","AI Check","Risk Score","Must Change Password","Created At"];
    const rows=filtered.map(s=>[s.name,s.email,s.college,s.branch,s.batch,s.cgpa||"",s.status||s.account_status||"",s.ai_validation_status||"PASS",s.ai_risk_score??0,s.must_change_password?"Yes":"No",fmtDate(s.created_at)]);
    const csv=[hdr,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="students.csv";a.click();
  };

  const filtered=students.filter(s=>{
    const q=search.toLowerCase(),ai=s.ai_validation_status||"PASS";
    return((s.name||"").toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q))&&(fCol==="all"||s.college===fCol)&&(fBr==="all"||s.branch===fBr)&&(fBatch==="all"||String(s.batch)===fBatch)&&(fSt==="all"||(s.status||s.account_status||"")===fSt)&&(fAI==="all"||ai===fAI);
  });
  const uniqCol=[...new Set(students.map(s=>s.college).filter(Boolean))];
  const uniqBr =[...new Set(students.map(s=>s.branch).filter(Boolean))];
  const uniqBat=[...new Set(students.map(s=>String(s.batch)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const hasFilter=search||fCol!=="all"||fBr!=="all"||fBatch!=="all"||fSt!=="all"||fAI!=="all";

  if(loading) return <SpinnerPage/>;
  if(error)   return <div style={{padding:"14px 18px",background:C.redBg,borderRadius:10,color:C.red,fontSize:13,border:`1px solid ${C.redBd}`}}>{error} <button className="btn-sm" onClick={load} style={{marginLeft:10}}>Retry</button></div>;

  return (
    <>
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-ico"><Ic d={IC.search} size={14} color={C.inkMuted}/></span>
          <input className="search-inp" placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="filter-sel" value={fCol} onChange={e=>setFCol(e.target.value)}><option value="all">All Colleges</option>{uniqCol.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select className="filter-sel" value={fBr}  onChange={e=>setFBr(e.target.value)}><option value="all">All Branches</option>{uniqBr.map(b=><option key={b} value={b}>{b}</option>)}</select>
        <select className="filter-sel" value={fBatch} onChange={e=>setFBatch(e.target.value)}><option value="all">All Batches</option>{uniqBat.map(b=><option key={b} value={b}>Batch {b}</option>)}</select>
        <select className="filter-sel" value={fSt}  onChange={e=>setFSt(e.target.value)}><option value="all">All Status</option>{STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select>
        <select className="filter-sel" value={fAI} onChange={e=>setFAI(e.target.value)}><option value="all">All AI Status</option><option value="PASS">AI Passed</option><option value="WARN">AI Warning</option><option value="BLOCK">AI Blocked</option></select>
        {hasFilter&&<button className="btn-ghost" onClick={()=>{setSearch("");setFCol("all");setFBr("all");setFBatch("all");setFSt("all");setFAI("all");}}>Clear</button>}
        <div style={{marginLeft:"auto",fontSize:11,color:C.inkMuted,whiteSpace:"nowrap"}}>{filtered.length} of {students.length} students</div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Student</th><th>College</th><th>Branch</th><th>Batch</th><th>Status</th><th>AI Check</th><th>Password</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>{
                const av=avatarClr(s.name||"");
                const st=s.status||s.account_status||"active";
                const stC=st==="active"?C.green:st==="suspended"?C.red:C.inkMuted;
                const stBg=st==="active"?C.greenBg:st==="suspended"?C.redBg:C.subtle;
                const stBd=st==="active"?C.greenBd:st==="suspended"?C.redBd:C.border;
                const ai=s.ai_validation_status||"PASS";
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className="avatar" style={{background:av.bg,color:av.fg}}>{initials(s.name)}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{s.name}</div>
                          <div className="mono" style={{color:C.inkMuted,fontSize:11,marginTop:1}}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="bdg bdg-bl">{s.college||"—"}</span></td>
                    <td style={{color:C.inkMid,fontWeight:500}}>{s.branch||"—"}</td>
                    <td><span className="mono" style={{fontWeight:600,color:C.inkMid}}>{s.batch||"—"}</span></td>
                    <td>
                      <span className="bdg" style={{color:stC,background:stBg,borderColor:stBd}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:stC,display:"inline-block"}}/>
                        {st.charAt(0).toUpperCase()+st.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className="bdg" style={{fontSize:10,color:vColor(ai),background:vBg(ai),borderColor:vBd(ai)}}>{vLabel(ai)}</span>
                    </td>
                    <td>
                      {s.must_change_password
                        ?<span className="bdg bdg-am" style={{fontSize:10}}>Temp</span>
                        :<span className="bdg bdg-gr" style={{fontSize:10}}>Set</span>}
                    </td>
                    <td><span className="mono">{fmtDate(s.created_at)}</span></td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn-sm" onClick={()=>onEdit(s)} style={{color:C.blue,borderColor:C.blueBd}}>Edit</button>
                        <button className="btn-sm" onClick={()=>toggleStatus(s)} disabled={toggling===s.id} style={{color:st==="active"?C.red:C.green}}>
                          {toggling===s.id?"…":st==="active"?"Deactivate":"Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={9} className="empty">
                  <Ic d={IC.user} size={28} color={C.blue} sw={1.2}/>
                  <div style={{marginTop:10}}>No students match your filters.</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
        <button className="btn-ghost" onClick={exportCSV}>
          <Ic d={IC.arrow} size={12} color={C.inkSub}/>Export CSV ({filtered.length})
        </button>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminStudentsPage({apiFetch:apiFetchProp}) {
  const apiFetch=apiFetchProp||((path,opts={})=>{
    const token=localStorage.getItem("token")||localStorage.getItem("authToken")||"";
    const isForm=opts.body instanceof FormData;
    return fetch(`${API_BASE}${path}`,{...opts,headers:{Authorization:`Bearer ${token}`,...(isForm?{}:{"Content-Type":"application/json"}),...opts.headers}});
  });

  const [modal,setModal]=useState(null);
  const [showImport,setShowImport]=useState(false);
  const [toast,setToast]=useState(null);
  const [refreshKey,setRefreshKey]=useState(0);

  const showToast=(msg,type="success")=>{setToast({message:msg,type});setTimeout(()=>setToast(null),5000);};

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar/><Navbar/>
      {toast&&<Toast message={toast.message} type={toast.type}/>}
      {modal&&(
        <StudentModal mode={modal.type==="edit"?"edit":"create"} entity={modal.entity||null} apiFetch={apiFetch}
          onClose={()=>setModal(null)}
          onCreated={msg=>{setModal(null);showToast(msg);setRefreshKey(k=>k+1);}}
          onSaved={msg=>{setModal(null);showToast(msg);setRefreshKey(k=>k+1);}}/>
      )}
      {showImport&&(
        <ImportWizardModal apiFetch={apiFetch} onClose={()=>setShowImport(false)}
          onSuccess={count=>{setShowImport(false);showToast(`${count} student${count!==1?"s":""} imported successfully.`);setRefreshKey(k=>k+1);}}/>
      )}
      <main className="ap-main">
        <div className="ap-hdr">
          <div className="ap-hdr-l">
            <h1 className="ap-title">Students</h1>
            <p className="ap-sub">Add, edit, import and manage student records · AI validation on every entry</p>
          </div>
          <div className="ap-hdr-r">
            <button className="btn-sec" onClick={()=>setShowImport(true)}>
              <Ic d={IC.upload} size={13} color={C.inkMid}/>Import Students
            </button>
            <button className="btn-pri" onClick={()=>setModal({type:"add"})}>
              <Ic d={IC.plus} size={13} color="#fff"/>Add Student
            </button>
          </div>
        </div>
        <StudentList apiFetch={apiFetch} refreshKey={refreshKey} onEdit={s=>setModal({type:"edit",entity:s})}/>
      </main>
    </div>
  );
}

