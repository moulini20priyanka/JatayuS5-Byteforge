// Reports.jsx — FULL FILE
// Hiring section: UNTOUCHED (original code preserved exactly)
// University section: FIXED — keywords hidden, auto-score working, dynamic marks, Gemini free AI

import React, { useState, useEffect, useCallback } from 'react';
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
  bg: '#f0fafb', white: '#ffffff', border: '#e2e8ed',
  accent: '#2BB1A8', accentLight: '#e8fafb',
  navy: '#0A2A41', muted: '#3d6878', dim: '#7aacba',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  red: '#dc2626', redBg: '#fef2f2',
  orange: '#ea580c', orangeBg: '#fff7ed',
  purple: '#7c3aed', purpleBg: '#f5f3ff',
  blue: '#2563eb', blueBg: '#eff6ff',
};

const SKILL_COLORS = [T.purple, T.green, T.blue, T.orange, T.accent, T.red];

const safeArr   = v => { try { return Array.isArray(v) ? v : JSON.parse(v || '[]'); } catch { return []; } };
const safeObj   = v => { try { return (v && typeof v === 'object') ? v : JSON.parse(v || '{}'); } catch { return {}; } };
const scoreColor = s => s >= 70 ? T.green : s >= 40 ? T.orange : T.red;
const decColor   = d => d === 'Hire' ? T.green : d === 'Reject' ? T.red : T.orange;
const decBg      = d => d === 'Hire' ? T.greenBg : d === 'Reject' ? T.redBg : T.orangeBg;

// ── Strip keywords suffix from question text (for admin display) ───────────
function stripKeywords(text = '') {
  return text.replace(/\s*keywords?\s*:[\s\S]*/i, '').trim();
}

// ── Extract keywords from question (embedded or dedicated field) ──────────
function extractKeywords(item) {
  // 1. Dedicated keywords field
  if (item.keywords && typeof item.keywords === 'string' && item.keywords.trim()) {
    return item.keywords.trim();
  }
  // 2. Embedded in question text: "...question text. keywords: - Word1 - Word2"
  const text = item.questionText || '';
  const match = text.match(/keywords?\s*:\s*([\s\S]+)/i);
  if (match) {
    const raw = match[1].trim();
    // Convert "- FIFO queue - Simple - Convoy effect" → "FIFO queue, Simple, Convoy effect"
    const parts = raw.split(/\s*[-–]\s*/).map(p => p.trim()).filter(Boolean);
    return parts.join(', ');
  }
  return '';
}

// ── Client-side keyword scorer (mirrors backend logic) ───────────────────
function scoreByKeywords(answerText, keywordsStr, maxMarks = 8) {
  if (!answerText || !keywordsStr) return { score: 0, percentage: 0, matched: [], missing: [] };

  const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (keywords.length === 0) return { score: 0, percentage: 0, matched: [], missing: [] };

  const answerLower = answerText.toLowerCase();
  const matched = [];
  const missing = [];

  for (const kw of keywords) {
    const parts = kw.replace(/[()]/g, '').split(/[,\s/]+/).filter(w => w.length > 2);
    const found = parts.some(part => answerLower.includes(part));
    if (found) matched.push(kw);
    else missing.push(kw);
  }

  const percentage = Math.round((matched.length / keywords.length) * 100);
  const rawScore   = (matched.length / keywords.length) * maxMarks;
  const score      = Math.round(rawScore * 2) / 2; // round to nearest 0.5

  return { score, percentage, matched, missing };
}

// ══════════════════════════════════════════════════════════════════════════════
//  FREE AI GRADER — Gemini 2.0 Flash (completely free, no credit card)
//  Get API key free at: https://aistudio.google.com/app/apikey
// ══════════════════════════════════════════════════════════════════════════════
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

async function gradeWithGemini(questionText, studentAnswer, keywords, maxMarks) {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] No API key set. Add REACT_APP_GEMINI_API_KEY to .env');
    return null;
  }

  const cleanQuestion = stripKeywords(questionText);
  const prompt = `You are a strict but fair university exam evaluator.

Question: ${cleanQuestion}

Expected keywords/concepts: ${keywords}

Student's answer: ${studentAnswer}

Maximum marks: ${maxMarks}

Evaluate the answer. Award marks based on how many expected concepts are covered, accuracy, and clarity.

Return ONLY valid JSON (no markdown, no extra text):
{
  "score": <number 0-${maxMarks}, use 0.5 steps>,
  "percentage": <0-100 integer>,
  "feedback": "<2-3 sentences: what was good, what was missing>",
  "strengths": ["<point 1>", "<point 2>"],
  "improvements": ["<missing concept 1>", "<missing concept 2>"],
  "keywordsCovered": ["<keyword found>"],
  "keywordsMissed": ["<keyword not found>"]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
        }),
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Gemini grade error]', err);
    return null;
  }
}

// Fallback: use Anthropic API via proxy if Gemini key not set
async function gradeWithClaude(questionText, studentAnswer, keywords, maxMarks) {
  const cleanQuestion = stripKeywords(questionText);
  const prompt = `You are a strict university exam evaluator.

Question: ${cleanQuestion}
Expected keywords: ${keywords}
Student answer: ${studentAnswer}
Max marks: ${maxMarks}

Return ONLY valid JSON:
{
  "score": <0-${maxMarks}, 0.5 steps>,
  "percentage": <0-100>,
  "feedback": "<2-3 sentences>",
  "strengths": ["<point>"],
  "improvements": ["<missing concept>"],
  "keywordsCovered": ["<found keyword>"],
  "keywordsMissed": ["<missing keyword>"]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text  = data.content?.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Claude grade error]', err);
    return null;
  }
}

// Primary grader: try Gemini first, fallback to Claude
async function gradeWrittenAnswer(questionText, studentAnswer, keywords, maxMarks) {
  // First try instant keyword scoring (always works, no API needed)
  const kwResult = scoreByKeywords(studentAnswer, keywords, maxMarks);

  // Then try AI for richer feedback
  let aiResult = null;
  if (GEMINI_API_KEY) {
    aiResult = await gradeWithGemini(questionText, studentAnswer, keywords, maxMarks);
  }
  if (!aiResult) {
    aiResult = await gradeWithClaude(questionText, studentAnswer, keywords, maxMarks);
  }

  // If AI succeeded, return it (more accurate)
  if (aiResult && typeof aiResult.score === 'number') {
    return { ...aiResult, source: GEMINI_API_KEY ? 'gemini' : 'claude' };
  }

  // Fallback to keyword-only scoring
  return {
    score:           kwResult.score,
    percentage:      kwResult.percentage,
    feedback:        `Answer covers ${kwResult.matched.length} of ${kwResult.matched.length + kwResult.missing.length} expected concepts.`,
    strengths:       kwResult.matched.map(k => `Mentioned: ${k}`),
    improvements:    kwResult.missing.map(k => `Missing: ${k}`),
    keywordsCovered: kwResult.matched,
    keywordsMissed:  kwResult.missing,
    source:          'keyword',
  };
}

// ── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56, color }) {
  const c    = color || scoreColor(score);
  const r    = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={T.navy}
        fontSize={size > 60 ? 14 : 11} fontWeight="700" fontFamily="'DM Sans',sans-serif">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

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

function Card({ children, style }) {
  return <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px', ...style }}>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>{children}</div>;
}

// ── Overview Tab (Hiring) ────────────────────────────────────────────────────
function OverviewTab({ c }) {
  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const certs       = safeArr(c.linkedin_certifications);
  const allSkills   = safeArr(c.all_skills);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Coding Skill',    value: c.github_score     || 0, color: T.purple, sub: 'GitHub-based'   },
          { label: 'Problem Solving', value: c.leetcode_score   || 0, color: T.green,  sub: 'LeetCode-based' },
          { label: 'Consistency',     value: c.consistency_score ?? '—', color: T.blue, sub: 'Avg across platforms' },
          { label: 'Test Score',      value: c.test_score       || 0, color: T.orange, sub: 'MCQ+SQL+Code'   },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} style={{ borderTop: `3px solid ${color}`, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.navy }}>{value}</div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
        <Card>
          <CardTitle>Skill Profile</CardTitle>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {allSkills.length
              ? allSkills.map((l, i) => <span key={l} style={{ fontSize: 11, background: SKILL_COLORS[i % SKILL_COLORS.length] + '15', color: SKILL_COLORS[i % SKILL_COLORS.length], borderRadius: 20, padding: '3px 9px', fontWeight: 600, border: `1px solid ${SKILL_COLORS[i % SKILL_COLORS.length]}30` }}>{l}</span>)
              : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No skill data</span>}
          </div>
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

// ── AI Report Tab (Hiring) ───────────────────────────────────────────────────
function AIReportTab({ ev, c }) {
  if (!ev) return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>No AI Evaluation Found</div>
      <div style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>Student has not submitted for evaluation yet.</div>
    </div>
  );
  const dim      = ev.dimension_scores || {};
  const dc       = decColor(ev.decision);
  const dBg      = decBg(ev.decision);
  const insights = ev.insights || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: dBg, border: `1px solid ${dc}30`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <ScoreRing score={ev.overall_score || 0} size={80} color={dc}/>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: dc + '20', color: dc }}>{ev.decision || '—'}</span>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: T.accentLight, color: T.accent }}>Confidence: {ev.confidence}</span>
          </div>
          {ev.recommendation && <p style={{ fontSize: 12, color: T.navy, margin: 0, lineHeight: 1.7 }}>{ev.recommendation}</p>}
        </div>
      </div>
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
      </Card>
      {insights.length > 0 && (
        <Card>
          <CardTitle>AI Insights</CardTitle>
          {insights.map((ins, i) => (
            <div key={i} style={{ padding: '10px 14px', background: T.bg, borderRadius: 8, marginBottom: 8, fontSize: 12, color: T.navy, lineHeight: 1.6 }}>
              {ins.message}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Report Modal (Hiring) ────────────────────────────────────────────────────
function ReportModal({ candidate, onClose }) {
  const [tab, setTab] = useState('overview');
  if (!candidate) return null;
  const ev    = candidate.__evaluation;
  const score = candidate.total_score || 0;
  const ringC = scoreColor(score);
  const rec   = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
  const recC  = score >= 70 ? T.green : score >= 50 ? T.accent : score >= 30 ? T.orange : T.red;
  const recBg = score >= 70 ? T.greenBg : score >= 50 ? T.accentLight : score >= 30 ? T.orangeBg : T.redBg;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,65,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: T.bg, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(10,42,65,0.25)', animation: 'fadeUp 0.22s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 24px', background: T.white, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.accentLight, border: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || candidate.student_id || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{candidate.linkedin_name || candidate.name || candidate.student_id}</div>
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>
              {candidate.college || ''}{candidate.college && candidate.email ? ' · ' : ''}{candidate.email || ''}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={score} size={58} color={ringC}/>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Total Score</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 17, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ display: 'flex', background: T.white, borderBottom: `1px solid ${T.border}`, paddingLeft: 16, flexShrink: 0 }}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'ai', label: 'AI Report' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '11px 20px', fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? T.accent : T.muted, borderBottom: tab === t.id ? `2px solid ${T.accent}` : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {tab === 'overview' && <OverviewTab c={candidate}/>}
          {tab === 'ai'       && <AIReportTab ev={ev} c={candidate}/>}
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }) {
  if (!decision) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
  const map = { Hire: { bg: T.greenBg, color: T.green }, Maybe: { bg: T.orangeBg, color: T.orange }, Reject: { bg: T.redBg, color: T.red } };
  const s = map[decision] || map.Maybe;
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{decision}</span>;
}

// ── College Group Card (Hiring) ──────────────────────────────────────────────
function CollegeGroup({ college, candidates, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const pass   = candidates.filter(c => (c.total_score || 0) >= 50).length;
  const fail   = candidates.length - pass;
  const avg    = candidates.length ? (candidates.reduce((s, c) => s + (c.total_score || 0), 0) / candidates.length).toFixed(1) : 0;
  const hires  = candidates.filter(c => c.__evaluation?.decision === 'Hire').length;
  return (
    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 20px', background: T.accentLight, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderBottom: expanded ? `1px solid ${T.border}` : 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accent + '22', border: `1px solid ${T.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏫</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{college || 'Unknown College'}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[{ v: pass, l: 'Passed', c: T.green }, { v: fail, l: 'Failed', c: T.red }, { v: avg, l: 'Avg Score', c: T.blue }, { v: hires, l: 'AI Hire', c: T.accent }].map(({ v, l, c }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{l}</div>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 18, color: T.muted, marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fbfc', borderBottom: `2px solid ${T.border}` }}>
                {['#', 'Candidate', 'GitHub', 'LeetCode', 'Test', 'Total', 'Recommendation', 'AI Decision', 'Status', 'Action'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => {
                const score = c.total_score || 0;
                const rec   = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
                const recC  = score >= 70 ? T.green : score >= 50 ? T.accent : score >= 30 ? T.orange : T.red;
                const recBg = score >= 70 ? T.greenBg : score >= 50 ? T.accentLight : score >= 30 ? T.orangeBg : T.redBg;
                const langs = safeArr(c.github_top_languages);
                return (
                  <tr key={c.student_id || i} className="rep-tr" style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s', cursor: 'pointer' }} onClick={() => onSelect(c)}>
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
                      <button className="rep-btn" onClick={e => { e.stopPropagation(); onSelect(c); }}
                        style={{ padding: '5px 12px', background: T.accentLight, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UNIVERSITY SECTION — fixed below
// ═══════════════════════════════════════════════════════════════════════════════

// ── Keyword chip ─────────────────────────────────────────────────────────────
function KwChip({ text, matched }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      margin: '2px', border: '1px solid',
      background: matched ? T.greenBg  : T.redBg,
      color:      matched ? T.green    : T.red,
      borderColor:matched ? '#bbf7d0'  : '#fecaca',
    }}>
      {matched ? '✓' : '✕'} {text}
    </span>
  );
}

// ── AI source badge ───────────────────────────────────────────────────────────
function AISourceBadge({ source }) {
  const map = {
    gemini:  { label: '✦ Gemini AI',  bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    claude:  { label: '✦ Claude AI',  bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    keyword: { label: '⊡ Keyword',    bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  };
  const s = map[source] || map.keyword;
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: 'monospace', letterSpacing: '0.3px' }}>
      {s.label}
    </span>
  );
}

// ── Written answer review card ────────────────────────────────────────────────
// Shows: clean question | keywords pills | keyword auto-score on load |
//        AI grade button (Gemini → Claude fallback) with full insight panel |
//        faculty score slider + number input | save to DB
function WrittenReviewCard({ item, assignmentId, questionIdx, onSaveScore }) {
  const keywords     = extractKeywords(item);
  const cleanQ       = stripKeywords(item.questionText || '');
  const maxMarks     = item.maxScore || 8;
  const hasAnswer    = !!(item.studentAnswer?.trim());

  // ── Keyword score computed immediately on mount ──────────────────────────
  const kwResult = React.useMemo(() => {
    if (!hasAnswer || !keywords) return { score: 0, percentage: 0, matched: [], missing: [] };
    return scoreByKeywords(item.studentAnswer, keywords, maxMarks);
  }, [item.studentAnswer, keywords, maxMarks]);

  // Use backend auto-score if > 0, otherwise use client-side keyword score
  const baseScore = (item.autoScore != null && item.autoScore > 0)
    ? item.autoScore
    : kwResult.score;

  // ── State ────────────────────────────────────────────────────────────────
  const [aiResult, setAiResult]   = useState(null);
  const [grading,  setGrading]    = useState(false);
  const [gradeErr, setGradeErr]   = useState('');
  // Faculty score: start from facultyScore if already set, else baseScore
  const initFac = item.facultyScore != null ? item.facultyScore : baseScore;
  const [facScore, setFacScore]   = useState(initFac);
  const [facNote,  setFacNote]    = useState(item.facultyComment ?? '');
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);

  const hasFaculty   = item.facultyScore != null;
  // Display score priority: faculty > AI > keyword auto
  const displayScore = hasFaculty
    ? item.facultyScore
    : (aiResult?.score ?? baseScore);

  const scoreSource  = hasFaculty ? 'faculty'
    : aiResult ? aiResult.source
    : 'keyword';

  const sourceConfig = {
    faculty: { label: 'Faculty Score', color: T.purple,  bg: T.purpleBg,  border: '#ddd6fe' },
    gemini:  { label: '✦ Gemini AI',   color: T.green,   bg: T.greenBg,   border: '#bbf7d0' },
    claude:  { label: '✦ Claude AI',   color: T.blue,    bg: T.blueBg,    border: '#bfdbfe' },
    keyword: { label: '⊡ Keyword',     color: T.muted,   bg: '#f8f9fd',   border: T.border  },
  };
  const src = sourceConfig[scoreSource] || sourceConfig.keyword;

  // ── Grade with AI ────────────────────────────────────────────────────────
  const handleGrade = async () => {
    if (!hasAnswer) return;
    setGrading(true);
    setGradeErr('');
    try {
      const result = await gradeWrittenAnswer(
        item.questionText, item.studentAnswer, keywords, maxMarks
      );
      if (result) {
        setAiResult(result);
        // Pre-fill faculty score with AI suggestion (only if not already set by faculty)
        if (!hasFaculty) setFacScore(result.score);
      } else {
        setGradeErr('AI grading failed. Please try again or score manually.');
      }
    } catch (e) {
      setGradeErr('Error: ' + e.message);
    }
    setGrading(false);
  };

  // ── Save faculty score ───────────────────────────────────────────────────
  const handleSave = async () => {
    const val = parseFloat(facScore);
    if (isNaN(val) || val < 0 || val > maxMarks) return;
    setSaving(true);
    await onSaveScore(assignmentId, item.questionId, val, facNote);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Keyword chips to show — use AI result if available, else client-side
  const shownMatched = aiResult?.keywordsCovered ?? kwResult.matched;
  const shownMissing = aiResult?.keywordsMissed  ?? kwResult.missing;
  const shownPct     = aiResult?.percentage      ?? kwResult.percentage;

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>

      {/* ── Question header ─────────────────────────────────────────────── */}
      <div style={{ padding: '14px 18px', background: '#f8fbfc', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.dim,
              background: '#eef2ff', border: `1px solid #c7d2fe`, borderRadius: 5, padding: '2px 7px' }}>
              Q{questionIdx + 1}
            </span>
            <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>{maxMarks} marks</span>
          </div>
          {/* Clean question — no keywords leaked */}
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, lineHeight: 1.55, marginBottom: 8 }}>
            {cleanQ || item.questionText}
          </div>
          {/* Keywords shown as admin-only pills */}
          {keywords && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: T.dim, letterSpacing: '0.5px' }}>EXPECTED KEYWORDS:</span>
              {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, ki) => (
                <span key={ki} style={{ fontSize: 10, background: '#eff6ff', border: `1px solid #bfdbfe`,
                  borderRadius: 20, padding: '2px 8px', color: '#1d4ed8', fontFamily: 'monospace', fontWeight: 500 }}>{kw}</span>
              ))}
            </div>
          )}
        </div>

        {/* Score display */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: src.color, lineHeight: 1 }}>
            {displayScore}
            <span style={{ fontSize: 12, fontWeight: 400, color: T.dim }}> / {maxMarks}</span>
          </div>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700,
            background: src.bg, color: src.color, border: `1px solid ${src.border}`,
            fontFamily: 'monospace', letterSpacing: '0.3px' }}>
            {src.label.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>

        {/* ── Student answer ───────────────────────────────────────────── */}
        <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: '0.5px', marginBottom: 7 }}>STUDENT ANSWER</div>
        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.75, background: '#f8f9fd',
          padding: '12px 15px', borderRadius: 9, border: `1px solid ${T.border}`,
          marginBottom: 16, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {hasAnswer ? item.studentAnswer.trim() : <em style={{ color: T.dim }}>No answer submitted</em>}
        </div>

        {/* ── Keyword coverage (auto on load) ─────────────────────────── */}
        {keywords && hasAnswer && (
          <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fafbff',
            border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>
                KEYWORD COVERAGE
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Mini progress bar */}
                <div style={{ width: 80, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${shownPct}%`, height: '100%', borderRadius: 99,
                    background: shownPct >= 70 ? T.green : shownPct >= 40 ? T.orange : T.red,
                    transition: 'width 0.6s ease' }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800,
                  color: shownPct >= 70 ? T.green : shownPct >= 40 ? T.orange : T.red,
                  fontFamily: 'monospace' }}>{shownPct}%</span>
                <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>
                  ({shownMatched.length}/{shownMatched.length + shownMissing.length})
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {shownMatched.map(k => <KwChip key={k} text={k} matched={true}/>)}
              {shownMissing.map(k => <KwChip key={k} text={k} matched={false}/>)}
            </div>
            {/* Auto score from keyword matching */}
            {!aiResult && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: T.white,
                border: `1px solid ${T.border}`, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: T.muted }}>Keyword auto-score</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.muted, fontFamily: 'monospace' }}>
                  {baseScore} / {maxMarks}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── AI Evaluation result panel ───────────────────────────────── */}
        {aiResult && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${aiResult.source === 'gemini' ? '#bbf7d0' : '#bfdbfe'}` }}>
            {/* AI header */}
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: aiResult.source === 'gemini' ? '#f0fdf4' : '#eff6ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.5px',
                  color: aiResult.source === 'gemini' ? T.green : T.blue }}>
                  {aiResult.source === 'gemini' ? '✦ GEMINI AI EVALUATION' : '✦ CLAUDE AI EVALUATION'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>AI suggests:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: aiResult.source === 'gemini' ? T.green : T.blue,
                  fontFamily: 'monospace' }}>
                  {aiResult.score}<span style={{ fontSize: 11, fontWeight: 400, color: T.dim }}> / {maxMarks}</span>
                </span>
              </div>
            </div>
            {/* AI body */}
            <div style={{ padding: '14px 16px', background: T.white }}>
              <p style={{ fontSize: 13, color: T.navy, lineHeight: 1.7, margin: '0 0 12px' }}>
                {aiResult.feedback}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {aiResult.strengths?.length > 0 && (
                  <div style={{ padding: '10px 12px', background: T.greenBg,
                    border: `1px solid #bbf7d0`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.green, marginBottom: 6,
                      fontFamily: 'monospace' }}>✓ STRENGTHS</div>
                    {aiResult.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#166534', marginBottom: 3 }}>• {s}</div>
                    ))}
                  </div>
                )}
                {aiResult.improvements?.length > 0 && (
                  <div style={{ padding: '10px 12px', background: T.orangeBg,
                    border: `1px solid #fed7aa`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, marginBottom: 6,
                      fontFamily: 'monospace' }}>✕ MISSING CONCEPTS</div>
                    {aiResult.improvements.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#9a3412', marginBottom: 3 }}>• {s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {gradeErr && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: T.redBg,
            border: `1px solid #fecaca`, borderRadius: 8, fontSize: 12, color: T.red }}>{gradeErr}</div>
        )}

        {/* ── Grade with AI button ─────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handleGrade}
            disabled={grading || !hasAnswer}
            style={{
              width: '100%', padding: '10px 18px', borderRadius: 9, border: 'none',
              cursor: (!hasAnswer || grading) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, transition: 'all 0.2s',
              background: grading ? '#e2e8f0'
                : aiResult ? T.white
                : `linear-gradient(135deg, ${T.accent}, #1d9e95)`,
              color:  grading ? T.dim : aiResult ? T.accent : '#fff',
              border: aiResult ? `1.5px solid ${T.accent}` : 'none',
              boxShadow: (!grading && !aiResult) ? '0 3px 12px rgba(43,177,168,0.3)' : 'none',
              opacity: (!hasAnswer) ? 0.5 : 1,
            }}
          >
            {grading ? (
              <><span style={{ display:'inline-block', width:14, height:14, border:'2.5px solid #94a3b8',
                borderTopColor:T.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Grading with AI…</>
            ) : aiResult ? (
              <>↻ Re-grade with AI</>
            ) : (
              <>✦ Grade with AI {GEMINI_API_KEY ? '(Gemini Free)' : '(Claude)'}</>
            )}
          </button>
          {!hasAnswer && (
            <div style={{ marginTop: 5, fontSize: 11, color: T.dim, textAlign: 'center' }}>
              No answer to grade
            </div>
          )}
        </div>

        {/* ── Faculty score adjustment ─────────────────────────────────── */}
        <div style={{ padding: '16px', background: '#fafbff',
          border: `1.5px solid ${saved ? '#bbf7d0' : hasFaculty ? '#ddd6fe' : T.border}`,
          borderRadius: 12, transition: 'border-color 0.3s' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: 'monospace',
            letterSpacing: '0.5px', marginBottom: 12 }}>
            FACULTY SCORE ADJUSTMENT
            {hasFaculty && <span style={{ marginLeft: 8, color: T.purple }}>· Previously saved: {item.facultyScore}/{maxMarks}</span>}
          </div>

          {/* Score slider + number input side by side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <input
                type="range"
                min={0} max={maxMarks} step={0.5}
                value={facScore}
                onChange={e => setFacScore(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: T.accent, height: 4, cursor: 'pointer' }}
              />
              {/* Tick marks */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {Array.from({ length: maxMarks + 1 }, (_, i) => (
                  <span key={i} style={{ fontSize: 9, color: T.dim, fontFamily: 'monospace',
                    opacity: i % 2 === 0 ? 1 : 0.4 }}>{i}</span>
                ))}
              </div>
            </div>
            {/* Number input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setFacScore(s => Math.max(0, parseFloat((s - 0.5).toFixed(1))))}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
                  background: T.white, cursor: 'pointer', fontSize: 16, fontWeight: 700,
                  color: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <div style={{ textAlign: 'center' }}>
                <input
                  type="number" min={0} max={maxMarks} step={0.5}
                  value={facScore}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= maxMarks) setFacScore(v);
                  }}
                  style={{ width: 60, padding: '6px 4px', border: `1.5px solid ${T.accent}`,
                    borderRadius: 8, fontSize: 18, fontFamily: 'monospace', fontWeight: 800,
                    textAlign: 'center', outline: 'none', color: T.navy }}
                />
                <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', marginTop: 1 }}>/ {maxMarks}</div>
              </div>
              <button onClick={() => setFacScore(s => Math.min(maxMarks, parseFloat((s + 0.5).toFixed(1))))}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
                  background: T.white, cursor: 'pointer', fontSize: 16, fontWeight: 700,
                  color: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>

          {/* AI suggestion quick-apply buttons */}
          {aiResult && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: T.dim, alignSelf: 'center', fontFamily: 'monospace' }}>Apply AI score:</span>
              {[aiResult.score,
                Math.max(0, parseFloat((aiResult.score - 0.5).toFixed(1))),
                Math.min(maxMarks, parseFloat((aiResult.score + 0.5).toFixed(1)))
              ].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                <button key={v} onClick={() => setFacScore(v)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${T.accent}`,
                    background: facScore === v ? T.accent : T.white,
                    color: facScore === v ? '#fff' : T.accent,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
                    transition: 'all 0.15s' }}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {/* Comment input */}
          <input
            type="text"
            placeholder="Add comment (optional) — e.g. 'Missing diagram explanation'"
            value={facNote}
            onChange={e => setFacNote(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: `1px solid ${T.border}`,
              borderRadius: 8, fontSize: 12, outline: 'none', marginBottom: 10,
              fontFamily: 'inherit', color: T.navy }}
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '10px', borderRadius: 9, border: 'none',
              cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 700,
              background: saved
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff',
              boxShadow: saved ? '0 2px 10px rgba(22,163,74,0.3)' : '0 2px 10px rgba(124,58,237,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Score Saved Successfully' : `Save Score: ${facScore}/${maxMarks}`}
          </button>

          {hasFaculty && item.facultyComment && (
            <div style={{ marginTop: 8, fontSize: 11, color: T.purple, fontStyle: 'italic',
              background: T.purpleBg, padding: '6px 10px', borderRadius: 6 }}>
              Previous note: "{item.facultyComment}"
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── University student row ────────────────────────────────────────────────────
function UnivStudentRow({ student, rank, passMark, onExpand, expanded, onSaveScore }) {
  const pct      = student.percentage;
  const barColor = pct >= 75 ? T.green : pct >= 50 ? T.orange : T.red;
  // ✅ FIXED: Dynamic total marks from assignment, not hardcoded 100
  const totalMarks = student.totalMarks || 100;
  const statusMap = {
    completed: { label: 'Submitted',   color: T.green,  bg: T.greenBg  },
    started:   { label: 'In Progress', color: T.orange, bg: T.orangeBg },
    assigned:  { label: 'Not Started', color: T.dim,    bg: '#f1f5f9'  },
  };
  const st = statusMap[student.status] || statusMap.assigned;

  return (
    <>
      <tr className="rep-tr" style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.15s' }} onClick={onExpand}>
        <td style={{ padding: '12px 14px' }}>
          {rank != null
            ? <div style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'monospace', background: rank===1 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : rank<=3 ? '#fcd9bd' : '#f1f5f9', color: rank<=3 ? (rank===1 ? '#78350f' : '#9a3412') : T.dim }}>
                {rank}
              </div>
            : <span style={{ color: T.dim, fontSize: 11 }}>—</span>
          }
        </td>
        <td style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{student.studentName}</div>
          <div style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>{student.rollNo || student.studentEmail}</div>
        </td>
        <td style={{ padding: '12px 14px' }}>
          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
        </td>
        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: T.blue,   fontSize: 13 }}>{student.mcqScore ?? '—'}</td>
        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: T.purple, fontSize: 13 }}>{student.writtenAutoScore ?? '—'}</td>
        {/* ✅ FIXED: Shows score/dynamicTotal not /100 */}
        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: barColor }}>
          {student.totalScore ?? '—'}
          <span style={{ fontSize: 10, fontWeight: 400, color: T.dim }}>/{totalMarks}</span>
        </td>
        <td style={{ padding: '12px 14px', minWidth: 150 }}>
          {pct != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width .5s' }}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 34, fontFamily: 'monospace' }}>{pct}%</span>
            </div>
          )}
        </td>
        <td style={{ padding: '12px 14px' }}>
          {student.passed === true  && <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:T.greenBg, color:T.green }}>PASS</span>}
          {student.passed === false && <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:T.redBg,   color:T.red   }}>FAIL</span>}
          {student.passed == null   && <span style={{ color: T.dim, fontSize: 12 }}>—</span>}
        </td>
        <td style={{ padding: '12px 14px' }}>
          <button onClick={e => { e.stopPropagation(); onExpand(); }}
            style={{ padding: '5px 12px', background: T.accentLight, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {expanded ? 'Close' : 'Review'}
          </button>
        </td>
      </tr>

      {expanded && student.status === 'completed' && (
        <tr>
          <td colSpan={9} style={{ padding: '16px 24px', background: '#fafbff', borderBottom: `1px solid ${T.border}` }}>
            {/* Score summary bar */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14, padding:'10px 14px', background:T.white, borderRadius:10, border:`1px solid ${T.border}` }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:T.muted, fontFamily:'monospace' }}>MCQ</div>
                <div style={{ fontSize:18, fontWeight:800, color:T.blue }}>{student.mcqScore ?? '—'}</div>
              </div>
              <div style={{ fontSize:18, color:T.dim }}>+</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:T.muted, fontFamily:'monospace' }}>WRITTEN</div>
                <div style={{ fontSize:18, fontWeight:800, color:T.purple }}>{student.writtenAutoScore ?? '—'}</div>
              </div>
              <div style={{ fontSize:18, color:T.dim }}>=</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:T.muted, fontFamily:'monospace' }}>TOTAL</div>
                <div style={{ fontSize:18, fontWeight:800, color:barColor }}>
                  {student.totalScore ?? '—'}<span style={{ fontSize:11, color:T.dim }}>/{totalMarks}</span>
                </div>
              </div>
              <div style={{ flex:1 }}/>
              <div style={{ fontSize:13, fontWeight:700, color: pct >= 50 ? T.green : T.red }}>
                {pct != null ? `${pct}%` : ''} {student.passed === true ? '✓ PASS' : student.passed === false ? '✗ FAIL' : ''}
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, fontFamily: 'monospace', marginBottom: 12 }}>
              WRITTEN ANSWERS — Faculty Review & AI Grading
            </div>
            {(student.writtenBreakdown || []).length === 0
              ? <div style={{ color: T.dim, fontSize: 13, fontStyle: 'italic' }}>No written answers submitted.</div>
              : student.writtenBreakdown.map((item, qi) => (
                  <WrittenReviewCard
                    key={item.questionId}
                    item={item}
                    assignmentId={student.studentId}
                    questionIdx={qi}
                    onSaveScore={onSaveScore}
                  />
                ))
            }
          </td>
        </tr>
      )}
    </>
  );
}

// ── University exam report ────────────────────────────────────────────────────
function UnivExamReport({ exam, onBack }) {
  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('students');
  const [expandedStu, setExpandedStu] = useState(null);
  const [search,      setSearch]      = useState('');

  const loadReport = useCallback(() => {
    const token = localStorage.getItem('token');
    return fetch(`${API}/admin/university-exam/${exam.id}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
  }, [exam.id]);

  useEffect(() => {
    loadReport().then(d => { setReport(d); setLoading(false); }).catch(() => setLoading(false));
  }, [loadReport]);

  const handleSaveScore = async (assignmentId, questionId, score, comment) => {
    const token = localStorage.getItem('token');
    await fetch(`${API}/admin/university-exam/review-written`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignmentId, questionId, facultyScore: score, facultyComment: comment }),
    });
    const d = await loadReport();
    setReport(d);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ['Rank','Name','Email','Roll No','Status','MCQ','Written','Total','Max Marks','%','Result'],
      ...report.students.map(s => [
        s.rank ?? '—', s.studentName, s.studentEmail, s.rollNo ?? '—',
        s.status, s.mcqScore ?? '—', s.writtenAutoScore ?? '—',
        s.totalScore ?? '—',
        s.totalMarks,   // ✅ dynamic per student
        s.percentage != null ? `${s.percentage}%` : '—',
        s.passed === true ? 'PASS' : s.passed === false ? 'FAIL' : '—',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a   = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${exam.title}_report.csv`;
    a.click();
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: T.muted }}>Loading report…</div>;
  if (!report) return <div style={{ padding: 60, textAlign: 'center', color: T.red }}>Failed to load report.</div>;

  const { summary = {}, students = [], mcqAnalytics = [], writtenAnalytics = [] } = report;

  const filtered = students.filter(s =>
    !search ||
    s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(search.toLowerCase())
  );

  const tabStyle = (id) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 18px', fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
    color: activeTab === id ? T.accent : T.muted,
    borderBottom: activeTab === id ? `2px solid ${T.accent}` : '2px solid transparent',
    marginBottom: -1, transition: 'all 0.15s',
  });

  // ✅ FIXED: Show dynamic total marks from exam config
  const examTotalMarks = exam.total_marks || summary.totalMarks || '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.navy }}>{exam.title}</div>
          <div style={{ fontSize: 11, color: T.dim }}>
            {exam.subject_name || exam.subject_code || ''}
            {exam.semester ? ` · Sem ${exam.semester}` : ''}
            {exam.college  ? ` · ${exam.college}`      : ''}
            {exam.batch_year ? ` · Batch ${exam.batch_year}` : ''}
            {' · '}
            <span style={{ fontWeight:700, color:T.purple }}>Max {examTotalMarks} marks</span>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      {/* Summary tiles — ✅ Avg shows out of dynamic total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Students',  val: summary.totalStudents ?? '—', color: T.accent },
          { label: 'Submitted', val: summary.submitted ?? '—',     color: T.green  },
          { label: 'Pass Rate', val: summary.passRate != null ? `${summary.passRate}%` : '—', color: (summary.passRate ?? 0) >= 60 ? T.green : T.red },
          { label: 'Avg Score', val: summary.avgScore != null ? `${summary.avgScore}/${examTotalMarks}` : '—', color: T.purple },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', letterSpacing: '.5px', marginTop: 2 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Highest',     val: summary.highestScore != null ? `${summary.highestScore}/${examTotalMarks}` : '—', color: T.green  },
          { label: 'Lowest',      val: summary.lowestScore  != null ? `${summary.lowestScore}/${examTotalMarks}`  : '—', color: T.red    },
          { label: 'Not Started', val: summary.notStarted   ?? '—', color: T.dim    },
          { label: 'In Progress', val: summary.inProgress   ?? '—', color: T.orange },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', marginTop: 2 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, paddingLeft: 12 }}>
          {[
            { id: 'students', label: `Students (${filtered.length})` },
            { id: 'mcq',      label: 'MCQ Analytics' },
            { id: 'written',  label: 'Written Analysis' },
          ].map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'students' && (
          <div>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <input type="text" placeholder="Search by name, email, roll no…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, width: 280, outline: 'none' }}/>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fbfc', borderBottom: `2px solid ${T.border}` }}>
                    {['#', 'Student', 'Status', 'MCQ', 'Written', 'Total', 'Score %', 'Result', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <UnivStudentRow
                      key={s.studentId}
                      student={s}
                      rank={s.rank}
                      passMark={summary.passMark}
                      expanded={expandedStu === s.studentId}
                      onExpand={() => setExpandedStu(p => p === s.studentId ? null : s.studentId)}
                      onSaveScore={handleSaveScore}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: T.dim, fontSize: 13 }}>No students found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'mcq' && (
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>
              SORTED BY DIFFICULTY — HARDEST FIRST ({mcqAnalytics.length} questions)
            </div>
            {mcqAnalytics.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: T.dim }}>No MCQ data yet.</div>
              : mcqAnalytics.map((q, i) => {
                  const diffColor = q.difficulty === 'easy' ? T.green : q.difficulty === 'hard' ? T.red : T.orange;
                  const diffBg    = q.difficulty === 'easy' ? T.greenBg : q.difficulty === 'hard' ? T.redBg : T.orangeBg;
                  const maxCnt    = Math.max(...Object.values(q.answerDist || {}), 1);
                  return (
                    <div key={q.questionId} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace', paddingTop: 2, minWidth: 24 }}>Q{i+1}</span>
                      <div style={{ flex: 1 }}>
                        {/* ✅ Strip keywords from MCQ question display too */}
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 8, lineHeight: 1.5 }}>
                          {stripKeywords(q.questionText || '').substring(0, 120)}{q.questionText?.length > 120 ? '…' : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: diffBg, color: diffColor, fontFamily: 'monospace' }}>
                            {(q.difficulty || 'unknown').toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{q.correct}/{q.total} correct</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: diffColor, fontFamily: 'monospace' }}>{q.correctRate != null ? `${q.correctRate}%` : '—'}</span>
                          <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>Correct: <strong style={{ color: T.green }}>{q.correctAnswer}</strong></span>
                        </div>
                        {q.answerDist && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'flex-end' }}>
                            {Object.entries(q.answerDist).map(([opt, cnt]) => {
                              const isCorrect = opt === q.correctAnswer;
                              const barH = Math.max(4, Math.round((cnt / maxCnt) * 40));
                              return (
                                <div key={opt} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: T.dim, fontFamily: 'monospace' }}>{cnt}</span>
                                  <div style={{ width: 28, height: barH, borderRadius: 3, background: isCorrect ? T.green : '#e2e8f0' }}/>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: isCorrect ? T.green : T.dim, fontFamily: 'monospace' }}>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {activeTab === 'written' && (
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>
              WRITTEN KEYWORD COVERAGE ({writtenAnalytics.length} questions)
            </div>
            {writtenAnalytics.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: T.dim }}>No written submissions yet.</div>
              : writtenAnalytics.map((w, i) => {
                  const avgC = w.avgKeywordMatch >= 70 ? T.green : w.avgKeywordMatch >= 40 ? T.orange : T.red;
                  return (
                    <div key={w.questionId} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.dim, fontWeight: 700 }}>W{i+1}</span>
                          {/* ✅ Strip keywords from written question display */}
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginTop: 3, lineHeight: 1.5 }}>
                            {stripKeywords(w.questionText || '')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: avgC, lineHeight: 1 }}>
                            {w.avgKeywordMatch != null ? `${w.avgKeywordMatch}%` : '—'}
                          </div>
                          <div style={{ fontSize: 9, color: T.dim, fontFamily: 'monospace' }}>AVG COVERAGE</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                        Avg score: <strong style={{ color: T.purple }}>{w.avgScore ?? '—'}</strong> / {w.maxScore} · {w.total} responses
                      </div>
                      <div>
                        {(w.keywords || '').split(',').map(k => k.trim()).filter(Boolean).map((kw, ki) => (
                          <span key={ki} style={{ display: 'inline-block', background: '#f0f9ff', border: `1px solid #bae6fd`, borderRadius: 20, padding: '2px 9px', fontSize: 11, color: '#0284c7', margin: '2px', fontFamily: 'monospace' }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── University exams list ─────────────────────────────────────────────────────
function UniversitySection() {
  const [exams,   setExams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/exams?exam_type=university`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setExams(d.exams || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (selectedExam) return <UnivExamReport exam={selectedExam} onBack={() => setSelected(null)}/>;

  const filtered = exams.filter(e =>
    !search ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.college?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <input type="text" placeholder="Search exams…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, maxWidth: 300, outline: 'none' }}/>
        <span style={{ fontSize: 12, color: T.dim, fontFamily: 'monospace' }}>{filtered.length} exams</span>
      </div>
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.muted }}>Loading exams…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.dim, background: T.white, borderRadius: 14, border: `1px solid ${T.border}` }}>No university exams found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map(exam => {
            const isLive     = exam.status === 'scheduled' || exam.status === 'active';
            const isComplete = exam.status === 'completed';
            const statusC    = isComplete ? T.green : isLive ? T.accent : T.muted;
            const statusBg   = isComplete ? T.greenBg : isLive ? T.accentLight : '#f1f5f9';
            return (
              <div key={exam.id} className="rep-tr"
                style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: '18px 22px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onClick={() => setSelected(exam)}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: T.accentLight, border: `1px solid ${T.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 3 }}>{exam.title}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    {exam.subject_name || exam.subject_code || ''}
                    {exam.semester   ? ` · Sem ${exam.semester}`    : ''}
                    {exam.college    ? ` · ${exam.college}`          : ''}
                    {exam.batch_year ? ` · Batch ${exam.batch_year}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{exam.student_count || 0}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Students</div>
                  </div>
                  {/* ✅ Dynamic max marks */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>{exam.total_marks || '—'}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Max Marks</div>
                  </div>
                </div>
                <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg, color: statusC }}>
                  {exam.status || 'scheduled'}
                </span>
                <span style={{ fontSize: 18, color: T.dim }}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const [candidates,     setCandidates]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filterResult,   setFilterResult]   = useState('All');
  const [filterDecision, setFilterDecision] = useState('All');
  const [filterCollege,  setFilterCollege]  = useState('All');
  const [selected,       setSelected]       = useState(null);
  const [mode,           setMode]           = useState('hiring');

  useEffect(() => {
    axios.get(`${API}/reports/all`).then(async res => {
      const enriched = await Promise.allSettled(
        res.data.map(async row => {
          try { const ev = await axios.get(`${API}/report/evaluate/${row.student_id}`); return { ...row, __evaluation: ev.data }; }
          catch { return { ...row, __evaluation: null }; }
        })
      );
      setCandidates(enriched.map(r => r.status === 'fulfilled' ? r.value : r.reason));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allColleges = ['All', ...Array.from(new Set(candidates.map(c => c.college || 'Unknown College').filter(Boolean))).sort()];
  const filtered = candidates.filter(c => {
    const name   = (c.linkedin_name || c.name || c.student_id || '').toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? 'Pass' : 'Fail';
    const dec    = c.__evaluation?.decision || null;
    const coll   = c.college || 'Unknown College';
    return name.includes(search.toLowerCase()) &&
      (filterResult   === 'All' || result === filterResult) &&
      (filterDecision === 'All' || dec    === filterDecision) &&
      (filterCollege  === 'All' || coll   === filterCollege);
  });

  const grouped     = filtered.reduce((acc, c) => { const key = c.college || 'Unknown College'; if (!acc[key]) acc[key] = []; acc[key].push(c); return acc; }, {});
  const collegeKeys = Object.keys(grouped).sort();
  const passCount   = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const failCount   = filtered.length - passCount;
  const hireCount   = filtered.filter(c => c.__evaluation?.decision === 'Hire').length;
  const rejectCount = filtered.filter(c => c.__evaluation?.decision === 'Reject').length;

  const handleExport = () => {
    const csv  = [['Student ID','Name','College','GitHub','LeetCode','Test','Total','Decision'], ...filtered.map(c => [c.student_id, c.linkedin_name||c.name||'', c.college||'', c.github_score||0, c.leetcode_score||0, Math.round(c.test_score||0), Math.round(c.total_score||0), c.__evaluation?.decision||''])].map(r=>r.join(',')).join('\n');
    const a    = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='candidate_reports.csv'; a.click();
  };

  return (
    <div style={{ marginLeft: 230, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; }
        .rep-tr:hover { background: #e8fafb !important; cursor: pointer; }
        .rep-btn:hover { background: ${T.accent} !important; color: #fff !important; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d0dde5; border-radius: 3px; }
      `}</style>
      <Sidebar/>
      <Navbar/>
      <main style={{ flex: 1, padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Reports</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
              {mode === 'hiring' ? 'College-wise AI-analyzed candidate results' : 'University exam results & faculty review'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, gap: 2 }}>
              {[{ id:'hiring', label:'🎯 Hiring' }, { id:'university', label:'🎓 University' }].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', background: mode===m.id ? T.accent : 'transparent', color: mode===m.id ? '#fff' : T.muted, boxShadow: mode===m.id ? '0 2px 8px rgba(43,177,168,0.25)' : 'none' }}>
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'hiring' && (
              <button onClick={handleExport} style={{ padding: '9px 18px', background: T.accent, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Export CSV</button>
            )}
          </div>
        </div>

        {mode === 'hiring' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
              {[{ label:'Total', value:filtered.length, color:T.accent }, { label:'Colleges', value:collegeKeys.length, color:T.blue }, { label:'Passed', value:passCount, color:T.green }, { label:'Failed', value:failCount, color:T.red }, { label:'AI Hire', value:hireCount, color:T.green }, { label:'AI Reject', value:rejectCount, color:T.red }].map(({ label, value, color }) => (
                <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginRight: 6 }}>Filters</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…" style={{ border:'none', outline:'none', fontSize:12, color:T.navy, background:'transparent', width:160 }}/>
              </div>
              {[{ val:filterCollege,  set:setFilterCollege,  opts:allColleges }, { val:filterResult, set:setFilterResult, opts:['All','Pass','Fail'] }, { val:filterDecision, set:setFilterDecision, opts:['All','Hire','Maybe','Reject'] }].map((f, i) => (
                <select key={i} value={f.val} onChange={e => f.set(e.target.value)} style={{ padding:'6px 10px', fontSize:12, border:`1px solid ${T.border}`, borderRadius:8, color:T.navy, background:T.white, cursor:'pointer', outline:'none' }}>
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
            </div>
            {loading ? <div style={{ padding:48, textAlign:'center', color:T.muted, fontSize:13 }}>Loading candidates…</div>
              : filtered.length === 0 ? <div style={{ padding:48, textAlign:'center', color:T.dim, fontSize:13, background:T.white, borderRadius:14, border:`1px solid ${T.border}` }}>No candidates found.</div>
              : collegeKeys.map(college => <CollegeGroup key={college} college={college} candidates={grouped[college]} onSelect={setSelected}/>)
            }
          </>
        )}

        {mode === 'university' && <UniversitySection/>}
      </main>
      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)}/>}
      <ToastContainer/>
    </div>
  );
}