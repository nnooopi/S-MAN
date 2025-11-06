# Task Assignment Tab - Min/Max Tasks Implementation Guide

## ✅ Frontend Changes Completed

### Overview Tab - Combined Stats Pill
- **Status:** ✅ DONE
- **Location:** `frontend/src/components/CourseStudentDashboard.js` (line ~15000)
- **Change:** Replaced two separate MIN/MAX pills with single combined pill showing "Task Range: X - Y"
- **Design:** Purple theme (#F3E8FF background) with readable format

---

## 📊 Database Structure - Projects Table

### Min/Max Task Columns
Located in `public.projects` table:

| Column | Data Type | Default | Purpose |
|--------|-----------|---------|---------|
| `min_tasks_per_member` | integer | 1 | Minimum tasks to assign per team member |
| `max_tasks_per_member` | integer | 5 | Maximum tasks to assign per team member |

### Example Query to Get Project Min/Max
```sql
SELECT 
  id,
  title,
  min_tasks_per_member,
  max_tasks_per_member
FROM public.projects
WHERE id = $1;
```

---

## 📋 Related Tables for Task Count

### Tasks Assigned Per Member - Query Structure

**Table:** `public.tasks` (contains all tasks in project)
**Join Path:** tasks → assigned_to_student_id (studentaccounts.id)

```sql
-- Count tasks assigned to a specific member in a project
SELECT COUNT(*) as task_count
FROM public.tasks
WHERE project_id = $1
  AND assigned_to_student_id = $2;

-- Count tasks assigned to a member per phase
SELECT COUNT(*) as task_count
FROM public.tasks
WHERE project_id = $1
  AND phase_id = $2
  AND assigned_to_student_id = $3;

-- Get distribution of tasks per member in project
SELECT 
  assigned_to_student_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
FROM public.tasks
WHERE project_id = $1
GROUP BY assigned_to_student_id;
```

---

## 🔧 Implementation Requirements

### Backend - Task Assignment API
**File:** `backend/task-assignment-api.js`

**Current Response for phases includes:**
- evaluation_available_from
- evaluation_due_date
- breathe_start_date
- breathe_end_date
- breathe_duration_days

**Need to Add to Project Response:**
When fetching project data, include:
```javascript
{
  // ... existing project data
  min_tasks_per_member: projectData.min_tasks_per_member,
  max_tasks_per_member: projectData.max_tasks_per_member
}
```

### Backend - Member Task Count Endpoint
**Suggested Endpoint:** `GET /api/task-assignment/projects/:projectId/member-task-counts`

**Response Format:**
```javascript
{
  "memberTaskCounts": {
    "member-id-1": 3,  // 3 tasks assigned to this member
    "member-id-2": 2,  // 2 tasks assigned to this member
    "member-id-3": 5   // 5 tasks assigned to this member
  }
}
```

**Query Implementation:**
```sql
SELECT 
  assigned_to_student_id as member_id,
  COUNT(*) as task_count
FROM tasks
WHERE project_id = $1
GROUP BY assigned_to_student_id;
```

---

## 📱 Frontend - Integration Points

### 1. Overview Tab Header Statistics
**Current:** Calculates min/max from frontend data
**Goal:** Display project-configured min/max instead

```javascript
// Replace with:
const minTasksPerMember = taskAssignmentView.selectedProject?.min_tasks_per_member || 0;
const maxTasksPerMember = taskAssignmentView.selectedProject?.max_tasks_per_member || 0;

// Display: "Task Range: 1 - 5" (example)
```

### 2. Member Cards
**Current:** Shows "Assigned Tasks: X" (total assigned)
**Future:** Could show "X/5 tasks assigned" (actual vs max allowed)

```javascript
// Could be enhanced to:
const maxAllowed = taskAssignmentView.selectedProject?.max_tasks_per_member || 0;
// Display: "Assigned Tasks: 3/5"
```

### 3. Task Form Validation
**Location:** `handleTaskFormChange` function
**Enhancement:** Validate that assigning a task won't exceed `max_tasks_per_member`

---

## 🎯 Data Flow Diagram

```
Projects Table
    ↓
    ├─ min_tasks_per_member (e.g., 1)
    ├─ max_tasks_per_member (e.g., 5)
    └─ id
         ↓
         └─ Tasks Table (count by assigned_to_student_id)
              ↓
              └─ Display: "X/5 tasks assigned per member"
```

---

## 📝 SQL Schema Reference

### Projects Table Relevant Columns
```sql
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  title character varying NOT NULL,
  description text,
  start_date timestamp without time zone,
  due_date timestamp without time zone NOT NULL,
  min_tasks_per_member integer DEFAULT 1,
  max_tasks_per_member integer DEFAULT 5,
  breathe_phase_days smallint NOT NULL,
  evaluation_phase_days smallint DEFAULT 2,
  -- ... other columns
);
```

### Tasks Table Reference
```sql
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  phase_id uuid,
  assigned_to_student_id uuid REFERENCES studentaccounts(id),
  title character varying NOT NULL,
  description text,
  due_date timestamp without time zone,
  status character varying DEFAULT 'pending',
  -- ... other columns
);
```

---

## 🚀 Next Steps

1. ✅ **Frontend:** Combined min/max pill into single display
2. ⏳ **Backend:** Update `/api/task-assignment/projects/:projectId/phases` to include `min_tasks_per_member` and `max_tasks_per_member`
3. ⏳ **Backend:** Optional - Create endpoint to count tasks per member
4. ⏳ **Frontend:** Update Overview tab header to use project-configured min/max values
5. ⏳ **Frontend:** Add task count validation when assigning tasks
6. ⏳ **Frontend:** Optional - Display "X/max" format on member cards

---

## 📌 Key Findings

- **Project-level Configuration:** `min_tasks_per_member` and `max_tasks_per_member` are stored per project
- **Task Assignments:** Track individual task assignments to members via `tasks.assigned_to_student_id`
- **Current Frontend:** Dynamically calculates min/max from current data; should use project-configured values instead
- **Database is Ready:** All necessary columns exist in schema
