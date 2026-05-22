// frontend/src/components/ValidationAgentPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 🤖 AI Validation Agent Panel
//
// AI used: Groq llama-3.3-70b-versatile — called via backend API
//          which proxies to /api/candidates/validate/single or /bulk
//
// Props:
//   mode         : 'single' | 'bulk'
//   student      : object  (mode=single)
//   students     : array   (mode=bulk)
//   apiBase      : string  (e.g. (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api'))
//   onResult     : (result) => void
//   onBulkResult : (results, summary) => void
//   autoTrigger  : bool
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function verdictColor(verdict) {
  return { PASS: '#16a34a', WARN: '#d97706', BLOCK: '#dc2626' }[verdict] || '#64748b';
}
function verdictBg(verdict) {
  return { PASS: '#f0fdf4', WARN: '#fffbeb', BLOCK: '#fef2f2' }[verdict] || '#f8fafc';
}
function verdictBorder(verdict) {
  return { PASS: '#bbf7d0', WARN: '#fde68a', BLOCK: '#fca5a5' }[verdict] || '#e2e8f0';
}
function verdictIcon(verdict) {
  return { PASS: '✅', WARN: '⚠️', BLOCK: '🚫' }[verdict] || '❓';
}
function severityColor(sev) {
  return { error: '#dc2626', warning: '#d97706', info: '#2563eb' }[sev] || '#475569';
}
function severityBg(sev) {
  return { error: '#fef2f2', warning: '#fffbeb', info: '#eff6ff' }[sev] || '#f8fafc';
}
function severityIcon(sev) {
  return { error: '❌', warning: '⚠️', info: 'ℹ️' }[sev] || '•';
}

const AI_LABEL = 'Groq · Llama 3.3 70B';

function RiskMeter({ score }) {
  const color = score >= 60 ? '#dc2626' : score >= 30 ? '#d97706' : '#16a34a';
  const label = score >= 60 ? 'HIGH RISK' : score >= 30 ? 'MEDIUM RISK' : 'LOW RISK';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`, borderRadius: 99,
          background: `linear-gradient(90deg, #16a34a, ${score >= 60 ? '#dc2626' : score >= 30 ? '#f59e0b' : '#16a34a'})`,
          transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color, minWidth: 44, textAlign: 'right', letterSpacing: .5 }}>
        {score}/100
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color, background: severityBg(score >= 60 ? 'error' : score >= 30 ? 'warning' : 'info'), padding: '2px 8px', borderRadius: 20, letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

function FlagList({ flags, label }) {
  if (!flags?.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {flags.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: severityBg(f.severity), border: `1px solid ${f.severity === 'error' ? '#fca5a5' : f.severity === 'warning' ? '#fde68a' : '#bfdbfe'}`,
            borderRadius: 7, padding: '6px 10px',
          }}>
            <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{severityIcon(f.severity)}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: severityColor(f.severity), fontWeight: 600 }}>{f.message}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace' }}>[{f.code}]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single validation result card ─────────────────────────────────────────────
function SingleResultCard({ result }) {
  const [expanded, setExpanded] = useState(result.verdict !== 'PASS');
  const allFlags = [...(result.issues || []), ...(result.warnings || []), ...(result.aiFlags || [])];
  const errorFlags = allFlags.filter(f => f.severity === 'error');
  const warnFlags  = allFlags.filter(f => f.severity !== 'error');

  return (
    <div style={{
      border: `2px solid ${verdictBorder(result.verdict)}`,
      borderRadius: 12, overflow: 'hidden', marginBottom: 8,
      background: '#fff',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: verdictBg(result.verdict), cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{verdictIcon(result.verdict)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
              {result.name || result.email}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{result.email}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: verdictColor(result.verdict), textTransform: 'uppercase', letterSpacing: .8 }}>
              {result.verdict}
            </span>
            {result.isDuplicate && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: 20 }}>
                DUPLICATE
              </span>
            )}
            {result.nearDuplicates?.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '1px 6px', borderRadius: 20 }}>
                NEAR-DUP
              </span>
            )}
            {result.aiVerdict && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: 20 }}>
                AI:{result.aiVerdict}
              </span>
            )}
            {allFlags.length > 0 && (
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {allFlags.length} flag{allFlags.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: verdictColor(result.verdict), flexShrink: 0 }}>
          {result.riskScore}/100
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${verdictBorder(result.verdict)}` }}>
          <RiskMeter score={result.riskScore} />

          {result.aiReason && (
            <div style={{ margin: '10px 0 0', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1d4ed8', lineHeight: 1.5 }}>
              <strong>🤖 AI Analysis ({AI_LABEL}):</strong> {result.aiReason}
            </div>
          )}

          {result.isDuplicate && result.existingRecord && (
            <div style={{ margin: '10px 0 0', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#5b21b6' }}>
              <strong>🔍 Existing Record:</strong> {result.existingRecord.name} — {result.existingRecord.college}, {result.existingRecord.branch}
              {result.existingRecord.created_at && ` (joined ${new Date(result.existingRecord.created_at).toLocaleDateString('en-IN')})`}
            </div>
          )}

          {result.nearDuplicates?.length > 0 && (
            <div style={{ margin: '10px 0 0', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
              <strong>🔗 Near-Duplicates in Batch:</strong>{' '}
              {result.nearDuplicates.map(nd => `Row ${nd.indexB + 1} (${nd.emailB}, distance:${nd.distance})`).join('; ')}
            </div>
          )}

          <FlagList flags={errorFlags} label="Errors — Blocked" />
          <FlagList flags={warnFlags}  label="Warnings / Info" />
        </div>
      )}
    </div>
  );
}

// ── Bulk summary bar ──────────────────────────────────────────────────────────
function BulkSummaryBar({ summary, onFilter, activeFilter }) {
  if (!summary) return null;
  const stats = [
    { key: 'all',   label: 'Total',    value: summary.total,      color: '#475569', bg: '#f8fafc',  border: '#e2e8f0' },
    { key: 'PASS',  label: 'Clean',    value: summary.passed,     color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0' },
    { key: 'WARN',  label: 'Warnings', value: summary.warned,     color: '#d97706', bg: '#fffbeb',  border: '#fde68a' },
    { key: 'BLOCK', label: 'Blocked',  value: summary.blocked,    color: '#dc2626', bg: '#fef2f2',  border: '#fca5a5' },
    { key: 'DUP',   label: 'Duplicates', value: summary.duplicates, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {stats.map(s => (
        <button key={s.key}
          onClick={() => onFilter(s.key === activeFilter ? 'all' : s.key)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 16px', border: `2px solid ${activeFilter === s.key ? s.color : s.border}`,
            borderRadius: 10, background: activeFilter === s.key ? s.bg : '#fff',
            cursor: 'pointer', transition: 'all .15s',
          }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: .8 }}>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ValidationAgentPanel({
  mode         = 'single',
  student      = null,
  students     = [],
  apiBase      = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net',
  onResult     = null,
  onBulkResult = null,
  autoTrigger  = false,
}) {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [summary,     setSummary]     = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [expanded,    setExpanded]    = useState(true);
  const prevKey = useRef('');

  const token = () => localStorage.getItem('token') || localStorage.getItem('authToken') || '';

  // Auto-trigger when student prop changes (debounced 600ms)
  useEffect(() => {
    if (!autoTrigger || mode !== 'single' || !student?.email) return;
    const key = `${student.name}|${student.email}|${student.college}|${student.branch}|${student.batch}`;
    if (key === prevKey.current) return;
    prevKey.current = key;
    const t = setTimeout(() => runValidation(), 600);
    return () => clearTimeout(t);
  }, [student, autoTrigger]);

  const runValidation = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setBulkResults(null);
    setSummary(null);

    try {
      if (mode === 'single') {
        const res  = await fetch(`${apiBase}/candidates/validate/single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body:    JSON.stringify(student),
        });
        if (!res.ok) {
          const text = await res.text();
          // Catch HTML error pages (route not found, server crash, etc.)
          if (text.trim().startsWith('<')) {
            setError(`Server returned an error page (HTTP ${res.status}). Check that /api/candidates/validate is mounted correctly in server.js.`);
          } else {
            const data = JSON.parse(text);
            setError(data.message || 'Validation failed');
          }
          return;
        }
        const data = await res.json();
        if (!data.success) { setError(data.message || 'Validation failed'); return; }
        setResult(data.validation);
        onResult?.(data.validation);

      } else {
        const res  = await fetch(`${apiBase}/candidates/validate/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body:    JSON.stringify({ students }),
        });
        if (!res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('<')) {
            setError(`Server returned an error page (HTTP ${res.status}). Check that /api/candidates/validate is mounted correctly in server.js.`);
          } else {
            const data = JSON.parse(text);
            setError(data.message || 'Bulk validation failed');
          }
          return;
        }
        const data = await res.json();
        if (!data.success) { setError(data.message || 'Bulk validation failed'); return; }
        setBulkResults(data.results);
        setSummary(data.summary);
        onBulkResult?.(data.results, data.summary);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, student, students, apiBase, onResult, onBulkResult]);

  const filteredBulk = bulkResults?.filter(r => {
    if (filter === 'all')  return true;
    if (filter === 'DUP')  return r.isDuplicate;
    return r.verdict === filter;
  }) || [];

  return (
    <div style={{
      border: '2px solid #e2e8f0', borderRadius: 14, overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      background: '#fff',
    }}>
      {/* Panel header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: -.2 }}>
            AI Validation Agent
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
            {AI_LABEL} · Rule Engine · Duplicate Detector
          </div>
        </div>

        {result && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: verdictBg(result.verdict), border: `1.5px solid ${verdictBorder(result.verdict)}`, borderRadius: 20, padding: '3px 10px' }}>
            <span style={{ fontSize: 12 }}>{verdictIcon(result.verdict)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: verdictColor(result.verdict) }}>{result.verdict}</span>
          </div>
        )}
        {summary && !loading && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ v: 'PASS', n: summary.passed }, { v: 'WARN', n: summary.warned }, { v: 'BLOCK', n: summary.blocked }].map(({ v, n }) => n > 0 && (
              <div key={v} style={{ background: verdictBg(v), border: `1px solid ${verdictBorder(v)}`, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700, color: verdictColor(v) }}>
                {n} {v}
              </div>
            ))}
          </div>
        )}

        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: 16 }}>

          {/* Info + trigger button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                <strong>Multi-layer validation:</strong>{' '}
                {mode === 'single'
                  ? 'Checks email format, disposable domains, duplicate detection in database, and semantic AI analysis before the record is saved.'
                  : `Validates all ${students.length} record(s) — rule engine + database duplicate check + within-batch near-duplicate scan + Groq AI semantic analysis.`
                }
              </div>
              {mode === 'bulk' && students.length > 0 && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  📊 {students.length} records to validate — AI batched in groups of 30
                </div>
              )}
            </div>
            <button
              onClick={runValidation}
              disabled={loading || (mode === 'single' ? !student?.email : !students.length)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: '9px 16px', borderRadius: 9, border: 'none',
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 12,
                cursor: (loading || (mode === 'single' ? !student?.email : !students.length)) ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
              }}
            >
              {loading
                ? <><SpinIcon /> Validating…</>
                : <><ShieldIcon /> Run AI Validation</>
              }
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 48, height: 48 }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 8, border: '2px solid #bfdbfe', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 1.1s linear infinite reverse' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Running AI validation pipeline…</div>
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                Layer 1: Rules · Layer 2: DB Duplicates · Layer 3: Near-Dups · Layer 4: Groq AI
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {/* SINGLE RESULT */}
          {!loading && result && mode === 'single' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: verdictBg(result.verdict), border: `2px solid ${verdictBorder(result.verdict)}`,
                borderRadius: 10, marginBottom: 12,
              }}>
                <span style={{ fontSize: 24 }}>{verdictIcon(result.verdict)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: verdictColor(result.verdict) }}>
                    {result.verdict === 'PASS'  && 'Validation Passed — Safe to proceed'}
                    {result.verdict === 'WARN'  && 'Validation Warning — Review before saving'}
                    {result.verdict === 'BLOCK' && 'Validation Blocked — Record cannot be saved'}
                  </div>
                  {result.aiReason && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>🤖 {result.aiReason}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: verdictColor(result.verdict) }}>{result.riskScore}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Risk Score</div>
                </div>
              </div>

              <RiskMeter score={result.riskScore} />

              {result.isDuplicate && result.existingRecord && (
                <div style={{ margin: '12px 0 0', background: '#f5f3ff', border: '1.5px solid #a78bfa', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>🔍 Duplicate Record Found in Database</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['ID',      result.existingRecord.id],
                      ['Name',    result.existingRecord.name],
                      ['College', result.existingRecord.college],
                      ['Joined',  result.existingRecord.created_at ? new Date(result.existingRecord.created_at).toLocaleDateString('en-IN') : '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{v || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FlagList flags={result.issues}  label="Errors (blocking)" />
              <FlagList flags={result.warnings} label="Warnings" />
              <FlagList flags={result.aiFlags}  label={`AI Flags (${AI_LABEL})`} />

              {result.verdict === 'PASS' && (
                <div style={{ marginTop: 12, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#15803d', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span>✅</span>
                  <span>All validation layers passed — record is safe to add to the database.</span>
                </div>
              )}
            </div>
          )}

          {/* BULK RESULTS */}
          {!loading && bulkResults && mode === 'bulk' && summary && (
            <div>
              <div style={{
                background: summary.blocked > 0 ? '#fef2f2' : summary.warned > 0 ? '#fffbeb' : '#f0fdf4',
                border: `2px solid ${summary.blocked > 0 ? '#fca5a5' : summary.warned > 0 ? '#fde68a' : '#bbf7d0'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {summary.blocked > 0 ? '🚫' : summary.warned > 0 ? '⚠️' : '✅'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    Bulk Validation Complete — {summary.canImport} of {summary.total} records safe to import
                  </span>
                  {summary.aiUsed && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 20, marginLeft: 'auto' }}>
                      🤖 {AI_LABEL}
                    </span>
                  )}
                </div>
                {summary.blocked > 0 && (
                  <div style={{ fontSize: 12, color: '#dc2626' }}>
                    {summary.blocked} record{summary.blocked !== 1 ? 's' : ''} will be blocked from import.
                    {summary.duplicates > 0 && ` ${summary.duplicates} duplicate${summary.duplicates !== 1 ? 's' : ''} detected.`}
                  </div>
                )}
              </div>

              <BulkSummaryBar summary={summary} onFilter={setFilter} activeFilter={filter} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8 }}>
                  {filter === 'all' ? `All ${bulkResults.length} records` : `${filteredBulk.length} ${filter} records`}
                </div>
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Show all ✕
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 2 }}>
                {filteredBulk.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                    No records match this filter.
                  </div>
                ) : (
                  filteredBulk.slice(0, 200).map(r => (
                    <SingleResultCard key={r.index} result={r} />
                  ))
                )}
                {filteredBulk.length > 200 && (
                  <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: '#94a3b8' }}>
                    Showing first 200 of {filteredBulk.length} — use filters to narrow down.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin .7s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}


