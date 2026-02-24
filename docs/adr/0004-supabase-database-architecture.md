# ADR-0004: Supabase Database Architecture

## Status

Accepted

**Date:** 2025-01-20

## Context

The application requires persistent storage for:

- Portfolio content (apps, projects, blog posts, work history)
- CRM and contact management
- News aggregation and bookmarks
- Task management
- AI agent sessions and commands
- Audit logging

Requirements included:

- Real-time capabilities for admin dashboard updates
- Row-level security for multi-tenant-style access control
- PostgreSQL features (JSON, arrays, full-text search)
- Edge functions for serverless backend logic
- Minimal DevOps overhead

## Decision

We chose **Supabase** as the backend-as-a-service platform with the following architecture:

### Database Schema Organization

The database schema is defined entirely through timestamped migration files in `supabase/migrations/`. The foundation migration (`20240101000000_foundation.sql`) consolidates all pre-2026 schema, and subsequent feature migrations add domain-specific tables:

| Migration          | Tables                                                                                                                                                                               | Purpose                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `foundation.sql`   | `apps`, `app_suites`, `blog_posts`, `projects`, `site_content`, `contact_links`, `work_history`, `case_studies`, `timelines`, `timeline_entries`, `admin_users`, `news_*`, `agent_*` | Consolidated base schema        |
| `bookmarks.sql`    | `bookmarks`, `bookmark_tags`, `bookmark_folders`                                                                                                                                     | Bookmark management             |
| `tasks.sql`        | `task_categories`, `tasks`, `task_comments`, `task_reminders`                                                                                                                        | Task management                 |
| `crm.sql`          | CRM-related tables                                                                                                                                                                   | Contact relationship management |
| `marketing.sql`    | `email_*`, `nps_*`                                                                                                                                                                   | Marketing and email campaigns   |
| `site_builder.sql` | `sb_pages`, `sb_page_versions`, `sb_page_components`, `sb_component_templates`                                                                                                       | Visual page builder             |

### Data Access Patterns

1. **Query Functions** (`src/lib/*-queries.ts`):
   - Typed query functions encapsulate Supabase calls
   - Each feature domain has its own queries file
   - Functions return typed responses using TypeScript interfaces

2. **Supabase Client Configuration**:
   - Anonymous client for public read operations
   - Authenticated client with Clerk JWT for admin operations
   - Client singleton pattern with refresh capability

### Row Level Security Strategy

```sql
-- Public read for published content
CREATE POLICY "Public can view published blog posts" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Admin full access via JWT verification
CREATE POLICY "Admins can do everything with blog_posts" ON blog_posts
  FOR ALL USING (is_admin());

-- is_admin() checks email against admin_users table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Edge Functions (Supabase Functions)

Located in `supabase/functions/`:

- Deno runtime for server-side logic
- Shared utilities in `_shared/` directory
- Used for operations requiring server-side secrets

### Indexing Strategy

Performance-critical columns are indexed:

- All `slug` columns (unique lookups)
- `status` columns (filtered queries)
- `order_index` columns (sorted lists)
- Foreign key columns (joins)

## Consequences

### Positive

- **Zero backend maintenance**: Supabase manages infrastructure, backups, and scaling
- **Real-time ready**: WebSocket subscriptions available for live updates
- **PostgreSQL power**: Full access to PostgreSQL features (JSON, arrays, CTEs)
- **Type generation**: Supabase CLI can generate TypeScript types from schema
- **Generous free tier**: Sufficient for personal/small projects

### Negative

- **Vendor lock-in**: RLS policies and functions are Supabase-specific
- **Limited compute**: Edge functions have execution time limits
- **Schema migrations**: Manual SQL migrations (no built-in ORM migration)
- **Local development**: Requires Docker for local Supabase emulation

### Neutral

- PostgreSQL version is managed by Supabase
- Storage (for images/files) is available but not heavily used
- Real-time features are available but not fully utilized

## Schema Design Principles

1. **UUIDs for primary keys**: Prevents enumeration attacks, works well with distributed systems
2. **Soft deletes via status**: Content uses `status` field (draft, published, archived) instead of hard deletes
3. **Timestamp tracking**: All tables have `created_at` and `updated_at` with automatic triggers
4. **Array columns**: PostgreSQL arrays for tech stacks, tags, highlights (avoids join tables for simple lists)
5. **Order indexes**: Explicit `order_index` columns for user-controlled sorting

## Alternatives Considered

### Alternative 1: Firebase/Firestore

Firebase was considered for its real-time capabilities:

- NoSQL document model is less suitable for relational portfolio data
- Firebase Auth would be another auth provider to manage
- PostgreSQL's query capabilities are more powerful

### Alternative 2: PlanetScale (MySQL)

PlanetScale was considered for its branching workflow:

- No built-in RLS (would require application-level security)
- Lacks real-time subscriptions
- MySQL has fewer features than PostgreSQL

### Alternative 3: Self-Hosted PostgreSQL

Running PostgreSQL on a VPS:

- Requires DevOps expertise for maintenance, backups, scaling
- No built-in real-time or auth integration
- Higher operational burden for a personal project

### Alternative 4: Prisma ORM

Using Prisma for database access:

- Adds build complexity and bundle size
- Supabase's query builder is sufficient for this project's needs
- RLS provides security that Prisma would need middleware to replicate

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- `supabase/migrations/` - Timestamped database migrations
- `src/lib/supabase.ts` - Client configuration
- `src/lib/supabase-queries.ts` - Main query functions
