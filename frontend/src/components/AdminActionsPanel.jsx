// AdminActionsPanel.jsx
// Drop-in component for Live Monitoring — Flag/Remove student with reason field
// Import and use inside LiveMonitoring.jsx candidate detail view

import { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const REMOVE_REASONS = [
  'Suspected cheating — mobile phone detected',
  'Multiple face violations',
  'Location violation — left exam area',
  'Identity mismatch',
  'Repeated tab switching',
  'Admin discretion',
  'Other (specify below)',
];

export function AdminActionsPanel({ candidate, onClose, onAction }) {
  const [mode,       setMode]       = useState(null); // 'flag' | 'remove'
  const [reason,     setReason]     = useState('');
  const [customNote, setCustomNote] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const finalReason = reason === 'Other (specify below)' ? customNote : reason;
  const canSubmit   = finalReason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const url    = mode === 'flag'
        ? `${API}/proctoring/admin/flag/${candidate.assignment_id}`
        : `${API}/proctoring/admin/terminate/${candidate.assignment_id}`;
      const res    = await fetch(url, {
        method:  'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason: finalReason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDone(true);
      setTimeout(() => { onAction?.(mode, candidate, finalReason); onClose(); }, 1500);
    } catch (e) {
      setError(e.message || 'Action failed');
    }
    setLoading(false);
  }

  const S = {
    backdrop:{ position:'fixed', inset:0, background:'rgba(15,23,42,.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
    modal:   { background:'#fff', borderRadius:14, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden' },
    head:    { padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between' },
    body:    { padding:'18px 20px' },
    foot:    { padding:'14px 20px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end' },
    btn:     { padding:'9px 20px', borderRadius:8, border:'none', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
    input:   { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:8 },
    radio:   { display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, cursor:'pointer', marginBottom:4, border:'1px solid transparent' },
  };

  if (done) return (
    <div style={S.backdrop}>
      <div style={{ ...S.modal, textAlign:'center', padding:'32px 24px' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>{mode==='flag'?'🚩':'⛔'}</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:6 }}>{mode==='flag'?'Student Flagged':'Student Removed'}</div>
        <div style={{ fontSize:13, color:'#64748b' }}>{finalReason}</div>
      </div>
    </div>
  );

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={S.head}>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>Admin Action</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{candidate.student_name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:6, width:28, height:28, cursor:'pointer' }}>✕</button>
        </div>

        <div style={S.body}>
          {!mode ? (
            <>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>Choose an action for this student:</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setMode('flag')} style={{ ...S.btn, flex:1, background:'#fffbeb', color:'#d97706', border:'1px solid #fcd34d' }}>
                  🚩 Flag as Suspicious
                </button>
                <button onClick={()=>setMode('remove')} style={{ ...S.btn, flex:1, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>
                  ⛔ Remove from Exam
                </button>
              </div>
              <div style={{ marginTop:12, padding:'10px 12px', background:'#f8fafc', borderRadius:8, fontSize:11, color:'#94a3b8' }}>
                <strong>Flag:</strong> Marks student as suspicious for review. Exam continues.<br/>
                <strong>Remove:</strong> Terminates student's exam session immediately.
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <span style={{ fontSize:18 }}>{mode==='flag'?'🚩':'⛔'}</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>{mode==='flag'?'Flag Student':'Remove from Exam'}</span>
                <button onClick={()=>{setMode(null);setReason('');setCustomNote('');}} style={{ marginLeft:'auto', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:12 }}>← Back</button>
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:8, letterSpacing:'.5px' }}>SELECT REASON (REQUIRED)</div>

              {REMOVE_REASONS.map(r => (
                <label key={r} style={{ ...S.radio, background:reason===r?'#f0f9ff':'transparent', border:`1px solid ${reason===r?'#bae6fd':'transparent'}`, cursor:'pointer' }}>
                  <input type="radio" name="reason" value={r} checked={reason===r} onChange={()=>setReason(r)} style={{ accentColor:'#0891b2' }} />
                  <span style={{ fontSize:12, color:'#334155' }}>{r}</span>
                </label>
              ))}

              {reason === 'Other (specify below)' && (
                <textarea
                  value={customNote}
                  onChange={e=>setCustomNote(e.target.value)}
                  placeholder="Describe the reason in detail..."
                  rows={3}
                  style={{ ...S.input, resize:'vertical', marginTop:6 }}
                />
              )}

              {error && <div style={{ padding:'8px 10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:7, fontSize:12, color:'#dc2626', marginTop:8 }}>{error}</div>}
            </>
          )}
        </div>

        {mode && (
          <div style={S.foot}>
            <button onClick={onClose} style={{ ...S.btn, background:'#f1f5f9', color:'#64748b' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!canSubmit || loading} style={{ ...S.btn, background: mode==='flag'?'#d97706':'#dc2626', color:'#fff', opacity:(!canSubmit||loading)?0.5:1, cursor:(!canSubmit||loading)?'not-allowed':'pointer' }}>
              {loading ? 'Processing…' : mode==='flag' ? '🚩 Flag Student' : '⛔ Remove Student'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Violation count indicator for live table ──────────────────
export function ViolationCounter({ count, high }) {
  if (!count) return <span style={{ color:'#94a3b8' }}>0</span>;
  const color = high > 0 ? '#dc2626' : count > 2 ? '#d97706' : '#64748b';
  return (
    <span style={{ fontWeight:700, color, display:'inline-flex', alignItems:'center', gap:4 }}>
      {count}
      {high > 0 && <span style={{ fontSize:9, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:99, padding:'0 5px', color:'#dc2626' }}>{high} HIGH</span>}
    </span>
  );
}

// ── Hook: POST violation to backend ──────────────────────────
export async function postViolation({ assignmentId, examId, type, message, severity = 'medium', snapshot = null }) {
  const token = localStorage.getItem('token') || '';
  try {
    const res = await fetch(`${API}/proctoring/violation`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        assignment_id: assignmentId,
        exam_id:       examId,
        type,
        message,
        severity,
        snapshot,
        timestamp: new Date().toISOString(),
      }),
    });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}


