// Sidebar.jsx — Blue theme matching login page
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  {
    section: 'Overview',
    items: [
       { path: '/admin-dashboard?tab=dashboard', label: 'Dashboard', icon: <GridIcon /> },
    ]
  },
 {
  section: 'Analytics',
  items: [
    { path: '/admin-dashboard?tab=reports', label: ' Reports', icon: <BarChartIcon /> },
    { path: '/admin-dashboard?tab=ai-detection', label: ' AI Detection', icon: <EyeIcon /> },
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
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
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

const sidebarStyles = `
  .sidebar-blue {
    position: fixed;
    top: 0;
    left: 0;
    width: 230px;
    height: 100vh;
    background: linear-gradient(180deg, #1e40af 0%, #1d4ed8 40%, #2563eb 100%);
    display: flex;
    flex-direction: column;
    z-index: 100;
    box-shadow: 4px 0 24px rgba(37,99,235,0.18);
    overflow-y: auto;
  }
  .sidebar-blue .sb-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
    flex-shrink: 0;
  }
  .sidebar-blue .sb-logo-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    border: 1.5px solid rgba(255,255,255,0.3);
  }
  .sidebar-blue .sb-logo-text {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    line-height: 1.3;
  }
  .sidebar-blue .sb-logo-text span {
    display: block;
    font-size: 10px;
    font-weight: 400;
    color: rgba(255,255,255,0.65);
    margin-top: 1px;
  }
  .sidebar-blue .sb-nav {
    flex: 1;
    padding: 12px 10px;
    overflow-y: auto;
  }
  .sidebar-blue .sb-section-label {
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 10px 8px 4px;
  }
  .sidebar-blue .sb-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.75);
    text-decoration: none;
    margin-bottom: 2px;
    transition: all 0.18s ease;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .sidebar-blue .sb-nav-item:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
    border-color: rgba(255,255,255,0.2);
    transform: translateX(3px);
  }
  .sidebar-blue .sb-nav-item.active {
    background: rgba(255,255,255,0.2);
    color: #fff;
    border-color: rgba(255,255,255,0.3);
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .sidebar-blue .sb-nav-item .sb-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .sidebar-blue .sb-nav-item:hover .sb-icon,
  .sidebar-blue .sb-nav-item.active .sb-icon {
    opacity: 1;
  }
  .sidebar-blue .sb-user-section {
    border-top: 1px solid rgba(255,255,255,0.12);
    padding: 12px 12px;
    flex-shrink: 0;
  }
  .sidebar-blue .sb-user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 9px;
    background: rgba(255,255,255,0.1);
    margin-bottom: 8px;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .sidebar-blue .sb-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    border: 2px solid rgba(255,255,255,0.3);
  }
  .sidebar-blue .sb-user-name {
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-blue .sb-user-role {
    color: rgba(255,255,255,0.55);
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-blue .sb-logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 12px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .sidebar-blue .sb-logout-btn:hover {
    background: rgba(239,68,68,0.28);
    border-color: rgba(239,68,68,0.5);
    color: #fecaca;
    transform: translateY(-1px);
  }
  .sb-logout-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15,23,42,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: sbFadeIn 0.15s ease;
  }
  .sb-logout-modal {
    background: #fff;
    border-radius: 16px;
    padding: 28px 32px;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 24px 64px rgba(37,99,235,0.18);
    text-align: center;
    animation: sbSlideUp 0.18s ease;
    border: 1px solid #dbeafe;
  }
  .sb-logout-modal h3 {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .sb-logout-modal p {
    margin: 0 0 22px;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
  }
  .sb-modal-actions {
    display: flex;
    gap: 10px;
  }
  .sb-btn-cancel {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    font-size: 13px;
    font-weight: 600;
    color: #1d4ed8;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sb-btn-cancel:hover {
    background: #dbeafe;
  }
  .sb-btn-logout {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    background: #dc2626;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sb-btn-logout:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }
  @keyframes sbFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sbSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
`;

export default function Sidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const userName = localStorage.getItem('admin_name') || 'Admin Neuroassess';
  const userRole = localStorage.getItem('admin_role') || 'Platform Administrator';

  const handleLogout = () => {
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_token');
    navigate('/login', { replace: true });
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <style>{sidebarStyles}</style>
      <aside className="sidebar-blue">
        <div className="sb-logo">
          <div className="sb-logo-icon">AI</div>
          <div className="sb-logo-text">
            Assessment Platform
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="sb-nav">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="sb-section-label">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="sb-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-user-section">
          <div className="sb-user-card">
            <div className="sb-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{userName}</div>
              <div className="sb-user-role">{userRole}</div>
            </div>
          </div>

          <button className="sb-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="sb-logout-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="sb-logout-modal" onClick={e => e.stopPropagation()}>
            <h3>Log out?</h3>
            <p>You'll need to sign in again to access the platform.</p>
            <div className="sb-modal-actions">
              <button className="sb-btn-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="sb-btn-logout" onClick={handleLogout}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}