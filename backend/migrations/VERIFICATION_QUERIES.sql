-- Testing & Verification Queries
-- Run these after each migration to verify correctness

-- ============================================================================
-- SECTION 1: POST-MIGRATION VERIFICATION (After Migration 1-2)
-- ============================================================================

-- Verify foreign key constraints exist
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE table_name IN ('phase_evaluation_forms', 'project_evaluation_forms', 
                     'phase_evaluation_criteria', 'project_evaluation_criteria')
ORDER BY table_name, constraint_name;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('phase_evaluation_forms', 'project_evaluation_forms',
                    'phase_evaluation_criteria', 'project_evaluation_criteria')
ORDER BY tablename, indexname;

-- Verify new columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'phase_evaluation_forms'
  AND column_name IN ('deadline_updated_at')
ORDER BY ordinal_position;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'project_evaluation_forms'
  AND column_name IN ('deadline_synced_from_phase_id', 'deadline_updated_at')
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 2: CONSOLIDATION VERIFICATION (After Migration 3)
-- ============================================================================

-- Check data migration from phase_custom_evaluations to phase_evaluation_forms
SELECT 
    'phase_custom_evaluations old table' as source,
    COUNT(*) as record_count
FROM phase_custom_evaluations

UNION ALL

SELECT 
    'phase_evaluation_forms (now consolidated)' as source,
    COUNT(*) as record_count
FROM phase_evaluation_forms
WHERE is_custom_evaluation = TRUE;

-- Check data migration from project_custom_evaluations to project_evaluation_forms
SELECT 
    'project_custom_evaluations old table' as source,
    COUNT(*) as record_count
FROM project_custom_evaluations

UNION ALL

SELECT 
    'project_evaluation_forms (now consolidated)' as source,
    COUNT(*) as record_count
FROM project_evaluation_forms
WHERE is_custom_evaluation = TRUE;

-- Verify views work
SELECT * FROM phase_custom_evaluations_view LIMIT 1;
SELECT * FROM project_custom_evaluations_view LIMIT 1;

-- ============================================================================
-- SECTION 3: FUNCTIONS VERIFICATION (After Migration 4)
-- ============================================================================

-- Check that all functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'recalculate_phase_evaluation_deadlines',
    'sync_project_evaluation_from_last_phase',
    'recalculate_all_project_evaluations',
    'validate_evaluation_deadlines'
  )
ORDER BY routine_name;

-- Check that triggers exist
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_%'
ORDER BY trigger_name;

-- ============================================================================
-- SECTION 4: SAMPLE PROJECT VALIDATION (Use after Migration 5)
-- ============================================================================

-- Test validation on a specific project
-- Replace 'YOUR_PROJECT_ID' with actual project ID
SELECT * FROM validate_evaluation_deadlines('YOUR_PROJECT_ID');

-- Should show:
-- - Each phase with its phase_number
-- - phase_end_date (from project_phases.end_date)
-- - eval_available_from (should be > phase_end_date)
-- - eval_due_date (should be > available_from)
-- - is_valid = TRUE for all rows
-- - issue = 'OK' for all rows

-- ============================================================================
-- SECTION 5: TRIGGER FUNCTIONALITY TEST
-- ============================================================================

-- Create test project (if needed for testing)
-- For demonstration, we'll use a sample query

-- Test 1: Check phase evaluation structure for a project
SELECT 
    pp.phase_number,
    pp.title as phase_title,
    pp.start_date as phase_start,
    pp.end_date as phase_end,
    pef.available_from as eval_start,
    pef.due_date as eval_end,
    pef.is_custom_evaluation,
    pef.deadline_updated_at
FROM project_phases pp
JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
WHERE pp.project_id = 'YOUR_PROJECT_ID'
ORDER BY pp.phase_number;

-- Test 2: Check project evaluation sync
SELECT 
    pef.project_id,
    'PROJECT_EVALUATION' as type,
    pef.available_from,
    pef.due_date,
    pp.phase_number as synced_from_phase,
    pp.title as synced_from_phase_title,
    pef.deadline_updated_at
FROM project_evaluation_forms pef
LEFT JOIN project_phases pp ON pef.deadline_synced_from_phase_id = pp.id
WHERE pef.project_id = 'YOUR_PROJECT_ID';

-- Test 3: Compare phase eval with project eval (should match for last phase)
SELECT 
    'Phase Evaluation (Last)' as eval_type,
    pef_phase.available_from,
    pef_phase.due_date
FROM phase_evaluation_forms pef_phase
WHERE pef_phase.phase_id = (
    SELECT id FROM project_phases
    WHERE project_id = 'YOUR_PROJECT_ID'
    ORDER BY phase_number DESC
    LIMIT 1
)

UNION ALL

SELECT 
    'Project Evaluation' as eval_type,
    pef_project.available_from,
    pef_project.due_date
FROM project_evaluation_forms pef_project
WHERE pef_project.project_id = 'YOUR_PROJECT_ID';

-- Should show identical dates!

-- ============================================================================
-- SECTION 6: TIMELINE CONSISTENCY CHECK
-- ============================================================================

-- Verify phase dates don't overlap and evaluation periods are consistent
SELECT 
    pp.phase_number,
    pp.title,
    pp.start_date,
    pp.end_date,
    LAG(pp.end_date) OVER (ORDER BY pp.phase_number) as prev_phase_end,
    pef.available_from as eval_start,
    pef.due_date as eval_end,
    CASE 
        WHEN pef.available_from > pp.end_date THEN 'VALID: Eval after phase'
        ELSE 'ERROR: Eval starts before phase ends'
    END as phase_eval_alignment,
    CASE 
        WHEN pef.due_date > pef.available_from THEN 'VALID: Has duration'
        ELSE 'ERROR: Eval duration is 0 or negative'
    END as eval_duration_valid
FROM project_phases pp
JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
WHERE pp.project_id = 'YOUR_PROJECT_ID'
ORDER BY pp.phase_number;

-- ============================================================================
-- SECTION 7: CUSTOM EVALUATION CHECK
-- ============================================================================

-- List all custom evaluations for a project
SELECT 
    'PHASE' as type,
    pp.phase_number,
    pp.title,
    pef.custom_file_name,
    pef.custom_file_url,
    pef.available_from,
    pef.due_date
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pp.project_id = 'YOUR_PROJECT_ID'
  AND pef.is_custom_evaluation = TRUE

UNION ALL

SELECT 
    'PROJECT' as type,
    NULL as phase_number,
    'Project Evaluation' as title,
    pef.custom_file_name,
    pef.custom_file_url,
    pef.available_from,
    pef.due_date
FROM project_evaluation_forms pef
WHERE pef.project_id = 'YOUR_PROJECT_ID'
  AND pef.is_custom_evaluation = TRUE;

-- ============================================================================
-- SECTION 8: EVALUATION CRITERIA CHECK
-- ============================================================================

-- List all evaluation criteria for a phase (should work for both custom and built-in)
SELECT 
    pp.phase_number,
    'Built-in Criteria' as criteria_type,
    pec.name,
    pec.max_points,
    pec.order_index
FROM phase_evaluation_forms pef
JOIN phase_evaluation_criteria pec ON pef.id = pec.phase_evaluation_form_id
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pp.project_id = 'YOUR_PROJECT_ID'
  AND pef.is_custom_evaluation = FALSE
ORDER BY pp.phase_number, pec.order_index;

-- List project evaluation criteria
SELECT 
    'Project-level' as level,
    pec.name,
    pec.max_points,
    pec.order_index
FROM project_evaluation_forms pef
LEFT JOIN project_evaluation_criteria pec ON pef.id = pec.project_evaluation_form_id
WHERE pef.project_id = 'YOUR_PROJECT_ID'
  AND pef.is_custom_evaluation = FALSE
ORDER BY pec.order_index;

-- ============================================================================
-- SECTION 9: DATA CONSISTENCY CHECKS
-- ============================================================================

-- Find any phase evaluation forms with NULL deadlines
SELECT 
    pp.project_id,
    pp.phase_number,
    pef.id,
    pef.available_from,
    pef.due_date,
    'INVALID: Null deadline' as issue
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pef.available_from IS NULL 
   OR pef.due_date IS NULL;

-- Find any misaligned deadlines (eval before phase ends)
SELECT 
    pp.project_id,
    pp.phase_number,
    pp.end_date,
    pef.available_from,
    CASE 
        WHEN pef.available_from <= pp.end_date THEN 'ERROR'
        ELSE 'OK'
    END as alignment
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pef.available_from <= pp.end_date;

-- Find project evaluations not synced from any phase
SELECT 
    pef.project_id,
    pef.available_from,
    pef.due_date,
    pef.deadline_synced_from_phase_id,
    CASE 
        WHEN pef.deadline_synced_from_phase_id IS NULL THEN 'WARNING: Not synced'
        ELSE 'OK'
    END as sync_status
FROM project_evaluation_forms pef
WHERE pef.deadline_synced_from_phase_id IS NULL;

-- ============================================================================
-- SECTION 10: PERFORMANCE MONITORING
-- ============================================================================

-- Check if triggers are being used (shows recently updated records)
SELECT 
    'phase_evaluation_forms' as table_name,
    COUNT(*) as recent_updates,
    MAX(deadline_updated_at) as last_update
FROM phase_evaluation_forms
WHERE deadline_updated_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'project_evaluation_forms' as table_name,
    COUNT(*) as recent_updates,
    MAX(deadline_updated_at) as last_update
FROM project_evaluation_forms
WHERE deadline_updated_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- SECTION 11: BULK VALIDATION (All projects)
-- ============================================================================

-- Validate all projects at once (may take a while with many projects)
SELECT 
    pp.project_id,
    SUM(CASE WHEN NOT (
        validate_evaluation_deadlines.is_valid
    ) THEN 1 ELSE 0 END) as invalid_count
FROM (
    SELECT DISTINCT project_id FROM project_phases
) pp
CROSS JOIN LATERAL validate_evaluation_deadlines(pp.project_id)
GROUP BY pp.project_id
HAVING SUM(CASE WHEN NOT (
    validate_evaluation_deadlines.is_valid
) THEN 1 ELSE 0 END) > 0
ORDER BY invalid_count DESC;

-- ============================================================================
-- SECTION 12: TABLE STRUCTURE COMPARISON
-- ============================================================================

-- Compare phase_evaluation_forms structure
\d phase_evaluation_forms

-- Compare project_evaluation_forms structure
\d project_evaluation_forms

-- Show constraints on phase_evaluation_forms
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'phase_evaluation_forms';

-- Show constraints on project_evaluation_forms
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'project_evaluation_forms';

-- ============================================================================
-- SECTION 13: MANUAL RECALCULATION TEST (if needed)
-- ============================================================================

-- Run manual recalculation for a specific project
-- This can be run anytime to re-sync all deadlines
SELECT * FROM recalculate_all_project_evaluations('YOUR_PROJECT_ID');

-- Returns:
-- - phase_id: which phase was updated
-- - available_from: new available_from date
-- - due_date: new due_date
-- - status: 'UPDATED' if changed

-- ============================================================================
-- SECTION 14: QUICK HEALTH CHECK
-- ============================================================================

-- Run this once per day to ensure system is healthy
SELECT 
    'Total Projects' as metric,
    COUNT(DISTINCT project_id) as value
FROM project_phases

UNION ALL

SELECT 
    'Total Phases' as metric,
    COUNT(*) as value
FROM project_phases

UNION ALL

SELECT 
    'Phase Evaluations (no issues)' as metric,
    COUNT(*) as value
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pef.available_from > pp.end_date
  AND pef.due_date > pef.available_from
  AND pef.available_from IS NOT NULL

UNION ALL

SELECT 
    'Phase Evaluations (with issues)' as metric,
    COUNT(*) as value
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE NOT (
    pef.available_from > pp.end_date
    AND pef.due_date > pef.available_from
    AND pef.available_from IS NOT NULL
)

UNION ALL

SELECT 
    'Project Evaluations (synced)' as metric,
    COUNT(*) as value
FROM project_evaluation_forms
WHERE deadline_synced_from_phase_id IS NOT NULL

UNION ALL

SELECT 
    'Custom Phase Evaluations' as metric,
    COUNT(*) as value
FROM phase_evaluation_forms
WHERE is_custom_evaluation = TRUE

UNION ALL

SELECT 
    'Custom Project Evaluations' as metric,
    COUNT(*) as value
FROM project_evaluation_forms
WHERE is_custom_evaluation = TRUE;
