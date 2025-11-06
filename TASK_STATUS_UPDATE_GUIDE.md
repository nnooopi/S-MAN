# Updating Tasks Status Based on Submissions

## Current Architecture

Your system has:
- `tasks` table with a `status` column
- `task_submissions` table - students' original work
- `revision_submissions` table - revisions in response to feedback

**Current Problem:** The `tasks` table status is NOT updated when submissions are approved/marked for revision. The status is calculated dynamically in `dashboard.js` (lines 652-681).

---

## Solution Options

### Option 1: Update Tasks Table During Approval/Revision (RECOMMENDED)
**Pros:**
- Task status always reflects current state
- Faster queries (no calculation needed)
- Better for reporting/analytics
- Cleaner data model

**Cons:**
- Requires updating two locations (submission table + tasks table)
- Need to handle edge cases carefully

### Option 2: Keep Current Dynamic Calculation
**Pros:**
- Single source of truth is submission tables
- Less database writes
- Easier to debug

**Cons:**
- Slower queries (must calculate every time)
- Inconsistent if calculations are called from different places

---

## Recommended Implementation: Option 1

Update the tasks table status whenever a submission status changes. Here's what to update:

### 1. When Approving Submission (server.js line 2162+)

```javascript
// After successfully updating submission to 'approved':
const { error: taskUpdateError } = await freshSupabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId);

if (taskUpdateError) {
  console.warn('⚠️ Warning: Could not update task status to completed:', taskUpdateError);
}
```

### 2. When Requesting Revision (server.js line 2256+)

```javascript
// After successfully updating submission to 'revision_requested':
const { error: taskUpdateError } = await freshSupabase
  .from('tasks')
  .update({ status: 'to_revise' })
  .eq('id', taskId);

if (taskUpdateError) {
  console.warn('⚠️ Warning: Could not update task status to to_revise:', taskUpdateError);
}
```

### 3. Helper Function to Calculate Task Status (Optional)

Create a reusable function to determine what a task's status should be:

```javascript
async function determineTaskStatus(taskId, supabaseClient) {
  // Get all submissions (original + revisions)
  const { data: taskSubs } = await supabaseClient
    .from('task_submissions')
    .select('status')
    .eq('task_id', taskId);
    
  const { data: revisionSubs } = await supabaseClient
    .from('revision_submissions')
    .select('status')
    .eq('task_id', taskId);
    
  const allSubmissions = [...(taskSubs || []), ...(revisionSubs || [])];
  
  if (allSubmissions.length === 0) return 'pending';
  
  // Check if any is approved
  if (allSubmissions.some(s => s.status === 'approved')) return 'completed';
  
  // Check if any is revision_requested
  if (allSubmissions.some(s => s.status === 'revision_requested')) return 'to_revise';
  
  // Check if any is pending
  if (allSubmissions.some(s => s.status === 'pending')) return 'pending_review';
  
  return 'pending';
}
```

---

## Database Migration (If Needed)

If your tasks table doesn't have a status column with proper defaults, run this SQL:

```sql
ALTER TABLE tasks 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

-- Update existing tasks based on their submissions
UPDATE tasks t
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM task_submissions ts 
    WHERE ts.task_id = t.id AND ts.status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM revision_submissions rs 
    WHERE rs.task_id = t.id AND rs.status = 'approved'
  ) THEN 'completed'
  
  WHEN EXISTS (
    SELECT 1 FROM task_submissions ts 
    WHERE ts.task_id = t.id AND ts.status = 'revision_requested'
  ) OR EXISTS (
    SELECT 1 FROM revision_submissions rs 
    WHERE rs.task_id = t.id AND rs.status = 'revision_requested'
  ) THEN 'to_revise'
  
  WHEN EXISTS (
    SELECT 1 FROM task_submissions ts 
    WHERE ts.task_id = t.id AND ts.status = 'pending'
  ) OR EXISTS (
    SELECT 1 FROM revision_submissions rs 
    WHERE rs.task_id = t.id AND rs.status = 'pending'
  ) THEN 'pending_review'
  
  ELSE 'pending'
END
WHERE status IS NULL OR status = '';
```

---

## Implementation Steps

### Step 1: Update `/api/submission-checking/approve` endpoint
Add task status update after submission is approved

### Step 2: Update `/api/submission-checking/request-revision` endpoint  
Add task status update after revision is requested

### Step 3: (Optional) Add the helper function
Makes it reusable across endpoints

### Step 4: Test the workflow
1. Submit task → task status should remain 'pending'
2. Approve submission → task status should change to 'completed'
3. OR Request revision → task status should change to 'to_revise'
4. Verify in database that tasks.status reflects changes

---

## Files to Modify

1. **backend/server.js**
   - Line 2245: Add task status update in approve endpoint
   - Line 2350: Add task status update in request-revision endpoint

2. **Optional: Create helper function**
   - Add to server.js or dashboard.js

---

## Testing Checklist

- [ ] Submit original task → task status stays as-is
- [ ] Approve submission → task.status becomes 'completed'
- [ ] Request revision → task.status becomes 'to_revise'
- [ ] Approve revision → task.status becomes 'completed'
- [ ] Request revision on revision → task.status stays 'to_revise'
- [ ] Check database: SELECT status FROM tasks WHERE id = ?

