# Scaling Runbook

This runbook covers scaling procedures for MeJohnC.Org to handle increased traffic and load.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Monitoring and Metrics](#monitoring-and-metrics)
4. [Frontend Scaling](#frontend-scaling)
5. [Database Scaling](#database-scaling)
6. [Edge Function Scaling](#edge-function-scaling)
7. [Third-Party Service Scaling](#third-party-service-scaling)
8. [Performance Optimization](#performance-optimization)
9. [Capacity Planning](#capacity-planning)
10. [Contact and Escalation](#contact-and-escalation)

---

## Prerequisites

### Required Access

| Resource | Access Level | Purpose |
|----------|--------------|---------|
| Netlify Dashboard | Admin | CDN and function scaling |
| Supabase Dashboard | Admin | Database scaling |
| Clerk Dashboard | Admin | Auth scaling |
| GitHub Repository | Write | Code optimizations |

### Required Knowledge

- Understanding of current architecture
- Familiarity with Netlify/Supabase dashboards
- Basic understanding of CDN and caching
- Database optimization fundamentals

---

## Architecture Overview

### Current Stack

```
                    +------------------+
                    |    Cloudflare    |  (Netlify's CDN)
                    |       CDN        |
                    +--------+---------+
                             |
                    +--------v---------+
                    |    Netlify       |
                    |  Static Hosting  |
                    |  + Edge Functions|
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v------+    +--------v-------+   +-------v------+
|   Supabase   |    |     Clerk      |   |    Ghost     |
|  PostgreSQL  |    | Authentication |   |     CMS      |
|  + Realtime  |    |    + JWTs      |   |    (Blog)    |
+--------------+    +----------------+   +--------------+
```

### Scaling Dimensions

| Component | Scaling Method | Limit |
|-----------|---------------|-------|
| Netlify CDN | Automatic | Unlimited (within plan) |
| Netlify Functions | Automatic | Plan limits |
| Supabase DB | Manual upgrade | Plan-based |
| Supabase Realtime | Connection limits | Plan-based |
| Clerk Auth | Automatic | MAU limits |
| Ghost CMS | Self-managed | Server-based |

---

## Monitoring and Metrics

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Response Time (P95) | > 500ms | > 2000ms |
| Error Rate | > 1% | > 5% |
| Database Connections | > 70% max | > 90% max |
| Database CPU | > 70% | > 90% |
| CDN Cache Hit Rate | < 80% | < 50% |
| Auth Requests/min | > 80% limit | > 95% limit |

### Monitoring Tools

1. **Netlify Analytics**
   - Request volume
   - Bandwidth usage
   - Top pages
   - Edge function metrics

2. **Supabase Dashboard**
   - Database metrics (Metrics tab)
   - Connection count
   - Query performance
   - Storage usage

3. **Sentry**
   - Error rates
   - Performance traces
   - User impact

4. **Web Vitals**
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

### Setting Up Alerts

**Netlify Alerts** (if available on plan):
- Configure in: Site Settings > Notifications

**Supabase Alerts**:
- Configure in: Project Settings > Alerts

**Sentry Alerts**:
- Configure alert rules for error spikes

---

## Frontend Scaling

### CDN Scaling (Automatic)

Netlify's CDN automatically scales to handle traffic spikes. However, you can optimize:

#### Cache Optimization

1. **Review cache headers** in `public/_headers`:
   ```
   # Static assets - long cache
   /assets/*
     Cache-Control: public, max-age=31536000, immutable

   # HTML - short cache for updates
   /*.html
     Cache-Control: public, max-age=0, must-revalidate
   ```

2. **Verify cache is working**:
   ```bash
   curl -I https://mejohnc.org/assets/index.js
   # Look for: Cache-Control header
   # Look for: cf-cache-status: HIT
   ```

#### Bundle Optimization

1. **Analyze bundle size**:
   ```bash
   npm run analyze
   ```

2. **Implement code splitting** (already configured):
   ```typescript
   // vite.config.ts chunking strategy
   manualChunks: {
     react: ['react', 'react-dom'],
     router: ['react-router-dom'],
     // ... more chunks
   }
   ```

3. **Lazy load routes**:
   ```typescript
   const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
   ```

### Static Asset Optimization

1. **Image optimization**:
   - Use WebP format
   - Implement responsive images
   - Use Supabase Storage with transforms

2. **Font optimization**:
   - Use font-display: swap
   - Preload critical fonts
   - Subset fonts if possible

---

## Database Scaling

### Vertical Scaling (Upgrade Plan)

#### When to Upgrade

- Consistent CPU > 70%
- Connection limit approaching
- Slow query performance
- Storage > 80% capacity

#### How to Upgrade

1. Go to Supabase Dashboard
2. Navigate to: Settings > Billing
3. Select higher tier plan
4. Confirm upgrade

**Note**: Upgrades typically require no downtime.

### Connection Pooling

Supabase uses PgBouncer for connection pooling. Optimize with:

1. **Use pooling mode** for high-traffic scenarios:
   ```typescript
   // Use pooling connection string for serverless
   const supabaseUrl = process.env.SUPABASE_URL
   // Append ?pgbouncer=true for serverless contexts
   ```

2. **Monitor connections**:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SELECT max_connections FROM pg_settings WHERE name = 'max_connections';
   ```

### Query Optimization

1. **Add indexes for common queries**:
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;

   -- Add index for frequent lookups
   CREATE INDEX CONCURRENTLY idx_apps_status ON apps(status);
   ```

2. **Optimize RLS policies**:
   ```sql
   -- Ensure is_admin() function is efficient
   -- Consider caching admin check result
   ```

3. **Use materialized views for complex aggregations**:
   ```sql
   CREATE MATERIALIZED VIEW article_stats AS
   SELECT category, count(*) as article_count
   FROM news_articles
   GROUP BY category;

   -- Refresh periodically
   REFRESH MATERIALIZED VIEW article_stats;
   ```

### Read Replicas (Enterprise)

For Supabase Pro/Enterprise plans:

1. Enable read replicas in Dashboard
2. Route read queries to replica
3. Keep writes on primary

---

## Edge Function Scaling

### Netlify Edge Functions

Edge functions automatically scale, but optimize with:

1. **Keep functions lightweight**:
   ```typescript
   // Good: Simple, fast execution
   export default async (request: Request) => {
     // Quick check and return
     return new Response('OK');
   };
   ```

2. **Implement caching in functions**:
   ```typescript
   export default async (request: Request, context: Context) => {
     // Use edge cache
     const cached = await context.cache.get(cacheKey);
     if (cached) return cached;
     // ... compute response
   };
   ```

3. **Monitor function execution time**:
   ```bash
   netlify logs:function rate-limit
   ```

### Supabase Edge Functions

1. **Optimize cold starts**:
   - Keep dependencies minimal
   - Use Deno imports efficiently

2. **Set appropriate timeouts**:
   ```typescript
   // In function
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 5000);
   ```

3. **Monitor in Supabase Dashboard**:
   - Navigate to: Edge Functions > Logs

---

## Third-Party Service Scaling

### Clerk Authentication

#### Monitoring

- Check MAU (Monthly Active Users) in Clerk Dashboard
- Monitor auth API calls

#### Scaling Actions

1. **Upgrade plan** if approaching MAU limit
2. **Implement rate limiting** on sign-up
3. **Cache user sessions** appropriately

### Ghost CMS

#### Monitoring

- Monitor Ghost server performance
- Check content API response times

#### Scaling Actions

1. **Enable caching** in Ghost
2. **Use CDN** for Ghost assets
3. **Increase server resources** if self-hosted

### External APIs

For any external APIs:

1. **Implement caching**:
   ```typescript
   // Cache API responses
   const cache = new Map();
   const TTL = 5 * 60 * 1000; // 5 minutes

   async function fetchWithCache(url: string) {
     const cached = cache.get(url);
     if (cached && Date.now() - cached.time < TTL) {
       return cached.data;
     }
     const data = await fetch(url).then(r => r.json());
     cache.set(url, { data, time: Date.now() });
     return data;
   }
   ```

2. **Implement circuit breaker**:
   - Fail fast when service is down
   - Prevent cascade failures

---

## Performance Optimization

### Frontend Performance

1. **Optimize Core Web Vitals**:
   ```bash
   npm run lighthouse
   ```

2. **Implement service worker caching**:
   - Cache static assets
   - Cache API responses where appropriate

3. **Optimize images**:
   ```html
   <img
     src="image.webp"
     srcset="image-400.webp 400w, image-800.webp 800w"
     sizes="(max-width: 600px) 400px, 800px"
     loading="lazy"
   />
   ```

### Backend Performance

1. **Optimize database queries**:
   - Use EXPLAIN ANALYZE
   - Add appropriate indexes
   - Limit result sets

2. **Implement pagination**:
   ```typescript
   const { data } = await supabase
     .from('apps')
     .select('*')
     .range(0, 9); // First 10 items
   ```

3. **Use selective queries**:
   ```typescript
   // Bad: Select all columns
   const { data } = await supabase.from('apps').select('*');

   // Good: Select only needed columns
   const { data } = await supabase.from('apps').select('id, name, slug');
   ```

### Caching Strategy

| Content Type | Cache Strategy | TTL |
|-------------|---------------|-----|
| Static assets | Immutable | 1 year |
| API responses | Stale-while-revalidate | 5-15 min |
| User data | No cache | - |
| Public content | Cache | 1-5 min |

---

## Capacity Planning

### Traffic Analysis

1. **Review historical data**:
   - Netlify Analytics for traffic patterns
   - Identify peak times

2. **Project future growth**:
   - Estimate traffic growth rate
   - Plan for seasonal spikes

### Resource Planning

| Resource | Current | 50% Growth | 100% Growth |
|----------|---------|------------|-------------|
| Netlify Plan | [Current] | [Needed] | [Needed] |
| Supabase Plan | [Current] | [Needed] | [Needed] |
| Clerk Plan | [Current] | [Needed] | [Needed] |

### Scaling Checklist

Before expected high traffic:

- [ ] Review current metrics and headroom
- [ ] Test under load (if possible)
- [ ] Verify auto-scaling is enabled
- [ ] Check service plan limits
- [ ] Prepare manual scaling procedures
- [ ] Have escalation contacts ready
- [ ] Enable enhanced monitoring

### Load Testing (Optional)

**Note**: Only load test with service provider approval.

```bash
# Example using k6 (install first)
k6 run --vus 10 --duration 30s script.js

# script.js
import http from 'k6/http';
export default function () {
  http.get('https://mejohnc.org/');
}
```

---

## Emergency Scaling Procedures

### High Traffic Event Response

1. **Monitor in real-time**:
   - Keep Netlify Analytics open
   - Watch Supabase metrics
   - Monitor Sentry for errors

2. **If hitting limits**:
   - Enable more aggressive caching
   - Disable non-essential features
   - Scale up services

3. **Communication**:
   - Notify team of high traffic
   - Prepare status updates

### Scaling Decision Tree

```
Is response time > 2s?
├── Yes → Check database CPU
│   ├── High → Scale Supabase / Optimize queries
│   └── Normal → Check CDN cache hits
│       ├── Low → Review cache headers
│       └── Normal → Check Edge Functions
└── No → Monitor and continue

Is error rate > 5%?
├── Yes → Check Sentry for pattern
│   ├── Database errors → Scale Supabase
│   ├── Auth errors → Check Clerk
│   └── CDN errors → Contact Netlify support
└── No → Monitor and continue
```

---

## Rollback and Recovery

### If Scaling Changes Cause Issues

1. **Revert configuration changes**:
   - Document what was changed
   - Revert in reverse order

2. **Downgrade if needed**:
   - Some scaling changes can be reverted
   - Contact support for billing questions

3. **Post-incident review**:
   - Document what happened
   - Identify root cause
   - Plan better for next time

---

## Contact and Escalation

### Primary Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Site Owner | [NAME] | [EMAIL] | [HOURS] |
| DevOps Lead | [NAME] | [EMAIL] | [HOURS] |
| Database Admin | [NAME] | [EMAIL] | [HOURS] |

### External Support

| Service | Support Tier | Contact |
|---------|--------------|---------|
| Netlify | [Plan] | support.netlify.com |
| Supabase | [Plan] | supabase.com/support |
| Clerk | [Plan] | clerk.com/support |

### Escalation Path

1. **Level 1**: DevOps team
2. **Level 2**: Service provider support
3. **Level 3**: External consulting (if needed)

---

## Related Documentation

- [deployment-runbook.md](./deployment-runbook.md) - Deployment procedures
- [database-runbook.md](./database-runbook.md) - Database operations
- [incident-response.md](./incident-response.md) - Incident handling
- [troubleshooting.md](./troubleshooting.md) - Common issues
