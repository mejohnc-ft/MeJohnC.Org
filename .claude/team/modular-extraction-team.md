# Modular Extraction Team - P1 Sprint

**Sprint Goal:** Extract 5 features as standalone modular products
**Created:** 2026-01-20
**Status:** COMPLETE

---

## Team Members

| Agent | Issue | Module | Difficulty | Status |
|-------|-------|--------|------------|--------|
| agent-crm | #108 | CRM | Medium | COMPLETE |
| agent-metrics | #109 | Metrics Dashboard | Low | COMPLETE |
| agent-style | #110 | Style Guide | Low | COMPLETE |
| agent-nps | #111 | NPS Agent | Medium | COMPLETE |
| agent-news | #112 | News | Medium | COMPLETE |

---

## Non-Conflicting Work Assignments

Each agent works on **isolated file paths** to prevent merge conflicts:

```
agent-crm:
  - src/features/crm/**
  - src/services/crm/**
  - src/lib/queries/crm-queries.ts (migrate from)

agent-metrics:
  - src/features/metrics/**
  - src/services/metrics/**
  - src/lib/queries/supabase-queries.ts (extract metrics only)

agent-style:
  - src/features/style-guide/**
  - src/services/style/**
  - src/lib/queries/ (style-related only)

agent-nps:
  - src/features/nps/**
  - src/services/nps/**
  - src/lib/queries/marketing-queries.ts (extract NPS only)

agent-news:
  - src/features/news/**
  - src/services/news/**
  - src/lib/queries/supabase-queries.ts (extract news only)
```

**Shared Files (Coordinate via this doc):**
- `src/features/index.ts` - Add export after module complete
- `src/services/index.ts` - Add service factory after complete
- `src/features/types.ts` - READ ONLY (do not modify)

---

## Reference Implementation: Tasks Module

Follow the patterns in `src/features/tasks/`:

```
src/features/tasks/
├── module.ts           # FeatureModule definition
├── index.ts            # Public API exports
├── schemas.ts          # Re-exported schemas
├── components/
│   ├── index.ts
│   ├── TaskCard.tsx
│   └── ...
└── pages/
    ├── index.ts
    └── TasksPage.tsx
```

---

## FeatureModule Template

```typescript
// src/features/{module}/module.ts
import type { FeatureModule } from '@/features/types';

export const {prefix}Module: FeatureModule = {
  name: '{module-name}',
  version: '1.0.0',
  prefix: '{prefix}',

  frontendRoutes: [
    {
      path: '/admin/{module}',
      component: () => import('./pages/{Page}'),
      title: '{Title}',
      icon: '{icon}',
      showInNav: true,
      permissions: ['{prefix}:read'],
    },
  ],

  migrations: {
    prefix: '{prefix}',
    tables: ['{prefix}_table1', '{prefix}_table2'],
    directory: './migrations',
  },

  async initialize() {
    console.log('[{Module}] Initializing');
  },

  async shutdown() {
    console.log('[{Module}] Shutting down');
  },
};
```

---

## Service Interface Template

```typescript
// src/services/{module}/{module}-service.interface.ts
import type { ServiceContext, BaseService } from '../types';

export interface I{Module}Service extends BaseService {
  readonly serviceName: string;

  // Define CRUD methods grouped by entity
  getItems(ctx: ServiceContext): Promise<Item[]>;
  getItemById(ctx: ServiceContext, id: string): Promise<Item | null>;
  createItem(ctx: ServiceContext, data: CreateItemInput): Promise<Item>;
  updateItem(ctx: ServiceContext, id: string, data: UpdateItemInput): Promise<Item>;
  deleteItem(ctx: ServiceContext, id: string): Promise<void>;
}
```

---

## Database Conventions

1. **Table Naming:** `app.{prefix}_{entity}` (e.g., `app.crm_contacts`)
2. **Required Columns:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id UUID NOT NULL REFERENCES app.tenants(id)`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `deleted_at TIMESTAMPTZ` (soft delete)
3. **RLS Policy:** All tables must have tenant isolation policy
4. **Indexes:** Create indexes on `tenant_id` and common query fields

---

## Acceptance Criteria (All Modules)

- [ ] FeatureModule exported from `src/features/{module}/module.ts`
- [ ] Public API in `src/features/{module}/index.ts`
- [ ] Service interface in `src/services/{module}/`
- [ ] Supabase implementation of service
- [ ] Components extracted to feature directory
- [ ] Pages with lazy loading
- [ ] Schemas defined/re-exported
- [ ] README.md in feature directory

---

## Cross-Module Dependencies

```
nps --> crm (optional: sync scores to contacts)
metrics --> * (read-only: can query any module's data)
```

**Resolution:** Build core modules first, add cross-module adapters after.

---

## Agent Completion Log

| Agent | Started | Completed | Files Created | Notes |
|-------|---------|-----------|---------------|-------|
| agent-crm | 2026-01-20 | 2026-01-20 | 20 files | Complete: module, service (already existed), 12 components, 4 pages, README. No TS errors. |
| agent-metrics | 2026-01-20 | 2026-01-20 | 13 files | Feature module, service layer, components, pages, README complete. No TS errors. |
| agent-style | 2026-01-20 | 2026-01-20 | 18 files | Complete: module, service, components, pages, adapters, README |
| agent-nps | 2026-01-20 | 2026-01-20 | 19 files | Complete: module, service interface+impl, 3 adapters, 5 components, 3 pages, README. No TS errors. |
| agent-news | 2026-01-20 | 2026-01-20 | 16 files | Complete: module, service, RSS adapter, components, pages, README. No TS errors. |

---

## Coordination Protocol

1. **Before modifying shared files:** Update this document with your intent
2. **After completing module:**
   - Update completion log above
   - Add export to shared files
   - Mark issue as ready for review
3. **If blocked:** Document blocker here, notify team lead

---

## Quick Links

- [Modular App Design Spec](../docs/modular-app-design-spec.md)
- [Tasks Reference Module](../src/features/tasks/)
- [Service Layer Types](../src/services/types.ts)
- [Feature Types](../src/features/types.ts)
