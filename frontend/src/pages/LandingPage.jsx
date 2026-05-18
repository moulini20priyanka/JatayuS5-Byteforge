import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";


const IconShield    = ({ size=28, color="#3b82f6", sw=2 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg>);
const IconBriefcase = ({ size=28, color="#3b82f6", sw=2 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>);
const IconGradCap   = ({ size=28, color="#3b82f6", sw=2 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="6 11.5 6 17 12 20 18 17 18 11.5"/></svg>);
const IconArrowRight= ({ size=14, color="currentColor", sw=2 }) => (<svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M8 4l3 3-3 3"/></svg>);
const IconCheck     = ({ size=16, color="#3b82f6" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const IconLock      = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const IconEye       = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconBarChart  = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>);
const IconZap       = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
const IconCpu       = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>);
const IconMonitor   = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="8" y1="17" x2="16" y2="17"/></svg>);
const IconUsers     = ({ size=20, color="currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --primary:#3b82f6; --primary-dark:#2563eb; --primary-light:#dbeafe;
    --bg:#ffffff; --bg-soft:#f8fafc; --bg-muted:#f1f5f9;
    --text:#0f172a; --text-muted:#475569; --text-light:#64748b;
    --border:#e2e8f0; --border-light:#f1f5f9;
    --font:'Inter',sans-serif; --mono:'DM Mono',monospace;
    --ease-spring:cubic-bezier(0.22,0.68,0,1.2); --ease-out:cubic-bezier(0.16,1,0.3,1);
  }
  html{scroll-behavior:smooth;} body{overflow-x:hidden;}
  .lp-root{font-family:var(--font);background:linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%);color:var(--text);min-height:100vh;overflow-x:hidden;}
  .lp-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.3;}
  .lp-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px);background-size:50px 50px;}
  .lp-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
  .lp-orb{position:absolute;border-radius:50%;filter:blur(130px);animation:orbF var(--d,22s) ease-in-out infinite;animation-delay:var(--dl,0s);}
  .o1{width:720px;height:720px;background:radial-gradient(circle,rgba(59,130,246,.06),transparent 70%);top:-200px;left:-200px;--d:24s}
  .o2{width:500px;height:500px;background:radial-gradient(circle,rgba(147,197,253,.08),transparent 70%);top:40%;right:-160px;--d:30s;--dl:-10s}
  .o3{width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,.04),transparent 70%);bottom:10%;left:5%;--d:27s;--dl:-7s}
  .o4{width:320px;height:320px;background:radial-gradient(circle,rgba(96,165,250,.06),transparent 70%);bottom:0;right:12%;--d:20s;--dl:-4s}
  @keyframes orbF{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-38px) scale(1.06)}66%{transform:translate(-20px,26px) scale(.95)}}

  /* NAV */
  .lp-nav{position:fixed;top:0;left:0;right:0;z-index:300;display:flex;align-items:center;justify-content:space-between;padding:0 52px;height:68px;background:rgba(255,255,255,0.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);animation:navIn .7s var(--ease-out) both;}
  @keyframes navIn{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
  .lp-logo{font-weight:700;font-size:16px;color:var(--text);display:flex;align-items:center;gap:10px;text-decoration:none;}
  .lp-logo-img{width:36px;height:36px;border-radius:10px;object-fit:cover;box-shadow:0 4px 12px rgba(59,130,246,0.25);}
  .lp-nav-pill{display:flex;align-items:center;gap:7px;background:var(--bg-soft);border:1px solid var(--border);border-radius:100px;padding:6px 16px;font-size:12px;color:var(--text-light);font-weight:500;}
  .lp-nav-dot{width:7px;height:7px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px rgba(59,130,246,0.55);animation:blink 2.5s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}

  /* HERO */
  .lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:140px 24px 100px;position:relative;z-index:1;}
  .lp-hero-badge{display:inline-flex;align-items:center;gap:9px;background:var(--primary-light);border:1px solid rgba(59,130,246,0.2);border-radius:100px;padding:6px 18px;margin-bottom:40px;animation:fadeUp .6s .1s var(--ease-out) both;}
  .lp-hero-badge-tag{background:var(--primary);color:white;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:4px 12px;border-radius:100px;}
  .lp-hero-badge span{font-size:13px;color:var(--primary);font-weight:500;}
  .lp-h1{font-size:clamp(44px,6.5vw,72px);font-weight:800;line-height:1.05;letter-spacing:-2px;color:var(--text);max-width:780px;margin-bottom:24px;animation:fadeUp .7s .2s var(--ease-out) both;}
  .lp-h1 .grad{background:linear-gradient(120deg,var(--primary) 0%,var(--primary-dark) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .lp-sub{font-size:17px;color:var(--text-muted);max-width:520px;line-height:1.8;margin-bottom:64px;font-weight:400;animation:fadeUp .7s .3s var(--ease-out) both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}

  /* ROLE CARDS */
  .lp-role-row{display:flex;gap:24px;flex-wrap:wrap;justify-content:center;animation:fadeUp .8s .4s var(--ease-out) both;}
  .lp-role-card{width:280px;background:white;border:1.5px solid var(--border);border-radius:20px;padding:0 0 24px;cursor:pointer;position:relative;overflow:hidden;transition:all .45s var(--ease-spring);box-shadow:0 2px 8px rgba(0,0,0,0.04);}
  .lp-role-card:hover{transform:translateY(-12px);border-color:var(--primary);box-shadow:0 20px 40px rgba(59,130,246,0.12),0 0 0 1px rgba(59,130,246,0.1);}
  .lp-role-row:has(.lp-role-card:hover) .lp-role-card:not(:hover){opacity:.4;transform:scale(.96);}
  .rc-head{height:140px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--primary-light) 0%,white 100%);}
  .rc-icon-wrap{width:72px;height:72px;border-radius:18px;background:white;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;position:relative;z-index:1;box-shadow:0 8px 24px rgba(59,130,246,0.15);transition:all .45s var(--ease-spring);}
  .lp-role-card:hover .rc-icon-wrap{transform:translateY(-8px) scale(1.05);box-shadow:0 12px 32px rgba(59,130,246,0.25);}
  .rc-body{padding:0 24px;margin-top:20px;}
  .rc-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:10px;}
  .rc-desc{font-size:13.5px;color:var(--text-muted);line-height:1.7;margin-bottom:20px;font-weight:400;}
  .rc-btn{width:100%;padding:12px 0;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font);background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:white;transition:all .22s;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(59,130,246,0.25);}
  .rc-btn:hover{box-shadow:0 6px 16px rgba(59,130,246,0.35);transform:translateY(-1px);}
  .rc-btn .btn-arr{transition:transform .2s;display:flex;}
  .rc-btn:hover .btn-arr{transform:translateX(4px);}
  .rc-signup{font-size:12px;color:var(--primary);font-weight:500;text-align:center;cursor:pointer;text-decoration:none;display:block;transition:color .2s;}
  .rc-signup:hover{color:var(--primary-dark);text-decoration:underline;}

  /* WHY */
  .lp-why-wrap{border-top:1px solid var(--border);position:relative;z-index:1;background:white;}
  .lp-section{padding:100px 52px;max-width:1200px;margin:0 auto;position:relative;z-index:1;}
  .lp-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--primary);margin-bottom:16px;}
  .lp-eyebrow::before{content:'';width:24px;height:2px;background:var(--primary);}
  .lp-section-title{font-size:clamp(32px,4vw,44px);font-weight:800;letter-spacing:-1.5px;color:var(--text);max-width:540px;line-height:1.1;margin-bottom:16px;}
  .lp-section-sub{font-size:16px;color:var(--text-muted);max-width:540px;line-height:1.8;margin-bottom:56px;font-weight:400;}
  .lp-why-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
  .lp-why-card{background:var(--bg-soft);border:1px solid var(--border);border-radius:16px;padding:28px 24px;transition:all .38s var(--ease-spring);position:relative;overflow:hidden;}
  .lp-why-card:hover{transform:translateY(-8px);border-color:var(--primary);box-shadow:0 16px 32px rgba(59,130,246,0.08);background:white;}
  .lp-why-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:var(--primary-light);border:1.5px solid rgba(59,130,246,0.2);transition:transform .3s var(--ease-spring);}
  .lp-why-card:hover .lp-why-icon{transform:scale(1.1);}
  .lp-why-card h4{font-size:15px;font-weight:700;color:var(--text);margin-bottom:10px;}
  .lp-why-card p{font-size:13.5px;color:var(--text-muted);line-height:1.7;font-weight:400;}

  /* FEATURES */
  .lp-features-wrap{border-top:1px solid var(--border);position:relative;z-index:1;background:var(--bg-soft);}
  .lp-features-inner{max-width:1200px;margin:0 auto;padding:100px 52px;}
  .lp-feat-tabs{display:flex;border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:72px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.04);}
  .lp-feat-tab{flex:1;padding:16px 12px;border:none;background:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--text-light);display:flex;flex-direction:column;align-items:center;gap:8px;transition:all .2s;border-right:1px solid var(--border);position:relative;}
  .lp-feat-tab:last-child{border-right:none;}
  .lp-feat-tab .tab-icon{width:38px;height:38px;border-radius:10px;background:var(--bg-muted);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;transition:all .2s;}
  .lp-feat-tab:hover{color:var(--primary);background:var(--primary-light);}
  .lp-feat-tab:hover .tab-icon{background:white;border-color:var(--primary);}
  .lp-feat-tab.active{color:var(--primary);background:var(--primary-light);}
  .lp-feat-tab.active .tab-icon{background:white;border-color:var(--primary);}
  .lp-feat-tab.active::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2.5px;background:var(--primary);}
  .lp-feat-rows{display:flex;flex-direction:column;gap:96px;}
  .lp-feat-row{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
  .lp-feat-row.rev{direction:rtl;}
  .lp-feat-row.rev > *{direction:ltr;}
  .lp-feat-mock{border-radius:16px;overflow:hidden;background:white;border:1.5px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.06);position:relative;transition:box-shadow .35s;}
  .lp-feat-mock:hover{box-shadow:0 16px 48px rgba(59,130,246,0.12);}
  .lp-feat-mock-bar{height:40px;background:var(--bg-soft);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:8px;}
  .lp-feat-mock-bar span{width:10px;height:10px;border-radius:50%;}
  .dot-r{background:#ef4444}.dot-y{background:#f59e0b}.dot-g{background:#10b981}
  .lp-feat-mock-bar-url{flex:1;margin:0 12px;height:20px;background:white;border-radius:6px;border:1px solid var(--border);}
  .lp-feat-mock-body{padding:28px;min-height:280px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:var(--bg-soft);}
  .lp-feat-eyebrow{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--primary);margin-bottom:16px;padding:5px 12px;border-radius:100px;background:var(--primary-light);border:1px solid rgba(59,130,246,0.2);}
  .lp-feat-h{font-size:clamp(22px,2.5vw,30px);font-weight:800;color:var(--text);letter-spacing:-1px;line-height:1.15;margin-bottom:16px;}
  .lp-feat-p{font-size:15px;color:var(--text-muted);line-height:1.8;margin-bottom:28px;font-weight:400;}
  .lp-feat-checks{display:flex;flex-direction:column;gap:12px;margin-bottom:28px;}
  .lp-feat-check{display:flex;align-items:flex-start;gap:12px;font-size:13.5px;color:var(--text-muted);line-height:1.6;font-weight:400;}
  .lp-feat-check-icon{width:20px;height:20px;border-radius:6px;background:var(--primary-light);border:1.5px solid rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}

  /* MOCKUP STYLES */
  .mock-lockdown{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;}
  .mock-lock-item{background:white;border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;transition:border-color .2s;}
  .mock-lock-item:hover{border-color:var(--primary);}
  .mock-lock-icon{width:32px;height:32px;border-radius:8px;background:var(--primary-light);border:1.5px solid rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary);}
  .mock-lock-label{font-size:12px;font-weight:600;color:var(--text);}
  .mock-lock-sub{font-size:11px;color:var(--text-light);margin-top:2px;}
  .mock-lock-badge{margin-left:auto;font-size:9px;font-weight:700;padding:3px 8px;border-radius:100px;background:#fef2f2;color:#dc2626;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0;border:1px solid #fecaca;}
  .mock-lock-badge.ok{background:#dcfce7;color:#16a34a;border-color:#86efac;}
  .mock-face{width:100%;height:240px;position:relative;display:flex;align-items:center;justify-content:center;background:white;border-radius:12px;border:1.5px solid var(--border);}
  .face-ring{position:absolute;border:2px dashed var(--primary);border-radius:50%;animation:fRing 3s ease-in-out infinite;opacity:.3;}
  .face-ring-1{width:200px;height:200px;}
  .face-ring-2{width:150px;height:150px;animation-delay:.7s;opacity:.5;}
  @keyframes fRing{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.6;transform:scale(1.05)}}
  .face-card{width:100px;height:110px;background:white;border:2px solid var(--primary);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;z-index:1;box-shadow:0 8px 24px rgba(59,130,246,0.15);position:relative;}
  .face-avatar{width:48px;height:48px;border-radius:50%;background:var(--primary-light);border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;color:var(--primary);}
  .face-verified{font-size:9px;font-weight:700;color:var(--primary);letter-spacing:.8px;text-transform:uppercase;background:var(--primary-light);padding:3px 10px;border-radius:100px;}
  .scan-line{position:absolute;left:10px;right:10px;height:2px;background:linear-gradient(90deg,transparent,var(--primary),transparent);animation:scanY 2.4s linear infinite;border-radius:2px;}
  @keyframes scanY{0%{top:10px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:calc(100% - 10px);opacity:0}}
  .face-status{position:absolute;bottom:12px;right:12px;display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;color:var(--primary);background:var(--primary-light);padding:4px 10px;border-radius:100px;}
  .face-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);animation:blink 1.4s ease-in-out infinite;}
  .mock-monitor{width:100%;}
  .mon-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .mon-title{font-size:13px;font-weight:600;color:var(--text);}
  .mon-live{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;font-weight:600;color:#dc2626;letter-spacing:.5px;background:#fef2f2;padding:4px 10px;border-radius:100px;border:1px solid #fecaca;}
  .mon-live-dot{width:7px;height:7px;border-radius:50%;background:#dc2626;animation:blink 1.2s ease-in-out infinite;}
  .mon-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .mon-cell{background:white;border:1.5px solid var(--border);border-radius:10px;overflow:hidden;}
  .mon-cam{height:60px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;position:relative;border-bottom:1px solid var(--border);}
  .mon-cam-face{width:28px;height:28px;border-radius:50%;background:var(--primary-light);border:2px solid var(--primary);}
  .mon-cell-info{padding:8px 10px;}
  .mon-cell-name{font-size:11px;font-weight:600;color:var(--text-muted);}
  .mon-cell-prog{height:3px;background:var(--bg-muted);border-radius:2px;margin-top:6px;overflow:hidden;}
  .mon-cell-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--primary),#60a5fa);}
  .mon-flag{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:11px;font-weight:500;color:#ea580c;}
  .mock-analytics{width:100%;}
  .ana-top{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
  .ana-stat{background:white;border:1.5px solid var(--border);border-radius:10px;padding:14px 16px;position:relative;overflow:hidden;}
  .ana-stat-val{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-1px;}
  .ana-stat-lbl{font-family:var(--mono);font-size:10px;color:var(--text-light);font-weight:500;margin-top:4px;letter-spacing:.5px;text-transform:uppercase;}
  .ana-chart{background:white;border:1.5px solid var(--border);border-radius:10px;padding:16px 18px;}
  .ana-chart-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
  .ana-chart-title{font-size:12px;font-weight:600;color:var(--text);}
  .ana-chart-tag{font-family:var(--mono);font-size:10px;font-weight:600;color:var(--primary);background:var(--primary-light);padding:3px 10px;border-radius:100px;}
  .ana-bars{display:flex;align-items:flex-end;gap:6px;height:64px;}
  .ana-bar{flex:1;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--primary),#93c5fd);animation:barG 1.4s var(--ease-out) both;transform-origin:bottom;}
  @keyframes barG{from{transform:scaleY(0);opacity:0}to{transform:scaleY(1);opacity:1}}

  /* FOOTER */
  .lp-footer{background:white;border-top:1px solid var(--border);padding:24px 52px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;}
  .lp-footer-logo{font-size:14px;font-weight:600;color:var(--text-light);display:flex;align-items:center;gap:10px;}
  .lp-footer-img{width:24px;height:24px;border-radius:7px;object-fit:cover;}
  .lp-footer p{font-size:12.5px;color:var(--text-light);}

  .lp-h1 {
    font-size: 64px;
    font-weight: 700;
    line-height: 1.2;
  }
  .grad {
    background: linear-gradient(to right, #3b82f6, #2563eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .sss {
    white-space: nowrap;
    display: inline-block;
    font-size: clamp(28px, 5vw, 72px);
    letter-spacing: -1px;
  }

  /* REVEAL */
  .reveal{opacity:0;transform:translateY(22px);transition:opacity .8s var(--ease-out),transform .8s var(--ease-out);}
  .reveal.in{opacity:1;transform:translateY(0);}
  .reveal-d1{transition-delay:.06s}.reveal-d2{transition-delay:.13s}.reveal-d3{transition-delay:.20s}.reveal-d4{transition-delay:.27s}

  /* RESPONSIVE */
  @media(max-width:900px){
    .lp-nav{padding:0 24px}.lp-section{padding:60px 24px}.lp-features-inner{padding:60px 24px}
    .lp-why-grid{grid-template-columns:repeat(2,1fr)}.lp-feat-row{grid-template-columns:1fr}.lp-feat-row.rev{direction:ltr}
    .lp-footer{flex-direction:column;gap:12px;text-align:center;padding:20px 24px}
  }
  @media(max-width:600px){
    .lp-why-grid{grid-template-columns:1fr}.lp-role-row{flex-direction:column;align-items:center}
    .mon-grid{grid-template-columns:repeat(2,1fr)}.mock-lockdown{grid-template-columns:1fr}
  }
`;

function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    let W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
    const pts = Array.from({ length: 35 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.5+0.2, dx: (Math.random()-.5)*.2, dy: (Math.random()-.5)*.2,
      a: Math.random()*.12+.03,
      c: ["59,130,246","96,165,250","147,197,253"][Math.floor(Math.random()*3)],
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      pts.forEach((p,i) => {
        pts.slice(i+1).forEach(q => {
          const d = Math.hypot(p.x-q.x,p.y-q.y);
          if(d<100){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(59,130,246,${.012*(1-d/100)})`;ctx.lineWidth=.5;ctx.stroke();}
        });
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.c},${p.a})`;ctx.fill();
        p.x+=p.dx;p.y+=p.dy;
        if(p.x<0||p.x>W)p.dx*=-1;if(p.y<0||p.y>H)p.dy*=-1;
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    const onR=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",onR);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onR);};
  },[]);
  return <canvas ref={ref} className="lp-canvas"/>;
}

function useReveal() {
  useEffect(()=>{
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("in");}),{threshold:.08});
    els.forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[]);
}

const MockBrowserLock = () => (
  <div className="mock-lockdown">
    {[
      {label:"Tab Switching",sub:"All tabs blocked",ok:false,icon:<IconMonitor size={16}/>},
      {label:"Copy & Paste",sub:"Clipboard disabled",ok:false,icon:<IconLock size={16}/>},
      {label:"Screen Share",sub:"Blocked by policy",ok:false,icon:<IconEye size={16}/>},
      {label:"Dev Tools",sub:"Access denied",ok:false,icon:<IconCpu size={16}/>},
      {label:"Full Screen",sub:"Enforced always",ok:true,icon:<IconMonitor size={16}/>},
      {label:"System Tray",sub:"Hidden from view",ok:true,icon:<IconZap size={16}/>},
    ].map((item,i)=>(
      <div className="mock-lock-item" key={i}>
        <div className="mock-lock-icon">{item.icon}</div>
        <div><div className="mock-lock-label">{item.label}</div><div className="mock-lock-sub">{item.sub}</div></div>
        <div className={`mock-lock-badge${item.ok?" ok":""}`}>{item.ok?"ON":"OFF"}</div>
      </div>
    ))}
  </div>
);

const MockFaceDetect = () => (
  <div className="mock-face">
    <div className="face-ring face-ring-1"/>
    <div className="face-ring face-ring-2"/>
    <div className="face-card">
      <div className="scan-line"/>
      <div className="face-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div className="face-verified">Verified</div>
    </div>
    <div className="face-status"><div className="face-dot"/>Scanning…</div>
  </div>
);

const MockMonitor = () => (
  <div className="mock-monitor">
    <div className="mon-header">
      <div className="mon-title">Live Exam Room — 18 Candidates</div>
      <div className="mon-live"><div className="mon-live-dot"/>LIVE</div>
    </div>
    <div className="mon-grid">
      {[{name:"Raj K.",prog:72},{name:"Priya S.",prog:55},{name:"Amit P.",prog:88},{name:"Anjali V.",prog:41},{name:"Vikram S.",prog:93},{name:"Neha G.",prog:61}].map((c,i)=>(
        <div className="mon-cell" key={i}>
          <div className="mon-cam"><div className="mon-cam-face"/></div>
          <div className="mon-cell-info"><div className="mon-cell-name">{c.name}</div><div className="mon-cell-prog"><div className="mon-cell-bar" style={{width:`${c.prog}%`}}/></div></div>
        </div>
      ))}
    </div>
    <div className="mon-flag">⚠ Neha G. — Multiple faces detected · 2 min ago</div>
  </div>
);

const MockAnalytics = () => (
  <div className="mock-analytics">
    <div className="ana-top">
      {[{val:"247",lbl:"Completed"},{val:"94%",lbl:"Pass Rate"},{val:"48m",lbl:"Avg Time"}].map((s,i)=>(
        <div className="ana-stat" key={i}><div className="ana-stat-val">{s.val}</div><div className="ana-stat-lbl">{s.lbl}</div></div>
      ))}
    </div>
    <div className="ana-chart">
      <div className="ana-chart-top"><div className="ana-chart-title">Score Distribution</div><div className="ana-chart-tag">Last 30 days</div></div>
      <div className="ana-bars">
        {[30,55,80,95,70,60,88,45,72,90,65,50].map((h,i)=>(
          <div key={i} className="ana-bar" style={{height:`${h}%`,animationDelay:`${i*0.07}s`}}/>
        ))}
      </div>
    </div>
  </div>
);

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const rowRefs = useRef([]);

  const roles = [
    { label:"Admin", desc:"Approve recruiters, manage students, monitor live exams, and oversee the entire NeuroAssess ecosystem.", path:"/login?role=admin", icon:<IconShield size={28}/> },
    { label:"Recruiter", desc:"View AI-powered candidate evaluations, request custom exams, and make smarter hiring decisions.", path:"/login?role=recruiter", icon:<IconBriefcase size={28}/>, signup:true, signupPath:"/recruiter-signup" },
    { label:"Student", desc:"Log in to access your assigned exams, submit your resume, and track your evaluation results.", path:"/login?role=student", icon:<IconGradCap size={28}/> },
  ];

  const whyCards = [
    {ic:<IconLock size={20}/>,title:"Zero Compromise Security",body:"Lock-down browser prevents tab switching, copy-paste, and unauthorized access throughout every session."},
    {ic:<IconCpu size={20}/>,title:"AI Proctoring Engine",body:"Real-time face detection and behavior tracking flags anomalies automatically, keeping integrity protected."},
    {ic:<IconMonitor size={20}/>,title:"Live Candidate Monitoring",body:"Admins see every candidate's status, webcam feed, and flagged events on a live dashboard as they happen."},
    {ic:<IconZap size={20}/>,title:"Scales Effortlessly",body:"Cloud-native infrastructure handles thousands of simultaneous candidates with zero performance degradation."},
  ];

  const featureTabs = [
    {label:"Secure Browser",icon:<IconLock size={16}/>},
    {label:"AI Proctoring",icon:<IconEye size={16}/>},
    {label:"Live Monitoring",icon:<IconUsers size={16}/>},
    {label:"Smart Analytics",icon:<IconBarChart size={16}/>},
  ];

  const featureRows = [
    { eyebrow:"Browser Lockdown", h:"A Controlled Environment Candidates Can't Escape", p:"NeuroAssess locks the entire browser session — preventing tab switching, copy-paste, screen sharing, and developer tools — so every exam runs on a level playing field.", checks:["Keyboard shortcut disabling (Ctrl+C, Alt+Tab, Win+D)","Full-screen enforcement with instant exit detection","External app and messaging platform blocking","Clipboard cleared before and after session"], mock:<MockBrowserLock/>, rev:false },
    { eyebrow:"AI Face Detection", h:"Real-Time Identity Verification Throughout the Exam", p:"Our computer vision model continuously monitors each candidate's webcam, flagging suspicious behavior — multiple faces, looking away, or swapped candidates — automatically in real time.", checks:["Face presence detection every 2 seconds","Multi-face and no-face anomaly alerts","Gaze estimation and head-pose tracking","Automated report with timestamped flags"], mock:<MockFaceDetect/>, rev:true },
    { eyebrow:"Live Dashboard", h:"Every Candidate, Visible to You — at Any Scale", p:"Monitor all active candidates simultaneously from a single admin dashboard. See webcam feeds, exam progress, and integrity flags the moment they happen.", checks:["Grid view of all live candidate streams","Color-coded integrity status per candidate","Instant flag notifications with evidence logs","One-click terminate for serious violations"], mock:<MockMonitor/>, rev:false },
    { eyebrow:"Exam Analytics", h:"Recruiter-Ready Reports, Auto-Generated", p:"After every exam, NeuroAssess produces detailed analytics — score distributions, time-per-question, integrity summaries — formatted for instant sharing with hiring teams.", checks:["Score distribution and percentile breakdown","Per-question time analytics","Integrity flag summary with video evidence","CSV / PDF export for recruiters"], mock:<MockAnalytics/>, rev:true },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="lp-root">
        <ParticleCanvas/>
        <div className="lp-grid"/>
        <div className="lp-orbs">
          <div className="lp-orb o1"/><div className="lp-orb o2"/>
          <div className="lp-orb o3"/><div className="lp-orb o4"/>
        </div>

        {/* ── NAV ── */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <img src="/Logo.png" alt="NeuroAssess" className="lp-logo-img" />
            NeuroAssess
          </div>
          <div className="lp-nav-pill">
            <div className="lp-nav-dot"/>
            Powered By Virtusa
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <h3 className="lp-h1">
            Exams that are <br/>
            <span className="grad sss">Secure. Smart. Scalable</span>
          </h3>

          <div className="lp-role-row">
            {roles.map(({ label, desc, path, icon, signup, signupPath }) => (
              <div key={label} className="lp-role-card">
                <div className="rc-head">
                  <div className="rc-icon-wrap"><span style={{position:"relative",zIndex:1,display:"flex"}}>{icon}</span></div>
                </div>
                <div className="rc-body">
                  <div className="rc-title">{label}</div>
                  <p className="rc-desc">{desc}</p>
                  <button className="rc-btn" onClick={() => navigate(path)}>
                    {label} Login
                    <span className="btn-arr"><IconArrowRight size={12}/></span>
                  </button>
                  {signup && (
                    <span className="rc-signup" onClick={(e) => { e.stopPropagation(); navigate(signupPath); }}>
                      New company? Apply here →
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHY ── */}
        <div className="lp-why-wrap" id="why">
          <div className="lp-section">
            <div className="reveal lp-eyebrow">Why NeuroAssess</div>
            <h2 className="reveal lp-section-title">Built for the future<br/>of fair assessment</h2>
            <p className="reveal lp-section-sub">Every feature is purpose-built to eliminate cheating, reduce admin overhead, and give recruiters the clarity they need to make confident hiring decisions.</p>
            <div className="lp-why-grid">
              {whyCards.map(({ic,title,body},i)=>(
                <div key={title} className={`lp-why-card reveal reveal-d${i+1}`}>
                  <div className="lp-why-icon">{ic}</div>
                  <h4>{title}</h4><p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FEATURES ── */}
        <div className="lp-features-wrap" id="features">
          <div className="lp-features-inner">
            <div className="reveal lp-eyebrow">Platform Features</div>
            <h2 className="reveal lp-section-title">Everything you need,<br/>nothing you don't</h2>
            <p className="reveal lp-section-sub">Four integrated layers of exam security and insight — working together so you don't have to manage multiple disconnected tools.</p>
            <div className="reveal lp-feat-tabs">
              {featureTabs.map((tab,i)=>(
                <button key={i} className={`lp-feat-tab${activeTab===i?" active":""}`}
                  onClick={()=>{setActiveTab(i);rowRefs.current[i]?.scrollIntoView({behavior:"smooth",block:"start"});}}>
                  <div className="tab-icon">{tab.icon}</div>{tab.label}
                </button>
              ))}
            </div>
            <div className="lp-feat-rows">
              {featureRows.map((row,i)=>(
                <div key={i} ref={el=>rowRefs.current[i]=el}
                  className={`lp-feat-row${row.rev?" rev":""} reveal reveal-d${(i%4)+1}`}>
                  <div className="lp-feat-mock">
                    <div className="lp-feat-mock-bar">
                      <span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                      <div className="lp-feat-mock-bar-url"/>
                      <span style={{fontFamily:"var(--mono)",fontSize:10.5,color:"var(--text-light)"}}>neuroassess.edu</span>
                    </div>
                    <div className="lp-feat-mock-body">{row.mock}</div>
                  </div>
                  <div className="lp-feat-text">
                    <div className="lp-feat-eyebrow">{row.eyebrow}</div>
                    <h3 className="lp-feat-h">{row.h}</h3>
                    <p className="lp-feat-p">{row.p}</p>
                    <div className="lp-feat-checks">
                      {row.checks.map((c,j)=>(
                        <div key={j} className="lp-feat-check">
                          <div className="lp-feat-check-icon"><IconCheck size={10}/></div>{c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-footer-logo">
            <img src="/Logo.png" alt="NeuroAssess" className="lp-footer-img" />
            NeuroAssess
          </div>
          <p>© 2026 NeuroAssess — Secure Online Examination Platform</p>
        </footer>
      </div>
    </>
  );
}