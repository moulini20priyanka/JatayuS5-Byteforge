// RecruiterReports.jsx — College-tabbed reports with Plagiarism column + expandable panel
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const SKILL_COLORS = [C.purple, C.green, C.blue, C.orange, C.accent, C.red];

// ── helpers ───────────────────────────────────────────────────────
const safeArr    = v => { try { return Array.isArray(v) ? v : JSON.parse(v || "[]"); } catch { return []; } };
const scoreColor = s => +s >= 70 ? C.green : +s >= 40 ? C.orange : C.red;
const decColor   = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
const decBg      = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

// ── Plagiarism risk helper ────────────────────────────────────────
const PLAG_RISK = (score) => {
  if (score == null) return { label: "—",           color: C.dim,    bg: "#f1f5f9",  border: C.border };
  if (score >= 70)   return { label: "High Risk",   color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
  if (score >= 40)   return { label: "Medium Risk", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" };
  return               { label: "Clean",            color: "#0a8f5c", bg: "#d9f5ec", border: "#6ee7b7" };
};

// ── Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, size = 48, color }) {
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
  if (!decision) return <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>;
  return <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decBg(decision), color: decColor(decision) }}>{decision}</span>;
}

// ══════════════════════════════════════════════════════════════════
// Plagiarism Detail Panel — shown as expanded row inline
// ══════════════════════════════════════════════════════════════════
function PlagiarismDetailPanel({ studentId, examId, score, matchedWith, onClose }) {
  const [timeline,    setTimeline]    = useState([]);
  const [compare,     setCompare]     = useState(null);
  const [loadingTl,   setLoadingTl]   = useState(true);
  const [loadingCmp,  setLoadingCmp]  = useState(false);
  const risk = PLAG_RISK(score);

  useEffect(() => {
    if (!examId || !studentId) { setLoadingTl(false); return; }
    fetch(`${API}/reports/${examId}/${studentId}/timeline`)
      .then(r => r.json())
      .then(d => { setTimeline(d.timeline || []); setLoadingTl(false); })
      .catch(() => setLoadingTl(false));
  }, [examId, studentId]);

  const fetchCompare = async () => {
    setLoadingCmp(true);
    try {
      const res  = await fetch(`${API}/reports/${examId}/${studentId}/compare`);
      const data = await res.json();
      setCompare(data);
    } catch { setCompare(null); }
    setLoadingCmp(false);
  };

  return (
    <div style={{ background: "#fafbff", border: `1px solid ${risk.border}`, borderRadius: 12, padding: 18, position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 14, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

      {/* Score banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, padding: "12px 16px", background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: risk.color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Plagiarism Risk</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: risk.color }}>{risk.label}</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: risk.color, fontFamily: "monospace" }}>
          {score != null ? `${score}%` : "—"}
        </div>
        {matchedWith && (
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
            Matched with: <strong>{matchedWith}</strong>
          </div>
        )}
      </div>

      {/* Timeline */}
      {loadingTl ? (
        <div style={{ fontSize: 12, color: C.dim, padding: "8px 0" }}>Loading timeline…</div>
      ) : timeline.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Code Growth Timeline</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
            {timeline.map((t, i) => {
              const maxChars = Math.max(...timeline.map(x => x.chars), 1);
              const h = Math.max(4, (t.chars / maxChars) * 48);
              return (
                <div key={i} title={`Snapshot ${t.snapshot} — ${t.chars} chars`}
                  style={{ flex: 1, height: h, background: C.accent, borderRadius: "2px 2px 0 0", opacity: 0.35 + (i / timeline.length) * 0.65 }}/>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginTop: 4 }}>
            <span>Start</span><span style={{ fontFamily: "monospace" }}>{timeline.length} snapshots</span><span>Latest</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 12, fontStyle: "italic" }}>No code timeline data available.</div>
      )}

      {/* Compare button */}
      {matchedWith && !compare && (
        <button onClick={fetchCompare} disabled={loadingCmp}
          style={{ width: "100%", padding: "9px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          {loadingCmp ? "Loading comparison…" : "Show Side-by-Side Code Comparison"}
        </button>
      )}

      {/* Side-by-side code */}
      {compare?.studentA && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Code Comparison</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[compare.studentA, compare.studentB].map(st => (
              <div key={st.id}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{st.id}</div>
                <pre style={{ fontSize: 11, background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, overflowX: "auto", maxHeight: 180, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {st.code || "(empty)"}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
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
// Report Modal (Overview + AI tabs) — unchanged from original
// ══════════════════════════════════════════════════════════════════
const RAD = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RAD)} y={cy + r * Math.sin(-midAngle * RAD)}
      fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function ReportModal({ candidate, onClose, onScheduleInterview }) {
  const [tab, setTab] = useState("overview");
  if (!candidate) return null;

  const ev     = candidate.__evaluation;
  const score  = candidate.total_score || 0;
  const ringC  = scoreColor(score);
  const dc     = ev?.decision ? decColor(ev.decision) : null;
  const dBg    = ev?.decision ? decBg(ev.decision) : null;
  const rec    = score >= 70 ? "Strong Yes" : score >= 50 ? "Yes" : score >= 30 ? "Maybe" : "No";
  const recC   = score >= 70 ? C.green : score >= 50 ? C.accent : score >= 30 ? C.orange : C.red;
  const recBg  = score >= 70 ? C.greenBg : score >= 50 ? C.accentLight : score >= 30 ? C.orangeBg : C.redBg;

  const githubLangs = safeArr(candidate.github_top_languages);
  const lcLangs     = safeArr(candidate.leetcode_languages);
  const allSkills   = safeArr(candidate.all_skills);
  const dim         = ev?.dimension_scores || {};
  const sources     = ev ? (ev.source_status || {}) : {};
  const insights    = ev?.insights || [];
  const PIE_COLORS  = [C.purple, C.green, C.accent, C.orange];

  const pieData = Object.entries(sources).filter(([, v]) => v === "real").map(([k]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: 25,
  }));
  const testBar = candidate.mcq_score != null ? [
    { name: "MCQ", score: candidate.mcq_score || 0 },
    { name: "SQL", score: candidate.sql_score || 0 },
    { name: "Coding", score: candidate.coding_score || 0 },
  ] : [];
  const skillBarData = allSkills.slice(0, 6).map((skill, i) => ({
    name:  skill.length > 10 ? skill.slice(0, 10) : skill,
    score: githubLangs.includes(skill) && lcLangs.includes(skill) ? 90 : githubLangs.includes(skill) ? 75 : lcLangs.includes(skill) ? 65 : 45,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
  }));

  // plagiarism info from candidate data
  const plagScore   = candidate.plagiarism_score   ?? null;
  const plagMatched = candidate.matched_with        ?? null;
  const plagExamId  = candidate.exam_id             ?? null;
  const plagRisk    = PLAG_RISK(plagScore);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: 16, width: "100%", maxWidth: 920, maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(10,42,65,.25)", animation: "fadeUp .22s ease" }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ padding: "15px 22px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 13, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.accentLight, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{candidate.linkedin_name || candidate.name || candidate.student_id}</span>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
              {ev?.decision && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: dBg, color: dc }}>{ev.decision}</span>}
              {/* Plagiarism badge in header */}
              {plagScore != null && (
                <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: plagRisk.bg, color: plagRisk.color, border: `1px solid ${plagRisk.border}` }}>
                  Plagiarism: {plagScore}% — {plagRisk.label}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>{candidate.college || ""}{candidate.email ? " · " + candidate.email : ""}</div>
          </div>
          <ScoreRing score={score} size={54} color={ringC}/>
          <button onClick={() => { onClose(); onScheduleInterview(candidate); }}
            style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={12} color="#fff" strokeWidth={2}/>
            Schedule
          </button>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* tabs — added Plagiarism tab */}
        <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.border}`, paddingLeft: 14, flexShrink: 0 }}>
          {[{ id: "overview", label: "Overview" }, { id: "ai", label: "AI Report" }, { id: "plagiarism", label: "Plagiarism" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? (t.id === "plagiarism" ? C.purple : C.accent) : C.muted, borderBottom: tab === t.id ? `2px solid ${t.id === "plagiarism" ? C.purple : C.accent}` : "2px solid transparent", marginBottom: -1, transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px" }}>
          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "Coding Skill",    value: candidate.github_score    || 0, color: C.purple },
                  { label: "Problem Solving", value: candidate.leetcode_score   || 0, color: C.green  },
                  { label: "Test Score",      value: candidate.test_score       || 0, color: C.orange },
                  { label: "Overall",         value: score,                          color: C.accent  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.white, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{Math.round(value)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>GitHub</div>
                  {[["Repositories", candidate.github_repos || 0], ["Weekly Commits", candidate.github_weekly_commits || 0], ["Total Commits", candidate.github_total_commits || 0]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {safeArr(candidate.github_top_languages).map(l => <span key={l} style={{ fontSize: 10, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "2px 7px" }}>{l}</span>)}
                  </div>
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>LeetCode</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                    {[["Easy", candidate.leetcode_easy || 0, C.green], ["Medium", candidate.leetcode_medium || 0, C.orange], ["Hard", candidate.leetcode_hard || 0, C.red]].map(([l, v, col]) => (
                      <div key={l} style={{ textAlign: "center", background: C.bg, borderRadius: 6, padding: "8px" }}>
                        <div style={{ fontSize: 9, color: C.dim }}>{l}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {candidate.leetcode_ranking && <div style={{ fontSize: 12, color: C.muted }}>Ranking: <strong style={{ color: C.purple }}>#{Number(candidate.leetcode_ranking).toLocaleString()}</strong></div>}
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>Test Performance</div>
                  <ProgBar label="MCQ"    value={candidate.mcq_score}    color={C.blue}/>
                  <ProgBar label="SQL"    value={candidate.sql_score}    color={C.green}/>
                  <ProgBar label="Coding" value={candidate.coding_score} color={C.orange}/>
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>Profile Links</div>
                  {[["GitHub", candidate.github_url], ["LinkedIn", candidate.linkedin_url], ["LeetCode", candidate.leetcode_url]].map(([l, url]) => url && (
                    <a key={l} href={url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.accent, marginBottom: 7, textDecoration: "none" }}>
                      <Icon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" size={11} color={C.accent} strokeWidth={2}/>{l}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AI tab ── */}
          {tab === "ai" && !ev && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>No AI Evaluation Found</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>Student has not submitted their resume yet.</div>
            </div>
          )}
          {tab === "ai" && ev && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: dBg || C.accentLight, border: `1px solid ${dc || C.accent}30`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <ScoreRing score={ev.overall_score || 0} size={72} color={dc || C.accent}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                    {ev.decision   && <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: (dc||C.accent) + "20", color: dc||C.accent }}>{ev.decision}</span>}
                    {ev.confidence && <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>}
                  </div>
                  {ev.recommendation && <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.7 }}>{ev.recommendation}</p>}
                </div>
              </div>
              <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Dimension Scores</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <ProgBar label="Coding Skill"    value={dim.coding_skill}          color={C.purple}/>
                    <ProgBar label="Problem Solving" value={dim.problem_solving}       color={C.green}/>
                    <ProgBar label="Consistency"     value={dim.consistency}           color={C.blue}/>
                  </div>
                  <div>
                    <ProgBar label="Professional"    value={dim.professional_presence} color={C.orange}/>
                    {dim.test_performance != null && <ProgBar label="Test Performance" value={dim.test_performance} color={C.accent}/>}
                  </div>
                </div>
              </div>
              {insights.length > 0 && (
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>AI Insights</div>
                  {insights.map((ins, i) => {
                    const col = ins.type === "positive" ? C.green : ins.type === "warning" ? C.orange : C.blue;
                    const bg  = ins.type === "positive" ? C.greenBg : ins.type === "warning" ? C.orangeBg : C.blueBg;
                    return (
                      <div key={i} style={{ background: bg, borderRadius: 8, padding: "9px 12px", marginBottom: 6, display: "flex", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, marginTop: 5, flexShrink: 0 }}/>
                        <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{ins.message}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Plagiarism tab ── */}
          {tab === "plagiarism" && (
            <div>
              {plagScore == null ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>No Plagiarism Data</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>
                    Run a plagiarism check from the Plagiarism page to see data for this candidate.
                  </div>
                </div>
              ) : (
                <PlagiarismDetailPanel
                  studentId={candidate.student_id}
                  examId={plagExamId}
                  score={plagScore}
                  matchedWith={plagMatched}
                  onClose={() => setTab("overview")}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Page — Table with Plagiarism column + expandable panel
// ══════════════════════════════════════════════════════════════════
export default function RecruiterReports() {
  const [allCandidates,  setAllCandidates]  = useState([]);
  const [plagData,       setPlagData]       = useState({});   // keyed by student_id
  const [examIdInput,    setExamIdInput]    = useState("exam_001");
  const [plagLoading,    setPlagLoading]    = useState(false);
  const [plagError,      setPlagError]      = useState("");
  const [expandedPlag,   setExpandedPlag]   = useState(null); // student_id with open plag panel
  const [loading,        setLoading]        = useState(true);
  const [activeCollege,  setActiveCollege]  = useState("All");
  const [search,         setSearch]         = useState("");
  const [filterResult,   setFilterResult]   = useState("All");
  const [filterDecision, setFilterDecision] = useState("All");
  const [selected,       setSelected]       = useState(null);
  const [scheduling,     setScheduling]     = useState(null);
  const [scheduledIds,   setScheduledIds]   = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/all`);
      const enriched = await Promise.allSettled(
        res.data.map(async row => {
          try {
            const ev = await axios.get(`${API}/report/evaluate/${row.student_id}`);
            return { ...row, __evaluation: ev.data };
          } catch { return { ...row, __evaluation: null }; }
        })
      );
      setAllCandidates(enriched.map(r => r.status === "fulfilled" ? r.value : r.reason));
    } catch { setAllCandidates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load plagiarism data for an exam
  const loadPlagiarism = async () => {
    if (!examIdInput.trim()) return;
    setPlagLoading(true); setPlagError("");
    try {
      const res  = await fetch(`${API}/reports/${examIdInput.trim()}`);
      const data = await res.json();
      if (data.students && Array.isArray(data.students)) {
        const map = {};
        data.students.forEach(s => {
          map[s.student_id] = {
            score:       s.plagiarism_score,
            matchedWith: s.matched_with,
            changeCount: s.change_count,
            examId:      examIdInput.trim(),
          };
        });
        setPlagData(map);
        if (data.students.length === 0) setPlagError("No plagiarism data found for this exam ID.");
      } else {
        setPlagError("No data found for this exam ID.");
      }
    } catch {
      setPlagError("Could not connect to backend.");
    }
    setPlagLoading(false);
  };

  const colleges = ["All", ...new Set(allCandidates.map(c => c.college).filter(Boolean)).values()].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b));
  const collegeFiltered = activeCollege === "All" ? allCandidates : allCandidates.filter(c => c.college === activeCollege);
  const filtered = collegeFiltered.filter(c => {
    const name   = (c.linkedin_name || c.name || c.student_id || "").toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? "Pass" : "Fail";
    const dec    = c.__evaluation?.decision || null;
    return name.includes(search.toLowerCase()) &&
      (filterResult   === "All" || result === filterResult) &&
      (filterDecision === "All" || dec === filterDecision);
  });

  const passCount = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const avgScore  = filtered.length ? (filtered.reduce((s, c) => s + (c.total_score || 0), 0) / filtered.length).toFixed(1) : 0;
  const hireCount = filtered.filter(c => c.__evaluation?.decision === "Hire").length;
  const highPlagCount = Object.values(plagData).filter(p => p.score >= 70).length;

  const handleExport = () => {
    const headers = ["Student ID","Name","College","GitHub","LeetCode","Test","Total","Decision","Plagiarism Score","Plagiarism Risk"];
    const rows    = filtered.map(c => {
      const pd = plagData[c.student_id];
      return [c.student_id, c.linkedin_name || c.name || "", c.college || "", c.github_score || 0, c.leetcode_score || 0, Math.round(c.test_score || 0), Math.round(c.total_score || 0), c.__evaluation?.decision || "", pd?.score ?? "—", pd ? PLAG_RISK(pd.score).label : "—"];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `reports_${activeCollege.replace(/\s+/g,"_")}.csv`;
    a.click();
  };

  return (
    <RecruiterLayout title="Reports" subtitle="AI-analyzed candidate profiles · includes plagiarism check per exam"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.white, color: C.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={13} color={C.muted} strokeWidth={2}/>
            Refresh
          </button>
          <button onClick={handleExport} style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
        </div>
      }>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .r-row:hover { background: #f8fbfc !important; }
        .r-btn-outline:hover { background: ${C.accent} !important; color:#fff !important; border-color:${C.accent} !important; }
        .col-tab:hover { background: ${C.accentLight} !important; color: ${C.accent} !important; }
      `}</style>

      {/* ── Plagiarism Loader Bar ── */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" size={16} color={C.purple} strokeWidth={2}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Load Plagiarism Scores</span>
          <span style={{ fontSize: 11, color: C.dim }}>— enriches the Plagiarism column below</span>
        </div>
        <input
          value={examIdInput}
          onChange={e => setExamIdInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") loadPlagiarism(); }}
          placeholder="Exam ID e.g. exam_001"
          style={{ padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, width: 200, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={loadPlagiarism} disabled={plagLoading}
          style={{ padding: "8px 18px", background: plagLoading ? "#cbd5e1" : C.purple, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: plagLoading ? "not-allowed" : "pointer" }}>
          {plagLoading ? "Loading…" : "Load"}
        </button>
        {Object.keys(plagData).length > 0 && (
          <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: C.muted }}>Loaded: <strong style={{ color: C.text }}>{Object.keys(plagData).length}</strong> records</span>
            {highPlagCount > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fee2e2", color: "#dc2626", fontWeight: 700 }}>⚠ {highPlagCount} High Risk</span>}
          </div>
        )}
        {plagError && <span style={{ fontSize: 12, color: C.red, marginLeft: 8 }}>{plagError}</span>}
      </div>

      {/* ── College tabs ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {colleges.map(col => {
          const isActive = activeCollege === col;
          const count    = col === "All" ? allCandidates.length : allCandidates.filter(c => c.college === col).length;
          const hires    = col === "All" ? allCandidates.filter(c => c.__evaluation?.decision === "Hire").length : allCandidates.filter(c => c.college === col && c.__evaluation?.decision === "Hire").length;
          return (
            <button key={col} className="col-tab" onClick={() => setActiveCollege(col)}
              style={{ padding: "9px 18px", borderRadius: 10, border: `2px solid ${isActive ? C.accent : C.border}`, background: isActive ? C.accentLight : C.white, color: isActive ? C.accent : C.text, fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{col}</span>
              <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: isActive ? C.accent : "#f1f5f9", color: isActive ? "#fff" : C.muted }}>{count}</span>
              {hires > 0 && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.greenBg, color: C.green }}>{hires} Hire</span>}
            </button>
          );
        })}
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total",        value: filtered.length,              color: C.accent  },
          { label: "Passed",       value: passCount,                    color: C.green   },
          { label: "Failed",       value: filtered.length - passCount,  color: C.red     },
          { label: "Avg Score",    value: avgScore,                     color: C.blue    },
          { label: "High Plagiarism", value: highPlagCount > 0 ? highPlagCount : Object.keys(plagData).length > 0 ? "0" : "—", color: highPlagCount > 0 ? C.red : C.muted },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "13px 16px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        {/* filter bar */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: C.accentLight }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
            {activeCollege === "All" ? "All Candidates" : `${activeCollege} — Candidates`}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px" }}>
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={12} color={C.dim}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
                style={{ border: "none", outline: "none", fontSize: 12, color: C.text, background: "transparent", width: 120 }}/>
            </div>
            {[
              { value: filterResult,   onChange: setFilterResult,   options: ["All","Pass","Fail"]           },
              { value: filterDecision, onChange: setFilterDecision, options: ["All","Hire","Maybe","Reject"] },
            ].map((f, i) => (
              <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
                style={{ padding: "5px 9px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 12 }}>Loading reports…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 12 }}>No candidates found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
                  {["#","Candidate","College","GitHub","LeetCode","Test","Total","Recommendation","AI Decision","Plagiarism","Action"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 13px", textAlign: "left", fontSize: 9, fontWeight: 700, color: i === 9 ? C.purple : C.muted, textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const score       = c.total_score || 0;
                  const rec         = score >= 70 ? "Strong Yes" : score >= 50 ? "Yes" : score >= 30 ? "Maybe" : "No";
                  const recC        = score >= 70 ? C.green : score >= 50 ? C.accent : score >= 30 ? C.orange : C.red;
                  const recBg       = score >= 70 ? C.greenBg : score >= 50 ? C.accentLight : score >= 30 ? C.orangeBg : C.redBg;
                  const langs       = safeArr(c.github_top_languages);
                  const isScheduled = scheduledIds.has(c.student_id);
                  const pd          = plagData[c.student_id] || null;
                  const plagRisk    = PLAG_RISK(pd?.score ?? null);
                  const isExpanded  = expandedPlag === c.student_id;

                  return (
                    <React.Fragment key={c.student_id}>
                      <tr className="r-row"
                        style={{ borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, transition: "background .15s", cursor: "pointer" }}
                        onClick={() => setSelected(c)}>
                        <td style={{ padding: "11px 13px", color: C.dim, fontFamily: "monospace", fontSize: 10 }}>{i+1}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>{c.linkedin_name || c.name || c.student_id}</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {langs.slice(0, 2).map(l => <span key={l} style={{ fontSize: 9, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "1px 5px" }}>{l}</span>)}
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontSize: 11, fontWeight: 600, color: C.text }}>{c.college || "—"}</td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 34, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.github_score||0}%`, height: "100%", background: C.purple }}/></div>
                            <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600 }}>{c.github_score || 0}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 34, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.leetcode_score||0}%`, height: "100%", background: C.green }}/></div>
                            <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600 }}>{c.leetcode_score || 0}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 13px", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{Math.round(c.test_score || 0)}</td>
                        <td style={{ padding: "11px 13px" }}><ScoreRing score={score} size={38} color={scoreColor(score)}/></td>
                        <td style={{ padding: "11px 13px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
                        </td>
                        <td style={{ padding: "11px 13px" }}><DecisionBadge decision={c.__evaluation?.decision}/></td>

                        {/* ── Plagiarism column ── */}
                        <td style={{ padding: "11px 13px" }} onClick={e => e.stopPropagation()}>
                          {pd ? (
                            <button
                              onClick={() => setExpandedPlag(p => p === c.student_id ? null : c.student_id)}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: plagRisk.bg, color: plagRisk.color, border: `1px solid ${plagRisk.border}`, cursor: "pointer", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {/* Mini bar */}
                              <div style={{ width: 32, height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${pd.score}%`, height: "100%", background: plagRisk.color, borderRadius: 2 }}/>
                              </div>
                              {pd.score}% {isExpanded ? "▲" : "▼"}
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: C.dim, fontStyle: "italic" }}>
                              {Object.keys(plagData).length > 0 ? "No data" : "Load exam"}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "11px 13px" }}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="r-btn-outline" onClick={e => { e.stopPropagation(); setSelected(c); }}
                              style={{ padding: "4px 9px", background: C.accentLight, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
                              View
                            </button>
                            <button onClick={e => { e.stopPropagation(); setScheduling(c); }}
                              style={{ padding: "4px 9px", background: isScheduled ? C.greenBg : "#fff7ed", color: isScheduled ? C.green : C.orange, border: `1px solid ${isScheduled ? C.greenBorder : "#fed7aa"}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                              {isScheduled ? "✓ Sched." : "Interview"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Plagiarism expanded panel row ── */}
                      {isExpanded && pd && (
                        <tr>
                          <td colSpan={11} style={{ padding: "0 16px 16px 52px", background: "#fafbff", borderBottom: `1px solid ${C.border}` }}>
                            <PlagiarismDetailPanel
                              studentId={c.student_id}
                              examId={pd.examId}
                              score={pd.score}
                              matchedWith={pd.matchedWith}
                              onClose={() => setExpandedPlag(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <ReportModal
          candidate={{ ...selected, plagiarism_score: plagData[selected.student_id]?.score, matched_with: plagData[selected.student_id]?.matchedWith, exam_id: plagData[selected.student_id]?.examId }}
          onClose={() => setSelected(null)}
          onScheduleInterview={c => { setSelected(null); setScheduling(c); }}
        />
      )}
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