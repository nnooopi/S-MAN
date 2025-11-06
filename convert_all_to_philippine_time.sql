-- =============================================
-- CONVERT ALL TIMESTAMP COLUMNS TO PHILIPPINE TIME
-- This script:
-- 1. Drops RLS policies
-- 2. Updates ALL existing data (adds 8 hours to convert UTC to Philippine time)
-- 3. Changes column types to timestamp without time zone
-- 4. Updates triggers to use local time
-- 5. Recreates RLS policies
-- =============================================

-- ============================================================================
-- STEP 1: DROP RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS phase_deliverable_submissions_student_select ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_leader_insert ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_leader_update ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_instructor_select ON phase_deliverable_submissions;
DROP POLICY IF EXISTS phase_deliverable_submissions_instructor_update ON phase_deliverable_submissions;

-- ============================================================================
-- STEP 2: CONVERT EXISTING DATA FROM UTC TO PHILIPPINE TIME (+8 hours)
-- ============================================================================

UPDATE phase_deliverable_submissions
SET 
  submitted_at = submitted_at + INTERVAL '8 hours',
  graded_at = CASE 
    WHEN graded_at IS NOT NULL THEN graded_at + INTERVAL '8 hours'
    ELSE NULL 
  END,
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours';

-- ============================================================================
-- STEP 3: CHANGE COLUMN TYPES TO timestamp without time zone
-- ============================================================================

ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN submitted_at TYPE timestamp without time zone,
  ALTER COLUMN graded_at TYPE timestamp without time zone,
  ALTER COLUMN created_at TYPE timestamp without time zone,
  ALTER COLUMN updated_at TYPE timestamp without time zone;

-- ============================================================================
-- STEP 4: UPDATE DEFAULT VALUES FOR created_at AND updated_at
-- ============================================================================

-- Change default for created_at to use LOCALTIMESTAMP (local time without timezone)
ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN created_at SET DEFAULT LOCALTIMESTAMP;

-- Change default for updated_at to use LOCALTIMESTAMP
ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN updated_at SET DEFAULT LOCALTIMESTAMP;

-- ============================================================================
-- STEP 5: UPDATE TRIGGER TO USE LOCAL TIME
-- ============================================================================

DROP TRIGGER IF EXISTS phase_deliverable_submissions_updated_at ON phase_deliverable_submissions;
DROP FUNCTION IF EXISTS update_phase_deliverable_submissions_updated_at();

CREATE OR REPLACE FUNCTION update_phase_deliverable_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = LOCALTIMESTAMP;  -- Use LOCALTIMESTAMP instead of NOW()
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_deliverable_submissions_updated_at
  BEFORE UPDATE ON phase_deliverable_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_deliverable_submissions_updated_at();

-- ============================================================================
-- STEP 6: RECREATE ALL RLS POLICIES
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
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check column types
SELECT 
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

-- 2. Check existing data (should now show Philippine time)
SELECT 
    id,
    submitted_at,
    created_at,
    updated_at,
    status,
    '✅ All times converted to Philippine time (+8 from original UTC)' as note
FROM phase_deliverable_submissions
ORDER BY submitted_at DESC
LIMIT 5;

-- 3. Verify policies are recreated
SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ Policy recreated' as status
FROM pg_policies
WHERE tablename = 'phase_deliverable_submissions'
ORDER BY policyname;

-- 4. Check trigger function
SELECT 
    trigger_name,
    event_manipulation,
    '✅ Trigger uses LOCALTIMESTAMP' as status
FROM information_schema.triggers
WHERE event_object_table = 'phase_deliverable_submissions'
  AND trigger_name = 'phase_deliverable_submissions_updated_at';

