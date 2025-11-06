-- Create table for handling revision submissions separately
-- This table will track revision attempts without affecting the main tasks table constraints

CREATE TABLE revision_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_submission_id UUID NOT NULL,
    task_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    revision_attempt_number INTEGER NOT NULL DEFAULT 1,
    submission_text TEXT,
    file_paths TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    review_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT revision_submissions_original_submission_fkey 
        FOREIGN KEY (original_submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE,
    CONSTRAINT revision_submissions_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT revision_submissions_submitted_by_fkey 
        FOREIGN KEY (submitted_by) REFERENCES studentaccounts(id) ON DELETE CASCADE,
    CONSTRAINT revision_submissions_reviewed_by_fkey 
        FOREIGN KEY (reviewed_by) REFERENCES studentaccounts(id),
    
    -- Check constraints
    CONSTRAINT revision_submissions_revision_attempt_check 
        CHECK (revision_attempt_number > 0),
    CONSTRAINT revision_submissions_status_check 
        CHECK (status IN ('pending', 'approved', 'revision_requested', 'rejected'))
);

-- Create indexes for performance
CREATE INDEX idx_revision_submissions_task_id ON revision_submissions(task_id);
CREATE INDEX idx_revision_submissions_submitted_by ON revision_submissions(submitted_by);
CREATE INDEX idx_revision_submissions_original_submission ON revision_submissions(original_submission_id);
CREATE INDEX idx_revision_submissions_status ON revision_submissions(status);

-- Add comments for documentation
COMMENT ON TABLE revision_submissions IS 'Tracks revision submissions separately from main task submissions to avoid constraint conflicts';
COMMENT ON COLUMN revision_submissions.revision_attempt_number IS 'Sequential number for revision attempts for the same original submission';
COMMENT ON COLUMN revision_submissions.original_submission_id IS 'References the original task submission that was marked for revision';