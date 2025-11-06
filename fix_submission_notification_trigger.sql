-- Fix the notify_submission_status_change trigger
-- Issue 1: Query references ph.phase_id which doesn't exist
-- Issue 2: submission_id foreign key constraint only allows task_submissions, but we also have revision_submissions
-- Fix: Use ph.id instead (phase_id is the primary key), and remove foreign key constraint on submission_id

-- Step 1: Drop the foreign key constraint on notifications.submission_id
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_submission_id_fkey;

-- Step 2: Recreate the trigger function with fixed query
CREATE OR REPLACE FUNCTION notify_submission_status_change()
RETURNS TRIGGER AS $$
DECLARE
    task_title_text VARCHAR;
    course_id_val UUID;
    phase_id_val UUID;
    project_id_val UUID;
    notif_type VARCHAR(50);
    notif_title VARCHAR(255);
    notif_message TEXT;
BEGIN
    -- Only trigger on status change
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Get task and course details
    -- FIXED: Changed ph.phase_id to ph.id (phase_id is the primary key)
    SELECT t.title, ph.id, ph.project_id, p.course_id
    INTO task_title_text, phase_id_val, project_id_val, course_id_val
    FROM public.tasks t
    JOIN public.project_phases ph ON t.phase_id = ph.id
    JOIN public.projects p ON ph.project_id = p.id
    WHERE t.id = NEW.task_id;
    
    -- Determine notification based on status
    IF NEW.status = 'completed' OR NEW.status = 'approved' THEN
        notif_type := 'submission_approved';
        notif_title := '✅ Submission Approved';
        notif_message := 'Your submission for "' || task_title_text || '" has been approved!';
    ELSIF NEW.status = 'revision_requested' THEN
        notif_type := 'submission_revision';
        notif_title := '📝 Revision Requested';
        notif_message := 'Your submission for "' || task_title_text || '" needs revision.';
    ELSE
        RETURN NEW;  -- Don't notify for other status changes
    END IF;
    
    -- Create notification
    -- FIXED: submission_id now works for both task_submissions and revision_submissions
    INSERT INTO public.notifications (
        recipient_id,
        notification_type,
        title,
        message,
        course_id,
        project_id,
        phase_id,
        task_id,
        submission_id,
        metadata,
        created_at
    )
    VALUES (
        NEW.submitted_by,
        notif_type,
        notif_title,
        notif_message,
        course_id_val,
        project_id_val,
        phase_id_val,
        NEW.task_id,
        NEW.id,
        jsonb_build_object(
            'status', NEW.status,
            'task_title', task_title_text,
            'submission_type', TG_TABLE_NAME  -- Store which table the submission is from
        ),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger on task_submissions
DROP TRIGGER IF EXISTS trigger_notify_submission_status ON public.task_submissions;
CREATE TRIGGER trigger_notify_submission_status
AFTER UPDATE ON public.task_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_status_change();

-- Also add trigger for revision_submissions if it doesn't exist
DROP TRIGGER IF EXISTS trigger_notify_revision_status ON public.revision_submissions;
CREATE TRIGGER trigger_notify_revision_status
AFTER UPDATE ON public.revision_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_status_change();
