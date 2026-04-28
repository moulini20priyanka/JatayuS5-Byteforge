// RecruiterReports.jsx
// Hiring report UI - Plagiarism column & loader removed, Plagiarism tab shows static sample content

import React, { useState, useEffect } from "react";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const SKILL_COLORS = [C.purple, C.green, C.blue, C.orange, C.accent, C.red];

// ── Static hiring candidates (RMKEC 2026 batch) ──────────────────────────────
const STATIC_CANDIDATES = [
  {
    student_id: "s_001",
    name: "Moulini S",
    linkedin_name: "Moulini S",
    email: "moul22058.it@rmkec.ac.in",
    college: "RMKEC",
    branch: "IT",
    batch: 2026,
    cgpa: 7.75,
    nth_percentage: 79.50,
    twelfth_percentage: 68.00,
    backlogs: 0,
    github_score: 65,
    leetcode_score: 58,
    test_score: 72,
    total_score: 65,
    github_repos: 10,
    github_weekly_commits: 3,
    github_total_commits: 28,
    consistency_score: 27,
    leetcode_easy: 24,
    leetcode_medium: 12,
    leetcode_hard: 2,
    leetcode_ranking: 728569,
    mcq_score: 70,
    sql_score: 65,
    coding_score: 80,
    github_top_languages: JSON.stringify(["Python", "JavaScript"]),
    leetcode_languages: JSON.stringify(["Python", "C++"]),
    all_skills: JSON.stringify(["Python", "JavaScript", "React", "SQL"]),
    hiring_exam: "Virtusa – Full Stack Developer",
    status: "ready",
    __evaluation: {
      overall_score: 65,
      decision: "Maybe",
      confidence: "Medium",
      risk: "Medium",
      recommendation: "Candidate shows decent coding skills. Consider for junior role.",
      dimension_scores: { coding_skill: 65, problem_solving: 58, consistency: 27, professional_presence: 50, test_performance: 72 },
      unified_scores: { test_performance: { source: "test" } },
      source_status: { github: "real", leetcode: "real", linkedin: "estimated" },
      missing_sources: ["linkedin"],
      insights: [
        { type: "positive", section: "coding", message: "Active GitHub presence with regular commits.", severity: "low" },
        { type: "warning", section: "consistency", message: "Low consistency score flagged.", severity: "medium" },
      ],
      decision_insights: ["Strong coding skills.", "Excellent problem solving.", "Low consistency flagged.", "Professional presence unclear.", "No test performance data."],
      chart_data: { pie: [{ name: "GitHub", value: 40 }, { name: "LeetCode", value: 35 }, { name: "Test", value: 25 }] },
    },
  },
  {
    student_id: "s_002",
    name: "Shreya S",
    linkedin_name: "Shreya S",
    email: "sshr22084.it@rmkec.ac.in",
    college: "RMKEC",
    branch: "IT",
    batch: 2026,
    cgpa: 9.80,
    nth_percentage: 90.57,
    twelfth_percentage: 77.45,
    backlogs: 0,
    github_score: 88,
    leetcode_score: 82,
    test_score: 91,
    total_score: 87,
    github_repos: 18,
    github_weekly_commits: 7,
    github_total_commits: 64,
    consistency_score: 82,
    leetcode_easy: 45,
    leetcode_medium: 28,
    leetcode_hard: 8,
    leetcode_ranking: 42310,
    mcq_score: 88,
    sql_score: 94,
    coding_score: 92,
    github_top_languages: JSON.stringify(["Java", "Python", "TypeScript"]),
    leetcode_languages: JSON.stringify(["Java", "Python"]),
    all_skills: JSON.stringify(["Java", "Python", "TypeScript", "Spring Boot", "SQL", "React"]),
    hiring_exam: "Virtusa – Full Stack Developer",
    status: "ready",
    __evaluation: {
      overall_score: 87,
      decision: "Hire",
      confidence: "High",
      risk: "Low",
      recommendation: "Strong candidate across all dimensions. Recommend for immediate hire.",
      dimension_scores: { coding_skill: 88, problem_solving: 82, consistency: 82, professional_presence: 75, test_performance: 91 },
      unified_scores: { test_performance: { source: "test" } },
      source_status: { github: "real", leetcode: "real", linkedin: "real" },
      missing_sources: [],
      insights: [
        { type: "positive", section: "coding", message: "Exceptional GitHub activity with 64 total commits.", severity: "low" },
        { type: "positive", section: "problem_solving", message: "Top 5% globally on LeetCode.", severity: "low" },
      ],
      decision_insights: ["Outstanding coding ability.", "Excellent problem solving — top 5% globally.", "Highly consistent contributor.", "Strong professional presence.", "Top test performance."],
      chart_data: { pie: [{ name: "GitHub", value: 35 }, { name: "LeetCode", value: 30 }, { name: "LinkedIn", value: 15 }, { name: "Test", value: 20 }] },
    },
  },
  {
    student_id: "s_003",
    name: "Lokshana Dharshini D V",
    linkedin_name: "Lokshana Dharshini D V",
    email: "loks22053.it@rmkec.ac.in",
    college: "RMKEC",
    branch: "IT",
    batch: 2026,
    cgpa: 8.07,
    nth_percentage: 75.39,
    twelfth_percentage: 70.29,
    backlogs: 0,
    github_score: 71,
    leetcode_score: 63,
    test_score: 78,
    total_score: 71,
    github_repos: 12,
    github_weekly_commits: 4,
    github_total_commits: 38,
    consistency_score: 55,
    leetcode_easy: 30,
    leetcode_medium: 15,
    leetcode_hard: 3,
    leetcode_ranking: 215430,
    mcq_score: 75,
    sql_score: 80,
    coding_score: 79,
    github_top_languages: JSON.stringify(["Python", "C++"]),
    leetcode_languages: JSON.stringify(["C++", "Python"]),
    all_skills: JSON.stringify(["Python", "C++", "SQL", "Django"]),
    hiring_exam: "Virtusa – Full Stack Developer",
    status: "ready",
    __evaluation: {
      overall_score: 71,
      decision: "Hire",
      confidence: "Medium",
      risk: "Low",
      recommendation: "Good all-round profile. Hire for backend-focused role.",
      dimension_scores: { coding_skill: 71, problem_solving: 63, consistency: 55, professional_presence: 60, test_performance: 78 },
      unified_scores: { test_performance: { source: "test" } },
      source_status: { github: "real", leetcode: "real", linkedin: "estimated" },
      missing_sources: ["linkedin"],
      insights: [
        { type: "positive", section: "coding", message: "Consistent GitHub contributions.", severity: "low" },
        { type: "info", section: "profile", message: "LinkedIn data estimated — encourage profile update.", severity: "low" },
      ],
      decision_insights: ["Good coding ability.", "Solid problem solving.", "Moderate consistency.", "Professional presence needs improvement.", "Good test performance."],
      chart_data: { pie: [{ name: "GitHub", value: 38 }, { name: "LeetCode", value: 32 }, { name: "Test", value: 30 }] },
    },
  },
  {
    student_id: "s_004",
    name: "Kavithaa K A",
    linkedin_name: "Kavithaa K A",
    email: "kavi22116.it@rmkec.ac.in",
    college: "RMKEC",
    branch: "IT",
    batch: 2026,
    cgpa: 5.50,
    nth_percentage: 60.00,
    twelfth_percentage: 60.00,
    backlogs: 0,
    github_score: 34,
    leetcode_score: 28,
    test_score: 41,
    total_score: 35,
    github_repos: 4,
    github_weekly_commits: 1,
    github_total_commits: 8,
    consistency_score: 18,
    leetcode_easy: 10,
    leetcode_medium: 3,
    leetcode_hard: 0,
    leetcode_ranking: 890120,
    mcq_score: 40,
    sql_score: 38,
    coding_score: 44,
    github_top_languages: JSON.stringify(["HTML", "CSS"]),
    leetcode_languages: JSON.stringify(["C"]),
    all_skills: JSON.stringify(["HTML", "CSS", "C"]),
    hiring_exam: "Virtusa – Full Stack Developer",
    status: "ready",
    __evaluation: {
      overall_score: 35,
      decision: "Reject",
      confidence: "High",
      risk: "High",
      recommendation: "Below threshold across all dimensions. Not recommended at this time.",
      dimension_scores: { coding_skill: 34, problem_solving: 28, consistency: 18, professional_presence: 30, test_performance: 41 },
      unified_scores: { test_performance: { source: "test" } },
      source_status: { github: "real", leetcode: "real", linkedin: "missing" },
      missing_sources: ["linkedin"],
      insights: [
        { type: "warning", section: "coding", message: "Very low GitHub activity — only 8 total commits.", severity: "high" },
        { type: "warning", section: "problem_solving", message: "Minimal LeetCode practice.", severity: "high" },
      ],
      decision_insights: ["Weak coding ability.", "Insufficient problem solving practice.", "Very low consistency.", "No LinkedIn presence.", "Below average test performance."],
      chart_data: { pie: [{ name: "GitHub", value: 45 }, { name: "LeetCode", value: 35 }, { name: "Test", value: 20 }] },
    },
  },
  {
    student_id: "s_005",
    name: "Anusha P M",
    linkedin_name: "Anusha P M",
    email: "pman22068.it@rmkec.ac.in",
    college: "RMKEC",
    branch: "IT",
    batch: 2026,
    cgpa: 9.37,
    nth_percentage: 85.61,
    twelfth_percentage: 92.14,
    backlogs: 0,
    github_score: 83,
    leetcode_score: 79,
    test_score: 88,
    total_score: 83,
    github_repos: 16,
    github_weekly_commits: 6,
    github_total_commits: 55,
    consistency_score: 74,
    leetcode_easy: 40,
    leetcode_medium: 22,
    leetcode_hard: 5,
    leetcode_ranking: 68900,
    mcq_score: 86,
    sql_score: 90,
    coding_score: 88,
    github_top_languages: JSON.stringify(["JavaScript", "React", "Node.js"]),
    leetcode_languages: JSON.stringify(["JavaScript", "Python"]),
    all_skills: JSON.stringify(["JavaScript", "React", "Node.js", "Python", "SQL", "MongoDB"]),
    hiring_exam: "Virtusa – Full Stack Developer",
    status: "ready",
    __evaluation: {
      overall_score: 83,
      decision: "Hire",
      confidence: "High",
      risk: "Low",
      recommendation: "Excellent full-stack profile. Strong recommendation for hire.",
      dimension_scores: { coding_skill: 83, problem_solving: 79, consistency: 74, professional_presence: 70, test_performance: 88 },
      unified_scores: { test_performance: { source: "test" } },
      source_status: { github: "real", leetcode: "real", linkedin: "real" },
      missing_sources: [],
      insights: [
        { type: "positive", section: "coding", message: "Strong full-stack skills across JS ecosystem.", severity: "low" },
        { type: "positive", section: "test", message: "Excellent SQL score — 90/100.", severity: "low" },
      ],
      decision_insights: ["Strong coding ability in full-stack.", "Excellent problem solving.", "Good consistency.", "Strong professional presence.", "Top test scores."],
      chart_data: { pie: [{ name: "GitHub", value: 35 }, { name: "LeetCode", value: 30 }, { name: "LinkedIn", value: 15 }, { name: "Test", value: 20 }] },
    },
  },
];

// ── helpers ───────────────────────────────────────────────────────
const safeArr    = v => { try { return Array.isArray(v) ? v : JSON.parse(v || "[]"); } catch { return []; } };
const scoreColor = s => +s >= 70 ? C.green : +s >= 40 ? C.orange : C.red;
const decColor   = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
const decBg      = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

// ── Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, size = 56, color }) {
  const c    = color || scoreColor(score);
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+3} textAnchor="middle" fill={C.text}
        fontSize={size > 60 ? 14 : 11} fontWeight="700" fontFamily="'DM Sans',sans-serif">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

function ProgBar({ label, value, color = C.accent }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value != null ? `${Math.round(value)}/100` : "—"}</span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 4, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value || 0, 100)}%`, height: "100%", background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 4, transition: "width 0.7s ease" }}/>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }) {
  if (!decision) return <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: decBg(decision), color: decColor(decision) }}>
      {decision}
    </span>
  );
}

// ── Card helpers ──────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 18px", ...style }}>{children}</div>;
}
function CardTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

// ── Insight item ──────────────────────────────────────────────────
function InsightItem({ type, section, message, severity }) {
  const map = {
    positive: { bg: C.greenBg,  border: C.greenBorder || "#bbf7d0", dot: C.green,  text: C.green  },
    warning:  { bg: C.orangeBg, border: "#fed7aa",                   dot: C.orange, text: C.orange },
    info:     { bg: C.blueBg || "#eff6ff", border: "#bfdbfe",        dot: C.blue,   text: C.blue   },
  };
  const s   = map[type] || map.info;
  const sev = { high: "HIGH", medium: "MED", low: "LOW" }[severity] || "";
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, border: `2px solid ${C.white}`, boxShadow: `0 0 0 2px ${s.dot}33`, marginTop: 14, flexShrink: 0 }}/>
        <div style={{ width: 1, flex: 1, background: `${s.dot}30`, marginTop: 2 }}/>
      </div>
      <div style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9, padding: "10px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
          {section && <span style={{ fontSize: 10, fontWeight: 700, color: s.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>{section.replace(/_/g, " ")}</span>}
          {sev && <span style={{ fontSize: 9, fontWeight: 700, color: s.dot, background: `${s.dot}20`, borderRadius: 4, padding: "1px 5px" }}>{sev}</span>}
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{message}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Plagiarism Detail Panel - STATIC SAMPLE CONTENT
// ══════════════════════════════════════════════════════════════════
function PlagiarismDetailPanel({ studentId, onClose }) {
  // Static sample data for demonstration
  const sampleData = {
    riskLevel: "Clean",
    riskColor: "#0a8f5c",
    riskBg: "#d9f5ec",
    riskBorder: "#6ee7b7",
    similarityScore: 12,
    matchedCandidates: [],
    codeTimeline: [
      { snapshot: 1, chars: 45, timestamp: "10:02 AM" },
      { snapshot: 2, chars: 128, timestamp: "10:15 AM" },
      { snapshot: 3, chars: 256, timestamp: "10:34 AM" },
      { snapshot: 4, chars: 412, timestamp: "11:02 AM" },
      { snapshot: 5, chars: 589, timestamp: "11:28 AM" },
    ],
    analysis: [
      { label: "Code Originality", value: "94%", status: "good" },
      { label: "Syntax Patterns", value: "Unique", status: "good" },
      { label: "Variable Naming", value: "Consistent", status: "good" },
      { label: "Logic Flow", value: "Independent", status: "good" },
    ],
    insights: [
      { type: "positive", message: "Code structure shows independent problem-solving approach." },
      { type: "positive", message: "Variable naming conventions are unique to this candidate." },
      { type: "info", message: "Minor similarity detected in boilerplate setup code (common pattern)." },
    ],
  };

  return (
    <div style={{ background: "#fafbff", border: `1px solid ${sampleData.riskBorder}`, borderRadius: 12, padding: 18, position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 14, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

      {/* Header Banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, padding: "12px 16px", background: sampleData.riskBg, border: `1px solid ${sampleData.riskBorder}`, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: sampleData.riskColor, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Plagiarism Check</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: sampleData.riskColor }}>{sampleData.riskLevel}</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: sampleData.riskColor, fontFamily: "monospace" }}>
          {sampleData.similarityScore}%
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.dim }}>
          Similarity Score
        </div>
      </div>

      {/* Code Timeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Code Development Timeline</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
          {sampleData.codeTimeline.map((t, i) => {
            const maxChars = Math.max(...sampleData.codeTimeline.map(x => x.chars), 1);
            const h = Math.max(4, (t.chars / maxChars) * 48);
            return (
              <div key={i} title={`Snapshot ${t.snapshot} — ${t.chars} chars at ${t.timestamp}`}
                style={{ flex: 1, height: h, background: C.accent, borderRadius: "2px 2px 0 0", opacity: 0.35 + (i / sampleData.codeTimeline.length) * 0.65 }}/>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, marginTop: 4 }}>
          <span>Start</span><span style={{ fontFamily: "monospace" }}>{sampleData.codeTimeline.length} snapshots</span><span>Latest</span>
        </div>
      </div>

      {/* Analysis Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
        {sampleData.analysis.map((item, i) => (
          <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: item.status === "good" ? C.green : C.orange }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Analysis Insights</div>
        <div style={{ paddingLeft: 4 }}>
          {sampleData.insights.map((ins, i) => (
            <InsightItem key={i} type={ins.type} section="" message={ins.message} severity="low" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Interview Scheduling Modal
// ══════════════════════════════════════════════════════════════════
function InterviewModal({ candidate, onClose, onScheduled }) {
  const [form, setForm] = useState({ date: "", time: "", type: "Technical Round", interviewer: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.date || !form.time) return;
    setSaving(true);
    try {
      await axios.post(`${API}/interviews/schedule`, {
        student_id:        candidate.student_id,
        interview_date:    form.date,
        interview_time:    form.time,
        interview_type:    form.type,
        interviewer_email: form.interviewer,
        notes:             form.notes,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("recruiter_token")}` } });
    } catch { /* graceful */ }
    setDone(true);
    setSaving(false);
    onScheduled && onScheduled(candidate);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(10,42,65,.2)", animation: "fadeUp .2s ease", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 22px", background: C.accentLight, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {(candidate.linkedin_name || candidate.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{done ? "Interview Scheduled!" : "Schedule Interview"}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{candidate.linkedin_name || candidate.name} · {candidate.college || "—"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: C.muted }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 6 }}>Scheduled Successfully</div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 20 }}>{form.date} at {form.time} · {form.type}</div>
            <button onClick={onClose} style={{ padding: "9px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ label: "Date *", key: "date", type: "date" }, { label: "Time *", key: "time", type: "time" }].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }}/>
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Interview Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, outline: "none" }}>
                {["Technical Round","HR Round","Final Round","Aptitude Round","Group Discussion"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Interviewer Email</label>
              <input type="email" value={form.interviewer} onChange={e => set("interviewer", e.target.value)} placeholder="interviewer@company.com"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }}/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none", resize: "vertical" }}/>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submit} disabled={saving || !form.date || !form.time}
                style={{ flex: 1, padding: "10px", background: !form.date || !form.time ? "#cbd5e1" : C.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: !form.date || !form.time ? "not-allowed" : "pointer" }}>
                {saving ? "Scheduling…" : "Schedule Interview"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: C.accentLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Overview Tab
// ══════════════════════════════════════════════════════════════════
function OverviewTab({ c }) {
  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const allSkills   = safeArr(c.all_skills);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Academic strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "CGPA",    value: c.cgpa || "—",                                                    color: C.accent  },
          { label: "10th %",  value: c.nth_percentage != null ? `${c.nth_percentage}%` : "—",           color: C.blue    },
          { label: "12th %",  value: c.twelfth_percentage != null ? `${c.twelfth_percentage}%` : "—",   color: C.purple  },
          { label: "Backlogs",value: c.backlogs ?? 0,                                                   color: (c.backlogs > 0) ? C.red : C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Coding Skill",    value: c.github_score    || 0, color: C.purple, sub: "GitHub-based"    },
          { label: "Problem Solving", value: c.leetcode_score  || 0, color: C.green,  sub: "LeetCode-based"  },
          { label: "Consistency",     value: c.consistency_score ?? "—", color: C.blue, sub: "Avg across platforms" },
          { label: "Test Score",      value: c.test_score      || 0, color: C.orange, sub: "MCQ+SQL+Code"    },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} style={{ borderTop: `3px solid ${color}`, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{value}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <CardTitle>GitHub Analysis</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              ["Repositories",   c.github_repos          || 0],
              ["Weekly Commits", c.github_weekly_commits  || 0],
              ["Total Commits",  c.github_total_commits   || 0],
              ["Consistency",    c.consistency_score != null ? `${c.consistency_score}/100` : "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.bg || "#f0fafb", borderRadius: 7, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Languages Used</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {githubLangs.length
              ? githubLangs.map(l => <span key={l} style={{ fontSize: 11, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "3px 9px", fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>No languages detected</span>}
          </div>
        </Card>

        <Card>
          <CardTitle>LeetCode Analysis</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[["Easy", c.leetcode_easy || 0, C.green], ["Medium", c.leetcode_medium || 0, C.orange], ["Hard", c.leetcode_hard || 0, C.red]].map(([l, v, col]) => (
              <div key={l} style={{ background: C.bg || "#f0fafb", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, background: C.bg || "#f0fafb", borderRadius: 7, padding: "10px 14px" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Global Ranking</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.purple }}>{c.leetcode_ranking ? `#${Number(c.leetcode_ranking).toLocaleString()}` : "N/A"}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Coding Languages</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {lcLangs.length
              ? lcLangs.map(l => <span key={l} style={{ fontSize: 11, background: C.greenBg, color: C.green, borderRadius: 20, padding: "3px 9px", fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>No data</span>}
          </div>
        </Card>

        <Card>
          <CardTitle>Test Performance</CardTitle>
          {c.mcq_score != null || c.sql_score != null || c.coding_score != null ? (
            <>
              <ProgBar label="MCQ"    value={c.mcq_score}    color={C.blue}/>
              <ProgBar label="SQL"    value={c.sql_score}    color={C.green}/>
              <ProgBar label="Coding" value={c.coding_score} color={C.orange}/>
              <div style={{ marginTop: 12, padding: "10px 14px", background: C.bg || "#f0fafb", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Overall Test Score</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(c.test_score || 0) }}>{c.test_score || 0}/100</span>
              </div>
            </>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: C.dim, fontSize: 12, fontStyle: "italic" }}>No test scores recorded</div>
          )}
        </Card>

        <Card>
          <CardTitle>Skill Profile &amp; Links</CardTitle>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
            {allSkills.length
              ? allSkills.map((l, i) => (
                  <span key={l} style={{ fontSize: 11, background: SKILL_COLORS[i % SKILL_COLORS.length] + "18", color: SKILL_COLORS[i % SKILL_COLORS.length], borderRadius: 20, padding: "3px 9px", fontWeight: 600, border: `1px solid ${SKILL_COLORS[i % SKILL_COLORS.length]}30` }}>{l}</span>
                ))
              : <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>No skill data</span>}
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Profile Links</div>
          {[["GitHub", c.github_url], ["LinkedIn", c.linkedin_url], ["LeetCode", c.leetcode_url]].map(([l, url]) => url && (
            <a key={l} href={url} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.accent, marginBottom: 7, textDecoration: "none" }}>
              <Icon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" size={11} color={C.accent} strokeWidth={2}/>
              {l}
            </a>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// AI Report Tab
// ══════════════════════════════════════════════════════════════════
const RAD = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RAD)} y={cy + r * Math.sin(-midAngle * RAD)}
      fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function AIReportTab({ ev, c }) {
  if (!ev) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentLight, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={C.dim} strokeWidth="1.5">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>No AI Evaluation Found</div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>Student has not submitted for evaluation yet.</div>
    </div>
  );

  const dim      = ev.dimension_scores || {};
  const chart    = ev.chart_data       || {};
  const sources  = ev.source_status    || {};
  const missing  = ev.missing_sources  || [];
  const insights = ev.insights         || [];
  const dc       = decColor(ev.decision);
  const dBg      = decBg(ev.decision);
  const PIE_COLORS = [C.purple, C.green, C.accent, C.orange];

  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const allSkills   = safeArr(c.all_skills);

  const pieData = chart.pie?.filter(d => d.value > 0) || Object.entries(sources).filter(([,v]) => v === "real").map(([k]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: 25,
  }));

  const skillBarData = allSkills.slice(0, 6).map((skill, i) => ({
    name:  skill.length > 10 ? skill.slice(0, 10) : skill,
    score: githubLangs.includes(skill) && lcLangs.includes(skill) ? 90 : githubLangs.includes(skill) ? 75 : lcLangs.includes(skill) ? 65 : 45,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
  }));

  const testBar = c.mcq_score != null ? [
    { name: "MCQ",    score: c.mcq_score    || 0 },
    { name: "SQL",    score: c.sql_score    || 0 },
    { name: "Coding", score: c.coding_score || 0 },
  ] : (chart.testBar || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: dBg, border: `1px solid ${dc}30`, borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <ScoreRing score={ev.overall_score || 0} size={80} color={dc}/>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: dc + "20", color: dc }}>{ev.decision || "—"}</span>
            <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>
            <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#f1f5f9", color: C.muted }}>Risk: {ev.risk}</span>
          </div>
          {ev.recommendation && <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.7 }}>{ev.recommendation}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(sources).map(([src, status]) => {
            const col = status === "real" ? C.green : status === "estimated" ? C.orange : C.red;
            const bg  = status === "real" ? C.greenBg : status === "estimated" ? C.orangeBg : C.redBg;
            return <span key={src} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: col, whiteSpace: "nowrap" }}>{src.charAt(0).toUpperCase() + src.slice(1)} — {status?.toUpperCase()}</span>;
          })}
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ background: C.orangeBg, border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.orange }}>
          Missing sources: {missing.join(", ")}. Scores estimated and carry lower confidence.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <CardTitle>Source Contribution</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} dataKey="value" labelLine={false} label={PieLabel}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}%`, n]}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {testBar.length > 0 ? (
          <Card>
            <CardTitle>Test Performance Breakdown</CardTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={testBar} layout="vertical" margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.text }} tickLine={false} width={55}/>
                <Tooltip formatter={v => [`${v}/100`, "Score"]}/>
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {testBar.map((_, i) => <Cell key={i} fill={[C.blue, C.green, C.purple][i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card><CardTitle>Test Performance</CardTitle><div style={{ padding: "40px 0", textAlign: "center", color: C.dim, fontSize: 12, fontStyle: "italic" }}>No test data recorded</div></Card>
        )}
      </div>

      {skillBarData.length > 0 && (
        <Card>
          <CardTitle>Language &amp; Skill Strength</CardTitle>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
            Skills scored by cross-platform presence — both GitHub &amp; LeetCode: 90, GitHub only: 75, LeetCode only: 65, resume only: 45.
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={skillBarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.text }} tickLine={false}/>
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} tickLine={false}/>
              <Tooltip formatter={v => [`${v}`, "Strength Score"]}/>
              <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                {skillBarData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <CardTitle>Dimension Score Breakdown</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <ProgBar label="Coding Skill"          value={dim.coding_skill}          color={C.purple}/>
            <ProgBar label="Problem Solving"       value={dim.problem_solving}       color={C.green}/>
            <ProgBar label="Consistency"           value={dim.consistency}           color={C.blue}/>
          </div>
          <div>
            <ProgBar label="Professional Presence" value={dim.professional_presence} color={C.orange}/>
            {dim.test_performance != null && <ProgBar label="Test Performance" value={dim.test_performance} color={C.accent}/>}
          </div>
        </div>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardTitle>AI Insights</CardTitle>
          <div style={{ paddingLeft: 4 }}>
            {insights.map((ins, i) => <InsightItem key={i} {...ins}/>)}
          </div>
        </Card>
      )}

      {(ev.decision_insights || []).length > 0 && (
        <Card>
          <CardTitle>Dimension-by-Dimension Analysis</CardTitle>
          {ev.decision_insights.map((msg, i) => {
            const labels = ["Coding Ability", "Problem Solving", "Consistency", "Professional Presence", "Test Performance"];
            const colors = [C.purple, C.green, C.blue, C.orange, C.accent];
            return (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, padding: "10px 14px", background: C.accentLight, borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: colors[i] + "18", border: `1.5px solid ${colors[i]}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: colors[i], flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: colors[i], textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{labels[i] || `Dimension ${i+1}`}</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{msg}</div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Report Modal
// ══════════════════════════════════════════════════════════════════
function ReportModal({ candidate, onClose, onScheduleInterview }) {
  const [tab, setTab] = useState("overview");
  if (!candidate) return null;

  const ev     = candidate.__evaluation;
  const score  = candidate.total_score || 0;
  const ringC  = scoreColor(score);
  const dc     = ev?.decision ? decColor(ev.decision) : null;
  const dBg    = ev?.decision ? decBg(ev.decision)    : null;
  const rec    = score >= 70 ? "Strong Yes" : score >= 50 ? "Yes" : score >= 30 ? "Maybe" : "No";
  const recC   = score >= 70 ? C.green : score >= 50 ? C.accent : score >= 30 ? C.orange : C.red;
  const recBg  = score >= 70 ? C.greenBg : score >= 50 ? C.accentLight : score >= 30 ? C.orangeBg : C.redBg;

  const handleDownload = () => {
    const content = `
CANDIDATE REPORT — ${candidate.hiring_exam || "Hiring Exam"}
${"=".repeat(60)}

Candidate   : ${candidate.linkedin_name || candidate.name}
College     : ${candidate.college} | Branch: ${candidate.branch || "—"} | Batch: ${candidate.batch || "—"}
Email       : ${candidate.email || "—"}

ACADEMIC
  CGPA           : ${candidate.cgpa || "—"}
  10th %         : ${candidate.nth_percentage ? candidate.nth_percentage + "%" : "—"}
  12th %         : ${candidate.twelfth_percentage ? candidate.twelfth_percentage + "%" : "—"}
  Backlogs       : ${candidate.backlogs ?? "—"}

SCORES
  GitHub Score   : ${candidate.github_score}/100
  LeetCode Score : ${candidate.leetcode_score}/100
  Test Score     : ${candidate.test_score}/100
  Total Score    : ${candidate.total_score}/100

AI DECISION    : ${ev?.decision || "—"}
Confidence     : ${ev?.confidence || "—"}
Risk           : ${ev?.risk || "—"}

RECOMMENDATION : ${ev?.recommendation || "—"}

Generated on ${new Date().toLocaleString()}
    `.trim();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = `${(candidate.linkedin_name || candidate.name || "candidate").replace(/\s+/g, "_")}_report.txt`;
    a.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.bg || "#f0fafb", borderRadius: 16, width: "100%", maxWidth: 920, maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(10,42,65,.25)", animation: "fadeUp .22s ease" }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: "16px 24px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.accentLight, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{candidate.linkedin_name || candidate.name || candidate.student_id}</span>
              <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
              {ev?.decision && <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: dBg, color: dc }}>{ev.decision}</span>}
              {ev?.confidence && <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>
              {candidate.college || ""}{candidate.branch ? ` · ${candidate.branch}` : ""}{candidate.batch ? ` · Batch ${candidate.batch}` : ""}{candidate.email ? " · " + candidate.email : ""}
            </div>
            {candidate.hiring_exam && (
              <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: C.accent }}>📋 {candidate.hiring_exam}</div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <ScoreRing score={score} size={58} color={ringC}/>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Total Score</div>
          </div>
          <button onClick={handleDownload} title="Download Report"
            style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.accent, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            ↓ Download
          </button>
          <button onClick={() => { onClose(); onScheduleInterview(candidate); }}
            style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={12} color="#fff" strokeWidth={2}/>
            Schedule
          </button>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 17, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.border}`, paddingLeft: 16, flexShrink: 0 }}>
          {[{ id: "overview", label: "Overview" }, { id: "ai", label: "AI Report" }, { id: "plagiarism", label: "Plagiarism" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "11px 20px", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? (t.id === "plagiarism" ? C.purple : C.accent) : C.muted, borderBottom: tab === t.id ? `2px solid ${t.id === "plagiarism" ? C.purple : C.accent}` : "2px solid transparent", marginBottom: -1, transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {tab === "overview"   && <OverviewTab c={candidate}/>}
          {tab === "ai"         && <AIReportTab ev={ev} c={candidate}/>}
          {tab === "plagiarism" && (
            <PlagiarismDetailPanel
              studentId={candidate.student_id}
              onClose={() => setTab("overview")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Hiring Table - Plagiarism column REMOVED
// ══════════════════════════════════════════════════════════════════
function HiringTable({ candidates, onSelect, onSchedule, scheduledIds }) {
  if (candidates.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.dim, fontSize: 13, background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
        No candidates found.
      </div>
    );
  }

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
              {["#","Candidate","College","Branch","Batch","Score","AI Decision","Hiring Exam","Action"].map((h, i) => (
                <th key={i} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const score       = c.total_score || 0;
              const ev          = c.__evaluation;
              const dec         = ev?.decision;
              const langs       = safeArr(c.github_top_languages);
              const isScheduled = scheduledIds.has(c.student_id);

              const decColors = {
                Hire:   { bg: C.greenBg,  color: C.green  },
                Maybe:  { bg: C.orangeBg, color: C.orange },
                Reject: { bg: C.redBg,    color: C.red    },
              };
              const ds = decColors[dec] || { bg: "#f1f5f9", color: C.dim };

              return (
                <React.Fragment key={c.student_id || i}>
                  <tr
                    className="r-row"
                    style={{ borderBottom: `1px solid ${C.border}`, transition: "background .15s", cursor: "pointer" }}
                    onClick={() => onSelect(c)}
                  >
                    <td style={{ padding: "12px 14px", color: C.dim, fontFamily: "monospace", fontSize: 11 }}>{i + 1}</td>

                    <td style={{ padding: "12px 14px", minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{c.linkedin_name || c.name || c.student_id}</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {langs.slice(0, 2).map(l => (
                          <span key={l} style={{ fontSize: 9, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "1px 5px" }}>{l}</span>
                        ))}
                      </div>
                      {c.email && <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>{c.email}</div>}
                    </td>

                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.college || "—"}</span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, background: C.purpleBg, color: C.purple, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{c.branch || "—"}</span>
                    </td>

                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: C.muted }}>{c.batch || "—"}</td>

                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ScoreRing score={score} size={38} color={scoreColor(score)}/>
                        <div>
                          <div style={{ fontSize: 11, color: C.dim }}>GH: <span style={{ fontWeight: 700, color: C.purple }}>{c.github_score || 0}</span></div>
                          <div style={{ fontSize: 11, color: C.dim }}>LC: <span style={{ fontWeight: 700, color: C.green }}>{c.leetcode_score || 0}</span></div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      {dec
                        ? <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ds.bg, color: ds.color }}>{dec}</span>
                        : <span style={{ color: C.dim, fontSize: 12 }}>—</span>}
                    </td>

                    <td style={{ padding: "12px 14px", minWidth: 180 }}>
                      <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{c.hiring_exam || "—"}</span>
                    </td>

                    <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="r-btn-outline"
                          onClick={e => { e.stopPropagation(); onSelect(c); }}
                          style={{ padding: "5px 12px", background: C.accentLight, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
                          View Report
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onSchedule(c); }}
                          style={{ padding: "5px 10px", background: isScheduled ? C.greenBg : "#fff7ed", color: isScheduled ? C.green : C.orange, border: `1px solid ${isScheduled ? C.greenBorder || "#bbf7d0" : "#fed7aa"}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {isScheduled ? "✓ Sched." : "Interview"}
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function RecruiterReports() {
  const [allCandidates, setAllCandidates] = useState([]);
  const [search,         setSearch]        = useState("");
  const [filterCollege,  setFilterCollege] = useState("All");
  const [filterResult,   setFilterResult]  = useState("All");
  const [filterDecision, setFilterDecision]= useState("All");
  const [selected,       setSelected]      = useState(null);
  const [scheduling,     setScheduling]    = useState(null);
  const [scheduledIds,   setScheduledIds]  = useState(new Set());

  // Load static data on mount
  useEffect(() => {
    setAllCandidates(STATIC_CANDIDATES);
  }, []);

  const collegeOptions = ["All", ...Array.from(new Set(allCandidates.map(c => c.college).filter(Boolean))).sort()];

  const filtered = allCandidates.filter(c => {
    const name   = (c.linkedin_name || c.name || c.student_id || "").toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? "Pass" : "Fail";
    const dec    = c.__evaluation?.decision || null;
    const coll   = c.college || "";
    return (
      (!search || name.includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())) &&
      (filterCollege  === "All" || coll   === filterCollege) &&
      (filterResult   === "All" || result === filterResult) &&
      (filterDecision === "All" || dec    === filterDecision)
    );
  });

  const passCount      = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const hireCount      = filtered.filter(c => c.__evaluation?.decision === "Hire").length;
  const collegesCount  = new Set(allCandidates.map(c => c.college).filter(Boolean)).size;

  const handleExport = () => {
    const headers = ["Name","Email","College","Branch","Batch","CGPA","10th%","12th%","Backlogs","GitHub","LeetCode","Test","Total","Decision","Hiring Exam"];
    const rows = filtered.map(c => {
      return [
        c.linkedin_name||c.name||"", c.email||"", c.college||"", c.branch||"", c.batch||"",
        c.cgpa||"", c.nth_percentage||"", c.twelfth_percentage||"", c.backlogs??"",
        c.github_score||0, c.leetcode_score||0, Math.round(c.test_score||0), Math.round(c.total_score||0),
        c.__evaluation?.decision||"", c.hiring_exam||"",
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "recruiter_reports.csv";
    a.click();
  };

  return (
    <RecruiterLayout
      title="Reports"
      subtitle="AI-analyzed candidate profiles · RMKEC 2026 batch"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setAllCandidates([...STATIC_CANDIDATES])}
            style={{ padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.white, color: C.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={13} color={C.muted} strokeWidth={2}/>
            Refresh
          </button>
          <button onClick={handleExport} style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
        </div>
      }
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .r-row:hover { background: #e8fafb !important; }
        .r-btn-outline:hover { background: ${C.accent} !important; color:#fff !important; border-color:${C.accent} !important; }
      `}</style>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",          value: filtered.length,             color: C.accent },
          { label: "Colleges",       value: collegesCount,               color: C.blue   },
          { label: "Passed",         value: passCount,                   color: C.green  },
          { label: "AI Hire",        value: hireCount,                   color: C.green  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, marginRight: 6 }}>Filters</span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px" }}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={13} color={C.dim}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…"
            style={{ border: "none", outline: "none", fontSize: 12, color: C.text, background: "transparent", width: 160 }}/>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>College:</span>
          <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
            {collegeOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>Result:</span>
          <select value={filterResult} onChange={e => setFilterResult(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
            {["All","Pass","Fail"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>Decision:</span>
          <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
            {["All","Hire","Maybe","Reject"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <span style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", marginLeft: "auto" }}>
          Showing {filtered.length} of {allCandidates.length} candidates
        </span>
      </div>

      {/* Table */}
      <HiringTable
        candidates={filtered}
        onSelect={setSelected}
        onSchedule={setScheduling}
        scheduledIds={scheduledIds}
      />

      {/* Report Modal */}
      {selected && (
        <ReportModal
          candidate={selected}
          onClose={() => setSelected(null)}
          onScheduleInterview={c => { setSelected(null); setScheduling(c); }}
        />
      )}

      {/* Interview Modal */}
      {scheduling && (
        <InterviewModal
          candidate={scheduling}
          onClose={() => setScheduling(null)}
          onScheduled={c => setScheduledIds(p => new Set([...p, c.student_id]))}
        />
      )}
    </RecruiterLayout>
  );
}