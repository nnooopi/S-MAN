-- Add missing columns to projects table
-- These columns are needed for the enhanced project creation functionality

-- Add start_date column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Add breathe_phase_days column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS breathe_phase_days INTEGER DEFAULT 0;

-- Add project_rubric_type column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_rubric_type VARCHAR(20) DEFAULT 'builtin' 
CHECK (project_rubric_type IN ('builtin', 'custom'));

-- Add project_evaluation_type column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_evaluation_type VARCHAR(20) DEFAULT 'builtin' 
CHECK (project_evaluation_type IN ('builtin', 'custom'));

-- Add project_evaluation_deadline column (nullable)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_evaluation_deadline TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN projects.start_date IS 'Project start date - when the project becomes active';
COMMENT ON COLUMN projects.breathe_phase_days IS 'Number of days between phases (breathe phase)';
COMMENT ON COLUMN projects.project_rubric_type IS 'Type of project rubric: builtin or custom';
COMMENT ON COLUMN projects.project_evaluation_type IS 'Type of project evaluation form: builtin or custom';
COMMENT ON COLUMN projects.project_evaluation_deadline IS 'Deadline for project evaluation form submission';

-- Update existing projects to have default values
UPDATE projects 
SET 
  start_date = created_at,
  breathe_phase_days = 0,
  project_rubric_type = 'builtin',
  project_evaluation_type = 'builtin'
WHERE start_date IS NULL;
