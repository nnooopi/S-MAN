-- ============================================================================
-- ADD PHASE_DELIVERABLES COLUMN TO PROJECT_DELIVERABLE_SUBMISSIONS
-- ============================================================================
-- This adds support for storing all phase deliverable submissions
-- (the files that leaders submitted for each phase)

-- Add the new column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'project_deliverable_submissions' 
          AND column_name = 'phase_deliverables'
    ) THEN
        ALTER TABLE project_deliverable_submissions 
        ADD COLUMN phase_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb;
        
        RAISE NOTICE '✅ Column phase_deliverables added successfully';
    ELSE
        RAISE NOTICE '⚠️  Column phase_deliverables already exists';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN project_deliverable_submissions.phase_deliverables IS 
'All phase deliverable submissions (files and data that leader submitted for each phase). Format: [{"phase_id": "uuid", "submission_id": "uuid", "submitted_at": "timestamp", "files": [], "member_inclusions": [], "status": "submitted"}]';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    '✅ Column exists' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_deliverable_submissions'
  AND column_name = 'phase_deliverables';

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_deliverable_submissions'
ORDER BY ordinal_position;

