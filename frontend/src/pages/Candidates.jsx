import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const mockCandidates = [
  { id: 1, name: 'Priya Sharma', email: 'priya.sharma@gmail.com', exam: 'Java Backend Assessment', status: 'Completed', risk: false },
  { id: 2, name: 'Rahul Verma', email: 'rahul.v@outlook.com', exam: 'Python Data Science Test', status: 'Flagged', risk: true },
  { id: 3, name: 'Anjali Nair', email: 'anjali.n@yahoo.com', exam: 'SQL Database Fundamentals', status: 'Started', risk: false },
  { id: 4, name: 'Karan Mehta', email: 'karan.m@company.com', exam: 'Full Stack Developer Cert', status: 'Registered', risk: false },
  { id: 5, name: 'Sneha Reddy', email: 'sneha.r@gmail.com', exam: 'Java Backend Assessment', status: 'Completed', risk: false },
  { id: 6, name: 'Anil Kumar', email: 'anil.k@techmail.in', exam: 'C++ Systems Programming', status: 'Flagged', risk: true },
  { id: 7, name: 'Divya Pillai', email: 'divya.p@infosys.com', exam: 'Python Data Science Test', status: 'Completed', risk: false },
  { id: 8, name: 'Suresh Babu', email: 'suresh.b@wipro.com', exam: 'SQL Database Fundamentals', status: 'Started', risk: false },
  { id: 9, name: 'Meena Iyer', email: 'meena.i@tcs.com', exam: 'Java Backend Assessment', status: 'Registered', risk: false },
  { id: 10, name: 'Vikram Singh', email: 'vikram.s@hcl.com', exam: 'Full Stack Developer Cert', status: 'Flagged', risk: true },
];

function StatusBadge({ status }) {
  const map = {
    Registered: 'badge badge-gray',
    Started: 'badge badge-blue',
    Completed: 'badge badge-green',
    Flagged: 'badge badge-red',
  };
  return <span className={map[status] || 'badge badge-gray'}>{status}</span>;
}

export default function Candidates() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = mockCandidates.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.exam.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: mockCandidates.length,
    flagged: mockCandidates.filter(c => c.status === 'Flagged').length,
    completed: mockCandidates.filter(c => c.status === 'Completed').length,
    active: mockCandidates.filter(c => c.status === 'Started').length,
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Candidates</h1>
          <p>Manage and track all registered candidates</p>
        </div>
        <button className="btn btn-primary">+ Add Candidate</button>
      </div>

      {/* Summary */}
      <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-card-accent">
          <div className="stat-card-label">Total Candidates</div>
          <div className="stat-card-value">{counts.total}</div>
        </div>
        <div className="stat-card stat-card-accent-green">
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value">{counts.completed}</div>
        </div>
        <div className="stat-card stat-card-accent">
          <div className="stat-card-label">Currently Active</div>
          <div className="stat-card-value">{counts.active}</div>
        </div>
        <div className="stat-card stat-card-accent-red">
          <div className="stat-card-label">Flagged</div>
          <div className="stat-card-value">{counts.flagged}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <span className="panel-title">All Candidates ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <div className="search-bar">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Search by name, email, exam..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option>Registered</option>
              <option>Started</option>
              <option>Completed</option>
              <option>Flagged</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned Exam</th>
                <th>Status</th>
                <th>Risk Flag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      No candidates found.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: c.risk ? '#fee2e2' : 'var(--color-primary-light)',
                          color: c.risk ? 'var(--color-danger)' : 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, flexShrink: 0
                        }}>
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{c.email}</td>
                    <td style={{ fontSize: 13 }}>{c.exam}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.risk
                        ? <span style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 500 }}>⚠ High Risk</span>
                        : <span style={{ color: 'var(--color-success)', fontSize: 13 }}>✓ Clear</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm">View</button>
                        <button className="btn btn-secondary btn-sm">Message</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
