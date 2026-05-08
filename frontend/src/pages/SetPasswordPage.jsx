// frontend/src/pages/SetPasswordPage.jsx
// Student opens this page from the welcome email link
// URL pattern: /set-password?token=xxx  OR  /set-password (token from localStorage)
// Flow: Enter new password → API call → redirect to student login

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = (() => {
  try { return import.meta.env?.VITE_API_URL || "http://localhost:5000"; }
  catch { return "http://localhost:5000"; }
})();

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters",     pass: password.length >= 8 },
    { label: "Uppercase letter",  pass: /[A-Z]/.test(password) },
    { label: "Number",            pass: /\d/.test(password) },
    { label: "Special character", pass: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 1 ? "#ef4444" : score === 2 ? "#f59e0b" : score === 3 ? "#3b82f6" : "#16a34a";
  const label = ["Weak", "Weak", "Fair", "Good", "Strong"][score];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? color : "#e2e8f0", transition: "background .3s" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: 10, color: c.pass ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11 }}>{c.pass ? "✓" : "○"}</span> {c.label}
            </span>
          ))}
        </div>
        {password && <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();
  const token                = searchParams.get("token") || localStorage.getItem("student_token") || localStorage.getItem("token");

  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [showCf,     setShowCf]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    // Try to decode name from token (if JWT, decode the payload)
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setStudentName(payload.name || payload.full_name || "");
      }
    } catch {}
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/students/set-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to set password. Please try again."); setLoading(false); return; }
      setSuccess(true);
      // Clear old token; redirect after 2 seconds
      setTimeout(() => { localStorage.removeItem("student_token"); navigate("/student-login"); }, 2500);
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  if (!token) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: "#dc2626", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Invalid Link</h2>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
            This set-password link is invalid or has expired. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: "#16a34a", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Password Set!</h2>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, marginBottom: 0 }}>
            Your password has been updated successfully.<br />
            Redirecting you to the login page…
          </p>
          <div style={{ marginTop: 16, height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#16a34a", animation: "fill 2.5s linear forwards", borderRadius: 2 }} />
          </div>
          <style>{`@keyframes fill { from { width: 0%; } to { width: 100%; } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
      `}</style>

      <div style={card}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>
            🎓
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>NeuroAssess Student Portal</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 6px", letterSpacing: "-.3px" }}>
            Set Your Password
          </h1>
          {studentName && (
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Welcome, <strong style={{ color: "#1e293b" }}>{studentName}</strong>! Choose a strong password to secure your account.
            </p>
          )}
          {!studentName && (
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Create a new password to access your student account.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* New Password */}
          <div>
            <label style={lbl}>New Password *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Create a strong password"
                style={{ ...inp(!!error && !confirm), paddingRight: 56, transition: "all .15s" }}
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={lbl}>Confirm Password *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCf ? "text" : "password"}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="Re-enter your password"
                style={{ ...inp(!!error && confirm && confirm !== password), paddingRight: 56, transition: "all .15s" }}
              />
              <button type="button" onClick={() => setShowCf(v => !v)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
                {showCf ? "Hide" : "Show"}
              </button>
            </div>
            {confirm && password !== confirm && (
              <span style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "block" }}>Passwords do not match</span>
            )}
            {confirm && password === confirm && confirm.length >= 8 && (
              <span style={{ fontSize: 11, color: "#16a34a", marginTop: 4, display: "block" }}>✓ Passwords match</span>
            )}
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading || !password || !confirm}
            style={{ padding: "12px", borderRadius: 10, border: "none", background: loading || !password || !confirm ? "#93c5fd" : "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !password || !confirm ? "not-allowed" : "pointer", letterSpacing: ".2px", transition: "opacity .15s" }}>
            {loading ? "Setting Password…" : "Set Password & Continue →"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          Having trouble? Contact your administrator for a new invite link.
        </p>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const page = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg,#eef2f7 0%,#e0e7ff 100%)", padding: "24px 16px",
  fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
};
const card = {
  background: "#fff", borderRadius: 20, padding: "40px 36px",
  maxWidth: 440, width: "100%",
  boxShadow: "0 8px 40px rgba(30,58,138,.12), 0 2px 12px rgba(0,0,0,.06)",
  animation: "fadeUp .35s cubic-bezier(.22,1,.36,1)",
};
const lbl = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .7, marginBottom: 6, display: "block" };
const inp = (err) => ({
  width: "100%", padding: "10px 14px", borderRadius: 9, fontSize: 13,
  border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
  outline: "none", fontFamily: "inherit", color: "#1e293b",
  background: err ? "#fff5f5" : "#fff", boxSizing: "border-box",
});