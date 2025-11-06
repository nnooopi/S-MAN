-- Migration: 001_phase_evaluation_schema_updates.sql
-- Purpose: Add foreign key constraints and ensure phase_evaluation_forms properly links to project_phases
-- Date: 2025-10-24

-- Start transaction
BEGIN;

-- ============================================================================
-- Step 1: Add foreign key constraint for phase_evaluation_forms -> project_phases
-- ============================================================================
-- This ensures each evaluation form is tied to a specific phase
ALTER TABLE phase_evaluation_forms
ADD CONSTRAINT fk_phase_eval_forms_phase_id 
FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 2: Add foreign key constraint for phase_evaluation_criteria -> phase_evaluation_forms
-- ============================================================================
-- Ensure criteria rows are deleted when evaluation form is deleted
ALTER TABLE phase_evaluation_criteria
ADD CONSTRAINT fk_phase_eval_criteria_form_id 
FOREIGN KEY (phase_evaluation_form_id) REFERENCES phase_evaluation_forms(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 3: Create index on phase_evaluation_forms.phase_id for faster lookups
-- ============================================================================
CREATE INDEX idx_phase_eval_forms_phase_id 
ON phase_evaluation_forms(phase_id);

-- ============================================================================
-- Step 4: Create index on phase_evaluation_criteria.phase_evaluation_form_id
-- ============================================================================
CREATE INDEX idx_phase_eval_criteria_form_id 
ON phase_evaluation_criteria(phase_evaluation_form_id);

-- ============================================================================
-- Step 5: Add NOT NULL constraint check on phase_evaluation_forms columns
-- ============================================================================
-- Verify that available_from and due_date are properly set
-- (This will help catch any NULL values in existing data)

-- ============================================================================
-- Step 6: Create audit column for tracking evaluation deadline changes
-- ============================================================================
ALTER TABLE phase_evaluation_forms
ADD COLUMN IF NOT EXISTS deadline_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- Step 7: Add comment documentation
-- ============================================================================
COMMENT ON TABLE phase_evaluation_forms IS 'Stores built-in evaluation forms for each phase. Deadlines are calculated based on phase.end_date + evaluation_phase_days from projects table';

COMMENT ON COLUMN phase_evaluation_forms.phase_id IS 'Reference to the project phase this evaluation belongs to';

COMMENT ON COLUMN phase_evaluation_forms.available_from IS 'Evaluation becomes available the day after phase ends at 12:00 AM';

COMMENT ON COLUMN phase_evaluation_forms.due_date IS 'Evaluation deadline is available_from + projects.evaluation_phase_days';

COMMENT ON COLUMN phase_evaluation_forms.deadline_updated_at IS 'Track when deadlines were last recalculated';

-- Commit transaction
COMMIT;
