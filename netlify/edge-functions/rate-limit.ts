/**
 * Netlify Edge Function for API Rate Limiting
 *
 * Applies rate limiting to Supabase function calls made from the frontend.
 * Runs at the edge before requests reach the origin.
 *
 * Configuration in netlify.toml:
 *   [[edge_functions]]
 *   function = "rate-limit"
 *   path = "/api/*"
 */

import type { Config, Context } from 'https://edge.netlify.com'

interface RateLimitEntry {
  count: number
  windowStart: number
}

// Configuration
const WINDOW_MS = 60000 // 1 minute
const MAX_REQUESTS = 60 // 60 requests per minute from frontend
const SKIP_PATHS = ['/api/health', '/api/health-check']

// In-memory store (per edge location)
const store = new Map<string, RateLimitEntry>()

// Cleanup interval
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < WINDOW_MS) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= WINDOW_MS * 2) {
      store.delete(key)
    }
  }
}

function getClientIp(request: Request, context: Context): string {
  // Netlify provides client IP via context
  if (context.ip) {
    return context.ip
  }

  // Fallback to headers
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return 'unknown'
}

function checkRateLimit(clientIp: string): {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
} {
  cleanup()

  const now = Date.now()
  const entry = store.get(clientIp)

  // New client or window expired
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(clientIp, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: now + WINDOW_MS,
    }
  }

  // Check if over limit
  const resetAt = entry.windowStart + WINDOW_MS

  if (entry.count >= MAX_REQUESTS) {
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
    remaining: MAX_REQUESTS - entry.count,
    resetAt,
  }
}

export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  const url = new URL(request.url)

  // Skip rate limiting for health checks
  if (SKIP_PATHS.some(path => url.pathname.startsWith(path))) {
    return context.next()
  }

  // Get client identifier
  const clientIp = getClientIp(request, context)

  // Check rate limit
  const result = checkRateLimit(clientIp)

  // Build rate limit headers
  const rateLimitHeaders = {
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  }

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.retryAfter!.toString(),
          ...rateLimitHeaders,
        },
      }
    )
  }

  // Continue to origin and add headers to response
  const response = await context.next()

  // Clone response to add headers
  const newHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    newHeaders.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

export const config: Config = {
  path: '/api/*',
}
