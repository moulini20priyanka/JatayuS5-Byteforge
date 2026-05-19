
import { useState } from "react";


export const C = {
  bg:           "#CFF4F7",
  sidebar:      "#F2FBFF",
  border:       "#b8eaee",
  text:         "#0A2A41",
  muted:        "#3d6878",
  dim:          "#7aacba",
  primary:      "#2BB1A8",
  primaryLight: "#d9f2f4",
  primaryHover: "#1d9e96",
  success:      "#0a8f5c",
  successLight: "#d9f5ec",
  danger:       "#dc2626",
  dangerLight:  "#fee2e2",
  warning:      "#b45309",
  warningLight: "#fef3c7",
  navy:         "#0A2A41",
  paleAqua:     "#CFF4F7",
  lightCyan:    "#F2FBFF",
  white:        "#ffffff",
};

// ── Risk Level Helper ──
const RISK = (score) => {
  if (score >= 70) return { label: "High Risk",   color: "#dc2626", bg: "#fee2e2" };
  if (score >= 40) return { label: "Medium Risk", color: "#b45309", bg: "#fef3c7" };
  return               { label: "Clean",          color: "#0a8f5c", bg: "#d9f5ec" };
};

// ── Plagiarism Panel Component ──
export default function PlagiarismPanel() {
  const [input,         setInput]         = useState("exam_001");
  const [examId,        setExamId]        = useState("exam_001");
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [selected,      setSelected]      = useState(null);
  const [timeline,      setTimeline]      = useState([]);
  const [compare,       setCompare]       = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchReport = async (id) => {
    const eid = id || examId;
    setLoading(true); setError(""); setSelected(null); setTimeline([]); setCompare(null);
    try {
      const res  = await fetch(`${process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'}/api/reports/${eid}`);
      const data = await res.json();
      if (data.students) setStudents(data.students);
      else { setStudents([]); setError("No data found for this exam ID."); }
    } catch {
      setError("Could not connect to backend. Make sure the server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const openStudent = async (s) => {
    setSelected(s); setCompare(null); setLoadingDetail(true);
    try {
      const res  = await fetch(`${process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'}/api/reports/${examId}/${s.student_id}/timeline`);
      const data = await res.json();
      setTimeline(data.timeline || []);
    } catch { setTimeline([]); }
    setLoadingDetail(false);
  };

  const fetchCompare = async () => {
    if (!selected) return;
    try {
      const res  = await fetch(`${process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'}/api/reports/${examId}/${selected.student_id}/compare`);
      const data = await res.json();
      setCompare(data);
    } catch { setCompare(null); }
  };

  const highRisk     = students.filter(s => s.plagiarism_score >= 70).length;
  const mediumRisk   = students.filter(s => s.plagiarism_score >= 40 && s.plagiarism_score < 70).length;
  const totalChanges = students.reduce((a, s) => a + (s.change_count || 0), 0);

  return (
    <div>
      {/* Search Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Exam ID</label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setExamId(input); fetchReport(input); } }}
            placeholder="e.g. exam_001"
            style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, width: 220, fontFamily: "inherit", outline: "none" }}
          />
        </div>
        <button
          onClick={() => { setExamId(input); fetchReport(input); }}
          style={{ padding: "10px 22px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          {loading ? "Loading…" : "Load Report"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {students.length > 0 && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total Students", value: students.length, color: C.primary },
              { label: "High Risk",      value: highRisk,        color: "#dc2626" },
              { label: "Medium Risk",    value: mediumRisk,      color: "#b45309" },
              { label: "Total Edits",    value: totalChanges,    color: C.navy   },
            ].map(card => (
              <div key={card.label} style={{ background: C.white, borderRadius: 12, padding: "16px 20px", border: `1px solid ${C.border}`, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontWeight: 500 }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>

            {/* Student List */}
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 1px 3px rgba(43,177,168,0.06)` }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14, color: C.text }}>
                Student Results — {students.length} candidates
              </div>
              {students.map(s => {
                const risk     = RISK(s.plagiarism_score);
                const isActive = selected?.student_id === s.student_id;
                return (
                  <div
                    key={s.student_id}
                    onClick={() => openStudent(s)}
                    style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: isActive ? C.primaryLight : "transparent", transition: "background 0.15s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{s.student_id}</div>
                        <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
                          {s.change_count} snapshots · Last active: {s.last_active ? new Date(s.last_active).toLocaleTimeString() : "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 80, height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${s.plagiarism_score}%`, height: "100%", background: risk.color, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: risk.color, minWidth: 36 }}>{s.plagiarism_score}%</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: risk.bg, color: risk.color }}>{risk.label}</span>
                      </div>
                    </div>
                    {s.matched_with && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>Matched with: {s.matched_with}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, boxShadow: `0 1px 3px rgba(43,177,168,0.06)`, overflowY: "auto", maxHeight: 600 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{selected.student_id}</h3>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20 }}>✕</button>
                </div>

                {loadingDetail ? (
                  <div style={{ textAlign: "center", padding: 32, color: C.dim, fontSize: 13 }}>Loading…</div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                      {[
                        { label: "Plagiarism Score", value: `${selected.plagiarism_score}%`, color: RISK(selected.plagiarism_score).color },
                        { label: "Code Changes",     value: selected.change_count,            color: C.text },
                        { label: "Matched With",     value: selected.matched_with || "—",     color: selected.matched_with ? "#dc2626" : C.text },
                        { label: "Last Checked",     value: selected.checked_at ? new Date(selected.checked_at).toLocaleString() : "—", color: C.text },
                      ].map(item => (
                        <div key={item.label} style={{ background: C.lightCyan, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline Chart */}
                    {timeline.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Code Growth Timeline</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                          {timeline.map((t, i) => {
                            const maxChars = Math.max(...timeline.map(x => x.chars), 1);
                            const height   = Math.max(4, (t.chars / maxChars) * 56);
                            return (
                              <div key={i}
                                title={`Snapshot ${t.snapshot} — ${t.chars} chars\n${new Date(t.timestamp).toLocaleTimeString()}`}
                                style={{ flex: 1, height, background: C.primary, borderRadius: "2px 2px 0 0", opacity: 0.4 + (i / timeline.length) * 0.6 }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, marginTop: 4 }}>
                          <span>Start</span><span>{timeline.length} snapshots</span><span>Latest</span>
                        </div>
                      </div>
                    )}

                    {/* Compare Button */}
                    {selected.matched_with && (
                      <button
                        onClick={fetchCompare}
                        style={{ width: "100%", padding: 10, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14 }}
                      >
                        Show Side-by-Side Code Comparison
                      </button>
                    )}

                    {/* Code Comparison */}
                    {compare?.studentA && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Code Comparison</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[compare.studentA, compare.studentB].map(st => (
                            <div key={st.id}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 4 }}>{st.id}</div>
                              <pre style={{ fontSize: 11, background: C.lightCyan, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, overflowX: "auto", maxHeight: 180, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace" }}>
                                {st.code || "(empty)"}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 48, color: C.dim, fontSize: 14, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
          Enter an exam ID above and click <strong>Load Report</strong> to view plagiarism data.
        </div>
      )}
    </div>
  );
}
