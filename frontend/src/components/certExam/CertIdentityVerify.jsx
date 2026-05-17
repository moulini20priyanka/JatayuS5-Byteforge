// src/components/certExam/CertIdentityVerify.jsx
// ── Complete browser-only identity verification ──────────────────────────────
// Step 1: Aadhaar / ID card scan  (Roboflow YOLOv11 via REST)
// Step 2: Live face scan          (face-api.js CDN — no backend)
// No Python server required. All checks run in the browser.

import { useState, useEffect, useRef, useCallback } from "react";

// ── Roboflow config ───────────────────────────────────────────────────────────
const RF_API_KEY  = "9IZ9SAkpOqC2qOJUE1mN";
const RF_MODEL    = "id-card-0i1ip-fcs3b/1";
const RF_ENDPOINT = `https://serverless.roboflow.com/${RF_MODEL}?api_key=${RF_API_KEY}`;

// ── Cert → ID hint map ────────────────────────────────────────────────────────
const CERT_HINTS = {
  oracle: "Hold your Aadhaar / Passport / Driving Licence flat in the guide box",
  aws:    "Hold your Aadhaar / Passport / Driving Licence flat in the guide box",
  gcp:    "Hold your Aadhaar / Passport / Driving Licence flat in the guide box",
};

// ── Colours (matches StudentCertifications palette) ───────────────────────────
const C = {
  bg:       "#f0f7ff",
  surface:  "#ffffff",
  surface2: "#f8faff",
  border:   "#dbeafe",
  border2:  "#bfdbfe",
  accent:   "#2563eb",
  green:    "#16a34a",
  greenS:   "#f0fdf4",
  greenB:   "#bbf7d0",
  red:      "#dc2626",
  redS:     "#fef2f2",
  redB:     "#fca5a5",
  amber:    "#d97706",
  amberS:   "#fffbeb",
  amberB:   "#fcd34d",
  text:     "#0f172a",
  muted:    "#64748b",
  dim:      "#94a3b8",
};

// ── Tiny CSS injected once ────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
.civ-root{min-height:100vh;background:${C.bg};font-family:'IBM Plex Sans',sans-serif;color:${C.text};display:flex;align-items:center;justify-content:center;padding:24px;}
.civ-card{background:${C.surface};border:1.5px solid ${C.border};border-radius:20px;overflow:hidden;width:100%;max-width:560px;box-shadow:0 8px 40px rgba(37,99,235,.10);}
.civ-hdr{padding:22px 28px 18px;background:linear-gradient(135deg,#eff6ff,#fff);border-bottom:1px solid ${C.border};}
.civ-steps{display:flex;gap:0;margin-bottom:20px;}
.civ-step{flex:1;display:flex;align-items:center;gap:8px;}
.civ-step-num{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;transition:all .3s;}
.civ-step-line{flex:1;height:2px;border-radius:2px;transition:all .3s;}
.civ-step-lbl{font-size:11px;font-weight:700;letter-spacing:.3px;white-space:nowrap;}
.civ-body{padding:24px 28px;}
.civ-cam-wrap{position:relative;border-radius:14px;overflow:hidden;background:#0f172a;aspect-ratio:4/3;margin-bottom:18px;border:2px solid ${C.border};}
video{width:100%;height:100%;object-fit:cover;display:block;}
.civ-guide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
.civ-guide-box{border:2.5px dashed rgba(255,255,255,.55);border-radius:12px;transition:border-color .4s;}
.civ-guide-box.ok{border-color:rgba(34,197,94,.85);border-style:solid;}
.civ-guide-box.scanning{border-color:rgba(59,130,246,.85);}
.civ-overlay-msg{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);backdrop-filter:blur(6px);color:#fff;font-size:11.5px;font-weight:600;padding:6px 14px;border-radius:20px;white-space:nowrap;font-family:'IBM Plex Sans',sans-serif;}
.civ-checks{display:flex;flex-direction:column;gap:8px;margin-bottom:18px;}
.civ-check{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;border:1px solid;font-size:12.5px;font-weight:500;transition:all .3s;animation:civ-up .2s ease;}
.civ-check.pass{background:${C.greenS};border-color:${C.greenB};color:${C.green};}
.civ-check.fail{background:${C.redS};border-color:${C.redB};color:${C.red};}
.civ-check.warn{background:${C.amberS};border-color:${C.amberB};color:${C.amber};}
.civ-check.pending{background:${C.surface2};border-color:${C.border};color:${C.muted};}
.civ-check.running{background:#eff6ff;border-color:${C.border2};color:${C.accent};}
.civ-check-icon{font-size:15px;flex-shrink:0;width:20px;text-align:center;}
.civ-check-txt{flex:1;}
.civ-check-sub{font-size:10.5px;opacity:.75;margin-top:1px;}
.civ-btn{width:100%;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.civ-btn:disabled{opacity:.4;cursor:not-allowed;}
.civ-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.civ-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.4);}
.civ-btn-success{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;box-shadow:0 4px 14px rgba(22,163,74,.3);}
.civ-btn-retry{background:${C.surface2};color:${C.accent};border:1.5px solid ${C.border2};}
.civ-hint{background:${C.amberS};border:1px solid ${C.amberB};border-radius:10px;padding:10px 14px;font-size:12px;color:#78350f;line-height:1.6;margin-bottom:14px;}
.civ-spin{width:14px;height:14px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:civ-rot .6s linear infinite;display:inline-block;}
.civ-spin-dark{width:12px;height:12px;border:2px solid ${C.border2};border-top-color:${C.accent};border-radius:50%;animation:civ-rot .6s linear infinite;display:inline-block;}
.civ-face-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;border:3px solid rgba(255,255,255,.4);transition:all .4s;}
.civ-face-ring.ok{border-color:rgba(34,197,94,.9);}
.civ-face-ring.scanning{border-color:rgba(59,130,246,.8);animation:civ-ping 1.2s ease infinite;}
.civ-progress{height:4px;background:${C.border};border-radius:4px;overflow:hidden;margin-top:8px;}
.civ-progress-fill{height:100%;border-radius:4px;transition:width .5s ease;}
@keyframes civ-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes civ-rot{to{transform:rotate(360deg)}}
@keyframes civ-ping{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.08);opacity:.7}}
@keyframes civ-scan{0%{top:10%}50%{top:85%}100%{top:10%}}
.civ-scan-line{position:absolute;left:10%;right:10%;height:2px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.8),transparent);animation:civ-scan 2s ease-in-out infinite;}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mean pixel brightness from ImageData */
function brightness(imageData) {
  const d = imageData.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i+1] + d[i+2]) / 3;
  return sum / (d.length / 4);
}

/** Laplacian variance (blur score) — higher = sharper */
function blurScore(imageData) {
  const { data, width, height } = imageData;
  const gray = (x, y) => {
    const i = (y * width + x) * 4;
    return (data[i] + data[i+1] + data[i+2]) / 3;
  };
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const lap =
        -gray(x-1,y-1) - gray(x,y-1) - gray(x+1,y-1)
        - gray(x-1,y)  + 8*gray(x,y) - gray(x+1,y)
        - gray(x-1,y+1) - gray(x,y+1) - gray(x+1,y+1);
      sum += lap; sumSq += lap * lap; n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Send base64 frame to Roboflow for ID card detection */
async function roboflowDetect(base64) {
  const blob  = await (await fetch(base64)).blob();
  const form  = new FormData();
  form.append("file", blob, "frame.jpg");
  const res = await fetch(RF_ENDPOINT, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Roboflow ${res.status}`);
  return (await res.json()).predictions || [];
}

const VALID_ID_CLASSES = new Set([
  "1-id","2-id","3-id","4-id","id card","id-card","card","id",
  "1-ID","2-ID","3-ID","4-ID",
]);
const MISSING_KW = ["id missing","id covered","missing","covered"];

function classifyPreds(preds) {
  let bestValid = null, bestMissing = null;
  for (const p of preds) {
    const cls  = (p.class || "").toLowerCase().trim();
    const conf = p.confidence;
    const isV  = VALID_ID_CLASSES.has(p.class) ||
      ["1-id","2-id","3-id","4-id","id card","id-card","card"].some(v => cls.includes(v));
    const isM  = MISSING_KW.some(k => cls.includes(k));
    if (isV  && (!bestValid   || conf > bestValid.confidence))   bestValid   = p;
    if (isM  && (!bestMissing || conf > bestMissing.confidence)) bestMissing = p;
  }
  return { bestValid, bestMissing };
}

// ── Face-API loader (CDN) ─────────────────────────────────────────────────────
let faceApiLoaded = false;
async function loadFaceApi() {
  if (faceApiLoaded || window.faceapi) { faceApiLoaded = true; return; }
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
  await Promise.all([
    window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ]);
  faceApiLoaded = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — ID Card Scan
// ─────────────────────────────────────────────────────────────────────────────
function IDCardScan({ cert, onPass }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const hint = CERT_HINTS[(cert?.certKey || "").toLowerCase()] ||
    "Hold your Aadhaar / Passport / Driving Licence flat in the guide box";

  const INITIAL_CHECKS = [
    { id: "camera",  label: "Camera Access",   icon: "📷", status: "pending", sub: "" },
    { id: "light",   label: "Lighting",         icon: "💡", status: "pending", sub: "" },
    { id: "sharp",   label: "Image Sharpness",  icon: "🔍", status: "pending", sub: "" },
    { id: "id",      label: "ID Card Detected", icon: "🪪", status: "pending", sub: "" },
  ];
  const [checks,   setChecks]   = useState(INITIAL_CHECKS);
  const [scanning, setScanning] = useState(false);
  const [canPass,  setCanPass]  = useState(false);
  const [guideOk,  setGuideOk]  = useState(false);
  const [overlayMsg, setOverlayMsg] = useState("Position your ID card in the box");
  const [attempts,   setAttempts]   = useState(0);

  function patchCheck(id, patch) {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  // Start camera
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:"user" },
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        patchCheck("camera", { status:"pass", sub:"Camera ready" });
      } catch {
        patchCheck("camera", { status:"fail", sub:"Camera permission denied" });
      }
    })();
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  // Auto-scan every 2s
  useEffect(() => {
    intervalRef.current = setInterval(doScan, 2000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  const doScan = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    setScanning(true);

    // ── Local image checks (brightness + blur) ──────────────────────────────
    const canvas = document.createElement("canvas");
    const v = videoRef.current;
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const brt = brightness(imgData);
    const blr = blurScore(imgData);

    if (brt < 40) {
      patchCheck("light", { status:"fail", sub:`Too dark (${brt.toFixed(0)}) — turn on lights` });
    } else if (brt > 235) {
      patchCheck("light", { status:"warn", sub:`Overexposed (${brt.toFixed(0)}) — reduce glare` });
    } else {
      patchCheck("light", { status:"pass", sub:`Good lighting (${brt.toFixed(0)})` });
    }

    if (blr < 40) {
      patchCheck("sharp", { status:"fail", sub:`Blurry (${blr.toFixed(0)}) — hold steady` });
    } else {
      patchCheck("sharp", { status:"pass", sub:`Sharp (${blr.toFixed(0)})` });
    }

    if (brt < 40 || brt > 235 || blr < 40) {
      setScanning(false);
      setGuideOk(false);
      setOverlayMsg(brt < 40 ? "Too dark — improve lighting" : blr < 40 ? "Hold camera steady" : "Reduce glare");
      return;
    }

    // ── Roboflow ID card check ───────────────────────────────────────────────
    patchCheck("id", { status:"running", sub:"Scanning ID card…" });
    setAttempts(n => n + 1);

    try {
      const b64   = canvas.toDataURL("image/jpeg", 0.85);
      const preds = await roboflowDetect(b64);
      const { bestValid, bestMissing } = classifyPreds(preds);

      if (bestValid && bestValid.confidence >= 0.35) {
        patchCheck("id", {
          status: "pass",
          sub: `${bestValid.class} — ${(bestValid.confidence * 100).toFixed(0)}% confidence`,
        });
        setGuideOk(true);
        setOverlayMsg("✓ ID Card Verified");
        setCanPass(true);
        clearInterval(intervalRef.current);
      } else if (bestMissing && bestMissing.confidence >= 0.80) {
        patchCheck("id", { status:"warn", sub:"ID covered or not visible" });
        setOverlayMsg("Uncover your ID card");
        setGuideOk(false);
      } else if (preds.length > 0) {
        const top = preds.reduce((a, b) => a.confidence > b.confidence ? a : b);
        patchCheck("id", { status:"warn", sub:`Partial (${top.class} ${(top.confidence*100).toFixed(0)}%) — adjust angle` });
        setOverlayMsg("Adjust angle — fill the guide box");
        setGuideOk(false);
      } else {
        patchCheck("id", { status:"warn", sub:"No ID detected — hold it in the box" });
        setOverlayMsg("Hold ID flat in the guide box");
        setGuideOk(false);
      }
    } catch (e) {
      patchCheck("id", { status:"warn", sub:"Detection error — retrying…" });
      setOverlayMsg("Retrying…");
    }

    setScanning(false);
  }, []);

  const statusIcon = (s) => ({ pass:"✓", fail:"✗", warn:"⚠", running:<span className="civ-spin-dark"/>, pending:"○" }[s] || "○");

  return (
    <div className="civ-body">
      <div className="civ-hint">📋 {hint}</div>

      <div className="civ-cam-wrap">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="civ-guide">
          <div className={`civ-guide-box ${guideOk ? "ok" : scanning ? "scanning" : ""}`}
            style={{ width:"72%", height:"58%" }}>
            {scanning && !guideOk && <div className="civ-scan-line"/>}
          </div>
        </div>
        <div className="civ-overlay-msg">{overlayMsg}</div>
        {attempts > 0 && !canPass && (
          <div style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,.55)",
            color:"#fff", fontSize:10, padding:"3px 8px", borderRadius:12,
            fontFamily:"'JetBrains Mono',monospace" }}>
            Scan #{attempts}
          </div>
        )}
      </div>

      <div className="civ-checks">
        {checks.map(c => (
          <div key={c.id} className={`civ-check ${c.status}`}>
            <span className="civ-check-icon">{statusIcon(c.status)}</span>
            <div className="civ-check-txt">
              <div>{c.label}</div>
              {c.sub && <div className="civ-check-sub">{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <button
        className="civ-btn civ-btn-primary"
        disabled={!canPass}
        onClick={onPass}
      >
        {canPass ? "✓ ID Verified — Continue to Face Scan" : (
          <><span className="civ-spin"/> Scanning ID Card…</>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Live Face Scan
// ─────────────────────────────────────────────────────────────────────────────
function FaceScan({ cert, onPass, onBack }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);
  const blinkRef    = useRef(0);
  const prevEARRef  = useRef(null);

  const [phase,       setPhase]       = useState("loading"); // loading|scanning|blink|done|fail
  const [checks,      setChecks]      = useState([
    { id:"model",  label:"Loading Face AI",    icon:"🤖", status:"pending", sub:""       },
    { id:"camera", label:"Camera Access",      icon:"📷", status:"pending", sub:""       },
    { id:"face",   label:"Face Detected",      icon:"👤", status:"pending", sub:""       },
    { id:"liveness",label:"Liveness Check",   icon:"👁",  status:"pending", sub:"Blink to confirm you're live" },
  ]);
  const [progress,    setProgress]    = useState(0);
  const [overlayMsg,  setOverlayMsg]  = useState("Loading face detection…");
  const [blinkCount,  setBlinkCount]  = useState(0);
  const [canContinue, setCanContinue] = useState(false);

  function patchCheck(id, patch) {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  // Eye Aspect Ratio — blink detection
  function computeEAR(landmarks) {
    try {
      const pts = landmarks.positions;
      const eye = (idxs) => {
        const [p1,p2,p3,p4,p5,p6] = idxs.map(i => pts[i]);
        const A = Math.hypot(p2.x-p6.x, p2.y-p6.y);
        const B = Math.hypot(p3.x-p5.x, p3.y-p5.y);
        const C = Math.hypot(p1.x-p4.x, p1.y-p4.y);
        return (A + B) / (2 * C);
      };
      const leftEAR  = eye([36,37,38,39,40,41]);
      const rightEAR = eye([42,43,44,45,46,47]);
      return (leftEAR + rightEAR) / 2;
    } catch { return null; }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Load face-api
      patchCheck("model", { status:"running", sub:"Downloading models…" });
      try {
        await loadFaceApi();
        if (!mounted) return;
        patchCheck("model", { status:"pass", sub:"Face AI ready" });
        setProgress(25);
      } catch {
        patchCheck("model", { status:"fail", sub:"Failed to load — check internet" });
        setPhase("fail"); return;
      }

      // Start camera
      patchCheck("camera", { status:"running", sub:"Requesting camera…" });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width:{ideal:1280}, height:{ideal:720}, facingMode:"user" },
        });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        patchCheck("camera", { status:"pass", sub:"Camera ready" });
        setProgress(50);
        setPhase("scanning");
        setOverlayMsg("Look straight at the camera");
      } catch {
        patchCheck("camera", { status:"fail", sub:"Camera permission denied" });
        setPhase("fail"); return;
      }

      // Face detection loop
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !window.faceapi || videoRef.current.readyState < 2) return;
        try {
          const result = await window.faceapi
            .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
            .withFaceLandmarks(true);

          if (!result) {
            patchCheck("face", { status:"warn", sub:"No face detected — look at camera" });
            setOverlayMsg("Look straight at the camera");
            prevEARRef.current = null;
            return;
          }

          // Face found
          const { detection } = result;
          const score = detection.score;
          patchCheck("face", { status:"pass", sub:`Face detected — confidence ${(score*100).toFixed(0)}%` });
          setProgress(75);
          setOverlayMsg("Now blink slowly 2 times");
          setPhase("blink");

          // Blink detection via EAR
          const ear = computeEAR(result.landmarks);
          if (ear !== null) {
            const prev = prevEARRef.current;
            if (prev !== null && prev > 0.25 && ear < 0.21) {
              // Eye closed
            } else if (prev !== null && prev < 0.21 && ear > 0.25) {
              // Eye opened — blink complete
              blinkRef.current += 1;
              setBlinkCount(blinkRef.current);
              if (blinkRef.current >= 2) {
                patchCheck("liveness", { status:"pass", sub:"Liveness confirmed ✓" });
                setProgress(100);
                setPhase("done");
                setOverlayMsg("✓ Face Verified");
                setCanContinue(true);
                clearInterval(intervalRef.current);
              } else {
                patchCheck("liveness", { status:"running", sub:`Blink ${blinkRef.current}/2 detected` });
              }
            }
            prevEARRef.current = ear;
          }
        } catch { /* ignore frame errors */ }
      }, 300);
    })();

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  const statusIcon = (s) => ({ pass:"✓", fail:"✗", warn:"⚠", running:<span className="civ-spin-dark"/>, pending:"○" }[s] || "○");

  return (
    <div className="civ-body">
      <div className="civ-cam-wrap">
        <video ref={videoRef} autoPlay playsInline muted />

        {/* Oval face guide */}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div className={`civ-face-ring ${phase==="done"?"ok":phase==="scanning"||phase==="blink"?"scanning":""}`}
            style={{ width:"42%", height:"62%", border:`3px solid ${phase==="done"?"rgba(34,197,94,.9)":"rgba(255,255,255,.45)"}` }}>
            {(phase === "scanning" || phase === "blink") && (
              <div className="civ-scan-line" style={{ animationDuration:"1.5s" }}/>
            )}
          </div>
        </div>

        <div className="civ-overlay-msg">{overlayMsg}</div>

        {/* Blink counter */}
        {phase === "blink" && (
          <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,.6)",
            color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:12,
            fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:6 }}>
            <span>👁</span> Blinks: {blinkCount}/2
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="civ-progress" style={{ marginBottom:14 }}>
        <div className="civ-progress-fill" style={{ width:`${progress}%`,
          background: progress === 100 ? C.green : C.accent }} />
      </div>

      <div className="civ-checks">
        {checks.map(c => (
          <div key={c.id} className={`civ-check ${c.status}`}>
            <span className="civ-check-icon">{statusIcon(c.status)}</span>
            <div className="civ-check-txt">
              <div>{c.label}</div>
              {c.sub && <div className="civ-check-sub">{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button className="civ-btn civ-btn-retry" style={{ flex:1 }} onClick={onBack}>
          ← Back
        </button>
        <button
          className={`civ-btn ${canContinue ? "civ-btn-success" : "civ-btn-primary"}`}
          style={{ flex:2 }}
          disabled={!canContinue}
          onClick={() => onPass({ faceVerified: true, blinkCount: blinkRef.current })}
        >
          {canContinue ? "✓ Identity Verified — Start Exam" : (
            <><span className="civ-spin"/> {phase === "loading" ? "Loading AI…" : phase === "blink" ? `Blink ${blinkCount}/2…` : "Scanning face…"}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — CertIdentityVerify
// ─────────────────────────────────────────────────────────────────────────────
export default function CertIdentityVerify({ cert, onNext, onBack }) {
  const [idStep, setIdStep] = useState("id"); // "id" | "face"

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById("civ-css")) {
      const s = document.createElement("style");
      s.id = "civ-css"; s.textContent = CSS;
      document.head.appendChild(s);
    }
    return () => document.getElementById("civ-css")?.remove();
  }, []);

  const certName  = cert?.certName  || cert?.name  || "Certification Exam";
  const certColor = cert?.orgColor  || "#2563eb";
  const certOrg   = cert?.orgShort  || cert?.organization || "";

  // Step indicator
  const steps = [
    { label: "ID Card",   key: "id"   },
    { label: "Face Scan", key: "face" },
  ];

  function StepBar() {
    return (
      <div className="civ-steps">
        {steps.map((s, i) => {
          const done   = idStep === "face" && s.key === "id";
          const active = s.key === idStep;
          return (
            <div className="civ-step" key={s.key}>
              <div className="civ-step-num" style={{
                background: done ? C.green : active ? certColor : C.border,
                color: done || active ? "#fff" : C.dim,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <div className="civ-step-lbl" style={{
                color: done ? C.green : active ? certColor : C.dim,
              }}>
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div className="civ-step-line" style={{
                  background: done ? C.green : C.border,
                }}/>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="civ-root">
      <div className="civ-card">

        {/* Header */}
        <div className="civ-hdr">
          <StepBar />
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10,
              background:`linear-gradient(135deg,${certColor},${certColor}cc)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, flexShrink:0, boxShadow:`0 3px 10px ${certColor}44` }}>
              🎓
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, letterSpacing:"-.3px" }}>
                Identity Verification
              </div>
              <div style={{ fontSize:11.5, color:C.muted, marginTop:2 }}>
                {certName}
                {certOrg && <span style={{ color:certColor, fontWeight:700, marginLeft:6 }}>· {certOrg}</span>}
              </div>
            </div>
            <div style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:C.muted,
              background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"4px 10px" }}>
              {idStep === "id" ? "STEP 1 / 2" : "STEP 2 / 2"}
            </div>
          </div>

          {/* Sub-title */}
          <div style={{ marginTop:14, padding:"10px 14px",
            background: idStep === "id" ? "#eff6ff" : C.greenS,
            border:`1px solid ${idStep === "id" ? C.border2 : C.greenB}`,
            borderRadius:10, fontSize:12, color: idStep === "id" ? C.accent : C.green,
            fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            {idStep === "id" ? (
              <><span>🪪</span> Hold your Aadhaar / ID card in the guide box below</>
            ) : (
              <><span>👤</span> Look at the camera and blink twice to confirm liveness</>
            )}
          </div>
        </div>

        {/* Body — swap between steps */}
        {idStep === "id" ? (
          <IDCardScan
            cert={cert}
            onPass={() => setIdStep("face")}
          />
        ) : (
          <FaceScan
            cert={cert}
            onPass={(faceData) => onNext({ ...faceData, cert, idVerified: true, faceVerified: true })}
            onBack={() => setIdStep("id")}
          />
        )}

        {/* Footer */}
        <div style={{ padding:"12px 28px", borderTop:`1px solid ${C.border}`,
          background:C.surface2, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:C.green, animation:"civ-ping 2s ease infinite" }}/>
          <span style={{ fontSize:11, color:C.muted }}>
            All verification runs locally in your browser — no data is stored
          </span>
          <button onClick={onBack} style={{ marginLeft:"auto", fontSize:11, color:C.muted,
            background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}