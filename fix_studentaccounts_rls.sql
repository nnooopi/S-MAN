-- ============================================================================
-- CHECK AND FIX RLS POLICIES ON studentaccounts TABLE - ONE TIME EXECUTION
-- ============================================================================

-- Step 1: Check current RLS status and add service_role policy
DO $$
BEGIN
    -- Add service role read policy
    BEGIN
        CREATE POLICY "Service role can read all students"
            ON studentaccounts
            FOR SELECT
            TO service_role
            USING (true);
        RAISE NOTICE '✅ Created service_role policy for studentaccounts';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  Service role policy already exists';
    END;
    
    -- Add authenticated users policy (students can see other students in their courses)
    BEGIN
        CREATE POLICY "Students can read accounts in their groups"
            ON studentaccounts
            FOR SELECT
            TO authenticated
            USING (
                -- Users can see themselves
                id = auth.uid()
                OR
                -- Users can see members in their groups
                id IN (
                    SELECT cgm.student_id
                    FROM course_group_members cgm
                    WHERE cgm.group_id IN (
                        SELECT group_id 
                        FROM course_group_members 
                        WHERE student_id = auth.uid()
                    )
                )
            );
        RAISE NOTICE '✅ Created authenticated user policy for studentaccounts';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  Authenticated user policy already exists';
    END;
END $$;

-- Verify the fix - show final policies
SELECT 
    '✅ FINAL POLICIES' as status,
    schemaname,
    tablename,
    policyname,
    roles
FROM pg_policies
WHERE tablename = 'studentaccounts'
ORDER BY policyname;

