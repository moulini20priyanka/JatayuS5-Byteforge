

import React, { useState, useEffect } from 'react';

const VIOLATION_LABELS = {
  NO_FACE:        { label: 'No Face',        icon: '😶', color: '#dc2626' },
  MULTIPLE_FACES: { label: 'Multiple Faces', icon: '👥', color: '#dc2626' },
  GAZE_AWAY:      { label: 'Looking Away',   icon: '👁️', color: '#d97706' },
  OBJECT_DETECTED:{ label: 'Object Detected',icon: '📱', color: '#dc2626' },
  TAB_SWITCH:     { label: 'Tab Switch',     icon: '🖥️', color: '#d97706' },
};

function StatusDot({ color, pulse = false }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7, height: 7,
      borderRadius: '50%',
      background: color,
      boxShadow: pulse ? `0 0 0 3px ${color}44` : 'none',
      animation: pulse ? 'proc-pulse 1.8s ease infinite' : 'none',
      flexShrink: 0,
    }} />
  );
}

function FaceStatusBar({ state }) {
  const { faceCount, gazeStatus, cameraActive } = state;

  const faceInfo = (() => {
    if (!cameraActive) return { label: 'Camera Off',     color: '#64748b', icon: '📷' };
    if (faceCount === 0) return { label: 'No Face',      color: '#dc2626', icon: '😶' };
    if (faceCount > 1)   return { label: 'Multi-Face',   color: '#dc2626', icon: '👥' };
    return               { label: 'Face OK',             color: '#16a34a', icon: '✅' };
  })();

  const gazeInfo = (() => {
    if (gazeStatus === 'away')    return { label: 'Looking Away', color: '#d97706' };
    if (gazeStatus === 'looking') return { label: 'On Screen',    color: '#16a34a' };
    return                         { label: 'Analyzing…',         color: '#64748b' };
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>FACE</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: faceInfo.color,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <StatusDot color={faceInfo.color} pulse={faceInfo.color !== '#16a34a'} />
          {faceInfo.icon} {faceInfo.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>GAZE</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: gazeInfo.color, display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusDot color={gazeInfo.color} pulse={gazeStatus === 'away'} />
          {gazeInfo.label}
        </span>
      </div>
    </div>
  );
}

export default function ProctoringOverlay({
  videoRef,
  canvasRef,
  proctoringState,
  violations = [],
  isReady,
  modelError,
  compact = false,
}) {
  const [latestAlert, setLatestAlert] = useState(null);
  const [alertKey,    setAlertKey]    = useState(0);

  const highViolations = violations.filter(v => v.severity === 'high').length;
  const recentViols    = [...violations].reverse().slice(0, 3);

  // Flash alert on new violation
  useEffect(() => {
    if (!violations.length) return;
    const last = violations[violations.length - 1];
    setLatestAlert(last);
    setAlertKey(k => k + 1);
    const t = setTimeout(() => setLatestAlert(null), 4000);
    return () => clearTimeout(t);
  }, [violations.length]); // eslint-disable-line

  const borderColor = (() => {
    if (!proctoringState.cameraActive) return '#475569';
    if (proctoringState.faceCount === 0 || proctoringState.faceCount > 1) return '#dc2626';
    if (proctoringState.gazeStatus === 'away') return '#d97706';
    return '#16a34a';
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        @keyframes proc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes proc-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes proc-alert-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        .proc-viol-row:hover { background: #fef2f2 !important; }
      `}</style>

      {/* ── Header label ── */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '1.5px',
        color: '#64748b', fontFamily: 'monospace',
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        AI Proctoring {isReady ? '— Active' : modelError ? '— Limited' : '— Loading…'}
      </div>

      {/* ── Webcam box ── */}
      <div style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        border: `2px solid ${borderColor}`,
        background: '#0f172a',
        aspectRatio: '4/3',
        transition: 'border-color 0.4s',
        boxShadow: `0 0 0 2px ${borderColor}22`,
      }}>
        {/* Live video */}
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: 'block',
            transform: 'scaleX(-1)', // mirror
          }}
        />

        {/* Canvas overlay for face landmarks */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            transform: 'scaleX(-1)',
            opacity: 0.6,
          }}
        />

        {/* If camera not active — show silhouette */}
        {!proctoringState.cameraActive && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #0f172a, #1e3a5f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 28, opacity: 0.4 }}>📷</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: 1 }}>
              CAMERA INITIALIZING
            </div>
          </div>
        )}

        {/* REC badge */}
        <div style={{
          position: 'absolute', top: 7, left: 7,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.55)', borderRadius: 5,
          padding: '3px 7px',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: proctoringState.cameraActive ? '#ef4444' : '#475569',
            display: 'inline-block',
            animation: proctoringState.cameraActive ? 'proc-pulse 1.5s ease infinite' : 'none',
          }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', letterSpacing: 1 }}>
            {proctoringState.cameraActive ? 'LIVE' : 'OFF'}
          </span>
        </div>

        {/* Face count badge */}
        {proctoringState.cameraActive && (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            background: proctoringState.faceCount === 1 ? 'rgba(22,163,74,0.8)' : 'rgba(220,38,38,0.8)',
            borderRadius: 5, padding: '3px 7px',
            fontSize: 8, fontWeight: 700, color: '#fff', fontFamily: 'monospace',
          }}>
            {proctoringState.faceCount === 1 ? '✓ 1 FACE' : proctoringState.faceCount === 0 ? 'NO FACE' : `${proctoringState.faceCount} FACES`}
          </div>
        )}

        {/* Alert flash */}
        {latestAlert && (
          <div key={alertKey} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: latestAlert.severity === 'high' ? 'rgba(220,38,38,0.92)' : 'rgba(217,119,6,0.92)',
            color: '#fff', fontSize: 10, fontWeight: 700,
            padding: '5px 8px', textAlign: 'center',
            fontFamily: 'monospace', letterSpacing: 0.5,
            animation: 'proc-alert-in 0.3s ease',
          }}>
            ⚠️ {latestAlert.message}
          </div>
        )}
      </div>

      {/* ── Status bars ── */}
      <FaceStatusBar state={proctoringState} />

      {/* ── Object alert ── */}
      {proctoringState.objectAlert && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 7, fontSize: 10, color: '#dc2626', fontWeight: 700,
          animation: 'proc-shake 0.4s ease',
        }}>
          📱 {proctoringState.objectAlert}
        </div>
      )}

      {/* ── Violation summary ── */}
      {!compact && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 7,
          }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>
              Violations
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: violations.length > 0 ? '#dc2626' : '#16a34a',
              fontFamily: 'monospace',
            }}>
              {violations.length} total · {highViolations} critical
            </span>
          </div>

          {recentViols.length === 0 ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 7, padding: '7px 10px',
              fontSize: 11, color: '#16a34a', fontWeight: 600, textAlign: 'center',
            }}>
              ✅ No violations detected
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentViols.map((v, i) => {
                const info = VIOLATION_LABELS[v.type] || { label: v.type, icon: '⚠️', color: '#dc2626' };
                return (
                  <div key={i} className="proc-viol-row" style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderLeft: `3px solid ${info.color}`,
                    borderRadius: 7, padding: '5px 8px',
                    cursor: 'default', transition: 'background 0.15s',
                  }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{info.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: info.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'monospace' }}>{v.time}</div>
                    </div>
                    {v.snapshot && (
                      <img
                        src={v.snapshot}
                        alt="snapshot"
                        style={{ width: 28, height: 21, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Model error notice ── */}
      {modelError && (
        <div style={{
          marginTop: 8, padding: '6px 9px',
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 7, fontSize: 9, color: '#92400e', lineHeight: 1.5,
        }}>
           {modelError}
        </div>
      )}
    </div>
  );
}