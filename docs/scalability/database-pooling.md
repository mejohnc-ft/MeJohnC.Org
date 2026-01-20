# Database Connection Pooling

This document provides comprehensive guidance on database connection pooling for MeJohnC.Org, covering Supabase connection options, configuration, best practices, and troubleshooting.

---

## Table of Contents

1. [Connection Pooling Overview](#connection-pooling-overview)
2. [Why Pooling Matters for Serverless](#why-pooling-matters-for-serverless)
3. [Supabase Connection Options](#supabase-connection-options)
4. [Configuration Guide](#configuration-guide)
5. [Best Practices](#best-practices)
6. [Monitoring Connections](#monitoring-connections)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tuning](#performance-tuning)
9. [Cost Implications](#cost-implications)

---

## Connection Pooling Overview

### What is Connection Pooling?

Connection pooling is a technique that maintains a cache of database connections that can be reused across multiple requests. Instead of opening a new connection for each database operation (which is expensive), applications borrow connections from a pool and return them when done.

```
Without Pooling:                    With Pooling:

Request 1 ---> New Connection       Request 1 --|
Request 2 ---> New Connection                   |--> Shared Pool ---> Database
Request 3 ---> New Connection       Request 2 --|    (PgBouncer)
    ...                             Request 3 --|
Request N ---> New Connection                   |
                                    Request N --|
(N connections to database)         (Fixed pool size)
```

### How Connection Pooling Works

1. **Pool Initialization**: A fixed number of database connections are established at startup
2. **Connection Checkout**: When a request needs database access, it borrows a connection from the pool
3. **Query Execution**: The borrowed connection executes the query
4. **Connection Return**: After use, the connection returns to the pool (not closed)
5. **Connection Reuse**: The same connection serves the next request

### Pooling Components in Supabase

| Component | Role | Port |
|-----------|------|------|
| PostgreSQL | Primary database server | 5432 |
| Supavisor | Connection pooler (replaces PgBouncer) | 6543 |
| PostgREST | REST API layer | 3000 |
| Supabase Client | JavaScript/TypeScript SDK | N/A |

---

## Why Pooling Matters for Serverless

### The Serverless Connection Problem

Serverless functions (Netlify Functions, Supabase Edge Functions, Vercel Functions) create a fundamental challenge for database connections:

```
Traditional Server:                 Serverless Functions:

[Server Process]                    [Function Instance 1] ---> Connection
    |                               [Function Instance 2] ---> Connection
    |--- Connection Pool            [Function Instance 3] ---> Connection
    |                                       ...
    v                               [Function Instance N] ---> Connection
[Database]
                                    Each instance = potential new connection!
```

**Problems without pooling:**

| Issue | Impact |
|-------|--------|
| Connection exhaustion | Database rejects new connections after max limit |
| Cold start latency | Each new connection adds 50-100ms |
| Resource waste | Idle connections consume database memory |
| Connection storms | Traffic spikes can overwhelm the database |

### Serverless Connection Lifecycle

```
Request arrives
     |
     v
Function cold start? --Yes--> Establish new DB connection (50-100ms)
     |                                    |
     No (warm)                            |
     |                                    |
     v                                    v
Use existing connection <-----------------+
     |
     v
Execute query
     |
     v
Function may freeze (idle) ---> Connection may timeout
     |
     v
Function terminates ---> Connection orphaned (connection leak)
```

### MeJohnC.Org Serverless Context

Our application has multiple serverless touchpoints:

| Component | Connection Pattern | Risk Level |
|-----------|-------------------|------------|
| React frontend | Supabase JS client via REST API | Low (PostgREST pools) |
| Netlify Edge Functions | Rate limiting, no DB access | None |
| Supabase Edge Functions | Direct database access | Medium |
| Admin operations | Authenticated client with JWT | Low |

---

## Supabase Connection Options

### Option 1: Direct Connections

**Connection String Format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Characteristics:**

| Aspect | Details |
|--------|---------|
| Port | 5432 |
| Mode | Direct to PostgreSQL |
| Use case | Migrations, admin tasks, long-running operations |
| Max connections | Limited by plan (60-100 typically) |
| Session state | Full PostgreSQL session |
| Prepared statements | Fully supported |

**When to use direct connections:**
- Database migrations and schema changes
- Long-running transactions (>30 seconds)
- Operations requiring temporary tables
- Session-level configurations (SET statements)
- Development and debugging

### Option 2: Connection Pooler (Supavisor)

Supabase uses Supavisor, a high-performance connection pooler built in Elixir, which replaced PgBouncer.

**Connection String Format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Characteristics:**

| Aspect | Details |
|--------|---------|
| Port | 6543 |
| Mode | Pooled connections |
| Use case | Application queries, serverless functions |
| Max connections | Plan dependent (200-10,000+) |
| Connection overhead | Near-zero per request |
| Scalability | Horizontal scaling across regions |

### Transaction Mode vs Session Mode

Supavisor supports two pooling modes:

#### Transaction Mode (Recommended for Serverless)

```
Client A: BEGIN --> Query 1 --> Query 2 --> COMMIT --> [Connection returned to pool]
Client B: -------------------- Query 1 --> [Uses same connection from pool]
```

**Configuration:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

| Aspect | Behavior |
|--------|----------|
| Connection assignment | Per transaction |
| Connection reuse | High (best efficiency) |
| Session variables | Reset between transactions |
| Prepared statements | Not supported (use extended query protocol) |
| LISTEN/NOTIFY | Not supported |
| SET statements | Only transaction-scoped |

#### Session Mode

```
Client A: Connect --> Query 1 --> Query 2 --> ... --> Disconnect
          [Same connection throughout session]
```

**Configuration:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

| Aspect | Behavior |
|--------|----------|
| Connection assignment | Per client session |
| Connection reuse | Lower (held until disconnect) |
| Session variables | Preserved |
| Prepared statements | Fully supported |
| LISTEN/NOTIFY | Supported |
| SET statements | Session-scoped |

### Decision Matrix

| Scenario | Recommended Connection |
|----------|----------------------|
| Supabase JS client in browser | Transaction mode (automatic) |
| Netlify serverless function | Transaction mode via pooler |
| Supabase Edge Function | Transaction mode via pooler |
| Database migration script | Direct connection |
| Real-time subscriptions | Session mode or direct |
| Prisma/Drizzle ORM | Transaction mode with `?pgbouncer=true` |
| Interactive psql session | Direct connection |

---

## Configuration Guide

### Supabase Pooler Setup

#### Step 1: Locate Connection Strings

1. Navigate to Supabase Dashboard
2. Go to **Project Settings** > **Database**
3. Find the **Connection string** section

You will see multiple connection options:

```
Direct connection (Port 5432):
postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

Connection pooling (Port 6543):
postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

#### Step 2: Configure for Transaction Mode

Append the `pgbouncer=true` parameter for transaction mode:

```
postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Connection String Formats

#### For Supabase JS Client (Browser)

```typescript
// src/lib/supabase.ts - Current implementation
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

The Supabase JS client automatically uses the REST API (PostgREST), which has its own internal connection pooling. No additional configuration needed.

#### For Direct PostgreSQL Connection (Migrations, Admin)

```bash
# .env for direct connection
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

#### For Pooled Connection (Serverless Functions)

```bash
# .env for serverless functions
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

#### For ORMs (Prisma, Drizzle)

```typescript
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations
}
```

```bash
# .env
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"
```

### Pool Size Recommendations

| Plan | Direct Connections | Pooler Connections | Recommended App Pool Size |
|------|-------------------|-------------------|---------------------------|
| Free | 60 | 200 | 5-10 |
| Pro | 60 | 400 | 10-20 |
| Team | 100 | 1,500 | 20-50 |
| Enterprise | Custom | 10,000+ | 50-100+ |

**Sizing Formula:**

```
App Pool Size = min(
  (Pooler Limit / Number of Serverless Instances),
  Expected Peak Concurrent Queries
)
```

**Example Calculation:**
- Supabase Pro plan: 400 pooler connections
- Expected max serverless instances: 20
- Peak concurrent queries per instance: 5
- Recommended pool size per instance: min(400/20, 5) = min(20, 5) = 5

---

## Best Practices

### Connection Lifecycle Management

#### 1. Use Singleton Pattern for Client Instances

```typescript
// Current implementation in src/lib/supabase.ts
let _supabase: SupabaseClient | null = null;

function initializeClient(): void {
  const settings = getSupabaseSettings();
  const settingsHash = `${settings.url}:${settings.anonKey}`;

  if (settingsHash === _lastSettingsHash && _supabase) {
    return; // Reuse existing client
  }

  _supabase = createClient(settings.url, settings.anonKey);
}
```

**Key principles:**
- Create client once, reuse across requests
- Avoid creating clients inside loops or frequently-called functions
- Client instances manage their own connection pooling internally

#### 2. Proper Connection Cleanup

```typescript
// For Edge Functions or serverless contexts
export async function handler(request: Request) {
  // Client created once per function instance
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data, error } = await supabase
      .from('table')
      .select('*');

    return new Response(JSON.stringify(data));
  } finally {
    // Supabase client handles cleanup automatically
    // No explicit close needed for REST API calls
  }
}
```

#### 3. Avoid Connection Leaks

```typescript
// Bad: Creating clients without proper lifecycle
async function badPattern() {
  for (const item of items) {
    const supabase = createClient(url, key); // New client each iteration!
    await supabase.from('table').insert(item);
  }
}

// Good: Reuse single client
async function goodPattern() {
  const supabase = createClient(url, key);
  for (const item of items) {
    await supabase.from('table').insert(item);
  }
  // Or better: batch insert
  await supabase.from('table').insert(items);
}
```

### Prepared Statements with Pooling

#### Transaction Mode Limitations

In transaction mode (recommended for serverless), prepared statements are problematic:

```typescript
// Prepared statements are deallocated after each transaction
// This can cause "prepared statement does not exist" errors

// Bad: Named prepared statements with transaction mode
await client.query({
  name: 'get-user',
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId]
});

// Good: Use parameterized queries without names
await client.query({
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId]
});
```

#### Supabase JS Client Handling

The Supabase JS client uses the REST API, which doesn't use PostgreSQL prepared statements:

```typescript
// Supabase JS client is safe to use with transaction mode
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

#### ORM Configuration

```typescript
// Prisma: Disable prepared statements for pooled connections
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

// Or use connection string parameter
// ?pgbouncer=true&statement_cache_size=0
```

### Transaction Handling

#### Single-Query Transactions

For single queries, Supabase handles transactions automatically:

```typescript
// Each query is its own transaction
const { data } = await supabase
  .from('orders')
  .insert({ product_id: 1, quantity: 5 })
  .select();
```

#### Multi-Query Transactions

For multi-query transactions, use Supabase RPC or database functions:

```typescript
// Define a database function for the transaction
// supabase/migrations/xxx_create_order_function.sql
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_customer_id UUID,
  p_items JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO orders (customer_id) VALUES (p_customer_id) RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity)
  SELECT v_order_id, (item->>'product_id')::UUID, (item->>'quantity')::INT
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

// Call from client
const { data: orderId } = await supabase.rpc('create_order_with_items', {
  p_customer_id: customerId,
  p_items: [
    { product_id: '...', quantity: 2 },
    { product_id: '...', quantity: 1 }
  ]
});
```

#### Avoiding Long Transactions

```typescript
// Bad: Long-running transaction holding connection
async function processLargeDataset(items: Item[]) {
  const client = await pool.connect();
  await client.query('BEGIN');

  for (const item of items) { // Could be thousands!
    await client.query('INSERT INTO table VALUES ($1)', [item]);
  }

  await client.query('COMMIT');
  client.release();
}

// Good: Batch operations with shorter transactions
async function processLargeDataset(items: Item[]) {
  const batchSize = 100;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await supabase.from('table').insert(batch);
  }
}
```

---

## Monitoring Connections

### Active Connections Dashboard

#### Supabase Dashboard Metrics

Navigate to **Project Dashboard** > **Database** > **Database Health**:

| Metric | Description | Warning Threshold |
|--------|-------------|-------------------|
| Active connections | Currently executing queries | > 80% of max |
| Idle connections | Connected but waiting | > 50 idle connections |
| Connection wait time | Time waiting for pool connection | > 100ms |
| Connections per second | New connection rate | > 100/second |

#### PostgreSQL Direct Queries

```sql
-- Current connection count by state
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Detailed active connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  now() - query_start AS query_duration,
  LEFT(query, 50) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'active'
ORDER BY query_start;

-- Connection usage vs limit
SELECT
  max_conn,
  used,
  res_for_super,
  (max_conn - used - res_for_super) AS available
FROM
  (SELECT count(*) AS used FROM pg_stat_activity) AS t,
  (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') AS t2,
  (SELECT setting::int AS res_for_super FROM pg_settings WHERE name = 'superuser_reserved_connections') AS t3;
```

### Connection Exhaustion Alerts

#### Setting Up Alerts in Supabase

1. Navigate to **Project Settings** > **Integrations**
2. Connect to monitoring service (Datadog, Grafana, etc.)
3. Set up alerts for connection metrics

#### Custom Alert Queries

```sql
-- Alert trigger: Connection count approaching limit
CREATE OR REPLACE FUNCTION check_connection_threshold()
RETURNS TRIGGER AS $$
DECLARE
  current_connections INT;
  max_connections INT;
  threshold DECIMAL := 0.8;
BEGIN
  SELECT count(*) INTO current_connections FROM pg_stat_activity;
  SELECT setting::int INTO max_connections FROM pg_settings WHERE name = 'max_connections';

  IF current_connections::decimal / max_connections > threshold THEN
    -- Log or send alert
    RAISE WARNING 'Connection usage at %% (% of %)',
      ROUND(current_connections::decimal / max_connections * 100, 1),
      current_connections,
      max_connections;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Sentry Integration for Connection Errors

```typescript
// src/lib/supabase.ts - Enhanced error handling
import { captureException } from './sentry';

export async function executeWithConnectionMonitoring<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  const { data, error } = await operation();

  if (error) {
    // Check for connection-related errors
    const connectionErrors = [
      'connection refused',
      'too many connections',
      'connection timeout',
      'ECONNREFUSED'
    ];

    const isConnectionError = connectionErrors.some(
      msg => error.message?.toLowerCase().includes(msg)
    );

    if (isConnectionError) {
      captureException(error, {
        tags: { error_type: 'database_connection' },
        extra: { message: error.message }
      });
    }

    throw error;
  }

  return data;
}
```

---

## Troubleshooting

### "Too Many Connections" Errors

**Symptoms:**
```
FATAL: too many connections for role "postgres"
FATAL: remaining connection slots are reserved for superuser connections
Error: Connection pool exhausted
```

**Diagnosis:**

```sql
-- Check current connection count
SELECT count(*) as connection_count FROM pg_stat_activity;

-- Check connections by client
SELECT
  application_name,
  client_addr,
  count(*) as connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, client_addr
ORDER BY connections DESC;

-- Find idle connections that could be closed
SELECT
  pid,
  usename,
  state,
  state_change,
  now() - state_change as idle_duration
FROM pg_stat_activity
WHERE state = 'idle'
  AND now() - state_change > interval '5 minutes';
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Too many serverless instances | Reduce pool size per instance |
| Connection leaks | Audit code for unclosed connections |
| Long-running queries | Optimize queries, add timeouts |
| Not using pooler | Switch to port 6543 with `?pgbouncer=true` |
| Wrong connection string | Verify using pooler connection string |

**Immediate Mitigation:**

```sql
-- Terminate idle connections (use with caution)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'idle'
  AND state_change < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();
```

### Connection Timeouts

**Symptoms:**
```
Error: Connection timed out
Error: Query read timeout
ETIMEDOUT
```

**Diagnosis:**

```sql
-- Check for long-running queries
SELECT
  pid,
  now() - query_start AS duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Check for blocking locks
SELECT
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
JOIN pg_catalog.pg_stat_activity blocked_activity
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Slow queries | Add indexes, optimize query |
| Lock contention | Reduce transaction scope |
| Network latency | Use regional connection string |
| Pool exhaustion | Increase pool size or optimize usage |
| Statement timeout | Increase timeout or optimize query |

**Configuration Adjustments:**

```typescript
// Set query timeout at client level
const supabase = createClient(url, key, {
  db: {
    schema: 'public'
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
    }
  }
});
```

### Idle Connection Issues

**Symptoms:**
- Connections stay open but unused
- Pool appears full despite low traffic
- "Connection has been idle too long" errors

**Diagnosis:**

```sql
-- Count idle connections by duration
SELECT
  CASE
    WHEN now() - state_change < interval '1 minute' THEN '< 1 min'
    WHEN now() - state_change < interval '5 minutes' THEN '1-5 min'
    WHEN now() - state_change < interval '30 minutes' THEN '5-30 min'
    ELSE '> 30 min'
  END as idle_duration,
  count(*) as connection_count
FROM pg_stat_activity
WHERE state = 'idle'
GROUP BY 1
ORDER BY 1;
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Serverless cold instances | Configure idle timeout in pooler |
| Connection not returned to pool | Check for missing error handling |
| Pooler misconfiguration | Verify `idle_timeout` setting |
| Application keeps connections open | Implement connection release on idle |

**Supavisor Configuration:**

Supabase manages Supavisor configuration, but you can influence connection behavior:

```bash
# Connection string with timeout parameters
postgresql://...?connect_timeout=10&idle_in_transaction_session_timeout=30000
```

---

## Performance Tuning

### Connection Pool Optimization

#### Optimal Pool Size Calculation

```
Optimal Pool Size = Number of CPU Cores * 2 + Number of Disks
```

For Supabase managed instances, use these guidelines:

| Supabase Plan | Recommended Pool Size | Max Concurrent Queries |
|---------------|----------------------|------------------------|
| Free | 5-10 | 20 |
| Pro | 10-25 | 50 |
| Team | 25-50 | 100 |
| Enterprise | 50-100+ | Custom |

#### Query Optimization for Pooled Connections

```typescript
// Inefficient: Multiple round trips
const users = await supabase.from('users').select('id');
const profiles = await supabase.from('profiles').select('*').in('user_id', users.map(u => u.id));

// Efficient: Single query with join
const { data } = await supabase
  .from('users')
  .select(`
    id,
    profiles (*)
  `);
```

#### Batch Operations

```typescript
// Instead of individual inserts
for (const item of items) {
  await supabase.from('table').insert(item);
}

// Use batch insert
await supabase.from('table').insert(items);

// For large datasets, chunk the batches
const BATCH_SIZE = 1000;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  await supabase.from('table').insert(items.slice(i, i + BATCH_SIZE));
}
```

### Query Performance with Pooling

#### Index Optimization

```sql
-- Identify slow queries
SELECT
  calls,
  mean_exec_time,
  total_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Create indexes for common query patterns
CREATE INDEX idx_blog_posts_status ON blog_posts(status) WHERE status = 'published';
CREATE INDEX idx_news_articles_source ON news_articles(source_id, created_at DESC);
```

#### Connection-Aware Caching

```typescript
// Implement application-level caching to reduce database round trips
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}

// Usage
const blogPosts = await fetchWithCache('blog_posts_published', () =>
  supabase.from('blog_posts').select('*').eq('status', 'published')
);
```

---

## Cost Implications

### Connection Limits by Plan

| Plan | Monthly Cost | Direct Connections | Pooler Connections | Best For |
|------|-------------|-------------------|-------------------|----------|
| Free | $0 | 60 | 200 | Development, testing |
| Pro | $25 | 60 | 400 | Small production apps |
| Team | $599 | 100 | 1,500 | Growing applications |
| Enterprise | Custom | Custom | 10,000+ | High-scale production |

### Cost Optimization Strategies

#### 1. Maximize Connection Efficiency

```
Cost Efficiency = Queries Processed / Connections Used

Higher efficiency = More queries per connection = Lower cost per query
```

**Strategies:**
- Use connection pooling (Supavisor via port 6543)
- Batch operations where possible
- Implement application-level caching
- Optimize query patterns

#### 2. Right-Size Your Plan

**Decision Framework:**

| Metric | Action |
|--------|--------|
| < 50% pooler utilization | Current plan is sufficient |
| 50-80% pooler utilization | Monitor, plan for upgrade |
| > 80% pooler utilization | Optimize or upgrade plan |
| Frequent connection errors | Immediate upgrade needed |

#### 3. Monitor Before Upgrading

```sql
-- Weekly connection usage report
SELECT
  date_trunc('day', backend_start) as day,
  max(count) as peak_connections
FROM (
  SELECT backend_start, count(*) OVER (PARTITION BY date_trunc('hour', backend_start))
  FROM pg_stat_activity
) t
GROUP BY 1
ORDER BY 1 DESC
LIMIT 7;
```

### Cost Comparison: Optimized vs Unoptimized

| Scenario | Without Optimization | With Optimization |
|----------|---------------------|-------------------|
| 10K daily users | Team plan ($599) | Pro plan ($25) |
| Connection usage | 1,200 concurrent | 300 concurrent |
| Query efficiency | 1 query/connection | 4 queries/connection |
| Monthly savings | - | $574 |

---

## Related Documentation

- [ADR-0004: Supabase Database Architecture](../adr/0004-supabase-database-architecture.md)
- [Horizontal Scaling Strategy](./horizontal-scaling.md)
- [Caching Strategy](./caching-strategy.md)
- [Database Runbook](../runbooks/database-runbook.md)

---

## Appendix: Quick Reference

### Connection String Cheatsheet

```bash
# Direct connection (migrations, admin)
postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres

# Pooled connection - Transaction mode (serverless, applications)
postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Pooled connection - Session mode (real-time, long sessions)
postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Common Commands

```bash
# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# View active queries
psql $DATABASE_URL -c "SELECT pid, state, query FROM pg_stat_activity WHERE state = 'active';"

# Terminate idle connections older than 10 minutes
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"
```

### Troubleshooting Decision Tree

```
Connection Error?
├── "Too many connections"
│   ├── Check: Using pooler (port 6543)?
│   │   └── No → Switch to pooler connection string
│   ├── Check: Pool size appropriate?
│   │   └── Too high → Reduce pool_size setting
│   └── Check: Connection leaks?
│       └── Yes → Audit connection lifecycle code
│
├── "Connection timeout"
│   ├── Check: Query performance
│   │   └── Slow → Add indexes, optimize query
│   ├── Check: Network latency
│   │   └── High → Use regional endpoint
│   └── Check: Lock contention
│       └── Yes → Reduce transaction scope
│
└── "Idle connection closed"
    ├── Check: Serverless context?
    │   └── Yes → Expected behavior, handle reconnection
    └── Check: Idle timeout setting
        └── Too low → Adjust keepalive settings
```

---

## Version History

| Date | Change | Issue |
|------|--------|-------|
| 2025-01-20 | Initial document created | #83 |
