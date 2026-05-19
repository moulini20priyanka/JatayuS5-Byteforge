// frontend/src/components/certExam/CertExamPortal.jsx
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Load face-api.js from CDN ────────────────────────────────────────────────
const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODELS_URL  = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let faceApiLoaded  = false;
let faceApiLoading = false;

async function loadFaceApi() {
  if (faceApiLoaded) return true;
  if (faceApiLoading) {
    await new Promise(r => setTimeout(r, 3000));
    return faceApiLoaded;
  }
  faceApiLoading = true;
  try {
    if (!window.faceapi) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = FACEAPI_CDN;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
    ]);
    faceApiLoaded = true;
    console.log("[Proctoring] face-api.js models loaded ✅");
    return true;
  } catch (e) {
    console.warn("[Proctoring] face-api.js failed to load:", e.message);
    faceApiLoading = false;
    return false;
  }
}

// ─── Gaze direction from landmarks ───────────────────────────────────────────
function getGazeDirection(landmarks) {
  try {
    const leftEye  = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose     = landmarks.getNose();
    const jaw      = landmarks.getJawOutline();
    const eyeCenterX = (
      leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length +
      rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length
    ) / 2;
    const faceLeft  = jaw[0].x;
    const faceRight = jaw[16].x;
    const faceWidth = faceRight - faceLeft;
    const noseX     = nose[3].x;
    const ratio     = (noseX - faceLeft) / faceWidth;
    if (ratio < 0.35) return "right";
    if (ratio > 0.65) return "left";
    const eyeCenterY = (
      leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length +
      rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length
    ) / 2;
    const noseY = nose[3].y;
    if (noseY - eyeCenterY < 20) return "up";
    return "center";
  } catch {
    return "center";
  }
}

// ─── Proctoring Hook ─────────────────────────────────────────────────────────
function useProctoring({ onViolation, active }) {
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const faceCheckRef  = useRef(null);
  const voiceCheckRef = useRef(null);
  const tabRef        = useRef(null);       // ← defined here
  const [cameraReady,  setCameraReady]  = useState(false);
  const [faceApiReady, setFaceApiReady] = useState(false);

  const capture = useCallback(() => {
    if (!videoRef.current) return null;
    const c = document.createElement("canvas");
    c.width = 320; c.height = 240;
    c.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    return c.toDataURL("image/jpeg", 0.6);
  }, []);

  // ── Camera + Audio + face-api ─────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: true,
        });
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
          window.__examAnalyser__ = analyser; // expose for live meter
        }
        const ok = await loadFaceApi();
        if (!cancelled) setFaceApiReady(ok);
      } catch (e) {
        onViolation({ type: "camera_denied", screenshot: null, msg: "Camera/mic access denied" });
      }
    })();
    return () => { cancelled = true; };
  }, [active]);

  // ── Face + Gaze detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !cameraReady) return;
    let noFaceStreak    = 0;
    let gazeAwayStreak  = 0;
    let multiFaceStreak = 0;
    let lastGazeFlagTime   = 0;
    let lastNoFaceFlagTime = 0;
    const COOLDOWN = 30000;

    faceCheckRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      const screenshot = capture();
      const now = Date.now();

      if (faceApiReady && window.faceapi) {
        try {
          const detections = await window.faceapi
            .detectAllFaces(
              videoRef.current,
              new window.faceapi.TinyFaceDetectorOptions({
                scoreThreshold: 0.25, // lowered from 0.4 — more sensitive
                inputSize: 224,       // larger input = better detection
              })
            )
            .withFaceLandmarks(true);
          const count = detections.length;

          if (count === 0) {
            noFaceStreak++;
            gazeAwayStreak  = 0;
            multiFaceStreak = 0;
            // Need 3 consecutive no-face checks before flagging (was 2)
            if (noFaceStreak >= 3 && now - lastNoFaceFlagTime > COOLDOWN) {
              noFaceStreak = 0;
              lastNoFaceFlagTime = now;
              onViolation({ type: "no_face", screenshot, msg: "No face detected in frame" });
            }
          } else if (count > 1) {
            noFaceStreak = 0;
            multiFaceStreak++;
            // Need 2 consecutive multi-face checks before flagging
            if (multiFaceStreak >= 2 && now - lastNoFaceFlagTime > COOLDOWN) {
              multiFaceStreak = 0;
              lastNoFaceFlagTime = now;
              onViolation({ type: "multiple_faces", screenshot, msg: `${count} faces detected` });
            }
          } else {
            // Exactly 1 face — all good, reset streaks
            noFaceStreak    = 0;
            multiFaceStreak = 0;
            const gaze = getGazeDirection(detections[0].landmarks);
            if (gaze !== "center") {
              gazeAwayStreak++;
              // Need 3 consecutive gaze-away checks (was 2)
              if (gazeAwayStreak >= 3 && now - lastGazeFlagTime > COOLDOWN) {
                gazeAwayStreak = 0;
                lastGazeFlagTime = now;
                onViolation({ type: "eye_gaze", screenshot, msg: `Eyes looking ${gaze} — not on screen` });
              }
            } else {
              gazeAwayStreak = 0;
            }
          }
          return;
        } catch (e) {
          console.warn("[Proctoring] face-api error:", e.message);
        }
      }

      // Pixel fallback if face-api not loaded
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 64, 48);
      const pixels = ctx.getImageData(0, 0, 64, 48).data;
      let centerBright = 0, edgeBright = 0, centerCount = 0, edgeCount = 0;
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          const bright = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
          const inCenter = x > 16 && x < 48 && y > 8 && y < 40;
          if (inCenter) { centerBright += bright; centerCount++; }
          else { edgeBright += bright; edgeCount++; }
        }
      }
      const diff = Math.abs(centerBright / centerCount - edgeBright / edgeCount);
      if (diff < 8 && now - lastNoFaceFlagTime > COOLDOWN) {
        noFaceStreak++;
        if (noFaceStreak >= 3) {
          noFaceStreak = 0;
          lastNoFaceFlagTime = now;
          onViolation({ type: "no_face", screenshot, msg: "No face detected" });
        }
      } else {
        noFaceStreak = 0;
      }
    }, 3000);

    return () => clearInterval(faceCheckRef.current);
  }, [active, cameraReady, faceApiReady, capture, onViolation]);

  // ── Voice detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !cameraReady) return;
    const AMBIENT_MAX  = 55;
    const VOICE_MIN    = 75;
    const COOLDOWN_MS  = 60000;
    const STRIKES_SOFT = 5;
    const STRIKES_HARD = 3;
    let strikes = 0;
    let lastFlagTime = 0;

    voiceCheckRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const midStart = Math.floor(data.length * 0.15);
      const midEnd   = Math.floor(data.length * 0.55);
      const midSlice = Array.from(data).slice(midStart, midEnd);
      const avg      = midSlice.reduce((a, b) => a + b, 0) / midSlice.length;
      const now      = Date.now();
      const cooledDown = (now - lastFlagTime) > COOLDOWN_MS;

      if (avg <= AMBIENT_MAX) {
        strikes = 0;
      } else if (avg <= VOICE_MIN) {
        if (cooledDown) {
          strikes++;
          if (strikes >= STRIKES_SOFT) {
            strikes = 0; lastFlagTime = now;
            onViolation({ type: "voice_detected", screenshot: capture(), msg: `Sustained noise (level: ${Math.round(avg)})` });
          }
        }
      } else {
        if (cooledDown) {
          strikes++;
          if (strikes >= STRIKES_HARD) {
            strikes = 0; lastFlagTime = now;
            onViolation({ type: "voice_detected", screenshot: capture(), msg: `Voice detected (level: ${Math.round(avg)})` });
          }
        }
      }
    }, 4000);

    return () => clearInterval(voiceCheckRef.current);
  }, [active, cameraReady, capture, onViolation]);

  // ── Tab switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const handleVisibility = () => {
      if (document.hidden) {
        onViolation({ type: "tab_switch", screenshot: null, msg: "Student left exam tab" });
      }
    };
    tabRef.current = handleVisibility;
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, onViolation]);

  // ── Fullscreen exit detection ─────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const handleFs = () => {
      if (!document.fullscreenElement) {
        onViolation({ type: "fullscreen_exit", screenshot: null, msg: "Exited fullscreen mode" });
      }
    };
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, [active]);

  const stop = useCallback(() => {
    clearInterval(faceCheckRef.current);
    clearInterval(voiceCheckRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  }, []);

  return { videoRef, cameraReady, faceApiReady, stop };
}

// ─── Main Exam Portal ─────────────────────────────────────────────────────────
export default function CertExamPortal({ examData, cert, onFinish }) {
  const { questions = [], certName = "" } = examData || {};
  const [current,     setCurrent]     = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [violations,  setViolations]  = useState([]);
  const [activeWarning, setActiveWarning] = useState(null);
  const [examActive,  setExamActive]  = useState(true);
  const [timeLeft,    setTimeLeft]    = useState(60 * 60);
  const [submitting,  setSubmitting]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dbLevel,     setDbLevel]     = useState(0);   // live sound level 0-100
  const [soundAlert,  setSoundAlert]  = useState(false); // true when db too high
  const timerRef      = useRef(null);
  const warningTimerRef = useRef(null);
  const examStarted   = useRef(false);

  useEffect(() => {
    if (!examStarted.current) {
      examStarted.current = true;
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!examActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [examActive]);

  // ── Live sound level meter — updates every 300ms for sidebar display ──────
  const soundMeterRef = useRef(null);
  const analyserLiveRef = useRef(null); // shared from proctoring hook via ref
  useEffect(() => {
    if (!examActive) return;
    soundMeterRef.current = setInterval(() => {
      // Access analyser from window (shared by proctoring hook)
      const analyser = window.__examAnalyser__;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const level = Math.min(100, Math.round(avg * 1.5)); // scale to 0-100
      setDbLevel(level);
      // Show alert if above 60 (loud talking threshold)
      if (level > 60) {
        setSoundAlert(true);
        setTimeout(() => setSoundAlert(false), 3000);
      }
    }, 300);
    return () => clearInterval(soundMeterRef.current);
  }, [examActive]);

  const onViolation = useCallback(async (v) => {
    const entry = { ...v, timestamp: new Date().toISOString(), id: Date.now() };
    setViolations(prev => [...prev, entry]);
    setActiveWarning(entry);
    clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setActiveWarning(null), 4000);
    try {
      await fetch("${process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'}/api/cert-exam/analyze-violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ violationType: v.type, context: v.msg }),
      });
    } catch (_) {}
  }, []);

  const { videoRef, cameraReady, faceApiReady, stop } = useProctoring({ onViolation, active: examActive });

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const handleAnswer = (qId, option) => setAnswers(prev => ({ ...prev, [qId]: option }));

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setExamActive(false);
    clearInterval(timerRef.current);
    stop();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});

    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    const score   = Math.round((correct / questions.length) * 100);

    let aiReport = { summary: "Exam completed.", integrityScore: null, recommendation: score >= 70 ? "pass" : "fail", details: "" };
    try {
      const res = await fetch("${process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'}/api/cert-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certName, score, totalQuestions: questions.length, correct, violations }),
      });
      const d = await res.json();
      if (d.success) aiReport = d.report;
    } catch (_) {}

    onFinish({ questions, answers, correct, score, totalQuestions: questions.length, violations, certName, aiReport, autoSubmit: auto, timeUsed: 3600 - timeLeft });
  }, [answers, questions, violations, certName, stop, timeLeft, submitting]);

  const q        = questions[current] || {};
  const answered  = Object.keys(answers).length;
  const unanswered = questions.length - answered;

  return (
    <div style={E.page}>
      {/* Warning Banner */}
      {activeWarning && (
        <div style={E.warningBanner}>
          ⚠️ {VIOLATION_LABELS[activeWarning.type] || activeWarning.type}: {activeWarning.msg}
          <span style={{ float: "right", cursor: "pointer" }} onClick={() => setActiveWarning(null)}>✕</span>
          <style>{`@keyframes pulse { from { opacity:1; } to { opacity:0.5; } }`}</style>
        </div>
      )}

      {/* Top Bar */}
      <div style={E.topBar}>
        <div>
          <div style={E.examTitle}>{certName}</div>
          <div style={E.examSub}>Proctored Certification Exam</div>
        </div>
        <div style={{ ...E.timer, color: timeLeft < 300 ? "#dc2626" : "#0f172a" }}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <div style={E.topRight}>
          <div style={E.proctoringChip}>
            <span style={{ ...E.procDot, background: cameraReady ? "#22c55e" : "#f59e0b" }} />
            {faceApiReady ? "AI Proctoring Active" : "Proctoring Active"}
          </div>
          <div style={E.violationCount}>{violations.length} Violation{violations.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <div style={E.body}>
        {/* Sidebar */}
        <div style={E.sidebar}>
          <div style={E.sideHead}>Questions ({questions.length})</div>
          <div style={E.qGrid}>
            {questions.map((q, i) => (
              <div key={q.id} onClick={() => setCurrent(i)}
                style={{ ...E.qDot, background: answers[q.id] ? "#0284c7" : i === current ? "#e0f2fe" : "#f8fafc", color: answers[q.id] ? "#fff" : i === current ? "#0284c7" : "#64748b", border: i === current ? "2px solid #0284c7" : "1.5px solid #e2e8f0", fontWeight: i === current ? 700 : 500 }}>
                {i + 1}
              </div>
            ))}
          </div>
          <div style={E.sideStats}>
            <div><span style={{ color: "#0284c7", fontWeight: 700 }}>{answered}</span> answered</div>
            <div><span style={{ color: "#f59e0b", fontWeight: 700 }}>{unanswered}</span> remaining</div>
          </div>
          <div style={E.cameraBox}>
            <div style={E.cameraLabel}>📷 Proctoring Camera</div>
            <video ref={videoRef} autoPlay muted playsInline style={E.cameraFeed} />
          </div>

          {/* Sound Level Meter */}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>🎙️ Sound Level</span>
              <span style={{ color: dbLevel > 60 ? "#ef4444" : dbLevel > 35 ? "#f59e0b" : "#22c55e", fontWeight: 700 }}>
                {dbLevel > 60 ? "LOUD" : dbLevel > 35 ? "MID" : "LOW"}
              </span>
            </div>
            {/* Bar */}
            <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${dbLevel}%`,
                borderRadius: 4,
                transition: "width 0.2s ease",
                background: dbLevel > 60 ? "#ef4444" : dbLevel > 35 ? "#f59e0b" : "#22c55e",
              }} />
            </div>
            {/* Segments */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {[0,20,40,60,80,100].map(v => (
                <span key={v} style={{ fontSize: 8, color: "#475569" }}>{v}</span>
              ))}
            </div>
            {/* Alert message */}
            {soundAlert && (
              <div style={{ marginTop: 6, background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: 6, padding: "5px 8px", fontSize: 10, color: "#fca5a5", fontWeight: 700, textAlign: "center", animation: "pulse 0.5s ease infinite alternate" }}>
                ⚠️ Too loud! Please stay quiet
              </div>
            )}
          </div>
          <button style={E.submitBtn} onClick={() => setShowConfirm(true)} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>

        {/* Question Area */}
        <div style={E.main}>
          {questions.length === 0 ? (
            <div style={E.loading}>Loading exam questions...</div>
          ) : (
            <>
              <div style={E.qHeader}>
                <span style={E.qNumber}>Q{current + 1} / {questions.length}</span>
                <span style={{ ...E.diffBadge, ...DIFF_STYLES[q.difficulty || "medium"] }}>{q.difficulty || "medium"}</span>
                <span style={E.topicBadge}>{q.topic}</span>
              </div>
              <div style={E.qText}>{q.question}</div>
              <div style={E.options}>
                {q.options && Object.entries(q.options).map(([key, val]) => (
                  <div key={key} onClick={() => handleAnswer(q.id, key)}
                    style={{ ...E.option, borderColor: answers[q.id] === key ? "#0284c7" : "#e2e8f0", background: answers[q.id] === key ? "#eff6ff" : "#fff", boxShadow: answers[q.id] === key ? "0 0 0 3px #bae6fd" : "none" }}>
                    <div style={{ ...E.optKey, background: answers[q.id] === key ? "#0284c7" : "#f1f5f9", color: answers[q.id] === key ? "#fff" : "#475569" }}>{key}</div>
                    <span style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={E.navRow}>
                <button style={E.navBtn} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Previous</button>
                <button style={{ ...E.navBtn, ...E.navBtnPrimary }} onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>Next →</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={E.modalOverlay}>
          <div style={E.modal}>
            <h3 style={{ margin: "0 0 12px", color: "#0f172a" }}>Submit Exam?</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              You have answered {answered} of {questions.length} questions.
              {unanswered > 0 && <><br /><strong style={{ color: "#dc2626" }}>{unanswered} questions unanswered!</strong></>}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={E.cancelBtn} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button style={E.confirmBtn} onClick={() => { setShowConfirm(false); handleSubmit(false); }}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
const E = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", userSelect: "none" },
  warningBanner: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "#dc2626", color: "#fff", padding: "12px 20px", fontSize: 13, fontWeight: 600 },
  topBar: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  examTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  examSub: { fontSize: 11, color: "#64748b" },
  timer: { fontSize: 22, fontWeight: 800, letterSpacing: "2px", fontVariantNumeric: "tabular-nums" },
  topRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  proctoringChip: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#166534", background: "#f0fdf4", padding: "3px 10px", borderRadius: 20, border: "1px solid #bbf7d0" },
  procDot: { width: 7, height: 7, borderRadius: "50%" },
  violationCount: { fontSize: 11, color: "#dc2626", fontWeight: 700 },
  body: { flex: 1, display: "flex", overflow: "hidden" },
  sidebar: { width: 220, background: "#fff", borderRight: "1px solid #e2e8f0", padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flexShrink: 0 },
  sideHead: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px" },
  qGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 },
  qDot: { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer", transition: "all 0.15s" },
  sideStats: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" },
  cameraBox: { background: "#0f172a", borderRadius: 10, overflow: "hidden" },
  cameraLabel: { fontSize: 10, color: "#94a3b8", padding: "6px 8px" },
  cameraFeed: { width: "100%", height: 130, objectFit: "cover", display: "block" },
  submitBtn: { width: "100%", padding: "11px", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: "auto" },
  main: { flex: 1, padding: "28px 36px", overflowY: "auto" },
  loading: { color: "#64748b", fontSize: 15, textAlign: "center", paddingTop: 60 },
  qHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  qNumber: { fontSize: 12, fontWeight: 700, color: "#64748b" },
  diffBadge: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 },
  topicBadge: { fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 9px", borderRadius: 20, border: "1px solid #e2e8f0" },
  qText: { fontSize: 17, fontWeight: 600, color: "#0f172a", lineHeight: 1.6, marginBottom: 24 },
  options: { display: "flex", flexDirection: "column", gap: 12 },
  option: { display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", border: "2px solid", borderRadius: 12, cursor: "pointer", transition: "all 0.15s" },
  optKey: { width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.15s" },
  navRow: { display: "flex", justifyContent: "space-between", marginTop: 28 },
  navBtn: { padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  navBtnPrimary: { background: "#0284c7", color: "#fff", border: "none" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%" },
  cancelBtn: { flex: 1, padding: "10px", background: "#f1f5f9", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#475569" },
  confirmBtn: { flex: 1, padding: "10px", background: "#dc2626", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff" },
};
