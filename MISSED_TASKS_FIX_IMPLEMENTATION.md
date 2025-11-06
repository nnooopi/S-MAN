# Fix Implementation Guide: Display "Missed" Tasks in Project Dashboard

## Problem Summary
Missed tasks are not displayed in the Project Dashboard To-Do column because the `getFilteredActivities()` function filters them out.

---

## Root Cause Analysis

### Where Status is Set: ✓ WORKING
The `getActivityStatus()` function correctly identifies missed tasks:
```javascript
if (availableUntil && now > availableUntil) {
  return 'missed';  // ← Returns 'missed' correctly
}
```

### Where Tasks are Filtered: ✗ BUGGY
The `getFilteredActivities()` function filters OUT missed tasks:
```javascript
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';  // ← MISSING 'missed'!
}
```

---

## Quick Fix (Recommended)

### File: `CourseStudentDashboard.js`
**Line: 4575**

### Before:
```javascript
// For "Active" filter, show both 'active' and 'late' tasks (To-Do column)
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';
}
```

### After:
```javascript
// For "Active" filter, show 'active', 'late', and 'missed' tasks (To-Do column)
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late' || status === 'missed';
}
```

---

## Complete Fixed Section

**Location**: `getFilteredActivities()` function, Lines 4552-4630

### Full Context (Before):
```javascript
const getFilteredActivities = () => {
  // Ensure we always operate on an array
  const source = Array.isArray(todoActivities) ? todoActivities : (todoActivities?.tasks || []);

  if (!source) return [];
  
  // 🔧 NEW: Only show regular task cards when in WORK PHASE
  // In evaluation phase, only evaluation cards are shown
  // In breathe phase, nothing is shown
  // If no active phase exists, show nothing
  const phaseToFilter = viewedPhase || currentPhase;
  if (!phaseToFilter) {
    console.log('🔍 [PHASE FILTER] No active phase - returning empty tasks');
    return [];
  }
  if (phaseToFilter.currentPhaseType !== 'work') {
    console.log('🔍 [PHASE FILTER] Not in work phase, returning empty tasks. Current phase type:', phaseToFilter.currentPhaseType);
    return [];
  }
  
  let filtered = source;
  
  // First filter by status using our enhanced status logic
  filtered = filtered.filter(activity => {
    const status = getActivityStatus(activity);
    
    // For "Active" filter, show both 'active' and 'late' tasks (To-Do column)
    if (activeFilter.toLowerCase() === 'active') {
      return status === 'active' || status === 'late';  // ← LINE 4575 - FIX HERE
    }
    
    return activeFilter.toLowerCase() === status;
  });
  
  // Filter by viewed phase if available, otherwise show all phases
  if (phaseToFilter) {
    // ... rest of filtering logic ...
  }
  
  return filtered;
};
```

### Full Context (After - Fixed):
```javascript
const getFilteredActivities = () => {
  // Ensure we always operate on an array
  const source = Array.isArray(todoActivities) ? todoActivities : (todoActivities?.tasks || []);

  if (!source) return [];
  
  // 🔧 NEW: Only show regular task cards when in WORK PHASE
  // In evaluation phase, only evaluation cards are shown
  // In breathe phase, nothing is shown
  // If no active phase exists, show nothing
  const phaseToFilter = viewedPhase || currentPhase;
  if (!phaseToFilter) {
    console.log('🔍 [PHASE FILTER] No active phase - returning empty tasks');
    return [];
  }
  if (phaseToFilter.currentPhaseType !== 'work') {
    console.log('🔍 [PHASE FILTER] Not in work phase, returning empty tasks. Current phase type:', phaseToFilter.currentPhaseType);
    return [];
  }
  
  let filtered = source;
  
  // First filter by status using our enhanced status logic
  filtered = filtered.filter(activity => {
    const status = getActivityStatus(activity);
    
    // For "Active" filter, show 'active', 'late', and 'missed' tasks (To-Do column)
    if (activeFilter.toLowerCase() === 'active') {
      return status === 'active' || status === 'late' || status === 'missed';  // ← FIXED: Added 'missed'
    }
    
    return activeFilter.toLowerCase() === status;
  });
  
  // Filter by viewed phase if available, otherwise show all phases
  if (phaseToFilter) {
    // ... rest of filtering logic ...
  }
  
  return filtered;
};
```

---

## Visual Status Badge Changes

The To-Do column already has the visual styling for 'missed' status. When the fix is applied, missed tasks will automatically display with:

- **Color**: Red (#dc2626)
- **Badge Text**: "Missed"
- **Icon**: Clock icon with red background

**Existing Code (Lines 8326)** - Already handles 'missed' styling:
```javascript
const statusColor = status === 'active' ? '#34656D' : 
                  status === 'revise' ? '#f59e0b' : 
                  status === 'completed' ? '#10b981' : 
                  status === 'late' ? '#d97706' :
                  status === 'missed' ? '#dc2626' : '#6b7280';  // ← Already supported!
```

---

## Testing Steps

After applying the fix, verify:

### Step 1: Create Test Data
```
1. Create a task with:
   - due_date: 2024-11-10
   - available_until: 2024-11-20
   - No submission status (empty task_submissions)

2. Set system date to: 2024-11-21 (after available_until)
```

### Step 2: View Project Dashboard
```
1. Navigate to Project Dashboard
2. Select the project containing the test task
3. View the To-Do column
```

### Step 3: Verify Display
```
Expected Result:
├─ Task appears in To-Do column ✓
├─ Shows red "Missed" badge ✓
├─ Shows clock icon with date ✓
└─ Task is clickable ✓
```

### Step 4: Browser Console Debug
```javascript
// Open browser console (F12)
// Check logs for debug messages:

getActivityStatus() logs:
├─ "🔍 [PHASE DEBUG]" - shows task status determination
└─ Returns: 'missed' ✓

getFilteredActivities() logs:
├─ "🔍 [PHASE DEBUG]" - shows filtering logic
├─ Shows tasks being filtered
└─ 'missed' tasks included ✓
```

---

## Additional Verification

### Browser Console Commands:
```javascript
// Check if a specific task is marked as missed
const task = todoActivities[0];
const status = getActivityStatus(task);
console.log('Task status:', status);  // Should show 'missed'

// Check if filtered activities include the task
const filtered = getFilteredActivities();
console.log('Filtered tasks:', filtered);  // Should include the missed task
```

---

## Database Query to Find Missed Tasks

Run this query to find tasks in your database that should show as "missed":

```sql
SELECT 
  t.id,
  t.title,
  t.due_date,
  t.available_until,
  (SELECT COUNT(*) FROM task_submissions WHERE task_id = t.id) as submission_count,
  t.status,
  NOW() as current_time
FROM member_tasks t
WHERE 
  t.available_until IS NOT NULL
  AND t.available_until < NOW()  -- Past available_until date
  AND t.status != 'completed'
  AND t.status != 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM task_submissions 
    WHERE task_id = t.id AND status IN ('approved', 'pending')
  )
LIMIT 20;
```

---

## Change Summary

| Item | Details |
|------|---------|
| **File** | `CourseStudentDashboard.js` |
| **Line** | 4575 |
| **Change** | Add `\|\| status === 'missed'` to filter condition |
| **Scope** | Single line change |
| **Impact** | High (fixes critical visibility issue) |
| **Risk** | Low (only affects display filter, no logic changes) |

---

## Deployment Checklist

- [ ] Apply code fix to line 4575
- [ ] Test with missed tasks in browser
- [ ] Verify browser console shows no errors
- [ ] Check Course Overview still displays missed tasks
- [ ] Test on different phases (work, evaluation, breathe)
- [ ] Verify styling displays correctly (red badge)
- [ ] Test responsive design on mobile
- [ ] Run regression tests on other dashboard features
- [ ] Deploy to production
- [ ] Monitor for any reported issues

---

## Alternative Approaches (If Needed)

### Option A: Add Missed Tab
Add separate filter button:
```javascript
<button onClick={() => setActiveFilter('missed')}>
  Missed ({missedCount})
</button>
```

### Option B: Add Toggle to Show/Hide
```javascript
const [showMissed, setShowMissed] = useState(true);

// In filter logic:
if (!showMissed && status === 'missed') return false;
```

### Option C: Create Dedicated Column
Add a 6th column just for missed tasks (requires UI layout changes)

---

## FAQ

**Q: Will this break anything?**
A: No. The fix only includes 'missed' in the filter. All other logic remains unchanged.

**Q: Why weren't missed tasks showing before?**
A: The filter logic excluded them from the default 'active' filter. They were technically being marked as 'missed' but never displayed.

**Q: Do I need to change the database?**
A: No. The database already has the data. This is purely a frontend display fix.

**Q: Will existing tasks show as missed?**
A: Yes, any task where `now > available_until` and there are no submissions will show as missed.

**Q: Can users still click missed tasks?**
A: Yes, but they won't be able to submit anymore (the available_until window has passed).

**Q: What about the Course Overview?**
A: It already correctly displays missed tasks (has separate logic). This fix makes the Project Dashboard consistent.

---
