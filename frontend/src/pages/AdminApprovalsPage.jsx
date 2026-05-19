
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';


const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', navyMid: '#1e3a5f',
  blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box}
.ap{margin-left:230px;display:flex;flex-direction:column;min-height:100vh;background:${C.pageBg};font-family:${C.font};color:${C.ink}}
.ap-main{flex:1;overflow:auto;padding:32px 36px}
.ap-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px}
.ap-title{font-size:22px;font-weight:800;color:${C.navy};margin:0 0 4px;letter-spacing:-0.3px}
.ap-sub{font-size:13px;color:${C.inkSub};margin:0}
.ap-hdr-r{display:flex;align-items:center;gap:10px}
.btn-pri{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.blue};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-pri:hover{background:${C.blueDk};transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.btn-pri:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-sm-gr{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:${C.greenBg};color:${C.green};border:1px solid ${C.greenBd};border-radius:7px;font-size:12px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .12s}
.btn-sm-gr:hover{background:#d1fae5}
.btn-sm-gr:disabled{opacity:.5;cursor:not-allowed}
.btn-sm-rd{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:${C.redBg};color:${C.red};border:1px solid ${C.redBd};border-radius:7px;font-size:12px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .12s}
.btn-sm-rd:hover{background:#fee2e2}
.btn-sm-rd:disabled{opacity:.5;cursor:not-allowed}
.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.red};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-danger:hover{background:#b91c1c;transform:translateY(-1px)}
.btn-danger:disabled{opacity:.55;cursor:not-allowed;transform:none}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13.5px;font-weight:700;color:${C.navy}}
.card-meta{font-size:12px;color:${C.inkSub}}
.filter-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.filter-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:${C.font};border:1.5px solid ${C.border};background:${C.surface};color:${C.inkSub}}
.filter-chip:hover{border-color:${C.borderMid};color:${C.inkMid}}
.filter-chip.active-pending{border-color:${C.amber};background:${C.amberBg};color:${C.amber}}
.filter-chip.active-approved{border-color:${C.green};background:${C.greenBg};color:${C.green}}
.filter-chip.active-rejected{border-color:${C.inkMuted};background:${C.subtle};color:${C.inkSub}}
.filter-chip.active-all{border-color:${C.blue};background:${C.blueLt};color:${C.blue}}
.chip-count{border-radius:20px;padding:0 7px;font-size:11px;font-weight:700;background:${C.border};color:${C.inkSub}}
.active-pending .chip-count{background:${C.amberBd};color:#78350f}
.active-approved .chip-count{background:${C.greenBd};color:#14532d}
.active-all .chip-count{background:${C.blueBd};color:${C.blueDk}}
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:11px 16px;text-align:left;font-size:10.5px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl td{padding:13px 16px;vertical-align:middle}
.bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap}
.bdg-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.bdg-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.bdg-am{background:${C.amberBg};color:${C.amber};border-color:${C.amberBd}}
.bdg-nt{background:${C.subtle};color:${C.inkSub};border-color:${C.border}}
.mono{font-family:${C.mono};font-size:12px}
.spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
.spin-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ap-spin .7s linear infinite;display:inline-block}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:52px;text-align:center;color:${C.inkMuted};font-size:13px}
.loading{padding:36px;text-align:center;color:${C.inkMuted};font-size:13px}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);animation:ap-fi .15s ease}
.modal-box{background:${C.surface};border-radius:16px;padding:28px;width:440px;box-shadow:0 24px 64px rgba(0,0,0,.2);animation:ap-su .18s ease}
@keyframes ap-fi{from{opacity:0}to{opacity:1}}
@keyframes ap-su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.field-lbl{font-size:12px;font-weight:600;color:${C.inkMid};margin-bottom:6px;display:block}
.field-ta{width:100%;padding:10px 12px;border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-family:${C.font};resize:none;outline:none;color:${C.ink};background:${C.subtle};transition:border-color .15s}
.field-ta:focus{border-color:${C.blue};background:${C.surface}}
`;

const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const IC = {
  refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  check:   "M20 6L9 17L4 12",
  x:       "M18 6L6 18M6 6L18 18",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

function StatusBadge({ status }) {
  const map = {
    pending:  { cls: 'bdg-am', dot: C.amber, label: 'Pending' },
    approved: { cls: 'bdg-gr', dot: C.green, label: 'Approved' },
    rejected: { cls: 'bdg-nt', dot: C.inkMuted, label: 'Rejected' },
  };
  const m = map[status] || map.pending;
  return (
    <span className={`bdg ${m.cls}`}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

export default function AdminApprovalsPage() {
  const { showToast } = useApp();
  const [signups,      setSignups]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [actionLoad,   setActionLoad]   = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const adminId = localStorage.getItem('user_id') || 1;
  const token   = localStorage.getItem('token');

  const fetchSignups = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/admin/signups`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSignups(Array.isArray(data) ? data : []);
    } catch { showToast('Failed to load signups', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSignups(); }, []);

  const handleApprove = async (id, email) => {
    setActionLoad(id);
    try {
      const res  = await fetch(`${API}/api/auth/admin/approve-recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signup_id: id, admin_id: adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${email} approved as recruiter`, 'success');
      fetchSignups();
    } catch (e) { showToast(e.message || 'Approval failed', 'error'); }
    finally { setActionLoad(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoad(rejectModal.id);
    try {
      const res  = await fetch(`${API}/api/auth/admin/reject-recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signup_id: rejectModal.id, admin_id: adminId, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Rejected ${rejectModal.email}`, 'info');
      setRejectModal(null); setRejectReason('');
      fetchSignups();
    } catch (e) { showToast(e.message || 'Rejection failed', 'error'); }
    finally { setActionLoad(null); }
  };

  const filtered = filter === 'all' ? signups : signups.filter(s => s.status === filter);
  const counts   = {
    pending:  signups.filter(s => s.status === 'pending').length,
    approved: signups.filter(s => s.status === 'approved').length,
    rejected: signups.filter(s => s.status === 'rejected').length,
  };

  const FILTERS = [
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar /><Navbar />
      <main className="ap-main">

        <div className="ap-hdr">
          <div className="ap-hdr-l">
            <h1 className="ap-title">Recruiter Approvals</h1>
            <p className="ap-sub">Review and approve recruiter signup requests</p>
          </div>
          <div className="ap-hdr-r">
            <button className="btn-sec" onClick={fetchSignups}>
              <Ic d={IC.refresh} size={13} color={C.inkSub} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="filter-row">
          {FILTERS.map(f => (
            <button key={f.key}
              className={`filter-chip ${filter === f.key ? `active-${f.key}` : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
              {f.key !== 'all' && (
                <span className="chip-count">{counts[f.key] ?? 0}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Signup Requests
            </div>
            <span className="card-meta">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="tbl-wrap">
            {loading ? (
              <div className="loading"><div className="spinner" style={{ marginBottom: 12 }} />Loading requests…</div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <Ic d={IC.users} size={36} color={C.blue} sw={1.2} />
                <div style={{ marginTop: 12 }}>{filter === 'pending' ? 'No pending requests.' : 'No requests found.'}</div>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Email</th><th>Company</th>
                    <th>Applied On</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id}>
                      <td><span className="mono" style={{ color: C.inkMuted }}>#{i + 1}</span></td>
                      <td><span style={{ fontWeight: 600, color: C.navy }}>{s.full_name || '—'}</span></td>
                      <td><span className="mono" style={{ color: C.inkSub }}>{s.email}</span></td>
                      <td><span className="bdg bdg-bl">{s.company_name || '—'}</span></td>
                      <td><span className="mono">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</span></td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        {s.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-sm-gr" disabled={actionLoad === s.id}
                              onClick={() => handleApprove(s.id, s.email)}>
                              <Ic d={IC.check} size={11} color={C.green} sw={2.5} />
                              {actionLoad === s.id ? '…' : 'Approve'}
                            </button>
                            <button className="btn-sm-rd" disabled={actionLoad === s.id}
                              onClick={() => { setRejectModal({ id: s.id, email: s.email }); setRejectReason(''); }}>
                              <Ic d={IC.x} size={11} color={C.red} sw={2.5} />
                              Reject
                            </button>
                          </div>
                        ) : s.status === 'rejected' && s.reject_reason ? (
                          <span style={{ fontSize: 12, color: C.inkMuted, fontStyle: 'italic' }}>{s.reject_reason}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Approved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: C.redBg, border: `1px solid ${C.redBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic d={IC.x} size={15} color={C.red} sw={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Reject Signup</div>
                <div style={{ fontSize: 12, color: C.inkSub, marginTop: 1 }}>Rejecting <strong>{rejectModal.email}</strong></div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.inkMid, margin: '0 0 14px', lineHeight: 1.6 }}>
              Optionally provide a reason for rejection. The recruiter will not be notified unless configured.
            </p>
            <label className="field-lbl">Reason for rejection <span style={{ color: C.inkMuted, fontWeight: 400 }}>(optional)</span></label>
            <textarea rows={3} className="field-ta" placeholder="e.g. Incomplete information provided…"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-sec" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn-danger" disabled={actionLoad === rejectModal.id} onClick={handleReject}>
                {actionLoad === rejectModal.id ? <span className="spin-sm" /> : <Ic d={IC.x} size={13} color="#fff" sw={2.5} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
