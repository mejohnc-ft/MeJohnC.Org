# Agent: News Extraction
**Issue:** #112
**Prefix:** news
**Difficulty:** Medium

---

## Mission

Extract News aggregation functionality as a standalone modular feature.

---

## Your Workspace (Non-Conflicting)

```
OWNED (create/modify freely):
  src/features/news/**
  src/services/news/**

MIGRATE FROM (read, extract news-related only):
  src/lib/queries/supabase-queries.ts (news functions only)
  src/pages/admin/news/** (news pages)

DO NOT TOUCH:
  src/features/tasks/** (reference only)
  src/features/types.ts (read only)
```

---

## Design Decision

**Focus: External News Aggregator** (based on current implementation)
- RSS feed parsing
- NewsAPI integration
- Custom webhook receiver
- AI-powered summarization

---

## Current State Analysis

**Existing Tables:**
- news_articles
- news_sources
- news_categories
- news_dashboard_tabs

**Existing Pages:**
- admin/news/index.tsx

---

## Target Structure

```
src/features/news/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Article, Source, Category schemas
├── README.md             # Module documentation
├── adapters/
│   ├── rss-adapter.ts        # RSS feed parser
│   ├── newsapi-adapter.ts    # NewsAPI integration
│   └── webhook-adapter.ts    # Custom webhook receiver
├── components/
│   ├── index.ts
│   ├── NewsFeed.tsx
│   ├── ArticleCard.tsx
│   ├── SourceManager.tsx
│   └── CategoryFilter.tsx
└── pages/
    ├── index.ts
    ├── FeedPage.tsx
    └── SourcesPage.tsx

src/services/news/
├── index.ts
├── news-service.interface.ts
└── news-service.supabase.ts
```

---

## Implementation Steps

### Phase 1: Structure
- [ ] Create `src/features/news/` directory structure
- [ ] Create `src/services/news/` directory structure
- [ ] Define schemas in `schemas.ts`

### Phase 2: Service Layer
- [ ] Define `INewsService` interface
- [ ] Implement `NewsServiceSupabase`
- [ ] Migrate news queries from supabase-queries.ts

### Phase 3: Feature Module
- [ ] Create `module.ts` with FeatureModule definition
- [ ] Define routes with lazy loading
- [ ] Set permissions: `news:read`

### Phase 4: Components
- [ ] Create `NewsFeed.tsx`
- [ ] Create `ArticleCard.tsx`
- [ ] Create `SourceManager.tsx`
- [ ] Create `CategoryFilter.tsx`

### Phase 5: Pages
- [ ] Create `FeedPage.tsx`
- [ ] Create `SourcesPage.tsx`

### Phase 6: Adapters
- [ ] Implement `rss-adapter.ts` (core functionality)
- [ ] Define `newsapi-adapter.ts` interface
- [ ] Define `webhook-adapter.ts` interface

### Phase 7: Finalize
- [ ] Create barrel exports
- [ ] Write `README.md`
- [ ] Update team artifact

---

## Agent Tools to Register

```typescript
tools: [
  { name: 'news_search', permission: 'news:read' },
  { name: 'news_get_trending', permission: 'news:read' },
  { name: 'news_summarize', permission: 'news:read' },  // AI summary
]
```

---

## Adapters

### RSS Adapter (Implement)
```typescript
interface RssAdapter {
  fetchFeed(url: string): Promise<Article[]>;
  parseFeed(xml: string): Article[];
  validateSource(url: string): Promise<boolean>;
}
```

### NewsAPI Adapter (Interface Only)
```typescript
interface NewsApiAdapter {
  searchArticles(query: string): Promise<Article[]>;
  getTopHeadlines(category: string): Promise<Article[]>;
}
```

### Webhook Adapter (Interface Only)
```typescript
interface WebhookAdapter {
  handleIncoming(payload: unknown): Promise<Article>;
  validateSignature(payload: unknown, signature: string): boolean;
}
```

---

## Database Tables (Target)

```sql
app.news_articles
app.news_sources
app.news_categories
app.news_subscriptions
app.news_read_status
```

---

## Success Criteria

- [ ] News FeatureModule exported
- [ ] INewsService interface complete
- [ ] RSS adapter functional
- [ ] NewsAPI/Webhook adapter interfaces defined
- [ ] Feed renders with articles
- [ ] Routes at `/admin/news/*`
- [ ] No TypeScript errors
- [ ] README.md documents the module
