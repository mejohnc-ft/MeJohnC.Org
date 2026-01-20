/**
 * Metrics Service Interface
 *
 * Defines the contract for metrics dashboard operations.
 * Implementations can be backed by Supabase (current) or REST API (future).
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

import type { ServiceContext, BaseService, PaginationOptions } from '../types';
import type {
  MetricsSource,
  MetricsData,
  MetricsDashboard,
  AggregatedMetric,
  MetricsStats,
} from '@/features/metrics/schemas';

// ============================================
// Query Options
// ============================================

export interface SourceQueryOptions extends PaginationOptions {
  sourceType?: MetricsSource['source_type'];
  isActive?: boolean;
  orderBy?: 'created_at' | 'last_refresh_at' | 'name';
  orderDirection?: 'asc' | 'desc';
}

export interface MetricsDataQueryOptions extends PaginationOptions {
  sourceId?: string;
  metricName?: string;
  startDate?: string;
  endDate?: string;
}

export interface AggregateMetricsOptions {
  sourceId: string;
  metricName: string;
  startTime: string;
  endTime: string;
  interval?: string; // e.g., '1 hour', '1 day'
}

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

// ============================================
// Sync Results
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

export interface SupabaseTableStats {
  table: string;
  count: number;
}

// ============================================
// Service Interface
// ============================================

/**
 * Metrics service for managing dashboards, data sources, and metric data.
 * Supports cross-app data aggregation.
 */
export interface IMetricsService extends BaseService {
  readonly serviceName: 'metrics';

  // ============================================
  // Metrics Sources
  // ============================================

  /**
   * Get all metrics data sources with optional filtering.
   */
  getSources(ctx: ServiceContext, options?: SourceQueryOptions): Promise<MetricsSource[]>;

  /**
   * Get a metrics source by its slug.
   */
  getSourceBySlug(ctx: ServiceContext, slug: string): Promise<MetricsSource | null>;

  /**
   * Create a new metrics data source.
   */
  createSource(
    ctx: ServiceContext,
    source: Omit<
      MetricsSource,
      'id' | 'created_at' | 'updated_at' | 'last_refresh_at' | 'next_refresh_at' | 'last_error' | 'error_count'
    >
  ): Promise<MetricsSource>;

  /**
   * Update a metrics data source.
   */
  updateSource(
    ctx: ServiceContext,
    id: string,
    updates: Partial<Omit<MetricsSource, 'id' | 'created_at'>>
  ): Promise<MetricsSource>;

  /**
   * Delete a metrics data source.
   */
  deleteSource(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // Metrics Data
  // ============================================

  /**
   * Get metrics data points with optional filtering.
   */
  getMetricsData(ctx: ServiceContext, options?: MetricsDataQueryOptions): Promise<MetricsData[]>;

  /**
   * Insert new metrics data points (batch).
   */
  insertMetricsData(
    ctx: ServiceContext,
    dataPoints: Array<Omit<MetricsData, 'id' | 'created_at'>>
  ): Promise<MetricsData[]>;

  /**
   * Get aggregated metrics for a specific time range and interval.
   */
  getAggregatedMetrics(
    ctx: ServiceContext,
    options: AggregateMetricsOptions
  ): Promise<AggregatedMetric[]>;

  /**
   * Get all distinct metric names, optionally filtered by source.
   */
  getDistinctMetricNames(ctx: ServiceContext, sourceId?: string): Promise<string[]>;

  // ============================================
  // Dashboards
  // ============================================

  /**
   * Get all metrics dashboards.
   */
  getDashboards(ctx: ServiceContext): Promise<MetricsDashboard[]>;

  /**
   * Get a dashboard by its slug.
   */
  getDashboardBySlug(ctx: ServiceContext, slug: string): Promise<MetricsDashboard | null>;

  /**
   * Get the default dashboard.
   */
  getDefaultDashboard(ctx: ServiceContext): Promise<MetricsDashboard | null>;

  /**
   * Create a new dashboard.
   */
  createDashboard(
    ctx: ServiceContext,
    dashboard: Omit<MetricsDashboard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MetricsDashboard>;

  /**
   * Update a dashboard.
   */
  updateDashboard(
    ctx: ServiceContext,
    id: string,
    updates: Partial<Omit<MetricsDashboard, 'id' | 'created_at'>>
  ): Promise<MetricsDashboard>;

  /**
   * Delete a dashboard.
   */
  deleteDashboard(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // Stats & Utilities
  // ============================================

  /**
   * Get overall metrics statistics.
   */
  getStats(ctx: ServiceContext): Promise<MetricsStats>;

  /**
   * Get time range dates for predefined ranges.
   */
  getTimeRangeDates(range: TimeRange): { start: string; end: string };

  /**
   * Get suggested interval for a time range.
   */
  getIntervalForRange(range: TimeRange): string;

  /**
   * Trigger a sync for metrics sources.
   */
  triggerSync(ctx: ServiceContext, sourceSlug?: string): Promise<SyncResult>;

  /**
   * Get Supabase table statistics (for internal dashboard).
   */
  getSupabaseTableStats(ctx: ServiceContext): Promise<SupabaseTableStats[]>;
}
