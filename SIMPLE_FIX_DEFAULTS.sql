-- =============================================
-- SIMPLE FIX: Update defaults and trigger to add 8 hours to UTC
-- =============================================

-- 1. Fix default for created_at (adds 8 hours to UTC)
ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 hours');

-- 2. Fix default for updated_at
ALTER TABLE phase_deliverable_submissions 
  ALTER COLUMN updated_at SET DEFAULT (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 hours');

-- 3. Fix the trigger
DROP TRIGGER IF EXISTS phase_deliverable_submissions_updated_at ON phase_deliverable_submissions;
DROP FUNCTION IF EXISTS update_phase_deliverable_submissions_updated_at();

CREATE OR REPLACE FUNCTION update_phase_deliverable_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_deliverable_submissions_updated_at
  BEFORE UPDATE ON phase_deliverable_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_deliverable_submissions_updated_at();

-- Done!
SELECT '✅ All defaults and trigger updated to use Philippine time (+8 hours)' as status;

