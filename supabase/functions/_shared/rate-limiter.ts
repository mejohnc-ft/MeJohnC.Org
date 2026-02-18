/**
 * Rate Limiter Utility for Supabase Edge Functions
 *
 * Provides rate limiting with two modes:
 * - In-memory (fast, resets on cold start) for edge/non-critical use
 * - Persistent (Supabase-backed, survives cold starts) for agent auth
 *
 * Usage:
 *   import { RateLimiter, PersistentRateLimiter } from '../_shared/rate-limiter.ts'
 *
 *   // In-memory (existing behavior):
 *   const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 })
 *   const result = limiter.check(clientId)
 *
 *   // Persistent (requires Supabase client):
 *   const limiter = new PersistentRateLimiter(supabase, { windowMs: 60000, maxRequests: 10 })
 *   const result = await limiter.check(clientId)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Maximum requests per window (default: 100) */
  maxRequests?: number;
  /** Key prefix for namespacing (default: 'rate') */
  keyPrefix?: string;
  /** Skip rate limiting for these IPs (e.g., health checks) */
  skipIps?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      windowMs: config.windowMs ?? 60000,
      maxRequests: config.maxRequests ?? 100,
      keyPrefix: config.keyPrefix ?? "rate",
      skipIps: config.skipIps ?? ["127.0.0.1", "::1"],
    };

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs * 2);
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
      };
    }

    const key = `${this.config.keyPrefix}:${clientId}`;
    const now = Date.now();
    const entry = this.store.get(key);

    // New client or window expired
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Window still active
    const resetAt = entry.windowStart + this.config.windowMs;

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt,
    };
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": this.config.maxRequests.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
    };

    if (result.retryAfter !== undefined) {
      headers["Retry-After"] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Reset rate limit for a client (e.g., after successful auth)
   */
  reset(clientId: string): void {
    const key = `${this.config.keyPrefix}:${clientId}`;
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart >= this.config.windowMs * 2) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config?: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Lazy Supabase service client for persistent rate limiters.
 * Created once on first use to avoid failures at module load time.
 */
let _serviceClient: ReturnType<typeof createClient> | null = null;

function getServiceClient(): ReturnType<typeof createClient> {
  if (!_serviceClient) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persistent rate limiting",
      );
    }
    _serviceClient = createClient(url, key);
  }
  return _serviceClient;
}

/**
 * Default persistent rate limiters for common use cases.
 * Backed by Supabase rate_limit_buckets table — survives edge function cold starts.
 * Falls back to in-memory if DB is unreachable.
 */
export function getPersistentRateLimiters(
  supabase?: ReturnType<typeof createClient>,
) {
  const client = supabase ?? getServiceClient();
  return {
    /** Standard API rate limit: 100 req/min */
    api: new PersistentRateLimiter(client, {
      maxRequests: 100,
      windowMs: 60000,
      keyPrefix: "api",
    }),

    /** Strict rate limit for auth endpoints: 10 req/min */
    auth: new PersistentRateLimiter(client, {
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: "auth",
    }),

    /** Relaxed rate limit for read operations: 300 req/min */
    read: new PersistentRateLimiter(client, {
      maxRequests: 300,
      windowMs: 60000,
      keyPrefix: "read",
    }),

    /** Webhook rate limit: 100 req/min per source */
    webhook: new PersistentRateLimiter(client, {
      maxRequests: 100,
      windowMs: 60000,
      keyPrefix: "webhook",
    }),
  };
}

/**
 * @deprecated Use getPersistentRateLimiters() for cold-start-safe rate limiting.
 * Kept for backward compatibility — these reset on every edge function cold start.
 */
export const rateLimiters = {
  api: createRateLimiter({
    maxRequests: 100,
    windowMs: 60000,
    keyPrefix: "api",
  }),
  auth: createRateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: "auth",
  }),
  read: createRateLimiter({
    maxRequests: 300,
    windowMs: 60000,
    keyPrefix: "read",
  }),
  webhook: createRateLimiter({
    maxRequests: 100,
    windowMs: 60000,
    keyPrefix: "webhook",
  }),
};

/**
 * Extract client identifier from request
 */
export function getClientId(req: Request): string {
  // Prefer X-Forwarded-For for proxied requests
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (original client)
    return forwarded.split(",")[0].trim();
  }

  // Fall back to X-Real-IP
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Use CF-Connecting-IP for Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  return "unknown";
}

/**
 * Middleware helper for rate limiting.
 * Accepts either a sync RateLimiter or async PersistentRateLimiter.
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  limiter: RateLimiter | PersistentRateLimiter = rateLimiters.api,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const clientId = getClientId(req);
    const result = await Promise.resolve(limiter.check(clientId));

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...limiter.getHeaders(result),
          },
        },
      );
    }

    // Execute handler
    const response = await handler(req);

    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(limiter.getHeaders(result))) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Persistent Rate Limiter backed by Supabase
 *
 * Uses the check_rate_limit() RPC for atomic, persistent rate limiting
 * that survives edge function cold starts. Issue #181.
 */
export class PersistentRateLimiter {
  private supabase: ReturnType<typeof createClient>;
  private config: Required<RateLimitConfig>;
  // In-memory fallback for when DB calls fail
  private fallback: RateLimiter;

  constructor(
    supabase: ReturnType<typeof createClient>,
    config: RateLimitConfig = {},
  ) {
    this.supabase = supabase;
    this.config = {
      windowMs: config.windowMs ?? 60000,
      maxRequests: config.maxRequests ?? 100,
      keyPrefix: config.keyPrefix ?? "rate",
      skipIps: config.skipIps ?? ["127.0.0.1", "::1"],
    };
    this.fallback = new RateLimiter(config);
  }

  /**
   * Check rate limit via Supabase RPC (persistent across cold starts)
   */
  async check(clientId: string): Promise<RateLimitResult> {
    if (this.config.skipIps.includes(clientId)) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Date.now() + this.config.windowMs,
      };
    }

    const key = `${this.config.keyPrefix}:${clientId}`;

    try {
      const { data, error } = await this.supabase.rpc("check_rate_limit", {
        p_key: key,
        p_window_ms: this.config.windowMs,
        p_max_requests: this.config.maxRequests,
      });

      if (error || !data || data.length === 0) {
        // Fall back to in-memory on DB error
        return this.fallback.check(clientId);
      }

      const row = data[0];
      const resetAt = new Date(row.reset_at).getTime();

      return {
        allowed: row.allowed,
        remaining: row.remaining,
        resetAt,
        retryAfter: row.retry_after_seconds ?? undefined,
      };
    } catch {
      // Fall back to in-memory on any error
      return this.fallback.check(clientId);
    }
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": this.config.maxRequests.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
    };

    if (result.retryAfter !== undefined) {
      headers["Retry-After"] = result.retryAfter.toString();
    }

    return headers;
  }
}

/**
 * Create a persistent rate limiter instance
 */
export function createPersistentRateLimiter(
  supabase: ReturnType<typeof createClient>,
  config?: RateLimitConfig,
): PersistentRateLimiter {
  return new PersistentRateLimiter(supabase, config);
}
