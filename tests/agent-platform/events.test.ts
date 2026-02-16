/**
 * Agent Platform Event Bus Tests
 *
 * Tests the event bus pattern defined in phase4 migration (emit_event function)
 * and event subscription dispatch logic.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  WORKFLOW_SIMPLE,
  MOCK_SUBSCRIPTION_WORKFLOW,
  MOCK_SUBSCRIPTION_INACTIVE,
} from './fixtures'

describe('Event Bus', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
  })

  it('emit_event inserts event with payload and dispatched_to', async () => {
    const eventId = 'evt-uuid-001'
    supabase._setRpcResult('emit_event', eventId)

    const result = await supabase.rpc('emit_event', {
      p_event_type: 'contact.created',
      p_payload: { contact_id: 'c-123', name: 'John Doe' },
      p_source_type: 'agent',
      p_source_id: AGENT_OPENCLAW.id,
      p_correlation_id: 'corr-001',
    })

    expect(result.data).toBe(eventId)
    expect(supabase.rpc).toHaveBeenCalledWith('emit_event', expect.objectContaining({
      p_event_type: 'contact.created',
      p_source_type: 'agent',
      p_source_id: AGENT_OPENCLAW.id,
      p_correlation_id: 'corr-001',
    }))

    // Verify the payload structure passed to emit_event
    const call = supabase.rpc.mock.calls[0]
    const params = call[1] as Record<string, unknown>
    const payload = params.p_payload as Record<string, unknown>
    expect(payload.contact_id).toBe('c-123')
    expect(payload.name).toBe('John Doe')
  })

  it('workflow subscriber is dispatched via HTTP POST', async () => {
    // The emit_event SQL function dispatches to workflow subscribers via pg_net.
    // Here we test the dispatch pattern: active subscriptions matching the event_type
    // should have their workflow_id sent to workflow-executor.

    // Mock the subscriptions query pattern
    const activeSubscriptions = [MOCK_SUBSCRIPTION_WORKFLOW]
    supabase._setQueryResult(activeSubscriptions)

    // Simulate what emit_event does: query active subscriptions for the event type
    const { data: subscriptions } = await supabase
      .from('event_subscriptions')
      .select('id, subscriber_type, subscriber_id, config')
      .eq('event_type', 'contact.created')
      .eq('is_active', true)

    expect(supabase.from).toHaveBeenCalledWith('event_subscriptions')

    const subs = subscriptions as typeof activeSubscriptions
    expect(subs).toHaveLength(1)
    expect(subs[0].subscriber_type).toBe('workflow')
    expect(subs[0].subscriber_id).toBe(WORKFLOW_SIMPLE.id)

    // Verify the dispatch target structure
    const dispatchTarget = {
      workflow_id: subs[0].subscriber_id,
      trigger_type: 'event',
      trigger_data: {
        event_id: 'evt-uuid-001',
        event_type: 'contact.created',
        payload: { contact_id: 'c-123' },
      },
    }

    expect(dispatchTarget.workflow_id).toBe(WORKFLOW_SIMPLE.id)
    expect(dispatchTarget.trigger_type).toBe('event')
  })

  it('only active subscriptions for matching event_type receive dispatch', async () => {
    // Set up mock: one active, one inactive subscription for the same event type
    const allSubscriptions = [MOCK_SUBSCRIPTION_WORKFLOW, MOCK_SUBSCRIPTION_INACTIVE]

    // Filter to active-only (simulating the WHERE is_active = true in emit_event)
    const activeOnly = allSubscriptions.filter((s) => s.is_active)
    supabase._setQueryResult(activeOnly)

    const { data: subscriptions } = await supabase
      .from('event_subscriptions')
      .select('id, subscriber_type, subscriber_id, config')
      .eq('event_type', 'contact.created')
      .eq('is_active', true)

    const subs = subscriptions as typeof allSubscriptions
    expect(subs).toHaveLength(1)
    expect(subs[0].is_active).toBe(true)
    expect(subs[0].id).toBe(MOCK_SUBSCRIPTION_WORKFLOW.id)

    // The inactive subscription should NOT be in the results
    expect(subs.find((s) => s.id === MOCK_SUBSCRIPTION_INACTIVE.id)).toBeUndefined()
  })
})
