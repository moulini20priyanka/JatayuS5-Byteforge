// frontend/src/pages/Candidates.jsx
// Candidate Management — Add, Edit, Activate/Deactivate, Import (3-step wizard), Export
//
// ✅ INTEGRATED: AI Student Validation Agent
//   • Add Student form — "Run AI Validation" button before submit
//     - Detects fake/disposable emails, suspicious names, DB duplicates
//     - BLOCK verdict disables submit (with optional override)
//     - WARN verdict shows warning but allows proceed
//   • Import Wizard Step 2 — AI Validation panel after column mapping
//     - Validates preview batch via Claude claude-sonnet-4-20250514 + rule engine
//     - Shows per-record verdict (PASS/WARN/BLOCK) with risk scores
//     - Blocked count shown before final import
//   • Student List table — "AI" badge column (PASS/WARN/BLOCK)
//   • Validation audit log accessible via /api/candidates/validate/audit

import { useState, useEffect, useCallback, useRef } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000";

/* ── Design Tokens ─────────────────────────────────────────────────────────── */
const T = {
  primary: '#1e3a8a', accent: '#2563eb', accentLt: '#eff6ff', accentBd: '#bfdbfe',
  text: '#1e293b', text2: '#475569', text3: '#94a3b8', border: '#e2e8f0', bg: '#f0f7ff', white: '#ffffff',
  green: '#059669', greenBg: '#ecfdf5', greenBd: '#6ee7b7',
  red: '#dc2626', redBg: '#fef2f2', redBd: '#fca5a5',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fcd34d',
};

/* ── Shared style helpers ───────────────────────────────────────────────────── */
const inp = (err) => ({
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
  border: `1.5px solid ${err ? T.redBd : T.border}`,
  outline: "none", fontFamily: "inherit", color: T.primary,
  background: err ? T.redBg : T.white, boxSizing: "border-box",
  transition: "border-color .15s",
});
const sel  = (err) => ({ ...inp(err), cursor: "pointer" });
const lbl  = { fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: .7, marginBottom: 6, display: "block" };
const errTxt = { fontSize: 11, color: T.red, marginTop: 4, display: "block" };

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

/* ══════════════════════════════════════════════════════════════════════════════
   AI VALIDATION AGENT — inline (no separate file import needed)
   Uses: Claude claude-sonnet-4-20250514 via backend /api/candidates/validate/*
   ══════════════════════════════════════════════════════════════════════════════ */
function verdictColor(v)  { return { PASS:"#16a34a", WARN:"#d97706", BLOCK:"#dc2626" }[v] || "#64748b"; }
function verdictBg(v)     { return { PASS:"#f0fdf4",  WARN:"#fffbeb",  BLOCK:"#fef2f2"  }[v] || "#f8fafc"; }
function verdictBorder(v) { return { PASS:"#bbf7d0", WARN:"#fde68a", BLOCK:"#fca5a5" }[v] || "#e2e8f0"; }
function verdictIcon(v)   { return { PASS:"✅",       WARN:"⚠️",       BLOCK:"🚫"      }[v] || "❓"; }
function sevColor(s)      { return { error:"#dc2626", warning:"#d97706", info:"#2563eb" }[s] || "#475569"; }
function sevBg(s)         { return { error:"#fef2f2", warning:"#fffbeb", info:"#eff6ff"  }[s] || "#f8fafc"; }
function sevBorder(s)     { return { error:"#fca5a5", warning:"#fde68a", info:"#bfdbfe" }[s] || "#e2e8f0"; }
function sevIcon(s)       { return { error:"❌",       warning:"⚠️",      info:"ℹ️"      }[s] || "•"; }

function RiskBar({ score }) {
  const color = score >= 60 ? "#dc2626" : score >= 30 ? "#f59e0b" : "#16a34a";
  const label = score >= 60 ? "HIGH" : score >= 30 ? "MED" : "LOW";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:6, background:"#e2e8f0", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:`linear-gradient(90deg,#16a34a,${color})`, borderRadius:99, transition:"width .5s ease" }} />
      </div>
      <span style={{ fontSize:10, fontWeight:800, color, minWidth:32 }}>{score}/100</span>
      <span style={{ fontSize:9, fontWeight:700, color, background:sevBg(score>=60?"error":score>=30?"warning":"info"), padding:"1px 6px", borderRadius:20 }}>{label}</span>
    </div>
  );
}

function FlagList({ flags, title }) {
  if (!flags?.length) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{title}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {flags.map((f,i) => (
          <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start", background:sevBg(f.severity), border:`1px solid ${sevBorder(f.severity)}`, borderRadius:7, padding:"6px 10px" }}>
            <span style={{ fontSize:11, flexShrink:0 }}>{sevIcon(f.severity)}</span>
            <span style={{ fontSize:11, color:sevColor(f.severity), fontWeight:600, flex:1 }}>{f.message}</span>
            <span style={{ fontSize:9, color:"#94a3b8", fontFamily:"monospace", flexShrink:0 }}>{f.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Single result card — used inside bulk list */
function ValidationCard({ r }) {
  const [open, setOpen] = useState(r.verdict !== "PASS");
  const allFlags = [...(r.issues||[]), ...(r.warnings||[]), ...(r.aiFlags||[])];
  return (
    <div style={{ border:`1.5px solid ${verdictBorder(r.verdict)}`, borderRadius:10, overflow:"hidden", marginBottom:6 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:verdictBg(r.verdict), cursor:"pointer", userSelect:"none" }}>
        <span style={{ fontSize:14 }}>{verdictIcon(r.verdict)}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{r.name || r.email}</span>
            <span style={{ fontSize:11, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>{r.email}</span>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:2, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, fontWeight:700, color:verdictColor(r.verdict), textTransform:"uppercase", letterSpacing:.6 }}>{r.verdict}</span>
            {r.isDuplicate    && <span style={{ fontSize:9, fontWeight:700, color:"#7c3aed", background:"#f5f3ff", padding:"1px 6px", borderRadius:20 }}>DUPE</span>}
            {r.nearDuplicates?.length>0 && <span style={{ fontSize:9, fontWeight:700, color:"#b45309", background:"#fffbeb", padding:"1px 6px", borderRadius:20 }}>NEAR-DUP</span>}
            {r.aiVerdict      && <span style={{ fontSize:9, fontWeight:700, color:"#0369a1", background:"#e0f2fe", padding:"1px 6px", borderRadius:20 }}>🤖 AI:{r.aiVerdict}</span>}
            {allFlags.length>0 && <span style={{ fontSize:10, color:"#94a3b8" }}>{allFlags.length} flag{allFlags.length!==1?"s":""}</span>}
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:verdictColor(r.verdict), flexShrink:0 }}>{r.riskScore}/100</span>
        <span style={{ fontSize:11, color:"#94a3b8", flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${verdictBorder(r.verdict)}` }}>
          <RiskBar score={r.riskScore} />
          {r.aiReason && (
            <div style={{ marginTop:8, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:7, padding:"7px 10px", fontSize:11, color:"#1d4ed8" }}>
              🤖 <strong>Claude AI:</strong> {r.aiReason}
            </div>
          )}
          {r.isDuplicate && r.existingRecord && (
            <div style={{ marginTop:6, background:"#f5f3ff", border:"1px solid #c4b5fd", borderRadius:7, padding:"7px 10px", fontSize:11, color:"#5b21b6" }}>
              🔍 Duplicate of <strong>{r.existingRecord.name}</strong> (ID: {r.existingRecord.id})
            </div>
          )}
          {r.nearDuplicates?.length>0 && (
            <div style={{ marginTop:6, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:7, padding:"7px 10px", fontSize:11, color:"#92400e" }}>
              🔗 Near-dupe of: {r.nearDuplicates.map(nd=>`Row ${nd.indexB+1} (${nd.emailB})`).join(", ")}
            </div>
          )}
          <FlagList flags={(r.issues||[]).filter(f=>f.severity==="error")}   title="Errors — blocked" />
          <FlagList flags={[...(r.warnings||[]), ...(r.aiFlags||[])]}        title="Warnings / AI flags" />
        </div>
      )}
    </div>
  );
}

/* Bulk summary filter bar */
function BulkSummaryBar({ summary, filter, onFilter }) {
  if (!summary) return null;
  const stats = [
    { k:"all",   label:"Total",     n:summary.total,      c:"#475569", bg:"#f8fafc", b:"#e2e8f0" },
    { k:"PASS",  label:"Clean",     n:summary.passed,     c:"#16a34a", bg:"#f0fdf4", b:"#bbf7d0" },
    { k:"WARN",  label:"Warned",    n:summary.warned,     c:"#d97706", bg:"#fffbeb", b:"#fde68a" },
    { k:"BLOCK", label:"Blocked",   n:summary.blocked,    c:"#dc2626", bg:"#fef2f2", b:"#fca5a5" },
    { k:"DUP",   label:"Dupes",     n:summary.duplicates, c:"#7c3aed", bg:"#f5f3ff", b:"#c4b5fd" },
  ];
  return (
    <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
      {stats.map(s => (
        <button key={s.k} onClick={() => onFilter(s.k===filter?"all":s.k)}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"9px 14px", border:`2px solid ${filter===s.k?s.c:s.b}`, borderRadius:10, background:filter===s.k?s.bg:"#fff", cursor:"pointer", transition:"all .15s" }}>
          <span style={{ fontSize:18, fontWeight:800, color:s.c }}>{s.n}</span>
          <span style={{ fontSize:9, fontWeight:700, color:s.c, textTransform:"uppercase", letterSpacing:.8 }}>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main ValidationAgentPanel component ─────────────────────────────────────
   mode="single" — validates one student record (Add Student form)
   mode="bulk"   — validates an array of students (Import Wizard step 2)
*/
function ValidationAgentPanel({ mode="single", student=null, students=[], onResult=null, onBulkResult=null }) {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [result,      setResult]      = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [summary,     setSummary]     = useState(null);
  const [filter,      setFilter]      = useState("all");
  const [collapsed,   setCollapsed]   = useState(false);

  const token = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  const run = useCallback(async () => {
    setLoading(true); setError(""); setResult(null); setBulkResults(null); setSummary(null);
    try {
      if (mode === "single") {
        const res  = await fetch(`${API_BASE}/api/candidates/validate/single`, {
          method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
          body: JSON.stringify(student),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message || "Validation failed"); return; }
        setResult(data.validation);
        onResult?.(data.validation);
      } else {
        const res  = await fetch(`${API_BASE}/api/candidates/validate/bulk`, {
          method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
          body: JSON.stringify({ students }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message || "Bulk validation failed"); return; }
        setBulkResults(data.results);
        setSummary(data.summary);
        onBulkResult?.(data.results, data.summary);
      }
    } catch(e) { setError("Network error: " + e.message); }
    finally    { setLoading(false); }
  }, [mode, student, students, onResult, onBulkResult]);

  const canRun = mode==="single" ? !!student?.email : students.length > 0;

  const filtered = (bulkResults||[]).filter(r =>
    filter==="all"  ? true :
    filter==="DUP"  ? r.isDuplicate :
    r.verdict===filter
  );

  return (
    <div style={{ border:"2px solid #e2e8f0", borderRadius:12, overflow:"hidden", fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" }}>

      {/* Header bar */}
      <div onClick={() => setCollapsed(c=>!c)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:"linear-gradient(135deg,#0f172a,#1e3a8a)", cursor:"pointer", userSelect:"none" }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🤖</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#fff", letterSpacing:-.2 }}>AI Validation Agent</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.55)", marginTop:1 }}>Claude claude-sonnet-4-20250514 · Rule Engine · Duplicate Detector</div>
        </div>
        {/* Live verdict pill (single mode) */}
        {result && !loading && (
          <div style={{ display:"flex", alignItems:"center", gap:5, background:verdictBg(result.verdict), border:`1.5px solid ${verdictBorder(result.verdict)}`, borderRadius:20, padding:"3px 10px" }}>
            <span style={{ fontSize:11 }}>{verdictIcon(result.verdict)}</span>
            <span style={{ fontSize:10, fontWeight:700, color:verdictColor(result.verdict) }}>{result.verdict}</span>
          </div>
        )}
        {/* Summary pills (bulk mode) */}
        {summary && !loading && (
          <div style={{ display:"flex", gap:4 }}>
            {[{v:"PASS",n:summary.passed},{v:"WARN",n:summary.warned},{v:"BLOCK",n:summary.blocked}].map(({v,n})=>n>0&&(
              <div key={v} style={{ background:verdictBg(v), border:`1px solid ${verdictBorder(v)}`, borderRadius:6, padding:"2px 7px", fontSize:10, fontWeight:700, color:verdictColor(v) }}>
                {n} {v}
              </div>
            ))}
          </div>
        )}
        <span style={{ color:"rgba(255,255,255,.4)", fontSize:12 }}>{collapsed?"▼":"▲"}</span>
      </div>

      {!collapsed && (
        <div style={{ padding:16, background:"#fff" }}>

          {/* Trigger row */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
            <div style={{ flex:1, fontSize:12, color:"#475569", lineHeight:1.6 }}>
              {mode==="single"
                ? "Validates email format, disposable domains, database duplicates, near-duplicate detection, and Claude AI semantic analysis — before the record is saved."
                : `Validates all ${students.length} record(s) through 6 layers: rules → DB duplicates → near-dupe scan → Claude AI → risk scoring → audit log.`}
            </div>
            <button onClick={run} disabled={loading||!canRun}
              style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, padding:"9px 16px", borderRadius:9, border:"none",
                background: loading||!canRun ? "#cbd5e1" : "linear-gradient(135deg,#1e3a8a,#2563eb)",
                color:"#fff", fontWeight:700, fontSize:12, cursor:loading||!canRun?"not-allowed":"pointer" }}>
              {loading
                ? <><Spinner14 /> Validating…</>
                : <><ShieldIcon14 /> Run AI Validation</>}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding:"20px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ position:"relative", width:44, height:44 }}>
                <div style={{ position:"absolute", inset:0, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                <div style={{ position:"absolute", inset:8, border:"2px solid #bfdbfe", borderTopColor:"#1d4ed8", borderRadius:"50%", animation:"spin 1.1s linear infinite reverse" }} />
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>Running AI validation pipeline…</div>
              <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center", lineHeight:1.5 }}>
                Rules → DB Duplicates → Near-Dups → Claude AI → Risk Score
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:9, padding:"10px 14px", fontSize:12, color:"#dc2626", fontWeight:500 }}>⚠️ {error}</div>
          )}

          {/* ── SINGLE RESULT ─────────────────────────────────────────────── */}
          {!loading && result && mode==="single" && (
            <div>
              {/* Verdict banner */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:verdictBg(result.verdict), border:`2px solid ${verdictBorder(result.verdict)}`, borderRadius:10, marginBottom:10 }}>
                <span style={{ fontSize:22 }}>{verdictIcon(result.verdict)}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:verdictColor(result.verdict) }}>
                    {result.verdict==="PASS"  && "Validation Passed — Safe to proceed"}
                    {result.verdict==="WARN"  && "Validation Warning — Review before saving"}
                    {result.verdict==="BLOCK" && "Validation Blocked — Fix issues before saving"}
                  </div>
                  {result.aiReason && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>🤖 {result.aiReason}</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:verdictColor(result.verdict) }}>{result.riskScore}</div>
                  <div style={{ fontSize:9, color:"#94a3b8", textTransform:"uppercase" }}>Risk</div>
                </div>
              </div>
              <RiskBar score={result.riskScore} />
              {result.isDuplicate && result.existingRecord && (
                <div style={{ marginTop:10, background:"#f5f3ff", border:"1.5px solid #a78bfa", borderRadius:9, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#5b21b6", textTransform:"uppercase", marginBottom:5 }}>🔍 Duplicate Found in Database</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {[["ID",result.existingRecord.id],["Name",result.existingRecord.name],["College",result.existingRecord.college],["Joined",formatDate(result.existingRecord.created_at)]].map(([k,v])=>(
                      <div key={k}><div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase" }}>{k}</div><div style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>{v||"—"}</div></div>
                    ))}
                  </div>
                </div>
              )}
              <FlagList flags={(result.issues||[]).filter(f=>f.severity==="error")} title="Errors (blocking)" />
              <FlagList flags={[...(result.warnings||[]),...(result.aiFlags||[])]}  title="Warnings / AI flags" />
              {result.verdict==="PASS" && (
                <div style={{ marginTop:10, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:9, padding:"9px 12px", fontSize:12, color:"#15803d", display:"flex", gap:8, alignItems:"center" }}>
                  ✅ All layers passed — record is clean and safe to add.
                </div>
              )}
            </div>
          )}

          {/* ── BULK RESULTS ──────────────────────────────────────────────── */}
          {!loading && bulkResults && mode==="bulk" && summary && (
            <div>
              {/* Summary banner */}
              <div style={{ background:summary.blocked>0?verdictBg("BLOCK"):summary.warned>0?verdictBg("WARN"):verdictBg("PASS"), border:`2px solid ${summary.blocked>0?verdictBorder("BLOCK"):summary.warned>0?verdictBorder("WARN"):verdictBorder("PASS")}`, borderRadius:10, padding:"11px 14px", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:16 }}>{summary.blocked>0?"🚫":summary.warned>0?"⚠️":"✅"}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>
                    {summary.canImport} of {summary.total} records safe to import
                  </span>
                  {summary.aiUsed && <span style={{ fontSize:9, fontWeight:700, color:"#0369a1", background:"#e0f2fe", padding:"2px 8px", borderRadius:20, marginLeft:"auto" }}>🤖 Claude claude-sonnet-4-20250514</span>}
                </div>
                {summary.blocked>0 && <div style={{ fontSize:11, color:"#dc2626" }}>{summary.blocked} record{summary.blocked!==1?"s":""} will be blocked. {summary.duplicates>0&&`${summary.duplicates} duplicate${summary.duplicates!==1?"s":""} detected.`}</div>}
              </div>
              <BulkSummaryBar summary={summary} filter={filter} onFilter={setFilter} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.8 }}>
                  {filter==="all"?`All ${bulkResults.length}`:`${filtered.length} ${filter}`} records
                </span>
                {filter!=="all" && <button onClick={()=>setFilter("all")} style={{ fontSize:11, color:"#2563eb", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Show all ✕</button>}
              </div>
              <div style={{ maxHeight:380, overflowY:"auto", paddingRight:2 }}>
                {filtered.slice(0,150).map(r => <ValidationCard key={r.index} r={r} />)}
                {filtered.length>150 && <div style={{ textAlign:"center", padding:10, fontSize:11, color:"#94a3b8" }}>Showing 150/{filtered.length} — use filters to narrow down.</div>}
                {!filtered.length && <div style={{ textAlign:"center", padding:24, color:"#94a3b8", fontSize:13 }}>No records match this filter.</div>}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

/* Tiny icon helpers (no external deps) */
function Spinner14() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:"spin .7s linear infinite", flexShrink:0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
function ShieldIcon14() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink:0 }}><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg>;
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function Toast({ message, type }) {
  const bg     = type==="error" ? "#fef2f2" : "#f0fdf4";
  const border = type==="error" ? "#fca5a5" : "#86efac";
  const color  = type==="error" ? "#dc2626" : "#16a34a";
  return (
    <div style={{ position:"fixed", top:24, right:24, zIndex:9999, background:bg, border:`1px solid ${border}`, color, padding:"12px 18px", borderRadius:10, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", animation:"slideIn .25s ease" }}>
      {type==="error"?"⚠️":"✅"} {message}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Spinner ────────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:60 }}>
      <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   IMPORT WIZARD — 3-step: Upload → Map & AI Validate → Execute (SSE)
   AI Validation runs inside Step 2 on preview rows via ValidationAgentPanel
   ══════════════════════════════════════════════════════════════════════════════ */
function ImportStepBar({ current }) {
  const steps = ["Upload File", "Map & Validate", "Import"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:28 }}>
      {steps.map((label, idx) => {
        const n=idx+1, done=current>n, active=current===n;
        const bg=done?"#10b981":active?"#2563eb":"#e2e8f0";
        const fg=done||active?"#fff":"#94a3b8";
        return (
          <div key={n} style={{ display:"flex", alignItems:"center", flex:idx<steps.length-1?1:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>
                {done?"✓":n}
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:active?"#2563eb":done?"#10b981":"#94a3b8", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:.6 }}>{label}</span>
            </div>
            {idx<steps.length-1 && <div style={{ flex:1, height:2, background:done?"#10b981":"#e2e8f0", margin:"0 10px", marginBottom:18, transition:"background .2s" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Alert({ type, children }) {
  const map = {
    error:   { bg:"#fef2f2", border:"#fecaca", color:"#dc2626" },
    warning: { bg:"#fffbeb", border:"#fde68a", color:"#d97706" },
    info:    { bg:"#eff6ff", border:"#bfdbfe", color:"#2563eb" },
    success: { bg:"#f0fdf4", border:"#bbf7d0", color:"#16a34a" },
  };
  const s=map[type]||map.info;
  return (
    <div style={{ background:s.bg, border:`1.5px solid ${s.border}`, color:s.color, borderRadius:9, padding:"10px 14px", fontSize:13, lineHeight:1.55, marginBottom:14 }}>
      {children}
    </div>
  );
}

function ImportWizard({ apiFetch, onClose, onSuccess }) {
  const fileRef = useRef();

  const [step,              setStep]              = useState(1);
  const [file,              setFile]              = useState(null);
  const [dragOver,          setDragOver]          = useState(false);
  const [parseLoading,      setParseLoading]      = useState(false);
  const [parseError,        setParseError]        = useState("");
  const [parseResult,       setParseResult]       = useState(null);
  const [mapping,           setMapping]           = useState({});
  const [validating,        setValidating]        = useState(false);
  const [validateError,     setValidateError]     = useState("");
  const [validationResult,  setValidationResult]  = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [sendEmails,        setSendEmails]        = useState(true);
  const [importing,         setImporting]         = useState(false);
  const [importProgress,    setImportProgress]    = useState({ done:0, total:0 });
  const [importResult,      setImportResult]      = useState(null);
  const [importError,       setImportError]       = useState("");

  // AI validation state for bulk preview
  const [aiSummary,         setAiSummary]         = useState(null);

  const token = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const formatSize = b => b<1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  /* STEP 1: Parse */
  const handleParse = async () => {
    if (!file) return;
    setParseLoading(true); setParseError("");
    try {
      const fd=new FormData(); fd.append("file",file);
      const res  = await fetch(`${API_BASE}/api/candidates/import/parse`, { method:"POST", headers:{ Authorization:`Bearer ${token()}` }, body:fd });
      const data = await res.json();
      if (!data.success) { setParseError(data.message||"Failed to parse file."); return; }
      setParseResult(data); setMapping(data.autoMapping||{}); setValidationResult(null); setAiSummary(null); setStep(2);
    } catch { setParseError("Network error while parsing. Please try again."); }
    finally   { setParseLoading(false); }
  };

  /* STEP 2: Validate (server-side) */
  const handleValidate = async () => {
    if (!parseResult?.sessionId) return;
    setValidating(true); setValidateError("");
    try {
      const res  = await apiFetch("/api/candidates/import/validate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ mapping, sessionId:parseResult.sessionId }) });
      const data = await res.json();
      if (!data.success) { setValidateError(data.message||"Validation failed."); return; }
      setValidationResult(data); setStep(3);
    } catch { setValidateError("Network error during validation."); }
    finally   { setValidating(false); }
  };

  /* STEP 3: Execute (SSE) */
  const handleImport = async () => {
    if (!parseResult?.sessionId) return;
    setImporting(true); setImportError(""); setImportProgress({ done:0, total:validationResult?.ready||0 });
    try {
      const res = await fetch(`${API_BASE}/api/candidates/import/execute`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ mapping, sessionId:parseResult.sessionId, duplicateHandling, sendWelcomeEmails:sendEmails }),
      });
      if (!res.ok) { const d=await res.json().catch(()=>({})); setImportError(d.message||"Import failed."); return; }
      const reader=res.body.getReader(), decoder=new TextDecoder(); let buffer="";
      while(true) {
        const {done,value}=await reader.read(); if(done) break;
        buffer+=decoder.decode(value,{stream:true});
        const chunks=buffer.split("\n\n"); buffer=chunks.pop();
        for (const chunk of chunks) {
          const match=chunk.match(/^data:\s*(.+)/m); if(!match) continue;
          try {
            const evt=JSON.parse(match[1]);
            if(evt.phase==="importing") setImportProgress({done:evt.done,total:evt.total});
            if(evt.complete){ setImportResult(evt); if(evt.imported>0&&onSuccess) onSuccess(evt.imported); }
            if(evt.error) setImportError(evt.message||"Import failed.");
          } catch(_) {}
        }
      }
    } catch { setImportError("Network error during import. Please try again."); }
    finally   { setImporting(false); }
  };

  const pct = importProgress.total>0 ? Math.round((importProgress.done/importProgress.total)*100) : 0;
  const fields = parseResult?.fields||[];
  const unmappedRequired = fields.filter(f=>f.required&&!mapping[f.key]);

  /* Build student array from preview rows for AI validation */
  const previewStudents = (parseResult?.preview||[]).map(row => ({
    name:    mapping.name    ? String(row[mapping.name]   ||"").trim() : "",
    email:   mapping.email   ? String(row[mapping.email]  ||"").trim() : "",
    college: mapping.college ? String(row[mapping.college]||"").trim() : "",
    branch:  mapping.branch  ? String(row[mapping.branch] ||"").trim() : "",
    batch:   mapping.batch   ? String(row[mapping.batch]  ||"").trim() : "",
    cgpa:    mapping.cgpa    ? String(row[mapping.cgpa]   ||"").trim() : "",
  }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.6)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={!importing?onClose:undefined}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:720, maxHeight:"93vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,.25)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 28px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:14, background:"#f8fafc", flexShrink:0 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📥</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1e293b" }}>Import Students</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Auto-generates temp passwords · Sends welcome email · AI duplicate detection</div>
          </div>
          {!importing && <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:16, color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"28px" }}>
          <ImportStepBar current={step} />

          {/* STEP 1 — Upload */}
          {step===1 && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Upload Your File</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Accepted: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> · Max 25 MB · Up to 5,000 rows</div>
              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 16px", marginBottom:18, fontSize:12, color:"#1d4ed8", lineHeight:1.6 }}>
                <strong>📧 How import works:</strong> Each student gets a unique auto-generated temporary password sent to their email. On first login they must set a new one. Duplicate emails are detected and skipped (or updated). <strong>🤖 AI validates every record before import.</strong>
              </div>
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f){setFile(f);setParseError("");}}}
                onClick={()=>fileRef.current?.click()}
                style={{ border:`2px dashed ${dragOver?"#2563eb":file?"#10b981":"#cbd5e1"}`, borderRadius:12, padding:"36px 24px", textAlign:"center", background:dragOver?"#eff6ff":file?"#f0fdf4":"#fafafa", cursor:"pointer", transition:"all .2s", marginBottom:16 }}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e=>{if(e.target.files[0]){setFile(e.target.files[0]);setParseError("");}}} />
                <div style={{ fontSize:32, marginBottom:8 }}>{file?"📄":"📂"}</div>
                {file ? (
                  <><div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>{file.name}</div><div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{formatSize(file.size)}</div><div style={{ fontSize:11, color:"#10b981", marginTop:6, fontWeight:600 }}>✓ Selected — click to change</div></>
                ) : (
                  <><div style={{ fontSize:13, fontWeight:600, color:"#475569" }}>Drag & drop or click to browse</div><div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>CSV, XLSX, or XLS · No password column needed</div></>
                )}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                {["csv","xlsx"].map(fmt=>(
                  <a key={fmt} href="#" onClick={e=>{e.preventDefault();fetch(`${API_BASE}/api/candidates/export/sample?format=${fmt}`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.blob()).then(blob=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`candidates_sample.${fmt}`;a.click();URL.revokeObjectURL(a.href);});}}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", fontSize:11, fontWeight:600, color:"#475569", textDecoration:"none", cursor:"pointer" }}>
                    📥 Sample .{fmt.toUpperCase()}
                  </a>
                ))}
              </div>
              {parseError && <Alert type="error">{parseError}</Alert>}
              {parseLoading ? (
                <div style={{ textAlign:"center", padding:"16px 0", color:"#64748b", fontSize:13 }}>
                  <div style={{ width:28, height:28, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 10px" }} />Parsing file…
                </div>
              ) : (
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={onClose} style={{ padding:"10px 18px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer" }}>Cancel</button>
                  <button onClick={handleParse} disabled={!file} style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:!file?"#cbd5e1":"#2563eb", color:"#fff", fontWeight:700, fontSize:13, cursor:!file?"not-allowed":"pointer" }}>Next: Map & Validate →</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Map & AI Validate */}
          {step===2 && parseResult && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Map Columns</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Auto-mapping applied. Adjust if needed, run AI validation on the preview, then click Validate.</div>
              {validateError && <Alert type="error">{validateError}</Alert>}
              {unmappedRequired.length>0 && (
                <Alert type="warning">Required field{unmappedRequired.length>1?"s":""} <strong>{unmappedRequired.map(f=>f.label).join(", ")}</strong> {unmappedRequired.length>1?"are":"is"} not mapped yet.</Alert>
              )}

              {/* Column mapping table */}
              <div style={{ border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:"#f8fafc", padding:"9px 14px", borderBottom:"1px solid #e2e8f0" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.7 }}>Student Field</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.7 }}>Your File Column</span>
                </div>
                {fields.map((field,idx)=>(
                  <div key={field.key} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", padding:"10px 14px", alignItems:"center", borderBottom:idx<fields.length-1?"1px solid #f1f5f9":"none", background:(!mapping[field.key]&&field.required)?"#fffbeb":"#fff" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{field.label}</span>
                      {field.required
                        ? <span style={{ fontSize:9, fontWeight:700, color:"#dc2626", background:"#fef2f2", padding:"1px 6px", borderRadius:20 }}>Required</span>
                        : <span style={{ fontSize:9, fontWeight:600, color:"#94a3b8", background:"#f1f5f9", padding:"1px 6px", borderRadius:20 }}>Optional</span>}
                    </div>
                    <select value={mapping[field.key]||""} onChange={e=>setMapping(m=>({...m,[field.key]:e.target.value}))}
                      style={{ padding:"7px 10px", border:`1.5px solid ${!mapping[field.key]&&field.required?"#fca5a5":"#e2e8f0"}`, borderRadius:7, fontSize:12, color:mapping[field.key]?"#1e293b":"#94a3b8", background:"#fff", outline:"none", cursor:"pointer" }}>
                      <option value="">— Not mapped —</option>
                      {(parseResult.columns||[]).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {parseResult.preview?.length>0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.6, marginBottom:8 }}>
                    Preview — first {Math.min(5,parseResult.preview.length)} of {parseResult.totalRows} rows
                  </div>
                  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, overflow:"auto", maxHeight:140 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead><tr style={{ background:"#eff6ff" }}>{(parseResult.columns||[]).map(c=><th key={c} style={{ padding:"7px 12px", textAlign:"left", fontWeight:700, color:"#1d4ed8", whiteSpace:"nowrap", borderBottom:"1px solid #e2e8f0" }}>{c}</th>)}</tr></thead>
                      <tbody>{parseResult.preview.map((row,i)=><tr key={i} style={{ borderBottom:i<parseResult.preview.length-1?"1px solid #f1f5f9":"none" }}>{(parseResult.columns||[]).map(c=><td key={c} style={{ padding:"6px 12px", color:"#475569", whiteSpace:"nowrap" }}>{String(row[c]??"")}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 🤖 AI VALIDATION PANEL (bulk, preview rows) ────────────── */}
              <div style={{ marginBottom:16 }}>
                <ValidationAgentPanel
                  mode="bulk"
                  students={previewStudents}
                  onBulkResult={(_results, summary) => setAiSummary(summary)}
                />
              </div>

              {/* AI blocked warning before Validate button */}
              {aiSummary?.blocked>0 && (
                <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:9, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:12 }}>
                  🚫 <strong>{aiSummary.blocked} preview record{aiSummary.blocked!==1?"s":""} blocked</strong> by AI validation — they will be automatically skipped during import.
                </div>
              )}

              <Alert type="info">
                <strong>🔑 Passwords:</strong> No password column needed — unique temporary passwords are auto-generated per student and emailed. Students must change on first login.
              </Alert>

              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button onClick={()=>{setStep(1);setValidateError("");}} style={{ padding:"10px 18px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer" }}>← Back</button>
                <button onClick={handleValidate} disabled={unmappedRequired.length>0||validating}
                  style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:(unmappedRequired.length>0||validating)?"#cbd5e1":"#2563eb", color:"#fff", fontWeight:700, fontSize:13, cursor:(unmappedRequired.length>0||validating)?"not-allowed":"pointer" }}>
                  {validating?"Validating…":"Validate All Rows →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Import */}
          {step===3 && validationResult && (
            <div>
              {importResult ? (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>{importResult.failed===0?"🎉":"⚠️"}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#1e293b", marginBottom:6 }}>Import {importResult.failed===0?"Complete!":"Finished with some issues"}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, margin:"20px 0" }}>
                    {[{label:"Imported",value:importResult.imported,color:"#10b981",bg:"#f0fdf4"},{label:"Skipped",value:importResult.skipped,color:"#f59e0b",bg:"#fffbeb"},{label:"Failed",value:importResult.failed,color:importResult.failed>0?"#dc2626":"#94a3b8",bg:importResult.failed>0?"#fef2f2":"#f8fafc"}].map(c=>(
                      <div key={c.label} style={{ background:c.bg, borderRadius:10, padding:14, textAlign:"center" }}>
                        <div style={{ fontSize:26, fontWeight:800, color:c.color }}>{c.value}</div>
                        <div style={{ fontSize:10, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginTop:3 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {importResult.emailNote && <div style={{ fontSize:12, color:"#2563eb", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", marginBottom:16, lineHeight:1.6 }}>📧 {importResult.emailNote}</div>}
                  {importResult.errors?.length>0 && (
                    <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:14, textAlign:"left", maxHeight:160, overflowY:"auto", marginBottom:16 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", marginBottom:8 }}>Skipped / Failed rows:</div>
                      {importResult.errors.slice(0,20).map((e,i)=><div key={i} style={{ fontSize:11, color:"#7f1d1d", marginBottom:3 }}><strong>Row {e.row}:</strong> {e.error}</div>)}
                    </div>
                  )}
                  <button onClick={onClose} style={{ padding:"10px 28px", borderRadius:9, border:"none", background:"#2563eb", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Done — Close</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:16 }}>Validation Results</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                    {[{label:"Total Rows",value:validationResult.total,color:"#2563eb",bg:"#eff6ff"},{label:"Ready to Import",value:validationResult.ready,color:"#10b981",bg:"#f0fdf4"},{label:"With Issues",value:validationResult.skipped,color:validationResult.skipped>0?"#dc2626":"#94a3b8",bg:validationResult.skipped>0?"#fef2f2":"#f8fafc"}].map(c=>(
                      <div key={c.label} style={{ background:c.bg, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
                        <div style={{ fontSize:26, fontWeight:800, color:c.color }}>{c.value}</div>
                        <div style={{ fontSize:10, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginTop:4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {validationResult.errors?.length>0 && (
                    <div style={{ background:"#fff", border:"1px solid #fca5a5", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
                      <div style={{ padding:"9px 14px", background:"#fef2f2", borderBottom:"1px solid #fca5a5", fontSize:12, fontWeight:700, color:"#dc2626" }}>⚠️ {validationResult.errors.length} rows have issues — they will be skipped{validationResult.errors.length>15?" (showing first 15)":""}</div>
                      <div style={{ maxHeight:200, overflowY:"auto" }}>
                        {validationResult.errors.slice(0,15).map((e,i)=>(
                          <div key={i} style={{ padding:"9px 14px", borderBottom:i<Math.min(validationResult.errors.length,15)-1?"1px solid #fef2f2":"none", display:"flex", gap:10, alignItems:"flex-start" }}>
                            <span style={{ fontSize:10, fontFamily:"monospace", color:"#94a3b8", padding:"2px 7px", background:"#f8fafc", borderRadius:5, flexShrink:0 }}>Row {e.row}</span>
                            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                              {(Array.isArray(e.errors)?e.errors:[{reason:e.error}]).map((err,j)=><span key={j} style={{ fontSize:12, color:"#dc2626" }}>{err.reason||err.error}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {validationResult.ready===0 && <Alert type="error">No valid rows found. Go back and fix your column mapping or file data.</Alert>}
                  <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 16px", marginBottom:20, display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:.6, marginBottom:8 }}>Duplicate Emails</div>
                      <div style={{ display:"flex", gap:16 }}>
                        {[{v:"skip",label:"Skip duplicates",desc:"Safe — existing student accounts unchanged"},{v:"update",label:"Update existing records",desc:"Resets temp password + overwrites profile fields"}].map(({v,label,desc})=>(
                          <label key={v} style={{ display:"flex", alignItems:"flex-start", gap:7, cursor:"pointer" }}>
                            <input type="radio" checked={duplicateHandling===v} onChange={()=>setDuplicateHandling(v)} style={{ cursor:"pointer", marginTop:2 }} />
                            <div><div style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>{label}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{desc}</div></div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer" }}>
                      <input type="checkbox" checked={sendEmails} onChange={e=>setSendEmails(e.target.checked)} style={{ cursor:"pointer", width:15, height:15, marginTop:2 }} />
                      <div><div style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>Send welcome emails with temporary passwords</div><div style={{ fontSize:11, color:"#94a3b8" }}>Each student receives their unique temp password — they must change it on first login</div></div>
                    </label>
                  </div>
                  {importError && <Alert type="error">{importError}</Alert>}
                  {importing && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#475569", marginBottom:6 }}>
                        <span style={{ fontWeight:600 }}>{importProgress.total>0?"Importing records…":"Preparing…"}</span>
                        {importProgress.total>0 && <span style={{ fontWeight:700, color:"#2563eb" }}>{importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()} ({pct}%)</span>}
                      </div>
                      <div style={{ background:"#e2e8f0", borderRadius:999, height:8, overflow:"hidden" }}>
                        <div style={{ background:"linear-gradient(90deg,#2563eb,#3b82f6)", height:"100%", borderRadius:999, width:`${pct}%`, transition:"width .35s ease" }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>{setStep(2);setImportError("");}} disabled={importing} style={{ padding:"10px 18px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:13, fontWeight:600, color:importing?"#cbd5e1":"#475569", cursor:importing?"not-allowed":"pointer" }}>← Back</button>
                    <button onClick={handleImport} disabled={importing||validationResult.ready===0}
                      style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:(importing||validationResult.ready===0)?"#cbd5e1":"#10b981", color:"#fff", fontWeight:700, fontSize:13, cursor:(importing||validationResult.ready===0)?"not-allowed":"pointer" }}>
                      {importing ? (importProgress.total>0?`Importing… ${pct}%`:"Preparing…") : `Import ${validationResult.ready} Student${validationResult.ready!==1?"s":""} →`}
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

/* ══════════════════════════════════════════════════════════════════════════════
   STUDENT FORM  (Add / Edit)
   ✅ AI Validation panel integrated before submit for new students
   ══════════════════════════════════════════════════════════════════════════════ */
const EMPTY = { name:"", email:"", college:"", branch:"", batch:"", cgpa:"" };

function validateForm(form) {
  const e={};
  if (!form.name.trim())  e.name  = "Full name is required.";
  if (!form.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
  if (!form.college) e.college = "Select a college.";
  if (!form.branch)  e.branch  = "Select a branch.";
  if (!form.batch)   e.batch   = "Select a batch.";
  return e;
}

function StudentForm({ mode, entity, onCreated, onSaved, onBack, apiFetch }) {
  const isEdit = mode==="edit";
  const [form,        setForm]        = useState(isEdit
    ? { name:entity.name, email:entity.email, college:entity.college||"", branch:entity.branch||"", batch:String(entity.batch||""), cgpa:entity.cgpa||"", account_status:entity.account_status||entity.status||"active" }
    : { ...EMPTY });
  const [fieldErrs,   setFieldErrs]   = useState({});
  const [saving,      setSaving]      = useState(false);
  const [serverError, setServerError] = useState("");

  // ── AI Validation state (Add Student only) ──────────────────────────────
  const [aiResult,      setAiResult]      = useState(null);    // ValidationResult
  const [aiOverride,    setAiOverride]    = useState(false);   // admin chose to override BLOCK

  const set = (k,v) => {
    setForm(f=>({...f,[k]:v}));
    setFieldErrs(e=>({...e,[k]:undefined}));
    setServerError("");
    // Reset AI result when key fields change
    if (["name","email"].includes(k)) { setAiResult(null); setAiOverride(false); }
  };

  const aiBlocked = !isEdit && aiResult?.verdict==="BLOCK" && !aiOverride;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setFieldErrs(errs); return; }
    setSaving(true); setServerError("");
    try {
      if (isEdit) {
        const res  = await apiFetch(`/api/candidates/${entity.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:form.name, email:form.email, college:form.college, branch:form.branch, batch:form.batch, cgpa:form.cgpa||null, status:form.account_status }) });
        const data = await res.json();
        if (!res.ok) { setServerError(data.message||"Update failed."); setSaving(false); return; }
        onSaved("Student updated successfully.");
      } else {
        const res  = await apiFetch("/api/candidates", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:form.name, email:form.email, college:form.college, branch:form.branch, batch:form.batch, cgpa:form.cgpa||null }) });
        const data = await res.json();
        if (!res.ok) {
          if (res.status===409) setFieldErrs(e=>({...e,email:data.message}));
          else if (res.status===422 && data.blocked) {
            // Server-side AI validation blocked it
            setServerError(data.message||"AI validation blocked this record.");
            if (data.validation) setAiResult(data.validation);
          } else setServerError(data.message||"Failed to create student.");
          setSaving(false); return;
        }
        onCreated(`Student "${form.name}" created. Temporary password sent to ${form.email}.`);
      }
    } catch { setServerError("Network error. Please try again."); setSaving(false); }
  };

  return (
    <div style={{ padding:"32px 36px", fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif", maxWidth:700, margin:"0 auto" }}>
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:13, fontWeight:600, marginBottom:24, padding:0 }}>
        ← Back to Students
      </button>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        {/* Form header */}
        <div style={{ padding:"20px 28px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:14, background:"#f8fafc" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🎓</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#1e293b" }}>{isEdit?"Edit Student":"Add New Student"}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{isEdit?entity.name:"A temporary password will be auto-generated and emailed to the student"}</div>
          </div>
        </div>

        {!isEdit && (
          <div style={{ margin:"16px 28px 0", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"11px 14px", fontSize:12, color:"#1d4ed8", lineHeight:1.6 }}>
            <strong>🔑 Auto-password:</strong> A unique temporary password will be generated for this student and sent to their email. On first login they will be prompted to set a new password.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding:"24px 28px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input style={inp(!!fieldErrs.name)} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Kavithaa K A" />
                {fieldErrs.name && <span style={errTxt}>{fieldErrs.name}</span>}
              </div>
              <div>
                <label style={lbl}>Email Address *</label>
                <input style={inp(!!fieldErrs.email)} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="e.g. kavithaa@rmkec.ac.in" />
                {fieldErrs.email && <span style={errTxt}>{fieldErrs.email}</span>}
              </div>
            </div>

            {!isEdit && (
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px" }}>
                <span style={{ fontSize:18 }}>🔐</span>
                <div style={{ fontSize:12, color:"#15803d" }}><strong>Password:</strong> Auto-generated temporary password will be emailed to the student after account creation.</div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              <div>
                <label style={lbl}>College *</label>
                <select style={sel(!!fieldErrs.college)} value={form.college} onChange={e=>set("college",e.target.value)}>
                  <option value="">— Select —</option>
                  {COLLEGES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {fieldErrs.college && <span style={errTxt}>{fieldErrs.college}</span>}
              </div>
              <div>
                <label style={lbl}>Branch *</label>
                <select style={sel(!!fieldErrs.branch)} value={form.branch} onChange={e=>set("branch",e.target.value)}>
                  <option value="">— Select —</option>
                  {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.branch && <span style={errTxt}>{fieldErrs.branch}</span>}
              </div>
              <div>
                <label style={lbl}>Batch *</label>
                <select style={sel(!!fieldErrs.batch)} value={form.batch} onChange={e=>set("batch",e.target.value)}>
                  <option value="">— Select —</option>
                  {BATCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErrs.batch && <span style={errTxt}>{fieldErrs.batch}</span>}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={lbl}>CGPA <span style={{ color:"#94a3b8", fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                <input style={inp(false)} type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={e=>set("cgpa",e.target.value)} placeholder="e.g. 8.5" />
              </div>
              {isEdit && (
                <div>
                  <label style={lbl}>Account Status</label>
                  <select style={sel(false)} value={form.account_status} onChange={e=>set("account_status",e.target.value)}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* ── 🤖 AI VALIDATION PANEL (Add Student only) ─────────────── */}
            {!isEdit && (
              <div>
                <ValidationAgentPanel
                  mode="single"
                  student={{ name:form.name, email:form.email, college:form.college, branch:form.branch, batch:form.batch, cgpa:form.cgpa }}
                  onResult={r => { setAiResult(r); setAiOverride(false); }}
                />
                {/* BLOCK override option */}
                {aiResult?.verdict==="BLOCK" && (
                  <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10, background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:9, padding:"9px 12px" }}>
                    <span style={{ fontSize:13, color:"#dc2626", flex:1, fontWeight:600 }}>🚫 AI validation blocked this record. Fix the issues above, or override to save anyway.</span>
                    <button type="button" onClick={()=>setAiOverride(true)}
                      style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #fca5a5", background:"#fff", fontSize:11, fontWeight:700, color:"#dc2626", cursor:"pointer", whiteSpace:"nowrap" }}>
                      Override
                    </button>
                  </div>
                )}
                {aiOverride && (
                  <div style={{ marginTop:6, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#92400e" }}>
                    ⚠️ Override active — this record will be saved despite AI validation warnings. This action is logged.
                  </div>
                )}
              </div>
            )}

            {serverError && (
              <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:12, border:"1px solid #fca5a5" }}>⚠️ {serverError}</div>
            )}

            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <button type="submit" disabled={saving||aiBlocked}
                style={{ flex:1, padding:"11px", background:saving||aiBlocked?"#93c5fd":"#2563eb", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:13, cursor:saving||aiBlocked?"not-allowed":"pointer" }}>
                {saving ? (isEdit?"Saving…":"Creating…") : (isEdit?"Save Changes":"Add Student & Send Welcome Email")}
              </button>
              <button type="button" onClick={onBack}
                style={{ flex:1, padding:"11px", background:"#f8fafc", color:"#475569", border:"1px solid #e2e8f0", borderRadius:9, fontWeight:600, fontSize:13, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STUDENT LIST
   ✅ Added "AI" badge column showing ai_validation_status from DB
   ══════════════════════════════════════════════════════════════════════════════ */
function StudentList({ apiFetch, onEdit, refreshKey }) {
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterBranch,  setFilterBranch]  = useState("all");
  const [filterBatch,   setFilterBatch]   = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterAI,      setFilterAI]      = useState("all");
  const [toggling,      setToggling]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/api/candidates");
      const data = await res.json();
      if (data.success!==false) setStudents(Array.isArray(data.students)?data.students:Array.isArray(data)?data:[]);
      else setError(data.message||"Failed to load students.");
    } catch { setError("Network error. Could not load students."); }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const toggleStatus = async (student) => {
    const next=(student.status||student.account_status)==="active"?"inactive":"active";
    setToggling(student.id);
    try {
      await apiFetch(`/api/candidates/${student.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:student.name, email:student.email, college:student.college, branch:student.branch, batch:student.batch, status:next }) });
      setStudents(ss=>ss.map(s=>s.id===student.id?{...s,status:next,account_status:next}:s));
    } catch {}
    setToggling(null);
  };

  const exportCSV = () => {
    const headers=["Name","Email","College","Branch","Batch","CGPA","Status","AI Check","Risk Score","Must Change Password","Created At"];
    const rows=filtered.map(s=>[s.name,s.email,s.college,s.branch,s.batch,s.cgpa||"",s.status||s.account_status||"",s.ai_validation_status||"PASS",s.ai_risk_score??0,s.must_change_password?"Yes":"No",formatDate(s.created_at)]);
    const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}), url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download="students.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const filtered = students.filter(s => {
    const q=search.toLowerCase();
    const aiStatus=s.ai_validation_status||"PASS";
    return (
      ((s.name||"").toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q)) &&
      (filterCollege==="all"||s.college===filterCollege) &&
      (filterBranch ==="all"||s.branch ===filterBranch) &&
      (filterBatch  ==="all"||String(s.batch)===filterBatch) &&
      (filterStatus ==="all"||(s.status||s.account_status||"")===filterStatus) &&
      (filterAI     ==="all"||aiStatus===filterAI)
    );
  });

  const uniqueColleges=[...new Set(students.map(s=>s.college).filter(Boolean))];
  const uniqueBranches=[...new Set(students.map(s=>s.branch).filter(Boolean))];
  const uniqueBatches=[...new Set(students.map(s=>String(s.batch)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));

  if (loading) return <Spinner />;
  if (error)   return <div style={{ padding:"16px 20px", background:"#fef2f2", borderRadius:10, color:"#dc2626", fontSize:13, border:"1px solid #fca5a5" }}>{error} <button onClick={load} style={{ marginLeft:10, padding:"3px 10px", background:"#dc2626", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:11 }}>Retry</button></div>;

  const selStyle={ padding:"8px 10px", fontSize:12, border:"1.5px solid #e2e8f0", borderRadius:8, color:"#475569", background:"#fff", outline:"none", cursor:"pointer" };
  const hasFilter=search||filterCollege!=="all"||filterBranch!=="all"||filterBatch!=="all"||filterStatus!=="all"||filterAI!=="all";

  // AI status badge
  const aiBadge = (s) => {
    const v=s.ai_validation_status||"PASS";
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:verdictColor(v), background:verdictBg(v), border:`1px solid ${verdictBorder(v)}`, padding:"2px 8px", borderRadius:20 }}>
        {verdictIcon(v)} {v}
      </span>
    );
  };

  return (
    <>
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94a3b8" }}>🔍</span>
          <input placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp(false), paddingLeft:34, height:38 }} />
        </div>
        <select style={selStyle} value={filterCollege} onChange={e=>setFilterCollege(e.target.value)}>
          <option value="all">All Colleges</option>
          {uniqueColleges.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selStyle} value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}>
          <option value="all">All Branches</option>
          {uniqueBranches.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <select style={selStyle} value={filterBatch} onChange={e=>setFilterBatch(e.target.value)}>
          <option value="all">All Batches</option>
          {uniqueBatches.map(b=><option key={b} value={b}>Batch {b}</option>)}
        </select>
        <select style={selStyle} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        {/* AI filter */}
        <select style={{ ...selStyle, borderColor:filterAI!=="all"?verdictBorder(filterAI):"#e2e8f0", color:filterAI!=="all"?verdictColor(filterAI):"#475569" }}
          value={filterAI} onChange={e=>setFilterAI(e.target.value)}>
          <option value="all">All AI Status</option>
          <option value="PASS">✅ AI Passed</option>
          <option value="WARN">⚠️ AI Warned</option>
          <option value="BLOCK">🚫 AI Blocked</option>
        </select>
        {hasFilter && <button onClick={()=>{setSearch("");setFilterCollege("all");setFilterBranch("all");setFilterBatch("all");setFilterStatus("all");setFilterAI("all");}} style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", fontSize:11, color:"#64748b", cursor:"pointer" }}>Clear</button>}
        <div style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>{filtered.length} of {students.length} students</div>
      </div>

      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,.07)", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,.06)" }}>
              {["Student","College","Branch","Batch","Status","AI Check","Password","Joined","Actions"].map(h=>(
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i) => {
              const av=avatarColor(s.name||"");
              const st=s.status||s.account_status||"active";
              const stColor=st==="active"?"#16a34a":st==="suspended"?"#dc2626":"#94a3b8";
              const stBg   =st==="active"?"#f0fdf4" :st==="suspended"?"#fef2f2" :"#f8fafc";
              const mustChange=s.must_change_password;
              return (
                <tr key={s.id} style={{ borderBottom:i<filtered.length-1?"1px solid rgba(0,0,0,.04)":"none", transition:"background .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8faff"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:av.bg, color:av.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{initials(s.name)}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{s.name}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#eff6ff", color:"#1d4ed8" }}>{s.college||"—"}</span>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#475569", fontWeight:500 }}>{s.branch||"—"}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#475569", fontFamily:"monospace", fontWeight:600 }}>{s.batch||"—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:stColor, background:stBg, padding:"3px 10px", borderRadius:20 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:stColor, display:"inline-block" }} />
                      {st.charAt(0).toUpperCase()+st.slice(1)}
                    </span>
                  </td>
                  {/* ── 🤖 AI badge ── */}
                  <td style={{ padding:"12px 16px" }}>{aiBadge(s)}</td>
                  <td style={{ padding:"12px 16px" }}>
                    {mustChange
                      ? <span title="Awaiting first login" style={{ fontSize:10, fontWeight:700, color:"#d97706", background:"#fffbeb", border:"1px solid #fde68a", padding:"3px 8px", borderRadius:20 }}>⏳ Temp</span>
                      : <span title="Password set by student" style={{ fontSize:10, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"3px 8px", borderRadius:20 }}>✓ Set</span>}
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#94a3b8" }}>{formatDate(s.created_at)}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>onEdit(s)} style={{ padding:"5px 12px", borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:11, fontWeight:600, color:"#2563eb", cursor:"pointer" }}>Edit</button>
                      <button onClick={()=>toggleStatus(s)} disabled={toggling===s.id}
                        style={{ padding:"5px 12px", borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", opacity:toggling===s.id?.6:1, color:st==="active"?"#dc2626":"#16a34a" }}>
                        {toggling===s.id?"…":st==="active"?"Deactivate":"Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={9} style={{ padding:48, textAlign:"center", color:"#94a3b8", fontSize:13 }}><div style={{ fontSize:28, marginBottom:8 }}>🎓</div>No students match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
        <button onClick={exportCSV} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:600, color:"#475569", cursor:"pointer" }}>
          📥 Export CSV ({filtered.length})
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function AdminStudentsPage({ apiFetch: apiFetchProp }) {
  const apiFetch = apiFetchProp || ((path, opts={}) => {
    const token=localStorage.getItem("token")||localStorage.getItem("authToken")||"";
    const isFormData=opts.body instanceof FormData;
    return fetch(`${API_BASE}${path}`, { ...opts, headers:{ Authorization:`Bearer ${token}`, ...(isFormData?{}:{"Content-Type":"application/json"}), ...opts.headers } });
  });

  const [formView,   setFormView]   = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast=(message,type="success")=>{setToast({message,type});setTimeout(()=>setToast(null),5000);};

  if (formView) {
    return (
      <div style={{ marginLeft:"230px", minHeight:"100vh", fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
        <Sidebar /><Navbar />
        {toast && <Toast message={toast.message} type={toast.type} />}
        <StudentForm mode={formView.mode} entity={formView.entity} apiFetch={apiFetch}
          onCreated={msg=>{setFormView(null);showToast(msg);setRefreshKey(k=>k+1);}}
          onSaved={msg  =>{setFormView(null);showToast(msg);setRefreshKey(k=>k+1);}}
          onBack={()=>setFormView(null)} />
      </div>
    );
  }

  return (
    <div style={{ marginLeft:"230px", display:"flex", flexDirection:"column", minHeight:"100vh", background:"#f4f6fb" }}>
      <Sidebar /><Navbar />
      {toast && <Toast message={toast.message} type={toast.type} />}

      {showImport && (
        <ImportWizard apiFetch={apiFetch} onClose={()=>setShowImport(false)}
          onSuccess={count=>{setShowImport(false);showToast(`${count} student${count!==1?"s":""} imported. Welcome emails with temp passwords are being sent.`);setRefreshKey(k=>k+1);}} />
      )}

      <div style={{ padding:"32px 36px", flex:1, fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#dbeafe", borderRadius:8, padding:"4px 12px", marginBottom:12 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#2563eb" }} />
              <span style={{ fontSize:11, fontWeight:700, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:1 }}>Student Management</span>
            </div>
            <h1 style={{ fontSize:24, fontWeight:800, color:"#1e293b", letterSpacing:"-.4px", margin:"0 0 6px" }}>Students</h1>
            <p style={{ color:"#94a3b8", fontSize:14, margin:0 }}>Add, edit, activate/deactivate, import and export student records. AI validation on every record.</p>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:4 }}>
            <button onClick={()=>setShowImport(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#fff", fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer" }}>
              📥 Import Students
            </button>
            <button onClick={()=>setFormView({mode:"create",entity:null})}
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:9, border:"none", background:"#2563eb", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>
              + Add Student
            </button>
          </div>
        </div>

        <StudentList apiFetch={apiFetch} refreshKey={refreshKey} onEdit={s=>setFormView({mode:"edit",entity:s})} />
      </div>
    </div>
  );
}