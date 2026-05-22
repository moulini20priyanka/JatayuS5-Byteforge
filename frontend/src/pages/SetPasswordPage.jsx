
import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";

const API_URL = (() => {
  try { return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'; }
  catch { return (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net'); }
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
              <span>{c.pass ? "✓" : "○"}</span> {c.label}
            </span>
          ))}
        </div>
        {password && <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>}
      </div>
    </div>
  );
}

/* ── Toggle-visibility input ─────────────────────────────────────────────────── */
function PwInput({ value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: "100%", padding: "11px 48px 11px 14px", borderRadius: 9, fontSize: 13,
          border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit",
          color: "#1e293b", background: "#fff", boxSizing: "border-box",
          transition: "border-color .15s",
        }}
        onFocus={e => e.target.style.borderColor = "#2563eb"}
        onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
      />
      <button type="button" onClick={() => setShow(v => !v)}
        style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function SetPasswordPage() {
  const navigate = useNavigate();

  // Grab token + student info from localStorage (set by login flow)
  const token       = localStorage.getItem("student_token") || localStorage.getItem("token") || "";
  const storedName  = localStorage.getItem("user_name")  || "";
  const storedEmail = localStorage.getItem("user_email") || "";

  const [tempPassword, setTempPassword] = useState("");
  const [newPassword,  setNewPassword]  = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [studentName,  setStudentName]  = useState(storedName);

  // Try to decode name from JWT if not in localStorage
  useEffect(() => {
    if (!studentName && token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setStudentName(payload.name || payload.full_name || "");
      } catch {}
    }
  }, [token, studentName]);

  // If no token, redirect to login
  useEffect(() => {
    if (!token) navigate("/login?role=student", { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!tempPassword) { setError("Please enter your temporary password from the welcome email."); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirm)  { setError("New passwords do not match."); return; }
    if (newPassword === tempPassword) { setError("New password must be different from your temporary password."); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/candidates/set-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ currentPassword: tempPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to set password. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to dashboard after 2.5 seconds
      setTimeout(() => navigate("/student-dashboard", { replace: true }), 2500);
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", margin: "0 0 10px" }}>Password Set Successfully!</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
              Your account is now fully set up.<br/>
              Redirecting you to your dashboard…
            </p>
            <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#16a34a", animation: "progressFill 2.5s linear forwards", borderRadius: 2 }} />
            </div>
            <style>{`@keyframes progressFill { from { width: 0; } to { width: 100%; } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      <div style={card}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 26 }}>
            🎓
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>NeuroAssess Student Portal</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 8px", letterSpacing: "-.3px" }}>
            Set Your Password
          </h1>
          {studentName && (
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              Welcome, <strong style={{ color: "#1e293b" }}>{studentName}</strong>!<br/>
              Check your email for the temporary password and set a new one below.
            </p>
          )}
          {!studentName && storedEmail && (
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Account: <strong style={{ color: "#1e293b" }}>{storedEmail}</strong>
            </p>
          )}
        </div>

        {/* Info callout */}
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b", borderRadius: 8, padding: "12px 14px", marginBottom: 24, fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
          <strong>📧 Check your email</strong> — Your welcome email contains a temporary password.
          Enter it below along with your new password. This is a one-time step.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Temporary password */}
          <div>
            <label style={lbl}>Temporary Password (from welcome email) *</label>
            <PwInput
              value={tempPassword}
              onChange={e => { setTempPassword(e.target.value); setError(""); }}
              placeholder="Enter the temp password from your email"
              autoFocus
            />
          </div>

          <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .7, marginBottom: 14 }}>
              Create Your New Password
            </div>

            {/* New password */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>New Password *</label>
              <PwInput
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(""); }}
                placeholder="Create a strong password"
              />
              {newPassword && <PasswordStrength password={newPassword} />}
            </div>

            {/* Confirm password */}
            <div>
              <label style={lbl}>Confirm New Password *</label>
              <PwInput
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="Re-enter your new password"
              />
              {confirm && newPassword !== confirm && (
                <span style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "block" }}>Passwords do not match</span>
              )}
              {confirm && newPassword === confirm && confirm.length >= 8 && (
                <span style={{ fontSize: 11, color: "#16a34a", marginTop: 4, display: "block" }}>✓ Passwords match</span>
              )}
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !tempPassword || !newPassword || !confirm}
            style={{
              padding: "13px", borderRadius: 10, border: "none",
              background: (loading || !tempPassword || !newPassword || !confirm)
                ? "#cbd5e1"
                : "linear-gradient(135deg,#1e3a8a,#2563eb)",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor:
                (loading || !tempPassword || !newPassword || !confirm) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {loading
              ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Setting password…</>
              : "Confirm & Enter Dashboard →"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
          Didn't receive the email? Contact your administrator to resend it.<br/>
          Your registered email: <strong>{storedEmail}</strong>
        </p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 50%,#e0e7ff 100%)",
  padding: "24px 16px", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
};
const card = {
  background: "#fff", borderRadius: 20, padding: "40px 36px",
  maxWidth: 460, width: "100%",
  boxShadow: "0 8px 40px rgba(30,58,138,.14), 0 2px 12px rgba(0,0,0,.06)",
  animation: "fadeUp .35s cubic-bezier(.22,1,.36,1)",
};
const lbl = {
  fontSize: 11, fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: .7, marginBottom: 6, display: "block",
};


