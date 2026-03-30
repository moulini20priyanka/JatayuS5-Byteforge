import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  {
    section: 'Overview',
    items: [
      { path: '/admin-dashboard', label: 'Dashboard', icon: <GridIcon /> },
    ]
  },
  {
    section: 'Exam Management',
    items: [
      { path: '/create-exam',    label: 'Create Exam',   icon: <PlusCircleIcon /> },
      { path: '/question-bank',  label: 'Question Bank', icon: <BookIcon /> },
      { path: '/candidates',     label: 'Candidates',    icon: <UsersIcon /> },
    ]
  },
  {
    section: 'Monitoring',
    items: [
      { path: '/live-monitoring', label: 'Live Monitoring', icon: <EyeIcon /> },
      { path: '/reports',         label: 'Reports',         icon: <BarChartIcon /> },
    ]
  },
  {
    section: 'Admin',
    items: [
      { path: '/admin-exam-requests', label: 'Exam Requests',       icon: <ClipboardIcon /> },
      { path: '/admin-approvals',     label: 'Recruiter Approvals', icon: <CheckCircleIcon /> },
      { path: '/settings',            label: 'Settings',            icon: <SettingsIcon /> },
    ]
  }
];

function GridIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function PlusCircleIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
}
function BookIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function EyeIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function BarChartIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
}
function ClipboardIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
}
function CheckCircleIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
}
function SettingsIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}

export default function Sidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  
  // Fixed: Using hardcoded admin name instead of undefined 'admin'
  const userName = localStorage.getItem('admin_name') || 'Admin Neuroassess';
  const userEmail = localStorage.getItem('admin_email') || 'admin@neuroassess.com';
  const userRole = localStorage.getItem('admin_role') || 'Platform Administrator';

  const handleLogout = () => {
    // Clear admin localStorage items
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_token'); // admin token
    
    // Navigate to login page
    navigate('/login', { replace: true });
    setShowLogoutConfirm(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">AI</div>
        <div className="sidebar-logo-text">
          Assessment Platform
          <span>Admin Console</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── User info + Logout ──────────────────────────────────────── */}
      <div 
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 14px',
          flexShrink: 0,
        }}
      >
        {/* User card */}
        <div 
          style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            padding: '8px 10px', 
            borderRadius: 9,
            background: 'rgba(255,255,255,0.05)',
            marginBottom: 8,
          }}
        >
          {/* Avatar */}
          <div 
            style={{
              width: 32, 
              height: 32, 
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: 13, 
              fontWeight: 700, 
              color: '#fff', 
              flexShrink: 0,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div 
              style={{
                color: '#0e0b0b', 
                fontWeight: 600, 
                fontSize: 13,
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
              }}
            >
              {userName}
            </div>
            <div 
              style={{
                color: 'rgba(20, 17, 17, 0.4)', 
                fontSize: 10,
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
              }}
            >
              {userRole}
            </div>
          </div>
        </div>
 
        {/* Logout button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: 12, 
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Logout
        </button>
      </div>

      {/* ── Logout confirm dialog ─────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: '#ffffff', 
              borderRadius: 14,
              padding: '28px 32px', 
              maxWidth: 360, 
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
              animation: 'fadeUp 0.18s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Log out?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              You'll need to sign in again to access the platform.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: 8,
                  background: '#f1f5f9', 
                  border: '1px solid #e2e8f0',
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#475569', 
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: 8,
                  background: '#dc2626', 
                  border: 'none',
                  fontSize: 13, 
                  fontWeight: 700, 
                  color: '#fff', 
                  cursor: 'pointer',
                }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}