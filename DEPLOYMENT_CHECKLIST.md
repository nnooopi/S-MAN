# Deployment and Verification Checklist

## Pre-Deployment Verification

- [x] All INNER JOINs removed from student-leader-api.js (8 locations)
- [x] Group detection fallback logic implemented
- [x] Debug endpoint added to server.js
- [x] Error handling enhanced with better messages
- [x] All changes tested for syntax errors
- [x] No database migrations required
- [x] No new dependencies added
- [x] Backward compatible with existing code

---

## Post-Deployment Verification

### 1. Projects Endpoint Test
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student-leader/projects
```

**Checks**:
- [ ] Status code is 200 (not 500)
- [ ] Returns an array of projects
- [ ] Each project has: id, title, description, course_name
- [ ] Missing courses show "Unknown Course"
- [ ] Missing professors show "Unknown Professor"

**Expected Response**:
```json
{
  "success": true,
  "projects": [
    {
      "id": "...",
      "title": "Project Name",
      "course_name": "Course Name or Unknown Course",
      "project_phases": [ ... ]
    }
  ],
  "count": 1
}
```

---

### 2. Group Membership Debug Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student/debug/group-membership-detailed
```

**Checks**:
- [ ] Status code is 200
- [ ] Returns `debug_info` object
- [ ] Shows active_count, inactive_count, total_count
- [ ] If student is in a group, total_count > 0
- [ ] Group details populated with group, course, member info

**Expected Response Structure**:
```json
{
  "student_id": "...",
  "debug_info": {
    "active_memberships": [ ... ],
    "active_count": 1,
    "inactive_memberships": [],
    "inactive_count": 0,
    "all_memberships": [ ... ],
    "total_count": 1
  },
  "group_details": [ ... ],
  "errors": {}
}
```

---

### 3. Member Submissions Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/student-leader/projects/PROJECT_ID/members
```

**Checks**:
- [ ] Status code is 200
- [ ] Returns members array
- [ ] Each member has: student_id, role, studentaccounts data
- [ ] No 500 errors about missing relationships

---

### 4. Submission Checking Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/submission-checking/PROJECT_ID/phase/PHASE_ID"
```

**Checks**:
- [ ] Status code is 200
- [ ] Returns submissions array (not empty "Student is not in any group")
- [ ] Log messages show group detection working
- [ ] Check server logs for detection messages

**Expected Log Output**:
```
🔍 [Submission Checking] Found ACTIVE group memberships: [ ... ]
✅ Group members: [ ... ]
✅ Found tasks: 5
✅ Found submissions: 3
```

---

### 5. Error Handling Test
Try endpoints with:
- Missing authentication
- Invalid project IDs
- Invalid phase IDs
- Student not in any group

**Checks**:
- [ ] Errors are clear and informative
- [ ] Status codes are appropriate (400, 401, 403, 404, 500)
- [ ] No silent failures
- [ ] Server logs have details

---

## Server Log Inspection

After running tests, check server logs for:

```
✅ EXPECTED LOGS:
🔍 Fetching active projects for student leader...
✅ Found X active projects
🔍 [Submission Checking] Found ACTIVE group memberships: [...]
✅ Group members: [...]

⚠️ OK WARNINGS:
⚠️ No active group memberships found. Checking for any groups...
⚠️ Student HAS group memberships but with is_active issues: [...]

❌ NOT EXPECTED:
500 errors
Unhandled promise rejections
"courses!inner" errors
"studentaccounts!inner" errors
```

---

## Frontend Testing

If frontend is accessible, test:

1. **Course Overview** → Should load without errors
2. **Project Dashboard** → Should display projects
3. **Submission Checking** → Should show group submissions
4. **Member Submissions** → Should show member submissions
5. **Leader Features** → Should work for group leaders

---

## Data Integrity Checks

Run these database queries to identify potential data issues:

```sql
-- 1. Check for projects without courses
SELECT id, title, course_id FROM projects WHERE course_id IS NULL;
-- Expected: 0 rows

-- 2. Check for group memberships with NULL is_active
SELECT * FROM course_group_members WHERE is_active IS NULL;
-- Expected: 0 rows or acceptable count

-- 3. Check for tasks without phases
SELECT id, title FROM tasks WHERE phase_id IS NULL;
-- Expected: 0 rows or minimal count

-- 4. Check for orphaned relationships
SELECT p.id FROM projects p 
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = p.course_id);
-- Expected: 0 rows
```

---

## Performance Check

Monitor for:
- [ ] No significant increase in database queries
- [ ] No N+1 query problems
- [ ] Response times < 2 seconds
- [ ] Memory usage stable

**Commands to Monitor**:
```bash
# Monitor CPU/Memory
top -p $(pgrep -f "node.*server.js")

# Monitor network
netstat -an | grep ESTABLISHED | wc -l

# Check for slow queries (if using Supabase)
# Check Supabase dashboard for query performance
```

---

## Rollback Plan (if needed)

If issues occur:

1. **Revert changes**:
   ```bash
   git checkout HEAD~1 backend/student-leader-api.js
   git checkout HEAD~1 backend/server.js
   ```

2. **Restart backend**:
   ```bash
   npm restart
   ```

3. **Clear browser cache**:
   - Ctrl+Shift+Delete (Chrome)
   - Or use incognito/private window

4. **Document the issue** and create a bug report

---

## Approval Checklist

Once all verification steps pass:

- [ ] All endpoints return 200 status (not 500)
- [ ] Group membership detection works for all students
- [ ] Debug endpoint provides useful information
- [ ] Server logs are clear and informative
- [ ] Frontend features work correctly
- [ ] Database integrity checks pass
- [ ] Performance is acceptable
- [ ] No regressions observed

---

## Sign-Off

**Verified by**: ________________  
**Date**: ________________  
**Status**: ☐ APPROVED ☐ NEEDS FIXES

**Notes**:
```
[Space for notes]
```

---

## Post-Deployment Monitoring

For the first 24 hours after deployment:

1. Monitor error logs every 4 hours
2. Check if students can access their groups
3. Verify submissions are being tracked
4. Run debug endpoint on random students
5. Check database query performance
6. Monitor backend memory/CPU usage

**Daily Checklist**:
- [ ] No increase in 500 errors
- [ ] Group detection working
- [ ] Submissions tracking correctly
- [ ] Debug endpoint useful for support
