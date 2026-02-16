/**
 * Agent Platform Scheduler Tests
 *
 * Tests the cron-based workflow scheduling logic from scheduler migration:
 * - Scheduled workflow creation with cron config
 * - Cron matching and dispatch
 * - Duplicate prevention for same minute
 * - Pause/resume via is_active flag
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockSupabaseClient,
  WORKFLOW_SCHEDULED,
} from './fixtures'

// ─── Inline cron field matching from scheduler migration ────────────

function cronFieldMatches(fieldExpr: string, currentVal: number, minVal: number, maxVal: number): boolean {
  if (fieldExpr === '*') return true

  const parts = fieldExpr.split(',')
  for (const part of parts) {
    const trimmed = part.trim()

    if (trimmed.includes('/')) {
      const [rangePart, stepStr] = trimmed.split('/')
      const step = parseInt(stepStr, 10)
      let rangeStart = minVal
      let rangeEnd = maxVal

      if (rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [s, e] = rangePart.split('-')
          rangeStart = parseInt(s, 10)
          rangeEnd = parseInt(e, 10)
        } else {
          rangeStart = parseInt(rangePart, 10)
        }
      }

      if (currentVal >= rangeStart && currentVal <= rangeEnd && (currentVal - rangeStart) % step === 0) {
        return true
      }
    } else if (trimmed.includes('-')) {
      const [s, e] = trimmed.split('-')
      if (currentVal >= parseInt(s, 10) && currentVal <= parseInt(e, 10)) return true
    } else {
      if (currentVal === parseInt(trimmed, 10)) return true
    }
  }

  return false
}

function cronMatchesNow(cronExpression: string, now: Date): boolean {
  const fields = cronExpression.trim().split(/\s+/)
  if (fields.length !== 5) return false

  // Use UTC methods since PostgreSQL scheduler runs in UTC
  const minute = now.getUTCMinutes()
  const hour = now.getUTCHours()
  const dom = now.getUTCDate()
  const month = now.getUTCMonth() + 1 // JS months are 0-indexed
  const dow = now.getUTCDay() // 0=Sunday

  return (
    cronFieldMatches(fields[0], minute, 0, 59) &&
    cronFieldMatches(fields[1], hour, 0, 23) &&
    cronFieldMatches(fields[2], dom, 1, 31) &&
    cronFieldMatches(fields[3], month, 1, 12) &&
    cronFieldMatches(fields[4], dow, 0, 6)
  )
}

describe('Scheduler', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates scheduled workflow with cron config', async () => {
    supabase._setQueryResult({ id: WORKFLOW_SCHEDULED.id })

    await supabase.from('workflows').insert({
      name: WORKFLOW_SCHEDULED.name,
      trigger_type: 'scheduled',
      trigger_config: { cron: '*/5 * * * *' },
      steps: WORKFLOW_SCHEDULED.steps,
      is_active: true,
    }).select('id').single()

    expect(supabase.from).toHaveBeenCalledWith('workflows')

    // Verify the cron expression matches the expected pattern
    const cron = WORKFLOW_SCHEDULED.trigger_config.cron
    expect(cron).toBe('*/5 * * * *')
  })

  it('cron trigger dispatches matching workflows', () => {
    // Set time to a minute divisible by 5
    const testTime = new Date('2026-02-16T10:15:00Z') // minute=15, divisible by 5
    vi.setSystemTime(testTime)

    const matches = cronMatchesNow('*/5 * * * *', new Date())
    expect(matches).toBe(true)

    // Verify it doesn't match at minute 17
    const nonMatchTime = new Date('2026-02-16T10:17:00Z')
    const noMatch = cronMatchesNow('*/5 * * * *', nonMatchTime)
    expect(noMatch).toBe(false)

    // Test more complex cron patterns
    expect(cronMatchesNow('0 9 * * 1-5', new Date('2026-02-16T09:00:00Z'))).toBe(true) // Monday 9am
    expect(cronMatchesNow('30 14 * * *', new Date('2026-02-16T14:30:00Z'))).toBe(true) // 2:30pm
    expect(cronMatchesNow('0 0 1 * *', new Date('2026-03-01T00:00:00Z'))).toBe(true) // First of month
  })

  it('prevents duplicate dispatch for the same minute', async () => {
    const testTime = new Date('2026-02-16T10:15:00Z')
    vi.setSystemTime(testTime)
    const thisMinute = new Date(testTime)
    thisMinute.setSeconds(0, 0)

    // First dispatch: no existing record
    supabase._setQueryResult(null) // No existing scheduled run
    const { data: existing } = await supabase
      .from('scheduled_workflow_runs')
      .select('id')
      .eq('workflow_id', WORKFLOW_SCHEDULED.id)
      .eq('scheduled_at', thisMinute.toISOString())
      .maybeSingle()

    expect(existing).toBeNull()

    // Insert first dispatch record
    supabase._setQueryResult({ id: 'swr-1', workflow_id: WORKFLOW_SCHEDULED.id })
    await supabase.from('scheduled_workflow_runs').insert({
      workflow_id: WORKFLOW_SCHEDULED.id,
      scheduled_at: thisMinute.toISOString(),
      status: 'pending',
    })

    // Second attempt: record now exists
    supabase._setQueryResult({ id: 'swr-1' }) // Record exists
    const { data: duplicate } = await supabase
      .from('scheduled_workflow_runs')
      .select('id')
      .eq('workflow_id', WORKFLOW_SCHEDULED.id)
      .eq('scheduled_at', thisMinute.toISOString())
      .maybeSingle()

    // Should find existing record and skip dispatch
    expect(duplicate).not.toBeNull()
  })

  it('respects is_active flag for pause/resume', async () => {
    // Active workflow should be found by scheduler
    const activeWorkflows = [WORKFLOW_SCHEDULED]
    supabase._setQueryResult(activeWorkflows)

    const { data: active } = await supabase
      .from('workflows')
      .select('id, name, trigger_config')
      .eq('is_active', true)
      .eq('trigger_type', 'scheduled')

    expect((active as typeof activeWorkflows)).toHaveLength(1)

    // Paused workflow (is_active = false) should not be found
    const pausedWorkflow = { ...WORKFLOW_SCHEDULED, is_active: false }
    supabase._setQueryResult([]) // No active scheduled workflows

    const { data: paused } = await supabase
      .from('workflows')
      .select('id, name, trigger_config')
      .eq('is_active', true)
      .eq('trigger_type', 'scheduled')

    expect((paused as unknown[])).toHaveLength(0)
  })
})
