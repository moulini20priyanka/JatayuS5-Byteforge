/**
 * RestrictionAgent - Core exam proctoring class
 * Monitors for violations and enforces exam integrity
 */

import { RESTRICTION_CONFIG, VIOLATION_TYPES, STATUS, getViolationMessage, logToBackend } from './config';

class RestrictionAgent {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || RESTRICTION_CONFIG.MAX_ATTEMPTS;
    this.attemptsRemaining = this.maxAttempts;
    this.status = STATUS.STOPPED;
    this.violations = [];
    this.sessionStart = null;

    // Callbacks
    this.onViolation = options.onViolation || ((v) => console.warn('Violation:', v));
    this.onExamTerminated = options.onExamTerminated || ((d) => console.error('Terminated:', d));
    this.onWarning = options.onWarning || ((m) => console.warn(m));

    // Bound event handlers (stored so we can remove them)
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleWindowBlur = this._handleWindowBlur.bind(this);
    this._handleCopy = this._handleCopy.bind(this);
    this._handlePaste = this._handlePaste.bind(this);
    this._handleCut = this._handleCut.bind(this);
    this._handleContextMenu = this._handleContextMenu.bind(this);

    // Notification element
    this._notifEl = null;
    this._modalEl = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  start() {
    if (this.status === STATUS.ACTIVE) return;
    this.status = STATUS.ACTIVE;
    this.sessionStart = Date.now();
    this.attemptsRemaining = this.maxAttempts;
    this.violations = [];
    this._attachListeners();
    if (RESTRICTION_CONFIG.FEATURES.REQUEST_FULLSCREEN) {
      this._requestFullscreen();
    }
    if (RESTRICTION_CONFIG.LOGGING.VERBOSE) {
      console.log('[RestrictionAgent] Started');
    }
  }

  stop() {
    if (this.status === STATUS.STOPPED) return;
    this.status = STATUS.STOPPED;
    this._detachListeners();
    this._removeNotification();
    if (RESTRICTION_CONFIG.LOGGING.VERBOSE) {
      console.log('[RestrictionAgent] Stopped');
    }
  }

  pause() {
    this.status = STATUS.PAUSED;
    this._detachListeners();
  }

  resume() {
    if (this.status !== STATUS.PAUSED) return;
    this.status = STATUS.ACTIVE;
    this._attachListeners();
  }

  getStatus() {
    return {
      status: this.status,
      attemptsRemaining: this.attemptsRemaining,
      totalViolations: this.violations.length,
      sessionDuration: this.sessionStart ? Date.now() - this.sessionStart : 0,
      violations: [...this.violations],
    };
  }

  getViolationHistory() {
    return [...this.violations];
  }

  // ─── Event Listeners ───────────────────────────────────────────────────────

  _attachListeners() {
    if (RESTRICTION_CONFIG.FEATURES.BLOCK_KEYBOARD_SHORTCUTS) {
      document.addEventListener('keydown', this._handleKeyDown, true);
    }
    if (RESTRICTION_CONFIG.FEATURES.BLOCK_TAB_SWITCHING) {
      document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }
    if (RESTRICTION_CONFIG.FEATURES.MONITOR_WINDOW_FOCUS) {
      window.addEventListener('blur', this._handleWindowBlur);
    }
    if (RESTRICTION_CONFIG.FEATURES.BLOCK_CLIPBOARD) {
      document.addEventListener('copy', this._handleCopy, true);
      document.addEventListener('paste', this._handlePaste, true);
      document.addEventListener('cut', this._handleCut, true);
    }
    if (RESTRICTION_CONFIG.FEATURES.BLOCK_RIGHT_CLICK) {
      document.addEventListener('contextmenu', this._handleContextMenu, true);
    }
  }

  _detachListeners() {
    document.removeEventListener('keydown', this._handleKeyDown, true);
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    window.removeEventListener('blur', this._handleWindowBlur);
    document.removeEventListener('copy', this._handleCopy, true);
    document.removeEventListener('paste', this._handlePaste, true);
    document.removeEventListener('cut', this._handleCut, true);
    document.removeEventListener('contextmenu', this._handleContextMenu, true);
  }

  // ─── Event Handlers ────────────────────────────────────────────────────────

  _handleKeyDown(e) {
    if (this.status !== STATUS.ACTIVE) return;

    const { key, ctrlKey, altKey, metaKey, shiftKey } = e;

    // Block restricted key combinations
    for (const combo of RESTRICTION_CONFIG.RESTRICTED_COMBINATIONS) {
      const matches = Object.entries(combo).every(([mod, val]) => {
        if (mod === 'ctrlKey') return ctrlKey === val;
        if (mod === 'altKey') return altKey === val;
        if (mod === 'metaKey') return metaKey === val;
        if (mod === 'shiftKey') return shiftKey === val;
        return true;
      });
      if (matches && key !== 'Control' && key !== 'Alt' && key !== 'Meta' && key !== 'Shift') {
        e.preventDefault();
        e.stopPropagation();
        this._recordViolation(VIOLATION_TYPES.KEYBOARD_SHORTCUT, { key, ctrlKey, altKey, metaKey });
        return;
      }
    }

    // Block specific restricted keys (F11, F12, Escape when not in input)
    const restricted = [
      RESTRICTION_CONFIG.RESTRICTED_KEYS.F11,
      RESTRICTION_CONFIG.RESTRICTED_KEYS.F12,
    ];
    if (restricted.includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      this._recordViolation(VIOLATION_TYPES.KEYBOARD_SHORTCUT, { key });
      return;
    }

    // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+U, Ctrl+P
    if (ctrlKey || metaKey) {
      const blocked = ['c', 'v', 'x', 'a', 's', 'u', 'p', 'r', 'f', 'g', 'h', 'j', 'k', 'l', 'n', 'o', 't', 'w'];
      if (blocked.includes(key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        this._recordViolation(VIOLATION_TYPES.KEYBOARD_SHORTCUT, { key, ctrlKey, metaKey });
        return;
      }
    }

    // Block Tab key
    if (key === RESTRICTION_CONFIG.RESTRICTED_KEYS.TAB) {
      e.preventDefault();
      e.stopPropagation();
      this._recordViolation(VIOLATION_TYPES.TAB_SWITCH, { key });
    }
  }

  _handleVisibilityChange() {
    if (this.status !== STATUS.ACTIVE) return;
    if (document.hidden) {
      this._recordViolation(VIOLATION_TYPES.TAB_SWITCH, { hidden: true });
    }
  }

  _handleWindowBlur() {
    if (this.status !== STATUS.ACTIVE) return;
    this._recordViolation(VIOLATION_TYPES.WINDOW_BLUR, {});
  }

  _handleCopy(e) {
    if (this.status !== STATUS.ACTIVE) return;
    e.preventDefault();
    e.stopPropagation();
    this._recordViolation(VIOLATION_TYPES.COPY_ATTEMPT, {});
  }

  _handlePaste(e) {
    if (this.status !== STATUS.ACTIVE) return;
    e.preventDefault();
    e.stopPropagation();
    this._recordViolation(VIOLATION_TYPES.PASTE_ATTEMPT, {});
  }

  _handleCut(e) {
    if (this.status !== STATUS.ACTIVE) return;
    e.preventDefault();
    e.stopPropagation();
    this._recordViolation(VIOLATION_TYPES.CUT_ATTEMPT, {});
  }

  _handleContextMenu(e) {
    if (this.status !== STATUS.ACTIVE) return;
    e.preventDefault();
    e.stopPropagation();
    this._recordViolation(VIOLATION_TYPES.RIGHT_CLICK, {});
  }

  // ─── Violation Handling ────────────────────────────────────────────────────

  _recordViolation(type, details = {}) {
    if (this.status !== STATUS.ACTIVE) return;

    this.attemptsRemaining = Math.max(0, this.attemptsRemaining - 1);

    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      attemptRemaining: this.attemptsRemaining,
      violationNumber: this.violations.length + 1,
    };

    this.violations.push(violation);

    if (RESTRICTION_CONFIG.LOGGING.VERBOSE) {
      console.warn('[RestrictionAgent] Violation:', violation);
    }

    // Log to backend
    if (RESTRICTION_CONFIG.LOGGING.LOG_TO_BACKEND) {
      logToBackend(RESTRICTION_CONFIG.LOGGING.LOG_ENDPOINT, violation).catch(() => {});
    }

    // Show UI notification
    this._showNotification(violation);

    // Notify callback
    this.onViolation(violation);

    // Check termination
    if (this.attemptsRemaining <= 0) {
      this._terminate();
    }
  }

  _terminate() {
    this.status = STATUS.TERMINATED;
    this._detachListeners();
    this._removeNotification();
    this._showTerminationModal();

    const data = {
      reason: 'max_violations_exceeded',
      violations: this.violations,
      sessionDuration: this.sessionStart ? Date.now() - this.sessionStart : 0,
      terminatedAt: new Date().toISOString(),
    };

    this.onExamTerminated(data);
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  _showNotification(violation) {
    this._removeNotification();

    const msg = getViolationMessage(violation.attemptRemaining);
    const isDanger = violation.attemptRemaining <= 1;

    const el = document.createElement('div');
    el.id = 'restriction-agent-notification';
    el.style.cssText = `
      position: fixed;
      top: ${RESTRICTION_CONFIG.UI.WARNING_POSITION.top};
      right: ${RESTRICTION_CONFIG.UI.WARNING_POSITION.right};
      z-index: ${RESTRICTION_CONFIG.UI.Z_INDEX.NOTIFICATION};
      background: ${isDanger ? RESTRICTION_CONFIG.UI.COLORS.DANGER_BG : RESTRICTION_CONFIG.UI.COLORS.WARNING_BG};
      border: 1.5px solid ${isDanger ? RESTRICTION_CONFIG.UI.COLORS.DANGER_BORDER : RESTRICTION_CONFIG.UI.COLORS.WARNING_BORDER};
      border-radius: 10px;
      padding: 14px 18px;
      max-width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      font-family: 'Inter', 'Segoe UI', sans-serif;
      animation: raSlideIn 0.3s cubic-bezier(0.22,1,0.36,1);
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes raSlideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: none; }
      }
    `;
    document.head.appendChild(style);

    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;">${isDanger ? '🚫' : '⚠️'}</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:${isDanger ? RESTRICTION_CONFIG.UI.COLORS.DANGER_TEXT : RESTRICTION_CONFIG.UI.COLORS.WARNING_TEXT};margin-bottom:4px;">
            ${isDanger ? 'Final Warning' : 'Rule Violation Detected'}
          </div>
          <div style="font-size:12px;color:${isDanger ? '#991b1b' : '#92400e'};line-height:1.5;">
            ${msg}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._notifEl = el;

    setTimeout(() => this._removeNotification(), RESTRICTION_CONFIG.UI.WARNING_DISPLAY_TIME);
  }

  _removeNotification() {
    if (this._notifEl && this._notifEl.parentNode) {
      this._notifEl.parentNode.removeChild(this._notifEl);
    }
    this._notifEl = null;
  }

  _showTerminationModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: ${RESTRICTION_CONFIG.UI.Z_INDEX.OVERLAY};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    `;

    overlay.innerHTML = `
      <div style="
        background: #fff;
        border-radius: 16px;
        padding: 40px 36px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="font-size:48px;margin-bottom:16px;">🚫</div>
        <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:10px;">
          ${RESTRICTION_CONFIG.MESSAGES.THIRD_VIOLATION_TITLE}
        </h2>
        <p style="font-size:14px;color:#64748b;line-height:1.65;margin-bottom:8px;">
          ${RESTRICTION_CONFIG.MESSAGES.THIRD_VIOLATION_MESSAGE}
        </p>
        <p style="font-size:12px;color:#94a3b8;font-family:'SF Mono','Courier New',monospace;">
          Your responses have been automatically submitted.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);
    this._modalEl = overlay;
  }

  _requestFullscreen() {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    } catch (err) {
      console.warn('[RestrictionAgent] Fullscreen request failed:', err);
    }
  }
}

export default RestrictionAgent;