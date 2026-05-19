import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const BASE_URL = (() => {
  try {
    return (
      import.meta.env?.VITE_API_URL ||
      (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
      (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net')
    );
  } catch {
    return (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net');
  }
})();

export default function ExamKeyVerification() {
  const navigate = useNavigate();

  // ── Safe location state (never crashes if state is null) ─────────
  const location = useLocation();
  const state = location.state || {};
  const {
    exam            = null,
    locationGranted = false,
    initialCoords   = null,
    geoSessionId    = null,
    isUniversity    = false,
  } = state;

  const [examKey, setExamKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [shake,   setShake]   = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const key = examKey.trim();
    if (!key) { setError("Please enter your exam key."); triggerShake(); return; }

    setLoading(true);
    setError("");

    try {
      const token    = localStorage.getItem("token") || "";
      const endpoint = isUniversity
        ? `${BASE_URL}/api/exams/university/validate-key`
        : `${BASE_URL}/api/exams/validate-key`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ exam_key: key }),
      });

      const data = await response.json();
      console.log("[ExamKeyVerification] response:", data);

      if (response.ok && data.valid) {
        const destination = isUniversity ? "/university-exam" : "/exam";
        navigate(destination, {
          state: {
            examData: isUniversity ? data : undefined,
            exam: isUniversity
              ? undefined
              : {
                  ...(exam || {}),
                  id:               data.exam_id,
                  assignment_id:    data.assignment_id,
                  title:            data.title,
                  duration_minutes: data.duration,
                  exam_type:        data.exam_type,
                  sections:         data.sections,
                },
            examKey:         key,
            locationGranted: locationGranted,
            initialCoords:   initialCoords,
            geoSessionId:    geoSessionId,
          },
        });
      } else {
        setError(data.error || data.message || "Invalid exam key. Please check and try again.");
        triggerShake();
      }
    } catch (err) {
      console.error("[ExamKeyVerification] fetch error:", err);
      setError("Unable to connect to server. Please check your connection.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const C = {
    accent:  "#2563eb",
    green:   "#16a34a",
    greenLt: "#dcfce7",
    red:     "#dc2626",
    text:    "#1e293b",
    muted:   "#64748b",
    dim:     "#94a3b8",
    border:  "#e2e8f0",
    surface: "#ffffff",
  };

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        html,body,#root{min-height:100vh;margin:0;padding:0;}
        body{
          background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 50%,#93c5fd 100%) !important;
          font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
        }
        @keyframes shake{
          10%,90%{transform:translateX(-2px)}
          20%,80%{transform:translateX(3px)}
          30%,50%,70%{transform:translateX(-4px)}
          40%,60%{transform:translateX(4px)}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }
        .ekv-card{animation:slideUp 0.4s cubic-bezier(0.22,1,0.36,1);}
        .ekv-card.shake{animation:shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both;}
        .ekv-input:focus{
          border-color:#2563eb !important;
          box-shadow:0 0 0 3px rgba(37,99,235,0.12) !important;
          outline:none;
        }
        .ekv-btn:hover:not(:disabled){
          background:#1d4ed8 !important;
          transform:translateY(-1px);
          box-shadow:0 6px 16px rgba(37,99,235,0.3) !important;
        }
        .ekv-btn:active:not(:disabled){transform:translateY(0);}
      `}</style>

      <div style={{
        minHeight:"100vh",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        padding:"24px 16px",
      }}>
        <div
          className={`ekv-card${shake ? " shake" : ""}`}
          style={{
            width:"100%", maxWidth:460,
            background:C.surface,
            borderRadius:20,
            boxShadow:"0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
            padding:"36px 32px",
          }}
        >
          {/* Lock icon */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
            <div style={{
              width:56,height:56,borderRadius:16,
              background:"linear-gradient(135deg,#3b82f6,#2563eb)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:26,
              boxShadow:"0 8px 20px rgba(59,130,246,0.35)",
            }}>
              🔐
            </div>
          </div>

          {/* Title */}
          <h1 style={{
            margin:"0 0 8px",fontSize:26,fontWeight:800,
            color:C.text,textAlign:"center",letterSpacing:"-0.5px",
          }}>
            Enter Exam Key
          </h1>
          <p style={{
            margin:"0 0 24px",fontSize:14,color:C.muted,
            textAlign:"center",lineHeight:1.65,
          }}>
            {isUniversity
              ? "Enter the exam key sent to your university email to begin your paper."
              : "Enter the exam key sent to your registered email to start your assessment."}
          </p>

          {/* Status badges */}
          <div style={{
            display:"flex",flexWrap:"wrap",gap:8,
            justifyContent:"center",marginBottom:24,
          }}>
            {["✓ Rules Read","✓ GPS Verified","✓ ID Verified"].map((label) => (
              <span key={label} style={{
                fontSize:11,fontWeight:700,padding:"4px 12px",
                borderRadius:100,background:C.greenLt,
                color:C.green,border:"1px solid #bbf7d0",
              }}>
                {label}
              </span>
            ))}
          </div>

          {/* Exam name chip */}
          {(exam?.title || exam?.exam) && (
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              background:"#f8fafc",border:`1px solid ${C.border}`,
              borderRadius:10,padding:"10px 14px",marginBottom:22,
            }}>
              <span style={{fontSize:20}}>📋</span>
              <div>
                <div style={{
                  fontSize:10,color:C.dim,fontWeight:700,
                  letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:2,
                }}>
                  Assessment
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                  {exam?.title || exam?.exam}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <label style={{
              display:"block",fontSize:12,fontWeight:700,
              color:C.text,marginBottom:8,letterSpacing:"0.3px",
            }}>
              Exam Access Key
            </label>

            <div style={{position:"relative",marginBottom: error ? 8 : 20}}>
              <svg
                style={{
                  position:"absolute",left:14,top:"50%",
                  transform:"translateY(-50%)",color:C.dim,pointerEvents:"none",
                }}
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                className="ekv-input"
                type="text"
                value={examKey}
                onChange={(e) => { setExamKey(e.target.value.toUpperCase()); if (error) setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSubmit(e); }}
                placeholder={isUniversity ? "e.g. UNI-XXXXXXXXXX" : "e.g. EXAM-XXXXXXXXXX"}
                disabled={loading}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                style={{
                  width:"100%",
                  padding:"13px 14px 13px 42px",
                  fontSize:15,
                  fontFamily:"'Courier New',Courier,monospace",
                  fontWeight:600,
                  letterSpacing:"0.08em",
                  color:C.text,
                  background:"#f8fafc",
                  border:`2px solid ${error ? C.red : C.border}`,
                  borderRadius:12,
                  transition:"border-color 0.2s,box-shadow 0.2s",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display:"flex",alignItems:"center",gap:6,
                fontSize:12,fontWeight:600,color:C.red,
                marginBottom:16,padding:"8px 12px",
                background:"#fef2f2",border:"1px solid #fecaca",
                borderRadius:8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="ekv-btn"
              style={{
                width:"100%",
                padding:"14px",
                fontSize:15,
                fontWeight:700,
                color:"#fff",
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#3b82f6,#2563eb)",
                border:"none",
                borderRadius:12,
                cursor: loading ? "not-allowed" : "pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                transition:"all 0.2s ease",
                boxShadow: loading ? "none" : "0 4px 12px rgba(59,130,246,0.3)",
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width:18,height:18,
                    border:"2.5px solid rgba(255,255,255,0.35)",
                    borderTopColor:"#fff",
                    borderRadius:"50%",
                    animation:"spin 0.7s linear infinite",
                  }}/>
                  Verifying Key…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Verify &amp; Enter Exam
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{
            margin:"20px 0 0",fontSize:11,textAlign:"center",
            color:C.dim,borderTop:`1px solid ${C.border}`,paddingTop:16,
          }}>
             Secure key verification &nbsp;·&nbsp; Session is encrypted &nbsp;·&nbsp; AI Proctoring Active
          </p>
        </div>
      </div>
    </>
  );
}
