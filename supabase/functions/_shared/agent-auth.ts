/**
 * Agent Authentication Utility for Supabase Edge Functions
 *
 * Provides shared authentication pipeline for agent API keys:
 * - Extract X-Agent-Key header
 * - Validate mj_agent_ prefix
 * - Verify against database via verify_agent_api_key() RPC
 * - Per-agent rate limiting (using agent's rate_limit_rpm)
 * - Update last_seen_at
 *
 * Usage:
 *   import { authenticateAgent } from '../_shared/agent-auth.ts'
 *
 *   const auth = await authenticateAgent(req, supabase, logger)
 *   if (!auth.authenticated) {
 *     return new Response(JSON.stringify({ error: auth.error }), { status: auth.status })
 *   }
 *   // auth.agent is the verified agent profile
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createRateLimiter, RateLimiter } from './rate-limiter.ts'
import { Logger } from './logger.ts'

// Agent profile returned from verify_agent_api_key()
export interface AgentProfile {
  id: string
  name: string
  type: 'autonomous' | 'supervised' | 'tool'
  status: 'active' | 'inactive' | 'suspended'
  capabilities: string[]
  rate_limit_rpm: number
  metadata: Record<string, unknown>
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentAuthResult {
  authenticated: boolean
  agent?: AgentProfile
  rateLimit?: {
    remaining: number
    resetAt: number
    limit: number
  }
  error?: string
  status?: number
}

const API_KEY_PREFIX = 'mj_agent_'

// Per-agent rate limiters, keyed by agent ID. Created on first auth with agent's rate_limit_rpm.
// Resets on cold start (acceptable for Phase 2).
const agentRateLimiters = new Map<string, RateLimiter>()

/**
 * Extract API key from request headers
 */
export function extractApiKey(req: Request): string | null {
  return req.headers.get('x-agent-key') || null
}

/**
 * Get or create a rate limiter for a specific agent
 */
function getAgentRateLimiter(agentId: string, rateLimitRpm: number): RateLimiter {
  let limiter = agentRateLimiters.get(agentId)
  if (!limiter) {
    limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: rateLimitRpm,
      keyPrefix: `agent:${agentId}`,
    })
    agentRateLimiters.set(agentId, limiter)
  }
  return limiter
}

/**
 * Full authentication pipeline for agent requests.
 *
 * 1. Extract X-Agent-Key header
 * 2. Validate mj_agent_ prefix
 * 3. Call verify_agent_api_key() RPC
 * 4. Enforce per-agent rate limit
 * 5. Update last_seen_at
 */
export async function authenticateAgent(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  logger: Logger
): Promise<AgentAuthResult> {
  // 1. Extract API key
  const apiKey = extractApiKey(req)
  if (!apiKey) {
    logger.warn('Agent auth failed: missing X-Agent-Key header')
    return {
      authenticated: false,
      error: 'Missing X-Agent-Key header',
      status: 401,
    }
  }

  // 2. Validate prefix
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    logger.warn('Agent auth failed: invalid key prefix')
    return {
      authenticated: false,
      error: 'Invalid API key format',
      status: 401,
    }
  }

  // 3. Verify against database
  const { data: agents, error: verifyError } = await supabase.rpc(
    'verify_agent_api_key',
    { p_api_key: apiKey }
  )

  if (verifyError) {
    logger.error('Agent auth failed: RPC error', verifyError as unknown as Error)
    return {
      authenticated: false,
      error: 'Authentication service error',
      status: 500,
    }
  }

  if (!agents || agents.length === 0) {
    logger.warn('Agent auth failed: invalid or inactive key')
    return {
      authenticated: false,
      error: 'Invalid or inactive API key',
      status: 401,
    }
  }

  const agent = agents[0] as AgentProfile

  // 4. Per-agent rate limiting
  const limiter = getAgentRateLimiter(agent.id, agent.rate_limit_rpm)
  const rateResult = limiter.check(agent.id)

  if (!rateResult.allowed) {
    logger.warn('Agent auth failed: rate limit exceeded', {
      agentId: agent.id,
      agentName: agent.name,
      retryAfter: rateResult.retryAfter,
    })
    return {
      authenticated: false,
      agent,
      rateLimit: {
        remaining: rateResult.remaining,
        resetAt: rateResult.resetAt,
        limit: agent.rate_limit_rpm,
      },
      error: 'Rate limit exceeded',
      status: 429,
    }
  }

  // 5. Update last_seen_at (fire and forget, don't block auth)
  supabase
    .from('agents')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', agent.id)
    .then(({ error }) => {
      if (error) {
        logger.warn('Failed to update last_seen_at', { agentId: agent.id, error: error.message })
      }
    })

  logger.info('Agent authenticated', {
    agentId: agent.id,
    agentName: agent.name,
    agentType: agent.type,
  })

  return {
    authenticated: true,
    agent,
    rateLimit: {
      remaining: rateResult.remaining,
      resetAt: rateResult.resetAt,
      limit: agent.rate_limit_rpm,
    },
  }
}
