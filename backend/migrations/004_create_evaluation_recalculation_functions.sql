-- Migration: 004_create_evaluation_recalculation_functions.sql
-- Purpose: Create PL/pgSQL functions to recalculate evaluation deadlines when phases change
-- Date: 2025-10-24

BEGIN;

-- ============================================================================
-- Function 1: Recalculate phase evaluation deadlines when phase end_date changes
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_phase_evaluation_deadlines()
RETURNS TRIGGER AS $$
DECLARE
    v_evaluation_phase_days SMALLINT;
    v_new_available_from TIMESTAMP WITH TIME ZONE;
    v_new_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only recalculate if end_date has changed
    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN
        -- Get evaluation phase days from the parent project
        SELECT evaluation_phase_days INTO v_evaluation_phase_days
        FROM projects
        WHERE id = NEW.project_id;
        
        -- Calculate new evaluation dates
        -- Available from: day after phase ends at 12:00 AM
        v_new_available_from := (NEW.end_date + INTERVAL '1 day')::DATE AT TIME ZONE 'UTC';
        
        -- Due date: available_from + evaluation_phase_days at 11:59:59 PM
        v_new_due_date := ((NEW.end_date + INTERVAL '1 day' + (v_evaluation_phase_days || ' days')::INTERVAL)::DATE + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP WITH TIME ZONE;
        
        -- Update the phase evaluation form
        UPDATE phase_evaluation_forms
        SET 
            available_from = v_new_available_from,
            due_date = v_new_due_date,
            deadline_updated_at = CURRENT_TIMESTAMP
        WHERE phase_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 1: Call recalculation function when project_phases.end_date changes
-- ============================================================================
DROP TRIGGER IF EXISTS trg_recalculate_phase_eval_on_end_date_change ON project_phases;

CREATE TRIGGER trg_recalculate_phase_eval_on_end_date_change
AFTER UPDATE OF end_date ON project_phases
FOR EACH ROW
EXECUTE FUNCTION recalculate_phase_evaluation_deadlines();

-- ============================================================================
-- Function 2: Sync project evaluation deadlines from last phase evaluation
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_project_evaluation_from_last_phase()
RETURNS TRIGGER AS $$
DECLARE
    v_last_phase_eval_id UUID;
    v_last_phase_id UUID;
    v_last_available_from TIMESTAMP WITH TIME ZONE;
    v_last_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last phase for this project
    SELECT id INTO v_last_phase_id
    FROM project_phases
    WHERE project_id = NEW.project_id
    ORDER BY phase_number DESC
    LIMIT 1;
    
    IF v_last_phase_id IS NOT NULL THEN
        -- Get the last phase's evaluation dates
        SELECT available_from, due_date INTO v_last_available_from, v_last_due_date
        FROM phase_evaluation_forms
        WHERE phase_id = v_last_phase_id;
        
        -- Update project evaluation form with the same dates
        UPDATE project_evaluation_forms
        SET 
            available_from = v_last_available_from,
            due_date = v_last_due_date,
            deadline_synced_from_phase_id = v_last_phase_id,
            deadline_updated_at = CURRENT_TIMESTAMP
        WHERE project_id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 2: Sync project eval when phase evaluation deadlines change
-- ============================================================================
DROP TRIGGER IF EXISTS trg_sync_project_eval_from_phase ON phase_evaluation_forms;

CREATE TRIGGER trg_sync_project_eval_from_phase
AFTER UPDATE OF available_from, due_date ON phase_evaluation_forms
FOR EACH ROW
EXECUTE FUNCTION sync_project_evaluation_from_last_phase();

-- ============================================================================
-- Function 3: Manual function to recalculate all evaluations for a project
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_all_project_evaluations(p_project_id UUID)
RETURNS TABLE(
    phase_id UUID,
    available_from TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
DECLARE
    v_phase RECORD;
    v_evaluation_phase_days SMALLINT;
    v_new_available_from TIMESTAMP WITH TIME ZONE;
    v_new_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get evaluation phase days for the project
    SELECT evaluation_phase_days INTO v_evaluation_phase_days
    FROM projects
    WHERE id = p_project_id;
    
    IF v_evaluation_phase_days IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE, 'ERROR: Project not found'::TEXT;
        RETURN;
    END IF;
    
    -- Loop through all phases for this project (in order)
    FOR v_phase IN
        SELECT id, end_date, phase_number
        FROM project_phases
        WHERE project_id = p_project_id
        ORDER BY phase_number ASC
    LOOP
        -- Calculate new evaluation dates
        v_new_available_from := (v_phase.end_date + INTERVAL '1 day')::DATE AT TIME ZONE 'UTC';
        v_new_due_date := ((v_phase.end_date + INTERVAL '1 day' + (v_evaluation_phase_days || ' days')::INTERVAL)::DATE + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP WITH TIME ZONE;
        
        -- Update phase evaluation form
        UPDATE phase_evaluation_forms
        SET 
            available_from = v_new_available_from,
            due_date = v_new_due_date,
            deadline_updated_at = CURRENT_TIMESTAMP
        WHERE phase_id = v_phase.id;
        
        RETURN QUERY SELECT v_phase.id, v_new_available_from, v_new_due_date, 'UPDATED'::TEXT;
    END LOOP;
    
    -- Sync project evaluation from last phase
    PERFORM sync_project_evaluation_from_last_phase();
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function 4: Validate evaluation deadlines (for debugging/verification)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_evaluation_deadlines(p_project_id UUID)
RETURNS TABLE(
    phase_id UUID,
    phase_number INTEGER,
    phase_end_date TIMESTAMP WITH TIME ZONE,
    eval_available_from TIMESTAMP WITH TIME ZONE,
    eval_due_date TIMESTAMP WITH TIME ZONE,
    days_until_eval_starts INTEGER,
    is_valid BOOLEAN,
    issue TEXT
) AS $$
SELECT 
    pp.id as phase_id,
    pp.phase_number,
    pp.end_date as phase_end_date,
    pef.available_from as eval_available_from,
    pef.due_date as eval_due_date,
    EXTRACT(DAY FROM pef.available_from - pp.end_date)::INTEGER as days_until_eval_starts,
    CASE 
        WHEN pef.available_from IS NULL OR pef.due_date IS NULL THEN FALSE
        WHEN pef.available_from <= pp.end_date THEN FALSE
        WHEN pef.due_date <= pef.available_from THEN FALSE
        ELSE TRUE
    END as is_valid,
    CASE 
        WHEN pef.available_from IS NULL OR pef.due_date IS NULL THEN 'Evaluation dates are NULL'
        WHEN pef.available_from <= pp.end_date THEN 'Evaluation starts before/at phase end'
        WHEN pef.due_date <= pef.available_from THEN 'Evaluation due date is before/at available_from'
        ELSE 'OK'
    END as issue
FROM project_phases pp
LEFT JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
WHERE pp.project_id = p_project_id
ORDER BY pp.phase_number;
$$ LANGUAGE SQL;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION recalculate_phase_evaluation_deadlines() IS 'Trigger function: Recalculates phase evaluation deadlines when phase end_date changes';

COMMENT ON FUNCTION sync_project_evaluation_from_last_phase() IS 'Trigger function: Syncs project evaluation deadlines from the last phase evaluation form';

COMMENT ON FUNCTION recalculate_all_project_evaluations(UUID) IS 'Manual function: Recalculates ALL evaluation deadlines for a specific project. Usage: SELECT * FROM recalculate_all_project_evaluations(project_id);';

COMMENT ON FUNCTION validate_evaluation_deadlines(UUID) IS 'Diagnostic function: Shows all evaluation deadlines for a project and validates them. Usage: SELECT * FROM validate_evaluation_deadlines(project_id);';

COMMIT;
