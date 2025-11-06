# Group Stats Calculation Breakdown

## Your Current Stats Example:
```
Total Submissions: 5
On-Time Submissions: 5
Late Submissions: 0
Pending: 10
Task Completion Rate: N/A (0 of 0 tasks completed)
```

---

## How Each Metric is Calculated:

### 1️⃣ **Total Submissions = 5**
**Formula:** `phaseSubmissions.count + projectSubmissions.count`

**Calculation:**
- Fetches from `phase_deliverable_submissions` table WHERE `group_id = your_group_id` AND `status = 'graded'` AND `grade IS NOT NULL`
- Fetches from `project_deliverable_submissions` table WHERE `group_id = your_group_id` AND `status = 'graded'` AND `grade IS NOT NULL`
- Adds both counts together
- **In your case:** 5 graded deliverable submissions (could be any combination of phases and projects)

**Sources:**
```sql
-- Phase submissions
SELECT COUNT(*) FROM phase_deliverable_submissions 
WHERE group_id = ? AND status = 'graded' AND grade IS NOT NULL;

-- Project submissions  
SELECT COUNT(*) FROM project_deliverable_submissions
WHERE group_id = ? AND status = 'graded' AND grade IS NOT NULL;
```

---

### 2️⃣ **On-Time Submissions = 5**
**Formula:** `COUNT(submissions WHERE submitted_at <= due_date)`

**Calculation for each submission:**
1. For **phase submissions**: Compares `submitted_at` vs `phase_snapshot.end_date`
2. For **project submissions**: Compares `submitted_at` vs `project_snapshot.due_date`
3. Counts how many were submitted on or before their deadline

**Code logic:**
```javascript
for (const submission of phaseSubmissions) {
  if (submission.submitted_at && submission.phase_snapshot?.end_date) {
    const submittedDate = new Date(submission.submitted_at);
    const dueDate = new Date(submission.phase_snapshot.end_date);
    
    if (submittedDate <= dueDate) {
      onTimeCount++;  // ✅ On-time
    }
  }
}

for (const submission of projectSubmissions) {
  if (submission.submitted_at && submission.project_snapshot?.due_date) {
    const submittedDate = new Date(submission.submitted_at);
    const dueDate = new Date(submission.project_snapshot.due_date);
    
    if (submittedDate <= dueDate) {
      onTimeCount++;  // ✅ On-time
    }
  }
}
```

**In your case:** All 5 submissions were on-time

---

### 3️⃣ **Late Submissions = 0**
**Formula:** `COUNT(submissions WHERE submitted_at > due_date)`

Same calculation as On-Time, but checks if `submitted_at > due_date`

**In your case:** None were late

---

### 4️⃣ **Pending = 10**
**Formula:** `totalTasks - completedTasks`

**Calculation:**
1. Gets all group members from `course_group_members` table
2. Fetches all tasks assigned to ANY group member from `tasks` table WHERE `assigned_to IN (member_ids)` AND `is_active = true`
3. For each task, checks the latest status from:
   - `task_submissions` (most recent by `updated_at`)
   - `revision_submissions` (most recent by `updated_at`)
4. Determines which one is more recent
5. Counts as "completed" if latest status is `'approved'` or `'completed'`
6. **Pending = Total Tasks - Completed Tasks**

**Code logic:**
```javascript
const allTasks = await supabase
  .from('tasks')
  .select('id, status, assigned_to')
  .in('assigned_to', memberIds)
  .eq('is_active', true);

totalTasks = allTasks.length;  // Total assigned tasks
completedTasks = 0;

for (const task of allTasks) {
  // Get latest task_submission
  const latestTaskSub = await supabase
    .from('task_submissions')
    .select('status, updated_at')
    .eq('task_id', task.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  // Get latest revision_submission
  const latestRevisionSub = await supabase
    .from('revision_submissions')
    .select('status, updated_at')
    .eq('task_id', task.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  // Compare timestamps to find which is most recent
  let latestStatus = task.status;
  if (latestTaskSub && latestRevisionSub) {
    latestStatus = latestTaskSub.updated_at > latestRevisionSub.updated_at 
      ? latestTaskSub.status 
      : latestRevisionSub.status;
  } else if (latestTaskSub) {
    latestStatus = latestTaskSub.status;
  } else if (latestRevisionSub) {
    latestStatus = latestRevisionSub.status;
  }

  // Count as completed if approved or completed
  if (latestStatus === 'approved' || latestStatus === 'completed') {
    completedTasks++;
  }
}

pending = totalTasks - completedTasks;
```

**In your case:**
- **Total Tasks:** Let's say 20 tasks assigned to your group members
- **Completed Tasks:** 10 tasks with status `'approved'` or `'completed'`
- **Pending:** 20 - 10 = **10 tasks**

---

### 5️⃣ **Task Completion Rate = N/A (0 of 0 tasks completed)**

**Formula:** `(completedTasks / totalTasks) × 100`

**Why showing N/A?**
This likely means one of these:
1. **No tasks found** → totalTasks = 0
2. **No completed tasks** → completedTasks = 0 (then shows as 0 of 0)
3. **No submissions found** → Neither task_submissions nor revision_submissions have records

---

## Summary Table

| Metric | Source | Calculation | Your Value |
|--------|--------|-------------|-----------|
| **Total Submissions** | `phase_deliverable_submissions` + `project_deliverable_submissions` (WHERE status='graded') | Count of graded deliverables | 5 |
| **On-Time** | Same sources, filter by `submitted_at <= due_date` | Count submissions on-time | 5 |
| **Late** | Same sources, filter by `submitted_at > due_date` | Count submissions late | 0 |
| **Pending** | `tasks` table (WHERE assigned_to IN members) minus completed | Total Tasks - Completed Tasks | 10 |
| **Completion Rate** | `task_submissions` + `revision_submissions` (latest status) | (Completed / Total) × 100% | 0% or N/A |

---

## The Three Different Tables Being Checked

1. **`phase_deliverable_submissions`** - Group's phase submissions (graded by professor)
2. **`project_deliverable_submissions`** - Group's project submissions (graded by professor)
3. **`tasks`** + **`task_submissions`** + **`revision_submissions`** - Individual member task completion

These are SEPARATE from deliverable submissions. Tasks are individual work items, while deliverables are group submissions.
