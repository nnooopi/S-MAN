-- =====================================================
-- NOTIFICATIONS SYSTEM FOR STUDENT DASHBOARD
-- =====================================================
-- This script creates a comprehensive notifications table
-- and triggers for automatic notification generation
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
    -- Types: 'task_assigned', 'feedback_received', 'submission_approved', 
    --        'submission_revision', 'grade_released', 'deliverable_submitted',
    --        'extension_approved', 'extension_rejected', 'announcement_posted'
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities (nullable - depends on notification type)
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.member_tasks(id) ON DELETE CASCADE,
    submission_id UUID,  -- Can reference task_submissions or phase/project submissions
    feedback_id UUID REFERENCES public.task_feedback(id) ON DELETE CASCADE,
    extension_request_id UUID REFERENCES public.task_extension_requests(id) ON DELETE CASCADE,
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    
    -- Actor information (who triggered this notification)
    actor_id UUID,  -- Can be student or professor
    actor_type VARCHAR(20),  -- 'student', 'professor', 'system'
    actor_name VARCHAR(255),
    
    -- Additional metadata
    metadata JSONB,  -- Store additional context like grade value, etc.
    
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

-- Composite index for common queries
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

-- =====================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Function: Notify when task is assigned
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
    -- Get task details
    INSERT INTO public.notifications (
        recipient_id,
        notification_type,
        title,
        message,
        course_id,
        project_id,
        phase_id,
        task_id,
        actor_id,
        actor_type,
        actor_name,
        metadata
    )
    SELECT 
        NEW.assigned_to,
        'task_assigned',
        'New Task Assigned',
        'You have been assigned a new task: ' || NEW.title,
        p.course_id,
        ph.project_id,
        NEW.phase_id,
        NEW.id,
        gm.student_id,  -- Leader who assigned
        'student',
        CONCAT(sa.first_name, ' ', sa.last_name),
        jsonb_build_object(
            'task_title', NEW.title,
            'due_date', NEW.due_date,
            'max_attempts', NEW.max_attempts
        )
    FROM public.project_phases ph
    JOIN public.projects p ON ph.project_id = p.id
    LEFT JOIN public.group_members gm ON gm.group_id = (
        SELECT group_id FROM public.group_members WHERE student_id = NEW.assigned_to LIMIT 1
    ) AND gm.role = 'leader'
    LEFT JOIN public.studentaccounts sa ON sa.id = gm.student_id
    WHERE ph.id = NEW.phase_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify when feedback is received
CREATE OR REPLACE FUNCTION notify_feedback_received()
RETURNS TRIGGER AS $$
DECLARE
    task_owner_id UUID;
    task_title_text VARCHAR(255);
    project_id_val UUID;
    phase_id_val UUID;
    course_id_val UUID;
BEGIN
    -- Get task owner and details
    SELECT 
        mt.assigned_to,
        mt.title,
        ph.project_id,
        mt.phase_id,
        p.course_id
    INTO 
        task_owner_id,
        task_title_text,
        project_id_val,
        phase_id_val,
        course_id_val
    FROM public.member_tasks mt
    JOIN public.project_phases ph ON mt.phase_id = ph.id
    JOIN public.projects p ON ph.project_id = p.id
    WHERE mt.id = NEW.task_id;
    
    -- Create notification for task owner
    IF task_owner_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            recipient_id,
            notification_type,
            title,
            message,
            course_id,
            project_id,
            phase_id,
            task_id,
            feedback_id,
            actor_id,
            actor_type,
            actor_name,
            metadata
        )
        SELECT 
            task_owner_id,
            'feedback_received',
            'New Feedback Received',
            'You received feedback on your submission for: ' || task_title_text,
            course_id_val,
            project_id_val,
            phase_id_val,
            NEW.task_id,
            NEW.id,
            NEW.feedback_by,
            'student',  -- Assuming leader gives feedback
            CONCAT(sa.first_name, ' ', sa.last_name),
            jsonb_build_object(
                'feedback_text', NEW.feedback_text,
                'submission_type', NEW.submission_type
            )
        FROM public.studentaccounts sa
        WHERE sa.id = NEW.feedback_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify when submission is approved or needs revision
CREATE OR REPLACE FUNCTION notify_submission_status_change()
RETURNS TRIGGER AS $$
DECLARE
    task_owner_id UUID;
    task_title_text VARCHAR(255);
    project_id_val UUID;
    phase_id_val UUID;
    course_id_val UUID;
    notif_type VARCHAR(50);
    notif_title VARCHAR(255);
    notif_message TEXT;
BEGIN
    -- Only trigger on status change
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Get task owner and details
    SELECT 
        mt.assigned_to,
        mt.title,
        ph.project_id,
        mt.phase_id,
        p.course_id
    INTO 
        task_owner_id,
        task_title_text,
        project_id_val,
        phase_id_val,
        course_id_val
    FROM public.member_tasks mt
    JOIN public.project_phases ph ON mt.phase_id = ph.id
    JOIN public.projects p ON ph.project_id = p.id
    WHERE mt.id = NEW.task_id;
    
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
    IF task_owner_id IS NOT NULL THEN
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
            metadata
        )
        VALUES (
            task_owner_id,
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
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify when phase/project grade is released
CREATE OR REPLACE FUNCTION notify_grade_released()
RETURNS TRIGGER AS $$
DECLARE
    group_member_ids UUID[];
    member_id UUID;
BEGIN
    -- Only trigger when grade is newly added (was NULL, now has value)
    IF OLD.grade IS NOT NULL OR NEW.grade IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get all group members
    SELECT ARRAY_AGG(student_id)
    INTO group_member_ids
    FROM public.group_members
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
            submission_id,
            metadata
        )
        SELECT 
            member_id,
            'grade_released',
            '📊 New Grade Posted',
            'Your grade for ' || 
                CASE 
                    WHEN NEW.phase_id IS NOT NULL THEN 'Phase ' || ph.phase_number || ' of ' || p.title
                    ELSE 'Project: ' || p.title
                END || ' has been posted.',
            p.course_id,
            COALESCE(NEW.project_id, ph.project_id),
            NEW.phase_id,
            NEW.id,
            jsonb_build_object(
                'grade', NEW.grade,
                'max_grade', NEW.max_grade,
                'percentage', ROUND((NEW.grade::NUMERIC / NEW.max_grade::NUMERIC * 100), 2)
            )
        FROM public.projects p
        LEFT JOIN public.project_phases ph ON ph.id = NEW.phase_id
        WHERE p.id = COALESCE(NEW.project_id, ph.project_id);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify when extension request is approved/rejected
CREATE OR REPLACE FUNCTION notify_extension_decision()
RETURNS TRIGGER AS $$
DECLARE
    task_title_text VARCHAR(255);
    project_id_val UUID;
    phase_id_val UUID;
    course_id_val UUID;
    notif_title VARCHAR(255);
    notif_message TEXT;
BEGIN
    -- Only trigger on status change to approved or rejected
    IF OLD.status = NEW.status OR (NEW.status != 'approved' AND NEW.status != 'rejected') THEN
        RETURN NEW;
    END IF;
    
    -- Get task details
    SELECT 
        mt.title,
        ph.project_id,
        mt.phase_id,
        p.course_id
    INTO 
        task_title_text,
        project_id_val,
        phase_id_val,
        course_id_val
    FROM public.member_tasks mt
    JOIN public.project_phases ph ON mt.phase_id = ph.id
    JOIN public.projects p ON ph.project_id = p.id
    WHERE mt.id = NEW.task_id;
    
    -- Determine notification message
    IF NEW.status = 'approved' THEN
        notif_title := '✅ Extension Request Approved';
        notif_message := 'Your extension request for "' || task_title_text || '" has been approved. New deadline: ' || 
                        TO_CHAR(NEW.new_due_date, 'Mon DD, YYYY HH12:MI AM');
    ELSE
        notif_title := '❌ Extension Request Rejected';
        notif_message := 'Your extension request for "' || task_title_text || '" has been rejected.';
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
        extension_request_id,
        metadata
    )
    VALUES (
        NEW.requested_by,
        CASE WHEN NEW.status = 'approved' THEN 'extension_approved' ELSE 'extension_rejected' END,
        notif_title,
        notif_message,
        course_id_val,
        project_id_val,
        phase_id_val,
        NEW.task_id,
        NEW.id,
        jsonb_build_object(
            'status', NEW.status,
            'old_due_date', NEW.original_due_date,
            'new_due_date', NEW.new_due_date,
            'reason', NEW.reason,
            'leader_notes', NEW.leader_notes
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify group when leader submits deliverable
CREATE OR REPLACE FUNCTION notify_deliverable_submitted()
RETURNS TRIGGER AS $$
DECLARE
    group_member_ids UUID[];
    member_id UUID;
    submitter_id UUID;
    deliverable_type_text VARCHAR(50);
BEGIN
    -- Only notify on new submissions
    IF OLD.id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get all group members except the submitter
    SELECT ARRAY_AGG(student_id)
    INTO group_member_ids
    FROM public.group_members
    WHERE group_id = NEW.group_id 
    AND student_id != NEW.submitted_by;
    
    -- Determine deliverable type
    deliverable_type_text := CASE 
        WHEN NEW.phase_id IS NOT NULL THEN 'Phase Deliverable'
        ELSE 'Project Deliverable'
    END;
    
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
            submission_id,
            actor_id,
            actor_type,
            actor_name,
            metadata
        )
        SELECT 
            member_id,
            'deliverable_submitted',
            '📤 Deliverable Submitted',
            'Your group leader has submitted the ' || deliverable_type_text || ' for ' || p.title,
            p.course_id,
            COALESCE(NEW.project_id, ph.project_id),
            NEW.phase_id,
            NEW.id,
            NEW.submitted_by,
            'student',
            CONCAT(sa.first_name, ' ', sa.last_name),
            jsonb_build_object(
                'deliverable_type', deliverable_type_text,
                'submitted_at', NEW.submitted_at
            )
        FROM public.projects p
        LEFT JOIN public.project_phases ph ON ph.id = NEW.phase_id
        LEFT JOIN public.studentaccounts sa ON sa.id = NEW.submitted_by
        WHERE p.id = COALESCE(NEW.project_id, ph.project_id);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger: Task assigned
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.member_tasks;
CREATE TRIGGER trigger_notify_task_assigned
AFTER INSERT ON public.member_tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assigned();

-- Trigger: Feedback received
DROP TRIGGER IF EXISTS trigger_notify_feedback_received ON public.task_feedback;
CREATE TRIGGER trigger_notify_feedback_received
AFTER INSERT ON public.task_feedback
FOR EACH ROW
EXECUTE FUNCTION notify_feedback_received();

-- Trigger: Submission status change
DROP TRIGGER IF EXISTS trigger_notify_submission_status ON public.task_submissions;
CREATE TRIGGER trigger_notify_submission_status
AFTER UPDATE ON public.task_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_status_change();

-- Trigger: Phase deliverable grade released
DROP TRIGGER IF EXISTS trigger_notify_phase_grade ON public.phase_deliverable_submissions;
CREATE TRIGGER trigger_notify_phase_grade
AFTER UPDATE ON public.phase_deliverable_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_grade_released();

-- Trigger: Project deliverable grade released
DROP TRIGGER IF EXISTS trigger_notify_project_grade ON public.project_deliverable_submissions;
CREATE TRIGGER trigger_notify_project_grade
AFTER UPDATE ON public.project_deliverable_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_grade_released();

-- Trigger: Extension request decision
DROP TRIGGER IF EXISTS trigger_notify_extension_decision ON public.task_extension_requests;
CREATE TRIGGER trigger_notify_extension_decision
AFTER UPDATE ON public.task_extension_requests
FOR EACH ROW
EXECUTE FUNCTION notify_extension_decision();

-- Trigger: Phase deliverable submitted
DROP TRIGGER IF EXISTS trigger_notify_phase_deliverable ON public.phase_deliverable_submissions;
CREATE TRIGGER trigger_notify_phase_deliverable
AFTER INSERT ON public.phase_deliverable_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_deliverable_submitted();

-- Trigger: Project deliverable submitted
DROP TRIGGER IF EXISTS trigger_notify_project_deliverable ON public.project_deliverable_submissions;
CREATE TRIGGER trigger_notify_project_deliverable
AFTER INSERT ON public.project_deliverable_submissions
FOR EACH ROW
EXECUTE FUNCTION notify_deliverable_submitted();

-- =====================================================
-- HELPER FUNCTION: Mark notification as read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Mark all notifications as read
-- =====================================================
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

-- =====================================================
-- HELPER FUNCTION: Delete notification
-- =====================================================
CREATE OR REPLACE FUNCTION delete_notification(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Archive notification
-- =====================================================
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
    RAISE NOTICE '🔔 Triggers: 8 automatic notification triggers installed';
    RAISE NOTICE '🔐 RLS: Row Level Security enabled';
    RAISE NOTICE '🎯 Ready to use!';
END $$;
