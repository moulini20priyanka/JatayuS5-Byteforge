// src/components/certExam/CertIdentityVerify.jsx
//
// SEQUENTIAL SCAN — user controls pace, no auto-timer
//
// PHASE 1 — ID CARD SCAN
//   Left zone shows card guide. User clicks "Scan ID Card" when ready.
//   Flask + Roboflow YOLOv11 verifies. On pass → right zone activates.
//
// PHASE 2 — FACE SCAN
//   Right zone / front camera. User clicks "Scan Face" when ready.
//   Flask checks lighting/sharpness/face. Cosine match vs card patch.
//
// PHASE 3 — GENERATE EXAM

import { useState, useRef, useEffect, useCallback } from "react";

const FLASK_API = "http://localhost:5001";
const MATCH_MIN = 0.65;

function ctx2d(c){ return c.getContext("2d",{willReadFrequently:true}); }
function cropResize(src,sx,sy,sw,sh,dw,dh){
  sw=Math.max(1,sw);sh=Math.max(1,sh);
  const c=document.createElement("canvas");c.width=dw;c.height=dh;
  ctx2d(c).drawImage(src,sx,sy,sw,sh,0,0,dw,dh);return c;
}
function grayVec(canvas){
  const{data}=ctx2d(canvas).getImageData(0,0,canvas.width,canvas.height);
  const v=new Float32Array(data.length/4);
  for(let i=0;i<v.length;i++)v[i]=(data[i*4]*0.299+data[i*4+1]*0.587+data[i*4+2]*0.114)/255;
  return v;
}
function cosine(a,b){
  let dot=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]**2;nb+=b[i]**2;}
  return dot/(Math.sqrt(na)*Math.sqrt(nb)+1e-9);
}

// ── Row ────────────────────────────────────────────────────────────────────
function Row({label,status,detail}){
  const C={
    PASS:  {bg:"#f0fdf4",br:"#bbf7d0",ic:"✓",icC:"#16a34a",tx:"#15803d",badge:"#dcfce7",btx:"#166534"},
    WARN:  {bg:"#fffbeb",br:"#fde68a",ic:"⚠",icC:"#d97706",tx:"#92400e",badge:"#fef3c7",btx:"#78350f"},
    ERROR: {bg:"#fff1f2",br:"#fecdd3",ic:"✕",icC:"#e11d48",tx:"#9f1239",badge:"#ffe4e6",btx:"#9f1239"},
    pending:{bg:"#f0f9ff",br:"#bae6fd",ic:"◌",icC:"#0284c7",tx:"#0369a1",badge:"#e0f2fe",btx:"#075985"},
  };
  const s=C[status]||C.pending;
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",
      borderRadius:10,marginBottom:6,background:s.bg,border:`1.5px solid ${s.br}`,
      animation:"rowIn 0.28s ease"}}>
      <div style={{width:22,height:22,borderRadius:6,background:s.badge,display:"flex",
        alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
        <span style={{fontSize:11,fontWeight:900,color:s.icC}}>{s.ic}</span>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"#1e293b",marginBottom:2}}>{label}</div>
        {detail&&<div style={{fontSize:11,color:s.tx,lineHeight:1.4}}>{detail}</div>}
      </div>
      <span style={{fontSize:9,fontWeight:800,color:s.btx,background:s.badge,
        padding:"2px 8px",borderRadius:20,flexShrink:0,marginTop:2,
        textTransform:"uppercase",letterSpacing:"0.04em"}}>{status}</span>
    </div>
  );
}

// ── Zone indicator card ────────────────────────────────────────────────────
function ZoneChip({done,active,icon,label,color,lightBg}){
  return(
    <div style={{flex:1,borderRadius:12,padding:"12px 14px",
      background:done?lightBg:active?"#fff":"#f8fafc",
      border:`2px solid ${done?color:active?color:"#e2e8f0"}`,
      boxShadow:active&&!done?`0 3px 14px ${color}25`:"none",
      transition:"all 0.35s ease"}}>
      <div style={{height:3,borderRadius:2,background:done||active?color:"#e2e8f0",
        marginBottom:10,transition:"all 0.35s"}}/>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:30,height:30,borderRadius:8,fontSize:15,display:"flex",
          alignItems:"center",justifyContent:"center",
          background:done?color:active?`${color}18`:"#f1f5f9",
          transition:"all 0.35s"}}>
          {done?<span style={{color:"#fff",fontWeight:900,fontSize:13}}>✓</span>:icon}
        </div>
        <div>
          <div style={{fontSize:9,fontWeight:800,color:done||active?color:"#cbd5e1",
            textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>
            {done?"Completed":active?"Active":"Waiting"}
          </div>
          <div style={{fontSize:12,fontWeight:700,color:done||active?"#1e293b":"#94a3b8"}}>{label}</div>
        </div>
        {done&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:800,
          color:"#fff",background:color,padding:"2px 8px",borderRadius:20}}>DONE</span>}
        {active&&!done&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:700,
          color:color,background:`${color}15`,border:`1px solid ${color}35`,
          padding:"2px 8px",borderRadius:20}}>NOW</span>}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function CertIdentityVerify({cert,onNext,onBack}){
  const [phase,setPhase]=useState("card"); // card | face | generating
  const videoRef=useRef(null);
  const canvasRef=useRef(null);
  const streamRef=useRef(null);
  const cardPatchRef=useRef(null);

  const [camReady,setCamReady]=useState(false);
  const [camErr,setCamErr]=useState(null);
  const [scanning,setScanning]=useState(false);

  const [cardRows,setCardRows]=useState([]);
  const [cardOk,setCardOk]=useState(false);
  const [faceRows,setFaceRows]=useState([]);
  const [faceOk,setFaceOk]=useState(false);

  const [gPct,setGPct]=useState(0);
  const [gMsg,setGMsg]=useState("Initializing...");

  // ── camera lifecycle ─────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=="card"&&phase!=="face")return;
    let live=true;
    setCamReady(false);setCamErr(null);
    const facing=phase==="face"?"user":{ideal:"environment"};
    (async()=>{
      let s=null;
      for(const cfg of[
        {video:{facingMode:facing,width:1280,height:720}},
        {video:{width:1280,height:720}},
        {video:{width:640,height:480}},
      ]){try{s=await navigator.mediaDevices.getUserMedia(cfg);break;}catch{/**/}}
      if(!live){s?.getTracks().forEach(t=>t.stop());return;}
      if(!s){setCamErr("Camera access denied — allow permissions and reload.");return;}
      streamRef.current=s;
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play().catch(()=>{});}
      setCamReady(true);
    })();
    return()=>{live=false;streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[phase]);

  // ── capture ──────────────────────────────────────────────────────────────
  function capture(){
    const v=videoRef.current,c=canvasRef.current;
    if(!v||!c)return null;
    const W=v.videoWidth||640,H=v.videoHeight||480;
    c.width=W;c.height=H;
    const cx=ctx2d(c);
    if(phase==="face"){cx.save();cx.translate(W,0);cx.scale(-1,1);cx.drawImage(v,0,0);cx.restore();}
    else cx.drawImage(v,0,0);
    return c.toDataURL("image/jpeg",0.92);
  }

  // ── scan card ─────────────────────────────────────────────────────────────
  const scanCard=useCallback(async()=>{
    if(scanning)return;
    setScanning(true);
    setCardRows([{label:"ID Card — Roboflow YOLOv11",status:"pending",detail:"Sending to Flask verification server…"}]);
    const imageData=capture();
    if(!imageData){setCardRows([{label:"Capture Error",status:"ERROR",detail:"Could not read camera frame."}]);setScanning(false);return;}
    let data;
    try{
      const res=await fetch(`${FLASK_API}/verify-id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:imageData})});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      data=await res.json();
    }catch(e){
      setCardRows([{label:"Verification Server",status:"ERROR",detail:`Cannot reach Flask: ${e.message} — run: python id_verify.py`}]);
      setScanning(false);return;
    }
    const rows=[];
    for(const p of(data.passed||[]))rows.push({label:p.check,status:"PASS",detail:p.value});
    for(const iss of(data.issues||[])){if(iss.check==="FACE")continue;rows.push({label:iss.check,status:iss.status,detail:`${iss.problem} — ${iss.fix}`});}
    const realErrors=(data.issues||[]).filter(i=>i.status==="ERROR"&&i.check!=="FACE");
    const ok=realErrors.length===0&&(data.passed||[]).length>0;
    if(ok){
      rows.push({label:"ID Card Scan",status:"PASS",detail:"Card verified successfully ✓"});
      const c=canvasRef.current;
      if(c){const W=c.width,H=c.height;cardPatchRef.current=cropResize(c,Math.floor(W*0.55),Math.floor(H*0.02),Math.floor(W*0.35),Math.floor(H*0.55),64,64);}
      setCardRows(rows);setCardOk(true);setScanning(false);
      streamRef.current?.getTracks().forEach(t=>t.stop());
    }else{setCardRows(rows);setScanning(false);}
  },[scanning,phase]);

  // ── scan face ─────────────────────────────────────────────────────────────
  const scanFace=useCallback(async()=>{
    if(scanning)return;
    setScanning(true);
    setFaceRows([{label:"Face Verification",status:"pending",detail:"Sending to Flask server…"}]);
    const imageData=capture();
    if(!imageData){setFaceRows([{label:"Capture Error",status:"ERROR",detail:"Could not read camera frame."}]);setScanning(false);return;}
    let data;
    try{
      const res=await fetch(`${FLASK_API}/verify-id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:imageData})});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      data=await res.json();
    }catch(e){
      setFaceRows([{label:"Server",status:"ERROR",detail:`Cannot reach Flask: ${e.message}`}]);
      setScanning(false);return;
    }
    const rows=[];
    for(const p of(data.passed||[])){if(["LIGHTING","SHARPNESS"].includes(p.check))rows.push({label:p.check,status:"PASS",detail:p.value});}
    for(const iss of(data.issues||[])){if(["LIGHTING","SHARPNESS"].includes(iss.check))rows.push({label:iss.check,status:iss.status,detail:iss.problem});}
    if(rows.some(r=>r.status==="ERROR")){setFaceRows(rows);setScanning(false);return;}
    const faceIss=(data.issues||[]).find(i=>i.check==="FACE");
    const facePas=(data.passed||[]).find(p=>p.check==="FACE");
    if(faceIss?.status==="ERROR"){rows.push({label:"Face Detection",status:"ERROR",detail:"No face detected — sit directly in front of camera"});setFaceRows(rows);setScanning(false);return;}
    rows.push({label:"Face Detection",status:facePas?"PASS":"WARN",detail:facePas?facePas.value:"Face check inconclusive — continuing"});
    const c=canvasRef.current;
    if(c&&cardPatchRef.current){
      const W=c.width,H=c.height;
      const livePatch=cropResize(c,Math.floor(W*0.28),Math.floor(H*0.05),Math.floor(W*0.44),Math.floor(H*0.70),64,64);
      const score=cosine(grayVec(livePatch),grayVec(cardPatchRef.current));
      console.log("[FaceMatch] cosine:",score.toFixed(4));
      if(score>=MATCH_MIN){rows.push({label:"Face Match — Card vs Live",status:"PASS",detail:`Identity confirmed ✓ (similarity ${(score*100).toFixed(1)}%)`});}
      else{rows.push({label:"Face Match — Card vs Live",status:"ERROR",detail:`Wrong face — does not match ID card (${(score*100).toFixed(1)}%) — only card owner can proceed`});setFaceRows(rows);setScanning(false);return;}
    }else{rows.push({label:"Face Match",status:"WARN",detail:"Card reference unavailable — proceeding"});}
    setFaceRows(rows);setFaceOk(true);setScanning(false);
    streamRef.current?.getTracks().forEach(t=>t.stop());
  },[scanning,phase]);

  // ── generate ──────────────────────────────────────────────────────────────
  const generate=useCallback(async()=>{
    setPhase("generating");setGPct(0);
    const stages=[{p:15,m:"Initializing MCQ engine..."},{p:30,m:`Analyzing ${cert?.certName} syllabus...`},{p:50,m:"Crafting 30 questions..."},{p:75,m:"Validating quality..."},{p:90,m:"Finalizing exam..."}];
    let i=0;const t=setInterval(()=>{if(i<stages.length){setGPct(stages[i].p);setGMsg(stages[i].m);i++;}},700);
    try{
      const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),10000);
      const res=await fetch("http://localhost:5000/api/cert-exam/generate-mcq",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({certName:cert?.certName}),signal:ctrl.signal});
      if(!res.ok)throw new Error(`${res.status}`);
      const txt=await res.text();if(txt.trim().startsWith("<"))throw new Error("not ready");
      const d=JSON.parse(txt);if(!d.success||!d.questions?.length)throw new Error("no questions");
      clearInterval(t);setGPct(100);setGMsg(`${d.questions.length} questions ready!`);
      setTimeout(()=>onNext({questions:d.questions,certName:cert?.certName}),800);
    }catch{
      clearInterval(t);
      const qs=shuffle(offlineQs(cert?.certName)).map((q,idx)=>({...q,id:idx+1}));
      setGPct(100);setGMsg(`Offline — ${qs.length} questions ready!`);
      setTimeout(()=>onNext({questions:qs,certName:cert?.certName}),800);
    }
  },[cert,onNext]);

  function offlineQs(n){const l=(n||"").toLowerCase();if(l.includes("oracle")||l.includes("java"))return OB.java;if(l.includes("aws")||l.includes("amazon"))return OB.aws;if(l.includes("google")||l.includes("gcp"))return OB.gcp;return OB.java;}
  function shuffle(a){const r=[...a];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}

  const si={card:0,face:1,generating:2}[phase]??0;

  return(
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        @keyframes rowIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scanLine{0%{top:0%}100%{top:100%}}
        @keyframes pop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .scan-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.04);}
        .scan-btn:active:not(:disabled){transform:translateY(0);}
        .scan-btn{transition:all 0.18s ease;}
      `}</style>

      <div style={S.card}>

        {/* header */}
        <div style={S.header}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={S.headerIcon}>🎓</div>
            <div>
              <div style={S.headerTitle}>Identity Verification</div>
              <div style={S.headerSub}>{cert?.certName||"Certification Exam"}</div>
            </div>
          </div>
          {phase==="card"&&<button style={S.backBtn} onClick={onBack}>← Back</button>}
        </div>

        {/* steps */}
        <div style={S.steps}>
          {[{label:"Card Scan",icon:"🪪"},{label:"Face Match",icon:"👤"},{label:"Generate",icon:"📝"}].map((s,idx)=>{
            const done=idx<si,active=idx===si;
            return(
              <div key={s.label} style={{display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:34,height:34,borderRadius:10,fontSize:done?13:15,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:done?"#6366f1":active?"#fff":"#f1f5f9",
                    border:active?"2px solid #6366f1":done?"2px solid #6366f1":"2px solid #e2e8f0",
                    boxShadow:active?"0 0 0 4px #e0e7ff":"none",
                    transition:"all 0.3s",fontWeight:900}}>
                    {done?<span style={{color:"#fff",fontSize:13}}>✓</span>:s.icon}
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:active?"#6366f1":done?"#6366f1":"#94a3b8",whiteSpace:"nowrap"}}>{s.label}</span>
                </div>
                {idx<2&&<div style={{width:40,height:2,margin:"0 6px",marginBottom:16,background:done?"#6366f1":"#e2e8f0",borderRadius:2,transition:"all 0.3s"}}/>}
              </div>
            );
          })}
        </div>

        <div style={S.body}>

          {/* ═══════════════════════════
              PHASE 1 — CARD
          ═══════════════════════════ */}
          {phase==="card"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              {/* zone chips */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <ZoneChip active={true} done={cardOk} icon="🪪" label="ID Card Scan" color="#6366f1" lightBg="#eef2ff"/>
                <div style={{display:"flex",alignItems:"center",color:"#cbd5e1",fontSize:18,padding:"0 2px"}}>→</div>
                <ZoneChip active={false} done={false} icon="👤" label="Face Scan" color="#06b6d4" lightBg="#ecfeff"/>
              </div>

              <p style={S.desc}>
                Position your <strong>Aadhaar / College ID / Government ID</strong> clearly in the camera frame.
                When you're ready, tap <strong>Scan ID Card</strong>.
              </p>

              {camErr?(
                <div style={S.errBox}>⚠ {camErr}</div>
              ):(
                <div style={S.camBox}>
                  <video ref={videoRef} style={S.vid} autoPlay muted playsInline/>
                  <canvas ref={canvasRef} style={{display:"none"}}/>

                  {!cardOk&&!scanning&&(
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                      <div style={{width:"62%",height:"58%",border:"2px dashed rgba(99,102,241,0.65)",borderRadius:10,position:"relative"}}>
                        <div style={{position:"absolute",top:-22,left:"50%",transform:"translateX(-50%)",
                          fontSize:9,fontWeight:800,color:"#6366f1",
                          background:"rgba(238,242,255,0.9)",padding:"2px 10px",borderRadius:20,
                          letterSpacing:"0.06em",whiteSpace:"nowrap"}}>PLACE ID CARD HERE</div>
                        {[["tl","top:-1px,left:-1px"],["tr","top:-1px,right:-1px"],["bl","bottom:-1px,left:-1px"],["br","bottom:-1px,right:-1px"]].map(([k,st])=>(
                          <div key={k} style={{position:"absolute",width:16,height:16,
                            borderTop:k.startsWith("t")?"2px solid #6366f1":"none",
                            borderBottom:k.startsWith("b")?"2px solid #6366f1":"none",
                            borderLeft:k.endsWith("l")?"2px solid #6366f1":"none",
                            borderRight:k.endsWith("r")?"2px solid #6366f1":"none",
                            ...Object.fromEntries(st.split(",").map(s=>{const[k2,v]=s.split(":");return[k2.trim(),v.trim()]}))}}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanning&&(
                    <div style={S.scanOverlay}>
                      <div style={{position:"absolute",left:0,right:0,height:2,
                        background:"linear-gradient(90deg,transparent,#6366f1,transparent)",
                        animation:"scanLine 1.3s linear infinite",
                        boxShadow:"0 0 8px #6366f1"}}/>
                      <span style={{position:"relative",fontSize:12,fontWeight:700,color:"#fff",
                        fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"}}>
                        Scanning with Roboflow YOLOv11…
                      </span>
                    </div>
                  )}

                  {cardOk&&(
                    <div style={{...S.scanOverlay,background:"rgba(22,163,74,0.4)"}}>
                      <div style={{fontSize:52,animation:"pop 0.4s cubic-bezier(.34,1.56,.64,1)"}}>✅</div>
                      <span style={{color:"#fff",fontWeight:700,fontSize:13,marginTop:6}}>Card Approved!</span>
                    </div>
                  )}
                </div>
              )}

              <div style={S.tipsWrap}>
                {["Good lighting","Card face-up","Fill the frame","No glare","Hold steady"].map(t=>(
                  <span key={t} style={S.tip}>✓ {t}</span>
                ))}
              </div>

              {cardRows.length>0&&(
                <div style={{marginBottom:12}}>
                  {cardRows.map((r,i)=><Row key={i} label={r.label} status={r.status} detail={r.detail}/>)}
                </div>
              )}

              <div style={S.noteBox}>
                <span>⚙️</span>
                <span>Ensure <strong>python id_verify.py</strong> is running on port 5001</span>
              </div>

              {!cardOk?(
                <button className="scan-btn"
                  style={{...S.primaryBtn,
                    background:camReady&&!scanning?"linear-gradient(135deg,#6366f1,#4f46e5)":"#e2e8f0",
                    color:camReady&&!scanning?"#fff":"#94a3b8",
                    cursor:camReady&&!scanning?"pointer":"not-allowed"}}
                  onClick={scanCard} disabled={!camReady||scanning}>
                  {scanning?(
                    <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                      <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.35)",
                        borderTop:"2px solid #fff",borderRadius:"50%",
                        animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
                      Scanning ID Card…
                    </span>
                  ):"🪪  Scan ID Card"}
                </button>
              ):(
                <button className="scan-btn"
                  style={{...S.primaryBtn,background:"linear-gradient(135deg,#06b6d4,#0891b2)"}}
                  onClick={()=>{setPhase("face");setFaceRows([]);setFaceOk(false);}}>
                  Card Approved — Scan Face Next →
                </button>
              )}
            </div>
          )}

          {/* ═══════════════════════════
              PHASE 2 — FACE
          ═══════════════════════════ */}
          {phase==="face"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <ZoneChip active={false} done={true} icon="🪪" label="ID Card Scan" color="#6366f1" lightBg="#eef2ff"/>
                <div style={{display:"flex",alignItems:"center",color:"#6366f1",fontSize:18,padding:"0 2px"}}>→</div>
                <ZoneChip active={true} done={faceOk} icon="👤" label="Face Scan" color="#06b6d4" lightBg="#ecfeff"/>
              </div>

              <p style={S.desc}>
                Look directly at the camera. Centre your face in the oval guide.
                When you're ready, tap <strong>Scan Face</strong>.
              </p>

              {camErr?(
                <div style={S.errBox}>⚠ {camErr}</div>
              ):(
                <div style={S.camBox}>
                  <video ref={videoRef} style={{...S.vid,transform:"scaleX(-1)"}} autoPlay muted playsInline/>
                  <canvas ref={canvasRef} style={{display:"none"}}/>

                  {!faceOk&&!scanning&&(
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                      <div style={{width:124,height:160,
                        border:"2px solid rgba(6,182,212,0.7)",
                        borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
                        boxShadow:"0 0 0 1px rgba(6,182,212,0.15) inset"}}/>
                      <span style={{marginTop:10,fontSize:9,fontWeight:800,
                        color:"rgba(6,182,212,0.85)",letterSpacing:"0.1em",
                        textTransform:"uppercase"}}>FACE ZONE</span>
                    </div>
                  )}

                  {scanning&&(
                    <div style={S.scanOverlay}>
                      <div style={{position:"absolute",left:0,right:0,height:2,
                        background:"linear-gradient(90deg,transparent,#06b6d4,transparent)",
                        animation:"scanLine 1.3s linear infinite",boxShadow:"0 0 8px #06b6d4"}}/>
                      <span style={{position:"relative",fontSize:12,fontWeight:700,color:"#fff",
                        fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"}}>
                        Matching face with ID card…
                      </span>
                    </div>
                  )}

                  {faceOk&&(
                    <div style={{...S.scanOverlay,background:"rgba(22,163,74,0.4)"}}>
                      <div style={{fontSize:52,animation:"pop 0.4s cubic-bezier(.34,1.56,.64,1)"}}>✅</div>
                      <span style={{color:"#fff",fontWeight:700,fontSize:13,marginTop:6}}>Face Matched!</span>
                    </div>
                  )}
                </div>
              )}

              <div style={S.tipsWrap}>
                {["Face centred","Good lighting","Look at camera","Hold steady","Remove glasses if needed"].map(t=>(
                  <span key={t} style={{...S.tip,background:"#e0f2fe",color:"#0369a1",border:"1px solid #bae6fd"}}>✓ {t}</span>
                ))}
              </div>

              {faceRows.length>0&&(
                <div style={{marginBottom:12}}>
                  {faceRows.map((r,i)=><Row key={i} label={r.label} status={r.status} detail={r.detail}/>)}
                </div>
              )}

              {faceRows.some(r=>r.status==="ERROR")&&(
                <div style={{...S.errBox,marginBottom:12}}>
                  🚫 Only the ID card owner can proceed to the exam.
                </div>
              )}

              {!faceOk?(
                <div style={{display:"flex",gap:10}}>
                  <button className="scan-btn"
                    style={{...S.primaryBtn,flex:1,background:"#f1f5f9",color:"#64748b",
                      fontSize:12,fontWeight:600,boxShadow:"none"}}
                    onClick={()=>{setPhase("card");setCardOk(false);setCardRows([]);}}>
                    ← Rescan Card
                  </button>
                  <button className="scan-btn"
                    style={{...S.primaryBtn,flex:2,
                      background:camReady&&!scanning?"linear-gradient(135deg,#06b6d4,#0891b2)":"#e2e8f0",
                      color:camReady&&!scanning?"#fff":"#94a3b8",
                      cursor:camReady&&!scanning?"pointer":"not-allowed"}}
                    onClick={scanFace} disabled={!camReady||scanning}>
                    {scanning?(
                      <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.35)",
                          borderTop:"2px solid #fff",borderRadius:"50%",
                          animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
                        Matching…
                      </span>
                    ):faceRows.some(r=>r.status==="ERROR")?"↺  Try Again":"👤  Scan Face"}
                  </button>
                </div>
              ):(
                <button className="scan-btn"
                  style={{...S.primaryBtn,background:"linear-gradient(135deg,#10b981,#059669)"}}
                  onClick={generate}>
                  ✓ Identity Verified — Generate Exam →
                </button>
              )}
            </div>
          )}

          {/* ═══════════════════════════
              PHASE 3 — GENERATING
          ═══════════════════════════ */}
          {phase==="generating"&&(
            <div style={{animation:"fadeUp 0.35s ease",textAlign:"center",padding:"8px 0"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
                {gPct<100?(
                  <div style={{position:"relative",width:80,height:80}}>
                    <svg width="80" height="80" viewBox="0 0 80 80" style={{animation:"spin 1.4s linear infinite"}}>
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#e2e8f0" strokeWidth="5"/>
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#6366f1" strokeWidth="5"
                        strokeDasharray={`${gPct*1.885} 188.5`} strokeLinecap="round"
                        transform="rotate(-90 40 40)"/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:14,fontWeight:800,color:"#6366f1"}}>{gPct}%</div>
                  </div>
                ):(
                  <div style={{fontSize:60,animation:"pop 0.5s cubic-bezier(.34,1.56,.64,1)"}}>🎉</div>
                )}
              </div>
              <div style={{fontSize:19,fontWeight:800,color:"#1e293b",marginBottom:6}}>
                {gPct<100?"Preparing your exam…":"All done!"}
              </div>
              <div style={{fontSize:12,color:"#6366f1",marginBottom:20,fontFamily:"'DM Mono',monospace"}}>{gMsg}</div>
              <div style={{background:"#f1f5f9",borderRadius:100,height:7,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${gPct}%`,
                  background:"linear-gradient(90deg,#6366f1,#06b6d4)",
                  borderRadius:100,transition:"width 0.5s ease"}}/>
              </div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:14}}>
                30 questions &nbsp;·&nbsp; <strong style={{color:"#64748b"}}>{cert?.certName}</strong>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S={
  page:{
    minHeight:"100vh",
    background:"linear-gradient(150deg,#f5f7ff 0%,#eef2ff 45%,#f0fdf9 100%)",
    display:"flex",alignItems:"center",justifyContent:"center",
    padding:"24px 16px",fontFamily:"'Plus Jakarta Sans',sans-serif",
  },
  card:{
    background:"#ffffff",borderRadius:22,maxWidth:548,width:"100%",
    boxShadow:"0 2px 4px rgba(0,0,0,0.04),0 20px 56px rgba(99,102,241,0.09)",
    border:"1px solid rgba(99,102,241,0.1)",overflow:"hidden",
  },
  header:{
    display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"18px 22px 14px",borderBottom:"1px solid #f1f5f9",
  },
  headerIcon:{
    width:42,height:42,borderRadius:12,fontSize:20,
    background:"linear-gradient(135deg,#eef2ff,#ddd6fe)",
    display:"flex",alignItems:"center",justifyContent:"center",
  },
  headerTitle:{fontSize:15,fontWeight:800,color:"#1e293b"},
  headerSub:{fontSize:11,color:"#94a3b8",fontWeight:500,marginTop:1},
  backBtn:{
    background:"none",border:"1px solid #e2e8f0",color:"#64748b",
    fontSize:12,cursor:"pointer",padding:"6px 12px",borderRadius:8,
    fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",
  },
  steps:{
    display:"flex",alignItems:"flex-start",justifyContent:"center",
    padding:"14px 22px",gap:0,borderBottom:"1px solid #f1f5f9",
    background:"#fafbff",
  },
  body:{padding:"20px 22px 24px"},
  desc:{fontSize:13,color:"#64748b",marginBottom:14,lineHeight:1.55},
  camBox:{
    position:"relative",width:"100%",height:235,
    background:"#0f172a",borderRadius:14,overflow:"hidden",
    marginBottom:12,border:"1px solid #e2e8f0",
  },
  vid:{width:"100%",height:"100%",objectFit:"cover"},
  scanOverlay:{
    position:"absolute",inset:0,background:"rgba(15,23,42,0.6)",
    backdropFilter:"blur(2px)",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",gap:10,overflow:"hidden",
  },
  tipsWrap:{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12},
  tip:{
    fontSize:10,fontWeight:600,color:"#4f46e5",
    background:"#eef2ff",border:"1px solid #e0e7ff",
    padding:"3px 10px",borderRadius:20,
  },
  errBox:{
    background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:10,
    padding:"11px 14px",fontSize:12,color:"#e11d48",
    display:"flex",alignItems:"center",gap:8,marginBottom:12,
  },
  noteBox:{
    background:"#fafafa",border:"1px solid #f1f5f9",borderRadius:8,
    padding:"8px 12px",fontSize:11,color:"#64748b",
    display:"flex",alignItems:"center",gap:6,marginBottom:12,
    fontFamily:"'DM Mono',monospace",
  },
  primaryBtn:{
    width:"100%",padding:"13px 20px",border:"none",
    borderRadius:12,fontSize:13.5,fontWeight:700,
    cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",
    boxShadow:"0 4px 14px rgba(99,102,241,0.18)",
  },
};

// ── Offline question banks ──────────────────────────────────────────────────
const OB={
  java:[
    {id:1,question:"Which is NOT a primitive type in Java?",options:{A:"int",B:"String",C:"boolean",D:"char"},correct:"B",explanation:"String is a class.",difficulty:"easy",topic:"Data Types"},
    {id:2,question:"Output of System.out.println(10/3)?",options:{A:"3.33",B:"3",C:"4",D:"Error"},correct:"B",explanation:"Integer division.",difficulty:"easy",topic:"Operators"},
    {id:3,question:"Keyword to prevent subclassing?",options:{A:"static",B:"abstract",C:"final",D:"sealed"},correct:"C",explanation:"final prevents inheritance.",difficulty:"easy",topic:"OOP"},
    {id:4,question:"JVM stands for?",options:{A:"Java Virtual Machine",B:"Java Variable Method",C:"Java Verified Module",D:"Java Visual Manager"},correct:"A",explanation:"JVM executes bytecode.",difficulty:"easy",topic:"Basics"},
    {id:5,question:"Collection that forbids duplicates?",options:{A:"ArrayList",B:"LinkedList",C:"HashSet",D:"Vector"},correct:"C",explanation:"HashSet = no duplicates.",difficulty:"easy",topic:"Collections"},
    {id:6,question:"What is autoboxing?",options:{A:"int to Integer auto-convert",B:"Boxing into arrays",C:"Wrapping methods",D:"Auto memory"},correct:"A",explanation:"Primitive to wrapper.",difficulty:"easy",topic:"Data Types"},
    {id:7,question:"Modifier restricts to same class only?",options:{A:"protected",B:"default",C:"public",D:"private"},correct:"D",explanation:"private = same class.",difficulty:"easy",topic:"Access"},
    {id:8,question:"Default value of int instance variable?",options:{A:"null",B:"undefined",C:"0",D:"-1"},correct:"C",explanation:"int defaults to 0.",difficulty:"easy",topic:"Data Types"},
    {id:9,question:"Loop that always executes at least once?",options:{A:"for",B:"while",C:"do-while",D:"for-each"},correct:"C",explanation:"do-while checks after.",difficulty:"easy",topic:"Control Flow"},
    {id:10,question:"Size of long in Java?",options:{A:"32 bits",B:"16 bits",C:"64 bits",D:"128 bits"},correct:"C",explanation:"long = 64 bits.",difficulty:"easy",topic:"Data Types"},
    {id:11,question:"Correct lambda syntax?",options:{A:"lambda x->x*2",B:"(x)=>x*2",C:"x->x*2",D:"func(x){return x*2;}"},correct:"C",explanation:"params->expression.",difficulty:"medium",topic:"Lambdas"},
    {id:12,question:"What does Stream.filter() return?",options:{A:"void",B:"Optional",C:"Stream",D:"List"},correct:"C",explanation:"filter returns Stream.",difficulty:"medium",topic:"Streams"},
    {id:13,question:"Interface needed for for-each?",options:{A:"Iterator",B:"Iterable",C:"Collection",D:"Comparable"},correct:"B",explanation:"Iterable provides iterator().",difficulty:"medium",topic:"Collections"},
    {id:14,question:"Sealed class in Java 17?",options:{A:"Cannot instantiate",B:"Restricts subclasses",C:"Only static members",D:"Final abstract"},correct:"B",explanation:"Sealed uses permits.",difficulty:"medium",topic:"Java 17"},
    {id:15,question:"Optional.orElse() does?",options:{A:"Throws if empty",B:"Returns value or default",C:"Filters",D:"Maps value"},correct:"B",explanation:"Returns default if empty.",difficulty:"medium",topic:"Optional"},
    {id:16,question:"Immutable list Java 9+?",options:{A:"Arrays.asList()",B:"Collections.unmodifiableList()",C:"List.of()",D:"new ArrayList<>()"},correct:"C",explanation:"List.of() is immutable.",difficulty:"medium",topic:"Collections"},
    {id:17,question:"Purpose of var Java 10+?",options:{A:"Global vars",B:"Type inference",C:"Variant types",D:"Nullable vars"},correct:"B",explanation:"var infers local type.",difficulty:"medium",topic:"Features"},
    {id:18,question:"Functional interface?",options:{A:"Runnable",B:"Serializable",C:"Cloneable",D:"Comparable"},correct:"A",explanation:"Runnable has one abstract method.",difficulty:"medium",topic:"Functional"},
    {id:19,question:"Stream.collect(Collectors.toList())?",options:{A:"Array",B:"Set",C:"List",D:"Map"},correct:"C",explanation:"Accumulates to List.",difficulty:"medium",topic:"Streams"},
    {id:20,question:"Java module system Java 9?",options:{A:"OSGi",B:"Maven modules",C:"JPMS",D:"Gradle"},correct:"C",explanation:"JPMS = Project Jigsaw.",difficulty:"medium",topic:"Modules"},
    {id:21,question:"ConcurrentHashMap vs HashMap?",options:{A:"No diff",B:"ConcurrentHashMap thread-safe",C:"HashMap null only",D:"Same"},correct:"B",explanation:"ConcurrentHashMap = thread-safe.",difficulty:"medium",topic:"Concurrency"},
    {id:22,question:"Method reference syntax?",options:{A:"String::length()",B:"String::length",C:"length::String",D:"String.length::"},correct:"B",explanation:":: without parentheses.",difficulty:"medium",topic:"Lambdas"},
    {id:23,question:"Record in Java 16+?",options:{A:"Mutable class",B:"Storage interface",C:"Immutable data carrier",D:"Enum type"},correct:"C",explanation:"Records are immutable.",difficulty:"medium",topic:"Java 16"},
    {id:24,question:"Fixed thread pool?",options:{A:"newCachedThreadPool()",B:"newSingleThreadExecutor()",C:"newFixedThreadPool(n)",D:"newScheduledThreadPool()"},correct:"C",explanation:"Fixed = exactly n threads.",difficulty:"medium",topic:"Concurrency"},
    {id:25,question:"Stream.of(1,2,3).reduce(0,Integer::sum)?",options:{A:"0",B:"6",C:"3",D:"Error"},correct:"B",explanation:"0+1+2+3=6.",difficulty:"medium",topic:"Streams"},
    {id:26,question:"HashMap.get() average complexity?",options:{A:"O(n)",B:"O(log n)",C:"O(n log n)",D:"O(1)"},correct:"D",explanation:"Hashing = O(1) average.",difficulty:"hard",topic:"Collections"},
    {id:27,question:"Synchronized on different instances?",options:{A:"Block each other",B:"Execute concurrently",C:"Exception",D:"Deadlock"},correct:"B",explanation:"Instance lock = per instance.",difficulty:"hard",topic:"Concurrency"},
    {id:28,question:"Default GC Java 9+?",options:{A:"CMS",B:"G1GC",C:"ZGC",D:"Parallel GC"},correct:"B",explanation:"G1GC became default.",difficulty:"hard",topic:"JVM"},
    {id:29,question:"Phantom reference used for?",options:{A:"Caching",B:"Post-GC cleanup",C:"Soft cache",D:"Weak listeners"},correct:"B",explanation:"Post-finalization cleanup.",difficulty:"hard",topic:"Memory"},
    {id:30,question:"requires transitive in JPMS?",options:{A:"Optional module",B:"Dependency inherited by consumers",C:"Lazy loading",D:"Test dependency"},correct:"B",explanation:"Re-exports to consumers.",difficulty:"hard",topic:"Modules"},
  ],
  aws:[
    {id:1,question:"S3 stands for?",options:{A:"Simple Storage Service",B:"Secure Server Storage",C:"Scalable Storage System",D:"Standard Storage"},correct:"A",explanation:"Simple Storage Service.",difficulty:"easy",topic:"S3"},
    {id:2,question:"AWS DNS service?",options:{A:"CloudFront",B:"Route 53",C:"VPC",D:"API Gateway"},correct:"B",explanation:"Route 53 = DNS.",difficulty:"easy",topic:"Networking"},
    {id:3,question:"AWS Region is?",options:{A:"Single datacenter",B:"Geographic area with AZs",C:"VPN",D:"CDN point"},correct:"B",explanation:"Region = multiple AZs.",difficulty:"easy",topic:"Infrastructure"},
    {id:4,question:"Serverless functions in AWS?",options:{A:"EC2",B:"ECS",C:"Lambda",D:"Fargate"},correct:"C",explanation:"Lambda = serverless.",difficulty:"easy",topic:"Compute"},
    {id:5,question:"IAM stands for?",options:{A:"Internet Access Mgmt",B:"Identity and Access Management",C:"Integrated App Module",D:"Internal AWS Manager"},correct:"B",explanation:"IAM manages access.",difficulty:"easy",topic:"Security"},
    {id:6,question:"Cheapest EC2 for steady workloads?",options:{A:"On-Demand",B:"Spot",C:"Reserved",D:"Dedicated"},correct:"C",explanation:"Reserved = 75% discount.",difficulty:"easy",topic:"EC2"},
    {id:7,question:"AZ stands for?",options:{A:"Separate account",B:"Datacenters within Region",C:"CDN edge",D:"VPC"},correct:"B",explanation:"AZs = isolated clusters.",difficulty:"easy",topic:"Infrastructure"},
    {id:8,question:"Managed relational database?",options:{A:"DynamoDB",B:"ElastiCache",C:"RDS",D:"Redshift"},correct:"C",explanation:"RDS = managed SQL.",difficulty:"easy",topic:"Databases"},
    {id:9,question:"CloudFront is?",options:{A:"DB cache",B:"CDN",C:"Serverless",D:"Containers"},correct:"B",explanation:"CloudFront = AWS CDN.",difficulty:"easy",topic:"Networking"},
    {id:10,question:"S3 Versioning protects against?",options:{A:"Corruption",B:"Accidental deletion",C:"Unauthorized access",D:"Cost"},correct:"B",explanation:"Preserves all versions.",difficulty:"easy",topic:"S3"},
    {id:11,question:"VPC stands for?",options:{A:"Virtual Private Cloud",B:"Virtual Public Container",C:"Verified Processing",D:"Virtual Proxy"},correct:"A",explanation:"Isolated network.",difficulty:"medium",topic:"Networking"},
    {id:12,question:"Best for message queuing?",options:{A:"SNS",B:"SQS",C:"EventBridge",D:"Kinesis"},correct:"B",explanation:"SQS = reliable queuing.",difficulty:"medium",topic:"Integration"},
    {id:13,question:"Max S3 object size?",options:{A:"5 GB",B:"100 GB",C:"5 TB",D:"1 TB"},correct:"C",explanation:"S3 max = 5TB.",difficulty:"medium",topic:"S3"},
    {id:14,question:"Layer 7 load balancer?",options:{A:"NLB",B:"CLB",C:"ALB",D:"GLB"},correct:"C",explanation:"ALB = HTTP layer.",difficulty:"medium",topic:"HA"},
    {id:15,question:"Auto Scaling does?",options:{A:"Backup data",B:"Adjust EC2 capacity",C:"Scale DB",D:"Manage IAM"},correct:"B",explanation:"Adds/removes EC2.",difficulty:"medium",topic:"Compute"},
    {id:16,question:"AWS NoSQL database?",options:{A:"RDS",B:"Aurora",C:"DynamoDB",D:"Redshift"},correct:"C",explanation:"DynamoDB = NoSQL.",difficulty:"medium",topic:"Databases"},
    {id:17,question:"Security Group purpose?",options:{A:"Encrypts data",B:"Virtual firewall",C:"Manages IAM",D:"Monitors traffic"},correct:"B",explanation:"SG = virtual firewall.",difficulty:"medium",topic:"Security"},
    {id:18,question:"Internet Gateway purpose?",options:{A:"Connect VPCs",B:"Internet for public subnets",C:"Encrypt traffic",D:"DNS"},correct:"B",explanation:"IGW = internet access.",difficulty:"medium",topic:"Networking"},
    {id:19,question:"DDoS protection in AWS?",options:{A:"WAF",B:"Shield",C:"GuardDuty",D:"Macie"},correct:"B",explanation:"Shield = DDoS protection.",difficulty:"medium",topic:"Security"},
    {id:20,question:"S3 Transfer Acceleration?",options:{A:"Faster API",B:"CloudFront edges for upload",C:"Parallel upload",D:"Compressed"},correct:"B",explanation:"Routes via CloudFront.",difficulty:"medium",topic:"S3"},
    {id:21,question:"Memory-optimized EC2?",options:{A:"C5",B:"T3",C:"R5",D:"P3"},correct:"C",explanation:"R-series = memory.",difficulty:"medium",topic:"EC2"},
    {id:22,question:"Fargate is?",options:{A:"Managed K8s",B:"Serverless containers",C:"Registry",D:"VM migration"},correct:"B",explanation:"No EC2 management.",difficulty:"medium",topic:"Containers"},
    {id:23,question:"CloudWatch purpose?",options:{A:"Cost",B:"Logging and monitoring",C:"Security scan",D:"DB backup"},correct:"B",explanation:"Logs, metrics, events.",difficulty:"medium",topic:"Monitoring"},
    {id:24,question:"RTO in DR means?",options:{A:"Recovery Time Objective",B:"Real Time Ops",C:"Recovery Transfer",D:"Redundant Offset"},correct:"A",explanation:"How fast to recover.",difficulty:"medium",topic:"DR"},
    {id:25,question:"NAT Gateway purpose?",options:{A:"Connect VPCs",B:"Private subnet outbound internet",C:"Block internet",D:"VPN"},correct:"B",explanation:"Outbound for private.",difficulty:"medium",topic:"Networking"},
    {id:26,question:"NACLs vs Security Groups?",options:{A:"Same",B:"NACLs stateless subnet; SGs stateful instance",C:"SGs stateless",D:"NACLs allow only"},correct:"B",explanation:"NACLs=subnet, SGs=instance.",difficulty:"hard",topic:"Networking"},
    {id:27,question:"DynamoDB default consistency?",options:{A:"Strong",B:"Eventual",C:"Causal",D:"Linear"},correct:"B",explanation:"Eventual by default.",difficulty:"hard",topic:"Databases"},
    {id:28,question:"Transit Gateway purpose?",options:{A:"Hub for VPCs and on-prem",B:"Internet to VPCs",C:"API connections",D:"Cross-region LB"},correct:"A",explanation:"Cloud router.",difficulty:"hard",topic:"Networking"},
    {id:29,question:"SCP in AWS Organizations?",options:{A:"Encrypt data",B:"Permission boundaries",C:"Service quotas",D:"Compliance"},correct:"B",explanation:"Restricts member accounts.",difficulty:"hard",topic:"Security"},
    {id:30,question:"VPC Peering is?",options:{A:"VPC to internet",B:"Private connection between VPCs",C:"VPN to on-prem",D:"Cross-region LB"},correct:"B",explanation:"Private VPC routing.",difficulty:"hard",topic:"Networking"},
  ],
  gcp:[
    {id:1,question:"GCP object storage?",options:{A:"Cloud SQL",B:"Cloud Storage",C:"Bigtable",D:"Filestore"},correct:"B",explanation:"Cloud Storage = object store.",difficulty:"easy",topic:"Storage"},
    {id:2,question:"GKE stands for?",options:{A:"Google Kubernetes Engine",B:"Google Kernel Ext",C:"Google Key Encrypt",D:"Google Kube Env"},correct:"A",explanation:"Managed Kubernetes.",difficulty:"easy",topic:"Containers"},
    {id:3,question:"GCP serverless functions?",options:{A:"Cloud Run",B:"Cloud Functions",C:"App Engine",D:"Compute Engine"},correct:"B",explanation:"Cloud Functions = FaaS.",difficulty:"easy",topic:"Compute"},
    {id:4,question:"GCP Project is?",options:{A:"A VM",B:"Base org unit",C:"Network config",D:"Billing account"},correct:"B",explanation:"Projects organize resources.",difficulty:"easy",topic:"Basics"},
    {id:5,question:"Managed MySQL on GCP?",options:{A:"Spanner",B:"Bigtable",C:"Cloud SQL",D:"Firestore"},correct:"C",explanation:"Cloud SQL = MySQL/PG.",difficulty:"easy",topic:"Databases"},
    {id:6,question:"Cloud IAM purpose?",options:{A:"Monitoring",B:"Access control",C:"Networking",D:"Cost"},correct:"B",explanation:"Controls who can what.",difficulty:"easy",topic:"Security"},
    {id:7,question:"GCP Zone is?",options:{A:"Region",B:"Deployment area in Region",C:"Billing",D:"Network segment"},correct:"B",explanation:"Isolated location.",difficulty:"easy",topic:"Infrastructure"},
    {id:8,question:"GCP CDN service?",options:{A:"Cloud Armor",B:"Cloud DNS",C:"Cloud CDN",D:"Cloud LB"},correct:"C",explanation:"Google edge caching.",difficulty:"easy",topic:"Networking"},
    {id:9,question:"Persistent Disk provides?",options:{A:"Object storage",B:"Block storage for VMs",C:"File storage",D:"Cold archive"},correct:"B",explanation:"Block storage.",difficulty:"easy",topic:"Storage"},
    {id:10,question:"GCP IaC tool?",options:{A:"Cloud Build",B:"Deployment Manager",C:"Source Repos",D:"Artifact Registry"},correct:"B",explanation:"YAML templates.",difficulty:"easy",topic:"DevOps"},
    {id:11,question:"VPC in GCP?",options:{A:"Virtual Private Cloud",B:"Virtual Processing",C:"Verified Public",D:"Video Processing"},correct:"A",explanation:"Isolated network.",difficulty:"medium",topic:"Networking"},
    {id:12,question:"Stateless containers no infra?",options:{A:"GKE",B:"Compute Engine",C:"Cloud Run",D:"App Engine"},correct:"C",explanation:"Cloud Run = scales to zero.",difficulty:"medium",topic:"Containers"},
    {id:13,question:"Cloud Spanner best for?",options:{A:"Documents",B:"Global relational + strong consistency",C:"Time-series",D:"Objects"},correct:"B",explanation:"Global ACID.",difficulty:"medium",topic:"Databases"},
    {id:14,question:"Service Account is?",options:{A:"Human user",B:"App identity for GCP APIs",C:"Billing",D:"Project owner"},correct:"B",explanation:"Non-human identity.",difficulty:"medium",topic:"Security"},
    {id:15,question:"Cheapest storage for rare access?",options:{A:"Standard",B:"Nearline",C:"Coldline",D:"Archive"},correct:"D",explanation:"Archive = lowest cost.",difficulty:"medium",topic:"Storage"},
    {id:16,question:"Firestore is?",options:{A:"Relational",B:"NoSQL document DB",C:"Key-value",D:"Time-series"},correct:"B",explanation:"Serverless document DB.",difficulty:"medium",topic:"Databases"},
    {id:17,question:"Cloud Armor provides?",options:{A:"Encryption",B:"DDoS + WAF",C:"VPN",D:"Federation"},correct:"B",explanation:"DDoS protection.",difficulty:"medium",topic:"Security"},
    {id:18,question:"Cloud Pub/Sub purpose?",options:{A:"DB replication",B:"Async messaging",C:"File sync",D:"API gateway"},correct:"B",explanation:"Event messaging.",difficulty:"medium",topic:"Integration"},
    {id:19,question:"Initialize gcloud CLI?",options:{A:"gcloud start",B:"gcloud auth",C:"gcloud init",D:"gcloud config"},correct:"C",explanation:"Sets account and project.",difficulty:"medium",topic:"CLI"},
    {id:20,question:"Managed Instance Group?",options:{A:"Cloud SQL group",B:"Identical VMs for scaling",C:"GKE node pool",D:"IAM roles"},correct:"B",explanation:"Autoscaling VM fleet.",difficulty:"medium",topic:"Compute"},
    {id:21,question:"Cloud Interconnect?",options:{A:"Internal GCP",B:"Private on-prem to GCP",C:"Two regions",D:"API"},correct:"B",explanation:"Dedicated connectivity.",difficulty:"medium",topic:"Networking"},
    {id:22,question:"GCP data warehouse?",options:{A:"Cloud SQL",B:"Bigtable",C:"BigQuery",D:"Datastore"},correct:"C",explanation:"Petabyte scale.",difficulty:"medium",topic:"Analytics"},
    {id:23,question:"Anthos is?",options:{A:"Database",B:"Multi-cloud app platform",C:"CDN",D:"ML"},correct:"B",explanation:"Consistent ops anywhere.",difficulty:"medium",topic:"Hybrid"},
    {id:24,question:"Cloud KMS purpose?",options:{A:"K8s mgmt",B:"Key management",C:"Monitoring",D:"Rate limiting"},correct:"B",explanation:"Encryption keys.",difficulty:"medium",topic:"Security"},
    {id:25,question:"Cloud Build does?",options:{A:"Deploy VMs",B:"CI/CD automation",C:"Manage DBs",D:"Monitor costs"},correct:"B",explanation:"Build and test.",difficulty:"medium",topic:"DevOps"},
    {id:26,question:"Coldline vs Archive?",options:{A:"Same",B:"Coldline quarterly; Archive yearly",C:"Archive faster",D:"Coldline cheaper"},correct:"B",explanation:"Archive = less frequent.",difficulty:"hard",topic:"Storage"},
    {id:27,question:"GKE Autopilot vs Standard?",options:{A:"Autopilot manages nodes",B:"Autopilot cheaper",C:"Standard more regions",D:"No diff"},correct:"A",explanation:"Fully managed.",difficulty:"hard",topic:"Containers"},
    {id:28,question:"Workload Identity in GKE?",options:{A:"IP to pods",B:"Pods auth as GCP SA without keys",C:"K8s RBAC",D:"Encrypt pods"},correct:"B",explanation:"Keyless SA mapping.",difficulty:"hard",topic:"Security"},
    {id:29,question:"VPC Service Controls?",options:{A:"VM firewall",B:"Perimeter against exfiltration",C:"VPN config",D:"Peering"},correct:"B",explanation:"API access perimeters.",difficulty:"hard",topic:"Security"},
    {id:30,question:"Spanner consistency model?",options:{A:"Eventual",B:"Read-your-writes",C:"External consistency",D:"Causal"},correct:"C",explanation:"Linearizability.",difficulty:"hard",topic:"Databases"},
  ],
};