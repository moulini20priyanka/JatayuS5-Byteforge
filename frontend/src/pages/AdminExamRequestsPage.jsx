// AdminExamRequestsPage.jsx — Professional admin review page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Icon paths ──────────────────────────────────────────────────
const IC = {
  refresh:  "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  check:    "M20 6L9 17L4 12",
  x:        "M18 6L6 18M6 6L18 18",
  plus:     "M12 5v14M5 12h14",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  info:     "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  calendar: "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock:    "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mic:      "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  sliders:  "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  award:    "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  close:    "M18 6L6 18M6 6L18 18",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
};

const Ic = ({ d, size = 14, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

// ── Data maps ───────────────────────────────────────────────────
const PATTERN_LABELS = {
  mcq_sql_coding:  "MCQ + SQL + Coding",
  mcq_only:        "Only MCQ",
  coding_only:     "Only Coding",
  aptitude_coding: "Aptitude + Coding",
  mcq_sql:         "MCQ + SQL",
  behavioral:      "Behavioral Assessment",
  combined:        "Combined Assessment",
};

const AI_VIVA_LABELS = {
  voice:  "Voice Interview",
  typing: "Typing Interview",
  both:   "Voice + Typing",
};

const SECTION_META = {
  mcq:        { label: "MCQ",        color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  sql:        { label: "SQL",        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  coding:     { label: "Coding",     color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  aptitude:   { label: "Aptitude",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  behavioral: { label: "Behavioral", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const STATUS = {
  pending:   { label: "Pending",   dot: "#f59e0b", bg: "#fef3c7", color: "#b45309" },
  approved:  { label: "Approved",  dot: "#10b981", bg: "#d1fae5", color: "#065f46" },
  rejected:  { label: "Rejected",  dot: "#ef4444", bg: "#fee2e2", color: "#991b1b" },
};

// ── Helpers ─────────────────────────────────────────────────────
const safeParse = (val, fallback = {}) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const getTotalDuration = (sc) => {
  if (!sc) return 0;
  return Object.values(sc).reduce((t, s) => t + (s.enabled && s.minutes ? parseInt(s.minutes) : 0), 0);
};

// ── FIX: Normalize status to lowercase to handle DB case mismatches ──────────
const normalizeStatus = (status) => {
  if (!status) return 'pending';
  return status.toLowerCase().trim();
};

export default function AdminExamRequestsPage() {
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('pending');
  const [actionLoad,   setActionLoad]   = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selected,     setSelected]     = useState(null);
  const [showFullJD,   setShowFullJD]   = useState(false);

  const adminId = localStorage.getItem('user_id') || 1;
  const token   = localStorage.getItem('token');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/exam-requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = data.map(req => ({
        ...req,
        // ── FIX: normalize status to lowercase so === 'pending' / 'approved' checks work ──
        status:               normalizeStatus(req.status),
        section_config:       safeParse(req.section_config,       {}),
        eligibility_criteria: safeParse(req.eligibility_criteria, {}),
        sectional_cutoffs:    safeParse(req.sectional_cutoffs,    {}),
      }));
      setRequests(parsed);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load exam requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id, jobRole) => {
    setActionLoad(id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved', approved_by: adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`"${jobRole}" approved`, 'success');
      fetchRequests();
      setSelected(null);
    } catch (e) {
      showToast(e.message || 'Approval failed', 'error');
    } finally { setActionLoad(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoad(rejectModal.id);
    try {
      const res  = await fetch(`${API}/api/exam-requests/${rejectModal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'rejected', approved_by: adminId, reject_reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Request rejected', 'info');
      setRejectModal(null); setRejectReason('');
      fetchRequests(); setSelected(null);
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally { setActionLoad(null); }
  };

  // ── Navigate to CreateExam with pre-filled data ──────────────
  const handleCreateExam = (request) => {
    navigate('/create-exam', {
      state: {
        fromRequest: true,
        requestData: request,
      }
    });
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const counts   = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f9ff' }}>
      <Sidebar />
      <Navbar />

      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Exam Requests</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Review and approve recruiter placement exam requests</p>
          </div>
          <button onClick={fetchRequests}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic d={IC.refresh} size={12} color="#64748b" />
            Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all',       label: 'All',       dot: '#94a3b8' },
            { key: 'pending',   label: 'Pending',   dot: '#f59e0b' },
            { key: 'approved',  label: 'Approved',  dot: '#10b981' },
            { key: 'rejected',  label: 'Rejected',  dot: '#ef4444' },
          ].map(f => {
            const ss = STATUS[f.key] || {};
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${active ? f.dot : '#e5e7eb'}`, background: active ? f.dot + '14' : '#fff', color: active ? (ss.color || '#0f172a') : '#6b7280' }}>
                {f.key !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? f.dot : '#cbd5e1' }} />}
                {f.label}
                <span style={{ background: active ? f.dot : '#e5e7eb', color: active ? '#fff' : '#6b7280', borderRadius: 20, padding: '0 7px', fontSize: 11, fontWeight: 700 }}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Table panel */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc, #f0f9ff)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading requests...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ marginBottom: 10, opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                  <Ic d={IC.layers} size={32} color="#94a3b8" sw={1.2} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {filter === 'pending' ? 'No pending requests.' : 'No requests found.'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '980px', width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['#','Job Role','Pattern','Schedule','College','Recruiter','Submitted','Status','Actions'].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const ss         = STATUS[r.status] || STATUS.pending;
                      const isSelected = selected?.id === r.id;
                      const patLabel   = PATTERN_LABELS[r.assessment_pattern] || r.assessment_pattern || '—';
                      const totalMin   = getTotalDuration(r.section_config);
                      const schedDate  = r.schedule_date ? new Date(r.schedule_date).toLocaleDateString() : 'Not set';
                      return (
                        <tr key={r.id}
                          style={{ cursor: 'pointer', background: isSelected ? '#f0f9ff' : 'transparent', transition: 'background 0.15s', borderBottom: '1px solid #f1f5f9' }}
                          onClick={() => setSelected(isSelected ? null : r)}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#0ea5e9', fontWeight: 600 }}>#{r.id}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.job_role}</td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                            <div>{patLabel}</div>
                            {totalMin > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{totalMin} min total</div>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                            <div>{schedDate}</div>
                            {r.schedule_time && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{r.schedule_time}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{r.target_college || 'Any'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.recruiter_name || `#${r.recruiter_id}`}</div>
                            {r.company_name && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{r.company_name}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: ss.bg, color: ss.color }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ss.dot }} />
                              {ss.label}
                            </span>
                          </td>
                          {/* ── FIX: Actions column — status is now always lowercase ── */}
                          <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  disabled={actionLoad === r.id}
                                  onClick={() => handleApprove(r.id, r.job_role)}
                                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #6ee7b7', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Ic d={IC.check} size={11} color="#059669" sw={2.5} />
                                  {actionLoad === r.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  disabled={actionLoad === r.id}
                                  onClick={() => { setRejectModal({ id: r.id, jobRole: r.job_role }); setRejectReason(''); }}
                                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Ic d={IC.x} size={11} color="#dc2626" sw={2.5} />
                                  Reject
                                </button>
                              </div>
                            ) : r.status === 'approved' ? (
                              <button
                                onClick={() => handleCreateExam(r)}
                                style={{
                                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  cursor: 'pointer', border: '1px solid #a78bfa',
                                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                  color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                                  boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
                                }}>
                                <Ic d={IC.arrowRight} size={11} color="#fff" sw={2.5} />
                                Create Exam
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
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

          {/* Detail Panel */}
          {selected && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc, #f0f9ff)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Request Details</span>
                <button onClick={() => setSelected(null)}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic d={IC.close} size={13} color="#64748b" />
                </button>
              </div>

              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#d9f2f4', color: '#0e9090', border: '1px solid #a5f0ec', letterSpacing: '0.4px' }}>
                    PLACEMENT
                  </span>
                  {(() => {
                    const ss = STATUS[selected.status] || STATUS.pending;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: ss.bg, color: ss.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: ss.dot }} />
                        {ss.label}
                      </span>
                    );
                  })()}
                </div>

                <div>
                  <DetailLabel>Job Role</DetailLabel>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{selected.job_role}</div>
                </div>

                {selected.job_description && (
                  <div>
                    <DetailLabel>Job Description</DetailLabel>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7, background: '#f8fafc', borderRadius: 8, padding: 12, maxHeight: showFullJD ? 'none' : 140, overflow: 'hidden', position: 'relative' }}>
                      {selected.job_description}
                      {!showFullJD && selected.job_description.length > 280 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(transparent, #f8fafc)', pointerEvents: 'none' }} />
                      )}
                    </div>
                    {selected.job_description.length > 280 && (
                      <button onClick={() => setShowFullJD(v => !v)} style={{ fontSize: 11, color: '#0ea5e9', marginTop: 5, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        {showFullJD ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <DetailLabel icon={IC.sliders}>Assessment Configuration</DetailLabel>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>
                      {PATTERN_LABELS[selected.assessment_pattern] || selected.assessment_pattern || '—'}
                    </div>
                    {selected.section_config && Object.entries(selected.section_config).map(([key, cfg]) => {
                      if (!cfg.enabled) return null;
                      const m = SECTION_META[key];
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: m.bg, border: `1px solid ${m.border}` }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.label}</span>
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{cfg.questions || 0} Qs · {cfg.minutes || 0} min</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selected.sectional_cutoff_required && selected.sectional_cutoffs && (
                  <div>
                    <DetailLabel icon={IC.scissors}>Sectional Cutoff</DetailLabel>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 12, border: '1px solid #bae6fd' }}>
                      {Object.entries(selected.sectional_cutoffs).filter(([, v]) => v).map(([key, val]) => {
                        const m = SECTION_META[key];
                        if (!m) return null;
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.label}</span>
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 4 }}>{val}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(selected.schedule_date || selected.schedule_time) && (
                  <div>
                    <DetailLabel icon={IC.calendar}>Schedule</DetailLabel>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>DATE</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selected.schedule_date ? new Date(selected.schedule_date).toLocaleDateString() : '—'}</div>
                      </div>
                      {selected.schedule_time && (
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>TIME</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selected.schedule_time}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.ai_viva_mode && (
                  <div>
                    <DetailLabel icon={IC.mic}>AI Viva Interview</DetailLabel>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                      {AI_VIVA_LABELS[selected.ai_viva_mode] || selected.ai_viva_mode}
                    </div>
                  </div>
                )}

                {selected.eligibility_criteria && (
                  selected.eligibility_criteria.min_cgpa ||
                  selected.eligibility_criteria.min_10th_percentage ||
                  selected.eligibility_criteria.min_12th_percentage
                ) && (
                  <div>
                    <DetailLabel icon={IC.award}>Eligibility Criteria</DetailLabel>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {[
                          ['CGPA', selected.eligibility_criteria.min_cgpa],
                          ['10th %', selected.eligibility_criteria.min_10th_percentage && `${selected.eligibility_criteria.min_10th_percentage}%`],
                          ['12th %', selected.eligibility_criteria.min_12th_percentage && `${selected.eligibility_criteria.min_12th_percentage}%`],
                        ].map(([label, val]) => val ? (
                          <div key={label} style={{ background: '#fff', borderRadius: 6, padding: '7px 10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px' }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{val}</div>
                          </div>
                        ) : null)}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        <strong style={{ color: '#334155' }}>Target: </strong>
                        {selected.eligibility_criteria.selection_mode === 'percentage'
                          ? `Top ${selected.eligibility_criteria.target_percentage || 0}% of students`
                          : `Top ${selected.eligibility_criteria.target_count || 0} students`}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['Target College', selected.target_college || 'Any'], ['Batch Year', selected.target_batch_year || '—']].map(([label, val]) => (
                    <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 6 }}>Recruiter</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selected.recruiter_name || `Recruiter #${selected.recruiter_id}`}</div>
                  {selected.company_name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.company_name}</div>}
                  {selected.recruiter_email && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>{selected.recruiter_email}</div>}
                </div>

                {selected.specifications && (
                  <div>
                    <DetailLabel>Additional Specifications</DetailLabel>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                      {selected.specifications}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Submitted: {new Date(selected.created_at).toLocaleString()}
                </div>

                {/* Action buttons in detail panel */}
                {selected.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleApprove(selected.id, selected.job_role)}
                      disabled={actionLoad === selected.id}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #6ee7b7', background: '#ecfdf5', color: '#059669', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <Ic d={IC.check} size={14} color="#059669" sw={2.5} />
                      {actionLoad === selected.id ? 'Approving...' : 'Approve Request'}
                    </button>
                    <button onClick={() => { setRejectModal({ id: selected.id, jobRole: selected.job_role }); setRejectReason(''); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <Ic d={IC.x} size={14} color="#dc2626" sw={2.5} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Create Exam button in detail panel for approved requests */}
                {selected.status === 'approved' && (
                  <button
                    onClick={() => handleCreateExam(selected)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                    }}>
                    <Ic d={IC.arrowRight} size={15} color="#fff" sw={2.5} />
                    Create Exam from This Request
                  </button>
                )}

                {/* Rejection reason for rejected requests */}
                {selected.status === 'rejected' && selected.reject_reason && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Rejection Reason</div>
                    <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>{selected.reject_reason}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.x} size={15} color="#dc2626" sw={2.5} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Reject Request</h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Rejecting <strong style={{ color: '#0f172a' }}>"{rejectModal.jobRole}"</strong>. Optionally provide a reason.
            </p>
            <textarea rows={3} placeholder="Reason for rejection (optional)"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={actionLoad === rejectModal.id}
                style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ic d={IC.x} size={12} color="#fff" sw={2.5} />
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

function DetailLabel({ children, icon }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 4 }}>
      {icon && (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d={icon} />
        </svg>
      )}
      {children}
    </div>
  );
}