// StudentUniversity.jsx — University exam list + detail view
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T } from "./Studentdashboard ";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Skeleton({ w = "100%", h = 14, r = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

function SLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.dim,
      letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    live:      { label: "Live",      color: T.red,    bg: T.redSoft    },
    upcoming:  { label: "Scheduled", color: T.accent, bg: T.accentSoft },
    completed: { label: "Completed", color: T.green,  bg: T.greenSoft  },
  };
  const s = map[status] || map.completed;
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 20,
      fontSize: 10.5, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function GradeBadge({ grade, marks, maxMarks }) {
  if (!grade && marks == null) return null;
  const color = !grade ? T.accent : grade.startsWith("A") ? T.green : T.amber;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 42, height: 42, borderRadius: 9,
        background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, color,
      }}>
        {grade || "—"}
      </div>
      {marks != null && (
        <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>
          {marks}/{maxMarks}
        </div>
      )}
    </div>
  );
}

// ── Info pill helper ──────────────────────────────────────────────────────────
function Pill({ children, bg = T.accentSoft, color = T.accent }) {
  if (!children) return null;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 5, background: bg, fontSize: 10.5, fontWeight: 700, color }}>
      {children}
    </span>
  );
}

function UniCard({ exam, onClick }) {
  const isLive = exam.status === "live";
  const isUp   = exam.status === "upcoming";
  const barColor = isLive ? T.red : isUp ? T.accent : T.green;

  // Build section tags
 const hasMcq     = exam.hasMcq !== false;     // Backend sends true/false
const hasWritten = exam.hasWritten !== false;

  return (
    <div
      className="na-card"
      style={{ overflow: "hidden", cursor: "pointer", borderColor: isLive ? T.red + "55" : T.border }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ height: 3, background: barColor }} />
      <div style={{ padding: "17px 20px" }}>

        {/* Top row: badges + live/status indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {exam.code   && <Pill>{exam.code}</Pill>}
            {exam.semester && <Pill bg={T.lightCyan} color={T.muted}>{exam.semester}</Pill>}
            {exam.exam_name && <Pill bg="#fef9c3" color="#92400e">{exam.exam_name}</Pill>}
            {hasMcq     && <Pill bg="#f0fdf4" color="#15803d">MCQ</Pill>}
            {hasWritten  && <Pill bg="#f5f3ff" color="#7c3aed">Written</Pill>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0, marginLeft: 8 }}>
            {isLive && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="live-dot" />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.red }}>LIVE</span>
              </div>
            )}
            {!isLive && !isUp && (
              <GradeBadge grade={exam.grade} marks={exam.score} maxMarks={exam.maxMarks} />
            )}
            {isUp && <StatusBadge status="upcoming" />}
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 2 }}>
          {exam.exam}
        </div>
        {/* Subject */}
        {exam.subject && (
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{exam.subject}</div>
        )}

        {/* Meta row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "10px 0", borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, letterSpacing: ".4px", marginBottom: 2 }}>DATE</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: T.dim, display: "flex" }}><Icons.Calendar /></span>
              {exam.date}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, letterSpacing: ".4px", marginBottom: 2 }}>TIME</div>
            <div style={{ fontSize: 12, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: T.dim, display: "flex" }}><Icons.Clock /></span>
              {exam.time}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, letterSpacing: ".4px", marginBottom: 2 }}>DURATION</div>
            <div style={{ fontSize: 12, color: T.muted }}>{exam.duration}</div>
          </div>
        </div>

        {/* Score if completed */}
        {!isLive && !isUp && exam.score != null && (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: exam.grade?.startsWith("A") ? T.green : T.amber }}>
              Score: {exam.score}/{exam.maxMarks}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function UniDetail({ exam, onBack, onEnter }) {
  const isLive = exam.status === "live";
  const isUp   = exam.status === "upcoming";
  const barColor = isLive ? T.red : isUp ? T.accent : T.green;
  const gradeColor = !exam.grade ? T.accent : exam.grade.startsWith("A") ? T.green : T.amber;

  const metaItems = [
    { label: "DATE",      value: exam.date       || "—" },
    { label: "TIME",      value: exam.time       || "—" },
    { label: "DURATION",  value: exam.duration   || "—" },
    { label: "MAX MARKS", value: exam.maxMarks != null ? String(exam.maxMarks) : "—" },
  ];

  const sections = [];
  if (exam.hasMcq)     sections.push({ label: "MCQ Section",     color: "#15803d", bg: "#f0fdf4", desc: `${exam.mcqCount || ""} randomized multiple choice questions. Options shuffled per student. Auto-graded.` });
  if (exam.hasWritten) sections.push({ label: "Written Section", color: "#7c3aed", bg: "#f5f3ff", desc: `${exam.writtenCount || ""} descriptive questions. Answers typed in the exam portal and reviewed by faculty.` });

  return (
    <div className="na-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: barColor }} />
      <div style={{ padding: "24px 28px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ display: "flex", gap: 7, marginBottom: 9, flexWrap: "wrap" }}>
              {exam.code      && <Pill>{exam.code}</Pill>}
              {exam.semester  && <Pill bg={T.lightCyan} color={T.muted}>{exam.semester}</Pill>}
              {exam.exam_name && <Pill bg="#fef9c3" color="#92400e">{exam.exam_name}</Pill>}
              <StatusBadge status={exam.status} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-.4px", marginBottom: 4 }}>
              {exam.exam}
            </h1>
            {exam.subject && <p style={{ fontSize: 13, color: T.muted }}>{exam.subject}</p>}
          </div>
          {isLive && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>EXAM IN PROGRESS</span>
            </div>
          )}
          {!isLive && !isUp && exam.grade && (
            <GradeBadge grade={exam.grade} marks={exam.score} maxMarks={exam.maxMarks} />
          )}
        </div>

        {/* Live banner */}
        {isLive && (
          <div style={{ background: T.redSoft, border: `1px solid ${T.red}33`, borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 4 }}>
                🔴 This exam is live now!
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                Check your email for your unique exam key. Enter it on the next screen to begin.
              </div>
            </div>
            <button className="na-btn na-btn-danger" onClick={onEnter} style={{ flexShrink: 0 }}>
              <Icons.Play /> Enter Exam
            </button>
          </div>
        )}

        {/* Upcoming reminder */}
        {isUp && (
          <div style={{ background: T.accentSoft, border: `1px solid ${T.accent}33`, borderRadius: 9, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: T.accent, display: "flex", gap: 8 }}>
            <Icons.Clock />
            <span>
              Your unique exam key will be sent to your registered email when the exam begins.
              Your question paper will be uniquely randomized — different from other students.
            </span>
          </div>
        )}

        {/* Meta grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
          {metaItems.map((d, i) => (
            <div key={i} style={{ background: T.lightCyan, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, letterSpacing: ".5px", marginBottom: 5 }}>
                {d.label}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>
                {d.value}
              </div>
            </div>
          ))}
        </div>

        {/* Result if completed */}
        {!isLive && !isUp && exam.score != null && (
          <div style={{ background: T.lightCyan, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 10, letterSpacing: ".5px" }}>RESULT</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, marginBottom: 3 }}>MCQ Score</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>{exam.score}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, marginBottom: 3 }}>Total</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{exam.maxMarks}</div>
              </div>
              {exam.grade && (
                <div>
                  <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, marginBottom: 3 }}>Grade</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: gradeColor }}>{exam.grade}</div>
                </div>
              )}
              <div style={{ fontSize: 12, color: T.muted, alignSelf: "flex-end", paddingBottom: 4 }}>
                Written answers pending faculty review
              </div>
            </div>
          </div>
        )}

        {/* Exam format */}
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Exam Format</div>
        {sections.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted }}>No sections configured.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sections.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 14px", background: item.bg, borderRadius: 8, border: `1px solid ${item.color}22` }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: item.color + "22", color: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{item.desc}</div>
                </div>
                {!isLive && !isUp && (
                  <span style={{ marginLeft: "auto", color: T.green, display: "flex", alignSelf: "center" }}>
                    <Icons.CheckCircle />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 11.5, color: "#0369a1", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          <span>
            Your question paper is uniquely generated and different from other students.
            MCQ options are also individually randomized.
          </span>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="na-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: "#e2e8f0" }} />
      <div style={{ padding: "17px 20px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <Skeleton w={60} h={18} r={5} />
          <Skeleton w={80} h={18} r={5} />
        </div>
        <Skeleton w="70%" h={16} r={5} style={{ marginBottom: 6 }} />
        <Skeleton w="45%" h={13} r={5} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <Skeleton w="80%" h={13} r={5} />
          <Skeleton w="80%" h={13} r={5} />
          <Skeleton w="60%" h={13} r={5} />
        </div>
      </div>
    </div>
  );
}

export default function StudentUniversity() {
  const navigate = useNavigate();
  const [exams,    setExams]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchExams = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_URL}/api/exams/student/university`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    const interval = setInterval(() => fetchExams(true), 30000);
    return () => clearInterval(interval);
  }, [fetchExams]);

  // Keep selected exam in sync when list refreshes
  useEffect(() => {
    if (selected) {
      const updated = exams.find(e => e.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [exams]); // eslint-disable-line react-hooks/exhaustive-deps

  const live      = exams.filter(e => e.status === "live");
  const upcoming  = exams.filter(e => e.status === "upcoming");
  const completed = exams.filter(e => e.status === "completed");

  const handleEnterExam = (exam) => {
    navigate("/instruction", {
      state: {
        exam,
        examType: "university",
        isUniversity: true,
      },
    });
  };

  if (selected) {
    return (
      <StudentLayout activePath="/student-university">
        <button className="na-back" style={{ marginBottom: 18 }} onClick={() => setSelected(null)}>
          <Icons.ChevronLeft /> Back to Exams
        </button>
        <UniDetail
          exam={selected}
          onBack={() => setSelected(null)}
          onEnter={() => handleEnterExam(selected)}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout activePath="/student-university">
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .live-dot { width:8px; height:8px; border-radius:50%; background:#dc2626; animation:livePulse 1.5s ease-in-out infinite; }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.4)} }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}>
          <Icons.ChevronLeft /> Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>
              University Exams
            </h1>
            <p style={{ fontSize: 13, color: T.muted }}>
              {loading ? "Loading your exams..." : `${exams.length} exam${exams.length !== 1 ? "s" : ""} found`}
            </p>
          </div>
          <button
            onClick={() => fetchExams()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", fontSize: 12, fontWeight: 600, color: T.muted, cursor: "pointer" }}
          >
            <Icons.Activity /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>
          Failed to load exams: {error}. Please refresh the page.
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <Skeleton w={100} h={12} r={5} style={{ marginBottom: 12 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
                <CardSkeleton /><CardSkeleton />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && exams.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 12, border: `1px solid ${T.border}` }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.accent }}>
            <Icons.University />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>No University Exams</div>
          <div style={{ fontSize: 13, color: T.muted }}>You have no university exams scheduled yet.</div>
        </div>
      )}

      {!loading && !error && exams.length > 0 && (
        <>
          {live.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SLabel>🔴 Live Now</SLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {live.map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SLabel>Upcoming</SLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {upcoming.map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <SLabel>Past Examinations</SLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {completed.map(e => <UniCard key={e.id} exam={e} onClick={() => setSelected(e)} />)}
              </div>
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}