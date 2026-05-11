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

// ── Design tokens — Blue/White professional ───────────────────────────────────
const T = {
  primary:   '#1e3a8a',
  accent:    '#2563eb',
  accentLt:  '#eff6ff',
  accentBd:  '#bfdbfe',
  text:      '#1e293b',
  text2:     '#475569',
  text3:     '#94a3b8',
  border:    '#e2e8f0',
  bg:        '#f0f7ff',
  white:     '#ffffff',
  green:     '#059669',
  greenBg:   '#ecfdf5',
  greenBd:   '#6ee7b7',
  red:       '#dc2626',
  redBg:     '#fef2f2',
  redBd:     '#fca5a5',
};

const dashStyles = `
  /* Keep your existing styles here */
`;

function StatusBadge({ status }) {
  const badgeStyle = (st) => {
    const lowerSt = (st || '').toLowerCase();
    if (lowerSt === 'active') return { bg: T.greenBg, color: T.green, bd: T.greenBd };
    if (lowerSt === 'completed') return { bg: '#dbeafe', color: '#1d4ed8', bd: T.accentBd };
    if (lowerSt === 'draft') return { bg: '#f8fafc', color: T.text3, bd: T.border };
    if (lowerSt === 'scheduled') return { bg: '#fef3c7', color: '#92400e', bd: '#fcd34d' };
    return { bg: '#f8fafc', color: T.text3, bd: T.border };
  };
  const style = badgeStyle(status);
  const display = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.bd}`,
    }}>
      {display}
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: T.white,
        border: `1px solid ${T.accentBd}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 16px rgba(37,99,235,0.12)',
      }}>
        <p style={{ fontWeight: 700, color: T.primary, marginBottom: 4 }}>{label}</p>
        <p style={{ color: T.accent, margin: 0 }}>{payload[0].value} candidate{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
}

const BAR_COLORS = ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#1e40af', '#7c3aed'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const activeExams = exams.filter(e => e.status === 'Active' || e.status === 'active').length;
  const completedExams = exams.filter(e => e.status === 'Completed' || e.status === 'completed').length;
  const totalCandidates = exams.reduce(
    (a, e) => a + (Number(e.candidates) || Number(e.student_count) || 0),
    0
  );

  const chartData = exams.map(e => ({
    name:
      (e.name || e.title || e.exam_name || 'Unnamed').length > 18
        ? (e.name || e.title || e.exam_name || 'Unnamed').substring(0, 18) + '…'
        : e.name || e.title || e.exam_name || 'Unnamed',
    candidates: Number(e.candidates) || Number(e.student_count) || 0,
  }));

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg }}>
      <style>{dashStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: T.primary, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: '13px', color: T.accent, margin: 0 }}>Overview of your assessment platform activity</p>
          </div>
          <button
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${T.accent}, #1d4ed8)`,
              color: T.white,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.18s ease',
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#3b82f6';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 18px rgba(37,99,235,0.35)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = `linear-gradient(135deg, ${T.accent}, #1d4ed8)`;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
            onClick={() => navigate('/create-exam')}
          >
            + New Exam
          </button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard label="Total Exams" value={exams.length} description="All time created" accent="blue" />
          <StatCard label="Active Exams" value={activeExams} description="Currently running" accent="green" />
          <StatCard label="Registered Candidates" value={totalCandidates} description="Across all exams" accent="blue" />
          <StatCard label="Completed Exams" value={completedExams} description="Successfully finished" accent="green" />
        </div>

        {/* Quick Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            {
              path: '/ai-detection',
              label: 'AI Code Detection',
              desc: 'Detect ChatGPT / Copilot generated submissions with AST-based analysis',
              color: '#1d4ed8',
              bg: T.accentLt,
              border: T.accentBd,
            },
            {
              path: '/live-monitoring',
              label: 'Live Monitoring',
              desc: 'Watch ongoing exams and candidate activity in real time',
              color: '#0369a1',
              bg: '#f0f9ff',
              border: '#bae6fd',
            },
          ].map((card) => (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              style={{
                background: card.bg,
                border: `1.5px solid ${card.border}`,
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.18s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: card.color }}>{card.label}</div>
                <div style={{ fontSize: 12, color: T.accent, marginTop: 4 }}>{card.desc}</div>
              </div>
              <span style={{ fontSize: 18, color: card.color }}>→</span>
            </div>
          ))}
        </div>

        {/* Recent Exams Table */}
        <div style={{ marginBottom: 20, background: T.white, border: `1px solid ${T.accentBd}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(37,99,235,0.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.accentLt}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, #f0f9ff, #fff)' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: T.primary }}>Recent Exams</span>
            <button style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: T.accentLt, color: '#1d4ed8', border: `1px solid ${T.accentBd}`, cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
              onMouseOver={(e) => {
                e.target.style.background = T.accentBd;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = T.accentLt;
                e.target.style.transform = 'translateY(0)';
              }}
              onClick={() => navigate('/create-exam')}>
              + Create Exam
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: T.text3, fontSize: 13 }}>Loading exams…</div>
            ) : error ? (
              <div style={{ padding: '32px', textAlign: 'center', color: T.red, fontSize: 13 }}>
                {error}
                {error.includes('log in') && (
                  <div style={{ marginTop: 12 }}>
                    <button style={{
                      padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                      background: `linear-gradient(135deg, ${T.accent}, #1d4ed8)`, color: T.white, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }} onClick={() => navigate('/login')}>
                      Go to Login
                    </button>
                  </div>
                )}
              </div>
            ) : exams.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: T.text3, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                No exams created yet.{' '}
                <span style={{ color: T.accent, cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/create-exam')}>Create your first exam</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.accentLt, borderBottom: `1.5px solid ${T.accentBd}` }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Exam Name</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Type</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Category</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Candidates</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Status</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.slice(0, 10).map((exam, idx) => (
                    <tr key={exam.id || exam._id || idx} style={{ borderBottom: `1px solid ${T.accentLt}`, transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.accentLt}
                      onMouseLeave={(e) => e.currentTarget.style.background = T.white}>
                      <td style={{ fontWeight: 600, color: T.primary, padding: '12px 16px' }}>
                        {exam.name || exam.title || exam.exam_name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '700',
                          background: T.accentLt,
                          color: T.accent,
                          border: `1px solid ${T.accentBd}`
                        }}>
                          {exam.exam_type || exam.type || '—'}
                        </span>
                      </td>
                      <td style={{ color: T.accent, padding: '12px 16px' }}>{exam.category || exam.skill || exam.purpose || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13, color: T.primary, padding: '12px 16px', fontWeight: 700 }}>
                        {exam.candidates ?? exam.student_count ?? 0}
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={exam.status || 'Draft'} /></td>
                      <td style={{ color: T.text3, fontFamily: 'monospace', fontSize: 12, padding: '12px 16px' }}>
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
        <div style={{ background: T.white, border: `1px solid ${T.accentBd}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.accentLt}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, #f0f9ff, #fff)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.primary }}>Exam Participation</span>
            <span style={{ fontSize: 12, color: T.accent }}>Candidates per exam</span>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: T.text3, fontSize: 13 }}>Loading chart…</div>
            ) : chartData.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: T.text3, fontSize: 13 }}>No exam data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: chartData.length > 4 ? 48 : 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.accentBd} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: T.text3 }}
                    axisLine={false}
                    tickLine={false}
                    angle={chartData.length > 4 ? -35 : 0}
                    textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12, fill: T.text3 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: T.accentLt }} />
                  <Bar dataKey="candidates" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#1e40af', '#7c3aed'][i % 6]} />)}
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