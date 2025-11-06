# My Grades - Quick Reference

## Problem
Student Dashboard "My Grades" tab wasn't showing grades - error: "Cannot read properties of undefined (reading 'from')"

## Root Cause
Frontend was trying to use `window.supabase` directly, but Supabase is only configured on the backend.

## Solution
Created backend API endpoints to fetch grades from Supabase, frontend uses HTTP requests to these endpoints.

## API Endpoints Created

### 1. Get Grades Overview
```
GET /api/student/grades/overview
Authorization: Bearer {token}
```
Returns all project grades for current user (quick overview)

### 2. Get Project Detailed Grades
```
GET /api/student/grades/project/{projectId}
Authorization: Bearer {token}
```
Returns both project-level and phase-level grades for a specific project

## What Changed

### Backend (server.js)
- Added new endpoints that:
  1. Fetch deliverable submissions from Supabase
  2. Extract individual grades from `member_tasks` array
  3. Extract group grades from `grade` column
  4. Return processed data to frontend

### Frontend (CourseStudentDashboard.js)
- Updated `loadGradesOverview()` to call backend API
- Updated `loadDetailedGrades()` to call backend API
- No more direct Supabase access
- No more manual grade extraction

## How Grades Are Extracted

**Group Grade**: `submission.grade` (the overall grade column)
**Individual Grade**: `submission.member_tasks.find(m => m.member_id === userId).individual_grade`

## Files Modified
1. `backend/server.js` - Added 2 new API endpoints
2. `frontend/src/components/CourseStudentDashboard.js` - Updated grade loading functions

## Testing
1. Navigate to "My Grades" in Student Dashboard
2. Should see list of projects with grades
3. Can click on a project to see detailed breakdown (phases + overall)
4. Each grade shows: Group Grade, Individual Grade, Status, Feedback, Professor name

## If Grades Still Don't Show
Check:
1. Are there graded submissions in the database? (grade column not null)
2. Does the submission have member_tasks populated?
3. Is the current student in the member_tasks array?
4. Check browser console for any error messages
5. Check server logs for API endpoint responses
