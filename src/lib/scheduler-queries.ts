import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type { Workflow, WorkflowRun, ScheduledWorkflowRun } from './schemas';

// ============================================
// SCHEDULED WORKFLOWS
// ============================================

export interface ScheduledWorkflowWithLastRun extends Workflow {
  last_run?: WorkflowRun | null;
  next_scheduled_run?: ScheduledWorkflowRun | null;
}

/**
 * Get all scheduled workflows with their last run information
 */
export async function getScheduledWorkflows(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('workflows')
    .select(`
      *,
      workflow_runs (
        id,
        status,
        started_at,
        completed_at,
        error,
        created_at
      )
    `)
    .eq('trigger_type', 'scheduled')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform data to include only the most recent run
  const workflows = (data || []).map((workflow: any) => {
    const runs = workflow.workflow_runs || [];
    const lastRun = runs.length > 0 ? runs[0] : null;
    return {
      ...workflow,
      workflow_runs: undefined,
      last_run: lastRun,
    } as ScheduledWorkflowWithLastRun;
  });

  return workflows;
}

// ============================================
// SCHEDULER HEALTH
// ============================================

export interface SchedulerHealthStats {
  activeSchedules: number;
  nextRunTime: string | null;
  failedLast24h: number;
  pendingDispatches: number;
  pgCronEnabled: boolean;
}

/**
 * Get scheduler health statistics
 */
export async function getSchedulerHealth(client: SupabaseClient = getSupabase()): Promise<SchedulerHealthStats> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      activeSchedulesResult,
      nextRunResult,
      failedRunsResult,
      pendingDispatchesResult,
    ] = await Promise.all([
      // Count active scheduled workflows
      client
        .from('workflows')
        .select('id', { count: 'exact', head: true })
        .eq('trigger_type', 'scheduled')
        .eq('is_active', true),

      // Get next scheduled run
      client
        .from('scheduled_workflow_runs')
        .select('scheduled_at')
        .eq('status', 'pending')
        .gte('scheduled_at', now.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle(),

      // Count failed runs in last 24h
      client
        .from('scheduled_workflow_runs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('dispatched_at', twentyFourHoursAgo),

      // Count pending dispatches
      client
        .from('scheduled_workflow_runs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('scheduled_at', now.toISOString()),
    ]);

    return {
      activeSchedules: activeSchedulesResult.count ?? 0,
      nextRunTime: nextRunResult.data?.scheduled_at || null,
      failedLast24h: failedRunsResult.count ?? 0,
      pendingDispatches: pendingDispatchesResult.count ?? 0,
      pgCronEnabled: true, // Assume enabled if queries work
    };
  } catch (error) {
    // If queries fail, return default values
    return {
      activeSchedules: 0,
      nextRunTime: null,
      failedLast24h: 0,
      pendingDispatches: 0,
      pgCronEnabled: false,
    };
  }
}

// ============================================
// RUN HISTORY
// ============================================

export interface RunHistoryOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

/**
 * Get run history for a specific workflow
 */
export async function getRunHistory(
  workflowId: string,
  options: RunHistoryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  const { limit = 50, offset = 0, status } = options;

  let query = client
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getRunHistory',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

/**
 * Get scheduled run history for a specific workflow
 */
export async function getScheduledRunHistory(
  workflowId: string,
  options: RunHistoryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  const { limit = 50, offset = 0, status } = options;

  let query = client
    .from('scheduled_workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('scheduled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getScheduledRunHistory',
    returnFallback: true,
    fallback: [] as ScheduledWorkflowRun[],
  });
}

// ============================================
// WORKFLOW CONTROLS
// ============================================

/**
 * Pause a workflow (set is_active to false)
 */
export async function pauseWorkflow(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('workflows')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Resume a workflow (set is_active to true)
 */
export async function resumeWorkflow(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('workflows')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Trigger a workflow to run immediately (manual dispatch)
 */
export async function triggerWorkflowNow(id: string, client: SupabaseClient = getSupabase()) {
  // Call the workflow executor edge function
  const { data, error } = await client.functions.invoke('workflow-executor', {
    body: {
      workflow_id: id,
      trigger_type: 'manual',
      trigger_data: {
        triggered_at: new Date().toISOString(),
        triggered_by: 'scheduler-dashboard',
      },
    },
  });

  if (error) throw error;
  return data;
}
