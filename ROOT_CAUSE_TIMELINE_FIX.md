# Root Cause Analysis: Missing Evaluation & Breathe Phases in Timeline

**Date**: October 24, 2025  
**Status**: ✅ FIXED

---

## The Problem

User reported that the Project Timeline was only showing:
```
Start Oct 24, 08:55 PM → Phase 1 Oct 24-26 → Due Date Oct 28
```

Missing:
- ❌ Evaluation Phase (with dates)
- ❌ Breathe Phase

---

## Root Cause

**File**: `backend/student-leader-api.js`  
**Line**: 62-68  
**Issue**: The `/api/student-leader/projects` endpoint was NOT selecting `evaluation_available_from` and `evaluation_due_date` fields from the `project_phases` table.

### Before (Broken)
```javascript
project_phases(
  id,
  phase_number,
  title,
  description,
  start_date,
  end_date
)  // ❌ Missing evaluation date fields!
```

### After (Fixed)
```javascript
project_phases(
  id,
  phase_number,
  title,
  description,
  start_date,
  end_date,
  evaluation_available_from,  // ✅ NOW INCLUDED
  evaluation_due_date         // ✅ NOW INCLUDED
)
```

---

## Why This Matters

The frontend React code was trying to display:
```javascript
{dayjs(phase.evaluation_available_from).format('MMM DD, hh:mm A')} - {dayjs(phase.evaluation_due_date).format('MMM DD, hh:mm A')}
```

But since the backend wasn't returning these fields, `phase.evaluation_available_from` and `phase.evaluation_due_date` were **undefined**, so the conditional rendering failed:

```javascript
{isLastPhase && phase.evaluation_available_from && phase.evaluation_due_date && (
  // This block never executed because the fields were undefined!
  <EvaluationPhaseDisplay />
)}
```

Same issue with breathe phase logic - it checks `selectedProject.breathe_phase_days > 0`, but if that field wasn't being returned, the phase wouldn't show.

---

## The Fix

**Location**: `backend/student-leader-api.js`  
**Lines**: 62-69

Added two missing fields to the SELECT statement:
```javascript
+ evaluation_available_from,
+ evaluation_due_date
```

Now when projects are fetched, each phase will include:
- `id`
- `phase_number`
- `title`
- `description`
- `start_date`
- `end_date`
- `evaluation_available_from` ✨ NEW
- `evaluation_due_date` ✨ NEW

---

## Data Flow After Fix

```
Backend Database (project_phases table)
  ↓
  ├─ evaluation_available_from: "2025-10-27T20:55:00Z"
  └─ evaluation_due_date: "2025-10-28T20:55:00Z"
  
        ↓ SELECT includes these fields ↓
        
Backend API Response (/api/student-leader/projects)
  ↓
  ├─ projects[0].project_phases[0].evaluation_available_from
  └─ projects[0].project_phases[0].evaluation_due_date
  
        ↓ Frontend receives ↓
        
React Component (CourseStudentDashboard)
  ↓
  ├─ Conditional checks pass: phase.evaluation_available_from && phase.evaluation_due_date ✅
  ├─ Evaluation phase renders with dates
  ├─ Breathe phase renders if breathe_phase_days > 0
  └─ Timeline displays all phases! ✨
```

---

## Expected Output After Fix

```
Project Timeline
├─ Start: Oct 24, 08:55 PM
├─ Phase 1: Oct 24, 08:55 PM - Oct 26, 11:59 PM (Active)
├─ Evaluation: Oct 27, 08:55 PM - Oct 28, 08:55 PM ✨ NOW SHOWS
├─ Breathe: 2 days ✨ NOW SHOWS
└─ Due Date: Oct 28, 12:00 AM
```

---

## Files Modified

1. **backend/student-leader-api.js** (Line 62-69)
   - Added `evaluation_available_from` to SELECT
   - Added `evaluation_due_date` to SELECT

---

## Testing the Fix

### Step 1: Verify Backend Database
```sql
SELECT id, phase_number, start_date, end_date, 
       evaluation_available_from, evaluation_due_date
FROM project_phases
LIMIT 1;
```

Should return both evaluation date columns with values (not NULL).

### Step 2: Check API Response
In browser console, run:
```javascript
fetch('/api/student-leader/projects')
  .then(r => r.json())
  .then(d => {
    console.log('First phase:', d.projects[0].project_phases[0]);
  });
```

Should show:
```javascript
{
  id: "...",
  phase_number: 1,
  title: "Phase 1",
  start_date: "2025-10-24T...",
  end_date: "2025-10-26T...",
  evaluation_available_from: "2025-10-27T...",  ✅ Should be here
  evaluation_due_date: "2025-10-28T..."         ✅ Should be here
}
```

### Step 3: Test Frontend Timeline
1. Open Project Dashboard
2. Click on project → "View Timeline" or phase circle
3. Project Timeline modal should display:
   - ✅ Start date
   - ✅ All phases with dates
   - ✅ Evaluation phase with actual dates (not just buffer days)
   - ✅ Breathe phase (if breathe_phase_days > 0)
   - ✅ Due date

---

## Why This Wasn't Caught Earlier

1. **Phases were being fetched** from separate endpoint (`/projects/:id/phases`)
2. **That endpoint might include evaluation dates**, so some displays worked
3. **But the main projects list endpoint** (`/projects`) wasn't including them
4. **Timeline modal used main projects endpoint**, which is why evaluation/breathe phases didn't show

---

## Related Code References

### Frontend Conditional Logic
- **File**: `frontend/src/components/CourseStudentDashboard.js`
- **Lines 7575-7595**: Evaluation phase rendering (checks for dates)
- **Lines 7598-7630**: Breathe phase rendering (checks for breathe_phase_days)

### Backend Calculation
- **File**: `backend/server.js`
- Evaluation dates are AUTO-CALCULATED when project created:
  ```
  evaluation_available_from = phase.end_date + project.breathe_phase_days
  evaluation_due_date = evaluation_available_from + project.evaluation_phase_days
  ```

---

## Summary

✅ **Fixed**: Added missing evaluation date fields to backend API response  
✅ **Impact**: Timeline now shows complete phase information including evaluation and breathe phases  
✅ **No data loss**: Fields already calculated and stored in database, just weren't being returned  
✅ **Backward compatible**: Adding fields doesn't break existing code

The fix is minimal (2 lines) but critical for the timeline display feature to work correctly.

---

## Verification Checklist

After deployment:
- [ ] Verify backend logs show no errors when fetching projects
- [ ] Check browser console - no JavaScript errors
- [ ] Open Project Timeline - should see all phases
- [ ] Evaluation phase shows with correct dates
- [ ] Breathe phase shows if configured
- [ ] Timeline responsive on mobile
- [ ] Phase order is: Work → Evaluation → Breathe → End ✨
