/**
 * React Hook for Restriction Agent
 * Provides easy integration into React components
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import RestrictionAgent from './restrictionAgent';
import { RESTRICTION_CONFIG } from './config';

/**
 * useRestrictionAgent Hook
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum allowed violations (default: 3)
 * @param {boolean} options.autoStart - Auto start restricting on mount (default: true)
 * @param {Function} options.onViolation - Callback when violation occurs
 * @param {Function} options.onExamTerminated - Callback when exam is terminated
 * @param {Function} options.onStatusChange - Callback when status changes
 * 
 * @returns {Object} Hook interface with agent methods and state
 * 
 * @example
 * const { start, stop, violations, attemptsRemaining, isActive } = useRestrictionAgent({
 *   onViolation: (violation) => console.log(violation),
 *   onExamTerminated: (data) => navigate('/results'),
 * });
 */
export const useRestrictionAgent = (options = {}) => {
  const agentRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [violations, setViolations] = useState([]);
  const [attemptsRemaining, setAttemptsRemaining] = useState(
    options.maxAttempts || RESTRICTION_CONFIG.MAX_ATTEMPTS
  );
  const [status, setStatus] = useState('idle'); // idle, active, terminated

  // Initialize agent
  useEffect(() => {
    if (agentRef.current) return;

    agentRef.current = new RestrictionAgent({
      maxAttempts: options.maxAttempts || RESTRICTION_CONFIG.MAX_ATTEMPTS,
      onViolation: (violation) => {
        setViolations((prev) => [...prev, violation]);
        setAttemptsRemaining(violation.attemptRemaining);

        if (options.onViolation) {
          options.onViolation(violation);
        }

        // Update status
        if (violation.attemptRemaining <= 0) {
          setStatus('terminated');
        }
      },
      onExamTerminated: (data) => {
        setIsActive(false);
        setStatus('terminated');

        if (options.onExamTerminated) {
          options.onExamTerminated(data);
        }
      },
    });
  }, [options]);

  // Auto-start if enabled
  useEffect(() => {
    if (options.autoStart !== false && agentRef.current && !isActive) {
      agentRef.current.start();
      setIsActive(true);
      setStatus('active');

      if (options.onStatusChange) {
        options.onStatusChange('active');
      }
    }

    return () => {
      if (agentRef.current && isActive) {
        agentRef.current.stop();
      }
    };
  }, [options.autoStart, isActive, options]);

  // Methods
  const start = useCallback(() => {
    if (agentRef.current && !isActive) {
      agentRef.current.start();
      setIsActive(true);
      setStatus('active');
      setViolations([]);
      setAttemptsRemaining(options.maxAttempts || RESTRICTION_CONFIG.MAX_ATTEMPTS);

      if (options.onStatusChange) {
        options.onStatusChange('active');
      }
    }
  }, [isActive, options]);

  const stop = useCallback(() => {
    if (agentRef.current && isActive) {
      agentRef.current.stop();
      setIsActive(false);
      setStatus('idle');

      if (options.onStatusChange) {
        options.onStatusChange('idle');
      }
    }
  }, [isActive, options]);

  const getStatus = useCallback(() => {
    return agentRef.current?.getStatus() || null;
  }, []);

  const getViolationHistory = useCallback(() => {
    return agentRef.current?.getViolationHistory() || null;
  }, []);

  const resetViolations = useCallback(() => {
    setViolations([]);
    setAttemptsRemaining(options.maxAttempts || RESTRICTION_CONFIG.MAX_ATTEMPTS);
  }, [options.maxAttempts]);

  return {
    // Methods
    start,
    stop,
    getStatus,
    getViolationHistory,
    resetViolations,

    // State
    isActive,
    violations,
    attemptsRemaining,
    status, // 'idle' | 'active' | 'terminated'
    totalViolations: violations.length,

    // Agent reference (advanced usage)
    agent: agentRef.current,
  };
};

/**
 * useExamRestrictions Hook
 * Higher-level hook focused on exam-specific functionality
 * 
 * @param {Object} config - Exam configuration
 * @param {string} config.examId - Exam ID for logging
 * @param {string} config.userId - User ID for logging
 * @param {Function} config.onTerminate - Callback when exam must terminate
 * 
 * @returns {Object} Exam-specific restrictions interface
 */
export const useExamRestrictions = (config = {}) => {
  const [examStats, setExamStats] = useState({
    startTime: null,
    endTime: null,
    duration: 0,
    violationLog: [],
  });

  const {
    isActive,
    violations,
    attemptsRemaining,
    start,
    stop,
    getStatus,
  } = useRestrictionAgent({
    autoStart: false,
    onViolation: async (violation) => {
      // Log to backend if configured
      if (config.examId && config.userId) {
        try {
          await fetch('/api/exam/violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: config.examId,
              userId: config.userId,
              violation,
            }),
          });
        } catch (error) {
          console.error('Failed to log violation:', error);
        }
      }
    },
    onExamTerminated: async (data) => {
      // Save exam termination data
      if (config.examId && config.userId) {
        try {
          await fetch('/api/exam/terminate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: config.examId,
              userId: config.userId,
              ...data,
              examStats,
            }),
          });
        } catch (error) {
          console.error('Failed to save termination data:', error);
        }
      }

      if (config.onTerminate) {
        config.onTerminate(data);
      }
    },
  });

  const startExam = useCallback(() => {
    setExamStats((prev) => ({
      ...prev,
      startTime: new Date().toISOString(),
      violationLog: [],
    }));
    start();
  }, [start]);

  const endExam = useCallback(async () => {
    const endTime = new Date().toISOString();
    const status = getStatus();

    setExamStats((prev) => ({
      ...prev,
      endTime,
      duration: status?.sessionDuration || 0,
      violationLog: violations,
    }));

    stop();

    // Send final exam data to backend
    if (config.examId && config.userId) {
      try {
        await fetch('/api/exam/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: config.examId,
            userId: config.userId,
            examStats: {
              ...examStats,
              endTime,
              violationLog: violations,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to submit exam:', error);
      }
    }
  }, [config.examId, config.userId, examStats, stop, violations, getStatus]);

  return {
    // Exam control
    startExam,
    endExam,
    isExamActive: isActive,

    // Exam stats
    examStats,
    violations,
    attemptsRemaining,
    totalViolations: violations.length,

    // Status
    canContinue: attemptsRemaining > 0,
    isTerminated: attemptsRemaining <= 0,
  };
};

/**
 * useViolationMonitor Hook
 * Real-time violation monitoring
 * 
 * @param {Function} onViolationThreshold - Callback when violation count reaches a threshold
 * @param {number} threshold - Violation count threshold (default: 1)
 * 
 * @returns {Object} Violation monitoring interface
 */
export function useViolationMonitor(onViolationThreshold, threshold = 1) {
  const {
    violations,
    attemptsRemaining,
    isActive,
  } = useRestrictionAgent({ autoStart: false });

  useEffect(() => {
    if (violations.length >= threshold && onViolationThreshold) {
      onViolationThreshold({
        count: violations.length,
        attemptsRemaining,
        lastViolation: violations[violations.length - 1],
      });
    }
  }, [violations, threshold, onViolationThreshold, attemptsRemaining]);

  return {
    violationCount: violations.length,
    attemptsRemaining,
    recentViolations: violations.slice(-3), // Last 3 violations
    isMonitoring: isActive,
  };
}

/**
 * RestrictionProvider Component
 * Context-based restriction agent management
 */
const RestrictionContext = createContext(null);

export function RestrictionProvider({ children, config = {} }) {
  const restrictionAgent = useRestrictionAgent({
    autoStart: config.autoStart !== false,
    ...config,
  });

  return (
    <RestrictionContext.Provider value={restrictionAgent}>
      {children}
    </RestrictionContext.Provider>
  );
}

/**
 * useRestriction Hook
 * Access restriction agent from context
 */
export function useRestriction() {
  const context = useContext(RestrictionContext);
  if (!context) {
    throw new Error('useRestriction must be used within RestrictionProvider');
  }
  return context;
}

// Export for convenience
export default useRestrictionAgent;
