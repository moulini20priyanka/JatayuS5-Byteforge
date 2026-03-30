// src/components/ReviewPanel.jsx
import { useState, useMemo } from "react";

const TYPE_META = {
  mcq:      { label: "MCQ",      colorVar: "--mcq-color",      bgVar: "--mcq-bg",      borderVar: "--mcq-border"      },
  sql:      { label: "SQL",      colorVar: "--sql-color",      bgVar: "--sql-bg",      borderVar: "--sql-border"      },
  coding:   { label: "Coding",   colorVar: "--coding-color",   bgVar: "--coding-bg",   borderVar: "--coding-border"   },
  aptitude: { label: "Aptitude", colorVar: "--aptitude-color", bgVar: "--aptitude-bg", borderVar: "--aptitude-border" },
  verbal:   { label: "Verbal",   colorVar: "--verbal-color",   bgVar: "--verbal-bg",   borderVar: "--verbal-border"   },
};

const DIFF_COLORS = {
  easy:   { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" },
  medium: { color: "var(--amber)", bg: "var(--amber-bg)", border: "#f0d898" },
  hard:   { color: "var(--red)",   bg: "var(--red-bg)",   border: "#f0b8b8" },
};

function QuestionCard({ question, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[question.type] || { label: "Q", colorVar: "--text-3", bgVar: "--bg-2", borderVar: "--border" };
  const diff = DIFF_COLORS[question.difficulty] || DIFF_COLORS.medium;
  const color = `var(${meta.colorVar})`;

  return (
    <div style={{
      background: selected ? `var(${meta.bgVar})` : "var(--surface)",
      border: `1px solid ${selected ? `var(${meta.borderVar})` : "var(--border)"}`,
      borderRadius: "var(--radius)",
      overflow: "hidden",
      transition: "all 0.18s",
      boxShadow: "var(--shadow-xs)",
    }}>
      {/* Card header */}
      <div
        style={{ padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(question.id); }}
          style={{
            width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 2,
            border: `2px solid ${selected ? color : "var(--border-2)"}`,
            background: selected ? color : "transparent",
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

        {/* Type badge */}
        <span style={{
          padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600,
          background: `var(${meta.bgVar})`, border: `1px solid var(${meta.borderVar})`,
          color, flexShrink: 0, marginTop: 2, letterSpacing: "0.03em",
        }}>
          {meta.label}
        </span>

        {/* Question text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5, fontWeight: 500 }}>
            {question.question}
          </p>
          {question.topic && (
            <span style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3, display: "block" }}>
              {question.topic}
              {question.platform && ` · ${question.platform}`}
            </span>
          )}
        </div>

        {/* Diff badge + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {question.difficulty && question.difficulty !== "mixed" && (
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 10.5, fontWeight: 600,
              color: diff.color, background: diff.bg,
              border: `1px solid ${diff.border}`,
            }}>
              {question.difficulty}
            </span>
          )}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M3 5.5L7.5 10L12 5.5" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 16px 16px 44px", borderTop: "1px solid var(--border)" }}>
          <div style={{ paddingTop: 12 }}>

            {/* Coding question — structured */}
            {question.type === "coding" && (
              <div style={{ display: "grid", gap: 10 }}>
                {question.description && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Problem</div>
                    <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55 }}>{question.description}</p>
                  </div>
                )}
                {question.examples?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Examples</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {question.examples.map((ex, i) => (
                        <div key={i} style={{
                          background: "var(--bg-2)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)", padding: "8px 12px",
                          fontSize: 12,
                        }}>
                          <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>{ex.label}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                            <span style={{ color: "var(--text-3)" }}>Input: </span>
                            <span style={{ color: "var(--text)" }}>{ex.input}</span>
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, marginTop: 2 }}>
                            <span style={{ color: "var(--text-3)" }}>Output: </span>
                            <span style={{ color: "var(--green)" }}>{ex.output}</span>
                          </div>
                          {ex.explanation && (
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{ex.explanation}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {question.starterCode && (
                  <div className="code-block">{String(question.starterCode).replace(/\\n/g, "\n")}</div>
                )}
              </div>
            )}

            {/* MCQ / SQL / Aptitude / Verbal */}
            {question.type !== "coding" && (
              <>
                {question.codeSnippet && (
                  <div className="code-block" style={{ marginBottom: 10 }}>{question.codeSnippet}</div>
                )}
                <div style={{ display: "grid", gap: 5 }}>
                  {(question.options || []).map((opt, i) => {
                    const letter  = ["A","B","C","D"][i];
                    const isAnswer = question.answer?.startsWith(`${letter})`);
                    return (
                      <div key={i} style={{
                        padding: "7px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: isAnswer ? "var(--green-bg)" : "var(--bg-2)",
                        border: `1px solid ${isAnswer ? "var(--green-border)" : "var(--border)"}`,
                        fontSize: 13, color: isAnswer ? "var(--green)" : "var(--text-2)",
                        fontWeight: isAnswer ? 600 : 400,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        {isAnswer && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5.5" fill="var(--green)" />
                            <path d="M3.5 6L5 7.5L8.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {opt}
                      </div>
                    );
                  })}
                </div>
                {question.explanation && (
                  <div style={{
                    marginTop: 10, padding: "9px 13px",
                    background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
                    borderRadius: "var(--radius-sm)", fontSize: 12.5, color: "var(--accent-text)", lineHeight: 1.55,
                  }}>
                    <strong style={{ fontWeight: 600 }}>Explanation: </strong>
                    {question.explanation}
                  </div>
                )}
                {question.hint && (
                  <div style={{
                    marginTop: 8, padding: "7px 12px",
                    background: "var(--verbal-bg)", border: "1px solid var(--verbal-border)",
                    borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--verbal-color)",
                  }}>
                    <strong>Hint: </strong>{question.hint}
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

export default function ReviewPanel({ questions, stats, onFinalize, onRegenerate }) {
  const [selected, setSelected] = useState(() => new Set(questions.map((q) => q.id)));
  const [filterType, setFilterType] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [search, setSearch] = useState("");

  const types = useMemo(() => ["all", ...new Set(questions.map((q) => q.type))], [questions]);
  const diffs  = useMemo(() => ["all", ...new Set(questions.map((q) => q.difficulty).filter(Boolean))], [questions]);

  const filtered = useMemo(() => questions.filter((q) => {
    if (filterType !== "all" && q.type !== filterType) return false;
    if (filterDiff !== "all" && q.difficulty !== filterDiff) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [questions, filterType, filterDiff, search]);

  function toggleSelect(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedQuestions = questions.filter((q) => selected.has(q.id));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            Review &amp; Select
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-2)" }}>
            {questions.length} questions generated · {selected.size} selected
          </p>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button className="btn btn-ghost" onClick={onRegenerate} style={{ fontSize: 13 }}>Regenerate</button>
          <button className="btn btn-primary" onClick={() => onFinalize(selectedQuestions)} disabled={selected.size === 0} style={{ fontSize: 13.5 }}>
            Export PDF ({selected.size})
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {Object.entries(stats.byAgent).map(([key, count]) => {
            if (!count) return null;
            const meta = TYPE_META[key];
            if (!meta) return null;
            return (
              <div key={key} style={{
                padding: "5px 14px", borderRadius: 99,
                background: `var(${meta.bgVar})`, border: `1px solid var(${meta.borderVar})`,
                fontSize: 12, color: `var(${meta.colorVar})`, fontWeight: 500,
              }}>
                {count} {meta.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          style={{
            flex: "1 1 200px", minWidth: 180,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "8px 13px",
            color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 5 }}>
          {types.map((t) => {
            const meta = TYPE_META[t];
            return (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: "6px 13px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                background: filterType === t ? (meta ? `var(${meta.bgVar})` : "var(--accent-light)") : "var(--surface)",
                color: filterType === t ? (meta ? `var(${meta.colorVar})` : "var(--accent)") : "var(--text-2)",
                border: `1px solid ${filterType === t ? (meta ? `var(${meta.borderVar})` : "var(--accent-mid)") : "var(--border)"}`,
                fontFamily: "var(--font-body)", fontWeight: filterType === t ? 600 : 400,
                transition: "all 0.15s", textTransform: "capitalize",
              }}>{t}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {diffs.map((d) => {
            const dc = DIFF_COLORS[d] || {};
            return (
              <button key={d} onClick={() => setFilterDiff(d)} style={{
                padding: "6px 13px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                background: filterDiff === d ? (dc.bg || "var(--accent-light)") : "var(--surface)",
                color: filterDiff === d ? (dc.color || "var(--accent)") : "var(--text-2)",
                border: `1px solid ${filterDiff === d ? (dc.border || "var(--accent-mid)") : "var(--border)"}`,
                fontFamily: "var(--font-body)", fontWeight: filterDiff === d ? 600 : 400,
                transition: "all 0.15s", textTransform: "capitalize",
              }}>{d}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSelected(new Set(filtered.map((q) => q.id)))}>All</button>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSelected(new Set())}>None</button>
        </div>
      </div>

      {/* Question list */}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)", fontSize: 14 }}>
            No questions match the current filters
          </div>
        )}
        {filtered.map((q) => (
          <QuestionCard key={q.id} question={q} selected={selected.has(q.id)} onToggle={toggleSelect} />
        ))}
      </div>

      {/* Sticky footer */}
      {selected.size > 0 && (
        <div style={{
          position: "sticky", bottom: 20, marginTop: 20,
          background: "var(--surface)", border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-lg)", padding: "14px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "var(--shadow-md)",
        }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{selected.size}</span>
            <span style={{ fontSize: 13.5, color: "var(--text-2)", marginLeft: 8 }}>questions selected</span>
          </div>
          <button className="btn btn-primary" onClick={() => onFinalize(selectedQuestions)} style={{ fontSize: 14, padding: "10px 24px" }}>
            Generate PDF
          </button>
        </div>
      )}
    </div>
  );
}
