# ✅ Refined Submission Status Categories - Complete

## Updated Definitions

### 1. **Completed Submissions** ✅
- **Latest submission status** = `'approved'`
- **Count:** 1 (regardless of how many revisions exist)
- **Example:** 
  - Original submitted → Approved ✅
  - Original requested revision → Revision approved ✅

### 2. **Pending Submissions** ⏳
- **Latest submission status** = `'pending'` or `'pending_approval'`
- **Waiting for:** Leader review/approval
- **Count:** 1 (only latest submission)
- **Example:**
  - Student submitted, waiting for review
  - Student submitted revision, waiting for review

### 3. **Unsubmitted (Missed)** ❌
- **No submissions exist** AND **past due date**
- **Count:** All tasks without submissions that are overdue
- **Timeline:**
  ```
  Due Date: 2025-11-01 17:00
  Current: 2025-11-02 10:00 (past due)
  Submission: None
  Result: MISSED
  ```
- **Special cases:**
  - No due_date set + no submission = MISSED (always)
  - Has submissions = NOT missed (even if late)

### 4. **Late Submissions** ⏱️
- **Has submission** AND **submitted_date > due_date** AND **submitted_date ≤ available_until_date**
- **Count:** 1 (only latest submission)
- **Timeline Examples:**

#### Scenario A: Has available_until_date
```
Due Date: 2025-11-01 17:00
Available Until: 2025-11-02 23:59
Submitted: 2025-11-02 14:00

Check: 2025-11-02 14:00 > 2025-11-01 17:00? YES (late)
Check: 2025-11-02 14:00 ≤ 2025-11-02 23:59? YES (within window)
Result: LATE ✓
```

#### Scenario B: Submitted after available_until_date
```
Due Date: 2025-11-01 17:00
Available Until: 2025-11-02 23:59
Submitted: 2025-11-03 10:00

Check: 2025-11-03 10:00 > 2025-11-01 17:00? YES (late)
Check: 2025-11-03 10:00 ≤ 2025-11-02 23:59? NO (outside window)
Result: NOT LATE (different category or no submission category)
```

#### Scenario C: No available_until_date
```
Due Date: 2025-11-01 17:00
Available Until: (not set)
Submitted: 2025-11-02 14:00

Check: 2025-11-02 14:00 > 2025-11-01 17:00? YES (late)
Check: Has available_until_date? NO
Result: LATE ✓ (just check if submitted late)
```

### 5. **Revision Submissions** 📝
- **Latest submission status** = `'revision_requested'` or `'to_revise'` or `'needs_revision'`
- **Waiting for:** Student to submit revision
- **Count:** 1 (only latest submission)
- **Example:**
  - Original submitted → Leader requests revision 📝

---

## Implementation Details

### Status Card Counts (Helper Function)

```javascript
const getLatestSubmissionStatus = (task) => {
  // Finds LATEST submission across both task_submissions and revision_submissions
  // Returns { status, submitted_at, type, ... } or null if no submissions
}

// Count Completed
const completed = filteredTasks.filter(t => {
  const latest = getLatestSubmissionStatus(t);
  return latest && latest.status === 'approved';
}).length;

// Count Pending
const submitted = filteredTasks.filter(t => {
  const latest = getLatestSubmissionStatus(t);
  return latest && (latest.status === 'pending' || latest.status === 'pending_approval');
}).length;

// Count Missed (NO submissions + past due)
const missed = filteredTasks.filter(t => {
  const latest = getLatestSubmissionStatus(t);
  if (latest) return false; // Has submission, not missed
  
  if (!t.due_date) return true; // No due date = missed
  return new Date(t.due_date) < new Date(); // Past due date
}).length;

// Count Late (Has submission + submitted late + within available_until)
const late = filteredTasks.filter(t => {
  if (!t.due_date) return false;
  
  const latest = getLatestSubmissionStatus(t);
  if (!latest || !latest.submitted_at) return false;
  
  const submitted = new Date(latest.submitted_at);
  const due = new Date(t.due_date);
  const available = t.available_until_date ? new Date(t.available_until_date) : null;
  
  if (submitted <= due) return false; // Not late
  if (available && submitted > available) return false; // Outside window
  
  return true; // Late and within available window (or no available_until)
}).length;

// Count Revision (Latest status = revision_requested/to_revise/needs_revision)
const revision = filteredTasks.filter(t => {
  const latest = getLatestSubmissionStatus(t);
  return latest && (
    latest.status === 'revision_requested' || 
    latest.status === 'to_revise' || 
    latest.status === 'needs_revision'
  );
}).length;
```

### Pie Chart Filtering

Same logic applies when filtering by status:
- **Filter = 'missed'**: Shows all members with unsubmitted overdue tasks
- **Filter = 'late'**: Shows all members with late submissions (within available window)
- **Filter = 'completed'**: Shows all members with approved submissions
- **Filter = 'submitted'**: Shows all members with pending submissions
- **Filter = 'revision'**: Shows all members with revision-requested submissions

---

## Database Schema Requirements

For this logic to work, your tasks table should have:

```sql
-- Required columns
- id (uuid)
- assigned_to (uuid)
- due_date (timestamp)
- available_until_date (timestamp) -- Optional, but checked for late submissions
- status (varchar) -- For backwards compatibility
- project_id (uuid)
- phase_id (uuid)

-- With relationships
- task_submissions (many-to-one)
  - id, status, created_at, submitted_at
  - revision_submissions (many-to-one per task_submission)
    - id, status, created_at, submitted_at
```

---

## Key Points

✅ **Deduplication:** Only latest submission matters (no duplicate counting)
✅ **Late vs Missed:** Distinct categories with proper date logic
✅ **Available Until:** Respects submission window for late submissions
✅ **Timestamps:** Uses created_at or submitted_at (whichever available)
✅ **Debug Logs:** Console shows which submission is being used

---

## Testing Checklist

- [ ] Completed: Show approved submissions only
- [ ] Pending: Show pending/pending_approval only
- [ ] Missed: Show tasks with NO submissions past due date
- [ ] Late: Show tasks submitted after due_date but within available_until_date
- [ ] Revision: Show revision_requested/to_revise tasks only
- [ ] No Duplicates: Same task never counted twice across categories
- [ ] Pie Chart: Filters work and update counts correctly
- [ ] Status Cards: All counts are accurate and clickable
