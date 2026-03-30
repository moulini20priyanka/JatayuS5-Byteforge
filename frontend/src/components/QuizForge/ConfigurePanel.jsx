// src/components/ConfigurePanel.jsx
import { useState } from "react";

const AGENTS = [
  { key: "mcq",      name: "MCQ Generator",  label: "Multiple Choice",        colorVar: "--mcq-color",      bgVar: "--mcq-bg",      borderVar: "--mcq-border"      },
  { key: "sql",      name: "SQL Agent",       label: "Database & Queries",     colorVar: "--sql-color",      bgVar: "--sql-bg",      borderVar: "--sql-border"      },
  { key: "coding",   name: "Coding Agent",    label: "Programming Problems",   colorVar: "--coding-color",   bgVar: "--coding-bg",   borderVar: "--coding-border"   },
  { key: "aptitude", name: "Aptitude Agent",  label: "Quantitative Reasoning", colorVar: "--aptitude-color", bgVar: "--aptitude-bg", borderVar: "--aptitude-border" },
  { key: "verbal",   name: "Verbal Agent",    label: "Language Ability",       colorVar: "--verbal-color",   bgVar: "--verbal-bg",   borderVar: "--verbal-border"   },
];

const DIFFICULTIES = ["easy", "medium", "hard", "mixed"];

const CODING_PLATFORMS = [
  { id: "leetcode",      label: "LeetCode"      },
  { id: "geeksforgeeks", label: "GeeksForGeeks" },
  { id: "hackerrank",    label: "HackerRank"    },
  { id: "hackerearth",   label: "HackerEarth"   },
  { id: "codechef",      label: "CodeChef"      },
  { id: "codeforces",    label: "Codeforces"    },
  { id: "interviewbit",  label: "InterviewBit"  },
  { id: "atcoder",       label: "AtCoder"       },
  { id: "spoj",          label: "SPOJ"          },
];

const PLACEHOLDERS = {
  mcq:      "e.g. React Hooks, OOP Concepts, Design Patterns",
  sql:      "e.g. Joins, Indexes, Subqueries, Transactions",
  coding:   "e.g. Binary Trees, Graph BFS, Dynamic Programming",
  aptitude: "e.g. Percentages, Number Series, Syllogisms",
  verbal:   "e.g. Vocabulary, Para Jumbles, Sentence Completion",
};

function AgentTopicBox({ agent, topics, onChange, enabled, onToggle, platform, onPlatformChange }) {
  const [input, setInput]               = useState("");
  const [customPlatform, setCustomPlatform] = useState("");

  const color  = `var(${agent.colorVar})`;
  const bg     = `var(${agent.bgVar})`;
  const border = `var(${agent.borderVar})`;

  function add() {
    const t = input.trim();
    if (t && !topics.includes(t)) { onChange([...topics, t]); setInput(""); }
  }

  function remove(t) { onChange(topics.filter((x) => x !== t)); }

  return (
    <div style={{
      border: `1px solid ${enabled ? border : "var(--border)"}`,
      borderRadius: "var(--radius)",
      background: enabled ? bg : "var(--surface)",
      transition: "all 0.2s",
      overflow: "hidden",
      boxShadow: enabled ? "var(--shadow-xs)" : "none",
    }}>
      {/* Header row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}
        onClick={onToggle}
      >
        {/* Checkbox */}
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${enabled ? color : "var(--border-2)"}`,
          background: enabled ? color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {enabled && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Agent info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: enabled ? color : "var(--text)", letterSpacing: "-0.01em" }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{agent.label}</div>
        </div>

        {/* Topic count badge */}
        {topics.length > 0 && (
          <span style={{
            padding: "2px 10px", borderRadius: 99,
            background: enabled ? `var(${agent.bgVar})` : "var(--bg-2)",
            border: `1px solid ${enabled ? border : "var(--border)"}`,
            fontSize: 11, fontWeight: 600, color: enabled ? color : "var(--text-3)",
          }}>
            {topics.length} topic{topics.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: enabled ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M4 6L8 10L12 6" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Expanded body */}
      {enabled && (
        <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${border}` }}>

          {/* Platform selector — coding agent only */}
          {agent.key === "coding" && (
            <div style={{ marginTop: 14, marginBottom: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--text-3)",
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
              }}>
                Platform
              </div>

              {/* Platform buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {CODING_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPlatformChange(p.id)}
                    style={{
                      padding: "5px 13px", borderRadius: 99, fontSize: 12,
                      cursor: "pointer", fontFamily: "var(--font-body)",
                      fontWeight: platform === p.id ? 600 : 400,
                      background: platform === p.id ? color : "var(--surface)",
                      border: `1px solid ${platform === p.id ? color : "var(--border)"}`,
                      color: platform === p.id ? "#fff" : "var(--text-2)",
                      transition: "all 0.15s",
                    }}
                  >
                    {p.label}
                    {/* HackerEarth badge — shows API tag since we have API key */}
                    {p.id === "hackerearth" && (
                      <span style={{
                        marginLeft: 5, fontSize: 9, fontWeight: 700,
                        background: platform === p.id ? "rgba(255,255,255,0.25)" : "var(--coding-bg)",
                        color: platform === p.id ? "#fff" : color,
                        padding: "1px 5px", borderRadius: 99,
                        border: `1px solid ${platform === p.id ? "rgba(255,255,255,0.4)" : border}`,
                      }}>
                        API
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom platform input */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="Or type a custom platform name..."
                  style={{
                    flex: 1, background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "7px 12px",
                    color: "var(--text)", fontFamily: "var(--font-body)",
                    fontSize: 12.5, outline: "none",
                  }}
                />
                <button
                  className="btn btn-secondary"
                  style={{ padding: "7px 14px", fontSize: 12 }}
                  onClick={() => {
                    if (customPlatform.trim()) {
                      onPlatformChange(customPlatform.trim());
                      setCustomPlatform("");
                    }
                  }}
                >Use</button>
              </div>

              {/* Selected platform indicator */}
              {platform && (
                <div style={{ marginTop: 8, fontSize: 12, color, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" fill={color}/>
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Selected: {CODING_PLATFORMS.find(p => p.id === platform)?.label || platform}
                  {platform === "hackerearth" && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: "var(--coding-bg)", color,
                      padding: "1px 7px", borderRadius: 99,
                      border: `1px solid ${border}`,
                    }}>
                      Direct API
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Topic input */}
          <div style={{
            display: "flex", gap: 8,
            marginTop: agent.key === "coding" ? 0 : 14,
            marginBottom: 10,
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder={PLACEHOLDERS[agent.key]}
              style={{
                flex: 1, background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "8px 13px",
                color: "var(--text)", fontFamily: "var(--font-body)",
                fontSize: 13, outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={(e)  => e.target.style.borderColor = color}
              onBlur={(e)   => e.target.style.borderColor = "var(--border)"}
            />
            <button
              className="btn"
              onClick={add}
              style={{ background: color, color: "#fff", border: "none", padding: "8px 16px", fontSize: 13 }}
            >Add</button>
          </div>

          {/* Topic chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {topics.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Add at least one topic to enable this agent
              </span>
            )}
            {topics.map((t) => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--surface)", border: `1px solid ${border}`,
                borderRadius: 99, padding: "3px 10px 3px 12px",
                fontSize: 12.5, color, fontWeight: 500,
              }}>
                {t}
                <button
                  onClick={() => remove(t)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", lineHeight: 1, padding: 0,
                    display: "flex", alignItems: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigurePanel({ onStart }) {
  const [enabled, setEnabled]       = useState({ mcq: true, sql: true, coding: true, aptitude: false, verbal: false });
  const [agentTopics, setAgentTopics] = useState({ mcq: [], sql: [], coding: [], aptitude: [], verbal: [] });

  // ── CHANGED: default platform is now hackerearth ──────────────────────────
  const [codingPlatform, setCodingPlatform] = useState("hackerearth");

  const [questionsPerTopic, setQPT] = useState(3);
  const [difficulty, setDifficulty] = useState("mixed");

  const activeAgents  = AGENTS.filter((a) => enabled[a.key]);
  const allHaveTopics = activeAgents.every((a) => agentTopics[a.key].length > 0);
  const canStart      = activeAgents.length > 0 && allHaveTopics;
  const totalTopics   = activeAgents.reduce((s, a) => s + agentTopics[a.key].length, 0);
  const totalEst      = activeAgents.reduce((s, a) => s + agentTopics[a.key].length * questionsPerTopic, 0);

  function handleStart() {
    if (!canStart) return;
    const filtered = {};
    for (const a of activeAgents) {
      filtered[a.key] = a.key === "coding"
        ? { topics: agentTopics["coding"], platform: codingPlatform }
        : agentTopics[a.key];
    }
    onStart({ agentTopics: filtered, questionsPerTopic, difficulty });
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>

      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
          borderRadius: 99, padding: "4px 14px", marginBottom: 16,
        }}>
          <span style={{ fontSize: 11, color: "var(--accent-text)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Multi-Agent AI System
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-body)", fontSize: 28, fontWeight: 700,
          color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8,
        }}>
          Quiz Question Generator
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 14, maxWidth: 480 }}>
          Configure each agent independently with its own set of topics. Each agent specializes in a different question type.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>

        {/* Section label */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Agents &amp; Topics
        </div>

        {/* Agent boxes */}
        <div style={{ display: "grid", gap: 8 }}>
          {AGENTS.map((agent) => (
            <AgentTopicBox
              key={agent.key}
              agent={agent}
              topics={agentTopics[agent.key]}
              onChange={(t) => setAgentTopics((prev) => ({ ...prev, [agent.key]: t }))}
              enabled={enabled[agent.key]}
              onToggle={() => setEnabled((prev) => ({ ...prev, [agent.key]: !prev[agent.key] }))}
              platform={agent.key === "coding" ? codingPlatform : null}
              onPlatformChange={agent.key === "coding" ? setCodingPlatform : null}
            />
          ))}
        </div>

        {/* Validation warning */}
        {activeAgents.length > 0 && !allHaveTopics && (
          <div style={{
            padding: "10px 16px",
            background: "#fff8ec", border: "1px solid #f0d898",
            borderRadius: "var(--radius-sm)", fontSize: 13, color: "#a06810",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L13.5 12H1.5L7.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7.5 5.5V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="7.5" cy="10.5" r="0.6" fill="currentColor"/>
            </svg>
            Every enabled agent needs at least one topic before generating.
          </div>
        )}

        {/* Settings row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
              Questions per Topic
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <input
                type="range" min={1} max={10} value={questionsPerTopic}
                onChange={(e) => setQPT(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", minWidth: 28, textAlign: "right" }}>
                {questionsPerTopic}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>Per agent per topic</div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
              Difficulty Level
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: "5px 13px", borderRadius: 99, fontSize: 12,
                    background: difficulty === d ? "var(--accent)" : "var(--surface)",
                    border: `1px solid ${difficulty === d ? "var(--accent)" : "var(--border)"}`,
                    color: difficulty === d ? "white" : "var(--text-2)",
                    fontFamily: "var(--font-body)", fontWeight: difficulty === d ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize",
                  }}
                >{d}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "18px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { label: "Agents",         value: activeAgents.length },
              { label: "Total Topics",   value: totalTopics         },
              { label: "Est. Questions", value: totalEst            },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={!canStart}
            style={{ padding: "11px 28px", fontSize: 14, fontWeight: 600 }}
          >
            Generate Questions
          </button>
        </div>

      </div>
    </div>
  );
}
