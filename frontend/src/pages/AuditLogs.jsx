import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Design tokens
const T = {
  primary: '#1e3a8a', accent: '#2563eb', accentLt: '#eff6ff', accentBd: '#bfdbfe',
  text: '#1e293b', text2: '#475569', text3: '#94a3b8', border: '#e2e8f0', bg: '#f0f7ff', white: '#ffffff',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#6ee7b7',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fca5a5',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
};

const styles = `
  @keyframes auditFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes auditSlide { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  
  .audit-page-wrapper { 
    margin-left: 230px; display: flex; flex-direction: column; min-height: 100vh; background: #f0f7ff;
    animation: auditSlide 0.25s ease; 
  }
  .audit-main { flex: 1; overflow: auto; padding: 24px; }
  .audit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .audit-header h1 { font-size: 24px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px; }
  .audit-header p { font-size: 13px; color: #60a5fa; margin: 0; }
  
  .audit-panel { background: #fff; border: 1px solid #bfdbfe; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(37,99,235,0.06); margin-bottom: 20px; }
  .audit-panel-header { padding: 16px 20px; border-bottom: 1px solid #eff6ff; display: flex; align-items: center; justify-content: space-between; background: #fff; }
  .audit-panel-title { font-size: 14px; font-weight: 700; color: #1e3a8a; }
  
  .audit-controls { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .audit-filter-group { display: flex; gap: 12px; align-items: center; }
  .audit-filter-label { font-size: 12px; font-weight: 600; color: #1e3a8a; }
  
  .audit-input, .audit-select { padding: 9px 12px; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; background: #fff; color: #1e3a8a; }
  .audit-input::placeholder { color: #93c5fd; }
  .audit-input:focus, .audit-select:focus { outline: none; border-color: #2563eb; }
  
  .audit-btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: none; cursor: pointer; transition: all 0.18s ease; }
  .audit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.35); }
  .audit-btn-secondary { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .audit-btn-secondary:hover { background: #dbeafe; border-color: #93c5fd; }
  
  .audit-error { padding: 20px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #7f1d1d; margin-bottom: 20px; }
  
  .audit-table-wrap { overflow-x: auto; }
  .audit-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .audit-table thead { background: #f0f9ff; border-bottom: 1.5px solid #bfdbfe; }
  .audit-table th { padding: 11px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; }
  .audit-table tbody tr { border-bottom: 1px solid #f0f9ff; transition: background 0.15s ease; }
  .audit-table tbody tr:hover { background: #f8fcff; }
  .audit-table td { padding: 12px; vertical-align: top; }
  
  .audit-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 16px; font-size: 11px; font-weight: 600; border: 1px solid; }
  .badge-success { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
  .badge-failure { background: #fef2f2; color: #7f1d1d; border-color: #fca5a5; }
  .badge-info { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
  .badge-category { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
  
  .audit-timestamp { color: #60a5fa; font-size: 12px; }
  .audit-details { color: #64748b; font-size: 12px; max-width: 200px; word-break: break-word; }
  
  .audit-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #eff6ff; background: #f8fcff; }
  .audit-pagination-info { font-size: 12px; color: #60a5fa; }
  .audit-pagination-controls { display: flex; gap: 8px; }
  .audit-pagination-btn { padding: 6px 12px; border: 1px solid #bfdbfe; border-radius: 6px; background: #fff; color: #2563eb; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.18s ease; }
  .audit-pagination-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; }
  .audit-pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .audit-loading { padding: 40px; text-align: center; color: #93c5fd; }
  .audit-empty-state { padding: 48px; text-align: center; color: #93c5fd; }
  .audit-empty-icon { font-size: 40px; margin-bottom: 12px; }
`;

const ACTION_CATEGORIES = [
  'CANDIDATE',
  'EXAM',
  'QUESTION',
  'USER',
  'LOGIN',
  'RESULT',
  'EXPORT',
];

const ACTION_TYPES = {
  CANDIDATE: [
    'CANDIDATE_CREATED',
    'CANDIDATE_STATUS_CHANGED',
    'CANDIDATES_BULK_IMPORTED',
  ],
  EXAM: [
    'EXAM_CREATED',
    'EXAM_APPROVED',
    'EXAM_UPDATED',
    'EXAM_PUBLISHED',
    'EXAM_REQUEST_APPROVED',
    'EXAM_REQUEST_REJECTED',
    'EXAM_ASSIGNED',
  ],
  QUESTION: [
    'QUESTION_GENERATED',
    'QUESTION_UPDATED',
    'QUESTION_DELETED',
    'QUESTIONS_BULK_IMPORTED',
  ],
  USER: [
    'RECRUITER_APPROVED',
    'USER_ROLE_UPDATED',
  ],
  LOGIN: [
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
  ],
  RESULT: [
    'RESULT_PUBLISHED',
  ],
  EXPORT: [
    'DATA_EXPORTED',
  ],
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalRecords: 0,
    totalPages: 1,
  });

  // Filters
  const [filters, setFilters] = useState({
    actionCategory: '',
    actionType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...(filters.actionCategory && { actionCategory: filters.actionCategory }),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await authFetch(`${API}/audit-logs?${params}`);

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch logs');
      }
    } catch (err) {
      console.error('[AuditLogs] Error:', err.message);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'actionCategory' && { actionType: '' }), // Reset actionType when category changes
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      actionCategory: '',
      actionType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.actionCategory && { actionCategory: filters.actionCategory }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await authFetch(`${API}/audit-logs/export?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AuditLogs] Export error:', err.message);
      setError('Failed to export logs');
    }
  };

  const getStatusBadge = (status) => {
    const className = status === 'SUCCESS' ? 'badge-success' : 'badge-failure';
    return <span className={`audit-badge ${className}`}>{status}</span>;
  };

  const getCategoryBadge = (category) => (
    <span className="badge-category">{category}</span>
  );

  return (
    <div style={{ marginLeft: "230px", display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg }}>
      <style>{styles}</style>
      <Sidebar />
      <Navbar />

      <main style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h1> Audit Logs</h1>
            <p>Track all system activities, approvals, and user actions</p>
          </div>
          <button style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #1d4ed8)`, color: T.white, border: "none", cursor: "pointer", transition: "all 0.18s ease" }} onClick={handleExport}>
            Export to CSV
          </button>
        </div>

        {error && <div style={{ padding: "20px", background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: "8px", color: T.red, marginBottom: "20px" }}>âš ï¸ {error}</div>}

        {/* Filters */}
        <div style={{ background: T.white, border: `1px solid ${T.accentBd}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 12px rgba(37,99,235,0.06)" }} style={{ marginBottom: 20 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.accentLt}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.white }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: T.primary }}>Filters & Search</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: T.primary }}>Category:</label>
                <select
                  style={{ padding: "9px 12px", border: `1px solid ${T.accentBd}`, borderRadius: "8px", fontSize: "13px", background: T.white, color: T.primary }}
                  value={filters.actionCategory}
                  onChange={(e) => handleFilterChange('actionCategory', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {ACTION_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: T.primary }}>Action:</label>
                <select
                  style={{ padding: "9px 12px", border: `1px solid ${T.accentBd}`, borderRadius: "8px", fontSize: "13px", background: T.white, color: T.primary }}
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {(filters.actionCategory
                    ? ACTION_TYPES[filters.actionCategory] || []
                    : []
                  ).map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: T.primary }}>Status:</label>
                <select
                  style={{ padding: "9px 12px", border: `1px solid ${T.accentBd}`, borderRadius: "8px", fontSize: "13px", background: T.white, color: T.primary }}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: T.primary }}>From:</label>
                <input
                  type="date"
                  style={{ padding: "9px 12px", border: `1px solid ${T.accentBd}`, borderRadius: "8px", fontSize: "13px", background: T.white, color: T.primary }}
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: T.primary }}>To:</label>
                <input
                  type="date"
                  style={{ padding: "9px 12px", border: `1px solid ${T.accentBd}`, borderRadius: "8px", fontSize: "13px", background: T.white, color: T.primary }}
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              <button className="audit-btn audit-btn-secondary" onClick={handleClearFilters}>
                âœ• Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div style={{ background: T.white, border: `1px solid ${T.accentBd}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 12px rgba(37,99,235,0.06)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.accentLt}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.white }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: T.primary }}>Activity Log</span>
            <span style={{ fontSize: '12px', color: '#60a5fa' }}>
              {loading ? 'Loading...' : `${pagination.totalRecords} total activities`}
            </span>
          </div>

          <div className="audit-table-wrap">
            {loading ? (
              <div className="audit-loading">
                <div style={{ marginBottom: 12 }}>â³ Loading audit logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="audit-empty-state">
                <div className="audit-empty-icon">ðŸ“­</div>
                <div>No audit logs found</div>
                <div style={{ fontSize: '12px', marginTop: 8, color: '#93c5fd' }}>
                  Try adjusting your filters
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Entity</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="audit-timestamp">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e3a8a' }}>
                          {log.username}
                        </div>
                        <div style={{ fontSize: '11px', color: '#93c5fd' }}>
                          ID: {log.user_id || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>
                          {log.action_type}
                        </div>
                      </td>
                      <td>{getCategoryBadge(log.action_category)}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
                          {log.entity_type}
                        </div>
                        <div style={{ fontSize: '11px', color: '#60a5fa' }}>
                          {log.entity_name}
                        </div>
                      </td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td style={{ fontSize: '11px', color: '#60a5fa' }}>
                        {log.ip_address}
                      </td>
                      <td className="audit-details">
                        {log.details && JSON.stringify(log.details).substring(0, 50)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="audit-pagination">
              <span className="audit-pagination-info">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.totalRecords} total)
              </span>
              <div className="audit-pagination-controls">
                <button
                  className="audit-pagination-btn"
                  disabled={pagination.page === 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                 Previous
                </button>
                <button
                  className="audit-pagination-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  Next 
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}


