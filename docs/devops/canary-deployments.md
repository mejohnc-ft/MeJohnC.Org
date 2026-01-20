# Canary Deployments Guide

This document provides comprehensive guidance for implementing canary deployments for MeJohnC.Org, enabling safe, incremental rollouts of new features and changes.

**Related**: See [deployment-runbook.md](../runbooks/deployment-runbook.md) for general deployment procedures and [staging-environment.md](./staging-environment.md) for pre-production testing.

---

## Table of Contents

1. [Canary Deployment Overview](#canary-deployment-overview)
2. [Benefits of Canary Deployments](#benefits-of-canary-deployments)
3. [Canary Deployment Strategies for Netlify](#canary-deployment-strategies-for-netlify)
4. [Implementation Guide](#implementation-guide)
5. [Canary Metrics to Monitor](#canary-metrics-to-monitor)
6. [Rollback Procedures](#rollback-procedures)
7. [Feature Flags Integration](#feature-flags-integration)
8. [A/B Testing vs Canary Deployments](#ab-testing-vs-canary-deployments)
9. [Blue-Green vs Canary Comparison](#blue-green-vs-canary-comparison)
10. [Best Practices](#best-practices)
11. [Canary Deployment Checklist](#canary-deployment-checklist)
12. [Post-Canary Analysis Template](#post-canary-analysis-template)

---

## Canary Deployment Overview

### What is a Canary Deployment?

A canary deployment is a progressive rollout strategy where a new version of an application is gradually released to a small subset of users before rolling it out to the entire infrastructure. The term comes from the historical practice of using canaries in coal mines to detect toxic gases - if the canary was affected, miners knew to evacuate.

### How Canary Deployments Work

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Canary Deployment Flow                           │
└─────────────────────────────────────────────────────────────────────────┘

  Initial State          Canary Phase           Gradual Rollout        Full Rollout
  ───────────────        ────────────           ───────────────        ────────────

  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
  │   Stable    │        │   Stable    │        │   Stable    │        │    New      │
  │  Version    │        │  Version    │        │  Version    │        │  Version    │
  │   (100%)    │   ──>  │   (95%)     │   ──>  │   (50%)     │   ──>  │   (100%)    │
  └─────────────┘        ├─────────────┤        ├─────────────┤        └─────────────┘
                         │    New      │        │    New      │
                         │  Version    │        │  Version    │
                         │   (5%)      │        │   (50%)     │
                         └─────────────┘        └─────────────┘

  Metrics:               Metrics:               Metrics:               Metrics:
  - Baseline             - Compare canary       - Expand if            - Full monitoring
                           vs stable              metrics good         - Complete rollout
```

### Canary Deployment Lifecycle

1. **Deploy**: Release new version to small percentage of traffic
2. **Monitor**: Watch key metrics for the canary population
3. **Compare**: Analyze canary metrics against baseline/stable version
4. **Decide**: Based on metrics, either proceed or rollback
5. **Expand**: Gradually increase canary traffic percentage
6. **Complete**: Full rollout when confidence is high

---

## Benefits of Canary Deployments

### Risk Mitigation

| Benefit | Description |
|---------|-------------|
| **Limited Blast Radius** | If something goes wrong, only a small percentage of users are affected |
| **Early Detection** | Problems are caught early before affecting all users |
| **Real-World Validation** | Testing with real traffic patterns and user behavior |
| **Data-Driven Decisions** | Rollout decisions based on actual metrics, not assumptions |

### Operational Benefits

| Benefit | Description |
|---------|-------------|
| **Reduced Deployment Anxiety** | Confidence that issues will be caught early |
| **Faster Recovery** | Quick rollback affects fewer users |
| **Production Testing** | Validates changes in the actual production environment |
| **Progressive Confidence** | Build confidence as canary percentage increases |

### Business Benefits

| Benefit | Description |
|---------|-------------|
| **Improved User Experience** | Users are less likely to encounter broken features |
| **Faster Feature Delivery** | Confidence enables more frequent deployments |
| **Better Quality** | Real-world validation catches issues staging might miss |
| **Reduced Downtime** | Problems are contained before causing widespread outages |

### When to Use Canary Deployments

**Ideal for:**
- Major feature releases
- Infrastructure changes
- Database migration-related code changes
- Performance-sensitive updates
- Changes to critical user flows (authentication, checkout, etc.)
- Third-party integration updates

**May be overkill for:**
- Simple copy/text changes
- Minor CSS adjustments
- Documentation updates
- Small bug fixes with limited scope

---

## Canary Deployment Strategies for Netlify

MeJohnC.Org uses Netlify for hosting. Netlify provides several mechanisms for implementing canary-style deployments.

### Strategy 1: Split Testing (Recommended)

Netlify's Split Testing feature allows traffic distribution between branches.

#### How It Works

```
                          ┌────────────────────────┐
                          │   Incoming Traffic     │
                          │     (100%)             │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   Netlify Split Test   │
                          │   Traffic Router       │
                          └───────────┬────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
         ┌──────────▼──────────┐             ┌─────────▼───────────┐
         │   Main Branch       │             │   Canary Branch     │
         │   (Stable)          │             │   (New Version)     │
         │   95% traffic       │             │   5% traffic        │
         └─────────────────────┘             └─────────────────────┘
```

#### Configuration

Split testing is configured via the Netlify dashboard:

1. Navigate to **Site Settings** > **Split Testing**
2. Enable split testing
3. Select branches to include in the test
4. Set traffic percentages for each branch

#### Traffic Allocation Example

| Phase | Main Branch | Canary Branch | Duration |
|-------|-------------|---------------|----------|
| Initial | 95% | 5% | 2-4 hours |
| Expansion 1 | 80% | 20% | 4-8 hours |
| Expansion 2 | 50% | 50% | 8-24 hours |
| Full Rollout | 0% | 100% | Complete |

### Strategy 2: Branch Deploys

Use separate branch deployments for canary testing with manual traffic routing.

#### How It Works

```
GitHub Repository
       │
       ├─── main branch ────────> Production: mejohnc.org
       │
       └─── canary branch ──────> Canary: canary.mejohnc.org
                                         or
                                  canary--mejohnc.netlify.app
```

#### Configuration in `netlify.toml`

```toml
# Production context (main branch)
[context.production]
  environment = { NODE_ENV = "production" }

# Canary branch context
[context.canary]
  environment = { NODE_ENV = "production", CANARY = "true" }
```

#### Subdomain Setup

1. Create a `canary` branch
2. Configure custom subdomain: `canary.mejohnc.org`
3. Direct test users to canary subdomain
4. Monitor metrics separately

### Strategy 3: Deploy Previews

Use Netlify's automatic deploy previews for pre-release testing.

#### How It Works

Every pull request automatically gets a unique preview URL:
- Format: `deploy-preview-<PR#>--mejohnc.netlify.app`
- Isolated environment
- Automatic build and deploy

#### Use Cases

- Internal team testing before merge
- Stakeholder review of changes
- QA testing in production-like environment
- Documentation review

#### Limitations

- No percentage-based traffic splitting
- Requires sharing specific URLs
- Not suitable for true canary with real user traffic

### Strategy Comparison

| Feature | Split Testing | Branch Deploys | Deploy Previews |
|---------|---------------|----------------|-----------------|
| **Traffic Splitting** | Yes (%) | No (separate URLs) | No |
| **Real User Traffic** | Yes | No (opt-in only) | No |
| **Automatic** | Yes | Yes | Yes |
| **A/B Metrics** | Built-in | Manual | Manual |
| **Session Stickiness** | Yes | N/A | N/A |
| **Best For** | Canary releases | Beta testing | PR reviews |

---

## Implementation Guide

### Netlify Split Testing Configuration

#### Prerequisites

- Netlify Pro plan or higher (split testing requires paid plan)
- Two or more branches to split traffic between
- Understanding of the feature being released

#### Step 1: Create Canary Branch

```bash
# Create canary branch from main
git checkout main
git pull origin main
git checkout -b canary

# Push canary branch
git push origin canary
```

#### Step 2: Enable Split Testing in Netlify

1. **Access Netlify Dashboard**
   - Navigate to your site in app.netlify.com
   - Go to **Site settings** > **Split testing**

2. **Enable Split Testing**
   - Click "Activate split testing"
   - Accept the terms

3. **Configure Branches**
   - Select `main` as the primary branch
   - Add `canary` as a split testing branch

4. **Set Initial Traffic Allocation**
   - Main: 95%
   - Canary: 5%

5. **Save Configuration**

#### Step 3: Deploy New Version to Canary

```bash
# Ensure on canary branch
git checkout canary

# Merge or cherry-pick changes to test
git merge --no-ff origin/feature/new-feature

# Or cherry-pick specific commits
git cherry-pick <commit-hash>

# Push to trigger deploy
git push origin canary
```

#### Step 4: Verify Canary Deployment

```bash
# Check Netlify deploy status
netlify status

# Verify canary branch is deployed
curl -I https://mejohnc.org
# Look for x-nf-request-id header to identify deployment
```

### Traffic Percentage Allocation

#### Recommended Rollout Schedule

```
Time        Main    Canary    Action
─────────   ─────   ──────    ────────────────────────────────────
T+0         95%     5%        Initial canary release
T+2h        95%     5%        Monitor baseline metrics
T+4h        80%     20%       First expansion (if metrics good)
T+8h        80%     20%       Extended monitoring
T+12h       50%     50%       Significant expansion
T+24h       50%     50%       Full day monitoring
T+48h       20%     80%       Near-full rollout
T+72h       0%      100%      Complete rollout
```

#### Adjusting Traffic via Netlify CLI

```bash
# Note: Traffic adjustments are typically done via dashboard
# For automation, use Netlify API:

curl -X POST "https://api.netlify.com/api/v1/sites/{site_id}/traffic_splits" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branches": [{"branch": "main", "split": 80}, {"branch": "canary", "split": 20}]}'
```

### Gradual Rollout Process

#### Phase 1: Initial Canary (5%)

**Duration**: 2-4 hours

**Activities**:
1. Deploy to canary branch
2. Verify deployment successful
3. Establish baseline metrics
4. Monitor error rates closely
5. Check critical user flows

**Decision Criteria to Proceed**:
- Error rate delta < 0.1%
- No P1 issues reported
- Performance within acceptable range
- No critical alerts triggered

#### Phase 2: Early Expansion (20%)

**Duration**: 4-8 hours

**Activities**:
1. Increase canary traffic to 20%
2. Monitor for edge cases
3. Check long-running operations
4. Verify data consistency
5. Monitor user feedback channels

**Decision Criteria to Proceed**:
- Error rate stable
- Performance metrics stable
- No user complaints specific to new version
- Automated tests passing

#### Phase 3: Significant Expansion (50%)

**Duration**: 8-24 hours

**Activities**:
1. Increase to 50/50 split
2. Full business day monitoring
3. Performance comparison
4. User feedback analysis
5. Load testing comparison

**Decision Criteria to Proceed**:
- Sustained stability over business cycle
- No degradation in key metrics
- Support team reports no issues
- All automated checks passing

#### Phase 4: Near-Complete (80%)

**Duration**: 24-48 hours

**Activities**:
1. Increase canary to 80%
2. Minimal traffic to stable version
3. Final verification
4. Prepare for complete cutover
5. Document any issues

**Decision Criteria to Complete**:
- Metrics match or exceed baseline
- No outstanding issues
- Team consensus to proceed
- Rollback plan verified

#### Phase 5: Full Rollout (100%)

**Activities**:
1. Merge canary to main
2. Disable split testing
3. Delete or archive canary branch
4. Document release
5. Monitor for 24+ hours post-release

```bash
# Merge canary to main
git checkout main
git merge canary
git push origin main

# Delete canary branch
git branch -d canary
git push origin --delete canary

# Disable split testing in Netlify dashboard
```

---

## Canary Metrics to Monitor

### Error Rates Comparison

#### Key Error Metrics

| Metric | Description | Acceptable Delta |
|--------|-------------|------------------|
| **JavaScript Errors** | Client-side exceptions | < 0.1% increase |
| **API Error Rate** | 4xx/5xx responses | < 0.5% increase |
| **Failed Requests** | Network failures | < 0.1% increase |
| **Console Errors** | Browser console errors | < 5% increase |

#### Monitoring Tools

```javascript
// Example: Sentry error tracking for canary
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.CANARY ? 'canary' : 'production',
  release: import.meta.env.VITE_RELEASE_VERSION,
});
```

#### Error Rate Dashboard Query (Sentry)

```
# Compare error rates between deployments
environment:canary vs environment:production
timeframe: last 4 hours
group by: transaction
```

### Performance Metrics

#### Core Web Vitals

| Metric | Target | Acceptable Canary Range |
|--------|--------|-------------------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Within 10% of baseline |
| **FID** (First Input Delay) | < 100ms | Within 10% of baseline |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Within 0.05 of baseline |
| **TTFB** (Time to First Byte) | < 600ms | Within 15% of baseline |

#### Performance Monitoring

```javascript
// Report Core Web Vitals for canary comparison
import { getCLS, getFID, getLCP, getTTFB } from 'web-vitals';

const reportMetric = (metric) => {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    deployment: import.meta.env.CANARY ? 'canary' : 'stable',
  });

  navigator.sendBeacon('/api/metrics', body);
};

getCLS(reportMetric);
getFID(reportMetric);
getLCP(reportMetric);
getTTFB(reportMetric);
```

#### Netlify Analytics

Monitor via Netlify Analytics dashboard:
- Page load times
- Bandwidth usage
- Request volume by path
- Geographic distribution

### User Feedback

#### Feedback Channels to Monitor

| Channel | What to Look For | Action Threshold |
|---------|------------------|------------------|
| **Support Tickets** | New issue patterns | Any increase in specific errors |
| **Error Reports** | User-submitted bugs | Any new critical issues |
| **Social Mentions** | User complaints | Any widespread complaints |
| **Internal Feedback** | Team observations | Any concerning patterns |

#### Feedback Tracking

```typescript
// Track user feedback events
const trackFeedback = (type: 'positive' | 'negative', details: string) => {
  analytics.track('user_feedback', {
    type,
    details,
    deployment: import.meta.env.CANARY ? 'canary' : 'stable',
    timestamp: new Date().toISOString(),
  });
};
```

### Metrics Comparison Dashboard

Create a comparison view for canary vs stable:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Canary Deployment Dashboard                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Traffic Split:  Stable [████████████████████░░░░] 80%                 │
│                  Canary [████░░░░░░░░░░░░░░░░░░░░] 20%                 │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Error Rates (Last Hour)                                                │
│  ┌─────────────────┬─────────────────┬─────────────────┐               │
│  │     Metric      │     Stable      │     Canary      │               │
│  ├─────────────────┼─────────────────┼─────────────────┤               │
│  │ JS Errors       │     0.02%       │     0.03%  ⚠    │               │
│  │ API 5xx         │     0.01%       │     0.01%  ✓    │               │
│  │ Failed Requests │     0.05%       │     0.04%  ✓    │               │
│  └─────────────────┴─────────────────┴─────────────────┘               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Performance (P75)                                                      │
│  ┌─────────────────┬─────────────────┬─────────────────┐               │
│  │     Metric      │     Stable      │     Canary      │               │
│  ├─────────────────┼─────────────────┼─────────────────┤               │
│  │ LCP             │     1.8s        │     1.9s   ✓    │               │
│  │ FID             │     45ms        │     42ms   ✓    │               │
│  │ CLS             │     0.05        │     0.06   ✓    │               │
│  │ TTFB            │     320ms       │     315ms  ✓    │               │
│  └─────────────────┴─────────────────┴─────────────────┘               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Status: ✓ All metrics within acceptable range                          │
│  Recommendation: Safe to proceed with expansion                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Rollback Procedures

### Automatic Rollback Triggers

Configure automatic rollback based on metric thresholds.

#### Trigger Conditions

| Condition | Threshold | Action |
|-----------|-----------|--------|
| **Error Rate Spike** | > 1% increase | Reduce canary to 0% |
| **P1 Alert** | Any P1 alert | Immediate rollback |
| **Performance Degradation** | > 25% LCP increase | Reduce canary traffic |
| **Availability Drop** | < 99.5% success rate | Immediate rollback |

#### Automated Rollback Script

```bash
#!/bin/bash
# canary-rollback.sh - Emergency canary rollback

SITE_ID="your-netlify-site-id"
NETLIFY_TOKEN="your-token"

echo "Initiating canary rollback..."

# Set canary traffic to 0%
curl -X POST "https://api.netlify.com/api/v1/sites/${SITE_ID}/traffic_splits" \
  -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"branches": [{"branch": "main", "split": 100}, {"branch": "canary", "split": 0}]}'

echo "Canary traffic reduced to 0%"
echo "Verify at: https://app.netlify.com/sites/mejohnc/settings/deploys#split-testing"
```

### Manual Rollback Steps

#### Quick Rollback (Traffic Only)

**Time to Execute**: 1-2 minutes

1. **Access Netlify Dashboard**
   - Navigate to app.netlify.com
   - Select the site
   - Go to Site settings > Split testing

2. **Adjust Traffic Split**
   - Set main branch to 100%
   - Set canary branch to 0%
   - Save changes

3. **Verify Rollback**
   - Check site is serving stable version
   - Confirm canary traffic is 0%
   - Monitor for issues

#### Complete Rollback (Branch Reset)

**Time to Execute**: 5-10 minutes

1. **Disable Split Testing**
   - Dashboard > Site settings > Split testing
   - Click "Deactivate split testing"

2. **Reset Canary Branch**
   ```bash
   # Reset canary to match main
   git checkout canary
   git reset --hard origin/main
   git push origin canary --force
   ```

3. **Re-enable Split Testing** (if needed for future canaries)

4. **Document Rollback**
   - Note time and reason
   - Create incident ticket if applicable

#### Emergency Rollback via Netlify CLI

```bash
# Quick deploy of last known good version
netlify deploy:list --limit 10

# Find the last stable deployment ID and publish it
netlify deploy --prod --deploy-id=<STABLE_DEPLOY_ID>
```

### Rollback Decision Tree

```
                        ┌─────────────────────────────────────┐
                        │   Issue Detected During Canary      │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │   Severity Assessment               │
                        └──────────────────┬──────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
    ┌─────────▼─────────┐      ┌───────────▼───────────┐     ┌─────────▼─────────┐
    │  P1 - Critical    │      │  P2 - High            │     │  P3 - Medium      │
    │  Data loss/breach │      │  Feature broken       │     │  Minor bug        │
    └─────────┬─────────┘      └───────────┬───────────┘     └─────────┬─────────┘
              │                            │                            │
    ┌─────────▼─────────┐      ┌───────────▼───────────┐     ┌─────────▼─────────┐
    │  IMMEDIATE        │      │  Reduce to 0%         │     │  Continue at      │
    │  ROLLBACK         │      │  Investigate          │     │  current level    │
    │  All traffic      │      │  Decide within 1hr    │     │  Fix forward      │
    │  to stable        │      │                       │     │  if possible      │
    └───────────────────┘      └───────────────────────┘     └───────────────────┘
```

### Post-Rollback Actions

1. **Immediate**
   - Verify site is stable
   - Notify stakeholders
   - Create incident ticket

2. **Within 1 Hour**
   - Document timeline of events
   - Identify root cause
   - Assess user impact

3. **Within 24 Hours**
   - Complete incident report
   - Plan fix for issues
   - Schedule re-attempt (if applicable)

---

## Feature Flags Integration

MeJohnC.Org uses a feature flag system (`src/lib/feature-flags.ts`) that complements canary deployments.

### Combining Canary + Feature Flags

```
                    ┌─────────────────────────────────────────────────┐
                    │           Combined Deployment Strategy           │
                    └─────────────────────────────────────────────────┘

  Level 1: Traffic Routing (Netlify Split Testing)
  ┌───────────────────────────────────────────────────────────────────┐
  │                                                                   │
  │   All Users ──> [Split Test] ──> 95% Stable | 5% Canary          │
  │                                                                   │
  └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  Level 2: Feature Flags (Application Code)
  ┌───────────────────────────────────────────────────────────────────┐
  │                                                                   │
  │   Canary Users ──> [Feature Flag] ──> 50% New Feature | 50% Old  │
  │                                                                   │
  └───────────────────────────────────────────────────────────────────┘

  Result: New feature reaches only ~2.5% of all users initially
```

### Feature Flag Configuration for Canary

```typescript
// src/lib/feature-flags.ts - Canary-specific flags
const CANARY_FLAGS: Record<string, FeatureFlag> = {
  'canary.new-dashboard': {
    name: 'canary.new-dashboard',
    description: 'New dashboard design (canary testing)',
    enabled: false,
    rolloutPercentage: 50,  // 50% of canary traffic
    environments: ['production'],  // Only in production canary
    metadata: {
      canaryVersion: '2.0.0',
      startDate: '2026-01-20',
    },
  },

  'canary.api-v2': {
    name: 'canary.api-v2',
    description: 'API v2 endpoints (canary testing)',
    enabled: false,
    rolloutPercentage: 25,  // 25% of canary traffic
    environments: ['production'],
  },
};
```

### Using Feature Flags in Canary

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

function Dashboard() {
  const isCanary = import.meta.env.CANARY === 'true';

  // Check both canary deployment and feature flag
  const showNewDashboard = isCanary && isFeatureEnabled('canary.new-dashboard', {
    userId: user?.id,
    environment: 'production',
  });

  return showNewDashboard ? <NewDashboard /> : <LegacyDashboard />;
}
```

### Benefits of Combined Approach

| Benefit | Description |
|---------|-------------|
| **Granular Control** | Multiple layers of traffic control |
| **Quick Kill Switch** | Disable feature flag without redeployment |
| **User Targeting** | Enable for specific users within canary |
| **Percentage Stacking** | 5% canary * 50% flag = 2.5% exposure |
| **Independent Rollback** | Rollback feature without rolling back deployment |

### Feature Flag Rollout Strategy

1. **Phase 1**: Deploy to canary with flag disabled
2. **Phase 2**: Enable flag for 10% of canary users
3. **Phase 3**: Expand flag to 50% of canary users
4. **Phase 4**: Enable flag for all canary users
5. **Phase 5**: Merge canary to main, flag still controls exposure
6. **Phase 6**: Gradually expand flag for all production users
7. **Phase 7**: Remove flag, feature is now default

---

## A/B Testing vs Canary Deployments

### Key Differences

| Aspect | A/B Testing | Canary Deployment |
|--------|-------------|-------------------|
| **Primary Goal** | Compare feature variants | Validate deployment safety |
| **Duration** | Days to weeks | Hours to days |
| **User Assignment** | Random, persistent | Random, session-based |
| **Metrics Focus** | Conversion, engagement | Errors, performance |
| **Traffic Split** | Often 50/50 | Starts very small (1-5%) |
| **Rollback Trigger** | Low conversion | Errors/performance issues |

### When to Use Each

#### Use A/B Testing When:

- Testing different UI designs
- Comparing feature variants
- Measuring user engagement
- Optimizing conversion rates
- Validating product hypotheses

```
A/B Test Example: Button Color
┌─────────────────┐    ┌─────────────────┐
│   Variant A     │    │   Variant B     │
│   [Blue CTA]    │    │   [Green CTA]   │
│   50% traffic   │    │   50% traffic   │
└─────────────────┘    └─────────────────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────▼──────────┐
         │  Compare Metrics:   │
         │  - Click rate       │
         │  - Conversion       │
         │  - Engagement       │
         └─────────────────────┘
```

#### Use Canary Deployment When:

- Releasing new code versions
- Deploying infrastructure changes
- Rolling out bug fixes
- Updating dependencies
- Any change that could break functionality

```
Canary Example: New Checkout Flow
┌─────────────────┐    ┌─────────────────┐
│   Stable        │    │   Canary        │
│   Current code  │    │   New checkout  │
│   95% traffic   │    │   5% traffic    │
└─────────────────┘    └─────────────────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────▼──────────┐
         │  Compare Metrics:   │
         │  - Error rates      │
         │  - Performance      │
         │  - Success rates    │
         └─────────────────────┘
```

### Combined Strategy

Use both for maximum safety and optimization:

```
                    ┌─────────────────────────────────────────────┐
                    │         Combined A/B + Canary               │
                    └─────────────────────────────────────────────┘

  Stage 1: Canary deployment of code containing A/B test
  ┌───────────────────────────────────────────────────────────────┐
  │   All Traffic ──> [Canary Split] ──> 95% Stable | 5% Canary   │
  └───────────────────────────────────────────────────────────────┘

  Stage 2: A/B test runs within canary population
  ┌───────────────────────────────────────────────────────────────┐
  │   Canary Traffic ──> [A/B Test] ──> 50% A | 50% B            │
  └───────────────────────────────────────────────────────────────┘

  Stage 3: After canary validation, expand A/B test to all traffic
  ┌───────────────────────────────────────────────────────────────┐
  │   All Traffic ──> [A/B Test] ──> 50% A | 50% B               │
  └───────────────────────────────────────────────────────────────┘
```

---

## Blue-Green vs Canary Comparison

### Blue-Green Deployment Overview

Blue-green deployment maintains two identical production environments:

```
Blue-Green Deployment:

  Before:
  ┌─────────────┐          ┌─────────────┐
  │    Blue     │ <─ Live  │    Green    │  Idle
  │  (v1.0.0)   │          │  (empty)    │
  └─────────────┘          └─────────────┘

  During Deploy:
  ┌─────────────┐          ┌─────────────┐
  │    Blue     │ <─ Live  │    Green    │  Deploying v2.0.0
  │  (v1.0.0)   │          │  (v2.0.0)   │
  └─────────────┘          └─────────────┘

  After Switch:
  ┌─────────────┐          ┌─────────────┐
  │    Blue     │  Standby │    Green    │ <─ Live
  │  (v1.0.0)   │          │  (v2.0.0)   │
  └─────────────┘          └─────────────┘

  Rollback: Instant switch back to Blue
```

### Comparison Table

| Aspect | Blue-Green | Canary |
|--------|------------|--------|
| **Traffic Pattern** | All-or-nothing switch | Gradual percentage increase |
| **Infrastructure** | Duplicate environments | Single environment, multiple versions |
| **Resource Cost** | Higher (2x infrastructure) | Lower (shared infrastructure) |
| **Rollback Speed** | Instant | Fast (traffic routing) |
| **Risk Exposure** | Full switch risk | Gradual risk exposure |
| **Testing Time** | Short (pre-switch testing) | Extended (live traffic testing) |
| **Complexity** | Simpler | More complex |

### When to Use Each

#### Blue-Green is Better When:

- Need instant cutover
- Database schema changes are involved
- Compliance requires complete environment isolation
- Quick rollback is critical
- Infrastructure changes accompany code changes

#### Canary is Better When:

- Changes should be validated with real traffic
- Resource cost is a concern
- Gradual confidence building is preferred
- User behavior metrics are important
- Long-running validation is needed

### Netlify Context

Netlify's architecture is more suited to canary-style deployments:

- **Atomic deploys** provide instant switchover capability (blue-green-like)
- **Split testing** enables canary-style gradual rollouts
- **Deploy previews** offer isolated testing environments
- **Instant rollback** allows quick recovery from any deploy

**Recommended for MeJohnC.Org**: Primarily use canary deployments (split testing) for major releases, with instant rollback capability serving as a blue-green fallback.

---

## Best Practices

### What Changes to Canary

#### Always Canary

| Change Type | Reason |
|-------------|--------|
| **Major feature releases** | Significant user impact |
| **Authentication changes** | Critical security path |
| **Payment/checkout flows** | Business-critical |
| **Database-related changes** | Data integrity risk |
| **Third-party integrations** | External dependency risk |
| **Performance optimizations** | May have unintended effects |
| **Infrastructure changes** | Wide-reaching impact |

#### Consider Canary

| Change Type | Criteria |
|-------------|----------|
| **UI redesigns** | If affecting core flows |
| **API changes** | If breaking changes possible |
| **Dependency updates** | If major version bump |
| **Configuration changes** | If affecting multiple features |

#### Skip Canary (Direct Deploy)

| Change Type | Reason |
|-------------|--------|
| **Copy/text changes** | Low risk, easy rollback |
| **CSS tweaks** | Visual only, quick fix |
| **Documentation** | No functional impact |
| **Minor bug fixes** | Well-tested, limited scope |
| **Feature flag-protected** | Already gated |

### Duration Recommendations

| Change Type | Minimum Canary Duration | Recommended Duration |
|-------------|------------------------|---------------------|
| **Critical path changes** | 48 hours | 72+ hours |
| **Major features** | 24 hours | 48 hours |
| **Standard features** | 8 hours | 24 hours |
| **Minor changes** | 2 hours | 8 hours |

#### Factors Affecting Duration

- **Traffic volume**: Higher traffic = faster confidence
- **User diversity**: Ensure coverage across user types
- **Time zones**: Cover primary user time zones
- **Complexity**: More complex = longer validation
- **Business cycles**: Include peak usage periods

### Success Criteria

#### Metrics-Based Criteria

| Metric | Success Threshold |
|--------|-------------------|
| **Error Rate** | < 0.1% increase |
| **P95 Latency** | < 10% increase |
| **Conversion Rate** | No decrease |
| **Core Web Vitals** | Within 10% of baseline |
| **User Complaints** | No increase |

#### Qualitative Criteria

- No P1/P2 incidents during canary period
- No negative user feedback specific to changes
- Team confidence in the release
- All automated tests passing
- Support team has not escalated issues

### Canary Communication

#### Before Starting Canary

```
Team Notification:

Starting canary deployment for [Feature Name]
- Version: [version]
- Initial traffic: 5%
- Expected duration: 24-48 hours
- Monitoring dashboard: [link]
- Escalation: [contact]

Key changes:
- [Change 1]
- [Change 2]

Success criteria:
- Error rate < 0.1% increase
- Performance within 10% baseline
- No P1/P2 issues
```

#### During Canary

```
Canary Update - [Feature Name]

Status: ✅ Healthy
Traffic: 20% (increased from 5%)
Duration: 8 hours

Metrics:
- Error rate: 0.02% (baseline: 0.02%) ✅
- P95 latency: 245ms (baseline: 240ms) ✅
- User complaints: 0 ✅

Next milestone: Expand to 50% in 4 hours if stable
```

#### After Canary Completion

```
Canary Complete - [Feature Name]

Result: ✅ Success - Merged to production

Final metrics:
- Error rate: 0.02% (no change)
- Performance: Within baseline
- Duration: 48 hours
- Max traffic: 80%

Follow-up:
- Post-release monitoring for 24 hours
- Feature flag cleanup: [date]
- Documentation updated: [link]
```

---

## Canary Deployment Checklist

### Pre-Canary Checklist

#### Planning

- [ ] Identify changes to be included in canary
- [ ] Define success criteria and metrics
- [ ] Determine initial traffic percentage
- [ ] Plan rollout schedule
- [ ] Identify rollback triggers
- [ ] Assign monitoring responsibilities

#### Technical Preparation

- [ ] Create canary branch from main
- [ ] Apply changes to canary branch
- [ ] Ensure feature flags are configured (if used)
- [ ] Verify monitoring dashboards are set up
- [ ] Test rollback procedure
- [ ] Verify alerting is configured

#### Communication

- [ ] Notify team of canary start time
- [ ] Share monitoring dashboard links
- [ ] Document escalation path
- [ ] Prepare status update template

### During Canary Checklist

#### Continuous Monitoring

- [ ] Check error rates every 30 minutes (initial phase)
- [ ] Compare canary vs stable metrics
- [ ] Monitor user feedback channels
- [ ] Review any new support tickets
- [ ] Check automated alerts

#### Decision Points

- [ ] At each expansion, verify success criteria met
- [ ] Document any anomalies observed
- [ ] Get team sign-off for traffic increases
- [ ] Update stakeholders on progress

### Post-Canary Checklist

#### Completion Actions

- [ ] Merge canary branch to main
- [ ] Disable split testing
- [ ] Delete or archive canary branch
- [ ] Update release notes/changelog
- [ ] Notify team of completion

#### Documentation

- [ ] Complete post-canary analysis
- [ ] Document any issues encountered
- [ ] Update runbooks if procedures changed
- [ ] Create follow-up tasks if needed

#### Cleanup

- [ ] Remove canary-specific feature flags (after bake time)
- [ ] Clean up canary-specific configurations
- [ ] Archive canary monitoring dashboards
- [ ] Close related tickets/issues

---

## Post-Canary Analysis Template

Use this template to document canary deployment outcomes.

```markdown
# Post-Canary Analysis: [Feature/Release Name]

## Summary

| Field | Value |
|-------|-------|
| **Canary ID** | CANARY-YYYY-MM-DD-XXX |
| **Start Date** | [YYYY-MM-DD HH:MM UTC] |
| **End Date** | [YYYY-MM-DD HH:MM UTC] |
| **Duration** | [X] hours |
| **Outcome** | [Success / Rollback / Partial] |
| **Final Traffic %** | [X]% |

## Changes Included

- [Change 1]: [Brief description]
- [Change 2]: [Brief description]
- [Change 3]: [Brief description]

## Traffic Progression

| Time | Stable % | Canary % | Notes |
|------|----------|----------|-------|
| T+0h | 95% | 5% | Initial deployment |
| T+4h | 80% | 20% | First expansion |
| T+12h | 50% | 50% | Significant expansion |
| T+24h | 20% | 80% | Near-complete |
| T+48h | 0% | 100% | Full rollout |

## Metrics Comparison

### Error Rates

| Metric | Baseline (Stable) | Canary | Delta | Status |
|--------|-------------------|--------|-------|--------|
| JS Errors | 0.02% | 0.02% | 0% | PASS |
| API 5xx | 0.01% | 0.01% | 0% | PASS |
| Failed Requests | 0.05% | 0.04% | -0.01% | PASS |

### Performance (P75)

| Metric | Baseline (Stable) | Canary | Delta | Status |
|--------|-------------------|--------|-------|--------|
| LCP | 1.8s | 1.85s | +2.7% | PASS |
| FID | 45ms | 43ms | -4.4% | PASS |
| CLS | 0.05 | 0.05 | 0% | PASS |
| TTFB | 320ms | 315ms | -1.6% | PASS |

### Business Metrics

| Metric | Baseline | Canary | Delta | Status |
|--------|----------|--------|-------|--------|
| Page Views | 10,000 | 520 (5%) | - | Expected |
| Bounce Rate | 45% | 44% | -1% | PASS |
| Conversion | 2.5% | 2.6% | +0.1% | PASS |

## Issues Encountered

### Issue 1: [Issue Title]

- **Severity**: [P1/P2/P3/P4]
- **Time Detected**: [HH:MM UTC]
- **Description**: [What happened]
- **Impact**: [Who/what was affected]
- **Resolution**: [How it was fixed]
- **Canary Impact**: [Did it affect rollout?]

### Issue 2: [Issue Title]

- [Same format as above]

## Rollback Events

*List any times traffic was reduced or rollback was triggered*

| Time | Action | Reason | Duration |
|------|--------|--------|----------|
| [None during this canary] | | | |

## Lessons Learned

### What Went Well

1. [Positive outcome 1]
2. [Positive outcome 2]
3. [Positive outcome 3]

### What Could Be Improved

1. [Improvement opportunity 1]
2. [Improvement opportunity 2]

### Recommendations for Future Canaries

1. [Recommendation 1]
2. [Recommendation 2]

## Follow-Up Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | Open |
| [Action 2] | [Name] | [Date] | Open |

## Appendix

### Monitoring Links

- Sentry Dashboard: [link]
- Netlify Analytics: [link]
- Performance Dashboard: [link]

### Related Documentation

- Feature Specification: [link]
- PR/Commits: [link]
- Previous Canary (if any): [link]

---

*Analysis completed by: [Name]*
*Date: [YYYY-MM-DD]*
```

---

## Related Documentation

- [deployment-runbook.md](../runbooks/deployment-runbook.md) - General deployment procedures
- [staging-environment.md](./staging-environment.md) - Staging environment guide
- [disaster-recovery.md](../reliability/disaster-recovery.md) - DR and rollback procedures
- [feature-flags.ts](../../src/lib/feature-flags.ts) - Feature flag implementation
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md) - Deployment decisions
- [slos-slis.md](../observability/slos-slis.md) - Service level objectives

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-20 | 1.0 | Claude Code | Initial document (Issue #99) |

---

*This document should be reviewed quarterly and updated after any significant changes to deployment infrastructure or processes.*
