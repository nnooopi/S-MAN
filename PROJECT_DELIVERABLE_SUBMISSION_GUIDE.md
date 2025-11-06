# Project Deliverable Submissions Guide

## Overview

The `project_deliverable_submissions` table captures a **comprehensive snapshot** of an entire project submission, including:
- All tasks from all phases for all members
- All phase evaluations across all phases
- Project-level evaluations (final peer evaluations)
- Complete submission history and member participation

---

## Key Differences from Phase Deliverable Submissions

| Aspect | Phase Deliverable | Project Deliverable |
|--------|------------------|---------------------|
| **Scope** | Single phase | Entire project (all phases) |
| **Tasks** | Tasks from one phase only | ALL tasks from ALL phases |
| **Evaluations** | Phase evaluations only | Phase evaluations + Project evaluations |
| **Snapshot** | `phase_snapshot` (single phase) | `project_snapshot` (entire project + all phases) |
| **When Submitted** | End of each phase | End of entire project |
| **Purpose** | Phase deliverable | Final project deliverable |

---

## Table Structure

### Core Fields

```sql
id                    UUID PRIMARY KEY
project_id            UUID -> projects(id)
group_id              UUID -> course_groups(id)
submitted_by          UUID -> studentaccounts(id)
submitted_at          TIMESTAMP WITHOUT TIME ZONE
files                 JSONB  -- Project deliverable files
submission_text       TEXT
status                VARCHAR(50)
```

### Snapshot Fields

#### 1. `project_snapshot` - Complete Project Details

Captures the entire project configuration including all phases:

```json
{
  "id": "uuid",
  "title": "Capstone Project",
  "description": "Full project description",
  "start_date": "2025-01-15T08:00:00",
  "due_date": "2025-05-30T23:59:59",
  "course_id": "uuid",
  "min_tasks_per_member": 3,
  "max_tasks_per_member": 10,
  "breathe_phase_days": 2,
  "evaluation_phase_days": 2,
  "project_evaluation_deadline": "2025-06-05T23:59:59",
  "project_evaluation_type": "builtin",
  "project_rubric_type": "builtin",
  "total_phases": 3,
  "phases": [
    {
      "id": "uuid",
      "phase_number": 1,
      "title": "Planning & Design",
      "description": "...",
      "start_date": "2025-01-15T08:00:00",
      "end_date": "2025-02-15T23:59:59",
      "evaluation_form_type": "builtin",
      "max_attempts": 3,
      "file_types_allowed": ["pdf", "docx"],
      "min_tasks_per_member": 1,
      "max_tasks_per_member": 3
    },
    {
      "id": "uuid",
      "phase_number": 2,
      "title": "Implementation",
      "start_date": "2025-02-18T08:00:00",
      "end_date": "2025-04-15T23:59:59",
      ...
    },
    {
      "id": "uuid",
      "phase_number": 3,
      "title": "Testing & Deployment",
      "start_date": "2025-04-18T08:00:00",
      "end_date": "2025-05-30T23:59:59",
      ...
    }
  ]
}
```

#### 2. `member_tasks` - All Tasks from All Phases

Organized by member, then by phase:

```json
[
  {
    "member_id": "uuid",
    "member_name": "Marshalle Nopi Soriano",
    "role": "leader",
    "total_tasks": 10,
    "min_required": 3,
    "max_allowed": 10,
    "phases": [
      {
        "phase_id": "uuid",
        "phase_number": 1,
        "phase_title": "Planning & Design",
        "task_count": 3,
        "tasks": [
          {
            "task_id": "uuid",
            "title": "Create System Architecture",
            "description": "Design the overall system architecture",
            "status": "completed",
            "assigned_at": "2025-01-16T10:00:00",
            "assigned_by": "uuid",
            "due_date": "2025-02-01T23:59:59",
            "available_until": "2025-02-15T23:59:59",
            "max_attempts": 3,
            "current_attempts": 1,
            "file_types_allowed": ["pdf", "docx"],
            "submission_files": [
              {
                "submission_id": "uuid",
                "attempt_number": 1,
                "is_revision": false,
                "status": "approved",
                "files": [
                  "task_uuid/attempt_1/architecture.pdf"
                ],
                "submission_text": "System architecture document",
                "submitted_at": "2025-01-28T14:30:00",
                "reviewed_by": "uuid",
                "reviewed_at": "2025-01-29T09:00:00",
                "feedback": "Great work! Architecture is well-designed."
              }
            ]
          },
          // ... more tasks for phase 1
        ]
      },
      {
        "phase_id": "uuid",
        "phase_number": 2,
        "phase_title": "Implementation",
        "task_count": 4,
        "tasks": [
          // ... tasks for phase 2
        ]
      },
      {
        "phase_id": "uuid",
        "phase_number": 3,
        "phase_title": "Testing & Deployment",
        "task_count": 3,
        "tasks": [
          // ... tasks for phase 3
        ]
      }
    ]
  },
  {
    "member_id": "uuid",
    "member_name": "Ivy Bumagat",
    "role": "member",
    "total_tasks": 8,
    "phases": [
      // ... Ivy's tasks organized by phase
    ]
  }
]
```

#### 3. `evaluation_submissions` - Phase + Project Evaluations

Combines all phase evaluations AND project evaluations:

```json
[
  {
    "member_id": "uuid",
    "member_name": "Marshalle Nopi Soriano",
    "role": "leader",
    
    // ===== PHASE EVALUATIONS SUMMARY =====
    "phase_evaluations": {
      "total_phases": 3,
      "submitted_count": 3,
      "missing_count": 0,
      "phases": [
        {
          "phase_id": "uuid",
          "phase_number": 1,
          "phase_title": "Planning & Design",
          "has_submitted": true,
          "submission_date": "2025-02-14T16:00:00",
          "evaluations_received": [
            {
              "evaluation_submission_id": "uuid",
              "evaluator_id": "uuid",
              "evaluator_name": "Ivy Bumagat",
              "evaluator_role": "member",
              "is_custom_evaluation": false,
              "status": "submitted",
              "submission_date": "2025-02-14T16:00:00",
              "total_score": 85,
              "percentage": "85.0",
              "evaluation_form": {
                "form_id": "uuid",
                "total_points": 100,
                "instructions": "Rate your groupmates...",
                "criteria": [
                  {
                    "id": "uuid",
                    "name": "Contribution",
                    "max_points": 20,
                    "description": "...",
                    "score_received": 18
                  },
                  {
                    "id": "uuid",
                    "name": "Compliance",
                    "max_points": 15,
                    "description": "...",
                    "score_received": 14
                  }
                  // ... more criteria
                ]
              },
              "file_submission_url": null,
              "file_name": null,
              "comments": "Great leadership during planning phase"
            }
            // ... more evaluations from other members
          ],
          "average_score": "87.5",
          "evaluation_count": 4,
          "total_possible_score": 100
        },
        {
          "phase_id": "uuid",
          "phase_number": 2,
          "phase_title": "Implementation",
          "has_submitted": true,
          "submission_date": "2025-04-14T18:30:00",
          "evaluations_received": [
            // ... phase 2 evaluations
          ],
          "average_score": "90.2",
          "evaluation_count": 4,
          "total_possible_score": 100
        },
        {
          "phase_id": "uuid",
          "phase_number": 3,
          "phase_title": "Testing & Deployment",
          "has_submitted": true,
          "submission_date": "2025-05-29T20:00:00",
          "evaluations_received": [
            // ... phase 3 evaluations
          ],
          "average_score": "88.8",
          "evaluation_count": 4,
          "total_possible_score": 100
        }
      ],
      "overall_average": "88.8",
      "total_evaluations_received": 12
    },
    
    // ===== PROJECT EVALUATION (Final) =====
    "project_evaluation": {
      "has_submitted": true,
      "submission_date": "2025-06-03T15:00:00",
      "evaluations_received": [
        {
          "evaluation_submission_id": "uuid",
          "evaluator_id": "uuid",
          "evaluator_name": "Ivy Bumagat",
          "evaluator_role": "member",
          "evaluated_member_id": "uuid",
          "is_custom_evaluation": false,
          "status": "submitted",
          "submission_date": "2025-06-03T15:00:00",
          "total_score": 92,
          "evaluation_form": {
            "form_id": "uuid",
            "total_points": 100,
            "instructions": "Evaluate overall project contribution...",
            "criteria": [
              {
                "id": "uuid",
                "name": "Overall Leadership",
                "max_points": 25,
                "description": "Leadership throughout the project",
                "score_received": 23
              },
              {
                "id": "uuid",
                "name": "Technical Contribution",
                "max_points": 25,
                "description": "Technical skills and implementation",
                "score_received": 24
              },
              {
                "id": "uuid",
                "name": "Team Collaboration",
                "max_points": 25,
                "description": "Collaboration and communication",
                "score_received": 22
              },
              {
                "id": "uuid",
                "name": "Project Quality",
                "max_points": 25,
                "description": "Overall project quality",
                "score_received": 23
              }
            ]
          },
          "file_submission_url": null,
          "file_name": null,
          "comments": "Excellent leadership and technical skills throughout the project!"
        }
        // ... more project evaluations from other members
      ],
      "average_score": "91.5",
      "evaluation_count": 4,
      "total_possible_score": 100
    },
    
    "members_evaluated_count": 4,
    "overall_average_all_evaluations": "89.7"
  }
  // ... other members
]
```

#### 4. `validation_results` - Project-Level Validation

Includes phase deliverable status and evaluation completeness:

```json
{
  "files_uploaded": true,
  "min_tasks_met": true,
  "all_phases_completed": true,
  
  // Status of all phase deliverables
  "phase_deliverables_status": {
    "total_phases": 3,
    "submitted_count": 3,
    "missing_count": 0,
    "phases": [
      {
        "phase_number": 1,
        "phase_title": "Planning & Design",
        "submitted": true,
        "submission_id": "uuid",
        "submitted_at": "2025-02-15T18:00:00",
        "status": "graded",
        "grade": 95.5
      },
      {
        "phase_number": 2,
        "phase_title": "Implementation",
        "submitted": true,
        "submission_id": "uuid",
        "submitted_at": "2025-04-15T20:30:00",
        "status": "graded",
        "grade": 92.0
      },
      {
        "phase_number": 3,
        "phase_title": "Testing & Deployment",
        "submitted": true,
        "submission_id": "uuid",
        "submitted_at": "2025-05-30T19:45:00",
        "status": "graded",
        "grade": 94.5
      }
    ]
  },
  
  "members_below_minimum": [],
  
  "evaluation_warnings": [
    {
      "type": "phase_evaluations",
      "icon": "📝",
      "message": "1 member(s) have incomplete phase evaluations",
      "details": [
        {
          "name": "Student Name",
          "missing_phases": [2]
        }
      ]
    },
    {
      "type": "project_evaluations",
      "icon": "📊",
      "message": "1 member(s) have not submitted project evaluations",
      "details": [
        {
          "name": "Student Name"
        }
      ]
    }
  ]
}
```

---

## Submission Workflow

### 1. Prerequisites

Before submitting project deliverable:
- ✅ All phase deliverables must be submitted
- ✅ All members meet minimum task requirements
- ✅ Project evaluation period is active
- ✅ Leader role required

### 2. Data Collection

The backend collects:
1. **Project Snapshot**: Full project + all phases
2. **All Member Tasks**: From all phases with complete submission history
3. **Phase Evaluations**: All evaluations from all phases
4. **Project Evaluations**: Final project evaluations
5. **Phase Deliverable Status**: Submission status of all phases
6. **Member Inclusions**: Leader's inclusion/exclusion decisions

### 3. Validation Rules

- At least one file must be uploaded
- All phase deliverables must be submitted
- Minimum tasks per member must be met (across all phases)
- Phase evaluations are recommended but not required (warning)
- Project evaluations are recommended but not required (warning)

### 4. Submission

- Only group leader can submit
- Creates comprehensive snapshot in database
- Cannot modify after grading

---

## Backend Implementation

### API Endpoint

```javascript
POST /api/student/project-deliverable/submit

// Request (multipart/form-data):
{
  projectId: "uuid",
  groupId: "uuid",
  submissionText: "Final project report summary",
  memberInclusions: JSON.stringify([...]),
  validationResults: JSON.stringify({...}),
  files: [File, File, ...]
}

// Response:
{
  success: true,
  submission_id: "uuid",
  submitted_at: "2025-06-04T20:15:00"
}
```

### Data Fetching Logic

```javascript
// 1. Fetch project with all phases
const project = await supabase
  .from('projects')
  .select('*, project_phases(*)')
  .eq('id', projectId)
  .single();

// 2. Fetch all tasks from all phases
for (const member of members) {
  for (const phase of project.project_phases) {
    const tasks = await supabase
      .from('tasks')
      .select(`
        *,
        task_submissions(*),
        revision_submissions(*)
      `)
      .eq('assigned_to', member.student_id)
      .eq('phase_id', phase.id);
    
    // Organize by member -> phase -> tasks
  }
}

// 3. Fetch all phase evaluations
for (const phase of project.project_phases) {
  const phaseEvals = await supabase
    .from('phase_evaluation_submissions')
    .select(`
      *,
      phase_evaluation_forms(*),
      phase_evaluation_criteria(*)
    `)
    .eq('phase_id', phase.id)
    .eq('group_id', groupId);
  
  // Organize by member -> phase
}

// 4. Fetch project evaluations
const projectEvals = await supabase
  .from('project_evaluation_submissions')
  .select(`
    *,
    project_evaluation_forms(*),
    project_evaluation_criteria(*)
  `)
  .eq('project_id', projectId)
  .eq('group_id', groupId);

// 5. Fetch phase deliverable submissions
const phaseDeliverables = await supabase
  .from('phase_deliverable_submissions')
  .select('*')
  .eq('project_id', projectId)
  .eq('group_id', groupId);

// 6. Insert project deliverable submission
await supabase
  .from('project_deliverable_submissions')
  .insert({
    project_id: projectId,
    group_id: groupId,
    submitted_by: student_id,
    files: uploadedFiles,
    submission_text: submissionText,
    project_snapshot: projectData,
    member_tasks: memberTasksSnapshot,
    evaluation_submissions: evaluationSnapshot,
    member_inclusions: memberInclusionsData,
    validation_results: validationData,
    status: 'submitted'
  });
```

---

## Frontend Display

### Summary View

```
📊 Project Deliverable Summary

Project: Capstone Project
Total Phases: 3
Members: 5

Phase Deliverables:
✅ Phase 1: Planning & Design (Grade: 95.5)
✅ Phase 2: Implementation (Grade: 92.0)
✅ Phase 3: Testing & Deployment (Grade: 94.5)

Member Performance:
👤 Marshalle Nopi Soriano (Leader)
   - Total Tasks: 10 (across all phases)
   - Phase Eval Average: 88.8%
   - Project Eval Average: 91.5%
   - Overall: 89.7%

👤 Ivy Bumagat (Member)
   - Total Tasks: 8
   - Phase Eval Average: 85.2%
   - Project Eval Average: 87.5%
   - Overall: 86.0%

Status: Submitted
Submitted At: June 4, 2025 8:15 PM
Submitted By: Marshalle Nopi Soriano
```

---

## Use Cases

### 1. Final Project Grading
Instructors can see:
- Complete project history
- All phase deliverables and grades
- All member contributions across all phases
- Peer evaluation trends throughout project
- Final project evaluation scores

### 2. Academic Records
Complete record of:
- Student participation in all phases
- Task completion rates
- Peer evaluation feedback
- Instructor grading

### 3. Audit Trail
Immutable record of:
- What was submitted when
- Who contributed what
- How peers evaluated each other
- Instructor feedback and grades

---

## Database Schema

```sql
CREATE TABLE project_deliverable_submissions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  group_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  files JSONB DEFAULT '[]',
  submission_text TEXT,
  project_snapshot JSONB NOT NULL,
  member_tasks JSONB NOT NULL DEFAULT '[]',
  evaluation_submissions JSONB NOT NULL DEFAULT '[]',
  member_inclusions JSONB NOT NULL DEFAULT '[]',
  validation_results JSONB DEFAULT '{}',
  grade NUMERIC(5, 2),
  max_grade NUMERIC(5, 2) DEFAULT 100.00,
  graded_by UUID,
  graded_at TIMESTAMP WITHOUT TIME ZONE,
  instructor_feedback TEXT,
  status VARCHAR(50) DEFAULT 'submitted',
  is_resubmission BOOLEAN DEFAULT false,
  original_submission_id UUID,
  resubmission_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITHOUT TIME ZONE
);
```

---

## Summary

The `project_deliverable_submissions` table provides:
- ✅ Complete project history in one record
- ✅ All phases, tasks, and submissions
- ✅ Phase + Project evaluations
- ✅ Member participation tracking
- ✅ Audit trail for academic records
- ✅ Comprehensive grading data for instructors

This is the final submission for the entire project, capturing everything that happened throughout all phases!

