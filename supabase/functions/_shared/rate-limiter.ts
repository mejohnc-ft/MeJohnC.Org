/**
 * Rate Limiter Utility for Supabase Edge Functions
 *
 * Provides sliding window rate limiting with configurable limits.
 * Uses in-memory storage (resets on cold start) or can be extended for Redis.
 *
 * Usage:
 *   import { RateLimiter, createRateLimiter } from '../_shared/rate-limiter.ts'
 *
 *   const limiter = createRateLimiter({
 *     windowMs: 60000,    // 1 minute
 *     maxRequests: 100,   // 100 requests per window
 *   })
 *
 *   // In your handler:
 *   const clientId = req.headers.get('x-forwarded-for') || 'unknown'
 *   const result = limiter.check(clientId)
 *   if (!result.allowed) {
 *     return new Response('Rate limit exceeded', { status: 429 })
 *   }
 */

export interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Maximum requests per window (default: 100) */
  maxRequests?: number
  /** Key prefix for namespacing (default: 'rate') */
  keyPrefix?: string
  /** Skip rate limiting for these IPs (e.g., health checks) */
  skipIps?: string[]
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      windowMs: config.windowMs ?? 60000,
      maxRequests: config.maxRequests ?? 100,
      keyPrefix: config.keyPrefix ?? 'rate',
      skipIps: config.skipIps ?? ['127.0.0.1', '::1'],
    }

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs * 2)
  }

  /**
   * Check if a request is allowed for the given client ID
   */
  check(clientId: string): RateLimitResult {
    // Skip rate limiting for whitelisted IPs
    if (this.config.skipIps.includes(clientId)) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Date.now() + this.config.windowMs,
      }
    }

    const key = `${this.config.keyPrefix}:${clientId}`
    const now = Date.now()
    const entry = this.store.get(key)

    // New client or window expired
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.store.set(key, { count: 1, windowStart: now })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      }
    }

    // Window still active
    const resetAt = entry.windowStart + this.config.windowMs

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt,
    }
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
    }

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = result.retryAfter.toString()
    }

    return headers
  }

  /**
   * Reset rate limit for a client (e.g., after successful auth)
   */
  reset(clientId: string): void {
    const key = `${this.config.keyPrefix}:${clientId}`
    this.store.delete(key)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart >= this.config.windowMs * 2) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  get size(): number {
    return this.store.size
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config?: RateLimitConfig): RateLimiter {
  return new RateLimiter(config)
}

/**
 * Default rate limiters for common use cases
 */
export const rateLimiters = {
  /** Standard API rate limit: 100 req/min */
  api: createRateLimiter({ maxRequests: 100, windowMs: 60000, keyPrefix: 'api' }),

  /** Strict rate limit for auth endpoints: 10 req/min */
  auth: createRateLimiter({ maxRequests: 10, windowMs: 60000, keyPrefix: 'auth' }),

  /** Relaxed rate limit for read operations: 300 req/min */
  read: createRateLimiter({ maxRequests: 300, windowMs: 60000, keyPrefix: 'read' }),

  /** Webhook rate limit: 100 req/min per source */
  webhook: createRateLimiter({ maxRequests: 100, windowMs: 60000, keyPrefix: 'webhook' }),
}

/**
 * Extract client identifier from request
 */
export function getClientId(req: Request): string {
  // Prefer X-Forwarded-For for proxied requests
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP (original client)
    return forwarded.split(',')[0].trim()
  }

  // Fall back to X-Real-IP
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Use CF-Connecting-IP for Cloudflare
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }

  return 'unknown'
}

/**
 * Middleware helper for rate limiting
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  limiter: RateLimiter = rateLimiters.api
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const clientId = getClientId(req)
    const result = limiter.check(clientId)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...limiter.getHeaders(result),
          },
        }
      )
    }

    // Execute handler
    const response = await handler(req)

    // Add rate limit headers to response
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(limiter.getHeaders(result))) {
      headers.set(key, value)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
