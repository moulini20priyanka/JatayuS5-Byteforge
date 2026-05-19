import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api';

const T = {
  bg: "#dbeafe", navy: "#0f172a", teal: "#3b82f6", tealEnd: "#2563eb",
  muted: "#475569", dim: "#64748b", border: "rgba(59,130,246,0.18)",
  borderFocus: "rgba(59,130,246,0.55)", lightCyan: "#ffffff",
  red: "#dc2626", text: "#0f172a",
};

const Icon = ({ path }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const FIELDS = [
  { key: "full_name",    label: "Full Name",    placeholder: "Your full name",       type: "text",     icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { key: "company_name", label: "Company Name", placeholder: "Your company name",    type: "text",     icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { key: "email",        label: "Work Email",   placeholder: "you@company.com",      type: "email",    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
  { key: "password",     label: "Password",     placeholder: "Min. 8 characters",   type: "password", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { key: "confirm",      label: "Confirm Password", placeholder: "Re-enter password", type: "password", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
];

export default function RecruiterSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", password: "", confirm: "" });
  const [focused, setFocused] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState({ password: false, confirm: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const valid =
    form.full_name.trim().length >= 2 &&
    form.company_name.trim().length >= 2 &&
    form.email.includes("@") &&
    form.password.length >= 8 &&
    form.password === form.confirm;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErr("");

    if (form.password !== form.confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        form.email,
          password:     form.password,
          full_name:    form.full_name,
          company_name: form.company_name,
          role:         "recruiter",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setErr("Cannot reach server. Make sure the backend is running.");
      setLoading(false);
    }
  };


  if (success) {
    return (
      <div style={{ ...s.root, justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 16 }}>
        <style>{fonts}</style>
        <div style={{ ...s.successCard, animation: mounted ? "fadeUp 0.5s ease-out" : "none" }}>
          <div style={s.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "pulse 2s infinite" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: T.navy }}>Application Submitted!</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: T.muted, lineHeight: 1.6, textAlign: "center" }}>
            Your recruiter application has been sent to the admin for review.<br/>
            Redirecting to home page...
          </p>
          <button style={s.btn} onClick={() => navigate("/")}>
            Go to Home Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{fonts}</style>
      <div style={s.root}>
        {/* Background Orbs */}
        <div style={{ ...s.bgOrb1, animationDelay: "0s" }} />
        <div style={{ ...s.bgOrb2, animationDelay: "-5s" }} />
        <div style={{ ...s.bgOrb3, animationDelay: "-10s" }} />
        <div style={{ ...s.bgOrb4, animationDelay: "-15s" }} />

        {/* Main Card */}
        <div style={{ ...s.card, animation: mounted ? "fadeUp 0.6s ease-out" : "none" }}>
          
          {/* Left Panel */}
          <div style={s.leftPanel}>
            <div style={{ ...s.leftBlob1, animation: mounted ? "float 6s ease-in-out infinite" : "none" }} />
            <div style={{ ...s.leftBlob2, animation: mounted ? "float 8s ease-in-out infinite reverse" : "none" }} />
            
            {/* Logo */}
            <div style={{ ...s.logo, animation: mounted ? "slideInLeft 0.5s ease-out" : "none" }}>
              <div style={{ ...s.logoMark, animation: mounted ? "pulse 3s infinite" : "none" }}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="white">
                  <path d="M14 2L26 8v12L14 26 2 20V8L14 2z"/>
                </svg>
              </div>
              <span style={s.logoText}>NeuroAssess</span>
            </div>

            {/* Illustration */}
            <div style={{ ...s.illustration, animation: mounted ? "float 5s ease-in-out infinite" : "none" }}>
              <svg viewBox="0 0 280 240" fill="none" style={{ width: "100%" }}>
                <circle cx="140" cy="120" r="90" fill="rgba(255,255,255,0.1)"/>
                <rect x="50" y="60" width="180" height="130" rx="14" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                <rect x="50" y="60" width="180" height="28" rx="14" fill="rgba(255,255,255,0.2)"/>
                <circle cx="68" cy="74" r="5" fill="#ef4444" opacity="0.8"/>
                <circle cx="82" cy="74" r="5" fill="#f59e0b" opacity="0.8"/>
                <circle cx="96" cy="74" r="5" fill="#10b981" opacity="0.8"/>
                <circle cx="100" cy="115" r="22" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <circle cx="100" cy="110" r="10" fill={T.teal} opacity="0.6"/>
                <ellipse cx="100" cy="126" rx="14" ry="7" fill={T.teal} opacity="0.4"/>
                <rect x="132" y="100" width="80" height="7" rx="3.5" fill="rgba(255,255,255,0.7)"/>
                <rect x="132" y="113" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.4)"/>
                <rect x="132" y="124" width="70" height="5" rx="2.5" fill="rgba(255,255,255,0.3)"/>
                <rect x="65" y="148" width="50" height="22" rx="7" fill={T.teal} opacity="0.9"/>
                <rect x="122" y="148" width="50" height="22" rx="7" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                <rect x="179" y="148" width="36" height="22" rx="7" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
              </svg>
            </div>

            {/* Welcome Text */}
            <div style={{ ...s.welcomeText, animation: mounted ? "fadeUp 0.5s 0.2s both" : "none" }}>
              <h3 style={s.welcomeTitle}>Join as Recruiter</h3>
              <p style={s.welcomeDesc}>Access AI-powered candidate evaluation and smart hiring tools</p>
            </div>

            {/* Feature Pills */}
            <div style={{ ...s.features, animation: mounted ? "fadeUp 0.5s 0.3s both" : "none" }}>
              {["Post exam requests", "AI candidate evaluation", "Smart shortlisting"].map((f, i) => (
                <div key={f} style={{ ...s.pill, animation: `slideInLeft 0.4s ${0.4 + i * 0.1}s both` }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4" fill="rgba(255,255,255,0.4)"/>
                    <path d="M3 5l1.5 1.5L7 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {f}
                </div>
              ))}
            </div>

            {/* Dots */}
            <div style={{ ...s.dots, animation: mounted ? "fadeUp 0.5s 0.6s both" : "none" }}>
              <div style={{ ...s.dot1, animation: "blink 1.5s infinite" }} />
              <div style={{ ...s.dot2, animation: "blink 1.5s 0.3s infinite" }} />
              <div style={{ ...s.dot3, animation: "blink 1.5s 0.6s infinite" }} />
            </div>
          </div>

          {/* Right Panel - Form */}
          <div style={s.rightPanel}>
            <div style={{ width: "100%", maxWidth: 400 }}>

              {/* Portal Badge */}
              <div style={{ ...s.portalBadgeWrapper, animation: mounted ? "fadeUp 0.4s 0.1s both" : "none" }}>
                <div style={s.portalBadge}>
                  <div style={{ ...s.badgeDot, animation: "pulse 2s infinite" }} />
                  <span style={s.badgeText}>Recruiter Signup</span>
                </div>
              </div>

              <h3 style={{ ...s.heading, animation: mounted ? "fadeUp 0.4s 0.15s both" : "none" }}>Create your account</h3>
      
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {FIELDS.map((f, i) => {
                  const isPass = f.type === "password";
                  const show = showPass[f.key];
                  return (
                    <div key={f.key} style={{ animation: mounted ? `fadeUp 0.4s ${0.25 + i * 0.08}s both` : "none" }}>
                      <label style={s.label}>{f.label}</label>
                      <div style={{
                        ...s.inputWrap,
                        borderColor: focused === f.key ? T.borderFocus : T.border,
                        boxShadow: focused === f.key ? "0 0 0 4px rgba(59,130,246,0.15)" : "none",
                        transition: "all 0.25s ease"
                      }}>
                        <span style={{ ...s.inputIcon, color: focused === f.key ? T.teal : T.dim, transition: "color 0.2s" }}>
                          <Icon path={f.icon} />
                        </span>
                        <input
                          type={isPass && show ? "text" : f.type}
                          placeholder={f.placeholder}
                          value={form[f.key]}
                          onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                          onFocus={() => setFocused(f.key)}
                          onBlur={() => setFocused("")}
                          style={{ ...s.input, paddingRight: isPass ? 44 : 0 }}
                        />
                        {isPass && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPass(p => ({ ...p, [f.key]: !p[f.key] }))}
                            style={{ ...s.eyeBtn, color: show ? T.teal : T.dim, transition: "color 0.2s, transform 0.2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {show
                                ? <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
                                : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                              }
                            </svg>
                          </button>
                        )}
                      </div>
                      {f.key === "confirm" && form.confirm && form.password !== form.confirm && (
                        <p style={{ fontSize: 11.5, color: T.red, marginTop: 5, marginLeft: 2, animation: "shake 0.4s ease" }}>Passwords do not match</p>
                      )}
                    </div>
                  );
                })}

                {/* Error Message */}
                {err && (
                  <div style={{ ...s.errorBox, animation: "shake 0.4s ease" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    {err}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    ...s.btn,
                    marginTop: 24,
                    opacity: (!valid || loading) ? 0.6 : 1,
                    cursor: (!valid || loading) ? "not-allowed" : "pointer",
                    animation: mounted ? "fadeUp 0.4s 0.65s both" : "none",
                    transition: "all 0.25s ease",
                  }}
                  disabled={!valid || loading}
                  onMouseEnter={(e) => {
                    if (valid && !loading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(59,130,246,0.45)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59,130,246,0.35)";
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 6 }}/>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, flexShrink: 0 }}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.muted, animation: mounted ? "fadeUp 0.4s 0.7s both" : "none" }}>
                Already have an account?{" "}
                <span style={{ color: T.teal, fontWeight: 600, cursor: "pointer", textDecoration: "none", transition: "color 0.2s" }}
                  onClick={() => navigate("/login?role=recruiter")}
                  onMouseEnter={(e) => e.target.style.color = T.tealEnd}
                  onMouseLeave={(e) => e.target.style.color = T.teal}>
                  Sign in
                </span>
              </p>

              {/* Back Button */}
              <button style={{ ...s.backBtn, animation: mounted ? "fadeUp 0.4s 0.75s both" : "none" }} onClick={() => navigate("/")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 0.2s" }}>
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Home
              </button>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideInLeft { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes orbFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(25px,-30px) scale(1.05)} 66%{transform:translate(-15px,20px) scale(0.96)} }
  @keyframes pulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.7; transform:scale(1.03)} }
  @keyframes blink { 0%,100%{opacity:0.6} 50%{opacity:0.2} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
  * { box-sizing: border-box; }
  input::placeholder { color: #94a3b8; }
`;

const s = {
  root: { 
    minHeight: "100vh", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden"
  },
  bgOrb1: {
    position: "absolute", width: "500px", height: "500px",
    background: "radial-gradient(circle, rgba(100,200,255,0.35) 0%, transparent 70%)",
    borderRadius: "50%", top: "-120px", left: "-120px",
    filter: "blur(70px)", animation: "orbFloat 22s ease-in-out infinite", opacity: 0.55
  },
  bgOrb2: {
    position: "absolute", width: "420px", height: "420px",
    background: "radial-gradient(circle, rgba(147,197,253,0.3) 0%, transparent 70%)",
    borderRadius: "50%", bottom: "-80px", right: "-80px",
    filter: "blur(60px)", animation: "orbFloat 26s ease-in-out infinite reverse", opacity: 0.45
  },
  bgOrb3: {
    position: "absolute", width: "340px", height: "340px",
    background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
    borderRadius: "50%", top: "45%", left: "62%",
    transform: "translate(-50%, -50%)", filter: "blur(50px)",
    animation: "orbFloat 24s ease-in-out infinite", opacity: 0.35
  },
  bgOrb4: {
    position: "absolute", width: "300px", height: "300px",
    background: "radial-gradient(circle, rgba(191,219,254,0.35) 0%, transparent 70%)",
    borderRadius: "50%", top: "25%", right: "25%",
    filter: "blur(45px)", animation: "orbFloat 20s ease-in-out infinite", opacity: 0.4
  },
  card: {
    width: "100%", maxWidth: "1050px", minHeight: "580px", maxHeight: "90vh",
    background: "white", borderRadius: "22px",
    display: "flex", boxShadow: "0 20px 60px rgba(59,130,246,0.18), 0 8px 30px rgba(0,0,0,0.08)",
    position: "relative", zIndex: 10, overflow: "visible"
  },
  leftPanel: {
    flex: "1",
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1d4ed8 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "40px 35px", position: "relative", overflow: "hidden"
  },
  leftBlob1: {
    position: "absolute", width: "260px", height: "260px",
    background: "radial-gradient(circle, rgba(100,200,255,0.22) 0%, transparent 70%)",
    borderRadius: "50%", top: "-70px", left: "-70px",
    filter: "blur(45px)"
  },
  leftBlob2: {
    position: "absolute", width: "220px", height: "220px",
    background: "radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)",
    borderRadius: "50%", bottom: "-50px", right: "-50px",
    filter: "blur(40px)"
  },
  logo: {
    position: "absolute", top: "30px", left: "30px",
    display: "flex", alignItems: "center", gap: "10px", zIndex: 10
  },
  logoMark: {
    width: "38px", height: "38px", borderRadius: "10px",
    background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
    border: "1.5px solid rgba(255,255,255,0.28)",
    display: "flex", alignItems: "center", justifyContent: "center"
  },
  logoText: { fontWeight: 700, fontSize: "16px", color: "white", letterSpacing: "-0.3px" },
  illustration: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: "320px",
    marginTop: "20px"
  },
  welcomeText: { textAlign: "center", marginTop: "28px", color: "white", zIndex: 1 },
  welcomeTitle: { fontSize: "26px", fontWeight: "700", margin: "0 0 10px 0", color: "white" },
  welcomeDesc: { fontSize: "13px", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.55, maxWidth: "280px", marginLeft: "auto", marginRight: "auto" },
  features: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "24px", zIndex: 1 },
  pill: {
    display: "flex", alignItems: "center", gap: "9px",
    color: "rgba(255,255,255,0.9)", fontSize: "12.5px",
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "100px", padding: "5px 12px"
  },
  dots: {
    position: "absolute", bottom: "25px", left: "50%", transform: "translateX(-50%)",
    display: "flex", gap: "6px", zIndex: 1
  },
  dot1: { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.65)" },
  dot2: { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.35)" },
  dot3: { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.45)" },
  rightPanel: {
    flex: "1", background: "white",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
    padding: "35px 40px", overflowY: "auto"
  },
  portalBadgeWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: "8px",
    paddingTop: "8px"
  },
  portalBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "#dbeafe", border: "1px solid rgba(59,130,246,0.28)",
    borderRadius: "100px", padding: "5px 16px"
  },
  badgeDot: { width: "6px", height: "6px", borderRadius: "50%", background: T.teal },
  badgeText: { fontSize: "10.5px", fontWeight: 700, color: T.teal, letterSpacing: "1px", textTransform: "uppercase" },
  heading: { fontSize: "24px", fontWeight: "700", color: T.navy, letterSpacing: "-0.4px", margin: "0 0 6px 0" },
  label: { fontSize: "11.5px", fontWeight: "600", color: T.navy, marginBottom: "6px", display: "block", letterSpacing: "0.4px", textTransform: "uppercase" },
  inputWrap: {
    display: "flex", alignItems: "center", gap: "11px",
    background: "#f8fafc", border: "2px solid", borderRadius: "10px",
    padding: "0 14px", position: "relative"
  },
  inputIcon: { display: "flex", alignItems: "center", flexShrink: 0 },
  input: {
    flex: 1, padding: "12px 0", border: "none", background: "transparent",
    color: T.text, outline: "none", fontSize: "14px", fontFamily: "'Inter', sans-serif"
  },
  eyeBtn: {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", padding: "4px",
    position: "absolute", right: "11px"
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: "7px",
    fontSize: "12px", color: T.red, background: "#fef2f2",
    border: "1px solid #fecaca", borderRadius: "8px",
    padding: "9px 11px", marginTop: "14px", fontWeight: 500
  },
  btn: {
    width: "100%", padding: "13px", borderRadius: "10px", border: "none",
    background: `linear-gradient(135deg, ${T.teal}, ${T.tealEnd})`,
    color: "#fff", fontWeight: "600", fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 14px rgba(59,130,246,0.32)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
  },
  backBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
    margin: "12px auto 0", padding: "6px 12px", background: "none", border: "none",
    color: T.dim, fontSize: "12px", cursor: "pointer", borderRadius: "7px",
    fontFamily: "'Inter', sans-serif", transition: "color 0.2s"
  },
  successCard: {
    background: "#fff", borderRadius: "18px", padding: "36px 32px",
    maxWidth: "400px", width: "90%", display: "flex", flexDirection: "column",
    alignItems: "center", boxShadow: "0 8px 32px rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.15)"
  },
  successIcon: {
    width: "58px", height: "58px", borderRadius: "50%",
    background: "#dbeafe", display: "flex", alignItems: "center",
    justifyContent: "center", marginBottom: "14px"
  },
};


