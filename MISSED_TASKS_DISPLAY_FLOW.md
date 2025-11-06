# Project Dashboard - Missed Tasks Display Flow

## Current Data Flow (Buggy)

```
┌─────────────────────────────────────────────────────────────────┐
│ Task Data from Backend                                          │
│ - title, description, due_date, available_until               │
│ - task_submissions[], revision_submissions[]                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ getActivityStatus(activity) Function                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PRIORITY 3: No submissions check                           │ │
│ │                                                             │ │
│ │ if (now > available_until) → returns 'missed' ✓           │ │
│ │ if (now > due_date) → returns 'late' ✓                    │ │
│ │ else → returns 'active' ✓                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Returns: 'active' | 'late' | 'missed' | 'pending' | 'revise'   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ getFilteredActivities() Function                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Filter by activeFilter state (default = 'Active')         │ │
│ │                                                             │ │
│ │ if (activeFilter === 'Active') {                          │ │
│ │   return status === 'active' || status === 'late'         │ │
│ │ }  ← BUG: DOESN'T INCLUDE 'missed'! ✗                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Returns: Filtered array of tasks to display                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Project Dashboard Columns Render                               │
│                                                                  │
│ Column 1: To-Do      ← Displays tasks with status 'active'     │
│ Column 2: Pending    ← Displays tasks with status 'pending'    │
│ Column 3: Evaluations                                          │
│ Column 4: Revision   ← Displays tasks with status 'revise'     │
│ Column 5: Completed  ← Displays tasks with status 'completed'  │
│                                                                  │
│ ❌ "Missed" tasks NOT displayed anywhere!                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Status Flow Diagram

```
                    Task Created
                        │
                        ▼
    ┌──────────────────────────────┐
    │ Task Status = 'in_progress'  │
    │ Now < due_date               │
    │ getActivityStatus → 'active' │ ◄── To-Do Column
    └──────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
    ┌─────────────┐            ┌──────────────────────┐
    │ Submission  │            │ No Submission        │
    │ Made        │            │ (passed due_date)    │
    └─────────────┘            └──────────────────────┘
          │                            │
          ▼                            ▼
    ┌──────────────────────────┐  ┌──────────────────────┐
    │ Status = 'pending'       │  │ Status = 'late'      │
    │ getActivityStatus →      │  │ Now > due_date       │
    │ 'pending'                │  │ getActivityStatus → │
    │ Pending Column ◄─────────┼──┼─ 'late'             │
    │                          │  │ To-Do Column ◄──────┘
    │                          │  │                      
    └──────────────────────────┘  │
          │                       │
          ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ Approved             │  │ Still No Submission  │
    │ Status = 'approved'  │  │ Now > available_until│
    │ 'completed'          │  │ getActivityStatus →  │
    │ Completed Column     │  │ 'missed'             │
    │                      │  │ ??? MISSING! ✗       │
    └──────────────────────┘  └──────────────────────┘
```

---

## Why "Missed" Tasks Disappear

### Example Scenario:

```
Task: "Submit Project Report"
├─ assigned_date: Nov 1, 2024
├─ due_date: Nov 10, 2024
├─ available_until: Nov 20, 2024
├─ task_submissions: []  (NO SUBMISSIONS)
└─ created_at: Nov 1, 2024

Current Date: Nov 21, 2024 (AFTER available_until)

Step 1: getActivityStatus()
   ├─ Check: activity.status? No
   ├─ Check: revision_submissions? No
   ├─ Check: task_submissions? No
   └─ PRIORITY 3: availableUntil check
      ├─ availableUntil: Nov 20, 2024
      ├─ now: Nov 21, 2024
      ├─ now > availableUntil? YES
      └─ Return: 'missed' ✓

Step 2: getFilteredActivities()
   ├─ activeFilter: 'Active'
   ├─ status: 'missed'
   └─ Check: status === 'active' || status === 'late'?
      ├─ 'missed' === 'active'? NO
      ├─ 'missed' === 'late'? NO
      └─ Return: EXCLUDE from filtered array ✗

Step 3: To-Do Column Render
   └─ Task NOT in filtered array
      └─ Task NOT VISIBLE ✗
```

---

## Visual Column Layout

```
┌──────────┬──────────┬──────────────┬──────────┬───────────┐
│  To-Do   │ Pending  │ Evaluations  │ Revision │ Completed │
├──────────┼──────────┼──────────────┼──────────┼───────────┤
│ Active   │ Pending  │ Phase Evals  │ Revise   │ Approved  │
│ Late     │          │ Project Evals│ Re-Rev   │           │
│ ❌ Missed│          │              │          │           │
│ (BUG)    │          │              │          │           │
└──────────┴──────────┴──────────────┴──────────┴───────────┘
```

---

## Code Locations

### File: `CourseStudentDashboard.js`

**Bug Location #1**: Line 4575 (getFilteredActivities)
```javascript
// CURRENT (BUGGY)
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';  // ← ISSUE HERE
}

// FIXED
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late' || status === 'missed';
}
```

**Bug Location #2**: Lines 4732-4819 (getActivityStatus)
```javascript
// This function correctly returns 'missed', but the result is filtered out
const getActivityStatus = (activity) => {
  // ... other checks ...
  
  // PRIORITY 3: No submissions - check if task is late, missed, or active
  if (availableUntil && now > availableUntil) {
    return 'missed';  // ← Correctly returns 'missed' here
  }
  
  if (now > dueDate) {
    return 'late';
  }
  
  return 'active';
};
```

**To-Do Column Rendering**: Lines 8164-8381
```javascript
{getFilteredActivities().slice(0, 5).map((task, index) => {
  const status = getActivityStatus(task);
  const statusColor = status === 'missed' ? '#dc2626' : /* ... */;
  // ← Visual styling already supports 'missed' status!
  // But tasks never reach here due to filter bug
```

---

## Impact Assessment

### Severity: 🔴 **HIGH**

| Aspect | Impact |
|--------|--------|
| User Experience | Users can't see tasks they failed to complete by deadline |
| Task Visibility | Critical missed deadlines are hidden from view |
| Course Progress | Cannot track overdue/missed submissions |
| Documentation | System doesn't clearly indicate what was missed |

### Affected Features:
- Project Dashboard - To-Do column
- Course Overview - Shows correctly (has separate logic for missed)
- Task Management - Leaders can't see which student tasks were missed
- Notifications - Might not alert users about missed tasks

---

## Validation Checklist

Before applying fix, verify:

- [ ] Tasks have `available_until` date in database
- [ ] `available_until` is AFTER `due_date` 
- [ ] Current date is AFTER `available_until`
- [ ] Task has NO submissions (empty `task_submissions` array)
- [ ] `getActivityStatus()` returns `'missed'` (check browser console)
- [ ] `getFilteredActivities()` filters it out (check browser console logs)

---

## Recommended Solution

**Solution #1 (Recommended)**: Add 'missed' to activeFilter

```javascript
// Line 4575
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late' || status === 'missed';  // ← ADD 'missed'
}
```

**Pro**: Simple, single line fix, consistent with Course Overview
**Con**: Mixes active/late/missed in same column

---

**Solution #2 (Alternative)**: Create separate "Missed" tab/column

Add filter option to show only missed tasks:
```javascript
<button onClick={() => setActiveFilter('missed')}>
  Missed ({missedCount})
</button>
```

**Pro**: Cleaner separation, focuses user attention on critical items
**Con**: More code changes, requires UI redesign

---
