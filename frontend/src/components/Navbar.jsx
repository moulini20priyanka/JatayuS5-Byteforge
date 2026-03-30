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

  const handleNotifToggle = () => {
    setShowNotif(prev => !prev);
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-title">AI Assessment Platform</span>
        <span style={{ color: '#ccc', margin: '0 6px' }}>/</span>
        <span className="navbar-breadcrumb">{pageTitle}</span>
      </div>

      <div className="navbar-right">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button className="icon-btn" onClick={handleNotifToggle} title="Notifications">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h3>Notifications</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                      {unreadCount} new
                    </span>
                  )}
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', padding: 0 }}
                  >
                    Mark all read
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <div className={`notif-dot notif-dot-${n.type}`} style={{ marginTop: 5 }} />
                      <div>
                        <div className="notif-item-msg">{n.message}</div>
                        <div className="notif-item-time">{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                <button style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer' }}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button className="icon-btn" title="Help">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="avatar">AD</div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Admin</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
