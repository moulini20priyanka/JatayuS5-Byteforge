// frontend/src/components/HiringReportModal.jsx
// View Report popup for hiring/placement exams only.
// Shows: candidate info, exam status, GitHub + LeetCode agent data,
//        test scores, insights. Clean, matches your existing Reports UI style.

import { useState, useEffect } from "react";

const API       = (process.env.REACT_APP_API_URL || "http://localhost:5000") + "/api";
const getToken  = () => localStorage.getItem("token") || "";

/* ── Theme — matches your Reports page ──────────────────────────── */
const T = {
  bg:       "#f4f8fb",
  white:    "#ffffff",
  border:   "#e8edf2",
  shadow:   "0 2px 12px rgba(0,0,0,0.08)",
  navy:     "#0f172a",
  text:     "#1e293b",
  muted:    "#64748b",
  dim:      "#94a3b8",
  accent:   "#2563eb",
  softBlue: "#eff6ff",
  green:    "#16a34a",
  greenBg:  "#f0fdf4",
  greenBdr: "#bbf7d0",
  red:      "#dc2626",
  redBg:    "#fef2f2",
  redBdr:   "#fecaca",
  orange:   "#ea580c",
  orangeBg: "#fff7ed",
  purple:   "#7c3aed",
  purpleBg: "#f5f3ff",
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function Bar({ label, value, max = 100 }) {
  const pct = max ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const c   = pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, color: T.text }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: c, fontFamily: "monospace" }}>
          {value ?? 0}<span style={{ color: T.dim, fontWeight: 400 }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 7, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 99, transition: "width .5s" }} />
      </div>
    </div>
  );
}

function Tag({ text, color = T.accent, bg }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: bg || (color + "18"), color,
    }}>{text}</span>
  );
}

function SectionCard({ title, color = T.accent, children }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "11px 16px", background: "#f8fafc",
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${color}`,
        fontSize: 12, fontWeight: 800, color: T.navy }}>
        {title}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

function StatRow({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "center", padding: "7px 0",
      borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
        fontFamily: mono ? "monospace" : "inherit" }}>{value ?? "—"}</span>
    </div>
  );
}

function ScoreRing({ score, max = 100, size = 64 }) {
  const pct  = Math.min(((score || 0) / max) * 100, 100);
  const c    = pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red;
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="6"
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={T.navy} fontSize="14" fontWeight="800">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

function LangChip({ lang }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: T.softBlue, color: T.accent, border: "1px solid #bfdbfe",
      margin: "2px 3px 2px 0", display: "inline-block" }}>{lang}</span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN MODAL                                                      */
/* ═══════════════════════════════════════════════════════════════ */
export default function HiringReportModal({ studentId, studentName, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("overview");

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetch(`${API}/hiring-report/student/${studentId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)))
      .then(d  => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [studentId]);

  const cand    = data?.candidate    || {};
  const urls    = data?.urls         || {};
  const exam    = data?.exam         || null;
  const gh      = data?.github_data  || null;
  const lc      = data?.leetcode_data|| null;
  const ts      = data?.test_scores  || null;
  const ag      = data?.agent_status || {};
  const insights= data?.insights     || [];

  const tabs = [
    { id: "overview",  label: "Overview"  },
    { id: "github",    label: "GitHub"    },
    { id: "leetcode",  label: "LeetCode"  },
    { id: "test",      label: "Test Score"},
    { id: "insights",  label: "Insights"  },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: T.bg, borderRadius: 16, width: "100%", maxWidth: 820,
          maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ padding: "16px 22px", background: T.white,
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>

          {/* Avatar */}
          <div style={{ width: 44, height: 44, borderRadius: "50%",
            background: T.softBlue, border: `2px solid ${T.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
            {(cand.name || studentName || "S")[0].toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>
              {cand.name || studentName || "Student"}
            </div>
            <div style={{ fontSize: 11.5, color: T.dim }}>
              {cand.email} {cand.college ? `· ${cand.college}` : ""}
            </div>
            {exam && (
              <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 2 }}>
                {exam.title}
              </div>
            )}
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {exam && (
              <Tag
                text={exam.status === "submitted" ? "Completed" : exam.status === "started" ? "In Progress" : "Assigned"}
                color={exam.status === "submitted" ? T.green : exam.status === "started" ? T.orange : T.muted}
              />
            )}
            {ts && (
              <div style={{ textAlign: "center" }}>
                <ScoreRing score={ts.total} max={ts.max} size={52} />
                <div style={{ fontSize: 9.5, color: T.dim, fontFamily: "monospace" }}>TEST</div>
              </div>
            )}
          </div>

          <button onClick={onClose}
            style={{ background: "none", border: `1px solid ${T.border}`,
              borderRadius: 7, width: 30, height: 30, cursor: "pointer",
              fontSize: 16, color: T.muted, flexShrink: 0 }}>×</button>
        </div>

        {/* ── Agent status bar ── */}
        {!loading && data && (
          <div style={{ padding: "8px 22px", background: "#f0f7ff",
            borderBottom: `1px solid ${T.border}`, flexShrink: 0,
            display: "flex", gap: 16, fontSize: 11.5 }}>
            <span style={{ color: ag.github_fetched ? T.green : T.orange, fontWeight: 600 }}>
              {ag.github_fetched ? "✓ GitHub fetched" : urls.github ? "⏳ GitHub pending" : "— No GitHub URL"}
            </span>
            <span style={{ color: ag.leetcode_fetched ? T.green : T.orange, fontWeight: 600 }}>
              {ag.leetcode_fetched ? "✓ LeetCode fetched" : urls.leetcode ? "⏳ LeetCode pending" : "— No LeetCode URL"}
            </span>
            <span style={{ color: T.dim }}>
              LinkedIn — disabled
            </span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: "flex", background: T.white,
          borderBottom: `1px solid ${T.border}`, paddingLeft: 12, flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 16px", fontSize: 12.5,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? T.accent : T.muted,
              borderBottom: tab === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>

          {loading && (
            <div style={{ padding: 60, textAlign: "center", color: T.muted }}>
              Loading report data...
            </div>
          )}

          {error && (
            <div style={{ padding: 30, textAlign: "center", color: T.red }}>
              {error}
            </div>
          )}

          {!loading && data && (

            /* ════ OVERVIEW ════ */
            tab === "overview" ? (
              <div>
                {/* Candidate info */}
                <SectionCard title="Candidate Information" color={T.accent}>
                  <StatRow label="Name"     value={cand.name} />
                  <StatRow label="Email"    value={cand.email} />
                  <StatRow label="College"  value={cand.college} />
                  <StatRow label="GitHub"   value={urls.github   || "Not provided"} mono />
                  <StatRow label="LeetCode" value={urls.leetcode || "Not provided"} mono />
                </SectionCard>

                {/* Exam status */}
                {exam && (
                  <SectionCard title="Exam Status" color={T.purple}>
                    <StatRow label="Exam"       value={exam.title} />
                    <StatRow label="Status"     value={exam.status} />
                    <StatRow label="Started"    value={exam.started_at
                      ? new Date(exam.started_at).toLocaleString() : "—"} />
                    <StatRow label="Submitted"  value={exam.submitted_at
                      ? new Date(exam.submitted_at).toLocaleString() : "—"} />
                    <StatRow label="Duration"   value={exam.duration_minutes
                      ? `${exam.duration_minutes} min` : "—"} />
                  </SectionCard>
                )}

                {/* Quick scores grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                  {[
                    { label: "GitHub Score",   val: gh?.coding_skill_score  ?? "—", color: T.accent  },
                    { label: "LeetCode Score", val: lc?.problem_solving_score ?? "—", color: T.green  },
                    { label: "Test Score",     val: ts ? `${ts.total}/${ts.max}` : "—", color: T.purple },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.white, border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: "14px 16px", textAlign: "center",
                      borderTop: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: T.dim, fontFamily: "monospace", marginTop: 4 }}>
                        {s.label.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top insights */}
                {insights.length > 0 && (
                  <SectionCard title="Key Observations" color={T.orange}>
                    {insights.slice(0, 4).map((ins, i) => (
                      <div key={i} style={{ display: "flex", gap: 9, padding: "8px 0",
                        borderBottom: i < insights.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <span style={{ fontSize: 13, flexShrink: 0,
                          color: ins.type === "positive" ? T.green : ins.type === "warning" ? T.orange : T.accent }}>
                          {ins.type === "positive" ? "✓" : ins.type === "warning" ? "⚠" : "ℹ"}
                        </span>
                        <div>
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                            color: T.muted, marginRight: 6 }}>{ins.section}</span>
                          <span style={{ fontSize: 12.5, color: T.text }}>{ins.message}</span>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                )}
              </div>

            /* ════ GITHUB ════ */
            ) : tab === "github" ? (
              <div>
                {!gh ? (
                  <div style={{ padding: 50, textAlign: "center", color: T.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      {urls.github ? "GitHub analysis pending" : "No GitHub URL found in resume"}
                    </div>
                    {urls.github && <div style={{ fontSize: 12, color: T.dim, marginTop: 5 }}>
                      Agent will populate this section automatically
                    </div>}
                  </div>
                ) : (
                  <>
                    {/* Score header */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center",
                      padding: "16px", background: T.softBlue, borderRadius: 12,
                      border: "1px solid #bfdbfe", marginBottom: 14 }}>
                      <ScoreRing score={gh.coding_skill_score} max={100} size={64} />
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>
                          {gh.username}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                          {gh.public_repos} repos · {gh.followers} followers
                        </div>
                        <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
                          Account age: {gh.account_age_days} days
                        </div>
                      </div>
                    </div>

                    {/* Sub scores */}
                    <SectionCard title="Activity Breakdown" color={T.accent}>
                      <Bar label="Coding Skill Score" value={gh.coding_skill_score} max={100} />
                      <Bar label="Consistency"        value={gh.consistency?.score}  max={100} />
                      <Bar label="Repo Quality"       value={gh.sub_scores?.repo_quality}    max={60} />
                      <Bar label="Language Spread"    value={gh.sub_scores?.language_spread} max={25} />
                      <Bar label="Commit Activity"    value={gh.sub_scores?.commit_activity} max={15} />
                    </SectionCard>

                    <SectionCard title="Stats" color={T.purple}>
                      <StatRow label="Active Repos (6m)"  value={gh.active_repos} />
                      <StatRow label="Total Repos"        value={gh.total_repos} />
                      <StatRow label="Total Stars"        value={gh.total_stars} />
                      <StatRow label="Weekly Push Events" value={gh.weekly_push_events} />
                      <StatRow label="Commits Sampled"    value={gh.total_commits_sampled} />
                    </SectionCard>

                    <SectionCard title="Top Languages" color={T.green}>
                      <div style={{ display: "flex", flexWrap: "wrap", padding: "4px 0" }}>
                        {(gh.top_languages || []).map(l => <LangChip key={l} lang={l} />)}
                        {(!gh.top_languages?.length) && <span style={{ color: T.dim, fontSize: 12 }}>None detected</span>}
                      </div>
                    </SectionCard>

                    {gh.repos?.length > 0 && (
                      <SectionCard title="Recent Repositories" color={T.orange}>
                        {gh.repos.slice(0, 5).map((r, i) => (
                          <div key={i} style={{ padding: "8px 0",
                            borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.accent }}>{r.name}</span>
                              <span style={{ fontSize: 11, color: T.dim }}>★ {r.stars}</span>
                            </div>
                            {r.description && (
                              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                                {r.description.slice(0, 80)}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                              {r.language} · {new Date(r.updated).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </SectionCard>
                    )}
                  </>
                )}
              </div>

            /* ════ LEETCODE ════ */
            ) : tab === "leetcode" ? (
              <div>
                {!lc ? (
                  <div style={{ padding: 50, textAlign: "center", color: T.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      {urls.leetcode ? "LeetCode analysis pending" : "No LeetCode URL found in resume"}
                    </div>
                    {urls.leetcode && <div style={{ fontSize: 12, color: T.dim, marginTop: 5 }}>
                      Agent will populate this section automatically
                    </div>}
                  </div>
                ) : (
                  <>
                    {/* Score header */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center",
                      padding: "16px", background: T.greenBg, borderRadius: 12,
                      border: `1px solid ${T.greenBdr}`, marginBottom: 14 }}>
                      <ScoreRing score={lc.problem_solving_score} max={100} size={64} />
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>
                          {lc.username}
                          {lc.real_name && <span style={{ fontSize: 13, color: T.muted, marginLeft: 8 }}>({lc.real_name})</span>}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                          {lc.total_solved} problems solved
                          {lc.ranking ? ` · Global rank #${lc.ranking.toLocaleString()}` : ""}
                        </div>
                        {lc.country && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{lc.country}</div>}
                      </div>
                    </div>

                    {/* Problem breakdown */}
                    <SectionCard title="Problem Breakdown" color={T.green}>
                      <Bar label="Problem Solving Score" value={lc.problem_solving_score} max={100} />
                      <Bar label="Consistency"           value={lc.consistency?.score}    max={100} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 6 }}>
                        {[
                          { label: "Easy",   val: lc.easy,   color: T.green  },
                          { label: "Medium", val: lc.medium, color: T.orange  },
                          { label: "Hard",   val: lc.hard,   color: T.red    },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: "center", padding: "12px",
                            background: T.white, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: T.dim, fontFamily: "monospace" }}>
                              {s.label.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    {lc.top_languages?.length > 0 && (
                      <SectionCard title="Languages Used" color={T.accent}>
                        <div style={{ display: "flex", flexWrap: "wrap", padding: "4px 0" }}>
                          {lc.top_languages.map(l => (
                            <LangChip key={l.name} lang={`${l.name} (${l.count})`} />
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    <SectionCard title="Difficulty Ratios" color={T.purple}>
                      <StatRow label="Easy %"   value={`${lc.sub_scores?.easy_ratio   ?? 0}%`} mono />
                      <StatRow label="Medium %"  value={`${lc.sub_scores?.medium_ratio ?? 0}%`} mono />
                      <StatRow label="Hard %"    value={`${lc.sub_scores?.hard_ratio   ?? 0}%`} mono />
                    </SectionCard>
                  </>
                )}
              </div>

            /* ════ TEST SCORE ════ */
            ) : tab === "test" ? (
              <div>
                {!ts ? (
                  <div style={{ padding: 50, textAlign: "center", color: T.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      {exam
                        ? exam.status === "started"
                          ? "Exam in progress — score not yet available"
                          : "Student has not submitted the exam yet"
                        : "No exam assignment found"}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                      <div style={{ textAlign: "center", padding: "24px 40px",
                        background: T.white, border: `1px solid ${T.border}`,
                        borderRadius: 16, boxShadow: T.shadow }}>
                        <ScoreRing score={ts.total} max={ts.max} size={80} />
                        <div style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginTop: 8 }}>
                          {ts.total}<span style={{ fontSize: 14, color: T.dim }}>/{ts.max}</span>
                        </div>
                        <div style={{ fontSize: 13, color: ts.pct >= 70 ? T.green : ts.pct >= 40 ? T.orange : T.red,
                          fontWeight: 700 }}>{ts.pct}%</div>
                        {ts.exam_title && <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{ts.exam_title}</div>}
                      </div>
                    </div>

                    {/* All assignments */}
                    {data.all_assignments?.length > 0 && (
                      <SectionCard title="All Exam Attempts" color={T.purple}>
                        {data.all_assignments.map((a, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", padding: "8px 0",
                            borderBottom: i < data.all_assignments.length - 1 ? `1px solid ${T.border}` : "none" }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{a.exam_title}</div>
                              <div style={{ fontSize: 11, color: T.dim }}>
                                {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : a.status}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              {a.score != null ? (
                                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                                  color: T.accent }}>{a.score}/{a.total_marks}</span>
                              ) : (
                                <span style={{ fontSize: 11, color: T.dim }}>{a.status}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </SectionCard>
                    )}
                  </>
                )}
              </div>

            /* ════ INSIGHTS ════ */
            ) : tab === "insights" ? (
              <div>
                {insights.length === 0 ? (
                  <div style={{ padding: 50, textAlign: "center", color: T.muted }}>
                    No insights available yet — agents still processing.
                  </div>
                ) : (
                  <SectionCard title="AI Observations" color={T.orange}>
                    {insights.map((ins, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0",
                        borderBottom: i < insights.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <span style={{ fontSize: 15, flexShrink: 0,
                          color: ins.type === "positive" ? T.green : ins.type === "warning" ? T.orange : T.accent }}>
                          {ins.type === "positive" ? "✓" : ins.type === "warning" ? "⚠" : "ℹ"}
                        </span>
                        <div>
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                            padding: "1px 7px", borderRadius: 20, marginRight: 7,
                            background: ins.type === "positive" ? T.greenBg : ins.type === "warning" ? T.orangeBg : T.softBlue,
                            color: ins.type === "positive" ? T.green : ins.type === "warning" ? T.orange : T.accent }}>
                            {ins.section?.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 13, color: T.text }}>{ins.message}</span>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                )}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}