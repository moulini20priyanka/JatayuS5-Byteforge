import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function ScoreRing({ score, size = 56, color = '#6366f1' }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score, 100) / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2+4} textAnchor="middle"
        fill="#1e293b" fontSize={size/4.5} fontWeight="700"
        fontFamily="monospace">
        {Math.round(score)}
      </text>
    </svg>
  );
}

function ReportModal({ candidate, onClose }) {
  if (!candidate) return null;

  const languages = (() => {
    try { return JSON.parse(candidate.github_top_languages || '[]'); }
    catch { return []; }
  })();

  const certs = (() => {
    try { return JSON.parse(candidate.linkedin_certifications || '[]'); }
    catch { return []; }
  })();

  const score = candidate.total_score || 0;
  const ringColor = score >= 70 ? '#16a34a' : score >= 40 ? '#ea580c' : '#dc2626';
  const recommendation = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
  const recClass = score >= 70 ? 'badge-green' : score >= 50 ? 'badge-blue' : score >= 30 ? 'badge-yellow' : 'badge-red';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflow: 'auto', padding: 32,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#ede9fe', border: '3px solid #6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#6366f1', flexShrink: 0,
          }}>
            {(candidate.linkedin_name || candidate.student_id || 'S')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                {candidate.linkedin_name || candidate.student_id}
              </h2>
              <span className={`badge ${recClass}`}>{recommendation}</span>
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
              {candidate.linkedin_headline || 'Candidate Profile'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {candidate.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#6366f1', background: '#ede9fe', borderRadius: 20, padding: '2px 10px', textDecoration: 'none' }}>
                  🐙 GitHub
                </a>
              )}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#2563eb', background: '#dbeafe', borderRadius: 20, padding: '2px 10px', textDecoration: 'none' }}>
                  💼 LinkedIn
                </a>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={score} size={80} color={ringColor} />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Total Score</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #e2e8f0',
            borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
            fontSize: 18, color: '#64748b', alignSelf: 'flex-start',
          }}>×</button>
        </div>

        {/* Score breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'GitHub', value: candidate.github_score || 0, color: '#6366f1', sub: `${candidate.github_repos || 0} repos` },
            { label: 'LeetCode', value: candidate.leetcode_score || 0, color: '#16a34a', sub: `${candidate.leetcode_total_solved || 0} solved` },
            { label: 'LinkedIn', value: candidate.linkedin_score || 0, color: '#2563eb', sub: 'Profile' },
            { label: 'Test', value: Math.round(candidate.test_score || 0), color: '#ea580c', sub: 'MCQ+SQL+Code' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{
              background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
              borderLeft: `3px solid ${color}`,
            }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* GitHub */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1e293b' }}>🐙 GitHub Analysis</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Repositories</span>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{candidate.github_repos || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Followers</span>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{candidate.github_followers || 0}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Languages: </span>
              {languages.map(l => (
                <span key={l} style={{ fontSize: 11, background: '#ede9fe', color: '#6366f1', borderRadius: 20, padding: '1px 8px', marginLeft: 4 }}>{l}</span>
              ))}
            </div>
          </div>

          {/* LeetCode */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1e293b' }}>🧩 LeetCode</div>
            {[
              { label: 'Easy', value: candidate.leetcode_easy || 0, color: '#16a34a' },
              { label: 'Medium', value: candidate.leetcode_medium || 0, color: '#ea580c' },
              { label: 'Hard', value: candidate.leetcode_hard || 0, color: '#dc2626' },
              { label: 'Ranking', value: candidate.leetcode_ranking ? `#${candidate.leetcode_ranking.toLocaleString()}` : 'N/A', color: '#6366f1' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: 12, color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Test scores */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1e293b' }}>📝 Test Performance</div>
            {[
              { label: 'MCQ', value: candidate.mcq_score || 0, color: '#2563eb' },
              { label: 'SQL', value: candidate.sql_score || 0, color: '#16a34a' },
              { label: 'Coding', value: candidate.coding_score || 0, color: '#ea580c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{Math.round(value)}/100</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          {/* LinkedIn */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1e293b' }}>💼 LinkedIn</div>
            {candidate.linkedin_summary ? (
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: '0 0 10px' }}>
                {candidate.linkedin_summary.substring(0, 180)}...
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                LinkedIn blocked scraping (anti-bot). Profile URL extracted successfully.
              </p>
            )}
            {certs.length > 0 && certs.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: '#2563eb', background: '#dbeafe', borderRadius: 6, padding: '3px 8px', marginBottom: 4 }}>✓ {c}</div>
            ))}
          </div>
        </div>

        {/* AI Report */}
        {candidate.report_text && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a', marginBottom: 10 }}>🤖 AI Assessment Report</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {candidate.report_text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const [candidates, setCandidates]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterResult, setFilterResult] = useState('All');
  const [selected, setSelected]         = useState(null);

  useEffect(() => {
    axios.get(`${API}/reports/all`)
      .then(res => { setCandidates(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(c => {
    const name = (c.linkedin_name || c.student_id || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const score  = c.total_score || 0;
    const result = score >= 50 ? 'Pass' : 'Fail';
    const matchResult = filterResult === 'All' || result === filterResult;
    return matchSearch && matchResult;
  });

  const passCount = filtered.filter(c => (c.total_score || 0) >= 50).length;
  const failCount = filtered.length - passCount;
  const avgScore  = filtered.length
    ? (filtered.reduce((s, c) => s + (c.total_score || 0), 0) / filtered.length).toFixed(1)
    : 0;

  const handleExport = () => {
    const headers = ['Student ID','Name','GitHub','LeetCode','LinkedIn','Test','Total','Status'];
    const rows = filtered.map(c => [
      c.student_id, c.linkedin_name || '',
      c.github_score || 0, c.leetcode_score || 0,
      c.linkedin_score || 0, Math.round(c.test_score || 0),
      Math.round(c.total_score || 0), c.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'candidate_reports.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        <div className="page-header">
          <div className="page-header-left">
            <h1>Candidate Reports</h1>
            <p>AI-analyzed profiles with GitHub, LeetCode & test scores</p>
          </div>
          <button className="btn btn-success" onClick={handleExport}>⬇ Export CSV</button>
        </div>

        <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card stat-card-accent">
            <div className="stat-card-label">Total Candidates</div>
            <div className="stat-card-value">{filtered.length}</div>
          </div>
          <div className="stat-card stat-card-accent-green">
            <div className="stat-card-label">Passed (≥50)</div>
            <div className="stat-card-value">{passCount}</div>
            <div className="stat-card-desc">
              {filtered.length ? ((passCount / filtered.length) * 100).toFixed(0) : 0}% pass rate
            </div>
          </div>
          <div className="stat-card stat-card-accent-red">
            <div className="stat-card-label">Failed</div>
            <div className="stat-card-value">{failCount}</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-card-label">Avg Score</div>
            <div className="stat-card-value">{avgScore}</div>
            <div className="stat-card-desc">Out of 100</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span className="panel-title">Candidate Results</span>
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div className="search-bar">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input placeholder="Search candidates..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }}
                value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                <option value="All">Pass & Fail</option>
                <option>Pass</option>
                <option>Fail</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                Loading candidates...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                No candidates yet. Students must upload their resume to generate a report.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Candidate</th>
                    <th>GitHub</th>
                    <th>LeetCode</th>
                    <th>Test</th>
                    <th>Total</th>
                    <th>Recommendation</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const score    = c.total_score || 0;
                    const rec      = score >= 70 ? 'Strong Yes' : score >= 50 ? 'Yes' : score >= 30 ? 'Maybe' : 'No';
                    const recClass = score >= 70 ? 'badge-green' : score >= 50 ? 'badge-blue' : score >= 30 ? 'badge-yellow' : 'badge-red';
                    const ringColor = score >= 70 ? '#16a34a' : score >= 40 ? '#ea580c' : '#dc2626';
                    const languages = (() => {
                      try { return JSON.parse(c.github_top_languages || '[]'); }
                      catch { return []; }
                    })();

                    return (
                      <tr key={c.student_id}>
                        <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{c.linkedin_name || c.student_id}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            {languages.slice(0, 3).map(l => (
                              <span key={l} style={{ fontSize: 10, background: '#ede9fe', color: '#6366f1', borderRadius: 20, padding: '1px 6px' }}>{l}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 50, height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${c.github_score || 0}%`, height: '100%', background: '#6366f1', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.github_score || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 50, height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${c.leetcode_score || 0}%`, height: '100%', background: '#16a34a', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.leetcode_score || 0}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                            {Math.round(c.test_score || 0)}
                          </span>
                        </td>
                        <td><ScoreRing score={score} size={44} color={ringColor} /></td>
                        <td><span className={`badge ${recClass}`}>{rec}</span></td>
                        <td>
                          <span className={`badge ${c.status === 'ready' ? 'badge-green' : 'badge-yellow'}`}>
                            {c.status === 'ready' ? '✓ Ready' : '⏳ Processing'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm"
                            onClick={() => setSelected(c)}
                            style={{ fontSize: 12, padding: '4px 12px' }}>
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

      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)} />}
      <ToastContainer />
    </div>
  );
}