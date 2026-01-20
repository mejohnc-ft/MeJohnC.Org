# Centralized Log Aggregation

This document outlines the log aggregation strategy, implementation patterns, and operational guidance for MeJohnC.Org.

---

## Table of Contents

1. [Log Aggregation Strategy Overview](#log-aggregation-strategy-overview)
2. [Log Sources](#log-sources)
3. [Recommended Solutions Evaluation](#recommended-solutions-evaluation)
4. [Log Format Standardization](#log-format-standardization)
5. [Structured Logging Best Practices](#structured-logging-best-practices)
6. [Log Levels and Usage](#log-levels-and-usage)
7. [Sensitive Data Handling](#sensitive-data-handling)
8. [Log Retention Policies](#log-retention-policies)
9. [Search and Analysis Patterns](#search-and-analysis-patterns)
10. [Log-Based Alerts](#log-based-alerts)
11. [Integration Guide](#integration-guide)
12. [Cost Considerations](#cost-considerations)

---

## Log Aggregation Strategy Overview

### Why Centralized Logging?

MeJohnC.Org operates across multiple services and platforms:

| Component | Platform | Native Logs |
|-----------|----------|-------------|
| Frontend (React) | Browser | Console, Sentry |
| Edge Functions | Netlify | Netlify Logs |
| Database Functions | Supabase | Supabase Logs |
| Authentication | Clerk | Clerk Dashboard |
| CMS | Ghost | Ghost Logs |

Without centralization, debugging requires checking 5+ separate dashboards. A unified logging solution provides:

- **Single pane of glass** for all application logs
- **Correlation** across services using correlation IDs
- **Faster incident response** with unified search
- **Long-term retention** beyond native platform limits
- **Custom alerting** based on log patterns

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Log Sources                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────-┤
│  Frontend   │  Netlify    │  Supabase   │   Clerk     │   Ghost    │
│  (Browser)  │  Edge Fn    │  Functions  │   Auth      │   CMS      │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────┬──────┘
       │             │             │             │            │
       ▼             ▼             ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Log Aggregation Platform                         │
│                (Logtail / Axiom / Datadog / etc.)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────┐          ┌─────────────┐        ┌───────────┐
   │ Search  │          │  Dashboards │        │  Alerts   │
   │ & Query │          │  & Metrics  │        │           │
   └─────────┘          └─────────────┘        └───────────┘
```

### Current Logging Infrastructure

MeJohnC.Org already has structured logging in place:

**Frontend Logger** (`src/lib/logger.ts`):
- Structured JSON logging in production
- Correlation ID support
- Session and user context tracking
- Sentry integration for errors

**Supabase Function Logger** (`supabase/functions/_shared/logger.ts`):
- Request/response logging middleware
- Client IP and user agent tracking
- Correlation ID propagation
- Structured JSON output

---

## Log Sources

### 1. Frontend Logs (Browser)

**Source:** React application running in user browsers

**Collection Method:** JavaScript SDK forwarding to aggregation platform

**Log Types:**

| Type | Description | Current Handler |
|------|-------------|-----------------|
| JavaScript Errors | Runtime exceptions, unhandled rejections | Sentry |
| Console Logs | Application logging via `logger` | Console (dev) / JSON (prod) |
| Web Vitals | Performance metrics (LCP, FCP, CLS, INP, TTFB) | GA4 + Console |
| User Actions | Click events, navigation, form submissions | Analytics |
| Network Errors | API failures, timeouts | Sentry + Logger |

**Current Implementation:**

```typescript
// src/lib/logger.ts - Already implemented
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

**Sentry Integration:**

```typescript
// src/lib/sentry.ts - Already configured
Sentry.init({
  dsn: SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Enhancement for Aggregation:**

```typescript
// Extension to forward logs to aggregation platform
function forwardToAggregator(entry: LogEntry): void {
  if (!import.meta.env.VITE_LOG_ENDPOINT) return;

  // Use sendBeacon for reliability on page unload
  const payload = JSON.stringify({
    ...entry,
    source: 'frontend',
    environment: import.meta.env.MODE,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  navigator.sendBeacon(import.meta.env.VITE_LOG_ENDPOINT, payload);
}
```

### 2. Netlify Function Logs

**Source:** Edge functions and serverless functions

**Collection Method:**
- Native Netlify Logs (7-day retention)
- Log drain to external aggregator

**Log Types:**

| Type | Description | Volume |
|------|-------------|--------|
| Request Logs | Incoming HTTP requests | Every request |
| Function Execution | Edge/serverless function logs | Per invocation |
| Rate Limit Events | Rate limiting triggers | When triggered |
| Deploy Logs | Build and deploy output | Per deploy |

**Current Implementation:**

```typescript
// netlify/edge-functions/rate-limit.ts
// Logs rate limit events with structured data
{
  error: 'Too Many Requests',
  message: 'Rate limit exceeded. Please try again later.',
  retryAfter: result.retryAfter,
}
```

**Log Drain Configuration:**

```toml
# netlify.toml
[build]
  # ... existing config

# Log drain (configure in Netlify Dashboard)
# Site Settings > Logs > Log drains
# Supported destinations: Datadog, Logtail, custom HTTP endpoint
```

### 3. Supabase Logs

**Source:** PostgreSQL database and Edge Functions

**Collection Method:**
- Supabase Dashboard (native logs)
- Edge Function logging via structured logger
- Database query logging via pg_stat_statements

**Log Types:**

| Type | Description | Access |
|------|-------------|--------|
| API Logs | PostgREST API requests | Supabase Dashboard |
| Auth Logs | Authentication events | Supabase Dashboard |
| Edge Function Logs | Custom function execution | Function Logs tab |
| Database Logs | Query execution, errors | Database tab |
| Realtime Logs | WebSocket connections | Realtime tab |

**Current Implementation:**

```typescript
// supabase/functions/_shared/logger.ts - Already implemented
export function withLogging(
  handler: (req: Request, logger: Logger) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const logger = Logger.fromRequest(req);
    logger.logRequest();
    // ... execution ...
    logger.logResponse(response.status, duration);
    return response;
  };
}
```

**Supabase Log Export:**

```sql
-- Query recent error logs
SELECT
  timestamp,
  event_message,
  metadata
FROM edge_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND metadata->>'level' = 'error'
ORDER BY timestamp DESC
LIMIT 100;
```

### 4. Clerk Authentication Logs

**Source:** Clerk authentication service

**Collection Method:**
- Clerk Dashboard
- Webhooks to custom endpoint
- Backend API for log retrieval

**Log Types:**

| Type | Description | Webhook Event |
|------|-------------|---------------|
| Sign-in Events | Successful/failed logins | `user.created`, `session.created` |
| Sign-up Events | New user registrations | `user.created` |
| Session Events | Session creation/expiry | `session.*` |
| User Updates | Profile changes | `user.updated` |
| Organization Events | Team/org changes | `organization.*` |

**Webhook Configuration:**

```typescript
// netlify/functions/clerk-webhook.ts (example)
import { Webhook } from 'svix';

export async function handler(event) {
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  const payload = webhook.verify(
    event.body,
    event.headers
  );

  // Forward to log aggregator
  await forwardLog({
    source: 'clerk',
    event: payload.type,
    data: payload.data,
    timestamp: new Date().toISOString(),
  });

  return { statusCode: 200 };
}
```

### 5. Ghost CMS Logs

**Source:** Ghost CMS for blog content

**Collection Method:**
- Ghost Admin dashboard
- API access logs (if self-hosted)
- Content API request logging in application

**Log Types:**

| Type | Description |
|------|-------------|
| Content Access | API requests for posts/pages |
| Admin Actions | Content creation/editing |
| Email Events | Newsletter sends/opens |

**Application-Side Logging:**

```typescript
// In content fetching code
logger.time('ghost-api-fetch', async () => {
  return await ghost.posts.browse({ limit: 10 });
}, { endpoint: 'posts.browse', limit: 10 });
```

---

## Recommended Solutions Evaluation

### Evaluation Criteria

| Criteria | Weight | Description |
|----------|--------|-------------|
| Cost | High | Monthly cost for expected log volume |
| Ease of Setup | High | Time to integrate with existing stack |
| Query Capability | Medium | Search syntax, filtering, analysis |
| Retention | Medium | Log storage duration |
| Alerting | Medium | Built-in alerting capabilities |
| Support | Low | Documentation and community |

### Solution Comparison

#### 1. Logtail (Better Stack)

**Overview:** Modern, developer-friendly log management with excellent free tier.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free: 1GB/month, 3-day retention; Pro: $0.25/GB |
| **Setup** | Very easy - simple SDK integration |
| **Query** | SQL-like query language |
| **Retention** | 3 days (free) to unlimited (paid) |
| **Alerting** | Built-in with Slack/email/webhook |

**Pros:**
- Generous free tier perfect for personal projects
- Native Netlify integration
- Clean, modern UI
- Fast query performance

**Cons:**
- Limited free retention
- Less mature than Datadog

**Integration:**

```typescript
// Frontend integration
import { Logtail } from '@logtail/browser';

const logtail = new Logtail(process.env.VITE_LOGTAIL_TOKEN);

// Replace console methods
logtail.info('User logged in', { userId: '123' });
logtail.error('API call failed', { endpoint: '/api/users' });
```

#### 2. Axiom

**Overview:** High-performance log aggregation with unlimited cardinality.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free: 500GB ingest, 30-day retention; Pro: $25/month base |
| **Setup** | Easy - native integrations |
| **Query** | APL (Axiom Processing Language) |
| **Retention** | 30 days (free), longer on paid |
| **Alerting** | Built-in monitors |

**Pros:**
- Extremely generous free tier (500GB!)
- 30-day retention on free
- Great query language
- Native Vercel/Netlify support

**Cons:**
- Newer platform, less battle-tested
- APL learning curve

**Integration:**

```typescript
// Frontend integration
import { Client } from '@axiomhq/js';

const axiom = new Client({
  token: process.env.VITE_AXIOM_TOKEN,
  dataset: 'mejohnc-org',
});

await axiom.ingest('logs', {
  level: 'info',
  message: 'User action',
  ...metadata,
});
```

#### 3. Datadog

**Overview:** Enterprise-grade observability platform.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free trial; $0.10/GB ingested + retention fees |
| **Setup** | Moderate - requires agent or SDK |
| **Query** | Powerful faceted search |
| **Retention** | 15 days (included), extended at cost |
| **Alerting** | Comprehensive alerting system |

**Pros:**
- Industry standard, feature-rich
- APM, traces, metrics in one platform
- Excellent documentation
- Native Netlify log drain

**Cons:**
- Expensive for personal projects
- Can be complex to configure

**Integration:**

```typescript
// Browser logs SDK
import { datadogLogs } from '@datadog/browser-logs';

datadogLogs.init({
  clientToken: process.env.VITE_DD_CLIENT_TOKEN,
  site: 'datadoghq.com',
  forwardErrorsToLogs: true,
  sessionSampleRate: 100,
});

datadogLogs.logger.info('Application loaded');
```

#### 4. Papertrail

**Overview:** Simple, established log management solution.

| Aspect | Details |
|--------|---------|
| **Pricing** | Free: 50MB/month; Plans from $7/month |
| **Setup** | Easy - syslog or HTTP |
| **Query** | Full-text search |
| **Retention** | 7 days (free), up to 1 year |
| **Alerting** | Email and webhook alerts |

**Pros:**
- Simple and reliable
- Real-time tail view
- Good for syslog-based systems

**Cons:**
- Less feature-rich than alternatives
- Limited free tier
- Older UI

### Recommendation

**For MeJohnC.Org, I recommend Axiom as the primary log aggregation solution.**

**Rationale:**

1. **Generous Free Tier**: 500GB/month ingest with 30-day retention covers personal project needs
2. **Modern Architecture**: Built for high-cardinality data (good for correlation IDs)
3. **Easy Integration**: Native support for serverless and edge platforms
4. **Cost-Effective**: Only pay if exceeding generous limits
5. **Query Power**: APL provides sophisticated analysis capabilities

**Alternative Consideration:**

If tighter Sentry integration is preferred, consider **Logtail** which offers seamless integration with error tracking workflows.

---

## Log Format Standardization

### Standard Log Schema

All logs across the application should follow this schema:

```typescript
interface StandardLogEntry {
  // Required fields
  timestamp: string;          // ISO 8601 format
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;            // Human-readable message

  // Correlation
  correlationId: string;      // Request/session correlation ID
  requestId?: string;         // Unique request identifier

  // Source identification
  source: 'frontend' | 'netlify' | 'supabase' | 'clerk' | 'ghost';
  component?: string;         // Module/component name
  environment: 'development' | 'preview' | 'production';

  // Context
  userId?: string;            // Authenticated user ID
  sessionId?: string;         // Browser session ID

  // Request context (for API logs)
  method?: string;            // HTTP method
  path?: string;              // Request path
  statusCode?: number;        // Response status code
  duration?: number;          // Request duration in ms

  // Client context (for frontend logs)
  userAgent?: string;
  clientIp?: string;          // Anonymized/hashed
  url?: string;

  // Additional data
  metadata?: Record<string, unknown>;

  // Error details
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}
```

### JSON Format Examples

**Frontend Application Log:**

```json
{
  "timestamp": "2025-01-20T15:30:45.123Z",
  "level": "info",
  "message": "User navigated to dashboard",
  "correlationId": "m1abc12-xyz789",
  "source": "frontend",
  "component": "Dashboard",
  "environment": "production",
  "userId": "user_2abc123",
  "sessionId": "m1def34-uvw456",
  "url": "https://mejohnc.org/admin/dashboard",
  "metadata": {
    "previousPage": "/admin/projects",
    "loadTime": 234
  }
}
```

**API Request Log:**

```json
{
  "timestamp": "2025-01-20T15:30:46.456Z",
  "level": "info",
  "message": "Request completed",
  "correlationId": "m1abc12-xyz789",
  "requestId": "m1ghi56-rst012",
  "source": "supabase",
  "component": "metrics-sync",
  "environment": "production",
  "method": "POST",
  "path": "/functions/v1/metrics-sync",
  "statusCode": 200,
  "duration": 156,
  "userId": "user_2abc123",
  "clientIp": "hash:a1b2c3d4",
  "userAgent": "Mozilla/5.0 ..."
}
```

**Error Log:**

```json
{
  "timestamp": "2025-01-20T15:30:47.789Z",
  "level": "error",
  "message": "Failed to fetch projects",
  "correlationId": "m1abc12-xyz789",
  "source": "frontend",
  "component": "ProjectsList",
  "environment": "production",
  "userId": "user_2abc123",
  "error": {
    "name": "FetchError",
    "message": "Network request failed",
    "stack": "FetchError: Network request failed\n    at fetchProjects (projects.ts:45)\n    ...",
    "code": "NETWORK_ERROR"
  },
  "metadata": {
    "endpoint": "/rest/v1/projects",
    "retryCount": 3
  }
}
```

### Field Naming Conventions

| Convention | Example | Usage |
|------------|---------|-------|
| camelCase | `correlationId` | All field names |
| ISO 8601 | `2025-01-20T15:30:45.123Z` | Timestamps |
| Lowercase | `info`, `error` | Enum values |
| Prefixed | `hash:`, `user_` | Sensitive/typed values |

---

## Structured Logging Best Practices

### 1. Always Include Context

```typescript
// Bad - no context
logger.info('Operation completed');

// Good - includes relevant context
logger.info('Project created successfully', {
  projectId: project.id,
  projectName: project.name,
  duration: endTime - startTime,
});
```

### 2. Use Appropriate Log Levels

```typescript
// Debug: Detailed diagnostic information
logger.debug('Entering function with params', { params });

// Info: Normal application flow
logger.info('User logged in', { userId });

// Warn: Unexpected but handled situations
logger.warn('Rate limit approaching', { remaining: 5 });

// Error: Failures requiring attention
logger.error('Database connection failed', error, { retryCount: 3 });
```

### 3. Propagate Correlation IDs

```typescript
// Start of request
const correlationId = getCorrelationId(request.headers);

// Pass to child operations
const childLogger = logger.child({ correlationId, component: 'UserService' });
childLogger.info('Fetching user data');

// Include in API calls
fetch('/api/data', {
  headers: {
    'X-Correlation-ID': correlationId,
  },
});

// Include in responses
return new Response(body, {
  headers: {
    'X-Correlation-ID': correlationId,
  },
});
```

### 4. Log at Boundaries

Log at system boundaries (entry/exit points):

```typescript
// API endpoint entry
logger.info('API request received', {
  method: req.method,
  path: req.url,
  correlationId,
});

// Database query
logger.debug('Executing query', { query: 'SELECT * FROM users', params });

// External API call
logger.info('Calling external service', { service: 'ghost', endpoint: '/posts' });

// API response
logger.info('API response sent', {
  statusCode: response.status,
  duration: Date.now() - startTime,
});
```

### 5. Structure Errors Properly

```typescript
// Bad - loses error details
logger.error(`Error: ${error.message}`);

// Good - preserves full error context
logger.error('Operation failed', error, {
  operation: 'createProject',
  input: sanitizeInput(input),
  userId,
});

// The error parameter should be the actual Error object
// The logger will extract name, message, and stack
```

### 6. Use Timed Operations

```typescript
// Measure and log operation duration
const result = await logger.time(
  'fetch-user-projects',
  async () => {
    return await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
  },
  { userId, limit: 50 }
);
```

### 7. Avoid Logging Sensitive Data

```typescript
// Bad - logs PII
logger.info('User registered', { email, password, ssn });

// Good - sanitized
logger.info('User registered', {
  email: maskEmail(email),  // j***n@example.com
  hasPassword: !!password,
  // Don't log SSN at all
});
```

---

## Log Levels and Usage

### Level Definitions

| Level | Value | Description | Production Enabled |
|-------|-------|-------------|-------------------|
| `debug` | 0 | Detailed debugging information | No |
| `info` | 1 | Normal application operations | Yes |
| `warn` | 2 | Unexpected but handled situations | Yes |
| `error` | 3 | Failures requiring attention | Yes |

### When to Use Each Level

#### DEBUG

Use for detailed diagnostic information useful during development:

```typescript
// Function entry/exit with detailed params
logger.debug('Entering parseBookmarks', { rawData: data.substring(0, 100) });

// Intermediate calculation steps
logger.debug('Calculated pagination', { page, offset, limit });

// Cache operations
logger.debug('Cache miss', { key: cacheKey });

// State transitions
logger.debug('Component state updated', { prevState, nextState });
```

**Note:** Debug logs are disabled in production by default.

#### INFO

Use for normal, significant operations:

```typescript
// User actions
logger.info('User signed in', { userId, method: 'oauth' });
logger.info('Project created', { projectId, projectName });

// Business operations
logger.info('Email campaign sent', { campaignId, recipientCount: 150 });

// System events
logger.info('Application started', { version: '3.0.0', environment: 'production' });

// API request completion
logger.info('Request completed', { path: '/api/projects', statusCode: 200, duration: 45 });
```

#### WARN

Use for unexpected situations that were handled gracefully:

```typescript
// Approaching limits
logger.warn('Rate limit threshold reached', { remaining: 10, limit: 100 });
logger.warn('Database connection pool low', { available: 2, total: 10 });

// Deprecated usage
logger.warn('Deprecated API endpoint called', { endpoint: '/v1/users', suggestUse: '/v2/users' });

// Recoverable errors
logger.warn('Primary cache unavailable, using fallback', { error: cacheError.message });

// Configuration issues
logger.warn('Optional feature disabled', { feature: 'analytics', reason: 'missing API key' });

// Retries
logger.warn('Request failed, retrying', { attempt: 2, maxAttempts: 3, error: error.message });
```

#### ERROR

Use for failures that need attention or investigation:

```typescript
// Unhandled exceptions
logger.error('Unhandled exception in request handler', error, { path: '/api/users' });

// Business logic failures
logger.error('Payment processing failed', paymentError, { orderId, amount });

// External service failures
logger.error('Supabase query failed', dbError, { query: 'projects.select', retries: 3 });

// Data integrity issues
logger.error('Data validation failed', validationError, { field: 'email', value: '[redacted]' });

// Security events
logger.error('Authentication failed - suspicious activity', null, {
  ip: clientIp,
  attempts: failedAttempts,
  lockoutTriggered: true,
});
```

### Level Configuration by Environment

```typescript
// src/lib/logger.ts
private minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info';

// For production debugging, can be overridden:
// VITE_LOG_LEVEL=debug in environment
```

---

## Sensitive Data Handling

### PII Categories

| Category | Examples | Handling |
|----------|----------|----------|
| Direct Identifiers | Email, phone, name | Mask or exclude |
| Indirect Identifiers | IP address, user agent | Hash or anonymize |
| Authentication | Passwords, tokens, API keys | Never log |
| Financial | Credit cards, bank accounts | Never log |
| Health/Personal | Medical info, SSN | Never log |

### Masking Functions

```typescript
/**
 * Mask email address for logging
 * john.doe@example.com -> j***e@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';

  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 * +1-555-123-4567 -> +1-***-***-4567
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Hash IP address for correlation without exposing
 */
function hashIp(ip: string): string {
  // Simple hash for logging purposes
  const hash = ip.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `ip:${Math.abs(hash).toString(16).slice(0, 8)}`;
}

/**
 * Redact sensitive fields from objects
 */
function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey', 'authorization']
): T {
  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field as keyof T] = '[REDACTED]' as T[keyof T];
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeForLogging(
        value as Record<string, unknown>,
        sensitiveFields
      ) as T[keyof T];
    }
  }

  return sanitized;
}
```

### Automatic PII Redaction

Configure the log aggregation platform to redact patterns:

```yaml
# Axiom redaction rules (example)
redaction_rules:
  - name: email
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    replacement: '[EMAIL_REDACTED]'

  - name: credit_card
    pattern: '\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'
    replacement: '[CC_REDACTED]'

  - name: api_key
    pattern: '(api[_-]?key|apikey)["\s:=]+["\']?[\w-]{20,}["\']?'
    replacement: '[API_KEY_REDACTED]'
    flags: 'i'

  - name: bearer_token
    pattern: 'Bearer\s+[\w-]+\.[\w-]+\.[\w-]+'
    replacement: 'Bearer [TOKEN_REDACTED]'
```

### Pre-Logging Validation

```typescript
// Add to logger output method
private validateEntry(entry: LogEntry): LogEntry {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /api[-_]?key/i,
    /authorization/i,
  ];

  // Warn if potentially sensitive data detected
  const entryStr = JSON.stringify(entry);
  for (const pattern of sensitivePatterns) {
    if (pattern.test(entryStr)) {
      console.warn(`[Logger] Potential sensitive data in log entry: ${entry.message}`);
    }
  }

  return entry;
}
```

---

## Log Retention Policies

### Retention by Log Type

| Log Type | Retention Period | Rationale |
|----------|------------------|-----------|
| Error Logs | 90 days | Debugging, incident analysis |
| Security/Audit Logs | 1 year | Compliance, forensics |
| API Request Logs | 30 days | Performance analysis |
| Debug Logs | 7 days | Short-term debugging |
| User Activity Logs | 30 days | GDPR compliance |

### Retention by Environment

| Environment | Default Retention | Notes |
|-------------|-------------------|-------|
| Production | 30-90 days | Based on log type |
| Preview/Staging | 7 days | Short-term testing |
| Development | 3 days | Local debugging |

### Platform-Specific Retention

| Platform | Native Retention | Extended Options |
|----------|------------------|------------------|
| Netlify Logs | 7 days | Log drain to aggregator |
| Supabase Logs | 7 days | Export via API |
| Axiom (Free) | 30 days | Pro: unlimited |
| Logtail (Free) | 3 days | Pro: 30+ days |
| Datadog | 15 days | Extended: 30-365 days |

### Implementing Retention Policies

```typescript
// Axiom dataset configuration
const DATASETS = {
  'mejohnc-errors': {
    retention: 90,  // days
    description: 'Application errors and exceptions',
  },
  'mejohnc-requests': {
    retention: 30,
    description: 'API request logs',
  },
  'mejohnc-audit': {
    retention: 365,
    description: 'Security and audit logs',
  },
  'mejohnc-debug': {
    retention: 7,
    description: 'Debug logs (non-production)',
  },
};

// Route logs to appropriate dataset
function getDataset(entry: LogEntry): string {
  if (entry.level === 'error') return 'mejohnc-errors';
  if (entry.component?.includes('auth') || entry.component?.includes('security')) {
    return 'mejohnc-audit';
  }
  if (entry.level === 'debug') return 'mejohnc-debug';
  return 'mejohnc-requests';
}
```

### Data Deletion Requests (GDPR)

```typescript
// Handle user data deletion requests
async function deleteUserLogs(userId: string): Promise<void> {
  // Most log aggregators don't support per-record deletion
  // Instead, ensure PII is masked/hashed at ingestion time

  // Document deletion request for audit
  logger.info('User data deletion requested', {
    userId: hashUserId(userId),
    requestedAt: new Date().toISOString(),
    action: 'logs-anonymized-at-ingestion',
  });
}
```

---

## Search and Analysis Patterns

### Common Query Patterns

#### Find Errors by Correlation ID

```sql
-- Axiom APL
['mejohnc-logs']
| where correlationId == "m1abc12-xyz789"
| sort by timestamp desc
```

```
-- Logtail SQL
SELECT * FROM logs
WHERE correlation_id = 'm1abc12-xyz789'
ORDER BY timestamp DESC
```

#### Error Rate Over Time

```sql
-- Axiom APL
['mejohnc-logs']
| where level == "error"
| summarize count() by bin(timestamp, 1h)
```

#### Slow Requests

```sql
-- Axiom APL
['mejohnc-logs']
| where duration > 1000
| project timestamp, path, duration, correlationId
| sort by duration desc
| take 100
```

#### User Activity Trail

```sql
-- Axiom APL
['mejohnc-logs']
| where userId == "user_2abc123"
| where timestamp > ago(24h)
| sort by timestamp asc
```

#### Error Distribution by Component

```sql
-- Axiom APL
['mejohnc-logs']
| where level == "error"
| summarize errorCount = count() by component
| sort by errorCount desc
```

#### Authentication Failures

```sql
-- Axiom APL
['mejohnc-logs']
| where source == "clerk" or component contains "auth"
| where level in ("warn", "error")
| where timestamp > ago(1h)
```

### Dashboard Queries

#### Real-Time Error Monitor

```sql
-- Errors in last 15 minutes
['mejohnc-logs']
| where timestamp > ago(15m)
| where level == "error"
| summarize
    errorCount = count(),
    uniqueErrors = dcount(error.message)
    by bin(timestamp, 1m)
```

#### API Performance Percentiles

```sql
-- p50, p95, p99 latency
['mejohnc-logs']
| where source in ("netlify", "supabase")
| where duration > 0
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by bin(timestamp, 5m)
```

#### Top Error Messages

```sql
['mejohnc-logs']
| where level == "error"
| where timestamp > ago(24h)
| summarize count = count() by error.message
| sort by count desc
| take 10
```

### Saved Searches

Create saved searches for common investigations:

| Name | Query Description | Alert |
|------|-------------------|-------|
| `critical-errors` | Error level logs in last hour | Yes |
| `auth-failures` | Authentication failures | Yes |
| `slow-requests` | Requests > 2s duration | Yes |
| `user-trace` | All logs for specific user | No |
| `deploy-impact` | Error spike after deploy | Yes |

---

## Log-Based Alerts

### Alert Configuration

#### Error Rate Spike

```yaml
# Axiom Monitor
name: "Error Rate Spike"
dataset: mejohnc-logs
query: |
  ['mejohnc-logs']
  | where level == "error"
  | summarize errorCount = count() by bin(timestamp, 5m)
threshold:
  operator: above
  value: 10
  for: 5m
notifications:
  - type: slack
    channel: "#mejohnc-alerts"
  - type: email
    recipients: ["alerts@mejohnc.org"]
severity: P2
runbook: "docs/runbooks/incident-response.md#error-spike"
```

#### Authentication Anomaly

```yaml
name: "Authentication Failure Spike"
dataset: mejohnc-logs
query: |
  ['mejohnc-logs']
  | where component contains "auth"
  | where level in ("warn", "error")
  | summarize failCount = count() by bin(timestamp, 10m)
threshold:
  operator: above
  value: 20
  for: 10m
notifications:
  - type: slack
    channel: "#incidents"
severity: P1
runbook: "docs/runbooks/incident-response.md#authentication-broken"
```

#### Slow API Response

```yaml
name: "API Latency Degradation"
dataset: mejohnc-logs
query: |
  ['mejohnc-logs']
  | where source in ("netlify", "supabase")
  | where duration > 0
  | summarize p95_latency = percentile(duration, 95) by bin(timestamp, 5m)
threshold:
  operator: above
  value: 2000  # 2 seconds
  for: 15m
notifications:
  - type: slack
    channel: "#mejohnc-alerts"
severity: P3
runbook: "docs/runbooks/incident-response.md#performance-degradation"
```

#### New Error Type Detection

```yaml
name: "New Error Type"
dataset: mejohnc-logs
query: |
  ['mejohnc-logs']
  | where level == "error"
  | where timestamp > ago(1h)
  | distinct error.name, error.message
  | join kind=leftanti (
      ['mejohnc-logs']
      | where level == "error"
      | where timestamp between(ago(24h) .. ago(1h))
      | distinct error.name, error.message
    ) on error.name, error.message
condition: "results > 0"
notifications:
  - type: slack
    channel: "#mejohnc-alerts"
severity: P3
```

### Alert Best Practices

1. **Include Context in Alerts:**
```
[P2] Error Rate Spike Detected

Error count: 45 (threshold: 10)
Time window: Last 5 minutes
Top errors:
  - FetchError: Network request failed (23)
  - DatabaseError: Connection timeout (12)

Correlation IDs: m1abc12, m1def34, m1ghi56

Runbook: https://github.com/.../incident-response.md#error-spike
Dashboard: https://app.axiom.co/mejohnc/dashboards/errors
```

2. **Prevent Alert Fatigue:**
   - Use appropriate time windows (5-15 min minimum)
   - Set meaningful thresholds based on baseline
   - Group related alerts
   - Implement alert suppression during maintenance

3. **Link to Runbooks:**
   - Every alert should reference a runbook
   - Include quick diagnostic steps in alert

---

## Integration Guide

### Axiom Integration (Recommended)

#### Step 1: Create Axiom Account

1. Sign up at [axiom.co](https://axiom.co)
2. Create organization: `mejohnc-org`
3. Create datasets:
   - `mejohnc-logs` (general logs)
   - `mejohnc-errors` (error logs)

#### Step 2: Get API Token

1. Settings > API Tokens > New Token
2. Permissions: Ingest + Query
3. Save token as `AXIOM_TOKEN`

#### Step 3: Frontend Integration

```typescript
// src/lib/axiom.ts
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({
  token: import.meta.env.VITE_AXIOM_TOKEN,
  orgId: 'mejohnc-org',
});

export async function sendToAxiom(entry: LogEntry): Promise<void> {
  if (!import.meta.env.VITE_AXIOM_TOKEN) return;

  try {
    await axiom.ingest('mejohnc-logs', [{
      _time: entry.timestamp,
      ...entry,
      source: 'frontend',
      environment: import.meta.env.MODE,
    }]);
  } catch (error) {
    // Fail silently - don't break app if logging fails
    console.error('Failed to send log to Axiom:', error);
  }
}

// Flush logs before page unload
window.addEventListener('beforeunload', () => {
  axiom.flush();
});
```

#### Step 4: Update Logger

```typescript
// src/lib/logger.ts - Add to output method
private output(entry: LogEntry): void {
  if (!this.shouldLog(entry.level)) return;

  // Existing console output...

  // Send to Axiom in production
  if (import.meta.env.PROD) {
    sendToAxiom(entry);
  }
}
```

#### Step 5: Supabase Functions

```typescript
// supabase/functions/_shared/axiom.ts
const AXIOM_TOKEN = Deno.env.get('AXIOM_TOKEN');
const AXIOM_ORG = 'mejohnc-org';

export async function sendToAxiom(entries: LogEntry[]): Promise<void> {
  if (!AXIOM_TOKEN) return;

  await fetch(`https://api.axiom.co/v1/datasets/mejohnc-logs/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AXIOM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entries.map(e => ({
      _time: e.timestamp,
      ...e,
      source: 'supabase',
    }))),
  });
}
```

#### Step 6: Netlify Log Drain

1. Go to Netlify Dashboard > Site Settings > Logs
2. Add log drain:
   - Destination: HTTP endpoint
   - URL: `https://api.axiom.co/v1/datasets/mejohnc-netlify/ingest`
   - Headers: `Authorization: Bearer ${AXIOM_TOKEN}`

#### Step 7: Environment Variables

```bash
# .env.local (development)
VITE_AXIOM_TOKEN=xaat-xxxxxxxx

# Netlify (production)
netlify env:set VITE_AXIOM_TOKEN "xaat-xxxxxxxx"
netlify env:set AXIOM_TOKEN "xaat-xxxxxxxx"

# Supabase
supabase secrets set AXIOM_TOKEN=xaat-xxxxxxxx
```

### Verification Checklist

- [ ] Axiom account created with datasets
- [ ] API token generated and stored
- [ ] Frontend logging sending to Axiom
- [ ] Supabase functions logging configured
- [ ] Netlify log drain configured
- [ ] Test logs appearing in Axiom dashboard
- [ ] Alerts configured for critical conditions
- [ ] Dashboard created for monitoring

---

## Cost Considerations

### Free Tier Comparison

| Solution | Free Ingest | Free Retention | Ideal For |
|----------|-------------|----------------|-----------|
| Axiom | 500 GB/month | 30 days | Best overall value |
| Logtail | 1 GB/month | 3 days | Sentry integration |
| Datadog | Trial only | 15 days | Enterprise needs |
| Papertrail | 50 MB/month | 7 days | Simple needs |

### Estimated Log Volume for MeJohnC.Org

| Source | Estimated Daily Volume | Monthly Volume |
|--------|------------------------|----------------|
| Frontend (1K pageviews) | ~10 MB | ~300 MB |
| Netlify Functions | ~5 MB | ~150 MB |
| Supabase Functions | ~5 MB | ~150 MB |
| **Total** | ~20 MB | ~600 MB |

**Conclusion:** Axiom's 500GB free tier is more than sufficient (estimated usage: 0.6GB/month).

### Cost Optimization Strategies

1. **Sample Non-Critical Logs:**
```typescript
// Only log 10% of routine events in production
if (Math.random() < 0.1 || entry.level === 'error') {
  sendToAggregator(entry);
}
```

2. **Reduce Verbose Debug Logging:**
```typescript
// Disable debug in production
private minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info';
```

3. **Batch Log Sends:**
```typescript
// Batch logs for efficiency
const logBuffer: LogEntry[] = [];

function queueLog(entry: LogEntry): void {
  logBuffer.push(entry);

  if (logBuffer.length >= 10) {
    flushLogs();
  }
}

async function flushLogs(): Promise<void> {
  const entries = logBuffer.splice(0);
  if (entries.length === 0) return;

  await axiom.ingest('mejohnc-logs', entries);
}

// Flush on page unload or every 30 seconds
setInterval(flushLogs, 30000);
window.addEventListener('beforeunload', flushLogs);
```

4. **Use Appropriate Retention:**
   - Error logs: 90 days
   - Request logs: 30 days
   - Debug logs: 7 days

### Budget Planning

| Tier | Monthly Cost | Features |
|------|--------------|----------|
| Free (Axiom) | $0 | 500GB, 30-day retention, basic alerts |
| Pro (Axiom) | $25+ | Unlimited retention, advanced features |
| Enterprise | Custom | SSO, compliance, dedicated support |

**Recommendation:** Start with Axiom free tier. Monitor usage monthly. Upgrade only if exceeding limits or needing advanced features.

---

## Appendix A: Change Log

| Date | Change | Issue |
|------|--------|-------|
| 2025-01-20 | Initial log aggregation document created | #69 |

---

## Appendix B: Related Documentation

- [SLOs and SLIs](./slos-slis.md) - Service level definitions
- [Alerting](./alerting.md) - Alert configuration guide
- [Secrets Management](../SECRETS_MANAGEMENT.md) - API key management
- [Incident Response](../runbooks/incident-response.md) - Incident procedures
- [Troubleshooting](../runbooks/troubleshooting.md) - Debug procedures

---

## Appendix C: Reference Links

- [Axiom Documentation](https://axiom.co/docs)
- [Logtail Documentation](https://betterstack.com/docs/logs)
- [Datadog Log Management](https://docs.datadoghq.com/logs/)
- [Structured Logging Best Practices](https://www.honeycomb.io/blog/structured-logging)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
