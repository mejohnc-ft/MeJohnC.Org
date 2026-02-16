import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import { type AuditLogEntry, type AuditLogActorType } from './schemas';

// ============================================
// AUDIT LOG QUERIES (Phase 1 partitioned table)
// ============================================

export interface AuditLogFilters {
  action?: string;
  actorType?: AuditLogActorType;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
}

export async function getAuditLogEntries(
  filters: AuditLogFilters = {},
  limit = 100,
  offset = 0,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`);
  }
  if (filters.actorType) {
    query = query.eq('actor_type', filters.actorType);
  }
  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }
  if (filters.startDate) {
    query = query.gte('timestamp', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('timestamp', filters.endDate);
  }
  if (filters.correlationId) {
    query = query.eq('correlation_id', filters.correlationId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAuditLogEntries',
    returnFallback: true,
    fallback: [] as AuditLogEntry[],
  });
}

export async function getRecentPlatformAuditLogs(
  limit = 20,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getRecentPlatformAuditLogs',
    returnFallback: true,
    fallback: [] as AuditLogEntry[],
  });
}

export function formatPlatformAuditAction(action: string): string {
  // "agents.insert" → "Insert Agent"
  const parts = action.split('.');
  if (parts.length === 2) {
    const table = parts[0].replace(/_/g, ' ').replace(/s$/, '');
    const verb = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return `${verb} ${table.charAt(0).toUpperCase() + table.slice(1)}`;
  }
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatPlatformTableName(tableName: string): string {
  const map: Record<string, string> = {
    agents: 'Agent',
    workflows: 'Workflow',
    workflow_runs: 'Workflow Run',
    integrations: 'Integration',
    agent_integrations: 'Agent Integration',
    scheduled_workflow_runs: 'Scheduled Run',
    credentials: 'Credential',
  };
  return map[tableName] || tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
