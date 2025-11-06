-- ============================================
-- FINAL CLEAN SQL for S-MAN Grading Tables
-- No COMMENT ON CONSTRAINT statements (not supported in PostgreSQL)
-- ============================================

-- GROUP GRADES TABLE
CREATE TABLE IF NOT EXISTS group_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
    project_submission_id UUID REFERENCES project_submissions(id) ON DELETE CASCADE,
    phase_submission_id UUID REFERENCES phase_submissions(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('project', 'phase', 'project_submission', 'phase_submission')),
    grading_criteria JSONB,
    graded_by UUID NOT NULL REFERENCES professoraccounts(id),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one reference type is specified
    CONSTRAINT group_grades_reference_check CHECK (
        (project_id IS NOT NULL AND phase_id IS NULL AND project_submission_id IS NULL AND phase_submission_id IS NULL) OR
        (project_id IS NULL AND phase_id IS NOT NULL AND project_submission_id IS NULL AND phase_submission_id IS NULL) OR
        (project_id IS NULL AND phase_id IS NULL AND project_submission_id IS NOT NULL AND phase_submission_id IS NULL) OR
        (project_id IS NULL AND phase_id IS NULL AND project_submission_id IS NULL AND phase_submission_id IS NOT NULL)
    ),
    
    -- Unique constraints for each grade type
    CONSTRAINT group_grades_unique_project UNIQUE (group_id, project_id),
    CONSTRAINT group_grades_unique_phase UNIQUE (group_id, phase_id),
    CONSTRAINT group_grades_unique_project_submission UNIQUE (group_id, project_submission_id),
    CONSTRAINT group_grades_unique_phase_submission UNIQUE (group_id, phase_submission_id)
);

-- INDIVIDUAL GRADES TABLE
CREATE TABLE IF NOT EXISTS individual_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_grade_id UUID REFERENCES group_grades(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
    project_submission_id UUID REFERENCES project_submissions(id) ON DELETE CASCADE,
    phase_submission_id UUID REFERENCES phase_submissions(id) ON DELETE CASCADE,
    task_submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    is_override BOOLEAN NOT NULL DEFAULT false,
    grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('project', 'phase', 'project_submission', 'phase_submission', 'task')),
    grading_criteria JSONB,
    graded_by UUID NOT NULL REFERENCES professoraccounts(id),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure at least one reference is specified
    CONSTRAINT individual_grades_reference_check CHECK (
        (project_id IS NOT NULL) OR (phase_id IS NOT NULL) OR 
        (project_submission_id IS NOT NULL) OR (phase_submission_id IS NOT NULL) OR 
        (task_submission_id IS NOT NULL)
    ),
    
    -- Unique constraints for each grade type (preventing duplicate grades)
    CONSTRAINT individual_grades_unique_project UNIQUE (student_id, project_id),
    CONSTRAINT individual_grades_unique_phase UNIQUE (student_id, phase_id),
    CONSTRAINT individual_grades_unique_project_submission UNIQUE (student_id, project_submission_id),
    CONSTRAINT individual_grades_unique_phase_submission UNIQUE (student_id, phase_submission_id),
    CONSTRAINT individual_grades_unique_task_submission UNIQUE (student_id, task_submission_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_group_grades_project ON group_grades(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_grades_phase ON group_grades(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_grades_project_submission ON group_grades(project_submission_id) WHERE project_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_grades_phase_submission ON group_grades(phase_submission_id) WHERE phase_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_grades_group ON group_grades(group_id);
CREATE INDEX IF NOT EXISTS idx_group_grades_graded_by ON group_grades(graded_by);

CREATE INDEX IF NOT EXISTS idx_individual_grades_group_grade ON individual_grades(group_grade_id) WHERE group_grade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_project ON individual_grades(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_phase ON individual_grades(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_project_submission ON individual_grades(project_submission_id) WHERE project_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_phase_submission ON individual_grades(phase_submission_id) WHERE phase_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_task_submission ON individual_grades(task_submission_id) WHERE task_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_grades_student ON individual_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_individual_grades_group ON individual_grades(group_id);
CREATE INDEX IF NOT EXISTS idx_individual_grades_graded_by ON individual_grades(graded_by);

-- TABLE COMMENTS (only table and column comments work in PostgreSQL)
COMMENT ON TABLE group_grades IS 'Group-level grades for projects, phases, and submissions';
COMMENT ON TABLE individual_grades IS 'Individual student grades that can override group grades or stand alone for tasks';
COMMENT ON COLUMN group_grades.grade_type IS 'Type of grade: project, phase, project_submission, or phase_submission';
COMMENT ON COLUMN individual_grades.grade_type IS 'Type of grade: project, phase, project_submission, phase_submission, or task';
COMMENT ON COLUMN individual_grades.is_override IS 'True if this grade overrides a group grade, false if standalone';