-- =============================================
-- PROJECT DELIVERABLE SUBMISSIONS TABLE
-- Comprehensive snapshot of entire project submission
-- Including all phases, tasks, and evaluations
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING TABLE (if needed for clean slate)
-- ============================================================================
-- DROP TABLE IF EXISTS project_deliverable_submissions CASCADE;

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_deliverable_submissions (
    -- ========================================================================
    -- PRIMARY IDENTIFIERS
    -- ========================================================================
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    
    -- ========================================================================
    -- SUBMISSION METADATA
    -- ========================================================================
    submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC') + INTERVAL '8 hours'),
    
    -- Uploaded files for the project deliverable
    files JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"name": "file.pdf", "url": "https://...", "size": 1024, "type": "application/pdf", "path": "..."}]
    
    submission_text TEXT,
    
    -- ========================================================================
    -- PROJECT SNAPSHOT
    -- Complete snapshot of project details at submission time
    -- ========================================================================
    project_snapshot JSONB NOT NULL,
    -- Format: {
    --   "id": "uuid",
    --   "title": "Project Title",
    --   "description": "...",
    --   "start_date": "...",
    --   "due_date": "...",
    --   "course_id": "uuid",
    --   "min_tasks_per_member": 3,
    --   "max_tasks_per_member": 10,
    --   "breathe_phase_days": 2,
    --   "evaluation_phase_days": 2,
    --   "project_evaluation_deadline": "...",
    --   "project_evaluation_type": "builtin",
    --   "project_rubric_type": "builtin",
    --   "total_phases": 3,
    --   "phases": [
    --     {
    --       "id": "uuid",
    --       "phase_number": 1,
    --       "title": "Phase 1",
    --       "start_date": "...",
    --       "end_date": "...",
    --       "evaluation_form_type": "builtin",
    --       "max_attempts": 3
    --     }
    --   ]
    -- }
    
    -- ========================================================================
    -- MEMBER TASKS SNAPSHOT (ALL PHASES)
    -- Complete record of ALL tasks assigned to ALL members across ALL phases
    -- ========================================================================
    member_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [
    --   {
    --     "member_id": "uuid",
    --     "member_name": "Student Name",
    --     "role": "leader|member",
    --     "total_tasks": 10,
    --     "min_required": 3,
    --     "max_allowed": 10,
    --     "phases": [
    --       {
    --         "phase_id": "uuid",
    --         "phase_number": 1,
    --         "phase_title": "Phase 1",
    --         "task_count": 3,
    --         "tasks": [
    --           {
    --             "task_id": "uuid",
    --             "title": "Task Title",
    --             "description": "...",
    --             "status": "completed|pending|in_progress|to_revise",
    --             "assigned_at": "timestamp",
    --             "assigned_by": "uuid",
    --             "due_date": "timestamp",
    --             "available_until": "timestamp",
    --             "max_attempts": 3,
    --             "current_attempts": 2,
    --             "file_types_allowed": ["pdf", "docx"],
    --             "submission_files": [
    --               {
    --                 "submission_id": "uuid",
    --                 "attempt_number": 1,
    --                 "is_revision": false,
    --                 "status": "approved|pending|revision_requested|rejected",
    --                 "files": ["path/to/file1.pdf", "path/to/file2.pdf"],
    --                 "submission_text": "...",
    --                 "submitted_at": "timestamp",
    --                 "reviewed_by": "uuid",
    --                 "reviewed_at": "timestamp",
    --                 "feedback": "..."
    --               }
    --             ]
    --           }
    --         ]
    --       }
    --     ]
    --   }
    -- ]
    
    -- ========================================================================
    -- EVALUATION SUBMISSIONS (ALL PHASES + PROJECT)
    -- Complete record of ALL evaluations (phase + project)
    -- ========================================================================
    evaluation_submissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [
    --   {
    --     "member_id": "uuid",
    --     "member_name": "Student Name",
    --     "role": "leader|member",
    --     
    --     // Phase Evaluations Summary
    --     "phase_evaluations": {
    --       "total_phases": 3,
    --       "submitted_count": 2,
    --       "missing_count": 1,
    --       "phases": [
    --         {
    --           "phase_id": "uuid",
    --           "phase_number": 1,
    --           "phase_title": "Phase 1",
    --           "has_submitted": true,
    --           "submission_date": "timestamp",
    --           "evaluations_received": [
    --             {
    --               "evaluation_submission_id": "uuid",
    --               "evaluator_id": "uuid",
    --               "evaluator_name": "...",
    --               "evaluator_role": "member",
    --               "is_custom_evaluation": false,
    --               "status": "submitted",
    --               "submission_date": "timestamp",
    --               "total_score": 85,
    --               "percentage": "85.0",
    --               "evaluation_form": {
    --                 "form_id": "uuid",
    --                 "total_points": 100,
    --                 "instructions": "...",
    --                 "criteria": [
    --                   {
    --                     "id": "uuid",
    --                     "name": "Contribution",
    --                     "max_points": 20,
    --                     "description": "...",
    --                     "score_received": 18
    --                   }
    --                 ]
    --               },
    --               "file_submission_url": null,
    --               "file_name": null,
    --               "comments": "..."
    --             }
    --           ],
    --           "average_score": "85.5",
    --           "evaluation_count": 3,
    --           "total_possible_score": 100
    --         }
    --       ],
    --       "overall_average": "82.3",
    --       "total_evaluations_received": 9
    --     },
    --     
    --     // Project Evaluation (End of project evaluation)
    --     "project_evaluation": {
    --       "has_submitted": true,
    --       "submission_date": "timestamp",
    --       "evaluations_received": [
    --         {
    --           "evaluation_submission_id": "uuid",
    --           "evaluator_id": "uuid",
    --           "evaluator_name": "...",
    --           "evaluator_role": "member",
    --           "evaluated_member_id": "uuid",
    --           "is_custom_evaluation": false,
    --           "status": "submitted",
    --           "submission_date": "timestamp",
    --           "total_score": 90,
    --           "evaluation_form": {
    --             "form_id": "uuid",
    --             "total_points": 100,
    --             "instructions": "...",
    --             "criteria": [
    --               {
    --                 "id": "uuid",
    --                 "name": "Overall Contribution",
    --                 "max_points": 25,
    --                 "description": "...",
    --                 "score_received": 22
    --               }
    --             ]
    --           },
    --           "file_submission_url": null,
    --           "file_name": null,
    --           "comments": "..."
    --         }
    --       ],
    --       "average_score": "88.7",
    --       "evaluation_count": 4,
    --       "total_possible_score": 100
    --     },
    --     
    --     "members_evaluated_count": 4,
    --     "overall_average_all_evaluations": "84.5"
    --   }
    -- ]
    
    -- ========================================================================
    -- MEMBER INCLUSIONS
    -- Leader's decision on which members to include/exclude from project
    -- ========================================================================
    member_inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [
    --   {
    --     "member_id": "uuid",
    --     "member_name": "Student Name",
    --     "role": "leader|member",
    --     "included": true|false,
    --     "exclusion_reason": "Reason for exclusion (if excluded)" or null
    --   }
    -- ]
    
    -- ========================================================================
    -- VALIDATION RESULTS
    -- Record of frontend validation checks when submitting
    -- ========================================================================
    validation_results JSONB DEFAULT '{}'::jsonb,
    
    -- ========================================================================
    -- PHASE DELIVERABLE SUBMISSIONS
    -- All phase deliverable submissions (files leader submitted for each phase)
    -- ========================================================================
    phase_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [
    --   {
    --     "phase_id": "uuid",
    --     "submission_id": "uuid",
    --     "submitted_at": "timestamp",
    --     "submitted_by": "uuid",
    --     "files": [{"name": "file.pdf", "url": "...", "size": 1024}],
    --     "submission_text": "...",
    --     "phase_snapshot": {...},
    --     "member_tasks": [...],
    --     "evaluation_submissions": [...],
    --     "member_inclusions": [...],
    --     "validation_results": {...},
    --     "status": "submitted",
    --     "is_resubmission": false,
    --     "resubmission_number": 0,
    --     "grade": null,
    --     "graded_by": null,
    --     "graded_at": null,
    --     "instructor_feedback": null
    --   }
    -- ]
    
    -- ========================================================================
    -- GRADING
    -- ========================================================================
    grade NUMERIC(5, 2),
    max_grade NUMERIC(5, 2) DEFAULT 100.00,
    graded_by UUID REFERENCES professoraccounts(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITHOUT TIME ZONE,
    instructor_feedback TEXT,
    
    -- ========================================================================
    -- STATUS & RESUBMISSION
    -- ========================================================================
    status VARCHAR(50) DEFAULT 'submitted',
    -- Values: submitted, graded, returned_for_revision, resubmitted
    
    is_resubmission BOOLEAN DEFAULT false,
    original_submission_id UUID REFERENCES project_deliverable_submissions(id) ON DELETE SET NULL,
    resubmission_number INTEGER DEFAULT 0,
    
    -- ========================================================================
    -- TIMESTAMPS
    -- ========================================================================
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT ((NOW() AT TIME ZONE 'UTC') + INTERVAL '8 hours'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT ((NOW() AT TIME ZONE 'UTC') + INTERVAL '8 hours')
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_project 
    ON project_deliverable_submissions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_group 
    ON project_deliverable_submissions(group_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_submitted_by 
    ON project_deliverable_submissions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_status 
    ON project_deliverable_submissions(status);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_submitted_at 
    ON project_deliverable_submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_submissions_graded_by 
    ON project_deliverable_submissions(graded_by) WHERE graded_by IS NOT NULL;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_deliverable_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_deliverable_submissions_updated_at ON project_deliverable_submissions;

CREATE TRIGGER project_deliverable_submissions_updated_at
  BEFORE UPDATE ON project_deliverable_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_deliverable_submissions_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE project_deliverable_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own group's submissions
CREATE POLICY project_deliverable_submissions_student_select 
  ON project_deliverable_submissions
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id 
      FROM course_group_members 
      WHERE student_id = auth.uid()
    )
  );

-- Only group leaders can insert submissions
CREATE POLICY project_deliverable_submissions_leader_insert 
  ON project_deliverable_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM course_group_members 
      WHERE student_id = auth.uid() 
        AND group_id = project_deliverable_submissions.group_id
        AND role = 'leader'
    )
  );

-- Leaders can update their own ungraded submissions
CREATE POLICY project_deliverable_submissions_leader_update 
  ON project_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid()
    AND status = 'submitted'
    AND graded_at IS NULL
  );

-- Instructors can view all submissions for their courses
CREATE POLICY project_deliverable_submissions_instructor_select 
  ON project_deliverable_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = project_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- Instructors can update (grade) submissions
CREATE POLICY project_deliverable_submissions_instructor_update 
  ON project_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = project_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_deliverable_submissions IS 
'Comprehensive snapshot of project deliverable submissions including all phases, tasks, and evaluations';

COMMENT ON COLUMN project_deliverable_submissions.project_snapshot IS 
'Complete snapshot of project details and all phases at submission time';

COMMENT ON COLUMN project_deliverable_submissions.member_tasks IS 
'All tasks assigned to all members across all phases with complete submission history';

COMMENT ON COLUMN project_deliverable_submissions.evaluation_submissions IS 
'All phase evaluations and project evaluations for all members with detailed scores';

COMMENT ON COLUMN project_deliverable_submissions.member_inclusions IS 
'Leader decision on member inclusion/exclusion from project credit';

COMMENT ON COLUMN project_deliverable_submissions.validation_results IS 
'Frontend validation results including phase completion and evaluation status';

COMMENT ON COLUMN project_deliverable_submissions.phase_deliverables IS 
'All phase deliverable submissions (files and data that leader submitted for each phase)';

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your setup)
-- ============================================================================

-- Grant necessary permissions to authenticated users
-- GRANT SELECT, INSERT, UPDATE ON project_deliverable_submissions TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
    'project_deliverable_submissions' as table_name,
    COUNT(*) as total_columns,
    'Table created successfully' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_deliverable_submissions';

-- Verify indexes
SELECT 
    indexname,
    indexdef,
    '✅ Index created' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'project_deliverable_submissions'
ORDER BY indexname;

-- Verify policies
SELECT 
    polname AS policy_name,
    '✅ Policy active' AS status
FROM pg_policy
WHERE polrelid = 'public.project_deliverable_submissions'::regclass
ORDER BY polname;

