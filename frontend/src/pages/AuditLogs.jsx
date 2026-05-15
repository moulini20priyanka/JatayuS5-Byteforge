// AuditLogs.jsx — Admin Platform · Unified Design System v2
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || '';
const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) } });

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  teal: '#0891b2', tealBg: '#f0f9ff', tealBd: '#bae6fd',
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
.btn-sec{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${C.surface};color:${C.inkMid};border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-sec:hover{background:${C.hover};border-color:${C.borderMid}}
.btn-ghost{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:${C.inkSub};border:1px solid ${C.border};border-radius:7px;font-size:12px;font-weight:500;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-ghost:hover{background:${C.hover};color:${C.inkMid}}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden;margin-bottom:20px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13.5px;font-weight:700;color:${C.navy}}
.card-meta{font-size:12px;color:${C.inkSub}}
.filter-body{padding:16px 20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.filter-lbl{font-size:11px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
.filter-sel{padding:8px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;background:${C.surface};color:${C.inkMid};font-family:${C.font};outline:none;cursor:pointer;transition:border-color .15s}
.filter-sel:focus{border-color:${C.blue}}
.filter-inp{padding:8px 12px;border:1.5px solid ${C.border};border-radius:8px;font-size:13px;background:${C.surface};color:${C.inkMid};font-family:${C.font};outline:none;transition:border-color .15s}
.filter-inp:focus{border-color:${C.blue}}
.filter-group{display:flex;align-items:center;gap:8px}
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:11px 16px;text-align:left;font-size:10.5px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl td{padding:12px 16px;vertical-align:top}
.bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap}
.bdg-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.bdg-rd{background:${C.redBg};color:${C.red};border-color:${C.redBd}}
.bdg-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.bdg-tl{background:${C.tealBg};color:${C.teal};border-color:${C.tealBd}}
.bdg-nt{background:${C.subtle};color:${C.inkSub};border-color:${C.border}}
.mono{font-family:${C.mono};font-size:12px}
.spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:52px;text-align:center;color:${C.inkMuted};font-size:13px}
.loading{padding:36px;text-align:center;color:${C.inkMuted};font-size:13px}
.pagination{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid ${C.border};background:${C.subtle}}
.pg-info{font-size:12px;color:${C.inkSub}}
.pg-controls{display:flex;gap:8px}
.pg-btn{padding:6px 14px;border:1.5px solid ${C.border};border-radius:7px;background:${C.surface};color:${C.inkMid};cursor:pointer;font-size:12px;font-weight:600;font-family:${C.font};transition:all .15s}
.pg-btn:hover:not(:disabled){background:${C.hover};border-color:${C.borderMid}}
.pg-btn:disabled{opacity:.45;cursor:not-allowed}
`;

const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const IC = {
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  list:     "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5c0-1.105 0-2 2-2s2 .895 2 2",
  x:        "M18 6L6 18M6 6L18 18",
};

const ACTION_CATEGORIES = ['CANDIDATE','EXAM','QUESTION','USER','LOGIN','RESULT','EXPORT'];
const ACTION_TYPES = {
  CANDIDATE: ['CANDIDATE_CREATED','CANDIDATE_STATUS_CHANGED','CANDIDATES_BULK_IMPORTED'],
  EXAM:      ['EXAM_CREATED','EXAM_APPROVED','EXAM_UPDATED','EXAM_PUBLISHED','EXAM_REQUEST_APPROVED','EXAM_REQUEST_REJECTED','EXAM_ASSIGNED'],
  QUESTION:  ['QUESTION_GENERATED','QUESTION_UPDATED','QUESTION_DELETED','QUESTIONS_BULK_IMPORTED'],
  USER:      ['RECRUITER_APPROVED','USER_ROLE_UPDATED'],
  LOGIN:     ['LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT'],
  RESULT:    ['RESULT_PUBLISHED'],
  EXPORT:    ['DATA_EXPORTED'],
};

const CAT_BADGE = {
  CANDIDATE: 'bdg-bl', EXAM: 'bdg-gr', QUESTION: 'bdg-tl',
  USER: 'bdg-nt', LOGIN: 'bdg-nt', RESULT: 'bdg-nt', EXPORT: 'bdg-nt',
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalRecords: 0, totalPages: 1 });
  const [filters,    setFilters]    = useState({ actionCategory: '', actionType: '', status: '', startDate: '', endDate: '' });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const res = await authFetch(`${API}/audit-logs?${params}`);
      if (res.status === 401) { navigate('/login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) { setLogs(data.data); setPagination(data.pagination); setError(null); }
      else throw new Error(data.message || 'Failed to fetch logs');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(1); }, [filters]);

  const handleFilter = (field, value) => setFilters(p => ({ ...p, [field]: value, ...(field === 'actionCategory' && { actionType: '' }) }));
  const handleClear  = () => setFilters({ actionCategory: '', actionType: '', status: '', startDate: '', endDate: '' });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const res = await authFetch(`${API}/audit-logs/export?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { setError('Failed to export logs'); }
  };

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar /><Navbar />
      <main className="ap-main">

        <div className="ap-hdr">
          <div className="ap-hdr-l">
            <h1 className="ap-title">Audit Logs</h1>
            <p className="ap-sub">Track all system activities, approvals, and user actions</p>
          </div>
          <div className="ap-hdr-r">
            <button className="btn-sec" onClick={handleExport}>
              <Ic d={IC.download} size={13} color={C.inkSub} /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 9, color: C.red, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {error}
            <button className="btn-ghost" style={{ padding: '3px 8px', borderColor: C.redBd, color: C.red }} onClick={() => setError(null)}>
              <Ic d={IC.x} size={12} color={C.red} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Filters</div>
            {Object.values(filters).some(Boolean) && (
              <button className="btn-ghost" onClick={handleClear}><Ic d={IC.x} size={12} color={C.inkSub} />Clear all</button>
            )}
          </div>
          <div className="filter-body">
            <div className="filter-group">
              <span className="filter-lbl">Category</span>
              <select className="filter-sel" value={filters.actionCategory} onChange={e => handleFilter('actionCategory', e.target.value)}>
                <option value="">All Categories</option>
                {ACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-lbl">Action</span>
              <select className="filter-sel" value={filters.actionType} onChange={e => handleFilter('actionType', e.target.value)}>
                <option value="">All Actions</option>
                {(filters.actionCategory ? ACTION_TYPES[filters.actionCategory] || [] : []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-lbl">Status</span>
              <select className="filter-sel" value={filters.status} onChange={e => handleFilter('status', e.target.value)}>
                <option value="">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-lbl">From</span>
              <input type="date" className="filter-inp" value={filters.startDate} onChange={e => handleFilter('startDate', e.target.value)} />
            </div>
            <div className="filter-group">
              <span className="filter-lbl">To</span>
              <input type="date" className="filter-inp" value={filters.endDate} onChange={e => handleFilter('endDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Activity Log</div>
            <span className="card-meta">{loading ? 'Loading…' : `${pagination.totalRecords} total activities`}</span>
          </div>
          <div className="tbl-wrap">
            {loading ? (
              <div className="loading"><div className="spinner" style={{ marginBottom: 12 }} />Loading audit logs…</div>
            ) : logs.length === 0 ? (
              <div className="empty">
                <Ic d={IC.list} size={36} color={C.blue} sw={1.2} />
                <div style={{ marginTop: 12 }}>No audit logs found</div>
                <div style={{ fontSize: 12, marginTop: 6, color: C.inkMuted }}>Try adjusting your filters</div>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Category</th><th>Entity</th><th>Status</th><th>IP Address</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><span className="mono" style={{ color: C.inkSub }}>{new Date(log.timestamp).toLocaleString()}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, color: C.navy, fontSize: 13 }}>{log.username}</div>
                        <div className="mono" style={{ color: C.inkMuted, marginTop: 2 }}>ID: {log.user_id || 'N/A'}</div>
                      </td>
                      <td><span style={{ fontSize: 12, fontWeight: 600, color: C.inkMid }}>{log.action_type}</span></td>
                      <td>
                        <span className={`bdg ${CAT_BADGE[log.action_category] || 'bdg-nt'}`}>{log.action_category}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: C.navy, fontWeight: 500 }}>{log.entity_type}</div>
                        <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{log.entity_name}</div>
                      </td>
                      <td>
                        <span className={`bdg ${log.status === 'SUCCESS' ? 'bdg-gr' : 'bdg-rd'}`}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: log.status === 'SUCCESS' ? C.green : C.red, display: 'inline-block' }} />
                          {log.status}
                        </span>
                      </td>
                      <td><span className="mono" style={{ color: C.inkMuted }}>{log.ip_address}</span></td>
                      <td>
                        <span style={{ fontSize: 11, color: C.inkSub, maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details && JSON.stringify(log.details).substring(0, 50)}{log.details && JSON.stringify(log.details).length > 50 ? '…' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {logs.length > 0 && (
            <div className="pagination">
              <span className="pg-info">Page {pagination.page} of {pagination.totalPages} · {pagination.totalRecords} total entries</span>
              <div className="pg-controls">
                <button className="pg-btn" disabled={pagination.page === 1} onClick={() => fetchLogs(pagination.page - 1)}>Previous</button>
                <button className="pg-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

      </main>
      <ToastContainer />
    </div>
  );
}