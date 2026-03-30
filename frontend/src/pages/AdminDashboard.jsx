import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const API = 'http://localhost:5000/api';

function StatusBadge({ status }) {
  const map = {
    Active:    'badge badge-green',
    Completed: 'badge badge-blue',
    Draft:     'badge badge-gray',
    Scheduled: 'badge badge-yellow',
  };
  return <span className={map[status] || 'badge badge-gray'}>{status}</span>;
}

// Custom tooltip for the bar chart
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8,
        padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#2563eb', margin: 0 }}>
          {payload[0].value} candidate{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch(`${API}/exams`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setExams(Array.isArray(data) ? data : (data.exams || []));
        setLoading(false);
      })
      .catch(err => {
        setError('Could not load exams from server.');
        setLoading(false);
      });
  }, []);

  const activeExams    = exams.filter(e => e.status === 'Active').length;
  const completedExams = exams.filter(e => e.status === 'Completed').length;
  const totalCandidates = exams.reduce((a, e) => a + (Number(e.candidates) || 0), 0);

  // Per-exam participation chart data
  // Truncate long names for readability on X-axis
  const chartData = exams.map(e => ({
    name: (e.name || e.exam_name || 'Unnamed').length > 18
      ? (e.name || e.exam_name || 'Unnamed').substring(0, 18) + '…'
      : (e.name || e.exam_name || 'Unnamed'),
    fullName:   e.name || e.exam_name || 'Unnamed',
    candidates: Number(e.candidates) || 0,
  }));

  // Bar colours cycle through a palette
  const BAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626'];

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />

      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Dashboard</h1>
            <p>Overview of your assessment platform activity</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/create-exam')}>
            + New Exam
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stat-cards-grid">
          <StatCard label="Total Exams"            value={exams.length}     description="All time created"     accent="blue"  />
          <StatCard label="Active Exams"           value={activeExams}      description="Currently running"    accent="green" />
          <StatCard label="Registered Candidates"  value={totalCandidates}  description="Across all exams"     accent="blue"  />
          <StatCard label="Completed Exams"        value={completedExams}   description="Successfully finished" accent="green" />
          <StatCard label="Proctoring Alerts"      value="—"                description="Live from DB"         accent="red"   />
        </div>

        {/* ── Recent Exams Table ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title">Recent Exams</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/create-exam')}>
              + Create Exam
            </button>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Loading exams…
              </div>
            ) : error ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-danger)', fontSize: 13 }}>
                {error}
              </div>
            ) : exams.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                No exams created yet.{' '}
                <span
                  style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => navigate('/create-exam')}
                >
                  Create your first exam
                </span>
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
                      <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                        {exam.name || exam.exam_name || '—'}
                      </td>
                      <td>
                        <span className="tag">
                          {exam.type || exam.exam_type || '—'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {/* skill / placement / certification / university */}
                        {exam.category || exam.skill || exam.purpose || '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {exam.candidates ?? 0}
                      </td>
                      <td>
                        <StatusBadge status={exam.status || 'Draft'} />
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
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

        {/* ── Per-Exam Participation Chart ── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Exam Participation — Per Exam</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Candidates registered per exam
            </span>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Loading chart…
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No exam data to display.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 20, left: 0, bottom: chartData.length > 4 ? 48 : 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    angle={chartData.length > 4 ? -35 : 0}
                    textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    label={{ value: 'Candidates', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#aaa' } }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
                  <Bar dataKey="candidates" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
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