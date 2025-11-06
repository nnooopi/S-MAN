# Quick Reference: Backend Error Fixes

## Problem: 500 Errors + Missing Group Detection

### Root Causes
1. **INNER JOINs crashed on missing relationships** (8 locations)
2. **Over-strict is_active filters** hid group memberships

### Solutions Applied
1. ✅ Changed `table!inner()` → `table()` (LEFT JOIN)
2. ✅ Added fallback group detection logic
3. ✅ Added debug endpoint for verification

---

## Quick Tests

### 1. Is the Projects Endpoint Fixed?
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/student-leader/projects
```
✅ Should return 200 with projects (not 500 error)

### 2. Can We Detect Group Memberships?
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/student/debug/group-membership-detailed
```
✅ Should show `"total_count": 1` (or higher) if student is in a group

### 3. Do Submissions Load?
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/submission-checking/PROJECT_ID/phase/PHASE_ID
```
✅ Should return submissions (not "Student is not in any group")

---

## What Changed

| What | Before | After |
|------|--------|-------|
| Projects endpoint | ❌ 500 error | ✅ 200 OK |
| Group detection | ❌ Empty array | ✅ Finds groups |
| Submissions | ❌ "Not in group" | ✅ Returns submissions |
| Missing data | ❌ Crashes | ✅ Shows "Unknown" |

---

## Files Modified
- `backend/student-leader-api.js` - 8 query fixes
- `backend/server.js` - Group detection fix + debug endpoint

---

## Debug Command
If issues persist, run this to see detailed group membership info:

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/student/debug/group-membership-detailed | jq
```

Response shows:
- Active/inactive memberships
- Group details
- Course info
- Member count in each group
