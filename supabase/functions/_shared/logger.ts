/**
 * Structured Logger for Supabase Edge Functions
 *
 * Provides consistent, structured logging with:
 * - Correlation IDs for request tracing
 * - Structured JSON output for log aggregation
 * - Request/response logging middleware
 */

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
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
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Get correlation ID from request headers or generate new one
 */
export function getCorrelationId(headers: Headers): string {
  return (
    headers.get('x-correlation-id') ||
    headers.get('x-request-id') ||
    generateCorrelationId()
  );
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Logger class for edge functions
 */
export class Logger {
  private context: LoggerContext = {};
  private minLevel: LogLevel = 'info';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(context?: LoggerContext) {
    if (context) {
      this.context = context;
    }
  }

  /**
   * Create logger from request
   */
  static fromRequest(req: Request): Logger {
    const url = new URL(req.url);
    const headers = req.headers;

    return new Logger({
      correlationId: getCorrelationId(headers),
      requestId: generateCorrelationId(),
      path: url.pathname,
      method: req.method,
      clientIp: getClientIp(headers),
      userAgent: headers.get('user-agent') || undefined,
    });
  }

  /**
   * Set user context
   */
  setUser(userId: string): void {
    this.context.userId = userId;
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
   * Output log entry as JSON
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

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
   * Log request start
   */
  logRequest(): void {
    this.info('Request received', {
      path: this.context.path,
      method: this.context.method,
    });
  }

  /**
   * Log response
   */
  logResponse(statusCode: number, duration: number): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.output(
      this.formatEntry(level, 'Request completed', {
        statusCode,
        duration,
      })
    );
  }

  /**
   * Get correlation ID for response headers
   */
  getCorrelationId(): string {
    return this.context.correlationId || '';
  }

  /**
   * Get response headers with correlation ID
   */
  getResponseHeaders(): Record<string, string> {
    return {
      'x-correlation-id': this.context.correlationId || '',
      'x-request-id': this.context.requestId || '',
    };
  }
}

/**
 * Logging middleware wrapper for edge functions
 */
export function withLogging(
  handler: (req: Request, logger: Logger) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const logger = Logger.fromRequest(req);
    const start = performance.now();

    logger.logRequest();

    try {
      const response = await handler(req, logger);
      const duration = Math.round(performance.now() - start);

      // Add logging headers to response
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(logger.getResponseHeaders())) {
        headers.set(key, value);
      }

      logger.logResponse(response.status, duration);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      logger.error('Request failed', error as Error, { duration });

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          correlationId: logger.getCorrelationId(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...logger.getResponseHeaders(),
          },
        }
      );
    }
  };
}
