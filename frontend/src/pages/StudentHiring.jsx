import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T, CSS } from "./Studentdashboard ";

const HIRING_EXAMS = [
  { id: 1, exam: "Data Structures Assessment", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "90 min", questions: 45, date: "Today, 2:00 PM", endDate: "18 Dec 2024", status: "live",      tags: ["DSA", "Algorithms"] },
  { id: 2, exam: "Backend Developer Test",      company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "60 min", questions: 30, date: "Tomorrow, 10AM", endDate: "15 Nov 2024", status: "assigned",  tags: ["Node.js", "SQL"] },
  { id: 3, exam: "System Design Round",         company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "75 min", questions: 20, date: "Mar 10",         endDate: "15 Nov 2024", status: "assigned",  tags: ["Architecture", "Scalability"] },
  { id: 4, exam: "Full Stack Assessment",       company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "120 min",questions: 50, date: "Mar 15",         endDate: "20 Nov 2024", status: "assigned",  tags: ["React", "Node.js"] },
  { id: 5, exam: "Python & ML Fundamentals",   company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "60 min", questions: 35, date: "Feb 28",         endDate: "10 Mar 2024", status: "completed", tags: ["Python", "ML"] },
  { id: 6, exam: "Cloud Infrastructure Test",  company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "45 min", questions: 25, date: "Jan 20",         endDate: "25 Jan 2024", status: "completed", tags: ["AWS", "DevOps"] },
];

const INTERVIEWS = [
  { id: 100, type: "Technical Interview", role: "Software Engineer – Full Stack", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Mar 11, 2:00 PM", duration: "60 min", interviewer: "Rajesh Kumar",  status: "confirmed", result: null,       meetingLink: "https://teams.microsoft.com" },
  { id: 101, type: "Technical Interview", role: "Backend Developer",              company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Mar 12, 10AM",   duration: "45 min", interviewer: "Sarah Johnson", status: "scheduled", result: null,       meetingLink: "https://zoom.us" },
  { id: 102, type: "HR Interview",        role: "Graduate Trainee – Java",        company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Final",   date: "Mar 15, 2:00 PM", duration: "30 min", interviewer: "Alex Chen",     status: "scheduled", result: null,       meetingLink: "https://meet.google.com" },
  { id: 103, type: "Coding Interview",    role: "Software Engineer – Data",       company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Feb 20, 9AM",    duration: "50 min", interviewer: "Priya Patel",   status: "completed", result: "selected", meetingLink: "" },
  { id: 104, type: "HR Interview",        role: "Graduate Programme – DevOps",    company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Initial", date: "Feb 10, 1PM",    duration: "20 min", interviewer: "Lisa Zhang",    status: "completed", result: "rejected", meetingLink: "" },
];

const IV_STATUS = {
  confirmed: { bg: "#d9f5ec", color: "#0a8f5c" },
  scheduled: { bg: "#d9f2f4", color: "#2BB1A8" },
  upcoming:  { bg: "#fef3c7", color: "#b45309" },
  completed: { bg: "#f1f3f6", color: "#64707d" },
};

const RESULT = {
  selected: { label: "Selected",        bg: "#d9f5ec", color: "#0a8f5c" },
  rejected: { label: "Not Selected",    bg: "#fee2e2", color: "#dc2626" },
  waiting:  { label: "Awaiting Result", bg: "#fef3c7", color: "#b45309" },
};

function ExamCard({ exam, onStart }) {
  const isLive = exam.status === "live";
  const isDone = exam.status === "completed";
  return (
    <div className="na-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", borderColor: isLive ? "#dc262655" : "#b8eaee" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ padding: "10px 15px", background: exam.companyBg, display: "flex", alignItems: "center", gap: 9, borderBottom: `1px solid ${exam.companyColor}20` }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,.65)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: exam.companyColor }}>{exam.logo}</div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: exam.companyColor }}>{exam.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {isLive && <><div className="live-dot" /><span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", letterSpacing: ".5px" }}>LIVE</span></>}
          {isDone && <span className="na-badge" style={{ background: "#d9f5ec", color: "#0a8f5c" }}><Icons.CheckCircle /> Completed</span>}
          {!isLive && !isDone && <span className="na-badge" style={{ background: "#d9f2f4", color: "#2BB1A8" }}>Assigned</span>}
        </div>
      </div>
      <div style={{ padding: 15, flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>{exam.exam}</div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: T.dim, display: "flex" }}><Icons.Clipboard /></span><span style={{ fontSize: 12, color: T.muted }}>{exam.questions} Questions</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: T.dim, display: "flex" }}><Icons.Clock /></span><span style={{ fontSize: 12, color: T.muted }}>{exam.duration}</span></div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {exam.tags.map((tag, i) => <span key={i} className="na-tag">{tag}</span>)}
        </div>
        {isLive && onStart && (
          <button className="na-btn na-btn-danger" style={{ width: "100%" }} onClick={onStart}><Icons.Play /> Start Assessment</button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="na-card" style={{ padding: "52px 40px", textAlign: "center", color: T.dim }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icons.Inbox /></div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function StudentHiring() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("assessments");

  const active    = HIRING_EXAMS.filter(e => ["live", "assigned"].includes(e.status));
  const completed = HIRING_EXAMS.filter(e => e.status === "completed");
  const upcoming  = INTERVIEWS.filter(i => ["confirmed", "scheduled", "upcoming"].includes(i.status));
  const doneIVs   = INTERVIEWS.filter(i => i.status === "completed");

  const tabs = [
    { id: "assessments", label: "Active Assessments", count: active.length },
    { id: "interviews",  label: "Interviews",         count: INTERVIEWS.length },
    { id: "completed",   label: "Completed",          count: completed.length },
  ];

  return (
    <StudentLayout activePath="/student-hiring">

      <div style={{ marginBottom: 22 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}><Icons.ChevronLeft /> Dashboard</button>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>Hiring Assessments</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Placement assessments and scheduled interviews</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
        {[{ label: "Active Tests", value: active.length, color: T.accent }, { label: "Interviews", value: INTERVIEWS.length, color: T.navy }, { label: "Completed", value: completed.length, color: T.green }].map((s, i) => (
          <div key={i} className="na-card" style={{ padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} className={`na-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, fontSize: 10, fontWeight: 700, background: tab === t.id ? T.accent : T.border, color: tab === t.id ? "#fff" : T.muted, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab: Active Assessments */}
      {tab === "assessments" && (
        active.length === 0 ? <EmptyState label="No active assessments" /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {active.map(exam => <ExamCard key={exam.id} exam={exam} onStart={() => navigate("/exam-verify", { state: { exam } })} />)}
        </div>
      )}

      {/* Tab: Interviews */}
      {tab === "interviews" && (
        <>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 12 }}>Upcoming</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14, marginBottom: 26 }}>
                {upcoming.map(iv => {
                  const sc = IV_STATUS[iv.status] || { bg: T.bg, color: T.muted };
                  return (
                    <div key={iv.id} className="na-card" style={{ overflow: "hidden" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(43,177,168,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                      <div style={{ padding: "10px 14px", background: iv.companyBg, display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${iv.companyColor}20` }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: iv.companyColor }}>{iv.logo}</div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: iv.companyColor }}>{iv.company}</span>
                        <span className="na-badge" style={{ marginLeft: "auto", background: sc.bg, color: sc.color }}>{iv.status}</span>
                      </div>
                      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{iv.type}</div>
                          <div style={{ fontSize: 11.5, color: T.muted }}>{iv.role} · {iv.round}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                          {[{ icon: <Icons.Calendar />, v: iv.date }, { icon: <Icons.User />, v: iv.interviewer }, { icon: <Icons.Clock />, v: iv.duration }].map((r, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ color: T.dim, display: "flex" }}>{r.icon}</span>
                              <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                        <button className="na-btn na-btn-primary" style={{ width: "100%" }} onClick={() => window.open(iv.meetingLink, "_blank")}><Icons.Phone /> Join Interview</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {doneIVs.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 12 }}>Completed Interviews</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {doneIVs.map(iv => {
                  const rc = iv.result ? RESULT[iv.result] : null;
                  return (
                    <div key={iv.id} className="na-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: iv.companyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: iv.companyColor, flexShrink: 0 }}>{iv.logo}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{iv.role}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{iv.type} · {iv.round} · {iv.date}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: T.dim }}>{iv.interviewer}</span>
                        {rc && <span className="na-badge" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Completed */}
      {tab === "completed" && (
        completed.length === 0 ? <EmptyState label="No completed assessments" /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {completed.map(exam => <ExamCard key={exam.id} exam={exam} onStart={null} />)}
        </div>
      )}

    </StudentLayout>
  );
}