import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T } from "./Studentdashboard ";

const UNI_EXAMS = [
  { id: 200, exam: "React Semester Examination",   subject: "Web Technologies",    code: "CS4012", semester: "Semester 6", date: "Today, 2:30 PM", time: "2:30 PM – 5:30 PM",  hall: "Block A, Hall 3", status: "live",      duration: "3 hrs", maxMarks: 100, verifyCode: "EX-CS4012-2025-041", syllabus: ["React Fundamentals & JSX", "Hooks & Context API", "State Management (Redux)", "React Router v6", "Testing with Jest & RTL"] },
  { id: 201, exam: "Data Structures & Algorithms", subject: "Core Computer Science", code: "CS3005", semester: "Semester 6", date: "Apr 16, 2025",  time: "2:00 PM – 5:00 PM",  hall: "Block B, Hall 1", status: "upcoming",  duration: "3 hrs", maxMarks: 100, syllabus: ["Arrays, Linked Lists & Stacks", "Trees & Graphs", "Sorting & Searching", "Dynamic Programming", "Complexity Analysis"] },
  { id: 202, exam: "Database Management Systems",  subject: "Core Computer Science", code: "CS3008", semester: "Semester 6", date: "Mar 5, 2025",   time: "9:00 AM – 12:00 PM", hall: "Block C, Hall 2", status: "completed", duration: "3 hrs", maxMarks: 100, grade: "A",  marks: 88, syllabus: ["SQL & Normalization", "Transactions & ACID", "Indexing & Query Optimization", "NoSQL Basics"] },
  { id: 203, exam: "Operating Systems",            subject: "Core Computer Science", code: "CS3006", semester: "Semester 5", date: "Nov 20, 2024",  time: "2:00 PM – 5:00 PM",  hall: "Block A, Hall 2", status: "completed", duration: "3 hrs", maxMarks: 100, grade: "B+", marks: 76, syllabus: ["Process Management", "Memory Management", "File Systems", "Deadlocks & Scheduling"] },
];

function SLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 12 }}>{children}</div>;
}

function UniCard({ exam, onClick }) {
  const isLive = exam.status === "live";
  const isUp   = exam.status === "upcoming";
  const gc = !exam.grade ? T.accent : exam.grade.startsWith("A") ? T.green : T.amber;
  return (
    <div className="na-card" style={{ overflow: "hidden", cursor: "pointer", borderColor: isLive ? "#dc262655" : "#b8eaee" }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ height: 3, background: isLive ? T.red : isUp ? T.accent : T.green }} />
      <div style={{ padding: "17px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <span style={{ padding: "2px 8px", borderRadius: 5, background: T.accentSoft, fontSize: 10.5, fontWeight: 700, color: T.accent }}>{exam.code}</span>
              <span style={{ padding: "2px 8px", borderRadius: 5, background: T.lightCyan, fontSize: 10.5, fontWeight: 600, color: T.muted }}>{exam.semester}</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 3 }}>{exam.exam}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{exam.subject}</div>
          </div>
          {isLive && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div className="live-dot" /><span style={{ fontSize: 10, fontWeight: 700, color: T.red }}>LIVE</span></div>}
          {isUp   && <span className="na-badge" style={{ background: T.accentSoft, color: T.accent }}>Scheduled</span>}
          {!isLive && !isUp && exam.grade && <div style={{ width: 42, height: 42, borderRadius: 9, background: gc + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: gc }}>{exam.grade}</div>}
        </div>
        <div style={{ display: "flex", gap: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: T.dim, display: "flex" }}><Icons.Calendar /></span><span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{exam.date}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: T.dim, display: "flex" }}><Icons.Clock /></span><span style={{ fontSize: 12, color: T.muted }}>{exam.time}</span></div>
          {!isLive && !isUp && exam.marks != null && <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: gc }}>{exam.marks}/{exam.maxMarks}</div>}
        </div>
      </div>
    </div>
  );
}

function UniDetail({ exam, onBack, onVerify }) {
  const isLive = exam.status === "live";
  const isUp   = exam.status === "upcoming";
  const gc = !exam.grade ? T.accent : exam.grade.startsWith("A") ? T.green : T.amber;
  return (
    <div className="na-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: isLive ? T.red : isUp ? T.accent : T.green }} />
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
              <span style={{ padding: "3px 9px", borderRadius: 5, background: T.accentSoft, fontSize: 11, fontWeight: 700, color: T.accent }}>{exam.code}</span>
              <span style={{ padding: "3px 9px", borderRadius: 5, background: T.lightCyan, fontSize: 11, fontWeight: 600, color: T.muted }}>{exam.semester}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-.4px", marginBottom: 4 }}>{exam.exam}</h1>
            <p style={{ fontSize: 13, color: T.muted }}>{exam.subject}</p>
          </div>
          {isLive && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="live-dot" /><span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>EXAM IN PROGRESS</span></div>}
          {!isLive && !isUp && exam.grade && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: gc + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: gc }}>{exam.grade}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{exam.marks}/{exam.maxMarks}</div>
            </div>
          )}
        </div>
        {isLive && exam.verifyCode && (
          <div style={{ background: T.redSoft, border: `1px solid ${T.red}33`, borderRadius: 9, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.red, marginBottom: 4 }}>VERIFICATION CODE</div>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: "2px" }}>{exam.verifyCode}</div>
            </div>
            <button className="na-btn na-btn-danger" onClick={onVerify}><Icons.Play /> Enter Exam</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
          {[{ label: "DATE", value: exam.date }, { label: "TIME", value: exam.time }, { label: "HALL", value: exam.hall || "TBA" }, { label: "DURATION", value: exam.duration }].map((d, i) => (
            <div key={i} style={{ background: T.lightCyan, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, letterSpacing: ".5px", marginBottom: 5 }}>{d.label}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{d.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Syllabus</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {exam.syllabus.map((topic, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: T.lightCyan, borderRadius: 7, border: `1px solid ${T.border}` }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: T.accentSoft, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{topic}</span>
              {!isLive && !isUp && <span style={{ marginLeft: "auto", color: T.green, display: "flex" }}><Icons.CheckCircle /></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentUniversity() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  return (
    <StudentLayout activePath="/student-university">
      {selected ? (
        <>
          <button className="na-back" style={{ marginBottom: 18 }} onClick={() => setSelected(null)}><Icons.ChevronLeft /> Back to Exams</button>
          <UniDetail exam={selected} onBack={() => setSelected(null)} onVerify={() => navigate("/exam-verify", { state: { exam: selected } })} />
        </>
      ) : (
        <>
          <div style={{ marginBottom: 22 }}>
            <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}><Icons.ChevronLeft /> Dashboard</button>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>University Exams</h1>
            <p style={{ fontSize: 13, color: T.muted }}>Academic schedule · B.Tech Computer Science · Semester 6</p>
          </div>
          {UNI_EXAMS.filter(e => e.status === "live").length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <SLabel>Live Now</SLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {UNI_EXAMS.filter(e => e.status === "live").map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 26 }}>
            <SLabel>Upcoming</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {UNI_EXAMS.filter(e => e.status === "upcoming").map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
            </div>
          </div>
          <div>
            <SLabel>Past Examinations</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {UNI_EXAMS.filter(e => e.status === "completed").map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
            </div>
          </div>
        </>
      )}
    </StudentLayout>
  );
}