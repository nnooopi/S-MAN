-- Migration: 003_consolidate_evaluation_tables.sql
-- Purpose: Clean up redundant evaluation tables and consolidate into single source of truth
-- Date: 2025-10-24

BEGIN;

-- ============================================================================
-- Step 1: Review phase_custom_evaluations - this table is REDUNDANT
-- ============================================================================
-- phase_custom_evaluations stores file uploads for custom evaluations
-- These should be stored in phase_evaluation_forms via file_url column
-- BUT we need to check if there's data here first

-- For now, let's add a column to phase_evaluation_forms to track custom file uploads
ALTER TABLE phase_evaluation_forms
ADD COLUMN IF NOT EXISTS custom_file_url TEXT DEFAULT NULL;

ALTER TABLE phase_evaluation_forms
ADD COLUMN IF NOT EXISTS custom_file_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE phase_evaluation_forms
ADD COLUMN IF NOT EXISTS is_custom_evaluation BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- Step 2: Migrate data from phase_custom_evaluations to phase_evaluation_forms
-- ============================================================================
-- This assumes phase_custom_evaluations has phase_id, file_url, file_name, available_from, due_date
-- We need to update phase_evaluation_forms with custom file info

UPDATE phase_evaluation_forms pef
SET 
    custom_file_url = pce.file_url,
    custom_file_name = pce.file_name,
    is_custom_evaluation = TRUE
FROM phase_custom_evaluations pce
WHERE pef.phase_id = pce.phase_id
  AND pef.available_from = pce.available_from
  AND pef.due_date = pce.due_date;

-- ============================================================================
-- Step 3: Do the same for project_evaluation_forms
-- ============================================================================
ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS custom_file_url TEXT DEFAULT NULL;

ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS custom_file_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS is_custom_evaluation BOOLEAN DEFAULT FALSE;

UPDATE project_evaluation_forms pef
SET 
    custom_file_url = pce.file_url,
    custom_file_name = pce.file_name,
    is_custom_evaluation = TRUE
FROM project_custom_evaluations pce
WHERE pef.project_id = pce.project_id
  AND pef.available_from = pce.available_from
  AND pef.due_date = pce.due_date;

-- ============================================================================
-- Step 4: Add index for custom evaluation lookups
-- ============================================================================
CREATE INDEX idx_phase_eval_forms_custom 
ON phase_evaluation_forms(is_custom_evaluation);

CREATE INDEX idx_project_eval_forms_custom 
ON project_evaluation_forms(is_custom_evaluation);

-- ============================================================================
-- Step 5: Create views for backward compatibility (if code references old tables)
-- ============================================================================
-- These views ensure existing queries still work during transition
CREATE OR REPLACE VIEW phase_custom_evaluations_view AS
SELECT 
    pef.id,
    pef.phase_id,
    pef.custom_file_url AS file_url,
    pef.custom_file_name AS file_name,
    pef.available_from,
    pef.due_date,
    pef.created_at,
    pef.updated_at
FROM phase_evaluation_forms pef
WHERE pef.is_custom_evaluation = TRUE;

CREATE OR REPLACE VIEW project_custom_evaluations_view AS
SELECT 
    pef.id,
    pef.project_id,
    pef.custom_file_url AS file_url,
    pef.custom_file_name AS file_name,
    pef.available_from,
    pef.due_date,
    pef.created_at,
    pef.updated_at
FROM project_evaluation_forms pef
WHERE pef.is_custom_evaluation = TRUE;

-- ============================================================================
-- Step 6: Add documentation
-- ============================================================================
COMMENT ON COLUMN phase_evaluation_forms.custom_file_url IS 'File URL for custom evaluation form (if type is custom)';

COMMENT ON COLUMN phase_evaluation_forms.custom_file_name IS 'File name for custom evaluation form';

COMMENT ON COLUMN phase_evaluation_forms.is_custom_evaluation IS 'TRUE if this is a custom file upload, FALSE if built-in form';

COMMENT ON COLUMN project_evaluation_forms.custom_file_url IS 'File URL for custom evaluation form (if type is custom)';

COMMENT ON COLUMN project_evaluation_forms.custom_file_name IS 'File name for custom evaluation form';

COMMENT ON COLUMN project_evaluation_forms.is_custom_evaluation IS 'TRUE if this is a custom file upload, FALSE if built-in form';

-- ============================================================================
-- Step 7: WARNING - Post-migration cleanup (run after verifying data migration)
-- ============================================================================
-- DO NOT RUN THESE UNTIL DATA MIGRATION IS VERIFIED
-- These are destructive operations and should be in a separate cleanup migration

-- DROP TABLE IF EXISTS phase_custom_evaluations CASCADE;
-- DROP TABLE IF EXISTS project_custom_evaluations CASCADE;
-- DROP VIEW IF EXISTS phase_custom_evaluations_view CASCADE;
-- DROP VIEW IF EXISTS project_custom_evaluations_view CASCADE;

COMMIT;
