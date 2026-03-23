import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const IconShield = ({ size = 28, color = "#fff", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const IconBriefcase = ({ size = 28, color = "#fff", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>
  </svg>
);
const IconGradCap = ({ size = 28, color = "#fff", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="6 11.5 6 17 12 20 18 17 18 11.5"/>
  </svg>
);
const IconArrowRight = ({ size = 14, color = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h8M8 4l3 3-3 3"/>
  </svg>
);
const IconCheck = ({ size = 16, color = "#2BB1A8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLock     = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const IconEye      = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconBarChart = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>);
const IconZap      = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
const IconCpu      = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>);
const IconMonitor  = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="8" y1="17" x2="16" y2="17"/></svg>);
const IconUsers    = ({ size = 20, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --teal:          #2BB1A8;
    --teal-dark:     #1d9e96;
    --teal-xdark:    #0f6b65;
    --teal-glow:     rgba(43,177,168,0.35);
    --aqua:          #CFF4F7;
    --aqua-mid:      #9DE4E8;
    --aqua-soft:     #E8FAFB;
    --navy:          #07202F;
    --navy-60:       #385E6E;
    --navy-30:       #6B9EAD;
    --surf:          #F0FAFB;
    --white:         #ffffff;
    --border:        rgba(43,177,168,0.14);
    --border-strong: rgba(43,177,168,0.26);
    --shadow-sm:     0 1px 3px rgba(7,32,47,0.06), 0 1px 2px rgba(43,177,168,0.04);
    --shadow-md:     0 4px 16px rgba(7,32,47,0.08), 0 1px 4px rgba(43,177,168,0.07);
    --shadow-lg:     0 16px 48px rgba(7,32,47,0.1),  0 4px 16px rgba(43,177,168,0.1);
    --shadow-xl:     0 24px 64px rgba(7,32,47,0.12), 0 8px 24px rgba(43,177,168,0.12);
    --font-d:        'Bricolage Grotesque', sans-serif;
    --font-b:        'DM Sans', sans-serif;
    --radius-sm:     10px;
    --radius-md:     16px;
    --radius-lg:     22px;
    --radius-xl:     30px;
    --ease-spring:   cubic-bezier(0.22,0.68,0,1.2);
    --ease-out:      cubic-bezier(0.22,0.68,0,1);
  }

  html { scroll-behavior: smooth; }
  body { overflow-x: hidden; }

  .lp-root {
    font-family: var(--font-b);
    background: var(--surf);
    color: var(--navy);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .lp-canvas { position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.32; }

  .lp-orbs { position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden; }
  .lp-orb  { position:absolute;border-radius:50%;filter:blur(100px);animation:orbF var(--d,20s) ease-in-out infinite;animation-delay:var(--dl,0s); }
  .o1{width:640px;height:640px;background:radial-gradient(circle,rgba(43,177,168,.12),transparent 70%);top:-160px;left:-160px;--d:22s}
  .o2{width:480px;height:480px;background:radial-gradient(circle,rgba(7,32,47,.06),transparent 70%);top:35%;right:-120px;--d:28s;--dl:-9s}
  .o3{width:360px;height:360px;background:radial-gradient(circle,rgba(43,177,168,.07),transparent 70%);bottom:15%;left:8%;--d:24s;--dl:-6s}
  .o4{width:280px;height:280px;background:radial-gradient(circle,rgba(28,123,154,.05),transparent 70%);bottom:5%;right:15%;--d:19s;--dl:-3s}
  @keyframes orbF{
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(28px,-36px) scale(1.05)}
    66%{transform:translate(-18px,26px) scale(.96)}
  }

  /* NAV */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 300;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 52px; height: 64px;
    background: rgba(242,251,255,0.92);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 2px 12px rgba(7,32,47,0.05);
    animation: navIn .7s var(--ease-out) both;
  }
  @keyframes navIn{ from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }

  .lp-logo {
    font-family: var(--font-d); font-weight: 800; font-size: 15.5px;
    letter-spacing: -.5px; color: var(--navy);
    display: flex; align-items: center; gap: 9px; text-decoration: none;
  }
  .lp-logo-mark {
    width: 30px; height: 30px;
    background: linear-gradient(145deg, #33c9bf 0%, #0f8fa6 100%);
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(43,177,168,.4), 0 1px 0 rgba(255,255,255,.35) inset;
    position: relative; overflow: hidden;
  }
  .lp-logo-mark::before {
    content:'';position:absolute;top:0;left:0;right:0;
    height:50%;background:rgba(255,255,255,.15);border-radius:9px 9px 0 0;
  }
  .lp-nav-badge {
    display: flex; align-items: center; gap: 6px;
    background: var(--aqua); border: 1px solid var(--aqua-mid);
    color: var(--teal-dark); padding: 5px 12px 5px 8px;
    border-radius: 100px; font-size: 11.5px; font-weight: 600;
  }
  .lp-nav-badge-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--teal);
    animation: blink 2s ease-in-out infinite;
    box-shadow: 0 0 0 2px rgba(43,177,168,.25);
  }
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}

  /* HERO */
  .lp-hero {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 130px 24px 100px;
    position: relative; z-index: 1;
  }
  .lp-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,.92); border: 1.5px solid var(--border-strong);
    border-radius: 100px; padding: 5px 14px 5px 6px; margin-bottom: 36px;
    box-shadow: 0 2px 12px rgba(43,177,168,.1), 0 1px 0 rgba(255,255,255,.8) inset;
    animation: fadeUp .6s .15s var(--ease-out) both;
  }
  .lp-pill-badge {
    background: linear-gradient(135deg, var(--teal), #0f8fa6); color: #fff;
    font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    padding: 3px 9px; border-radius: 100px; box-shadow: 0 2px 6px rgba(43,177,168,.35);
  }
  .lp-pill-text { font-size: 12.5px; font-weight: 500; color: var(--navy-60); }

  .lp-h1 {
    font-family: var(--font-d); font-size: clamp(46px, 6.8vw, 88px);
    font-weight: 800; line-height: 1.0; letter-spacing: -3.5px;
    color: var(--navy); max-width: 820px; margin-bottom: 22px;
    animation: fadeUp .7s .25s var(--ease-out) both;
  }
  .lp-h1 .grad {
    background: linear-gradient(135deg, var(--teal) 0%, #0f8fa6 40%, #14b8c8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; background-size: 200%;
    animation: gShift 5s ease-in-out infinite alternate;
  }
  @keyframes gShift{0%{background-position:0%}100%{background-position:100%}}

  .lp-sub {
    font-size: 16.5px; color: var(--navy-60); max-width: 480px;
    line-height: 1.8; margin-bottom: 64px; font-weight: 400;
    animation: fadeUp .7s .35s var(--ease-out) both;
  }
  @keyframes fadeUp{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  /* ROLE CARDS */
  .lp-role-row {
    display: flex; gap: 18px; flex-wrap: wrap;
    justify-content: center; animation: fadeUp .8s .45s var(--ease-out) both;
  }
  .lp-role-card {
    width: 226px; background: var(--white); border-radius: 24px;
    padding: 0 0 22px; cursor: pointer; position: relative;
    box-shadow: var(--shadow-md); border: 1.5px solid var(--border);
    transition: all .45s var(--ease-spring); overflow: hidden;
  }
  .lp-role-card::before {
    content: ''; position: absolute; inset: 0; border-radius: 24px;
    background: linear-gradient(160deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 55%);
    pointer-events: none; z-index: 1; transition: opacity .4s;
  }
  .lp-role-card:hover {
    transform: translateY(-16px) scale(1.025);
    box-shadow: 0 32px 72px rgba(7,32,47,.16), 0 8px 24px rgba(43,177,168,.18);
    background: #062825; border-color: var(--teal);
  }
  .lp-role-card:hover::before { opacity: 0; }
  .lp-role-row:has(.lp-role-card:hover) .lp-role-card:not(:hover) {
    opacity: .48; transform: scale(.965); filter: saturate(.5) blur(.5px);
  }
  .lp-role-card:hover .rc-title { color: rgba(255,255,255,.95); }
  .lp-role-card:hover .rc-desc  { color: rgba(255,255,255,.36); }
  .lp-role-card:hover .rc-signup { color: rgba(255,255,255,.5); }

  .rc-head {
    height: 116px; display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .rc-head-bg {
    position: absolute; inset: 0;
    background: linear-gradient(160deg, rgba(43,177,168,.08), rgba(15,143,166,.03));
    transition: opacity .4s;
  }
  .rc-head-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(43,177,168,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(43,177,168,.06) 1px, transparent 1px);
    background-size: 18px 18px; transition: opacity .4s;
  }
  .rc-head-corner {
    position: absolute; top:10px; right:10px; width:18px; height:18px;
    border-top: 1.5px solid rgba(43,177,168,.28); border-right: 1.5px solid rgba(43,177,168,.28);
    border-radius: 0 4px 0 0;
  }
  .rc-head-corner2 {
    position: absolute; bottom:10px; left:10px; width:18px; height:18px;
    border-bottom: 1.5px solid rgba(43,177,168,.28); border-left: 1.5px solid rgba(43,177,168,.28);
    border-radius: 0 0 0 4px;
  }
  .lp-role-card:hover .rc-head-bg   { opacity: .35; }
  .lp-role-card:hover .rc-head-grid { opacity: .4; }

  .rc-icon3d {
    width: 68px; height: 68px; border-radius: 20px;
    background: linear-gradient(145deg, #33c9bf, #1a9e96);
    display: flex; align-items: center; justify-content: center;
    position: relative; z-index: 1;
    box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, -2px -2px 0 rgba(0,0,0,.08) inset,
      3px 3px 0 #178880, 0 6px 0 #0f6b65, 0 14px 28px rgba(43,177,168,.55);
    transition: all .45s var(--ease-spring);
  }
  .rc-icon3d::before {
    content:'';position:absolute;inset:0;border-radius:20px;
    background:linear-gradient(140deg,rgba(255,255,255,.38) 0%,transparent 55%);
  }
  .lp-role-card:hover .rc-icon3d {
    transform: translateY(-10px) rotate(-6deg);
    box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, -2px -2px 0 rgba(0,0,0,.08) inset,
      3px 3px 0 #178880, 0 6px 0 #0f6b65, 0 28px 48px rgba(43,177,168,.65);
  }
  .rc-accent {
    height: 1.5px; background: linear-gradient(90deg, var(--teal), rgba(43,177,168,0));
    margin: 0 20px 18px; transform: scaleX(.2); transform-origin: left;
    transition: transform .5s var(--ease-out); opacity: .5; border-radius: 2px;
  }
  .lp-role-card:hover .rc-accent { transform: scaleX(1); opacity: .9; }

  .rc-body { padding: 0 20px; }
  .rc-title {
    font-family: var(--font-d); font-size: 15.5px; font-weight: 700;
    color: var(--navy); margin-bottom: 7px; letter-spacing: -.35px; transition: color .4s;
  }
  .rc-desc {
    font-size: 12px; color: var(--navy-30); line-height: 1.65;
    margin-bottom: 14px; transition: color .4s; font-weight: 400;
  }
  .rc-btn {
    width: 100%; padding: 10px 0; border-radius: 11px; border: none;
    font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--font-b);
    background: linear-gradient(135deg, var(--teal), #1191a8); color: #fff;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all .22s; margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(43,177,168,.3), 0 1px 0 rgba(255,255,255,.2) inset;
  }
  .rc-btn:hover { filter:brightness(1.08); transform:translateY(-2px); box-shadow:0 6px 18px rgba(43,177,168,.42); }
  .rc-btn .btn-arr { transition:transform .2s; display:flex; }
  .rc-btn:hover .btn-arr { transform:translateX(4px); }

  /* Recruiter signup link */
  .rc-signup {
    font-size: 11px; color: var(--teal-dark); font-weight: 500;
    text-align: center; cursor: pointer; text-decoration: underline;
    text-underline-offset: 2px; transition: color .3s; display: block;
  }
  .rc-signup:hover { color: var(--teal); }

  /* WHY SECTION */
  .lp-why-wrap {
    background: var(--white); border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border); position: relative; z-index: 1;
  }
  .lp-section { padding:100px 52px; max-width:1160px; margin:0 auto; position:relative; z-index:1; }

  .lp-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 10.5px; font-weight: 700; letter-spacing: 2.2px;
    text-transform: uppercase; color: var(--teal); margin-bottom: 16px;
  }
  .lp-eyebrow::before {
    content:''; width:18px; height:2px;
    background:linear-gradient(90deg,var(--teal),rgba(43,177,168,.3)); border-radius:2px;
  }
  .lp-section-title {
    font-family: var(--font-d); font-size: clamp(28px, 3.8vw, 46px);
    font-weight: 800; letter-spacing: -2px; color: var(--navy);
    max-width: 520px; line-height: 1.08; margin-bottom: 18px;
  }
  .lp-section-sub {
    font-size: 15px; color: var(--navy-60); max-width: 500px;
    line-height: 1.78; margin-bottom: 56px; font-weight: 400;
  }
  .lp-why-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .lp-why-card {
    background: var(--surf); border: 1.5px solid var(--border);
    border-radius: 20px; padding: 28px 24px 26px;
    transition: all .38s var(--ease-spring); position: relative; overflow: hidden; cursor: default;
  }
  .lp-why-card::before {
    content:''; position:absolute; top:0; left:20px; right:20px; height:1.5px;
    background:var(--wa,var(--teal)); border-radius:0 0 3px 3px;
    transform:scaleX(0); transform-origin:left; transition:transform .45s var(--ease-out); opacity:.6;
  }
  .lp-why-card:hover { transform:translateY(-7px); border-color:rgba(43,177,168,.22); box-shadow:var(--shadow-lg); background:var(--white); }
  .lp-why-card:hover::before { transform:scaleX(1); }
  .lp-why-card:nth-child(1){--wa:var(--teal)}
  .lp-why-card:nth-child(2){--wa:#1C7B9A}
  .lp-why-card:nth-child(3){--wa:#1A9E7A}
  .lp-why-card:nth-child(4){--wa:#C07B2A}
  .lp-why-icon {
    width:48px; height:48px; border-radius:13px;
    display:flex; align-items:center; justify-content:center;
    margin-bottom:18px; background:var(--ib); transition:transform .3s var(--ease-spring);
  }
  .lp-why-card:hover .lp-why-icon { transform:scale(1.1) rotate(-3deg); }
  .lp-why-card h4 { font-family:var(--font-d); font-size:14.5px; font-weight:700; color:var(--navy); margin-bottom:9px; letter-spacing:-.35px; }
  .lp-why-card p  { font-size:13px; color:var(--navy-60); line-height:1.72; font-weight:400; }

  /* FEATURES */
  .lp-features-wrap { background: var(--surf); border-top: 1px solid var(--border); position: relative; z-index: 1; }
  .lp-features-inner { max-width:1160px; margin:0 auto; padding:100px 52px; }

  .lp-feat-tabs {
    display:flex; border:1.5px solid var(--border); border-radius:14px;
    overflow:hidden; margin-bottom:72px; background:var(--white); box-shadow:var(--shadow-sm);
  }
  .lp-feat-tab {
    flex:1; padding:13px 10px; border:none; background:none; cursor:pointer;
    font-family:var(--font-b); font-size:12.5px; font-weight:600; color:var(--navy-60);
    display:flex; flex-direction:column; align-items:center; gap:6px;
    transition:all .2s; border-right:1px solid var(--border); position:relative;
  }
  .lp-feat-tab:last-child { border-right:none; }
  .lp-feat-tab .tab-icon {
    width:34px; height:34px; border-radius:9px; background:var(--surf);
    display:flex; align-items:center; justify-content:center;
    transition:all .2s; border:1px solid var(--border);
  }
  .lp-feat-tab:hover { color:var(--teal); background:var(--aqua-soft); }
  .lp-feat-tab:hover .tab-icon { background:var(--aqua); border-color:var(--aqua-mid); }
  .lp-feat-tab.active { color:var(--teal); background:var(--aqua-soft); }
  .lp-feat-tab.active .tab-icon { background:var(--teal); border-color:var(--teal); }
  .lp-feat-tab.active::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:2.5px;
    background:linear-gradient(90deg,transparent,var(--teal),transparent);
  }
  .lp-feat-rows { display:flex; flex-direction:column; gap:96px; }
  .lp-feat-row { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
  .lp-feat-row.rev { direction:rtl; }
  .lp-feat-row.rev > * { direction:ltr; }

  .lp-feat-mock {
    border-radius:18px; overflow:hidden; background:var(--white);
    border:1.5px solid var(--border); box-shadow:var(--shadow-xl);
    position:relative; transition:box-shadow .35s;
  }
  .lp-feat-mock:hover { box-shadow:0 32px 80px rgba(7,32,47,.12),0 8px 28px rgba(43,177,168,.14); }
  .lp-feat-mock::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,rgba(43,177,168,.3),transparent);
    z-index:2; pointer-events:none;
  }
  .lp-feat-mock-bar {
    height:34px; background:var(--white); border-bottom:1px solid var(--border);
    display:flex; align-items:center; padding:0 14px; gap:6px;
  }
  .lp-feat-mock-bar span { width:10px; height:10px; border-radius:50%; }
  .dot-r{background:#FF6058}.dot-y{background:#FFBD2E}.dot-g{background:#28CA41}
  .lp-feat-mock-bar-url {
    flex:1; margin:0 10px; height:18px;
    background:var(--surf); border-radius:5px; border:1px solid var(--border);
  }
  .lp-feat-mock-body {
    padding:24px; min-height:264px;
    display:flex; align-items:center; justify-content:center;
    position:relative; overflow:hidden; background:var(--surf);
  }
  .lp-feat-eyebrow {
    display:inline-flex; align-items:center; gap:7px;
    font-size:10.5px; font-weight:700; letter-spacing:1.8px;
    text-transform:uppercase; color:var(--teal); margin-bottom:14px; padding:4px 10px;
    border-radius:100px; background:var(--aqua); border:1px solid rgba(43,177,168,.22);
  }
  .lp-feat-h {
    font-family:var(--font-d); font-size:clamp(22px,2.6vw,31px); font-weight:800;
    color:var(--navy); letter-spacing:-1.2px; line-height:1.12; margin-bottom:14px;
  }
  .lp-feat-p { font-size:14.5px; color:var(--navy-60); line-height:1.8; margin-bottom:26px; font-weight:400; }
  .lp-feat-checks { display:flex; flex-direction:column; gap:9px; margin-bottom:28px; }
  .lp-feat-check {
    display:flex; align-items:flex-start; gap:10px;
    font-size:13px; color:var(--navy-60); line-height:1.55; font-weight:400;
  }
  .lp-feat-check-icon {
    width:19px; height:19px; border-radius:50%; background:var(--aqua);
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0; margin-top:1px; border:1px solid rgba(43,177,168,.2);
  }

  /* MOCKUP: BROWSER LOCKDOWN */
  .mock-lockdown { display:grid; grid-template-columns:1fr 1fr; gap:9px; width:100%; }
  .mock-lock-item {
    background:var(--white); border:1px solid var(--border); border-radius:11px;
    padding:11px 13px; display:flex; align-items:center; gap:10px; transition:box-shadow .2s;
  }
  .mock-lock-item:hover { box-shadow:var(--shadow-sm); }
  .mock-lock-icon {
    width:30px; height:30px; border-radius:8px; background:var(--aqua);
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0; border:1px solid rgba(43,177,168,.15);
  }
  .mock-lock-label { font-size:11.5px; font-weight:600; color:var(--navy); }
  .mock-lock-sub   { font-size:10px; color:var(--navy-30); margin-top:1px; }
  .mock-lock-badge {
    margin-left:auto; font-size:8.5px; font-weight:700; padding:2px 7px; border-radius:100px;
    background:#fee2e2; color:#dc2626; letter-spacing:.5px; text-transform:uppercase; flex-shrink:0;
  }
  .mock-lock-badge.ok { background:#dcfce7; color:#16a34a; }

  /* MOCKUP: FACE DETECT */
  .mock-face { width:100%; height:224px; position:relative; display:flex; align-items:center; justify-content:center; }
  .face-ring { position:absolute; border:1px solid var(--teal); border-radius:50%; animation:fRing 3s ease-in-out infinite; }
  .face-ring-1 { width:175px;height:175px;opacity:.18;border-style:dashed; }
  .face-ring-2 { width:130px;height:130px;opacity:.35;animation-delay:.6s; }
  @keyframes fRing{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.7;transform:scale(1.04)}}
  .face-card {
    width:98px; height:108px; background:var(--white); border:1.5px solid var(--teal);
    border-radius:13px; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:7px; z-index:1; box-shadow:0 8px 28px rgba(43,177,168,.22); position:relative;
  }
  .face-card::before,.face-card::after {
    content:''; position:absolute; width:14px; height:14px; border-color:var(--teal); border-style:solid;
  }
  .face-card::before{top:-4px;left:-4px;border-width:2px 0 0 2px;border-radius:3px 0 0 0}
  .face-card::after {bottom:-4px;right:-4px;border-width:0 2px 2px 0;border-radius:0 0 3px 0}
  .face-avatar {
    width:46px; height:46px; border-radius:50%;
    background:linear-gradient(135deg,var(--aqua-mid),var(--teal));
    display:flex; align-items:center; justify-content:center;
  }
  .face-verified {
    font-size:8.5px; font-weight:700; color:var(--teal); letter-spacing:.8px; text-transform:uppercase;
    background:var(--aqua); padding:3px 8px; border-radius:100px; border:1px solid rgba(43,177,168,.2);
  }
  .scan-line {
    position:absolute; left:8px; right:8px; height:1.5px;
    background:linear-gradient(90deg,transparent,var(--teal),transparent);
    animation:scanY 2.4s linear infinite; border-radius:2px;
  }
  @keyframes scanY{0%{top:8px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:calc(100% - 8px);opacity:0}}
  .face-status {
    position:absolute; bottom:8px; right:8px; display:flex; align-items:center; gap:5px;
    font-size:9.5px; font-weight:600; color:var(--teal); background:var(--aqua);
    padding:3px 9px; border-radius:100px; border:1px solid rgba(43,177,168,.2);
  }
  .face-dot { width:5px;height:5px;border-radius:50%;background:var(--teal);animation:blink 1.4s ease-in-out infinite; }
  .face-corner { position:absolute; font-size:8.5px; font-weight:600; color:var(--navy-30); letter-spacing:.5px; text-transform:uppercase; }
  .face-corner.tl{top:10px;left:12px} .face-corner.tr{top:10px;right:12px}
  .face-confidence { position:absolute; bottom:8px; left:10px; display:flex; flex-direction:column; gap:3px; }
  .face-conf-label { font-size:8px; font-weight:600; color:var(--navy-30); text-transform:uppercase; letter-spacing:.5px; }
  .face-conf-bar { width:70px; height:3px; background:var(--border); border-radius:2px; overflow:hidden; }
  .face-conf-fill {
    height:100%; background:linear-gradient(90deg,var(--teal),#14b8c8);
    border-radius:2px; animation:confFill 2s ease-out both;
  }
  @keyframes confFill{from{width:0}to{width:96%}}

  /* MOCKUP: LIVE MONITOR */
  .mock-monitor { width:100%; }
  .mon-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
  .mon-title { font-size:11.5px; font-weight:700; color:var(--navy); }
  .mon-live {
    display:flex; align-items:center; gap:5px; font-size:9.5px; font-weight:700;
    color:#dc2626; letter-spacing:.6px; background:#fee2e2; padding:3px 8px; border-radius:100px;
  }
  .mon-live-dot { width:6px;height:6px;border-radius:50%;background:#dc2626;animation:blink 1.2s ease-in-out infinite; }
  .mon-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
  .mon-cell {
    background:var(--white); border:1.5px solid var(--border);
    border-radius:10px; overflow:hidden; transition:box-shadow .2s;
  }
  .mon-cell:hover { box-shadow:var(--shadow-sm); }
  .mon-cam {
    height:54px; background:linear-gradient(160deg,#07202F,#0e3248);
    display:flex; align-items:center; justify-content:center; position:relative;
  }
  .mon-cam-face { width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25); }
  .mon-cam-badge { position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(255,255,255,.3); }
  .mon-cell-info { padding:6px 8px; }
  .mon-cell-name { font-size:10px; font-weight:600; color:var(--navy); }
  .mon-cell-prog { height:2.5px; background:var(--border); border-radius:2px; margin-top:4px; overflow:hidden; }
  .mon-cell-bar  { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--teal),#14b8c8); }
  .mon-flag {
    display:flex; align-items:center; gap:7px; margin-top:10px; padding:8px 11px; border-radius:9px;
    background:#fff7ed; border:1px solid #fed7aa; font-size:10.5px; font-weight:600; color:#c2410c;
  }

  /* MOCKUP: ANALYTICS */
  .mock-analytics { width:100%; }
  .ana-top { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
  .ana-stat {
    background:var(--white); border:1.5px solid var(--border);
    border-radius:11px; padding:10px 12px; position:relative; overflow:hidden;
  }
  .ana-stat::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,var(--teal),rgba(43,177,168,.2));
  }
  .ana-stat-val { font-family:var(--font-d); font-size:21px; font-weight:800; color:var(--navy); letter-spacing:-1px; }
  .ana-stat-lbl { font-size:9.5px; color:var(--navy-30); font-weight:500; margin-top:2px; }
  .ana-chart { background:var(--white); border:1.5px solid var(--border); border-radius:11px; padding:13px 14px; }
  .ana-chart-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .ana-chart-title { font-size:10.5px; font-weight:700; color:var(--navy); }
  .ana-chart-tag { font-size:9px; font-weight:600; color:var(--teal); background:var(--aqua); padding:2px 7px; border-radius:100px; }
  .ana-bars { display:flex; align-items:flex-end; gap:5px; height:58px; }
  .ana-bar {
    flex:1; border-radius:3px 3px 0 0;
    background:linear-gradient(180deg,var(--teal),rgba(43,177,168,.25));
    animation:barG 1.4s var(--ease-out) both; transform-origin:bottom; transition:filter .2s;
  }
  .ana-bar:hover { filter:brightness(1.15); }
  @keyframes barG{from{transform:scaleY(0);opacity:0}to{transform:scaleY(1);opacity:1}}

  /* FOOTER */
  .lp-footer {
    background:var(--white); border-top:1px solid var(--border);
    padding:24px 52px; display:flex; align-items:center; justify-content:space-between;
    position:relative; z-index:1;
  }
  .lp-footer-logo {
    font-family:var(--font-d); font-weight:700; font-size:13.5px;
    color:var(--navy-30); display:flex; align-items:center; gap:7px;
  }
  .lp-footer-mark {
    width:20px; height:20px; background:linear-gradient(135deg,var(--teal),#1C7B9A);
    border-radius:6px; display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 6px rgba(43,177,168,.3);
  }
  .lp-footer p { font-size:12px; color:var(--navy-30); }

  /* SCROLL REVEAL */
  .reveal { opacity:0; transform:translateY(24px); transition:opacity .75s var(--ease-out),transform .75s var(--ease-out); }
  .reveal.in { opacity:1; transform:translateY(0); }
  .reveal-d1{transition-delay:.08s}.reveal-d2{transition-delay:.16s}
  .reveal-d3{transition-delay:.24s}.reveal-d4{transition-delay:.32s}

  /* RESPONSIVE */
  @media(max-width:900px){
    .lp-nav{padding:0 24px}
    .lp-section{padding:60px 24px}
    .lp-features-inner{padding:60px 24px}
    .lp-why-grid{grid-template-columns:repeat(2,1fr)}
    .lp-feat-row{grid-template-columns:1fr}
    .lp-feat-row.rev{direction:ltr}
    .lp-feat-tabs{flex-wrap:wrap}
    .lp-footer{flex-direction:column;gap:10px;text-align:center;padding:20px 24px}
  }
  @media(max-width:600px){
    .lp-why-grid{grid-template-columns:1fr}
    .lp-role-row{flex-direction:column;align-items:center}
    .mon-grid{grid-template-columns:repeat(2,1fr)}
    .mock-lockdown{grid-template-columns:1fr}
  }
`;

/* ─────────────────────────────────────────────
   PARTICLE CANVAS
───────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    let W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
    const pts = Array.from({ length: 38 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.8+0.3,
      dx: (Math.random()-.5)*.25, dy: (Math.random()-.5)*.25,
      a: Math.random()*.2+.06,
      c: ["43,177,168","28,123,154","15,143,166"][Math.floor(Math.random()*3)],
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      pts.forEach((p,i) => {
        pts.slice(i+1).forEach(q => {
          const d = Math.hypot(p.x-q.x,p.y-q.y);
          if(d<110){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(43,177,168,${.022*(1-d/110)})`;ctx.lineWidth=.6;ctx.stroke();}
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
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onR);};
  },[]);
  return <canvas ref={ref} className="lp-canvas"/>;
}

function useReveal() {
  useEffect(()=>{
    const els=document.querySelectorAll(".reveal");
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("in");}),{threshold:.1});
    els.forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[]);
}

const HexMark = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="white">
    <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z"/>
    <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="rgba(0,0,0,.22)"/>
  </svg>
);

/* ─────────────────────────────────────────────
   FEATURE MOCKUPS
───────────────────────────────────────────── */
const MockBrowserLock = () => (
  <div className="mock-lockdown">
    {[
      {label:"Tab Switching", sub:"All tabs blocked",   ok:false, icon:<IconMonitor size={15} color="#2BB1A8"/>},
      {label:"Copy & Paste",  sub:"Clipboard disabled", ok:false, icon:<IconLock size={15} color="#2BB1A8"/>},
      {label:"Screen Share",  sub:"Blocked by policy",  ok:false, icon:<IconEye size={15} color="#2BB1A8"/>},
      {label:"Dev Tools",     sub:"Access denied",      ok:false, icon:<IconCpu size={15} color="#2BB1A8"/>},
      {label:"Full Screen",   sub:"Enforced always",    ok:true,  icon:<IconMonitor size={15} color="#2BB1A8"/>},
      {label:"System Tray",   sub:"Hidden from view",   ok:true,  icon:<IconZap size={15} color="#2BB1A8"/>},
    ].map((item,i)=>(
      <div className="mock-lock-item" key={i}>
        <div className="mock-lock-icon">{item.icon}</div>
        <div>
          <div className="mock-lock-label">{item.label}</div>
          <div className="mock-lock-sub">{item.sub}</div>
        </div>
        <div className={`mock-lock-badge${item.ok?" ok":""}`}>{item.ok?"ON":"OFF"}</div>
      </div>
    ))}
  </div>
);

const MockFaceDetect = () => (
  <div className="mock-face">
    <div className="face-corner tl">AI Monitor</div>
    <div className="face-corner tr">Live</div>
    <div className="face-ring face-ring-1"/>
    <div className="face-ring face-ring-2"/>
    <div className="face-card">
      <div className="scan-line"/>
      <div className="face-avatar">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div className="face-verified">Verified</div>
    </div>
    <div className="face-confidence">
      <div className="face-conf-label">Confidence</div>
      <div className="face-conf-bar"><div className="face-conf-fill"/></div>
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
      {[
        {name:"Raj K.",    prog:72,status:"ok"},
        {name:"Priya S.",  prog:55,status:"warn"},
        {name:"Amit P.",   prog:88,status:"ok"},
        {name:"Anjali V.", prog:41,status:"ok"},
        {name:"Vikram S.", prog:93,status:"ok"},
        {name:"Neha G.",   prog:61,status:"flag"},
      ].map((c,i)=>(
        <div className="mon-cell" key={i}>
          <div className="mon-cam">
            <div className="mon-cam-face"/>
            <div className="mon-cam-badge" style={{background:c.status==="ok"?"#22c55e":c.status==="warn"?"#f59e0b":"#ef4444"}}/>
          </div>
          <div className="mon-cell-info">
            <div className="mon-cell-name">{c.name}</div>
            <div className="mon-cell-prog"><div className="mon-cell-bar" style={{width:`${c.prog}%`}}/></div>
          </div>
        </div>
      ))}
    </div>
    <div className="mon-flag">⚠️ Neha G. — Multiple faces detected · 2 min ago</div>
  </div>
);

const MockAnalytics = () => (
  <div className="mock-analytics">
    <div className="ana-top">
      {[{val:"247",lbl:"Completed"},{val:"94%",lbl:"Pass Rate"},{val:"48m",lbl:"Avg Time"}].map((s,i)=>(
        <div className="ana-stat" key={i}>
          <div className="ana-stat-val">{s.val}</div>
          <div className="ana-stat-lbl">{s.lbl}</div>
        </div>
      ))}
    </div>
    <div className="ana-chart">
      <div className="ana-chart-top">
        <div className="ana-chart-title">Score Distribution</div>
        <div className="ana-chart-tag">Last 30 days</div>
      </div>
      <div className="ana-bars">
        {[30,55,80,95,70,60,88,45,72,90,65,50].map((h,i)=>(
          <div key={i} className="ana-bar" style={{height:`${h}%`,animationDelay:`${i*0.07}s`}}/>
        ))}
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const rowRefs = useRef([]);

  // Updated role descriptions & routes from file 2, card UI from file 1
  const roles = [
    {
      label: "Admin",
      desc: "Approve recruiters, manage students, monitor live exams, and oversee the entire NeuroAssess ecosystem.",
      path: "/login?role=admin",
      icon: <IconShield size={28} color="#fff"/>,
    },
    {
      label: "Recruiter",
      desc: "View AI-powered candidate evaluations, request custom exams, and make smarter hiring decisions.",
      path: "/login?role=recruiter",
      icon: <IconBriefcase size={28} color="#fff"/>,
      signup: true,
      signupPath: "/recruiter-signup",
    },
    {
      label: "Student",
      desc: "Log in to access your assigned exams, submit your resume, and track your evaluation results.",
      path: "/login?role=student",
      icon: <IconGradCap size={28} color="#fff"/>,
    },
  ];

  const whyCards = [
    {ibg:"rgba(43,177,168,.1)",  ic:<IconLock size={21} color="#2BB1A8"/>,    title:"Zero Compromise Security",    body:"Lock-down browser prevents tab switching, copy-paste, and unauthorized access throughout every session."},
    {ibg:"rgba(28,123,154,.1)",  ic:<IconCpu size={21} color="#1C7B9A"/>,     title:"AI Proctoring Engine",        body:"Real-time face detection and behavior tracking flags anomalies automatically, keeping integrity protected."},
    {ibg:"rgba(26,158,122,.1)",  ic:<IconMonitor size={21} color="#1A9E7A"/>, title:"Live Candidate Monitoring",   body:"Admins see every candidate's status, webcam feed, and flagged events on a live dashboard as they happen."},
    {ibg:"rgba(192,123,42,.1)",  ic:<IconZap size={21} color="#C07B2A"/>,     title:"Scales Effortlessly",         body:"Cloud-native infrastructure handles thousands of simultaneous candidates with zero performance degradation."},
  ];

  const featureTabs = [
    {label:"Secure Browser",  icon:<IconLock size={17} color="#2BB1A8"/>},
    {label:"AI Proctoring",   icon:<IconEye size={17} color="#2BB1A8"/>},
    {label:"Live Monitoring", icon:<IconUsers size={17} color="#2BB1A8"/>},
    {label:"Smart Analytics", icon:<IconBarChart size={17} color="#2BB1A8"/>},
  ];

  const featureRows = [
    {
      eyebrow:"Browser Lockdown",
      h:"A Controlled Environment Candidates Can't Escape",
      p:"NeuroAssess locks the entire browser session — preventing tab switching, copy-paste, screen sharing, and developer tools — so every exam runs on a level playing field.",
      checks:["Keyboard shortcut disabling (Ctrl+C, Alt+Tab, Win+D)","Full-screen enforcement with instant exit detection","External app and messaging platform blocking","Clipboard cleared before and after session"],
      mock:<MockBrowserLock/>, rev:false,
    },
    {
      eyebrow:"AI Face Detection",
      h:"Real-Time Identity Verification Throughout the Exam",
      p:"Our computer vision model continuously monitors each candidate's webcam, flagging suspicious behavior — multiple faces, looking away, or swapped candidates — automatically in real time.",
      checks:["Face presence detection every 2 seconds","Multi-face and no-face anomaly alerts","Gaze estimation and head-pose tracking","Automated report with timestamped flags"],
      mock:<MockFaceDetect/>, rev:true,
    },
    {
      eyebrow:"Live Dashboard",
      h:"Every Candidate, Visible to You — at Any Scale",
      p:"Monitor all active candidates simultaneously from a single admin dashboard. See webcam feeds, exam progress, and integrity flags the moment they happen.",
      checks:["Grid view of all live candidate streams","Color-coded integrity status per candidate","Instant flag notifications with evidence logs","One-click terminate for serious violations"],
      mock:<MockMonitor/>, rev:false,
    },
    {
      eyebrow:"Exam Analytics",
      h:"Recruiter-Ready Reports, Auto-Generated",
      p:"After every exam, NeuroAssess produces detailed analytics — score distributions, time-per-question, integrity summaries — formatted for instant sharing with hiring teams.",
      checks:["Score distribution and percentile breakdown","Per-question time analytics","Integrity flag summary with video evidence","CSV / PDF export for recruiters"],
      mock:<MockAnalytics/>, rev:true,
    },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="lp-root">
        <ParticleCanvas/>
        <div className="lp-orbs">
          <div className="lp-orb o1"/><div className="lp-orb o2"/>
          <div className="lp-orb o3"/><div className="lp-orb o4"/>
        </div>

        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <div className="lp-logo-mark"><HexMark size={14}/></div>
            NeuroAssess
          </div>
          <div className="lp-nav-badge">
            <div className="lp-nav-badge-dot"/>
            Powered By Virtusa
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-pill">
            <span className="lp-pill-badge">New</span>
            <span className="lp-pill-text">AI-Powered Examination Platform</span>
          </div>
          <h1 className="lp-h1">Exams that are<br/><span className="grad">Secure. Smart. Fair.</span></h1>

          <div className="lp-role-row">
            {roles.map(({ label, desc, path, icon, signup, signupPath }) => (
              <div key={label} className="lp-role-card">
                <div className="rc-head">
                  <div className="rc-head-bg"/><div className="rc-head-grid"/>
                  <div className="rc-head-corner"/><div className="rc-head-corner2"/>
                  <div className="rc-icon3d">
                    <span style={{position:"relative",zIndex:1,display:"flex"}}>{icon}</span>
                  </div>
                </div>
                <div className="rc-accent"/>
                <div className="rc-body">
                  <div className="rc-title">{label}</div>
                  <p className="rc-desc">{desc}</p>
                  <button className="rc-btn" onClick={() => navigate(path)}>
                    {label} Login
                    <span className="btn-arr"><IconArrowRight size={12} color="#fff"/></span>
                  </button>
                  {signup && (
                    <span
                      className="rc-signup"
                      onClick={(e) => { e.stopPropagation(); navigate(signupPath); }}
                    >
                      New company? Apply here →
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHY */}
        <div className="lp-why-wrap" id="why">
          <div className="lp-section">
            <div className="reveal lp-eyebrow">Why NeuroAssess</div>
            <h2 className="reveal lp-section-title">Built for the future<br/>of fair assessment</h2>
            <p className="reveal lp-section-sub">Every feature is purpose-built to eliminate cheating, reduce admin overhead, and give recruiters the clarity they need to make confident hiring decisions.</p>
            <div className="lp-why-grid">
              {whyCards.map(({ibg,ic,title,body},i)=>(
                <div key={title} className={`lp-why-card reveal reveal-d${i+1}`}>
                  <div className="lp-why-icon" style={{background:ibg}}>{ic}</div>
                  <h4>{title}</h4>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="lp-features-wrap" id="features">
          <div className="lp-features-inner">
            <div className="reveal lp-eyebrow">Platform Features</div>
            <h2 className="reveal lp-section-title">Everything you need,<br/>nothing you don't</h2>
            <p className="reveal lp-section-sub">Four integrated layers of exam security and insight — working together so you don't have to manage multiple disconnected tools.</p>

            <div className="reveal lp-feat-tabs">
              {featureTabs.map((tab,i)=>(
                <button key={i}
                  className={`lp-feat-tab${activeTab===i?" active":""}`}
                  onClick={()=>{setActiveTab(i);rowRefs.current[i]?.scrollIntoView({behavior:"smooth",block:"start"});}}>
                  <div className="tab-icon" style={{color:activeTab===i?"#fff":"#2BB1A8"}}>{tab.icon}</div>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lp-feat-rows">
              {featureRows.map((row,i)=>(
                <div key={i}
                  ref={el=>rowRefs.current[i]=el}
                  className={`lp-feat-row${row.rev?" rev":""} reveal reveal-d${(i%4)+1}`}>
                  <div className="lp-feat-mock">
                    <div className="lp-feat-mock-bar">
                      <span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                      <div className="lp-feat-mock-bar-url"/>
                      <span style={{fontSize:10.5,color:"var(--navy-30)",fontWeight:600}}>neuroassess.edu</span>
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
                          <div className="lp-feat-check-icon"><IconCheck size={10} color="#2BB1A8"/></div>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-logo">
            <div className="lp-footer-mark"><HexMark size={10}/></div>
            NeuroAssess
          </div>
          <p>© 2026 NeuroAssess — Secure Online Examination Platform</p>
        </footer>
      </div>
    </>
  );
}