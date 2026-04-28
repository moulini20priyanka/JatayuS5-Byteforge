import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const T = {
  bg:          "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)",
  lightBlue:   "#eff6ff",
  surface:     "#ffffff",
  border:      "rgba(59,130,246,0.2)",
  borderFocus: "rgba(59,130,246,0.5)",
  accent:      "#3b82f6",
  accentEnd:   "#2563eb",
  accentLight: "#dbeafe",
  navy:        "#1e3a8a",
  muted:       "#475569",
  dim:         "#94a3b8",
  green:       "#16a34a",
  greenBg:     "#f0fdf4",
  greenBorder: "#bbf7d0",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
};

export default function ResumeUpload() {
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [status, setStatus]           = useState("idle");
  const [errorMsg, setErrorMsg]       = useState("");
  const [agentProgress, setAgentProgress]   = useState({});

  const fileInputRef = useRef();
  const navigate     = useNavigate();
  const location     = useLocation();
  const examState    = location.state?.exam;
  const studentId    = localStorage.getItem("student_id") || "student_001";

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setErrorMsg("Only PDF files are accepted.");
      setStatus("error");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("File size must be under 5MB.");
      setStatus("error");
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg("Please upload a resume to continue.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setAgentProgress({});

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("candidate_id", studentId);

    const saved = localStorage.getItem("test_scores");
    if (saved) formData.append("test_scores", saved);

    try {
      const response = await fetch("http://localhost:5000/api/evaluate", {
        method: "POST",
        body:   formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      setStatus("analyzing");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setAgentProgress(prev => ({
                ...prev,
                [event.agent]: { status: event.status, message: event.message },
              }));
            }
            if (event.type === "complete") {
              localStorage.setItem(`report_${studentId}`, JSON.stringify(event.data));
              setStatus("success");
              setTimeout(() => navigate("/verify-exam-key", {
                state: { exam: examState, isUniversity: false }
              }), 2000);
            }
            if (event.type === "error") throw new Error(event.message);
          } catch {}
        }
      }
    } catch (err) {
      // Fallback to old upload endpoint
      try {
        const fallbackForm = new FormData();
        fallbackForm.append("resume", file);
        fallbackForm.append("student_id", studentId);
        const res = await fetch("http://localhost:5000/api/upload-resume", {
          method: "POST", body: fallbackForm,
        });
        if (!res.ok) throw new Error("Upload failed");
        setStatus("success");
        setTimeout(() => navigate("/verify-exam-key", {
          state: { exam: examState, isUniversity: false }
        }), 2000);
      } catch {
        setErrorMsg(err.message || "Upload failed. Please try again.");
        setStatus("error");
      }
    }
  };

  const AGENT_LABELS = {
    resume: "Resume parser", github: "GitHub",
    leetcode: "LeetCode", linkedin: "LinkedIn",
    inference: "Cross-check", decision: "Decision engine", persist: "Saving",
  };
  const AGENT_ORDER = ["resume","github","leetcode","linkedin","inference","decision","persist"];
  const activeAgents = AGENT_ORDER.filter(a => agentProgress[a]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={styles.page}>
        <div style={styles.blob1} />
        <div style={styles.blob2} />

        <div style={styles.wrapper}>
          {/* Left panel */}
          <div style={styles.leftPanel}>
            <div style={styles.leftInner}>
              <div style={styles.logoMark}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 2L26 8v12L14 26 2 20V8L14 2z" fill="rgba(255,255,255,0.9)"/>
                  <path d="M14 7l8 4v6l-8 4-8-4v-6l8-4z" fill="rgba(59,130,246,0.6)"/>
                  <circle cx="14" cy="14" r="3" fill="white"/>
                </svg>
              </div>
              <div style={styles.brandName}>NeuroAssess</div>
              <div style={styles.brandTagline}>Candidate Assessment</div>

              <div style={{ margin: "32px 0", opacity: 0.9 }}>
                <svg viewBox="0 0 280 220" fill="none" style={{ width: "100%", maxWidth: 260 }}>
                  <rect x="40" y="30" width="200" height="140" rx="16" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                  <rect x="40" y="30" width="200" height="36" rx="16" fill="rgba(255,255,255,0.2)"/>
                  <circle cx="64" cy="48" r="8" fill="rgba(255,255,255,0.5)"/>
                  <rect x="80" y="44" width="80" height="8" rx="4" fill="rgba(255,255,255,0.4)"/>
                  <rect x="60" y="82" width="160" height="10" rx="5" fill="rgba(255,255,255,0.25)"/>
                  <rect x="60" y="100" width="120" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
                  <rect x="60" y="118" width="140" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
                  <rect x="60" y="136" width="100" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
                  <circle cx="200" cy="155" r="28" fill="#3b82f6" opacity="0.9"/>
                  <path d="M188 155l8 8 14-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div style={styles.pills}>
                {["Secure Upload", "AI Analysis", "Privacy First"].map(f => (
                  <div key={f} style={styles.pill}>
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
          <div style={styles.rightPanel}>
            <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp 0.5s ease" }}>

              <div style={styles.stepBadge}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent }} />
                <span>Step 2 of 5 — Resume Upload</span>
              </div>

              <h1 style={styles.title}>Upload Your Resume</h1>
              <p style={styles.subtitle}>
                We'll analyze your resume in the background while you take the test. 
                This does not affect your exam time.
              </p>

              {/* Drop zone */}
              <div
                style={{
                  ...styles.dropzone,
                  ...(dragging ? styles.dropzoneDragging : {}),
                  ...(file    ? styles.dropzoneFile     : {}),
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])} />

                {file ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                    <div style={{ color: T.green, fontWeight: 700, fontSize: 15 }}>{file.name}</div>
                    <div style={{ color: T.accent, fontSize: 13, marginTop: 4 }}>
                      {(file.size / 1024).toFixed(1)} KB — Ready to upload
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ marginBottom: 12, color: T.dim }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p style={{ color: T.navy, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                      Drag & drop your resume here
                    </p>
                    <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>
                      or click to browse — PDF only, max 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Agent progress panel */}
              {status === "analyzing" && activeAgents.length > 0 && (
                <div style={styles.progressPanel}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                    Analyzing resume…
                  </div>
                  {activeAgents.map(agent => {
                    const d = agentProgress[agent];
                    const icon = d?.status === "done" ? "✓" : d?.status === "failed" ? "✗" : "…";
                    const color = d?.status === "done" ? T.green : d?.status === "failed" ? T.red : T.accent;
                    return (
                      <div key={agent} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "5px 0", borderBottom: `1px solid ${T.border}`,
                        fontSize: 12,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: color + "22",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color, fontWeight: 700, fontSize: 10, flexShrink: 0,
                        }}>{icon}</span>
                        <span style={{ color: T.navy, fontWeight: 600, minWidth: 100 }}>
                          {AGENT_LABELS[agent] || agent}
                        </span>
                        <span style={{ color: T.muted, fontSize: 11, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d?.message || ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info cards */}
              <div style={styles.infoRow}>
                {[
                  { icon: "🔒", label: "Secure",     desc: "End-to-end encrypted" },
                  { icon: "🤖", label: "AI Powered",  desc: "Smart analysis"       },
                  { icon: "⚡", label: "Fast",        desc: "Real-time processing" },
                ].map(item => (
                  <div key={item.label} style={styles.infoCard}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ color: T.navy, fontSize: 12, fontWeight: 700 }}>{item.label}</span>
                    <span style={{ color: T.dim, fontSize: 11, textAlign: "center" }}>{item.desc}</span>
                  </div>
                ))}
              </div>

              {status === "error" && (
                <div style={styles.errorBox}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {errorMsg}
                </div>
              )}
              {status === "success" && (
                <div style={styles.successBox}>
                  ✅ Analysis complete! Redirecting to verification...
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <button
                  style={{
                    ...styles.uploadBtn,
                    ...((!file) || status === "uploading" || status === "analyzing"
                      ? styles.uploadBtnDisabled : {}),
                  }}
                  onClick={handleUpload}
                  disabled={
                    !file || status === "uploading" || status === "analyzing" || status === "success"
                  }
                >
                  {status === "uploading" || status === "analyzing" ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={styles.spinner} />
                      {status === "uploading" ? "Uploading…" : "Analyzing…"}
                    </span>
                  ) : "Upload & Continue →"}
                </button>
              </div>

              <p style={{ color: T.dim, fontSize: 12, textAlign: "center", margin: 0 }}>
                🔒 Your resume is used only for profile analysis and not shared directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh", background: T.bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative", overflow: "hidden",
  },
  blob1: { position:"fixed", top:"-80px", right:"-80px", width:320, height:320, borderRadius:"50%", background:"rgba(59,130,246,0.12)", pointerEvents:"none" },
  blob2: { position:"fixed", bottom:"-100px", left:"-60px", width:280, height:280, borderRadius:"50%", background:"rgba(30,58,138,0.06)", pointerEvents:"none" },
  wrapper:   { display:"flex", width:"100%", minHeight:"100vh" },
  leftPanel: {
    width:"42%",
    background:"linear-gradient(145deg, #1e3a8a 0%, #1e40af 40%, #3b82f6 100%)",
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:"48px 40px", position:"relative", overflow:"hidden",
  },
  leftInner:   { position:"relative", zIndex:1, textAlign:"center" },
  logoMark: {
    width:56, height:56, borderRadius:16,
    background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px",
  },
  brandName:    { color:"#fff", fontSize:26, fontWeight:800, letterSpacing:"-0.5px" },
  brandTagline: { color:"rgba(255,255,255,0.65)", fontSize:13, marginTop:4 },
  pills:        { display:"flex", flexDirection:"column", gap:8, alignItems:"center", marginTop:8 },
  pill: {
    display:"inline-flex", alignItems:"center", gap:7,
    background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
    borderRadius:100, padding:"6px 14px",
    color:"rgba(255,255,255,0.9)", fontSize:12, fontWeight:500,
  },
  rightPanel: {
    flex:1, background:T.lightBlue,
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:"48px 40px",
  },
  stepBadge: {
    display:"inline-flex", alignItems:"center", gap:6,
    background:T.accentLight, border:`1px solid ${T.border}`,
    borderRadius:100, padding:"5px 14px",
    fontSize:11, fontWeight:700, color:T.accent, letterSpacing:"0.5px", marginBottom:16,
  },
  title:    { fontSize:28, fontWeight:800, color:T.navy, letterSpacing:"-0.5px", margin:"0 0 8px" },
  subtitle: { fontSize:14, color:T.muted, margin:"0 0 24px", lineHeight:1.6 },
  dropzone: {
    border:`2px dashed ${T.border}`, borderRadius:14, padding:"36px 24px",
    cursor:"pointer", transition:"all 0.2s", background:T.surface, marginBottom:16,
  },
  dropzoneDragging: { border:`2px dashed ${T.accent}`, background:T.accentLight },
  dropzoneFile:     { border:`2px dashed rgba(22,163,74,0.4)`, background:"#f0fdf4" },
  progressPanel: {
    background:T.surface, border:`1px solid ${T.border}`,
    borderRadius:12, padding:"12px 16px", marginBottom:16,
  },
  infoRow:  { display:"flex", gap:10, marginBottom:20 },
  infoCard: {
    flex:1, background:T.surface, border:`1px solid ${T.border}`,
    borderRadius:10, padding:"12px 8px",
    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
  },
  errorBox: {
    display:"flex", alignItems:"center", gap:8, fontSize:13, color:T.red,
    background:T.redBg, border:`1px solid ${T.redBorder}`,
    borderRadius:10, padding:"10px 14px", marginBottom:16, fontWeight:500,
  },
  successBox: {
    fontSize:13, color:T.green, background:T.greenBg,
    border:`1px solid ${T.greenBorder}`,
    borderRadius:10, padding:"10px 14px", marginBottom:16, fontWeight:500,
  },
  uploadBtn: {
    width: "100%",
    background:`linear-gradient(135deg, ${T.accent}, ${T.accentEnd})`,
    border:"none", borderRadius:10, color:"#fff",
    padding:"12px 24px", fontSize:15, fontWeight:700,
    cursor:"pointer", fontFamily:"'Plus Jakarta Sans', sans-serif",
    boxShadow:"0 4px 16px rgba(59, 130, 246, 0.35)",
    transition: "all 0.2s ease",
  },
  uploadBtnDisabled: { opacity:0.5, cursor:"not-allowed" },
  spinner: {
    width:14, height:14, border:"2px solid rgba(255,255,255,0.3)",
    borderTopColor:"#fff", borderRadius:"50%", display:"inline-block",
    animation:"spin 0.8s linear infinite",
  },
};