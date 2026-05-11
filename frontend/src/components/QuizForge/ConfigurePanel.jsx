// src/components/QuizForge/ConfigurePanel.jsx
// Step 0: Link to recruiter request OR create new exam name + QB ID
// Step 1: Choose exam purpose (Hiring / University / Certification)
// Step 2: Configure agents + per-topic question counts

import React, { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Design tokens ─────────────────────────────────────────────
const C = {
  accent:'#7055C8', accentLt:'rgba(112,85,200,0.08)',
  accentBd:'rgba(112,85,200,0.25)',
  text:'#1a1060', text2:'#4b5563', text3:'#94a3b8',
  border:'#e8e4f8', borderSoft:'#e2e8f0', radius:'10px',
};

// Exam purpose themes
const PURPOSE_THEMES = {
  hiring: {
    label:'Hiring / Placement', icon:'💼',
    color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe',
    desc:'For campus recruitment, placement drives & corporate hiring assessments',
  },
  university: {
    label:'University / Internal', icon:'🎓',
    color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe',
    desc:'For semester exams, mid-terms, unit tests & internal college assessments',
  },
  certification: {
    label:'Skill Certification', icon:'🏆',
    color:'#059669', bg:'#ecfdf5', border:'#6ee7b7',
    desc:'For skill-based certifications, badges & professional competency exams',
  },
};

// Agent themes
const AGENT_THEMES = {
  mcq:      { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Multiple Choice'        },
  sql:      { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', label:'Database & Queries'     },
  coding:   { color:'#d97706', bg:'#fffbeb', border:'#fcd34d', label:'Programming Problems'   },
  aptitude: { color:'#0891b2', bg:'#f0f9ff', border:'#bae6fd', label:'Quantitative Reasoning' },
  verbal:   { color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8', label:'Language Ability'       },
};

const AGENTS = [
  { key:'mcq',      name:'MCQ Generator'     },
  { key:'sql',      name:'SQL Generator'     },
  { key:'coding',   name:'Coding Generator'  },
  { key:'aptitude', name:'Aptitude Generator'},
  { key:'verbal',   name:'Verbal Generator'  },
];

const DIFFICULTIES = ['easy','medium','hard','mixed'];
const CODING_PLATFORMS = [
  { id:'leetcode',      label:'LeetCode'      },
  { id:'geeksforgeeks', label:'GeeksForGeeks' },
  { id:'hackerrank',    label:'HackerRank'    },
  { id:'hackerearth',   label:'HackerEarth'   },
  { id:'codechef',      label:'CodeChef'      },
  { id:'codeforces',    label:'Codeforces'    },
  { id:'interviewbit',  label:'InterviewBit'  },
];
const PLACEHOLDERS = {
  mcq:'e.g. OOP Concepts, React Hooks, Data Structures',
  sql:'e.g. Joins, Indexes, Subqueries, Aggregations',
  coding:'e.g. Binary Trees, Graph BFS, Dynamic Programming',
  aptitude:'e.g. Percentages, Number Series, Syllogisms',
  verbal:'e.g. Vocabulary, Para Jumbles, Sentence Completion',
};

// ── Helpers ───────────────────────────────────────────────────
function genQBSCode() {
  return 'QBS-' + Math.random().toString(36).substr(2,6).toUpperCase();
}

// ── Topic row with +/- count ──────────────────────────────────
function TopicRow({ topic, count, color, border, onCount, onRemove }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,
      background:'#fff',border:`1px solid ${border}`,borderRadius:7,padding:'6px 10px' }}>
      <span style={{ flex:1,fontSize:12.5,color,fontWeight:500 }}>{topic}</span>
      <button onClick={()=>onCount(Math.max(1,count-1))}
        style={{ width:24,height:24,borderRadius:4,border:`1px solid ${border}`,
          background:'#fff',color,fontSize:15,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>−</button>
      <input type="number" min={1} max={200} value={count}
        onChange={e=>onCount(Math.max(1,Math.min(200,parseInt(e.target.value)||1)))}
        style={{ width:48,textAlign:'center',border:`1px solid ${border}`,
          borderRadius:4,padding:'3px 4px',fontSize:12,fontWeight:700,color,outline:'none' }}/>
      <button onClick={()=>onCount(Math.min(200,count+1))}
        style={{ width:24,height:24,borderRadius:4,border:`1px solid ${border}`,
          background:'#fff',color,fontSize:15,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>+</button>
      <span style={{ fontSize:10,color:'#94a3b8',minWidth:16 }}>Qs</span>
      <button onClick={onRemove}
        style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8',
          display:'flex',alignItems:'center',padding:0,marginLeft:2 }}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Agent box ─────────────────────────────────────────────────
function AgentBox({ agentKey, name, topicsMap, onTopicsChange, enabled, onToggle, platform, onPlatformChange }) {
  const [input, setInput]   = useState('');
  const [custom, setCustom] = useState('');
  const th     = AGENT_THEMES[agentKey];
  const topics = Object.entries(topicsMap);
  const totalQ = Object.values(topicsMap).reduce((s,c)=>s+c,0);

  function add() {
    const t = input.trim();
    if (t && !(t in topicsMap)) { onTopicsChange({...topicsMap,[t]:5}); setInput(''); }
  }
  function remove(t) { const n={...topicsMap}; delete n[t]; onTopicsChange(n); }
  function upd(t,c)  { onTopicsChange({...topicsMap,[t]:c}); }

  return (
    <div style={{ border:`1.5px solid ${enabled?th.border:'#e2e8f0'}`,
      borderRadius:C.radius, background:enabled?th.bg+'44':'#fafafa',
      overflow:'hidden', transition:'all 0.2s' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,
        padding:'13px 18px',cursor:'pointer',userSelect:'none' }} onClick={onToggle}>
        <div style={{ width:18,height:18,borderRadius:4,flexShrink:0,
          border:`2px solid ${enabled?th.color:'#cbd5e1'}`,
          background:enabled?th.color:'transparent',
          display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s' }}>
          {enabled&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:13.5,color:enabled?th.color:C.text }}>{name}</div>
          <div style={{ fontSize:11.5,color:C.text3,marginTop:1 }}>{th.label}</div>
        </div>
        {topics.length>0&&(
          <span style={{ padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,
            background:enabled?th.bg:'#f1f5f9',border:`1px solid ${enabled?th.border:'#e2e8f0'}`,
            color:enabled?th.color:C.text3 }}>
            {topics.length} topic{topics.length!==1?'s':''} · {totalQ} Qs
          </span>
        )}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
          style={{ transform:enabled?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0 }}>
          <path d="M3 5.5L7.5 10L12 5.5" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {enabled&&(
        <div style={{ padding:'0 18px 18px',borderTop:`1px solid ${th.border}` }}>
          {agentKey==='coding'&&(
            <div style={{ marginTop:12,marginBottom:12 }}>
              <div style={{ fontSize:10,fontWeight:700,color:C.text3,letterSpacing:'0.06em',
                textTransform:'uppercase',marginBottom:8 }}>Platform</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
                {CODING_PLATFORMS.map(p=>(
                  <button key={p.id} onClick={()=>onPlatformChange(p.id)}
                    style={{ padding:'4px 11px',borderRadius:99,fontSize:11.5,cursor:'pointer',
                      fontWeight:platform===p.id?700:400,
                      background:platform===p.id?th.color:'#fff',
                      border:`1px solid ${platform===p.id?th.color:'#e2e8f0'}`,
                      color:platform===p.id?'#fff':C.text2,transition:'all 0.15s' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <input value={custom} onChange={e=>setCustom(e.target.value)}
                  placeholder="Or type custom platform…"
                  style={{ flex:1,padding:'6px 11px',border:'1px solid #e2e8f0',
                    borderRadius:7,fontSize:12,outline:'none' }}/>
                <button onClick={()=>{if(custom.trim()){onPlatformChange(custom.trim());setCustom('');}}}
                  style={{ padding:'6px 12px',borderRadius:7,border:`1px solid ${th.border}`,
                    background:th.bg,color:th.color,fontSize:12,fontWeight:600,cursor:'pointer' }}>
                  Use
                </button>
              </div>
            </div>
          )}
          <div style={{ display:'flex',gap:8,marginTop:agentKey==='coding'?0:12,marginBottom:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&add()}
              placeholder={PLACEHOLDERS[agentKey]}
              style={{ flex:1,padding:'8px 13px',border:'1px solid #e2e8f0',
                borderRadius:7,fontSize:13,outline:'none',background:'#fff' }}
              onFocus={e=>e.target.style.borderColor=th.color}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            <button onClick={add}
              style={{ padding:'8px 16px',borderRadius:7,background:th.color,
                color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer' }}>
              Add
            </button>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {topics.length===0&&(
              <span style={{ fontSize:12,color:C.text3 }}>
                Add topics above — set question count per topic with + / −
              </span>
            )}
            {topics.map(([topic,count])=>(
              <TopicRow key={topic} topic={topic} count={count}
                color={th.color} border={th.border}
                onCount={c=>upd(topic,c)} onRemove={()=>remove(topic)}/>
            ))}
          </div>
          {topics.length>0&&(
            <div style={{ marginTop:7,fontSize:11,color:C.text3,textAlign:'right' }}>
              This agent: <strong style={{ color:th.color }}>{totalQ} questions total</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN ConfigurePanel
// ══════════════════════════════════════════════════════════════
export default function ConfigurePanel({ onStart }) {
  // ── Step state ─────────────────────────────────────────────
  // step 0: link to request OR new exam name
  // step 1: choose purpose
  // step 2: agents config
  const [step, setStep] = useState(0);

  // ── Step 0: Exam identity ──────────────────────────────────
  const [approvedRequests, setApprovedReqs] = useState([]);
  const [loadingReqs,      setLoadingReqs]  = useState(true);
  const [useExistingReq,   setUseExisting]  = useState(null); // null=not decided, true/false
  const [selectedReq,      setSelectedReq]  = useState(null);
  const [examName,         setExamName]     = useState('');
  const [qbsCode,          setQBSCode]      = useState(genQBSCode());

  // ── Step 1: Purpose ────────────────────────────────────────
  const [examPurpose, setExamPurpose] = useState('');

  // ── Step 2: Agents ────────────────────────────────────────
  const [enabled,        setEnabled]   = useState({mcq:true,sql:true,coding:true,aptitude:false,verbal:false});
  const [agentTopicMaps, setMaps]      = useState({mcq:{},sql:{},coding:{},aptitude:{},verbal:{}});
  const [codingPlatform, setPlatform]  = useState('leetcode');
  const [difficulty,     setDiff]      = useState('mixed');

  // Load approved requests
  useEffect(() => {
    fetch(`${API}/api/question-bank/exam-names`, { headers:authHeader() })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if (d) setApprovedReqs(d.approvedRequests||[]);
        setLoadingReqs(false);
      })
      .catch(()=>setLoadingReqs(false));
  }, []);

  // When a request is selected, auto-fill exam name
  function selectRequest(req) {
    setSelectedReq(req);
    setExamName(req.title || `${req.jobRole} — ${req.companyName}`);
    // auto-purpose
    if (!examPurpose) setExamPurpose('hiring');
  }

  // Derived
  const activeAgents  = AGENTS.filter(a=>enabled[a.key]);
  const allHaveTopics = activeAgents.every(a=>Object.keys(agentTopicMaps[a.key]).length>0);
  const totalTopics   = activeAgents.reduce((s,a)=>s+Object.keys(agentTopicMaps[a.key]).length,0);
  const totalEst      = activeAgents.reduce((s,a)=>s+Object.values(agentTopicMaps[a.key]).reduce((x,c)=>x+c,0),0);
  const canProceedStep0 = examName.trim().length>0 && qbsCode.trim().length>0;
  const canProceedStep1 = examPurpose.length>0;
  const canGenerate     = activeAgents.length>0 && allHaveTopics;

  function handleGenerate() {
    if (!canGenerate) return;
    const agentTopics = {};
    for (const a of activeAgents) {
      const map    = agentTopicMaps[a.key];
      const topics = Object.keys(map);
      if (a.key==='coding') {
        agentTopics[a.key] = { topics, platform:codingPlatform, questionCounts:map };
      } else {
        agentTopics[a.key] = { topics, questionCounts:map };
      }
    }
    onStart({
      agentTopics,
      agentTopicMaps,
      difficulty,
      examName:      examName.trim(),
      sessionCode:   qbsCode.trim(),
      examType:      examPurpose,
      examRequestId: selectedReq?.id || null,
    });
  }

  // ── Render steps ───────────────────────────────────────────
  return (
    <div style={{ maxWidth:840,margin:'0 auto',padding:'32px 4px' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'inline-flex',alignItems:'center',gap:6,
          background:C.accentLt,border:`1px solid ${C.accentBd}`,
          borderRadius:99,padding:'4px 14px',marginBottom:10 }}>
          <svg width="12" height="12" viewBox="0 0 15 15" fill={C.accent}>
            <path d="M7.5 1L9.18 5.41L14 5.41L10.16 8.09L11.84 12.5L7.5 9.82L3.16 12.5L4.84 8.09L1 5.41L5.82 5.41L7.5 1Z"/>
          </svg>
          <span style={{ fontSize:10.5,color:C.accent,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' }}>
            NeuroGenerate AI — Question Bank Setup
          </span>
        </div>
        <h1 style={{ fontSize:22,fontWeight:800,color:C.text,letterSpacing:'-0.02em',margin:0 }}>
          Create Question Bank
        </h1>

        {/* Step progress */}
        <div style={{ display:'flex',alignItems:'center',gap:0,marginTop:16 }}>
          {[
            { n:1, label:'Exam Identity'  },
            { n:2, label:'Purpose'        },
            { n:3, label:'Configure & Generate' },
          ].map((s,i)=>{
            const done   = step > i;
            const active = step === i;
            return (
              <React.Fragment key={s.n}>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <div style={{ width:30,height:30,borderRadius:'50%',
                    background: done?C.accent:active?'linear-gradient(135deg,#7055C8,#C060C0)':'#f0ecfc',
                    border:`2px solid ${done||active?C.accent:'#e8e4f8'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:active?'0 0 0 4px rgba(112,85,200,0.15)':'none',
                    transition:'all 0.2s' }}>
                    {done
                      ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{ fontSize:12,fontWeight:700,color:active?'#fff':'#c4b8e8' }}>{s.n}</span>
                    }
                  </div>
                  <span style={{ fontSize:10.5,fontWeight:active||done?700:400,
                    color:active||done?C.accent:C.text3,whiteSpace:'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i<2&&(
                  <div style={{ flex:1,height:2,margin:'0 6px',marginBottom:18,
                    background:done?C.accent:'#e8e4f8',transition:'background 0.3s',
                    maxWidth:120 }}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          STEP 0 — Exam Identity
      ════════════════════════════════════════════════════ */}
      {step===0&&(
        <div style={{ display:'grid',gap:16 }}>

          {/* Link to recruiter request? */}
          <div style={{ background:'#fff',border:`1px solid ${C.border}`,borderRadius:C.radius,padding:20 }}>
            <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:4 }}>
              Is this Question Bank for an approved recruiter exam request?
            </div>
            <div style={{ fontSize:12,color:C.text3,marginBottom:16 }}>
              If yes, select the request below and the exam name will be auto-filled.
              If no, enter the exam name manually.
            </div>

            {loadingReqs ? (
              <div style={{ fontSize:12,color:C.text3 }}>Loading approved requests…</div>
            ) : approvedRequests.length===0 ? (
              <div style={{ padding:'14px 16px',background:'#faf9ff',border:`1px solid ${C.border}`,
                borderRadius:8,fontSize:12,color:C.text3 }}>
                No approved recruiter requests found. Enter exam name manually below.
              </div>
            ) : (
              <>
                {/* Request cards */}
                <div style={{ display:'grid',gap:8,marginBottom:16 }}>
                  {approvedRequests.map(r=>{
                    const active = selectedReq?.id===r.id;
                    return (
                      <div key={r.id} onClick={()=>selectRequest(r)}
                        style={{ padding:'12px 16px',borderRadius:9,cursor:'pointer',
                          border:`1.5px solid ${active?C.accent:'#e2e8f0'}`,
                          background:active?C.accentLt:'#fff',
                          transition:'all 0.15s',
                          display:'flex',alignItems:'center',gap:12 }}>
                        <div style={{ width:18,height:18,borderRadius:'50%',flexShrink:0,
                          border:`2px solid ${active?C.accent:'#cbd5e1'}`,
                          background:active?C.accent:'transparent',
                          display:'flex',alignItems:'center',justifyContent:'center' }}>
                          {active&&<div style={{ width:7,height:7,borderRadius:'50%',background:'#fff' }}/>}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:600,fontSize:13,color:active?C.accent:C.text,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                            {r.title||`${r.jobRole} — ${r.companyName}`}
                          </div>
                          <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>
                            {r.companyName&&`${r.companyName} · `}
                            {r.college&&`${r.college} · `}
                            Batch {r.batchYear||'—'}
                          </div>
                        </div>
                        {active&&(
                          <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',
                            borderRadius:99,background:C.accent,color:'#fff' }}>Selected</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
                  <div style={{ flex:1,height:1,background:'#e8e4f8' }}/>
                  <span style={{ fontSize:11,color:C.text3,whiteSpace:'nowrap' }}>or create new exam name</span>
                  <div style={{ flex:1,height:1,background:'#e8e4f8' }}/>
                </div>
              </>
            )}

            {/* Manual exam name */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.text2,marginBottom:5 }}>
                  Exam Name <span style={{ color:'#dc2626' }}>*</span>
                </label>
                <input value={examName} onChange={e=>setExamName(e.target.value)}
                  placeholder="e.g. Infosys Placement 2026 — Full Stack"
                  style={{ width:'100%',padding:'9px 12px',
                    border:`1.5px solid ${examName.trim()?C.accent:'#e2e8f0'}`,
                    borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',
                    fontFamily:'inherit' }}
                  onFocus={e=>e.target.style.borderColor=C.accent}
                  onBlur={e=>e.target.style.borderColor=examName.trim()?C.accent:'#e2e8f0'}/>
                {!examName.trim()&&(
                  <div style={{ fontSize:10.5,color:'#dc2626',marginTop:3 }}>Required</div>
                )}
              </div>
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:C.text2,marginBottom:5 }}>
                  Question Bank ID <span style={{ fontSize:10,color:C.text3,fontWeight:400 }}>(auto-generated)</span>
                </label>
                <div style={{ display:'flex',gap:6 }}>
                  <input value={qbsCode} onChange={e=>setQBSCode(e.target.value.toUpperCase())}
                    style={{ flex:1,padding:'9px 12px',border:'1.5px solid #e2e8f0',
                      borderRadius:8,fontSize:13,fontFamily:'monospace',outline:'none',
                      boxSizing:'border-box',color:C.accent,fontWeight:700 }}/>
                  <button onClick={()=>setQBSCode(genQBSCode())}
                    title="Regenerate ID"
                    style={{ padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,
                      background:'#fff',cursor:'pointer',display:'flex',alignItems:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize:10.5,color:C.text3,marginTop:3 }}>
                  This ID links all questions in this bank
                </div>
              </div>
            </div>
          </div>

          {/* Next button */}
          <div style={{ display:'flex',justifyContent:'flex-end' }}>
            <button onClick={()=>setStep(1)} disabled={!canProceedStep0}
              style={{ padding:'11px 28px',borderRadius:8,fontSize:14,fontWeight:700,
                background:canProceedStep0?'linear-gradient(135deg,#7055C8,#C060C0)':'#e2e8f0',
                color:canProceedStep0?'#fff':'#94a3b8',border:'none',
                cursor:canProceedStep0?'pointer':'not-allowed',
                boxShadow:canProceedStep0?'0 2px 12px rgba(112,85,200,0.3)':'none' }}>
              Next: Choose Purpose →
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 1 — Exam Purpose
      ════════════════════════════════════════════════════ */}
      {step===1&&(
        <div style={{ display:'grid',gap:16 }}>
          {/* Summary of step 0 */}
          <div style={{ background:C.accentLt,border:`1px solid ${C.accentBd}`,
            borderRadius:C.radius,padding:'12px 16px',
            display:'flex',alignItems:'center',gap:12 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill={C.accent}/>
              <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize:12,color:C.text }}>
              <strong>{examName}</strong> ·{' '}
              <span style={{ fontFamily:'monospace',color:C.accent,fontWeight:700 }}>{qbsCode}</span>
              {selectedReq&&<span style={{ color:'#059669',fontSize:11 }}> · Linked to request #{selectedReq.id}</span>}
            </div>
            <button onClick={()=>setStep(0)}
              style={{ marginLeft:'auto',fontSize:11,color:C.accent,background:'none',
                border:`1px solid ${C.accentBd}`,borderRadius:6,padding:'4px 10px',cursor:'pointer' }}>
              Edit
            </button>
          </div>

          <div>
            <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>
              What is this Question Bank for?
            </div>
            <div style={{ fontSize:12,color:C.text3,marginBottom:16 }}>
              This determines how questions are categorized, stored, and shown in the Create Exam page.
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
              {Object.entries(PURPOSE_THEMES).map(([key,theme])=>{
                const active = examPurpose===key;
                return (
                  <div key={key} onClick={()=>setExamPurpose(key)}
                    style={{ padding:'20px 18px',borderRadius:12,cursor:'pointer',
                      border:`2px solid ${active?theme.color:'#e2e8f0'}`,
                      background:active?theme.bg:'#fff',
                      transition:'all 0.2s',
                      boxShadow:active?`0 4px 16px ${theme.color}22`:'none',
                      textAlign:'center' }}>
                    <div style={{ fontSize:32,marginBottom:10 }}>{theme.icon}</div>
                    <div style={{ fontSize:13,fontWeight:700,
                      color:active?theme.color:C.text,marginBottom:6 }}>{theme.label}</div>
                    <div style={{ fontSize:11,color:active?theme.color+'cc':C.text3,lineHeight:1.5 }}>
                      {theme.desc}
                    </div>
                    {active&&(
                      <div style={{ marginTop:10,display:'inline-flex',alignItems:'center',gap:5,
                        background:theme.color,color:'#fff',
                        padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700 }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Selected
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
            <button onClick={()=>setStep(0)}
              style={{ padding:'10px 20px',borderRadius:8,border:'1.5px solid #e2e8f0',
                background:'#fff',fontSize:13,fontWeight:600,color:C.text2,cursor:'pointer' }}>
              ← Back
            </button>
            <button onClick={()=>setStep(2)} disabled={!canProceedStep1}
              style={{ padding:'11px 28px',borderRadius:8,fontSize:14,fontWeight:700,
                background:canProceedStep1?'linear-gradient(135deg,#7055C8,#C060C0)':'#e2e8f0',
                color:canProceedStep1?'#fff':'#94a3b8',border:'none',
                cursor:canProceedStep1?'pointer':'not-allowed',
                boxShadow:canProceedStep1?'0 2px 12px rgba(112,85,200,0.3)':'none' }}>
              Next: Configure Questions →
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 2 — Configure agents
      ════════════════════════════════════════════════════ */}
      {step===2&&(
        <div style={{ display:'grid',gap:14 }}>
          {/* Summary banner */}
          <div style={{ background:'#fff',border:`1px solid ${C.border}`,
            borderRadius:C.radius,padding:'12px 16px',
            display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontSize:20 }}>{PURPOSE_THEMES[examPurpose]?.icon}</span>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{examName}</div>
                <div style={{ fontSize:11,color:C.text3,marginTop:1 }}>
                  <span style={{ fontFamily:'monospace',color:C.accent,fontWeight:700 }}>{qbsCode}</span>
                  {' · '}{PURPOSE_THEMES[examPurpose]?.label}
                  {selectedReq&&<span style={{ color:'#059669' }}> · Req #{selectedReq.id}</span>}
                </div>
              </div>
            </div>
            <button onClick={()=>setStep(0)}
              style={{ marginLeft:'auto',fontSize:11,color:C.accent,background:'none',
                border:`1px solid ${C.accentBd}`,borderRadius:6,padding:'4px 10px',cursor:'pointer' }}>
              Edit Identity
            </button>
          </div>

          {/* Difficulty */}
          <div style={{ background:'#fff',border:`1px solid ${C.border}`,borderRadius:C.radius,padding:'14px 18px' }}>
            <div style={{ fontSize:10,fontWeight:700,color:C.text3,letterSpacing:'0.06em',
              textTransform:'uppercase',marginBottom:10 }}>
              Difficulty Level
            </div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {DIFFICULTIES.map(d=>(
                <button key={d} onClick={()=>setDiff(d)}
                  style={{ padding:'6px 16px',borderRadius:99,fontSize:12,
                    background:difficulty===d?C.accent:'#fff',
                    border:`1px solid ${difficulty===d?C.accent:'#e2e8f0'}`,
                    color:difficulty===d?'#fff':C.text2,
                    fontWeight:difficulty===d?700:400,
                    cursor:'pointer',transition:'all 0.15s',textTransform:'capitalize' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Agent section label */}
          <div style={{ fontSize:10,fontWeight:700,color:C.text3,
            letterSpacing:'0.08em',textTransform:'uppercase' }}>
            Agents &amp; Topics — set question count per topic using + / −
          </div>

          {/* Agent boxes */}
          <div style={{ display:'grid',gap:8 }}>
            {AGENTS.map(agent=>(
              <AgentBox key={agent.key}
                agentKey={agent.key} name={agent.name}
                topicsMap={agentTopicMaps[agent.key]}
                onTopicsChange={map=>setMaps(prev=>({...prev,[agent.key]:map}))}
                enabled={enabled[agent.key]}
                onToggle={()=>setEnabled(prev=>({...prev,[agent.key]:!prev[agent.key]}))}
                platform={agent.key==='coding'?codingPlatform:null}
                onPlatformChange={agent.key==='coding'?setPlatform:null}/>
            ))}
          </div>

          {activeAgents.length>0&&!allHaveTopics&&(
            <div style={{ padding:'9px 14px',background:'#fffbeb',border:'1px solid #fcd34d',
              borderRadius:7,fontSize:12.5,color:'#92400e',
              display:'flex',alignItems:'center',gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 12H1L7 1Z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7 5.5V8M7 10V10.1" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Every enabled agent needs at least one topic.
            </div>
          )}

          {/* Summary + Generate */}
          <div style={{ background:'#fff',border:`1px solid ${C.border}`,borderRadius:C.radius,
            padding:'18px 22px',display:'flex',alignItems:'center',
            justifyContent:'space-between',flexWrap:'wrap',gap:16,
            boxShadow:'0 2px 8px rgba(112,85,200,0.08)' }}>
            <div style={{ display:'flex',gap:24 }}>
              {[
                {label:'Agents',   value:activeAgents.length},
                {label:'Topics',   value:totalTopics},
                {label:'Est. Qs',  value:totalEst},
              ].map(({label,value})=>(
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24,fontWeight:800,color:C.accent,letterSpacing:'-0.02em' }}>{value}</div>
                  <div style={{ fontSize:11,color:C.text3,marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:10,alignItems:'center' }}>
              <button onClick={()=>setStep(1)}
                style={{ padding:'10px 18px',borderRadius:8,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:13,fontWeight:600,color:C.text2,cursor:'pointer' }}>
                ← Back
              </button>
              <button onClick={handleGenerate} disabled={!canGenerate}
                style={{ padding:'11px 28px',borderRadius:8,fontSize:14,fontWeight:700,
                  background:canGenerate?'linear-gradient(135deg,#7055C8,#C060C0)':'#e2e8f0',
                  color:canGenerate?'#fff':'#94a3b8',border:'none',
                  cursor:canGenerate?'pointer':'not-allowed',
                  boxShadow:canGenerate?'0 2px 12px rgba(112,85,200,0.3)':'none',
                  transition:'all 0.2s' }}>
                Generate Questions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}