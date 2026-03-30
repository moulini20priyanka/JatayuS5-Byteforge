// frontend/src/components/certExam/CertSelect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LIVE_CERTS = [
  {
    id: "oracle-java",
    name: "Oracle Certified Professional",
    subtitle: "Java SE 17 Developer",
    org: "Oracle",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#ea580c",
    logo: (
      <svg width={28} height={28} viewBox="0 0 100 100">
        <ellipse cx="50" cy="50" rx="44" ry="28" fill="none" stroke="#ea580c" strokeWidth="10" />
      </svg>
    ),
  },
  {
    id: "aws-saa",
    name: "AWS Solutions Architect",
    subtitle: "Associate Level",
    org: "AWS",
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#3b82f6",
    logo: (
      <svg width={32} height={18} viewBox="0 0 100 55">
        <text x="2" y="42" fontSize="36" fontWeight="800" fill="#f59e0b" fontFamily="Arial">
          AWS
        </text>
      </svg>
    ),
  },
  {
    id: "gcp-ace",
    name: "Google Cloud Associate",
    subtitle: "Cloud Engineer",
    org: "GCP",
    color: "#1967d2",
    bg: "#dbeafe",
    border: "#4285f4",
    logo: (
      <svg width={28} height={28} viewBox="0 0 100 100">
        <path d="M50 20 L80 80 L20 80 Z" fill="none" stroke="#4285f4" strokeWidth="8" />
        <circle cx="50" cy="20" r="8" fill="#ea4335" />
        <circle cx="80" cy="80" r="8" fill="#fbbc05" />
        <circle cx="20" cy="80" r="8" fill="#34a853" />
      </svg>
    ),
  },
];

export default function CertSelect({ onNext }) {
  const [selected, setSelected] = useState(null);
  const [certName, setCertName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNext = () => {
    if (!selected) return setError("Please select a certification.");
    if (!certName.trim()) return setError("Please enter the certification name.");
    setError("");
    onNext({ ...selected, certName: certName.trim() });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate("/student-certifications")}>
            ← Back
          </button>
          <div style={styles.stepBadge}>Step 1 of 4</div>
        </div>

        <h1 style={styles.title}>Select Certification Exam</h1>
        <p style={styles.sub}>Choose a live certification and confirm the exam name</p>

        {/* Cert Cards */}
        <div style={styles.certGrid}>
          {LIVE_CERTS.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelected(c);
                setCertName(c.name + " - " + c.subtitle);
                setError("");
              }}
              style={{
                ...styles.certCard,
                borderColor: selected?.id === c.id ? c.border : "#e2e8f0",
                background: selected?.id === c.id ? c.bg : "#fff",
                boxShadow: selected?.id === c.id ? `0 0 0 3px ${c.border}33` : "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div style={styles.certCardTop}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ ...styles.orgLogo, background: selected?.id === c.id ? c.bg : "#f8fafc" }}>
                    {c.logo}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.subtitle}</div>
                  </div>
                </div>
                <div
                  style={{
                    ...styles.radioCircle,
                    borderColor: selected?.id === c.id ? c.border : "#cbd5e1",
                    background: selected?.id === c.id ? c.border : "transparent",
                  }}
                >
                  {selected?.id === c.id && <div style={styles.radioDot} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cert Name Input */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Certification Name (Confirm)</label>
          <input
            style={styles.input}
            value={certName}
            onChange={(e) => { setCertName(e.target.value); setError(""); }}
            placeholder="e.g. AWS Certified Solutions Architect – Associate"
          />
          <p style={styles.hint}>MCQ questions will be generated strictly based on this name.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          style={{ ...styles.nextBtn, opacity: !selected || !certName.trim() ? 0.5 : 1 }}
          onClick={handleNext}
        >
          Continue to Identity Verification →
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 40px",
    maxWidth: 580,
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  backBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600 },
  stepBadge: { background: "#f0f9ff", color: "#0284c7", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: "1px solid #bae6fd" },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 24 },
  certGrid: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 },
  certCard: { border: "2px solid", borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" },
  certCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  orgLogo: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  radioCircle: { width: 20, height: 20, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  radioDot: { width: 8, height: 8, borderRadius: "50%", background: "#fff" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.5px", display: "block", marginBottom: 8 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  error: { background: "#fef2f2", color: "#dc2626", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 16, border: "1px solid #fecaca" },
  nextBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" },
};
