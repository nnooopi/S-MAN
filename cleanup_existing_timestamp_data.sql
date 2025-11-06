-- ============================================
-- CLEANUP EXISTING DATA AFTER TIMEZONE FIX
-- ============================================
-- This script converts existing timestamps back to local time
-- Run this AFTER running fix_timestamp_timezone_issue.sql
-- ============================================

-- NOTE: Adjust existing data by SUBTRACTING 8 hours to get back to local midnight
-- Example: 2025-10-26 08:00:00 (stored as UTC) → 2025-10-26 00:00:00 (local)

BEGIN;

-- 1. FIX PROJECTS
UPDATE projects
SET 
    start_date = start_date - INTERVAL '8 hours',
    due_date = due_date - INTERVAL '8 hours'
WHERE start_date IS NOT NULL OR due_date IS NOT NULL;

-- 2. FIX PROJECT_PHASES
UPDATE project_phases
SET 
    start_date = start_date - INTERVAL '8 hours',
    end_date = end_date - INTERVAL '8 hours'
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- 3. FIX PHASE_EVALUATION_FORMS
UPDATE phase_evaluation_forms
SET 
    available_from = available_from - INTERVAL '8 hours',
    due_date = due_date - INTERVAL '8 hours'
WHERE available_from IS NOT NULL OR due_date IS NOT NULL;

-- 4. FIX PHASE_BREATHE_PERIODS
UPDATE phase_breathe_periods
SET 
    start_date = start_date - INTERVAL '8 hours',
    end_date = end_date - INTERVAL '8 hours'
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- 5. FIX PROJECT_EVALUATION_FORMS
UPDATE project_evaluation_forms
SET 
    available_from = available_from - INTERVAL '8 hours',
    due_date = due_date - INTERVAL '8 hours'
WHERE available_from IS NOT NULL OR due_date IS NOT NULL;

-- 6. FIX PHASE_CUSTOM_EVALUATIONS (if exists)
UPDATE phase_custom_evaluations
SET 
    available_from = available_from - INTERVAL '8 hours',
    due_date = due_date - INTERVAL '8 hours'
WHERE available_from IS NOT NULL OR due_date IS NOT NULL;

-- 7. FIX PROJECT_CUSTOM_EVALUATIONS (if exists)
UPDATE project_custom_evaluations
SET 
    available_from = available_from - INTERVAL '8 hours',
    due_date = due_date - INTERVAL '8 hours'
WHERE available_from IS NOT NULL OR due_date IS NOT NULL;

COMMIT;

-- ============================================
-- VERIFY THE FIXES
-- ============================================
SELECT 
    'PROJECT' as type,
    title,
    TO_CHAR(start_date, 'Mon DD HH12:MIam') as starts,
    TO_CHAR(due_date, 'Mon DD HH12:MIam') as ends
FROM projects
WHERE title = 'ASD'
ORDER BY created_at DESC
LIMIT 1;

SELECT 
    'PHASE' as type,
    phase_number,
    title,
    TO_CHAR(start_date, 'Mon DD HH12:MIam') as starts,
    TO_CHAR(end_date, 'Mon DD HH12:MIam') as ends
FROM project_phases pp
JOIN projects p ON pp.project_id = p.id
WHERE p.title = 'ASD'
ORDER BY phase_number;

-- Expected: All times should show 12:00am or 11:00pm, NOT 04:00pm/03:00pm
