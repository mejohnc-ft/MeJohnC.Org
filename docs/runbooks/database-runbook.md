# Database Runbook

This runbook covers database operations for MeJohnC.Org, using Supabase (PostgreSQL) as the database backend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Architecture](#database-architecture)
3. [Daily Operations](#daily-operations)
4. [Backup Procedures](#backup-procedures)
5. [Migration Management](#migration-management)
6. [Performance Monitoring](#performance-monitoring)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Recovery Procedures](#recovery-procedures)
9. [Security Operations](#security-operations)
10. [Contact and Escalation](#contact-and-escalation)

---

## Prerequisites

### Required Access

| Resource | Access Level | How to Obtain |
|----------|--------------|---------------|
| Supabase Dashboard | Editor or Admin | Project invitation |
| Supabase CLI | Service role key | Dashboard > Settings > API |
| Database Direct Access | postgres role | Dashboard > Database > Connection |

### Required Tools

```bash
# Supabase CLI
npm install -g supabase
supabase --version

# PostgreSQL client (optional)
psql --version

# pg_dump for backups (optional)
pg_dump --version
```

### Environment Setup

```bash
# Set Supabase project reference
export SUPABASE_PROJECT_REF=your_project_ref

# Set access token
export SUPABASE_ACCESS_TOKEN=your_access_token

# For direct database access
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

---

## Database Architecture

### Table Groups

```
Portfolio Tables
├── apps                 # Software applications
├── app_suites           # App groupings
├── projects            # Portfolio projects
├── blog_posts          # Blog content
├── work_history        # Employment history
└── skills              # Technical skills

Site Content Tables
├── site_content        # Dynamic content blocks
├── contact_links       # Contact information
├── timelines           # Timeline data
├── timeline_entries    # Timeline items
└── case_studies        # Case study content

News System Tables
├── news_sources        # RSS/API feed sources
├── news_articles       # Aggregated articles
├── news_categories     # Article categories
├── news_filters        # User filters
└── bookmarks           # Saved articles

AI Agent Tables
├── agent_commands      # Command history
├── agent_responses     # AI responses
├── agent_tasks         # Task queue
└── agent_sessions      # Session management

System Tables
├── admin_users         # Admin access control
└── audit_logs          # Audit trail
```

### Row Level Security (RLS)

All tables have RLS enabled with these patterns:

- **Public Read**: Published content visible to all
- **Admin Write**: Only admins can modify data
- **Admin Check**: Via `is_admin()` function checking `admin_users` table

---

## Daily Operations

### Health Check

```bash
# Via Supabase Dashboard
# Navigate to: Project > Database > Health

# Via CLI - Check database status
supabase db ping

# Via SQL - Check connections
SELECT count(*) FROM pg_stat_activity;
```

### Monitor Active Queries

```sql
-- View long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle';

-- Kill a specific query if needed
SELECT pg_cancel_backend(pid);
```

### Check Table Sizes

```sql
-- Table sizes
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## Backup Procedures

### Automated Backups (Supabase)

Supabase automatically handles:
- **Point-in-time Recovery**: Last 7 days (Pro plan)
- **Daily Backups**: Retained per plan tier

### Manual Backup via Dashboard

1. Go to Supabase Dashboard
2. Navigate to: Settings > Database > Backups
3. Click "Create Backup" (if available on your plan)

### Manual Backup via CLI

```bash
# Create backup using supabase CLI
supabase db dump --project-ref $SUPABASE_PROJECT_REF > backup_$(date +%Y%m%d).sql

# Create data-only backup
supabase db dump --data-only --project-ref $SUPABASE_PROJECT_REF > data_$(date +%Y%m%d).sql

# Create schema-only backup
supabase db dump --schema-only --project-ref $SUPABASE_PROJECT_REF > schema_$(date +%Y%m%d).sql
```

### Manual Backup via pg_dump

```bash
# Full backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Specific tables only
pg_dump $DATABASE_URL -t apps -t blog_posts > portfolio_backup.sql
```

### Backup Verification

```bash
# Verify backup file
head -100 backup_20250120.sql

# Test restore to local database (recommended)
psql -d test_db < backup_20250120.sql
```

### Backup Schedule Recommendation

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full Backup | Daily | 30 days |
| Schema Backup | Weekly | 90 days |
| Pre-Migration | Before each migration | Until verified |

---

## Migration Management

### Migration Files Location

```
supabase/
├── migrations/
│   ├── 001_agent_and_bookmarks.sql
│   ├── 002_metrics.sql
│   ├── 003_marketing.sql
│   ├── 003_site_builder.sql
│   ├── 003_task_system.sql
│   └── COMBINED_PHASE3_MIGRATION.sql
├── schema.sql           # Core schema
├── news-schema.sql      # News system
├── agent-schema.sql     # AI agent
├── bookmarks-schema.sql # Bookmarks
└── crm-schema.sql       # CRM system
```

### Creating a New Migration

```bash
# Create migration file
supabase migration new add_new_feature

# This creates: supabase/migrations/YYYYMMDDHHMMSS_add_new_feature.sql
```

### Writing Migration SQL

```sql
-- Up migration (in migration file)
-- Add new table
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Public can view" ON new_feature
  FOR SELECT USING (true);

CREATE POLICY "Admins can modify" ON new_feature
  FOR ALL USING (is_admin());
```

### Testing Migration Locally

```bash
# Reset local database with migrations
supabase db reset

# Check migration status
supabase migration list
```

### Applying Migration to Production

#### Pre-Migration Steps

1. [ ] Backup production database
2. [ ] Test migration in staging
3. [ ] Review migration SQL
4. [ ] Schedule maintenance window (if needed)
5. [ ] Notify stakeholders

#### Execute Migration

```bash
# Push migrations to production
supabase db push --project-ref $SUPABASE_PROJECT_REF

# Or execute via Supabase Dashboard SQL Editor
# Copy migration SQL and execute
```

#### Post-Migration Steps

1. [ ] Verify tables/columns created
2. [ ] Test application functionality
3. [ ] Monitor for errors
4. [ ] Update documentation

### Rollback Procedures

```sql
-- Create rollback script before migration
-- Example: rollback_add_new_feature.sql

-- Drop policies
DROP POLICY IF EXISTS "Public can view" ON new_feature;
DROP POLICY IF EXISTS "Admins can modify" ON new_feature;

-- Drop table
DROP TABLE IF EXISTS new_feature;
```

```bash
# Execute rollback via CLI or Dashboard SQL Editor
psql $DATABASE_URL < rollback_add_new_feature.sql
```

---

## Performance Monitoring

### Check Slow Queries

```sql
-- Enable pg_stat_statements if not already
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
  query,
  calls,
  total_time / 1000 AS total_seconds,
  mean_time / 1000 AS mean_seconds,
  rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Check Index Usage

```sql
-- Unused indexes
SELECT
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';

-- Missing indexes (sequential scans on large tables)
SELECT
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_rows
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;
```

### Check Table Bloat

```sql
-- Table bloat estimation
SELECT
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

---

## Maintenance Tasks

### VACUUM and ANALYZE

```sql
-- Analyze specific tables (updates statistics)
ANALYZE apps;
ANALYZE blog_posts;

-- Vacuum specific tables (reclaims space)
VACUUM apps;
VACUUM blog_posts;

-- Full vacuum (requires exclusive lock - use carefully)
VACUUM FULL apps;
```

### Reindex

```sql
-- Reindex specific table
REINDEX TABLE apps;

-- Reindex specific index
REINDEX INDEX idx_apps_slug;
```

### Clean Up Old Data

```sql
-- Example: Clean old audit logs (older than 90 days)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Example: Remove soft-deleted items older than 30 days
DELETE FROM apps
WHERE status = 'archived'
  AND updated_at < NOW() - INTERVAL '30 days';
```

### Maintenance Schedule

| Task | Frequency | Window |
|------|-----------|--------|
| ANALYZE | Daily (automatic) | - |
| VACUUM | Daily (automatic) | - |
| Manual VACUUM | Weekly | Low traffic hours |
| Audit log cleanup | Monthly | Sunday 2 AM |
| Index maintenance | Quarterly | Maintenance window |

---

## Recovery Procedures

### Restore from Supabase Backup

1. **Access Supabase Dashboard**
   - Navigate to: Settings > Database > Backups
   - Select backup point
   - Click "Restore"

2. **Confirm restoration**
   - Note: This overwrites current data

3. **Verify restoration**
   - Check application functionality
   - Verify data integrity

### Restore from Manual Backup

```bash
# Restore full backup
psql $DATABASE_URL < backup_20250120.sql

# Restore specific tables
psql $DATABASE_URL -c "TRUNCATE TABLE apps CASCADE;"
psql $DATABASE_URL < apps_backup.sql
```

### Point-in-Time Recovery (PITR)

For Supabase Pro plans:

1. Go to Supabase Dashboard
2. Navigate to: Settings > Database > Backups
3. Select "Point-in-time Recovery"
4. Choose specific timestamp
5. Initiate recovery

### Data Corruption Recovery

1. **Identify affected data**
   ```sql
   -- Check for null values in required fields
   SELECT * FROM apps WHERE name IS NULL OR slug IS NULL;
   ```

2. **Restore from backup** (if needed)

3. **Fix data issues**
   ```sql
   -- Example: Fix missing slugs
   UPDATE apps SET slug = lower(replace(name, ' ', '-'))
   WHERE slug IS NULL;
   ```

---

## Security Operations

### Review RLS Policies

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Audit Admin Access

```sql
-- Check admin_users table
SELECT * FROM admin_users;

-- Add new admin
INSERT INTO admin_users (email) VALUES ('newadmin@example.com');

-- Remove admin access
DELETE FROM admin_users WHERE email = 'oldadmin@example.com';
```

### Check for Sensitive Data Exposure

```sql
-- Ensure no service keys in tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%key%' OR column_name LIKE '%secret%' OR column_name LIKE '%password%';
```

### API Key Rotation

See [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) for key rotation procedures.

---

## Contact and Escalation

### Primary Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Database Admin | [NAME] | [EMAIL] | [HOURS] |
| Backend Lead | [NAME] | [EMAIL] | [HOURS] |
| On-Call Engineer | [NAME] | [PHONE] | 24/7 |

### Escalation Path

1. **Level 1**: Development team (Slack: #mejohnc-dev)
2. **Level 2**: Database admin ([EMAIL])
3. **Level 3**: Supabase support (for platform issues)

### External Support

| Service | Support URL | Status Page |
|---------|-------------|-------------|
| Supabase | supabase.com/support | status.supabase.com |
| PostgreSQL | postgresql.org/docs | - |

---

## Appendix

### Useful SQL Queries

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- List all tables with row counts
SELECT
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Check replication status (if applicable)
SELECT * FROM pg_stat_replication;

-- Check connections
SELECT
  count(*) AS total,
  state,
  usename
FROM pg_stat_activity
GROUP BY state, usename;
```

### Related Documentation

- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Database credentials
- [deployment-runbook.md](./deployment-runbook.md) - Deployment procedures
- [incident-response.md](./incident-response.md) - Incident handling
- [supabase/schema.sql](../../supabase/schema.sql) - Core database schema
