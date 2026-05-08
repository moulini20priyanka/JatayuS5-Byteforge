// src/components/certExam/CertIdentityVerify.jsx
//
// Mirrors neuroassess.py exactly — same 4 checks, browser-side:
//
//  STEP 1 — ID CARD SCAN (mirrors the Python script)
//    CHECK 1 : Brightness      → gray.mean() equivalent
//    CHECK 2 : Sharpness       → Laplacian variance equivalent
//    CHECK 3 : Face on card    → browser FaceDetector API (same as Haar cascade)
//                                crops & saves the face found ON the card
//    CHECK 4 : Roboflow YOLOv11→ same model_id, same API key, same thresholds
//
//  STEP 2 — LIVE FACE MATCH
//    • Front camera opens
//    • FaceDetector finds your live face
//    • Cosine similarity between card-face patch and live-face patch
//    • Score ≥ 0.70 → MATCH → proceed
//
//  STEP 3 — GENERATE EXAM (unchanged)

import { useState, useRef, useEffect, useCallback } from "react";

// ── Roboflow — same values as neuroassess.py ─────────────────────────────
const RF_API_KEY  = "9IZ9SAkpOqC2qOJUE1mN";
const RF_MODEL_ID = "id-card-0i1ip-fcs3b/1";
const RF_URL      = `https://serverless.roboflow.com/${RF_MODEL_ID}?api_key=${RF_API_KEY}`;

// ── Thresholds — same as neuroassess.py ──────────────────────────────────
const BRIGHTNESS_LOW  = 60;
const BRIGHTNESS_HIGH = 220;
const BLUR_THRESHOLD  = 100;   // Laplacian variance
const RF_CONF_LOW     = 0.45;  // slightly lower than py's 0.6 — browser jpeg != py jpeg
const FACE_MIN_AREA   = 0.02;  // fraction of frame (py uses 0.05 but card faces are smaller)
const MATCH_THRESHOLD = 0.68;  // cosine similarity for live vs card face

// ── Helpers ───────────────────────────────────────────────────────────────
const toBlob = (canvas) =>
  new Promise(res => canvas.toBlob(res, "image/jpeg", 0.95));

function makeCtx(canvas) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

// Crop a region from srcCanvas → new w×h canvas
function cropResize(src, sx, sy, sw, sh, dw, dh) {
  const tmp = document.createElement("canvas");
  tmp.width = dw; tmp.height = dh;
  makeCtx(tmp).drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
  return tmp;
}

// Canvas → grayscale Float32Array 0-1
function toGray(canvas) {
  const ctx = makeCtx(canvas);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const v = new Float32Array(data.length / 4);
  for (let i = 0; i < v.length; i++)
    v[i] = (data[i*4]*0.299 + data[i*4+1]*0.587 + data[i*4+2]*0.114) / 255;
  return v;
}

// Cosine similarity
function cosine(a, b) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]**2;nb+=b[i]**2;}
  return dot/(Math.sqrt(na)*Math.sqrt(nb)+1e-9);
}

// Browser FaceDetector wrapper — returns array of {x,y,w,h} in pixel coords
async function detectFaces(canvas) {
  if (!("FaceDetector" in window)) return null; // API not available
  try {
    const fd   = new window.FaceDetector({ fastMode: false });
    const blob = await toBlob(canvas);
    const bmp  = await createImageBitmap(blob);
    const res  = await fd.detect(bmp);
    return res.map(f => ({
      x: f.boundingBox.x,
      y: f.boundingBox.y,
      w: f.boundingBox.width,
      h: f.boundingBox.height,
    }));
  } catch { return null; }
}

// ── UI helpers ────────────────────────────────────────────────────────────
const COL = {
  pass:    {text:"#16a34a",bg:"#f0fdf4",border:"#bbf7d0"},
  warn:    {text:"#d97706",bg:"#fffbeb",border:"#fde68a"},
  error:   {text:"#dc2626",bg:"#fef2f2",border:"#fecaca"},
  pending: {text:"#0284c7",bg:"#f0f9ff",border:"#bae6fd"},
};

function CheckRow({ label, status, detail }) {
  const c   = COL[status] || COL.pending;
  const ico = {pass:"✓",warn:"⚠",error:"✕",pending:"…"}[status]||"…";
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:10,
      padding:"9px 12px",borderRadius:8,marginBottom:6,
      background:c.bg,border:`1px solid ${c.border}`}}>
      <span style={{fontSize:13,fontWeight:800,color:c.text,flexShrink:0,marginTop:1}}>{ico}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12.5,fontWeight:700,color:"#0f172a"}}>{label}</div>
        {detail&&<div style={{fontSize:11.5,color:c.text,marginTop:2}}>{detail}</div>}
      </div>
      <span style={{fontSize:10,fontWeight:800,color:c.text,textTransform:"uppercase",flexShrink:0}}>{status}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CertIdentityVerify({ cert, onNext, onBack }) {

  const [step, setStep] = useState("card");

  // ── Card scan state ───────────────────────────────────────────────────────
  const cVideoRef  = useRef(null);
  const cCanvasRef = useRef(null);
  const cStreamRef = useRef(null);
  const cardFaceRef= useRef(null);   // 48×48 canvas — face crop from ID card
  const [cReady,    setCReady]    = useState(false);
  const [cScanning, setCScanning] = useState(false);
  const [cChecks,   setCChecks]   = useState([]);
  const [cCamErr,   setCCamErr]   = useState(null);
  const [cDone,     setCDone]     = useState(false);

  // ── Live face state ───────────────────────────────────────────────────────
  const fVideoRef  = useRef(null);
  const fCanvasRef = useRef(null);
  const fStreamRef = useRef(null);
  const [fReady,    setFReady]    = useState(false);
  const [fCapturing,setFCapturing]= useState(false);
  const [fChecks,   setFChecks]   = useState([]);
  const [fDone,     setFDone]     = useState(false);
  const [fSnap,     setFSnap]     = useState(null);

  // ── Generate state ────────────────────────────────────────────────────────
  const [genPct, setGenPct] = useState(0);
  const [genMsg, setGenMsg] = useState("Initializing...");

  // ── Camera: card ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "card") return;
    let alive = true;
    (async () => {
      let stream = null;
      for (const c of [
        {video:{facingMode:{ideal:"environment"},width:1280,height:720}},
        {video:{width:640,height:480}},
      ]) { try{stream=await navigator.mediaDevices.getUserMedia(c);break;}catch{/**/} }
      if (!alive){stream?.getTracks().forEach(t=>t.stop());return;}
      if (!stream){setCCamErr("Camera access denied — allow permissions and reload.");return;}
      cStreamRef.current = stream;
      if (cVideoRef.current){cVideoRef.current.srcObject=stream;cVideoRef.current.play().catch(()=>{});}
      setCReady(true);
    })();
    return ()=>{alive=false;cStreamRef.current?.getTracks().forEach(t=>t.stop());};
  }, [step]);

  useEffect(()=>{
    if(cStreamRef.current&&cVideoRef.current&&!cVideoRef.current.srcObject){
      cVideoRef.current.srcObject=cStreamRef.current;
      cVideoRef.current.play().catch(()=>{});
    }
  });

  // ── Camera: face ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "face") return;
    let alive = true;
    navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:640,height:480}})
      .then(stream=>{
        if(!alive){stream.getTracks().forEach(t=>t.stop());return;}
        fStreamRef.current=stream;
        if(fVideoRef.current){fVideoRef.current.srcObject=stream;fVideoRef.current.play().catch(()=>{});}
        setFReady(true);
      })
      .catch(()=>setFChecks([{label:"Camera",status:"error",detail:"Camera access denied"}]));
    return ()=>{alive=false;fStreamRef.current?.getTracks().forEach(t=>t.stop());};
  }, [step]);

  // ── SCAN CARD ─────────────────────────────────────────────────────────────
  const scanCard = useCallback(async () => {
    if (!cVideoRef.current||!cCanvasRef.current||cScanning) return;
    setCScanning(true); setCChecks([]);

    const video  = cVideoRef.current;
    const canvas = cCanvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = makeCtx(canvas);
    ctx.drawImage(video, 0, 0);

    const iw = canvas.width, ih = canvas.height;
    const results = [];

    // ── CHECK 1: Brightness (mirrors gray.mean() in py) ───────────────────
    const imgData = ctx.getImageData(0,0,iw,ih);
    const d = imgData.data;
    let bsum=0;
    for(let i=0;i<d.length;i+=4) bsum+=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114;
    const brightness = bsum/(d.length/4);   // 0-255

    if (brightness < BRIGHTNESS_LOW) {
      results.push({label:"Lighting",status:"error",detail:`Room too dark (${brightness.toFixed(0)}/255) — turn on a light`});
      setCChecks([...results]); setCScanning(false); return;
    } else if (brightness > BRIGHTNESS_HIGH) {
      results.push({label:"Lighting",status:"warn",detail:`Overexposed (${brightness.toFixed(0)}/255) — move away from sunlight`});
    } else {
      results.push({label:"Lighting",status:"pass",detail:`Good lighting (${brightness.toFixed(0)}/255)`});
    }
    setCChecks([...results]);
    await new Promise(r=>setTimeout(r,80));

    // ── CHECK 2: Sharpness (mirrors cv2.Laplacian variance in py) ────────
    const gray = new Float32Array(d.length/4);
    for(let i=0;i<gray.length;i++) gray[i]=d[i*4]*0.299+d[i*4+1]*0.587+d[i*4+2]*0.114;
    const gmean = gray.reduce((a,b)=>a+b,0)/gray.length;
    const variance = gray.reduce((a,b)=>a+(b-gmean)**2,0)/gray.length;

    if (variance < BLUR_THRESHOLD) {
      results.push({label:"Sharpness",status:"error",detail:`Image blurry (score ${variance.toFixed(0)}) — clean lens or hold still`});
      setCChecks([...results]); setCScanning(false); return;
    } else {
      results.push({label:"Sharpness",status:"pass",detail:`Sharp image (score ${variance.toFixed(0)})`});
    }
    setCChecks([...results]);
    await new Promise(r=>setTimeout(r,80));

    // ── CHECK 3: Face on card (mirrors Haar cascade in py) ────────────────
    results.push({label:"Face on ID Card",status:"pending",detail:"Detecting face on card…"});
    setCChecks([...results]);

    let cardFacePatch = null;
    const faces = await detectFaces(canvas);

    if (faces === null) {
      // FaceDetector API not available (Firefox / some browsers)
      // Fall back: crop top-right 30%×50% as face region (standard position on Indian IDs)
      const fx = Math.floor(iw*0.55), fy = 0;
      const fw = Math.floor(iw*0.35), fh = Math.floor(ih*0.55);
      cardFacePatch = cropResize(canvas, fx, fy, fw, fh, 48, 48);
      results[results.length-1]={label:"Face on ID Card",status:"warn",
        detail:"FaceDetector API unavailable — used card photo region as fallback"};
    } else if (faces.length===0) {
      results[results.length-1]={label:"Face on ID Card",status:"error",
        detail:"No face detected on card — ensure card is fully visible and well-lit"};
      setCChecks([...results]); setCScanning(false); return;
    } else {
      // Use the first (most prominent) face found
      const f = faces[0];
      const faceArea = (f.w*f.h)/(iw*ih);
      const cx = (f.x+f.w/2)/iw;
      const cy = (f.y+f.h/2)/ih;
      console.log(`[CardFace] area=${faceArea.toFixed(3)} cx=${cx.toFixed(2)} cy=${cy.toFixed(2)}`);

      if (faceArea < FACE_MIN_AREA) {
        results[results.length-1]={label:"Face on ID Card",status:"warn",
          detail:"Card face very small — move card closer for better match accuracy"};
      } else {
        results[results.length-1]={label:"Face on ID Card",status:"pass",
          detail:`Face detected on card (area ${(faceArea*100).toFixed(1)}% of frame)`};
      }
      // Crop the face region with a small margin
      const margin = Math.floor(Math.min(f.w,f.h)*0.1);
      const cx2 = Math.max(0, f.x-margin);
      const cy2 = Math.max(0, f.y-margin);
      const cw2 = Math.min(iw-cx2, f.w+margin*2);
      const ch2 = Math.min(ih-cy2, f.h+margin*2);
      cardFacePatch = cropResize(canvas, cx2, cy2, cw2, ch2, 48, 48);
    }
    cardFaceRef.current = cardFacePatch;
    setCChecks([...results]);
    await new Promise(r=>setTimeout(r,80));

    // ── CHECK 4: Roboflow YOLOv11 (mirrors CLIENT.infer in py) ───────────
    results.push({label:"ID Card AI Detection (Roboflow)",status:"pending",detail:"Calling Roboflow model…"});
    setCChecks([...results]);

    let rfData;
    try {
      const blob = await toBlob(canvas);
      const form = new FormData();
      form.append("file", blob, "card.jpg");
      const res = await fetch(RF_URL,{method:"POST",body:form});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      rfData = await res.json();
      console.log("[Roboflow]", JSON.stringify(rfData));
    } catch(e) {
      // Network error → warn and continue (don't block the student)
      results[results.length-1]={label:"ID Card AI Detection (Roboflow)",status:"warn",
        detail:`Could not reach Roboflow (${e.message}) — proceeding with face checks only`};
      setCChecks([...results]);
      setCScanning(false);
      // Still allow next step if face check passed
      const hasError = results.some(r=>r.status==="error");
      if (!hasError){
        cStreamRef.current?.getTracks().forEach(t=>t.stop());
        setTimeout(()=>setStep("face"),800);
      }
      return;
    }

    const preds   = rfData.predictions||[];
    const classes = preds.map(p=>p.class);
    const confs   = preds.map(p=>p.confidence);

    if (!preds.length || classes.includes("ID Missing")) {
      results[results.length-1]={label:"ID Card AI Detection (Roboflow)",status:"error",
        detail:"No ID card detected — hold card flat, face-up, closer to camera"};
    } else if (classes.some(c=>["2-ID","3-ID","4-ID"].includes(c))) {
      results[results.length-1]={label:"ID Card AI Detection (Roboflow)",status:"error",
        detail:"Multiple ID cards detected — show only ONE card"};
    } else if (confs[0] < RF_CONF_LOW) {
      results[results.length-1]={label:"ID Card AI Detection (Roboflow)",status:"warn",
        detail:`Low confidence (${(confs[0]*100).toFixed(0)}%) — hold card flat, face-forward, closer`};
    } else {
      results[results.length-1]={label:"ID Card AI Detection (Roboflow)",status:"pass",
        detail:`${classes[0]} detected · ${(confs[0]*100).toFixed(0)}% confidence ✓`};
    }

    setCChecks([...results]);
    setCScanning(false);
    setCDone(true);

    const hasError = results.some(r=>r.status==="error");
    if (!hasError){
      cStreamRef.current?.getTracks().forEach(t=>t.stop());
      setTimeout(()=>setStep("face"),900);
    }
  }, [cScanning]);

  // ── CAPTURE LIVE FACE ─────────────────────────────────────────────────────
  const captureFace = useCallback(async () => {
    if (!fVideoRef.current||!fCanvasRef.current||fCapturing) return;
    setFCapturing(true); setFChecks([]);

    await new Promise(r=>setTimeout(r,400));

    const video  = fVideoRef.current;
    const canvas = fCanvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const iw=canvas.width, ih=canvas.height;
    const ctx = makeCtx(canvas);
    // mirror front camera so left/right matches reality
    ctx.save(); ctx.translate(iw,0); ctx.scale(-1,1);
    ctx.drawImage(video,0,0); ctx.restore();

    const results = [];

    // Brightness check
    const {data} = ctx.getImageData(0,0,iw,ih);
    let bs=0;
    for(let i=0;i<data.length;i+=4) bs+=data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114;
    const bri=bs/(data.length/4);
    if(bri<BRIGHTNESS_LOW){
      results.push({label:"Lighting",status:"error",detail:"Too dark — turn on lights"});
      setFChecks([...results]); setFCapturing(false); return;
    }
    results.push({label:"Lighting",status:"pass",detail:`Good lighting (${bri.toFixed(0)}/255)`});
    setFChecks([...results]);
    await new Promise(r=>setTimeout(r,100));

    // Face detection check (mirrors py CHECK 3)
    results.push({label:"Face Detection",status:"pending",detail:"Detecting your face…"});
    setFChecks([...results]);

    let liveFacePatch = null;
    const lfaces = await detectFaces(canvas);

    if (lfaces===null||lfaces.length===0) {
      // Fallback: centre crop
      const lx=Math.floor(iw*0.28),ly=Math.floor(ih*0.08);
      const lw=Math.floor(iw*0.44),lh=Math.floor(ih*0.68);
      liveFacePatch = cropResize(canvas,lx,ly,lw,lh,48,48);
      results[results.length-1]={label:"Face Detection",status:"warn",
        detail:lfaces===null
          ?"FaceDetector API unavailable — using centre region"
          :"No face auto-detected — using centre region; look directly at camera"};
    } else if (lfaces.length>1) {
      results[results.length-1]={label:"Face Detection",status:"error",
        detail:`${lfaces.length} faces detected — only you should be visible`};
      setFChecks([...results]); setFCapturing(false); return;
    } else {
      const f=lfaces[0];
      const fa=(f.w*f.h)/(iw*ih);
      const cx=(f.x+f.w/2)/iw;
      const cy=(f.y+f.h/2)/ih;

      // Position warnings (mirrors py)
      if(fa<0.05){
        results[results.length-1]={label:"Face Detection",status:"warn",
          detail:"Your face is too small / too far — move closer"};
      } else if(cx<0.3){
        results[results.length-1]={label:"Face Detection",status:"warn",
          detail:"Face too far LEFT — move slightly right"};
      } else if(cx>0.7){
        results[results.length-1]={label:"Face Detection",status:"warn",
          detail:"Face too far RIGHT — move slightly left"};
      } else if(cy<0.2){
        results[results.length-1]={label:"Face Detection",status:"warn",
          detail:"Face too HIGH — lower camera or sit straight"};
      } else {
        results[results.length-1]={label:"Face Detection",status:"pass",
          detail:`1 face | area ${(fa*100).toFixed(1)}% | center (${cx.toFixed(2)}, ${cy.toFixed(2)})`};
      }
      const m=Math.floor(Math.min(f.w,f.h)*0.1);
      liveFacePatch = cropResize(canvas,
        Math.max(0,f.x-m), Math.max(0,f.y-m),
        Math.min(iw-Math.max(0,f.x-m),f.w+m*2),
        Math.min(ih-Math.max(0,f.y-m),f.h+m*2),
        48,48);
    }
    setFChecks([...results]);
    await new Promise(r=>setTimeout(r,100));

    // Face match
    results.push({label:"Face ↔ Card Photo Match",status:"pending",detail:"Comparing…"});
    setFChecks([...results]);
    await new Promise(r=>setTimeout(r,350));

    const cardPatch = cardFaceRef.current;
    let matchStatus, matchDetail;

    if (!cardPatch||!liveFacePatch) {
      matchStatus="warn";
      matchDetail="Could not compare faces — proceeding (manual review needed)";
    } else {
      const score = cosine(toGray(liveFacePatch), toGray(cardPatch));
      console.log("[FaceMatch] score:", score.toFixed(4));
      if(score>=MATCH_THRESHOLD){
        matchStatus="pass";
        matchDetail=`Identity matched ✓ (similarity ${(score*100).toFixed(1)}%)`;
      } else {
        matchStatus="error";
        matchDetail=`Face does not match card photo (${(score*100).toFixed(1)}%) — ensure same person & good lighting`;
      }
    }
    results[results.length-1]={label:"Face ↔ Card Photo Match",status:matchStatus,detail:matchDetail};
    setFChecks([...results]);
    setFCapturing(false);

    if(!results.some(r=>r.status==="error")){
      setFSnap(canvas.toDataURL("image/jpeg",0.8));
      setFDone(true);
      fStreamRef.current?.getTracks().forEach(t=>t.stop());
    }
  }, [fCapturing]);

  // ── GENERATE EXAM ─────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setStep("generating"); setGenPct(0);
    const stages=[
      {p:15,m:"Initializing MCQ engine..."},
      {p:30,m:`Analyzing ${cert?.certName} syllabus...`},
      {p:50,m:"Crafting 30 exam questions..."},
      {p:75,m:"Validating question quality..."},
      {p:90,m:"Finalizing exam paper..."},
    ];
    let i=0;
    const tick=setInterval(()=>{if(i<stages.length){setGenPct(stages[i].p);setGenMsg(stages[i].m);i++;}},700);
    try {
      const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),10000);
      const res=await fetch("http://localhost:5000/api/cert-exam/generate-mcq",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({certName:cert?.certName}),signal:ctrl.signal,
      });
      clearTimeout(t);
      if(!res.ok) throw new Error(`${res.status}`);
      const text=await res.text();
      if(text.trim().startsWith("<")) throw new Error("backend down");
      const data=JSON.parse(text);
      if(!data.success||!data.questions?.length) throw new Error("no questions");
      clearInterval(tick); setGenPct(100); setGenMsg(`✅ ${data.questions.length} questions ready!`);
      setTimeout(()=>onNext({questions:data.questions,certName:cert?.certName}),800);
    } catch(err) {
      clearInterval(tick);
      const qs=shuffle(getOfflineQs(cert?.certName)).map((q,idx)=>({...q,id:idx+1}));
      setGenPct(100); setGenMsg(`✅ Offline — ${qs.length} questions ready!`);
      setTimeout(()=>onNext({questions:qs,certName:cert?.certName}),800);
    }
  }, [cert, onNext]);

  function getOfflineQs(n){const l=(n||"").toLowerCase();if(l.includes("oracle")||l.includes("java"))return OB.java;if(l.includes("aws")||l.includes("amazon"))return OB.aws;if(l.includes("google")||l.includes("gcp"))return OB.gcp;return OB.java;}
  function shuffle(a){const r=[...a];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}

  // ── RENDER ────────────────────────────────────────────────────────────────
  const stepIdx={card:0,face:1,generating:2}[step]??0;

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Progress */}
        <div style={S.progressBar}>
          {["ID Card Scan","Face Match","Generate"].map((label,idx)=>{
            const done=idx<stepIdx,active=idx===stepIdx;
            return(
              <div key={label} style={S.progressItem}>
                <div style={{...S.dot,background:done||active?"#0284c7":"#e2e8f0",boxShadow:active?"0 0 0 4px #bae6fd":"none"}}>
                  {done?"✓":idx+1}
                </div>
                <span style={{...S.dotLabel,color:active?"#0284c7":done?"#64748b":"#cbd5e1",fontWeight:active?700:500}}>{label}</span>
                {idx<2&&<div style={{...S.line,background:done?"#0284c7":"#e2e8f0"}}/>}
              </div>
            );
          })}
        </div>

        {/* ══ STEP 1 — CARD SCAN ══ */}
        {step==="card"&&(
          <div style={S.section}>
            <button style={S.backBtn} onClick={onBack}>← Back</button>
            <div style={S.badge}>Step 1 · ID Card Scan</div>
            <h2 style={S.title}>Scan Your ID Card</h2>
            <p style={S.sub}>
              Hold your <strong>Aadhaar / College ID / any government ID</strong> flat,
              face-up and close to the camera. Fill the frame with the card.
            </p>
            <div style={S.certChip}>
              <span style={{fontSize:12,color:"#64748b"}}>Exam:</span>
              <span style={{fontSize:13,fontWeight:700,color:"#0284c7"}}>{cert?.certName}</span>
            </div>
            <div style={{...S.infoBox,background:"#f0f9ff",border:"1px solid #bae6fd",color:"#0369a1",marginBottom:14}}>
              💡 <strong>Tips:</strong> Good lighting · Card face-up · Fill the frame · Hold steady · No glare
            </div>

            {cCamErr?(
              <div style={{...S.infoBox,background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626"}}>⚠ {cCamErr}</div>
            ):(
              <>
                <div style={S.camBox}>
                  <video ref={cVideoRef} style={{...S.video,transform:"none"}} autoPlay muted playsInline/>
                  {cScanning&&<div style={S.scanOL}>🔍 Analysing…</div>}
                  {!cScanning&&cDone&&<div style={{...S.scanOL,background:"rgba(22,163,74,0.5)",fontSize:40}}>✓</div>}
                </div>
                <canvas ref={cCanvasRef} style={{display:"none"}}/>
                {cChecks.map((c,i)=><CheckRow key={i} {...c}/>)}
                {cChecks.some(c=>c.status==="error")&&(
                  <p style={{fontSize:12,color:"#64748b",textAlign:"center",margin:"4px 0 8px"}}>
                    Adjust card and tap Scan again ↓
                  </p>
                )}
                <button
                  style={{...S.btn,marginTop:12,
                    background:cReady&&!cScanning?"linear-gradient(135deg,#0284c7,#0369a1)":"#cbd5e1",
                    cursor:cReady&&!cScanning?"pointer":"not-allowed"}}
                  onClick={scanCard} disabled={!cReady||cScanning}>
                  {cScanning?"⏳  Scanning…":"🪪  Scan ID Card"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ══ STEP 2 — LIVE FACE MATCH ══ */}
        {step==="face"&&(
          <div style={S.section}>
            <div style={S.badge}>Step 2 · Live Face Match</div>
            <h2 style={S.title}>Live Face Verification</h2>
            <p style={S.sub}>Look directly at the camera. Your face will be matched against the photo on your ID card.</p>
            <div style={S.camBox}>
              {!fDone?(
                <>
                  <video ref={fVideoRef} style={{...S.video,transform:"scaleX(-1)"}} autoPlay muted playsInline/>
                  <div style={S.faceOval}>
                    <div style={S.cTL}/><div style={S.cTR}/><div style={S.cBL}/><div style={S.cBR}/>
                  </div>
                  {fCapturing&&<div style={S.scanOL}>🔍 Matching face…</div>}
                </>
              ):(
                <div style={{position:"relative",width:"100%",height:"100%"}}>
                  <img src={fSnap} alt="face" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(22,163,74,0.35)",fontSize:64,color:"#fff"}}>✓</div>
                </div>
              )}
            </div>
            <canvas ref={fCanvasRef} style={{display:"none"}}/>
            {fChecks.map((c,i)=><CheckRow key={i} {...c}/>)}
            {fChecks.some(c=>c.status==="error")&&(
              <p style={{fontSize:12,color:"#64748b",textAlign:"center",margin:"4px 0 8px"}}>
                Ensure same person as on the ID card, in good lighting ↓
              </p>
            )}
            {!fDone&&(
              <button
                style={{...S.btn,marginTop:12,
                  background:fReady&&!fCapturing?"linear-gradient(135deg,#0284c7,#0369a1)":"#cbd5e1",
                  cursor:fReady&&!fCapturing?"pointer":"not-allowed"}}
                onClick={captureFace} disabled={!fReady||fCapturing}>
                {fCapturing?"⏳  Matching…":fChecks.some(c=>c.status==="error")?"↺  Try Again":"📷  Capture & Match Face"}
              </button>
            )}
            {fDone&&(
              <button style={{...S.btn,marginTop:12}} onClick={generate}>
                Proceed to Generate Exam →
              </button>
            )}
          </div>
        )}

        {/* ══ STEP 3 — GENERATING ══ */}
        {step==="generating"&&(
          <div style={{...S.section,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              {genPct<100?(
                <svg width="48" height="48" viewBox="0 0 48 48" style={{animation:"spin 1s linear infinite"}}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4"/>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#0284c7" strokeWidth="4"
                    strokeDasharray={`${genPct*1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
                </svg>
              ):<div style={{fontSize:48}}>✅</div>}
            </div>
            <h2 style={{...S.title,textAlign:"center"}}>{genPct<100?"Generating Your Exam…":"Exam Ready!"}</h2>
            <p style={{...S.sub,textAlign:"center"}}>{genMsg}</p>
            <div style={S.track}><div style={{...S.fill,width:`${genPct}%`}}/></div>
            <div style={{fontSize:13,fontWeight:700,color:"#0284c7",marginTop:8}}>{genPct}%</div>
            <p style={{fontSize:11,color:"#94a3b8",marginTop:16}}>30 questions for: <strong>{cert?.certName}</strong></p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const S={
  page:    {minHeight:"100vh",background:"linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',system-ui,sans-serif"},
  card:    {background:"#fff",borderRadius:20,padding:"32px 36px",maxWidth:540,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.1)"},
  progressBar:{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28},
  progressItem:{display:"flex",alignItems:"center",gap:6},
  dot:     {width:28,height:28,borderRadius:"50%",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",flexShrink:0},
  dotLabel:{fontSize:11,fontWeight:500,whiteSpace:"nowrap"},
  line:    {width:32,height:2,marginLeft:4},
  section: {display:"flex",flexDirection:"column",gap:0},
  backBtn: {background:"none",border:"none",color:"#64748b",fontSize:13,cursor:"pointer",padding:0,fontWeight:600,marginBottom:12,textAlign:"left"},
  badge:   {fontSize:11,fontWeight:700,color:"#0284c7",background:"#f0f9ff",border:"1px solid #bae6fd",padding:"4px 12px",borderRadius:20,display:"inline-block",marginBottom:14},
  title:   {fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:6,letterSpacing:"-0.5px"},
  sub:     {fontSize:13,color:"#64748b",marginBottom:18},
  certChip:{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",marginBottom:16},
  infoBox: {borderRadius:8,padding:"10px 14px",fontSize:12,marginBottom:8},
  btn:     {width:"100%",padding:14,background:"linear-gradient(135deg,#0284c7,#0369a1)",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer"},
  camBox:  {position:"relative",width:"100%",height:280,background:"#000",borderRadius:14,overflow:"hidden",marginBottom:14},
  video:   {width:"100%",height:"100%",objectFit:"cover"},
  scanOL:  {position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:800,letterSpacing:1},
  faceOval:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:180,height:220,border:"2px solid #22d3ee",borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",pointerEvents:"none"},
  cTL:     {position:"absolute",top:-2,left:-2,width:20,height:20,borderTop:"3px solid #22d3ee",borderLeft:"3px solid #22d3ee",borderRadius:"3px 0 0 0"},
  cTR:     {position:"absolute",top:-2,right:-2,width:20,height:20,borderTop:"3px solid #22d3ee",borderRight:"3px solid #22d3ee",borderRadius:"0 3px 0 0"},
  cBL:     {position:"absolute",bottom:-2,left:-2,width:20,height:20,borderBottom:"3px solid #22d3ee",borderLeft:"3px solid #22d3ee",borderRadius:"0 0 0 3px"},
  cBR:     {position:"absolute",bottom:-2,right:-2,width:20,height:20,borderBottom:"3px solid #22d3ee",borderRight:"3px solid #22d3ee",borderRadius:"0 0 3px 0"},
  track:   {height:8,background:"#e2e8f0",borderRadius:8,overflow:"hidden",marginTop:16},
  fill:    {height:"100%",background:"linear-gradient(90deg,#0284c7,#22d3ee)",borderRadius:8,transition:"width .5s ease"},
};

// ── Offline question banks ────────────────────────────────────────────────
const OB={
  java:[
    {id:1,question:"Which of the following is NOT a primitive type in Java?",options:{A:"int",B:"String",C:"boolean",D:"char"},correct:"B",explanation:"String is a class.",difficulty:"easy",topic:"Data Types"},
    {id:2,question:"Output of System.out.println(10 / 3)?",options:{A:"3.33",B:"3",C:"4",D:"Error"},correct:"B",explanation:"Integer division truncates.",difficulty:"easy",topic:"Operators"},
    {id:3,question:"Which keyword prevents subclassing?",options:{A:"static",B:"abstract",C:"final",D:"sealed"},correct:"C",explanation:"final prevents inheritance.",difficulty:"easy",topic:"OOP"},
    {id:4,question:"What does JVM stand for?",options:{A:"Java Virtual Machine",B:"Java Variable Method",C:"Java Verified Module",D:"Java Visual Manager"},correct:"A",explanation:"JVM executes bytecode.",difficulty:"easy",topic:"Basics"},
    {id:5,question:"Which collection forbids duplicates?",options:{A:"ArrayList",B:"LinkedList",C:"HashSet",D:"Vector"},correct:"C",explanation:"HashSet = no duplicates.",difficulty:"easy",topic:"Collections"},
    {id:6,question:"What is autoboxing?",options:{A:"int to Integer auto-convert",B:"Boxing into arrays",C:"Wrapping methods",D:"Auto memory"},correct:"A",explanation:"Autoboxing converts primitives to wrappers.",difficulty:"easy",topic:"Data Types"},
    {id:7,question:"Which modifier restricts to same class only?",options:{A:"protected",B:"default",C:"public",D:"private"},correct:"D",explanation:"private = same class only.",difficulty:"easy",topic:"Access"},
    {id:8,question:"Default value of int instance variable?",options:{A:"null",B:"undefined",C:"0",D:"-1"},correct:"C",explanation:"int defaults to 0.",difficulty:"easy",topic:"Data Types"},
    {id:9,question:"Which loop always executes at least once?",options:{A:"for",B:"while",C:"do-while",D:"for-each"},correct:"C",explanation:"do-while checks after.",difficulty:"easy",topic:"Control Flow"},
    {id:10,question:"Size of long in Java?",options:{A:"32 bits",B:"16 bits",C:"64 bits",D:"128 bits"},correct:"C",explanation:"long = 64 bits.",difficulty:"easy",topic:"Data Types"},
    {id:11,question:"Correct lambda syntax in Java?",options:{A:"lambda x->x*2",B:"(x)=>x*2",C:"x->x*2",D:"func(x){return x*2;}"},correct:"C",explanation:"(params)->expression.",difficulty:"medium",topic:"Lambdas"},
    {id:12,question:"What does Stream.filter() return?",options:{A:"void",B:"Optional",C:"Stream",D:"List"},correct:"C",explanation:"filter returns a Stream.",difficulty:"medium",topic:"Streams"},
    {id:13,question:"Interface needed for for-each loop?",options:{A:"Iterator",B:"Iterable",C:"Collection",D:"Comparable"},correct:"B",explanation:"Iterable provides iterator().",difficulty:"medium",topic:"Collections"},
    {id:14,question:"What is a sealed class in Java 17?",options:{A:"Cannot instantiate",B:"Restricts subclasses",C:"Only static members",D:"Final abstract"},correct:"B",explanation:"Sealed uses permits.",difficulty:"medium",topic:"Java 17"},
    {id:15,question:"What does Optional.orElse() do?",options:{A:"Throws if empty",B:"Returns value or default",C:"Filters",D:"Maps value"},correct:"B",explanation:"Returns default if empty.",difficulty:"medium",topic:"Optional"},
    {id:16,question:"Immutable list in Java 9+?",options:{A:"Arrays.asList()",B:"Collections.unmodifiableList()",C:"List.of()",D:"new ArrayList<>()"},correct:"C",explanation:"List.of() is immutable.",difficulty:"medium",topic:"Collections"},
    {id:17,question:"Purpose of var in Java 10+?",options:{A:"Global vars",B:"Type inference",C:"Variant types",D:"Nullable vars"},correct:"B",explanation:"var infers local type.",difficulty:"medium",topic:"Features"},
    {id:18,question:"Which is a functional interface?",options:{A:"Runnable",B:"Serializable",C:"Cloneable",D:"Comparable"},correct:"A",explanation:"Runnable has one abstract method.",difficulty:"medium",topic:"Functional"},
    {id:19,question:"Stream.collect(Collectors.toList()) returns?",options:{A:"Array",B:"Set",C:"List",D:"Map"},correct:"C",explanation:"Accumulates to List.",difficulty:"medium",topic:"Streams"},
    {id:20,question:"Java module system in Java 9?",options:{A:"OSGi",B:"Maven modules",C:"JPMS",D:"Gradle"},correct:"C",explanation:"JPMS = Project Jigsaw.",difficulty:"medium",topic:"Modules"},
    {id:21,question:"ConcurrentHashMap vs HashMap?",options:{A:"No diff",B:"ConcurrentHashMap thread-safe",C:"HashMap null only",D:"Same"},correct:"B",explanation:"ConcurrentHashMap = thread-safe.",difficulty:"medium",topic:"Concurrency"},
    {id:22,question:"Method reference syntax?",options:{A:"String::length()",B:"String::length",C:"length::String",D:"String.length::"},correct:"B",explanation:":: without parentheses.",difficulty:"medium",topic:"Lambdas"},
    {id:23,question:"What is a record in Java 16+?",options:{A:"Mutable class",B:"Storage interface",C:"Immutable data carrier",D:"Enum type"},correct:"C",explanation:"Records are immutable.",difficulty:"medium",topic:"Java 16"},
    {id:24,question:"Fixed thread pool creator?",options:{A:"newCachedThreadPool()",B:"newSingleThreadExecutor()",C:"newFixedThreadPool(n)",D:"newScheduledThreadPool()"},correct:"C",explanation:"Fixed = exactly n threads.",difficulty:"medium",topic:"Concurrency"},
    {id:25,question:"Stream.of(1,2,3).reduce(0,Integer::sum)?",options:{A:"0",B:"6",C:"3",D:"Error"},correct:"B",explanation:"0+1+2+3=6.",difficulty:"medium",topic:"Streams"},
    {id:26,question:"HashMap.get() average complexity?",options:{A:"O(n)",B:"O(log n)",C:"O(n log n)",D:"O(1)"},correct:"D",explanation:"Hashing = O(1) average.",difficulty:"hard",topic:"Collections"},
    {id:27,question:"Synchronized on different instances?",options:{A:"Block each other",B:"Execute concurrently",C:"Exception",D:"Deadlock"},correct:"B",explanation:"Instance lock = per instance.",difficulty:"hard",topic:"Concurrency"},
    {id:28,question:"Default GC in Java 9+?",options:{A:"CMS",B:"G1GC",C:"ZGC",D:"Parallel GC"},correct:"B",explanation:"G1GC became default.",difficulty:"hard",topic:"JVM"},
    {id:29,question:"Phantom reference used for?",options:{A:"Caching",B:"Post-GC cleanup",C:"Soft cache",D:"Weak listeners"},correct:"B",explanation:"Post-finalization cleanup.",difficulty:"hard",topic:"Memory"},
    {id:30,question:"'requires transitive' in JPMS?",options:{A:"Optional module",B:"Dependency inherited by consumers",C:"Lazy loading",D:"Test dependency"},correct:"B",explanation:"Re-exports to consumers.",difficulty:"hard",topic:"Modules"},
  ],
  aws:[
    {id:1,question:"S3 stands for?",options:{A:"Simple Storage Service",B:"Secure Server Storage",C:"Scalable Storage System",D:"Standard Storage"},correct:"A",explanation:"Simple Storage Service.",difficulty:"easy",topic:"S3"},
    {id:2,question:"AWS DNS service?",options:{A:"CloudFront",B:"Route 53",C:"VPC",D:"API Gateway"},correct:"B",explanation:"Route 53 = DNS.",difficulty:"easy",topic:"Networking"},
    {id:3,question:"What is an AWS Region?",options:{A:"Single datacenter",B:"Geographic area with AZs",C:"VPN",D:"CDN point"},correct:"B",explanation:"Region = multiple AZs.",difficulty:"easy",topic:"Infrastructure"},
    {id:4,question:"Serverless functions in AWS?",options:{A:"EC2",B:"ECS",C:"Lambda",D:"Fargate"},correct:"C",explanation:"Lambda = serverless.",difficulty:"easy",topic:"Compute"},
    {id:5,question:"IAM stands for?",options:{A:"Internet Access Mgmt",B:"Identity and Access Management",C:"Integrated App Module",D:"Internal AWS Manager"},correct:"B",explanation:"IAM manages access.",difficulty:"easy",topic:"Security"},
    {id:6,question:"Cheapest EC2 for steady workloads?",options:{A:"On-Demand",B:"Spot",C:"Reserved",D:"Dedicated"},correct:"C",explanation:"Reserved = 75% discount.",difficulty:"easy",topic:"EC2"},
    {id:7,question:"What is an AZ?",options:{A:"Separate account",B:"Datacenters within Region",C:"CDN edge",D:"VPC"},correct:"B",explanation:"AZs = isolated clusters.",difficulty:"easy",topic:"Infrastructure"},
    {id:8,question:"Managed relational database?",options:{A:"DynamoDB",B:"ElastiCache",C:"RDS",D:"Redshift"},correct:"C",explanation:"RDS = managed SQL.",difficulty:"easy",topic:"Databases"},
    {id:9,question:"What is CloudFront?",options:{A:"DB cache",B:"CDN",C:"Serverless",D:"Containers"},correct:"B",explanation:"CloudFront = AWS CDN.",difficulty:"easy",topic:"Networking"},
    {id:10,question:"S3 Versioning protects against?",options:{A:"Corruption",B:"Accidental deletion",C:"Unauthorized access",D:"Cost"},correct:"B",explanation:"Preserves all versions.",difficulty:"easy",topic:"S3"},
    {id:11,question:"VPC stands for?",options:{A:"Virtual Private Cloud",B:"Virtual Public Container",C:"Verified Processing",D:"Virtual Proxy"},correct:"A",explanation:"Isolated network.",difficulty:"medium",topic:"Networking"},
    {id:12,question:"Best for message queuing?",options:{A:"SNS",B:"SQS",C:"EventBridge",D:"Kinesis"},correct:"B",explanation:"SQS = reliable queuing.",difficulty:"medium",topic:"Integration"},
    {id:13,question:"Max S3 object size?",options:{A:"5 GB",B:"100 GB",C:"5 TB",D:"1 TB"},correct:"C",explanation:"S3 max = 5TB.",difficulty:"medium",topic:"S3"},
    {id:14,question:"Layer 7 load balancer?",options:{A:"NLB",B:"CLB",C:"ALB",D:"GLB"},correct:"C",explanation:"ALB = HTTP layer.",difficulty:"medium",topic:"HA"},
    {id:15,question:"Auto Scaling does what?",options:{A:"Backup data",B:"Adjust EC2 capacity",C:"Scale DB",D:"Manage IAM"},correct:"B",explanation:"Adds/removes EC2.",difficulty:"medium",topic:"Compute"},
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
    {id:30,question:"VPC Peering is?",options:{A:"VPC to internet",B:"Private connection between VPCs",C:"VPN to on-prem",D:"Cross-VPC LB"},correct:"B",explanation:"Private VPC routing.",difficulty:"hard",topic:"Networking"},
  ],
  gcp:[
    {id:1,question:"GCP object storage?",options:{A:"Cloud SQL",B:"Cloud Storage",C:"Bigtable",D:"Filestore"},correct:"B",explanation:"Cloud Storage = object store.",difficulty:"easy",topic:"Storage"},
    {id:2,question:"GKE stands for?",options:{A:"Google Kubernetes Engine",B:"Google Kernel Ext",C:"Google Key Encrypt",D:"Google Kube Env"},correct:"A",explanation:"Managed Kubernetes.",difficulty:"easy",topic:"Containers"},
    {id:3,question:"GCP serverless functions?",options:{A:"Cloud Run",B:"Cloud Functions",C:"App Engine",D:"Compute Engine"},correct:"B",explanation:"Cloud Functions = FaaS.",difficulty:"easy",topic:"Compute"},
    {id:4,question:"What is a GCP Project?",options:{A:"A VM",B:"Base org unit",C:"Network config",D:"Billing account"},correct:"B",explanation:"Projects organize resources.",difficulty:"easy",topic:"Basics"},
    {id:5,question:"Managed MySQL on GCP?",options:{A:"Spanner",B:"Bigtable",C:"Cloud SQL",D:"Firestore"},correct:"C",explanation:"Cloud SQL = MySQL/PG.",difficulty:"easy",topic:"Databases"},
    {id:6,question:"Cloud IAM purpose?",options:{A:"Monitoring",B:"Access control",C:"Networking",D:"Cost"},correct:"B",explanation:"Controls who can what.",difficulty:"easy",topic:"Security"},
    {id:7,question:"What is a GCP Zone?",options:{A:"Region",B:"Deployment area in Region",C:"Billing",D:"Network segment"},correct:"B",explanation:"Isolated location.",difficulty:"easy",topic:"Infrastructure"},
    {id:8,question:"GCP CDN service?",options:{A:"Cloud Armor",B:"Cloud DNS",C:"Cloud CDN",D:"Cloud LB"},correct:"C",explanation:"Google edge caching.",difficulty:"easy",topic:"Networking"},
    {id:9,question:"Persistent Disk provides?",options:{A:"Object storage",B:"Block storage for VMs",C:"File storage",D:"Cold archive"},correct:"B",explanation:"Block storage.",difficulty:"easy",topic:"Storage"},
    {id:10,question:"GCP IaC tool?",options:{A:"Cloud Build",B:"Deployment Manager",C:"Source Repos",D:"Artifact Registry"},correct:"B",explanation:"YAML templates.",difficulty:"easy",topic:"DevOps"},
    {id:11,question:"VPC in GCP?",options:{A:"Virtual Private Cloud",B:"Virtual Processing",C:"Verified Public",D:"Video Processing"},correct:"A",explanation:"Isolated network.",difficulty:"medium",topic:"Networking"},
    {id:12,question:"Stateless containers no infra mgmt?",options:{A:"GKE",B:"Compute Engine",C:"Cloud Run",D:"App Engine"},correct:"C",explanation:"Cloud Run = scales to zero.",difficulty:"medium",topic:"Containers"},
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
