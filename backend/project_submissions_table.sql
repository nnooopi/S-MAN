-- Create project_submissions table
-- This table stores the final project completion submissions

CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES studentaccounts(id),
    file_urls TEXT[], -- Array of file URLs
    submission_text TEXT,
    submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
    grade NUMERIC(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    feedback TEXT,
    graded_by UUID REFERENCES professoraccounts(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    is_late BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one submission per project per group
ALTER TABLE project_submissions 
ADD CONSTRAINT project_submissions_project_group_unique 
UNIQUE (project_id, group_id);

-- Create indexes for better performance
CREATE INDEX idx_project_submissions_project_id ON project_submissions(project_id);
CREATE INDEX idx_project_submissions_group_id ON project_submissions(group_id);
CREATE INDEX idx_project_submissions_submitted_by ON project_submissions(submitted_by);
CREATE INDEX idx_project_submissions_status ON project_submissions(status);

-- Add comments for documentation
COMMENT ON TABLE project_submissions IS 'Stores final project completion submissions by groups';
COMMENT ON COLUMN project_submissions.project_id IS 'Reference to the project being submitted';
COMMENT ON COLUMN project_submissions.group_id IS 'Reference to the group making the submission';
COMMENT ON COLUMN project_submissions.submitted_by IS 'Student leader who submitted the project';
COMMENT ON COLUMN project_submissions.file_urls IS 'Array of uploaded file URLs for the project';
COMMENT ON COLUMN project_submissions.status IS 'Submission status: submitted or graded';
COMMENT ON COLUMN project_submissions.is_late IS 'Whether the submission was made after the project due date';