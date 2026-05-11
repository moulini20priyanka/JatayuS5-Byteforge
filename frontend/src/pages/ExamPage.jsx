// src/pages/ExamPage.jsx — FINAL VERSION
// Includes: ID Card verification gate → Face check → Timed exam → Score result
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API        = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const VERIFY_API = 'http://localhost:5001';

function authHeader() {
  const t = localStorage.getItem('student_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─── ID VERIFICATION GATE ─────────────────────────────────────────────────────
function IDVerifyGate({ examTitle, onVerified }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [step,     setStep]     = useState('id');
  const [scanning, setScanning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [captured, setCaptured] = useState(null);
  const [camErr,   setCamErr]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch { setCamErr('Camera access denied — allow camera and refresh'); }
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  function captureFrame() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return null;
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  }

  async function handleScan() {
    setScanning(true); setResult(null);
    const img = captureFrame();
    if (!img) { setScanning(false); return; }
    setCaptured(img);
    try {
      const res  = await fetch(`${VERIFY_API}/verify-id`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img }),
      });
      const data = await res.json();
      const filtered = data.issues?.filter(i => !(i.check === 'FACE' && i.status === 'ERROR')) || [];
      const errs     = filtered.filter(i => i.status === 'ERROR');
      const ok       = errs.length === 0 && (data.passed?.length || 0) > 0;
      setResult({ ...data, issues: filtered, overall: ok });
      if (ok && step === 'id') setTimeout(() => { setStep('face'); setResult(null); setCaptured(null); }, 1800);
      if (ok && step === 'face') setTimeout(() => { streamRef.current?.getTracks().forEach(t => t.stop()); onVerified(); }, 1500);
    } catch {
      setResult({ overall: false, passed: [], issues: [{ check: 'CONNECTION', status: 'ERROR',
        problem: 'Verification server not running', fix: 'Run: python id_verify.py in backend folder' }] });
    }
    setScanning(false);
  }

  const steps = [{ k:'id', l:'ID Card Scan' }, { k:'face', l:'Face Match' }, { k:'done', l:'Enter Exam' }];
  const si    = steps.findIndex(s => s.k === step);

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:20, width:'100%', maxWidth:540, boxShadow:'0 32px 80px rgba(0,0,0,0.4)', overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#1a1060,#302b63)', padding:'20px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:14 }}>
            {steps.map((s,i) => (
              <React.Fragment key={s.k}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:i<=si?'#7055C8':'rgba(255,255,255,0.15)', border:`2px solid ${i<=si?'#C060C0':'rgba(255,255,255,0.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>{i<si?'✓':i+1}</div>
                  <span style={{ fontSize:9, color:i<=si?'#C060C0':'rgba(255,255,255,0.4)', fontWeight:700, whiteSpace:'nowrap' }}>{s.l}</span>
                </div>
                {i<steps.length-1 && <div style={{ flex:1, height:2, background:i<si?'#7055C8':'rgba(255,255,255,0.15)', margin:'0 6px', marginBottom:18 }} />}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display:'inline-block', background:'rgba(112,85,200,0.3)', border:'1px solid rgba(192,96,192,0.4)', borderRadius:6, padding:'3px 10px', fontSize:10, fontWeight:700, color:'#C060C0', letterSpacing:1, marginBottom:6 }}>STEP {si+1} · {steps[si]?.l.toUpperCase()}</div>
          <h2 style={{ fontSize:19, fontWeight:800, color:'#fff', marginBottom:3 }}>{step==='id'?'Scan Your ID Card':'Face Verification'}</h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', margin:0 }}>{step==='id'?'Hold your College / Aadhaar / Government ID flat, face-up, close to camera':'Look directly at camera — face clearly visible, good lighting'}</p>
        </div>
        <div style={{ padding:'18px 22px' }}>
          {examTitle && <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'7px 14px', marginBottom:10, fontSize:12 }}>Exam: <strong style={{ color:'#0369a1' }}>{examTitle}</strong></div>}
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'6px 14px', marginBottom:10, fontSize:11, color:'#92400e' }}>💡 {step==='id'?'Good lighting · Card face-up · Fill frame · No glare · Hold steady':'Face centred · Good lighting · Look at camera · Remove glasses if needed'}</div>
          <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#0f0c29', marginBottom:10, aspectRatio:'16/9' }}>
            {camErr ? <div style={{ padding:40, textAlign:'center', color:'#ef4444', fontSize:13 }}>{camErr}</div>
              : captured && result ? <img src={captured} alt="cap" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />}
            <canvas ref={canvasRef} style={{ display:'none' }} />
            {!captured && !camErr && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <div style={{ width:step==='id'?'60%':'35%', height:step==='id'?'50%':'60%', border:'2px dashed rgba(255,255,255,0.5)', borderRadius:step==='id'?10:'50%' }} />
              </div>
            )}
          </div>
          {result && (
            <div style={{ marginBottom:10 }}>
              {result.passed?.map((p,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, marginBottom:5 }}>
                  <div><span style={{ color:'#16a34a', fontWeight:700, marginRight:8 }}>✓</span><span style={{ fontSize:13, fontWeight:600, color:'#166534' }}>{p.check}</span><div style={{ fontSize:11, color:'#86efac', marginLeft:20 }}>{p.value}</div></div>
                  <span style={{ fontSize:10, fontWeight:800, color:'#16a34a' }}>PASS</span>
                </div>
              ))}
              {result.issues?.map((issue,i) => (
                <div key={i} style={{ padding:'8px 12px', background:issue.status==='ERROR'?'#fef2f2':'#fffbeb', border:`1px solid ${issue.status==='ERROR'?'#fca5a5':'#fde68a'}`, borderRadius:8, marginBottom:5 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:issue.status==='ERROR'?'#dc2626':'#d97706' }}>{issue.status==='ERROR'?'✗':'⚠'} {issue.check}</span>
                    <span style={{ fontSize:10, fontWeight:800, color:issue.status==='ERROR'?'#dc2626':'#d97706' }}>{issue.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#374151', marginBottom:2 }}>{issue.problem}</div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>→ {issue.fix}</div>
                </div>
              ))}
              {result.overall && <div style={{ padding:'11px', background:'linear-gradient(135deg,#059669,#10b981)', borderRadius:10, textAlign:'center', color:'#fff', fontSize:13, fontWeight:700 }}>✓ {step==='id'?'ID Verified — Proceeding to face check…':'Verified — Entering exam…'}</div>}
              {!result.overall && <div style={{ fontSize:12, color:'#94a3b8', textAlign:'center' }}>Adjust and tap Scan again ↓</div>}
            </div>
          )}
          {(!result || !result.overall) && (
            <button onClick={handleScan} disabled={scanning||!!camErr} style={{ width:'100%', padding:'12px', background:scanning?'#94a3b8':'linear-gradient(135deg,#1a1060,#302b63)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:scanning?'not-allowed':'pointer' }}>
              {scanning?'🔍 Scanning…':result?'↺ Scan Again':step==='id'?'📷 Scan ID Card':'📷 Verify Face'}
            </button>
          )}
          <button onClick={() => { streamRef.current?.getTracks().forEach(t=>t.stop()); onVerified(); }} style={{ width:'100%', padding:'8px', marginTop:7, background:'transparent', border:'1px solid #e2e8f0', borderRadius:8, color:'#94a3b8', fontSize:11, cursor:'pointer' }}>
            Skip verification (dev only)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function Timer({ totalSeconds, onExpire }) {
  const [left, setLeft] = useState(totalSeconds);
  const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => setLeft(p => { if (p<=1){clearInterval(ref.current);onExpire();return 0;} return p-1; }), 1000);
    return () => clearInterval(ref.current);
  }, []);
  const h=Math.floor(left/3600), m=Math.floor((left%3600)/60), s=left%60, pct=(left/totalSeconds)*100, urgent=left<300;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:urgent?'#fef2f2':'#f0fdf4', border:`1.5px solid ${urgent?'#fca5a5':'#bbf7d0'}`, borderRadius:10, padding:'7px 14px' }}>
      <svg width="32" height="32" style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="2.5"/>
        <circle cx="16" cy="16" r="13" fill="none" stroke={urgent?'#ef4444':'#22c55e'} strokeWidth="2.5"
          strokeDasharray={`${2*Math.PI*13}`} strokeDashoffset={`${2*Math.PI*13*(1-pct/100)}`} style={{ transition:'stroke-dashoffset 1s linear' }}/>
      </svg>
      <div>
        <div style={{ fontSize:9, fontWeight:800, color:urgent?'#dc2626':'#16a34a', letterSpacing:1, textTransform:'uppercase' }}>{urgent?'⚠ Time Running Out':'Time Remaining'}</div>
        <div style={{ fontSize:19, fontWeight:800, color:urgent?'#dc2626':'#1a1060', fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>
          {h>0&&`${String(h).padStart(2,'0')}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
        </div>
      </div>
    </div>
  );
}

// ─── OPTION BUTTON ────────────────────────────────────────────────────────────
function OptionBtn({ label, text, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'flex-start', gap:12, width:'100%', padding:'13px 16px', border:`2px solid ${selected?'#7055C8':'#e8e4f8'}`, background:selected?'rgba(112,85,200,0.06)':'#fafbff', borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all .15s', marginBottom:8 }}>
      <span style={{ minWidth:26, height:26, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:selected?'#7055C8':'#ede9fe', color:selected?'#fff':'#7055C8', fontSize:12, fontWeight:800 }}>{label}</span>
      <span style={{ fontSize:14, color:'#1e293b', lineHeight:1.5, paddingTop:2 }}>{text}</span>
    </button>
  );
}

// ─── QUESTION PANEL ───────────────────────────────────────────────────────────
function QuestionPanel({ question, index, total, answer, onAnswer }) {
  const opts = [{ key:'A', text:question.option_a },{ key:'B', text:question.option_b },{ key:'C', text:question.option_c },{ key:'D', text:question.option_d }].filter(o=>o.text);
  const ds = { easy:{bg:'#dcfce7',color:'#16a34a'}, medium:{bg:'#fef9c3',color:'#ca8a04'}, hard:{bg:'#fee2e2',color:'#dc2626'} }[(question.difficulty||'medium').toLowerCase()] || { bg:'#fef9c3', color:'#ca8a04' };
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8' }}>Q{index+1} of {total}</span>
          <span style={{ padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:ds.bg, color:ds.color }}>{(question.difficulty||'MEDIUM').toUpperCase()}</span>
          <span style={{ padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:'#ede9fe', color:'#7055C8' }}>{(question.type||'MCQ').toUpperCase()}</span>
          <span style={{ marginLeft:'auto', fontSize:12, color:'#94a3b8', fontWeight:600 }}>{question.marks||1} mark{(question.marks||1)!==1?'s':''}</span>
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:'#1a1060', lineHeight:1.75, marginBottom:24, padding:'20px 24px', background:'linear-gradient(135deg,#fafbff,#f5f3ff)', border:'1.5px solid #e8e4f8', borderRadius:12 }}>
          {question.question_text}
        </div>
        {opts.length>0 ? opts.map(opt => (
          <OptionBtn key={opt.key} label={opt.key} text={opt.text} selected={answer===opt.key} onClick={() => onAnswer(question.id, opt.key)} />
        )) : (
          <textarea placeholder="Type your answer here…" value={answer||''} onChange={e=>onAnswer(question.id,e.target.value)}
            style={{ width:'100%', minHeight:140, padding:'14px 18px', border:'2px solid #e8e4f8', borderRadius:10, fontSize:13, resize:'vertical', fontFamily:'monospace', lineHeight:1.6, background:'#fafbff', outline:'none', boxSizing:'border-box' }} />
        )}
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ result, answered, questions, examData, onBack }) {
  const pct=result.percentage||0, passed=pct>=(examData?.cutoff_score||40);
  return (
    <div style={{ minHeight:'100vh', background:passed?'linear-gradient(135deg,#f0fdf4,#dcfce7)':'linear-gradient(135deg,#faf8ff,#f1f0ff)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'48px 40px', maxWidth:500, width:'100%', textAlign:'center', boxShadow:`0 20px 60px ${passed?'rgba(5,150,105,0.15)':'rgba(112,85,200,0.15)'}`, border:`1px solid ${passed?'#bbf7d0':'#e8e4f8'}` }}>
        <div style={{ width:88, height:88, borderRadius:'50%', margin:'0 auto 24px', background:passed?'linear-gradient(135deg,#22c55e,#10b981)':'linear-gradient(135deg,#7055C8,#C060C0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, boxShadow:`0 8px 24px ${passed?'rgba(34,197,94,0.3)':'rgba(112,85,200,0.3)'}` }}>{passed?'🏆':'📝'}</div>
        <h2 style={{ fontSize:26, fontWeight:800, color:'#1a1060', marginBottom:6 }}>{passed?'Well Done!':'Exam Submitted'}</h2>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:32 }}>{passed?'You passed the assessment successfully!':'Better luck next time — keep practising!'}</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32 }}>
          {[['Score',`${result.score}/${result.total_marks}`,true],['Percentage',`${pct}%`,true],['Answered',`${answered}/${questions.length}`],['Result',passed?'PASS ✓':'FAIL ✗']].map(([l,v,h])=>(
            <div key={l} style={{ padding:'14px 16px', borderRadius:12, background:h?(passed?'#f0fdf4':'#faf8ff'):'#f8fafc', border:`1px solid ${h?(passed?'#bbf7d0':'#e8e4f8'):'#f1f5f9'}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:passed?'#059669':'#7055C8' }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ width:'100%', padding:'13px', background:passed?'linear-gradient(135deg,#059669,#10b981)':'linear-gradient(135deg,#7055C8,#C060C0)', border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>Back to Dashboard</button>
      </div>
    </div>
  );
}

// ─── MAIN EXAM PAGE ───────────────────────────────────────────────────────────
export default function ExamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const examData = location.state?.examData;
  const [idVerified,  setIdVerified]  = useState(false);
  const [answers,     setAnswers]     = useState({});
  const [current,     setCurrent]     = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const questions = examData?.questions || [];
  const duration  = (examData?.duration || 60) * 60;

  useEffect(() => { if (!examData) navigate('/student-hiring'); }, []);
  useEffect(() => {
    if (!idVerified || submitted) return;
    const h = e => { e.preventDefault(); e.returnValue=''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [idVerified, submitted]);

  const submitExam = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/api/exams/${examData.exam_id}/submit`, { method:'POST', headers:{ 'Content-Type':'application/json', ...authHeader() }, body:JSON.stringify({ answers }) });
      const data = await res.json();
      setResult(data); setSubmitted(true);
    } catch (err) { alert('Submission failed: ' + err.message); setSubmitting(false); }
  }, [answers, examData, submitting, submitted]);

  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const q = questions[current];

  if (!idVerified) return <IDVerifyGate examTitle={examData?.title} onVerified={() => setIdVerified(true)} />;
  if (submitted && result) return <ResultScreen result={result} answered={answered} questions={questions} examData={examData} onBack={() => navigate('/student-hiring')} />;
  if (!q) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>No questions found.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#f8fafc', overflow:'hidden' }}>
      {/* Top Bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e4f8', padding:'10px 24px', display:'flex', alignItems:'center', gap:16, flexShrink:0, zIndex:10, boxShadow:'0 1px 8px rgba(112,85,200,0.06)' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1060' }}>{examData?.title}</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{answered} of {questions.length} answered</div>
        </div>
        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <Timer totalSeconds={duration} onExpire={() => submitExam()} />
        </div>
        <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => setShowConfirm(true)} style={{ padding:'9px 22px', borderRadius:8, background:'linear-gradient(135deg,#7055C8,#C060C0)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 12px rgba(112,85,200,0.3)' }}>Submit Exam</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height:3, background:'#f1f5f9', flexShrink:0 }}>
        <div style={{ height:'100%', background:'linear-gradient(90deg,#7055C8,#C060C0)', width:`${questions.length?(answered/questions.length)*100:0}%`, transition:'width .4s ease' }} />
      </div>

      {/* Body */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Palette */}
        <div style={{ width:220, background:'#fff', borderRight:'1px solid #f1f5f9', padding:'16px 12px', overflowY:'auto', flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Questions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
            {questions.map((qi,i) => {
              const isAns=!!answers[qi.id], isCur=i===current;
              return <button key={qi.id} onClick={()=>setCurrent(i)} style={{ width:36, height:36, borderRadius:8, border:isCur?'2px solid #7055C8':'1.5px solid #e8e4f8', background:isCur?'#7055C8':isAns?'#dcfce7':'#fafbff', color:isCur?'#fff':isAns?'#059669':'#94a3b8', fontSize:11, fontWeight:700, cursor:'pointer' }}>{i+1}</button>;
            })}
          </div>
          <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:6 }}>
            {[['#7055C8','Current',false],['#dcfce7','Answered',false],['#fafbff','Not answered',true]].map(([bg,l,border])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:13, height:13, borderRadius:3, background:bg, border:border?'1.5px solid #e8e4f8':'none', flexShrink:0 }} />
                <span style={{ fontSize:11, color:'#64748b' }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18, padding:'12px', background:'#faf8ff', borderRadius:8, border:'1px solid #e8e4f8' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Progress</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#7055C8' }}>{answered}<span style={{ fontSize:12, color:'#94a3b8', fontWeight:500 }}>/{questions.length}</span></div>
            <div style={{ height:4, background:'#e8e4f8', borderRadius:99, marginTop:5, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#7055C8,#C060C0)', width:`${questions.length?(answered/questions.length)*100:0}%`, borderRadius:99, transition:'width .3s' }} />
            </div>
          </div>
        </div>
        <QuestionPanel question={q} index={current} total={questions.length} answer={answers[q.id]} onAnswer={(id,val)=>setAnswers(p=>({...p,[id]:val}))} />
      </div>

      {/* Bottom Nav */}
      <div style={{ background:'#fff', borderTop:'1px solid #e8e4f8', padding:'10px 24px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button disabled={current===0} onClick={()=>setCurrent(p=>p-1)} style={{ padding:'8px 20px', border:'1.5px solid #e8e4f8', background:'#fff', borderRadius:8, fontSize:13, fontWeight:600, cursor:current===0?'not-allowed':'pointer', color:current===0?'#d1d5db':'#374151' }}>← Previous</button>
        <span style={{ fontSize:12, color:'#94a3b8', margin:'0 auto' }}>{answered} answered · {unanswered} remaining</span>
        {current<questions.length-1
          ? <button onClick={()=>setCurrent(p=>p+1)} style={{ padding:'8px 20px', border:'1.5px solid #7055C8', background:'#fff', borderRadius:8, fontSize:13, fontWeight:600, color:'#7055C8', cursor:'pointer' }}>Next →</button>
          : <button onClick={()=>setShowConfirm(true)} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#7055C8,#C060C0)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>Finish & Submit →</button>}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,12,41,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:18, padding:'36px 32px', width:400, textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>📋</div>
            <h3 style={{ fontSize:19, fontWeight:800, color:'#1a1060', marginBottom:8 }}>Submit Exam?</h3>
            {unanswered>0 && <p style={{ fontSize:13, color:'#f59e0b', fontWeight:600, marginBottom:6 }}>⚠ {unanswered} question{unanswered!==1?'s':''} unanswered</p>}
            <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>{answered} of {questions.length} answered.<br/>Once submitted you cannot change answers.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setShowConfirm(false)} style={{ flex:1, padding:11, border:'1.5px solid #e2e8f0', background:'#fff', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', color:'#64748b' }}>Go Back</button>
              <button onClick={()=>{ setShowConfirm(false); submitExam(); }} disabled={submitting} style={{ flex:1, padding:11, background:submitting?'#a5b4fc':'linear-gradient(135deg,#7055C8,#C060C0)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:submitting?'not-allowed':'pointer' }}>
                {submitting?'Submitting…':'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}