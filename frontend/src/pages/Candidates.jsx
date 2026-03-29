// Candidates.jsx — Real-time candidate data fetching
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const API = 'http://localhost:5000/api';

const T = {
  bg: '#f8fafc', white: '#ffffff', border: '#e2e8f0',
  navy: '#0f172a', muted: '#64748b', dim: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4',
  red: '#dc2626',   redBg: '#fef2f2',
  orange: '#ea580c', orangeBg: '#fff7ed',
  blue: '#2563eb',  blueBg: '#eff6ff',
  accent: '#7c3aed', accentBg: '#f5f3ff',
};

function ScoreRing({ score, size = 40 }) {
  const c = score >= 70 ? T.green : score >= 40 ? T.orange : T.red;
  const r = (size - 6) / 2;
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

// ── Student Detail Modal ──────────────────────────────────────────────────────
function StudentModal({ student, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    const fetchDetail = async () => {
      try {
        const id = student.id || student._id;
        const res = await fetch(`${API}/candidates/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const data = await res.json();
        setDetail(data.candidate || data);
      } catch {
        setDetail(student);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [student]);

  if (!student) return null;
  const d = detail || student;
  const name = d.name || 'Unknown';
  const college = d.college || '—';
  const email = d.email || '—';
  const dept = d.branch || d.department || '—';
  const batch = d.batch || '—';
  const score = d.total_score || d.score || 0;
  const status = d.status || 'active';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>
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

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Loading details…</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'Email', value: email },
                { label: 'College', value: college },
                { label: 'Branch', value: dept },
                { label: 'Batch', value: batch },
                { label: 'Status', value: status, color: status === 'active' ? T.green : T.orange },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.dim }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: color || T.navy }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCollege, setFilterCollege] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch candidates from backend
  const fetchCandidates = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/candidates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      // Handle both { candidates: [...] } and direct array
      const list = Array.isArray(data) ? data : (data.candidates || []);
      setCandidates(list);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Candidates] Fetch error:', err);
      setError('Could not connect to backend. Ensure server is running on port 5000.');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchCandidates, 30000);
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  // Filter options
  const colleges = useMemo(() => 
    ['All', ...Array.from(new Set(candidates.map(c => c.college).filter(Boolean))).sort()], 
    [candidates]
  );
  const batches = useMemo(() => 
    ['All', ...Array.from(new Set(candidates.map(c => String(c.batch)).filter(Boolean))).sort((a, b) => b - a)], 
    [candidates]
  );
  const branches = useMemo(() => 
    ['All', ...Array.from(new Set(candidates.map(c => c.branch).filter(Boolean))).sort()], 
    [candidates]
  );

  // Apply filters
  const filtered = useMemo(() => candidates.filter(c => {
    const byCollege = filterCollege === 'All' || c.college === filterCollege;
    const byBatch = filterBatch === 'All' || String(c.batch) === filterBatch;
    const byBranch = filterBranch === 'All' || c.branch === filterBranch;
    const byStatus = filterStatus === 'All' || (c.status || 'active').toLowerCase() === filterStatus.toLowerCase();
    const bySearch = (c.name || '').toLowerCase().includes(search.toLowerCase());
    return byCollege && byBatch && byBranch && byStatus && bySearch;
  }), [candidates, search, filterCollege, filterBatch, filterBranch, filterStatus]);

  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + (c.total_score || c.score || 0), 0) / candidates.length)
    : 0;

  const hasFilters = search || filterCollege !== 'All' || filterBatch !== 'All' || filterBranch !== 'All' || filterStatus !== 'All';
  const clearFilters = () => { 
    setSearch(''); 
    setFilterCollege('All'); 
    setFilterBatch('All'); 
    setFilterBranch('All'); 
    setFilterStatus('All'); 
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Candidates Directory</h1>
            <p style={{ color: T.muted, fontSize: 14 }}>Real-time view of all registered candidates</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={fetchCandidates} disabled={loading}
              style={{ 
                padding: '10px 18px', 
                background: T.blue, 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontSize: 13, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                opacity: loading ? 0.7 : 1 
              }}>
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {lastUpdated && <div style={{ fontSize: 12, color: T.muted }}>Updated: {lastUpdated.toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Candidates', value: candidates.length, color: T.navy },
            { label: 'Showing', value: filtered.length, color: T.blue },
            { label: 'Colleges', value: colleges.length - 1, color: T.accent },
            { label: 'Avg Score', value: avgScore, color: avgScore >= 70 ? T.green : avgScore >= 40 ? T.orange : T.red },
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
              <div style={{ fontSize: 12, color: T.red, fontFamily: 'monospace' }}>{error}</div>
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
              { label: 'Batch', value: filterBatch, onChange: setFilterBatch, options: batches },
              { label: 'Branch', value: filterBranch, onChange: setFilterBranch, options: branches },
              { label: 'Status', value: filterStatus, onChange: setFilterStatus, options: ['All','active','inactive','banned'] },
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
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Connecting to {API}/candidates</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 6 }}>No candidates found</div>
              <div style={{ fontSize: 13 }}>{hasFilters ? 'Try adjusting your filters.' : 'No candidates registered yet.'}</div>
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
                    const score = c.total_score || c.score || 0;
                    const sColor = c.status === 'active' ? T.green : c.status === 'inactive' ? T.orange : T.red;
                    const sBg = c.status === 'active' ? T.greenBg : c.status === 'inactive' ? T.orangeBg : T.redBg;
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
      </main>

      {selected && <StudentModal student={selected} onClose={() => setSelected(null)}/>}
      <ToastContainer/>
      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}