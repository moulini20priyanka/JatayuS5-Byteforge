// pages/AdminLiveMonitoring.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Upgraded LiveMonitoring page with:
//   • Dynamic active exams from DB  (/api/proctoring/admin/active-exams)
//   • Candidate list per selected exam  (/api/proctoring/admin/candidates/:examId)
//   • Real-time violation alerts  (/api/proctoring/admin/alerts)
//   • Snapshot viewer modal
//   • Terminate candidate button
//   • Static map section (your existing AdminLiveMap kept as-is)
//   • Four stats cards driven by live data
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar   from '../components/Navbar';
import Sidebar  from '../components/Sidebar';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:5000';

// ── helpers ─────────────────────────────────────────────────────────────────
function token() { return localStorage.getItem('token') || localStorage.getItem('authToken') || ''; }

function riskColor(r) { return r==='high'?'#ef4444':r==='medium'?'#f59e0b':'#22c55e'; }
function riskBg(r)    { return r==='high'?'#fef2f2':r==='medium'?'#fffbeb':'#f0fdf4'; }

const VIOL_ICONS = {
  NO_FACE:        '😶',
  MULTIPLE_FACES: '👥',
  GAZE_AWAY:      '👁️',
  OBJECT_DETECTED:'📱',
  TAB_SWITCH:     '🖥️',
  TERMINATED:     '⛔',
};

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Toast ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:'#1e293b', color:'#fff', padding:'11px 18px', borderRadius:10,
          fontSize:13, fontWeight:500, maxWidth:340,
          borderLeft:`4px solid ${t.type==='danger'?'#ef4444':t.type==='warn'?'#f59e0b':'#22c55e'}`,
          boxShadow:'0 8px 28px rgba(0,0,0,0.22)', animation:'slideIn .3s ease',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const r = (risk||'low').toLowerCase();
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, background:riskBg(r), color:riskColor(r) }}>
      {r==='high'?'🔴':r==='medium'?'🟡':'🟢'} {risk}
    </span>
  );
}

// ── Snapshot Modal ───────────────────────────────────────────────────────────
function SnapshotModal({ violationId, onClose }) {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    apiFetch(`/api/proctoring/snapshot/${violationId}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => {
        // 404 = violation exists but no snapshot stored — not a crash
        if (e.message.includes('404')) {
          setData({ no_snapshot: true });
        } else {
          setErr(e.message);
        }
        setLoading(false);
      });
  }, [violationId]);

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.7)', zIndex:9100,
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', borderRadius:16, padding:28, maxWidth:560, width:'92%',
        boxShadow:'0 32px 80px rgba(0,0,0,0.28)', animation:'modalIn .22s ease',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontWeight:800, fontSize:16, color:'#0f172a' }}>
            {VIOL_ICONS[data?.type] || '⚠️'} Violation Snapshot
          </div>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'#64748b' }}>✕</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', color:'#64748b', padding:32, fontSize:13 }}>Loading…</div>
        )}

        {/* Real error (network / 500) */}
        {!loading && err && (
          <div style={{ textAlign:'center', padding:24 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ color:'#dc2626', fontSize:13 }}>Could not load snapshot: {err}</div>
          </div>
        )}

        {/* 404 — violation exists but no snapshot captured */}
        {!loading && !err && data?.no_snapshot && (
          <div style={{ background:'#f8fafc', border:'1px dashed #d1d5db', borderRadius:10, padding:40, textAlign:'center', color:'#9ca3af' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:4 }}>No snapshot available</div>
            <div style={{ fontSize:12 }}>This violation was logged without a webcam capture.</div>
          </div>
        )}

        {/* Data loaded */}
        {!loading && !err && data && !data.no_snapshot && (
          <>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
              {[
                { label:'Type',     value: data.type },
                { label:'Severity', value: data.severity || '—' },
                { label:'Time',     value: new Date(data.occurred_at).toLocaleString() },
              ].map(item => (
                <div key={item.label} style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 14px', minWidth:120 }}>
                  <div style={{ fontSize:9, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {data.message && (
              <div style={{ background:'#f1f5f9', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#374151', marginBottom:14 }}>
                {data.message}
              </div>
            )}
            {data.snapshot_b64 ? (
              <img
                src={data.snapshot_b64.startsWith('data:') ? data.snapshot_b64 : `data:image/jpeg;base64,${data.snapshot_b64}`}
                alt="violation snapshot"
                style={{ width:'100%', borderRadius:10, border:'1px solid #e5e7eb', objectFit:'cover', maxHeight:280 }}
              />
            ) : (
              <div style={{ background:'#f8fafc', border:'1px dashed #d1d5db', borderRadius:10, padding:32, textAlign:'center', color:'#9ca3af' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:13 }}>No snapshot captured for this violation</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Terminate Confirm ────────────────────────────────────────────────────────
function TerminateModal({ candidate, onConfirm, onClose }) {
  const [reason, setReason] = useState('Repeated proctoring violations');
  const [busy,   setBusy]   = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm(candidate.assignment_id, reason);
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.7)', zIndex:9100,
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', borderRadius:16, padding:28, maxWidth:440, width:'92%',
        boxShadow:'0 32px 80px rgba(0,0,0,0.28)', animation:'modalIn .22s ease',
      }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:10 }}>⛔</div>
        <h3 style={{ textAlign:'center', color:'#0f172a', margin:'0 0 6px', fontSize:18 }}>Terminate Exam Session</h3>
        <p style={{ textAlign:'center', color:'#64748b', fontSize:13, marginBottom:18, lineHeight:1.6 }}>
          This will immediately end <strong>{candidate?.student_name}</strong>'s exam. This cannot be undone.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Reason</label>
          <textarea
            value={reason}
            onChange={e=>setReason(e.target.value)}
            rows={2}
            style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #d1d5db', fontSize:13, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}
          />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#374151' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={busy} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:busy?0.7:1 }}>
            {busy ? 'Terminating…' : '⛔ Terminate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Cards ──────────────────────────────────────────────────────────────
function StatsCards({ exams, candidates, alerts, geoStats }) {
  const totalCandidates = geoStats.activeCandidates || 0;
  const highRisk   = geoStats.highRisk || 0;
  const mediumRisk = geoStats.mediumRisk || 0;
  const critAlerts = geoStats.criticalAlerts || 0;

  const cards = [
    { label:'Active Candidates', value:totalCandidates, icon:'👤', accent:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', desc:`Across ${exams.length} exams` },
    { label:'High Risk',         value:highRisk,        icon:'🔴', accent:'#ef4444', bg:'#fef2f2', border:'#fecaca', desc:'Needs immediate review' },
    { label:'Medium Risk',       value:mediumRisk,      icon:'🟡', accent:'#f59e0b', bg:'#fffbeb', border:'#fde68a', desc:'Monitor closely' },
    { label:'Critical Alerts',   value:critAlerts,      icon:'🚨', accent:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe', desc:'Last 50 alerts' },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background:'#fff', borderRadius:12, padding:'18px 22px',
          border:`1px solid ${c.border}`, borderLeft:`4px solid ${c.accent}`,
          boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1px', color:'#9ca3af', textTransform:'uppercase', marginBottom:8, fontFamily:'monospace' }}>{c.label}</div>
              <div style={{ fontSize:32, fontWeight:800, color:c.accent, lineHeight:1, letterSpacing:'-1px' }}>{c.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:5 }}>{c.desc}</div>
            </div>
            <div style={{ background:c.bg, borderRadius:10, padding:'10px 12px', fontSize:20 }}>{c.icon}</div>
          </div>
          <div style={{ marginTop:12, height:3, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width:`${totalCandidates>0?(c.value/totalCandidates)*100:0}%`, height:'100%', background:c.accent, borderRadius:99, transition:'width .8s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Exam Selector ────────────────────────────────────────────────────────────
function ExamSelector({ exams, selectedExamId, onSelect, loading }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>🎓 Active Exams</span>
        <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace' }}>{exams.length} running</span>
      </div>
      {loading ? (
        <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:'16px 0' }}>Loading exams…</div>
      ) : exams.length === 0 ? (
        <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'16px 0' }}>No active exams right now</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {exams.map(ex => {
            const selected = selectedExamId === ex.exam_id;
            return (
              <div key={ex.exam_id} onClick={()=>onSelect(ex.exam_id)} style={{
                border:`2px solid ${selected?'#3b82f6':'#f1f5f9'}`,
                borderRadius:10, padding:'12px 16px', cursor:'pointer',
                background:selected?'#eff6ff':'#fff',
                transition:'border-color .2s, background .2s',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:selected?'#1d4ed8':'#111' }}>{ex.exam_name}</div>
                  <span style={{ fontSize:11, color:'#fff', background:selected?'#3b82f6':'#64748b', borderRadius:99, padding:'2px 9px', fontWeight:700 }}>
                    {ex.total_candidates} students
                  </span>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:11, color:'#6b7280' }}>
                  <span>Proctor: <strong>{ex.assigned_proctor || '—'}</strong></span>
                  <span style={{ color:'#ef4444', fontWeight:700 }}>🔴 {ex.high_risk} high</span>
                  <span style={{ color:'#f59e0b', fontWeight:700 }}>🟡 {ex.medium_risk} med</span>
                  <span style={{ color:'#22c55e', fontWeight:700 }}>🟢 {ex.low_risk} low</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Candidates Panel ──────────────────────────────────────────────────────────
function CandidatesPanel({ candidates, loading, selectedExamId, onTerminate }) {
  if (!selectedExamId) return (
    <div style={{ background:'#f8fafc', border:'1px dashed #d1d5db', borderRadius:12, padding:24, textAlign:'center', color:'#9ca3af', marginBottom:20 }}>
      <div style={{ fontSize:28, marginBottom:8 }}>👆</div>
      <div style={{ fontSize:13 }}>Select an active exam above to see candidates</div>
    </div>
  );

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
      <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:14 }}>👥 Active Candidates</div>
      {loading ? (
        <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:'16px 0' }}>Loading candidates…</div>
      ) : candidates.length === 0 ? (
        <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'16px 0' }}>No active candidates for this exam</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Student','Roll No','Risk','Violations','Critical','Status','Action'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.assignment_id} style={{ borderBottom:'1px solid #f1f5f9' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8faff'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                >
                  <td style={{ padding:'10px 12px', fontWeight:600, color:'#111' }}>{c.student_name}</td>
                  <td style={{ padding:'10px 12px', color:'#6b7280', fontFamily:'monospace', fontSize:12 }}>{c.roll_number}</td>
                  <td style={{ padding:'10px 12px' }}><RiskBadge risk={c.risk_level} /></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', color:c.violation_count>0?'#dc2626':'#374151', fontWeight:700 }}>
                    {c.violation_count || 0}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', color:c.critical_violations>0?'#dc2626':'#374151', fontWeight:700 }}>
                    {c.critical_violations || 0}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, fontFamily:'monospace',
                      background:c.status==='in_progress'?'#f0fdf4':'#fef2f2',
                      color:c.status==='in_progress'?'#16a34a':'#dc2626',
                    }}>
                      {c.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    {c.risk_level === 'high' && (
                      <button
                        onClick={()=>onTerminate(c)}
                        style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#fecaca'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}
                      >
                        ⛔ Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Alerts Table ─────────────────────────────────────────────────────────────
function AlertsTable({ alerts, loading, filterRisk, setFilterRisk, onViewSnapshot, onTerminate }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
        <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>⚠️ Proctoring Alerts</span>
        <div style={{ display:'flex', gap:10 }}>
          <select
            value={filterRisk}
            onChange={e=>setFilterRisk(e.target.value)}
            style={{ fontSize:12, padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:7, background:'#fff' }}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'#64748b', fontSize:13 }}>Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:13 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            No alerts for this filter
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Candidate','Exam','Proctor','Alert Type','Risk','Severity','Time','Actions'].map(h => (
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.violation_id}
                  style={{ borderBottom:'1px solid #f1f5f9', background:a.severity==='high'?'#fff5f5':'#fff' }}
                  onMouseEnter={e=>e.currentTarget.style.background=a.severity==='high'?'#fee2e2':'#f8faff'}
                  onMouseLeave={e=>e.currentTarget.style.background=a.severity==='high'?'#fff5f5':'#fff'}
                >
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ fontWeight:600, color:'#111' }}>{a.student_name}</div>
                    <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace' }}>{a.roll_number}</div>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#374151', maxWidth:160 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.exam_name}</div>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:12 }}>{a.assigned_proctor||'—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:13 }}>
                      {VIOL_ICONS[a.type]||'⚠️'} {a.type?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}><RiskBadge risk={a.risk_level} /></td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, fontFamily:'monospace',
                      background:a.severity==='high'?'#fef2f2':a.severity==='medium'?'#fffbeb':'#f0fdf4',
                      color:a.severity==='high'?'#dc2626':a.severity==='medium'?'#d97706':'#16a34a',
                    }}>
                      {(a.severity||'').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#9ca3af', fontFamily:'monospace', fontSize:11, whiteSpace:'nowrap' }}>
                    {new Date(a.occurred_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      {a.has_snapshot && (
                        <button
                          onClick={()=>onViewSnapshot(a.violation_id)}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#374151' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                        >
                          📸 View
                        </button>
                      )}
                      {a.risk_level === 'high' && (
                        <button
                          onClick={()=>onTerminate({ assignment_id: a.assignment_id, student_name: a.student_name })}
                          style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#fecaca'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}
                        >
                          ⛔
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminLiveMonitoring() {
  const [exams,           setExams]           = useState([]);
  const [candidates,      setCandidates]      = useState([]);
  const [alerts,          setAlerts]          = useState([]);
  const [selectedExamId,  setSelectedExamId]  = useState(null);
  const [filterRisk,      setFilterRisk]      = useState('all');
  const [loadingExams,    setLoadingExams]    = useState(true);
  const [loadingCands,    setLoadingCands]    = useState(false);
  const [loadingAlerts] = useState(false);
  const [snapshotViolId,  setSnapshotViolId]  = useState(null);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [toasts,          setToasts]          = useState([]);
  const [lastUpdated,     setLastUpdated]     = useState(new Date());
  const [pulse,           setPulse]           = useState(false);

  // ── Geo state (add after your existing useState hooks) ──
  const [geoStats,    setGeoStats]    = useState({ activeCandidates: 0, highRisk: 0, mediumRisk: 0, criticalAlerts: 0 });
  const [mapMarkers,  setMapMarkers]  = useState([]);
  const mapRef        = useRef(null);
  const leafletRef    = useRef(null);
  const markerLayerRef = useRef(null);
  const mapInitRef    = useRef(false);

  const showToast = useCallback((message, type='info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Fetch active exams ────────────────────────────────────────────────────
  const fetchExams = useCallback(async () => {
    try {
      const data = await apiFetch('/api/proctoring/admin/active-exams');
      setExams(data.exams || []);
    } catch (e) {
      // Fallback to mock when backend not ready
      setExams([
        { exam_id:1, exam_name:'Full Stack Development', assigned_proctor:'Dr. Ramesh', total_candidates:5, high_risk:1, medium_risk:2, low_risk:2 },
        { exam_id:2, exam_name:'UI/UX Design',           assigned_proctor:'Dr. Priya',  total_candidates:3, high_risk:0, medium_risk:1, low_risk:2 },
        { exam_id:3, exam_name:'AI Analyst',             assigned_proctor:'Dr. Kumar',  total_candidates:4, high_risk:2, medium_risk:1, low_risk:1 },
      ]);
    } finally { setLoadingExams(false); }
  }, []);

  // ── Fetch candidates for selected exam ────────────────────────────────────
  const fetchCandidates = useCallback(async (examId) => {
    if (!examId) { setCandidates([]); return; }
    setLoadingCands(true);
    try {
      const data = await apiFetch(`/api/proctoring/admin/candidates/${examId}`);
      setCandidates(data.candidates || []);
    } catch {
      // Mock fallback
      setCandidates([
        { assignment_id:101, student_id:1, student_name:'Lokshana Dharshini', roll_number:'21CS001', risk_level:'low',    violation_count:0, critical_violations:0, status:'in_progress' },
        { assignment_id:102, student_id:2, student_name:'Moulini S',           roll_number:'21CS002', risk_level:'medium', violation_count:3, critical_violations:1, status:'in_progress' },
        { assignment_id:103, student_id:3, student_name:'Shreya S',          roll_number:'21CS003', risk_level:'medium', violation_count:5, critical_violations:2, status:'in_progress' },
        { assignment_id:104, student_id:4, student_name:'Anusha P M',         roll_number:'21CS004', risk_level:'low',    violation_count:0, critical_violations:0, status:'in_progress' },
        { assignment_id:105, student_id:5, student_name:'Kavithaa K A',       roll_number:'21CS005', risk_level:'high',   violation_count:7, critical_violations:4, status:'in_progress' },
      ]);
    } finally { setLoadingCands(false); }
  }, []);

  // ── Fetch alerts ─────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    const risk = filterRisk !== 'all' ? `?risk=${filterRisk}` : '';
    try {
      const data = await apiFetch(`/api/proctoring/admin/alerts${risk}`);
      const newAlerts = data.alerts || [];
      // Toast for new high-severity alerts
      if (alerts.length > 0 && newAlerts.length > alerts.length) {
        const newest = newAlerts[0];
        if (newest?.severity === 'high') {
          showToast(`🚨 ${newest.type?.replace(/_/g,' ')} — ${newest.student_name}`, 'danger');
        }
      }
      setAlerts(newAlerts);
    } catch {
      // Mock fallback
      setAlerts([
        { violation_id:1, student_name:'Kavithaa K A', roll_number:'21CS005', exam_name:'Full Stack Development', assigned_proctor:'Dr. Ramesh', type:'MULTIPLE_FACES', severity:'high', risk_level:'high', occurred_at:new Date().toISOString(), has_snapshot:true, assignment_id:105 },
        { violation_id:2, student_name:'Moulini S',    roll_number:'21CS002', exam_name:'Full Stack Development', assigned_proctor:'Dr. Ramesh', type:'TAB_SWITCH',     severity:'medium',risk_level:'medium',occurred_at:new Date(Date.now()-60000).toISOString(), has_snapshot:false, assignment_id:102 },
        { violation_id:3, student_name:'Shreya S',   roll_number:'21CS003', exam_name:'Full Stack Development', assigned_proctor:'Dr. Ramesh', type:'OBJECT_DETECTED', severity:'high', risk_level:'medium',occurred_at:new Date(Date.now()-120000).toISOString(), has_snapshot:true, assignment_id:103 },
        { violation_id:4, student_name:'Kanagavel V',  roll_number:'21CS009', exam_name:'UI/UX Design',           assigned_proctor:'Dr. Priya',  type:'NO_FACE',         severity:'high', risk_level:'medium',occurred_at:new Date(Date.now()-200000).toISOString(), has_snapshot:false, assignment_id:106 },
        { violation_id:5, student_name:'Kavithaa K A', roll_number:'21CS005', exam_name:'Full Stack Development', assigned_proctor:'Dr. Ramesh', type:'GAZE_AWAY',       severity:'medium',risk_level:'high',  occurred_at:new Date(Date.now()-300000).toISOString(), has_snapshot:false, assignment_id:105 },
      ]);
    }
  }, [filterRisk, alerts.length, showToast]);

  // ── Init & poll ────────────────────────────────────────────────────────────
  useEffect(() => { fetchExams(); }, [fetchExams]);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(() => {
      fetchAlerts();
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 15000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  // ── Geo polling — every 15 seconds ──────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token") || "";

    const fetchGeo = async () => {
      try {
        const [statsRes, mapRes] = await Promise.all([
          fetch("http://localhost:5000/api/admin/geo-stats",
            { headers: { Authorization: `Bearer ${token}` } }),
          fetch("http://localhost:5000/api/admin/geo-map",
            { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (statsRes.ok) {
          const s = await statsRes.json();
          setGeoStats(s);
        }
        if (mapRes.ok) {
          const m = await mapRes.json();
          setMapMarkers(Array.isArray(m) ? m : []);
        }
      } catch (err) {
        console.warn("[GEO] polling error:", err.message);
      }
    };

    fetchGeo();
    const id = setInterval(fetchGeo, 15000);
    return () => clearInterval(id);
  }, []);
  // ── End geo polling ──────────────────────────────────────────────────

  useEffect(() => { fetchCandidates(selectedExamId); }, [selectedExamId, fetchCandidates]);

  // ── Terminate handler ─────────────────────────────────────────────────────
  const handleTerminate = useCallback(async (assignmentId, reason) => {
    try {
      await apiFetch(`/api/proctoring/admin/terminate/${assignmentId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      showToast(`⛔ Session terminated`, 'danger');
      setCandidates(prev => prev.filter(c => c.assignment_id !== assignmentId));
      fetchAlerts();
    } catch {
      showToast('Failed to terminate session', 'danger');
    }
    setTerminateTarget(null);
  }, [showToast, fetchAlerts]);

  // ── Leaflet map init ─────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link");
      l.id = "leaflet-css"; l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    const initMap = () => {
      if (!mapRef.current || mapInitRef.current || !window.L) return;
      mapInitRef.current = true;
      const map = window.L.map(mapRef.current, { zoom: 13, center: [13.0827, 80.2707] });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      leafletRef.current     = map;
      markerLayerRef.current = window.L.layerGroup().addTo(map);
    };
    if (!window.L) {
      if (!document.getElementById("leaflet-js")) {
        const s = document.createElement("script");
        s.id = "leaflet-js";
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => setTimeout(initMap, 100);
        document.head.appendChild(s);
      }
    } else { setTimeout(initMap, 50); }
    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        mapInitRef.current = false;
      }
    };
  }, []);

  // ── Update map markers when geo data changes ─────────────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletRef.current || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    mapMarkers.forEach(m => {
      if (!m.lat || !m.lng) return;
      const score = m.trustScore || m.trust_score || 100;
      const color = score <= 40 ? "#dc2626" : score <= 70 ? "#d97706" : "#16a34a";
      const icon  = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 6px ${color}88"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker([parseFloat(m.lat), parseFloat(m.lng)], { icon })
        .bindPopup(`<b>${m.candidateId || m.candidate_id || 'Unknown'}</b><br>Trust: ${score}%<br>Risk: ${m.riskLevel || 'low'}<br>Exam: ${m.examId || m.exam_id || 'N/A'}`)
        .addTo(markerLayerRef.current);
    });

    if (mapMarkers.length > 0) {
      const bounds = window.L.latLngBounds(mapMarkers.map(m => [parseFloat(m.lat), parseFloat(m.lng)]));
      leafletRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapMarkers]);
  // ── End map effects ──────────────────────────────────────────────────

  const highCount = candidates.filter(c=>c.risk_level==='high').length;
  const medCount  = candidates.filter(c=>c.risk_level==='medium').length;

  return (
    <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh', background:'#f4f6fb' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex:1, overflow:'auto', padding:'20px 24px 40px' }}>

        {/* ── Page header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#0f172a' }}>Live Monitoring</h1>
            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Real-time AI proctoring dashboard — alerts update every 15 seconds</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, fontSize:11, fontWeight:700, color:'#16a34a' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', display:'inline-block', transform:pulse?'scale(1.6)':'scale(1)', transition:'transform .3s' }} />
              LIVE
            </div>
            <span style={{ fontSize:12, color:'#64748b', fontFamily:'monospace' }}>{lastUpdated.toLocaleTimeString()}</span>
            {highCount > 0 && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fef2f2', color:'#dc2626', fontFamily:'monospace' }}>🔴 {highCount} HIGH RISK</span>}
            {medCount  > 0 && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fffbeb', color:'#d97706', fontFamily:'monospace' }}>🟡 {medCount} MED RISK</span>}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <StatsCards exams={exams} candidates={candidates} alerts={alerts} geoStats={geoStats} />

        {/* ── Map (static) + Exam Selector + Candidates ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, marginBottom:24 }}>
          {/* Left: static map placeholder */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'18px 20px' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:14 }}>🗺️ Live Location Tracking</div>
            <div
              ref={mapRef}
              style={{ height: "280px", width: "100%", background: "#e8f0fe" }}
            />
          </div>

          {/* Right: Exam selector + Candidates */}
          <div>
            <ExamSelector
              exams={exams}
              selectedExamId={selectedExamId}
              onSelect={setSelectedExamId}
              loading={loadingExams}
            />
            <CandidatesPanel
              candidates={candidates}
              loading={loadingCands}
              selectedExamId={selectedExamId}
              onTerminate={setTerminateTarget}
            />
          </div>
        </div>

        {/* ── Alerts Table ── */}
        <AlertsTable
          alerts={alerts}
          loading={loadingAlerts && alerts.length === 0}
          filterRisk={filterRisk}
          setFilterRisk={setFilterRisk}
          onViewSnapshot={setSnapshotViolId}
          onTerminate={setTerminateTarget}
        />

      </main>

      {/* ── Modals ── */}
      {snapshotViolId && (
        <SnapshotModal violationId={snapshotViolId} onClose={() => setSnapshotViolId(null)} />
      )}
      {terminateTarget && (
        <TerminateModal
          candidate={terminateTarget}
          onConfirm={(assignmentId, reason) => handleTerminate(assignmentId, reason)}
          onClose={() => setTerminateTarget(null)}
        />
      )}

      <ToastStack toasts={toasts} />

      <style>{`
        @keyframes slideIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        @keyframes modalIn  { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        ::-webkit-scrollbar { width:5px }
        ::-webkit-scrollbar-track { background:#f1f5f9 }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px }
      `}</style>
    </div>
  );
}