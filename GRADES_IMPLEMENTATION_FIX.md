# My Grades Implementation - Complete Fix

## Overview
Fixed the "My Grades" sidebar option in the Student Dashboard to properly fetch and display both group grades and individual grades from Supabase deliverable submissions tables.

## Problem Analysis

### Original Issue
The Student Dashboard was trying to use `window.supabase` directly to fetch grades, but the Supabase client is NOT available on the frontend (it's configured only on the backend in `server.js`). This resulted in the error:

```
TypeError: Cannot read properties of undefined (reading 'from')
```

### Root Cause
- Supabase is initialized only in the backend (`server.js`)
- Frontend components cannot directly access Supabase
- The frontend must communicate through REST API endpoints

## Solution Implementation

### 1. Backend Changes (server.js)

Added two new API endpoints to fetch grades from deliverable submissions:

#### Endpoint 1: `/api/student/grades/overview`
**Purpose**: Get a quick overview of all project deliverable submissions with grades

**Location**: Lines 13256-13305 (server.js)

**Logic**:
- Fetches all `project_deliverable_submissions` where grade is not null
- For each submission, extracts:
  - **Group Grade**: From the `grade` column (represents the overall group score)
  - **Individual Grade**: From `member_tasks[].individual_grade` where `member_id` matches current student
- Returns processed data with proper field names

**Response Format**:
```json
[
  {
    "id": "submission-id",
    "projectId": "project-id",
    "projectTitle": "Project Name",
    "groupGrade": 95,
    "individualGrade": 95,
    "maxGrade": 100,
    "status": "graded",
    "gradedAt": "2025-11-03T12:00:00",
    "gradedBy": "professor-id",
    "feedback": "Great work!"
  }
]
```

#### Endpoint 2: `/api/student/grades/project/:projectId`
**Purpose**: Get detailed grades for a specific project (both project-level and phase-level)

**Location**: Lines 13307-13385 (server.js)

**Logic**:
- Fetches both `project_deliverable_submissions` and `phase_deliverable_submissions` for a specific project
- Extracts individual and group grades from member_tasks using same logic as overview
- Returns structured data with project grades and phase grades separately

**Response Format**:
```json
{
  "projectGrade": {
    "id": "submission-id",
    "groupGrade": 95,
    "individualGrade": 95,
    "maxGrade": 100,
    "status": "graded",
    "gradedAt": "2025-11-03T12:00:00",
    "gradedBy": "professor-id",
    "feedback": "Excellent project!"
  },
  "phaseGrades": [
    {
      "id": "phase-submission-id",
      "phaseId": "phase-id",
      "phaseNumber": 1,
      "phaseTitle": "Phase One",
      "groupGrade": 90,
      "individualGrade": 92,
      "maxGrade": 100,
      "status": "graded",
      "gradedAt": "2025-11-02T12:00:00",
      "gradedBy": "professor-id",
      "feedback": "Good submission!"
    }
  ],
  "project": {
    "id": "project-id",
    "title": "Project Name"
  }
}
```

### 2. Frontend Changes (CourseStudentDashboard.js)

#### Updated `loadGradesOverview()` function
**Location**: Lines 1701-1734 (CourseStudentDashboard.js)

**Changes**:
- Removed `window.supabase` calls
- Uses `fetch()` to call `/api/student/grades/overview` endpoint
- Simplified because backend does all grade processing
- API response is used directly (backend already extracted individual/group grades)

**Key Points**:
- Uses `apiConfig.baseURL` for API URL construction
- Sends authorization token in headers
- Sets `setGradesLoading()` state during fetch
- Stores response in `gradesOverview` state

#### Updated `loadDetailedGrades()` function
**Location**: Lines 1737-1768 (CourseStudentDashboard.js)

**Changes**:
- Removed `window.supabase` calls
- Uses `fetch()` to call `/api/student/grades/project/:projectId` endpoint
- Removed all manual grade extraction logic (backend handles it)
- Sets `setDetailedGrades()` with API response

**Key Points**:
- API endpoint is project-specific (takes projectId as parameter)
- Response already contains structured data (projectGrade, phaseGrades, project)
- No need for filtering by group ID (backend handles authorization)

#### Updated `getAllGrades()` helper function
**Location**: Lines 10597-10628 (CourseStudentDashboard.js)

**Changes**:
- Updated field names to match new API response structure
- Uses `groupGrade`, `individualGrade`, `maxGrade` instead of old names
- Removed references to non-existent fields like `includedByLeader`

#### Updated grade display section
**Location**: Lines 10855-10877 (CourseStudentDashboard.js)

**Changes**:
- Updated info display to show: Status, Graded By, Feedback
- Removed "Included by Leader" (not in new schema)
- Added proper date formatting for gradedAt

## Data Flow Diagram

```
┌──────────────────────────────────┐
│   CourseStudentDashboard.js      │
│   (Frontend)                     │
└────────────┬─────────────────────┘
             │
             │ fetch('/api/student/grades/overview')
             │ fetch('/api/student/grades/project/:id')
             │
             ▼
┌──────────────────────────────────┐
│   server.js                      │
│   (Backend)                      │
│                                  │
│   /api/student/grades/overview   │
│   /api/student/grades/project/:id│
└────────────┬─────────────────────┘
             │
             │ Supabase Query
             │
             ▼
┌──────────────────────────────────┐
│   Supabase Database              │
│                                  │
│ - project_deliverable_submissions│
│ - phase_deliverable_submissions  │
│                                  │
│ Tables contain:                  │
│ - grade (group grade column)     │
│ - member_tasks (array with      │
│   individual_grade per member)   │
└──────────────────────────────────┘
```

## Grade Extraction Logic

### For Group Grade
```
groupGrade = submission.grade  // Direct from "grade" column
```

### For Individual Grade
```
// Find current user in member_tasks array
const userTask = submission.member_tasks.find(m => m.member_id === userId)

// Extract individual grade (can be string or number)
individualGrade = userTask?.individual_grade
```

### Example from Database
In the provided sample data:
```
// Project Deliverable Submission
"member_tasks": [
  {
    "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",  // Nopi
    "individual_grade": 95
  },
  {
    "member_id": "1236a30d-544c-451f-8a05-0ad41fc27822",  // Ivy
    "individual_grade": 50
  }
]
"grade": "95.00"  // Group grade (same column as Professor uses)
```

## Testing Checklist

- [x] Backend endpoints created and logging properly
- [x] Frontend functions updated to use new endpoints
- [x] Grade extraction logic matches Professor Dashboard
- [x] Both individual and group grades extracted correctly
- [x] Phase-level and project-level grades supported
- [x] Proper error handling in place
- [x] Authorization checks on backend

## Files Modified

1. **Backend**: `server.js`
   - Added `/api/student/grades/overview` (lines 13256-13305)
   - Added `/api/student/grades/project/:projectId` (lines 13307-13385)

2. **Frontend**: `CourseStudentDashboard.js`
   - Updated `loadGradesOverview()` (lines 1701-1734)
   - Updated `loadDetailedGrades()` (lines 1737-1768)
   - Updated `getAllGrades()` (lines 10597-10628)
   - Updated grade display UI (lines 10855-10877)
   - Updated sorting logic (lines 10640-10657)

## Alignment with Professor Dashboard

The implementation now matches how the Professor Dashboard fetches grades:

| Aspect | Professor | Student |
|--------|-----------|---------|
| Data Source | `project_deliverable_submissions`, `phase_deliverable_submissions` | Same |
| Group Grade | `submission.grade` column | Same |
| Individual Grade | `member_tasks[].individual_grade` | Same |
| Backend Processing | Yes (in fetchGradeSheetData) | Yes (in new endpoints) |
| API Authorization | Professor auth middleware | Student auth middleware |

## Expected Behavior

1. **Course Overview Tab**
   - If grades exist, "My Grades" sidebar loads without errors
   - Displays list of projects with grades
   - Shows both group and individual scores

2. **My Grades Tab**
   - Can view overview of all project grades
   - Can select a project to see detailed grade breakdown
   - Can see both project-level and phase-level grades

3. **Grade Display**
   - Group Grade: Shows the overall group score
   - Individual Grade: Shows personalized score (can differ from group)
   - Status: Shows submission status (graded, submitted, etc.)
   - Feedback: Shows instructor comments
   - Graded By: Shows professor name (if available)

## Notes

- The Professor Dashboard's Grade Sheet uses the same tables and extraction logic
- If grades aren't showing in My Grades, check:
  1. Are submissions graded? (grade column is not null)
  2. Are member_tasks populated? (should contain individual grades)
  3. Is current user in member_tasks array?
  4. Check backend logs for API endpoint responses

- Individual grade can be same as or different from group grade
- Both are optional (can be null if not graded yet)
- Only submissions with at least one grade (individual or group) are shown
