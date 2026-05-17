

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  pageBg: '#f4f6fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9',
  navy: '#0f1f3d', navyMid: '#1e3a5f',
  blue: '#2563eb', blueDk: '#1d4ed8', blueLt: '#eff6ff', blueBd: '#bfdbfe',
  ink: '#0f172a', inkMid: '#334155', inkSub: '#64748b', inkMuted: '#94a3b8',
  border: '#e2e8f0', borderMid: '#cbd5e1',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#a7f3d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#c4b5fd',
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
.btn-sm-gr:hover{background:#d1fae5} .btn-sm-gr:disabled{opacity:.5;cursor:not-allowed}
.btn-sm-rd{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:${C.redBg};color:${C.red};border:1px solid ${C.redBd};border-radius:7px;font-size:12px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .12s}
.btn-sm-rd:hover{background:#fee2e2} .btn-sm-rd:disabled{opacity:.5;cursor:not-allowed}
.btn-purple{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;background:${C.purple};color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;font-family:${C.font};cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(124,58,237,.25)}
.btn-purple:hover{background:#6d28d9;transform:translateY(-1px)}
.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:${C.red};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-danger:hover{background:#b91c1c;transform:translateY(-1px)} .btn-danger:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-ghost{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:${C.inkSub};border:1px solid ${C.border};border-radius:7px;font-size:12px;font-weight:500;font-family:${C.font};cursor:pointer;transition:all .15s}
.btn-ghost:hover{background:${C.hover};color:${C.inkMid}}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);overflow:hidden}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.card-title{font-size:13.5px;font-weight:700;color:${C.navy}}
.card-meta{font-size:12px;color:${C.inkSub}}
.filter-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.filter-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:${C.font};border:1.5px solid ${C.border};background:${C.surface};color:${C.inkSub}}
.filter-chip.fc-active{border-color:${C.blue};background:${C.blueLt};color:${C.blue}}
.chip-count{border-radius:20px;padding:0 7px;font-size:11px;font-weight:700;background:${C.border};color:${C.inkSub}}
.fc-active .chip-count{background:${C.blueBd};color:${C.blueDk}}
.main-grid{display:grid;gap:20px;align-items:start}
.main-grid.split{grid-template-columns:1fr 400px}
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:${C.subtle};border-bottom:1.5px solid ${C.border}}
.tbl th{padding:11px 16px;text-align:left;font-size:10.5px;font-weight:700;color:${C.inkSub};text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.tbl tbody tr{border-bottom:1px solid ${C.border};transition:background .12s;cursor:pointer}
.tbl tbody tr:last-child{border-bottom:none}
.tbl tbody tr:hover{background:${C.hover}}
.tbl tbody tr.selected{background:${C.blueLt}}
.tbl td{padding:12px 16px;vertical-align:middle}
.bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap}
.bdg-bl{background:${C.blueLt};color:${C.blue};border-color:${C.blueBd}}
.bdg-gr{background:${C.greenBg};color:${C.green};border-color:${C.greenBd}}
.bdg-am{background:${C.amberBg};color:${C.amber};border-color:${C.amberBd}}
.bdg-rd{background:${C.redBg};color:${C.red};border-color:${C.redBd}}
.bdg-nt{background:${C.subtle};color:${C.inkSub};border-color:${C.border}}
.bdg-pu{background:${C.purpleBg};color:${C.purple};border-color:${C.purpleBd}}
.mono{font-family:${C.mono};font-size:12px}
.detail-panel{background:${C.surface};border:1px solid ${C.border};border-radius:14px;box-shadow:0 1px 4px rgba(15,31,61,.06);position:sticky;top:20px;max-height:calc(100vh - 100px);overflow-y:auto}
.detail-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${C.border};background:${C.subtle}}
.detail-body{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.detail-lbl{font-size:10px;font-weight:700;color:${C.inkMuted};text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;display:block}
.detail-val{font-size:13px;color:${C.inkMid}}
.detail-field{background:${C.subtle};border-radius:8px;padding:10px 12px;border:1px solid ${C.border}}
.info-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:ap-spin .7s linear infinite;margin:0 auto}
.spin-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ap-spin .7s linear infinite;display:inline-block}
@keyframes ap-spin{to{transform:rotate(360deg)}}
.empty{padding:52px;text-align:center;color:${C.inkMuted};font-size:13px}
.loading{padding:36px;text-align:center;color:${C.inkMuted};font-size:13px}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px)}
.modal-box{background:${C.surface};border-radius:16px;padding:28px;width:440px;box-shadow:0 24px 64px rgba(0,0,0,.2)}
.field-lbl{font-size:12px;font-weight:600;color:${C.inkMid};margin-bottom:6px;display:block}
.field-ta{width:100%;padding:10px 12px;border:1.5px solid ${C.border};border-radius:9px;font-size:13px;font-family:${C.font};resize:none;outline:none;color:${C.ink};background:${C.subtle};transition:border-color .15s}
.field-ta:focus{border-color:${C.blue};background:${C.surface}}
.sect-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;font-size:10.5px;font-weight:700}
.err-banner{display:flex;align-items:center;gap:10px;padding:12px 16px;background:${C.redBg};border:1px solid ${C.redBd};border-radius:10px;font-size:13px;color:${C.red};margin-bottom:16px}
`;

const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const IC = {
  refresh:  "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  check:    "M20 6L9 17L4 12",
  x:        "M18 6L6 18M6 6L18 18",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  close:    "M18 6L6 18M6 6L18 18",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};

const PATTERN_LABELS = {
  mcq_sql_coding: "MCQ + SQL + Coding", mcq_only: "Only MCQ",
  coding_only: "Only Coding", aptitude_coding: "Aptitude + Coding",
  mcq_sql: "MCQ + SQL", behavioral: "Behavioral", combined: "Combined",
};
const SECTION_META = {
  mcq:        { color: C.blue,   bg: C.blueLt,  border: C.blueBd },
  sql:        { color: C.purple, bg: C.purpleBg, border: C.purpleBd },
  coding:     { color: C.amber,  bg: C.amberBg,  border: C.amberBd },
  aptitude:   { color: C.green,  bg: C.greenBg,  border: C.greenBd },
  behavioral: { color: C.red,    bg: C.redBg,    border: C.redBd },
};
const STATUS_MAP = {
  pending:  { cls: 'bdg-am', dot: C.amber, label: 'Pending' },
  approved: { cls: 'bdg-gr', dot: C.green, label: 'Approved' },
  rejected: { cls: 'bdg-rd', dot: C.red,   label: 'Rejected' },
};

// ─── F-1 + F-2: safeParse — handles Buffer, number, boolean, null, string, object
// mysql2 can return JSON columns as:
//   • Buffers (older configs without typeCast: true)
//   • Already-parsed objects (newer mysql2 + MySQL 5.7.8+ JSON columns)
//   • Plain strings (explicit CAST or older MySQL)
//   • null/undefined
// We normalise all of these to a plain JS value.
const safeParse = (v, fb = {}) => {
  // Nothing there
  if (v === null || v === undefined) return fb;

  // Buffer / Uint8Array from mysql2 — convert to string first
  // (Buffer extends Uint8Array, so this catches both)
  if (typeof v === 'object' && (v instanceof Uint8Array || Buffer.isBuffer?.(v))) {
    try { return JSON.parse(v.toString('utf8')); }
    catch { return fb; }
  }

  // Already a plain object (mysql2 auto-parsed JSON column)
  if (typeof v === 'object' && !Array.isArray(v)) return v;

  // Array returned where we expected an object — use fallback
  if (Array.isArray(v)) return fb;

  // Number / boolean / other primitive — stringify then parse so
  // the caller always gets the declared fallback type
  if (typeof v !== 'string') {
    try { return JSON.parse(String(v)); }
    catch { return fb; }
  }

  // Plain string — standard JSON.parse
  try { return JSON.parse(v); }
  catch { return fb; }
};

// ─── normalizeStatus: single source of truth for status string normalisation
const normalizeStatus = s =>
  (s === null || s === undefined ? 'pending' : String(s).toLowerCase().trim());

function StatusBadge({ status }) {
  const key = normalizeStatus(status);
  const m   = STATUS_MAP[key] || STATUS_MAP.pending;
  return (
    <span className={`bdg ${m.cls}`}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

// ─── F-3: normalizeRow — each JSON field parsed individually with descriptive
//     warnings so a broken column doesn't silently drop the whole row
const normalizeRow = r => {
  let section_config       = {};
  let eligibility_criteria = {};
  let sectional_cutoffs    = {};

  try { section_config       = safeParse(r.section_config,       {}); }
  catch (e) { console.warn(`[normalizeRow] id=${r.id} section_config parse failed:`, e); }

  try { eligibility_criteria = safeParse(r.eligibility_criteria, {}); }
  catch (e) { console.warn(`[normalizeRow] id=${r.id} eligibility_criteria parse failed:`, e); }

  try { sectional_cutoffs    = safeParse(r.sectional_cutoffs,    {}); }
  catch (e) { console.warn(`[normalizeRow] id=${r.id} sectional_cutoffs parse failed:`, e); }

  return {
    ...r,
    status:               normalizeStatus(r.status),
    section_config,
    eligibility_criteria,
    sectional_cutoffs,
  };
};

export default function AdminExamRequestsPage() {
  const { showToast } = useApp();
  const navigate      = useNavigate();

  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);   // F-5: surface auth/server errors
  const [filter,       setFilter]       = useState('all');
  const [actionLoad,   setActionLoad]   = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selected,     setSelected]     = useState(null);
  const [showFullJD,   setShowFullJD]   = useState(false);

  // F-10: adminId — parseInt + isFinite guard; null if missing (not 1)
  const rawId   = localStorage.getItem('user_id');
  const adminId = rawId && rawId !== 'null' ? (
    Number.isFinite(parseInt(rawId, 10)) ? parseInt(rawId, 10) : null
  ) : null;
  const token = localStorage.getItem('token');

  // ─── fetchRequests ───────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API}/api/exam-requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // F-4 + F-5: distinguish auth failures from server errors
      if (!res.ok) {
        let errMsg = `Server returned ${res.status}`;
        try {
          const errBody = await res.json();
          errMsg = errBody.error || errMsg;
        } catch { /* body wasn't JSON */ }

        console.error('[fetchRequests] HTTP error:', res.status, errMsg);

        if (res.status === 401 || res.status === 403) {
          const msg = 'Session expired — please log in again';
          setFetchError(msg);
          showToast(msg, 'error');
        } else {
          const msg = `Failed to load requests: ${errMsg}`;
          setFetchError(msg);
          showToast(msg, 'error');
        }
        setRequests([]);
        setSelected(null);
        return;
      }

      const data = await res.json();

      // F-3: per-row normalisation with warnings — a bad row does NOT drop
      // the entire list; it is kept with safe defaults
      const normalized = data.map(r => {
        try {
          return normalizeRow(r);
        } catch (e) {
          console.error(`[fetchRequests] normalizeRow failed for id=${r?.id}:`, e);
          return {
            ...r,
            status:               normalizeStatus(r?.status),
            section_config:       {},
            eligibility_criteria: {},
            sectional_cutoffs:    {},
          };
        }
      });

      setRequests(normalized);

      // Keep the detail panel in sync after refresh
      setSelected(prev => {
        if (!prev) return null;
        const refreshed = normalized.find(r => r.id === prev.id);
        return refreshed || null;
      });
    } catch (err) {
      // Network-level failure (CORS, DNS, etc.)
      console.error('[fetchRequests] Network error:', err);
      const msg = 'Could not reach the server — check your connection';
      setFetchError(msg);
      showToast(msg, 'error');
      setRequests([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── handleApprove ───────────────────────────────────────────────────────
  const handleApprove = async (id, jobRole) => {
    setActionLoad(id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: 'approved', approved_by: adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast(`"${jobRole}" approved`, 'success');
      await fetchRequests();   // selected synced inside fetchRequests (F-9)
    } catch (e) {
      console.error('[handleApprove]', e);
      showToast(e.message || 'Approval failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  // ─── handleReject ────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoad(rejectModal.id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${rejectModal.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          status:        'rejected',
          approved_by:   adminId,
          reject_reason: rejectReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast('Request rejected', 'info');
      setRejectModal(null);
      setRejectReason('');
      await fetchRequests();
    } catch (e) {
      console.error('[handleReject]', e);
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setActionLoad(null);
    }
  };

  const handleCreateExam = r =>
    navigate('/create-exam', { state: { fromRequest: true, requestData: r } });

  // ─── F-6: counts + filtered — String() cast as last-resort guard ─────────
  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => normalizeStatus(r.status) === 'pending').length,
    approved: requests.filter(r => normalizeStatus(r.status) === 'approved').length,
    rejected: requests.filter(r => normalizeStatus(r.status) === 'rejected').length,
  };

  const filtered =
    filter === 'all'
      ? requests
      : requests.filter(r => normalizeStatus(r.status) === filter);

  const FILTERS = [
    { key: 'all',      label: 'All'      },
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const DetailLabel = ({ children }) => <span className="detail-lbl">{children}</span>;

  return (
    <div className="ap">
      <style>{G}</style>
      <Sidebar /><Navbar />

      <main className="ap-main">
        <div className="ap-hdr">
          <div className="ap-hdr-l">
            <h1 className="ap-title">Exam Requests</h1>
            <p className="ap-sub">Review and approve recruiter placement exam requests</p>
          </div>
          <div className="ap-hdr-r">
            <button className="btn-sec" onClick={fetchRequests} disabled={loading}>
              <Ic d={IC.refresh} size={13} color={C.inkSub} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* F-5: persistent error banner so the admin knows WHY the list is empty */}
        {fetchError && !loading && (
          <div className="err-banner">
            <Ic d={IC.alert} size={16} color={C.red} />
            <span>{fetchError}</span>
            <button
              onClick={fetchRequests}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.red,
                       fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: C.font }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="filter-row">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? 'fc-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}<span className="chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className={`main-grid ${selected ? 'split' : ''}`}>

          {/* ── Table ─────────────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-hdr">
              <div className="card-title">
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests
              </div>
              <span className="card-meta">
                {filtered.length} request{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="tbl-wrap">
              {loading ? (
                <div className="loading">
                  <div className="spinner" style={{ marginBottom: 12 }} />
                  Loading requests…
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <Ic d={IC.layers} size={32} color={C.blue} sw={1.2} />
                  <div style={{ marginTop: 12 }}>
                    {filter === 'pending'
                      ? 'No pending requests — all caught up!'
                      : filter === 'approved'
                      ? 'No approved requests yet.'
                      : filter === 'rejected'
                      ? 'No rejected requests.'
                      : 'No requests found.'}
                  </div>
                </div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th><th>Job Role</th><th>Pattern</th><th>Schedule</th>
                      <th>College</th><th>Recruiter</th><th>Submitted</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const sc   = r.section_config || {};
                      const mins = Object.values(sc).reduce(
                        (t, s) => t + (s?.enabled && s?.minutes ? parseInt(s.minutes, 10) : 0),
                        0
                      );

                      // F-8: always normalise at the comparison site
                      const rowStatus = normalizeStatus(r.status);

                      return (
                        <tr
                          key={r.id}
                          className={selected?.id === r.id ? 'selected' : ''}
                          // F-7: look up from normalized `requests` array by id
                          onClick={() => {
                            const norm = requests.find(req => req.id === r.id) || r;
                            setSelected(prev => prev?.id === norm.id ? null : norm);
                          }}
                        >
                          <td>
                            <span className="mono" style={{ color: C.blue, fontWeight: 600 }}>
                              #{r.id}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: C.navy }}>{r.job_role}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: C.inkMid }}>
                              {PATTERN_LABELS[r.assessment_pattern] || r.assessment_pattern || '—'}
                            </div>
                            {mins > 0 && (
                              <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 2 }}>
                                {mins} min
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="mono">
                              {r.schedule_date
                                ? new Date(r.schedule_date).toLocaleDateString()
                                : 'Not set'}
                            </div>
                            {r.schedule_time && (
                              <div style={{ fontSize: 10, color: C.inkMuted }}>{r.schedule_time}</div>
                            )}
                          </td>
                          <td style={{ color: C.inkSub, fontSize: 12 }}>{r.target_college || 'Any'}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: C.navy, fontSize: 12 }}>
                              {r.recruiter_name || `#${r.recruiter_id}`}
                            </div>
                            {r.company_name && (
                              <div style={{ color: C.inkMuted, fontSize: 11 }}>{r.company_name}</div>
                            )}
                          </td>
                          <td>
                            <span className="mono">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            {/* F-8: StatusBadge calls normalizeStatus internally */}
                            <StatusBadge status={rowStatus} />
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            {/* F-8: use rowStatus (already normalised) for ALL comparisons */}
                            {rowStatus === 'pending' ? (
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  className="btn-sm-gr"
                                  disabled={actionLoad === r.id}
                                  onClick={() => handleApprove(r.id, r.job_role)}
                                >
                                  <Ic d={IC.check} size={11} color={C.green} sw={2.5} />
                                  {actionLoad === r.id ? '…' : 'Approve'}
                                </button>
                                <button
                                  className="btn-sm-rd"
                                  disabled={actionLoad === r.id}
                                  onClick={() => {
                                    setRejectModal({ id: r.id, jobRole: r.job_role });
                                    setRejectReason('');
                                  }}
                                >
                                  <Ic d={IC.x} size={11} color={C.red} sw={2.5} />Reject
                                </button>
                              </div>
                            ) : rowStatus === 'approved' ? (
                              <button className="btn-purple" onClick={() => handleCreateExam(r)}>
                                <Ic d={IC.arrow} size={11} color="#fff" sw={2.5} />Create Exam
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: C.inkMuted, fontStyle: 'italic' }}>
                                {r.reject_reason || '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Detail Panel ──────────────────────────────────────────────── */}
          {selected && (
            <div className="detail-panel">
              <div className="detail-hdr">
                <span className="card-title">Request Details</span>
                <button
                  className="btn-ghost"
                  style={{ padding: '5px 8px' }}
                  onClick={() => setSelected(null)}
                >
                  <Ic d={IC.close} size={13} color={C.inkSub} />
                </button>
              </div>

              <div className="detail-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="bdg bdg-bl" style={{ fontSize: 10 }}>PLACEMENT</span>
                  <StatusBadge status={selected.status} />
                </div>

                <div>
                  <DetailLabel>Job Role</DetailLabel>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>
                    {selected.job_role}
                  </div>
                </div>

                {selected.job_description && (
                  <div>
                    <DetailLabel>Job Description</DetailLabel>
                    <div style={{
                      fontSize: 12, color: C.inkMid, lineHeight: 1.7,
                      background: C.subtle, borderRadius: 8, padding: 12,
                      maxHeight: showFullJD ? 'none' : 130,
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {selected.job_description}
                      {!showFullJD && selected.job_description.length > 260 && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: 40,
                          background: `linear-gradient(transparent, ${C.subtle})`,
                        }} />
                      )}
                    </div>
                    {selected.job_description.length > 260 && (
                      <button
                        onClick={() => setShowFullJD(v => !v)}
                        style={{
                          fontSize: 11, color: C.blue, background: 'none', border: 'none',
                          cursor: 'pointer', fontWeight: 600, marginTop: 4, padding: 0,
                        }}
                      >
                        {showFullJD ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <DetailLabel>Assessment Pattern</DetailLabel>
                  <div className="detail-field">
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 8 }}>
                      {PATTERN_LABELS[selected.assessment_pattern] || selected.assessment_pattern || '—'}
                    </div>
                    {selected.section_config &&
                      Object.entries(selected.section_config).map(([key, cfg]) => {
                        if (!cfg?.enabled) return null;
                        const m = SECTION_META[key];
                        if (!m) return null;
                        return (
                          <div
                            key={key}
                            style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', marginBottom: 5,
                            }}
                          >
                            <span
                              className="sect-chip"
                              style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />
                              {key.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, color: C.inkSub }}>
                              {cfg.questions || 0} Qs · {cfg.minutes || 0} min
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {(selected.schedule_date || selected.schedule_time) && (
                  <div>
                    <DetailLabel>Schedule</DetailLabel>
                    <div className="detail-field info-row">
                      <div>
                        <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 3 }}>DATE</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                          {selected.schedule_date
                            ? new Date(selected.schedule_date).toLocaleDateString()
                            : '—'}
                        </div>
                      </div>
                      {selected.schedule_time && (
                        <div>
                          <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 3 }}>TIME</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{selected.schedule_time}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="info-row">
                  {[
                    ['Target College', selected.target_college || 'Any'],
                    ['Batch Year',     selected.target_batch_year || '—'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="detail-field">
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: C.inkMuted,
                        textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4,
                      }}>
                        {lbl}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div className="detail-field">
                  <DetailLabel>Recruiter</DetailLabel>
                  <div style={{ fontWeight: 600, color: C.navy, fontSize: 13 }}>
                    {selected.recruiter_name || `Recruiter #${selected.recruiter_id}`}
                  </div>
                  {selected.company_name && (
                    <div style={{ fontSize: 12, color: C.inkSub, marginTop: 2 }}>
                      {selected.company_name}
                    </div>
                  )}
                  {selected.recruiter_email && (
                    <div className="mono" style={{ color: C.inkMuted, marginTop: 2 }}>
                      {selected.recruiter_email}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: C.inkMuted }}>
                  Submitted: {new Date(selected.created_at).toLocaleString()}
                </div>

                {/* F-8: normaliseStatus at every comparison site in the detail panel */}
                {normalizeStatus(selected.status) === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn-sm-gr"
                      style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                      onClick={() => handleApprove(selected.id, selected.job_role)}
                      disabled={actionLoad === selected.id}
                    >
                      <Ic d={IC.check} size={13} color={C.green} sw={2.5} />
                      {actionLoad === selected.id ? 'Approving…' : 'Approve Request'}
                    </button>
                    <button
                      className="btn-sm-rd"
                      style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                      onClick={() => {
                        setRejectModal({ id: selected.id, jobRole: selected.job_role });
                        setRejectReason('');
                      }}
                    >
                      <Ic d={IC.x} size={13} color={C.red} sw={2.5} />Reject
                    </button>
                  </div>
                )}

                {normalizeStatus(selected.status) === 'approved' && (
                  <button
                    className="btn-purple"
                    style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
                    onClick={() => handleCreateExam(selected)}
                  >
                    <Ic d={IC.arrow} size={14} color="#fff" sw={2.5} />
                    Create Exam from This Request
                  </button>
                )}

                {normalizeStatus(selected.status) === 'rejected' && selected.reject_reason && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: C.redBg, border: `1px solid ${C.redBd}`,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: C.red,
                      textTransform: 'uppercase', marginBottom: 4,
                    }}>
                      Rejection Reason
                    </div>
                    <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>
                      {selected.reject_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: C.redBg, border: `1px solid ${C.redBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Ic d={IC.x} size={15} color={C.red} sw={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>Reject Request</div>
                <div style={{ fontSize: 12, color: C.inkSub }}>
                  Rejecting "{rejectModal.jobRole}"
                </div>
              </div>
            </div>
            <label className="field-lbl">
              Reason for rejection{' '}
              <span style={{ color: C.inkMuted, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              rows={3}
              className="field-ta"
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-sec" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn-danger"
                disabled={actionLoad === rejectModal.id}
                onClick={handleReject}
              >
                {actionLoad === rejectModal.id
                  ? <><span className="spin-sm" /> Rejecting…</>
                  : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}