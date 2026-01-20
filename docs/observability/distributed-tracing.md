# Distributed Tracing

This document provides comprehensive guidance on implementing distributed tracing for MeJohnC.Org, enabling end-to-end visibility across the frontend, Netlify functions, and Supabase backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Context](#architecture-context)
3. [Recommended Solutions](#recommended-solutions)
4. [Implementation Guide](#implementation-guide)
5. [Trace Context Propagation](#trace-context-propagation)
6. [Span Naming Conventions](#span-naming-conventions)
7. [Key Traces to Instrument](#key-traces-to-instrument)
8. [Sampling Strategies](#sampling-strategies)
9. [Performance Overhead](#performance-overhead)
10. [Dashboard and Visualization](#dashboard-and-visualization)
11. [Alerting on Trace Anomalies](#alerting-on-trace-anomalies)
12. [Cost Considerations](#cost-considerations)

---

## Overview

### What is Distributed Tracing?

Distributed tracing tracks requests as they flow through multiple services, providing:

- **End-to-end visibility**: See the complete journey of a user request
- **Performance insights**: Identify bottlenecks across service boundaries
- **Error correlation**: Connect frontend errors to backend root causes
- **Dependency mapping**: Understand service relationships and data flow

### Key Concepts

| Term | Definition |
|------|------------|
| **Trace** | A complete record of a request's journey through the system |
| **Span** | A single operation within a trace (e.g., API call, database query) |
| **Trace ID** | Unique identifier that links all spans in a trace |
| **Span ID** | Unique identifier for each individual span |
| **Parent Span** | The span that initiated the current operation |
| **Context** | Metadata propagated across service boundaries |

### Benefits for MeJohnC.Org

| Benefit | Description |
|---------|-------------|
| Debug production issues | Trace slow page loads to specific database queries |
| Optimize performance | Identify which API calls contribute most to latency |
| Monitor user experience | Correlate Core Web Vitals with backend performance |
| Capacity planning | Understand load distribution across services |

---

## Architecture Context

### Current Stack

MeJohnC.Org follows a modern JAMstack architecture:

```
[User Browser]
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    Netlify CDN/Edge                      │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │  Static Assets  │    │    Edge Functions          │  │
│  │  (React SPA)    │    │    (rate-limit.ts)         │  │
│  └─────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
      │                           │
      │ API Calls                 │ Rate Limiting
      ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                       Supabase                           │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │  REST API       │    │    PostgreSQL Database     │  │
│  │  (PostgREST)    │    │    (with RLS policies)     │  │
│  └─────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
      │
      │ JWT Verification
      ▼
┌─────────────────────────────────────────────────────────┐
│                        Clerk                             │
│              (Authentication Provider)                   │
└─────────────────────────────────────────────────────────┘
```

### Request Flow Examples

**Public Page Load:**
```
Browser → Netlify CDN → Static HTML/JS → Browser renders
       → Supabase REST API (blog posts, projects)
       → Browser displays content
```

**Authenticated Admin Action:**
```
Browser → Netlify Edge Function (rate limit)
       → Supabase REST API (with Clerk JWT)
       → PostgreSQL query (with RLS)
       → Response back through chain
```

### Current Observability (Already Implemented)

| Component | Tool | File |
|-----------|------|------|
| Error tracking | Sentry | `src/lib/sentry.ts` |
| Web Vitals | web-vitals library | `src/lib/web-vitals.ts` |
| Analytics | Google Analytics 4 | `src/lib/analytics.ts` |
| Logging | Custom logger | `src/lib/logger.ts` |

---

## Recommended Solutions

### Option 1: Sentry Performance/Tracing (Recommended)

**Best for:** Projects already using Sentry for error tracking (like MeJohnC.Org)

**Pros:**
- Already partially integrated (`src/lib/sentry.ts`)
- Unified error and performance monitoring
- Browser, Node.js, and edge runtime support
- Automatic instrumentation for common libraries
- Cost-effective for small to medium projects

**Cons:**
- Less flexible than OpenTelemetry
- Vendor lock-in for trace data

**Current Status:** Partially configured with `browserTracingIntegration()` enabled.

### Option 2: OpenTelemetry

**Best for:** Multi-vendor strategy, future flexibility, industry standardization

**Pros:**
- Vendor-neutral, open standard
- Export to any backend (Jaeger, Zipkin, commercial vendors)
- Extensive instrumentation libraries
- Growing ecosystem and community support

**Cons:**
- More complex setup
- Requires choosing a separate backend
- Additional operational overhead

**Use Case:** Consider if planning to migrate to self-hosted observability or multi-cloud deployment.

### Option 3: Datadog APM

**Best for:** Enterprise environments with comprehensive monitoring needs

**Pros:**
- Excellent UI and analytics
- Automatic instrumentation
- ML-powered anomaly detection
- Full-stack observability platform

**Cons:**
- Higher cost, especially at scale
- Heavier SDK footprint
- May be overkill for personal portfolio

**Use Case:** Consider if scaling to a larger team or commercial product.

### Recommendation Matrix

| Criteria | Sentry | OpenTelemetry | Datadog |
|----------|--------|---------------|---------|
| Setup complexity | Low | Medium-High | Low |
| Cost (at current scale) | Free tier | Depends on backend | $$$ |
| Existing integration | Yes | No | No |
| Vendor lock-in | Medium | None | High |
| Feature richness | Good | Excellent | Excellent |
| **Recommendation** | **Primary** | Secondary | Future consideration |

---

## Implementation Guide

### Frontend Tracing Setup (React)

#### Enhancing Current Sentry Configuration

Update `src/lib/sentry.ts` to enable comprehensive tracing:

```typescript
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured - tracing disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    integrations: [
      // Browser tracing with custom configuration
      Sentry.browserTracingIntegration({
        // Trace all navigation and page loads
        enableInp: true,

        // Custom span creation for route changes
        beforeStartSpan: (context) => ({
          ...context,
          name: getCleanRouteName(context.name),
        }),
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance monitoring sample rates
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Profile sample rate (subset of traces)
    profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay sample rates
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable in production only
    enabled: import.meta.env.PROD,

    // Attach trace headers to these origins
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.supabase\.co/,
      /^https:\/\/mejohnc\.org/,
    ],
  });
}

// Clean route names for better grouping
function getCleanRouteName(name: string): string {
  // Replace dynamic segments with placeholders
  return name
    .replace(/\/blog\/[^/]+/, '/blog/:slug')
    .replace(/\/apps\/[^/]+/, '/apps/:slug')
    .replace(/\/projects\/[^/]+/, '/projects/:slug')
    .replace(/\/admin\/[^/]+\/[^/]+/, '/admin/:section/:id');
}
```

#### Custom Span Instrumentation

Create utility functions for manual span creation:

```typescript
// src/lib/tracing.ts
import * as Sentry from '@sentry/react';

/**
 * Wrap an async operation in a custom span
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
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: String(error) }); // ERROR
        throw error;
      }
    }
  );
}

/**
 * Create a span for Supabase queries
 */
export async function traceSupabaseQuery<T>(
  queryName: string,
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  query: () => Promise<T>
): Promise<T> {
  return withSpan(
    `supabase.${operation}`,
    query,
    {
      op: 'db.query',
      description: queryName,
      data: {
        'db.system': 'postgresql',
        'db.name': 'supabase',
        'db.operation': operation,
        'db.table': table,
      },
    }
  );
}

/**
 * Create a span for external API calls
 */
export async function traceApiCall<T>(
  name: string,
  url: string,
  method: string,
  call: () => Promise<T>
): Promise<T> {
  return withSpan(
    name,
    call,
    {
      op: 'http.client',
      description: `${method} ${url}`,
      data: {
        'http.method': method,
        'http.url': url,
      },
    }
  );
}
```

#### Instrumenting React Components

Wrap key components with Sentry profiling:

```typescript
// src/App.tsx
import * as Sentry from '@sentry/react';

// Wrap component with profiler
const ProfiledApp = Sentry.withProfiler(App, {
  name: 'App',
  includeRender: true,
  includeUpdates: true,
});

// In router setup, wrap routes with Sentry
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

Sentry.init({
  // ... other config
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
});
```

### API/Function Tracing

#### Netlify Edge Function Instrumentation

Update `netlify/edge-functions/rate-limit.ts`:

```typescript
import type { Config, Context } from 'https://edge.netlify.com';

// Simple trace context for edge functions
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

// Generate trace IDs
function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Parse incoming trace context from headers
function parseTraceContext(request: Request): TraceContext | null {
  const sentryTrace = request.headers.get('sentry-trace');
  if (sentryTrace) {
    const [traceId, parentSpanId] = sentryTrace.split('-');
    return {
      traceId,
      spanId: generateId(),
      parentSpanId,
    };
  }

  // W3C Trace Context
  const traceparent = request.headers.get('traceparent');
  if (traceparent) {
    const parts = traceparent.split('-');
    return {
      traceId: parts[1],
      spanId: generateId(),
      parentSpanId: parts[2],
    };
  }

  return null;
}

// Create trace headers for downstream requests
function createTraceHeaders(ctx: TraceContext): Record<string, string> {
  return {
    'sentry-trace': `${ctx.traceId}-${ctx.spanId}-1`,
    'traceparent': `00-${ctx.traceId}-${ctx.spanId}-01`,
  };
}

export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  const startTime = Date.now();
  const traceCtx = parseTraceContext(request) || {
    traceId: generateId() + generateId(),
    spanId: generateId(),
  };

  // ... existing rate limiting logic ...

  const response = await context.next();

  // Add trace context to response headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('x-trace-id', traceCtx.traceId);
  newHeaders.set('x-span-id', traceCtx.spanId);
  newHeaders.set('x-response-time', `${Date.now() - startTime}ms`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
```

### Database Query Tracing

#### Instrumented Supabase Queries

Enhance `src/lib/supabase-queries.ts` with tracing:

```typescript
import { traceSupabaseQuery } from './tracing';

// Instrumented query example
export async function getBlogPosts(
  includeUnpublished = false,
  client: SupabaseClient = getSupabase()
) {
  return traceSupabaseQuery(
    'getBlogPosts',
    'blog_posts',
    'select',
    async () => {
      let query = client
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (!includeUnpublished) {
        const now = new Date().toISOString();
        query = query.or(
          `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return parseArrayResponse(BlogPostSchema, data, 'getBlogPosts');
    }
  );
}

// Create a generic traced query wrapper
export function createTracedQuery<TArgs extends unknown[], TResult>(
  name: string,
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  queryFn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) =>
    traceSupabaseQuery(name, table, operation, () => queryFn(...args));
}
```

---

## Trace Context Propagation

### Header Standards

MeJohnC.Org supports both W3C Trace Context and Sentry trace headers for maximum compatibility:

| Header | Format | Example |
|--------|--------|---------|
| `traceparent` (W3C) | `{version}-{trace-id}-{parent-id}-{flags}` | `00-abc123...-def456...-01` |
| `tracestate` (W3C) | `{vendor}={value},...` | `sentry=abc123` |
| `sentry-trace` | `{trace-id}-{span-id}-{sampled}` | `abc123...-def456...-1` |
| `baggage` | `{key}={value},...` | `sentry-environment=production` |

### Propagation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  Sentry SDK automatically adds trace headers to fetch/XHR       │
│  traceparent: 00-{traceId}-{spanId}-01                          │
│  sentry-trace: {traceId}-{spanId}-1                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Netlify Edge Function                         │
│  Parses incoming headers, creates child span                     │
│  Forwards context to Supabase with new span ID                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase API                             │
│  Trace headers logged in request metadata                        │
│  Query timing captured in response                               │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

Configure Sentry to propagate context to allowed origins:

```typescript
// In Sentry.init()
tracePropagationTargets: [
  'localhost',
  /^https:\/\/.*\.supabase\.co/,
  /^https:\/\/mejohnc\.org/,
  /^https:\/\/api\.clerk\.com/,
],
```

---

## Span Naming Conventions

### Naming Standards

Follow these conventions for consistent, searchable traces:

| Category | Pattern | Example |
|----------|---------|---------|
| **Page loads** | `pageload.{route}` | `pageload./blog/:slug` |
| **Navigation** | `navigation.{route}` | `navigation./admin/dashboard` |
| **HTTP requests** | `http.{method}.{service}` | `http.GET.supabase` |
| **Database queries** | `db.{operation}.{table}` | `db.select.blog_posts` |
| **Auth operations** | `auth.{action}` | `auth.getToken` |
| **UI interactions** | `ui.{component}.{action}` | `ui.BlogCard.click` |
| **Background tasks** | `task.{name}` | `task.refreshNews` |

### Span Attributes

Standard attributes to attach to spans:

```typescript
// Database spans
{
  'db.system': 'postgresql',
  'db.name': 'supabase',
  'db.operation': 'select',
  'db.table': 'blog_posts',
  'db.row_count': 10,
}

// HTTP spans
{
  'http.method': 'POST',
  'http.url': '/api/auth',
  'http.status_code': 200,
  'http.response_content_length': 1024,
}

// User context
{
  'user.id': 'user_123',
  'user.email': 'admin@mejohnc.org',
  'user.role': 'admin',
}
```

---

## Key Traces to Instrument

### 1. User Authentication Flows

**Critical paths to trace:**

```typescript
// Clerk authentication
const authTraces = {
  'auth.signIn': {
    spans: [
      'auth.clerk.signIn',
      'auth.clerk.getToken',
      'auth.supabase.createClient',
      'auth.rls.verify',
    ],
    slo: '< 2s total',
  },
  'auth.tokenRefresh': {
    spans: [
      'auth.clerk.getToken',
      'auth.supabase.refreshSession',
    ],
    slo: '< 500ms',
  },
};
```

**Implementation:**

```typescript
// src/lib/auth.tsx - Add tracing to authentication
export function useAuthenticatedSupabase() {
  const { session, isLoaded } = useSession();

  const getToken = useCallback(async (): Promise<string | null> => {
    return withSpan('auth.clerk.getToken', async () => {
      if (!session) return null;
      try {
        const token = await session.getToken({ template: 'supabase' });
        return token;
      } catch (err) {
        captureException(err);
        return null;
      }
    }, { op: 'auth' });
  }, [session]);

  // ... rest of hook
}
```

### 2. API Requests

**Trace all Supabase API calls:**

```typescript
// Automatic instrumentation via fetch monkey-patching (Sentry does this)
// Or manual instrumentation for specific calls:

export async function getApps(includeUnpublished = false) {
  return Sentry.startSpan(
    {
      name: 'api.getApps',
      op: 'http.client',
      attributes: {
        'http.url': '/rest/v1/apps',
        'include_unpublished': includeUnpublished,
      },
    },
    async (span) => {
      const startTime = performance.now();

      const { data, error } = await client
        .from('apps')
        .select('*, suite:app_suites(*)')
        .order('order_index');

      span.setAttribute('db.row_count', data?.length ?? 0);
      span.setAttribute('response_time_ms', performance.now() - startTime);

      if (error) {
        span.setStatus({ code: 2, message: error.message });
        throw error;
      }

      return parseArrayResponse(AppWithSuiteSchema, data, 'getApps');
    }
  );
}
```

### 3. Database Queries

**Query-specific tracing:**

```typescript
// High-value queries to instrument
const criticalQueries = [
  // Homepage data
  { name: 'getBlogPosts', table: 'blog_posts', slo: '200ms' },
  { name: 'getProjects', table: 'projects', slo: '200ms' },
  { name: 'getWorkHistory', table: 'work_history', slo: '100ms' },

  // Admin operations
  { name: 'getNewsArticles', table: 'news_articles', slo: '500ms' },
  { name: 'getAgentCommands', table: 'agent_commands', slo: '300ms' },
  { name: 'getBookmarks', table: 'bookmarks', slo: '400ms' },
];

// Instrument with performance budgets
export async function instrumentedQuery<T>(
  config: { name: string; table: string; slo: string },
  query: () => Promise<T>
): Promise<T> {
  const sloMs = parseInt(config.slo);

  return Sentry.startSpan(
    {
      name: `db.query.${config.name}`,
      op: 'db.query',
      attributes: {
        'db.table': config.table,
        'slo.threshold_ms': sloMs,
      },
    },
    async (span) => {
      const start = performance.now();
      const result = await query();
      const duration = performance.now() - start;

      span.setAttribute('query.duration_ms', duration);
      span.setAttribute('slo.met', duration <= sloMs);

      if (duration > sloMs) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Query ${config.name} exceeded SLO: ${duration}ms > ${sloMs}ms`,
          level: 'warning',
        });
      }

      return result;
    }
  );
}
```

### 4. External Service Calls

**Clerk API, Ghost CMS, and other external services:**

```typescript
// src/lib/ghost.ts - Trace Ghost API calls
export async function getGhostPosts() {
  return traceApiCall(
    'ghost.getPosts',
    `${GHOST_URL}/ghost/api/content/posts`,
    'GET',
    async () => {
      const posts = await ghostApi.posts.browse({
        limit: 'all',
        include: ['tags', 'authors'],
      });
      return posts;
    }
  );
}

// Trace Clerk API interactions (automatic via Sentry fetch instrumentation)
// Ensure Clerk domains are in tracePropagationTargets
```

---

## Sampling Strategies

### Sample Rate Configuration

Balance visibility with cost using these strategies:

| Environment | Traces Sample Rate | Profiles Sample Rate | Rationale |
|-------------|-------------------|---------------------|-----------|
| Development | 100% | 100% | Full visibility for debugging |
| Staging | 50% | 25% | Good coverage for testing |
| Production | 10% | 5% | Cost-effective baseline |

### Adaptive Sampling

Implement intelligent sampling based on request characteristics:

```typescript
// src/lib/sentry.ts
Sentry.init({
  // ... other config

  tracesSampler: (samplingContext) => {
    const { name, parentSampled, attributes } = samplingContext;

    // Always sample errors
    if (attributes?.['error']) {
      return 1.0;
    }

    // Always sample admin operations
    if (name?.startsWith('/admin')) {
      return 1.0;
    }

    // Sample slow operations more frequently
    if (attributes?.['http.response_time'] > 1000) {
      return 0.5;
    }

    // Higher sampling for authenticated users
    if (attributes?.['user.id']) {
      return 0.2;
    }

    // Inherit parent sampling decision
    if (typeof parentSampled === 'boolean') {
      return parentSampled ? 1.0 : 0;
    }

    // Default rate
    return import.meta.env.PROD ? 0.1 : 1.0;
  },
});
```

### Head-based vs Tail-based Sampling

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| **Head-based** (current) | Decide at trace start | Simple, low overhead | May miss interesting traces |
| **Tail-based** | Decide after trace completes | Captures all errors/slow traces | Requires buffering, higher cost |

**Recommendation:** Use head-based sampling with higher rates for errors and slow operations.

---

## Performance Overhead

### Expected Impact

| Metric | Without Tracing | With Tracing | Overhead |
|--------|-----------------|--------------|----------|
| Bundle size | Baseline | +~50KB (gzipped) | ~5-10% |
| Memory usage | Baseline | +~2MB | ~1-2% |
| Request latency | Baseline | +~2-5ms | <1% |
| CPU usage | Baseline | +~1-2% | Minimal |

### Optimization Strategies

1. **Lazy load Sentry SDK:**
   ```typescript
   // Dynamic import for non-critical pages
   const Sentry = await import('@sentry/react');
   ```

2. **Disable in development by default:**
   ```typescript
   enabled: import.meta.env.PROD,
   ```

3. **Use sampling to reduce data volume:**
   ```typescript
   tracesSampleRate: 0.1, // 10% of transactions
   ```

4. **Limit trace propagation targets:**
   ```typescript
   tracePropagationTargets: [/* only necessary origins */],
   ```

### Monitoring Overhead

Add a dashboard widget to track tracing impact:

```typescript
// Track tracing overhead
const tracingMetrics = {
  'tracing.span_count': spanCount,
  'tracing.dropped_spans': droppedSpans,
  'tracing.overhead_ms': tracingOverhead,
};
```

---

## Dashboard and Visualization

### Sentry Performance Dashboard Setup

1. **Navigate to:** Sentry > Performance > Overview

2. **Configure widgets:**

   | Widget | Purpose | Threshold |
   |--------|---------|-----------|
   | Apdex Score | Overall user satisfaction | > 0.9 |
   | Throughput | Requests per minute | Monitor trends |
   | p50/p95/p99 Latency | Response time distribution | p95 < 3s |
   | Error Rate | Failed transactions | < 0.1% |
   | Web Vitals | Core Web Vitals scores | 75% good |

3. **Create custom dashboards for:**
   - API endpoint performance
   - Database query latency
   - Authentication flow timing
   - User journey traces

### Key Queries

**Slow database queries:**
```
transaction.op:db.query AND transaction.duration:>500ms
```

**Failed authentication:**
```
transaction:auth.* AND transaction.status:error
```

**High-latency API calls:**
```
transaction.op:http.client AND transaction.duration:>1000ms
```

### Trace Explorer

Use Sentry's trace explorer to:
- View end-to-end request flows
- Identify bottlenecks visually
- Compare trace durations
- Drill down into specific spans

---

## Alerting on Trace Anomalies

### Alert Configuration

Configure alerts in Sentry for trace-based anomalies:

#### 1. Latency Degradation Alert

```yaml
Alert Name: API Latency Degradation
Trigger: Transaction duration p95 > 3000ms
Window: 15 minutes
Threshold: 10% of transactions
Action: Slack notification to #alerts channel
```

#### 2. Error Rate Spike Alert

```yaml
Alert Name: Transaction Error Rate Spike
Trigger: Transaction error rate > 1%
Window: 10 minutes
Baseline: 200% above historical average
Action: Email + Slack notification
```

#### 3. Database Query Slowdown

```yaml
Alert Name: Database Query Slowdown
Trigger: db.query span duration p95 > 500ms
Window: 10 minutes
Filter: span.op:db.query
Action: Slack notification
```

### Alert Integration with Runbooks

Link alerts to operational runbooks:

| Alert | Runbook |
|-------|---------|
| API Latency Degradation | [troubleshooting.md](../runbooks/troubleshooting.md#api-performance) |
| Database Query Slowdown | [database-runbook.md](../runbooks/database-runbook.md#slow-queries) |
| Auth Flow Failures | [incident-response.md](../runbooks/incident-response.md#authentication-issues) |

---

## Cost Considerations

### Sentry Pricing (Current Choice)

| Plan | Monthly Events | Price | Recommended For |
|------|----------------|-------|-----------------|
| Developer | 5K | Free | Development/Testing |
| Team | 50K | $26/mo | Small production sites |
| Business | 100K+ | Custom | High-traffic production |

**Current Recommendation:** Team plan with 10% sampling = ~5K events/month with 50K traffic.

### Cost Optimization Strategies

1. **Adjust sampling rates:**
   ```typescript
   // Start conservative
   tracesSampleRate: 0.05, // 5%

   // Increase for debugging periods
   tracesSampleRate: 0.5, // 50%
   ```

2. **Use client-side filtering:**
   ```typescript
   beforeSendTransaction: (event) => {
     // Drop low-value transactions
     if (event.transaction?.includes('/health')) {
       return null;
     }
     return event;
   },
   ```

3. **Aggregate similar traces:**
   ```typescript
   // Use transaction name grouping
   transaction: '/blog/:slug', // Instead of /blog/actual-post-title
   ```

4. **Monitor usage:**
   - Check Sentry's usage dashboard weekly
   - Set up usage alerts at 80% quota
   - Review and drop unused transaction types

### Cost Comparison

| Solution | 50K traces/month | 500K traces/month |
|----------|------------------|-------------------|
| Sentry | ~$26 | ~$200 |
| Datadog | ~$100 | ~$800 |
| Self-hosted (Jaeger) | ~$50 (infra) | ~$100 (infra) |

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Enhance Sentry configuration in `src/lib/sentry.ts`
- [ ] Add `src/lib/tracing.ts` utility module
- [ ] Configure trace propagation targets
- [ ] Set up sampling strategy

### Phase 2: Frontend Instrumentation (Week 2)

- [ ] Instrument React Router with Sentry
- [ ] Add component profiling to critical components
- [ ] Trace Supabase queries with custom spans
- [ ] Add user context to traces

### Phase 3: API/Edge Instrumentation (Week 3)

- [ ] Update Netlify edge functions with trace context
- [ ] Add trace headers to Supabase requests
- [ ] Instrument authentication flows
- [ ] Test end-to-end trace propagation

### Phase 4: Monitoring and Alerting (Week 4)

- [ ] Configure Sentry performance dashboards
- [ ] Set up latency and error rate alerts
- [ ] Create custom queries for critical paths
- [ ] Document runbook integrations

---

## References

- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [W3C Trace Context Standard](https://www.w3.org/TR/trace-context/)
- [Supabase Observability](https://supabase.com/docs/guides/platform/metrics)
- [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/)
- [Internal: SLOs and SLIs](./slos-slis.md)
- [Internal: Alerting System](./alerting.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-20 | Initial document created | Issue #67 |
