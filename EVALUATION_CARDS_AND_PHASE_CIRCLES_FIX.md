# Evaluation Cards & Phase Circles Fix - October 24, 2025

## Problem Statement

Evaluation task cards were not appearing in the **Evaluations column** of the Project Dashboard when it was the evaluation phase for Phase 1. Additionally, phase circles might not be displaying correctly relative to the current evaluation phase window.

## Root Causes Identified

### 1. **Phase Detection Logic Error** (detectCurrentPhase function)
The `detectCurrentPhase()` function was only checking if `now` falls between a phase's `start_date` and `end_date`, but it **ignored the evaluation phase window** that extends beyond the phase end date.

**Expected Behavior:**
- Phase 1 runs: Jan 1 - Jan 10
- Breathe Phase: Jan 11 - Jan 11 (1 day)
- Evaluation Phase: Jan 12 - Jan 13 (2 days)
- **Total active window: Jan 1 - Jan 13**

**Actual Behavior:**
- Only detected Phase 1 as active from Jan 1 - Jan 10
- During Jan 12-13 (evaluation window), `currentPhase` would be `null`
- This caused evaluations not to display and UI elements relying on `currentPhase` to break

### 2. **Evaluation Card Filtering Issue**
The Evaluations column was rendering **all evaluations** from `evaluationsData` array without filtering by status:
```javascript
const displayEvaluations = evaluationsData && Array.isArray(evaluationsData) ? evaluationsData : [];
```

Evaluations with status='pending' (not yet available) or status='due' (past deadline) were showing alongside 'active' ones.

### 3. **Backend Evaluation Status Calculation**
The backend correctly sets evaluation status based on current date:
- `status = 'pending'` if `now < available_from`
- `status = 'active'` if `available_from <= now <= due_date`  
- `status = 'due'` if `now > due_date`

But if `available_from` and `due_date` aren't calculated correctly (based on phase end + breathe + evaluation days), no evaluations would be 'active'.

## Solutions Implemented

### 1. Fixed `detectCurrentPhase()` Function (Lines 4072-4134)

**Changed the phase detection logic to include evaluation phase window:**

```javascript
const detectCurrentPhase = (phases) => {
  // ... validation code ...
  
  const activePhase = phases.find(phase => {
    const startDate = new Date(phase.start_date);
    const endDate = new Date(phase.end_date);
    
    // NEW: Check evaluation phase window
    const evaluationAvailableFrom = phase.evaluation_available_from 
      ? new Date(phase.evaluation_available_from) 
      : null;
    const evaluationDueDate = phase.evaluation_due_date 
      ? new Date(phase.evaluation_due_date) 
      : null;
    
    // Convert to UTC for comparison
    const nowUTC = new Date(now.toISOString());
    const startUTC = new Date(startDate.toISOString());
    const endUTC = new Date(endDate.toISOString());
    const evalStartUTC = evaluationAvailableFrom 
      ? new Date(evaluationAvailableFrom.toISOString()) 
      : null;
    const evalEndUTC = evaluationDueDate 
      ? new Date(evaluationDueDate.toISOString()) 
      : null;
    
    // Phase is active if EITHER:
    // 1. We're in the phase window (start_date to end_date), OR
    // 2. We're in the evaluation window (evaluation_available_from to evaluation_due_date)
    const isActive = (nowUTC >= startUTC && nowUTC <= endUTC) ||
                     (evalStartUTC && evalEndUTC && nowUTC >= evalStartUTC && nowUTC <= evalEndUTC);
    
    return isActive;
  });
  
  setCurrentPhase(activePhase);
};
```

**Key Changes:**
- ✅ Added checks for `evaluation_available_from` and `evaluation_due_date` fields
- ✅ Extends the phase active window to include the evaluation phase period
- ✅ Proper UTC time comparison to avoid timezone issues
- ✅ Enhanced debug logging to show both phase window and evaluation window

**Impact:**
- `currentPhase` now correctly identifies which phase is active, even during evaluation window
- Phase circles/navigation will show the correct phase
- Evaluations column will use the correct phase context

### 2. Fixed Evaluation Card Filtering (Lines 6620-6650)

**Added status filtering to show only 'active' evaluations:**

```javascript
{(() => {
  // Use loaded evaluations data, or fall back to empty array
  const allEvaluations = evaluationsData && Array.isArray(evaluationsData) 
    ? evaluationsData 
    : [];
  
  // NEW: Filter to show only 'active' evaluations (hide 'pending' or 'due')
  const displayEvaluations = allEvaluations.filter(e => e.status === 'active');
  
  console.log('📊 [EVALUATIONS DEBUG]', {
    total: allEvaluations.length,
    active: displayEvaluations.length,
    statuses: allEvaluations.map(e => e.status),
    evaluations: allEvaluations
  });
  
  // ... rest of rendering logic ...
  return displayEvaluations.length === 0 ? (
    // Show empty state
  ) : (
    displayEvaluations.map((evaluation, index) => {
      // Render evaluation cards
    })
  );
})()}
```

**Key Changes:**
- ✅ Added `.filter(e => e.status === 'active')` to show only available evaluations
- ✅ Added debug logging to help troubleshoot evaluation statuses
- ✅ Removed `.slice(0, 5)` limit since we're now filtering

**Impact:**
- Only evaluations that are currently active show in the column
- Pending evaluations (not yet available) remain hidden
- Past-due evaluations don't clutter the interface

## Files Modified

- **`frontend/src/components/CourseStudentDashboard.js`**
  - Lines 4072-4134: Updated `detectCurrentPhase()` function
  - Lines 6620-6650: Updated Evaluations column rendering with status filter

## Testing & Verification

### To verify the fix is working:

1. **Check Phase Detection**
   - Open browser console
   - Look for logs starting with `🔍 [PHASE DEBUG]`
   - Should show both `phaseWindow` and `evaluationWindow` objects
   - When current date is during evaluation phase, `inEvalWindow: true` should appear

2. **Check Evaluation Card Display**
   - Navigate to Project Dashboard
   - Look for logs starting with `📊 [EVALUATIONS DEBUG]`
   - Should show `active:` count matching displayed cards
   - Only cards with `status === 'active'` should appear

3. **Manual Test Scenario**
   - If today is during Phase 1's evaluation window (after phase ends + breathe days)
   - Evaluation cards should appear in the Evaluations column
   - Phase should be correctly identified as Phase 1 in navigation

## Database Requirements

The fix relies on these fields existing in the `project_phases` table:
- `evaluation_available_from` - When evaluations become available
- `evaluation_due_date` - When evaluations are due

These fields are **automatically calculated** by the backend when projects are created/updated:
- `evaluation_available_from` = `phase.end_date` + `project.breathe_phase_days`
- `evaluation_due_date` = `evaluation_available_from` + `project.evaluation_phase_days`

## Related Issues Fixed

1. ✅ Evaluation cards not appearing during evaluation phase
2. ✅ Phase circles not showing correctly when in evaluation window
3. ✅ Phase-sensitive UI elements breaking during evaluation phase
4. ✅ Incorrect phase context when between phases

## Future Considerations

- If phase dates are edited after creation, recalculate `evaluation_available_from` and `evaluation_due_date`
- Consider showing upcoming evaluations with status='pending' in a separate "Upcoming" section
- Add visual indicators showing breathe phase and evaluation phase on timeline views

## Debug Commands

To manually verify phase configuration in console:

```javascript
// Check current phase detection
console.log('Current Phase:', currentPhase);

// Check all evaluations
console.log('All Evaluations:', evaluationsData);

// Check filtered active evaluations
console.log('Active Evaluations:', evaluationsData?.filter(e => e.status === 'active'));

// Check selected project's phases
console.log('Project Phases:', selectedProject?.project_phases);
```
