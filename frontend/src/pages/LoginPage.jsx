import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const T = {
  bg: "#CFF4F7",
  surface: "#ffffff",
  border: "rgba(43,177,168,0.18)",
  borderFocus: "rgba(43,177,168,0.55)",
  accent: "#2BB1A8",
  accentEnd: "#1d9e96",
  accentLight: "#e8fafb",
  teal: "#2BB1A8",
  red: "#e11d48",
  text: "#0A2A41",
  muted: "#3d6878",
  dim: "#7aacba",
  inputBg: "#f0fbfc",
  navy: "#0A2A41",
  paleAqua: "#CFF4F7",
  lightCyan: "#F2FBFF",
};

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const AdminIllustration = () => (
  <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 300 }}>
    <circle cx="160" cy="140" r="110" fill="rgba(255,255,255,0.05)"/>
    <rect x="40" y="55" width="220" height="155" rx="12" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
    <rect x="40" y="55" width="220" height="24" rx="12" fill="rgba(255,255,255,0.25)"/>
    <circle cx="58" cy="67" r="5" fill="#ff6b6b" opacity="0.85"/>
    <circle cx="73" cy="67" r="5" fill="#ffd93d" opacity="0.85"/>
    <circle cx="88" cy="67" r="5" fill="#6bcb77" opacity="0.85"/>
    <rect x="40" y="79" width="42" height="131" rx="0" fill="rgba(10,42,65,0.55)"/>
    <circle cx="61" cy="98" r="9" fill="rgba(255,255,255,0.5)"/>
    <rect x="50" y="114" width="22" height="3.5" rx="1.75" fill="rgba(255,255,255,0.4)"/>
    <rect x="53" y="121" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
    <rect x="50" y="132" width="22" height="3.5" rx="1.75" fill="rgba(255,255,255,0.3)"/>
    <rect x="50" y="143" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.25)"/>
    <rect x="82" y="79" width="178" height="131" fill="rgba(255,255,255,0.08)"/>
    <circle cx="171" cy="122" r="28" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
    <circle cx="171" cy="116" r="13" fill="#a8e6e3"/>
    <ellipse cx="171" cy="136" rx="18" ry="9" fill="#2BB1A8"/>
    <rect x="90" y="160" width="42" height="24" rx="7" fill="#2BB1A8" opacity="0.9"/>
    <circle cx="100" cy="172" r="5" fill="rgba(255,255,255,0.7)"/>
    <rect x="109" y="169" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.8)"/>
    <rect x="141" y="160" width="42" height="24" rx="7" fill="#ffd93d" opacity="0.9"/>
    <circle cx="151" cy="172" r="5" fill="rgba(255,255,255,0.7)"/>
    <rect x="192" y="160" width="42" height="24" rx="7" fill="#a8e6e3" opacity="0.9"/>
    <rect x="218" y="40" width="90" height="68" rx="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <circle cx="235" cy="70" r="9" fill="rgba(168,230,227,0.7)"/>
    <rect x="249" y="64" width="48" height="4" rx="2" fill="rgba(255,255,255,0.5)"/>
    <rect x="249" y="72" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
    <circle cx="235" cy="90" r="7" fill="rgba(43,177,168,0.7)"/>
    <rect x="249" y="85" width="44" height="4" rx="2" fill="rgba(255,255,255,0.4)"/>
    <rect x="148" y="210" width="24" height="14" rx="2" fill="rgba(255,255,255,0.2)"/>
    <rect x="136" y="222" width="48" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
    <circle cx="83" cy="240" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
    <circle cx="83" cy="240" r="6" fill="rgba(255,255,255,0.25)"/>
    <text x="30" y="50" fontSize="12" fill="rgba(255,255,255,0.5)">✦</text>
    <text x="285" y="130" fontSize="9" fill="rgba(255,255,255,0.35)">✦</text>
  </svg>
);

const StudentIllustration = () => (
  <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 300 }}>
    <circle cx="160" cy="148" r="100" fill="rgba(207,244,247,0.18)"/>
    <rect x="60" y="75" width="130" height="165" rx="12" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" transform="rotate(-8,125,158)"/>
    <rect x="130" y="70" width="130" height="165" rx="12" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" transform="rotate(8,195,153)"/>
    <rect x="88" y="58" width="144" height="18" rx="5" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
    <circle cx="120" cy="67" r="5" fill="rgba(255,255,255,0.5)"/>
    <circle cx="145" cy="67" r="5" fill="rgba(255,255,255,0.5)"/>
    <circle cx="170" cy="67" r="5" fill="rgba(255,255,255,0.5)"/>
    <circle cx="195" cy="67" r="5" fill="rgba(255,255,255,0.5)"/>
    <circle cx="220" cy="67" r="5" fill="rgba(255,255,255,0.5)"/>
    <rect x="88" y="76" width="144" height="180" rx="12" fill="rgba(255,255,255,0.93)" stroke="rgba(255,255,255,0.6)" strokeWidth="1"/>
    <circle cx="160" cy="122" r="30" fill="#d9f2f4"/>
    <circle cx="160" cy="115" r="15" fill="#2BB1A8"/>
    <ellipse cx="160" cy="138" rx="21" ry="11" fill="#2BB1A8"/>
    <circle cx="184" cy="146" r="14" fill="#4ade80"/>
    <path d="M177 146l5 5 8-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="108" y="165" width="104" height="7" rx="3.5" fill="#a8e6e3"/>
    <rect x="116" y="178" width="88" height="5.5" rx="2.75" fill="#a8e6e3" opacity="0.7"/>
    <rect x="108" y="191" width="50" height="5" rx="2.5" fill="#a8e6e3" opacity="0.5"/>
    <rect x="164" y="191" width="48" height="5" rx="2.5" fill="#fde68a" opacity="0.8"/>
    <rect x="108" y="203" width="104" height="4" rx="2" fill="#a8e6e3" opacity="0.4"/>
    <text x="60" y="62" fontSize="13" fill="rgba(255,255,255,0.65)">✦</text>
    <text x="256" y="68" fontSize="10" fill="rgba(255,255,255,0.5)">✦</text>
  </svg>
);

const RecruiterIllustration = () => (
  <svg viewBox="0 0 320 290" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 300 }}>
    <circle cx="138" cy="82" r="32" fill="#fde8c8"/>
    <path d="M108 75 C108 55 168 50 168 75 C168 62 155 54 138 54 C121 54 108 62 108 75Z" fill="#2d1b0e"/>
    <path d="M100 165 C100 145 115 132 138 130 C161 132 176 145 176 165 L178 230 H98 Z" fill="#2BB1A8"/>
    <path d="M128 130 L138 148 L148 130" fill="#d9f2f4" stroke="#a8e6e3" strokeWidth="1"/>
    <path d="M100 150 C85 155 70 160 58 168" stroke="#2BB1A8" strokeWidth="20" strokeLinecap="round"/>
    <path d="M176 150 C188 155 198 162 205 172" stroke="#2BB1A8" strokeWidth="18" strokeLinecap="round"/>
    <circle cx="45" cy="148" r="26" fill="none" stroke="#0A2A41" strokeWidth="6"/>
    <circle cx="45" cy="148" r="21" fill="rgba(207,244,247,0.35)"/>
    <path d="M63 163 L80 182" stroke="#0A2A41" strokeWidth="7" strokeLinecap="round"/>
    <path d="M34 138 C36 132 42 128 48 129" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="170" y="42" width="110" height="72" rx="14" fill="#CFF4F7"/>
    <path d="M175 100 L160 118 L192 104" fill="#CFF4F7"/>
    <rect x="200" y="64" width="50" height="38" rx="6" fill="rgba(255,255,255,0.5)" stroke="#2BB1A8" strokeWidth="2"/>
    <rect x="215" y="58" width="20" height="12" rx="4" fill="none" stroke="#2BB1A8" strokeWidth="2"/>
    <line x1="200" y1="78" x2="250" y2="78" stroke="#2BB1A8" strokeWidth="2"/>
    <rect x="221" y="74" width="8" height="8" rx="2" fill="#2BB1A8" opacity="0.6"/>
    <text x="258" y="155" fontSize="12" fill="rgba(255,255,255,0.4)">✦</text>
  </svg>
);

const IllustrationSVG = ({ role }) => {
  if (role === "admin") return <AdminIllustration />;
  if (role === "recruiter") return <RecruiterIllustration />;
  return <StudentIllustration />;
};

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get("role") || "student";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [focused, setFocused] = useState("");
  const [showPass, setShowPass] = useState(false);

  const valid = form.email.includes("@") && form.password.length >= 4;

  const handleLogin = () => {
    setLoading(true);
    setErr("");
    setTimeout(() => {
      if (role === "student" && form.email === "student@neuro.edu" && form.password === "1234") {
       localStorage.setItem("student_id", "student_001");
       localStorage.setItem("student_email", form.email);
       navigate("/student-dashboard"); return;
      }
      if (role === "admin" && form.email === "admin@neuro.edu" && form.password === "admin123") {
        navigate("/admin-dashboard"); return;
      }
      if (role === "recruiter" && form.email === "recruiter@neuro.edu" && form.password === "rec123") {
        navigate("/recruiter-dashboard"); return;
      }
      setErr("Invalid credentials. Please try again.");
      setLoading(false);
    }, 800);
  };

  const roleConfig = {
    admin: {
      label: "Admin", color: "#0A2A41", bg: "#d9f2f4", tag: "#0A2A41",
      gradient: "linear-gradient(145deg, #0A2A41 0%, #1C3240 60%, #0d2235 100%)",
      pills: ["User Management", "Analytics Dashboard", "System Control"],
      tagline: "Platform Administration",
    },
    recruiter: {
      label: "Recruiter", color: "#2BB1A8", bg: "#d9f2f4", tag: "#1d9e96",
      gradient: "linear-gradient(145deg, #2BB1A8 0%, #1d9e96 50%, #0A2A41 100%)",
      pills: ["Talent Discovery", "Candidate Tracking", "Smart Matching"],
      tagline: "Recruitment & Hiring",
    },
    student: {
      label: "Student", color: "#2BB1A8", bg: "#d9f2f4", tag: "#1d9e96",
      gradient: "linear-gradient(145deg, #0A2A41 0%, #1C3240 40%, #2BB1A8 100%)",
      pills: ["Take Assessments", "View Results", "Track Progress"],
      tagline: "Candidate Assessment",
    },
  };
  const rc = roleConfig[role] || roleConfig.student;

  const demoAccounts = [
    { r: "Student",   e: "student@neuro.edu",   p: "1234",     color: "#2BB1A8", bg: "#d9f2f4" },
    { r: "Admin",     e: "admin@neuro.edu",     p: "admin123", color: "#0A2A41", bg: "#CFF4F7" },
    { r: "Recruiter", e: "recruiter@neuro.edu", p: "rec123",   color: "#1d9e96", bg: "#e8fafb" },
  ];

  const placeholders = {
    admin: "admin@neuro.edu",
    recruiter: "recruiter@neuro.edu",
    student: "student@neuro.edu",
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        * { box-sizing: border-box; }
        input::placeholder { color: #7aacba; }
      `}</style>

      {/* Left panel */}
      <div style={{ ...s.leftPanel, background: rc.gradient }}>
        <div style={s.blob1}/>
        <div style={s.blob2}/>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeIn 0.8s ease" }}>
          <div style={s.logoMark}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 8v12L14 26 2 20V8L14 2z" fill="rgba(255,255,255,0.9)"/>
              <path d="M14 7l8 4v6l-8 4-8-4v-6l8-4z" fill="rgba(43,177,168,0.6)"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
            </svg>
          </div>
          <div style={s.brandName}>NeuroAssess</div>
          <div style={s.brandTagline}>{rc.tagline}</div>
          <div style={{ margin: "32px auto", maxWidth: 300 }}>
            <IllustrationSVG role={role} />
          </div>
          <div style={s.featurePills}>
            {rc.pills.map(f => (
              <div key={f} style={s.pill}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" fill="rgba(255,255,255,0.4)"/>
                  <path d="M3 5l1.5 1.5L7 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.rightPanel}>
        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.6s ease" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: rc.bg,
              border: `1px solid ${T.accent}30`,
              borderRadius: 100,
              padding: "5px 14px",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: "1.2px", textTransform: "uppercase" }}>
                {rc.label} Portal
              </span>
            </div>
          </div>

          <h1 style={s.heading}>Welcome back</h1>
          <p style={s.subheading}>Sign in to your account to continue</p>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Email Address</label>
            <div style={{
              ...s.inputWrap,
              borderColor: focused === "email" ? T.borderFocus : T.border,
              boxShadow: focused === "email" ? "0 0 0 3px rgba(43,177,168,0.12)" : "none",
            }}>
              <span style={{ ...s.inputIcon, color: focused === "email" ? T.accent : T.dim }}>
                <MailIcon />
              </span>
              <input
                type="email"
                placeholder={placeholders[role]}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                style={s.input}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>Password</label>
              <span style={{ fontSize: 12, color: T.accent, cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>
            </div>
            <div style={{
              ...s.inputWrap,
              borderColor: focused === "password" ? T.borderFocus : T.border,
              boxShadow: focused === "password" ? "0 0 0 3px rgba(43,177,168,0.12)" : "none",
            }}>
              <span style={{ ...s.inputIcon, color: focused === "password" ? T.accent : T.dim }}>
                <LockIcon />
              </span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button onClick={() => setShowPass(v => !v)} style={{ ...s.eyeBtn, color: showPass ? T.accent : T.dim }} tabIndex={-1}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {err && (
            <div style={s.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {err}
            </div>
          )}

          <button
            style={{ ...s.btn, opacity: (!valid || loading) ? 0.5 : 1, cursor: (!valid || loading) ? "not-allowed" : "pointer" }}
            disabled={!valid || loading}
            onClick={handleLogin}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={s.spinner} /> Signing in...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                Sign In <ArrowRight />
              </span>
            )}
          </button>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>Demo Accounts</span>
            <div style={s.dividerLine} />
          </div>

          <div style={s.demoBox}>
            {demoAccounts.map((d, i) => (
              <div key={d.r} onClick={() => setForm({ email: d.e, password: d.p })}
                style={{ ...s.demoRow, borderBottom: i < 2 ? "1px solid rgba(43,177,168,0.1)" : "none", cursor: "pointer" }}>
                <span style={{ ...s.demoTag, color: d.color, background: d.bg }}>{d.r}</span>
                <span style={s.demoEmail}>{d.e}</span>
                <span style={s.demoPass}>{d.p}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: T.dim, textAlign: "center", marginTop: 6 }}>
            Click a row to autofill credentials
          </p>

          <button style={s.backBtn} onClick={() => navigate("/")}>
            <BackIcon /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: T.bg, color: T.text },
  leftPanel: { width: "45%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative", overflow: "hidden" },
  blob1: { position: "absolute", top: "-80px", right: "-80px", width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" },
  blob2: { position: "absolute", bottom: "-100px", left: "-60px", width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" },
  logoMark: { width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", backdropFilter: "blur(8px)" },
  brandName: { color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" },
  brandTagline: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4, fontWeight: 400 },
  featurePills: { display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 8 },
  pill: { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, padding: "6px 14px", color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 500, backdropFilter: "blur(4px)" },
  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", background: T.lightCyan },
  heading: { fontSize: 28, fontWeight: 800, color: T.navy, letterSpacing: "-0.5px", margin: "0 0 6px" },
  subheading: { fontSize: 14, color: T.muted, margin: "0 0 28px", fontWeight: 400 },
  label: { fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 6, display: "block", letterSpacing: "0.2px" },
  inputWrap: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "0 14px", transition: "border-color 0.2s, box-shadow 0.2s", position: "relative" },
  inputIcon: { display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.2s" },
  input: { flex: 1, padding: "13px 0", border: "none", background: "transparent", color: T.text, outline: "none", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400 },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", position: "absolute", right: 12, transition: "color 0.2s" },
  errorBox: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.red, background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontWeight: 500 },
  btn: { width: "100%", padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${T.accent}, ${T.accentEnd})`, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: "0 4px 16px rgba(43,177,168,0.35)", transition: "opacity 0.2s, transform 0.1s", letterSpacing: "0.1px" },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "22px 0 16px" },
  dividerLine: { flex: 1, height: 1, background: "rgba(43,177,168,0.15)" },
  dividerText: { fontSize: 10, color: T.dim, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", whiteSpace: "nowrap" },
  demoBox: { background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" },
  demoRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", transition: "background 0.15s" },
  demoTag: { fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", minWidth: 62, textAlign: "center", flexShrink: 0 },
  demoEmail: { fontSize: 11, color: T.muted, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  demoPass: { fontSize: 11, fontFamily: "monospace", color: T.dim, background: T.lightCyan, border: `1px solid ${T.border}`, borderRadius: 5, padding: "2px 7px", flexShrink: 0 },
  backBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, margin: "20px auto 0", padding: "8px 16px", background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "color 0.2s" },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
};