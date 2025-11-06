-- Migration: 006_cleanup_redundant_tables.sql
-- Purpose: Drop redundant evaluation tables after data consolidation
-- Date: 2025-10-24
-- WARNING: Only run this AFTER migrations 001-005 are successfully applied and verified

BEGIN;

-- ============================================================================
-- IMPORTANT: Backup check - ensure data migration was successful
-- ============================================================================
-- This script will check if data was properly migrated before dropping tables

-- ============================================================================
-- Step 1: Verify phase_custom_evaluations has been migrated
-- ============================================================================
DO $$
DECLARE
    v_custom_eval_count INTEGER;
    v_migrated_count INTEGER;
BEGIN
    -- Count remaining custom evaluations
    SELECT COUNT(*) INTO v_custom_eval_count
    FROM phase_custom_evaluations;
    
    -- Count migrated custom evaluations in phase_evaluation_forms
    SELECT COUNT(*) INTO v_migrated_count
    FROM phase_evaluation_forms
    WHERE is_custom_evaluation = TRUE;
    
    IF v_custom_eval_count > 0 THEN
        RAISE EXCEPTION 'ERROR: phase_custom_evaluations still has % records. Migration not complete!', v_custom_eval_count;
    END IF;
    
    RAISE NOTICE 'Phase custom evaluations: % records migrated', v_migrated_count;
END $$;

-- ============================================================================
-- Step 2: Verify project_custom_evaluations has been migrated
-- ============================================================================
DO $$
DECLARE
    v_custom_eval_count INTEGER;
    v_migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_custom_eval_count
    FROM project_custom_evaluations;
    
    SELECT COUNT(*) INTO v_migrated_count
    FROM project_evaluation_forms
    WHERE is_custom_evaluation = TRUE;
    
    IF v_custom_eval_count > 0 THEN
        RAISE EXCEPTION 'ERROR: project_custom_evaluations still has % records. Migration not complete!', v_custom_eval_count;
    END IF;
    
    RAISE NOTICE 'Project custom evaluations: % records migrated', v_migrated_count;
END $$;

-- ============================================================================
-- Step 3: Drop views created for backward compatibility
-- ============================================================================
DROP VIEW IF EXISTS phase_custom_evaluations_view CASCADE;
DROP VIEW IF EXISTS project_custom_evaluations_view CASCADE;

-- ============================================================================
-- Step 4: Drop redundant tables
-- ============================================================================
-- These tables are now consolidated into phase_evaluation_forms and project_evaluation_forms

DROP TABLE IF EXISTS phase_custom_evaluations CASCADE;
DROP TABLE IF EXISTS project_custom_evaluations CASCADE;

-- ============================================================================
-- Step 5: Review evaluation_forms table (legacy table - may still be needed)
-- ============================================================================
-- Before dropping, verify this table isn't actively used

DO $$
DECLARE
    v_eval_forms_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_eval_forms_count
    FROM evaluation_forms;
    
    IF v_eval_forms_count > 0 THEN
        RAISE NOTICE 'WARNING: evaluation_forms table still has % records. Review before dropping.', v_eval_forms_count;
    ELSE
        RAISE NOTICE 'evaluation_forms table is empty. Safe to drop if not referenced.';
    END IF;
END $$;

-- ============================================================================
-- Step 6: Verify references to dropped tables
-- ============================================================================
-- This checks if any other tables have foreign keys to the dropped tables
-- (There should be none after migration)

SELECT 
    table_name,
    constraint_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('phase_custom_evaluations', 'project_custom_evaluations')
  );

-- ============================================================================
-- Step 7: Final verification - show consolidated evaluation structure
-- ============================================================================
SELECT 
    'phase_evaluation_forms' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_custom_evaluation = TRUE) as custom_evaluations,
    COUNT(*) FILTER (WHERE is_custom_evaluation = FALSE) as builtin_evaluations
FROM phase_evaluation_forms

UNION ALL

SELECT 
    'project_evaluation_forms' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_custom_evaluation = TRUE) as custom_evaluations,
    COUNT(*) FILTER (WHERE is_custom_evaluation = FALSE) as builtin_evaluations
FROM project_evaluation_forms;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON TABLE phase_evaluation_forms IS 'Consolidated phase evaluations - handles both built-in and custom evaluations';
COMMENT ON TABLE project_evaluation_forms IS 'Consolidated project evaluations - handles both built-in and custom evaluations';

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MIGRATION 006 COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Dropped tables:';
    RAISE NOTICE '  - phase_custom_evaluations';
    RAISE NOTICE '  - project_custom_evaluations';
    RAISE NOTICE '';
    RAISE NOTICE 'Consolidated into:';
    RAISE NOTICE '  - phase_evaluation_forms (with custom_file_url column)';
    RAISE NOTICE '  - project_evaluation_forms (with custom_file_url column)';
    RAISE NOTICE '';
    RAISE NOTICE 'Data is now consolidated and tracked with is_custom_evaluation flag';
    RAISE NOTICE '================================================';
END $$;

COMMIT;
