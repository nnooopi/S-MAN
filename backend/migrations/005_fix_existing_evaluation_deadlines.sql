-- Migration: 005_fix_existing_evaluation_deadlines.sql
-- Purpose: Fix any incorrect evaluation deadlines in existing data
-- Date: 2025-10-24

BEGIN;

-- ============================================================================
-- Step 1: Create temporary table to track changes
-- ============================================================================
CREATE TEMP TABLE evaluation_deadline_fixes (
    phase_id UUID,
    project_id UUID,
    phase_end_date TIMESTAMP WITH TIME ZONE,
    old_available_from TIMESTAMP WITH TIME ZONE,
    new_available_from TIMESTAMP WITH TIME ZONE,
    old_due_date TIMESTAMP WITH TIME ZONE,
    new_due_date TIMESTAMP WITH TIME ZONE,
    fix_status TEXT
);

-- ============================================================================
-- Step 2: Identify all phases with evaluation forms
-- ============================================================================
INSERT INTO evaluation_deadline_fixes
SELECT 
    pp.id as phase_id,
    pp.project_id,
    pp.end_date as phase_end_date,
    pef.available_from as old_available_from,
    ((pp.end_date + INTERVAL '1 day')::DATE)::TIMESTAMP WITH TIME ZONE as new_available_from,
    pef.due_date as old_due_date,
    ((pp.end_date + INTERVAL '1 day' + (p.evaluation_phase_days || ' days')::INTERVAL)::DATE + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP WITH TIME ZONE as new_due_date,
    'PENDING' as fix_status
FROM project_phases pp
JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
JOIN projects p ON pp.project_id = p.id
WHERE pef.available_from IS NOT NULL
  AND pef.due_date IS NOT NULL;

-- ============================================================================
-- Step 3: Identify misaligned evaluations
-- ============================================================================
-- Show what will be fixed
SELECT 
    phase_id,
    'PHASE EVALUATION' as eval_type,
    CASE 
        WHEN old_available_from != new_available_from THEN 'available_from mismatch'
        WHEN old_due_date != new_due_date THEN 'due_date mismatch'
        ELSE 'OK'
    END as issue,
    old_available_from,
    new_available_from,
    old_due_date,
    new_due_date
FROM evaluation_deadline_fixes
WHERE old_available_from != new_available_from 
   OR old_due_date != new_due_date;

-- ============================================================================
-- Step 4: Fix phase evaluation deadlines
-- ============================================================================
UPDATE phase_evaluation_forms pef
SET 
    available_from = edf.new_available_from,
    due_date = edf.new_due_date,
    deadline_updated_at = CURRENT_TIMESTAMP
FROM evaluation_deadline_fixes edf
WHERE pef.phase_id = edf.phase_id
  AND (pef.available_from != edf.new_available_from 
       OR pef.due_date != edf.new_due_date);

-- ============================================================================
-- Step 5: Fix project evaluation deadlines (sync from last phase)
-- ============================================================================
UPDATE project_evaluation_forms pef
SET 
    available_from = (
        SELECT available_from FROM phase_evaluation_forms
        WHERE phase_id = (
            SELECT id FROM project_phases
            WHERE project_id = pef.project_id
            ORDER BY phase_number DESC
            LIMIT 1
        )
    ),
    due_date = (
        SELECT due_date FROM phase_evaluation_forms
        WHERE phase_id = (
            SELECT id FROM project_phases
            WHERE project_id = pef.project_id
            ORDER BY phase_number DESC
            LIMIT 1
        )
    ),
    deadline_synced_from_phase_id = (
        SELECT id FROM project_phases
        WHERE project_id = pef.project_id
        ORDER BY phase_number DESC
        LIMIT 1
    ),
    deadline_updated_at = CURRENT_TIMESTAMP
WHERE available_from IS NOT NULL
  AND due_date IS NOT NULL;

-- ============================================================================
-- Step 6: Verify fixes
-- ============================================================================
-- Show all fixed evaluations (this will be shown in the migration output)
SELECT 
    'PHASE EVALUATION' as type,
    pp.id as phase_id,
    pp.phase_number,
    pp.title,
    pp.end_date,
    pef.available_from,
    pef.due_date,
    CASE 
        WHEN pef.available_from > pp.end_date THEN 'VALID'
        ELSE 'INVALID'
    END as validation_status
FROM project_phases pp
JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
ORDER BY pp.project_id, pp.phase_number;

-- ============================================================================
-- Step 7: Log the changes (optional - requires audit table)
-- ============================================================================
-- If you have an audit log table, log these changes:
-- INSERT INTO audit_log (table_name, action, details, changed_at)
-- SELECT 'phase_evaluation_forms', 'RECALCULATE_DEADLINES', 
--        'Fixed ' || COUNT(*) || ' evaluation deadline records',
--        CURRENT_TIMESTAMP
-- FROM evaluation_deadline_fixes
-- WHERE fix_status = 'PENDING';

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
    COUNT(*) as total_phases_fixed,
    COUNT(*) FILTER (WHERE old_available_from != new_available_from) as available_from_fixed,
    COUNT(*) FILTER (WHERE old_due_date != new_due_date) as due_date_fixed
FROM evaluation_deadline_fixes;

COMMIT;
