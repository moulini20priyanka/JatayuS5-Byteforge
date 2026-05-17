import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:          "#eef0f8",
  surface:     "#f7f8fc",
  surfaceAlt:  "#f0f2f9",
  surfaceDeep: "#e8ebf5",
  border:      "rgba(61,82,213,0.13)",
  borderSoft:  "rgba(61,82,213,0.07)",
  accent:      "#3d52d5",
  accentSoft:  "#dde3f8",
  accentMid:   "#c5ceef",
  green:       "#0a7c5c",
  greenSoft:   "#d4f0e8",
  greenBdr:    "#a7e0ce",
  red:         "#c41640",
  redSoft:     "#fce4eb",
  amber:       "#b86000",
  amberSoft:   "#fde8c0",
  text:        "#0f172a",
  muted:       "#475569",
  dim:         "#8492a6",
};

/* ─── All SVG Icons — fully inline, no emoji ────────────────────────────── */
const Ic = {
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  SlashCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  CloudUpload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Clipboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Brain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/>
    </svg>
  ),
  PenLine: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="34" height="34">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  // Oath icon — scales used as param
  Scale: ({ size = 28 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 3v19"/><path d="M5 21h14"/><path d="M3 6l4 8c0 0 2.5-2.5 5-2.5s5 2.5 5 2.5l4-8"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
    </svg>
  ),
  // Shield for integrity
  Shield: ({ size = 28 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Lightbulb: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
    </svg>
  ),
  ArrowRight: ({ size = 16 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  ArrowLeft: ({ size = 16 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Check: ({ size = 11 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: ({ size = 11 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  MapPin: ({ size = 22 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Rocket: ({ size = 30 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
};

/* ─── Mission data ───────────────────────────────────────────────────────── */
const MISSIONS = [
  {
    id: 1, icon: "Clock", color: "#3d52d5", colorSoft: "#dde3f8",
    title: "Time is Your Currency",
    rule: "Once the exam starts, the timer runs non-stop. There are no pauses, no extensions, and no mercy for late submissions. Every second counts — plan accordingly.",
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
      q: "You look away from the camera for 7 seconds. What does the AI do?",
      options: ["Nothing, it understands", "Flags it as suspicious activity", "Pauses the exam", "Sends a warning sound"],
      answer: 1,
      explanation: "Any face-away event longer than 5 seconds is automatically flagged.",
    },
  },
  {
    id: 4, icon: "SlashCircle", color: "#b45309", colorSoft: "#fde8c0",
    title: "No Outside Help",
    rule: "Copy-paste is disabled. Your keyboard shortcuts are locked. No phone, no second screen, no notes, no asking a friend. This is a test of YOUR knowledge — not Google's.",
    highlight: "Ctrl+C, Ctrl+V, and screen-capture shortcuts are blocked.",
    quiz: {
      q: "Which of these is allowed during the exam?",
      options: ["Google search on another device", "Quick notes on your phone", "Scratch paper for rough work", "Asking a friend quietly"],
      answer: 2,
      explanation: "Physical scratch paper is the only permitted aid. All digital shortcuts are blocked.",
    },
  },
  {
    id: 5, icon: "CloudUpload", color: "#0a7c5c", colorSoft: "#d4f0e8",
    title: "Submit Before You Leave",
    rule: "Always click Submit before closing. If you close the browser without submitting, your attempt is marked incomplete. An incomplete attempt counts as a used attempt and cannot be retaken.",
    highlight: "Always click Submit. Closing without submitting = incomplete.",
    quiz: {
      q: "Your internet cuts out and you close the browser. What's the outcome?",
      options: ["Exam auto-saves and waits", "Attempt marked incomplete", "You can restart fresh", "Admin resets it"],
      answer: 1,
      explanation: "Closing without submitting marks the attempt incomplete — it cannot be undone.",
    },
  },
];

/* ─── Particle burst ─────────────────────────────────────────────────────── */
function Burst({ active }) {
  if (!active) return null;
  const colors = ["#4361ee","#059669","#d97706","#e11d48","#7c3aed","#0891b2"];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {Array.from({length:12},(_,i)=>(
        <div key={i} style={{ position:"absolute", top:"50%", left:"50%", width: 4+i%4, height: 4+i%4, borderRadius:"50%", background:colors[i%6], animation:`burst${i} 0.65s ease-out forwards`, transform:"translate(-50%,-50%)" }} />
      ))}
      <style>{Array.from({length:12},(_,i)=>{
        const a=(i/12)*360, r=a*Math.PI/180;
        const dx=Math.cos(r)*(55+i*3), dy=Math.sin(r)*(55+i*3);
        return `@keyframes burst${i}{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0);opacity:0}}`;
      }).join("")}</style>
    </div>
  );
}

/* ─── Step progress bar ──────────────────────────────────────────────────── */
function ProgressBar({ total, current }) {
  return (
    <div style={{ display:"flex", gap:5, marginBottom:24 }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i<current ? T.accent : i===current ? T.accentMid : "#dde3f8", transition:"background 0.4s ease", position:"relative", overflow:"hidden" }}>
          {i===current && <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)", animation:"shimmerBar 1.6s infinite" }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Icon box helper ────────────────────────────────────────────────────── */
function IconBox({ color, colorSoft, icon, size = 52 }) {
  const IcComp = Ic[icon];
  return (
    <div style={{ width:size, height:size, borderRadius:16, flexShrink:0, background:colorSoft, border:`1px solid ${color}20`, display:"flex", alignItems:"center", justifyContent:"center", color }}>
      {IcComp && <IcComp />}
    </div>
  );
}

/* ─── Single Mission Slide ───────────────────────────────────────────────── */
function MissionSlide({ mission, index, total, onComplete, isActive }) {
  const [phase,      setPhase]      = useState("reveal");
  const [selected,   setSelected]   = useState(null);
  const [burst,      setBurst]      = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [tries,      setTries]      = useState(0);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    if (!isActive) return;
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [isActive]);

  const handleAnswer = (idx) => {
    if (phase === "correct") return;
    setSelected(idx);
    if (idx === mission.quiz.answer) {
      setPhase("correct"); setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } else {
      setPhase("wrong"); setWrongShake(true); setTries(t => t+1);
      setTimeout(() => { setWrongShake(false); setPhase("quiz"); setSelected(null); }, 900);
    }
  };

  const slideIn = {
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(22px) scale(0.97)",
    transition:"opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)",
  };

  return (
    <div style={slideIn}>
      {/* Rule card */}
      <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 18px rgba(61,82,213,0.09)", marginBottom:14 }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${mission.color},${mission.color}80)` }} />
        <div style={{ padding:"22px 24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:16 }}>
            <IconBox color={mission.color} colorSoft={mission.colorSoft} icon={mission.icon} />
            <div>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"2px", color:mission.color, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>
                RULE {String(index+1).padStart(2,"0")} OF {String(total).padStart(2,"0")}
              </div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.3px", lineHeight:1.2, margin:0 }}>
                {mission.title}
              </h3>
            </div>
          </div>
          <p style={{ fontSize:13.5, color:T.muted, lineHeight:1.8, marginBottom:14 }}>{mission.rule}</p>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:mission.colorSoft, border:`1px solid ${mission.color}22`, borderRadius:10, padding:"9px 13px", color:mission.color }}>
            <Ic.Zap />
            <span style={{ fontSize:12, fontWeight:700 }}>{mission.highlight}</span>
          </div>
        </div>
      </div>

      {/* Quiz card */}
      <div style={{ background:T.surfaceAlt, border:`1.5px solid ${phase==="correct" ? T.green+"50" : T.border}`, borderRadius:20, padding:"20px 22px", boxShadow:"0 2px 14px rgba(61,82,213,0.07)", position:"relative", animation:wrongShake?"shake 0.4s ease":"none", transition:"border-color 0.3s" }}>
        <Burst active={burst} />

        {/* Quiz header */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:13 }}>
          <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"1.5px", fontFamily:"'DM Mono',monospace", color:phase==="correct"?T.green:T.accent, background:phase==="correct"?T.greenSoft:T.accentSoft, borderRadius:100, padding:"3px 10px", display:"flex", alignItems:"center", gap:5 }}>
            {phase==="correct" ? <><Ic.Check size={9} /> CORRECT</> : "QUICK CHECK"}
          </span>
          {tries>0 && phase!=="correct" && (
            <span style={{ fontSize:9.5, color:T.red, fontFamily:"'DM Mono',monospace" }}>{tries} wrong attempt{tries>1?"s":""}</span>
          )}
        </div>

        <p style={{ fontSize:13.5, fontWeight:600, color:T.text, marginBottom:12, lineHeight:1.55 }}>{mission.quiz.q}</p>

        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {mission.quiz.options.map((opt,i) => {
            const isCorrect  = i===mission.quiz.answer;
            const isSelected = selected===i;
            let bg = T.surfaceDeep, bdr = T.border, tc = T.text, leftBar = "none";
            if (phase==="correct") {
              if (isCorrect) { bg=T.greenSoft; bdr=T.green+"40"; tc=T.green; leftBar=`3px solid ${T.green}`; }
              else { tc=T.dim; }
            } else if (isSelected && phase==="wrong") {
              bg=T.redSoft; bdr=T.red+"40"; tc=T.red; leftBar=`3px solid ${T.red}`;
            }
            return (
              <button key={i} onClick={()=>phase!=="correct"&&handleAnswer(i)}
                style={{ width:"100%", textAlign:"left", padding:"10px 13px", borderRadius:10, border:`1px solid ${bdr}`, borderLeft:leftBar!=="none"?leftBar:`1px solid ${bdr}`, background:bg, color:tc, fontSize:13, fontWeight:500, cursor:phase==="correct"?"default":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:10, transition:"all 0.18s" }}
                onMouseEnter={e=>{ if(phase!=="correct"){ e.currentTarget.style.background=mission.colorSoft; e.currentTarget.style.borderColor=`${mission.color}30`; }}}
                onMouseLeave={e=>{ if(phase!=="correct"){ e.currentTarget.style.background=bg; e.currentTarget.style.borderColor=bdr; }}}
              >
                <span style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, background:phase==="correct"&&isCorrect?T.green:isSelected&&phase==="wrong"?T.red:T.accentMid, color:(phase==="correct"&&isCorrect)||(isSelected&&phase==="wrong")?"#fff":T.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
                  {phase==="correct"&&isCorrect ? <Ic.Check size={9} /> : isSelected&&phase==="wrong" ? <Ic.X size={9} /> : String.fromCharCode(65+i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {phase==="correct" && (
          <div style={{ marginTop:12, background:T.greenSoft, border:`1px solid ${T.green}25`, borderRadius:9, padding:"9px 13px", animation:"fadeUp 0.4s ease", display:"flex", alignItems:"flex-start", gap:7, color:T.green }}>
            <Ic.Lightbulb />
            <p style={{ fontSize:12, lineHeight:1.65, fontWeight:500, margin:0 }}>{mission.quiz.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {phase==="correct" && (
          <button onClick={onComplete}
            style={{ marginTop:14, width:"100%", padding:"13px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${mission.color},${mission.color}cc)`, color:"#fff", fontWeight:700, fontSize:13.5, fontFamily:"'Fraunces',serif", cursor:"pointer", boxShadow:`0 4px 14px ${mission.color}30`, display:"flex", alignItems:"center", justifyContent:"center", gap:8, animation:"fadeUp 0.35s ease" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}
          >
            {index+1<total
              ? <><span>Got it — Rule {index+2}</span><Ic.ArrowRight size={15} /></>
              : <><span>Final Step — Take the Oath</span><Ic.ArrowRight size={15} /></>
            }
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Oath Screen — no heart, professional ───────────────────────────────── */
function OathScreen({ exam, onProceed }) {
  const [signed,    setSigned]    = useState(false);
  const [ripple,    setRipple]    = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [mounted,   setMounted]   = useState(false);

  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return ()=>clearTimeout(t); },[]);

  const handleSign = () => {
    if (nameInput.trim().length < 2) return;
    setRipple(true);
    setTimeout(()=>{ setRipple(false); setSigned(true); }, 600);
  };

  const fadeIn = {
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(18px)",
    transition:"opacity 0.5s ease 60ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) 60ms",
  };

  /* Signed state */
  if (signed) {
    return (
      <div style={{ background:T.surface, border:`1.5px solid ${T.greenBdr}`, borderRadius:22, padding:32, boxShadow:"0 8px 40px rgba(10,124,92,0.10)", textAlign:"center", animation:"fadeUp 0.5s ease" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:T.greenSoft, border:`1.5px solid ${T.green}30`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", animation:"pop 0.5s ease", color:T.green }}>
          <Ic.Target />
        </div>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:23, fontWeight:800, color:T.text, letterSpacing:"-0.5px", marginBottom:10 }}>
          You're Cleared to Compete
        </h2>
        <p style={{ fontSize:13.5, color:T.muted, marginBottom:26, lineHeight:1.75 }}>
          Your integrity pledge is recorded.<br/>
          Good luck, <strong style={{ color:T.text }}>{nameInput}</strong>. Make it count.
        </p>
        <div style={{ display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap", marginBottom:26 }}>
          {["5 Rules Read","Quiz Passed","Oath Signed"].map(tag=>(
            <span key={tag} style={{ fontSize:10.5, fontWeight:700, background:T.greenSoft, color:T.green, border:`1px solid ${T.green}25`, borderRadius:100, padding:"4px 12px", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:5 }}>
              <Ic.Check size={9} /> {tag}
            </span>
          ))}
        </div>
        <button onClick={onProceed}
          style={{ width:"100%", padding:"14px", borderRadius:11, border:"none", background:`linear-gradient(135deg,${T.green},#047857)`, color:"#fff", fontWeight:700, fontSize:14.5, fontFamily:"'Fraunces',serif", cursor:"pointer", boxShadow:"0 5px 18px rgba(5,150,105,0.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
          <Ic.MapPin size={18} />
          Enable Location &amp; Continue
        </button>
      </div>
    );
  }

  return (
    <div style={fadeIn}>
      <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:22, overflow:"hidden", boxShadow:"0 2px 22px rgba(61,82,213,0.09)", marginBottom:14 }}>
        {/* Gradient top strip */}
        <div style={{ height:4, background:"linear-gradient(90deg,#4361ee,#7c3aed,#059669)" }} />
        <div style={{ padding:"28px 26px" }}>

          {/* Header — Scale/Justice icon replacing heart */}
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ width:66, height:66, borderRadius:"50%", background:T.accentSoft, border:`1.5px solid rgba(61,82,213,0.18)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", color:T.accent }}>
              <Ic.Shield size={30} />
            </div>
            <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:21, fontWeight:800, color:T.text, letterSpacing:"-0.5px", marginBottom:7 }}>
              The Integrity Oath
            </h3>
            <p style={{ fontSize:13, color:T.muted, lineHeight:1.7 }}>
              You've read all 5 rules. Now make it official.
            </p>
          </div>

          {/* Oath text block */}
          <div style={{ background:T.surfaceAlt, border:`1.5px solid ${T.borderSoft}`, borderRadius:14, padding:"18px 20px", marginBottom:20, position:"relative" }}>
            {/* Opening quote mark — decorative text, not emoji */}
            <div style={{ position:"absolute", top:-14, left:18, fontSize:52, color:"#d1d9ef", fontFamily:"Georgia,serif", lineHeight:1, pointerEvents:"none", userSelect:"none" }}>&ldquo;</div>
            <p style={{ fontSize:13.5, color:T.text, lineHeight:1.9, fontStyle:"italic", paddingTop:6, margin:0 }}>
              I, <strong style={{ color:T.accent, fontStyle:"normal" }}>{nameInput||"___________"}</strong>, confirm that I have read and understood all exam rules. I will not use any unauthorised resources, switch tabs, or attempt to deceive the AI proctoring system. I understand that any violation may result in immediate disqualification.
            </p>
          </div>

          {/* Name input */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10.5, fontWeight:700, color:T.muted, display:"block", marginBottom:7, letterSpacing:"0.6px", fontFamily:"'DM Mono',monospace" }}>
              TYPE YOUR FULL NAME TO SIGN
            </label>
            <input
              type="text" placeholder="e.g. Arjun Sharma"
              value={nameInput} onChange={e=>setNameInput(e.target.value)}
              style={{ width:"100%", padding:"12px 15px", borderRadius:10, border:`1.5px solid ${T.border}`, background:T.surfaceAlt, color:T.text, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s, box-shadow 0.2s" }}
              onFocus={e=>{ e.target.style.borderColor="rgba(61,82,213,0.45)"; e.target.style.boxShadow="0 0 0 3px rgba(61,82,213,0.1)"; }}
              onBlur={e=>{ e.target.style.borderColor=T.border; e.target.style.boxShadow="none"; }}
            />
          </div>

          {/* Sign button */}
          <button onClick={handleSign} disabled={nameInput.trim().length<2}
            style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:nameInput.trim().length>=2?`linear-gradient(135deg,${T.accent},#2d3eb0)`:T.accentMid, color:nameInput.trim().length>=2?"#fff":T.accent, fontWeight:700, fontSize:14, fontFamily:"'Fraunces',serif", cursor:nameInput.trim().length>=2?"pointer":"not-allowed", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"opacity 0.2s" }}>
            {ripple&&<div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.22)", animation:"rippleFill 0.5s ease" }} />}
            <Ic.PenLine />
            Sign &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Location Permission ────────────────────────────────────────────────── */
function LocationScreen({ onGranted }) {
  const [status,  setStatus]  = useState("idle");
  const [coords,  setCoords]  = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return ()=>clearTimeout(t); },[]);

  useEffect(()=>{
    if (status==="granted" && coords) {
      const t=setTimeout(()=>onGranted(coords),1400);
      return ()=>clearTimeout(t);
    }
  },[status,coords]); // eslint-disable-line

  const requestLocation = () => {
    if (!navigator.geolocation) { setStatus("unsupported"); return; }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      pos=>{ setCoords({lat:pos.coords.latitude,lng:pos.coords.longitude}); setStatus("granted"); },
      err=>{ setStatus(err.code===1?"denied":"unsupported"); },
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  };

  const fadeIn = { opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(18px)", transition:"opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)" };
  const ok=status==="granted", bad=status==="denied"||status==="unsupported";
  const iconColor=ok?T.green:bad?T.red:T.accent;
  const iconBg   =ok?T.greenSoft:bad?T.redSoft:T.accentSoft;
  const borderCol=ok?`${T.green}40`:bad?`${T.red}30`:T.border;

  const titles    = { idle:"Location Access Required", requesting:"Waiting for Permission…", granted:"Location Confirmed!", denied:"Location Access Denied", unsupported:"GPS Not Available" };
  const subtitles = { idle:"NeuroAssess monitors your GPS throughout the exam to ensure integrity. You must allow location access to proceed.", requesting:"A browser prompt has appeared. Click \"Allow\" to continue.", granted:"Your location is verified. Proceeding…", denied:"You declined location access. Go to your browser's address bar → Site Settings → Location → Allow, then try again.", unsupported:"Your browser or device does not support GPS. Please use Chrome or Edge on a location-enabled device." };

  return (
    <div style={fadeIn}>
      <div style={{ background:T.surface, border:`1.5px solid ${borderCol}`, borderRadius:22, overflow:"hidden", boxShadow:ok?"0 8px 36px rgba(10,124,92,0.12)":"0 2px 20px rgba(61,82,213,0.09)", transition:"border-color 0.4s, box-shadow 0.4s" }}>
        <div style={{ height:4, background:ok?"linear-gradient(90deg,#0a7c5c,#059669)":bad?"linear-gradient(90deg,#c41640,#e11d48)":"linear-gradient(90deg,#3d52d5,#0a7c5c)", transition:"background 0.4s" }} />
        <div style={{ padding:"30px 26px", textAlign:"center" }}>
          {/* Icon */}
          <div style={{ width:78, height:78, borderRadius:"50%", background:iconBg, border:`1.5px solid ${iconColor}22`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", transition:"all 0.4s", boxShadow:ok?`0 0 0 12px ${T.greenSoft}`:"none", animation:status==="granted"?"pop 0.5s ease":"none", color:iconColor }}>
            {status==="requesting"
              ? <div style={{ width:30, height:30, border:`3px solid ${T.accentMid}`, borderTopColor:T.accent, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
              : <Ic.MapPin size={32} />
            }
          </div>

          <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"2px", color:iconColor, marginBottom:8, fontFamily:"'DM Mono',monospace" }}>STEP 3 OF 3 — LOCATION</div>
          <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:800, color:T.text, letterSpacing:"-0.4px", marginBottom:11, lineHeight:1.2 }}>{titles[status]}</h3>
          <p style={{ fontSize:13.5, color:T.muted, lineHeight:1.8, marginBottom:20 }}>{subtitles[status]}</p>

          {/* Privacy list */}
          {(status==="idle"||status==="denied") && (
            <div style={{ background:T.surfaceAlt, border:`1px solid ${T.borderSoft}`, borderRadius:12, padding:"14px 16px", marginBottom:20, textAlign:"left" }}>
              {["GPS captured every 15 seconds","Shown live on proctor dashboard","Encrypted — stored 90 days only","Used solely for exam integrity"].map((item,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:i<3?8:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:T.greenSoft, border:`1px solid ${T.green}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:T.green }}>
                    <Ic.Check size={9} />
                  </div>
                  <span style={{ fontSize:12.5, color:T.muted }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Granted tags */}
          {status==="granted" && (
            <div style={{ display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap", marginBottom:18 }}>
              {["Rules Read","Oath Signed","GPS Verified"].map(tag=>(
                <span key={tag} style={{ fontSize:10.5, fontWeight:700, background:T.greenSoft, color:T.green, border:`1px solid ${T.green}25`, borderRadius:100, padding:"4px 12px", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:5 }}>
                  <Ic.Check size={9} /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          {status==="idle" && (
            <button onClick={requestLocation}
              style={{ width:"100%", padding:"14px", borderRadius:11, border:"none", background:`linear-gradient(135deg,${T.green},#047857)`, color:"#fff", fontWeight:700, fontSize:14.5, fontFamily:"'Fraunces',serif", cursor:"pointer", boxShadow:"0 4px 18px rgba(5,150,105,0.38)", display:"flex", alignItems:"center", justifyContent:"center", gap:9, color:"#fff" }}>
              <Ic.MapPin size={18} /> Allow Location &amp; Enter Exam
            </button>
          )}
          {status==="requesting" && (
            <div style={{ width:"100%", padding:"13px", borderRadius:10, background:T.accentSoft, border:`1px solid ${T.accentMid}`, fontSize:13, fontWeight:600, color:T.accent, textAlign:"center" }}>
              Check your browser for a popup…
            </div>
          )}
          {status==="granted" && (
            <div style={{ width:"100%", padding:"13px", borderRadius:10, background:T.greenSoft, border:`1px solid ${T.green}30`, fontSize:13, fontWeight:700, color:T.green, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Ic.Check size={13} /> Proceeding to ID verification…
            </div>
          )}
          {(status==="denied"||status==="unsupported") && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={requestLocation}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${T.accent},#2d3eb0)`, color:"#fff", fontWeight:700, fontSize:13.5, fontFamily:"'Fraunces',serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 12px rgba(61,82,213,0.28)" }}>
                <Ic.MapPin size={16} /> Request Location Again
              </button>
              <p style={{ fontSize:11, color:T.dim, lineHeight:1.65, textAlign:"center", margin:0 }}>
                If the popup doesn't appear: click the lock icon in your browser's address bar → Site Settings → Location → Allow → then click above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Instruction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, examData, isUniversity, redirectTo, examType, cert, skipSelect } = location.state || {};

  const examInfo = examData || exam;

  const [current,   setCurrent]   = useState(0);
  const [completed, setCompleted] = useState([]);
  const [phase,     setPhase]     = useState("intro");
  const [mounted,   setMounted]   = useState(false);

  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return ()=>clearTimeout(t); },[]);

  const handleMissionComplete = () => {
    setCompleted(prev=>[...prev,current]);
    if (current+1>=MISSIONS.length) setPhase("oath");
    else setCurrent(c=>c+1);
  };

  const handleOathProceed = () => setPhase("location");

  const handleLocationGranted = useCallback(async ({lat,lng})=>{
    const candidateId = localStorage.getItem("candidate_id")||localStorage.getItem("student_id")||"unknown";
    const examId      = examInfo?.id||examInfo?.exam_id||cert?.id||examType||"unknown";
    let geoSessionId  = null;
    try {
      const body = { candidateId, examId, examType:examType||'hiring', consentGiven:true, lat, lng };
      const res  = await fetch("http://localhost:5000/api/session/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      geoSessionId = data.sessionId||null;
    } catch (err) { console.warn("[GEO] Could not start geo session:",err); }

    if (isUniversity) {
      navigate("/university-exam",{replace:false,state:{examData:examInfo,locationGranted:true,initialCoords:{lat,lng},geoSessionId}});
    } else {
      navigate(redirectTo||"/exam-verify",{replace:false,state:{exam:examInfo,cert,skipSelect,examType,locationGranted:true,initialCoords:{lat,lng},geoSessionId}});
    }
  },[navigate,examInfo,isUniversity]); // eslint-disable-line

  const progress = (phase==="oath"||phase==="location") ? MISSIONS.length : current;

  const introFade = {
    opacity:   mounted?1:0,
    transform: mounted?"translateY(0)":"translateY(18px)",
    transition:"opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
  };

  const introSteps = [
    { comp: Ic.BookOpen, label:"Read",  desc:"5 rules explained simply" },
    { comp: Ic.Brain,    label:"Prove", desc:"Quick quiz on each rule"  },
    { comp: Ic.PenLine,  label:"Sign",  desc:"Take the integrity oath"  },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500;600&display=swap');
        html,body,#root{min-height:100vh;margin:0;padding:0;}
        body{background:#eef0f8 !important;}
        @keyframes fadeUp    {from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:none}}
        @keyframes pop       {0%{transform:scale(.72);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes shake     {0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-7px)}50%{transform:translateX(7px)}}
        @keyframes shimmerBar{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        @keyframes rippleFill{from{opacity:1}to{opacity:0}}
        @keyframes orbFloat  {0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-12px)}}
        @keyframes spin      {to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#eef0f8", fontFamily:"'DM Sans',sans-serif", color:T.text, display:"flex", flexDirection:"column", alignItems:"center", padding:"0 16px 60px", position:"relative" }}>

        {/* Background layers */}
        <div style={{ position:"fixed", inset:0, background:"linear-gradient(155deg,#dfe3f5 0%,#eef0f8 45%,#e3e7f5 100%)", zIndex:-4, pointerEvents:"none" }} />
        <div style={{ position:"fixed", inset:0, zIndex:-2, backgroundImage:"radial-gradient(circle,rgba(61,82,213,0.16) 1px,transparent 1px)", backgroundSize:"28px 28px", pointerEvents:"none", opacity:0.45 }} />
        <div style={{ position:"fixed", top:"-8%", left:"-5%", zIndex:-1, width:580, height:580, borderRadius:"50%", background:"radial-gradient(circle,rgba(61,82,213,0.15) 0%,transparent 60%)", filter:"blur(80px)", pointerEvents:"none", animation:"orbFloat 9s ease-in-out infinite" }} />
        <div style={{ position:"fixed", bottom:"-5%", right:"-5%", zIndex:-1, width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,0.12) 0%,transparent 60%)", filter:"blur(70px)", pointerEvents:"none" }} />

        <div style={{ width:"100%", maxWidth:520, zIndex:1, paddingTop:36 }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, ...introFade }}>
            <button onClick={()=>navigate(-1)}
              style={{ background:T.surface, border:`1.5px solid ${T.border}`, color:T.muted, cursor:"pointer", width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:T.muted }}>
              <Ic.ArrowLeft size={16} />
            </button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:9.5, color:T.dim, fontWeight:700, letterSpacing:"1.8px", fontFamily:"'DM Mono',monospace", marginBottom:2 }}>
                {isUniversity?"UNIVERSITY EXAM":"EXAM BRIEFING"}
              </div>
              <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Fraunces',serif", color:T.text }}>
                {examInfo?.exam||examInfo?.title||"Exam Briefing"}
              </div>
            </div>
            <div style={{ background:T.accentSoft, border:`1.5px solid ${T.accentMid}`, borderRadius:100, padding:"4px 11px", fontSize:10, color:T.accent, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
              {completed.length}/{MISSIONS.length} DONE
            </div>
          </div>

          <div style={introFade}><ProgressBar total={MISSIONS.length} current={progress} /></div>

          {/* ── Intro ── */}
          {phase==="intro" && (
            <div style={introFade}>
              <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:22, overflow:"hidden", boxShadow:"0 2px 22px rgba(61,82,213,0.09)", marginBottom:14 }}>
                <div style={{ height:4, background:"linear-gradient(90deg,#4361ee,#7c3aed,#059669,#d97706,#0891b2)" }} />
                <div style={{ padding:"34px 26px", textAlign:"center" }}>
                  <div style={{ width:70, height:70, borderRadius:20, background:T.accentSoft, border:`1.5px solid rgba(61,82,213,0.14)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", animation:"pop 0.6s ease", color:T.accent }}>
                    <Ic.Clipboard />
                  </div>
                  <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:25, fontWeight:800, color:T.text, letterSpacing:"-0.8px", marginBottom:12, lineHeight:1.15 }}>Before You Begin</h1>
                  <p style={{ fontSize:14, color:T.muted, lineHeight:1.8, marginBottom:22, maxWidth:370, margin:"0 auto 22px" }}>
                    Most students skip these rules — then blame them when things go wrong.
                    <strong style={{ color:T.text }}> We made it impossible to skip.</strong>
                  </p>

                  {/* Step chips */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
                    {introSteps.map(({comp:Comp,label,desc},i)=>(
                      <div key={i} style={{ background:T.surfaceAlt, border:`1.5px solid ${T.borderSoft}`, borderRadius:14, padding:"15px 10px", opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(12px)", transition:`opacity 0.5s ease ${200+i*100}ms,transform 0.5s cubic-bezier(0.22,1,0.36,1) ${200+i*100}ms` }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:T.accentSoft, border:`1px solid rgba(61,82,213,0.12)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", color:T.accent }}>
                          <Comp />
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:"'Fraunces',serif", marginBottom:3 }}>{label}</div>
                        <div style={{ fontSize:11, color:T.dim }}>{desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Rule pills */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:26 }}>
                    {MISSIONS.map((m,i)=>{
                      const Comp = Ic[m.icon];
                      return (
                        <span key={i} style={{ fontSize:11, fontWeight:600, padding:"5px 12px", borderRadius:100, background:m.colorSoft, color:m.color, border:`1px solid ${m.color}22`, opacity:mounted?1:0, transition:`opacity 0.4s ease ${380+i*70}ms`, display:"flex", alignItems:"center", gap:5 }}>
                          {Comp&&<span style={{color:m.color}}><Comp /></span>}{m.title}
                        </span>
                      );
                    })}
                  </div>

                  <button onClick={()=>setPhase("missions")}
                    style={{ width:"100%", padding:"14px", borderRadius:11, border:"none", background:`linear-gradient(135deg,${T.accent},#2d3eb0)`, color:"#fff", fontWeight:700, fontSize:15, fontFamily:"'Fraunces',serif", cursor:"pointer", boxShadow:"0 4px 14px rgba(61,82,213,0.32)", display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
                    Start Mission Briefing <Ic.ArrowRight size={16} />
                  </button>
                  <p style={{ fontSize:11, color:T.dim, marginTop:11 }}>Takes ~2 minutes · Cannot be skipped</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Missions ── */}
          {phase==="missions" && (
            <MissionSlide key={current} mission={MISSIONS[current]} index={current} total={MISSIONS.length} onComplete={handleMissionComplete} isActive={true} />
          )}

          {/* ── Oath ── */}
          {phase==="oath" && (
            <OathScreen exam={examInfo} onProceed={handleOathProceed} />
          )}

          {/* ── Location ── */}
          {phase==="location" && (
            <LocationScreen onGranted={handleLocationGranted} />
          )}

        </div>
      </div>
    </>
  );
}