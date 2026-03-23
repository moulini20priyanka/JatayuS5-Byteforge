// RecruiterReports.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = "http://localhost:5000/api";

const SKILL_COLORS = [C.purple, C.green, C.blue, C.orange, C.accent, C.red];

// ── Helpers ───────────────────────────────────────────────────────
const safeArr  = v => { try { return Array.isArray(v) ? v : JSON.parse(v || "[]"); } catch { return []; } };
const scoreColor = s => s >= 70 ? C.green : s >= 40 ? C.orange : C.red;
const decColor   = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
const decBg      = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

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

// ── Progress Bar ──────────────────────────────────────────────────
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

// ── Insight Item ──────────────────────────────────────────────────
function InsightItem({ type, section, message, severity }) {
  const map = {
    positive: { bg: C.greenBg,  border: C.greenBorder, dot: C.green,  text: C.green  },
    warning:  { bg: C.orangeBg, border: "#fed7aa",       dot: C.orange, text: C.orange },
    info:     { bg: C.blueBg,   border: "#bfdbfe",       dot: C.blue,   text: C.blue   },
  };
  const s   = map[type] || map.info;
  const sev = { high: "HIGH", medium: "MED", low: "LOW" }[severity] || "";
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.dot, border: `2px solid ${C.white}`, boxShadow: `0 0 0 2px ${s.dot}33`, marginTop: 12, flexShrink: 0 }}/>
        <div style={{ width: 1, flex: 1, background: `${s.dot}30`, marginTop: 2 }}/>
      </div>
      <div style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9, padding: "9px 13px", marginBottom: 7 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
          {section && <span style={{ fontSize: 9, fontWeight: 700, color: s.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>{section.replace(/_/g, " ")}</span>}
          {sev && <span style={{ fontSize: 9, fontWeight: 700, color: s.dot, background: `${s.dot}20`, borderRadius: 4, padding: "1px 5px" }}>{sev}</span>}
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{message}</div>
      </div>
    </div>
  );
}

// ── Info Card ─────────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 16px", ...style }}>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>{children}</div>;
}

// ── Pie label ─────────────────────────────────────────────────────
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

// ── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ c }) {
  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const certs       = safeArr(c.linkedin_certifications);
  const allSkills   = safeArr(c.all_skills);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Score Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Coding Skill",    value: c.github_score      || 0, color: C.purple, sub: "GitHub-based"        },
          { label: "Problem Solving", value: c.leetcode_score    || 0, color: C.green,  sub: "LeetCode-based"      },
          { label: "Consistency",     value: c.consistency_score ?? "—", color: C.blue, sub: "Avg across platforms" },
          { label: "Test Score",      value: c.test_score        || 0, color: C.orange, sub: "MCQ+SQL+Code"         },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} style={{ borderTop: `3px solid ${color}`, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{value}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* GitHub */}
        <Card>
          <CardTitle>GitHub Analysis</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
            {[
              ["Repositories",   c.github_repos         || 0],
              ["Weekly Commits", c.github_weekly_commits || 0],
              ["Total Commits",  c.github_total_commits  || 0],
              ["Consistency",    c.consistency_score != null ? `${c.consistency_score}/100` : "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 5 }}>Languages Used</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {githubLangs.length
              ? githubLangs.map(l => <span key={l} style={{ fontSize: 10, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "2px 8px", fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic" }}>No languages detected</span>}
          </div>
        </Card>

        {/* LeetCode */}
        <Card>
          <CardTitle>LeetCode Analysis</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
            {[["Easy", c.leetcode_easy || 0, C.green], ["Medium", c.leetcode_medium || 0, C.orange], ["Hard", c.leetcode_hard || 0, C.red]].map(([l, v, col]) => (
              <div key={l} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: col }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, background: C.bg, borderRadius: 6, padding: "8px 12px" }}>
            <span style={{ fontSize: 11, color: C.muted }}>Ranking</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{c.leetcode_ranking ? `#${Number(c.leetcode_ranking).toLocaleString()}` : "N/A"}</span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 5 }}>Coding Languages</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {lcLangs.length
              ? lcLangs.map(l => <span key={l} style={{ fontSize: 10, background: C.greenBg, color: C.green, borderRadius: 20, padding: "2px 8px", fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic" }}>No data</span>}
          </div>
        </Card>

        {/* Test Performance */}
        <Card>
          <CardTitle>Test Performance</CardTitle>
          {c.mcq_score != null || c.sql_score != null || c.coding_score != null ? (
            <>
              <ProgBar label="MCQ"    value={c.mcq_score}    color={C.blue}/>
              <ProgBar label="SQL"    value={c.sql_score}    color={C.green}/>
              <ProgBar label="Coding" value={c.coding_score} color={C.orange}/>
              <div style={{ marginTop: 10, padding: "9px 12px", background: C.bg, borderRadius: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Overall</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(c.test_score || 0) }}>{c.test_score || 0}/100</span>
              </div>
            </>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: C.dim, fontSize: 12, fontStyle: "italic" }}>No test scores recorded</div>
          )}
        </Card>

        {/* Skill Profile */}
        <Card>
          <CardTitle>Skill Profile</CardTitle>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 7 }}>GitHub languages + LeetCode + resume skills</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {allSkills.length
              ? allSkills.map((l, i) => <span key={l} style={{ fontSize: 10, background: SKILL_COLORS[i % SKILL_COLORS.length] + "15", color: SKILL_COLORS[i % SKILL_COLORS.length], borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{l}</span>)
              : <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic" }}>No skill data</span>}
          </div>
          {c.linkedin_summary && <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, margin: 0 }}>{c.linkedin_summary.substring(0, 150)}…</p>}
        </Card>
      </div>
    </div>
  );
}

// ── AI Report Tab ─────────────────────────────────────────────────
function AIReportTab({ ev, c }) {
  if (!ev) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" size={30} color={C.dim}/>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginTop: 12 }}>No AI Evaluation Found</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>Student has not submitted their resume yet.</div>
    </div>
  );

  const dim     = ev.dimension_scores || {};
  const unified = ev.unified_scores   || {};
  const chart   = ev.chart_data       || {};
  const sources = ev.source_status    || {};
  const missing = ev.missing_sources  || [];
  const insights= ev.insights         || [];

  const dc  = decColor(ev.decision);
  const dBg = decBg(ev.decision);
  const PIE_COLORS = [C.purple, C.green, C.accent, C.orange];

  const pieData = chart.pie?.filter(d => d.value > 0) || [
    { name: "GitHub",   value: sources.github   === "real" ? 30 : 0 },
    { name: "LeetCode", value: sources.leetcode === "real" ? 25 : 0 },
    { name: "LinkedIn", value: sources.linkedin === "real" ? 20 : 0 },
    { name: "Test",     value: unified.test_performance?.source === "test" ? 25 : 0 },
  ].filter(d => d.value > 0);

  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const allSkills   = safeArr(c.all_skills);

  const skillBarData = allSkills.slice(0, 6).map((skill, i) => ({
    name:  skill.length > 10 ? skill.substring(0, 10) : skill,
    score: githubLangs.includes(skill) && lcLangs.includes(skill) ? 90 :
           githubLangs.includes(skill) ? 75 : lcLangs.includes(skill) ? 65 : 45,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
  }));

  const testBar = c.mcq_score != null ? [
    { name: "MCQ",    score: c.mcq_score    || 0 },
    { name: "SQL",    score: c.sql_score    || 0 },
    { name: "Coding", score: c.coding_score || 0 },
  ] : (chart.testBar || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Decision Banner */}
      <div style={{ background: dBg, border: `1px solid ${dc}30`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <ScoreRing score={ev.overall_score || 0} size={72} color={dc}/>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: dc + "20", color: dc }}>{ev.decision || "—"}</span>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: C.muted }}>Risk: {ev.risk}</span>
          </div>
          {ev.recommendation && <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.7 }}>{ev.recommendation}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Object.entries(sources).map(([src, status]) => {
            const col = status === "real" ? C.green : status === "estimated" ? C.orange : C.red;
            const bg  = status === "real" ? C.greenBg : status === "estimated" ? C.orangeBg : C.redBg;
            return <span key={src} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: bg, color: col, whiteSpace: "nowrap" }}>{src.charAt(0).toUpperCase() + src.slice(1)} — {status?.toUpperCase()}</span>;
          })}
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ background: C.orangeBg, border: "1px solid #fed7aa", borderRadius: 8, padding: "9px 13px", fontSize: 11, color: C.orange }}>
          Missing: {missing.join(", ")} — scores estimated and carry lower confidence.
        </div>
      )}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <CardTitle>Source Contribution</CardTitle>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={68} dataKey="value" labelLine={false} label={PieLabel}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}%`, n]}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {testBar.length > 0 ? (
          <Card>
            <CardTitle>Test Performance</CardTitle>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={testBar} layout="vertical" margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.text }} tickLine={false} width={50}/>
                <Tooltip formatter={v => [`${v}/100`, "Score"]}/>
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {testBar.map((_, i) => <Cell key={i} fill={[C.blue, C.green, C.purple][i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card><CardTitle>Test Performance</CardTitle><div style={{ padding: "40px 0", textAlign: "center", color: C.dim, fontSize: 11, fontStyle: "italic" }}>No test data</div></Card>
        )}
      </div>

      {/* Skill Strength */}
      {skillBarData.length > 0 && (
        <Card>
          <CardTitle>Language & Skill Strength</CardTitle>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Both GitHub & LeetCode = 90 · GitHub only = 75 · LeetCode only = 65 · Resume only = 45</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={skillBarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.text }} tickLine={false}/>
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} tickLine={false}/>
              <Tooltip formatter={v => [`${v}`, "Strength"]}/>
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {skillBarData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Dimension Scores */}
      <Card>
        <CardTitle>Dimension Score Breakdown</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
        <div style={{ marginTop: 12, padding: "10px 12px", background: C.bg, borderRadius: 7, fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
          <strong style={{ color: C.text }}>Scoring: </strong>
          Coding (repos+langs+activity) · Problem Solving (Hard×3+Med×2+Easy×1)÷3 · Consistency (push events avg) · Test (MCQ×30%+SQL×30%+Coding×40%)
        </div>
      </Card>

      {/* Insights Timeline */}
      {insights.length > 0 && (
        <Card>
          <CardTitle>AI Insights</CardTitle>
          <div style={{ paddingLeft: 4 }}>
            {insights.map((ins, i) => <InsightItem key={i} {...ins}/>)}
          </div>
        </Card>
      )}

      {/* Dimension Analysis */}
      {(ev.decision_insights || []).length > 0 && (
        <Card>
          <CardTitle>Dimension-by-Dimension Analysis</CardTitle>
          {ev.decision_insights.map((msg, i) => {
            const labels = ["Coding Ability", "Problem Solving", "Consistency", "Professional Presence", "Test Performance"];
            const colors = [C.purple, C.green, C.blue, C.orange, C.accent];
            return (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9, padding: "9px 12px", background: C.bg, borderRadius: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: colors[i] + "18", border: `1.5px solid ${colors[i]}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: colors[i], flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: colors[i], textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{labels[i] || `Dimension ${i+1}`}</div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>{msg}</div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────
function ReportModal({ candidate, onClose }) {
  const [tab, setTab] = useState("overview");
  if (!candidate) return null;

  const ev    = candidate.__evaluation;
  const score = candidate.total_score || 0;
  const ringC = scoreColor(score);
  const dc    = ev?.decision ? decColor(ev.decision) : null;
  const dBg   = ev?.decision ? decBg(ev.decision)    : null;
  const rec   = score >= 70 ? "Strong Yes" : score >= 50 ? "Yes" : score >= 30 ? "Maybe" : "No";
  const recC  = score >= 70 ? C.green : score >= 50 ? C.accent : score >= 30 ? C.orange : C.red;
  const recBg = score >= 70 ? C.greenBg : score >= 50 ? C.accentLight : score >= 30 ? C.orangeBg : C.redBg;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: 16, width: "100%", maxWidth: 880, maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(10,42,65,0.25)", animation: "fadeUp 0.22s ease" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "15px 22px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 13, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.accentLight, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || candidate.student_id || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{candidate.linkedin_name || candidate.name || candidate.student_id}</div>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
              {ev?.decision && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: dBg, color: dc }}>{ev.decision}</span>}
              {ev?.confidence && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>{candidate.college || ""}{candidate.college && candidate.email ? " · " : ""}{candidate.email || ""}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <ScoreRing score={score} size={54} color={ringC}/>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Total Score</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.border}`, paddingLeft: 14, flexShrink: 0 }}>
          {[{ id: "overview", label: "Overview" }, { id: "ai", label: "AI Report" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.accent : C.muted, borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px" }}>
          {tab === "overview" && <OverviewTab c={candidate}/>}
          {tab === "ai"       && <AIReportTab ev={ev} c={candidate}/>}
        </div>
      </div>
    </div>
  );
}

// ── Decision Badge ────────────────────────────────────────────────
function DecisionBadge({ decision }) {
  if (!decision) return <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>;
  const map = { Hire: { bg: C.greenBg, color: C.green }, Maybe: { bg: C.orangeBg, color: C.orange }, Reject: { bg: C.redBg, color: C.red } };
  const s = map[decision] || map.Maybe;
  return <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>{decision}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────
export default function RecruiterReports() {
  const [candidates,     setCandidates]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [filterResult,   setFilterResult]   = useState("All");
  const [filterDecision, setFilterDecision] = useState("All");
  const [selected,       setSelected]       = useState(null);

  useEffect(() => {
    axios.get(`${API}/reports/all`).then(async res => {
      const enriched = await Promise.allSettled(
        res.data.map(async row => {
          try {
            const ev = await axios.get(`${API}/report/evaluate/${row.student_id}`);
            return { ...row, __evaluation: ev.data };
          } catch { return { ...row, __evaluation: null }; }
        })
      );
      setCandidates(enriched.map(r => r.status === "fulfilled" ? r.value : r.reason));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(c => {
    const name   = (c.linkedin_name || c.name || c.student_id || "").toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? "Pass" : "Fail";
    const dec    = c.__evaluation?.decision || null;
    return name.includes(search.toLowerCase()) &&
      (filterResult   === "All" || result === filterResult) &&
      (filterDecision === "All" || dec    === filterDecision);
  });

  const passCount = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const failCount = filtered.length - passCount;
  const avgScore  = filtered.length ? (filtered.reduce((s, c) => s + (c.total_score || 0), 0) / filtered.length).toFixed(1) : 0;
  const hireCount = filtered.filter(c => c.__evaluation?.decision === "Hire").length;

  const handleExport = () => {
    const headers = ["Student ID","Name","GitHub","LeetCode","Test","Total","Decision"];
    const rows = filtered.map(c => [c.student_id, c.linkedin_name || c.name || "", c.github_score || 0, c.leetcode_score || 0, Math.round(c.test_score || 0), Math.round(c.total_score || 0), c.__evaluation?.decision || ""]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a    = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "recruiter_reports.csv";
    a.click();
  };

  return (
    <RecruiterLayout title="Reports" subtitle="AI-analyzed candidate profiles with hiring decisions"
      actions={<button onClick={handleExport} style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>}>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total",     value: filtered.length, color: C.accent },
          { label: "Passed",    value: passCount,       color: C.green  },
          { label: "Failed",    value: failCount,       color: C.red    },
          { label: "Avg Score", value: avgScore,        color: C.blue   },
          { label: "AI Hire",   value: hireCount,       color: C.green  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "13px 16px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: C.accentLight }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Candidate Results</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px" }}>
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={12} color={C.dim}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ border: "none", outline: "none", fontSize: 12, color: C.text, background: "transparent", width: 120 }}/>
            </div>
            {[
              { value: filterResult,   onChange: setFilterResult,   options: ["All","Pass","Fail"]            },
              { value: filterDecision, onChange: setFilterDecision, options: ["All","Hire","Maybe","Reject"]  },
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
            <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 12 }}>Loading reports...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 12 }}>No candidates found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
                  {["#","Candidate","GitHub","LeetCode","Test","Total","Recommendation","AI Decision","Status","Action"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 13px", textAlign: "left", fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const score = c.total_score || 0;
                  const rec   = score >= 70 ? "Strong Yes" : score >= 50 ? "Yes" : score >= 30 ? "Maybe" : "No";
                  const recC  = score >= 70 ? C.green : score >= 50 ? C.accent : score >= 30 ? C.orange : C.red;
                  const recBg = score >= 70 ? C.greenBg : score >= 50 ? C.accentLight : score >= 30 ? C.orangeBg : C.redBg;
                  const langs = safeArr(c.github_top_languages);
                  return (
                    <tr key={c.student_id} className="r-row" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s", cursor: "pointer" }} onClick={() => setSelected(c)}>
                      <td style={{ padding: "11px 13px", color: C.dim, fontFamily: "monospace", fontSize: 10 }}>{i + 1}</td>
                      <td style={{ padding: "11px 13px" }}>
                        <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>{c.linkedin_name || c.name || c.student_id}</div>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {langs.slice(0, 3).map(l => <span key={l} style={{ fontSize: 9, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "1px 5px" }}>{l}</span>)}
                        </div>
                      </td>
                      <td style={{ padding: "11px 13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 36, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.github_score || 0}%`, height: "100%", background: C.purple }}/></div>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600 }}>{c.github_score || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 36, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.leetcode_score || 0}%`, height: "100%", background: C.green }}/></div>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600 }}>{c.leetcode_score || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 13px", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{Math.round(c.test_score || 0)}</td>
                      <td style={{ padding: "11px 13px" }}><ScoreRing score={score} size={38} color={scoreColor(score)}/></td>
                      <td style={{ padding: "11px 13px" }}><span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: recBg, color: recC }}>{rec}</span></td>
                      <td style={{ padding: "11px 13px" }}><DecisionBadge decision={c.__evaluation?.decision}/></td>
                      <td style={{ padding: "11px 13px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 600, background: c.status === "ready" ? C.greenBg : C.orangeBg, color: c.status === "ready" ? C.green : C.orange }}>
                          {c.status === "ready" ? "Ready" : "Processing"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 13px" }}>
                        <button className="r-btn-outline" onClick={e => { e.stopPropagation(); setSelected(c); }}
                          style={{ padding: "4px 10px", background: C.accentLight, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)}/>}
    </RecruiterLayout>
  );
}