-- Fix RLS policy violation on custom-files bucket
-- Run this in Supabase SQL Editor to allow file uploads

-- 1. Disable RLS on storage.objects table (allows public uploads to custom-files bucket)
-- This makes the bucket truly public for uploads
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Alternative: If you need RLS enabled but want to allow service role uploads
-- Create a policy that allows service role to upload (if RLS is re-enabled)
CREATE POLICY "Allow service role to upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated, service_role
  USING (bucket_id = 'custom-files')
  WITH CHECK (bucket_id = 'custom-files');

-- 3. Allow public read access to custom-files bucket
CREATE POLICY "Allow public read access to custom-files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'custom-files');

-- 4. Verify bucket exists and is public
SELECT id, name, public FROM storage.buckets WHERE name = 'custom-files';

-- 5. Check current RLS status on storage.objects
SELECT tablename, array_agg(policyname) as policies
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
GROUP BY tablename;
