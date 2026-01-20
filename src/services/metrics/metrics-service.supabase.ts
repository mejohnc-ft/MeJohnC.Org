/**
 * Metrics Service - Supabase Implementation
 *
 * Implements IMetricsService using Supabase as the backend.
 * Wraps existing metrics-queries.ts functions with the service interface.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceContext } from '../types';
import type {
  IMetricsService,
  SourceQueryOptions,
  MetricsDataQueryOptions,
  AggregateMetricsOptions,
  TimeRange,
  SyncResult,
  SupabaseTableStats,
} from './metrics-service.interface';
import type {
  MetricsSource,
  MetricsData,
  MetricsDashboard,
  AggregatedMetric,
  MetricsStats,
} from '@/features/metrics/schemas';
import {
  getMetricsSources,
  getMetricsSourceBySlug,
  createMetricsSource,
  updateMetricsSource,
  deleteMetricsSource,
  getMetricsData,
  insertMetricsData,
  getAggregatedMetrics,
  getDistinctMetricNames,
  getMetricsDashboards,
  getMetricsDashboardBySlug,
  getDefaultDashboard,
  createMetricsDashboard,
  updateMetricsDashboard,
  deleteMetricsDashboard,
  getMetricsStats,
  getTimeRangeDates,
  getIntervalForRange,
  triggerMetricsSync,
  getSupabaseTableStats,
} from '@/lib/metrics-queries';

/**
 * Metrics service implementation using Supabase.
 */
export class MetricsServiceSupabase implements IMetricsService {
  readonly serviceName = 'metrics' as const;

  private getClient(ctx: ServiceContext): SupabaseClient {
    if (!ctx.client) {
      throw new Error('[MetricsService] Supabase client not provided in context');
    }
    return ctx.client;
  }

  // ============================================
  // Metrics Sources
  // ============================================

  async getSources(ctx: ServiceContext, options?: SourceQueryOptions): Promise<MetricsSource[]> {
    const client = this.getClient(ctx);
    return getMetricsSources(options, client);
  }

  async getSourceBySlug(ctx: ServiceContext, slug: string): Promise<MetricsSource | null> {
    const client = this.getClient(ctx);
    return getMetricsSourceBySlug(slug, client);
  }

  async createSource(
    ctx: ServiceContext,
    source: Omit<
      MetricsSource,
      'id' | 'created_at' | 'updated_at' | 'last_refresh_at' | 'next_refresh_at' | 'last_error' | 'error_count'
    >
  ): Promise<MetricsSource> {
    const client = this.getClient(ctx);
    return createMetricsSource(source, client);
  }

  async updateSource(
    ctx: ServiceContext,
    id: string,
    updates: Partial<Omit<MetricsSource, 'id' | 'created_at'>>
  ): Promise<MetricsSource> {
    const client = this.getClient(ctx);
    return updateMetricsSource(id, updates, client);
  }

  async deleteSource(ctx: ServiceContext, id: string): Promise<void> {
    const client = this.getClient(ctx);
    return deleteMetricsSource(id, client);
  }

  // ============================================
  // Metrics Data
  // ============================================

  async getMetricsData(
    ctx: ServiceContext,
    options?: MetricsDataQueryOptions
  ): Promise<MetricsData[]> {
    const client = this.getClient(ctx);
    return getMetricsData(options, client);
  }

  async insertMetricsData(
    ctx: ServiceContext,
    dataPoints: Array<Omit<MetricsData, 'id' | 'created_at'>>
  ): Promise<MetricsData[]> {
    const client = this.getClient(ctx);
    return insertMetricsData(dataPoints, client);
  }

  async getAggregatedMetrics(
    ctx: ServiceContext,
    options: AggregateMetricsOptions
  ): Promise<AggregatedMetric[]> {
    const client = this.getClient(ctx);
    const { sourceId, metricName, startTime, endTime, interval = '1 hour' } = options;
    return getAggregatedMetrics(sourceId, metricName, startTime, endTime, interval, client);
  }

  async getDistinctMetricNames(ctx: ServiceContext, sourceId?: string): Promise<string[]> {
    const client = this.getClient(ctx);
    return getDistinctMetricNames(sourceId, client);
  }

  // ============================================
  // Dashboards
  // ============================================

  async getDashboards(ctx: ServiceContext): Promise<MetricsDashboard[]> {
    const client = this.getClient(ctx);
    return getMetricsDashboards(client);
  }

  async getDashboardBySlug(ctx: ServiceContext, slug: string): Promise<MetricsDashboard | null> {
    const client = this.getClient(ctx);
    return getMetricsDashboardBySlug(slug, client);
  }

  async getDefaultDashboard(ctx: ServiceContext): Promise<MetricsDashboard | null> {
    const client = this.getClient(ctx);
    return getDefaultDashboard(client);
  }

  async createDashboard(
    ctx: ServiceContext,
    dashboard: Omit<MetricsDashboard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MetricsDashboard> {
    const client = this.getClient(ctx);
    return createMetricsDashboard(dashboard, client);
  }

  async updateDashboard(
    ctx: ServiceContext,
    id: string,
    updates: Partial<Omit<MetricsDashboard, 'id' | 'created_at'>>
  ): Promise<MetricsDashboard> {
    const client = this.getClient(ctx);
    return updateMetricsDashboard(id, updates, client);
  }

  async deleteDashboard(ctx: ServiceContext, id: string): Promise<void> {
    const client = this.getClient(ctx);
    return deleteMetricsDashboard(id, client);
  }

  // ============================================
  // Stats & Utilities
  // ============================================

  async getStats(ctx: ServiceContext): Promise<MetricsStats> {
    const client = this.getClient(ctx);
    return getMetricsStats(client);
  }

  getTimeRangeDates(range: TimeRange): { start: string; end: string } {
    return getTimeRangeDates(range);
  }

  getIntervalForRange(range: TimeRange): string {
    return getIntervalForRange(range);
  }

  async triggerSync(ctx: ServiceContext, sourceSlug?: string): Promise<SyncResult> {
    const client = this.getClient(ctx);
    return triggerMetricsSync(sourceSlug, client);
  }

  async getSupabaseTableStats(ctx: ServiceContext): Promise<SupabaseTableStats[]> {
    const client = this.getClient(ctx);
    return getSupabaseTableStats(client);
  }
}
