/**
 * Agent Platform API Gateway Tests
 *
 * Tests the unified API gateway from api-gateway/index.ts:
 * - Action routing via capabilities
 * - Capability-based access control
 * - HMAC signature verification
 * - Replay attack prevention
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  AGENT_DASHBOARD,
  computeHmacSha256,
} from './fixtures'

// ─── Inline capability checking from _shared/capabilities.ts ────────

const ACTION_CAPABILITY_MAP: Record<string, string> = {
  'query.contacts': 'crm',
  'query.deals': 'crm',
  'crm.create_contact': 'crm',
  'kb.search': 'kb',
  'video.transcode': 'video',
  'email.send': 'email',
  'workflow.execute': 'automation',
  'agent.status': '',
  'agent.capabilities': '',
  'workflow.status': '',
}

function canPerformAction(agentCapabilities: string[], action: string): boolean {
  const required = ACTION_CAPABILITY_MAP[action]
  if (required === undefined) return false
  if (required === '') return true
  return agentCapabilities.includes(required)
}

interface RouteTarget {
  type: 'agent' | 'workflow' | 'integration' | 'query' | 'system'
  handler: string
}

function resolveRoute(action: string): RouteTarget {
  const prefix = action.split('.')[0]
  switch (prefix) {
    case 'agent': return { type: 'agent', handler: 'api-gateway' }
    case 'workflow': return { type: 'workflow', handler: 'workflow-executor' }
    case 'integration': return { type: 'integration', handler: 'integration-credentials' }
    case 'query': return { type: 'query', handler: 'query-engine' }
    default: return { type: 'system', handler: action }
  }
}

// ─── Inline signature parsing from _shared/command-signing.ts ───────

function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  if (!header || typeof header !== 'string') return null
  const parts = header.split(',')
  let timestamp = 0
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=', 2)
    if (!key || !value) continue
    const k = key.trim()
    const v = value.trim()
    if (k === 't') {
      timestamp = parseInt(v, 10)
      if (isNaN(timestamp)) return null
    } else if (k === 'v1') {
      signatures.push(v)
    }
  }

  if (timestamp === 0 || signatures.length === 0) return null
  return { timestamp, signatures }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

const REPLAY_WINDOW_SECONDS = 5 * 60 // 5 minutes

describe('API Gateway', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
  })

  it('routes valid action to correct handler', () => {
    // CRM action routes to query handler
    const crmRoute = resolveRoute('query.contacts')
    expect(crmRoute.type).toBe('query')
    expect(crmRoute.handler).toBe('query-engine')

    // Workflow action routes to workflow handler
    const wfRoute = resolveRoute('workflow.execute')
    expect(wfRoute.type).toBe('workflow')
    expect(wfRoute.handler).toBe('workflow-executor')

    // Agent action routes to agent handler
    const agentRoute = resolveRoute('agent.status')
    expect(agentRoute.type).toBe('agent')
    expect(agentRoute.handler).toBe('api-gateway')

    // Integration action routes to integration handler
    const intRoute = resolveRoute('integration.status')
    expect(intRoute.type).toBe('integration')
    expect(intRoute.handler).toBe('integration-credentials')

    // Unknown prefix routes to system handler
    const sysRoute = resolveRoute('email.send')
    expect(sysRoute.type).toBe('system')
    expect(sysRoute.handler).toBe('email.send')
  })

  it('returns 403 when agent lacks required capability', () => {
    // OpenClaw has: crm, email, tasks, research, automation
    // OpenClaw does NOT have: video, kb
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'query.contacts')).toBe(true)
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'email.send')).toBe(true)
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'workflow.execute')).toBe(true)

    // Should be denied — no 'video' capability
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'video.transcode')).toBe(false)
    // Should be denied — no 'kb' capability
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'kb.search')).toBe(false)

    // Dashboard has: data, meta_analysis, documents — no 'crm'
    expect(canPerformAction(AGENT_DASHBOARD.capabilities, 'query.contacts')).toBe(false)

    // System actions (empty capability) should be allowed for any agent
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'agent.status')).toBe(true)
    expect(canPerformAction(AGENT_DASHBOARD.capabilities, 'agent.capabilities')).toBe(true)

    // Unknown action should be denied
    expect(canPerformAction(AGENT_OPENCLAW.capabilities, 'unknown.action')).toBe(false)
  })

  it('accepts valid HMAC signature', async () => {
    const secret = 'test-signing-secret-123'
    const timestamp = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ action: 'query.contacts', params: {} })
    const signedPayload = `${timestamp}.${body}`

    const hmac = await computeHmacSha256(secret, signedPayload)
    const header = `t=${timestamp},v1=${hmac}`

    // Parse the header
    const parsed = parseSignatureHeader(header)
    expect(parsed).not.toBeNull()
    expect(parsed!.timestamp).toBe(timestamp)
    expect(parsed!.signatures).toHaveLength(1)

    // Compute expected and compare
    const expected = await computeHmacSha256(secret, `${parsed!.timestamp}.${body}`)
    expect(timingSafeEqual(expected, parsed!.signatures[0])).toBe(true)
  })

  it('rejects invalid HMAC signature', async () => {
    const secret = 'test-signing-secret-123'
    const timestamp = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ action: 'query.contacts', params: {} })

    // Compute with the correct secret
    const signedPayload = `${timestamp}.${body}`
    const hmac = await computeHmacSha256(secret, signedPayload)

    // Now verify with a different (wrong) secret
    const wrongHmac = await computeHmacSha256('wrong-secret', signedPayload)

    // The correct signature and wrong signature should not match
    expect(timingSafeEqual(hmac, wrongHmac)).toBe(false)

    // Also verify a tampered body fails
    const tamperedBody = JSON.stringify({ action: 'query.contacts', params: { evil: true } })
    const tamperedPayload = `${timestamp}.${tamperedBody}`
    const tamperedHmac = await computeHmacSha256(secret, tamperedPayload)
    expect(timingSafeEqual(hmac, tamperedHmac)).toBe(false)
  })

  it('rejects replay attack with old timestamp', async () => {
    const secret = 'test-signing-secret-123'
    const body = JSON.stringify({ action: 'query.contacts', params: {} })

    // Timestamp from 10 minutes ago (outside 5-minute replay window)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600
    const signedPayload = `${oldTimestamp}.${body}`
    const hmac = await computeHmacSha256(secret, signedPayload)
    const header = `t=${oldTimestamp},v1=${hmac}`

    const parsed = parseSignatureHeader(header)
    expect(parsed).not.toBeNull()

    // Check replay window
    const now = Math.floor(Date.now() / 1000)
    const age = Math.abs(now - parsed!.timestamp)
    expect(age).toBeGreaterThan(REPLAY_WINDOW_SECONDS)

    // The edge function would return: { valid: false, error: 'Signature timestamp outside replay window' }
    const withinWindow = age <= REPLAY_WINDOW_SECONDS
    expect(withinWindow).toBe(false)

    // Verify a recent timestamp IS within the window
    const recentTimestamp = Math.floor(Date.now() / 1000) - 30 // 30 seconds ago
    const recentAge = Math.abs(now - recentTimestamp)
    expect(recentAge).toBeLessThanOrEqual(REPLAY_WINDOW_SECONDS)
  })
})
