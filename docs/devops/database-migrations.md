# Database Migration Strategy

This document defines the migration strategy, procedures, and rollback mechanisms for the MeJohnC.Org Supabase/PostgreSQL database.

---

## Table of Contents

1. [Migration Strategy Overview](#migration-strategy-overview)
2. [Creating New Migrations](#creating-new-migrations)
3. [Testing Migrations Locally](#testing-migrations-locally)
4. [Fresh Provisioning](#fresh-provisioning)
5. [Rollback Procedures](#rollback-procedures)
6. [Migration Naming Conventions](#migration-naming-conventions)
7. [Pre-Deployment Checklist](#pre-deployment-checklist)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Common Pitfalls and How to Avoid Them](#common-pitfalls-and-how-to-avoid-them)
10. [Migration Templates](#migration-templates)

---

## Migration Strategy Overview

### Architecture

MeJohnC.Org uses **Supabase** (PostgreSQL) with timestamped migration files managed by the Supabase CLI:

```
supabase/
├── migrations/                              # Timestamped migration files (canonical)
│   ├── 20240101000000_foundation.sql        # Consolidated pre-2026 schema
│   ├── 20250101000000_ensure_app_schema.sql # App schema bootstrap
│   ├── 20250601000001_bookmarks.sql         # Feature modules...
│   ├── 20250601000002_tasks.sql
│   ├── 20250601000003_crm.sql
│   ├── ...
│   └── 20260221100002_fix_session_upsert.sql
├── functions/                               # Edge functions (Deno)
│   └── _shared/                             # Shared utilities
└── _archived_migrations/                    # Historical reference only
```

### How Migrations Are Applied

Migrations are applied automatically via CI (`.github/workflows/migrate.yml`):

1. Push to `main` with changes in `supabase/migrations/**`
2. GitHub Actions checks out the repo
3. Supabase CLI links to the project
4. `supabase db push` applies any unapplied migrations in timestamp order

### Key Principles

1. **Idempotency**: All migrations use `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`, and `ON CONFLICT DO NOTHING` to be safely re-runnable
2. **Timestamped ordering**: Files are named `YYYYMMDDHHMMSS_description.sql` — the Supabase CLI sorts and applies them in order
3. **Transaction safety**: Each migration should be atomic and transactional
4. **RLS first**: Row Level Security is enabled and policies created in every migration
5. **No static snapshots**: We do not maintain a combined `FULL_MIGRATION.sql` — `supabase db push` against a fresh project is the canonical provisioning path

---

## Creating New Migrations

### Step 1: Generate Migration File

```bash
# Using Supabase CLI (recommended)
supabase migration new feature_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql
```

### Step 2: Write Migration SQL

Follow the established project pattern:

```sql
-- Migration: Feature Name
-- Prerequisites: foundation migration must be applied first
-- This migration is idempotent and safe to re-run

-- ============================================
-- TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
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
```

### Option 2: Direct PostgreSQL Testing

```bash
# Create a test database
createdb mejohnc_migration_test

# Apply all migrations in order
supabase db push --local

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
```

---

## Fresh Provisioning

To provision a brand-new Supabase project with the full schema:

```bash
# 1. Link to the new project
supabase link --project-ref <new-project-ref>

# 2. Push all migrations (applies them in timestamp order)
supabase db push
```

This applies `20240101000000_foundation.sql` first (which creates all base tables, functions, RLS policies, and triggers), then each subsequent feature migration in order. All migrations are idempotent, so this is safe to run against partially-provisioned projects too.

There is no static `FULL_MIGRATION.sql` file — previous versions (v1, v2, v3) went stale immediately and have been removed. The migration chain is the single source of truth.

---

## Rollback Procedures

### How to Identify a Failed Migration

**Symptoms of a failed migration:**

1. **SQL Error Messages**: Check CI logs or Supabase Dashboard for:
   - `ERROR: relation already exists`
   - `ERROR: duplicate key value violates unique constraint`
   - `ERROR: syntax error`

2. **Application Errors**:
   - 500 errors from API calls to affected tables
   - `relation "table_name" does not exist` in logs

### Step-by-Step Rollback Process

#### Phase 1: Assessment (5 minutes)

```bash
# 1. Check CI logs for the failed migration

# 2. Create a pre-rollback backup
supabase db dump --project-ref $SUPABASE_PROJECT_REF > pre_rollback_$(date +%Y%m%d_%H%M%S).sql
```

#### Phase 2: Execute Rollback (5-15 minutes)

```sql
-- Manually reverse the failed migration via Supabase Dashboard SQL Editor
-- Drop in reverse order: triggers → policies → indexes → tables

DROP TRIGGER IF EXISTS trigger_name ON table_name;
DROP POLICY IF EXISTS "Policy name" ON table_name;
DROP INDEX IF EXISTS idx_name;
DROP TABLE IF EXISTS table_name CASCADE;
```

Then mark the migration as reverted so `db push` skips it:

```bash
supabase migration repair --status reverted YYYYMMDDHHMMSS
```

#### Phase 3: Verification (5 minutes)

```sql
-- Verify rollback completed
SELECT NOT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'table_name'
) AS rollback_successful;
```

### Emergency Rollback

**Production Down**: Use Supabase Point-in-time Recovery

- Dashboard > Settings > Database > Backups > Point-in-time Recovery
- Select timestamp BEFORE migration was applied

**Feature Broken, Site Up**: Execute targeted rollback SQL via Dashboard SQL Editor, then deploy previous application version via Netlify rollback if needed.

### Writing Reversible Migrations

**Good: Reversible**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
-- Rollback: ALTER TABLE users DROP COLUMN IF EXISTS preferences;
```

**Bad: Non-reversible (avoid)**

```sql
ALTER TABLE users DROP COLUMN important_data;
```

---

## Migration Naming Conventions

### File Naming

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Generated by `supabase migration new`. The timestamp prefix ensures correct ordering.

| Component   | Format                | Example                |
| ----------- | --------------------- | ---------------------- |
| Timestamp   | 14 digits             | `20260224120000`       |
| Separator   | Underscore            | `_`                    |
| Description | snake_case, verb_noun | `add_user_preferences` |
| Extension   | `.sql`                | `.sql`                 |

---

## Pre-Deployment Checklist

- [ ] Migration uses idempotent patterns (`IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`)
- [ ] RLS enabled on new tables with appropriate policies
- [ ] Migration applies cleanly to fresh database (`supabase db reset`)
- [ ] Migration applies cleanly when re-run (idempotent)
- [ ] Application functions correctly with new schema
- [ ] Backup created before production push

---

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

```sql
-- Verify tables created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('expected_table');

-- Verify RLS enabled
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('expected_table');

-- Verify policies created
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('expected_table');
```

### Application Checks (5-15 minutes)

- Health check endpoint responds
- Affected API endpoints return expected data
- No new errors in Netlify Functions logs

---

## Common Pitfalls and How to Avoid Them

### 1. Non-Idempotent Migrations

**Bad:**

```sql
CREATE TABLE users (...);  -- Fails if table exists
```

**Good:**

```sql
CREATE TABLE IF NOT EXISTS users (...);
```

### 2. RLS Policy Conflicts

**Solution:** Drop before create:

```sql
DROP POLICY IF EXISTS "Policy name" ON table_name;
CREATE POLICY "Policy name" ON table_name FOR ALL USING (is_admin());
```

### 3. Trigger Conflicts

**Solution:** Drop before create:

```sql
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Seed Data Conflicts

**Solution:** Use ON CONFLICT:

```sql
INSERT INTO categories (slug, name) VALUES ('dev', 'Development')
ON CONFLICT (slug) DO NOTHING;
```

### 5. Forgetting to Enable RLS

Always enable RLS immediately after table creation:

```sql
CREATE TABLE IF NOT EXISTS sensitive_data (...);
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
```

### 6. Long-Running Migrations on Large Tables

Add columns without defaults first, then backfill in batches:

```sql
ALTER TABLE large_table ADD COLUMN new_col TEXT;
ALTER TABLE large_table ALTER COLUMN new_col SET DEFAULT 'value';
-- Backfill in batches
UPDATE large_table SET new_col = 'value' WHERE new_col IS NULL AND id < 1000;
```

---

## Migration Templates

### Template: New Table with Full Infrastructure

```sql
-- Migration: Create [Feature] Tables
-- This migration is idempotent and safe to re-run

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

CREATE INDEX IF NOT EXISTS idx_feature_items_slug ON feature_items(slug);
CREATE INDEX IF NOT EXISTS idx_feature_items_status ON feature_items(status);

ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published feature_items" ON feature_items;
DROP POLICY IF EXISTS "Admins can do everything with feature_items" ON feature_items;

CREATE POLICY "Public can view published feature_items" ON feature_items
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can do everything with feature_items" ON feature_items
  FOR ALL USING (is_admin());

DROP TRIGGER IF EXISTS update_feature_items_updated_at ON feature_items;
CREATE TRIGGER update_feature_items_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Template: Add Column to Existing Table

```sql
ALTER TABLE existing_table
ADD COLUMN IF NOT EXISTS new_column TEXT DEFAULT 'default_value';

CREATE INDEX IF NOT EXISTS idx_existing_table_new_column
ON existing_table(new_column);
```

### Template: Create Helper Function

```sql
CREATE OR REPLACE FUNCTION my_helper_function(param1 TEXT, param2 INTEGER)
RETURNS TABLE (result_col1 TEXT, result_col2 INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT col1, col2 FROM some_table
  WHERE condition = param1
  LIMIT param2;
END;
$$;
```

---

## Related Documentation

- [Database Runbook](../runbooks/database-runbook.md) - Day-to-day database operations
- [ADR-0004: Supabase Database Architecture](../adr/0004-supabase-database-architecture.md) - Architecture decisions
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Database credentials
- [Deployment Runbook](../runbooks/deployment-runbook.md) - Deployment procedures
- [Incident Response](../runbooks/incident-response.md) - Incident handling
