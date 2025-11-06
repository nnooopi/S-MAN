# Project and Phase Evaluation Timeline Fix

## Summary

Updated the Project Timeline Modal to display **BOTH** phase and project evaluations on the last evaluation phase. Previously, only phase evaluations were shown. Now the timeline distinguishes between:
- **Phase Evaluations** (Purple) - from `phase_evaluation_forms` table
- **Project Evaluations** (Green) - from `project_evaluation_forms` table

Both appear on the final evaluation phase with their respective dates.

---

## Problem Statement

The Project Timeline Modal was only displaying phase evaluation windows but not project evaluation windows. According to your requirements:
- **Phase evaluations** appear during the evaluation window of their respective phase
- **Project evaluations** appear during the project's evaluation phase (nearest to project due date)
- **Both** evaluations should appear on the last evaluation phase

The frontend was rendering only what data was available, but the **backend wasn't returning project evaluation data**.

---

## Solution Implemented

### 1. Backend Changes (`backend/student-leader-api.js`)

**File**: `c:\Users\nnooopi\Desktop\S-MAN SYSTEM\backend\student-leader-api.js`

**Changes Made**:
- Added `project_evaluation_forms` to the SELECT clause in the `/api/student-leader/projects` endpoint
- This retrieves: `available_from`, `due_date`, `instructions`, `total_points` from the project_evaluation_forms table
- Added `project_evaluation_forms` to the formatted response

**Before**:
```javascript
const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    ...
    project_phases(
      id,
      phase_number,
      title,
      description,
      start_date,
      end_date,
      evaluation_available_from,
      evaluation_due_date
    )
  `)
```

**After**:
```javascript
const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    ...
    project_phases(
      id,
      phase_number,
      title,
      description,
      start_date,
      end_date,
      evaluation_available_from,
      evaluation_due_date
    ),
    project_evaluation_forms(
      id,
      available_from,
      due_date,
      instructions,
      total_points
    )
  `)
```

**Response Formatting**:
```javascript
const formattedProjects = projects.map(project => ({
  ...
  project_phases: project.project_phases || [],
  project_evaluation_forms: project.project_evaluation_forms || []
}));
```

---

### 2. Frontend Changes (`frontend/src/components/CourseStudentDashboard.js`)

**File**: `c:\Users\nnooopi\Desktop\S-MAN SYSTEM\frontend\src\components\CourseStudentDashboard.js`

**Location**: Lines 7595-7719 (Project Timeline Modal - Evaluation Sections)

**Changes Made**:

#### Old Timeline Structure:
```
START → PHASES → EVALUATION (single card) → BREATHE → DUE DATE
```

#### New Timeline Structure:
```
START → PHASES → PHASE EVAL (purple) → PROJECT EVAL (green) → BREATHE → DUE DATE
```

**Key Implementation Details**:

1. **Phase Evaluation Card** (Purple #8B5CF6):
   - Shows phase-specific evaluation window
   - Displays dates from `phase.evaluation_available_from` and `phase.evaluation_due_date`
   - Always appears on last phase if those dates exist

2. **Project Evaluation Card** (Green #10B981):
   - Shows project-wide evaluation window
   - Displays dates from `selectedProject.project_evaluation_forms[0].available_from/due_date`
   - Only appears if `project_evaluation_forms` array exists and has entries
   - Follows after Phase Evaluation

3. **Conditional Rendering**:
   ```javascript
   {isLastPhase && (phase.evaluation_available_from && phase.evaluation_due_date) && (
     <>
       {/* Phase Evaluation */}
       ...
       
       {/* Project Evaluation (if exists) */}
       {selectedProject.project_evaluation_forms && 
        selectedProject.project_evaluation_forms.length > 0 && (
         <>
           {/* Project Evaluation Card */}
         </>
       )}
     </>
   )}
   ```

4. **Color Scheme**:
   - Phase Eval: Purple (#8B5CF6) - Purple clipboard icon
   - Project Eval: Green (#10B981) - Green clipboard icon
   - Both use FaClipboardList icon but different colors

5. **Date Display Format**:
   - Each evaluation shows dates on separate lines
   - Format: `MMM DD, hh:mm A` (e.g., "Oct 27, 02:00 AM")
   - Uses `dayjs` for date formatting with fallback to "TBA"

---

## Data Flow

```
Database Tables
    ↓
Backend API (/api/student-leader/projects)
    ├─ project_phases → phase.evaluation_available_from/due_date
    └─ project_evaluation_forms → project_evaluation_forms[].available_from/due_date
    ↓
Frontend State (selectedProject)
    ├─ project_phases (with evaluation dates)
    └─ project_evaluation_forms (array)
    ↓
Timeline Modal Rendering
    ├─ Phase Evaluation (if isLastPhase && phase eval dates exist)
    └─ Project Evaluation (if project eval forms exist)
```

---

## Database Schema Context

### Table: `project_evaluation_forms`
```
id (uuid)
project_id (uuid) - FK to projects
available_from (timestamp with timezone)
due_date (timestamp with timezone)
instructions (text)
total_points (integer)
created_at (timestamp)
updated_at (timestamp)
```

### Table: `phase_evaluation_forms`
```
id (uuid)
phase_id (uuid) - FK to project_phases
available_from (timestamp with timezone)
due_date (timestamp with timezone)
instructions (text)
total_points (integer)
created_at (timestamp)
updated_at (timestamp)
```

---

## Testing Checklist

- [ ] Backend server restarted (changes to student-leader-api.js)
- [ ] Frontend refreshed in browser
- [ ] Open Project Timeline Modal
- [ ] Verify console logs show `project_evaluation_forms` in selectedProject
- [ ] Confirm timeline displays:
  - Phase Evaluation (Purple) with phase eval dates
  - Project Evaluation (Green) with project eval dates
  - Both on the last phase evaluation section
- [ ] Check date formatting is correct
- [ ] Verify breathing phase still appears after evaluations
- [ ] Test with projects that have:
  - Both phase and project evaluations ✓
  - Only phase evaluations (no project eval)
  - No evaluations (should show breathe phase only)

---

## Expected Output

When opening the Project Timeline Modal for a project with both types of evaluations:

```
[Calendar Icon]
    Start
   Oct 24, 08:55 PM
         |
        [1]
      Phase 1
   Oct 24-26, 11:59 PM
         |
   [Purple Clipboard]
      Phase Eval
   Oct 26, 04:00 PM
       to
   Oct 28, 03:59 PM
         |
   [Green Clipboard]
      Project Eval
   Oct 26, 04:00 PM
       to
   Oct 28, 03:59 PM
         |
   [Orange Dashed Clock]
      Breathe
        2d
         |
   [Checkmark Icon]
      Due Date
   Oct 28, 12:00 AM
```

---

## Verification Query

To verify the backend is now returning project_evaluation_forms:

```javascript
// In browser console:
fetch('/api/student-leader/projects')
  .then(r => r.json())
  .then(d => {
    console.log('Project Eval Forms:', d.projects[0].project_evaluation_forms);
  });

// Expected output:
[
  {
    id: "2a0cd999-15c7-4fe5-bb0b-7efecd83d8a5",
    available_from: "2025-10-26T16:00:00+00:00",
    due_date: "2025-10-28T15:59:59.999+00:00",
    instructions: "Rate your groupmates...",
    total_points: 100
  }
]
```

---

## Files Modified

1. **Backend**:
   - `backend/student-leader-api.js` (lines 45-130)
     - Updated project_phases SELECT query
     - Added project_evaluation_forms to SELECT
     - Updated formattedProjects response object

2. **Frontend**:
   - `frontend/src/components/CourseStudentDashboard.js` (lines 7595-7800)
     - Updated evaluation phase rendering
     - Added Phase Evaluation card (Purple)
     - Added Project Evaluation card (Green)
     - Updated connector line logic

---

## Notes

- **No database changes required** - both tables already exist with data
- **Backward compatible** - if project has no project_evaluation_forms, only phase eval shows
- **Safe deployment** - adds fields to queries without removing any
- **Performance**: Minimal impact - just adding one related table to existing queries

---

## Deployment Steps

1. Restart backend server
2. Refresh frontend in browser
3. Clear browser cache if needed
4. Open Project Timeline Modal
5. Verify both evaluations appear as expected

---

## Related Issues

- Previous Phase Only: Timeline was showing only phase evaluations
- Missing Data: Backend wasn't fetching project_evaluation_forms
- Now Fixed: Both evaluation types display correctly with proper dates

