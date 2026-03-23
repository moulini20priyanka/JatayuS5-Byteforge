import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import axios from 'axios';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = 'http://localhost:5000/api';

const T = {
  bg:          '#f0fafb',
  white:       '#ffffff',
  border:      '#e2e8ed',
  accent:      '#2BB1A8',
  accentLight: '#e8fafb',
  navy:        '#0A2A41',
  muted:       '#3d6878',
  dim:         '#7aacba',
  green:       '#16a34a', greenBg:  '#f0fdf4', greenBorder: '#bbf7d0',
  red:         '#dc2626', redBg:    '#fef2f2',
  orange:      '#ea580c', orangeBg: '#fff7ed',
  purple:      '#7c3aed', purpleBg: '#f5f3ff',
  blue:        '#2563eb', blueBg:   '#eff6ff',
};

const SKILL_COLORS = [T.purple, T.green, T.blue, T.orange, T.accent, T.red];

// ── Helpers ───────────────────────────────────────────────────────
const safeArr = v => { try { return Array.isArray(v) ? v : JSON.parse(v || '[]'); } catch { return []; } };
const scoreColor = s => s >= 70 ? T.green : s >= 40 ? T.orange : T.red;
const decColor   = d => d === 'Hire' ? T.green : d === 'Reject' ? T.red : T.orange;
const decBg      = d => d === 'Hire' ? T.greenBg : d === 'Reject' ? T.redBg : T.orangeBg;

// ── Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, size = 56, color }) {
  const c    = color || scoreColor(score);
  const r    = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={T.navy}
        fontSize={size > 60 ? 14 : 11} fontWeight="700" fontFamily="'DM Sans',sans-serif">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────
function ProgBar({ label, value, color = T.accent }) {
  const pct = Math.min((value || 0), 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value != null ? `${Math.round(value)}/100` : '—'}</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 4, transition: 'width 0.7s ease' }}/>
      </div>
    </div>
  );
}

// ── Insight Item ──────────────────────────────────────────────────
function InsightItem({ type, section, message, severity, index = 0 }) {
  const map = {
    positive: { bg: T.greenBg,  border: T.greenBorder, dot: T.green,  text: T.green  },
    warning:  { bg: T.orangeBg, border: '#fed7aa',       dot: T.orange, text: T.orange },
    info:     { bg: T.blueBg,   border: '#bfdbfe',       dot: T.blue,   text: T.blue   },
  };
  const s   = map[type] || map.info;
  const sev = { high: 'HIGH', medium: 'MED', low: 'LOW' }[severity] || '';
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, border: `2px solid ${T.white}`, boxShadow: `0 0 0 2px ${s.dot}33`, marginTop: 14, flexShrink: 0 }}/>
        <div style={{ width: 1, flex: 1, background: `${s.dot}30`, marginTop: 2 }}/>
      </div>
      <div style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9, padding: '10px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          {section && <span style={{ fontSize: 10, fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{section.replace(/_/g, ' ')}</span>}
          {sev && <span style={{ fontSize: 9, fontWeight: 700, color: s.dot, background: `${s.dot}20`, borderRadius: 4, padding: '1px 5px' }}>{sev}</span>}
        </div>
        <div style={{ fontSize: 12, color: T.navy, lineHeight: 1.6 }}>{message}</div>
      </div>
    </div>
  );
}

// ── Source Badge ──────────────────────────────────────────────────
function SourceBadge({ label, status }) {
  const map = {
    real:      { bg: T.greenBg,  color: T.green,  icon: '✓' },
    estimated: { bg: T.orangeBg, color: T.orange, icon: '~' },
    missing:   { bg: T.redBg,    color: T.red,    icon: '✗' },
  };
  const s = map[status] || map.missing;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, marginRight: 5, marginBottom: 4 }}>
      {label} <span style={{ fontWeight: 800 }}>{s.icon} {status?.toUpperCase()}</span>
    </span>
  );
}

// ── Pie label ─────────────────────────────────────────────────────
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

// ── Info Card ─────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px', ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
      {children}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ c }) {
  const githubLangs  = safeArr(c.github_top_languages);
  const lcLangs      = safeArr(c.leetcode_languages);
  const certs        = safeArr(c.linkedin_certifications);
  const allSkills    = safeArr(c.all_skills);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Coding Skill',    value: c.github_score        || 0, color: T.purple, sub: 'GitHub-based'   },
          { label: 'Problem Solving', value: c.leetcode_score      || 0, color: T.green,  sub: 'LeetCode-based' },
          { label: 'Consistency',     value: c.consistency_score   ?? '—', color: T.blue, sub: 'Avg across platforms' },
          { label: 'Test Score',      value: c.test_score          || 0, color: T.orange, sub: 'MCQ+SQL+Code'   },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} style={{ borderTop: `3px solid ${color}`, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.navy }}>{value}</div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* GitHub */}
        <Card>
          <CardTitle>GitHub Analysis</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['Repositories',   c.github_repos          || 0],
              ['Weekly Commits', c.github_weekly_commits  || 0],
              ['Total Commits',  c.github_total_commits   || 0],
              ['Consistency',    c.consistency_score != null ? `${c.consistency_score}/100` : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: T.bg, borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6 }}>Languages Used</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {githubLangs.length
              ? githubLangs.map(l => <span key={l} style={{ fontSize: 11, background: T.purpleBg, color: T.purple, borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No languages detected</span>}
          </div>
        </Card>

        {/* LeetCode */}
        <Card>
          <CardTitle>LeetCode Analysis</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['Easy', c.leetcode_easy || 0, T.green], ['Medium', c.leetcode_medium || 0, T.orange], ['Hard', c.leetcode_hard || 0, T.red]].map(([l, v, col]) => (
              <div key={l} style={{ background: T.bg, borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: T.bg, borderRadius: 7, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: T.muted }}>Global Ranking</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.purple }}>{c.leetcode_ranking ? `#${Number(c.leetcode_ranking).toLocaleString()}` : 'N/A'}</span>
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6 }}>Coding Languages</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {lcLangs.length
              ? lcLangs.map(l => <span key={l} style={{ fontSize: 11, background: T.greenBg, color: T.green, borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{l}</span>)
              : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No data</span>}
          </div>
        </Card>

        {/* Test Performance */}
        <Card>
          <CardTitle>Test Performance</CardTitle>
          {c.mcq_score != null || c.sql_score != null || c.coding_score != null ? (
            <>
              <ProgBar label="MCQ"    value={c.mcq_score}    color={T.blue}/>
              <ProgBar label="SQL"    value={c.sql_score}    color={T.green}/>
              <ProgBar label="Coding" value={c.coding_score} color={T.orange}/>
              <div style={{ marginTop: 12, padding: '10px 14px', background: T.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>Overall Test Score</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(c.test_score || 0) }}>{c.test_score || 0}/100</span>
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: T.dim, fontSize: 12, fontStyle: 'italic' }}>No test scores recorded</div>
          )}
        </Card>

        {/* Skill Profile */}
        <Card>
          <CardTitle>Skill Profile</CardTitle>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Combined from GitHub, LeetCode & resume</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {allSkills.length
              ? allSkills.map((l, i) => (
                  <span key={l} style={{ fontSize: 11, background: SKILL_COLORS[i % SKILL_COLORS.length] + '15', color: SKILL_COLORS[i % SKILL_COLORS.length], borderRadius: 20, padding: '3px 9px', fontWeight: 600, border: `1px solid ${SKILL_COLORS[i % SKILL_COLORS.length]}30` }}>{l}</span>
                ))
              : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No skill data</span>}
          </div>
          {c.linkedin_summary && (
            <>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 5 }}>Professional Summary</div>
              <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.7, margin: 0 }}>{c.linkedin_summary.substring(0, 200)}…</p>
            </>
          )}
          {certs.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: '10px 0 5px' }}>Certifications</div>
              {certs.map((cert, i) => <div key={i} style={{ fontSize: 11, color: T.blue, background: T.blueBg, borderRadius: 6, padding: '3px 9px', marginBottom: 4, display: 'inline-block', marginRight: 4 }}>✓ {cert}</div>)}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── AI Report Tab ─────────────────────────────────────────────────
function AIReportTab({ ev, c }) {
  if (!ev) return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={T.dim} strokeWidth="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>No AI Evaluation Found</div>
      <div style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>Student has not submitted their resume for evaluation yet.</div>
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

  const PIE_COLORS = [T.purple, T.green, T.accent, T.orange];

  const pieData = chart.pie?.filter(d => d.value > 0) || [
    { name: 'GitHub',   value: sources.github   === 'real' ? 30 : 0 },
    { name: 'LeetCode', value: sources.leetcode === 'real' ? 25 : 0 },
    { name: 'LinkedIn', value: sources.linkedin === 'real' ? 20 : 0 },
    { name: 'Test',     value: unified.test_performance?.source === 'test' ? 25 : 0 },
  ].filter(d => d.value > 0);

  // Skill bar — real languages with cross-platform scoring
  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const allSkills   = safeArr(c.all_skills);

  const skillBarData = allSkills.slice(0, 6).map((skill, i) => ({
    name:  skill.length > 10 ? skill.substring(0, 10) : skill,
    score: githubLangs.includes(skill) && lcLangs.includes(skill) ? 90 :
           githubLangs.includes(skill) ? 75 :
           lcLangs.includes(skill)     ? 65 : 45,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
  }));

  // Test bar — use candidate mcq/sql/coding directly
  const testBar = c.mcq_score != null ? [
    { name: 'MCQ',    score: c.mcq_score    || 0 },
    { name: 'SQL',    score: c.sql_score    || 0 },
    { name: 'Coding', score: c.coding_score || 0 },
  ] : (chart.testBar || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Decision Banner */}
      <div style={{ background: dBg, border: `1px solid ${dc}30`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <ScoreRing score={ev.overall_score || 0} size={80} color={dc}/>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: dc + '20', color: dc }}>{ev.decision || '—'}</span>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: T.accentLight, color: T.accent }}>Confidence: {ev.confidence}</span>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: T.muted }}>Risk: {ev.risk}</span>
          </div>
          {ev.recommendation && <p style={{ fontSize: 12, color: T.navy, margin: 0, lineHeight: 1.7 }}>{ev.recommendation}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(sources).map(([src, status]) => {
            const col = status === 'real' ? T.green : status === 'estimated' ? T.orange : T.red;
            const bg  = status === 'real' ? T.greenBg : status === 'estimated' ? T.orangeBg : T.redBg;
            return <span key={src} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: col, whiteSpace: 'nowrap' }}>{src.charAt(0).toUpperCase() + src.slice(1)} — {status?.toUpperCase()}</span>;
          })}
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ background: T.orangeBg, border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.orange }}>
          Missing sources: {missing.join(', ')}. Scores estimated and carry lower confidence.
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: T.muted }} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: T.navy }} tickLine={false} width={55}/>
                <Tooltip formatter={v => [`${v}/100`, 'Score']}/>
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {testBar.map((_, i) => <Cell key={i} fill={[T.blue, T.green, T.purple][i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card><CardTitle>Test Performance</CardTitle><div style={{ padding: '40px 0', textAlign: 'center', color: T.dim, fontSize: 12, fontStyle: 'italic' }}>No test data recorded</div></Card>
        )}
      </div>

      {/* Skill Language Strength */}
      {skillBarData.length > 0 && (
        <Card>
          <CardTitle>Language & Skill Strength</CardTitle>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
            Skills scored by cross-platform presence — appearing in both GitHub & LeetCode scores highest (90), GitHub only (75), LeetCode only (65), resume only (45).
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={skillBarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.navy }} tickLine={false}/>
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: T.muted }} tickLine={false}/>
              <Tooltip formatter={v => [`${v}`, 'Strength Score']}/>
              <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                {skillBarData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {skillBarData.map((s, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: s.color + '15', color: s.color, fontWeight: 600 }}>
                {s.name} — {s.score}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Dimension Scores */}
      <Card>
        <CardTitle>Dimension Score Breakdown</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <ProgBar label="Coding Skill"          value={dim.coding_skill}          color={T.purple}/>
            <ProgBar label="Problem Solving"       value={dim.problem_solving}       color={T.green}/>
            <ProgBar label="Consistency"           value={dim.consistency}           color={T.blue}/>
          </div>
          <div>
            <ProgBar label="Professional Presence" value={dim.professional_presence} color={T.orange}/>
            {dim.test_performance != null && <ProgBar label="Test Performance" value={dim.test_performance} color={T.accent}/>}
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '11px 14px', background: T.bg, borderRadius: 8, fontSize: 11, color: T.muted, lineHeight: 1.9 }}>
          <strong style={{ color: T.navy, display: 'block', marginBottom: 3 }}>How scoring works:</strong>
          <b>Coding Skill</b> — GitHub: repos×8 + languages×8 + activity·<b> Problem Solving</b> — LeetCode: (Hard×3 + Medium×2 + Easy×1) ÷ 3·
          <b> Consistency</b> — GitHub push events/week + LeetCode medium-hard ratio, averaged·
          <b> Test</b> — MCQ×30% + SQL×30% + Coding×40%
          {unified.test_performance?.source === 'test' && <span style={{ color: T.accent, fontWeight: 600 }}> · Test weighted at 30% of overall score.</span>}
        </div>
      </Card>

      {/* AI Insights Timeline */}
      {insights.length > 0 && (
        <Card>
          <CardTitle>AI Insights</CardTitle>
          <div style={{ paddingLeft: 4 }}>
            {insights.map((ins, i) => <InsightItem key={i} {...ins} index={i}/>)}
          </div>
        </Card>
      )}

      {/* Dimension Analysis */}
      {(ev.decision_insights || []).length > 0 && (
        <Card>
          <CardTitle>Dimension-by-Dimension Analysis</CardTitle>
          {ev.decision_insights.map((msg, i) => {
            const labels = ['Coding Ability', 'Problem Solving', 'Consistency', 'Professional Presence', 'Test Performance'];
            const colors = [T.purple, T.green, T.blue, T.orange, T.accent];
            return (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, padding: '10px 14px', background: T.bg, borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors[i] + '18', border: `1.5px solid ${colors[i]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: colors[i], flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: colors[i], textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{labels[i] || `Dimension ${i+1}`}</div>
                  <div style={{ fontSize: 12, color: T.navy, lineHeight: 1.6 }}>{msg}</div>
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
  const [tab, setTab] = useState('overview');
  if (!candidate) return null;

  const ev    = candidate.__evaluation;
  const score = candidate.total_score || 0;
  const ringC = scoreColor(score);
  const dc    = ev?.decision ? decColor(ev.decision) : null;
  const dBg   = ev?.decision ? decBg(ev.decision)    : null;

  const rec   = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
  const recC  = score >= 70 ? T.green : score >= 50 ? T.accent : score >= 30 ? T.orange : T.red;
  const recBg = score >= 70 ? T.greenBg : score >= 50 ? T.accentLight : score >= 30 ? T.orangeBg : T.redBg;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,65,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: T.bg, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(10,42,65,0.25)', animation: 'fadeUp 0.22s ease' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 24px', background: T.white, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.accentLight, border: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || candidate.student_id || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{candidate.linkedin_name || candidate.name || candidate.student_id}</div>
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
              {ev?.decision && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: dBg, color: dc }}>{ev.decision}</span>}
              {ev?.confidence && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: T.accentLight, color: T.accent }}>Confidence: {ev.confidence}</span>}
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>{candidate.college || ''}{candidate.college && candidate.email ? ' · ' : ''}{candidate.email || ''}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={score} size={58} color={ringC}/>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Total Score</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 17, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: T.white, borderBottom: `1px solid ${T.border}`, paddingLeft: 16, flexShrink: 0 }}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'ai', label: 'AI Report' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '11px 20px', fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? T.accent : T.muted, borderBottom: tab === t.id ? `2px solid ${T.accent}` : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {tab === 'overview' && <OverviewTab c={candidate}/>}
          {tab === 'ai'       && <AIReportTab ev={ev} c={candidate}/>}
        </div>
      </div>
    </div>
  );
}

// ── Decision Badge ────────────────────────────────────────────────
function DecisionBadge({ decision }) {
  if (!decision) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
  const map = { Hire: { bg: T.greenBg, color: T.green }, Maybe: { bg: T.orangeBg, color: T.orange }, Reject: { bg: T.redBg, color: T.red } };
  const s = map[decision] || map.Maybe;
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{decision}</span>;
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function Reports() {
  const [candidates,     setCandidates]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filterResult,   setFilterResult]   = useState('All');
  const [filterDecision, setFilterDecision] = useState('All');
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
      setCandidates(enriched.map(r => r.status === 'fulfilled' ? r.value : r.reason));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(c => {
    const name   = (c.linkedin_name || c.name || c.student_id || '').toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? 'Pass' : 'Fail';
    const dec    = c.__evaluation?.decision || null;
    return name.includes(search.toLowerCase()) &&
      (filterResult   === 'All' || result === filterResult) &&
      (filterDecision === 'All' || dec    === filterDecision);
  });

  const passCount   = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const failCount   = filtered.length - passCount;
  const avgScore    = filtered.length ? (filtered.reduce((s, c) => s + (c.total_score || 0), 0) / filtered.length).toFixed(1) : 0;
  const hireCount   = filtered.filter(c => c.__evaluation?.decision === 'Hire').length;
  const rejectCount = filtered.filter(c => c.__evaluation?.decision === 'Reject').length;

  const handleExport = () => {
    const headers = ['Student ID','Name','GitHub','LeetCode','Test','Total','Decision'];
    const rows = filtered.map(c => [c.student_id, c.linkedin_name || c.name || '', c.github_score || 0, c.leetcode_score || 0, Math.round(c.test_score || 0), Math.round(c.total_score || 0), c.__evaluation?.decision || '']);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a    = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'candidate_reports.csv';
    a.click();
  };

  return (
    <div style={{ marginLeft: 230, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        *, *::before, *::after { box-sizing: border-box; }
        .rep-tr:hover { background: #e8fafb !important; cursor: pointer; }
        .rep-btn:hover { background: ${T.accent} !important; color: #fff !important; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d0dde5; border-radius: 3px; }
      `}</style>
      <Sidebar/>
      <Navbar/>

      <main style={{ flex: 1, padding: '28px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Candidate Reports</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>AI-analyzed profiles with GitHub · LeetCode · Test scores</p>
          </div>
          <button onClick={handleExport} style={{ padding: '9px 18px', background: T.accent, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Export CSV</button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total',      value: filtered.length, color: T.accent  },
            { label: 'Passed',     value: passCount,       color: T.green   },
            { label: 'Failed',     value: failCount,       color: T.red     },
            { label: 'Avg Score',  value: avgScore,        color: T.blue    },
            { label: 'AI Hire',    value: hireCount,       color: T.green   },
            { label: 'AI Reject',  value: rejectCount,     color: T.red     },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Table Panel */}
        <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: T.accentLight }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>Candidate Results</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…" style={{ border: 'none', outline: 'none', fontSize: 12, color: T.navy, background: 'transparent', width: 150 }}/>
              </div>
              {[
                { value: filterResult,   onChange: setFilterResult,   options: ['All', 'Pass', 'Fail'] },
                { value: filterDecision, onChange: setFilterDecision, options: ['All', 'Hire', 'Maybe', 'Reject'] },
              ].map((f, i) => (
                <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, color: T.navy, background: T.white, cursor: 'pointer', outline: 'none' }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading candidates…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.dim, fontSize: 13 }}>No candidates found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fbfc', borderBottom: `2px solid ${T.border}` }}>
                    {['#','Candidate','GitHub','LeetCode','Test','Total','Recommendation','AI Decision','Status','Action'].map((h, i) => (
                      <th key={i} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const score = c.total_score || 0;
                    const rec   = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
                    const recC  = score >= 70 ? T.green : score >= 50 ? T.accent : score >= 30 ? T.orange : T.red;
                    const recBg = score >= 70 ? T.greenBg : score >= 50 ? T.accentLight : score >= 30 ? T.orangeBg : T.redBg;
                    const langs = safeArr(c.github_top_languages);
                    return (
                      <tr key={c.student_id} className="rep-tr" style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} onClick={() => setSelected(c)}>
                        <td style={{ padding: '12px 14px', color: T.dim, fontFamily: 'monospace', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: T.navy, marginBottom: 2 }}>{c.linkedin_name || c.name || c.student_id}</div>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {langs.slice(0, 3).map(l => <span key={l} style={{ fontSize: 9, background: T.purpleBg, color: T.purple, borderRadius: 20, padding: '1px 6px' }}>{l}</span>)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 40, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${c.github_score || 0}%`, height: '100%', background: T.purple }}/></div>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{c.github_score || 0}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 40, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${c.leetcode_score || 0}%`, height: '100%', background: T.green }}/></div>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{c.leetcode_score || 0}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{Math.round(c.test_score || 0)}</td>
                        <td style={{ padding: '12px 14px' }}><ScoreRing score={score} size={40} color={scoreColor(score)}/></td>
                        <td style={{ padding: '12px 14px' }}><span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span></td>
                        <td style={{ padding: '12px 14px' }}><DecisionBadge decision={c.__evaluation?.decision}/></td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: c.status === 'ready' ? T.greenBg : T.orangeBg, color: c.status === 'ready' ? T.green : T.orange }}>
                            {c.status === 'ready' ? 'Ready' : 'Processing'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button className="rep-btn" onClick={e => { e.stopPropagation(); setSelected(c); }}
                            style={{ padding: '5px 12px', background: T.accentLight, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
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
      </main>

      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)}/>}
      <ToastContainer/>
    </div>
  );
}