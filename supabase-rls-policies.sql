-- ============================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable RLS on all tables
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public read for apps" ON apps;
DROP POLICY IF EXISTS "Admin write for apps" ON apps;
DROP POLICY IF EXISTS "Public read for app_suites" ON app_suites;
DROP POLICY IF EXISTS "Admin write for app_suites" ON app_suites;
DROP POLICY IF EXISTS "Public read for blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin write for blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Public read for projects" ON projects;
DROP POLICY IF EXISTS "Admin write for projects" ON projects;
DROP POLICY IF EXISTS "Public read for site_content" ON site_content;
DROP POLICY IF EXISTS "Admin write for site_content" ON site_content;

-- ============================================
-- APPS TABLE
-- ============================================

-- Anyone can read non-archived apps
CREATE POLICY "Public read for apps" ON apps
FOR SELECT
USING (status != 'archived');

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admin write for apps" ON apps
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- APP_SUITES TABLE
-- ============================================

-- Anyone can read suites
CREATE POLICY "Public read for app_suites" ON app_suites
FOR SELECT
USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admin write for app_suites" ON app_suites
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- BLOG_POSTS TABLE
-- ============================================

-- Anyone can read published posts
CREATE POLICY "Public read for blog_posts" ON blog_posts
FOR SELECT
USING (status = 'published');

-- Admins can read ALL posts (including drafts)
CREATE POLICY "Admin read all blog_posts" ON blog_posts
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admin write for blog_posts" ON blog_posts
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- PROJECTS TABLE
-- ============================================

-- Anyone can read published projects
CREATE POLICY "Public read for projects" ON projects
FOR SELECT
USING (status = 'published');

-- Admins can read ALL projects (including drafts)
CREATE POLICY "Admin read all projects" ON projects
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admin write for projects" ON projects
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- SITE_CONTENT TABLE
-- ============================================

-- Anyone can read site content
CREATE POLICY "Public read for site_content" ON site_content
FOR SELECT
USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Admin write for site_content" ON site_content
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- STORAGE BUCKET POLICIES (for image uploads)
-- ============================================

-- Run these separately if you have a storage bucket called 'mejohnc.org'

-- Allow public read access to all files
-- INSERT INTO storage.policies (name, bucket_id, definition)
-- VALUES (
--   'Public read access',
--   'mejohnc.org',
--   '{"select": true}'
-- );

-- For storage, use the Supabase Dashboard:
-- 1. Go to Storage > mejohnc.org bucket > Policies
-- 2. Add policy: "Allow public read" - SELECT for anon
-- 3. Add policy: "Allow admin upload" - INSERT/UPDATE/DELETE for authenticated with role=admin

-- ============================================
-- VERIFY POLICIES ARE APPLIED
-- ============================================

-- Run this to check RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('apps', 'app_suites', 'blog_posts', 'projects', 'site_content');

-- Run this to list all policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
