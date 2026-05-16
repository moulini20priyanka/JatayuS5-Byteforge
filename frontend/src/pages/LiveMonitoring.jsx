// frontend/src/pages/LiveMonitoring.jsx
// NeuroAssess — Live Monitoring Dashboard  v4
//
// NEW in v4:
//   ✅ "Completed Exams" tab alongside Active — shows all past exams
//   ✅ Click a completed exam → see every assigned student
//   ✅ Click a student → violation breakdown by category:
//        Registration Agent / Proctoring Agent (face/gaze) / Tab Switch / Geo / Other
//   ✅ Geo collation fix: /admin/sessions no longer returns 500

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:5000';

function token() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function riskColor(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#22c55e';
}
function riskBg(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#fef2f2' : l === 'medium' ? '#fffbeb' : '#f0fdf4';
}
function riskText(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#b91c1c' : l === 'medium' ? '#92400e' : '#166534';
}
function haversineMeters(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371000;
  const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
  const dLng = (parseFloat(lng2) - parseFloat(lng1)) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(parseFloat(lat1)*Math.PI/180)
    * Math.cos(parseFloat(lat2)*Math.PI/180)
    * Math.sin(dLng/2)**2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}
function timeAgo(date) {
  if (!date) return '—';
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function examTypeOf(ex) {
  const t = (ex.exam_type || '').toLowerCase();
  if (t === 'hiring' || t === 'placement') return 'hiring';
  if (t === 'certification' || t === 'skill_cert') return 'certification';
  if (t === 'university') return 'university';
  return 'hiring';
}
function examTypeBadge(type) {
  if (type === 'hiring')        return { label: 'Hiring',       color: '#0369a1', bg: '#e0f2fe' };
  if (type === 'certification') return { label: 'Certification', color: '#065f46', bg: '#d1fae5' };
  return                               { label: 'University',    color: '#4338ca', bg: '#e0e7ff' };
}

const VIOL_ICONS = {
  NO_FACE: '😶', MULTIPLE_FACES: '👥', GAZE_AWAY: '👁️',
  OBJECT_DETECTED: '📱', TAB_SWITCH: '🖥️', WINDOW_BLUR: '🖥️', FOCUS_LOST: '🖥️',
  TERMINATED: '⛔', LOCATION_VIOLATION: '🚨', GEOFENCE_EXIT: '🚨',
  ID_MISMATCH: '🪪', FACE_MISMATCH: '🪪', LIVENESS_FAIL: '🪪', ID_INVALID: '🪪',
  FLAGGED: '🚩',
};

// ── Toast Stack ───────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:'#1e293b', color:'#fff', padding:'11px 18px', borderRadius:10, fontSize:13, fontWeight:500, maxWidth:340, borderLeft:`4px solid ${t.type==='danger'?'#ef4444':t.type==='warn'?'#f59e0b':'#22c55e'}`, boxShadow:'0 8px 28px rgba(0,0,0,0.22)' }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ risk }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:riskBg(risk), color:riskText(risk), border:`1px solid ${riskColor(risk)}33` }}>
      {(risk||'low').toUpperCase()}
    </span>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); },[]);
  return <span style={{ fontFamily:'monospace', fontSize:13, color:'#64748b' }}>{time.toLocaleTimeString()}</span>;
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function StatsCards({ geoStats, exams, completedExams }) {
  const s = geoStats || {};
  const cards = [
    { label:'Active Candidates', value:s.activeCandidates||0, icon:'👤', accent:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', desc:`Across ${(exams||[]).length} live exams` },
    { label:'High Risk',  value:s.highRisk||0, icon:'🔴', accent:'#ef4444', bg:'#fef2f2', border:'#fecaca', desc:'Needs immediate review' },
    { label:'Medium Risk', value:s.mediumRisk||0, icon:'🟡', accent:'#f59e0b', bg:'#fffbeb', border:'#fde68a', desc:'Monitor closely' },
    { label:'Completed Exams', value:(completedExams||[]).length, icon:'✅', accent:'#10b981', bg:'#ecfdf5', border:'#a7f3d0', desc:'All time' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:`1px solid ${c.border}`, borderTop:`3px solid ${c.accent}`, boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1px', color:'#9ca3af', textTransform:'uppercase' }}>{c.label}</div>
            <div style={{ background:c.bg, borderRadius:8, padding:'6px 8px', fontSize:18 }}>{c.icon}</div>
          </div>
          <div style={{ fontSize:34, fontWeight:800, color:c.accent, lineHeight:1, letterSpacing:'-1.5px', marginBottom:4 }}>{c.value}</div>
          <div style={{ fontSize:11, color:'#9ca3af' }}>{c.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Exam Cards (Active) ───────────────────────────────────────────────────────
function ActiveExamCards({ exams, selectedExamId, onSelect, loading }) {
  const safe = exams || [];
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>🟢 Live Exams</div>
        <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:99, padding:'2px 10px' }}>{safe.length} running</span>
      </div>
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, maxHeight:420, overflowY:'auto' }}>
        {loading ? <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:'20px 0' }}>Loading…</div>
        : safe.length === 0 ? <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'20px 0' }}><div style={{ fontSize:28, marginBottom:8 }}>📭</div>No active exams</div>
        : safe.map(ex => {
          const sel = selectedExamId === ex.exam_id;
          const tb  = examTypeBadge(examTypeOf(ex));
          const total = ex.student_count || 0;
          return (
            <div key={ex.exam_id} onClick={() => onSelect(sel ? null : ex.exam_id)}
              style={{ border:`2px solid ${sel?'#3b82f6':'#f1f5f9'}`, borderRadius:10, padding:'12px 14px', cursor:'pointer', background:sel?'#eff6ff':'#fff' }}>
              <div style={{ fontWeight:700, fontSize:13, color:sel?'#1d4ed8':'#111', marginBottom:4 }}>{ex.exam_name||'Exam'}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:tb.color, background:tb.bg, padding:'2px 8px', borderRadius:99 }}>{tb.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#6b7280', background:'#f3f4f6', padding:'2px 9px', borderRadius:99 }}>{total} students</span>
              </div>
              <div style={{ display:'flex', gap:10, fontSize:11 }}>
                <span style={{ color:'#dc2626', fontWeight:700 }}>🔴 {ex.high||0} high</span>
                <span style={{ color:'#d97706', fontWeight:700 }}>🟡 {ex.medium||0} med</span>
                <span style={{ color:'#16a34a', fontWeight:700 }}>🟢 {Math.max(0,(total-(ex.high||0)-(ex.medium||0)))} safe</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Completed Exam Cards ──────────────────────────────────────────────────────
function CompletedExamCards({ exams, selectedExamId, onSelect, loading }) {
  const safe = exams || [];
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>✅ Completed Exams</div>
        <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:99, padding:'2px 10px' }}>{safe.length} exams</span>
      </div>
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, maxHeight:420, overflowY:'auto' }}>
        {loading ? <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:'20px 0' }}>Loading…</div>
        : safe.length === 0 ? <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'20px 0' }}><div style={{ fontSize:28, marginBottom:8 }}>📭</div>No completed exams yet</div>
        : safe.map(ex => {
          const sel = selectedExamId === ex.exam_id;
          const tb  = examTypeBadge(examTypeOf(ex));
          return (
            <div key={ex.exam_id} onClick={() => onSelect(sel ? null : ex.exam_id)}
              style={{ border:`2px solid ${sel?'#10b981':'#f1f5f9'}`, borderRadius:10, padding:'12px 14px', cursor:'pointer', background:sel?'#ecfdf5':'#fff' }}>
              <div style={{ fontWeight:700, fontSize:13, color:sel?'#059669':'#111', marginBottom:4 }}>{ex.exam_name||'Exam'}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:700, color:tb.color, background:tb.bg, padding:'2px 8px', borderRadius:99 }}>{tb.label}</span>
                <span style={{ fontSize:10, color:'#6b7280' }}>{ex.submitted_count||0}/{ex.total_students||0} submitted</span>
              </div>
              <div style={{ fontSize:10, color:'#9ca3af' }}>Last: {timeAgo(ex.last_submission)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Student Violations Table ──────────────────────────────────────────────────
function StudentViolationsTable({ examId, onSelectStudent, selectedStudentId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    if (!examId) { setStudents([]); return; }
    setLoading(true);
    apiFetch(`/api/admin/exam-violations/${examId}`)
      .then(d => setStudents(d.students || []))
      .catch(e => { console.warn('exam-violations:', e.message); setStudents([]); })
      .finally(() => setLoading(false));
  }, [examId]);

  const safe = students.filter(s =>
    !search || (s.student_name||'').toLowerCase().includes(search.toLowerCase())
             || String(s.roll_number||'').toLowerCase().includes(search.toLowerCase())
  );

  if (!examId) return (
    <div style={{ background:'#f8fafc', border:'1px dashed #d1d5db', borderRadius:12, padding:28, textAlign:'center', color:'#9ca3af' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>👆</div>
      <div style={{ fontSize:13 }}>Select a completed exam to view student violations</div>
    </div>
  );

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>👥 Students</span>
          <span style={{ fontSize:11, color:'#3b82f6', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:99, padding:'2px 10px' }}>Click to view violations</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…"
          style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', outline:'none', width:200 }} />
      </div>
      {loading ? <div style={{ padding:24, textAlign:'center', color:'#64748b', fontSize:13 }}>Loading…</div>
      : safe.length === 0 ? <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No students found</div>
      : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Student','Roll No','Status','Risk','Trust','Violations','Proctor','Tab Switch','Geo','Actions'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:10.5, textTransform:'uppercase', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safe.map((s,i) => {
                const v = s.violations || {};
                const trust = s.trust_score ?? 100;
                const trustColor = trust>=70?'#16a34a':trust>=40?'#d97706':'#dc2626';
                const isSel = String(selectedStudentId) === String(s.assignment_id);
                return (
                  <tr key={s.assignment_id||i} onClick={()=>onSelectStudent(isSel?null:s)}
                    style={{ borderBottom:'1px solid #f1f5f9', background:isSel?'#eff6ff':i%2===0?'#fff':'#fafbff', cursor:'pointer', outline:isSel?'2px solid #3b82f6':'none', outlineOffset:'-1px' }}>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:riskColor(s.risk_level), color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {(s.student_name||'?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight:600, fontSize:12.5, color:isSel?'#1d4ed8':'#111' }}>{s.student_name||'—'}</div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11.5, color:'#475569' }}>{s.roll_number||'—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:s.assignment_status==='submitted'?'#ecfdf5':'#f8fafc', color:s.assignment_status==='submitted'?'#16a34a':'#6b7280' }}>
                        {s.assignment_status||'—'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px' }}><RiskBadge risk={s.risk_level} /></td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:50, height:5, background:'#e5e7eb', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${trust}%`, height:'100%', background:trustColor, borderRadius:99 }} />
                        </div>
                        <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:trustColor }}>{trust}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:v.total>0?'#dc2626':'#16a34a' }}>{v.total||0}</td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:(v.no_face||0)+(v.multiple_faces||0)+(v.gaze_away||0)>0?'#dc2626':'#16a34a' }}>
                      {(v.no_face||0)+(v.multiple_faces||0)+(v.gaze_away||0)}
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:(v.tab_switch||0)>0?'#d97706':'#16a34a' }}>{v.tab_switch||0}</td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:(v.geo||0)>0?'#dc2626':'#16a34a' }}>{v.geo||0}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <button onClick={e=>{e.stopPropagation();onSelectStudent(isSel?null:s);}}
                        style={{ padding:'4px 10px', borderRadius:6, border:'none', background:isSel?'#dbeafe':'#f1f5f9', color:isSel?'#1d4ed8':'#374151', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {isSel?'Hide':'Details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Student Violation Detail Panel ────────────────────────────────────────────
function StudentViolationDetail({ assignmentId, studentName, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('all');

  useEffect(() => {
    if (!assignmentId) return;
    setLoading(true);
    apiFetch(`/api/admin/student-violations/${assignmentId}`)
      .then(setData)
      .catch(e => { console.warn('student-violations:', e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const CATEGORIES = [
    { key:'all',               label:'All',                  icon:'📋', color:'#374151' },
    { key:'registration_agent',label:'Registration Agent',   icon:'🪪', color:'#7c3aed' },
    { key:'proctoring_agent',  label:'Proctoring (Face/Gaze)', icon:'👁️', color:'#dc2626' },
    { key:'tab_switch',        label:'Tab Switch / Focus',   icon:'🖥️', color:'#d97706' },
    { key:'geo_violations',    label:'Geo / Location',       icon:'🚨', color:'#0891b2' },
    { key:'other',             label:'Other',                icon:'⚠️', color:'#6b7280' },
  ];

  const getList = () => {
    if (!data?.violations) return [];
    if (tab === 'all') return data.violations.all || [];
    return data.violations.categories?.[tab] || [];
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', marginTop:16, marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafafa' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'#6366f1', color:'#fff', fontSize:15, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {(studentName||'?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{studentName||'Student'}</div>
            <div style={{ fontSize:11, color:'#6b7280', fontFamily:'monospace' }}>Violation Report · Assignment #{assignmentId}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:13 }}>✕ Close</button>
      </div>

      {loading ? <div style={{ padding:32, textAlign:'center', color:'#64748b' }}>Loading violations…</div>
      : !data ? <div style={{ padding:32, textAlign:'center', color:'#dc2626' }}>Failed to load violation data.</div>
      : (
        <>
          {/* Summary tiles */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:0, borderBottom:'1px solid #f1f5f9' }}>
            {[
              { label:'Total', value:data.violations?.total||0, color:'#374151', bg:'#f8fafc' },
              { label:'Proctoring', value:(data.violations?.categories?.proctoring_agent||[]).length, color:'#dc2626', bg:'#fef2f2' },
              { label:'Tab Switch', value:(data.violations?.categories?.tab_switch||[]).length, color:'#d97706', bg:'#fffbeb' },
              { label:'Geo', value:(data.violations?.categories?.geo_violations||[]).length, color:'#0891b2', bg:'#ecfeff' },
              { label:'Registration', value:(data.violations?.categories?.registration_agent||[]).length, color:'#7c3aed', bg:'#f5f3ff' },
            ].map((s,i) => (
              <div key={s.label} style={{ padding:'12px 16px', textAlign:'center', borderRight:i<4?'1px solid #f1f5f9':'none', background:s.bg }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category tabs */}
          <div style={{ display:'flex', gap:2, padding:'10px 18px 0', borderBottom:'1px solid #f1f5f9', background:'#fafafa', overflowX:'auto' }}>
            {CATEGORIES.map(c => {
              const count = c.key==='all' ? (data.violations?.total||0) : (data.violations?.categories?.[c.key]||[]).length;
              return (
                <button key={c.key} onClick={()=>setTab(c.key)} style={{
                  padding:'7px 13px', fontSize:11.5, fontWeight:700, border:'none', whiteSpace:'nowrap',
                  borderBottom:tab===c.key?`2px solid ${c.color}`:'2px solid transparent',
                  background:'transparent', color:tab===c.key?c.color:'#64748b', cursor:'pointer', borderRadius:'6px 6px 0 0',
                }}>
                  {c.icon} {c.label}
                  <span style={{ marginLeft:5, fontSize:10, fontWeight:700, background:tab===c.key?'#f1f5f9':'#f8fafc', color:tab===c.key?c.color:'#9ca3af', padding:'1px 6px', borderRadius:99 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Violation list */}
          <div style={{ padding:'14px 18px', maxHeight:320, overflowY:'auto' }}>
            {getList().length === 0 ? (
              <div style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:'20px 0' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✅</div>No violations in this category
              </div>
            ) : getList().map((v,i) => (
              <div key={v.id||i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:'1px solid #f8fafc' }}>
                <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{VIOL_ICONS[(v.type||'').toUpperCase()]||'⚠️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontWeight:700, fontSize:12.5, color:'#0f172a' }}>{(v.type||'').replace(/_/g,' ')}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:v.severity==='high'?'#fef2f2':v.severity==='medium'?'#fffbeb':'#f0fdf4', color:v.severity==='high'?'#dc2626':v.severity==='medium'?'#d97706':'#16a34a' }}>
                      {(v.severity||'').toUpperCase()}
                    </span>
                  </div>
                  {v.message && <div style={{ fontSize:11.5, color:'#475569', lineHeight:1.5 }}>{v.message}</div>}
                </div>
                <span style={{ fontFamily:'monospace', fontSize:10, color:'#9ca3af', flexShrink:0 }}>{timeAgo(v.occurred_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Candidates Table (Active) ─────────────────────────────────────────────────
function CandidatesTable({ candidates, loading, selectedExamId, onTerminate, onSelectCandidate, selectedCandidateId, examCenter }) {
  const [search, setSearch] = useState('');
  const safe = (candidates||[]).filter(c =>
    !search || (c.student_name||'').toLowerCase().includes(search.toLowerCase())
             || (c.roll_number||'').toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedExamId) return (
    <div style={{ background:'#f8fafc', border:'1px dashed #d1d5db', borderRadius:12, padding:28, textAlign:'center', color:'#9ca3af' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>👆</div>
      <div style={{ fontSize:13 }}>Select a live exam to view active candidates</div>
    </div>
  );

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>👥 Live Candidates</span>
          <span style={{ fontSize:11, color:'#3b82f6', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:99, padding:'2px 10px' }}>Click a row for details</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…"
          style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', outline:'none', width:200 }} />
      </div>
      {loading ? <div style={{ padding:24, textAlign:'center', color:'#64748b', fontSize:13 }}>Loading…</div>
      : safe.length === 0 ? <div style={{ padding:24, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No candidates</div>
      : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Student','Roll No','Coords','Distance','Zone','Risk','Trust','Violations','Last Ping','Action'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:10.5, textTransform:'uppercase', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safe.map((c,i) => {
                const trust = c.trust_score ?? 100;
                const trustColor = trust>=70?'#16a34a':trust>=40?'#d97706':'#dc2626';
                const lat = c.last_lat||c.lat, lng = c.last_lng||c.lng;
                const hasCoords = lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));
                const centerLat = examCenter?.[0]||c.geofence_lat||c.initial_lat;
                const centerLng = examCenter?.[1]||c.geofence_lng||c.initial_lng;
                const distM = hasCoords ? haversineMeters(centerLat, centerLng, lat, lng) : null;
                const radius = c.geofence_radius||500;
                const isOut = distM !== null ? distM > radius : c.location_violation;
                const isSel = selectedCandidateId && (String(selectedCandidateId)===String(c.student_id)||String(selectedCandidateId)===String(c.assignment_id));
                const pingStr = timeAgo(c.last_ping||c.last_ping_at);
                const isStale = c.last_ping && (Date.now()-new Date(c.last_ping))>60000;
                return (
                  <tr key={c.assignment_id||c.student_id||i} onClick={()=>onSelectCandidate(isSel?null:c)}
                    style={{ borderBottom:'1px solid #f1f5f9', background:isSel?'#eff6ff':isOut?'#fff5f5':i%2===0?'#fff':'#fafbff', cursor:'pointer', outline:isSel?'2px solid #3b82f6':'none', outlineOffset:'-1px' }}>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:isSel?'#3b82f6':riskColor(c.risk_level), color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {(c.student_name||'?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight:600, color:isSel?'#1d4ed8':'#111', fontSize:12.5 }}>{c.student_name||'—'}</div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11.5, color:'#475569' }}>{c.roll_number||c.student_id||'—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      {hasCoords ? <div style={{ fontFamily:'monospace', fontSize:10.5, color:'#374151', lineHeight:1.5 }}>{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</div>
                      : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      {distM !== null ? <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:distM>radius?'#dc2626':distM>radius*0.8?'#d97706':'#16a34a' }}>{distM}m</span>
                      : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:isOut?'#fee2e2':'#ecfdf5', color:isOut?'#b91c1c':'#166534' }}>
                        {isOut?'✗ Outside':'✓ In Zone'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px' }}><RiskBadge risk={c.risk_level} /></td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:50, height:5, background:'#e5e7eb', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${trust}%`, height:'100%', background:trustColor, borderRadius:99 }} />
                        </div>
                        <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:trustColor }}>{trust}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:(c.violation_count||0)>0?'#dc2626':'#16a34a' }}>{c.violation_count||0}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ fontFamily:'monospace', fontSize:11, color:isStale?'#dc2626':'#64748b' }}>{pingStr}</span></td>
                    <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                      {(c.risk_level==='high'||isOut) && (
                        <button onClick={()=>onTerminate(c)} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>⛔ Terminate</button>
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
  );
}

// ── Candidate Detail Panel ────────────────────────────────────────────────────
function CandidateDetailPanel({ candidate, onClose, onFlag, examCenter }) {
  const [logsOpen, setLogsOpen]     = useState(false);
  const [logs, setLogs]             = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [flagging, setFlagging]     = useState(false);
  if (!candidate) return null;
  const lat = candidate.last_lat||candidate.lat;
  const lng = candidate.last_lng||candidate.lng;
  const trust = candidate.trust_score ?? 100;
  const trustColor = trust>=70?'#16a34a':trust>=40?'#d97706':'#dc2626';
  const centerLat = examCenter?.[0]||candidate.geofence_lat||candidate.initial_lat;
  const centerLng = examCenter?.[1]||candidate.geofence_lng||candidate.initial_lng;
  const distM = haversineMeters(centerLat, centerLng, lat, lng);
  const radius = candidate.geofence_radius||500;
  const isOut = distM !== null ? distM > radius : candidate.location_violation;

  const handleFlag = async () => {
    setFlagging(true);
    try { await apiFetch(`/api/proctoring/admin/flag/${candidate.assignment_id}`, { method:'POST', body:JSON.stringify({reason:'Flagged via dashboard'}) }); if (onFlag) onFlag(candidate); }
    catch (e) { console.warn('Flag failed:', e.message); }
    setFlagging(false);
  };
  const handleLogs = async () => {
    if (logsOpen) { setLogsOpen(false); return; }
    setLogsOpen(true); setLogsLoading(true);
    try { const d = await apiFetch(`/api/proctoring/admin/logs/${candidate.assignment_id}`); setLogs(d.logs||[]); }
    catch { setLogs([]); }
    setLogsLoading(false);
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:riskColor(candidate.risk_level), color:'#fff', fontSize:16, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {(candidate.student_name||'?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{candidate.student_name}</div>
            <div style={{ fontSize:11, color:'#6b7280', fontFamily:'monospace' }}>{candidate.roll_number||candidate.student_id} • <RiskBadge risk={candidate.risk_level} /></div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>×</button>
      </div>
      <div style={{ padding:'14px 18px' }}>
        {[
          { label:'📍 Coordinates', value: lat && lng ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}` : '—', mono:true },
          { label:'📏 Distance', value: distM !== null ? `${distM}m from center` : '—', color: distM > radius ? '#dc2626' : distM > radius*0.8 ? '#d97706' : '#16a34a' },
          { label:'🗺 Zone', value: isOut ? '✗ Outside allowed zone' : '✓ Inside allowed zone', color: isOut ? '#dc2626' : '#16a34a' },
          { label:'⏱ Last Ping', value: timeAgo(candidate.last_ping) },
          { label:'🚩 Violations', value: `${candidate.violation_count||0} recorded`, color: (candidate.violation_count||0)>0?'#dc2626':'#166634' },
        ].map((row,i,arr) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid #f8fafc':'none' }}>
            <span style={{ fontSize:12, color:'#6b7280' }}>{row.label}</span>
            <span style={{ fontSize:12, fontWeight:600, color:row.color||'#0f172a', fontFamily:row.mono?'monospace':'inherit' }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
          <span style={{ fontSize:12, color:'#6b7280' }}>🛡 Trust Score</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:120, height:6, background:'#e5e7eb', borderRadius:99, overflow:'hidden' }}>
              <div style={{ width:`${trust}%`, height:'100%', background:trustColor, borderRadius:99 }} />
            </div>
            <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:trustColor }}>{trust}%</span>
          </div>
        </div>
      </div>
      <div style={{ padding:'0 18px 16px', display:'flex', gap:10 }}>
        <button onClick={handleFlag} disabled={flagging} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontWeight:700, cursor:'pointer', fontSize:13 }}>
          🚩 {flagging?'Flagging…':'Flag'}
        </button>
        <button onClick={handleLogs} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #d1d5db', background:'#fff', color:'#374151', fontWeight:700, cursor:'pointer', fontSize:13 }}>
          📋 {logsOpen?'Hide Logs':'Logs'}
        </button>
      </div>
      {logsOpen && (
        <div style={{ padding:'0 18px 16px' }}>
          <div style={{ background:'#f8fafc', borderRadius:10, padding:12, maxHeight:200, overflowY:'auto' }}>
            {logsLoading ? <div style={{ color:'#64748b', fontSize:12, textAlign:'center' }}>Loading logs…</div>
            : logs.length === 0 ? <div style={{ color:'#9ca3af', fontSize:12, textAlign:'center' }}>No violations recorded</div>
            : logs.map(log => (
              <div key={log.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:11.5 }}>
                <span>{VIOL_ICONS[(log.type||'').toUpperCase()]||'⚠️'}</span>
                <span style={{ flex:1, color:'#374151' }}>{(log.type||'').replace(/_/g,' ')} {log.message?`— ${log.message}`:''}</span>
                <span style={{ color:'#9ca3af', fontFamily:'monospace', flexShrink:0 }}>{timeAgo(log.occurred_at)}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:log.severity==='high'?'#fef2f2':'#fffbeb', color:log.severity==='high'?'#dc2626':'#d97706' }}>
                  {(log.severity||'').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Map ──────────────────────────────────────────────────────────────────
function LiveMap({ sessions, examCenter, focusCandidate }) {
  const mapRef = useRef(null), leafletRef = useRef(null), layerRef = useRef(null), initRef = useRef(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || initRef.current || !window.L) return;
      initRef.current = true;
      const center = examCenter || [13.0827, 80.2707];
      const map = window.L.map(mapRef.current, { zoom:14, center });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(map);
      leafletRef.current = map;
      layerRef.current = window.L.layerGroup().addTo(map);
      window.L.circle(center, { radius:500, color:'#4f46e5', weight:2, dashArray:'8 6', fillColor:'#4f46e5', fillOpacity:0.05 }).addTo(map);
    };
    if (!window.L) {
      if (!document.getElementById('leaflet-js')) {
        const s = document.createElement('script'); s.id = 'leaflet-js';
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = () => setTimeout(initMap, 100); document.head.appendChild(s);
      }
    } else { setTimeout(initMap, 50); }
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; initRef.current = false; } };
  }, []);

  useEffect(() => {
    if (!focusCandidate || !leafletRef.current) return;
    const lat = parseFloat(focusCandidate.last_lat||focusCandidate.lat||focusCandidate.initial_lat);
    const lng = parseFloat(focusCandidate.last_lng||focusCandidate.lng||focusCandidate.initial_lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) leafletRef.current.setView([lat,lng], 16, { animate:true });
  }, [focusCandidate?.student_id, focusCandidate?.last_lat]);

  useEffect(() => {
    const L = window.L;
    if (!L || !leafletRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const visible = filter==='high' ? sessions.filter(s=>s.risk_level==='high'||s.location_violation) : sessions;
    const coords = [];
    visible.forEach(s => {
      const lat = parseFloat(s.lat||s.last_lat), lng = parseFloat(s.lng||s.last_lng);
      if (!Number.isFinite(lat)||!Number.isFinite(lng)) return;
      coords.push([lat,lng]);
      const risk = s.location_violation?'high':(s.risk_level||'low');
      const color = risk==='high'?'#dc2626':risk==='medium'?'#d97706':'#16a34a';
      const isFocused = focusCandidate && String(focusCandidate.student_id)===String(s.candidate_id||s.student_id);
      const size = isFocused?22:(risk==='high'?18:13);
      const icon = L.divIcon({ className:'', html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${isFocused?'3px solid #1d4ed8':'2.5px solid #fff'};box-shadow:0 1px 6px ${color}88;"></div>`, iconSize:[size,size], iconAnchor:[size/2,size/2] });
      L.marker([lat,lng],{icon}).bindPopup(`<b>${s.student_name||'Unknown'}</b><br/>${s.roll_number||''}<br/>Trust:${s.trust_score??'—'}%<br/>Risk:${risk.toUpperCase()}`).addTo(layerRef.current);
    });
    if (!focusCandidate) {
      if (coords.length===1) leafletRef.current.setView(coords[0],15);
      else if (coords.length>1) leafletRef.current.fitBounds(L.latLngBounds(coords),{padding:[40,40],maxZoom:16});
    }
  }, [sessions, filter, focusCandidate]);

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>📍 Live Location Tracking</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setFilter(f=>f==='all'?'high':'all')} style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:8, border:'1px solid', borderColor:filter==='high'?'#fecaca':'#e5e7eb', background:filter==='high'?'#fef2f2':'#fff', color:filter==='high'?'#dc2626':'#64748b', cursor:'pointer' }}>
            {filter==='high'?'🔴 High Risk Only':'🌐 All Candidates'}
          </button>
        </div>
      </div>
      <div ref={mapRef} style={{ height:280, width:'100%' }} />
    </div>
  );
}

// ── Alerts Table ──────────────────────────────────────────────────────────────
function AlertsTable({ alerts, loading, filterRisk, setFilterRisk, onViewSnapshot, onTerminate }) {
  const safe = (alerts||[]).filter(a => filterRisk==='all'||(a.severity||'').toLowerCase()===filterRisk);
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>⚠️ Proctoring Alerts</div>
        <select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} style={{ fontSize:12, padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', cursor:'pointer' }}>
          <option value="all">All Risk Levels</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
      </div>
      <div style={{ overflowX:'auto' }}>
        {loading ? <div style={{ padding:24, textAlign:'center', color:'#64748b', fontSize:13 }}>Loading alerts…</div>
        : safe.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}><div style={{ fontSize:28, marginBottom:8 }}>✅</div>No alerts</div>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Candidate','Exam','Type','Severity','Time','Actions'].map(h => (
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:10.5, textTransform:'uppercase', borderBottom:'1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safe.map(a => (
                <tr key={a.violation_id} style={{ borderBottom:'1px solid #f1f5f9', background:a.severity==='high'?'#fff5f5':'#fff' }}>
                  <td style={{ padding:'10px 14px' }}><div style={{ fontWeight:600, color:'#111' }}>{a.student_name}</div><div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace' }}>{a.roll_number}</div></td>
                  <td style={{ padding:'10px 14px', color:'#374151', fontSize:12 }}>{a.exam_name||'—'}</td>
                  <td style={{ padding:'10px 14px' }}>{VIOL_ICONS[(a.type||'').toUpperCase()]||'⚠️'} {(a.type||'').replace(/_/g,' ')}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:6, background:a.severity==='high'?'#fef2f2':a.severity==='medium'?'#fffbeb':'#f0fdf4', color:a.severity==='high'?'#dc2626':a.severity==='medium'?'#d97706':'#16a34a' }}>{(a.severity||'').toUpperCase()}</span></td>
                  <td style={{ padding:'10px 14px', color:'#9ca3af', fontFamily:'monospace', fontSize:11 }}>{timeAgo(a.time)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      {a.has_snapshot && <button onClick={()=>onViewSnapshot(a.violation_id)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>📸</button>}
                      {a.severity==='high' && <button onClick={()=>onTerminate({assignment_id:a.assignment_id,student_name:a.student_name})} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>⛔</button>}
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

// ── Modals ────────────────────────────────────────────────────────────────────
function SnapshotModal({ violationId, onClose }) {
  const [data, setData] = useState(null), [err, setErr] = useState(null), [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); setErr(null); apiFetch(`/api/proctoring/snapshot/${violationId}`).then(setData).catch(e=>setErr(e.message)).finally(()=>setLoading(false)); }, [violationId]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:560, width:'90%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15 }}>📸 Violation Snapshot</div>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700 }}>✕ Close</button>
        </div>
        {loading && <div style={{ textAlign:'center', padding:32, color:'#64748b' }}>Loading…</div>}
        {err    && <div style={{ color:'#dc2626', padding:12, background:'#fef2f2', borderRadius:8 }}>Error: {err}</div>}
        {data && (data.snapshot_b64 ? <img src={`data:image/jpeg;base64,${data.snapshot_b64}`} alt="Snapshot" style={{ width:'100%', borderRadius:10 }} /> : <div style={{ padding:24, textAlign:'center', background:'#f8fafc', borderRadius:10, color:'#9ca3af' }}>No snapshot captured</div>)}
      </div>
    </div>
  );
}

function TerminateModal({ candidate, onConfirm, onClose }) {
  const [reason, setReason] = useState('Repeated violations detected');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:420, width:'90%' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⛔</div>
        <div style={{ fontWeight:800, fontSize:16, textAlign:'center', color:'#0f172a', marginBottom:6 }}>Terminate Session?</div>
        <div style={{ color:'#64748b', fontSize:13, textAlign:'center', marginBottom:20 }}>This will end the exam session for <strong>{candidate?.student_name}</strong>.</div>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} style={{ width:'100%', borderRadius:8, border:'1px solid #d1d5db', fontSize:13, padding:'8px 12px', resize:'none', boxSizing:'border-box', marginBottom:16 }} />
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:'1px solid #d1d5db', background:'#fff', fontWeight:700, cursor:'pointer', fontSize:13 }}>Cancel</button>
          <button onClick={()=>onConfirm(candidate,reason)} style={{ flex:1, padding:10, borderRadius:10, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13 }}>⛔ Terminate</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminLiveMonitoring() {
  // Active exam state
  const [exams,             setExams]           = useState([]);
  const [candidates,        setCandidates]      = useState([]);
  const [alerts,            setAlerts]          = useState([]);
  const [geoSessions,       setGeoSessions]     = useState([]);
  const [geoStats,          setGeoStats]        = useState({ activeCandidates:0, highRisk:0, mediumRisk:0, criticalAlerts:0 });
  const [selectedExamId,    setSelectedExamId]  = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Completed exam state
  const [completedExams,    setCompletedExams]  = useState([]);
  const [selectedCompletedExamId, setSelectedCompletedExamId] = useState(null);
  const [selectedStudent,   setSelectedStudent] = useState(null);

  // UI state
  const [mainTab,           setMainTab]         = useState('active'); // 'active' | 'completed'
  const [filterRisk,        setFilterRisk]      = useState('all');
  const [loadingExams,      setLoadingExams]    = useState(true);
  const [loadingCompleted,  setLoadingCompleted] = useState(false);
  const [loadingCands,      setLoadingCands]    = useState(false);
  const [loadingAlerts,     setLoadingAlerts]   = useState(true);
  const [snapshotViolId,    setSnapshotViolId]  = useState(null);
  const [terminateTarget,   setTerminateTarget] = useState(null);
  const [toasts,            setToasts]          = useState([]);
  const [pulse,             setPulse]           = useState(false);

  const alertIdsRef = useRef(new Set());
  const geoPolRef   = useRef(false);
  const alertPolRef = useRef(false);

  const showToast = useCallback((message, type='info') => {
    const id = Date.now();
    setToasts(p => [...p, {id, message, type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchExams = useCallback(async () => {
    try { const d = await apiFetch('/api/proctoring/admin/active-exams'); setExams(d.exams||[]); }
    catch { /* keep */ } finally { setLoadingExams(false); }
  }, []);

  const fetchCompletedExams = useCallback(async () => {
    setLoadingCompleted(true);
    try { const d = await apiFetch('/api/admin/completed-exams'); setCompletedExams(d.exams||[]); }
    catch { /* keep */ } finally { setLoadingCompleted(false); }
  }, []);

  const fetchCandidates = useCallback(async (examId) => {
    if (!examId) { setCandidates([]); return; }
    setLoadingCands(true);
    try {
      const d = await apiFetch(`/api/proctoring/admin/candidates/${examId}`);
      const merged = (d.candidates||[]).map(c => {
        const geo = geoSessions.find(s => String(s.candidate_id)===String(c.student_id));
        return { ...c, last_lat:geo?.lat??geo?.last_lat??c.last_lat, last_lng:geo?.lng??geo?.last_lng??c.last_lng, last_ping:geo?.last_ping??c.last_ping, trust_score:geo?.trust_score??c.trust_score??100, risk_level:geo?.risk_level??c.risk_level??'low', location_violation:geo?.location_violation??c.location_violation??false };
      });
      setCandidates(merged);
    } catch { /* keep */ } finally { setLoadingCands(false); }
  }, [geoSessions]);

  const fetchGeoSessions = useCallback(async () => {
    if (geoPolRef.current) return;
    geoPolRef.current = true;
    try {
      const d = await apiFetch('/api/admin/sessions');
      const sessions = d.sessions || [];
      setGeoSessions(sessions);
      setGeoStats(prev => ({ activeCandidates:sessions.length, highRisk:sessions.filter(s=>s.location_violation||s.risk_level==='high').length, mediumRisk:sessions.filter(s=>!s.location_violation&&s.risk_level==='medium').length, criticalAlerts:prev.criticalAlerts }));
    } catch (e) { console.warn('[GEO] sessions fetch error:', e.message); }
    finally { geoPolRef.current = false; }
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (alertPolRef.current) return;
    alertPolRef.current = true;
    try {
      const d = await apiFetch('/api/proctoring/admin/alerts');
      const fetched = d.alerts||[];
      const newOnes = fetched.filter(a => !alertIdsRef.current.has(a.violation_id));
      newOnes.forEach(a => alertIdsRef.current.add(a.violation_id));
      const newest = newOnes.find(a => a.severity==='high');
      if (newest) showToast(`🚨 ${newest.type?.replace(/_/g,' ')} — ${newest.student_name}`, 'danger');
      setAlerts(fetched);
      setGeoStats(prev => ({ ...prev, criticalAlerts:fetched.filter(a=>a.severity==='high').length }));
    } catch { /* keep */ } finally { setLoadingAlerts(false); alertPolRef.current = false; }
  }, [showToast]);

  useEffect(() => { fetchExams(); fetchGeoSessions(); fetchAlerts(); fetchCompletedExams(); }, []);
  useEffect(() => { const t = setInterval(fetchExams, 15000); return ()=>clearInterval(t); }, [fetchExams]);
  useEffect(() => { const t = setInterval(()=>{ fetchAlerts(); setPulse(true); setTimeout(()=>setPulse(false),600); }, 10000); return ()=>clearInterval(t); }, [fetchAlerts]);
  useEffect(() => { const t = setInterval(fetchGeoSessions, 8000); return ()=>clearInterval(t); }, [fetchGeoSessions]);
  useEffect(() => { fetchCandidates(selectedExamId); setSelectedCandidate(null); }, [selectedExamId]);
  useEffect(() => { if (selectedExamId) fetchCandidates(selectedExamId); }, [geoSessions]);

  const handleTerminate = useCallback(async (target, reason) => {
    try {
      if (target?.session_id) await apiFetch(`/api/session/${target.session_id}/terminate`, { method:'POST' });
      else if (target?.assignment_id) await apiFetch(`/api/proctoring/admin/terminate/${target.assignment_id}`, { method:'POST', body:JSON.stringify({reason}) });
      setCandidates(p => p.filter(c => c.assignment_id !== target?.assignment_id));
      showToast('⛔ Session terminated', 'danger');
      fetchAlerts(); fetchGeoSessions();
    } catch { showToast('Failed to terminate', 'danger'); }
    setTerminateTarget(null);
  }, [fetchAlerts, fetchGeoSessions, showToast]);

  const examCenter = (() => { const s = geoSessions.find(s=>s.initial_lat&&s.initial_lng); return s ? [parseFloat(s.initial_lat), parseFloat(s.initial_lng)] : null; })();
  const focusedForMap = selectedCandidate ? (() => { const geo = geoSessions.find(s=>String(s.candidate_id)===String(selectedCandidate.student_id)); return { ...selectedCandidate, ...(geo?{last_lat:geo.lat??geo.last_lat, last_lng:geo.lng??geo.last_lng}:{}) }; })() : null;
  const highCount = candidates.filter(c=>c.risk_level==='high').length;
  const medCount  = candidates.filter(c=>c.risk_level==='medium').length;

  return (
    <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh', background:'#f4f6fb' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex:1, overflow:'auto', padding:'20px 24px 40px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#0f172a' }}>Live Monitoring</h1>
            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Real-time AI proctoring · updates every 8–15s</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, fontSize:11, fontWeight:700, color:'#16a34a' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', display:'inline-block', transform:pulse?'scale(1.7)':'scale(1)', transition:'transform .3s' }} />
              LIVE
            </div>
            <LiveClock />
            {highCount>0 && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fef2f2', color:'#dc2626', fontFamily:'monospace' }}>🔴 {highCount} HIGH</span>}
            {medCount>0  && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fffbeb', color:'#d97706', fontFamily:'monospace' }}>🟡 {medCount} MED</span>}
          </div>
        </div>

        <StatsCards geoStats={geoStats} exams={exams} completedExams={completedExams} />

        {/* Main Tabs: Active / Completed */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:6, width:'fit-content' }}>
          {[
            { key:'active',    label:'🟢 Active Monitoring', count:exams.length },
            { key:'completed', label:'✅ Completed Exams',   count:completedExams.length },
          ].map(t => (
            <button key={t.key} onClick={()=>setMainTab(t.key)} style={{
              padding:'9px 20px', borderRadius:8, border:'none', fontWeight:700, fontSize:13, cursor:'pointer',
              background:mainTab===t.key?'#1e293b':'transparent', color:mainTab===t.key?'#fff':'#64748b', transition:'all .15s',
            }}>
              {t.label} <span style={{ marginLeft:5, fontSize:10, opacity:0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* ACTIVE TAB */}
        {mainTab === 'active' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, marginBottom:24 }}>
              <LiveMap sessions={geoSessions} examCenter={examCenter} focusCandidate={focusedForMap} />
              <ActiveExamCards exams={exams} selectedExamId={selectedExamId} onSelect={setSelectedExamId} loading={loadingExams} />
            </div>

            <div style={{ marginBottom:selectedCandidate?0:16 }}>
              <CandidatesTable candidates={candidates} loading={loadingCands} selectedExamId={selectedExamId} onTerminate={setTerminateTarget} onSelectCandidate={setSelectedCandidate} selectedCandidateId={selectedCandidate?.student_id||selectedCandidate?.assignment_id} examCenter={examCenter} />
            </div>

            {selectedCandidate && (
              <CandidateDetailPanel candidate={selectedCandidate} onClose={()=>setSelectedCandidate(null)} onFlag={()=>showToast('🚩 Student flagged','warn')} examCenter={examCenter} />
            )}

            <AlertsTable alerts={alerts} loading={loadingAlerts&&alerts.length===0} filterRisk={filterRisk} setFilterRisk={setFilterRisk} onViewSnapshot={setSnapshotViolId} onTerminate={setTerminateTarget} />
          </>
        )}

        {/* COMPLETED TAB */}
        {mainTab === 'completed' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20, marginBottom:selectedStudent?0:16 }}>
              <CompletedExamCards exams={completedExams} selectedExamId={selectedCompletedExamId} onSelect={id=>{ setSelectedCompletedExamId(id); setSelectedStudent(null); }} loading={loadingCompleted} />
              <StudentViolationsTable examId={selectedCompletedExamId} onSelectStudent={setSelectedStudent} selectedStudentId={selectedStudent?.assignment_id} />
            </div>

            {selectedStudent && (
              <StudentViolationDetail
                assignmentId={selectedStudent.assignment_id}
                studentName={selectedStudent.student_name}
                onClose={()=>setSelectedStudent(null)}
              />
            )}
          </>
        )}
      </main>

      {snapshotViolId && <SnapshotModal violationId={snapshotViolId} onClose={()=>setSnapshotViolId(null)} />}
      {terminateTarget && <TerminateModal candidate={terminateTarget} onConfirm={handleTerminate} onClose={()=>setTerminateTarget(null)} />}
      <ToastStack toasts={toasts} />
      <style>{`::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}`}</style>
    </div>
  );
}