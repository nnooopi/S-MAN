-- ============================================
-- FIX TIMESTAMP TIMEZONE ISSUES
-- ============================================
-- Problem: Database columns are "timestamp with time zone" which converts
-- local datetime to UTC when storing, causing 8-hour offset
-- Solution: Convert to "timestamp without time zone" to store exact datetime
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: DROP TRIGGERS THAT DEPEND ON COLUMNS
-- ============================================
DROP TRIGGER IF EXISTS trg_recalculate_phase_eval_on_end_date_change ON project_phases;
DROP TRIGGER IF EXISTS trg_update_project_eval_on_last_phase_eval_change ON phase_evaluation_forms;
DROP TRIGGER IF EXISTS trg_sync_project_eval_deadline ON project_evaluation_forms;

-- ============================================
-- STEP 2: ALTER COLUMN TYPES
-- ============================================

-- 1. FIX PROJECT_PHASES TABLE
ALTER TABLE project_phases 
    ALTER COLUMN start_date TYPE timestamp without time zone,
    ALTER COLUMN end_date TYPE timestamp without time zone;

-- 2. FIX PHASE_EVALUATION_FORMS TABLE
ALTER TABLE phase_evaluation_forms 
    ALTER COLUMN available_from TYPE timestamp without time zone,
    ALTER COLUMN due_date TYPE timestamp without time zone;

-- 3. FIX PHASE_BREATHE_PERIODS TABLE
ALTER TABLE phase_breathe_periods 
    ALTER COLUMN start_date TYPE timestamp without time zone,
    ALTER COLUMN end_date TYPE timestamp without time zone;

-- 4. FIX PROJECT_EVALUATION_FORMS TABLE
ALTER TABLE project_evaluation_forms 
    ALTER COLUMN available_from TYPE timestamp without time zone,
    ALTER COLUMN due_date TYPE timestamp without time zone;

-- 5. FIX PROJECTS TABLE
ALTER TABLE projects 
    ALTER COLUMN start_date TYPE timestamp without time zone,
    ALTER COLUMN due_date TYPE timestamp without time zone;

-- 6. FIX PHASE_CUSTOM_EVALUATIONS TABLE (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phase_custom_evaluations') THEN
        ALTER TABLE phase_custom_evaluations 
            ALTER COLUMN available_from TYPE timestamp without time zone,
            ALTER COLUMN due_date TYPE timestamp without time zone;
    END IF;
END $$;

-- 7. FIX PROJECT_CUSTOM_EVALUATIONS TABLE (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_custom_evaluations') THEN
        ALTER TABLE project_custom_evaluations 
            ALTER COLUMN available_from TYPE timestamp without time zone,
            ALTER COLUMN due_date TYPE timestamp without time zone;
    END IF;
END $$;

-- ============================================
-- STEP 3: RECREATE TRIGGERS (if they existed)
-- ============================================
-- Note: You may need to recreate the trigger functions if they were dropped
-- If you have the original trigger creation SQL, run it here

COMMIT;

-- ============================================
-- VERIFY THE CHANGES
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN (
    'projects',
    'project_phases',
    'phase_evaluation_forms',
    'phase_breathe_periods',
    'project_evaluation_forms',
    'phase_custom_evaluations',
    'project_custom_evaluations'
)
AND column_name IN ('start_date', 'end_date', 'available_from', 'due_date')
ORDER BY table_name, column_name;

-- Expected result: All should show "timestamp without time zone"
