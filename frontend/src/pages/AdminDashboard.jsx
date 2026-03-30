import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const chartData = [
  { name: 'Jan', candidates: 45 },
  { name: 'Feb', candidates: 78 },
  { name: 'Mar', candidates: 62 },
  { name: 'Apr', candidates: 110 },
  { name: 'May', candidates: 95 },
  { name: 'Jun', candidates: 130 },
  { name: 'Jul', candidates: 88 },
];

function StatusBadge({ status }) {
  const map = {
    Active: 'badge badge-green',
    Completed: 'badge badge-blue',
    Draft: 'badge badge-gray',
    Scheduled: 'badge badge-yellow',
  };
  return <span className={map[status] || 'badge badge-gray'}>{status}</span>;
}

export default function Dashboard() {
  const { exams } = useApp();
  const navigate = useNavigate();

  const activeExams = exams.filter(e => e.status === 'Active').length;
  const completedExams = exams.filter(e => e.status === 'Completed').length;
  const totalCandidates = exams.reduce((a, e) => a + e.candidates, 0);

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Dashboard</h1>
                <p>Overview of your assessment platform activity</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/create-exam')}>
                + New Exam
              </button>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards-grid">
              <StatCard label="Total Exams" value={exams.length} description="All time created" accent="blue" />
              <StatCard label="Active Exams" value={activeExams} description="Currently running" accent="green" />
              <StatCard label="Registered Candidates" value={totalCandidates} description="Across all exams" accent="blue" />
              <StatCard label="Completed Exams" value={completedExams} description="Successfully finished" accent="green" />
              <StatCard label="Proctoring Alerts" value="14" description="Last 24 hours" accent="red" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Recent Exams Table */}
              <div className="panel" style={{ gridColumn: '1 / -1' }}>
                <div className="panel-header">
                  <span className="panel-title">Recent Exams</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/create-exam')}>
                    + Create Exam
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Exam Name</th>
                        <th>Type</th>
                        <th>Organization</th>
                        <th>Candidates</th>
                        <th>Status</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.slice(0, 8).map(exam => (
                        <tr key={exam.id}>
                          <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{exam.name}</td>
                          <td><span className="tag">{exam.type}</span></td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{exam.org}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{exam.candidates}</td>
                          <td><StatusBadge status={exam.status} /></td>
                          <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{exam.createdDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chart */}
              <div className="panel" style={{ gridColumn: '1 / -1' }}>
                <div className="panel-header">
                  <span className="panel-title">Exam Participation — Monthly</span>
                </div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5', borderRadius: 6, boxShadow: 'none' }}
                        cursor={{ fill: '#f5f5f5' }}
                      />
                      <Bar dataKey="candidates" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    );
  }
