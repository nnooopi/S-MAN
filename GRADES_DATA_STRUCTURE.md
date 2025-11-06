# My Grades - Data Structure & Field Mapping

## Overview API Response Structure

When calling `/api/student/grades/overview`, you get an array of grades:

```json
[
  {
    "id": "submission-uuid",
    "projectId": "project-uuid",
    "projectTitle": "Project Name",
    "groupGrade": 95,
    "individualGrade": 95,
    "maxGrade": 100,
    "status": "graded",
    "gradedAt": "2025-11-03T12:00:00Z",
    "gradedBy": "professor-uuid",
    "feedback": "Excellent work!"
  }
]
```

## Detailed Grades API Response Structure

When calling `/api/student/grades/project/{projectId}`, you get:

```json
{
  "projectGrade": {
    "id": "submission-uuid",
    "groupGrade": 95,
    "individualGrade": 95,
    "maxGrade": 100,
    "status": "graded",
    "gradedAt": "2025-11-03T12:00:00Z",
    "gradedBy": "professor-uuid",
    "feedback": "Excellent work!"
  },
  "phaseGrades": [
    {
      "id": "phase-submission-uuid",
      "phaseId": "phase-uuid",
      "phaseNumber": 1,
      "phaseTitle": "Phase One",
      "groupGrade": 90,
      "individualGrade": 92,
      "maxGrade": 100,
      "status": "graded",
      "gradedAt": "2025-11-02T12:00:00Z",
      "gradedBy": "professor-uuid",
      "feedback": "Good submission!"
    }
  ],
  "project": {
    "id": "project-uuid",
    "title": "Project Name"
  }
}
```

## Field Explanations

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| id | UUID | Unique submission ID | `project/phase_deliverable_submissions.id` |
| projectId | UUID | Project ID | `project_deliverable_submissions.project_id` |
| projectTitle | string | Project name | `project_snapshot.title` |
| phaseId | UUID | Phase ID | `phase_deliverable_submissions.phase_id` |
| phaseNumber | number | Phase number (1, 2, 3...) | `phase_snapshot.phase_number` |
| phaseTitle | string | Phase name | `phase_snapshot.title` |
| **groupGrade** | number | Group's overall score | `submission.grade` column |
| **individualGrade** | number | Student's individual score | `member_tasks[].individual_grade` |
| maxGrade | number | Total possible points (usually 100) | `submission.max_grade` |
| status | string | Submission status | `submission.status` (e.g., "graded", "submitted") |
| gradedAt | ISO string | When grade was assigned | `submission.graded_at` |
| gradedBy | UUID | Professor who graded | `submission.graded_by` |
| feedback | string | Instructor's comments | `submission.instructor_feedback` |

## Key Differences: Group Grade vs Individual Grade

### Group Grade
- **Definition**: The overall grade assigned to the entire group's submission
- **Represents**: How well the group performed as a whole
- **Location**: `project_deliverable_submissions.grade` column
- **Usually**: All group members receive the same group grade
- **When identical**: When professor grades all members the same

### Individual Grade
- **Definition**: The specific grade for this student within the group
- **Represents**: How well THIS student performed (can account for individual contributions)
- **Location**: Inside `member_tasks` array, specific to each member
- **Unique per student**: Each member has their own individual_grade
- **When different**: When professor differentiates between student contributions
- **When same**: When all members contributed equally

## Example from Sample Data

From the provided INSERT statement:

```javascript
// This is in project_deliverable_submissions
"grade": "95.00",  // ← GROUP GRADE (everyone in group sees this)

"member_tasks": [
  {
    "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",  // Nopi
    "individual_grade": 95  // ← Nopi's individual grade
  },
  {
    "member_id": "1236a30d-544c-451f-8a05-0ad41fc27822",  // Ivy  
    "individual_grade": 50  // ← Ivy's individual grade (different!)
  }
]
```

**Result for Nopi's Dashboard**:
- Group Grade: 95
- Individual Grade: 95

**Result for Ivy's Dashboard**:
- Group Grade: 95
- Individual Grade: 50

## Frontend Display Logic

In `renderMyGrades()`:

```javascript
<div>Group Grade: {grade.groupGrade || '--'}%</div>
<div>Individual Grade: {grade.individualGrade || '--'}%</div>
```

- If both are null: Grade entry is filtered out (not shown)
- If only one exists: Show just that one (shouldn't happen, but handled)
- If both exist: Show both (normal case)

## Backend Extraction Logic

From `loadGradesOverview()` (server.js line 13275-13285):

```javascript
// Get individual grade from member_tasks for current user
let individualGrade = null;
if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
  const currentUserTask = submission.member_tasks.find(
    member => member.member_id === student_id  // Find this student
  );
  if (currentUserTask && currentUserTask.individual_grade !== undefined && 
      currentUserTask.individual_grade !== null) {
    individualGrade = typeof currentUserTask.individual_grade === 'string' 
      ? parseFloat(currentUserTask.individual_grade)
      : currentUserTask.individual_grade;
  }
}

// Get group grade directly from grade column
const groupGrade = submission.grade ? parseFloat(submission.grade) : null;
```

## Database Tables Used

### project_deliverable_submissions
- Contains: Project-level submissions
- Key fields:
  - `grade`: Group grade (what all members see)
  - `member_tasks`: Array with individual grades
  - `status`: 'graded', 'submitted', etc.
  - `instructor_feedback`: Comments from professor

### phase_deliverable_submissions
- Contains: Phase-level submissions
- Same structure as project_deliverable_submissions
- Linked to specific phase via `phase_id`

## Data Flow to UI

```
Database (Supabase)
    ↓
Backend API (/api/student/grades/*)
    ↓ (Extract grades from member_tasks + grade column)
Frontend Component
    ↓
renderMyGrades() -> All Grades View
    or
renderMyGradesWideView() -> Card View
```

## Sorting Logic

Grades are sorted in `getFilteredAndSortedGrades()`:

| Sort Option | Logic |
|-------------|-------|
| "project" | Keep original order (by project) |
| "date" | By `gradedAt` (newest first) |
| "highest" | By `groupGrade` (highest first) |
| "lowest" | By `groupGrade` (lowest first) |

## Error Handling

If a grade can't be fetched:
1. API returns error
2. Frontend catches in try/catch
3. Logs error to console
4. Sets `gradesOverview` to empty array
5. Shows "No Grades Found" message

## Testing Query

To check if grades exist in the database:

```sql
SELECT 
  id,
  grade,  -- This is group grade
  member_tasks,  -- Contains individual_grade
  status
FROM project_deliverable_submissions
WHERE grade IS NOT NULL
LIMIT 10;
```

Check member_tasks structure (should look like JSON array with individual_grade fields).
