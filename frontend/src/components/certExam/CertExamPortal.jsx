// frontend/src/components/certExam/CertExamPortal.jsx
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Load face-api.js from CDN ────────────────────────────────────────────────
const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODELS_URL  = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let faceApiLoaded = false;
let faceApiLoading = false;

async function loadFaceApi() {
  if (faceApiLoaded) return true;
  if (faceApiLoading) {
    // Wait for it to finish
    await new Promise(r => setTimeout(r, 3000));
    return faceApiLoaded;
  }
  faceApiLoading = true;
  try {
    // Load script if not present
    if (!window.faceapi) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = FACEAPI_CDN;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    // Load models needed: tinyFaceDetector + faceLandmarks68
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
// Returns "center" | "left" | "right" | "up" | "down"
function getGazeDirection(landmarks) {
  try {
    const leftEye  = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose     = landmarks.getNose();
    const jaw      = landmarks.getJawOutline();

    // Face center x
    const eyeCenterX = (
      leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length +
      rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length
    ) / 2;

    const faceLeft  = jaw[0].x;
    const faceRight = jaw[16].x;
    const faceWidth = faceRight - faceLeft;
    const noseX     = nose[3].x; // nose tip

    // Horizontal gaze ratio
    const ratio = (noseX - faceLeft) / faceWidth;

    if (ratio < 0.35) return "right"; // looking right (mirrored camera)
    if (ratio > 0.65) return "left";  // looking left

    // Vertical: compare nose tip to eye center y
    const eyeCenterY = (
      leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length +
      rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length
    ) / 2;
    const noseY = nose[3].y;
    const eyeToNoseDist = noseY - eyeCenterY;
    if (eyeToNoseDist < 20) return "up";

    return "center";
  } catch {
    return "center";
  }
}

// ─── Proctoring Hook ─────────────────────────────────────────────────────────
function useProctoring({ onViolation, active }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const faceCheckRef  = useRef(null);
  const voiceCheckRef = useRef(null);
  const tabRef        = useRef(null); 
  const [cameraReady, setCameraReady] = useState(false);
  const [faceApiReady, setFaceApiReady] = useState(false);

  const capture = useCallback(() => {
    if (!videoRef.current) return null;
    const c = document.createElement("canvas");
    c.width = 320; c.height = 240;
    c.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    return c.toDataURL("image/jpeg", 0.6);
  }, []);

  // ── Start camera + audio + load face-api ──────────────────────────────────
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
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);

        // Audio analyser
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

        // Load face-api.js models in background
        const ok = await loadFaceApi();
        if (!cancelled) setFaceApiReady(ok);
      } catch (e) {
        onViolation({ type: "camera_denied", screenshot: null, msg: "Camera/mic access denied" });
      }
    })();

    return () => { cancelled = true; };
  }, [active]);

  // ── Real face + gaze detection using face-api.js ──────────────────────────
  useEffect(() => {
    if (!active || !cameraReady) return;

    let noFaceStreak   = 0;
    let gazeAwayStreak = 0;
    let lastGazeFlagTime   = 0;
    let lastNoFaceFlagTime = 0;
    const COOLDOWN = 30000; // 30s cooldown per violation type

    faceCheckRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      const screenshot = capture();
      const now = Date.now();

      // ── Real detection if face-api loaded ────────────────────────────────
      if (faceApiReady && window.faceapi) {
        try {
          const detections = await window.faceapi
            .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
            .withFaceLandmarks(true); // true = use tiny landmark model

          const count = detections.length;

          // No face
          if (count === 0) {
            noFaceStreak++;
            gazeAwayStreak = 0;
            if (noFaceStreak >= 2 && now - lastNoFaceFlagTime > COOLDOWN) {
              noFaceStreak = 0;
              lastNoFaceFlagTime = now;
              onViolation({ type: "no_face", screenshot, msg: "No face detected in frame" });
            }
          }
          // Multiple faces
          else if (count > 1) {
            noFaceStreak = 0;
            if (now - lastNoFaceFlagTime > COOLDOWN) {
              lastNoFaceFlagTime = now;
              onViolation({ type: "multiple_faces", screenshot, msg: `${count} faces detected in frame` });
            }
          }
          // Exactly 1 face — check gaze
          else {
            noFaceStreak = 0;
            const landmarks = detections[0].landmarks;
            const gaze = getGazeDirection(landmarks);

            if (gaze !== "center") {
              gazeAwayStreak++;
              if (gazeAwayStreak >= 2 && now - lastGazeFlagTime > COOLDOWN) {
                gazeAwayStreak = 0;
                lastGazeFlagTime = now;
                onViolation({ type: "eye_gaze", screenshot, msg: `Eyes looking ${gaze} — not focused on screen` });
              }
            } else {
              gazeAwayStreak = 0;
            }
          }
          return;
        } catch (e) {
          // face-api error — fall through to fallback
          console.warn("[Proctoring] face-api detection error:", e.message);
        }
      }

      // ── Fallback: pixel-based motion detection (no face-api) ─────────────
      // Compare brightness of center vs edges to estimate face presence
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 64, 48);
      const pixels = ctx.getImageData(0, 0, 64, 48).data;

      // Center region brightness (where face should be)
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
      const centerAvg = centerBright / centerCount;
      const edgeAvg   = edgeBright / edgeCount;
      const diff = Math.abs(centerAvg - edgeAvg);

      // If center has very little contrast vs edges → likely no face
      if (diff < 8 && now - lastNoFaceFlagTime > COOLDOWN) {
        noFaceStreak++;
        if (noFaceStreak >= 3) {
          noFaceStreak = 0;
          lastNoFaceFlagTime = now;
          onViolation({ type: "no_face", screenshot, msg: "No face detected (pixel analysis)" });
        }
      } else {
        noFaceStreak = 0;
      }

    }, 3000); // check every 3 seconds

    return () => clearInterval(faceCheckRef.current);
  }, [active, cameraReady, faceApiReady, capture, onViolation]);

  // Voice detection — ignores fan/AC/ambient noise
  // Thresholds: 0-55 = ambient/fan → ignored | 55-75 = borderline (needs 5 strikes) | 75+ = clear voice
  // Hard cooldown: 60 seconds between any two voice violations max
  useEffect(() => {
    if (!active || !cameraReady) return;

    const AMBIENT_MAX   = 55;   // below this = fan/AC noise, always ignored
    const VOICE_MIN     = 75;   // above this = definite talking, flag after 3 strikes
    const COOLDOWN_MS   = 60000; // 60s cooldown — max 1 violation/minute
    const STRIKES_SOFT  = 5;    // borderline zone needs 5 consecutive strikes
    const STRIKES_HARD  = 3;    // clear voice zone needs 3 consecutive strikes

    let strikes = 0;
    let lastFlagTime = 0;

    voiceCheckRef.current = setInterval(() => {
      if (!analyserRef.current) return;

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);

      // Focus only on mid-range frequencies (human voice 300Hz–3kHz)
      // This excludes low-freq fan hum and high-freq AC hiss
      const midStart = Math.floor(data.length * 0.15);
      const midEnd   = Math.floor(data.length * 0.55);
      const midSlice = Array.from(data).slice(midStart, midEnd);
      const avg      = midSlice.reduce((a, b) => a + b, 0) / midSlice.length;

      const now = Date.now();
      const cooledDown = (now - lastFlagTime) > COOLDOWN_MS;

      if (avg <= AMBIENT_MAX) {
        // Fan/AC/keyboard — completely ignore, reset strikes
        strikes = 0;
      } else if (avg > AMBIENT_MAX && avg <= VOICE_MIN) {
        // Borderline — accumulate strikes
        if (cooledDown) {
          strikes++;
          if (strikes >= STRIKES_SOFT) {
            strikes = 0;
            lastFlagTime = now;
            const screenshot = capture();
            onViolation({ type: "voice_detected", screenshot, msg: `Sustained noise detected (level: ${Math.round(avg)})` });
          }
        }
      } else {
        // Clear voice/talking
        if (cooledDown) {
          strikes++;
          if (strikes >= STRIKES_HARD) {
            strikes = 0;
            lastFlagTime = now;
            const screenshot = capture();
            onViolation({ type: "voice_detected", screenshot, msg: `Voice detected (level: ${Math.round(avg)})` });
          }
        }
      }
    }, 4000); // check every 4s — so max 15 checks/minute

    return () => clearInterval(voiceCheckRef.current);
  }, [active, cameraReady, capture, onViolation]);

  // Tab switch detection
  useEffect(() => {
    if (!active) return;
    const handleVisibility = () => {
      if (document.hidden) {
        onViolation({ type: "tab_switch", screenshot: null, msg: "Student left exam tab" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    tabRef.current = handleVisibility;
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, onViolation]);

  // Fullscreen exit detection
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

  return { videoRef, cameraReady, stop };
}

// ─── Main Exam Portal ─────────────────────────────────────────────────────────
export default function CertExamPortal({ examData, cert, onFinish }) {
  const { questions = [], certName = "" } = examData || {};
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [violations, setViolations] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [activeWarning, setActiveWarning] = useState(null);
  const [examActive, setExamActive] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 min
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const examStarted = useRef(false);

  // Enter fullscreen on mount
  useEffect(() => {
    if (!examStarted.current) {
      examStarted.current = true;
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // Timer
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

  const onViolation = useCallback(async (v) => {
    const entry = { ...v, timestamp: new Date().toISOString(), id: Date.now() };
    setViolations(prev => [...prev, entry]);

    // Show warning banner
    setActiveWarning(entry);
    clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setActiveWarning(null), 4000);

    // Call backend for AI analysis
    try {
      await fetch("/api/cert-exam/analyze-violation", {
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
    const score = Math.round((correct / questions.length) * 100);

    // Generate AI report
    let aiReport = { summary: "Exam completed.", integrityScore: 90, recommendation: "review", details: "" };
    try {
      const res = await fetch("/api/cert-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certName, score, totalQuestions: questions.length, correct, violations }),
      });
      const d = await res.json();
      if (d.success) aiReport = d.report;
    } catch (_) {}

    onFinish({
      questions, answers, correct, score,
      totalQuestions: questions.length,
      violations, certName,
      aiReport, autoSubmit: auto,
      timeUsed: 3600 - timeLeft,
    });
  }, [answers, questions, violations, certName, stop, timeLeft, submitting]);

  const q = questions[current] || {};
  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;

  return (
    <div style={E.page}>
      {/* Violation Warning Banner */}
      {activeWarning && (
        <div style={{ ...E.warningBanner, animation: "slideDown 0.3s ease" }}>
          ⚠️ {VIOLATION_LABELS[activeWarning.type] || activeWarning.type}: {activeWarning.msg}
          <span style={{ float: "right", cursor: "pointer" }} onClick={() => setActiveWarning(null)}>✕</span>
          <style>{`@keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* ─── Top Bar ─── */}
      <div style={E.topBar}>
        <div style={E.topLeft}>
          <div style={E.examTitle}>{certName}</div>
          <div style={E.examSub}>Proctored Certification Exam</div>
        </div>
        <div style={E.topCenter}>
          <div style={{ ...E.timer, color: timeLeft < 300 ? "#dc2626" : "#0f172a" }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
        <div style={E.topRight}>
          <div style={E.proctoringChip}>
            <span style={{ ...E.procDot, background: cameraReady ? "#22c55e" : "#f59e0b" }} />
            {faceApiReady ? "AI Proctoring Active" : "Proctoring Active"}
          </div>
          <div style={E.violationCount}>
            {violations.length} Violation{violations.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div style={E.body}>
        {/* ─── Sidebar: Question Nav ─── */}
        <div style={E.sidebar}>
          <div style={E.sideHead}>Questions ({questions.length})</div>
          <div style={E.qGrid}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                onClick={() => setCurrent(i)}
                style={{
                  ...E.qDot,
                  background: answers[q.id] ? "#0284c7" : i === current ? "#e0f2fe" : "#f8fafc",
                  color: answers[q.id] ? "#fff" : i === current ? "#0284c7" : "#64748b",
                  border: i === current ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                  fontWeight: i === current ? 700 : 500,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div style={E.sideStats}>
            <div><span style={{ color: "#0284c7", fontWeight: 700 }}>{answered}</span> answered</div>
            <div><span style={{ color: "#f59e0b", fontWeight: 700 }}>{unanswered}</span> remaining</div>
          </div>

          {/* Camera Feed */}
          <div style={E.cameraBox}>
            <div style={E.cameraLabel}>📷 Proctoring Camera</div>
            <video ref={videoRef} autoPlay muted playsInline style={E.cameraFeed} />
          </div>

          <button
            style={E.submitBtn}
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>

        {/* ─── Question Area ─── */}
        <div style={E.main}>
          {questions.length === 0 ? (
            <div style={E.loading}>Loading exam questions...</div>
          ) : (
            <>
              <div style={E.qHeader}>
                <span style={E.qNumber}>Q{current + 1} / {questions.length}</span>
                <span style={{ ...E.diffBadge, ...DIFF_STYLES[q.difficulty || "medium"] }}>
                  {q.difficulty || "medium"}
                </span>
                <span style={E.topicBadge}>{q.topic}</span>
              </div>

              <div style={E.qText}>{q.question}</div>

              <div style={E.options}>
                {q.options && Object.entries(q.options).map(([key, val]) => (
                  <div
                    key={key}
                    onClick={() => handleAnswer(q.id, key)}
                    style={{
                      ...E.option,
                      borderColor: answers[q.id] === key ? "#0284c7" : "#e2e8f0",
                      background: answers[q.id] === key ? "#eff6ff" : "#fff",
                      boxShadow: answers[q.id] === key ? "0 0 0 3px #bae6fd" : "none",
                    }}
                  >
                    <div style={{ ...E.optKey, background: answers[q.id] === key ? "#0284c7" : "#f1f5f9", color: answers[q.id] === key ? "#fff" : "#475569" }}>
                      {key}
                    </div>
                    <span style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={E.navRow}>
                <button style={E.navBtn} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                  ← Previous
                </button>
                <button style={{ ...E.navBtn, ...E.navBtnPrimary }} onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Submit Modal */}
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
              <button style={E.confirmBtn} onClick={() => { setShowConfirm(false); handleSubmit(false); }}>
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const VIOLATION_LABELS = {
  no_face: "No Face",
  multiple_faces: "Multiple Faces",
  eye_gaze: "Eye Gaze",
  voice_detected: "Voice Detected",
  tab_switch: "Tab Switch",
  fullscreen_exit: "Fullscreen Exit",
  camera_denied: "Camera Denied",
};

const DIFF_STYLES = {
  easy: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" },
  medium: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
  hard: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
};

const E = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", userSelect: "none" },
  warningBanner: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "#dc2626", color: "#fff", padding: "12px 20px", fontSize: 13, fontWeight: 600 },
  topBar: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topLeft: {},
  examTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  examSub: { fontSize: 11, color: "#64748b" },
  topCenter: {},
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
