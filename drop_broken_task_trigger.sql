-- Drop the broken trigger that's causing task creation to fail
-- The trigger is trying to access NEW.group_id which doesn't exist in the tasks table

DROP TRIGGER IF EXISTS notify_task_assigned_trigger ON public.tasks;
DROP FUNCTION IF EXISTS notify_task_assigned();

-- You can re-create it later with the correct logic to fetch group_id from project_groups
