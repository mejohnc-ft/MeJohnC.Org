# Agent: NPS Agent Extraction
**Issue:** #111
**Prefix:** nps
**Difficulty:** Medium

---

## Mission

Extract NPS survey system with AI-powered analysis as a standalone modular feature.

---

## Your Workspace (Non-Conflicting)

```
OWNED (create/modify freely):
  src/features/nps/**
  src/services/nps/**

MIGRATE FROM (read, extract NPS-related only):
  src/lib/queries/marketing-queries.ts (NPS functions only)
  nps_surveys table (currently in marketing schema)

DO NOT TOUCH:
  src/features/tasks/** (reference only)
  src/features/types.ts (read only)
  src/features/crm/** (agent-crm owns this)
```

---

## Current State Analysis

**Existing:**
- Tables: nps_surveys (in marketing schema)
- Part of marketing-queries.ts
- Basic NPS UI exists

---

## Target Structure

```
src/features/nps/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Survey, Response, Analysis schemas
├── README.md             # Module documentation
├── adapters/
│   ├── email-adapter.ts      # SendGrid/Resend interface
│   ├── sms-adapter.ts        # Twilio interface
│   └── crm-sync-adapter.ts   # CRM score sync (future)
├── components/
│   ├── index.ts
│   ├── NpsDashboard.tsx
│   ├── SurveyBuilder.tsx
│   ├── ResponseList.tsx
│   ├── DetractorAlert.tsx
│   └── TrendChart.tsx
└── pages/
    ├── index.ts
    ├── SurveysPage.tsx
    ├── ResponsesPage.tsx
    └── AnalysisPage.tsx

src/services/nps/
├── index.ts
├── nps-service.interface.ts
└── nps-service.supabase.ts
```

---

## Implementation Steps

### Phase 1: Structure
- [ ] Create `src/features/nps/` directory structure
- [ ] Create `src/services/nps/` directory structure
- [ ] Define schemas in `schemas.ts`

### Phase 2: Service Layer
- [ ] Define `INpsService` interface
- [ ] Implement `NpsServiceSupabase`
- [ ] Migrate NPS queries from marketing-queries.ts

### Phase 3: Feature Module
- [ ] Create `module.ts` with FeatureModule definition
- [ ] Define routes with lazy loading
- [ ] Set permissions: `nps:read`, `nps:write`

### Phase 4: Components
- [ ] Create `NpsDashboard.tsx`
- [ ] Create `SurveyBuilder.tsx`
- [ ] Create `ResponseList.tsx`
- [ ] Create `DetractorAlert.tsx`
- [ ] Create `TrendChart.tsx`

### Phase 5: Pages
- [ ] Create `SurveysPage.tsx`
- [ ] Create `ResponsesPage.tsx`
- [ ] Create `AnalysisPage.tsx`

### Phase 6: Adapters (Interfaces Only)
- [ ] Define `email-adapter.ts` interface
- [ ] Define `sms-adapter.ts` interface
- [ ] Define `crm-sync-adapter.ts` interface (for future CRM integration)

### Phase 7: Finalize
- [ ] Create barrel exports
- [ ] Write `README.md`
- [ ] Update team artifact

---

## Agent Tools to Register (AI-Powered)

```typescript
tools: [
  { name: 'nps_get_score', permission: 'nps:read' },
  { name: 'nps_list_detractors', permission: 'nps:read' },
  { name: 'nps_analyze_feedback', permission: 'nps:read' },  // AI analysis
  { name: 'nps_send_survey', permission: 'nps:write' },
  { name: 'nps_suggest_followup', permission: 'nps:read' }, // AI suggestions
]
```

---

## AI Integration Points

1. **Sentiment Analysis** - Analyze verbatim feedback
2. **Detractor Prediction** - Flag at-risk customers
3. **Action Suggestions** - Recommend follow-up actions
4. **Trend Detection** - Identify NPS patterns

---

## Events to Define

```typescript
events: [
  'nps.response.received',
  'nps.score.changed',
  'nps.detractor.flagged',
]
```

---

## Database Tables (Target)

```sql
app.nps_surveys
app.nps_responses
app.nps_campaigns
app.nps_analysis
```

---

## Cross-Module Dependency

**Optional CRM Sync:** After CRM module (#108) is complete, the `crm-sync-adapter.ts` can push NPS scores to contact records. For now, define the interface only.

---

## Success Criteria

- [ ] NPS FeatureModule exported
- [ ] INpsService interface complete
- [ ] NPS tables separated from marketing
- [ ] AI analysis tool interfaces defined
- [ ] Adapter interfaces for email/SMS
- [ ] Routes at `/admin/nps/*`
- [ ] No TypeScript errors
- [ ] README.md documents the module
