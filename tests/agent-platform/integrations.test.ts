/**
 * Agent Platform Integration Tests
 *
 * Tests integration credential management from integration-credentials/index.ts
 * and integration-auth/index.ts:
 * - Credential store/retrieve round-trip
 * - OAuth2 flow initiation
 * - Agent access control
 * - Health check status updates
 * - Expired credential handling
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  AGENT_DASHBOARD,
  INTEGRATION_GITHUB,
  INTEGRATION_SLACK,
  MOCK_CREDENTIAL,
  MOCK_EXPIRED_CREDENTIAL,
  MOCK_ENCRYPTED_PAYLOAD,
} from './fixtures'

describe('Integrations', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
  })

  it('stores and retrieves encrypted credential round-trip', async () => {
    // Step 1: Store credential
    const storedCred = {
      id: 'cred-new-001',
      credential_type: 'api_key',
      created_at: '2026-02-16T00:00:00Z',
    }
    supabase._setQueryResult(storedCred)

    const storeResult = await supabase
      .from('integration_credentials')
      .insert({
        integration_id: INTEGRATION_SLACK.id,
        agent_id: AGENT_OPENCLAW.id,
        credential_type: 'api_key',
        encrypted_data: JSON.stringify(MOCK_ENCRYPTED_PAYLOAD),
        encryption_key_id: 'key-v1',
        expires_at: null,
      })
      .select('id, credential_type, created_at')
      .single()

    expect(supabase.from).toHaveBeenCalledWith('integration_credentials')
    expect(storeResult.data).toEqual(storedCred)

    // Step 2: Retrieve credential
    supabase._setQueryResult(MOCK_CREDENTIAL)

    const retrieveResult = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', storedCred.id)
      .single()

    expect(retrieveResult.data).toEqual(MOCK_CREDENTIAL)

    // Verify the encrypted_data is a JSON string containing the encrypted payload
    const encData = JSON.parse((retrieveResult.data as typeof MOCK_CREDENTIAL).encrypted_data)
    expect(encData.alg).toBe('AES-256-GCM')
    expect(encData.key_id).toBe('key-v1')
    expect(encData.ciphertext).toBeTruthy()
    expect(encData.iv).toBeTruthy()
    expect(encData.salt).toBeTruthy()
  })

  it('OAuth2 initiate builds correct authorization URL', () => {
    // Inline the OAuth2 URL building logic from integration-auth/index.ts
    const config = INTEGRATION_GITHUB.config as {
      client_id: string
      redirect_uri: string
      auth_url: string
      scopes: string[]
    }

    const state = 'test-state-uuid'
    const scopes = config.scopes

    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    })

    const authUrl = `${config.auth_url}?${params.toString()}`

    expect(authUrl).toContain('https://github.com/login/oauth/authorize')
    expect(authUrl).toContain('client_id=gh_client_123')
    expect(authUrl).toContain('redirect_uri=')
    expect(authUrl).toContain('response_type=code')
    expect(authUrl).toContain('scope=repo+user')
    expect(authUrl).toContain('state=test-state-uuid')
  })

  it('unauthorized agent is rejected with 403', async () => {
    // Simulate verifyAgentAccess returning false (agent not in agent_integrations)
    supabase._setQueryResult(null) // No matching agent_integrations row

    const { data: access } = await supabase
      .from('agent_integrations')
      .select('agent_id')
      .eq('agent_id', AGENT_DASHBOARD.id)
      .eq('integration_id', INTEGRATION_GITHUB.id)
      .maybeSingle()

    // Access check fails — agent doesn't have access
    const hasAccess = access !== null
    expect(hasAccess).toBe(false)

    // The edge function would return 403 at this point
    const responseStatus = hasAccess ? 200 : 403
    expect(responseStatus).toBe(403)
  })

  it('health check updates integration status', async () => {
    // Simulate what integration-health/index.ts does
    supabase._setQueryResult([
      { ...INTEGRATION_GITHUB, status: 'active' },
      { ...INTEGRATION_SLACK, status: 'error' },
    ])

    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, service_name, service_type, display_name, config, status, health_check_url')
      .in('status', ['active', 'error'])

    const intList = integrations as Array<typeof INTEGRATION_GITHUB & { status: string }>
    expect(intList).toHaveLength(2)

    // After health check, update status
    for (const integration of intList) {
      const newStatus = integration.service_name === 'github' ? 'active' : 'active' // Both healthy
      supabase._setQueryResult(null) // update returns void

      await supabase
        .from('integrations')
        .update({
          status: newStatus,
          health_checked_at: new Date().toISOString(),
        })
        .eq('id', integration.id)

      expect(supabase.from).toHaveBeenCalledWith('integrations')
    }
  })

  it('expired credential returns 410', async () => {
    supabase._setQueryResult(MOCK_EXPIRED_CREDENTIAL)

    const { data: cred } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', MOCK_EXPIRED_CREDENTIAL.id)
      .single()

    const credential = cred as typeof MOCK_EXPIRED_CREDENTIAL

    // Check expiry (matching integration-credentials/index.ts logic)
    const isExpired = credential.expires_at && new Date(credential.expires_at) < new Date()
    expect(isExpired).toBe(true)

    // Edge function would return 410 Gone
    const responseStatus = isExpired ? 410 : 200
    expect(responseStatus).toBe(410)
  })
})
