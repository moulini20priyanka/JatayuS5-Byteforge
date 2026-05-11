// AdminApprovalsPage.jsx — Blue/white professional theme
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  amber:     '#d97706',
  amberBg:   '#fffbeb',
  amberBd:   '#fcd34d',
};

const approvalStyles = `
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
  const [filter,     setFilter]     = useState('all');
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
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg }}>
      <style>{approvalStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: T.primary, margin: '0 0 4px' }}>Recruiter Approvals</h1>
            <p style={{ fontSize: '13px', color: T.accent, margin: 0 }}>Review and approve recruiter signup requests</p>
          </div>
          <button
            onClick={fetchSignups}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: T.accentLt,
              color: '#1d4ed8',
              border: `1px solid ${T.accentBd}`,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseOver={(e) => {
              e.target.style.background = T.accentBd;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = T.accentLt;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {filterConfig.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: `1.5px solid ${filter === f.key ? (f.key === 'pending' ? T.amber : f.key === 'approved' ? T.green : T.text3) : T.border}`,
                background: filter === f.key ? (f.key === 'pending' ? T.amberBg : f.key === 'approved' ? T.greenBg : '#f9fafb') : T.white,
                color: filter === f.key ? (f.key === 'pending' ? T.amber : f.key === 'approved' ? T.green : T.text3) : T.text3,
              }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{
                  background: filter === f.key ? (f.key === 'pending' ? T.amberBd : f.key === 'approved' ? T.greenBd : T.border) : T.border,
                  color: filter === f.key ? (f.key === 'pending' ? '#fff' : T.white) : T.text3,
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
        <div style={{ background: T.white, border: `1px solid ${T.accentBd}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(37,99,235,0.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.accentLt}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, #f0f9ff, #fff)' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: T.primary }}>
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Signup Requests
            </span>
            <span style={{ fontSize: 12, color: T.accent }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.text3, fontSize: 14 }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.text3, fontSize: 14 }}>
              {filter === 'pending' ? '🎉 No pending requests!' : 'No requests found.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.accentLt, borderBottom: `1.5px solid ${T.accentBd}` }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>#</th>
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
                          <span style={{ fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
                            {s.reject_reason}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'apFadeIn 0.15s ease' }}>
          <div style={{ background: T.white, borderRadius: '16px', padding: '28px', width: '420px', boxShadow: '0 24px 64px rgba(37,99,235,0.18)', border: `1px solid ${T.accentBd}`, animation: 'apSlideUp 0.18s ease' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: T.primary }}>Reject Signup</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: T.text2 }}>Rejecting <strong>{rejectModal.email}</strong>. Optionally add a reason.</p>
            <textarea
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${T.accentBd}`,
                fontSize: '13px',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                color: T.primary,
              }}
              onFocus={(e) => e.target.style.borderColor = T.accent}
              onBlur={(e) => e.target.style.borderColor = T.accentBd}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: T.accentLt,
                  border: `1px solid ${T.accentBd}`,
                  color: '#1d4ed8',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => e.target.style.background = T.accentBd}
                onMouseOut={(e) => e.target.style.background = T.accentLt}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoad === rejectModal.id}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: T.red,
                  border: 'none',
                  color: T.white,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: actionLoad === rejectModal.id ? 0.6 : 1,
                }}
                onMouseOver={(e) => !actionLoad && (e.target.style.background = '#991b1b', e.target.style.transform = 'translateY(-1px)')}
                onMouseOut={(e) => !actionLoad && (e.target.style.background = T.red, e.target.style.transform = 'translateY(0)')}
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