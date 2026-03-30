import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RecruiterLayout, { Icon } from "./RecruiterLayout";

/* ─── API base ───────────────────────────────────────────────────────────── */
const API = "http://localhost:5000/api";

/* ─── Theme ──────────────────────────────────────────────────────────────── */
const C = {
  bg:           "#CFF4F7",
  sidebar:      "#F2FBFF",
  border:       "#b8eaee",
  text:         "#0A2A41",
  muted:        "#3d6878",
  dim:          "#7aacba",
  primary:      "#2BB1A8",
  primaryLight: "#d9f2f4",
  primaryHover: "#1d9e96",
  success:      "#0a8f5c",
  successLight: "#d9f5ec",
  danger:       "#dc2626",
  dangerLight:  "#fee2e2",
  warning:      "#b45309",
  warningLight: "#fef3c7",
  navy:         "#0A2A41",
  paleAqua:     "#CFF4F7",
  lightCyan:    "#F2FBFF",
  white:        "#ffffff",
  aiAccent:     "#6366f1",
  aiLight:      "#ede9fe",
  // aliases used by StatCard
  accent:       "#2BB1A8",
  accentLight:  "#d9f2f4",
  green:        "#0a8f5c",
  greenBg:      "#d9f5ec",
  red:          "#dc2626",
  redBg:        "#fee2e2",
  orange:       "#b45309",
  orangeBg:     "#fef3c7",
  blue:         "#0ea5e9",
  purple:       "#6366f1",
};

/* ─── Static data ────────────────────────────────────────────────────────── */
const EXAM_TYPES = { SKILL_CERTIFICATE: "Skill Certificate", PLACEMENT: "Placement" };

const SIDEBAR_MENU = [
  { id: "dashboard",     label: "Dashboard",    icon: "📊" },
  { id: "candidates",    label: "Candidates",   icon: "👥" },
  { id: "reports",       label: "Reports",      icon: "📈" },
  { id: "exam-requests", label: "Exam Requests",icon: "📋" },
  { id: "ai-analyst",    label: "AI Analyst",   icon: "🤖", highlight: true },
];

const DETAILED_REPORTS = [
  { examName:"Skill Certificate", totalQuestions:50, duration:"120 mins", difficulty:"Intermediate", avgScore:78.5, passRate:85, topics:["HTML/CSS","JavaScript","React","UI/UX"], questionsBreakdown:[{topic:"React Concepts",correct:18,total:20,percentage:90},{topic:"JavaScript ES6+",correct:15,total:18,percentage:83},{topic:"CSS & Styling",correct:12,total:15,percentage:80},{topic:"DOM Manipulation",correct:14,total:17,percentage:82}], completionTime:"98 mins", topPerformers:["Raj Kumar (92%)","Vikram Singh (88%)"], commonMistakes:["Event handling","State management"] },
  { examName:"Placement", totalQuestions:45, duration:"110 mins", difficulty:"Advanced", avgScore:72.3, passRate:75, topics:["Node.js","Express","MongoDB","APIs"], questionsBreakdown:[{topic:"Express.js",correct:15,total:18,percentage:83},{topic:"MongoDB Queries",correct:12,total:15,percentage:80},{topic:"RESTful APIs",correct:13,total:16,percentage:81},{topic:"Authentication",correct:10,total:14,percentage:71}], completionTime:"105 mins", topPerformers:["Amit Patel (89%)","Priya Singh (86%)"], commonMistakes:["Async/await patterns","Middleware implementation"] },
];

const REPORTS_DATA = [
  { examName:"Frontend Engineer", totalQuestions:50, duration:"120 mins", difficulty:"Intermediate", avgScore:78.5, passRate:85, topics:["HTML/CSS","JavaScript","React","UI/UX"], questionsBreakdown:[{topic:"React Concepts",correct:18,total:20,percentage:90},{topic:"JavaScript ES6+",correct:15,total:18,percentage:83},{topic:"CSS & Styling",correct:12,total:15,percentage:80},{topic:"DOM Manipulation",correct:14,total:17,percentage:82}], completionTime:"98 mins", topPerformers:["Raj Kumar (92%)","Vikram Singh (88%)"], commonMistakes:["Event handling","State management"] },
  { examName:"Backend Node.js", totalQuestions:45, duration:"110 mins", difficulty:"Advanced", avgScore:72.3, passRate:75, topics:["Node.js","Express","MongoDB","APIs"], questionsBreakdown:[{topic:"Express.js",correct:15,total:18,percentage:83},{topic:"MongoDB Queries",correct:12,total:15,percentage:80},{topic:"RESTful APIs",correct:13,total:16,percentage:81},{topic:"Authentication",correct:10,total:14,percentage:71}], completionTime:"105 mins", topPerformers:["Amit Patel (89%)","Priya Singh (86%)"], commonMistakes:["Async/await patterns","Middleware implementation"] },
  { examName:"Full Stack Developer", totalQuestions:60, duration:"150 mins", difficulty:"Advanced", avgScore:75.8, passRate:80, topics:["Frontend","Backend","Database","DevOps"], questionsBreakdown:[{topic:"Frontend Stack",correct:22,total:25,percentage:88},{topic:"Backend Development",correct:19,total:23,percentage:83},{topic:"Database Design",correct:15,total:18,percentage:83},{topic:"DevOps & Deployment",correct:12,total:15,percentage:80}], completionTime:"142 mins", topPerformers:["Neha Gupta (91%)","Raj Kumar (89%)"], commonMistakes:["Database optimization","Container orchestration"] },
];

/* ─── Candidate pool ─────────────────────────────────────────────────────── */
const CANDIDATE_POOL = [
  { id:"STU_001", name:"Raj Kumar",    email:"raj@example.com",    totalScore:85, hiringTag:"Strong Yes", confidence:"High",   risk:"Low",    codingSkill:88, problemSolving:90, consistency:78, examType:"Skill Certificate", skills:["React","JavaScript","CSS","HTML"],        college:"IIT Hyderabad",   major:"CSE" },
  { id:"STU_002", name:"Priya Singh",  email:"priya@example.com",  totalScore:78, hiringTag:"Yes",        confidence:"High",   risk:"Low",    codingSkill:76, problemSolving:80, consistency:74, examType:"Placement",         skills:["Node.js","Express","MongoDB","APIs"],     college:"NIT Warangal",    major:"IT"  },
  { id:"STU_003", name:"Amit Patel",   email:"amit@example.com",   totalScore:92, hiringTag:"Strong Yes", confidence:"High",   risk:"Low",    codingSkill:94, problemSolving:96, consistency:88, examType:"Placement",         skills:["Python","ML","TensorFlow","SQL"],         college:"IIT Madras",      major:"AI"  },
  { id:"STU_004", name:"Anjali Verma", email:"anjali@example.com", totalScore:65, hiringTag:"Maybe",      confidence:"Medium", risk:"Medium", codingSkill:62, problemSolving:68, consistency:55, examType:"Skill Certificate", skills:["HTML","CSS","JavaScript"],                college:"VIT Vellore",     major:"CSE" },
  { id:"STU_005", name:"Vikram Singh", email:"vikram@example.com", totalScore:88, hiringTag:"Strong Yes", confidence:"High",   risk:"Low",    codingSkill:86, problemSolving:92, consistency:82, examType:"Skill Certificate", skills:["React","TypeScript","Node.js","GraphQL"], college:"BITS Pilani",     major:"CSE" },
  { id:"STU_006", name:"Neha Gupta",   email:"neha@example.com",   totalScore:75, hiringTag:"Yes",        confidence:"Medium", risk:"Low",    codingSkill:74, problemSolving:78, consistency:70, examType:"Placement",         skills:["Java","Spring Boot","Docker","SQL"],      college:"PESIT Bangalore", major:"SE"  },
];

/* ─── Agentic tool definitions ───────────────────────────────────────────── */
const AI_TOOLS = [
  {
    name:"search_candidates",
    description:"Search and filter candidates from NeuroAssess database by skills, score range, hiring tag, exam type, or any criteria.",
    input_schema:{
      type:"object",
      properties:{
        skills:     { type:"array",  items:{type:"string"}, description:"Filter by skills e.g. ['React','Python']" },
        minScore:   { type:"number", description:"Minimum total score 0-100" },
        hiringTags: { type:"array",  items:{type:"string"}, description:"e.g. ['Strong Yes','Yes']" },
        examType:   { type:"string", description:"Skill Certificate | Placement" },
        topN:       { type:"number", description:"Return top N results only" },
        sortBy:     { type:"string", description:"totalScore | codingSkill | problemSolving | consistency" },
      },
      required:[]
    }
  },
  {
    name:"shortlist_for_role",
    description:"Shortlist best-fit candidates for a specific job role.",
    input_schema:{
      type:"object",
      properties:{
        role:           { type:"string", description:"e.g. 'Backend Engineer', 'Data Scientist', 'Frontend Developer'" },
        requiredSkills: { type:"array",  items:{type:"string"} },
        topN:           { type:"number" },
        minScore:       { type:"number" },
      },
      required:["role"]
    }
  },
  {
    name:"compare_candidates",
    description:"Compare two or more candidates head-to-head on all metrics.",
    input_schema:{
      type:"object",
      properties:{
        names:{ type:"array", items:{type:"string"}, description:"List of candidate names to compare" },
      },
      required:["names"]
    }
  },
  {
    name:"get_statistics",
    description:"Get aggregate statistics about the full candidate pool.",
    input_schema:{ type:"object", properties:{}, required:[] }
  },
];

/* ─── Tool execution engine ──────────────────────────────────────────────── */
function runTool(name, input) {
  switch (name) {
    case "search_candidates": {
      let r = [...CANDIDATE_POOL];
      if (input.skills?.length)     r = r.filter(s => input.skills.some(sk => s.skills.some(ss => ss.toLowerCase().includes(sk.toLowerCase()))));
      if (input.minScore)           r = r.filter(s => s.totalScore >= input.minScore);
      if (input.hiringTags?.length) r = r.filter(s => input.hiringTags.includes(s.hiringTag));
      if (input.examType)           r = r.filter(s => s.examType === input.examType);
      const key = input.sortBy || "totalScore";
      r.sort((a, b) => (b[key]||0) - (a[key]||0));
      if (input.topN) r = r.slice(0, input.topN);
      return { count: r.length, candidates: r };
    }
    case "shortlist_for_role": {
      const roleMap = {
        backend:          ["Java","Spring Boot","Node.js","Python","Docker","SQL"],
        frontend:         ["React","JavaScript","TypeScript","CSS","HTML"],
        fullstack:        ["React","Node.js","JavaScript","MongoDB","SQL"],
        "data scientist": ["Python","ML","TensorFlow","SQL"],
        ml:               ["Python","TensorFlow","ML","SQL"],
        devops:           ["Docker","Kubernetes","CI/CD","AWS"],
      };
      const key = Object.keys(roleMap).find(k => input.role.toLowerCase().includes(k)) || "backend";
      const req  = input.requiredSkills?.length ? input.requiredSkills : roleMap[key];
      const r = CANDIDATE_POOL
        .filter(s => s.totalScore >= (input.minScore || 0))
        .map(s => ({ ...s, matchScore: s.skills.filter(sk => req.some(r => sk.toLowerCase().includes(r.toLowerCase()))).length }))
        .filter(s => s.matchScore > 0)
        .sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : b.totalScore - a.totalScore)
        .slice(0, input.topN || 3);
      return { role: input.role, shortlisted: r };
    }
    case "compare_candidates": {
      const r = CANDIDATE_POOL.filter(s => (input.names||[]).some(n => s.name.toLowerCase().includes(n.toLowerCase())));
      return { comparison: r };
    }
    case "get_statistics": {
      const avg = key => Math.round(CANDIDATE_POOL.reduce((a,s) => a + s[key], 0) / CANDIDATE_POOL.length);
      const tags = CANDIDATE_POOL.reduce((a,s) => { a[s.hiringTag]=(a[s.hiringTag]||0)+1; return a; }, {});
      const skills = CANDIDATE_POOL.flatMap(s=>s.skills).reduce((a,sk)=>{ a[sk]=(a[sk]||0)+1; return a; }, {});
      return {
        total: CANDIDATE_POOL.length,
        avgScore: avg("totalScore"),
        avgCodingSkill: avg("codingSkill"),
        avgProblemSolving: avg("problemSolving"),
        avgConsistency: avg("consistency"),
        hiringDistribution: tags,
        topSkills: Object.fromEntries(Object.entries(skills).sort((a,b)=>b[1]-a[1]).slice(0,6)),
      };
    }
    default: return { error: "Unknown tool" };
  }
}

/* ─── System prompt ──────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are the NeuroAssess AI Analyst — an expert agentic recruiter assistant embedded in the NeuroAssess recruiter dashboard.

You help recruiters by:
- Searching and filtering student assessment reports from the NeuroAssess database using your tools
- Analysing uploaded student PDF reports (GitHub score, LeetCode score, coding skill, problem solving, consistency, AI insights)
- Answering technical and professional questions about candidates, hiring, and tech roles
- Shortlisting candidates for specific roles with clear justifications
- Comparing candidates head-to-head with data-driven reasoning

When a PDF is shared, extract and analyse: candidate name, total score, hiring tag (Strong Yes/Yes/Maybe/No), confidence, risk level, coding skill (GitHub-based), problem solving (LeetCode-based), consistency score, test score, AI insights, skill profile, project highlights. Give a structured hiring recommendation.

Rules:
1. Always use tools to fetch real data before answering database questions
2. When listing candidates, be structured: name → score → key strengths → recommendation
3. For PDF reports: give a clear HIRE / CONSIDER / PASS verdict with reasoning
4. Answer only technical, professional, and hiring-related questions
5. Keep responses concise and recruiter-friendly — use **bold** for names/scores
6. Use markdown: bullet points, bold, headers where appropriate`;

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color, iconPath, delay = 0 }) {
  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: "20px 22px",
      border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`,
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      animation: `fadeUp 0.35s ease ${delay}s both`,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon d={iconPath} size={17} color={color} strokeWidth={2}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI CHAT DRAWER — Gemini 1.5 Flash powered
   ═══════════════════════════════════════════════════════════════════════════ */
function AIChatDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: {
      text: `👋 **NeuroAssess AI Analyst** is ready.\n\nI can help you:\n- **Search** candidates by skill, score, or role\n- **Analyse** student PDF reports you upload\n- **Shortlist** candidates for any job role\n- **Answer** any technical / hiring question\n\nUpload a student report PDF or just ask me anything.`,
      candidates: []
    }
  }]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [pdfs,     setPdfs]     = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const readPDF = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res({ name: file.name, b64: r.result.split(",")[1] });
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    const arr = Array.from(files).filter(f => f.type === "application/pdf");
    if (!arr.length) return;
    const read = await Promise.all(arr.map(readPDF));
    setPdfs(prev => [...prev, ...read]);
  };

  const removePdf = (i) => setPdfs(prev => prev.filter((_,j) => j!==i));

  /* ── Gemini 1.5 Flash — agentic tool-use loop + PDF support ── */
  const callAI = async (userText, attachedPdfs) => {
    const API_KEY  = process.env.REACT_APP_GEMINI_API_KEY;
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const userParts = [];
    for (const pdf of attachedPdfs) {
      userParts.push({ inline_data: { mime_type: "application/pdf", data: pdf.b64 } });
    }
    userParts.push({ text: userText });

    const history = messages
      .filter(m => typeof m.content === "object" && m.content.text)
      .map(m => ({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.text }]
      }));

    const toolDeclarations = {
      function_declarations: AI_TOOLS.map(t => ({
        name:        t.name,
        description: t.description,
        parameters:  t.input_schema
      }))
    };

    const callGemini = async (contents) => {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [toolDeclarations],
          contents
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err}`);
      }
      return res.json();
    };

    let contents = [...history, { role: "user", parts: userParts }];
    let data = await callGemini(contents);
    let toolResultRows = [];

    while (true) {
      const parts     = data.candidates?.[0]?.content?.parts || [];
      const funcCalls = parts.filter(p => p.functionCall);
      if (!funcCalls.length) break;

      const toolResponseParts = [];
      for (const part of funcCalls) {
        const { name, args } = part.functionCall;
        const result = runTool(name, args || {});
        const cands = result.candidates || result.shortlisted || result.comparison || [];
        if (cands.length) toolResultRows.push(...cands);
        toolResponseParts.push({
          functionResponse: {
            name,
            response: { content: JSON.stringify(result) }
          }
        });
      }

      contents = [
        ...contents,
        { role: "model", parts },
        { role: "user",  parts: toolResponseParts }
      ];
      data = await callGemini(contents);
    }

    const finalParts = data.candidates?.[0]?.content?.parts || [];
    const finalText  = finalParts.filter(p => p.text).map(p => p.text).join("\n")
      || "I couldn't generate a response. Please try again.";

    return { text: finalText, candidates: toolResultRows };
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const attachedPdfs = [...pdfs];
    setPdfs([]);
    setMessages(prev => [...prev, { role:"user", content:{ text:msg, pdfs:attachedPdfs.map(p=>p.name), candidates:[] } }]);
    setLoading(true);
    try {
      const result = await callAI(msg, attachedPdfs);
      setMessages(prev => [...prev, { role:"assistant", content: result }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role:"assistant", content:{ text:`⚠️ Error: ${e.message}\n\nCheck REACT_APP_GEMINI_API_KEY in your .env file.`, candidates:[] } }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const CandRow = ({ c }) => (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", marginBottom:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:700, fontSize:13, color:C.text }}>{c.name}</span>
        <span style={{ fontWeight:700, fontSize:13, color: c.totalScore>=85?C.success:c.totalScore>=70?C.primary:C.warning }}>{c.totalScore}/100</span>
      </div>
      <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:600,
          background: c.hiringTag==="Strong Yes"?C.successLight:c.hiringTag==="Yes"?C.primaryLight:C.warningLight,
          color:      c.hiringTag==="Strong Yes"?C.success    :c.hiringTag==="Yes"?C.primary    :C.warning }}>
          {c.hiringTag}
        </span>
        {(c.skills||[]).slice(0,3).map(sk => (
          <span key={sk} style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:C.lightCyan, border:`1px solid ${C.border}`, color:C.muted }}>{sk}</span>
        ))}
      </div>
    </div>
  );

  const Md = ({ text }) => {
    const lines = (text||"").split("\n");
    return (
      <div style={{ fontSize:13, lineHeight:1.65, color:C.text }}>
        {lines.map((ln, i) => {
          if (ln.startsWith("### ")) return <p key={i} style={{ margin:"8px 0 3px", fontWeight:700, fontSize:13, color:C.navy }}>{ln.slice(4)}</p>;
          if (ln.startsWith("## "))  return <p key={i} style={{ margin:"10px 0 4px", fontWeight:700, fontSize:14, color:C.navy }}>{ln.slice(3)}</p>;
          if (ln.startsWith("- ") || ln.startsWith("• ")) {
            const parts = ln.slice(2).split(/(\*\*[^*]+\*\*)/g);
            return (
              <div key={i} style={{ display:"flex", gap:6, margin:"3px 0" }}>
                <span style={{ color:C.primary, flexShrink:0 }}>•</span>
                <span>{parts.map((p,j) => p.startsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</span>
              </div>
            );
          }
          if (ln.trim()==="") return <br key={i}/>;
          const parts = ln.split(/(\*\*[^*]+\*\*)/g);
          return <p key={i} style={{ margin:"2px 0" }}>{parts.map((p,j) => p.startsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</p>;
        })}
      </div>
    );
  };

  const suggestions = [
    "Top 3 for a React role",
    "Show all Strong Yes",
    "Compare Raj and Vikram",
    "Batch statistics",
    "Shortlist for backend engineer",
  ];

  if (!open) return null;

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"clamp(320px,36vw,480px)", background:C.white, boxShadow:"-6px 0 32px rgba(10,42,65,0.14)", display:"flex", flexDirection:"column", zIndex:3000, borderLeft:`1px solid ${C.border}`, fontFamily:"'DM Sans',-apple-system,sans-serif", animation:"slideInRight 0.25s ease" }}>
      <style>{`
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes pulseDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.5} }
        .ai-send-btn:hover { background:${C.primaryHover} !important; }
        .ai-chip:hover { background:${C.primaryLight} !important; border-color:${C.primary} !important; color:${C.primary} !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding:"14px 16px", background:`linear-gradient(135deg,${C.primary},${C.primaryHover})`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🤖</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>AI Analyst</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#6ee7b7", display:"inline-block", animation:"pulseDot 2s infinite" }}/>
            Gemini 1.5 Flash · {CANDIDATE_POOL.length} candidates loaded
          </div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 0" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:12, gap:8, alignItems:"flex-start" }}>
            {m.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${C.primary},${C.primaryHover})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, marginTop:2 }}>🤖</div>
            )}
            <div style={{
              maxWidth:  m.role==="user"?"75%":"100%",
              flex:      m.role==="assistant"?1:"unset",
              background:m.role==="user"?`linear-gradient(135deg,${C.primary},${C.primaryHover})`:C.lightCyan,
              color:     m.role==="user"?"#fff":C.text,
              padding:"10px 13px",
              borderRadius:m.role==="user"?"14px 14px 3px 14px":"14px 14px 14px 3px",
              border:m.role==="assistant"?`1px solid ${C.border}`:"none",
            }}>
              {m.content.pdfs?.length > 0 && (
                <div style={{ marginBottom:8, display:"flex", flexWrap:"wrap", gap:4 }}>
                  {m.content.pdfs.map((p,j) => (
                    <span key={j} style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.25)", border:"1px solid rgba(255,255,255,0.4)" }}>📄 {p}</span>
                  ))}
                </div>
              )}
              {m.role==="user"
                ? <span style={{ fontSize:13, lineHeight:1.6 }}>{m.content.text}</span>
                : <>
                    <Md text={m.content.text}/>
                    {m.content.candidates?.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        {m.content.candidates.map((c,ci) => <CandRow key={ci} c={c}/>)}
                      </div>
                    )}
                  </>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${C.primary},${C.primaryHover})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🤖</div>
            <div style={{ padding:"10px 14px", background:C.lightCyan, border:`1px solid ${C.border}`, borderRadius:"14px 14px 14px 3px", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:11, color:C.muted, marginRight:2 }}>Thinking</span>
              {[0,1,2].map(j => <span key={j} style={{ width:5, height:5, borderRadius:"50%", background:C.primary, display:"inline-block", animation:`pulseDot 1s ${j*0.18}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div style={{ padding:"10px 14px 0", display:"flex", gap:6, flexWrap:"wrap" }}>
          {suggestions.map(s => (
            <button key={s} className="ai-chip" onClick={() => send(s)}
              style={{ fontSize:11, padding:"5px 10px", borderRadius:20, background:C.lightCyan, border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", transition:"all 0.15s" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* PDF preview bar */}
      {pdfs.length > 0 && (
        <div style={{ padding:"8px 14px 0", display:"flex", gap:6, flexWrap:"wrap" }}>
          {pdfs.map((p,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, padding:"4px 10px", borderRadius:20, background:C.primaryLight, border:`1px solid ${C.primary}55`, color:C.primary }}>
              📄 {p.name.length>20?p.name.slice(0,18)+"…":p.name}
              <button onClick={() => removePdf(i)} style={{ background:"none", border:"none", cursor:"pointer", color:C.primary, padding:0, fontSize:12, lineHeight:1 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Drag-drop overlay */}
      {dragOver && (
        <div style={{ margin:"8px 14px", padding:16, border:`2px dashed ${C.primary}`, borderRadius:10, textAlign:"center", background:C.primaryLight, fontSize:12, color:C.primary, fontWeight:600 }}>
          Drop PDF report here
        </div>
      )}

      {/* Input */}
      <div style={{ padding:"10px 14px 14px", borderTop:`1px solid ${C.border}`, background:C.white, flexShrink:0 }}
        onDragOver={e  => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e      => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <button title="Upload student PDF" onClick={() => fileRef.current?.click()}
            style={{ width:36, height:36, borderRadius:9, background:C.lightCyan, border:`1px solid ${C.border}`, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:C.primary }}>
            📎
          </button>
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => handleFiles(e.target.files)}/>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Search candidates, upload PDF, ask anything… (Enter to send)"
            rows={1}
            style={{ flex:1, padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.55, color:C.text, background:C.white, transition:"border 0.15s" }}
            onFocus={e => e.target.style.borderColor=C.primary}
            onBlur={e  => e.target.style.borderColor=C.border}
          />
          <button className="ai-send-btn" onClick={() => send()} disabled={loading||(!input.trim()&&!pdfs.length)}
            style={{ width:36, height:36, borderRadius:9, background:(input.trim()||pdfs.length)&&!loading?C.primary:"#cbd5e1", border:"none", color:"#fff", cursor:(input.trim()||pdfs.length)&&!loading?"pointer":"not-allowed", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
            ↑
          </button>
        </div>
        <div style={{ marginTop:6, fontSize:10, color:C.dim, textAlign:"center" }}>
          Drop a student PDF report · Powered by Gemini 1.5 Flash (free)
        </div>
      </div>
    </div>
  );
}

/* ─── Floating AI bubble ─────────────────────────────────────────────────── */
function AIBubble({ onClick, hasUnread }) {
  return (
    <button onClick={onClick} title="Open AI Analyst"
      style={{ position:"fixed", bottom:28, right:28, width:58, height:58, borderRadius:"50%", background:`linear-gradient(135deg,${C.primary},${C.primaryHover})`, border:"none", cursor:"pointer", boxShadow:"0 4px 20px rgba(43,177,168,0.45)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, zIndex:2900, transition:"transform 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
      onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
      <style>{`
        @keyframes bubblePulse { 0%{box-shadow:0 0 0 0 rgba(43,177,168,0.55)} 70%{box-shadow:0 0 0 14px rgba(43,177,168,0)} 100%{box-shadow:0 0 0 0 rgba(43,177,168,0)} }
        .ai-bubble-ring { position:absolute; inset:0; border-radius:50%; animation:bubblePulse 2.2s infinite; }
      `}</style>
      <span className="ai-bubble-ring"/>
      🤖
      {hasUnread && <span style={{ position:"absolute", top:4, right:4, width:12, height:12, borderRadius:"50%", background:"#ef4444", border:"2px solid #fff" }}/>}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DETAILED REPORT (inline sub-component with proper props)
   ═══════════════════════════════════════════════════════════════════════════ */
function DetailedReport({ report, onBack, decisionColor, decisionBg, styles }) {
  const s = styles;
  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Back</button>
      <div style={s.detailedReportCard}>
        <div style={s.reportHeader}>
          <div>
            <h4 style={s.reportTitle}>{report.examName}</h4>
            <p style={s.reportMeta}>{report.totalQuestions} Questions | {report.duration} | {report.difficulty}</p>
          </div>
          <div style={s.reportStats}>
            <div style={s.reportStat}><span style={s.reportStatLabel}>Avg Score</span><span style={s.reportStatValue}>{report.avgScore}%</span></div>
            <div style={s.reportStat}><span style={s.reportStatLabel}>Pass Rate</span><span style={{ ...s.reportStatValue, color:C.success }}>{report.passRate}%</span></div>
          </div>
        </div>
        <div style={s.reportBody}>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Topics Covered</h5>
            <div style={s.topicsList}>{report.topics.map((t,i)=><span key={i} style={s.topicTag}>{t}</span>)}</div>
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Performance by Topic</h5>
            {report.questionsBreakdown.map((item,i)=>(
              <div key={i} style={s.breakdownItem}>
                <div style={s.breakdownLabel}><span style={s.breakdownTopic}>{item.topic}</span><span style={s.breakdownScore}>{item.correct}/{item.total}</span></div>
                <div style={s.progressBar}><div style={{ ...s.progressFill, width:`${item.percentage}%`, backgroundColor:item.percentage>=85?C.success:item.percentage>=70?C.primary:C.danger }}/></div>
                <span style={s.percentageText}>{item.percentage}%</span>
              </div>
            ))}
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Top Performers</h5>
            <ul style={s.performersList}>{report.topPerformers.map((p,i)=><li key={i} style={s.performerItem}>🏆 {p}</li>)}</ul>
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Common Mistakes</h5>
            <ul style={s.mistakesList}>{report.commonMistakes.map((m,i)=><li key={i} style={s.mistakeItem}>⚠️ {m}</li>)}</ul>
          </div>
          <div style={s.quickStatsRow}>
            <div style={s.quickStat}><span style={s.quickStatLabel}>Completion Time</span><span style={s.quickStatValue}>{report.completionTime}</span></div>
            <div style={s.quickStat}><span style={s.quickStatLabel}>Avg Duration</span><span style={s.quickStatValue}>{report.duration}</span></div>
          </div>
        </div>
        <div style={s.reportFooter}>
          <button style={s.reportBtn}>📥 Download Full Report</button>
          <button style={{ ...s.reportBtn, backgroundColor:C.navy }}>📤 Share Report</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN RECRUITER DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
const RecruiterDashboard = () => {
  const navigate = useNavigate();

  /* ── AI state ── */
  const [aiOpen,   setAiOpen]   = useState(false);
  const [aiUnread, setAiUnread] = useState(true);

  /* ── Backend stats ── */
  const [backendStats,   setBackendStats]   = useState({ total:0, shortlisted:0, pending:0, aiEvaluated:0 });
  const [recentFromAPI,  setRecentFromAPI]  = useState([]);
  const [backendLoading, setBackendLoading] = useState(true);

  /* ── Local state ── */
  const [analysisReports,   setAnalysisReports]   = useState([]);
  const [selectedCriteria,  setSelectedCriteria]  = useState(70);
  const [selectedExamType,  setSelectedExamType]  = useState("ALL");
  const [filteredStudents,  setFilteredStudents]  = useState({});
  const [activeMenu,        setActiveMenu]        = useState("dashboard");
  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [showGoogleForm,    setShowGoogleForm]    = useState(false);
  const [selectedStudent,   setSelectedStudent]   = useState(null);
  const [examRequestForm,   setExamRequestForm]   = useState({ jobRole:"", assessmentPattern:"", duration:"", specifications:"" });
  const [selectedReportIndex,          setSelectedReportIndex]          = useState(null);
  const [selectedDashboardReportIndex, setSelectedDashboardReportIndex] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({ totalStudents:0, qualified:0, notQualified:0, byExamType:{} });

  /* ── Styles helper ── */
  const s = styles(C);

  /* ── Decision helpers ── */
  const decisionColor = d => d==="Hire"?C.green:d==="Reject"?C.red:C.orange;
  const decisionBg    = d => d==="Hire"?C.greenBg:d==="Reject"?C.redBg:C.orangeBg;

  /* ── Fetch from backend ── */
  useEffect(() => {
    axios.get(`${API}/reports/all`)
      .then(res => {
        const data = res.data;
        const shortlisted  = data.filter(r => (r.total_score || 0) >= 70).length;
        const aiEvaluated  = data.filter(r => r.decision).length;
        setBackendStats({ total:data.length, shortlisted, pending:data.length - shortlisted, aiEvaluated });
        setRecentFromAPI(data.slice(0, 5));
        setBackendLoading(false);
      })
      .catch(() => setBackendLoading(false));
  }, []);

  /* ── Seed local analysis reports ── */
  useEffect(() => {
    setAnalysisReports([
      { id:1, studentName:"Raj Kumar",    email:"raj@example.com",    examType:EXAM_TYPES.SKILL_CERTIFICATE, marks:85, totalMarks:100, percentage:85, status:"Completed" },
      { id:2, studentName:"Priya Singh",  email:"priya@example.com",  examType:EXAM_TYPES.PLACEMENT,        marks:78, totalMarks:100, percentage:78, status:"Completed" },
      { id:3, studentName:"Amit Patel",   email:"amit@example.com",   examType:EXAM_TYPES.PLACEMENT,        marks:92, totalMarks:100, percentage:92, status:"Completed" },
      { id:4, studentName:"Anjali Verma", email:"anjali@example.com", examType:EXAM_TYPES.SKILL_CERTIFICATE,marks:65, totalMarks:100, percentage:65, status:"Completed" },
      { id:5, studentName:"Vikram Singh", email:"vikram@example.com", examType:EXAM_TYPES.SKILL_CERTIFICATE,marks:88, totalMarks:100, percentage:88, status:"Completed" },
      { id:6, studentName:"Neha Gupta",   email:"neha@example.com",   examType:EXAM_TYPES.PLACEMENT,        marks:75, totalMarks:100, percentage:75, status:"Completed" },
    ]);
  }, []);

  /* ── Derive filtered students & dashboard stats ── */
  useEffect(() => {
    let filtered = analysisReports;
    if (selectedExamType !== "ALL") filtered = filtered.filter(r => r.examType === selectedExamType);
    const qualified    = filtered.filter(r => r.percentage >= selectedCriteria);
    const notQualified = filtered.filter(r => r.percentage <  selectedCriteria);
    setFilteredStudents({ qualified, notQualified });
    const byExamType = {};
    Object.values(EXAM_TYPES).forEach(type => {
      const t = analysisReports.filter(r => r.examType === type);
      byExamType[type] = { total:t.length, qualified:t.filter(r=>r.percentage>=selectedCriteria).length, avg:t.length>0?(t.reduce((s,r)=>s+r.percentage,0)/t.length).toFixed(2):0 };
    });
    setDashboardStats({ totalStudents:analysisReports.length, qualified:qualified.length, notQualified:notQualified.length, byExamType });
  }, [analysisReports, selectedCriteria, selectedExamType]);

  const openAI = () => { setAiOpen(true); setAiUnread(false); };
  const handleMenuClick = (id) => { if (id==="ai-analyst") { openAI(); return; } setActiveMenu(id); };

  return (
    <RecruiterLayout>
      <div style={s.mainContainer}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          * { box-sizing:border-box; }
          body { background:${C.bg}; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          .rec-nav-item:hover     { background:${C.primaryLight} !important; color:${C.primary} !important; }
          .rec-nav-active         { background:${C.primaryLight} !important; color:${C.primary} !important; border-left:3px solid ${C.primary} !important; }
          .rec-nav-ai:hover       { background:${C.aiLight} !important; color:${C.aiAccent} !important; }
          .rec-nav-ai-active      { background:${C.aiLight} !important; color:${C.aiAccent} !important; border-left:3px solid ${C.aiAccent} !important; }
          .rec-tr:hover           { background:${C.lightCyan} !important; }
          .rec-criteria-btn:hover { background:${C.primaryLight}; color:${C.primary}; border-color:${C.primary}; }
          .rec-stat-card:hover    { box-shadow:0 6px 18px rgba(43,177,168,0.15) !important; }
          .r-btn-ghost:hover      { background:${C.primaryLight} !important; }
          .r-btn-outline:hover    { opacity:0.85; }
          .r-row:hover            { background:${C.lightCyan} !important; }
          @keyframes aiNavPulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        {/* ── Sidebar ── */}
        <div style={{ ...s.sidebar, transform:sidebarOpen?"translateX(0)":"translateX(-100%)" }}>
          <div style={s.sidebarHeader}>
            <div style={s.logo}>
              <div style={s.logoBadge}>NA</div>
              <div style={s.logoText}><h3 style={s.logoTitle}>NeuroAssess</h3><p style={s.logoSubtitle}>Recruiter Portal</p></div>
            </div>
          </div>
          <nav style={s.sidebarNav}>
            <p style={s.navSectionTitle}>MAIN</p>
            {SIDEBAR_MENU.map(item => {
              const isAI     = item.id === "ai-analyst";
              const isActive = activeMenu === item.id;
              return (
                <button key={item.id}
                  className={isAI?`rec-nav-item rec-nav-ai${aiOpen?" rec-nav-ai-active":""}`:`rec-nav-item${isActive?" rec-nav-active":""}`}
                  style={{ ...s.navItem, ...(isAI?{ borderTop:`1px solid ${C.border}`, marginTop:8, paddingTop:14 }:{}) }}
                  onClick={() => handleMenuClick(item.id)}>
                  <span style={s.navIcon}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {isAI && aiUnread && <span style={{ width:7, height:7, borderRadius:"50%", background:C.aiAccent, display:"inline-block", animation:"aiNavPulse 1.5s infinite" }}/>}
                </button>
              );
            })}
          </nav>
          <div style={s.sidebarFooter}>
            <button style={s.logoutButton} onClick={() => navigate("/")}>🚪 Logout</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={s.contentWrapper}>
          <header style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <div>
                <h1 style={s.pageTitle}>
                  {activeMenu==="dashboard"     && "Dashboard"}
                  {activeMenu==="candidates"    && "Candidates"}
                  {activeMenu==="reports"       && "Reports"}
                  {activeMenu==="exam-requests" && "Exam Requests"}
                </h1>
                <p style={s.pageSubtitle}>Overview of your ongoing recruitment drives and candidates</p>
              </div>
            </div>
            <div style={s.headerRight}>
              <button onClick={openAI}
                style={{ padding:"7px 14px", borderRadius:8, background:aiOpen?C.aiLight:C.lightCyan, border:`1px solid ${aiOpen?C.aiAccent+"55":C.border}`, color:aiOpen?C.aiAccent:C.muted, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}>
                🤖 <span>AI Analyst</span>
                {aiUnread && <span style={{ width:7, height:7, borderRadius:"50%", background:C.aiAccent, animation:"aiNavPulse 1.5s infinite" }}/>}
              </button>
              <div style={s.welcomeText}>Welcome, Jane Doe</div>
              <div style={s.avatarCircle}>JD</div>
            </div>
          </header>

          <div style={s.content}>

            {/* ══════════ DASHBOARD ══════════ */}
            {activeMenu==="dashboard" && (
              <>
                {selectedDashboardReportIndex !== null ? (
                  <DetailedReport 
                    report={DETAILED_REPORTS[selectedDashboardReportIndex]} 
                    onBack={()=>setSelectedDashboardReportIndex(null)}
                    decisionColor={decisionColor}
                    decisionBg={decisionBg}
                    styles={s}
                  />
                ) : (
                  <>
                    {/* StatCards from backend */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
                      <StatCard label="Total Assessed"  value={backendStats.total}        color={C.accent} delay={0}    iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <StatCard label="Shortlisted"     value={backendStats.shortlisted}  color={C.green}  delay={0.05} iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      <StatCard label="Under Review"    value={backendStats.pending}      color={C.orange} delay={0.1}  iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      <StatCard label="AI Evaluated"    value={backendStats.aiEvaluated}  color={C.purple} delay={0.15} iconPath="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </div>

                    {/* Filters */}
                    <div style={s.filterSection}>
                      <div style={s.filterCard}>
                        <label style={s.label}>Qualification Criteria</label>
                        <div style={s.criteriaButtons}>
                          {[70,75,80].map(c=>(
                            <button key={c} className="rec-criteria-btn"
                              style={{ ...s.criteriaBtn, backgroundColor:selectedCriteria===c?C.primary:C.lightCyan, color:selectedCriteria===c?"#fff":C.text, borderColor:selectedCriteria===c?C.primary:C.border }}
                              onClick={()=>setSelectedCriteria(c)}>{c}%</button>
                          ))}
                        </div>
                      </div>
                      <div style={s.filterCard}>
                        <label style={s.label}>Filter by Exam Type</label>
                        <select style={s.select} value={selectedExamType} onChange={e=>setSelectedExamType(e.target.value)}>
                          <option value="ALL">All Exams</option>
                          {Object.values(EXAM_TYPES).map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Local stat cards */}
                    <div style={s.statsGrid}>
                      {[
                        { label:"Total Assessed",         value:dashboardStats.totalStudents, color:C.primary, borderColor:C.primary, icon:"📊" },
                        { label:"Shortlisted Candidates", value:dashboardStats.qualified,     color:C.success, borderColor:C.success, icon:"✓"  },
                        { label:"Pending Interviews",     value:dashboardStats.notQualified,  color:C.warning, borderColor:C.warning, icon:"⏱️" },
                      ].map((stat,i)=>(
                        <div key={i} className="rec-stat-card" style={{ ...s.statCard, borderLeftColor:stat.borderColor }}>
                          <div style={s.statCardContent}><p style={s.statLabel}>{stat.label}</p><h2 style={{ ...s.statValue, color:stat.color }}>{stat.value}</h2></div>
                          <div style={s.statIcon}>{stat.icon}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI banner */}
                    <div onClick={openAI} style={{ marginBottom:24, padding:"14px 20px", background:`linear-gradient(135deg,${C.aiLight},#f0f9ff)`, border:`1px solid ${C.aiAccent}33`, borderRadius:12, display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(99,102,241,0.12)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                      <span style={{ fontSize:28 }}>🤖</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:C.aiAccent }}>AI Analyst available</div>
                        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Upload student PDF reports or search candidates using natural language. Powered by Gemini.</div>
                      </div>
                      <span style={{ fontSize:18, color:C.aiAccent }}>→</span>
                    </div>

                    {/* Two-column: Recent Candidates (backend) + Quick Actions & Activity */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
                      {/* Recent Candidates from API */}
                      <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Recent Candidates</div>
                          <button onClick={() => setActiveMenu("candidates")} className="r-btn-ghost" style={{ fontSize:11, color:C.accent, background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:"4px 8px", borderRadius:6 }}>View all</button>
                        </div>
                        {backendLoading ? (
                          <div style={{ padding:32, textAlign:"center", color:C.dim, fontSize:13 }}>Loading...</div>
                        ) : (
                          <div>
                            {recentFromAPI.map((r,i) => (
                              <div key={i} className="r-row" style={{ padding:"12px 20px", borderBottom:i<recentFromAPI.length-1?`1px solid ${C.border}`:"none", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"background 0.15s" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:30, height:30, borderRadius:"50%", background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:C.accent, flexShrink:0 }}>
                                    {(r.name||r.student_id||"?")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{r.name||r.student_id}</div>
                                    <div style={{ fontSize:11, color:C.dim }}>{r.college||"—"}</div>
                                  </div>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{Math.round(r.total_score||0)}</span>
                                  {r.decision && (
                                    <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:decisionBg(r.decision), color:decisionColor(r.decision) }}>{r.decision}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {recentFromAPI.length===0 && (
                              <div style={{ padding:32, textAlign:"center", color:C.dim, fontSize:13 }}>No candidates yet</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions + Recent Activity */}
                      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                        <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:"16px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Quick Actions</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                            {[
                              { label:"View Candidates", menu:"candidates", color:C.accent,  d:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                              { label:"View Reports",    menu:"reports",    color:C.blue,    d:"M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                              { label:"Exam Requests",  menu:"exam-requests", color:C.purple, d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                              { label:"Export Data",    menu:"reports",    color:C.orange,  d:"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
                            ].map(({ label, menu, color, d }) => (
                              <button key={label} onClick={() => setActiveMenu(menu)} className="r-btn-outline"
                                style={{ padding:"10px 12px", background:color+"08", color, border:`1px solid ${color}25`, borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:7, transition:"all 0.15s" }}>
                                <Icon d={d} size={14} color={color} strokeWidth={2.2}/>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:"16px 20px", flex:1, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Recent Activity</div>
                          {[
                            { msg:"15 candidates completed the placement assessment.", time:"2 hours ago",  color:C.accent },
                            { msg:"Exam request for 'Backend Engineer' approved.",     time:"5 hours ago",  color:C.green  },
                            { msg:"Interview scheduled for shortlisted candidates.",   time:"1 day ago",    color:C.blue   },
                          ].map((a,i,arr) => (
                            <div key={i} style={{ display:"flex", gap:12, paddingBottom:12, marginBottom:12, borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                              <div style={{ width:7, height:7, borderRadius:"50%", background:a.color, marginTop:5, flexShrink:0 }}/>
                              <div>
                                <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{a.msg}</div>
                                <div style={{ fontSize:11, color:C.dim, marginTop:3 }}>{a.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Exam Type Stats */}
                    <div style={s.section}>
                      <h2 style={s.sectionTitle}>Statistics by Exam Type</h2>
                      <div style={s.examStatsGrid}>
                        {Object.entries(dashboardStats.byExamType).map(([type,stats],idx)=>(
                          <div key={type} style={s.examStatCard}>
                            <h4 style={s.examTypeTitle}>{type}</h4>
                            {[["Total",stats.total,C.text],["Qualified",stats.qualified,C.success],["Average",`${stats.avg}%`,C.primary]].map(([l,v,col],i)=>(
                              <div key={i} style={s.examStatDetail}><span style={{ color:C.muted }}>{l}</span><span style={{ fontWeight:700, color:col }}>{v}</span></div>
                            ))}
                            <button style={s.viewReportBtn} onClick={()=>setSelectedDashboardReportIndex(idx)}>View Detailed Report</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity (local) */}
                    <div style={s.section}>
                      <h2 style={s.sectionTitle}>Recent Activity</h2>
                      <div style={s.activityList}>
                        {[
                          { text:"Exam request 'Frontend Engineer' approved by Admin.", time:"2 hours ago" },
                          { text:"15 new candidates completed the 'Backend Node.js' assessment.", time:"5 hours ago" },
                          { text:"Interview scheduled with candidate Alex Johnson for tomorrow.", time:"1 day ago" },
                        ].map((a,idx)=>(
                          <div key={idx} style={{ ...s.activityItem, borderBottom:idx<2?`1px solid ${C.border}`:"none" }}>
                            <div style={{ ...s.activityDot, backgroundColor:C.primary }}/>
                            <div style={s.activityContent}><p style={s.activityText}>{a.text}</p><span style={s.activityTime}>{a.time}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══════════ CANDIDATES ══════════ */}
            {activeMenu==="candidates" && (
              <>
                <div style={s.filterSection}>
                  <div style={s.filterCard}>
                    <label style={s.label}>Qualification Criteria</label>
                    <div style={s.criteriaButtons}>
                      {[70,75,80].map(c=>(
                        <button key={c} className="rec-criteria-btn"
                          style={{ ...s.criteriaBtn, backgroundColor:selectedCriteria===c?C.primary:C.lightCyan, color:selectedCriteria===c?"#fff":C.text, borderColor:selectedCriteria===c?C.primary:C.border }}
                          onClick={()=>setSelectedCriteria(c)}>{c}%</button>
                      ))}
                    </div>
                  </div>
                  <div style={s.filterCard}>
                    <label style={s.label}>Filter by Exam Type</label>
                    <select style={s.select} value={selectedExamType} onChange={e=>setSelectedExamType(e.target.value)}>
                      <option value="ALL">All Exams</option>
                      {Object.values(EXAM_TYPES).map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.statsGrid}>
                  {[
                    { label:"Total Candidates", value:dashboardStats.totalStudents, color:C.primary, borderColor:C.primary, icon:"👥" },
                    { label:"Shortlisted",      value:dashboardStats.qualified,     color:C.success, borderColor:C.success, icon:"⭐" },
                    { label:"Not Qualified",    value:dashboardStats.notQualified,  color:C.danger,  borderColor:C.danger,  icon:"⚠️" },
                  ].map((stat,i)=>(
                    <div key={i} className="rec-stat-card" style={{ ...s.statCard, borderLeftColor:stat.borderColor }}>
                      <div style={s.statCardContent}><p style={s.statLabel}>{stat.label}</p><h2 style={{ ...s.statValue, color:stat.color }}>{stat.value}</h2></div>
                      <div style={s.statIcon}>{stat.icon}</div>
                    </div>
                  ))}
                </div>
                <div style={s.section}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                    <h2 style={{ ...s.sectionTitle, margin:0, color:C.success }}>✓ Shortlisted Candidates (≥{selectedCriteria}%)</h2>
                    <button onClick={openAI} style={{ fontSize:12, padding:"7px 14px", borderRadius:8, background:C.aiLight, border:`1px solid ${C.aiAccent}44`, color:C.aiAccent, cursor:"pointer", fontWeight:600 }}>🤖 Analyse with AI</button>
                  </div>
                  {filteredStudents.qualified?.length > 0 ? (
                    <div style={s.tableWrapper}>
                      <table style={s.table}>
                        <thead><tr style={s.tableHeader}>{["Candidate Name","Email","Exam Type","Score","Percentage","Action"].map((h,i)=><th key={i} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {filteredStudents.qualified.map(student=>(
                            <tr key={student.id} className="rec-tr" style={s.tableRow}>
                              <td style={s.td}>{student.studentName}</td>
                              <td style={s.td}>{student.email}</td>
                              <td style={s.td}><span style={{ ...s.badge, background:C.primaryLight, color:C.primary }}>{student.examType}</span></td>
                              <td style={s.td}>{student.marks}/{student.totalMarks}</td>
                              <td style={s.td}><span style={{ ...s.percentBadge, backgroundColor:C.successLight, color:C.success }}>{student.percentage}%</span></td>
                              <td style={s.td}><button style={s.actionBtn} onClick={()=>{ setSelectedStudent(student); setShowGoogleForm(true); }}>Schedule Interview</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={s.noData}>No shortlisted candidates found</p>}
                </div>
                <div style={s.section}>
                  <h2 style={{ ...s.sectionTitle, color:C.warning }}>⚠️ Review Candidates (Less than {selectedCriteria}%)</h2>
                  {filteredStudents.notQualified?.length > 0 ? (
                    <div style={s.tableWrapper}>
                      <table style={s.table}>
                        <thead><tr style={s.tableHeader}>{["Candidate Name","Email","Exam Type","Score","Percentage","Action"].map((h,i)=><th key={i} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {filteredStudents.notQualified.map(student=>(
                            <tr key={student.id} className="rec-tr" style={s.tableRow}>
                              <td style={s.td}>{student.studentName}</td>
                              <td style={s.td}>{student.email}</td>
                              <td style={s.td}><span style={{ ...s.badge, background:C.primaryLight, color:C.primary }}>{student.examType}</span></td>
                              <td style={s.td}>{student.marks}/{student.totalMarks}</td>
                              <td style={s.td}><span style={{ ...s.percentBadge, backgroundColor:C.dangerLight, color:C.danger }}>{student.percentage}%</span></td>
                              <td style={s.td}><button style={{ ...s.actionBtn, backgroundColor:C.dangerLight, color:C.danger, border:`1px solid ${C.danger}44` }}>Request Retake</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={s.noData}>No review candidates found</p>}
                </div>
              </>
            )}

            {/* ══════════ REPORTS ══════════ */}
            {activeMenu==="reports" && (
              <>
                <div style={{ ...s.filterCard, marginBottom:30 }}>
                  <label style={s.label}>Filter by Exam Type</label>
                  <select style={s.select} value={selectedExamType} onChange={e=>setSelectedExamType(e.target.value)}>
                    <option value="ALL">All Exams</option>
                    {Object.values(EXAM_TYPES).map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={s.examStatsGrid}>
                  {Object.entries(dashboardStats.byExamType).map(([type,stats])=>(
                    <div key={type} style={s.examReportCard}>
                      <div style={{ ...s.examReportHeader, background:C.primaryLight }}>
                        <h4 style={{ ...s.examReportTitle, color:C.primary }}>{type}</h4>
                        <span style={{ ...s.examReportBadge, background:C.primary, color:"#fff" }}>{stats.total} Candidates</span>
                      </div>
                      <div style={s.examReportContent}>
                        {[["Total Assessments",stats.total,C.text],["Pass Rate",`${stats.total>0?Math.round((stats.qualified/stats.total)*100):0}%`,C.success],["Average Score",`${stats.avg}%`,C.primary]].map(([label,val,col],i)=>(
                          <div key={i} style={s.examReportMetric}><span style={s.metricLabel}>{label}</span><span style={{ ...s.metricValue, color:col }}>{val}</span></div>
                        ))}
                        <button style={s.viewReportBtn}>View Detailed Report</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={s.section}>
                  <h2 style={s.sectionTitle}>Pending Exam Requests</h2>
                  <div style={s.requestsList}>
                    {[
                      { exam:"Frontend Engineer",   status:"Approved", date:"2 days ago", candidates:12 },
                      { exam:"Backend Node.js",      status:"Pending",  date:"3 days ago", candidates:8  },
                      { exam:"Full Stack Developer", status:"Approved", date:"1 week ago", candidates:15 },
                    ].map((req,idx)=>(
                      <div key={idx} style={s.requestCard}>
                        <div><h5 style={s.requestTitle}>{req.exam}</h5><span style={s.requestMeta}>{req.candidates} candidates | Requested {req.date}</span></div>
                        <span style={{ ...s.requestStatus, backgroundColor:req.status==="Approved"?C.successLight:C.warningLight, color:req.status==="Approved"?C.success:C.warning }}>{req.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={s.section}>
                  <h2 style={s.sectionTitle}>Detailed Exam Reports</h2>
                  {selectedReportIndex===null ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {REPORTS_DATA.map((report,idx)=>(
                        <div key={idx} style={s.examReportListItem}>
                          <div style={s.examReportListHeader}>
                            <div>
                              <h4 style={s.examReportListTitle}>{report.examName}</h4>
                              <p style={s.examReportListMeta}>{report.totalQuestions} Questions | {report.duration} | {report.difficulty}</p>
                            </div>
                            <div style={{ display:"flex", gap:20, textAlign:"right" }}>
                              <div><div style={{ fontSize:11, color:C.dim, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase" }}>Avg Score</div><div style={{ fontSize:20, fontWeight:700, color:C.primary }}>{report.avgScore}%</div></div>
                              <div><div style={{ fontSize:11, color:C.dim, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase" }}>Pass Rate</div><div style={{ fontSize:20, fontWeight:700, color:C.success }}>{report.passRate}%</div></div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:10 }}>
                            <button style={{ ...s.viewReportBtn, flex:1, marginTop:0 }} onClick={()=>setSelectedReportIndex(idx)}>View Detailed Report</button>
                            <button onClick={openAI} style={{ padding:10, background:C.aiLight, border:`1px solid ${C.aiAccent}44`, color:C.aiAccent, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>🤖 Ask AI</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DetailedReport 
                      report={REPORTS_DATA[selectedReportIndex]} 
                      onBack={()=>setSelectedReportIndex(null)}
                      decisionColor={decisionColor}
                      decisionBg={decisionBg}
                      styles={s}
                    />
                  )}
                </div>
                <div style={s.section}>
                  <h2 style={s.sectionTitle}>Detailed Exam Analytics</h2>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:20 }}>
                    {[
                      { label:"Highest Score",    value:"98%",     color:C.success, lightColor:C.successLight, description:"Outstanding Performance" },
                      { label:"Lowest Score",     value:"45%",     color:C.danger,  lightColor:C.dangerLight,  description:"Needs Support"           },
                      { label:"Average Duration", value:"45 mins", color:C.primary, lightColor:C.primaryLight, description:"Exam Completion Time"     },
                      { label:"Completion Rate",  value:"94%",     color:C.navy,    lightColor:"#d9eaf5",      description:"Test Completion"          },
                    ].map((stat,idx)=>(
                      <div key={idx} style={{ background:C.white, padding:24, borderRadius:12, border:`1px solid ${C.border}`, textAlign:"center" }}>
                        <div style={{ width:60, height:60, borderRadius:12, background:stat.lightColor, borderLeft:`4px solid ${stat.color}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                          <div style={{ width:12, height:12, borderRadius:"50%", backgroundColor:stat.color }}/>
                        </div>
                        <p style={{ margin:"0 0 8px 0", fontSize:12, fontWeight:600, color:C.dim, textTransform:"uppercase", letterSpacing:".5px" }}>{stat.label}</p>
                        <h3 style={{ margin:"0 0 6px 0", fontSize:32, fontWeight:700, color:stat.color }}>{stat.value}</h3>
                        <p style={{ margin:0, fontSize:12, color:C.dim, fontStyle:"italic" }}>{stat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ══════════ EXAM REQUESTS ══════════ */}
            {activeMenu==="exam-requests" && (
              <div style={s.examRequestsContainer}>
                <div style={s.examRequestsLeft}>
                  <h2 style={s.sectionTitle}>New Exam Request</h2>
                  <div style={{ marginTop:20 }}>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Target Job Role</label>
                      <input type="text" placeholder="e.g., Senior Full Stack Engineer" style={s.formInput} value={examRequestForm.jobRole} onChange={e=>setExamRequestForm({...examRequestForm,jobRole:e.target.value})}/>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Assessment Pattern</label>
                      <select style={s.formInput} value={examRequestForm.assessmentPattern} onChange={e=>setExamRequestForm({...examRequestForm,assessmentPattern:e.target.value})}>
                        <option value="">Select modules</option>
                        <option value="technical">Technical Skills</option>
                        <option value="behavioral">Behavioral Assessment</option>
                        <option value="aptitude">Aptitude Test</option>
                        <option value="combined">Combined Assessment</option>
                      </select>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Total Duration (minutes)</label>
                      <input type="number" placeholder="e.g., 120" style={s.formInput} value={examRequestForm.duration} onChange={e=>setExamRequestForm({...examRequestForm,duration:e.target.value})}/>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Additional Specifications</label>
                      <textarea placeholder="e.g., Require strict proctoring…" style={{ ...s.formInput, minHeight:100, fontFamily:"inherit" }} value={examRequestForm.specifications} onChange={e=>setExamRequestForm({...examRequestForm,specifications:e.target.value})}/>
                    </div>
                    <button style={s.submitBtn}>📝 Submit Request</button>
                  </div>
                </div>
                <div style={s.examRequestsRight}>
                  <h2 style={s.sectionTitle}>Recent Requests History</h2>
                  <div style={{ marginTop:20, overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ backgroundColor:C.lightCyan, borderBottom:`2px solid ${C.border}` }}>
                          {["Request ID","Job Role","Exam Pattern","Duration (mins)","Date Requested","Status"].map((h,i)=>(
                            <th key={i} style={{ padding:12, textAlign:"left", fontWeight:600, color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id:"REQ-001", role:"Frontend Developer",  pattern:"Aptitude + Coding",    duration:90,  date:"2023-10-12", status:"APPROVED" },
                          { id:"REQ-002", role:"Data Scientist",       pattern:"Python + Statistics",  duration:120, date:"2023-10-14", status:"PENDING"  },
                          { id:"REQ-003", role:"DevOps Engineer",      pattern:"Cloud Infrastructure", duration:100, date:"2023-10-15", status:"APPROVED" },
                        ].map((req,idx)=>(
                          <tr key={idx} className="rec-tr" style={{ borderBottom:`1px solid ${C.border}` }}>
                            {[req.id,req.role,req.pattern,req.duration,req.date].map((v,i)=><td key={i} style={{ ...s.td, fontSize:12 }}>{v}</td>)}
                            <td style={{ ...s.td, fontSize:12 }}>
                              <span style={{ padding:"4px 12px", borderRadius:6, fontSize:11, fontWeight:600, display:"inline-block", backgroundColor:req.status==="APPROVED"?C.successLight:C.warningLight, color:req.status==="APPROVED"?C.success:C.warning }}>{req.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ INTERVIEW MODAL ══════════ */}
            {showGoogleForm && selectedStudent && (
              <div style={s.modalOverlay} onClick={()=>setShowGoogleForm(false)}>
                <div style={s.modalContent} onClick={e=>e.stopPropagation()}>
                  <div style={s.modalHeader}>
                    <h2 style={s.modalTitle}>Schedule Interview — {selectedStudent.studentName}</h2>
                    <button style={s.closeBtn} onClick={()=>setShowGoogleForm(false)}>✕</button>
                  </div>
                  <div style={s.modalBody}>
                    <div style={{ background:C.lightCyan, padding:16, borderRadius:8, marginBottom:24, border:`1px solid ${C.border}` }}>
                      <h4 style={{ margin:"0 0 12px 0", fontSize:13, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Candidate Details</h4>
                      {[["Name",selectedStudent.studentName],["Email",selectedStudent.email],["Score",`${selectedStudent.percentage}%`],["Exam Type",selectedStudent.examType]].map(([label,val],i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", paddingBottom:8, marginBottom:8, borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                          <span style={{ fontWeight:600, color:C.muted }}>{label}:</span>
                          <span style={{ color:C.text }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 style={{ margin:"0 0 8px 0", fontSize:14, fontWeight:700, color:C.text }}>Interview Scheduling Form</h4>
                      <p style={{ margin:"0 0 16px 0", fontSize:12, color:C.dim }}>Fill in the details to schedule the interview</p>
                      <div style={{ marginBottom:20 }}>
                        {[{ label:"Interview Date",type:"date" },{ label:"Interview Time",type:"time" }].map(({label,type})=>(
                          <div key={type} style={s.formGroup}><label style={s.formLabel}>{label}</label><input type={type} style={s.formInput}/></div>
                        ))}
                        <div style={s.formGroup}>
                          <label style={s.formLabel}>Interview Type</label>
                          <select style={s.formInput}><option>Technical Round</option><option>HR Round</option><option>Final Round</option></select>
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.formLabel}>Interviewer Email</label>
                          <input type="email" placeholder="interviewer@company.com" style={s.formInput}/>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:12, marginTop:20 }}>
                        <button style={{ flex:1, padding:12, background:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }} onClick={()=>window.open("https://forms.google.com/","_blank")}>📝 Open Google Form</button>
                        <button style={{ flex:1, padding:12, background:C.lightCyan, color:C.text, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }} onClick={()=>setShowGoogleForm(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>{/* end s.content */}
        </div>{/* end contentWrapper */}
      </div>{/* end mainContainer */}

      {/* ── AI Drawer ── */}
      <AIChatDrawer open={aiOpen} onClose={()=>setAiOpen(false)}/>

      {/* ── Floating bubble ── */}
      {!aiOpen && <AIBubble onClick={openAI} hasUnread={aiUnread}/>}
    </RecruiterLayout>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = (C) => ({
  mainContainer:        { display:"flex", minHeight:"100vh", backgroundColor:C.bg, fontFamily:"'DM Sans',-apple-system,sans-serif" },
  sidebar:              { width:280, backgroundColor:C.sidebar, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0, transition:"transform 0.3s ease", zIndex:1000 },
  sidebarHeader:        { padding:"24px 20px", borderBottom:`1px solid ${C.border}` },
  logo:                 { display:"flex", alignItems:"center", gap:12 },
  logoBadge:            { width:40, height:40, borderRadius:8, backgroundColor:C.primary, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 },
  logoText:             { flex:1 },
  logoTitle:            { margin:0, fontSize:16, fontWeight:700, color:C.text },
  logoSubtitle:         { margin:"2px 0 0 0", fontSize:12, color:C.dim },
  sidebarNav:           { flex:1, padding:"20px 0", overflow:"auto" },
  navSectionTitle:      { margin:"0 20px 12px 20px", fontSize:11, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.5px" },
  navItem:              { width:"100%", padding:"12px 20px", border:"none", backgroundColor:"transparent", color:C.muted, fontSize:14, fontWeight:500, textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.2s ease", borderLeft:"3px solid transparent" },
  navIcon:              { fontSize:18 },
  sidebarFooter:        { padding:20, borderTop:`1px solid ${C.border}` },
  logoutButton:         { width:"100%", padding:12, backgroundColor:C.dangerLight, color:C.danger, border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:14 },
  contentWrapper:       { flex:1, display:"flex", flexDirection:"column", overflow:"auto" },
  header:               { padding:"20px 40px", backgroundColor:C.white, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerLeft:           { display:"flex", alignItems:"center", gap:20 },
  menuToggle:           { backgroundColor:C.lightCyan, border:`1px solid ${C.border}`, padding:"8px 12px", borderRadius:6, cursor:"pointer", fontSize:20, color:C.primary },
  pageTitle:            { margin:0, fontSize:24, fontWeight:700, color:C.text },
  pageSubtitle:         { margin:"4px 0 0 0", fontSize:13, color:C.muted },
  headerRight:          { display:"flex", alignItems:"center", gap:12 },
  welcomeText:          { fontSize:14, color:C.muted, fontWeight:500 },
  avatarCircle:         { width:36, height:36, borderRadius:"50%", background:C.primary, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 },
  content:              { padding:"32px 40px", flex:1 },
  filterSection:        { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20, marginBottom:32 },
  filterCard:           { backgroundColor:C.white, padding:20, borderRadius:12, border:`1px solid ${C.border}`, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  label:                { display:"block", marginBottom:12, fontSize:13, fontWeight:600, color:C.text },
  criteriaButtons:      { display:"flex", gap:10 },
  criteriaBtn:          { flex:1, padding:10, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14, transition:"all 0.2s ease" },
  select:               { width:"100%", padding:10, backgroundColor:C.white, color:C.text, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:14, fontFamily:"inherit" },
  statsGrid:            { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:20, marginBottom:32 },
  statCard:             { backgroundColor:C.white, padding:24, borderRadius:12, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.primary}`, display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:`0 1px 3px rgba(43,177,168,0.06)`, transition:"box-shadow 0.2s ease" },
  statCardContent:      { flex:1 },
  statLabel:            { margin:"0 0 8px 0", fontSize:13, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px" },
  statValue:            { margin:0, fontSize:32, fontWeight:700 },
  statIcon:             { fontSize:32, marginLeft:16 },
  section:              { marginBottom:32 },
  sectionTitle:         { margin:"0 0 20px 0", fontSize:18, fontWeight:700, color:C.text },
  examStatsGrid:        { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:20, marginBottom:20 },
  examStatCard:         { backgroundColor:C.white, padding:20, borderRadius:12, border:`1px solid ${C.border}`, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  examTypeTitle:        { margin:"0 0 15px 0", fontSize:14, fontWeight:700, color:C.text },
  examStatDetail:       { display:"flex", justifyContent:"space-between", paddingBottom:12, fontSize:13, borderBottom:`1px solid ${C.border}`, marginBottom:12 },
  tableWrapper:         { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflowX:"auto", boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  table:                { width:"100%", borderCollapse:"collapse", fontSize:14 },
  tableHeader:          { backgroundColor:C.lightCyan, borderBottom:`2px solid ${C.border}` },
  th:                   { padding:16, textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, textTransform:"uppercase", letterSpacing:"0.5px" },
  tableRow:             { borderBottom:`1px solid ${C.border}`, transition:"background-color 0.2s" },
  td:                   { padding:16, color:C.text },
  badge:                { padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:600, display:"inline-block" },
  percentBadge:         { padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:700, display:"inline-block" },
  noData:               { padding:30, textAlign:"center", color:C.dim, fontSize:14, backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}` },
  actionBtn:            { padding:"6px 16px", backgroundColor:C.primary, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 },
  activityList:         { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:20, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  activityItem:         { display:"flex", gap:16, paddingBottom:16, marginBottom:16 },
  activityDot:          { width:8, height:8, borderRadius:"50%", marginTop:6, flexShrink:0 },
  activityContent:      { flex:1 },
  activityText:         { margin:"0 0 4px 0", fontSize:14, color:C.text, fontWeight:500 },
  activityTime:         { fontSize:12, color:C.dim },
  examReportCard:       { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  examReportHeader:     { padding:"16px 20px", backgroundColor:C.lightCyan, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" },
  examReportTitle:      { margin:0, fontSize:14, fontWeight:700, color:C.text },
  examReportBadge:      { padding:"4px 12px", borderRadius:12, fontSize:12, fontWeight:600 },
  examReportContent:    { padding:20 },
  examReportMetric:     { display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:16, borderBottom:`1px solid ${C.border}`, marginBottom:16 },
  metricLabel:          { fontSize:13, color:C.muted, fontWeight:500 },
  metricValue:          { fontSize:20, fontWeight:700 },
  viewReportBtn:        { width:"100%", padding:10, backgroundColor:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, marginTop:16 },
  requestsList:         { display:"flex", flexDirection:"column", gap:12 },
  requestCard:          { backgroundColor:C.white, padding:"16px 20px", borderRadius:8, border:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" },
  requestTitle:         { margin:"0 0 6px 0", fontSize:14, fontWeight:700, color:C.text },
  requestMeta:          { fontSize:12, color:C.dim },
  requestStatus:        { padding:"6px 14px", borderRadius:12, fontSize:12, fontWeight:600, display:"inline-block" },
  examReportListItem:   { backgroundColor:C.white, padding:20, borderRadius:12, border:`1px solid ${C.border}`, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  examReportListHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  examReportListTitle:  { margin:"0 0 6px 0", fontSize:16, fontWeight:700, color:C.text },
  examReportListMeta:   { margin:0, fontSize:12, color:C.dim },
  detailedReportCard:   { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:`0 4px 6px rgba(43,177,168,0.08)` },
  reportHeader:         { padding:20, backgroundColor:C.lightCyan, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" },
  reportTitle:          { margin:"0 0 6px 0", fontSize:16, fontWeight:700, color:C.text },
  reportMeta:           { margin:0, fontSize:12, color:C.dim },
  reportStats:          { display:"flex", gap:20, textAlign:"right" },
  reportStat:           { display:"flex", flexDirection:"column", alignItems:"flex-end" },
  reportStatLabel:      { fontSize:11, color:C.dim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" },
  reportStatValue:      { fontSize:24, fontWeight:700, color:C.primary, marginTop:4 },
  reportBody:           { padding:20 },
  reportSection:        { marginBottom:20, paddingBottom:20, borderBottom:`1px solid ${C.border}` },
  reportSectionTitle:   { margin:"0 0 12px 0", fontSize:13, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px" },
  topicsList:           { display:"flex", gap:8, flexWrap:"wrap" },
  topicTag:             { backgroundColor:C.primaryLight, color:C.primary, padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:600 },
  breakdownItem:        { marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.lightCyan}` },
  breakdownLabel:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
  breakdownTopic:       { fontSize:13, fontWeight:600, color:C.text },
  breakdownScore:       { fontSize:12, color:C.dim },
  progressBar:          { width:"100%", height:6, backgroundColor:C.border, borderRadius:3, overflow:"hidden", marginBottom:4 },
  progressFill:         { height:"100%", transition:"width 0.3s ease" },
  percentageText:       { fontSize:11, color:C.dim, fontWeight:600 },
  performersList:       { margin:0, padding:"0 0 0 20px", listStyle:"none" },
  performerItem:        { fontSize:13, color:C.text, marginBottom:8, fontWeight:500 },
  mistakesList:         { margin:0, padding:"0 0 0 20px", listStyle:"none" },
  mistakeItem:          { fontSize:13, color:C.text, marginBottom:8, fontWeight:500 },
  quickStatsRow:        { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  quickStat:            { display:"flex", flexDirection:"column" },
  quickStatLabel:       { fontSize:11, color:C.dim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" },
  quickStatValue:       { fontSize:16, fontWeight:700, color:C.text, marginTop:4 },
  reportFooter:         { padding:"16px 20px", backgroundColor:C.lightCyan, borderTop:`1px solid ${C.border}`, display:"flex", gap:12 },
  reportBtn:            { flex:1, padding:"10px 16px", backgroundColor:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600 },
  backBtn:              { padding:"10px 16px", backgroundColor:C.lightCyan, color:C.text, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:24 },
  examRequestsContainer:{ display:"grid", gridTemplateColumns:"1fr 1.2fr", gap:30 },
  examRequestsLeft:     { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:24, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  examRequestsRight:    { backgroundColor:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:24, boxShadow:`0 1px 3px rgba(43,177,168,0.06)` },
  formGroup:            { marginBottom:16 },
  formLabel:            { display:"block", marginBottom:8, fontSize:13, fontWeight:600, color:C.text },
  formInput:            { width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.text, boxSizing:"border-box", outline:"none" },
  submitBtn:            { width:"100%", padding:12, backgroundColor:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600, marginTop:20 },
  modalOverlay:         { position:"fixed", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(10,42,65,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000 },
  modalContent:         { backgroundColor:C.white, borderRadius:12, maxWidth:600, width:"90%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 10px 40px rgba(10,42,65,0.2)" },
  modalHeader:          { padding:24, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", backgroundColor:C.lightCyan },
  modalTitle:           { margin:0, fontSize:18, fontWeight:700, color:C.text },
  closeBtn:             { backgroundColor:"transparent", border:"none", fontSize:24, cursor:"pointer", color:C.muted, padding:0, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" },
  modalBody:            { padding:24 },
});

export default RecruiterDashboard;