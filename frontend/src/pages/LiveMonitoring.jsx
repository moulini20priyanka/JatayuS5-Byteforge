import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const initialAlerts = [
  { id: 1, candidate: 'Rahul Verma', exam: 'Python Data Science Test', status: 'In Progress', alert: 'Tab Switch Detected', risk: 'High', time: '10:34 AM', count: 3 },
  { id: 2, candidate: 'Anil Kumar', exam: 'C++ Systems Programming', status: 'In Progress', alert: 'Multiple Faces Detected', risk: 'High', time: '10:41 AM', count: 1 },
  { id: 3, candidate: 'Anjali Nair', exam: 'SQL Database Fundamentals', status: 'In Progress', alert: 'No Alert', risk: 'Low', time: '10:20 AM', count: 0 },
  { id: 4, candidate: 'Vikram Singh', exam: 'Full Stack Developer Cert', status: 'In Progress', alert: 'Mobile Phone Detected', risk: 'High', time: '10:55 AM', count: 2 },
  { id: 5, candidate: 'Suresh Babu', exam: 'SQL Database Fundamentals', status: 'In Progress', alert: 'No Face Detected', risk: 'Medium', time: '11:02 AM', count: 1 },
  { id: 6, candidate: 'Sneha Reddy', exam: 'Java Backend Assessment', status: 'In Progress', alert: 'No Alert', risk: 'Low', time: '10:15 AM', count: 0 },
  { id: 7, candidate: 'Karan Mehta', exam: 'Full Stack Developer Cert', status: 'In Progress', alert: 'Tab Switch Detected', risk: 'Medium', time: '10:48 AM', count: 1 },
];

function RiskBadge({ risk }) {
  const cls = risk === 'High' ? 'risk-high' : risk === 'Medium' ? 'risk-medium' : 'risk-low';
  const icon = risk === 'High' ? '🔴' : risk === 'Medium' ? '🟡' : '🟢';
  return <span className={cls}>{icon} {risk}</span>;
}

function AlertBadge({ alert }) {
  if (alert === 'No Alert') return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>;
  const iconMap = {
    'Tab Switch Detected': '🖥️',
    'Multiple Faces Detected': '👥',
    'No Face Detected': '😶',
    'Mobile Phone Detected': '📱',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-danger)', fontWeight: 500 }}>
      {iconMap[alert] || '⚠️'} {alert}
    </span>
  );
}

export default function LiveMonitoring() {
  const [alerts] = useState(initialAlerts);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filterRisk, setFilterRisk] = useState('All');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filterRisk === 'All' ? alerts : alerts.filter(a => a.risk === filterRisk);
  const highCount = alerts.filter(a => a.risk === 'High').length;
  const medCount = alerts.filter(a => a.risk === 'Medium').length;
  const activeCount = alerts.filter(a => a.status === 'In Progress').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Live Monitoring</h1>
          <p>Real-time proctoring alerts and candidate activity</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 6, fontSize: 12, color: '#16a34a', fontWeight: 500
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
              display: 'inline-block',
              animation: pulse ? 'pulse-anim 0.6s ease' : 'live-pulse 2s infinite',
            }} />
            LIVE
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-card-accent">
          <div className="stat-card-label">Active Candidates</div>
          <div className="stat-card-value">{activeCount}</div>
          <div className="stat-card-desc">Currently taking exam</div>
        </div>
        <div className="stat-card stat-card-accent-red">
          <div className="stat-card-label">High Risk</div>
          <div className="stat-card-value">{highCount}</div>
          <div className="stat-card-desc">Needs immediate review</div>
        </div>
        <div className="stat-card stat-card-accent-yellow">
          <div className="stat-card-label">Medium Risk</div>
          <div className="stat-card-value">{medCount}</div>
          <div className="stat-card-desc">Monitor closely</div>
        </div>
        <div className="stat-card stat-card-accent-green">
          <div className="stat-card-label">Low Risk</div>
          <div className="stat-card-value">{alerts.filter(a => a.risk === 'Low').length}</div>
          <div className="stat-card-desc">No issues detected</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Proctoring Alerts</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
              <option value="All">All Risk Levels</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="btn btn-secondary btn-sm">Export Alerts</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Alert</th>
                <th>Count</th>
                <th>Risk Score</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} style={row.risk === 'High' ? { background: '#fff5f5' } : {}}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: row.risk === 'High' ? '#fee2e2' : row.risk === 'Medium' ? '#fffbeb' : '#f0fdf4',
                        color: row.risk === 'High' ? '#dc2626' : row.risk === 'Medium' ? '#d97706' : '#16a34a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, flexShrink: 0
                      }}>
                        {row.candidate.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 500 }}>{row.candidate}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{row.exam}</td>
                  <td><span className="badge badge-blue">{row.status}</span></td>
                  <td><AlertBadge alert={row.alert} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {row.count > 0 ? <strong style={{ color: 'var(--color-danger)' }}>×{row.count}</strong> : '—'}
                  </td>
                  <td><RiskBadge risk={row.risk} /></td>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.time}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm">Review</button>
                      {row.risk === 'High' && (
                        <button className="btn btn-danger btn-sm">Terminate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse-anim {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
      `}</style>
          </div>
        </main>
        <ToastContainer />
      </div>
    );
  }
