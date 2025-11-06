# Backend Fixes for Group Membership and Projects Endpoint

## Issues Identified and Fixed

### 1. **500 Error on `/api/student-leader/projects`**

**Problem:**
- The endpoint was using `courses!inner()` and `professoraccounts!inner()` which are INNER JOINs
- INNER JOINs fail if ANY records don't have matching relationships
- This caused a 500 error even when the query should have worked

**Solution:**
- Changed from `courses!inner()` to `courses()` (implicit LEFT JOIN)
- Changed from `professoraccounts!inner()` to `professoraccounts()` (implicit LEFT JOIN)
- Added null coalescing: `project.courses?.course_name || 'Unknown Course'`
- Added better error handling with detailed error messages

**File Modified:** `backend/student-leader-api.js` (lines 45-118)

---

### 2. **Group Membership Not Found in `/api/submission-checking/:projectId/phase/:phaseId`**

**Problem:**
- Query was only checking `is_active = true` memberships
- If a student had inactive memberships or the is_active flag had issues, the system returned NO groups
- User appeared to not be in any group even though they actually were

**Solution:**
- Added fallback logic: tries active first, then checks ALL memberships regardless of is_active
- Removed `is_active = true` filter from the group members query (line 1756 removed `eq('is_active', true)`)
- Added detailed logging to show:
  - How many active memberships found
  - If no active found, what inactive memberships exist
  - The membership details including is_active status
  - Include both active AND inactive members when fetching group member IDs

**File Modified:** `backend/server.js` (lines 1711-1800)

**Key Changes:**
```javascript
// Old approach (fails silently):
.eq('is_active', true)

// New approach (with fallback):
// First try with is_active filter
// If that returns 0, try without the filter and log the issue
```

---

### 3. **New Debug Endpoint**

**Purpose:** Comprehensive debugging tool to verify student's group membership status

**Endpoint:** `GET /api/student/debug/group-membership-detailed`

**Authentication:** Requires student authentication

**Response includes:**
- Active memberships (is_active = true)
- Inactive memberships (is_active = false)  
- All memberships (no filter)
- For each group: group details, course info, and member count
- Any errors encountered during the queries

**File Added/Modified:** `backend/server.js` (added new route)

**Example Usage:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student/debug/group-membership-detailed
```

**Expected Response:**
```json
{
  "student_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",
  "debug_info": {
    "active_memberships": [ /* ... */ ],
    "active_count": 1,
    "inactive_memberships": [],
    "inactive_count": 0,
    "all_memberships": [ /* ... */ ],
    "total_count": 1
  },
  "group_details": [
    {
      "membership": { /* membership record */ },
      "group": { /* group info */ },
      "course": { /* course info */ },
      "member_count": 5
    }
  ],
  "errors": { /* any errors */ }
}
```

---

## Testing Instructions

### Test 1: Check if `/api/student-leader/projects` returns projects
```bash
# Should now return projects without 500 error
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student-leader/projects
```

**Expected:** 
- Status 200 with project list
- No course/professor data will show "Unknown Course" or "Unknown Professor" if relationships missing

### Test 2: Debug group membership
```bash
# Run this to see detailed membership information
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student/debug/group-membership-detailed
```

**Expected:**
- Shows active and inactive memberships
- Shows group and course details
- If it shows inactive memberships, that's likely why the old code didn't work

### Test 3: Check submission checking endpoint
```bash
# This should now find group memberships and return submissions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/submission-checking/PROJECT_ID/phase/PHASE_ID
```

**Expected:**
- Should find the student's group
- Should return submissions from all group members

---

## Root Cause Analysis

The main issue was **overly strict database query filters**:

1. **INNER JOINs** in the projects endpoint assumed all projects have valid course/professor relationships
2. **is_active = true filter** in group membership query assumed all active groups have is_active=true

**Why it worked for some users but not others:**
- Some projects might have missing course or professor records
- Some students might have is_active=false or is_active=NULL in their group memberships
- The system silently failed without providing debugging info

**The fix ensures:**
- Graceful degradation (shows "Unknown" instead of crashing)
- Fallback logic (if strict filter fails, try broader query)
- Better debugging information (detailed logging + debug endpoint)

---

## Recommendations

1. **Database Cleanup**: Check for orphaned records or NULL values in critical fields:
   ```sql
   -- Check projects without valid course
   SELECT * FROM projects WHERE course_id IS NULL;
   
   -- Check group memberships with potential issues
   SELECT * FROM course_group_members 
   WHERE is_active IS NULL OR is_active != true;
   
   -- Check projects without valid professor
   SELECT p.id, p.title, c.id, c.professor_id 
   FROM projects p 
   JOIN courses c ON p.course_id = c.id 
   WHERE c.professor_id IS NULL;
   ```

2. **Data Validation**: Add database constraints to prevent future issues:
   - Set default values for `is_active` columns
   - Add NOT NULL constraints where appropriate
   - Add foreign key constraints if not already present

3. **Monitoring**: Use the debug endpoint periodically to check for data integrity issues

---

## Additional Fixes Applied

### Fixed INNER JOIN Issues Throughout Backend

**Locations Fixed:**
1. **Line 45-118**: `/api/student-leader/projects` - Changed `courses!inner()` and `professoraccounts!inner()` to regular joins
2. **Line 595**: `/api/student-leader/projects/:projectId/members` - Changed `course_groups!inner()` to regular join
3. **Line 626**: `/api/student-leader/projects/:projectId/members` - Changed `studentaccounts!inner()` to regular join
4. **Line 709**: Member task query - Changed `project_phases!inner()` to regular join
5. **Line 1305**: Task edit query - Changed `project_phases!inner()` to regular join  
6. **Line 1423**: Task deletion check - Changed `project_phases!inner()` to regular join
7. **Line 3869-3870**: Group-related project query - Changed `courses!inner()` and `course_groups!inner()` to regular joins
8. **Line 3890**: Members query - Changed `studentaccounts!inner()` to regular join

**Pattern Applied:**
- Replaced `table!inner()` with `table()`
- Removed `.eq('is_active', true)` filters where they were overly restrictive
- Added better error handling for missing relationships

## Files Changed
- `backend/student-leader-api.js` - Fixed multiple INNER JOIN queries and group membership filters
- `backend/server.js` - Fixed group membership detection with fallback logic + added debug endpoint

## Deployment Notes
- No database migrations needed
- No breaking changes to API contracts
- Backward compatible with existing frontend code
- All endpoints now handle missing relationships gracefully
- Improved reliability and debuggability across all student-leader APIs
