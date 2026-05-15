// src/pages/StudentHiring.jsx
// FIXED:
//  1. Fetches from /api/student/exams (matches our new exams.js route)
//  2. "Start Assessment" navigates directly to ExamPage with exam data
//     (no key prompt — key was used for assignment, exam data already resolved)
//  3. Live detection based on start_date / end_date from DB
//  4. Handles approved + live + completed states properly

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout, Icons, THEME as T } from './Studentdashboard ';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Skeleton loader ───────────────────────────────────────────────────────────
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

// ── Exam Card ────────────────────────────────────────────────────────────────
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
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 22px rgba(43,177,168,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Card Header */}
      <div style={{
        padding: '10px 15px', background: '#d9f2f4',
        display: 'flex', alignItems: 'center', gap: 9,
        borderBottom: '1px solid #2BB1A820',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'rgba(255,255,255,.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10.5, fontWeight: 700, color: '#2BB1A8',
        }}>
          {(exam.company_name || exam.college || 'E')[0].toUpperCase()}
        </div>
        <span style={{
          fontSize: 12.5, fontWeight: 700, color: '#2BB1A8',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {exam.company_name || exam.college || 'Assessment'}
        </span>

        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', letterSpacing: '.5px' }}>LIVE</span>
          </div>
        )}
        {isDone && (
          <span className="na-badge" style={{ background: '#d9f5ec', color: '#0a8f5c' }}>
            <Icons.CheckCircle /> Done
          </span>
        )}
        {isAssigned && (
          <span className="na-badge" style={{ background: '#d9f2f4', color: '#2BB1A8' }}>Assigned</span>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>
          {exam.title}
        </div>

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
          <div style={{ fontSize: 11, color: T.muted }}>
            Ends: {formatDate(exam.end_date)}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {tags.map((tag, i) => (
              <span key={i} className="na-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Score for completed */}
        {isDone && exam.score != null && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 7, padding: '8px 12px',
          }}>
            <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>
              Score: {exam.score} / {exam.total_marks || 100}
              {exam.total_marks && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500 }}>
                  ({Math.round((exam.score / exam.total_marks) * 100)}%)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Not live yet — info */}
        {isAssigned && !isLive && (
          <div style={{
            background: '#f0f9ff', border: '1px solid #bae6fd',
            borderRadius: 7, padding: '8px 12px', marginTop: 'auto',
          }}>
            <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
              📅 Exam starts {formatDate(exam.start_date)}
            </span>
          </div>
        )}

        {/* Start button — only when live */}
        {isLive && onStart && (
          <button
            className="na-btn na-btn-danger"
            style={{ width: '100%', marginTop: 'auto' }}
            onClick={onStart}
          >
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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, opacity: .3 }}>
        <Icons.Inbox />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}


// ── Main StudentHiring Page ───────────────────────────────────────────────────
export default function StudentHiring() {
  const navigate        = useNavigate();
  const [tab, setTab]   = useState('assessments');
  const [exams,         setExams]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(null);

  const fetchExams = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // From console: token is stored as 'student_token' AND 'token'
      const token =
        localStorage.getItem('student_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        sessionStorage.getItem('token') || '';

      if (!token) {
        setError('Not logged in — please log in again');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API}/api/student/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setExams(data.exams || []);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    const interval = setInterval(() => fetchExams(true), 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchExams]);

  // Compute live status from date window
  const now = new Date();
  const enriched = exams.map(e => {
    const sections = typeof e.sections === 'string'
      ? JSON.parse(e.sections || '{}')
      : (e.sections || {});

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

  // Navigate to the shared geolocation gate first, then continue to hiring exam verification
  function handleEnterExam(exam) {
    navigate('/instruction', {
      state: {
        exam,
        examType: 'hiring',
        redirectTo: '/exam-verify',
      },
    });
  }

  const tabs = [
    { id: 'assessments', label: 'Active Assessments', count: active.length },
    { id: 'completed',   label: 'Completed',          count: completed.length },
  ];

  return (
    <StudentLayout activePath="/student-hiring">

      {/* Page header */}
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
              {lastRefresh && (
                <span style={{ marginLeft: 8, fontSize: 11, color: T.dim }}>
                  · Refreshed {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button className="na-btn na-btn-ghost na-btn-sm" onClick={() => fetchExams()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 8, padding: '10px 14px', marginBottom: 18,
          fontSize: 13, color: T.red,
        }}>
          ⚠️ {error} — <button
            onClick={() => fetchExams()}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
          >Retry</button>
        </div>
      )}

      {/* Live Now alert bar */}
      {!loading && liveNow.length > 0 && (
        <div style={{
          marginBottom: 22, background: '#fef2f2',
          border: '1.5px solid #dc262644', borderRadius: 10, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.red, letterSpacing: '.5px' }}>
              LIVE NOW — Action Required
            </span>
          </div>
          {liveNow.map(exam => (
            <div key={exam.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', borderRadius: 7, padding: '10px 14px',
              border: '1px solid #dc262622', marginTop: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{exam.title}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>
                  {exam.company_name || exam.college} · Ends{' '}
                  {new Date(exam.end_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                className="na-btn na-btn-danger na-btn-sm"
                onClick={() => handleEnterExam(exam)}
              >
                <Icons.Play /> Enter Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Active Tests',  value: active.length,    color: T.accent },
          { label: 'Live Now',      value: liveNow.length,   color: T.red    },
          { label: 'Completed',     value: completed.length, color: T.green  },
        ].map((s, i) => (
          <div key={i} className="na-card" style={{
            padding: '15px 20px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 5, marginBottom: 18,
        borderBottom: `1px solid ${T.border}`, paddingBottom: 12,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`na-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span style={{
              minWidth: 17, height: 17, padding: '0 5px', borderRadius: 9,
              fontSize: 10, fontWeight: 700,
              background: tab === t.id ? T.accent : T.border,
              color: tab === t.id ? '#fff' : T.muted,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'assessments' && (
        loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          : active.length === 0
            ? <EmptyState label="No active assessments yet. Exams assigned to you will appear here." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {active.map(exam => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onStart={exam.status === 'live' ? () => handleEnterExam(exam) : null}
                  />
                ))}
              </div>
      )}

      {tab === 'completed' && (
        loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          : completed.length === 0
            ? <EmptyState label="No completed assessments yet." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {completed.map(exam => <ExamCard key={exam.id} exam={exam} onStart={null} />)}
              </div>
      )}

      {/* Key Entry Modal */}
    </StudentLayout>
  );
}
