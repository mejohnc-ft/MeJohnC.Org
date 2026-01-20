# Alerting System

This document defines the alerting strategy, configuration, and operational procedures for MeJohnC.Org.

---

## Table of Contents

1. [Alerting Philosophy](#alerting-philosophy)
2. [Alert Severity Levels](#alert-severity-levels)
3. [Alert Categories](#alert-categories)
4. [Notification Channels](#notification-channels)
5. [Alert Routing and Escalation](#alert-routing-and-escalation)
6. [On-Call Schedule](#on-call-schedule)
7. [Alert Fatigue Prevention](#alert-fatigue-prevention)
8. [Sample Configurations](#sample-configurations)
9. [Runbook Integration](#runbook-integration)

---

## Alerting Philosophy

### Core Principles

Our alerting strategy follows industry best practices from Google SRE and modern observability principles:

#### 1. Alert on Symptoms, Not Causes

**Do alert on:**
- Users cannot load the homepage (symptom)
- API response times exceed SLO thresholds (symptom)
- Error rate spikes above baseline (symptom)

**Do NOT alert on:**
- CPU usage is high (cause - may not affect users)
- Memory usage trending up (cause - may be normal behavior)
- Specific process restarted (cause - may be self-healing)

**Why:** Symptoms directly correlate with user impact. Causes may or may not affect users and often resolve automatically.

#### 2. Every Alert Must Be Actionable

Before creating an alert, answer these questions:

| Question | Required Answer |
|----------|-----------------|
| Can someone take action when this fires? | Yes |
| Is the action urgent? | Yes, within the response time window |
| Is this something a human needs to do? | Yes, cannot be automated |
| Does this require immediate attention? | Yes, for P1/P2; within hours for P3/P4 |

**If the answer to any is "No"**, do not create an alert. Instead:
- Log it for dashboards
- Add to daily/weekly reports
- Create automated remediation

#### 3. Tie Alerts to SLOs

Alerts should directly map to Service Level Objectives defined in [slos-slis.md](./slos-slis.md):

| SLO | Alert Trigger |
|-----|---------------|
| 99.9% Availability | Availability drops below 99% for 10 minutes |
| p95 Latency <= 3s | p95 latency exceeds 3s for 15 minutes |
| Error Rate < 0.1% | Error rate exceeds 1% for 10 minutes |
| 75% Good Web Vitals | Good rating drops below 50% for 1 hour |

#### 4. Reduce Noise, Increase Signal

- **Consolidate related alerts** into single notifications
- **Use appropriate time windows** to avoid flapping
- **Set meaningful thresholds** based on historical data
- **Review and tune regularly** based on alert outcomes

---

## Alert Severity Levels

### Severity Definitions

Severity levels are tied directly to SLO impact and required response times:

| Severity | SLO Impact | Response Time | Notification | Example |
|----------|------------|---------------|--------------|---------|
| **P1 - Critical** | Complete SLO breach | < 15 minutes | Page on-call immediately | Site down, 5xx errors > 5% |
| **P2 - High** | SLO at risk | < 1 hour | Slack + Email | API degraded, error rate > 1% |
| **P3 - Medium** | SLO marginally impacted | < 4 hours | Slack channel | Elevated latency, partial feature issues |
| **P4 - Low** | Informational | < 24 hours | Daily digest | Minor errors, slow queries, warnings |

### Severity Decision Matrix

```
Is the site/core feature completely unavailable?
├── Yes → P1 (Critical)
└── No → Is an SLO being breached?
    ├── Yes → Is it affecting > 50% of users?
    │   ├── Yes → P2 (High)
    │   └── No → P3 (Medium)
    └── No → P4 (Low)
```

### Error Budget Burn Rate to Severity Mapping

Based on error budget consumption rate from [slos-slis.md](./slos-slis.md):

| Burn Rate | Severity | Interpretation |
|-----------|----------|----------------|
| > 10x | P1 | Budget exhausted in < 3 days |
| 5x - 10x | P2 | Budget exhausted in 3-6 days |
| 2x - 5x | P3 | Budget exhausted in 6-15 days |
| 1x - 2x | P4 | Budget slightly elevated |
| < 1x | None | Normal operation |

---

## Alert Categories

### 1. Availability Alerts

Monitor service availability and uptime.

#### Configuration

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Site Down | Availability < 95% | 5 min | P1 |
| Availability Degraded | Availability < 99% | 10 min | P2 |
| Availability Warning | Availability < 99.5% | 30 min | P3 |

#### Error Rate Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Critical Error Rate | 5xx rate > 5% | 5 min | P1 |
| High Error Rate | 5xx rate > 1% | 10 min | P2 |
| Elevated Error Rate | 5xx rate > 0.5% | 30 min | P3 |
| Error Rate Warning | 5xx rate > 0.1% | 1 hour | P4 |

#### JavaScript Error Alerts

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| JS Error Spike | Error count > 100/hour | Immediate | P2 |
| New Critical Error | New error in critical path | Immediate | P2 |
| Error Rate Increase | 200% increase from baseline | 15 min | P3 |

### 2. Latency Alerts

Monitor response times against SLO thresholds.

#### Page Load Latency

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Critical Latency | p99 > 10s | 5 min | P1 |
| High Latency | p95 > 5s | 10 min | P2 |
| SLO Breach Latency | p95 > 3s | 15 min | P3 |
| Latency Warning | p50 > 2s | 30 min | P4 |

#### API Response Latency

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| API Timeout | p99 > 5s | 5 min | P1 |
| API Slow | p95 > 1s | 10 min | P2 |
| API SLO Warning | p95 > 500ms | 15 min | P3 |

#### TTFB (Time to First Byte)

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| TTFB Critical | p99 > 3s | 5 min | P2 |
| TTFB Elevated | p95 > 1.5s | 15 min | P3 |
| TTFB Warning | p95 > 800ms | 30 min | P4 |

### 3. Infrastructure Alerts

Monitor underlying infrastructure health.

#### Netlify

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Deploy Failed | Build/deploy failure | Immediate | P3 |
| Deploy Stuck | Deploy pending > 30 min | 30 min | P3 |
| Function Error | Edge function error rate > 5% | 5 min | P2 |
| Function Timeout | Function timeout rate > 1% | 10 min | P3 |
| Bandwidth Alert | Approaching plan limits | Daily | P4 |

#### Supabase

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Database Unreachable | Connection failures | 2 min | P1 |
| Query Timeout | Query time > 5s | 5 min | P2 |
| Connection Pool Exhausted | Available connections < 10% | 5 min | P2 |
| Slow Queries | Query time > 1s (avg) | 15 min | P3 |
| Storage Approaching Limit | > 80% of plan storage | Daily | P4 |
| Row Limit Warning | > 80% of plan row limit | Daily | P4 |

#### Clerk (Authentication)

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Auth Service Down | Clerk API unreachable | 2 min | P1 |
| Auth Error Spike | Auth failures > 10% | 5 min | P2 |
| Session Issues | Session validation failures > 5% | 10 min | P3 |
| MAU Limit Warning | > 80% of plan MAU | Daily | P4 |

### 4. Security Alerts

Monitor for suspicious activity and security issues.

#### Authentication Security

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Brute Force Detected | > 50 failed logins from single IP | 5 min | P1 |
| Account Lockout Spike | > 10 account lockouts | 15 min | P2 |
| Unusual Login Pattern | Login from new country/device | Immediate | P3 |
| Failed Auth Spike | Auth failures > 3x baseline | 10 min | P3 |

#### Rate Limiting

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| DDoS Potential | Rate limit hits > 1000/min | 1 min | P1 |
| Rate Limit Spike | Rate limit hits > 100/min | 5 min | P2 |
| Sustained Rate Limiting | Rate limit hits > 50/min | 15 min | P3 |

#### Data Security

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Unauthorized Data Access | RLS policy violation | Immediate | P1 |
| Unusual Data Export | Large data export detected | Immediate | P2 |
| Admin Action Spike | > 10 admin actions/hour | 15 min | P3 |

### 5. Error Budget Alerts

Monitor SLO error budget consumption.

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Budget Critical | Burn rate > 10x | 30 min | P1 |
| Budget High | Burn rate > 5x | 1 hour | P2 |
| Budget Elevated | Burn rate > 2x | 4 hours | P3 |
| Budget Low | Remaining < 25% | Daily | P4 |
| Budget Exhausted | Remaining = 0% | Immediate | P2 |

---

## Notification Channels

### Channel Configuration

| Channel | Use Case | Setup |
|---------|----------|-------|
| Email | All severities, audit trail | Primary notification method |
| Slack | P1-P3, team visibility | #alerts channel integration |
| PagerDuty | P1 only, after-hours | On-call rotation management |
| SMS | P1 backup | Secondary contact method |
| Dashboard | All, real-time visibility | Grafana/Sentry dashboards |

### Channel Setup

#### Email (Primary)

```
Primary: site-owner@mejohnc.org
Secondary: alerts@mejohnc.org
```

**Email routing:**
- P1: Immediate delivery to primary + secondary
- P2: Immediate delivery to primary
- P3: Batched every 30 minutes
- P4: Daily digest at 9:00 AM

#### Slack Integration

```yaml
# Slack webhook configuration
channels:
  critical: "#incidents"        # P1 alerts
  alerts: "#mejohnc-alerts"     # P2-P3 alerts
  daily: "#mejohnc-dev"         # P4 daily digest

webhook_urls:
  incidents: "https://hooks.slack.com/services/xxx/xxx/xxx"
  alerts: "https://hooks.slack.com/services/xxx/xxx/xxx"
```

**Slack message format:**
```
:rotating_light: [P1] Site Down - Availability below 95%

*Impact:* Users cannot access mejohnc.org
*Started:* 2025-01-20 14:32 UTC
*Duration:* 5 minutes
*Runbook:* docs/runbooks/incident-response.md#site-down

*Actions:*
- Check Netlify status
- Review recent deployments
- Check DNS resolution
```

#### PagerDuty (Placeholder)

```yaml
# PagerDuty configuration
service_key: "xxx-placeholder-xxx"
routing:
  P1:
    urgency: high
    escalation_policy: "MeJohnC Primary"
  P2:
    urgency: low
    escalation_policy: "MeJohnC Secondary"
```

#### SMS/Phone (Placeholder)

```yaml
# Twilio or similar for SMS alerts
account_sid: "xxx-placeholder-xxx"
auth_token: "xxx-placeholder-xxx"
from_number: "+1-555-xxx-xxxx"

contacts:
  primary:
    name: "Site Owner"
    phone: "+1-555-xxx-xxxx"
```

---

## Alert Routing and Escalation

### Routing Matrix

| Severity | Initial | 15 min | 30 min | 1 hour | 4 hours |
|----------|---------|--------|--------|--------|---------|
| P1 | On-call (Page) | Backup + Manager | Site Owner | External Support | - |
| P2 | On-call (Slack) | Backup | Site Owner | - | - |
| P3 | On-call (Slack) | - | - | - | Next business day |
| P4 | Daily Digest | - | - | - | Weekly review |

### Escalation Procedures

#### P1 Escalation

```
0 min   → Page primary on-call
         └─ If acknowledged → Continue incident response
         └─ If not acknowledged (15 min) → Escalate

15 min  → Page backup on-call + notify manager
         └─ If acknowledged → Continue incident response
         └─ If not acknowledged (15 min) → Escalate

30 min  → Call site owner directly
         └─ Continue incident response

1 hour  → Contact external support (Netlify/Supabase/Clerk)
         └─ Engage vendor support if infrastructure issue
```

#### P2 Escalation

```
0 min   → Slack notification to on-call
         └─ Expected response within 1 hour

1 hour  → If no response, page backup on-call
         └─ Expected response within 30 min

1.5 hr  → Notify site owner
         └─ Await guidance
```

### Auto-Resolution

Alerts should auto-resolve when the condition clears:

| Alert Type | Auto-resolve After |
|------------|-------------------|
| Availability | Availability > threshold for 5 min |
| Latency | Latency < threshold for 10 min |
| Error Rate | Error rate < threshold for 10 min |
| Security | Manual resolution required |

---

## On-Call Schedule

### Schedule Template

For a personal project, a simplified on-call rotation:

```yaml
# On-call rotation (example)
rotation_name: "MeJohnC Primary"
timezone: "America/New_York"
rotation_type: "weekly"

participants:
  - name: "Site Owner"
    email: "owner@mejohnc.org"
    phone: "+1-555-xxx-xxxx"
    role: "Primary"

schedule:
  # Simplified: Site owner is always on-call
  # For teams, add rotation logic
  default_assignee: "Site Owner"

  coverage:
    business_hours: "Mon-Fri 9:00-18:00"
    after_hours: "Best effort"
    weekends: "Best effort"

escalation:
  - level: 1
    delay_minutes: 15
    targets: ["Primary"]
  - level: 2
    delay_minutes: 30
    targets: ["Backup"]
```

### Business Hours vs After Hours

| Time Period | P1 Response | P2 Response | P3/P4 Response |
|-------------|-------------|-------------|----------------|
| Business Hours (9-6 M-F) | 15 min | 1 hour | 4 hours |
| After Hours (6PM-9AM) | 30 min | Next business day | Next business day |
| Weekends/Holidays | 1 hour | Next business day | Next business day |

### Holiday Schedule

```yaml
holidays:
  - name: "New Year's Day"
    date: "2025-01-01"
    coverage: "after_hours"
  - name: "Thanksgiving"
    date: "2025-11-27"
    coverage: "after_hours"
  # Add additional holidays as needed
```

---

## Alert Fatigue Prevention

### Strategies

#### 1. Threshold Tuning

Review and adjust thresholds quarterly based on:

| Metric | Action |
|--------|--------|
| False positive rate > 10% | Raise threshold or increase duration |
| Alert never fires | Lower threshold or remove |
| Alert fires constantly | Consider if it's actionable; adjust or remove |

#### 2. Alert Deduplication

Consolidate related alerts:

```yaml
# Instead of multiple alerts:
- "High CPU on server-1"
- "High memory on server-1"
- "Slow queries on server-1"

# Send consolidated alert:
- "Infrastructure degradation on server-1"
  details:
    - cpu: 95%
    - memory: 88%
    - slow_queries: 12
```

#### 3. Intelligent Grouping

Group alerts by:
- **Service**: All Supabase alerts together
- **Component**: All authentication alerts together
- **Root Cause**: Related symptoms grouped

#### 4. Snooze and Maintenance Windows

```yaml
# Maintenance window configuration
maintenance_windows:
  - name: "Weekly Deployment"
    schedule: "Wednesdays 14:00-15:00 UTC"
    suppress_alerts:
      - "Deploy Failed"
      - "Availability Warning"

  - name: "Database Maintenance"
    schedule: "First Sunday 02:00-04:00 UTC"
    suppress_alerts:
      - "Database Slow"
      - "Query Timeout"
```

#### 5. Alert Quality Metrics

Track and review monthly:

| Metric | Target | Action if Missed |
|--------|--------|------------------|
| Signal-to-noise ratio | > 90% | Review false positives |
| MTTA (Mean Time to Acknowledge) | < 5 min (P1) | Improve notification delivery |
| Actionable rate | 100% | Remove non-actionable alerts |
| Alerts per week | < 20 | Consolidate or remove |

#### 6. Regular Review Cadence

| Frequency | Review Activity |
|-----------|-----------------|
| Weekly | Review all P1/P2 alerts, identify patterns |
| Monthly | Review alert metrics, tune thresholds |
| Quarterly | Full alerting audit, remove stale alerts |

---

## Sample Configurations

### Sentry Alert Rules

Configure these alerts in Sentry Dashboard (Project Settings > Alerts):

#### High Error Volume

```yaml
# Sentry Alert Rule: High Error Volume
name: "High Error Volume"
conditions:
  - type: "event_frequency"
    value: 100
    interval: "1h"
actions:
  - type: "email"
    targetType: "Team"
  - type: "slack"
    workspace: "mejohnc"
    channel: "#mejohnc-alerts"
environment: "production"
action_match: "all"
frequency: 30  # minutes between alerts
```

#### New Error Type

```yaml
# Sentry Alert Rule: New Error Type
name: "New Error in Production"
conditions:
  - type: "first_seen_event"
filters:
  - type: "level"
    value: ["error", "fatal"]
actions:
  - type: "email"
    targetType: "Team"
  - type: "slack"
    workspace: "mejohnc"
    channel: "#mejohnc-alerts"
environment: "production"
```

#### Critical Path Error

```yaml
# Sentry Alert Rule: Critical Path Error
name: "Error in Critical Path"
conditions:
  - type: "event_attribute"
    attribute: "tags.critical"
    value: "true"
actions:
  - type: "email"
    targetType: "Team"
  - type: "slack"
    workspace: "mejohnc"
    channel: "#incidents"
  # Add PagerDuty when configured
environment: "production"
```

#### Error Spike Detection

```yaml
# Sentry Alert Rule: Error Spike
name: "Error Spike Detected"
conditions:
  - type: "event_frequency_percent"
    value: 200  # 200% increase
    interval: "15m"
    comparisonInterval: "1h"
actions:
  - type: "email"
    targetType: "Team"
  - type: "slack"
    workspace: "mejohnc"
    channel: "#mejohnc-alerts"
environment: "production"
```

#### Performance Regression

```yaml
# Sentry Alert Rule: Performance Regression
name: "LCP Regression"
conditions:
  - type: "performance_metric"
    metric: "lcp"
    threshold: 4000  # ms
    aggregation: "p95"
actions:
  - type: "slack"
    workspace: "mejohnc"
    channel: "#mejohnc-alerts"
environment: "production"
```

### Netlify Notifications

Configure in Netlify Dashboard (Site Settings > Build & Deploy > Deploy notifications):

#### Deploy Notifications

```yaml
# Netlify Deploy Notifications
notifications:
  - event: "deploy_failed"
    type: "email"
    recipients: ["owner@mejohnc.org"]

  - event: "deploy_failed"
    type: "slack"
    webhook_url: "https://hooks.slack.com/services/xxx/xxx/xxx"

  - event: "deploy_succeeded"
    type: "slack"
    webhook_url: "https://hooks.slack.com/services/xxx/xxx/xxx"
    # Only for production deploys
    branch: "main"
```

#### Webhook Configuration

```javascript
// netlify/functions/alert-webhook.ts
// Optional: Custom webhook handler for advanced alerting

import type { Handler } from "@netlify/functions";

interface NetlifyDeployPayload {
  id: string;
  site_id: string;
  build_id: string;
  state: string;
  error_message?: string;
  deploy_time?: number;
}

export const handler: Handler = async (event) => {
  const payload: NetlifyDeployPayload = JSON.parse(event.body || "{}");

  if (payload.state === "error") {
    // Send to alerting system
    await sendAlert({
      severity: "P3",
      title: "Netlify Deploy Failed",
      message: payload.error_message || "Unknown error",
      source: "netlify",
      metadata: {
        build_id: payload.build_id,
        site_id: payload.site_id,
      },
    });
  }

  return { statusCode: 200, body: "OK" };
};

async function sendAlert(alert: object): Promise<void> {
  // Implement your alerting logic here
  // e.g., send to Slack, PagerDuty, email, etc.
  console.log("Alert:", alert);
}
```

### Supabase Alerts

Configure using Supabase Dashboard or API:

#### Database Health Alerts

```sql
-- Create monitoring table for tracking (optional)
CREATE TABLE IF NOT EXISTS monitoring.alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Function to check connection pool health
CREATE OR REPLACE FUNCTION monitoring.check_connection_pool()
RETURNS TABLE (
  total_connections int,
  active_connections int,
  idle_connections int,
  available_percent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::int as total_connections,
    count(*) FILTER (WHERE state = 'active')::int as active_connections,
    count(*) FILTER (WHERE state = 'idle')::int as idle_connections,
    (count(*) FILTER (WHERE state = 'idle')::numeric / GREATEST(count(*), 1) * 100)::numeric(5,2) as available_percent
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify slow queries
CREATE OR REPLACE FUNCTION monitoring.get_slow_queries(threshold_ms int DEFAULT 1000)
RETURNS TABLE (
  query text,
  calls bigint,
  total_time_ms numeric,
  avg_time_ms numeric,
  max_time_ms numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pss.query::text,
    pss.calls,
    round(pss.total_exec_time::numeric, 2) as total_time_ms,
    round((pss.total_exec_time / pss.calls)::numeric, 2) as avg_time_ms,
    round(pss.max_exec_time::numeric, 2) as max_time_ms
  FROM pg_stat_statements pss
  WHERE (pss.total_exec_time / GREATEST(pss.calls, 1)) > threshold_ms
  ORDER BY pss.total_exec_time DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Edge Function for Health Checks

```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const startTime = Date.now();
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // Check database connectivity
  try {
    const { error } = await supabase.from("health_check").select("*").limit(1);
    health.checks.database = {
      status: error ? "unhealthy" : "healthy",
      latency_ms: Date.now() - startTime,
      error: error?.message,
    };
  } catch (e) {
    health.checks.database = {
      status: "unhealthy",
      error: (e as Error).message,
    };
    health.status = "unhealthy";
  }

  // Add more health checks as needed

  return new Response(JSON.stringify(health, null, 2), {
    status: health.status === "healthy" ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
});
```

### Synthetic Monitoring (Recommended)

Configure with Checkly, Uptime Robot, or similar:

#### Checkly Configuration

```javascript
// checkly.config.js (example)
const { defineConfig, Browser } = require("checkly");

module.exports = defineConfig({
  projectName: "MeJohnC.Org",
  logicalId: "mejohnc-org-monitoring",
  checks: {
    locations: ["us-east-1", "eu-west-1"],
    tags: ["production"],
    runtimeId: "2023.09",
    checkMatch: "**/*.check.ts",
    browserChecks: {
      frequency: 10, // minutes
    },
  },
  alertChannels: [
    {
      type: "email",
      address: "owner@mejohnc.org",
      sendFailure: true,
      sendRecovery: true,
      sendDegraded: true,
    },
    {
      type: "slack",
      webhookUrl: process.env.CHECKLY_SLACK_WEBHOOK,
      channel: "#mejohnc-alerts",
    },
  ],
});
```

#### Homepage Check

```typescript
// __checks__/homepage.check.ts
import { test, expect } from "@playwright/test";

test("Homepage loads successfully", async ({ page }) => {
  const response = await page.goto("https://mejohnc.org");

  // Check response status
  expect(response?.status()).toBeLessThan(400);

  // Check page title
  await expect(page).toHaveTitle(/MeJohnC/);

  // Check critical elements
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();

  // Check Web Vitals are acceptable
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1].startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
  });

  expect(lcp).toBeLessThan(4000); // 4 seconds
});
```

#### API Health Check

```typescript
// __checks__/api-health.check.ts
import { test, expect } from "@playwright/test";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

test("Supabase API is healthy", async ({ request }) => {
  // Test REST API
  const response = await request.get(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
    },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
});

test("Auth service is healthy", async ({ request }) => {
  const response = await request.get(`${SUPABASE_URL}/auth/v1/health`);
  expect(response.status()).toBe(200);
});
```

---

## Runbook Integration

### Alert to Runbook Mapping

Each alert should link to a specific runbook section:

| Alert Category | Runbook |
|----------------|---------|
| Site Down | [incident-response.md#site-down](../runbooks/incident-response.md#site-down-p1) |
| Authentication Issues | [incident-response.md#authentication-broken](../runbooks/incident-response.md#authentication-broken-p2) |
| Database Issues | [database-runbook.md](../runbooks/database-runbook.md) |
| Performance Issues | [incident-response.md#performance-degradation](../runbooks/incident-response.md#performance-degradation-p3) |
| Security Incidents | [incident-response.md#security-incident](../runbooks/incident-response.md#security-incident-p1) |
| Deploy Failures | [deployment-runbook.md](../runbooks/deployment-runbook.md) |

### Alert Message Template

All alerts should include:

```
[SEVERITY] Alert Title

Impact: What users are experiencing
Started: Timestamp
Duration: How long (if ongoing)
Runbook: Link to relevant runbook

Quick Actions:
1. First diagnostic step
2. Second diagnostic step
3. Escalation path if needed

Dashboards:
- Sentry: [link]
- Netlify: [link]
- Supabase: [link]
```

---

## Appendix A: Alert Inventory

### Current Alerts (To Be Configured)

| Alert Name | Category | Severity | Status |
|------------|----------|----------|--------|
| Site Availability < 95% | Availability | P1 | To Configure |
| Error Rate > 5% | Availability | P1 | To Configure |
| Page Load p95 > 5s | Latency | P2 | To Configure |
| High JS Error Volume | Errors | P2 | Sentry |
| New Error Type | Errors | P3 | Sentry |
| Deploy Failed | Infrastructure | P3 | Netlify |
| Auth Service Down | Security | P1 | To Configure |
| Brute Force Detected | Security | P1 | To Configure |
| Error Budget < 25% | Error Budget | P4 | To Configure |

### Alert Checklist for New Features

When adding a new feature, ensure:

- [ ] Availability monitoring added
- [ ] Error tracking in Sentry
- [ ] Latency baselines established
- [ ] Security events logged
- [ ] Runbook updated
- [ ] Alert thresholds documented

---

## Appendix B: Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-20 | Initial alerting document created | Issue #70 |

---

## References

- [slos-slis.md](./slos-slis.md) - Service Level Objectives
- [incident-response.md](../runbooks/incident-response.md) - Incident Response Runbook
- [deployment-runbook.md](../runbooks/deployment-runbook.md) - Deployment Procedures
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Credential Management
- [Google SRE Alerting](https://sre.google/sre-book/alerting/) - Alerting Best Practices
- [Sentry Alerts Documentation](https://docs.sentry.io/product/alerts/)
- [Netlify Notifications](https://docs.netlify.com/site-deploys/notifications/)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
