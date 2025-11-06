-- =====================================================
-- BREATHE PHASES TABLE
-- =====================================================
-- Stores rest/breathe periods between phase evaluations
-- Each breathe period comes after a phase evaluation
-- Pattern: Phase → Evaluation → Breathe → Phase → ...
-- =====================================================

-- Drop table if exists
DROP TABLE IF EXISTS phase_breathe_periods CASCADE;

-- Create breathe periods table
CREATE TABLE IF NOT EXISTS phase_breathe_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL,
  project_id UUID NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  CONSTRAINT fk_breathe_phase_id FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE CASCADE,
  CONSTRAINT fk_breathe_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Data Constraints
  CONSTRAINT breathe_period_dates_valid CHECK (end_date > start_date),
  CONSTRAINT breathe_duration_positive CHECK (duration_days > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_breathe_periods_phase_id ON phase_breathe_periods(phase_id);
CREATE INDEX IF NOT EXISTS idx_breathe_periods_project_id ON phase_breathe_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_breathe_periods_dates ON phase_breathe_periods(start_date, end_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE phase_breathe_periods ENABLE ROW LEVEL SECURITY;

-- Allow professors to insert/update/delete breathe periods for their projects
CREATE POLICY "Professors can manage breathe periods for their projects"
  ON phase_breathe_periods FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.created_by = auth.uid()
    )
  );

-- Allow students to view breathe periods for projects they're enrolled in
CREATE POLICY "Students can view breathe periods for their projects"
  ON phase_breathe_periods FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN courses c ON p.course_id = c.id
      INNER JOIN course_group_members cgm ON c.id = cgm.id
      WHERE cgm.student_id = auth.uid() AND cgm.is_active = true
    )
  );

-- Add table comments
COMMENT ON TABLE phase_breathe_periods IS 'Rest/breathe periods between phase evaluations. Stores when students get a break between phases.';
COMMENT ON COLUMN phase_breathe_periods.id IS 'Unique identifier for this breathe period';
COMMENT ON COLUMN phase_breathe_periods.phase_id IS 'Reference to the project phase this breathe period follows';
COMMENT ON COLUMN phase_breathe_periods.project_id IS 'Reference to the project (for efficient querying and filtering)';
COMMENT ON COLUMN phase_breathe_periods.start_date IS 'When the breathe period starts (usually right after evaluation phase ends)';
COMMENT ON COLUMN phase_breathe_periods.end_date IS 'When the breathe period ends (before the next phase starts)';
COMMENT ON COLUMN phase_breathe_periods.duration_days IS 'Number of days for this breathe period';
COMMENT ON COLUMN phase_breathe_periods.created_at IS 'Timestamp when this breathe period was created';
COMMENT ON COLUMN phase_breathe_periods.updated_at IS 'Timestamp when this breathe period was last updated';
