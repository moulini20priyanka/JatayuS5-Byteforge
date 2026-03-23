// ExamRequestsPage.jsx — connected to real backend
import { useState, useEffect } from "react";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PATTERNS = [
  "", "MCQ + SQL + Coding", "Technical Skills",
  "Aptitude + Coding", "Python + Statistics",
  "Cloud Infrastructure", "Node.js + API Design",
  "Behavioral Assessment", "Combined Assessment",
];

const COLLEGES = [
  "", "RMKEC", "IIT Madras", "VIT Vellore", "Anna University",
  "PSG Tech", "Coimbatore Institute of Technology", "Other",
];

const STATUS_COLOR = {
  pending:   { color: C.orange, bg: C.orangeBg, label: "Pending"   },
  approved:  { color: C.green,  bg: C.greenBg,  label: "Approved"  },
  rejected:  { color: C.red,    bg: C.redBg,    label: "Rejected"  },
  completed: { color: C.blue,   bg: C.blueBg,   label: "Completed" },
};

const EMPTY_FORM = {
  job_role: "", exam_type: "Placement", assessment_pattern: "",
  duration_minutes: "", specifications: "",
  target_college: "", target_batch_year: "",
};

export default function ExamRequestsPage() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [err,      setErr]      = useState("");
  const [filter,   setFilter]   = useState("all");

  const recruiterId    = localStorage.getItem("user_id")    || 1;
  const recruiterEmail = localStorage.getItem("user_email") || "";
  const companyName    = localStorage.getItem("company_name") || "";
  const token          = localStorage.getItem("token");

  // ── Fetch requests ─────────────────────────────────────────────
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/exam-requests?recruiter_id=${recruiterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const valid = form.job_role.trim() && form.exam_type && form.assessment_pattern && form.duration_minutes;

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setErr("");
    try {
      const res  = await fetch(`${API}/api/exam-requests`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          recruiter_id:      recruiterId,
          recruiter_email:   recruiterEmail,
          company_name:      companyName,
          job_role:          form.job_role,
          exam_type:         form.exam_type,
          assessment_pattern: form.assessment_pattern,
          duration_minutes:  parseInt(form.duration_minutes),
          specifications:    form.specifications,
          target_college:    form.target_college,
          target_batch_year: form.target_batch_year || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Submission failed"); return; }
      setSuccess(true);
      setForm(EMPTY_FORM);
      fetchRequests();
      setTimeout(() => setSuccess(false), 3500);
    } catch {
      setErr("Cannot reach server. Make sure backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered rows ───────────────────────────────────────────────
  const filtered = filter === "all"
    ? requests
    : requests.filter(r => r.status === filter);

  // ── Summary counts ──────────────────────────────────────────────
  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    approved:  requests.filter(r => r.status === "approved").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  return (
    <RecruiterLayout
      title="Exam Requests"
      subtitle="Submit hiring assessment requests — admin will review and create the exam"
    >
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Request Form ──────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "sticky", top: 76 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.accentLight }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>New Exam Request</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Admin will review and create the exam</div>
          </div>

          <div style={{ padding: 20 }}>
            {success ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenBg, border: `2px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon d="M5 13l4 4L19 7" size={22} color={C.green} strokeWidth={2.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Request Submitted!</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Admin will review your request and notify you once approved.</div>
              </div>
            ) : (
              <>
                {/* Job Role */}
                <Field label="Job Role *">
                  <input type="text" value={form.job_role}
                    onChange={e => set("job_role", e.target.value)}
                    placeholder="e.g. Senior Full Stack Engineer"
                    style={inputStyle(C)} />
                </Field>

                {/* Exam Type */}
                <Field label="Exam Type *">
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Placement", "Skill Certificate", "Internship"].map(t => (
                      <button key={t} onClick={() => set("exam_type", t)}
                        style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${form.exam_type === t ? C.accent : C.border}`, background: form.exam_type === t ? C.accentLight : C.bg, color: form.exam_type === t ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Assessment Pattern */}
                <Field label="Assessment Pattern *">
                  <select value={form.assessment_pattern}
                    onChange={e => set("assessment_pattern", e.target.value)}
                    style={selectStyle(C)}>
                    {PATTERNS.map(p => <option key={p} value={p}>{p || "Select pattern..."}</option>)}
                  </select>
                </Field>

                {/* Duration */}
                <Field label="Duration (minutes) *">
                  <input type="number" value={form.duration_minutes}
                    onChange={e => set("duration_minutes", e.target.value)}
                    placeholder="e.g. 120" min="30" max="300"
                    style={inputStyle(C)} />
                </Field>

                {/* Target College */}
                <Field label="Target College">
                  <select value={form.target_college}
                    onChange={e => set("target_college", e.target.value)}
                    style={selectStyle(C)}>
                    {COLLEGES.map(c => <option key={c} value={c}>{c || "Any college"}</option>)}
                  </select>
                </Field>

                {/* Batch Year */}
                <Field label="Target Batch Year">
                  <input type="number" value={form.target_batch_year}
                    onChange={e => set("target_batch_year", e.target.value)}
                    placeholder="e.g. 2025" min="2020" max="2030"
                    style={inputStyle(C)} />
                </Field>

                {/* Specifications */}
                <Field label="Additional Specifications">
                  <textarea value={form.specifications}
                    onChange={e => set("specifications", e.target.value)}
                    placeholder="e.g. Require proctoring, focus on system design, min CGPA 7.5..."
                    rows={3}
                    style={{ ...inputStyle(C), resize: "vertical", fontFamily: "inherit" }} />
                </Field>

                {err && (
                  <div style={{ padding: "8px 12px", background: C.redBg, border: `1px solid #fecdd3`, borderRadius: 8, fontSize: 12, color: C.red, marginBottom: 14 }}>
                    {err}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={!valid || submitting}
                  style={{ width: "100%", padding: "11px 20px", background: (!valid || submitting) ? "#e2e8f0" : C.accent, color: (!valid || submitting) ? C.dim : "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: (!valid || submitting) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                  <Icon d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={14} color="currentColor" strokeWidth={2.2} />
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Request History ───────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Request History</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Track all your submitted exam requests</div>
            </div>
            <button onClick={fetchRequests} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              ↻ Refresh
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
            {["all", "pending", "approved", "rejected", "completed"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${filter === f ? C.accent : C.border}`, background: filter === f ? C.accentLight : "transparent", color: filter === f ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s", textTransform: "capitalize" }}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ marginLeft: 5, background: filter === f ? C.accent : C.border, color: filter === f ? "#fff" : C.muted, borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: C.dim, fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: C.dim }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: .4 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {filter === "all" ? "No requests yet — submit your first exam request!" : `No ${filter} requests`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
                    {["#", "Job Role", "Type", "Pattern", "Duration", "College", "Batch", "Submitted", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const sc = STATUS_COLOR[r.status] || STATUS_COLOR.pending;
                    return (
                      <tr key={r.id} className="r-row" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: C.accent, fontWeight: 600 }}>#{r.id}</td>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.job_role}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: C.accentLight, color: C.accent }}>{r.exam_type}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.assessment_pattern || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{r.duration_minutes} min</td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12 }}>{r.target_college || "Any"}</td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12 }}>{r.target_batch_year || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.dim, fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                          {r.status === "rejected" && r.reject_reason && (
                            <div style={{ fontSize: 10, color: C.red, marginTop: 3, fontStyle: "italic" }}>{r.reject_reason}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer summary */}
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 20, background: "#f8fbfc" }}>
            {[["Total", counts.all, C.accent], ["Approved", counts.approved, C.green], ["Pending", counts.pending, C.orange], ["Rejected", counts.rejected, C.red]].map(([l, v, col]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
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

// ── Helpers ──────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#1a2e3d", marginBottom: 6, letterSpacing: "0.2px" }}>{label}</label>
      {children}
    </div>
  );
}

function inputStyle(C) {
  return {
    width: "100%", padding: "9px 12px",
    border: `1px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, color: C.text, background: C.bg,
    outline: "none", fontFamily: "inherit",
    transition: "border-color .15s",
  };
}

function selectStyle(C) {
  return {
    width: "100%", padding: "9px 12px",
    border: `1px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, color: C.text, background: C.bg,
    outline: "none", cursor: "pointer",
  };
}