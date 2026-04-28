// RecruiterLayout.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// ── EXPORTED Color Scheme (Updated to Blue Theme) ──
export const C = {
  bg:          "#dbeafe",
  sidebar:     "#ffffff",
  border:      "rgba(59,130,246,0.2)",
  text:        "#0f172a",
  muted:       "#475569",
  dim:         "#64748b",
  accent:      "#3b82f6",
  accentLight: "#dbeafe",
  accentDark:  "#2563eb",
  white:       "#ffffff",
  green:       "#10b981",
  greenBg:     "#dcfce7",
  greenBorder: "#bbf7d0",
  red:         "#dc2626",
  redBg:       "#fee2e2",
  orange:      "#f59e0b",
  orangeBg:    "#fef3c7",
  blue:        "#3b82f6",
  blueBg:      "#dbeafe",
  purple:      "#8b5cf6",
  purpleBg:    "#ede9fe",
  navy:        "#0f172a",
  sidebarTop:  "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
};

// ── EXPORTED Icon Component (for other pages to use) ──
export function Icon({ d, size = 18, color = "currentColor", strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        route: "/recruiter-dashboard",
        d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
    ],
  },
  {
    label: "RECRUITMENT",
    items: [
      {
        id: "candidates",
        label: "Candidates",
        route: "/recruiter-candidates",
        d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      },
      {
        id: "reports",
        label: "Reports",
        route: "/recruiter-reports",
        d: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        id: "exam-requests",
        label: "Exam Requests",
        route: "/exam-requests",
        d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      },
    ],
  },
];

export default function RecruiterLayout({ children, title, subtitle, actions }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [recruiter, setRecruiter] = useState(null);
  const [loadingRecruiter, setLoadingRecruiter] = useState(true);

  useEffect(() => {
    const fetchRecruiter = async () => {
      try {
        const token  = localStorage.getItem("recruiter_token");
        const stored = localStorage.getItem("recruiter_profile");
        if (stored) {
          setRecruiter(JSON.parse(stored));
        } else if (token) {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          setRecruiter(res.data);
        } else {
          setRecruiter({ name: "Recruiter", email: "recruiter@company.com", role: "Recruiter", avatar: null });
        }
      } catch {
        setRecruiter({ name: "Recruiter", email: "recruiter@company.com", role: "Recruiter", avatar: null });
      } finally {
        setLoadingRecruiter(false);
      }
    };
    fetchRecruiter();
  }, []);

  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const active = (
    allItems.find(n => location.pathname === n.route) ||
    allItems.find(n => location.pathname === n.route.replace("/recruiter-", "/")) ||
    allItems.find(n => location.pathname.startsWith(n.route))
  )?.id || "dashboard";

  const getInitials = (name) => {
    if (!name) return "R";
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const recruiterName     = recruiter?.name     || "Recruiter";
  const recruiterInitials = getInitials(recruiterName);
  const recruiterRole     = recruiter?.role     || "Recruiter";

  const pageTitle = title || {
    dashboard:     "Dashboard",
    candidates:    "Candidates",
    reports:       "Reports",
    "exam-requests": "Exam Requests",
  }[active];

  const pageSubtitle = subtitle || {
    dashboard:     "Overview of your ongoing recruitment drives and candidates",
    candidates:    "Manage and review candidate assessments",
    reports:       "View detailed exam analytics and performance metrics",
    "exam-requests": "Create and track new exam requests",
  }[active];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .rn-item:hover { background: ${C.accentLight} !important; }
        .rn-item:hover .rn-label { color: ${C.accent} !important; }
        .rn-item:hover .rn-icon svg { stroke: ${C.accent} !important; }
        .r-row:hover { background: #f8fafc !important; }
        .r-btn-outline:hover { background: ${C.accent} !important; color: #fff !important; border-color: ${C.accent} !important; }
        .r-btn-ghost:hover { background: ${C.accentLight} !important; color: ${C.accent} !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 230, background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        position: "fixed", top: 0, left: 0,
        height: "100vh", display: "flex",
        flexDirection: "column", zIndex: 200,
      }}>
        {/* Brand */}
        <div style={{
          padding: "0 20px", height: 56,
          background: C.sidebarTop,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", flexShrink: 0,
          }}>NA</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Assessment Platform</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>Recruiter Console</div>
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: C.dim, letterSpacing: "0.8px",
                textTransform: "uppercase",
                padding: "0 10px", marginBottom: 6,
              }}>{section.label}</div>

              {section.items.map(item => {
                const isActive = active === item.id;
                return (
                  <button key={item.id}
                    className="rn-item"
                    onClick={() => navigate(item.route)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 10px", marginBottom: 2,
                      border: "none", borderRadius: 8, cursor: "pointer",
                      background: isActive ? C.accentLight : "transparent",
                      transition: "all 0.15s",
                    }}>
                    <span className="rn-icon" style={{ display: "flex", flexShrink: 0 }}>
                      <Icon d={item.d} size={16}
                        color={isActive ? C.accent : C.muted}
                        strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                    <span className="rn-label" style={{
                      fontSize: 13, fontWeight: isActive ? 600 : 400,
                      color: isActive ? C.accent : C.text,
                      transition: "color 0.15s",
                    }}>{item.label}</span>
                    {isActive && (
                      <span style={{
                        marginLeft: "auto", width: 3, height: 16,
                        borderRadius: 2, background: C.accent, flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.accentLight, border: `1.5px solid ${C.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0,
            }}>
              {loadingRecruiter ? "…" : recruiterInitials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {loadingRecruiter ? "Loading…" : recruiterName}
              </div>
              <div style={{ fontSize: 10, color: C.dim }}>{recruiterRole}</div>
            </div>
          </div>
          <button onClick={() => {
            localStorage.removeItem("recruiter_token");
            localStorage.removeItem("recruiter_profile");
            navigate("/");
          }} style={{
            width: "100%", padding: "7px 10px",
            background: C.redBg, color: C.red,
            border: "1px solid #fecaca",
            borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={13} color={C.red} strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ─ */}
      <div style={{ marginLeft: 230, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{
          background: C.white, borderBottom: `1px solid ${C.border}`,
          height: 56, padding: "0 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>AI Assessment Platform</span>
            <span style={{ color: C.dim, fontSize: 13 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{pageTitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {actions}
            <div title={recruiterName} style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.accentLight, border: `1.5px solid ${C.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: C.accent, cursor: "pointer",
            }}>
              {loadingRecruiter ? "…" : recruiterInitials}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "28px 32px", animation: "fadeUp 0.25s ease" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" }}>{pageTitle}</h1>
            {pageSubtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{pageSubtitle}</p>}
          </div>

          {/* ── Content Rendering ── */}
          {children}
        </main>
      </div>
    </div>
  );
}