-- ============================================================================
-- SUPABASE SCHEMA FOR SIMPLIFIED PROJECT CREATOR
-- ============================================================================
-- This SQL creates all tables to store data from SimplifiedProjectCreator
-- Matches frontend data structure exactly
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  evaluation_phase_days INTEGER DEFAULT 1,
  breathe_phase_days INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_course_id ON projects(course_id);

-- ============================================================================
-- 2. PROJECT_PHASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_attempts INTEGER DEFAULT 3,
  file_types_allowed TEXT[] DEFAULT ARRAY[]::TEXT[], -- JSON array of file extensions
  rubric_type VARCHAR(50), -- 'builtin' or 'upload'
  evaluation_form_type VARCHAR(50), -- 'builtin' or 'custom'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, phase_number)
);

CREATE INDEX idx_project_phases_project_id ON project_phases(project_id);

-- ============================================================================
-- 3. PHASE_RUBRICS TABLE (for built-in rubrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  instructions TEXT,
  total_points INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phase_rubrics_phase_id ON phase_rubrics(phase_id);

-- ============================================================================
-- 4. PHASE_RUBRIC_CRITERIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES phase_rubrics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points INTEGER NOT NULL,
  criterion_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phase_rubric_criteria_rubric_id ON phase_rubric_criteria(rubric_id);

-- ============================================================================
-- 5. PHASE_EVALUATION_FORMS TABLE (for built-in evaluation forms)
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_evaluation_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  available_from TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  instructions TEXT,
  total_points INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phase_evaluation_forms_phase_id ON phase_evaluation_forms(phase_id);

-- ============================================================================
-- 6. PHASE_EVALUATION_CRITERIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_form_id UUID NOT NULL REFERENCES phase_evaluation_forms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points INTEGER NOT NULL,
  criterion_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phase_evaluation_criteria_evaluation_form_id ON phase_evaluation_criteria(evaluation_form_id);

-- ============================================================================
-- 7. PHASE_BREATHE_PERIODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_breathe_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  is_final_breathe BOOLEAN DEFAULT FALSE, -- TRUE if this is the last phase's breathe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phase_breathe_periods_phase_id ON phase_breathe_periods(phase_id);
CREATE INDEX idx_phase_breathe_periods_project_id ON phase_breathe_periods(project_id);

-- ============================================================================
-- EXAMPLE DATA: Matching your frontend submission
-- ============================================================================

-- Insert project
INSERT INTO projects (
  id,
  course_id,
  title,
  description,
  start_date,
  due_date,
  evaluation_phase_days,
  breathe_phase_days
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  '123e4567-e89b-12d3-a456-426614174000'::UUID, -- Replace with actual course_id
  'x',
  'x',
  '2025-10-26 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-11-04 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  1,
  1
);

-- Insert Phase 1
INSERT INTO project_phases (
  id,
  project_id,
  phase_number,
  name,
  description,
  start_date,
  end_date,
  max_attempts,
  file_types_allowed,
  rubric_type,
  evaluation_form_type
) VALUES (
  'a1a2a3a4-b1b2-c1c2-d1d2-e1e2e3e4e5e6'::UUID,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  1,
  'ccc',
  'ccc',
  '2025-10-26 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-10-28 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  3,
  ARRAY[]::TEXT[], -- No file type restriction
  'builtin',
  'builtin'
);

-- Insert Phase 1 Rubric
INSERT INTO phase_rubrics (
  id,
  phase_id,
  instructions,
  total_points
) VALUES (
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'a1a2a3a4-b1b2-c1c2-d1d2-e1e2e3e4e5e6'::UUID,
  'This phase will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
  100
);

-- Insert Phase 1 Rubric Criteria
INSERT INTO phase_rubric_criteria (
  rubric_id,
  name,
  description,
  max_points,
  criterion_order
) VALUES 
(
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'Quality of Work',
  'Overall quality and completeness',
  25,
  1
),
(
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'Technical Implementation',
  'Technical skills and implementation',
  25,
  2
),
(
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'Documentation',
  'Documentation quality and completeness',
  20,
  3
),
(
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'Presentation',
  'Presentation and communication',
  15,
  4
),
(
  'b2b3b4b5-c2c3-d2d3-e2e3-f2f3f4f5f6f7'::UUID,
  'Teamwork',
  'Collaboration and teamwork',
  15,
  5
);

-- Insert Phase 1 Evaluation Form
INSERT INTO phase_evaluation_forms (
  id,
  phase_id,
  available_from,
  due_date,
  instructions,
  total_points
) VALUES (
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'a1a2a3a4-b1b2-c1c2-d1d2-e1e2e3e4e5e6'::UUID,
  '2025-10-28 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-10-28 23:59:59+00'::TIMESTAMP WITH TIME ZONE,
  'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
  100
);

-- Insert Phase 1 Evaluation Criteria
INSERT INTO phase_evaluation_criteria (
  evaluation_form_id,
  name,
  description,
  max_points,
  criterion_order
) VALUES 
(
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'Contribution',
  'Contributes meaningfully to group discussions and project development',
  20,
  1
),
(
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'Compliance',
  'Completes group assignments and tasks on time',
  15,
  2
),
(
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'Quality Work',
  'Prepares work in a quality manner with attention to detail',
  25,
  3
),
(
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'Cooperation',
  'Demonstrates a cooperative and supportive attitude',
  15,
  4
),
(
  'c3c4c5c6-d3d4-e3e4-f3f4-a4a5a6a7a8a9'::UUID,
  'Overall Performance',
  'Overall performance and leadership in the project',
  25,
  5
);

-- Insert Phase 1 Breathe Period
INSERT INTO phase_breathe_periods (
  id,
  phase_id,
  project_id,
  start_date,
  end_date,
  duration_days,
  is_final_breathe
) VALUES (
  'd4d5d6d7-e4e5-f4f5-a5a6-b6b7b8b9c0c1'::UUID,
  'a1a2a3a4-b1b2-c1c2-d1d2-e1e2e3e4e5e6'::UUID,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  '2025-10-29 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-10-29 23:59:59+00'::TIMESTAMP WITH TIME ZONE,
  1,
  FALSE
);

-- ============================================================================
-- INSERT PHASE 2
-- ============================================================================
INSERT INTO project_phases (
  id,
  project_id,
  phase_number,
  name,
  description,
  start_date,
  end_date,
  max_attempts,
  file_types_allowed,
  rubric_type,
  evaluation_form_type
) VALUES (
  'e5e6e7e8-f5f6-a6a7-b7b8-c8c9d0d1d2d3'::UUID,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  2,
  'xx',
  'xx',
  '2025-10-30 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-10-31 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  3,
  ARRAY[]::TEXT[],
  'builtin',
  'builtin'
);

-- Insert Phase 2 Rubric
INSERT INTO phase_rubrics (
  id,
  phase_id,
  instructions,
  total_points
) VALUES (
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'e5e6e7e8-f5f6-a6a7-b7b8-c8c9d0d1d2d3'::UUID,
  'This phase will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
  100
);

-- Insert Phase 2 Rubric Criteria (same as Phase 1)
INSERT INTO phase_rubric_criteria (
  rubric_id,
  name,
  description,
  max_points,
  criterion_order
) VALUES 
(
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'Quality of Work',
  'Overall quality and completeness',
  25,
  1
),
(
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'Technical Implementation',
  'Technical skills and implementation',
  25,
  2
),
(
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'Documentation',
  'Documentation quality and completeness',
  20,
  3
),
(
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'Presentation',
  'Presentation and communication',
  15,
  4
),
(
  'f6f7f8f9-a7a8-b8b9-c9d0-e0e1e2e3e4e5'::UUID,
  'Teamwork',
  'Collaboration and teamwork',
  15,
  5
);

-- Insert Phase 2 Evaluation Form
INSERT INTO phase_evaluation_forms (
  id,
  phase_id,
  available_from,
  due_date,
  instructions,
  total_points
) VALUES (
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'e5e6e7e8-f5f6-a6a7-b7b8-c8c9d0d1d2d3'::UUID,
  '2025-10-31 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-10-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE,
  'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
  100
);

-- Insert Phase 2 Evaluation Criteria (same as Phase 1)
INSERT INTO phase_evaluation_criteria (
  evaluation_form_id,
  name,
  description,
  max_points,
  criterion_order
) VALUES 
(
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'Contribution',
  'Contributes meaningfully to group discussions and project development',
  20,
  1
),
(
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'Compliance',
  'Completes group assignments and tasks on time',
  15,
  2
),
(
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'Quality Work',
  'Prepares work in a quality manner with attention to detail',
  25,
  3
),
(
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'Cooperation',
  'Demonstrates a cooperative and supportive attitude',
  15,
  4
),
(
  'a8a9b0b1-b9ba-cbcc-dde0-f0f1f2f3f4f5'::UUID,
  'Overall Performance',
  'Overall performance and leadership in the project',
  25,
  5
);

-- Insert Phase 2 Breathe Period (FINAL PHASE - extends to day before project due)
INSERT INTO phase_breathe_periods (
  id,
  phase_id,
  project_id,
  start_date,
  end_date,
  duration_days,
  is_final_breathe
) VALUES (
  'b9c0c1c2-d0d1-e1e2-f2f3-a3a4a5a6a7a8'::UUID,
  'e5e6e7e8-f5f6-a6a7-b7b8-c8c9d0d1d2d3'::UUID,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  '2025-11-01 12:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2025-11-03 23:59:59+00'::TIMESTAMP WITH TIME ZONE,
  3,
  TRUE
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View Project Overview
SELECT 
  p.title,
  p.start_date,
  p.due_date,
  p.evaluation_phase_days,
  p.breathe_phase_days,
  COUNT(pp.id) as phase_count
FROM projects p
LEFT JOIN project_phases pp ON p.id = pp.project_id
WHERE p.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
GROUP BY p.id;

-- View all phases with their timings
SELECT 
  pp.phase_number,
  pp.name,
  pp.start_date,
  pp.end_date,
  pef.available_from as eval_starts,
  pef.due_date as eval_ends,
  pbp.start_date as breathe_starts,
  pbp.end_date as breathe_ends
FROM project_phases pp
LEFT JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
LEFT JOIN phase_breathe_periods pbp ON pp.id = pbp.phase_id
WHERE pp.project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
ORDER BY pp.phase_number;

-- View complete rubric criteria
SELECT 
  pp.phase_number,
  prc.name,
  prc.description,
  prc.max_points
FROM phase_rubric_criteria prc
JOIN phase_rubrics pr ON prc.rubric_id = pr.id
JOIN project_phases pp ON pr.phase_id = pp.id
WHERE pp.project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
ORDER BY pp.phase_number, prc.criterion_order;

-- View complete evaluation criteria
SELECT 
  pp.phase_number,
  pec.name,
  pec.description,
  pec.max_points
FROM phase_evaluation_criteria pec
JOIN phase_evaluation_forms pef ON pec.evaluation_form_id = pef.id
JOIN project_phases pp ON pef.phase_id = pp.id
WHERE pp.project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
ORDER BY pp.phase_number, pec.criterion_order;
