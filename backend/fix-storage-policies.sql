-- Fix Supabase Storage Policies for custom-files bucket
-- Run this in Supabase SQL Editor

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-files', 'custom-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their files" ON storage.objects;

-- Create comprehensive policies for custom-files bucket

-- 1. Allow authenticated users (professors) to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'custom-files');

-- 2. Allow public read access (students need to download rubrics/evaluations)
CREATE POLICY "Allow public to read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'custom-files');

-- 3. Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'custom-files')
WITH CHECK (bucket_id = 'custom-files');

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'custom-files');

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

