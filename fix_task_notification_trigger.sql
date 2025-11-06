-- Fix the notify_task_assigned trigger to not reference non-existent group_id column
-- The tasks table does NOT have a group_id column
-- Task notifications don't need group_id since tasks are assigned to individual students

DROP TRIGGER IF EXISTS notify_task_assigned_trigger ON public.tasks;
DROP FUNCTION IF EXISTS notify_task_assigned();

-- Recreate the function without referencing NEW.group_id
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    course_id_val UUID;
    project_id_val UUID;
BEGIN
    -- Get course_id and project_id from project_phases
    SELECT p.course_id, ph.project_id
    INTO course_id_val, project_id_val
    FROM public.project_phases ph
    JOIN public.projects p ON ph.project_id = p.id
    WHERE ph.id = NEW.phase_id;
    
    -- Insert notification (group_id is NULL since tasks are individual assignments)
    INSERT INTO public.notifications (
        recipient_id,
        notification_type,
        title,
        message,
        course_id,
        project_id,
        phase_id,
        task_id,
        group_id,
        metadata,
        created_at
    )
    VALUES (
        NEW.assigned_to,
        'task_assigned',
        'New Task Assigned: ' || NEW.title,
        'You have been assigned a new task: ' || NEW.title,
        course_id_val,
        project_id_val,
        NEW.phase_id,
        NEW.id,
        NULL,  -- Tasks are assigned to individuals, not groups
        jsonb_build_object(
            'task_title', NEW.title,
            'due_date', NEW.due_date,
            'task_id', NEW.id
        ),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER notify_task_assigned_trigger
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assigned();
