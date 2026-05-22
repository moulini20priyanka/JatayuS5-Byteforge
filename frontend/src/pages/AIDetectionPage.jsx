import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (() => {
  try { return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'; }
  catch { return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'; }
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  pageBg:     '#f0f4f8',
  white:      '#ffffff',
  border:     '#e2e8f0',
  shadow:     '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd:   '0 4px 12px rgba(0,0,0,0.08)',
  navy:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  dim:        '#94a3b8',
  accent:     '#2563eb',
  accentDark: '#1d4ed8',
  accentSoft: '#eff6ff',
  green:      '#059669',
  greenBg:    '#ecfdf5',
  greenBdr:   '#a7f3d0',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  redBdr:     '#fecaca',
  orange:     '#d97706',
  orangeBg:   '#fffbeb',
  orangeBdr:  '#fcd34d',
  purple:     '#7c3aed',
  purpleBg:   '#f5f3ff',
  blue:       '#2563eb',
  blueBg:     '#eff6ff',
  blueBdr:    '#bfdbfe',
  slate:      '#475569',
};

// ── Two realistic records — replace with API data for production ──────────────
const FALLBACK_STUDENTS = [
  {
    student_id: 'S2024001',
    name: 'Moulini S',
    email: 'mou122058.it@rmkec.ac.in',
    college: 'RMKEC',
    branch: 'IT',
    batch: '2026',
    similarity_score: 12,
    ai_score: 18,
    verdict: 'Human Written',
    matched_with: null,
    viva_result: 'Humanized Text',
    exam_name: 'Virtusa — Full Stack Developer',
    submitted_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    trust_score: 91,
    detection_status: 'Cleared',
    patterns_found: [],
    ref_similarities: [
      { label: 'Reference S2024003', similarity: 12 },
      { label: 'Reference solution', similarity: 9 },
    ],
    code_stats: { lines: 19, hasComments: true },
    code_snippet: 'function twoSum(arr, t) {\n  let result = [];\n  for(let i=0;i<arr.length;i++){\n    for(let j=i+1;j<arr.length;j++){\n      if(arr[i]+arr[j]===t){ result=[i,j]; break; }\n    }\n  }\n  return result;\n}',
  },
  
  {
    student_id: 'S2024002',
    name: 'Shreya S',
    email: 'shreya@rmdec.ac.in',
    college: 'RMDEC',
    branch: 'CSE',
    batch: '2026',
     similarity_score: 65,
    ai_score: 58,
    verdict: 'Likely AI',
    matched_with: 'S2024003',
    viva_result: 'Humanized Text',
    exam_name: 'Virtusa — Full Stack Developer',
    submitted_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    trust_score: 42,
    detection_status: 'Flagged',
    patterns_found: [
      { label: 'Standard loop idiom', explanation: 'Formulaic loop structure commonly produced by code generators.' },
      { label: 'Array return shorthand', explanation: 'Inline array return pattern preferred by AI code completions.' },
    ],
    ref_similarities: [
      { label: 'Reference S2024003', similarity: 65 },
      { label: 'Reference solution', similarity: 41 },
    ],
    code_stats: { lines: 28, hasComments: false },
    code_snippet: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n}',
  },
   
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const riskColor = s => s >= 70 ? T.red    : s >= 40 ? T.orange   : T.green;
const riskBg    = s => s >= 70 ? T.redBg  : s >= 40 ? T.orangeBg : T.greenBg;
const riskBdr   = s => s >= 70 ? T.redBdr : s >= 40 ? T.orangeBdr: T.greenBdr;

const verdictCfg = v => {
  if (!v)                    return { bg: '#f1f5f9', color: T.dim,    border: T.border,    dot: '#cbd5e1' };
  if (v === 'AI Generated')  return { bg: T.redBg,   color: T.red,    border: T.redBdr,    dot: T.red    };
  if (v === 'Likely AI')     return { bg: '#fef3c7', color: '#b45309',border: '#fcd34d',   dot: '#d97706'};
  if (v === 'Possibly AI')   return { bg: T.blueBg,  color: T.blue,   border: T.blueBdr,   dot: T.blue   };
  return                            { bg: T.greenBg, color: T.green,  border: T.greenBdr,  dot: T.green  };
};

const statusCfg = s => {
  if (s === 'Flagged')   return { bg: T.redBg,   color: T.red,    border: T.redBdr  };
  if (s === 'Review')    return { bg: '#fef3c7', color: '#b45309',border: '#fcd34d' };
  return                        { bg: T.greenBg, color: T.green,  border: T.greenBdr};
};

// ── ScoreRing ──────────────────────────────────────────────────────────────────
function ScoreRing({ value, color, size = 48 }) {
  const r    = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((value ?? 0) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
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
    <div style={{ background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', height: 4, width: '100%', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(value ?? 0, 100)}%`, background: color, borderRadius: 99 }} />
    </div>
  );
}

// ── PatternDetail ─────────────────────────────────────────────────────────────
function PatternDetail({ student }) {
  const { patterns_found = [], ai_score, similarity_score, ref_similarities = [], code_stats = {}, code_snippet } = student;
  const aiCol  = riskColor(ai_score);
  const simCol = riskColor(similarity_score);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)',
      borderTop: `1px solid ${T.border}`,
      padding: '20px 22px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 20,
    }}>
      {/* AI Patterns */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 3, height: 14, background: T.blue, borderRadius: 2, display: 'inline-block' }} />
          AI Patterns ({patterns_found.length})
        </div>
        {patterns_found.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.green, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', background: T.greenBg, border: `1px solid ${T.greenBdr}`, borderRadius: 8 }}>
            <span style={{ fontSize: 16 }}>✓</span> No AI signatures detected
          </div>
        ) : patterns_found.map((p, i) => (
          <div key={i} style={{ background: T.white, border: `1px solid ${T.orangeBdr}`, borderLeft: `3px solid ${T.orange}`, borderRadius: 8, padding: '9px 11px', marginBottom: 7, boxShadow: T.shadow }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>{p.label}</div>
            <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>{p.explanation}</div>
          </div>
        ))}
      </div>

      {/* Structural Similarity */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 3, height: 14, background: T.blue, borderRadius: 2, display: 'inline-block' }} />
          Structural Similarity
        </div>
        {ref_similarities.map((r, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: T.text, fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: riskColor(r.similarity) }}>{r.similarity}%</span>
            </div>
            <MiniBar value={r.similarity} color={riskColor(r.similarity)} />
            <div style={{ fontSize: 10, color: T.dim, marginTop: 3 }}>
              {r.similarity >= 70 ? 'Near-identical logic' : r.similarity >= 40 ? 'Moderate structural overlap' : 'Distinct implementation'}
            </div>
          </div>
        ))}
      </div>

      {/* Score Breakdown + Code */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 3, height: 14, background: T.blue, borderRadius: 2, display: 'inline-block' }} />
          Score Breakdown
        </div>
        {[{ label: 'AI Signature Score', value: ai_score, color: aiCol }, { label: 'Similarity Score', value: similarity_score, color: simCol }].map(({ label, value, color }) => (
          <div key={label} style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: T.text }}>{label}</span>
              <span style={{ fontWeight: 700, color, fontFamily: 'monospace' }}>{value ?? '—'}%</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(value ?? 0, 100)}%`, background: color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, margin: '10px 0 12px' }}>
          {[{ lbl: 'Lines of Code', val: code_stats?.lines ?? '—' }, { lbl: 'Has Comments', val: code_stats?.hasComments ? 'Yes ✓' : 'No' }].map(({ lbl, val }) => (
            <div key={lbl} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', boxShadow: T.shadow }}>
              <div style={{ fontSize: 9.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{lbl}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: 'monospace' }}>{val}</div>
            </div>
          ))}
        </div>
        {code_snippet && (
          <div style={{ background: '#0f172a', borderRadius: 9, overflow: 'hidden', boxShadow: T.shadowMd }}>
            <div style={{ padding: '5px 11px', background: '#1e293b', fontSize: 9, color: '#64748b', letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Submitted code preview
            </div>
            <pre style={{ margin: 0, padding: '11px 13px', fontSize: 11, fontFamily: '"Fira Code", monospace', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.65, maxHeight: 130, overflow: 'auto' }}>
              {code_snippet}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AIDetectionPage() {
  const [examId,        setExamId]        = useState('');
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [expanded,      setExpanded]      = useState(null);
  const [search,        setSearch]        = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const fetchStudents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await authFetch(`${API}/ai-detection${examId ? `/${examId}` : ''}`);
      const data = await res.json();
      if (data.students?.length > 0) {
        setStudents(data.students);
        setLastRefresh(new Date());
        if (!quiet) setLoading(false);
        return;
      }
    } catch {}
    setStudents(FALLBACK_STUDENTS);
    setLastRefresh(new Date());
    if (!quiet) setLoading(false);
  }, [examId]);

  useEffect(() => { fetchStudents(false); }, []); // eslint-disable-line

  // Auto-refresh every 15s
  useEffect(() => {
    const id = setInterval(() => fetchStudents(true), 15000);
    return () => clearInterval(id);
  }, [fetchStudents]);

  // Sync from local storage (when exam submission occurs on same browser)
  useEffect(() => {
    const handler = () => fetchStudents(true);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [fetchStudents]);

  // Stats
  const aiCount       = students.filter(s => s.verdict === 'AI Generated').length;
  const likelyCount   = students.filter(s => s.verdict === 'Likely AI').length;
  const possiblyCount = students.filter(s => s.verdict === 'Possibly AI').length;
  const humanCount    = students.filter(s => s.verdict === 'Human Written').length;
  const avgAI         = students.length > 0
    ? Math.round(students.reduce((a, s) => a + (s.ai_score || 0), 0) / students.length) : 0;
  const avgTrust      = students.length > 0
    ? Math.round(students.reduce((a, s) => a + (s.trust_score || 0), 0) / students.length) : 0;

  const VERDICT_FILTERS = [
    { id: 'all',           label: 'All',           count: students.length },
    { id: 'AI Generated',  label: 'AI Generated',  count: aiCount         },
    { id: 'Likely AI',     label: 'Likely AI',     count: likelyCount     },
    { id: 'Possibly AI',   label: 'Possibly AI',   count: possiblyCount   },
    { id: 'Human Written', label: 'Human Written', count: humanCount      },
  ];

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch  = !search || (s.name||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q) || (s.college||'').toLowerCase().includes(q);
    const matchVerdict = verdictFilter === 'all' || s.verdict === verdictFilter;
    return matchSearch && matchVerdict;
  });

  const fmtTime = d => d
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  const fmtRelative = iso => {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (diff < 1)  return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div style={{ marginLeft: 230, minHeight: '100vh', background: T.pageBg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>
      <Sidebar />
      <Navbar />

      <main style={{ padding: '28px 30px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 28, background: T.accent, borderRadius: 2 }} />
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.navy, letterSpacing: '-.3px' }}>AI Code Detection</h1>
            </div>
            <p style={{ margin: '0 0 0 14px', fontSize: 12.5, color: T.muted }}>
              AST token analysis · Jaccard similarity scoring · Live-synced submissions
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>
                Refreshed {fmtTime(lastRefresh)}
              </span>
            )}
            <button
              onClick={() => fetchStudents(false)}
              disabled={loading}
              style={{
                padding: '8px 16px', background: T.white, border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.accent, cursor: 'pointer',
                boxShadow: T.shadow, display: 'flex', alignItems: 'center', gap: 6,
                opacity: loading ? .6 : 1,
              }}
            >
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Total Submissions', val: students.length, color: T.accent,  borderCol: T.accent  },
            { label: 'AI Generated',      val: aiCount,         color: T.red,     borderCol: T.red     },
            { label: 'Likely AI',         val: likelyCount,     color: T.orange,  borderCol: T.orange  },
            { label: 'Possibly AI',       val: possiblyCount,   color: T.blue,    borderCol: T.blue    },
            { label: 'Human Written',     val: humanCount,      color: T.green,   borderCol: T.green   },
            { label: 'Avg Trust Score',   val: `${avgTrust}%`,  color: avgTrust >= 60 ? T.green : T.red, borderCol: avgTrust >= 60 ? T.green : T.red },
          ].map(({ label, val, color, borderCol }) => (
            <div key={label} style={{
              background: T.white, borderRadius: 11, padding: '14px 16px',
              border: `1px solid ${T.border}`, borderTop: `3px solid ${borderCol}`,
              boxShadow: T.shadow, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9.5, color: T.dim, fontFamily: 'monospace', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Results table ── */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: T.shadow }}>

          {/* Table toolbar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 13 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, email, college…"
                style={{
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '7px 11px 7px 30px', fontSize: 12.5,
                  outline: 'none', width: 270, fontFamily: 'inherit', color: T.navy,
                  background: T.white,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {VERDICT_FILTERS.map(f => (
                <button key={f.id} onClick={() => setVerdictFilter(f.id)} style={{
                  padding: '6px 11px', borderRadius: 6,
                  border: `1px solid ${verdictFilter === f.id ? T.accent : T.border}`,
                  background: verdictFilter === f.id ? T.accentSoft : T.white,
                  color: verdictFilter === f.id ? T.accent : T.muted,
                  fontSize: 11.5, fontWeight: verdictFilter === f.id ? 700 : 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                  {f.label}
                  {f.count > 0 && (
                    <span style={{
                      marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 10,
                      background: verdictFilter === f.id ? '#dbeafe' : '#f1f5f9',
                      color: verdictFilter === f.id ? T.accent : T.dim,
                    }}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>
              {filtered.length} of {students.length} · Avg AI Score:{' '}
              <strong style={{ color: avgAI >= 50 ? T.red : T.green }}>{avgAI}%</strong>
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${T.border}` }}>
                  {['#', 'Candidate', 'College', 'Branch', 'Suspicion Score', 'Trust Score', 'Verdict', 'Detection Status', 'Last Activity', 'Details'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                      color: T.dim, textTransform: 'uppercase', letterSpacing: '.8px', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const simScore  = s.similarity_score ?? 0;
                  const aiScore   = s.ai_score ?? 0;
                  const suspicion = Math.round(aiScore * 0.6 + simScore * 0.4);
                  const trust     = s.trust_score ?? 100;
                  const vStyle    = verdictCfg(s.verdict);
                  const dStyle    = statusCfg(s.detection_status);
                  const isExp     = expanded === s.student_id;

                  return (
                    <React.Fragment key={s.student_id}>
                      <tr
                        style={{
                          borderBottom: isExp ? 'none' : `1px solid #f1f5f9`,
                          background: isExp ? '#f0f7ff' : '',
                          cursor: 'pointer',
                          transition: 'background .12s',
                        }}
                        className="aid-row"
                        onClick={() => setExpanded(isExp ? null : s.student_id)}
                      >
                        {/* # */}
                        <td style={{ padding: '13px 14px', color: T.dim, fontFamily: 'monospace', fontSize: 11 }}>{i + 1}</td>

                        {/* Candidate */}
                        <td style={{ padding: '13px 14px', minWidth: 170 }}>
                          <div style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{s.name || s.student_id}</div>
                          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{s.email}</div>
                        </td>

                        {/* College */}
                        <td style={{ padding: '13px 14px', color: T.muted, fontSize: 12 }}>{s.college || '—'}</td>

                        {/* Branch */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 9px', borderRadius: 6,
                            fontSize: 11.5, fontWeight: 600, background: T.blueBg, color: T.blue,
                            border: `1px solid ${T.blueBdr}`,
                          }}>{s.branch || '—'}</span>
                          <div style={{ fontSize: 10.5, color: T.dim, marginTop: 3 }}>Batch {s.batch || '—'}</div>
                        </td>

                        {/* Suspicion Score */}
                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <ScoreRing value={suspicion} color={riskColor(suspicion)} size={46} />
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: riskColor(suspicion) }}>
                                {suspicion}%
                              </div>
                              <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>
                                {s.matched_with ? `↔ ${s.matched_with}` : 'No match'}
                              </div>
                              <MiniBar value={suspicion} color={riskColor(suspicion)} />
                            </div>
                          </div>
                        </td>

                        {/* Trust Score */}
                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <ScoreRing value={trust} color={riskColor(100 - trust)} size={46} />
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: riskColor(100 - trust) }}>
                                {trust}%
                              </div>
                              <MiniBar value={trust} color={riskColor(100 - trust)} />
                            </div>
                          </div>
                        </td>

                        {/* Verdict */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: vStyle.bg, color: vStyle.color, border: `1px solid ${vStyle.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: vStyle.dot, flexShrink: 0 }} />
                            {s.verdict || '—'}
                          </span>
                        </td>

                        {/* Detection Status */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: dStyle.bg, color: dStyle.color, border: `1px solid ${dStyle.border}`,
                          }}>
                            {s.detection_status || 'Pending'}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td style={{ padding: '13px 14px', fontSize: 11.5, color: T.muted }}>
                          {fmtRelative(s.last_activity || s.submitted_at)}
                          {s.submitted_at && (
                            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                              {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>

                        {/* Expand */}
                        <td style={{ padding: '13px 14px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : s.student_id); }}
                            style={{
                              padding: '5px 13px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                              border: `1px solid ${isExp ? T.accent : T.border}`,
                              background: isExp ? T.accentSoft : T.white,
                              color: isExp ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            {isExp ? '▲ Hide' : '▼ Expand'}
                          </button>
                        </td>
                      </tr>

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

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} style={{ padding: '52px 0', textAlign: 'center', color: T.dim }}>
                      <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.muted }}>No submissions found</div>
                      <div style={{ fontSize: 12, marginTop: 5, color: T.dim }}>
                        Adjust your filters or wait for students to submit their exams.
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px 0', textAlign: 'center', color: T.dim, fontSize: 13 }}>
                      Loading submissions…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .aid-row:hover td { background: #f8fafc !important; }
`;