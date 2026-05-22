
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';

// ── helpers ──────────────────────────────────────────────────────
const pct   = (n, t) => (t ? Math.round((n / t) * 100) : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ── score/decision colours ────────────────────────────────────────
const scoreCol = s => +s >= 70 ? C.green : +s >= 40 ? C.orange : C.red;
const decCol   = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
const decBg    = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

function Pill({ label, color, bg }) {
  return <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{label}</span>;
}


function ScoreRing({ score, size = 44 }) {
  const s   = +score || 0;
  const col = scoreCol(s);
  const r   = (size - 6) / 2;
  const c2  = 2 * Math.PI * r;
  const f   = (clamp(s, 0, 100) / 100) * c2;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4"
        strokeDasharray={`${f} ${c2}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={C.text}
        fontSize={size/4.2} fontWeight="700" fontFamily="monospace">{Math.round(s)}</text>
    </svg>
  );
}

// ── progress bar ─────────────────────────────────────────────────
function ProgBar({ value, color = C.accent, height = 4 }) {
  return (
    <div style={{ background: "#e2e8f0", borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: `${clamp(+value || 0, 0, 100)}%`, height: "100%", background: color, borderRadius: height, transition: "width .5s ease" }}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Interview Scheduling Modal
// ══════════════════════════════════════════════════════════════════
function InterviewModal({ candidate, onClose, onScheduled }) {
  const [form, setForm] = useState({ date: "", time: "", type: "Technical Round", interviewer: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.date || !form.time) return;
    setSaving(true);
    try {
      await axios.post(`${API}/interviews/schedule`, {
        student_id: candidate.id,
        interview_date: form.date,
        interview_time: form.time,
        interview_type: form.type,
        interviewer_email: form.interviewer,
        notes: form.notes,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("recruiter_token")}` } });
    } catch { /* graceful */ }
    setDone(true);
    setSaving(false);
    onScheduled && onScheduled(candidate);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(10,42,65,.2)", animation: "fadeUp .2s ease", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 22px", background: C.accentLight, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {(candidate.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{done ? "Interview Scheduled!" : "Schedule Interview"}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{candidate.name} · {candidate.college || "—"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: C.muted }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 6 }}>Scheduled Successfully</div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 20 }}>{form.date} at {form.time} · {form.type}</div>
            <button onClick={onClose} style={{ padding: "9px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ label: "Date *", key: "date", type: "date" }, { label: "Time *", key: "time", type: "time" }].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }}/>
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Interview Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, outline: "none" }}>
                {["Technical Round","HR Round","Final Round","Aptitude Round","Group Discussion"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Interviewer Email</label>
              <input type="email" value={form.interviewer} onChange={e => set("interviewer", e.target.value)} placeholder="interviewer@company.com"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" }}/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none", resize: "vertical" }}/>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submit} disabled={saving || !form.date || !form.time}
                style={{ flex: 1, padding: "10px", background: !form.date || !form.time ? "#cbd5e1" : C.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: !form.date || !form.time ? "not-allowed" : "pointer" }}>
                {saving ? "Scheduling…" : "Schedule Interview"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: C.accentLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Student Detail Drawer
// ══════════════════════════════════════════════════════════════════
function StudentDrawer({ student, onClose, onSchedule }) {
  if (!student) return null;
  const ev = student.__evaluation;
  const score = +(student.total_score || student.overall_score || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,42,65,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.bg, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(10,42,65,.2)", animation: "fadeUp .2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "15px 22px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 13, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.accentLight, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
            {(student.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{student.name}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{student.college} · {student.branch || "—"} · Batch {student.batch || "—"}</div>
          </div>
          <ScoreRing score={score} size={52}/>
          {ev?.decision && <Pill label={ev.decision} color={decCol(ev.decision)} bg={decBg(ev.decision)}/>}
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: C.muted }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "CGPA", value: student.cgpa || "—", color: C.accent },
              { label: "10th %", value: student.tenth_percentage ? student.tenth_percentage + "%" : "—", color: C.blue },
              { label: "12th %", value: student.twelfth_percentage ? student.twelfth_percentage + "%" : "—", color: C.purple },
              { label: "Backlogs", value: student.backlogs != null ? student.backlogs : "—", color: +student.backlogs > 0 ? C.red : C.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.white, borderRadius: 9, padding: "10px 12px", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{value}</div>
              </div>
            ))}
          </div>

          {(student.github_score != null || student.leetcode_score != null || student.test_score != null) && (
            <div style={{ background: C.white, borderRadius: 10, padding: "13px 15px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10 }}>Assessment Scores</div>
              {[["GitHub", student.github_score, C.purple], ["LeetCode", student.leetcode_score, C.green], ["LinkedIn", student.linkedin_score, C.blue], ["Test", student.test_score, C.orange]]
                .filter(([, v]) => v != null)
                .map(([label, val, color]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{Math.round(+val)}/100</span>
                    </div>
                    <ProgBar value={+val} color={color}/>
                  </div>
                ))}
            </div>
          )}

          {ev && (
            <div style={{ background: C.white, borderRadius: 10, padding: "13px 15px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8 }}>AI Evaluation</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: ev.recommendation ? 8 : 0 }}>
                {ev.decision && <Pill label={ev.decision} color={decCol(ev.decision)} bg={decBg(ev.decision)}/>}
                {ev.confidence && <Pill label={`Confidence: ${ev.confidence}`} color={C.accent} bg={C.accentLight}/>}
                {ev.risk && <Pill label={`Risk: ${ev.risk}`} color={C.muted} bg="#f1f5f9"/>}
              </div>
              {ev.recommendation && <p style={{ fontSize: 11, color: C.text, lineHeight: 1.7, margin: 0 }}>{ev.recommendation}</p>}
            </div>
          )}

          <div style={{ background: C.white, borderRadius: 10, padding: "13px 15px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8 }}>Contact & Profiles</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{student.email || "—"}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[["GitHub", student.github_url], ["LinkedIn", student.linkedin_url], ["LeetCode", student.leetcode_url]].map(([label, url]) => url && (
                <a key={label} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.accent, textDecoration: "none" }}>
                  <Icon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" size={11} color={C.accent} strokeWidth={2}/>{label}
                </a>
              ))}
            </div>
          </div>

          {(student.exams || []).length > 0 && (
            <div style={{ background: C.white, borderRadius: 10, padding: "13px 15px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8 }}>Exam History</div>
              {student.exams.map((ex, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < student.exams.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.text }}>{ex.exam_name || ex.title}</div>
                    {ex.company_name && <div style={{ fontSize: 10, color: C.dim }}>{ex.company_name}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {ex.score != null && <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: scoreCol(ex.score) }}>{ex.score}</span>}
                    <Pill label={ex.status === "submitted" ? "Completed" : "Pending"} color={ex.status === "submitted" ? C.green : C.orange} bg={ex.status === "submitted" ? C.greenBg : C.orangeBg}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 22px", background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={() => { onClose(); onSchedule(student); }}
            style={{ flex: 1, padding: "9px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={13} color="#fff" strokeWidth={2}/>
            Schedule Interview
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", background: C.accentLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// College Card
// ══════════════════════════════════════════════════════════════════
const COLLEGE_THEME = {
  RMKEC: { accent: "#2BB1A8", bg: "#e8fafb" },
  RMDEC: { accent: "#7c3aed", bg: "#f5f3ff" },
  RMKCET: { accent: "#2563eb", bg: "#eff6ff" },
};

function CollegeCard({ col, onDrill, selected }) {
  const total = +col.total || 0;
  const evaluated = +col.evaluated || 0;
  const hire = +col.hire_count || 0;
  const theme = COLLEGE_THEME[col.college] || { accent: C.accent, bg: C.accentLight };
  const evalPct = pct(evaluated, total);

  return (
    <div onClick={() => onDrill(col.college)} className="col-card"
      style={{ background: C.white, borderRadius: 14, border: `2px solid ${selected ? theme.accent : C.border}`, padding: "20px 22px", cursor: "pointer",
        boxShadow: selected ? `0 0 0 3px ${theme.accent}22` : "0 1px 4px rgba(0,0,0,.04)", transition: "all .18s", animation: "fadeUp .3s ease both" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: theme.bg, border: `2px solid ${theme.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: theme.accent, flexShrink: 0 }}>
          {col.college.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{col.college}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{total} students enrolled</div>
        </div>
        {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent }}/>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: C.dim }}>Evaluated</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: theme.accent }}>{evaluated}/{total} ({evalPct}%)</span>
        </div>
        <ProgBar value={evalPct} color={theme.accent}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Hire", value: hire, color: C.green },
          { label: "Avg Score", value: col.avg_score != null ? Math.round(+col.avg_score) : "—", color: theme.accent },
          { label: "High Risk", value: col.high_risk || 0, color: C.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center", background: "#f8fbfc", borderRadius: 8, padding: "8px 6px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: theme.accent, fontWeight: 600, textAlign: "right" }}>
        {selected ? "Viewing students ↓" : "View students →"}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Student Table
// ══════════════════════════════════════════════════════════════════
function StudentTable({ college }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [decFilter, setDecFilter] = useState("All");
  const [cgpaMin, setCgpaMin] = useState("");
  const [tenthMin, setTenthMin] = useState("");
  const [twelfthMin, setTwelfthMin] = useState("");
  const [selected, setSelected] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [scheduledIds, setScheduledIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/candidates/by-college`, { 
        params: { college },
        headers: { Authorization: `Bearer ${localStorage.getItem("recruiter_token")}` }
      });
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError(err.response?.data?.error || 'Failed to load students');
      setStudents([]);
    }
    setLoading(false);
  }, [college]);

  useEffect(() => { load(); }, [load]);

  const batches = ["All", ...new Set(students.map(s => s.batch).filter(Boolean).map(String))].sort((a, b) => String(b).localeCompare(String(a)));
  const branches = ["All", ...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const examStatuses = ["All", ...new Set(students.flatMap(s => (s.exams || []).map(e => e.status).filter(Boolean)))].sort();
  const decisions = ["All", ...new Set(students.map(s => s.__evaluation?.decision).filter(Boolean))].sort();

  const filtered = students.filter(s => {
    const name = (s.name || "").toLowerCase();
    const cgpa = +(s.cgpa || 0);
    const tenth = +(s.tenth_percentage || 0);
    const twelfth = +(s.twelfth_percentage || 0);
    const examStatusesList = (s.exams || []).map(e => e.status).filter(Boolean);
    const aiDecision = s.__evaluation?.decision;
    
    return (
      name.includes(search.toLowerCase()) &&
      (batchFilter === "All" || String(s.batch) === String(batchFilter)) &&
      (branchFilter === "All" || (s.branch || "") === branchFilter) &&
      (statusFilter === "All" || examStatusesList.includes(statusFilter)) &&
      (decFilter === "All" || aiDecision === decFilter) &&
      (!cgpaMin || cgpa >= +cgpaMin) &&
      (!tenthMin || tenth >= +tenthMin) &&
      (!twelfthMin || twelfth >= +twelfthMin)
    );
  });

  const elig60 = filtered.filter(s => +(s.cgpa || 0) >= 6.0).length;
  const elig75 = filtered.filter(s => +(s.cgpa || 0) >= 7.5).length;
  const elig80 = filtered.filter(s => +(s.cgpa || 0) >= 8.0).length;
  const hired = filtered.filter(s => s.__evaluation?.decision === "Hire").length;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading students…</div>;
  if (error) {
    return (
      <div style={{ padding: 24, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, color: C.red }}>
        <strong>Error:</strong> {error}
        <button onClick={load} style={{ marginLeft: 12, padding: "4px 12px", background: C.red, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Total", value: filtered.length, color: C.accent },
          { label: "CGPA ≥ 6.0", value: elig60, color: C.blue },
          { label: "CGPA ≥ 7.5", value: elig75, color: C.green },
          { label: "CGPA ≥ 8.0", value: elig80, color: C.purple },
          { label: "AI Hire", value: hired, color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 9, padding: "11px 13px", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 9, color: C.dim }}>{pct(value, filtered.length)}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fbfc", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", flex: 1, minWidth: 160 }}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={12} color={C.dim}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…" style={{ border: "none", outline: "none", fontSize: 12, background: "transparent", color: C.text, width: "100%" }}/>
        </div>

        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, outline: "none" }}>
          {batches.map(b => <option key={b} value={b}>{b === "All" ? "All Batches" : `Batch ${b}`}</option>)}
        </select>

        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, outline: "none" }}>
          {branches.map(b => <option key={b} value={b}>{b === "All" ? "All Branches" : b}</option>)}
        </select>

        {examStatuses.length > 1 && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, outline: "none" }}>
            {examStatuses.map(st => <option key={st} value={st}>{st === "All" ? "All Statuses" : st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
          </select>
        )}

        {decisions.length > 1 && (
          <select value={decFilter} onChange={e => setDecFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, background: C.white, outline: "none" }}>
            {decisions.map(d => <option key={d} value={d}>{d === "All" ? "All Decisions" : d}</option>)}
          </select>
        )}

        <div style={{ display: "flex", gap: 2, background: "#f8fbfc", border: `1px solid ${C.border}`, borderRadius: 7, padding: 2 }}>
          {[["","CGPA"],["6.0","6.0+"],["7.5","7.5+"],["8.0","8.0+"]].map(([val, lbl]) => (
            <button key={lbl} onClick={() => setCgpaMin(val)} style={{ padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, background: cgpaMin === val ? C.accent : "transparent", color: cgpaMin === val ? "#fff" : C.muted }}>{lbl}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 2, background: "#f8fbfc", border: `1px solid ${C.border}`, borderRadius: 7, padding: 2 }}>
          {[["","10th%"],["60","60%+"],["75","75%+"],["90","90%+"]].map(([val, lbl]) => (
            <button key={lbl} onClick={() => setTenthMin(val)} style={{ padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, background: tenthMin === val ? C.blue : "transparent", color: tenthMin === val ? "#fff" : C.muted }}>{lbl}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 2, background: "#f8fbfc", border: `1px solid ${C.border}`, borderRadius: 7, padding: 2 }}>
          {[["","12th%"],["60","60%+"],["75","75%+"],["90","90%+"]].map(([val, lbl]) => (
            <button key={lbl} onClick={() => setTwelfthMin(val)} style={{ padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, background: twelfthMin === val ? C.purple : "transparent", color: twelfthMin === val ? "#fff" : C.muted }}>{lbl}</button>
          ))}
        </div>

        <button onClick={load} style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.muted }}>
          <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={12} color={C.muted} strokeWidth={2}/> Refresh
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>
        Showing {filtered.length} of {students.length} students
        {(search || batchFilter !== "All" || branchFilter !== "All" || statusFilter !== "All" || decFilter !== "All" || cgpaMin || tenthMin || twelfthMin) && (
          <button onClick={() => { setSearch(""); setBatchFilter("All"); setBranchFilter("All"); setStatusFilter("All"); setDecFilter("All"); setCgpaMin(""); setTenthMin(""); setTwelfthMin(""); }} style={{ marginLeft: 8, color: C.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear filters</button>
        )}
      </div>

      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 12 }}>
            No students match the current filters.
            {(search || batchFilter !== "All" || branchFilter !== "All" || statusFilter !== "All" || decFilter !== "All" || cgpaMin || tenthMin || twelfthMin) && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => { setSearch(""); setBatchFilter("All"); setBranchFilter("All"); setStatusFilter("All"); setDecFilter("All"); setCgpaMin(""); setTenthMin(""); setTwelfthMin(""); }} style={{ color: C.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear all filters</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fbfc", borderBottom: `2px solid ${C.border}` }}>
                  {["#","Student","Batch · Branch","CGPA","Company Applied","GitHub","LeetCode","Test","Total","AI Decision","Status","Actions"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const score = +(s.total_score || s.overall_score || 0);
                  const ev = s.__evaluation;
                  const dec = ev?.decision;
                  const examsDone = (s.exams || []).filter(e => e.status === "submitted").length;
                  const compStr = (s.exams || []).map(e => e.company_name).filter(Boolean).join(", ") || "—";
                  const isScheduled = scheduledIds.has(s.id);
                  const statusLabel = examsDone > 0 ? "Completed" : s.has_login ? "Enrolled" : "Eligible";
                  const statusCol = examsDone > 0 ? C.green : s.has_login ? C.blue : C.orange;
                  const statusBg = examsDone > 0 ? C.greenBg : s.has_login ? C.blueBg : C.orangeBg;

                  return (
                    <tr key={s.id} className="r-row" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .12s" }} onClick={() => setSelected(s)}>
                      <td style={{ padding: "10px 12px", color: C.dim, fontFamily: "monospace", fontSize: 10 }}>{i+1}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                            {(s.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: C.text }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: C.dim }}>{s.email || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: C.text }}>{s.batch || "—"}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{s.branch || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: +(s.cgpa||0)>=7.5 ? C.green : +(s.cgpa||0)>=6 ? C.orange : C.red }}>{s.cgpa || "—"}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 10, color: C.muted, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={compStr}>{compStr}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {s.github_score != null ? <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 30, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${s.github_score}%`, height: "100%", background: C.purple }}/></div><span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>{Math.round(s.github_score)}</span></div> : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {s.leetcode_score != null ? <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 30, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${s.leetcode_score}%`, height: "100%", background: C.green }}/></div><span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>{Math.round(s.leetcode_score)}</span></div> : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{s.test_score != null ? Math.round(s.test_score) : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ padding: "10px 12px" }}>{score > 0 ? <ScoreRing score={score} size={36}/> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ padding: "10px 12px" }}>{dec ? <Pill label={dec} color={decCol(dec)} bg={decBg(dec)}/> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ padding: "10px 12px" }}><Pill label={statusLabel} color={statusCol} bg={statusBg}/></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={e => { e.stopPropagation(); setSelected(s); }} className="r-btn-outline" style={{ padding: "4px 9px", background: C.accentLight, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all .12s" }}>View</button>
                          <button onClick={e => { e.stopPropagation(); setScheduling(s); }} style={{ padding: "4px 9px", background: isScheduled ? C.greenBg : "#fff7ed", color: isScheduled ? C.green : C.orange, border: `1px solid ${isScheduled ? C.greenBorder : "#fed7aa"}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{isScheduled ? "✓ Scheduled" : "Interview"}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} onSchedule={s => { setSelected(null); setScheduling(s); }}/>}
      {scheduling && <InterviewModal candidate={scheduling} onClose={() => setScheduling(null)} onScheduled={s => setScheduledIds(p => new Set([...p, s.id]))}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function CandidatesPage() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCol, setActiveCol] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/candidates/colleges`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("recruiter_token")}` }
      });
      setColleges(res.data || []);
    } catch { setColleges([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalStudents = colleges.reduce((s, c) => s + (+c.total || 0), 0);
  const totalEvaluated = colleges.reduce((s, c) => s + (+c.evaluated || 0), 0);
  const totalHire = colleges.reduce((s, c) => s + (+c.hire_count || 0), 0);

  return (
    <RecruiterLayout
      title="Candidates"
      subtitle={loading ? "Loading…" : `${colleges.length} colleges · ${totalStudents} students · ${totalEvaluated} evaluated`}
      actions={
        <button onClick={load} style={{ padding: "7px 13px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={13} color={C.muted} strokeWidth={2}/> Refresh
        </button>
      }
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .r-row:hover { background: #f0f9fb !important; }
        .r-btn-outline:hover { background: ${C.accent} !important; color:#fff !important; }
        .col-card:hover { border-color: ${C.accent} !important; box-shadow: 0 4px 20px rgba(43,177,168,.12) !important; transform: translateY(-2px); }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Colleges", value: colleges.length, color: C.accent },
          { label: "Total Students", value: totalStudents, color: C.text },
          { label: "Evaluated", value: totalEvaluated, color: C.blue },
          { label: "AI Hire", value: totalHire, color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, borderRadius: 10, padding: "14px 18px", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 56, textAlign: "center", color: C.muted, fontSize: 13 }}>Loading colleges…</div>
      ) : colleges.length === 0 ? (
        <div style={{ padding: 56, textAlign: "center", background: C.white, borderRadius: 14, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>No college data found</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>Ensure /api/candidates/colleges returns data.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, marginBottom: 4 }}>
            {colleges.map(col => (
              <CollegeCard key={col.college} col={col} selected={activeCol === col.college} onDrill={name => setActiveCol(prev => prev === name ? null : name)}/>
            ))}
          </div>

          {activeCol && (
            <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", marginTop: 12, animation: "fadeUp .25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <div style={{ width: 4, height: 22, borderRadius: 3, background: COLLEGE_THEME[activeCol]?.accent || C.accent }}/>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{activeCol}</span>
                <span style={{ fontSize: 12, color: C.muted }}>— Student Details</span>
                <button onClick={() => setActiveCol(null)} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 12px", fontSize: 11, color: C.muted, cursor: "pointer" }}>✕ Close</button>
              </div>
              <StudentTable college={activeCol}/>
            </div>
          )}
        </>
      )}
    </RecruiterLayout>
  );
}
