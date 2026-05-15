// frontend/src/pages/LiveMonitoring.jsx
// ─────────────────────────────────────────────────────────────────────────────
// NeuroAssess — Live Monitoring Dashboard  v3 — Reference UI Match
//
// Changes from v2:
//   ✅ University tab in ExamCards (left panel)
//   ✅ Candidate detail panel: coordinates, distance, zone, last ping, violations, trust
//   ✅ "Xs ago" relative last ping (e.g. "8s ago", "2m ago")
//   ✅ Distance from exam center (calculated from geofence_lat/lng)
//   ✅ Flag + Logs buttons in detail panel
//   ✅ Real roll_number from candidates.id (CS2021031 style)
//   ✅ All existing map/alert/attendance features retained
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:5000';

function token() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function riskColor(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#22c55e';
}
function riskBg(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#fef2f2' : l === 'medium' ? '#fffbeb' : '#f0fdf4';
}
function riskText(r) {
  const l = (r || 'low').toLowerCase();
  return l === 'high' ? '#b91c1c' : l === 'medium' ? '#92400e' : '#166534';
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371000;
  const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
  const dLng = (parseFloat(lng2) - parseFloat(lng1)) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(parseFloat(lat1)*Math.PI/180)
    * Math.cos(parseFloat(lat2)*Math.PI/180)
    * Math.sin(dLng/2)**2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function timeAgo(date) {
  if (!date) return '—';
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
}

function examTypeOf(ex) {
  const t = (ex.exam_type || '').toLowerCase();
  if (t === 'hiring' || t === 'placement') return 'hiring';
  if (t === 'certification' || t === 'skill_cert') return 'certification';
  if (t === 'university') return 'university';
  return 'hiring';
}

function examTypeBadgeOf(type) {
  if (type === 'hiring')        return { label: 'Hiring',       color: '#0369a1', bg: '#e0f2fe' };
  if (type === 'certification') return { label: 'Certification', color: '#065f46', bg: '#d1fae5' };
  return                               { label: 'University',    color: '#4338ca', bg: '#e0e7ff' };
}

const VIOL_ICONS = {
  NO_FACE: '😶', MULTIPLE_FACES: '👥', GAZE_AWAY: '👁️',
  OBJECT_DETECTED: '📱', TAB_SWITCH: '🖥️', TERMINATED: '⛔',
  LOCATION_VIOLATION: '🚨', FLAGGED: '🚩',
};

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#64748b' }}>
      {time.toLocaleTimeString()}
    </span>
  );
}

// ── Toast Stack ───────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: '#1e293b', color: '#fff', padding: '11px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, maxWidth: 340,
          borderLeft: `4px solid ${t.type === 'danger' ? '#ef4444' : t.type === 'warn' ? '#f59e0b' : '#22c55e'}`,
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const r = (risk || 'low').toUpperCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: riskBg(risk), color: riskText(risk),
      border: `1px solid ${riskColor(risk)}33`,
    }}>
      {r}
    </span>
  );
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function StatsCards({ geoStats, exams }) {
  const s = geoStats || {};
  const total = s.activeCandidates || 0;
  const cards = [
    { label: 'Active Candidates', value: total, icon: '👤', accent: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', desc: `Across ${(exams || []).length} active exams`, trend: '↑ Live', trendColor: '#16a34a' },
    { label: 'High Risk',  value: s.highRisk || 0, icon: '🔴', accent: '#ef4444', bg: '#fef2f2', border: '#fecaca', desc: 'Needs immediate review', trend: s.highRisk > 0 ? '⚠ Alert' : '✓ Clear', trendColor: s.highRisk > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Medium Risk', value: s.mediumRisk || 0, icon: '🟡', accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a', desc: 'Monitor closely', trend: 'Watching', trendColor: '#d97706' },
    { label: 'Critical Alerts', value: s.criticalAlerts || 0, icon: '🚨', accent: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Last 50 alerts', trend: s.criticalAlerts > 0 ? '↑ New' : '✓ None', trendColor: s.criticalAlerts > 0 ? '#7c3aed' : '#16a34a' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: '#fff', borderRadius: 14, padding: '18px 20px',
          border: `1px solid ${c.border}`, borderTop: `3px solid ${c.accent}`,
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#9ca3af', textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ background: c.bg, borderRadius: 8, padding: '6px 8px', fontSize: 18 }}>{c.icon}</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: c.accent, lineHeight: 1, letterSpacing: '-1.5px', marginBottom: 4 }}>{c.value}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.desc}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.trendColor }}>{c.trend}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Exam Cards with Tabs (All / University / Hiring / Certification) ──────────
function ExamCards({ exams, selectedExamId, onSelect, loading }) {
  const [tab, setTab] = useState('all');
  const safe = exams || [];
  const counts = {
    all: safe.length,
    university: safe.filter(e => examTypeOf(e) === 'university').length,
    hiring: safe.filter(e => examTypeOf(e) === 'hiring').length,
    certification: safe.filter(e => examTypeOf(e) === 'certification').length,
  };
  const filtered = tab === 'all' ? safe : safe.filter(e => examTypeOf(e) === tab);
  const tabs = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'university', label: 'University', emoji: '🎓' },
    { key: 'hiring', label: 'Hiring', emoji: '💼' },
    { key: 'certification', label: 'Certification', emoji: '📜' },
  ].filter(t => t.key === 'all' || counts[t.key] > 0);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>🎓 Active Exams</div>
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 10px' }}>
            {safe.length} running
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 13px', fontSize: 11.5, fontWeight: 700, border: 'none',
              borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'transparent', color: tab === t.key ? '#1d4ed8' : '#64748b',
              cursor: 'pointer', borderRadius: '6px 6px 0 0',
            }}>
              {t.emoji} {t.label}
              <span style={{
                marginLeft: 5, fontSize: 10, fontWeight: 700,
                background: tab === t.key ? '#dbeafe' : '#f1f5f9',
                color: tab === t.key ? '#1d4ed8' : '#9ca3af',
                padding: '1px 6px', borderRadius: 99,
              }}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading exams…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>No active exams
          </div>
        ) : filtered.map(ex => {
          const selected   = selectedExamId === ex.exam_id;
          const typeBadge  = examTypeBadgeOf(examTypeOf(ex));
          const total      = ex.student_count || 0;
          const high       = ex.high || 0;
          const med        = ex.medium || 0;
          const low        = ex.low || Math.max(0, total - high - med);
          const hasHigh    = high > 0;
          const statusPill = hasHigh
            ? { label: '🔴 Critical', color: '#dc2626', bg: '#fef2f2' }
            : med > 0 ? { label: '🟡 Warning', color: '#d97706', bg: '#fffbeb' }
            : { label: '🟢 Active', color: '#16a34a', bg: '#f0fdf4' };

          return (
            <div key={ex.exam_id}
              onClick={() => onSelect(selected ? null : ex.exam_id)}
              style={{
                border: `2px solid ${selected ? '#3b82f6' : '#f1f5f9'}`,
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                background: selected ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: selected ? '#1d4ed8' : '#111', marginBottom: 4 }}>
                    {ex.exam_name || 'Exam'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeBadge.color, background: typeBadge.bg, padding: '2px 8px', borderRadius: 99 }}>
                      {typeBadge.label}
                    </span>
                    {ex.assigned_proctor && (
                      <span style={{ fontSize: 10, color: '#6b7280' }}>👤 {ex.assigned_proctor}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusPill.color, background: statusPill.bg, padding: '2px 9px', borderRadius: 99 }}>
                    {statusPill.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: selected ? '#1d4ed8' : '#6b7280', background: selected ? '#dbeafe' : '#f3f4f6', padding: '2px 9px', borderRadius: 99 }}>
                    {total} students
                  </span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
                {total > 0 && <>
                  <div style={{ width: `${(high/total)*100}%`, background: '#ef4444' }} />
                  <div style={{ width: `${(med/total)*100}%`, background: '#f59e0b' }} />
                  <div style={{ width: `${(low/total)*100}%`, background: '#22c55e' }} />
                </>}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 {high} high</span>
                <span style={{ color: '#d97706', fontWeight: 700 }}>🟡 {med} med</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>🟢 {low} safe</span>
              </div>
              {selected && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>
                  Click exam to load candidates →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Candidates Table ──────────────────────────────────────────────────────────
function CandidatesTable({ candidates, loading, selectedExamId, onTerminate, onSelectCandidate, selectedCandidateId, examCenter }) {
  const [search, setSearch] = useState('');
  const safe = (candidates || []).filter(c =>
    !search || (c.student_name || '').toLowerCase().includes(search.toLowerCase())
            || (c.roll_number  || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedExamId) return (
    <div style={{ background: '#f8fafc', border: '1px dashed #d1d5db', borderRadius: 12, padding: 28, textAlign: 'center', color: '#9ca3af' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
      <div style={{ fontSize: 13 }}>Select an active exam to view candidates</div>
    </div>
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>👥 Candidates</span>
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 10px' }}>
            {safe.length} students
          </span>
          <span style={{ fontSize: 11, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 10px' }}>
            Click a row to view details
          </span>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', width: 200 }} />
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading…</div>
      ) : safe.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No candidates</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Student', 'Roll No', 'Coordinates', 'Distance', 'Zone', 'Risk', 'Trust', 'Violations', 'Last Ping', 'Action'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 10.5, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safe.map((c, i) => {
                const trust    = c.trust_score ?? 100;
                const trustColor = trust >= 70 ? '#16a34a' : trust >= 40 ? '#d97706' : '#dc2626';
                const lat      = c.last_lat || c.lat;
                const lng      = c.last_lng || c.lng;
                const hasCoords = lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));
                const centerLat = examCenter?.[0] || c.geofence_lat || c.initial_lat;
                const centerLng = examCenter?.[1] || c.geofence_lng || c.initial_lng;
                const distM     = hasCoords ? haversineMeters(centerLat, centerLng, lat, lng) : null;
                const radius    = c.geofence_radius || 500;
                const isOut     = distM !== null ? distM > radius : c.location_violation;
                const isSelected = selectedCandidateId && (
                  String(selectedCandidateId) === String(c.student_id) ||
                  String(selectedCandidateId) === String(c.assignment_id)
                );
                const pingStr = timeAgo(c.last_ping || c.last_ping_at);
                const isStale = c.last_ping && (Date.now() - new Date(c.last_ping)) > 60000;

                return (
                  <tr key={c.assignment_id || c.student_id || i}
                    onClick={() => onSelectCandidate(isSelected ? null : c)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eff6ff' : isOut ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafbff',
                      cursor: 'pointer',
                      outline: isSelected ? '2px solid #3b82f6' : 'none',
                      outlineOffset: '-1px',
                    }}
                  >
                    {/* Student */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: isSelected ? '#3b82f6' : riskColor(c.risk_level), color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {(c.student_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: isSelected ? '#1d4ed8' : '#111', fontSize: 12.5 }}>
                            {c.student_name || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{c.college || ''}</div>
                        </div>
                      </div>
                    </td>
                    {/* Roll No */}
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11.5, color: '#475569' }}>
                      {c.roll_number || c.student_id || '—'}
                    </td>
                    {/* Coordinates */}
                    <td style={{ padding: '10px 12px' }}>
                      {hasCoords ? (
                        <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#374151', lineHeight: 1.5 }}>
                          <div>{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</div>
                        </div>
                      ) : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                    </td>
                    {/* Distance */}
                    <td style={{ padding: '10px 12px' }}>
                      {distM !== null ? (
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: distM > radius ? '#dc2626' : distM > radius * 0.8 ? '#d97706' : '#16a34a' }}>
                          {distM}m
                        </span>
                      ) : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                    </td>
                    {/* Zone */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: isOut ? '#fee2e2' : '#ecfdf5', color: isOut ? '#b91c1c' : '#166534' }}>
                        {isOut ? '✗ Outside' : '✓ In Zone'}
                      </span>
                    </td>
                    {/* Risk */}
                    <td style={{ padding: '10px 12px' }}><RiskBadge risk={c.risk_level} /></td>
                    {/* Trust */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 52, height: 5, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ width: `${trust}%`, height: '100%', background: trustColor, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: trustColor }}>{trust}%</span>
                      </div>
                    </td>
                    {/* Violations */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: (c.violation_count || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        {c.violation_count || 0}
                      </span>
                    </td>
                    {/* Last Ping */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: isStale ? '#dc2626' : '#64748b' }}>
                        {pingStr}
                      </span>
                    </td>
                    {/* Action */}
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      {(c.risk_level === 'high' || isOut) && (
                        <button onClick={() => onTerminate(c)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          ⛔ Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Candidate Detail Panel (reference UI style) ───────────────────────────────
function CandidateDetailPanel({ candidate, onClose, onFlag, onViewLogs, examCenter }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [flagging, setFlagging] = useState(false);

  if (!candidate) return null;

  const lat   = candidate.last_lat || candidate.lat;
  const lng   = candidate.last_lng || candidate.lng;
  const trust = candidate.trust_score ?? 100;
  const trustColor = trust >= 70 ? '#16a34a' : trust >= 40 ? '#d97706' : '#dc2626';

  const centerLat = examCenter?.[0] || candidate.geofence_lat || candidate.initial_lat;
  const centerLng = examCenter?.[1] || candidate.geofence_lng || candidate.initial_lng;
  const distM     = haversineMeters(centerLat, centerLng, lat, lng);
  const radius    = candidate.geofence_radius || 500;
  const isOut     = distM !== null ? distM > radius : candidate.location_violation;

  const handleFlag = async () => {
    setFlagging(true);
    try {
      await apiFetch(`/api/proctoring/admin/flag/${candidate.assignment_id}`, { method: 'POST', body: JSON.stringify({ reason: 'Flagged via dashboard' }) });
      if (onFlag) onFlag(candidate);
    } catch (e) { console.warn('Flag failed:', e.message); }
    setFlagging(false);
  };

  const handleLogs = async () => {
    if (logsOpen) { setLogsOpen(false); return; }
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const data = await apiFetch(`/api/proctoring/admin/logs/${candidate.assignment_id}`);
      setLogs(data.logs || []);
    } catch { setLogs([]); }
    setLogsLoading(false);
  };

  const rows = [
    { label: '📍 Coordinates', value: lat && lng ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}` : '—', mono: true },
    { label: '📏 Distance', value: distM !== null ? `${distM}m from center` : '—', color: distM > radius ? '#dc2626' : distM > radius * 0.8 ? '#d97706' : '#16a34a' },
    { label: '🗺 Zone', value: isOut ? '✗ Outside allowed zone' : '✓ Inside allowed zone', color: isOut ? '#dc2626' : '#16a34a' },
    { label: '⏱ Last Ping', value: timeAgo(candidate.last_ping) },
    { label: '🚩 Violations', value: `${candidate.violation_count || 0} recorded`, color: (candidate.violation_count || 0) > 0 ? '#dc2626' : '#166534' },
    { label: '🛡 Trust Score', value: null, isBar: true, trust, trustColor },
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: riskColor(candidate.risk_level), color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(candidate.student_name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{candidate.student_name}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
              {candidate.roll_number || candidate.student_id} • <RiskBadge risk={candidate.risk_level} />
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '14px 18px' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{row.label}</span>
            {row.isBar ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 120, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${row.trust}%`, height: '100%', background: row.trustColor, borderRadius: 99 }} />
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: row.trustColor }}>{row.trust}%</span>
              </div>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: row.color || '#0f172a', fontFamily: row.mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '60%' }}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10 }}>
        <button onClick={handleFlag} disabled={flagging} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          🚩 {flagging ? 'Flagging…' : 'Flag'}
        </button>
        <button onClick={handleLogs} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          📋 {logsOpen ? 'Hide Logs' : 'Logs'}
        </button>
      </div>

      {/* Logs panel */}
      {logsOpen && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
            {logsLoading ? (
              <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>Loading logs…</div>
            ) : logs.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>No violations recorded</div>
            ) : logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11.5 }}>
                <span>{VIOL_ICONS[log.type] || '⚠️'}</span>
                <span style={{ flex: 1, color: '#374151' }}>{log.type?.replace(/_/g, ' ')} {log.message ? `— ${log.message}` : ''}</span>
                <span style={{ color: '#9ca3af', fontFamily: 'monospace', flexShrink: 0 }}>{timeAgo(log.occurred_at)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: log.severity === 'high' ? '#fef2f2' : '#fffbeb', color: log.severity === 'high' ? '#dc2626' : '#d97706' }}>
                  {(log.severity || '').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attendance Panel ──────────────────────────────────────────────────────────
function ExamAttendancePanel({ examId }) {
  const [data, setData]    = useState({ active: [], completed: [], notStarted: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/proctoring/admin/exam-attendance/${examId}`);
      setData(res);
    } catch { /* keep previous data */ }
    finally { setLoading(false); }
  }, [examId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  if (!examId) return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ fontSize: 26 }}>📋</div>Select an exam to see attendance
    </div>
  );

  const total = data.active.length + data.completed.length + data.notStarted.length;

  function Section({ title, color, count, children, open = true }) {
    const [isOpen, setIsOpen] = useState(open);
    return (
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setIsOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '5px 0', borderBottom: `2px solid ${color}` }}>
          <span style={{ background: color, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>{count}</span>
          <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && <div style={{ marginTop: 6 }}>{children}</div>}
      </div>
    );
  }

  function PersonRow({ p, type }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 7, marginBottom: 3, background: '#f8fafc', border: '1px solid #f1f5f9', fontSize: 12 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#111', fontSize: 12 }}>{p.name || '—'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{p.email || '—'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
          {type === 'active'     && <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>● Live</span>}
          {type === 'completed'  && <div style={{ fontSize: 10, color: '#6b7280' }}>{p.exit_reason}</div>}
          {type === 'notStarted' && <div style={{ fontSize: 10, color: '#9ca3af' }}>Not started</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>📋 Attendance</div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 10px', color: '#64748b' }}>
          {total} assigned
        </span>
      </div>
      <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
        {loading && data.active.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 16 }}>Loading…</div>
        ) : (
          <>
            <Section title="🟢 Active Now" color="#22c55e" count={data.active.length} open>
              {data.active.length === 0
                ? <div style={{ fontSize: 11, color: '#9ca3af' }}>No active candidates</div>
                : data.active.map(p => <PersonRow key={p.user_id} p={p} type="active" />)}
            </Section>
            <Section title="✅ Completed / Left" color="#6366f1" count={data.completed.length} open={false}>
              {data.completed.length === 0
                ? <div style={{ fontSize: 11, color: '#9ca3af' }}>None yet</div>
                : data.completed.map(p => <PersonRow key={p.user_id} p={p} type="completed" />)}
            </Section>
            <Section title="🕐 Not Yet Started" color="#f59e0b" count={data.notStarted.length} open={false}>
              {data.notStarted.length === 0
                ? <div style={{ fontSize: 11, color: '#9ca3af' }}>All started</div>
                : data.notStarted.map(p => <PersonRow key={p.user_id} p={p} type="notStarted" />)}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ── Live Map ──────────────────────────────────────────────────────────────────
function LiveMap({ sessions, examCenter, focusCandidate }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layerRef = useRef(null);
  const initRef = useRef(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link');
      l.id = 'leaflet-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    const initMap = () => {
      if (!mapRef.current || initRef.current || !window.L) return;
      initRef.current = true;
      const center = examCenter || [13.0827, 80.2707];
      const map = window.L.map(mapRef.current, { zoom: 14, center });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      leafletRef.current = map;
      layerRef.current = window.L.layerGroup().addTo(map);
      window.L.circle(center, { radius: 500, color: '#4f46e5', weight: 2, dashArray: '8 6', fillColor: '#4f46e5', fillOpacity: 0.05 }).addTo(map);
    };
    if (!window.L) {
      if (!document.getElementById('leaflet-js')) {
        const s = document.createElement('script');
        s.id = 'leaflet-js';
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = () => setTimeout(initMap, 100);
        document.head.appendChild(s);
      }
    } else { setTimeout(initMap, 50); }
    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; initRef.current = false; }
    };
  }, []);

  useEffect(() => {
    if (!focusCandidate || !leafletRef.current) return;
    const lat = parseFloat(focusCandidate.last_lat || focusCandidate.lat || focusCandidate.initial_lat);
    const lng = parseFloat(focusCandidate.last_lng || focusCandidate.lng || focusCandidate.initial_lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) leafletRef.current.setView([lat, lng], 16, { animate: true });
  }, [focusCandidate?.student_id, focusCandidate?.last_lat]);

  useEffect(() => {
    const L = window.L;
    if (!L || !leafletRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const visible = filter === 'high' ? sessions.filter(s => s.risk_level === 'high' || s.location_violation) : sessions;
    const coords = [];
    visible.forEach(s => {
      const lat = parseFloat(s.lat || s.last_lat);
      const lng = parseFloat(s.lng || s.last_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      coords.push([lat, lng]);
      const risk  = s.location_violation ? 'high' : (s.risk_level || 'low');
      const color = risk === 'high' ? '#dc2626' : risk === 'medium' ? '#d97706' : '#16a34a';
      const isFocused = focusCandidate && String(focusCandidate.student_id) === String(s.candidate_id || s.student_id);
      const size = isFocused ? 22 : (risk === 'high' ? 18 : 13);
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${isFocused ? '3px solid #1d4ed8' : '2.5px solid #fff'};box-shadow:0 1px 6px ${color}88;"></div>`,
        iconSize: [size, size], iconAnchor: [size/2, size/2],
      });
      L.marker([lat, lng], { icon })
        .bindPopup(`<b>${s.student_name || 'Unknown'}</b><br/>${s.roll_number || ''}<br/>Trust: ${s.trust_score ?? '—'}%<br/>Risk: ${risk.toUpperCase()}`)
        .addTo(layerRef.current);
    });
    if (!focusCandidate) {
      if (coords.length === 1) leafletRef.current.setView(coords[0], 15);
      else if (coords.length > 1) leafletRef.current.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
    }
  }, [sessions, filter, focusCandidate]);

  const handleRecenter = () => {
    if (!leafletRef.current) return;
    const coords = sessions.map(s => [parseFloat(s.lat || s.last_lat), parseFloat(s.lng || s.last_lng)]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    if (coords.length) leafletRef.current.fitBounds(window.L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
  };

  const inZone = sessions.filter(s => !s.location_violation).length;
  const high   = sessions.filter(s => s.risk_level === 'high' || s.location_violation).length;
  const medium = sessions.filter(s => !s.location_violation && s.risk_level === 'medium').length;
  const safe   = sessions.filter(s => !s.location_violation && s.risk_level === 'low').length;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>📍 Live Location Tracking
          {focusCandidate && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, padding: '2px 9px', borderRadius: 99, marginLeft: 8 }}>📍 {focusCandidate.student_name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFilter(f => f === 'all' ? 'high' : 'all')} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, border: '1px solid', borderColor: filter === 'high' ? '#fecaca' : '#e5e7eb', background: filter === 'high' ? '#fef2f2' : '#fff', color: filter === 'high' ? '#dc2626' : '#64748b', cursor: 'pointer' }}>
            {filter === 'high' ? '🔴 High Risk Only' : '🌐 All Candidates'}
          </button>
          <button onClick={handleRecenter} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>⊙ Recenter</button>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ height: 300, width: '100%' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 500, background: 'rgba(255,255,255,.95)', border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 10px rgba(0,0,0,.08)' }}>
          {[['#22c55e', 'Safe'], ['#f59e0b', 'Warning'], ['#ef4444', 'High Risk']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} /> {l}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
            <div style={{ width: 18, height: 0, borderTop: '2px dashed #4f46e5' }} /> Geofence
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid #f1f5f9' }}>
        {[{ label: 'In Zone', value: inZone, color: '#3b82f6' }, { label: 'Safe', value: safe, color: '#16a34a' }, { label: 'Warning', value: medium, color: '#d97706' }, { label: 'High Risk', value: high, color: '#dc2626' }].map((s, i) => (
          <div key={s.label} style={{ padding: '10px 16px', borderRight: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts Table ──────────────────────────────────────────────────────────────
function AlertsTable({ alerts, loading, filterRisk, setFilterRisk, onViewSnapshot, onTerminate }) {
  const safe = (alerts || []).filter(a => filterRisk === 'all' || (a.severity || '').toLowerCase() === filterRisk);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>⚠️ Proctoring Alerts</div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <option value="all">All Risk Levels</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading alerts…</div>
        ) : safe.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>No alerts for this filter
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Candidate', 'Exam', 'Type', 'Severity', 'Time', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 10.5, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safe.map(a => (
                <tr key={a.violation_id} style={{ borderBottom: '1px solid #f1f5f9', background: a.severity === 'high' ? '#fff5f5' : '#fff' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111' }}>{a.student_name}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{a.roll_number}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#374151', fontSize: 12, maxWidth: 160 }}>{a.exam_name || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><span>{VIOL_ICONS[a.type] || '⚠️'} {(a.type || '').replace(/_/g, ' ')}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: a.severity === 'high' ? '#fef2f2' : a.severity === 'medium' ? '#fffbeb' : '#f0fdf4', color: a.severity === 'high' ? '#dc2626' : a.severity === 'medium' ? '#d97706' : '#16a34a' }}>
                      {(a.severity || '').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>{timeAgo(a.time)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {a.has_snapshot && (
                        <button onClick={() => onViewSnapshot(a.violation_id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📸</button>
                      )}
                      {a.severity === 'high' && (
                        <button onClick={() => onTerminate({ assignment_id: a.assignment_id, student_name: a.student_name })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>⛔</button>
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
  );
}

// ── Snapshot Modal ────────────────────────────────────────────────────────────
function SnapshotModal({ violationId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true); setErr(null);
    apiFetch(`/api/proctoring/snapshot/${violationId}`).then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [violationId]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 560, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>📸 Violation Snapshot</div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>✕ Close</button>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading…</div>}
        {err    && <div style={{ color: '#dc2626', padding: 12, background: '#fef2f2', borderRadius: 8 }}>Error: {err}</div>}
        {data && (
          <>
            {data.snapshot_b64
              ? <img src={`data:image/jpeg;base64,${data.snapshot_b64}`} alt="Snapshot" style={{ width: '100%', borderRadius: 10 }} />
              : <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 10, color: '#9ca3af' }}>No snapshot captured</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Terminate Modal ───────────────────────────────────────────────────────────
function TerminateModal({ candidate, onConfirm, onClose }) {
  const [reason, setReason] = useState('Repeated violations detected');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%' }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⛔</div>
        <div style={{ fontWeight: 800, fontSize: 16, textAlign: 'center', color: '#0f172a', marginBottom: 6 }}>Terminate Session?</div>
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          This will end the exam session for <strong>{candidate?.student_name}</strong>.
        </div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, padding: '8px 12px', resize: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => onConfirm(candidate, reason)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>⛔ Terminate</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminLiveMonitoring() {
  const [exams,             setExams]           = useState([]);
  const [candidates,        setCandidates]      = useState([]);
  const [alerts,            setAlerts]          = useState([]);
  const [geoSessions,       setGeoSessions]     = useState([]);
  const [geoStats,          setGeoStats]        = useState({ activeCandidates: 0, highRisk: 0, mediumRisk: 0, criticalAlerts: 0 });
  const [selectedExamId,    setSelectedExamId]  = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filterRisk,        setFilterRisk]      = useState('all');
  const [loadingExams,      setLoadingExams]    = useState(true);
  const [loadingCands,      setLoadingCands]    = useState(false);
  const [loadingAlerts,     setLoadingAlerts]   = useState(false);
  const [snapshotViolId,    setSnapshotViolId]  = useState(null);
  const [terminateTarget,   setTerminateTarget] = useState(null);
  const [toasts,            setToasts]          = useState([]);
  const [pulse,             setPulse]           = useState(false);

  const alertIdsRef = useRef(new Set());
  const geoPolRef   = useRef(false);
  const alertPolRef = useRef(false);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const data = await apiFetch('/api/proctoring/admin/active-exams');
      setExams(data.exams || []);
    } catch { /* keep previous */ }
    finally { setLoadingExams(false); }
  }, []);

  const fetchCandidates = useCallback(async (examId) => {
    if (!examId) { setCandidates([]); return; }
    setLoadingCands(true);
    try {
      const data = await apiFetch(`/api/proctoring/admin/candidates/${examId}`);
      const merged = (data.candidates || []).map(c => {
        const geo = geoSessions.find(s => String(s.candidate_id) === String(c.student_id));
        return {
          ...c,
          last_lat: geo?.lat ?? geo?.last_lat ?? c.last_lat,
          last_lng: geo?.lng ?? geo?.last_lng ?? c.last_lng,
          last_ping: geo?.last_ping ?? c.last_ping,
          trust_score: geo?.trust_score ?? c.trust_score ?? 100,
          risk_level: geo?.risk_level ?? c.risk_level ?? 'low',
          location_violation: geo?.location_violation ?? c.location_violation ?? false,
        };
      });
      setCandidates(merged);
    } catch { /* keep previous */ }
    finally { setLoadingCands(false); }
  }, [geoSessions]);

  const fetchGeoSessions = useCallback(async () => {
    if (geoPolRef.current) return;
    geoPolRef.current = true;
    try {
      const data = await apiFetch('/api/admin/sessions');
      const sessions = data.sessions || [];
      setGeoSessions(sessions);
      setGeoStats(prev => ({
        activeCandidates: sessions.length,
        highRisk: sessions.filter(s => s.location_violation || s.risk_level === 'high').length,
        mediumRisk: sessions.filter(s => !s.location_violation && s.risk_level === 'medium').length,
        criticalAlerts: prev.criticalAlerts,
      }));
    } catch { /* keep previous */ }
    finally { geoPolRef.current = false; }
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (alertPolRef.current) return;
    alertPolRef.current = true;
    try {
      const data = await apiFetch('/api/proctoring/admin/alerts');
      const fetched = data.alerts || [];
      const merged  = [...fetched];
      const newOnes = merged.filter(a => !alertIdsRef.current.has(a.violation_id));
      newOnes.forEach(a => alertIdsRef.current.add(a.violation_id));
      const newest = newOnes.find(a => a.severity === 'high');
      if (newest) showToast(`🚨 ${newest.type?.replace(/_/g,' ')} — ${newest.student_name}`, 'danger');
      setAlerts(merged);
      setGeoStats(prev => ({ ...prev, criticalAlerts: merged.filter(a => a.severity === 'high').length }));
    } catch { /* keep previous */ }
    finally {
      setLoadingAlerts(false);
      alertPolRef.current = false;
    }
  }, [showToast]);

  // Init
  useEffect(() => {
    fetchExams(); fetchGeoSessions(); fetchAlerts();
  }, []);

  // Polling
  useEffect(() => { const t = setInterval(fetchExams, 15000); return () => clearInterval(t); }, [fetchExams]);
  useEffect(() => { const t = setInterval(() => { fetchAlerts(); setPulse(true); setTimeout(() => setPulse(false), 600); }, 10000); return () => clearInterval(t); }, [fetchAlerts]);
  useEffect(() => { const t = setInterval(fetchGeoSessions, 8000); return () => clearInterval(t); }, [fetchGeoSessions]);

  useEffect(() => {
    fetchCandidates(selectedExamId);
    setSelectedCandidate(null);
  }, [selectedExamId]);

  useEffect(() => {
    if (selectedExamId) fetchCandidates(selectedExamId);
  }, [geoSessions]);

  const handleTerminate = useCallback(async (target, reason) => {
    try {
      if (target?.session_id) {
        await apiFetch(`/api/session/${target.session_id}/terminate`, { method: 'POST' });
      } else if (target?.assignment_id) {
        await apiFetch(`/api/proctoring/admin/terminate/${target.assignment_id}`, { method: 'POST', body: JSON.stringify({ reason }) });
      }
      setCandidates(p => p.filter(c => c.assignment_id !== target?.assignment_id));
      showToast('⛔ Session terminated', 'danger');
      fetchAlerts(); fetchGeoSessions();
    } catch { showToast('Failed to terminate', 'danger'); }
    setTerminateTarget(null);
  }, [fetchAlerts, fetchGeoSessions, showToast]);

  const examCenter = (() => {
    const s = geoSessions.find(s => s.initial_lat && s.initial_lng);
    if (s) return [parseFloat(s.initial_lat), parseFloat(s.initial_lng)];
    return null;
  })();

  const focusedForMap = selectedCandidate ? (() => {
    const geo = geoSessions.find(s => String(s.candidate_id) === String(selectedCandidate.student_id));
    return { ...selectedCandidate, ...(geo ? { last_lat: geo.lat ?? geo.last_lat, last_lng: geo.lng ?? geo.last_lng } : {}) };
  })() : null;

  const highCount = candidates.filter(c => c.risk_level === 'high').length;
  const medCount  = candidates.filter(c => c.risk_level === 'medium').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f4f6fb' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Live Monitoring</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Real-time AI proctoring dashboard — updates every 8–15 seconds</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block', transform: pulse ? 'scale(1.7)' : 'scale(1)', transition: 'transform .3s' }} />
              LIVE
            </div>
            <LiveClock />
            {highCount > 0 && <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', fontFamily: 'monospace' }}>🔴 {highCount} HIGH</span>}
            {medCount  > 0 && <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#d97706', fontFamily: 'monospace' }}>🟡 {medCount} MED</span>}
          </div>
        </div>

        <StatsCards geoStats={geoStats} exams={exams} />

        {/* Map + Attendance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24 }}>
          <LiveMap sessions={geoSessions} examCenter={examCenter} focusCandidate={focusedForMap} />
          <ExamAttendancePanel examId={selectedExamId} />
        </div>

        {/* Exam Cards + Candidates */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, marginBottom: selectedCandidate ? 0 : 16 }}>
          <ExamCards exams={exams} selectedExamId={selectedExamId} onSelect={setSelectedExamId} loading={loadingExams} />
          <CandidatesTable
            candidates={candidates}
            loading={loadingCands}
            selectedExamId={selectedExamId}
            onTerminate={setTerminateTarget}
            onSelectCandidate={setSelectedCandidate}
            selectedCandidateId={selectedCandidate?.student_id || selectedCandidate?.assignment_id}
            examCenter={examCenter}
          />
        </div>

        {/* Candidate Detail Panel */}
        {selectedCandidate && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <CandidateDetailPanel
              candidate={selectedCandidate}
              onClose={() => setSelectedCandidate(null)}
              onFlag={() => showToast('🚩 Student flagged', 'warn')}
              examCenter={examCenter}
            />
          </div>
        )}

        {/* Alerts */}
        <AlertsTable
          alerts={alerts}
          loading={loadingAlerts && alerts.length === 0}
          filterRisk={filterRisk}
          setFilterRisk={setFilterRisk}
          onViewSnapshot={setSnapshotViolId}
          onTerminate={setTerminateTarget}
        />
      </main>

      {snapshotViolId && <SnapshotModal violationId={snapshotViolId} onClose={() => setSnapshotViolId(null)} />}
      {terminateTarget && <TerminateModal candidate={terminateTarget} onConfirm={handleTerminate} onClose={() => setTerminateTarget(null)} />}

      <ToastStack toasts={toasts} />
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width:5px }
        ::-webkit-scrollbar-track { background:#f1f5f9 }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px }
      `}</style>
    </div>
  );
}
