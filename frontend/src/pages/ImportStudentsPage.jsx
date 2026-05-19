

import { useState, useRef } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api';

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  return { Authorization: `Bearer ${token}` };
}

/* ── Step bar ─────────────────────────────────────────────────────────────── */
const STEP_LABELS = ["Upload File", "Map Columns", "Validate", "Import"];

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < current; const active = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, background: done ? "#16a34a" : active ? "#2563eb" : "#e2e8f0", color: done || active ? "#fff" : "#94a3b8", border: active ? "3px solid #bfdbfe" : "none", transition: "all .3s" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#2563eb" : done ? "#16a34a" : "#94a3b8", textTransform: "uppercase", letterSpacing: .7, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "#e2e8f0", margin: "0 8px 20px", transition: "background .3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Inline alert ─────────────────────────────────────────────────────────── */
function Alert({ type, children }) {
  const map = {
    error:   { bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
    warning: { bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
    info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
  };
  const s = map[type] || map.info;
  return (
    <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, borderRadius: 9, padding: "10px 14px", fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>
      {children}
    </div>
  );
}

/* ── STEP 0: Upload ───────────────────────────────────────────────────────── */
function UploadStep({ onParsed, loading, setLoading }) {
  const fileRef = useRef();
  const [file,  setFile]  = useState(null);
  const [error, setError] = useState("");
  const [drag,  setDrag]  = useState(false);

  const pickFile = (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) { setError("Only CSV and Excel files (.csv, .xlsx, .xls) are supported."); return; }
    setFile(f); setError("");
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch(`${API_URL}/api/candidates/import/parse`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message || "Parsing failed."); setLoading(false); return; }
      onParsed(data);
    } catch (e) { setError("Network error: " + e.message); }
    setLoading(false);
  };

  const downloadSample = async (fmt) => {
    const res  = await fetch(`${API_URL}/api/candidates/export/sample?format=${fmt}`, { headers: authHeaders() });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `candidates_sample.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Upload Your File</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Accepted: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> · Max 25 MB · Up to 5,000 rows
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? "#2563eb" : file ? "#16a34a" : "#cbd5e1"}`, borderRadius: 14, padding: "44px 24px", textAlign: "center", cursor: "pointer", background: drag ? "#eff6ff" : file ? "#f0fdf4" : "#f8fafc", marginBottom: 20, transition: "all .2s" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? "📄" : "📂"}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: file ? "#16a34a" : "#475569" }}>
          {file ? file.name : "Click or drag a file here"}
        </div>
        {file && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB</div>}
        {!file && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>CSV, XLSX, or XLS</div>}
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
        onChange={e => pickFile(e.target.files[0])} />

      {/* Sample downloads */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => downloadSample("csv")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
          📥 Download Sample CSV
        </button>
        <button onClick={() => downloadSample("xlsx")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
          📥 Download Sample XLSX
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 13 }}>
          <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 10px" }} />
          Parsing file…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <button onClick={handleParse} disabled={!file}
          style={{ padding: "11px 28px", borderRadius: 9, border: "none", background: !file ? "#cbd5e1" : "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: !file ? "not-allowed" : "pointer" }}>
          Next: Map Columns →
        </button>
      )}
    </div>
  );
}

/* ── STEP 1: Map Columns ──────────────────────────────────────────────────── */
function MappingStep({ parseResult, mapping, setMapping, onNext, onBack, loading }) {
  const { columns, preview, fields, totalRows } = parseResult;
  const unmappedRequired = (fields || []).filter(f => f.required && !mapping[f.key]);

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Map Columns</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Match your file columns to student fields. Required fields are marked <span style={{ color: "#dc2626" }}>*</span>. Auto-mapping applied — adjust if needed.
      </div>

      {unmappedRequired.length > 0 && (
        <Alert type="warning">
          Required field{unmappedRequired.length > 1 ? "s" : ""}{" "}
          <strong>{unmappedRequired.map(f => f.label).join(", ")}</strong>{" "}
          not mapped yet.
        </Alert>
      )}

      {/* Mapping grid */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: "#f8fafc", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>Student Field</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>Your File Column</span>
        </div>
        {(fields || []).map((field, idx) => (
          <div key={field.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "12px 16px", borderBottom: idx < fields.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: (!mapping[field.key] && field.required) ? "#fffbeb" : "#fff" }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{field.label}</span>
              {field.required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
              {!field.required && <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>(optional)</span>}
            </div>
            <select
              value={mapping[field.key] || ""}
              onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
              style={{ padding: "7px 10px", border: `1.5px solid ${!mapping[field.key] && field.required ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12, color: mapping[field.key] ? "#1e293b" : "#94a3b8", background: "#fff", outline: "none", cursor: "pointer" }}>
              <option value="">— Skip this field —</option>
              {(columns || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Preview */}
      {preview?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: .6 }}>
            Preview — first {Math.min(5, preview.length)} of {totalRows} rows
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto", maxHeight: 180 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#eff6ff" }}>
                  {(columns || []).map(c => <th key={c} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: "#1d4ed8", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < preview.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    {(columns || []).map(c => <td key={c} style={{ padding: "6px 12px", color: "#475569", whiteSpace: "nowrap" }}>{String(row[c] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Alert type="info">Fields auto-mapped using name/alias matching. Override any mapping using the dropdowns above.</Alert>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{ padding: "10px 20px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>← Back</button>
        <button onClick={onNext} disabled={unmappedRequired.length > 0 || loading}
          style={{ flex: 1, padding: "10px 24px", borderRadius: 9, border: "none", background: (unmappedRequired.length > 0 || loading) ? "#cbd5e1" : "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (unmappedRequired.length > 0 || loading) ? "not-allowed" : "pointer" }}>
          {loading ? "Validating…" : "Next: Validate →"}
        </button>
      </div>
    </div>
  );
}

/* ── STEP 2: Validation Results + Options ─────────────────────────────────── */
function ValidateStep({ validationResult, onExecute, onBack, sendEmails, setSendEmails, duplicateHandling, setDuplicateHandling, loading }) {
  const { total, ready, skipped, errors } = validationResult;

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>Validation Results</div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Rows",     value: total,   color: "#2563eb", bg: "#eff6ff" },
          { label: "Ready to Import", value: ready,   color: "#16a34a", bg: "#f0fdf4" },
          { label: "Will Be Skipped", value: skipped, color: skipped > 0 ? "#dc2626" : "#94a3b8", bg: skipped > 0 ? "#fef2f2" : "#f8fafc" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: .6, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Per-row errors */}
      {errors?.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "10px 16px", background: "#fef2f2", borderBottom: "1px solid #fca5a5", fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
            ⚠️ {errors.length} rows have issues — they will be skipped
            {errors.length > 20 && ` (showing first 20 of ${errors.length})`}
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {errors.slice(0, 20).map((e, i) => (
              <div key={i} style={{ padding: "10px 16px", borderBottom: i < Math.min(errors.length, 20) - 1 ? "1px solid #fef2f2" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", padding: "2px 7px", background: "#f8fafc", borderRadius: 5, flexShrink: 0 }}>Row {e.row}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Backend returns e.errors[] (from /validate) or e.error string (from /execute) */}
                  {(Array.isArray(e.errors) ? e.errors : [{ reason: e.error || e.reason }]).map((err, j) => (
                    <span key={j} style={{ fontSize: 12, color: "#dc2626" }}>{err.reason || err.error}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ready === 0 && <Alert type="error">No valid rows found. Go back and fix your column mapping.</Alert>}

      {/* Import options */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Duplicate Emails</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { v: "skip",   label: "Skip duplicates (safe)",    desc: "Existing students will not be changed" },
              { v: "update", label: "Update existing records",   desc: "Overwrites name, college, branch, batch, CGPA, percentages" },
            ].map(({ v, label, desc }) => (
              <label key={v} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input type="radio" checked={duplicateHandling === v} onChange={() => setDuplicateHandling(v)} style={{ cursor: "pointer", marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{label}</div>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Send welcome emails to new students</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Each new student receives login credentials via email (runs in the background — non-blocking)</div>
            </div>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} disabled={loading}
          style={{ padding: "10px 20px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: loading ? "#cbd5e1" : "#475569", cursor: loading ? "not-allowed" : "pointer" }}>
          ← Back
        </button>
        <button onClick={onExecute} disabled={ready === 0 || loading}
          style={{ flex: 1, padding: "10px 28px", borderRadius: 9, border: "none", background: (ready === 0 || loading) ? "#cbd5e1" : "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (ready === 0 || loading) ? "not-allowed" : "pointer" }}>
          {loading ? "Importing…" : `Import ${ready} Student${ready !== 1 ? "s" : ""} →`}
        </button>
      </div>
    </div>
  );
}

/* ── STEP 3: Execute — SSE progress + final result ────────────────────────── */
function ExecuteStep({ progress, result, onDone }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  if (result) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{result.failed === 0 ? "🎉" : "⚠️"}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
          Import {result.failed === 0 ? "Complete!" : "Finished with some issues"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 400, margin: "20px auto 24px" }}>
          {[
            { label: "Imported", value: result.imported, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Skipped",  value: result.skipped,  color: "#f59e0b", bg: "#fffbeb" },
            { label: "Failed",   value: result.failed,   color: result.failed > 0 ? "#dc2626" : "#94a3b8", bg: result.failed > 0 ? "#fef2f2" : "#f8fafc" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "14px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {result.emailNote && (
          <div style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", display: "inline-block", marginBottom: 20 }}>
            📧 {result.emailNote}
          </div>
        )}

        {result.errors?.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 16, textAlign: "left", maxHeight: 200, overflowY: "auto", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Failed rows:</div>
            {result.errors.slice(0, 20).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: "#7f1d1d", marginBottom: 3 }}>
                <strong>Row {e.row}:</strong> {e.error}
              </div>
            ))}
          </div>
        )}

        <button onClick={onDone}
          style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ← Back to Students
        </button>
      </div>
    );
  }

  /* still streaming */
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>Importing students — please wait…</div>
      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 12, overflow: "hidden", maxWidth: 440, margin: "0 auto 12px" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#16a34a)", borderRadius: 99, width: `${pct}%`, transition: "width .5s" }} />
      </div>
      <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
        {progress.total > 0
          ? `${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} rows (${pct}%)`
          : "Preparing…"}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function ImportStudentsPage() {
  const [step,              setStep]              = useState(0);
  const [loading,           setLoading]           = useState(false);
  const [parseResult,       setParseResult]       = useState(null);
  const [mapping,           setMapping]           = useState({});
  const [validationResult,  setValidationResult]  = useState(null);
  const [validateError,     setValidateError]     = useState("");
  const [progress,          setProgress]          = useState({ done: 0, total: 0 });
  const [importResult,      setImportResult]      = useState(null);
  const [sendEmails,        setSendEmails]        = useState(true);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");

  /* Step 0 → 1 */
  const handleParsed = (data) => {
    setParseResult(data);
    setMapping(data.autoMapping || {});
    setValidationResult(null);
    setStep(1);
  };

  /* Step 1 → 2: server-side dry-run validation */
  const handleValidate = async () => {
    if (!parseResult?.sessionId) return;
    setLoading(true); setValidateError("");
    try {
      const res  = await fetch(`${API_URL}/api/candidates/import/validate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, sessionId: parseResult.sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setValidateError(data.message || "Validation failed.");
        setLoading(false);
        return;
      }
      setValidationResult(data);
      setStep(2);
    } catch (e) {
      setValidateError("Network error: " + e.message);
    }
    setLoading(false);
  };

  /* Step 2 → 3: SSE streaming import */
  const handleExecute = async () => {
    if (!parseResult?.sessionId) return;
    setStep(3);
    setProgress({ done: 0, total: validationResult?.ready || 0 });
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/candidates/import/execute`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping,
          sessionId:         parseResult.sessionId,
          duplicateHandling,
          sendWelcomeEmails: sendEmails,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setImportResult({ imported: 0, skipped: 0, failed: 1, errors: [{ row: "—", error: d.message || "Import failed." }] });
        setLoading(false);
        return;
      }

      /* ── SSE: split on \n\n (event boundary), NOT \n ── */
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are delimited by double newline
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop(); // last element may be an incomplete chunk

        for (const chunk of chunks) {
          const match = chunk.match(/^data:\s*(.+)/m);
          if (!match) continue;
          try {
            const evt = JSON.parse(match[1]);
            if (evt.phase === "importing") {
              setProgress({ done: evt.done, total: evt.total });
            }
            if (evt.complete) {
              setImportResult(evt);
            }
            if (evt.error) {
              setImportResult({ imported: 0, skipped: 0, failed: 1, errors: [{ row: "—", error: evt.message || "Import failed." }] });
            }
          } catch (_) { /* malformed JSON — skip */ }
        }
      }
    } catch (e) {
      setImportResult({ imported: 0, skipped: 0, failed: 1, errors: [{ row: "—", error: e.message }] });
    }
    setLoading(false);
  };

  const goBack = () => window.history.back();

  return (
    <div style={{ marginLeft: "230px", display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6fb" }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, padding: "32px 36px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#dbeafe", borderRadius: 8, padding: "4px 12px", marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 1 }}>Student Management</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>Import Students</h1>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                Bulk import from CSV or Excel · auto column mapping · duplicate detection · welcome emails
              </p>
            </div>
            <button onClick={goBack}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
              ← Back to Students
            </button>
          </div>
        </div>

        {/* Wizard card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "32px", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <StepBar current={step} />

          {step === 0 && (
            <UploadStep onParsed={handleParsed} loading={loading} setLoading={setLoading} />
          )}

          {step === 1 && parseResult && (
            <>
              {validateError && <Alert type="error">{validateError}</Alert>}
              <MappingStep
                parseResult={parseResult}
                mapping={mapping}
                setMapping={setMapping}
                onNext={handleValidate}
                onBack={() => { setStep(0); setValidateError(""); }}
                loading={loading}
              />
            </>
          )}

          {step === 2 && validationResult && (
            <ValidateStep
              validationResult={validationResult}
              onExecute={handleExecute}
              onBack={() => setStep(1)}
              sendEmails={sendEmails}
              setSendEmails={setSendEmails}
              duplicateHandling={duplicateHandling}
              setDuplicateHandling={setDuplicateHandling}
              loading={loading}
            />
          )}

          {step === 3 && (
            <ExecuteStep
              progress={progress}
              result={importResult}
              onDone={goBack}
            />
          )}
        </div>
      </main>
    </div>
  );
}

