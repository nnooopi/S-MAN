-- ================================================================
-- ALTER TABLE STATEMENTS FOR TASK DEADLINE EXTENSIONS
-- ================================================================
-- Run these statements to add extension tracking to the tasks table
-- ================================================================

-- Add extension_count column to track how many extensions have been granted
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.extension_count IS 'Number of deadline extensions granted for this task';

-- Add constraint to ensure extension_count is non-negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_extension_count_non_negative'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT check_extension_count_non_negative
        CHECK (extension_count >= 0);
    END IF;
END $$;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if column was added successfully
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name = 'extension_count';

-- Check if constraint was added successfully
SELECT
    conname,
    contype,
    consrc
FROM pg_constraint
WHERE conname = 'check_extension_count_non_negative';
