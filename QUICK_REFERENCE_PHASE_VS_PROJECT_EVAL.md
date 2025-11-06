# Quick Reference: Phase vs Project Evaluations on Timeline

## What Changed?

The Project Timeline Modal now shows **TWO evaluation cards** on the last phase:
1. **Phase Evaluation** (Purple) - from `phase_evaluation_forms` table
2. **Project Evaluation** (Green) - from `project_evaluation_forms` table

---

## Visual Timeline

```
START → PHASE 1 → PHASE 2 → [PHASE EVAL] → [PROJECT EVAL] → BREATHE → DUE DATE
                             (Purple)        (Green)        (Orange)
```

---

## How It Works

| Component | Source Table | Color | Data Fields | When Shows |
|-----------|--------------|-------|-------------|-----------|
| Phase Eval | `phase_evaluation_forms` | Purple #8B5CF6 | `available_from`, `due_date` | Last phase only, if dates exist |
| Project Eval | `project_evaluation_forms` | Green #10B981 | `available_from`, `due_date` | Last phase only, if exists |
| Breathe Phase | `projects.breathe_phase_days` | Orange #F59E0B | `breathe_phase_days` | After all evals, if days > 0 |

---

## Backend Changes

**Endpoint**: `GET /api/student-leader/projects`

**New Query**:
```javascript
project_evaluation_forms(
  id,
  available_from,
  due_date,
  instructions,
  total_points
)
```

**New Response Field**:
```javascript
project_evaluation_forms: [
  {
    available_from: "2025-10-26T16:00:00+00:00",
    due_date: "2025-10-28T15:59:59.999+00:00",
    ...
  }
]
```

---

## Frontend Changes

**File**: `frontend/src/components/CourseStudentDashboard.js`
**Lines**: 7595-7719

**Key Code**:
```javascript
{/* Phase Evaluation - Purple */}
{isLastPhase && (phase.evaluation_available_from && phase.evaluation_due_date) && (
  <div>Phase Eval Card here...</div>
)}

{/* Project Evaluation - Green */}
{selectedProject.project_evaluation_forms && 
 selectedProject.project_evaluation_forms.length > 0 && (
  <div>Project Eval Card here...</div>
)}
```

---

## Testing Steps

1. **Start backend**: `npm start` in `/backend`
2. **Refresh frontend**: Open browser
3. **Open Project Timeline Modal**
4. **Check console**: 
   ```javascript
   console.log('Project Evals:', selectedProject.project_evaluation_forms)
   ```
5. **Verify timeline shows**:
   - Purple Phase Eval card
   - Green Project Eval card
   - Both with correct dates

---

## Expected Timeline Order (Last Phase Section)

```
PHASE 1
  ↓
  ↓ Connector Line
  ↓
PHASE EVALUATION (Purple)
  Oct 26, 04:00 PM → Oct 28, 03:59 PM
  ↓
  ↓ Connector Line
  ↓
PROJECT EVALUATION (Green)
  Oct 26, 04:00 PM → Oct 28, 03:59 PM
  ↓
  ↓ Connector Line
  ↓
BREATHE PHASE (Orange, 2 days)
  ↓
  ↓ Connector Line
  ↓
DUE DATE
  Oct 28, 12:00 AM
```

---

## Debug Console Output

When timeline loads, check console for:
```
🔍 [TIMELINE MODAL DEBUG] selectedProject: {
  title: "Project Name",
  phaseCount: 2,
  breathe_phase_days: 2,
  first_phase: { ... }
}

🔍 [TIMELINE DEBUG] Phase 1: {
  id: "...",
  isLastPhase: false,
  evaluation_available_from: "2025-10-26T16:00:00+00:00",
  evaluation_due_date: "2025-10-28T15:59:59.999+00:00",
  ...
}

🔍 [TIMELINE DEBUG] Phase 2: {
  id: "...",
  isLastPhase: true,  // ← Last phase shows both evals
  ...
}
```

---

## Common Issues & Fixes

### Issue: Only one eval shows (not both)
- Check backend restarted (server.js changes need restart)
- Check `project_evaluation_forms` exists in database
- Verify project has project_evaluation_forms entry

### Issue: Dates show as "TBA"
- Verify `project_evaluation_forms` has `available_from` and `due_date` filled
- Check database record: `SELECT * FROM project_evaluation_forms`

### Issue: Green card not showing
- Check `selectedProject.project_evaluation_forms` array length > 0
- Verify database has `project_evaluation_forms` entries for this project

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `backend/student-leader-api.js` | 45-130 | Added `project_evaluation_forms` to query |
| `frontend/src/components/CourseStudentDashboard.js` | 7595-7719 | Added green project eval card |

---

## Deployment Checklist

- [ ] Restart backend: `npm start` in backend folder
- [ ] Refresh frontend page (Ctrl+R or Cmd+Shift+R)
- [ ] Open Project Timeline Modal
- [ ] Verify both purple and green eval cards appear
- [ ] Check dates display correctly
- [ ] Test with multiple projects if available

---

## Database Verification

```sql
-- Check if project has evaluation forms
SELECT * FROM project_evaluation_forms 
WHERE project_id = 'ce6cfb75-ea75-4c4e-94c2-18ecda401992';

-- Expected result:
-- id | project_id | available_from | due_date | ...
-- 2a0cd999-15c7-4fe5-bb0b-7efecd83d8a5 | ce6cfb75-ea75-4c4e-94c2-18ecda401992 | 2025-10-26 16:00:00+00 | 2025-10-28 15:59:59.999+00
```

---

## Color Reference

```
Purple #8B5CF6 = Phase Evaluation Form (1 per phase)
Green  #10B981 = Project Evaluation Form (1 per project)
Orange #F59E0B = Breathe Phase (days between phases)
Black  #000000 = Regular phases
```

