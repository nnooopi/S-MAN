-- Check if there are any evaluation forms in the database
SELECT 'phase_evaluation_forms' as table_name, COUNT(*) as row_count FROM phase_evaluation_forms
UNION ALL
SELECT 'project_evaluation_forms' as table_name, COUNT(*) as row_count FROM project_evaluation_forms;

-- Show evaluation forms with phase details
SELECT 
  pef.id,
  pef.phase_id,
  pef.available_from,
  pef.due_date,
  pp.phase_number,
  pp.project_id
FROM phase_evaluation_forms pef
LEFT JOIN project_phases pp ON pef.phase_id = pp.id
LIMIT 10;

-- Show project evaluation forms
SELECT 
  pef.id,
  pef.project_id,
  pef.available_from,
  pef.due_date,
  p.title
FROM project_evaluation_forms pef
LEFT JOIN projects p ON pef.project_id = p.id
LIMIT 10;
