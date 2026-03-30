// frontend/src/components/StudentCertifications.jsx
// Full cert exam flow integrated: CertSelect → CertIdentityVerify → CertExamPortal → CertExamReport
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T, CSS } from "./Studentdashboard ";

// ─── Static cert data (replace with API fetch as needed) ──────────────────────
const CERTS = [
 
  {
    id: 302,
    name: "Google Cloud Associate",
    subtitle: "Cloud Engineer",
    organization: "Google Cloud",
    orgShort: "GCP",
    orgColor: "#1967d2",
    orgBg: "#dbeafe",
    credentialId: null,
    issueDate: null,
    expiryDate: null,
    status: "scheduled",
    level: "Associate",
    score: null,
    examDate: "Apr 20, 2025",
    examTime: "10:00 AM",
    examCenter: "Prometric – Chennai",
    skills: ["Compute Engine", "GKE", "Cloud Storage", "IAM", "Networking"],
    verifyUrl: null,
  },
   {
    id: 301,
    name: "AWS Certified Solutions Architect",
    subtitle: "Associate Level",
    organization: "Amazon Web Services",
    orgShort: "AWS",
    orgColor: "#1e40af",
    orgBg: "#eff6ff",
    credentialId: "AWS-SAA-C03-20240318",
    issueDate: "Mar 18, 2024",
    expiryDate: "Mar 18, 2027",
    status: "active",
    level: "Associate",
    score: 87,
    skills: ["EC2 & VPC", "S3 & Storage", "IAM & Security", "Lambda", "RDS & DynamoDB"],
    verifyUrl: "https://aws.amazon.com/verification",
  },
];

// ─── Org Logo SVG ─────────────────────────────────────────────────────────────
function OrgLogo({ cert, size = 50 }) {
  const s = size * 0.52;
  return (
    <div style={{ width: size, height: size, borderRadius: size > 55 ? 14 : 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
      {cert.orgShort === "Oracle" && <svg width={s} height={s} viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="44" ry="28" fill="none" stroke="#ea580c" strokeWidth="10" /></svg>}
      {cert.orgShort === "AWS"    && <svg width={s} height={s * 0.55} viewBox="0 0 100 55"><text x="2" y="42" fontSize="36" fontWeight="800" fill="#f59e0b" fontFamily="Arial">AWS</text></svg>}
      {cert.orgShort === "GCP"    && <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50 20 L80 80 L20 80 Z" fill="none" stroke="#4285f4" strokeWidth="8" /><circle cx="50" cy="20" r="8" fill="#ea4335" /><circle cx="80" cy="80" r="8" fill="#fbbc05" /><circle cx="20" cy="80" r="8" fill="#34a853" /></svg>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Cert Select (inline, not separate page)
// ══════════════════════════════════════════════════════════════════════════════
function CertSelectStep({ cert, onNext, onBack }) {
  const [certName, setCertName] = useState(`${cert.name} - ${cert.subtitle}`);
  const [error, setError]       = useState("");

  const handleNext = () => {
    if (!certName.trim()) return setError("Please confirm the certification name.");
    setError("");
    onNext({ ...cert, certName: certName.trim() });
  };

  return (
    <div style={SS.page}>
      <div style={SS.card}>
        <div style={SS.header}>
          <button style={SS.backBtn} onClick={onBack}>← Back to Certifications</button>
          <div style={SS.stepBadge}>Step 1 of 4</div>
        </div>

        <h1 style={SS.title}>Confirm Certification</h1>
        <p style={SS.sub}>You're about to start a proctored mock exam for this certification</p>

        {/* Selected Cert Preview */}
        <div style={{ ...SS.certPreview, borderColor: cert.orgColor, background: cert.orgBg }}>
          <OrgLogo cert={cert} size={56} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cert.orgColor + "bb", marginBottom: 2 }}>{cert.organization}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: cert.orgColor }}>{cert.name}</div>
            <div style={{ fontSize: 12, color: cert.orgColor + "99", marginTop: 2 }}>{cert.subtitle}</div>
          </div>
        </div>

        <div style={SS.inputGroup}>
          <label style={SS.label}>Certification Name (Confirm)</label>
          <input
            style={SS.input}
            value={certName}
            onChange={e => { setCertName(e.target.value); setError(""); }}
            placeholder="e.g. AWS Certified Solutions Architect – Associate"
          />
          <p style={SS.hint}>MCQ questions will be generated strictly based on this name.</p>
        </div>

        {error && <div style={SS.error}>{error}</div>}

        <div style={SS.infoRow}>
          {[["30", "Questions"], ["60 min", "Duration"], ["70%", "Pass Mark"]].map(([v, l]) => (
            <div key={l} style={SS.infoChip}>
              <div style={{ fontSize: 18, fontWeight: 800, color: cert.orgColor }}>{v}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
            </div>
          ))}
        </div>

        <button style={{ ...SS.nextBtn, background: `linear-gradient(135deg, ${cert.orgColor}, ${cert.orgColor}cc)` }} onClick={handleNext}>
          Continue to Identity Verification →
        </button>
      </div>
    </div>
  );
}

const SS = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 560, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  backBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600 },
  stepBadge: { background: "#f0f9ff", color: "#0284c7", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: "1px solid #bae6fd" },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  certPreview: { display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 14, border: "2px solid", marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.5px", display: "block", marginBottom: 8 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box" },
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  error: { background: "#fef2f2", color: "#dc2626", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 16, border: "1px solid #fecaca" },
  infoRow: { display: "flex", gap: 12, marginBottom: 24 },
  infoChip: { flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px", textAlign: "center" },
  nextBtn: { width: "100%", padding: "14px", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Identity Verify (Aadhaar + Face)
// ══════════════════════════════════════════════════════════════════════════════
function CertIdentityVerify({ cert, onNext, onBack }) {
  const [step, setStep]               = useState("aadhaar");
  const [aadhaar, setAadhaar]         = useState("");
  const [aadhaarError, setAadhaarErr] = useState("");
  const [stream, setStream]           = useState(null);
  const [faceOk, setFaceOk]           = useState(false);
  const [faceMsg, setFaceMsg]         = useState("Position your face in the frame");
  const [faceStatus, setFaceStatus]   = useState("idle");
  const [capturedImage, setCaptImage] = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus]     = useState("Initializing MCQ engine...");
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const stopRef   = useRef(null);

  const formatAadhaar = (val) => val.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ");

  const handleAadhaarNext = () => {
    if (aadhaar.replace(/\s/g, "").length !== 12) return setAadhaarErr("Aadhaar must be exactly 12 digits");
    setAadhaarErr("");
    setStep("face");
    startCamera();
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      setStream(s);
      stopRef.current = () => s.getTracks().forEach(t => t.stop());
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); } }, 100);
    } catch { setFaceMsg("Camera access denied. Please allow camera access."); setFaceStatus("error"); }
  };

  useEffect(() => () => { stopRef.current?.(); }, []);

  const captureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFaceStatus("scanning");
    setFaceMsg("Scanning face... please hold still");
    const canvas = canvasRef.current;
    canvas.width = 320; canvas.height = 240;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setTimeout(() => {
      setCaptImage(imageData);
      setFaceOk(true);
      setFaceStatus("success");
      setFaceMsg("Face verified successfully ✓");
      stopRef.current?.();
    }, 2000);
  };

  const proceedToGenerate = async () => {
    setStep("generating");
    setGenProgress(0);
    const stages = [
      { pct: 10, msg: "Initializing MCQ engine..." },
      { pct: 25, msg: `Analyzing ${cert.certName} syllabus...` },
      { pct: 45, msg: "Generating topic coverage map..." },
      { pct: 65, msg: "Crafting 30 exam questions..." },
      { pct: 80, msg: "Validating question quality..." },
      { pct: 90, msg: "Finalizing exam paper..." },
      { pct: 100, msg: "Exam ready!" },
    ];
    let i = 0;
    const tick = setInterval(() => { if (i < stages.length) { setGenProgress(stages[i].pct); setGenStatus(stages[i].msg); i++; } else clearInterval(tick); }, 800);
    try {
      const res  = await fetch("/api/cert-exam/generate-mcq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certName: cert.certName }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      clearInterval(tick);
      setGenProgress(100);
      setGenStatus("Exam ready!");
      setTimeout(() => onNext({ questions: data.questions, certName: cert.certName }), 800);
    } catch (err) {
      clearInterval(tick);
      setGenStatus("Error: " + err.message);
    }
  };

  const stepIdx = { aadhaar: 0, face: 1, generating: 2 }[step];

  return (
    <div style={IV.page}>
      <div style={IV.card}>
        {/* Progress dots */}
        <div style={IV.progressBar}>
          {["Aadhaar", "Face", "Generate"].map((label, idx) => {
            const done = idx < stepIdx, active = idx === stepIdx;
            return (
              <div key={label} style={IV.progressItem}>
                <div style={{ ...IV.dot, background: done || active ? "#0284c7" : "#e2e8f0", boxShadow: active ? "0 0 0 4px #bae6fd" : "none" }}>{done ? "✓" : idx + 1}</div>
                <span style={{ ...IV.dotLabel, color: active ? "#0284c7" : done ? "#64748b" : "#cbd5e1", fontWeight: active ? 700 : 500 }}>{label}</span>
                {idx < 2 && <div style={{ ...IV.dotLine, background: done ? "#0284c7" : "#e2e8f0" }} />}
              </div>
            );
          })}
        </div>

        {/* ── Aadhaar Step ── */}
        {step === "aadhaar" && (
          <div style={IV.section}>
            <button style={IV.backBtn} onClick={onBack}>← Back</button>
            <div style={IV.badge}>Step 2 of 4 · Identity Verification</div>
            <h2 style={IV.title}>Enter Aadhaar Number</h2>
            <p style={IV.sub}>Required to verify your identity before the exam.</p>
            <div style={IV.certChip}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Exam:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0284c7" }}>{cert?.certName}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={IV.label}>Aadhaar Number</label>
              <input style={{ ...IV.input, letterSpacing: "3px", fontSize: 18, fontWeight: 600 }}
                value={aadhaar} onChange={e => { setAadhaar(formatAadhaar(e.target.value)); setAadhaarErr(""); }}
                placeholder="XXXX XXXX XXXX" maxLength={14} inputMode="numeric" />
              {aadhaarError && <div style={IV.fieldErr}>{aadhaarError}</div>}
            </div>
            <div style={IV.infoBox}>🔒 Your Aadhaar data is used only for identity verification and is not stored.</div>
            <button style={IV.primaryBtn} onClick={handleAadhaarNext}>Continue to Face Detection →</button>
          </div>
        )}

        {/* ── Face Step ── */}
        {step === "face" && (
          <div style={IV.section}>
            <div style={IV.badge}>Step 2 of 4 · Face Verification</div>
            <h2 style={IV.title}>Face Detection</h2>
            <p style={IV.sub}>Look directly at the camera. Ensure good lighting.</p>
            <div style={IV.cameraBox}>
              {!faceOk ? (
                <>
                  <video ref={videoRef} style={IV.video} autoPlay muted playsInline />
                  <div style={{ ...IV.faceOverlay, borderColor: faceStatus === "scanning" ? "#f59e0b" : faceStatus === "error" ? "#ef4444" : "#22d3ee" }}>
                    {["TL","TR","BL","BR"].map(c => <div key={c} style={IV.corners[c]} />)}
                  </div>
                  {faceStatus === "scanning" && <div style={IV.scanLine} />}
                </>
              ) : (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <img src={capturedImage} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                  <div style={IV.successOverlay}>✓</div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ ...IV.statusMsg, color: faceStatus === "success" ? "#16a34a" : faceStatus === "error" ? "#dc2626" : faceStatus === "scanning" ? "#d97706" : "#475569" }}>{faceMsg}</div>
            {!faceOk && faceStatus !== "scanning" && (
              <button style={IV.primaryBtn} onClick={captureAndVerify}>{faceStatus === "error" ? "Retry Face Scan" : "📷 Capture & Verify Face"}</button>
            )}
            {faceOk && <button style={IV.primaryBtn} onClick={proceedToGenerate}>Proceed to Generate Exam →</button>}
          </div>
        )}

        {/* ── Generating Step ── */}
        {step === "generating" && (
          <div style={{ ...IV.section, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              {genProgress < 100 ? (
                <svg width="56" height="56" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#0284c7" strokeWidth="4" strokeDasharray={`${genProgress * 1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                </svg>
              ) : <div style={{ fontSize: 56 }}>✅</div>}
            </div>
            <h2 style={{ ...IV.title, textAlign: "center" }}>{genProgress < 100 ? "Generating Your Exam..." : "Exam Generated!"}</h2>
            <p style={{ ...IV.sub, textAlign: "center" }}>{genStatus}</p>
            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 16 }}>
              <div style={{ height: "100%", width: `${genProgress}%`, background: "linear-gradient(90deg,#0284c7,#22d3ee)", borderRadius: 8, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0284c7", marginTop: 8 }}>{genProgress}%</div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>Generating 30 questions for: <strong>{cert?.certName}</strong></p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

const IV = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif" },
  card: { background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 540, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  progressBar: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, gap: 0 },
  progressItem: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 28, height: 28, borderRadius: "50%", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", flexShrink: 0 },
  dotLabel: { fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" },
  dotLine: { width: 32, height: 2, marginLeft: 4 },
  section: { display: "flex", flexDirection: "column", gap: 0 },
  backBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: 12, textAlign: "left" },
  badge: { fontSize: 11, fontWeight: 700, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 18 },
  certChip: { display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8 },
  input: { width: "100%", padding: "13px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "monospace" },
  fieldErr: { fontSize: 12, color: "#dc2626", marginTop: 6 },
  infoBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#15803d", marginBottom: 20 },
  primaryBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg,#0284c7,#0369a1)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 },
  cameraBox: { position: "relative", width: "100%", height: 280, background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  faceOverlay: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 180, height: 220, border: "2px solid", borderRadius: 12, pointerEvents: "none" },
  corners: {
    TL: { position: "absolute", top: -2, left: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "3px 0 0 0" },
    TR: { position: "absolute", top: -2, right: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 3px 0 0" },
    BL: { position: "absolute", bottom: -2, left: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "0 0 0 3px" },
    BR: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 0 3px 0" },
  },
  scanLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#22d3ee,transparent)", animation: "scan 2s ease-in-out infinite" },
  successOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(22,163,74,0.3)", fontSize: 64, color: "#fff" },
  statusMsg: { fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 14 },
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Exam Portal (proctored MCQ)
// ══════════════════════════════════════════════════════════════════════════════

// face-api.js loader (same as original CertExamPortal)
const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODELS_URL  = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
let faceApiLoaded = false, faceApiLoading = false;

async function loadFaceApi() {
  if (faceApiLoaded) return true;
  if (faceApiLoading) { await new Promise(r => setTimeout(r, 3000)); return faceApiLoaded; }
  faceApiLoading = true;
  try {
    if (!window.faceapi) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = FACEAPI_CDN; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
    ]);
    faceApiLoaded = true;
    return true;
  } catch (e) { faceApiLoading = false; return false; }
}

function getGazeDirection(landmarks) {
  try {
    const le = landmarks.getLeftEye(), re = landmarks.getRightEye();
    const nose = landmarks.getNose(), jaw = landmarks.getJawOutline();
    const eyeCX = (le.reduce((s,p)=>s+p.x,0)/le.length + re.reduce((s,p)=>s+p.x,0)/re.length)/2;
    const faceLeft = jaw[0].x, faceRight = jaw[16].x, faceWidth = faceRight - faceLeft;
    const ratio = (nose[3].x - faceLeft) / faceWidth;
    if (ratio < 0.35) return "right";
    if (ratio > 0.65) return "left";
    const eyeCY = (le.reduce((s,p)=>s+p.y,0)/le.length + re.reduce((s,p)=>s+p.y,0)/re.length)/2;
    if (nose[3].y - eyeCY < 20) return "up";
    return "center";
  } catch { return "center"; }
}

function useProctoring({ onViolation, active }) {
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const faceCheckRef = useRef(null);
  const voiceCheckRef= useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceApiReady, setFaceApiReady] = useState(false);

  const capture = useCallback(() => {
    if (!videoRef.current) return null;
    const c = document.createElement("canvas");
    c.width = 320; c.height = 240;
    c.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    return c.toDataURL("image/jpeg", 0.6);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: true });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
        setCameraReady(true);
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(s);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          analyserRef.current = analyser;
        }
        const ok = await loadFaceApi();
        if (!cancelled) setFaceApiReady(ok);
      } catch { onViolation({ type: "camera_denied", screenshot: null, msg: "Camera/mic access denied" }); }
    })();
    return () => { cancelled = true; };
  }, [active]);

  // Face detection loop
  useEffect(() => {
    if (!active || !cameraReady) return;
    let noFaceStreak = 0, gazeAwayStreak = 0, lastGazeFlag = 0, lastNoFaceFlag = 0;
    const COOLDOWN = 30000;
    faceCheckRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      const screenshot = capture(), now = Date.now();
      if (faceApiReady && window.faceapi) {
        try {
          const dets = await window.faceapi
            .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
            .withFaceLandmarks(true);
          const count = dets.length;
          if (count === 0) {
            noFaceStreak++;
            if (noFaceStreak >= 2 && now - lastNoFaceFlag > COOLDOWN) { noFaceStreak = 0; lastNoFaceFlag = now; onViolation({ type: "no_face", screenshot, msg: "No face detected in frame" }); }
          } else if (count > 1) {
            if (now - lastNoFaceFlag > COOLDOWN) { lastNoFaceFlag = now; onViolation({ type: "multiple_faces", screenshot, msg: `${count} faces detected` }); }
          } else {
            noFaceStreak = 0;
            const gaze = getGazeDirection(dets[0].landmarks);
            if (gaze !== "center") { gazeAwayStreak++; if (gazeAwayStreak >= 2 && now - lastGazeFlag > COOLDOWN) { gazeAwayStreak = 0; lastGazeFlag = now; onViolation({ type: "eye_gaze", screenshot, msg: `Eyes looking ${gaze}` }); } }
            else gazeAwayStreak = 0;
          }
          return;
        } catch {}
      }
    }, 3000);
    return () => clearInterval(faceCheckRef.current);
  }, [active, cameraReady, faceApiReady, capture, onViolation]);

  // Voice detection
  useEffect(() => {
    if (!active || !cameraReady) return;
    const AMBIENT_MAX = 55, VOICE_MIN = 75, COOLDOWN_MS = 60000;
    let strikes = 0, lastFlagTime = 0;
    voiceCheckRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const midStart = Math.floor(data.length * 0.15), midEnd = Math.floor(data.length * 0.55);
      const avg = Array.from(data).slice(midStart, midEnd).reduce((a,b)=>a+b,0) / (midEnd - midStart);
      const now = Date.now(), cooled = (now - lastFlagTime) > COOLDOWN_MS;
      if (avg <= AMBIENT_MAX) { strikes = 0; }
      else if (avg <= VOICE_MIN) { if (cooled) { strikes++; if (strikes >= 5) { strikes = 0; lastFlagTime = now; onViolation({ type: "voice_detected", screenshot: capture(), msg: `Sustained noise (level:${Math.round(avg)})` }); } } }
      else { if (cooled) { strikes++; if (strikes >= 3) { strikes = 0; lastFlagTime = now; onViolation({ type: "voice_detected", screenshot: capture(), msg: `Voice detected (level:${Math.round(avg)})` }); } } }
    }, 4000);
    return () => clearInterval(voiceCheckRef.current);
  }, [active, cameraReady, capture, onViolation]);

  // Tab switch
  useEffect(() => {
    if (!active) return;
    const h = () => { if (document.hidden) onViolation({ type: "tab_switch", screenshot: null, msg: "Student left exam tab" }); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [active, onViolation]);

  // Fullscreen exit
  useEffect(() => {
    if (!active) return;
    const h = () => { if (!document.fullscreenElement) onViolation({ type: "fullscreen_exit", screenshot: null, msg: "Exited fullscreen mode" }); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, [active]);

  const stop = useCallback(() => {
    clearInterval(faceCheckRef.current);
    clearInterval(voiceCheckRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  return { videoRef, cameraReady, faceApiReady, stop };
}

const VIOLATION_LABELS = {
  no_face: "No Face", multiple_faces: "Multiple Faces", eye_gaze: "Eye Gaze",
  voice_detected: "Voice Detected", tab_switch: "Tab Switch",
  fullscreen_exit: "Fullscreen Exit", camera_denied: "Camera Denied",
};
const DIFF_STYLES = {
  easy:   { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" },
  medium: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
  hard:   { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
};

function CertExamPortal({ examData, cert, onFinish }) {
  const { questions = [], certName = "" } = examData || {};
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState({});
  const [violations, setViolations] = useState([]);
  const [activeWarning, setActiveWarning] = useState(null);
  const [examActive, setExamActive] = useState(true);
  const [timeLeft, setTimeLeft]     = useState(60 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef      = useRef(null);
  const warnTimerRef  = useRef(null);
  const startedRef    = useRef(false);

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; document.documentElement.requestFullscreen?.().catch(() => {}); }
  }, []);

  useEffect(() => {
    if (!examActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [examActive]);

  const onViolation = useCallback(async (v) => {
    const entry = { ...v, timestamp: new Date().toISOString(), id: Date.now() };
    setViolations(prev => [...prev, entry]);
    setActiveWarning(entry);
    clearTimeout(warnTimerRef.current);
    warnTimerRef.current = setTimeout(() => setActiveWarning(null), 4000);
    try {
      await fetch("/api/cert-exam/analyze-violation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ violationType: v.type, context: v.msg }) });
    } catch {}
  }, []);

  const { videoRef, cameraReady, faceApiReady, stop } = useProctoring({ onViolation, active: examActive });

  const formatTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true); setExamActive(false);
    clearInterval(timerRef.current);
    stop();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    const score   = Math.round((correct / questions.length) * 100);
    let aiReport  = { summary: "Exam completed.", integrityScore: 90, recommendation: "review", details: "" };
    try {
      const res = await fetch("/api/cert-report/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certName, score, totalQuestions: questions.length, correct, violations }) });
      const d = await res.json();
      if (d.success) aiReport = d.report;
    } catch {}
    onFinish({ questions, answers, correct, score, totalQuestions: questions.length, violations, certName, aiReport, autoSubmit: auto, timeUsed: 3600 - timeLeft });
  }, [answers, questions, violations, certName, stop, timeLeft, submitting]);

  const q        = questions[current] || {};
  const answered  = Object.keys(answers).length;
  const unanswered = questions.length - answered;

  return (
    <div style={EP.page}>
      {activeWarning && (
        <div style={EP.warnBanner}>
          ⚠️ {VIOLATION_LABELS[activeWarning.type] || activeWarning.type}: {activeWarning.msg}
          <span style={{ float: "right", cursor: "pointer" }} onClick={() => setActiveWarning(null)}>✕</span>
        </div>
      )}
      <div style={EP.topBar}>
        <div>
          <div style={EP.examTitle}>{certName}</div>
          <div style={EP.examSub}>Proctored Certification Exam</div>
        </div>
        <div style={{ ...EP.timer, color: timeLeft < 300 ? "#dc2626" : "#0f172a" }}>⏱ {formatTime(timeLeft)}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={EP.procChip}>
            <span style={{ ...EP.procDot, background: cameraReady ? "#22c55e" : "#f59e0b" }} />
            {faceApiReady ? "AI Proctoring Active" : "Proctoring Active"}
          </div>
          <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>{violations.length} Violation{violations.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <div style={EP.body}>
        <div style={EP.sidebar}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Questions ({questions.length})</div>
          <div style={EP.qGrid}>
            {questions.map((q, i) => (
              <div key={q.id} onClick={() => setCurrent(i)} style={{ ...EP.qDot, background: answers[q.id] ? "#0284c7" : i === current ? "#e0f2fe" : "#f8fafc", color: answers[q.id] ? "#fff" : i === current ? "#0284c7" : "#64748b", border: i === current ? "2px solid #0284c7" : "1.5px solid #e2e8f0", fontWeight: i === current ? 700 : 500 }}>{i + 1}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
            <div><span style={{ color: "#0284c7", fontWeight: 700 }}>{answered}</span> answered</div>
            <div><span style={{ color: "#f59e0b", fontWeight: 700 }}>{unanswered}</span> remaining</div>
          </div>
          <div style={{ background: "#0f172a", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", padding: "6px 8px" }}>📷 Proctoring Camera</div>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
          </div>
          <button style={EP.submitBtn} onClick={() => setShowConfirm(true)} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>

        <div style={EP.main}>
          {questions.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 15, textAlign: "center", paddingTop: 60 }}>Loading exam questions...</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Q{current + 1} / {questions.length}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, ...(DIFF_STYLES[q.difficulty || "medium"]) }}>{q.difficulty || "medium"}</span>
                <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 9px", borderRadius: 20, border: "1px solid #e2e8f0" }}>{q.topic}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#0f172a", lineHeight: 1.6, marginBottom: 24 }}>{q.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {q.options && Object.entries(q.options).map(([key, val]) => (
                  <div key={key} onClick={() => setAnswers(p => ({ ...p, [q.id]: key }))} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", border: `2px solid ${answers[q.id] === key ? "#0284c7" : "#e2e8f0"}`, borderRadius: 12, cursor: "pointer", background: answers[q.id] === key ? "#eff6ff" : "#fff", boxShadow: answers[q.id] === key ? "0 0 0 3px #bae6fd" : "none", transition: "all 0.15s" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: answers[q.id] === key ? "#0284c7" : "#f1f5f9", color: answers[q.id] === key ? "#fff" : "#475569" }}>{key}</div>
                    <span style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                <button style={EP.navBtn} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Previous</button>
                <button style={{ ...EP.navBtn, background: "#0284c7", color: "#fff", border: "none" }} onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>Next →</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%" }}>
            <h3 style={{ margin: "0 0 12px", color: "#0f172a" }}>Submit Exam?</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              You have answered {answered} of {questions.length} questions.
              {unanswered > 0 && <><br /><strong style={{ color: "#dc2626" }}>{unanswered} questions unanswered!</strong></>}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ flex: 1, padding: 10, background: "#f1f5f9", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#475569" }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button style={{ flex: 1, padding: 10, background: "#dc2626", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff" }} onClick={() => { setShowConfirm(false); handleSubmit(false); }}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EP = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex", flexDirection: "column", userSelect: "none" },
  warnBanner: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "#dc2626", color: "#fff", padding: "12px 20px", fontSize: 13, fontWeight: 600 },
  topBar: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  examTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  examSub: { fontSize: 11, color: "#64748b" },
  timer: { fontSize: 22, fontWeight: 800, letterSpacing: "2px" },
  procChip: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#166534", background: "#f0fdf4", padding: "3px 10px", borderRadius: 20, border: "1px solid #bbf7d0" },
  procDot: { width: 7, height: 7, borderRadius: "50%" },
  body: { flex: 1, display: "flex", overflow: "hidden" },
  sidebar: { width: 220, background: "#fff", borderRight: "1px solid #e2e8f0", padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flexShrink: 0 },
  qGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 },
  qDot: { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer", transition: "all 0.15s" },
  submitBtn: { width: "100%", padding: 11, background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: "auto" },
  main: { flex: 1, padding: "28px 36px", overflowY: "auto" },
  navBtn: { padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Exam Report
// ══════════════════════════════════════════════════════════════════════════════
const VIOLATION_SEVERITY = {
  no_face: "high", multiple_faces: "high", eye_gaze: "medium",
  voice_detected: "medium", tab_switch: "high", fullscreen_exit: "low", camera_denied: "high",
};
const SEVERITY_STYLE = {
  high:   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "HIGH" },
  medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "MEDIUM" },
  low:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "LOW" },
};

function CertExamReport({ reportData, cert, onDone }) {
  const { score=0, correct=0, totalQuestions=0, violations=[], certName="", questions=[], answers={}, aiReport={}, timeUsed=0, autoSubmit=false } = reportData || {};
  const wrong = totalQuestions - correct;
  const passed = score >= 70;
  const violByType = violations.reduce((acc,v) => { acc[v.type]=(acc[v.type]||0)+1; return acc; }, {});
  const integrityScore = aiReport.integrityScore ?? Math.max(0, 100 - violations.reduce((t,v) => t + (VIOLATION_SEVERITY[v.type]==="high"?10:VIOLATION_SEVERITY[v.type]==="medium"?4:2), 0));
  const formatTime = s => `${Math.floor(s/60)}m ${s%60}s`;

  return (
    <div style={RP.page}>
      <div style={RP.container}>
        <div style={{ ...RP.header, background: passed ? "linear-gradient(135deg,#0284c7,#0369a1)" : "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
          <div>
            <div style={RP.headerBadge}>{passed ? "✅ PASSED" : "❌ FAILED"} · {(aiReport.recommendation||"review").toUpperCase()}</div>
            <h1 style={RP.headerTitle}>Exam Report</h1>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>{certName}</p>
            {autoSubmit && <div style={{ fontSize: 12, background: "rgba(0,0,0,0.2)", padding: "4px 10px", borderRadius: 8, display: "inline-block", marginTop: 8 }}>⚠️ Auto-submitted (time expired)</div>}
          </div>
          <div style={RP.scoreCircle}>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Score</div>
          </div>
        </div>

        <div style={RP.statsRow}>
          {[
            { label: "Correct",    value: correct,              color: "#16a34a", bg: "#f0fdf4" },
            { label: "Wrong",      value: wrong,                color: "#dc2626", bg: "#fef2f2" },
            { label: "Total Qs",   value: totalQuestions,       color: "#0284c7", bg: "#eff6ff" },
            { label: "Time Used",  value: formatTime(timeUsed), color: "#7c3aed", bg: "#f5f3ff" },
            { label: "Violations", value: violations.length,    color: violations.length>3?"#dc2626":"#d97706", bg: violations.length>3?"#fef2f2":"#fffbeb" },
            { label: "Integrity",  value: `${integrityScore}%`, color: integrityScore>70?"#16a34a":"#dc2626", bg: integrityScore>70?"#f0fdf4":"#fef2f2" },
          ].map((s,i) => (
            <div key={i} style={{ ...RP.statCard, background: s.bg }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {aiReport.summary && (
          <div style={RP.section}>
            <div style={RP.sectionTitle}>🤖 AI Proctoring Analysis</div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: "0 0 8px" }}>{aiReport.summary}</p>
              {aiReport.details && <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{aiReport.details}</p>}
            </div>
          </div>
        )}

        <div style={RP.section}>
          <div style={RP.sectionTitle}>📊 Score Breakdown</div>
          <div style={{ height: 12, background: "#e2e8f0", borderRadius: 8, overflow: "visible", position: "relative" }}>
            <div style={{ height: "100%", width: `${score}%`, background: passed?"#0284c7":"#dc2626", borderRadius: 8 }} />
            <div style={{ position: "absolute", left: "70%", top: -4, bottom: -4, width: 2, background: "#64748b", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#64748b" }}>
            <span>{correct} correct answers</span>
            <span style={{ fontWeight: 700, color: passed?"#0284c7":"#dc2626" }}>Your score: {score}%</span>
          </div>
        </div>

        <div style={RP.section}>
          <div style={RP.sectionTitle}>🚨 Violations Log ({violations.length})</div>
          {violations.length === 0 ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✅ No violations recorded. Clean exam session.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {Object.entries(violByType).map(([type, count]) => {
                const sev = VIOLATION_SEVERITY[type]||"medium", st = SEVERITY_STYLE[sev];
                return (
                  <div key={type} style={{ borderRadius: 10, padding: "12px 14px", background: st.bg, border: `1px solid ${st.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{VIOLATION_LABELS[type]||type}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: st.color }}>{count}×</div>
                    <div style={{ fontSize: 10, background: st.color, color: "#fff", padding: "1px 6px", borderRadius: 10, display: "inline-block" }}>{st.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={RP.section}>
          <div style={RP.sectionTitle}>📋 Answer Review</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {questions.map((q,i) => {
              const given = answers[q.id], isCorrect = given === q.correct;
              return (
                <div key={q.id} style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 10, borderLeft: `3px solid ${isCorrect?"#22c55e":given?"#ef4444":"#94a3b8"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Q{i+1}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isCorrect?"#16a34a":given?"#dc2626":"#64748b" }}>{isCorrect?"✓ Correct":given?"✗ Wrong":"— Skipped"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#0f172a", marginBottom: 8, fontWeight: 500 }}>{q.question}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    {given && given !== q.correct && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Your: {given}. {q.options?.[given]}</span>}
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>Correct: {q.correct}. {q.options?.[q.correct]}</span>
                  </div>
                  {q.explanation && <div style={{ fontSize: 11, color: "#64748b", background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>💡 {q.explanation}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "8px 0 32px" }}>
          <button style={{ padding: "11px 22px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#475569" }} onClick={() => window.print()}>🖨️ Print / Save PDF</button>
          <button style={{ padding: "11px 22px", background: "linear-gradient(135deg,#0284c7,#0369a1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={onDone}>← Back to Certifications</button>
        </div>
      </div>
    </div>
  );
}

const RP = {
  page: { minHeight: "100vh", background: "#f1f5f9", padding: "24px 0", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  container: { maxWidth: 860, margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 20 },
  header: { borderRadius: 18, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" },
  headerBadge: { fontSize: 11, fontWeight: 700, letterSpacing: "1px", background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" },
  scoreCircle: { width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 },
  statCard: { borderRadius: 12, padding: "14px 10px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  section: { background: "#fff", borderRadius: 16, padding: "22px 26px" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16 },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — StudentCertifications with integrated exam flow
// ══════════════════════════════════════════════════════════════════════════════
function CertCard({ cert, onStartExam }) {
  const isSched = cert.status === "scheduled";
  return (
    <div className="na-card" style={{ overflow: "hidden", cursor: "pointer", borderLeft: `3px solid ${cert.orgColor}`, transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ padding: "20px 22px 16px", background: cert.orgBg, borderBottom: `1px solid ${cert.orgColor}22`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <OrgLogo cert={cert} size={50} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cert.orgColor + "bb", marginBottom: 2 }}>{cert.organization}</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: cert.orgColor, letterSpacing: "-.3px" }}>{cert.name}</div>
            <div style={{ fontSize: 12, color: cert.orgColor + "99", marginTop: 2 }}>{cert.subtitle}</div>
          </div>
        </div>
        {isSched
          ? <span className="na-badge" style={{ background: "#fffbeb", color: "#b45309", flexShrink: 0 }}>📅 Scheduled</span>
          : <span className="na-badge" style={{ background: "#f0fdf4", color: "#0a8f5c", flexShrink: 0 }}>✓ Active</span>}
      </div>

      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {isSched ? (
          <>
            <div style={{ background: "#fffbeb", border: "1px solid #b4530933", borderRadius: 8, padding: "12px 15px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", letterSpacing: ".4px", marginBottom: 8 }}>EXAM SCHEDULED</div>
              {[{ icon: "📅", v: cert.examDate }, { icon: "🕐", v: cert.examTime }, { icon: "📍", v: cert.examCenter }].map((r,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span>{r.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0A2A41" }}>{r.v}</span>
                </div>
              ))}
            </div>
            {/* ── MOCK EXAM BUTTON — routes into exam flow ── */}
            <button
              onClick={() => onStartExam(cert)}
              style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg,${cert.orgColor},${cert.orgColor}cc)`, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🎯 Take Practice Exam
            </button>
          </>
        ) : (
          <>
            <div style={{ background: "#F2FBFF", border: "1px solid #b8eaee", borderRadius: 8, padding: "12px 15px", fontFamily: "monospace", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".5px", color: "#7aacba", marginBottom: 3 }}>CREDENTIAL ID</div>
                <div style={{ color: "#0A2A41", fontWeight: 600 }}>{cert.credentialId}</div>
              </div>
              <span style={{ cursor: "pointer", color: "#7aacba" }}>🔗</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[{ label: "ISSUED", value: cert.issueDate }, { label: "EXPIRES", value: cert.expiryDate }, { label: "LEVEL", value: cert.level }].map((d,i) => (
                <div key={i}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#7aacba", letterSpacing: ".4px", marginBottom: 3 }}>{d.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0A2A41" }}>{d.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#3d6878" }}>Exam Score</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: cert.orgColor }}>{cert.score}%</span>
              </div>
              <div style={{ height: 5, background: "#b8eaee", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${cert.score}%`, background: cert.orgColor, borderRadius: 4 }} />
              </div>
            </div>
          </>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {cert.skills.map((s,i) => <span key={i} className="na-tag">{s}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function StudentCertifications() {
  const navigate = useNavigate();

  // ── Exam flow state machine ───────────────────────────────────────────────
  // "list" | "select" | "verify" | "exam" | "report"
  const [examStep,    setExamStep]    = useState("list");
  const [activeCert,  setActiveCert]  = useState(null);
  const [examData,    setExamData]    = useState(null);
  const [reportData,  setReportData]  = useState(null);

  const handleStartExam = (cert) => { setActiveCert(cert); setExamStep("select"); };

  const handleReset = () => {
    setExamStep("list");
    setActiveCert(null);
    setExamData(null);
    setReportData(null);
  };

  const active    = CERTS.filter(c => c.status === "active").length;
  const scheduled = CERTS.filter(c => c.status === "scheduled").length;

  // ── Render exam flow steps (full-screen, outside StudentLayout) ───────────
  if (examStep === "select") return (
    <CertSelectStep cert={activeCert} onNext={cert => { setActiveCert(cert); setExamStep("verify"); }} onBack={handleReset} />
  );
  if (examStep === "verify") return (
    <CertIdentityVerify cert={activeCert} onNext={data => { setExamData(data); setExamStep("exam"); }} onBack={() => setExamStep("select")} />
  );
  if (examStep === "exam") return (
    <CertExamPortal examData={examData} cert={activeCert} onFinish={result => { setReportData(result); setExamStep("report"); }} />
  );
  if (examStep === "report") return (
    <CertExamReport reportData={reportData} cert={activeCert} onDone={handleReset} />
  );

  // ── Default: certifications list page ───────────────────────────────────
  return (
    <StudentLayout activePath="/student-certifications">
      <div style={{ marginBottom: 22 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}>
          ← Dashboard
        </button>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>Certifications</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Industry credentials and professional certifications</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Certs",    value: active,          color: T.green },
          { label: "Scheduled Exams", value: scheduled,       color: T.amber },
          { label: "Total",           value: CERTS.length,    color: T.accent },
        ].map((s,i) => (
          <div key={i} className="na-card" style={{ padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Info banner when scheduled exams exist */}
      {scheduled > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: "#15803d", fontWeight: 500 }}>
          🎯 You have <strong>{scheduled}</strong> scheduled exam{scheduled > 1 ? "s" : ""}. Click <strong>"Take Practice Exam"</strong> to start a proctored mock test anytime.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
        {CERTS.map(cert => (
          <CertCard key={cert.id} cert={cert} onStartExam={handleStartExam} />
        ))}
      </div>
    </StudentLayout>
  );
}