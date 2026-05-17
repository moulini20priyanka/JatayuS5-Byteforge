// RecruiterDashboard.jsx — Blue theme with AI Analyst (Claude / Anthropic API)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";


const B = {
  accent:       "#2563eb",
  accentDark:   "#1d4ed8",
  accentLight:  "#eff6ff",
  accentBorder: "#bfdbfe",
  accentMid:    "#3b82f6",
  accentDim:    "#93c5fd",
  navy:         "#1e3a8a",
  white:        "#ffffff",
  bg:           "#f0f7ff",
  border:       "#dbeafe",
  text:         "#1e3a8a",
  muted:        "#3b82f6",
  dim:          "#93c5fd",
  green:        "#10b981",
  greenBg:      "#ecfdf5",
  greenBorder:  "#6ee7b7",
  red:          "#ef4444",
  redBg:        "#fee2e2",
  redBorder:    "#fca5a5",
  orange:       "#f59e0b",
  orangeBg:     "#fffbeb",
  orangeBorder: "#fcd34d",
  purple:       "#7c3aed",
  purpleBg:     "#f5f3ff",
  purpleBorder: "#e9d5ff",
};

// ─── CSS ──────────────────────────────────────────────────────────
const recStyles = `
  .rec-stat-card {
    background: #fff; border-radius: 12px; padding: 20px 22px;
    border: 1px solid #dbeafe; border-top: 3px solid;
    display: flex; justify-content: space-between; align-items: flex-start;
    box-shadow: 0 2px 10px rgba(37,99,235,0.07);
    transition: all 0.18s ease; animation: recFadeUp 0.35s ease both;
  }
  .rec-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.12); }
  .rec-stat-label { font-size: 11px; font-weight: 600; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
  .rec-stat-value { font-size: 28px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
  .rec-stat-sub   { font-size: 11px; color: #93c5fd; margin-top: 4px; }
  .rec-panel {
    background: #fff; border-radius: 12px; border: 1px solid #dbeafe;
    overflow: hidden; box-shadow: 0 2px 10px rgba(37,99,235,0.06);
  }
  .rec-panel-header {
    padding: 16px 20px; border-bottom: 1px solid #eff6ff;
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(to right, #f0f9ff, #fff);
  }
  .rec-panel-title { font-size: 13px; font-weight: 700; color: #1e3a8a; }
  .rec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .rec-table thead tr { background: #f0f9ff; border-bottom: 1.5px solid #dbeafe; }
  .rec-table th { padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; }
  .rec-table tbody tr { border-bottom: 1px solid #f0f9ff; transition: background 0.15s ease; }
  .rec-table tbody tr:hover { background: #f0f9ff; }
  .rec-table td { padding: 12px 14px; vertical-align: middle; }
  .rec-tag { padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .rec-btn-primary {
    padding: 7px 14px; border-radius: 8px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.18s ease; display: flex; align-items: center; gap: 6px;
  }
  .rec-btn-primary:hover { background: linear-gradient(135deg, #1d4ed8, #1e40af); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
  .rec-btn-secondary {
    padding: 7px 12px; border-radius: 8px; background: #eff6ff; color: #1d4ed8;
    border: 1px solid #bfdbfe; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.18s ease; display: flex; align-items: center; gap: 4px;
  }
  .rec-btn-secondary:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
  .rec-quick-action-btn {
    padding: 10px 12px; border-radius: 9px; font-size: 12px; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; gap: 7px;
    transition: all 0.18s ease; border: 1px solid;
  }
  .rec-quick-action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(37,99,235,0.2); }
  .rec-criteria-btn {
    flex: 1; padding: 10px; border-radius: 8px; font-weight: 600;
    font-size: 14px; cursor: pointer; transition: all 0.18s ease; border: 1.5px solid;
  }
  .rec-criteria-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.15); }
  .rec-criteria-btn.active { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border-color: #1d4ed8; box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
  .rec-criteria-btn:not(.active) { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
  .rec-criteria-btn:not(.active):hover { background: #dbeafe; }
  .rec-type-select {
    width: 100%; padding: 10px 12px; border: 1.5px solid #dbeafe; border-radius: 8px;
    font-size: 14px; color: #1e3a8a; background: #fff; font-family: inherit;
    outline: none; transition: border-color 0.15s; cursor: pointer;
  }
  .rec-type-select:focus { border-color: #3b82f6; }
  .rec-ai-banner {
    margin-bottom: 24px; padding: 14px 20px; border-radius: 12px;
    display: flex; align-items: center; gap: 14px; cursor: pointer;
    transition: all 0.18s ease; border: 1px solid #bfdbfe; background: #eff6ff;
  }
  .rec-ai-banner:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.15); }
  .rec-error-box {
    margin-bottom: 20px; padding: 12px 16px; border-radius: 8px; font-size: 13px;
    display: flex; align-items: center; gap: 8px;
    background: #fffbeb; border: 1px solid #fcd34d; color: #b45309;
  }
  .rec-schedule-btn {
    padding: 5px 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff; border: none; border-radius: 6px; cursor: pointer;
    font-size: 11px; font-weight: 600; transition: all 0.15s;
  }
  .rec-schedule-btn:hover { background: linear-gradient(135deg, #1d4ed8, #1e40af); transform: translateY(-1px); box-shadow: 0 3px 10px rgba(37,99,235,0.3); }
  .rec-retake-btn {
    padding: 5px 12px; background: #fee2e2; color: #ef4444;
    border: 1px solid #fca5a5; border-radius: 6px; cursor: pointer;
    font-size: 11px; font-weight: 600; transition: all 0.15s;
  }
  .rec-retake-btn:hover { background: #fecaca; border-color: #ef4444; transform: translateY(-1px); }
  .rec-analyse-btn {
    font-size: 12px; padding: 7px 14px; border-radius: 8px;
    background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
    cursor: pointer; font-weight: 600; transition: all 0.15s;
  }
  .rec-analyse-btn:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
  .rec-ai-full-btn {
    width: 100%; padding: 8px; background: #eff6ff; border: 1px solid #bfdbfe;
    color: #1d4ed8; border-radius: 8px; cursor: pointer; font-size: 12px;
    font-weight: 600; margin-top: 4px; transition: all 0.15s;
  }
  .rec-ai-full-btn:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
  .rec-modal-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000; animation: recFadeIn 0.15s ease;
  }
  .rec-modal {
    background: #fff; border-radius: 14px; max-width: 520px; width: 90%;
    max-height: 90vh; overflow-y: auto;
    box-shadow: 0 16px 48px rgba(37,99,235,0.18); border: 1px solid #dbeafe;
    animation: recSlideUp 0.18s ease;
  }
  .rec-modal-header {
    padding: 20px 24px; border-bottom: 1px solid #eff6ff;
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(to right, #f0f9ff, #fff);
  }
  .rec-modal-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: #1e3a8a; }
  .rec-modal-close {
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
    font-size: 20px; cursor: pointer; color: #3b82f6;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .rec-modal-close:hover { background: #dbeafe; }
  .rec-modal-body { padding: 24px; }
  .rec-modal-info { background: #f0f9ff; padding: 14px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bfdbfe; }
  .rec-modal-info-row { display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #dbeafe; font-size: 13px; }
  .rec-modal-info-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
  .rec-modal-info-label { font-weight: 600; color: #60a5fa; }
  .rec-modal-info-value { color: #1e3a8a; }
  .rec-modal-field { margin-bottom: 14px; }
  .rec-modal-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #3b82f6; }
  .rec-modal-input, .rec-modal-select {
    width: 100%; padding: 9px 12px; border: 1.5px solid #dbeafe; border-radius: 8px;
    font-size: 13px; font-family: inherit; color: #1e3a8a; box-sizing: border-box;
    outline: none; background: #fff; transition: border-color 0.15s;
  }
  .rec-modal-input:focus, .rec-modal-select:focus { border-color: #3b82f6; }
  .rec-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
  .rec-modal-submit {
    flex: 1; padding: 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff; border: none; border-radius: 8px; cursor: pointer;
    font-size: 13px; font-weight: 700; transition: all 0.18s;
  }
  .rec-modal-submit:hover { background: linear-gradient(135deg, #1d4ed8, #1e40af); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
  .rec-modal-cancel-btn {
    flex: 1; padding: 12px; background: #eff6ff; color: #1d4ed8;
    border: 1px solid #bfdbfe; border-radius: 8px; cursor: pointer;
    font-size: 13px; font-weight: 600; transition: all 0.15s;
  }
  .rec-modal-cancel-btn:hover { background: #dbeafe; }
  .rec-ai-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: clamp(320px, 36vw, 480px); background: #fff;
    box-shadow: -6px 0 32px rgba(37,99,235,0.14);
    display: flex; flex-direction: column; z-index: 3000;
    border-left: 1px solid #dbeafe; animation: recSlideFromRight 0.22s ease;
  }
  .rec-ai-header {
    padding: 14px 16px; background: linear-gradient(135deg, #1d4ed8, #2563eb);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .rec-ai-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.2); display: flex; align-items: center;
    justify-content: center; font-size: 14px; font-weight: 800; color: #fff;
    border: 1.5px solid rgba(255,255,255,0.3); flex-shrink: 0;
  }
  .rec-ai-close-btn {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
    color: #fff; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
    font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .rec-ai-close-btn:hover { background: rgba(255,255,255,0.25); }
  .rec-ai-bubble {
    position: fixed; bottom: 28px; right: 28px; width: 58px; height: 58px;
    border-radius: 50%; background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(37,99,235,0.45);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #fff; z-index: 2900;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .rec-ai-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(37,99,235,0.55); }
  .rec-row-hover:hover { background: #f0f9ff !important; }
  .rec-suggestion-chip {
    font-size: 11px; padding: 5px 10px; border-radius: 20px;
    background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
    cursor: pointer; transition: all 0.15s; font-weight: 500; white-space: nowrap;
  }
  .rec-suggestion-chip:hover { background: #dbeafe; border-color: #93c5fd; }
  .rec-pdf-chip {
    display: flex; align-items: center; gap: 5px; font-size: 11px;
    padding: 4px 10px; border-radius: 20px; background: #eff6ff;
    border: 1px solid #bfdbfe; color: #1d4ed8;
  }
  .rec-pdf-chip button { background: none; border: none; cursor: pointer; color: #2563eb; padding: 0; font-size: 13px; line-height: 1; }
  @keyframes recFadeUp       { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
  @keyframes recFadeIn        { from { opacity: 0 } to { opacity: 1 } }
  @keyframes recSlideUp       { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
  @keyframes recSlideFromRight{ from { opacity: 0; transform: translateX(40px) } to { opacity: 1; transform: none } }
  @keyframes recPulseDot      { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.5} }
  @keyframes recBubblePulse   { 0%{box-shadow:0 0 0 0 rgba(37,99,235,0.55)} 70%{box-shadow:0 0 0 14px rgba(37,99,235,0)} 100%{box-shadow:0 0 0 0 rgba(37,99,235,0)} }
  .rec-ai-bubble-ring         { position:absolute;inset:0;border-radius:50%;animation:recBubblePulse 2.2s infinite; }
`;

// ─── Auth token helper ────────────────────────────────────────────
const getToken = () =>
  localStorage.getItem("recruiter_token") ||
  localStorage.getItem("admin_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") || "";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── AI Tool definitions ──────────────────────────────────────────
const AI_TOOLS = [
  {
    name: "search_candidates",
    description: "Search and filter candidates from NeuroAssess database by skills, score range, hiring tag, exam type, or any criteria.",
    input_schema: {
      type: "object",
      properties: {
        skills:     { type: "array", items: { type: "string" } },
        minScore:   { type: "number" },
        hiringTags: { type: "array", items: { type: "string" } },
        examType:   { type: "string" },
        topN:       { type: "number" },
        sortBy:     { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "shortlist_for_role",
    description: "Shortlist best-fit candidates for a specific job role.",
    input_schema: {
      type: "object",
      properties: {
        role:           { type: "string" },
        requiredSkills: { type: "array", items: { type: "string" } },
        topN:           { type: "number" },
        minScore:       { type: "number" },
      },
      required: ["role"],
    },
  },
  {
    name: "compare_candidates",
    description: "Compare two or more candidates head-to-head on all metrics.",
    input_schema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" } } },
      required: ["names"],
    },
  },
  {
    name: "get_statistics",
    description: "Get aggregate statistics about the full candidate pool.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ─── Tool runner (client-side, uses live data) ────────────────────
function runTool(name, input, pool = []) {
  switch (name) {
    case "search_candidates": {
      let r = [...pool];
      if (input.skills?.length)
        r = r.filter((s) =>
          input.skills.some((sk) =>
            (s.skills || []).some((ss) => ss.toLowerCase().includes(sk.toLowerCase()))
          )
        );
      if (input.minScore != null) r = r.filter((s) => (s.totalScore || 0) >= input.minScore);
      if (input.hiringTags?.length) r = r.filter((s) => input.hiringTags.includes(s.hiringTag || s.decision));
      if (input.examType) r = r.filter((s) => s.examType === input.examType);
      r.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      if (input.topN) r = r.slice(0, input.topN);
      return { count: r.length, candidates: r };
    }
    case "shortlist_for_role": {
      const roleMap = {
        backend:        ["Java", "Spring Boot", "Node.js", "Python", "Docker", "SQL"],
        frontend:       ["React", "JavaScript", "TypeScript", "CSS", "HTML"],
        fullstack:      ["React", "Node.js", "JavaScript", "MongoDB", "SQL"],
        "data scientist": ["Python", "ML", "TensorFlow", "SQL"],
        ml:             ["Python", "TensorFlow", "ML", "SQL"],
        devops:         ["Docker", "Kubernetes", "CI/CD", "AWS"],
      };
      const key = Object.keys(roleMap).find((k) => input.role.toLowerCase().includes(k)) || "backend";
      const req = input.requiredSkills?.length ? input.requiredSkills : roleMap[key];
      const r = pool
        .filter((s) => (s.totalScore || 0) >= (input.minScore || 0))
        .map((s) => ({
          ...s,
          matchScore: (s.skills || []).filter((sk) =>
            req.some((rr) => sk.toLowerCase().includes(rr.toLowerCase()))
          ).length,
        }))
        .filter((s) => s.matchScore > 0)
        .sort((a, b) =>
          b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : (b.totalScore || 0) - (a.totalScore || 0)
        )
        .slice(0, input.topN || 3);
      return { role: input.role, shortlisted: r };
    }
    case "compare_candidates": {
      const found = pool.filter((s) =>
        (input.names || []).some((n) =>
          (s.name || s.student_id || "").toLowerCase().includes(n.toLowerCase())
        )
      );
      return { comparison: found };
    }
    case "get_statistics": {
      if (!pool.length) return { total: 0, message: "No candidates in database yet." };
      const avg = pool.reduce((a, s) => a + (s.totalScore || 0), 0) / pool.length;
      const tags = pool.reduce((a, s) => {
        const t = s.hiringTag || s.decision || "Unknown";
        a[t] = (a[t] || 0) + 1;
        return a;
      }, {});
      const skills = pool
        .flatMap((s) => s.skills || [])
        .reduce((a, sk) => { a[sk] = (a[sk] || 0) + 1; return a; }, {});
      return {
        total: pool.length,
        avgScore: Math.round(avg),
        hiringDistribution: tags,
        topSkills: Object.fromEntries(
          Object.entries(skills).sort((a, b) => b[1] - a[1]).slice(0, 6)
        ),
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are the NeuroAssess AI Analyst — an expert agentic recruiter assistant. Help recruiters search candidates, analyse PDF reports, shortlist for roles, and compare candidates. Always use tools for database questions. Be concise and professional. Use **bold** for names/scores. Use markdown bullet points where helpful.`;

// ─── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, iconPath, delay = 0 }) {
  return (
    <div className="rec-stat-card" style={{ borderTopColor: color, animationDelay: `${delay}s` }}>
      <div>
        <div className="rec-stat-label">{label}</div>
        <div className="rec-stat-value">{value}</div>
        {sub && <div className="rec-stat-sub">{sub}</div>}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}30` }}>
        <Icon d={iconPath} size={17} color={color} strokeWidth={2} />
      </div>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────
function Md({ text }) {
  const lines = (text || "").split("\n");
  return (
    <div style={{ fontSize: 13, lineHeight: 1.65, color: "#1e3a8a" }}>
      {lines.map((ln, i) => {
        if (ln.startsWith("### "))
          return <p key={i} style={{ margin: "8px 0 3px", fontWeight: 700, fontSize: 13, color: "#1e3a8a" }}>{ln.slice(4)}</p>;
        if (ln.startsWith("## "))
          return <p key={i} style={{ margin: "10px 0 4px", fontWeight: 700, fontSize: 14, color: "#1e3a8a" }}>{ln.slice(3)}</p>;
        if (ln.startsWith("- ") || ln.startsWith("• ")) {
          const parts = ln.slice(2).split(/(\*\*[^*]+\*\*)/g);
          return (
            <div key={i} style={{ display: "flex", gap: 6, margin: "3px 0" }}>
              <span style={{ color: "#2563eb", flexShrink: 0 }}>•</span>
              <span>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}</span>
            </div>
          );
        }
        if (ln.trim() === "") return <br key={i} />;
        const parts = ln.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} style={{ margin: "2px 0" }}>
            {parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}
          </p>
        );
      })}
    </div>
  );
}

// ─── AIChatDrawer ─────────────────────────────────────────────────
function AIChatDrawer({ open, onClose, liveData }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: {
        text: `**NeuroAssess AI Analyst** ready.\n\nConnected to **${liveData?.length || 0} candidates**.\n\nUpload a student PDF or ask me anything about your candidate pool.`,
        candidates: [],
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeModel, setActiveModel] = useState(CLAUDE_MODEL);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync candidate count into first message when data loads
  useEffect(() => {
    if (liveData?.length > 0) {
      setMessages((prev) => {
        const first = prev[0];
        if (first?.role === "assistant") {
          return [
            {
              ...first,
              content: {
                ...first.content,
                text: `**NeuroAssess AI Analyst** ready.\n\nConnected to **${liveData.length} live candidates**.\n\nUpload a PDF report or ask anything about your candidate pool.`,
              },
            },
            ...prev.slice(1),
          ];
        }
        return prev;
      });
    }
  }, [liveData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  // ── PDF reader ────────────────────────────────────────────────
  const readPDF = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, b64: reader.result.split(",")[1] });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files) => {
    const arr = Array.from(files).filter((f) => f.type === "application/pdf");
    if (!arr.length) return;
    const newPdfs = await Promise.all(arr.map(readPDF));
    setPdfs((prev) => [...prev, ...newPdfs]);
  };

  const removePdf = (i) => setPdfs((prev) => prev.filter((_, j) => j !== i));

  // ── Claude API call — routed through your Express proxy ────────
  // Direct browser → api.anthropic.com is blocked by CORS.
  // The proxy at /api/ai/chat adds the API key server-side.
  const callClaude = async (messages) => {
    const res = await fetch(`${API}/ai-analyst/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        tools:  AI_TOOLS,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude ${res.status}: ${errText}`);
    }

    return res.json();
  };

  // ── Main AI call with tool-use loop (Claude API) ─────────────
  const callAI = async (userText, attachedPdfs) => {
    // Build user message content — include PDFs as documents if present
    const userContent = [
      ...attachedPdfs.map((pdf) => ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdf.b64 },
      })),
      { type: "text", text: userText },
    ];

    // Map chat history to Claude message format
    const history = messages
      .filter((m) => m.content.text)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [{ type: "text", text: m.content.text }],
      }));

    let msgs = [...history, { role: "user", content: userContent }];
    let toolResultRows = [];

    // Agentic loop — keep calling until stop_reason is "end_turn"
    for (let i = 0; i < 5; i++) {
      const data = await callClaude(msgs);
      const contentBlocks = data?.content || [];
      const toolUseBlocks = contentBlocks.filter((b) => b.type === "tool_use");

      if (!toolUseBlocks.length) {
        // Final text response
        const text =
          contentBlocks
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n") || "I couldn\'t generate a response. Please try again.";
        return { text, candidates: toolResultRows };
      }

      // Execute tools and build tool_result content for next turn
      const toolResults = [];
      for (const block of toolUseBlocks) {
        const result = runTool(block.name, block.input || {}, liveData);
        const rows = result.candidates || result.shortlisted || result.comparison || [];
        toolResultRows.push(...rows);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      msgs = [
        ...msgs,
        { role: "assistant", content: contentBlocks },
        { role: "user", content: toolResults },
      ];
    }

    return { text: "Processing complete.", candidates: toolResultRows };
  };

  // ── Send message ──────────────────────────────────────────────
  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const attachedPdfs = [...pdfs];
    setPdfs([]);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: {
          text: msg,
          pdfs: attachedPdfs.map((p) => p.name),
          candidates: [],
        },
      },
    ]);
    setLoading(true);

    try {
      const result = await callAI(msg, attachedPdfs);
      setMessages((prev) => [...prev, { role: "assistant", content: result }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: {
            text: `⚠️ **Error:** ${err.message}\n\nPlease check your API configuration and try again.`,
            candidates: [],
          },
        },
      ]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: {
          text: `Chat cleared. Connected to **${liveData?.length || 0} candidates**. How can I help?`,
          candidates: [],
        },
      },
    ]);
  };

  const SUGGESTIONS = [
    "Top 3 candidates by score",
    "Show all Hire decisions",
    "Shortlist for backend engineer",
    "Batch statistics",
    "Who scored above 80?",
    "Compare top candidates",
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 2999 }}
        onClick={onClose}
      />

      <div className="rec-ai-drawer">
        {/* Header */}
        <div className="rec-ai-header">
          <div className="rec-ai-icon">AI</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>AI Analyst</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", animation: "recPulseDot 2s infinite" }} />
              {activeModel} · {liveData?.length || 0} candidates
            </div>
          </div>
          <button
            onClick={clearChat}
            title="Clear chat"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 6 }}
          >
            🗑
          </button>
          <button className="rec-ai-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 12,
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              {m.role === "assistant" && (
                <div
                  className="rec-ai-icon"
                  style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12, marginTop: 2, background: "linear-gradient(135deg,#1d4ed8,#2563eb)", flexShrink: 0 }}
                >
                  AI
                </div>
              )}
              <div
                style={{
                  maxWidth: m.role === "user" ? "75%" : "100%",
                  flex: m.role === "assistant" ? 1 : "unset",
                  background: m.role === "user" ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#f0f9ff",
                  color: m.role === "user" ? "#fff" : "#1e3a8a",
                  padding: "10px 13px",
                  borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  border: m.role === "assistant" ? "1px solid #dbeafe" : "none",
                }}
              >
                {/* PDF badges on user messages */}
                {m.content.pdfs?.length > 0 && (
                  <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {m.content.pdfs.map((p, j) => (
                      <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}>
                        📄 {p}
                      </span>
                    ))}
                  </div>
                )}

                {m.role === "user" ? (
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>{m.content.text}</span>
                ) : (
                  <>
                    <Md text={m.content.text} />
                    {m.content.candidates?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        {m.content.candidates.map((c, ci) => (
                          <div
                            key={ci}
                            style={{ background: "#fff", border: "1px solid #dbeafe", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a" }}>
                                {c.name || c.student_id}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: "#2563eb" }}>
                                {Math.round(c.totalScore || 0)}/100
                              </span>
                            </div>
                            {c.decision && (
                              <div style={{ fontSize: 11, marginTop: 3, color: c.decision === "Hire" ? "#10b981" : c.decision === "Reject" ? "#ef4444" : "#f59e0b" }}>
                                {c.decision}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                AI
              </div>
              <div style={{ padding: "10px 14px", background: "#f0f9ff", border: "1px solid #dbeafe", borderRadius: "14px 14px 14px 3px", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, color: "#60a5fa", marginRight: 4 }}>Thinking</span>
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "#2563eb", display: "inline-block", animation: `recPulseDot 1s ${j * 0.18}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips — show only on fresh chat */}
        {messages.length <= 1 && (
          <div style={{ padding: "10px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="rec-suggestion-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* PDF preview chips */}
        {pdfs.length > 0 && (
          <div style={{ padding: "8px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pdfs.map((p, i) => (
              <div key={i} className="rec-pdf-chip">
                📄 {p.name.length > 22 ? p.name.slice(0, 20) + "…" : p.name}
                <button onClick={() => removePdf(i)}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone indicator */}
        {dragOver && (
          <div style={{ margin: "8px 14px", padding: 16, border: "2px dashed #3b82f6", borderRadius: 10, textAlign: "center", background: "#eff6ff", fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>
            Drop PDF report here
          </div>
        )}

        {/* Input area */}
        <div
          style={{ padding: "10px 14px 14px", borderTop: "1px solid #dbeafe", background: "#fff", flexShrink: 0 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {/* Attach PDF */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach PDF"
              style={{ width: 36, height: 36, borderRadius: 9, background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#1d4ed8" }}
            >
              📎
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10,
                border: "1.5px solid #dbeafe", fontSize: 13, resize: "none",
                outline: "none", fontFamily: "inherit", lineHeight: 1.55,
                color: "#1e3a8a", background: "#fff", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#dbeafe")}
            />

            {/* Send */}
            <button
              onClick={() => send()}
              disabled={loading || (!input.trim() && !pdfs.length)}
              title="Send"
              style={{
                width: 36, height: 36, borderRadius: 9, border: "none",
                color: "#fff", cursor: (input.trim() || pdfs.length) && !loading ? "pointer" : "not-allowed",
                fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
                background: (input.trim() || pdfs.length) && !loading
                  ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
                  : "#cbd5e1",
              }}
            >
              <Icon d="M5 12h14M12 5l7 7-7 7" size={18} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "#93c5fd", textAlign: "center" }}>
            Powered by {activeModel} · Drag & drop PDF reports
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Floating AI bubble ───────────────────────────────────────────
function AIBubble({ onClick, hasUnread }) {
  return (
    <button className="rec-ai-bubble" onClick={onClick} title="Open AI Analyst">
      <span className="rec-ai-bubble-ring" />
      AI
      {hasUnread && (
        <span style={{ position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />
      )}
    </button>
  );
}

// ─── RecruiterDashboard (main export) ─────────────────────────────
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
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleType, setScheduleType] = useState("Technical Round");
  const [scheduleEmail, setScheduleEmail] = useState("");

  // ── Fetch data ──────────────────────────────────────────────────
  const fetchData = async () => {
    setBackendLoading(true);
    setError(null);
    try {
      let normalised = [];
      try {
        const res = await apiClient.get("/reports/all");
        normalised = (res.data || []).map((r) => ({
          ...r,
          totalScore:     r.total_score || 0,
          codingSkill:    r.coding_skill || r.github_score || 0,
          problemSolving: r.problem_solving || r.leetcode_score || 0,
          consistency:    r.consistency || 0,
          hiringTag:      r.decision || "Unknown",
          examType:       r.exam_type || "Placement",
          skills:         r.tech_skills || [],
          college:        r.college || "",
        }));
      } catch {
        const res = await apiClient.get("/candidates");
        const candidates = Array.isArray(res.data) ? res.data : (res.data?.candidates || []);
        normalised = candidates.map((c) => ({
          ...c,
          totalScore:     c.total_score || c.overall_score || 0,
          codingSkill:    c.coding_score || c.github_score || 0,
          problemSolving: c.leetcode_score || 0,
          consistency:    0,
          hiringTag:      c.decision || c.status || "Unknown",
          examType:       c.exam_type || "Placement",
          skills:         c.tech_skills || [],
          college:        c.college || "",
        }));
      }

      setAllCandidates(normalised);
      setBackendStats({
        total:        normalised.length,
        shortlisted:  normalised.filter((r) => r.totalScore >= 70).length,
        pending:      normalised.filter((r) => r.totalScore < 70).length,
        aiEvaluated:  normalised.filter((r) => r.decision).length,
      });
      setRecentFromAPI(normalised.slice(0, 5));

      const etStats = {};
      [...new Set(normalised.map((r) => r.examType))].forEach((type) => {
        const t = normalised.filter((r) => r.examType === type);
        etStats[type] = {
          total:     t.length,
          qualified: t.filter((r) => r.totalScore >= 70).length,
          avg:       t.length > 0 ? (t.reduce((s, r) => s + r.totalScore, 0) / t.length).toFixed(1) : 0,
        };
      });
      setExamTypeStats(etStats);
    } catch (err) {
      if (err.response?.status === 401)        setError("Session expired — please log in again.");
      else if (err.response?.status === 403)   setError("Access denied — recruiter or admin role required.");
      else if (err.code === "ERR_NETWORK")      setError("Cannot connect to server at port 5000. Is the backend running?");
      else setError(`Error: ${err.response?.data?.error || err.message}`);
    }
    setBackendLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── Derived data ────────────────────────────────────────────────
  const filteredCandidates = allCandidates.filter(
    (c) => selectedExamType === "ALL" || c.examType === selectedExamType
  );
  const qualified    = filteredCandidates.filter((c) => c.totalScore >= selectedCriteria);
  const notQualified = filteredCandidates.filter((c) => c.totalScore < selectedCriteria);
  const examTypeOptions = ["ALL", ...Object.keys(examTypeStats)];

  const openAI = () => { setAiOpen(true); setAiUnread(false); };

  const decisionColor = (d) => d === "Hire" ? B.green  : d === "Reject" ? B.red  : B.orange;
  const decisionBg    = (d) => d === "Hire" ? B.greenBg : d === "Reject" ? B.redBg : B.orangeBg;

  // ── Header actions ──────────────────────────────────────────────
  const headerActions = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button className="rec-btn-primary" onClick={openAI}>
        <span style={{ fontWeight: 800 }}>AI</span> Analyst
        {aiUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />}
      </button>
      <button className="rec-btn-secondary" onClick={fetchData} title="Refresh data">
        <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={14} color="#1d4ed8" strokeWidth={2} />
        Refresh
      </button>
    </div>
  );

  // ── Tab nav ─────────────────────────────────────────────────────
  const TabNav = () => (
    <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#eff6ff", padding: 4, borderRadius: 10, width: "fit-content" }}>
      {["dashboard", "candidates", "reports"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, transition: "all 0.15s",
            background: activeTab === tab ? "#fff" : "transparent",
            color: activeTab === tab ? "#1d4ed8" : "#93c5fd",
            boxShadow: activeTab === tab ? "0 2px 8px rgba(37,99,235,0.1)" : "none",
            textTransform: "capitalize",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <RecruiterLayout
      title={activeTab === "dashboard" ? "Dashboard" : activeTab === "candidates" ? "Candidates" : "Reports"}
      subtitle={backendLoading ? "Loading live data…" : `${allCandidates.length} candidates · Live data`}
      actions={headerActions}
    >
      <style>{recStyles}</style>
      <TabNav />

      {/* Error banner */}
      {error && (
        <div className="rec-error-box">
          <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={16} color={B.orange} strokeWidth={2} />
          {error}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {error.includes("log in") && (
              <button onClick={() => navigate("/login")} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${B.orange}`, background: "transparent", color: B.orange, cursor: "pointer", fontSize: 12 }}>
                Login
              </button>
            )}
            <button onClick={fetchData} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${B.orange}`, background: "transparent", color: B.orange, cursor: "pointer", fontSize: 12 }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ DASHBOARD TAB ══════════════ */}
      {activeTab === "dashboard" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Assessed" value={backendStats.total}       color={B.accent}  delay={0}    iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            <StatCard label="Shortlisted"    value={backendStats.shortlisted} color={B.green}   delay={0.05} iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Under Review"   value={backendStats.pending}     color={B.orange}  delay={0.1}  iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="AI Evaluated"   value={backendStats.aiEvaluated} color={B.purple}  delay={0.15} iconPath="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </div>

          {/* AI banner */}
          <div className="rec-ai-banner" onClick={openAI}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #bfdbfe" }}>
              AI
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: B.accent }}>
                AI Analyst — {allCandidates.length} live candidates loaded
              </div>
              <div style={{ fontSize: 12, color: B.dim, marginTop: 2 }}>
                Search candidates by skill, score, or role. Upload student PDF reports. Powered by Gemini with auto-fallback.
              </div>
            </div>
            <Icon d="M9 5l7 7-7 7" size={18} color={B.accent} strokeWidth={2} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            {/* Recent candidates */}
            <div className="rec-panel">
              <div className="rec-panel-header">
                <div className="rec-panel-title">Recent Candidates</div>
                <button
                  onClick={() => setActiveTab("candidates")}
                  style={{ fontSize: 11, color: B.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  View all
                </button>
              </div>
              {backendLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: B.dim, fontSize: 13 }}>Loading…</div>
              ) : (
                <div>
                  {recentFromAPI.map((r, i) => (
                    <div
                      key={i}
                      className="rec-row-hover"
                      style={{ padding: "12px 20px", borderBottom: i < recentFromAPI.length - 1 ? "1px solid #eff6ff" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: B.accent, flexShrink: 0, border: `1px solid ${B.accentBorder}` }}>
                          {(r.name || r.student_id || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: B.text }}>{r.name || r.student_id}</div>
                          <div style={{ fontSize: 11, color: B.dim }}>{r.college || r.examType || "—"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: B.text }}>{Math.round(r.totalScore || 0)}</span>
                        {r.decision && (
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(r.decision), color: decisionColor(r.decision) }}>
                            {r.decision}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {recentFromAPI.length === 0 && (
                    <div style={{ padding: 32, textAlign: "center", color: B.dim, fontSize: 13 }}>No candidates yet</div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Quick actions */}
              <div className="rec-panel">
                <div className="rec-panel-header"><div className="rec-panel-title">Quick Actions</div></div>
                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Candidates",    action: () => setActiveTab("candidates"), color: B.accent,  borderColor: B.accentBorder,  bg: B.accentLight, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                    { label: "Reports",       action: () => setActiveTab("reports"),     color: "#0369a1", borderColor: "#7dd3fc",       bg: "#e0f2fe",     d: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                    { label: "Exam Requests", action: () => navigate("/exam-requests"),  color: B.purple,  borderColor: B.purpleBorder,  bg: B.purpleBg,    d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                    { label: "AI Analyst",    action: openAI,                            color: B.green,   borderColor: B.greenBorder,   bg: B.greenBg,     d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                  ].map(({ label, action, color, borderColor, bg, d }) => (
                    <button key={label} onClick={action} className="rec-quick-action-btn" style={{ color, background: bg, borderColor }}>
                      <Icon d={d} size={14} color={color} strokeWidth={2.2} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* By exam type */}
              <div className="rec-panel" style={{ flex: 1 }}>
                <div className="rec-panel-header"><div className="rec-panel-title">By Exam Type</div></div>
                <div style={{ padding: 16 }}>
                  {Object.keys(examTypeStats).length === 0 && !backendLoading && (
                    <div style={{ fontSize: 12, color: B.dim, textAlign: "center", padding: 16 }}>No data yet</div>
                  )}
                  {Object.entries(examTypeStats).map(([type, stats], i, arr) => (
                    <div key={type} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid #eff6ff" : "none" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: B.accent, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: B.text, fontWeight: 600 }}>{type}</div>
                        <div style={{ fontSize: 11, color: B.dim, marginTop: 2 }}>{stats.total} candidates · Avg {stats.avg}%</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: B.green }}>{stats.qualified} shortlisted</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ CANDIDATES TAB ══════════════ */}
      {activeTab === "candidates" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className="rec-panel">
              <div style={{ padding: 20 }}>
                <label style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 600, color: B.muted }}>Qualification Criteria</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[70, 75, 80].map((c) => (
                    <button key={c} onClick={() => setSelectedCriteria(c)} className={`rec-criteria-btn${selectedCriteria === c ? " active" : ""}`}>
                      {c}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rec-panel">
              <div style={{ padding: 20 }}>
                <label style={{ display: "block", marginBottom: 10, fontSize: 12, fontWeight: 600, color: B.muted }}>Filter by Exam Type</label>
                <select className="rec-type-select" value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)}>
                  {examTypeOptions.map((t) => <option key={t} value={t}>{t === "ALL" ? "All Exams" : t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total",        value: filteredCandidates.length, color: B.accent, borderColor: B.accentBorder },
              { label: "Shortlisted",  value: qualified.length,          color: B.green,  borderColor: B.greenBorder  },
              { label: "Under Review", value: notQualified.length,       color: B.red,    borderColor: B.redBorder    },
            ].map((s, i) => (
              <div key={i} className="rec-panel" style={{ borderLeft: `4px solid ${s.color}`, padding: 20 }}>
                <div style={{ fontSize: 11, color: B.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <button className="rec-analyse-btn" onClick={openAI}>Analyse with AI</button>
          </div>

          {/* Shortlisted table */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: B.green }}>
              Shortlisted Candidates (≥{selectedCriteria}%)
            </h2>
            {backendLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: B.dim }}>Loading…</div>
            ) : qualified.length > 0 ? (
              <div className="rec-panel" style={{ overflowX: "auto" }}>
                <table className="rec-table">
                  <thead>
                    <tr>{["Candidate", "College", "Exam Type", "Score", "Decision", "Skills", "Action"].map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {qualified.map((s) => (
                      <tr key={s.id || s.student_id} className="rec-row-hover">
                        <td>
                          <div style={{ fontWeight: 600, color: B.text }}>{s.name || s.student_id}</div>
                          <div style={{ fontSize: 11, color: B.dim }}>{s.email || ""}</div>
                        </td>
                        <td style={{ color: B.dim }}>{s.college || "—"}</td>
                        <td><span className="rec-tag">{s.examType || "—"}</span></td>
                        <td>
                          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: B.greenBg, color: B.green, border: `1px solid ${B.greenBorder}` }}>
                            {Math.round(s.totalScore)}%
                          </span>
                        </td>
                        <td>
                          {s.decision ? (
                            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(s.decision), color: decisionColor(s.decision) }}>
                              {s.decision}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(s.skills || []).slice(0, 2).map((sk) => (
                              <span key={sk} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: B.accentLight, border: `1px solid ${B.accentBorder}`, color: B.accent }}>
                                {sk}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button className="rec-schedule-btn" onClick={() => { setSelectedStudent(s); setShowModal(true); }}>
                            Schedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ padding: 24, textAlign: "center", color: B.dim, background: "#fff", borderRadius: 12, border: "1px solid #dbeafe" }}>
                No shortlisted candidates
              </p>
            )}
          </div>

          {/* Under review table */}
          <div>
            <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: B.orange }}>
              Under Review (&lt;{selectedCriteria}%)
            </h2>
            {notQualified.length > 0 ? (
              <div className="rec-panel" style={{ overflowX: "auto" }}>
                <table className="rec-table">
                  <thead>
                    <tr>{["Candidate", "College", "Exam Type", "Score", "Decision", "Action"].map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {notQualified.map((s) => (
                      <tr key={s.id || s.student_id} className="rec-row-hover">
                        <td><div style={{ fontWeight: 600, color: B.text }}>{s.name || s.student_id}</div></td>
                        <td style={{ color: B.dim }}>{s.college || "—"}</td>
                        <td><span className="rec-tag">{s.examType || "—"}</span></td>
                        <td>
                          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: B.redBg, color: B.red, border: `1px solid ${B.redBorder}` }}>
                            {Math.round(s.totalScore)}%
                          </span>
                        </td>
                        <td>
                          {s.decision ? (
                            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(s.decision), color: decisionColor(s.decision) }}>
                              {s.decision}
                            </span>
                          ) : "—"}
                        </td>
                        <td><button className="rec-retake-btn">Request Retake</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ padding: 24, textAlign: "center", color: B.dim, background: "#fff", borderRadius: 12, border: "1px solid #dbeafe" }}>
                No candidates under review
              </p>
            )}
          </div>
        </>
      )}

      {/* ══════════════ REPORTS TAB ══════════════ */}
      {activeTab === "reports" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard
              label="Total Candidates" value={allCandidates.length} color={B.accent} delay={0}
              iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <StatCard
              label="Avg Score"
              value={allCandidates.length > 0 ? Math.round(allCandidates.reduce((a, c) => a + c.totalScore, 0) / allCandidates.length) + "%" : "—"}
              color="#0369a1" delay={0.05}
              iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
            <StatCard
              label="Hire Rate"
              value={allCandidates.length > 0 ? Math.round((allCandidates.filter((c) => c.decision === "Hire").length / allCandidates.length) * 100) + "%" : "—"}
              color={B.green} delay={0.1}
              iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </div>

          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: B.text }}>Performance by Exam Type</h2>
          {Object.keys(examTypeStats).length === 0 ? (
            <p style={{ padding: 24, textAlign: "center", color: B.dim, background: "#fff", borderRadius: 12, border: "1px solid #dbeafe" }}>
              No data available
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 16, marginBottom: 28 }}>
              {Object.entries(examTypeStats).map(([type, stats]) => (
                <div key={type} className="rec-panel">
                  <div className="rec-panel-header">
                    <div style={{ fontWeight: 700, fontSize: 14, color: B.text }}>{type}</div>
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff" }}>
                      {stats.total}
                    </span>
                  </div>
                  <div style={{ padding: 18 }}>
                    {[
                      ["Total Candidates",   stats.total,     B.text],
                      ["Shortlisted (≥70%)", stats.qualified, B.green],
                      ["Average Score",      `${stats.avg}%`, "#0369a1"],
                    ].map(([l, v, col], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, marginBottom: 10, borderBottom: i < 2 ? "1px solid #eff6ff" : "none" }}>
                        <span style={{ fontSize: 13, color: B.dim }}>{l}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{v}</span>
                      </div>
                    ))}
                    <button className="rec-ai-full-btn" onClick={openAI}>Analyse with AI</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: B.text }}>All Candidate Reports</h2>
            <select
              className="rec-type-select"
              style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
            >
              {examTypeOptions.map((t) => <option key={t} value={t}>{t === "ALL" ? "All Exams" : t}</option>)}
            </select>
          </div>

          {backendLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: B.dim }}>Loading…</div>
          ) : filteredCandidates.length > 0 ? (
            <div className="rec-panel" style={{ overflowX: "auto" }}>
              <table className="rec-table">
                <thead>
                  <tr>{["Candidate", "College", "Exam Type", "Score", "Coding", "Problem Solving", "Decision"].map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => (
                    <tr key={c.id || c.student_id} className="rec-row-hover">
                      <td><div style={{ fontWeight: 600, color: B.text }}>{c.name || c.student_id}</div></td>
                      <td style={{ color: B.dim }}>{c.college || "—"}</td>
                      <td><span className="rec-tag">{c.examType || "—"}</span></td>
                      <td>
                        <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: c.totalScore >= 70 ? B.greenBg : B.redBg, color: c.totalScore >= 70 ? B.green : B.red, border: `1px solid ${c.totalScore >= 70 ? B.greenBorder : B.redBorder}` }}>
                          {Math.round(c.totalScore)}%
                        </span>
                      </td>
                      <td style={{ color: B.dim }}>{c.codingSkill ? Math.round(c.codingSkill) : "—"}</td>
                      <td style={{ color: B.dim }}>{c.problemSolving ? Math.round(c.problemSolving) : "—"}</td>
                      <td>
                        {c.decision ? (
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(c.decision), color: decisionColor(c.decision) }}>
                            {c.decision}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: 24, textAlign: "center", color: B.dim, background: "#fff", borderRadius: 12, border: "1px solid #dbeafe" }}>
              No candidates found
            </p>
          )}
        </>
      )}

      {/* ══════════════ SCHEDULE MODAL ══════════════ */}
      {showModal && selectedStudent && (
        <div className="rec-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="rec-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <h2>Schedule Interview — {selectedStudent.name || selectedStudent.student_id}</h2>
              <button className="rec-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="rec-modal-body">
              <div className="rec-modal-info">
                {[
                  ["Name",      selectedStudent.name || selectedStudent.student_id],
                  ["Score",     `${Math.round(selectedStudent.totalScore)}%`],
                  ["Exam Type", selectedStudent.examType || "—"],
                  ["Decision",  selectedStudent.decision || "Pending"],
                ].map(([l, v], i) => (
                  <div key={i} className="rec-modal-info-row">
                    <span className="rec-modal-info-label">{l}:</span>
                    <span className="rec-modal-info-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="rec-modal-field">
                <label className="rec-modal-label">Interview Date</label>
                <input type="date" className="rec-modal-input" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div className="rec-modal-field">
                <label className="rec-modal-label">Interview Time</label>
                <input type="time" className="rec-modal-input" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
              <div className="rec-modal-field">
                <label className="rec-modal-label">Interview Type</label>
                <select className="rec-modal-select" value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                  <option>Technical Round</option>
                  <option>HR Round</option>
                  <option>Final Round</option>
                </select>
              </div>
              <div className="rec-modal-field">
                <label className="rec-modal-label">Interviewer Email</label>
                <input type="email" placeholder="interviewer@company.com" className="rec-modal-input" value={scheduleEmail} onChange={(e) => setScheduleEmail(e.target.value)} />
              </div>

              <div className="rec-modal-actions">
                <button
                  className="rec-modal-submit"
                  onClick={() => {
                    // TODO: wire to your backend schedule API
                    alert(`Interview scheduled for ${selectedStudent.name || selectedStudent.student_id} on ${scheduleDate} at ${scheduleTime}`);
                    setShowModal(false);
                  }}
                >
                  Schedule Interview
                </button>
                <button className="rec-modal-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ AI CHAT DRAWER + BUBBLE ══════════════ */}
      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} liveData={allCandidates} />
      {!aiOpen && <AIBubble onClick={openAI} hasUnread={aiUnread} />}
    </RecruiterLayout>
  );
}
