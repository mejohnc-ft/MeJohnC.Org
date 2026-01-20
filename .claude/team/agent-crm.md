# Agent: CRM Extraction
**Issue:** #108
**Prefix:** crm
**Difficulty:** Medium

---

## Mission

Extract CRM functionality as a standalone modular feature following the established patterns.

---

## Your Workspace (Non-Conflicting)

```
OWNED (create/modify freely):
  src/features/crm/**
  src/services/crm/**

MIGRATE FROM (read, extract, do not delete):
  src/lib/queries/crm-queries.ts
  src/pages/admin/contacts/index.tsx

DO NOT TOUCH:
  src/features/tasks/** (reference only)
  src/features/types.ts (read only)
```

---

## Current State Analysis

**Existing Tables:**
- contacts
- interactions
- follow_ups
- deals
- pipelines

**Existing Files:**
- `src/lib/queries/crm-queries.ts` - Query functions to migrate
- `src/pages/admin/contacts/index.tsx` - Page logic to extract

---

## Target Structure

```
src/features/crm/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Contact, Deal, Pipeline, Interaction schemas
├── README.md             # Module documentation
├── components/
│   ├── index.ts
│   ├── ContactList.tsx
│   ├── ContactDetail.tsx
│   ├── DealPipeline.tsx
│   └── InteractionLog.tsx
└── pages/
    ├── index.ts
    ├── ContactsPage.tsx
    ├── DealsPage.tsx
    └── PipelinePage.tsx

src/services/crm/
├── index.ts
├── crm-service.interface.ts
└── crm-service.supabase.ts
```

---

## Implementation Steps

### Phase 1: Structure
- [x] Create `src/features/crm/` directory structure
- [x] Create `src/services/crm/` directory structure (already existed)
- [x] Define schemas in `schemas.ts`

### Phase 2: Service Layer
- [x] Define `ICrmService` interface (already existed)
- [x] Implement `CrmServiceSupabase` (already existed)
- [x] Migrate queries from `crm-queries.ts` (already existed)

### Phase 3: Feature Module
- [x] Create `module.ts` with FeatureModule definition
- [x] Define routes with lazy loading
- [x] Set permissions: `crm:read`, `crm:write`

### Phase 4: Components
- [x] Extract/create `ContactList.tsx`
- [x] Extract/create `ContactDetail.tsx`
- [x] Create `DealPipeline.tsx`
- [x] Create `InteractionLog.tsx`
- [x] Create `ContactCard.tsx`
- [x] Create `ContactForm.tsx`
- [x] Create `InteractionForm.tsx`
- [x] Create `FollowUpList.tsx`
- [x] Create `FollowUpForm.tsx`
- [x] Create `DealCard.tsx`
- [x] Create `PipelineBoard.tsx`

### Phase 5: Pages
- [x] Create `ContactsPage.tsx`
- [x] Create `ContactDetailPage.tsx`
- [x] Create `DealsPage.tsx`
- [x] Create `PipelinePage.tsx`

### Phase 6: Finalize
- [x] Create barrel exports (`index.ts` files)
- [x] Write `README.md`
- [x] Update team artifact with completion status

---

## Agent Tools to Register

```typescript
tools: [
  { name: 'crm_search_contacts', permission: 'crm:read' },
  { name: 'crm_get_contact', permission: 'crm:read' },
  { name: 'crm_log_interaction', permission: 'crm:write' },
  { name: 'crm_update_deal', permission: 'crm:write' },
]
```

---

## Database Tables (Target)

```sql
-- Prefix all tables with crm_
app.crm_contacts
app.crm_interactions
app.crm_follow_ups
app.crm_deals
app.crm_pipelines
```

---

## Success Criteria

- [x] CRM FeatureModule exported and functional
- [x] ICrmService interface complete
- [x] Supabase implementation working
- [x] All components render correctly
- [x] Routes accessible at `/admin/crm/*`
- [x] No TypeScript errors
- [x] README.md documents the module

---

## Completion Summary

**Status:** COMPLETE
**Date:** 2026-01-20

### Files Created (21 total)

**Core Module Files (4):**
- `src/features/crm/index.ts` - Public API exports
- `src/features/crm/module.ts` - FeatureModule definition
- `src/features/crm/schemas.ts` - Zod schemas and types
- `src/features/crm/README.md` - Comprehensive documentation

**Components (12):**
- `src/features/crm/components/index.ts` - Component barrel exports
- `src/features/crm/components/ContactList.tsx` - Contact list with expand/collapse
- `src/features/crm/components/ContactCard.tsx` - Compact contact card
- `src/features/crm/components/ContactDetail.tsx` - Full contact detail view
- `src/features/crm/components/ContactForm.tsx` - Contact create/edit form
- `src/features/crm/components/InteractionLog.tsx` - Timeline view of interactions
- `src/features/crm/components/InteractionForm.tsx` - Log interaction form
- `src/features/crm/components/FollowUpList.tsx` - Follow-up list with status
- `src/features/crm/components/FollowUpForm.tsx` - Create follow-up form
- `src/features/crm/components/DealCard.tsx` - Deal card view
- `src/features/crm/components/DealPipeline.tsx` - Visual pipeline board
- `src/features/crm/components/PipelineBoard.tsx` - Pipeline board alias

**Pages (5):**
- `src/features/crm/pages/index.ts` - Page barrel exports
- `src/features/crm/pages/ContactsPage.tsx` - Main contacts list page
- `src/features/crm/pages/ContactDetailPage.tsx` - Individual contact detail page
- `src/features/crm/pages/DealsPage.tsx` - Deals list page
- `src/features/crm/pages/PipelinePage.tsx` - Pipeline visualization page

**Service Layer (1 modified):**
- `src/services/crm/index.ts` - Updated barrel export (service interface and implementation already existed)

### Key Features Implemented

1. **Contact Management** - Full CRUD, filtering, search, status management
2. **Interaction Tracking** - Timeline view, sentiment tracking, multiple interaction types
3. **Follow-up Management** - Scheduling, priority levels, overdue tracking
4. **Deal Pipeline** - Visual board, stage management, value tracking
5. **Contact Lists** - Static and smart lists (framework in place)

### TypeScript Compilation

- No errors in CRM module code
- All imports resolve correctly
- Type safety throughout

### Architectural Compliance

- Follows tasks module pattern exactly
- Service layer abstraction in place
- Lazy-loaded routes
- Multi-tenant ready
- Permission-based access control
