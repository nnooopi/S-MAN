    -- Create evaluation_submissions table with correct UUID foreign key references
    CREATE TABLE evaluation_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE, -- Optional, for phase-specific evaluations
    group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES studentaccounts(id) ON DELETE CASCADE, -- The student who submitted the evaluation
    evaluated_student_id UUID REFERENCES studentaccounts(id) ON DELETE CASCADE, -- The student being evaluated (for peer evals)
    evaluation_form_id UUID REFERENCES project_evaluation_forms(id) ON DELETE CASCADE, -- Or phase_evaluation_forms if needed
    submission_date TIMESTAMPTZ DEFAULT NOW(),
    evaluation_data JSONB, -- Stores the actual evaluation criteria and scores
    comments TEXT,
    grade DECIMAL(5, 2), -- Overall grade from this evaluation
    status TEXT DEFAULT 'pending_review', -- e.g., 'pending_review', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add indexes for better performance
    CREATE INDEX idx_evaluation_submissions_project_id ON evaluation_submissions(project_id);
    CREATE INDEX idx_evaluation_submissions_phase_id ON evaluation_submissions(phase_id);
    CREATE INDEX idx_evaluation_submissions_group_id ON evaluation_submissions(group_id);
    CREATE INDEX idx_evaluation_submissions_evaluator_id ON evaluation_submissions(evaluator_id);
    CREATE INDEX idx_evaluation_submissions_evaluated_student_id ON evaluation_submissions(evaluated_student_id);
    CREATE INDEX idx_evaluation_submissions_status ON evaluation_submissions(status);

    -- Add RLS (Row Level Security) policies if needed
    ALTER TABLE evaluation_submissions ENABLE ROW LEVEL SECURITY;

    -- Example policy: Students can only see evaluations they submitted or that evaluate them
    CREATE POLICY "Students can access their own evaluations" ON evaluation_submissions
        FOR ALL USING (
            auth.uid()::text IN (
                SELECT id::text FROM studentaccounts WHERE id = evaluator_id OR id = evaluated_student_id
            )
        );

    -- Example policy: Professors can see all evaluations for their projects
    CREATE POLICY "Professors can access project evaluations" ON evaluation_submissions
        FOR ALL USING (
            auth.uid()::text IN (
                SELECT professor_id::text FROM courses 
                JOIN projects ON courses.id = projects.course_id 
                WHERE projects.id = project_id
            )
        );
