<<<<<<< HEAD
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
=======
// ExamRequestsPage.jsx — Wizard-style multi-step form
import { useState, useEffect } from "react";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

// ✅ FIXED: CRA uses process.env.REACT_APP_* (not import.meta.env which is Vite-only)
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── Icon paths ──────────────────────────────────────────────────
const IC = {
  send:      "M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13",
  refresh:   "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  check:     "M20 6L9 17L4 12",
  chevRight: "M9 18l6-6-6-6",
  chevLeft:  "M15 18l-6-6 6-6",
  info:      "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  calendar:  "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock:     "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2",
  user:      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  building:  "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4",
  mic:       "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  keyboard:  "M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 15H6M18 15h-8M6 11h.01M10 11h.01M14 11h.01M18 11h.01",
  filter:    "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  percent:   "M19 5L5 19M6.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  hash:      "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  layers:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  sliders:   "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  award:     "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  grid:      "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  scissors:  "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12",
  target:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
};

const Ic = ({ d, size = 14, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

// ── Constants ───────────────────────────────────────────────────
const MULTI_SECTION_PATTERNS = ["mcq_sql_coding", "mcq_sql", "aptitude_coding", "combined"];

const ASSESSMENT_PATTERNS = [
  { value: "mcq_sql_coding",  label: "MCQ + SQL + Coding",     sections: ["mcq","sql","coding"] },
  { value: "mcq_only",        label: "Only MCQ",               sections: ["mcq"] },
  { value: "coding_only",     label: "Only Coding",            sections: ["coding"] },
  { value: "aptitude_coding", label: "Aptitude + Coding",      sections: ["aptitude","coding"] },
  { value: "mcq_sql",         label: "MCQ + SQL",              sections: ["mcq","sql"] },
  { value: "behavioral",      label: "Behavioral Assessment",  sections: ["behavioral"] },
  { value: "combined",        label: "Combined Assessment",    sections: ["mcq","sql","coding","aptitude"] },
];

const SECTION_META = {
  mcq:        { label: "MCQ",        color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  sql:        { label: "SQL",        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  coding:     { label: "Coding",     color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
  aptitude:   { label: "Aptitude",   color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  behavioral: { label: "Behavioral", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const AI_VIVA_OPTIONS = [
  { value: "voice",  label: "Voice Interview",  icon: IC.mic },
  { value: "typing", label: "Typing Interview", icon: IC.keyboard },
  { value: "both",   label: "Voice + Typing",   icon: IC.sliders },
];

const COLLEGES = ["", "RMKEC", "RMDEC", "RMKCET"];

const STATUS_STYLE = {
  pending:   { color: "#b45309", bg: "#fef3c7", dot: "#f59e0b", label: "Pending"   },
  approved:  { color: "#065f46", bg: "#d1fae5", dot: "#10b981", label: "Approved"  },
  rejected:  { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444", label: "Rejected"  },
  completed: { color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6", label: "Completed" },
};

const STEPS = [
  { id: "role",        label: "Role & JD",   icon: IC.user,     desc: "Job details" },
  { id: "assessment",  label: "Assessment",  icon: IC.grid,     desc: "Pattern & sections" },
  { id: "schedule",    label: "Schedule",    icon: IC.calendar, desc: "Date & time" },
  { id: "eligibility", label: "Eligibility", icon: IC.award,    desc: "Criteria" },
  { id: "targeting",   label: "Targeting",   icon: IC.target,   desc: "College & batch" },
];

const EMPTY_FORM = {
  job_role: "", job_description: "",
  assessment_pattern: "",
  section_config: {
    mcq:        { enabled: false, questions: "", minutes: "" },
    sql:        { enabled: false, questions: "", minutes: "" },
    coding:     { enabled: false, questions: "", minutes: "" },
    aptitude:   { enabled: false, questions: "", minutes: "" },
    behavioral: { enabled: false, questions: "", minutes: "" },
  },
  sectional_cutoff_required: false,
  sectional_cutoffs: { mcq: "", sql: "", coding: "", aptitude: "", behavioral: "" },
  ai_viva_mode: "both",
  schedule_date: "", schedule_time: "",
  eligibility_criteria: {
    min_cgpa: "", min_10th_percentage: "", min_12th_percentage: "",
    target_percentage: "", target_count: "", selection_mode: "percentage",
  },
  specifications: "", target_college: "", target_batch_year: "",
};

// ── Color palette ───────────────────────────────────────────────
const P = {
  bg: "#f8fafc", white: "#ffffff",
  border: "#e2e8f0", text: "#0f172a", muted: "#64748b", dim: "#94a3b8",
  accent: "#0ea5e9", accentDark: "#0284c7", accentLight: "#f0f9ff", accentBorder: "#bae6fd",
  green: "#059669", greenBg: "#ecfdf5", greenBorder: "#6ee7b7",
  red: "#dc2626", redBg: "#fef2f2",
};

// ── Main component ──────────────────────────────────────────────
export default function ExamRequestsPage() {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [step, setStep]         = useState(0);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [err, setErr]           = useState("");
  const [filter, setFilter]     = useState("all");
  const [showJdPreview, setShowJdPreview] = useState(false);

  const recruiterId    = localStorage.getItem("user_id") || 1;
  const recruiterEmail = localStorage.getItem("user_email") || "";
  const companyName    = localStorage.getItem("company_name") || "";
  const token          = localStorage.getItem("token");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Uses relative URL — works with CRA proxy to localhost:5000
      const res  = await fetch(`/api/exam-requests?recruiter_id=${recruiterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    finally  { setLoading(false); }
  };
  useEffect(() => { fetchRequests(); }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handlePatternChange = (val) => {
    const pat = ASSESSMENT_PATTERNS.find(p => p.value === val);
    if (!pat) return;
    const sc = {
      mcq:        { enabled: false, questions: "", minutes: "" },
      sql:        { enabled: false, questions: "", minutes: "" },
      coding:     { enabled: false, questions: "", minutes: "" },
      aptitude:   { enabled: false, questions: "", minutes: "" },
      behavioral: { enabled: false, questions: "", minutes: "" },
    };
    pat.sections.forEach(s => { sc[s].enabled = true; });
    setForm(p => ({
      ...p,
      assessment_pattern: val,
      section_config: sc,
      sectional_cutoff_required: MULTI_SECTION_PATTERNS.includes(val) ? p.sectional_cutoff_required : false,
    }));
  };

  const updSection = (section, field, val) => set("section_config", {
    ...form.section_config, [section]: { ...form.section_config[section], [field]: val },
  });
  const updCutoff = (section, val) => set("sectional_cutoffs", { ...form.sectional_cutoffs, [section]: val });
  const updElig   = (field, val)   => set("eligibility_criteria", { ...form.eligibility_criteria, [field]: val });

  const isMulti       = MULTI_SECTION_PATTERNS.includes(form.assessment_pattern);
  const enabledSecs   = Object.entries(form.section_config).filter(([, c]) => c.enabled);

  // Per-step validation
  const stepValid = (idx) => {
    if (idx === 0) return form.job_role.trim() && form.job_description.trim();
    if (idx === 1) {
      if (!form.assessment_pattern) return false;
      for (let [, c] of enabledSecs) {
        if (!c.questions || !c.minutes || +c.questions <= 0 || +c.minutes <= 0) return false;
      }
      if (form.sectional_cutoff_required && isMulti) {
        for (let [k] of enabledSecs) {
          const v = form.sectional_cutoffs[k];
          if (!v || isNaN(v) || +v < 0 || +v > 100) return false;
        }
      }
      return true;
    }
    if (idx === 2) return form.schedule_date && form.schedule_time;
    return true;
  };

  const canNext   = stepValid(step);
  const isLast    = step === STEPS.length - 1;

  const handleNext = () => {
    if (!canNext) { setErr("Please complete all required fields before continuing."); return; }
    setErr("");
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => { setErr(""); setStep(s => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    setSubmitting(true); setErr("");
    try {
      // ✅ FIXED: Uses relative URL — works with CRA proxy to localhost:5000
      const res = await fetch(`/api/exam-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recruiter_id: recruiterId, recruiter_email: recruiterEmail, company_name: companyName,
          job_role: form.job_role, job_description: form.job_description, exam_type: "Placement",
          assessment_pattern: form.assessment_pattern, section_config: form.section_config,
          sectional_cutoff_required: form.sectional_cutoff_required,
          sectional_cutoffs: form.sectional_cutoff_required ? form.sectional_cutoffs : null,
          ai_viva_mode: form.ai_viva_mode,
          schedule_date: form.schedule_date, schedule_time: form.schedule_time,
          eligibility_criteria: form.eligibility_criteria, specifications: form.specifications,
          target_college: form.target_college, target_batch_year: form.target_batch_year || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Submission failed"); return; }
      setSuccess(true); setForm(EMPTY_FORM); setStep(0); fetchRequests();
      setTimeout(() => setSuccess(false), 4000);
    } catch { setErr("Cannot reach server. Make sure backend is running."); }
    finally  { setSubmitting(false); }
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const counts   = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    approved:  requests.filter(r => r.status === "approved").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  return (
    <RecruiterLayout title="Create Placement Assessment" subtitle="Configure hiring assessment with detailed specifications">
      <div style={{ display: "grid", gridTemplateColumns: "480px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Wizard Form ── */}
        <div style={{
          background: P.white, borderRadius: 14, border: `1px solid ${P.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 76,
          maxHeight: "calc(100vh - 100px)", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "15px 20px", borderBottom: `1px solid ${P.border}`,
            background: "linear-gradient(135deg, #f8fafc, #f0f9ff)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>New Placement Request</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>Step {step + 1} of {STEPS.length} — {STEPS[step].desc}</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
              PLACEMENT
            </span>
          </div>

          {/* Step progress bar */}
          <div style={{ padding: "14px 20px 0", background: P.bg, borderBottom: `1px solid ${P.border}` }}>
            <div style={{ display: "flex", gap: 0, position: "relative", marginBottom: 14 }}>
              {/* connector line */}
              <div style={{ position: "absolute", top: 14, left: "10%", right: "10%", height: 2, background: P.border, zIndex: 0 }} />
              <div style={{
                position: "absolute", top: 14, left: "10%", height: 2, zIndex: 1,
                width: `${(step / (STEPS.length - 1)) * 80}%`,
                background: P.accent, transition: "width 0.35s ease",
              }} />
              {STEPS.map((s, i) => {
                const done    = i < step;
                const current = i === step;
                return (
                  <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 2 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? P.green : current ? P.accent : P.white,
                      border: `2px solid ${done ? P.green : current ? P.accent : P.border}`,
                      transition: "all 0.25s", cursor: done ? "pointer" : "default",
                    }} onClick={() => done && setStep(i)}>
                      {done
                        ? <Ic d={IC.check} size={13} color="#fff" sw={2.5} />
                        : <Ic d={s.icon} size={12} color={current ? "#fff" : P.dim} />}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: current ? P.accent : done ? P.green : P.dim, letterSpacing: "0.3px", textAlign: "center" }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
            {success ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: P.greenBg,
                  border: `2px solid ${P.greenBorder}`, display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 14px",
                }}>
                  <Ic d={IC.check} size={22} color={P.green} sw={2.5} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.green }}>Request Submitted</div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 6, lineHeight: 1.7 }}>
                  Your placement assessment request has been sent for admin review.
                </div>
              </div>
            ) : (
              <>
                {/* STEP 0 — Role & JD */}
                {step === 0 && (
                  <>
                    <FF label="Job Role *" icon={IC.user}>
                      <input type="text" value={form.job_role}
                        onChange={e => set("job_role", e.target.value)}
                        placeholder="e.g. Senior Full Stack Engineer"
                        style={inp()} />
                    </FF>
                    <FF label="Job Description *" icon={IC.layers}>
                      <div style={{ position: "relative" }}>
                        <textarea value={form.job_description}
                          onChange={e => set("job_description", e.target.value)}
                          placeholder="Paste the complete job description — requirements, responsibilities, skills needed..."
                          rows={6} style={{ ...inp(), resize: "vertical", fontFamily: "inherit" }} />
                        <button onClick={() => setShowJdPreview(v => !v)} style={ghostBtn()}>
                          <Ic d={IC.eye} size={11} color={P.muted} />
                          <span style={{ fontSize: 10 }}>Preview</span>
                        </button>
                      </div>
                      {showJdPreview && form.job_description && (
                        <div style={{ marginTop: 8, padding: 10, background: P.bg, borderRadius: 6, fontSize: 12, maxHeight: 160, overflow: "auto", border: `1px solid ${P.border}`, color: P.muted, lineHeight: 1.6 }}>
                          {form.job_description}
                        </div>
                      )}
                    </FF>
                  </>
                )}

                {/* STEP 1 — Assessment */}
                {step === 1 && (
                  <>
                    <FF label="Assessment Pattern *" icon={IC.grid}>
                      <select value={form.assessment_pattern} onChange={e => handlePatternChange(e.target.value)} style={inp()}>
                        <option value="">Select pattern...</option>
                        {ASSESSMENT_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </FF>

                    {form.assessment_pattern && enabledSecs.length > 0 && (
                      <div style={{ marginBottom: 16, padding: 14, background: P.bg, borderRadius: 8, border: `1px solid ${P.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <Ic d={IC.sliders} size={12} color={P.muted} />
                          Section Details
                        </div>
                        {enabledSecs.map(([section, config]) => {
                          const m = SECTION_META[section];
                          return (
                            <div key={section} style={{ marginBottom: 12 }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, marginBottom: 6, background: m.bg, border: `1px solid ${m.border}` }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: m.color, letterSpacing: "0.4px" }}>{m.label}</span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div>
                                  <div style={fl()}>Questions</div>
                                  <input type="number" value={config.questions} onChange={e => updSection(section, "questions", e.target.value)} placeholder="Count" min="1" style={{ ...inp(), padding: "7px 10px" }} />
                                </div>
                                <div>
                                  <div style={fl()}>Duration (min)</div>
                                  <input type="number" value={config.minutes} onChange={e => updSection(section, "minutes", e.target.value)} placeholder="Minutes" min="1" style={{ ...inp(), padding: "7px 10px" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sectional Cutoff — multi-section only */}
                    {isMulti && form.assessment_pattern && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          padding: 14, borderRadius: 8, transition: "all 0.2s",
                          border: `1.5px solid ${form.sectional_cutoff_required ? P.accent : P.border}`,
                          background: form.sectional_cutoff_required ? P.accentLight : P.bg,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.sectional_cutoff_required ? 14 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Ic d={IC.scissors} size={14} color={form.sectional_cutoff_required ? P.accent : P.muted} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>Sectional Cutoff</div>
                                <div style={{ fontSize: 10, color: P.muted, marginTop: 1 }}>Min qualifying % per section</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: form.sectional_cutoff_required ? P.accent : P.muted }}>
                                {form.sectional_cutoff_required ? "Required" : "Not required"}
                              </span>
                              <div onClick={() => set("sectional_cutoff_required", !form.sectional_cutoff_required)}
                                style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", transition: "background 0.2s", background: form.sectional_cutoff_required ? P.accent : "#cbd5e1" }}>
                                <div style={{ position: "absolute", top: 3, left: form.sectional_cutoff_required ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                              </div>
                            </div>
                          </div>
                          {form.sectional_cutoff_required && (
                            <div style={{ display: "grid", gridTemplateColumns: enabledSecs.length <= 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8 }}>
                              {enabledSecs.map(([section]) => {
                                const m = SECTION_META[section];
                                return (
                                  <div key={section}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: m.color, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color }} />
                                      {m.label}
                                    </div>
                                    <div style={{ position: "relative" }}>
                                      <input type="number" value={form.sectional_cutoffs[section]} onChange={e => updCutoff(section, e.target.value)} placeholder="0–100" min="0" max="100"
                                        style={{ ...inp(), padding: "7px 28px 7px 10px", borderColor: m.border }} />
                                      <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: P.muted, fontWeight: 600 }}>%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {!form.sectional_cutoff_required && (
                          <div style={{ fontSize: 10, color: P.muted, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                            <Ic d={IC.info} size={10} color={P.muted} />
                            Enable to set minimum passing % per section
                          </div>
                        )}
                      </div>
                    )}

                    <FF label="AI Viva Interview Mode" icon={IC.mic}>
                      <div style={{ display: "flex", gap: 7 }}>
                        {AI_VIVA_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => set("ai_viva_mode", opt.value)}
                            style={{ flex: 1, padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${form.ai_viva_mode === opt.value ? P.accent : P.border}`, background: form.ai_viva_mode === opt.value ? P.accentLight : P.bg, color: form.ai_viva_mode === opt.value ? P.accentDark : P.muted, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                            <Ic d={opt.icon} size={14} color="currentColor" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FF>
                  </>
                )}

                {/* STEP 2 — Schedule */}
                {step === 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <FF label="Schedule Date *" icon={IC.calendar}>
                      <input type="date" value={form.schedule_date} onChange={e => set("schedule_date", e.target.value)} min={new Date().toISOString().split("T")[0]} style={inp()} />
                    </FF>
                    <FF label="Schedule Time *" icon={IC.clock}>
                      <input type="time" value={form.schedule_time} onChange={e => set("schedule_time", e.target.value)} style={inp()} />
                    </FF>
                  </div>
                )}

                {/* STEP 3 — Eligibility */}
                {step === 3 && (
                  <>
                    <div style={{ marginBottom: 14, padding: 14, background: P.bg, borderRadius: 8, border: `1px solid ${P.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <Ic d={IC.award} size={12} color={P.muted} />
                        Academic Eligibility
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[
                          { field: "min_cgpa",              label: "Min CGPA",   placeholder: "e.g. 6.0", step: "0.1", max: "10" },
                          { field: "min_10th_percentage",   label: "Min 10th %", placeholder: "e.g. 60",  max: "100" },
                          { field: "min_12th_percentage",   label: "Min 12th %", placeholder: "e.g. 60",  max: "100" },
                        ].map(f => (
                          <div key={f.field}>
                            <div style={fl()}>{f.label}</div>
                            <input type="number" step={f.step || "1"} value={form.eligibility_criteria[f.field]} onChange={e => updElig(f.field, e.target.value)} placeholder={f.placeholder} min="0" max={f.max} style={{ ...inp(), padding: "7px 10px" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: 14, background: P.bg, borderRadius: 8, border: `1px solid ${P.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <Ic d={IC.filter} size={12} color={P.muted} />
                        Target Selection
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        {[{ key: "percentage", label: "Top % Students", icon: IC.percent }, { key: "count", label: "Fixed Count", icon: IC.hash }].map(m => (
                          <button key={m.key} onClick={() => updElig("selection_mode", m.key)}
                            style={{ flex: 1, padding: "8px", borderRadius: 7, cursor: "pointer", border: `1.5px solid ${form.eligibility_criteria.selection_mode === m.key ? P.accent : P.border}`, background: form.eligibility_criteria.selection_mode === m.key ? P.accentLight : "transparent", color: form.eligibility_criteria.selection_mode === m.key ? P.accentDark : P.muted, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
                            <Ic d={m.icon} size={12} color="currentColor" />
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {form.eligibility_criteria.selection_mode === "percentage" ? (
                        <div style={{ position: "relative" }}>
                          <input type="number" value={form.eligibility_criteria.target_percentage} onChange={e => updElig("target_percentage", e.target.value)} placeholder="Top N% of eligible students" min="1" max="100" style={{ ...inp(), paddingRight: 30 }} />
                          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: P.muted, fontWeight: 600 }}>%</span>
                        </div>
                      ) : (
                        <input type="number" value={form.eligibility_criteria.target_count} onChange={e => updElig("target_count", e.target.value)} placeholder="Number of students to select" min="1" style={inp()} />
                      )}
                    </div>
                  </>
                )}

                {/* STEP 4 — Targeting + Submit */}
                {step === 4 && (
                  <>
                    <FF label="Target College" icon={IC.building}>
                      <select value={form.target_college} onChange={e => set("target_college", e.target.value)} style={inp()}>
                        {COLLEGES.map(c => <option key={c} value={c}>{c || "Any college"}</option>)}
                      </select>
                    </FF>
                    <FF label="Target Batch Year" icon={IC.calendar}>
                      <input type="number" value={form.target_batch_year} onChange={e => set("target_batch_year", e.target.value)} placeholder="e.g. 2025" min="2020" max="2030" style={inp()} />
                    </FF>
                    <FF label="Additional Specifications" icon={IC.info}>
                      <textarea value={form.specifications} onChange={e => set("specifications", e.target.value)} placeholder="Special requirements, proctoring needs, or additional notes..." rows={4} style={{ ...inp(), resize: "vertical", fontFamily: "inherit" }} />
                    </FF>

                    {/* Summary strip */}
                    <div style={{ marginBottom: 14, padding: 12, background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: P.accent, marginBottom: 8, letterSpacing: "0.5px" }}>SUBMISSION SUMMARY</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          ["Role", form.job_role || "—"],
                          ["Pattern", ASSESSMENT_PATTERNS.find(p => p.value === form.assessment_pattern)?.label || "—"],
                          ["Schedule", form.schedule_date ? `${new Date(form.schedule_date).toLocaleDateString()} ${form.schedule_time}` : "—"],
                          ["Cutoff", form.sectional_cutoff_required ? "Required" : "None"],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, color: P.muted, fontWeight: 600, letterSpacing: "0.3px" }}>{label}</div>
                            <div style={{ fontSize: 11, color: P.text, fontWeight: 600, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {err && (
                  <div style={{ padding: "9px 12px", borderRadius: 7, fontSize: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
                    <Ic d={IC.info} size={13} color="#dc2626" />
                    {err}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation footer */}
          {!success && (
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${P.border}`, background: P.white, display: "flex", gap: 10 }}>
              {step > 0 && (
                <button onClick={handleBack}
                  style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Ic d={IC.chevLeft} size={13} color={P.muted} />
                  Back
                </button>
              )}
              {!isLast ? (
                <button onClick={handleNext}
                  style={{ flex: 1, padding: "9px 16px", borderRadius: 8, border: "none", background: canNext ? P.accent : "#e2e8f0", color: canNext ? "#fff" : P.dim, fontSize: 12, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s" }}>
                  Next — {STEPS[step + 1].label}
                  <Ic d={IC.chevRight} size={13} color="currentColor" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ flex: 1, padding: "9px 16px", borderRadius: 8, border: "none", background: submitting ? "#e2e8f0" : P.accent, color: submitting ? P.dim : "#fff", fontSize: 12, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Ic d={IC.send} size={13} color="currentColor" sw={2} />
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Request History ── */}
        <div style={{ background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #f8fafc, #f0f9ff)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Request History</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>Track all submitted placement requests</div>
            </div>
            <button onClick={fetchRequests} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${P.border}`, background: P.white, color: P.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Ic d={IC.refresh} size={11} color={P.muted} />
              Refresh
            </button>
          </div>

          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${P.border}`, display: "flex", gap: 6, background: P.bg }}>
            {["all","pending","approved","rejected","completed"].map(f => {
              const ss = STATUS_STYLE[f] || {};
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", border: `1px solid ${active ? (ss.dot || P.accent) : P.border}`, background: active ? (ss.bg || P.accentLight) : "transparent", color: active ? (ss.color || P.accent) : P.muted, fontSize: 11, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {f !== "all" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? ss.dot : P.border }} />}
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span style={{ background: active ? (ss.dot || P.accent) : "#e2e8f0", color: active ? "#fff" : P.muted, borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{counts[f]}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: P.dim, fontSize: 13 }}>Loading requests...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: P.dim }}>
              <div style={{ marginBottom: 10, opacity: 0.3, display: "flex", justifyContent: "center" }}>
                <Ic d={IC.layers} size={32} color={P.dim} sw={1.2} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {filter === "all" ? "No requests yet. Submit your first placement request." : `No ${filter} requests.`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: P.bg, borderBottom: `2px solid ${P.border}` }}>
                    {["#","Job Role","Pattern","Schedule","College","Batch","Cutoff","Status"].map((h, i) => (
                      <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.7px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const ss = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                    const pat = ASSESSMENT_PATTERNS.find(p => p.value === r.assessment_pattern)?.label || r.assessment_pattern;
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${P.border}`, transition: "background 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = P.bg}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: P.accent, fontWeight: 600 }}>#{r.id}</td>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: P.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.job_role}</td>
                        <td style={{ padding: "12px 14px", color: P.muted, fontSize: 12 }}>{pat || "—"}</td>
                        <td style={{ padding: "12px 14px", color: P.muted, fontSize: 11, whiteSpace: "nowrap" }}>{r.schedule_date ? new Date(r.schedule_date).toLocaleDateString() : "—"}</td>
                        <td style={{ padding: "12px 14px", color: P.muted, fontSize: 12 }}>{r.target_college || "Any"}</td>
                        <td style={{ padding: "12px 14px", color: P.muted, fontSize: 12 }}>{r.target_batch_year || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: r.sectional_cutoff_required ? "#eff6ff" : P.bg, color: r.sectional_cutoff_required ? "#1d4ed8" : P.dim, border: `1px solid ${r.sectional_cutoff_required ? "#bfdbfe" : P.border}` }}>
                            {r.sectional_cutoff_required ? "Required" : "None"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: ss.bg, color: ss.color }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.dot }} />
                            {ss.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
        </div>
      </div>
    </RecruiterLayout>
  );
<<<<<<< HEAD
=======
}

// ── Helpers ──
function FF({ label, icon, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
        {icon && <Ic d={icon} size={11} color="#64748b" />}
        {label}
      </label>
      {children}
    </div>
  );
}
function inp() {
  return { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, color: "#0f172a", background: "#f8fafc", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" };
}
function fl() { return { fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 600 }; }
function ghostBtn() {
  return { position: "absolute", right: 8, top: 8, fontSize: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#64748b" };
>>>>>>> 4dda1c650bb26bdc7899f409db238b86856389c1
}