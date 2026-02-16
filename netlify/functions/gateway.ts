import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

/**
 * Netlify Function: API Gateway Proxy
 *
 * Proxies requests from /api/gateway to the Supabase api-gateway edge function.
 * This provides a unified API surface at mejohnc.org/api/gateway instead of
 * requiring clients to know the raw Supabase URL.
 *
 * Issue: #184
 */

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL

  if (!supabaseUrl) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'VITE_SUPABASE_URL not configured' }),
    }
  }

  const targetUrl = `${supabaseUrl}/functions/v1/api-gateway`

  // Forward headers, stripping hop-by-hop headers
  const forwardHeaders: Record<string, string> = {}
  const hopByHop = new Set([
    'connection', 'keep-alive', 'transfer-encoding',
    'te', 'trailer', 'upgrade', 'host',
  ])

  for (const [key, value] of Object.entries(event.headers || {})) {
    if (value && !hopByHop.has(key.toLowerCase())) {
      forwardHeaders[key] = value
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body: event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD'
        ? event.body
        : undefined,
    })

    const responseBody = await response.text()

    // Forward response headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    }

    // Forward rate limit and correlation headers
    const forwardResponseHeaders = [
      'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
      'x-correlation-id', 'x-request-id',
    ]
    for (const header of forwardResponseHeaders) {
      const value = response.headers.get(header)
      if (value) responseHeaders[header] = value
    }

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
    }
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Bad Gateway',
        message: 'Failed to reach upstream API gateway',
      }),
    }
  }
}

export { handler }
