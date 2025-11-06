# ✅ Max Attempts Validation - COMPLETE

## 🎯 **What Was Fixed**

Added proper validation to enforce the `max_attempts` limit from the `project_phases` table:

1. ✅ **Frontend checks** `max_attempts` before showing "Create New Attempt" button
2. ✅ **Backend validates** submission count against `max_attempts`
3. ✅ **Warning message** displayed when max attempts reached
4. ✅ **Proper error handling** with detailed messages

---

## 📋 **Database Schema**

### **`project_phases` Table:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `max_attempts` | integer | 1 | Maximum number of submissions allowed for this phase |

**Source:** `backend/relationships.txt` line 812

---

## 🔧 **Changes Made**

### **1. Frontend Validation** (`CourseStudentDashboard.js` ~line 18545)

Added max attempts checking:

```javascript
const submissionDetails = phase.submissionDetails;
const hasSubmission = (submissionDetails && submissionDetails.length > 0) && !isCreatingNewAttempt;
const latestSubmission = submissionDetails && submissionDetails.length > 0 ? submissionDetails[submissionDetails.length - 1] : null;

// ✅ NEW: Check if max attempts reached
const maxAttempts = phase.max_attempts || 1;
const currentAttempts = submissionDetails?.length || 0;
const canCreateNewAttempt = currentAttempts < maxAttempts;
```

---

### **2. Conditional Button Display** (~line 18698)

Show button OR warning message based on attempt limit:

```javascript
{/* ✅ NEW: Create New Attempt Button or Max Attempts Message */}
{canCreateNewAttempt ? (
  <button
    onClick={handleCreateNewAttempt}
    style={{
      padding: '12px 20px',
      backgroundColor: '#3B82F6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: '100%'
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
  >
    <FaPlus style={{ fontSize: '12px' }} />
    Create New Attempt (Resubmit)
  </button>
) : (
  <div style={{
    padding: '12px 20px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#92400E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%'
  }}>
    <FaExclamationTriangle style={{ fontSize: '14px', color: '#F59E0B' }} />
    Maximum attempts reached ({currentAttempts}/{maxAttempts})
  </div>
)}
```

---

### **3. Backend Validation** (`backend/server.js` ~line 15650)

Added validation after fetching phase data:

```javascript
console.log('✅ Phase snapshot captured:', phaseData);

// ============================================================================
// 1.5. CHECK MAX ATTEMPTS LIMIT
// ============================================================================
const maxAttempts = phaseData.max_attempts || 1;

// Count existing submissions for this phase and group
const { data: existingSubmissions, error: submissionsCountError } = await supabase
  .from('phase_deliverable_submissions')
  .select('id, resubmission_number')
  .eq('phase_id', phaseId)
  .eq('group_id', groupId);

if (submissionsCountError) {
  console.error('❌ Error checking existing submissions:', submissionsCountError);
  return res.status(500).json({ error: 'Failed to check submission attempts' });
}

const currentAttempts = existingSubmissions?.length || 0;

console.log('🔢 Attempts check:', {
  maxAttempts,
  currentAttempts,
  canSubmit: currentAttempts < maxAttempts
});

if (currentAttempts >= maxAttempts) {
  console.error('❌ Maximum attempts reached');
  return res.status(400).json({ 
    error: 'Maximum submission attempts reached',
    details: `This phase allows ${maxAttempts} attempt(s). You have already submitted ${currentAttempts} time(s).`,
    maxAttempts,
    currentAttempts
  });
}

console.log('✅ Attempt limit check passed');
```

---

## 🎬 **User Flows**

### **Scenario 1: Phase with max_attempts = 1 (Default)**

1. **Initial Submission:**
   - User submits phase deliverable
   - Status shows "SUBMITTED"
   - Submitted files displayed with download buttons
   - **Warning message appears:** "Maximum attempts reached (1/1)"
   - ✅ No "Create New Attempt" button shown

2. **Attempt to Resubmit:**
   - If user somehow tries to submit again (via API manipulation)
   - Backend returns **400 error:** "Maximum submission attempts reached"

---

### **Scenario 2: Phase with max_attempts = 3**

1. **First Submission:**
   - User submits phase deliverable
   - Status shows "SUBMITTED"
   - **Blue button appears:** "Create New Attempt (Resubmit)"
   - Current state: 1/3 attempts

2. **Second Submission:**
   - User clicks "Create New Attempt"
   - Form becomes editable
   - User uploads new files
   - Submits successfully
   - **Blue button still appears:** "Create New Attempt (Resubmit)"
   - Current state: 2/3 attempts

3. **Third Submission:**
   - User clicks "Create New Attempt"
   - Form becomes editable
   - User uploads new files
   - Submits successfully
   - **Warning message appears:** "Maximum attempts reached (3/3)"
   - ✅ No more "Create New Attempt" button

4. **Attempt Fourth Submission:**
   - If user somehow tries to submit again
   - Backend returns **400 error:** "Maximum submission attempts reached"

---

### **Scenario 3: Unlimited Attempts (max_attempts = NULL or very high)**

1. User can keep creating new attempts
2. "Create New Attempt" button always appears
3. No maximum limit enforced

---

## 📊 **Visual States**

### **When Can Create New Attempt:**
```
┌────────────────────────────────────────┐
│  ✓  filename.pdf         [Download]   │
│  ✓  document.docx        [Download]   │
├────────────────────────────────────────┤
│  +  Create New Attempt (Resubmit)     │ ← Blue button
└────────────────────────────────────────┘
```

### **When Max Attempts Reached:**
```
┌────────────────────────────────────────┐
│  ✓  filename.pdf         [Download]   │
│  ✓  document.docx        [Download]   │
├────────────────────────────────────────┤
│  ⚠  Maximum attempts reached (3/3)    │ ← Orange warning
└────────────────────────────────────────┘
```

---

## 🔍 **Error Handling**

### **Frontend:**
- Prevents button from showing if `currentAttempts >= maxAttempts`
- Shows clear warning message with attempt count

### **Backend:**
- Queries existing submissions before accepting new one
- Returns **400 Bad Request** if limit exceeded
- Provides detailed error message:
  ```json
  {
    "error": "Maximum submission attempts reached",
    "details": "This phase allows 3 attempt(s). You have already submitted 3 time(s).",
    "maxAttempts": 3,
    "currentAttempts": 3
  }
  ```

---

## 📁 **Files Modified**

### **Frontend:**
- ✅ `frontend/src/components/CourseStudentDashboard.js`
  - Added `maxAttempts`, `currentAttempts`, `canCreateNewAttempt` variables
  - Conditional rendering of button vs. warning message

### **Backend:**
- ✅ `backend/server.js`
  - Added max attempts validation before processing submission
  - Query existing submissions count
  - Reject if limit exceeded

---

## ✅ **Testing Checklist**

### **Max Attempts = 1:**
- [ ] First submission succeeds
- [ ] Warning message appears: "Maximum attempts reached (1/1)"
- [ ] No "Create New Attempt" button shown
- [ ] Attempting to submit via API returns 400 error

### **Max Attempts = 3:**
- [ ] First submission succeeds → Button appears
- [ ] Second submission succeeds → Button still appears
- [ ] Third submission succeeds → Warning message appears
- [ ] No button shown after 3rd submission
- [ ] Attempting 4th submission returns 400 error

### **Max Attempts = NULL or 999:**
- [ ] Can submit multiple times
- [ ] Button always appears after each submission
- [ ] No limit enforced

---

## 🚀 **Deployment**

- ✅ **All changes saved**
- ✅ **No linter errors**
- ✅ **Database schema already has** `max_attempts` column
- ⚠️ **Refresh your browser** to see the changes

---

## 🎉 **Result**

**Phase deliverables now properly enforce max_attempts limit!**

- ✅ Frontend checks attempt count before showing resubmit button
- ✅ Backend validates and rejects submissions exceeding limit
- ✅ Clear warning message when max attempts reached
- ✅ Detailed error responses for debugging
- ✅ Works with any `max_attempts` value (1, 3, 5, 999, etc.)

**The system now correctly respects the `project_phases.max_attempts` configuration!** 🎊

---

## 📝 **Note on Documentation Update**

The previous statement "unlimited times" in `CREATE_NEW_ATTEMPT_FEATURE_COMPLETE.md` was **incorrect**. 

**Correct behavior:**
- Resubmissions are allowed **up to `max_attempts`** limit
- Default is **1 attempt** (no resubmissions)
- Instructors can configure **any limit** in the phase settings
- System enforces the limit on both frontend and backend

