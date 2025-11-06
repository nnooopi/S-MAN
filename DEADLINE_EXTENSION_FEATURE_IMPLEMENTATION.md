# Deadline Extension Request Feature - Implementation Complete

## Overview
This feature allows students to request deadline extensions for missed tasks, which can then be approved or rejected by their group leader.

## Database Implementation

### 1. Database Table Created: `task_extension_requests`
**File:** `create_task_extension_requests.sql`

**Table Structure:**
```sql
CREATE TABLE public.task_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
    
    -- Original deadline information
    original_due_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    original_available_until TIMESTAMP WITHOUT TIME ZONE,
    
    -- Request information
    reason TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- New deadline (set by leader upon approval)
    new_due_date TIMESTAMP WITHOUT TIME ZONE,
    new_available_until TIMESTAMP WITHOUT TIME ZONE,
    
    -- Request status and review
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.studentaccounts(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    leader_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes Created:**
- `idx_extension_requests_task_id`
- `idx_extension_requests_student_id`
- `idx_extension_requests_phase_id`
- `idx_extension_requests_project_id`
- `idx_extension_requests_group_id`
- `idx_extension_requests_status`
- `idx_extension_requests_reviewed_by`
- `idx_extension_requests_group_status` (composite)
- `idx_extension_requests_task_student` (composite)

**Row-Level Security (RLS) Policies:**
- Students can view their own extension requests
- Students can create extension requests for their own tasks
- Leaders can view and update all extension requests in their group
- Professors can view and update all extension requests in their courses

## Backend API Implementation

### API Endpoints Added to `server.js`:

#### 1. Create Extension Request (Student)
```javascript
POST /api/student/tasks/:taskId/request-extension
```
- **Auth:** Requires student authentication
- **Body:** `{ reason: string }`
- **Response:** Extension request object
- **Functionality:**
  - Validates student owns the task
  - Checks for existing pending requests
  - Creates extension request with 'pending' status
  - Updates task status to 'extension_requested'

#### 2. Get Student's Extension Requests
```javascript
GET /api/student/extension-requests
```
- **Auth:** Requires student authentication
- **Response:** Array of extension requests with task, phase, project, and reviewer details

#### 3. Get Group Extension Requests (Leader)
```javascript
GET /api/student/group/:groupId/extension-requests
```
- **Auth:** Requires leader authentication
- **Response:** Array of all extension requests for the group with full details

#### 4. Approve Extension Request (Leader)
```javascript
POST /api/student/extension-requests/:requestId/approve
```
- **Auth:** Requires leader authentication
- **Body:**
  ```json
  {
    "new_due_date": "2025-01-15T14:00:00",
    "new_available_until": "2025-01-15T23:59:00",
    "leader_notes": "Optional notes"
  }
  ```
- **Functionality:**
  - Validates leader has permission
  - Validates new dates are within phase boundaries
  - Updates extension request status to 'approved'
  - Updates task with new deadlines
  - Resets task status to 'pending' so student can submit

#### 5. Reject Extension Request (Leader)
```javascript
POST /api/student/extension-requests/:requestId/reject
```
- **Auth:** Requires leader authentication
- **Body:** `{ rejection_reason: string (optional) }`
- **Functionality:**
  - Validates leader has permission
  - Updates extension request status to 'rejected'
  - Updates task status back to 'missed'

## Frontend Implementation

### 1. TaskDetailModal Updates (`TaskDetailModal.js`)

**New Props:**
- `onRequestExtension`: Callback function to open extension request modal

**New Helper Functions:**
```javascript
// Check if task is missed (deadline passed with no submissions)
const isTaskMissed = () => {
  const now = new Date();
  const availableUntil = new Date(task.available_until);
  const hasNoSubmissions = !previousAttemptFiles?.attempts?.length;
  return now > availableUntil && hasNoSubmissions && task.status !== 'extension_requested';
};

// Check if task has extension requested
const hasExtensionRequested = () => {
  return task?.status === 'extension_requested';
};
```

**UI Changes:**
- **Submit Button Replacement:** When task is missed, "Submit" button is replaced with "Request Extension" button
- **Status Indicators:**
  - Red warning for missed tasks: "Task deadline has passed. You can request a deadline extension."
  - Yellow warning for pending extensions: "Extension request pending approval from your group leader."
- **Button States:**
  - "Request Extension" button (orange) - shown when task is missed
  - "Extension Requested" button (disabled, greyed) - shown when request is pending

### 2. CourseStudentDashboard Updates (`CourseStudentDashboard.js`)

**New State Variables:**
```javascript
const [showExtensionRequestModal, setShowExtensionRequestModal] = useState(false);
const [extensionRequestReason, setExtensionRequestReason] = useState('');
const [submittingExtensionRequest, setSubmittingExtensionRequest] = useState(false);
```

**New Handler Function:**
```javascript
const handleExtensionRequest = async () => {
  // Validates reason is provided
  // Submits extension request to backend
  // Shows success/error message
  // Refreshes tasks to reflect new status
  // Closes modals
};
```

**New Extension Request Modal:**
- **Header:** "Request Deadline Extension" with close button
- **Body:**
  - Task information display (title, original due date, available until)
  - Reason textarea (required, 500 char limit)
  - Character counter
- **Footer:**
  - Cancel button
  - Submit Request button (disabled until reason is provided)
- **Styling:** Professional modal with proper z-index, backdrop blur, and responsive design

### 3. Task Assignment Tab - Extension Requests Section ✅ COMPLETE

**Implementation Location:** `CourseStudentDashboard.js` - Task Assignment Section

**New Tab Button:** "Extension Requests" (4th button in the grid at line ~17940)
- Icon: `FaClipboardCheck`
- Active tab value: `'extensions'`
- Auto-loads extension requests when clicked
- Matches styling of other three buttons (Overview, Assign, Manage)

**Extension Requests State Management:**
```javascript
// Added to taskAssignmentView state
extensionRequests: [],
loadingExtensionRequests: false,
extensionStatusFilter: 'all',
showExtensionApprovalModal: false,
showExtensionRejectionModal: false,
selectedExtensionRequest: null,
approvalNewDueDate: '',
approvalNewAvailableUntil: '',
approvalLeaderNotes: '',
rejectionReason: '',
submittingExtension: false
```

**New Handler Functions (Lines 6551-6730):**
1. `loadExtensionRequests(groupId)` - Fetches all extension requests for the group
2. `handleExtensionRequestSelect(request)` - Opens approval modal with pre-filled dates
3. `handleExtensionRequestReject(request)` - Opens rejection modal
4. `handleApproveExtension()` - Validates and submits approval
5. `handleRejectExtension()` - Submits rejection

**Extension Requests View (Lines 19569-19873):**
- **Header:** Professional title with subtitle
- **Filter Controls:**
  - Status filter dropdown (All/Pending/Approved/Rejected)
  - Refresh button with loading state
- **Request List:**
  - Color-coded status badges (yellow=pending, green=approved, red=rejected)
  - Student name with profile indicator
  - Task title
  - Reason for extension in highlighted box
  - Original due date and request date
  - Approval/rejection details (when applicable)
  - Action buttons for pending requests (Approve/Reject)
- **Empty State:** Shows when no requests match filter

**Approval Modal (Lines 43603-43853):**
- **Header:** "Approve Extension Request" with green checkmark icon
- **Request Info Display:**
  - Student name
  - Task title
  - Original due date
  - Reason for extension
- **Phase Boundaries Warning:** Shows valid date range
- **Form Fields:**
  - New due date (datetime-local input, required)
  - New available until (datetime-local input, required)
  - Leader notes (textarea, optional, 500 char limit)
- **Validation:**
  - Dates must be within phase boundaries
  - Dates cannot be in the past
  - Available until >= due date
- **Actions:** Cancel / Approve Extension

**Rejection Modal (Lines 43855-44032):**
- **Header:** "Reject Extension Request" with red X icon
- **Request Info Display:** Similar to approval modal
- **Form Fields:**
  - Rejection reason (textarea, optional, 500 char limit)
- **Warning Message:** Notifies about student notification
- **Actions:** Cancel / Reject Request

**useEffect Hook (Lines 1554-1560):**
```javascript
// Auto-load extension requests when switching to extensions tab
useEffect(() => {
  if (taskAssignmentView.activeTab === 'extensions' && groupData?.id) {
    loadExtensionRequests(groupData.id);
  }
}, [taskAssignmentView.activeTab, groupData?.id]);
```

## User Flow

### Student Workflow:
1. Student views a task that has a missed deadline (in Project Dashboard → To-Do column)
2. Student clicks on the missed task card
3. Task Detail Modal opens showing:
   - Task is marked as "MISSED" status
   - Red warning: "Task deadline has passed. You can request a deadline extension."
   - "Submit" button is replaced with "Request Extension" button
4. Student clicks "Request Extension"
5. Extension Request Modal opens
6. Student enters reason for extension (required)
7. Student clicks "Submit Request"
8. Task status changes to "Req. Extension" (extension_requested)
9. Submit button becomes disabled and shows "Extension Requested"

### Leader Workflow:
1. Leader navigates to Task Assignment tab
2. Leader clicks on "Extension Requests" button
3. List of all pending extension requests from group members appears
4. Leader clicks "View" or "Review" on a specific request
5. Approval modal opens showing:
   - Task and student information
   - Reason for extension
   - Original deadline
   - Phase boundaries (start/end dates)
   - Date/time pickers for new deadlines
6. Leader sets new due date and available until date (must be within phase boundaries)
7. Leader can add optional notes
8. Leader clicks "Approve" or "Reject"
9. If approved:
   - Task deadlines are updated
   - Task status changes back to "pending"
   - Student can now submit the task
10. If rejected:
    - Task remains as "missed"
    - Student can see rejection reason

## Validation Rules

### Extension Request Creation:
- Reason must be provided and non-empty
- Student must own the task
- Cannot have multiple pending requests for the same task
- Task must be truly missed (no submissions and past deadline)

### Extension Approval:
- New due date and available until must be provided
- New dates must be within the phase boundaries
- New dates cannot be in the past
- Available until must be >= due date
- Only group leader can approve
- Phase must still be active

### Extension Rejection:
- Only group leader can reject
- Rejection reason is optional

## Database Schema Integration

The `task_extension_requests` table integrates with existing tables:
- **tasks:** References task being extended
- **studentaccounts:** References both requester and reviewer
- **project_phases:** Ensures phase context and boundary validation
- **projects:** Maintains project association
- **course_groups:** Links to group for leader permission checks

## Status Flow

**Task Status Changes:**
1. `pending` → User has not submitted yet
2. `missed` → Deadline passed with no submission
3. `extension_requested` → Student requested extension
4. `pending` (after approval) → Extension approved, student can submit
5. `missed` (after rejection) → Extension rejected, remains missed

**Extension Request Status:**
1. `pending` → Waiting for leader review
2. `approved` → Leader approved with new deadline
3. `rejected` → Leader rejected the request

## Implementation Completion Status

### ✅ COMPLETED TASKS:

1. **Database Schema** ✅
   - Created `task_extension_requests` table
   - Added 9 indexes for optimal performance
   - Implemented 6 RLS policies for security

2. **Backend API Endpoints** ✅
   - POST /api/student/tasks/:taskId/request-extension
   - GET /api/student/extension-requests
   - GET /api/student/group/:groupId/extension-requests
   - POST /api/student/extension-requests/:requestId/approve
   - POST /api/student/extension-requests/:requestId/reject

3. **Student-Facing Frontend** ✅
   - TaskDetailModal updated with extension request button
   - Extension request modal with reason textarea
   - Task status indicators (missed, extension pending)
   - handleExtensionRequest() function implemented

4. **Leader-Facing Frontend** ✅
   - Extension Requests tab added to Task Assignment (4th button)
   - Extension requests list view with filtering
   - Approval modal with date pickers and validation
   - Rejection modal with optional reason
   - Auto-load extension requests on tab switch
   - All handler functions implemented

### Testing Checklist
- [ ] Student can view missed tasks
- [ ] Student can request extension with reason
- [ ] Extension request creates proper database entry
- [ ] Task status updates to 'extension_requested'
- [ ] Leader can view all extension requests
- [ ] Leader can approve with valid dates
- [ ] Leader cannot approve with dates outside phase
- [ ] Leader can reject with optional reason
- [ ] Approved extension updates task deadlines
- [ ] Student can submit after approval
- [ ] Multiple requests for same task are prevented

## SQL Execution Instructions

1. Connect to your Supabase database
2. Run the `create_task_extension_requests.sql` file
3. Verify table creation:
   ```sql
   SELECT * FROM public.task_extension_requests LIMIT 1;
   ```
4. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'task_extension_requests';
   ```

## Files Modified/Created

### Created:
1. `create_task_extension_requests.sql` - Database schema and RLS policies
2. `DEADLINE_EXTENSION_FEATURE_IMPLEMENTATION.md` - This documentation

### Modified:
1. `backend/server.js` - Added 5 new API endpoints for extension requests
2. `frontend/src/components/TaskDetailModal.js` - Added extension request button and modals
3. `frontend/src/components/CourseStudentDashboard.js` - Added extension request modal and handler

### To Be Modified (Next Phase):
1. `frontend/src/components/CourseStudentDashboard.js` - Add Extension Requests tab to Task Assignment section

## Dependencies

No new dependencies required. Uses existing:
- React hooks (useState, useEffect)
- React Icons (FaHourglassHalf for pending status)
- Existing authentication middleware
- Existing Supabase client

## Security Considerations

- RLS policies ensure students can only request extensions for their own tasks
- Leaders can only approve/reject extensions for their own group
- Date validation prevents setting deadlines outside phase boundaries
- Prevents backdating or invalid deadline changes
- Audit trail maintained through created_at, updated_at, reviewed_by fields

---

## 🎉 FEATURE STATUS: FULLY COMPLETE

**Status:** ✅ Backend Complete | ✅ Student Frontend Complete | ✅ Leader Frontend Complete

**Implementation Summary:**
- **Database:** Full schema with RLS policies
- **Backend:** 5 API endpoints with validation
- **Student UI:** Extension request modal and button
- **Leader UI:** Full extension management interface with approval/rejection
- **Auto-loading:** useEffect hook for seamless tab switching

**Next Steps:**
1. Execute `create_task_extension_requests.sql` in Supabase
2. Test full workflow end-to-end
3. Monitor for any edge cases or UX improvements

**Last Updated:** January 2025
