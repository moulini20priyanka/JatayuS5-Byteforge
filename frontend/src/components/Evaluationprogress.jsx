import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────
// EvaluationProgress.jsx
//
// Displays the live SSE stream from POST /api/evaluate.
// Each agent node in the LangGraph pipeline emits an event as it
// starts and finishes. This component renders those events as a
// vertical timeline of status rows.
//
// Props:
//   candidateId   string     MySQL candidates.id
//   formData      FormData   pre-built form (resume + URLs + scores)
//   onComplete    function   called with the final report JSON
//   onError       function   called with an error message string
//   autoStart     boolean    start stream immediately on mount (default true)
//
// Usage:
//   <EvaluationProgress
//     candidateId={studentId}
//     formData={formData}
//     onComplete={report => setReport(report)}
//     onError={msg => setError(msg)}
//   />
// ─────────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api';

// Pipeline order — controls display order regardless of arrival order
const AGENT_ORDER = [
  'resume', 'github', 'leetcode', 'linkedin',
  'collect', 'inference', 'decision', 'persist',
];

const AGENT_META = {
  resume:    { label: 'Resume parser',      icon: '📄', desc: 'Extract skills, URLs, projects' },
  github:    { label: 'GitHub',             icon: '🐙', desc: 'Repos, languages, consistency' },
  leetcode:  { label: 'LeetCode',           icon: '🧩', desc: 'Problems, difficulty, contests' },
  linkedin:  { label: 'LinkedIn',           icon: '💼', desc: 'Skills, experience, presence' },
  collect:   { label: 'Data collection',    icon: '⚡', desc: 'GitHub + LeetCode + LinkedIn' },
  inference: { label: 'Cross-check',        icon: '🔗', desc: 'Validate + estimate missing data' },
  decision:  { label: 'Hiring decision',    icon: '🤖', desc: 'LLM reasoning + scoring' },
  persist:   { label: 'Save report',        icon: '💾', desc: 'Store to database' },
  orchestrator: { label: 'Orchestrator',    icon: '⚙', desc: 'Pipeline control' },
};

// Colour tokens matching your existing palette
const C = {
  running: '#6366f1',
  done:    '#16a34a',
  failed:  '#dc2626',
  skipped: '#94a3b8',
  idle:    '#e2e8f0',
  bg:      '#f8fafc',
  border:  '#e2e8f0',
  navy:    '#1e293b',
  muted:   '#64748b',
  dim:     '#94a3b8',
};

function StatusDot({ status }) {
  const color = C[status] || C.idle;
  const isRunning = status === 'running';
  return (
    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
      {isRunning && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: 'pulse-ring 1.2s ease-out infinite',
        }}/>
      )}
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        background: status === 'idle' ? C.idle : color + '22',
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {status === 'done'    && <Tick color={C.done}/>}
        {status === 'failed'  && <Cross color={C.failed}/>}
        {status === 'skipped' && <span style={{ fontSize: 8, color: C.skipped }}>—</span>}
        {status === 'running' && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: color,
            animation: 'blink 0.8s ease-in-out infinite',
          }}/>
        )}
      </div>
    </div>
  );
}

function Tick({ color }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Cross({ color }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1 1L7 7M7 1L1 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function AgentRow({ agentKey, agentData, isLast }) {
  const meta   = AGENT_META[agentKey] || { label: agentKey, icon: '⚙', desc: '' };
  const status = agentData?.status || 'idle';
  const msg    = agentData?.message || meta.desc;
  const score  = agentData?.data?.score;

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16, position: 'relative' }}>
      {/* Vertical connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 13, top: 28, bottom: 0,
          width: 2, background: status === 'done' ? C.done + '40' : C.border,
        }}/>
      )}

      <StatusDot status={status}/>

      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14 }}>{meta.icon}</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: C.navy,
          }}>{meta.label}</span>
          {score !== undefined && score !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: C.done + '18', color: C.done,
              borderRadius: 20, padding: '1px 8px',
            }}>{Math.round(score)}/100</span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: status === 'failed' ? C.failed :
                                status === 'running' ? C.running : C.muted,
          lineHeight: 1.4,
        }}>
          {msg}
        </div>
      </div>
    </div>
  );
}

export default function EvaluationProgress({
  candidateId,
  formData,
  onComplete,
  onError,
  autoStart = true,
}) {
  const [agents,    setAgents]    = useState({});
  const [phase,     setPhase]     = useState('idle'); // idle | running | done | error
  const [elapsed,   setElapsed]   = useState(0);
  const startRef  = useRef(null);
  const timerRef  = useRef(null);

  // Start the SSE stream
  const startEvaluation = async () => {
    if (!formData && !candidateId) return;
    setPhase('running');
    setAgents({});
    startRef.current = Date.now();

    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    try {
      const body = formData || (() => {
        const fd = new FormData();
        fd.append('candidate_id', candidateId);
        return fd;
      })();


      const response = await fetch(`${API}/evaluate`, {
        method: 'POST',
        body,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setAgents(prev => ({
                ...prev,
                [event.agent]: {
                  status:  event.status,
                  message: event.message,
                  data:    event.data,
                },
              }));
            }

            if (event.type === 'complete') {
  clearInterval(timerRef.current);
  setPhase('done');
  onComplete?.(event.report);
}

            if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // skip malformed line
          }
        }
      }

    } catch (err) {
      clearInterval(timerRef.current);
      setPhase('error');
      onError?.(err.message);
    }
  };

  useEffect(() => {
    if (autoStart) startEvaluation();
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line

  // Which agents to show — always in pipeline order
  const shownAgents = AGENT_ORDER.filter(a =>
    agents[a] || phase === 'running'
  );

  // Overall progress: count done agents
  const doneCount    = Object.values(agents).filter(a => a.status === 'done').length;
  const totalAgents  = AGENT_ORDER.length;
  const progressPct  = Math.round((doneCount / totalAgents) * 100);

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: 14,
        border: `1px solid ${C.border}`,
        padding: '20px 24px', fontFamily: 'inherit',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
              {phase === 'idle'    ? 'Ready to evaluate'    :
               phase === 'running' ? 'Analyzing candidate…' :
               phase === 'done'    ? 'Evaluation complete'  :
                                     'Evaluation failed'}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {phase === 'running' && `${elapsed}s elapsed · ${doneCount}/${totalAgents} agents done`}
              {phase === 'done'    && `Completed in ${elapsed}s`}
              {phase === 'error'   && 'Check server logs for details'}
            </div>
          </div>

          {/* Progress ring */}
          <ProgressRing pct={phase === 'done' ? 100 : progressPct} phase={phase}/>
        </div>

        {/* Progress bar */}
        <div style={{ background: C.border, borderRadius: 4, height: 4, marginBottom: 20 }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: phase === 'done'  ? C.done :
                        phase === 'error' ? C.failed : C.running,
            width: `${phase === 'done' ? 100 : progressPct}%`,
            transition: 'width 0.4s ease',
          }}/>
        </div>

        {/* Agent timeline */}
        <div>
          {AGENT_ORDER.map((agentKey, i) => {
            const agentData = agents[agentKey];
            // Don't render agents that haven't appeared yet
            if (!agentData && phase !== 'running') return null;
            if (!agentData) return null;
            const visibleKeys = AGENT_ORDER.filter(a => agents[a]);
            const isLast = agentKey === visibleKeys[visibleKeys.length - 1];
            return (
              <AgentRow
                key={agentKey}
                agentKey={agentKey}
                agentData={agentData}
                isLast={isLast}
              />
            );
          })}

          {phase === 'idle' && (
            <div style={{ fontSize: 12, color: C.dim, textAlign: 'center', padding: '12px 0' }}>
              Pipeline will start automatically…
            </div>
          )}
        </div>

        {/* Retry button on error */}
        {phase === 'error' && (
          <button onClick={startEvaluation} style={{
            marginTop: 16, width: '100%',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '8px 0',
            fontSize: 13, fontWeight: 600, color: C.failed,
            cursor: 'pointer',
          }}>
            Retry evaluation
          </button>
        )}
      </div>
    </>
  );
}

function ProgressRing({ pct, phase }) {
  const size = 44, r = 18, circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = phase === 'done'  ? C.done :
                phase === 'error' ? C.failed : C.running;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="3.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="3.5"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle"
        fill={color} fontSize="10" fontWeight="700" fontFamily="monospace">
        {pct}%
      </text>
    </svg>
  );
}