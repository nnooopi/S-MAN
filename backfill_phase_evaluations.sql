-- Backfill phase_evaluation_forms for projects that don't have them
-- This script creates missing evaluation forms for existing phases

BEGIN;

-- Step 1: Identify phases without evaluation forms
WITH phases_without_eval AS (
  SELECT 
    pp.id as phase_id,
    pp.project_id,
    pp.phase_number,
    pp.end_date,
    p.breathe_phase_days,
    p.evaluation_phase_days,
    COUNT(pef.id) as eval_form_count
  FROM project_phases pp
  JOIN projects p ON pp.project_id = p.id
  LEFT JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
  GROUP BY pp.id, pp.project_id, pp.phase_number, pp.end_date, p.breathe_phase_days, p.evaluation_phase_days
  HAVING COUNT(pef.id) = 0
)
-- Step 2: Create evaluation forms for these phases
INSERT INTO phase_evaluation_forms (phase_id, available_from, due_date, instructions, total_points)
SELECT 
  phase_id,
  -- available_from: phase end + breathe days, at 00:00:00
  (end_date + (breathe_phase_days || ' days')::INTERVAL)::DATE::TIMESTAMP WITH TIME ZONE,
  -- due_date: available_from + evaluation phase days, at 23:59:59
  ((end_date + (breathe_phase_days || ' days')::INTERVAL)::DATE + (evaluation_phase_days || ' days')::INTERVAL + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP WITH TIME ZONE,
  'Rate your groupmates according to the following criteria.',
  100
FROM phases_without_eval
WHERE phase_id IS NOT NULL;

COMMIT;
