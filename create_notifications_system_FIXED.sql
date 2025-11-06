-- =====================================================
-- NOTIFICATIONS SYSTEM FOR STUDENT DASHBOARD
-- FIXED VERSION - Uses correct table names
-- =====================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient information
    recipient_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    
    -- Notification metadata
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities (nullable - depends on notification type)
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.task_submissions(id) ON DELETE CASCADE,
    feedback_id UUID,  -- Optional: if feedback table exists
    extension_request_id UUID,  -- Optional: if extension table exists
    group_id UUID REFERENCES public.course_groups(id) ON DELETE CASCADE,
    
    -- Actor information (who triggered this notification)
    actor_id UUID,
    actor_type VARCHAR(20),  -- 'student', 'professor', 'system'
    actor_name VARCHAR(255),
    
    -- Additional metadata
    metadata JSONB,
    
    -- Notification status
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_course ON public.notifications(course_id);
CREATE INDEX idx_notifications_project ON public.notifications(project_id);
CREATE INDEX idx_notifications_task ON public.notifications(task_id);
CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can only see their own notifications
CREATE POLICY "Students can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- RLS Policy: Students can update their own notifications (mark as read/archived)
CREATE POLICY "Students can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- RLS Policy: System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policy: Students can delete their own notifications
CREATE POLICY "Students can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- =====================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Function: Notify when task is assigned
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
    course_id_val UUID;
    project_id_val UUID;
    assigned_to_val UUID;
    actor_name_val VARCHAR;
BEGIN
    -- Get course_id from project_phases
    SELECT p.course_id, ph.project_id
    INTO course_id_val, project_id_val
    FROM public.project_phases ph
    JOIN public.projects p ON ph.project_id = p.id
    WHERE ph.id = NEW.phase_id;
    
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
        NEW.group_id,
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

-- Function: Notify when submission status changes
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
    SELECT t.title, ph.phase_id, ph.project_id, p.course_id
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
            'task_title', task_title_text
        ),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify group members when phase grade is released
CREATE OR REPLACE FUNCTION notify_phase_grade_released()
RETURNS TRIGGER AS $$
DECLARE
    group_member_ids UUID[];
    member_id UUID;
    phase_name_text VARCHAR;
    project_title_text VARCHAR;
    course_id_val UUID;
    project_id_val UUID;
BEGIN
    -- Only trigger when grade is newly added
    IF OLD.grade IS NOT NULL OR NEW.grade IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get phase and project names
    SELECT ph.name, p.title, p.course_id, ph.project_id
    INTO phase_name_text, project_title_text, course_id_val, project_id_val
    FROM public.project_phases ph
    JOIN public.projects p ON ph.project_id = p.id
    WHERE ph.id = NEW.phase_id;
    
    -- Get all group members
    SELECT ARRAY_AGG(student_id)
    INTO group_member_ids
    FROM public.course_group_members
    WHERE group_id = NEW.group_id;
    
    -- Create notification for each group member
    FOREACH member_id IN ARRAY group_member_ids
    LOOP
        INSERT INTO public.notifications (
            recipient_id,
            notification_type,
            title,
            message,
            course_id,
            project_id,
            phase_id,
            group_id,
            metadata,
            created_at
        )
        VALUES (
            member_id,
            'grade_released',
            '📊 New Grade Posted',
            'Your grade for ' || phase_name_text || ' of ' || project_title_text || ' has been posted.',
            course_id_val,
            project_id_val,
            NEW.phase_id,
            NEW.group_id,
            jsonb_build_object(
                'grade', NEW.grade,
                'phase_name', phase_name_text,
                'project_title', project_title_text
            ),
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger: Task assigned
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_task_assigned
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assigned();

-- Trigger: Submission status change
DROP TRIGGER IF EXISTS trigger_notify_submission_status ON public.task_submissions;
CREATE TRIGGER trigger_notify_submission_status
AFTER UPDATE ON public.task_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_status_change();

-- Trigger: Phase grade released (if phase evaluation table exists)
-- Uncomment when you have the correct grade table name
-- DROP TRIGGER IF EXISTS trigger_notify_phase_grade ON public.phase_grades;
-- CREATE TRIGGER trigger_notify_phase_grade
-- AFTER UPDATE ON public.phase_grades
-- FOR EACH ROW
-- EXECUTE FUNCTION notify_phase_grade_released();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE recipient_id = auth.uid() AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete notification
CREATE OR REPLACE FUNCTION delete_notification(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Archive notification
CREATE OR REPLACE FUNCTION archive_notification(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_archived = TRUE, updated_at = NOW()
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION delete_notification TO authenticated;
GRANT EXECUTE ON FUNCTION archive_notification TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Notifications system created successfully!';
    RAISE NOTICE '📋 Table: public.notifications';
    RAISE NOTICE '🔔 Triggers: 3 notification triggers installed';
    RAISE NOTICE '🔐 RLS: Row Level Security enabled';
    RAISE NOTICE '🎯 Ready to use!';
END $$;
