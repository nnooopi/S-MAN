# Task Assignment Overview - Phase Detection Fix

## Problem
The Task Assignment "Overview" tab was showing **0 Assigned Tasks** even when a phase was currently active in the Project Timeline Carousel. For example, if Phase 1 was active, the Overview should show tasks assigned to members for Phase 1, but it displayed 0 instead.

## Root Cause
The Overview tab was using a **static `currentActivePhase` state variable** that was set only once during the `loadTaskAssignmentData()` function call. This state never updated in real-time as time progressed through the project timeline.

Meanwhile, the **Project Timeline Carousel** correctly detected the current active phase dynamically using logic that checked:
- Current time vs. phase work period (start_date to end_date)
- Evaluation periods (evaluation_available_from to evaluation_due_date)
- Breathe periods (breathe_start_date to breathe_end_date)

## Solution
Created a new dynamic helper function `detectCurrentActiveWorkPhase()` that:

1. **Mimics the carousel's logic** to find which work phase is currently active
2. **Checks in real-time** if the current moment is within a phase's work period
3. **Falls back intelligently** when between phases or in evaluation/breathe periods:
   - Looks for the most recently ended phase (within 30 days)
   - Falls back to the first phase if no recent phase
4. **Gets called on every render** so it always returns the current active phase

### New Function: `detectCurrentActiveWorkPhase()`
Located in the `renderTaskAssignment()` function, right after `isPhaseAvailableForAssignment()`:

```javascript
// ✅ DYNAMIC: Detect the current active work phase (not evaluation or breathe)
// This mimics the carousel logic to show tasks for the currently active phase
const detectCurrentActiveWorkPhase = () => {
  if (!taskAssignmentView.projectPhases || taskAssignmentView.projectPhases.length === 0) {
    return null;
  }

  const now = new Date();
  const phases = taskAssignmentView.projectPhases.sort((a, b) => a.phase_number - b.phase_number);

  // Find which work phase is currently active
  for (let phase of phases) {
    const startDate = new Date(phase.start_date);
    const endDate = new Date(phase.end_date);

    // If current time is within this phase's work period, return it
    if (now >= startDate && now <= endDate) {
      return phase;
    }
  }

  // If we're between phases or in evaluation/breathe periods,
  // find the phase that's closest to ending (most recent active phase)
  let closestPhase = null;
  let smallestTimeDiff = Infinity;

  for (let phase of phases) {
    const endDate = new Date(phase.end_date);
    
    // Find phases that have ended
    if (now > endDate) {
      const timeDiff = now - endDate;
      if (timeDiff < smallestTimeDiff) {
        smallestTimeDiff = timeDiff;
        closestPhase = phase;
      }
    }
  }

  // If a phase has recently ended and we're in eval/breathe, show that phase
  if (closestPhase && smallestTimeDiff < 30 * 24 * 60 * 60 * 1000) { // Within 30 days
    return closestPhase;
  }

  // Otherwise return the first phase as default
  return phases[0] || null;
};
```

## Changes Made

### 1. Overview Tab Member Cards - Line ~17709
**Before:**
```javascript
const tasksInCurrentPhase = currentActivePhase 
  ? getAssignedTaskCountForMemberPhase(member.student_id, currentActivePhase.id)
  : 0;
```

**After:**
```javascript
// ✅ DYNAMIC: Detect current active phase using the same logic as the carousel
const activeWorkPhase = detectCurrentActiveWorkPhase();
const tasksInCurrentPhase = activeWorkPhase 
  ? getAssignedTaskCountForMemberPhase(member.student_id, activeWorkPhase.id)
  : 0;
```

### 2. Overview Tab Header - Current Phase Display - Line ~17615
**Before:** Used static phase detection with complex timeline building logic
**After:** Uses `detectCurrentActiveWorkPhase()` and adds contextual display:
```javascript
// ✅ DYNAMIC: Use the same phase detection as the carousel
const activeWorkPhase = detectCurrentActiveWorkPhase();

if (!activeWorkPhase) {
  return 'No active phase';
}

// Determine if we're in an evaluation or breathe period
const now = new Date();
const evalStart = activeWorkPhase.evaluation_available_from ? new Date(activeWorkPhase.evaluation_available_from) : null;
const evalEnd = activeWorkPhase.evaluation_due_date ? new Date(activeWorkPhase.evaluation_due_date) : null;
const breatheStart = activeWorkPhase.breathe_start_date ? new Date(activeWorkPhase.breathe_start_date) : null;
const breatheEnd = activeWorkPhase.breathe_end_date ? new Date(activeWorkPhase.breathe_end_date) : null;

if (evalStart && evalEnd && now >= evalStart && now <= evalEnd) {
  return `Phase ${activeWorkPhase.phase_number} - Evaluation Period`;
}
if (breatheStart && breatheEnd && now >= breatheStart && now <= breatheEnd) {
  return `Phase ${activeWorkPhase.phase_number} - Breathe Period`;
}

return `Phase ${activeWorkPhase.phase_number}: ${activeWorkPhase.title}`;
```

## Benefits

1. ✅ **Real-time Updates** - Overview always reflects the current active phase
2. ✅ **Consistency** - Uses the same logic as the Project Timeline Carousel
3. ✅ **Accurate Task Counts** - Shows correct task assignments for the current phase
4. ✅ **Contextual Display** - Shows when in evaluation or breathe periods
5. ✅ **Intelligent Fallback** - Handles edge cases between phases gracefully
6. ✅ **No Static State** - Eliminates outdated `currentActivePhase` dependency

## Testing Steps

1. Navigate to Task Assignment → Overview tab
2. Verify that the phase displayed matches the Project Timeline Carousel center item
3. Check that "Assigned Tasks" count shows the correct number for the current phase
4. Wait for phase transition (or manually adjust system time) and refresh page
5. Verify the Overview updates to show the new current phase
6. Check edge cases: During evaluation periods and breathe periods

## Files Modified
- `frontend/src/components/CourseStudentDashboard.js`
  - Added `detectCurrentActiveWorkPhase()` helper function
  - Updated member card rendering to use dynamic phase detection
  - Updated header phase display to use dynamic detection

## Related Components
- Project Timeline Carousel - Uses similar phase detection logic
- Task Assignment Assign Tab - Will inherit the same phase detection logic for consistency
