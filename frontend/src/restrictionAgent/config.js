/**
 * Restriction Agent Configuration
 * Customize settings for your exam environment
 */

export const RESTRICTION_CONFIG = {
  // Maximum allowed violations before exam termination
  MAX_ATTEMPTS: 3,

  // Violation messages
  MESSAGES: {
    FIRST_VIOLATION: 'Warning: Rule violation detected. 2 attempts remaining.',
    SECOND_VIOLATION: 'Warning: Rule violation detected. 1 attempt remaining.',
    THIRD_VIOLATION_TITLE: 'Exam Terminated',
    THIRD_VIOLATION_MESSAGE: 'Exam terminated. Maximum rule violations exceeded.',
    CUSTOM_BLOCKED_MESSAGE: 'This action is disabled during exams.',
  },

  // UI Configuration
  UI: {
    // Warning notification position
    WARNING_POSITION: {
      top: '20px',
      right: '20px',
    },

    // Warning display duration (ms)
    WARNING_DISPLAY_TIME: 5000,

    // Z-index for modals and notifications
    Z_INDEX: {
      NOTIFICATION: 9999,
      MODAL: 10000,
      OVERLAY: 10001,
    },

    // Colors
    COLORS: {
      WARNING_BG: '#fef3c7',
      WARNING_BORDER: '#fcd34d',
      WARNING_TEXT: '#d97706',

      DANGER_BG: '#fee2e2',
      DANGER_BORDER: '#fecaca',
      DANGER_TEXT: '#dc2626',

      DARK_OVERLAY: 'rgba(0, 0, 0, 0.3)',
    },
  },

  // Features to enable/disable
  FEATURES: {
    BLOCK_KEYBOARD_SHORTCUTS: true,
    BLOCK_TAB_SWITCHING: true,
    BLOCK_CLIPBOARD: true,
    BLOCK_RIGHT_CLICK: true,
    MONITOR_SCREEN_RECORDING: true,
    MONITOR_BACKGROUND_APPS: true,
    MONITOR_WINDOW_FOCUS: true,
    REQUEST_FULLSCREEN: false, // Set to true for Electron apps
    SHOW_VIOLATION_LOG: true, // Allow users to see their violations
  },

  // Restricted key codes
  RESTRICTED_KEYS: {
    TAB: 'Tab',
    ESCAPE: 'Escape',
    F11: 'F11',
    F12: 'F12',
    ENTER: 'Enter',
  },

  // Restricted key combinations
  RESTRICTED_COMBINATIONS: [
    { ctrlKey: true, altKey: true }, // Ctrl+Alt
    { altKey: true }, // Alt (for Alt+Tab, Alt+F4, etc.)
  ],

  // Canvas monitoring threshold
  CANVAS_CALL_THRESHOLD: 20, // Flag as suspicious after 20 calls

  // Mouse threshold for detecting window focus loss
  MOUSE_BOUNDARY_SENSITIVITY: 0, // Pixel distance from edge

  // Logging configuration
  LOGGING: {
    VERBOSE: false, // Set to true for detailed console logs
    LOG_TO_BACKEND: true, // Send logs to backend
    LOG_ENDPOINT: '/api/exam/logs', // Backend endpoint for logs
  },

  // Electron specific settings
  ELECTRON: {
    FORCE_FULLSCREEN: true,
    HIDE_MENU_BAR: true,
    DISABLE_DEVTOOLS: true,
    BLOCK_EXTERNAL_LINKS: true,
  },
};

/**
 * Violation type constants
 */
export const VIOLATION_TYPES = {
  KEYBOARD_SHORTCUT: 'keyboard_shortcut',
  TAB_SWITCH: 'tab_switch',
  WINDOW_BLUR: 'window_blur',
  COPY_ATTEMPT: 'copy_attempt',
  PASTE_ATTEMPT: 'paste_attempt',
  CUT_ATTEMPT: 'cut_attempt',
  RIGHT_CLICK: 'right_click',
  SCREEN_RECORD: 'screen_record',
  SCREEN_SHARE: 'screen_share',
  WINDOW_MINIMIZE: 'window_minimize',
  DEVTOOLS_OPEN: 'devtools_open',
  EXTENSION_ACTIVITY: 'extension_activity',
};

/**
 * Restriction statuses
 */
export const STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  TERMINATED: 'terminated',
};

/**
 * Error codes for backend communication
 */
export const ERROR_CODES = {
  VIOLATION_LIMIT_EXCEEDED: 'ERR_VIOLATION_LIMIT_EXCEEDED',
  RESTRICTION_BYPASS_DETECTED: 'ERR_RESTRICTION_BYPASS',
  UNAUTHORIZED_ACTIVITY: 'ERR_UNAUTHORIZED_ACTIVITY',
  SESSION_ENDED: 'ERR_SESSION_ENDED',
};

/**
 * Default callbacks (can be overridden during initialization)
 */
export const DEFAULT_CALLBACKS = {
  onViolation: (violation) => {
    console.warn('Violation detected:', violation);
  },
  onExamTerminated: (data) => {
    console.error('Exam terminated:', data);
  },
  onWarning: (message) => {
    console.warn(message);
  },
};

/**
 * Allowed keyboard events that won't trigger restrictions
 * (e.g., typing in exam answers)
 */
export const SAFE_KEYBOARD_EVENTS = {
  ALPHANUMERIC: true, // a-z, 0-9
  SPECIAL_CHARS: true, // !@#$%^&*()_+-=[]{}|;':",./<>?
  NAVIGATION: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'],
  EDITING: ['Backspace', 'Delete', 'Enter'],
};

/**
 * Suspicious activities thresholds
 */
export const THRESHOLDS = {
  // Number of Tab switches before flagging
  TAB_SWITCH_LIMIT: 5,

  // Number of focus losses before flagging
  FOCUS_LOSS_LIMIT: 5,

  // Canvas operation limit before flagging
  CANVAS_OPERATION_LIMIT: 20,

  // Time window for tracking violations (ms)
  VIOLATION_WINDOW: 60000, // 1 minute

  // Maximum violations allowed in time window
  VIOLATIONS_PER_WINDOW: 3,
};

/**
 * Get violation message based on attempt number
 */
export function getViolationMessage(attemptsRemaining) {
  switch (attemptsRemaining) {
    case 2:
      return RESTRICTION_CONFIG.MESSAGES.FIRST_VIOLATION;
    case 1:
      return RESTRICTION_CONFIG.MESSAGES.SECOND_VIOLATION;
    case 0:
      return RESTRICTION_CONFIG.MESSAGES.THIRD_VIOLATION_MESSAGE;
    default:
      return 'Violation detected';
  }
}

/**
 * Log to backend if enabled
 */
export async function logToBackend(endpoint, data) {
  if (!RESTRICTION_CONFIG.LOGGING.LOG_TO_BACKEND) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });
  } catch (error) {
    console.error('Failed to log to backend:', error);
  }
}

export default RESTRICTION_CONFIG;
