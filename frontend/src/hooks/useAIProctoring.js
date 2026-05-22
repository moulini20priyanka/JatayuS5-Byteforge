// frontend/src/hooks/useAIProctoring.js
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in AI proctoring hook for all four exam modules.
// Uses face-api.js (loaded from CDN) — no npm install needed.
//
// Detection:
//   • Face count   — none / one / multiple
//   • Gaze         — eye + nose landmark deviation
//   • Object heuristic — dark pixel ratio for phone detection
//
// Returns:
//   videoRef, canvasRef, proctoringState, violations, isReady, modelError
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';

const FACE_API_CDN             = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const MODEL_URL                = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const GAZE_AWAY_THRESHOLD_SECS = 3;
const VIOLATION_COOLDOWN_MS    = 8000;
const ANALYSIS_INTERVAL_MS     = 1500;

// ── Safe API_URL (fixes the ternary syntax error from the previous version) ──
const API_URL = (() => {
  try {
    return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
  } catch {
    return process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
  }
})();

export function useAIProctoring({
  onViolation,
  assignmentId,
  examId,
  token,
  enabled = true,
} = {}) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef  = useRef(null);

  const [isReady,         setIsReady]        = useState(false);
  const [modelError,      setModelError]     = useState(null);
  const [violations,      setViolations]     = useState([]);
  const [proctoringState, setProctoringState] = useState({
    faceCount:    0,
    gazeStatus:   'unknown',
    objectAlert:  null,
    cameraActive: false,
  });

  const lastViolTime  = useRef({});
  const gazeAwayStart = useRef(null);
  const faceApiRef    = useRef(null);

  // ── Load face-api.js from CDN ─────────────────────────────────────────────
  const loadFaceApi = useCallback(() => new Promise((resolve, reject) => {
    if (window.faceapi) {
      faceApiRef.current = window.faceapi;
      resolve(window.faceapi);
      return;
    }
    const script    = document.createElement('script');
    script.src      = FACE_API_CDN;
    script.onload   = () => { faceApiRef.current = window.faceapi; resolve(window.faceapi); };
    script.onerror  = reject;
    document.head.appendChild(script);
  }), []);

  // ── Load models ───────────────────────────────────────────────────────────
  const loadModels = useCallback(async (faceapi) => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      return true;
    } catch {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(
          'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
        );
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  // ── Capture JPEG snapshot from the video element ──────────────────────────
  const captureSnapshot = useCallback(() => {
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      const canvas  = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  }, []);

  // ── Fire a violation — deduped by cooldown, POSTed to backend ────────────
  const fireViolation = useCallback((type, message, severity = 'medium') => {
    const now = Date.now();
    if (lastViolTime.current[type] && now - lastViolTime.current[type] < VIOLATION_COOLDOWN_MS) return;
    lastViolTime.current[type] = now;

    const snapshot = captureSnapshot();
    const entry = {
      type, message, severity,
      timestamp: new Date().toISOString(),
      time:      new Date().toLocaleTimeString(),
      snapshot,
    };

    setViolations(prev => [...prev, entry]);
    if (onViolation) onViolation(entry);

    // Persist to backend
    if (assignmentId && examId && token) {
      fetch(`${API_URL}/proctoring/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          assignment_id: assignmentId,
          exam_id:       examId,
          type, message, severity,
          snapshot: snapshot ? snapshot.substring(0, 5000) : null,
          timestamp: entry.timestamp,
        }),
      }).catch(() => {});
    }
  }, [onViolation, assignmentId, examId, token, captureSnapshot]);

  // ── Gaze estimation via eye/nose landmarks ────────────────────────────────
  const estimateGaze = useCallback((landmarks) => {
    try {
      const leftEye  = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose     = landmarks.getNose();
      const leftCX   = leftEye.reduce((s, p)  => s + p.x, 0) / leftEye.length;
      const rightCX  = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length;
      const noseTip  = nose[nose.length - 1];
      const eyeMidX  = (leftCX + rightCX) / 2;
      const eyeSpan  = Math.abs(rightCX - leftCX);
      const deviation = Math.abs(noseTip.x - eyeMidX);
      return (deviation / (eyeSpan || 1)) > 0.35 ? 'away' : 'looking';
    } catch { return 'unknown'; }
  }, []);

  // ── Dark-pixel heuristic for phone/device detection ───────────────────────
  const detectProhibitedObject = useCallback((imageData, width, height) => {
    const data = imageData.data;
    let darkPixels = 0;
    const total = width * height;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) darkPixels++;
    }
    const ratio = darkPixels / total;
    return ratio > 0.15 && ratio < 0.55;
  }, []);

  // ── Main analysis loop (runs every ANALYSIS_INTERVAL_MS) ─────────────────
  const analyzeFrame = useCallback(async () => {
    const faceapi = faceApiRef.current;
    const video   = videoRef.current;
    if (!faceapi || !video || video.readyState < 2 || !enabled) return;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceLandmarks(true);

      const faceCount = detections.length;
      let gazeStatus  = 'unknown';
      let objectAlert = null;

      if (faceCount === 0) {
        fireViolation('NO_FACE', 'No face detected in camera frame', 'high');
        gazeAwayStart.current = null;
      } else if (faceCount > 1) {
        fireViolation('MULTIPLE_FACES', `${faceCount} faces detected — only one allowed`, 'high');
      }

      if (faceCount === 1 && detections[0].landmarks) {
        gazeStatus = estimateGaze(detections[0].landmarks);
        if (gazeStatus === 'away') {
          if (!gazeAwayStart.current) gazeAwayStart.current = Date.now();
          const awaySecs = (Date.now() - gazeAwayStart.current) / 1000;
          if (awaySecs >= GAZE_AWAY_THRESHOLD_SECS) {
            fireViolation('GAZE_AWAY', `Looking away for ${Math.round(awaySecs)}s`, 'medium');
          }
        } else {
          gazeAwayStart.current = null;
        }
      }

      if (video.videoWidth > 0) {
        const tmp = document.createElement('canvas');
        tmp.width  = video.videoWidth;
        tmp.height = video.videoHeight;
        const ctx  = tmp.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(0, 0, tmp.width, tmp.height);
        if (detectProhibitedObject(imgData, tmp.width, tmp.height)) {
          objectAlert = 'Possible prohibited object detected';
          fireViolation('OBJECT_DETECTED', 'Possible prohibited object (phone/device) detected', 'high');
        }
      }

      setProctoringState(prev => ({ ...prev, faceCount, gazeStatus, objectAlert }));

      // Draw landmarks overlay
      if (canvasRef.current && faceapi.draw && detections.length > 0) {
        const c  = canvasRef.current;
        c.width  = video.videoWidth;
        c.height = video.videoHeight;
        faceapi.draw.drawDetections(c, detections);
        faceapi.draw.drawFaceLandmarks(c, detections);
      }
    } catch { /* ignore per-frame errors */ }
  }, [enabled, fireViolation, estimateGaze, detectProhibitedObject]);

  // ── Start webcam ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setProctoringState(prev => ({ ...prev, cameraActive: true }));
      return true;
    } catch (err) {
      console.warn('[Proctoring] Camera unavailable:', err.message);
      setProctoringState(prev => ({ ...prev, cameraActive: false }));
      return false;
    }
  }, []);

  // ── Init on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    (async () => {
      try {
        const faceapi  = await loadFaceApi();
        const modelsOk = await loadModels(faceapi);
        const cameraOk = await startCamera();

        if (!mounted) return;

        if (modelsOk && cameraOk) {
          setIsReady(true);
          // Wait for video to be ready
          await new Promise(res => {
            if (videoRef.current?.readyState >= 2) { res(); return; }
            videoRef.current?.addEventListener('loadeddata', res, { once: true });
            setTimeout(res, 3000);
          });
          timerRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);
        } else {
          setModelError('Face detection unavailable — tab/window monitoring still active');
        }
      } catch (err) {
        if (mounted) setModelError('Proctoring init failed: ' + err.message);
      }
    })();

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [enabled]); // eslint-disable-line

  return {
    videoRef,
    canvasRef,
    proctoringState,
    violations,
    isReady,
    modelError,
    captureSnapshot,
    fireViolation,
  };
}


