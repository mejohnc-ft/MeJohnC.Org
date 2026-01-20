# Caching Strategy

This document defines the caching strategy for MeJohnC.Org, a React SPA deployed on Netlify with Supabase as the backend and Clerk for authentication.

---

## Table of Contents

1. [Caching Strategy Overview](#caching-strategy-overview)
2. [Caching Layers](#caching-layers)
3. [What to Cache](#what-to-cache)
4. [Cache Invalidation Strategies](#cache-invalidation-strategies)
5. [Cache Key Design Patterns](#cache-key-design-patterns)
6. [TTL Recommendations by Data Type](#ttl-recommendations-by-data-type)
7. [When to Add Redis/Memcached](#when-to-add-redismemcached)
8. [Monitoring Cache Performance](#monitoring-cache-performance)
9. [Cache Warming Strategies](#cache-warming-strategies)
10. [Cost-Benefit Analysis](#cost-benefit-analysis)

---

## Caching Strategy Overview

### Philosophy

MeJohnC.Org follows a **layered caching approach** that leverages the strengths of each tier in the JAMstack architecture:

```
User Browser
    |
    v [Browser Cache]
    |
Netlify CDN
    |
    v [CDN Edge Cache]
    |
React Application
    |
    v [In-Memory / Client-Side Cache]
    |
Supabase
    |
    v [PostgreSQL Query Cache + Connection Pooling]
```

### Core Principles

| Principle | Implementation |
|-----------|----------------|
| Cache at the edge | Static assets served from Netlify's global CDN |
| Cache close to user | Browser caching with appropriate Cache-Control headers |
| Cache immutable content | Content-hashed assets cached indefinitely |
| Stale-while-revalidate | Serve cached data while fetching fresh data in background |
| Cache by authentication | Separate cache strategies for public vs. authenticated content |

### Current Implementation Status

| Layer | Status | Notes |
|-------|--------|-------|
| Browser caching | Implemented | Via `public/_headers` |
| CDN caching | Implemented | Netlify automatic + custom headers |
| Application caching | Partial | No request deduplication (see `useDataFetching.ts`) |
| Database caching | Managed | Supabase handles PostgreSQL caching |

---

## Caching Layers

### 1. Browser Caching (Cache-Control Headers)

Browser caching is the first and most effective caching layer. It eliminates network requests entirely for cached resources.

**Current Configuration (`public/_headers`):**

```
# Static assets with content hashes - cache forever
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Images - cache for 24 hours
/*.png
  Cache-Control: public, max-age=86400
/*.jpg
  Cache-Control: public, max-age=86400
/*.svg
  Cache-Control: public, max-age=86400
/*.webp
  Cache-Control: public, max-age=86400

# HTML - always revalidate (SPA routing)
/*.html
  Cache-Control: no-cache, no-store, must-revalidate

# Service Worker - always fresh
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

# Sitemap and robots - refresh hourly
/sitemap.xml
  Cache-Control: public, max-age=3600
/robots.txt
  Cache-Control: public, max-age=3600
```

**Cache-Control Directive Reference:**

| Directive | Purpose | Use Case |
|-----------|---------|----------|
| `public` | Cacheable by any cache | Public assets, images |
| `private` | Only browser can cache | User-specific data |
| `max-age=N` | Cache for N seconds | All cacheable resources |
| `immutable` | Content will never change | Hashed assets |
| `no-cache` | Always revalidate | HTML, service worker |
| `no-store` | Never cache | Sensitive data |
| `must-revalidate` | Strict freshness check | Critical resources |

### 2. CDN Caching (Netlify Edge)

Netlify automatically caches static assets at edge locations worldwide. The build process generates content-hashed filenames ensuring cache safety.

**How Netlify Edge Caching Works:**

```
Build Output (Vite)           Netlify CDN
-------------------           -----------
/assets/
  vendor-react.[hash].js  --> Cached at 200+ edge locations
  vendor-auth.[hash].js   --> Immutable caching (1 year)
  index.[hash].css        --> Instant global delivery
```

**CDN Cache Benefits:**

| Benefit | Impact |
|---------|--------|
| Global distribution | <50ms latency worldwide |
| Automatic compression | Brotli/gzip on-the-fly |
| DDoS protection | Built into Netlify edge |
| Atomic deploys | New hash = new cache entry |

**Cache Purging:**

Netlify automatically purges CDN cache on each deploy. Manual purging is available via:
- Netlify Dashboard: Site Settings > Build & deploy > Clear cache
- Netlify CLI: `netlify cache:clear`
- API: POST to `https://api.netlify.com/api/v1/sites/{site_id}/build_hooks`

### 3. Application Caching Options

The React application can implement client-side caching for API responses. Currently, `useDataFetching.ts` does not implement caching (see the documented limitation).

**Current State:**

```typescript
// src/hooks/useDataFetching.ts - Current limitations documented:
/**
 * **Current limitations:**
 * - No request deduplication: Multiple components fetching the same data will make
 *   multiple network requests
 * - No caching: Data is refetched every time a component mounts
 */
```

**Recommended Implementation - React Query (Future Enhancement):**

```typescript
// Example migration to React Query
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure caching behavior
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // Data fresh for 5 minutes
      gcTime: 30 * 60 * 1000,          // Keep in cache for 30 minutes
      refetchOnWindowFocus: false,     // Don't refetch on tab focus
      retry: 3,                        // Retry failed requests
    },
  },
});

// Usage
function BlogPosts() {
  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', { status: 'published' }],
    queryFn: () => getBlogPosts(),
    staleTime: 15 * 60 * 1000,  // Blog posts fresh for 15 minutes
  });
}
```

**Manual In-Memory Cache Pattern:**

```typescript
// Simple cache utility for current architecture
const cache = new Map<string, { data: unknown; timestamp: number }>();

export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttlMs) {
    return Promise.resolve(cached.data as T);
  }

  return fetcher().then((data) => {
    cache.set(key, { data, timestamp: now });
    return data;
  });
}

// Usage
const posts = await withCache(
  'blog-posts:published',
  () => supabase.from('blog_posts').select('*').eq('status', 'published'),
  5 * 60 * 1000  // 5 minutes
);
```

### 4. Database Query Caching (Supabase)

Supabase provides several caching mechanisms at the database level:

**PostgreSQL Query Cache:**

PostgreSQL automatically caches query plans and recently accessed data pages. This is managed by Supabase and requires no configuration.

**PgBouncer Connection Pooling:**

Connection pooling reduces connection overhead and improves query throughput:

```typescript
// Current implementation uses connection pooling automatically
// Connection string includes pgbouncer=true for serverless
const connectionString = `${SUPABASE_URL}?pgbouncer=true`;
```

**Materialized Views for Complex Queries:**

For expensive aggregate queries, consider materialized views:

```sql
-- Example: Cached dashboard metrics
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as total_posts,
  (SELECT COUNT(*) FROM apps WHERE status = 'published') as total_apps,
  (SELECT COUNT(*) FROM projects) as total_projects,
  NOW() as refreshed_at;

-- Refresh on schedule (via Supabase cron or external trigger)
REFRESH MATERIALIZED VIEW mv_dashboard_metrics;
```

---

## What to Cache

### Static Assets (Already on CDN)

**Status:** Fully implemented via Netlify CDN

| Asset Type | Location | TTL | Notes |
|------------|----------|-----|-------|
| JavaScript bundles | `/assets/*.js` | 1 year (immutable) | Content-hashed |
| CSS bundles | `/assets/*.css` | 1 year (immutable) | Content-hashed |
| Images | `/assets/images/*` | 24 hours | May change |
| Fonts | `/assets/fonts/*` | 1 year (immutable) | Rarely change |
| Favicon/icons | `/` | 24 hours | Brand updates |

### API Responses

**Current:** Not cached (each request hits Supabase)
**Recommended:** Implement client-side caching

| Endpoint/Query | Recommended TTL | Reason |
|----------------|-----------------|--------|
| Public blog posts | 15 minutes | Content updates infrequently |
| Public apps/projects | 15 minutes | Portfolio content is stable |
| Site content (hero, about) | 30 minutes | Rarely changes |
| News articles | 5 minutes | Fresh content expected |
| Dashboard metrics | 5 minutes | Near real-time acceptable |

**Implementation Strategy:**

```typescript
// Cache keys for different data types
const CACHE_CONFIG = {
  'blog-posts': { ttl: 15 * 60 * 1000, prefix: 'blog' },
  'apps': { ttl: 15 * 60 * 1000, prefix: 'apps' },
  'projects': { ttl: 15 * 60 * 1000, prefix: 'proj' },
  'site-content': { ttl: 30 * 60 * 1000, prefix: 'site' },
  'news': { ttl: 5 * 60 * 1000, prefix: 'news' },
  'metrics': { ttl: 5 * 60 * 1000, prefix: 'metrics' },
} as const;
```

### Database Query Results

For read-heavy pages, cache Supabase query results:

| Query Pattern | Cache Strategy | Invalidation |
|--------------|----------------|--------------|
| List queries (paginated) | Cache by page + filters | On write to table |
| Single record by ID | Cache by ID | On update to record |
| Aggregate queries | Cache with short TTL | Time-based |
| Search queries | Cache by search term | Time-based |

**Example Cached Query:**

```typescript
async function getCachedPosts(page: number, limit: number) {
  const cacheKey = `posts:list:${page}:${limit}`;

  return withCache(cacheKey, async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return data;
  }, CACHE_CONFIG['blog-posts'].ttl);
}
```

### Session/Auth Data (Managed by Clerk)

**Status:** Fully managed by Clerk - no caching needed

Clerk handles all authentication caching internally:

| Data | Clerk Handling |
|------|----------------|
| Session tokens | Cached in memory, auto-refreshed |
| User metadata | Cached with configurable freshness |
| JWT for Supabase | Generated on-demand with template |

**Integration Point:**

```typescript
// src/lib/supabase.ts - Clerk JWT integration
export function useAuthenticatedSupabase() {
  const { session } = useSession();

  const getToken = useCallback(async () => {
    // Clerk handles caching; tokens refreshed automatically
    return session?.getToken({ template: 'supabase' });
  }, [session]);

  // ...
}
```

---

## Cache Invalidation Strategies

### Time-Based Invalidation (TTL)

The simplest strategy - cache expires after a fixed duration.

```typescript
const TTL_STRATEGIES = {
  // Very stable content
  LONG: 30 * 60 * 1000,      // 30 minutes

  // Moderately stable content
  MEDIUM: 15 * 60 * 1000,    // 15 minutes

  // Frequently updated content
  SHORT: 5 * 60 * 1000,      // 5 minutes

  // Near real-time needs
  BRIEF: 60 * 1000,          // 1 minute
};
```

**When to use:** Public content where slight staleness is acceptable.

### Event-Based Invalidation

Invalidate cache when data changes.

```typescript
// Example: Clear cache on content update
async function updateBlogPost(id: string, data: BlogPostUpdate) {
  const result = await supabase
    .from('blog_posts')
    .update(data)
    .eq('id', id);

  if (!result.error) {
    // Invalidate specific post cache
    cache.delete(`post:${id}`);
    // Invalidate list caches that may include this post
    invalidateCachesByPrefix('posts:list');
  }

  return result;
}

function invalidateCachesByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
```

**When to use:** Admin-edited content, user-specific data.

### Stale-While-Revalidate (SWR)

Serve cached data immediately, then fetch fresh data in background.

```typescript
async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  // Return stale data immediately if available
  if (cached) {
    // If stale, trigger background refresh
    if (now - cached.timestamp > ttlMs) {
      // Don't await - let it run in background
      fetcher().then((data) => {
        cache.set(key, { data, timestamp: Date.now() });
      });
    }
    return cached.data as T;
  }

  // No cache - fetch synchronously
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}
```

**When to use:** Content where freshness is preferred but staleness is tolerable.

### Cache Versioning

Include version in cache keys for breaking changes.

```typescript
const CACHE_VERSION = 'v2';

function makeCacheKey(type: string, ...parts: string[]): string {
  return `${CACHE_VERSION}:${type}:${parts.join(':')}`;
}

// Usage
const key = makeCacheKey('posts', 'list', page.toString());
// Result: "v2:posts:list:1"
```

**When to use:** After schema changes or API updates.

---

## Cache Key Design Patterns

### Key Structure

Use consistent, hierarchical key naming:

```
{version}:{entity}:{operation}:{parameters}
```

### Examples

```typescript
const CACHE_KEYS = {
  // List operations
  blogPosts: (page: number, status: string) =>
    `v1:blog:list:${status}:page:${page}`,

  // Single entity
  blogPost: (id: string) =>
    `v1:blog:single:${id}`,

  // Filtered queries
  appsByCategory: (category: string) =>
    `v1:apps:category:${category}`,

  // Aggregate/metrics
  dashboardMetrics: () =>
    `v1:metrics:dashboard`,

  // Search results
  searchResults: (query: string, type: string) =>
    `v1:search:${type}:${hashString(query)}`,

  // User-specific (use with caution)
  userBookmarks: (userId: string, page: number) =>
    `v1:bookmarks:user:${userId}:page:${page}`,
};
```

### Key Design Best Practices

| Practice | Example | Reason |
|----------|---------|--------|
| Include version | `v1:posts:...` | Safe schema migrations |
| Normalize parameters | Sort filter keys alphabetically | Prevent duplicate entries |
| Hash long values | `search:${md5(query)}` | Keep keys manageable |
| Separate by auth | `public:` vs `user:{id}:` | Prevent data leakage |
| Include pagination | `:page:1:limit:10` | Proper list caching |

---

## TTL Recommendations by Data Type

### Public Content

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Site hero/branding | 1 hour | Rarely changes |
| About page content | 1 hour | Rarely changes |
| Published blog posts | 15 minutes | Balance freshness/performance |
| Published apps/projects | 15 minutes | Portfolio content stable |
| Contact links | 1 hour | Rarely changes |
| Work history | 1 hour | Rarely changes |
| Skills | 1 hour | Rarely changes |

### Dynamic Content

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| News articles | 5 minutes | Fresh content expected |
| GitHub metrics | 5 minutes | External API rate limits |
| Dashboard analytics | 5 minutes | Near real-time acceptable |
| Search results | 5 minutes | Balance relevance/performance |

### User-Specific Content

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| User bookmarks | 2 minutes | Personal data, expect freshness |
| Draft posts | 0 (no cache) | Active editing |
| Task lists | 1 minute | Active collaboration |
| Session preferences | Session duration | Memory-only |

### External API Data

| Source | TTL | Rationale |
|--------|-----|-----------|
| Ghost CMS blog | 15 minutes | Content updates infrequently |
| GitHub API | 5 minutes | Rate limit: 60 req/hour unauthenticated |
| RSS feeds (news) | 5 minutes | Balance freshness/load |

---

## When to Add Redis/Memcached

### Signs You Need External Caching

Consider adding Redis or Memcached when you observe:

| Signal | Threshold | Explanation |
|--------|-----------|-------------|
| Database CPU | Sustained >70% | Queries overwhelming PostgreSQL |
| API response time | P95 >500ms | Slow queries affecting UX |
| Database connections | >80% of limit | Connection pool exhaustion |
| Identical queries | >50% of traffic | Same data requested repeatedly |
| Session management | Complex state | Multi-instance session sync |
| Real-time features | Rate limiting, leaderboards | Sub-millisecond reads needed |
| Monthly DB egress | >80% of plan | High bandwidth costs |

### Current Architecture Assessment

**MeJohnC.Org does NOT currently need Redis because:**

1. **Traffic volume** - Personal portfolio with modest traffic
2. **Data freshness** - Minutes-old data is acceptable
3. **Cost efficiency** - Free tiers are sufficient
4. **Complexity** - Additional infrastructure to manage
5. **Supabase capabilities** - PgBouncer and built-in caching handle current load

### When to Reevaluate

Revisit this decision if:
- Monthly visitors exceed 50,000
- Database CPU regularly exceeds 50%
- Real-time features are added (live chat, collaborative editing)
- Multi-region deployment is needed
- Session data needs to persist across deployments

### Implementation Guide (When Needed)

#### Option 1: Upstash Redis (Serverless - Recommended)

Best for JAMstack/serverless architectures:

```typescript
// 1. Install
// npm install @upstash/redis

// 2. Configure
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 3. Usage
async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  const data = await fetcher();
  await redis.setex(key, ttlSeconds, data);
  return data;
}

// 4. Example
const posts = await getCachedData(
  'posts:published',
  () => supabase.from('blog_posts').select('*').eq('status', 'published'),
  900  // 15 minutes
);
```

**Upstash Pricing (as of 2025):**

| Plan | Price | Requests/day | Data |
|------|-------|--------------|------|
| Free | $0 | 10,000 | 256MB |
| Pay-as-go | $0.20/100K requests | Unlimited | Unlimited |
| Pro | $10/month | 100,000/day | 1GB |

#### Option 2: Redis Cloud (Managed Redis)

For higher throughput or persistence needs:

```typescript
// 1. Install
// npm install redis

// 2. Configure
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

await redis.connect();

// 3. Usage with connection management
async function withRedis<T>(
  operation: (client: typeof redis) => Promise<T>
): Promise<T> {
  try {
    return await operation(redis);
  } catch (error) {
    // Handle connection errors
    console.error('Redis error:', error);
    throw error;
  }
}
```

**Redis Cloud Pricing:**

| Plan | Price | Memory | Throughput |
|------|-------|--------|------------|
| Free | $0 | 30MB | 30 connections |
| Fixed | $5/month | 250MB | Dedicated |
| Flexible | Usage-based | Up to 50GB | High availability |

#### Option 3: Netlify Edge Functions + KV (Experimental)

For edge-based caching:

```typescript
// netlify/edge-functions/cached-api.ts
import { Context } from 'https://edge.netlify.com';

// Note: Netlify Blobs can serve as simple KV storage
export default async (request: Request, context: Context) => {
  const cacheKey = new URL(request.url).pathname;

  // Check edge cache
  const cached = await context.cookies.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  // Fetch and cache
  const response = await fetch(/* origin */);
  const data = await response.text();

  return new Response(data, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
```

### Migration Checklist

If adding Redis/Memcached:

- [ ] Document decision in ADR
- [ ] Set up managed service (Upstash recommended)
- [ ] Implement cache wrapper utility
- [ ] Add cache keys to centralized config
- [ ] Implement cache invalidation on writes
- [ ] Add cache hit/miss monitoring
- [ ] Update runbooks for cache operations
- [ ] Test failover behavior (cache unavailable)
- [ ] Configure connection pooling
- [ ] Set up alerts for cache memory usage

---

## Monitoring Cache Performance

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Cache hit rate | >80% | <60% |
| Cache latency (hit) | <5ms | >20ms |
| Cache latency (miss) | <100ms | >500ms |
| Memory usage | <80% | >90% |
| Eviction rate | Low | Sudden spike |

### Implementing Cache Monitoring

```typescript
// Cache metrics collector
interface CacheMetrics {
  hits: number;
  misses: number;
  latencyMs: number[];
  evictions: number;
}

const metrics: Map<string, CacheMetrics> = new Map();

function recordCacheAccess(
  key: string,
  hit: boolean,
  latencyMs: number
): void {
  const prefix = key.split(':')[0];
  const m = metrics.get(prefix) || { hits: 0, misses: 0, latencyMs: [], evictions: 0 };

  if (hit) {
    m.hits++;
  } else {
    m.misses++;
  }
  m.latencyMs.push(latencyMs);

  metrics.set(prefix, m);
}

function getCacheStats(prefix: string): {
  hitRate: number;
  avgLatencyMs: number;
  totalRequests: number;
} {
  const m = metrics.get(prefix);
  if (!m) return { hitRate: 0, avgLatencyMs: 0, totalRequests: 0 };

  const total = m.hits + m.misses;
  return {
    hitRate: total > 0 ? m.hits / total : 0,
    avgLatencyMs: m.latencyMs.reduce((a, b) => a + b, 0) / m.latencyMs.length,
    totalRequests: total,
  };
}
```

### Integration with Existing Monitoring

**Sentry Performance:**

```typescript
// Track cache operations in Sentry
import * as Sentry from '@sentry/react';

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name: 'cache.fetch', op: 'cache' }, async (span) => {
    const start = performance.now();
    const cached = cache.get(key);

    if (cached) {
      span?.setAttribute('cache.hit', true);
      span?.setAttribute('cache.latency_ms', performance.now() - start);
      return cached.data as T;
    }

    span?.setAttribute('cache.hit', false);
    const data = await fetcher();
    span?.setAttribute('cache.latency_ms', performance.now() - start);
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}
```

**Web Vitals Integration:**

```typescript
// src/lib/web-vitals.ts - Add cache metrics reporting
export function reportCacheMetrics(): void {
  const stats = getCacheStats('all');

  // Report to analytics
  if (window.gtag) {
    window.gtag('event', 'cache_performance', {
      hit_rate: stats.hitRate,
      avg_latency: stats.avgLatencyMs,
      total_requests: stats.totalRequests,
    });
  }
}
```

### Dashboard Queries (Future)

If implementing cache metrics storage:

```sql
-- Cache performance over time
SELECT
  date_trunc('hour', recorded_at) as hour,
  cache_prefix,
  SUM(hits) as total_hits,
  SUM(misses) as total_misses,
  SUM(hits)::float / NULLIF(SUM(hits) + SUM(misses), 0) as hit_rate,
  AVG(avg_latency_ms) as avg_latency
FROM cache_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

---

## Cache Warming Strategies

### Why Warm Caches

Cache warming pre-populates caches to avoid "cold start" latency spikes:

- After deployments (CDN cache cleared)
- After cache flushes
- Before expected traffic spikes
- On scheduled intervals for critical data

### Strategies

#### 1. Build-Time Warming (Static)

Pre-render critical data during build:

```javascript
// scripts/warm-cache.js (run during build)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function warmCache() {
  // Fetch and write static JSON files
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  fs.writeFileSync(
    'public/cache/recent-posts.json',
    JSON.stringify(posts)
  );
}

warmCache();
```

```json
// package.json
{
  "scripts": {
    "build": "node scripts/warm-cache.js && vite build"
  }
}
```

#### 2. Deployment-Time Warming

Trigger cache warming after deploy:

```yaml
# netlify.toml
[build]
  command = "npm run build && npm run warm-cache"

# Or use Netlify deploy hooks
[[plugins]]
  package = "netlify-plugin-cache-warmup"

  [plugins.inputs]
    urls = [
      "/",
      "/portfolio",
      "/about"
    ]
```

#### 3. Background Warming (Runtime)

Warm caches during idle periods:

```typescript
// Service worker cache warming
// public/sw.js
const WARM_URLS = [
  '/api/blog/posts',
  '/api/apps',
  '/api/projects',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('api-cache-v1').then((cache) => {
      return Promise.all(
        WARM_URLS.map((url) =>
          fetch(url)
            .then((response) => cache.put(url, response))
            .catch(() => {}) // Ignore failures
        )
      );
    })
  );
});
```

#### 4. Scheduled Warming

Use Supabase cron or external scheduler:

```sql
-- Supabase cron job for cache warming (pg_cron extension)
SELECT cron.schedule(
  'warm-materialized-views',
  '*/15 * * * *',  -- Every 15 minutes
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_posts;
  $$
);
```

### Warming Priority

| Priority | Content | Strategy |
|----------|---------|----------|
| Critical | Homepage data, navigation | Build-time |
| High | Popular blog posts, app listings | Deploy-time |
| Medium | Search indexes, filters | Background |
| Low | Historical data, archives | On-demand |

---

## Cost-Benefit Analysis

### Costs of Caching

| Cost Type | Description | Mitigation |
|-----------|-------------|------------|
| Memory usage | RAM for in-memory caches | Set max size limits |
| Storage | Disk for persistent caches | Use TTLs, eviction policies |
| Complexity | Code and operational overhead | Document thoroughly |
| Stale data risk | Users see outdated information | Appropriate TTLs, invalidation |
| Debugging difficulty | Cached vs. fresh data issues | Cache bypass headers |

### Benefits of Caching

| Benefit | Impact | Measurement |
|---------|--------|-------------|
| Reduced latency | 10-100x faster responses | Time to First Byte (TTFB) |
| Lower database load | Fewer queries, connections | Database CPU, connections |
| Reduced bandwidth | Less data transfer | Egress costs, CDN hits |
| Better UX | Faster page loads | Core Web Vitals |
| Cost savings | Lower infrastructure bills | Monthly spend |

### ROI Analysis for MeJohnC.Org

**Current State (No Application Caching):**

| Metric | Value | Monthly Cost |
|--------|-------|--------------|
| Supabase queries | ~50,000 | $0 (free tier) |
| Netlify bandwidth | ~10GB | $0 (free tier) |
| API response time | ~200ms | - |
| Infrastructure | Netlify + Supabase | $0 |

**Projected with Client-Side Caching:**

| Metric | Value | Improvement |
|--------|-------|-------------|
| Supabase queries | ~15,000 (70% reduction) | Extends free tier runway |
| Netlify bandwidth | ~8GB (20% reduction) | Minor |
| API response time | ~50ms (75% faster) | Better UX |
| Infrastructure | Same | $0 |

**Break-Even for Redis:**

| Scenario | Without Redis | With Redis (Upstash Free) |
|----------|---------------|---------------------------|
| Queries/month | 50,000 | 15,000 |
| At Supabase Pro ($25/mo) | Needed at ~500K queries | Delayed |
| Complexity cost | Low | Medium |

**Recommendation:**

1. **Now:** Implement client-side caching with `useDataFetching` enhancement or React Query
2. **At 50K visitors/month:** Reevaluate; client-side cache may suffice
3. **At 100K+ visitors/month:** Consider Upstash Redis free tier
4. **At scale:** Enterprise caching strategy with Redis Cloud

### Decision Framework

```
                    Need External Cache?
                           |
        +------------------+------------------+
        |                                     |
   Traffic < 50K/mo                     Traffic > 50K/mo
        |                                     |
   Client-side                          Check DB metrics
   cache sufficient                           |
                              +---------------+---------------+
                              |                               |
                         DB CPU < 50%                    DB CPU > 50%
                              |                               |
                         Client-side                     Add Redis
                         cache + optimize                     |
                                                    +--------------------+
                                                    |                    |
                                               Serverless           Persistent
                                                    |                    |
                                               Upstash              Redis Cloud
```

---

## Related Documentation

- [Horizontal Scaling Strategy](./horizontal-scaling.md)
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md)
- [ADR-0004: Supabase Database Architecture](../adr/0004-supabase-database-architecture.md)
- [SLOs and SLIs](../observability/slos-slis.md)
- [Scaling Runbook](../runbooks/scaling-runbook.md)

---

## Appendix: Quick Reference

### Cache Header Cheat Sheet

```
# Immutable assets (hashed filenames)
Cache-Control: public, max-age=31536000, immutable

# API responses (short-lived)
Cache-Control: public, max-age=300, stale-while-revalidate=60

# Private user data
Cache-Control: private, max-age=0, must-revalidate

# Never cache
Cache-Control: no-store, no-cache, must-revalidate
```

### Common TTL Values

| Duration | Seconds | Use Case |
|----------|---------|----------|
| 1 minute | 60 | Real-time-ish data |
| 5 minutes | 300 | Dashboard metrics |
| 15 minutes | 900 | Blog posts, content |
| 1 hour | 3600 | Static content |
| 1 day | 86400 | Images, rarely-changed |
| 1 year | 31536000 | Immutable assets |

### Debugging Cache Issues

```bash
# Check response headers
curl -I https://mejohnc.org/assets/main.js

# Bypass CDN cache
curl -H "Cache-Control: no-cache" https://mejohnc.org/

# Check Netlify edge cache
curl -I https://mejohnc.org/ | grep -i "x-cache"
```

---

## Version History

| Date | Change | Issue |
|------|--------|-------|
| 2025-01-20 | Initial document created | #81 |
