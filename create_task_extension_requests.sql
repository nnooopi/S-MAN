-- ============================================
-- TASK DEADLINE EXTENSION REQUEST SYSTEM
-- ============================================
-- This table stores deadline extension requests from students for missed tasks
-- Leaders can approve/reject requests and set new deadlines within phase boundaries

-- Drop existing table if exists
DROP TABLE IF EXISTS public.task_extension_requests CASCADE;

-- Create task_extension_requests table
CREATE TABLE public.task_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Task and Student Information
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
    
    -- Original Deadline Information
    original_due_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    original_available_until TIMESTAMP WITHOUT TIME ZONE,
    
    -- Request Information
    reason TEXT NOT NULL, -- Student's reason for requesting extension
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- New Deadline (set by leader upon approval)
    new_due_date TIMESTAMP WITHOUT TIME ZONE,
    new_available_until TIMESTAMP WITHOUT TIME ZONE,
    
    -- Request Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Leader Response
    reviewed_by UUID REFERENCES public.studentaccounts(id), -- Leader who reviewed the request
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT, -- Optional: reason for rejection
    leader_notes TEXT, -- Optional: additional notes from leader
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_extension_requests_task_id ON public.task_extension_requests(task_id);
CREATE INDEX idx_extension_requests_student_id ON public.task_extension_requests(student_id);
CREATE INDEX idx_extension_requests_phase_id ON public.task_extension_requests(phase_id);
CREATE INDEX idx_extension_requests_project_id ON public.task_extension_requests(project_id);
CREATE INDEX idx_extension_requests_group_id ON public.task_extension_requests(group_id);
CREATE INDEX idx_extension_requests_status ON public.task_extension_requests(status);
CREATE INDEX idx_extension_requests_reviewed_by ON public.task_extension_requests(reviewed_by);

-- Add composite index for common queries
CREATE INDEX idx_extension_requests_group_status ON public.task_extension_requests(group_id, status);
CREATE INDEX idx_extension_requests_task_student ON public.task_extension_requests(task_id, student_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_task_extension_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_extension_requests_updated_at
    BEFORE UPDATE ON public.task_extension_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_task_extension_requests_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.task_extension_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own extension requests
CREATE POLICY "Students can view own extension requests"
    ON public.task_extension_requests
    FOR SELECT
    USING (
        student_id = auth.uid()
    );

-- Policy: Students can create extension requests for their own tasks
CREATE POLICY "Students can create extension requests"
    ON public.task_extension_requests
    FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND t.assigned_to = auth.uid()
        )
    );

-- Policy: Leaders can view all extension requests in their group
CREATE POLICY "Leaders can view group extension requests"
    ON public.task_extension_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_group_members cgm
            WHERE cgm.group_id = group_id
            AND cgm.student_id = auth.uid()
            AND cgm.role = 'leader'
        )
    );

-- Policy: Leaders can update extension requests in their group
CREATE POLICY "Leaders can update group extension requests"
    ON public.task_extension_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.course_group_members cgm
            WHERE cgm.group_id = group_id
            AND cgm.student_id = auth.uid()
            AND cgm.role = 'leader'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_group_members cgm
            WHERE cgm.group_id = group_id
            AND cgm.student_id = auth.uid()
            AND cgm.role = 'leader'
        )
    );

-- Policy: Professors can view all extension requests in their courses
CREATE POLICY "Professors can view course extension requests"
    ON public.task_extension_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.courses c ON c.id = p.course_id
            WHERE p.id = project_id
            AND c.professor_id = auth.uid()
        )
    );

-- Policy: Professors can update all extension requests in their courses
CREATE POLICY "Professors can update course extension requests"
    ON public.task_extension_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.courses c ON c.id = p.course_id
            WHERE p.id = project_id
            AND c.professor_id = auth.uid()
        )
    );

-- ============================================
-- HELPFUL COMMENTS
-- ============================================

COMMENT ON TABLE public.task_extension_requests IS 'Stores deadline extension requests from students for missed tasks';
COMMENT ON COLUMN public.task_extension_requests.id IS 'Primary key';
COMMENT ON COLUMN public.task_extension_requests.task_id IS 'Reference to the task for which extension is requested';
COMMENT ON COLUMN public.task_extension_requests.student_id IS 'Student who requested the extension';
COMMENT ON COLUMN public.task_extension_requests.phase_id IS 'Phase to which the task belongs';
COMMENT ON COLUMN public.task_extension_requests.project_id IS 'Project to which the task belongs';
COMMENT ON COLUMN public.task_extension_requests.group_id IS 'Group to which the student belongs';
COMMENT ON COLUMN public.task_extension_requests.original_due_date IS 'Original due date of the task';
COMMENT ON COLUMN public.task_extension_requests.original_available_until IS 'Original available until date of the task';
COMMENT ON COLUMN public.task_extension_requests.reason IS 'Student reason for requesting extension';
COMMENT ON COLUMN public.task_extension_requests.requested_at IS 'When the extension was requested';
COMMENT ON COLUMN public.task_extension_requests.new_due_date IS 'New due date set by leader (upon approval)';
COMMENT ON COLUMN public.task_extension_requests.new_available_until IS 'New available until date set by leader (upon approval)';
COMMENT ON COLUMN public.task_extension_requests.status IS 'Status: pending, approved, or rejected';
COMMENT ON COLUMN public.task_extension_requests.reviewed_by IS 'Leader who reviewed the request';
COMMENT ON COLUMN public.task_extension_requests.reviewed_at IS 'When the request was reviewed';
COMMENT ON COLUMN public.task_extension_requests.rejection_reason IS 'Reason for rejection (if rejected)';
COMMENT ON COLUMN public.task_extension_requests.leader_notes IS 'Additional notes from leader';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the table was created successfully:
-- SELECT * FROM public.task_extension_requests LIMIT 1;
