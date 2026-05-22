import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar  from '../components/Navbar';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  pageBg:     '#f0f4f8',
  white:      '#ffffff',
  border:     '#e2e8f0',
  shadow:     '0 1px 3px rgba(0,0,0,0.07)',
  shadowMd:   '0 4px 12px rgba(0,0,0,0.08)',
  navy:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  dim:        '#94a3b8',
  accent:     '#2563eb',
  accentSoft: '#eff6ff',
  green:      '#059669',
  greenBg:    '#ecfdf5',
  greenBdr:   '#a7f3d0',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  redBdr:     '#fecaca',
  orange:     '#d97706',
  orangeBg:   '#fffbeb',
  orangeBdr:  '#fcd34d',
  yellow:     '#d97706',
  yellowBg:   '#fffbeb',
  yellowBdr:  '#fcd34d',
  blue:       '#2563eb',
  blueBg:     '#eff6ff',
  blueBdr:    '#bfdbfe',
  purple:     '#7c3aed',
  purpleBg:   '#f5f3ff',
};

const RISK_COLOR = { low: T.green,  medium: T.yellow, high: T.red   };
const RISK_BG    = { low: T.greenBg, medium: T.yellowBg, high: T.redBg };
const RISK_BDR   = { low: T.greenBdr, medium: T.yellowBdr, high: T.redBdr };

const YELLOW_THRESHOLD = 100;
const RED_THRESHOLD    = 300;

function geoWarn(dist) {
  if (!dist || dist < YELLOW_THRESHOLD) return null;
  return dist < RED_THRESHOLD ? 'yellow' : 'red';
}

// ── Demo sessions with merged proctoring data ─────────────────────────────────
const DEMO_SESSIONS = [
  {
    session_id: 'SES001', candidate_id: 'S001',
    student_name: 'Moulini S', roll_number: '122058',
    exam_name: 'Virtusa — Full Stack Developer',
    exam_type: 'hiring',
    lat: 13.0827, lng: 80.2707,
    initial_lat: 13.0830, initial_lng: 80.2710,
    distance: 42,
    trust_score: 94, risk_level: 'low',
    violation_count: 1,
    last_ping: new Date(Date.now() - 45000).toISOString(),
    // Proctoring fields
    proctoring: {
      face_detected:       true,
      multiple_faces:      false,
      tab_switches:        1,
      eye_tracking_status: 'Normal',
      background_noise:    'Low',
      overall_risk:        'low',
    },
  },
  {
    session_id: 'SES002', candidate_id: 'S002',
    student_name: 'Shreya S', roll_number: '119043',
    exam_name: 'Virtusa — Full Stack Developer',
    exam_type: 'hiring',
    lat: 13.0450, lng: 80.2200,
    initial_lat: 13.0830, initial_lng: 80.2710,
    distance: 431,
    trust_score: 38, risk_level: 'high',
    violation_count: 9,
    last_ping: new Date(Date.now() - 200000).toISOString(),
    // Proctoring fields
    proctoring: {
      face_detected:       false,
      multiple_faces:      true,
      tab_switches:        7,
      eye_tracking_status: 'Suspicious',
      background_noise:    'High',
      overall_risk:        'high',
    },
  },
];

const DEMO_GEO_STATS = {
  activeCandidates: 2,
  highRisk: 1,
  mediumRisk: 0,
  criticalAlerts: 1,
};

const DEMO_COMPLETED = [];

// ── TypeBadge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    placement:    { label: 'Placement',     color: '#6d28d9', bg: '#ede9fe' },
    hiring:       { label: 'Hiring',        color: '#6d28d9', bg: '#ede9fe' },
    university:   { label: 'University',    color: '#0369a1', bg: '#e0f2fe' },
    skill_cert:   { label: 'Certification', color: '#c2410c', bg: '#ffedd5' },
    certification:{ label: 'Certification', color: '#c2410c', bg: '#ffedd5' },
  };
  const s = map[type] || { label: type || 'Exam', color: T.muted, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
function StatusDot({ ok, label, extra }) {
  const color = ok ? T.green : T.red;
  const bg    = ok ? T.greenBg : T.redBg;
  const bdr   = ok ? T.greenBdr : T.redBdr;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 7, background: bg, border: `1px solid ${bdr}`, marginBottom: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: T.text, fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace' }}>{extra}</span>
    </div>
  );
}

// ── ProctoringCard ────────────────────────────────────────────────────────────
function ProctoringCard({ proc }) {
  if (!proc) return null;
  const risk       = proc.overall_risk || 'low';
  const riskCol    = RISK_COLOR[risk];
  const riskBg     = RISK_BG[risk];
  const riskBdr    = RISK_BDR[risk];
  const noiseRisk  = proc.background_noise === 'High';
  const eyeOk      = proc.eye_tracking_status === 'Normal';

  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 11, padding: '13px 15px', boxShadow: T.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: '.7px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>🎥</span> Proctoring Status
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: riskBg, color: riskCol, border: `1px solid ${riskBdr}`, textTransform: 'uppercase' }}>
          {risk}
        </span>
      </div>
      <StatusDot ok={proc.face_detected}  label="Face Detection"      extra={proc.face_detected ? 'Active' : 'Not Detected'} />
      <StatusDot ok={!proc.multiple_faces} label="Multiple Faces"      extra={proc.multiple_faces ? 'Detected' : 'Clear'} />
      <StatusDot ok={proc.tab_switches < 3} label="Tab Switches"       extra={`${proc.tab_switches}x`} />
      <StatusDot ok={eyeOk}               label="Eye Tracking"         extra={proc.eye_tracking_status || '—'} />
      <StatusDot ok={!noiseRisk}          label="Background Noise"     extra={proc.background_noise || '—'} />
    </div>
  );
}

// ── Stylesheet ─────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

.lm-wrap  { margin-left: 230px; min-height: 100vh; background: ${T.pageBg}; font-family: 'DM Sans', system-ui, sans-serif; display: flex; flex-direction: column; }
.lm-main  { flex: 1; padding: 28px 30px; }

.lm-head  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
.lm-title-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.lm-accent-bar { width: 4px; height: 28px; background: ${T.accent}; border-radius: 2px; }
.lm-title { font-size: 21px; font-weight: 800; color: ${T.navy}; letter-spacing: -.3px; }
.lm-sub   { font-size: 12.5px; color: ${T.muted}; margin-left: 14px; }

.lm-tabs  { display: flex; gap: 3px; background: #f1f5f9; border-radius: 10px; padding: 4px; border: 1px solid ${T.border}; }
.lm-tab   { padding: 7px 18px; border-radius: 7px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: ${T.muted}; transition: all .15s; font-family: inherit; }
.lm-tab.active { background: ${T.white}; color: ${T.navy}; box-shadow: 0 1px 3px rgba(0,0,0,.08); border: 1px solid ${T.border}; }

.refresh-btn       { padding: 7px 16px; background: ${T.white}; border: 1px solid ${T.border}; border-radius: 8px; font-size: 12px; font-weight: 600; color: ${T.accent}; cursor: pointer; font-family: inherit; box-shadow: ${T.shadow}; display: flex; align-items: center; gap: 6px; }
.refresh-btn:hover { background: ${T.accentSoft}; }

.stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 18px; }
.stat     { background: ${T.white}; border: 1px solid ${T.border}; border-radius: 11px; padding: 15px 18px; box-shadow: ${T.shadow}; }
.stat-val { font-size: 26px; font-weight: 800; line-height: 1; }
.stat-lbl { font-size: 9.5px; font-weight: 700; color: ${T.dim}; letter-spacing: .7px; margin-top: 5px; text-transform: uppercase; }

.map-box { background: ${T.white}; border: 1px solid ${T.border}; border-radius: 12px; overflow: hidden; margin-bottom: 16px; box-shadow: ${T.shadow}; }
.map-hdr { padding: 13px 16px; border-bottom: 1px solid ${T.border}; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; flex-wrap: wrap; color: ${T.navy}; }
.map-legend { display: flex; gap: 8px; margin-left: auto; font-size: 11px; flex-wrap: wrap; }
.legend-blue   { background: ${T.accentSoft}; border: 1px solid ${T.blueBdr}; padding: 2px 8px; border-radius: 5px; color: #1d4ed8; font-weight: 600; }
.legend-yellow { background: ${T.yellowBg}; border: 1px solid ${T.yellowBdr}; padding: 2px 8px; border-radius: 5px; color: #92400e; font-weight: 600; }
.legend-red    { background: ${T.redBg}; border: 1px solid ${T.redBdr}; padding: 2px 8px; border-radius: 5px; color: #991b1b; font-weight: 600; }
#lm-map { height: 300px; width: 100%; }

.tbox  { background: ${T.white}; border: 1px solid ${T.border}; border-radius: 12px; overflow: hidden; margin-bottom: 14px; box-shadow: ${T.shadow}; }
.thdr  { padding: 13px 16px; border-bottom: 1px solid ${T.border}; font-size: 13px; font-weight: 700; color: ${T.navy}; display: flex; align-items: center; justify-content: space-between; }
.thdr-sub { font-size: 11px; color: ${T.dim}; font-weight: 400; }

table { width: 100%; border-collapse: collapse; }
th    { font-size: 10px; font-weight: 700; color: ${T.dim}; letter-spacing: .7px; text-transform: uppercase; padding: 10px 14px; text-align: left; border-bottom: 1.5px solid ${T.border}; background: #f8fafc; white-space: nowrap; }
td    { padding: 11px 14px; font-size: 12.5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: ${T.text}; }
tr:last-child td { border-bottom: none; }
tr.clickable:hover td { background: #f0f7ff; cursor: pointer; }

.pill      { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 700; }
.trust-bar { height: 5px; border-radius: 3px; background: #e2e8f0; overflow: hidden; width: 72px; display: inline-block; vertical-align: middle; }
.trust-fill{ height: 100%; border-radius: 3px; }
.gwarn-y   { background: ${T.yellowBg}; border: 1px solid ${T.yellowBdr}; color: #92400e; padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; }
.gwarn-r   { background: ${T.redBg}; border: 1px solid ${T.redBdr}; color: #991b1b; padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal          { background: ${T.white}; border-radius: 14px; max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.mhead          { padding: 16px 22px; border-bottom: 1px solid ${T.border}; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: ${T.white}; z-index: 2; }
.mbody          { padding: 16px 22px; }
.xbtn           { width: 28px; height: 28px; border-radius: 6px; border: 1px solid ${T.border}; background: #f8fafc; cursor: pointer; font-size: 15px; color: ${T.muted}; }
.xbtn:hover     { background: #e2e8f0; }
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; border: 1px solid; }
.empty { text-align: center; padding: 48px 24px; color: ${T.dim}; }
.empty-icon { font-size: 32px; margin-bottom: 10px; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveMonitoring() {
  const [tab,        setTab]        = useState('live');
  const [sessions,   setSessions]   = useState([]);
  const [stats,      setStats]      = useState({});
  const [exams,      setExams]      = useState([]);
  const [examDetail, setExamDetail] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadLive = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [s, g] = await Promise.all([
        apiFetch('/api/admin/sessions'),
        apiFetch('/api/admin/geo-stats').catch(() => ({})),
      ]);
      const live = s.sessions || [];
      if (live.length > 0) {
        setSessions(live); setStats(g);
      } else {
        setSessions(DEMO_SESSIONS); setStats(DEMO_GEO_STATS);
      }
    } catch {
      setSessions(DEMO_SESSIONS); setStats(DEMO_GEO_STATS);
    }
    if (!quiet) setLoading(false);
  }, []);

  const loadCompleted = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/admin/completed-exams');
      setExams(d.exams || []);
    } catch { setExams(DEMO_COMPLETED); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'live') loadLive(false);
    else loadCompleted();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(() => loadLive(true), 15000);
    return () => clearInterval(id);
  }, [tab, loadLive]);

  // ── Leaflet ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'live') return;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        if (!leafletRef.current && document.getElementById('lm-map')) {
          leafletRef.current = L.map('lm-map').setView([13.0827, 80.2707], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(leafletRef.current);
        }
      } catch {}
    })();
  }, [tab]);

  useEffect(() => {
    if (!leafletRef.current || tab !== 'live') return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (!window.L) return;
    sessions.forEach(s => {
      const lat = parseFloat(s.lat), lng = parseFloat(s.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const dist = s.distance || 0, w = geoWarn(dist);
      const col = w === 'red' ? T.red : w === 'yellow' ? T.yellow : RISK_COLOR[s.risk_level || 'low'];
      const icon = window.L.divIcon({
        html: `<div style="width:13px;height:13px;background:${col};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
        iconSize: [13, 13], className: '',
      });
      const m = window.L.marker([lat, lng], { icon })
        .addTo(leafletRef.current)
        .bindPopup(`<b>${s.student_name || s.candidate_id}</b><br>${s.exam_name || ''}<br>Risk: ${s.risk_level || 'low'}${dist ? `<br>Distance: ${Math.round(dist)}m` : ''}`);
      markersRef.current.push(m);
      if (s.initial_lat && s.initial_lng) {
        const pi = window.L.divIcon({
          html: `<div style="width:9px;height:9px;background:${T.accent};border:2px solid #fff;border-radius:50%;opacity:.55"></div>`,
          iconSize: [9, 9], className: '',
        });
        const pm = window.L.marker([parseFloat(s.initial_lat), parseFloat(s.initial_lng)], { icon: pi })
          .addTo(leafletRef.current).bindPopup(`<b>Pinned:</b> ${s.student_name || s.candidate_id}`);
        markersRef.current.push(pm);
      }
    });
  }, [sessions, tab]);

  // ── Modal openers ─────────────────────────────────────────────────────────────
  async function openExam(exam) {
    try {
      const d = await apiFetch(`/api/admin/exam-violations/${exam.exam_id}`);
      setExamDetail({ exam, students: d.students || [] });
    } catch { setExamDetail({ exam, students: [] }); }
  }

  async function openStudent(s) {
    if (!s.assignment_id) return;
    try {
      const d = await apiFetch(`/api/admin/student-violations/${s.assignment_id}`);
      setSelected(d);
    } catch { setSelected({ student: s, violations: { all: [], categories: {} } }); }
  }

  // ── Compute summary proctoring counts ─────────────────────────────────────────
  const procHighRisk  = sessions.filter(s => s.proctoring?.overall_risk === 'high').length;
  const procMedRisk   = sessions.filter(s => s.proctoring?.overall_risk === 'medium').length;
  const noFaceCount   = sessions.filter(s => s.proctoring && !s.proctoring.face_detected).length;
  const multiFaceCount= sessions.filter(s => s.proctoring?.multiple_faces).length;

  return (
    <div className="lm-wrap">
      <style>{S}</style>
      <Sidebar />
      <Navbar />

      <main className="lm-main">

        {/* ── Header ── */}
        <div className="lm-head">
          <div>
            <div className="lm-title-bar">
              <div className="lm-accent-bar" />
              <div className="lm-title">Live Monitoring</div>
            </div>
            <div className="lm-sub">Real-time exam sessions · Location tracking · Proctoring alerts</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="lm-tabs">
              <button className={`lm-tab${tab === 'live' ? ' active' : ''}`} onClick={() => setTab('live')}>
                Live Sessions
              </button>
              <button className={`lm-tab${tab === 'completed' ? ' active' : ''}`} onClick={() => setTab('completed')}>
                Completed Exams
              </button>
            </div>
            <button className="refresh-btn"
              onClick={() => tab === 'live' ? loadLive(false) : loadCompleted()}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ══ LIVE TAB ══ */}
        {tab === 'live' && (
          <>
            {/* Stat cards */}
            <div className="stat-row">
              {[
                { lbl: 'Active Sessions',   val: stats.activeCandidates || sessions.length || 0, col: T.accent,  bdr: T.accent  },
                { lbl: 'High Risk',         val: stats.highRisk || 0,                             col: T.red,     bdr: T.red     },
                { lbl: 'No Face Detected',  val: noFaceCount,                                     col: T.orange,  bdr: T.orange  },
                { lbl: 'Geofence Alerts',   val: stats.criticalAlerts || 0,                       col: T.purple,  bdr: T.purple  },
              ].map(({ lbl, val, col, bdr }) => (
                <div className="stat" key={lbl} style={{ borderTop: `3px solid ${bdr}` }}>
                  <div className="stat-val" style={{ color: col }}>{val}</div>
                  <div className="stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="map-box">
              <div className="map-hdr">
                <span>📍</span> Live Location Tracking
                <div className="map-legend">
                  <span className="legend-blue">● Pinned start</span>
                  <span className="legend-yellow">● Drift &lt;{RED_THRESHOLD}m</span>
                  <span className="legend-red">● Drift {RED_THRESHOLD}m+</span>
                </div>
              </div>
              <div id="lm-map" />
            </div>

            {/* Sessions table — with inline proctoring status cards */}
            <div className="tbox">
              <div className="thdr">
                Active Sessions
                <span className="thdr-sub">({sessions.length}) being monitored</span>
              </div>
              {sessions.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🟢</div>
                  <div>No active sessions right now</div>
                </div>
              ) : (
                sessions.map(s => {
                  const dist = s.distance || 0;
                  const w    = geoWarn(dist);
                  const riskCol = RISK_COLOR[s.risk_level || 'low'];
                  const riskBg  = RISK_BG[s.risk_level || 'low'];
                  const riskBdr = RISK_BDR[s.risk_level || 'low'];

                  return (
                    <div key={s.session_id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 0,
                      borderBottom: `1px solid ${T.border}`,
                    }}>
                      {/* Left: session info in a mini table */}
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          {/* Name + roll */}
                          <div>
                            <div style={{ fontWeight: 700, color: T.navy, fontSize: 13.5 }}>
                              {s.student_name || s.candidate_id}
                            </div>
                            <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>
                              Roll: {s.roll_number} · {s.exam_name || s.exam_type}
                            </div>
                          </div>
                          {/* Risk pill */}
                          <span className="pill" style={{ background: riskBg, color: riskCol, border: `1px solid ${riskBdr}` }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: riskCol, animation: s.risk_level === 'high' ? 'pulse 1.5s infinite' : 'none' }} />
                            {(s.risk_level || 'LOW').toUpperCase()}
                          </span>
                          {/* Exam type */}
                          <TypeBadge type={s.exam_type} />
                          {/* Last ping */}
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: T.dim }}>
                            Last ping: {s.last_ping ? new Date(s.last_ping).toLocaleTimeString() : '—'}
                          </span>
                        </div>

                        {/* 4 metric cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                          {/* Student Exam */}
                          <div style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Student Exam</div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.navy, lineHeight: 1.4 }}>{s.exam_name || '—'}</div>
                            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 3 }}>Flags: <strong style={{ color: (s.violation_count || 0) > 0 ? T.red : T.green }}>{s.violation_count || 0}</strong></div>
                          </div>

                          {/* Pinned Location */}
                          <div style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Pinned Location</div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.navy, fontFamily: 'monospace' }}>
                              {s.initial_lat
                                ? `${parseFloat(s.initial_lat).toFixed(4)}`
                                : '—'}
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.navy, fontFamily: 'monospace' }}>
                              {s.initial_lng ? `${parseFloat(s.initial_lng).toFixed(4)}` : ''}
                            </div>
                          </div>

                          {/* Distance */}
                          <div style={{ background: w === 'red' ? T.redBg : w === 'yellow' ? T.yellowBg : '#f8fafc', border: `1px solid ${w === 'red' ? T.redBdr : w === 'yellow' ? T.yellowBdr : T.border}`, borderRadius: 9, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Distance</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: w === 'red' ? T.red : w === 'yellow' ? T.yellow : T.green, fontFamily: 'monospace' }}>
                              {dist > 0 ? `${Math.round(dist)}m` : '0m'}
                            </div>
                            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                              {!w ? 'Within range' : w === 'yellow' ? 'Warning drift' : 'Geofence exit'}
                            </div>
                          </div>

                          {/* Trust Score */}
                          <div style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Trust Score</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: (s.trust_score ?? 100) >= 70 ? T.green : (s.trust_score ?? 100) >= 40 ? T.orange : T.red, fontFamily: 'monospace' }}>
                              {s.trust_score ?? 100}%
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 4, overflow: 'hidden', marginTop: 5 }}>
                              <div style={{
                                height: '100%',
                                width: `${s.trust_score ?? 100}%`,
                                background: (s.trust_score ?? 100) >= 70 ? T.green : (s.trust_score ?? 100) >= 40 ? T.orange : T.red,
                                borderRadius: 99,
                              }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Proctoring Status card */}
                      <div style={{ width: 240, borderLeft: `1px solid ${T.border}`, padding: '14px 14px', background: '#fafbfc', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <ProctoringCard proc={s.proctoring} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Proctoring summary bar */}
            {sessions.length > 0 && (
              <div style={{
                background: T.white, border: `1px solid ${T.border}`, borderRadius: 11,
                padding: '14px 18px', boxShadow: T.shadow,
                display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12,
              }}>
                {[
                  { label: 'Proctoring High Risk', val: procHighRisk,   color: T.red,    bg: T.redBg,    bdr: T.redBdr   },
                  { label: 'Proctoring Med Risk',  val: procMedRisk,    color: T.orange, bg: T.orangeBg, bdr: T.orangeBdr},
                  { label: 'No Face Detected',     val: noFaceCount,    color: T.orange, bg: T.orangeBg, bdr: T.orangeBdr},
                  { label: 'Multiple Faces',       val: multiFaceCount, color: T.red,    bg: T.redBg,    bdr: T.redBdr   },
                ].map(({ label, val, color, bg, bdr }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 9, background: val > 0 ? bg : '#f8fafc', border: `1px solid ${val > 0 ? bdr : T.border}` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: val > 0 ? color : T.dim }}>{val}</div>
                    <div style={{ fontSize: 9.5, color: val > 0 ? color : T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ COMPLETED EXAMS TAB ══ */}
        {tab === 'completed' && (
          <div className="tbox">
            <div className="thdr">
              Completed Exams
              <span className="thdr-sub">({exams.length})</span>
            </div>
            {loading ? (
              <div className="empty">Loading…</div>
            ) : exams.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <div>No completed exams yet</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Exam</th><th>Type</th><th>Students</th><th>Submitted</th><th>Last Submission</th><th></th></tr>
                </thead>
                <tbody>
                  {exams.map(e => (
                    <tr key={e.exam_id} className="clickable" onClick={() => openExam(e)}>
                      <td style={{ fontWeight: 700, color: T.navy }}>{e.exam_name}</td>
                      <td><TypeBadge type={e.exam_type} /></td>
                      <td style={{ fontWeight: 700, color: T.accent }}>{e.total_students}</td>
                      <td style={{ color: T.green, fontWeight: 600 }}>{e.submitted_count}</td>
                      <td style={{ fontSize: 11, color: T.dim }}>
                        {e.last_submission ? new Date(e.last_submission).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button style={{ padding: '5px 13px', background: T.accentSoft, color: T.accent, border: `1px solid ${T.blueBdr}`, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* ══ EXAM DETAIL MODAL ══ */}
      {examDetail && (
        <div className="modal-backdrop" onClick={() => setExamDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{examDetail.exam.exam_name}</div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{examDetail.students.length} students</div>
              </div>
              <button className="xbtn" onClick={() => setExamDetail(null)}>✕</button>
            </div>
            <div className="mbody">
              {examDetail.students.length === 0 ? (
                <div className="empty">No students found</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Student</th><th>Status</th><th>Score</th><th>Violations</th><th>Geo</th><th>Risk</th></tr>
                  </thead>
                  <tbody>
                    {examDetail.students.map(s => (
                      <tr key={s.assignment_id} className="clickable" onClick={() => openStudent(s)}>
                        <td>
                          <div style={{ fontWeight: 600, color: T.navy }}>{s.student_name || s.student_id}</div>
                          <div style={{ fontSize: 11, color: T.dim }}>{s.email}</div>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background:  s.assignment_status === 'submitted' ? T.greenBg  : T.yellowBg,
                            color:       s.assignment_status === 'submitted' ? T.green    : T.yellow,
                            borderColor: s.assignment_status === 'submitted' ? T.greenBdr : T.yellowBdr,
                          }}>{s.assignment_status}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: T.navy }}>{s.score ?? '—'}</td>
                        <td style={{ color: (s.violations?.total || 0) > 0 ? T.red : T.dim, fontWeight: 700 }}>{s.violations?.total || 0}</td>
                        <td style={{ color: (s.violations?.geo || 0) > 0 ? T.red : T.dim }}>{s.violations?.geo || 0}</td>
                        <td>
                          {s.risk_level ? (
                            <span className="pill" style={{ background: RISK_BG[s.risk_level], color: RISK_COLOR[s.risk_level], border: `1px solid ${RISK_BDR[s.risk_level]}` }}>
                              {s.risk_level.toUpperCase()}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ STUDENT VIOLATIONS MODAL ══ */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>
                  {selected.student?.student_name || selected.student?.student_id}
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{selected.violations?.total || 0} violations</div>
              </div>
              <button className="xbtn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="mbody">
              {selected.geoSession && (
                <div style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[['Trust', `${selected.geoSession.trust_score ?? 100}%`], ['Risk', selected.geoSession.risk_level || 'low'], ['Flags', selected.geoSession.flag_count || 0], ['Pings', selected.geoSession.ping_count || 0]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: T.navy }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {!selected.violations?.total && (
                <div className="empty"><div className="empty-icon">✅</div><div>No violations recorded</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}