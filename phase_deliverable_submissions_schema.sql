-- ============================================================================
-- PHASE DELIVERABLE SUBMISSIONS TABLE
-- ============================================================================
-- This table stores complete phase deliverable submissions including:
-- - Uploaded files
-- - Task assignments and their statuses (all states: pending, completed, revision, etc.)
-- - Evaluation submissions by members
-- - Member inclusion/exclusion recommendations
-- - Phase information snapshot
-- ============================================================================

CREATE TABLE IF NOT EXISTS phase_deliverable_submissions (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
  
  -- Submission metadata
  submitted_by UUID NOT NULL REFERENCES studentaccounts(id), -- The leader who submitted
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Uploaded files for this phase deliverable
  files JSONB DEFAULT '[]'::jsonb, -- Array of file objects: [{path, name, size, type}]
  submission_text TEXT, -- Optional description/notes from leader
  
  -- PHASE SNAPSHOT - Preserve phase details at time of submission
  phase_snapshot JSONB NOT NULL, -- Complete phase data
  /*
    {
      "phase_number": 1,
      "title": "FIRST ONES",
      "description": "FIRST ONES...",
      "start_date": "2025-10-27T16:20:00",
      "end_date": "2025-10-27T17:00:00",
      "evaluation_available_from": "2025-10-27T17:00:00",
      "evaluation_due_date": "2025-10-27T23:59:59.999",
      "min_tasks_per_member": 3,
      "max_tasks_per_member": 5,
      "max_attempts": 3,
      "file_types_allowed": ["pdf", "doc", "docx"],
      "rubric_file_url": "...",
      "evaluation_form_type": "builtin"
    }
  */
  
  -- MEMBER TASKS SNAPSHOT - All tasks for all members in this phase
  member_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
    [
      {
        "member_id": "uuid",
        "member_name": "Marshalle Nopi Soriano",
        "role": "leader",
        "tasks": [
          {
            "task_id": "uuid",
            "title": "sssssssss",
            "description": "...",
            "status": "completed", // pending, completed, to_revise, rejected, etc.
            "due_date": "2025-10-27T16:55:00",
            "available_until": "2025-10-27T17:00:00",
            "max_attempts": 5,
            "current_attempts": 2,
            "assigned_by": "uuid",
            "assigned_at": "2025-10-27T08:35:19",
            "completed_at": "2025-10-27T09:00:00",
            "file_types_allowed": ["pdf", "docx", "rtf", "md"],
            "submission_files": [
              {
                "submission_id": "uuid",
                "attempt_number": 1,
                "files": ["path1.pdf", "path2.docx"],
                "submitted_at": "2025-10-27T08:36:00",
                "status": "approved",
                "feedback": "Good work"
              }
            ]
          }
        ],
        "task_count": 1,
        "min_required": 3,
        "max_allowed": 5
      }
    ]
  */
  
  -- EVALUATION SUBMISSIONS SNAPSHOT - Phase evaluations by members
  -- Captures BOTH built-in (criteria-based) and custom file evaluations
  evaluation_submissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
    [
      {
        "member_id": "uuid",
        "member_name": "Marshalle Nopi Soriano",
        "role": "leader",
        
        // Evaluations this member RECEIVED from others
        "evaluations_received": [
          {
            "evaluation_submission_id": "68da0409-57c7-44eb-991b-2946441d5d8e",
            "evaluator_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
            "evaluator_name": "Ivy Bumagat",
            "evaluator_role": "member",
            "submission_date": "2025-10-27T06:57:56.156+00",
            "status": "submitted",
            
            // TYPE 1: Built-in evaluation (criteria-based scoring)
            "is_custom_evaluation": false,
            "evaluation_form": {
              "form_id": "85542132-feca-469c-897b-306999e26d9c",
              "instructions": "Rate your groupmates according to the following criteria...",
              "total_points": 100,
              "criteria": [
                {
                  "id": "6a240d1d-e116-4d72-a8da-895f5fce9a29",
                  "name": "Contribution",
                  "description": "Contributes meaningfully to group discussions and project development",
                  "max_points": 20,
                  "score_received": 18
                },
                {
                  "id": "b1eb9ee6-106f-4b59-89b8-21cc78fb96f9",
                  "name": "Compliance",
                  "description": "Completes group assignments and tasks on time",
                  "max_points": 15,
                  "score_received": 14
                },
                {
                  "id": "8977cdb5-9d27-400e-9b73-14db724ae909",
                  "name": "Quality Work",
                  "description": "Prepares work in a quality manner with attention to detail",
                  "max_points": 25,
                  "score_received": 23
                },
                {
                  "id": "c7bea433-34d3-466a-9b28-28d277280e18",
                  "name": "Cooperation",
                  "description": "Demonstrates a cooperative and supportive attitude",
                  "max_points": 15,
                  "score_received": 15
                },
                {
                  "id": "78f96740-b457-456d-958c-0b3106ba2d98",
                  "name": "Overall Performance",
                  "description": "Overall performance and leadership in the project",
                  "max_points": 25,
                  "score_received": 24
                }
              ]
            },
            "total_score": 94,
            "percentage": 94.0,
            "comments": null
          },
          {
            "evaluation_submission_id": "another-uuid",
            "evaluator_id": "another-member-uuid",
            "evaluator_name": "John Doe",
            "evaluator_role": "member",
            "submission_date": "2025-10-27T07:15:00.000+00",
            "status": "submitted",
            
            // TYPE 2: Custom file evaluation
            "is_custom_evaluation": true,
            "evaluation_form": {
              "form_id": "7e95d831-fd8a-4154-b7bb-0d84faa6a112",
              "instructions": "Download and complete the custom evaluation form",
              "total_points": 100,
              "custom_file_url": "https://.../phase_evaluation_template.pdf",
              "custom_file_name": "phase_1_evaluation_template.pdf"
            },
            "file_submission_url": "https://.../STUDENT_PHASE_CUSTOM_UPLOAD.pdf",
            "file_name": "STUDENT PHASE CUSTOM UPLOAD.pdf",
            "comments": null
          }
        ],
        
        // Statistics for this member
        "evaluation_count": 2,
        "average_score": 94.0, // Only for built-in evals with numeric scores
        "total_possible_score": 100,
        
        // Did this member submit evaluations for OTHERS?
        "has_submitted_own_evaluations": true,
        "own_evaluation_submission_date": "2025-10-27T06:55:00.000+00",
        "members_evaluated_count": 1 // How many other members they evaluated
      },
      {
        "member_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
        "member_name": "Ivy Bumagat",
        "role": "member",
        "evaluations_received": [],
        "evaluation_count": 0,
        "average_score": null,
        "total_possible_score": 100,
        "has_submitted_own_evaluations": false,
        "own_evaluation_submission_date": null,
        "members_evaluated_count": 0
      }
    ]
  */
  
  -- MEMBER INCLUSION RECOMMENDATIONS
  member_inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
    [
      {
        "member_id": "uuid",
        "member_name": "Marshalle Nopi Soriano",
        "role": "leader",
        "included": true, // true = include, false = exclude
        "exclusion_reason": null // Required if included = false, min 50 chars
      },
      {
        "member_id": "uuid",
        "member_name": "Ivy Bumagat",
        "role": "member",
        "included": false,
        "exclusion_reason": "Did not complete minimum tasks and showed no participation..."
      }
    ]
  */
  
  -- VALIDATION RESULTS - What was checked at submission time
  validation_results JSONB DEFAULT '{}'::jsonb,
  /*
    {
      "files_uploaded": true,
      "min_tasks_met": false,
      "members_below_minimum": [
        {
          "member_name": "Marshalle Nopi Soriano",
          "assigned": 1,
          "required": 3
        },
        {
          "member_name": "Ivy Bumagat", 
          "assigned": 0,
          "required": 3
        }
      ],
      "evaluation_warnings": [
        {
          "member_name": "Ivy Bumagat",
          "message": "Has not submitted phase evaluations"
        }
      ]
    }
  */
  
  -- GRADING (populated by instructor later)
  grade DECIMAL(5, 2), -- e.g., 85.50
  max_grade DECIMAL(5, 2) DEFAULT 100.00,
  graded_by UUID REFERENCES professoraccounts(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  instructor_feedback TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'submitted', 
  -- 'submitted', 'under_review', 'graded', 'returned', 'resubmitted'
  
  -- Resubmission tracking
  is_resubmission BOOLEAN DEFAULT FALSE,
  original_submission_id UUID REFERENCES phase_deliverable_submissions(id),
  resubmission_number INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================

CREATE INDEX idx_phase_deliverable_submissions_project 
  ON phase_deliverable_submissions(project_id);

CREATE INDEX idx_phase_deliverable_submissions_phase 
  ON phase_deliverable_submissions(phase_id);

CREATE INDEX idx_phase_deliverable_submissions_group 
  ON phase_deliverable_submissions(group_id);

CREATE INDEX idx_phase_deliverable_submissions_submitter 
  ON phase_deliverable_submissions(submitted_by);

CREATE INDEX idx_phase_deliverable_submissions_status 
  ON phase_deliverable_submissions(status);

CREATE INDEX idx_phase_deliverable_submissions_graded 
  ON phase_deliverable_submissions(graded_by, graded_at);

-- Composite index for common queries
CREATE INDEX idx_phase_deliverable_submissions_project_phase_group 
  ON phase_deliverable_submissions(project_id, phase_id, group_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE phase_deliverable_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own group's submissions
CREATE POLICY phase_deliverable_submissions_student_select 
  ON phase_deliverable_submissions
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
CREATE POLICY phase_deliverable_submissions_leader_insert 
  ON phase_deliverable_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM course_group_members 
      WHERE student_id = auth.uid() 
        AND group_id = phase_deliverable_submissions.group_id
        AND role = 'leader'
    )
  );

-- Leaders can update their own ungraded submissions
CREATE POLICY phase_deliverable_submissions_leader_update 
  ON phase_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid()
    AND status = 'submitted'
    AND graded_at IS NULL
  );

-- Instructors can view all submissions for their courses
CREATE POLICY phase_deliverable_submissions_instructor_select 
  ON phase_deliverable_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = phase_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- Instructors can update (grade) submissions
CREATE POLICY phase_deliverable_submissions_instructor_update 
  ON phase_deliverable_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = phase_deliverable_submissions.project_id
        AND c.professor_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_phase_deliverable_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_deliverable_submissions_updated_at
  BEFORE UPDATE ON phase_deliverable_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_deliverable_submissions_updated_at();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE phase_deliverable_submissions IS 
  'Stores complete phase deliverable submissions including files, tasks, evaluations, and member inclusion decisions';

COMMENT ON COLUMN phase_deliverable_submissions.phase_snapshot IS 
  'Frozen snapshot of phase configuration at submission time';

COMMENT ON COLUMN phase_deliverable_submissions.member_tasks IS 
  'Complete snapshot of all member tasks and their statuses at submission time';

COMMENT ON COLUMN phase_deliverable_submissions.evaluation_submissions IS 
  'Snapshot of all phase evaluation submissions at submission time';

COMMENT ON COLUMN phase_deliverable_submissions.member_inclusions IS 
  'Leader recommendations for member inclusion/exclusion in grading';

COMMENT ON COLUMN phase_deliverable_submissions.validation_results IS 
  'Results of validation checks performed at submission time';

