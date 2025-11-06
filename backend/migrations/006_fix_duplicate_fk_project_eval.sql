-- Fix duplicate foreign key constraints on project_evaluation_forms
-- The table has two FKs pointing to the same relationship, causing Supabase embedding errors

BEGIN;

-- Step 1: Identify the duplicate constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'project_evaluation_forms'
AND constraint_type = 'FOREIGN KEY';

-- Step 2: Drop the older/redundant constraint (keep the one with 'fk_' prefix)
-- Assuming 'project_evaluation_forms_project_id_fkey' is the auto-generated one that's redundant
ALTER TABLE project_evaluation_forms
DROP CONSTRAINT IF EXISTS project_evaluation_forms_project_id_fkey;

-- Step 3: Verify only one FK remains
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'project_evaluation_forms'
AND constraint_type = 'FOREIGN KEY';

COMMIT;
