// src/pages/QuestionBank.jsx
// Blue/white professional theme matching Dashboard
// All logic preserved, only visual theme changed from violet → blue

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar          from '../components/Navbar';
import Sidebar         from '../components/Sidebar';
import ConfigurePanel  from '../components/QuizForge/ConfigurePanel';
import GeneratingPanel from '../components/QuizForge/GeneratingPanel';
import ReviewPanel     from '../components/QuizForge/ReviewPanel';
import StepIndicator   from '../components/QuizForge/StepIndicator';
import { useGeneration } from '../hooks/useGeneration';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Design tokens — Blue/White professional ───────────────────────────────────
const T = {
  primary:   '#1e3a8a',
  accent:    '#2563eb',
  accentLt:  '#eff6ff',
  accentBd:  '#bfdbfe',
  text:      '#1e293b',
  text2:     '#475569',
  text3:     '#94a3b8',
  border:    '#e2e8f0',
  bg:        '#f0f7ff',
  white:     '#ffffff',
  green:     '#059669',
  greenBg:   '#ecfdf5',
  greenBd:   '#6ee7b7',
  red:       '#dc2626',
  redBg:     '#fef2f2',
  redBd:     '#fca5a5',
};

// ── Exam type themes ──────────────────────────────────────────────────────────
const EXAM_TYPE_META = {
  placement:           { label:'Placement',  color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe', icon:'💼' },
  hiring:              { label:'Hiring',     color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe', icon:'🏢' },
  university:          { label:'University', color:'#0369a1', bg:'#f0f9ff', border:'#bae6fd', icon:'🎓' },
  skill_cert:          { label:'Certification', color:'#059669', bg:'#ecfdf5', border:'#6ee7b7', icon:'🏆' },
  skill_certification: { label:'Certification', color:'#059669', bg:'#ecfdf5', border:'#6ee7b7', icon:'🏆' },
  general:             { label:'General',    color:'#475569', bg:'#f8fafc', border:'#e2e8f0', icon:'📋' },
};

const QB_TYPE_COLORS = {
  mcq:      { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
  sql:      { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  coding:   { color:'#d97706', bg:'#fffbeb', border:'#fcd34d' },
  aptitude: { color:'#0891b2', bg:'#f0f9ff', border:'#bae6fd' },
  verbal:   { color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8' },
};

const LANG_LABELS = { python:'Python', java:'Java', cpp:'C++', javascript:'JavaScript' };

function TypeChip({ type }) {
  const t = (type || '').toLowerCase();
  const m = QB_TYPE_COLORS[t] || { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' };
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
      background:m.bg, border:`1px solid ${m.border}`, color:m.color }}>
      {t.toUpperCase()}
    </span>
  );
}

function ExamTypeBadge({ type }) {
  const key = (type || 'general').toLowerCase();
  const m   = EXAM_TYPE_META[key] || EXAM_TYPE_META.general;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
      background:m.bg, border:`1px solid ${m.border}`, color:m.color }}>
      <span>{m.icon}</span> {m.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success' }) {
  if (!msg) return null;
  return (
    <div style={{ position:'fixed', top:20, right:24, zIndex:9999,
      background: type === 'error' ? T.red : T.primary,
      color:'#fff', padding:'12px 20px', borderRadius:10,
      fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
      maxWidth:380, animation:'slideIn 0.2s ease' }}>
      {msg}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function parseCodingMeta(explanation) {
  if (!explanation) return null;
  if (typeof explanation === 'object' && explanation.starterCode) return explanation;
  try {
    const p = JSON.parse(explanation);
    if (p && typeof p === 'object' && p.starterCode) return p;
  } catch (_) {}
  return null;
}

// ── PDF Download ──────────────────────────────────────────────────────────────
async function downloadSessionPDF(session, grouped) {
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 50, maxW = pw - margin * 2, lh = 16;
  let y = margin;

  function checkPage(need = lh) { if (y + need > ph - margin) { doc.addPage(); y = margin; } }
  function writeLine(text, { fontSize=11, style='normal', family='helvetica', color=[30,30,30], indent=0, lineH=lh } = {}) {
    doc.setFont(family, style); doc.setFontSize(fontSize); doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(String(text), maxW - indent);
    for (const wl of wrapped) { checkPage(lineH); doc.text(wl, margin + indent, y); y += lineH; }
  }
  function writeLabel(label) { writeLine(label, { fontSize:9.5, style:'bold', color:[37,99,235], lineH:13 }); }
  function writeCodeBlock(lines_) {
    const bLines = lines_.flatMap(l => doc.splitTextToSize(String(l), maxW - 24));
    const bh = bLines.length * 13 + 10;
    checkPage(bh + 4);
    doc.setFillColor(240,247,255); doc.setDrawColor(191,219,254);
    doc.roundedRect(margin, y - 11, maxW, bh, 3, 3, 'FD');
    doc.setFont('courier','normal'); doc.setFontSize(9.5); doc.setTextColor(30,58,138);
    for (const bl of bLines) { doc.text(bl, margin + 8, y + 2); y += 13; }
    y += 6;
  }
  function writeDivider() {
    checkPage(8); doc.setDrawColor(191,219,254); doc.setLineWidth(0.5);
    doc.line(margin, y, margin + maxW, y); y += 10;
  }

  writeLine(session.examName || 'Question Bank', { fontSize:17, style:'bold', color:[30,58,138] });
  const totalQs = Object.values(grouped).reduce((s, a) => s + a.length, 0);
  writeLine(`Session: ${session.sessionCode}  ·  ${totalQs} questions  ·  ${session.createdAt ? new Date(session.createdAt).toLocaleDateString('en-GB') : ''}`,
    { fontSize:10, color:[100,116,139], lineH:14 });
  y += 6; writeDivider();

  let qNum = 0;
  for (const [type, questions] of Object.entries(grouped)) {
    writeLine(type.toUpperCase(), { fontSize:13, style:'bold', color:[37,99,235] });
    y += 4;
    for (const q of questions) {
      qNum++;
      const codingMeta = type === 'coding' ? parseCodingMeta(q.explanation) : null;
      writeLine(`${qNum}. ${q.question}`, { style:'bold' });
      if (type === 'coding') {
        if (codingMeta?.description) { y += 3; writeLine(codingMeta.description, { fontSize:10, color:[50,50,50], lineH:14 }); }
        if (codingMeta?.starterCode?.python) { y += 4; writeLabel('STARTER CODE (Python)'); writeCodeBlock(codingMeta.starterCode.python.split('\n')); }
      } else {
        const opts = [q.options?.[0],q.options?.[1],q.options?.[2],q.options?.[3]].map((text,i)=>({ key:['A','B','C','D'][i],text })).filter(o=>o.text);
        y += 3;
        opts.forEach(o => writeLine(`  ${o.key})  ${o.text}`, { fontSize:10, color:[40,40,40], lineH:14 }));
        if (q.answer) { y += 3; writeLine(`Answer: ${q.answer.charAt(0).toUpperCase()}`, { fontSize:10, style:'bold', color:[5,150,105], lineH:13 }); }
      }
      writeLine(`Difficulty: ${q.difficulty||'medium'}  ·  Topic: ${q.topic||''}`, { fontSize:9, style:'italic', color:[148,163,184], lineH:13 });
      y += 4; writeDivider();
    }
  }
  doc.save(`${(session.examName||'QB').replace(/\s+/g,'_')}_${session.sessionCode}.pdf`);
}

// ── Question Row ──────────────────────────────────────────────────────────────
function QuestionRow({ q, index, sessionCode, onDelete }) {
  const [open,        setOpen]       = useState(false);
  const [activeLang,  setActiveLang] = useState('python');
  const [deleting,    setDeleting]   = useState(false);

  const type      = (q.type || 'mcq').toLowerCase();
  const diff      = (q.difficulty || 'medium').toLowerCase();
  const dColor    = diff==='easy' ? T.green : diff==='hard' ? T.red : '#d97706';
  const dBg       = diff==='easy' ? T.greenBg : diff==='hard' ? T.redBg : '#fffbeb';
  const codingMeta= type === 'coding' ? parseCodingMeta(q.explanation) : null;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Remove question #${index+1} from this session?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/question-bank/sessions/${sessionCode}/${q.id}`,
        { method:'DELETE', headers:authHeader() });
      if (res.ok) { onDelete(q.id); }
      else { const b = await res.json().catch(()=>({})); alert(b.error||'Delete failed'); setDeleting(false); }
    } catch (err) { alert('Network error: '+err.message); setDeleting(false); }
  }

  return (
    <div style={{ marginBottom:7, border:`1px solid ${T.border}`, borderRadius:9,
      overflow:'hidden', opacity:deleting?0.4:1, transition:'opacity 0.2s' }}>
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10,
        cursor:'pointer', background:T.white, transition:'background 0.12s' }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background=T.accentLt}
        onMouseLeave={e => e.currentTarget.style.background=T.white}>
        <span style={{ fontSize:10.5, fontWeight:700, color:T.text3, minWidth:26, marginTop:2 }}>
          #{index+1}
        </span>
        <TypeChip type={q.type}/>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, color:T.text, margin:0, fontWeight:500, lineHeight:1.5 }}>
            {q.question || '—'}
          </p>
          <span style={{ fontSize:10.5, color:T.text3, marginTop:2, display:'block' }}>{q.topic}</span>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
          background:dBg, color:dColor, flexShrink:0 }}>
          {q.difficulty}
        </span>
        <button onClick={handleDelete} disabled={deleting}
          style={{ background:'none', border:`1px solid ${T.redBd}`, borderRadius:5,
            color:T.red, cursor:'pointer', padding:'2px 8px', fontSize:11, fontWeight:700, flexShrink:0 }}>
          {deleting ? '…' : '✕'}
        </button>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
          style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0, marginTop:3 }}>
          <path d="M2.5 4.5L6.5 8.5L10.5 4.5" stroke={T.text3} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ padding:'0 14px 14px 50px', background:T.accentLt, borderTop:`1px solid ${T.border}` }}>
          {(type==='mcq'||type==='aptitude'||type==='verbal'||type==='sql') && (
            <div style={{ paddingTop:10, display:'grid', gap:5 }}>
              {(q.options||[]).map((opt,i) => {
                const letter=['A','B','C','D'][i];
                const isAns=(q.answer||'').toUpperCase().startsWith(letter);
                return (
                  <div key={i} style={{ padding:'6px 10px', borderRadius:6, fontSize:12.5,
                    background:isAns?T.greenBg:T.white, border:`1px solid ${isAns?T.greenBd:T.border}`,
                    color:isAns?T.green:T.text, display:'flex', alignItems:'center', gap:7 }}>
                    {isAns
                      ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <circle cx="6.5" cy="6.5" r="6" fill={T.green}/>
                          <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      : <span style={{ fontSize:10, fontWeight:700, color:T.text3, minWidth:14 }}>{letter})</span>}
                    {type==='sql' ? <code style={{ fontFamily:'monospace', fontSize:12 }}>{opt}</code> : opt}
                  </div>
                );
              })}
              {q.explanation && typeof q.explanation==='string' && (
                <div style={{ marginTop:6, padding:'7px 10px', fontSize:11.5,
                  background:T.accentLt, borderRadius:6, color:T.text2 }}>
                  <strong style={{ color:T.accent }}>Explanation: </strong>{q.explanation}
                </div>
              )}
            </div>
          )}
          {type==='coding' && (
            <div style={{ paddingTop:10, display:'grid', gap:10 }}>
              {codingMeta?.description && (
                <p style={{ fontSize:12.5, color:T.text2, margin:0, lineHeight:1.6 }}>{codingMeta.description}</p>
              )}
              {(codingMeta?.sampleCases||[]).length>0 && (
                <div style={{ display:'grid', gap:8 }}>
                  {codingMeta.sampleCases.map((tc,i)=>(
                    <div key={i} style={{ display:'flex', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:T.text3, marginBottom:3 }}>SAMPLE INPUT</div>
                        <pre style={{ margin:0, fontFamily:'monospace', fontSize:11.5, background:'#f1f5f9', borderRadius:6, padding:'7px 10px', overflowX:'auto', color:T.text }}>
                          {tc.input||'(none)'}
                        </pre>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:T.text3, marginBottom:3 }}>SAMPLE OUTPUT</div>
                        <pre style={{ margin:0, fontFamily:'monospace', fontSize:11.5, background:'#f1f5f9', borderRadius:6, padding:'7px 10px', overflowX:'auto', color:T.text }}>
                          {tc.output||'(none)'}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {codingMeta?.starterCode && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:T.text3, marginBottom:5 }}>STARTER CODE</div>
                  <div style={{ display:'flex', gap:3, marginBottom:0 }}>
                    {Object.keys(codingMeta.starterCode).map(lang=>(
                      <button key={lang} onClick={e=>{e.stopPropagation();setActiveLang(lang);}}
                        style={{ padding:'4px 11px', fontSize:11, fontWeight:activeLang===lang?700:400,
                          borderRadius:'6px 6px 0 0', border:`1px solid ${T.border}`,
                          borderBottom:activeLang===lang?`1px solid ${T.accentLt}`:`1px solid ${T.border}`,
                          background:activeLang===lang?T.accentLt:T.white,
                          color:activeLang===lang?T.accent:T.text3, cursor:'pointer' }}>
                        {LANG_LABELS[lang]||lang}
                      </button>
                    ))}
                  </div>
                  <pre style={{ margin:0, fontFamily:'monospace', fontSize:12, background:'#1e293b',
                    color:'#e2e8f0', borderRadius:'0 6px 6px 6px', padding:'12px 14px',
                    overflowX:'auto', lineHeight:1.6, maxHeight:220, overflowY:'auto' }}>
                    {codingMeta.starterCode[activeLang]||'// No starter code for this language'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ session, onClose }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState(null);
  const [search,      setSearch]      = useState('');
  const [grouped,     setGrouped]     = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/question-bank/sessions/${session.sessionCode}`, { headers:authHeader() })
      .then(r=>r.json())
      .then(d => { setData(d); setGrouped(d.grouped||{}); setTab(Object.keys(d.grouped||{})[0]||null); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [session.sessionCode]);

  function handleDeleteQuestion(qbId) {
    setGrouped(prev => {
      const next = {};
      for (const [type, arr] of Object.entries(prev)) {
        const filtered = arr.filter(q=>q.id!==qbId);
        if (filtered.length>0) next[type]=filtered;
      }
      if (tab && (!next[tab]||next[tab].length===0)) setTab(Object.keys(next)[0]||null);
      return next;
    });
  }

  const totalLive  = Object.values(grouped).reduce((s,a)=>s+a.length,0);
  const currentQs  = tab && grouped[tab] ? grouped[tab] : [];
  const filtered   = search
    ? currentQs.filter(q=>q.question?.toLowerCase().includes(search.toLowerCase())||q.topic?.toLowerCase().includes(search.toLowerCase()))
    : currentQs;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:5000, background:'rgba(0,0,0,0.6)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.white, borderRadius:16, width:'min(940px,96vw)', maxHeight:'92vh',
        display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${T.border}`,
          display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:T.primary, margin:0 }}>{session.examName}</h2>
              <ExamTypeBadge type={session.examType}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontFamily:'monospace', color:T.text3,
                background:T.accentLt, padding:'2px 8px', borderRadius:4, fontWeight:600 }}>
                {session.sessionCode}
              </span>
              <span style={{ fontSize:11, color:T.text3 }}>{totalLive} questions</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={async()=>{setDownloading(true);try{await downloadSessionPDF(session,grouped);}catch(e){alert(e.message);}finally{setDownloading(false);}}}
              disabled={downloading||loading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
                border:`1.5px solid ${T.accentBd}`, background:downloading?T.accentLt:T.white,
                color:T.accent, fontSize:12, fontWeight:700,
                cursor:(downloading||loading)?'wait':'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {downloading?'Generating…':'Download PDF'}
            </button>
            <button onClick={onClose}
              style={{ background:'#f8fafc', border:`1px solid ${T.border}`, borderRadius:8,
                width:32, height:32, cursor:'pointer', fontSize:16, color:T.text3,
                display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        </div>

        {loading && <div style={{ padding:56, textAlign:'center', color:T.text3, fontSize:13 }}>Loading questions…</div>}

        {!loading && data && (
          <>
            {/* Stats strip */}
            <div style={{ padding:'12px 24px', background:'#f8fafc', borderBottom:`1px solid ${T.border}`,
              display:'flex', gap:16, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
              {Object.entries(grouped).map(([type,arr])=>(
                <div key={type} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <TypeChip type={type}/>
                  <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{arr.length} Qs</span>
                </div>
              ))}
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                  style={{ border:`1px solid ${T.border}`, borderRadius:7, padding:'5px 10px',
                    fontSize:12, outline:'none', width:200, background:T.white }}/>
              </div>
            </div>

            {/* Type tabs */}
            <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
              {Object.keys(grouped).map(type=>(
                <button key={type} onClick={()=>{setTab(type);setSearch('');}}
                  style={{ padding:'10px 20px', fontSize:12, fontWeight:600, cursor:'pointer',
                    border:'none', background:'none',
                    borderBottom:tab===type?`2px solid ${T.accent}`:'2px solid transparent',
                    color:tab===type?T.accent:T.text3, transition:'all 0.15s' }}>
                  {type.toUpperCase()} ({(grouped[type]||[]).length})
                </button>
              ))}
            </div>

            {/* Question list */}
            <div style={{ flex:1, overflow:'auto', padding:'14px 24px' }}>
              {filtered.length===0 && (
                <div style={{ textAlign:'center', padding:32, color:T.text3, fontSize:13 }}>
                  {search?'No questions match your search.':'No questions found.'}
                </div>
              )}
              {filtered.map((q,i)=>(
                <QuestionRow key={q.id||i} q={q} index={i}
                  sessionCode={session.sessionCode} onDelete={handleDeleteQuestion}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ session, onCancel, onConfirm }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:6000, background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:T.white, borderRadius:14, padding:28, width:360,
        boxShadow:'0 20px 60px rgba(0,0,0,0.2)', textAlign:'center' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:T.redBg,
          border:`1.5px solid ${T.redBd}`, display:'flex', alignItems:'center',
          justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}>🗑️</div>
        <h3 style={{ fontSize:15, fontWeight:700, color:T.primary, marginBottom:8 }}>
          Delete Question Bank Entry?
        </h3>
        <p style={{ fontSize:13, color:T.text2, marginBottom:6, lineHeight:1.5 }}>
          <strong>{session.examName}</strong>
        </p>
        <p style={{ fontSize:12, color:T.text3, marginBottom:20 }}>
          This will delete <strong>{session.totalQuestions} questions</strong> with session{' '}
          <code style={{ background:T.accentLt, padding:'1px 6px', borderRadius:4 }}>
            {session.sessionCode}
          </code>. This cannot be undone.
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:'9px', border:`1.5px solid ${T.border}`, background:T.white,
              borderRadius:8, fontSize:13, fontWeight:600, color:T.text2, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:'9px', border:'none', background:T.red,
              borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NeuroGenerate sub-view ────────────────────────────────────────────────────
function NeuroGenerateView({ onImported, onBack, approvedRequests }) {
  const [step,      setStep]   = useState('configure');
  const [config,    setConfig] = useState(null);
  const [importing, setImport] = useState(false);
  const { state, progress, questions, stats, error, generate, reset } = useGeneration();

  async function handleStart(params) { setConfig(params); setStep('generate'); await generate(params); }

  async function handleFinalize(selectedQuestions) {
    if (!config?.examName) { alert('Exam name is missing.'); return; }
    setImport(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/question-bank/import`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body:JSON.stringify({ questions:selectedQuestions, examName:config.examName,
          examType:config.examType||'placement', sessionCode:config.sessionCode||null,
          examRequestId:config.examRequestId||null, difficulty:config.difficulty||'mixed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Import failed');
      onImported(data);
      setTimeout(()=>onBack(),300);
    } catch(err) { alert(`Save failed: ${err.message}`); }
    finally { setImport(false); }
  }

  function handleStartOver() { reset(); setStep('configure'); setConfig(null); }
  const selectedAgents = config ? Object.keys(config.agentTopics||{}).filter(k=>!k.endsWith('_counts')) : [];

  return (
    <div>
      {/* Sub-header */}
      <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12,
        padding:'12px 20px', display:'flex', alignItems:'center', gap:16,
        marginBottom:20, boxShadow:'0 1px 4px rgba(37,99,235,0.07)' }}>
        <button onClick={onBack}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent',
            border:`1px solid ${T.accentBd}`, borderRadius:7, padding:'6px 14px',
            fontSize:13, color:T.accent, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Question Bank
        </button>
        <div style={{ fontSize:12, color:T.text3, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:T.accent, fontWeight:600 }}>Question Bank</span>
          <span>›</span>
          <span style={{ fontWeight:700, color:T.primary }}>NeuroGenerate AI</span>
        </div>
        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <StepIndicator currentStep={step}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6,
          background:`linear-gradient(135deg,${T.primary},${T.accent})`,
          color:'#fff', padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700 }}>
          <svg width="12" height="12" viewBox="0 0 15 15" fill="currentColor">
            <path d="M7.5 1L9.18 5.41L14 5.41L10.16 8.09L11.84 12.5L7.5 9.82L3.16 12.5L4.84 8.09L1 5.41L5.82 5.41L7.5 1Z"/>
          </svg>
          NeuroGenerate AI
        </div>
      </div>

      {step==='configure' && <ConfigurePanel onStart={handleStart} approvedRequests={approvedRequests}/>}
      {step==='generate' && (
        <div>
          <GeneratingPanel progress={progress} state={state} selectedAgents={selectedAgents}/>
          {state==='done' && (
            <div style={{ maxWidth:520, margin:'24px auto', background:T.white,
              border:`1px solid ${T.accentBd}`, borderRadius:14, padding:'28px 32px',
              textAlign:'center', boxShadow:'0 4px 20px rgba(37,99,235,0.1)' }}>
              <div style={{ width:52, height:52, borderRadius:'50%',
                background:T.accentLt, border:`1px solid ${T.accentBd}`,
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11L8.5 15.5L18 6" stroke={T.accent} strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ fontSize:20, fontWeight:700, color:T.primary, marginBottom:4 }}>
                {questions.length} Questions Generated
              </h3>
              {config?.examName && <div style={{ fontSize:12, color:T.accent, fontWeight:600, marginBottom:4 }}>{config.examName}</div>}
              {stats && (
                <div style={{ display:'flex', gap:7, justifyContent:'center', flexWrap:'wrap', marginBottom:18 }}>
                  {Object.entries(stats.byAgent||{}).map(([k,c])=>c>0?(
                    <span key={k} style={{ padding:'3px 11px', borderRadius:99, fontSize:12,
                      background:T.accentLt, border:`1px solid ${T.accentBd}`, color:T.accent, fontWeight:600 }}>
                      {k.toUpperCase()}: {c}
                    </span>
                  ):null)}
                </div>
              )}
              <button onClick={()=>setStep('review')}
                style={{ padding:'11px 32px', borderRadius:8,
                  background:`linear-gradient(135deg,${T.primary},${T.accent})`,
                  color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer',
                  boxShadow:'0 2px 12px rgba(37,99,235,0.3)' }}>
                Review & Save to Question Bank →
              </button>
            </div>
          )}
          {state==='error' && (
            <div style={{ maxWidth:420, margin:'24px auto', background:T.redBg,
              border:`1px solid ${T.redBd}`, borderRadius:10, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:13, color:T.red, fontWeight:600, marginBottom:8 }}>Generation Failed</div>
              <div style={{ fontSize:12, color:T.text2, marginBottom:14 }}>{error}</div>
              <button onClick={handleStartOver}
                style={{ padding:'9px 22px', borderRadius:8, background:T.white,
                  border:`1.5px solid ${T.border}`, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
      {step==='review' && (
        <ReviewPanel questions={questions} stats={stats} importing={importing}
          onFinalize={handleFinalize} onRegenerate={handleStartOver}/>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function QuestionBank() {
  const navigate = useNavigate();
  const [view,         setView]       = useState('list');
  const [sessions,     setSessions]   = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [search,       setSearch]     = useState('');
  const [filterType,   setFilterType] = useState('All');
  const [toast,        setToast]      = useState({ msg:'', type:'success' });
  const [previewing,   setPreviewing] = useState(null);
  const [deleting,     setDeleting]   = useState(null);
  const [approvedReqs, setApproved]   = useState([]);
  const [stats,        setStats]      = useState({ total:0, breakdown:[] });

  function showToast(msg, type='success') { setToast({ msg, type }); setTimeout(()=>setToast({ msg:'', type:'success' }),3500); }

  const fetchSessions = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/question-bank/sessions`, { headers:authHeader() })
      .then(r=>r.json()).then(d=>setSessions(d.sessions||[])).catch(()=>setSessions([])).finally(()=>setLoading(false));
  }, []);

  useEffect(()=>{ fetchSessions(); },[fetchSessions]);
  useEffect(()=>{
    fetch(`${API}/api/question-bank/stats`,{ headers:authHeader() }).then(r=>r.ok?r.json():null).then(d=>d&&setStats(d)).catch(()=>{});
    fetch(`${API}/api/question-bank/exam-names`,{ headers:authHeader() }).then(r=>r.ok?r.json():null).then(d=>d&&setApproved(d.approvedRequests||[])).catch(()=>{});
  },[view]);

  async function handleDelete(s) {
    try {
      const res = await fetch(`${API}/api/question-bank/sessions/${s.sessionCode}`,{ method:'DELETE', headers:authHeader() });
      if (!res.ok) throw new Error();
      setSessions(prev=>prev.filter(x=>x.sessionCode!==s.sessionCode));
      showToast(`Deleted: ${s.examName}`);
    } catch { showToast('Delete failed','error'); }
    finally { setDeleting(null); }
  }

  const EXAM_TYPES = ['All','Placement','Hiring','Certification','University'];

  const filtered = sessions.filter(s => {
    const matchSearch =
      s.examName?.toLowerCase().includes(search.toLowerCase()) ||
      s.sessionCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.topicsSummary?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterType === 'All') return true;
    const t = (s.examType || 'placement').toLowerCase();
    if (filterType === 'Placement')    return t === 'placement' || t === 'general';
    if (filterType === 'Hiring')       return t === 'hiring' || t === 'placement' || t === 'general';
    if (filterType === 'Certification') return t === 'skill_cert' || t === 'skill_certification' || t === 'certification';
    if (filterType === 'University')   return t === 'university' || t === 'academic';
    return true;
  });

  return (
    <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh',
      background:T.bg, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar/><Navbar/>
      <Toast msg={toast.msg} type={toast.type}/>

      <main style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
        {view==='neurogenerate' && (
          <NeuroGenerateView
            onImported={d=>{ fetchSessions(); showToast(`✓ ${d.count} questions saved — ${d.examName||''}`); }}
            onBack={()=>setView('list')}
            approvedRequests={approvedReqs}
          />
        )}

        {view==='list' && (
          <div>
            {/* Page header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h1 style={{ fontSize:22, fontWeight:800, color:T.primary, margin:0 }}>Question Bank</h1>
                <p style={{ fontSize:13, color:T.text3, marginTop:4 }}>
                  {sessions.length} bank entr{sessions.length!==1?'ies':'y'} · {stats.total} total questions
                </p>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setView('neurogenerate')}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:8,
                    background:`linear-gradient(135deg,${T.primary},${T.accent})`,
                    color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer',
                    boxShadow:'0 2px 10px rgba(37,99,235,0.35)' }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="currentColor">
                    <path d="M7.5 1L9.18 5.41L14 5.41L10.16 8.09L11.84 12.5L7.5 9.82L3.16 12.5L4.84 8.09L1 5.41L5.82 5.41L7.5 1Z"/>
                  </svg>
                  NeuroGenerate AI
                </button>
                <button onClick={()=>navigate('/create-exam')}
                  style={{ padding:'10px 16px', borderRadius:8,
                    border:`1.5px solid ${T.accentBd}`,
                    background:T.white, fontSize:13, fontWeight:600, color:T.accent, cursor:'pointer' }}>
                  + Create Exam
                </button>
              </div>
            </div>

            {/* Stats row */}
            {stats.breakdown?.length>0 && (
              <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                {stats.breakdown.map(b=>{
                  const m=QB_TYPE_COLORS[(b.type||'').toLowerCase()]||{color:'#64748b',bg:'#f8fafc',border:'#e2e8f0'};
                  return (
                    <div key={b.type} style={{ padding:'10px 16px', borderRadius:10,
                      background:T.white, border:`1.5px solid ${m.border}` }}>
                      <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{b.count}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:T.text3, marginTop:1 }}>
                        {(b.type||'').toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filters */}
            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10,
              padding:'11px 14px', marginBottom:14,
              display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc',
                border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 12px',
                flex:'1 1 200px', minWidth:180 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.text3} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search exam name, session ID…"
                  style={{ background:'none', border:'none', outline:'none', fontSize:13, color:T.text, width:'100%' }}/>
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {EXAM_TYPES.map(t=>{
                  const active=filterType===t;
                  return (
                    <button key={t} onClick={()=>setFilterType(t)}
                      style={{ padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:active?700:400,
                        cursor:'pointer', border:`1px solid ${active?T.accent:T.border}`,
                        background:active?T.accentLt:T.white,
                        color:active?T.accent:T.text3, transition:'all 0.15s' }}>
                      {t}
                    </button>
                  );
                })}
              </div>
              <span style={{ marginLeft:'auto', fontSize:12, color:T.text3 }}>
                {filtered.length} result{filtered.length!==1?'s':''}
              </span>
            </div>

            {/* Table */}
            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
              {loading ? (
                <div style={{ padding:56, textAlign:'center', color:T.text3, fontSize:13 }}>Loading…</div>
              ) : filtered.length===0 ? (
                <div style={{ padding:64, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text2, marginBottom:8 }}>
                    {sessions.length===0?'No question bank entries yet':'No entries match your search'}
                  </div>
                  {sessions.length===0 && (
                    <button onClick={()=>setView('neurogenerate')}
                      style={{ padding:'10px 22px', borderRadius:8,
                        background:`linear-gradient(135deg,${T.primary},${T.accent})`,
                        color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      Generate with NeuroGenerate AI →
                    </button>
                  )}
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#f0f7ff', borderBottom:`2px solid ${T.border}` }}>
                      {['QB Session ID','Exam Name','Exam Type','Question Types','Topics','Questions','Created','Actions'].map(h=>(
                        <th key={h} style={{ padding:'11px 14px', textAlign:'left',
                          fontSize:10, fontWeight:700, color:T.accent,
                          textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s=>(
                      <tr key={s.sessionCode}
                        style={{ borderBottom:`1px solid ${T.border}`, transition:'background 0.12s' }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.accentLt}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'13px 14px' }}>
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace',
                            background:T.accentLt, color:T.accent, padding:'3px 9px', borderRadius:5 }}>
                            {s.sessionCode}
                          </span>
                        </td>
                        <td style={{ padding:'13px 14px', maxWidth:220 }}>
                          <div style={{ fontWeight:600, color:T.primary, fontSize:13,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {s.examName}
                          </div>
                          {s.companyName && <div style={{ fontSize:10.5, color:T.text3, marginTop:2 }}>{s.companyName}</div>}
                        </td>
                        <td style={{ padding:'13px 14px' }}>
                          <ExamTypeBadge type={s.examType||'placement'}/>
                        </td>
                        <td style={{ padding:'13px 14px' }}>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {(s.types||[]).map(t=><TypeChip key={t} type={t}/>)}
                          </div>
                        </td>
                        <td style={{ padding:'13px 14px', color:T.text2, fontSize:11.5,
                          maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.topicsSummary||'—'}
                        </td>
                        <td style={{ padding:'13px 14px', textAlign:'center' }}>
                          <span style={{ fontSize:16, fontWeight:800, color:T.accent }}>{s.totalQuestions}</span>
                        </td>
                        <td style={{ padding:'13px 14px', color:T.text3, fontSize:11, whiteSpace:'nowrap' }}>
                          {s.createdAt?new Date(s.createdAt).toLocaleDateString('en-GB'):'—'}
                        </td>
                        <td style={{ padding:'13px 14px' }}>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            <button onClick={()=>setPreviewing(s)}
                              style={{ padding:'5px 12px', borderRadius:6,
                                border:`1px solid ${T.accentBd}`, background:T.accentLt,
                                color:T.accent, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              Preview
                            </button>
                            <button onClick={()=>navigate('/create-exam',{state:{preselectedSession:s}})}
                              style={{ padding:'5px 12px', borderRadius:6,
                                border:`1px solid ${T.border}`, background:'#f8fafc',
                                color:T.primary, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              Use in Exam
                            </button>
                            <button onClick={()=>setDeleting(s)}
                              style={{ padding:'5px 12px', borderRadius:6,
                                border:`1px solid ${T.redBd}`, background:T.redBg,
                                color:T.red, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom note */}
            <div style={{ marginTop:14, padding:'11px 14px', background:T.accentLt,
              border:`1px solid ${T.accentBd}`, borderRadius:8,
              display:'flex', gap:10, alignItems:'center', fontSize:12, color:T.accent }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>
                Use <strong>NeuroGenerate AI</strong> to create question banks, then click{' '}
                <strong>Use in Exam</strong> to build an exam from a session.
                Filter by <strong>exam type</strong> to find relevant banks quickly.
              </span>
            </div>
          </div>
        )}
      </main>

      {previewing && <PreviewModal session={previewing} onClose={()=>setPreviewing(null)}/>}
      {deleting && <DeleteConfirm session={deleting} onCancel={()=>setDeleting(null)} onConfirm={()=>handleDelete(deleting)}/>}
    </div>
  );
}