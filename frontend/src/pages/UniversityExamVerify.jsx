

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net');

const T = {
  bg:         "#f5f7fb",
  surface:    "#ffffff",
  border:     "#e2e8f0",
  accent:     "#2563eb",
  accentSoft: "#dbeafe",
  teal:       "#0891b2",
  green:      "#16a34a",
  greenSoft:  "#f0fdf4",
  red:        "#dc2626",
  redSoft:    "#fef2f2",
  amber:      "#ea580c",
  amberSoft:  "#fff7ed",
  text:       "#1e293b",
  muted:      "#64748b",
  dim:        "#94a3b8",
};

function captureFrame(videoEl) {
  const canvas = document.createElement("canvas");
  canvas.width  = videoEl?.videoWidth  || 640;
  canvas.height = videoEl?.videoHeight || 480;
  canvas.getContext("2d").drawImage(videoEl, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
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
      borderRadius: top && left ? "3px 0 0 0" : top && !left ? "0 3px 0 0" : !top && left ? "0 0 0 3px" : "0 0 3px 0",
    }} />
  );
}

const DUMMY_RESULTS = [
  { match: true,  confidence: 94, reason: "Face geometry and facial features match with high confidence." },
  { match: true,  confidence: 88, reason: "Identity confirmed. Minor lighting difference, but features align." },
  { match: true,  confidence: 97, reason: "Strong biometric match across key facial landmarks." },
  { match: false, confidence: 32, reason: "Face not clearly visible. Please ensure proper lighting and face the camera." },
  { match: false, confidence: 18, reason: "Could not detect a face in the live image. Please retry." },
];

function getSimulatedResult() {
  const pool = Math.random() < 0.8
    ? DUMMY_RESULTS.filter(r => r.match)
    : DUMMY_RESULTS.filter(r => !r.match);
  return pool[Math.floor(Math.random() * pool.length)];
}

const styles = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", maxWidth: 520, width: "100%", animation: "fadeUp 0.3s ease" },
  h2: { fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: "-0.4px" },
  sub: { fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.65 },
  btn: { width: "100%", padding: "12px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 2px 8px rgba(37,99,235,0.2)`, transition: "all .15s" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  ghostBtn: { background: T.surface, color: T.muted, border: `1px solid ${T.border}`, boxShadow: "none" },
  camBox: { position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3", border: `1.5px solid ${T.border}`, background: "#f8fafc", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center" },
  camLabel: { fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 8, letterSpacing: ".5px", textTransform: "uppercase" },
  capturedBadge: { position: "absolute", top: 12, right: 12, background: T.greenSoft, border: `1px solid ${T.green}44`, color: T.green, padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: ".4px" },
  scanLine: { position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,#2563eb,transparent)", animation: "scan 1.5s ease-in-out infinite" },
  guideText: { position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: "1px", textTransform: "uppercase" },
  countdownOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,247,251,0.92)", fontSize: 72, fontWeight: 900, color: T.accent, animation: "pop 0.3s cubic-bezier(0.22,1,0.36,1)" },
  spinner: { width: 44, height: 44, border: "3px solid rgba(37,99,235,0.15)", borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.9s linear infinite" },
};

/* ── Step 1: ID Card Scan ── */
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
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
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
    <div style={styles.card}>
      <h2 style={styles.h2}>ID Card Capture</h2>
      <p style={styles.sub}>Position your ID card in the center of the frame. Ensure good lighting and clear visibility.</p>
      <div style={styles.camBox}>
        {!captured ? (
          <>
            {camError ? (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#f8f9fc" }}>
                <span style={{ fontSize: 36 }}>📷</span>
                <span style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "0 20px" }}>Camera not available.<br/>Click capture to simulate.</span>
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline onCanPlay={() => setReady(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            {["tl","tr","bl","br"].map((p) => <Corner key={p} pos={p} color={T.accent} />)}
            <div style={styles.scanLine} />
            <div style={styles.guideText}>ALIGN ID CARD HERE</div>
            {tick !== null && <div style={styles.countdownOverlay}>{tick}</div>}
          </>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {captured.length > 100 ? (
              <img src={captured} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, background: "#f0fdf4" }}>
                <span style={{ fontSize: 36 }}>🪪</span>
                <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>ID Captured (Simulated)</span>
              </div>
            )}
            <div style={styles.capturedBadge}>✓ CAPTURED</div>
          </div>
        )}
      </div>
      {!captured ? (
        <button style={{ ...styles.btn, ...((!ready && !camError) || tick !== null ? styles.btnDisabled : {}) }} disabled={tick !== null} onClick={startCountdown}>
          {tick !== null ? `Capturing in ${tick}…` : "Capture ID Card"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...styles.btn, ...styles.ghostBtn, flex: 1 }} onClick={() => setCaptured(null)}>Retake</button>
          <button style={{ ...styles.btn, flex: 2 }} onClick={() => onNext(captured)}>Continue</button>
        </div>
      )}
      <style>{`@keyframes pop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes scan{0%,100%{transform:translateY(-100%)}50%{transform:translateY(100%)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Step 2: Face Scan ── */
function FaceScan({ idCapture, onVerified, onFail }) {
  const videoRef = useRef(null);
  const [phase,    setPhase]    = useState("align");
  const [,        setFaceImg]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [camError, setCamError] = useState(false);
  const [, setAnalysisDots]     = useState("");

  useEffect(() => {
    if (phase !== "align" && phase !== "scanning") return;
    let stream;
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCamError(true));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [phase]);

  useEffect(() => {
    if (phase !== "comparing") return;
    let i = 0;
    const iv = setInterval(() => { i++; setAnalysisDots(".".repeat((i % 3) + 1)); }, 400);
    return () => clearInterval(iv);
  }, [phase]);

  const startScan = () => {
    setPhase("scanning");
    let p = 0;
    const iv = setInterval(() => {
      p += 2.2;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(iv);
        const frame = videoRef.current?.readyState > 0
          ? captureFrame(videoRef.current)
          : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        setFaceImg(frame);
        setPhase("comparing");
        setTimeout(() => { const res = getSimulatedResult(); setResult(res); setPhase("done"); }, 2800);
      }
    }, 55);
  };

  const retry = () => { setPhase("align"); setResult(null); setFaceImg(null); setProgress(0); setAnalysisDots(""); };

  const borderColor = phase === "done" ? result?.match ? T.green : T.red : phase === "scanning" || phase === "comparing" ? T.accent : T.border;

  const ANALYSIS_STEPS = ["Detecting facial landmarks…", "Comparing biometric features…", "Running identity cross-check…", "Calculating confidence score…"];

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>
        {phase === "done" && result?.match ? "Verification Successful" : phase === "done" ? "Verification Failed" : phase === "comparing" ? "Analyzing…" : phase === "scanning" ? "Scanning…" : "Face Capture"}
      </h2>
      <p style={styles.sub}>
        {phase === "align"     && "Look at the camera directly. Ensure good lighting and clear visibility."}
        {phase === "scanning"  && "Please hold still while we capture your biometric data."}
        {phase === "comparing" && "Verifying your identity against the ID card image."}
        {phase === "done"      && result?.reason}
      </p>

      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={styles.camLabel}>ID Card</div>
          <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", border: `1px solid ${T.border}`, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {idCapture && idCapture.length > 200 ? (
              <img src={idCapture} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ textAlign: "center", padding: 12 }}><span style={{ fontSize: 32 }}>🪪</span><div style={{ fontSize: 11, color: T.dim, marginTop: 6, fontWeight: 500 }}>Simulated</div></div>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.camLabel}>Live Face</div>
          <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", position: "relative", background: "#f8fafc", border: `1.5px solid ${borderColor}`, boxShadow: phase !== "align" ? `0 0 12px ${borderColor}33` : "none", transition: "border-color .3s, box-shadow .3s" }}>
            {phase === "align" || phase === "scanning" ? (
              camError ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 28 }}>📷</span><span style={{ fontSize: 10, color: T.dim }}>Simulated</span></div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}><span style={{ fontSize: 28 }}>👤</span></div>
            )}
            {phase === "scanning" && <div style={styles.scanLine} />}
            {phase === "comparing" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(67,97,238,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={styles.spinner} />
              </div>
            )}
            {phase === "done" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: result?.match ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.1)" }}>
                <span style={{ fontSize: 32, animation: "pop .4s ease" }}>{result?.match ? "✅" : "❌"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {phase === "comparing" && (
        <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
          {ANALYSIS_STEPS.map((step, i) => <SimulatedLogLine key={i} text={step} delay={i * 650} />)}
        </div>
      )}

      {phase === "done" && (
        <div>
          <div style={{ background: result?.match ? T.greenSoft : T.redSoft, border: `1px solid ${result?.match ? T.green : T.red}44`, borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: result?.match ? T.green : T.red, marginBottom: 4 }}>Confidence: {result?.confidence}%</div>
            <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>{result?.reason}</div>
          </div>
          {result?.match ? (
            <button style={styles.btn} onClick={onVerified}>Proceed to Exam Key →</button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...styles.btn, ...styles.ghostBtn, flex: 1 }} onClick={retry}>Retry</button>
              <button style={{ ...styles.btn, background: T.red, boxShadow: `0 2px 8px rgba(220,38,38,.2)`, flex: 2 }} onClick={onFail}>Contact Support</button>
            </div>
          )}
        </div>
      )}

      {phase !== "done" && (
        <button style={styles.btn} disabled={phase !== "align"} onClick={startScan}>
          {phase === "align" && "Start Face Scan"}
          {phase === "scanning" && "Scanning…"}
          {phase === "comparing" && "Analyzing…"}
        </button>
      )}

      <style>{`@keyframes pop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes scan{0%,100%{transform:translateY(-100%)}50%{transform:translateY(100%)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SimulatedLogLine({ text, delay }) {
  const [visible, setVisible] = useState(false);
  const [done,    setDone]    = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setDone(true), delay + 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay]);
  if (!visible) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", animation: "fadeUp 0.3s ease" }}>
      <span style={{ fontSize: 11 }}>
        {done ? "✅" : <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: `2px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite", verticalAlign: "middle" }} />}
      </span>
      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: done ? T.muted : T.text, letterSpacing: "0.3px" }}>{text}</span>
    </div>
  );
}

function ExamKeyStep({ exam, onVerified }) {
  const [key,     setKey]     = useState(exam?.verifyCode || "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (exam?.verifyCode && !autoTried) {
      setAutoTried(true);
      handleValidate(exam.verifyCode);
    }
  }, []);

  const handleValidate = async (overrideKey) => {
    const examKey = (overrideKey || key).trim();
    if (!examKey) { setError("Please enter your exam key."); return; }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/exams/university/validate-key`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ exam_key: examKey }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error || "Invalid exam key. Please check and try again.");
        setLoading(false);
        return;
      }

      onVerified({
        exam_id:      data.exam_id,
        assignment_id:data.assignment_id,
        title:        data.title,
        subject:      data.subject,
        duration:     data.duration,
        total_marks:  data.total_marks,
        section_config: data.section_config,
        mcq:          Array.isArray(data.mcq)     ? data.mcq     : [],
        written:      Array.isArray(data.written)  ? data.written  : [],
      });
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Enter Exam Key</h2>
      <p style={styles.sub}>Check your email for your unique exam key and enter it below to proceed to instructions.</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: "block", marginBottom: 8, letterSpacing: 0.4 }}>YOUR UNIQUE EXAM KEY</label>
        <input
          value={key}
          onChange={e => { setKey(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleValidate()}
          placeholder="e.g. UNI-ABCD1234EF"
          disabled={loading}
          style={{
            width: "100%", padding: "13px 16px",
            fontSize: 15, fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            letterSpacing: 2, textAlign: "center",
            border: `2px solid ${error ? T.red : key ? T.accent : T.border}`,
            borderRadius: 10, outline: "none",
            background: T.surface, color: T.text,
            transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && (
        <div style={{
          background: T.redSoft, border: `1px solid ${T.red}44`,
          borderRadius: 8, padding: "10px 14px",
          fontSize: 12.5, color: T.red, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <button
        onClick={() => handleValidate()}
        disabled={loading || !key.trim()}
        style={{
          width: "100%", padding: "12px",
          borderRadius: 10, border: "none",
          background: loading || !key.trim() ? "#d1d5db" : T.green,
          color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading || !key.trim() ? "not-allowed" : "pointer",
          boxShadow: loading || !key.trim() ? "none" : `0 2px 12px rgba(22,163,74,0.3)`,
          transition: "all 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Verifying Key…
          </>
        ) : "Continue to Instructions →"}
      </button>
    </div>
  );
}

/* ── Main UniversityExamVerify ── */
export default function UniversityExamVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam } = location.state || {};

  const [step,      setStep]      = useState(0);
  const [idCapture, setIdCapture] = useState(null);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const stepLabels = ["Scan ID Card", "Face Scan", "Exam Key"];

  const handleKeyVerified = (examData) => {
    // After exam key is validated, go to Instruction with isUniversity flag
    navigate("/instruction", {
      replace: true,
      state: {
        examData,
        isUniversity: true,
      },
    });
  };

  const handleFaceFailed = () => {
    alert("Face verification failed. Please contact support.");
  };

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: 24,
    }}>
      {/* Progress indicators */}
      <div style={{ position: "absolute", top: 20, left: 20, right: 20, display: "flex", gap: 8, maxWidth: 520, margin: "0 auto" }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: i === step ? T.accent : i < step ? T.green : T.border,
              color: i <= step ? "#fff" : T.dim,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              transition: "all 0.3s",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: i === step ? T.accent : T.muted, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ animation: mounted ? "fadeUp 0.3s ease" : "none", maxWidth: 520 }}>
        {step === 0 && <IDCardScan onNext={(capture) => { setIdCapture(capture); setStep(1); }} />}
        {step === 1 && <FaceScan idCapture={idCapture} onVerified={() => setStep(2)} onFail={handleFaceFailed} />}
        {step === 2 && <ExamKeyStep exam={exam} onVerified={handleKeyVerified} />}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scan { 0%, 100% { transform: translateY(-100%); } 50% { transform: translateY(100%); } }
      `}</style>
    </div>
  );
}
