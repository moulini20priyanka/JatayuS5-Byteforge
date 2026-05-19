// src/components/QuizForge/ConfigurePanel.jsx
// v3 CHANGES:
//   • When difficulty === 'mixed', each agent box shows Easy/Medium/Hard steppers
//     per topic (replaces single count). All agents: MCQ, SQL, Aptitude, Verbal, Coding.
//   • Mixed counts passed through agentTopics payload as mixedCounts per topic.
//   • Theory agent unchanged — already has its own mark distribution UI.

import React, { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';

function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const C = {
  accent:     '#7055C8',
  accentLt:   'rgba(112,85,200,0.08)',
  accentBd:   'rgba(112,85,200,0.25)',
  text:       '#1a1060',
  text2:      '#4b5563',
  text3:      '#94a3b8',
  border:     '#e8e4f8',
  borderSoft: '#e2e8f0',
  radius:     '10px',
};

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

const AGENT_THEMES = {
  mcq:      { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Multiple Choice'        },
  sql:      { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', label:'Database & Queries'     },
  coding:   { color:'#d97706', bg:'#fffbeb', border:'#fcd34d', label:'Programming Problems'   },
  aptitude: { color:'#0891b2', bg:'#f0f9ff', border:'#bae6fd', label:'Quantitative Reasoning' },
  verbal:   { color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8', label:'Language Ability'       },
  theory:   { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Theory & Descriptive'   },
};

const AGENTS = [
  { key:'mcq',      name:'MCQ Generator',      universityOnly:false, hiringOnly:false },
  { key:'sql',      name:'SQL Generator',      universityOnly:false, hiringOnly:true  },
  { key:'coding',   name:'Coding Generator',   universityOnly:false, hiringOnly:true  },
  { key:'aptitude', name:'Aptitude Generator', universityOnly:false, hiringOnly:true  },
  { key:'verbal',   name:'Verbal Generator',   universityOnly:false, hiringOnly:true  },
  { key:'theory',   name:'Theory Generator',   universityOnly:true,  hiringOnly:false },
];

const DIFFICULTIES     = ['easy', 'medium', 'hard', 'mixed'];
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
  mcq:      'e.g. OOP Concepts, React Hooks, Data Structures',
  sql:      'e.g. Joins, Indexes, Subqueries, Aggregations',
  coding:   'e.g. Binary Trees, Graph BFS, Dynamic Programming',
  aptitude: 'e.g. Percentages, Number Series, Syllogisms',
  verbal:   'e.g. Vocabulary, Para Jumbles, Sentence Completion',
  theory:   'e.g. Operating Systems, Computer Networks, DBMS, OOP',
};

// Default mixed counts per topic for each agent
const DEFAULT_MIXED = { easy: 3, medium: 5, hard: 2 };

// Theory mark distribution defaults
const DEFAULT_MARK_DIST = { two: 2, five: 2, eight: 1 };

function genQBSCode() {
  return 'QBS-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ── Mixed Difficulty Stepper (per-topic) ──────────────────────────────────────
function MixedStepper({ value, onChange, diffColor, label }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{
        fontSize:9, fontWeight:700, color:diffColor,
        background:`${diffColor}18`, border:`1px solid ${diffColor}44`,
        padding:'1px 7px', borderRadius:99, whiteSpace:'nowrap',
      }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          style={{
            width:22, height:22, borderRadius:4, border:`1px solid ${diffColor}55`,
            background:'#fff', color:diffColor, fontSize:14, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
          }}>−</button>
        <input
          type="number" min={0} max={99} value={value}
          onChange={e => onChange(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
          style={{
            width:36, textAlign:'center', border:`1px solid ${diffColor}55`,
            borderRadius:4, padding:'2px 3px', fontSize:12, fontWeight:700,
            color:diffColor, outline:'none',
          }} />
        <button
          onClick={() => onChange(Math.min(99, value + 1))}
          style={{
            width:22, height:22, borderRadius:4, border:`1px solid ${diffColor}55`,
            background:'#fff', color:diffColor, fontSize:14, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
          }}>+</button>
      </div>
    </div>
  );
}

// ── Mixed counts summary pill ─────────────────────────────────────────────────
function MixedSummaryPill({ counts }) {
  const total = (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
  return (
    <span style={{
      fontSize:10, fontWeight:700,
      background:'#f8fafc', border:'1px solid #e2e8f0',
      padding:'2px 9px', borderRadius:99, color:'#64748b',
      display:'inline-flex', alignItems:'center', gap:5,
    }}>
      <span style={{ color:'#059669' }}>{counts.easy || 0}E</span>
      <span style={{ color:'#d97706' }}>{counts.medium || 0}M</span>
      <span style={{ color:'#dc2626' }}>{counts.hard || 0}H</span>
      <span style={{ color:'#94a3b8', fontSize:9 }}>= {total} Qs</span>
    </span>
  );
}

// ── Topic Row — flat count (non-mixed) ────────────────────────────────────────
function TopicRow({ topic, count, color, border, onCount, onRemove }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      background:'#fff', border:`1px solid ${border}`,
      borderRadius:7, padding:'6px 10px',
    }}>
      <span style={{ flex:1, fontSize:12.5, color, fontWeight:500 }}>{topic}</span>
      <button onClick={() => onCount(Math.max(1, count - 1))}
        style={{
          width:24, height:24, borderRadius:4, border:`1px solid ${border}`,
          background:'#fff', color, fontSize:15, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
        }}>−</button>
      <input type="number" min={1} max={200} value={count}
        onChange={e => onCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
        style={{
          width:48, textAlign:'center', border:`1px solid ${border}`,
          borderRadius:4, padding:'3px 4px', fontSize:12, fontWeight:700,
          color, outline:'none',
        }} />
      <button onClick={() => onCount(Math.min(200, count + 1))}
        style={{
          width:24, height:24, borderRadius:4, border:`1px solid ${border}`,
          background:'#fff', color, fontSize:15, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
        }}>+</button>
      <span style={{ fontSize:10, color:'#94a3b8', minWidth:16 }}>Qs</span>
      <button onClick={onRemove}
        style={{
          background:'none', border:'none', cursor:'pointer', color:'#94a3b8',
          display:'flex', alignItems:'center', padding:0, marginLeft:2,
        }}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Topic Row — mixed difficulty mode ─────────────────────────────────────────
function MixedTopicRow({ topic, mixedCounts, color, border, onMixedChange, onRemove }) {
  const { easy = 3, medium = 5, hard = 2 } = mixedCounts;
  const total = easy + medium + hard;

  return (
    <div style={{
      background:'#fff', border:`1px solid ${border}`,
      borderRadius:8, padding:'10px 12px',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ flex:1, fontSize:12.5, color, fontWeight:600 }}>{topic}</span>
        <MixedSummaryPill counts={{ easy, medium, hard }} />
        <button onClick={onRemove}
          style={{
            background:'none', border:'none', cursor:'pointer', color:'#94a3b8',
            display:'flex', alignItems:'center', padding:0,
          }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Difficulty steppers */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>
        <MixedStepper
          label="Easy"   value={easy}
          diffColor="#059669"
          onChange={v => onMixedChange({ easy:v, medium, hard })}
        />
        <MixedStepper
          label="Medium" value={medium}
          diffColor="#d97706"
          onChange={v => onMixedChange({ easy, medium:v, hard })}
        />
        <MixedStepper
          label="Hard"   value={hard}
          diffColor="#dc2626"
          onChange={v => onMixedChange({ easy, medium, hard:v })}
        />
        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
          <span style={{ fontSize:11, color:'#94a3b8' }}>= {total} questions</span>
        </div>
      </div>

      {total === 0 && (
        <div style={{ marginTop:8, fontSize:11, color:'#dc2626' }}>
          ⚠ Set at least one question count for this topic.
        </div>
      )}
    </div>
  );
}

// ── Theory Topic Row ───────────────────────────────────────────────────────────
function TheoryTopicRow({ topic, distribution, color, border, onDistChange, onRemove }) {
  const { two = 2, five = 2, eight = 1 } = distribution;
  const total = two + five + eight;

  function Stepper({ label, value, onChange, markColor }) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
        <span style={{
          fontSize:9, fontWeight:700, color:markColor,
          background:`${markColor}18`, border:`1px solid ${markColor}44`,
          padding:'1px 7px', borderRadius:99, whiteSpace:'nowrap',
        }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={() => onChange(Math.max(0, value - 1))}
            style={{
              width:20, height:20, borderRadius:4, border:`1px solid ${border}`,
              background:'#fff', color, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
            }}>−</button>
          <input type="number" min={0} max={20} value={value}
            onChange={e => onChange(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
            style={{
              width:32, textAlign:'center', border:`1px solid ${border}`,
              borderRadius:4, padding:'2px 3px', fontSize:12, fontWeight:700,
              color, outline:'none',
            }} />
          <button onClick={() => onChange(value + 1)}
            style={{
              width:20, height:20, borderRadius:4, border:`1px solid ${border}`,
              background:'#fff', color, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
            }}>+</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background:'#fff', border:`1px solid ${border}`,
      borderRadius:8, padding:'10px 12px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ flex:1, fontSize:12.5, color, fontWeight:600 }}>{topic}</span>
        <span style={{
          fontSize:10, fontWeight:700, color:'#2563eb',
          background:'#eff6ff', border:'1px solid #bfdbfe',
          padding:'2px 8px', borderRadius:99,
        }}>{total} Qs total</span>
        <button onClick={onRemove}
          style={{
            background:'none', border:'none', cursor:'pointer', color:'#94a3b8',
            display:'flex', alignItems:'center', padding:0,
          }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div style={{ display:'flex', gap:14, justifyContent:'flex-start', flexWrap:'wrap' }}>
        <Stepper label="2-Mark" value={two}   onChange={v => onDistChange({ two:v, five, eight })} markColor="#059669" />
        <Stepper label="5-Mark" value={five}  onChange={v => onDistChange({ two, five:v, eight })} markColor="#2563eb" />
        <Stepper label="8-Mark" value={eight} onChange={v => onDistChange({ two, five, eight:v })} markColor="#7c3aed" />
      </div>
      {total === 0 && (
        <div style={{ marginTop:8, fontSize:11, color:'#dc2626' }}>
          ⚠ Set at least one question count for this topic.
        </div>
      )}
    </div>
  );
}

// ── Standard Agent Box ─────────────────────────────────────────────────────────
function AgentBox({
  agentKey, name, topicsMap, mixedMap,
  onTopicsChange, onMixedChange,
  enabled, onToggle,
  platform, onPlatformChange,
  isMixed,
}) {
  const [input,  setInput]  = useState('');
  const [custom, setCustom] = useState('');
  const th = AGENT_THEMES[agentKey];

  const topics = Object.keys(topicsMap);

  // Total questions calculation depends on mode
  const totalQ = isMixed
    ? topics.reduce((s, t) => {
        const mc = mixedMap[t] || DEFAULT_MIXED;
        return s + (mc.easy || 0) + (mc.medium || 0) + (mc.hard || 0);
      }, 0)
    : Object.values(topicsMap).reduce((s, c) => s + c, 0);

  function add() {
    const t = input.trim();
    if (t && !(t in topicsMap)) {
      onTopicsChange({ ...topicsMap, [t]: 5 });
      onMixedChange({ ...mixedMap, [t]: { ...DEFAULT_MIXED } });
      setInput('');
    }
  }

  function remove(t) {
    const newMap  = { ...topicsMap };
    const newMixed = { ...mixedMap };
    delete newMap[t];
    delete newMixed[t];
    onTopicsChange(newMap);
    onMixedChange(newMixed);
  }

  function updCount(t, c) {
    onTopicsChange({ ...topicsMap, [t]: c });
  }

  function updMixed(t, mc) {
    onMixedChange({ ...mixedMap, [t]: mc });
  }

  return (
    <div style={{
      border:`1.5px solid ${enabled ? th.border : '#e2e8f0'}`,
      borderRadius:C.radius,
      background: enabled ? th.bg + '44' : '#fafafa',
      overflow:'hidden', transition:'all 0.2s',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'13px 18px', cursor:'pointer', userSelect:'none',
      }} onClick={onToggle}>
        <div style={{
          width:18, height:18, borderRadius:4, flexShrink:0,
          border:`2px solid ${enabled ? th.color : '#cbd5e1'}`,
          background: enabled ? th.color : 'transparent',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.15s',
        }}>
          {enabled && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13.5, color: enabled ? th.color : C.text }}>{name}</div>
          <div style={{ fontSize:11.5, color:C.text3, marginTop:1 }}>{th.label}</div>
        </div>
        {topics.length > 0 && (
          <span style={{
            padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700,
            background: enabled ? th.bg : '#f1f5f9',
            border:`1px solid ${enabled ? th.border : '#e2e8f0'}`,
            color: enabled ? th.color : C.text3,
          }}>
            {topics.length} topic{topics.length !== 1 ? 's' : ''} · {totalQ} Qs
          </span>
        )}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
          style={{ transform: enabled ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
          <path d="M3 5.5L7.5 10L12 5.5" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Body */}
      {enabled && (
        <div style={{ padding:'0 18px 18px', borderTop:`1px solid ${th.border}` }}>

          {/* Coding platform selector */}
          {agentKey === 'coding' && (
            <div style={{ marginTop:12, marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>
                Platform
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {CODING_PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => onPlatformChange(p.id)}
                    style={{
                      padding:'4px 11px', borderRadius:99, fontSize:11.5, cursor:'pointer',
                      fontWeight: platform === p.id ? 700 : 400,
                      background: platform === p.id ? th.color : '#fff',
                      border:`1px solid ${platform === p.id ? th.color : '#e2e8f0'}`,
                      color: platform === p.id ? '#fff' : C.text2,
                      transition:'all 0.15s',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={custom} onChange={e => setCustom(e.target.value)}
                  placeholder="Or type custom platform…"
                  style={{ flex:1, padding:'6px 11px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, outline:'none' }} />
                <button onClick={() => { if (custom.trim()) { onPlatformChange(custom.trim()); setCustom(''); } }}
                  style={{
                    padding:'6px 12px', borderRadius:7, border:`1px solid ${th.border}`,
                    background:th.bg, color:th.color, fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>Use</button>
              </div>
            </div>
          )}

          {/* Mixed mode info banner */}
          {isMixed && (
            <div style={{
              marginTop:12, marginBottom:10,
              padding:'9px 13px',
              background:'#fafafa', border:'1px solid #e2e8f0',
              borderRadius:7, fontSize:11.5, color:'#64748b',
              display:'flex', gap:8, alignItems:'center',
            }}>
            
              <span>
                <strong style={{ color:'#334155' }}>Mixed mode:</strong>{' '}
                Set <span style={{ color:'#059669', fontWeight:700 }}>Easy</span>,{' '}
                <span style={{ color:'#d97706', fontWeight:700 }}>Medium</span>, and{' '}
                <span style={{ color:'#dc2626', fontWeight:700 }}>Hard</span>{' '}
                question counts per topic.
              </span>
            </div>
          )}

          {/* Add topic input */}
          <div style={{ display:'flex', gap:8, marginTop: agentKey === 'coding' ? 0 : 12, marginBottom:8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={PLACEHOLDERS[agentKey]}
              style={{
                flex:1, padding:'8px 13px', border:'1px solid #e2e8f0',
                borderRadius:7, fontSize:13, outline:'none', background:'#fff',
              }}
              onFocus={e => e.target.style.borderColor = th.color}
              onBlur={e =>  e.target.style.borderColor = '#e2e8f0'} />
            <button onClick={add}
              style={{
                padding:'8px 16px', borderRadius:7, background:th.color,
                color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>Add</button>
          </div>

          {/* Topic rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topics.length === 0 && (
              <span style={{ fontSize:12, color:C.text3 }}>
                {isMixed
                  ? 'Add topics above — set Easy / Medium / Hard counts per topic.'
                  : 'Add topics above — set question count per topic with + / −'}
              </span>
            )}
            {topics.map(topic => isMixed ? (
              <MixedTopicRow
                key={topic}
                topic={topic}
                mixedCounts={mixedMap[topic] || DEFAULT_MIXED}
                color={th.color}
                border={th.border}
                onMixedChange={mc => updMixed(topic, mc)}
                onRemove={() => remove(topic)}
              />
            ) : (
              <TopicRow
                key={topic}
                topic={topic}
                count={topicsMap[topic] || 5}
                color={th.color}
                border={th.border}
                onCount={c => updCount(topic, c)}
                onRemove={() => remove(topic)}
              />
            ))}
          </div>

          {/* Agent totals footer */}
          {topics.length > 0 && (
            <div style={{ marginTop:8, fontSize:11, color:C.text3, textAlign:'right' }}>
              {isMixed ? (
                <>
                  This agent:{' '}
                  <span style={{ color:'#059669', fontWeight:700 }}>
                    {topics.reduce((s, t) => s + ((mixedMap[t] || DEFAULT_MIXED).easy || 0), 0)}E
                  </span>{' '}
                  <span style={{ color:'#d97706', fontWeight:700 }}>
                    {topics.reduce((s, t) => s + ((mixedMap[t] || DEFAULT_MIXED).medium || 0), 0)}M
                  </span>{' '}
                  <span style={{ color:'#dc2626', fontWeight:700 }}>
                    {topics.reduce((s, t) => s + ((mixedMap[t] || DEFAULT_MIXED).hard || 0), 0)}H
                  </span>{' '}
                  = <strong style={{ color:th.color }}>{totalQ} questions total</strong>
                </>
              ) : (
                <>This agent: <strong style={{ color:th.color }}>{totalQ} questions total</strong></>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Theory Agent Box ───────────────────────────────────────────────────────────
function TheoryAgentBox({ topicsMap, distributionMap, onTopicsChange, onDistChange, enabled, onToggle }) {
  const [input, setInput] = useState('');
  const th = AGENT_THEMES.theory;

  const topics = Object.keys(topicsMap);
  const totalQ = Object.entries(distributionMap).reduce((s, [, d]) => {
    return s + ((d.two || 0) + (d.five || 0) + (d.eight || 0));
  }, 0);

  function add() {
    const t = input.trim();
    if (t && !topics.includes(t)) {
      onTopicsChange({ ...topicsMap, [t]: 1 });
      onDistChange({ ...distributionMap, [t]: { ...DEFAULT_MARK_DIST } });
      setInput('');
    }
  }

  function remove(t) {
    const newMap  = { ...topicsMap };
    const newDist = { ...distributionMap };
    delete newMap[t];
    delete newDist[t];
    onTopicsChange(newMap);
    onDistChange(newDist);
  }

  return (
    <div style={{
      border:`1.5px solid ${enabled ? th.border : '#e2e8f0'}`,
      borderRadius:C.radius,
      background: enabled ? th.bg + '33' : '#fafafa',
      overflow:'hidden', transition:'all 0.2s',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'13px 18px', cursor:'pointer', userSelect:'none',
      }} onClick={onToggle}>
        <div style={{
          width:18, height:18, borderRadius:4, flexShrink:0,
          border:`2px solid ${enabled ? th.color : '#cbd5e1'}`,
          background: enabled ? th.color : 'transparent',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.15s',
        }}>
          {enabled && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13.5, color: enabled ? th.color : C.text }}>
            📝 Theory Generator
          </div>
          <div style={{ fontSize:11.5, color:C.text3, marginTop:1 }}>
            {th.label} — 2-mark · 5-mark · 8-mark questions
          </div>
        </div>
        {topics.length > 0 && (
          <span style={{
            padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700,
            background: enabled ? th.bg : '#f1f5f9',
            border:`1px solid ${enabled ? th.border : '#e2e8f0'}`,
            color: enabled ? th.color : C.text3,
          }}>
            {topics.length} subject{topics.length !== 1 ? 's' : ''} · {totalQ} Qs
          </span>
        )}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
          style={{ transform: enabled ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
          <path d="M3 5.5L7.5 10L12 5.5" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {enabled && (
        <div style={{ padding:'0 18px 18px', borderTop:`1px solid ${th.border}` }}>
          <div style={{
            marginTop:14, marginBottom:14,
            padding:'10px 14px',
            background:'#eff6ff', border:'1px solid #bfdbfe',
            borderRadius:8, fontSize:11.5, color:'#1d4ed8',
            display:'flex', gap:8, alignItems:'flex-start',
          }}>
            <span style={{ fontSize:15 }}>💡</span>
            <div>
              Set <strong>subjects/topics</strong> then configure how many{' '}
              <strong>2-mark</strong>, <strong>5-mark</strong>, and <strong>8-mark</strong>{' '}
              questions to generate per subject. Key points (marking rubric) are stored and
              used by AI to auto-score answers at exam time.
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {[
              { label:'2-Mark', desc:'Short answer / definition', color:'#059669', bg:'#ecfdf5', bd:'#a7f3d0' },
              { label:'5-Mark', desc:'Explanation with example',  color:'#2563eb', bg:'#eff6ff', bd:'#bfdbfe' },
              { label:'8-Mark', desc:'Detailed / diagram answer', color:'#7c3aed', bg:'#f5f3ff', bd:'#ddd6fe' },
            ].map(m => (
              <div key={m.label} style={{
                padding:'6px 12px', borderRadius:8,
                background:m.bg, border:`1px solid ${m.bd}`,
                fontSize:11, color:m.color,
              }}>
                <strong>{m.label}</strong> — {m.desc}
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={PLACEHOLDERS.theory}
              style={{
                flex:1, padding:'8px 13px', border:'1px solid #e2e8f0',
                borderRadius:7, fontSize:13, outline:'none', background:'#fff',
              }}
              onFocus={e => e.target.style.borderColor = th.color}
              onBlur={e =>  e.target.style.borderColor = '#e2e8f0'} />
            <button onClick={add}
              style={{
                padding:'8px 16px', borderRadius:7, background:th.color,
                color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>Add</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topics.length === 0 && (
              <span style={{ fontSize:12, color:C.text3 }}>
                Add a subject above (e.g. "Computer Networks", "DBMS") then set question counts per mark type.
              </span>
            )}
            {topics.map(topic => (
              <TheoryTopicRow
                key={topic}
                topic={topic}
                distribution={distributionMap[topic] || DEFAULT_MARK_DIST}
                color={th.color}
                border={th.border}
                onDistChange={dist => onDistChange({ ...distributionMap, [topic]: dist })}
                onRemove={() => remove(topic)}
              />
            ))}
          </div>

          {topics.length > 0 && (
            <div style={{ marginTop:10, fontSize:11, color:C.text3, textAlign:'right' }}>
              Theory total: <strong style={{ color:th.color }}>{totalQ} questions</strong>
              {' · '}
              {Object.entries(
                Object.values(distributionMap).reduce(
                  (acc, d) => ({
                    two:   acc.two   + (d.two   || 0),
                    five:  acc.five  + (d.five  || 0),
                    eight: acc.eight + (d.eight || 0),
                  }),
                  { two:0, five:0, eight:0 }
                )
              ).filter(([,v]) => v > 0).map(([k,v]) =>
                `${v} × ${k === 'two' ? '2m' : k === 'five' ? '5m' : '8m'}`
              ).join(' · ')}
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
  const [step, setStep] = useState(0);

  // Step 0
  const [approvedRequests, setApprovedReqs] = useState([]);
  const [loadingReqs,      setLoadingReqs]  = useState(true);
  const [selectedReq,      setSelectedReq]  = useState(null);
  const [examName,         setExamName]     = useState('');
  const [qbsCode,          setQBSCode]      = useState(genQBSCode);

  // Step 1
  const [examPurpose, setExamPurpose] = useState('');

  // Step 2
  const [enabled,        setEnabled]  = useState({ mcq:true, sql:true, coding:true, aptitude:false, verbal:false, theory:false });
  const [agentTopicMaps, setMaps]     = useState({ mcq:{}, sql:{}, coding:{}, aptitude:{}, verbal:{}, theory:{} });
  // Per-agent mixed counts: { [agentKey]: { [topic]: { easy, medium, hard } } }
  const [agentMixedMaps, setMixedMaps]= useState({ mcq:{}, sql:{}, coding:{}, aptitude:{}, verbal:{} });
  const [codingPlatform, setPlatform] = useState('leetcode');
  const [difficulty,     setDiff]     = useState('mixed');

  // Theory
  const [theoryDistMap, setTheoryDistMap] = useState({});

  const isMixed = difficulty === 'mixed';

  useEffect(() => {
    fetch(`${API}/api/question-bank/exam-names`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setApprovedReqs(d.approvedRequests || []); setLoadingReqs(false); })
      .catch(() => setLoadingReqs(false));
  }, []);

  function selectRequest(req) {
    setSelectedReq(req);
    setExamName(req.title || `${req.jobRole} — ${req.companyName}`);
    if (!examPurpose) setExamPurpose('hiring');
  }

  useEffect(() => {
    if (examPurpose === 'university') {
      setEnabled({ mcq:true, sql:false, coding:false, aptitude:false, verbal:false, theory:true });
    } else if (examPurpose === 'hiring') {
      setEnabled({ mcq:true, sql:true, coding:true, aptitude:false, verbal:false, theory:false });
    } else if (examPurpose === 'certification') {
      setEnabled({ mcq:true, sql:false, coding:false, aptitude:true, verbal:false, theory:false });
    }
  }, [examPurpose]);

  const visibleAgents = AGENTS.filter(a => {
    if (examPurpose === 'university') return !a.hiringOnly;
    return !a.universityOnly;
  });

  const activeAgents = visibleAgents.filter(a => enabled[a.key]);

  function agentHasTopics(a) {
    if (a.key === 'theory') return Object.keys(agentTopicMaps.theory).length > 0;
    return Object.keys(agentTopicMaps[a.key]).length > 0;
  }
  const allHaveTopics = activeAgents.every(agentHasTopics);

  function agentTotalQ(a) {
    if (a.key === 'theory') {
      return Object.values(theoryDistMap).reduce((s, d) => s + (d.two || 0) + (d.five || 0) + (d.eight || 0), 0);
    }
    if (isMixed) {
      return Object.values(agentMixedMaps[a.key] || {}).reduce((s, mc) => {
        return s + (mc.easy || 0) + (mc.medium || 0) + (mc.hard || 0);
      }, 0);
    }
    return Object.values(agentTopicMaps[a.key]).reduce((s, c) => s + c, 0);
  }

  const totalTopics = activeAgents.reduce((s, a) => s + Object.keys(agentTopicMaps[a.key]).length, 0);
  const totalEst    = activeAgents.reduce((s, a) => s + agentTotalQ(a), 0);

  const canProceedStep0 = examName.trim().length > 0 && qbsCode.trim().length > 0;
  const canProceedStep1 = examPurpose.length > 0;
  const canGenerate     = activeAgents.length > 0 && allHaveTopics;

  function handleGenerate() {
    if (!canGenerate) return;

    const agentTopics = {};

    for (const a of activeAgents) {
      if (a.key === 'theory') {
        const topics = Object.keys(agentTopicMaps.theory);
        if (topics.length === 0) continue;
        const questionCounts = {};
        for (const t of topics) {
          const d = theoryDistMap[t] || DEFAULT_MARK_DIST;
          questionCounts[t] = (d.two || 0) + (d.five || 0) + (d.eight || 0);
        }
        agentTopics.theory = {
          topics,
          questionCounts,
          markDistribution: theoryDistMap,
        };
        continue;
      }

      const map    = agentTopicMaps[a.key];
      const topics = Object.keys(map);
      if (topics.length === 0) continue;

      if (isMixed) {
        // Pass mixedCounts per topic — agents will split by difficulty
        const mixedCounts = {};
        for (const t of topics) {
          mixedCounts[t] = agentMixedMaps[a.key]?.[t] || DEFAULT_MIXED;
        }
        // questionCounts = total per topic (for orchestrator count reference)
        const questionCounts = {};
        for (const t of topics) {
          const mc = mixedCounts[t];
          questionCounts[t] = (mc.easy || 0) + (mc.medium || 0) + (mc.hard || 0);
        }

        if (a.key === 'coding') {
          agentTopics[a.key] = { topics, platform: codingPlatform, questionCounts, mixedCounts };
        } else {
          agentTopics[a.key] = { topics, questionCounts, mixedCounts };
        }
      } else {
        if (a.key === 'coding') {
          agentTopics[a.key] = { topics, platform: codingPlatform, questionCounts: map };
        } else {
          agentTopics[a.key] = { topics, questionCounts: map };
        }
      }
    }

    onStart({
      agentTopics,
      agentTopicMaps,
      agentMixedMaps,
      theoryDistMap,
      difficulty,
      examName:      examName.trim(),
      sessionCode:   qbsCode.trim(),
      examType:      examPurpose,
      examRequestId: selectedReq?.id || null,
      isUniversity:  examPurpose === 'university',
    });
  }

  const btnPrimary = (en) => ({
    padding:'11px 28px', borderRadius:8, fontSize:14, fontWeight:700,
    background: en ? 'linear-gradient(135deg,#7055C8,#C060C0)' : '#e2e8f0',
    color: en ? '#fff' : '#94a3b8', border:'none',
    cursor: en ? 'pointer' : 'not-allowed',
    boxShadow: en ? '0 2px 12px rgba(112,85,200,0.3)' : 'none',
    transition:'all 0.2s',
  });

  return (
    <div style={{ maxWidth:840, margin:'0 auto', padding:'32px 4px' }}>

      {/* Header + Step indicator */}
      <div style={{ marginBottom:24 }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:C.accentLt, border:`1px solid ${C.accentBd}`,
          borderRadius:99, padding:'4px 14px', marginBottom:10,
        }}>
          <svg width="12" height="12" viewBox="0 0 15 15" fill={C.accent}>
            <path d="M7.5 1L9.18 5.41L14 5.41L10.16 8.09L11.84 12.5L7.5 9.82L3.16 12.5L4.84 8.09L1 5.41L5.82 5.41L7.5 1Z"/>
          </svg>
          <span style={{ fontSize:10.5, color:C.accent, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>
            NeuroGenerate AI — Question Bank Setup
          </span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.text, letterSpacing:'-0.02em', margin:0 }}>
          Create Question Bank
        </h1>

        <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:16 }}>
          {[
            { n:1, label:'Exam Identity'        },
            { n:2, label:'Purpose'              },
            { n:3, label:'Configure & Generate' },
          ].map((s, i) => {
            const done   = step > i;
            const active = step === i;
            return (
              <React.Fragment key={s.n}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{
                    width:30, height:30, borderRadius:'50%',
                    background: done ? C.accent : active ? 'linear-gradient(135deg,#7055C8,#C060C0)' : '#f0ecfc',
                    border:`2px solid ${done || active ? C.accent : '#e8e4f8'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: active ? '0 0 0 4px rgba(112,85,200,0.15)' : 'none',
                    transition:'all 0.2s',
                  }}>
                    {done
                      ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{ fontSize:12, fontWeight:700, color: active ? '#fff' : '#c4b8e8' }}>{s.n}</span>
                    }
                  </div>
                  <span style={{
                    fontSize:10.5, fontWeight: active || done ? 700 : 400,
                    color: active || done ? C.accent : C.text3, whiteSpace:'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    flex:1, height:2, margin:'0 6px', marginBottom:18,
                    background: done ? C.accent : '#e8e4f8',
                    transition:'background 0.3s', maxWidth:120,
                  }}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── STEP 0 — Exam Identity ─────────────────────────────────── */}
      {step === 0 && (
        <div style={{ display:'grid', gap:16 }}>
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:C.radius, padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>
              Is this Question Bank for an approved recruiter exam request?
            </div>
            <div style={{ fontSize:12, color:C.text3, marginBottom:16 }}>
              If yes, select the request below. If no, enter the exam name manually.
            </div>

            {loadingReqs ? (
              <div style={{ fontSize:12, color:C.text3 }}>Loading approved requests…</div>
            ) : approvedRequests.length === 0 ? (
              <div style={{ padding:'14px 16px', background:'#faf9ff', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, color:C.text3 }}>
                No approved recruiter requests found. Enter exam name manually below.
              </div>
            ) : (
              <>
                <div style={{ display:'grid', gap:8, marginBottom:16 }}>
                  {approvedRequests.map(r => {
                    const active = selectedReq?.id === r.id;
                    return (
                      <div key={r.id} onClick={() => selectRequest(r)}
                        style={{
                          padding:'12px 16px', borderRadius:9, cursor:'pointer',
                          border:`1.5px solid ${active ? C.accent : '#e2e8f0'}`,
                          background: active ? C.accentLt : '#fff',
                          transition:'all 0.15s', display:'flex', alignItems:'center', gap:12,
                        }}>
                        <div style={{
                          width:18, height:18, borderRadius:'50%', flexShrink:0,
                          border:`2px solid ${active ? C.accent : '#cbd5e1'}`,
                          background: active ? C.accent : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {active && <div style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontWeight:600, fontSize:13, color: active ? C.accent : C.text,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>
                            {r.title || `${r.jobRole} — ${r.companyName}`}
                          </div>
                          <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                            {r.companyName && `${r.companyName} · `}
                            {r.college     && `${r.college} · `}
                            Batch {r.batchYear || '—'}
                          </div>
                        </div>
                        {active && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:C.accent, color:'#fff' }}>
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:'#e8e4f8' }}/>
                  <span style={{ fontSize:11, color:C.text3, whiteSpace:'nowrap' }}>or create new exam name</span>
                  <div style={{ flex:1, height:1, background:'#e8e4f8' }}/>
                </div>
              </>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.text2, marginBottom:5 }}>
                  Exam Name <span style={{ color:'#dc2626' }}>*</span>
                </label>
                <input value={examName} onChange={e => setExamName(e.target.value)}
                  placeholder="e.g. Computer Networks — Unit Test 2"
                  style={{
                    width:'100%', padding:'9px 12px',
                    border:`1.5px solid ${examName.trim() ? C.accent : '#e2e8f0'}`,
                    borderRadius:8, fontSize:13, outline:'none',
                    boxSizing:'border-box', fontFamily:'inherit',
                  }}
                  onFocus={e  => e.target.style.borderColor = C.accent}
                  onBlur={e   => e.target.style.borderColor = examName.trim() ? C.accent : '#e2e8f0'} />
                {!examName.trim() && (
                  <div style={{ fontSize:10.5, color:'#dc2626', marginTop:3 }}>Required</div>
                )}
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.text2, marginBottom:5 }}>
                  Question Bank ID <span style={{ fontSize:10, color:C.text3, fontWeight:400 }}>(auto-generated)</span>
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={qbsCode} onChange={e => setQBSCode(e.target.value.toUpperCase())}
                    style={{
                      flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0',
                      borderRadius:8, fontSize:13, fontFamily:'monospace', outline:'none',
                      boxSizing:'border-box', color:C.accent, fontWeight:700,
                    }} />
                  <button onClick={() => setQBSCode(genQBSCode())} title="Regenerate ID"
                    style={{
                      padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`,
                      background:'#fff', cursor:'pointer', display:'flex', alignItems:'center',
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize:10.5, color:C.text3, marginTop:3 }}>
                  This ID links all questions in this bank
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => setStep(1)} disabled={!canProceedStep0} style={btnPrimary(canProceedStep0)}>
              Next: Choose Purpose →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1 — Exam Purpose ──────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display:'grid', gap:16 }}>
          <div style={{
            background:C.accentLt, border:`1px solid ${C.accentBd}`,
            borderRadius:C.radius, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill={C.accent}/>
              <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize:12, color:C.text }}>
              <strong>{examName}</strong> ·{' '}
              <span style={{ fontFamily:'monospace', color:C.accent, fontWeight:700 }}>{qbsCode}</span>
              {selectedReq && <span style={{ color:'#059669', fontSize:11 }}> · Linked to request #{selectedReq.id}</span>}
            </div>
            <button onClick={() => setStep(0)}
              style={{
                marginLeft:'auto', fontSize:11, color:C.accent, background:'none',
                border:`1px solid ${C.accentBd}`, borderRadius:6, padding:'4px 10px', cursor:'pointer',
              }}>Edit</button>
          </div>

          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>
              What is this Question Bank for?
            </div>
            <div style={{ fontSize:12, color:C.text3, marginBottom:16 }}>
              This determines which agents are available and how questions are stored.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {Object.entries(PURPOSE_THEMES).map(([key, theme]) => {
                const active = examPurpose === key;
                return (
                  <div key={key} onClick={() => setExamPurpose(key)}
                    style={{
                      padding:'20px 18px', borderRadius:12, cursor:'pointer',
                      border:`2px solid ${active ? theme.color : '#e2e8f0'}`,
                      background: active ? theme.bg : '#fff',
                      transition:'all 0.2s',
                      boxShadow: active ? `0 4px 16px ${theme.color}22` : 'none',
                      textAlign:'center',
                    }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>{theme.icon}</div>
                    <div style={{ fontSize:13, fontWeight:700, color: active ? theme.color : C.text, marginBottom:6 }}>
                      {theme.label}
                    </div>
                    <div style={{ fontSize:11, color: active ? theme.color + 'cc' : C.text3, lineHeight:1.5 }}>
                      {theme.desc}
                    </div>
                    {key === 'university' && (
                      <div style={{
                        marginTop:10, display:'inline-flex', alignItems:'center', gap:4,
                        background: active ? theme.color : '#e2e8f0',
                        color: active ? '#fff' : '#64748b',
                        padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700,
                      }}>
                        📝 Theory Agent available
                      </div>
                    )}
                    {active && key !== 'university' && (
                      <div style={{
                        marginTop:10, display:'inline-flex', alignItems:'center', gap:5,
                        background:theme.color, color:'#fff',
                        padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700,
                      }}>
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

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={() => setStep(0)}
              style={{
                padding:'10px 20px', borderRadius:8, border:'1.5px solid #e2e8f0',
                background:'#fff', fontSize:13, fontWeight:600, color:C.text2, cursor:'pointer',
              }}>← Back</button>
            <button onClick={() => setStep(2)} disabled={!canProceedStep1} style={btnPrimary(canProceedStep1)}>
              Next: Configure Questions →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Configure agents ──────────────────────────────── */}
      {step === 2 && (
        <div style={{ display:'grid', gap:14 }}>
          {/* Summary banner */}
          <div style={{
            background:'#fff', border:`1px solid ${C.border}`,
            borderRadius:C.radius, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>{PURPOSE_THEMES[examPurpose]?.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{examName}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>
                  <span style={{ fontFamily:'monospace', color:C.accent, fontWeight:700 }}>{qbsCode}</span>
                  {' · '}{PURPOSE_THEMES[examPurpose]?.label}
                  {selectedReq && <span style={{ color:'#059669' }}> · Req #{selectedReq.id}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(0)}
              style={{
                marginLeft:'auto', fontSize:11, color:C.accent, background:'none',
                border:`1px solid ${C.accentBd}`, borderRadius:6, padding:'4px 10px', cursor:'pointer',
              }}>Edit Identity</button>
          </div>

          {/* Difficulty selector */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:C.radius, padding:'14px 18px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>
              Difficulty Level
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDiff(d)}
                  style={{
                    padding:'6px 16px', borderRadius:99, fontSize:12,
                    background: difficulty === d ? C.accent : '#fff',
                    border:`1px solid ${difficulty === d ? C.accent : '#e2e8f0'}`,
                    color: difficulty === d ? '#fff' : C.text2,
                    fontWeight: difficulty === d ? 700 : 400,
                    cursor:'pointer', transition:'all 0.15s', textTransform:'capitalize',
                  }}>
                  {d}
                </button>
              ))}
              {/* Mixed mode explanation pill */}
              {isMixed && (
                <span style={{
                  marginLeft:8, fontSize:11, color:'#64748b',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  padding:'4px 12px', borderRadius:99,
                  display:'inline-flex', alignItems:'center', gap:6,
                }}>
                  <strong style={{ color:'#334155' }}>Mixed:</strong>{' '}
                  set Easy / Medium / Hard counts per topic in each agent below
                </span>
              )}
            </div>
          </div>

          {/* University banner */}
          {examPurpose === 'university' && (
            <div style={{
              padding:'12px 16px',
              background:'#eff6ff', border:'1.5px solid #bfdbfe',
              borderRadius:10, display:'flex', gap:10, alignItems:'flex-start',
            }}>
              <span style={{ fontSize:18 }}>🎓</span>
              <div style={{ fontSize:12.5, color:'#1d4ed8', lineHeight:1.6 }}>
                <strong>University Mode:</strong> The <strong>Theory Generator</strong> creates written
                questions with AI-scored marking rubric (key points). At exam time, students type
                answers and AI evaluates them using the stored key points.
              </div>
            </div>
          )}

          <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {examPurpose === 'university'
              ? 'Agents & Subjects — configure MCQ and theory question distribution'
              : isMixed
                ? 'Agents & Topics — set Easy / Medium / Hard counts per topic'
                : 'Agents & Topics — set question count per topic using + / −'}
          </div>

          {/* Agent boxes */}
          <div style={{ display:'grid', gap:8 }}>
            {visibleAgents.map(agent => {
              if (agent.key === 'theory') {
                return (
                  <TheoryAgentBox
                    key="theory"
                    topicsMap={agentTopicMaps.theory}
                    distributionMap={theoryDistMap}
                    enabled={enabled.theory}
                    onToggle={() => setEnabled(prev => ({ ...prev, theory: !prev.theory }))}
                    onTopicsChange={map => setMaps(prev => ({ ...prev, theory: map }))}
                    onDistChange={setTheoryDistMap}
                  />
                );
              }
              return (
                <AgentBox
                  key={agent.key}
                  agentKey={agent.key}
                  name={agent.name}
                  topicsMap={agentTopicMaps[agent.key]}
                  mixedMap={agentMixedMaps[agent.key] || {}}
                  onTopicsChange={map => setMaps(prev => ({ ...prev, [agent.key]: map }))}
                  onMixedChange={mm  => setMixedMaps(prev => ({ ...prev, [agent.key]: mm }))}
                  enabled={enabled[agent.key]}
                  onToggle={() => setEnabled(prev => ({ ...prev, [agent.key]: !prev[agent.key] }))}
                  platform={agent.key === 'coding' ? codingPlatform : null}
                  onPlatformChange={agent.key === 'coding' ? setPlatform : null}
                  isMixed={isMixed}
                />
              );
            })}
          </div>

          {/* Validation warning */}
          {activeAgents.length > 0 && !allHaveTopics && (
            <div style={{
              padding:'9px 14px', background:'#fffbeb', border:'1px solid #fcd34d',
              borderRadius:7, fontSize:12.5, color:'#92400e',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 12H1L7 1Z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7 5.5V8M7 10V10.1" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Every enabled agent needs at least one topic/subject.
            </div>
          )}

          {/* Summary + Generate */}
          <div style={{
            background:'#fff', border:`1px solid ${C.border}`, borderRadius:C.radius,
            padding:'18px 22px', display:'flex', alignItems:'center',
            justifyContent:'space-between', flexWrap:'wrap', gap:16,
            boxShadow:'0 2px 8px rgba(112,85,200,0.08)',
          }}>
            <div style={{ display:'flex', gap:24 }}>
              {[
                { label:'Agents',  value: activeAgents.length },
                { label:'Topics',  value: totalTopics         },
                { label:'Est. Qs', value: totalEst            },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:800, color:C.accent, letterSpacing:'-0.02em' }}>{value}</div>
                  <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={() => setStep(1)}
                style={{
                  padding:'10px 18px', borderRadius:8, border:'1.5px solid #e2e8f0',
                  background:'#fff', fontSize:13, fontWeight:600, color:C.text2, cursor:'pointer',
                }}>← Back</button>
              <button onClick={handleGenerate} disabled={!canGenerate} style={btnPrimary(canGenerate)}>
                Generate Questions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
