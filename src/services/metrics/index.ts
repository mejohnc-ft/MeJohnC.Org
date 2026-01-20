/**
 * Metrics Service
 *
 * Public API for metrics service implementations.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

// Service interface
export type {
  IMetricsService,
  SourceQueryOptions,
  MetricsDataQueryOptions,
  AggregateMetricsOptions,
  TimeRange,
  SyncResult,
  SupabaseTableStats,
} from './metrics-service.interface';

// Supabase implementation
export { MetricsServiceSupabase } from './metrics-service.supabase';
