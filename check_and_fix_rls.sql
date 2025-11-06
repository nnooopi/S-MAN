-- ============================================================================
-- CHECK AND FIX RLS POLICIES ON course_groups
-- ============================================================================

-- 1. Check if RLS is enabled on course_groups
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'course_groups';

-- 2. Show all existing policies on course_groups
SELECT 
    'EXISTING POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'course_groups';

-- 3. Test if service role can read the group
-- (This should work even with RLS if service role bypass is working)
SET ROLE service_role;
SELECT 
    'SERVICE ROLE TEST' as test,
    id,
    course_id,
    group_number
FROM course_groups
WHERE id = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
RESET ROLE;

-- 4. Add a policy to allow service_role to read all groups
-- (Service role should bypass RLS, but let's be explicit)
DO $$
BEGIN
    -- Drop if exists
    DROP POLICY IF EXISTS "Service role can read all groups" ON course_groups;
    
    -- Create new policy
    CREATE POLICY "Service role can read all groups"
        ON course_groups
        FOR SELECT
        TO service_role
        USING (true);
    
    RAISE NOTICE '✅ Added service_role read policy to course_groups';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  Policy already exists';
END $$;

-- 5. Add policy for authenticated users (students/professors)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read groups in their courses" ON course_groups;
    
    CREATE POLICY "Users can read groups in their courses"
        ON course_groups
        FOR SELECT
        TO authenticated
        USING (
            -- Students can see groups in courses they're enrolled in
            course_id IN (
                SELECT course_id 
                FROM course_students 
                WHERE student_id = auth.uid() AND is_active = true
            )
            OR
            -- Professors can see groups in courses they teach
            course_id IN (
                SELECT id 
                FROM courses 
                WHERE professor_id = auth.uid()
            )
            OR
            -- Group members can see their own group
            id IN (
                SELECT group_id 
                FROM course_group_members 
                WHERE student_id = auth.uid() AND is_active = true
            )
        );
    
    RAISE NOTICE '✅ Added authenticated user read policy to course_groups';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  Policy already exists';
END $$;

-- 6. Verify the fix - test the exact query the backend is using
SELECT 
    '✅ VERIFICATION - Direct Query' as test,
    id,
    course_id,
    group_number,
    group_name
FROM course_groups
WHERE id = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';

-- 7. Show all policies after fix
SELECT 
    '✅ UPDATED POLICIES' as status,
    policyname,
    roles,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'course_groups'
ORDER BY policyname;

