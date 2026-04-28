// Reports.jsx — FULL FILE
// Hiring section: UPDATED with static RMKEC 2026 batch data, new table columns, static stats
// University section: UNTOUCHED (original code preserved exactly)

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

// ── Static hiring candidates (RMKEC 2026 batch) ──────────────────────────────
const STATIC_CANDIDATES = [
  {
    student_id: 's_001',
    name: 'Moulini S',
    linkedin_name: 'Moulini S',
    email: 'moul22058.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
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
    github_top_languages: JSON.stringify(['Python', 'JavaScript']),
    leetcode_languages: JSON.stringify(['Python', 'C++']),
    all_skills: JSON.stringify(['Python', 'JavaScript', 'React', 'SQL']),
    hiring_exam: 'Virtusa – Full Stack Developer',
    status: 'ready',
    __evaluation: {
      overall_score: 65,
      decision: 'Maybe',
      confidence: 'Medium',
      risk: 'Medium',
      recommendation: 'Candidate shows decent coding skills. Consider for junior role.',
      dimension_scores: { coding_skill: 65, problem_solving: 58, consistency: 27, professional_presence: 50, test_performance: 72 },
      unified_scores: { test_performance: { source: 'test' } },
      source_status: { github: 'real', leetcode: 'real', linkedin: 'estimated' },
      missing_sources: ['linkedin'],
      insights: [
        { type: 'positive', section: 'coding', message: 'Active GitHub presence with regular commits.', severity: 'low' },
        { type: 'warning', section: 'consistency', message: 'Low consistency score flagged.', severity: 'medium' },
      ],
      decision_insights: ['Strong coding skills.', 'Excellent problem solving.', 'Low consistency flagged.', 'Professional presence unclear.', 'No test performance data.'],
      chart_data: { pie: [{ name: 'GitHub', value: 40 }, { name: 'LeetCode', value: 35 }, { name: 'Test', value: 25 }] },
    },
  },
  {
    student_id: 's_002',
    name: 'Shreya S',
    linkedin_name: 'Shreya S',
    email: 'sshr22084.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
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
    github_top_languages: JSON.stringify(['Java', 'Python', 'TypeScript']),
    leetcode_languages: JSON.stringify(['Java', 'Python']),
    all_skills: JSON.stringify(['Java', 'Python', 'TypeScript', 'Spring Boot', 'SQL', 'React']),
    hiring_exam: 'Virtusa – Full Stack Developer',
    status: 'ready',
    __evaluation: {
      overall_score: 87,
      decision: 'Hire',
      confidence: 'High',
      risk: 'Low',
      recommendation: 'Strong candidate across all dimensions. Recommend for immediate hire.',
      dimension_scores: { coding_skill: 88, problem_solving: 82, consistency: 82, professional_presence: 75, test_performance: 91 },
      unified_scores: { test_performance: { source: 'test' } },
      source_status: { github: 'real', leetcode: 'real', linkedin: 'real' },
      missing_sources: [],
      insights: [
        { type: 'positive', section: 'coding', message: 'Exceptional GitHub activity with 64 total commits.', severity: 'low' },
        { type: 'positive', section: 'problem_solving', message: 'Top 5% globally on LeetCode.', severity: 'low' },
      ],
      decision_insights: ['Outstanding coding ability.', 'Excellent problem solving — top 5% globally.', 'Highly consistent contributor.', 'Strong professional presence.', 'Top test performance.'],
      chart_data: { pie: [{ name: 'GitHub', value: 35 }, { name: 'LeetCode', value: 30 }, { name: 'LinkedIn', value: 15 }, { name: 'Test', value: 20 }] },
    },
  },
  {
    student_id: 's_003',
    name: 'Lokshana Dharshini D V',
    linkedin_name: 'Lokshana Dharshini D V',
    email: 'loks22053.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
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
    github_top_languages: JSON.stringify(['Python', 'C++']),
    leetcode_languages: JSON.stringify(['C++', 'Python']),
    all_skills: JSON.stringify(['Python', 'C++', 'SQL', 'Django']),
    hiring_exam: 'Virtusa – Full Stack Developer',
    status: 'ready',
    __evaluation: {
      overall_score: 71,
      decision: 'Hire',
      confidence: 'Medium',
      risk: 'Low',
      recommendation: 'Good all-round profile. Hire for backend-focused role.',
      dimension_scores: { coding_skill: 71, problem_solving: 63, consistency: 55, professional_presence: 60, test_performance: 78 },
      unified_scores: { test_performance: { source: 'test' } },
      source_status: { github: 'real', leetcode: 'real', linkedin: 'estimated' },
      missing_sources: ['linkedin'],
      insights: [
        { type: 'positive', section: 'coding', message: 'Consistent GitHub contributions.', severity: 'low' },
        { type: 'info', section: 'profile', message: 'LinkedIn data estimated — encourage profile update.', severity: 'low' },
      ],
      decision_insights: ['Good coding ability.', 'Solid problem solving.', 'Moderate consistency.', 'Professional presence needs improvement.', 'Good test performance.'],
      chart_data: { pie: [{ name: 'GitHub', value: 38 }, { name: 'LeetCode', value: 32 }, { name: 'Test', value: 30 }] },
    },
  },
  {
    student_id: 's_004',
    name: 'Kavithaa K A',
    linkedin_name: 'Kavithaa K A',
    email: 'kavi22116.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
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
    github_top_languages: JSON.stringify(['HTML', 'CSS']),
    leetcode_languages: JSON.stringify(['C']),
    all_skills: JSON.stringify(['HTML', 'CSS', 'C']),
    hiring_exam: 'Virtusa – Full Stack Developer',
    status: 'ready',
    __evaluation: {
      overall_score: 35,
      decision: 'Reject',
      confidence: 'High',
      risk: 'High',
      recommendation: 'Below threshold across all dimensions. Not recommended at this time.',
      dimension_scores: { coding_skill: 34, problem_solving: 28, consistency: 18, professional_presence: 30, test_performance: 41 },
      unified_scores: { test_performance: { source: 'test' } },
      source_status: { github: 'real', leetcode: 'real', linkedin: 'missing' },
      missing_sources: ['linkedin'],
      insights: [
        { type: 'warning', section: 'coding', message: 'Very low GitHub activity — only 8 total commits.', severity: 'high' },
        { type: 'warning', section: 'problem_solving', message: 'Minimal LeetCode practice.', severity: 'high' },
      ],
      decision_insights: ['Weak coding ability.', 'Insufficient problem solving practice.', 'Very low consistency.', 'No LinkedIn presence.', 'Below average test performance.'],
      chart_data: { pie: [{ name: 'GitHub', value: 45 }, { name: 'LeetCode', value: 35 }, { name: 'Test', value: 20 }] },
    },
  },
  {
    student_id: 's_005',
    name: 'Anusha P M',
    linkedin_name: 'Anusha P M',
    email: 'pman22068.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
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
    github_top_languages: JSON.stringify(['JavaScript', 'React', 'Node.js']),
    leetcode_languages: JSON.stringify(['JavaScript', 'Python']),
    all_skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'MongoDB']),
    hiring_exam: 'Virtusa – Full Stack Developer',
    status: 'ready',
    __evaluation: {
      overall_score: 83,
      decision: 'Hire',
      confidence: 'High',
      risk: 'Low',
      recommendation: 'Excellent full-stack profile. Strong recommendation for hire.',
      dimension_scores: { coding_skill: 83, problem_solving: 79, consistency: 74, professional_presence: 70, test_performance: 88 },
      unified_scores: { test_performance: { source: 'test' } },
      source_status: { github: 'real', leetcode: 'real', linkedin: 'real' },
      missing_sources: [],
      insights: [
        { type: 'positive', section: 'coding', message: 'Strong full-stack skills across JS ecosystem.', severity: 'low' },
        { type: 'positive', section: 'test', message: 'Excellent SQL score — 90/100.', severity: 'low' },
      ],
      decision_insights: ['Strong coding ability in full-stack.', 'Excellent problem solving.', 'Good consistency.', 'Strong professional presence.', 'Top test scores.'],
      chart_data: { pie: [{ name: 'GitHub', value: 35 }, { name: 'LeetCode', value: 30 }, { name: 'LinkedIn', value: 15 }, { name: 'Test', value: 20 }] },
    },
  },
];

// ── Strip keywords suffix from question text (for admin display) ───────────
function stripKeywords(text = '') {
  return text.replace(/\s*keywords?\s*:[\s\S]*/i, '').trim();
}

// ── Extract keywords from question (embedded or dedicated field) ──────────
function extractKeywords(item) {
  if (item.keywords && typeof item.keywords === 'string' && item.keywords.trim()) {
    return item.keywords.trim();
  }
  const text = item.questionText || '';
  const match = text.match(/keywords?\s*:\s*([\s\S]+)/i);
  if (match) {
    const raw = match[1].trim();
    const parts = raw.split(/\s*[-–]\s*/).map(p => p.trim()).filter(Boolean);
    return parts.join(', ');
  }
  return '';
}

// ── Client-side keyword scorer ───────────────────────────────────────────
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
  const score      = Math.round(rawScore * 2) / 2;
  return { score, percentage, matched, missing };
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

async function gradeWithGemini(questionText, studentAnswer, keywords, maxMarks) {
  if (!GEMINI_API_KEY) { console.warn('[Gemini] No API key set.'); return null; }
  const cleanQuestion = stripKeywords(questionText);
  const prompt = `You are a strict but fair university exam evaluator.\n\nQuestion: ${cleanQuestion}\n\nExpected keywords/concepts: ${keywords}\n\nStudent's answer: ${studentAnswer}\n\nMaximum marks: ${maxMarks}\n\nEvaluate the answer. Award marks based on how many expected concepts are covered, accuracy, and clarity.\n\nReturn ONLY valid JSON (no markdown, no extra text):\n{\n  "score": <number 0-${maxMarks}, use 0.5 steps>,\n  "percentage": <0-100 integer>,\n  "feedback": "<2-3 sentences: what was good, what was missing>",\n  "strengths": ["<point 1>", "<point 2>"],\n  "improvements": ["<missing concept 1>", "<missing concept 2>"],\n  "keywordsCovered": ["<keyword found>"],\n  "keywordsMissed": ["<keyword not found>"]\n}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 800 } }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) { console.error('[Gemini grade error]', err); return null; }
}

async function gradeWithClaude(questionText, studentAnswer, keywords, maxMarks) {
  const cleanQuestion = stripKeywords(questionText);
  const prompt = `You are a strict university exam evaluator.\n\nQuestion: ${cleanQuestion}\nExpected keywords: ${keywords}\nStudent answer: ${studentAnswer}\nMax marks: ${maxMarks}\n\nReturn ONLY valid JSON:\n{\n  "score": <0-${maxMarks}, 0.5 steps>,\n  "percentage": <0-100>,\n  "feedback": "<2-3 sentences>",\n  "strengths": ["<point>"],\n  "improvements": ["<missing concept>"],\n  "keywordsCovered": ["<found keyword>"],\n  "keywordsMissed": ["<missing keyword>"]\n}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    const text  = data.content?.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) { console.error('[Claude grade error]', err); return null; }
}

async function gradeWrittenAnswer(questionText, studentAnswer, keywords, maxMarks) {
  const kwResult = scoreByKeywords(studentAnswer, keywords, maxMarks);
  let aiResult = null;
  if (GEMINI_API_KEY) aiResult = await gradeWithGemini(questionText, studentAnswer, keywords, maxMarks);
  if (!aiResult) aiResult = await gradeWithClaude(questionText, studentAnswer, keywords, maxMarks);
  if (aiResult && typeof aiResult.score === 'number') return { ...aiResult, source: GEMINI_API_KEY ? 'gemini' : 'claude' };
  return {
    score: kwResult.score, percentage: kwResult.percentage,
    feedback: `Answer covers ${kwResult.matched.length} of ${kwResult.matched.length + kwResult.missing.length} expected concepts.`,
    strengths: kwResult.matched.map(k => `Mentioned: ${k}`),
    improvements: kwResult.missing.map(k => `Missing: ${k}`),
    keywordsCovered: kwResult.matched, keywordsMissed: kwResult.missing, source: 'keyword',
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

function WrittenReviewCard({ item, assignmentId, questionIdx, onSaveScore }) {
  const [aiResult,  setAiResult]  = useState(item._aiResult || null);
  const [grading,   setGrading]   = useState(false);
  const [facScore,  setFacScore]  = useState(item.facultyScore ?? '');
  const [facNote,   setFacNote]   = useState(item.facultyComment ?? '');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [gradeErr,  setGradeErr]  = useState('');

  const cleanQ   = stripKeywords(item.questionText || '');
  const keywords = extractKeywords(item);
  const maxMarks = item.maxScore || 8;
  const hasAnswer = !!item.studentAnswer?.trim();
  const hasFaculty = item.facultyScore != null;
  const kwResult = scoreByKeywords(item.studentAnswer || '', keywords, maxMarks);
  const baseScore = kwResult.score;
  const displayScore = hasFaculty ? item.facultyScore : (aiResult?.score ?? baseScore);
  const src = hasFaculty
    ? { label: 'Faculty', color: T.purple, bg: T.purpleBg, border: '#ddd6fe' }
    : aiResult
      ? { label: aiResult.source === 'gemini' ? 'Gemini AI' : 'Claude AI', color: aiResult.source === 'gemini' ? T.green : T.blue, bg: aiResult.source === 'gemini' ? T.greenBg : T.blueBg, border: aiResult.source === 'gemini' ? T.greenBorder : '#bfdbfe' }
      : { label: 'Keyword', color: T.muted, bg: '#f5f3ff', border: '#ddd6fe' };

  const handleGrade = async () => {
    if (!hasAnswer) return;
    setGrading(true); setGradeErr('');
    try {
      const result = await gradeWrittenAnswer(item.questionText, item.studentAnswer, keywords, maxMarks);
      if (result) { setAiResult(result); if (!hasFaculty) setFacScore(result.score); }
      else setGradeErr('AI grading failed. Please try again or score manually.');
    } catch (e) { setGradeErr('Error: ' + e.message); }
    setGrading(false);
  };

  const handleSave = async () => {
    const val = parseFloat(facScore);
    if (isNaN(val) || val < 0 || val > maxMarks) return;
    setSaving(true);
    await onSaveScore(assignmentId, item.questionId, val, facNote);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const shownMatched = aiResult?.keywordsCovered ?? kwResult.matched;
  const shownMissing = aiResult?.keywordsMissed  ?? kwResult.missing;
  const shownPct     = aiResult?.percentage      ?? kwResult.percentage;

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '14px 18px', background: '#f8fbfc', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.dim, background: '#eef2ff', border: `1px solid #c7d2fe`, borderRadius: 5, padding: '2px 7px' }}>Q{questionIdx + 1}</span>
            <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>{maxMarks} marks</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, lineHeight: 1.55, marginBottom: 8 }}>{cleanQ || item.questionText}</div>
          {keywords && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: T.dim, letterSpacing: '0.5px' }}>EXPECTED KEYWORDS:</span>
              {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, ki) => (
                <span key={ki} style={{ fontSize: 10, background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 20, padding: '2px 8px', color: '#1d4ed8', fontFamily: 'monospace', fontWeight: 500 }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: src.color, lineHeight: 1 }}>{displayScore}<span style={{ fontSize: 12, fontWeight: 400, color: T.dim }}> / {maxMarks}</span></div>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: src.bg, color: src.color, border: `1px solid ${src.border}`, fontFamily: 'monospace', letterSpacing: '0.3px' }}>{src.label.toUpperCase()}</span>
        </div>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 7 }}>STUDENT ANSWER</div>
        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.75, background: '#f8f9fd', padding: '12px 15px', borderRadius: 9, border: `1px solid ${T.border}`, marginBottom: 16, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {hasAnswer ? item.studentAnswer.trim() : <em style={{ color: T.dim }}>No answer submitted</em>}
        </div>
        {keywords && hasAnswer && (
          <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fafbff', border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>KEYWORD COVERAGE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${shownPct}%`, height: '100%', borderRadius: 99, background: shownPct >= 70 ? T.green : shownPct >= 40 ? T.orange : T.red, transition: 'width 0.6s ease' }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: shownPct >= 70 ? T.green : shownPct >= 40 ? T.orange : T.red, fontFamily: 'monospace' }}>{shownPct}%</span>
                <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>({shownMatched.length}/{shownMatched.length + shownMissing.length})</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {shownMatched.map(k => <KwChip key={k} text={k} matched={true}/>)}
              {shownMissing.map(k => <KwChip key={k} text={k} matched={false}/>)}
            </div>
            {!aiResult && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: T.muted }}>Keyword auto-score</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.muted, fontFamily: 'monospace' }}>{baseScore} / {maxMarks}</span>
              </div>
            )}
          </div>
        )}
        {aiResult && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: `1px solid ${aiResult.source === 'gemini' ? '#bbf7d0' : '#bfdbfe'}` }}>
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: aiResult.source === 'gemini' ? '#f0fdf4' : '#eff6ff' }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.5px', color: aiResult.source === 'gemini' ? T.green : T.blue }}>{aiResult.source === 'gemini' ? '✦ GEMINI AI EVALUATION' : '✦ CLAUDE AI EVALUATION'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>AI suggests:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: aiResult.source === 'gemini' ? T.green : T.blue, fontFamily: 'monospace' }}>{aiResult.score}<span style={{ fontSize: 11, fontWeight: 400, color: T.dim }}> / {maxMarks}</span></span>
              </div>
            </div>
            <div style={{ padding: '14px 16px', background: T.white }}>
              <p style={{ fontSize: 13, color: T.navy, lineHeight: 1.7, margin: '0 0 12px' }}>{aiResult.feedback}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {aiResult.strengths?.length > 0 && (
                  <div style={{ padding: '10px 12px', background: T.greenBg, border: `1px solid #bbf7d0`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.green, marginBottom: 6, fontFamily: 'monospace' }}>✓ STRENGTHS</div>
                    {aiResult.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#166534', marginBottom: 3 }}>• {s}</div>)}
                  </div>
                )}
                {aiResult.improvements?.length > 0 && (
                  <div style={{ padding: '10px 12px', background: T.orangeBg, border: `1px solid #fed7aa`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, marginBottom: 6, fontFamily: 'monospace' }}>✕ MISSING CONCEPTS</div>
                    {aiResult.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#9a3412', marginBottom: 3 }}>• {s}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {gradeErr && <div style={{ marginBottom: 12, padding: '8px 12px', background: T.redBg, border: `1px solid #fecaca`, borderRadius: 8, fontSize: 12, color: T.red }}>{gradeErr}</div>}
        <div style={{ marginBottom: 16 }}>
          <button onClick={handleGrade} disabled={grading || !hasAnswer} style={{ width: '100%', padding: '10px 18px', borderRadius: 9, border: 'none', cursor: (!hasAnswer || grading) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', background: grading ? '#e2e8f0' : aiResult ? T.white : `linear-gradient(135deg, ${T.accent}, #1d9e95)`, color: grading ? T.dim : aiResult ? T.accent : '#fff', border: aiResult ? `1.5px solid ${T.accent}` : 'none', boxShadow: (!grading && !aiResult) ? '0 3px 12px rgba(43,177,168,0.3)' : 'none', opacity: (!hasAnswer) ? 0.5 : 1 }}>
            {grading ? (<><span style={{ display:'inline-block', width:14, height:14, border:'2.5px solid #94a3b8', borderTopColor:T.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Grading with AI…</>) : aiResult ? <>↻ Re-grade with AI</> : <>✦ Grade with AI {GEMINI_API_KEY ? '(Gemini Free)' : '(Claude)'}</>}
          </button>
          {!hasAnswer && <div style={{ marginTop: 5, fontSize: 11, color: T.dim, textAlign: 'center' }}>No answer to grade</div>}
        </div>
        <div style={{ padding: '16px', background: '#fafbff', border: `1.5px solid ${saved ? '#bbf7d0' : hasFaculty ? '#ddd6fe' : T.border}`, borderRadius: 12, transition: 'border-color 0.3s' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: 12 }}>
            FACULTY SCORE ADJUSTMENT
            {hasFaculty && <span style={{ marginLeft: 8, color: T.purple }}>· Previously saved: {item.facultyScore}/{maxMarks}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <input type="range" min={0} max={maxMarks} step={0.5} value={facScore} onChange={e => setFacScore(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent, height: 4, cursor: 'pointer' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {Array.from({ length: maxMarks + 1 }, (_, i) => <span key={i} style={{ fontSize: 9, color: T.dim, fontFamily: 'monospace', opacity: i % 2 === 0 ? 1 : 0.4 }}>{i}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setFacScore(s => Math.max(0, parseFloat((s - 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <div style={{ textAlign: 'center' }}>
                <input type="number" min={0} max={maxMarks} step={0.5} value={facScore} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v <= maxMarks) setFacScore(v); }} style={{ width: 60, padding: '6px 4px', border: `1.5px solid ${T.accent}`, borderRadius: 8, fontSize: 18, fontFamily: 'monospace', fontWeight: 800, textAlign: 'center', outline: 'none', color: T.navy }}/>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', marginTop: 1 }}>/ {maxMarks}</div>
              </div>
              <button onClick={() => setFacScore(s => Math.min(maxMarks, parseFloat((s + 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          {aiResult && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: T.dim, alignSelf: 'center', fontFamily: 'monospace' }}>Apply AI score:</span>
              {[aiResult.score, Math.max(0, parseFloat((aiResult.score - 0.5).toFixed(1))), Math.min(maxMarks, parseFloat((aiResult.score + 0.5).toFixed(1)))].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                <button key={v} onClick={() => setFacScore(v)} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${T.accent}`, background: facScore === v ? T.accent : T.white, color: facScore === v ? '#fff' : T.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s' }}>{v}</button>
              ))}
            </div>
          )}
          <input type="text" placeholder="Add comment (optional)" value={facNote} onChange={e => setFacNote(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, outline: 'none', marginBottom: 10, fontFamily: 'inherit', color: T.navy }}/>
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, background: saved ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', boxShadow: saved ? '0 2px 10px rgba(22,163,74,0.3)' : '0 2px 10px rgba(124,58,237,0.3)', transition: 'all 0.2s' }}>
            {saving ? 'Saving…' : saved ? '✓ Score Saved Successfully' : `Save Score: ${facScore}/${maxMarks}`}
          </button>
          {hasFaculty && item.facultyComment && <div style={{ marginTop: 8, fontSize: 11, color: T.purple, fontStyle: 'italic', background: T.purpleBg, padding: '6px 10px', borderRadius: 6 }}>Previous note: "{item.facultyComment}"</div>}
        </div>
      </div>
    </div>
  );
}

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

const RAD = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RAD)} y={cy + r * Math.sin(-midAngle * RAD)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DecisionBadge({ decision }) {
  if (!decision) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
  const map = { Hire: { bg: T.greenBg, color: T.green }, Maybe: { bg: T.orangeBg, color: T.orange }, Reject: { bg: T.redBg, color: T.red } };
  const s = map[decision] || map.Maybe;
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{decision}</span>;
}

// ── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ c }) {
  const githubLangs  = safeArr(c.github_top_languages);
  const lcLangs      = safeArr(c.leetcode_languages);
  const certs        = safeArr(c.linkedin_certifications);
  const allSkills    = safeArr(c.all_skills);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Academic info strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'CGPA',        value: c.cgpa        || '—', color: T.accent  },
          { label: '10th %',      value: c.nth_percentage != null ? `${c.nth_percentage}%` : '—', color: T.blue   },
          { label: '12th %',      value: c.twelfth_percentage != null ? `${c.twelfth_percentage}%` : '—', color: T.purple },
          { label: 'Backlogs',    value: c.backlogs ?? 0,       color: c.backlogs > 0 ? T.red : T.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.white, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

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
            {githubLangs.length ? githubLangs.map(l => <span key={l} style={{ fontSize: 11, background: T.purpleBg, color: T.purple, borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{l}</span>) : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No languages detected</span>}
          </div>
        </Card>
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
            {lcLangs.length ? lcLangs.map(l => <span key={l} style={{ fontSize: 11, background: T.greenBg, color: T.green, borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{l}</span>) : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No data</span>}
          </div>
        </Card>
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
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Combined from GitHub, LeetCode & resume</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {allSkills.length ? allSkills.map((l, i) => (
              <span key={l} style={{ fontSize: 11, background: SKILL_COLORS[i % SKILL_COLORS.length] + '15', color: SKILL_COLORS[i % SKILL_COLORS.length], borderRadius: 20, padding: '3px 9px', fontWeight: 600, border: `1px solid ${SKILL_COLORS[i % SKILL_COLORS.length]}30` }}>{l}</span>
            )) : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No skill data</span>}
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
      <div style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>Student has not submitted for evaluation yet.</div>
    </div>
  );

  const dim      = ev.dimension_scores || {};
  const unified  = ev.unified_scores   || {};
  const chart    = ev.chart_data       || {};
  const sources  = ev.source_status    || {};
  const missing  = ev.missing_sources  || [];
  const insights = ev.insights         || [];
  const dc  = decColor(ev.decision);
  const dBg = decBg(ev.decision);
  const PIE_COLORS = [T.purple, T.green, T.accent, T.orange];

  const pieData = chart.pie?.filter(d => d.value > 0) || [];

  const githubLangs = safeArr(c.github_top_languages);
  const lcLangs     = safeArr(c.leetcode_languages);
  const allSkills   = safeArr(c.all_skills);

  const skillBarData = allSkills.slice(0, 6).map((skill, i) => ({
    name:  skill.length > 10 ? skill.substring(0, 10) : skill,
    score: githubLangs.includes(skill) && lcLangs.includes(skill) ? 90 : githubLangs.includes(skill) ? 75 : lcLangs.includes(skill) ? 65 : 45,
    color: SKILL_COLORS[i % SKILL_COLORS.length],
  }));

  const testBar = c.mcq_score != null ? [
    { name: 'MCQ',    score: c.mcq_score    || 0 },
    { name: 'SQL',    score: c.sql_score    || 0 },
    { name: 'Coding', score: c.coding_score || 0 },
  ] : (chart.testBar || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        </Card>
      )}

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
          <div style={{ paddingLeft: 4 }}>
            {insights.map((ins, i) => <InsightItem key={i} {...ins} index={i}/>)}
          </div>
        </Card>
      )}

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

// ── Report Modal (full screen detail) ─────────────────────────────
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

  const handleDownload = () => {
    const content = `
CANDIDATE REPORT — ${candidate.hiring_exam || 'Hiring Exam'}
${'='.repeat(60)}

Candidate   : ${candidate.linkedin_name || candidate.name}
College     : ${candidate.college} | Branch: ${candidate.branch} | Batch: ${candidate.batch}
Email       : ${candidate.email}

ACADEMIC
  CGPA           : ${candidate.cgpa}
  10th %         : ${candidate.nth_percentage}%
  12th %         : ${candidate.twelfth_percentage}%
  Backlogs       : ${candidate.backlogs}

SCORES
  GitHub Score   : ${candidate.github_score}/100
  LeetCode Score : ${candidate.leetcode_score}/100
  Test Score     : ${candidate.test_score}/100
  Total Score    : ${candidate.total_score}/100

AI DECISION    : ${ev?.decision || '—'}
Confidence     : ${ev?.confidence || '—'}
Risk           : ${ev?.risk || '—'}

RECOMMENDATION : ${ev?.recommendation || '—'}

Generated on ${new Date().toLocaleString()}
    `.trim();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `${(candidate.linkedin_name || candidate.name).replace(/\s+/g, '_')}_report.txt`;
    a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,65,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: T.bg, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(10,42,65,0.25)', animation: 'fadeUp 0.22s ease' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 24px', background: T.white, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.accentLight, border: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
            {(candidate.linkedin_name || candidate.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{candidate.linkedin_name || candidate.name}</div>
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg, color: recC }}>{rec}</span>
              {ev?.decision && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: dBg, color: dc }}>{ev.decision}</span>}
              {ev?.confidence && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: T.accentLight, color: T.accent }}>Confidence: {ev.confidence}</span>}
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>
              {candidate.college} · {candidate.branch} · Batch {candidate.batch} · {candidate.email}
            </div>
            {candidate.hiring_exam && (
              <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: T.accent }}>📋 {candidate.hiring_exam}</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={score} size={58} color={ringC}/>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Total Score</div>
          </div>
          <button onClick={handleDownload} title="Download Report" style={{ background: T.accentLight, border: `1px solid ${T.accent}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: T.accent, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            ↓ Download
          </button>
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

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {tab === 'overview' && <OverviewTab c={candidate}/>}
          {tab === 'ai'       && <AIReportTab ev={ev} c={candidate}/>}
        </div>
      </div>
    </div>
  );
}

// ── Hiring candidates table (NEW: flat table with all columns) ────────────────
function HiringTable({ candidates, onSelect }) {
  if (candidates.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: T.dim, fontSize: 13, background: T.white, borderRadius: 14, border: `1px solid ${T.border}` }}>
        No candidates found.
      </div>
    );
  }

  return (
    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fbfc', borderBottom: `2px solid ${T.border}` }}>
              {['#', 'Candidate', 'College', 'Branch', 'Batch', 'Score', 'Status', 'Hiring Exam', 'Action'].map((h, i) => (
                <th key={i} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const score = c.total_score || 0;
              const ev    = c.__evaluation;
              const dec   = ev?.decision;

              const decColors = {
                Hire:   { bg: T.greenBg,  color: T.green  },
                Maybe:  { bg: T.orangeBg, color: T.orange },
                Reject: { bg: T.redBg,    color: T.red    },
              };
              const ds = decColors[dec] || { bg: '#f1f5f9', color: T.dim };

              return (
                <tr key={c.student_id || i} className="rep-tr"
                  style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => onSelect(c)}
                >
                  {/* # */}
                  <td style={{ padding: '12px 14px', color: T.dim, fontFamily: 'monospace', fontSize: 11 }}>{i + 1}</td>

                  {/* Candidate */}
                  <td style={{ padding: '12px 14px', minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: T.navy, marginBottom: 2 }}>{c.linkedin_name || c.name}</div>
                    <div style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>{c.email}</div>
                  </td>

                  {/* College */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>{c.college || '—'}</span>
                  </td>

                  {/* Branch */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, background: T.purpleBg, color: T.purple, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{c.branch || '—'}</span>
                  </td>

                  {/* Batch */}
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: T.muted }}>{c.batch || '—'}</td>

                  {/* Score */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ScoreRing score={score} size={38} color={scoreColor(score)}/>
                      <div>
                        <div style={{ fontSize: 11, color: T.dim }}>
                          GH: <span style={{ fontWeight: 700, color: T.purple }}>{c.github_score}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.dim }}>
                          LC: <span style={{ fontWeight: 700, color: T.green }}>{c.leetcode_score}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status (Hire/Maybe/Reject) */}
                  <td style={{ padding: '12px 14px' }}>
                    {dec
                      ? <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ds.bg, color: ds.color }}>{dec}</span>
                      : <span style={{ color: T.dim, fontSize: 12 }}>—</span>
                    }
                  </td>

                  {/* Hiring Exam */}
                  <td style={{ padding: '12px 14px', minWidth: 200 }}>
                    <span style={{ fontSize: 12, color: T.navy, fontWeight: 500 }}>{c.hiring_exam || '—'}</span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="rep-btn"
                        onClick={e => { e.stopPropagation(); onSelect(c); }}
                        style={{ padding: '5px 12px', background: T.accentLight, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                      >
                        View Report
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Download report inline
                          const content = `REPORT — ${c.hiring_exam || 'Hiring Exam'}\n${'='.repeat(50)}\nCandidate: ${c.linkedin_name || c.name}\nCollege: ${c.college} | Branch: ${c.branch} | Batch: ${c.batch}\nEmail: ${c.email}\nCGPA: ${c.cgpa} | 10th: ${c.nth_percentage}% | 12th: ${c.twelfth_percentage}% | Backlogs: ${c.backlogs}\n\nGitHub Score: ${c.github_score}/100\nLeetCode Score: ${c.leetcode_score}/100\nTest Score: ${c.test_score}/100\nTotal Score: ${c.total_score}/100\n\nAI Decision: ${c.__evaluation?.decision || '—'}\nConfidence: ${c.__evaluation?.confidence || '—'}\nRisk: ${c.__evaluation?.risk || '—'}\nRecommendation: ${c.__evaluation?.recommendation || '—'}\n\nGenerated: ${new Date().toLocaleString()}`;
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
                          a.download = `${(c.linkedin_name || c.name).replace(/\s+/g, '_')}_report.txt`;
                          a.click();
                        }}
                        style={{ padding: '5px 10px', background: '#f8fbfc', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        title="Download report"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  UNIVERSITY SECTION — UNTOUCHED
// ══════════════════════════════════════════════════════════════════════════════

function WrittenReviewCardUniv({ item, assignmentId, questionIdx, onSaveScore }) {
  // This is the same as WrittenReviewCard above — keeping as alias
  return <WrittenReviewCard item={item} assignmentId={assignmentId} questionIdx={questionIdx} onSaveScore={onSaveScore}/>;
}

function UnivStudentRow({ student, rank, passMark, onExpand, expanded, onSaveScore }) {
  const pct      = student.percentage;
  const barColor = pct >= 75 ? T.green : pct >= 50 ? T.orange : T.red;
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
            ? <div style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'monospace', background: rank===1 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : rank<=3 ? '#fcd9bd' : '#f1f5f9', color: rank<=3 ? (rank===1 ? '#78350f' : '#9a3412') : T.dim }}>{rank}</div>
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
                  <WrittenReviewCard key={item.questionId} item={item} assignmentId={student.studentId} questionIdx={qi} onSaveScore={onSaveScore}/>
                ))
            }
          </td>
        </tr>
      )}
    </>
  );
}

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
        s.totalScore ?? '—', s.totalMarks,
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
  const examTotalMarks = exam.total_marks || summary.totalMarks || '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.navy }}>{exam.title}</div>
          <div style={{ fontSize: 11, color: T.dim }}>
            {exam.subject_name || exam.subject_code || ''}{exam.semester ? ` · Sem ${exam.semester}` : ''}{exam.college ? ` · ${exam.college}` : ''}{exam.batch_year ? ` · Batch ${exam.batch_year}` : ''}{' · '}<span style={{ fontWeight:700, color:T.purple }}>Max {examTotalMarks} marks</span>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Export CSV</button>
      </div>

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
          {[{ id: 'students', label: `Students (${filtered.length})` }, { id: 'mcq', label: 'MCQ Analytics' }, { id: 'written', label: 'Written Analysis' }].map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'students' && (
          <div>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <input type="text" placeholder="Search by name, email, roll no…" value={search} onChange={e => setSearch(e.target.value)}
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
                    <UnivStudentRow key={s.studentId} student={s} rank={s.rank} passMark={summary.passMark}
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
            <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>SORTED BY DIFFICULTY — HARDEST FIRST ({mcqAnalytics.length} questions)</div>
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
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 8, lineHeight: 1.5 }}>
                          {stripKeywords(q.questionText || '').substring(0, 120)}{q.questionText?.length > 120 ? '…' : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: diffBg, color: diffColor, fontFamily: 'monospace' }}>{(q.difficulty || 'unknown').toUpperCase()}</span>
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
            <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>WRITTEN KEYWORD COVERAGE ({writtenAnalytics.length} questions)</div>
            {writtenAnalytics.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: T.dim }}>No written submissions yet.</div>
              : writtenAnalytics.map((w, i) => {
                  const avgC = w.avgKeywordMatch >= 70 ? T.green : w.avgKeywordMatch >= 40 ? T.orange : T.red;
                  return (
                    <div key={w.questionId} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.dim, fontWeight: 700 }}>W{i+1}</span>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginTop: 3, lineHeight: 1.5 }}>{stripKeywords(w.questionText || '')}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: avgC, lineHeight: 1 }}>{w.avgKeywordMatch != null ? `${w.avgKeywordMatch}%` : '—'}</div>
                          <div style={{ fontSize: 9, color: T.dim, fontFamily: 'monospace' }}>AVG COVERAGE</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Avg score: <strong style={{ color: T.purple }}>{w.avgScore ?? '—'}</strong> / {w.maxScore} · {w.total} responses</div>
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
                    {exam.subject_name || exam.subject_code || ''}{exam.semester ? ` · Sem ${exam.semester}` : ''}{exam.college ? ` · ${exam.college}` : ''}{exam.batch_year ? ` · Batch ${exam.batch_year}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{exam.student_count || 0}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Students</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>{exam.total_marks || '—'}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Max Marks</div>
                  </div>
                </div>
                <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg, color: statusC }}>{exam.status || 'scheduled'}</span>
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
  const [selected,       setSelected]       = useState(null);
  const [mode,           setMode]           = useState('hiring');

  // ── STATIC HIRING STATE ────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [filterCollege,  setFilterCollege]  = useState('All');
  const [filterDecision, setFilterDecision] = useState('All');
  const [filterResult,   setFilterResult]   = useState('All');

  // Static data — RMKEC 2026 batch
  const allCandidates = STATIC_CANDIDATES;

  // College list from data
  const collegeOptions = ['All', ...Array.from(new Set(allCandidates.map(c => c.college))).sort()];

  // Filtered candidates
  const filtered = allCandidates.filter(c => {
    const name   = (c.linkedin_name || c.name || '').toLowerCase();
    const score  = c.total_score || 0;
    const result = score >= 50 ? 'Pass' : 'Fail';
    const dec    = c.__evaluation?.decision || null;
    const coll   = c.college || '';
    return (
      (!search || name.includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())) &&
      (filterCollege  === 'All' || coll   === filterCollege) &&
      (filterDecision === 'All' || dec    === filterDecision) &&
      (filterResult   === 'All' || result === filterResult)
    );
  });

  // Static summary stats
  const STATS = { total: 15, colleges: 3, passed: 10, failed: 5, aiHire: 5, aiReject: 2 };

  const handleExport = () => {
    const csv = [
      ['Name','Email','College','Branch','Batch','CGPA','10th%','12th%','Backlogs','GitHub','LeetCode','Test','Total','Decision','Hiring Exam'],
      ...allCandidates.map(c => [
        c.linkedin_name || c.name, c.email, c.college, c.branch, c.batch,
        c.cgpa, c.nth_percentage, c.twelfth_percentage, c.backlogs,
        c.github_score, c.leetcode_score, c.test_score, c.total_score,
        c.__evaluation?.decision || '', c.hiring_exam || '',
      ]),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'candidate_reports.csv';
    a.click();
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

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Reports</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
              {mode === 'hiring' ? 'AI-analyzed candidate results · RMKEC 2026 batch' : 'University exam results & faculty review'}
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

        {/* ── HIRING SECTION ──────────────────────────────────────────── */}
        {mode === 'hiring' && (
          <>
            {/* Static summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total',     value: STATS.total,    color: T.accent  },
                { label: 'Colleges',  value: STATS.colleges, color: T.blue    },
                { label: 'Passed',    value: STATS.passed,   color: T.green   },
                { label: 'Failed',    value: STATS.failed,   color: T.red     },
                { label: 'AI Hire',   value: STATS.aiHire,   color: T.green   },
                { label: 'AI Reject', value: STATS.aiReject, color: T.red     },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: T.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginRight: 6 }}>Filters</span>

              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px' }}>
                <svg width="13" height="13" fill="none" stroke={T.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…"
                  style={{ border:'none', outline:'none', fontSize:12, color:T.navy, background:'transparent', width:160 }}/>
              </div>

              {/* College dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: T.dim, fontWeight: 600 }}>College:</span>
                <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}
                  style={{ padding:'6px 10px', fontSize:12, border:`1px solid ${T.border}`, borderRadius:8, color:T.navy, background:T.white, cursor:'pointer', outline:'none' }}>
                  {collegeOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Result dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: T.dim, fontWeight: 600 }}>Result:</span>
                <select value={filterResult} onChange={e => setFilterResult(e.target.value)}
                  style={{ padding:'6px 10px', fontSize:12, border:`1px solid ${T.border}`, borderRadius:8, color:T.navy, background:T.white, cursor:'pointer', outline:'none' }}>
                  {['All','Pass','Fail'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Decision dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: T.dim, fontWeight: 600 }}>Decision:</span>
                <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)}
                  style={{ padding:'6px 10px', fontSize:12, border:`1px solid ${T.border}`, borderRadius:8, color:T.navy, background:T.white, cursor:'pointer', outline:'none' }}>
                  {['All','Hire','Maybe','Reject'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace', marginLeft: 'auto' }}>
                Showing {filtered.length} of {allCandidates.length} candidates
              </span>
            </div>

            {/* Candidates table */}
            <HiringTable candidates={filtered} onSelect={setSelected}/>
          </>
        )}

        {/* ── UNIVERSITY SECTION — UNTOUCHED ──────────────────────────── */}
        {mode === 'university' && <UniversitySection/>}

      </main>

      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)}/>}
      <ToastContainer/>
    </div>
  );
}