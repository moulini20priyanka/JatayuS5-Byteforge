// Navbar.jsx — Dynamic notifications from backend
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Config ──────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net';
const POLL_INTERVAL   = 30_000; // 30 s polling interval

// ─── Icon components ─────────────────────────────────────────
const BellIcon = () => (
  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const ExamIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
);

const UserCheckIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Try every common key name your app might use
const TOKEN_KEYS = ['token', 'authToken', 'auth_token', 'access_token', 'jwt', 'adminToken', 'userToken'];

function getAuthToken() {
  for (const key of TOKEN_KEYS) {
    const t = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (t) return t;
  }
  // Last resort: check for a nested object like { token: '...' }
  for (const key of ['user', 'auth', 'session']) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) return parsed.token;
        if (parsed?.accessToken) return parsed.accessToken;
      }
    } catch (_) {}
  }
  return null;
}

function getAuthHeader() {
  const token = getAuthToken();
  if (!token) {
    console.warn('[Navbar] No auth token found. Checked:', TOKEN_KEYS, '\nAll localStorage keys:', Object.keys(localStorage), '\nAll sessionStorage keys:', Object.keys(sessionStorage));
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Styles ──────────────────────────────────────────────────
const navbarStyles = `
  .navbar-blue {
    position: sticky;
    top: 0;
    z-index: 50;
    height: 58px;
    background: #fff;
    border-bottom: 1px solid #dbeafe;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-shadow: 0 1px 8px rgba(37,99,235,0.07);
  }
  .navbar-blue .nb-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .navbar-blue .nb-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e40af;
    letter-spacing: -0.2px;
  }
  .navbar-blue .nb-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .navbar-blue .nb-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
    position: relative;
  }
  .navbar-blue .nb-icon-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(37,99,235,0.15);
  }
  .navbar-blue .nb-notif-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 1.5px solid #fff;
    animation: badgePop 0.25s ease;
  }
  @keyframes badgePop {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.2); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .navbar-blue .nb-notif-dropdown {
    position: fixed;
    top: 66px;
    right: 16px;
    width: 360px;
    background: #fff;
    border: 1px solid #dbeafe;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(37,99,235,0.14);
    z-index: 200;
    overflow: hidden;
    animation: nbDropIn 0.15s ease;
  }
  .navbar-blue .nb-notif-header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid #eff6ff;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .navbar-blue .nb-notif-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .navbar-blue .nb-notif-item {
    display: flex;
    gap: 10px;
    padding: 11px 16px;
    border-bottom: 1px solid #f0f9ff;
    transition: background 0.15s;
    cursor: pointer;
    align-items: flex-start;
  }
  .navbar-blue .nb-notif-item:hover {
    background: #eff6ff;
  }
  .navbar-blue .nb-notif-item:hover .nb-notif-arrow {
    opacity: 1;
    transform: translateX(0);
  }
  .navbar-blue .nb-notif-item.unread {
    background: #f0f9ff;
  }
  .navbar-blue .nb-notif-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .navbar-blue .nb-notif-icon.exam     { background: #dbeafe; color: #2563eb; }
  .navbar-blue .nb-notif-icon.recruiter { background: #dcfce7; color: #16a34a; }
  .navbar-blue .nb-notif-body   { flex: 1; min-width: 0; }
  .navbar-blue .nb-notif-title  { font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 2px; }
  .navbar-blue .nb-notif-msg    { font-size: 12px; color: #374151; line-height: 1.4; }
  .navbar-blue .nb-notif-time   { font-size: 11px; color: #93c5fd; margin-top: 3px; }
  .navbar-blue .nb-notif-arrow  {
    font-size: 14px; color: #93c5fd; flex-shrink: 0; align-self: center;
    opacity: 0; transform: translateX(-4px); transition: all 0.15s;
  }
  .navbar-blue .nb-unread-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #3b82f6;
    flex-shrink: 0; margin-top: 5px;
  }
  .navbar-blue .nb-notif-footer {
    padding: 10px 16px;
    text-align: center;
    border-top: 1px solid #eff6ff;
  }
  .navbar-blue .nb-mark-read-btn {
    background: none; border: none; font-size: 11px; color: #2563eb;
    cursor: pointer; padding: 0; font-weight: 600; transition: color 0.15s;
  }
  .navbar-blue .nb-mark-read-btn:hover { color: #1d4ed8; }
  .navbar-blue .nb-view-all-btn {
    background: none; border: none; font-size: 12px; color: #2563eb;
    cursor: pointer; font-weight: 600; transition: color 0.15s;
  }
  .navbar-blue .nb-view-all-btn:hover { color: #1d4ed8; }
  .navbar-blue .nb-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #fff; border: 2px solid #bfdbfe;
  }
  .navbar-blue .nb-user-name { font-size: 13px; font-weight: 600; color: #1e3a8a; }
  .navbar-blue .nb-user-role { font-size: 11px; color: #60a5fa; }
  .nb-loading-pulse { display: flex; gap: 4px; align-items: center; padding: 20px 16px; }
  .nb-loading-pulse span {
    width: 6px; height: 6px; border-radius: 50%; background: #bfdbfe;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .nb-loading-pulse span:nth-child(2) { animation-delay: 0.2s; }
  .nb-loading-pulse span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40%           { transform: scale(1.1); opacity: 1; }
  }
  @keyframes nbDropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: none; }
  }
`;

// ─── Component ───────────────────────────────────────────────
export default function Navbar() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [showNotif,     setShowNotif]     = useState(false);
  const dropRef   = useRef(null);
  const pollRef   = useRef(null);

  // ── Fetch from backend ──────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const url = `${API_BASE}/api/notifications?limit=30`;
      console.debug('[Navbar] Fetching:', url, '| Token present:', !!getAuthToken());

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[Navbar] HTTP ${res.status} from notifications API:`, body);
        return;
      }

      const json = await res.json();
      console.debug('[Navbar] Got notifications:', json);

      setNotifications(json.notifications ?? []);
      setUnreadCount(json.unreadCount     ?? 0);
    } catch (err) {
      console.error('[Navbar] Notifications fetch error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Mark all read ───────────────────────────────────────────
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Navbar] markAllRead failed:', err);
    }
  };

  // ── Click a notification ────────────────────────────────────
  const handleNotifClick = async (notif) => {
    // Mark single as read
    if (!notif.is_read) {
      try {
        await fetch(`${API_BASE}/api/notifications/${notif.id}/read`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) { /* non-fatal */ }
    }

    setShowNotif(false);

    if (notif.target_url) {
      navigate(notif.target_url);
    }
  };

  // ── Render notification item ────────────────────────────────
  const renderNotif = (n) => {
    const isExam      = n.type === 'exam_request';
    const iconClass   = isExam ? 'exam' : 'recruiter';
    const isUnread    = !n.is_read;

    return (
      <div
        key={n.id}
        className={`nb-notif-item${isUnread ? ' unread' : ''}`}
        onClick={() => handleNotifClick(n)}
        title={n.target_url ? 'Click to view' : undefined}
      >
        {/* Type icon */}
        <div className={`nb-notif-icon ${iconClass}`}>
          {isExam ? <ExamIcon /> : <UserCheckIcon />}
        </div>

        {/* Body */}
        <div className="nb-notif-body">
          <div className="nb-notif-title">{n.title}</div>
          <div className="nb-notif-msg">{n.message}</div>
          <div className="nb-notif-time">{timeAgo(n.created_at)}</div>
        </div>

        {/* Unread dot */}
        {isUnread && <div className="nb-unread-dot" />}

        {/* Arrow hint */}
        {n.target_url && <span className="nb-notif-arrow">›</span>}
      </div>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────
  return (
    <>
      <style>{navbarStyles}</style>
      <header className="navbar-blue">

        {/* Left */}
        <div className="nb-left">
          <span className="nb-title">AI Assessment Platform</span>
        </div>

        {/* Right */}
        <div className="nb-right">

          {/* ── Notification Bell ── */}
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button
              className="nb-icon-btn"
              onClick={() => {
                setShowNotif(prev => !prev);
                if (!showNotif) fetchNotifications(true); // refresh on open
              }}
              title="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="nb-notif-badge" key={unreadCount}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="nb-notif-dropdown">

                {/* Header */}
                <div className="nb-notif-header">
                  <h3>Notifications</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                        {unreadCount} new
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <button className="nb-mark-read-btn" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                {(() => {
                  const unread = notifications.filter(n => !n.is_read);
                  const read   = notifications.filter(n =>  n.is_read);
                  // Show all unread + up to 3 recent read
                  const displayed = [...unread, ...read.slice(0, 3)];

                  return (
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      {loading ? (
                        <div className="nb-loading-pulse">
                          <span /><span /><span />
                        </div>
                      ) : displayed.length === 0 ? (
                        <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                          <div style={{ color: '#93c5fd', fontSize: 13 }}>No notifications yet</div>
                        </div>
                      ) : (
                        <>
                          {unread.length > 0 && (
                            <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Unread ({unread.length})
                            </div>
                          )}
                          {unread.map(renderNotif)}

                          {read.length > 0 && unread.length > 0 && (
                            <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase', borderTop: '1px solid #f0f9ff', marginTop: 4 }}>
                              Recent
                            </div>
                          )}
                          {read.length > 0 && unread.length === 0 && (
                            <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Recent
                            </div>
                          )}
                          {read.slice(0, 3).map(renderNotif)}
                        </>
                      )}
                    </div>
                  );
                })()}

              </div>
            )}
          </div>

          

        </div>
      </header>
    </>
  );
}
