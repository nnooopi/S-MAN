-- ================================================================
-- TASK DEADLINE EXTENSION SYSTEM
-- ================================================================
-- This SQL file creates the necessary tables and columns for the
-- deadline extension request feature.
-- ================================================================

-- 1. CREATE TABLE: task_deadline_extension_requests
-- Stores all deadline extension requests made by students
-- ================================================================

CREATE TABLE IF NOT EXISTS task_deadline_extension_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Task and Student References
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES studentaccounts(id) ON DELETE SET NULL,

    -- Request Details
    request_reason TEXT NOT NULL, -- Student's reason for requesting extension
    request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Original Deadlines (for reference)
    original_due_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    original_available_until TIMESTAMP WITHOUT TIME ZONE,

    -- Proposed New Deadlines (filled by leader if approved)
    new_due_date TIMESTAMP WITHOUT TIME ZONE,
    new_available_until TIMESTAMP WITHOUT TIME ZONE,

    -- Status and Review
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
    review_date TIMESTAMP WITH TIME ZONE,
    review_reason TEXT, -- Leader's reason for denial (optional for approval)

    -- Extension Attempt Number (1st extension, 2nd extension, etc.)
    extension_attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'denied')),
    CONSTRAINT valid_extension_attempt CHECK (extension_attempt_number > 0)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_extension_requests_task_id ON task_deadline_extension_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_requested_by ON task_deadline_extension_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON task_deadline_extension_requests(status);
CREATE INDEX IF NOT EXISTS idx_extension_requests_request_date ON task_deadline_extension_requests(request_date DESC);

-- Composite index for leader's request dashboard
CREATE INDEX IF NOT EXISTS idx_extension_requests_task_status ON task_deadline_extension_requests(task_id, status);


-- ================================================================
-- 2. ALTER TABLE: tasks
-- Add columns to track extension history
-- ================================================================

-- Add extension_count column to track how many extensions have been granted
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.extension_count IS 'Number of deadline extensions granted for this task';

-- Add constraint to ensure extension_count is non-negative
ALTER TABLE tasks
ADD CONSTRAINT IF NOT EXISTS check_extension_count_non_negative
CHECK (extension_count >= 0);


-- ================================================================
-- 3. UPDATE TRIGGER: Auto-update updated_at timestamp
-- ================================================================

CREATE OR REPLACE FUNCTION update_extension_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extension_request_timestamp
    BEFORE UPDATE ON task_deadline_extension_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_extension_request_updated_at();


-- ================================================================
-- 4. SAMPLE QUERIES (for reference/testing)
-- ================================================================

-- Get all pending extension requests for a specific task leader
-- SELECT
--     ter.*,
--     t.title as task_title,
--     t.description as task_description,
--     s.first_name || ' ' || s.last_name as student_name,
--     s.profile_image_url
-- FROM task_deadline_extension_requests ter
-- JOIN tasks t ON ter.task_id = t.id
-- JOIN studentaccounts s ON ter.requested_by = s.id
-- WHERE t.assigned_by = 'LEADER_UUID_HERE'
-- AND ter.status = 'pending'
-- ORDER BY ter.request_date DESC;

-- Get extension request history for a specific task
-- SELECT
--     ter.*,
--     s.first_name || ' ' || s.last_name as student_name
-- FROM task_deadline_extension_requests ter
-- JOIN studentaccounts s ON ter.requested_by = s.id
-- WHERE ter.task_id = 'TASK_UUID_HERE'
-- ORDER BY ter.extension_attempt_number ASC;

-- Get student's pending extension requests
-- SELECT
--     ter.*,
--     t.title as task_title,
--     t.due_date as current_due_date
-- FROM task_deadline_extension_requests ter
-- JOIN tasks t ON ter.task_id = t.id
-- WHERE ter.requested_by = 'STUDENT_UUID_HERE'
-- AND ter.status = 'pending';


-- ================================================================
-- 5. PERMISSIONS (adjust as needed for your security setup)
-- ================================================================

-- Grant appropriate permissions to authenticated users
-- GRANT SELECT, INSERT ON task_deadline_extension_requests TO authenticated;
-- GRANT UPDATE ON task_deadline_extension_requests TO authenticated;
-- GRANT SELECT ON tasks TO authenticated;


-- ================================================================
-- NOTES FOR DEVELOPERS
-- ================================================================

-- Workflow:
-- 1. Student submits extension request → INSERT with status='pending'
-- 2. Request appears in leader's "Request" tab
-- 3. Leader reviews:
--    - If APPROVED → UPDATE status='approved', set new_due_date, new_available_until
--                 → UPDATE tasks.due_date and tasks.available_until
--                 → INCREMENT tasks.extension_count
--    - If DENIED → UPDATE status='denied', set review_reason
-- 4. Student receives notification of decision

-- Extension Attempt Logic:
-- - extension_attempt_number should be set based on existing requests for the task
-- - Example: If 2 previous requests exist, new request should be attempt #3
-- - Query: SELECT COALESCE(MAX(extension_attempt_number), 0) + 1
--          FROM task_deadline_extension_requests
--          WHERE task_id = 'TASK_UUID';

-- Business Rules to Implement in Application:
-- - Students cannot request extension if task is already completed/approved
-- - Students should only have ONE pending request per task at a time
-- - Consider limiting total number of extensions allowed per task (e.g., max 3)
-- - Extension requests should be disabled after phase ends (configurable)
