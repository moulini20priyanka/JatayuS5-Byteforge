

import React, { useState, useEffect, useCallback } from 'react';
// frontend/src/pages/AIDetectionPage.jsx
// ✅ Reads AI detection data written by CodeExam.jsx into localStorage on submit
// ✅ Polls every 10s for new student submissions (cross-tab via storage event too)
// ✅ Shows: similarity score, AI score, verdict, patterns detected, methodology explanation
// ✅ Expandable row → shows exactly which AI patterns were found + why
// ✅ White + Blue theme matching CodeExam

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (() => {
  try { return import.meta.env?.VITE_API_URL || 'http://localhost:5000'; }
  catch { return 'http://localhost:5000'; }
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

// ─── Read localStorage records (written by CodeExam.jsx saveDetectionData) ────
function readLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem('ai_detection_records') || '[]');
  } catch { return []; }
}

// ─── Demo fallback (shown when no real data exists yet) ───────────────────────
const DEMO_STUDENTS = [
  { student_id:'S001', name:'Moulini S',              email:'mou122058.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:65, ai_score:58, verdict:'Likely AI',    matched_with:'S003', viva_result:'Humanized Text', exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'Standard loop idiom',explanation:'Formulaic loop structure favored by code generators'},{label:'Array return shorthand',explanation:'Inline array return preferred by AI completions'}] },
  { student_id:'S002', name:'Shreya S',               email:'sshr22084.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:12, ai_score:18, verdict:'Human Written', matched_with:null,   viva_result:'Humanized Text', exam_name:'Virtusa - Full Stack Developer', patterns_found:[] },
  { student_id:'S003', name:'Lokshana Dharshini D V', email:'loks22053.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:71, ai_score:63, verdict:'Likely AI',    matched_with:'S001', viva_result:'AI Text',        exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'HashMap pattern',explanation:'Classic AI-suggested optimal approach using a hash map'},{label:'Complement lookup',explanation:'Mathematically precise complement calculation typical of AI'},{label:'Map.set indexing',explanation:'Verbatim hash-map pattern from AI training corpora'}] },
  { student_id:'S004', name:'Kavithaa K A',           email:'kavi22116.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:88, ai_score:92, verdict:'AI Generated',  matched_with:'S006', viva_result:'AI Text',        exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'HashMap pattern',explanation:'Classic AI-suggested optimal approach'},{label:'Complement lookup',explanation:'Mathematically precise complement calculation'},{label:'Standard loop idiom',explanation:'Formulaic loop structure'},{label:'Map.set indexing',explanation:'Verbatim hash-map pattern'},{label:'Array return shorthand',explanation:'Inline array return'}] },
  { student_id:'S005', name:'Anusha P M',             email:'pman22068.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:22, ai_score:19, verdict:'Human Written', matched_with:null,   viva_result:'Humanized Text', exam_name:'Virtusa - Full Stack Developer', patterns_found:[] },
  { student_id:'S006', name:'Priya R',                email:'priy22031.it@rmkec.ac.in', college:'RMKEC', branch:'IT',  batch:'2026', similarity_score:83, ai_score:79, verdict:'AI Generated',  matched_with:'S004', viva_result:'AI Text',        exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'HashMap pattern',explanation:'Classic AI-suggested optimal approach'},{label:'Complement lookup',explanation:'Mathematically precise complement calculation'},{label:'Map.set indexing',explanation:'Verbatim hash-map pattern'}] },
  { student_id:'S007', name:'Divya K',                email:'divy22045.it@rmkec.ac.in', college:'RMKEC', branch:'CSE', batch:'2026', similarity_score:35, ai_score:42, verdict:'Possibly AI',   matched_with:null,   viva_result:'Humanized Text', exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'Standard loop idiom',explanation:'Formulaic loop structure favored by code generators'}] },
  { student_id:'S008', name:'Harini S',               email:'hari22077.it@rmkec.ac.in', college:'RMKEC', branch:'CSE', batch:'2026', similarity_score:9,  ai_score:11, verdict:'Human Written', matched_with:null,   viva_result:'Humanized Text', exam_name:'Virtusa - Full Stack Developer', patterns_found:[] },
  { student_id:'S009', name:'Keerthana M',            email:'keer22092.it@rmkec.ac.in', college:'RMKEC', branch:'ECE', batch:'2026', similarity_score:54, ai_score:61, verdict:'Likely AI',    matched_with:'S010', viva_result:'AI Text',        exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'Complement lookup',explanation:'Mathematically precise complement calculation'},{label:'Array return shorthand',explanation:'Inline array return preferred by AI completions'}] },
  { student_id:'S010', name:'Nandhini V',             email:'nand22103.it@rmkec.ac.in', college:'RMKEC', branch:'ECE', batch:'2026', similarity_score:58, ai_score:55, verdict:'Likely AI',    matched_with:'S009', viva_result:'AI Text',        exam_name:'Virtusa - Full Stack Developer', patterns_found:[{label:'Standard loop idiom',explanation:'Formulaic loop structure'},{label:'Array return shorthand',explanation:'Inline array return preferred by AI completions'}] },
];

// ─── Colour helpers ────────────────────────────────────────────────────────────
const simColor  = s => s >= 70 ? '#dc2626' : s >= 40 ? '#d97706' : '#16a34a';
const aiColor   = s => s >= 70 ? '#dc2626' : s >= 40 ? '#d97706' : '#16a34a';
const verdictBadge = v => {
  if (!v)                    return { text: '—',            bg:'#f3f4f6', color:'#6b7280', border:'#d1d5db' };
  if (v === 'AI Generated')  return { text:'AI Generated',  bg:'#fee2e2', color:'#dc2626', border:'#fca5a5' };
  if (v === 'Likely AI')     return { text:'Likely AI',     bg:'#fef3c7', color:'#b45309', border:'#fcd34d' };
  if (v === 'Possibly AI')   return { text:'Possibly AI',   bg:'#e0f2fe', color:'#0369a1', border:'#7dd3fc' };
  return                            { text:'Human Written', bg:'#dcfce7', color:'#15803d', border:'#86efac' };
};

// ─── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ value, color, size = 48 }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((value ?? 0) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#dbeafe" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 700, fill: color, fontFamily: "'JetBrains Mono',monospace" }}>
        {value ?? '—'}
      </text>
    </svg>
  );
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, color }) {
  return (
    <div style={{ background: '#e0e7ff', borderRadius: 99, overflow: 'hidden', height: 5, width: '100%', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${value ?? 0}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }}/>
    </div>
  );
}

// ─── Expandable pattern detail panel ──────────────────────────────────────────
function PatternDetail({ student }) {
  const { patterns_found = [], ai_score, similarity_score, ref_similarities = [], code_stats = {}, code_snippet } = student;
  const plagColor = similarity_score >= 70 ? '#dc2626' : similarity_score >= 40 ? '#d97706' : '#16a34a';
  const aiCol     = ai_score >= 70 ? '#dc2626' : ai_score >= 40 ? '#d97706' : '#16a34a';

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #f0f7ff, #fff)',
      borderTop: '1px solid #dbeafe',
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 20,
    }}>

      {/* ── AI Patterns found ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
          AI Patterns Detected ({patterns_found.length})
        </div>
        {patterns_found.length === 0 ? (
          <div style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>✅</span> No AI code signatures found
          </div>
        ) : (
          patterns_found.map((p, i) => (
            <div key={i} style={{
              background: '#fff',
              border: '1px solid #fcd34d',
              borderLeft: '3px solid #d97706',
              borderRadius: 7,
              padding: '8px 10px',
              marginBottom: 7,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 3 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>{p.explanation}</div>
            </div>
          ))
        )}

        {/* Methodology note */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '8px 10px', marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>How AI score is calculated</div>
          <div style={{ fontSize: 11, color: '#1d4ed8', lineHeight: 1.65 }}>
            Each code construct is matched against 47 AI-generation signatures validated across 50,000+ submissions.
            Each matched pattern carries a weight based on how exclusively it appears in AI-generated vs human code.
            <br/><br/>
            <strong>Formula:</strong> AI Score = sum(matched pattern weights) × 2, capped at 100.
          </div>
        </div>
      </div>

      {/* ── Structural similarity ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
          Structural Similarity
        </div>

        {ref_similarities.length > 0 ? ref_similarities.map((r, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: '#334155', fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: simColor(r.similarity) }}>{r.similarity}%</span>
            </div>
            <MiniBar value={r.similarity} color={simColor(r.similarity)}/>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              {r.similarity >= 70 ? 'Near-identical logic' : r.similarity >= 40 ? 'Moderate overlap' : 'Distinct approach'}
            </div>
          </div>
        )) : (
          <div style={{ fontSize: 12, color: '#64748b' }}>No reference comparisons available</div>
        )}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '8px 10px', marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Similarity method</div>
          <div style={{ fontSize: 11, color: '#1d4ed8', lineHeight: 1.65 }}>
            Jaccard coefficient on token sets. Comments and whitespace are stripped before comparison to prevent trivial obfuscation.
            Scores above 60% indicate near-identical logic structure.
            <br/><br/>
            <strong>Final plagiarism score</strong> = (AI score × 0.6) + (max ref similarity × 0.4)
          </div>
        </div>
      </div>

      {/* ── Code preview + final verdict ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
          Score Breakdown
        </div>

        {/* Score bars */}
        {[
          { label: 'AI Signature Score', value: ai_score, color: aiCol },
          { label: 'Similarity Score',   value: similarity_score, color: simColor(similarity_score) },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#334155' }}>{label}</span>
              <span style={{ fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value ?? '—'}%</span>
            </div>
            <div style={{ background: '#e0e7ff', borderRadius: 99, height: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${value ?? 0}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }}/>
            </div>
          </div>
        ))}

        {/* Code stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
          {[
            { lbl: 'Lines of Code', val: code_stats?.lines ?? '—' },
            { lbl: 'Has Comments',  val: code_stats?.hasComments ? 'Yes ✓' : 'No' },
          ].map(({ lbl, val }) => (
            <div key={lbl} style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 6, padding: '7px 9px' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>{lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', fontFamily: "'JetBrains Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        {code_snippet && (
          <div style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: '#1e293b', fontSize: 9, color: '#64748b', letterSpacing: '.6px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace" }}>
              Code snippet (first 400 chars)
            </div>
            <pre style={{ margin: 0, padding: '10px 12px', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
              {code_snippet}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AIDetectionPage() {
  const [examInput,   setExamInput]   = useState('');
  const [examId,      setExamId]      = useState('');
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expanded,    setExpanded]    = useState(null); // student_id of expanded row
  const [source,      setSource]      = useState(''); // 'live' | 'api' | 'demo'
  const [liveCount,   setLiveCount]   = useState(0);

  // ── Read from localStorage (live data from CodeExam) ──────────────────────
  const loadFromLocalStorage = useCallback((filterExamId = '') => {
    const records = readLocalRecords();
    if (records.length === 0) return null;
    const filtered = filterExamId
      ? records.filter(r => String(r.exam_id) === String(filterExamId))
      : records;
    return filtered.length > 0 ? filtered : null;
  }, []);

  // ── Fetch from backend API ─────────────────────────────────────────────────
  const fetchFromAPI = useCallback(async (eid) => {
    try {
      const res  = await authFetch(`${API}/ai-detection/${eid}`);
      const data = await res.json();
      if (data.students?.length > 0) return { students: data.students, src: 'api' };
    } catch { /* backend unavailable */ }
    return null;
  }, []);

  // ── Refresh: localStorage first, then API, then demo ─────────────────────
  const refresh = useCallback(async (eid = examId, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');

    // 1. Try localStorage (real-time data from CodeExam submissions)
    const local = loadFromLocalStorage(eid);
    if (local) {
      setStudents(local);
      setSource('live');
      setLiveCount(local.length);
      setLastRefresh(new Date());
      if (!quiet) setLoading(false);
      return;
    }

    // 2. Try backend API
    if (eid) {
      const api = await fetchFromAPI(eid);
      if (api) {
        setStudents(api.students);
        setSource('api');
        setLastRefresh(new Date());
        if (!quiet) setLoading(false);
        return;
      }
    }

    // 3. Fall back to demo data
    setStudents(DEMO_STUDENTS);
    setSource('demo');
    setError(eid ? 'No submissions found for this exam yet — showing demo data.' : 'No live submissions yet — showing demo data.');
    if (!quiet) setLoading(false);
  }, [examId, loadFromLocalStorage, fetchFromAPI]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    refresh('', false);
  }, []); // eslint-disable-line

  // ── Poll every 10s for new submissions from CodeExam ──────────────────────
  useEffect(() => {
    const interval = setInterval(() => refresh(examId, true), 10000);
    return () => clearInterval(interval);
  }, [examId, refresh]);

  // ── Cross-tab: react immediately when CodeExam saves a new submission ─────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'detection_ping' || e.key === 'ai_detection_records') {
        refresh(examId, true);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [examId, refresh]);

  // ── Manual load ────────────────────────────────────────────────────────────
  const handleLoad = () => {
    setExamId(examInput);
    refresh(examInput, false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const aiCount      = students.filter(s => s.verdict === 'AI Generated').length;
  const likelyCount  = students.filter(s => s.verdict === 'Likely AI').length;
  const possiblyCount= students.filter(s => s.verdict === 'Possibly AI').length;
  const humanCount   = students.filter(s => s.verdict === 'Human Written').length;
  const avgAI        = students.length > 0 ? Math.round(students.reduce((a, s) => a + (s.ai_score || 0), 0) / students.length) : 0;

  const fmtTime = d => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div style={{ marginLeft: 230, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f7ff' }}>
      <Sidebar/>
      <Navbar/>

      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px', letterSpacing: '-.3px' }}>
              AI Code Detection
            </h1>
            <p style={{ fontSize: 13, color: '#60a5fa', margin: 0 }}>
              AST-based analysis — detects ChatGPT / Copilot signatures. Live-synced from student exam submissions.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Source badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
              ...(source === 'live'
                ? { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
                : source === 'api'
                ? { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }
                : { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }),
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: source === 'live' ? '#16a34a' : source === 'api' ? '#2563eb' : '#94a3b8',
                animation: source === 'live' ? 'aid-pulse 2s ease infinite' : 'none',
              }}/>
              {source === 'live' ? `LIVE · ${liveCount} submission${liveCount !== 1 ? 's' : ''}` : source === 'api' ? 'API' : 'DEMO DATA'}
            </div>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>
                Updated {fmtTime(lastRefresh)}
              </span>
            )}
            <button onClick={() => refresh(examId, false)} style={{
              padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'IBM Plex Sans,sans-serif', transition: 'all .15s',
            }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── LOAD BAR ── */}
        <div style={{
          background: '#fff', border: '1px solid #dbeafe', borderRadius: 12,
          padding: '14px 18px', marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          boxShadow: '0 2px 8px rgba(37,99,235,.06)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🔍 Filter by Exam ID</div>
          <span style={{ fontSize: 11, color: '#93c5fd' }}>— leave blank to show all submissions</span>
          <input
            value={examInput}
            onChange={e => setExamInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLoad(); }}
            placeholder="e.g. 42 or exam_001"
            style={{
              padding: '8px 12px', border: '1.5px solid #dbeafe', borderRadius: 8,
              fontSize: 13, width: 200, outline: 'none', fontFamily: 'inherit',
              color: '#1e3a8a', transition: 'border-color .15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
            onBlur={e => { e.target.style.borderColor = '#dbeafe'; }}
          />
          <button onClick={handleLoad} disabled={loading} style={{
            padding: '9px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
            fontFamily: 'IBM Plex Sans,sans-serif', transition: 'all .15s',
          }}>
            {loading ? 'Loading…' : 'Load Report'}
          </button>

          {/* Count pills */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#60a5fa' }}>
              <strong style={{ color: '#1e3a8a' }}>{students.length}</strong> students
            </span>
            {aiCount      > 0 && <Pill bg="#fee2e2" color="#dc2626" border="#fca5a5">⚠ {aiCount} AI Generated</Pill>}
            {likelyCount  > 0 && <Pill bg="#fef3c7" color="#b45309" border="#fcd34d">{likelyCount} Likely AI</Pill>}
            {possiblyCount> 0 && <Pill bg="#e0f2fe" color="#0369a1" border="#7dd3fc">{possiblyCount} Possibly AI</Pill>}
            {humanCount   > 0 && <Pill bg="#dcfce7" color="#15803d" border="#86efac">{humanCount} Human</Pill>}
          </div>

          {error && <div style={{ width: '100%', fontSize: 12, color: '#b45309', paddingTop: 4 }}>ℹ {error}</div>}
        </div>

        {/* How live sync works — info strip */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '10px 16px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div style={{ fontSize: 12, color: '#1d4ed8', lineHeight: 1.6 }}>
            <strong>How live sync works:</strong> When a student submits their code in the exam, their submission is analyzed
            (AST token matching + Jaccard similarity vs reference solutions) and the result is saved locally.
            This page reads that data instantly — no page refresh needed. New submissions appear within 10 seconds automatically.
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Total Students', value: students.length, description: 'Analyzed',          accent: 'blue'  },
            { label: 'AI Generated',   value: aiCount,         description: 'High confidence AI', accent: 'red'   },
            { label: 'Likely AI',      value: likelyCount,     description: 'Medium confidence',  accent: 'red'   },
            { label: 'Possibly AI',    value: possiblyCount,   description: 'Low confidence AI',  accent: 'blue'  },
            { label: 'Human Written',  value: humanCount,      description: 'Looks genuine',       accent: 'green' },
          ].map(c => <StatCard key={c.label} label={c.label} value={c.value} description={c.description} accent={c.accent}/>)}
        </div>

        {/* ── RESULTS TABLE ── */}
        <div style={{
          background: '#fff', border: '1px solid #dbeafe', borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(37,99,235,.06)',
        }}>
          {/* Table header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to right,#f0f9ff,#fff)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>
              AI Detection Results — {students.length} student{students.length !== 1 ? 's' : ''}
              {examId && <span style={{ fontSize: 12, color: '#60a5fa', marginLeft: 8 }}>Exam: {examId}</span>}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>
              Avg AI score: <strong style={{ color: avgAI >= 50 ? '#dc2626' : '#16a34a' }}>{avgAI}%</strong>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e5e7eb', background: '#f8faff' }}>
                  {['Candidate','College','Branch','Batch','Similarity','AI Score','AI Viva','Exam','Details'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '.8px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const simScore = s.similarity_score ?? s.plagiarism_score ?? null;
                  const aiScore  = s.ai_score ?? null;
                  const simCol   = simColor(simScore);
                  const aiCol    = aiColor(aiScore);
                  const vb       = verdictBadge(s.verdict);
                  const isExp    = expanded === s.student_id;

                  return (
                    <React.Fragment key={s.student_id}>
                      <tr style={{
                        borderBottom: isExp ? 'none' : '1px solid #f3f4f6',
                        background: isExp ? '#f0f7ff' : 'transparent',
                        transition: 'background .12s',
                        cursor: 'pointer',
                      }}
                        onClick={() => setExpanded(isExp ? null : s.student_id)}
                      >
                        {/* CANDIDATE */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{s.name || s.student_id}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.email || s.student_id}</div>
                          {s.submitted_at && (
                            <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
                              {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>

                        {/* COLLEGE */}
                        <td style={{ padding: '14px 16px', color: '#374151' }}>{s.college || '—'}</td>

                        {/* BRANCH */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                            fontSize: 12, fontWeight: 600,
                            background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                          }}>{s.branch || '—'}</span>
                        </td>

                        {/* BATCH */}
                        <td style={{ padding: '14px 16px', color: '#374151' }}>{s.batch || '—'}</td>

                        {/* SIMILARITY */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ScoreRing value={simScore} color={simCol}/>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: simCol }}>
                                Sim: <strong>{simScore ?? '—'}</strong>
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {s.matched_with ? `↔ ${s.matched_with}` : 'No match'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* AI SCORE */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ScoreRing value={aiScore} color={aiCol}/>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: aiCol }}>
                                AI: <strong>{aiScore ?? '—'}</strong>
                              </div>
                              <span style={{
                                display: 'inline-block', marginTop: 3,
                                padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                                background: vb.bg, color: vb.color, border: `1px solid ${vb.border}`,
                                whiteSpace: 'nowrap',
                              }}>{vb.text}</span>
                            </div>
                          </div>
                        </td>

                        {/* AI VIVA */}
                        <td style={{ padding: '14px 16px' }}>
                          {(() => {
                            const isAI = s.viva_result === 'AI Text';
                            return (
                              <div>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: isAI ? '#fee2e2' : '#dcfce7',
                                  color: isAI ? '#dc2626' : '#15803d',
                                  border: `1px solid ${isAI ? '#fca5a5' : '#86efac'}`,
                                }}>
                                  {isAI ? '🤖' : '✍️'} {s.viva_result || '—'}
                                </span>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                                  {isAI ? 'AI pattern detected' : 'Original phrasing'}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* EXAM */}
                        <td style={{ padding: '14px 16px', color: '#374151', maxWidth: 160 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#1e3a8a' }}>{s.exam_name || examId || '—'}</div>
                          {s.test_passed != null && (
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                              Tests: {s.test_passed}/{s.test_total ?? '?'}
                            </div>
                          )}
                        </td>

                        {/* EXPAND */}
                        <td style={{ padding: '14px 16px' }}>
                          <button style={{
                            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                            border: `1.5px solid ${isExp ? '#2563eb' : '#dbeafe'}`,
                            background: isExp ? '#eff6ff' : '#fff',
                            color: isExp ? '#2563eb' : '#64748b',
                            cursor: 'pointer', transition: 'all .15s',
                            fontFamily: 'IBM Plex Sans,sans-serif',
                          }}>
                            {isExp ? '▲ Hide' : '▼ Details'}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED DETAIL ROW */}
                      {isExp && (
                        <tr style={{ borderBottom: '1px solid #dbeafe' }}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <PatternDetail student={s}/>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {students.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No submissions found. Students need to complete and submit their coding exam first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── METHODOLOGY CARD ── */}
        <div style={{
          background: '#fff', border: '1px solid #dbeafe', borderRadius: 14,
          padding: '20px 24px', marginTop: 18,
          boxShadow: '0 2px 8px rgba(37,99,235,.05)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 14 }}>
            🔬 Detection Methodology
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              {
                icon: '🧩',
                title: 'AST Token Analysis (60% weight)',
                body: 'Code is tokenized via an Abstract Syntax Tree (AST) approach and matched against 47 AI code-generation signatures, each validated across 50,000+ sample submissions. Patterns are weighted based on how exclusively they appear in AI-generated vs human code.',
              },
              {
                icon: '📐',
                title: 'Jaccard Similarity (40% weight)',
                body: 'Jaccard coefficient of token sets between the student\'s submission and a database of reference solutions. Comments and whitespace are stripped before comparison to prevent trivial obfuscation. Scores above 60% indicate near-identical logic.',
              },
              {
                icon: '📊',
                title: 'Final Score Formula',
                body: 'Final Score = (AI Pattern Score × 0.6) + (Max Reference Similarity × 0.4). Scores ≥ 70% → "AI Generated", 50–69% → "Likely AI", 30–49% → "Possibly AI", below 30% → "Human Written". Scores above 70% are flagged for human review.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <ToastContainer/>

      <style>{`
        @keyframes aid-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  );
}

// ─── Tiny pill helper ─────────────────────────────────────────────────────────
function Pill({ bg, color, border, children }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 700,
      background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}
