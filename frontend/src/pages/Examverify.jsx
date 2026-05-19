import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = (() => {
  try { return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'; }
  catch { return (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'); }
})();

const T = {
  bg:         "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)",
  surface:    "#ffffff",
  border:     "#bfdbfe",
  accent:     "#3b82f6",
  accentDark: "#2563eb",
  accentSoft: "#dbeafe",
  teal:       "#0891b2",
  green:      "#16a34a",
  greenSoft:  "#f0fdf4",
  greenBdr:   "#bbf7d0",
  red:        "#dc2626",
  redSoft:    "#fef2f2",
  amber:      "#ea580c",
  amberSoft:  "#fff7ed",
  text:       "#1e293b",
  muted:      "#64748b",
  dim:        "#94a3b8",
};

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("student_token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function dataURLtoFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(",");
  const mime   = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr    = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

function captureFrame(videoEl) {
  const canvas  = document.createElement("canvas");
  canvas.width  = videoEl?.videoWidth  || 640;
  canvas.height = videoEl?.videoHeight || 480;
  canvas.getContext("2d").drawImage(videoEl, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function fetchExamData(examId) {
  if (!examId) return null;
  const res = await fetch(`${API_BASE}/api/exams/${examId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.exam || data || null;
}

async function callVerifyAPI(idImageDataUrl, liveImageDataUrl, studentName, examContext) {
  const formData = new FormData();
  formData.append("idImage",     dataURLtoFile(idImageDataUrl,   "id_card.jpg"));
  formData.append("liveImage",   dataURLtoFile(liveImageDataUrl, "live_face.jpg"));
  formData.append("studentName", studentName  || "");
  formData.append("examId",      examContext?.examId   || "");
  formData.append("examName",    examContext?.examName || "");
  const response = await fetch(`${API_BASE}/api/verify`, {
    method: "POST",
    body:   formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error ${response.status}`);
  }
  return response.json();
}

function Corner({ pos, color }) {
  const top  = pos.includes("t");
  const left = pos.includes("l");
  return (
    <div style={{
      position: "absolute", width: 22, height: 22, pointerEvents: "none",
      top:    top  ? 10 : undefined, bottom: !top  ? 10 : undefined,
      left:   left ? 10 : undefined, right:  !left ? 10 : undefined,
      borderTop:    top  ? `2.5px solid ${color}` : "none",
      borderBottom: !top ? `2.5px solid ${color}` : "none",
      borderLeft:   left ? `2.5px solid ${color}` : "none",
      borderRight:  !left? `2.5px solid ${color}` : "none",
      borderRadius: top && left ? "3px 0 0 0" : top && !left ? "0 3px 0 0"
                  : !top && left ? "0 0 0 3px" : "0 0 3px 0",
    }} />
  );
}

/* ── Step 1: ID Card Scan ──────────────────────────────────────── */
function IDCardScan({ onNext }) {
  const videoRef = useRef(null);
  const [ready,    setReady]    = useState(false);
  const [captured, setCaptured] = useState(null);
  const [tick,     setTick]     = useState(null);
  const [camError, setCamError] = useState(false);

  useEffect(() => {
    if (captured) return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "environment" } })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCamError(true));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [captured]);

  const startCountdown = () => {
    let c = 3;
    setTick(c);
    const id = setInterval(() => {
      c--;
      if (c === 0) {
        clearInterval(id);
        setTick(null);
        const frame = videoRef.current?.readyState > 0
          ? captureFrame(videoRef.current)
          : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        setCaptured(frame);
      } else {
        setTick(c);
      }
    }, 1000);
  };

  return (
    <div style={S.card}>
      <h2 style={S.h2}>ID Card Capture</h2>
      <p style={S.sub}>Hold your ID card steady. Ensure good lighting and text is readable.</p>
      <div style={S.camBox}>
        {!captured ? (
          <>
            {camError ? (
              <div style={S.camPlaceholder}>
                <span style={{ fontSize: 36 }}>📷</span>
                <span style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "0 20px" }}>Camera unavailable. Click capture to continue.</span>
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline onCanPlay={() => setReady(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            {["tl","tr","bl","br"].map((p) => <Corner key={p} pos={p} color={T.accent} />)}
            <div style={S.scanLine} />
            <div style={S.guideText}>ALIGN ID CARD WITHIN FRAME</div>
            {tick !== null && <div style={S.countdownOverlay}>{tick}</div>}
          </>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {captured.length > 100
              ? <img src={captured} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ ...S.camPlaceholder, background: T.greenSoft }}><span style={{ fontSize: 36 }}>🪪</span><span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>ID Captured</span></div>
            }
            <div style={S.capturedBadge}>✓ CAPTURED</div>
          </div>
        )}
      </div>
      {!captured ? (
        <button style={{ ...S.btn, ...(tick !== null ? S.btnDisabled : {}) }} disabled={tick !== null} onClick={startCountdown}>
          {tick !== null ? `Capturing in ${tick}…` : "Capture ID Card"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btn, ...S.ghostBtn, flex: 1 }} onClick={() => setCaptured(null)}>Retake</button>
          <button style={{ ...S.btn, flex: 2 }} onClick={() => onNext(captured)}>Continue →</button>
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Face Scan ─────────────────────────────────────────── */
function FaceScan({ idCapture, studentName, examContext, onVerified, onFail }) {
  const videoRef = useRef(null);
  const [phase,    setPhase]    = useState("align");
  const [liveImg,  setLiveImg]  = useState(null);
  const [matched,  setMatched]  = useState(null);
  const [progress, setProgress] = useState(0);
  const [camError, setCamError] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (phase !== "align" && phase !== "scanning") return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCamError(true));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [phase]);

  const startScan = () => {
    setPhase("scanning");
    setApiError(null);
    let p = 0;
    const iv = setInterval(() => {
      p += 2.2;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(iv);
        const frame = videoRef.current?.readyState > 0
          ? captureFrame(videoRef.current)
          : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        setLiveImg(frame);
        setPhase("comparing");
        callVerifyAPI(idCapture, frame, studentName, examContext)
          .then((data) => { setMatched(data.decision === "ALLOW"); setPhase("done"); })
          .catch((err) => { setApiError(err.message); setPhase("error"); });
      }
    }, 55);
  };

  const retry = () => { setPhase("align"); setMatched(null); setLiveImg(null); setProgress(0); setApiError(null); };
  const frameBorder = phase === "done" ? (matched ? T.green : T.red) : phase === "scanning" || phase === "comparing" ? T.accent : T.border;
  const STEPS = ["Extracting ID card text via OCR…","Detecting facial landmarks…","Comparing biometric features…","Running identity verification…"];

  return (
    <div style={S.card}>
      <h2 style={S.h2}>
        {phase === "done" && matched ? "Identity Verified" : phase === "done" ? "Verification Failed" : phase === "error" ? "Verification Error" : phase === "comparing" ? "Analyzing…" : phase === "scanning" ? "Scanning…" : "Face Capture"}
      </h2>
      <p style={S.sub}>
        {phase === "align"    && "Look directly at the camera. Ensure your face is well-lit and centred."}
        {phase === "scanning" && "Hold still while we capture your biometric data."}
        {phase === "comparing"&& "Verifying your identity — this takes a few seconds."}
        {phase === "done" && matched  && "Your identity has been successfully verified. You may proceed."}
        {phase === "done" && !matched && "We could not verify your identity. Please retry or contact support."}
        {phase === "error"            && (apiError || "Something went wrong. Please try again.")}
      </p>
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={S.camLabel}>ID Card</div>
          <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", border: `1px solid ${T.border}`, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {idCapture && idCapture.length > 200
              ? <img src={idCapture} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center", padding: 12 }}><span style={{ fontSize: 32 }}>🪪</span><div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>Simulated</div></div>
            }
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={S.camLabel}>Live Face</div>
          <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", position: "relative", background: "#f8fafc", border: `1.5px solid ${frameBorder}`, transition: "border-color .3s" }}>
            {phase === "align" || phase === "scanning"
              ? camError
                ? <div style={S.camPlaceholder}><span style={{ fontSize: 28 }}>📷</span></div>
                : <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : liveImg && liveImg.length > 200
                ? <img src={liveImg} alt="live" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={S.camPlaceholder}><span style={{ fontSize: 28 }}>👤</span></div>
            }
            {phase === "scanning"  && <div style={S.scanLine} />}
            {phase === "comparing" && <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={S.spinner} /></div>}
            {phase === "done" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: matched ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)" }}>
                <span style={{ fontSize: 40 }}>{matched ? "✅" : "❌"}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: matched ? T.green : T.red, background: matched ? T.greenSoft : T.redSoft, padding: "3px 10px", borderRadius: 20, border: `1px solid ${matched ? T.greenBdr : "#fecaca"}` }}>
                  {matched ? "VERIFIED" : "MISMATCH"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {phase === "comparing" && (
        <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
          {STEPS.map((step, i) => <LogLine key={i} text={step} delay={i * 700} />)}
        </div>
      )}
      {phase === "scanning" && (
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progress}%`, background: `linear-gradient(90deg,${T.accent},${T.teal})` }} />
        </div>
      )}
      {phase === "done" && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 10, marginBottom: 20, background: matched ? T.greenSoft : T.redSoft, border: `1.5px solid ${matched ? T.greenBdr : "#fecaca"}` }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>{matched ? "✅" : "❌"}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: matched ? T.green : T.red, marginBottom: 2 }}>{matched ? "Identity Verified" : "Identity Not Verified"}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{matched ? "Your ID card and live face have been successfully matched." : "We could not match your face to the ID card provided."}</div>
          </div>
        </div>
      )}
      {phase === "error" && (
        <div style={{ marginBottom: 20, background: T.redSoft, border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 4 }}>Verification Error</div>
          <div style={{ fontSize: 12, color: T.muted }}>{apiError || "Please check your connection and try again."}</div>
        </div>
      )}
      {phase === "align" && <button style={S.btn} onClick={startScan}>Start Face Scan</button>}
      {phase === "done" && matched && <button style={{ ...S.btn, background: `linear-gradient(135deg,${T.green},#15803d)`, boxShadow: "0 2px 8px rgba(22,163,74,0.25)" }} onClick={onVerified}>Proceed to Exam →</button>}
      {((phase === "done" && !matched) || phase === "error") && (
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...S.btn, ...S.ghostBtn, flex: 1 }} onClick={retry}>Try Again</button>
          <button style={{ ...S.btn, background: `linear-gradient(135deg,${T.red},#b91c1c)`, flex: 2 }} onClick={onFail}>Contact Support</button>
        </div>
      )}
    </div>
  );
}

function LogLine({ text, delay }) {
  const [visible, setVisible] = useState(false);
  const [done,    setDone]    = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setDone(true), delay + 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay]);
  if (!visible) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span style={{ fontSize: 11 }}>
        {done ? "✅" : <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: `2px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite", verticalAlign: "middle" }} />}
      </span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: done ? T.muted : T.text }}>{text}</span>
    </div>
  );
}

/* ── Step 3: Exam Ready ────────────────────────────────────────── */

function ExamReady({ examData, fallback, locationGranted, initialCoords, geoSessionId }) {
  const navigate    = useNavigate();
  const [countdown, setCountdown] = useState(null);

  const title      = examData?.title            || fallback?.exam        || "Exam";
  const duration   = examData?.duration_minutes ? `${examData.duration_minutes} min` : fallback?.duration || "—";
  const totalMarks = examData?.total_marks      || fallback?.total_marks  || null;
  const college    = examData?.college          || fallback?.company       || null;
  const startDate  = examData?.start_date
    ? new Date(examData.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : fallback?.date || null;
  const endDate    = examData?.end_date
    ? new Date(examData.end_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  const sections = (() => {
    const src = examData?.sections || fallback?.sections;
    if (!src) return null;
    try {
      const s = typeof src === "string" ? JSON.parse(src) : src;
      return Object.keys(s).join(", ") || null;
    } catch { return null; }
  })();

  const handleStart = () => {
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) {
        clearInterval(iv);

    
        const examObj    = examData || fallback || {};
   
const examType     = (examObj.exam_type || fallback?.exam_type || "").toLowerCase();
const isUniversity = 
  examType === "university" || 
  examType === "academic"   ||
  !!(fallback?.college)     ||
  window.location.hash.includes("univ");


const destination = isUniversity ? "/univ-verify-key" : "/verify-exam-key";

navigate(destination, {
  state: {
    exam: {
      id:               examObj.id            || examObj.exam_id,
      assignment_id:    examObj.assignment_id,
      title:            examObj.title,
      duration_minutes: examObj.duration_minutes,
      exam_type:        examObj.exam_type,
      sections:         examObj.sections,
      total_marks:      examObj.total_marks,
    },
    isUniversity:    isUniversity,
    locationGranted: locationGranted || false,
    initialCoords:   initialCoords   || null,
    geoSessionId:    geoSessionId    || null,
  },
});
       

      } else {
        setCountdown(c);
      }
    }, 1000);
  };

  const infoItems = [
    ["Duration",    duration],
    ["Total Marks", totalMarks ? `${totalMarks} marks` : null],
    ["Sections",    sections],
    ["College",     college],
    ["Date",        startDate],
    ["End Time",    endDate],
    ["Proctoring",  "AI Active"],
  ].filter(([, v]) => v);

  return (
    <div style={{ ...S.card, border: `1px solid ${T.greenBdr}` }}>
      {countdown !== null ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div key={countdown} style={{ fontSize: 88, fontWeight: 900, color: T.accent, lineHeight: 1, animation: "pop .35s cubic-bezier(0.22,1,0.36,1)" }}>
            {countdown}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 14, letterSpacing: "0.5px" }}>Preparing exam key entry…</div>
        </div>
      ) : (
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.greenSoft, border: `1px solid ${T.greenBdr}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: T.green, marginBottom: 16, letterSpacing: 0.5 }}>
            ✓ Identity Verified
          </div>
          <h2 style={{ ...S.h2, marginBottom: 6 }}>Ready to begin?</h2>
          <p style={{ ...S.sub, marginBottom: 24 }}>{title}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {infoItems.map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 9.5, color: T.dim, letterSpacing: "0.6px", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: k === "Proctoring" ? T.green : T.text }}>
                  {k === "Proctoring" ? "✓ " : ""}{v}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: T.amberSoft, border: `1px solid rgba(234,88,12,0.25)`, borderRadius: 8, padding: "11px 14px", marginBottom: 22 }}>
            <p style={{ fontSize: 12.5, color: T.amber, lineHeight: 1.8, margin: 0 }}>
              <strong>Important:</strong> Once started, tab switching, copy-paste, and window minimizing are disabled. AI proctoring monitors your activity throughout.
            </p>
          </div>

          {/* Next step hint */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.accentSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 22 }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 2 }}>Exam Key Required Next</div>
              <div style={{ fontSize: 11, color: T.muted }}>You will be asked to enter the exam key sent to your registered email.</div>
            </div>
          </div>

          <button style={{ ...S.btn, background: `linear-gradient(135deg,${T.accent},${T.accentDark})`, boxShadow: "0 2px 8px rgba(59,130,246,0.25)" }} onClick={handleStart}>
            Continue to Exam Key →
          </button>
        </>
      )}
    </div>
  );
}

/* ── Main ExamVerify ───────────────────────────────────────────── */
export default function ExamVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, locationGranted, initialCoords, geoSessionId } = location.state || {};

  const [step,        setStep]        = useState(0);
  const [idCapture,   setIdCapture]   = useState(null);
  const [mounted,     setMounted]     = useState(false);
  const [examData,    setExamData]    = useState(null);
  const [examLoading, setExamLoading] = useState(false);

  const studentName = localStorage.getItem("studentName") || exam?.studentName || "";

  // Fetch real exam data from backend to get assignment_id, sections, etc.
  useEffect(() => {
    const id = exam?.id || exam?.examId || exam?.exam_id;
    if (!id) return;
    setExamLoading(true);
    fetchExamData(id)
      .then((data) => { if (data) setExamData(data); })
      .catch(() => {})
      .finally(() => setExamLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);


  const mergedExamData = examData
    ? {
        ...examData,
        assignment_id: exam?.assignment_id || examData.assignment_id,
        exam_key:      exam?.exam_key      || exam?.examKey,
      }
    : null;

  const stepLabels = ["Scan ID", "Face Scan", "Ready"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        html, body, #root { min-height: 100vh; margin: 0; padding: 0; }
        body { background: linear-gradient(135deg,#dbeafe 0%,#bfdbfe 50%,#93c5fd 100%) !important; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes scanV   { 0%{top:-2px} 100%{top:100%} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pop     { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
      `}</style>
      <div style={S.root}>
        <div style={S.orb1} /><div style={S.orb2} /><div style={S.grid} />
        <div style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.5s ease 80ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) 80ms" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <button onClick={() => navigate(-1)} style={{ background: "#fff", border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", fontSize: 18, width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.dim, letterSpacing: "0.6px", marginBottom: 3, fontWeight: 600, textTransform: "uppercase" }}>Exam Verification</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text, letterSpacing: "-0.3px" }}>
                {mergedExamData?.title || exam?.exam || exam?.title || "Verification"}
              </div>
            </div>
            <div style={{ background: T.accentSoft, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 10.5, color: T.accent, fontWeight: 600 }}>AI Proctoring</div>
          </div>

          {/* Step indicator */}
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", marginBottom: 22 }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: i < step ? T.green : i === step ? T.accent : "#f1f5f9", border: `2px solid ${i < step ? T.green : i === step ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i <= step ? "#fff" : T.dim, transition: "all .3s" }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.4px", whiteSpace: "nowrap", fontWeight: 600, color: i === step ? T.accent : i < step ? T.green : T.dim }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && <div style={{ flex: 1, height: 2, margin: "0 10px", marginTop: -16, borderRadius: 99, background: step > i ? T.green : "#e2e8f0", transition: "background .3s" }} />}
              </div>
            ))}
          </div>

          {step === 0 && <IDCardScan onNext={(img) => { setIdCapture(img); setStep(1); }} />}
          {step === 1 && (
            <FaceScan
              idCapture={idCapture}
              studentName={studentName}
              examContext={{ examId: exam?.id || exam?.examId, examName: mergedExamData?.title || exam?.exam }}
              onVerified={() => setStep(2)}
              onFail={() => alert("Please contact your exam administrator.")}
            />
          )}
          {step === 2 && (
            <ExamReady
              examData={mergedExamData}
              fallback={exam}
              locationGranted={locationGranted}
              initialCoords={initialCoords}
              geoSessionId={geoSessionId}
            />
          )}
        </div>
      </div>
    </>
  );
}

const S = {
  root: { minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'DM Sans', sans-serif", color: T.text, position: "relative" },
  orb1: { position: "fixed", top: "-15%", left: "-10%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 },
  orb2: { position: "fixed", bottom: "-15%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(147,197,253,0.06) 0%,transparent 70%)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 },
  grid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.02) 1px,transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none", zIndex: 0 },
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "36px 32px", boxShadow: "0 4px 20px rgba(59,130,246,0.08)" },
  h2:   { fontSize: 26, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.3px", fontFamily: "'Syne', sans-serif", color: T.text, margin: "0 0 10px" },
  sub:  { fontSize: 14, color: T.muted, marginBottom: 22, lineHeight: 1.65, margin: "0 0 22px" },
  camBox: { position: "relative", width: "100%", aspectRatio: "4/3", background: "#f8fafc", borderRadius: 12, overflow: "hidden", marginBottom: 20, border: `1px solid ${T.border}` },
  camPlaceholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#f8f9fc" },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${T.accent},transparent)`, animation: "scanV 2.2s linear infinite", boxShadow: `0 0 10px ${T.accent}66`, pointerEvents: "none" },
  guideText: { position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 10.5, color: T.accent, letterSpacing: "0.8px", fontWeight: 600, pointerEvents: "none" },
  countdownOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", fontSize: 80, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: T.accent },
  capturedBadge: { position: "absolute", top: 10, right: 10, background: T.green, color: "#fff", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.5px", padding: "5px 11px", borderRadius: 6 },
  camLabel: { fontSize: 10, letterSpacing: "0.6px", color: T.dim, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" },
  spinner: { width: 30, height: 30, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .7s linear infinite" },
  progressTrack: { background: "#e2e8f0", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 14 },
  progressFill:  { height: "100%", borderRadius: 6, transition: "width .15s ease-out" },
  btn: { width: "100%", padding: "12px 0", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${T.accent},${T.accentDark})`, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px", boxShadow: "0 2px 8px rgba(59,130,246,0.25)", transition: "all 0.2s ease", display: "block" },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  ghostBtn: { background: "#fff", border: `1.5px solid ${T.border}`, color: T.text, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
};

