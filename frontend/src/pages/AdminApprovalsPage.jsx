// AdminApprovalsPage.jsx — Blue theme matching login page
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const approvalStyles = `
  .ap-filter-btn {
    padding: 7px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1.5px solid #e5e7eb;
    background: #fff;
    color: #6b7280;
  }
  .ap-filter-btn:hover {
    border-color: #93c5fd;
    background: #eff6ff;
    color: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(37,99,235,0.1);
  }
  .ap-filter-btn.active-pending  { border-color: #f59e0b; background: #fffbeb; color: #b45309; }
  .ap-filter-btn.active-approved { border-color: #10b981; background: #ecfdf5; color: #065f46; }
  .ap-filter-btn.active-rejected { border-color: #6b7280; background: #f9fafb; color: #374151; }
  .ap-filter-btn.active-all      { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
  .ap-panel {
    background: #fff;
    border: 1px solid #dbeafe;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(37,99,235,0.06);
  }
  .ap-panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eff6ff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(to right, #f0f9ff, #fff);
  }
  .ap-panel-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .ap-table-wrap {
    overflow-x: auto;
  }
  .ap-table-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .ap-table-wrap thead tr {
    background: #f0f9ff;
    border-bottom: 1.5px solid #dbeafe;
  }
  .ap-table-wrap th {
    padding: 11px 16px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .ap-table-wrap tbody tr {
    border-bottom: 1px solid #f0f9ff;
    transition: background 0.15s ease;
  }
  .ap-table-wrap tbody tr:hover {
    background: #f0f9ff;
  }
  .ap-table-wrap td {
    padding: 12px 16px;
    vertical-align: middle;
  }
  .ap-badge-yellow  { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
  .ap-badge-green   { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
  .ap-badge-gray    { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f9fafb; color: #374151; border: 1px solid #d1d5db; }
  .ap-tag           { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .ap-btn-primary {
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .ap-btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.3);
  }
  .ap-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .ap-btn-secondary {
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    background: #fff;
    color: #ef4444;
    border: 1.5px solid #fca5a5;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .ap-btn-secondary:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #ef4444;
    transform: translateY(-1px);
  }
  .ap-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
  .ap-refresh-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    cursor: pointer;
    transition: all 0.18s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ap-refresh-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.12);
  }
  .ap-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .ap-page-header h1 {
    font-size: 22px;
    font-weight: 800;
    color: #1e3a8a;
    margin: 0 0 4px;
  }
  .ap-page-header p {
    font-size: 13px;
    color: #60a5fa;
    margin: 0;
  }
  .ap-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: apFadeIn 0.15s ease;
  }
  .ap-modal {
    background: #fff;
    border-radius: 16px;
    padding: 28px;
    width: 420px;
    box-shadow: 0 24px 64px rgba(37,99,235,0.18);
    border: 1px solid #dbeafe;
    animation: apSlideUp 0.18s ease;
  }
  .ap-modal h3 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #1e3a8a; }
  .ap-modal p  { margin: 0 0 16px; font-size: 13px; color: #64748b; }
  .ap-modal textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1.5px solid #dbeafe;
    font-size: 13px;
    resize: none;
    font-family: inherit;
    outline: none;
    margin-bottom: 16px;
    box-sizing: border-box;
    transition: border-color 0.15s;
    color: #1e3a8a;
  }
  .ap-modal textarea:focus { border-color: #3b82f6; }
  .ap-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .ap-modal-cancel {
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ap-modal-cancel:hover { background: #dbeafe; }
  .ap-modal-confirm {
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    background: #ef4444;
    border: none;
    color: #fff;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ap-modal-confirm:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
  .ap-modal-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  @keyframes apFadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes apSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
`;

function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pending',  cls: 'ap-badge-yellow' },
    approved: { label: 'Approved', cls: 'ap-badge-green'  },
    rejected: { label: 'Rejected', cls: 'ap-badge-gray'   },
  };
  const s = map[status] || map.pending;
  return <span className={s.cls}>{s.label}</span>;
}

export default function AdminApprovalsPage() {
  const { showToast } = useApp();

  const [signups,    setSignups]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('pending');
  const [actionLoad, setActionLoad] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const adminId = localStorage.getItem('user_id') || 1;
  const token   = localStorage.getItem('token');

  const fetchSignups = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/admin/signups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSignups(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load signups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignups(); }, []);

  const handleApprove = async (id, email) => {
    setActionLoad(id);
    try {
      const res  = await fetch(`${API}/api/auth/admin/approve-recruiter`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ signup_id: id, admin_id: adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✓ ${email} approved as recruiter`, 'success');
      fetchSignups();
    } catch (e) {
      showToast(e.message || 'Approval failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoad(rejectModal.id);
    try {
      const res  = await fetch(`${API}/api/auth/admin/reject-recruiter`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ signup_id: rejectModal.id, admin_id: adminId, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Rejected ${rejectModal.email}`, 'info');
      setRejectModal(null);
      setRejectReason('');
      fetchSignups();
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  const filtered = filter === 'all' ? signups : signups.filter(s => s.status === filter);
  const counts = {
    pending:  signups.filter(s => s.status === 'pending').length,
    approved: signups.filter(s => s.status === 'approved').length,
    rejected: signups.filter(s => s.status === 'rejected').length,
  };

  const filterConfig = [
    { key: 'pending',  label: 'Pending',  activeClass: 'active-pending'  },
    { key: 'approved', label: 'Approved', activeClass: 'active-approved' },
    { key: 'rejected', label: 'Rejected', activeClass: 'active-rejected' },
    { key: 'all',      label: 'All',      activeClass: 'active-all'      },
  ];

  const countColors = {
    pending:  { bg: '#f59e0b', text: '#fff' },
    approved: { bg: '#10b981', text: '#fff' },
    rejected: { bg: '#6b7280', text: '#fff' },
    all:      { bg: '#2563eb', text: '#fff' },
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f7ff' }}>
      <style>{approvalStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        <div className="ap-page-header">
          <div>
            <h1>Recruiter Approvals</h1>
            <p>Review and approve recruiter signup requests</p>
          </div>
          <button className="ap-refresh-btn" onClick={fetchSignups}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {filterConfig.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`ap-filter-btn${filter === f.key ? ' ' + f.activeClass : ''}`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{
                  background: filter === f.key ? countColors[f.key].bg : '#e5e7eb',
                  color: filter === f.key ? countColors[f.key].text : '#6b7280',
                  borderRadius: 20,
                  padding: '0px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {counts[f.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table panel */}
        <div className="ap-panel">
          <div className="ap-panel-header">
            <span className="ap-panel-title">
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Signup Requests
            </span>
            <span style={{ fontSize: 12, color: '#60a5fa' }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#93c5fd', fontSize: 14 }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#93c5fd', fontSize: 14 }}>
              {filter === 'pending' ? '🎉 No pending requests!' : 'No requests found.'}
            </div>
          ) : (
            <div className="ap-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Applied On</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>
                        {i + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e3a8a' }}>
                        {s.full_name || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#60a5fa' }}>
                        {s.email}
                      </td>
                      <td>
                        <span className="ap-tag">{s.company_name || '—'}</span>
                      </td>
                      <td style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>
                        {s.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="ap-btn-primary"
                              disabled={actionLoad === s.id}
                              onClick={() => handleApprove(s.id, s.email)}
                            >
                              {actionLoad === s.id ? '...' : '✓ Approve'}
                            </button>
                            <button
                              className="ap-btn-secondary"
                              disabled={actionLoad === s.id}
                              onClick={() => { setRejectModal({ id: s.id, email: s.email }); setRejectReason(''); }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : s.status === 'rejected' && s.reject_reason ? (
                          <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                            {s.reject_reason}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                            Approved ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="ap-modal-overlay">
          <div className="ap-modal">
            <h3>Reject Signup</h3>
            <p>Rejecting <strong>{rejectModal.email}</strong>. Optionally add a reason.</p>
            <textarea
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="ap-modal-actions">
              <button className="ap-modal-cancel" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="ap-modal-confirm"
                onClick={handleReject}
                disabled={actionLoad === rejectModal.id}
              >
                {actionLoad === rejectModal.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}