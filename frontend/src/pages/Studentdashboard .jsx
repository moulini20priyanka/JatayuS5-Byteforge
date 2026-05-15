// StudentDashboard.jsx — real-time stats from backend + live exam alert
// Updated to Blue Theme with Smooth Animations
//
// FIXES APPLIED:
//   • TOKEN GUARD: fetchDash() now checks for a valid token before every
//     fetch. If the token is missing (e.g. after forced password-reset flow
//     didn't re-store it), the student is immediately redirected to login
//     instead of silently getting empty/401 data.
//   • MULTI-KEY TOKEN LOOKUP: reads from all known storage keys in the same
//     priority order used by the admin's getAuthHeader(), so a token stored
//     under any of the common key names will be found.
//   • DEBUG LOGGING: one-time console.group on mount logs the token (first
//     20 chars), student_id, and user_name so you can verify on any device
//     without code changes. Remove after confirming it works.
//   • PATCH 3 (Layer 3): retained — pending coding-round navigation via
//     sessionStorage.na_navigate_target = "code".

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const T = {
  bg: "#dbeafe",
  border: "rgba(59,130,246,0.2)",
  text: "#0f172a",
  muted: "#475569",
  dim: "#64748b",
  accent: "#3b82f6",
  accentSoft: "#dbeafe",
  accentEnd: "#2563eb",
  green: "#10b981",
  greenSoft: "#dcfce7",
  amber: "#f59e0b",
  red: "#dc2626",
  redSoft: "#fef2f2",
  navy: "#0f172a",
  navySoft: "#f1f5f9",
  lightCyan: "#ffffff",
};

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  @keyframes live-pulse { 
    0%,100%{opacity:1;transform:scale(1)} 
    50%{opacity:.3;transform:scale(2.4)} 
  }
  @keyframes shimmer { 
    0%,100%{opacity:1} 
    50%{opacity:.4} 
  }
  @keyframes float { 
    0%,100%{transform:translateY(0)} 
    50%{transform:translateY(-8px)} 
  }
  @keyframes fadeUp { 
    from { opacity:0; transform:translateY(12px); } 
    to { opacity:1; transform:translateY(0); } 
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes ripple {
    to { transform: scale(2.5); opacity: 0; }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(59,130,246,0.3); }
    50% { box-shadow: 0 0 20px rgba(59,130,246,0.6); }
  }
  @keyframes logoutFadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes logoutSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
  
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 8px; transition: background 0.2s; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.5); }
  ::-webkit-scrollbar-track { background: transparent; }
  
  .na-nav { 
    display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;
    cursor:pointer;font-size:13px;font-weight:500;color:#475569;
    transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);user-select:none;
    position: relative;overflow: hidden;
  }
  .na-nav::before {
    content: '';position: absolute;left: 0;top: 0;height: 100%;width: 3px;
    background: #3b82f6;transform: scaleY(0);transition: transform 0.2s ease;
  }
  .na-nav:hover { background:#dbeafe;color:#3b82f6;transform: translateX(4px); }
  .na-nav.active { background:#dbeafe;color:#3b82f6;font-weight:600;transform: translateX(4px); }
  .na-nav.active::before { transform: scaleY(1); }
  
  .na-card { 
    background:#fff;border:1px solid rgba(59,130,246,0.2);border-radius:12px;
    box-shadow:0 2px 8px rgba(59,130,246,0.06);
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);position: relative;overflow: hidden;
  }
  .na-card::after {
    content: '';position: absolute;top: 0;left: 0;right: 0;bottom: 0;
    background: linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 100%);
    opacity: 0;transition: opacity 0.3s;pointer-events: none;
  }
  .na-card:hover { border-color:rgba(59,130,246,0.4);box-shadow:0 8px 24px rgba(59,130,246,0.12);transform: translateY(-4px); }
  .na-card:hover::after { opacity: 1; }
  .na-card:active { transform: translateY(-2px) scale(0.98); }
  
  .na-btn { 
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;
    border:none;font-family:'Inter',sans-serif;
    transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);position: relative;overflow: hidden;
  }
  .na-btn::before {
    content: '';position: absolute;top: 50%;left: 50%;width: 0;height: 0;
    border-radius: 50%;background: rgba(255,255,255,0.3);
    transform: translate(-50%, -50%);transition: width 0.4s, height 0.4s;
  }
  .na-btn:active::before { width: 300px;height: 300px; }
  .na-btn-primary { background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;box-shadow:0 2px 8px rgba(59,130,246,0.3); }
  .na-btn-primary:hover { transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,0.4); }
  .na-btn-primary:active { transform: translateY(0) scale(0.97); }
  .na-btn-danger { background:#dc2626;color:#fff;box-shadow:0 2px 8px rgba(220,38,38,0.3); }
  .na-btn-danger:hover { background:#b91c1c;transform:translateY(-2px);box-shadow:0 6px 20px rgba(220,38,38,0.4); }
  .na-btn-ghost { background:transparent;color:#3b82f6;border:1px solid rgba(59,130,246,0.2); }
  .na-btn-ghost:hover { background:#dbeafe;border-color:rgba(59,130,246,0.4);transform:translateY(-1px); }
  .na-btn-sm { padding:6px 13px;font-size:12px; }
  
  .na-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:600; }
  .na-tag { 
    display:inline-block;padding:3px 9px;border-radius:5px;font-size:11px;font-weight:600;
    background:#dbeafe;color:#3b82f6;border:1px solid rgba(59,130,246,0.2);transition: all 0.2s;
  }
  .na-tag:hover { background:#bfdbfe;transform: scale(1.05); }
  
  .na-avatar { 
    width:36px;height:36px;border-radius:8px;
    background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
    flex-shrink:0;box-shadow:0 2px 8px rgba(59,130,246,0.25);transition: all 0.2s;cursor: pointer;
  }
  .na-avatar:hover { transform: scale(1.1) rotate(5deg);box-shadow:0 4px 12px rgba(59,130,246,0.35); }
  
  .na-back { 
    display:inline-flex;align-items:center;gap:5px;background:none;border:none;
    cursor:pointer;font-size:13px;font-weight:600;color:#64748b;
    font-family:'Inter',sans-serif;padding:0;transition:all 0.2s;
  }
  .na-back:hover { color:#3b82f6;transform:translateX(-4px); }
  
  .live-dot { width:7px;height:7px;border-radius:50%;background:#dc2626;flex-shrink:0;position:relative; }
  .live-dot::after { 
    content:'';position:absolute;inset:-3px;border-radius:50%;
    background:#dc262644;animation:live-pulse 1.8s ease-in-out infinite;
  }
  
  .na-row { transition: background 0.15s; }
  .na-row:hover { background:#f8fafc; }
  
  .na-tab { 
    display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
    border-radius:8px 8px 0 0;cursor:pointer;font-size:13px;font-weight:500;color:#475569;
    border:none;background:none;font-family:'Inter',sans-serif;transition:all 0.2s;position: relative;
  }
  .na-tab::after {
    content: '';position: absolute;bottom: 0;left: 50%;width: 0;height: 2px;
    background: #3b82f6;transition: all 0.3s;transform: translateX(-50%);
  }
  .na-tab.active { color:#3b82f6;font-weight:700; }
  .na-tab.active::after { width: 100%; }
  .na-tab:hover:not(.active) { background:#dbeafe;transform: translateY(-2px); }
  
  .credential-box { 
    background:#f8fafc;border:1px solid rgba(59,130,246,0.2);border-radius:8px;
    padding:12px 15px;font-family:'DM Mono',monospace;font-size:12px;transition: all 0.2s;
  }
  .credential-box:hover { border-color: rgba(59,130,246,0.4);box-shadow: 0 2px 8px rgba(59,130,246,0.1); }
  
  .stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .stat-card:hover { transform: translateY(-6px) scale(1.02); }
  .stat-card:active { transform: translateY(-2px) scale(0.98); }
  
  .icon-wrapper { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .stat-card:hover .icon-wrapper { transform: scale(1.15) rotate(-5deg); }
  
  .deadline-item { transition: all 0.2s; }
  .deadline-item:hover { background: rgba(59,130,246,0.03);transform: translateX(4px); }
  
  .activity-item { transition: all 0.2s; }
  .activity-item:hover { background: rgba(59,130,246,0.03); }
  .activity-item:hover .activity-icon { transform: scale(1.1); }
  
  .activity-icon { transition: transform 0.2s; }

  .na-logout-btn {
    width: 100%;display: flex;align-items: center;justify-content: center;gap: 8px;
    padding: 9px 14px;border-radius: 8px;background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.2);color: #dc2626;font-size: 12.5px;
    font-weight: 600;cursor: pointer;font-family: 'Inter', sans-serif;
    transition: all 0.2s ease;margin-top: 4px;
  }
  .na-logout-btn:hover {
    background: rgba(220,38,38,0.14);border-color: rgba(220,38,38,0.4);
    transform: translateY(-1px);box-shadow: 0 4px 12px rgba(220,38,38,0.15);
  }
  .na-logout-btn:active { transform: translateY(0) scale(0.97); }

  .na-logout-overlay {
    position: fixed;inset: 0;z-index: 9999;background: rgba(15,23,42,0.55);
    display: flex;align-items: center;justify-content: center;
    animation: logoutFadeIn 0.15s ease;
  }
  .na-logout-modal {
    background: #fff;border-radius: 16px;padding: 30px 32px 26px;
    max-width: 340px;width: 90%;box-shadow: 0 20px 60px rgba(59,130,246,0.18);
    text-align: center;animation: logoutSlideUp 0.18s ease;border: 1px solid #dbeafe;
  }
  .na-logout-icon-wrap {
    width: 52px;height: 52px;border-radius: 14px;background: #fef2f2;
    border: 1.5px solid #fecaca;display: flex;align-items: center;
    justify-content: center;margin: 0 auto 16px;
  }
  .na-logout-modal-actions { display: flex;gap: 10px;margin-top: 22px; }
  .na-logout-cancel {
    flex: 1;padding: 10px;border-radius: 9px;background: #eff6ff;
    border: 1px solid #bfdbfe;font-size: 13px;font-weight: 600;color: #1d4ed8;
    cursor: pointer;font-family: 'Inter', sans-serif;transition: all 0.15s;
  }
  .na-logout-cancel:hover { background: #dbeafe; }
  .na-logout-confirm {
    flex: 1;padding: 10px;border-radius: 9px;background: #dc2626;border: none;
    font-size: 13px;font-weight: 700;color: #fff;cursor: pointer;
    font-family: 'Inter', sans-serif;transition: all 0.15s;
  }
  .na-logout-confirm:hover { background: #b91c1c;transform: translateY(-1px); }

  /* Token-missing error banner */
  .na-auth-error {
    background: #fef2f2;border: 1.5px solid #fecaca;border-radius: 10px;
    padding: 18px 22px;margin-bottom: 20px;display: flex;align-items: center;gap: 12px;
  }
  .na-auth-error-text { font-size: 13px;color: #dc2626;font-weight: 500;line-height: 1.6; }
`;

export const Icons = {
  Flash:        () => <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Dashboard:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Assessment:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  University:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Certificate:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Search:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  ArrowRight:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Calendar:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Clock:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Activity:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  CheckCircle:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  AlertCircle:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
  Mail:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Play:         () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Phone:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  ChevronLeft:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>,
  User:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Link:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Download:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Share:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
  ExternalLink: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>,
  MapPin:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clipboard:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Inbox:        () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Logout:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  Warning:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
};

export const THEME = T;
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── Token resolution ───────────────────────────────────────────
// Checks multiple storage keys in priority order.
// Must match whichever key your login flow stores the JWT under.
// The priority order: 'token' first (most common), then fallbacks.
const TOKEN_KEYS = [
  "token",
  "student_token",
  "authToken",
  "auth_token",
  "access_token",
  "jwt",
];

function resolveToken() {
  for (const key of TOKEN_KEYS) {
    const t = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (t) return t;
  }
  return null;
}

// ── Session helpers ────────────────────────────────────────────
const SESSION_KEYS = [
  "token", "role", "user_name", "user_email", "student_id",
  "admin_token", "recruiter_token", "student_token",
  "admin_name", "admin_email", "admin_role",
  "authToken", "auth_token", "access_token", "jwt",
];

function clearSession() {
  SESSION_KEYS.forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ── Logout confirm modal ───────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="na-logout-overlay" onClick={onCancel}>
      <div className="na-logout-modal" onClick={e => e.stopPropagation()}>
        <div className="na-logout-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 7 }}>Log out?</div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
          You'll be taken back to the home page and will need to sign in again.
        </div>
        <div className="na-logout-modal-actions">
          <button className="na-logout-cancel" onClick={onCancel}>Cancel</button>
          <button className="na-logout-confirm" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared sidebar layout ──────────────────────────────────────
export function StudentLayout({ children, activePath }) {
  const navigate = useNavigate();
  const name     = localStorage.getItem("user_name")  || "Student";
  const email    = localStorage.getItem("user_email") || "";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  const NAV = [
    { label: "Dashboard",          path: "/student-dashboard",      icon: <Icons.Dashboard /> },
    { label: "Hiring Assessments", path: "/student-hiring",         icon: <Icons.Assessment /> },
    { label: "University Exams",   path: "/student-university",     icon: <Icons.University /> },
    { label: "Certifications",     path: "/student-certifications", icon: <Icons.Certificate /> },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)", fontFamily: "'Inter',sans-serif" }}>

        {/* Header */}
        <header style={{
          background: "#fff",
          borderBottom: `1px solid ${T.border}`,
          height: 56,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          flexShrink: 0,
          boxShadow: "0 1px 4px rgba(59,130,246,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              transition: "all 0.2s", cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1) rotate(5deg)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) rotate(0deg)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.3)"; }}
            >
              <Icons.Flash />
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.4px", color: T.text }}>NeuroAssess</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "#f8fafc", border: `1px solid ${T.border}`,
            borderRadius: 7, padding: "8px 13px", width: 340, transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{ color: T.dim, display: "flex" }}><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search assessments, exams…"
              style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: T.text, width: "100%", fontFamily: "'Inter',sans-serif" }}
            />
          </div>
          <div className="na-avatar">{initials}</div>
        </header>

        <div style={{ display: "flex", flex: 1 }}>
          {/* Sidebar */}
          <aside style={{
            width: 230, flexShrink: 0, background: "#fff",
            borderRight: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column",
            position: "sticky", top: 56, height: "calc(100vh - 56px)",
          }}>
            <div style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV.map((item, index) => (
                <div
                  key={item.path}
                  className={`na-nav${activePath === item.path ? " active" : ""}`}
                  onClick={() => navigate(item.path)}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animation: activePath === item.path ? "slideInLeft 0.3s ease-out" : "none",
                  }}
                >
                  <span style={{
                    display: "flex",
                    color: activePath === item.path ? T.accent : T.dim,
                    transition: "all 0.2s",
                    transform: activePath === item.path ? "scale(1.1)" : "scale(1)",
                  }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Bottom: user info + logout */}
            <div style={{
              padding: "12px 12px 14px",
              borderTop: `1px solid ${T.border}`,
              background: "linear-gradient(135deg, rgba(59,130,246,0.02) 0%, transparent 100%)",
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 9,
                background: "#f8fafc", border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "9px 11px", marginBottom: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                  border: "2px solid rgba(59,130,246,0.2)",
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {email || "Student"}
                  </div>
                </div>
              </div>
              <button className="na-logout-btn" onClick={() => setShowLogout(true)}>
                <Icons.Logout />
                Sign Out
              </button>
            </div>
          </aside>

          <main style={{ flex: 1, padding: "26px 30px", overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </div>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}

// ── Dashboard home ─────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate  = useNavigate();
  const [mounted, setMounted]     = useState(false);
  const [authError, setAuthError] = useState(false);   // FIX: tracks missing token

  const [dashData, setDashData] = useState({
    active_exams:          0,
    live_exams:            0,
    completed_exams:       0,
    university_exams:      0,
    university_live_exams: 0,
    certifications:        0,
    upcoming_deadlines:    [],
    recent_activity:       [],
    live_exam_list:        [],
    university_live_list:  [],
  });
  const [loadingDash, setLoadingDash] = useState(true);

  const name      = localStorage.getItem("user_name")  || "Student";
  const email     = localStorage.getItem("user_email") || "";
  const studentId = localStorage.getItem("student_id") || "";

  // ── FIX 3 (Layer 3): Pending coding-round navigation ──────────
  useEffect(() => {
    const pendingTarget = sessionStorage.getItem("na_navigate_target");
    if (pendingTarget === "code") {
      sessionStorage.removeItem("na_navigate_target");

      const eid = sessionStorage.getItem("na_exam_id")       || localStorage.getItem("exam_id");
      const aid = sessionStorage.getItem("na_assignment_id") || localStorage.getItem("assignment_id");
      sessionStorage.removeItem("na_exam_id");
      sessionStorage.removeItem("na_assignment_id");

      if (eid) localStorage.setItem("exam_id",       eid);
      if (aid) localStorage.setItem("assignment_id", aid);

      navigate("/exam/code", {
        replace: true,
        state: {
          examId:       eid ? parseInt(eid, 10) : null,
          assignmentId: aid || null,
        },
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ─────────────────────────────────────────────────────────────

  const fetchDash = useCallback(async (silent = false) => {
    if (!silent) setLoadingDash(true);

    // ── FIX: Multi-key token lookup ───────────────────────────
    const token = resolveToken();

    // ── DEBUG: Log auth state on every fetch (remove once confirmed working)
    console.group("[StudentDashboard] Auth check");
    console.log("Token found:", token ? token.slice(0, 20) + "…" : "MISSING ← this is the problem");
    console.log("Token key used:", TOKEN_KEYS.find(k => localStorage.getItem(k) || sessionStorage.getItem(k)) || "none");
    console.log("student_id:", localStorage.getItem("student_id"));
    console.log("user_name:", localStorage.getItem("user_name"));
    console.log("user_email:", localStorage.getItem("user_email"));
    console.groupEnd();
    // ─────────────────────────────────────────────────────────

    if (!token) {
      // Token is gone — most likely the forced password-change flow
      // didn't re-store the new token. Redirect to login.
      console.warn("[StudentDashboard] No token found in any storage key. Redirecting to login.");
      setAuthError(true);
      setLoadingDash(false);
      // Give the user 2 seconds to read the error, then redirect
      setTimeout(() => navigate("/", { replace: true }), 2000);
      return;
    }

    setAuthError(false);

    try {
      const res = await fetch(`${API_URL}/api/student/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        // Token is present but rejected by the server — expired or invalidated
        // after password reset. Clear it and send back to login.
        console.warn("[StudentDashboard] Token rejected by server (status:", res.status, "). Clearing session.");
        clearSession();
        setAuthError(true);
        setLoadingDash(false);
        setTimeout(() => navigate("/", { replace: true }), 2000);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setDashData(data);
    } catch (err) {
      console.error("[StudentDashboard] fetchDash error:", err);
      // Keep previous data on silent refresh failure; don't clear on hard error
    } finally {
      setLoadingDash(false);
    }
  }, [navigate]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    fetchDash();
    const interval = setInterval(() => fetchDash(true), 30000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [fetchDash]);

  const fade = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.4s ease ${d}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${d}ms`,
  });

  const univLive = dashData.university_live_exams || 0;

  const stats = [
    { label: "Active Tests",     value: dashData.active_exams,         color: T.accent, bg: T.accentSoft, icon: <Icons.Assessment />, route: "/student-hiring" },
    { label: "Live Now",         value: dashData.live_exams,           color: T.red,    bg: "#fef2f2",    icon: <Icons.Assessment />, route: "/student-hiring" },
    {
      label: "University Exams", value: dashData.university_exams || 0,
      color: univLive > 0 ? T.red : T.navy, bg: univLive > 0 ? "#fef2f2" : "#dbeafe",
      icon: <Icons.University />, route: "/student-university",
      badge: univLive > 0 ? `${univLive} LIVE` : null,
    },
    { label: "Certifications",   value: dashData.certifications || 0,  color: T.green,  bg: T.greenSoft,  icon: <Icons.Certificate />, route: "/student-certifications" },
  ];

  const urgencyColor = { high: T.red, medium: T.amber, low: T.accent };

  const allLiveExams = [
    ...(dashData.live_exam_list      || []).map(e => ({ ...e, type: "hiring" })),
    ...(dashData.university_live_list || []),
  ];

  return (
    <StudentLayout activePath="/student-dashboard">

      {/* Auth error banner — shown briefly before redirect */}
      {authError && (
        <div className="na-auth-error" style={{ ...fade(0) }}>
          <Icons.Warning />
          <div className="na-auth-error-text">
            <strong>Session expired.</strong> Your login session was not found or has expired.
            Redirecting you to the login page…
          </div>
        </div>
      )}

      {/* Welcome banner */}
      <div style={{ marginBottom: 26, ...fade(30) }}>
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%)",
          borderRadius: 14, padding: "26px 30px", color: "#fff",
          position: "relative", overflow: "hidden",
          boxShadow: "0 8px 24px rgba(59,130,246,0.2)", transition: "all 0.3s", cursor: "default",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 32px rgba(59,130,246,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,130,246,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ position: "absolute", top: -20, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.1)", animation: "float 6s ease-in-out infinite" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)", letterSpacing: ".5px", marginBottom: 6, textTransform: "uppercase" }}>Welcome back</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.6px", marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 18 }}>Student ID: {studentId}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{
                background: "rgba(255,255,255,.15)", borderRadius: 7, padding: "7px 14px",
                fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.15)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <Icons.Mail /> {email || "student@college.edu"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 26, ...fade(50) }}>
        {stats.map((s, i) => (
          <div
            key={i} className="na-card stat-card"
            style={{ padding: "18px 20px", cursor: "pointer", position: "relative", overflow: "hidden", animation: mounted ? `scaleIn 0.4s ease-out ${i * 0.1}s both` : "none" }}
            onClick={() => navigate(s.route)}
          >
            {loadingDash && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", animation: "shimmer 1.5s infinite", borderRadius: 10 }} />
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="icon-wrapper" style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                {s.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {s.badge && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "1px 6px", letterSpacing: ".4px" }}>
                    {s.badge}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "flex", alignItems: "center", gap: 3 }}>View <Icons.ArrowRight /></span>
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: "-1.5px", marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live alert */}
      {allLiveExams.length > 0 && (
        <div style={{ marginBottom: 22, ...fade(60) }}>
          <div style={{ background: "#fef2f2", border: `1.5px solid ${T.red}44`, borderRadius: 10, padding: "14px 18px", animation: mounted ? "fadeUp 0.4s ease-out" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.red, letterSpacing: ".5px" }}>LIVE NOW — Action Required</span>
            </div>
            {allLiveExams.map((exam, idx) => (
              <div
                key={idx} className="deadline-item"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 7, padding: "10px 14px", border: `1px solid ${T.red}22`, marginTop: 6, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.boxShadow = "0 4px 12px rgba(220,38,38,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${T.red}22`; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{exam.title}</div>
                    {exam.type === "university" && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#ede9fe", color: "#7c3aed" }}>UNIVERSITY</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>
                    {exam.company_name || exam.college} &middot; Ends {new Date(exam.end_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 11, color: "#0369a1", marginTop: 3, fontWeight: 500 }}>
                    Use the exam key sent to your registered email
                  </div>
                </div>
                <button
                  className="na-btn na-btn-danger na-btn-sm"
                  onClick={() => {
                    navigate("/exam-flow", {
                      state: {
                        exam: {
                          ...exam,
                          exam:             exam.title || exam.exam || exam.exam_name || "Assessment",
                          title:            exam.title || exam.exam || exam.exam_name || "Assessment",
                          id:               exam.id,
                          examId:           exam.id,
                          exam_type:        exam.exam_type || exam.type,
                          duration_minutes: exam.duration_minutes || exam.duration || 60,
                          duration:         exam.duration_minutes || exam.duration || 60,
                          company:          exam.college || exam.company_name || "",
                        },
                        isUniversity: exam.exam_type === "university" || exam.type === "university",
                      },
                    });
                  }}
                >
                  <Icons.Play /> Enter Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two col: deadlines + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, ...fade(70) }}>

        <div className="na-card" style={{ overflow: "hidden", animation: mounted ? "fadeUp 0.4s ease-out 0.1s both" : "none" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: T.accent, display: "flex" }}><Icons.Calendar /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Upcoming Deadlines</span>
          </div>
          {loadingDash ? (
            [1, 2, 3].map(i => (
              <div key={i} style={{ padding: "11px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12 }}>
                <div style={{ width: 3, height: 36, background: "#e2e8f0", borderRadius: 2 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 12, background: "#e2e8f0", borderRadius: 4, width: "60%", animation: "shimmer 1.5s infinite" }} />
                  <div style={{ height: 10, background: "#e2e8f0", borderRadius: 4, width: "40%", animation: "shimmer 1.5s infinite" }} />
                </div>
              </div>
            ))
          ) : dashData.upcoming_deadlines?.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: T.dim, fontSize: 13 }}>No upcoming deadlines</div>
          ) : (
            dashData.upcoming_deadlines?.map((d, i) => (
              <div key={i} className="deadline-item" style={{ padding: "11px 18px", borderBottom: i < dashData.upcoming_deadlines.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 3, height: 36, background: urgencyColor[d.urgency] || T.accent, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{d.sub}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: urgencyColor[d.urgency] || T.accent, flexShrink: 0 }}>{d.date}</div>
              </div>
            ))
          )}
        </div>

        <div className="na-card" style={{ overflow: "hidden", animation: mounted ? "fadeUp 0.4s ease-out 0.2s both" : "none" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: T.accent, display: "flex" }}><Icons.Activity /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Recent Activity</span>
          </div>
          {loadingDash ? (
            [1, 2, 3].map(i => (
              <div key={i} style={{ padding: "11px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "#e2e8f0", flexShrink: 0, animation: "shimmer 1.5s infinite" }} />
                <div style={{ flex: 1, height: 12, background: "#e2e8f0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
              </div>
            ))
          ) : dashData.recent_activity?.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: T.dim, fontSize: 13 }}>No recent activity</div>
          ) : (
            dashData.recent_activity?.map((a, i) => (
              <div key={i} className="activity-item" style={{ padding: "11px 18px", borderBottom: i < dashData.recent_activity.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div className="activity-icon" style={{ width: 26, height: 26, borderRadius: 7, background: (a.color || T.accent) + "18", display: "flex", alignItems: "center", justifyContent: "center", color: a.color || T.accent, flexShrink: 0 }}>
                  {a.type === "completed" ? <Icons.CheckCircle /> : a.type === "rejected" ? <Icons.XCircle /> : <Icons.Assessment />}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
                <div style={{ fontSize: 11, color: T.dim, flexShrink: 0 }}>{a.time}</div>
              </div>
            ))
          )}
        </div>

      </div>
    </StudentLayout>
  );
}