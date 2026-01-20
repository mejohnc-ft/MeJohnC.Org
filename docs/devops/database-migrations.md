# Database Migration Rollback Strategy

This document defines the migration strategy, procedures, and rollback mechanisms for the MeJohnC.Org Supabase/PostgreSQL database.

---

## Table of Contents

1. [Migration Strategy Overview](#migration-strategy-overview)
2. [Creating New Migrations](#creating-new-migrations)
3. [Testing Migrations Locally](#testing-migrations-locally)
4. [Rollback Procedures](#rollback-procedures)
5. [Migration Naming Conventions](#migration-naming-conventions)
6. [Pre-Deployment Checklist](#pre-deployment-checklist)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Common Pitfalls and How to Avoid Them](#common-pitfalls-and-how-to-avoid-them)
9. [Migration Templates](#migration-templates)

---

## Migration Strategy Overview

### Architecture

MeJohnC.Org uses **Supabase** (PostgreSQL) with the following migration structure:

```
supabase/
├── schema.sql                          # Core schema (base tables, is_admin(), update_updated_at_column())
├── migrations/
│   ├── 001_agent_and_bookmarks.sql     # Agent and bookmark infrastructure
│   ├── 002_metrics.sql                 # Metrics dashboard
│   ├── 003_task_system.sql             # Task management
│   ├── 003_site_builder.sql            # Site builder components
│   ├── 003_marketing.sql               # Marketing tables
│   └── COMBINED_PHASE3_MIGRATION.sql   # Combined Phase 3 migrations
├── agent-schema.sql                    # AI agent standalone schema
├── bookmarks-schema.sql                # Bookmarks standalone schema
├── crm-schema.sql                      # CRM standalone schema
└── news-schema.sql                     # News aggregation schema
```

### Key Principles

1. **Idempotency**: All migrations use `IF NOT EXISTS`, `IF EXISTS`, and `ON CONFLICT DO NOTHING` to be safely re-runnable
2. **Prerequisites Verification**: Migrations verify required functions exist before execution
3. **Transaction Safety**: Each migration should be atomic and transactional
4. **Reversibility**: Every migration should have a corresponding rollback script
5. **RLS First**: Row Level Security is enabled and policies created in every migration

### Dependency Chain

```
schema.sql (base)
    |
    +-- is_admin() function
    +-- update_updated_at_column() function
    |
    +-- 001_agent_and_bookmarks.sql
    +-- 002_metrics.sql
    +-- 003_*.sql (Phase 3 migrations)
```

---

## Creating New Migrations

### Step 1: Generate Migration File

```bash
# Using Supabase CLI
supabase migration new feature_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql
```

For manual creation, use the naming convention: `NNN_feature_name.sql` where NNN is the sequence number.

### Step 2: Write Migration SQL

Follow the established project pattern:

```sql
-- Migration: Feature Name
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_new_feature_name ON new_feature(name);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Drop policies first (for idempotency)
DROP POLICY IF EXISTS "Admins can do everything with new_feature" ON new_feature;

-- Create policies
CREATE POLICY "Admins can do everything with new_feature" ON new_feature
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_new_feature_updated_at ON new_feature;
CREATE TRIGGER update_new_feature_updated_at
  BEFORE UPDATE ON new_feature
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete!
SELECT 'Migration NNN_feature_name completed successfully' AS status;
```

### Step 3: Create Rollback Script

Create a corresponding rollback file: `rollback_NNN_feature_name.sql`

```sql
-- Rollback: Feature Name
-- WARNING: This will permanently delete data. Ensure you have a backup.

-- Drop triggers
DROP TRIGGER IF EXISTS update_new_feature_updated_at ON new_feature;

-- Drop policies
DROP POLICY IF EXISTS "Admins can do everything with new_feature" ON new_feature;

-- Drop indexes (automatically dropped with table, but explicit for partial rollbacks)
DROP INDEX IF EXISTS idx_new_feature_name;

-- Drop tables
DROP TABLE IF EXISTS new_feature CASCADE;

-- Rollback complete
SELECT 'Rollback NNN_feature_name completed' AS status;
```

---

## Testing Migrations Locally

### Option 1: Supabase Local Development (Recommended)

```bash
# Start local Supabase (requires Docker)
supabase start

# Reset database and apply all migrations
supabase db reset

# View migration status
supabase migration list

# Run specific migration manually
supabase db execute -f supabase/migrations/NNN_feature_name.sql
```

### Option 2: Direct PostgreSQL Testing

```bash
# Create a test database
createdb mejohnc_migration_test

# Apply base schema
psql -d mejohnc_migration_test -f supabase/schema.sql

# Apply migration
psql -d mejohnc_migration_test -f supabase/migrations/NNN_feature_name.sql

# Test rollback
psql -d mejohnc_migration_test -f supabase/migrations/rollback_NNN_feature_name.sql

# Re-apply to verify idempotency
psql -d mejohnc_migration_test -f supabase/migrations/NNN_feature_name.sql

# Cleanup
dropdb mejohnc_migration_test
```

### Validation Queries

After applying a migration, verify:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'new_feature'
);

-- Check RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'new_feature';

-- Check policies exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'new_feature';

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'new_feature';

-- Check triggers exist
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'new_feature';
```

---

## Rollback Procedures

### How to Identify a Failed Migration

**Symptoms of a failed migration:**

1. **SQL Error Messages**: Check Supabase Dashboard logs or CLI output for:
   - `EXCEPTION: Missing prerequisite`
   - `ERROR: relation already exists`
   - `ERROR: duplicate key value violates unique constraint`
   - `ERROR: syntax error`

2. **Application Errors**:
   - 500 errors from API calls to affected tables
   - `relation "table_name" does not exist` in logs
   - RLS policy denials where access should be granted

3. **Verification Query Failures**:
   ```sql
   -- Check for partial migration state
   SELECT schemaname, tablename
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;

   -- Compare against expected tables from migration
   ```

4. **Supabase Dashboard Indicators**:
   - Navigate to: Database > Tables
   - Check Table Editor for missing columns or tables
   - Review Database > Logs for errors

### Step-by-Step Rollback Process

#### Phase 1: Assessment (5 minutes)

```bash
# 1. Identify the failed migration
# Check Supabase logs or recent SQL Editor executions

# 2. Document the current state
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# 3. Create a pre-rollback backup
supabase db dump --project-ref $SUPABASE_PROJECT_REF > pre_rollback_$(date +%Y%m%d_%H%M%S).sql
```

#### Phase 2: Execute Rollback (5-15 minutes)

**For complete migration rollback:**

```bash
# Execute rollback script via Supabase Dashboard SQL Editor
# Or via CLI:
psql $DATABASE_URL -f supabase/migrations/rollback_NNN_feature_name.sql
```

**For partial migration (some objects created):**

```sql
-- Identify what was created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%feature_name%';

-- Manually drop in reverse order:
-- 1. Triggers
-- 2. Policies
-- 3. Indexes (if not CASCADE)
-- 4. Tables (CASCADE will drop dependent objects)
```

#### Phase 3: Verification (5 minutes)

```sql
-- Verify rollback completed
SELECT NOT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'new_feature'
) AS rollback_successful;

-- Check no orphaned policies
SELECT policyname FROM pg_policies WHERE tablename = 'new_feature';

-- Check no orphaned triggers
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'new_feature';
```

#### Phase 4: Recovery (10-30 minutes)

1. Fix the migration script
2. Re-run local testing
3. Re-apply migration to production

### Writing Reversible Migrations

**Good: Reversible**

```sql
-- UP: Add column with default (no data migration needed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- DOWN:
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
```

**Good: Data-preserving rollback**

```sql
-- UP: Rename column
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- DOWN: Rename back
ALTER TABLE users RENAME COLUMN new_name TO old_name;
```

**Bad: Non-reversible (avoid)**

```sql
-- UP: Drop column (data loss - cannot reverse)
ALTER TABLE users DROP COLUMN important_data;
```

**Better: Soft deprecation**

```sql
-- UP: Mark column as deprecated (Phase 1)
COMMENT ON COLUMN users.old_column IS 'DEPRECATED: Use new_column instead. Will be removed in v2.0';

-- Later migration (Phase 2): After all code migrated
ALTER TABLE users DROP COLUMN IF EXISTS old_column;
```

### Emergency Rollback Procedures

**Severity 1: Production Down**

```bash
# 1. IMMEDIATELY restore from Supabase backup
# Supabase Dashboard > Settings > Database > Backups > Point-in-time Recovery

# 2. Select timestamp BEFORE migration was applied

# 3. Notify stakeholders
# Slack: #mejohnc-dev "INCIDENT: Database rollback in progress"

# 4. After restore, verify application functionality
curl -s https://mejohnc.org/api/health | jq .
```

**Severity 2: Feature Broken, Site Up**

```bash
# 1. Create backup of current state
supabase db dump --project-ref $SUPABASE_PROJECT_REF > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Execute rollback script
psql $DATABASE_URL -f supabase/migrations/rollback_NNN_feature_name.sql

# 3. Verify rollback
# Run verification queries from Phase 3 above

# 4. Deploy previous application version if needed
# Netlify: Rollback to previous deploy
```

**Severity 3: Data Corruption**

```sql
-- 1. Identify affected rows
SELECT * FROM affected_table
WHERE updated_at > 'timestamp_of_migration'
LIMIT 100;

-- 2. If localized, fix data directly
UPDATE affected_table
SET column = correct_value
WHERE condition;

-- 3. If widespread, restore from backup and replay valid transactions
```

---

## Migration Naming Conventions

### File Naming

```
NNN_descriptive_name.sql
```

| Component | Format | Example |
|-----------|--------|---------|
| Sequence Number | 3 digits, zero-padded | `001`, `002`, `003` |
| Separator | Underscore | `_` |
| Description | snake_case, verb_noun | `add_user_preferences`, `create_metrics_tables` |
| Extension | `.sql` | `.sql` |

### Examples

| Migration | File Name |
|-----------|-----------|
| Add user table | `001_create_users.sql` |
| Add email index | `002_add_user_email_index.sql` |
| Add preferences column | `003_add_user_preferences.sql` |
| Create metrics system | `004_create_metrics_tables.sql` |
| Add RLS to metrics | `005_add_metrics_rls_policies.sql` |

### Rollback File Naming

```
rollback_NNN_descriptive_name.sql
```

Store rollback files in the same `migrations/` directory or a dedicated `migrations/rollbacks/` subdirectory.

### Phase-Based Naming (Current Project Pattern)

For grouped feature releases:

```
003_task_system.sql      # Phase 3: Task management
003_site_builder.sql     # Phase 3: Site builder
003_marketing.sql        # Phase 3: Marketing
COMBINED_PHASE3_MIGRATION.sql  # All Phase 3 combined
```

---

## Pre-Deployment Checklist

### 1. Code Review

- [ ] Migration reviewed by at least one other developer
- [ ] Rollback script exists and has been reviewed
- [ ] SQL syntax validated (no obvious errors)
- [ ] Idempotent patterns used (`IF NOT EXISTS`, `IF EXISTS`)

### 2. Local Testing

- [ ] Migration applies cleanly to fresh database
- [ ] Migration applies cleanly when re-run (idempotent)
- [ ] Rollback script works correctly
- [ ] Migration re-applies after rollback
- [ ] Application functions correctly with new schema

### 3. Staging Verification

- [ ] Applied to staging/preview environment
- [ ] Application tested against staging database
- [ ] Performance acceptable (no slow queries)
- [ ] No RLS policy violations in normal usage

### 4. Production Preparation

- [ ] Backup created before migration
  ```bash
  supabase db dump --project-ref $SUPABASE_PROJECT_REF > pre_migration_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified
- [ ] Rollback procedure documented and ready
- [ ] Monitoring dashboards open

### 5. Documentation

- [ ] Migration description in file header
- [ ] ADR updated if architectural decision
- [ ] README or CHANGELOG updated
- [ ] Related issue/PR linked

---

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

```sql
-- 1. Verify tables created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('expected_table_1', 'expected_table_2');

-- 2. Verify RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('expected_table_1', 'expected_table_2');

-- 3. Verify policies created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('expected_table_1', 'expected_table_2');

-- 4. Verify indexes created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('expected_table_1', 'expected_table_2');
```

### Application Checks (5-15 minutes)

```bash
# Health check endpoint
curl -s https://mejohnc.org/api/health | jq .

# Test affected API endpoints
curl -s https://mejohnc.org/api/affected-resource | jq .

# Check for errors in Netlify Functions logs
# Netlify Dashboard > Functions > Logs
```

### Monitoring (15-60 minutes)

- [ ] No increase in error rates
- [ ] Response times within normal range
- [ ] No RLS policy denials in logs
- [ ] No database connection issues
- [ ] Supabase Dashboard > Database > Health shows normal

### Sign-off

```markdown
## Migration Deployment Record

**Migration**: NNN_feature_name.sql
**Date**: YYYY-MM-DD HH:MM UTC
**Deployed By**: [Name]

### Verification
- [x] Tables created successfully
- [x] RLS policies active
- [x] Application health check passed
- [x] 30 minutes monitoring - no issues

### Notes
[Any observations or issues encountered]

**Status**: COMPLETE
```

---

## Common Pitfalls and How to Avoid Them

### 1. Missing Prerequisites

**Problem**: Migration fails because `is_admin()` or `update_updated_at_column()` don't exist.

**Solution**: Always include prerequisite verification:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
END $$;
```

### 2. Non-Idempotent Migrations

**Problem**: Migration fails on re-run with "already exists" errors.

**Bad**:
```sql
CREATE TABLE users (...);  -- Fails if table exists
CREATE INDEX idx_users_email ON users(email);  -- Fails if index exists
```

**Good**:
```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 3. RLS Policy Conflicts

**Problem**: "policy already exists" error when re-running migration.

**Solution**: Drop before create:

```sql
DROP POLICY IF EXISTS "Policy name" ON table_name;
CREATE POLICY "Policy name" ON table_name FOR ALL USING (is_admin());
```

### 4. Trigger Conflicts

**Problem**: "trigger already exists" error.

**Solution**: Drop before create:

```sql
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. Foreign Key Violations

**Problem**: Cannot drop table due to foreign key references.

**Solution**: Use CASCADE (carefully):

```sql
-- This will drop dependent foreign keys and referencing rows
DROP TABLE IF EXISTS parent_table CASCADE;
```

**Better Solution**: Drop in correct order:

```sql
DROP TABLE IF EXISTS child_table;
DROP TABLE IF EXISTS parent_table;
```

### 6. Long-Running Migrations on Large Tables

**Problem**: Adding column with default to large table locks table.

**Problematic**:
```sql
ALTER TABLE large_table ADD COLUMN new_col TEXT DEFAULT 'value';
-- Locks table while rewriting all rows
```

**Better** (PostgreSQL 11+):
```sql
-- Add column without default (instant)
ALTER TABLE large_table ADD COLUMN new_col TEXT;

-- Set default for new rows (instant)
ALTER TABLE large_table ALTER COLUMN new_col SET DEFAULT 'value';

-- Backfill in batches (no lock)
UPDATE large_table SET new_col = 'value' WHERE new_col IS NULL AND id < 1000;
UPDATE large_table SET new_col = 'value' WHERE new_col IS NULL AND id < 2000;
-- etc.
```

### 7. Seed Data Conflicts

**Problem**: Seed data INSERT fails on re-run due to unique constraint.

**Solution**: Use ON CONFLICT:

```sql
INSERT INTO categories (slug, name, color) VALUES
  ('development', 'Development', 'blue'),
  ('design', 'Design', 'purple')
ON CONFLICT (slug) DO NOTHING;
```

### 8. Forgetting to Enable RLS

**Problem**: Table created without RLS, exposing data publicly.

**Solution**: Always enable RLS immediately after table creation:

```sql
CREATE TABLE IF NOT EXISTS sensitive_data (...);

-- IMMEDIATELY enable RLS
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- Then create policies
CREATE POLICY "..." ON sensitive_data ...;
```

### 9. Testing Only Happy Path

**Problem**: Migration works for new data but breaks existing data.

**Solution**: Test with realistic data:

```bash
# Dump production data (sanitized)
supabase db dump --data-only > test_data.sql

# Apply to local test database
psql -d test_db -f test_data.sql

# Then apply migration
psql -d test_db -f migration.sql
```

### 10. No Rollback Plan

**Problem**: Migration fails and no way to undo.

**Solution**: Always create rollback script before deploying.

---

## Migration Templates

### Template: New Table with Full Infrastructure

```sql
-- Migration: Create [Feature] Tables
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS feature_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feature_items_slug ON feature_items(slug);
CREATE INDEX IF NOT EXISTS idx_feature_items_status ON feature_items(status);
CREATE INDEX IF NOT EXISTS idx_feature_items_created_by ON feature_items(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_items_created ON feature_items(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

-- Drop policies first (idempotent)
DROP POLICY IF EXISTS "Public can view published feature_items" ON feature_items;
DROP POLICY IF EXISTS "Admins can do everything with feature_items" ON feature_items;

-- Public read for published items
CREATE POLICY "Public can view published feature_items" ON feature_items
  FOR SELECT USING (status = 'published');

-- Admin full access
CREATE POLICY "Admins can do everything with feature_items" ON feature_items
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_feature_items_updated_at ON feature_items;
CREATE TRIGGER update_feature_items_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional)
-- ============================================

INSERT INTO feature_items (name, slug, description, status, created_by) VALUES
  ('Example Item', 'example-item', 'An example item', 'published', 'system')
ON CONFLICT (slug) DO NOTHING;

-- Migration complete!
SELECT 'Migration NNN_create_feature_items completed successfully' AS status;
```

### Template: Rollback Script

```sql
-- Rollback: [Feature] Tables
-- WARNING: This will permanently delete all data in these tables.
-- Ensure you have a backup before executing.

-- ============================================
-- DROP TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_feature_items_updated_at ON feature_items;

-- ============================================
-- DROP POLICIES
-- ============================================

DROP POLICY IF EXISTS "Public can view published feature_items" ON feature_items;
DROP POLICY IF EXISTS "Admins can do everything with feature_items" ON feature_items;

-- ============================================
-- DROP INDEXES
-- (Automatically dropped with table, but explicit for partial rollbacks)
-- ============================================

DROP INDEX IF EXISTS idx_feature_items_slug;
DROP INDEX IF EXISTS idx_feature_items_status;
DROP INDEX IF EXISTS idx_feature_items_created_by;
DROP INDEX IF EXISTS idx_feature_items_created;

-- ============================================
-- DROP TABLES
-- ============================================

DROP TABLE IF EXISTS feature_items CASCADE;

-- Rollback complete!
SELECT 'Rollback NNN_create_feature_items completed' AS status;
```

### Template: Add Column to Existing Table

```sql
-- Migration: Add [Column] to [Table]
-- Prerequisites: Table must exist

-- ============================================
-- ADD COLUMN
-- ============================================

ALTER TABLE existing_table
ADD COLUMN IF NOT EXISTS new_column TEXT DEFAULT 'default_value';

-- Add index if frequently queried
CREATE INDEX IF NOT EXISTS idx_existing_table_new_column
ON existing_table(new_column);

-- Migration complete!
SELECT 'Migration NNN_add_new_column completed successfully' AS status;
```

### Template: Add Column Rollback

```sql
-- Rollback: Remove [Column] from [Table]

DROP INDEX IF EXISTS idx_existing_table_new_column;
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

SELECT 'Rollback NNN_add_new_column completed' AS status;
```

### Template: Create Helper Function

```sql
-- Migration: Add [Function Name] Function

CREATE OR REPLACE FUNCTION my_helper_function(param1 TEXT, param2 INTEGER)
RETURNS TABLE (
  result_col1 TEXT,
  result_col2 INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Function implementation
  RETURN QUERY
  SELECT col1, col2
  FROM some_table
  WHERE condition = param1
  LIMIT param2;
END;
$$;

-- Grant execute to authenticated users (if needed)
-- GRANT EXECUTE ON FUNCTION my_helper_function TO authenticated;

SELECT 'Migration NNN_add_helper_function completed successfully' AS status;
```

### Template: Function Rollback

```sql
-- Rollback: Remove [Function Name] Function

DROP FUNCTION IF EXISTS my_helper_function(TEXT, INTEGER);

SELECT 'Rollback NNN_add_helper_function completed' AS status;
```

---

## Related Documentation

- [Database Runbook](./database-runbook.md) - Day-to-day database operations
- [ADR-0004: Supabase Database Architecture](../adr/0004-supabase-database-architecture.md) - Architecture decisions
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Database credentials
- [Deployment Runbook](./deployment-runbook.md) - Deployment procedures
- [Incident Response](./incident-response.md) - Incident handling

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Create migration
supabase migration new feature_name

# Apply migrations locally
supabase db reset

# Push to production
supabase db push --project-ref $SUPABASE_PROJECT_REF

# Create backup
supabase db dump --project-ref $SUPABASE_PROJECT_REF > backup.sql

# List migrations
supabase migration list
```

### Essential SQL Patterns

```sql
-- Idempotent table creation
CREATE TABLE IF NOT EXISTS table_name (...);

-- Idempotent index creation
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- Idempotent policy (drop then create)
DROP POLICY IF EXISTS "Policy Name" ON table_name;
CREATE POLICY "Policy Name" ON table_name ...;

-- Idempotent trigger (drop then create)
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;

-- Idempotent seed data
INSERT INTO table_name (...) VALUES (...) ON CONFLICT (unique_col) DO NOTHING;

-- Idempotent column addition
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS col_name TYPE;
```
