# Agent: Metrics Dashboard Extraction
**Issue:** #109
**Prefix:** metrics
**Difficulty:** Low

---

## Mission

Extract Metrics Dashboard functionality as a standalone modular feature.

---

## Your Workspace (Non-Conflicting)

```
OWNED (create/modify freely):
  src/features/metrics/**
  src/services/metrics/**

MIGRATE FROM (read, extract metrics-related only):
  src/lib/queries/supabase-queries.ts (metrics functions only)
  src/pages/admin/metrics/** (dashboard pages)

DO NOT TOUCH:
  src/features/tasks/** (reference only)
  src/features/types.ts (read only)
```

---

## Current State Analysis

**Existing Components:**
- Dashboard UI with recharts
- Widget cards
- Data source configuration

**Tables:**
- metrics_dashboards
- metrics_widgets
- metrics_snapshots
- metrics_alerts

---

## Target Structure

```
src/features/metrics/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Dashboard, Widget, Source schemas
├── README.md             # Module documentation
├── components/
│   ├── index.ts
│   ├── MetricsDashboard.tsx
│   ├── WidgetCard.tsx
│   ├── ChartWidget.tsx
│   └── DataSourceConfig.tsx
└── pages/
    ├── index.ts
    ├── DashboardPage.tsx
    └── SourcesPage.tsx

src/services/metrics/
├── index.ts
├── metrics-service.interface.ts
└── metrics-service.supabase.ts
```

---

## Implementation Steps

### Phase 1: Structure
- [ ] Create `src/features/metrics/` directory structure
- [ ] Create `src/services/metrics/` directory structure
- [ ] Define schemas in `schemas.ts`

### Phase 2: Service Layer
- [ ] Define `IMetricsService` interface
- [ ] Implement `MetricsServiceSupabase`
- [ ] Migrate queries from supabase-queries.ts

### Phase 3: Feature Module
- [ ] Create `module.ts` with FeatureModule definition
- [ ] Define routes with lazy loading
- [ ] Set permissions: `metrics:read`

### Phase 4: Components
- [ ] Extract `MetricsDashboard.tsx`
- [ ] Extract `WidgetCard.tsx`
- [ ] Extract `ChartWidget.tsx` (recharts)
- [ ] Create `DataSourceConfig.tsx`

### Phase 5: Pages
- [ ] Create `DashboardPage.tsx`
- [ ] Create `SourcesPage.tsx`

### Phase 6: Finalize
- [ ] Create barrel exports
- [ ] Write `README.md`
- [ ] Update team artifact

---

## Agent Tools to Register

```typescript
tools: [
  { name: 'metrics_get_dashboard', permission: 'metrics:read' },
  { name: 'metrics_list_widgets', permission: 'metrics:read' },
  { name: 'metrics_query_data', permission: 'metrics:read' },
]
```

---

## Key Feature: Cross-App Aggregation

Metrics can query data from other modules (CRM deals, Task completion, etc.)
- Needs read access to other module tables via RLS
- Platform query service pattern
- Define aggregation interfaces for future cross-module queries

---

## Database Tables (Target)

```sql
app.metrics_dashboards
app.metrics_widgets
app.metrics_snapshots
app.metrics_alerts
```

---

## Success Criteria

- [ ] Metrics FeatureModule exported
- [ ] IMetricsService interface complete
- [ ] recharts widgets componentized
- [ ] Dashboard renders with sample data
- [ ] Routes at `/admin/metrics/*`
- [ ] No TypeScript errors
- [ ] README.md documents the module
