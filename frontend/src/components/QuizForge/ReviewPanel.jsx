// src/components/QuizForge/ReviewPanel.jsx
// v3: Full theory question support
//   • subject badge in card header + TheoryPreview
//   • mark distribution summary reflects selected subset (not all)
//   • marks filter works even when non-theory types have marks
//   • model_answer_outline gracefully hidden when absent
//   • bloom_level chip added to QuestionCard header for quick scan
//   • "Select All Filtered" now truly respects active filters
//   • sticky footer shows per-type breakdown for theory+MCQ mixes

import { useState, useMemo } from "react";

// ─── Theme constants ──────────────────────────────────────────────────────────

const AGENT_THEMES = {
  mcq:      { label: "MCQ",      color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  sql:      { label: "SQL",      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  coding:   { label: "Coding",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  aptitude: { label: "Aptitude", color: "#0891b2", bg: "#f0f9ff", border: "#bae6fd" },
  verbal:   { label: "Verbal",   color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
  theory:   { label: "Theory",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
};

const DIFF_STYLES = {
  easy:   { color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  medium: { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  hard:   { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

const MARK_COLORS = {
  2:  { color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  5:  { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  8:  { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  10: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const BLOOM_COLORS = {
  remember:   { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  understand: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  apply:      { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  analyze:    { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  evaluate:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  create:     { color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
};

const sectionLabel = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function markStyle(marks) {
  return MARK_COLORS[marks] || MARK_COLORS[5];
}

function bloomStyle(level) {
  return BLOOM_COLORS[(level || "").toLowerCase()] || BLOOM_COLORS.remember;
}

function parseKeyPoints(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split("\n").map(s => s.trim()).filter(Boolean);
  return [];
}

function parseKeywords(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(k => k.trim()).filter(Boolean);
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

// ─── TheoryPreview ────────────────────────────────────────────────────────────

function TheoryPreview({ q }) {
  const [tab, setTab] = useState("answer");

  const ms        = markStyle(q.marks);
  const bs        = bloomStyle(q.bloom_level);
  const keyPoints = parseKeyPoints(q.key_points);
  const keywords  = parseKeywords(q.keywords);

  const tabs = [
    { k: "answer",   l: "Model Answer" },
    { k: "points",   l: `Key Points${keyPoints.length ? ` (${keyPoints.length})` : ""}` },
    { k: "keywords", l: `Keywords${keywords.length ? ` (${keywords.length})` : ""}` },
  ];

  return (
    <div>
      {/* Meta badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, paddingTop: 12 }}>
        {q.marks && (
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: ms.bg, border: `1px solid ${ms.border}`, color: ms.color,
          }}>
            {q.marks}-Mark Question
          </span>
        )}
        {q.bloom_level && (
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`,
          }}>
            🧠 {q.bloom_level}
          </span>
        )}
        {q.subject && (
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: "#f0f9ff", color: "#0891b2", border: "1px solid #bae6fd",
          }}>
            📚 {q.subject}
          </span>
        )}
        {q.unit && (
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500,
            background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0",
          }}>
            📌 {q.unit}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e8e4f8", marginBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "8px 16px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            border: "none", background: "none",
            borderBottom: tab === t.k ? "2px solid #2563eb" : "2px solid transparent",
            color: tab === t.k ? "#2563eb" : "#94a3b8",
          }}>{t.l}</button>
        ))}
      </div>

      {/* Answer tab */}
      {tab === "answer" && (
        <div style={{ paddingTop: 12, display: "grid", gap: 10 }}>
          {q.model_answer_outline && (
            <div style={{
              padding: "7px 11px", background: "#f0f9ff",
              border: "1px solid #bae6fd", borderRadius: 6,
              fontSize: 11, color: "#0891b2",
            }}>
              <strong>Outline: </strong>{q.model_answer_outline}
            </div>
          )}
          <div style={{
            fontSize: 12.5, color: "#374151", lineHeight: 1.75,
            background: "#f8fafc", border: "1px solid #e8e4f8",
            borderRadius: 8, padding: "12px 14px",
            whiteSpace: "pre-wrap",
          }}>
            {q.expected_answer || q.explanation || (
              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No model answer provided.</span>
            )}
          </div>
          {/* Marks guide */}
          {q.marks && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 6,
              background: ms.bg, border: `1px solid ${ms.border}`,
              fontSize: 11, color: ms.color,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>This question carries <strong>{q.marks} marks</strong>. Partial credit may be awarded based on key points covered.</span>
            </div>
          )}
        </div>
      )}

      {/* Key Points tab */}
      {tab === "points" && (
        <div style={{ paddingTop: 12 }}>
          {keyPoints.length === 0 ? (
            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No key points specified.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                Award marks for each of these points covered in the student's answer:
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                {keyPoints.map((pt, i) => (
                  <li key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "7px 12px", background: "#eff6ff",
                    border: "1px solid #bfdbfe", borderRadius: 7,
                    fontSize: 12.5, color: "#1e40af",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="7" cy="7" r="6" fill="#2563eb"/>
                      <path d="M4.5 7L6 8.5L9.5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span><strong style={{ color: "#2563eb", marginRight: 4 }}>pt {i + 1}.</strong>{pt}</span>
                  </li>
                ))}
              </ul>
              {q.marks && keyPoints.length > 0 && (
                <div style={{
                  marginTop: 10, padding: "6px 12px", borderRadius: 6,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  fontSize: 11, color: "#64748b",
                }}>
                  Approx. <strong>{(q.marks / keyPoints.length).toFixed(1)} marks</strong> per key point
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Keywords tab */}
      {tab === "keywords" && (
        <div style={{ paddingTop: 12 }}>
          {keywords.length === 0 ? (
            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No keywords specified.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                These keywords should appear in the student's answer for full marks:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keywords.map((kw, i) => (
                  <span key={i} style={{
                    padding: "4px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 600,
                    background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#7c3aed",
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CodingPreview ────────────────────────────────────────────────────────────

function CodingPreview({ q }) {
  const [tab, setTab] = useState("problem");

  let examples = [];
  if (Array.isArray(q.examples) && q.examples.length > 0) {
    examples = q.examples;
  } else if (q.sample_input !== undefined || q.sample_output !== undefined) {
    examples = [{ input: q.sample_input || "", output: q.sample_output || "" }];
  }

  const starterCode = q.starter_code || q.starterCode || "";

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid #f0ecfc", marginBottom: 0 }}>
        {[{ k: "problem", l: "Problem" }, { k: "code", l: "Starter Code" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "8px 16px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            border: "none", background: "none",
            borderBottom: tab === t.k ? "2px solid #d97706" : "2px solid transparent",
            color: tab === t.k ? "#d97706" : "#94a3b8",
          }}>{t.l}</button>
        ))}
      </div>

      {tab === "problem" && (
        <div style={{ padding: "14px 0", display: "grid", gap: 12 }}>
          {(q.description || q.question) && (
            <div>
              <div style={sectionLabel}>📋 Problem Statement</div>
              <p style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.65, margin: 0 }}>
                {q.description || q.question}
              </p>
            </div>
          )}
          {q.constraints && (
            <div>
              <div style={sectionLabel}>⚡ Constraints</div>
              <div style={{
                fontFamily: "monospace", fontSize: 12, color: "#4b5563",
                background: "#fffbeb", border: "1px solid #fcd34d",
                borderRadius: 6, padding: "8px 12px", lineHeight: 1.7,
              }}>{q.constraints}</div>
            </div>
          )}
          {examples.length > 0 && (
            <div>
              <div style={sectionLabel}>🧪 Sample Test Cases</div>
              {examples.map((ex, i) => (
                <div key={i} style={{
                  background: "#f8f7ff", border: "1px solid #e8e4f8",
                  borderRadius: 8, overflow: "hidden", marginBottom: 6,
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ padding: "10px 12px", borderRight: "1px solid #e8e4f8" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#7055C8", marginBottom: 5 }}>INPUT</div>
                      <pre style={{ margin: 0, fontSize: 12, fontFamily: "monospace", color: "#1a1060", whiteSpace: "pre-wrap" }}>
                        {String(ex.input || "—")}
                      </pre>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#059669", marginBottom: 5 }}>OUTPUT</div>
                      <pre style={{ margin: 0, fontSize: 12, fontFamily: "monospace", color: "#1a1060", whiteSpace: "pre-wrap" }}>
                        {String(ex.output || "—")}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {q.explanation && (
            <div>
              <div style={sectionLabel}>💡 Approach</div>
              <div style={{
                fontSize: 12, color: "#374151", background: "#f0fdf4",
                border: "1px solid #6ee7b7", borderRadius: 6,
                padding: "8px 12px", lineHeight: 1.6,
              }}>{q.explanation}</div>
            </div>
          )}
        </div>
      )}

      {tab === "code" && (
        <div style={{ paddingTop: 14 }}>
          {starterCode ? (
            <>
              <div style={sectionLabel}>🐍 Starter Code</div>
              <pre style={{
                margin: 0, fontFamily: "monospace", fontSize: 12.5,
                background: "#1e1e2e", color: "#cdd6f4",
                borderRadius: 8, padding: "14px 16px",
                overflowX: "auto", lineHeight: 1.65, border: "1px solid #313244",
              }}>{starterCode.replace(/\\n/g, "\n")}</pre>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>
              No starter code for this problem.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({ question, index, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const th       = AGENT_THEMES[question.type] || AGENT_THEMES.mcq;
  const diff     = DIFF_STYLES[(question.difficulty || "").toLowerCase()] || DIFF_STYLES.medium;
  const isTheory = question.type === "theory";

  const options = Array.isArray(question.options) && question.options.length > 0
    ? question.options
    : [question.option_a, question.option_b, question.option_c, question.option_d].filter(Boolean);

  const answer = (question.answer || question.correct_ans || "").toString().trim();

  const ms = question.marks ? markStyle(question.marks) : null;
  const bs = question.bloom_level ? bloomStyle(question.bloom_level) : null;

  return (
    <div style={{
      background: selected ? th.bg + "88" : "#fff",
      border: `1.5px solid ${selected ? th.border : "#e8e4f8"}`,
      borderRadius: 10, overflow: "hidden",
      transition: "all 0.15s",
      boxShadow: "0 1px 3px rgba(112,85,200,0.06)",
    }}>
      {/* Header */}
      <div
        style={{ padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Checkbox */}
        <div
          onClick={e => { e.stopPropagation(); onToggle(question.id); }}
          style={{
            width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 2,
            border: `2px solid ${selected ? th.color : "#cbd5e1"}`,
            background: selected ? th.color : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {selected && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 3, flexShrink: 0 }}>
          #{index + 1}
        </span>

        {/* Type badge */}
        <span style={{
          padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: th.bg, border: `1px solid ${th.border}`, color: th.color,
          flexShrink: 0, marginTop: 2, textTransform: "uppercase",
        }}>{th.label}</span>

        {/* Marks badge */}
        {ms && (
          <span style={{
            padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
            background: ms.bg, border: `1px solid ${ms.border}`, color: ms.color,
            flexShrink: 0, marginTop: 2,
          }}>{question.marks}M</span>
        )}

        {/* Bloom badge — shown in header for quick scan */}
        {isTheory && bs && question.bloom_level && (
          <span style={{
            padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
            background: bs.bg, border: `1px solid ${bs.border}`, color: bs.color,
            flexShrink: 0, marginTop: 2,
          }}>🧠 {question.bloom_level}</span>
        )}

        {/* Text + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: "#1a1060", lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            {question.question || question.title || "—"}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {question.topic && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{question.topic}</span>
            )}
            {/* Subject shown inline under question text */}
            {isTheory && question.subject && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#0891b2" }}>
                📚 {question.subject}
              </span>
            )}
          </div>
        </div>

        {/* Difficulty + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {question.difficulty && question.difficulty !== "mixed" && (
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
              color: diff.color, background: diff.bg, border: `1px solid ${diff.border}`,
            }}>{question.difficulty}</span>
          )}
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <path d="M3 5L7 9L11 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 16px 16px 52px", borderTop: "1px solid #f0ecfc" }}>
          <div style={{ paddingTop: 2 }}>
            {isTheory && <TheoryPreview q={question} />}
            {question.type === "coding" && <CodingPreview q={question} />}
            {question.type !== "coding" && !isTheory && (
              <>
                {options.length > 0 && (
                  <div style={{ display: "grid", gap: 5, marginBottom: 10, marginTop: 12 }}>
                    {options.map((opt, i) => {
                      const letter  = ["A", "B", "C", "D"][i];
                      const optText = typeof opt === "string" ? opt : (opt?.text || String(opt));
                      const isAns   = answer.toUpperCase().startsWith(`${letter})`);
                      return (
                        <div key={i} style={{
                          padding: "7px 12px", borderRadius: 7,
                          background: isAns ? "#ecfdf5" : "#f8f7ff",
                          border: `1px solid ${isAns ? "#6ee7b7" : "#e8e4f8"}`,
                          fontSize: 12.5, color: isAns ? "#059669" : "#374151",
                          fontWeight: isAns ? 600 : 400,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          {isAns ? (
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                              <circle cx="6.5" cy="6.5" r="6" fill="#059669"/>
                              <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", minWidth: 16 }}>{letter})</span>
                          )}
                          {optText}
                        </div>
                      );
                    })}
                  </div>
                )}
                {question.explanation && (
                  <div style={{
                    padding: "9px 13px", background: "rgba(112,85,200,0.06)",
                    border: "1px solid rgba(112,85,200,0.15)",
                    borderRadius: 7, fontSize: 12, color: "#4b5563", lineHeight: 1.6,
                  }}>
                    <strong style={{ color: "#7055C8" }}>Explanation: </strong>
                    {question.explanation}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mark distribution strip (reflects current selection) ────────────────────

function TheoryMarkStrip({ questions }) {
  const counts = [2, 5, 8, 10].reduce((acc, m) => {
    acc[m] = questions.filter(q => q.type === "theory" && Number(q.marks) === m).length;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return null;

  return (
    <div style={{
      marginBottom: 14, padding: "10px 16px",
      background: "#eff6ff", border: "1px solid #bfdbfe",
      borderRadius: 9, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "#1d4ed8",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>📖 Theory breakdown:</span>
      {[2, 5, 8, 10].map(m => {
        if (!counts[m]) return null;
        const mc = MARK_COLORS[m] || MARK_COLORS[5];
        return (
          <span key={m} style={{
            padding: "3px 11px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: mc.bg, border: `1px solid ${mc.border}`, color: mc.color,
          }}>
            {counts[m]}× {m}-Mark
          </span>
        );
      })}
      <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>
        Total theory: <strong>{total}</strong>
      </span>
    </div>
  );
}

// ─── Main ReviewPanel ─────────────────────────────────────────────────────────

export default function ReviewPanel({ questions, stats, onFinalize, onRegenerate, importing }) {
  const [selected,    setSelected]    = useState(() => new Set(questions.map(q => q.id)));
  const [filterType,  setFilterType]  = useState("all");
  const [filterDiff,  setFilterDiff]  = useState("all");
  const [filterMarks, setFilterMarks] = useState("all");
  const [search,      setSearch]      = useState("");

  // Derive unique filter values
  const types = useMemo(
    () => ["all", ...new Set(questions.map(q => q.type).filter(Boolean))],
    [questions]
  );
  const diffs = useMemo(
    () => ["all", ...new Set(questions.map(q => (q.difficulty || "").toLowerCase()).filter(Boolean))],
    [questions]
  );

  // Marks filter — show when any question has a marks value
  const allMarks = useMemo(
    () => [...new Set(questions.map(q => q.marks).filter(Boolean))].sort((a, b) => a - b),
    [questions]
  );
  const showMarksFilter = allMarks.length > 0;

  const hasTheory = questions.some(q => q.type === "theory");

  // Filtered list
  const filtered = useMemo(() => questions.filter(q => {
    if (filterType !== "all" && q.type !== filterType) return false;
    if (filterDiff !== "all" && (q.difficulty || "").toLowerCase() !== filterDiff) return false;
    if (filterMarks !== "all" && String(q.marks) !== String(filterMarks)) return false;
    if (search) {
      const text = (q.question || q.title || "").toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [questions, filterType, filterDiff, filterMarks, search]);

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAllFiltered() {
    setSelected(prev => {
      const n = new Set(prev);
      filtered.forEach(q => n.add(q.id));
      return n;
    });
  }

  function deselectAllFiltered() {
    setSelected(prev => {
      const n = new Set(prev);
      filtered.forEach(q => n.delete(q.id));
      return n;
    });
  }

  const selectedQuestions  = questions.filter(q => selected.has(q.id));
  const selectedTheory     = selectedQuestions.filter(q => q.type === "theory");
  const selectedNonTheory  = selectedQuestions.filter(q => q.type !== "theory");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 4px" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 14,
      }}>
        <div>
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: "#1a1060",
            letterSpacing: "-0.02em", marginBottom: 4,
          }}>
            Review &amp; Select
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            {questions.length} questions generated ·{" "}
            <strong style={{ color: "#7055C8" }}>{selected.size} selected</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={onRegenerate} style={{
            padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0",
            background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer",
          }}>Regenerate</button>
          <button
            onClick={() => onFinalize(selectedQuestions)}
            disabled={selected.size === 0 || importing}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              fontSize: 13, fontWeight: 700,
              background: selected.size === 0 || importing
                ? "#e2e8f0"
                : "linear-gradient(135deg,#7055C8,#C060C0)",
              color: selected.size === 0 || importing ? "#94a3b8" : "#fff",
              cursor: selected.size === 0 || importing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
              boxShadow: selected.size > 0 && !importing
                ? "0 2px 10px rgba(112,85,200,0.3)" : "none",
            }}
          >
            {importing ? (
              <>
                <span style={{
                  width: 13, height: 13, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite", display: "inline-block",
                }}/>
                Saving...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Save to Question Bank ({selected.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats strip (agent breakdown) ── */}
      {stats?.byAgent && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(stats.byAgent).map(([key, count]) => {
            if (!count) return null;
            const th = AGENT_THEMES[key];
            if (!th) return null;
            return (
              <div key={key} style={{
                padding: "4px 14px", borderRadius: 99,
                background: th.bg, border: `1px solid ${th.border}`,
                fontSize: 12, color: th.color, fontWeight: 600,
              }}>{count} {th.label}</div>
            );
          })}
        </div>
      )}

      {/* ── Theory mark distribution — reflects SELECTED questions ── */}
      {hasTheory && <TheoryMarkStrip questions={selectedQuestions} />}

      {/* ── Filters ── */}
      <div style={{
        background: "#fff", border: "1px solid #e8e4f8", borderRadius: 10,
        padding: "12px 14px", marginBottom: 14,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f8f7ff", border: "1px solid #e8e4f8", borderRadius: 8,
          padding: "7px 12px", flex: "1 1 180px",
        }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            style={{
              background: "none", border: "none", outline: "none",
              fontSize: 12.5, color: "#1a1060", width: "100%",
            }}
          />
        </div>

        {/* Type filters */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {types.map(t => {
            const th     = AGENT_THEMES[t];
            const active = filterType === t;
            return (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer",
                background: active ? (th ? th.bg : "rgba(112,85,200,0.1)") : "#fff",
                color:      active ? (th ? th.color : "#7055C8") : "#94a3b8",
                border:     `1px solid ${active ? (th ? th.border : "rgba(112,85,200,0.3)") : "#e2e8f0"}`,
                fontWeight: active ? 700 : 400, transition: "all 0.15s", textTransform: "capitalize",
              }}>{t}</button>
            );
          })}
        </div>

        {/* Difficulty filters */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {diffs.map(d => {
            const ds     = DIFF_STYLES[d] || {};
            const active = filterDiff === d;
            return (
              <button key={d} onClick={() => setFilterDiff(d)} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer",
                background: active ? (ds.bg || "rgba(112,85,200,0.1)") : "#fff",
                color:      active ? (ds.color || "#7055C8") : "#94a3b8",
                border:     `1px solid ${active ? (ds.border || "rgba(112,85,200,0.3)") : "#e2e8f0"}`,
                fontWeight: active ? 700 : 400, transition: "all 0.15s", textTransform: "capitalize",
              }}>{d}</button>
            );
          })}
        </div>

        {/* Marks filters */}
        {showMarksFilter && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["all", ...allMarks].map(m => {
              const mc     = m !== "all" ? (MARK_COLORS[m] || MARK_COLORS[5]) : {};
              const active = String(filterMarks) === String(m);
              return (
                <button key={m} onClick={() => setFilterMarks(m)} style={{
                  padding: "5px 11px", borderRadius: 99, fontSize: 11, cursor: "pointer",
                  background: active ? (mc.bg || "rgba(112,85,200,0.1)") : "#fff",
                  color:      active ? (mc.color || "#7055C8") : "#94a3b8",
                  border:     `1px solid ${active ? (mc.border || "rgba(112,85,200,0.3)") : "#e2e8f0"}`,
                  fontWeight: active ? 700 : 400, transition: "all 0.15s",
                }}>{m === "all" ? "All Marks" : `${m}M`}</button>
              );
            })}
          </div>
        )}

        {/* Select / Deselect filtered */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          <button
            onClick={selectAllFiltered}
            title={`Select all ${filtered.length} filtered questions`}
            style={{
              padding: "5px 11px", borderRadius: 7, border: "1px solid #e2e8f0",
              background: "#fff", fontSize: 11, cursor: "pointer", color: "#64748b", fontWeight: 600,
            }}
          >All</button>
          <button
            onClick={deselectAllFiltered}
            title="Deselect all filtered questions"
            style={{
              padding: "5px 11px", borderRadius: 7, border: "1px solid #e2e8f0",
              background: "#fff", fontSize: 11, cursor: "pointer", color: "#64748b", fontWeight: 600,
            }}
          >None</button>
        </div>
      </div>

      {/* ── Question list ── */}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", fontSize: 13 }}>
            No questions match your filters.
          </div>
        )}
        {filtered.map((q, i) => (
          <QuestionCard
            key={q.id || i}
            question={q}
            index={i}
            selected={selected.has(q.id)}
            onToggle={toggleSelect}
          />
        ))}
      </div>

      {/* ── Sticky footer ── */}
      {selected.size > 0 && (
        <div style={{
          position: "sticky", bottom: 20, marginTop: 20,
          background: "#fff", border: "1px solid #e8e4f8",
          borderRadius: 12, padding: "14px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 8px 32px rgba(112,85,200,0.15)",
        }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#7055C8" }}>{selected.size}</span>
            <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>questions selected</span>

            {/* Per-type breakdown in footer */}
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {hasTheory && selectedTheory.length > 0 && (
                <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
                  {selectedTheory.length} Theory
                  {[2, 5, 8, 10].map(m => {
                    const cnt = selectedTheory.filter(q => Number(q.marks) === m).length;
                    if (!cnt) return null;
                    return (
                      <span key={m} style={{ color: (MARK_COLORS[m] || MARK_COLORS[5]).color, marginLeft: 5 }}>
                        ({cnt}×{m}M)
                      </span>
                    );
                  })}
                </span>
              )}
              {selectedNonTheory.length > 0 && (
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {selectedNonTheory.length} other
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onFinalize(selectedQuestions)}
            disabled={importing}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#7055C8,#C060C0)",
              color: "#fff", cursor: importing ? "not-allowed" : "pointer",
              boxShadow: "0 2px 12px rgba(112,85,200,0.3)",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Save {selected.size} Questions to Bank
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}