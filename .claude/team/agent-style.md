# Agent: Style Guide Extraction
**Issue:** #110
**Prefix:** style
**Difficulty:** Low

---

## Mission

Extract Style Guide functionality as a standalone modular feature.

---

## Your Workspace (Non-Conflicting)

```
OWNED (create/modify freely):
  src/features/style-guide/**
  src/services/style/**

MIGRATE FROM (read, extract style-related):
  Figma API integration files
  Design token exports
  Component documentation pages

DO NOT TOUCH:
  src/features/tasks/** (reference only)
  src/features/types.ts (read only)
```

---

## Current State Analysis

**Existing Functionality:**
- Figma API integration
- Design token export to Tailwind
- Component documentation pages

---

## Target Structure

```
src/features/style-guide/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Brand, Asset, Guideline schemas
├── README.md             # Module documentation
├── adapters/
│   └── figma-adapter.ts  # Figma API integration
├── components/
│   ├── index.ts
│   ├── ColorPalette.tsx
│   ├── TypographyScale.tsx
│   ├── ComponentShowcase.tsx
│   └── AssetLibrary.tsx
└── pages/
    ├── index.ts
    ├── BrandPage.tsx
    ├── ColorsPage.tsx
    ├── TypographyPage.tsx
    └── ComponentsPage.tsx

src/services/style/
├── index.ts
├── style-service.interface.ts
└── style-service.supabase.ts
```

---

## Implementation Steps

### Phase 1: Structure
- [ ] Create `src/features/style-guide/` directory structure
- [ ] Create `src/services/style/` directory structure
- [ ] Define schemas in `schemas.ts`

### Phase 2: Service Layer
- [ ] Define `IStyleService` interface
- [ ] Implement `StyleServiceSupabase`
- [ ] Encapsulate Figma integration

### Phase 3: Feature Module
- [ ] Create `module.ts` with FeatureModule definition
- [ ] Define routes with lazy loading
- [ ] Set permissions: `style:read`

### Phase 4: Components
- [ ] Create `ColorPalette.tsx`
- [ ] Create `TypographyScale.tsx`
- [ ] Create `ComponentShowcase.tsx`
- [ ] Create `AssetLibrary.tsx`

### Phase 5: Pages
- [ ] Create `BrandPage.tsx`
- [ ] Create `ColorsPage.tsx`
- [ ] Create `TypographyPage.tsx`
- [ ] Create `ComponentsPage.tsx`

### Phase 6: Adapters
- [ ] Extract/create `figma-adapter.ts`
- [ ] Define adapter interface for future integrations

### Phase 7: Finalize
- [ ] Create barrel exports
- [ ] Write `README.md`
- [ ] Update team artifact

---

## Agent Tools to Register

```typescript
tools: [
  { name: 'style_get_brand', permission: 'style:read' },
  { name: 'style_list_assets', permission: 'style:read' },
  { name: 'style_search_guidelines', permission: 'style:read' },
]
```

---

## External Adapters

- **Figma API adapter** (already exists - encapsulate)
- **Asset storage adapter** (Azure Blob - interface only)

---

## Database Tables (Target)

```sql
app.style_brands
app.style_colors
app.style_typography
app.style_assets
app.style_guidelines
```

---

## Standalone Value

MSPs/agencies managing multiple client brands can use this independently for:
- Brand asset management
- Design system documentation
- Style guide generation

---

## Success Criteria

- [ ] Style FeatureModule exported
- [ ] IStyleService interface complete
- [ ] Figma integration encapsulated in adapter
- [ ] Color/Typography components render
- [ ] Routes at `/admin/style/*`
- [ ] No TypeScript errors
- [ ] README.md documents the module
