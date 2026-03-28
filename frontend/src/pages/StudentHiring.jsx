// StudentHiring.jsx — real-time exam assignments from backend
// FIXED:
//  1. Removed exam_key display from ExamCard — keys are private, sent by email only
//  2. Token key aligned: uses "token" (not "student_token") to match how
//     student login stores the JWT in localStorage
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T } from "./Studentdashboard ";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function SkeletonCard() {
  return (
    <div className="na-card" style={{ overflow: "hidden" }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ padding: "10px 15px", background: "#f1f5f9", height: 46, animation: "shimmer 1.5s infinite" }} />
      <div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 10 }}>
        {[70, 50, 40].map(w => (
          <div key={w} style={{ height: 12, background: "#e2e8f0", borderRadius: 4, width: `${w}%`, animation: "shimmer 1.5s infinite" }} />
        ))}
      </div>
    </div>
  );
}

function ExamCard({ exam, onStart }) {
  const isLive = exam.status === "live";
  const isDone = exam.status === "submitted";

  const tags = Object.keys(exam.sections || {})
    .filter(k => exam.sections[k])
    .map(k => k.toUpperCase());

  return (
    <div
      className="na-card"
      style={{
        overflow: "hidden", display: "flex", flexDirection: "column",
        borderColor: isLive ? "#dc262655" : isDone ? "#bbf7d0" : "#b8eaee",
        transition: "transform .2s, box-shadow .2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ padding: "10px 15px", background: "#d9f2f4", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid #2BB1A820" }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,.65)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#2BB1A8" }}>
          {(exam.company_name || exam.college || "E")[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2BB1A8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {exam.company_name || exam.college || "Assessment"}
        </span>
        {isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", letterSpacing: ".5px" }}>LIVE</span>
          </div>
        )}
        {isDone && <span className="na-badge" style={{ background: "#d9f5ec", color: "#0a8f5c" }}><Icons.CheckCircle /> Done</span>}
        {!isLive && !isDone && <span className="na-badge" style={{ background: "#d9f2f4", color: "#2BB1A8" }}>Assigned</span>}
      </div>

      <div style={{ padding: 15, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>{exam.title}</div>

        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: T.dim, display: "flex" }}><Icons.Clock /></span>
            <span style={{ fontSize: 12, color: T.muted }}>{exam.duration_minutes} min</span>
          </div>
          {exam.question_count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: T.dim, display: "flex" }}><Icons.Clipboard /></span>
              <span style={{ fontSize: 12, color: T.muted }}>{exam.question_count} Qs</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: T.dim, display: "flex" }}><Icons.Calendar /></span>
          <span style={{ fontSize: 11.5, color: T.muted }}>
            {exam.start_date
              ? new Date(exam.start_date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : "Date TBD"}
          </span>
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {tags.map((tag, i) => <span key={i} className="na-tag">{tag}</span>)}
          </div>
        )}

        {/* ✅ REMOVED: exam_key display block — keys are confidential,
            sent only via email to each student individually.
            Showing the key here would expose it to anyone viewing the screen. */}

        {isDone && exam.score != null && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7, padding: "8px 12px" }}>
            <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>
              Score: {exam.score}/{exam.total_marks || 100}
            </span>
          </div>
        )}

        {/* Info hint for assigned (not yet live) exams */}
        {!isLive && !isDone && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 7, padding: "8px 12px", marginTop: "auto" }}>
            <span style={{ fontSize: 11, color: "#0369a1", fontWeight: 600 }}>
              📧 Check your email for the exam key when the exam goes live.
            </span>
          </div>
        )}

        {isLive && onStart && (
          <button className="na-btn na-btn-danger" style={{ width: "100%", marginTop: "auto" }} onClick={onStart}>
            <Icons.Play /> Start Assessment
          </button>
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
  const navigate      = useNavigate();
  const [tab, setTab] = useState("assessments");
  const [exams, setExams]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchExams = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // ✅ ALIGNED: student login stores JWT as "token", same key used everywhere
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/api/student/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setExams(data.exams || []);
      setError(null);
      setLastRefresh(new Date());
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

  const now      = new Date();
  const enriched = exams.map(e => ({
    ...e,
    sections: typeof e.sections === "string" ? JSON.parse(e.sections || "{}") : (e.sections || {}),
    status:
      e.assignment_status === "submitted"
        ? "submitted"
        : new Date(e.start_date) <= now && new Date(e.end_date) >= now
          ? "live"
          : "assigned",
  }));

  const active    = enriched.filter(e => ["live", "assigned"].includes(e.status));
  const completed = enriched.filter(e => e.status === "submitted");
  const liveNow   = enriched.filter(e => e.status === "live");

  const tabs = [
    { id: "assessments", label: "Active Assessments", count: active.length },
    { id: "completed",   label: "Completed",          count: completed.length },
  ];

  return (
    <StudentLayout activePath="/student-hiring">

      <div style={{ marginBottom: 22 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}>
          <Icons.ChevronLeft /> Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>
              Hiring Assessments
            </h1>
            <p style={{ fontSize: 13, color: T.muted }}>
              Placement assessments assigned to you
              {lastRefresh && (
                <span style={{ marginLeft: 8, fontSize: 11, color: T.dim }}>
                  · Refreshed {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button className="na-btn na-btn-ghost na-btn-sm" onClick={() => fetchExams()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: T.red }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && liveNow.length > 0 && (
        <div style={{ marginBottom: 22, background: "#fef2f2", border: "1.5px solid #dc262644", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.red, letterSpacing: ".5px" }}>LIVE NOW — Action Required</span>
          </div>
          {liveNow.map(exam => (
            <div key={exam.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 7, padding: "10px 14px", border: "1px solid #dc262622", marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{exam.title}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>
                  {exam.company_name || exam.college} · Ends {new Date(exam.end_date).toLocaleTimeString()}
                </div>
              </div>
              {/* ✅ No exam_key shown here — student types it from their email */}
              <button className="na-btn na-btn-danger na-btn-sm" onClick={() => navigate("/exam-verify", { state: { exam } })}>
                <Icons.Play /> Enter Now
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Active Tests",  value: active.length,    color: T.accent },
          { label: "Live Now",      value: liveNow.length,   color: T.red    },
          { label: "Completed",     value: completed.length, color: T.green  },
        ].map((s, i) => (
          <div key={i} className="na-card" style={{ padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} className={`na-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, fontSize: 10, fontWeight: 700, background: tab === t.id ? T.accent : T.border, color: tab === t.id ? "#fff" : T.muted, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "assessments" && (
        loading
          ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          : active.length === 0
            ? <EmptyState label="No active assessments yet. Exams assigned to you will appear here." />
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {active.map(exam => (
                  <ExamCard key={exam.id} exam={exam} onStart={() => navigate("/exam-verify", { state: { exam } })} />
                ))}
              </div>
      )}

      {tab === "completed" && (
        loading
          ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>{[1,2].map(i => <SkeletonCard key={i} />)}</div>
          : completed.length === 0
            ? <EmptyState label="No completed assessments yet." />
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {completed.map(exam => <ExamCard key={exam.id} exam={exam} onStart={null} />)}
              </div>
      )}

    </StudentLayout>
  );
}