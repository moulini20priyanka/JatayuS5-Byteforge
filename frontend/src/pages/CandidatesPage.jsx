// CandidatesPage.jsx — Candidates table with college + criteria filters
import { useState, useEffect } from "react";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = "http://localhost:5000/api";

// ── Score Ring ────────────────────────────────────────────────────
function ScoreRing({ score, size = 40, color = C.accent }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+3} textAnchor="middle" fill={C.text}
        fontSize={size/4} fontWeight="700" fontFamily="'Outfit', sans-serif">
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

// ── Report Modal ──────────────────────────────────────────────────
function ReportModal({ candidate, onClose }) {
  const [tab, setTab] = useState("overview");
  if (!candidate) return null;

  const ev    = candidate.__evaluation;
  const score = candidate.total_score || 0;
  const ringC = score >= 70 ? C.green : score >= 40 ? C.orange : C.red;
  const decC  = ev?.decision === "Hire" ? C.green : ev?.decision === "Reject" ? C.red : C.orange;
  const decBg = ev?.decision === "Hire" ? C.greenBg : ev?.decision === "Reject" ? C.redBg : C.orangeBg;

  const langs = (() => { try { return JSON.parse(candidate.github_top_languages || "[]"); } catch { return []; } })();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(10,42,65,0.25)", animation: "fadeUp 0.2s ease" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "18px 24px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.accentLight, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
            {(candidate.name || candidate.student_id || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{candidate.name || candidate.student_id}</div>
              {ev?.decision && <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decBg, color: decC }}>{ev.decision}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>{candidate.college || "—"} · {candidate.email || ""}</div>
          </div>
          <ScoreRing score={score} size={52} color={ringC}/>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: C.muted }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.border}`, paddingLeft: 16, flexShrink: 0 }}>
          {[{ id: "overview", label: "Overview" }, { id: "ai", label: ev ? "AI Report" : "AI Report" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "11px 18px", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.accent : C.muted, borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
                {[
                  { label: "GitHub",   value: candidate.github_score || 0,           color: C.purple, sub: `${candidate.github_repos || 0} repos`    },
                  { label: "LeetCode", value: candidate.leetcode_score || 0,         color: C.green,  sub: `${candidate.leetcode_total_solved || 0} solved` },
                  { label: "LinkedIn", value: candidate.linkedin_score || 0,         color: C.blue,   sub: "Profile"         },
                  { label: "Test",     value: Math.round(candidate.test_score || 0), color: C.orange, sub: "MCQ+SQL+Code"    },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} style={{ background: C.white, borderRadius: 10, padding: "13px 15px", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{value}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>GitHub</div>
                  {[["Repositories", candidate.github_repos || 0], ["Followers", candidate.github_followers || 0]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {langs.map(l => <span key={l} style={{ fontSize: 10, background: C.purpleBg, color: C.purple, borderRadius: 20, padding: "1px 7px" }}>{l}</span>)}
                  </div>
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>LeetCode</div>
                  {[["Easy", candidate.leetcode_easy || 0, C.green], ["Medium", candidate.leetcode_medium || 0, C.orange], ["Hard", candidate.leetcode_hard || 0, C.red], ["Ranking", candidate.leetcode_ranking ? `#${Number(candidate.leetcode_ranking).toLocaleString()}` : "N/A", C.purple]].map(([l, v, col]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Test Performance</div>
                  {[["MCQ", candidate.mcq_score || 0, C.blue], ["SQL", candidate.sql_score || 0, C.green], ["Coding", candidate.coding_score || 0, C.orange]].map(([l, v, col]) => (
                    <div key={l} style={{ marginBottom: 9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{Math.round(v)}/100</span>
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 3, height: 4, overflow: "hidden" }}>
                        <div style={{ width: `${v}%`, height: "100%", background: col, borderRadius: 3 }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Profile URLs</div>
                  {[["GitHub", candidate.github_url], ["LinkedIn", candidate.linkedin_url], ["LeetCode", candidate.leetcode_url]].map(([l, url]) => url && (
                    <a key={l} href={url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 11, color: C.accent, marginBottom: 6, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l}: {url}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "ai" && (
            ev ? (
              <div>
                {/* Decision */}
                <div style={{ background: C.white, borderRadius: 10, padding: "16px 18px", marginBottom: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreRing score={ev.overall_score || 0} size={64} color={decC}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: decBg, color: decC }}>{ev.decision}</span>
                      <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent }}>Confidence: {ev.confidence}</span>
                      <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: C.muted }}>Risk: {ev.risk}</span>
                    </div>
                    {ev.recommendation && <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, margin: 0 }}>{ev.recommendation}</p>}
                  </div>
                </div>
                {/* Dimension scores */}
                <div style={{ background: C.white, borderRadius: 10, padding: "14px 18px", marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>Score Breakdown</div>
                  {[["Coding Skill", ev.dimension_scores?.coding_skill, C.purple], ["Problem Solving", ev.dimension_scores?.problem_solving, C.green], ["Consistency", ev.dimension_scores?.consistency, C.blue], ["Professional Presence", ev.dimension_scores?.professional_presence, C.orange], ["Test Performance", ev.dimension_scores?.test_performance, C.accent]].map(([l, v, col]) => v != null && (
                    <div key={l} style={{ marginBottom: 9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{Math.round(v)}</span>
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 3, height: 5, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(v, 100)}%`, height: "100%", background: col, borderRadius: 3, transition: "width 0.6s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Insights */}
                {(ev.insights || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Insights</div>
                    {ev.insights.map((ins, i) => {
                      const col = ins.type === "positive" ? C.green : ins.type === "warning" ? C.orange : C.blue;
                      const bg  = ins.type === "positive" ? C.greenBg : ins.type === "warning" ? C.orangeBg : C.blueBg;
                      return (
                        <div key={i} style={{ background: bg, borderRadius: 8, padding: "9px 12px", marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, marginTop: 5, flexShrink: 0 }}/>
                          <div>
                            {ins.section && <div style={{ fontSize: 9, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{ins.section.replace(/_/g, " ")}</div>}
                            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{ins.message}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" size={32} color={C.dim}/>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginTop: 12 }}>No AI Evaluation Yet</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>This candidate has not submitted their resume for evaluation.</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [college,    setCollege]    = useState("All");
  const [criteria,   setCriteria]   = useState(70);
  const [decision,   setDecision]   = useState("All");
  const [selected,   setSelected]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/reports/all`).then(async res => {
      const enriched = await Promise.allSettled(
        res.data.map(async row => {
          try {
            const ev = await axios.get(`${API}/report/evaluate/${row.student_id}`);
            return { ...row, __evaluation: ev.data };
          } catch {
            return { ...row, __evaluation: null };
          }
        })
      );
      setCandidates(enriched.map(r => r.status === "fulfilled" ? r.value : r.reason));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const colleges = ["All", ...Array.from(new Set(candidates.map(c => c.college).filter(Boolean)))];

  const filtered = candidates.filter(c => {
    const name   = (c.name || c.student_id || "").toLowerCase();
    const score  = c.total_score || 0;
    const dec    = c.__evaluation?.decision || null;
    return (
      name.includes(search.toLowerCase()) &&
      (college  === "All" || c.college === college) &&
      (decision === "All" || dec === decision) &&
      score >= 0
    );
  });

  const shortlisted = filtered.filter(c => (c.total_score || 0) >= criteria);
  const review      = filtered.filter(c => (c.total_score || 0) <  criteria);

  const ringColor = s => s >= criteria ? C.green : s >= criteria * 0.6 ? C.orange : C.red;
  const decColor  = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
  const decBg     = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

  function CandidateTable({ rows, emptyMsg }) {
    if (!rows.length) return <div style={{ padding: "24px", textAlign: "center", color: C.dim, fontSize: 13 }}>{emptyMsg}</div>;
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
              {["#", "Candidate", "College", "GitHub", "LeetCode", "Test", "Total", "AI Decision", "Action"].map((h, i) => (
                <th key={i} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const score = c.total_score || 0;
              const dec   = c.__evaluation?.decision;
              return (
                <tr key={c.student_id} className="r-row" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s", cursor: "pointer" }} onClick={() => setSelected(c)}>
                  <td style={{ padding: "12px 14px", color: C.dim, fontFamily: "monospace", fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                        {(c.name || c.student_id || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: C.text }}>{c.name || c.student_id}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{c.email || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: C.muted }}>{c.college || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 36, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${c.github_score || 0}%`, height: "100%", background: C.purple }}/>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{c.github_score || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 36, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${c.leetcode_score || 0}%`, height: "100%", background: C.green }}/>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{c.leetcode_score || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{Math.round(c.test_score || 0)}</td>
                  <td style={{ padding: "12px 14px" }}><ScoreRing score={score} size={38} color={ringColor(score)}/></td>
                  <td style={{ padding: "12px 14px" }}>
                    {dec ? <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decBg(dec), color: decColor(dec) }}>{dec}</span>
                         : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button className="r-btn-outline" onClick={e => { e.stopPropagation(); setSelected(c); }}
                      style={{ padding: "5px 12px", background: C.accentLight, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <RecruiterLayout title="Candidates" subtitle="Browse and filter candidates by college and performance criteria">

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, marginBottom: 24, alignItems: "center" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 14px" }}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={14} color={C.dim}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
            style={{ border: "none", outline: "none", fontSize: 13, color: C.text, background: "transparent", width: "100%" }}/>
        </div>

        {/* College filter */}
        <select value={college} onChange={e => setCollege(e.target.value)}
          style={{ padding: "8px 12px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
          {colleges.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Decision filter */}
        <select value={decision} onChange={e => setDecision(e.target.value)}
          style={{ padding: "8px 12px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
          {["All", "Hire", "Maybe", "Reject"].map(d => <option key={d}>{d}</option>)}
        </select>

        {/* Criteria buttons */}
        <div style={{ display: "flex", gap: 4, background: C.white, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3 }}>
          {[60, 70, 75, 80].map(c => (
            <button key={c} onClick={() => setCriteria(c)}
              style={{ padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", background: criteria === c ? C.accent : "transparent", color: criteria === c ? "#fff" : C.muted }}>
              {c}%
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",      value: filtered.length,                                   color: C.accent },
          { label: "Shortlisted", value: shortlisted.length,                                color: C.green  },
          { label: "Under Review", value: review.length,                                    color: C.orange },
          { label: "AI Evaluated", value: filtered.filter(c => c.__evaluation?.decision).length, color: C.purple },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "14px 18px", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading candidates...</div>
      ) : (
        <>
          {/* Shortlisted */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.greenBg }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Shortlisted — Score ≥ {criteria}%</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.green }}>{shortlisted.length} candidates</span>
            </div>
            <CandidateTable rows={shortlisted} emptyMsg="No shortlisted candidates at this criteria."/>
          </div>

          {/* Under Review */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.orangeBg }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>Under Review — Score &lt; {criteria}%</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.orange }}>{review.length} candidates</span>
            </div>
            <CandidateTable rows={review} emptyMsg="No candidates under review."/>
          </div>
        </>
      )}

      {selected && <ReportModal candidate={selected} onClose={() => setSelected(null)}/>}
    </RecruiterLayout>
  );
}