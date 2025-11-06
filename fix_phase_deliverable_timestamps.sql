-- =============================================
-- FIX PHASE_DELIVERABLE_SUBMISSIONS TIMESTAMP COLUMNS
-- Step 1: Drop RLS policies that depend on timestamp columns
-- Step 2: Change column types from timestamptz to timestamp
-- Step 3: Recreate all RLS policies
-- =============================================

-- ============================================================================
-- STEP 1: DROP ALL RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS phase_deliverable_submissions_student_select ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_leader_insert ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_leader_update ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_instructor_select ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_instructor_update ON phase_deliverable_submissions;

-- ============================================================================
-- STEP 2: ALTER COLUMN TYPES
-- ============================================================================

ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN submitted_at TYPE timestamp without time zone,
  ALTER COLUMN graded_at TYPE timestamp without time zone,
  ALTER COLUMN created_at TYPE timestamp without time zone,
  ALTER COLUMN updated_at TYPE timestamp without time zone;

-- ============================================================================
-- STEP 3: RECREATE ALL RLS POLICIES
-- ============================================================================

-- Students can view their own group's submissions
CREATE POLICY phase_deliverable_submissions_student_select 
  ON phase_deliverable_submissions
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id 
      FROM course_group_members 
      WHERE student_id = auth.uid()
    )
  );

-- Only group leaders can insert submissions
CREATE POLICY phase_deliverable_submissions_leader_insert 
  ON phase_deliverable_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM course_group_members 
      WHERE student_id = auth.uid() 
        AND group_id = phase_deliverable_submissions.group_id
        AND role = 'leader'
    )
  );

-- Leaders can update their own ungraded submissions
CREATE POLICY phase_deliverable_submissions_leader_update 
  ON phase_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid()
    AND status = 'submitted'
    AND graded_at IS NULL
  );

-- Instructors can view all submissions for their courses
CREATE POLICY phase_deliverable_submissions_instructor_select 
  ON phase_deliverable_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = phase_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- Instructors can update (grade) submissions
CREATE POLICY phase_deliverable_submissions_instructor_update 
  ON phase_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = phase_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
    table_name, 
    column_name, 
    data_type,
    CASE 
        WHEN data_type = 'timestamp without time zone' THEN '✅ Correct'
        WHEN data_type = 'timestamp with time zone' THEN '❌ Still has timezone'
        ELSE '⚠️ Other type'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'phase_deliverable_submissions'
  AND column_name IN ('submitted_at', 'graded_at', 'created_at', 'updated_at')
ORDER BY column_name;

-- ============================================================================
-- VERIFY POLICIES ARE RECREATED
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ Policy recreated' as status
FROM pg_policies
WHERE tablename = 'phase_deliverable_submissions'
ORDER BY policyname;
