import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pending',  cls: 'badge badge-yellow' },
    approved: { label: 'Approved', cls: 'badge badge-green'  },
    rejected: { label: 'Rejected', cls: 'badge badge-gray'   },
  };
  const s = map[status] || map.pending;
  return <span className={s.cls}>{s.label}</span>;
}

export default function AdminApprovalsPage() {
  const { showToast } = useApp();

  const [signups,    setSignups]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('pending'); // pending | approved | rejected | all
  const [actionLoad, setActionLoad] = useState(null);     // id of row being actioned
  const [rejectModal, setRejectModal] = useState(null);   // { id, email } or null
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

  const filtered = filter === 'all'
    ? signups
    : signups.filter(s => s.status === filter);

  const counts = {
    pending:  signups.filter(s => s.status === 'pending').length,
    approved: signups.filter(s => s.status === 'approved').length,
    rejected: signups.filter(s => s.status === 'rejected').length,
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Recruiter Approvals</h1>
            <p>Review and approve recruiter signup requests</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchSignups}>
            ↻ Refresh
          </button>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'pending',  label: 'Pending',  color: '#f59e0b' },
            { key: 'approved', label: 'Approved', color: '#10b981' },
            { key: 'rejected', label: 'Rejected', color: '#6b7280' },
            { key: 'all',      label: 'All',      color: '#2563eb' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: filter === f.key ? `1.5px solid ${f.color}` : '1.5px solid #e5e7eb',
                background: filter === f.key ? f.color + '12' : '#fff',
                color: filter === f.key ? f.color : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{
                  background: filter === f.key ? f.color : '#e5e7eb',
                  color: filter === f.key ? '#fff' : '#6b7280',
                  borderRadius: 20, padding: '0px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {counts[f.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Signup Requests
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
              {filter === 'pending' ? '🎉 No pending requests!' : 'No requests found.'}
            </div>
          ) : (
            <div className="table-wrap">
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
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {i + 1}
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                        {s.full_name || '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {s.email}
                      </td>
                      <td>
                        <span className="tag">{s.company_name || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>
                        {s.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={actionLoad === s.id}
                              onClick={() => handleApprove(s.id, s.email)}
                              style={{ fontSize: 12, padding: '5px 14px' }}
                            >
                              {actionLoad === s.id ? '...' : '✓ Approve'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={actionLoad === s.id}
                              onClick={() => { setRejectModal({ id: s.id, email: s.email }); setRejectReason(''); }}
                              style={{ fontSize: 12, padding: '5px 14px', color: '#ef4444', borderColor: '#fca5a5' }}
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Reject Signup
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Rejecting <strong>{rejectModal.email}</strong>. Optionally add a reason.
            </p>
            <textarea
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none',
                fontFamily: 'inherit', outline: 'none', marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
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