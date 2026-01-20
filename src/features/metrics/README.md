# Metrics Dashboard Feature Module

> Comprehensive metrics dashboard with data source integration, time-series visualization, and cross-app aggregation.

**Issue:** [#109](https://github.com/mejohnc-ft/MeJohnC.Org/issues/109)
**Status:** ✅ Complete
**Version:** 1.0.0

---

## Overview

The Metrics module provides a complete dashboard solution for collecting, aggregating, and visualizing metrics from multiple data sources. It supports:

- Multiple data source types (GitHub, Analytics, Supabase, Webhooks, Custom)
- Time-series data visualization with recharts
- Real-time dashboard updates
- Cross-app data aggregation
- Configurable widgets and layouts

---

## Architecture

```
src/features/metrics/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Zod schemas (re-exported)
├── README.md             # This file
├── components/
│   ├── index.ts
│   ├── MetricsDashboard.tsx    # Main dashboard component
│   ├── WidgetCard.tsx          # Stat card widget
│   ├── ChartWidget.tsx         # Time-series chart (recharts)
│   └── DataSourceConfig.tsx    # Data source card
└── pages/
    ├── index.ts
    ├── DashboardPage.tsx       # Main dashboard page
    └── SourcesPage.tsx         # Data sources management

src/services/metrics/
├── index.ts
├── metrics-service.interface.ts    # Service contract
└── metrics-service.supabase.ts     # Supabase implementation
```

---

## Features

### 1. Data Source Management

Supports multiple data source types:
- **GitHub**: Repository metrics, stars, commits, PRs
- **Analytics**: Web traffic, user behavior
- **Supabase**: Database statistics
- **Webhook**: External webhooks
- **Custom**: User-defined sources

Each source tracks:
- Sync status and frequency
- Error count and last error
- Configuration (API keys, endpoints)
- Active/inactive state

### 2. Metrics Visualization

**Widget Cards:**
- Displays key statistics
- Optional trend indicators
- Customizable icons and colors

**Time-Series Charts:**
- Recharts-powered area charts
- Multiple time ranges (1H, 24H, 7D, 30D, 90D, 1Y)
- Automatic data aggregation
- Responsive design

### 3. Dashboard Features

- Real-time refresh
- Time range selection
- Multi-metric comparison
- Live integration cards (GitHub, Supabase)
- Empty states and loading indicators

### 4. Cross-App Aggregation

The metrics module can query data from other features:
- CRM deal values
- Task completion rates
- Blog post views
- News article engagement

Uses read-only access via RLS policies.

---

## Routes

| Path | Component | Permissions | Description |
|------|-----------|-------------|-------------|
| `/admin/metrics` | DashboardPage | `metrics:read` | Main metrics dashboard |
| `/admin/metrics/sources` | SourcesPage | `metrics:read` | Data source management |

---

## Database Schema

### Tables

**`app.metrics_sources`**
- `id` - UUID primary key
- `tenant_id` - Tenant isolation
- `name` - Source display name
- `slug` - URL-safe identifier
- `source_type` - Type enum (github, analytics, etc.)
- `config` - JSONB configuration
- `is_active` - Active/inactive flag
- `refresh_interval` - Sync frequency
- `last_refresh_at` - Last sync timestamp
- `next_refresh_at` - Next scheduled sync
- `error_count` - Error counter
- `last_error` - Last error message

**`app.metrics_data`**
- `id` - UUID primary key
- `source_id` - Reference to metrics_sources
- `metric_name` - Metric identifier
- `metric_type` - Type enum (counter, gauge, histogram, summary)
- `value` - Numeric value
- `tags` - JSONB tags for filtering
- `recorded_at` - Timestamp

**`app.metrics_dashboards`**
- `id` - UUID primary key
- `tenant_id` - Tenant isolation
- `name` - Dashboard name
- `slug` - URL-safe identifier
- `description` - Optional description
- `layout` - JSONB layout configuration
- `is_default` - Default dashboard flag
- `is_public` - Public access flag

**`app.metrics_widgets`** (Future)
- Widget configuration for dashboards

**`app.metrics_snapshots`** (Future)
- Historical metric snapshots

**`app.metrics_alerts`** (Future)
- Metric-based alerting

---

## Service Interface

### `IMetricsService`

**Data Sources:**
```typescript
getSources(ctx, options?) => Promise<MetricsSource[]>
getSourceBySlug(ctx, slug) => Promise<MetricsSource | null>
createSource(ctx, source) => Promise<MetricsSource>
updateSource(ctx, id, updates) => Promise<MetricsSource>
deleteSource(ctx, id) => Promise<void>
```

**Metrics Data:**
```typescript
getMetricsData(ctx, options?) => Promise<MetricsData[]>
insertMetricsData(ctx, dataPoints) => Promise<MetricsData[]>
getAggregatedMetrics(ctx, options) => Promise<AggregatedMetric[]>
getDistinctMetricNames(ctx, sourceId?) => Promise<string[]>
```

**Dashboards:**
```typescript
getDashboards(ctx) => Promise<MetricsDashboard[]>
getDashboardBySlug(ctx, slug) => Promise<MetricsDashboard | null>
getDefaultDashboard(ctx) => Promise<MetricsDashboard | null>
createDashboard(ctx, dashboard) => Promise<MetricsDashboard>
updateDashboard(ctx, id, updates) => Promise<MetricsDashboard>
deleteDashboard(ctx, id) => Promise<void>
```

**Utilities:**
```typescript
getStats(ctx) => Promise<MetricsStats>
getTimeRangeDates(range) => { start, end }
getIntervalForRange(range) => string
triggerSync(ctx, sourceSlug?) => Promise<SyncResult>
getSupabaseTableStats(ctx) => Promise<SupabaseTableStats[]>
```

---

## Usage Examples

### Using the Dashboard Component

```tsx
import { MetricsDashboard } from '@/features/metrics';

function MyPage() {
  return (
    <MetricsDashboard
      onAddSource={() => console.log('Add source')}
      onSourceClick={(source) => console.log('Clicked:', source)}
    />
  );
}
```

### Using Individual Widgets

```tsx
import { WidgetCard, ChartWidget } from '@/features/metrics';
import { TrendingUp } from 'lucide-react';

function MyDashboard() {
  return (
    <>
      <WidgetCard
        title="Total Revenue"
        value={45230}
        previousValue={42100}
        icon={TrendingUp}
        iconColor="text-green-500"
        formatValue={(v) => `$${v.toLocaleString()}`}
      />

      <ChartWidget
        data={[
          { timestamp: '2024-01-01', value: 100 },
          { timestamp: '2024-01-02', value: 150 },
        ]}
        title="Revenue Trend"
        color="hsl(var(--primary))"
        height={300}
      />
    </>
  );
}
```

### Using the Service Layer

```tsx
import { MetricsServiceSupabase } from '@/services/metrics';
import { useAuthenticatedSupabase } from '@/lib/supabase';

function MyComponent() {
  const { supabase } = useAuthenticatedSupabase();
  const metricsService = new MetricsServiceSupabase();

  const loadMetrics = async () => {
    const ctx = { client: supabase };
    const sources = await metricsService.getSources(ctx, { isActive: true });
    const stats = await metricsService.getStats(ctx);
    // ...
  };
}
```

---

## Integration Points

### Agent Tools (Future)

When integrated with CentrexAI platform:

```typescript
tools: [
  { name: 'metrics_get_dashboard', permission: 'metrics:read' },
  { name: 'metrics_list_widgets', permission: 'metrics:read' },
  { name: 'metrics_query_data', permission: 'metrics:read' },
  { name: 'metrics_create_alert', permission: 'metrics:write' },
]
```

### Cross-Module Queries

The metrics module can query other modules' data:

```typescript
// Example: Get CRM deal metrics
const dealMetrics = await metricsService.getMetricsData(ctx, {
  metricName: 'crm_deals_total_value',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

---

## Dependencies

**Core:**
- React 19.x
- Next.js 15
- TypeScript

**UI:**
- Tailwind CSS
- shadcn/ui components
- Lucide React icons
- Framer Motion (animations)

**Charts:**
- recharts (time-series visualization)

**Backend:**
- Supabase (current implementation)
- Zod (schema validation)

---

## Testing

```bash
# Run unit tests
npm test -- src/features/metrics

# Run integration tests
npm test -- src/services/metrics
```

---

## Roadmap

### v1.1
- [ ] Widget builder UI
- [ ] Custom dashboard creation
- [ ] Export to CSV/PDF
- [ ] Metric alerts

### v2.0
- [ ] Real-time subscriptions
- [ ] Advanced aggregations
- [ ] API mode implementation
- [ ] Embedded dashboard widgets

---

## Contributing

When adding new features:

1. Update service interface if adding new operations
2. Implement in both Supabase service (and future API service)
3. Add components to `components/` directory
4. Export through `index.ts`
5. Update this README

---

## License

Part of MeJohnC.Org project.

---

## Related Documentation

- [Modular App Design Spec](../../../docs/modular-app-design-spec.md)
- [Service Layer Architecture](../../services/README.md)
- [Feature Module Types](../types.ts)
- [Issue #109](https://github.com/mejohnc-ft/MeJohnC.Org/issues/109)
