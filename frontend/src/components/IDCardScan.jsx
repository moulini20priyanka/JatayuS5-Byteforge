// src/components/IDCardScan.jsx
// Fixed: better image capture, handles no-face on ID scan step, lower threshold

import React, { useRef, useState, useEffect } from 'react';

const VERIFY_API = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api';


export default function IDCardScan({ onPass, examTitle }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const [stream,    setStream]    = useState(null);
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [captured,  setCaptured]  = useState(null);
  const [camError,  setCamError]  = useState('');

  // Start webcam
  useEffect(() => {
    async function startCam() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        setCamError('Camera access denied. Please allow camera and refresh.');
      }
    }
    startCam();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  function capture() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    // Use JPEG quality 0.92 for good balance of quality/size
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  async function handleScan() {
    setScanning(true);
    setResult(null);

    const imageData = capture();
    if (!imageData) {
      setScanning(false);
      return;
    }
    setCaptured(imageData);

    try {
      const res  = await fetch(`${VERIFY_API}/verify-id`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imageData }),
      });
      const data = await res.json();
      setResult(data);

      // Auto-advance if overall pass
      if (data.overall) {
        setTimeout(() => onPass(imageData), 1500);
      }
    } catch (e) {
      setResult({
        overall: false,
        passed:  [],
        issues:  [{ check: 'CONNECTION', status: 'ERROR',
          problem: 'Cannot reach verification server',
          fix: 'Make sure python id_verify.py is running on port 5001' }]
      });
    }
    setScanning(false);
  }

  // Filter out face errors on ID scan step — face is checked in next step
  const displayIssues = result?.issues?.filter(i =>
    !(i.check === 'FACE' && i.status === 'ERROR')
  ) || [];
  const displayPassed = result?.passed || [];
  // Overall = no non-face errors
  const realErrors = displayIssues.filter(i => i.status === 'ERROR');
  const realOverall = realErrors.length === 0 && displayPassed.length > 0;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>

      {/* Exam label */}
      {examTitle && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 13 }}>
          Exam: <strong style={{ color: '#0369a1' }}>{examTitle}</strong>
        </div>
      )}

      {/* Tips */}
      <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#854d0e' }}>
        💡 <strong>Tips:</strong> Good lighting · Card face-up · Fill the frame · No glare · Hold steady
      </div>

      {/* Camera or captured image */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
        {camError ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{camError}</div>
        ) : captured && result ? (
          <img src={captured} alt="Captured" style={{ width: '100%', display: 'block' }} />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Guide overlay */}
        {!captured && !camError && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '65%', height: '55%',
              border: '2.5px dashed rgba(255,255,255,0.6)',
              borderRadius: 12,
            }} />
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginBottom: 14 }}>
          {displayPassed.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 6 }}>
              <div>
                <span style={{ color: '#16a34a', fontWeight: 700, marginRight: 8 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{p.check}</span>
                <div style={{ fontSize: 11, color: '#86efac', marginTop: 2, marginLeft: 22 }}>{p.value}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', letterSpacing: 1 }}>PASS</span>
            </div>
          ))}

          {displayIssues.map((issue, i) => (
            <div key={i} style={{ padding: '10px 14px', background: issue.status==='ERROR'?'#fef2f2':'#fffbeb', border: `1px solid ${issue.status==='ERROR'?'#fca5a5':'#fde68a'}`, borderRadius: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: issue.status==='ERROR'?'#dc2626':'#d97706' }}>
                  {issue.status==='ERROR' ? '✗' : '⚠'} {issue.check}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: issue.status==='ERROR'?'#dc2626':'#d97706', letterSpacing: 1 }}>
                  {issue.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>{issue.problem}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>→ {issue.fix}</div>
            </div>
          ))}

          {realOverall && (
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,#059669,#10b981)', borderRadius: 10, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 8 }}>
              ✓ Verified — Proceeding to face match…
            </div>
          )}

          {!realOverall && result && (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
              Adjust card position and tap Scan again ↓
            </div>
          )}
        </div>
      )}

      {/* Scan / Retry button */}
      {(!result || !realOverall) && (
        <button
          onClick={handleScan}
          disabled={scanning || !!camError}
          style={{
            width: '100%', padding: '14px',
            background: scanning ? '#94a3b8' : '#0ea5e9',
            border: 'none', borderRadius: 10, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: scanning ? 'not-allowed' : 'pointer',
          }}
        >
          {scanning ? '🔍 Scanning…' : result ? '↺ Scan Again' : '📷 Scan ID Card'}
        </button>
      )}
    </div>
  );
}

