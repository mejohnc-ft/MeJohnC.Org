/**
 * Metrics Feature Module
 *
 * Public API for the metrics dashboard feature.
 * This module provides metrics visualization and data source management:
 * - Dashboard with time-series charts
 * - Data source configuration
 * - Widget cards and visualizations
 * - Cross-app data aggregation
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

// Module definition
export { metricsModule } from './module';

// Components
export {
  MetricsDashboard,
  WidgetCard,
  ChartWidget,
  DataSourceConfig,
  type MetricsDashboardProps,
  type WidgetCardProps,
  type ChartWidgetProps,
  type DataSourceConfigProps,
} from './components';

// Pages (lazy-loaded, so also available via module.frontendRoutes)
export { DashboardPage, SourcesPage } from './pages';

// Schemas (re-exported from central schemas for convenience)
export {
  MetricsSourceTypeSchema,
  MetricsSourceSchema,
  MetricsDataTypeSchema,
  MetricsDataSchema,
  MetricsDashboardSchema,
  AggregatedMetricSchema,
  MetricsStatsSchema,
  type MetricsSource,
  type MetricsData,
  type MetricsDashboard,
  type AggregatedMetric,
  type MetricsStats,
} from './schemas';
