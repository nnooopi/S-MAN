-- ============================================
-- FIX ROW-LEVEL SECURITY FOR phase_breathe_periods
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Professors can insert breathe periods" ON phase_breathe_periods;
DROP POLICY IF EXISTS "Professors can view breathe periods" ON phase_breathe_periods;
DROP POLICY IF EXISTS "Professors can update breathe periods" ON phase_breathe_periods;
DROP POLICY IF EXISTS "Professors can delete breathe periods" ON phase_breathe_periods;
DROP POLICY IF EXISTS "Students can view breathe periods" ON phase_breathe_periods;

-- Enable RLS on the table
ALTER TABLE phase_breathe_periods ENABLE ROW LEVEL SECURITY;

-- Create policy for professors to INSERT breathe periods
CREATE POLICY "Professors can insert breathe periods"
ON phase_breathe_periods
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phase_breathe_periods.project_id
    AND p.created_by IN (
      SELECT id FROM professoraccounts
    )
  )
);

-- Create policy for professors to SELECT (view) breathe periods
CREATE POLICY "Professors can view breathe periods"
ON phase_breathe_periods
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phase_breathe_periods.project_id
    AND p.created_by IN (
      SELECT id FROM professoraccounts
    )
  )
);

-- Create policy for professors to UPDATE breathe periods
CREATE POLICY "Professors can update breathe periods"
ON phase_breathe_periods
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phase_breathe_periods.project_id
    AND p.created_by IN (
      SELECT id FROM professoraccounts
    )
  )
);

-- Create policy for professors to DELETE breathe periods
CREATE POLICY "Professors can delete breathe periods"
ON phase_breathe_periods
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phase_breathe_periods.project_id
    AND p.created_by IN (
      SELECT id FROM professoraccounts
    )
  )
);

-- Create policy for students to view breathe periods (read-only)
CREATE POLICY "Students can view breathe periods"
ON phase_breathe_periods
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN courses c ON p.course_id = c.id
    JOIN course_students cs ON cs.course_id = c.id
    WHERE p.id = phase_breathe_periods.project_id
    AND cs.student_id IN (
      SELECT id FROM studentaccounts WHERE user_id = auth.uid()
    )
  )
);

-- Grant necessary permissions
GRANT ALL ON phase_breathe_periods TO authenticated;
GRANT ALL ON phase_breathe_periods TO service_role;

-- Verify the policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'phase_breathe_periods';
