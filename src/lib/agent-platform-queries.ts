import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import {
  type AgentPlatform,
  type Workflow,
  type WorkflowRun,
  type Integration,
  type AgentIntegration,
  type ScheduledWorkflowRun,
  type CapabilityDefinition,
  type AgentSkill,
  type AgentSkillWithCapability,
  type EventType,
  type EventSubscription,
  type Event,
  type IntegrationAction,
  type StepTemplate,
} from './schemas';

// ============================================
// AGENTS
// ============================================

export async function getAgents(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getAgents',
    returnFallback: true,
    fallback: [] as AgentPlatform[],
  });
}

export async function getAgentById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as AgentPlatform;
}

export async function createAgent(
  agent: Omit<AgentPlatform, 'id' | 'created_at' | 'updated_at' | 'api_key_prefix' | 'health_status' | 'last_seen_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agents')
    .insert(agent)
    .select()
    .single();

  if (error) throw error;
  return data as AgentPlatform;
}

export async function updateAgent(
  id: string,
  agent: Partial<AgentPlatform>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agents')
    .update(agent)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AgentPlatform;
}

export async function deleteAgent(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function generateAgentApiKey(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('generate_agent_api_key', { agent_id: agentId });
  if (error) throw error;
  return data as string;
}

export async function rotateAgentApiKey(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('rotate_agent_api_key', { agent_id: agentId });
  if (error) throw error;
  return data as string;
}

export async function revokeAgentApiKey(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('revoke_agent_api_key', { agent_id: agentId });
  if (error) throw error;
  return data;
}

// ============================================
// WORKFLOWS
// ============================================

export async function getWorkflows(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getWorkflows',
    returnFallback: true,
    fallback: [] as Workflow[],
  });
}

export async function getWorkflowById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Workflow;
}

export async function createWorkflow(
  workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('workflows')
    .insert(workflow)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

export async function updateWorkflow(
  id: string,
  workflow: Partial<Workflow>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('workflows')
    .update(workflow)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workflow;
}

export async function deleteWorkflow(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('workflows')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// WORKFLOW RUNS
// ============================================

export async function getWorkflowRuns(
  workflowId?: string,
  limit = 50,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('workflow_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getWorkflowRuns',
    returnFallback: true,
    fallback: [] as WorkflowRun[],
  });
}

// ============================================
// INTEGRATIONS
// ============================================

export async function getIntegrations(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('integrations')
    .select('*')
    .order('display_name');

  return handleQueryResult(data, error, {
    operation: 'getIntegrations',
    returnFallback: true,
    fallback: [] as Integration[],
  });
}

export async function createIntegration(
  integration: Omit<Integration, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('integrations')
    .insert(integration)
    .select()
    .single();

  if (error) throw error;
  return data as Integration;
}

export async function updateIntegration(
  id: string,
  integration: Partial<Integration>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('integrations')
    .update(integration)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Integration;
}

export async function deleteIntegration(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('integrations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// AGENT-INTEGRATION ACCESS
// ============================================

export async function getAgentIntegrations(agentId: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_integrations')
    .select('*, integrations(*)')
    .eq('agent_id', agentId);

  return handleQueryResult(data, error, {
    operation: 'getAgentIntegrations',
    returnFallback: true,
    fallback: [] as (AgentIntegration & { integrations: Integration })[],
  });
}

export async function getIntegrationAgents(integrationId: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_integrations')
    .select('*, agents(*)')
    .eq('integration_id', integrationId);

  return handleQueryResult(data, error, {
    operation: 'getIntegrationAgents',
    returnFallback: true,
    fallback: [] as (AgentIntegration & { agents: AgentPlatform })[],
  });
}

export async function grantIntegrationAccess(
  agentId: string,
  integrationId: string,
  scopes: string[],
  grantedBy: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_integrations')
    .insert({
      agent_id: agentId,
      integration_id: integrationId,
      granted_scopes: scopes,
      granted_by: grantedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentIntegration;
}

export async function revokeIntegrationAccess(
  agentId: string,
  integrationId: string,
  client: SupabaseClient = getSupabase()
) {
  const { error } = await client
    .from('agent_integrations')
    .delete()
    .eq('agent_id', agentId)
    .eq('integration_id', integrationId);

  if (error) throw error;
}

// ============================================
// SCHEDULED RUNS
// ============================================

export async function getScheduledWorkflowRuns(
  workflowId?: string,
  limit = 50,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('scheduled_workflow_runs')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getScheduledWorkflowRuns',
    returnFallback: true,
    fallback: [] as ScheduledWorkflowRun[],
  });
}

// ============================================
// PLATFORM STATS
// ============================================

export interface AgentPlatformStats {
  totalAgents: number;
  activeAgents: number;
  totalWorkflows: number;
  activeWorkflows: number;
  integrations: number;
  recentRuns: number;
  failedRuns: number;
  capabilities: number;
  eventTypes: number;
}

export async function getAgentPlatformStats(
  client: SupabaseClient = getSupabase()
): Promise<AgentPlatformStats> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    totalAgentsResult,
    activeAgentsResult,
    totalWorkflowsResult,
    activeWorkflowsResult,
    integrationsResult,
    recentRunsResult,
    failedRunsResult,
    capabilitiesResult,
    eventTypesResult,
  ] = await Promise.all([
    client.from('agents').select('id', { count: 'exact', head: true }),
    client.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('workflows').select('id', { count: 'exact', head: true }),
    client.from('workflows').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('integrations').select('id', { count: 'exact', head: true }),
    client.from('workflow_runs').select('id', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo),
    client.from('workflow_runs').select('id', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo).eq('status', 'failed'),
    client.from('capability_definitions').select('name', { count: 'exact', head: true }),
    client.from('event_types').select('name', { count: 'exact', head: true }),
  ]);

  return {
    totalAgents: totalAgentsResult.count ?? 0,
    activeAgents: activeAgentsResult.count ?? 0,
    totalWorkflows: totalWorkflowsResult.count ?? 0,
    activeWorkflows: activeWorkflowsResult.count ?? 0,
    integrations: integrationsResult.count ?? 0,
    recentRuns: recentRunsResult.count ?? 0,
    failedRuns: failedRunsResult.count ?? 0,
    capabilities: capabilitiesResult.count ?? 0,
    eventTypes: eventTypesResult.count ?? 0,
  };
}

// ============================================
// CAPABILITY DEFINITIONS (Phase 4)
// ============================================

export async function getCapabilityDefinitions(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('capability_definitions')
    .select('*')
    .order('category, name');

  return handleQueryResult(data, error, {
    operation: 'getCapabilityDefinitions',
    returnFallback: true,
    fallback: [] as CapabilityDefinition[],
  });
}

export async function createCapabilityDefinition(
  capability: Omit<CapabilityDefinition, 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('capability_definitions')
    .insert(capability)
    .select()
    .single();

  if (error) throw error;
  return data as CapabilityDefinition;
}

export async function deleteCapabilityDefinition(name: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('capability_definitions')
    .delete()
    .eq('name', name);

  if (error) throw error;
}

// ============================================
// AGENT SKILLS (Phase 4)
// ============================================

export async function getAgentSkills(agentId: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_skills')
    .select('*, capability_definitions(*)')
    .eq('agent_id', agentId)
    .order('proficiency', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getAgentSkills',
    returnFallback: true,
    fallback: [] as AgentSkillWithCapability[],
  });
}

export async function getSkillAgents(capabilityName: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_skills')
    .select('*, agents(id, name, type, status)')
    .eq('capability_name', capabilityName)
    .order('proficiency', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getSkillAgents',
    returnFallback: true,
    fallback: [] as (AgentSkill & { agents: AgentPlatform })[],
  });
}

export async function assignAgentSkill(
  agentId: string,
  capabilityName: string,
  proficiency: number,
  grantedBy: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_skills')
    .upsert({
      agent_id: agentId,
      capability_name: capabilityName,
      proficiency,
      granted_by: grantedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentSkill;
}

export async function removeAgentSkill(
  agentId: string,
  capabilityName: string,
  client: SupabaseClient = getSupabase()
) {
  const { error } = await client
    .from('agent_skills')
    .delete()
    .eq('agent_id', agentId)
    .eq('capability_name', capabilityName);

  if (error) throw error;
}

export async function getBestAgentForSkill(
  capabilityName: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client.rpc('get_best_agent_for_skill', {
    p_capability_name: capabilityName,
  });

  if (error) throw error;
  return data?.[0] as { agent_id: string; agent_name: string; proficiency: number } | null;
}

// ============================================
// SIGNING SECRETS (Phase 4)
// ============================================

export async function generateSigningSecret(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('generate_signing_secret', { p_agent_id: agentId });
  if (error) throw error;
  return data as string;
}

export async function rotateSigningSecret(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('rotate_signing_secret', { p_agent_id: agentId });
  if (error) throw error;
  return data as string;
}

export async function revokeSigningSecret(agentId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client.rpc('revoke_signing_secret', { p_agent_id: agentId });
  if (error) throw error;
  return data;
}

// ============================================
// EVENT TYPES (Phase 4)
// ============================================

export async function getEventTypes(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('event_types')
    .select('*')
    .order('category, name');

  return handleQueryResult(data, error, {
    operation: 'getEventTypes',
    returnFallback: true,
    fallback: [] as EventType[],
  });
}

export async function createEventType(
  eventType: Omit<EventType, 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('event_types')
    .insert(eventType)
    .select()
    .single();

  if (error) throw error;
  return data as EventType;
}

export async function deleteEventType(name: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('event_types')
    .delete()
    .eq('name', name);

  if (error) throw error;
}

// ============================================
// EVENT SUBSCRIPTIONS (Phase 4)
// ============================================

export async function getEventSubscriptions(
  eventType?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('event_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEventSubscriptions',
    returnFallback: true,
    fallback: [] as EventSubscription[],
  });
}

export async function createEventSubscription(
  subscription: Omit<EventSubscription, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('event_subscriptions')
    .insert(subscription)
    .select()
    .single();

  if (error) throw error;
  return data as EventSubscription;
}

export async function updateEventSubscription(
  id: string,
  subscription: Partial<EventSubscription>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('event_subscriptions')
    .update(subscription)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EventSubscription;
}

export async function deleteEventSubscription(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('event_subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// EVENTS (Phase 4)
// ============================================

export async function getEvents(
  options: {
    eventType?: string;
    sourceType?: string;
    correlationId?: string;
    limit?: number;
  } = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 50);

  if (options.eventType) {
    query = query.eq('event_type', options.eventType);
  }
  if (options.sourceType) {
    query = query.eq('source_type', options.sourceType);
  }
  if (options.correlationId) {
    query = query.eq('correlation_id', options.correlationId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEvents',
    returnFallback: true,
    fallback: [] as Event[],
  });
}

// ============================================
// INTEGRATION ACTIONS
// ============================================

export async function getIntegrationActions(
  integrationId?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('integration_actions')
    .select('*')
    .eq('is_active', true)
    .order('category, display_name');

  if (integrationId) {
    query = query.eq('integration_id', integrationId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getIntegrationActions',
    returnFallback: true,
    fallback: [] as IntegrationAction[],
  });
}

export async function createIntegrationAction(
  action: Omit<IntegrationAction, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('integration_actions')
    .insert(action)
    .select()
    .single();

  if (error) throw error;
  return data as IntegrationAction;
}

export async function deleteIntegrationAction(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('integration_actions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// STEP TEMPLATES
// ============================================

export async function getStepTemplates(
  category?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('step_templates')
    .select('*')
    .eq('is_active', true)
    .order('category, name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getStepTemplates',
    returnFallback: true,
    fallback: [] as StepTemplate[],
  });
}

export async function createStepTemplate(
  template: Omit<StepTemplate, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('step_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data as StepTemplate;
}

export async function deleteStepTemplate(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('step_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
