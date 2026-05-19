import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar  from '../components/Navbar';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api';
function authHeader() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Design tokens — same as Reports.jsx ──────────────────────────────────────
const T = {
  pageBg:     '#f4f8fb',
  white:      '#ffffff',
  border:     '#e8edf2',
  shadow:     '0 1px 4px rgba(0,0,0,0.06)',
  navy:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  dim:        '#94a3b8',
  accent:     '#2563eb',
  accentSoft: '#eff6ff',
  green:      '#16a34a',
  greenBg:    '#f0fdf4',
  greenBdr:   '#bbf7d0',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  orange:     '#ea580c',
  orangeBg:   '#fff7ed',
  purple:     '#7c3aed',
  purpleBg:   '#f5f3ff',
  blue:       '#2563eb',
  blueBg:     '#eff6ff',
  yellow:     '#d97706',
  yellowBg:   '#fffbeb',
  yellowBdr:  '#fcd34d',
};

const RISK_COLOR = { low: T.green,  medium: T.yellow, high: T.red };
const RISK_BG    = { low: T.greenBg, medium: T.yellowBg, high: T.redBg };

const YELLOW_THRESHOLD = 100;
const RED_THRESHOLD    = 300;

const VIOL_ICONS = {
  NO_FACE:           '😶',
  MULTIPLE_FACES:    '👥',
  GAZE_AWAY:         '👀',
  OBJECT_DETECTED:   '📱',
  TAB_SWITCH:        '🔀',
  WINDOW_BLUR:       '🔀',
  FOCUS_LOST:        '🔀',
  LOCATION_VIOLATION:'📍',
  GEOFENCE_EXIT:     '🚫',
  FLAGGED:           '🚩',
  TERMINATED:        '⛔',
};

function geoWarn(dist) {
  if (!dist || dist < YELLOW_THRESHOLD) return null;
  return dist < RED_THRESHOLD ? 'yellow' : 'red';
}

// ── Demo data (2 students — for frontend display only) ────────────────────────
const DEMO_SESSIONS = [
  {
    session_id: 'SES001', candidate_id: 'S001',
    student_name: 'Moulini S', roll_number: '122058',
    exam_name: 'Virtusa – Full Stack Developer',
    exam_type: 'hiring',
    lat: 13.0827, lng: 80.2707,
    initial_lat: 13.0830, initial_lng: 80.2710,
    distance: 42,
    trust_score: 94, risk_level: 'low',
    violation_count: 1,
    last_ping: new Date(Date.now() - 45000).toISOString(),
  },
  {
    session_id: 'SES002', candidate_id: 'S002',
    student_name: 'Shreya S', roll_number: '119043',
    exam_name: 'Virtusa – Full Stack Developer',
    exam_type: 'hiring',
    lat: 13.0450, lng: 80.2200,
    initial_lat: 13.0830, initial_lng: 80.2710,
    distance: 431,
    trust_score: 38, risk_level: 'high',
    violation_count: 9,
    last_ping: new Date(Date.now() - 200000).toISOString(),
  },
];

const DEMO_GEO_STATS = {
  activeCandidates: 2,
  highRisk: 1,
  mediumRisk: 0,
  criticalAlerts: 1,
};

const DEMO_PROC_ALERTS = [
  {
    violation_id: 'V001', type: 'MULTIPLE_FACES', severity: 'high',
    student_name: 'Shreya S', student_id: 'S002',
    exam_name: 'Virtusa – Full Stack Developer',
    message: 'Two faces detected simultaneously in frame for 8 seconds.',
    has_snapshot: false,
    time: new Date(Date.now() - 180000).toISOString(),
  },
  {
    violation_id: 'V002', type: 'GEOFENCE_EXIT', severity: 'high',
    student_name: 'Shreya S', student_id: 'S002',
    exam_name: 'Virtusa – Full Stack Developer',
    message: 'Candidate location drifted 431 m from pinned start point.',
    has_snapshot: false,
    time: new Date(Date.now() - 120000).toISOString(),
  },
  {
    violation_id: 'V003', type: 'NO_FACE', severity: 'medium',
    student_name: 'Moulini S', student_id: 'S001',
    exam_name: 'Virtusa – Full Stack Developer',
    message: 'No face detected for 12 seconds.',
    has_snapshot: false,
    time: new Date(Date.now() - 600000).toISOString(),
  },
];

const DEMO_PROC_EXAMS = [
  {
    exam_name: 'Virtusa – Full Stack Developer', exam_type: 'hiring',
    currently_taking: 2, high: 1, medium: 0, submitted_count: 12,
  },
];

// ── Shared sub-components ─────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    placement:   { label: 'Placement',    color: '#6d28d9', bg: '#ede9fe' },
    hiring:      { label: 'Hiring',       color: '#6d28d9', bg: '#ede9fe' },
    university:  { label: 'University',   color: '#0369a1', bg: '#e0f2fe' },
    skill_cert:  { label: 'Certification',color: '#c2410c', bg: '#ffedd5' },
    certification:{ label: 'Certification',color: '#c2410c', bg: '#ffedd5' },
  };
  const s = map[type] || { label: type || 'Exam', color: T.muted, bg: '#f1f5f9' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

.lm-wrap  { margin-left: 230px; min-height: 100vh; background: ${T.pageBg}; font-family: 'Inter', system-ui, sans-serif; display: flex; flex-direction: column; }
.lm-main  { flex: 1; padding: 28px 30px; }

.lm-head  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
.lm-title { font-size: 22px; font-weight: 800; color: ${T.navy}; }
.lm-sub   { font-size: 12.5px; color: ${T.muted}; margin-top: 3px; }

.lm-tabs    { display: flex; gap: 3px; background: #f1f5f9; border-radius: 10px; padding: 4px; border: 0.5px solid ${T.border}; }
.lm-tab     { padding: 7px 16px; border-radius: 7px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: ${T.muted}; transition: all .15s; font-family: inherit; }
.lm-tab.active { background: ${T.white}; color: ${T.navy}; box-shadow: 0 1px 3px rgba(0,0,0,.08); border: 0.5px solid ${T.border}; }
.alert-dot { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: ${T.red}; color: #fff; font-size: 9px; font-weight: 800; margin-left: 5px; }

.refresh-btn       { padding: 7px 14px; background: ${T.white}; border: 0.5px solid ${T.border}; border-radius: 8px; font-size: 12px; font-weight: 600; color: ${T.accent}; cursor: pointer; font-family: inherit; }
.refresh-btn:hover { background: ${T.accentSoft}; }

.stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 18px; }
.stat     { background: ${T.white}; border: 0.5px solid ${T.border}; border-radius: 12px; padding: 15px 18px; box-shadow: ${T.shadow}; border-top: 3px solid ${T.border}; }
.stat-val { font-size: 26px; font-weight: 800; line-height: 1; }
.stat-lbl { font-size: 9.5px; font-weight: 700; color: ${T.dim}; letter-spacing: .7px; margin-top: 5px; text-transform: uppercase; }

.map-box { background: ${T.white}; border: 0.5px solid ${T.border}; border-radius: 12px; overflow: hidden; margin-bottom: 16px; box-shadow: ${T.shadow}; }
.map-hdr { padding: 12px 16px; border-bottom: 0.5px solid ${T.border}; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; flex-wrap: wrap; color: ${T.navy}; }
.map-legend { display: flex; gap: 8px; margin-left: auto; font-size: 11px; flex-wrap: wrap; }
.legend-blue   { background: ${T.accentSoft}; border: 0.5px solid #bfdbfe; padding: 2px 8px; border-radius: 5px; color: #1d4ed8; font-weight: 600; }
.legend-yellow { background: ${T.yellowBg}; border: 0.5px solid ${T.yellowBdr}; padding: 2px 8px; border-radius: 5px; color: #92400e; font-weight: 600; }
.legend-red    { background: ${T.redBg}; border: 0.5px solid #fecaca; padding: 2px 8px; border-radius: 5px; color: #991b1b; font-weight: 600; }
#lm-map { height: 300px; width: 100%; }

.tbox { background: ${T.white}; border: 0.5px solid ${T.border}; border-radius: 12px; overflow: hidden; margin-bottom: 14px; box-shadow: ${T.shadow}; }
.thdr { padding: 12px 16px; border-bottom: 0.5px solid ${T.border}; font-size: 13px; font-weight: 700; color: ${T.navy}; display: flex; align-items: center; justify-content: space-between; }
.thdr-sub { font-size: 11px; color: ${T.dim}; font-weight: 400; }

table { width: 100%; border-collapse: collapse; }
th    { font-size: 10px; font-weight: 700; color: ${T.dim}; letter-spacing: .7px; text-transform: uppercase; padding: 9px 13px; text-align: left; border-bottom: 1.5px solid ${T.border}; background: #f8fafc; white-space: nowrap; }
td    { padding: 10px 13px; font-size: 12.5px; border-bottom: 0.5px solid #f1f5f9; vertical-align: middle; color: ${T.text}; }
tr:last-child td  { border-bottom: none; }
tr:hover td       { background: #f0f7ff; cursor: pointer; }

.pill     { display: inline-flex; align-items: center; gap: 3px; padding: 2px 9px; border-radius: 99px; font-size: 10px; font-weight: 700; }
.trust-bar  { height: 5px; border-radius: 3px; background: #e2e8f0; overflow: hidden; width: 72px; display: inline-block; vertical-align: middle; }
.trust-fill { height: 100%; border-radius: 3px; }
.gwarn-y { background: ${T.yellowBg}; border: 0.5px solid ${T.yellowBdr}; color: #92400e; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; }
.gwarn-r { background: ${T.redBg}; border: 0.5px solid #fecaca; color: #991b1b; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; }

.vc      { border: 0.5px solid #fecaca; border-radius: 9px; padding: 11px 13px; margin-bottom: 8px; background: ${T.redBg}; display: flex; gap: 11px; align-items: flex-start; }
.vc.med  { border-color: ${T.yellowBdr}; background: ${T.yellowBg}; }
.vc.low  { border-color: ${T.border}; background: #f8fafc; }
.vsnap   { width: 72px; height: 54px; object-fit: cover; border-radius: 6px; border: 0.5px solid ${T.border}; flex-shrink: 0; cursor: pointer; }
.vph     { width: 72px; height: 54px; border-radius: 6px; border: 1px dashed ${T.border}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; background: #f8fafc; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal          { background: ${T.white}; border-radius: 14px; max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.mhead          { padding: 16px 22px; border-bottom: 0.5px solid ${T.border}; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: ${T.white}; z-index: 2; }
.mbody          { padding: 16px 22px; }
.xbtn           { width: 28px; height: 28px; border-radius: 6px; border: 0.5px solid ${T.border}; background: #f8fafc; cursor: pointer; font-size: 15px; color: ${T.muted}; }
.xbtn:hover     { background: #e2e8f0; }

.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; border: 0.5px solid; }

.empty { text-align: center; padding: 48px 24px; color: ${T.dim}; }
.empty-icon { font-size: 32px; margin-bottom: 10px; }

.demo-banner { background: ${T.orangeBg}; border: 1px solid #fed7aa; border-radius: 9px; padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: ${T.orange}; display: flex; align-items: center; gap: 7px; }
`;

// ── Component ─────────────────────────────────────────────────────────────────
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
  const [isDemo,     setIsDemo]     = useState(false);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadLive = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([
        apiFetch('/api/admin/sessions'),
        apiFetch('/api/admin/geo-stats').catch(() => ({})),
      ]);
      const liveSessions = s.sessions || [];
      if (liveSessions.length > 0) {
        setSessions(liveSessions);
        setStats(g);
        setIsDemo(false);
      } else {
        setSessions(DEMO_SESSIONS);
        setStats(DEMO_GEO_STATS);
        setIsDemo(true);
      }
    } catch {
      setSessions(DEMO_SESSIONS);
      setStats(DEMO_GEO_STATS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  const loadCompleted = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/admin/completed-exams');
      setExams(d.exams || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadProctoring = useCallback(async () => {
    setLoading(true);
    try {
      const [alerts, ae] = await Promise.all([
        apiFetch('/api/proctoring/admin/alerts?limit=100').catch(() => ({ alerts: [] })),
        apiFetch('/api/proctoring/admin/active-exams').catch(() => ({ exams: [] })),
      ]);
      const liveAlerts = alerts.alerts || [];
      const liveExams  = ae.exams || [];
      if (liveAlerts.length > 0 || liveExams.length > 0) {
        setProcAlerts(liveAlerts);
        setProcExams(liveExams);
        setIsDemo(false);
      } else {
        setProcAlerts(DEMO_PROC_ALERTS);
        setProcExams(DEMO_PROC_EXAMS);
        setIsDemo(true);
      }
    } catch {
      setProcAlerts(DEMO_PROC_ALERTS);
      setProcExams(DEMO_PROC_EXAMS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'live')           loadLive();
    else if (tab === 'completed') loadCompleted();
    else                          loadProctoring();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(loadLive, 15000);
    return () => clearInterval(id);
  }, [tab, loadLive]);

  useEffect(() => {
    if (tab !== 'proctoring') return;
    const id = setInterval(loadProctoring, 20000);
    return () => clearInterval(id);
  }, [tab, loadProctoring]);

  // ── Leaflet map ──────────────────────────────────────────────────────────────
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
      const col  = w === 'red' ? T.red : w === 'yellow' ? T.yellow : RISK_COLOR[s.risk_level || 'low'];
      const icon = window.L.divIcon({
        html: `<div style="width:13px;height:13px;background:${col};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
        iconSize: [13, 13], className: '',
      });
      const m = window.L.marker([lat, lng], { icon })
        .addTo(leafletRef.current)
        .bindPopup(`<b>${s.student_name || s.candidate_id}</b><br>${s.exam_name || ''}<br>Risk: ${s.risk_level || 'low'}${dist ? `<br>Dist: ${Math.round(dist)}m` : ''}`);
      markersRef.current.push(m);
      if (s.initial_lat && s.initial_lng) {
        const pi = window.L.divIcon({
          html: `<div style="width:9px;height:9px;background:${T.accent};border:2px solid #fff;border-radius:50%;opacity:.55"></div>`,
          iconSize: [9, 9], className: '',
        });
        const pm = window.L.marker([parseFloat(s.initial_lat), parseFloat(s.initial_lng)], { icon: pi })
          .addTo(leafletRef.current)
          .bindPopup(`<b>Pinned:</b> ${s.student_name || s.candidate_id}`);
        markersRef.current.push(pm);
      }
    });
  }, [sessions, tab]);

  // ── Modal openers ────────────────────────────────────────────────────────────
  async function openExam(exam) {
    try {
      const d = await apiFetch(`/api/admin/exam-violations/${exam.exam_id}`);
      setExamDetail({ exam, students: d.students || [] });
    } catch {
      setExamDetail({ exam, students: [] });
    }
  }

  async function openStudent(s) {
    if (!s.assignment_id) return;
    try {
      const d = await apiFetch(`/api/admin/student-violations/${s.assignment_id}`);
      setSelected(d);
    } catch {
      setSelected({ student: s, violations: { all: [], categories: {} } });
    }
  }

  async function loadSnap(id) {
    try {
      const d = await apiFetch(`/api/proctoring/snapshot/${id}`);
      setSnapModal(d);
    } catch {}
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const vcClass  = sev => sev === 'high' ? 'vc' : sev === 'medium' ? 'vc med' : 'vc low';
  const sevColor = sev => sev === 'high' ? T.red : sev === 'medium' ? T.yellow : T.dim;
  const sevBg    = sev => sev === 'high' ? T.redBg : sev === 'medium' ? T.yellowBg : '#f1f5f9';
  const sevBdr   = sev => sev === 'high' ? '#fecaca' : sev === 'medium' ? T.yellowBdr : T.border;

  const alertsByExam = procAlerts.reduce((acc, v) => {
    const k = v.exam_name || 'Unknown';
    (acc[k] = acc[k] || []).push(v);
    return acc;
  }, {});

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="lm-wrap">
      <style>{S}</style>
      <Sidebar />
      <Navbar />

      <main className="lm-main">

        {/* ── Page header ── */}
        <div className="lm-head">
          <div>
            <div className="lm-title">Live Monitoring</div>
            <div className="lm-sub">Real-time exam session tracking &amp; proctoring</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="lm-tabs">
              <button className={`lm-tab${tab === 'live' ? ' active' : ''}`} onClick={() => setTab('live')}>
                Live Sessions
              </button>
              <button className={`lm-tab${tab === 'proctoring' ? ' active' : ''}`} onClick={() => setTab('proctoring')}>
                Proctoring
                {procAlerts.length > 0 && <span className="alert-dot">{procAlerts.length}</span>}
              </button>
              <button className={`lm-tab${tab === 'completed' ? ' active' : ''}`} onClick={() => setTab('completed')}>
                Completed Exams
              </button>
            </div>
            <button className="refresh-btn"
              onClick={() => tab === 'live' ? loadLive() : tab === 'completed' ? loadCompleted() : loadProctoring()}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ══ LIVE TAB ══ */}
        {tab === 'live' && (
          <>
            <div className="stat-row">
              {[
                { lbl: 'Active Sessions', val: stats.activeCandidates || sessions.length || 0, col: T.accent,  borderCol: T.accent  },
                { lbl: 'High Risk',       val: stats.highRisk    || 0,                          col: T.red,    borderCol: T.red     },
                { lbl: 'Medium Risk',     val: stats.mediumRisk  || 0,                          col: T.orange, borderCol: T.orange  },
                { lbl: 'Critical Alerts', val: stats.criticalAlerts || 0,                       col: T.purple, borderCol: T.purple  },
              ].map(({ lbl, val, col, borderCol }) => (
                <div className="stat" key={lbl} style={{ borderTopColor: borderCol }}>
                  <div className="stat-val" style={{ color: col }}>{val}</div>
                  <div className="stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>

            <div className="map-box">
              <div className="map-hdr">
                📍 Live Location Tracking
                <div className="map-legend">
                  <span className="legend-blue">● Pinned start</span>
                  <span className="legend-yellow">● Yellow &lt;{RED_THRESHOLD}m</span>
                  <span className="legend-red">● Red {RED_THRESHOLD}m+</span>
                </div>
              </div>
              <div id="lm-map" />
            </div>

            <div className="tbox">
              <div className="thdr">
                Active Sessions
                <span className="thdr-sub">({sessions.length})</span>
              </div>
              {sessions.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🟢</div>
                  <div>No active sessions right now</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th><th>Exam</th><th>Pinned Location</th>
                      <th>Distance</th><th>Trust</th><th>Risk</th>
                      <th>Geo</th><th>Flags</th><th>Last Ping</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => {
                      const dist = s.distance || 0;
                      const w    = geoWarn(dist);
                      return (
                        <tr key={s.session_id}>
                          <td>
                            <div style={{ fontWeight: 700, color: T.navy }}>{s.student_name || s.candidate_id}</div>
                            <div style={{ fontSize: 11, color: T.dim }}>{s.roll_number}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{s.exam_name || s.exam_type}</td>
                          <td style={{ fontSize: 11, color: T.muted }}>
                            {s.initial_lat
                              ? `${parseFloat(s.initial_lat).toFixed(4)}, ${parseFloat(s.initial_lng).toFixed(4)}`
                              : '—'}
                          </td>
                          <td>
                            {dist > 0 ? (
                              <span style={{ fontWeight: 700, color: w === 'red' ? T.red : w === 'yellow' ? T.yellow : T.green, fontSize: 12 }}>
                                {Math.round(dist)}m
                              </span>
                            ) : (
                              <span style={{ color: T.dim, fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div className="trust-bar">
                                <div className="trust-fill" style={{ width: `${s.trust_score || 100}%`, background: RISK_COLOR[s.risk_level || 'low'] }} />
                              </div>
                              <span style={{ fontSize: 11, color: T.muted }}>{s.trust_score ?? 100}%</span>
                            </div>
                          </td>
                          <td>
                            <span className="pill" style={{ background: RISK_BG[s.risk_level || 'low'], color: RISK_COLOR[s.risk_level || 'low'] }}>
                              {(s.risk_level || 'LOW').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {w === 'yellow' && <span className="gwarn-y">⚠ {Math.round(dist)}m</span>}
                            {w === 'red'    && <span className="gwarn-r">🔴 {Math.round(dist)}m</span>}
                            {!w            && <span style={{ color: T.green, fontSize: 11, fontWeight: 600 }}>OK</span>}
                          </td>
                          <td style={{ color: (s.violation_count || 0) > 0 ? T.red : T.dim, fontWeight: 700 }}>
                            {s.violation_count || 0}
                          </td>
                          <td style={{ fontSize: 11, color: T.dim }}>
                            {s.last_ping ? new Date(s.last_ping).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ══ PROCTORING TAB ══ */}
        {tab === 'proctoring' && (
          <>
            <div className="tbox">
              <div className="thdr">
                Active Exams
                <span className="thdr-sub">({procExams.length}) being monitored</span>
              </div>
              {procExams.length === 0 ? (
                <div className="empty" style={{ padding: '24px' }}>No active exams</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Exam</th><th>Type</th><th>Taking</th><th>High Risk</th><th>Med Risk</th><th>Submitted</th></tr>
                  </thead>
                  <tbody>
                    {procExams.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: T.navy }}>{e.exam_name}</td>
                        <td><TypeBadge type={e.exam_type || 'placement'} /></td>
                        <td style={{ fontWeight: 800, color: T.accent, fontSize: 15 }}>{e.currently_taking || 0}</td>
                        <td style={{ color: (e.high || 0) > 0 ? T.red : T.dim, fontWeight: 700 }}>{e.high || 0}</td>
                        <td style={{ color: (e.medium || 0) > 0 ? T.yellow : T.dim, fontWeight: 700 }}>{e.medium || 0}</td>
                        <td style={{ color: T.green, fontWeight: 700 }}>{e.submitted_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="tbox">
              <div className="thdr">
                Violation Feed
                <span className="thdr-sub">{procAlerts.length} total</span>
              </div>
              {loading ? (
                <div className="empty">Loading…</div>
              ) : procAlerts.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">✅</div>
                  <div>No violations recorded</div>
                </div>
              ) : (
                <div style={{ padding: '14px 16px' }}>
                  {Object.entries(alertsByExam).map(([examName, alerts]) => (
                    <div key={examName} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.navy, marginBottom: 10, padding: '6px 10px', background: '#f8fafc', borderRadius: 7, border: `0.5px solid ${T.border}` }}>
                        {examName}
                        <span style={{ color: T.dim, fontWeight: 400, marginLeft: 5 }}>({alerts.length})</span>
                      </div>
                      {alerts.map((a, i) => (
                        <div key={i} className={vcClass(a.severity)}>
                          {a.has_snapshot ? (
                            <img src={`${API}/proctoring/snapshot/${a.violation_id}`} alt="snapshot" className="vsnap"
                              onClick={() => loadSnap(a.violation_id)} onError={e => e.target.style.display = 'none'} />
                          ) : (
                            <div className="vph">{VIOL_ICONS[a.type] || '⚠'}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sevColor(a.severity), background: sevBg(a.severity), padding: '1px 7px', borderRadius: 99, border: `0.5px solid ${sevBdr(a.severity)}` }}>
                                {(a.type || '').replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: T.navy }}>{a.student_name || a.student_id}</span>
                              <span style={{ fontSize: 10, color: T.dim, marginLeft: 'auto' }}>
                                {a.time ? new Date(a.time).toLocaleString() : ''}
                              </span>
                            </div>
                            {a.message && <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{a.message}</div>}
                            {a.has_snapshot && (
                              <button onClick={() => loadSnap(a.violation_id)}
                                style={{ marginTop: 4, fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                                View snapshot →
                              </button>
                            )}
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
                    <tr key={e.exam_id} onClick={() => openExam(e)}>
                      <td style={{ fontWeight: 700, color: T.navy }}>{e.exam_name}</td>
                      <td><TypeBadge type={e.exam_type} /></td>
                      <td style={{ fontWeight: 700, color: T.accent }}>{e.total_students}</td>
                      <td style={{ color: T.green, fontWeight: 600 }}>{e.submitted_count}</td>
                      <td style={{ fontSize: 11, color: T.dim }}>
                        {e.last_submission ? new Date(e.last_submission).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button style={{ padding: '5px 13px', background: T.accentSoft, color: T.accent, border: `0.5px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                      <tr key={s.assignment_id} onClick={() => openStudent(s)}>
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
                            <span className="pill" style={{ background: RISK_BG[s.risk_level], color: RISK_COLOR[s.risk_level] }}>
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
                <div style={{ background: '#f8fafc', border: `0.5px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[['Trust', `${selected.geoSession.trust_score ?? 100}%`], ['Risk', selected.geoSession.risk_level || 'low'], ['Flags', selected.geoSession.flag_count || 0], ['Pings', selected.geoSession.ping_count || 0]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: T.navy }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {[
                { key: 'registration_agent', lbl: 'Registration agent' },
                { key: 'proctoring_agent',   lbl: 'Proctoring agent'   },
                { key: 'tab_switch',         lbl: 'Tab / window switch' },
                { key: 'geo_violations',     lbl: 'Geo violations'      },
                { key: 'other',              lbl: 'Other'               },
              ].map(({ key, lbl }) => {
                const items = selected.violations?.categories?.[key] || [];
                return (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, letterSpacing: '.7px', marginBottom: 8, textTransform: 'uppercase' }}>
                      {lbl} ({items.length})
                    </div>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 12, color: T.dim, paddingLeft: 4 }}>None</div>
                    ) : items.map((v, i) => (
                      <div key={i} className={vcClass(v.severity)}>
                        <div className="vph">{VIOL_ICONS[v.type] || '⚠'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                            <strong style={{ fontSize: 12, color: T.navy }}>{(v.type || '').replace(/_/g, ' ')}</strong>
                            <span style={{ fontSize: 10, color: T.dim, marginLeft: 'auto' }}>
                              {v.occurred_at ? new Date(v.occurred_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{v.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!selected.violations?.total && (
                <div className="empty"><div className="empty-icon">✅</div><div>No violations recorded</div></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ SNAPSHOT MODAL ══ */}
      {snapModal && (
        <div className="modal-backdrop" onClick={() => setSnapModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{(snapModal.type || '').replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 11, color: T.dim }}>{snapModal.occurred_at ? new Date(snapModal.occurred_at).toLocaleString() : ''}</div>
              </div>
              <button className="xbtn" onClick={() => setSnapModal(null)}>✕</button>
            </div>
            <div className="mbody">
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 12, lineHeight: 1.6 }}>{snapModal.message}</div>
              {snapModal.snapshot_b64 ? (
                <img src={`data:image/jpeg;base64,${snapModal.snapshot_b64}`} alt="violation snapshot"
                  style={{ width: '100%', borderRadius: 9, border: `0.5px solid ${T.border}` }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: T.dim, background: '#f8fafc', borderRadius: 8, border: `1px dashed ${T.border}` }}>
                  No snapshot captured
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


