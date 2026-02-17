import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import { type AuditLogEntry, type AuditLogActorType } from './schemas';

// ============================================
// AUDIT LOG QUERIES
// ============================================

export interface AuditEventFilters {
  actor_type?: AuditLogActorType;
  action?: string;
  resource_type?: string;
  date_range?: {
    start: string;
    end: string;
  };
  correlation_id?: string;
  search?: string;
}

export interface AuditStatsCategory {
  category: string;
  count: number;
}

/**
 * Fetch audit events with filters and pagination
 */
export async function getAuditEvents(
  options: AuditEventFilters & { limit?: number; offset?: number } = {},
  client: SupabaseClient = getSupabase()
): Promise<AuditLogEntry[]> {
  const { limit = 50, offset = 0, ...filters } = options;

  let query = client
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (filters.actor_type) {
    query = query.eq('actor_type', filters.actor_type);
  }

  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`);
  }

  if (filters.resource_type) {
    query = query.eq('resource_type', filters.resource_type);
  }

  if (filters.date_range) {
    query = query
      .gte('timestamp', filters.date_range.start)
      .lte('timestamp', filters.date_range.end);
  }

  if (filters.correlation_id) {
    query = query.eq('correlation_id', filters.correlation_id);
  }

  if (filters.search) {
    // Search across action, resource_type, and resource_id
    query = query.or(
      `action.ilike.%${filters.search}%,resource_type.ilike.%${filters.search}%,resource_id.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAuditEvents',
    returnFallback: true,
    fallback: [] as AuditLogEntry[],
  });
}

/**
 * Fetch a single audit event by ID with full details
 */
export async function getAuditEventById(
  id: string,
  client: SupabaseClient = getSupabase()
): Promise<AuditLogEntry | null> {
  const { data, error } = await client
    .from('audit_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data as AuditLogEntry;
}

/**
 * Get audit event statistics for the last 24 hours, grouped by action category
 */
export async function getAuditStats(
  client: SupabaseClient = getSupabase()
): Promise<AuditStatsCategory[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get all events from last 24h
  const { data, error } = await client
    .from('audit_log')
    .select('action')
    .gte('timestamp', twentyFourHoursAgo);

  if (error || !data) {
    return [];
  }

  // Group by action category (first part before the dot)
  const categoryMap = new Map<string, number>();

  data.forEach((entry) => {
    const category = entry.action.split('.')[0] || 'other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Export audit events matching filters (no pagination limit)
 */
export async function exportAuditEvents(
  options: AuditEventFilters = {},
  client: SupabaseClient = getSupabase()
): Promise<AuditLogEntry[]> {
  let query = client
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false });

  // Apply same filters as getAuditEvents
  if (options.actor_type) {
    query = query.eq('actor_type', options.actor_type);
  }

  if (options.action) {
    query = query.ilike('action', `%${options.action}%`);
  }

  if (options.resource_type) {
    query = query.eq('resource_type', options.resource_type);
  }

  if (options.date_range) {
    query = query
      .gte('timestamp', options.date_range.start)
      .lte('timestamp', options.date_range.end);
  }

  if (options.correlation_id) {
    query = query.eq('correlation_id', options.correlation_id);
  }

  if (options.search) {
    query = query.or(
      `action.ilike.%${options.search}%,resource_type.ilike.%${options.search}%,resource_id.ilike.%${options.search}%`
    );
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'exportAuditEvents',
    returnFallback: true,
    fallback: [] as AuditLogEntry[],
  });
}
