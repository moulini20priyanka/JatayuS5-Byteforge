// src/pages/StudentHiring.jsx
// FIXES v2:
//   • Filters exams by exam_type — only shows placement/hiring exams
//     University exams no longer appear here
//   • HIRING_TYPES constant defines which exam types belong here

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout, Icons, THEME as T } from './Studentdashboard ';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Exam types that belong to the Hiring/Placement page ───────────────────────
const HIRING_TYPES = ['placement', 'hiring', 'general', null, undefined, ''];

function SkeletonCard() {
  return (
    <div className="na-card" style={{ overflow: 'hidden' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ padding: '10px 15px', background: '#f1f5f9', height: 46, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[70, 50, 40].map(w => (
          <div key={w} style={{ height: 12, background: '#e2e8f0', borderRadius: 4, width: `${w}%`, animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    </div>
  );
}

function ExamCard({ exam, onStart }) {
  const isLive     = exam.status === 'live';
  const isDone     = exam.status === 'submitted';
  const isAssigned = exam.status === 'assigned';

  const tags = Object.keys(exam.sections || {})
    .filter(k => exam.sections[k])
    .map(k => k.toUpperCase());

  function formatDate(d) {
    if (!d) return 'Date TBD';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div
      className="na-card"
      style={{
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        borderColor: isLive ? '#dc262655' : isDone ? '#bbf7d0' : '#b8eaee',
        transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(43,177,168,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ padding: '10px 15px', background: '#d9f2f4', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid #2BB1A820' }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#2BB1A8' }}>
          {(exam.company_name || exam.college || 'E')[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2BB1A8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exam.company_name || exam.college || 'Assessment'}
        </span>
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', letterSpacing: '.5px' }}>LIVE</span>
          </div>
        )}
        {isDone && <span className="na-badge" style={{ background: '#d9f5ec', color: '#0a8f5c' }}><Icons.CheckCircle /> Done</span>}
        {isAssigned && !isLive && <span className="na-badge" style={{ background: '#d9f2f4', color: '#2BB1A8' }}>Assigned</span>}
      </div>

      <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>{exam.title}</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: T.dim, display: 'flex' }}><Icons.Clock /></span>
            <span style={{ fontSize: 12, color: T.muted }}>{exam.duration_minutes} min</span>
          </div>
          {exam.question_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: T.dim, display: 'flex' }}><Icons.Clipboard /></span>
              <span style={{ fontSize: 12, color: T.muted }}>{exam.question_count} Qs</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: T.dim, display: 'flex' }}><Icons.Calendar /></span>
          <span style={{ fontSize: 11.5, color: T.muted }}>{formatDate(exam.start_date)}</span>
        </div>
        {exam.end_date && !isDone && (
          <div style={{ fontSize: 11, color: T.muted }}>Ends: {formatDate(exam.end_date)}</div>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {tags.map((tag, i) => <span key={i} className="na-tag">{tag}</span>)}
          </div>
        )}
        {isDone && exam.score != null && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '8px 12px' }}>
            <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>
              Score: {exam.score} / {exam.total_marks || 100}
              {exam.total_marks && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500 }}>({Math.round((exam.score / exam.total_marks) * 100)}%)</span>}
            </span>
          </div>
        )}
        {isAssigned && !isLive && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 7, padding: '8px 12px', marginTop: 'auto' }}>
            <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>📅 Exam starts {formatDate(exam.start_date)}</span>
          </div>
        )}
        {isLive && onStart && (
          <button className="na-btn na-btn-danger" style={{ width: '100%', marginTop: 'auto' }} onClick={onStart}>
            <Icons.Play /> Start Assessment
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="na-card" style={{ padding: '52px 40px', textAlign: 'center', color: T.dim }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, opacity: .3 }}><Icons.Inbox /></div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function KeyEntryModal({ exam, onClose, onEnter }) {
  const [key,  setKey]  = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  async function submit() {
    if (!key.trim()) return setErr('Please enter your exam key');
    setBusy(true); setErr('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('student_token');
      const res = await fetch(`${API_URL}/api/exams/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exam_key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.error || 'Invalid exam key');
      onEnter(data);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1060', marginBottom: 6 }}>Enter Exam Key</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          <strong>{exam.title}</strong><br/>Enter the key sent to your registered email address.
        </p>
        <input value={key} onChange={e => setKey(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. A1B2C3D4E5" autoFocus
          style={{ width: '100%', padding: '12px 16px', border: `2px solid ${err ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, fontSize: 15, fontWeight: 600, letterSpacing: '2px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}/>
        {err && <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ flex: 2, padding: '10px', background: busy ? '#a5b4fc' : 'linear-gradient(135deg,#dc2626,#ef4444)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Verifying…' : '🚀 Start Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentHiring() {
  const navigate       = useNavigate();
  const [tab, setTab]  = useState('assessments');
  const [exams,        setExams]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [keyModalExam, setKeyModalExam] = useState(null);

  const fetchExams = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token') || '';
      if (!token) { setError('Not logged in — please log in again'); setLoading(false); return; }
      const res = await fetch(`${API}/api/student/exams`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setExams(data.exams || []);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchExams();
    const interval = setInterval(() => fetchExams(true), 30000);
    return () => clearInterval(interval);
  }, [fetchExams]);

  const now = new Date();
  const enriched = exams
    // ── FIXED: Only show placement/hiring exams here ───────────────────────
    .filter(e => {
      const t = (e.exam_type || '').toLowerCase().trim();
      return HIRING_TYPES.includes(t);
    })
    .map(e => {
      const sections = typeof e.sections === 'string' ? JSON.parse(e.sections || '{}') : (e.sections || {});
      let status = 'assigned';
      if (e.assignment_status === 'submitted') {
        status = 'submitted';
      } else if (e.start_date && e.end_date) {
        const start = new Date(e.start_date);
        const end   = new Date(e.end_date);
        if (now >= start && now <= end) status = 'live';
      }
      return { ...e, sections, status };
    });

  const active    = enriched.filter(e => ['live', 'assigned'].includes(e.status));
  const completed = enriched.filter(e => e.status === 'submitted');
  const liveNow   = enriched.filter(e => e.status === 'live');

  function handleEnterExam(examData) {
    setKeyModalExam(null);
    navigate('/exam', { state: { examData } });
  }

  const tabs = [
    { id: 'assessments', label: 'Active Assessments', count: active.length },
    { id: 'completed',   label: 'Completed',          count: completed.length },
  ];

  return (
    <StudentLayout activePath="/student-hiring">
      <div style={{ marginBottom: 22 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate('/student-dashboard')}>
          <Icons.ChevronLeft /> Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: '-.5px', marginBottom: 3 }}>
              Hiring Assessments
            </h1>
            <p style={{ fontSize: 13, color: T.muted }}>
              Placement assessments assigned to you
              {lastRefresh && <span style={{ marginLeft: 8, fontSize: 11, color: T.dim }}>· Refreshed {lastRefresh.toLocaleTimeString()}</span>}
            </p>
          </div>
          <button className="na-btn na-btn-ghost na-btn-sm" onClick={() => fetchExams()}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: T.red }}>
          ⚠️ {error} — <button onClick={() => fetchExams()} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {!loading && liveNow.length > 0 && (
        <div style={{ marginBottom: 22, background: '#fef2f2', border: '1.5px solid #dc262644', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.red, letterSpacing: '.5px' }}>LIVE NOW — Action Required</span>
          </div>
          {liveNow.map(exam => (
            <div key={exam.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 7, padding: '10px 14px', border: '1px solid #dc262622', marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{exam.title}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>
                  {exam.company_name || exam.college} · Ends {new Date(exam.end_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button className="na-btn na-btn-danger na-btn-sm" onClick={() => handleEnterExam(exam)}>
                <Icons.Play /> Enter Now
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Active Tests', value: active.length,    color: T.accent },
          { label: 'Live Now',     value: liveNow.length,   color: T.red    },
          { label: 'Completed',    value: completed.length, color: T.green  },
        ].map((s, i) => (
          <div key={i} className="na-card" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} className={`na-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span style={{ minWidth: 17, height: 17, padding: '0 5px', borderRadius: 9, fontSize: 10, fontWeight: 700, background: tab === t.id ? T.accent : T.border, color: tab === t.id ? '#fff' : T.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'assessments' && (
        loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>{[1,2,3].map(i=><SkeletonCard key={i}/>)}</div>
          : active.length === 0
            ? <EmptyState label="No active placement assessments yet. Exams assigned to you will appear here." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {active.map(exam => <ExamCard key={exam.id} exam={exam} onStart={exam.status==='live'?()=>handleEnterExam(exam):null}/>)}
              </div>
      )}

      {tab === 'completed' && (
        loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>{[1,2].map(i=><SkeletonCard key={i}/>)}</div>
          : completed.length === 0
            ? <EmptyState label="No completed placement assessments yet." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {completed.map(exam => <ExamCard key={exam.id} exam={exam} onStart={null}/>)}
              </div>
      )}

      {keyModalExam && <KeyEntryModal exam={keyModalExam} onClose={()=>setKeyModalExam(null)} onEnter={handleEnterExam}/>}
      {/* Key Entry Modal */}
    </StudentLayout>
  );
}