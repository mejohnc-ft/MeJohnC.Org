# Horizontal Scaling Strategy

This document defines the horizontal scaling strategy for MeJohnC.Org, a serverless/JAMstack application deployed on Netlify with Supabase as the backend database.

---

## Table of Contents

1. [Scaling Strategy Overview](#scaling-strategy-overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Scaling Considerations by Component](#scaling-considerations-by-component)
4. [Load Patterns and Capacity Planning](#load-patterns-and-capacity-planning)
5. [Bottleneck Identification and Mitigation](#bottleneck-identification-and-mitigation)
6. [Cost Implications of Scaling](#cost-implications-of-scaling)
7. [Monitoring Metrics for Scaling Decisions](#monitoring-metrics-for-scaling-decisions)
8. [Scaling Triggers and Automation](#scaling-triggers-and-automation)
9. [Migration Path if Outgrowing Current Architecture](#migration-path-if-outgrowing-current-architecture)

---

## Scaling Strategy Overview

### Architecture Philosophy

MeJohnC.Org follows a **serverless-first, managed-services** architecture that inherently supports horizontal scaling through its technology choices:

| Principle | Implementation |
|-----------|----------------|
| Stateless frontend | React SPA distributed via Netlify CDN |
| Managed database | Supabase (PostgreSQL with connection pooling) |
| Edge computing | Netlify Edge Functions for rate limiting |
| Managed authentication | Clerk handles all auth infrastructure |
| No server management | Zero traditional server capacity planning |

### Scaling Model

```
                    Global Traffic
                         |
                         v
    +--------------------------------------------+
    |            Netlify CDN (Global)            |
    |     Auto-scaling, geo-distributed          |
    +--------------------+-----------------------+
                         |
         +---------------+---------------+
         |               |               |
         v               v               v
    +---------+    +---------+    +---------+
    | Edge    |    | Edge    |    | Edge    |
    | PoP 1   |    | PoP 2   |    | PoP N   |
    +---------+    +---------+    +---------+
         |               |               |
         +---------------+---------------+
                         |
                         v
    +--------------------------------------------+
    |     Supabase (Managed PostgreSQL)          |
    |   PgBouncer pooling, vertical scaling      |
    +--------------------------------------------+
```

**Key Insight:** The JAMstack architecture shifts scaling concerns from application servers to managed services that handle horizontal scaling automatically. Our primary scaling decisions involve:

1. **Plan upgrades** rather than infrastructure provisioning
2. **Caching optimization** rather than server replication
3. **Query optimization** rather than database sharding

---

## Current Architecture Analysis

### Frontend: Static Site on Netlify CDN

**Status:** Inherently horizontally scalable

The React 18 + Vite application compiles to static assets served via Netlify's global CDN:

```
Build Output:
├── index.html           # SPA entry point
├── assets/
│   ├── vendor-react.js  # React core (~140KB gzipped)
│   ├── vendor-auth.js   # Clerk authentication
│   ├── vendor-supabase.js # Database client
│   └── [content-hashed].js/css
```

**Scaling Characteristics:**

| Aspect | Current State | Scaling Behavior |
|--------|---------------|------------------|
| Asset delivery | Global CDN | Automatic geo-distribution |
| Request handling | Edge servers | Auto-scales with traffic |
| Cache strategy | Immutable hashed assets | 1-year cache, instant invalidation |
| Build process | Netlify CI/CD | Parallelized builds |

**Current Configuration (`netlify.toml`):**
```toml
[build]
  command = "npm run build"
  publish = "dist"

# Immutable caching for hashed assets
# Defined in public/_headers
```

**Scaling Ceiling:** Netlify Enterprise can handle millions of requests per second. Current free/pro tier limits are unlikely bottlenecks for this use case.

### Backend: Supabase (Managed PostgreSQL)

**Status:** Vertically scalable with horizontal read replica options

Supabase provides a managed PostgreSQL instance with:

| Feature | Configuration | Scaling Impact |
|---------|---------------|----------------|
| Connection pooling | PgBouncer (Transaction mode) | Supports 10,000+ concurrent connections |
| Row Level Security | `is_admin()` function | Adds ~1-2ms per query |
| Real-time subscriptions | WebSocket connections | Limited by plan tier |
| Edge Functions | Deno runtime | Cold starts ~50ms |

**Current Database Schema Organization:**
- Core portfolio content (`schema.sql`)
- News aggregation (`news-schema.sql`)
- Bookmark management (`bookmarks-schema.sql`)
- AI agent system (`agent-schema.sql`)
- CRM and marketing tables

**Connection Pattern:**
```typescript
// Singleton client for public reads
export function getSupabase(): SupabaseClient {
  return _supabase; // Shared connection
}

// Authenticated client with Clerk JWT
export function useAuthenticatedSupabase() {
  // Creates client with accessToken callback
}
```

### Auth: Clerk (Managed Service)

**Status:** Fully managed, auto-scaling

Clerk handles:
- User authentication and session management
- JWT generation (including Supabase template)
- Social login providers (Google, GitHub)
- MFA and security features

**Integration Point:**
```typescript
// JWT Template for Supabase RLS
{
  "email": "{{user.primary_email_address}}"
}
```

**Scaling Ceiling:** Clerk scales automatically. Billing is MAU-based (Monthly Active Users), not request-based.

---

## Scaling Considerations by Component

### Netlify Edge Functions: Limits and Scaling

**Current Implementation:** Rate limiting via Edge Function

```typescript
// netlify/edge-functions/rate-limit.ts
const WINDOW_MS = 60000  // 1 minute window
const MAX_REQUESTS = 60   // 60 requests per IP

// In-memory store (per edge location)
const store = new Map<string, RateLimitEntry>()
```

**Limits by Plan:**

| Plan | Invocations/month | Execution time | Memory |
|------|-------------------|----------------|--------|
| Free | 1 million | 50ms (soft) | 128MB |
| Pro | 2 million | 50ms (soft) | 128MB |
| Enterprise | Unlimited | Negotiable | 128MB+ |

**Scaling Considerations:**

1. **In-memory rate limiting is per-edge-location:**
   - Different PoPs have separate memory spaces
   - Aggressive users could exceed limits by hitting different PoPs
   - Mitigation: Accept this trade-off or implement distributed rate limiting via Supabase

2. **Cold start optimization:**
   ```typescript
   // Current: Minimal dependencies
   import type { Config, Context } from 'https://edge.netlify.com'
   // No heavy imports = fast cold starts (~5ms)
   ```

3. **Scaling path for heavy API usage:**
   - Move to Netlify Functions (serverless) for longer-running operations
   - Implement request coalescing for duplicate requests
   - Consider Supabase Edge Functions for database-heavy operations

### Supabase Connection Pooling and Limits

**Connection Architecture:**

```
Client Requests
      |
      v
+------------------+
|    PgBouncer     |  Transaction mode pooling
|   (Port 6543)    |  Shared connection pool
+------------------+
      |
      v
+------------------+
|   PostgreSQL     |  Limited direct connections
|   (Port 5432)    |  Reserved for admin/migrations
+------------------+
```

**Limits by Plan:**

| Plan | Direct Connections | Pooler Connections | Database Size |
|------|-------------------|-------------------|---------------|
| Free | 60 | 200 | 500MB |
| Pro | 60 | 400 | 8GB |
| Team | 100 | 1,500 | 16GB |
| Enterprise | Custom | 10,000+ | Unlimited |

**Best Practices for Scaling:**

1. **Always use pooler connection string for application:**
   ```typescript
   // Use ?pgbouncer=true for serverless contexts
   const connectionString = `${SUPABASE_URL}?pgbouncer=true`
   ```

2. **Connection lifecycle management:**
   ```typescript
   // Good: Singleton pattern (already implemented)
   const supabase = createSupabaseClient() // One per request context

   // Bad: New client per query
   ```

3. **Monitor connection usage:**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   SELECT max_connections FROM pg_settings WHERE name = 'max_connections';
   ```

### Database Read Replicas

**Availability:** Supabase Pro and above

**Architecture with Read Replicas:**

```
                    Application
                         |
         +---------------+---------------+
         |                               |
         v                               v
   +------------+                 +------------+
   |  Primary   |  Replication   |  Replica   |
   |  (Writes)  |  ----------->  |  (Reads)   |
   +------------+                 +------------+
```

**Implementation Strategy:**

1. **Configure read replica in Supabase Dashboard:**
   - Navigate to Project Settings > Database > Read Replicas
   - Enable replica (adds ~$25/month on Pro)

2. **Route queries appropriately:**
   ```typescript
   // Read-heavy queries (analytics, lists)
   const { data } = await supabaseReplica
     .from('news_articles')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(100)

   // Writes always go to primary
   const { data: newArticle } = await supabasePrimary
     .from('news_articles')
     .insert(article)
   ```

3. **Consider eventual consistency:**
   - Replica lag is typically <100ms
   - Don't read-after-write from replica
   - Use primary for admin operations

### CDN Caching Strategies

**Current Caching Configuration (`public/_headers`):**

| Path Pattern | Cache Policy | Rationale |
|--------------|--------------|-----------|
| `/assets/*` | `max-age=31536000, immutable` | Content-hashed, safe to cache forever |
| `/*.html` | `no-cache, must-revalidate` | SPA routing requires fresh entry point |
| `/sw.js` | `no-cache, no-store` | Service worker must be fresh |
| Images | `max-age=86400` | Daily refresh acceptable |

**Enhanced Caching Strategies:**

1. **API Response Caching (Stale-While-Revalidate):**
   ```typescript
   // Client-side caching for public content
   const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

   async function fetchWithCache<T>(
     key: string,
     fetcher: () => Promise<T>
   ): Promise<T> {
     const cached = cache.get(key);
     if (cached && Date.now() - cached.time < CACHE_DURATION) {
       return cached.data;
     }
     const data = await fetcher();
     cache.set(key, { data, time: Date.now() });
     return data;
   }
   ```

2. **Supabase Storage CDN:**
   - Images served via Supabase Storage have built-in CDN
   - Transform images on-the-fly: `?width=400&height=300`

3. **Ghost CMS Caching:**
   - Blog content is relatively static
   - Implement 15-minute cache for blog API responses
   - Invalidate on content update webhooks

---

## Load Patterns and Capacity Planning

### Expected Traffic Patterns

| Scenario | Requests/min | Database Queries/min | Notes |
|----------|--------------|---------------------|-------|
| Baseline | 10-50 | 5-25 | Personal portfolio, low traffic |
| Blog viral | 1,000-5,000 | 100-500 | Popular article shared |
| Job search active | 100-500 | 50-250 | Recruiters reviewing portfolio |
| Admin heavy use | 50-200 | 200-500 | Content management session |

### Capacity by Component

**Netlify (Current Free/Pro Tier):**
- CDN bandwidth: 100GB-400GB/month
- Edge Function invocations: 125K-500K/month
- Build minutes: 300-1000/month

**Supabase (Free Tier):**
- Database: 500MB storage, 2GB bandwidth
- Auth: 50,000 MAU
- Edge Functions: 500K invocations

**Clerk (Free Tier):**
- 10,000 MAU
- Unlimited sign-ins for authenticated users

### Capacity Planning Formula

```
Required Supabase Tier = MAX(
  Database Size Needs,
  Connection Needs,
  Bandwidth Needs
)

Database Size = Σ(Table Rows × Avg Row Size) × 1.5 (indexes)
Connection Needs = Peak Concurrent Users × Queries per Session × 0.1
Bandwidth Needs = Daily API Calls × Avg Response Size × 30
```

**Example Calculation:**
- 10,000 monthly visitors
- Average 5 pages per visit = 50,000 page views
- 3 API calls per page = 150,000 API calls/month
- Average response 5KB = 750MB bandwidth/month
- Result: Free tier sufficient, Pro recommended for headroom

---

## Bottleneck Identification and Mitigation

### Potential Bottlenecks

| Bottleneck | Symptoms | Detection | Mitigation |
|------------|----------|-----------|------------|
| Database connections | 500 errors, timeouts | `pg_stat_activity` count | Upgrade plan, optimize queries |
| RLS policy overhead | Slow queries (>100ms) | Supabase query logs | Optimize `is_admin()`, add indexes |
| Edge Function cold starts | First request latency | Netlify function logs | Minimize dependencies |
| CDN cache misses | High origin bandwidth | Netlify Analytics | Review cache headers |
| Rate limiting | 429 responses | Rate limit headers | Adjust limits, implement queuing |

### Database Query Optimization

**Current RLS Implementation:**
```sql
-- This runs on every query with RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Optimization Strategies:**

1. **Index the admin_users table:**
   ```sql
   CREATE UNIQUE INDEX idx_admin_users_email ON admin_users(email);
   ```

2. **Add indexes for common query patterns:**
   ```sql
   -- Published content filtering
   CREATE INDEX idx_blog_posts_status ON blog_posts(status) WHERE status = 'published';
   CREATE INDEX idx_apps_status ON apps(status) WHERE status = 'published';

   -- Sorting by date
   CREATE INDEX idx_news_articles_created ON news_articles(created_at DESC);
   ```

3. **Use selective queries:**
   ```typescript
   // Bad: Select all columns
   const { data } = await supabase.from('apps').select('*');

   // Good: Select only needed columns
   const { data } = await supabase.from('apps').select('id, name, slug, icon_url');
   ```

### Real-time Subscription Scaling

Supabase real-time uses WebSocket connections:

| Plan | Max Concurrent | Messages/sec |
|------|----------------|--------------|
| Free | 200 | 10 |
| Pro | 500 | 100 |
| Team | 1,000+ | 1,000+ |

**Mitigation for Heavy Real-time Usage:**
- Implement client-side debouncing
- Use polling for non-critical updates
- Batch updates where possible

---

## Cost Implications of Scaling

### Tiered Cost Analysis

**Scenario 1: Low Traffic (Current)**
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Netlify | Free | $0 |
| Supabase | Free | $0 |
| Clerk | Free | $0 |
| **Total** | | **$0** |

**Scenario 2: Growing Traffic (10K monthly visitors)**
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Netlify | Pro | $19 |
| Supabase | Pro | $25 |
| Clerk | Free | $0 |
| **Total** | | **$44** |

**Scenario 3: High Traffic (100K monthly visitors)**
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Netlify | Business | $99 |
| Supabase | Team | $599 |
| Clerk | Pro | $25 |
| **Total** | | **$723** |

**Scenario 4: Enterprise Scale (1M+ visitors)**
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Netlify | Enterprise | Custom |
| Supabase | Enterprise | Custom |
| Clerk | Enterprise | Custom |
| **Total** | | **Negotiated** |

### Cost Optimization Strategies

1. **Optimize before upgrading:**
   - Implement aggressive caching
   - Optimize database queries
   - Reduce unnecessary API calls

2. **Monitor usage patterns:**
   - Use Netlify Analytics for bandwidth
   - Use Supabase Dashboard for database metrics
   - Set up billing alerts at 80% thresholds

3. **Right-size services:**
   - Start with free tiers
   - Upgrade individual services as needed
   - Don't over-provision

---

## Monitoring Metrics for Scaling Decisions

### Key Performance Indicators (KPIs)

| Metric | Source | Warning Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| Response Time (P95) | Sentry | > 500ms | > 2000ms |
| Error Rate | Sentry | > 1% | > 5% |
| Database CPU | Supabase | > 70% | > 90% |
| Database Connections | Supabase | > 70% max | > 90% max |
| CDN Cache Hit Ratio | Netlify | < 80% | < 50% |
| Edge Function Duration | Netlify | > 30ms | > 50ms |
| Auth Latency | Clerk | > 200ms | > 500ms |

### Monitoring Implementation

**Current Monitoring Stack:**
- Sentry for error tracking and performance
- Web Vitals collection (`src/lib/web-vitals.ts`)
- Netlify Analytics (automatic)
- Supabase Dashboard metrics

**Recommended Additions:**

1. **Custom Dashboard Query (Supabase):**
   ```sql
   -- Daily connection usage
   SELECT
     date_trunc('hour', created_at) as hour,
     max(active_connections) as peak_connections
   FROM pg_stat_activity_history
   GROUP BY 1
   ORDER BY 1 DESC
   LIMIT 24;
   ```

2. **Sentry Performance Monitoring:**
   ```typescript
   // Already configured in src/lib/sentry.ts
   Sentry.init({
     tracesSampleRate: 0.1, // 10% of transactions
   });
   ```

3. **Alert Configuration:**
   - Configure Sentry alerts for error spikes
   - Set up Supabase email alerts for database metrics
   - Use Netlify webhooks for deploy/bandwidth alerts

---

## Scaling Triggers and Automation

### Manual Scaling Triggers

| Trigger | Action | Responsible |
|---------|--------|-------------|
| Database CPU > 80% for 1 hour | Evaluate plan upgrade | Site owner |
| Connection errors in logs | Enable connection pooling | Site owner |
| P95 latency > 2s sustained | Performance audit | Site owner |
| Error budget < 25% | Reliability freeze | Site owner |

### Automated Responses

**Netlify (Automatic):**
- CDN scales automatically
- Edge Functions scale with traffic
- No manual intervention required

**Supabase (Semi-Automatic):**
- Connection pooling is always on
- Storage auto-provisions within plan limits
- Upgrades require manual approval

**Clerk (Automatic):**
- Authentication scales automatically
- MAU tracking is automatic
- Billing scales with usage

### Scaling Decision Flowchart

```
Is response time degraded?
├── Yes → Check database metrics
│   ├── High CPU → Optimize queries OR upgrade plan
│   ├── High connections → Enable pooling mode
│   └── Normal → Check CDN cache hits
│       ├── Low → Review cache headers
│       └── Normal → Check Edge Functions
└── No → Continue monitoring

Is error rate elevated?
├── Yes → Check Sentry for patterns
│   ├── Database errors → Scale Supabase
│   ├── Auth errors → Check Clerk status
│   └── 429 errors → Adjust rate limits
└── No → Continue monitoring

Is approaching plan limits?
├── Yes → Evaluate upgrade
│   ├── Cost acceptable → Upgrade plan
│   └── Cost concern → Optimize first
└── No → Continue monitoring
```

### Pre-emptive Scaling Checklist

Before expected traffic spikes (product launch, viral content):

- [ ] Review current headroom on all services
- [ ] Verify caching is working optimally
- [ ] Check database query performance
- [ ] Confirm monitoring is active
- [ ] Document rollback procedures
- [ ] Have support contacts ready
- [ ] Consider temporary plan upgrade

---

## Migration Path if Outgrowing Current Architecture

### When to Consider Migration

| Signal | Threshold | Consideration |
|--------|-----------|---------------|
| Monthly cost | > $1,000/month | Custom infrastructure may be cheaper |
| Database size | > 100GB | Self-hosted PostgreSQL |
| Real-time needs | > 10K concurrent | Custom WebSocket infrastructure |
| Custom requirements | Specific compliance | Hybrid or self-hosted |
| Global latency | < 50ms required | Multi-region deployment |

### Migration Options

#### Option 1: Enhanced JAMstack (Recommended First Step)

Stay within the current paradigm but with enterprise services:

```
Cloudflare (CDN + Edge)
      |
      v
Vercel/Netlify Enterprise
      |
      v
Supabase Enterprise / Neon
      |
      v
Clerk Enterprise
```

**Pros:** Minimal architecture change, managed services
**Cons:** Still subject to vendor limits

#### Option 2: Hybrid Architecture

Combine managed services with self-hosted components:

```
Cloudflare CDN
      |
      +---> Netlify (Static Frontend)
      |
      +---> AWS/GCP (Custom API Layer)
            |
            v
      Self-Hosted PostgreSQL (RDS/Cloud SQL)
```

**Pros:** More control, can optimize costs
**Cons:** Increased operational burden

#### Option 3: Full Custom Infrastructure

For extreme scale or specific requirements:

```
Multi-Region Kubernetes Cluster
      |
      +---> Frontend Pods (React SSR)
      |
      +---> API Pods (Node.js/Go)
      |
      +---> PostgreSQL Cluster (Citus/Patroni)
      |
      +---> Redis Cluster (Caching/Sessions)
```

**Pros:** Maximum flexibility and control
**Cons:** Significant DevOps investment, higher complexity

### Migration Checklist

If migrating becomes necessary:

1. **Preparation Phase:**
   - [ ] Document all current integrations
   - [ ] Export data from managed services
   - [ ] Set up new infrastructure in parallel
   - [ ] Implement comprehensive testing

2. **Migration Phase:**
   - [ ] Set up data synchronization
   - [ ] Migrate with feature flags
   - [ ] Gradual traffic shifting (10% -> 50% -> 100%)
   - [ ] Monitor closely during transition

3. **Validation Phase:**
   - [ ] Verify all functionality
   - [ ] Compare performance metrics
   - [ ] Confirm cost projections
   - [ ] Decommission old infrastructure

---

## Related Documentation

- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md)
- [ADR-0004: Supabase Database Architecture](../adr/0004-supabase-database-architecture.md)
- [Scaling Runbook](../runbooks/scaling-runbook.md)
- [SLOs and SLIs](../observability/slos-slis.md)

---

## Appendix A: Quick Reference

### Scaling Commands

```bash
# Check Netlify usage
netlify status

# Monitor Supabase connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# View Edge Function logs
netlify logs:function rate-limit

# Analyze bundle size impact
npm run analyze
```

### Support Contacts

| Service | Support URL | Priority |
|---------|-------------|----------|
| Netlify | support.netlify.com | Based on plan |
| Supabase | supabase.com/support | Based on plan |
| Clerk | clerk.com/support | Based on plan |

### Version History

| Date | Change | Issue |
|------|--------|-------|
| 2025-01-20 | Initial document created | #80 |
