# Submission Checking Buttons Disabled - Root Cause Analysis

## Executive Summary

The "Revision Requested" and "Approve" buttons are disabled in the Course Student Dashboard Submission Checking view based on the **attempt status** and **other attempts in the same task**.

---

## 📊 Data Structure from Backend API

The backend endpoint `/api/submission-checking/:projectId/phase/:phaseId` returns:

```javascript
{
  submissions: [
    {
      taskId: "task-123",
      taskTitle: "Project Setup",
      taskDescription: "...",
      file_types_allowed: ["pdf", "doc"],
      dueDate: "2024-10-15",
      assignedDate: "2024-10-01",
      attempts: [
        {
          id: "submission-456",
          memberName: "John Doe",
          memberProfileImage: "...",
          submittedAt: "2024-10-14T10:30:00Z",
          status: "pending",           // ← KEY FIELD
          fileUrls: [...],
          submissionText: "...",
          feedback: [...],
          revisionAttemptNumber: null,
          isRevisionSubmission: false,
          originalSubmissionId: null
        }
      ],
      latestStatus: "pending",         // ← Overall task status
      approvedAttemptId: null          // ← Which attempt is approved
    }
  ]
}
```

### Possible Status Values:
- `'pending'` - Awaiting review
- `'approved'` - Submission approved
- `'revision_requested'` - Waiting for revision
- `'rejected'` - Submission rejected

---

## 🔴 Button Disable Logic

**Location:** `CourseStudentDashboard.js` lines 13127-13137 and 13292-13302

Both buttons use this exact disable condition:

```javascript
disabled={(() => {
  const hasOtherApprovedAttempt = submissionCheckingView.selectedTask?.attempts?.some(att => 
    att.status === 'approved' && att.id !== submissionCheckingView.selectedAttempt?.id
  );
  
  const hasOtherRevisionAttempt = submissionCheckingView.selectedTask?.attempts?.some(att => 
    att.status === 'revision_requested' && att.id !== submissionCheckingView.selectedAttempt?.id
  );
  
  return submissionCheckingView.selectedAttempt.status === 'approved' || 
         submissionCheckingView.selectedAttempt.status === 'revision_requested' ||
         hasOtherApprovedAttempt ||
         hasOtherRevisionAttempt;
})()}
```

---

## 🚫 Buttons Disabled When:

### Condition 1: Current attempt is already APPROVED
```
selectedAttempt.status === 'approved'
```
**Example:** If you select a submission that was already approved by a group leader
**Tooltip:** "This attempt is already approved"

---

### Condition 2: Current attempt marked for REVISION
```
selectedAttempt.status === 'revision_requested'
```
**Example:** If you select a submission that a leader requested to be revised
**Tooltip:** "Cannot approve an attempt marked for revision"

---

### Condition 3: Another attempt in the SAME TASK is already APPROVED
```
hasOtherApprovedAttempt = true
```
**Example:** Student resubmitted, first attempt was approved, you select the second attempt
**Tooltip:** "Cannot approve when another attempt is already approved"

---

### Condition 4: Another attempt in the SAME TASK is marked for REVISION
```
hasOtherRevisionAttempt = true
```
**Example:** First attempt was marked for revision, you select a later resubmission
**Tooltip:** "Cannot approve when another attempt is marked for revision"

---

## 📋 How to Diagnose the Issue

### 1. **Hover Over the Button**
The `title` attribute will tell you why it's disabled:
- "This attempt is already approved"
- "Cannot approve an attempt marked for revision"
- "Cannot approve when another attempt is already approved"
- "Cannot approve when another attempt is marked for revision"

### 2. **Check Browser Console**
Look for debug logs (around line 11108):
```javascript
console.log('  - selectedTask attempts:', submissionCheckingView.selectedTask?.attempts);
console.log('  - selectedAttempt:', submissionCheckingView.selectedAttempt);
console.log('  - isCurrentApproved:', isCurrentApproved);
console.log('  - hasOtherApprovedAttempt:', hasOtherApprovedAttempt);
```

### 3. **Inspect the Data**
In DevTools → Application → State/Redux:
```javascript
submissionCheckingView: {
  selectedTask: {
    attempts: [
      { id: "...", status: "pending" },
      { id: "...", status: "approved" }  // ← This disables buttons!
    ],
    approvedAttemptId: "..."
  },
  selectedAttempt: { status: "..." }
}
```

---

## ✅ When Buttons Are ENABLED

Buttons are enabled **ONLY** when:
- Current attempt status is `'pending'` **AND**
- No other attempt in this task is `'approved'` **AND**
- No other attempt in this task is `'revision_requested'`

---

## 🔧 Common Scenarios

| Scenario | Button Status | Reason |
|----------|---------------|--------|
| First submission, status: pending | ✅ ENABLED | No conflicts, pending status |
| Second submission, first was approved | ❌ DISABLED | hasOtherApprovedAttempt = true |
| Submission already approved | ❌ DISABLED | status === 'approved' |
| Resubmit after revision request | ✅ ENABLED | New attempt, previous marked for revision |
| Latest attempt, waiting for approval | ✅ ENABLED | No approved/revision attempts |

---

## 💡 Why This Logic?

This design prevents:
1. **Double approval** - Can't approve multiple attempts for the same task
2. **Approval conflicts** - Can't approve when another attempt is already approved
3. **Revision conflicts** - Can't take action when revision is pending
4. **Decision consistency** - Only one final decision per task

---

## 🐛 Potential Issues & Fixes

### Issue 1: Attempts Array is Empty
**Problem:** `selectedTask.attempts` is `undefined` or `[]`
**Solution:** Verify API response includes `attempts` field
**Check:** 
```javascript
console.log('attempts:', submissionCheckingView.selectedTask?.attempts);
```

### Issue 2: Status Values Don't Match
**Problem:** Database has different status values than expected
**Common mismatches:**
- `'Approved'` vs `'approved'` (case sensitivity)
- `'revision requested'` vs `'revision_requested'` (spacing)
- `'accept'` vs `'approved'`

**Solution:** Check database and ensure exact case-sensitive match

### Issue 3: selectedAttempt is Null
**Problem:** No attempt is selected
**Solution:** Ensure attempt is selected before showing buttons
```javascript
if (!submissionCheckingView.selectedAttempt) {
  // Don't show buttons
}
```

---

## 🔍 Quick Debug Steps

1. **Navigate to a submission** in Submission Checking view
2. **Open DevTools (F12)** → Console tab
3. **Run this command:**
   ```javascript
   console.log(
     'Attempts:', 
     JSON.stringify(
       window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers[0]._hydrationCompletionCounter || {},
       null, 2
     )
   );
   ```

4. **Or simpler - Check Network tab:**
   - Look for `/api/submission-checking/` request
   - Check the Response to see attempt statuses

5. **Hover over the button** to see the exact disable reason in the tooltip

---

## 📝 Relevant Code Files

- **Frontend:** `frontend/src/components/CourseStudentDashboard.js`
  - Lines 13070-13392: Button disable logic
  - Lines 11550-11620: Data loading
  - Lines 11540-11620: Phase selection

- **Backend:** `backend/server.js`
  - Lines 1741-2160: `/api/submission-checking/:projectId/phase/:phaseId`
  - Lines 2162-2330: `/api/submission-checking/approve` endpoint
  - Lines 2249-2330: `/api/submission-checking/request-revision` endpoint

---

## 🎯 Next Steps to Investigate

1. **Check what statuses exist in the database:**
   ```sql
   SELECT DISTINCT status FROM task_submissions;
   SELECT DISTINCT status FROM revision_submissions;
   ```

2. **Verify a specific submission:**
   ```sql
   SELECT id, status FROM task_submissions 
   WHERE task_id = 'your-task-id'
   ORDER BY submission_date DESC;
   ```

3. **Check if there's a mismatch between:**
   - Database status values
   - API response status values
   - Frontend expected status values

4. **Enable verbose logging:**
   - Add console.log statements around button logic
   - Check browser console for attempt status information
   - Track state changes when selecting different attempts
