# Phase Deliverable Submission System - Complete Guide

## 📋 Overview

The `phase_deliverable_submissions` table is designed to capture a **complete, immutable snapshot** of everything related to a phase deliverable submission at the moment it's submitted by the group leader.

## 🗂️ What Gets Stored

### 1. **Uploaded Files** (`files` JSONB)
```json
[
  {
    "path": "phase_deliverables/group_xxx/phase_1/file1.pdf",
    "name": "Design Document.pdf",
    "size": 2048576,
    "type": "application/pdf",
    "uploaded_at": "2025-10-27T09:45:00"
  }
]
```

### 2. **Phase Snapshot** (`phase_snapshot` JSONB)
Preserves the exact phase configuration at submission time:
```json
{
  "phase_number": 1,
  "title": "FIRST ONES",
  "description": "FIRST ONESFIRST ONES (BUILT IN EVAL CUSTOM RUBRIC)",
  "start_date": "2025-10-27T16:20:00",
  "end_date": "2025-10-27T17:00:00",
  "evaluation_available_from": "2025-10-27T17:00:00",
  "evaluation_due_date": "2025-10-27T23:59:59.999",
  "min_tasks_per_member": 3,
  "max_tasks_per_member": 5,
  "max_attempts": 3,
  "file_types_allowed": ["pdf", "doc", "docx"],
  "rubric_file_url": "https://...",
  "evaluation_form_type": "builtin"
}
```

### 3. **Member Tasks** (`member_tasks` JSONB)
**ALL tasks for ALL members**, regardless of status (pending, completed, revision, rejected, etc.):
```json
[
  {
    "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",
    "member_name": "Marshalle Nopi Soriano",
    "role": "leader",
    "tasks": [
      {
        "task_id": "17900e29-299f-4905-b21d-47f69226b73d",
        "title": "sssssssss",
        "description": "ssssssssssss",
        "status": "completed",
        "due_date": "2025-10-27T16:55:00",
        "available_until": "2025-10-27T17:00:00",
        "max_attempts": 5,
        "current_attempts": 2,
        "assigned_by": "b7c6af2a-1fcb-4b72-ae69-088672884006",
        "assigned_at": "2025-10-27T08:35:19",
        "completed_at": "2025-10-27T08:44:51",
        "file_types_allowed": ["pdf", "docx", "rtf", "md"],
        "submission_files": [
          {
            "submission_id": "1f9aba40-faad-4812-b888-454055ff3d12",
            "attempt_number": 1,
            "files": ["task1_attempt1.pdf"],
            "submitted_at": "2025-10-27T08:36:51",
            "status": "revision_requested",
            "feedback": "Please add more details"
          },
          {
            "submission_id": "51630c42-f278-4f67-b98e-e5a43b4c406a",
            "attempt_number": 2,
            "files": ["task1_revised.pdf", "task1_revised_v2.pdf"],
            "submitted_at": "2025-10-27T08:44:50",
            "status": "approved",
            "feedback": null
          }
        ]
      }
    ],
    "task_count": 1,
    "min_required": 3,
    "max_allowed": 5
  },
  {
    "member_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
    "member_name": "Ivy Bumagat",
    "role": "member",
    "tasks": [],
    "task_count": 0,
    "min_required": 3,
    "max_allowed": 5
  }
]
```

### 4. **Evaluation Submissions** (`evaluation_submissions` JSONB)
All phase evaluations - supports **TWO types**:

#### **Type 1: Built-in Evaluations** (Criteria-based scoring)
Uses predefined criteria with point values:
```json
[
  {
    "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",
    "member_name": "Marshalle Nopi Soriano",
    "role": "leader",
    
    "evaluations_received": [
      {
        "evaluation_submission_id": "68da0409-57c7-44eb-991b-2946441d5d8e",
        "evaluator_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
        "evaluator_name": "Ivy Bumagat",
        "evaluator_role": "member",
        "submission_date": "2025-10-27T06:57:56.156+00",
        "status": "submitted",
        
        "is_custom_evaluation": false,
        "evaluation_form": {
          "form_id": "85542132-feca-469c-897b-306999e26d9c",
          "instructions": "Rate your groupmates according to the following criteria...",
          "total_points": 100,
          "criteria": [
            {
              "id": "6a240d1d-e116-4d72-a8da-895f5fce9a29",
              "name": "Contribution",
              "description": "Contributes meaningfully to group discussions and project development",
              "max_points": 20,
              "score_received": 18
            },
            {
              "id": "b1eb9ee6-106f-4b59-89b8-21cc78fb96f9",
              "name": "Compliance",
              "description": "Completes group assignments and tasks on time",
              "max_points": 15,
              "score_received": 14
            },
            {
              "id": "8977cdb5-9d27-400e-9b73-14db724ae909",
              "name": "Quality Work",
              "description": "Prepares work in a quality manner with attention to detail",
              "max_points": 25,
              "score_received": 23
            },
            {
              "id": "c7bea433-34d3-466a-9b28-28d277280e18",
              "name": "Cooperation",
              "description": "Demonstrates a cooperative and supportive attitude",
              "max_points": 15,
              "score_received": 15
            },
            {
              "id": "78f96740-b457-456d-958c-0b3106ba2d98",
              "name": "Overall Performance",
              "description": "Overall performance and leadership in the project",
              "max_points": 25,
              "score_received": 24
            }
          ]
        },
        "total_score": 94,
        "percentage": 94.0,
        "comments": null
      }
    ],
    
    "evaluation_count": 1,
    "average_score": 94.0,
    "total_possible_score": 100,
    "has_submitted_own_evaluations": true,
    "own_evaluation_submission_date": "2025-10-27T06:55:00",
    "members_evaluated_count": 1
  }
]
```

#### **Type 2: Custom File Evaluations**
Uses uploaded PDF/file:
```json
{
  "evaluation_submission_id": "another-uuid",
  "evaluator_id": "another-member-uuid",
  "evaluator_name": "John Doe",
  "evaluator_role": "member",
  "submission_date": "2025-10-27T07:15:00.000+00",
  "status": "submitted",
  
  "is_custom_evaluation": true,
  "evaluation_form": {
    "form_id": "7e95d831-fd8a-4154-b7bb-0d84faa6a112",
    "instructions": "Download and complete the custom evaluation form",
    "total_points": 100,
    "custom_file_url": "https://.../phase_evaluation_template.pdf",
    "custom_file_name": "phase_1_evaluation_template.pdf"
  },
  "file_submission_url": "https://.../STUDENT_PHASE_CUSTOM_UPLOAD.pdf",
  "file_name": "STUDENT PHASE CUSTOM UPLOAD.pdf",
  "comments": null
}
```

**What's Captured:**
- ✅ Who evaluated whom
- ✅ Exact scores for each criterion (built-in) OR uploaded file (custom)
- ✅ Full criterion definitions with descriptions and max points
- ✅ Total scores and percentages
- ✅ Whether each member submitted their own evaluations
- ✅ How many other members they evaluated

### 5. **Member Inclusion Recommendations** (`member_inclusions` JSONB)
Leader's decision on which members to include/exclude:
```json
[
  {
    "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",
    "member_name": "Marshalle Nopi Soriano",
    "role": "leader",
    "included": true,
    "exclusion_reason": null
  },
  {
    "member_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
    "member_name": "Ivy Bumagat",
    "role": "member",
    "included": false,
    "exclusion_reason": "Did not complete any assigned tasks and showed no participation throughout the phase despite multiple reminders."
  }
]
```

### 6. **Validation Results** (`validation_results` JSONB)
What was checked at submission time:
```json
{
  "files_uploaded": true,
  "min_tasks_met": false,
  "members_below_minimum": [
    {
      "member_name": "Marshalle Nopi Soriano",
      "assigned": 1,
      "required": 3
    },
    {
      "member_name": "Ivy Bumagat",
      "assigned": 0,
      "required": 3
    }
  ],
  "evaluation_warnings": [
    {
      "member_name": "Ivy Bumagat",
      "message": "Has not submitted phase evaluations"
    }
  ]
}
```

## 🚀 How to Deploy

### 1. Run the SQL Script in Supabase

```bash
# Option 1: Via Supabase Dashboard
# - Go to SQL Editor
# - Paste contents of phase_deliverable_submissions_schema.sql
# - Click "Run"

# Option 2: Via psql
psql $DATABASE_URL -f phase_deliverable_submissions_schema.sql
```

### 2. Verify the Table

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'phase_deliverable_submissions';

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'phase_deliverable_submissions';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'phase_deliverable_submissions';
```

## 📊 Key Features

### ✅ Complete Historical Record
- **Immutable snapshots**: Everything is frozen at submission time
- **No data loss**: Even if tasks/evaluations are deleted later, the submission preserves them
- **Audit trail**: Full visibility into what was submitted

### ✅ Flexible Status Tracking
```sql
-- Possible statuses
'submitted'      -- Initial state
'under_review'   -- Instructor is reviewing
'graded'         -- Graded with feedback
'returned'       -- Sent back for revision
'resubmitted'    -- Leader resubmitted after revision
```

### ✅ Resubmission Support
- Track multiple submission attempts
- Link resubmissions to originals
- Maintain submission history

### ✅ Security
- **RLS enabled**: Students only see their group's submissions
- **Role-based access**: Leaders can submit, instructors can grade
- **Audit-friendly**: All actions timestamped

## 🔍 Example Queries

### Get Latest Submission for a Phase
```sql
SELECT * 
FROM phase_deliverable_submissions
WHERE project_id = 'xxx'
  AND phase_id = 'xxx'
  AND group_id = 'xxx'
  AND is_resubmission = FALSE
ORDER BY submitted_at DESC
LIMIT 1;
```

### Get All Member Tasks from Submission
```sql
SELECT 
  id,
  submitted_at,
  jsonb_array_length(member_tasks) as member_count,
  member_tasks
FROM phase_deliverable_submissions
WHERE id = 'submission_uuid';
```

### Find Submissions with Excluded Members
```sql
SELECT 
  pds.id,
  pds.submitted_at,
  jsonb_array_elements(pds.member_inclusions) as member_inclusion
FROM phase_deliverable_submissions pds
WHERE EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(pds.member_inclusions) mi
  WHERE (mi->>'included')::boolean = false
);
```

### Get Grading Statistics
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(grade) as avg_grade,
  MIN(grade) as min_grade,
  MAX(grade) as max_grade
FROM phase_deliverable_submissions
WHERE grade IS NOT NULL
GROUP BY status;
```

## 🎯 Next Steps

1. **Run the SQL script** in Supabase
2. **Update your frontend** to construct and submit this data structure
3. **Create backend endpoint** to receive and validate submission data
4. **Implement instructor grading UI** to view and grade submissions

Would you like me to create the backend API endpoint to handle these submissions?

