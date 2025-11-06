-- Fix the notify_task_assigned trigger to get group_id from project_groups
-- The tasks table does NOT have a group_id column

DROP TRIGGER IF EXISTS notify_task_assigned_trigger ON public.tasks;
DROP FUNCTION IF EXISTS notify_task_assigned();

-- Recreate the function with correct logic
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    course_id_val UUID;
    project_id_val UUID;
    group_id_val UUID;
BEGIN
    -- Get course_id and project_id from project_phases
    SELECT p.course_id, ph.project_id
    INTO course_id_val, project_id_val
    FROM public.project_phases ph
    JOIN public.projects p ON ph.project_id = p.id
    WHERE ph.id = NEW.phase_id;
    
    -- Get group_id from project_groups by finding which group the assigned student belongs to
    SELECT pg.id INTO group_id_val
    FROM public.project_groups pg
    JOIN public.project_group_members pgm ON pgm.group_id = pg.id
    WHERE pg.project_id = project_id_val
    AND pgm.student_id = NEW.assigned_to
    LIMIT 1;
    
    -- Insert notification
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
        group_id_val,  -- Now correctly retrieved from project_groups
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
