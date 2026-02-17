import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  Integration,
  IntegrationCredential,
  AgentIntegration,
  AgentAccessDetail,
} from './integrations-schemas';
import type { AgentPlatform } from './schemas';

// ============================================
// INTEGRATIONS
// ============================================

/**
 * Get all integrations with status
 */
export async function getIntegrations(client: SupabaseClient = getSupabase()): Promise<Integration[]> {
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

/**
 * Get a single integration by ID with details
 */
export async function getIntegration(id: string, client: SupabaseClient = getSupabase()): Promise<Integration | null> {
  const { data, error } = await client
    .from('integrations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching integration:', error);
    return null;
  }

  return data as Integration;
}

/**
 * Create a new integration
 */
export async function createIntegration(
  data: Omit<Integration, 'id' | 'created_at' | 'updated_at' | 'health_checked_at'>,
  client: SupabaseClient = getSupabase()
): Promise<Integration> {
  const { data: result, error } = await client
    .from('integrations')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as Integration;
}

/**
 * Update an existing integration
 */
export async function updateIntegration(
  id: string,
  data: Partial<Omit<Integration, 'id' | 'created_at' | 'updated_at'>>,
  client: SupabaseClient = getSupabase()
): Promise<Integration> {
  const { data: result, error } = await client
    .from('integrations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as Integration;
}

/**
 * Delete an integration (will cascade to agent_integrations)
 */
export async function deleteIntegration(id: string, client: SupabaseClient = getSupabase()): Promise<void> {
  const { error } = await client
    .from('integrations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Test connection to integration's health_check_url
 */
export async function testConnection(id: string, client: SupabaseClient = getSupabase()): Promise<boolean> {
  try {
    const integration = await getIntegration(id, client);
    if (!integration?.health_check_url) {
      return false;
    }

    // Call health check endpoint
    const response = await fetch(integration.health_check_url);
    const isHealthy = response.ok;

    // Update health_checked_at timestamp
    await client
      .from('integrations')
      .update({
        health_checked_at: new Date().toISOString(),
        status: isHealthy ? 'active' : 'error',
      })
      .eq('id', id);

    return isHealthy;
  } catch (error) {
    console.error('Health check failed:', error);

    // Update status to error
    await client
      .from('integrations')
      .update({
        health_checked_at: new Date().toISOString(),
        status: 'error',
      })
      .eq('id', id);

    return false;
  }
}

// ============================================
// AGENT ACCESS MANAGEMENT
// ============================================

/**
 * Get agents with access to a specific integration
 */
export async function getIntegrationAgents(
  integrationId: string,
  client: SupabaseClient = getSupabase()
): Promise<AgentAccessDetail[]> {
  const { data, error } = await client
    .from('agent_integrations')
    .select(`
      agent_id,
      granted_scopes,
      granted_at,
      granted_by,
      agents!inner (
        id,
        name
      )
    `)
    .eq('integration_id', integrationId);

  if (error) {
    console.error('Error fetching integration agents:', error);
    return [];
  }

  // Transform the response to match AgentAccessDetail schema
  return (data || []).map((item: { agent_id: string; agents: { name: string }; granted_scopes: string[] | null; granted_at: string; granted_by: string }) => ({
    agent_id: item.agent_id,
    agent_name: item.agents.name,
    scopes: item.granted_scopes || [],
    granted_at: item.granted_at,
    granted_by: item.granted_by,
  }));
}

/**
 * Grant an agent access to an integration
 */
export async function grantAgentAccess(
  integrationId: string,
  agentId: string,
  scopes: string[],
  client: SupabaseClient = getSupabase()
): Promise<AgentIntegration> {
  const { data, error } = await client
    .from('agent_integrations')
    .insert({
      integration_id: integrationId,
      agent_id: agentId,
      granted_scopes: scopes,
      granted_at: new Date().toISOString(),
      granted_by: null, // TODO: get from auth context
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentIntegration;
}

/**
 * Revoke an agent's access to an integration
 */
export async function revokeAgentAccess(
  integrationId: string,
  agentId: string,
  client: SupabaseClient = getSupabase()
): Promise<void> {
  const { error } = await client
    .from('agent_integrations')
    .delete()
    .eq('integration_id', integrationId)
    .eq('agent_id', agentId);

  if (error) throw error;
}

// ============================================
// CREDENTIALS MANAGEMENT
// ============================================

/**
 * Get credential metadata for an integration (no encrypted data)
 */
export async function getCredentials(
  integrationId: string,
  client: SupabaseClient = getSupabase()
): Promise<IntegrationCredential[]> {
  const { data, error } = await client
    .from('integration_credentials')
    .select('id, integration_id, agent_id, credential_type, encryption_key_id, expires_at, last_used_at, created_at')
    .eq('integration_id', integrationId)
    .order('created_at', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getCredentials',
    returnFallback: true,
    fallback: [] as IntegrationCredential[],
  });
}

// ============================================
// AGENT LIST
// ============================================

/**
 * Get list of all agents (for agent selector)
 */
export async function getAgentsList(client: SupabaseClient = getSupabase()): Promise<AgentPlatform[]> {
  const { data, error } = await client
    .from('agents')
    .select('*')
    .order('name');

  return handleQueryResult(data, error, {
    operation: 'getAgentsList',
    returnFallback: true,
    fallback: [] as AgentPlatform[],
  });
}
