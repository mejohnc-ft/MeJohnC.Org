// Sentry error tracking configuration
// To enable: Set VITE_SENTRY_DSN in your .env file

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured - error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% on errors
    // Only send errors in production
    enabled: import.meta.env.PROD,
  });
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>
): void {
  // Log to console only in development
  if (import.meta.env.DEV) {
    console.error('[Error]', error, context);
  }

  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  // Log to console only in development
  if (import.meta.env.DEV) {
    console.log(`[${level.toUpperCase()}]`, message);
  }

  if (import.meta.env.PROD && SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(user: { id: string; email?: string } | null): void {
  Sentry.setUser(user);
}

// Export Sentry's ErrorBoundary for use as a wrapper
export const SentryErrorBoundary = Sentry.ErrorBoundary;
