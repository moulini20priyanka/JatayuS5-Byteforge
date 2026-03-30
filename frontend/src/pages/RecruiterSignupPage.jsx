import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const T = {
  bg: "#CFF4F7", navy: "#0A2A41", teal: "#2BB1A8", tealEnd: "#1d9e96",
  muted: "#3d6878", dim: "#7aacba", border: "rgba(43,177,168,0.18)",
  borderFocus: "rgba(43,177,168,0.55)", lightCyan: "#F2FBFF",
  red: "#e11d48", text: "#0A2A41",
};

const Icon = ({ path }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
  const [form,    setForm]    = useState({ full_name: "", company_name: "", email: "", password: "", confirm: "" });
  const [focused, setFocused] = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState({ password: false, confirm: false });

  const valid =
    form.full_name.trim().length >= 2 &&
    form.company_name.trim().length >= 2 &&
    form.email.includes("@") &&
    form.password.length >= 8 &&
    form.password === form.confirm;

  const handleSubmit = async () => {
    setErr("");
    if (form.password !== form.confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/recruiter/signup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:        form.email,
          password:     form.password,
          full_name:    form.full_name,
          company_name: form.company_name,
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && valid && !loading) handleSubmit();
  };

  // Success screen
  if (success) {
    return (
      <div style={{ ...s.root, justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 16 }}>
        <style>{fonts}</style>
        <div style={s.successCard}>
          <div style={s.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2BB1A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: T.navy }}>Application Submitted!</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: T.muted, lineHeight: 1.6, textAlign: "center" }}>
            Your recruiter application has been sent to the admin for review.<br/>
            You'll be notified once approved.
          </p>
          <button style={s.btn} onClick={() => navigate("/login?role=recruiter")}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <style>{fonts}</style>

      {/* Left panel */}
      <div style={s.leftPanel}>
        <div style={s.blob1}/><div style={s.blob2}/>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={s.logoMark}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 8v12L14 26 2 20V8L14 2z" fill="rgba(255,255,255,0.9)"/>
              <path d="M14 7l8 4v6l-8 4-8-4v-6l8-4z" fill="rgba(43,177,168,0.6)"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
            </svg>
          </div>
          <div style={s.brandName}>NeuroAssess</div>
          <div style={s.brandTagline}>Recruiter Portal</div>

          {/* Illustration */}
          <div style={{ margin: "36px auto", maxWidth: 280 }}>
            <svg viewBox="0 0 280 240" fill="none" style={{ width: "100%" }}>
              <circle cx="140" cy="120" r="90" fill="rgba(255,255,255,0.06)"/>
              <rect x="50" y="60" width="180" height="130" rx="14" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <rect x="50" y="60" width="180" height="28" rx="14" fill="rgba(255,255,255,0.2)"/>
              <circle cx="68" cy="74" r="5" fill="#ff6b6b" opacity="0.8"/>
              <circle cx="82" cy="74" r="5" fill="#ffd93d" opacity="0.8"/>
              <circle cx="96" cy="74" r="5" fill="#6bcb77" opacity="0.8"/>
              <circle cx="100" cy="115" r="22" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <circle cx="100" cy="110" r="10" fill="#a8e6e3"/>
              <ellipse cx="100" cy="126" rx="14" ry="7" fill="#2BB1A8"/>
              <rect x="132" y="100" width="80" height="7" rx="3.5" fill="rgba(255,255,255,0.5)"/>
              <rect x="132" y="113" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.35)"/>
              <rect x="132" y="124" width="70" height="5" rx="2.5" fill="rgba(255,255,255,0.25)"/>
              <rect x="65" y="148" width="50" height="22" rx="7" fill="#2BB1A8" opacity="0.9"/>
              <rect x="122" y="148" width="50" height="22" rx="7" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
              <rect x="179" y="148" width="36" height="22" rx="7" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            {["Post exam requests", "AI candidate evaluation", "Smart shortlisting"].map(f => (
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
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Portal badge */}
          <div style={{ marginBottom: 24 }}>
            <div style={s.portalBadge}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.teal }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.teal, letterSpacing: "1.2px", textTransform: "uppercase" }}>
                Recruiter Signup
              </span>
            </div>
          </div>

          <h1 style={s.heading}>Create your account</h1>
          <p style={s.subheading}>Apply for recruiter access — admin will review your request</p>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FIELDS.map(f => {
              const isPass = f.type === "password";
              const show   = showPass[f.key];
              return (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <div style={{
                    ...s.inputWrap,
                    borderColor: focused === f.key ? T.borderFocus : T.border,
                    boxShadow: focused === f.key ? "0 0 0 3px rgba(43,177,168,0.12)" : "none",
                  }}>
                    <span style={{ ...s.inputIcon, color: focused === f.key ? T.teal : T.dim }}>
                      <Icon path={f.icon} />
                    </span>
                    <input
                      type={isPass && show ? "text" : f.type}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      onFocus={() => setFocused(f.key)}
                      onBlur={() => setFocused("")}
                      onKeyDown={handleKeyDown}
                      style={{ ...s.input, paddingRight: isPass ? 44 : 0 }}
                    />
                    {isPass && (
                      <button
                        tabIndex={-1}
                        onClick={() => setShowPass(p => ({ ...p, [f.key]: !p[f.key] }))}
                        style={{ ...s.eyeBtn, color: show ? T.teal : T.dim }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {show
                            ? <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
                            : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          }
                        </svg>
                      </button>
                    )}
                  </div>
                  {/* Password match hint */}
                  {f.key === "confirm" && form.confirm && form.password !== form.confirm && (
                    <p style={{ fontSize: 11, color: T.red, marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>
              );
            })}
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
            style={{ ...s.btn, marginTop: 20, opacity: (!valid || loading) ? 0.5 : 1, cursor: (!valid || loading) ? "not-allowed" : "pointer" }}
            disabled={!valid || loading}
            onClick={handleSubmit}
          >
            {loading ? "Submitting..." : "Submit Application →"}
          </button>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.muted }}>
            Already have an account?{" "}
            <span style={{ color: T.teal, fontWeight: 600, cursor: "pointer" }}
              onClick={() => navigate("/login?role=recruiter")}>
              Sign in
            </span>
          </p>

          <button style={s.backBtn} onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  * { box-sizing: border-box; }
  input::placeholder { color: #7aacba; }
`;

const s = {
  root:       { display: "flex", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: T.bg, color: T.text },
  leftPanel:  { width: "42%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 36px", position: "relative", overflow: "hidden", background: "linear-gradient(145deg, #2BB1A8 0%, #1d9e96 50%, #0A2A41 100%)" },
  blob1:      { position: "absolute", top: "-80px", right: "-80px", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" },
  blob2:      { position: "absolute", bottom: "-100px", left: "-60px", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" },
  logoMark:   { width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  brandName:  { color: "#fff", fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" },
  brandTagline: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  pill:       { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, padding: "6px 14px", color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 500 },
  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", background: T.lightCyan, overflowY: "auto" },
  portalBadge: { display: "inline-flex", alignItems: "center", gap: 6, background: "#d9f2f4", border: "1px solid rgba(43,177,168,0.3)", borderRadius: 100, padding: "5px 14px" },
  heading:    { fontSize: 26, fontWeight: 800, color: T.navy, letterSpacing: "-0.5px", margin: "0 0 6px" },
  subheading: { fontSize: 13, color: T.muted, margin: "0 0 22px", lineHeight: 1.5 },
  label:      { fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 5, display: "block", letterSpacing: "0.2px" },
  inputWrap:  { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid", borderRadius: 10, padding: "0 14px", transition: "border-color 0.2s, box-shadow 0.2s", position: "relative" },
  inputIcon:  { display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.2s" },
  input:      { flex: 1, padding: "12px 0", border: "none", background: "transparent", color: T.text, outline: "none", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  eyeBtn:     { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4, position: "absolute", right: 12, transition: "color 0.2s" },
  errorBox:   { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.red, background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "10px 14px", marginTop: 12, fontWeight: 500 },
  btn:        { width: "100%", padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, #2BB1A8, #1d9e96)`, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 16px rgba(43,177,168,0.35)" },
  backBtn:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, margin: "16px auto 0", padding: "8px 16px", background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  successCard: { background: "#fff", borderRadius: 18, padding: "40px 36px", maxWidth: 420, width: "90%", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 8px 32px rgba(43,177,168,0.12)", border: "1px solid rgba(43,177,168,0.15)" },
  successIcon: { width: 64, height: 64, borderRadius: "50%", background: "#d9f2f4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
};