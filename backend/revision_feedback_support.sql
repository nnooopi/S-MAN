-- SQL to modify the feedback system to support revision submissions
-- Simple approach: Create a unified feedback system for both submission types

-- Step 1: Create a new unified feedback table that can handle both submission types
CREATE TABLE unified_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submission_id UUID, -- Can be NULL
    revision_submission_id UUID, -- Can be NULL  
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('task_submission', 'revision_submission')),
    feedback_by UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure exactly one submission reference is provided
    CONSTRAINT unified_feedback_submission_check CHECK (
        (submission_type = 'task_submission' AND submission_id IS NOT NULL AND revision_submission_id IS NULL) OR
        (submission_type = 'revision_submission' AND revision_submission_id IS NOT NULL AND submission_id IS NULL)
    ),
    
    -- Foreign key constraints
    CONSTRAINT unified_feedback_submission_id_fkey 
        FOREIGN KEY (submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE,
    CONSTRAINT unified_feedback_revision_submission_id_fkey 
        FOREIGN KEY (revision_submission_id) REFERENCES revision_submissions(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_unified_feedback_task_id ON unified_feedback(task_id);
CREATE INDEX idx_unified_feedback_submission_id ON unified_feedback(submission_id);
CREATE INDEX idx_unified_feedback_revision_submission_id ON unified_feedback(revision_submission_id);
CREATE INDEX idx_unified_feedback_feedback_by ON unified_feedback(feedback_by);
CREATE INDEX idx_unified_feedback_submission_type ON unified_feedback(submission_type);
CREATE INDEX idx_unified_feedback_created_at ON unified_feedback(created_at);

-- Step 3: Migrate existing feedback data
INSERT INTO unified_feedback (
    task_id, 
    submission_id, 
    submission_type, 
    feedback_by, 
    feedback_text, 
    rating, 
    created_at, 
    updated_at
)
SELECT 
    ts.task_id,
    tf.submission_id,
    'task_submission',
    tf.feedback_by,
    tf.feedback_text,
    tf.rating,
    tf.created_at,
    tf.updated_at
FROM task_feedback tf
JOIN task_submissions ts ON tf.submission_id = ts.id;

-- Step 4: Add comments for documentation
COMMENT ON TABLE unified_feedback IS 'Unified feedback system supporting both task submissions and revision submissions';
COMMENT ON COLUMN unified_feedback.submission_type IS 'Type of submission: task_submission or revision_submission';
COMMENT ON COLUMN unified_feedback.submission_id IS 'Reference to task_submissions table when feedback is for original submission';
COMMENT ON COLUMN unified_feedback.revision_submission_id IS 'Reference to revision_submissions table when feedback is for a revision';

-- Step 5: Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_unified_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for automatic updated_at
CREATE TRIGGER unified_feedback_updated_at_trigger
    BEFORE UPDATE ON unified_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_feedback_updated_at();

-- Alternative simpler approach: Just modify the existing constraint
-- If you prefer to modify the existing table instead of creating a new one:
/*
-- Drop the existing foreign key constraint
ALTER TABLE task_feedback DROP CONSTRAINT task_feedback_submission_id_fkey;

-- Add new columns
ALTER TABLE task_feedback 
ADD COLUMN submission_type VARCHAR(20) DEFAULT 'task_submission' CHECK (submission_type IN ('task_submission', 'revision_submission')),
ADD COLUMN revision_submission_id UUID REFERENCES revision_submissions(id) ON DELETE CASCADE;

-- Modify submission_id to allow NULL
ALTER TABLE task_feedback ALTER COLUMN submission_id DROP NOT NULL;

-- Add the conditional constraint
ALTER TABLE task_feedback 
ADD CONSTRAINT task_feedback_submission_reference_check 
CHECK (
    (submission_type = 'task_submission' AND submission_id IS NOT NULL AND revision_submission_id IS NULL) OR
    (submission_type = 'revision_submission' AND revision_submission_id IS NOT NULL AND submission_id IS NULL)
);

-- Re-add the foreign key constraint for task_submissions only when submission_id is not null
ALTER TABLE task_feedback
ADD CONSTRAINT task_feedback_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Update existing data
UPDATE task_feedback SET submission_type = 'task_submission' WHERE submission_type IS NULL;
ALTER TABLE task_feedback ALTER COLUMN submission_type SET NOT NULL;
*/