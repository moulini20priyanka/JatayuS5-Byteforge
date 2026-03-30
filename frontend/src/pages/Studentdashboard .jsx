import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const T = {
  bg: "#CFF4F7", border: "#b8eaee", text: "#0A2A41", muted: "#3d6878",
  dim: "#7aacba", accent: "#2BB1A8", accentSoft: "#d9f2f4",
  green: "#0a8f5c", greenSoft: "#d9f5ec", amber: "#b45309",
  red: "#dc2626", redSoft: "#fee2e2", navy: "#0A2A41",
  navySoft: "#d9f2f4", lightCyan: "#F2FBFF",
};

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(2.4)} }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #b8eaee; border-radius: 8px; }
  .na-nav { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:500;color:#3d6878;transition:background .16s,color .16s;user-select:none; }
  .na-nav:hover,.na-nav.active { background:#d9f2f4;color:#2BB1A8; }
  .na-nav.active { font-weight:600; }
  .na-card { background:#fff;border:1px solid #b8eaee;border-radius:10px;box-shadow:0 1px 3px rgba(43,177,168,0.06);transition:transform .2s,box-shadow .2s,border-color .2s; }
  .na-btn { display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 18px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;border:none;font-family:'Geist',sans-serif;transition:all .16s; }
  .na-btn-primary { background:#2BB1A8;color:#fff; }
  .na-btn-primary:hover { background:#1d9e96;transform:translateY(-1px); }
  .na-btn-danger { background:#dc2626;color:#fff; }
  .na-btn-danger:hover { background:#b91c1c; }
  .na-btn-ghost { background:transparent;color:#2BB1A8;border:1px solid #b8eaee; }
  .na-btn-ghost:hover { background:#d9f2f4; }
  .na-btn-sm { padding:6px 13px;font-size:12px; }
  .na-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:600; }
  .na-tag { display:inline-block;padding:3px 9px;border-radius:5px;font-size:11px;font-weight:600;background:#d9f2f4;color:#2BB1A8;border:1px solid #b8eaee; }
  .na-avatar { width:36px;height:36px;border-radius:8px;background:#2BB1A8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0; }
  .na-back { display:inline-flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#3d6878;font-family:'Geist',sans-serif;padding:0;transition:color .15s,transform .15s; }
  .na-back:hover { color:#2BB1A8;transform:translateX(-2px); }
  .live-dot { width:7px;height:7px;border-radius:50%;background:#dc2626;flex-shrink:0;position:relative; }
  .live-dot::after { content:'';position:absolute;inset:-3px;border-radius:50%;background:#dc262644;animation:live-pulse 1.8s ease-in-out infinite; }
  .na-row:hover { background:#F2FBFF; }
  .credential-box { background:#F2FBFF;border:1px solid #b8eaee;border-radius:8px;padding:12px 15px;font-family:'Geist Mono',monospace;font-size:12px; }
`;

// ── Icons ───────────────────────────────────────────────────────
export const Icons = {
  Flash:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Dashboard:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Assessment:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  University:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Certificate: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Search:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  ArrowRight:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Calendar:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Clock:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Activity:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  CheckCircle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  AlertCircle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
  Mail:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Play:        () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Phone:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  ChevronLeft: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>,
  User:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Link:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Download:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Share:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
  ExternalLink:() => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>,
  MapPin:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clipboard:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Inbox:       () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
};

export const THEME = T;

// ── Shared sidebar layout ───────────────────────────────────────
export function StudentLayout({ children, activePath }) {
  const navigate = useNavigate();
  const name     = localStorage.getItem("user_name")  || "Student";
  const email    = localStorage.getItem("user_email") || "";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const NAV = [
    { label: "Dashboard",          path: "/student-dashboard",      icon: <Icons.Dashboard /> },
    { label: "Hiring Assessments", path: "/student-hiring",         icon: <Icons.Assessment /> },
    { label: "University Exams",   path: "/student-university",     icon: <Icons.University /> },
    { label: "Certifications",     path: "/student-certifications", icon: <Icons.Certificate /> },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg, fontFamily: "'Geist',sans-serif" }}>

        {/* Header */}
        <header style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, height: 56, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Flash /></div>
            <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.4px", color: T.text }}>NeuroAssess</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: T.lightCyan, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 13px", width: 340 }}>
            <span style={{ color: T.dim, display: "flex" }}><Icons.Search /></span>
            <input type="text" placeholder="Search assessments, exams…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: T.text, width: "100%", fontFamily: "'Geist',sans-serif" }} />
          </div>
          <div className="na-avatar">{initials}</div>
        </header>

        <div style={{ display: "flex", flex: 1 }}>
          {/* Sidebar */}
          <aside style={{ width: 230, flexShrink: 0, background: "#fff", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV.map(item => (
                <div key={item.path}
                  className={`na-nav${activePath === item.path ? " active" : ""}`}
                  onClick={() => navigate(item.path)}>
                  <span style={{ display: "flex", color: activePath === item.path ? T.accent : T.dim }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{name}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{email}</div>
            </div>
          </aside>

          {/* Page content */}
          <main style={{ flex: 1, padding: "26px 30px", overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

// ── Dashboard home ──────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate  = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  const fade = (d = 0) => ({ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.4s ease ${d}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${d}ms` });

  const name      = localStorage.getItem("user_name")  || "Student";
  const email     = localStorage.getItem("user_email") || "";
  const studentId = localStorage.getItem("student_id") || "";

  const stats = [
    { label: "Active Tests",        value: 4, color: T.accent, bg: T.accentSoft, icon: <Icons.Assessment />, route: "/student-hiring" },
    { label: "Upcoming Interviews", value: 5, color: T.navy,   bg: T.navySoft,   icon: <Icons.Assessment />, route: "/student-hiring" },
    { label: "University Exams",    value: 1, color: T.navy,   bg: "#d9eaf5",    icon: <Icons.University />, route: "/student-university" },
    { label: "Certifications",      value: 2, color: T.green,  bg: T.greenSoft,  icon: <Icons.Certificate />, route: "/student-certifications" },
  ];

  const deadlines = [
    { label: "Data Structures Assessment",   sub: "Virtusa · DSA",           date: "Today, 2:00 PM",  urgency: "high"   },
    { label: "React Semester Examination",   sub: "Web Technologies · Live",  date: "Today, 2:30 PM",  urgency: "high"   },
    { label: "Technical Interview – Rajesh", sub: "Virtusa · Round 1",        date: "Mar 11, 2:00 PM", urgency: "medium" },
    { label: "Backend Developer Test",       sub: "Virtusa · Node.js",        date: "Tomorrow, 10 AM", urgency: "medium" },
    { label: "DSA Semester Exam",            sub: "CS3005 · Block B, Hall 1", date: "Apr 16",          urgency: "low"    },
  ];
  const urgencyColor = { high: T.red, medium: T.amber, low: T.accent };

  const activity = [
    { label: "Cloud Infrastructure Test completed",      time: "Jan 20", color: T.green,  icon: <Icons.CheckCircle /> },
    { label: "Python & ML Fundamentals completed",       time: "Feb 28", color: T.green,  icon: <Icons.CheckCircle /> },
    { label: "AWS Certified Solutions Architect earned", time: "Mar 18", color: T.accent, icon: <Icons.Certificate /> },
    { label: "HR Interview – Graduate Programme",        time: "Feb 10", color: T.red,    icon: <Icons.XCircle /> },
  ];

  return (
    <StudentLayout activePath="/student-dashboard">

      {/* Welcome banner */}
      <div style={{ marginBottom: 26, ...fade(30) }}>
        <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #1C3240 50%, ${T.accent} 100%)`, borderRadius: 14, padding: "26px 30px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.65)", letterSpacing: ".5px", marginBottom: 6, textTransform: "uppercase" }}>Welcome back</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.6px", marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginBottom: 18 }}>Student ID: {studentId}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.Mail /> {email || "student@college.edu"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 26, ...fade(50) }}>
        {stats.map((s, i) => (
          <div key={i} className="na-card" style={{ padding: "18px 20px", cursor: "pointer" }}
            onClick={() => navigate(s.route)}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(43,177,168,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "flex", alignItems: "center", gap: 3 }}>View <Icons.ArrowRight /></span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: "-1.5px", marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live alert */}
      <div style={{ marginBottom: 22, ...fade(60) }}>
        <div style={{ background: T.redSoft, border: `1.5px solid ${T.red}44`, borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.red, letterSpacing: ".5px" }}>LIVE NOW — Action Required</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 7, padding: "10px 14px", border: `1px solid ${T.red}22` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Data Structures Assessment</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>Virtusa · Today, 2:00 PM</div>
            </div>
            <button className="na-btn na-btn-danger na-btn-sm" onClick={() => navigate("/exam-verify")}><Icons.Play /> Enter Now</button>
          </div>
        </div>
      </div>

      {/* Two col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, ...fade(70) }}>
        <div className="na-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: T.accent, display: "flex" }}><Icons.Calendar /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Upcoming Deadlines</span>
          </div>
          {deadlines.map((d, i) => (
            <div key={i} style={{ padding: "11px 18px", borderBottom: i < deadlines.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 3, height: 36, background: urgencyColor[d.urgency], borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
                <div style={{ fontSize: 11, color: T.dim }}>{d.sub}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: urgencyColor[d.urgency], flexShrink: 0 }}>{d.date}</div>
            </div>
          ))}
        </div>

        <div className="na-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: T.accent, display: "flex" }}><Icons.Activity /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Recent Activity</span>
          </div>
          {activity.map((a, i) => (
            <div key={i} style={{ padding: "11px 18px", borderBottom: i < activity.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: a.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
              <div style={{ fontSize: 11, color: T.dim, flexShrink: 0 }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>

    </StudentLayout>
  );
}