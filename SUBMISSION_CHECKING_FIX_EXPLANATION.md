# Submission Checking Fix - Session October 18, 2025

## Problem Summary
When user logged out and logged back in, submissions disappeared from the Submission Checking view. The backend logs showed:
```
❌ [Submission Checking] Found course groups: 0
⚠️ No active groups in this course
```

However, the student IS in a group (confirmed by the database data you provided and the earlier `User memberships` logs).

## Root Cause
The submission checking endpoint at `/api/submission-checking/:projectId/phase/:phaseId` was using `supabaseAdmin` client which wasn't defined. However, the REAL issue was that even the regular `supabase` client in the code was being used inconsistently.

The `supabase` client in `server.js` is already initialized with the **service role key**, which means it has admin/bypass permissions. The issue was trying to use a non-existent `supabaseAdmin` variable.

## Solution Applied
Changed all queries in the submission checking endpoint to use the regular `supabase` client (which already has service role permissions):

**File Modified**: `backend/server.js`

**Queries Updated** (Lines 1741-1970):
1. `course_groups` query - now uses `supabase` instead of `supabaseAdmin`
2. `course_group_members` (membership check) - now uses `supabase`
3. `course_group_members` (get all members) - now uses `supabase`
4. `tasks` query - now uses `supabase`
5. `task_submissions` query - now uses `supabase`
6. `task_feedback` query - now uses `supabase`
7. `studentaccounts` query - now uses `supabase`

## Data Flow (How It Works)
1. **User logs in** → Backend authenticates token and retrieves user ID
2. **User selects course** → Frontend loads course projects
3. **User opens submission checking** → 
   - Frontend: `GET /api/submission-checking/:projectId/phase/:phaseId`
   - Backend:
     a. Gets project's course_id (e.g., `bc074d58-8244-403f-8eb5-b838e189acea`)
     b. Queries `course_groups` for that course (e.g., finds Group 1)
     c. Checks if logged-in student is in ANY of these groups
     d. Gets ALL members from that group (to see their submissions)
     e. Gets tasks assigned to those group members
     f. Gets submissions for those tasks
     g. Returns only submissions from student's own group (NOT other groups)

## Why This Fixes The Issue
- The `supabase` client already has admin/service role permissions
- No need for separate `supabaseAdmin` - it doesn't exist
- RLS policies bypass works with the service role key
- When student logs in, they can now:
  - See their own group's submissions
  - NOT see other groups' submissions (security maintained)
  - See all submissions from group members (same group)

## Expected Behavior After Fix
1. Student logs in ✓
2. Student selects course ✓
3. Student opens submission checking for a project/phase ✓
4. Student sees submissions from their group members ✓
5. Student CANNOT see submissions from other groups ✓

## Verification Steps
1. Restart backend server: `npm start` in `/backend` directory
2. Login as student `mbsoriano4936val@student.fatima.edu.ph`
3. Select course IT CAPSTONE PROJECT (ITCP311)
4. Go to Submission Checking
5. Select a project (e.g., "Test project date")
6. Select a phase (e.g., "phase 2 testing")
7. **Expected**: See submissions from Group 1 members
8. **Verify logs**: Should see `✅ Found course groups: 1` and `✅ Group members: [...]`

## Technical Details
- Service role key in use: `SUPABASE_SERVICE_ROLE_KEY`
- Authentication: Still required via `authenticateStudent` middleware
- Authorization: Group membership still enforced (can only see own group's submissions)
- Database: `course_groups` → `course_group_members` → `task_submissions`
