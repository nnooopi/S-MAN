-- ============================================================================
-- Phase Evaluation Submissions Table (AGGREGATED MODEL)
-- ============================================================================
-- Stores ONE aggregated evaluation submission per evaluator per phase.
-- 
-- AGGREGATED DESIGN:
--   Instead of N rows per evaluator (one per evaluated member), we store
--   ONE row per evaluator containing nested scores for all evaluated members.
--   This matches the UX: evaluator opens modal, evaluates all group members,
--   and submits ONE submission containing all scores.
--
-- TWO SUBMISSION TYPES:
-- 1. BUILT-IN EVALUATIONS (is_custom_evaluation = FALSE)
--    - Peer-to-peer grid evaluations with criteria scoring
--    - One record per (evaluator, phase) for the entire group
--    - evaluation_data JSONB structure:
--      {
--        "evaluated_members": {
--          "member_uuid_1": {
--            "criteria": { "criterion_uuid_a": 20, "criterion_uuid_b": 25 },
--            "total": 45,
--            "saved_at": "2025-10-26T14:22:00Z"
--          },
--          "member_uuid_2": { ... },
--          ...
--        },
--        "progress": {
--          "member_uuid_1": "saved",
--          "member_uuid_2": "saved",
--          "member_uuid_3": "not_started"
--        },
--        "aggregate_total": 145
--      }
--    - file_submission_url: NULL
--
-- 2. CUSTOM EVALUATIONS (is_custom_evaluation = TRUE)
--    - File-based submissions (e.g., PDF form filled out)
--    - One record per evaluator per phase
--    - evaluated_members: NULL/empty (file covers all evaluations)
--    - file_submission_url: URL to uploaded evaluation file
--    - evaluation_data: NULL or minimal (custom form doesn't use criteria)
--
-- Example for BUILT-IN with 4 members (A, B, C, D):
--   - A: 1 aggregated row containing B, C, D scores
--   - B: 1 aggregated row containing A, C, D scores
--   - C: 1 aggregated row containing A, B, D scores
--   - D: 1 aggregated row containing A, B, C scores
--   Total: 4 records (vs 12 if per-pair model)
--
-- Example for CUSTOM with 4 members:
--   - A: 1 row with file_submission_url
--   - B: 1 row with file_submission_url
--   - C: 1 row with file_submission_url
--   - D: 1 row with file_submission_url
--   Total: 4 records

CREATE TABLE IF NOT EXISTS public.phase_evaluation_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
    phase_evaluation_form_id UUID NOT NULL REFERENCES public.phase_evaluation_forms(id) ON DELETE CASCADE,
    
    -- Who is evaluating (ONLY evaluator, no evaluated_member_id)
    evaluator_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    
    -- Evaluation type indicator (mirrors phase_evaluation_forms.is_custom_evaluation)
    is_custom_evaluation BOOLEAN DEFAULT FALSE,
    
    -- ===== BUILT-IN EVALUATION FIELDS =====
    -- Aggregated JSONB containing all evaluated members' scores and progress
    -- Structure: { "evaluated_members": {...}, "progress": {...}, "aggregate_total": N }
    evaluation_data JSONB,
    
    -- ===== CUSTOM EVALUATION FIELDS =====
    -- URL to uploaded evaluation file (PDF/form filled by evaluator)
    file_submission_url TEXT,
    file_name VARCHAR,
    
    -- General fields
    comments TEXT, -- Optional overall comments on the evaluation
    
    -- Status tracking
    status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
    
    -- Timestamps
    submission_date TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_custom_has_file CHECK (
        is_custom_evaluation = FALSE OR file_submission_url IS NOT NULL
    ),
    CONSTRAINT check_builtin_has_eval_data CHECK (
        is_custom_evaluation = TRUE OR evaluation_data IS NOT NULL
    ),
    
    -- AGGREGATED UNIQUE CONSTRAINT: One submission per (phase, group, evaluator, type)
    UNIQUE(phase_id, group_id, evaluator_id, is_custom_evaluation)
);

-- Indexes for performance
CREATE INDEX idx_phase_eval_submissions_project_id ON public.phase_evaluation_submissions(project_id);
CREATE INDEX idx_phase_eval_submissions_phase_id ON public.phase_evaluation_submissions(phase_id);
CREATE INDEX idx_phase_eval_submissions_group_id ON public.phase_evaluation_submissions(group_id);
CREATE INDEX idx_phase_eval_submissions_evaluator_id ON public.phase_evaluation_submissions(evaluator_id);
CREATE INDEX idx_phase_eval_submissions_status ON public.phase_evaluation_submissions(status);
CREATE INDEX idx_phase_eval_submissions_form_id ON public.phase_evaluation_submissions(phase_evaluation_form_id);
CREATE INDEX idx_phase_eval_submissions_is_custom ON public.phase_evaluation_submissions(is_custom_evaluation);
CREATE INDEX idx_phase_eval_submissions_phase_evaluator ON public.phase_evaluation_submissions(phase_id, evaluator_id);
CREATE INDEX idx_phase_eval_submissions_phase_group_evaluator ON public.phase_evaluation_submissions(phase_id, group_id, evaluator_id);


-- ============================================================================
-- Project Evaluation Submissions Table
-- ============================================================================
-- Stores evaluation submission records for project evaluations
--
-- TWO SUBMISSION TYPES:
-- 1. BUILT-IN EVALUATIONS (is_custom_evaluation = FALSE)
--    - Peer-to-peer grid evaluations with criteria scoring
--    - One record per (evaluator, evaluated_member) pair per project
--    - evaluation_data: JSONB with criterion scores
--    - file_submission_url: NULL
--
-- 2. CUSTOM EVALUATIONS (is_custom_evaluation = TRUE)
--    - File-based submissions (e.g., PDF form filled out)
--    - One record per evaluator per project (not per member)
--    - evaluated_member_id: NULL (evaluator submits one file for whole group)
--    - file_submission_url: URL to uploaded evaluation file
--    - evaluation_data: NULL (custom form doesn't use criteria scoring)

CREATE TABLE IF NOT EXISTS public.project_evaluation_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
    project_evaluation_form_id UUID NOT NULL REFERENCES public.project_evaluation_forms(id) ON DELETE CASCADE,
    
    -- Who is evaluating
    evaluator_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    
    -- Who is being evaluated (NULL for custom evaluations)
    evaluated_member_id UUID REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    
    -- Evaluation type indicator (mirrors project_evaluation_forms.is_custom_evaluation)
    is_custom_evaluation BOOLEAN DEFAULT FALSE,
    
    -- ===== BUILT-IN EVALUATION FIELDS =====
    -- Stores criterion scores: { "criterion_id_1": 15, "criterion_id_2": 22, ... }
    -- Each value should be <= max_points for that criterion
    evaluation_data JSONB,
    
    -- ===== CUSTOM EVALUATION FIELDS =====
    -- URL to uploaded evaluation file (PDF/form)
    file_submission_url TEXT,
    file_name VARCHAR,
    
    -- General fields
    comments TEXT, -- Optional additional comments
    total_score NUMERIC, -- Calculated total score (sum of criterion scores for built-in)
    
    -- Status tracking
    status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
    
    -- Navigation tracking for modal
    is_marked_complete BOOLEAN DEFAULT FALSE, -- Left column checkmark indicator
    
    -- Timestamps
    submission_date TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_builtin_has_member CHECK (
        is_custom_evaluation = TRUE OR evaluated_member_id IS NOT NULL
    ),
    CONSTRAINT check_custom_no_member CHECK (
        is_custom_evaluation = FALSE OR evaluated_member_id IS NULL
    ),
    CONSTRAINT check_custom_has_file CHECK (
        is_custom_evaluation = FALSE OR file_submission_url IS NOT NULL
    ),
    CONSTRAINT check_builtin_no_file CHECK (
        is_custom_evaluation = TRUE OR file_submission_url IS NULL
    ),
    CONSTRAINT check_different_members CHECK (
        is_custom_evaluation = TRUE OR evaluator_id != evaluated_member_id
    ),
    
    -- Unique constraints
    -- For built-in: one submission per (evaluator, evaluated_member, project)
    -- For custom: one submission per (evaluator, project) - no member specified
    UNIQUE(project_id, group_id, evaluator_id, evaluated_member_id, is_custom_evaluation)
);

-- Indexes for performance
CREATE INDEX idx_project_eval_submissions_project_id ON public.project_evaluation_submissions(project_id);
CREATE INDEX idx_project_eval_submissions_group_id ON public.project_evaluation_submissions(group_id);
CREATE INDEX idx_project_eval_submissions_evaluator_id ON public.project_evaluation_submissions(evaluator_id);
CREATE INDEX idx_project_eval_submissions_evaluated_member_id ON public.project_evaluation_submissions(evaluated_member_id);
CREATE INDEX idx_project_eval_submissions_status ON public.project_evaluation_submissions(status);
CREATE INDEX idx_project_eval_submissions_form_id ON public.project_evaluation_submissions(project_evaluation_form_id);
CREATE INDEX idx_project_eval_submissions_is_custom ON public.project_evaluation_submissions(is_custom_evaluation);
CREATE INDEX idx_project_eval_submissions_marked_complete ON public.project_evaluation_submissions(is_marked_complete);


-- ============================================================================
-- Helper Views for Easy Querying
-- ============================================================================

-- View: Get all BUILT-IN phase evaluations needing attention for a student
-- NOTE: AGGREGATED MODEL - one record per evaluator per phase containing all members
CREATE OR REPLACE VIEW public.vw_pending_phase_evaluations_builtin AS
SELECT 
    pes.id,
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    p.title AS project_title,
    pp.phase_number,
    pp.title AS phase_title,
    pef.due_date,
    pes.status,
    jsonb_object_length(pes.evaluation_data->'evaluated_members') AS member_count,
    pes.evaluation_data,
    pes.created_at
FROM public.phase_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_phases pp ON pes.phase_id = pp.id
JOIN public.phase_evaluation_forms pef ON pes.phase_evaluation_form_id = pef.id
WHERE pes.is_custom_evaluation = FALSE
  AND pes.status != 'submitted'
ORDER BY pef.due_date, pes.created_at;

-- View: Get all CUSTOM phase evaluations needing attention for a student
CREATE OR REPLACE VIEW public.vw_pending_phase_evaluations_custom AS
SELECT 
    pes.id,
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    p.title AS project_title,
    pp.phase_number,
    pp.title AS phase_title,
    pef.due_date,
    pes.status,
    pes.file_submission_url,
    pes.file_name,
    pes.created_at
FROM public.phase_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_phases pp ON pes.phase_id = pp.id
JOIN public.phase_evaluation_forms pef ON pes.phase_evaluation_form_id = pef.id
WHERE pes.is_custom_evaluation = TRUE
  AND pes.status != 'submitted'
ORDER BY pef.due_date;

-- View: Get all BUILT-IN project evaluations needing attention for a student
CREATE OR REPLACE VIEW public.vw_pending_project_evaluations_builtin AS
SELECT 
    pes.id,
    pes.project_id,
    pes.group_id,
    pes.evaluator_id,
    pes.evaluated_member_id,
    p.title AS project_title,
    pef.due_date,
    sa_evaluated.first_name || ' ' || sa_evaluated.last_name AS evaluated_member_name,
    pes.status,
    pes.evaluation_data,
    pes.created_at
FROM public.project_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_evaluation_forms pef ON pes.project_evaluation_form_id = pef.id
JOIN public.studentaccounts sa_evaluated ON pes.evaluated_member_id = sa_evaluated.id
WHERE pes.is_custom_evaluation = FALSE
  AND pes.status != 'submitted'
ORDER BY pef.due_date, sa_evaluated.first_name, sa_evaluated.last_name;

-- View: Get all CUSTOM project evaluations needing attention for a student
CREATE OR REPLACE VIEW public.vw_pending_project_evaluations_custom AS
SELECT 
    pes.id,
    pes.project_id,
    pes.group_id,
    pes.evaluator_id,
    p.title AS project_title,
    pef.due_date,
    pef.custom_file_url,
    pef.custom_file_name,
    pes.status,
    pes.file_submission_url,
    pes.file_name,
    pes.created_at
FROM public.project_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_evaluation_forms pef ON pes.project_evaluation_form_id = pef.id
WHERE pes.is_custom_evaluation = TRUE
  AND pes.status != 'submitted'
ORDER BY pef.due_date;

-- View: Get completion stats for BUILT-IN phase evaluations (per evaluator per phase)
-- NOTE: AGGREGATED MODEL - Completion is per submission, not per pair
CREATE OR REPLACE VIEW public.vw_phase_evaluation_completion_builtin AS
SELECT 
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    COUNT(*) AS total_submissions,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_submissions,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.phase_evaluation_submissions pes
WHERE pes.is_custom_evaluation = FALSE
GROUP BY pes.project_id, pes.phase_id, pes.group_id, pes.evaluator_id;

-- View: Get completion stats for CUSTOM phase evaluations (per group per phase)
CREATE OR REPLACE VIEW public.vw_phase_evaluation_completion_custom AS
SELECT 
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    COUNT(*) AS total_required_submissions,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_submissions,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.phase_evaluation_submissions pes
WHERE pes.is_custom_evaluation = TRUE
GROUP BY pes.project_id, pes.phase_id, pes.group_id;

-- View: Get completion stats for BUILT-IN project evaluations (per evaluator)
CREATE OR REPLACE VIEW public.vw_project_evaluation_completion_builtin AS
SELECT 
    pes.project_id,
    pes.group_id,
    pes.evaluator_id,
    COUNT(*) AS total_members_to_evaluate,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_evaluations,
    COUNT(CASE WHEN pes.status != 'submitted' THEN 1 END) AS pending_evaluations,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.project_evaluation_submissions pes
WHERE pes.is_custom_evaluation = FALSE
GROUP BY pes.project_id, pes.group_id, pes.evaluator_id;

-- View: Get completion stats for CUSTOM project evaluations (per group)
CREATE OR REPLACE VIEW public.vw_project_evaluation_completion_custom AS
SELECT 
    pes.project_id,
    pes.group_id,
    COUNT(*) AS total_required_submissions,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_submissions,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.project_evaluation_submissions pes
WHERE pes.is_custom_evaluation = TRUE
GROUP BY pes.project_id, pes.group_id;


-- ============================================================================
-- Enable RLS if needed
-- ============================================================================
-- Uncomment these lines if you want to enable Row Level Security

-- ALTER TABLE public.phase_evaluation_submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.project_evaluation_submissions ENABLE ROW LEVEL SECURITY;

-- -- For PHASE evaluations (aggregated): Students can only view their own evaluations
-- CREATE POLICY "Students can view their own phase evaluations" ON public.phase_evaluation_submissions
--     FOR SELECT USING (
--         auth.uid()::uuid = evaluator_id
--     );
--
-- CREATE POLICY "Students can update their own phase evaluations" ON public.phase_evaluation_submissions
--     FOR UPDATE USING (auth.uid()::uuid = evaluator_id);
--
-- CREATE POLICY "Students can create phase evaluations for themselves" ON public.phase_evaluation_submissions
--     FOR INSERT WITH CHECK (auth.uid()::uuid = evaluator_id);

-- -- For PROJECT evaluations (per-pair model): Similar policies
-- CREATE POLICY "Users can view project evaluations they're involved in" ON public.project_evaluation_submissions
--     FOR SELECT USING (
--         auth.uid()::uuid = evaluator_id OR 
--         auth.uid()::uuid = evaluated_member_id
--     );
--
-- CREATE POLICY "Users can update their own project evaluations" ON public.project_evaluation_submissions
--     FOR UPDATE USING (auth.uid()::uuid = evaluator_id);
--
-- CREATE POLICY "Users can create project evaluations for themselves" ON public.project_evaluation_submissions
--     FOR INSERT WITH CHECK (auth.uid()::uuid = evaluator_id);


-- ============================================================================
-- UI FLOW DOCUMENTATION
-- ============================================================================
--
-- BUILT-IN EVALUATION MODAL (is_custom_evaluation = FALSE)
-- =============================================================
-- Layout: Two-column modal (Left: Navigation, Right: Criteria Grid)
--
-- LEFT COLUMN - Member List & Navigation:
--   1. Section: "Phase Details" / "Project Details"
--      - Shows phase/project name, dates, instructions
--   
--   2. Section: "Evaluate Member" (sorted by first_name, last_name)
--      - List of group members to evaluate
--      - Each member has a clickable item
--      - When selected, shows member details
--      - When submitted, gets a ✓ checkmark
--      - Can navigate: Back | Save | Next Member
--   
--   3. Section: "Submission" (Final step)
--      - Shows summary of all evaluated members (with ✓)
--      - Final confirmation before submitting
--      - Buttons: Back | Submit
--
-- RIGHT COLUMN - Criteria Scoring Grid (when member selected):
--   - Shows all criteria for the selected member
--   - For each criterion:
--     * Criterion name & description
--     * Input field with placeholder "x/25" (e.g., "x/25", "x/50", etc.)
--     * Visual indicator of max points
--   - Total score displays at bottom
--   - Submit saves the scores to evaluation_data JSONB
--
-- DATA STRUCTURE in evaluation_data JSONB:
--   {
--     "criterion_1_id": 18,
--     "criterion_2_id": 22,
--     "criterion_3_id": 25,
--     ...
--   }
--
-- CUSTOM EVALUATION MODAL (is_custom_evaluation = TRUE)
-- =============================================================
-- Layout: Single column, centered
--
-- TOP SECTION - Form Details:
--   - Evaluation Form Title
--   - Start Date: [date]
--   - Due Date: [date]
--   - Instructions (if any)
--
-- MIDDLE SECTION - File Operations:
--   - "Download Evaluation Form" link/button
--     → Downloads pef.custom_file_url (the template PDF)
--   - "Upload Completed Form" input
--     → Accepts file uploads (PDF, DOCX, etc.)
--     → Shows file preview/validation after upload
--
-- BOTTOM SECTION - Actions:
--   - Button: "Cancel" (closes modal without saving)
--   - Button: "Submit" (uploads file to file_submission_url)
--
-- FILE STORAGE:
--   - Download: pef.custom_file_url (template provided by professor)
--   - Upload: pes.file_submission_url (student's completed form)
--   - Both stored in file storage bucket with proper naming:
--     * Template: /evaluation_forms/{project_id}/{phase_id}/{form_id}/template.pdf
--     * Submission: /submissions/{project_id}/{evaluator_id}/{form_id}/{filename}
--
-- ============================================================================
-- WORKFLOW EXAMPLE - BUILT-IN EVALUATION
-- ============================================================================
--
-- Phase 1 has 4 members: Alice, Bob, Charlie, David
-- is_custom_evaluation = FALSE
--
-- Step 1: User (Alice) clicks "Evaluate" button
--   - Modal opens
--   - LEFT shows:
--     □ Phase Details
--     □ Evaluate Member (Alphabetical)
--       • Bob
--       • Charlie
--       • David
--     □ Submission
--
-- Step 2: Alice clicks on "Bob"
--   - Bob's section expands
--   - RIGHT column shows Bob's criteria:
--     Criteria 1: Teamwork
--       Score: [____]/25
--     Criteria 2: Communication
--       Score: [____]/30
--     Criteria 3: Contribution
--       Score: [____]/45
--     Total: 0/100
--
-- Step 3: Alice fills scores (e.g., 20, 25, 40)
--   - Clicks "Save" → Records saved to database
--   - evaluation_data = { "criterion_1": 20, "criterion_2": 25, "criterion_3": 40 }
--   - Bob's row gets ✓ checkmark
--
-- Step 4: Alice clicks "Next Member" → Now on Charlie
--   - Repeats process
--   - Same for David
--
-- Step 5: All members evaluated (all have ✓)
--   - "Submission" section now clickable
--   - Shows summary: "✓ Bob (100/100), ✓ Charlie (95/100), ✓ David (87/100)"
--
-- Step 6: Alice clicks "Submit"
--   - All submission records status changed to 'submitted'
--   - Modal closes
--   - Evaluation marked complete
--
-- ============================================================================
-- WORKFLOW EXAMPLE - CUSTOM EVALUATION
-- ============================================================================
--
-- Phase 1 has custom evaluation form (PDF provided)
-- is_custom_evaluation = TRUE
-- custom_file_url = 'https://storage.../phase1_eval_template.pdf'
--
-- Step 1: User (Alice) clicks "Evaluate" button
--   - Modal opens (single column)
--   - Shows:
--     "Phase 1 Evaluation"
--     Start: Oct 26, 2025 10:00 AM
--     Due: Oct 31, 2025 11:59 PM
--     
--     [Download Form] ← Downloads template PDF
--
-- Step 2: Alice downloads the form, fills it out locally
--
-- Step 3: Alice uploads completed form
--   - Click "Upload Completed Form"
--   - Select PDF file
--   - File preview shown
--   
-- Step 4: Alice clicks "Submit"
--   - File uploaded to file_submission_url
--   - Submission record status changed to 'submitted'
--   - Modal closes
