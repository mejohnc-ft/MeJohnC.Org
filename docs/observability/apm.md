# Application Performance Monitoring (APM)

This document provides comprehensive guidance on Application Performance Monitoring (APM) for MeJohnC.Org, covering solution selection, implementation, metrics, dashboards, and alerting.

---

## Table of Contents

1. [Overview](#overview)
2. [APM Value Proposition](#apm-value-proposition)
3. [Recommended APM Solutions](#recommended-apm-solutions)
4. [Key Metrics to Monitor](#key-metrics-to-monitor)
5. [Implementation Guide](#implementation-guide)
6. [Dashboard Setup](#dashboard-setup)
7. [Alerting Thresholds](#alerting-thresholds)
8. [Performance Budgets](#performance-budgets)
9. [Synthetic Monitoring](#synthetic-monitoring)
10. [RUM vs Synthetic Monitoring](#rum-vs-synthetic-monitoring)
11. [Cost Considerations](#cost-considerations)

---

## Overview

### What is APM?

Application Performance Monitoring (APM) is a practice that enables you to monitor, measure, and optimize the performance of your applications. APM provides visibility into:

- **User Experience**: How fast pages load, how responsive interactions are
- **Application Health**: Error rates, throughput, resource utilization
- **Infrastructure Performance**: Database queries, API response times, external services
- **Business Impact**: Correlation between performance and user engagement/conversion

### Current Stack

MeJohnC.Org is built with:

| Component | Technology | APM Integration |
|-----------|------------|-----------------|
| Frontend | React 18 + Vite + TypeScript | Sentry Performance |
| Styling | Tailwind CSS, Framer Motion | N/A |
| Backend | Supabase (PostgreSQL) | Supabase Dashboard |
| Auth | Clerk | Clerk Dashboard |
| CMS | Ghost | Ghost Admin |
| Hosting | Netlify (CDN + Edge) | Netlify Analytics |
| Monitoring | Sentry, web-vitals | Primary APM |

### Current Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Error tracking | Implemented | `src/lib/sentry.ts` |
| Web Vitals collection | Implemented | `src/lib/web-vitals.ts` |
| Browser tracing | Enabled | Sentry SDK |
| Session replay | Enabled | Sentry SDK |
| Google Analytics | Integrated | `src/lib/analytics.ts` |

---

## APM Value Proposition

### Why APM Matters

#### 1. User Experience Optimization

| Metric | Business Impact |
|--------|-----------------|
| 1s delay in page load | 7% reduction in conversions |
| 3s page load time | 53% mobile users abandon |
| Poor LCP (>4s) | Lower search rankings |

#### 2. Proactive Issue Detection

- Identify performance regressions before users report them
- Catch errors in real-time before they affect many users
- Detect anomalies in traffic patterns or error rates

#### 3. Root Cause Analysis

- Trace slow page loads to specific database queries
- Correlate frontend errors with backend issues
- Identify third-party services causing delays

#### 4. Capacity Planning

- Understand traffic patterns and peak usage
- Plan infrastructure scaling based on data
- Optimize resource allocation

### ROI of APM

For a personal portfolio site like MeJohnC.Org:

| Benefit | Value |
|---------|-------|
| Reduced debugging time | Hours saved per incident |
| Better user experience | Higher engagement, lower bounce |
| SEO improvement | Core Web Vitals affect ranking |
| Professional credibility | Demonstrates engineering excellence |

---

## Recommended APM Solutions

### Primary Recommendation: Sentry Performance

**Best fit for MeJohnC.Org** - Already integrated for error tracking.

#### Why Sentry?

| Factor | Benefit |
|--------|---------|
| Existing integration | `@sentry/react` already in `package.json` |
| Unified platform | Errors + Performance + Replays in one tool |
| React-specific features | Component profiling, React Router integration |
| Cost-effective | Free tier covers low-traffic sites |
| Developer experience | Excellent SDK, good documentation |

#### Sentry Features Available

```typescript
// Current integration in src/lib/sentry.ts
- browserTracingIntegration()  // Transaction tracing
- replayIntegration()          // Session replay
- Performance sampling         // 10% in production
- Error tracking               // 100% on errors
```

#### Sentry Pricing

| Plan | Events/Month | Price | Best For |
|------|-------------|-------|----------|
| Developer | 5,000 | Free | Development, low-traffic |
| Team | 50,000 | $26/mo | Small production sites |
| Business | 100,000+ | Custom | High-traffic, teams |

**Recommendation:** Team plan for MeJohnC.Org (~$26/mo with headroom)

---

### Alternative: Datadog APM

**Best for:** Enterprise environments, comprehensive infrastructure monitoring.

#### Pros

- Full-stack observability platform
- Automatic instrumentation
- ML-powered anomaly detection
- Excellent dashboards and analytics
- Log, metrics, traces correlation

#### Cons

- Higher cost ($15-31/host/month minimum)
- Heavier SDK footprint (~100KB+)
- May be overkill for personal portfolio
- Requires more configuration

#### When to Consider

- Scaling to a team or commercial product
- Need infrastructure monitoring (servers, containers)
- Want ML-powered insights

#### Datadog Pricing

| Plan | Price | Includes |
|------|-------|----------|
| APM | $31/host/mo | Tracing, profiling |
| RUM | $15/10K sessions | Frontend monitoring |
| Logs | $0.10/GB indexed | Log management |

**Estimated cost for MeJohnC.Org:** $50-100/month

---

### Alternative: New Relic

**Best for:** Enterprises needing comprehensive monitoring with free tier.

#### Pros

- Generous free tier (100GB/month)
- Full-stack observability
- AI-powered insights (NRQL)
- Good documentation

#### Cons

- Complex pricing model
- UI can be overwhelming
- SDK larger than Sentry
- Less React-specific features

#### New Relic Pricing

| Plan | Data Ingest | Price |
|------|-------------|-------|
| Free | 100GB/month | Free |
| Standard | Metered | $0.30/GB |
| Pro | Metered | $0.50/GB |

**Estimated cost:** Free tier likely sufficient

---

### Solution Comparison Matrix

| Criteria | Sentry | Datadog | New Relic |
|----------|--------|---------|-----------|
| **Setup complexity** | Low | Medium | Medium |
| **React integration** | Excellent | Good | Good |
| **Existing integration** | Yes | No | No |
| **Bundle size impact** | ~50KB | ~100KB | ~80KB |
| **Free tier** | 5K events | Limited | 100GB |
| **Cost at current scale** | Free-$26 | $50-100 | Free |
| **Learning curve** | Low | Medium | Medium |
| **Vendor lock-in** | Medium | High | Medium |
| **Session replay** | Yes | Yes (extra) | Yes |
| **Recommendation** | **Primary** | Enterprise | Alternative |

---

## Key Metrics to Monitor

### Frontend Metrics

#### Core Web Vitals

These metrics directly impact user experience and SEO:

| Metric | Description | Good | Needs Improvement | Poor |
|--------|-------------|------|-------------------|------|
| **LCP** | Largest Contentful Paint | <= 2.5s | <= 4.0s | > 4.0s |
| **FCP** | First Contentful Paint | <= 1.8s | <= 3.0s | > 3.0s |
| **CLS** | Cumulative Layout Shift | <= 0.1 | <= 0.25 | > 0.25 |
| **INP** | Interaction to Next Paint | <= 200ms | <= 500ms | > 500ms |
| **TTFB** | Time to First Byte | <= 800ms | <= 1.8s | > 1.8s |

**Current implementation:** `src/lib/web-vitals.ts`

```typescript
// Thresholds defined in VITALS_THRESHOLDS
export const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};
```

#### JavaScript Error Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error rate | < 1% of sessions | > 2% |
| Unique errors | Monitor trends | New error types |
| Error volume | Baseline | 200% spike |
| Critical path errors | 0 | Any occurrence |

#### Load Time Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| DOM Interactive | < 2s | > 3s |
| DOM Complete | < 3s | > 5s |
| Full page load | < 4s | > 6s |
| Asset load time | < 1s per asset | > 2s |

---

### API Metrics

#### Response Time

| Percentile | Target | Alert Threshold |
|------------|--------|-----------------|
| p50 (median) | <= 200ms | > 500ms |
| p95 | <= 500ms | > 1s |
| p99 | <= 1s | > 2s |

#### Error Rates

| Type | Target | Alert Threshold |
|------|--------|-----------------|
| 4xx client errors | < 5% | > 10% |
| 5xx server errors | < 0.1% | > 1% |
| Timeout errors | < 0.1% | > 0.5% |

#### Throughput

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| Requests/minute | Monitor | 50% drop |
| Peak traffic | Monitor | 200% spike |
| Concurrent users | Monitor | Capacity limits |

---

### Database Metrics (Supabase)

#### Query Performance

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Average query time | < 100ms | > 500ms |
| Slow query threshold | < 1s | > 2s |
| Query timeout rate | < 0.1% | > 1% |

#### Connection Pool

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Active connections | < 80% of max | > 90% of max |
| Idle connections | Healthy pool | < 10% available |
| Connection wait time | < 50ms | > 200ms |

#### Resource Utilization

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Database CPU | < 70% | > 85% |
| Storage usage | < 80% of quota | > 90% |
| Bandwidth usage | < 80% of quota | > 90% |

**Monitoring via:** Supabase Dashboard, pg_stat_statements

```sql
-- Query to monitor slow queries
SELECT
  query,
  calls,
  total_exec_time / calls as avg_time_ms,
  rows / calls as avg_rows
FROM pg_stat_statements
WHERE total_exec_time / calls > 100  -- > 100ms average
ORDER BY total_exec_time DESC
LIMIT 20;
```

---

## Implementation Guide

### Sentry Performance Setup for React/Vite

#### Step 1: Enhance Current Configuration

Update `src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured - APM disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || `mejohnc-org@${Date.now()}`,

    integrations: [
      // Enhanced browser tracing
      Sentry.browserTracingIntegration({
        enableInp: true,
        beforeStartSpan: (context) => ({
          ...context,
          name: normalizeRouteName(context.name),
        }),
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        networkDetailAllowUrls: [
          /supabase\.co/,
          /mejohnc\.org/,
        ],
      }),
    ],

    // Performance sampling
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Profiles for deep performance insights
    profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay sampling
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable in production
    enabled: import.meta.env.PROD,

    // Propagate traces to backend services
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.supabase\.co/,
      /^https:\/\/mejohnc\.org/,
    ],

    // Filter low-value transactions
    beforeSendTransaction: (event) => {
      // Drop health checks and static assets
      if (event.transaction?.includes('/health')) return null;
      if (event.transaction?.match(/\.(js|css|png|jpg|svg)$/)) return null;
      return event;
    },
  });
}

// Normalize route names for better grouping
function normalizeRouteName(name: string): string {
  return name
    .replace(/\/blog\/[^/]+/, '/blog/:slug')
    .replace(/\/apps\/[^/]+/, '/apps/:slug')
    .replace(/\/projects\/[^/]+/, '/projects/:id')
    .replace(/\/admin\/[^/]+\/[^/]+/, '/admin/:section/:id');
}
```

#### Step 2: Transaction Tracing

Create `src/lib/tracing.ts`:

```typescript
import * as Sentry from '@sentry/react';

/**
 * Wrap an async operation in a custom span for tracing
 */
export async function withSpan<T>(
  name: string,
  operation: () => Promise<T>,
  options?: {
    op?: string;
    description?: string;
    data?: Record<string, unknown>;
  }
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: options?.op || 'function',
      attributes: options?.data,
    },
    async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: 1 }); // SpanStatusCode.OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: String(error) }); // SpanStatusCode.ERROR
        throw error;
      }
    }
  );
}

/**
 * Create a span for database queries
 */
export async function traceQuery<T>(
  queryName: string,
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  query: () => Promise<T>
): Promise<T> {
  return withSpan(queryName, query, {
    op: 'db.query',
    description: `${operation.toUpperCase()} ${table}`,
    data: {
      'db.system': 'postgresql',
      'db.name': 'supabase',
      'db.operation': operation,
      'db.table': table,
    },
  });
}

/**
 * Create a span for API calls
 */
export async function traceApiCall<T>(
  name: string,
  url: string,
  method: string,
  call: () => Promise<T>
): Promise<T> {
  return withSpan(name, call, {
    op: 'http.client',
    description: `${method} ${url}`,
    data: {
      'http.method': method,
      'http.url': url,
    },
  });
}

/**
 * Create a span for component rendering
 */
export function traceRender(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'ui.render',
      message: `${componentName} rendered`,
      data: { duration_ms: duration },
      level: duration > 100 ? 'warning' : 'info',
    });
  };
}
```

#### Step 3: Custom Instrumentation

Instrument key database queries in `src/lib/supabase-queries.ts`:

```typescript
import { traceQuery } from './tracing';

// Example: Traced blog posts query
export async function getBlogPosts(includeUnpublished = false) {
  return traceQuery('getBlogPosts', 'blog_posts', 'select', async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data;
  });
}

// Example: Traced apps query
export async function getApps(includeUnpublished = false) {
  return traceQuery('getApps', 'apps', 'select', async () => {
    const { data, error } = await supabase
      .from('apps')
      .select('*, suite:app_suites(*)')
      .order('order_index');

    if (error) throw error;
    return data;
  });
}
```

#### Step 4: React Router Integration

For enhanced route tracing with React Router v7:

```typescript
// In your router setup (e.g., App.tsx)
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { useEffect } from 'react';

// Add to Sentry.init() integrations
Sentry.reactRouterV7BrowserTracingIntegration({
  useEffect,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
});
```

#### Step 5: Component Profiling

Wrap critical components with Sentry profiler:

```typescript
import * as Sentry from '@sentry/react';

// Wrap your App component
const ProfiledApp = Sentry.withProfiler(App, {
  name: 'App',
  includeRender: true,
  includeUpdates: true,
});

// Wrap critical pages
const ProfiledHome = Sentry.withProfiler(Home, { name: 'Home' });
const ProfiledPortfolio = Sentry.withProfiler(Portfolio, { name: 'Portfolio' });
const ProfiledBlogPost = Sentry.withProfiler(BlogPost, { name: 'BlogPost' });
```

---

## Dashboard Setup

### Sentry Performance Dashboard

#### Recommended Widgets

| Widget | Purpose | Configuration |
|--------|---------|---------------|
| Apdex Score | User satisfaction overview | Target: 0.9 |
| Throughput | Requests per minute | Baseline monitoring |
| p50/p95/p99 Latency | Response time distribution | p95 < 3s target |
| Error Rate | Failed transactions | < 0.1% target |
| Web Vitals | Core Web Vitals health | 75% good ratings |

#### Custom Dashboard Setup

1. Navigate to **Sentry > Performance > Overview**
2. Click **Create Dashboard**
3. Add widgets:

**Widget 1: Page Load Performance**
```
Query: transaction.op:pageload
Metrics: p50, p95, p99, count
Group by: transaction
```

**Widget 2: API Performance**
```
Query: transaction.op:http.client
Metrics: p50, p95, error_rate
Group by: transaction
```

**Widget 3: Database Query Performance**
```
Query: span.op:db.query
Metrics: avg(span.duration), count
Group by: span.description
```

**Widget 4: Web Vitals Distribution**
```
Query: measurements.lcp, measurements.fcp, measurements.cls
Metrics: p75, percentage meeting threshold
```

### Key Queries

```
# Slow page loads
transaction.op:pageload AND transaction.duration:>3000ms

# Failed API calls
transaction.op:http.client AND transaction.status:error

# Slow database queries
span.op:db.query AND span.duration:>500ms

# Poor Web Vitals
measurements.lcp:>4000 OR measurements.cls:>0.25

# High error rate transactions
error.handled:false AND transaction:*
```

### Sentry Alerts for Dashboards

Configure these in **Settings > Alerts**:

| Alert | Condition | Threshold |
|-------|-----------|-----------|
| LCP Regression | p75 LCP increases | > 20% from baseline |
| Apdex Drop | Apdex score drops | < 0.8 |
| Error Spike | Transaction error rate | > 1% for 10 minutes |
| Slow Queries | p95 query duration | > 1s for 15 minutes |

---

## Alerting Thresholds

### SLO-Based Alerting

Based on [slos-slis.md](./slos-slis.md), configure alerts at these thresholds:

#### Availability Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Critical Outage | Availability < 95% | 5 min | P1 |
| SLO Breach | Availability < 99% | 10 min | P2 |
| Degradation | Availability < 99.5% | 30 min | P3 |

#### Latency Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Critical Latency | p99 > 10s | 5 min | P1 |
| High Latency | p95 > 5s | 10 min | P2 |
| SLO Warning | p95 > 3s | 15 min | P3 |
| Trending Up | p50 > 2s | 30 min | P4 |

#### Error Rate Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Critical Errors | Error rate > 5% | 5 min | P1 |
| High Errors | Error rate > 1% | 10 min | P2 |
| Elevated Errors | Error rate > 0.5% | 30 min | P3 |

#### Web Vitals Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| LCP Critical | p75 LCP > 4s | 15 min | P2 |
| CLS Critical | p75 CLS > 0.25 | 15 min | P2 |
| INP Critical | p75 INP > 500ms | 15 min | P2 |
| Vitals Degraded | Good rating < 50% | 1 hour | P3 |

### Sentry Alert Configuration

```yaml
# Example Sentry alert rule configuration
alerts:
  - name: "Page Load Performance Degradation"
    conditions:
      - type: "transaction_duration"
        op: "pageload"
        percentile: "p95"
        threshold: 5000
        interval: "15m"
    actions:
      - type: "slack"
        channel: "#alerts"
      - type: "email"
        recipients: ["owner@mejohnc.org"]

  - name: "High Error Rate"
    conditions:
      - type: "error_rate"
        threshold: 1.0
        interval: "10m"
    actions:
      - type: "slack"
        channel: "#incidents"
```

### Error Budget Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Budget Warning | < 50% remaining | Slack notification |
| Budget Critical | < 25% remaining | Email + Slack |
| Budget Exhausted | 0% remaining | Page on-call |

---

## Performance Budgets

### Definition

Performance budgets are limits set on metrics that affect user experience. They prevent performance regressions from reaching production.

### Recommended Budgets

#### Page Load Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| LCP | 2.5s | Block deploy if exceeded |
| FCP | 1.8s | Warning |
| TTFB | 800ms | Warning |
| Total blocking time | 300ms | Warning |
| Speed Index | 3.0s | Warning |

#### Bundle Size Budgets

| Asset Type | Budget | Action |
|------------|--------|--------|
| Main bundle (JS) | 200KB gzipped | Block deploy |
| Vendor bundle | 300KB gzipped | Warning |
| CSS bundle | 50KB gzipped | Warning |
| Total JS | 500KB gzipped | Block deploy |
| Total page weight | 1MB | Warning |

#### Resource Budgets

| Resource | Budget | Rationale |
|----------|--------|-----------|
| HTTP requests | 50 per page | Reduce connection overhead |
| Images | 500KB total | Major bandwidth consumer |
| Third-party scripts | 100KB | External dependency risk |
| Fonts | 100KB | Typography essentials only |

### Implementation

#### Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://mejohnc.org/', 'https://mejohnc.org/portfolio'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### Vite Bundle Analysis

The project already includes bundle analysis:

```bash
# Generate bundle analysis
npm run analyze
```

Current chunking strategy in `vite.config.ts`:

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-framer': ['framer-motion'],
  'vendor-markdown-core': ['react-markdown'],
  'vendor-ui': ['clsx', 'tailwind-merge', 'lucide-react'],
  'vendor-auth': ['@clerk/clerk-react'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-monitoring': ['@sentry/react'],
}
```

### Budget Monitoring

```typescript
// Add to CI pipeline or build script
const budgets = {
  'vendor-react': 150 * 1024,      // 150KB
  'vendor-framer': 100 * 1024,     // 100KB
  'vendor-monitoring': 60 * 1024,  // 60KB
  total: 500 * 1024,               // 500KB total
};

// Check after build
function checkBudgets(stats) {
  for (const [chunk, budget] of Object.entries(budgets)) {
    if (stats[chunk] > budget) {
      console.error(`Budget exceeded: ${chunk}`);
      process.exit(1);
    }
  }
}
```

---

## Synthetic Monitoring

### Overview

Synthetic monitoring proactively tests your application from external locations on a schedule, detecting issues before users report them.

### Recommended Tools

| Tool | Use Case | Pricing |
|------|----------|---------|
| **Checkly** | API and browser checks | Free tier: 10K checks/mo |
| **Uptime Robot** | Simple uptime monitoring | Free tier: 50 monitors |
| **Pingdom** | Enterprise synthetic | $10+/month |
| **Sentry Cron** | Scheduled job monitoring | Included |

### Checkly Setup (Recommended)

#### Configuration

```javascript
// checkly.config.js
const { defineConfig } = require('checkly');

module.exports = defineConfig({
  projectName: 'MeJohnC.Org',
  logicalId: 'mejohnc-org-synthetic',
  checks: {
    locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    tags: ['production', 'synthetic'],
    runtimeId: '2024.02',
    checkMatch: '**/*.check.ts',
    browserChecks: {
      frequency: 10, // minutes
    },
    apiChecks: {
      frequency: 5, // minutes
    },
  },
  alertChannels: [
    {
      type: 'email',
      address: 'alerts@mejohnc.org',
      sendFailure: true,
      sendRecovery: true,
    },
    {
      type: 'slack',
      webhookUrl: process.env.CHECKLY_SLACK_WEBHOOK,
      channel: '#synthetic-alerts',
    },
  ],
});
```

#### Homepage Check

```typescript
// __checks__/homepage.check.ts
import { test, expect } from '@playwright/test';

test('Homepage loads successfully', async ({ page }) => {
  const startTime = Date.now();

  // Navigate to homepage
  const response = await page.goto('https://mejohnc.org');

  // Assert successful response
  expect(response?.status()).toBeLessThan(400);

  // Assert page title
  await expect(page).toHaveTitle(/MeJohnC/);

  // Assert critical elements visible
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Assert reasonable load time
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(5000);
});

test('Homepage Web Vitals are acceptable', async ({ page }) => {
  await page.goto('https://mejohnc.org');

  // Wait for page to be interactive
  await page.waitForLoadState('networkidle');

  // Measure LCP
  const lcp = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1].startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Fallback after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  });

  expect(lcp).toBeLessThan(4000); // 4 second threshold
});
```

#### API Health Check

```typescript
// __checks__/api-health.check.ts
import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

test('Supabase REST API is healthy', async ({ request }) => {
  const response = await request.get(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  expect(response.status()).toBe(200);
});

test('Blog posts endpoint returns data', async ({ request }) => {
  const response = await request.get(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=id,title&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
      },
    }
  );

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
});
```

#### Critical User Journey Check

```typescript
// __checks__/portfolio-journey.check.ts
import { test, expect } from '@playwright/test';

test('Portfolio page user journey', async ({ page }) => {
  // Step 1: Navigate to portfolio
  await page.goto('https://mejohnc.org/portfolio');
  await expect(page).toHaveTitle(/Portfolio/);

  // Step 2: Verify tabs are functional
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(4); // Work, Projects, Software, Content

  // Step 3: Click through tabs
  await tabs.nth(1).click(); // Projects tab
  await expect(page.locator('[role="tabpanel"]')).toBeVisible();

  // Step 4: Verify content loads
  const projectCards = page.locator('[data-testid="project-card"]');
  await expect(projectCards.first()).toBeVisible({ timeout: 5000 });
});
```

### Monitoring Schedule

| Check Type | Frequency | Locations |
|------------|-----------|-----------|
| Homepage availability | 5 minutes | 3 global |
| API health | 5 minutes | 2 regions |
| Full user journey | 15 minutes | 1 region |
| Performance (Lighthouse) | 1 hour | 1 region |
| SSL certificate | Daily | 1 region |

---

## RUM vs Synthetic Monitoring

### Comparison

| Aspect | Real User Monitoring (RUM) | Synthetic Monitoring |
|--------|---------------------------|----------------------|
| **Data source** | Actual user traffic | Scripted tests |
| **Coverage** | All users, devices, networks | Predefined scenarios |
| **Timing** | Continuous, reactive | Scheduled, proactive |
| **Insights** | True user experience | Baseline & availability |
| **Cost** | Based on traffic volume | Based on check frequency |
| **Use case** | Production monitoring | Pre-production & SLA |

### When to Use Each

#### Use RUM For:

- Understanding real user experience across devices/networks
- Identifying performance issues affecting specific user segments
- Correlating performance with business metrics
- Detecting issues that vary by geography or device
- A/B testing performance impact

#### Use Synthetic For:

- Proactive uptime monitoring
- SLA compliance verification
- Detecting issues before users do
- Testing from specific geographic locations
- Pre-production environment monitoring
- Benchmarking against competitors

### Recommended Strategy for MeJohnC.Org

| Monitoring Type | Tool | Purpose |
|-----------------|------|---------|
| **RUM** | Sentry Performance | Real user experience data |
| **RUM** | Web Vitals (GA4) | Core Web Vitals from real users |
| **Synthetic** | Checkly | Uptime and critical path monitoring |
| **Synthetic** | Lighthouse CI | Performance regression detection |

### Integration Example

Combine RUM and synthetic data for comprehensive monitoring:

```typescript
// Compare synthetic baseline with RUM reality
const metrics = {
  synthetic: {
    lcp: 1800, // Checkly baseline
    fcp: 1200,
    ttfb: 400,
  },
  rum: {
    lcp: await getRUMPercentile('lcp', 75), // From Sentry
    fcp: await getRUMPercentile('fcp', 75),
    ttfb: await getRUMPercentile('ttfb', 75),
  },
};

// Alert if RUM significantly worse than synthetic
for (const metric of ['lcp', 'fcp', 'ttfb']) {
  const deviation = (metrics.rum[metric] - metrics.synthetic[metric]) /
                    metrics.synthetic[metric] * 100;

  if (deviation > 50) {
    alert(`${metric} is ${deviation}% worse in production than synthetic`);
  }
}
```

---

## Cost Considerations

### Current Costs (Estimated)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Sentry | Team | $26 |
| Checkly | Free tier | $0 |
| Netlify Analytics | Included | $0 |
| Supabase | Free tier | $0 |
| **Total** | | **~$26/month** |

### Cost Optimization Strategies

#### 1. Sampling Strategy

```typescript
// Reduce event volume with smart sampling
Sentry.init({
  tracesSampleRate: 0.1,           // 10% of transactions
  profilesSampleRate: 0.05,        // 5% of traces get profiles
  replaysSessionSampleRate: 0.1,   // 10% of sessions recorded
  replaysOnErrorSampleRate: 1.0,   // 100% of error sessions
});
```

#### 2. Event Filtering

```typescript
beforeSendTransaction: (event) => {
  // Drop low-value events
  if (event.transaction?.includes('/health')) return null;
  if (event.transaction?.includes('/static')) return null;

  // Drop very fast transactions (likely cached)
  if (event.timestamp && event.start_timestamp) {
    const duration = event.timestamp - event.start_timestamp;
    if (duration < 0.05) return null; // < 50ms
  }

  return event;
},
```

#### 3. Tier Recommendations

| Traffic Level | Sentry Plan | Synthetic | Total Cost |
|---------------|-------------|-----------|------------|
| < 1K visits/mo | Developer (free) | Checkly free | $0 |
| 1K-10K visits/mo | Team ($26) | Checkly free | $26 |
| 10K-50K visits/mo | Team ($26) | Checkly Hobby ($8) | $34 |
| 50K+ visits/mo | Business (custom) | Checkly Team | $100+ |

### Cost vs Value Analysis

| Investment | Monthly Cost | Value Provided |
|------------|--------------|----------------|
| Sentry Team | $26 | Error tracking, performance, replays |
| Checkly Free | $0 | 10K API checks, uptime monitoring |
| Developer time | ~4 hours setup | Ongoing insights, faster debugging |

**ROI Calculation:**
- Debugging time saved: ~2 hours/month
- At $50/hour: $100/month value
- Cost: $26/month
- **Net ROI: $74/month (285% return)**

### Scaling Costs

As traffic grows:

| Traffic | Events/Month | Sentry Cost | Action |
|---------|--------------|-------------|--------|
| 10K visits | ~50K events | $26 | Current plan sufficient |
| 50K visits | ~250K events | $100+ | Increase sampling to 5% |
| 100K visits | ~500K events | $200+ | Consider Business plan |

---

## Implementation Checklist

### Phase 1: Foundation (Complete)

- [x] Sentry SDK installed (`@sentry/react`)
- [x] Basic error tracking configured
- [x] Browser tracing enabled
- [x] Session replay enabled
- [x] Web Vitals collection (`web-vitals` library)

### Phase 2: Enhanced APM (To Implement)

- [ ] Add `src/lib/tracing.ts` utility module
- [ ] Configure trace propagation targets
- [ ] Implement adaptive sampling
- [ ] Add React Router integration
- [ ] Instrument key database queries
- [ ] Add component profiling to critical pages

### Phase 3: Dashboards & Alerting (To Implement)

- [ ] Create Sentry performance dashboard
- [ ] Configure latency alerts
- [ ] Configure error rate alerts
- [ ] Configure Web Vitals alerts
- [ ] Set up error budget alerts

### Phase 4: Synthetic Monitoring (To Implement)

- [ ] Set up Checkly account
- [ ] Create homepage availability check
- [ ] Create API health checks
- [ ] Create critical user journey check
- [ ] Configure alert notifications

### Phase 5: Performance Budgets (To Implement)

- [ ] Define bundle size budgets
- [ ] Add Lighthouse CI to pipeline
- [ ] Configure budget enforcement
- [ ] Create budget monitoring dashboard

---

## References

- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Checkly Documentation](https://www.checklyhq.com/docs/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Internal: SLOs and SLIs](./slos-slis.md)
- [Internal: Alerting System](./alerting.md)
- [Internal: Distributed Tracing](./distributed-tracing.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-20 | Initial APM document created | Issue #68 |
