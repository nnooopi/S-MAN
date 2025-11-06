-- ============================================
-- RUBRIC AND EVALUATION FORM TABLES
-- Tables to store built-in rubrics and evaluation forms with criteria
-- ============================================

-- PROJECT RUBRICS TABLE
-- Stores built-in rubrics for projects
CREATE TABLE IF NOT EXISTS project_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL DEFAULT 'Use this rubric to evaluate student work. Consider each criterion carefully and assign points based on the quality demonstrated.',
    total_points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one rubric per project
    CONSTRAINT project_rubrics_unique_project UNIQUE (project_id)
);

-- PROJECT RUBRIC CRITERIA TABLE
-- Stores individual criteria for project rubrics
CREATE TABLE IF NOT EXISTS project_rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_rubric_id UUID NOT NULL REFERENCES project_rubrics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points INTEGER NOT NULL CHECK (max_points > 0),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROJECT EVALUATION FORMS TABLE
-- Stores built-in evaluation forms for projects
CREATE TABLE IF NOT EXISTS project_evaluation_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL DEFAULT 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
    total_points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one evaluation form per project
    CONSTRAINT project_evaluation_forms_unique_project UNIQUE (project_id)
);

-- PROJECT EVALUATION CRITERIA TABLE
-- Stores individual criteria for project evaluation forms
CREATE TABLE IF NOT EXISTS project_evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_evaluation_form_id UUID NOT NULL REFERENCES project_evaluation_forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points INTEGER NOT NULL CHECK (max_points > 0),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PHASE RUBRICS TABLE
-- Stores built-in rubrics for project phases
CREATE TABLE IF NOT EXISTS phase_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL DEFAULT 'Use this rubric to evaluate student work for this phase. Consider each criterion carefully and assign points based on the quality demonstrated.',
    total_points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one rubric per phase
    CONSTRAINT phase_rubrics_unique_phase UNIQUE (phase_id)
);

-- PHASE RUBRIC CRITERIA TABLE
-- Stores individual criteria for phase rubrics
CREATE TABLE IF NOT EXISTS phase_rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_rubric_id UUID NOT NULL REFERENCES phase_rubrics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points INTEGER NOT NULL CHECK (max_points > 0),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PHASE EVALUATION FORMS TABLE
-- Stores built-in evaluation forms for project phases
CREATE TABLE IF NOT EXISTS phase_evaluation_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL DEFAULT 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
    total_points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one evaluation form per phase
    CONSTRAINT phase_evaluation_forms_unique_phase UNIQUE (phase_id)
);

-- PHASE EVALUATION CRITERIA TABLE
-- Stores individual criteria for phase evaluation forms
CREATE TABLE IF NOT EXISTS phase_evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_evaluation_form_id UUID NOT NULL REFERENCES phase_evaluation_forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points INTEGER NOT NULL CHECK (max_points > 0),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Project rubrics indexes
CREATE INDEX IF NOT EXISTS idx_project_rubrics_project_id ON project_rubrics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rubric_criteria_rubric_id ON project_rubric_criteria(project_rubric_id);
CREATE INDEX IF NOT EXISTS idx_project_rubric_criteria_order ON project_rubric_criteria(project_rubric_id, order_index);

-- Project evaluation forms indexes
CREATE INDEX IF NOT EXISTS idx_project_evaluation_forms_project_id ON project_evaluation_forms(project_id);
CREATE INDEX IF NOT EXISTS idx_project_evaluation_criteria_form_id ON project_evaluation_criteria(project_evaluation_form_id);
CREATE INDEX IF NOT EXISTS idx_project_evaluation_criteria_order ON project_evaluation_criteria(project_evaluation_form_id, order_index);

-- Phase rubrics indexes
CREATE INDEX IF NOT EXISTS idx_phase_rubrics_phase_id ON phase_rubrics(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_rubric_criteria_rubric_id ON phase_rubric_criteria(phase_rubric_id);
CREATE INDEX IF NOT EXISTS idx_phase_rubric_criteria_order ON phase_rubric_criteria(phase_rubric_id, order_index);

-- Phase evaluation forms indexes
CREATE INDEX IF NOT EXISTS idx_phase_evaluation_forms_phase_id ON phase_evaluation_forms(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_evaluation_criteria_form_id ON phase_evaluation_criteria(phase_evaluation_form_id);
CREATE INDEX IF NOT EXISTS idx_phase_evaluation_criteria_order ON phase_evaluation_criteria(phase_evaluation_form_id, order_index);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all tables
CREATE TRIGGER update_project_rubrics_updated_at BEFORE UPDATE ON project_rubrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_rubric_criteria_updated_at BEFORE UPDATE ON project_rubric_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_evaluation_forms_updated_at BEFORE UPDATE ON project_evaluation_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_evaluation_criteria_updated_at BEFORE UPDATE ON project_evaluation_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_rubrics_updated_at BEFORE UPDATE ON phase_rubrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_rubric_criteria_updated_at BEFORE UPDATE ON phase_rubric_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_evaluation_forms_updated_at BEFORE UPDATE ON phase_evaluation_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_evaluation_criteria_updated_at BEFORE UPDATE ON phase_evaluation_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
