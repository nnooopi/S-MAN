# Timeline Display Debug Guide

**Issue**: Project Timeline only showing START → PHASE 1 → DUE DATE (missing EVALUATION and BREATHE phases)

## Debug Steps

### 1. Open Browser Console (F12)
When the Project Timeline modal opens, you should see logs like:

```javascript
🔍 [TIMELINE MODAL DEBUG] selectedProject: {
  title: "Project Name",
  phaseCount: 1,
  breathe_phase_days: 2,
  first_phase: {
    phase_number: 1,
    evaluation_available_from: "2025-10-28T...",
    evaluation_due_date: "2025-10-29T..."
  }
}

🔍 [TIMELINE DEBUG] Phase 1: {
  id: "...",
  isLastPhase: true,
  breathe_phase_days: 2,
  evaluation_available_from: "2025-10-28T...",
  evaluation_due_date: "2025-10-29T...",
  hasEvalDates: true,
  shouldShowBreath: true,
  shouldShowEval: true
}
```

## Possible Issues & Solutions

### Issue 1: `breathe_phase_days` is 0, null, or undefined
**Symptom**: Breathe phase doesn't appear  
**Solution**: Check that project has `breathe_phase_days > 0` set  
**Location**: In database, `projects` table, column `breathe_phase_days`

### Issue 2: `evaluation_available_from` or `evaluation_due_date` are null
**Symptom**: Evaluation phase doesn't appear  
**Solution**: Backend needs to calculate and return these fields  
**Location**: Backend should auto-calculate on project creation/fetch:
```sql
evaluation_available_from = phase.end_date + breathe_phase_days
evaluation_due_date = evaluation_available_from + evaluation_phase_days
```

### Issue 3: selectedProject doesn't have phases data
**Symptom**: Modal shows but no phases  
**Solution**: Ensure project is fetched WITH joined `project_phases` table  
**Location**: API endpoint `/api/student-leader/projects`

### Issue 4: `isLastPhase` is always false (evaluation never shows)
**Symptom**: Multiple phases exist but evaluation never shows  
**Solution**: Make sure evaluation_available_from/due_date exist on LAST phase  
**Location**: Ensure backend calculates dates for all phases, especially last one

---

## What Should Be Displayed

### Current (Broken)
```
[START Oct 24] → [PHASE 1 Oct 24-26] → [DUE DATE Oct 28]
```

### Expected (Fixed)
```
[START Oct 24] → [PHASE 1 Oct 24-26] → [EVAL Oct 27-29] → [BREATHE 2d] → [DUE DATE Oct 28]
```

---

## Check Backend API Response

Run this in browser console:
```javascript
fetch('/api/student-leader/projects')
  .then(r => r.json())
  .then(data => {
    console.log('First project:', data.projects[0]);
    console.log('First phase:', data.projects[0].project_phases[0]);
  });
```

**Check for these fields in first phase**:
- ✅ `evaluation_available_from` - Should have a date
- ✅ `evaluation_due_date` - Should have a date
- ✅ `breathe_phase_days` - On parent project, should be > 0

---

## Rendering Logic

The timeline only shows evaluation/breathe IF:

1. **Evaluation Phase**:
   - Only for LAST phase: `isLastPhase === true`
   - AND has dates: `phase.evaluation_available_from && phase.evaluation_due_date`

2. **Breathe Phase**:
   - For ANY phase (but AFTER evaluation if last)
   - Only if configured: `selectedProject.breathe_phase_days > 0`

---

## Next Steps

1. **Check console logs** when modal opens
2. **Verify phase data** from API response
3. **If dates missing**: Backend needs to calculate evaluation_available_from and evaluation_due_date
4. **If breathe_phase_days = 0**: Update project configuration
5. **Report findings** with console output

---

## Console Log Locations

When debugging, these console logs will appear:

```
[In Project Dashboard Render]
🔍 [TIMELINE MODAL DEBUG] selectedProject: {...}

[Per Phase in Loop]
🔍 [TIMELINE DEBUG] Phase 1: {...}
🔍 [TIMELINE DEBUG] Phase 2: {...}
🔍 [TIMELINE DEBUG] Phase 3: {...}
```

Check each log to see:
- Is `hasEvalDates` true or false?
- Is `shouldShowBreath` true or false?
- Is `shouldShowEval` true or false?

If any of these are false when they should be true, that's where the bug is!
