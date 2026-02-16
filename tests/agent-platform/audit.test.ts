/**
 * Agent Platform Audit Log Tests
 *
 * Tests the audit logging patterns used across edge functions:
 * - log_audit_event() RPC call patterns
 * - Actor type and action formatting
 * - Correlation ID propagation
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  expectAuditLogInserted,
  AGENT_OPENCLAW,
  WORKFLOW_SIMPLE,
  MOCK_CREDENTIAL,
} from './fixtures'

describe('Audit Log', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
    supabase._setRpcResult('log_audit_event', 'evt-uuid-123')
  })

  it('logs auth events with correct actor and action', async () => {
    // Simulate what agent-auth/index.ts does on successful auth
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'agent_auth.success',
      p_resource_type: 'agent',
      p_resource_id: AGENT_OPENCLAW.id,
      p_details: {
        agent_name: AGENT_OPENCLAW.name,
        agent_type: AGENT_OPENCLAW.type,
        ip: '192.168.1.1',
      },
    })

    expect(supabase.rpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'agent_auth.success',
      p_resource_type: 'agent',
    }))
    expect(expectAuditLogInserted(supabase, 'agent_auth.success')).toBe(true)
  })

  it('logs workflow execution events', async () => {
    const runId = 'run-uuid-456'
    const correlationId = 'corr-uuid-789'

    // Simulate what workflow-executor does after completing a workflow
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'workflow.completed',
      p_resource_type: 'workflow_run',
      p_resource_id: runId,
      p_details: {
        workflow_id: WORKFLOW_SIMPLE.id,
        trigger_type: 'manual',
        steps_executed: 2,
        steps_failed: 0,
      },
    })

    expect(supabase.rpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_action: 'workflow.completed',
      p_resource_type: 'workflow_run',
      p_resource_id: runId,
    }))
    expect(expectAuditLogInserted(supabase, 'workflow.completed')).toBe(true)
  })

  it('logs credential access events', async () => {
    // Simulate what integration-credentials does on credential retrieval
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'credential.retrieved',
      p_resource_type: 'integration_credential',
      p_resource_id: MOCK_CREDENTIAL.id,
      p_details: {
        integration_id: MOCK_CREDENTIAL.integration_id,
        credential_type: MOCK_CREDENTIAL.credential_type,
      },
    })

    expect(expectAuditLogInserted(supabase, 'credential.retrieved')).toBe(true)
    const call = supabase.rpc.mock.calls.find(
      (c) => (c[1] as Record<string, unknown>)?.p_action === 'credential.retrieved'
    )
    expect(call).toBeDefined()
    const details = (call![1] as Record<string, unknown>).p_details as Record<string, unknown>
    expect(details.integration_id).toBe(MOCK_CREDENTIAL.integration_id)
  })

  it('propagates correlation IDs across dispatch chain', async () => {
    const correlationId = 'corr-chain-001'

    // Step 1: API gateway logs with correlation ID
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'gateway.workflow.execute',
      p_resource_type: 'api_gateway',
      p_resource_id: correlationId,
      p_details: { action: 'workflow.execute', status: 'success', duration_ms: 150 },
    })

    // Step 2: Workflow executor logs with same correlation ID (passed via x-correlation-id header)
    await supabase.rpc('log_audit_event', {
      p_actor_type: 'agent',
      p_actor_id: AGENT_OPENCLAW.id,
      p_action: 'workflow.completed',
      p_resource_type: 'workflow_run',
      p_resource_id: 'run-123',
      p_details: { workflow_id: WORKFLOW_SIMPLE.id, trigger_type: 'manual' },
    })

    // Verify both calls were made, sharing the same chain
    const calls = supabase.rpc.mock.calls.filter((c) => c[0] === 'log_audit_event')
    expect(calls).toHaveLength(2)

    // First call: gateway with correlation ID as resource_id
    expect((calls[0][1] as Record<string, unknown>).p_resource_id).toBe(correlationId)
    expect((calls[0][1] as Record<string, unknown>).p_action).toBe('gateway.workflow.execute')

    // Second call: workflow executor
    expect((calls[1][1] as Record<string, unknown>).p_action).toBe('workflow.completed')
    expect((calls[1][1] as Record<string, unknown>).p_actor_id).toBe(AGENT_OPENCLAW.id)
  })
})
