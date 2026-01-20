# Service Level Objectives (SLOs) and Service Level Indicators (SLIs)

This document defines the Service Level Objectives, Service Level Indicators, and error budget policies for MeJohnC.Org.

## Overview

MeJohnC.Org is a personal portfolio and admin platform built with React/Vite, deployed on Netlify, with Supabase as the backend database. Our SLOs are designed to ensure a high-quality user experience for both public visitors and admin users.

### Service Architecture

| Component | Technology | Monitoring |
|-----------|------------|------------|
| Frontend | React 18 + Vite | Sentry, Web Vitals |
| CDN/Hosting | Netlify | Netlify Analytics |
| Database | Supabase (PostgreSQL) | Supabase Dashboard |
| Auth | Clerk | Clerk Dashboard |
| CMS | Ghost | Ghost Admin |
| Analytics | Google Analytics 4 | GA4 Dashboard |

---

## Service Level Indicators (SLIs)

SLIs are the metrics we measure to determine if we're meeting our objectives.

### 1. Availability SLI

**Definition:** The proportion of valid requests that complete successfully.

```
Availability = (Total Requests - Error Requests) / Total Requests * 100
```

**Measurement Sources:**
- Netlify Edge Analytics (HTTP status codes)
- Sentry error tracking (JavaScript errors)
- Supabase API response codes

**What Counts as a Valid Request:**
- All HTTP requests to `mejohnc.org` domains
- Excludes health checks and synthetic monitoring
- Excludes requests blocked by security rules (WAF, rate limiting)

**What Counts as an Error:**
- HTTP 5xx responses
- HTTP 4xx responses (excluding 401, 403, 404 for expected auth/routing)
- JavaScript runtime errors captured by Sentry
- Database connection failures

### 2. Latency SLIs

**Definition:** Response time from request initiation to response completion.

**Frontend Latency (Real User Monitoring):**

| Metric | Description | Measurement |
|--------|-------------|-------------|
| LCP | Largest Contentful Paint | web-vitals library |
| FCP | First Contentful Paint | web-vitals library |
| TTFB | Time to First Byte | web-vitals library |
| INP | Interaction to Next Paint | web-vitals library |

**API Latency:**

| Metric | Description | Measurement |
|--------|-------------|-------------|
| Supabase Query Time | Database query execution | Supabase logs |
| Netlify Function Time | Serverless function execution | Netlify Analytics |
| Ghost API Time | CMS content fetching | Application logs |

### 3. Error Rate SLI

**Definition:** The proportion of requests that result in errors.

```
Error Rate = Error Requests / Total Requests * 100
```

**Error Categories:**
- **Critical Errors:** Unhandled exceptions, database failures, auth failures
- **Degraded Errors:** Slow responses (>5s), partial content failures
- **Client Errors:** Form validation failures, 404s (tracked but not counted against SLO)

### 4. Core Web Vitals SLI

Based on Google's Core Web Vitals thresholds (already implemented in `src/lib/web-vitals.ts`):

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| CLS | <= 0.1 | <= 0.25 | > 0.25 |
| LCP | <= 2.5s | <= 4.0s | > 4.0s |
| FCP | <= 1.8s | <= 3.0s | > 3.0s |
| INP | <= 200ms | <= 500ms | > 500ms |
| TTFB | <= 800ms | <= 1.8s | > 1.8s |

---

## Service Level Objectives (SLOs)

### Primary SLOs

#### 1. Availability SLO

| Tier | Target | Allowed Downtime (30 days) |
|------|--------|---------------------------|
| **Production** | 99.9% | 43.2 minutes |
| Deploy Preview | 99.5% | 3.6 hours |

**Measurement Window:** Rolling 30 days

**Exclusions:**
- Scheduled maintenance (announced 24h+ in advance)
- Netlify platform outages (outside our control)
- Supabase regional outages (outside our control)

#### 2. Latency SLOs

**Page Load Latency (Frontend):**

| Percentile | Target | Description |
|------------|--------|-------------|
| p50 | <= 1.5s | Median user experience |
| p95 | <= 3.0s | Most users |
| p99 | <= 5.0s | Edge cases |

**API Response Latency:**

| Percentile | Target | Description |
|------------|--------|-------------|
| p50 | <= 200ms | Median API response |
| p95 | <= 500ms | Most API calls |
| p99 | <= 1.0s | Complex queries |

**Time to First Byte (TTFB):**

| Percentile | Target |
|------------|--------|
| p50 | <= 400ms |
| p95 | <= 800ms |
| p99 | <= 1.5s |

#### 3. Error Rate SLO

| Type | Target | Measurement |
|------|--------|-------------|
| Server Errors (5xx) | < 0.1% | All requests |
| JavaScript Errors | < 1% | Page sessions |
| Failed Database Queries | < 0.5% | Supabase calls |

#### 4. Core Web Vitals SLO

| Metric | Target (Good Rating) |
|--------|---------------------|
| LCP | >= 75% of sessions |
| FCP | >= 75% of sessions |
| CLS | >= 75% of sessions |
| INP | >= 75% of sessions |

---

## Error Budgets

Error budgets represent the allowed amount of unreliability. When the budget is exhausted, the team must prioritize reliability work.

### Calculation

```
Error Budget = 1 - SLO Target
Monthly Error Budget (minutes) = 43,200 minutes * (1 - SLO)
```

### Error Budget Summary (30-day rolling window)

| SLO | Target | Error Budget | Allowed Failures |
|-----|--------|--------------|------------------|
| Availability | 99.9% | 0.1% | 43.2 minutes downtime |
| Error Rate | 99.9% | 0.1% | 1 error per 1000 requests |
| Latency p95 | 97% | 3% | 3% of requests > 3s |
| Core Web Vitals | 75% | 25% | 25% non-good ratings |

### Error Budget Consumption Tracking

Track error budget consumption using this formula:

```
Budget Consumed (%) = (Actual Errors / Allowed Errors) * 100
Budget Remaining = 100% - Budget Consumed
```

**Example:**
- SLO: 99.9% availability (43.2 min allowed downtime)
- Actual downtime: 15 minutes
- Budget consumed: (15 / 43.2) * 100 = 34.7%
- Budget remaining: 65.3%

### Burn Rate Monitoring

Burn rate indicates how fast the error budget is being consumed:

| Burn Rate | Interpretation | Alert Level |
|-----------|----------------|-------------|
| < 1x | Normal - budget lasts full window | None |
| 1-2x | Elevated - budget depletes early | Warning |
| 2-10x | High - significant issues | Critical |
| > 10x | Severe - major incident | Page On-Call |

**Burn Rate Formula:**
```
Burn Rate = (Error Rate / Error Budget) * Window
```

---

## Error Budget Policies

### Budget Remaining: 100% - 50% (Healthy)

**Actions:**
- Continue feature development normally
- Focus on preventive maintenance
- Deploy new features with standard testing

**Release Policy:**
- Normal release cadence
- Standard code review requirements

### Budget Remaining: 50% - 25% (Caution)

**Actions:**
- Review recent deployments for issues
- Increase monitoring frequency
- Add error budget to standup discussions

**Release Policy:**
- Extra testing for risky changes
- Consider delaying non-essential features
- Require senior review for database changes

### Budget Remaining: 25% - 0% (Critical)

**Actions:**
- Halt non-reliability feature work
- Conduct incident review for recent issues
- Create reliability improvement tickets

**Release Policy:**
- Only deploy bug fixes and reliability improvements
- Require explicit approval for any deployment
- Increase rollback readiness

### Budget Exhausted (0% or negative)

**Actions:**
- Immediate reliability freeze
- All hands on reliability improvements
- Executive notification required
- Post-incident review mandatory

**Release Policy:**
- No new features until budget recovered
- Emergency fixes only with VP approval
- Consider rollback of recent changes

---

## Alerting Thresholds

### Severity Levels

| Level | Response Time | Notification | Example |
|-------|---------------|--------------|---------|
| P1 - Critical | < 15 min | Page on-call | Site down, auth broken |
| P2 - High | < 1 hour | Slack + Email | API degraded, high error rate |
| P3 - Medium | < 4 hours | Slack | Elevated latency, partial feature failure |
| P4 - Low | < 24 hours | Daily digest | Minor errors, slow queries |

### Alert Configuration

#### Availability Alerts

```yaml
# P1: Complete outage
- condition: availability < 95%
  duration: 5 minutes
  severity: P1
  action: page-oncall
  message: "Site availability critically degraded"

# P2: Significant degradation
- condition: availability < 99%
  duration: 10 minutes
  severity: P2
  action: slack-urgent
  message: "Site availability below SLO threshold"

# P3: Minor degradation
- condition: availability < 99.5%
  duration: 30 minutes
  severity: P3
  action: slack-alerts
  message: "Site availability slightly degraded"
```

#### Latency Alerts

```yaml
# P2: High latency affecting most users
- condition: p95_latency > 5000ms
  duration: 10 minutes
  severity: P2
  action: slack-urgent
  message: "Page load latency exceeds 5s at p95"

# P3: Elevated latency
- condition: p95_latency > 3000ms
  duration: 15 minutes
  severity: P3
  action: slack-alerts
  message: "Page load latency exceeds SLO (3s at p95)"

# P4: Latency trending up
- condition: p50_latency > 2000ms
  duration: 30 minutes
  severity: P4
  action: daily-digest
  message: "Median latency elevated"
```

#### Error Rate Alerts

```yaml
# P1: High error rate
- condition: error_rate > 5%
  duration: 5 minutes
  severity: P1
  action: page-oncall
  message: "Error rate critically high"

# P2: Elevated errors
- condition: error_rate > 1%
  duration: 10 minutes
  severity: P2
  action: slack-urgent
  message: "Error rate above threshold"

# P3: Errors trending up
- condition: error_rate > 0.5%
  duration: 30 minutes
  severity: P3
  action: slack-alerts
  message: "Error rate elevated above baseline"
```

#### Error Budget Alerts

```yaml
# P2: Budget consumption high
- condition: burn_rate > 5x
  duration: 1 hour
  severity: P2
  action: slack-urgent
  message: "Error budget burning 5x faster than sustainable"

# P3: Budget consumption elevated
- condition: burn_rate > 2x
  duration: 4 hours
  severity: P3
  action: slack-alerts
  message: "Error budget burn rate elevated"

# P4: Budget running low
- condition: budget_remaining < 25%
  duration: daily
  severity: P4
  action: daily-digest
  message: "Error budget below 25% for the month"
```

### Sentry Alert Configuration

Configure these alerts in Sentry (already integrated):

| Alert | Condition | Threshold |
|-------|-----------|-----------|
| High Error Volume | Events per hour | > 100 |
| New Error Type | First occurrence | Immediate |
| Error Spike | 200% increase | 15 min window |
| Critical Path Error | Tag: critical=true | Immediate |

---

## Implementation Checklist

### Current Monitoring (Already Implemented)

- [x] Sentry error tracking (`src/lib/sentry.ts`)
- [x] Web Vitals collection (`src/lib/web-vitals.ts`)
- [x] Google Analytics 4 (`src/lib/analytics.ts`)
- [x] Netlify Analytics (automatic)
- [x] Supabase dashboard metrics

### Recommended Additions

- [ ] Create Sentry alerts based on thresholds above
- [ ] Set up Netlify webhook notifications for deploy failures
- [ ] Configure Supabase usage alerts
- [ ] Create monthly SLO review calendar event
- [ ] Build internal dashboard for error budget visualization
- [ ] Set up synthetic monitoring (Checkly, Uptime Robot, or similar)

### SLO Review Schedule

| Frequency | Activity |
|-----------|----------|
| Daily | Check Sentry for new errors |
| Weekly | Review error budget burn rate |
| Monthly | Full SLO review, adjust thresholds if needed |
| Quarterly | SLO target review, update documentation |

---

## Appendix A: SLI Data Sources

### Web Vitals Collection

The application already collects Core Web Vitals via `src/lib/web-vitals.ts`:

```typescript
// Current implementation reports to:
// - Console (development)
// - Google Analytics 4 (production, with consent)
// - Sentry (production, if configured)
```

### Recommended Dashboard Queries

**Supabase - Query Performance:**
```sql
SELECT
  query,
  calls,
  total_time / calls as avg_time_ms,
  rows / calls as avg_rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

**Error Budget Calculation (Monthly):**
```sql
-- Example for tracking availability
WITH metrics AS (
  SELECT
    COUNT(*) as total_requests,
    SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as errors
  FROM request_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  (total_requests - errors)::float / total_requests * 100 as availability,
  99.9 - ((total_requests - errors)::float / total_requests * 100) as budget_used
FROM metrics;
```

---

## Appendix B: Incident Response

### On-Call Rotation

For a personal portfolio site, formal on-call may not be necessary, but establish:

1. **Primary Contact:** Site owner (mejohnc)
2. **Notification Method:** Email + Slack (if configured)
3. **Response Expectations:** Best effort during business hours

### Incident Severity Matrix

| Impact | Duration < 15 min | Duration 15-60 min | Duration > 1 hour |
|--------|-------------------|--------------------|-------------------|
| Site Down | P2 | P1 | P1 |
| Feature Broken | P3 | P2 | P2 |
| Degraded Performance | P4 | P3 | P3 |
| Minor Issue | P4 | P4 | P4 |

### Post-Incident Review

For P1/P2 incidents, document:

1. **Timeline:** When did it start/end?
2. **Impact:** What was affected? How many users?
3. **Root Cause:** Why did it happen?
4. **Resolution:** How was it fixed?
5. **Prevention:** What will prevent recurrence?

---

## Appendix C: SLO Change Log

| Date | Change | Rationale |
|------|--------|-----------|
| 2025-01-20 | Initial SLO document created | Issue #71 |

---

## References

- [Google SRE Book - SLOs](https://sre.google/sre-book/service-level-objectives/)
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Netlify Analytics](https://docs.netlify.com/monitor-sites/analytics/)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
