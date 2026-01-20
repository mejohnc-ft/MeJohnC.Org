# Multi-Region Deployment with Failover

This document provides comprehensive guidance for implementing multi-region deployment with failover capabilities for MeJohnC.Org.

**Related**: See [disaster-recovery.md](./disaster-recovery.md) for recovery procedures and [backup-strategy.md](./backup-strategy.md) for backup policies.

---

## Table of Contents

1. [Multi-Region Deployment Overview](#multi-region-deployment-overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Multi-Region Strategies](#multi-region-strategies)
4. [Implementation Options by Service](#implementation-options-by-service)
5. [Failover Mechanisms](#failover-mechanisms)
6. [Data Consistency Considerations](#data-consistency-considerations)
7. [Cost-Benefit Analysis](#cost-benefit-analysis)
8. [When Multi-Region is Necessary](#when-multi-region-is-necessary)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Testing Failover Procedures](#testing-failover-procedures)

---

## Multi-Region Deployment Overview

### Purpose

Multi-region deployment distributes application infrastructure across multiple geographic regions to achieve:

- **High Availability**: Survive regional outages with minimal downtime
- **Reduced Latency**: Serve users from geographically closer infrastructure
- **Disaster Recovery**: Maintain operations when a region becomes unavailable
- **Regulatory Compliance**: Keep data within specific geographic boundaries

### Current State Assessment

MeJohnC.Org uses a serverless/JAMstack architecture with the following regional characteristics:

| Component | Provider | Current Region | Multi-Region Status |
|-----------|----------|----------------|---------------------|
| Frontend/CDN | Netlify | Global (edge-distributed) | Already multi-region |
| Database | Supabase (PostgreSQL) | Single region | Requires implementation |
| Authentication | Clerk | Managed (multi-region) | Already distributed |
| Source Code | GitHub | Multi-region | Already distributed |

### Architecture Diagram

```
                           Global Users
                                |
                    +-----------+-----------+
                    |                       |
            Americas Region            EMEA/APAC Region
                    |                       |
        +-----------+-----------+-----------+-----------+
        |           |           |           |           |
        v           v           v           v           v
   +--------+  +--------+  +--------+  +--------+  +--------+
   |Netlify |  |Netlify |  |Netlify |  |Netlify |  |Netlify |
   |PoP NYC |  |PoP LAX |  |PoP LHR |  |PoP SIN |  |PoP SYD |
   +--------+  +--------+  +--------+  +--------+  +--------+
        |           |           |           |           |
        +-----------+-----------+-----------+-----------+
                                |
                    +-----------+-----------+
                    |                       |
            Primary Region          Secondary Region
            (US East)              (EU West - Future)
                    |                       |
        +-----------+-----------+  +--------+--------+
        |           |           |  |                 |
        v           v           v  v                 v
   +--------+  +--------+  +--------+           +--------+
   |Supabase|  |Supabase|  | Clerk  |           |Supabase|
   |Primary |  |Read    |  | Auth   |           |Replica |
   +--------+  |Replica |  +--------+           |(Future)|
               +--------+                       +--------+
```

---

## Current Architecture Analysis

### Netlify CDN (Already Global)

**Status**: Already multi-region, edge-distributed

Netlify provides global content delivery through its CDN network:

**Edge Locations**:
- North America: 20+ PoPs (US, Canada)
- Europe: 15+ PoPs (UK, Germany, France, Netherlands)
- Asia Pacific: 10+ PoPs (Singapore, Tokyo, Sydney, Hong Kong)
- South America: 5+ PoPs (Brazil, Argentina)

**How It Works**:
```
User Request (Sydney)
        |
        v
Netlify Edge (Sydney)
        |
        ├── Cache HIT → Return cached content (<50ms)
        |
        └── Cache MISS → Request origin
                |
                v
        Netlify Origin (US)
                |
                v
        Build artifacts returned
                |
                v
        Cache at Sydney edge
```

**Current Configuration (`netlify.toml`)**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"
```

**Benefits Already Realized**:
- Global static asset distribution
- Edge function execution at user-nearest PoP
- Automatic SSL/TLS termination at edge
- DDoS protection at edge

**Limitations**:
- Edge function state is per-PoP (rate limiting is not globally coordinated)
- Build artifacts originate from single region
- Serverless functions run in single region

### Supabase Region

**Status**: Single region (configurable at project creation)

**Current Deployment**:
- Region: Selected at project creation (e.g., `us-east-1`)
- Database: PostgreSQL running in single availability zone
- Connection: Via pooler (PgBouncer) on port 6543

**Regional Options Available**:

| Region Code | Location | Latency from US East |
|-------------|----------|----------------------|
| us-east-1 | N. Virginia | Baseline |
| us-west-1 | N. California | ~70ms |
| eu-west-1 | Ireland | ~80ms |
| eu-west-2 | London | ~75ms |
| eu-central-1 | Frankfurt | ~90ms |
| ap-southeast-1 | Singapore | ~220ms |
| ap-northeast-1 | Tokyo | ~170ms |
| ap-south-1 | Mumbai | ~200ms |
| sa-east-1 | Sao Paulo | ~130ms |

**Multi-Region Capabilities** (Pro plan and above):
- Read replicas in different regions
- Point-in-time recovery across regions
- Automated backups with cross-region storage

### Clerk Region

**Status**: Managed multi-region service

Clerk handles regional distribution automatically:

**Infrastructure**:
- Authentication endpoints distributed globally
- Session tokens replicated across regions
- User data stored with regional compliance options

**Current Integration**:
```typescript
// JWT Template for Supabase RLS
{
  "email": "{{user.primary_email_address}}"
}
```

**Regional Considerations**:
- Clerk's SDKs automatically connect to nearest edge
- JWT tokens work regardless of which Clerk region issued them
- User database can be configured for GDPR compliance

---

## Multi-Region Strategies

### Strategy 1: Active-Passive (Primary + Standby)

**Architecture**:
```
                    Normal Operation
                          |
                          v
                    ┌─────────────┐
                    │   Primary   │  ←── All traffic
                    │  (US East)  │
                    └──────┬──────┘
                           │
                    Async Replication
                           │
                           v
                    ┌─────────────┐
                    │   Standby   │  ←── No traffic (warm)
                    │  (EU West)  │
                    └─────────────┘

                    During Failover
                          |
                          v
                    ┌─────────────┐
                    │   Primary   │  ←── Failed/Unavailable
                    │  (US East)  │
                    └─────────────┘
                           X
                           │
                           v
                    ┌─────────────┐
                    │   Standby   │  ←── Promoted to Primary
                    │  (EU West)  │      All traffic redirected
                    └─────────────┘
```

**Characteristics**:

| Aspect | Description |
|--------|-------------|
| Traffic Pattern | 100% to primary, 0% to standby |
| Data Replication | Asynchronous (seconds to minutes lag) |
| Failover Time | Minutes (depends on automation) |
| Cost | Lower (standby is minimal/idle) |
| Complexity | Lower |
| Data Loss Risk | Possible (uncommitted transactions) |

**When to Use**:
- Budget constraints
- RPO tolerance of 1-5 minutes
- RTO tolerance of 5-30 minutes
- Primary region has vast majority of users

**Implementation for MeJohnC.Org**:

1. **Supabase Configuration**:
   - Primary project in US East
   - Read replica or separate project in EU West
   - Asynchronous replication via logical replication or manual sync

2. **DNS Configuration**:
   - Primary: `db-primary.mejohnc.org` -> Supabase US East
   - Failover: `db-failover.mejohnc.org` -> Supabase EU West
   - Application uses primary by default

3. **Failover Trigger**:
   - Manual decision or health check automation
   - DNS update to redirect traffic
   - Application config update if needed

### Strategy 2: Active-Active (Load Balanced)

**Architecture**:
```
                    Global Traffic
                          |
                          v
                    ┌─────────────┐
                    │ Global Load │
                    │  Balancer   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Region 1 │ │ Region 2 │ │ Region 3 │
        │ (US East)│ │ (EU West)│ │(AP South)│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                    Multi-Master
                    Replication
```

**Characteristics**:

| Aspect | Description |
|--------|-------------|
| Traffic Pattern | Distributed based on geography/latency |
| Data Replication | Synchronous or conflict-resolution |
| Failover Time | Near-instant (traffic already distributed) |
| Cost | Higher (all regions active) |
| Complexity | Higher (conflict resolution required) |
| Data Loss Risk | Minimal (with synchronous replication) |

**When to Use**:
- Global user base with similar traffic across regions
- Ultra-low latency requirements (<100ms globally)
- Near-zero RTO requirements
- Budget allows for multiple active instances

**Challenges for MeJohnC.Org**:

1. **Write Conflicts**:
   - Admin operations could conflict if simultaneous
   - Requires conflict resolution strategy
   - Portfolio site has minimal write conflicts (single admin)

2. **Consistency**:
   - Strong consistency requires synchronous replication
   - Cross-region synchronous replication adds latency
   - CAP theorem trade-offs apply

3. **Complexity**:
   - More moving parts to monitor
   - Higher operational burden
   - May be overkill for personal portfolio

**Recommendation**: Active-Passive is more appropriate for MeJohnC.Org given:
- Single admin user (no write conflicts)
- Read-heavy workload
- Cost sensitivity
- Operational simplicity preference

---

## Implementation Options by Service

### Netlify: Already Edge-Distributed

**Current State**: No additional implementation needed for frontend

**Optimizations Available**:

1. **Edge Functions for Region-Aware Logic**:
```typescript
// netlify/edge-functions/region-aware.ts
import type { Context } from 'https://edge.netlify.com'

export default async function handler(request: Request, context: Context) {
  const geo = context.geo

  // Route to nearest database based on user location
  const dbEndpoint = selectDatabaseEndpoint(geo)

  return new Response(JSON.stringify({
    region: geo.country?.code,
    dbEndpoint: dbEndpoint
  }))
}

function selectDatabaseEndpoint(geo: Context['geo']): string {
  const europeanCountries = ['GB', 'DE', 'FR', 'NL', 'IE', 'ES', 'IT']
  const asianCountries = ['JP', 'SG', 'AU', 'IN', 'KR', 'HK']

  if (europeanCountries.includes(geo.country?.code || '')) {
    return process.env.SUPABASE_URL_EU || process.env.SUPABASE_URL
  }
  if (asianCountries.includes(geo.country?.code || '')) {
    return process.env.SUPABASE_URL_APAC || process.env.SUPABASE_URL
  }
  return process.env.SUPABASE_URL // US (default)
}
```

2. **Split Testing for Region Rollout**:
```toml
# netlify.toml
[dev]
  command = "npm run dev"

# A/B test regional routing
[[headers]]
  for = "/api/*"
  [headers.values]
    X-Region = "us-east-1"
```

### Supabase: Read Replicas and Multi-Region

**Option 1: Read Replicas (Recommended First Step)**

Available on Pro plan ($25/month + $25/replica):

```
                    Write Traffic
                          |
                          v
                    ┌─────────────┐
                    │   Primary   │
                    │  (US East)  │
                    └──────┬──────┘
                           │
              Async Replication (< 100ms lag)
                           │
              ┌────────────┼────────────┐
              v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Replica  │ │ Replica  │ │ Replica  │
        │ (EU West)│ │(AP South)│ │ (US West)│
        └──────────┘ └──────────┘ └──────────┘
              ↑            ↑            ↑
         Read Traffic (geographically routed)
```

**Implementation Steps**:

1. **Enable Read Replica** (Supabase Dashboard):
   - Navigate to: Project Settings > Database > Read Replicas
   - Select target region
   - Note the replica connection string

2. **Configure Application**:
```typescript
// src/lib/supabase-multi-region.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface RegionConfig {
  primary: string
  replicas: Record<string, string>
}

const regionConfig: RegionConfig = {
  primary: import.meta.env.VITE_SUPABASE_URL,
  replicas: {
    'EU': import.meta.env.VITE_SUPABASE_URL_EU,
    'APAC': import.meta.env.VITE_SUPABASE_URL_APAC,
  }
}

// Primary client for writes
export const supabasePrimary = createClient(
  regionConfig.primary,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Function to get read client based on user region
export function getReadClient(userRegion: string): SupabaseClient {
  const replicaUrl = regionConfig.replicas[userRegion]
  if (replicaUrl) {
    return createClient(replicaUrl, import.meta.env.VITE_SUPABASE_ANON_KEY)
  }
  return supabasePrimary
}

// Query routing helper
export async function readQuery<T>(
  userRegion: string,
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = getReadClient(userRegion)
  return queryFn(client)
}

export async function writeQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Writes always go to primary
  return queryFn(supabasePrimary)
}
```

3. **Usage in Components**:
```typescript
// Example: Reading published apps (can use replica)
const apps = await readQuery(userRegion, async (client) => {
  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('status', 'published')
  return data
})

// Example: Admin creating new app (must use primary)
const newApp = await writeQuery(async (client) => {
  const { data, error } = await client
    .from('apps')
    .insert(appData)
    .select()
  return data
})
```

**Option 2: Multi-Region Projects (Full Redundancy)**

For complete regional independence:

```
Region 1 (US East)          Region 2 (EU West)
┌─────────────────┐         ┌─────────────────┐
│ Supabase        │         │ Supabase        │
│ Project A       │ ←─────→ │ Project B       │
│                 │  Sync   │                 │
│ - PostgreSQL    │         │ - PostgreSQL    │
│ - Auth          │         │ - Auth          │
│ - Edge Funcs    │         │ - Edge Funcs    │
└─────────────────┘         └─────────────────┘
```

**Implementation**:

1. Create separate Supabase projects in each region
2. Implement data synchronization via:
   - Supabase Edge Functions with webhooks
   - External sync service (e.g., Debezium + Kafka)
   - Custom replication scripts

**Sync Example** (Edge Function):
```typescript
// supabase/functions/sync-to-replica/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const primaryClient = createClient(
  Deno.env.get('SUPABASE_PRIMARY_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const replicaClient = createClient(
  Deno.env.get('SUPABASE_REPLICA_URL')!,
  Deno.env.get('SUPABASE_REPLICA_SERVICE_KEY')!
)

serve(async (req) => {
  const { table, record, type } = await req.json()

  if (type === 'INSERT') {
    await replicaClient.from(table).insert(record)
  } else if (type === 'UPDATE') {
    await replicaClient.from(table).update(record).eq('id', record.id)
  } else if (type === 'DELETE') {
    await replicaClient.from(table).delete().eq('id', record.id)
  }

  return new Response(JSON.stringify({ success: true }))
})
```

### Database Replication Patterns

**Pattern 1: Asynchronous Replication (Recommended)**

```
Write → Primary → Acknowledge → Async Replicate → Replicas
```

- **Latency Impact**: None (write acknowledged before replication)
- **Consistency**: Eventual (replicas may lag)
- **Data Loss Risk**: Possible (recent writes may not be replicated)

**Pattern 2: Synchronous Replication**

```
Write → Primary → Sync Replicate → All Replicas → Acknowledge
```

- **Latency Impact**: High (waits for all replicas)
- **Consistency**: Strong (all regions consistent)
- **Data Loss Risk**: None

**Pattern 3: Semi-Synchronous Replication**

```
Write → Primary → Sync to 1 Replica → Acknowledge → Async to Others
```

- **Latency Impact**: Moderate
- **Consistency**: At least 2 copies before acknowledgment
- **Data Loss Risk**: Minimal

**Recommendation for MeJohnC.Org**:

Given the read-heavy, single-admin nature of the site:

1. **Use asynchronous replication** for read replicas
2. Accept 100-500ms eventual consistency
3. Admin operations always hit primary
4. Public content reads can use nearest replica

---

## Failover Mechanisms

### Health Check Configuration

**Application-Level Health Checks**:

```typescript
// src/lib/health-check.ts
interface HealthCheckResult {
  healthy: boolean
  latency: number
  region: string
  timestamp: Date
}

export async function checkDatabaseHealth(
  supabaseUrl: string
): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    })

    return {
      healthy: response.ok,
      latency: Date.now() - startTime,
      region: extractRegion(supabaseUrl),
      timestamp: new Date()
    }
  } catch (error) {
    return {
      healthy: false,
      latency: -1,
      region: extractRegion(supabaseUrl),
      timestamp: new Date()
    }
  }
}

export async function checkAllRegions(): Promise<HealthCheckResult[]> {
  const endpoints = [
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_URL_EU,
    import.meta.env.VITE_SUPABASE_URL_APAC,
  ].filter(Boolean)

  return Promise.all(endpoints.map(checkDatabaseHealth))
}
```

**Edge Function Health Monitor**:

```typescript
// netlify/edge-functions/health-monitor.ts
import type { Context } from 'https://edge.netlify.com'

const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
const FAILURE_THRESHOLD = 3

interface RegionHealth {
  failures: number
  lastCheck: number
  healthy: boolean
}

const regionHealth = new Map<string, RegionHealth>()

export default async function handler(request: Request, context: Context) {
  const results = await checkAllEndpoints()

  // Update health status
  for (const result of results) {
    const current = regionHealth.get(result.region) || {
      failures: 0,
      lastCheck: 0,
      healthy: true
    }

    if (!result.healthy) {
      current.failures++
    } else {
      current.failures = 0
    }

    current.healthy = current.failures < FAILURE_THRESHOLD
    current.lastCheck = Date.now()
    regionHealth.set(result.region, current)
  }

  return new Response(JSON.stringify({
    regions: Object.fromEntries(regionHealth),
    timestamp: new Date().toISOString()
  }))
}
```

### Automatic Failover Triggers

**Trigger Conditions**:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Health check failures | 3 consecutive | Initiate failover |
| Response latency | > 5000ms for 1 minute | Consider failover |
| Error rate | > 50% for 30 seconds | Initiate failover |
| Database unreachable | Immediate | Initiate failover |

**Automated Failover Implementation**:

```typescript
// src/lib/failover-manager.ts
interface FailoverConfig {
  primary: string
  secondary: string
  healthCheckInterval: number
  failureThreshold: number
}

class FailoverManager {
  private config: FailoverConfig
  private currentEndpoint: string
  private failureCount: number = 0
  private isFailedOver: boolean = false

  constructor(config: FailoverConfig) {
    this.config = config
    this.currentEndpoint = config.primary
  }

  async checkAndFailover(): Promise<void> {
    const health = await this.checkHealth(this.currentEndpoint)

    if (!health.healthy) {
      this.failureCount++
      console.warn(`Health check failed (${this.failureCount}/${this.config.failureThreshold})`)

      if (this.failureCount >= this.config.failureThreshold) {
        await this.executeFailover()
      }
    } else {
      this.failureCount = 0

      // Consider failback if we're on secondary and primary is healthy
      if (this.isFailedOver) {
        await this.checkFailback()
      }
    }
  }

  private async executeFailover(): Promise<void> {
    console.error('Executing failover to secondary region')
    this.currentEndpoint = this.config.secondary
    this.isFailedOver = true
    this.failureCount = 0

    // Notify monitoring systems
    await this.notifyFailover('primary_to_secondary')
  }

  private async checkFailback(): Promise<void> {
    const primaryHealth = await this.checkHealth(this.config.primary)

    if (primaryHealth.healthy && primaryHealth.latency < 1000) {
      console.log('Primary region recovered, initiating failback')
      this.currentEndpoint = this.config.primary
      this.isFailedOver = false

      await this.notifyFailover('secondary_to_primary')
    }
  }

  getCurrentEndpoint(): string {
    return this.currentEndpoint
  }
}

export const failoverManager = new FailoverManager({
  primary: import.meta.env.VITE_SUPABASE_URL,
  secondary: import.meta.env.VITE_SUPABASE_URL_FAILOVER,
  healthCheckInterval: 30000,
  failureThreshold: 3
})
```

### DNS-Based Failover

**Option 1: Cloudflare DNS with Health Checks**

```
                    User Request
                          |
                          v
                    ┌─────────────┐
                    │ Cloudflare  │
                    │    DNS      │
                    └──────┬──────┘
                           │
              Health Check (every 30s)
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Origin  │ │  Origin  │ │  Origin  │
        │    A     │ │    B     │ │    C     │
        │ (Active) │ │(Standby) │ │(Standby) │
        └──────────┘ └──────────┘ └──────────┘
```

**Configuration**:
```yaml
# Cloudflare DNS Configuration (conceptual)
zone: mejohnc.org

records:
  - name: db
    type: CNAME
    content: db-primary.mejohnc.org
    proxied: true

health_checks:
  - name: primary_db
    address: db-primary.mejohnc.org
    type: HTTPS
    interval: 30
    retries: 2

  - name: secondary_db
    address: db-secondary.mejohnc.org
    type: HTTPS
    interval: 30
    retries: 2

load_balancers:
  - name: db.mejohnc.org
    default_pools:
      - pool_primary
    fallback_pool: pool_secondary

pools:
  - name: pool_primary
    origins:
      - name: primary
        address: db-primary.mejohnc.org
        enabled: true
    health_check: primary_db

  - name: pool_secondary
    origins:
      - name: secondary
        address: db-secondary.mejohnc.org
        enabled: true
    health_check: secondary_db
```

**Option 2: AWS Route 53 Failover**

```yaml
# Route 53 Failover Configuration (conceptual)
hosted_zone: mejohnc.org

health_checks:
  - id: primary-health
    type: HTTPS
    fqdn: db-primary.mejohnc.org
    port: 443
    path: /rest/v1/
    failure_threshold: 3
    request_interval: 30

records:
  - name: db.mejohnc.org
    type: A
    alias:
      name: db-primary.mejohnc.org
      evaluate_target_health: true
    failover_routing:
      type: PRIMARY
    health_check_id: primary-health

  - name: db.mejohnc.org
    type: A
    alias:
      name: db-secondary.mejohnc.org
    failover_routing:
      type: SECONDARY
```

### Application-Level Failover

**Circuit Breaker Pattern**:

```typescript
// src/lib/circuit-breaker.ts
enum CircuitState {
  CLOSED,    // Normal operation
  OPEN,      // Failing, use fallback
  HALF_OPEN  // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  halfOpenRequests: number
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number = 0
  private lastFailureTime: number = 0
  private halfOpenSuccesses: number = 0

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN
        this.halfOpenSuccesses = 0
      } else {
        return fallbackFn()
      }
    }

    try {
      const result = await primaryFn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      return fallbackFn()
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = CircuitState.CLOSED
        this.failures = 0
      }
    }
    this.failures = 0
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
    }
  }
}

// Usage
const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenRequests: 3
})

export async function queryWithFailover<T>(
  query: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  return dbCircuitBreaker.execute(
    () => query(primaryClient),
    () => query(secondaryClient)
  )
}
```

---

## Data Consistency Considerations

### Replication Lag

**Understanding Lag**:

```
Timeline:
T0: Write to Primary
T1: Acknowledge to Client
T2: Replicate to Secondary (T2 - T0 = Replication Lag)
T3: Client reads from Secondary

If T3 < T2: Client may see stale data
```

**Typical Lag Values**:

| Replication Type | Expected Lag | Max Lag |
|------------------|--------------|---------|
| Same-region async | < 10ms | 100ms |
| Cross-region async | 50-200ms | 1-5s |
| Same-region sync | 0 | 0 |
| Cross-region sync | 100-300ms (blocked) | N/A |

**Handling Replication Lag**:

```typescript
// Strategy 1: Read-your-writes consistency
async function writeAndRead(data: AppData): Promise<AppData> {
  // Write to primary
  const writeResult = await supabasePrimary
    .from('apps')
    .insert(data)
    .select()
    .single()

  // Return the write result, don't read from replica
  return writeResult.data
}

// Strategy 2: Version/timestamp-based consistency
async function readWithMinVersion(
  table: string,
  minVersion: number
): Promise<any[]> {
  const client = getReadClient(userRegion)

  // First, check if replica has the version
  const { data: versionCheck } = await client
    .from('replication_status')
    .select('last_version')
    .single()

  if (versionCheck.last_version >= minVersion) {
    return client.from(table).select('*')
  }

  // Fallback to primary if replica is behind
  return supabasePrimary.from(table).select('*')
}

// Strategy 3: Causal consistency with session tokens
interface SessionContext {
  lastWriteTimestamp: number
  lastWriteRegion: string
}

async function readWithCausalConsistency(
  session: SessionContext,
  query: () => Promise<any>
): Promise<any> {
  const minTimestamp = session.lastWriteTimestamp
  const writeRegion = session.lastWriteRegion

  // If we wrote recently, read from the write region
  if (Date.now() - minTimestamp < 5000) {
    const client = getClientForRegion(writeRegion)
    return query()
  }

  // Otherwise, nearest replica is fine
  return query()
}
```

### Conflict Resolution

**Conflict Scenarios**:

1. **Update-Update Conflict**: Same record updated in different regions
2. **Delete-Update Conflict**: Record deleted in one region, updated in another
3. **Unique Constraint Conflict**: Same unique value inserted in different regions

**Resolution Strategies**:

```typescript
// Strategy 1: Last-Writer-Wins (LWW)
interface Timestamped {
  id: string
  updated_at: string
  _version: number
}

async function resolveConflict<T extends Timestamped>(
  localRecord: T,
  remoteRecord: T
): Promise<T> {
  // Compare timestamps, use most recent
  if (new Date(localRecord.updated_at) > new Date(remoteRecord.updated_at)) {
    return localRecord
  }
  return remoteRecord
}

// Strategy 2: Application-specific merge
interface MergeableContent {
  id: string
  content: string
  tags: string[]
  updated_at: string
}

function mergeContent(local: MergeableContent, remote: MergeableContent): MergeableContent {
  return {
    id: local.id,
    // Use longer content (arbitrary rule)
    content: local.content.length > remote.content.length
      ? local.content
      : remote.content,
    // Union of tags
    tags: [...new Set([...local.tags, ...remote.tags])],
    // Use later timestamp
    updated_at: new Date(local.updated_at) > new Date(remote.updated_at)
      ? local.updated_at
      : remote.updated_at
  }
}

// Strategy 3: Operational Transformation (for collaborative editing)
// Not typically needed for portfolio sites
```

**Conflict Prevention** (Recommended for MeJohnC.Org):

```typescript
// Since there's only one admin, prevent conflicts with simple locking
async function acquireEditLock(
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabasePrimary
    .from('edit_locks')
    .insert({
      resource_id: resourceId,
      user_id: userId,
      acquired_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 300000).toISOString() // 5 min
    })
    .select()

  return !error
}

async function releaseEditLock(resourceId: string, userId: string): Promise<void> {
  await supabasePrimary
    .from('edit_locks')
    .delete()
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
}
```

### CAP Theorem Trade-offs

**The CAP Theorem states that a distributed system can only guarantee two of**:
- **C**onsistency: All nodes see the same data at the same time
- **A**vailability: Every request receives a response
- **P**artition tolerance: System continues operating despite network partitions

**Trade-off Analysis for MeJohnC.Org**:

| Scenario | Choice | Rationale |
|----------|--------|-----------|
| Public content reads | AP | Availability over consistency; stale data acceptable |
| Admin writes | CP | Consistency over availability; writes must not conflict |
| User sessions | AP | Availability; sessions can be recreated |
| Audit logs | CP | Consistency; audit integrity is critical |

**Implementation**:

```typescript
// Configure based on operation type
const consistencyLevels = {
  publicRead: {
    tolerance: 'eventual',
    maxStaleness: 5000, // 5 seconds
    fallbackToCache: true
  },
  adminRead: {
    tolerance: 'session',
    maxStaleness: 0,
    fallbackToCache: false
  },
  adminWrite: {
    tolerance: 'strong',
    requirePrimary: true,
    retryOnFailure: true
  },
  auditLog: {
    tolerance: 'strong',
    requirePrimary: true,
    retryOnFailure: true,
    queueOnFailure: true
  }
}

async function executeWithConsistency<T>(
  level: keyof typeof consistencyLevels,
  operation: () => Promise<T>
): Promise<T> {
  const config = consistencyLevels[level]

  if (config.tolerance === 'strong' && config.requirePrimary) {
    return executeOnPrimary(operation, config.retryOnFailure)
  }

  if (config.tolerance === 'eventual') {
    return executeOnNearestWithFallback(operation, config)
  }

  return operation()
}
```

---

## Cost-Benefit Analysis

### Cost Breakdown by Configuration

**Configuration 1: Single Region (Current)**

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| Netlify Pro | $19 | Includes global CDN |
| Supabase Pro | $25 | Single region |
| Clerk Free | $0 | Under 10K MAU |
| **Total** | **$44** | Baseline |

**Configuration 2: Read Replica (Recommended)**

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| Netlify Pro | $19 | No change |
| Supabase Pro + Replica | $50 | Primary + 1 read replica |
| Clerk Free | $0 | No change |
| **Total** | **$69** | +$25/month |

**Configuration 3: Full Multi-Region Active-Passive**

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| Netlify Pro | $19 | No change |
| Supabase Pro (x2) | $50 | Two full projects |
| Sync infrastructure | $10-20 | Edge functions, etc. |
| DNS failover | $0-5 | Cloudflare/Route53 |
| Clerk Free | $0 | No change |
| **Total** | **$79-94** | +$35-50/month |

**Configuration 4: Full Multi-Region Active-Active**

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| Netlify Business | $99 | For advanced features |
| Supabase Pro (x3) | $75 | Three regions |
| Sync infrastructure | $25-50 | More complex sync |
| DNS load balancing | $10-20 | Geographic routing |
| Clerk Pro | $25 | Higher usage |
| **Total** | **$234-269** | Premium configuration |

### Benefit Analysis

**Benefits by Configuration**:

| Benefit | Single | +Replica | Active-Passive | Active-Active |
|---------|--------|----------|----------------|---------------|
| Global read latency | CDN only | Improved | Improved | Optimal |
| Failover capability | None | Limited | Full | Automatic |
| Write availability | 99.9% | 99.9% | 99.95% | 99.99% |
| Read availability | 99.9% | 99.95% | 99.95% | 99.99% |
| Data durability | High | Higher | Very High | Highest |
| Operational complexity | Low | Low | Medium | High |
| Recovery time (RTO) | Hours | Hours | Minutes | Seconds |
| Data loss risk (RPO) | Minutes | Minutes | Seconds | Near-zero |

### ROI Calculation

**For a personal portfolio site**:

```
Downtime Cost Estimation:
- Average traffic: 100 visits/day
- Conversion value: ~$0 (informational site)
- Direct revenue loss: Minimal

Indirect Costs:
- Missed recruiter visits during outage
- Professional reputation impact
- Time spent on manual recovery

Cost-Benefit for Read Replica (+$25/month):
- Benefit: Faster global reads, basic redundancy
- ROI: Worth it if global audience or reliability matters

Cost-Benefit for Full Multi-Region (+$50/month):
- Benefit: Automatic failover, minimal downtime
- ROI: Only if site is revenue-critical or high-profile
```

**Recommendation Matrix**:

| Site Type | Recommended Config | Monthly Cost |
|-----------|-------------------|--------------|
| Personal portfolio (hobby) | Single region | $0-44 |
| Personal portfolio (job seeking) | Single + read replica | $69 |
| Small business | Active-passive | $79-94 |
| Revenue-generating | Active-active | $234+ |

---

## When Multi-Region is Necessary

### Decision Framework

**Consider Multi-Region When**:

| Factor | Threshold | Multi-Region Need |
|--------|-----------|-------------------|
| Global user distribution | >30% outside primary region | Yes |
| Latency requirements | <100ms globally | Yes |
| Uptime SLA | >99.95% | Yes |
| Regulatory requirements | Data residency laws | Yes |
| Revenue impact | >$100/hour downtime | Consider |
| User count | >10K daily active | Consider |

### Assessment Checklist

```markdown
## Multi-Region Assessment Checklist

### Traffic Analysis
- [ ] What percentage of traffic comes from outside primary region?
- [ ] What are the peak hours in each major region?
- [ ] Are there specific geographic markets to target?

### Latency Requirements
- [ ] What is acceptable P95 latency for key operations?
- [ ] Are there real-time features requiring low latency?
- [ ] Do competitors offer better global performance?

### Availability Requirements
- [ ] What is the business impact of 1 hour downtime?
- [ ] What SLA is promised to users/customers?
- [ ] What has been the historical downtime?

### Regulatory Requirements
- [ ] Are there data residency requirements (GDPR, etc.)?
- [ ] Are there industry-specific compliance needs?
- [ ] Do any customers require specific regions?

### Budget
- [ ] What is the monthly infrastructure budget?
- [ ] What is the cost of downtime vs. multi-region cost?
- [ ] Are there growth projections requiring planning?
```

### MeJohnC.Org Assessment

| Factor | Current Status | Need Multi-Region? |
|--------|---------------|-------------------|
| User distribution | Primarily US | Not critical |
| Latency requirements | Not strict | Not critical |
| Uptime SLA | None formal | Not critical |
| Regulatory | GDPR aware | Not critical |
| Revenue impact | None | Not critical |
| User count | Low (<1K/day) | Not critical |

**Current Recommendation**: Single region with read replica is sufficient. Full multi-region is not necessary at current scale but can be implemented if:
- Job opportunities are in specific regions requiring low latency
- Site becomes revenue-generating
- Traffic grows significantly

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Objective**: Prepare infrastructure for multi-region capability

**Tasks**:

- [ ] **1.1** Audit current Supabase configuration
  - Document all tables and their criticality
  - Identify which data can tolerate eventual consistency
  - Review current RLS policies for multi-region compatibility

- [ ] **1.2** Implement health check endpoints
  ```typescript
  // Add to existing API
  GET /api/health -> { db: 'ok', auth: 'ok', timestamp: '...' }
  ```

- [ ] **1.3** Add database connection monitoring
  - Track connection counts
  - Monitor query latencies
  - Set up alerts for anomalies

- [ ] **1.4** Document current architecture
  - Network diagrams
  - Data flow documentation
  - Dependencies mapping

**Deliverables**:
- Health check endpoint deployed
- Monitoring dashboard configured
- Architecture documentation complete

### Phase 2: Read Replica (Week 3-4)

**Objective**: Deploy first read replica for improved read performance

**Tasks**:

- [ ] **2.1** Enable Supabase read replica
  - Select secondary region (EU West recommended)
  - Configure replication
  - Note replica connection string

- [ ] **2.2** Implement read/write splitting
  ```typescript
  // Update src/lib/supabase.ts
  export const primaryClient = createClient(PRIMARY_URL, KEY)
  export const replicaClient = createClient(REPLICA_URL, KEY)
  ```

- [ ] **2.3** Update query functions
  - Route reads to replica
  - Keep writes on primary
  - Implement fallback logic

- [ ] **2.4** Test replication lag
  - Measure typical lag
  - Test under load
  - Document acceptable scenarios

**Deliverables**:
- Read replica operational
- Read/write splitting implemented
- Performance benchmarks documented

### Phase 3: Failover Capability (Week 5-6)

**Objective**: Implement automated failover mechanisms

**Tasks**:

- [ ] **3.1** Set up DNS failover (Cloudflare or Route53)
  - Configure health checks
  - Set up failover routing
  - Test DNS propagation time

- [ ] **3.2** Implement circuit breaker pattern
  - Add to database client
  - Configure thresholds
  - Test failover scenarios

- [ ] **3.3** Create failover runbook
  - Document manual failover steps
  - Create automated scripts
  - Train on procedures

- [ ] **3.4** Set up alerting for failover events
  - Configure notifications
  - Set up on-call procedures
  - Document escalation path

**Deliverables**:
- Automated failover configured
- Runbook documented
- Alerting operational

### Phase 4: Testing and Validation (Week 7-8)

**Objective**: Validate multi-region setup through comprehensive testing

**Tasks**:

- [ ] **4.1** Conduct failover drills
  - Simulate primary failure
  - Measure RTO
  - Validate data consistency

- [ ] **4.2** Performance testing
  - Global latency testing
  - Load testing with failover
  - Capacity verification

- [ ] **4.3** Update documentation
  - Finalize architecture docs
  - Update disaster recovery plan
  - Create operational playbooks

- [ ] **4.4** Training and handoff
  - Document operational procedures
  - Create troubleshooting guides
  - Establish review schedule

**Deliverables**:
- Failover drill completed
- Performance benchmarks met
- Documentation complete

### Timeline Summary

```
Week 1-2: Foundation
  ├── Health checks
  ├── Monitoring
  └── Documentation

Week 3-4: Read Replica
  ├── Replica setup
  ├── Read/write splitting
  └── Testing

Week 5-6: Failover
  ├── DNS failover
  ├── Circuit breaker
  └── Runbooks

Week 7-8: Validation
  ├── Drills
  ├── Performance testing
  └── Final documentation
```

---

## Testing Failover Procedures

### Test Categories

| Test Type | Frequency | Duration | Impact |
|-----------|-----------|----------|--------|
| Health check verification | Daily (automated) | 1 minute | None |
| Synthetic failover | Monthly | 30 minutes | None (staging) |
| Controlled failover | Quarterly | 2 hours | Minimal |
| Chaos engineering | Semi-annually | 4 hours | Possible |

### Test 1: Health Check Verification (Daily)

**Purpose**: Verify health checks are functioning correctly

**Automated Script**:
```bash
#!/bin/bash
# test-health-checks.sh

ENDPOINTS=(
  "https://mejohnc.org/api/health"
  "https://db-primary.mejohnc.org/rest/v1/"
  "https://db-replica.mejohnc.org/rest/v1/"
)

for endpoint in "${ENDPOINTS[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
  if [ "$response" != "200" ]; then
    echo "ALERT: $endpoint returned $response"
    # Send alert
  else
    echo "OK: $endpoint"
  fi
done
```

**Success Criteria**:
- All endpoints return 200
- Response time < 1 second
- No false positives in last 7 days

### Test 2: Synthetic Failover (Monthly)

**Purpose**: Verify failover logic without affecting production

**Procedure**:

```markdown
## Synthetic Failover Test

Date: ___________
Performed by: ___________

### Setup
1. [ ] Deploy test version of application to staging
2. [ ] Configure staging to use failover endpoints
3. [ ] Prepare monitoring dashboards

### Execution
4. [ ] Simulate primary endpoint failure (return 500s)
5. [ ] Verify circuit breaker opens
   - Time to open: _____ seconds
6. [ ] Verify traffic routes to secondary
   - Failover time: _____ seconds
7. [ ] Verify data operations work on secondary
8. [ ] Simulate primary recovery
9. [ ] Verify traffic returns to primary
   - Failback time: _____ seconds

### Validation
10. [ ] No data loss during failover
11. [ ] No duplicate operations
12. [ ] Alerts fired correctly
13. [ ] Logs captured failover events

### Results
- Failover successful: YES / NO
- Total failover time: _____ seconds
- Issues found: _________________________
```

### Test 3: Controlled Failover (Quarterly)

**Purpose**: Validate actual failover in production environment

**Pre-requisites**:
- Schedule during low-traffic period
- Notify stakeholders
- Have rollback plan ready
- Monitoring active

**Procedure**:

```markdown
## Controlled Failover Test

Date: ___________
Start time: ___________
Performed by: ___________

### Pre-Test Checklist
- [ ] Low traffic period confirmed
- [ ] Stakeholders notified
- [ ] Monitoring dashboards open
- [ ] Rollback procedures ready
- [ ] Support contacts available

### Phase 1: Preparation
1. [ ] Document current primary database metrics
   - Active connections: _____
   - Queries/second: _____
   - Replication lag: _____
2. [ ] Verify secondary is in sync
3. [ ] Capture baseline application metrics

### Phase 2: Failover Execution
4. [ ] Block traffic to primary database
   ```sql
   -- In primary
   ALTER SYSTEM SET max_connections = 0;
   SELECT pg_reload_conf();
   ```
5. [ ] Start timer
6. [ ] Monitor application for errors
7. [ ] Verify traffic shifts to secondary
   - First request to secondary: _____ seconds
   - All traffic migrated: _____ seconds

### Phase 3: Validation
8. [ ] Test key application functions:
   - [ ] Public page loads
   - [ ] Admin authentication
   - [ ] Content reads
   - [ ] Content writes
9. [ ] Check for data consistency
10. [ ] Monitor error rates

### Phase 4: Failback
11. [ ] Restore primary database
   ```sql
   ALTER SYSTEM RESET max_connections;
   SELECT pg_reload_conf();
   ```
12. [ ] Verify replication catches up
13. [ ] Redirect traffic back to primary
14. [ ] Verify normal operation

### Results Summary
- Total RTO: _____ minutes
- Data loss (RPO): _____ seconds
- Errors during failover: _____
- User reports: _____

### Post-Test Actions
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Schedule next test
- [ ] File test report
```

### Test 4: Chaos Engineering (Semi-annually)

**Purpose**: Discover unknown failure modes through controlled chaos

**Scenarios to Test**:

| Scenario | Method | Expected Behavior |
|----------|--------|-------------------|
| Network latency | Add 500ms delay | Circuit breaker activates |
| Packet loss | Drop 10% of packets | Retries succeed |
| DNS failure | Block DNS resolution | Cached IPs used |
| Certificate expiry | Use expired cert | Graceful error |
| Memory pressure | Limit container memory | Graceful degradation |
| CPU saturation | Stress test | Request queuing |

**Chaos Test Framework**:

```typescript
// chaos-test-framework.ts
interface ChaosExperiment {
  name: string
  hypothesis: string
  method: () => Promise<void>
  validation: () => Promise<boolean>
  rollback: () => Promise<void>
}

const experiments: ChaosExperiment[] = [
  {
    name: 'Primary Database Latency',
    hypothesis: 'Application should failover to replica within 30 seconds',
    method: async () => {
      // Inject 2000ms latency to primary
      await injectLatency('db-primary', 2000)
    },
    validation: async () => {
      // Check that reads are coming from replica
      const source = await getQuerySource()
      return source === 'replica'
    },
    rollback: async () => {
      await removeLatency('db-primary')
    }
  },
  // More experiments...
]

async function runChaosExperiment(experiment: ChaosExperiment): Promise<void> {
  console.log(`Starting: ${experiment.name}`)
  console.log(`Hypothesis: ${experiment.hypothesis}`)

  try {
    await experiment.method()

    // Wait for system to react
    await sleep(60000)

    const passed = await experiment.validation()
    console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`)

  } finally {
    await experiment.rollback()
  }
}
```

### Test Result Documentation

**Template for Test Reports**:

```markdown
# Failover Test Report

## Test Information
- **Test Type**: [Health Check / Synthetic / Controlled / Chaos]
- **Date**: YYYY-MM-DD
- **Duration**: X hours Y minutes
- **Performed By**: [Name]

## Configuration
- **Primary Region**: [Region]
- **Secondary Region**: [Region]
- **Replication Mode**: [Async/Sync]

## Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | 5 min | X min | Pass/Fail |
| RPO | 1 min | X sec | Pass/Fail |
| Error Rate | <1% | X% | Pass/Fail |
| False Positives | 0 | X | Pass/Fail |

## Timeline

| Time | Event |
|------|-------|
| HH:MM | Test started |
| HH:MM | Primary failure simulated |
| HH:MM | Failover detected |
| HH:MM | Failover complete |
| HH:MM | Validation passed |
| HH:MM | Failback initiated |
| HH:MM | Test completed |

## Issues Found

1. **Issue**: [Description]
   - **Severity**: [High/Medium/Low]
   - **Action**: [Required action]
   - **Owner**: [Name]

## Recommendations

- [Recommendation 1]
- [Recommendation 2]

## Next Test Scheduled

Date: YYYY-MM-DD
Type: [Test type]
```

---

## Related Documentation

- [disaster-recovery.md](./disaster-recovery.md) - Recovery procedures and runbooks
- [backup-strategy.md](./backup-strategy.md) - Backup procedures and retention
- [horizontal-scaling.md](../scalability/horizontal-scaling.md) - Scaling strategies
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md) - Netlify configuration
- [ADR-0004: Supabase Architecture](../adr/0004-supabase-database-architecture.md) - Database design

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-20 | 1.0 | Claude Code | Initial document (Issue #74) |
