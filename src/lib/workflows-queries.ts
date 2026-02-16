import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import {
  Workflow,
  WorkflowRun,
  WorkflowQueryOptions,
  WorkflowRunQueryOptions,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  AgentListItem,
  WorkflowTriggerType,
} from './workflows-schemas';

// ============================================
// WORKFLOWS
// ============================================

/**
 * Get workflows with optional filtering and search
 */
export async function getWorkflows(
  options: Partial<WorkflowQueryOptions> = {},
  client: SupabaseClient = getSupabase()
): Promise<Workflow[]> {
  let query = client
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (options.trigger_type) {
    query = query.eq('trigger_type', options.trigger_type);
  }

  if (options.is_active !== undefined) {
    query = query.eq('is_active', options.is_active);
  }

  // Apply search across name and description
  if (options.search && options.search.trim()) {
    const searchTerm = `%${options.search.trim()}%`;
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getWorkflows',
    returnFallback: true,
    fallback: [] as Workflow[],
  });
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(
  id: string,
  client: SupabaseClient = getSupabase()
): Promise<Workflow> {
  const { data, error } = await client
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  workflow: CreateWorkflowInput,
  client: SupabaseClient = getSupabase()
): Promise<Workflow> {
  const { data, error } = await client
    .from('workflows')
    .insert(workflow)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  id: string,
  workflow: UpdateWorkflowInput,
  client: SupabaseClient = getSupabase()
): Promise<Workflow> {
  const { data, error } = await client
    .from('workflows')
    .update(workflow)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
  id: string,
  client: SupabaseClient = getSupabase()
): Promise<void> {
  const { error } = await client
    .from('workflows')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Toggle workflow active status
 */
export async function toggleWorkflowActive(
  id: string,
  isActive: boolean,
  client: SupabaseClient = getSupabase()
): Promise<Workflow> {
  const { data, error } = await client
    .from('workflows')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

/**
 * Get workflows by trigger type
 */
export async function getWorkflowsByTriggerType(
  triggerType: WorkflowTriggerType,
  client: SupabaseClient = getSupabase()
): Promise<Workflow[]> {
  return getWorkflows({ trigger_type: triggerType }, client);
}

/**
 * Get active workflows only
 */
export async function getActiveWorkflows(
  client: SupabaseClient = getSupabase()
): Promise<Workflow[]> {
  return getWorkflows({ is_active: true }, client);
}

/**
 * Search workflows by name or description
 */
export async function searchWorkflows(
  searchTerm: string,
  client: SupabaseClient = getSupabase()
): Promise<Workflow[]> {
  return getWorkflows({ search: searchTerm }, client);
}

// ============================================
// WORKFLOW RUNS
// ============================================

/**
 * Get workflow runs with optional filtering
 */
export async function getWorkflowRuns(
  workflowId: string,
  options: Partial<WorkflowRunQueryOptions> = {},
  client: SupabaseClient = getSupabase()
): Promise<WorkflowRun[]> {
  let query = client
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  // Apply status filter
  if (options.status) {
    query = query.eq('status', options.status);
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getWorkflowRuns',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

/**
 * Get a single workflow run by ID
 */
export async function getWorkflowRun(
  runId: string,
  client: SupabaseClient = getSupabase()
): Promise<WorkflowRun> {
  const { data, error } = await client
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) throw error;
  return data as WorkflowRun;
}

/**
 * Get recent runs across all workflows
 */
export async function getRecentWorkflowRuns(
  limit: number = 50,
  client: SupabaseClient = getSupabase()
): Promise<WorkflowRun[]> {
  const { data, error } = await client
    .from('workflow_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getRecentWorkflowRuns',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

/**
 * Get failed workflow runs
 */
export async function getFailedWorkflowRuns(
  workflowId?: string,
  limit: number = 50,
  client: SupabaseClient = getSupabase()
): Promise<WorkflowRun[]> {
  let query = client
    .from('workflow_runs')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getFailedWorkflowRuns',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

/**
 * Get running workflow runs
 */
export async function getRunningWorkflowRuns(
  client: SupabaseClient = getSupabase()
): Promise<WorkflowRun[]> {
  const { data, error } = await client
    .from('workflow_runs')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getRunningWorkflowRuns',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

/**
 * Trigger a workflow manually
 */
export async function triggerWorkflow(
  id: string,
  client: SupabaseClient = getSupabase()
): Promise<{ success: boolean; run_id?: string; error?: string }> {
  try {
    // Call the workflow-executor edge function
    const { data, error } = await client.functions.invoke('workflow-executor', {
      body: {
        workflow_id: id,
        trigger_type: 'manual',
        trigger_data: {},
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to trigger workflow',
      };
    }

    return {
      success: true,
      run_id: data?.run_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// WORKFLOW STATISTICS
// ============================================

export interface WorkflowStats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  running_runs: number;
  average_duration_ms: number;
  success_rate: number;
  last_run_at: string | null;
}

/**
 * Get workflow statistics
 */
export async function getWorkflowStats(
  workflowId: string,
  client: SupabaseClient = getSupabase()
): Promise<WorkflowStats> {
  const { data, error } = await client.rpc('get_workflow_stats', {
    p_workflow_id: workflowId,
  });

  if (error) {
    // If RPC doesn't exist, calculate manually
    const runs = await getWorkflowRuns(workflowId, { limit: 100 }, client);

    const totalRuns = runs.length;
    const successfulRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const runningRuns = runs.filter(r => r.status === 'running').length;

    // Calculate average duration for completed runs
    const completedWithDuration = runs.filter(
      r => r.status === 'completed' && r.started_at && r.completed_at
    );
    const averageDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, run) => {
          const duration = new Date(run.completed_at!).getTime() - new Date(run.started_at!).getTime();
          return sum + duration;
        }, 0) / completedWithDuration.length
      : 0;

    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    const lastRun = runs.length > 0 ? runs[0].created_at : null;

    return {
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      running_runs: runningRuns,
      average_duration_ms: Math.round(averageDuration),
      success_rate: Math.round(successRate * 100) / 100,
      last_run_at: lastRun,
    };
  }

  return data as WorkflowStats;
}

// ============================================
// AGENTS LIST FOR STEP BUILDER
// ============================================

/**
 * Get list of active agents for workflow step builder
 */
export async function getAgentsList(
  client: SupabaseClient = getSupabase()
): Promise<AgentListItem[]> {
  const { data, error } = await client
    .from('agents')
    .select('id, name, type, status, capabilities')
    .eq('status', 'active')
    .order('name', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getAgentsList',
    returnFallback: true,
    fallback: [] as AgentListItem[],
  });
}

/**
 * Get list of all agents (including inactive) for workflow step builder
 */
export async function getAllAgentsList(
  client: SupabaseClient = getSupabase()
): Promise<AgentListItem[]> {
  const { data, error } = await client
    .from('agents')
    .select('id, name, type, status, capabilities')
    .order('name', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getAllAgentsList',
    returnFallback: true,
    fallback: [] as AgentListItem[],
  });
}

/**
 * Get agents by capability
 */
export async function getAgentsByCapability(
  capability: string,
  client: SupabaseClient = getSupabase()
): Promise<AgentListItem[]> {
  const { data, error } = await client
    .from('agents')
    .select('id, name, type, status, capabilities')
    .contains('capabilities', [capability])
    .eq('status', 'active')
    .order('name', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getAgentsByCapability',
    returnFallback: true,
    fallback: [] as AgentListItem[],
  });
}

// ============================================
// WORKFLOW DUPLICATION
// ============================================

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(
  id: string,
  newName?: string,
  client: SupabaseClient = getSupabase()
): Promise<Workflow> {
  const original = await getWorkflow(id, client);

  const duplicate: CreateWorkflowInput = {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    trigger_type: original.trigger_type,
    trigger_config: original.trigger_config,
    steps: original.steps,
    is_active: false, // Start duplicated workflows as inactive
    created_by: original.created_by,
  };

  return createWorkflow(duplicate, client);
}

// ============================================
// WORKFLOW VALIDATION
// ============================================

export interface WorkflowValidationError {
  field: string;
  message: string;
}

/**
 * Validate a workflow before saving
 */
export function validateWorkflow(workflow: CreateWorkflowInput | UpdateWorkflowInput): {
  valid: boolean;
  errors: WorkflowValidationError[];
} {
  const errors: WorkflowValidationError[] = [];

  // Validate name
  if ('name' in workflow) {
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Workflow name is required' });
    } else if (workflow.name.length > 255) {
      errors.push({ field: 'name', message: 'Workflow name must be less than 255 characters' });
    }
  }

  // Validate trigger type and config
  if ('trigger_type' in workflow && workflow.trigger_type) {
    if (workflow.trigger_type === 'scheduled') {
      const config = workflow.trigger_config as { cron?: string };
      if (!config?.cron || typeof config.cron !== 'string') {
        errors.push({ field: 'trigger_config', message: 'Scheduled workflows require a cron expression' });
      }
    } else if (workflow.trigger_type === 'event') {
      const config = workflow.trigger_config as { event_type?: string };
      if (!config?.event_type || typeof config.event_type !== 'string') {
        errors.push({ field: 'trigger_config', message: 'Event workflows require an event type' });
      }
    }
  }

  // Validate steps
  if ('steps' in workflow && Array.isArray(workflow.steps)) {
    workflow.steps.forEach((step, index) => {
      const stepData = step as { type?: string; config?: unknown };

      if (!stepData.type) {
        errors.push({ field: `steps[${index}]`, message: 'Step type is required' });
      }

      if (stepData.type === 'agent_command') {
        const config = stepData.config as { command?: string };
        if (!config?.command) {
          errors.push({ field: `steps[${index}].config`, message: 'Agent command step requires a command' });
        }
      } else if (stepData.type === 'wait') {
        const config = stepData.config as { duration_ms?: number };
        if (typeof config?.duration_ms !== 'number' || config.duration_ms <= 0) {
          errors.push({ field: `steps[${index}].config`, message: 'Wait step requires a positive duration' });
        }
      } else if (stepData.type === 'condition') {
        const config = stepData.config as { expression?: string };
        if (!config?.expression) {
          errors.push({ field: `steps[${index}].config`, message: 'Condition step requires an expression' });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
