

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T } from "./Studentdashboard ";

const API_URL = process.env.REACT_APP_API_URL || (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api');

function Skeleton({ w = "100%", h = 14, r = 6, style = {} }) {
 return (
 <div style={{
 width: w, height: h, borderRadius: r,
 background: "linear-gradient(90deg,#dce8f0 25%,#eaf3f7 50%,#dce8f0 75%)",
 backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", ...style,
 }} />
 );
}


function StatusBadge({ status }) {
 const map = {
 live: { label: "LIVE", color: "#fff", bg: "#dc2626" },
 active: { label: "LIVE", color: "#fff", bg: "#dc2626" },
 assigned: { label: "Assigned", color: "#0369a1", bg: "#e0f2fe" },
 upcoming: { label: "Upcoming", color: "#0369a1", bg: "#e0f2fe" },
 submitted: { label: "Completed", color: "#065f46", bg: "#d1fae5" },
 completed: { label: "Completed", color: "#065f46", bg: "#d1fae5" },
 };
 const s = map[status] || map.assigned;
 return (
 <span style={{
 padding: "3px 10px", borderRadius: 20,
 fontSize: 10.5, fontWeight: 700,
 background: s.bg, color: s.color,
 letterSpacing: ".3px",
 }}>
 {s.label}
 </span>
 );
}

/* Section pill chip */
function SectionChip({ label, color = "#2563eb", bg = "#eff6ff" }) {
 return (
 <span style={{
 padding: "3px 9px", borderRadius: 5,
 background: bg, color, fontSize: 10.5, fontWeight: 700,
 border: `1px solid ${color}22`,
 }}>
 {label}
 </span>
 );
}

/* Parse sections */
function parseSections(raw) {
 const sec = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
 return {
 hasMcq: !!(sec.mcq),
 hasTheory: !!(sec.theory || sec.written),
 hasCoding: !!(sec.coding),
 hasSql: !!(sec.sql),
 };
}

/* Enrich exam */
function enrichExam(e) {
 const now = new Date();
 const sections = e.hasMcq !== undefined
 ? { hasMcq: e.hasMcq, hasTheory: e.hasTheory, hasCoding: e.hasCoding }
 : parseSections(e.sections);

 let status = e.assignment_status || e.status || "assigned";
 if (["submitted", "completed"].includes(status)) {
 status = "submitted";
 } else if (e.start_date && e.end_date) {
 const start = new Date(e.start_date), end = new Date(e.end_date);
 if (now >= start && now <= end) status = "live";
 else if (now < start) status = "assigned";
 }

 const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBD";
 const fmtTime = d => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "TBD";

 return {
 ...e, ...sections, status,
 exam: e.exam || e.title || "",
 subject: e.subject || e.subject_name || "",
 college: e.college || "",
 code: e.code || e.subject_code || "",
 semester: e.semester || "",
 date: fmtDate(e.start_date),
 time: fmtTime(e.start_date),
 endTime: fmtTime(e.end_date),
 endDate: fmtDate(e.end_date),
 duration: e.duration_minutes ? `${e.duration_minutes} min` : "TBD",
 maxMarks: e.maxMarks || e.total_marks || null,
 };
}

/* 
 LIVE BANNER
 */
function LiveBanner({ exam, onEnter }) {
 return (
 <div style={{
 background: "linear-gradient(135deg,#fff5f5,#fff)",
 border: "1.5px solid #fca5a5",
 borderRadius: 14, padding: "18px 22px",
 marginBottom: 24,
 display: "flex", alignItems: "center", justifyContent: "space-between",
 boxShadow: "0 2px 16px rgba(220,38,38,0.08)",
 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
 <div style={{ position: "relative" }}>
 <div style={{
 width: 10, height: 10, borderRadius: "50%", background: "#dc2626",
 animation: "livePulse 1.5s ease-in-out infinite",
 }} />
 </div>
 <div>
 <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", marginBottom: 2, letterSpacing: ".5px" }}>
 LIVE NOW — Action Required
 </div>
 <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{exam.exam}</div>
 <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
 {exam.college || exam.subject} · Ends {exam.endTime}
 </div>
 </div>
 </div>
 <button
 onClick={onEnter}
 style={{
 display: "flex", alignItems: "center", gap: 8,
 padding: "10px 22px", borderRadius: 9, border: "none",
 background: "#dc2626", color: "#fff",
 fontSize: 13, fontWeight: 700, cursor: "pointer",
 boxShadow: "0 3px 14px rgba(220,38,38,0.35)",
 transition: "transform .15s, box-shadow .15s",
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 5px 20px rgba(220,38,38,0.45)"; }}
 onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 3px 14px rgba(220,38,38,0.35)"; }}
 >
 Enter Now
 </button>
 </div>
 );
}

/* 
 STAT COUNTER CARDS (top 3 boxes)
 */
function StatCounters({ active, pending, completed, activeTab, onTab }) {
 const items = [
 { id: "active", label: "Active Tests", count: active, color: "#dc2626" },
 { id: "pending", label: "Pending Tests", count: pending, color: "#2563eb" },
 { id: "completed", label: "Completed Tests", count: completed, color: "#059669" },
 ];
 return (
 <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
 {items.map(item => (
 <button
 key={item.id}
 onClick={() => onTab(item.id)}
 style={{
 display: "flex", alignItems: "center", justifyContent: "space-between",
 padding: "16px 20px", borderRadius: 12, cursor: "pointer",
 background: "#fff",
 border: activeTab === item.id ? `2px solid ${item.color}` : "2px solid #e2e8f0",
 boxShadow: activeTab === item.id ? `0 2px 16px ${item.color}22` : "0 1px 4px rgba(0,0,0,0.04)",
 transition: "all .2s", textAlign: "left",
 }}
 >
 <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{item.label}</div>
 <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.count}</div>
 </button>
 ))}
 </div>
 );
}

/* 
 EXAM CARD — matches hiring page card style
 */
function ExamCard({ exam, onClick, onEnter }) {
 const isLive = exam.status === "live";
 const isCompleted = exam.status === "submitted" || exam.status === "completed";

 return (
 <div
 onClick={onClick}
 style={{
 background: "#fff",
 border: `1.5px solid ${isLive ? "#fca5a5" : "#e2e8f0"}`,
 borderRadius: 14, overflow: "hidden", cursor: "pointer",
 transition: "transform .2s, box-shadow .2s",
 boxShadow: isLive ? "0 2px 16px rgba(220,38,38,0.08)" : "0 1px 6px rgba(0,0,0,0.04)",
 }}
 onMouseEnter={e => {
 e.currentTarget.style.transform = "translateY(-2px)";
 e.currentTarget.style.boxShadow = isLive ? "0 8px 28px rgba(220,38,38,0.14)" : "0 8px 24px rgba(0,0,0,0.10)";
 }}
 onMouseLeave={e => {
 e.currentTarget.style.transform = "";
 e.currentTarget.style.boxShadow = isLive ? "0 2px 16px rgba(220,38,38,0.08)" : "0 1px 6px rgba(0,0,0,0.04)";
 }}
 >
 {/* College tag + status row */}
 <div style={{
 display: "flex", alignItems: "center", justifyContent: "space-between",
 padding: "11px 16px",
 background: isLive ? "#fff5f5" : "#f8fbfc",
 borderBottom: "1px solid #f0f4f8",
 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <div style={{
 width: 26, height: 26, borderRadius: 7,
 background: isLive ? "#fee2e2" : "#e0f2fe",
 display: "flex", alignItems: "center", justifyContent: "center",
 fontSize: 12, fontWeight: 800,
 color: isLive ? "#dc2626" : "#0369a1",
 }}>
 {(exam.college || exam.subject || "U")[0].toUpperCase()}
 </div>
 <span style={{ fontSize: 12, fontWeight: 700, color: isLive ? "#dc2626" : "#0369a1" }}>
 {exam.college || exam.subject || "University"}
 </span>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 {isLive && (
 <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
 <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", animation: "livePulse 1.5s ease-in-out infinite" }} />
 <span style={{ fontSize: 10, fontWeight: 800, color: "#dc2626" }}>LIVE</span>
 </div>
 )}
 <StatusBadge status={exam.status} />
 </div>
 </div>

 <div style={{ padding: "14px 16px" }}>
 {/* Title */}
 <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1e293b", marginBottom: 3, lineHeight: 1.3 }}>
 {exam.exam}
 </div>
 {exam.subject && exam.subject !== exam.exam && (
 <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 10 }}>{exam.subject}</div>
 )}

 {/* Meta: duration, questions count, date */}
 <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
 <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
 {exam.duration}
 </span>
 {exam.semester && (
 <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
 {exam.semester}
 </span>
 )}
 <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
 {exam.date}, {exam.time}
 </span>
 </div>

 {/* Ends info */}
 {!isCompleted && (
 <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 12 }}>
 Ends: {exam.endDate}, {exam.endTime}
 </div>
 )}

 {/* Section chips */}
 <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
 {exam.hasMcq && <SectionChip label="MCQ" color="#2563eb" bg="#eff6ff" />}
 {exam.hasTheory && <SectionChip label="Theory" color="#7c3aed" bg="#f5f3ff" />}
 {exam.hasCoding && <SectionChip label="Coding" color="#d97706" bg="#fffbeb" />}
 {exam.hasSql && <SectionChip label="SQL" color="#0369a1" bg="#e0f2fe" />}
 </div>

 {/* Bottom action row */}
 {isLive ? (
 <button
 onClick={e => { e.stopPropagation(); onEnter(exam); }}
 style={{
 width: "100%", padding: "10px", borderRadius: 9, border: "none",
 background: "#dc2626", color: "#fff",
 fontSize: 13, fontWeight: 700, cursor: "pointer",
 display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
 boxShadow: "0 2px 10px rgba(220,38,38,0.3)",
 }}
 >
 Start Assessment
 </button>
 ) : isCompleted ? (
 <div style={{
 padding: "9px 12px", borderRadius: 9,
 background: "#fefce8", border: "1px solid #fde047",
 fontSize: 11.5, color: "#854d0e",
 display: "flex", alignItems: "center", gap: 6,
 }}>
 Submitted — results will be published after faculty review.
 </div>
 ) : (
 <div style={{
 padding: "9px 12px", borderRadius: 9,
 background: "#eff6ff", border: "1px solid #bfdbfe",
 fontSize: 11.5, color: "#1d4ed8",
 display: "flex", alignItems: "center", gap: 6,
 }}>
 Exam starts {exam.date}, {exam.time}
 </div>
 )}
 </div>
 </div>
 );
}

/* Exam list skeleton */
function CardSkeleton() {
 return (
 <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
 <div style={{ padding: "11px 16px", background: "#f8fbfc", borderBottom: "1px solid #f0f4f8" }}>
 <Skeleton w={100} h={14} r={5} />
 </div>
 <div style={{ padding: "14px 16px" }}>
 <Skeleton w="65%" h={17} r={5} style={{ marginBottom: 8 }} />
 <Skeleton w="45%" h={12} r={5} style={{ marginBottom: 14 }} />
 <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
 <Skeleton w={50} h={22} r={5} />
 <Skeleton w={60} h={22} r={5} />
 </div>
 <Skeleton w="100%" h={38} r={9} />
 </div>
 </div>
 );
}

/* 
 DETAIL VIEW
 */
function ExamDetailView({ exam, onBack, onEnter }) {
 const isLive = exam.status === "live";
 const isPending = exam.status === "assigned";
 const isCompleted = exam.status === "submitted" || exam.status === "completed";

 return (
 <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
 {/* Colored top stripe */}
 <div style={{ height: 4, background: isLive ? "#dc2626" : isPending ? "#2563eb" : "#059669" }} />

 <div style={{ padding: "24px 28px" }}>
 {/* Header */}
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #f0f4f8" }}>
 <div>
 <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
 {exam.code && <span style={{ padding: "2px 9px", borderRadius: 5, background: "#eff6ff", color: "#1d4ed8", fontSize: 10.5, fontWeight: 700 }}>{exam.code}</span>}
 {exam.semester && <span style={{ padding: "2px 9px", borderRadius: 5, background: "#f0f9ff", color: "#0369a1", fontSize: 10.5, fontWeight: 700 }}>{exam.semester}</span>}
 <StatusBadge status={exam.status} />
 </div>
 <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4, letterSpacing: "-.4px" }}>{exam.exam}</h1>
 {exam.subject && exam.subject !== exam.exam && <p style={{ fontSize: 13, color: "#64748b" }}>{exam.subject}</p>}
 </div>
 {isLive && (
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#dc2626", animation: "livePulse 1.5s ease-in-out infinite" }} />
 <span style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>EXAM IN PROGRESS</span>
 </div>
 )}
 {isCompleted && (
 <div style={{ padding: "6px 14px", borderRadius: 9, background: "#fefce8", border: "1px solid #fde047", fontSize: 12, fontWeight: 700, color: "#854d0e" }}> Under Review</div>
 )}
 </div>

 {/* Live banner */}
 {isLive && (
 <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 11, padding: "16px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 3 }}>This exam is live now!</div>
 <div style={{ fontSize: 12, color: "#64748b" }}>Complete the verification flow before entering: Instructions → Location → ID Scan → Face Match → Exam Key</div>
 </div>
 <button onClick={onEnter} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(220,38,38,0.3)", flexShrink: 0, marginLeft: 16 }}>Enter Exam</button>
 </div>
 )}

 {isPending && (
 <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#1d4ed8" }}>
 Your exam key will be sent to your registered email when the exam begins. The full verification flow will run before the exam starts.
 </div>
 )}

 {isCompleted && (
 <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 11, padding: "16px 18px", marginBottom: 20 }}>
 <div style={{ fontSize: 13, fontWeight: 700, color: "#854d0e", marginBottom: 5 }}> Exam Submitted Successfully</div>
 <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.65 }}>
 Your responses have been recorded. Results will be published once faculty completes the evaluation, including manual review of theory answers.
 </div>
 {exam.hasTheory && (
 <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, fontSize: 11.5, color: "#9a3412" }}>
 This exam includes theory questions that require faculty review before results are finalised.
 </div>
 )}
 </div>
 )}

 {/* Meta grid */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
 {[
 { label: "DATE", value: exam.date },
 { label: "TIME", value: exam.time },
 { label: "DURATION", value: exam.duration },
 ].map((d, i) => (
 <div key={i} style={{ background: "#f8fbfc", borderRadius: 9, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".6px", marginBottom: 5 }}>{d.label}</div>
 <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{d.value}</div>
 </div>
 ))}
 </div>

 {/* Sections */}
 <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Exam Format</div>
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
 {exam.hasMcq && (
 <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 14px", background: "#f0fdf4", borderRadius: 9, border: "1px solid #bbf7d022" }}>
 <span style={{ width: 24, height: 24, borderRadius: 6, background: "#15803d22", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
 <div>
 <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>MCQ Section</div>
 <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Multiple choice questions. Options shuffled per student. Auto-graded.</div>
 </div>
 {isCompleted && <span style={{ marginLeft: "auto", color: "#059669", fontSize: 18, alignSelf: "center" }}></span>}
 </div>
 )}
 {exam.hasTheory && (
 <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 14px", background: "#f5f3ff", borderRadius: 9, border: "1px solid #ddd6fe22" }}>
 <span style={{ width: 24, height: 24, borderRadius: 6, background: "#7c3aed22", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{exam.hasMcq ? 2 : 1}</span>
 <div>
 <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>Theory Section</div>
 <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Written/descriptive questions. AI-scored using key points; faculty can override.</div>
 </div>
 {isCompleted && <span style={{ marginLeft: "auto", color: "#059669", fontSize: 18, alignSelf: "center" }}></span>}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

/* 
 MAIN PAGE
 */
export default function StudentUniversity() {
 const navigate = useNavigate();
 const [exams, setExams] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [selected, setSelected] = useState(null);
 const [activeTab, setActiveTab] = useState("active");

 const fetchExams = useCallback(async (silent = false) => {
 if (!silent) setLoading(true);
 setError(null);
 try {
 const token = localStorage.getItem("token") || localStorage.getItem("student_token") || localStorage.getItem("authToken") || "";
 if (!token) throw new Error("Not logged in");
 const res = await fetch(`${API_URL}/exams/student/university`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
 const data = await res.json();
 const all = Array.isArray(data) ? data : (data.exams || []);
 setExams(all.map(enrichExam));
 } catch (err) { setError(err.message); }
 finally { setLoading(false); }
 }, []);

 useEffect(() => {
 fetchExams();
 const iv = setInterval(() => fetchExams(true), 30000);
 return () => clearInterval(iv);
 }, [fetchExams]);

 useEffect(() => {
 if (selected) {
 const updated = exams.find(e => e.id === selected.id);
 if (updated) setSelected(updated);
 }
 }, [exams]); // eslint-disable-line

 const activeExams = exams.filter(e => e.status === "live");
 const pendingExams = exams.filter(e => e.status === "assigned" || e.status === "upcoming");
 const completedExams = exams.filter(e => e.status === "submitted" || e.status === "completed");

 // Auto-set tab if there's a live exam
 useEffect(() => {
 if (activeExams.length > 0) setActiveTab("active");
 }, [activeExams.length]);

 const liveExams = activeExams;

 const displayedExams = activeTab === "active" ? activeExams : activeTab === "pending" ? pendingExams : completedExams;

 const handleEnterExam = (exam) => {
 navigate("/university-exam-flow", { state: { exam: { ...exam, exam_type: "university" }, isUniversity: true } });
 };

 // Detail view
 if (selected) {
 return (
 <StudentLayout activePath="/student-university">
 <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}`}</style>
 <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b" }}>
 ← Back to Exams
 </button>
 <ExamDetailView exam={selected} onBack={() => setSelected(null)} onEnter={() => handleEnterExam(selected)} />
 </StudentLayout>
 );
 }

 return (
 <StudentLayout activePath="/student-university">
 <style>{`
 @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
 @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}
 `}</style>

 {/* Page header */}
 <div style={{ marginBottom: 22 }}>
 <button onClick={() => navigate("/student-dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
 ← Dashboard
 </button>
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
 <div>
 <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", letterSpacing: "-.5px", marginBottom: 3 }}>University Exams</h1>
 <p style={{ fontSize: 13, color: "#64748b" }}>
 {loading ? "Loading your exams…" : `${exams.length} exam${exams.length !== 1 ? "s" : ""} · Placement assessments assigned to you`}
 {!loading && <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8" }}>· Refreshed {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
 </p>
 </div>
 <button onClick={() => fetchExams()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
 Refresh
 </button>
 </div>
 </div>

 {/* Live exam banner */}
 {!loading && liveExams.length > 0 && (
 liveExams.map(exam => (
 <LiveBanner key={exam.id} exam={exam} onEnter={() => handleEnterExam(exam)} />
 ))
 )}

 {/* Error */}
 {error && (
 <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "13px 18px", marginBottom: 18, fontSize: 13, color: "#dc2626" }}>
 Failed to load exams: {error}.{" "}
 <button onClick={() => fetchExams()} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Retry</button>
 </div>
 )}

 {/* Stat counter cards / tab switchers */}
 {!loading && !error && exams.length > 0 && (
 <StatCounters
 active={activeExams.length}
 pending={pendingExams.length}
 completed={completedExams.length}
 activeTab={activeTab}
 onTab={setActiveTab}
 />
 )}

 {/* Tab label */}
 {!loading && !error && exams.length > 0 && (
 <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "2px solid #f0f4f8" }}>
 {[
 { id: "active", label: `Active Assessments`, count: activeExams.length },
 { id: "pending", label: `Pending`, count: pendingExams.length },
 { id: "completed", label: `Completed`, count: completedExams.length },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 style={{
 padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
 fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
 color: activeTab === tab.id ? "#2563eb" : "#64748b",
 borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
 marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
 }}
 >
 {tab.label}
 <span style={{
 padding: "1px 7px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
 background: activeTab === tab.id ? "#2563eb" : "#f0f4f8",
 color: activeTab === tab.id ? "#fff" : "#64748b",
 }}>{tab.count}</span>
 </button>
 ))}
 </div>
 )}

 {/* Skeletons */}
 {loading && (
 <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
 {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
 </div>
 )}

 {/* No exams */}
 {!loading && !error && exams.length === 0 && (
 <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 14, border: "1.5px dashed #e2e8f0" }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}></div>
 <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No University Exams</div>
 <div style={{ fontSize: 13, color: "#64748b" }}>You have no university exams scheduled yet. Check back later.</div>
 </div>
 )}

 {/* Empty state for tab */}
 {!loading && !error && exams.length > 0 && displayedExams.length === 0 && (
 <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 14, border: "1.5px dashed #e2e8f0" }}>
 <div style={{ fontSize: 32, marginBottom: 8 }}>
 {activeTab === "active" ? "" : activeTab === "pending" ? "" : ""}
 </div>
 <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
 {activeTab === "active" ? "No Active Tests Right Now" : activeTab === "pending" ? "No Pending Tests" : "No Completed Tests"}
 </div>
 <div style={{ fontSize: 12, color: "#64748b" }}>
 {activeTab === "active" ? "You have no live exams at this moment." : activeTab === "pending" ? "You have no upcoming exams scheduled." : "Exams you have submitted will appear here."}
 </div>
 </div>
 )}

 {/* Exam cards grid */}
 {!loading && !error && displayedExams.length > 0 && (
 <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
 {displayedExams.map(exam => (
 <ExamCard
 key={exam.id}
 exam={exam}
 onClick={() => setSelected(exam)}
 onEnter={handleEnterExam}
 />
 ))}
 </div>
 )}
 </StudentLayout>
 );
}


