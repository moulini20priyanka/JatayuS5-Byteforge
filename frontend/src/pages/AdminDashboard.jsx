// AdminDashboard.jsx — Blue theme matching login page
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const API = 'http://localhost:5000/api';

const getToken = () =>
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

const dashStyles = `
  .dash-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .dash-page-header h1 {
    font-size: 22px;
    font-weight: 800;
    color: #1e3a8a;
    margin: 0 0 4px;
  }
  .dash-page-header p {
    font-size: 13px;
    color: #60a5fa;
    margin: 0;
  }
  .dash-btn-primary {
    padding: 9px 18px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 700;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.18s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dash-btn-primary:hover {
    background: linear-gradient(135deg, #1d4ed8, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(37,99,235,0.35);
  }
  .dash-btn-secondary {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .dash-btn-secondary:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.12);
  }
  .dash-panel {
    background: #fff;
    border: 1px solid #dbeafe;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(37,99,235,0.06);
  }
  .dash-panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eff6ff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(to right, #f0f9ff, #fff);
  }
  .dash-panel-title { font-size: 14px; font-weight: 700; color: #1e3a8a; }
  .dash-panel-body  { padding: 20px; }
  .dash-table-wrap  { overflow-x: auto; }
  .dash-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .dash-table-wrap thead tr { background: #f0f9ff; border-bottom: 1.5px solid #dbeafe; }
  .dash-table-wrap th {
    padding: 11px 16px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .dash-table-wrap tbody tr {
    border-bottom: 1px solid #f0f9ff;
    transition: background 0.15s ease;
  }
  .dash-table-wrap tbody tr:hover { background: #f0f9ff; }
  .dash-table-wrap td { padding: 12px 16px; vertical-align: middle; }
  .dash-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }
  .dash-badge-green    { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
  .dash-badge-blue     { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
  .dash-badge-gray     { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f9fafb; color: #374151; border: 1px solid #d1d5db; }
  .dash-badge-yellow   { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
  .dash-empty-state    { padding: 48px; text-align: center; color: #93c5fd; font-size: 14px; }
  .dash-empty-icon     { font-size: 32px; margin-bottom: 10px; }
  /* Plag / AI detection styles */
  .dash-plag-input {
    padding: 8px 12px;
    border: 1.5px solid #dbeafe;
    border-radius: 8px;
    font-size: 13px;
    width: 200px;
    outline: none;
    font-family: inherit;
    color: #1e3a8a;
    transition: border-color 0.15s;
  }
  .dash-plag-input:focus { border-color: #3b82f6; }
  .dash-plag-load-btn {
    padding: 9px 18px;
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .dash-plag-load-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #6d28d9, #5b21b6);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(109,40,217,0.3);
  }
  .dash-plag-load-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
  .dash-ai-load-btn {
    padding: 9px 18px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .dash-ai-load-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(37,99,235,0.3);
  }
  .dash-ai-load-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
  .dash-detail-btn {
    padding: 5px 12px;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .dash-detail-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
  }
  .dash-nav-card {
    padding: 16px 20px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: all 0.18s ease;
    border: 1px solid;
  }
  .dash-nav-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(37,99,235,0.12);
  }
  .dash-tab-btn {
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid #dbeafe;
    background: #fff;
    color: #3b82f6;
    transition: all 0.15s;
  }
  .dash-tab-btn:hover { background: #eff6ff; border-color: #93c5fd; }
`;

function StatusBadge({ status }) {
  const map = {
    Active:    'dash-badge-green',
    Completed: 'dash-badge-blue',
    Draft:     'dash-badge-gray',
    Scheduled: 'dash-badge-yellow',
    scheduled: 'dash-badge-yellow',
    completed: 'dash-badge-blue',
    active:    'dash-badge-green',
  };
  const display = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return <span className={map[status] || 'dash-badge-gray'}>{display}</span>;
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(37,99,235,0.12)' }}>
        <p style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#2563eb', margin: 0 }}>{payload[0].value} candidate{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
}

const PLAG_RISK = (score) => {
  if (score == null) return { label: '—',           color: '#94a3b8', bg: '#f1f5f9',  border: '#e2e8f0' };
  if (score >= 70)   return { label: 'High Risk',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  if (score >= 40)   return { label: 'Medium Risk', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' };
  return               { label: 'Clean',            color: '#0a8f5c', bg: '#d9f5ec', border: '#6ee7b7' };
};

function PlagiarismDetailPanel({ studentId, examId, score, matchedWith, changeCount, onClose }) {
  const [timeline,   setTimeline]   = useState([]);
  const [compare,    setCompare]    = useState(null);
  const [loadingTl,  setLoadingTl]  = useState(true);
  const [loadingCmp, setLoadingCmp] = useState(false);
  const risk = PLAG_RISK(score);

  useEffect(() => {
    if (!examId || !studentId) { setLoadingTl(false); return; }
    authFetch(`${API}/reports/${examId}/${studentId}/timeline`)
      .then(r => r.json())
      .then(d => { setTimeline(d.timeline || []); setLoadingTl(false); })
      .catch(() => setLoadingTl(false));
  }, [examId, studentId]);

  const fetchCompare = async () => {
    setLoadingCmp(true);
    try {
      const res  = await authFetch(`${API}/reports/${examId}/${studentId}/compare`);
      const data = await res.json();
      setCompare(data);
    } catch { setCompare(null); }
    setLoadingCmp(false);
  };

  return (
    <div style={{ background: '#fafbfd', border: `1.5px solid ${risk.border}`, borderRadius: 10, padding: 16, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
      >×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14, padding: '10px 14px', background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: risk.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Plagiarism Risk</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: risk.color }}>{risk.label}</div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: risk.color, fontFamily: 'monospace' }}>{score != null ? `${score}%` : '—'}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {matchedWith && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Matched: <strong>{matchedWith}</strong></div>}
          {changeCount != null && <div style={{ fontSize: 11, color: '#93c5fd' }}>{changeCount} code snapshots</div>}
        </div>
      </div>

      {loadingTl ? (
        <div style={{ fontSize: 11, color: '#93c5fd', padding: '6px 0', fontStyle: 'italic' }}>Loading timeline…</div>
      ) : timeline.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Code Growth Timeline</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 44 }}>
            {timeline.map((t, i) => {
              const maxChars = Math.max(...timeline.map(x => x.chars), 1);
              const h = Math.max(3, (t.chars / maxChars) * 40);
              return <div key={i} title={`Snapshot ${t.snapshot} — ${t.chars} chars`}
                style={{ flex: 1, height: h, background: '#2563eb', borderRadius: '2px 2px 0 0', opacity: 0.25 + (i / timeline.length) * 0.75 }}/>;
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#93c5fd', marginTop: 3 }}>
            <span>Start</span><span>{timeline.length} snapshots</span><span>Latest</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 12, fontStyle: 'italic' }}>No timeline data.</div>
      )}

      {matchedWith && !compare && (
        <button onClick={fetchCompare} disabled={loadingCmp}
          style={{ width: '100%', padding: '8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: loadingCmp ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 10, transition: 'all 0.15s' }}
          onMouseEnter={e => { if (!loadingCmp) e.currentTarget.style.background = '#b91c1c'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
        >
          {loadingCmp ? 'Loading comparison…' : 'Show Side-by-Side Code Comparison'}
        </button>
      )}

      {compare?.studentA && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Code Comparison</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[compare.studentA, compare.studentB].map(st => (
              <div key={st.id}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 3 }}>{st.id}</div>
                <pre style={{ fontSize: 11, background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 8, overflowX: 'auto', maxHeight: 160, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {st.code || '(empty)'}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [exams,          setExams]          = useState([]);
  const [plagExamInput,  setPlagExamInput]  = useState('exam_001');
  const [plagData,       setPlagData]       = useState({});
  const [plagLoading,    setPlagLoading]    = useState(false);
  const [plagError,      setPlagError]      = useState('');
  const [expandedPlag,   setExpandedPlag]   = useState(null);
  const [loadingExams,   setLoadingExams]   = useState(true);

  useEffect(() => {
    authFetch(`${API}/exams`)
      .then(r => {
        if (r.status === 401) throw new Error('Unauthorized — please log in again');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setExams(Array.isArray(d) ? d : (d.exams || [])); setLoadingExams(false); })
      .catch(err => { console.error('[ReportsTab] exams error:', err.message); setLoadingExams(false); });
  }, []);

  const loadPlagiarism = async () => {
    if (!plagExamInput.trim()) return;
    setPlagLoading(true); setPlagError('');
    try {
      const res  = await authFetch(`${API}/reports/${plagExamInput.trim()}`);
      const data = await res.json();
      if (data.students && Array.isArray(data.students)) {
        const map = {};
        data.students.forEach(s => {
          map[s.student_id] = { score: s.plagiarism_score, matchedWith: s.matched_with, changeCount: s.change_count, examId: plagExamInput.trim() };
        });
        setPlagData(map);
        if (!data.students.length) setPlagError('No plagiarism data found for this exam ID.');
      } else {
        setPlagError('No data found for this exam ID.');
      }
    } catch {
      setPlagError('Could not connect to backend. Make sure server is running on port 5000.');
    }
    setPlagLoading(false);
  };

  const highRisk  = Object.values(plagData).filter(p => p.score >= 70).length;
  const medRisk   = Object.values(plagData).filter(p => p.score >= 40 && p.score < 70).length;
  const totalPlag = Object.keys(plagData).length;

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(37,99,235,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🔍 Load Plagiarism Scores</div>
        <span style={{ fontSize: 11, color: '#60a5fa' }}>— enriches the Plagiarism column in the exam table below</span>
        <input
          className="dash-plag-input"
          value={plagExamInput}
          onChange={e => setPlagExamInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') loadPlagiarism(); }}
          placeholder="Exam ID e.g. exam_001"
        />
        <button className="dash-plag-load-btn" onClick={loadPlagiarism} disabled={plagLoading}>
          {plagLoading ? 'Loading…' : 'Load'}
        </button>
        {totalPlag > 0 && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: '#60a5fa' }}>Loaded: <strong>{totalPlag}</strong> records</span>
            {highRisk > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 700, border: '1px solid #fca5a5' }}>⚠ {highRisk} High Risk</span>}
            {medRisk  > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309', fontWeight: 700, border: '1px solid #fcd34d' }}>{medRisk} Medium</span>}
          </div>
        )}
        {plagError && <span style={{ fontSize: 12, color: '#dc2626', marginLeft: 8 }}>{plagError}</span>}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-header">
          <span className="dash-panel-title">All Exams — with Plagiarism Status</span>
        </div>
        <div className="dash-table-wrap">
          {loadingExams ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>Loading exams…</div>
          ) : exams.length === 0 ? (
            <div className="dash-empty-state"><div className="dash-empty-icon">📋</div>No exams found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Exam Name</th><th>Type</th><th>Candidates</th><th>Status</th><th>Created</th>
                  <th style={{ color: '#7c3aed' }}>Plagiarism</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, idx) => {
                  const examKey = exam.id || exam._id || String(idx);
                  const isPlagLoaded = plagExamInput === String(examKey) && totalPlag > 0;
                  return (
                    <React.Fragment key={examKey}>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{exam.name || exam.exam_name || exam.title || '—'}</td>
                        <td><span className="dash-tag">{exam.exam_type || exam.type || '—'}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e3a8a' }}>{exam.candidates ?? exam.student_count ?? 0}</td>
                        <td><StatusBadge status={exam.status || 'Draft'} /></td>
                        <td style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>
                          {exam.createdDate || exam.created_at ? new Date(exam.createdDate || exam.created_at).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td>
                          {isPlagLoaded ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {highRisk > 0 && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>{highRisk} High</span>}
                              {medRisk  > 0 && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>{medRisk} Med</span>}
                              {(totalPlag - highRisk - medRisk) > 0 && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#d9f5ec', color: '#0a8f5c', border: '1px solid #6ee7b7' }}>{totalPlag - highRisk - medRisk} Clean</span>}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#93c5fd', fontStyle: 'italic' }}>Enter exam ID above to load</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPlag > 0 && (
        <div className="dash-panel" style={{ marginTop: 20 }}>
          <div className="dash-panel-header">
            <span className="dash-panel-title">🔍 Plagiarism Results — {totalPlag} students (Exam: {plagExamInput})</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {highRisk > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>{highRisk} High Risk</span>}
              {medRisk  > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>{medRisk} Medium</span>}
            </div>
          </div>
          <div className="dash-table-wrap">
            <table>
              <thead>
                <tr><th>Student ID</th><th>Plagiarism Score</th><th>Risk Level</th><th>Matched With</th><th>Snapshots</th><th>Action</th></tr>
              </thead>
              <tbody>
                {Object.entries(plagData).map(([sid, pd]) => {
                  const risk      = PLAG_RISK(pd.score);
                  const isExpanded = expandedPlag === sid;
                  return (
                    <React.Fragment key={sid}>
                      <tr style={{ background: isExpanded ? '#f0f9ff' : 'transparent' }}>
                        <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{sid}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: '#eff6ff', borderRadius: 4, overflow: 'hidden', border: '1px solid #bfdbfe' }}>
                              <div style={{ width: `${pd.score}%`, height: '100%', background: risk.color, borderRadius: 4 }}/>
                            </div>
                            <span style={{ fontWeight: 700, color: risk.color, fontSize: 13 }}>{pd.score}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
                            {risk.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: pd.matchedWith ? '#dc2626' : '#93c5fd' }}>{pd.matchedWith || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e3a8a' }}>{pd.changeCount || 0}</td>
                        <td>
                          <button className="dash-detail-btn" onClick={() => setExpandedPlag(p => p === sid ? null : sid)}>
                            {isExpanded ? 'Close ▲' : 'Details ▼'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 16px 16px 16px', background: '#f0f9ff' }}>
                            <PlagiarismDetailPanel
                              studentId={sid}
                              examId={pd.examId}
                              score={pd.score}
                              matchedWith={pd.matchedWith}
                              changeCount={pd.changeCount}
                              onClose={() => setExpandedPlag(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const AI_VERDICT_STYLE = (verdict) => {
  if (verdict === "AI Generated") return { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
  if (verdict === "Likely AI")    return { color: "#b45309", bg: "#fef3c7", border: "#fcd34d" };
  if (verdict === "Possibly AI")  return { color: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc" };
  return                                 { color: "#0a8f5c", bg: "#d9f5ec", border: "#6ee7b7" };
};

function AIDetectionPanel() {
  const [input,    setInput]    = useState("exam_001");
  const [examId,   setExamId]   = useState("exam_001");
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState(null);

  const fetchReport = async (id) => {
    const eid = id || examId;
    setLoading(true); setError(""); setSelected(null); setDetail(null);
    try {
      const res  = await authFetch(`${API}/ai-detection/${eid}`);
      const data = await res.json();
      if (data.students) setStudents(data.students);
      else { setStudents([]); setError("No AI detection data found for this exam ID."); }
    } catch {
      setError("Could not connect to backend.");
    } finally { setLoading(false); }
  };

  const openStudent = async (s) => {
    setSelected(s);
    try {
      const res  = await authFetch(`${API}/ai-detection/${examId}/${s.student_id}`);
      const data = await res.json();
      if (data.found) setDetail(data);
    } catch { setDetail(null); }
  };

  const aiCount     = students.filter(s => s.verdict === "AI Generated").length;
  const likelyCount = students.filter(s => s.verdict === "Likely AI").length;
  const humanCount  = students.filter(s => s.verdict === "Human Written").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 6 }}>Exam ID</label>
          <input
            className="dash-plag-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setExamId(input); fetchReport(input); } }}
            placeholder="e.g. exam_001"
          />
        </div>
        <button className="dash-ai-load-btn" onClick={() => { setExamId(input); fetchReport(input); }}>
          {loading ? "Loading…" : "Load AI Report"}
        </button>
      </div>

      {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {students.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Students", value: students.length, description: "Analyzed",           accent: "blue"  },
              { label: "AI Generated",   value: aiCount,         description: "High confidence AI",  accent: "red"   },
              { label: "Likely AI",      value: likelyCount,     description: "Medium confidence",   accent: "red"   },
              { label: "Human Written",  value: humanCount,      description: "Looks genuine",        accent: "green" },
            ].map(c => <StatCard key={c.label} label={c.label} value={c.value} description={c.description} accent={c.accent} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
            <div className="dash-panel">
              <div className="dash-panel-header">
                <span className="dash-panel-title">AI Detection Results — {students.length} students</span>
              </div>
              <div className="dash-table-wrap">
                <table>
                  <thead><tr><th>Student ID</th><th>AI Score</th><th>Verdict</th><th>Confidence</th><th>Edits</th><th>Action</th></tr></thead>
                  <tbody>
                    {students.map(s => {
                      const vs = AI_VERDICT_STYLE(s.verdict);
                      return (
                        <tr key={s.student_id} style={{ background: selected?.student_id === s.student_id ? "#f0f9ff" : "transparent" }}>
                          <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{s.student_id}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: "#eff6ff", borderRadius: 4, overflow: "hidden", border: '1px solid #bfdbfe' }}>
                                <div style={{ width: `${s.ai_score}%`, height: "100%", background: vs.color, borderRadius: 4 }}/>
                              </div>
                              <span style={{ fontWeight: 700, color: vs.color, fontSize: 13 }}>{s.ai_score}%</span>
                            </div>
                          </td>
                          <td><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: vs.bg, color: vs.color, border: `1px solid ${vs.border}` }}>{s.verdict}</span></td>
                          <td style={{ fontSize: 12, color: "#60a5fa" }}>{s.confidence}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12, color: '#1e3a8a' }}>{s.change_count || 0}</td>
                          <td><button className="dash-detail-btn" onClick={() => openStudent(s)}>View Details</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {selected && detail && (
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <span className="dash-panel-title">AI Analysis — {selected.student_id}</span>
                  <button className="dash-detail-btn" onClick={() => { setSelected(null); setDetail(null); }}>✕ Close</button>
                </div>
                <div className="dash-panel-body">
                  <div style={{ background: AI_VERDICT_STYLE(detail.verdict).bg, border: `1px solid ${AI_VERDICT_STYLE(detail.verdict).border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: AI_VERDICT_STYLE(detail.verdict).color, letterSpacing: "0.5px", textTransform: "uppercase" }}>Final Verdict</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: AI_VERDICT_STYLE(detail.verdict).color, marginTop: 2 }}>{detail.verdict}</div>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: AI_VERDICT_STYLE(detail.verdict).color }}>{detail.ai_score}%</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      { label: "AST Depth",       value: detail.ast_depth },
                      { label: "Unique Variables", value: detail.unique_vars },
                      { label: "Avg Line Length",  value: `${detail.avg_line_length} chars` },
                      { label: "Comment Ratio",    value: `${detail.comment_ratio}%` },
                      { label: "Sudden Paste",     value: detail.sudden_paste ? "Yes ⚠️" : "No ✓" },
                      { label: "Perfect Syntax",   value: detail.perfect_structure ? "Yes ⚠️" : "No ✓" },
                    ].map(m => (
                      <div key={m.label} style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "8px 12px" }}>
                        <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e3a8a" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  {detail.signals?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Signals ({detail.signals.length})</div>
                      {detail.signals.map((signal, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, marginBottom: 8, fontSize: 12, color: "#92400e" }}>
                          <span>⚠️</span><span>{signal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {detail.signals?.length === 0 && (
                    <div style={{ padding: "16px", background: "#d9f5ec", border: "1px solid #6ee7b7", borderRadius: 8, fontSize: 13, color: "#0a8f5c", textAlign: "center" }}>
                      ✓ No AI signals detected
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {!loading && students.length === 0 && !error && (
        <div className="dash-panel" style={{ textAlign: "center", padding: 48, color: "#93c5fd" }}>
          Enter an exam ID above and click <strong style={{ color: '#1d4ed8' }}>Load AI Report</strong> to view results.
        </div>
      )}
    </div>
  );
}

const BAR_COLORS = ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#1e40af', '#7c3aed'];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['dashboard', 'reports', 'ai-detection'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    authFetch(`${API}/exams`)
      .then(r => {
        if (r.status === 401) throw new Error('Session expired — please log in again');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setExams(Array.isArray(data) ? data : (data.exams || []));
        setLoading(false);
      })
      .catch(err => {
        console.error('[Dashboard] exams fetch error:', err.message);
        setError(err.message || 'Could not load exams from server.');
        setLoading(false);
      });
  }, []);

  const activeExams     = exams.filter(e => e.status === 'Active' || e.status === 'active').length;
  const completedExams  = exams.filter(e => e.status === 'Completed' || e.status === 'completed').length;
  const totalCandidates = exams.reduce((a, e) => a + (Number(e.candidates) || Number(e.student_count) || 0), 0);

  const chartData = exams.map(e => ({
    name: (e.name || e.title || e.exam_name || 'Unnamed').length > 18
      ? (e.name || e.title || e.exam_name || 'Unnamed').substring(0, 18) + '…'
      : (e.name || e.title || e.exam_name || 'Unnamed'),
    candidates: Number(e.candidates) || Number(e.student_count) || 0,
  }));

  const handleNavClick = (tabId) => {
    navigate(`/admin-dashboard?tab=${tabId}`, { replace: true });
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f7ff' }}>
      <style>{dashStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        {activeTab === "dashboard" && (
          <div>
            <div className="dash-page-header">
              <div>
                <h1>Dashboard</h1>
                <p>Overview of your assessment platform activity</p>
              </div>
              <button className="dash-btn-primary" onClick={() => navigate('/create-exam')}>+ New Exam</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              <StatCard label="Total Exams"            value={exams.length}     description="All time created"      accent="blue"  />
              <StatCard label="Active Exams"           value={activeExams}      description="Currently running"     accent="green" />
              <StatCard label="Registered Candidates"  value={totalCandidates}  description="Across all exams"      accent="blue"  />
              <StatCard label="Completed Exams"        value={completedExams}   description="Successfully finished" accent="green" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { id: "reports",      label: "Reports + Plagiarism",   desc: "View all exams with plagiarism scores per student",     color: "#7c3aed", bg: "#f5f3ff", border: "#e9d5ff" },
                { id: "ai-detection", label: "AI Code Detection",      desc: "Detect ChatGPT/Copilot generated submissions",          color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
              ].map(card => (
                <div key={card.id} onClick={() => handleNavClick(card.id)}
                  className="dash-nav-card"
                  style={{ background: card.bg, borderColor: card.border }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: card.color }}>{card.label}</div>
                    <div style={{ fontSize: 12, color: '#60a5fa', marginTop: 4 }}>{card.desc}</div>
                  </div>
                  <span style={{ fontSize: 18, color: card.color }}>→</span>
                </div>
              ))}
            </div>

            <div className="dash-panel" style={{ marginBottom: 20 }}>
              <div className="dash-panel-header">
                <span className="dash-panel-title">Recent Exams</span>
                <button className="dash-btn-secondary" onClick={() => navigate('/create-exam')}>+ Create Exam</button>
              </div>
              <div className="dash-table-wrap">
                {loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>Loading exams…</div>
                ) : error ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626', fontSize: 13 }}>
                    {error}
                    {error.includes('log in') && (
                      <div style={{ marginTop: 12 }}>
                        <button className="dash-btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
                      </div>
                    )}
                  </div>
                ) : exams.length === 0 ? (
                  <div className="dash-empty-state">
                    <div className="dash-empty-icon">📋</div>
                    No exams created yet.{' '}
                    <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/create-exam')}>Create your first exam</span>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>Exam Name</th><th>Type</th><th>Category</th><th>Candidates</th><th>Status</th><th>Created Date</th></tr></thead>
                    <tbody>
                      {exams.slice(0, 10).map((exam, idx) => (
                        <tr key={exam.id || exam._id || idx}>
                          <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{exam.name || exam.title || exam.exam_name || '—'}</td>
                          <td><span className="dash-tag">{exam.exam_type || exam.type || '—'}</span></td>
                          <td style={{ color: '#60a5fa' }}>{exam.category || exam.skill || exam.purpose || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e3a8a' }}>{exam.candidates ?? exam.student_count ?? 0}</td>
                          <td><StatusBadge status={exam.status || 'Draft'} /></td>
                          <td style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>
                            {exam.createdDate || exam.created_at ? new Date(exam.createdDate || exam.created_at).toLocaleDateString('en-GB') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">
                <span className="dash-panel-title">Exam Participation</span>
                <span style={{ fontSize: 12, color: '#60a5fa' }}>Candidates per exam</span>
              </div>
              <div className="dash-panel-body">
                {loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>Loading chart…</div>
                ) : chartData.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>No exam data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: chartData.length > 4 ? 48 : 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#93c5fd' }} axisLine={false} tickLine={false} angle={chartData.length > 4 ? -35 : 0} textAnchor={chartData.length > 4 ? 'end' : 'middle'} interval={0} />
                      <YAxis tick={{ fontSize: 12, fill: '#93c5fd' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                      <Bar dataKey="candidates" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <div className="dash-page-header">
              <div>
                <h1>Reports</h1>
                <p>All exams with plagiarism scores — load an exam ID to see per-student plagiarism data</p>
              </div>
            </div>
            <ReportsTab />
          </div>
        )}

        {activeTab === "ai-detection" && (
          <div>
            <div className="dash-page-header">
              <div>
                <h1>AI Code Detection</h1>
                <p>AST-based analysis to detect ChatGPT / Copilot generated code — students are never notified</p>
              </div>
            </div>
            <AIDetectionPanel />
          </div>
        )}

      </main>
      <ToastContainer />
    </div>
  );
}