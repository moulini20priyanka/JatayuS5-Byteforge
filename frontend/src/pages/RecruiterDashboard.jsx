// RecruiterDashboard.jsx — Fixed: auth token on all axios calls, correct reports/all endpoint
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ── FIX: Token helper ─────────────────────────────────────────────────────────
const getToken = () =>
  localStorage.getItem('recruiter_token') ||
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('token') || '';

// ── FIX: Authenticated axios instance ────────────────────────────────────────
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AI_TOOLS = [
  { name: "search_candidates", description: "Search and filter candidates from NeuroAssess database by skills, score range, hiring tag, exam type, or any criteria.", input_schema: { type: "object", properties: { skills: { type: "array", items: { type: "string" } }, minScore: { type: "number" }, hiringTags: { type: "array", items: { type: "string" } }, examType: { type: "string" }, topN: { type: "number" }, sortBy: { type: "string" } }, required: [] } },
  { name: "shortlist_for_role", description: "Shortlist best-fit candidates for a specific job role.", input_schema: { type: "object", properties: { role: { type: "string" }, requiredSkills: { type: "array", items: { type: "string" } }, topN: { type: "number" }, minScore: { type: "number" } }, required: ["role"] } },
  { name: "compare_candidates", description: "Compare two or more candidates head-to-head on all metrics.", input_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] } },
  { name: "get_statistics", description: "Get aggregate statistics about the full candidate pool.", input_schema: { type: "object", properties: {}, required: [] } },
];

function runTool(name, input, liveData) {
  const pool = liveData || [];
  switch (name) {
    case "search_candidates": {
      let r = [...pool];
      if (input.skills?.length) r = r.filter(s => input.skills.some(sk => (s.skills || s.tech_skills || []).some(ss => ss.toLowerCase().includes(sk.toLowerCase()))));
      if (input.minScore) r = r.filter(s => (s.totalScore || s.total_score || 0) >= input.minScore);
      if (input.hiringTags?.length) r = r.filter(s => input.hiringTags.includes(s.hiringTag || s.decision));
      if (input.examType) r = r.filter(s => (s.examType || s.exam_type) === input.examType);
      r.sort((a, b) => (b[input.sortBy || "totalScore"] || b.total_score || 0) - (a[input.sortBy || "totalScore"] || a.total_score || 0));
      if (input.topN) r = r.slice(0, input.topN);
      return { count: r.length, candidates: r };
    }
    case "shortlist_for_role": {
      const roleMap = { backend: ["Java","Spring Boot","Node.js","Python","Docker","SQL"], frontend: ["React","JavaScript","TypeScript","CSS","HTML"], fullstack: ["React","Node.js","JavaScript","MongoDB","SQL"], "data scientist": ["Python","ML","TensorFlow","SQL"], ml: ["Python","TensorFlow","ML","SQL"], devops: ["Docker","Kubernetes","CI/CD","AWS"] };
      const key = Object.keys(roleMap).find(k => input.role.toLowerCase().includes(k)) || "backend";
      const req = input.requiredSkills?.length ? input.requiredSkills : roleMap[key];
      const r = pool.filter(s => (s.totalScore || s.total_score || 0) >= (input.minScore || 0)).map(s => { const skills = s.skills || s.tech_skills || []; return { ...s, matchScore: skills.filter(sk => req.some(rr => sk.toLowerCase().includes(rr.toLowerCase()))).length }; }).filter(s => s.matchScore > 0).sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : (b.totalScore || b.total_score || 0) - (a.totalScore || a.total_score || 0)).slice(0, input.topN || 3);
      return { role: input.role, shortlisted: r };
    }
    case "compare_candidates": {
      return { comparison: pool.filter(s => (input.names || []).some(n => (s.name || s.student_id || "").toLowerCase().includes(n.toLowerCase()))) };
    }
    case "get_statistics": {
      if (!pool.length) return { total: 0, message: "No candidates in database yet." };
      const avg = key => Math.round(pool.reduce((a, s) => a + (s[key] || 0), 0) / pool.length);
      const tags = pool.reduce((a, s) => { const t = s.hiringTag || s.decision || "Unknown"; a[t] = (a[t] || 0) + 1; return a; }, {});
      const skills = pool.flatMap(s => s.skills || s.tech_skills || []).reduce((a, sk) => { a[sk] = (a[sk] || 0) + 1; return a; }, {});
      return { total: pool.length, avgScore: avg("total_score") || avg("totalScore"), hiringDistribution: tags, topSkills: Object.fromEntries(Object.entries(skills).sort((a, b) => b[1] - a[1]).slice(0, 6)) };
    }
    default: return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are the NeuroAssess AI Analyst — expert agentic recruiter assistant. Help recruiters search candidates, analyse PDF reports, shortlist for roles, compare candidates. Always use tools for database questions. Be concise. Use **bold** for names/scores. Use markdown.`;

function StatCard({ label, value, sub, color, iconPath, delay = 0 }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: `fadeUp 0.35s ease ${delay}s both` }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon d={iconPath} size={17} color={color} strokeWidth={2} />
      </div>
    </div>
  );
}

function AIChatDrawer({ open, onClose, liveData }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: { text: `**NeuroAssess AI Analyst** ready.\n\nConnected to **${liveData?.length || 0} candidates**.\n\nUpload a student PDF or ask me anything.`, candidates: [] } }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (liveData?.length > 0) {
      setMessages(prev => {
        const first = prev[0];
        if (first?.role === "assistant") return [{ ...first, content: { ...first.content, text: `**NeuroAssess AI Analyst** ready.\n\nConnected to **${liveData.length} live candidates**.\n\nUpload a PDF or ask anything.` } }, ...prev.slice(1)];
        return prev;
      });
    }
  }, [liveData]);

  const readPDF = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: file.name, b64: r.result.split(",")[1] }); r.onerror = rej; r.readAsDataURL(file); });
  const handleFiles = async files => { const arr = Array.from(files).filter(f => f.type === "application/pdf"); if (!arr.length) return; setPdfs(async prev => [...prev, ...(await Promise.all(arr.map(readPDF)))]); };
  const removePdf = i => setPdfs(prev => prev.filter((_, j) => j !== i));

  const callAI = async (userText, attachedPdfs) => {
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`;
    const userParts = [...attachedPdfs.map(pdf => ({ inline_data: { mime_type: "application/pdf", data: pdf.b64 } })), { text: userText }];
    const history = messages.filter(m => m.content.text).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.text }] }));
    const toolDeclarations = { function_declarations: AI_TOOLS.map(t => ({ name: t.name, description: t.description, parameters: t.input_schema })) };
    const callGemini = async contents => { const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, tools: [toolDeclarations], contents }) }); if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`); return res.json(); };
    let contents = [...history, { role: "user", parts: userParts }];
    let data = await callGemini(contents);
    let toolResultRows = [];
    while (true) {
      const parts = data.candidates?.[0]?.content?.parts || [];
      const funcCalls = parts.filter(p => p.functionCall);
      if (!funcCalls.length) break;
      const toolResponseParts = [];
      for (const part of funcCalls) {
        const { name, args } = part.functionCall;
        const result = runTool(name, args || {}, liveData);
        const cands = result.candidates || result.shortlisted || result.comparison || [];
        if (cands.length) toolResultRows.push(...cands);
        toolResponseParts.push({ functionResponse: { name, response: { content: JSON.stringify(result) } } });
      }
      contents = [...contents, { role: "model", parts }, { role: "user", parts: toolResponseParts }];
      data = await callGemini(contents);
    }
    const finalParts = data.candidates?.[0]?.content?.parts || [];
    return { text: finalParts.filter(p => p.text).map(p => p.text).join("\n") || "Could not generate a response.", candidates: toolResultRows };
  };

  const send = async text => {
    const msg = (text || input).trim(); if (!msg || loading) return;
    setInput(""); const attachedPdfs = [...pdfs]; setPdfs([]);
    setMessages(prev => [...prev, { role: "user", content: { text: msg, pdfs: attachedPdfs.map(p => p.name), candidates: [] } }]);
    setLoading(true);
    try { const result = await callAI(msg, attachedPdfs); setMessages(prev => [...prev, { role: "assistant", content: result }]); }
    catch (e) { setMessages(prev => [...prev, { role: "assistant", content: { text: `Error: ${e.message}`, candidates: [] } }]); }
    setLoading(false);
  };
  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const Md = ({ text }) => {
    const lines = (text || "").split("\n");
    return (
      <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>
        {lines.map((ln, i) => {
          if (ln.startsWith("### ")) return <p key={i} style={{ margin: "8px 0 3px", fontWeight: 700, fontSize: 13, color: C.navy }}>{ln.slice(4)}</p>;
          if (ln.startsWith("## ")) return <p key={i} style={{ margin: "10px 0 4px", fontWeight: 700, fontSize: 14, color: C.navy }}>{ln.slice(3)}</p>;
          if (ln.startsWith("- ") || ln.startsWith("• ")) { const parts = ln.slice(2).split(/(\*\*[^*]+\*\*)/g); return (<div key={i} style={{ display: "flex", gap: 6, margin: "3px 0" }}><span style={{ color: C.accent, flexShrink: 0 }}>•</span><span>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}</span></div>); }
          if (ln.trim() === "") return <br key={i} />;
          const parts = ln.split(/(\*\*[^*]+\*\*)/g);
          return <p key={i} style={{ margin: "2px 0" }}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}</p>;
        })}
      </div>
    );
  };

  const suggestions = ["Top 3 candidates by score", "Show all Hire decisions", "Shortlist for backend engineer", "Batch statistics", "Who scored above 80?"];
  if (!open) return null;

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "clamp(320px,36vw,480px)", background: C.white, boxShadow: "-6px 0 32px rgba(10,42,65,0.14)", display: "flex", flexDirection: "column", zIndex: 3000, borderLeft: `1px solid ${C.border}`, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <style>{`@keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}`}</style>
      <div style={{ padding: "14px 16px", background: `linear-gradient(135deg,${C.accent},#1a8f88)`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>AI</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>AI Analyst</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", animation: "pulseDot 2s infinite" }} />
            Gemini 1.5 Flash · {liveData?.length || 0} candidates
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12, gap: 8, alignItems: "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},#1a8f88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2, color: "#fff" }}>AI</div>}
            <div style={{ maxWidth: m.role === "user" ? "75%" : "100%", flex: m.role === "assistant" ? 1 : "unset", background: m.role === "user" ? `linear-gradient(135deg,${C.accent},#1a8f88)` : C.accentLight, color: m.role === "user" ? "#fff" : C.text, padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", border: m.role === "assistant" ? `1px solid ${C.border}` : "none" }}>
              {m.content.pdfs?.length > 0 && <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>{m.content.pdfs.map((p, j) => <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>PDF: {p}</span>)}</div>}
              {m.role === "user" ? <span style={{ fontSize: 13, lineHeight: 1.6 }}>{m.content.text}</span> : <><Md text={m.content.text} />{m.content.candidates?.length > 0 && <div style={{ marginTop: 10 }}>{m.content.candidates.map((c, ci) => <div key={ci} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.name || c.student_id}</span><span style={{ fontWeight: 700, fontSize: 13, color: C.accent }}>{Math.round(c.totalScore || c.total_score || 0)}/100</span></div></div>)}</div>}</>}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},#1a8f88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>AI</div><div style={{ padding: "10px 14px", background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 3px", display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 11, color: C.muted, marginRight: 2 }}>Processing</span>{[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, display: "inline-block", animation: `pulseDot 1s ${j*0.18}s infinite` }} />)}</div></div>}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && <div style={{ padding: "10px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>{suggestions.map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, background: C.accentLight, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer" }}>{s}</button>)}</div>}
      {pdfs.length > 0 && <div style={{ padding: "8px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>{pdfs.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "4px 10px", borderRadius: 20, background: C.accentLight, border: `1px solid ${C.accent}55`, color: C.accent }}>PDF: {p.name.length > 20 ? p.name.slice(0,18)+"…" : p.name}<button onClick={() => removePdf(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, padding: 0, fontSize: 12 }}>×</button></div>)}</div>}
      {dragOver && <div style={{ margin: "8px 14px", padding: 16, border: `2px dashed ${C.accent}`, borderRadius: 10, textAlign: "center", background: C.accentLight, fontSize: 12, color: C.accent, fontWeight: 600 }}>Drop PDF report here</div>}
      <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button onClick={() => fileRef.current?.click()} title="Attach PDF" style={{ width: 36, height: 36, borderRadius: 9, background: C.accentLight, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" size={16} color={C.muted} strokeWidth={2} />
          </button>
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask anything… (Enter to send)" rows={1} style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.55, color: C.text, background: C.white }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          <button onClick={() => send()} disabled={loading || (!input.trim() && !pdfs.length)} title="Send message" style={{ width: 36, height: 36, borderRadius: 9, background: (input.trim() || pdfs.length) && !loading ? C.accent : "#cbd5e1", border: "none", color: "#fff", cursor: (input.trim() || pdfs.length) && !loading ? "pointer" : "not-allowed", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d="M5 12h14M12 5l7 7-7 7" size={18} color="#fff" strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: C.dim, textAlign: "center" }}>Powered by Gemini 1.5 Flash</div>
      </div>
    </div>
  );
}

function AIBubble({ onClick, hasUnread }) {
  return (
    <button onClick={onClick} title="Open AI Analyst" style={{ position: "fixed", bottom: 28, right: 28, width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},#1a8f88)`, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(43,177,168,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", zIndex: 2900, transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
      <style>{`@keyframes bubblePulse{0%{box-shadow:0 0 0 0 rgba(43,177,168,0.55)}70%{box-shadow:0 0 0 14px rgba(43,177,168,0)}100%{box-shadow:0 0 0 0 rgba(43,177,168,0)}}.ai-bubble-ring{position:absolute;inset:0;border-radius:50%;animation:bubblePulse 2.2s infinite;}`}</style>
      <span className="ai-bubble-ring" />AI
      {hasUnread && <span style={{ position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />}
    </button>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUnread, setAiUnread] = useState(true);
  const [allCandidates, setAllCandidates] = useState([]);
  const [backendStats, setBackendStats] = useState({ total: 0, shortlisted: 0, pending: 0, aiEvaluated: 0 });
  const [recentFromAPI, setRecentFromAPI] = useState([]);
  const [examTypeStats, setExamTypeStats] = useState({});
  const [backendLoading, setBackendLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCriteria, setSelectedCriteria] = useState(70);
  const [selectedExamType, setSelectedExamType] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchData = async () => {
    setBackendLoading(true); setError(null);
    try {
      // FIX: use apiClient (has auth token interceptor) instead of plain axios
      // Also try /reports/all first, fall back to /candidates if that doesn't exist
      let normalised = [];
      try {
        const res = await apiClient.get('/reports/all');
        normalised = (res.data || []).map(r => ({
          ...r,
          totalScore: r.total_score || 0,
          codingSkill: r.coding_skill || r.github_score || 0,
          problemSolving: r.problem_solving || r.leetcode_score || 0,
          consistency: r.consistency || 0,
          hiringTag: r.decision || "Unknown",
          examType: r.exam_type || "Placement",
          skills: r.tech_skills || [],
          college: r.college || "",
        }));
      } catch (reportsErr) {
        // FIX: if /reports/all doesn't exist or fails, fall back to candidates list
        console.warn('[RecruiterDashboard] /reports/all failed, trying /candidates:', reportsErr.message);
        const res = await apiClient.get('/candidates');
        const candidates = Array.isArray(res.data) ? res.data : (res.data?.candidates || []);
        normalised = candidates.map(c => ({
          ...c,
          totalScore: c.total_score || c.overall_score || 0,
          codingSkill: c.coding_score || c.github_score || 0,
          problemSolving: c.leetcode_score || 0,
          consistency: 0,
          hiringTag: c.decision || c.status || "Unknown",
          examType: c.exam_type || "Placement",
          skills: c.tech_skills || [],
          college: c.college || "",
        }));
      }

      setAllCandidates(normalised);
      setBackendStats({
        total: normalised.length,
        shortlisted: normalised.filter(r => r.totalScore >= 70).length,
        pending: normalised.filter(r => r.totalScore < 70).length,
        aiEvaluated: normalised.filter(r => r.decision).length,
      });
      setRecentFromAPI(normalised.slice(0, 5));

      const etStats = {};
      [...new Set(normalised.map(r => r.examType))].forEach(type => {
        const t = normalised.filter(r => r.examType === type);
        etStats[type] = {
          total: t.length,
          qualified: t.filter(r => r.totalScore >= 70).length,
          avg: t.length > 0 ? (t.reduce((s, r) => s + r.totalScore, 0) / t.length).toFixed(1) : 0,
        };
      });
      setExamTypeStats(etStats);

    } catch (err) {
      // FIX: give specific error messages instead of generic "Could not connect"
      if (err.response?.status === 401) {
        setError('Session expired — please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied — recruiter or admin role required.');
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        setError('Cannot connect to server at port 5000. Is the backend running?');
      } else {
        setError(`Error: ${err.response?.data?.error || err.message}`);
      }
    }
    setBackendLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCandidates = allCandidates.filter(c => selectedExamType === "ALL" || c.examType === selectedExamType);
  const qualified = filteredCandidates.filter(c => c.totalScore >= selectedCriteria);
  const notQualified = filteredCandidates.filter(c => c.totalScore < selectedCriteria);
  const examTypeOptions = ["ALL", ...Object.keys(examTypeStats)];
  const openAI = () => { setAiOpen(true); setAiUnread(false); };
  const decisionColor = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
  const decisionBg = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

  const headerActions = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={openAI} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 700 }}>AI</span> Analyst {aiUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, display: "inline-block" }} />}
      </button>
      <button onClick={() => fetchData()} title="Refresh data" style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={14} color={C.muted} strokeWidth={2} />
        Refresh
      </button>
    </div>
  );

  return (
    <RecruiterLayout
      title={activeTab === "dashboard" ? "Dashboard" : activeTab === "candidates" ? "Candidates" : "Reports"}
      subtitle={backendLoading ? "Loading live data…" : `${allCandidates.length} candidates · Live data`}
      actions={headerActions}
    >
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.r-row:hover{background:${C.accentLight}!important}.r-tr:hover{background:${C.accentLight}!important}.r-btn:hover{background:${C.accent}!important;color:#fff!important}`}</style>

      {error && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: C.orangeBg, border: `1px solid ${C.orange}44`, borderRadius: 8, fontSize: 13, color: C.orange, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={16} color={C.orange} strokeWidth={2} />
          {error}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {error.includes('log in') && (
              <button onClick={() => navigate('/login')} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.orange}`, background: "transparent", color: C.orange, cursor: "pointer", fontSize: 12 }}>Login</button>
            )}
            <button onClick={fetchData} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.orange}`, background: "transparent", color: C.orange, cursor: "pointer", fontSize: 12 }}>Retry</button>
          </div>
        </div>
      )}

      {/* ══ DASHBOARD ══ */}
      {activeTab === "dashboard" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Assessed" value={backendStats.total} color={C.accent} delay={0} iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            <StatCard label="Shortlisted" value={backendStats.shortlisted} color={C.green} delay={0.05} iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Under Review" value={backendStats.pending} color={C.orange} delay={0.1} iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="AI Evaluated" value={backendStats.aiEvaluated} color={C.purple} delay={0.15} iconPath="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </div>

          <div onClick={openAI} style={{ marginBottom: 24, padding: "14px 20px", background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 12, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: C.accent, width: 40, height: 40, borderRadius: 10, background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>AI</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, color: C.accent }}>AI Analyst — {allCandidates.length} live candidates loaded</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Search candidates by skill, score, or role. Upload student PDF reports. Powered by Gemini 1.5 Flash.</div></div>
            <Icon d="M9 5l7 7-7 7" size={18} color={C.accent} strokeWidth={2} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Recent Candidates</div>
                <button onClick={() => setActiveTab("candidates")} style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all</button>
              </div>
              {backendLoading ? <div style={{ padding: 32, textAlign: "center", color: C.dim, fontSize: 13 }}>Loading…</div> : (
                <div>
                  {recentFromAPI.map((r, i) => (
                    <div key={i} className="r-row" style={{ padding: "12px 20px", borderBottom: i < recentFromAPI.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{(r.name || r.student_id || "?")[0].toUpperCase()}</div>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name || r.student_id}</div><div style={{ fontSize: 11, color: C.dim }}>{r.college || r.examType || "—"}</div></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{Math.round(r.totalScore || 0)}</span>
                        {r.decision && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(r.decision), color: decisionColor(r.decision) }}>{r.decision}</span>}
                      </div>
                    </div>
                  ))}
                  {recentFromAPI.length === 0 && <div style={{ padding: 32, textAlign: "center", color: C.dim, fontSize: 13 }}>No candidates yet</div>}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Candidates", action: () => setActiveTab("candidates"), color: C.accent, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                    { label: "Reports", action: () => setActiveTab("reports"), color: C.blue, d: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                    { label: "Exam Requests", action: () => navigate("/exam-requests"), color: C.purple, d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                    { label: "AI Analyst", action: openAI, color: C.green, d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                  ].map(({ label, action, color, d }) => (
                    <button key={label} onClick={action} className="r-btn" style={{ padding: "10px 12px", background: color + "08", color, border: `1px solid ${color}25`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s" }}>
                      <Icon d={d} size={14} color={color} strokeWidth={2.2} />{label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>By Exam Type</div>
                {Object.keys(examTypeStats).length === 0 && !backendLoading && <div style={{ fontSize: 12, color: C.dim, textAlign: "center", padding: 16 }}>No data yet</div>}
                {Object.entries(examTypeStats).map(([type, stats], i, arr) => (
                  <div key={type} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{type}</div><div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{stats.total} candidates · Avg {stats.avg}%</div></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{stats.qualified} shortlisted</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ CANDIDATES ══ */}
      {activeTab === "candidates" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ background: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <label style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 600, color: C.text }}>Qualification Criteria</label>
              <div style={{ display: "flex", gap: 8 }}>{[70,75,80].map(c => <button key={c} onClick={() => setSelectedCriteria(c)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${selectedCriteria===c?C.accent:C.border}`, background: selectedCriteria===c?C.accent:C.accentLight, color: selectedCriteria===c?"#fff":C.text, fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>{c}%</button>)}</div>
            </div>
            <div style={{ background: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <label style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 600, color: C.text }}>Filter by Exam Type</label>
              <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} style={{ width: "100%", padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.white, fontFamily: "inherit" }}>{examTypeOptions.map(t => <option key={t} value={t}>{t === "ALL" ? "All Exams" : t}</option>)}</select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            {[{label:"Total",value:filteredCandidates.length,color:C.accent},{label:"Shortlisted",value:qualified.length,color:C.green},{label:"Under Review",value:notQualified.length,color:C.red}].map((s,i) => <div key={i} style={{ background: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, borderLeft: `4px solid ${s.color}` }}><div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div></div>)}
          </div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}><button onClick={openAI} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, background: C.accentLight, border: `1px solid ${C.accent}44`, color: C.accent, cursor: "pointer", fontWeight: 600 }}>Analyse with AI</button></div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: C.green }}>Shortlisted Candidates (≥{selectedCriteria}%)</h2>
            {backendLoading ? <div style={{ padding: 32, textAlign: "center", color: C.dim }}>Loading…</div> : qualified.length > 0 ? (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: C.accentLight, borderBottom: `2px solid ${C.border}` }}>{["Candidate","College","Exam Type","Score","Decision","Skills","Action"].map((h,i) => <th key={i} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {qualified.map(s => (
                      <tr key={s.id||s.student_id} className="r-tr" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                        <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, color: C.text }}>{s.name||s.student_id}</div><div style={{ fontSize: 11, color: C.dim }}>{s.email||""}</div></td>
                        <td style={{ padding: "12px 14px", color: C.muted }}>{s.college||"—"}</td>
                        <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>{s.examType||"—"}</span></td>
                        <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: C.greenBg, color: C.green }}>{Math.round(s.totalScore)}%</span></td>
                        <td style={{ padding: "12px 14px" }}>{s.decision?<span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(s.decision), color: decisionColor(s.decision) }}>{s.decision}</span>:"—"}</td>
                        <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(s.skills||[]).slice(0,2).map(sk => <span key={sk} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: C.accentLight, border: `1px solid ${C.border}`, color: C.muted }}>{sk}</span>)}</div></td>
                        <td style={{ padding: "12px 14px" }}><button style={{ padding: "5px 12px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }} onClick={() => { setSelectedStudent(s); setShowModal(true); }}>Schedule</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ padding: 24, textAlign: "center", color: C.dim, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>No shortlisted candidates</p>}
          </div>

          <div>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: C.orange }}>Under Review (&lt;{selectedCriteria}%)</h2>
            {notQualified.length > 0 ? (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: C.accentLight, borderBottom: `2px solid ${C.border}` }}>{["Candidate","College","Exam Type","Score","Decision","Action"].map((h,i) => <th key={i} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {notQualified.map(s => (
                      <tr key={s.id||s.student_id} className="r-tr" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                        <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, color: C.text }}>{s.name||s.student_id}</div></td>
                        <td style={{ padding: "12px 14px", color: C.muted }}>{s.college||"—"}</td>
                        <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>{s.examType||"—"}</span></td>
                        <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: C.redBg, color: C.red }}>{Math.round(s.totalScore)}%</span></td>
                        <td style={{ padding: "12px 14px" }}>{s.decision?<span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(s.decision), color: decisionColor(s.decision) }}>{s.decision}</span>:"—"}</td>
                        <td style={{ padding: "12px 14px" }}><button style={{ padding: "5px 12px", background: C.redBg, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Request Retake</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ padding: 24, textAlign: "center", color: C.dim, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>No review candidates</p>}
          </div>
        </>
      )}

      {/* ══ REPORTS ══ */}
      {activeTab === "reports" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Candidates" value={allCandidates.length} color={C.accent} delay={0} iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            <StatCard label="Avg Score" value={allCandidates.length>0?Math.round(allCandidates.reduce((a,c)=>a+c.totalScore,0)/allCandidates.length)+"%":"—"} color={C.blue} delay={0.05} iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            <StatCard label="Hire Rate" value={allCandidates.length>0?Math.round((allCandidates.filter(c=>c.decision==="Hire").length/allCandidates.length)*100)+"%":"—"} color={C.green} delay={0.1} iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>Performance by Exam Type</h2>
          {Object.keys(examTypeStats).length === 0 ? <p style={{ padding: 24, textAlign: "center", color: C.dim, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>No data available</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 16, marginBottom: 28 }}>
              {Object.entries(examTypeStats).map(([type, stats]) => (
                <div key={type} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", background: C.accentLight, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{type}</div>
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.accent, color: "#fff" }}>{stats.total}</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    {[["Total Candidates",stats.total,C.text],["Shortlisted (≥70%)",stats.qualified,C.green],["Average Score",`${stats.avg}%`,C.blue]].map(([l,v,col],i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, marginBottom: 10, borderBottom: i<2?`1px solid ${C.border}`:"none" }}><span style={{ fontSize: 13, color: C.muted }}>{l}</span><span style={{ fontSize: 14, fontWeight: 700, color: col }}>{v}</span></div>)}
                    <button onClick={openAI} style={{ width: "100%", padding: 8, background: C.accentLight, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 4 }}>Analyse with AI</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>All Candidate Reports</h2>
            <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, fontFamily: "inherit" }}>{examTypeOptions.map(t => <option key={t} value={t}>{t==="ALL"?"All Exams":t}</option>)}</select>
          </div>
          {backendLoading ? <div style={{ padding: 32, textAlign: "center", color: C.dim }}>Loading…</div> : filteredCandidates.length > 0 ? (
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: C.accentLight, borderBottom: `2px solid ${C.border}` }}>{["Candidate","College","Exam Type","Score","Coding","Problem Solving","Decision"].map((h,i) => <th key={i} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredCandidates.map(c => (
                    <tr key={c.id||c.student_id} className="r-tr" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                      <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, color: C.text }}>{c.name||c.student_id}</div></td>
                      <td style={{ padding: "12px 14px", color: C.muted }}>{c.college||"—"}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>{c.examType||"—"}</span></td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: c.totalScore>=70?C.greenBg:C.redBg, color: c.totalScore>=70?C.green:C.red }}>{Math.round(c.totalScore)}%</span></td>
                      <td style={{ padding: "12px 14px", color: C.muted }}>{c.codingSkill?Math.round(c.codingSkill):"—"}</td>
                      <td style={{ padding: "12px 14px", color: C.muted }}>{c.problemSolving?Math.round(c.problemSolving):"—"}</td>
                      <td style={{ padding: "12px 14px" }}>{c.decision?<span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(c.decision), color: decisionColor(c.decision) }}>{c.decision}</span>:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ padding: 24, textAlign: "center", color: C.dim, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>No candidates found</p>}
        </>
      )}

      {/* Schedule Interview Modal */}
      {showModal && selectedStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: C.white, borderRadius: 12, maxWidth: 520, width: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(10,42,65,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.accentLight }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Schedule Interview — {selectedStudent.name||selectedStudent.student_id}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: C.accentLight, padding: 14, borderRadius: 8, marginBottom: 20, border: `1px solid ${C.border}` }}>
                {[["Name",selectedStudent.name||selectedStudent.student_id],["Score",`${Math.round(selectedStudent.totalScore)}%`],["Exam Type",selectedStudent.examType||"—"],["Decision",selectedStudent.decision||"Pending"]].map(([l,v],i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ fontWeight: 600, color: C.muted }}>{l}:</span><span style={{ color: C.text }}>{v}</span></div>)}
              </div>
              {[{label:"Interview Date",type:"date"},{label:"Interview Time",type:"time"}].map(f => <div key={f.label} style={{ marginBottom: 14 }}><label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: C.text }}>{f.label}</label><input type={f.type} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }} /></div>)}
              <div style={{ marginBottom: 14 }}><label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: C.text }}>Interview Type</label><select style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, outline: "none" }}><option>Technical Round</option><option>HR Round</option><option>Final Round</option></select></div>
              <div style={{ marginBottom: 14 }}><label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: C.text }}>Interviewer Email</label><input type="email" placeholder="interviewer@company.com" style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }} /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={{ flex: 1, padding: 12, background: C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Schedule Interview</button>
                <button style={{ flex: 1, padding: 12, background: C.accentLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} liveData={allCandidates} />
      {!aiOpen && <AIBubble onClick={openAI} hasUnread={aiUnread} />}
    </RecruiterLayout>
  );
}