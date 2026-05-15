import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ── Token storage helpers ── */
function storeSession({ token, role, name, email, studentId }) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('user_name', name || '');
  localStorage.setItem('user_email', email || '');
  if (role === 'admin')     localStorage.setItem('admin_token', token);
  if (role === 'recruiter') localStorage.setItem('recruiter_token', token);
  if (role === 'student') {
    localStorage.setItem('student_token', token);
    localStorage.setItem('student_id', studentId || '');
    localStorage.setItem('candidate_id', studentId || '');
  }
}

function clearSession() {
  ['token', 'role', 'user_name', 'user_email', 'student_id',
   'admin_token', 'recruiter_token', 'student_token'].forEach(k =>
    localStorage.removeItem(k)
  );
}

/* ── Icons ── */
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>
  </svg>
);
const GradCapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="6 11.5 6 17 12 20 18 17 18 11.5"/>
  </svg>
);

/* ── Role-specific left panel visuals ── */
const AdminPanel = () => (
  <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:320}}>
    <rect x="20" y="30" width="300" height="210" rx="14" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
    <rect x="20" y="30" width="300" height="36" rx="14" fill="rgba(255,255,255,0.15)"/>
    <circle cx="40" cy="48" r="6" fill="rgba(255,100,100,0.8)"/>
    <circle cx="58" cy="48" r="6" fill="rgba(255,200,60,0.8)"/>
    <circle cx="76" cy="48" r="6" fill="rgba(80,220,120,0.8)"/>
    <rect x="20" y="66" width="56" height="174" fill="rgba(0,0,0,0.08)"/>
    <circle cx="48" cy="90" r="10" fill="rgba(255,255,255,0.4)"/>
    <rect x="36" y="108" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>
    <rect x="36" y="116" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
    <rect x="84" y="74" width="58" height="44" rx="8" fill="rgba(100,200,255,0.25)" stroke="rgba(100,200,255,0.4)" strokeWidth="1"/>
    <rect x="86" y="82" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.6)"/>
    <rect x="86" y="96" width="36" height="8" rx="2" fill="rgba(100,200,255,0.6)"/>
    <rect x="84" y="126" width="188" height="100" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
    <rect x="92" y="134" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>
    {[0,1,2,3,4,5,6,7].map((i) => {
      const h = [40,55,35,65,48,70,52,60][i];
      return <rect key={i} x={92+i*21} y={220-h} width="14" height={h} rx="3" fill={`rgba(100,200,255,${0.4+i*0.05})`} />;
    })}
    <circle cx="285" cy="255" r="24" fill="rgba(100,200,255,0.25)" stroke="rgba(100,200,255,0.5)" strokeWidth="1.5"/>
    <path d="M285 244L276 249v5c0 4.5 3.2 8.7 9 9.7 5.8-1 9-5.2 9-9.7v-5L285 244z" fill="none" stroke="rgba(100,200,255,0.9)" strokeWidth="1.5"/>
    <path d="M282 254l2 2 4-3.5" stroke="rgba(100,200,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RecruiterPanel = () => (
  <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:320}}>
    <rect x="30" y="40" width="220" height="68" rx="12" fill="rgba(255,255,255,0.95)" stroke="rgba(100,200,255,0.5)" strokeWidth="1.5"/>
    <circle cx="58" cy="74" r="18" fill="rgba(100,200,255,0.25)" stroke="rgba(100,200,255,0.5)" strokeWidth="1.5"/>
    <circle cx="58" cy="70" r="8" fill="rgba(100,200,255,0.6)"/>
    <ellipse cx="58" cy="84" rx="11" ry="6" fill="rgba(100,200,255,0.4)"/>
    <rect x="84" y="58" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.7)"/>
    <rect x="84" y="69" width="55" height="3.5" rx="1.75" fill="rgba(255,255,255,0.4)"/>
    <rect x="200" y="58" width="40" height="22" rx="7" fill="rgba(80,220,120,0.25)" stroke="rgba(80,220,120,0.5)" strokeWidth="1"/>
    <rect x="207" y="63" width="26" height="3" rx="1.5" fill="rgba(80,220,120,0.7)"/>
    <rect x="30" y="130" width="280" height="130" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
    <rect x="42" y="142" width="60" height="4" rx="2" fill="rgba(255,255,255,0.5)"/>
    {["Screening","Interview","Offer","Hired"].map((label, i) => (
      <g key={i}>
        <rect x={42+i*64} y={158} width="52" height="88" rx="8" fill={`rgba(100,200,255,${0.1+i*0.04})`} stroke={`rgba(100,200,255,${0.25+i*0.08})`} strokeWidth="1"/>
        <rect x={46+i*64} y={164} width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>
      </g>
    ))}
  </svg>
);

const StudentPanel = () => (
  <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:320}}>
    <rect x="20" y="20" width="300" height="220" rx="14" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="20" y="20" width="300" height="38" rx="14" fill="rgba(255,255,255,0.15)"/>
    <rect x="40" y="70" width="260" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
    <rect x="40" y="70" width="162" height="6" rx="3" fill="rgba(100,200,255,0.6)"/>
    <rect x="40" y="80" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.4)"/>
    <rect x="40" y="96" width="200" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
    <rect x="40" y="104" width="140" height="3.5" rx="1.75" fill="rgba(255,255,255,0.4)"/>
    {[0,1,2,3].map(i => (
      <g key={i}>
        <rect x="40" y={118+i*22} width="260" height="16" rx="6"
          fill={i===1 ? "rgba(100,200,255,0.25)" : "rgba(255,255,255,0.08)"}
          stroke={i===1 ? "rgba(100,200,255,0.6)" : "rgba(255,255,255,0.15)"}
          strokeWidth={i===1 ? "1.5" : "1"}/>
        <circle cx="54" cy={126+i*22} r="4"
          fill={i===1 ? "rgba(100,200,255,0.6)" : "rgba(255,255,255,0.2)"}
          stroke={i===1 ? "rgba(100,200,255,0.8)" : "rgba(255,255,255,0.3)"}
          strokeWidth="1"/>
        <rect x="64" y={123+i*22} width={[80,100,70,90][i]} height="3" rx="1.5"
          fill={i===1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}/>
      </g>
    ))}
    <rect x="230" y="28" width="72" height="22" rx="7" fill="rgba(100,200,255,0.2)" stroke="rgba(100,200,255,0.4)" strokeWidth="1"/>
    <rect x="238" y="34" width="16" height="3" rx="1.5" fill="rgba(100,200,255,0.6)"/>
    <rect x="190" y="252" width="100" height="28" rx="9" fill="rgba(100,200,255,0.3)" stroke="rgba(100,200,255,0.6)" strokeWidth="1.5"/>
    <rect x="210" y="263" width="60" height="4" rx="2" fill="rgba(100,200,255,0.8)"/>
    <polygon points="55,255 75,247 95,255 75,263" fill="rgba(100,200,255,0.4)" stroke="rgba(100,200,255,0.6)" strokeWidth="1"/>
  </svg>
);

/* ─────────────────────────────────────────────────────
   VALID ROLES — anything not in this set is rejected
───────────────────────────────────────────────────── */
const VALID_ROLES = ['admin', 'recruiter', 'student'];

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Sanitise role from URL — reject unknown values and default to 'student'
  const rawRole = (params.get("role") || "student").toLowerCase().trim();
  const role    = VALID_ROLES.includes(rawRole) ? rawRole : "student";

  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [focused, setFocused] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // If a valid session already exists for THIS role, redirect immediately
  useEffect(() => {
    const storedRole  = localStorage.getItem('role');
    const storedToken = localStorage.getItem('token');
    if (storedToken && storedRole === role) {
      if (role === 'admin')     navigate('/admin-dashboard',     { replace: true });
      if (role === 'recruiter') navigate('/recruiter-dashboard', { replace: true });
      if (role === 'student')   navigate('/student-dashboard',   { replace: true });
    }
  }, [role, navigate]);

  const valid = form.email.includes("@") && form.password.length >= 4;

  const handleLogin = async () => {
    setLoading(true);
    setErr("");

    // Always wipe any previous session before attempting a new login
    clearSession();

    try {
      const endpoint =
        role === "student"
          ? `${API}/api/auth/student/login`
          : `${API}/api/auth/login`;

      const res  = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      const token = data.token || data.accessToken;
      if (!token) {
        setErr("Login failed: no token received from server.");
        setLoading(false);
        return;
      }

      const userObj      = data.user || {};
      const resolvedRole = (userObj.role || data.role || role).toLowerCase().trim();

      /* ── ROLE MISMATCH CHECK ─────────────────────────────────────────────
         The user clicked "Admin Login" but got back a recruiter token —
         that should be a hard stop, NOT a redirect to the wrong dashboard.
      ──────────────────────────────────────────────────────────────────── */
      if (resolvedRole !== role) {
        setErr(
          `Access denied. These credentials belong to a "${resolvedRole}" account. ` +
          `Please use the ${resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1)} login instead.`
        );
        setLoading(false);
        return;   // ← do NOT store the token for the wrong portal
      }

      const resolvedName  = userObj.full_name || userObj.name || data.name || data.full_name || "";
      const resolvedEmail = userObj.email || data.email || form.email;
      const resolvedId    = userObj.id || data.studentId || data.id || "";

      // Store session data
      storeSession({
        token,
        role:      resolvedRole,
        name:      resolvedName,
        email:     resolvedEmail,
        studentId: String(resolvedId),
      });

      // ── ✅ KEY ADDITION: Check first-login password change flag ───────────
      const mustChangePassword =
        data.mustChangePassword ||
        data.user?.mustChangePassword ||
        false;

      // Redirect based on role AND password-change requirement
      if (resolvedRole === "student" && mustChangePassword) {
        // First login: redirect to password setup page
        navigate("/set-password", { 
          replace: true,
          state: { token, email: resolvedEmail }
        });
      } else if (resolvedRole === "student") {
        navigate("/student-dashboard", { replace: true });
      } else if (resolvedRole === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (resolvedRole === "recruiter") {
        navigate("/recruiter-dashboard", { replace: true });
      } else {
        setErr(`Unknown role "${resolvedRole}" — contact support.`);
      }

    } catch {
      setErr("Cannot reach server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && valid && !loading) handleLogin();
  };

  const roleConfig = {
    admin: {
      label: "Admin", tagline: "Platform Administration", icon: <ShieldIcon />,
      features: ["User & Role Management", "System-Wide Analytics", "Live Exam Control"],
      panel: <AdminPanel />, primaryColor: "#3b82f6", lightColor: "rgba(100,200,255,0.15)",
    },
    recruiter: {
      label: "Recruiter", tagline: "Recruitment & Hiring", icon: <BriefcaseIcon />,
      features: ["AI Candidate Scoring", "Pipeline Tracking", "Smart Shortlisting"],
      panel: <RecruiterPanel />, primaryColor: "#3b82f6", lightColor: "rgba(100,200,255,0.15)",
    },
    student: {
      label: "Student", tagline: "Candidate Assessment", icon: <GradCapIcon />,
      features: ["Take Secure Exams", "View Your Results", "Track Progress"],
      panel: <StudentPanel />, primaryColor: "#3b82f6", lightColor: "rgba(100,200,255,0.15)",
    },
  };
  const rc = roleConfig[role];
  const placeholders = {
    admin:     "admin@neuroassess.com",
    recruiter: "recruiter@company.com",
    student:   "student@college.edu",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes float       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        @keyframes fadeUp      { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideInLeft { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse       { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.7; transform:scale(1.03)} }
        @keyframes blink       { 0%,100%{opacity:0.6} 50%{opacity:0.2} }
        @keyframes shake       { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes ringFloat1  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        @keyframes ringFloat2  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,25px) scale(1.08)} }
        @keyframes ringFloat3  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,15px)} }
        @keyframes ringFloat4  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
        @keyframes ringPulse   { 0%,100%{opacity:0.4; transform:scale(1)} 50%{opacity:0.6; transform:scale(1.1)} }
        * { box-sizing: border-box; }
        input::placeholder { color: #94a3b8; }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)",
        padding: "40px 20px", position: "relative", overflow: "hidden",
      }}>
        {/* Floating rings — unchanged visual ───────────────────────────── */}
        <div style={{ position:"absolute", width:"280px", height:"280px", border:"2.5px solid rgba(100,200,255,0.4)", borderRadius:"50%", top:"5%", left:"3%", animation: mounted ? "ringFloat1 25s ease-in-out infinite" : "none", opacity:0.6 }} />
        <div style={{ position:"absolute", width:"200px", height:"200px", border:"2.5px solid rgba(100,200,255,0.35)", borderRadius:"50%", top:"7%", left:"5%", animation: mounted ? "ringFloat1 25s ease-in-out infinite reverse" : "none", opacity:0.5 }} />
        <div style={{ position:"absolute", width:"120px", height:"120px", background:"radial-gradient(circle, rgba(100,200,255,0.4) 0%, transparent 70%)", borderRadius:"50%", top:"10%", left:"7.5%", animation: mounted ? "ringFloat1 25s ease-in-out infinite" : "none", opacity:0.5 }} />
        <div style={{ position:"absolute", width:"220px", height:"220px", border:"2.5px solid rgba(59,130,246,0.3)", borderRadius:"50%", top:"40%", left:"2%", animation: mounted ? "ringFloat3 28s ease-in-out infinite" : "none", opacity:0.45 }} />
        <div style={{ position:"absolute", width:"150px", height:"150px", border:"2.5px solid rgba(191,219,254,0.35)", borderRadius:"50%", top:"43%", left:"4%", animation: mounted ? "ringFloat3 28s ease-in-out infinite reverse" : "none", opacity:0.4 }} />
        <div style={{ position:"absolute", width:"180px", height:"180px", background:"radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)", borderRadius:"50%", bottom:"15%", left:"5%", animation: mounted ? "ringFloat2 22s ease-in-out infinite" : "none", opacity:0.4 }} />
        <div style={{ position:"absolute", width:"260px", height:"260px", border:"2.5px solid rgba(147,197,253,0.4)", borderRadius:"50%", top:"8%", right:"4%", animation: mounted ? "ringFloat2 26s ease-in-out infinite" : "none", opacity:0.55 }} />
        <div style={{ position:"absolute", width:"180px", height:"180px", border:"2.5px solid rgba(147,197,253,0.35)", borderRadius:"50%", top:"10%", right:"6%", animation: mounted ? "ringFloat2 26s ease-in-out infinite reverse" : "none", opacity:0.5 }} />
        <div style={{ position:"absolute", width:"100px", height:"100px", background:"radial-gradient(circle, rgba(147,197,253,0.4) 0%, transparent 70%)", borderRadius:"50%", top:"13%", right:"8.5%", animation: mounted ? "ringFloat2 26s ease-in-out infinite" : "none", opacity:0.5 }} />
        <div style={{ position:"absolute", width:"200px", height:"200px", border:"2.5px solid rgba(100,200,255,0.3)", borderRadius:"50%", top:"42%", right:"3%", animation: mounted ? "ringFloat4 24s ease-in-out infinite" : "none", opacity:0.45 }} />
        <div style={{ position:"absolute", width:"140px", height:"140px", border:"2.5px solid rgba(191,219,254,0.35)", borderRadius:"50%", top:"45%", right:"5%", animation: mounted ? "ringFloat4 24s ease-in-out infinite reverse" : "none", opacity:0.4 }} />
        <div style={{ position:"absolute", width:"160px", height:"160px", background:"radial-gradient(circle, rgba(100,200,255,0.35) 0%, transparent 70%)", borderRadius:"50%", bottom:"18%", right:"6%", animation: mounted ? "ringFloat2 20s ease-in-out infinite reverse" : "none", opacity:0.45 }} />
        <div style={{ position:"absolute", width:"320px", height:"320px", border:"2px solid rgba(59,130,246,0.2)", borderRadius:"50%", top:"25%", left:"50%", transform:"translateX(-50%)", animation: mounted ? "ringPulse 15s ease-in-out infinite" : "none", opacity:0.3 }} />

        {/* MAIN CARD */}
        <div style={{
          width:"100%", maxWidth:"1050px", minHeight:"580px", maxHeight:"90vh",
          background:"white", borderRadius:"22px", display:"flex",
          boxShadow:"0 20px 60px rgba(59,130,246,0.18), 0 8px 30px rgba(0,0,0,0.08)",
          position:"relative", zIndex:10, overflow:"hidden",
          animation: mounted ? "fadeUp 0.6s ease-out" : "none",
        }}>

          {/* LEFT PANEL */}
          <div style={{
            flex:"1", background:"linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1d4ed8 100%)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"40px 35px", position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", width:"260px", height:"260px", background:"radial-gradient(circle, rgba(100,200,255,0.22) 0%, transparent 70%)", borderRadius:"50%", top:"-70px", left:"-70px", filter:"blur(45px)", animation: mounted ? "float 6s ease-in-out infinite" : "none" }} />
            <div style={{ position:"absolute", width:"220px", height:"220px", background:"radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)", borderRadius:"50%", bottom:"-50px", right:"-50px", filter:"blur(40px)", animation: mounted ? "float 8s ease-in-out infinite reverse" : "none" }} />

            {/* Logo */}
            <div style={{ position:"absolute", top:"30px", left:"30px", display:"flex", alignItems:"center", gap:"10px", zIndex:10, animation: mounted ? "slideInLeft 0.5s ease-out" : "none" }}>
              <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:"rgba(255,255,255,0.18)", backdropFilter:"blur(8px)", border:"1.5px solid rgba(255,255,255,0.28)", display:"flex", alignItems:"center", justifyContent:"center", animation: mounted ? "pulse 3s infinite" : "none" }}>
                <svg width="22" height="22" viewBox="0 0 20 20" fill="white"><path d="M10 1L18 5.5V14.5L10 19L2 14.5V5.5L10 1Z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:"16px", color:"white", letterSpacing:"-0.3px" }}>NeuroAssess</div>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.75)" }}>{rc.tagline}</div>
              </div>
            </div>

            {/* SVG Illustration */}
            <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"320px", marginTop:"20px", animation: mounted ? "float 5s ease-in-out infinite" : "none" }}>{rc.panel}</div>

            {/* Welcome */}
            <div style={{ textAlign:"center", marginTop:"28px", color:"white", zIndex:1, animation: mounted ? "fadeUp 0.5s 0.2s both" : "none" }}>
              <h2 style={{ fontSize:"26px", fontWeight:"700", margin:"0 0 10px 0", color:"white" }}>Welcome Back!</h2>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.85)", margin:0, lineHeight:1.55, maxWidth:"280px", marginLeft:"auto", marginRight:"auto" }}>Sign in to access your {role} dashboard</p>
            </div>

            {/* Features */}
            <div style={{ display:"flex", flexDirection:"column", gap:"9px", marginTop:"24px", zIndex:1, animation: mounted ? "fadeUp 0.5s 0.3s both" : "none" }}>
              {rc.features.map((f, idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:"9px", color:"rgba(255,255,255,0.9)", fontSize:"12.5px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:"100px", padding:"5px 12px", animation: mounted ? `slideInLeft 0.4s ${0.4 + idx * 0.1}s both` : "none" }}>
                  <div style={{ width:"18px", height:"18px", borderRadius:"5px", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div style={{ position:"absolute", bottom:"25px", left:"50%", transform:"translateX(-50%)", display:"flex", gap:"6px", zIndex:1, animation: mounted ? "fadeUp 0.5s 0.6s both" : "none" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(255,255,255,0.65)", animation:"blink 1.5s infinite" }}/>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(255,255,255,0.35)", animation:"blink 1.5s 0.3s infinite" }}/>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(255,255,255,0.45)", animation:"blink 1.5s 0.6s infinite" }}/>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ flex:"1", background:"white", display:"flex", flexDirection:"column", padding:"48px 48px", position:"relative" }}>
            <div style={{ width:"100%", maxWidth:380, margin:"auto", display:"flex", flexDirection:"column", gap:"0" }}>

              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:"32px" }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"#eff6ff", border:"1px solid rgba(59,130,246,0.25)", borderRadius:"100px", padding:"6px 18px", marginBottom:"18px" }}>
                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#3b82f6", animation:"pulse 2s infinite" }} />
                  <span style={{ fontSize:"10px", fontWeight:700, color:"#3b82f6", letterSpacing:"1.2px", textTransform:"uppercase" }}>{rc.label} Portal</span>
                </div>
                <h1 style={{ fontSize:"26px", fontWeight:"700", color:"#0f172a", margin:"0 0 8px 0", letterSpacing:"-0.3px" }}>Welcome back</h1>
                <p style={{ fontSize:"14px", color:"#64748b", margin:0, lineHeight:1.5 }}>Sign in to continue to your {rc.label.toLowerCase()} dashboard</p>
              </div>

              {/* Fields */}
              <div style={{ display:"flex", flexDirection:"column", gap:"20px", marginBottom:"24px" }}>
                {/* Email */}
                <div>
                  <label style={{ display:"block", fontSize:"12px", fontWeight:"600", color:"#334155", marginBottom:"8px", letterSpacing:"0.3px" }}>Email address</label>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", background:"#f8fafc", border:`2px solid ${focused==="email" ? "#3b82f6" : "#e2e8f0"}`, borderRadius:"12px", padding:"0 16px", transition:"all 0.2s ease", boxShadow: focused==="email" ? "0 0 0 4px rgba(59,130,246,0.12)" : "none" }}>
                    <span style={{ color: focused==="email" ? "#3b82f6" : "#94a3b8", display:"flex" }}><MailIcon /></span>
                    <input type="email" placeholder={placeholders[role]} value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                      onKeyDown={handleKeyDown}
                      style={{ flex:1, padding:"14px 0", border:"none", background:"transparent", color:"#0f172a", outline:"none", fontSize:"14px", fontFamily:"'Inter', sans-serif" }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                    <label style={{ fontSize:"12px", fontWeight:"600", color:"#334155", letterSpacing:"0.3px" }}>Password</label>
                    <span style={{ fontSize:"13px", color:"#3b82f6", cursor:"pointer", fontWeight:"500" }}>Forgot password?</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", background:"#f8fafc", border:`2px solid ${focused==="password" ? "#3b82f6" : "#e2e8f0"}`, borderRadius:"12px", padding:"0 16px", position:"relative", transition:"all 0.2s ease", boxShadow: focused==="password" ? "0 0 0 4px rgba(59,130,246,0.12)" : "none" }}>
                    <span style={{ color: focused==="password" ? "#3b82f6" : "#94a3b8", display:"flex" }}><LockIcon /></span>
                    <input type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                      onKeyDown={handleKeyDown}
                      style={{ flex:1, padding:"14px 0", border:"none", background:"transparent", color:"#0f172a", outline:"none", fontSize:"14px", fontFamily:"'Inter', sans-serif", paddingRight:"40px" }} />
                    <button onClick={() => setShowPass(v => !v)} tabIndex={-1}
                      style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", padding:"4px", position:"absolute", right:"12px", color: showPass ? "#3b82f6" : "#94a3b8", transition:"color 0.2s" }}>
                      <EyeIcon open={showPass} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {err && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", fontSize:"13px", color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"10px 14px", marginBottom:"20px", fontWeight:500, animation:"shake 0.4s ease" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink:0, marginTop:"1px" }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <span>{err}</span>
                </div>
              )}

              {/* Submit */}
              <button disabled={!valid || loading} onClick={handleLogin} style={{
                width:"100%", padding:"14px", borderRadius:"12px", border:"none",
                cursor: (!valid || loading) ? "not-allowed" : "pointer",
                background: (!valid || loading) ? "#f1f5f9" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: (!valid || loading) ? "#94a3b8" : "white",
                fontWeight:"600", fontSize:"14px", fontFamily:"'Inter', sans-serif",
                transition:"all 0.25s ease",
                boxShadow: (!valid || loading) ? "none" : "0 4px 14px rgba(59,130,246,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
              }}
                onMouseEnter={e => { if (valid && !loading) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 20px rgba(59,130,246,0.4)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(59,130,246,0.3)"; }}
              >
                {loading ? (
                  <><span style={{ display:"inline-block", width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin 0.7s linear infinite", marginRight:8 }}/>Signing in…</>
                ) : (
                  <><span>Sign in to {rc.label} dashboard</span><ArrowRight /></>
                )}
              </button>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:"14px", margin:"28px 0 24px" }}>
                <div style={{ flex:1, height:"1px", background:"#e2e8f0" }}/>
                <span style={{ fontSize:"11px", color:"#94a3b8", fontWeight:"600", letterSpacing:"0.5px" }}>SECURE LOGIN</span>
                <div style={{ flex:1, height:"1px", background:"#e2e8f0" }}/>
              </div>

              {/* Footer */}
              <div style={{ marginTop:"auto", paddingTop:"8px" }}>
                {role === "recruiter" && (
                  <p style={{ textAlign:"center", fontSize:"13px", color:"#64748b", margin:"0 0 12px" }}>
                    New company?{" "}
                    <span onClick={() => navigate("/recruiter-signup")} style={{ color:"#3b82f6", fontWeight:"600", cursor:"pointer" }}>Apply as Recruiter</span>
                  </p>
                )}

                <button onClick={() => navigate("/")} style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                  margin:"0 auto", padding:"8px 16px", background:"none", border:"none",
                  color:"#64748b", fontSize:"13px", cursor:"pointer", borderRadius:"8px",
                  fontFamily:"'Inter', sans-serif", transition:"color 0.2s", fontWeight:"500",
                }}
                  onMouseEnter={e => e.currentTarget.style.color="#475569"}
                  onMouseLeave={e => e.currentTarget.style.color="#64748b"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Back to Home
                </button>

                {/* Security badge */}
                <div style={{ textAlign:"center", marginTop:"20px", paddingTop:"16px", borderTop:"1px solid #f1f5f9" }}>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"11px", color:"#94a3b8" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg>
                    <span>NeuroAssess — Secured Login</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}