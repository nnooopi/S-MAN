# Deadline Extension Request System - Implementation Guide

## Overview
This document provides a comprehensive guide for implementing the deadline extension request feature in the S-MAN system, allowing students to request deadline extensions for missed tasks and group leaders to approve/reject them.

---

## 📋 Table of Contents
1. [Database Schema](#database-schema)
2. [Backend API Endpoints](#backend-api-endpoints)
3. [Frontend Implementation](#frontend-implementation)
4. [Workflow Overview](#workflow-overview)
5. [Testing Checklist](#testing-checklist)

---

## 🗄️ Database Schema

### Table: `task_extension_requests`

**Location**: Run `create_extension_requests_table.sql` in Supabase SQL Editor

**Key Features**:
- Tracks extension requests with full audit trail
- Enforces phase boundary validation
- Links to tasks, students, groups, projects, and phases
- Stores original and new deadlines
- Supports approval/rejection with reasons

**Important Columns**:
- `status`: `'pending'`, `'approved'`, `'rejected'`
- `new_due_date` & `new_available_until`: Set by leader upon approval
- `original_due_date` & `original_available_until`: Preserved for reference
- `reviewed_by`: Leader who approved/rejected
- `rejection_reason`: Optional explanation for rejection

**RLS Policies**:
- Students can view/create their own requests
- Leaders can view/update requests for their group
- Service role has full access

---

## 🔌 Backend API Endpoints

All endpoints added to `backend/server.js`

### 1. **Submit Extension Request** (Student)
```
POST /api/student/tasks/:taskId/extension-request
```
**Body**:
```json
{
  "reason": "string (required)"
}
```
**Response**:
```json
{
  "message": "Extension request submitted successfully",
  "request": { ...extensionRequestObject }
}
```

**Validations**:
- Student must own the task
- No duplicate pending requests
- Student must be in a valid group

---

### 2. **Get Extension Request Status** (Student)
```
GET /api/student/tasks/:taskId/extension-request
```
**Response**:
```json
{
  "request": {
    "id": "uuid",
    "status": "pending|approved|rejected",
    "reason": "string",
    "new_due_date": "timestamp",
    "rejection_reason": "string",
    ...
  }
}
```

---

### 3. **Get All Extension Requests** (Leader)
```
GET /api/leader/projects/:projectId/extension-requests?status=pending
```
**Query Params**:
- `status`: `'pending'`, `'approved'`, `'rejected'`, or `'all'`

**Response**:
```json
{
  "requests": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "student_id": "uuid",
      "reason": "string",
      "status": "pending",
      "requested_at": "timestamp",
      "tasks": { "title": "...", "due_date": "..." },
      "studentaccounts": { "name": "...", "email": "..." },
      "phases": { "phase_number": 1, "start_date": "...", "end_date": "..." }
    }
  ]
}
```

---

### 4. **Approve/Reject Extension Request** (Leader)
```
PUT /api/leader/extension-requests/:requestId
```
**Body (Approve)**:
```json
{
  "action": "approve",
  "new_due_date": "2025-01-05T23:59:59+08:00",
  "new_available_until": "2025-01-05T23:59:59+08:00"
}
```

**Body (Reject)**:
```json
{
  "action": "reject",
  "rejection_reason": "Optional explanation"
}
```

**Response**:
```json
{
  "message": "Extension request approved successfully",
  "request": { ...updatedRequest }
}
```

**Validations**:
- New dates must be within phase boundaries
- `available_until` must be after `due_date`
- Only pending requests can be reviewed
- Only group leaders can approve/reject

**Side Effects (on approval)**:
- Updates `tasks` table with new deadlines
- Resets task status to `'not_started'`

---

### 5. **Get Extension Request Counts** (Leader)
```
GET /api/leader/projects/:projectId/extension-requests/count
```
**Response**:
```json
{
  "pending": 5,
  "total": 12
}
```
**Use Case**: Display badge count on "Extension Requests" tab

---

## 🎨 Frontend Implementation

### **File to Modify**: `CourseStudentDashboard.js`

---

## 📝 Step-by-Step Frontend Changes

### **STEP 1: Add State Variables**

Add these states at the top of the component:

```javascript
// Extension Request States
const [showExtensionRequestModal, setShowExtensionRequestModal] = useState(false);
const [extensionReason, setExtensionReason] = useState('');
const [submittingExtension, setSubmittingExtension] = useState(false);
const [selectedTaskForExtension, setSelectedTaskForExtension] = useState(null);

// Leader Extension Request States
const [extensionRequests, setExtensionRequests] = useState([]);
const [extensionRequestsLoading, setExtensionRequestsLoading] = useState(false);
const [selectedExtensionRequest, setSelectedExtensionRequest] = useState(null);
const [showExtensionApprovalModal, setShowExtensionApprovalModal] = useState(false);
const [extensionApprovalForm, setExtensionApprovalForm] = useState({
  new_due_date: '',
  new_due_time: '',
  new_available_until_date: '',
  new_available_until_time: ''
});
const [approvingExtension, setApprovingExtension] = useState(false);
const [extensionRequestFilter, setExtensionRequestFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
```

---

### **STEP 2: Update Task Modal for Missed Tasks**

**Location**: Inside the task detail modal (where task submission UI is shown)

**Changes**:
1. Check if task status is `'missed'`
2. Check if there's already an extension request
3. Show "Request Extension" button instead of "Submit" button

**Code to Add**:

```javascript
// Inside the task modal, add this useEffect to fetch extension status
useEffect(() => {
  if (showTaskModal && selectedTask && selectedTask.status === 'missed') {
    fetchExtensionStatus(selectedTask.id);
  }
}, [showTaskModal, selectedTask]);

// Function to fetch extension status
const fetchExtensionStatus = async (taskId) => {
  try {
    const token = localStorage.getItem('studentToken');
    const response = await fetch(`http://localhost:5000/api/student/tasks/${taskId}/extension-request`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.request) {
      // Update task with extension request status
      setSelectedTask(prev => ({
        ...prev,
        extensionRequest: data.request
      }));
    }
  } catch (error) {
    console.error('Error fetching extension status:', error);
  }
};
```

**Replace Submit Button Section**:

Find the submit button in the task modal and replace with:

```javascript
{selectedTask?.status === 'missed' ? (
  <div className="extension-request-section">
    {selectedTask.extensionRequest ? (
      // Show extension request status
      <div className={`extension-status-badge status-${selectedTask.extensionRequest.status}`}>
        {selectedTask.extensionRequest.status === 'pending' && (
          <>
            <FaClock /> Extension Pending Review
          </>
        )}
        {selectedTask.extensionRequest.status === 'approved' && (
          <>
            <FaCheck /> Extension Approved - New Due Date: {new Date(selectedTask.extensionRequest.new_due_date).toLocaleDateString()}
          </>
        )}
        {selectedTask.extensionRequest.status === 'rejected' && (
          <>
            <FaTimes /> Extension Rejected
            {selectedTask.extensionRequest.rejection_reason && (
              <p className="rejection-reason">Reason: {selectedTask.extensionRequest.rejection_reason}</p>
            )}
          </>
        )}
      </div>
    ) : (
      // Show request extension button
      <button
        className="request-extension-button"
        onClick={() => {
          setSelectedTaskForExtension(selectedTask);
          setShowExtensionRequestModal(true);
        }}
      >
        <FaClock /> Request Extension
      </button>
    )}
  </div>
) : (
  // Original submit button for non-missed tasks
  <button className="submit-task-button" onClick={handleSubmitTask}>
    Submit Task
  </button>
)}
```

---

### **STEP 3: Create Extension Request Modal (Student)**

Add this modal component after the task detail modal:

```javascript
{/* Extension Request Modal */}
{showExtensionRequestModal && (
  <div className="modal-overlay" onClick={() => !submittingExtension && setShowExtensionRequestModal(false)}>
    <div className="modal-content extension-request-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Request Deadline Extension</h2>
        <button
          className="modal-close-button"
          onClick={() => setShowExtensionRequestModal(false)}
          disabled={submittingExtension}
        >
          <FaTimes />
        </button>
      </div>

      <div className="modal-body">
        <div className="task-info-section">
          <h3>{selectedTaskForExtension?.title}</h3>
          <p className="task-meta">
            <FaClock /> Original Due: {selectedTaskForExtension?.due_date ? new Date(selectedTaskForExtension.due_date).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="extension-reason">
            Reason for Extension Request <span className="required">*</span>
          </label>
          <textarea
            id="extension-reason"
            className="extension-reason-textarea"
            placeholder="Please explain why you need a deadline extension..."
            value={extensionReason}
            onChange={(e) => setExtensionReason(e.target.value)}
            rows={6}
            disabled={submittingExtension}
            maxLength={1000}
          />
          <small className="char-count">{extensionReason.length}/1000 characters</small>
        </div>

        <div className="info-notice">
          <FaInfoCircle />
          <p>Your group leader will review this request and decide whether to approve a new deadline.</p>
        </div>
      </div>

      <div className="modal-footer">
        <button
          className="cancel-button"
          onClick={() => setShowExtensionRequestModal(false)}
          disabled={submittingExtension}
        >
          Cancel
        </button>
        <button
          className="submit-extension-button"
          onClick={handleSubmitExtensionRequest}
          disabled={submittingExtension || extensionReason.trim().length === 0}
        >
          {submittingExtension ? (
            <>
              <div className="spinner-small"></div> Submitting...
            </>
          ) : (
            <>
              <FaPaperPlane /> Submit Request
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

**Handler Function**:

```javascript
const handleSubmitExtensionRequest = async () => {
  if (!selectedTaskForExtension || extensionReason.trim().length === 0) {
    alert('Please provide a reason for the extension request');
    return;
  }

  setSubmittingExtension(true);

  try {
    const token = localStorage.getItem('studentToken');
    const response = await fetch(
      `http://localhost:5000/api/student/tasks/${selectedTaskForExtension.id}/extension-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: extensionReason.trim() })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit extension request');
    }

    alert('Extension request submitted successfully! Your group leader will review it.');
    
    // Update task card with "Req. Extension" status
    setMyTasks(prevTasks => prevTasks.map(task => 
      task.id === selectedTaskForExtension.id 
        ? { ...task, status: 'extension_requested', extensionRequest: data.request }
        : task
    ));

    // Close modals and reset
    setShowExtensionRequestModal(false);
    setShowTaskModal(false);
    setExtensionReason('');
    setSelectedTaskForExtension(null);

    // Refresh task data
    if (selectedProject) {
      await loadProjectTasks(selectedProject.id);
    }

  } catch (error) {
    console.error('Error submitting extension request:', error);
    alert(error.message || 'Failed to submit extension request');
  } finally {
    setSubmittingExtension(false);
  }
};
```

---

### **STEP 4: Update Task Card Status Display**

Find the task status rendering logic and add the new status:

```javascript
const getTaskStatusBadge = (task) => {
  // Check for extension request
  if (task.extensionRequest?.status === 'pending') {
    return (
      <div className="task-status-badge status-extension-pending">
        <FaClock /> Req. Extension
      </div>
    );
  }

  // Existing status logic...
  switch (task.status) {
    case 'completed':
      return <div className="task-status-badge status-completed"><FaCheck /> Completed</div>;
    case 'missed':
      return <div className="task-status-badge status-missed"><FaTimes /> Missed</div>;
    // ... other cases
  }
};
```

---

### **STEP 5: Add "Extension Requests" Tab (Leader)**

**Location**: Task Assignment section (where Overview, Assign, Manage buttons are)

**Update Navigation Buttons**:

```javascript
{userRole === 'leader' && activeTab === 'task-assignment' && (
  <div className="task-assignment-tabs">
    <button
      className={`tab-button ${taskAssignmentView.activeTab === 'overview' ? 'active' : ''}`}
      onClick={() => setTaskAssignmentView(prev => ({ ...prev, activeTab: 'overview' }))}
    >
      <FaList /> Overview
    </button>
    <button
      className={`tab-button ${taskAssignmentView.activeTab === 'assign' ? 'active' : ''}`}
      onClick={() => setTaskAssignmentView(prev => ({ ...prev, activeTab: 'assign' }))}
    >
      <FaPlus /> Assign
    </button>
    <button
      className={`tab-button ${taskAssignmentView.activeTab === 'manage' ? 'active' : ''}`}
      onClick={() => setTaskAssignmentView(prev => ({ ...prev, activeTab: 'manage' }))}
    >
      <FaEdit /> Manage
    </button>
    <button
      className={`tab-button ${taskAssignmentView.activeTab === 'extensions' ? 'active' : ''}`}
      onClick={() => {
        setTaskAssignmentView(prev => ({ ...prev, activeTab: 'extensions' }));
        loadExtensionRequests();
      }}
    >
      <FaClock /> Extension Requests
      {extensionRequests.filter(r => r.status === 'pending').length > 0 && (
        <span className="badge-count">
          {extensionRequests.filter(r => r.status === 'pending').length}
        </span>
      )}
    </button>
  </div>
)}
```

---

### **STEP 6: Create Extension Requests Tab Content**

```javascript
{/* Extension Requests Tab */}
{userRole === 'leader' && taskAssignmentView.activeTab === 'extensions' && (
  <div className="extension-requests-container">
    {/* Filter Buttons */}
    <div className="extension-filters">
      <button
        className={`filter-btn ${extensionRequestFilter === 'pending' ? 'active' : ''}`}
        onClick={() => setExtensionRequestFilter('pending')}
      >
        Pending ({extensionRequests.filter(r => r.status === 'pending').length})
      </button>
      <button
        className={`filter-btn ${extensionRequestFilter === 'approved' ? 'active' : ''}`}
        onClick={() => setExtensionRequestFilter('approved')}
      >
        Approved ({extensionRequests.filter(r => r.status === 'approved').length})
      </button>
      <button
        className={`filter-btn ${extensionRequestFilter === 'rejected' ? 'active' : ''}`}
        onClick={() => setExtensionRequestFilter('rejected')}
      >
        Rejected ({extensionRequests.filter(r => r.status === 'rejected').length})
      </button>
      <button
        className={`filter-btn ${extensionRequestFilter === 'all' ? 'active' : ''}`}
        onClick={() => setExtensionRequestFilter('all')}
      >
        All ({extensionRequests.length})
      </button>
    </div>

    {/* Extension Requests List */}
    {extensionRequestsLoading ? (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading extension requests...</p>
      </div>
    ) : (
      <div className="extension-requests-list">
        {extensionRequests
          .filter(req => extensionRequestFilter === 'all' || req.status === extensionRequestFilter)
          .map(request => (
            <div key={request.id} className={`extension-request-card status-${request.status}`}>
              <div className="request-header">
                <div className="student-info">
                  <div className="avatar-circle">
                    {request.studentaccounts?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4>{request.studentaccounts?.name}</h4>
                    <p className="student-email">{request.studentaccounts?.email}</p>
                  </div>
                </div>
                <div className={`status-badge status-${request.status}`}>
                  {request.status === 'pending' && <><FaClock /> Pending</>}
                  {request.status === 'approved' && <><FaCheck /> Approved</>}
                  {request.status === 'rejected' && <><FaTimes /> Rejected</>}
                </div>
              </div>

              <div className="request-details">
                <h5 className="task-title">
                  <FaClipboardList /> {request.tasks?.title}
                </h5>
                <p className="phase-info">
                  Phase {request.phases?.phase_number} ({new Date(request.phases?.start_date).toLocaleDateString()} - {new Date(request.phases?.end_date).toLocaleDateString()})
                </p>
                <p className="original-deadline">
                  <strong>Original Due:</strong> {new Date(request.original_due_date).toLocaleString()}
                </p>
                <div className="reason-box">
                  <strong>Reason:</strong>
                  <p>{request.reason}</p>
                </div>
                <p className="requested-date">
                  Requested: {new Date(request.requested_at).toLocaleString()}
                </p>
              </div>

              {request.status === 'pending' && (
                <div className="request-actions">
                  <button
                    className="approve-button"
                    onClick={() => {
                      setSelectedExtensionRequest(request);
                      setExtensionApprovalForm({
                        new_due_date: request.original_due_date.split('T')[0],
                        new_due_time: request.original_due_date.split('T')[1]?.substring(0, 5) || '23:59',
                        new_available_until_date: request.original_available_until?.split('T')[0] || request.original_due_date.split('T')[0],
                        new_available_until_time: request.original_available_until?.split('T')[1]?.substring(0, 5) || '23:59'
                      });
                      setShowExtensionApprovalModal(true);
                    }}
                  >
                    <FaCheck /> Approve
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => handleRejectExtension(request.id)}
                  >
                    <FaTimes /> Reject
                  </button>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="approved-info">
                  <p><strong>New Due Date:</strong> {new Date(request.new_due_date).toLocaleString()}</p>
                  <p><strong>Reviewed by:</strong> You on {new Date(request.reviewed_at).toLocaleString()}</p>
                </div>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="rejection-info">
                  <p><strong>Rejection Reason:</strong> {request.rejection_reason}</p>
                  <p><strong>Reviewed by:</strong> You on {new Date(request.reviewed_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}

        {extensionRequests.filter(req => extensionRequestFilter === 'all' || req.status === extensionRequestFilter).length === 0 && (
          <div className="empty-state">
            <FaInbox />
            <p>No {extensionRequestFilter === 'all' ? '' : extensionRequestFilter} extension requests</p>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

### **STEP 7: Create Extension Approval Modal (Leader)**

```javascript
{/* Extension Approval Modal */}
{showExtensionApprovalModal && selectedExtensionRequest && (
  <div className="modal-overlay" onClick={() => !approvingExtension && setShowExtensionApprovalModal(false)}>
    <div className="modal-content extension-approval-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Approve Extension Request</h2>
        <button
          className="modal-close-button"
          onClick={() => setShowExtensionApprovalModal(false)}
          disabled={approvingExtension}
        >
          <FaTimes />
        </button>
      </div>

      <div className="modal-body">
        <div className="request-summary">
          <h3>{selectedExtensionRequest.tasks?.title}</h3>
          <p><strong>Student:</strong> {selectedExtensionRequest.studentaccounts?.name}</p>
          <p><strong>Phase {selectedExtensionRequest.phases?.phase_number} Dates:</strong> {new Date(selectedExtensionRequest.phases?.start_date).toLocaleDateString()} - {new Date(selectedExtensionRequest.phases?.end_date).toLocaleDateString()}</p>
          <div className="reason-display">
            <strong>Student's Reason:</strong>
            <p>{selectedExtensionRequest.reason}</p>
          </div>
        </div>

        <div className="deadline-section">
          <h4>Set New Deadline</h4>
          <p className="phase-warning">
            <FaExclamationTriangle /> New deadline must be within Phase {selectedExtensionRequest.phases?.phase_number} (ends {new Date(selectedExtensionRequest.phases?.end_date).toLocaleDateString()})
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>New Due Date</label>
              <input
                type="date"
                value={extensionApprovalForm.new_due_date}
                onChange={(e) => setExtensionApprovalForm(prev => ({ ...prev, new_due_date: e.target.value }))}
                min={selectedExtensionRequest.phases?.start_date?.split('T')[0]}
                max={selectedExtensionRequest.phases?.end_date?.split('T')[0]}
                disabled={approvingExtension}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={extensionApprovalForm.new_due_time}
                onChange={(e) => setExtensionApprovalForm(prev => ({ ...prev, new_due_time: e.target.value }))}
                disabled={approvingExtension}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>New Available Until Date</label>
              <input
                type="date"
                value={extensionApprovalForm.new_available_until_date}
                onChange={(e) => setExtensionApprovalForm(prev => ({ ...prev, new_available_until_date: e.target.value }))}
                min={extensionApprovalForm.new_due_date || selectedExtensionRequest.phases?.start_date?.split('T')[0]}
                max={selectedExtensionRequest.phases?.end_date?.split('T')[0]}
                disabled={approvingExtension}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={extensionApprovalForm.new_available_until_time}
                onChange={(e) => setExtensionApprovalForm(prev => ({ ...prev, new_available_until_time: e.target.value }))}
                disabled={approvingExtension}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button
          className="cancel-button"
          onClick={() => setShowExtensionApprovalModal(false)}
          disabled={approvingExtension}
        >
          Cancel
        </button>
        <button
          className="approve-extension-button"
          onClick={handleApproveExtension}
          disabled={approvingExtension || !extensionApprovalForm.new_due_date || !extensionApprovalForm.new_available_until_date}
        >
          {approvingExtension ? (
            <>
              <div className="spinner-small"></div> Approving...
            </>
          ) : (
            <>
              <FaCheck /> Approve Extension
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

---

### **STEP 8: Handler Functions for Leaders**

```javascript
// Load extension requests
const loadExtensionRequests = async () => {
  if (!taskAssignmentView.selectedProject) return;

  setExtensionRequestsLoading(true);

  try {
    const token = localStorage.getItem('studentToken');
    const response = await fetch(
      `http://localhost:5000/api/leader/projects/${taskAssignmentView.selectedProject.id}/extension-requests?status=all`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load extension requests');
    }

    setExtensionRequests(data.requests || []);

  } catch (error) {
    console.error('Error loading extension requests:', error);
    alert(error.message || 'Failed to load extension requests');
  } finally {
    setExtensionRequestsLoading(false);
  }
};

// Approve extension
const handleApproveExtension = async () => {
  if (!selectedExtensionRequest || !extensionApprovalForm.new_due_date || !extensionApprovalForm.new_available_until_date) {
    alert('Please set both due date and available until date');
    return;
  }

  setApprovingExtension(true);

  try {
    const token = localStorage.getItem('studentToken');

    // Combine date and time
    const newDueDate = `${extensionApprovalForm.new_due_date}T${extensionApprovalForm.new_due_time}:00+08:00`;
    const newAvailableUntil = `${extensionApprovalForm.new_available_until_date}T${extensionApprovalForm.new_available_until_time}:00+08:00`;

    const response = await fetch(
      `http://localhost:5000/api/leader/extension-requests/${selectedExtensionRequest.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approve',
          new_due_date: newDueDate,
          new_available_until: newAvailableUntil
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to approve extension');
    }

    alert('Extension approved successfully!');
    
    // Refresh extension requests
    await loadExtensionRequests();

    // Close modal
    setShowExtensionApprovalModal(false);
    setSelectedExtensionRequest(null);

  } catch (error) {
    console.error('Error approving extension:', error);
    alert(error.message || 'Failed to approve extension');
  } finally {
    setApprovingExtension(false);
  }
};

// Reject extension
const handleRejectExtension = async (requestId) => {
  const reason = prompt('Optional: Provide a reason for rejecting this extension request');

  if (reason === null) return; // User cancelled

  try {
    const token = localStorage.getItem('studentToken');

    const response = await fetch(
      `http://localhost:5000/api/leader/extension-requests/${requestId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: reason || undefined
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reject extension');
    }

    alert('Extension request rejected');
    
    // Refresh extension requests
    await loadExtensionRequests();

  } catch (error) {
    console.error('Error rejecting extension:', error);
    alert(error.message || 'Failed to reject extension');
  }
};
```

---

## 🎯 Workflow Overview

### Student Flow:
1. Task becomes **"Missed"** (past due date without submission)
2. Student clicks task card → Modal opens
3. Instead of "Submit" button, sees **"Request Extension"** button
4. Clicks → Extension request modal appears
5. Types reason → Clicks "Submit Request"
6. Task card status changes to **"Req. Extension"** (orange badge)
7. Student waits for leader review

### Leader Flow:
1. Leader navigates to **Task Assignment** → **Extension Requests** tab
2. Sees list of pending requests with student info, task, and reason
3. Clicks **"Approve"** on a request
4. Modal opens showing phase boundaries and original dates
5. Leader selects new due date and available until date (must be within phase)
6. Clicks **"Approve Extension"**
7. Backend validates dates → Updates task deadlines → Resets task to "not_started"
8. Student can now submit the task with new deadline

---

## ✅ Testing Checklist

### Database Setup:
- [ ] Run `create_extension_requests_table.sql` in Supabase
- [ ] Verify table exists: `SELECT * FROM task_extension_requests;`
- [ ] Check RLS policies are enabled
- [ ] Test helper functions work

### Student Testing:
- [ ] Create a task with past due date (missed status)
- [ ] Open task modal → Verify "Request Extension" button appears
- [ ] Submit extension request with reason
- [ ] Verify task card shows "Req. Extension" status
- [ ] Check API call succeeds in Network tab
- [ ] Verify duplicate requests are blocked

### Leader Testing:
- [ ] Navigate to Extension Requests tab
- [ ] Verify pending requests appear
- [ ] Click "Approve" → Modal opens
- [ ] Try setting date outside phase boundaries → Should show error
- [ ] Set valid dates → Approve
- [ ] Verify task deadline updates in database
- [ ] Check student can now see new deadline and submit

### Edge Cases:
- [ ] Try approving already-reviewed request → Should fail
- [ ] Non-leader tries to access leader endpoints → Should fail
- [ ] Extension request for non-existent task → Should fail
- [ ] Phase validation works correctly (Jan 1-5 example)

---

## 🎨 CSS Styling Recommendations

Add these classes to your CSS:

```css
/* Extension Request Modal */
.extension-request-modal {
  max-width: 600px;
}

.extension-reason-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.status-extension-pending {
  background: #ff9800;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* Extension Requests Tab */
.extension-requests-container {
  padding: 20px;
}

.extension-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.extension-request-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.extension-request-card.status-pending {
  border-left: 4px solid #ff9800;
}

.extension-request-card.status-approved {
  border-left: 4px solid #4caf50;
}

.extension-request-card.status-rejected {
  border-left: 4px solid #f44336;
}

.reason-box {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
}

.request-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.approve-button {
  background: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reject-button {
  background: #f44336;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Extension Approval Modal */
.extension-approval-modal {
  max-width: 700px;
}

.phase-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.deadline-section h4 {
  margin-bottom: 12px;
  color: #333;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.badge-count {
  background: #f44336;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 8px;
}
```

---

## 📊 Database Relationships

```
task_extension_requests
├── task_id → tasks(id)
├── student_id → studentaccounts(id)
├── group_id → groups(id)
├── project_id → projects(id)
├── phase_id → phases(id)
└── reviewed_by → studentaccounts(id)
```

---

## 🚨 Important Notes

1. **Phase Boundary Validation**: Always enforced server-side
2. **Status Updates**: When approved, task status resets to `'not_started'`
3. **Duplicate Prevention**: Students can't submit multiple pending requests for same task
4. **Leader Authorization**: Only group leaders can approve/reject
5. **Timezone**: All dates use Philippine Time (Asia/Manila)

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase connection
3. Check RLS policies are correct
4. Ensure student is in an active group
5. Verify task belongs to selected project/phase

---

**Last Updated**: November 6, 2025
**Version**: 1.0
