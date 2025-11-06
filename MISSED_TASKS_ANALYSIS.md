# Analysis: Where "Missed" Tasks Are Displayed in Project Dashboard

## Summary
**YES, "MISSED" tasks SHOULD appear in the To-Do column, but they are currently NOT being displayed properly.**

---

## Current Implementation Analysis

### 1. **Where "Missed" Status is Set**
In the `getActivityStatus()` function (Lines 4732-4819):

```javascript
// PRIORITY 3: No submissions - check if task is late, missed, or active
if (availableUntil && now > availableUntil) {
  return 'missed';  // ← Only set if PAST available_until date
}

if (now > dueDate) {
  return 'late';    // ← Set if past due_date but NOT past available_until
}

return 'active';
```

**Key Point**: A task is marked as "missed" ONLY if:
1. The task has NO submissions AND
2. Current time is AFTER the `available_until` date

If only the `due_date` is passed but NOT the `available_until` date, the task shows as "late" instead of "missed".

---

### 2. **Where "Missed" Tasks Currently Appear**

#### **Location 1: To-Do Column (Lines 8164-8381)**
```javascript
{getFilteredActivities().slice(0, 5).map((task, index) => {
  const status = getActivityStatus(task);
  const statusColor = status === 'active' ? '#34656D' : 
                    status === 'revise' ? '#f59e0b' : 
                    status === 'completed' ? '#10b981' : 
                    status === 'late' ? '#d97706' :
                    status === 'missed' ? '#dc2626' : '#6b7280';
  // Display logic...
```

**Filter Logic (Line 4575)**:
```javascript
// For "Active" filter, show both 'active' and 'late' tasks (To-Do column)
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';
}
```

⚠️ **BUG FOUND**: The filter only shows `active` and `late` tasks, but NOT `missed` tasks!

#### **Location 2: Course Overview (Lines 7086-7089)**
```javascript
const missedTasks = userTasksFromActiveProjects
  .filter((task) => {
    const status = getActivityStatus(task);
    return status === 'missed' || status === 'rejected';
  });
```

✅ Correctly filters for missed tasks here.

---

## The Problem

### **Bug #1: "Missed" Not Included in To-Do Filter**

In `getFilteredActivities()` function (Line 4575), the filter logic is:

```javascript
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';  // ← MISSING 'missed'!
}
```

**Result**: Even though `getActivityStatus()` can return `'missed'`, the `getFilteredActivities()` function filters it out when the `activeFilter` is set to "active".

### **Bug #2: activeFilter State**
The component has:
```javascript
const [activeFilter, setActiveFilter] = useState('Active');
```

So by default, it's always filtering for `'active'` or `'late'`, but NOT `'missed'`.

---

## Why This is a Problem

### Current Behavior:
1. Task has no submission
2. Current date is AFTER `available_until` 
3. `getActivityStatus()` returns `'missed'` ✓
4. But `getFilteredActivities()` filters it out ✗
5. **Task is NOT displayed anywhere in the Project Dashboard**

### Expected Behavior:
- Missed tasks should appear in the **To-Do column** with a red "Missed" badge
- Users should see these tasks so they understand what was not completed

---

## The Fix

### **Solution 1: Add 'missed' to the activeFilter logic (Recommended)**

**Location**: Line 4575 in `getFilteredActivities()`

```javascript
// BEFORE
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late';
}

// AFTER
if (activeFilter.toLowerCase() === 'active') {
  return status === 'active' || status === 'late' || status === 'missed';
}
```

### **Solution 2: Add a separate "Missed" column**

Instead of mixing with To-Do, create a dedicated "Missed" column showing only tasks that have passed their `available_until` date with no submission.

### **Solution 3: Add a filter toggle for missed tasks**

Allow users to show/hide missed tasks in the To-Do column via a toggle or dropdown option.

---

## Data Requirements

For tasks to show as "missed", they MUST have:
1. ✓ `available_until` date set in the database
2. ✓ Current date > `available_until` date
3. ✓ No task submissions (status is "not submitted")

**Check**: Verify that tasks in your database have the `available_until` field properly set. If they don't, tasks will show as "late" instead of "missed".

---

## Recommended Action

**Implement Solution 1** - Add `'missed'` to the activeFilter condition:

1. Minimal code change
2. Missed tasks naturally appear in To-Do column with red "Missed" badge
3. Consistent with Course Overview behavior
4. Users can see what tasks they missed

This aligns with typical task management UX where missed deadlines are prominently displayed in the main To-Do area.
