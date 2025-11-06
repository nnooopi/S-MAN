# Updated Group Stats Calculation - Submission Activity

## Changes Made

The **Submission Activity** section of Group Stats is now calculated based on **individual task submissions** instead of group deliverable submissions.

---

## New Calculation Logic

### **Process:**

1. **Get all tasks** assigned to group members
   ```sql
   SELECT * FROM tasks 
   WHERE assigned_to IN (group_member_ids) AND is_active = true
   ```

2. **For EACH task**, get the latest submission:
   - Check `task_submissions` table (most recent by `updated_at`)
   - Check `revision_submissions` table (most recent by `updated_at`)
   - **Compare timestamps** → Use whichever is more recent

3. **Analyze the latest submission** to determine:
   - **Was it submitted?** → If yes, increment `totalSubmissions`
   - **On-time or late?** → Compare `submitted_at` with `task.due_date`
   - **Status is approved/completed?** → Increment `completedTasks`

---

## Metrics Calculated

| Metric | Calculation | Source |
|--------|-------------|--------|
| **Total Submissions** | Count of tasks with ANY submission record | `task_submissions` + `revision_submissions` |
| **On-Time** | Count where `submitted_at <= task.due_date` | Latest submission's `submitted_at` |
| **Late** | Count where `submitted_at > task.due_date` | Latest submission's `submitted_at` |
| **Pending** | Total Tasks - Total Submissions | Tasks table minus those with submissions |
| **Completed** | Count where status = 'approved' or 'completed' | Latest submission's `status` |

---

## Updated Response Example

```json
{
  "submissionActivity": {
    "totalSubmissions": 15,      // Tasks that have at least one submission
    "onTimeSubmissions": 14,     // Submissions that were on-time
    "lateSubmissions": 1,        // Submissions that were late
    "pendingSubmissions": 5      // Tasks with NO submissions yet (20 total - 15 submitted = 5 pending)
  },
  "totalTasks": 20,
  "completedTasks": 12,
  "taskCompletionRate": 60,      // 12 completed / 20 total = 60%
  "phaseGradeAverage": 85.5,
  "projectGradeAverage": 88.0
}
```

---

## Console Output for Debugging

When the endpoint runs, you'll see logs like:

```
📊 Group member IDs: [id1, id2, id3]
📊 Total tasks found: 20

📊 Task 123: On-time (submitted 2025-11-05T10:00:00Z <= due 2025-11-05T23:59:00Z)
📊 Task 124: LATE (submitted 2025-11-06T02:00:00Z > due 2025-11-05T23:59:00Z)
📊 Task 125: Latest status = pending, Submitted: false

📊 Submission Activity Calculated:
  Total submitted: 15
  On-Time: 14
  Late: 1
  Pending (not submitted): 5
📊 Completed tasks: 12
```

---

## Key Differences from Previous Calculation

### **BEFORE (Wrong):**
- Counted `phase_deliverable_submissions` + `project_deliverable_submissions`
- Submission Activity = Group-level deliverable submissions (graded)
- Did NOT reflect individual task submission progress

### **AFTER (Correct):**
- Counts individual `task_submissions` + `revision_submissions` for each task
- Submission Activity = Individual member task submissions
- Properly reflects task completion and deadline compliance
- Pending = tasks with no submissions at all

---

## What This Means for Users

**"Group Stats" Card now shows:**
- **Total Submissions (15)** = 15 group members have submitted at least one task
- **On-Time (14)** = 14 of those submissions met the deadline
- **Late (1)** = 1 submission was submitted after the due date
- **Pending (5)** = 5 tasks haven't been submitted yet by anyone
- **Task Completion Rate (60%)** = 12 out of 20 tasks approved/completed

This gives a much better view of the group's actual task submission progress!
