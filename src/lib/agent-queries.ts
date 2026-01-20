import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import { SUPABASE_ERROR_CODES } from './constants';
import {
  AgentCommandSchema,
  AgentResponseSchema,
  AgentTaskSchema,
  AgentTaskRunSchema,
  AgentSessionSchema,
  AgentConfigSchema,
  AgentConfirmationSchema,
  parseResponse,
  type AgentCommand,
  type AgentResponse,
  type AgentTask,
  type AgentTaskRun,
  type AgentSession,
  type AgentConfig,
  type AgentConfirmation,
} from './schemas';

// Re-export types for consumers
export type {
  AgentCommand,
  AgentResponse,
  AgentTask,
  AgentTaskRun,
  AgentSession,
  AgentConfig,
  AgentConfirmation,
};

// ============================================
// AGENT COMMANDS
// ============================================

export async function getAgentCommands(
  sessionId?: string,
  status?: AgentCommand['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_commands')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentCommands',
    returnFallback: true,
    fallback: [] as AgentCommand[],
  });
}

export async function getAgentCommandById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_commands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'getAgentCommandById');
}

export async function getPendingAgentCommands(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getPendingAgentCommands',
    returnFallback: true,
    fallback: [] as AgentCommand[],
  });
}

export async function createAgentCommand(
  command: Omit<AgentCommand, 'id' | 'created_at' | 'received_at' | 'completed_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_commands')
    .insert(command)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'createAgentCommand');
}

export async function updateAgentCommandStatus(
  id: string,
  status: AgentCommand['status'],
  client: SupabaseClient = supabase
) {
  const update: Partial<AgentCommand> = { status };

  if (status === 'received') {
    update.received_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('agent_commands')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'updateAgentCommandStatus');
}

// ============================================
// AGENT RESPONSES
// ============================================

export async function getAgentResponses(
  sessionId?: string,
  commandId?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_responses')
    .select('*')
    .order('created_at', { ascending: true });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (commandId) {
    query = query.eq('command_id', commandId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentResponses',
    returnFallback: true,
    fallback: [] as AgentResponse[],
  });
}

export async function createAgentResponse(
  response: Omit<AgentResponse, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_responses')
    .insert(response)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentResponseSchema, data, 'createAgentResponse');
}

// ============================================
// AGENT TASKS
// ============================================

export async function getAgentTasks(
  status?: AgentTask['status'],
  taskType?: AgentTask['task_type'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (taskType) {
    query = query.eq('task_type', taskType);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentTasks',
    returnFallback: true,
    fallback: [] as AgentTask[],
  });
}

export async function getAgentTaskById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'getAgentTaskById');
}

export async function getScheduledAgentTasks(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_tasks')
    .select('*')
    .eq('status', 'active')
    .eq('task_type', 'scheduled')
    .order('next_run_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getScheduledAgentTasks',
    returnFallback: true,
    fallback: [] as AgentTask[],
  });
}

export async function createAgentTask(
  task: Omit<AgentTask, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'last_error' | 'run_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_tasks')
    .insert({ ...task, run_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'createAgentTask');
}

export async function updateAgentTask(
  id: string,
  task: Partial<AgentTask>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_tasks')
    .update({ ...task, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'updateAgentTask');
}

export async function deleteAgentTask(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('agent_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// AGENT TASK RUNS
// ============================================

export async function getAgentTaskRuns(
  taskId?: string,
  status?: AgentTaskRun['status'],
  limit = 50,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_task_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (taskId) {
    query = query.eq('task_id', taskId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentTaskRuns',
    returnFallback: true,
    fallback: [] as AgentTaskRun[],
  });
}

export async function createAgentTaskRun(
  run: Omit<AgentTaskRun, 'id' | 'started_at' | 'completed_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_task_runs')
    .insert(run)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskRunSchema, data, 'createAgentTaskRun');
}

export async function updateAgentTaskRun(
  id: string,
  run: Partial<AgentTaskRun>,
  client: SupabaseClient = supabase
) {
  const update = { ...run };
  if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('agent_task_runs')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskRunSchema, data, 'updateAgentTaskRun');
}

// ============================================
// AGENT SESSIONS
// ============================================

export async function getAgentSessions(
  userId?: string,
  activeOnly = false,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentSessions',
    returnFallback: true,
    fallback: [] as AgentSession[],
  });
}

export async function getAgentSessionById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'getAgentSessionById');
}

export async function createAgentSession(
  session: Omit<AgentSession, 'id' | 'created_at' | 'updated_at' | 'message_count' | 'last_message_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_sessions')
    .insert({ ...session, message_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'createAgentSession');
}

export async function updateAgentSession(
  id: string,
  session: Partial<AgentSession>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_sessions')
    .update({ ...session, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'updateAgentSession');
}

export async function closeAgentSession(id: string, client: SupabaseClient = supabase) {
  return updateAgentSession(id, { is_active: false }, client);
}

// ============================================
// AGENT CONFIG
// ============================================

export async function getAgentConfig(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_config')
    .select('*')
    .order('key');

  return handleQueryResult(data, error, {
    operation: 'getAgentConfig',
    returnFallback: true,
    fallback: [] as AgentConfig[],
  });
}

export async function getAgentConfigByKey(key: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_config')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== SUPABASE_ERROR_CODES.NOT_FOUND) throw error;
  return data ? parseResponse(AgentConfigSchema, data, 'getAgentConfigByKey') : null;
}

export async function upsertAgentConfig(
  key: string,
  value: unknown,
  description?: string,
  isSecret = false,
  updatedBy?: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_config')
    .upsert(
      {
        key,
        value,
        description,
        is_secret: isSecret,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfigSchema, data, 'upsertAgentConfig');
}

export async function deleteAgentConfig(key: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('agent_config')
    .delete()
    .eq('key', key);

  if (error) throw error;
}

// ============================================
// AGENT CONFIRMATIONS
// ============================================

export async function getAgentConfirmations(
  sessionId?: string,
  status?: AgentConfirmation['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_confirmations')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentConfirmations',
    returnFallback: true,
    fallback: [] as AgentConfirmation[],
  });
}

export async function getPendingAgentConfirmations(
  sessionId: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getPendingAgentConfirmations',
    returnFallback: true,
    fallback: [] as AgentConfirmation[],
  });
}

export async function createAgentConfirmation(
  confirmation: Omit<AgentConfirmation, 'id' | 'created_at' | 'responded_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .insert(confirmation)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfirmationSchema, data, 'createAgentConfirmation');
}

export async function respondToAgentConfirmation(
  id: string,
  approved: boolean,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .update({
      status: approved ? 'approved' : 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfirmationSchema, data, 'respondToAgentConfirmation');
}
