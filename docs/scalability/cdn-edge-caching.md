# CDN and Edge Caching Configuration

This document defines the CDN and edge caching strategy for MeJohnC.Org, a React SPA deployed on Netlify with global edge distribution.

---

## Table of Contents

1. [CDN and Edge Caching Overview](#cdn-and-edge-caching-overview)
2. [Current Netlify CDN Configuration](#current-netlify-cdn-configuration)
3. [Cache Configuration](#cache-configuration)
4. [Netlify Edge Configuration](#netlify-edge-configuration)
5. [Cache Invalidation](#cache-invalidation)
6. [Performance Optimization](#performance-optimization)
7. [Cache Debugging and Monitoring](#cache-debugging-and-monitoring)
8. [Custom Cache Rules by Path](#custom-cache-rules-by-path)
9. [Security Headers Configuration](#security-headers-configuration)
10. [Performance Testing Recommendations](#performance-testing-recommendations)

---

## CDN and Edge Caching Overview

### What is Edge Caching?

Edge caching stores content at globally distributed Points of Presence (PoPs), serving users from the nearest location to reduce latency.

```
User Request (Sydney)
        |
        v
+------------------+
| Netlify Edge PoP |  <-- Cache HIT: Response in ~20ms
|    (Sydney)      |
+------------------+
        |
        | Cache MISS
        v
+------------------+
| Origin Server    |  <-- Full round-trip: ~200ms
|   (Netlify)      |
+------------------+
```

### MeJohnC.Org CDN Architecture

```
                     Global Traffic
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
    +----------+    +----------+    +----------+
    | Edge PoP |    | Edge PoP |    | Edge PoP |
    |  (US-E)  |    |  (EU-W)  |    | (APAC)   |
    +----------+    +----------+    +----------+
          |               |               |
          +---------------+---------------+
                          |
                          v
                  +---------------+
                  |   Netlify     |
                  | Build Output  |
                  +---------------+
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
    +-----------+  +-----------+  +-----------+
    | Static    |  | Edge Func |  | Serverless|
    | Assets    |  | (rate-    |  | Functions |
    | (CDN)     |  |  limit)   |  | (API)     |
    +-----------+  +-----------+  +-----------+
```

### Benefits of Netlify CDN

| Benefit | Impact | Details |
|---------|--------|---------|
| Global Distribution | <50ms latency worldwide | 200+ PoPs globally |
| Automatic HTTPS | Zero configuration | Free SSL certificates |
| HTTP/2 & HTTP/3 | Multiplexed requests | Faster asset loading |
| Automatic Compression | Smaller payloads | Brotli and gzip |
| DDoS Protection | Built-in mitigation | Enterprise-grade |
| Atomic Deploys | Zero downtime | Instant cache invalidation |

---

## Current Netlify CDN Configuration

### netlify.toml Configuration

The current Netlify configuration (`netlify.toml`):

```toml
# Build Configuration
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

# SPA Routing - React Router handles all routes
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Edge Functions
[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"

# Context-specific settings
[context.production]
  environment = { NODE_ENV = "production" }

[context.deploy-preview]
  environment = { NODE_ENV = "preview" }

[context.branch-deploy]
  environment = { NODE_ENV = "staging" }

# Performance Plugin
[[plugins]]
  package = "@netlify/plugin-lighthouse"

  [plugins.inputs]
    output_path = "reports/lighthouse"
```

### Build Output Structure

Vite generates optimized, content-hashed assets:

```
dist/
├── index.html                    # Entry point (no-cache)
├── assets/
│   ├── index-[hash].js          # Main bundle (immutable)
│   ├── index-[hash].css         # Styles (immutable)
│   ├── vendor-react-[hash].js   # React core (immutable)
│   ├── vendor-auth-[hash].js    # Clerk auth (immutable)
│   └── vendor-supabase-[hash].js # Supabase client (immutable)
├── images/                       # Static images
├── favicon.ico                   # Site icon
└── robots.txt                    # SEO
```

---

## Cache Configuration

### Static Assets (JS, CSS, Fonts)

**Policy:** Cache indefinitely with `immutable` flag

Content-hashed assets can be cached forever because any change produces a new filename.

```
# public/_headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

| Directive | Value | Purpose |
|-----------|-------|---------|
| `public` | - | Cacheable by CDN and browser |
| `max-age` | 31536000 (1 year) | Maximum cache duration |
| `immutable` | - | Never revalidate; content cannot change |

**Vite Configuration for Content Hashing:**

```javascript
// vite.config.ts (implicit)
export default {
  build: {
    rollupOptions: {
      output: {
        // Assets include content hash in filename
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
};
```

### Images

**Policy:** Cache for 24 hours with revalidation

Images may change without URL changes (e.g., profile photos, logos).

```
# public/_headers
/*.png
  Cache-Control: public, max-age=86400
/*.jpg
  Cache-Control: public, max-age=86400
/*.svg
  Cache-Control: public, max-age=86400
/*.ico
  Cache-Control: public, max-age=86400
/*.webp
  Cache-Control: public, max-age=86400
```

**Recommended Enhancement with Stale-While-Revalidate:**

```
/*.png
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*.jpg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

This allows serving stale images for up to 7 days while revalidating in the background.

### HTML Pages

**Policy:** Never cache; always fetch fresh

The SPA entry point (`index.html`) must always be fresh to ensure users get the latest JavaScript bundle references.

```
# public/_headers
/*.html
  Cache-Control: no-cache, no-store, must-revalidate
```

| Directive | Purpose |
|-----------|---------|
| `no-cache` | Always revalidate with origin |
| `no-store` | Never store in cache |
| `must-revalidate` | Strict compliance with freshness |

**Why No Caching for HTML:**
- HTML references content-hashed JS/CSS files
- New deployments change these references
- Cached HTML would load old/missing assets
- SPA routing requires fresh entry point

### API Responses

**Current State:** No CDN caching (dynamic content)

API responses from Supabase and serverless functions are not cached at the CDN level.

**Recommended CDN Caching for Public API Data:**

For public, read-only endpoints, add caching headers:

```typescript
// netlify/functions/public-content.ts
export async function handler(event: APIGatewayEvent) {
  const data = await fetchPublicContent();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache for 5 minutes, serve stale for 1 minute while revalidating
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      // Vary by Accept-Encoding for compression
      'Vary': 'Accept-Encoding',
    },
    body: JSON.stringify(data),
  };
}
```

### Cache-Control Headers Reference

| Content Type | Cache-Control Header | TTL |
|--------------|---------------------|-----|
| Hashed JS/CSS | `public, max-age=31536000, immutable` | 1 year |
| Images | `public, max-age=86400` | 24 hours |
| HTML | `no-cache, no-store, must-revalidate` | 0 |
| Service Worker | `no-cache, no-store, must-revalidate` | 0 |
| Sitemap/robots | `public, max-age=3600` | 1 hour |
| Public API | `public, max-age=300, stale-while-revalidate=60` | 5 min |
| Private API | `private, no-store` | 0 |

---

## Netlify Edge Configuration

### netlify.toml Caching Rules

**Current Edge Function Configuration:**

```toml
[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"
```

**Recommended Enhanced Configuration:**

```toml
# Edge Functions for dynamic processing
[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"

# Custom headers via edge (alternative to _headers file)
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

# Conditional caching for specific paths
[[headers]]
  for = "/api/public/*"
  [headers.values]
    Cache-Control = "public, max-age=300, stale-while-revalidate=60"
    Vary = "Accept-Encoding"
```

### Edge Functions for Dynamic Content

The current rate-limiting Edge Function (`netlify/edge-functions/rate-limit.ts`):

```typescript
import type { Config, Context } from 'https://edge.netlify.com'

// Configuration
const WINDOW_MS = 60000  // 1 minute
const MAX_REQUESTS = 60  // 60 requests per minute

// In-memory store (per edge location)
const store = new Map<string, RateLimitEntry>()

export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  const clientIp = getClientIp(request, context)
  const result = checkRateLimit(clientIp)

  // Add rate limit headers to response
  const response = await context.next()
  const newHeaders = new Headers(response.headers)
  newHeaders.set('X-RateLimit-Limit', MAX_REQUESTS.toString())
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString())

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  })
}

export const config: Config = {
  path: '/api/*',
}
```

**Edge Function Caching Pattern:**

```typescript
// netlify/edge-functions/cached-content.ts
import type { Context } from 'https://edge.netlify.com'

export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  // Check for cached response
  const cacheKey = new URL(request.url).pathname
  const cached = await context.cookies.get(`cache:${cacheKey}`)

  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  // Fetch from origin
  const response = await context.next()
  const data = await response.text()

  // Return with cache headers
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
```

### Stale-While-Revalidate Patterns

Stale-while-revalidate (SWR) serves cached content immediately while fetching fresh content in the background.

**HTTP Header Implementation:**

```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

| Directive | Value | Behavior |
|-----------|-------|----------|
| `max-age` | 300 | Content is fresh for 5 minutes |
| `stale-while-revalidate` | 60 | Serve stale for 1 minute while revalidating |

**Timeline:**

```
T=0min   T=5min        T=6min
  |        |             |
  |--FRESH--|--STALE+SWR--|--MUST REVALIDATE-->
  |        |             |
  |        | Serve stale |
  |        | + background|
  |        | revalidation|
```

**Client-Side SWR Pattern:**

```typescript
// Use SWR pattern with client-side caching
async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAge: number,
  staleWhileRevalidate: number
): Promise<T> {
  const cached = cache.get(key)
  const now = Date.now()

  if (cached) {
    const age = now - cached.timestamp

    // Fresh: return immediately
    if (age < maxAge) {
      return cached.data as T
    }

    // Stale but within SWR window: return stale, revalidate in background
    if (age < maxAge + staleWhileRevalidate) {
      // Fire-and-forget background refresh
      fetcher().then((data) => {
        cache.set(key, { data, timestamp: Date.now() })
      })
      return cached.data as T
    }
  }

  // No cache or expired: fetch synchronously
  const data = await fetcher()
  cache.set(key, { data, timestamp: now })
  return data
}
```

---

## Cache Invalidation

### Automatic on Deploy

Netlify automatically invalidates CDN cache on every deployment:

1. **Atomic Deploys:** New deployment creates new asset URLs
2. **Instant Propagation:** Cache cleared at all 200+ PoPs
3. **Zero Downtime:** Old version served until new version is fully deployed

**How It Works:**

```
Deploy #1: /assets/main-abc123.js (cached)
Deploy #2: /assets/main-def456.js (new URL, no cache)

Old cache entry: /assets/main-abc123.js (stale but harmless)
New cache entry: /assets/main-def456.js (fresh)
```

Content-hashed filenames mean old cache entries are never served for new deployments.

### Manual Purge Procedures

**Via Netlify Dashboard:**

1. Navigate to Site Settings > Build & Deploy
2. Click "Clear cache and deploy site"
3. Wait for build to complete

**Via Netlify CLI:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Clear cache and trigger rebuild
netlify build --clear-cache

# Or just clear CDN cache
netlify cache:clear
```

**Via Netlify API:**

```bash
# Trigger a new deploy with cache clear
curl -X POST \
  -H "Authorization: Bearer $NETLIFY_ACCESS_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/builds" \
  -d '{"clear_cache": true}'
```

**Via Build Hooks:**

```bash
# Trigger deploy via webhook (set up in Netlify Dashboard)
curl -X POST "https://api.netlify.com/build_hooks/$HOOK_ID"
```

### Cache Busting Strategies

**1. Content Hashing (Primary Strategy):**

Vite automatically adds content hashes to filenames:

```
main.js      -> main-a1b2c3d4.js
styles.css   -> styles-e5f6g7h8.css
```

**2. Query String Cache Busting:**

For assets without content hashing:

```html
<link rel="icon" href="/favicon.ico?v=2">
<script src="/config.js?v=1705123456"></script>
```

**3. Versioned Paths:**

For major asset changes:

```
/v1/assets/logo.png
/v2/assets/logo.png
```

**4. ETags and Last-Modified:**

Netlify automatically adds these headers for conditional requests:

```
ETag: "abc123"
Last-Modified: Mon, 20 Jan 2025 12:00:00 GMT
```

Browsers can revalidate with:

```
If-None-Match: "abc123"
If-Modified-Since: Mon, 20 Jan 2025 12:00:00 GMT
```

---

## Performance Optimization

### Compression (Brotli, gzip)

Netlify automatically compresses responses with Brotli (preferred) or gzip.

**Compression Priority:**

1. Brotli (br) - ~15-20% smaller than gzip
2. gzip (gz) - Universal support
3. Identity (no compression) - For already-compressed content

**Request/Response Flow:**

```
Request:
Accept-Encoding: br, gzip, deflate

Response:
Content-Encoding: br
Vary: Accept-Encoding
```

**Compression Eligibility:**

| Content Type | Compressed | Notes |
|--------------|------------|-------|
| text/html | Yes | Primary benefit |
| text/css | Yes | Significant reduction |
| application/javascript | Yes | ~70% reduction |
| application/json | Yes | API responses |
| image/svg+xml | Yes | Text-based images |
| image/png | No | Already compressed |
| image/jpeg | No | Already compressed |
| font/woff2 | No | Pre-compressed format |

**Expected Compression Ratios:**

| Asset Type | Original | Brotli | Reduction |
|------------|----------|--------|-----------|
| JavaScript | 500KB | 150KB | 70% |
| CSS | 100KB | 20KB | 80% |
| HTML | 50KB | 10KB | 80% |
| JSON | 200KB | 40KB | 80% |

### Image Optimization

**Current Configuration:**

Static images are served via CDN with 24-hour cache.

**Recommended Enhancements:**

**1. Use Modern Formats:**

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>
```

**2. Responsive Images:**

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="Description"
>
```

**3. Lazy Loading:**

```html
<img src="image.jpg" loading="lazy" alt="Description">
```

**4. Netlify Large Media (Optional):**

For dynamic image transformations:

```html
<!-- Transform on-the-fly -->
<img src="image.jpg?nf_resize=fit&w=400&h=300" alt="Description">
```

### Preloading and Prefetching

**Preload Critical Resources:**

```html
<!-- In index.html head -->
<link rel="preload" href="/assets/vendor-react-[hash].js" as="script">
<link rel="preload" href="/assets/index-[hash].css" as="style">
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>
```

**DNS Prefetch for External Services:**

```html
<link rel="dns-prefetch" href="https://clerk.mejohnc.org">
<link rel="dns-prefetch" href="https://api.supabase.co">
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
```

**Preconnect for Critical Connections:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Prefetch for Likely Navigation:**

```html
<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/portfolio">
<link rel="prefetch" href="/about">
```

**Vite Configuration for Chunking:**

```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-auth': ['@clerk/clerk-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
};
```

---

## Cache Debugging and Monitoring

### Checking Cache Headers

**Using curl:**

```bash
# Check response headers
curl -I https://mejohnc.org/assets/main.js

# Example output:
# HTTP/2 200
# cache-control: public, max-age=31536000, immutable
# content-encoding: br
# content-type: application/javascript
# x-nf-request-id: abc123...
```

**Using Browser DevTools:**

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on a request
5. Check Response Headers for:
   - `Cache-Control`
   - `Age` (time in cache)
   - `X-Cache` (HIT/MISS)

### Netlify Cache Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-NF-Request-ID` | Unique request identifier | `abc123-def456` |
| `Age` | Seconds since cached | `3600` |
| `X-Cache` | Cache status | `HIT` or `MISS` |
| `Netlify-CDN-Cache-Control` | CDN-specific cache | `public, max-age=300` |

### Bypassing Cache for Testing

**Disable Cache in DevTools:**

1. Open DevTools
2. Check "Disable cache" in Network tab

**Add Cache-Control Header:**

```bash
curl -H "Cache-Control: no-cache" https://mejohnc.org/
```

**Add Pragma Header (Legacy):**

```bash
curl -H "Pragma: no-cache" https://mejohnc.org/
```

**Query String Cache Bypass:**

```
https://mejohnc.org/?nocache=1
```

### Monitoring Cache Performance

**Netlify Analytics:**

- Navigate to Site > Analytics
- View CDN cache hit ratio
- Monitor bandwidth by cache status

**Key Metrics to Track:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Cache Hit Ratio | >90% | <70% |
| Average Age | >1 hour | <5 minutes |
| Cache Miss Rate | <10% | >30% |
| Bandwidth Served (Cached) | >80% | <60% |

**Custom Monitoring with Web Vitals:**

```typescript
// src/lib/web-vitals.ts
import { onLCP, onFID, onCLS } from 'web-vitals'

function reportCacheMetrics() {
  // Check resource timing for cache status
  const resources = performance.getEntriesByType('resource')

  const cacheMetrics = resources.reduce((acc, resource) => {
    const timing = resource as PerformanceResourceTiming
    // transferSize = 0 indicates cache hit
    if (timing.transferSize === 0) {
      acc.hits++
    } else {
      acc.misses++
    }
    return acc
  }, { hits: 0, misses: 0 })

  console.log('Cache Hit Ratio:', cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses))
}
```

---

## Custom Cache Rules by Path

### Path-Based Caching Strategy

```
# public/_headers

# Marketing pages - cache with revalidation
/marketing/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

# Blog assets - longer cache
/blog/assets/*
  Cache-Control: public, max-age=604800, immutable

# API documentation - moderate cache
/docs/*
  Cache-Control: public, max-age=1800, stale-while-revalidate=3600

# User-specific paths - no cache
/dashboard/*
  Cache-Control: private, no-store

# Public API endpoints - short cache
/api/public/*
  Cache-Control: public, max-age=300, stale-while-revalidate=60

# Webhook endpoints - no cache
/api/webhooks/*
  Cache-Control: no-store
```

### Conditional Caching

**Via Edge Function:**

```typescript
// netlify/edge-functions/conditional-cache.ts
export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url)
  const response = await context.next()

  // Clone response to modify headers
  const newHeaders = new Headers(response.headers)

  // Apply different cache rules based on path
  if (url.pathname.startsWith('/api/public/')) {
    newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  } else if (url.pathname.startsWith('/api/user/')) {
    newHeaders.set('Cache-Control', 'private, no-store')
  } else if (url.pathname.startsWith('/static/')) {
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  })
}
```

### Cache Rules Summary

| Path Pattern | Cache-Control | Use Case |
|--------------|---------------|----------|
| `/assets/*` | `public, max-age=31536000, immutable` | Hashed static assets |
| `/*.html` | `no-cache, no-store, must-revalidate` | SPA entry points |
| `/images/*` | `public, max-age=86400, stale-while-revalidate=604800` | Static images |
| `/api/public/*` | `public, max-age=300, stale-while-revalidate=60` | Public API data |
| `/api/user/*` | `private, no-store` | Authenticated data |
| `/docs/*` | `public, max-age=1800` | Documentation |
| `/sw.js` | `no-cache, no-store, must-revalidate` | Service worker |

---

## Security Headers Configuration

### Current Security Headers

The `public/_headers` file configures comprehensive security headers:

```
/*
  # HTTPS enforcement (1 year with preload)
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

  # Prevent clickjacking
  X-Frame-Options: DENY

  # Prevent MIME type sniffing
  X-Content-Type-Options: nosniff

  # XSS protection (legacy browsers)
  X-XSS-Protection: 1; mode=block

  # Referrer policy
  Referrer-Policy: strict-origin-when-cross-origin

  # Permissions policy
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()

  # Content Security Policy
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://clerk.mejohnc.org https://*.clerk.accounts.dev https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://clerk.mejohnc.org https://*.clerk.accounts.dev https://api.github.com https://*.ghost.io https://*.sentry.io; frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

### Security Headers Reference

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | Deny unused APIs | Disable browser features |
| `Content-Security-Policy` | Detailed policy | Prevent XSS and injection |

### CSP and Caching Interaction

Content Security Policy interacts with caching:

- CSP is applied per-response
- Cached responses retain their CSP headers
- Changes to CSP require cache invalidation

**Testing CSP with Report-Only:**

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /api/csp-report
```

---

## Performance Testing Recommendations

### Lighthouse Testing

**Via Netlify Plugin (Automatic):**

```toml
# netlify.toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"

  [plugins.inputs]
    output_path = "reports/lighthouse"
    thresholds = { performance = 0.9, accessibility = 0.9, best-practices = 0.9, seo = 0.9 }
```

**Manual Testing:**

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://mejohnc.org --output=html --output-path=./report.html

# Run with specific categories
lighthouse https://mejohnc.org --only-categories=performance,best-practices
```

### WebPageTest

**Recommended Test Configuration:**

- Test Location: Multiple regions (US, EU, Asia)
- Browser: Chrome (Desktop and Mobile)
- Connection: Cable, 4G, 3G Slow
- Repeat View: Enable (tests cache effectiveness)

**Key Metrics to Check:**

| Metric | Target | Description |
|--------|--------|-------------|
| First Byte (TTFB) | <200ms | CDN cache effectiveness |
| Start Render | <1.5s | When content appears |
| Speed Index | <3.0s | Visual completeness |
| Total Blocking Time | <200ms | JavaScript execution |
| Fully Loaded | <5s | All resources loaded |

### k6 Load Testing

**Basic Cache Performance Test:**

```javascript
// k6/cache-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  // Test static asset caching
  const assetRes = http.get('https://mejohnc.org/assets/main.js')
  check(assetRes, {
    'asset status is 200': (r) => r.status === 200,
    'asset has cache-control': (r) => r.headers['Cache-Control']?.includes('max-age'),
    'asset is compressed': (r) => r.headers['Content-Encoding'] !== undefined,
  })

  // Test HTML (should not be cached)
  const htmlRes = http.get('https://mejohnc.org/')
  check(htmlRes, {
    'html status is 200': (r) => r.status === 200,
    'html has no-cache': (r) => r.headers['Cache-Control']?.includes('no-cache'),
  })

  sleep(1)
}
```

**Run Load Test:**

```bash
k6 run k6/cache-test.js
```

### Performance Budget

**Recommended Limits:**

| Resource Type | Budget | Current |
|---------------|--------|---------|
| Total JavaScript | 500KB | ~350KB |
| Total CSS | 100KB | ~50KB |
| Total Images | 1MB | Variable |
| Total Page Weight | 2MB | ~1MB |
| DOM Elements | <1500 | ~500 |
| HTTP Requests | <50 | ~20 |

**Monitoring Performance Budget:**

```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        // Warn if chunk exceeds 500KB
        experimentalMinChunkSize: 500 * 1024,
      },
    },
    // Report bundle size
    reportCompressedSize: true,
  },
}
```

### Continuous Performance Monitoring

**GitHub Actions Integration:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit deployed URL
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://mejohnc.org/
            https://mejohnc.org/portfolio
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**lighthouse-budget.json:**

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 500 },
      { "resourceType": "stylesheet", "budget": 100 },
      { "resourceType": "image", "budget": 1000 },
      { "resourceType": "total", "budget": 2000 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 20 },
      { "resourceType": "total", "budget": 50 }
    ]
  }
]
```

---

## Related Documentation

- [Caching Strategy](./caching-strategy.md) - Application-level caching patterns
- [Horizontal Scaling Strategy](./horizontal-scaling.md) - Infrastructure scaling approach
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md)
- [Scaling Runbook](../runbooks/scaling-runbook.md)

---

## Appendix: Quick Reference

### Common Commands

```bash
# Check cache headers
curl -I https://mejohnc.org/assets/main.js

# Bypass cache
curl -H "Cache-Control: no-cache" https://mejohnc.org/

# Clear Netlify cache
netlify cache:clear

# Trigger deploy with cache clear
netlify build --clear-cache

# Run Lighthouse audit
lighthouse https://mejohnc.org --output=html
```

### Cache-Control Cheat Sheet

```
# Immutable assets (hashed filenames)
Cache-Control: public, max-age=31536000, immutable

# Dynamic content with SWR
Cache-Control: public, max-age=300, stale-while-revalidate=60

# Private user data
Cache-Control: private, max-age=0, must-revalidate

# Never cache
Cache-Control: no-store, no-cache, must-revalidate
```

### TTL Quick Reference

| Duration | Seconds | Use Case |
|----------|---------|----------|
| 1 minute | 60 | Real-time data |
| 5 minutes | 300 | API responses |
| 1 hour | 3600 | Static content |
| 1 day | 86400 | Images |
| 1 week | 604800 | Stable assets |
| 1 year | 31536000 | Immutable assets |

---

## Version History

| Date | Change | Issue |
|------|--------|-------|
| 2025-01-20 | Initial document created | #82 |
