import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
      <p style={styles.sub}>Position your ID card in center of the frame. Ensure good lighting and clear visibility.</p>
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
              <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

      {phase === "scanning" && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.teal})` }} />
        </div>
      )}

      {phase === "done" && result && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: T.dim, letterSpacing: "0.5px", fontWeight: 600, textTransform: "uppercase" }}>Confidence Score</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: result.match ? T.green : T.red }}>{result.confidence}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${result.confidence}%`, background: result.match ? T.green : T.red }} />
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 13 }}>ℹ️</span>
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>verify Mode - Results are simulated</span>
          </div>
        </div>
      )}

      {phase === "align" && <button style={styles.btn} onClick={startScan}>Start Face Scan</button>}
      {phase === "done" && result?.match && (
        <button style={{ ...styles.btn, background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`, boxShadow: `0 2px 8px rgba(59, 130, 246, 0.25)` }} onClick={onVerified}>Proceed to Exam</button>
      )}
      {phase === "done" && !result?.match && (
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...styles.btn, ...styles.ghostBtn, flex: 1 }} onClick={retry}>Retry</button>
          <button style={{ ...styles.btn, background: `linear-gradient(135deg, ${T.red} 0%, #b91c1c 100%)`, boxShadow: `0 2px 8px rgba(220,38,38,0.15)`, flex: 2 }} onClick={onFail}>Contact Support</button>
        </div>
      )}
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

/* ── Step 3: Exam Ready — hiring only, goes to resume upload ── */
function ExamReady({ exam }) {
  const navigate    = useNavigate();
  const [countdown, setCountdown] = useState(null);

  const handleStart = () => {
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) {
        clearInterval(iv);
        // Hiring flow: go to resume upload
        navigate("/resume-upload", { state: { exam, fromExamVerify: true } });
      } else {
        setCountdown(c);
      }
    }, 1000);
  };

  return (
    <div style={{ ...styles.card, border: `1px solid ${T.border}`, background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
      {countdown !== null ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div key={countdown} style={{ fontFamily: "'Syne', sans-serif", fontSize: 88, fontWeight: 900, color: T.accent, letterSpacing: "-6px", animation: "pop .35s cubic-bezier(0.22,1,0.36,1)", lineHeight: 1 }}>{countdown}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 14, letterSpacing: "0.5px" }}>Loading instructions…</div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", fontSize: 10, color: T.green, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.6px", marginBottom: 12, fontWeight: 600, textTransform: "uppercase" }}>✓ Verification Successful</div>
          <h2 style={{ ...styles.h2, textAlign: "center", marginBottom: 6 }}>Ready to begin?</h2>
          <p style={{ ...styles.sub, textAlign: "center", marginBottom: 24 }}>{exam?.exam || "Data Structures Assessment"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              ["Duration",   exam?.duration   || "90 min"],
              ["Questions",  `${exam?.questions || 45} Qs`],
              ["Company",    exam?.company     || ""],
              ["Difficulty", exam?.difficulty  || "Hard"],
              ["Date",       exam?.date        || "Today"],
              ["Proctoring", "AI Active"],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: T.dim, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: T.amberSoft, border: `1px solid rgba(234,88,12,0.25)`, borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: T.amber, lineHeight: 1.8, margin: 0 }}>
              <strong>Important:</strong> Once started, tab switching, copy-paste, and window minimizing are disabled. AI proctoring monitors your activity.
            </p>
          </div>
          <button style={{ ...styles.btn, background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`, boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)" }} onClick={handleStart}>Start Exam</button>
        </>
      )}
    </div>
  );
}

/* ── Main ExamVerify — hiring only ── */
export default function ExamVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam }  = location.state || {};

  const [step,      setStep]      = useState(0);
  const [idCapture, setIdCapture] = useState(null);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const stepLabels = ["Scan ID Card", "Face Scan"];

  const fade = {
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: "opacity 0.5s ease 80ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) 80ms",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        html, body, #root { min-height: 100vh; margin: 0; padding: 0; }
        body { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%) !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes scanV  { 0%{top:-2px} 100%{top:100%} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pop    { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <div style={styles.root}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.grid} />

        <div style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 1, ...fade }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button onClick={() => navigate("/student-dashboard")}
              style={{ background: "#fff", border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", fontSize: 18, width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
            >←</button>
            <div>
              <div style={{ fontSize: 12, color: T.dim, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.6px", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Exam Verification</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: T.text, letterSpacing: "-0.3px" }}>{exam?.exam || "Exam Verification"}</div>
            </div>
            <div style={{ marginLeft: "auto", background: T.amberSoft, border: `1px solid rgba(234,88,12,0.3)`, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: T.amber, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.4px" }}>Verify Mode</div>
          </div>

          {step < 2 && (
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", marginBottom: 24 }}>
              {stepLabels.map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i === 0 ? 1 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: i < step ? T.green : i === step ? T.accent : "#f1f5f9", border: `2px solid ${i < step ? T.green : i === step ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: i <= step ? "#fff" : T.dim, transition: "all .3s" }}>
                      {i < step ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px", whiteSpace: "nowrap", fontWeight: 600, color: i === step ? T.accent : i < step ? T.green : T.dim }}>{label}</span>
                  </div>
                  {i === 0 && <div style={{ flex: 1, height: 2, margin: "0 12px", marginTop: -18, borderRadius: 99, background: step > 0 ? T.green : "#e2e8f0", transition: "background .3s" }} />}
                </div>
              ))}
            </div>
          )}

          {step === 0 && <IDCardScan onNext={(img) => { setIdCapture(img); setStep(1); }} />}
          {step === 1 && <FaceScan idCapture={idCapture} onVerified={() => setStep(2)} onFail={() => alert("Please contact your exam administrator.")} />}
          {step === 2 && <ExamReady exam={exam} />}
        </div>
      </div>
    </>
  );
}

const styles = {
  root: { minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'DM Sans', sans-serif", color: T.text, position: "relative" },
  orb1: { position: "fixed", top: "-15%", left: "-10%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 },
  orb2: { position: "fixed", bottom: "-15%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,0.06) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 },
  grid: { position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(59,130,246,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.02) 1px,transparent 1px)`, backgroundSize: "80px 80px", pointerEvents: "none", zIndex: 0 },
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 36px", boxShadow: "0 4px 16px rgba(59, 130, 246, 0.08)" },
  h2: { fontSize: 28, fontWeight: 600, marginBottom: 10, letterSpacing: "-0.2px", fontFamily: "'Syne', sans-serif", color: T.text },
  sub: { fontSize: 15, color: T.muted, marginBottom: 24, lineHeight: 1.6 },
  camBox: { position: "relative", width: "100%", aspectRatio: "4/3", background: "#f8fafc", borderRadius: 12, overflow: "hidden", marginBottom: 24, border: `1px solid ${T.border}` },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`, animation: "scanV 2.2s linear infinite", boxShadow: `0 0 10px ${T.accent}66`, pointerEvents: "none" },
  guideText: { position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: T.accent, letterSpacing: "0.8px", fontWeight: 600, pointerEvents: "none" },
  countdownOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", fontSize: 80, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: T.accent },
  capturedBadge: { position: "absolute", top: 12, right: 12, background: T.green, color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", padding: "6px 12px", borderRadius: 6, fontFamily: "'DM Sans', sans-serif" },
  camLabel: { fontSize: 11, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.6px", color: T.dim, marginBottom: 8, fontWeight: 600, textTransform: "uppercase" },
  spinner: { width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .7s linear infinite" },
  progressTrack: { background: "#e2e8f0", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 6, transition: "width .15s ease-out" },
  btn: { 
    width: "100%", 
    padding: "12px 0", 
    borderRadius: 8, 
    border: "none", 
    background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`, 
    color: "#fff", 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: "pointer", 
    fontFamily: "'DM Sans', sans-serif", 
    letterSpacing: "-0.2px", 
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)", 
    transition: "all 0.2s ease" 
  },
  btnDisabled: { opacity: .55, cursor: "not-allowed" },
  ghostBtn: { 
    background: "#fff", 
    border: `1.5px solid ${T.border}`, 
    color: T.text, 
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease"
  },
  amberSoft: T.amberSoft,
};