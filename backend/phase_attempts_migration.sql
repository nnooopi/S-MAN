-- Add attempt functionality to project_phases table and modify phase_submissions for multiple attempts

-- Step 1: Add max_attempts column to project_phases table
ALTER TABLE project_phases 
ADD COLUMN max_attempts integer DEFAULT 1 CHECK (max_attempts > 0);

-- Step 2: Add comments to explain the new column
COMMENT ON COLUMN project_phases.max_attempts IS 'Maximum number of submission attempts allowed for this phase (default: 1)';

-- Step 3: Drop the unique constraint on phase_submissions to allow multiple attempts
-- First, let's check the constraint name (it should be phase_submissions_phase_id_group_id_key)
ALTER TABLE phase_submissions 
DROP CONSTRAINT phase_submissions_phase_id_group_id_key;

-- Step 4: Add attempt_number column to phase_submissions
ALTER TABLE phase_submissions 
ADD COLUMN attempt_number integer DEFAULT 1 CHECK (attempt_number > 0);

-- Step 5: Create a new unique constraint that includes attempt_number
ALTER TABLE phase_submissions 
ADD CONSTRAINT phase_submissions_phase_group_attempt_unique 
UNIQUE (phase_id, group_id, attempt_number);

-- Step 6: Add comments for better documentation
COMMENT ON COLUMN phase_submissions.attempt_number IS 'The attempt number for this submission (1, 2, 3, etc.)';

-- Step 7: Create an index for better query performance
CREATE INDEX idx_phase_submissions_phase_group_attempt 
ON phase_submissions (phase_id, group_id, attempt_number DESC);

-- Step 8: Create a view to easily get the latest submission for each phase/group
CREATE OR REPLACE VIEW latest_phase_submissions AS
SELECT DISTINCT ON (phase_id, group_id) 
    ps.*,
    pp.max_attempts,
    (ps.attempt_number >= pp.max_attempts) as is_final_attempt
FROM phase_submissions ps
JOIN project_phases pp ON ps.phase_id = pp.id
ORDER BY phase_id, group_id, attempt_number DESC;

-- Step 9: Add a function to get the next attempt number for a phase/group
CREATE OR REPLACE FUNCTION get_next_attempt_number(p_phase_id uuid, p_group_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    next_attempt integer;
BEGIN
    SELECT COALESCE(MAX(attempt_number), 0) + 1 
    INTO next_attempt
    FROM phase_submissions 
    WHERE phase_id = p_phase_id AND group_id = p_group_id;
    
    RETURN next_attempt;
END;
$$;

-- Step 10: Add a function to check if more attempts are allowed
CREATE OR REPLACE FUNCTION can_attempt_submission(p_phase_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    max_attempts integer;
    current_attempts integer;
BEGIN
    -- Get max attempts allowed for this phase
    SELECT max_attempts INTO max_attempts
    FROM project_phases 
    WHERE id = p_phase_id;
    
    -- Get current number of attempts
    SELECT COUNT(*) INTO current_attempts
    FROM phase_submissions 
    WHERE phase_id = p_phase_id AND group_id = p_group_id;
    
    RETURN current_attempts < max_attempts;
END;
$$;

-- Step 11: Update existing submissions to have attempt_number = 1
UPDATE phase_submissions 
SET attempt_number = 1 
WHERE attempt_number IS NULL;

-- Step 12: Update existing phases to have default max_attempts = 3 (or whatever default you prefer)
UPDATE project_phases 
SET max_attempts = 3 
WHERE max_attempts IS NULL;

-- Verification queries (run these to check the changes)
-- SELECT table_name, column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name IN ('project_phases', 'phase_submissions') 
-- AND column_name IN ('max_attempts', 'attempt_number')
-- ORDER BY table_name, column_name;