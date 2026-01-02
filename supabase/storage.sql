-- Storage Setup for Resume Site
-- Run this in Supabase SQL Editor after creating the storage bucket in the dashboard

-- First, create the bucket in Supabase Dashboard:
-- Storage > New Bucket > Name: "uploads" > Public: true

-- Then run these policies:

-- Allow public read access to uploaded files
CREATE POLICY "Public can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow authenticated admins to upload files
CREATE POLICY "Admins can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow authenticated admins to update files
CREATE POLICY "Admins can update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Allow authenticated admins to delete files
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  )
);
