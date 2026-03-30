import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_MAP = {
  pending:   { cls: 'badge badge-yellow', label: 'Pending'   },
  approved:  { cls: 'badge badge-green',  label: 'Approved'  },
  rejected:  { cls: 'badge badge-gray',   label: 'Rejected'  },
  completed: { cls: 'badge badge-blue',   label: 'Completed' },
};

const TYPE_COLOR = {
  Placement:          { bg: '#d9f2f4', color: '#2BB1A8' },
  'Skill Certificate':{ bg: '#ede9fe', color: '#7c3aed' },
  Internship:         { bg: '#fef3c7', color: '#b45309' },
};

export default function AdminExamRequestsPage() {
  const { showToast } = useApp();

  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('pending');
  const [actionLoad,  setActionLoad]  = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason,setRejectReason]= useState('');
  const [selected,    setSelected]    = useState(null); // detail view

  const adminId = localStorage.getItem('user_id') || 1;
  const token   = localStorage.getItem('token');

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/exam-requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load exam requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  // ── Approve ──────────────────────────────────────────────────────
  const handleApprove = async (id, jobRole) => {
    setActionLoad(id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: 'approved', approved_by: adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✓ "${jobRole}" request approved`, 'success');
      fetchRequests();
      setSelected(null);
    } catch (e) {
      showToast(e.message || 'Approval failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoad(rejectModal.id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${rejectModal.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: 'rejected', approved_by: adminId, reject_reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Rejected request`, 'info');
      setRejectModal(null);
      setRejectReason('');
      fetchRequests();
      setSelected(null);
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />

      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Exam Requests</h1>
            <p>Review and approve recruiter exam requests</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchRequests}>
            ↻ Refresh
          </button>
        </div>

        {/* Summary stat chips */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all',       label: 'All',       color: '#2563eb' },
            { key: 'pending',   label: 'Pending',   color: '#f59e0b' },
            { key: 'approved',  label: 'Approved',  color: '#10b981' },
            { key: 'rejected',  label: 'Rejected',  color: '#6b7280' },
            { key: 'completed', label: 'Completed', color: '#3b82f6' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: filter === f.key ? `1.5px solid ${f.color}` : '1.5px solid #e5e7eb',
                background: filter === f.key ? f.color + '12' : '#fff',
                color: filter === f.key ? f.color : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {f.label}
              <span style={{
                background: filter === f.key ? f.color : '#e5e7eb',
                color: filter === f.key ? '#fff' : '#6b7280',
                borderRadius: 20, padding: '0 7px', fontSize: 11, fontWeight: 700,
              }}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Main content — table + detail side by side when selected */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Table */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {filtered.length} request{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: .4 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {filter === 'pending' ? '🎉 No pending requests!' : 'No requests found.'}
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Job Role</th>
                      <th>Type</th>
                      <th>Pattern</th>
                      <th>Duration</th>
                      <th>College</th>
                      <th>Recruiter</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const sc  = STATUS_MAP[r.status] || STATUS_MAP.pending;
                      const tc  = TYPE_COLOR[r.exam_type] || { bg: '#f1f5f9', color: '#64748b' };
                      const isSelected = selected?.id === r.id;
                      return (
                        <tr key={r.id}
                          style={{ cursor: 'pointer', background: isSelected ? '#f0fafb' : 'transparent', transition: 'background 0.15s' }}
                          onClick={() => setSelected(isSelected ? null : r)}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>#{r.id}</td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.job_role}</td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>
                              {r.exam_type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{r.assessment_pattern || '—'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{r.duration_minutes} min</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{r.target_college || 'Any'}</td>
                          <td style={{ fontSize: 12 }}>
                            <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{r.recruiter_name || `#${r.recruiter_id}`}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.company_name || ''}</div>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td><span className={sc.cls}>{sc.label}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-primary btn-sm"
                                  disabled={actionLoad === r.id}
                                  onClick={() => handleApprove(r.id, r.job_role)}
                                  style={{ fontSize: 11, padding: '4px 12px' }}>
                                  {actionLoad === r.id ? '...' : '✓ Approve'}
                                </button>
                                <button className="btn btn-secondary btn-sm"
                                  disabled={actionLoad === r.id}
                                  onClick={() => { setRejectModal({ id: r.id, jobRole: r.job_role }); setRejectReason(''); }}
                                  style={{ fontSize: 11, padding: '4px 12px', color: '#ef4444', borderColor: '#fca5a5' }}>
                                  ✕ Reject
                                </button>
                              </div>
                            ) : r.status === 'approved' ? (
                              <button className="btn btn-primary btn-sm"
                                style={{ fontSize: 11, padding: '4px 12px', background: '#7c3aed', borderColor: '#7c3aed' }}
                                onClick={() => alert('Create Exam flow coming next!')}>
                                + Create Exam
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                                {r.reject_reason || '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="panel" style={{ position: 'sticky', top: 20 }}>
              <div className="panel-header">
                <span className="panel-title">Request Details</span>
                <button className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11 }}
                  onClick={() => setSelected(null)}>✕ Close</button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Type badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: (TYPE_COLOR[selected.exam_type] || {}).bg || '#f1f5f9',
                    color: (TYPE_COLOR[selected.exam_type] || {}).color || '#64748b',
                  }}>{selected.exam_type}</span>
                  <span className={STATUS_MAP[selected.status]?.cls || 'badge badge-gray'}>
                    {STATUS_MAP[selected.status]?.label}
                  </span>
                </div>

                {/* Job role */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Job Role</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{selected.job_role}</div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Pattern',  value: selected.assessment_pattern || '—' },
                    { label: 'Duration', value: `${selected.duration_minutes} min` },
                    { label: 'College',  value: selected.target_college || 'Any' },
                    { label: 'Batch',    value: selected.target_batch_year || '—' },
                  ].map((d, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 4 }}>{d.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{d.value}</div>
                    </div>
                  ))}
                </div>

                {/* Recruiter */}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>Recruiter</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{selected.recruiter_name || `Recruiter #${selected.recruiter_id}`}</div>
                  {selected.company_name && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{selected.company_name}</div>}
                  {selected.recruiter_email && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{selected.recruiter_email}</div>}
                </div>

                {/* Specifications */}
                {selected.specifications && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>Specifications</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.6, background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      {selected.specifications}
                    </div>
                  </div>
                )}

                {/* Submitted */}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Submitted: {new Date(selected.created_at).toLocaleString()}
                </div>

                {/* Actions */}
                {selected.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={actionLoad === selected.id}
                      onClick={() => handleApprove(selected.id, selected.job_role)}>
                      {actionLoad === selected.id ? 'Approving...' : '✓ Approve Request'}
                    </button>
                    <button className="btn btn-secondary"
                      style={{ flex: 1, color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => { setRejectModal({ id: selected.id, jobRole: selected.job_role }); setRejectReason(''); }}>
                      ✕ Reject
                    </button>
                  </div>
                )}
                {selected.status === 'approved' && (
                  <button className="btn btn-primary"
                    style={{ width: '100%', background: '#7c3aed', borderColor: '#7c3aed' }}
                    onClick={() => alert('Create Exam flow coming next!')}>
                    + Create Exam from This Request
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Reject Request</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Rejecting <strong>"{rejectModal.jobRole}"</strong>. Add a reason for the recruiter.
            </p>
            <textarea rows={3} placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleReject}
                disabled={actionLoad === rejectModal.id}>
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