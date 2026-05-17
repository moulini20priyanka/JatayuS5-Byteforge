import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar  from '../components/Navbar';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const RISK_COLOR = { low: '#16a34a', medium: '#d97706', high: '#dc2626' };
const RISK_BG    = { low: '#f0fdf4', medium: '#fffbeb', high: '#fef2f2' };
const YELLOW_THRESHOLD = 100;
const RED_THRESHOLD    = 300;

const VIOL_ICONS = {
  NO_FACE:'😶', MULTIPLE_FACES:'👥', GAZE_AWAY:'👀', OBJECT_DETECTED:'📱',
  TAB_SWITCH:'🔀', WINDOW_BLUR:'🔀', FOCUS_LOST:'🔀',
  LOCATION_VIOLATION:'📍', GEOFENCE_EXIT:'🚫', FLAGGED:'🚩', TERMINATED:'⛔',
};

function geoWarn(dist) {
  if (!dist || dist < YELLOW_THRESHOLD) return null;
  return dist < RED_THRESHOLD ? 'yellow' : 'red';
}

const S = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f6fb;color:#0f172a}
.lm-wrap{margin-left:230px;min-height:100vh;display:flex;flex-direction:column}
.lm-main{flex:1;padding:28px 24px}
.lm-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:10px}
.lm-title{font-size:20px;font-weight:700}
.lm-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:9px;padding:4px}
.lm-tab{padding:8px 18px;border-radius:7px;border:none;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#64748b;transition:all .15s}
.lm-tab.active{background:#fff;color:#0f172a;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px}
.stat-val{font-size:28px;font-weight:800;line-height:1}
.stat-lbl{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-top:6px}
.map-box{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px}
.map-hdr{padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;flex-wrap:wrap}
#lm-map{height:320px;width:100%}
.tbox{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px}
.thdr{padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
table{width:100%;border-collapse:collapse}
th{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.8px;text-transform:uppercase;padding:10px 16px;text-align:left;border-bottom:1px solid #e2e8f0;background:#f8fafc}
td{padding:11px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fafc;cursor:pointer}
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700}
.trust-bar{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;width:80px;display:inline-block;vertical-align:middle}
.trust-fill{height:100%;border-radius:3px}
.refresh-btn{padding:7px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12px;font-weight:600;color:#2563eb;cursor:pointer}
.refresh-btn:hover{background:#dbeafe}
.gwarn-y{background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700}
.gwarn-r{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700}
.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}
.modal{background:#fff;border-radius:14px;max-width:720px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.mhead{padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:2}
.mbody{padding:18px 24px}
.xbtn{width:30px;height:30px;border-radius:6px;border:none;background:#f1f5f9;cursor:pointer;font-size:16px;color:#64748b}
.xbtn:hover{background:#e2e8f0}
.vc{border:1px solid #fee2e2;border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fef2f2;display:flex;gap:12px;align-items:flex-start}
.vc.med{border-color:#fcd34d;background:#fffbeb}
.vc.low{border-color:#e2e8f0;background:#f8fafc}
.vsnap{width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;flex-shrink:0;cursor:pointer}
.vph{width:80px;height:60px;border-radius:6px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:#f8fafc}
.badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700;border:1px solid}
.empty{text-align:center;padding:40px 24px;color:#94a3b8}
`;

export default function LiveMonitoring() {
  const [tab,        setTab]        = useState('live');
  const [sessions,   setSessions]   = useState([]);
  const [stats,      setStats]      = useState({});
  const [exams,      setExams]      = useState([]);
  const [procAlerts, setProcAlerts] = useState([]);
  const [procExams,  setProcExams]  = useState([]);
  const [examDetail, setExamDetail] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [snapModal,  setSnapModal]  = useState(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  const loadLive = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([
        apiFetch('/api/admin/sessions'),
        apiFetch('/api/admin/geo-stats').catch(()=>({})),
      ]);
      setSessions(s.sessions||[]);
      setStats(g);
    } catch {}
    setLoading(false);
  }, []);

  const loadCompleted = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('/api/admin/completed-exams'); setExams(d.exams||[]); } catch {}
    setLoading(false);
  }, []);

  const loadProctoring = useCallback(async () => {
    setLoading(true);
    try {
      const [alerts, ae] = await Promise.all([
        apiFetch('/api/proctoring/admin/alerts?limit=100').catch(()=>({ alerts:[] })),
        apiFetch('/api/proctoring/admin/active-exams').catch(()=>({ exams:[] })),
      ]);
      setProcAlerts(alerts.alerts||[]);
      setProcExams(ae.exams||[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab==='live') loadLive();
    else if (tab==='completed') loadCompleted();
    else loadProctoring();
  }, [tab]);

  useEffect(() => { if (tab!=='live') return; const id=setInterval(loadLive,15000); return ()=>clearInterval(id); }, [tab,loadLive]);
  useEffect(() => { if (tab!=='proctoring') return; const id=setInterval(loadProctoring,20000); return ()=>clearInterval(id); }, [tab,loadProctoring]);

  useEffect(() => {
    if (tab!=='live') return;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        if (!leafletRef.current && document.getElementById('lm-map')) {
          leafletRef.current = L.map('lm-map').setView([13.0827,80.2707],12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(leafletRef.current);
        }
      } catch {}
    })();
  }, [tab]);

  useEffect(() => {
    if (!leafletRef.current || tab!=='live') return;
    markersRef.current.forEach(m=>m.remove());
    markersRef.current = [];
    if (!window.L) return;
    sessions.forEach(s => {
      const lat=parseFloat(s.lat), lng=parseFloat(s.lng);
      if (isNaN(lat)||isNaN(lng)) return;
      const dist=s.distance||0, w=geoWarn(dist);
      const col = w==='red'?'#dc2626':w==='yellow'?'#d97706':RISK_COLOR[s.risk_level||'low'];
      const icon = window.L.divIcon({ html:`<div style="width:14px;height:14px;background:${col};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`, iconSize:[14,14], className:'' });
      const m = window.L.marker([lat,lng],{icon}).addTo(leafletRef.current).bindPopup(`<b>${s.student_name||s.candidate_id}</b><br>${s.exam_name||''}<br>Risk: ${s.risk_level||'low'}${dist?`<br>Dist: ${Math.round(dist)}m`:''}`);
      markersRef.current.push(m);
      if (s.initial_lat && s.initial_lng) {
        const pi = window.L.divIcon({ html:`<div style="width:10px;height:10px;background:#2563eb;border:2px solid #fff;border-radius:50%;opacity:.5"></div>`, iconSize:[10,10], className:'' });
        const pm = window.L.marker([parseFloat(s.initial_lat),parseFloat(s.initial_lng)],{icon:pi}).addTo(leafletRef.current).bindPopup(`<b>Pinned:</b> ${s.student_name||s.candidate_id}`);
        markersRef.current.push(pm);
      }
    });
  }, [sessions,tab]);

  async function openExam(exam) {
    try { const d=await apiFetch(`/api/admin/exam-violations/${exam.exam_id}`); setExamDetail({exam,students:d.students||[]}); }
    catch { setExamDetail({exam,students:[]}); }
  }
  async function openStudent(s) {
    if (!s.assignment_id) return;
    try { const d=await apiFetch(`/api/admin/student-violations/${s.assignment_id}`); setSelected(d); }
    catch { setSelected({student:s,violations:{all:[],categories:{}}}); }
  }
  async function loadSnap(id) {
    try { const d=await apiFetch(`/api/proctoring/snapshot/${id}`); setSnapModal(d); } catch {}
  }

  const vc = sev => sev==='high'?'vc':sev==='medium'?'vc med':'vc low';
  const sc = sev => sev==='high'?'#dc2626':sev==='medium'?'#d97706':'#94a3b8';

  const alertsByExam = procAlerts.reduce((a,v) => { const k=v.exam_name||'Unknown'; (a[k]=a[k]||[]).push(v); return a; }, {});

  return (
    <div className="lm-wrap">
      <style>{S}</style>
      <Sidebar /><Navbar />
      <main className="lm-main">
        <div className="lm-head">
          <div className="lm-title">Live Monitoring</div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div className="lm-tabs">
              {[{id:'live',label:'Live Sessions'},{id:'proctoring',label:`Proctoring${procAlerts.length>0?` (${procAlerts.length})`:''}`},{id:'completed',label:'Completed Exams'}].map(t=>(
                <button key={t.id} className={`lm-tab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            <button className="refresh-btn" onClick={()=>tab==='live'?loadLive():tab==='completed'?loadCompleted():loadProctoring()}>↻ Refresh</button>
          </div>
        </div>

        {tab==='live' && (
          <>
            <div className="stat-row">
              {[{lbl:'Active Sessions',val:stats.activeCandidates||sessions.length||0,col:'#2563eb'},{lbl:'High Risk',val:stats.highRisk||0,col:'#dc2626'},{lbl:'Medium Risk',val:stats.mediumRisk||0,col:'#d97706'},{lbl:'Critical Alerts',val:stats.criticalAlerts||0,col:'#7c3aed'}].map(({lbl,val,col})=>(
                <div className="stat" key={lbl}><div className="stat-val" style={{color:col}}>{val}</div><div className="stat-lbl">{lbl}</div></div>
              ))}
            </div>
            <div className="map-box">
              <div className="map-hdr">
                📍 Live Location Tracking
                <div style={{display:'flex',gap:8,marginLeft:'auto',fontSize:11,flexWrap:'wrap'}}>
                  <span style={{background:'#eff6ff',border:'1px solid #bfdbfe',padding:'2px 7px',borderRadius:4,color:'#1d4ed8'}}>● Pinned start</span>
                  <span style={{background:'#fffbeb',border:'1px solid #fcd34d',padding:'2px 7px',borderRadius:4,color:'#92400e'}}>● Yellow &lt;{RED_THRESHOLD}m</span>
                  <span style={{background:'#fef2f2',border:'1px solid #fecaca',padding:'2px 7px',borderRadius:4,color:'#991b1b'}}>● Red {RED_THRESHOLD}m+</span>
                </div>
              </div>
              <div id="lm-map" />
            </div>
            <div className="tbox">
              <div className="thdr">Active Sessions ({sessions.length})</div>
              {sessions.length===0 ? (
                <div className="empty"><div style={{fontSize:32}}>🟢</div><div style={{marginTop:10}}>No active sessions</div></div>
              ) : (
                <table>
                  <thead><tr><th>Student</th><th>Exam</th><th>Pinned Location</th><th>Distance</th><th>Trust</th><th>Risk</th><th>Geo</th><th>Flags</th><th>Last Ping</th></tr></thead>
                  <tbody>
                    {sessions.map(s=>{
                      const dist=s.distance||0, w=geoWarn(dist);
                      return (
                        <tr key={s.session_id}>
                          <td><div style={{fontWeight:600}}>{s.student_name||s.candidate_id}</div><div style={{fontSize:11,color:'#94a3b8'}}>{s.roll_number}</div></td>
                          <td style={{fontSize:12}}>{s.exam_name||s.exam_type}</td>
                          <td style={{fontSize:11,color:'#64748b'}}>
                            {s.initial_lat ? `${parseFloat(s.initial_lat).toFixed(4)}, ${parseFloat(s.initial_lng).toFixed(4)}` : '—'}
                          </td>
                          <td>
                            {dist>0 ? (
                              <span style={{fontWeight:700,color:w==='red'?'#dc2626':w==='yellow'?'#d97706':'#16a34a',fontSize:12}}>{Math.round(dist)}m</span>
                            ) : <span style={{color:'#94a3b8',fontSize:11}}>—</span>}
                          </td>
                          <td>
                            <div className="trust-bar"><div className="trust-fill" style={{width:`${s.trust_score||100}%`,background:RISK_COLOR[s.risk_level||'low']}}/></div>
                            <span style={{fontSize:11,marginLeft:6,color:'#64748b'}}>{s.trust_score??100}%</span>
                          </td>
                          <td><span className="pill" style={{background:RISK_BG[s.risk_level||'low'],color:RISK_COLOR[s.risk_level||'low']}}>{(s.risk_level||'LOW').toUpperCase()}</span></td>
                          <td>
                            {w==='yellow'&&<span className="gwarn-y">⚠ {Math.round(dist)}m</span>}
                            {w==='red'&&<span className="gwarn-r">🔴 {Math.round(dist)}m</span>}
                            {!w&&<span style={{color:'#16a34a',fontSize:11}}>OK</span>}
                          </td>
                          <td style={{color:(s.violation_count||0)>0?'#dc2626':'#94a3b8',fontWeight:700}}>{s.violation_count||0}</td>
                          <td style={{fontSize:11,color:'#94a3b8'}}>{s.last_ping?new Date(s.last_ping).toLocaleTimeString():'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab==='proctoring' && (
          <>
            <div className="tbox">
              <div className="thdr">Active Exams ({procExams.length}) <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>being monitored</span></div>
              {procExams.length===0 ? <div className="empty" style={{padding:'20px'}}>No active exams</div> : (
                <table>
                  <thead><tr><th>Exam</th><th>Type</th><th>Taking</th><th>High Risk</th><th>Med Risk</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {procExams.map((e,i)=>(
                      <tr key={i}>
                        <td style={{fontWeight:600}}>{e.exam_name}</td>
                        <td><span className="badge" style={{background:'#eff6ff',color:'#2563eb',borderColor:'#bfdbfe'}}>{e.exam_type||'placement'}</span></td>
                        <td style={{fontWeight:700,color:'#2563eb'}}>{e.currently_taking||0}</td>
                        <td style={{color:(e.high||0)>0?'#dc2626':'#94a3b8',fontWeight:700}}>{e.high||0}</td>
                        <td style={{color:(e.medium||0)>0?'#d97706':'#94a3b8',fontWeight:700}}>{e.medium||0}</td>
                        <td style={{color:'#16a34a',fontWeight:700}}>{e.submitted_count||0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="tbox">
              <div className="thdr">Violation Feed <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>{procAlerts.length} total</span></div>
              {loading ? <div className="empty">Loading…</div> : procAlerts.length===0 ? (
                <div className="empty"><div style={{fontSize:32}}>✅</div><div style={{marginTop:10}}>No violations recorded</div></div>
              ) : (
                <div style={{padding:'14px 16px'}}>
                  {Object.entries(alertsByExam).map(([examName, alerts])=>(
                    <div key={examName} style={{marginBottom:20}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:10,padding:'6px 10px',background:'#f8fafc',borderRadius:7,border:'1px solid #e2e8f0'}}>
                        {examName} <span style={{color:'#94a3b8',fontWeight:400}}>({alerts.length})</span>
                      </div>
                      {alerts.map((a,i)=>(
                        <div key={i} className={vc(a.severity)} style={{marginBottom:8}}>
                          {a.has_snapshot ? (
                            <img src={`${API}/api/proctoring/snapshot/${a.violation_id}`} alt="snap" className="vsnap" onClick={()=>loadSnap(a.violation_id)} onError={e=>e.target.style.display='none'} />
                          ) : (
                            <div className="vph">{VIOL_ICONS[a.type]||'⚠'}</div>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                              <span style={{fontSize:11,fontWeight:700,color:sc(a.severity),background:a.severity==='high'?'#fef2f2':a.severity==='medium'?'#fffbeb':'#f1f5f9',padding:'1px 7px',borderRadius:99,border:`1px solid ${a.severity==='high'?'#fecaca':a.severity==='medium'?'#fcd34d':'#e2e8f0'}`}}>
                                {(a.type||'').replace(/_/g,' ')}
                              </span>
                              <span style={{fontSize:11,fontWeight:600}}>{a.student_name||a.student_id}</span>
                              <span style={{fontSize:10,color:'#94a3b8',marginLeft:'auto'}}>{a.time?new Date(a.time).toLocaleString():''}</span>
                            </div>
                            {a.message&&<div style={{fontSize:12,color:'#334155',lineHeight:1.5}}>{a.message}</div>}
                            {a.has_snapshot&&<button onClick={()=>loadSnap(a.violation_id)} style={{marginTop:4,fontSize:11,color:'#2563eb',background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:600}}>View snapshot →</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab==='completed' && (
          <div className="tbox">
            <div className="thdr">Completed Exams ({exams.length})</div>
            {loading ? <div className="empty">Loading…</div> : exams.length===0 ? (
              <div className="empty"><div style={{fontSize:32}}>📋</div><div style={{marginTop:10}}>No completed exams yet</div></div>
            ) : (
              <table>
                <thead><tr><th>Exam</th><th>Type</th><th>Students</th><th>Submitted</th><th>Last Submission</th><th></th></tr></thead>
                <tbody>
                  {exams.map(e=>(
                    <tr key={e.exam_id} onClick={()=>openExam(e)}>
                      <td style={{fontWeight:600}}>{e.exam_name}</td>
                      <td><span className="badge" style={{background:e.exam_type==='university'?'#f0f9ff':'#eff6ff',color:e.exam_type==='university'?'#0891b2':'#2563eb',borderColor:e.exam_type==='university'?'#bae6fd':'#bfdbfe'}}>{e.exam_type||'placement'}</span></td>
                      <td>{e.total_students}</td>
                      <td style={{color:'#16a34a',fontWeight:600}}>{e.submitted_count}</td>
                      <td style={{fontSize:11,color:'#94a3b8'}}>{e.last_submission?new Date(e.last_submission).toLocaleDateString():'—'}</td>
                      <td style={{color:'#2563eb',fontSize:12}}>View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {examDetail && (
        <div className="modal-backdrop" onClick={()=>setExamDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mhead">
              <div><div style={{fontWeight:700,fontSize:16}}>{examDetail.exam.exam_name}</div><div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{examDetail.students.length} students</div></div>
              <button className="xbtn" onClick={()=>setExamDetail(null)}>✕</button>
            </div>
            <div className="mbody">
              {examDetail.students.length===0 ? <div className="empty">No students found</div> : (
                <table>
                  <thead><tr><th>Student</th><th>Status</th><th>Score</th><th>Violations</th><th>Geo</th><th>Risk</th></tr></thead>
                  <tbody>
                    {examDetail.students.map(s=>(
                      <tr key={s.assignment_id} onClick={()=>openStudent(s)}>
                        <td><div style={{fontWeight:600}}>{s.student_name||s.student_id}</div><div style={{fontSize:11,color:'#94a3b8'}}>{s.email}</div></td>
                        <td><span className="badge" style={{background:s.assignment_status==='submitted'?'#f0fdf4':'#fffbeb',color:s.assignment_status==='submitted'?'#16a34a':'#d97706',borderColor:s.assignment_status==='submitted'?'#a7f3d0':'#fcd34d'}}>{s.assignment_status}</span></td>
                        <td style={{fontWeight:600}}>{s.score??'—'}</td>
                        <td style={{color:(s.violations?.total||0)>0?'#dc2626':'#94a3b8',fontWeight:700}}>{s.violations?.total||0}</td>
                        <td style={{color:(s.violations?.geo||0)>0?'#dc2626':'#94a3b8'}}>{s.violations?.geo||0}</td>
                        <td>{s.risk_level?<span className="pill" style={{background:RISK_BG[s.risk_level],color:RISK_COLOR[s.risk_level]}}>{s.risk_level.toUpperCase()}</span>:'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mhead">
              <div><div style={{fontWeight:700,fontSize:16}}>{selected.student?.student_name||selected.student?.student_id}</div><div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{selected.violations?.total||0} violations</div></div>
              <button className="xbtn" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="mbody">
              {selected.geoSession&&(
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',gap:20,flexWrap:'wrap'}}>
                  {[['Trust',`${selected.geoSession.trust_score??100}%`],['Risk',selected.geoSession.risk_level||'low'],['Flags',selected.geoSession.flag_count||0],['Pings',selected.geoSession.ping_count||0]].map(([k,v])=>(
                    <div key={k}><div style={{fontSize:10,color:'#94a3b8',fontWeight:700}}>{k.toUpperCase()}</div><div style={{fontSize:15,fontWeight:700,marginTop:2}}>{v}</div></div>
                  ))}
                </div>
              )}
              {[{key:'registration_agent',lbl:'Registration agent'},{key:'proctoring_agent',lbl:'Proctoring agent'},{key:'tab_switch',lbl:'Tab / window switch'},{key:'geo_violations',lbl:'Geo violations'},{key:'other',lbl:'Other'}].map(({key,lbl})=>{
                const items=selected.violations?.categories?.[key]||[];
                return (
                  <div key={key} style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'.8px',marginBottom:8}}>{lbl.toUpperCase()} ({items.length})</div>
                    {items.length===0 ? <div style={{fontSize:12,color:'#94a3b8',paddingLeft:4}}>None</div>
                    : items.map((v,i)=>(
                      <div key={i} className={vc(v.severity)}>
                        <div className="vph">{VIOL_ICONS[v.type]||'⚠'}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                            <strong style={{fontSize:12}}>{(v.type||'').replace(/_/g,' ')}</strong>
                            <span style={{fontSize:10,color:'#94a3b8',marginLeft:'auto'}}>{v.occurred_at?new Date(v.occurred_at).toLocaleString():''}</span>
                          </div>
                          <div style={{fontSize:12,color:'#334155'}}>{v.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!selected.violations?.total&&<div className="empty"><div style={{fontSize:32}}>✅</div><div style={{marginTop:10}}>No violations</div></div>}
            </div>
          </div>
        </div>
      )}

      {snapModal && (
        <div className="modal-backdrop" onClick={()=>setSnapModal(null)}>
          <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div className="mhead">
              <div><div style={{fontWeight:700,fontSize:15}}>{(snapModal.type||'').replace(/_/g,' ')}</div><div style={{fontSize:11,color:'#94a3b8'}}>{snapModal.occurred_at?new Date(snapModal.occurred_at).toLocaleString():''}</div></div>
              <button className="xbtn" onClick={()=>setSnapModal(null)}>✕</button>
            </div>
            <div className="mbody">
              <div style={{fontSize:13,color:'#334155',marginBottom:12}}>{snapModal.message}</div>
              {snapModal.snapshot_b64 ? (
                <img src={`data:image/jpeg;base64,${snapModal.snapshot_b64}`} alt="violation snapshot" style={{width:'100%',borderRadius:8,border:'1px solid #e2e8f0'}} />
              ) : (
                <div style={{textAlign:'center',padding:'32px',color:'#94a3b8',background:'#f8fafc',borderRadius:8,border:'1px dashed #e2e8f0'}}>No snapshot captured</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}