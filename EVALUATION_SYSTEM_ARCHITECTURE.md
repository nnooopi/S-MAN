# Evaluation System Architecture - Complete Specification

## Overview
The evaluation system supports **TWO separate evaluation types**, each with **TWO submission subtypes**:

```
Evaluation Types:
├── Phase Evaluations (per-phase, multiple per project)
│   ├── Built-in (criteria-based scoring)
│   └── Custom (PDF file upload)
│
└── Project Evaluations (project-wide, ONE per project)
    ├── Built-in (criteria-based scoring)
    └── Custom (PDF file upload)
```

---

## DATABASE SCHEMA

### Phase Evaluations

#### `phase_evaluation_forms` table
**Location:** Each specific phase  
**Key Columns:**
- `id` (uuid) - Form identifier
- `phase_id` (uuid) - FK to `project_phases(id)` - **Phase-specific**
- `instructions` (text) - Instructions for evaluators
- `total_points` (integer) - Max points (default: 100)
- `is_custom_evaluation` (boolean) - TRUE = PDF upload, FALSE = built-in scoring
- `custom_file_url` (text) - PDF URL if custom
- `custom_file_name` (varchar) - PDF filename if custom
- `available_from` (timestamp)
- `due_date` (timestamp)

#### `phase_evaluation_criteria` table
**Use:** Defines scoring criteria for **built-in** phase evaluations  
**Key Columns:**
- `id` (uuid)
- `phase_evaluation_form_id` (uuid) - FK to `phase_evaluation_forms(id)`
- `criterion_name` (varchar)
- `description` (text)
- `max_points` (integer) - Points available for this criterion
- `order_index` (integer) - Display order

#### `phase_evaluation_submissions` table
**Use:** Student submissions of phase evaluations  
**Key Columns:**
- `id` (uuid)
- `phase_id` (uuid) - FK to `project_phases(id)`
- `phase_evaluation_form_id` (uuid) - FK to `phase_evaluation_forms(id)`
- `evaluator_id` (uuid) - FK to `studentaccounts(id)` - Who is evaluating
- `evaluated_student_id` (uuid) - FK to `studentaccounts(id)` - Who is being evaluated
- `group_id` (uuid)
- `evaluation_data` (jsonb) - Stores scores for each criterion
- `comments` (text)
- `submission_date` (timestamp with time zone)

---

### Project Evaluations

#### `project_evaluation_forms` table
**Location:** Project-level (ONE form per project)  
**Key Columns:**
- `id` (uuid) - Form identifier
- `project_id` (uuid) - FK to `projects(id)` - **Project-wide**
- `instructions` (text) - Instructions for evaluators
- `total_points` (integer) - Max points (default: 100)
- `is_custom_evaluation` (boolean) - TRUE = PDF upload, FALSE = built-in scoring
- `custom_file_url` (text) - PDF URL if custom
- `custom_file_name` (varchar) - PDF filename if custom
- `deadline_synced_from_phase_id` (uuid) - FK to `project_phases(id)` - **References the evaluation phase**
- `available_from` (timestamp)
- `due_date` (timestamp)

#### `project_evaluation_criteria` table
**Use:** Defines scoring criteria for **built-in** project evaluations  
**Key Columns:**
- `id` (uuid)
- `project_evaluation_form_id` (uuid) - FK to `project_evaluation_forms(id)`
- `criterion_name` (varchar)
- `description` (text)
- `max_points` (integer) - Points available for this criterion
- `order_index` (integer) - Display order

#### `project_evaluation_submissions` table
**Use:** Student submissions of project evaluations  
**Key Columns:**
- `id` (uuid)
- `project_evaluation_form_id` (uuid) - FK to `project_evaluation_forms(id)`
- `project_id` (uuid)
- `group_id` (uuid)
- `evaluator_id` (uuid) - FK to `studentaccounts(id)` - Who is evaluating
- `evaluated_student_id` (uuid) - FK to `studentaccounts(id)` - Who is being evaluated
- `evaluation_data` (jsonb) - Stores scores for each criterion
- `comments` (text)
- `submission_date` (timestamp with time zone)

---

## PHASE SEQUENCING & TIMELINE

### Project Timeline Structure
Projects have this phase sequence:

```
Phase 1 (Work)
     ↓
Phase 2 (Evaluation)  ← Students evaluate phase 1
     ↓
Phase 3 (Breathe)
     ↓
Phase 4 (Work)
     ↓
Phase 5 (Evaluation)  ← Students evaluate phase 4
     ↓
Phase 6 (Breathe)
     ↓
[... more cycles]
     ↓
Phase N (Evaluation)  ← LAST evaluation phase
     ↓
[Project Deadline - project_evaluation_deadline]
```

### Key Dates
- **Project Deadline:** `projects.project_evaluation_deadline` (timestamp)
- **Phase Deadlines:** `project_phases.end_date` (timestamp)
- **Evaluation Phase Duration:** `projects.evaluation_phase_days` (smallint, default: 2 days)
- **Breathe Phase Duration:** `projects.breathe_phase_days` (smallint)

### Determining "Last Evaluation Phase"

The **project evaluation form** is synced to appear on the **last evaluation phase** using:

```
project_evaluation_forms.deadline_synced_from_phase_id = [ID of last evaluation phase]
```

**Algorithm to find "last evaluation phase":**
1. Get all phases for the project in order (by `phase_number`)
2. Find phases of type "evaluation"
3. Get the **latest one** (highest `phase_number`)
4. This is the phase where project evaluation should appear
5. Its `end_date` should be closest to (but before) `projects.project_evaluation_deadline`

---

## PROJECT_PHASES Table - Phase Type Detection

### Phase Type Columns
The `project_phases` table does **NOT** have a single `phase_type` column in the relationships.txt.  
Instead, phase type is determined by:

1. **`title` field** - Typically contains phase type as text ("Evaluation", "Work", "Breathe")
2. **`phase_number` modulo calculation** - Phases follow a pattern (Work → Eval → Breathe → Work → Eval...)
3. **Query-based logic** - Phases before deadline with specific numbering patterns

### Current Implementation Issue
The code checks:
```javascript
p.currentPhaseType === 'evaluation' || 
p.phase_type === 'evaluation' ||
p.phase_type_id?.includes('evaluation')
```

But the database doesn't have these exact fields. Need to check:
- Is `title` being used to determine phase type?
- Or is there a `type` column not shown in relationships.txt?

---

## EVALUATION FORM LOADING

### Phase Evaluation Form
**API Endpoint:** `/api/phases/{phase_id}/evaluation-form`

**Response Structure:**
```json
{
  "id": "uuid",
  "phase_id": "uuid",
  "phase_number": 2,
  "phase_title": "Phase 2 - Evaluation",
  "instructions": "Rate your groupmates...",
  "total_points": 100,
  "is_custom_evaluation": false,
  "evaluation_criteria": [
    {
      "id": "uuid",
      "criterion_name": "Collaboration",
      "description": "...",
      "max_points": 25,
      "order_index": 0
    },
    ...
  ]
}
```

### Project Evaluation Form
**API Endpoint:** `/api/student/projects/{project_id}/evaluation-form`

**Response Structure:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "project_title": "Final Project",
  "instructions": "Rate your groupmates...",
  "total_points": 100,
  "is_custom_evaluation": false,
  "evaluation_criteria": [
    {
      "id": "uuid",
      "criterion_name": "Overall Performance",
      "description": "...",
      "max_points": 100,
      "order_index": 0
    }
  ]
}
```

---

## SUBMISSION FLOW

### Phase Evaluation Submission
1. Student views evaluations column on current phase
2. Phase evaluation card appears (if phase has evaluation form)
3. Click "Evaluate" → Opens EvaluationModal with `type='phase_evaluation'`
4. Modal loads form via `/api/phases/{phase_id}/evaluation-form`
5. If built-in: Shows criteria with scoring interface
6. If custom: Shows PDF file for reference, upload mechanism
7. Student submits via `POST /api/submissions/phase-evaluation-submit`
8. Data saved to `phase_evaluation_submissions` table

### Project Evaluation Submission
1. Student views evaluations column on **LAST evaluation phase only**
2. Project evaluation card appears (if project has evaluation form)
3. Click "Evaluate" → Opens EvaluationModal with `type='project_evaluation'`
4. Modal loads form via `/api/student/projects/{project_id}/evaluation-form`
5. If built-in: Shows criteria with scoring interface
6. If custom: Shows PDF file for reference, upload mechanism
7. Student submits via `POST /api/submissions/project-evaluation-submit`
8. Data saved to `project_evaluation_submissions` table

---

## CURRENT IMPLEMENTATION STATUS

### Frontend (`EvaluationModal.js`)
- ✅ Loads phase evaluation forms with criteria
- ✅ Loads project evaluation forms with criteria
- ✅ Displays profile images for group members
- ✅ Validates scores don't exceed max_points
- ✅ Handles custom PDF uploads
- ✅ Auto-save skips phase/project evaluations (no 404 errors)

### Frontend (`CourseStudentDashboard.js`)
- ✅ Displays phase evaluation cards on all phases with evaluations
- ✅ Displays project evaluation card on **detected last evaluation phase**
- ⚠️ Phase type detection checks multiple properties (needs verification against DB)
- ⚠️ Uses `projectEvaluationData` state to determine if project eval exists

### Backend Requirements
- ✅ `/api/phases/{id}/evaluation-form` endpoint exists
- ⚠️ `/api/student/projects/{id}/evaluation-form` endpoint (possible 404 issue)
- ? Phase evaluation submission endpoint
- ? Project evaluation submission endpoint

---

## KEY LOGIC: "LAST EVALUATION PHASE"

### JavaScript Implementation (CourseStudentDashboard.js)
```javascript
// Find if current phase is the last evaluation phase
const evalPhaseIndex = selectedProject.project_phases.findIndex(
  p => p.id === phaseBeingViewed.id
);

if (evalPhaseIndex !== undefined && evalPhaseIndex !== -1) {
  const remainingPhases = selectedProject.project_phases.slice(
    evalPhaseIndex + 1
  );
  
  // Check if any remaining phases are evaluation phases
  isLastEvalPhase = !remainingPhases.some(p => 
    p.currentPhaseType === 'evaluation' || 
    p.phase_type === 'evaluation' ||
    p.phase_type_id?.includes('evaluation')
  );
}

if (isLastEvalPhase) {
  // Create project evaluation card
}
```

### SQL Logic (Backend should use)
```sql
-- Find the last evaluation phase for a project
SELECT pp.*
FROM project_phases pp
WHERE pp.project_id = $1
  AND pp.title ILIKE '%evaluation%'  -- Or check phase_type if exists
ORDER BY pp.phase_number DESC
LIMIT 1;

-- Then sync project evaluation deadline to that phase
UPDATE project_evaluation_forms
SET deadline_synced_from_phase_id = (
  SELECT id FROM project_phases
  WHERE project_id = $1
    AND title ILIKE '%evaluation%'
  ORDER BY phase_number DESC
  LIMIT 1
)
WHERE project_id = $1;
```

---

## POTENTIAL ISSUES TO INVESTIGATE

### Issue 1: Phase Type Detection
**Problem:** Code checks `p.phase_type` but database may not have this column  
**Solution:** Verify actual column name or use `title` field

### Issue 2: Project Evaluation 404
**Problem:** Endpoint `/api/student/projects/{id}/evaluation-form` returns 404  
**Solution:** Verify backend endpoint implementation

### Issue 3: Multiple Evaluation Phases
**Problem:** If project has multiple evaluation phases, project eval appears on ALL of them  
**Correct Behavior:** Should appear ONLY on the last one  
**Solution:** Use `deadline_synced_from_phase_id` comparison or logic fix

### Issue 4: Criteria Assignment
**Problem:** Phase evaluation criteria should not appear in project evaluation and vice versa  
**Verification:** Check that:
- `phase_evaluation_criteria` only links to `phase_evaluation_forms`
- `project_evaluation_criteria` only links to `project_evaluation_forms`
- Frontend loads correct criteria based on evaluation type

---

## SUMMARY

**The system is designed so:**

1. **Phase Evaluations** = One per evaluation phase, students evaluate peers in that phase
2. **Project Evaluations** = One per project, appears only on the last evaluation phase
3. **Built-in** = Uses criteria from respective criteria tables (phase_ or project_)
4. **Custom** = Uses uploaded PDF files (custom_file_url/custom_file_name)
5. **Deadlines** = Project eval deadline syncs to the last evaluation phase's deadline

**For "last evaluation phase" detection:**
- Must identify all evaluation phases by phase type/title
- Project evaluation appears only when viewing the highest-numbered evaluation phase
- Any remaining phases after current phase being evaluation = NOT last eval phase
