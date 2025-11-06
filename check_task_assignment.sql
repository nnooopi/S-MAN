-- Query to check the task that was just created
-- Looking for task assigned to Marshalle Nopi Soriano in Phase 2 (concept)

SELECT 
  t.id,
  t.project_id,
  t.assigned_to,
  s.full_name,
  t.phase_id,
  p.phase_number,
  p.title as phase_title,
  t.title as task_title,
  t.description as task_description,
  t.due_date,
  t.available_until,
  t.max_attempts,
  t.current_attempts,
  t.status,
  t.is_active,
  t.file_types_allowed,
  t.created_at,
  t.updated_at
FROM tasks t
JOIN studentaccounts s ON t.assigned_to = s.id
JOIN project_phases p ON t.phase_id = p.id
WHERE s.full_name LIKE '%Marshalle%Nopi%Soriano%'
  AND p.title = 'concept'
  AND t.title = 'test'
ORDER BY t.created_at DESC
LIMIT 10;

-- Alternative: Get the most recent task overall
SELECT 
  t.id,
  t.project_id,
  t.assigned_to,
  s.full_name,
  t.phase_id,
  p.phase_number,
  p.title as phase_title,
  t.title as task_title,
  t.description as task_description,
  t.due_date,
  t.available_until,
  t.max_attempts,
  t.current_attempts,
  t.status,
  t.is_active,
  t.file_types_allowed,
  t.created_at
FROM tasks t
JOIN studentaccounts s ON t.assigned_to = s.id
JOIN project_phases p ON t.phase_id = p.id
ORDER BY t.created_at DESC
LIMIT 5;
