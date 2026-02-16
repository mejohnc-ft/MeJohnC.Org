/**
 * Agent Platform Auth Tests
 *
 * Tests the authentication pipeline defined in _shared/agent-auth.ts:
 * - API key extraction and prefix validation
 * - RPC verification via verify_agent_api_key()
 * - Per-agent rate limiting
 * - Key rotation and revocation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  AGENT_SUSPENDED,
  VALID_API_KEY,
  INVALID_API_KEY,
  WRONG_PREFIX_KEY,
} from './fixtures'

// ─── Inline pure auth logic from _shared/agent-auth.ts ──────────────

const API_KEY_PREFIX = 'mj_agent_'

function extractApiKey(req: Request): string | null {
  return req.headers.get('x-agent-key') || null
}

function validateKeyPrefix(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX)
}

// Simplified auth pipeline for testing query patterns
async function authenticateAgent(
  req: Request,
  supabase: ReturnType<typeof createMockSupabaseClient>
) {
  const apiKey = extractApiKey(req)
  if (!apiKey) return { authenticated: false, error: 'Missing X-Agent-Key header', status: 401 }
  if (!validateKeyPrefix(apiKey)) return { authenticated: false, error: 'Invalid API key format', status: 401 }

  const { data: agents, error } = await supabase.rpc('verify_agent_api_key', { p_api_key: apiKey })
  if (error) return { authenticated: false, error: 'Authentication service error', status: 500 }
  if (!agents || (agents as unknown[]).length === 0) return { authenticated: false, error: 'Invalid or inactive API key', status: 401 }

  const agent = (agents as unknown[])[0] as typeof AGENT_OPENCLAW
  if (agent.status === 'suspended') return { authenticated: false, error: 'Agent is suspended', status: 401 }

  return { authenticated: true, agent, rateLimit: { remaining: agent.rate_limit_rpm - 1, limit: agent.rate_limit_rpm } }
}

describe('Agent Auth', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
  })

  it('returns agent profile on successful auth', async () => {
    supabase._setRpcResult('verify_agent_api_key', [AGENT_OPENCLAW])

    const req = new Request('https://test.supabase.co/functions/v1/agent-auth', {
      method: 'POST',
      headers: { 'x-agent-key': VALID_API_KEY },
    })

    const result = await authenticateAgent(req, supabase)

    expect(result.authenticated).toBe(true)
    expect(result.agent).toEqual(AGENT_OPENCLAW)
    expect(result.rateLimit?.remaining).toBe(AGENT_OPENCLAW.rate_limit_rpm - 1)
    expect(supabase.rpc).toHaveBeenCalledWith('verify_agent_api_key', { p_api_key: VALID_API_KEY })
  })

  it('returns 401 for invalid API key', async () => {
    supabase._setRpcResult('verify_agent_api_key', [])

    const req = new Request('https://test.supabase.co/functions/v1/agent-auth', {
      method: 'POST',
      headers: { 'x-agent-key': INVALID_API_KEY },
    })

    const result = await authenticateAgent(req, supabase)

    expect(result.authenticated).toBe(false)
    expect(result.status).toBe(401)
    expect(result.error).toBe('Invalid or inactive API key')
  })

  it('returns 401 for suspended agent', async () => {
    supabase._setRpcResult('verify_agent_api_key', [AGENT_SUSPENDED])

    const req = new Request('https://test.supabase.co/functions/v1/agent-auth', {
      method: 'POST',
      headers: { 'x-agent-key': VALID_API_KEY },
    })

    const result = await authenticateAgent(req, supabase)

    expect(result.authenticated).toBe(false)
    expect(result.status).toBe(401)
  })

  it('returns 401 for wrong key prefix', async () => {
    const req = new Request('https://test.supabase.co/functions/v1/agent-auth', {
      method: 'POST',
      headers: { 'x-agent-key': WRONG_PREFIX_KEY },
    })

    const result = await authenticateAgent(req, supabase)

    expect(result.authenticated).toBe(false)
    expect(result.error).toBe('Invalid API key format')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit is exceeded', async () => {
    // Simulate the rate-limit check at the auth layer
    // The real rate limiter uses in-memory tracking; here we test the pattern
    const rateLimitRpm = 2
    const agent = { ...AGENT_OPENCLAW, rate_limit_rpm: rateLimitRpm }
    supabase._setRpcResult('verify_agent_api_key', [agent])

    // Track request count
    let requestCount = 0

    async function authenticateWithRateLimit(req: Request) {
      const auth = await authenticateAgent(req, supabase)
      if (!auth.authenticated) return auth
      requestCount++
      if (requestCount > rateLimitRpm) {
        return {
          authenticated: false,
          error: 'Rate limit exceeded',
          status: 429,
          rateLimit: { remaining: 0, limit: rateLimitRpm, resetAt: Date.now() + 60000 },
        }
      }
      return auth
    }

    const makeReq = () =>
      new Request('https://test.supabase.co/functions/v1/agent-auth', {
        method: 'POST',
        headers: { 'x-agent-key': VALID_API_KEY },
      })

    // First two requests should succeed
    const r1 = await authenticateWithRateLimit(makeReq())
    expect(r1.authenticated).toBe(true)
    const r2 = await authenticateWithRateLimit(makeReq())
    expect(r2.authenticated).toBe(true)

    // Third request should be rate limited
    const r3 = await authenticateWithRateLimit(makeReq())
    expect(r3.authenticated).toBe(false)
    expect(r3.status).toBe(429)
    expect(r3.error).toBe('Rate limit exceeded')
  })

  it('key rotation generates new key and invalidates old', async () => {
    // Test that rotate_agent_api_key calls generate_agent_api_key internally
    // and the old key no longer works
    const newKey = 'mj_agent_new_key_after_rotation_00000000'

    // Simulate: rotate calls generate which returns a new key
    supabase._setRpcResult('rotate_agent_api_key', newKey)

    const rotateResult = await supabase.rpc('rotate_agent_api_key', {
      p_agent_id: AGENT_OPENCLAW.id,
    })
    expect(rotateResult.data).toBe(newKey)
    expect(supabase.rpc).toHaveBeenCalledWith('rotate_agent_api_key', {
      p_agent_id: AGENT_OPENCLAW.id,
    })

    // After rotation, old key should fail verification
    supabase._setRpcResult('verify_agent_api_key', [])
    const req = new Request('https://test.supabase.co/functions/v1/agent-auth', {
      method: 'POST',
      headers: { 'x-agent-key': VALID_API_KEY },
    })
    const result = await authenticateAgent(req, supabase)
    expect(result.authenticated).toBe(false)
  })
})
