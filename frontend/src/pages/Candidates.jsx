import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { apiFetch } from '../services/api';

const T = {
  bg: '#f8fafc', white: '#ffffff', border: '#e2e8f0',
  navy: '#0f172a', muted: '#64748b', dim: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4',
  red: '#dc2626',   redBg: '#fef2f2',
  orange: '#ea580c', orangeBg: '#fff7ed',
  blue: '#2563eb',  blueBg: '#eff6ff',
  accent: '#7c3aed', accentBg: '#f5f3ff',
};

const scoreColor = s => s >= 70 ? T.green : s >= 40 ? T.orange : T.red;

function ScoreRing({ score, size = 48 }) {
  const c    = scoreColor(score || 0);
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={T.navy}
        fontSize={size > 50 ? 13 : 10} fontWeight="700">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

function ProgBar({ label, value, color = T.blue }) {
  const pct = Math.min(value || 0, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value != null ? `${Math.round(value)}` : '—'}</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }}/>
      </div>
    </div>
  );
}

// ── Student Detail Modal ──────────────────────────────────────────────────────
function StudentModal({ student, onClose }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('profile');

  useEffect(() => {
    if (!student) return;
    const id = student.id || student._id;
    apiFetch(`/candidates/${id}`)
      .then(result => setDetail(result.data))
      .catch(() => setDetail(student))
      .finally(() => setLoading(false));
  }, [student]);

  if (!student) return null;

  const d        = detail || student;
  const name     = d.name    || 'Unknown';
  const college  = d.college || '—';
  const email    = d.email   || '—';
  const dept     = d.branch  || d.department || '—';
  const batch    = d.batch   || '—';
  const score    = d.total_score || d.score || 0;
  const backlogs = d.backlogs || 0;
  const tenth    = d.tenth_percentage;
  const twelfth  = d.twelfth_percentage;
  const status   = d.status  || 'active';
  const exams    = Array.isArray(d.exams) ? d.exams : [];
  const skills   = Array.isArray(d.skills) ? d.skills
    : (typeof d.skills === 'string' ? d.skills.split(',').map(s => s.trim()) : []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 24px', background: T.white, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 2 }}>{name}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{college} · {dept} · Batch {batch}</div>
          </div>
          <ScoreRing score={score} size={56}/>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: T.white, borderBottom: `1px solid ${T.border}`, paddingLeft: 16, flexShrink: 0, gap: 4 }}>
          {['profile', 'academics', 'exams'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px', fontSize: 12, fontWeight: tab === t ? 700 : 500, color: tab === t ? T.blue : T.muted, borderBottom: tab === t ? `2px solid ${T.blue}` : '2px solid transparent', marginBottom: -1 }}>
              {t === 'profile' ? 'Profile' : t === 'academics' ? 'Academics' : `Exams (${exams.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Loading details…</div>
          ) : tab === 'profile' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>Contact & Basic</div>
                {[{ label: 'Full Name', value: name }, { label: 'Email', value: email }, { label: 'College', value: college }, { label: 'Branch', value: dept }, { label: 'Batch', value: batch }, { label: 'Status', value: status, color: status === 'active' ? T.green : T.orange }].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: T.dim }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: color || T.navy }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>Skills</div>
                {skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skills.map((s, i) => <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: T.accentBg, color: T.accent }}>{s}</span>)}
                  </div>
                ) : <span style={{ fontSize: 12, color: T.dim, fontStyle: 'italic' }}>No skills listed</span>}
                {(d.github_url || d.linkedin_url) && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Links</div>
                    {d.github_url   && <div><a href={d.github_url}   target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.blue }}>GitHub ↗</a></div>}
                    {d.linkedin_url && <div><a href={d.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.blue }}>LinkedIn ↗</a></div>}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'academics' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 14 }}>Academic Scores</div>
                <ProgBar label="10th Percentage" value={tenth} color={T.blue}/>
                <ProgBar label="12th Percentage" value={twelfth} color={T.accent}/>
                <ProgBar label="CGPA (×10)" value={d.cgpa ? d.cgpa * 10 : null} color={T.green}/>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: 12, color: T.muted }}>Backlogs</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: backlogs > 0 ? T.red : T.green }}>{backlogs}</span>
                </div>
              </div>
              <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 14 }}>Assessment Scores</div>
                <ProgBar label="MCQ"    value={d.mcq_score}    color={T.blue}  />
                <ProgBar label="Coding" value={d.coding_score} color={T.accent}/>
                <ProgBar label="SQL"    value={d.sql_score}    color={T.green} />
                <div style={{ marginTop: 14, padding: '12px', background: T.bg, borderRadius: 8, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Overall: </span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor(score) }}>{Math.round(score)}</span>
                </div>
              </div>
            </div>
          ) : (
            exams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: T.dim }}>No exam records found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}`, background: T.bg }}>
                    {['Exam', 'Date', 'Score', 'Result'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: T.muted, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((ex, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px 14px' }}>{ex.exam_name || ex.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: T.muted }}>
                        {ex.submitted_at || ex.date ? new Date(ex.submitted_at || ex.date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{Math.round(ex.score || 0)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: (ex.score || 0) >= 50 ? T.greenBg : T.redBg, color: (ex.score || 0) >= 50 ? T.green : T.red, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {(ex.score || 0) >= 50 ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [filterStatus,  setFilterStatus]  = useState('All');
  const [filterCollege, setFilterCollege] = useState('All');
  const [filterBatch,   setFilterBatch]   = useState('All');
  const [filterBranch,  setFilterBranch]  = useState('All');
  const [selected,    setSelected]   = useState(null);
  const [refreshing,  setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      // apiFetch already has BASE_URL = http://localhost:5000/api
      // so apiFetch('/candidates') calls → GET http://localhost:5000/api/candidates
      const result = await apiFetch('/candidates');
      setCandidates(Array.isArray(result.data) ? result.data : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    const interval = setInterval(fetchCandidates, 30000);
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  const colleges = useMemo(() => ['All', ...Array.from(new Set(candidates.map(c => c.college).filter(Boolean))).sort()], [candidates]);
  const batches  = useMemo(() => ['All', ...Array.from(new Set(candidates.map(c => String(c.batch)).filter(Boolean))).sort((a, b) => b - a)], [candidates]);
  const branches = useMemo(() => ['All', ...Array.from(new Set(candidates.map(c => c.branch).filter(Boolean))).sort()], [candidates]);

  const filtered = useMemo(() => candidates.filter(c => {
    const nm = filterCollege === 'All' || c.college === filterCollege;
    const bt = filterBatch   === 'All' || String(c.batch) === filterBatch;
    const br = filterBranch  === 'All' || c.branch === filterBranch;
    const st = filterStatus  === 'All' || (c.status || 'active').toLowerCase() === filterStatus.toLowerCase();
    const sr = (c.name || '').toLowerCase().includes(search.toLowerCase());
    return nm && bt && br && st && sr;
  }), [candidates, search, filterCollege, filterBatch, filterBranch, filterStatus]);

  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + (c.total_score || c.score || 0), 0) / candidates.length)
    : 0;

  const hasFilters = search || filterCollege !== 'All' || filterBatch !== 'All' || filterBranch !== 'All' || filterStatus !== 'All';

  const clearFilters = () => { setSearch(''); setFilterCollege('All'); setFilterBatch('All'); setFilterBranch('All'); setFilterStatus('All'); };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Candidates Directory</h1>
            <p style={{ color: T.muted, fontSize: 14 }}>Real-time college-wise, batch-wise & department-wise view</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={fetchCandidates} disabled={refreshing || loading}
              style={{ padding: '10px 18px', background: T.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: refreshing || loading ? 0.7 : 1 }}>
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            {lastUpdated && <div style={{ fontSize: 12, color: T.muted }}>Updated: {lastUpdated.toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Candidates', value: candidates.length, color: T.navy   },
            { label: 'Showing',          value: filtered.length,   color: T.blue   },
            { label: 'Colleges',         value: colleges.length - 1, color: T.accent },
            { label: 'Avg Score',        value: avgScore,           color: scoreColor(avgScore) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: T.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: T.redBg, border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: T.navy, marginBottom: 4 }}>Failed to load candidates</div>
              <div style={{ fontSize: 12, color: T.red, fontFamily: 'monospace', wordBreak: 'break-word' }}>{error}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                Ensure your Express server is on <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>http://localhost:5000</code> and the route <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>GET /api/candidates</code> is registered.
              </div>
            </div>
            <button onClick={fetchCandidates} style={{ padding: '8px 16px', background: T.red, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, padding: '18px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.muted, marginBottom: 4, fontWeight: 500 }}>Search by name</label>
              <input type="text" placeholder="Type candidate name…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none' }}/>
            </div>
            {[
              { label: 'College', value: filterCollege, onChange: setFilterCollege, options: colleges },
              { label: 'Batch',   value: filterBatch,   onChange: setFilterBatch,   options: batches  },
              { label: 'Branch',  value: filterBranch,  onChange: setFilterBranch,  options: branches },
              { label: 'Status',  value: filterStatus,  onChange: setFilterStatus,  options: ['All','active','inactive','banned'] },
            ].map(({ label, value, onChange, options }) => (
              <div key={label} style={{ minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: 12, color: T.muted, marginBottom: 4, fontWeight: 500 }}>{label}</label>
                <select value={value} onChange={e => onChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ padding: '10px 18px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: T.muted }}>
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {loading && candidates.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: `4px solid ${T.border}`, borderTopColor: T.blue, animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}/>
              <div style={{ fontSize: 16, color: T.navy, fontWeight: 600 }}>Loading candidates…</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Connecting to localhost:5000/api/candidates</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 6 }}>No candidates found</div>
              <div style={{ fontSize: 13 }}>
                {hasFilters ? 'Try adjusting your filters.' : 'No candidates registered yet.'}
              </div>
              {hasFilters && <button onClick={clearFilters} style={{ marginTop: 14, padding: '8px 20px', background: T.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Clear Filters</button>}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}`, background: T.bg }}>
                    {['#','Candidate','College','Branch','Batch','Score','Status','Action'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const score  = c.total_score || c.score || 0;
                    const sColor = c.status === 'active' ? T.green : c.status === 'inactive' ? T.orange : T.red;
                    const sBg    = c.status === 'active' ? T.greenBg : c.status === 'inactive' ? T.orangeBg : T.redBg;
                    return (
                      <tr key={c.id || c._id || idx}
                        style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => setSelected(c)}
                        onMouseEnter={e => e.currentTarget.style.background = T.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 20px', fontSize: 13, color: T.dim, fontWeight: 500 }}>{idx + 1}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${T.blue},${T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                              {(c.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>{c.name || 'Unknown'}</div>
                              <div style={{ fontSize: 11, color: T.muted }}>{c.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: T.navy }}>{c.college || '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: T.navy }}>{c.branch || c.department || '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: T.navy }}>{c.batch || '—'}</td>
                        <td style={{ padding: '14px 20px' }}><ScoreRing score={score} size={40}/></td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sBg, color: sColor }}>
                            {c.status || 'active'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <button onClick={e => { e.stopPropagation(); setSelected(c); }}
                            style={{ padding: '7px 16px', background: T.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            View Details
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
      </main>

      {selected && <StudentModal student={selected} onClose={() => setSelected(null)}/>}
      <ToastContainer/>
      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}