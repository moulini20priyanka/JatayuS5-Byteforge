// frontend/src/pages/AdminStudentsPage.jsx
// Student Management — Add, Edit, Activate/Deactivate, Import (3-step wizard), Export
// Import uses the correct /parse → /validate → /execute (SSE) pipeline

import { useState, useEffect, useCallback, useRef } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000";

/* ── Shared style helpers ───────────────────────────────────────── */
const inp = (err) => ({
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
  border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
  outline: "none", fontFamily: "inherit", color: "#1e293b",
  background: err ? "#fff5f5" : "#fff", boxSizing: "border-box",
  transition: "border-color .15s",
});
const sel  = (err) => ({ ...inp(err), cursor: "pointer" });
const lbl  = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .7, marginBottom: 6, display: "block" };
const errTxt = { fontSize: 11, color: "#dc2626", marginTop: 4, display: "block" };

const COLLEGES = ["RMKEC", "RMDEC", "RMKCET"];
const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];
const BATCHES  = ["2021", "2022", "2023", "2024", "2025", "2026"];
const STATUSES = ["active", "inactive", "suspended"];

function initials(name = "") {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}
function avatarColor(name = "") {
  const h = name.charCodeAt(0) * 37 % 360;
  return { bg: `hsl(${h},55%,88%)`, color: `hsl(${h},55%,28%)` };
}
function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Toast ─────────────────────────────────────────────────────── */
function Toast({ message, type }) {
  const bg     = type === "error" ? "#fef2f2" : "#f0fdf4";
  const border = type === "error" ? "#fca5a5" : "#86efac";
  const color  = type === "error" ? "#dc2626" : "#16a34a";
  const icon   = type === "error" ? "⚠️" : "✅";
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: bg, border: `1px solid ${border}`, color, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", animation: "slideIn .25s ease" }}>
      {icon} {message}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/* ── Spinner ────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Password Input ─────────────────────────────────────────────── */
function PasswordInput({ value, onChange, hasError }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
        placeholder="Min 8 characters" style={{ ...inp(hasError), paddingRight: 52 }} />
      <button type="button" onClick={() => setShow(v => !v)}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   IMPORT WIZARD  (inline, replaces the old broken ImportModal)
   Steps: 1 → Upload & Parse  2 → Validate  3 → Execute (SSE)
   ══════════════════════════════════════════════════════════════════ */

/* Step bar — 3 steps */
function ImportStepBar({ current }) {
  const steps = ["Upload File", "Validate", "Import"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {steps.map((label, idx) => {
        const n = idx + 1; const done = current > n; const active = current === n;
        const bg = done ? "#10b981" : active ? "#2563eb" : "#e2e8f0";
        const fg = done || active ? "#fff" : "#94a3b8";
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: idx < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#2563eb" : done ? "#10b981" : "#94a3b8", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: .6 }}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "#e2e8f0", margin: "0 10px", marginBottom: 18, transition: "background .2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Inline alert */
function Alert({ type, children }) {
  const map = {
    error:   { bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
    warning: { bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
    info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
  };
  const s = map[type] || map.info;
  return (
    <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, borderRadius: 9, padding: "10px 14px", fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
      {children}
    </div>
  );
}

function ImportWizard({ apiFetch, onClose, onSuccess }) {
  const fileRef = useRef();

  /* ── wizard state ── */
  const [step,              setStep]              = useState(1);
  const [file,              setFile]              = useState(null);
  const [dragOver,          setDragOver]          = useState(false);
  const [parseLoading,      setParseLoading]      = useState(false);
  const [parseError,        setParseError]        = useState("");
  const [parseResult,       setParseResult]       = useState(null);   // { sessionId, columns, totalRows, preview, autoMapping, fields }
  const [mapping,           setMapping]           = useState({});
  const [validating,        setValidating]        = useState(false);
  const [validateError,     setValidateError]     = useState("");
  const [validationResult,  setValidationResult]  = useState(null);   // { total, ready, skipped, errors, unmappedRequired }
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [sendEmails,        setSendEmails]        = useState(true);
  const [importing,         setImporting]         = useState(false);
  const [importProgress,    setImportProgress]    = useState({ done: 0, total: 0 });
  const [importResult,      setImportResult]      = useState(null);
  const [importError,       setImportError]       = useState("");

  const token = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  const formatSize = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  /* ── STEP 1: Upload → Parse ── */
  const handleParse = async () => {
    if (!file) return;
    setParseLoading(true); setParseError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch(`${API_BASE}/api/candidates/import/parse`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) { setParseError(data.message || "Failed to parse file."); return; }
      setParseResult(data);
      setMapping(data.autoMapping || {});
      setValidationResult(null);
      setStep(2);
    } catch { setParseError("Network error while parsing. Please try again."); }
    finally   { setParseLoading(false); }
  };

  /* ── STEP 2: Validate ── */
  const handleValidate = async () => {
    if (!parseResult?.sessionId) return;
    setValidating(true); setValidateError("");
    try {
      const res  = await apiFetch("/api/candidates/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, sessionId: parseResult.sessionId }),
      });
      const data = await res.json();
      if (!data.success) { setValidateError(data.message || "Validation failed."); return; }
      setValidationResult(data);
      setStep(3);
    } catch { setValidateError("Network error during validation."); }
    finally   { setValidating(false); }
  };

  /* ── STEP 3: Execute (SSE stream) ── */
  const handleImport = async () => {
    if (!parseResult?.sessionId) return;
    setImporting(true); setImportError("");
    setImportProgress({ done: 0, total: validationResult?.ready || 0 });

    try {
      const res = await fetch(`${API_BASE}/api/candidates/import/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          mapping,
          sessionId:         parseResult.sessionId,
          duplicateHandling,
          sendWelcomeEmails: sendEmails,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setImportError(d.message || "Import failed.");
        return;
      }

      /* Read SSE stream — split on \n\n (event boundary) */
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop(); // keep incomplete trailing chunk

        for (const chunk of chunks) {
          const match = chunk.match(/^data:\s*(.+)/m);
          if (!match) continue;
          try {
            const evt = JSON.parse(match[1]);
            if (evt.phase === "importing") {
              setImportProgress({ done: evt.done, total: evt.total });
            }
            if (evt.complete) {
              setImportResult(evt);
              if (evt.imported > 0 && onSuccess) onSuccess(evt.imported);
            }
            if (evt.error) {
              setImportError(evt.message || "Import failed.");
            }
          } catch (_) {}
        }
      }
    } catch { setImportError("Network error during import. Please try again."); }
    finally   { setImporting(false); }
  };

  const pct = importProgress.total > 0
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;

  /* ── unmapped required check ── */
  const fields = parseResult?.fields || [];
  const unmappedRequired = fields.filter(f => f.required && !mapping[f.key]);

  /* ══ RENDER ══ */
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={!importing ? onClose : undefined}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,.25)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Import Students</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Upload CSV or Excel · auto-mapping · SSE progress · welcome emails</div>
          </div>
          {!importing && (
            <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <ImportStepBar current={step} />

          {/* ─── STEP 1: Upload ─────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Upload Your File</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
                Accepted: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> · Max 25 MB · Up to 5,000 rows
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setParseError(""); } }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? "#2563eb" : file ? "#10b981" : "#cbd5e1"}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", background: dragOver ? "#eff6ff" : file ? "#f0fdf4" : "#fafafa", cursor: "pointer", transition: "all .2s", marginBottom: 16 }}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setParseError(""); } }} />
                <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? "📄" : "📂"}</div>
                {file ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{formatSize(file.size)}</div>
                    <div style={{ fontSize: 11, color: "#10b981", marginTop: 6, fontWeight: 600 }}>✓ Selected — click to change</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Drag & drop or click to browse</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>CSV, XLSX, or XLS</div>
                  </>
                )}
              </div>

              {/* Sample downloads */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {["csv", "xlsx"].map(fmt => (
                  <a key={fmt}
                    href={`${API_BASE}/api/candidates/export/sample?format=${fmt}`}
                    onClick={e => {
                      e.preventDefault();
                      const a = document.createElement("a");
                      a.href = `${API_BASE}/api/candidates/export/sample?format=${fmt}`;
                      // attach auth header via fetch + blob trick
                      fetch(a.href, { headers: { Authorization: `Bearer ${token()}` } })
                        .then(r => r.blob()).then(blob => {
                          a.href = URL.createObjectURL(blob);
                          a.download = `candidates_sample.${fmt}`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        });
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 11, fontWeight: 600, color: "#475569", textDecoration: "none", cursor: "pointer" }}>
                    📥 Sample .{fmt.toUpperCase()}
                  </a>
                ))}
              </div>

              {parseError && <Alert type="error">{parseError}</Alert>}

              {parseLoading ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 13 }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 10px" }} />
                  Parsing file…
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleParse} disabled={!file}
                    style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: !file ? "#cbd5e1" : "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: !file ? "not-allowed" : "pointer" }}>
                    Next: Map & Validate →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: Map Fields + Validate ──────────────────── */}
          {step === 2 && parseResult && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Map Columns</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                Auto-mapping applied. Adjust any column below, then click Validate.
              </div>

              {validateError && <Alert type="error">{validateError}</Alert>}
              {unmappedRequired.length > 0 && (
                <Alert type="warning">
                  Required field{unmappedRequired.length > 1 ? "s" : ""}{" "}
                  <strong>{unmappedRequired.map(f => f.label).join(", ")}</strong>{" "}
                  {unmappedRequired.length > 1 ? "are" : "is"} not mapped yet.
                </Alert>
              )}

              {/* Mapping grid */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#f8fafc", padding: "9px 14px", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .7 }}>Student Field</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .7 }}>Your File Column</span>
                </div>
                {fields.map((field, idx) => (
                  <div key={field.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 14px", alignItems: "center", borderBottom: idx < fields.length - 1 ? "1px solid #f1f5f9" : "none", background: (!mapping[field.key] && field.required) ? "#fffbeb" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{field.label}</span>
                      {field.required
                        ? <span style={{ fontSize: 9, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: 20 }}>Required</span>
                        : <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 20 }}>Optional</span>}
                    </div>
                    <select
                      value={mapping[field.key] || ""}
                      onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
                      style={{ padding: "7px 10px", border: `1.5px solid ${!mapping[field.key] && field.required ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 7, fontSize: 12, color: mapping[field.key] ? "#1e293b" : "#94a3b8", background: "#fff", outline: "none", cursor: "pointer" }}>
                      <option value="">— Not mapped —</option>
                      {(parseResult.columns || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* File preview */}
              {parseResult.preview?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>
                    Preview — first {Math.min(5, parseResult.preview.length)} of {parseResult.totalRows} rows
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto", maxHeight: 160 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "#eff6ff" }}>
                          {(parseResult.columns || []).map(c => (
                            <th key={c} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: "#1d4ed8", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.preview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: i < parseResult.preview.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            {(parseResult.columns || []).map(c => (
                              <td key={c} style={{ padding: "6px 12px", color: "#475569", whiteSpace: "nowrap" }}>{String(row[c] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Alert type="info">Fields were auto-mapped using name/alias matching. Override any mapping above.</Alert>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => { setStep(1); setValidateError(""); }} style={{ padding: "10px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>← Back</button>
                <button onClick={handleValidate} disabled={unmappedRequired.length > 0 || validating}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: (unmappedRequired.length > 0 || validating) ? "#cbd5e1" : "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (unmappedRequired.length > 0 || validating) ? "not-allowed" : "pointer" }}>
                  {validating ? "Validating…" : "Validate Rows →"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Results + Import ────────────────────────── */}
          {step === 3 && validationResult && (
            <div>
              {/* If import is done — show result summary */}
              {importResult ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{importResult.failed === 0 ? "🎉" : "⚠️"}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                    Import {importResult.failed === 0 ? "Complete!" : "Finished with some issues"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "20px 0" }}>
                    {[
                      { label: "Imported", value: importResult.imported, color: "#10b981", bg: "#f0fdf4" },
                      { label: "Skipped",  value: importResult.skipped,  color: "#f59e0b", bg: "#fffbeb" },
                      { label: "Failed",   value: importResult.failed,   color: importResult.failed > 0 ? "#dc2626" : "#94a3b8", bg: importResult.failed > 0 ? "#fef2f2" : "#f8fafc" },
                    ].map(c => (
                      <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "14px", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {importResult.emailNote && (
                    <div style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", display: "inline-block", marginBottom: 16 }}>
                      📧 {importResult.emailNote}
                    </div>
                  )}

                  {importResult.errors?.length > 0 && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 14, textAlign: "left", maxHeight: 160, overflowY: "auto", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Failed rows:</div>
                      {importResult.errors.slice(0, 20).map((e, i) => (
                        <div key={i} style={{ fontSize: 11, color: "#7f1d1d", marginBottom: 3 }}>
                          <strong>Row {e.row}:</strong> {e.error}
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={onClose}
                    style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Done — Close
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Validation Results</div>

                  {/* Summary cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "Total Rows",      value: validationResult.total,   color: "#2563eb", bg: "#eff6ff" },
                      { label: "Ready to Import", value: validationResult.ready,   color: "#10b981", bg: "#f0fdf4" },
                      { label: "With Issues",     value: validationResult.skipped, color: validationResult.skipped > 0 ? "#dc2626" : "#94a3b8", bg: validationResult.skipped > 0 ? "#fef2f2" : "#f8fafc" },
                    ].map(c => (
                      <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-row validation errors */}
                  {validationResult.errors?.length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ padding: "9px 14px", background: "#fef2f2", borderBottom: "1px solid #fca5a5", fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                        ⚠️ {validationResult.errors.length} rows have issues — they will be skipped
                        {validationResult.errors.length > 15 && " (showing first 15)"}
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {validationResult.errors.slice(0, 15).map((e, i) => (
                          <div key={i} style={{ padding: "9px 14px", borderBottom: i < Math.min(validationResult.errors.length, 15) - 1 ? "1px solid #fef2f2" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", padding: "2px 7px", background: "#f8fafc", borderRadius: 5, flexShrink: 0 }}>Row {e.row}</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {(Array.isArray(e.errors) ? e.errors : [{ reason: e.error }]).map((err, j) => (
                                <span key={j} style={{ fontSize: 12, color: "#dc2626" }}>{err.reason || err.error}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {validationResult.ready === 0 && (
                    <Alert type="error">No valid rows found. Go back and fix your column mapping.</Alert>
                  )}

                  {/* Options */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Duplicate Emails</div>
                      <div style={{ display: "flex", gap: 16 }}>
                        {[
                          { v: "skip",   label: "Skip duplicates",        desc: "Safe — existing students unchanged" },
                          { v: "update", label: "Update existing records", desc: "Overwrites name, college, branch, batch, CGPA" },
                        ].map(({ v, label, desc }) => (
                          <label key={v} style={{ display: "flex", alignItems: "flex-start", gap: 7, cursor: "pointer" }}>
                            <input type="radio" checked={duplicateHandling === v} onChange={() => setDuplicateHandling(v)} style={{ cursor: "pointer", marginTop: 2 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{label}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={sendEmails} onChange={e => setSendEmails(e.target.checked)} style={{ cursor: "pointer", width: 15, height: 15, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Send welcome emails to new students</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>Each new student receives login credentials via email (non-blocking background task)</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {importError && <Alert type="error">{importError}</Alert>}

                  {/* Progress bar — visible while importing */}
                  {importing && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{importProgress.total > 0 ? "Importing records…" : "Preparing…"}</span>
                        {importProgress.total > 0 && (
                          <span style={{ fontWeight: 700, color: "#2563eb" }}>
                            {importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()} ({pct}%)
                          </span>
                        )}
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 999, height: 8, overflow: "hidden" }}>
                        <div style={{ background: "linear-gradient(90deg,#2563eb,#3b82f6)", height: "100%", borderRadius: 999, width: `${pct}%`, transition: "width .35s ease" }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setStep(2); setImportError(""); }} disabled={importing}
                      style={{ padding: "10px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: importing ? "#cbd5e1" : "#475569", cursor: importing ? "not-allowed" : "pointer" }}>
                      ← Back
                    </button>
                    <button onClick={handleImport} disabled={importing || validationResult.ready === 0}
                      style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: (importing || validationResult.ready === 0) ? "#cbd5e1" : "#10b981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (importing || validationResult.ready === 0) ? "not-allowed" : "pointer" }}>
                      {importing
                        ? importProgress.total > 0 ? `Importing… ${pct}%` : "Preparing…"
                        : `Import ${validationResult.ready} Student${validationResult.ready !== 1 ? "s" : ""} →`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STUDENT FORM  (Add / Edit)
   ══════════════════════════════════════════════════════════════════ */
const EMPTY = { name: "", email: "", password: "", college: "", branch: "", batch: "", cgpa: "" };

function validateForm(form, isEdit) {
  const e = {};
  if (!form.name.trim())  e.name  = "Full name is required.";
  if (!form.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email.";
  if (!isEdit) {
    if (!form.password)              e.password = "Password is required.";
    else if (form.password.length<8) e.password = "Min 8 characters.";
  }
  if (!form.college) e.college = "Select a college.";
  if (!form.branch)  e.branch  = "Select a branch.";
  if (!form.batch)   e.batch   = "Select a batch.";
  return e;
}

function StudentForm({ mode, entity, onCreated, onSaved, onBack, apiFetch }) {
  const isEdit = mode === "edit";
  const [form,        setForm]        = useState(isEdit
    ? { name: entity.name, email: entity.email, college: entity.college||"", branch: entity.branch||"", batch: String(entity.batch||""), cgpa: entity.cgpa||"", account_status: entity.account_status||entity.status||"active" }
    : { ...EMPTY });
  const [fieldErrs,   setFieldErrs]   = useState({});
  const [saving,      setSaving]      = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setFieldErrs(e => ({ ...e, [k]: undefined })); setServerError(""); };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validateForm(form, isEdit);
    if (Object.keys(errs).length) { setFieldErrs(errs); return; }
    setSaving(true); setServerError("");
    try {
      if (isEdit) {
        const res  = await apiFetch(`/api/candidates/${entity.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, college: form.college, branch: form.branch, batch: form.batch, cgpa: form.cgpa || null, status: form.account_status }) });
        const data = await res.json();
        if (!res.ok) { setServerError(data.message || "Update failed."); setSaving(false); return; }
        onSaved("Student updated successfully.");
      } else {
        const res  = await apiFetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, college: form.college, branch: form.branch, batch: form.batch, cgpa: form.cgpa || null }) });
        const data = await res.json();
        if (!res.ok) { setServerError(data.message || "Failed to create student."); setSaving(false); return; }
        onCreated(`Student "${form.name}" created. Login details sent to ${form.email}.`);
      }
    } catch { setServerError("Network error."); setSaving(false); }
  };

  return (
    <div style={{ padding: "32px 36px", fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: 680, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0 }}>
        ← Back to Students
      </button>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 14, background: "#f8fafc" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{isEdit ? "Edit Student" : "Add New Student"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{isEdit ? entity.name : "Student will receive login credentials via email"}</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input style={inp(!!fieldErrs.name)} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Kavithaa K A" />
                {fieldErrs.name && <span style={errTxt}>{fieldErrs.name}</span>}
              </div>
              <div>
                <label style={lbl}>Email Address *</label>
                <input style={inp(!!fieldErrs.email)} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. kavithaa@rmkec.ac.in" />
                {fieldErrs.email && <span style={errTxt}>{fieldErrs.email}</span>}
              </div>
            </div>
            {!isEdit && (
              <div>
                <label style={lbl}>Temporary Password *</label>
                <PasswordInput value={form.password} onChange={v => set("password", v)} hasError={!!fieldErrs.password} />
                {fieldErrs.password ? <span style={errTxt}>{fieldErrs.password}</span>
                  : <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>Student will be prompted to change on first login.</span>}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>College *</label>
                <select style={sel(!!fieldErrs.college)} value={form.college} onChange={e => set("college", e.target.value)}>
                  <option value="">— Select —</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {fieldErrs.college && <span style={errTxt}>{fieldErrs.college}</span>}
              </div>
              <div>
                <label style={lbl}>Branch *</label>
                <select style={sel(!!fieldErrs.branch)} value={form.branch} onChange={e => set("branch", e.target.value)}>
                  <option value="">— Select —</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.branch && <span style={errTxt}>{fieldErrs.branch}</span>}
              </div>
              <div>
                <label style={lbl}>Batch *</label>
                <select style={sel(!!fieldErrs.batch)} value={form.batch} onChange={e => set("batch", e.target.value)}>
                  <option value="">— Select —</option>
                  {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.batch && <span style={errTxt}>{fieldErrs.batch}</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>CGPA <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <input style={inp(false)} type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={e => set("cgpa", e.target.value)} placeholder="e.g. 8.5" />
              </div>
              {isEdit && (
                <div>
                  <label style={lbl}>Account Status</label>
                  <select style={sel(false)} value={form.account_status} onChange={e => set("account_status", e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </div>
            {serverError && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 12, border: "1px solid #fca5a5" }}>⚠️ {serverError}</div>
            )}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving}
                style={{ flex: 1, padding: "11px", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Add Student & Send Email")}
              </button>
              <button type="button" onClick={onBack}
                style={{ flex: 1, padding: "11px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STUDENT LIST (table + filters)
   ══════════════════════════════════════════════════════════════════ */
function StudentList({ apiFetch, onEdit, refreshKey }) {
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterBranch,  setFilterBranch]  = useState("all");
  const [filterBatch,   setFilterBatch]   = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [toggling,      setToggling]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/api/candidates");
      const data = await res.json();
      if (data.success !== false) setStudents(Array.isArray(data.students) ? data.students : Array.isArray(data) ? data : []);
      else setError(data.message || "Failed to load students.");
    } catch { setError("Network error. Could not load students."); }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const toggleStatus = async (student) => {
    const next = (student.status || student.account_status) === "active" ? "inactive" : "active";
    setToggling(student.id);
    try {
      await apiFetch(`/api/candidates/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: student.name, email: student.email, college: student.college, branch: student.branch, batch: student.batch, status: next }),
      });
      setStudents(ss => ss.map(s => s.id === student.id ? { ...s, status: next, account_status: next } : s));
    } catch {}
    setToggling(null);
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "College", "Branch", "Batch", "CGPA", "Status", "Created At"];
    const rows = filtered.map(s => [s.name, s.email, s.college, s.branch, s.batch, s.cgpa||"", s.status||s.account_status||"", formatDate(s.created_at)]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      ((s.name||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q)) &&
      (filterCollege === "all" || s.college === filterCollege) &&
      (filterBranch  === "all" || s.branch  === filterBranch) &&
      (filterBatch   === "all" || String(s.batch) === filterBatch) &&
      (filterStatus  === "all" || (s.status||s.account_status||"") === filterStatus)
    );
  });

  const uniqueColleges = [...new Set(students.map(s => s.college).filter(Boolean))];
  const uniqueBranches = [...new Set(students.map(s => s.branch).filter(Boolean))];
  const uniqueBatches  = [...new Set(students.map(s => String(s.batch)).filter(Boolean))].sort((a,b) => b.localeCompare(a));

  if (loading) return <Spinner />;
  if (error)   return (
    <div style={{ padding: "16px 20px", background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 13, border: "1px solid #fca5a5" }}>
      {error} <button onClick={load} style={{ marginLeft: 10, padding: "3px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Retry</button>
    </div>
  );

  const selStyle = { padding: "8px 10px", fontSize: 12, border: "1.5px solid #e2e8f0", borderRadius: 8, color: "#475569", background: "#fff", outline: "none", cursor: "pointer" };
  const hasFilter = search || filterCollege !== "all" || filterBranch !== "all" || filterBatch !== "all" || filterStatus !== "all";

  return (
    <>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#94a3b8" }}>🔍</span>
          <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inp(false), paddingLeft: 34, height: 38 }} />
        </div>
        <select style={selStyle} value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
          <option value="all">All Colleges</option>
          {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selStyle} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="all">All Branches</option>
          {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select style={selStyle} value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
          <option value="all">All Batches</option>
          {uniqueBatches.map(b => <option key={b} value={b}>Batch {b}</option>)}
        </select>
        <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        {hasFilter && (
          <button onClick={() => { setSearch(""); setFilterCollege("all"); setFilterBranch("all"); setFilterBatch("all"); setFilterStatus("all"); }}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 11, color: "#64748b", cursor: "pointer" }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
          {filtered.length} of {students.length} students
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.07)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
              {["Student", "College", "Branch", "Batch", "Status", "Joined", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const av  = avatarColor(s.name || "");
              const st  = s.status || s.account_status || "active";
              const stColor = st === "active" ? "#16a34a" : st === "suspended" ? "#dc2626" : "#94a3b8";
              const stBg    = st === "active" ? "#f0fdf4"  : st === "suspended" ? "#fef2f2"  : "#f8fafc";
              return (
                <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,.04)" : "none", transition: "background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials(s.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#eff6ff", color: "#1d4ed8" }}>{s.college || "—"}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569", fontWeight: 500 }}>{s.branch || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569", fontFamily: "monospace", fontWeight: 600 }}>{s.batch || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: stColor, background: stBg, padding: "3px 10px", borderRadius: 20 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: stColor, display: "inline-block" }} />
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>{formatDate(s.created_at)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => onEdit(s)}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 11, fontWeight: 600, color: "#2563eb", cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => toggleStatus(s)} disabled={toggling === s.id}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: toggling === s.id ? .6 : 1, color: st === "active" ? "#dc2626" : "#16a34a" }}>
                        {toggling === s.id ? "…" : st === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
                  No students match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={exportCSV}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
          📥 Export CSV ({filtered.length})
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function AdminStudentsPage({ apiFetch: apiFetchProp }) {
  const apiFetch = apiFetchProp || ((path, opts = {}) => {
    const token      = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    const isFormData = opts.body instanceof FormData;
    return fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...opts.headers,
      },
    });
  });

  const [formView,   setFormView]   = useState(null);   // null | { mode: "create"|"edit", entity }
  const [showImport, setShowImport] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  /* Render StudentForm in place of the list */
  if (formView) {
    return (
      <div style={{ marginLeft: "230px", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
        <Sidebar />
        <Navbar />
        {toast && <Toast message={toast.message} type={toast.type} />}
        <StudentForm
          mode={formView.mode}
          entity={formView.entity}
          apiFetch={apiFetch}
          onCreated={(msg) => { setFormView(null); showToast(msg); setRefreshKey(k => k + 1); }}
          onSaved={(msg)   => { setFormView(null); showToast(msg); setRefreshKey(k => k + 1); }}
          onBack={() => setFormView(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ marginLeft: "230px", display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6fb" }}>
      <Sidebar />
      <Navbar />

      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Import wizard modal */}
      {showImport && (
        <ImportWizard
          apiFetch={apiFetch}
          onClose={() => setShowImport(false)}
          onSuccess={(count) => {
            setShowImport(false);
            showToast(`${count} student${count !== 1 ? "s" : ""} imported successfully.`);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      <div style={{ padding: "32px 36px", flex: 1, fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#dbeafe", borderRadius: 8, padding: "4px 12px", marginBottom: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 1 }}>Student Management</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", letterSpacing: "-.4px", margin: "0 0 6px" }}>Students</h1>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Add, edit, activate/deactivate, import and export student records.</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button onClick={() => setShowImport(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
              📥 Import Students
            </button>
            <button onClick={() => setFormView({ mode: "create", entity: null })}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: "#2563eb", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              + Add Student
            </button>
          </div>
        </div>

        <StudentList
          apiFetch={apiFetch}
          refreshKey={refreshKey}
          onEdit={(s) => setFormView({ mode: "edit", entity: s })}
        />
      </div>
    </div>
  );
}