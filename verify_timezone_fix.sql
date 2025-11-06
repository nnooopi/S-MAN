-- ===== COMPREHENSIVE TIMEZONE VERIFICATION FOR PROJECT "last" =====

-- Query 1: Phase Evaluation Dates with Timezone Conversion
SELECT 
  pp.phase_number,
  pp.end_date AT TIME ZONE 'Asia/Manila' as "Phase Ends (Manila)",
  pef.available_from AT TIME ZONE 'Asia/Manila' as "Eval Starts (Manila) - Should be +1 day",
  pef.due_date AT TIME ZONE 'Asia/Manila' as "Eval Due (Manila)",
  pef.available_from::text as "Raw Available",
  pef.due_date::text as "Raw Due"
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pp.project_id = (
  SELECT id FROM projects WHERE title = 'last' ORDER BY created_at DESC LIMIT 1
)
ORDER BY pp.phase_number;

-- Query 2: Project Evaluation Dates (should now sync from last phase)
SELECT 
  p.title,
  'Project Evaluation' as eval_type,
  pef.available_from AT TIME ZONE 'Asia/Manila' as "Available (Manila)",
  pef.due_date AT TIME ZONE 'Asia/Manila' as "Due (Manila)",
  pef.available_from::text as "Raw Available",
  pef.due_date::text as "Raw Due",
  pef.deadline_synced_from_phase_id as "Synced From Phase"
FROM project_evaluation_forms pef
JOIN projects p ON pef.project_id = p.id
WHERE p.title = 'last'
ORDER BY p.created_at DESC
LIMIT 1;

-- Query 3: ✅ VERIFY SYNC - Project eval should MATCH Phase 1's evaluation dates
WITH phase_eval AS (
  SELECT 
    pef.available_from AT TIME ZONE 'Asia/Manila' as phase_eval_start,
    pef.due_date AT TIME ZONE 'Asia/Manila' as phase_eval_due
  FROM phase_evaluation_forms pef
  JOIN project_phases pp ON pef.phase_id = pp.id
  WHERE pp.project_id = (
    SELECT id FROM projects WHERE title = 'last' ORDER BY created_at DESC LIMIT 1
  )
  AND pp.phase_number = 1
),
project_eval AS (
  SELECT 
    pef.available_from AT TIME ZONE 'Asia/Manila' as proj_eval_start,
    pef.due_date AT TIME ZONE 'Asia/Manila' as proj_eval_due
  FROM project_evaluation_forms pef
  WHERE pef.project_id = (
    SELECT id FROM projects WHERE title = 'last' ORDER BY created_at DESC LIMIT 1
  )
)
SELECT 
  'Phase 1 Eval' as eval_source,
  pe.phase_eval_start,
  pe.phase_eval_due
FROM phase_eval pe
UNION ALL
SELECT 
  'Project Eval' as eval_source,
  pje.proj_eval_start,
  pje.proj_eval_due
FROM project_eval pje;

-- Query 4: DEBUG - Raw data to see what's actually stored
SELECT 
  'Project Eval - Raw' as source,
  pef.available_from::text as raw_available,
  pef.due_date::text as raw_due,
  pef.deadline_synced_from_phase_id
FROM project_evaluation_forms pef
WHERE pef.project_id = (
  SELECT id FROM projects WHERE title = 'last' ORDER BY created_at DESC LIMIT 1
)
UNION ALL
SELECT 
  'Phase 1 Eval - Raw' as source,
  pef.available_from::text as raw_available,
  pef.due_date::text as raw_due,
  NULL::uuid as deadline_synced_from_phase_id
FROM phase_evaluation_forms pef
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pp.project_id = (
  SELECT id FROM projects WHERE title = 'last' ORDER BY created_at DESC LIMIT 1
)
AND pp.phase_number = 1;
