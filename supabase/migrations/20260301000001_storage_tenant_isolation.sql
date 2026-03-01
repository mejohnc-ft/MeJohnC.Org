-- Storage Tenant Isolation
-- Replaces legacy storage RLS policies with tenant-aware versions.
-- INSERT/UPDATE/DELETE now validate that the first path segment matches
-- app.current_tenant_id(), preventing cross-tenant file access.

-- ============================================
-- DROP LEGACY POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;

-- ============================================
-- TENANT-AWARE POLICIES
-- ============================================

-- SELECT: Public read stays (public bucket)
CREATE POLICY "Public can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- INSERT: Admin check + path prefix must match current tenant
CREATE POLICY "Tenant-scoped admin uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);

-- UPDATE: Admin check + path prefix must match current tenant
CREATE POLICY "Tenant-scoped admin updates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);

-- DELETE: Admin check + path prefix must match current tenant
CREATE POLICY "Tenant-scoped admin deletes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);
