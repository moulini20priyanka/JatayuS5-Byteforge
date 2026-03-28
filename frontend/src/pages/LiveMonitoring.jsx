import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API     = 'http://localhost:5000/api';
const GEO_API = 'http://localhost:4000/api';
const POLL_MS  = 15000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function trustColor(score) {
  if (score === null || score === undefined) return { bg: '#f1f5f9', text: '#64748b', label: '—' };
  if (score >= 80) return { bg: '#f0fdf4', text: '#16a34a', label: `${score}` };
  if (score >= 50) return { bg: '#fffbeb', text: '#d97706', label: `${score}` };
  return { bg: '#fff5f5', text: '#dc2626', label: `${score}` };
}

function dotSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="7" fill="${color}" stroke="#fff" stroke-width="2"/>
  </svg>`;
}
function sessionIcon(score) {
  let color = '#16a34a';
  if (score === null || score === undefined) color = '#94a3b8';
  else if (score < 50) color = '#dc2626';
  else if (score < 80) color = '#d97706';
  return L.divIcon({ html: dotSvg(color), className: '', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12] });
}

function RiskBadge({ risk }) {
  const cls  = risk === 'High' ? 'risk-high' : risk === 'Medium' ? 'risk-medium' : 'risk-low';
  const icon = risk === 'High' ? '🔴' : risk === 'Medium' ? '🟡' : '🟢';
  return <span className={cls}>{icon} {risk}</span>;
}

function AlertBadge({ alert }) {
  if (!alert || alert === 'No Alert') return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>;
  const iconMap = {
    'Tab Switch Detected':    '🖥️',
    'Multiple Faces Detected':'👥',
    'No Face Detected':       '😶',
    'Mobile Phone Detected':  '📱',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-danger)', fontWeight: 500 }}>
      {iconMap[alert] || '⚠️'} {alert}
    </span>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

// ── Geo Map ───────────────────────────────────────────────────────────────────
function AdminLiveMap({ onTerminate }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef({});
  const [sessions, setSessions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    if (leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19,
    }).addTo(leafletRef.current);
    return () => { leafletRef.current?.remove(); leafletRef.current = null; };
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res  = await fetch(`${GEO_API}/admin/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.sessions || []);
      setSessions(list);
      setError(null);
      const map = leafletRef.current;
      if (!map) return;
      const seen = new Set();
      list.forEach(s => {
        if (!s.lat || !s.lng) return;
        seen.add(s.sessionId);
        const latlng = [s.lat, s.lng];
        const icon   = sessionIcon(s.trustScore);
        const popup  = `<b>${s.studentName || s.studentId}</b><br/>${s.college || ''}<br/>Trust: ${s.trustScore ?? '—'}<br/>${new Date(s.lastPing || Date.now()).toLocaleTimeString()}`;
        if (markersRef.current[s.sessionId]) {
          markersRef.current[s.sessionId].setLatLng(latlng).setIcon(icon).setPopupContent(popup);
        } else {
          markersRef.current[s.sessionId] = L.marker(latlng, { icon }).bindPopup(popup).addTo(map).on('click', () => setSelected(s.sessionId));
        }
      });
      Object.keys(markersRef.current).forEach(id => {
        if (!seen.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
      });
    } catch (err) {
      setError('Could not reach geo API — is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const flyTo = (s) => {
    setSelected(s.sessionId);
    if (s.lat && s.lng && leafletRef.current) {
      leafletRef.current.flyTo([s.lat, s.lng], 14, { animate: true, duration: 1 });
      markersRef.current[s.sessionId]?.openPopup();
    }
  };

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <div className="panel-header">
        <span className="panel-title">
          Live Location Map
          <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 500, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: 4, padding: '2px 8px' }}>GEO LIVE</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
          {loading && <span>Loading…</span>}
          {!loading && !error && <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>}
          {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
          <button className="btn btn-secondary btn-sm" onClick={fetchSessions}>Refresh</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        <div ref={mapRef} style={{ flex: 1, height: 420, minWidth: 0, borderRight: '1px solid var(--color-border)' }}/>
        <div style={{ width: 260, overflowY: 'auto', maxHeight: 420, background: 'var(--color-surface)' }}>
          {sessions.length === 0 && !loading && (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>No active geo sessions</div>
          )}
          {sessions.map(s => {
            const tc = trustColor(s.trustScore);
            const isSelected = selected === s.sessionId;
            return (
              <div key={s.sessionId} onClick={() => flyTo(s)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', background: isSelected ? 'var(--color-surface-hover, #f8fafc)' : 'transparent', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{s.studentName || s.studentId || 'Unknown'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: tc.bg, color: tc.text }}>{tc.label}</span>
                </div>
                {s.college && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.college}</div>}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                  {s.lat ? `${Number(s.lat).toFixed(5)}, ${Number(s.lng).toFixed(5)}` : 'No coords yet'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>Last ping: {s.lastPing ? new Date(s.lastPing).toLocaleTimeString() : '—'}</div>
                <button className="btn btn-danger btn-sm" style={{ width: '100%', fontSize: 11 }} onClick={e => { e.stopPropagation(); onTerminate(s.sessionId, s.studentName || s.studentId); }}>
                  Terminate Session
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
        {[{ color: '#16a34a', label: 'Trust ≥ 80' }, { color: '#d97706', label: 'Trust 50–79' }, { color: '#dc2626', label: 'Trust < 50' }, { color: '#94a3b8', label: 'No data' }].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', border: '1.5px solid #fff', boxShadow: `0 0 0 1px ${color}` }}/>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function LiveMonitoring() {
  const [alerts, setAlerts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filterRisk, setFilterRisk]   = useState('All');
  const [pulse, setPulse]             = useState(false);
  const { toasts, push }              = useToast();

  // Fetch live proctoring alerts from backend
  useEffect(() => {
    fetchAlerts();
  }, []);

  function fetchAlerts() {
    fetch(`${API}/proctoring/alerts`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setAlerts(Array.isArray(data) ? data : (data.alerts || []));
      })
      .catch(() => {
        // No static fallback — show empty state if backend unavailable
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  }

  // Live pulse timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
      fetchAlerts(); // refresh alerts
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminate = useCallback(async (sessionId, studentName) => {
    if (!window.confirm(`Terminate geo session for ${studentName || sessionId}?`)) return;
    try {
      const res = await fetch(`${GEO_API}/session/${sessionId}/terminate`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      push(`Geo session terminated for ${studentName || sessionId}`, 'success');
    } catch (err) {
      push(`Failed to terminate session: ${err.message}`, 'error');
    }
  }, [push]);

  const handleTableTerminate = useCallback(async (row) => {
    if (!window.confirm(`Terminate exam for ${row.candidate || row.name}?`)) return;
    const name = row.candidate || row.name;
    try {
      const res = await fetch(`${GEO_API}/session/by-student/${encodeURIComponent(name)}/terminate`, { method: 'POST' });
      if (res.ok) {
        push(`Session terminated for ${name}`, 'success');
      } else {
        push(`UI updated — confirm backend session ended for ${name}`, 'warning');
      }
    } catch {
      push(`Could not reach server — UI removed ${name}`, 'warning');
    }
    setAlerts(prev => prev.filter(a => a.id !== row.id));
  }, [push]);

  const filtered    = filterRisk === 'All' ? alerts : alerts.filter(a => a.risk === filterRisk);
  const highCount   = alerts.filter(a => a.risk === 'High').length;
  const medCount    = alerts.filter(a => a.risk === 'Medium').length;
  const activeCount = alerts.filter(a => a.status === 'In Progress').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

        <div className="page-header">
          <div className="page-header-left">
            <h1>Live Monitoring</h1>
            <p>Real-time proctoring alerts and candidate activity</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: pulse ? 'pulse-anim 0.6s ease' : 'live-pulse 2s infinite' }} />
              LIVE
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card stat-card-accent">
            <div className="stat-card-label">Active Candidates</div>
            <div className="stat-card-value">{activeCount}</div>
            <div className="stat-card-desc">Currently taking exam</div>
          </div>
          <div className="stat-card stat-card-accent-red">
            <div className="stat-card-label">High Risk</div>
            <div className="stat-card-value">{highCount}</div>
            <div className="stat-card-desc">Needs immediate review</div>
          </div>
          <div className="stat-card stat-card-accent-yellow">
            <div className="stat-card-label">Medium Risk</div>
            <div className="stat-card-value">{medCount}</div>
            <div className="stat-card-desc">Monitor closely</div>
          </div>
          <div className="stat-card stat-card-accent-green">
            <div className="stat-card-label">Low Risk</div>
            <div className="stat-card-value">{alerts.filter(a => a.risk === 'Low').length}</div>
            <div className="stat-card-desc">No issues detected</div>
          </div>
        </div>

        {/* Proctoring alerts table */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Proctoring Alerts</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="form-select" style={{ fontSize: 12, padding: '6px 10px' }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                <option value="All">All Risk Levels</option>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <button className="btn btn-secondary btn-sm">Export Alerts</button>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Loading proctoring data…
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"></div>
                {alerts.length === 0
                  ? 'No proctoring alerts. Data will appear once candidates start their exams.'
                  : 'No alerts match the selected filter.'}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>College</th>
                    <th>Exam</th>
                    <th>Status</th>
                    <th>Alert</th>
                    <th>Count</th>
                    <th>Risk Score</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} style={row.risk === 'High' ? { background: '#fff5f5' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: row.risk === 'High' ? '#fee2e2' : row.risk === 'Medium' ? '#fffbeb' : '#f0fdf4',
                            color:      row.risk === 'High' ? '#dc2626' : row.risk === 'Medium' ? '#d97706' : '#16a34a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {(row.candidate || row.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <span style={{ fontWeight: 500 }}>{row.candidate || row.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{row.college || '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{row.exam || '—'}</td>
                      <td><span className="badge badge-blue">{row.status || 'In Progress'}</span></td>
                      <td><AlertBadge alert={row.alert} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {row.count > 0 ? <strong style={{ color: 'var(--color-danger)' }}>×{row.count}</strong> : '—'}
                      </td>
                      <td><RiskBadge risk={row.risk} /></td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.time || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm">Review</button>
                          {row.risk === 'High' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleTableTerminate(row)}>Terminate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <AdminLiveMap onTerminate={handleTerminate} />

        {/* Toast notifications */}
        <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: t.type === 'success' ? '#f0fdf4' : t.type === 'error' ? '#fff5f5' : '#fffbeb',
              border: `1px solid ${t.type === 'success' ? '#86efac' : t.type === 'error' ? '#fca5a5' : '#fde68a'}`,
              color: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#d97706',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', animation: 'slideIn 0.2s ease',
            }}>{t.msg}</div>
          ))}
        </div>
      </main>

      <ToastContainer />
      <style>{`
        @keyframes live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pulse-anim { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}