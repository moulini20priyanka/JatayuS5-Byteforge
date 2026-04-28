import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';

/* ── Leaflet CSS ── */
if (!document.getElementById("leaflet-css-lm")) {
  const l = document.createElement("link");
  l.id = "leaflet-css-lm"; l.rel = "stylesheet";
  l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(l);
}

/* ══════════════════════════════════════════════════
   MOCK DATA
══════════════════════════════════════════════════ */
const INITIAL_SESSIONS = [
  { sessionId:'sess-001', candidateId:'s_003', name:'Lokshana Dharshini', lat:13.0827, lng:80.2707, trustScore:92, riskLevel:'low',    flagCount:0, pingCount:12, status:'active',    exam:'Full Stack',     alert:'No Alert',               alertMsg:null },
  { sessionId:'sess-002', candidateId:'s_001', name:'Moulini S',           lat:12.9716, lng:77.5946, trustScore:61, riskLevel:'medium', flagCount:2, pingCount:18, status:'warned',    exam:'Full Stack',       alert:'Tab Switch Detected',    alertMsg:'Tab switch ×2' },
  { sessionId:'sess-003', candidateId:'s_002', name:'Shreya S',          lat:13.0100, lng:80.1200, trustScore:34, riskLevel:'medium',   flagCount:5, pingCount:22, status:'escalated', exam:'Full Stack',     alert:'Multiple Faces Detected',alertMsg:'Multiple faces at 10:41' },
  { sessionId:'sess-004', candidateId:'s_005', name:'Anusha P M',         lat:13.1500, lng:80.3000, trustScore:78, riskLevel:'low',    flagCount:0, pingCount:9,  status:'active',    exam:'Full Stack',         alert:'No Alert',               alertMsg:null },
  { sessionId:'sess-005', candidateId:'s_004', name:'Kavithaa K A',       lat:12.8396, lng:80.1534, trustScore:27, riskLevel:'high',   flagCount:7, pingCount:30, status:'escalated', exam:'Full Stack',  alert:'Mobile Phone Detected',  alertMsg:'Phone detected at 10:55' },
  { sessionId:'sess-006', candidateId:'s_009', name:'Kanagavel V',        lat:13.0500, lng:80.2500, trustScore:55, riskLevel:'medium', flagCount:3, pingCount:15, status:'warned',    exam:'UI UX',          alert:'No Face Detected',       alertMsg:'Face not detected ×2' },
  { sessionId:'sess-007', candidateId:'s_010', name:'Kamala Vasanthi',    lat:12.9279, lng:79.1589, trustScore:85, riskLevel:'low',    flagCount:1, pingCount:20, status:'active',    exam:'Ai analyst', alert:'No Alert',               alertMsg:null },
];

const ALERT_TYPES = ['Tab Switch Detected','Multiple Faces Detected','No Face Detected','Mobile Phone Detected','Geofence Violation'];
const ALERT_ICONS = { 'Tab Switch Detected':'🖥️','Multiple Faces Detected':'👥','No Face Detected':'😶','Mobile Phone Detected':'📱','Geofence Violation':'📍','No Alert':null };

function riskColor(r) { return r==='high'?'#ef4444':r==='medium'?'#f59e0b':'#22c55e'; }
function riskBg(r)    { return r==='high'?'#fef2f2':r==='medium'?'#fffbeb':'#f0fdf4'; }
function getRisk(t)   { return t<40?'high':t<70?'medium':'low'; }
function randBetween(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ── Risk Badge ── */
function RiskBadge({ risk }) {
  const r = { High:'high', Medium:'medium', Low:'low' }[risk] || risk;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, background:riskBg(r), color:riskColor(r) }}>
      {r==='high'?'🔴':r==='medium'?'🟡':'🟢'} {risk}
    </span>
  );
}

/* ── Alert Badge ── */
function AlertBadge({ alert }) {
  if (alert==='No Alert') return <span style={{ color:'#9ca3af', fontSize:13 }}>—</span>;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, color:'#dc2626', fontWeight:500 }}>
      {ALERT_ICONS[alert]||'⚠️'} {alert}
    </span>
  );
}

/* ── Toast Stack ── */
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:'#1e293b', color:'#fff', padding:'11px 18px', borderRadius:10,
          fontSize:13, fontWeight:500, maxWidth:320,
          borderLeft:`4px solid ${t.type==='danger'?'#ef4444':t.type==='warn'?'#f59e0b':'#22c55e'}`,
          boxShadow:'0 8px 28px rgba(0,0,0,0.22)',
          animation:'slideInRight 0.3s cubic-bezier(.22,1,.36,1)',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   REVIEW MODAL
══════════════════════════════════════════════════ */
function ReviewModal({ candidate, sessions, onClose, onTerminate }) {
  if (!candidate) return null;

  const color = candidate.risk === 'High' ? '#ef4444' : candidate.risk === 'Medium' ? '#f59e0b' : '#22c55e';
  // Get live session data (trust score may have updated via simulation)
  const liveSession = sessions.find(s => s.sessionId === candidate.sessionId) || {};

  const initials = candidate.candidate.split(' ').map(n => n[0]).join('').slice(0, 2);

  const alertHistory = [
    candidate.alert !== 'No Alert' && { type: candidate.alert, time: candidate.time, msg: liveSession.alertMsg },
  ].filter(Boolean);

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
        zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#fff', borderRadius:18, width:540, maxHeight:'88vh',
          overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,0.28)',
          border:`2px solid ${color}33`, animation:'modalIn 0.22s cubic-bezier(.22,1,.36,1)',
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding:'20px 24px', borderBottom:'1px solid #f1f5f9',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:`linear-gradient(135deg, ${color}08, #fff)`,
          borderRadius:'18px 18px 0 0',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:'50%',
              background:`linear-gradient(135deg, ${color}33, ${color}11)`,
              color, fontWeight:800, fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:`2px solid ${color}44`,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:'#0f172a' }}>{candidate.candidate}</div>
              <div style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace', marginTop:2 }}>
                {candidate.candidateId} · {candidate.exam}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <RiskBadge risk={candidate.risk} />
            <button
              onClick={onClose}
              style={{
                background:'#f1f5f9', border:'none', borderRadius:8,
                width:32, height:32, cursor:'pointer', fontSize:16, color:'#64748b',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Trust Score */}
          <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>🎯 Trust Score</span>
              <span style={{ fontSize:20, fontWeight:800, color, fontFamily:'monospace' }}>
                {liveSession.trustScore ?? candidate.count}/100
              </span>
            </div>
            <div style={{ background:'#e5e7eb', borderRadius:99, height:10, overflow:'hidden' }}>
              <div style={{
                width:`${liveSession.trustScore ?? 50}%`, height:'100%',
                background:`linear-gradient(90deg, ${color}, ${color}bb)`,
                borderRadius:99, transition:'width .6s',
              }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#9ca3af', marginTop:6 }}>
              <span>0 — High Risk</span><span>100 — Fully Trusted</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'Status',     value: candidate.status,       color: candidate.status==='Escalated'?'#dc2626':candidate.status==='Warned'?'#d97706':'#16a34a' },
              { label:'Flags',      value: `×${liveSession.flagCount ?? candidate.count}`, color: (liveSession.flagCount ?? candidate.count) > 0 ? '#dc2626' : '#374151' },
              { label:'Pings',      value: liveSession.pingCount ?? '—',   color:'#3b82f6' },
              { label:'Risk',       value: candidate.risk,         color },
            ].map(item => (
              <div key={item.label} style={{ background:'#f8fafc', borderRadius:10, padding:'12px 10px', textAlign:'center', border:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:9, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{item.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Location */}
          {liveSession.lat && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:22 }}>📍</div>
              <div>
                <div style={{ fontSize:10, color:'#16a34a', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>Last Known Location</div>
                <div style={{ fontFamily:'monospace', fontSize:13, color:'#111', fontWeight:600 }}>
                  {liveSession.lat.toFixed(5)}, {liveSession.lng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {/* Alert History */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
              ⚠️ Alert History
            </div>
            {alertHistory.length === 0 ? (
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#16a34a', fontWeight:600 }}>
                ✅ No violations detected
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {alertHistory.map((a, i) => (
                  <div key={i} style={{
                    background:'#fef2f2', border:'1px solid #fecaca',
                    borderLeft:'4px solid #ef4444', borderRadius:10,
                    padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <div>
                      <div style={{ fontSize:13, color:'#7f1d1d', fontWeight:700 }}>
                        {ALERT_ICONS[a.type]||'⚠️'} {a.type}
                      </div>
                      {a.msg && <div style={{ fontSize:11, color:'#dc2626', marginTop:3 }}>{a.msg}</div>}
                    </div>
                    <div style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace' }}>{a.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exam Info */}
          <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:22 }}>📋</div>
            <div>
              <div style={{ fontSize:10, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>Exam</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>{candidate.exam}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button
              onClick={onClose}
              style={{
                flex:1, padding:'11px', borderRadius:10, border:'1px solid #e5e7eb',
                background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#374151',
                transition:'background .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}
            >
              Close
            </button>
            <button
              onClick={onClose}
              style={{
                flex:1, padding:'11px', borderRadius:10, border:'none',
                background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='#2563eb'}
              onMouseLeave={e=>e.currentTarget.style.background='#3b82f6'}
            >
              📊 View Full Report
            </button>
            {candidate.risk === 'High' && (
              <button
                onClick={() => { onTerminate(candidate.sessionId, candidate.candidate); onClose(); }}
                style={{
                  flex:1, padding:'11px', borderRadius:10, border:'none',
                  background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='#b91c1c'}
                onMouseLeave={e=>e.currentTarget.style.background='#dc2626'}
              >
                ⛔ Terminate
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STATS CARDS
══════════════════════════════════════════════════ */
function StatsSection({ sessions }) {
  const counts = {
    active: sessions.length,
    high:   sessions.filter(s=>s.riskLevel==='high').length,
    medium: sessions.filter(s=>s.riskLevel==='medium').length,
    low:    sessions.filter(s=>s.riskLevel==='low').length,
  };
  const cards = [
    { key:'active', label:'Active Candidates', icon:'👤', accent:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', desc:'Currently taking exam' },
    { key:'high',   label:'High Risk',          icon:'🔴', accent:'#ef4444', bg:'#fef2f2', border:'#fecaca', desc:'Needs immediate review' },
    { key:'medium', label:'Medium Risk',         icon:'🟡', accent:'#f59e0b', bg:'#fffbeb', border:'#fde68a', desc:'Monitor closely' },
    { key:'low',    label:'Low Risk',            icon:'🟢', accent:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0', desc:'No issues detected' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
      {cards.map(c => (
        <div key={c.key} style={{
          background:'#fff', borderRadius:12, padding:'18px 22px',
          border:`1px solid ${c.border}`, borderLeft:`4px solid ${c.accent}`,
          boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'transform .15s, box-shadow .15s',
        }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${c.accent}22`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)';}}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1px', color:'#9ca3af', textTransform:'uppercase', marginBottom:8, fontFamily:'monospace' }}>
                {c.label}
              </div>
              <div style={{ fontSize:34, fontWeight:800, color:c.accent, lineHeight:1, letterSpacing:'-1px' }}>
                {counts[c.key]}
              </div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:5 }}>{c.desc}</div>
            </div>
            <div style={{ background:c.bg, borderRadius:10, padding:'10px 12px', fontSize:20 }}>{c.icon}</div>
          </div>
          <div style={{ marginTop:12, height:3, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width:`${counts.active>0?(counts[c.key]/counts.active)*100:0}%`, height:'100%', background:c.accent, borderRadius:99, transition:'width .8s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LIVE MAP
══════════════════════════════════════════════════ */
function AdminLiveMap({ sessions }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef({});
  const initedRef   = useRef(false);

  useEffect(() => {
    if (window.L) return;
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const tryInit = () => {
      if (!window.L || !mapRef.current || initedRef.current) return;
      // If Leaflet already initialized this container, destroy it first
      if (mapRef.current._leaflet_id) {
        try { window.L.map(mapRef.current).remove(); } catch {}
      }
      initedRef.current = true;
      mapInstance.current = window.L.map(mapRef.current, { zoomControl:true, attributionControl:false })
        .setView([13.05, 80.22], 8);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 })
        .addTo(mapInstance.current);
    };
    tryInit();
    const t = setTimeout(tryInit, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const map = mapInstance.current;
    sessions.forEach(s => {
      if (!s.lat || !s.lng) return;
      const color = riskColor(s.riskLevel);
      const icon = L.divIcon({
        className:'',
        html:`<div style="position:relative;">
          <div style="width:14px;height:14px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px ${color}44,0 2px 8px ${color}88;"></div>
          <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;white-space:nowrap;">${s.candidateId}</div>
        </div>`,
        iconSize:[14,14], iconAnchor:[7,7],
      });
      const popup = `<div style="font-family:monospace;min-width:160px;">
        <div style="font-weight:800;font-size:13px;color:#111;margin-bottom:6px;">${s.name}</div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">ID: <strong>${s.candidateId}</strong></div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">Trust: <strong style="color:${color}">${s.trustScore}/100</strong></div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px;">Risk: <strong style="color:${color}">${s.riskLevel.toUpperCase()}</strong></div>
        <div style="font-size:9px;color:#9ca3af;">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</div>
        <div style="margin-top:6px;background:#f3f4f6;border-radius:4px;height:4px;overflow:hidden;">
          <div style="width:${s.trustScore}%;height:100%;background:${color};border-radius:4px;"></div>
        </div>
      </div>`;
      if (markersRef.current[s.sessionId]) {
        markersRef.current[s.sessionId].setLatLng([s.lat, s.lng]);
        markersRef.current[s.sessionId].setIcon(icon);
        markersRef.current[s.sessionId].setPopupContent(popup);
      } else {
        markersRef.current[s.sessionId] = L.marker([s.lat,s.lng],{icon})
          .bindPopup(popup,{maxWidth:200}).addTo(map);
      }
    });
    Object.keys(markersRef.current).forEach(id => {
      if (!sessions.find(s=>s.sessionId===id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    const coords = sessions.filter(s=>s.lat&&s.lng).map(s=>[s.lat,s.lng]);
    if (coords.length>0) { try { map.fitBounds(coords,{padding:[50,50],maxZoom:13}); } catch{} }
  }, [sessions]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        initedRef.current = false;
      }
    };
  }, []);

  return (
    <div style={{ position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:380, borderRadius:10, border:'1px solid #e5e7eb', background:'#e8f4fd', zIndex:1 }} />
      <div style={{
        position:'absolute', bottom:12, left:12, zIndex:10,
        background:'rgba(255,255,255,0.95)', borderRadius:8, padding:'6px 12px',
        display:'flex', gap:14, fontSize:10, fontWeight:700, fontFamily:'monospace',
        boxShadow:'0 2px 8px rgba(0,0,0,0.12)', border:'1px solid #e5e7eb',
      }}>
        {[['#22c55e','LOW'],['#f59e0b','MED'],['#ef4444','HIGH']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:10,height:10,background:c,borderRadius:'50%',display:'inline-block' }} />{l}
          </span>
        ))}
      </div>
      {sessions.length===0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', background:'rgba(248,250,252,0.9)', borderRadius:10, color:'#9ca3af' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🗺️</div>
          <div style={{ fontSize:13, fontWeight:600 }}>No active GPS sessions</div>
          <div style={{ fontSize:11, marginTop:4 }}>Students appear here when exams begin</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SESSION SIDEBAR PANEL
══════════════════════════════════════════════════ */
function SessionPanel({ sessions, onTerminate, selectedId, onSelect }) {
  const sorted = [...sessions].sort((a,b)=>{ const o={high:0,medium:1,low:2}; return o[a.riskLevel]-o[b.riskLevel]; });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:380, overflowY:'auto', paddingRight:2 }}>
      {!sorted.length && (
        <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13, background:'#f8fafc', borderRadius:8 }}>
          No GPS sessions active.<br/><span style={{ fontSize:11 }}>Students appear here when they begin an exam.</span>
        </div>
      )}
      {sorted.map(s => {
        const isOpen = selectedId === s.sessionId;
        const color  = riskColor(s.riskLevel);
        return (
          <div key={s.sessionId} onClick={()=>onSelect(isOpen?null:s.sessionId)} style={{
            background:'#fff', border:`2px solid ${isOpen?color:'#f1f5f9'}`,
            borderRadius:10, padding:'12px 14px', cursor:'pointer',
            boxShadow:isOpen?`0 4px 16px ${color}22`:'0 1px 3px rgba(0,0,0,0.05)',
            transition:'border-color .2s, box-shadow .2s',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{s.name}</div>
                <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace', marginTop:1 }}>{s.candidateId}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:riskBg(s.riskLevel), color }}>
                {s.riskLevel.toUpperCase()}
              </span>
            </div>
            <div style={{ background:'#f3f4f6', borderRadius:4, height:5, overflow:'hidden', marginBottom:6 }}>
              <div style={{ width:`${s.trustScore}%`, height:'100%', background:color, borderRadius:4, transition:'width .6s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af' }}>
              <span>Trust <strong style={{ color }}>{s.trustScore}</strong></span>
              <span>Flags <strong style={{ color:s.flagCount>0?'#dc2626':'#374151' }}>{s.flagCount}</strong></span>
              <span>Pings <strong style={{ color:'#374151' }}>{s.pingCount}</strong></span>
            </div>
            {isOpen && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f1f5f9' }}>
                <div style={{ background:'#f8fafc', borderRadius:7, padding:'7px 10px', marginBottom:7, fontSize:11, fontFamily:'monospace', color:'#6b7280' }}>
                  📍 {s.lat?`${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`:'No location yet'}
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:7 }}>
                  Status: <strong style={{ color:s.status==='active'?'#16a34a':s.status==='escalated'?'#dc2626':'#d97706' }}>{s.status.toUpperCase()}</strong>
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:7 }}>📋 {s.exam}</div>
                {s.alertMsg && (
                  <div style={{ fontSize:11, padding:'5px 8px', borderRadius:6, marginBottom:7, background:'#fef2f2', color:'#7f1d1d', borderLeft:'3px solid #ef4444' }}>
                    {ALERT_ICONS[s.alert]||'⚠️'} {s.alertMsg}
                  </div>
                )}
                <button onClick={e=>{e.stopPropagation();onTerminate(s.sessionId,s.name);}} style={{
                  width:'100%', padding:'7px', borderRadius:7, border:'none',
                  background:'#fee2e2', color:'#dc2626', fontSize:12, fontWeight:700, cursor:'pointer',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fecaca'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fee2e2'}
                >
                  ⛔ Terminate Session
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ALERTS TABLE
══════════════════════════════════════════════════ */
function AlertsTable({ sessions, filterRisk, setFilterRisk, onTerminate, onReview }) {
  const rows = sessions.map((s,i) => ({
    id: i+1,
    candidate: s.name,
    candidateId: s.candidateId,
    exam: s.exam,
    status: s.status==='active'?'In Progress':s.status==='warned'?'Warned':'Escalated',
    alert: s.alert,
    risk: s.riskLevel==='high'?'High':s.riskLevel==='medium'?'Medium':'Low',
    count: s.flagCount,
    time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    sessionId: s.sessionId,
  }));
  const filtered = filterRisk==='All' ? rows : rows.filter(r=>r.risk===filterRisk);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">⚠️ Proctoring Alerts</span>
        <div style={{ display:'flex', gap:10 }}>
          <select className="form-select" style={{ fontSize:12, padding:'6px 10px' }} value={filterRisk} onChange={e=>setFilterRisk(e.target.value)}>
            <option value="All">All Risk Levels</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button className="btn btn-secondary btn-sm">📤 Export Alerts</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Candidate</th><th>Exam</th><th>Status</th><th>Alert</th>
              <th>Count</th><th>Risk Score</th><th>Time</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} style={{ background:row.risk==='High'?'#fff5f5':'' }}
                onMouseEnter={e=>e.currentTarget.style.background=row.risk==='High'?'#fee2e2':'#f8faff'}
                onMouseLeave={e=>e.currentTarget.style.background=row.risk==='High'?'#fff5f5':''}
              >
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background:row.risk==='High'?'#fee2e2':row.risk==='Medium'?'#fffbeb':'#eff6ff',
                      color:row.risk==='High'?'#dc2626':row.risk==='Medium'?'#d97706':'#2563eb',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800,
                    }}>
                      {row.candidate.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{row.candidate}</div>
                      <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace' }}>{row.candidateId}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color:'var(--color-text-muted)', fontSize:13, maxWidth:160 }}>
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.exam}</div>
                </td>
                <td>
                  <span style={{
                    padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700, fontFamily:'monospace',
                    background:row.status==='Escalated'?'#fef2f2':row.status==='Warned'?'#fffbeb':'#f0fdf4',
                    color:row.status==='Escalated'?'#dc2626':row.status==='Warned'?'#d97706':'#16a34a',
                  }}>
                    {row.status.toUpperCase()}
                  </span>
                </td>
                <td><AlertBadge alert={row.alert} /></td>
                <td style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:row.count>0?'#dc2626':'#374151' }}>
                  {row.count>0?`×${row.count}`:'—'}
                </td>
                <td><RiskBadge risk={row.risk} /></td>
                <td style={{ color:'var(--color-text-muted)', fontFamily:'monospace', fontSize:12 }}>{row.time}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onReview(row)}
                    >
                      Review
                    </button>
                    {row.risk==='High' && (
                      <button className="btn btn-danger btn-sm" onClick={()=>onTerminate(row.sessionId,row.candidate)}>
                        Terminate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN LiveMonitoring PAGE
══════════════════════════════════════════════════ */
export default function LiveMonitoring() {
  const [sessions,         setSessions]         = useState(INITIAL_SESSIONS);
  const [lastUpdated,      setLastUpdated]      = useState(new Date());
  const [filterRisk,       setFilterRisk]       = useState('All');
  const [pulse,            setPulse]            = useState(false);
  const [selectedId,       setSelectedId]       = useState(null);
  const [geoRefresh,       setGeoRefresh]       = useState(null);
  const [toasts,           setToasts]           = useState([]);
  const [reviewCandidate,  setReviewCandidate]  = useState(null); // ← Review modal state

  const showToast = useCallback((message, type='info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t=>t.id!==id)), 3500);
  }, []);

  const handleTerminate = useCallback((sessionId, name) => {
    if (!window.confirm(`Terminate session for ${name}?`)) return;
    setSessions(p => p.filter(s=>s.sessionId!==sessionId));
    setSelectedId(null);
    showToast(`⛔ Session terminated: ${name}`, 'danger');
  }, [showToast]);

  // Simulate location drift every 10s
  useEffect(() => {
    const t = setInterval(() => {
      setSessions(prev => prev.map(s => {
        const newTrust = Math.max(0, Math.min(100, s.trustScore + randBetween(-4,4)));
        const newRisk  = getRisk(newTrust);
        return {
          ...s,
          lat:        s.lat + (Math.random()-0.5)*0.008,
          lng:        s.lng + (Math.random()-0.5)*0.008,
          trustScore: newTrust,
          riskLevel:  newRisk,
          pingCount:  s.pingCount + 1,
          status:     newRisk==='high'?'escalated':newRisk==='medium'?'warned':'active',
        };
      }));
      setLastUpdated(new Date());
      setGeoRefresh(new Date().toLocaleTimeString());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  // Simulate new alerts every 15s
  useEffect(() => {
    const t = setInterval(() => {
      setSessions(prev => {
        const highRisk = prev.filter(s=>s.riskLevel==='high');
        if (!highRisk.length) return prev;
        const target    = randChoice(highRisk);
        const alertType = randChoice(ALERT_TYPES);
        showToast(`🚨 ${alertType} — ${target.name}`, 'warn');
        return prev.map(s =>
          s.sessionId===target.sessionId
            ? { ...s, alert:alertType, alertMsg:`${alertType} at ${new Date().toLocaleTimeString()}`, flagCount:s.flagCount+1 }
            : s
        );
      });
    }, 15000);
    return () => clearInterval(t);
  }, [showToast]);

  const highCount = sessions.filter(s=>s.riskLevel==='high').length;
  const medCount  = sessions.filter(s=>s.riskLevel==='medium').length;

  return (
    <div style={{ marginLeft:'230px', display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex:1, overflow:'auto', padding:'20px' }}>

        {/* ── Page Header ── */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Live Monitoring</h1>
            <p>Real-time proctoring alerts and candidate activity</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, fontSize:11, fontWeight:700, color:'#16a34a' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:pulse?'none':'live-pulse 2s infinite', transform:pulse?'scale(1.6)':'scale(1)', transition:'transform .3s' }} />
              LIVE
            </div>
            <span style={{ fontSize:12, color:'var(--color-text-muted)', fontFamily:'monospace' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
            {highCount>0 && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fef2f2', color:'#dc2626', fontFamily:'monospace' }}>🔴 {highCount} HIGH</span>}
            {medCount>0  && <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fffbeb', color:'#d97706', fontFamily:'monospace' }}>🟡 {medCount} MED</span>}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <StatsSection sessions={sessions} />

        {/* ── Map + Session Panel ── */}
        <div className="panel" style={{ marginBottom:24 }}>
          <div className="panel-header">
            <span className="panel-title">🗺️ Live Location Tracking</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', gap:12, fontSize:11, color:'#6b7280' }}>
                {[['#22c55e','Low Risk'],['#f59e0b','Medium'],['#ef4444','High Risk']].map(([c,l]) => (
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:10,height:10,borderRadius:'50%',background:c,display:'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              {geoRefresh && <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace' }}>Updated {geoRefresh}</span>}
            </div>
          </div>
          <div style={{ padding:'0 0 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
              <AdminLiveMap sessions={sessions} />
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1px', color:'#9ca3af', fontFamily:'monospace', textTransform:'uppercase', marginBottom:10 }}>
                  Active Sessions ({sessions.length})
                </div>
                <SessionPanel sessions={sessions} onTerminate={handleTerminate} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Alerts Table ── */}
        <AlertsTable
          sessions={sessions}
          filterRisk={filterRisk}
          setFilterRisk={setFilterRisk}
          onTerminate={handleTerminate}
          onReview={(row) => setReviewCandidate(row)}
        />

      </main>

      {/* ── Review Modal ── */}
      <ReviewModal
        candidate={reviewCandidate}
        sessions={sessions}
        onClose={() => setReviewCandidate(null)}
        onTerminate={handleTerminate}
      />

      <ToastStack toasts={toasts} />
      <ToastContainer />

      <style>{`
        @keyframes live-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
      `}</style>
    </div>
  );
}
