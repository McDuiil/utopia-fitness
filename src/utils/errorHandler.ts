const errorSet = new Set<string>();

export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return;

  // Initialize global error log array
  if (!window.__ERROR_LOGS__) {
    window.__ERROR_LOGS__ = [];
  }

  window.__reportError = (error: any, info?: any) => {
    const message = error?.message || String(error);
    const stack = error?.stack || (info?.componentStack) || '';
    const key = message + stack;

    // Deduplication
    if (errorSet.has(key)) return;
    errorSet.add(key);

    // Push to global logs with limit
    window.__ERROR_LOGS__?.push({
      message,
      stack,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    });

    if (window.__ERROR_LOGS__ && window.__ERROR_LOGS__.length > 50) {
      window.__ERROR_LOGS__.shift();
    }

    console.error("[GlobalError]", message, stack);
  };

  window.onerror = (msg, url, line, col, error) => {
    window.__reportError?.(error || msg);
    return false; // Let default handler run too
  };

  window.onunhandledrejection = (event) => {
    window.__reportError?.(event.reason);
  };
}
