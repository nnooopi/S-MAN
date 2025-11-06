-- Migration: 002_project_evaluation_forms_updates.sql
-- Purpose: Ensure project_evaluation_forms is properly linked to projects and synced with last phase
-- Date: 2025-10-24

BEGIN;

-- ============================================================================
-- Step 1: Add foreign key constraint for project_evaluation_forms -> projects
-- ============================================================================
ALTER TABLE project_evaluation_forms
ADD CONSTRAINT fk_project_eval_forms_project_id 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 2: Add foreign key constraint for project_evaluation_criteria -> project_evaluation_forms
-- ============================================================================
ALTER TABLE project_evaluation_criteria
ADD CONSTRAINT fk_project_eval_criteria_form_id 
FOREIGN KEY (project_evaluation_form_id) REFERENCES project_evaluation_forms(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 3: Create indexes for faster lookups
-- ============================================================================
CREATE INDEX idx_project_eval_forms_project_id 
ON project_evaluation_forms(project_id);

CREATE INDEX idx_project_eval_criteria_form_id 
ON project_evaluation_criteria(project_evaluation_form_id);

-- ============================================================================
-- Step 4: Add audit column
-- ============================================================================
ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS deadline_synced_from_phase_id UUID DEFAULT NULL;

ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS deadline_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- Step 5: Add foreign key for tracking which phase synced the dates
-- ============================================================================
ALTER TABLE project_evaluation_forms
ADD CONSTRAINT fk_project_eval_forms_sync_phase 
FOREIGN KEY (deadline_synced_from_phase_id) REFERENCES project_phases(id) ON DELETE SET NULL;

-- ============================================================================
-- Step 6: Create index for sync tracking
-- ============================================================================
CREATE INDEX idx_project_eval_forms_sync_phase_id 
ON project_evaluation_forms(deadline_synced_from_phase_id);

-- ============================================================================
-- Step 7: Add documentation
-- ============================================================================
COMMENT ON TABLE project_evaluation_forms IS 'Stores built-in evaluation forms for projects. Deadlines are synced from the last phase evaluation form';

COMMENT ON COLUMN project_evaluation_forms.deadline_synced_from_phase_id IS 'Tracks which phase evaluation this project evaluation is synced from (typically the last phase)';

COMMENT ON COLUMN project_evaluation_forms.deadline_updated_at IS 'Track when deadlines were last synced';

COMMIT;
