// src/components/GeneratingPanel.jsx
import { useEffect, useRef } from "react";

const AGENT_META = {
  mcq:         { label: "MCQ Generator",  colorVar: "--mcq-color",      bgVar: "--mcq-bg"      },
  sql:         { label: "SQL Agent",       colorVar: "--sql-color",      bgVar: "--sql-bg"      },
  coding:      { label: "Coding Agent",    colorVar: "--coding-color",   bgVar: "--coding-bg"   },
  aptitude:    { label: "Aptitude Agent",  colorVar: "--aptitude-color", bgVar: "--aptitude-bg" },
  verbal:      { label: "Verbal Agent",    colorVar: "--verbal-color",   bgVar: "--verbal-bg"   },
  orchestrator:{ label: "Orchestrator",    colorVar: "--accent",         bgVar: "--accent-light"},
};

const STATUS_ICON = {
  start:      ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--accent)" strokeWidth="1.4"/><path d="M5.5 7L6.5 8L8.5 5.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  topic:      ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1.5" stroke="var(--accent)" strokeWidth="1.4"/><path d="M4.5 6.5H9.5M4.5 8.5H7.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  searching:  ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="3.5" stroke="var(--sql-color)" strokeWidth="1.4"/><path d="M8.5 8.5L11 11" stroke="var(--sql-color)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  generating: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M3 7H7M7 7H11M7 7V3M7 7V11" stroke="var(--coding-color)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  done:       ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="var(--green-bg)" stroke="var(--green)" strokeWidth="1.4"/><path d="M4.5 7L6 8.5L9.5 5" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  error:      ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="var(--red-bg)" stroke="var(--red)" strokeWidth="1.4"/><path d="M7 4.5V7.5M7 9.5V9.6" stroke="var(--red)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  complete:   ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" fill="var(--green-bg)" stroke="var(--green)" strokeWidth="1.4"/><path d="M4.5 7L6 8.5L9.5 5" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function LogLine({ entry, index }) {
  const meta  = AGENT_META[entry.agent] || AGENT_META.orchestrator;
  const color = `var(${meta.colorVar})`;
  const Icon  = STATUS_ICON[entry.status] || STATUS_ICON.topic;

  return (
    <div
      className="animate-fade-up"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 12px",
        borderLeft: `2px solid ${color}`,
        background: `var(${meta.bgVar})`,
        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        animationDelay: `${index * 0.03}s`, opacity: 0,
      }}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}><Icon /></div>
      <span style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>{entry.message}</span>
      {entry.count > 0 && (
        <span style={{
          marginLeft: "auto", flexShrink: 0,
          fontSize: 11, fontWeight: 600, color,
          background: "var(--surface)", border: `1px solid ${color}`,
          padding: "1px 8px", borderRadius: 99,
        }}>{entry.count} questions</span>
      )}
    </div>
  );
}

function AgentCard({ agentKey, progress }) {
  const meta  = AGENT_META[agentKey] || AGENT_META.orchestrator;
  const color = `var(${meta.colorVar})`;
  const lines = progress.filter((p) => p.agent === agentKey);
  const last  = lines[lines.length - 1];
  const isDone   = last?.status === "done";
  const isError  = last?.status === "error";
  const isActive = lines.length > 0 && !isDone && !isError;

  return (
    <div style={{
      padding: "14px 16px",
      background: isDone ? `var(${meta.bgVar})` : "var(--surface)",
      border: `1px solid ${isDone ? `var(${meta.borderVar || "--border"})` : "var(--border)"}`,
      borderRadius: "var(--radius)",
      display: "flex", alignItems: "center", gap: 12,
      transition: "all 0.25s",
      boxShadow: "var(--shadow-xs)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? color : "var(--text)", marginBottom: 3 }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {last?.message || "Waiting..."}
        </div>
      </div>
      {isDone && last?.count !== undefined && (
        <div style={{ fontSize: 18, fontWeight: 700, color, flexShrink: 0 }}>
          {last.count}
        </div>
      )}
      {isActive && (
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite", flexShrink: 0,
        }} />
      )}
      {isDone && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="var(--green-bg)" stroke="var(--green)" strokeWidth="1.5"/>
          <path d="M5 8L7 10L11 6" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {isError && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="var(--red-bg)" stroke="var(--red)" strokeWidth="1.5"/>
          <path d="M8 5V9M8 11V11.1" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  );
}

export default function GeneratingPanel({ progress, state, selectedAgents }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [progress]);

  const doneCount  = progress.filter((p) => p.status === "done").length;
  const totalCount = selectedAgents.length;
  const pct        = totalCount ? (doneCount / totalCount) * 100 : 0;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "var(--radius)",
          background: state === "done" ? "var(--green-bg)" : "var(--accent-light)",
          border: `1px solid ${state === "done" ? "var(--green-border)" : "var(--accent-mid)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {state === "done" ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="var(--green-bg)" stroke="var(--green)" strokeWidth="1.5"/>
              <path d="M6 10L8.5 12.5L14 7" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 1.5s linear infinite" }}>
              <circle cx="10" cy="10" r="8" stroke="var(--accent-mid)" strokeWidth="2"/>
              <path d="M10 2a8 8 0 0 1 8 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            {state === "done" ? "Generation Complete" : "Agents Working..."}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {state === "done"
              ? `All ${totalCount} agents finished`
              : `${doneCount} of ${totalCount} agents completed`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-bar-fill" style={{ width: `${state === "done" ? 100 : pct}%` }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
        {/* Agent status cards */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Agent Status
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {selectedAgents.map((key) => (
              <AgentCard key={key} agentKey={key} progress={progress} />
            ))}
          </div>
        </div>

        {/* Live log */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Activity Log
          </div>
          <div
            ref={logRef}
            style={{
              height: 320, overflowY: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 10,
              display: "flex", flexDirection: "column", gap: 5,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {progress.length === 0 && (
              <div style={{ color: "var(--text-3)", fontSize: 12.5, padding: "8px 10px" }}>
                Initializing agents
                <span style={{ animation: "blink 1s step-end infinite", marginLeft: 2 }}>...</span>
              </div>
            )}
            {progress.map((entry, i) => <LogLine key={i} entry={entry} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
