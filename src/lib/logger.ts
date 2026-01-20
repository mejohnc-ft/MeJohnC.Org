/**
 * Structured Logger with Correlation IDs
 *
 * Provides consistent, structured logging across the application with:
 * - Correlation IDs for request tracing
 * - Structured JSON output for log aggregation
 * - Integration with Sentry for error tracking
 * - Context preservation across async operations
 */

import * as Sentry from '@sentry/react';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Logger context
interface LoggerContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
}

// Generate a unique correlation ID
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

// Get correlation ID from request headers or generate new one
export function getCorrelationId(headers?: Headers): string {
  if (headers) {
    const existing = headers.get('x-correlation-id') || headers.get('x-request-id');
    if (existing) return existing;
  }
  return generateCorrelationId();
}

// Session storage key for correlation ID
const CORRELATION_ID_KEY = 'mejohnc_correlation_id';
const SESSION_ID_KEY = 'mejohnc_session_id';

// Get or create session-scoped IDs (client-side)
function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateCorrelationId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// Logger class
class Logger {
  private context: LoggerContext = {};
  private minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    // Initialize session ID on client
    if (typeof window !== 'undefined') {
      this.context.sessionId = getSessionId();
    }
  }

  /**
   * Set logger context (persists across log calls)
   */
  setContext(context: Partial<LoggerContext>): void {
    this.context = { ...this.context, ...context };

    // Also set Sentry context
    if (context.userId) {
      Sentry.setUser({ id: context.userId });
    }
    if (context.correlationId) {
      Sentry.setTag('correlationId', context.correlationId);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LoggerContext>): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Start a new correlation context (e.g., for a new request)
   */
  startCorrelation(correlationId?: string): string {
    const id = correlationId || generateCorrelationId();
    this.context.correlationId = id;
    Sentry.setTag('correlationId', id);
    return id;
  }

  /**
   * Format log entry
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
    };

    if (metadata) {
      entry.metadata = metadata;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // In production, output structured JSON
    if (import.meta.env.PROD) {
      const output = JSON.stringify(entry);

      switch (entry.level) {
        case 'error':
          console.error(output);
          break;
        case 'warn':
          console.warn(output);
          break;
        default:
          console.log(output);
      }

      // Send errors to Sentry
      if (entry.level === 'error' && entry.error) {
        Sentry.captureException(new Error(entry.error.message), {
          extra: {
            ...entry.metadata,
            correlationId: entry.correlationId,
          },
        });
      }
    } else {
      // In development, use readable format
      const prefix = `[${entry.level.toUpperCase()}]`;
      const correlation = entry.correlationId ? `[${entry.correlationId.slice(0, 8)}]` : '';
      const component = entry.component ? `[${entry.component}]` : '';

      const parts = [prefix, correlation, component, entry.message].filter(Boolean);

      switch (entry.level) {
        case 'error':
          console.error(...parts, entry.metadata || '', entry.error || '');
          break;
        case 'warn':
          console.warn(...parts, entry.metadata || '');
          break;
        case 'debug':
          console.debug(...parts, entry.metadata || '');
          break;
        default:
          console.log(...parts, entry.metadata || '');
      }
    }
  }

  // Log methods
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatEntry('debug', message, metadata));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatEntry('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatEntry('warn', message, metadata));
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.output(this.formatEntry('error', message, metadata, error));
  }

  /**
   * Log an action with timing
   */
  async time<T>(
    action: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    this.debug(`Starting: ${action}`, metadata);

    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.info(`Completed: ${action}`, { ...metadata, duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`Failed: ${action}`, error as Error, { ...metadata, duration });
      throw error;
    }
  }

  /**
   * Create a request logger middleware
   */
  forRequest(req: Request): Logger {
    const correlationId = getCorrelationId(req.headers);
    return this.child({
      correlationId,
      component: new URL(req.url).pathname,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating new instances
export { Logger };

// Convenience exports
export const log = {
  debug: (message: string, metadata?: Record<string, unknown>) => logger.debug(message, metadata),
  info: (message: string, metadata?: Record<string, unknown>) => logger.info(message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => logger.warn(message, metadata),
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
    logger.error(message, error, metadata),
  time: <T>(action: string, fn: () => Promise<T>, metadata?: Record<string, unknown>) =>
    logger.time(action, fn, metadata),
};
