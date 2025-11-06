# 📅 Deadline Extension Request System - Implementation Guide

## Overview
This system allows students to request deadline extensions for missed tasks, which then appear in the leader's Request tab for approval/denial.

---

## 🗄️ Database Setup

### 1. Create Extension Requests Table
```sql
-- Run this first
\i backend/sql/task_deadline_extensions.sql
```

### 2. Add Extension Tracking to Tasks Table
```sql
-- Then run this
\i backend/sql/ALTER_tasks_for_extensions.sql
```

### 3. Verify Tables
```sql
-- Check task_deadline_extension_requests table
SELECT * FROM task_deadline_extension_requests LIMIT 1;

-- Check tasks.extension_count column
SELECT id, title, extension_count FROM tasks LIMIT 5;
```

---

## 📊 Database Schema

### New Table: `task_deadline_extension_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `task_id` | UUID | References tasks.id (CASCADE) |
| `requested_by` | UUID | References studentaccounts.id |
| `reviewed_by` | UUID | References studentaccounts.id (leader) |
| `request_reason` | TEXT | Student's reason for extension |
| `request_date` | TIMESTAMP | When request was made |
| `original_due_date` | TIMESTAMP | Original deadline |
| `original_available_until` | TIMESTAMP | Original available until |
| `new_due_date` | TIMESTAMP | New deadline (if approved) |
| `new_available_until` | TIMESTAMP | New available until (if approved) |
| `status` | VARCHAR(50) | 'pending', 'approved', 'denied' |
| `review_date` | TIMESTAMP | When leader reviewed |
| `review_reason` | TEXT | Leader's reason for denial |
| `extension_attempt_number` | INTEGER | 1st, 2nd, 3rd extension, etc. |

### Modified Table: `tasks`

| New Column | Type | Description |
|------------|------|-------------|
| `extension_count` | INTEGER | Number of approved extensions |

---

## 🔄 Complete Workflow

### Student Side (Project Dashboard - Missed Tasks)

```
1. Task is Missed (due_date < now() && no submission)
   ↓
2. Task appears in "To-Do" with "MISSED" indicator
   ↓
3. Student clicks on missed task
   ↓
4. Modal opens with:
   - Task details (read-only)
   - Submit button is REPLACED with "Request Deadline Extension"
   - New field: "Reason for Extension Request" (required)
   ↓
5. Student fills reason and clicks "Request Extension"
   ↓
6. Button becomes disabled
   ↓
7. Shows indicator: "⏳ Waiting for leader decision..."
   ↓
8. Request is sent to database (status = 'pending')
```

### Leader Side (Task Assignment - Requests Tab)

```
1. Leader navigates to Task Assignment → Requests Tab
   ↓
2. Sees list of extension request cards showing:
   - Member name + profile picture
   - Task title
   - Request date
   - Badge: "Extension Request"
   ↓
3. Leader clicks on a request card
   ↓
4. Modal opens showing:

   HEADER:
   - Member Name
   - Task Title
   - Request Date

   SECTION 1: Request Details
   - "Reason for Extension": <student's reason>
   - Original Due Date: <date> (read-only)
   - Original Available Until: <date> (read-only)

   SECTION 2: Decision
   - [Approve Button]  [Deny Button]

   IF DENY CLICKED:
   - "Reason for Denial" field appears (required)
   - [Save Decision] button

   IF APPROVE CLICKED:
   - Four date/time fields appear:
     1. Original Due Date (read-only, gray)
     2. Original Available Until (read-only, gray)
     3. New Due Date (DateTimePicker, required)
     4. New Available Until (DateTimePicker, optional)
   - [Save Extension] button

   ↓
5. Leader saves decision
   ↓
6. Database updates:
   - task_deadline_extension_requests.status = 'approved'/'denied'
   - task_deadline_extension_requests.review_date = NOW()
   - task_deadline_extension_requests.reviewed_by = leader_id
   - If approved:
     - tasks.due_date = new_due_date
     - tasks.available_until = new_available_until
     - tasks.extension_count += 1
```

---

## 🔧 Backend API Endpoints

### 1. **POST /api/tasks/:taskId/request-extension**
Student requests deadline extension

**Request Body:**
```json
{
  "request_reason": "I was sick and couldn't complete the task on time"
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "message": "Extension request submitted successfully",
  "request": {
    "id": "uuid",
    "task_id": "uuid",
    "status": "pending",
    "extension_attempt_number": 1
  }
}
```

---

### 2. **GET /api/student-leader/extension-requests**
Leader gets all pending extension requests for their tasks

**Query Params:**
- `status` (optional): 'pending', 'approved', 'denied', 'all'
- `project_id` (optional): filter by project

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "task_title": "Create ERD Diagram",
      "task_description": "...",
      "requested_by": "uuid",
      "student_name": "John Doe",
      "student_profile_image": "url",
      "request_reason": "I was sick",
      "request_date": "2024-01-15T10:30:00Z",
      "original_due_date": "2024-01-10T23:59:00",
      "original_available_until": "2024-01-12T23:59:00",
      "status": "pending",
      "extension_attempt_number": 1
    }
  ]
}
```

---

### 3. **PUT /api/student-leader/extension-requests/:requestId/approve**
Leader approves extension request

**Request Body:**
```json
{
  "new_due_date": "2024-01-20T23:59:00",
  "new_available_until": "2024-01-22T23:59:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extension request approved",
  "task_updated": true
}
```

**Backend Logic:**
1. Validate leader owns the task
2. Update extension request: status='approved', review_date=NOW()
3. Update task: due_date=new_due_date, available_until=new_available_until
4. Increment task.extension_count
5. Send notification to student

---

### 4. **PUT /api/student-leader/extension-requests/:requestId/deny**
Leader denies extension request

**Request Body:**
```json
{
  "review_reason": "Deadline already passed by too long, please prioritize better next time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extension request denied"
}
```

**Backend Logic:**
1. Validate leader owns the task
2. Update extension request: status='denied', review_reason, review_date=NOW()
3. Send notification to student

---

### 5. **GET /api/tasks/:taskId/extension-status**
Check if student has pending extension request

**Response:**
```json
{
  "has_pending_request": true,
  "request": {
    "id": "uuid",
    "status": "pending",
    "request_date": "2024-01-15T10:30:00Z"
  }
}
```

---

## 💻 Frontend Implementation

### Student Side: Missed Task Modal

**File:** `CourseStudentDashboard.js` → Task Detail Modal

**Changes Needed:**

1. **Detect if task is missed:**
```javascript
const isTaskMissed = () => {
  const now = new Date();
  const dueDate = new Date(selectedTask.due_date);
  const hasSubmission = selectedTask.status !== 'pending';

  return dueDate < now && !hasSubmission;
};
```

2. **Check for pending extension request:**
```javascript
const [extensionRequest, setExtensionRequest] = useState(null);
const [loadingExtension, setLoadingExtension] = useState(false);

useEffect(() => {
  if (selectedTask && isTaskMissed()) {
    fetchExtensionStatus(selectedTask.id);
  }
}, [selectedTask]);

const fetchExtensionStatus = async (taskId) => {
  const response = await fetch(
    `${apiConfig.baseURL}/api/tasks/${taskId}/extension-status`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  setExtensionRequest(data.has_pending_request ? data.request : null);
};
```

3. **Replace Submit Button with Extension Request:**
```jsx
{isTaskMissed() ? (
  extensionRequest ? (
    // Show waiting status
    <div style={{
      padding: '16px',
      backgroundColor: '#FEF3C7',
      border: '2px solid #F59E0B',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <FaClock style={{ fontSize: '24px', color: '#D97706', marginBottom: '8px' }} />
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400E' }}>
        ⏳ Extension Request Pending
      </div>
      <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px' }}>
        Waiting for leader decision...
      </div>
      <div style={{ fontSize: '11px', color: '#B45309', marginTop: '8px' }}>
        Requested on: {new Date(extensionRequest.request_date).toLocaleString()}
      </div>
    </div>
  ) : (
    // Show extension request form
    <>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#09122C',
          marginBottom: '8px'
        }}>
          Reason for Extension Request <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          value={extensionReason}
          onChange={(e) => setExtensionReason(e.target.value)}
          rows={4}
          placeholder="Explain why you need a deadline extension..."
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #E9ECEF',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      <button
        onClick={handleRequestExtension}
        disabled={!extensionReason.trim() || submittingExtension}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: extensionReason.trim() ? '#F59E0B' : '#D1D5DB',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: extensionReason.trim() ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {submittingExtension ? <FaSpinner className="spinning" /> : <FaClock />}
        Request Deadline Extension
      </button>
    </>
  )
) : (
  // Regular submit button for non-missed tasks
  <button onClick={handleSubmit}>Submit Task</button>
)}
```

4. **Handle Extension Request Submission:**
```javascript
const [extensionReason, setExtensionReason] = useState('');
const [submittingExtension, setSubmittingExtension] = useState(false);

const handleRequestExtension = async () => {
  if (!extensionReason.trim()) {
    alert('Please provide a reason for the extension request');
    return;
  }

  try {
    setSubmittingExtension(true);

    const response = await fetch(
      `${apiConfig.baseURL}/api/tasks/${selectedTask.id}/request-extension`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_reason: extensionReason
        })
      }
    );

    if (!response.ok) throw new Error('Failed to submit extension request');

    const data = await response.json();

    alert('Extension request submitted successfully!');
    setExtensionRequest(data.request);
    setExtensionReason('');

  } catch (error) {
    console.error('Error submitting extension request:', error);
    alert('Failed to submit extension request. Please try again.');
  } finally {
    setSubmittingExtension(false);
  }
};
```

---

### Leader Side: Requests Tab Implementation

**File:** `CourseStudentDashboard.js` → Task Assignment → Requests Tab

**1. Add state for extension requests:**
```javascript
const [extensionRequests, setExtensionRequests] = useState([]);
const [loadingExtensionRequests, setLoadingExtensionRequests] = useState(false);
const [selectedExtensionRequest, setSelectedExtensionRequest] = useState(null);
const [showExtensionModal, setShowExtensionModal] = useState(false);
```

**2. Fetch extension requests:**
```javascript
const fetchExtensionRequests = async (projectId) => {
  try {
    setLoadingExtensionRequests(true);
    const token = localStorage.getItem('token');

    const response = await fetch(
      `${apiConfig.baseURL}/api/student-leader/extension-requests?project_id=${projectId}&status=pending`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error('Failed to load extension requests');

    const data = await response.json();
    setExtensionRequests(data.requests || []);

  } catch (error) {
    console.error('Error fetching extension requests:', error);
    setExtensionRequests([]);
  } finally {
    setLoadingExtensionRequests(false);
  }
};
```

**3. Requests Tab UI:**
```jsx
{taskAssignmentView.activeTab === 'requests' && (
  <div style={{ padding: '24px' }}>
    <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '24px' }}>
      Extension Requests
    </h3>

    {loadingExtensionRequests ? (
      <div>Loading requests...</div>
    ) : extensionRequests.length === 0 ? (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '16px'
      }}>
        <FaInbox style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px' }} />
        <h4 style={{ fontSize: '18px', color: '#D1D5DB' }}>No Pending Requests</h4>
        <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
          Extension requests will appear here
        </p>
      </div>
    ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {extensionRequests.map(request => (
          <div
            key={request.id}
            onClick={() => {
              setSelectedExtensionRequest(request);
              setShowExtensionModal(true);
            }}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              border: '2px solid #E9ECEF',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Member Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#872341',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '600',
                marginRight: '12px'
              }}>
                {request.student_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#09122C' }}>
                  {request.student_name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {new Date(request.request_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Badge */}
            <div style={{
              display: 'inline-block',
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              color: '#92400E',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              Extension Request #{request.extension_attempt_number}
            </div>

            {/* Task Title */}
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#09122C',
              marginBottom: '8px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {request.task_title}
            </div>

            {/* Reason Preview */}
            <div style={{
              fontSize: '13px',
              color: '#6B7280',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              "{request.request_reason}"
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**4. Extension Request Review Modal:**
```jsx
{showExtensionModal && selectedExtensionRequest && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  }}
  onClick={() => setShowExtensionModal(false)}
  >
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #F3F4F6'
      }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#09122C', margin: '0 0 8px 0' }}>
            Extension Request Review
          </h3>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            {selectedExtensionRequest.student_name} • {selectedExtensionRequest.task_title}
          </div>
        </div>
        <button
          onClick={() => setShowExtensionModal(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            color: '#6B7280',
            cursor: 'pointer'
          }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Request Details */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#09122C', marginBottom: '8px' }}>
          Student's Reason:
        </h4>
        <div style={{
          padding: '12px',
          backgroundColor: '#F8F9FA',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#09122C',
          lineHeight: '1.6'
        }}>
          {selectedExtensionRequest.request_reason}
        </div>
      </div>

      {/* Original Deadlines */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
            Original Due Date
          </label>
          <div style={{
            padding: '10px',
            backgroundColor: '#F3F4F6',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#6B7280'
          }}>
            {new Date(selectedExtensionRequest.original_due_date).toLocaleString()}
          </div>
        </div>

        {selectedExtensionRequest.original_available_until && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
              Original Available Until
            </label>
            <div style={{
              padding: '10px',
              backgroundColor: '#F3F4F6',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#6B7280'
            }}>
              {new Date(selectedExtensionRequest.original_available_until).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Decision Buttons or Form */}
      {!reviewDecision ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setReviewDecision('approve')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FaCheckCircle /> Approve Extension
          </button>

          <button
            onClick={() => setReviewDecision('deny')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FaTimes /> Deny Request
          </button>
        </div>
      ) : reviewDecision === 'deny' ? (
        // Denial Form
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#09122C', marginBottom: '8px', display: 'block' }}>
            Reason for Denial <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            rows={3}
            placeholder="Explain why you're denying this request..."
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #E9ECEF',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              marginBottom: '12px'
            }}
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDenyExtension}
              disabled={!denialReason.trim()}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: denialReason.trim() ? '#EF4444' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: denialReason.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Confirm Denial
            </button>

            <button
              onClick={() => setReviewDecision(null)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Approval Form
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#09122C', marginBottom: '12px' }}>
            Set New Deadlines:
          </h4>

          <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#09122C', marginBottom: '8px', display: 'block' }}>
                New Due Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  value={newDueDate}
                  onChange={(val) => setNewDueDate(val)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#09122C', marginBottom: '8px', display: 'block' }}>
                New Available Until (Optional)
              </label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  value={newAvailableUntil}
                  onChange={(val) => setNewAvailableUntil(val)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleApproveExtension}
              disabled={!newDueDate}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: newDueDate ? '#10B981' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: newDueDate ? 'pointer' : 'not-allowed'
              }}
            >
              Save Extension
            </button>

            <button
              onClick={() => setReviewDecision(null)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

**5. Handle Approval/Denial:**
```javascript
const [reviewDecision, setReviewDecision] = useState(null); // 'approve' or 'deny'
const [denialReason, setDenialReason] = useState('');
const [newDueDate, setNewDueDate] = useState(null);
const [newAvailableUntil, setNewAvailableUntil] = useState(null);

const handleApproveExtension = async () => {
  if (!newDueDate) {
    alert('Please set a new due date');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${apiConfig.baseURL}/api/student-leader/extension-requests/${selectedExtensionRequest.id}/approve`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_due_date: newDueDate.toISOString(),
          new_available_until: newAvailableUntil ? newAvailableUntil.toISOString() : null
        })
      }
    );

    if (!response.ok) throw new Error('Failed to approve extension');

    alert('Extension approved successfully!');
    setShowExtensionModal(false);
    fetchExtensionRequests(taskAssignmentView.selectedProject.id);

  } catch (error) {
    console.error('Error approving extension:', error);
    alert('Failed to approve extension. Please try again.');
  }
};

const handleDenyExtension = async () => {
  if (!denialReason.trim()) {
    alert('Please provide a reason for denial');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${apiConfig.baseURL}/api/student-leader/extension-requests/${selectedExtensionRequest.id}/deny`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          review_reason: denialReason
        })
      }
    );

    if (!response.ok) throw new Error('Failed to deny extension');

    alert('Extension request denied');
    setShowExtensionModal(false);
    fetchExtensionRequests(taskAssignmentView.selectedProject.id);

  } catch (error) {
    console.error('Error denying extension:', error);
    alert('Failed to deny extension. Please try again.');
  }
};
```

---

## 📝 Business Rules to Implement

1. **Student Cannot Request Extension If:**
   - Task is already approved/completed
   - Task has a pending extension request
   - Phase has already ended (optional - make configurable)

2. **Leader Can Only:**
   - Review extension requests for tasks they assigned
   - Approve extension once per request
   - Set new due date that is in the future

3. **Extension Limits:**
   - Consider max 3 extensions per task (configurable)
   - Show extension count in UI

4. **Notifications:**
   - Notify student when request is approved/denied
   - Notify leader when new request is submitted

---

## ✅ Testing Checklist

- [ ] Student can request extension for missed task
- [ ] Student cannot request extension if already has pending request
- [ ] Request appears in leader's Request tab
- [ ] Leader can approve extension
- [ ] Task deadline updates correctly when approved
- [ ] Extension count increments
- [ ] Leader can deny extension with reason
- [ ] Student sees "Waiting for decision" status
- [ ] Student cannot submit missed task without extension
- [ ] Extension attempt number increments correctly

---

## 🚀 Deployment Steps

1. Run database migrations
2. Test endpoints with Postman/Thunder Client
3. Implement frontend UI
4. Test complete workflow
5. Add notifications (optional)
6. Deploy to production

---

## 📌 Notes

- Keep track of extension_attempt_number for analytics
- Consider adding email notifications for extension decisions
- Add logging for audit trail
- Consider adding max extension limit per task
- Add extension history view for students
