/**
 * Metrics Feature - Schemas
 *
 * Re-exports metrics-related Zod schemas from the main schemas file.
 * In the future, these will be moved here directly.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

// Re-export metrics schemas from central schemas.ts
// These will eventually be moved here as the primary location
export {
  // Schemas
  MetricsSourceTypeSchema,
  MetricsSourceSchema,
  MetricsDataTypeSchema,
  MetricsDataSchema,
  MetricsDashboardSchema,
  AggregatedMetricSchema,
  MetricsStatsSchema,
  // Types
  type MetricsSource,
  type MetricsData,
  type MetricsDashboard,
  type AggregatedMetric,
  type MetricsStats,
} from '@/lib/schemas';
