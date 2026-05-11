// src/components/QuizForge/GeneratingPanel.jsx
// Adapted for NeuroAssess — inline styles, no CSS variables

import { useEffect, useRef } from "react";

const AGENT_THEMES = {
  mcq:         { label:'MCQ Generator',  color:'#2563eb', bg:'#eff6ff'  },
  sql:         { label:'SQL Agent',      color:'#7c3aed', bg:'#f5f3ff'  },
  coding:      { label:'Coding Agent',   color:'#d97706', bg:'#fffbeb'  },
  aptitude:    { label:'Aptitude Agent', color:'#0891b2', bg:'#f0f9ff'  },
  verbal:      { label:'Verbal Agent',   color:'#db2777', bg:'#fdf2f8'  },
  orchestrator:{ label:'Orchestrator',   color:'#7055C8', bg:'rgba(112,85,200,0.06)' },
};

function AgentCard({ agentKey, progress }) {
  const th    = AGENT_THEMES[agentKey] || AGENT_THEMES.orchestrator;
  const lines = progress.filter(p => p.agent === agentKey);
  const last  = lines[lines.length - 1];
  const isDone   = last?.status === 'done';
  const isError  = last?.status === 'error';
  const isActive = lines.length > 0 && !isDone && !isError;

  return (
    <div style={{
      padding:'13px 16px',
      background: isDone ? th.bg : '#fff',
      border:`1px solid ${isDone ? th.color + '44' : '#e8e4f8'}`,
      borderRadius:10,
      display:'flex', alignItems:'center', gap:12,
      transition:'all 0.25s',
      boxShadow:'0 1px 4px rgba(112,85,200,0.06)',
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color: isDone ? th.color : '#1a1060', marginBottom:3 }}>
          {th.label}
        </div>
        <div style={{ fontSize:11.5, color:'#94a3b8', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {last?.message || 'Waiting...'}
        </div>
      </div>

      {isDone && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0 }}>
          <circle cx="9" cy="9" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5"/>
          <path d="M5.5 9L7.5 11L12.5 6.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {isActive && (
        <div style={{
          width:16, height:16, borderRadius:'50%',
          border:`2px solid ${th.color}`, borderTopColor:'transparent',
          animation:'spin 0.8s linear infinite', flexShrink:0,
        }}/>
      )}
      {isError && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0 }}>
          <circle cx="9" cy="9" r="8" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5"/>
          <path d="M9 5.5V9.5M9 11.5V11.6" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {!isDone && !isActive && !isError && (
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#e2e8f0', flexShrink:0 }}/>
      )}
    </div>
  );
}

function LogLine({ entry }) {
  const th = AGENT_THEMES[entry.agent] || AGENT_THEMES.orchestrator;
  const statusColors = {
    done:     '#059669',
    error:    '#dc2626',
    complete: '#059669',
    start:    '#7055C8',
    topic:    '#7055C8',
  };
  const lineColor = statusColors[entry.status] || th.color;

  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:8,
      padding:'7px 10px',
      borderLeft:`2px solid ${lineColor}`,
      background: th.bg,
      borderRadius:'0 6px 6px 0',
      marginBottom:3,
    }}>
      <span style={{ fontSize:12, color:'#4b5563', lineHeight:1.5, flex:1 }}>{entry.message}</span>
    </div>
  );
}

export default function GeneratingPanel({ progress, state, selectedAgents }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [progress]);

  const doneCount  = progress.filter(p => p.status === 'done').length;
  const totalCount = selectedAgents.length;
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 4px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
        <div style={{
          width:44, height:44, borderRadius:10,
          background: state === 'done' ? '#ecfdf5' : 'rgba(112,85,200,0.08)',
          border:`1px solid ${state === 'done' ? '#6ee7b7' : 'rgba(112,85,200,0.2)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          {state === 'done' ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5"/>
              <path d="M6 10L8.5 12.5L14 7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation:'spin 1.5s linear infinite' }}>
              <circle cx="10" cy="10" r="8" stroke="rgba(112,85,200,0.2)" strokeWidth="2"/>
              <path d="M10 2a8 8 0 0 1 8 8" stroke="#7055C8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#1a1060', letterSpacing:'-0.02em' }}>
            {state === 'done' ? 'Generation Complete' : 'Agents Working...'}
          </h2>
          <p style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>
            {state === 'done'
              ? `All ${totalCount} agents finished`
              : `${doneCount} of ${totalCount} agents completed`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:4, background:'#f0ecfc', borderRadius:99, marginBottom:22, overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:99,
          background:'linear-gradient(90deg,#7055C8,#C060C0)',
          width:`${state === 'done' ? 100 : pct}%`,
          transition:'width 0.4s ease',
        }}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:20 }}>

        {/* Agent status cards */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>
            Agent Status
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {selectedAgents.map(key => (
              <AgentCard key={key} agentKey={key} progress={progress} />
            ))}
          </div>
        </div>

        {/* Live log */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>
            Activity Log
          </div>
          <div ref={logRef} style={{
            height:280, overflowY:'auto',
            background:'#fff', border:'1px solid #e8e4f8',
            borderRadius:10, padding:10,
            display:'flex', flexDirection:'column',
          }}>
            {progress.length === 0 && (
              <div style={{ color:'#94a3b8', fontSize:12.5, padding:'8px 10px' }}>
                Initializing agents ...
              </div>
            )}
            {progress.map((entry, i) => <LogLine key={i} entry={entry} />)}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}