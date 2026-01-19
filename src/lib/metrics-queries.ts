/**
 * Metrics Query Functions
 * Database operations for metrics sources, data, and dashboards
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  type MetricsSource,
  type MetricsData,
  type MetricsDashboard,
  type AggregatedMetric,
  type MetricsStats,
} from './schemas';

// Re-export types
export type {
  MetricsSource,
  MetricsData,
  MetricsDashboard,
  AggregatedMetric,
  MetricsStats,
};

// Supabase instance
const supabase = getSupabase();

// Helper for handling query results
function handleQueryResult<T>(
  data: T | null,
  error: { message: string } | null,
  options: { operation: string; returnFallback?: boolean; fallback?: T }
): T {
  if (error) {
    console.error(`[${options.operation}] Error:`, error.message);
    if (options.returnFallback && options.fallback !== undefined) {
      return options.fallback;
    }
    throw error;
  }
  return data as T;
}

// ============================================
// METRICS SOURCES
// ============================================

export interface SourceQueryOptions {
  sourceType?: MetricsSource['source_type'];
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'last_refresh_at' | 'name';
  orderDirection?: 'asc' | 'desc';
}

export async function getMetricsSources(
  options: SourceQueryOptions = {},
  client: SupabaseClient = supabase
): Promise<MetricsSource[]> {
  const {
    sourceType,
    isActive,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options;

  let query = client
    .from('metrics_sources')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (sourceType) {
    query = query.eq('source_type', sourceType);
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, error } = await query;
  return handleQueryResult(data ?? [], error, {
    operation: 'getMetricsSources',
    returnFallback: true,
    fallback: [],
  });
}

export async function getMetricsSourceBySlug(
  slug: string,
  client: SupabaseClient = supabase
): Promise<MetricsSource | null> {
  const { data, error } = await client
    .from('metrics_sources')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.message.includes('No rows found')) {
    return null;
  }
  return handleQueryResult(data, error, { operation: 'getMetricsSourceBySlug' });
}

export async function createMetricsSource(
  source: Omit<MetricsSource, 'id' | 'created_at' | 'updated_at' | 'last_refresh_at' | 'next_refresh_at' | 'last_error' | 'error_count'>,
  client: SupabaseClient = supabase
): Promise<MetricsSource> {
  const { data, error } = await client
    .from('metrics_sources')
    .insert(source)
    .select()
    .single();

  return handleQueryResult(data, error, { operation: 'createMetricsSource' });
}

export async function updateMetricsSource(
  id: string,
  updates: Partial<Omit<MetricsSource, 'id' | 'created_at'>>,
  client: SupabaseClient = supabase
): Promise<MetricsSource> {
  const { data, error } = await client
    .from('metrics_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return handleQueryResult(data, error, { operation: 'updateMetricsSource' });
}

export async function deleteMetricsSource(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('metrics_sources').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// METRICS DATA
// ============================================

export interface MetricsDataQueryOptions {
  sourceId?: string;
  metricName?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getMetricsData(
  options: MetricsDataQueryOptions = {},
  client: SupabaseClient = supabase
): Promise<MetricsData[]> {
  const {
    sourceId,
    metricName,
    startDate,
    endDate,
    limit = 1000,
    offset = 0,
  } = options;

  let query = client
    .from('metrics_data')
    .select('*')
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }

  if (metricName) {
    query = query.eq('metric_name', metricName);
  }

  if (startDate) {
    query = query.gte('recorded_at', startDate);
  }

  if (endDate) {
    query = query.lte('recorded_at', endDate);
  }

  const { data, error } = await query;
  return handleQueryResult(data ?? [], error, {
    operation: 'getMetricsData',
    returnFallback: true,
    fallback: [],
  });
}

export async function insertMetricsData(
  dataPoints: Array<Omit<MetricsData, 'id' | 'created_at'>>,
  client: SupabaseClient = supabase
): Promise<MetricsData[]> {
  const { data, error } = await client
    .from('metrics_data')
    .insert(dataPoints)
    .select();

  return handleQueryResult(data ?? [], error, {
    operation: 'insertMetricsData',
    returnFallback: true,
    fallback: [],
  });
}

export async function getAggregatedMetrics(
  sourceId: string,
  metricName: string,
  startTime: string,
  endTime: string,
  interval: string = '1 hour',
  client: SupabaseClient = supabase
): Promise<AggregatedMetric[]> {
  const { data, error } = await client.rpc('get_metrics_aggregated', {
    p_source_id: sourceId,
    p_metric_name: metricName,
    p_start_time: startTime,
    p_end_time: endTime,
    p_interval: interval,
  });

  return handleQueryResult(data ?? [], error, {
    operation: 'getAggregatedMetrics',
    returnFallback: true,
    fallback: [],
  });
}

export async function getDistinctMetricNames(
  sourceId?: string,
  client: SupabaseClient = supabase
): Promise<string[]> {
  let query = client
    .from('metrics_data')
    .select('metric_name')
    .order('metric_name');

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getDistinctMetricNames] Error:', error.message);
    return [];
  }

  // Dedupe manually since Supabase doesn't have DISTINCT
  const uniqueNames = [...new Set((data ?? []).map((d: { metric_name: string }) => d.metric_name))];
  return uniqueNames;
}

// ============================================
// METRICS DASHBOARDS
// ============================================

export async function getMetricsDashboards(
  client: SupabaseClient = supabase
): Promise<MetricsDashboard[]> {
  const { data, error } = await client
    .from('metrics_dashboards')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');

  return handleQueryResult(data ?? [], error, {
    operation: 'getMetricsDashboards',
    returnFallback: true,
    fallback: [],
  });
}

export async function getMetricsDashboardBySlug(
  slug: string,
  client: SupabaseClient = supabase
): Promise<MetricsDashboard | null> {
  const { data, error } = await client
    .from('metrics_dashboards')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.message.includes('No rows found')) {
    return null;
  }
  return handleQueryResult(data, error, { operation: 'getMetricsDashboardBySlug' });
}

export async function getDefaultDashboard(
  client: SupabaseClient = supabase
): Promise<MetricsDashboard | null> {
  const { data, error } = await client
    .from('metrics_dashboards')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error && error.message.includes('No rows found')) {
    return null;
  }
  return handleQueryResult(data, error, { operation: 'getDefaultDashboard' });
}

export async function createMetricsDashboard(
  dashboard: Omit<MetricsDashboard, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
): Promise<MetricsDashboard> {
  const { data, error } = await client
    .from('metrics_dashboards')
    .insert(dashboard)
    .select()
    .single();

  return handleQueryResult(data, error, { operation: 'createMetricsDashboard' });
}

export async function updateMetricsDashboard(
  id: string,
  updates: Partial<Omit<MetricsDashboard, 'id' | 'created_at'>>,
  client: SupabaseClient = supabase
): Promise<MetricsDashboard> {
  const { data, error } = await client
    .from('metrics_dashboards')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return handleQueryResult(data, error, { operation: 'updateMetricsDashboard' });
}

export async function deleteMetricsDashboard(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('metrics_dashboards').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// STATS
// ============================================

export async function getMetricsStats(
  client: SupabaseClient = supabase
): Promise<MetricsStats> {
  const [sourcesResult, dataResult, dashboardsResult, lastRefreshResult] = await Promise.all([
    client.from('metrics_sources').select('id, is_active', { count: 'exact' }),
    client.from('metrics_data').select('id', { count: 'exact', head: true }),
    client.from('metrics_dashboards').select('id', { count: 'exact', head: true }),
    client
      .from('metrics_sources')
      .select('last_refresh_at')
      .not('last_refresh_at', 'is', null)
      .order('last_refresh_at', { ascending: false })
      .limit(1),
  ]);

  const sources = sourcesResult.data ?? [];
  const totalSources = sources.length;
  const activeSources = sources.filter((s: { is_active: boolean }) => s.is_active).length;

  return {
    total_sources: totalSources,
    active_sources: activeSources,
    total_data_points: dataResult.count ?? 0,
    dashboards_count: dashboardsResult.count ?? 0,
    last_refresh: lastRefreshResult.data?.[0]?.last_refresh_at ?? null,
  };
}

// ============================================
// TIME RANGE HELPERS
// ============================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

export function getTimeRangeDates(range: TimeRange): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  let start: Date;
  switch (range) {
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  return { start: start.toISOString(), end };
}

export function getIntervalForRange(range: TimeRange): string {
  switch (range) {
    case '1h':
      return '5 minutes';
    case '24h':
      return '1 hour';
    case '7d':
      return '6 hours';
    case '30d':
      return '1 day';
    case '90d':
      return '3 days';
    case '1y':
      return '1 week';
  }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

export interface SyncResult {
  success: boolean;
  message: string;
  results?: Array<{
    source: string;
    success: boolean;
    metrics_count: number;
    error?: string;
  }>;
}

export async function triggerMetricsSync(
  sourceSlug?: string,
  client: SupabaseClient = supabase
): Promise<SyncResult> {
  const { data, error } = await client.functions.invoke('metrics-sync', {
    body: sourceSlug ? { source_slug: sourceSlug } : {},
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Failed to trigger sync',
    };
  }

  return data as SyncResult;
}

// ============================================
// SUPABASE STATS (CLIENT-SIDE)
// ============================================

export interface SupabaseTableStats {
  table: string;
  count: number;
}

export async function getSupabaseTableStats(
  client: SupabaseClient = supabase
): Promise<SupabaseTableStats[]> {
  const tables = [
    'apps',
    'projects',
    'blog_posts',
    'contacts',
    'bookmarks',
    'news_articles',
  ];

  const results: SupabaseTableStats[] = [];

  for (const table of tables) {
    try {
      const { count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        results.push({ table, count });
      }
    } catch {
      // Skip tables that don't exist or can't be accessed
    }
  }

  return results;
}
