// Sidebar.jsx — White theme matching Student & Recruiter sidebars
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const SESSION_KEYS = [
  "token", "role", "user_name", "user_email", "student_id",
  "admin_token", "recruiter_token", "student_token",
  "admin_name", "admin_email", "admin_role",
];

const navItems = [
  {
    section: 'Overview',
    items: [
      { path: '/admin-dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    section: 'Candidates',
    items: [
      { path: '/candidates',    label: 'Candidates',    icon: 'users'  },
      { path: '/question-bank', label: 'Question Bank', icon: 'book'   },
      { path: '/create-exam',   label: 'Create Exam',   icon: 'plus'   },
    ],
  },
  {
    section: 'Requests',
    items: [
      { path: '/admin-exam-requests', label: 'Exam Requests',       icon: 'clipboard'   },
      { path: '/admin-approvals',     label: 'Recruiter Requests',  icon: 'checkCircle' },
    ],
  },
  {
    section: 'Monitoring',
    items: [
      { path: '/live-monitoring', label: 'Live Monitoring',   icon: 'eye'   },
      { path: '/ai-detection',    label: 'Live AI Detection', icon: 'ai'    },
      { path: '/reports',         label: 'Reports',           icon: 'chart' },
    ],
  },
  {
    section: 'Other',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: 'audit'    },
      { path: '/settings',   label: 'Settings',   icon: 'settings' },
    ],
  },
];

function NavIcon({ name }) {
  const icons = {
    grid:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    plus:        <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    book:        <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
    users:       <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    eye:         <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    ai:          <><path d="M12 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M12 17a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2v-1a2 2 0 012-2z"/><path d="M4.22 4.22a2 2 0 012.83 0l.7.7A2 2 0 015.63 7.75l-.7-.7a2 2 0 010-2.83z"/><path d="M17.66 17.66a2 2 0 012.83 0 2 2 0 010 2.83 2 2 0 01-2.83 0 2 2 0 010-2.83z"/><path d="M2 12a2 2 0 012-2h1a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z"/><path d="M17 12a2 2 0 012-2h1a2 2 0 012 2 2 2 0 01-2 2h-1a2 2 0 01-2-2z"/></>,
    chart:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>,
    clipboard:   <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></>,
    checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></>,
    audit:       <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="12" y2="13"/><line x1="15" y1="6" x2="12" y2="13"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  };
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      {icons[name]}
    </svg>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .sb-white {
    position: fixed;
    top: 0; left: 0;
    width: 230px;
    height: 100vh;
    background: #ffffff;
    border-right: 1px solid rgba(59,130,246,0.15);
    display: flex;
    flex-direction: column;
    z-index: 100;
    box-shadow: 2px 0 12px rgba(59,130,246,0.07);
    font-family: 'Inter', sans-serif;
    overflow: hidden;
  }

  /* Logo row */
  .sb-white .sb-logo {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 16px 14px;
    border-bottom: 1px solid rgba(59,130,246,0.1);
    flex-shrink: 0;
  }
  .sb-white .sb-logo-icon {
    width: 34px; height: 34px; border-radius: 9px;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.2s; cursor: pointer;
  }
  .sb-white .sb-logo-icon:hover {
    transform: scale(1.08) rotate(5deg);
  }
  .sb-white .sb-logo-icon img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .sb-white .sb-logo-name {
    font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;
  }
  .sb-white .sb-logo-sub {
    font-size: 10.5px; font-weight: 500; color: #64748b; margin-top: 1px;
  }

  /* Scrollable nav */
  .sb-white .sb-nav {
    flex: 1; padding: 10px 10px; overflow-y: auto;
  }
  .sb-white .sb-nav::-webkit-scrollbar { width: 4px; }
  .sb-white .sb-nav::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.2); border-radius: 4px; }

  .sb-white .sb-section {
    font-size: 9.5px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.9px;
    padding: 10px 10px 4px;
  }

  /* Nav item */
  .sb-white .sb-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 8px;
    font-size: 13px; font-weight: 500; color: #475569;
    text-decoration: none; margin-bottom: 2px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer; position: relative; overflow: hidden;
    border: 1px solid transparent; user-select: none;
  }
  /* Left accent stripe */
  .sb-white .sb-item::before {
    content: ''; position: absolute; left: 0; top: 0;
    height: 100%; width: 3px; background: #3b82f6;
    border-radius: 0 2px 2px 0; transform: scaleY(0);
    transition: transform 0.2s ease;
  }
  .sb-white .sb-item:hover {
    background: #dbeafe; color: #3b82f6;
    transform: translateX(4px); border-color: rgba(59,130,246,0.15);
  }
  .sb-white .sb-item.active {
    background: #dbeafe; color: #3b82f6;
    font-weight: 600; transform: translateX(4px);
    border-color: rgba(59,130,246,0.2);
  }
  .sb-white .sb-item.active::before { transform: scaleY(1); }
  .sb-white .sb-item .sb-icon {
    display: flex; flex-shrink: 0; color: #94a3b8; transition: all 0.2s;
  }
  .sb-white .sb-item:hover .sb-icon,
  .sb-white .sb-item.active .sb-icon {
    color: #3b82f6; transform: scale(1.1);
  }

  /* Bottom section */
  .sb-white .sb-bottom {
    border-top: 1px solid rgba(59,130,246,0.1);
    padding: 12px;
    flex-shrink: 0;
    background: linear-gradient(135deg, rgba(59,130,246,0.02) 0%, transparent 100%);
  }
  .sb-white .sb-user-card {
    display: flex; align-items: center; gap: 9px;
    background: #f8fafc; border: 1px solid rgba(59,130,246,0.12);
    border-radius: 9px; padding: 9px 11px; margin-bottom: 8px;
  }
  .sb-white .sb-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #fff;
    flex-shrink: 0; border: 2px solid rgba(59,130,246,0.2);
    box-shadow: 0 2px 6px rgba(59,130,246,0.2);
  }
  .sb-white .sb-user-name {
    font-size: 12.5px; font-weight: 600; color: #0f172a;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sb-white .sb-user-role {
    font-size: 10.5px; color: #64748b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px; text-transform: capitalize;
  }

  /* Sign out button */
  .sb-white .sb-logout-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 9px 14px; border-radius: 8px;
    background: rgba(220,38,38,0.07); border: 1px solid rgba(220,38,38,0.18);
    color: #dc2626; font-size: 12.5px; font-weight: 600;
    cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s ease;
  }
  .sb-white .sb-logout-btn:hover {
    background: rgba(220,38,38,0.13); border-color: rgba(220,38,38,0.35);
    transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.12);
  }
  .sb-white .sb-logout-btn:active { transform: translateY(0) scale(0.97); }

  /* Modal */
  .sb-modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(15,23,42,0.55);
    display: flex; align-items: center; justify-content: center;
    animation: sbFadeIn 0.15s ease;
  }
  .sb-modal {
    background: #fff; border-radius: 16px; padding: 30px 32px 26px;
    max-width: 340px; width: 90%;
    box-shadow: 0 20px 60px rgba(59,130,246,0.18);
    text-align: center; animation: sbSlideUp 0.18s ease;
    border: 1px solid #dbeafe; font-family: 'Inter', sans-serif;
  }
  .sb-modal-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: #fef2f2; border: 1.5px solid #fecaca;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .sb-modal h3 { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #0f172a; }
  .sb-modal p  { margin: 0 0 22px; font-size: 13px; color: #64748b; line-height: 1.55; }
  .sb-modal-btns { display: flex; gap: 10px; }
  .sb-modal-cancel {
    flex: 1; padding: 10px; border-radius: 9px;
    background: #eff6ff; border: 1px solid #bfdbfe;
    font-size: 13px; font-weight: 600; color: #1d4ed8;
    cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s;
  }
  .sb-modal-cancel:hover { background: #dbeafe; }
  .sb-modal-confirm {
    flex: 1; padding: 10px; border-radius: 9px;
    background: #dc2626; border: none;
    font-size: 13px; font-weight: 700; color: #fff;
    cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s;
  }
  .sb-modal-confirm:hover { background: #b91c1c; transform: translateY(-1px); }

  @keyframes sbFadeIn  { from { opacity: 0 }              to { opacity: 1 }       }
  @keyframes sbSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
`;

export default function Sidebar() {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userName = localStorage.getItem('user_name') || localStorage.getItem('admin_name') || 'Admin';
  const userRole = localStorage.getItem('role') || 'admin';

  const handleLogout = () => {
    SESSION_KEYS.forEach(k => localStorage.removeItem(k));
    navigate('/', { replace: true });
    setShowLogout(false);
  };

  const isActive = (path) => {
    const p = location.pathname;
    if (path === '/admin-dashboard') return p === '/admin-dashboard';
    return p === path || p.startsWith(path + '/');
  };

  return (
    <>
      <style>{CSS}</style>

      <aside className="sb-white">

        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <img
              src="/Logo.png"
              alt="NeuroAssess Logo"
            />
          </div>
          <div>
            <div className="sb-logo-name">NeuroAssess</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="sb-nav">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="sb-section">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact || item.path === '/admin-dashboard'}
                  className={() => `sb-item${isActive(item.path) ? ' active' : ''}`}
                >
                  <span className="sb-icon"><NavIcon name={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sb-bottom">
          <div className="sb-user-card">
            <div className="sb-avatar">{userName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{userName}</div>
              <div className="sb-user-role">{userRole}</div>
            </div>
          </div>

          <button className="sb-logout-btn" onClick={() => setShowLogout(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Confirm modal */}
      {showLogout && (
        <div className="sb-modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-icon">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </div>
            <h3>Log out?</h3>
            <p>You'll be taken back to the home page and will need to sign in again.</p>
            <div className="sb-modal-btns">
              <button className="sb-modal-cancel" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="sb-modal-confirm" onClick={handleLogout}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}