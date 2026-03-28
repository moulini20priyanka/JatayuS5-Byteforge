import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ExamKeyVerification() {
  const navigate = useNavigate();
  const location = useLocation();

  const { exam, locationGranted, initialCoords, isUniversity } = location.state || {};

  const [examKey, setExamKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [shake,   setShake]   = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examKey.trim()) { setError("Please enter exam key"); triggerShake(); return; }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // University uses its own validate endpoint that returns the full paper
      const endpoint = isUniversity
        ? "http://localhost:5000/api/exams/university/validate-key"
        : "http://localhost:5000/api/exams/validate-key";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ exam_key: examKey.trim() }),
      });

      const data = await response.json();
      console.log("[validate-key response]", data);

      if (response.ok && data.valid) {
        // University → /university-exam, Hiring → /exam
        const destination = isUniversity ? "/university-exam" : "/exam";

        navigate(destination, {
          state: {
            examData: isUniversity ? data : undefined,  // full paper for university
            exam: isUniversity ? undefined : {
              ...(exam || {}),
              id:               data.exam_id,
              assignment_id:    data.assignment_id,
              title:            data.title,
              duration_minutes: data.duration,
              exam_type:        data.exam_type,
              sections:         data.sections,
            },
            examKey:         examKey.trim(),
            locationGranted: locationGranted || false,
            initialCoords:   initialCoords   || null,
          },
        });
      } else {
        setError(data.error || data.message || "Invalid exam key. Please check and try again.");
        triggerShake();
      }
    } catch (err) {
      console.error("[ExamKeyVerification]", err);
      setError("Unable to connect to server. Please try again later.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !loading) handleSubmit(e); };

  const s = {
    page: { minHeight:"100vh", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", fontFamily:"system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" },
    card: { maxWidth:"480px", width:"100%", background:"#fff", borderRadius:"1.5rem", boxShadow:"0 20px 35px -10px rgba(0,0,0,0.1),0 1px 3px rgba(0,0,0,0.05)", padding:"2rem 1.75rem", animation: shake ? "shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both" : "none" },
    title: { fontSize:"1.8rem", fontWeight:"700", margin:"0 0 0.5rem 0", color:"#111827", display:"flex", alignItems:"center", gap:"0.5rem", justifyContent:"center", letterSpacing:"-0.02em" },
    subtitle: { fontSize:"0.9rem", color:"#6b7280", textAlign:"center", marginBottom:"2rem", lineHeight:"1.5" },
    badgeRow: { display:"flex", justifyContent:"center", gap:"8px", flexWrap:"wrap", marginBottom:"1.5rem" },
    badge: { fontSize:"11px", fontWeight:"700", background:"#d4f0e8", color:"#0a7c5c", border:"1px solid rgba(10,124,92,0.2)", borderRadius:"100px", padding:"4px 12px", display:"flex", alignItems:"center", gap:"5px", fontFamily:"monospace" },
    inputGroup: { marginBottom:"1.5rem" },
    inputWrapper: { position:"relative", display:"flex", alignItems:"center" },
    lockIcon: { position:"absolute", left:"1rem", color:"#9ca3af", width:"20px", height:"20px", pointerEvents:"none" },
    input: { width:"100%", padding:"0.9rem 1rem 0.9rem 2.75rem", fontSize:"1rem", border:`1.5px solid ${error?"#dc2626":"#e5e7eb"}`, borderRadius:"1rem", outline:"none", transition:"all 0.2s ease", fontFamily:"inherit", backgroundColor:"#fff", color:"#1f2937", boxSizing:"border-box" },
    errorMsg: { color:"#dc2626", fontSize:"0.8rem", marginTop:"0.5rem", marginLeft:"0.25rem", fontWeight:"500", display:"flex", alignItems:"center", gap:"0.25rem" },
    btn: { width:"100%", padding:"0.9rem", backgroundColor:"#2563eb", color:"#fff", border:"none", borderRadius:"1rem", fontSize:"1rem", fontWeight:"600", cursor:"pointer", transition:"all 0.2s ease", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", marginTop:"0.5rem" },
    btnDisabled: { backgroundColor:"#93c5fd", cursor:"not-allowed" },
    spinner: { width:"18px", height:"18px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.6s linear infinite" },
    footer: { marginTop:"1.5rem", fontSize:"0.7rem", textAlign:"center", color:"#9ca3af", borderTop:"1px solid #f3f4f6", paddingTop:"1rem" },
  };

  return (
    <>
      <style>{`
        @keyframes shake { 10%,90%{transform:translateX(-1px)} 20%,80%{transform:translateX(2px)} 30%,50%,70%{transform:translateX(-3px)} 40%,60%{transform:translateX(3px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}><span>🔐</span> Enter Exam Key</h1>
          <p style={s.subtitle}>
            {isUniversity
              ? "Enter the exam key sent to your university email to begin your paper."
              : "Enter the exam key sent to your registered email to start your assessment."}
          </p>

          {locationGranted && (
            <div style={s.badgeRow}>
              {["Rules Read", "Oath Signed", "GPS Verified"].map(tag => (
                <span key={tag} style={s.badge}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={s.inputGroup}>
              <div style={s.inputWrapper}>
                <svg style={s.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="text"
                  value={examKey}
                  onChange={e => { setExamKey(e.target.value); if (error) setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder={isUniversity ? "e.g. UNI-XXXXXXXXXX" : "Enter your exam key from email"}
                  style={s.input}
                  onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor=error?"#dc2626":"#e5e7eb"; e.target.style.boxShadow="none"; }}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <div style={s.errorMsg}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor="#1d4ed8"; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 12px rgba(37,99,235,0.25)"; }}}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.backgroundColor="#2563eb"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}}
            >
              {loading
                ? <><div style={s.spinner}/> Verifying...</>
                : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Verify &amp; Start Exam</>
              }
            </button>
          </form>
          <div style={s.footer}>Secure verification • Exam session is encrypted</div>
        </div>
      </div>
    </>
  );
}