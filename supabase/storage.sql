-- Storage Setup for Multi-Tenant Site
-- Run this in Supabase SQL Editor after creating the storage bucket in the dashboard

-- First, create the bucket in Supabase Dashboard:
-- Storage > New Bucket > Name: "uploads" > Public: true

-- Then run these policies:

-- Allow public read access to uploaded files
CREATE POLICY "Public can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow tenant-scoped admin uploads
-- Path prefix must match current tenant ID (e.g. {tenant-uuid}/images/photo.png)
CREATE POLICY "Tenant-scoped admin uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);

-- Allow tenant-scoped admin updates
CREATE POLICY "Tenant-scoped admin updates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);

-- Allow tenant-scoped admin deletes
CREATE POLICY "Tenant-scoped admin deletes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads'
  AND is_admin()
  AND (storage.foldername(name))[1] = app.current_tenant_id()::text
);
