// src/pages/ExamManager.jsx
// Admin: sees question_bank → creates exam → sets date/time → approves
// One page, no routing needed

import React, { useState, useEffect } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:5000';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ExamManager() {
  const [view,     setView]     = useState('list');   // list | create | approve
  const [exams,    setExams]    = useState([]);
  const [qBank,    setQBank]    = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy,     setBusy]     = useState(false);
  const [toast,    setToast]    = useState('');
  const [approveTarget, setApproveTarget] = useState(null);

  const [form, setForm] = useState({
    title: '', college: '', batch_year: new Date().getFullYear(),
    duration_minutes: 60, total_marks: 100, pass_mark: 40, description: '',
  });
  const [schedule, setSchedule] = useState({ start_date: '', end_date: '' });

  function showToast(msg, color = '#059669') {
    setToast({ msg, color });
    setTimeout(() => setToast(''), 4000);
  }

  // ── Load exams ──────────────────────────────────────────────────────────────
  async function loadExams() {
    try {
      const r = await fetch(`${API}/api/exams`, { headers: authHeader() });
      const d = await r.json();
      setExams(d.exams || []);
    } catch {}
  }

  // ── Load question bank ──────────────────────────────────────────────────────
  async function loadQBank() {
    try {
      const r = await fetch(`${API}/api/question-bank`, { headers: authHeader() });
      const d = await r.json();
      setQBank(Array.isArray(d) ? d : []);
    } catch {}
  }

  useEffect(() => { loadExams(); }, []);

  // ── Create exam ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.title || !form.college || !form.batch_year)
      return showToast('Title, college and batch year are required', '#dc2626');
    if (selected.length === 0)
      return showToast('Select at least one question', '#dc2626');

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/exams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          ...form,
          question_ids: selected.map(q => q._dbId).filter(Boolean),
          sections: { mcq: true, coding: true, sql: true },
          section_config: {},
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      showToast(`✓ Exam created with ${d.questions_saved} questions! Now approve it to assign students.`);
      setView('list');
      setSelected([]);
      setForm({ title: '', college: '', batch_year: new Date().getFullYear(), duration_minutes: 60, total_marks: 100, pass_mark: 40, description: '' });
      loadExams();
    } catch (e) { showToast(e.message, '#dc2626'); }
    finally { setBusy(false); }
  }

  // ── Approve exam ────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!schedule.start_date || !schedule.end_date)
      return showToast('Set start and end date/time', '#dc2626');
    if (new Date(schedule.end_date) <= new Date(schedule.start_date))
      return showToast('End must be after start', '#dc2626');

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/exams/${approveTarget.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...schedule, duration_minutes: approveTarget.duration_minutes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      showToast(`✓ Exam approved! ${d.students_assigned} students assigned.`);
      setApproveTarget(null);
      setView('list');
      setSchedule({ start_date: '', end_date: '' });
      loadExams();
    } catch (e) { showToast(e.message, '#dc2626'); }
    finally { setBusy(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STYLES
  const card   = { background:'#fff', borderRadius:12, border:'1px solid #f1f5f9', padding:24, marginBottom:16 };
  const inp    = { width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' };
  const lbl    = { fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 };
  const btnPrimary = { padding:'10px 24px', background:'linear-gradient(135deg,#7055C8,#C060C0)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' };
  const btnSecondary = { padding:'10px 24px', border:'1.5px solid #e2e8f0', background:'#fff', borderRadius:8, color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' };

  const statusColor = { draft:'#94a3b8', pending_approval:'#f59e0b', approved:'#059669', live:'#dc2626', completed:'#6b7280' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginLeft:230, minHeight:'100vh', background:'#f8fafc' }}>
      <Sidebar /><Navbar />

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:toast.color||'#059669', color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <main style={{ padding:'28px 32px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>

          {/* ── Header ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1060', marginBottom:4 }}>Exam Manager</h1>
              <p style={{ fontSize:13, color:'#94a3b8' }}>Create exams from Question Bank → Approve → Students get assigned automatically</p>
            </div>
            {view === 'list' && (
              <button onClick={() => { setView('create'); loadQBank(); }} style={btnPrimary}>
                + Create New Exam
              </button>
            )}
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setApproveTarget(null); }} style={btnSecondary}>
                ← Back to List
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              VIEW: LIST
          ══════════════════════════════════════════════════════ */}
          {view === 'list' && (
            <div>
              <button onClick={loadExams} style={{ ...btnSecondary, marginBottom:16, fontSize:12 }}>↻ Refresh</button>

              {exams.length === 0 ? (
                <div style={{ ...card, textAlign:'center', padding:48, color:'#94a3b8' }}>
                  No exams yet. Click <strong>+ Create New Exam</strong> to start.
                </div>
              ) : exams.map(exam => (
                <div key={exam.id} style={{ ...card, display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1a1060', marginBottom:4 }}>{exam.title}</div>
                    <div style={{ fontSize:12, color:'#64748b' }}>
                      {exam.college} · Batch {exam.batch_year} · {exam.question_count||0} questions · {exam.student_count||0} students
                    </div>
                    {exam.start_date && (
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                        {new Date(exam.start_date).toLocaleString('en-IN')} → {new Date(exam.end_date).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:`${statusColor[exam.status]}22`, color:statusColor[exam.status]||'#94a3b8', border:`1px solid ${statusColor[exam.status]}44` }}>
                    {(exam.status||'draft').toUpperCase()}
                  </span>
                  {exam.status === 'draft' && (
                    <button
                      onClick={() => { setApproveTarget(exam); setView('approve'); }}
                      style={{ ...btnPrimary, padding:'8px 18px', fontSize:12, background:'linear-gradient(135deg,#059669,#10b981)' }}
                    >
                      Approve & Schedule
                    </button>
                  )}
                  {exam.status === 'approved' && (
                    <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>✓ Students assigned</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW: CREATE
          ══════════════════════════════════════════════════════ */}
          {view === 'create' && (
            <div>
              {/* Exam details */}
              <div style={card}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'#1a1060', marginBottom:18 }}>Exam Details</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={lbl}>Exam Title *</label>
                    <input style={inp} placeholder="e.g. React Developer Assessment" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div>
                      <label style={lbl}>College / Company *</label>
                      <input style={inp} placeholder="Must match candidates.college exactly" value={form.college} onChange={e => setForm(p=>({...p,college:e.target.value}))} />
                    </div>
                    <div>
                      <label style={lbl}>Batch Year *</label>
                      <input style={inp} type="number" value={form.batch_year} onChange={e => setForm(p=>({...p,batch_year:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                    <div>
                      <label style={lbl}>Duration (min)</label>
                      <input style={inp} type="number" value={form.duration_minutes} onChange={e => setForm(p=>({...p,duration_minutes:e.target.value}))} />
                    </div>
                    <div>
                      <label style={lbl}>Total Marks</label>
                      <input style={inp} type="number" value={form.total_marks} onChange={e => setForm(p=>({...p,total_marks:e.target.value}))} />
                    </div>
                    <div>
                      <label style={lbl}>Pass Mark</label>
                      <input style={inp} type="number" value={form.pass_mark} onChange={e => setForm(p=>({...p,pass_mark:e.target.value}))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Question selector */}
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#1a1060' }}>
                    Select Questions
                    {selected.length > 0 && <span style={{ marginLeft:10, fontSize:13, color:'#7055C8' }}>{selected.length} selected</span>}
                  </h3>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setSelected(qBank)} style={{ ...btnSecondary, padding:'6px 14px', fontSize:12 }}>Select All ({qBank.length})</button>
                    <button onClick={() => setSelected([])}    style={{ ...btnSecondary, padding:'6px 14px', fontSize:12 }}>Clear</button>
                  </div>
                </div>

                {qBank.length === 0 ? (
                  <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>
                    No questions in bank. <a href="#/question-bank" style={{ color:'#7055C8' }}>Generate with QuizForge →</a>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:360, overflowY:'auto' }}>
                    {qBank.map(q => {
                      const isSel = selected.find(x => x.id === q.id);
                      return (
                        <div key={q.id} onClick={() => setSelected(p => isSel ? p.filter(x=>x.id!==q.id) : [...p,q])}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8, cursor:'pointer', border:`1.5px solid ${isSel?'#7055C8':'#f1f5f9'}`, background:isSel?'rgba(112,85,200,0.04)':'#fff', transition:'all .15s' }}>
                          <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${isSel?'#7055C8':'#d1d5db'}`, background:isSel?'#7055C8':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {isSel && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{q.topic}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.question_text}</div>
                          </div>
                          <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:'#ede9fe', color:'#7c3aed', flexShrink:0 }}>{q.type}</span>
                          <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, flexShrink:0,
                            background: (q.difficulty||'').toLowerCase()==='hard'?'#fee2e2':(q.difficulty||'').toLowerCase()==='easy'?'#dcfce7':'#fef9c3',
                            color:      (q.difficulty||'').toLowerCase()==='hard'?'#dc2626':(q.difficulty||'').toLowerCase()==='easy'?'#16a34a':'#ca8a04',
                          }}>{q.difficulty}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button onClick={() => setView('list')} style={btnSecondary}>Cancel</button>
                <button onClick={handleCreate} disabled={busy} style={{ ...btnPrimary, opacity:busy?0.6:1 }}>
                  {busy ? 'Creating…' : `Create Exam (${selected.length} questions)`}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW: APPROVE
          ══════════════════════════════════════════════════════ */}
          {view === 'approve' && approveTarget && (
            <div style={card}>
              <h3 style={{ fontSize:16, fontWeight:700, color:'#1a1060', marginBottom:4 }}>Approve & Schedule</h3>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
                Exam: <strong>{approveTarget.title}</strong> · {approveTarget.college} · Batch {approveTarget.batch_year}
              </p>

              <div style={{ background:'#f8faff', border:'1px solid #e8e4f8', borderRadius:10, padding:16, marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#7055C8', marginBottom:12 }}>📅 Set Exam Window</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>Start Date & Time *</label>
                    <input style={inp} type="datetime-local" value={schedule.start_date} onChange={e => setSchedule(p=>({...p,start_date:e.target.value}))} />
                  </div>
                  <div>
                    <label style={lbl}>End Date & Time *</label>
                    <input style={inp} type="datetime-local" value={schedule.end_date} onChange={e => setSchedule(p=>({...p,end_date:e.target.value}))} />
                  </div>
                </div>
                {schedule.start_date && schedule.end_date && new Date(schedule.end_date) > new Date(schedule.start_date) && (
                  <div style={{ marginTop:12, fontSize:12, color:'#059669', fontWeight:600 }}>
                    ✓ {new Date(schedule.start_date).toLocaleString('en-IN')} → {new Date(schedule.end_date).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div style={{ background:'#fffbeb', border:'1px solid #fbbf24', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#92400e' }}>
                ⚠️ Make sure <strong>{approveTarget.college}</strong> matches exactly what's in your <code>candidates.college</code> column, and batch <strong>{approveTarget.batch_year}</strong> matches <code>candidates.batch</code>.
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setView('list')} style={btnSecondary}>Cancel</button>
                <button onClick={handleApprove} disabled={busy} style={{ ...btnPrimary, background:'linear-gradient(135deg,#059669,#10b981)', opacity:busy?0.6:1 }}>
                  {busy ? 'Approving…' : '✓ Approve & Notify Students'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
