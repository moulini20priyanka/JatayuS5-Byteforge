import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ─── Tokens ─── */
const T = {
  bg:         "#e8eaf2",
  surface:    "#f0f2f9",
  surfaceAlt: "#eceff8",
  surfaceDeep:"#e4e7f4",
  border:     "rgba(67,97,238,0.12)",
  borderSoft: "rgba(67,97,238,0.07)",
  accent:     "#3d52d5",
  accentSoft: "#dde3f8",
  accentMid:  "#c7d0f5",
  green:      "#0a7c5c",
  greenSoft:  "#d4f0e8",
  red:        "#c41640",
  redSoft:    "#fce4eb",
  amber:      "#b86000",
  amberSoft:  "#fde8c0",
  text:       "#111827",
  muted:      "#4b5563",
  dim:        "#8492a6",
};

/* ─── SVG Icons ─── */
const Icons = {
  Clock: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Lock: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Eye: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  PhoneOff: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.5 16.5L19 19a2 2 0 0 1-2.73.73l-3.06-3.06a15.94 15.94 0 0 1-1.89-.89l1.41-1.42A5 5 0 0 0 9 7.5V7a1 1 0 0 0-2 0v.5a7 7 0 0 0 2.05 4.95l2.83 2.83"/>
      <path d="M16 12V8a4 4 0 0 0-4-4"/><path d="M14.5 2.5C14.5 2.5 18 5 18 12"/>
    </svg>
  ),
  Upload: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Clipboard: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  BookOpen: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Brain: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/>
    </svg>
  ),
  PenLine: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  Target: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Handshake: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
    </svg>
  ),
  Rocket: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  ArrowLeft: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Zap: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Lightbulb: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
    </svg>
  ),
  ArrowRight: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Check: ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  MapPin: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  AlertCircle: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

/* ─── Mission rules ─── */
const MISSIONS = [
  {
    id: 1, icon: "Clock", color: "#3d52d5", colorSoft: "#dde3f8",
    title: "Time is Your Currency",
    rule: "Once the exam starts, the timer runs non-stop. There are no pauses, no extensions, and no mercy for late submissions. Every second counts.",
    highlight: "The timer cannot be paused once started.",
    quiz: {
      q: "What happens if you run out of time?",
      options: ["Timer pauses and waits", "Exam auto-submits immediately", "You get 5 extra minutes", "Nothing — keep going"],
      answer: 1,
      explanation: "The exam auto-submits the moment time runs out — answered or not.",
    },
  },
  {
    id: 2, icon: "Lock", color: "#6d28d9", colorSoft: "#ede9fb",
    title: "One Window. No Escape.",
    rule: "Your browser is now a secure vault. Switching tabs, opening new windows, or minimizing the exam will trigger an immediate violation flag. Three flags = automatic disqualification.",
    highlight: "Tab switch = violation flag. 3 flags = disqualified.",
    quiz: {
      q: "You accidentally press Alt+Tab. What happens?",
      options: ["Nothing, you're fine", "A violation flag is recorded", "Exam pauses automatically", "Browser closes"],
      answer: 1,
      explanation: "Each tab switch or window change records a violation flag instantly.",
    },
  },
  {
    id: 3, icon: "Eye", color: "#0369a1", colorSoft: "#dbeeff",
    title: "AI is Watching",
    rule: "Our AI proctor monitors your webcam in real-time throughout the exam. Face away for more than 5 seconds, cover your camera, or have another person in frame — and it gets flagged.",
    highlight: "Face the camera at all times. No exceptions.",
    quiz: {
      q: "You scratch your head and look down for 7 seconds. What does the AI do?",
      options: ["Nothing, it understands", "Flags it as suspicious activity", "Pauses the exam", "Sends you a warning sound"],
      answer: 1,
      explanation: "Any face-away event longer than 5 seconds is automatically flagged.",
    },
  },
  {
    id: 4, icon: "PhoneOff", color: "#b45309", colorSoft: "#fde8c0",
    title: "No Outside Help",
    rule: "Copy-paste is disabled. Your keyboard shortcuts are locked. No phone, no second screen, no notes, no asking a friend. This is a test of YOUR knowledge — not Google's.",
    highlight: "Ctrl+C, Ctrl+V, and all screen-capture shortcuts are blocked.",
    quiz: {
      q: "Which of these is allowed during the exam?",
      options: ["Google search on another device", "Quick notes on your phone", "Scratch paper for rough work", "Asking a friend quietly"],
      answer: 2,
      explanation: "Physical scratch paper is the only permitted aid. All digital shortcuts are blocked.",
    },
  },
  {
    id: 5, icon: "Upload", color: "#0a7c5c", colorSoft: "#d4f0e8",
    title: "Submit Before You Leave",
    rule: "Always click Submit before closing. If you close the browser without submitting, your attempt is marked incomplete. An incomplete attempt counts as a used attempt and cannot be retaken.",
    highlight: "Always click Submit. Closing without submitting = incomplete.",
    quiz: {
      q: "Your internet cuts out and you close the browser. What's the outcome?",
      options: ["Exam auto-saves and waits", "Attempt marked incomplete", "You can restart fresh", "Admin is notified and resets it"],
      answer: 1,
      explanation: "Closing without submitting marks the attempt incomplete — it cannot be undone.",
    },
  },
];

/* ─── Particle burst ─── */
function Burst({ active }) {
  if (!active) return null;
  const particles = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map((i) => {
        const size   = 4 + Math.random() * 5;
        const colors = ["#4361ee","#059669","#d97706","#e11d48","#7c3aed","#0891b2"];
        return <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: size, height: size, borderRadius: "50%", background: colors[i % colors.length], animation: `burst-${i} 0.6s ease-out forwards`, transform: "translate(-50%,-50%)" }} />;
      })}
      <style>{particles.map((i) => {
        const angle = (i / 12) * 360, rad = angle * Math.PI / 180;
        const dx = Math.cos(rad) * (60 + i * 3), dy = Math.sin(rad) * (60 + i * 3);
        return `@keyframes burst-${i} { 0%{transform:translate(-50%,-50%) scale(1);opacity:1} 100%{transform:translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0);opacity:0} }`;
      }).join("")}</style>
    </div>
  );
}

/* ─── Progress bar ─── */
function ProgressBar({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < current ? T.accent : i === current ? `linear-gradient(90deg, ${T.accent}, #8fa0f0)` : T.accentMid, transition: "background 0.4s ease", position: "relative", overflow: "hidden" }}>
          {i === current && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`, animation: "shimmer-bar 1.5s infinite" }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Single Mission Slide ─── */
function MissionSlide({ mission, index, total, onComplete, isActive }) {
  const [phase,      setPhase]      = useState("reveal");
  const [selected,   setSelected]   = useState(null);
  const [burst,      setBurst]      = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [tries,      setTries]      = useState(0);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    if (isActive) {
      setMounted(false);
      const t = setTimeout(() => setMounted(true), 60);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  const handleAnswer = (idx) => {
    if (phase === "correct") return;
    setSelected(idx);
    if (idx === mission.quiz.answer) {
      setPhase("correct"); setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } else {
      setPhase("wrong"); setWrongShake(true); setTries(t => t + 1);
      setTimeout(() => { setWrongShake(false); setPhase("quiz"); setSelected(null); }, 900);
    }
  };

  const slideIn = { opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)", transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)" };
  const IconComponent = Icons[mission.icon];

  return (
    <div style={slideIn}>
      <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 20px rgba(61,82,213,0.10)", marginBottom: 16, position: "relative" }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${mission.color}, ${mission.color}88)` }} />
        <div style={{ padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: mission.colorSoft, border: `1px solid ${mission.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconComponent size={24} color={mission.color} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: mission.color, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>
                RULE {String(index + 1).padStart(2, "0")} OF {String(total).padStart(2, "0")}
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 19, fontWeight: 800, color: T.text, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{mission.title}</h3>
            </div>
          </div>
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75, marginBottom: 16 }}>{mission.rule}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: mission.colorSoft, border: `1px solid ${mission.color}25`, borderRadius: 12, padding: "10px 14px" }}>
            <Icons.Zap size={16} color={mission.color} />
            <span style={{ fontSize: 12, fontWeight: 700, color: mission.color, fontFamily: "'DM Sans', sans-serif" }}>{mission.highlight}</span>
          </div>
        </div>
      </div>

      <div style={{ background: T.surfaceAlt, border: `1.5px solid ${phase === "correct" ? `${T.green}40` : T.border}`, borderRadius: 20, padding: "22px 24px", boxShadow: "0 2px 16px rgba(61,82,213,0.08)", position: "relative", animation: wrongShake ? "shake 0.4s ease" : "none" }}>
        <Burst active={burst} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", fontFamily: "'JetBrains Mono', monospace", color: phase === "correct" ? T.green : T.accent, background: phase === "correct" ? T.greenSoft : T.accentSoft, borderRadius: 100, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            {phase === "correct" ? <><Icons.Check size={10} color={T.green} /> CORRECT</> : "QUICK CHECK"}
          </span>
          {tries > 0 && phase !== "correct" && <span style={{ fontSize: 10, color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>{tries} wrong attempt{tries > 1 ? "s" : ""}</span>}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 14, lineHeight: 1.5 }}>{mission.quiz.q}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mission.quiz.options.map((opt, i) => {
            const isCorrect = i === mission.quiz.answer, isSelected = selected === i;
            let bgColor = T.surfaceDeep, borderColor = T.border, textColor = T.text, leftBar = "transparent";
            if (phase === "correct") {
              if (isCorrect) { bgColor = T.greenSoft; borderColor = `${T.green}40`; textColor = T.green; leftBar = T.green; }
              else { textColor = T.dim; }
            } else if (isSelected && phase === "wrong") {
              bgColor = T.redSoft; borderColor = `${T.red}40`; textColor = T.red; leftBar = T.red;
            }
            return (
              <button key={i} onClick={() => phase !== "correct" && handleAnswer(i)}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", borderRadius: 11, border: `1px solid ${borderColor}`, background: bgColor, color: textColor, fontSize: 13, fontWeight: 500, cursor: phase === "correct" ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s", position: "relative", overflow: "hidden", borderLeft: leftBar !== "transparent" ? `3px solid ${leftBar}` : `1px solid ${borderColor}` }}
                onMouseEnter={e => { if (phase !== "correct") { e.currentTarget.style.background = mission.colorSoft; e.currentTarget.style.borderColor = `${mission.color}35`; } }}
                onMouseLeave={e => { if (phase !== "correct") { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor; } }}
              >
                <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: phase === "correct" && isCorrect ? T.green : isSelected && phase === "wrong" ? T.red : T.accentMid, color: (phase === "correct" && isCorrect) || (isSelected && phase === "wrong") ? "#fff" : T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                  {phase === "correct" && isCorrect ? <Icons.Check size={10} color="#fff" /> : isSelected && phase === "wrong" ? <Icons.X size={10} color="#fff" /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{String.fromCharCode(65 + i)}</span>}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        {phase === "correct" && (
          <div style={{ marginTop: 14, background: T.greenSoft, border: `1px solid ${T.green}25`, borderRadius: 10, padding: "10px 14px", animation: "fadeUp 0.4s ease", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icons.Lightbulb size={14} color={T.green} />
            <p style={{ fontSize: 12, color: T.green, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>{mission.quiz.explanation}</p>
          </div>
        )}
        {phase === "correct" && (
          <button onClick={onComplete}
            style={{ marginTop: 16, width: "100%", padding: "13px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${mission.color}, ${mission.color}cc)`, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: `0 4px 16px ${mission.color}35`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, animation: "fadeUp 0.35s ease" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {index + 1 < total ? <><span>Got it — Rule {index + 2}</span><Icons.ArrowRight size={16} color="#fff" /></> : <><span>Final Step — Take the Oath</span><Icons.ArrowRight size={16} color="#fff" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Oath Screen ─── */
function OathScreen({ exam, onProceed }) {
  const [signed,    setSigned]    = useState(false);
  const [ripple,    setRipple]    = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const handleSign = () => {
    if (nameInput.trim().length < 2) return;
    setRipple(true);
    setTimeout(() => { setRipple(false); setSigned(true); }, 600);
  };

  const fadeIn = { opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.55s ease 60ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) 60ms" };

  if (signed) {
    return (
      <div style={{ background: T.surface, border: `1.5px solid rgba(10,124,92,0.25)`, borderRadius: 22, padding: 32, boxShadow: "0 8px 40px rgba(10,124,92,0.1)", textAlign: "center", animation: "fadeUp 0.5s ease" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.greenSoft, border: `1px solid ${T.green}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pop 0.5s ease" }}>
          <Icons.Target size={36} color={T.green} />
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: "-0.8px", marginBottom: 10 }}>You're Cleared to Compete</h2>
        <p style={{ fontSize: 14, color: T.muted, marginBottom: 28, lineHeight: 1.7 }}>
          Your integrity pledge has been recorded.<br />
          Good luck, <strong style={{ color: T.text }}>{nameInput}</strong>. Make it count.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          {["5 Rules Read", "Quiz Passed", "Oath Signed"].map(tag => (
            <span key={tag} style={{ fontSize: 11, fontWeight: 700, background: T.greenSoft, color: T.green, border: `1px solid ${T.green}25`, borderRadius: 100, padding: "4px 12px", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 5 }}>
              <Icons.Check size={10} color={T.green} /> {tag}
            </span>
          ))}
        </div>
        <button onClick={onProceed}
          style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.green}, #047857)`, color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: "0 6px 20px rgba(5,150,105,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icons.MapPin size={20} color="#fff" />
          Enable Location &amp; Continue
        </button>
      </div>
    );
  }

  return (
    <div style={fadeIn}>
      <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 22, overflow: "hidden", boxShadow: "0 2px 24px rgba(61,82,213,0.10)", marginBottom: 16 }}>
        <div style={{ height: 5, background: "linear-gradient(90deg, #4361ee, #7c3aed, #059669)" }} />
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.accentSoft, border: `1px solid rgba(67,97,238,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Icons.Handshake size={30} color={T.accent} />
            </div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.7px", marginBottom: 8 }}>The Integrity Oath</h3>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>You've read all 5 rules. Now make it official.</p>
          </div>
          <div style={{ background: T.surfaceAlt, border: `1.5px solid ${T.borderSoft}`, borderRadius: 14, padding: "18px 20px", marginBottom: 22, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: 20, fontSize: 48, color: "#e5e7eb", fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>"</div>
            <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.85, fontStyle: "italic", paddingTop: 8 }}>
              I, <strong style={{ color: T.accent }}>{nameInput || "___________"}</strong>, confirm that I have read and understood all exam rules. I will not use any unauthorised resources, switch tabs, or attempt to deceive the AI proctoring system. I understand that any violation may result in immediate disqualification.
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: "block", marginBottom: 7, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>TYPE YOUR FULL NAME TO SIGN</label>
            <input type="text" placeholder="e.g. Arjun Sharma" value={nameInput} onChange={e => setNameInput(e.target.value)}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 11, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}
              onFocus={e => { e.target.style.borderColor = "rgba(67,97,238,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(67,97,238,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <button onClick={handleSign} disabled={nameInput.trim().length < 2}
            style={{ width: "100%", padding: "14px", borderRadius: 11, border: "none", background: nameInput.trim().length >= 2 ? `linear-gradient(135deg, #3d52d5, #2d3eb0)` : T.accentMid, color: nameInput.trim().length >= 2 ? "#fff" : T.accent, fontWeight: 800, fontSize: 15, fontFamily: "'Syne', sans-serif", cursor: nameInput.trim().length >= 2 ? "pointer" : "not-allowed", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {ripple && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.25)", animation: "ripple-fill 0.5s ease" }} />}
            <Icons.PenLine size={18} color={nameInput.trim().length >= 2 ? "#fff" : T.dim} />
            Sign &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Location Permission Screen ─── */
function LocationScreen({ onGranted }) {
  const [status,  setStatus]  = useState("idle");
  const [coords,  setCoords]  = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-proceed when coords are ready and status is granted
  useEffect(() => {
    if (status === "granted" && coords) {
      const t = setTimeout(() => onGranted(coords), 1400);
      return () => clearTimeout(t);
    }
  }, [status, coords]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setStatus("granted");
      },
      (err) => {
        setStatus(err.code === 1 ? "denied" : "unsupported");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const fadeIn = {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)"
  };

  const isOk      = status === "granted";
  const isDenied  = status === "denied" || status === "unsupported";
  const iconBg    = isOk ? T.greenSoft  : isDenied ? T.redSoft  : T.accentSoft;
  const iconColor = isOk ? T.green      : isDenied ? T.red      : T.accent;
  const borderCol = isOk ? `${T.green}40` : isDenied ? `${T.red}30` : T.border;

  const titles = {
    idle:        "Location Access Required",
    requesting:  "Waiting for Permission…",
    granted:     "Location Confirmed!",
    denied:      "Location Access Denied",
    unsupported: "GPS Not Available",
  };
  const subtitles = {
    idle:        "NeuroAssess monitors your GPS throughout the exam to ensure integrity. You must allow location access to proceed.",
    requesting:  "A browser popup has appeared. Click \"Allow\" to continue.",
    granted:     "Your location is verified. Proceeding to exam key verification…",
    denied:      "You declined location access. Go to your browser's address bar → 🔒 Site Settings → Location → Allow, then try again.",
    unsupported: "Your browser or device does not support GPS. Please use Chrome or Edge on a location-enabled device.",
  };

  return (
    <div style={fadeIn}>
      <div style={{
        background: T.surface,
        border: `1.5px solid ${borderCol}`,
        borderRadius: 22, overflow: "hidden",
        boxShadow: isOk ? "0 8px 40px rgba(10,124,92,0.12)" : "0 2px 24px rgba(61,82,213,0.10)",
        transition: "border-color 0.4s, box-shadow 0.4s"
      }}>
        <div style={{ height: 5, background: isOk ? "linear-gradient(90deg,#0a7c5c,#059669)" : isDenied ? "linear-gradient(90deg,#c41640,#e11d48)" : "linear-gradient(90deg,#3d52d5,#0a7c5c)", transition: "background 0.4s" }} />
        <div style={{ padding: "32px 28px", textAlign: "center" }}>

          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: iconBg, border: `1.5px solid ${iconColor}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", transition: "all 0.4s",
            boxShadow: isOk ? `0 0 0 12px ${T.greenSoft}` : "none",
            animation: status === "granted" ? "pop 0.5s ease" : "none"
          }}>
            {status === "requesting"
              ? <div style={{ width: 32, height: 32, border: `3px solid ${T.accentMid}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
              : <Icons.MapPin size={34} color={iconColor} />
            }
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: iconColor, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
            STEP 3 OF 3 — LOCATION
          </div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 21, fontWeight: 800, color: T.text, letterSpacing: "-0.5px", marginBottom: 12, lineHeight: 1.2 }}>
            {titles[status]}
          </h3>
          <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.75, marginBottom: 22 }}>
            {subtitles[status]}
          </p>

          {/* Info list — idle or denied */}
          {(status === "idle" || status === "denied") && (
            <div style={{ background: T.surfaceAlt, border: `1px solid ${T.borderSoft}`, borderRadius: 14, padding: "16px 18px", marginBottom: 22, textAlign: "left" }}>
              {[
                "GPS location captured every 15 seconds",
                "Shown live on proctor admin dashboard",
                "Encrypted — stored for 90 days only",
                "Used solely for exam proctoring"
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: i < 3 ? 9 : 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.greenSoft, border: `1px solid ${T.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icons.Check size={10} color={T.green} />
                  </div>
                  <span style={{ fontSize: 12.5, color: T.muted }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success badges */}
          {status === "granted" && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              {["Rules Read", "Oath Signed", "GPS Verified"].map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 700, background: T.greenSoft, color: T.green, border: `1px solid ${T.green}25`, borderRadius: 100, padding: "4px 12px", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icons.Check size={10} color={T.green} /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          {status === "idle" && (
            <button
              onClick={requestLocation}
              style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.green}, #047857)`, color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: "0 4px 20px rgba(5,150,105,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Icons.MapPin size={20} color="#fff" />
              Allow Location &amp; Enter Exam
            </button>
          )}

          {status === "requesting" && (
            <div style={{ width: "100%", padding: "14px", borderRadius: 12, background: T.accentSoft, border: `1px solid ${T.accentMid}`, fontSize: 13, fontWeight: 600, color: T.accent, textAlign: "center" }}>
              Check your browser for a popup…
            </div>
          )}

          {status === "granted" && (
            <div style={{ width: "100%", padding: "14px", borderRadius: 12, background: T.greenSoft, border: `1px solid ${T.green}30`, fontSize: 13, fontWeight: 700, color: T.green, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icons.Check size={14} color={T.green} /> Proceeding to key verification…
            </div>
          )}

          {(status === "denied" || status === "unsupported") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={requestLocation}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.accent}, #2d3eb0)`, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(61,82,213,0.3)" }}>
                <Icons.MapPin size={18} color="#fff" />
                Request Location Again
              </button>
              <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.6, padding: "0 4px" }}>
                If the popup doesn't appear: click the 🔒 lock icon in your browser's address bar → Site Settings → Location → Allow → then click above.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN — Instruction.jsx
   Phases: intro → missions → oath → location
   → hiring:     /exam-verify  (ID card + face scan → resume upload → exam)
   → university: /verify-exam-key (exam key → /university-exam)
══════════════════════════════════════════════════════ */
export default function Instruction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, examData, isUniversity } = location.state || {};
  const examInfo = examData || exam;  // Handle both variable names

  const [current,   setCurrent]   = useState(0);
  const [completed, setCompleted] = useState([]);
  const [phase,     setPhase]     = useState("intro");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const handleMissionComplete = () => {
    setCompleted(prev => [...prev, current]);
    if (current + 1 >= MISSIONS.length) setPhase("oath");
    else setCurrent(c => c + 1);
  };

  const handleOathProceed = () => setPhase("location");

  // ── KEY SPLIT: university vs hiring after location grant ──────────────────
  const handleLocationGranted = ({ lat, lng }) => {
    if (isUniversity) {
      // University: go directly to exam page (verification/key validation already done in UniversityExamVerify)
      navigate("/university-exam", {
        replace: true,
        state: {
          examData: examInfo,
          locationGranted: true,
          initialCoords: { lat, lng },
        },
      });
    } else {
      // Hiring: go to ID card + face scan (ExamVerify), which leads to resume upload → exam
      navigate("/exam-verify", {
        state: { exam: examInfo },
      });
    }
  };

  const progress = (phase === "oath" || phase === "location") ? MISSIONS.length : current;

  const introFade = { opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)" };

  const introSteps = [
    { Icon: Icons.BookOpen, label: "Read",  desc: "5 rules explained simply" },
    { Icon: Icons.Brain,    label: "Prove", desc: "Quick quiz on each rule"  },
    { Icon: Icons.PenLine,  label: "Sign",  desc: "Take the integrity oath"  },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        html, body, #root { min-height: 100vh; margin: 0; padding: 0; }
        body { background: #e8eaf2 !important; }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes pop         { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes shake       { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
        @keyframes shimmer-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes ripple-fill { from{opacity:1} to{opacity:0} }
        @keyframes orb-float   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-12px)} }
        @keyframes spin        { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#e8eaf2", fontFamily: "'DM Sans', sans-serif", color: T.text, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 60px", position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg, #dfe3f5 0%, #e8eaf2 45%, #e2e6f5 100%)", zIndex: -4, pointerEvents: "none" }} />
        <div style={{ position: "fixed", inset: 0, zIndex: -2, backgroundImage: "radial-gradient(circle, rgba(67,97,238,0.18) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none", opacity: 0.5 }} />
        <div style={{ position: "fixed", top: "-8%", left: "-5%", zIndex: -1, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(67,97,238,0.18) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none", animation: "orb-float 9s ease-in-out infinite" }} />
        <div style={{ position: "fixed", bottom: "-5%", right: "-5%", zIndex: -1, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 60%)", filter: "blur(70px)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 520, zIndex: 1, paddingTop: 40 }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, ...introFade }}>
            <button onClick={() => navigate(-1)} style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.muted, cursor: "pointer", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.ArrowLeft size={18} color={T.muted} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.dim, fontWeight: 700, letterSpacing: "1.5px", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
                {isUniversity ? "UNIVERSITY EXAM BRIEFING" : "EXAM BRIEFING"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: T.text }}>{exam?.exam || exam?.title || "Exam Briefing"}</div>
            </div>
            <div style={{ background: T.accentSoft, border: `1.5px solid ${T.accentMid}`, borderRadius: 100, padding: "4px 12px", fontSize: 10, color: T.accent, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {completed.length}/{MISSIONS.length} DONE
            </div>
          </div>

          <div style={introFade}><ProgressBar total={MISSIONS.length} current={progress} /></div>

          {/* INTRO */}
          {phase === "intro" && (
            <div style={introFade}>
              <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 22, overflow: "hidden", boxShadow: "0 2px 24px rgba(61,82,213,0.10)", marginBottom: 16 }}>
                <div style={{ height: 5, background: "linear-gradient(90deg, #4361ee, #7c3aed, #059669, #d97706, #0891b2)" }} />
                <div style={{ padding: "36px 28px", textAlign: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: T.accentSoft, border: `1px solid rgba(67,97,238,0.15)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pop 0.6s ease" }}>
                    <Icons.Clipboard size={32} color={T.accent} />
                  </div>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-1px", marginBottom: 14, lineHeight: 1.15 }}>Before You Begin</h1>
                  <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
                    Most students skip these rules — then blame them when things go wrong.
                    <strong style={{ color: T.text }}> We made it impossible to skip.</strong>
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
                    {introSteps.map(({ Icon, label, desc }, i) => (
                      <div key={i} style={{ background: T.surfaceAlt, border: `1.5px solid ${T.borderSoft}`, borderRadius: 14, padding: "16px 10px", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.5s ease ${200 + i * 100}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${200 + i * 100}ms` }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accentSoft, border: `1px solid rgba(67,97,238,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                          <Icon size={18} color={T.accent} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 11, color: T.dim }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 28 }}>
                    {MISSIONS.map((m, i) => {
                      const PillIcon = Icons[m.icon];
                      return (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100, background: m.colorSoft, color: m.color, border: `1px solid ${m.color}25`, opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease ${400 + i * 80}ms`, display: "flex", alignItems: "center", gap: 5 }}>
                          <PillIcon size={12} color={m.color} />{m.title}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => setPhase("missions")}
                    style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, #3d52d5, #2d3eb0)`, color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: "0 4px 16px rgba(67,97,238,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    Start Mission Briefing <Icons.ArrowRight size={18} color="#fff" />
                  </button>
                  <p style={{ fontSize: 11, color: T.dim, marginTop: 12 }}>Takes ~2 minutes · Cannot be skipped</p>
                </div>
              </div>
            </div>
          )}

          {phase === "missions" && (
            <MissionSlide key={current} mission={MISSIONS[current]} index={current} total={MISSIONS.length} onComplete={handleMissionComplete} isActive={true} />
          )}

          {phase === "oath" && (
            <OathScreen exam={exam} onProceed={handleOathProceed} />
          )}

          {phase === "location" && (
            <LocationScreen onGranted={handleLocationGranted} />
          )}

        </div>
      </div>
    </>
  );
}