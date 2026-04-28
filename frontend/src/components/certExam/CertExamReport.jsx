// frontend/src/components/certExam/CertExamReport.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const VIOLATION_LABELS = {
  no_face: "No Face Detected",
  multiple_faces: "Multiple Faces",
  eye_gaze: "Eye Gaze Deviation",
  voice_detected: "Voice Detected",
  tab_switch: "Tab Switch",
  fullscreen_exit: "Fullscreen Exit",
  camera_denied: "Camera Denied",
};

const VIOLATION_SEVERITY = {
  no_face: "high",
  multiple_faces: "high",
  eye_gaze: "medium",
  voice_detected: "medium",
  tab_switch: "high",
  fullscreen_exit: "low",
  camera_denied: "high",
};

const SEVERITY_STYLE = {
  high: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "HIGH" },
  medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "MEDIUM" },
  low: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "LOW" },
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CertExamReport({ reportData, cert, onDone }) {
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const {
    score = 0, correct = 0, totalQuestions = 0,
    violations = [], certName = "", questions = [], answers = {},
    aiReport = {}, timeUsed = 0, autoSubmit = false,
  } = reportData || {};

  const wrong = totalQuestions - correct;
  const passed = score >= 70;
  const violationsByType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});

  // Integrity score: each violation deducts based on severity
  const integrityScore = aiReport.integrityScore ?? (() => {
    const deductions = violations.reduce((total, v) => {
      const sev = VIOLATION_SEVERITY[v.type] || "medium";
      return total + (sev === "high" ? 10 : sev === "medium" ? 4 : 2);
    }, 0);
    return Math.max(0, 100 - deductions);
  })();
  const recommendation = aiReport.recommendation || (passed ? "pass" : "fail");

  const handleDownloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);
    const element = printRef.current;
    if (!element) { setDownloading(false); return; }

    try {
      // Load html2pdf from CDN if not already loaded
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const filename = `${certName.replace(/[^a-z0-9]/gi, "_")}_Exam_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

      const opt = {
        margin:      [8, 8, 8, 8],
        filename,
        image:       { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
      };

      const original = element.style.background;
      element.style.background = "#fff";
      await window.html2pdf().set(opt).from(element).save();
      element.style.background = original;
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to browser print
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={R.page}>
      <div ref={printRef} style={R.container}>
        {/* ─── Header ─── */}
        <div style={{ ...R.header, background: passed ? "linear-gradient(135deg, #0284c7, #0369a1)" : "linear-gradient(135deg, #dc2626, #b91c1c)" }}>
          <div>
            <div style={R.headerBadge}>
              {passed ? "✅ PASSED" : "❌ FAILED"} · {recommendation.toUpperCase()}
            </div>
            <h1 style={R.headerTitle}>Exam Report</h1>
            <p style={R.headerSub}>{certName}</p>
            {autoSubmit && <div style={R.autoSubmitNote}>⚠️ Auto-submitted (time expired)</div>}
          </div>
          <div style={R.scoreCircle}>
            <div style={R.scoreNum}>{score}%</div>
            <div style={R.scoreLabel}>Score</div>
          </div>
        </div>

        {/* ─── Stats Row ─── */}
        <div style={R.statsRow}>
          {[
            { label: "Correct", value: correct, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Wrong", value: wrong, color: "#dc2626", bg: "#fef2f2" },
            { label: "Total Qs", value: totalQuestions, color: "#0284c7", bg: "#eff6ff" },
            { label: "Time Used", value: formatTime(timeUsed), color: "#7c3aed", bg: "#f5f3ff" },
            { label: "Violations", value: violations.length, color: violations.length > 3 ? "#dc2626" : "#d97706", bg: violations.length > 3 ? "#fef2f2" : "#fffbeb" },
            { label: "Integrity", value: `${integrityScore}%`, color: integrityScore > 70 ? "#16a34a" : "#dc2626", bg: integrityScore > 70 ? "#f0fdf4" : "#fef2f2" },
          ].map((s, i) => (
            <div key={i} style={{ ...R.statCard, background: s.bg }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ─── AI Summary ─── */}
        {aiReport.summary && (
          <div style={R.section}>
            <div style={R.sectionTitle}>🤖 AI Proctoring Analysis</div>
            <div style={R.aiBox}>
              <p style={R.aiSummary}>{aiReport.summary}</p>
              {aiReport.details && <p style={R.aiDetails}>{aiReport.details}</p>}
            </div>
          </div>
        )}

        {/* ─── Score Bar ─── */}
        <div style={R.section}>
          <div style={R.sectionTitle}>📊 Score Breakdown</div>
          <div style={R.scoreBarWrap}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>0%</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>Pass: 70%</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>100%</span>
            </div>
            <div style={R.scoreTrack}>
              <div style={{ ...R.scoreFill, width: `${score}%`, background: passed ? "#0284c7" : "#dc2626" }} />
              <div style={R.passLine} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#64748b" }}>
              <span>{correct} correct answers</span>
              <span style={{ fontWeight: 700, color: passed ? "#0284c7" : "#dc2626" }}>Your score: {score}%</span>
            </div>
          </div>
        </div>

        {/* ─── Violations Section ─── */}
        <div style={R.section}>
          <div style={R.sectionTitle}>🚨 Violations Log ({violations.length})</div>
          {violations.length === 0 ? (
            <div style={R.noViolations}>✅ No violations recorded. Clean exam session.</div>
          ) : (
            <>
              {/* Violation Summary by Type */}
              <div style={R.violTypesGrid}>
                {Object.entries(violationsByType).map(([type, count]) => {
                  const sev = VIOLATION_SEVERITY[type] || "medium";
                  const st = SEVERITY_STYLE[sev];
                  return (
                    <div key={type} style={{ ...R.violTypeCard, background: st.bg, border: `1px solid ${st.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{VIOLATION_LABELS[type] || type}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: st.color }}>{count}×</div>
                      <div style={{ fontSize: 10, background: st.color, color: "#fff", padding: "1px 6px", borderRadius: 10, display: "inline-block", marginTop: 2 }}>{st.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Violation Timeline */}
              <div style={R.violTimeline}>
                <div style={R.timelineHeader}>Violation Timeline</div>
                {violations.map((v, i) => {
                  const sev = VIOLATION_SEVERITY[v.type] || "medium";
                  const st = SEVERITY_STYLE[sev];
                  return (
                    <div key={v.id || i} style={R.violRow}>
                      <div style={{ ...R.violSevDot, background: st.color }} />
                      <div style={R.violInfo}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                          {VIOLATION_LABELS[v.type] || v.type}
                          <span style={{ ...R.sevPill, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{v.msg}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{new Date(v.timestamp).toLocaleTimeString()}</div>
                      </div>
                      {v.screenshot && (
                        <img
                          src={v.screenshot}
                          alt="violation screenshot"
                          style={R.screenshot}
                          title="Screenshot at time of violation"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ─── Performance Summary (no answers shown) ─── */}
        <div style={R.section}>
          <div style={R.sectionTitle}>📋 Performance Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={R.perfCard}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Questions Attempted</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0284c7" }}>
                {Object.keys(answers).length} <span style={{ fontSize: 14, color: "#94a3b8" }}>/ {totalQuestions}</span>
              </div>
            </div>
            <div style={R.perfCard}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Accuracy Rate</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: score >= 70 ? "#16a34a" : "#dc2626" }}>
                {Object.keys(answers).length > 0 ? Math.round((correct / Object.keys(answers).length) * 100) : 0}%
              </div>
            </div>
            <div style={R.perfCard}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Correct Answers</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a" }}>{correct}</div>
            </div>
            <div style={R.perfCard}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Skipped Questions</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                {totalQuestions - Object.keys(answers).length}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Actions ─── */}
        <div style={R.actions}>
          <button
            style={{ ...R.printBtn, opacity: downloading ? 0.7 : 1, cursor: downloading ? "wait" : "pointer", minWidth: 180 }}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? "⏳ Generating PDF..." : "⬇️ Download PDF Report"}
          </button>
          <button style={R.doneBtn} onClick={onDone}>← Back to Certifications</button>
        </div>
      </div>
    </div>
  );
}

const R = {
  page: { minHeight: "100vh", background: "#f1f5f9", padding: "24px 0", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  container: { maxWidth: 860, margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 20 },
  header: { borderRadius: 18, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" },
  headerBadge: { fontSize: 11, fontWeight: 700, letterSpacing: "1px", background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" },
  headerSub: { fontSize: 14, opacity: 0.85, margin: 0 },
  autoSubmitNote: { fontSize: 12, background: "rgba(0,0,0,0.2)", padding: "4px 10px", borderRadius: 8, display: "inline-block", marginTop: 8 },
  scoreCircle: { width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scoreNum: { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  scoreLabel: { fontSize: 11, opacity: 0.8 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 },
  statCard: { borderRadius: 12, padding: "14px 10px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  section: { background: "#fff", borderRadius: 16, padding: "22px 26px" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, letterSpacing: "-0.2px" },
  aiBox: { background: "#f8fafc", borderRadius: 10, padding: "14px 18px", border: "1px solid #e2e8f0" },
  aiSummary: { fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: "0 0 8px" },
  aiDetails: { fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 },
  scoreBarWrap: {},
  scoreTrack: { height: 12, background: "#e2e8f0", borderRadius: 8, overflow: "visible", position: "relative" },
  scoreFill: { height: "100%", borderRadius: 8, transition: "width 1s ease" },
  passLine: { position: "absolute", left: "70%", top: -4, bottom: -4, width: 2, background: "#64748b", borderRadius: 2 },
  noViolations: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#16a34a", fontWeight: 600 },
  violTypesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: 18 },
  violTypeCard: { borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 },
  violTimeline: { border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" },
  timelineHeader: { background: "#f8fafc", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" },
  violRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderBottom: "1px solid #f1f5f9" },
  violSevDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4 },
  violInfo: { flex: 1 },
  sevPill: { fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 6 },
  screenshot: { width: 80, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 },
  qReviewList: { display: "flex", flexDirection: "column", gap: 10 },
  qReviewRow: { padding: "12px 16px", background: "#f8fafc", borderRadius: 10, borderLeft: "3px solid" },
  qReviewHead: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  qReviewNum: { fontSize: 11, fontWeight: 700, color: "#64748b" },
  qReviewResult: { fontSize: 11, fontWeight: 700 },
  qReviewText: { fontSize: 13, color: "#0f172a", marginBottom: 8, fontWeight: 500 },
  qReviewAnswers: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  answerPill: { fontSize: 11, padding: "3px 10px", borderRadius: 8 },
  explanation: { fontSize: 11, color: "#64748b", background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", marginTop: 4 },
  perfCard: { background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" },
  printBtn: { padding: "11px 22px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#475569" },
  doneBtn: { padding: "11px 22px", background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
