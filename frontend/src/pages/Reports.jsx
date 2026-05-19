import React, { useState, useEffect, useCallback } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import HiringReportModal from '../components/HiringReportModal';

const API = ((typeof import.meta!=='undefined'&&import.meta.env?.VITE_API_URL)||process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net') + '/api';

const T = {
  pageBg:'#f4f8fb', white:'#ffffff', border:'#e8edf2', shadow:'0 1px 4px rgba(0,0,0,0.06)',
  navy:'#0f172a', text:'#1e293b', muted:'#64748b', dim:'#94a3b8',
  accent:'#2563eb', accentSoft:'#eff6ff',
  green:'#16a34a', greenBg:'#f0fdf4', greenBdr:'#bbf7d0',
  red:'#dc2626', redBg:'#fef2f2',
  orange:'#ea580c', orangeBg:'#fff7ed',
  purple:'#7c3aed', purpleBg:'#f5f3ff',
  blue:'#2563eb', blueBg:'#eff6ff',
};

function getToken() { return localStorage.getItem('token')||''; }

// ── Demo data (2 students — for frontend display only) ────────────────────────
const DEMO_HIRING_EXAM = {
  id: 'EX001',
  title: 'Virtusa – Full Stack Developer',
  exam_type: 'hiring',
  college: 'RMKEC',
  batch_year: 2026,
  total_marks: 60,
  pass_mark: 24,
  status: 'completed',
  student_count: 2,
};

const DEMO_HIRING_STUDENTS = [
  {
    assignment_id: 'A001', student_id: 'S001',
    studentName: 'Moulini S', studentEmail: 'mou122058.it@rmkec.ac.in',
    status: 'submitted',
    mcqScore: 18, writtenScore: 22, totalScore: 40,
    mcqBreakdown: [
      { questionText: 'What does the virtual DOM primarily improve?', studentAnswer: 'B', correctAnswer: 'B', isCorrect: true,  marks: 1 },
      { questionText: 'Which hook replaces componentDidMount?',        studentAnswer: 'A', correctAnswer: 'A', isCorrect: true,  marks: 1 },
      { questionText: 'What is the output of typeof null?',            studentAnswer: 'C', correctAnswer: 'B', isCorrect: false, marks: 0 },
      { questionText: 'REST verb for partial update?',                 studentAnswer: 'B', correctAnswer: 'B', isCorrect: true,  marks: 1 },
      { questionText: 'SQL JOIN that returns all rows from left?',     studentAnswer: 'A', correctAnswer: 'C', isCorrect: false, marks: 0 },
    ],
    writtenBreakdown: [
      {
        questionId: 'WQ1',
        questionText: 'Explain the event loop in Node.js with a practical example.',
        keywords: 'call stack, event loop, callback queue, libuv, non-blocking, I/O',
        maxScore: 10,
        studentAnswer: 'Node.js uses the event loop to handle asynchronous operations. The call stack executes synchronous code; once it is clear the event loop picks tasks from the callback queue. libuv handles non-blocking I/O under the hood.',
        autoScore: 7, facultyScore: null, facultyComment: '',
        matchedKeywords: ['call stack', 'event loop', 'callback queue', 'libuv', 'non-blocking'],
        missingKeywords: ['I/O'],
        wordCount: 48, percentage: 70,
      },
      {
        questionId: 'WQ2',
        questionText: 'Compare REST and GraphQL. When would you choose GraphQL?',
        keywords: 'over-fetching, under-fetching, single endpoint, schema, resolver, flexibility',
        maxScore: 10,
        studentAnswer: 'REST uses multiple endpoints while GraphQL has a single endpoint. GraphQL avoids over-fetching and under-fetching, giving the client full flexibility over what data it receives. A schema defines types and resolvers handle queries.',
        autoScore: 9, facultyScore: 9, facultyComment: 'Clear and concise. Good real-world framing.',
        matchedKeywords: ['over-fetching', 'under-fetching', 'single endpoint', 'schema', 'resolver', 'flexibility'],
        missingKeywords: [],
        wordCount: 52, percentage: 100,
      },
    ],
  },
  {
    assignment_id: 'A002', student_id: 'S002',
    studentName: 'Shreya S', studentEmail: 'shreya@rmdec.ac.in',
    status: 'submitted',
    mcqScore: 20, writtenScore: 16, totalScore: 36,
    mcqBreakdown: [
      { questionText: 'What does the virtual DOM primarily improve?', studentAnswer: 'B', correctAnswer: 'B', isCorrect: true,  marks: 1 },
      { questionText: 'Which hook replaces componentDidMount?',        studentAnswer: 'A', correctAnswer: 'A', isCorrect: true,  marks: 1 },
      { questionText: 'What is the output of typeof null?',            studentAnswer: 'B', correctAnswer: 'B', isCorrect: true,  marks: 1 },
      { questionText: 'REST verb for partial update?',                 studentAnswer: 'B', correctAnswer: 'B', isCorrect: true,  marks: 1 },
      { questionText: 'SQL JOIN that returns all rows from left?',     studentAnswer: 'C', correctAnswer: 'C', isCorrect: true,  marks: 1 },
    ],
    writtenBreakdown: [
      {
        questionId: 'WQ1',
        questionText: 'Explain the event loop in Node.js with a practical example.',
        keywords: 'call stack, event loop, callback queue, libuv, non-blocking, I/O',
        maxScore: 10,
        studentAnswer: 'The event loop allows Node to do non-blocking I/O. When an async task is done it is placed in the callback queue and executed after the call stack is empty.',
        autoScore: 6, facultyScore: null, facultyComment: '',
        matchedKeywords: ['event loop', 'non-blocking', 'I/O', 'callback queue', 'call stack'],
        missingKeywords: ['libuv'],
        wordCount: 38, percentage: 83,
      },
      {
        questionId: 'WQ2',
        questionText: 'Compare REST and GraphQL. When would you choose GraphQL?',
        keywords: 'over-fetching, under-fetching, single endpoint, schema, resolver, flexibility',
        maxScore: 10,
        studentAnswer: 'REST is simpler and widely adopted. GraphQL is better for complex apps where the client needs flexible queries without fetching extra data.',
        autoScore: 4, facultyScore: null, facultyComment: '',
        matchedKeywords: ['flexibility'],
        missingKeywords: ['over-fetching', 'under-fetching', 'single endpoint', 'schema', 'resolver'],
        wordCount: 32, percentage: 17,
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function kwScore(answer='', kwStr='', max=8) {
  if (!answer||!kwStr) return { score:0, pct:0, matched:[], missing:[] };
  const kws = kwStr.split(',').map(k=>k.trim().toLowerCase()).filter(Boolean);
  const low  = answer.toLowerCase();
  const matched=[], missing=[];
  kws.forEach(kw => {
    const parts = kw.replace(/[()]/g,'').split(/[,\s/]+/).filter(w=>w.length>2);
    parts.some(p=>low.includes(p)) ? matched.push(kw) : missing.push(kw);
  });
  const pct   = kws.length ? Math.round(matched.length/kws.length*100) : 0;
  const score = kws.length ? Math.round(matched.length/kws.length*max*2)/2 : 0;
  return { score, pct, matched, missing };
}

async function gradeWithClaude(questionText, answer, keywords, maxMarks) {
  const prompt = `You are a university exam evaluator.\n\nQuestion: ${questionText}\nKeywords: ${keywords}\nAnswer: ${answer}\nMax marks: ${maxMarks}\n\nReturn ONLY JSON:\n{"score":<0-${maxMarks}>,"percentage":<0-100>,"feedback":"<2-3 sentences>","strengths":["..."],"improvements":["..."],"keywordsCovered":["..."],"keywordsMissed":["..."]}`;
  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:900, messages:[{role:'user',content:prompt}] }),
    });
    const data = await res.json();
    const text = data.content?.find(b=>b.type==='text')?.text||'{}';
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  } catch { return null; }
}

function TypeBadge({ type }) {
  const map = {
    placement:{label:'Placement',color:'#6d28d9',bg:'#ede9fe'},
    hiring:{label:'Hiring',color:'#6d28d9',bg:'#ede9fe'},
    university:{label:'University',color:'#0369a1',bg:'#e0f2fe'},
    skill_cert:{label:'Certification',color:'#c2410c',bg:'#ffedd5'},
    certification:{label:'Certification',color:'#c2410c',bg:'#ffedd5'},
  };
  const s = map[type]||{label:type||'Exam',color:T.muted,bg:'#f1f5f9'};
  return <span style={{ padding:'2px 10px', borderRadius:6, fontSize:10.5, fontWeight:700, background:s.bg, color:s.color }}>{s.label}</span>;
}

function KwChip({ text, matched }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:20, fontSize:10.5, fontWeight:600, margin:2, background:matched?T.greenBg:T.redBg, color:matched?T.green:T.red, border:`1px solid ${matched?T.greenBdr:'#fecaca'}` }}>
      {matched?'✓':'✕'} {text}
    </span>
  );
}

function ScoreRing({ score, max=100, size=48 }) {
  const pct  = max > 0 ? Math.min((score||0)/max*100, 100) : 0;
  const c    = pct>=70?T.green:pct>=40?T.orange:T.red;
  const r    = (size-6)/2;
  const circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeDasharray={`${pct/100*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={T.navy} fontSize="11" fontWeight="700">{Math.round(score||0)}</text>
    </svg>
  );
}

function TheoryCard({ item, assignmentId, idx, onSave }) {
  const [ai, setAi]           = useState(null);
  const [grading, setGrading] = useState(false);
  const [score, setScore]     = useState(item.facultyScore ?? item.autoScore ?? 0);
  const [note, setNote]       = useState(item.facultyComment ?? '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [err, setErr]         = useState('');
  const [showAns, setShowAns] = useState(true);

  const max      = item.maxScore || item.marks || 8;
  const hasAns   = !!item.studentAnswer?.trim();
  const kw       = kwScore(item.studentAnswer||'', item.keywords||'', max);
  const matched  = ai?.keywordsCovered ?? kw.matched;
  const missing  = ai?.keywordsMissed  ?? kw.missing;
  const pct      = ai?.percentage      ?? kw.pct;
  const dispScore = item.facultyScore ?? (ai?.score ?? item.autoScore ?? 0);
  const srcLabel  = item.facultyScore!=null?'FACULTY':ai?'CLAUDE AI':'AUTO';
  const srcColor  = item.facultyScore!=null?T.purple:ai?T.blue:T.dim;

  const handleGrade = async () => {
    if (!hasAns) return;
    setGrading(true); setErr('');
    const r = await gradeWithClaude(item.questionText, item.studentAnswer, item.keywords, max);
    if (r && typeof r.score==='number') { setAi(r); if (item.facultyScore==null) setScore(r.score); }
    else setErr('AI grading failed — score manually.');
    setGrading(false);
  };

  const handleSave = async () => {
    const v = parseFloat(score);
    if (isNaN(v)||v<0||v>max) return;
    setSaving(true);
    await onSave(assignmentId, item.questionId, v, note);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000);
  };

  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', marginBottom:14, background:T.white }}>
      <div style={{ padding:'12px 16px', background:'#f8fafc', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:T.dim, background:T.accentSoft, borderRadius:4, padding:'1px 6px' }}>Q{idx+1}</span>
            <span style={{ fontSize:10, color:T.muted }}>{max} marks</span>
            {item.facultyScore!=null&&<span style={{ fontSize:10, background:T.greenBg, color:T.green, borderRadius:20, padding:'1px 8px', fontWeight:700 }}>Reviewed</span>}
            {!hasAns&&<span style={{ fontSize:10, background:T.redBg, color:T.red, borderRadius:20, padding:'1px 8px', fontWeight:700 }}>No Answer</span>}
          </div>
          <div style={{ fontSize:13.5, fontWeight:600, color:T.text, lineHeight:1.6 }}>{item.questionText}</div>
          {item.keywords && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginTop:7 }}>
              <span style={{ fontSize:9, fontFamily:'monospace', fontWeight:700, color:T.dim }}>KEYWORDS:</span>
              {item.keywords.split(',').map(k=>k.trim()).filter(Boolean).map((kw,i)=>(
                <span key={i} style={{ fontSize:10, background:T.blueBg, border:'1px solid #bfdbfe', borderRadius:20, padding:'1px 8px', color:T.blue, fontFamily:'monospace' }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:24, fontWeight:800, color:srcColor, lineHeight:1 }}>{dispScore}<span style={{ fontSize:11, fontWeight:400, color:T.dim }}>/{max}</span></div>
          <span style={{ fontSize:9, padding:'2px 7px', borderRadius:20, fontWeight:700, display:'inline-block', background:item.facultyScore!=null?T.purpleBg:ai?T.blueBg:'#f1f5f9', color:srcColor }}>{srcLabel}</span>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ marginBottom:10 }}>
          <button onClick={()=>setShowAns(v=>!v)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:7, padding:'5px 11px', fontSize:11.5, fontWeight:600, color:T.muted, cursor:'pointer', marginBottom:showAns?8:0 }}>
            {showAns?'Hide':'Show'} Answer
          </button>
          {showAns && (
            <div style={{ fontSize:13, color:'#334155', lineHeight:1.8, background:hasAns?'#f0fdf4':'#fef2f2', border:`1px solid ${hasAns?T.greenBdr:'#fecaca'}`, padding:'11px 13px', borderRadius:9, maxHeight:160, overflowY:'auto', whiteSpace:'pre-wrap' }}>
              {hasAns ? item.studentAnswer.trim() : <em style={{ color:T.red }}>No answer submitted</em>}
            </div>
          )}
        </div>

        {item.keywords && hasAns && (
          <div style={{ marginBottom:10, padding:'10px 12px', background:'#fafbff', border:`1px solid ${T.border}`, borderRadius:9 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
              <span style={{ fontSize:9.5, color:T.dim, fontFamily:'monospace', fontWeight:700 }}>KEYWORD COVERAGE</span>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:70, height:5, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:pct>=70?T.green:pct>=40?T.orange:T.red }} />
                </div>
                <span style={{ fontSize:12, fontWeight:800, fontFamily:'monospace', color:pct>=70?T.green:pct>=40?T.orange:T.red }}>{pct}%</span>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap' }}>
              {matched.map(k=><KwChip key={k} text={k} matched={true}/>)}
              {missing.map(k=><KwChip key={k} text={k} matched={false}/>)}
            </div>
          </div>
        )}

        {ai && (
          <div style={{ marginBottom:10, borderRadius:10, overflow:'hidden', border:'1px solid #bfdbfe' }}>
            <div style={{ padding:'8px 14px', background:T.blueBg, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:T.blue }}>CLAUDE AI EVALUATION</span>
              <span style={{ fontSize:16, fontWeight:800, color:T.blue, fontFamily:'monospace' }}>{ai.score}<span style={{ fontSize:11, fontWeight:400, color:T.dim }}>/{max}</span></span>
            </div>
            <div style={{ padding:'11px 14px' }}>
              <p style={{ fontSize:12.5, color:T.text, lineHeight:1.7, margin:'0 0 8px' }}>{ai.feedback}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {ai.strengths?.length>0 && (
                  <div style={{ padding:'7px 10px', background:T.greenBg, border:`1px solid ${T.greenBdr}`, borderRadius:7 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:T.green, marginBottom:4, fontFamily:'monospace' }}>STRENGTHS</div>
                    {ai.strengths.map((s,i)=><div key={i} style={{ fontSize:11, color:'#166534', marginBottom:2 }}>• {s}</div>)}
                  </div>
                )}
                {ai.improvements?.length>0 && (
                  <div style={{ padding:'7px 10px', background:T.orangeBg, border:'1px solid #fed7aa', borderRadius:7 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:T.orange, marginBottom:4, fontFamily:'monospace' }}>MISSING</div>
                    {ai.improvements.map((s,i)=><div key={i} style={{ fontSize:11, color:'#9a3412', marginBottom:2 }}>• {s}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {err&&<div style={{ marginBottom:8, padding:'7px 11px', background:T.redBg, border:'1px solid #fecaca', borderRadius:7, fontSize:12, color:T.red }}>{err}</div>}

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button onClick={handleGrade} disabled={grading||!hasAns} style={{ padding:'7px 14px', background:T.blueBg, color:T.blue, border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:700, cursor:grading||!hasAns?'not-allowed':'pointer', opacity:!hasAns?0.5:1 }}>
            {grading?'Grading...':'🤖 AI Grade'}
          </button>
        </div>

        <div style={{ padding:13, background:'#fafbff', border:`1.5px solid ${saved?T.greenBdr:T.border}`, borderRadius:10, transition:'border-color .3s' }}>
          <div style={{ fontSize:9.5, fontWeight:700, color:T.muted, fontFamily:'monospace', marginBottom:9 }}>FACULTY SCORE OVERRIDE</div>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
            <input type="range" min={0} max={max} step={0.5} value={score} onChange={e=>setScore(parseFloat(e.target.value))} style={{ flex:1, accentColor:T.purple }} />
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <button onClick={()=>setScore(s=>Math.max(0,parseFloat((s-.5).toFixed(1))))} style={{ width:26,height:26,borderRadius:6,border:`1px solid ${T.border}`,background:T.white,cursor:'pointer',fontSize:14,fontWeight:700,color:T.navy }}>−</button>
              <input type="number" min={0} max={max} step={0.5} value={score} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0&&v<=max)setScore(v);}} style={{ width:52,padding:'4px',border:`1.5px solid ${T.purple}`,borderRadius:7,fontSize:15,fontFamily:'monospace',fontWeight:800,textAlign:'center',outline:'none',color:T.navy }} />
              <button onClick={()=>setScore(s=>Math.min(max,parseFloat((s+.5).toFixed(1))))} style={{ width:26,height:26,borderRadius:6,border:`1px solid ${T.border}`,background:T.white,cursor:'pointer',fontSize:14,fontWeight:700,color:T.navy }}>+</button>
              <span style={{ fontSize:11,color:T.dim }}>/{max}</span>
            </div>
          </div>
          <input type="text" placeholder="Faculty comment (optional)" value={note} onChange={e=>setNote(e.target.value)}
            style={{ width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,outline:'none',marginBottom:8,fontFamily:'inherit',color:T.text,background:T.white,boxSizing:'border-box' }} />
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%',padding:'9px',borderRadius:8,border:'none',cursor:saving?'default':'pointer',fontSize:13,fontWeight:700,color:'#fff',background:saved?'linear-gradient(135deg,#16a34a,#15803d)':'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            {saving?'Saving...':saved?'Saved ✓':`Save Score — ${score}/${max}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ exam, studentRow, onClose, onRefresh }) {
  const [tab, setTab] = useState('overview');

  const rawAnswers = (() => {
    if (!studentRow.answers && !studentRow.mcqBreakdown && !studentRow.writtenBreakdown) return {};
    if (studentRow.mcqBreakdown || studentRow.writtenBreakdown) return studentRow;
    try { return typeof studentRow.answers === 'string' ? JSON.parse(studentRow.answers) : (studentRow.answers || {}); } catch { return {}; }
  })();

  const mcqBreakdown     = studentRow.mcqBreakdown     || rawAnswers.mcq_breakdown     || [];
  const writtenBreakdown = studentRow.writtenBreakdown  || rawAnswers.written_breakdown  || [];

  const mcqScoreCalc    = mcqBreakdown.reduce((s, m) => s + (m.marks || 0), 0);
  const theoryScoreCalc = writtenBreakdown.reduce((s, w) => s + (w.facultyScore ?? w.autoScore ?? 0), 0);

  const mcqScore    = studentRow.mcqScore    ?? rawAnswers.mcq_score    ?? mcqScoreCalc;
  const theoryScore = studentRow.writtenScore ?? rawAnswers.written_auto_score ?? theoryScoreCalc;
  const totalScore  = studentRow.totalScore  ?? (mcqScore + theoryScore);

  const mcqTotalMarks    = mcqBreakdown.reduce((s, m) => s + (m.marks > 0 ? 1 : 1), 0);
  const theoryTotalMarks = writtenBreakdown.reduce((s, w) => s + (w.maxScore || w.marks || 0), 0);
  const totalMarksCalc   = mcqTotalMarks + theoryTotalMarks;
  const totalMarks       = totalMarksCalc > 0 ? totalMarksCalc : (exam.total_marks || 100);

  const passMark = exam.pass_mark || Math.round(totalMarks * 0.4);
  const pct      = totalMarks > 0 ? Math.round(totalScore / totalMarks * 100) : 0;
  const passed   = totalScore >= passMark;
  const name     = studentRow.studentName || 'Student';

  const mcqItems = mcqBreakdown.map(m => ({
    questionText: m.questionText || m.question_text || '',
    selected:    (m.studentAnswer || m.student_answer || '').toUpperCase(),
    correct:     (m.correctAnswer  || m.correct_answer  || '').toUpperCase(),
    isCorrect:   !!(m.isCorrect || m.is_correct),
    marks:       m.marks || 1,
  }));

  const theoryItems = writtenBreakdown.map(w => ({
    questionId:      w.questionId || w.question_id,
    questionText:    w.questionText || w.question_text || '',
    keywords:        [...(w.matchedKeywords||[]),...(w.missingKeywords||[])].join(', ') || (w.keywords||''),
    maxScore:        w.maxScore || w.marks || 8,
    studentAnswer:   w.studentAnswer || w.student_answer || '',
    wordCount:       w.wordCount || 0,
    autoScore:       w.autoScore ?? w.auto_score ?? 0,
    facultyScore:    w.facultyScore ?? w.faculty_score ?? null,
    facultyComment:  w.facultyComment || w.faculty_comment || '',
    matchedKeywords: w.matchedKeywords || [],
    missingKeywords: w.missingKeywords || [],
    percentage:      w.percentage || 0,
  }));

  const pending = theoryItems.filter(w => w.facultyScore == null).length;

  const handleSave = async (aId, qId, score, comment) => {
    const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` };
    await fetch(`${API}/admin/university-exam/review-written`, {
      method:'POST', headers,
      body: JSON.stringify({ assignmentId:aId, questionId:qId, facultyScore:score, facultyComment:comment }),
    }).catch(()=>null);
    if (onRefresh) onRefresh();
  };

  const mcqCorrect = mcqItems.filter(m=>m.isCorrect).length;
  const mcqWrong   = mcqItems.filter(m=>!m.isCorrect&&m.selected).length;
  const mcqSkipped = mcqItems.filter(m=>!m.selected).length;

  const TABS = [
    { id:'overview', label:'Overview' },
    ...(mcqItems.length > 0 ? [{ id:'mcq', label:`MCQ (${mcqItems.length})` }] : []),
    ...(theoryItems.length > 0 ? [{ id:'theory', label:`Theory (${theoryItems.length})${pending>0?` · ${pending} pending`:''}` }] : []),
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }} onClick={onClose}>
      <div style={{ background:T.pageBg, borderRadius:16, width:'100%', maxWidth:900, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.22)' }} onClick={e=>e.stopPropagation()}>

        <div style={{ padding:'14px 20px', background:T.white, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:13, flexShrink:0 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:T.accentSoft,border:`2px solid ${T.accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:T.accent }}>{name[0].toUpperCase()}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.navy }}>{name}</div>
            <div style={{ fontSize:11, color:T.dim }}>{studentRow.studentEmail||''} · {exam.title}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {mcqItems.length > 0 && (
              <div style={{ textAlign:'center',padding:'6px 11px',background:T.blueBg,borderRadius:8,border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:18,fontWeight:800,color:T.blue }}>{Math.round(mcqScore*10)/10}</div>
                <div style={{ fontSize:8.5,color:T.dim,fontFamily:'monospace' }}>MCQ</div>
              </div>
            )}
            {theoryItems.length > 0 && (
              <div style={{ textAlign:'center',padding:'6px 11px',background:T.purpleBg,borderRadius:8,border:'1px solid #ddd6fe',position:'relative' }}>
                <div style={{ fontSize:18,fontWeight:800,color:T.purple }}>{Math.round(theoryScore*10)/10}</div>
                <div style={{ fontSize:8.5,color:T.dim,fontFamily:'monospace' }}>THEORY</div>
                {pending>0&&<div style={{ fontSize:8,color:T.orange,position:'absolute',top:2,right:4 }}>{pending}⚡</div>}
              </div>
            )}
            <div style={{ textAlign:'center',padding:'6px 11px',background:'#f8fafc',borderRadius:8,border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:18,fontWeight:800,color:T.navy }}>{Math.round(totalScore*10)/10}<span style={{ fontSize:11,color:T.dim }}>/{totalMarks}</span></div>
              <div style={{ fontSize:8.5,color:T.dim,fontFamily:'monospace' }}>TOTAL</div>
            </div>
            <ScoreRing score={totalScore} max={totalMarks} size={46}/>
            <div style={{ padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:passed?T.greenBg:T.redBg,color:passed?T.green:T.red,alignSelf:'center' }}>{passed?'PASS':'FAIL'}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:`1px solid ${T.border}`,borderRadius:7,width:28,height:28,cursor:'pointer',fontSize:15,color:T.muted }}>×</button>
        </div>

        <div style={{ display:'flex', background:T.white, borderBottom:`1px solid ${T.border}`, paddingLeft:14, flexShrink:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:'none',border:'none',cursor:'pointer',padding:'10px 18px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?T.accent:T.muted,borderBottom:tab===t.id?`2px solid ${T.accent}`:'2px solid transparent',marginBottom:-1 }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {tab==='overview' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total Score', val:`${Math.round(totalScore*10)/10}/${totalMarks}`, color:T.navy  },
                  { label:'Percentage',  val:`${pct}%`,    color:pct>=70?T.green:pct>=40?T.orange:T.red },
                  { label:'Status',      val:passed?'PASS':'FAIL', color:passed?T.green:T.red },
                  { label:'Pass Mark',   val:passMark,     color:T.muted },
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:'center', padding:'12px', background:T.white, borderRadius:10, border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:9, color:T.dim, fontFamily:'monospace', marginTop:3 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              {mcqItems.length > 0 && (
                <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>MCQ SUMMARY</div>
                  <div style={{ display:'flex', gap:10 }}>
                    {[{ label:'Correct', val:mcqCorrect, c:T.green, bg:T.greenBg }, { label:'Wrong', val:mcqWrong, c:T.red, bg:T.redBg }, { label:'Skipped', val:mcqSkipped, c:T.dim, bg:'#f1f5f9' }, { label:'Score', val:Math.round(mcqScore*10)/10, c:T.blue, bg:T.blueBg }].map(s=>(
                      <div key={s.label} style={{ flex:1, textAlign:'center', padding:'10px', background:s.bg, borderRadius:8 }}>
                        <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.val}</div>
                        <div style={{ fontSize:9, color:T.dim, fontFamily:'monospace', marginTop:2 }}>{s.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {theoryItems.length > 0 && (
                <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>THEORY SUMMARY</div>
                  <div style={{ display:'flex', gap:10 }}>
                    {[{ label:'Questions', val:theoryItems.length, c:T.navy, bg:'#f8fafc' }, { label:'Answered', val:theoryItems.filter(t=>t.studentAnswer?.trim()).length, c:T.green, bg:T.greenBg }, { label:'Pending Review', val:pending, c:T.orange, bg:T.orangeBg }, { label:'Auto Score', val:Math.round(theoryScore*10)/10, c:T.purple, bg:T.purpleBg }].map(s=>(
                      <div key={s.label} style={{ flex:1, textAlign:'center', padding:'10px', background:s.bg, borderRadius:8 }}>
                        <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.val}</div>
                        <div style={{ fontSize:9, color:T.dim, fontFamily:'monospace', marginTop:2 }}>{s.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mcqItems.length === 0 && theoryItems.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:T.muted }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>No breakdown data available</div>
                  <div style={{ fontSize:12, marginTop:6, color:T.dim }}>Total score recorded: <strong>{totalScore}</strong></div>
                </div>
              )}
            </div>
          )}

          {tab==='mcq' && (
            <div>
              <div style={{ display:'flex', gap:9, marginBottom:14 }}>
                {[{ label:'Correct',val:mcqCorrect,c:T.green,bg:T.greenBg },{ label:'Wrong',val:mcqWrong,c:T.red,bg:T.redBg },{ label:'Skipped',val:mcqSkipped,c:T.dim,bg:'#f1f5f9' },{ label:'MCQ Score',val:Math.round(mcqScore*10)/10,c:T.blue,bg:T.blueBg }].map(s=>(
                  <div key={s.label} style={{ flex:1,textAlign:'center',padding:'10px',background:s.bg,borderRadius:9 }}>
                    <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.val}</div>
                    <div style={{ fontSize:9,color:T.dim,fontFamily:'monospace',marginTop:2 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              {!mcqItems.length ? (
                <div style={{ padding:'40px 0',textAlign:'center',color:T.muted }}>No MCQ data recorded.</div>
              ) : mcqItems.map((m,i)=>(
                <div key={i} style={{ border:`1px solid ${m.isCorrect?T.greenBdr:'#fecaca'}`,borderRadius:9,padding:'12px 14px',marginBottom:7,background:m.isCorrect?T.greenBg:T.redBg }}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10,fontFamily:'monospace',color:T.dim,marginBottom:4 }}>Q{i+1} · {m.marks} mark{m.marks>1?'s':''}</div>
                      <div style={{ fontSize:13,fontWeight:600,color:T.text,lineHeight:1.55,marginBottom:6 }}>{m.questionText}</div>
                      <div style={{ fontSize:12,color:T.muted }}>
                        Selected: <strong style={{ color:m.isCorrect?T.green:T.red }}>{m.selected||'—'}</strong>
                        {!m.isCorrect&&m.correct&&<> · Correct: <strong style={{ color:T.green }}>{m.correct}</strong></>}
                      </div>
                    </div>
                    <div style={{ fontSize:18,flexShrink:0,fontWeight:700,color:m.isCorrect?T.green:T.red }}>{m.isCorrect?'✓':'✕'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab==='theory' && (
            <div>
              {pending>0&&<div style={{ padding:'8px 12px',background:T.orangeBg,border:'1px solid #fed7aa',borderRadius:8,fontSize:12,color:T.orange,marginBottom:12 }}>{pending} answer{pending>1?'s':''} pending faculty review.</div>}
              {!theoryItems.length ? (
                <div style={{ padding:'40px 0',textAlign:'center',color:T.muted }}>No theory data recorded.</div>
              ) : theoryItems.map((item,qi)=>(
                <TheoryCard key={item.questionId||qi} item={item} assignmentId={studentRow.assignment_id} idx={qi} onSave={handleSave} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentListView({ exam, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [aiStudent, setAiStudent] = useState(null);
  const [isDemo, setIsDemo]     = useState(false);

  const isUniv   = exam.exam_type === 'university';
  const isHiring = ['hiring','placement','general','corporate','recruitment'].includes((exam.exam_type||'').toLowerCase());

  const load = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization:`Bearer ${getToken()}` };

    // University exam path
    if (isUniv) {
      const res = await fetch(`${API}/admin/university-exam/${exam.id}/report`, { headers }).catch(()=>null);
      if (res?.ok) {
        const d = await res.json();
        if (d.exam?.total_marks && !exam.total_marks) exam.total_marks = d.exam.total_marks;
        setStudents(d.students||[]);
        setIsDemo(false);
        setLoading(false);
        return;
      }
    }

    // General students path
    const res = await fetch(`${API}/exams/${exam.id}/students`, { headers }).catch(()=>null);
    if (res?.ok) {
      const d = await res.json();
      const mapped = (d.students||[]).map(s=>({
        assignment_id:s.assignment_id||s.exam_key, studentId:s.student_id,
        studentName:s.name, studentEmail:s.email, status:s.status,
        totalScore:s.score, mcqScore:null, writtenScore:null,
        mcqBreakdown:[], writtenBreakdown:[],
      }));
      if (mapped.length > 0) {
        setStudents(mapped);
        setIsDemo(false);
        setLoading(false);
        return;
      }
    }

    // Fallback: demo data for hiring exams
    if (isHiring) {
      setStudents(DEMO_HIRING_STUDENTS);
      setIsDemo(true);
    } else {
      setStudents([]);
    }
    setLoading(false);
  }, [exam, isUniv, isHiring]);

  useEffect(() => { load(); }, [load]);

  const totalMarks = exam.total_marks || 60;

  const filtered = students.filter(s => !search ||
    (s.studentName||'').toLowerCase().includes(search.toLowerCase()) ||
    (s.studentEmail||'').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [
      ['Name','Email','Status','MCQ','Theory','Total',`Total Marks: ${totalMarks}`,'%'],
      ...filtered.map(s => {
        const pct = s.totalScore!=null ? Math.round(s.totalScore/totalMarks*100) : null;
        return [s.studentName, s.studentEmail, s.status, s.mcqScore??'—', s.writtenScore??'—', s.totalScore??'—', totalMarks, pct!=null?`${pct}%`:'—'];
      }),
    ].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows],{type:'text/csv'}));
    a.download = `${exam.title}_report.csv`;
    a.click();
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <button onClick={onBack} style={{ padding:'7px 16px', background:T.white, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontWeight:600, color:T.muted, cursor:'pointer' }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <span style={{ fontSize:18, fontWeight:800, color:T.navy }}>{exam.title}</span>
            <TypeBadge type={exam.exam_type} />
          </div>
          <div style={{ fontSize:12, color:T.dim, marginTop:2 }}>{exam.college} · Batch {exam.batch_year} · <strong style={{ color:T.purple }}>{totalMarks} marks total</strong></div>
        </div>
        <button onClick={exportCSV} style={{ padding:'8px 16px', background:T.accent, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Export CSV</button>
      </div>

   

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Assigned',    val:students.length,                                                         color:T.accent  },
          { label:'Submitted',   val:students.filter(s=>['submitted','completed'].includes(s.status)).length, color:T.green   },
          { label:'In Progress', val:students.filter(s=>s.status==='started').length,                         color:T.orange  },
          { label:'Total Marks', val:totalMarks,                                                              color:T.purple  },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background:T.white, borderRadius:10, padding:'13px 15px', border:`1px solid ${T.border}`, borderTop:`3px solid ${color}`, textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ fontSize:22, fontWeight:800, color }}>{val}</div>
            <div style={{ fontSize:9.5, color:T.dim, fontFamily:'monospace', marginTop:2 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, boxShadow:T.shadow, overflow:'hidden' }}>
        <div style={{ padding:'11px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..."
            style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 11px', fontSize:12, outline:'none', width:280 }} />
          <span style={{ fontSize:11, color:T.dim, fontFamily:'monospace' }}>{filtered.length} students</span>
        </div>
        {loading ? <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading...</div> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:`2px solid ${T.border}` }}>
                  {['#','Student','Status','MCQ',...(isUniv?['Theory']:[]),'Total','%','Action'].map(h=>(
                    <th key={h} style={{ padding:'9px 13px', textAlign:'left', fontSize:10, fontWeight:700, color:T.dim, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const done = ['submitted','completed'].includes(s.status);
                  const pct  = s.totalScore!=null ? Math.round(s.totalScore/totalMarks*100) : null;
                  const barC = pct>=70?T.green:pct>=40?T.orange:T.red;
                  return (
                    <tr key={s.assignment_id||i} style={{ borderBottom:`1px solid ${T.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f0f7ff'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{ padding:'11px 13px', color:T.dim, fontFamily:'monospace', fontSize:11 }}>
                        {done ? <div style={{ width:26,height:26,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,background:i===0?'#fbbf24':i<3?'#fcd9bd':'#f1f5f9',color:i<3?'#78350f':T.dim }}>{i+1}</div> : '—'}
                      </td>
                      <td style={{ padding:'11px 13px', minWidth:150 }}>
                        <div style={{ fontWeight:700, color:T.navy }}>{s.studentName||'—'}</div>
                        <div style={{ fontSize:11, color:T.dim }}>{s.studentEmail}</div>
                      </td>
                      <td style={{ padding:'11px 13px' }}>
                        <span style={{ padding:'2px 9px', borderRadius:20, fontSize:10.5, fontWeight:700, background:done?T.greenBg:s.status==='started'?T.orangeBg:'#f1f5f9', color:done?T.green:s.status==='started'?T.orange:T.muted }}>
                          {done?'Completed':s.status==='started'?'In Progress':'Assigned'}
                        </span>
                      </td>
                      <td style={{ padding:'11px 13px', fontFamily:'monospace', fontWeight:700, color:T.blue }}>
                        {s.mcqScore!=null ? `${s.mcqScore}` : (s.totalScore!=null&&!isUniv?s.totalScore:'—')}
                      </td>
                      {isUniv&&<td style={{ padding:'11px 13px', fontFamily:'monospace', fontWeight:700, color:T.purple }}>{s.writtenScore!=null?s.writtenScore:'—'}</td>}
                      <td style={{ padding:'11px 13px', fontFamily:'monospace', fontWeight:800, fontSize:14, color:pct!=null?barC:T.dim }}>
                        {s.totalScore!=null?s.totalScore:'—'}{s.totalScore!=null&&<span style={{ fontSize:10, color:T.dim }}>/{totalMarks}</span>}
                      </td>
                      <td style={{ padding:'11px 13px', minWidth:100 }}>
                        {pct!=null ? (
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ flex:1, height:5, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ width:`${pct}%`, height:'100%', background:barC, borderRadius:99 }} />
                            </div>
                            <span style={{ fontSize:11, fontWeight:700, color:barC, fontFamily:'monospace' }}>{pct}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding:'11px 13px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          {done&&isUniv&&(
                            <button onClick={()=>setSelected(s)}
                              style={{ padding:'5px 12px',background:T.accentSoft,color:T.accent,border:`1px solid ${T.border}`,borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer' }}
                              onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color='#fff';}}
                              onMouseLeave={e=>{e.currentTarget.style.background=T.accentSoft;e.currentTarget.style.color=T.accent;}}>
                              View Report
                            </button>
                          )}
                          {done&&isHiring&&(
                            <button onClick={()=>setSelected(s)}
                              style={{ padding:'5px 12px',background:T.accentSoft,color:T.accent,border:`1px solid ${T.border}`,borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer' }}
                              onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color='#fff';}}
                              onMouseLeave={e=>{e.currentTarget.style.background=T.accentSoft;e.currentTarget.style.color=T.accent;}}>
                              View Report
                            </button>
                          )}
                          {isHiring&&(
                            <button onClick={()=>setAiStudent(s)}
                              style={{ padding:'5px 12px',background:'#f5f3ff',color:T.purple,border:'1px solid #ddd6fe',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer' }}
                              onMouseEnter={e=>{e.currentTarget.style.background=T.purple;e.currentTarget.style.color='#fff';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.color=T.purple;}}>
                              AI Report
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected&&<ReportModal exam={exam} studentRow={selected} onClose={()=>setSelected(null)} onRefresh={load} />}
      {aiStudent&&<HiringReportModal studentId={aiStudent.studentId||aiStudent.student_id} studentName={aiStudent.studentName||aiStudent.name} onClose={()=>setAiStudent(null)} />}
    </div>
  );
}

export default function Reports() {
  const [allExams, setAllExams]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [typeFilter, setTypeFilter]     = useState('all');
  const [search, setSearch]             = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [isDemo, setIsDemo]             = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/exams`, { headers:{ Authorization:`Bearer ${getToken()}` } })
      .then(r=>r.ok?r.json():{exams:[]})
      .then(d=>{
        const exams = d.exams||[];
        if (exams.length > 0) {
          setAllExams(exams);
          setIsDemo(false);
        } else {
          setAllExams([DEMO_HIRING_EXAM]);
          setIsDemo(true);
        }
        setLoading(false);
      })
      .catch(()=>{
        setAllExams([DEMO_HIRING_EXAM]);
        setIsDemo(true);
        setLoading(false);
      });
  }, []);

  const normType = t => {
    if (!t) return 'placement';
    const m = { placement:'placement',hiring:'placement',general:'placement',corporate:'placement',recruitment:'placement',university:'university',academic:'university',skill_cert:'skill_cert',certification:'skill_cert',certificate:'skill_cert' };
    return m[t.toLowerCase()]||'placement';
  };

  const withStudents = allExams.filter(e=>(e.student_count||0)>0);
  const filtered = withStudents.filter(e => {
    if (typeFilter!=='all'&&normType(e.exam_type)!==typeFilter) return false;
    if (search) { const q=search.toLowerCase(); return (e.title||'').toLowerCase().includes(q)||(e.college||'').toLowerCase().includes(q)||(e.subject_name||'').toLowerCase().includes(q); }
    return true;
  });

  const summary = {
    total:  withStudents.length,
    hiring: withStudents.filter(e=>normType(e.exam_type)==='placement').length,
    univ:   withStudents.filter(e=>normType(e.exam_type)==='university').length,
    cert:   withStudents.filter(e=>normType(e.exam_type)==='skill_cert').length,
  };

  const TABS = [{ id:'all',label:'All',count:summary.total },{ id:'placement',label:'Hiring',count:summary.hiring },{ id:'university',label:'University',count:summary.univ },{ id:'skill_cert',label:'Certification',count:summary.cert }];
  const TAB_COLORS = { all:T.accent, placement:'#6d28d9', university:'#0369a1', skill_cert:'#c2410c' };

  if (selectedExam) return (
    <div style={{ marginLeft:230, minHeight:'100vh', background:T.pageBg, fontFamily:"'Inter',sans-serif" }}>
      <style>{css}</style><Sidebar /><Navbar />
      <main style={{ padding:'28px 30px' }}><StudentListView exam={selectedExam} onBack={()=>setSelectedExam(null)} /></main>
    </div>
  );

  return (
    <div style={{ marginLeft:230, minHeight:'100vh', background:T.pageBg, fontFamily:"'Inter',sans-serif" }}>
      <style>{css}</style><Sidebar /><Navbar />
      <main style={{ padding:'28px 30px' }}>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:T.navy }}>Reports</h1>
          <p style={{ margin:'4px 0 0', fontSize:12.5, color:T.muted }}>{loading?'Loading...': `${withStudents.length} exam${withStudents.length!==1?'s':''} with students`}</p>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div style={{ background:T.orangeBg, border:'1px solid #fed7aa', borderRadius:9, padding:'8px 14px', marginBottom:16, fontSize:12, color:T.orange, display:'flex', alignItems:'center', gap:7 }}>
            ℹ️ No live data found — showing demo preview
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[{ label:'Total Exams',val:summary.total,color:T.accent },{ label:'Hiring',val:summary.hiring,color:'#6d28d9' },{ label:'University',val:summary.univ,color:'#0369a1' },{ label:'Certification',val:summary.cert,color:'#c2410c' }].map(({ label,val,color }) => (
            <div key={label} style={{ background:T.white, borderRadius:12, padding:'15px 18px', border:`1px solid ${T.border}`, borderTop:`3px solid ${color}`, boxShadow:T.shadow }}>
              <div style={{ fontSize:10, color:T.dim, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:28, fontWeight:800, color:T.navy }}>{loading?'—':val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${T.border}` }}>
          {TABS.map(t => {
            const active = typeFilter===t.id; const c = TAB_COLORS[t.id];
            return (
              <button key={t.id} onClick={()=>setTypeFilter(t.id)} style={{ padding:'9px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:active?700:500,color:active?c:T.muted,borderBottom:active?`2px solid ${c}`:'2px solid transparent',marginBottom:-1,display:'flex',alignItems:'center',gap:6 }}>
                {t.label}
                <span style={{ padding:'1px 7px',borderRadius:20,fontSize:10.5,fontWeight:700,background:active?c+'18':'#f1f5f9',color:active?c:T.dim }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ background:T.white, border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', boxShadow:T.shadow, overflow:'hidden' }}>
          <div style={{ padding:'11px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exam, college..."
              style={{ border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',flex:1,maxWidth:380 }} />
            <span style={{ fontSize:12, color:T.dim, fontFamily:'monospace' }}>{filtered.length} results</span>
          </div>
          {loading ? <div style={{ padding:80, textAlign:'center', color:T.muted }}>Loading...</div>
          : !filtered.length ? <div style={{ padding:80, textAlign:'center', color:T.dim }}>No exams found.</div>
          : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:`2px solid ${T.border}` }}>
                    {['Exam Name','Type','College / Batch','Students','Total Marks','Status','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:T.muted,textTransform:'uppercase',whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exam => {
                    const done = exam.status==='completed'; const live = ['scheduled','active'].includes(exam.status);
                    return (
                      <tr key={exam.id} style={{ borderBottom:`1px solid ${T.border}`,cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f0f7ff'}
                        onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ fontWeight:700, color:T.navy }}>{exam.title}</div>
                          {exam.subject_name&&<div style={{ fontSize:11,color:T.dim }}>{exam.subject_name}</div>}
                        </td>
                        <td style={{ padding:'12px 14px' }}><TypeBadge type={exam.exam_type} /></td>
                        <td style={{ padding:'12px 14px', color:T.muted, fontSize:12 }}>
                          {exam.college||'—'}
                          {exam.batch_year&&<div style={{ fontSize:11,color:T.dim }}>Batch {exam.batch_year}</div>}
                        </td>
                        <td style={{ padding:'12px 14px', fontWeight:800, color:T.accent, fontSize:16 }}>{exam.student_count||0}</td>
                        <td style={{ padding:'12px 14px', fontWeight:700, color:T.purple, fontSize:15 }}>{exam.total_marks||'—'}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ padding:'3px 10px',borderRadius:20,fontSize:10.5,fontWeight:700,background:done?T.greenBg:live?T.accentSoft:'#f1f5f9',color:done?T.green:live?T.accent:T.dim }}>
                            {exam.status||'scheduled'}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <button onClick={()=>setSelectedExam(exam)}
                            style={{ padding:'5px 13px',background:T.accentSoft,color:T.accent,border:`1px solid ${T.border}`,borderRadius:7,fontSize:11.5,fontWeight:700,cursor:'pointer' }}
                            onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color='#fff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=T.accentSoft;e.currentTarget.style.color=T.accent;}}>
                            View Students
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
      </main>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;
