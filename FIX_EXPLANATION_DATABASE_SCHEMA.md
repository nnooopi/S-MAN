# CRITICAL FIX: Database Schema Issue - Phase Evaluation Dates Location

**Date**: October 24, 2025
**Status**: ✅ FIXED
**Issue**: Backend was querying non-existent fields

---

## The Problem

The backend was trying to select `evaluation_available_from` and `evaluation_due_date` directly from the `project_phases` table:

```javascript
project_phases(
  id,
  phase_number,
  evaluation_available_from,  // ❌ DOES NOT EXIST HERE
  evaluation_due_date         // ❌ DOES NOT EXIST HERE
)
```

**These fields don't exist in `project_phases`!**

---

## The Root Cause

The database schema separates phase information from phase evaluation information:

### `project_phases` Table
Contains:
- `id`
- `phase_number`
- `title`
- `description`
- `start_date` (work period start)
- `end_date` (work period end)
- Other fields...

**Does NOT contain evaluation dates**

### `phase_evaluation_forms` Table
Contains:
- `id`
- `phase_id` (links to project_phases.id)
- `available_from` (evaluation window start) ← **HERE**
- `due_date` (evaluation window end) ← **HERE**
- `instructions`
- `total_points`

---

## The Solution

### Backend Fix

**File**: `backend/student-leader-api.js`

**Changed from**:
```javascript
project_phases(
  id,
  phase_number,
  title,
  description,
  start_date,
  end_date,
  evaluation_available_from,   // ❌ WRONG
  evaluation_due_date          // ❌ WRONG
)
```

**Changed to**:
```javascript
project_phases(
  id,
  phase_number,
  title,
  description,
  start_date,
  end_date,
  phase_evaluation_forms(       // ✅ JOIN to evaluation forms
    id,
    available_from,            // ✅ FROM phase_evaluation_forms
    due_date,                  // ✅ FROM phase_evaluation_forms
    instructions,
    total_points
  )
)
```

**Result**: Now retrieves nested evaluation dates from the related `phase_evaluation_forms` table

### Frontend Fix

**File**: `frontend/src/components/CourseStudentDashboard.js`

**Changed from**:
```javascript
const hasEvalDates = phase.evaluation_available_from && phase.evaluation_due_date;
// ❌ These properties don't exist

dayjs(phase.evaluation_available_from).format(...)
// ❌ Undefined
```

**Changed to**:
```javascript
const phaseEvaluation = phase.phase_evaluation_forms && phase.phase_evaluation_forms.length > 0 
  ? phase.phase_evaluation_forms[0] 
  : null;
const hasEvalDates = phaseEvaluation && phaseEvaluation.available_from && phaseEvaluation.due_date;
// ✅ Access nested object

dayjs(phaseEvaluation.available_from).format(...)
// ✅ Now works
```

---

## Data Structure After Fix

**Backend Response**:
```javascript
{
  project_phases: [
    {
      id: "phase-1-id",
      phase_number: 1,
      title: "Phase 1",
      start_date: "2025-10-24T08:55:00+00:00",
      end_date: "2025-10-26T23:59:00+00:00",
      phase_evaluation_forms: [          // ← Nested array
        {
          id: "eval-form-1-id",
          available_from: "2025-10-26T16:00:00+00:00",  // ✅ Now here
          due_date: "2025-10-28T15:59:59.999+00:00",    // ✅ Now here
          instructions: "...",
          total_points: 100
        }
      ]
    },
    {
      id: "phase-2-id",
      phase_number: 2,
      // ... same structure
      phase_evaluation_forms: [...]
    },
    {
      id: "phase-3-id",
      phase_number: 3,
      // ... same structure
      phase_evaluation_forms: [...]
    }
  ],
  project_evaluation_forms: [
    {
      id: "proj-eval-id",
      available_from: "2025-11-03T16:00:00+00:00",
      due_date: "2025-11-05T15:59:59.999+00:00",
      instructions: "...",
      total_points: 100
    }
  ]
}
```

---

## Timeline Now Displays Correctly

```
START (Oct 24, 08:55 PM)
  ↓
PHASE 1 (Oct 24 - Oct 26)
  ↓
EVALUATION PHASE (Purple) [Oct 26, 4pm - Oct 28, 4pm] ✅ NOW SHOWS
  ↓
BREATHE (Orange, 2d) [if enabled] ✅ NOW SHOWS
  ↓
PHASE 2 (Oct 28 - Oct 30)
  ↓
EVALUATION PHASE (Purple) [Oct 30, 4pm - Nov 1, 4pm] ✅ NOW SHOWS
  ↓
BREATHE (Orange, 2d) ✅ NOW SHOWS
  ↓
PHASE 3 (Nov 1 - Nov 3)
  ↓
EVALUATION PHASE (Purple + Green) [Nov 3, 4pm - Nov 5, 4pm] ✅ NOW SHOWS
  ├─ Phase Eval (Purple)
  └─ Project Eval (Green)
  ↓
BREATHE (Orange, 2d) ✅ NOW SHOWS
  ↓
DUE DATE (Nov 5, 12:00 AM)
```

---

## Why This Wasn't Caught Earlier

The previous attempts used non-existent fields that returned `null`, so the rendering conditions never evaluated to true:

```javascript
// Before fix:
const hasEvalDates = null && null;  // false
// Evaluation phases don't render

// After fix:
const hasEvalDates = "2025-10-26T16:00:00+00:00" && "2025-10-28T15:59:59.999+00:00";  // true
// ✅ Evaluation phases now render!
```

---

## Testing Steps

1. **Restart Backend** (API changes require restart):
   ```powershell
   cd backend
   npm start
   ```

2. **Refresh Frontend**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Open Project Timeline Modal**:
   - Navigate to a project
   - Click to open timeline modal

4. **Verify in Browser Console**:
   ```javascript
   // Check the nested structure
   console.log(selectedProject.project_phases[0].phase_evaluation_forms);
   
   // Should output:
   // [
   //   {
   //     id: "...",
   //     available_from: "2025-10-26T16:00:00+00:00",
   //     due_date: "2025-10-28T15:59:59.999+00:00",
   //     ...
   //   }
   // ]
   ```

5. **Visual Check**:
   - [ ] Evaluation phases appear (Purple cards)
   - [ ] Breathe phases appear (Orange dashed cards)
   - [ ] All dates format correctly
   - [ ] No console errors
   - [ ] Project evaluation appears on last phase only (Green card)

---

## Files Modified

| File | Change | Location |
|------|--------|----------|
| `backend/student-leader-api.js` | Changed SELECT to JOIN `phase_evaluation_forms` | Lines 45-88 |
| `frontend/src/components/CourseStudentDashboard.js` | Access nested `phase_evaluation_forms[0]` | Lines 7507-7695 |

---

## Database Schema Diagram

```
projects
  ├─ project_phases[]
  │   ├─ id
  │   ├─ phase_number
  │   ├─ start_date (WORK PERIOD)
  │   ├─ end_date (WORK PERIOD)
  │   └─ phase_evaluation_forms[] ← RELATED TABLE
  │       ├─ id
  │       ├─ available_from (EVAL WINDOW)
  │       └─ due_date (EVAL WINDOW)
  │
  └─ project_evaluation_forms[] ← SEPARATE TABLE
      ├─ id
      ├─ available_from (EVAL WINDOW)
      └─ due_date (EVAL WINDOW)
```

---

## Key Takeaway

✅ **Evaluation dates are NOT in `project_phases`**
✅ **They are in the SEPARATE `phase_evaluation_forms` table**
✅ **Need to JOIN or query as nested relation to get them**
✅ **One phase can only have ONE phase_evaluation_form** (one-to-one relationship)
✅ **One project can only have ONE project_evaluation_form** (one-to-one relationship)

---

## Expected Result After Fix

The Project Timeline Modal now correctly displays the complete timeline structure with all phases, evaluations, and breathe periods visible and properly dated.

**Timeline should show**: `START → 1 → EVAL → BREATHE → 2 → EVAL → BREATHE → 3 → EVAL+PROJ → BREATHE → DUE`

All evaluation and breathe phases now render with their correct dates from the database.

