/**
 * RestrictionAgent — Enhanced Exam Security Module
 *
 * Features:
 * - Alt+Tab blocking + window focus detection
 * - Windows/Command key blocking
 * - Tab switching prevention (Ctrl+Tab + visibility API)
 * - Right-click, Copy, Paste, Cut blocking
 * - Screen recording / screen-sharing detection
 * - Background app / window minimize detection
 * - Suspicious browser extension detection
 * - 4-attempt violation system with contextual messages
 */

class RestrictionAgent {
  constructor(options = {}) {
    this.maxAttempts     = options.maxAttempts     || 4;
    this.onViolation     = options.onViolation     || (() => {});
    this.onExamTerminated= options.onExamTerminated|| (() => {});
    this.isElectron      = typeof window !== 'undefined' && !!window.require;

    // State
    this.attempts         = this.maxAttempts;
    this.violations       = [];
    this.isActive         = false;
    this.startTime        = null;
    this.lastFocusLossTime= null;
    this.listeners        = {};

    // Electron IPC
    this.electronApi = null;
    if (this.isElectron) {
      try { this.electronApi = window.require('electron').ipcRenderer; }
      catch (e) { /* not in preload */ }
    }

    this._injectStyles();
  }

  // ─────────────────────────── PUBLIC API ────────────────────────────

  start() {
    if (this.isActive) { console.warn('RestrictionAgent already active'); return; }
    this.isActive  = true;
    this.startTime = Date.now();
    this.attempts  = this.maxAttempts;
    this.violations= [];

    this.blockKeyboardShortcuts();
    this.blockTabSwitching();
    this.blockClipboardOperations();
    this.blockRightClick();
    this.monitorWindowFocus();
    this.monitorScreenRecording();
    this.monitorBackgroundApps();
    this.detectSuspiciousExtensions();

    if (this.isElectron) this._requestFullScreen();
    console.log('✓ RestrictionAgent Started — 4 attempts allowed');
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    this._removeAllListeners();
    console.log('✓ RestrictionAgent Stopped');
  }

  getStatus() {
    return {
      isActive         : this.isActive,
      attemptsRemaining: this.attempts,
      totalViolations  : this.violations.length,
      sessionDuration  : this.startTime ? Date.now() - this.startTime : 0,
      violations       : this.violations,
    };
  }

  getViolationHistory() { return this.getStatus(); }

  // ─────────────────────────── KEYBOARD ──────────────────────────────

  blockKeyboardShortcuts() {
    this.listeners.keydown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const alt  = e.altKey;
      const shift= e.shiftKey;

      // Alt+Tab
      if (alt && e.code === 'Tab') {
        e.preventDefault();
        this.recordViolation('Alt+Tab attempted', 'ALT_TAB');
        return;
      }

      // Windows / Command key
      if (['MetaLeft','MetaRight'].includes(e.code) || e.key === 'Meta') {
        e.preventDefault();
        this.recordViolation('Windows/Command key attempted', 'WIN_KEY');
        return;
      }

      // Alt+F4, Alt+Escape
      if (alt && (e.code === 'F4' || e.code === 'Escape')) {
        e.preventDefault();
        this.recordViolation(`Alt+${e.key} attempted`, 'ALT_COMBO');
        return;
      }

      // Ctrl+Alt combos
      if (ctrl && alt) {
        e.preventDefault();
        this.recordViolation('Ctrl+Alt combo attempted', 'CTRL_ALT');
        return;
      }

      // Escape (fullscreen exit)
      if (e.key === 'Escape') {
        e.preventDefault();
        this.recordViolation('Escape key attempted', 'ESCAPE');
        return;
      }

      // F11 fullscreen toggle
      if (e.key === 'F11') {
        e.preventDefault();
        this.recordViolation('F11 (Fullscreen toggle) attempted', 'F11');
        return;
      }

      // F12 / DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        this.recordViolation('F12 (DevTools) attempted', 'DEVTOOLS');
        return;
      }

      // Ctrl+Shift+I DevTools
      if (ctrl && shift && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        this.recordViolation('Ctrl+Shift+I (DevTools) attempted', 'DEVTOOLS');
        return;
      }

      // Ctrl+Shift+J DevTools (Chrome)
      if (ctrl && shift && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        this.recordViolation('Ctrl+Shift+J (DevTools) attempted', 'DEVTOOLS');
        return;
      }

      // Ctrl+U (View Source)
      if (ctrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        this.recordViolation('Ctrl+U (View Source) attempted', 'VIEW_SOURCE');
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab (tab switch)
      if (ctrl && e.code === 'Tab') {
        e.preventDefault();
        this.recordViolation('Tab switch attempted (Ctrl+Tab)', 'TAB_SWITCH');
        return;
      }

      // Ctrl+W (close tab)
      if (ctrl && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        this.recordViolation('Ctrl+W (Close Tab) attempted', 'CLOSE_TAB');
        return;
      }
    };

    document.addEventListener('keydown', this.listeners.keydown, true);
  }

  // ─────────────────────────── TAB SWITCHING ─────────────────────────

  blockTabSwitching() {
    this.listeners.visibilitychange = () => {
      if (document.hidden) {
        this.lastFocusLossTime = Date.now();
        this.recordViolation('Tab switched away (window hidden)', 'TAB_SWITCH');
      }
    };
    document.addEventListener('visibilitychange', this.listeners.visibilitychange);
  }

  // ─────────────────────────── CLIPBOARD ─────────────────────────────

  blockClipboardOperations() {
    this.listeners.copy = (e) => { e.preventDefault(); this.recordViolation('Copy (Ctrl+C) attempted', 'COPY'); };
    this.listeners.paste= (e) => { e.preventDefault(); this.recordViolation('Paste (Ctrl+V) attempted', 'PASTE'); };
    this.listeners.cut  = (e) => { e.preventDefault(); this.recordViolation('Cut (Ctrl+X) attempted', 'CUT'); };

    document.addEventListener('copy',  this.listeners.copy,  true);
    document.addEventListener('paste', this.listeners.paste, true);
    document.addEventListener('cut',   this.listeners.cut,   true);

    // Keyboard-level backup
    this.listeners.clipboardKeydown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); this.recordViolation('Copy (Ctrl+C) attempted', 'COPY'); }
      else if (k === 'v') { e.preventDefault(); this.recordViolation('Paste (Ctrl+V) attempted', 'PASTE'); }
      else if (k === 'x') { e.preventDefault(); this.recordViolation('Cut (Ctrl+X) attempted', 'CUT'); }
      else if (k === 'a') { e.preventDefault(); /* silent block select-all */ }
    };
    document.addEventListener('keydown', this.listeners.clipboardKeydown, true);
  }

  // ─────────────────────────── RIGHT CLICK ───────────────────────────

  blockRightClick() {
    this.listeners.contextmenu = (e) => {
      e.preventDefault();
      this.recordViolation('Right-click attempted', 'RIGHT_CLICK');
    };
    document.addEventListener('contextmenu', this.listeners.contextmenu, true);
  }

  // ─────────────────────────── WINDOW FOCUS ──────────────────────────

  monitorWindowFocus() {
    this.listeners.blur = () => {
      if (!this.isActive) return;
      this.lastFocusLossTime = Date.now();
      this.recordViolation('Exam window lost focus', 'FOCUS_LOSS');
    };
    this.listeners.focus = () => {
      if (this.lastFocusLossTime) {
        const dur = Date.now() - this.lastFocusLossTime;
        console.log(`Window focus regained after ${dur}ms`);
        this.lastFocusLossTime = null;
      }
    };
    window.addEventListener('blur',  this.listeners.blur);
    window.addEventListener('focus', this.listeners.focus);
  }

  // ─────────────────────────── SCREEN RECORDING ──────────────────────

  monitorScreenRecording() {
    // Block getDisplayMedia (screen capture / sharing)
    if (navigator.mediaDevices?.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async () => {
        this.recordViolation('Screen recording/sharing attempt detected', 'SCREEN_RECORD');
        throw new DOMException('Screen recording is disabled during exams.', 'NotAllowedError');
      };
    }

    // Block getUserMedia for video (capture from camera / virtual displays)
    if (navigator.mediaDevices?.getUserMedia) {
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints?.video) {
          this.recordViolation('Video capture access attempted', 'VIDEO_CAPTURE');
          throw new DOMException('Video access is disabled during exams.', 'NotAllowedError');
        }
        return orig(constraints);
      };
    }

    // Canvas fingerprinting / screenshot heuristic
    this._monitorCanvasAbuse();

    // MediaStream track monitoring (external injected streams)
    this._monitorMediaStreams();
  }

  _monitorCanvasAbuse() {
    const self = this;
    let count  = 0;
    const THRESHOLD = 25;

    const origToDataURL   = HTMLCanvasElement.prototype.toDataURL;
    const origGetImageData= CanvasRenderingContext2D.prototype.getImageData;

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      if (++count > THRESHOLD) { self.recordViolation('Suspicious canvas screenshot activity detected', 'CANVAS_ABUSE'); count = 0; }
      return origToDataURL.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      if (++count > THRESHOLD) { self.recordViolation('Suspicious canvas getImageData activity detected', 'CANVAS_ABUSE'); count = 0; }
      return origGetImageData.apply(this, args);
    };
  }

  _monitorMediaStreams() {
    // Poll for active media tracks (injected by extensions or screen-share tools)
    this._mediaStreamPoller = setInterval(() => {
      if (!this.isActive) return;
      navigator.mediaDevices?.enumerateDevices?.().then(devices => {
        const hasDisplayCapture = devices.some(d => d.label?.toLowerCase().includes('screen') || d.label?.toLowerCase().includes('display'));
        if (hasDisplayCapture) {
          this.recordViolation('Screen capture device detected in media devices', 'SCREEN_DEVICE');
        }
      }).catch(() => {});
    }, 10000);
  }

  // ─────────────────────────── BACKGROUND APPS ───────────────────────

  monitorBackgroundApps() {
    // Mouse leaving browser chrome area
    this.listeners.mouseout = (e) => {
      if (!e.relatedTarget && (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        this.recordViolation('Mouse exited exam window', 'MOUSE_EXIT');
      }
    };
    document.addEventListener('mouseout', this.listeners.mouseout);

    // Page hide (navigate away, mobile background)
    this.listeners.pagehide = () => { this.recordViolation('Page hidden/navigated away', 'PAGE_HIDE'); };
    window.addEventListener('pagehide', this.listeners.pagehide);

    // Electron: window minimize
    if (this.isElectron && this.electronApi) {
      this.electronApi.on('window-minimized', () => this.recordViolation('Exam window minimized', 'WIN_MINIMIZE'));
      this.electronApi.on('window-blur',      () => this.recordViolation('Exam window lost focus (Electron)', 'WIN_BLUR'));
    }

    // Fullscreen exit detection
    this.listeners.fullscreenchange = () => {
      if (!document.fullscreenElement && this.isActive) {
        this.recordViolation('Fullscreen mode exited', 'FULLSCREEN_EXIT');
      }
    };
    document.addEventListener('fullscreenchange',       this.listeners.fullscreenchange);
    document.addEventListener('webkitfullscreenchange', this.listeners.fullscreenchange);
  }

  // ─────────────────────────── EXTENSION DETECTION ───────────────────

  detectSuspiciousExtensions() {
    // Strategy 1: DOM mutation — extensions often inject elements
    this._extensionMutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Skip our own injected nodes
          if (node.id?.startsWith('ra-') || node.id?.startsWith('restriction-')) continue;

          const tag = node.tagName?.toLowerCase();
          const src = node.src || node.href || '';

          // Extension-injected script/link/iframe
          if (['script','link','iframe'].includes(tag) && src.startsWith('chrome-extension://')) {
            this._warnExtension(`Extension injected a <${tag}> element`, node);
          }

          // Known AI/helper extension signatures (Sider, Merlin, etc.)
          const text = (node.className || '') + (node.id || '') + (node.getAttribute?.('data-extension-id') || '');
          if (/sider|merlin|chatgpt|gpt|copilot|grammarly|honey|rakuten/i.test(text)) {
            this._warnExtension(`Possible helper extension element detected: "${text.slice(0,60)}"`, node);
          }
        }
      }
    });

    this._extensionMutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // Strategy 2: Check window object for well-known extension globals
    this._extensionGlobalPoller = setInterval(() => {
      if (!this.isActive) return;
      const knownGlobals = [
        ['__SIDER__',           'Sider AI'],
        ['__merlinExtension',   'Merlin AI'],
        ['__chatgptHelper',     'ChatGPT Helper'],
        ['grammarlyIsReady',    'Grammarly'],
        ['_grammarly',          'Grammarly'],
        ['honeyBeeBackground',  'Honey'],
        ['__REACT_DEVTOOLS_GLOBAL_HOOK__', 'React DevTools'],
      ];
      for (const [global, name] of knownGlobals) {
        if (window[global] !== undefined) {
          this._warnExtension(`${name} extension detected (window.${global})`);
        }
      }
    }, 5000);

    // Strategy 3: Probe for extension-specific resources (passive, no violation)
    this._probeKnownExtensions();
  }

  _probeKnownExtensions() {
    // Known extension resource probes — if they load, the extension is active.
    // We use image probing (silent). Map: extensionId → friendly name.
    const probes = [
      // Sider
      { id: 'difoiogjjojoaoomphldepapgpbgkhkb', name: 'Sider AI' },
      // Merlin
      { id: 'camppjleccjaphfdbohjdohecfnoikec', name: 'Merlin AI' },
      // Grammarly
      { id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly' },
    ];

    for (const { id, name } of probes) {
      const img = new Image();
      img.onload = () => {
        // Resource loaded → extension is installed & enabled
        this._warnExtension(`${name} browser extension is active`);
      };
      // Probe an icon that every extension must have
      img.src = `chrome-extension://${id}/icons/icon16.png`;
    }
  }

  _warnExtension(detail, node) {
    console.warn(`[RestrictionAgent] Extension Warning: ${detail}`);
    // Show persistent banner (not a violation deduction — just a warning)
    this._showExtensionWarning(detail);

    // Log but don't count as exam violation unless it's clearly active assistance
    const violation = {
      timestamp        : new Date().toISOString(),
      reason           : `EXTENSION: ${detail}`,
      type             : 'EXTENSION',
      attemptsRemaining: this.attempts,
    };
    this.violations.push(violation);
    this.onViolation(violation);
  }

  // ─────────────────────────── VIOLATION SYSTEM ──────────────────────

  recordViolation(reason, type = 'GENERAL') {
    if (!this.isActive) return;

    // Debounce: skip duplicate violations within 800ms
    const now = Date.now();
    const lastSame = this.violations.findLast?.(v => v.type === type)?.ts || 0;
    if (now - lastSame < 800) return;

    this.attempts--;

    const violation = {
      timestamp        : new Date().toISOString(),
      ts               : now,
      reason,
      type,
      attemptsRemaining: this.attempts,
    };
    this.violations.push(violation);
    console.warn(`⚠ Violation [${type}]: ${reason} | Attempts left: ${this.attempts}`);
    this.onViolation(violation);

    this._handleViolation(reason, type);
  }

  _handleViolation(reason, type) {
    const used = this.maxAttempts - this.attempts; // 1, 2, 3, 4

    if (used === 1) {
      // 1st violation: contextual message, 3 remaining
      const action = this._humanReadableAction(type);
      this._showWarning(
        `⚠ ${action} detected — <strong>3 attempts remaining.</strong> Continued violations will terminate your exam.`,
        'warning',
        7000
      );
    } else if (used === 2) {
      this._showWarning(
        `⚠ Warning: <strong>2 attempts remaining.</strong> Please stay on this page.`,
        'danger',
        7000
      );
    } else if (used === 3) {
      this._showWarning(
        `🚨 Final Warning: <strong>1 attempt remaining.</strong> Next violation will terminate your exam!`,
        'critical',
        9000
      );
    } else if (this.attempts <= 0) {
      this._terminateExam('Maximum violations exceeded. Exam terminated.');
    }
  }

  _humanReadableAction(type) {
    const map = {
      ALT_TAB        : 'Alt+Tab / window switch',
      WIN_KEY        : 'Windows/Command key press',
      TAB_SWITCH     : 'Tab switch',
      COPY           : 'Copy attempt',
      PASTE          : 'Paste attempt',
      CUT            : 'Cut attempt',
      RIGHT_CLICK    : 'Right-click',
      FOCUS_LOSS     : 'Focus loss / window switch',
      SCREEN_RECORD  : 'Screen recording/sharing attempt',
      VIDEO_CAPTURE  : 'Video capture attempt',
      CANVAS_ABUSE   : 'Suspicious screenshot activity',
      MOUSE_EXIT     : 'Mouse exit from exam window',
      PAGE_HIDE      : 'Navigation away from exam',
      FULLSCREEN_EXIT: 'Fullscreen exit',
      DEVTOOLS       : 'Developer Tools access attempt',
      WIN_MINIMIZE   : 'Window minimized',
    };
    return map[type] || 'Rule violation';
  }

  // ─────────────────────────── TERMINATE ─────────────────────────────

  _terminateExam(message) {
    this.isActive = false;
    this._removeAllListeners();
    if (this._mediaStreamPoller) clearInterval(this._mediaStreamPoller);
    if (this._extensionGlobalPoller) clearInterval(this._extensionGlobalPoller);
    if (this._extensionMutationObserver) this._extensionMutationObserver.disconnect();

    document.dispatchEvent(new CustomEvent('examTerminated', {
      detail: { reason: message, violations: this.violations, timestamp: new Date().toISOString() }
    }));

    this.onExamTerminated({ reason: message, violations: this.violations, totalViolations: this.violations.length });

    this._showTerminationModal(message);
    this._disableExamInterface();
    console.error('🛑 EXAM TERMINATED:', message);
  }

  // ─────────────────────────── UI ────────────────────────────────────

  _showWarning(htmlMessage, level = 'warning', duration = 6000) {
    // Remove existing warning
    document.getElementById('ra-warning')?.remove();

    const el = document.createElement('div');
    el.id = 'ra-warning';

    const styles = {
      warning : { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️', color: '#92400e' },
      danger  : { bg: '#fff1f2', border: '#f43f5e', icon: '🚨', color: '#9f1239' },
      critical: { bg: '#1a0000', border: '#ef4444', icon: '🛑', color: '#fca5a5' },
    };
    const s = styles[level] || styles.warning;

    el.style.cssText = `
      position:fixed; top:24px; right:24px; z-index:2147483647;
      background:${s.bg}; border-left:5px solid ${s.border};
      border-radius:10px; padding:16px 20px 16px 16px;
      max-width:420px; width:calc(100vw - 48px);
      display:flex; align-items:flex-start; gap:12px;
      box-shadow:0 8px 30px rgba(0,0,0,0.18);
      animation:ra-slideIn .3s cubic-bezier(.16,1,.3,1);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;

    // Attempt pips
    const pips = Array.from({ length: this.maxAttempts }, (_, i) => {
      const active = i < this.attempts;
      return `<span style="
        display:inline-block; width:10px; height:10px; border-radius:50%;
        background:${active ? s.border : '#d1d5db'}; margin:0 2px;
        transition:background .3s;
      "></span>`;
    }).join('');

    el.innerHTML = `
      <span style="font-size:22px;flex-shrink:0;margin-top:1px">${s.icon}</span>
      <div style="flex:1">
        <div style="color:${s.color};font-size:14px;font-weight:600;line-height:1.5">${htmlMessage}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:${s.color};opacity:.7">Attempts:</span>
          ${pips}
        </div>
      </div>
      <button onclick="this.parentElement.remove()" style="
        background:none;border:none;color:${s.color};opacity:.6;cursor:pointer;
        font-size:18px;line-height:1;padding:0;flex-shrink:0;margin-top:1px;
      ">×</button>
    `;

    document.body.appendChild(el);

    if (duration > 0) {
      setTimeout(() => {
        el.style.animation = 'ra-slideOut .25s ease-in forwards';
        setTimeout(() => el.remove(), 260);
      }, duration);
    }
  }

  _showExtensionWarning(detail) {
    let banner = document.getElementById('ra-ext-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ra-ext-banner';
      banner.style.cssText = `
        position:fixed; top:0; left:0; right:0; z-index:2147483646;
        background:linear-gradient(90deg,#1e1b4b,#312e81);
        color:#c7d2fe; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        font-size:13px; font-weight:500; padding:10px 20px;
        display:flex; align-items:center; gap:10px;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      `;
      banner.innerHTML = `
        <span style="font-size:16px">🔌</span>
        <span id="ra-ext-msg"></span>
        <span style="margin-left:auto;opacity:.6;font-size:11px">Disable browser extensions before exams</span>
      `;
      document.body.appendChild(banner);
    }
    document.getElementById('ra-ext-msg').textContent = `Extension detected: ${detail}`;
  }

  _showTerminationModal(message) {
    document.getElementById('ra-termination-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'ra-termination-modal';
    modal.style.cssText = `
      position:fixed; inset:0; z-index:2147483647;
      background:rgba(0,0,0,.75); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      animation:ra-fadeIn .4s ease;
    `;

    const violationRows = this.violations.slice(-6).map(v => `
      <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #1f2937">
        <span style="color:#6b7280;font-size:11px;flex-shrink:0">${new Date(v.timestamp).toLocaleTimeString()}</span>
        <span style="color:#d1d5db;font-size:12px">${v.reason}</span>
      </div>
    `).join('');

    modal.innerHTML = `
      <div style="
        background:#111827; border:1px solid #374151; border-radius:16px;
        padding:40px 36px; max-width:520px; width:calc(100vw - 40px);
        text-align:center; box-shadow:0 25px 60px rgba(0,0,0,.6);
        animation:ra-scaleIn .35s cubic-bezier(.16,1,.3,1);
      ">
        <div style="font-size:56px;margin-bottom:16px">🛑</div>
        <h2 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ef4444;letter-spacing:-.5px">
          Exam Terminated
        </h2>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6">${message}</p>

        <div style="background:#0f172a;border-radius:8px;padding:12px 16px;margin-bottom:24px;text-align:left;max-height:200px;overflow:auto">
          <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:.05em;margin-bottom:8px">VIOLATION LOG</div>
          ${violationRows || '<div style="color:#6b7280;font-size:12px">No violations recorded.</div>'}
        </div>

        <button onclick="location.reload()" style="
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 28px; background:#3b82f6; color:white;
          border:none; border-radius:8px; font-size:14px; font-weight:600;
          cursor:pointer; transition:background .2s;
        " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
          Return to Dashboard
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  _disableExamInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'ra-disabled-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:2147483640;pointer-events:auto;`;
    document.body.appendChild(overlay);

    document.querySelectorAll('input,textarea,button,select').forEach(el => {
      el.disabled = true;
      el.style.opacity = '.4';
      el.style.pointerEvents = 'none';
    });
  }

  // ─────────────────────────── HELPERS ───────────────────────────────

  _requestFullScreen() {
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch (e) {}
  }

  _removeAllListeners() {
    const doc = document, win = window;
    const rm = (target, evt, key, capture = false) => {
      if (this.listeners[key]) target.removeEventListener(evt, this.listeners[key], capture);
    };
    rm(doc, 'keydown',          'keydown',          true);
    rm(doc, 'visibilitychange', 'visibilitychange');
    rm(doc, 'copy',             'copy',             true);
    rm(doc, 'paste',            'paste',            true);
    rm(doc, 'cut',              'cut',              true);
    rm(doc, 'keydown',          'clipboardKeydown', true);
    rm(doc, 'contextmenu',      'contextmenu',      true);
    rm(win, 'blur',             'blur');
    rm(win, 'focus',            'focus');
    rm(doc, 'mouseout',         'mouseout');
    rm(win, 'pagehide',         'pagehide');
    rm(doc, 'fullscreenchange', 'fullscreenchange');
    rm(doc, 'webkitfullscreenchange', 'fullscreenchange');

    if (this._mediaStreamPoller)      clearInterval(this._mediaStreamPoller);
    if (this._extensionGlobalPoller)  clearInterval(this._extensionGlobalPoller);
    if (this._extensionMutationObserver) this._extensionMutationObserver.disconnect();
  }

  _injectStyles() {
    if (document.getElementById('ra-styles')) return;
    const s = document.createElement('style');
    s.id = 'ra-styles';
    s.textContent = `
      @keyframes ra-slideIn {
        from { transform:translateX(120%); opacity:0; }
        to   { transform:translateX(0);   opacity:1; }
      }
      @keyframes ra-slideOut {
        from { transform:translateX(0);   opacity:1; }
        to   { transform:translateX(120%); opacity:0; }
      }
      @keyframes ra-fadeIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      @keyframes ra-scaleIn {
        from { transform:scale(.92); opacity:0; }
        to   { transform:scale(1);   opacity:1; }
      }
    `;
    document.head.appendChild(s);
  }
}

export default RestrictionAgent;