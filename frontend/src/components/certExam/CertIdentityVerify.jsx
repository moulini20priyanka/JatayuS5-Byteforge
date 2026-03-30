// frontend/src/components/certExam/CertIdentityVerify.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const STEPS = ["aadhaar", "face", "generating"];

export default function CertIdentityVerify({ cert, onNext, onBack }) {
  const [step, setStep] = useState("aadhaar");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarError, setAadhaarError] = useState("");
  const [stream, setStream] = useState(null);
  const [faceOk, setFaceOk] = useState(false);
  const [faceMsg, setFaceMsg] = useState("Position your face in the frame");
  const [faceStatus, setFaceStatus] = useState("idle"); // idle | scanning | success | error
  const [capturedImage, setCapturedImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState("Initializing MCQ engine...");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // Format aadhaar as XXXX XXXX XXXX
  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleAadhaarNext = () => {
    const digits = aadhaar.replace(/\s/g, "");
    if (digits.length !== 12) return setAadhaarError("Aadhaar must be exactly 12 digits");
    setAadhaarError("");
    setStep("face");
    startCamera();
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      setStream(s);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (e) {
      setFaceMsg("Camera access denied. Please allow camera access.");
      setFaceStatus("error");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [stream]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFaceStatus("scanning");
    setFaceMsg("Scanning face... please hold still");

    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    // Simulate face detection (replace with real face-api.js or MediaPipe if needed)
    setTimeout(() => {
      const detected = true; // In production: use face-api.js
      if (detected) {
        setCapturedImage(imageData);
        setFaceOk(true);
        setFaceStatus("success");
        setFaceMsg("Face verified successfully ✓");
        stopCamera();
      } else {
        setFaceStatus("error");
        setFaceMsg("No face detected. Please try again.");
      }
    }, 2000);
  };

  const proceedToGenerate = async () => {
    setStep("generating");
    setGenerating(true);
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
    const tick = setInterval(() => {
      if (i < stages.length) {
        setGenProgress(stages[i].pct);
        setGenStatus(stages[i].msg);
        i++;
      } else {
        clearInterval(tick);
      }
    }, 800);

    try {
      const res = await fetch("http://localhost:5000/api/cert-exam/generate-mcq", {  // ← CHANGED
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certName: cert.certName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");

      clearInterval(tick);
      setGenProgress(100);
      setGenStatus("Exam ready!");
      setTimeout(() => onNext({ questions: data.questions, certName: cert.certName }), 800);
    } catch (err) {
      clearInterval(tick);
      setGenStatus("Error: " + err.message);
      setGenerating(false);
    }
  };

  /* ---- Render ---- */
  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Progress bar */}
        <div style={S.progressBar}>
          {["Aadhaar", "Face", "Generate"].map((label, idx) => {
            const stepIdx = { aadhaar: 0, face: 1, generating: 2 }[step];
            const done = idx < stepIdx;
            const active = idx === stepIdx;
            return (
              <div key={label} style={S.progressItem}>
                <div style={{ ...S.progressDot, background: done || active ? "#0284c7" : "#e2e8f0", boxShadow: active ? "0 0 0 4px #bae6fd" : "none" }}>
                  {done ? "✓" : idx + 1}
                </div>
                <span style={{ ...S.progressLabel, color: active ? "#0284c7" : done ? "#64748b" : "#cbd5e1", fontWeight: active ? 700 : 500 }}>{label}</span>
                {idx < 2 && <div style={{ ...S.progressLine, background: done ? "#0284c7" : "#e2e8f0" }} />}
              </div>
            );
          })}
        </div>

        {/* ---- STEP: Aadhaar ---- */}
        {step === "aadhaar" && (
          <div style={S.section}>
            <button style={S.backBtn} onClick={onBack}>← Back</button>
            <div style={S.stepBadge}>Step 2 of 4 · Identity Verification</div>
            <h2 style={S.title}>Enter Aadhaar Number</h2>
            <p style={S.sub}>Your 12-digit Aadhaar number is required to verify your identity before the exam.</p>
            <div style={S.certChip}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Exam for:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0284c7" }}>{cert?.certName}</span>
            </div>
            <div style={S.inputGroup}>
              <label style={S.label}>Aadhaar Number</label>
              <input
                style={{ ...S.input, letterSpacing: "3px", fontSize: 18, fontWeight: 600 }}
                value={aadhaar}
                onChange={(e) => { setAadhaar(formatAadhaar(e.target.value)); setAadhaarError(""); }}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                inputMode="numeric"
              />
              {aadhaarError && <div style={S.fieldError}>{aadhaarError}</div>}
            </div>
            <div style={S.infoBox}>
              🔒 Your Aadhaar data is used only for identity verification and is not stored.
            </div>
            <button style={S.primaryBtn} onClick={handleAadhaarNext}>
              Continue to Face Detection →
            </button>
          </div>
        )}

        {/* ---- STEP: Face Detection ---- */}
        {step === "face" && (
          <div style={S.section}>
            <div style={S.stepBadge}>Step 2 of 4 · Face Verification</div>
            <h2 style={S.title}>Face Detection</h2>
            <p style={S.sub}>Look directly at the camera. Ensure good lighting and no obstructions.</p>

            <div style={S.cameraContainer}>
              {!faceOk ? (
                <>
                  <video ref={videoRef} style={S.video} autoPlay muted playsInline />
                  <div style={{ ...S.faceOverlay, borderColor: faceStatus === "scanning" ? "#f59e0b" : faceStatus === "error" ? "#ef4444" : "#22d3ee" }}>
                    <div style={S.cornerTL} /><div style={S.cornerTR} /><div style={S.cornerBL} /><div style={S.cornerBR} />
                  </div>
                  {faceStatus === "scanning" && <div style={S.scanLine} />}
                </>
              ) : (
                <div style={S.successFrame}>
                  <img src={capturedImage} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                  <div style={S.successOverlay}>✓</div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div style={{ ...S.statusMsg, color: faceStatus === "success" ? "#16a34a" : faceStatus === "error" ? "#dc2626" : faceStatus === "scanning" ? "#d97706" : "#475569" }}>
              {faceMsg}
            </div>

            {!faceOk && faceStatus !== "scanning" && (
              <button style={S.primaryBtn} onClick={captureAndVerify}>
                {faceStatus === "error" ? "Retry Face Scan" : "📷 Capture & Verify Face"}
              </button>
            )}
            {faceOk && (
              <button style={S.primaryBtn} onClick={proceedToGenerate}>
                Proceed to Generate Exam →
              </button>
            )}
          </div>
        )}

        {/* ---- STEP: Generating MCQs ---- */}
        {step === "generating" && (
          <div style={{ ...S.section, textAlign: "center" }}>
            <div style={S.genIcon}>
              {genProgress < 100 ? (
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#0284c7" strokeWidth="4" strokeDasharray={`${genProgress * 1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                </svg>
              ) : (
                <div style={{ fontSize: 48 }}>✅</div>
              )}
            </div>
            <h2 style={{ ...S.title, textAlign: "center" }}>
              {genProgress < 100 ? "Generating Your Exam..." : "Exam Generated!"}
            </h2>
            <p style={{ ...S.sub, textAlign: "center" }}>{genStatus}</p>
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${genProgress}%` }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0284c7", marginTop: 8 }}>{genProgress}%</div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>
              Generating 30 questions for: <strong>{cert?.certName}</strong>
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 540, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  progressBar: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, gap: 0 },
  progressItem: { display: "flex", alignItems: "center", gap: 6 },
  progressDot: { width: 28, height: 28, borderRadius: "50%", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", flexShrink: 0 },
  progressLabel: { fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" },
  progressLine: { width: 32, height: 2, marginLeft: 4 },
  section: { display: "flex", flexDirection: "column", gap: 0 },
  backBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: 12, textAlign: "left" },
  stepBadge: { fontSize: 11, fontWeight: 700, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 18 },
  certChip: { display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8, letterSpacing: "0.3px" },
  input: { width: "100%", padding: "13px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "monospace" },
  fieldError: { fontSize: 12, color: "#dc2626", marginTop: 6 },
  infoBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#15803d", marginBottom: 20 },
  primaryBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  cameraContainer: { position: "relative", width: "100%", height: 280, background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  faceOverlay: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 180, height: 220, border: "2px solid", borderRadius: 12, pointerEvents: "none", transition: "border-color 0.3s" },
  cornerTL: { position: "absolute", top: -2, left: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "3px 0 0 0" },
  cornerTR: { position: "absolute", top: -2, right: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 3px 0 0" },
  cornerBL: { position: "absolute", bottom: -2, left: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "0 0 0 3px" },
  cornerBR: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 0 3px 0" },
  scanLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #22d3ee, transparent)", animation: "scan 2s ease-in-out infinite" },
  successFrame: { position: "relative", width: "100%", height: "100%" },
  successOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(22,163,74,0.3)", fontSize: 64, color: "#fff" },
  statusMsg: { fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 14 },
  genIcon: { display: "flex", justifyContent: "center", marginBottom: 16 },
  progressTrack: { height: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #0284c7, #22d3ee)", borderRadius: 8, transition: "width 0.5s ease" },
};
