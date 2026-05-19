import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (() => {
  try { return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'; }
  catch { return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'; }
})();

const getToken = () =>
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});
const authFetch = (url, opts = {}) =>
  fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });

// ── Theme (matches Reports.jsx) ──────────────────────────────────────────────
const T = {
  pageBg: '#f4f8fb',
  white: '#ffffff',
  border: '#e8edf2',
  shadow: '0 1px 4px rgba(0,0,0,0.06)',
  navy: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  dim: '#94a3b8',
  accent: '#2563eb',
  accentSoft: '#eff6ff',
  green: '#16a34a', greenBg: '#f0fdf4', greenBdr: '#bbf7d0',
  red: '#dc2626', redBg: '#fef2f2',
  orange: '#ea580c', orangeBg: '#fff7ed',
  purple: '#7c3aed', purpleBg: '#f5f3ff',
  blue: '#2563eb', blueBg: '#eff6ff',
};

function readLocalRecords() {
  try { return JSON.parse(localStorage.getItem('ai_detection_records') || '[]'); }
  catch { return []; }
}

const DEMO_STUDENTS = [
  { student_id: 'S001', name: 'Moulini S', email: 'mou122058.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT', batch: '2026', similarity_score: 65, ai_score: 58, verdict: 'Likely AI', matched_with: 'S003', viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer', patterns_found: [{ label: 'Standard loop idiom', explanation: 'Formulaic loop structure favored by code generators' }, { label: 'Array return shorthand', explanation: 'Inline array return preferred by AI completions' }], ref_similarities: [{ label: 'Reference S003', similarity: 65 }, { label: 'Reference solution', similarity: 41 }], code_stats: { lines: 28, hasComments: false }, code_snippet: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n}' },
  { student_id: 'S002', name: 'Shreya S', email: 'shreya@rmdec.ac.in', college: 'RMDEC', branch: 'CSE', batch: '2026', similarity_score: 12, ai_score: 18, verdict: 'Human Written', matched_with: null, viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer', patterns_found: [], ref_similarities: [{ label: 'Reference S003', similarity: 12 }, { label: 'Reference solution', similarity: 9 }], code_stats: { lines: 19, hasComments: true }, code_snippet: 'function twoSum(arr, t) {\n  let result = [];\n  for(let i=0;i<arr.length;i++){\n    for(let j=i+1;j<arr.length;j++){\n      if(arr[i]+arr[j]===t){ result=[i,j]; break; }\n    }\n  }\n  return result;\n}' },
 
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const simColor = s => s >= 70 ? T.red : s >= 40 ? T.orange : T.green;
const simBg    = s => s >= 70 ? T.redBg : s >= 40 ? T.orangeBg : T.greenBg;

const verdictStyle = v => {
  if (!v)                   return { bg: '#f1f5f9', color: T.dim,    border: T.border };
  if (v === 'AI Generated') return { bg: T.redBg,   color: T.red,    border: '#fecaca' };
  if (v === 'Likely AI')    return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
  if (v === 'Possibly AI')  return { bg: T.blueBg,  color: T.blue,   border: '#bfdbfe' };
  return                           { bg: T.greenBg, color: T.green,  border: T.greenBdr };
};

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ value, color, size = 46 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((value ?? 0) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4.5}
        strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 700, fill: color, fontFamily: 'monospace' }}>
        {value ?? '—'}
      </text>
    </svg>
  );
}

// ── MiniBar ───────────────────────────────────────────────────────────────────
function MiniBar({ value, color }) {
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', height: 5, width: '100%', marginTop: 3 }}>
      <div style={{ height: '100%', width: `${Math.min(value ?? 0, 100)}%`, background: color, borderRadius: 99, transition: 'width .5s ease' }} />
    </div>
  );
}

// ── PatternDetail (expanded row) ──────────────────────────────────────────────
function PatternDetail({ student }) {
  const { patterns_found = [], ai_score, similarity_score, ref_similarities = [], code_stats = {}, code_snippet } = student;
  const aiCol  = simColor(ai_score);
  const simCol = simColor(similarity_score);

  return (
    <div style={{ background: '#f8fafc', borderTop: `1px solid ${T.border}`, padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>

      {/* AI Patterns */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: 'monospace' }}>
          AI Patterns Detected ({patterns_found.length})
        </div>
        {patterns_found.length === 0 ? (
          <div style={{ fontSize: 12, color: T.green, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>✓</span> No AI code signatures found
          </div>
        ) : patterns_found.map((p, i) => (
          <div key={i} style={{ background: T.white, border: `1px solid #fcd34d`, borderLeft: `3px solid ${T.orange}`, borderRadius: 7, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>{p.label}</div>
            <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.55 }}>{p.explanation}</div>
          </div>
        ))}
        <div style={{ background: T.blueBg, border: `1px solid #bfdbfe`, borderRadius: 7, padding: '8px 10px', marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>How AI score is calculated</div>
          <div style={{ fontSize: 11, color: '#1d4ed8', lineHeight: 1.6 }}>
            Matched against 47 AI-generation signatures across 50,000+ submissions. Each pattern is weighted by exclusivity in AI vs human code.
            <br /><br /><strong>Formula:</strong> AI Score = Σ(matched weights) × 2, capped at 100.
          </div>
        </div>
      </div>

      {/* Structural Similarity */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: 'monospace' }}>
          Structural Similarity
        </div>
        {ref_similarities.length > 0 ? ref_similarities.map((r, i) => (
          <div key={i} style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: T.text, fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: simColor(r.similarity) }}>{r.similarity}%</span>
            </div>
            <MiniBar value={r.similarity} color={simColor(r.similarity)} />
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
              {r.similarity >= 70 ? 'Near-identical logic' : r.similarity >= 40 ? 'Moderate overlap' : 'Distinct approach'}
            </div>
          </div>
        )) : <div style={{ fontSize: 12, color: T.muted }}>No reference comparisons available</div>}
        <div style={{ background: T.blueBg, border: `1px solid #bfdbfe`, borderRadius: 7, padding: '8px 10px', marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Similarity method</div>
          <div style={{ fontSize: 11, color: '#1d4ed8', lineHeight: 1.6 }}>
            Jaccard coefficient on token sets. Comments and whitespace stripped before comparison.<br /><br />
            <strong>Final score</strong> = (AI × 0.6) + (max ref sim × 0.4)
          </div>
        </div>
      </div>

      {/* Score Breakdown + Code */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: 'monospace' }}>
          Score Breakdown
        </div>
        {[{ label: 'AI Signature Score', value: ai_score, color: aiCol }, { label: 'Similarity Score', value: similarity_score, color: simCol }].map(({ label, value, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: T.text }}>{label}</span>
              <span style={{ fontWeight: 700, color, fontFamily: 'monospace' }}>{value ?? '—'}%</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(value ?? 0, 100)}%`, background: color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
          {[{ lbl: 'Lines of Code', val: code_stats?.lines ?? '—' }, { lbl: 'Has Comments', val: code_stats?.hasComments ? 'Yes ✓' : 'No' }].map(({ lbl, val }) => (
            <div key={lbl} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 9px' }}>
              <div style={{ fontSize: 9.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: 'monospace' }}>{val}</div>
            </div>
          ))}
        </div>
        {code_snippet && (
          <div style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '4px 10px', background: '#1e293b', fontSize: 9, color: T.dim, letterSpacing: '.6px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Code snippet (first 400 chars)
            </div>
            <pre style={{ margin: 0, padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
              {code_snippet}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TypeBadge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    placement: { label: 'Placement', color: '#6d28d9', bg: '#ede9fe' },
    hiring: { label: 'Hiring', color: '#6d28d9', bg: '#ede9fe' },
    university: { label: 'University', color: '#0369a1', bg: '#e0f2fe' },
    skill_cert: { label: 'Certification', color: '#c2410c', bg: '#ffedd5' },
  };
  const s = map[type] || { label: type || 'Exam', color: T.muted, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AIDetectionPage() {
  const [examInput,   setExamInput]   = useState('');
  const [examId,      setExamId]      = useState('');
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expanded,    setExpanded]    = useState(null);
  const [source,      setSource]      = useState('');
  const [liveCount,   setLiveCount]   = useState(0);
  const [search,      setSearch]      = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const loadFromLocalStorage = useCallback((filterExamId = '') => {
    const records = readLocalRecords();
    if (records.length === 0) return null;
    const filtered = filterExamId ? records.filter(r => String(r.exam_id) === String(filterExamId)) : records;
    return filtered.length > 0 ? filtered : null;
  }, []);

  const fetchFromAPI = useCallback(async (eid) => {
    try {
      const res  = await authFetch(`${API}/ai-detection/${eid}`);
      const data = await res.json();
      if (data.students?.length > 0) return { students: data.students, src: 'api' };
    } catch { }
    return null;
  }, []);

  const refresh = useCallback(async (eid = examId, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    const local = loadFromLocalStorage(eid);
    if (local) {
      setStudents(local); setSource('live'); setLiveCount(local.length);
      setLastRefresh(new Date()); if (!quiet) setLoading(false); return;
    }
    if (eid) {
      const api = await fetchFromAPI(eid);
      if (api) {
        setStudents(api.students); setSource('api');
        setLastRefresh(new Date()); if (!quiet) setLoading(false); return;
      }
    }
    setStudents(DEMO_STUDENTS); setSource('demo');
    setError(eid ? 'No submissions found for this exam yet — showing demo data.' : 'No live submissions yet — showing demo data.');
    if (!quiet) setLoading(false);
  }, [examId, loadFromLocalStorage, fetchFromAPI]);

  useEffect(() => { refresh('', false); }, []); // eslint-disable-line

  useEffect(() => {
    const interval = setInterval(() => refresh(examId, true), 10000);
    return () => clearInterval(interval);
  }, [examId, refresh]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'detection_ping' || e.key === 'ai_detection_records') refresh(examId, true);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [examId, refresh]);

  const handleLoad = () => { setExamId(examInput); refresh(examInput, false); };

  // Stats
  const aiCount       = students.filter(s => s.verdict === 'AI Generated').length;
  const likelyCount   = students.filter(s => s.verdict === 'Likely AI').length;
  const possiblyCount = students.filter(s => s.verdict === 'Possibly AI').length;
  const humanCount    = students.filter(s => s.verdict === 'Human Written').length;
  const avgAI         = students.length > 0 ? Math.round(students.reduce((a, s) => a + (s.ai_score || 0), 0) / students.length) : 0;

  // Filtering
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.college || '').toLowerCase().includes(q);
    const matchVerdict = verdictFilter === 'all' || s.verdict === verdictFilter;
    return matchSearch && matchVerdict;
  });

  const fmtTime = d => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  const VERDICT_FILTERS = [
    { id: 'all', label: 'All', count: students.length },
    { id: 'AI Generated', label: 'AI Generated', count: aiCount },
    { id: 'Likely AI', label: 'Likely AI', count: likelyCount },
    { id: 'Possibly AI', label: 'Possibly AI', count: possiblyCount },
    { id: 'Human Written', label: 'Human Written', count: humanCount },
  ];

  return (
    <div style={{ marginLeft: 230, minHeight: '100vh', background: T.pageBg, fontFamily: "'Inter', sans-serif" }}>
      <style>{css}</style>
      <Sidebar />
      <Navbar />
      <main style={{ padding: '28px 30px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>AI Code Detection</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: T.muted }}>
              AST-based analysis — detects ChatGPT / Copilot signatures · live-synced from student exam submissions
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Source badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
              ...(source === 'live'
                ? { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}` }
                : source === 'api'
                  ? { background: T.blueBg, color: T.blue, border: '1px solid #bfdbfe' }
                  : { background: '#f1f5f9', color: T.muted, border: `1px solid ${T.border}` }),
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: source === 'live' ? T.green : source === 'api' ? T.blue : T.dim,
                ...(source === 'live' ? { animation: 'aid-pulse 2s ease infinite' } : {}),
              }} />
              {source === 'live' ? `LIVE · ${liveCount} submission${liveCount !== 1 ? 's' : ''}` : source === 'api' ? 'API' : 'DEMO DATA'}
            </div>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>Updated {fmtTime(lastRefresh)}</span>
            )}
            <button onClick={() => refresh(examId, false)} style={{ padding: '7px 15px', background: T.accentSoft, border: `1px solid #bfdbfe`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.accent, cursor: 'pointer' }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: T.shadow }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.navy }}>Filter by Exam ID</div>
          <input
            value={examInput}
            onChange={e => setExamInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLoad(); }}
            placeholder="e.g. 42 or exam_001 — leave blank for all"
            style={{ padding: '7px 11px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5, width: 250, outline: 'none', fontFamily: 'inherit', color: T.navy }}
          />
          <button onClick={handleLoad} disabled={loading} style={{
            padding: '8px 18px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 12.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
          }}>
            {loading ? 'Loading…' : 'Load Report'}
          </button>
          {error && <div style={{ width: '100%', fontSize: 12, color: T.orange, paddingTop: 2 }}>ℹ {error}</div>}
        </div>

        {/* Info strip */}
        <div style={{ background: T.accentSoft, border: `1px solid #bfdbfe`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div style={{ fontSize: 12, color: '#1d4ed8', lineHeight: 1.6 }}>
            <strong>How live sync works:</strong> When a student submits their code, it is analyzed via AST token matching + Jaccard similarity and saved locally.
            This page reads that data instantly — new submissions appear within 10 seconds automatically.
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 13, marginBottom: 22 }}>
          {[
            { label: 'Total Students', val: students.length, color: T.accent },
            { label: 'AI Generated',   val: aiCount,         color: T.red    },
            { label: 'Likely AI',      val: likelyCount,     color: T.orange  },
            { label: 'Possibly AI',    val: possiblyCount,   color: T.blue   },
            { label: 'Human Written',  val: humanCount,      color: T.green  },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: T.white, borderRadius: 12, padding: '14px 16px', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`, boxShadow: T.shadow, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 9.5, color: T.dim, fontFamily: 'monospace', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Results table */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: T.shadow }}>

          {/* Table top bar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#f8fafc' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, email, college..."
              style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 11px', fontSize: 12.5, outline: 'none', width: 280, fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 2 }}>
              {VERDICT_FILTERS.map(f => (
                <button key={f.id} onClick={() => setVerdictFilter(f.id)} style={{
                  padding: '5px 11px', borderRadius: 6, border: `1px solid ${verdictFilter === f.id ? T.accent : T.border}`,
                  background: verdictFilter === f.id ? T.accentSoft : T.white, color: verdictFilter === f.id ? T.accent : T.muted,
                  fontSize: 11.5, fontWeight: verdictFilter === f.id ? 700 : 500, cursor: 'pointer',
                }}>
                  {f.label} {f.count > 0 && <span style={{ fontSize: 10, marginLeft: 3 }}>({f.count})</span>}
                </button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>
              {filtered.length} of {students.length} students · Avg AI: <strong style={{ color: avgAI >= 50 ? T.red : T.green }}>{avgAI}%</strong>
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                  {['#', 'Candidate', 'College', 'Branch / Batch', 'Similarity', 'AI Score', 'Verdict', 'AI Viva', 'Exam', 'Details'].map(h => (
                    <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const simScore  = s.similarity_score ?? s.plagiarism_score ?? 0;
                  const aiScore   = s.ai_score ?? 0;
                  const simCol    = simColor(simScore);
                  const aiCol     = simColor(aiScore);
                  const vStyle    = verdictStyle(s.verdict);
                  const isExp     = expanded === s.student_id;
                  const isAIViva  = s.viva_result === 'AI Text';

                  return (
                    <React.Fragment key={s.student_id}>
                      <tr
                        style={{ borderBottom: isExp ? 'none' : `1px solid ${T.border}`, background: isExp ? '#f0f7ff' : '', cursor: 'pointer' }}
                        onClick={() => setExpanded(isExp ? null : s.student_id)}
                        onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = ''; }}
                      >
                        {/* # */}
                        <td style={{ padding: '12px 13px', color: T.dim, fontFamily: 'monospace', fontSize: 11 }}>{i + 1}</td>

                        {/* Candidate */}
                        <td style={{ padding: '12px 13px', minWidth: 160 }}>
                          <div style={{ fontWeight: 700, color: T.navy }}>{s.name || s.student_id}</div>
                          <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>{s.email || s.student_id}</div>
                          {s.submitted_at && (
                            <div style={{ fontSize: 10, color: T.blue, marginTop: 2, fontFamily: 'monospace' }}>
                              {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>

                        {/* College */}
                        <td style={{ padding: '12px 13px', color: T.muted, fontSize: 12 }}>{s.college || '—'}</td>

                        {/* Branch / Batch */}
                        <td style={{ padding: '12px 13px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: T.blueBg, color: T.blue, border: '1px solid #bfdbfe' }}>{s.branch || '—'}</span>
                          <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>Batch {s.batch || '—'}</div>
                        </td>

                        {/* Similarity */}
                        <td style={{ padding: '12px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ScoreRing value={simScore} color={simCol} size={44} />
                            <div style={{ minWidth: 70 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: simCol }}>Sim: {simScore}%</div>
                              <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>{s.matched_with ? `↔ ${s.matched_with}` : 'No match'}</div>
                              <MiniBar value={simScore} color={simCol} />
                            </div>
                          </div>
                        </td>

                        {/* AI Score */}
                        <td style={{ padding: '12px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ScoreRing value={aiScore} color={aiCol} size={44} />
                            <div style={{ minWidth: 70 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: aiCol }}>AI: {aiScore}%</div>
                              <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: vStyle.bg, color: vStyle.color, border: `1px solid ${vStyle.border}`, whiteSpace: 'nowrap' }}>
                                {s.verdict || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Verdict badge */}
                        <td style={{ padding: '12px 13px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: vStyle.bg, color: vStyle.color, border: `1px solid ${vStyle.border}`, whiteSpace: 'nowrap' }}>
                            {s.verdict || '—'}
                          </span>
                        </td>

                        {/* AI Viva */}
                        <td style={{ padding: '12px 13px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                            background: isAIViva ? T.redBg : T.greenBg,
                            color: isAIViva ? T.red : T.green,
                            border: `1px solid ${isAIViva ? '#fecaca' : T.greenBdr}`,
                          }}>
                            {isAIViva ? '🤖' : '✍️'} {s.viva_result || '—'}
                          </span>
                        </td>

                        {/* Exam */}
                        <td style={{ padding: '12px 13px', fontSize: 11.5, color: T.muted, maxWidth: 150 }}>
                          {s.exam_name || examId || '—'}
                          {s.test_passed != null && (
                            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Tests: {s.test_passed}/{s.test_total ?? '?'}</div>
                          )}
                        </td>

                        {/* Expand button */}
                        <td style={{ padding: '12px 13px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : s.student_id); }}
                            style={{
                              padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${isExp ? T.accent : T.border}`,
                              background: isExp ? T.accentSoft : T.white,
                              color: isExp ? T.accent : T.muted, cursor: 'pointer',
                            }}
                          >
                            {isExp ? '▲ Hide' : '▼ Details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExp && (
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td colSpan={10} style={{ padding: 0 }}>
                            <PatternDetail student={s} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '50px 0', textAlign: 'center', color: T.dim }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.muted }}>No submissions found</div>
                      <div style={{ fontSize: 12, marginTop: 5 }}>Students need to complete and submit their coding exam first.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology card */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', marginTop: 20, boxShadow: T.shadow }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: T.navy, marginBottom: 14 }}>Detection Methodology</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {[
              { icon: '🧩', title: 'AST Token Analysis (60% weight)', body: 'Code is tokenized via Abstract Syntax Tree and matched against 47 AI-generation signatures validated across 50,000+ submissions. Each pattern is weighted based on its exclusivity in AI-generated vs human code.' },
              { icon: '📐', title: 'Jaccard Similarity (40% weight)', body: "Jaccard coefficient of token sets vs a database of reference solutions. Comments and whitespace stripped before comparison to prevent trivial obfuscation. Scores above 60% indicate near-identical logic." },
              { icon: '📊', title: 'Final Score Formula', body: 'Score = (AI Pattern Score × 0.6) + (Max Reference Similarity × 0.4). ≥70% → AI Generated, 50–69% → Likely AI, 30–49% → Possibly AI, below 30% → Human Written.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 20, marginBottom: 7 }}>{icon}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.navy, marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  @keyframes aid-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
`;

