# Revised Evaluation Submission Tables - Schema & UI Documentation

## Overview
The evaluation system now supports TWO distinct evaluation types with separate UI flows:
1. **Built-in Evaluations** - Peer-to-peer grid scoring with criteria
2. **Custom Evaluations** - File-based form submissions

## Database Schema Changes

### Phase Evaluation Submissions Table
```sql
CREATE TABLE phase_evaluation_submissions (
    -- Identifiers
    id UUID PRIMARY KEY,
    project_id UUID,
    phase_id UUID,
    group_id UUID,
    phase_evaluation_form_id UUID,
    
    -- Who & What Type
    evaluator_id UUID,           -- Current logged-in member evaluating
    evaluated_member_id UUID,    -- For built-in: member being evaluated
                                  -- For custom: NULL
    is_custom_evaluation BOOLEAN, -- FALSE=built-in, TRUE=custom
    
    -- Built-in evaluation data
    evaluation_data JSONB,       -- { "criterion_1": 20, "criterion_2": 25, ... }
    
    -- Custom evaluation data
    file_submission_url TEXT,    -- URL to uploaded evaluation file
    file_name VARCHAR,
    
    -- Metadata
    total_score NUMERIC,
    comments TEXT,
    status VARCHAR,              -- 'not_started'|'in_progress'|'submitted'|'graded'
    is_marked_complete BOOLEAN,  -- Left column checkmark indicator
    
    -- Timestamps
    submission_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Key Constraints
- **For Built-in** (`is_custom_evaluation = FALSE`):
  - `evaluated_member_id` is NOT NULL
  - `file_submission_url` is NULL
  - One record per (evaluator, evaluated_member, phase)
  
- **For Custom** (`is_custom_evaluation = TRUE`):
  - `evaluated_member_id` IS NULL
  - `file_submission_url` IS NOT NULL
  - One record per (evaluator, phase)

## UI Flows

### BUILT-IN EVALUATION MODAL
**Two-Column Layout:**
- **LEFT: Navigation Panel**
  - Section 1: Phase/Project Details
  - Section 2: "Evaluate Member" (sorted alphabetically by first_name, last_name)
  - Section 3: Submission Summary
  
- **RIGHT: Criteria Scoring Grid**
  - When member selected on left, shows all criteria for that member
  - Each criterion has input field: "___/25" (e.g., max_points for that criterion)
  - Total score calculated and displayed
  
**Navigation Flow:**
```
1. User clicks member → Right shows criteria
2. User enters scores for each criterion
3. User clicks "Save" → Scores saved, member marked ✓
4. User clicks "Next Member" → Next member appears
5. Repeat for all group members
6. When all done → "Submission" section available
7. User confirms and clicks "Submit"
8. All status changed to 'submitted'
```

**Data Storage:**
```javascript
evaluation_data: {
  "criterion_uuid_1": 20,
  "criterion_uuid_2": 25,
  "criterion_uuid_3": 30,
  // ... etc
}
```

### CUSTOM EVALUATION MODAL
**Single-Column Layout:**
- **TOP: Form Metadata**
  - Form Title
  - Start Date: [date]
  - Due Date: [date]
  - Instructions
  - Download link to template PDF
  
- **MIDDLE: File Upload**
  - "[Download Form]" button → Downloads from pef.custom_file_url
  - "[Upload Completed Form]" upload box → Student uploads filled form
  - File preview/validation after selection
  
- **BOTTOM: Actions**
  - "Cancel" button → Closes without saving
  - "Submit" button → Uploads file to file_submission_url

**Workflow:**
```
1. User sees form details and due date
2. User clicks "Download Form" → Gets template PDF
3. User fills form locally (outside this app)
4. User clicks "Upload Completed Form" → Selects file
5. File shown for preview/confirmation
6. User clicks "Submit" → File uploaded, status='submitted'
```

**Data Storage:**
```javascript
// For custom evaluations, NO evaluation_data is stored
evaluation_data: null

// Instead, file location is stored:
file_submission_url: "https://storage.../submissions/project_id/evaluator_id/form_id/completed_form.pdf"
file_name: "completed_form.pdf"
```

## Record Creation

### Built-in Evaluation Records
When professor creates a phase with built-in evaluation form, system creates:
- For each group member (A, B, C, D)
- For each OTHER group member they need to evaluate
- Create submission record with status='not_started'

Example for 4-person group:
```
A → B (not_started)
A → C (not_started)
A → D (not_started)
B → A (not_started)
B → C (not_started)
B → D (not_started)
C → A (not_started)
C → B (not_started)
C → D (not_started)
D → A (not_started)
D → B (not_started)
D → C (not_started)
Total: 12 records
```

### Custom Evaluation Records
When professor creates a phase with custom evaluation form, system creates:
- For each group member
- ONE record per person (not per evaluated member)
- Create submission record with status='not_started'

Example for 4-person group:
```
A submits 1 file (evaluates whole group collectively)
B submits 1 file (evaluates whole group collectively)
C submits 1 file (evaluates whole group collectively)
D submits 1 file (evaluates whole group collectively)
Total: 4 records
```

## Views for Frontend Integration

### For Built-in Evaluations
```sql
-- Get members to evaluate for current user in a phase
SELECT * FROM vw_phase_members_to_evaluate
WHERE phase_id = ? AND evaluator_id = ?
ORDER BY first_name, last_name;

-- Get completion stats for evaluator
SELECT * FROM vw_phase_evaluation_completion_builtin
WHERE evaluator_id = ? AND phase_id = ?;
```

### For Custom Evaluations
```sql
-- Get pending custom evaluation form for user
SELECT * FROM vw_pending_phase_evaluations_custom
WHERE evaluator_id = ? AND phase_id = ?;

-- Check submission status
SELECT file_submission_url, status FROM phase_evaluation_submissions
WHERE evaluator_id = ? AND phase_id = ? AND is_custom_evaluation = TRUE;
```

## Important Notes

1. **Evaluation Type is Immutable:** Once created, is_custom_evaluation cannot change
2. **Evaluator Cannot Change:** evaluator_id is set at creation, cannot be modified
3. **Different Constraints:** Built-in and custom have different unique constraints
4. **Status Progression:** not_started → in_progress → submitted → graded
5. **File Naming:** Store files with pattern: `{project_id}/{evaluator_id}/{form_id}/{timestamp}_{filename}`
6. **Member Sorting:** Always sort by `first_name`, then `last_name` in alphabetical order

## Migration from Old Schema

If migrating from old `evaluation_submissions` table:
1. Identify form type (is_custom_evaluation from phase_evaluation_forms)
2. For built-in: Keep evaluator + evaluated_member_id
3. For custom: Set evaluated_member_id = NULL, migrate file URL to file_submission_url
4. Validate constraints before inserting into new tables
