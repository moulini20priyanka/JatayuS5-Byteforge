// ── LangSmithPanel.jsx ───────────────────────────────────────────
// Calls backend proxy at /api/langsmith — no direct browser→LangSmith calls
// ────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

const BACKEND = (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net') + '/api/langsmith';
const LS_PROJECT = process.env.REACT_APP_LANGCHAIN_PROJECT || "neuroassess-dev";

const T = {
  primary:  "#1e3a8a", accent:   "#2563eb", accentLt: "#eff6ff",
  accentBd: "#bfdbfe", text:     "#1e293b", text2:    "#475569",
  text3:    "#94a3b8", white:    "#ffffff",
  green:    "#059669", greenBg:  "#ecfdf5", greenBd:  "#6ee7b7",
  red:      "#dc2626", redBg:    "#fef2f2", redBd:    "#fca5a5",
  amber:    "#d97706", amberBg:  "#fffbeb", amberBd:  "#fcd34d",
};

const AGENT_LABELS = {
  "decision-agent":              "Recruiter Decision",
  "reasoning-agent":             "Reasoning Agent",
  "resume-parser":               "Resume Parser",
  "proctoring-agent":            "Proctoring Agent",
  "ai-analyst":                  "AI Analyst",
  "question-generation-agent":   "Question Generator",
  "validation-agent":            "Validation Agent",
  "difficulty-classifier-agent": "Difficulty Classifier",
};

const agentLabel  = (n = "") => { const k = Object.keys(AGENT_LABELS).find(k => n.toLowerCase().includes(k)); return k ? AGENT_LABELS[k] : (n || "unknown"); };
const fmtTokens   = (n) => !n ? "—" : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
const fmtCost     = (n) => !n ? "—" : `$${Number(n).toFixed(4)}`;
const fmtLatency  = (s, e) => { if (!s||!e) return "—"; const ms = new Date(e)-new Date(s); return isNaN(ms)||ms<=0?"—":ms>=1000?`${(ms/1000).toFixed(1)}s`:`${ms}ms`; };
const fmtTime     = (ts) => { if (!ts) return "—"; try { return new Date(ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); } catch { return "—"; } };
const statusColor = (s) => s==="success"?T.green  : s==="error"?T.red  : T.amber;
const statusBg    = (s) => s==="success"?T.greenBg: s==="error"?T.redBg: T.amberBg;
const statusBd    = (s) => s==="success"?T.greenBd: s==="error"?T.redBd: T.amberBd;

export default function LangSmithPanel() {
  const [runs, setRuns]               = useState([]);
  const [stats, setStats]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [collapsed, setCollapsed]     = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const runsRes = await fetch(`${BACKEND}/runs?limit=30`);
      if (!runsRes.ok) {
        const err = await runsRes.json().catch(() => ({}));
        throw new Error(err.error || `Backend error ${runsRes.status}`);
      }
      const arr = await runsRes.json();
      const runs = Array.isArray(arr) ? arr : [];
      setRuns(runs);
      setLastRefresh(new Date().toLocaleTimeString("en-GB"));
      if (runs.length > 0) setSelected(prev => prev ?? runs[0]);

      // Stats
      const statsRes = await fetch(`${BACKEND}/stats`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        const s = runs.filter(r=>r.status==="success");
        const e = runs.filter(r=>r.status==="error");
        const lats = s.filter(r=>r.start_time&&r.end_time).map(r=>new Date(r.end_time)-new Date(r.start_time));
        setStats({
          total: runs.length, successful: s.length, errored: e.length,
          totalTokens: runs.reduce((a,r)=>a+(r.total_tokens||0),0),
          avgLatencyMs: lats.length ? Math.round(lats.reduce((a,b)=>a+b,0)/lats.length) : 0,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);
  useEffect(() => { const id = setInterval(fetchRuns, 30000); return () => clearInterval(id); }, [fetchRuns]);

  return (
    <div style={{ background:T.white, border:`1px solid ${T.accentBd}`, borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(37,99,235,0.06)", marginBottom:20 }}>
      <style>{`
        @keyframes lsPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
        .ls-row:hover{background:${T.accentLt}!important;cursor:pointer;}
      `}</style>

      {/* Header */}
      <div onClick={()=>setCollapsed(c=>!c)} style={{ padding:"14px 20px", borderBottom:collapsed?"none":`1px solid ${T.accentLt}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"linear-gradient(to right,#f0f9ff,#fff)", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:error?T.amber:"#22c55e", display:"inline-block", animation:error?"none":"lsPulse 2s infinite" }} />
          <span style={{ fontSize:14, fontWeight:700, color:T.primary }}>LangSmith — Agent Traces</span>
          {lastRefresh && !collapsed && <span style={{ fontSize:11, color:T.text3 }}>· updated {lastRefresh}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={e=>{e.stopPropagation();fetchRuns();}} disabled={loading} style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:600, background:T.accentLt, color:T.accent, border:`1px solid ${T.accentBd}`, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1 }}>
            {loading ? "Loading…" : "↺ Refresh"}
          </button>
          <span style={{ fontSize:16, color:T.text3, userSelect:"none" }}>{collapsed?"▸":"▾"}</span>
        </div>
      </div>

      {!collapsed && <>

        {/* Error — only show for real errors, not empty project */}
        {error && (
          <div style={{ margin:"12px 16px", padding:"10px 14px", background:T.amberBg, border:`1px solid ${T.amberBd}`, borderRadius:8, fontSize:12, color:T.amber }}>
            <strong>⚠ {error}</strong>
            <div style={{ marginTop:6, fontFamily:"monospace", fontSize:11, color:"#92400e", lineHeight:1.8 }}>
              Check backend .env:<br/>
              LANGCHAIN_API_KEY=ls__your_key<br/>
              LANGCHAIN_PROJECT=neuroassess-dev
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:1, borderBottom:`1px solid ${T.accentLt}`, background:T.accentLt }}>
            {[
              ["Total Runs",  stats.total,                                           T.primary],
              ["Successful",  stats.successful,                                      T.green],
              ["Errors",      stats.errored,       stats.errored>0?T.red:T.text3],
              ["Tokens",      fmtTokens(stats.totalTokens),                         T.accent],
              ["Avg Latency", stats.avgLatencyMs ? `${stats.avgLatencyMs}ms` : "—", T.primary],
            ].map(([label,value,color])=>(
              <div key={label} style={{ padding:"10px 14px", background:T.white, textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, color, lineHeight:1.2 }}>{value}</div>
                <div style={{ fontSize:10, color:T.text3, marginTop:2, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", minHeight:220 }}>

          {/* Run list */}
          <div style={{ borderRight:`1px solid ${T.accentLt}`, overflowY:"auto", maxHeight:300 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 70px 60px", padding:"7px 14px", fontSize:10, fontWeight:700, color:T.accent, textTransform:"uppercase", letterSpacing:"0.5px", background:T.accentLt, borderBottom:`1px solid ${T.accentBd}`, position:"sticky", top:0 }}>
              <span>Agent</span><span style={{textAlign:"right"}}>Tokens</span><span style={{textAlign:"right"}}>Latency</span><span style={{textAlign:"center"}}>Status</span>
            </div>

            {loading && <div style={{ padding:24, textAlign:"center", color:T.text3, fontSize:12 }}>Fetching traces…</div>}

            {!loading && !error && runs.length === 0 && (
              <div style={{ padding:32, textAlign:"center", color:T.text3, fontSize:12, lineHeight:2 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
                <strong style={{ color:T.primary, fontSize:13 }}>No traces yet</strong><br/>
                Project <strong style={{ color:T.accent }}>{LS_PROJECT}</strong> is ready.<br/>
                Run any agent — traces will appear here automatically.
              </div>
            )}

            {runs.map(run => (
              <div key={run.id} className="ls-row" onClick={()=>setSelected(run)} style={{ display:"grid", gridTemplateColumns:"1fr 80px 70px 60px", padding:"9px 14px", borderBottom:`1px solid ${T.accentLt}`, alignItems:"center", background:selected?.id===run.id?T.accentLt:T.white, borderLeft:selected?.id===run.id?`3px solid ${T.accent}`:"3px solid transparent" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background:statusColor(run.status) }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:T.primary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{agentLabel(run.name)}</span>
                </div>
                <span style={{ fontSize:11, color:T.text2, textAlign:"right", fontFamily:"monospace" }}>{fmtTokens(run.total_tokens)}</span>
                <span style={{ fontSize:11, color:T.text2, textAlign:"right", fontFamily:"monospace" }}>{fmtLatency(run.start_time,run.end_time)}</span>
                <div style={{ textAlign:"center" }}>
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:10, background:statusBg(run.status), color:statusColor(run.status), border:`1px solid ${statusBd(run.status)}`, textTransform:"uppercase" }}>{run.status||"running"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail */}
          {selected ? (
            <div style={{ padding:14, overflowY:"auto", maxHeight:300 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10 }}>{agentLabel(selected.name)}</div>
              {[
                ["Status",     <span style={{color:statusColor(selected.status),fontWeight:600}}>{selected.status}</span>],
                ["Time",       fmtTime(selected.start_time)],
                ["Latency",    fmtLatency(selected.start_time,selected.end_time)],
                ["Tokens in",  fmtTokens(selected.prompt_tokens)],
                ["Tokens out", fmtTokens(selected.completion_tokens)],
                ["Total tok",  fmtTokens(selected.total_tokens)],
                ["Cost",       fmtCost(selected.total_cost)],
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.accentLt}`, fontSize:11 }}>
                  <span style={{ color:T.text3, fontWeight:500 }}>{k}</span>
                  <span style={{ color:T.text, fontWeight:600, fontFamily:typeof v==="string"?"monospace":"inherit" }}>{v}</span>
                </div>
              ))}
              {selected.inputs && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.accent, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Input</div>
                  <pre style={{ fontSize:10, background:T.accentLt, border:`1px solid ${T.accentBd}`, borderRadius:6, padding:8, color:T.text, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:80, overflowY:"auto", margin:0 }}>
                    {JSON.stringify(selected.inputs,null,2).slice(0,400)}{JSON.stringify(selected.inputs).length>400?"\n…":""}
                  </pre>
                </div>
              )}
              {selected.outputs && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.green, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Output</div>
                  <pre style={{ fontSize:10, background:T.greenBg, border:`1px solid ${T.greenBd}`, borderRadius:6, padding:8, color:T.text, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:80, overflowY:"auto", margin:0 }}>
                    {JSON.stringify(selected.outputs,null,2).slice(0,400)}{JSON.stringify(selected.outputs).length>400?"\n…":""}
                  </pre>
                </div>
              )}
              {selected.error && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.red, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Error</div>
                  <pre style={{ fontSize:10, background:T.redBg, border:`1px solid ${T.redBd}`, borderRadius:6, padding:8, color:T.red, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>{selected.error}</pre>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:T.text3, fontSize:12, padding:24 }}>
              Click a run to see details
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"8px 16px", borderTop:`1px solid ${T.accentLt}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:T.accentLt }}>
          <span style={{ fontSize:11, color:T.text3 }}>
            Project: <strong style={{ color:T.accent }}>{LS_PROJECT}</strong> · Auto-refreshes every 30s
          </span>
          <a href="https://smith.langchain.com" target="_blank" rel="noreferrer" style={{ fontSize:11, color:T.accent, fontWeight:600, textDecoration:"none" }}>Open LangSmith ↗</a>
        </div>
      </>}
    </div>
  );
}

