# Restriction Agent Documentation

## Overview

The **Restriction Agent** is a comprehensive JavaScript module designed to monitor and enforce examination security restrictions in a Secure Online Examination System. It runs in the browser and can optionally integrate with Electron for desktop app features.

## Features

### 🔒 Keyboard Shortcuts Blocking
- **Alt + Tab** - Prevent task switching
- **Windows/Command Key** - Prevent Windows menu access
- **Alt + F4** - Prevent forced window closure
- **Alt + Escape** - Prevent window switching
- **Escape Key** - Prevent fullscreen exit
- **F11** - Prevent browser fullscreen toggle
- **F12** - Prevent Developer Tools
- **Ctrl+Shift+I** - Prevent alternate DevTools shortcut
- **Ctrl+Alt Combos** - Prevent OS-level app switching

### 📋 Tab Switching Prevention
- **Ctrl+Tab & Ctrl+Shift+Tab** - Block tab navigation
- **Page Visibility API** - Detect when user switches to another tab
- **Window Focus Monitoring** - Track when exam window loses focus

### 🚫 Clipboard Operations Blocking
- **Ctrl+C (Copy)** - Disable copy functionality
- **Ctrl+V (Paste)** - Disable paste functionality
- **Ctrl+X (Cut)** - Disable cut functionality
- Block clipboard events at both keyboard and API level

### 🖱️ Right-Click Blocking
- Disable context menu
- Prevent right-click operations
- Show user-friendly message when attempting

### 🎥 Screen Recording/Sharing Detection
- Monitor `getDisplayMedia()` API for screen capture attempts
- Detect suspicious canvas operations
- Monitor WebRTC activity
- Prevent screen sharing attempts

### 🔍 Background App Monitoring
- Detect mouse leaving document area
- Monitor window minimize events (Electron)
- Detect unusual background process usage

### ⚠️ Violation Warning System
- **Maximum 3 Attempts** configurable
- **1st Violation**: Shows "Warning: Rule violation detected. 2 attempts remaining."
- **2nd Violation**: Shows "Warning: Rule violation detected. 1 attempt remaining."
- **3rd Violation**: Exam terminates with lockdown

## Installation & Setup

### 1. Import in Your React Component

```jsx
import RestrictionAgent from './restrictionAgent/restrictionAgent';
```

### 2. Initialize During Exam Start

```jsx
const restrictionAgent = new RestrictionAgent({
  maxAttempts: 3,
  onViolation: (violation) => {
    console.log('Violation detected:', violation);
    // Update UI to show warning
  },
  onExamTerminated: (data) => {
    console.log('Exam terminated:', data);
    // Redirect to results page
  },
});

// Start monitoring
restrictionAgent.start();

// Stop monitoring (when exam ends)
restrictionAgent.stop();
```

## API Reference

### Constructor Options

```javascript
new RestrictionAgent({
  maxAttempts: 3,                    // Number of allowed violations (default: 3)
  onViolation: (violation) => {},    // Callback when violation detected
  onExamTerminated: (data) => {}     // Callback when exam is terminated
})
```

### Methods

#### `start()`
Begins monitoring all exam restrictions.

```javascript
restrictionAgent.start();
```

#### `stop()`
Stops monitoring and removes all event listeners.

```javascript
restrictionAgent.stop();
```

#### `getStatus()`
Returns current monitoring status and statistics.

```javascript
const status = restrictionAgent.getStatus();
// Returns:
// {
//   isActive: boolean,
//   attemptsRemaining: number,
//   totalViolations: number,
//   sessionDuration: number (milliseconds),
//   violations: Array
// }
```

#### `getViolationHistory()`
Returns detailed violation history.

```javascript
const history = restrictionAgent.getViolationHistory();
// Returns:
// {
//   totalViolations: number,
//   attemptsRemaining: number,
//   violations: Array of violation objects,
//   isActive: boolean,
//   sessionDuration: number
// }
```

### Events

The module dispatches custom events that you can listen to:

```javascript
// Listen for exam termination
document.addEventListener('examTerminated', (event) => {
  const { reason, violations, timestamp } = event.detail;
  console.log('Exam terminated:', reason);
});
```

### Violation Object Structure

```javascript
{
  timestamp: "2024-03-09T10:30:45.123Z",
  reason: "Alt+Tab attempted",
  attemptRemaining: 2  // Attempts left after this violation
}
```

## Usage Examples

### Example 1: Basic Integration

```jsx
import React, { useEffect, useState } from 'react';
import RestrictionAgent from './restrictionAgent/restrictionAgent';

function ExamPage() {
  const [violations, setViolations] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  useEffect(() => {
    const agent = new RestrictionAgent({
      maxAttempts: 3,
      onViolation: (violation) => {
        setViolations(v => v + 1);
        setAttemptsLeft(violation.attemptRemaining);
      },
      onExamTerminated: (data) => {
        // Save violation data to backend
        fetch('/api/exam/save-violations', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    });

    agent.start();
    return () => agent.stop();
  }, []);

  return (
    <div>
      <h1>Secure Exam</h1>
      <p>Violations: {violations}</p>
      <p>Attempts Remaining: {attemptsLeft}</p>
      {/* Exam content */}
    </div>
  );
}

export default ExamPage;
```

### Example 2: With Context API

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import RestrictionAgent from './restrictionAgent/restrictionAgent';

const RestrictionContext = createContext();

export function RestrictionProvider({ children, examId }) {
  const [agent] = useState(() => new RestrictionAgent({
    maxAttempts: 3,
    onViolation: (violation) => {
      // Log to backend
      fetch(`/api/exam/${examId}/violations`, {
        method: 'POST',
        body: JSON.stringify(violation)
      });
    },
    onExamTerminated: (data) => {
      // Handle termination
      window.location.href = '/exam-terminated';
    }
  }));

  useEffect(() => {
    agent.start();
    return () => agent.stop();
  }, [agent]);

  return (
    <RestrictionContext.Provider value={agent}>
      {children}
    </RestrictionContext.Provider>
  );
}

export function useRestrictions() {
  return useContext(RestrictionContext);
}

// Usage in component:
function ExamContent() {
  const agent = useRestrictions();
  const { attemptsRemaining, totalViolations } = agent.getStatus();

  return <div>Violations: {totalViolations}</div>;
}
```

### Example 3: Advanced Integration with Backend

```jsx
useEffect(() => {
  const agent = new RestrictionAgent({
    maxAttempts: 3,
    onViolation: (violation) => {
      // Send to backend in real-time
      socket.emit('violation', {
        examId: currentExam.id,
        violation: violation,
        userId: user.id
      });
    },
    onExamTerminated: async (data) => {
      // Save exam result with violations
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: currentExam.id,
          userId: user.id,
          violations: data.violations,
          status: 'terminated',
          reason: data.reason
        })
      });

      if (response.ok) {
        // Redirect to results
        navigate('/exam-results');
      }
    }
  });

  agent.start();
  return () => agent.stop();
}, [currentExam.id, user.id]);
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Keyboard Blocking | ✅ | ✅ | ✅ | ✅ |
| Tab Switching Detection | ✅ | ✅ | ✅ | ✅ |
| Clipboard Blocking | ✅ | ✅ | ✅ | ✅ |
| Right-Click Blocking | ✅ | ✅ | ✅ | ✅ |
| Screen Recording Detection | ✅ | ✅ | ✅ | ✅ |
| Window Focus Monitoring | ✅ | ✅ | ✅ | ✅ |

## Security Considerations

⚠️ **Important Notes:**

1. **Client-Side Limitations**: Restrictions are enforced client-side. Always validate exam integrity server-side.

2. **Keyboard Event Interception**: Some OS/browser combinations may not allow certain key blocking (e.g., system-level Alt+Tab on Windows). The system still detects and logs these attempts.

3. **Screen Recording Detection**: Cannot block all recording methods (e.g., hardware recording). Use server-side monitoring or proctoring in production.

4. **Fullscreen Mode**: Requires user initiation or special permissions. Works best in Electron where you can force fullscreen programmatically.

5. **Backend Validation**: Always validate violation reports server-side. Never rely solely on client-side violation detection.

## Recommended Backend Integration

```javascript
// Save violations to database
app.post('/api/exam/:examId/violation', async (req, res) => {
  const { reason, timestamp } = req.body;
  
  // Log violation
  await Violation.create({
    examId: req.params.examId,
    userId: req.user.id,
    reason,
    timestamp,
    ipAddress: req.ip
  });

  // Check violation count
  const count = await Violation.countDocuments({
    examId: req.params.examId,
    userId: req.user.id
  });

  if (count >= 3) {
    // Terminate exam server-side
    await Exam.updateOne(
      { _id: req.params.examId },
      { status: 'terminated', reason: 'Violation limit exceeded' }
    );
  }

  res.json({ success: true });
});
```

## Troubleshooting

### Issue: Violations not being detected

**Solution**: Ensure `agent.start()` is called before exam begins. Check browser console for errors.

### Issue: Warning messages not showing

**Solution**: Check z-index conflicts. Default z-index is 10000. Adjust if needed by modifying the CSS in the module.

### Issue: Fullscreen not working in Electron

**Solution**: Ensure window has `webPreferences.sandbox: false` in Electron config.

### Issue: Copy/paste still working

**Solution**: Some keyboard shortcuts may not be interceptable depending on OS/browser. The violation is still logged. Use server-side validation to prevent data submission.

## Support for Exam Proctoring

For best results in production:

1. ✅ Use **Electron** for desktop app with forced fullscreen
2. ✅ Integrate with **server-side monitoring**
3. ✅ Add **backend violation validation**
4. ✅ Use **live proctoring** (video stream monitoring)
5. ✅ Implement **IP whitelisting**
6. ✅ Enable **biometric verification** at exam start

## License

This module is part of the Secure Online Examination System.

## Support & Feedback

For issues or feature requests, please contact the development team.
