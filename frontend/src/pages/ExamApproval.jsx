
import React, { useState, useEffect } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api') + '/api';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STATUS_META = {
  draft:            { label: 'Draft',            color: '#94a3b8', bg: '#f1f5f9' },
  pending_approval: { label: 'Pending Approval',  color: '#d97706', bg: '#fffbeb' },
  approved:         { label: 'Approved',          color: '#059669', bg: '#ecfdf5' },
  scheduled:        { label: 'Scheduled',         color: '#7055C8', bg: '#f3f0ff' },
  live:             { label: 'Live',              color: '#dc2626', bg: '#fef2f2' },
  completed:        { label: 'Completed',         color: '#6b7280', bg: '#f9fafb' },
  cancelled:        { label: 'Cancelled',         color: '#ef4444', bg: '#fef2f2' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

function ApproveModal({ exam, onClose, onApproved }) {
  const now        = new Date();
  const padDate    = d => d.toISOString().slice(0, 16);
  const [start, setStart]    = useState(padDate(new Date(now.getTime() + 60 * 60 * 1000)));
  const [end,   setEnd]      = useState(padDate(new Date(now.getTime() + 3 * 60 * 60 * 1000)));
  const [dur,   setDur]      = useState(exam.duration_minutes || 60);
  const [busy,  setBusy]     = useState(false);
  const [err,   setErr]      = useState('');

  async function approve() {
    if (!start || !end) return setErr('Start and end date are required');
    if (new Date(end) <= new Date(start)) return setErr('End must be after start');
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API}/exams/${exam.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ start_date: start, end_date: end, duration_minutes: dur }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onApproved(data);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1060', marginBottom: 6 }}>
          Approve Exam
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
          <strong>{exam.title}</strong> · {exam.college} · Batch {exam.batch_year}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Start Date & Time *
            </label>
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              End Date & Time *
            </label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Duration (minutes)
            </label>
            <input type="number" value={dur} onChange={e => setDur(e.target.value)} min={10} max={300}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
          </div>

          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', background: '#fff',
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={approve} disabled={busy} style={{
              flex: 1, padding: '10px',
              background: busy ? '#a5f3c0' : 'linear-gradient(135deg,#059669,#10b981)',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 700, color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
            }}>
              {busy ? 'Approving…' : '✓ Approve & Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamRow({ exam, onApprove, onReject, onView }) {
  const qCount = exam.question_count || 0;
  const sCount = exam.student_count  || 0;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, color: '#1a1060', fontSize: 13 }}>{exam.title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{exam.exam_key}</div>
      </td>
      <td style={{ fontSize: 12, color: '#475569' }}>{exam.college}</td>
      <td style={{ fontSize: 12, color: '#475569' }}>{exam.batch_year}</td>
      <td>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#7055C8' }}>{qCount}</span>
      </td>
      <td><StatusBadge status={exam.status} /></td>
      <td style={{ fontSize: 12, color: '#475569' }}>
        {exam.start_date
          ? new Date(exam.start_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : <span style={{ color: '#94a3b8' }}>Not set</span>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onView(exam)} style={{
            padding: '4px 12px', border: '1px solid #e2e8f0',
            background: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600,
            color: '#475569', cursor: 'pointer',
          }}>View</button>

          {exam.status === 'pending_approval' && (
            <>
              <button onClick={() => onApprove(exam)} style={{
                padding: '4px 12px', border: 'none',
                background: 'linear-gradient(135deg,#059669,#10b981)',
                borderRadius: 6, fontSize: 11, fontWeight: 700,
                color: '#fff', cursor: 'pointer',
              }}>Approve</button>
              <button onClick={() => onReject(exam)} style={{
                padding: '4px 12px', border: '1px solid #fca5a5',
                background: '#fef2f2', borderRadius: 6, fontSize: 11, fontWeight: 600,
                color: '#dc2626', cursor: 'pointer',
              }}>Reject</button>
            </>
          )}

          {exam.status === 'approved' && (
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, padding: '4px 8px' }}>
              {sCount} students assigned
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ExamApproval() {
  const [exams,       setExams]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterStatus,setFilterStatus]= useState('pending_approval');
  const [approveExam, setApproveExam] = useState(null);
  const [viewExam,    setViewExam]    = useState(null);
  const [toast,       setToast]       = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function fetchExams() {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const res  = await fetch(`${API}/exams${params}`, { headers: authHeader() });
      const data = await res.json();
      setExams(data.exams || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchExams(); }, [filterStatus]);

  async function handleReject(exam) {
    if (!window.confirm(`Reject "${exam.title}" and move back to Draft?`)) return;
    await fetch(`${API}/exams/${exam.id}/reject`, { method: 'POST', headers: authHeader() });
    showToast('Exam rejected — moved to Draft');
    fetchExams();
  }

  function handleApproved(data) {
    setApproveExam(null);
    showToast(`✓ Exam approved! ${data.students_assigned} students notified.`);
    fetchExams();
  }

  const tabs = [
    { key: 'pending_approval', label: 'Pending Approval' },
    { key: 'approved',         label: 'Approved' },
    { key: 'draft',            label: 'Drafts' },
    { key: 'all',              label: 'All Exams' },
  ];

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, padding: 24 }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 9999,
            background: '#1a1060', color: '#fff', padding: '12px 20px',
            borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1060', marginBottom: 4 }}>
              Exam Approval
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Review, schedule and approve exams before they go live to students
            </p>
          </div>
          <button onClick={fetchExams} style={{
            padding: '8px 18px', border: '1.5px solid #e2e8f0',
            background: '#fff', borderRadius: 8, fontSize: 12,
            fontWeight: 600, color: '#475569', cursor: 'pointer',
          }}>↻ Refresh</button>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilterStatus(t.key)} style={{
              padding: '7px 16px', border: 'none',
              background: filterStatus === t.key ? '#7055C8' : 'transparent',
              color:      filterStatus === t.key ? '#fff'    : '#64748b',
              borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Pending alert */}
        {filterStatus === 'pending_approval' && exams.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fbbf24',
            borderRadius: 10, padding: '12px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#92400e',
          }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <strong>{exams.length} exam{exams.length !== 1 ? 's' : ''}</strong> awaiting your approval.
            Review and set date/time before students can see them.
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading exams…</div>
          ) : exams.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No exams found for this filter.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  {['Exam Title', 'College', 'Batch', 'Questions', 'Status', 'Scheduled For', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map(exam => (
                  <tr key={exam.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <ExamRow
                      exam={exam}
                      onApprove={e => setApproveExam(e)}
                      onReject={handleReject}
                      onView={e => setViewExam(e)}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Approve Modal */}
      {approveExam && (
        <ApproveModal
          exam={approveExam}
          onClose={() => setApproveExam(null)}
          onApproved={handleApproved}
        />
      )}

      {/* View Modal */}
      {viewExam && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => e.target === e.currentTarget && setViewExam(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1060', marginBottom: 4 }}>{viewExam.title}</h3>
            <StatusBadge status={viewExam.status} />
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['College',    viewExam.college],
                ['Batch',      viewExam.batch_year],
                ['Duration',   `${viewExam.duration_minutes} min`],
                ['Questions',  viewExam.question_count || '—'],
                ['Students',   viewExam.student_count  || '—'],
                ['Created',    new Date(viewExam.created_at).toLocaleDateString('en-IN')],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={() => setViewExam(null)} style={{
                flex: 1, padding: 10, border: '1.5px solid #e2e8f0',
                background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Close</button>
              {viewExam.status === 'pending_approval' && (
                <button onClick={() => { setViewExam(null); setApproveExam(viewExam); }} style={{
                  flex: 1, padding: 10, background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
                }}>Approve →</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

