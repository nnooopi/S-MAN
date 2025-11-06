-- Table to store frozen/snapshot versions of task submissions when leader submits phase
-- This captures the state of member task submissions at the moment of phase submission
CREATE TABLE frozen_task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links to original entities
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    original_submission_id UUID REFERENCES task_submissions(id) ON DELETE SET NULL,
    
    -- Frozen task data (in case task gets modified later)
    task_title TEXT NOT NULL,
    task_description TEXT,
    
    -- Frozen submission data
    submission_text TEXT,
    file_urls TEXT DEFAULT '[]', -- JSON array of file URLs (normalized from both file_urls and file_paths)
    original_status TEXT NOT NULL CHECK (original_status IN ('pending', 'approved', 'revision_requested', 'rejected', 'no_submission', 'assigned_no_submission')),
    original_submitted_at TIMESTAMP WITH TIME ZONE,
    attempt_number INTEGER DEFAULT 0,
    submission_type TEXT DEFAULT 'no_submission' CHECK (submission_type IN ('approved_revision', 'approved_original', 'latest_revision', 'latest_original', 'assigned_no_submission', 'no_submission')),
    is_revision_based BOOLEAN DEFAULT FALSE, -- Track if this frozen submission was based on a revision
    
    -- Freeze metadata
    frozen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    frozen_by_leader UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one frozen record per phase/task/student combination
    UNIQUE(phase_id, task_id, student_id, group_id)
);

-- Add indexes for performance
CREATE INDEX idx_frozen_task_submissions_phase_id ON frozen_task_submissions(phase_id);
CREATE INDEX idx_frozen_task_submissions_group_id ON frozen_task_submissions(group_id);
CREATE INDEX idx_frozen_task_submissions_student_id ON frozen_task_submissions(student_id);
CREATE INDEX idx_frozen_task_submissions_task_id ON frozen_task_submissions(task_id);
CREATE INDEX idx_frozen_task_submissions_frozen_at ON frozen_task_submissions(frozen_at);

-- Add comments
COMMENT ON TABLE frozen_task_submissions IS 'Frozen snapshots of task submissions captured when leader submits phase submission';
COMMENT ON COLUMN frozen_task_submissions.original_submission_id IS 'Reference to the actual task submission that was frozen (NULL if no submission existed)';
COMMENT ON COLUMN frozen_task_submissions.original_status IS 'Status of the submission at the time it was frozen, or no_submission if none existed';
COMMENT ON COLUMN frozen_task_submissions.frozen_by_leader IS 'Leader who submitted the phase submission that triggered this freeze';

-- Enable RLS (Row Level Security)
ALTER TABLE frozen_task_submissions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Professors can view all frozen task submissions" 
    ON frozen_task_submissions FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM professoraccounts 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Group leaders can view their group's frozen submissions" 
    ON frozen_task_submissions FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM course_group_members cgm
            WHERE cgm.group_id = frozen_task_submissions.group_id
            AND cgm.student_id = auth.uid()
            AND cgm.role = 'leader'
            AND cgm.is_active = true
        )
    );

CREATE POLICY "Students can view their own frozen submissions" 
    ON frozen_task_submissions FOR SELECT 
    TO authenticated 
    USING (student_id = auth.uid());

-- Only system/service role can insert/update frozen submissions
CREATE POLICY "Service role can manage frozen submissions" 
    ON frozen_task_submissions FOR ALL 
    TO service_role 
    USING (true);