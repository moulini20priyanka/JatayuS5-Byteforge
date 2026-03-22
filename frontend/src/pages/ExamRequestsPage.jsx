// ExamRequestsPage.jsx
import { useState } from "react";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const HISTORY = [
  { id: "REQ-001", role: "Frontend Developer",  pattern: "Aptitude + Coding",      duration: 90,  date: "2025-10-12", status: "Approved" },
  { id: "REQ-002", role: "Data Scientist",       pattern: "Python + Statistics",    duration: 120, date: "2025-10-14", status: "Pending"  },
  { id: "REQ-003", role: "DevOps Engineer",      pattern: "Cloud Infrastructure",   duration: 100, date: "2025-10-15", status: "Approved" },
  { id: "REQ-004", role: "Full Stack Developer", pattern: "MCQ + SQL + Coding",     duration: 120, date: "2025-11-01", status: "Pending"  },
  { id: "REQ-005", role: "Backend Engineer",     pattern: "Node.js + API Design",   duration: 90,  date: "2025-11-10", status: "Approved" },
];

export default function ExamRequestsPage() {
  const [form, setForm] = useState({ jobRole: "", pattern: "", duration: "", specs: "" });
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState("All");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.jobRole || !form.pattern || !form.duration) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ jobRole: "", pattern: "", duration: "", specs: "" });
    }, 3000);
  };

  const rows = filter === "All" ? HISTORY : HISTORY.filter(r => r.status === filter);

  const statColor = s => s === "Approved" ? C.green  : C.orange;
  const statBg    = s => s === "Approved" ? C.greenBg : C.orangeBg;

  return (
    <RecruiterLayout title="Exam Requests" subtitle="Submit and track assessment requests for job roles">
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Request Form ─────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.accentLight }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>New Request</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Submit a new exam requirement</div>
          </div>
          <div style={{ padding: "20px" }}>

            {submitted ? (
              <div style={{ padding: "32px 20px", textAlign: "center", animation: "fadeUp 0.25s ease" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.greenBg, border: `2px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon d="M5 13l4 4L19 7" size={20} color={C.green} strokeWidth={2.5}/>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Request Submitted</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Your request has been sent for admin approval.</div>
              </div>
            ) : (
              <>
                {[
                  { label: "Target Job Role", key: "jobRole", type: "input", placeholder: "e.g. Senior Full Stack Engineer" },
                  { label: "Assessment Pattern", key: "pattern", type: "select", options: ["", "Technical Skills", "Behavioral Assessment", "Aptitude Test", "MCQ + SQL + Coding", "Combined Assessment"] },
                  { label: "Duration (minutes)", key: "duration", type: "number", placeholder: "e.g. 120" },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6, letterSpacing: "0.2px" }}>{field.label}</label>
                    {field.type === "select" ? (
                      <select value={form[field.key]} onChange={e => set(field.key, e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.bg, outline: "none", cursor: "pointer" }}>
                        {field.options.map(o => <option key={o} value={o}>{o || "Select pattern..."}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={form[field.key]} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder}
                        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.bg, outline: "none" }}
                        onFocus={e => e.target.style.borderColor = C.accent}
                        onBlur={e  => e.target.style.borderColor = C.border}/>
                    )}
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>Additional Specifications</label>
                  <textarea value={form.specs} onChange={e => set("specs", e.target.value)} placeholder="e.g. Require strict proctoring, focus on system design..."
                    style={{ width: "100%", minHeight: 80, padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.bg, outline: "none", resize: "vertical", fontFamily: "inherit" }}
                    onFocus={e => e.target.style.borderColor = C.accent}
                    onBlur={e  => e.target.style.borderColor = C.border}/>
                </div>

                <button onClick={handleSubmit}
                  disabled={!form.jobRole || !form.pattern || !form.duration}
                  style={{ width: "100%", padding: "11px 20px", background: (!form.jobRole || !form.pattern || !form.duration) ? "#e2e8f0" : C.accent, color: (!form.jobRole || !form.pattern || !form.duration) ? C.dim : "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: (!form.jobRole || !form.pattern || !form.duration) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                  <Icon d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={14} color="currentColor" strokeWidth={2.2}/>
                  Submit Request
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Request History ───────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Request History</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Track status of all submitted requests</div>
            </div>
            {/* Status filter */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
              {["All", "Approved", "Pending"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s", background: filter === f ? C.accent : "transparent", color: filter === f ? "#fff" : C.muted }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
                  {["Request ID", "Job Role", "Assessment Pattern", "Duration", "Date", "Status"].map((h, i) => (
                    <th key={i} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="r-row" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: C.accent, fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: C.text }}>{r.role}</td>
                    <td style={{ padding: "12px 16px", color: C.muted }}>{r.pattern}</td>
                    <td style={{ padding: "12px 16px", color: C.muted }}>{r.duration} min</td>
                    <td style={{ padding: "12px 16px", color: C.dim, fontSize: 12 }}>{r.date}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: statBg(r.status), color: statColor(r.status) }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 20, background: "#f8fbfc" }}>
            {[["Total", HISTORY.length, C.accent], ["Approved", HISTORY.filter(r => r.status === "Approved").length, C.green], ["Pending", HISTORY.filter(r => r.status === "Pending").length, C.orange]].map(([l, v, col]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }}/>
                <span style={{ fontSize: 11, color: C.muted }}>{l}:</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}