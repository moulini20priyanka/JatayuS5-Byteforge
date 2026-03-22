// RecruiterDashboard.jsx — Overview page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RecruiterLayout, { C, Icon } from "./RecruiterLayout";

const API = "http://localhost:5000/api";

function StatCard({ label, value, sub, color, iconPath, delay = 0 }) {
  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: "20px 22px",
      border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`,
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      animation: `fadeUp 0.35s ease ${delay}s both`,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon d={iconPath} size={17} color={color} strokeWidth={2}/>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate  = useNavigate();
  const [stats,   setStats]   = useState({ total: 0, shortlisted: 0, pending: 0, aiEvaluated: 0 });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/all`).then(res => {
      const data = res.data;
      const shortlisted  = data.filter(r => (r.total_score || 0) >= 70).length;
      const aiEvaluated  = data.filter(r => r.decision).length;
      setStats({ total: data.length, shortlisted, pending: data.length - shortlisted, aiEvaluated });
      setRecent(data.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const decisionColor = d => d === "Hire" ? C.green : d === "Reject" ? C.red : C.orange;
  const decisionBg    = d => d === "Hire" ? C.greenBg : d === "Reject" ? C.redBg : C.orangeBg;

  return (
    <RecruiterLayout title="Dashboard" subtitle="Overview of your recruitment pipeline">
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Assessed"    value={stats.total}       color={C.accent} iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" delay={0}/>
        <StatCard label="Shortlisted"       value={stats.shortlisted} color={C.green}  iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" delay={0.05}/>
        <StatCard label="Under Review"      value={stats.pending}     color={C.orange} iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" delay={0.1}/>
        <StatCard label="AI Evaluated"      value={stats.aiEvaluated} color={C.purple} iconPath="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" delay={0.15}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Candidates */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Recent Candidates</div>
            <button onClick={() => navigate("/candidates")} className="r-btn-ghost" style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "4px 8px", borderRadius: 6 }}>
              View all
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: C.dim, fontSize: 13 }}>Loading...</div>
          ) : (
            <div>
              {recent.map((r, i) => (
                <div key={i} className="r-row" style={{ padding: "12px 20px", borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                      {(r.name || r.student_id || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name || r.student_id}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>{r.college || "—"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{Math.round(r.total_score || 0)}</span>
                    {r.decision && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: decisionBg(r.decision), color: decisionColor(r.decision) }}>
                        {r.decision}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {recent.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: C.dim, fontSize: 13 }}>No candidates yet</div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions + Activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Actions */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "View Candidates",  route: "/candidates",    color: C.accent, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                { label: "View Reports",     route: "/reports",       color: C.blue,   d: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                { label: "Exam Requests",    route: "/exam-requests", color: C.purple, d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label: "Export Data",      route: "/reports",       color: C.orange, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
              ].map(({ label, route, color, d }) => (
                <button key={label} onClick={() => navigate(route)}
                  className="r-btn-outline"
                  style={{ padding: "10px 12px", background: color + "08", color, border: `1px solid ${color}25`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s" }}>
                  <Icon d={d} size={14} color={color} strokeWidth={2.2}/>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", flex: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Recent Activity</div>
            {[
              { msg: "15 candidates completed the placement assessment.", time: "2 hours ago",  color: C.accent },
              { msg: "Exam request for 'Backend Engineer' approved.",       time: "5 hours ago",  color: C.green  },
              { msg: "Interview scheduled for shortlisted candidates.",     time: "1 day ago",    color: C.blue   },
            ].map((a, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, marginTop: 5, flexShrink: 0 }}/>
                <div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{a.msg}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}