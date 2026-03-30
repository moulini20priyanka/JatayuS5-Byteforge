// Navbar.jsx — Blue theme matching login page
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const routeTitles = {
  '/': 'Dashboard',
  '/create-exam': 'Create Exam',
  '/question-bank': 'Question Bank',
  '/candidates': 'Candidates',
  '/live-monitoring': 'Live Monitoring',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

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
  .navbar-blue .nb-sep {
    color: #bfdbfe;
    font-size: 16px;
  }
  .navbar-blue .nb-breadcrumb {
    font-size: 13px;
    color: #3b82f6;
    font-weight: 500;
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
  }
  .navbar-blue .nb-notif-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
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
    padding: 10px 16px;
    border-bottom: 1px solid #f0f9ff;
    transition: background 0.15s;
  }
  .navbar-blue .nb-notif-item:hover {
    background: #eff6ff;
  }
  .navbar-blue .nb-notif-item.unread {
    background: #f0f9ff;
  }
  .navbar-blue .nb-notif-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .navbar-blue .nb-notif-dot-info    { background: #3b82f6; }
  .navbar-blue .nb-notif-dot-success { background: #1064b9; }
  .navbar-blue .nb-notif-dot-warning { background: #f59e0b; }
  .navbar-blue .nb-notif-dot-error   { background: #ef4444; }
  .navbar-blue .nb-notif-msg  { font-size: 12px; color: #1e3a8a; font-weight: 500; }
  .navbar-blue .nb-notif-time { font-size: 11px; color: #93c5fd; margin-top: 2px; }
  .navbar-blue .nb-notif-footer {
    padding: 10px 16px;
    text-align: center;
    border-top: 1px solid #eff6ff;
  }
  .navbar-blue .nb-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    border: 2px solid #bfdbfe;
  }
  .navbar-blue .nb-user-name  { font-size: 13px; font-weight: 600; color: #1e3a8a; }
  .navbar-blue .nb-user-role  { font-size: 11px; color: #60a5fa; }
  .navbar-blue .nb-mark-read-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #2563eb;
    cursor: pointer;
    padding: 0;
    font-weight: 600;
    transition: color 0.15s;
  }
  .navbar-blue .nb-mark-read-btn:hover { color: #1d4ed8; }
  .navbar-blue .nb-view-all-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: #2563eb;
    cursor: pointer;
    font-weight: 600;
    transition: color 0.15s;
  }
  .navbar-blue .nb-view-all-btn:hover { color: #1d4ed8; }
  @keyframes nbDropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: none; }
  }
`;

export default function Navbar() {
  const location = useLocation();
  const { notifications, markAllRead } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const dropRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const pageTitle = routeTitles[location.pathname] || 'Dashboard';

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <style>{navbarStyles}</style>
      <header className="navbar-blue">
        <div className="nb-left">
          <span className="nb-title">AI Assessment Platform</span>
          <span className="nb-sep">/</span>
          <span className="nb-breadcrumb">{pageTitle}</span>
        </div>

        <div className="nb-right">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button className="nb-icon-btn" onClick={() => setShowNotif(prev => !prev)} title="Notifications">
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="nb-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotif && (
              <div className="nb-notif-dropdown">
                <div className="nb-notif-header">
                  <h3>Notifications</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                        {unreadCount} new
                      </span>
                    )}
                    <button className="nb-mark-read-btn" onClick={markAllRead}>Mark all read</button>
                  </div>
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`nb-notif-item ${!n.read ? 'unread' : ''}`}>
                        <div className={`nb-notif-dot nb-notif-dot-${n.type}`} />
                        <div>
                          <div className="nb-notif-msg">{n.message}</div>
                          <div className="nb-notif-time">{n.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="nb-notif-footer">
                  <button className="nb-view-all-btn">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button className="nb-icon-btn" title="Help">
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f0f9ff', cursor: 'default', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#dbeafe'; }}
          >
            <div className="nb-avatar">AD</div>
            <div style={{ lineHeight: 1.3 }}>
              <div className="nb-user-name">Admin</div>
              <div className="nb-user-role">Super Admin</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}