// AdminDashboard.jsx — Blue theme matching login page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  .dash-badge-green  { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
  .dash-badge-blue   { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
  .dash-badge-gray   { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f9fafb; color: #374151; border: 1px solid #d1d5db; }
  .dash-badge-yellow { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
  .dash-empty-state  { padding: 48px; text-align: center; color: #93c5fd; font-size: 14px; }
  .dash-empty-icon   { font-size: 32px; margin-bottom: 10px; }
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

const BAR_COLORS = ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#1e40af', '#7c3aed'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams,   setExams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

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

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f7ff' }}>
      <style>{dashStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        <div className="dash-page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Overview of your assessment platform activity</p>
          </div>
          <button className="dash-btn-primary" onClick={() => navigate('/create-exam')}>+ New Exam</button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard label="Total Exams"           value={exams.length}     description="All time created"      accent="blue"  />
          <StatCard label="Active Exams"          value={activeExams}      description="Currently running"     accent="green" />
          <StatCard label="Registered Candidates" value={totalCandidates}  description="Across all exams"      accent="blue"  />
          <StatCard label="Completed Exams"       value={completedExams}   description="Successfully finished" accent="green" />
        </div>

        {/* Quick Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            {
              path:   '/ai-detection',
              label:  'AI Code Detection',
              desc:   'Detect ChatGPT / Copilot generated submissions with AST-based analysis',
              color:  '#1d4ed8',
              bg:     '#eff6ff',
              border: '#bfdbfe',
            },
            {
              path:   '/live-monitoring',
              label:  'Live Monitoring',
              desc:   'Watch ongoing exams and candidate activity in real time',
              color:  '#0369a1',
              bg:     '#f0f9ff',
              border: '#bae6fd',
            },
          ].map(card => (
            <div key={card.path} onClick={() => navigate(card.path)}
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

        {/* Recent Exams Table */}
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
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Candidates</th>
                    <th>Status</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.slice(0, 10).map((exam, idx) => (
                    <tr key={exam.id || exam._id || idx}>
                      <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{exam.name || exam.title || exam.exam_name || '—'}</td>
                      <td><span className="dash-tag">{exam.exam_type || exam.type || '—'}</span></td>
                      <td style={{ color: '#60a5fa' }}>{exam.category || exam.skill || exam.purpose || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e3a8a' }}>{exam.candidates ?? exam.student_count ?? 0}</td>
                      <td><StatusBadge status={exam.status || 'Draft'} /></td>
                      <td style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>
                        {exam.createdDate || exam.created_at
                          ? new Date(exam.createdDate || exam.created_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Exam Participation Chart */}
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
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#93c5fd' }} axisLine={false} tickLine={false}
                    angle={chartData.length > 4 ? -35 : 0}
                    textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                    interval={0}
                  />
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

      </main>
      <ToastContainer />
    </div>
  );
}