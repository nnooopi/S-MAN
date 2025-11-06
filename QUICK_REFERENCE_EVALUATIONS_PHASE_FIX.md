# Quick Reference: Evaluation Cards & Phase Circles

## The Issue (In Plain English)

**Before Fix:**
- Project Dashboard evaluated the current phase ONLY between its start_date and end_date
- When the evaluation phase arrived (after a phase ended + breathing days), the system didn't know it was still the same phase's evaluation window
- Result: Evaluation cards were hidden because they couldn't find a current phase to attach to

**After Fix:**
- Current phase now extends through the evaluation window
- System knows "we're still in Phase 1, just the evaluation part"
- Evaluation cards display correctly because they belong to the current phase

## How It Works

```
Phase 1: Jan 1-10     ← Regular work period (status: 'active')
         Jan 11       ← Breathe days (1 day - no work, no eval)
         Jan 12-13    ← Evaluation days (2 days - NOW currentPhase = Phase 1 'evaluation window')
Phase 2: Jan 14-20    ← Next phase begins
```

## Key Files & Functions

### `detectCurrentPhase(phases)` - Line 4072
- Runs when project is selected to determine which phase is currently active
- NOW checks: `phase.start_date ≤ now ≤ phase.end_date` **OR** `phase.evaluation_available_from ≤ now ≤ phase.evaluation_due_date`

### Evaluations Column Filter - Line 6640
- Shows only evaluations where `status === 'active'`
- Backend calculates status based on date/time

## Common Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| During Phase work period | Evaluations show = NO, Phase = Current, Tasks = Show |
| During Breathe days | Evaluations show = NO, Phase = Current, Tasks = NO |
| During Evaluation window | Evaluations show = YES, Phase = Current, Scores/submissions = Show |
| Between phases (outside all windows) | Evaluations show = NO, Phase = Previous, Tasks = NO |

## Debugging Checklist

- [ ] Is `evaluation_available_from` set on the phase? (Backend sets this during project creation)
- [ ] Is today's date between `evaluation_available_from` and `evaluation_due_date`?
- [ ] Does backend evaluation query return `status: 'active'` for evaluations?
- [ ] Does frontend filter show only `status === 'active'` evaluations?
- [ ] Does `currentPhase` = the phase you're expecting?

## Check Console Logs

```
🔍 [PHASE DEBUG] Detecting current phase...
   → Should see both phase window AND evaluation window info

📊 [EVALUATIONS DEBUG]
   → Should see active: X (if X > 0, cards will show)
```

## If Evaluations Still Don't Show

1. Check if `currentPhase` is null → issue with phase detection
2. Check if evaluations are returned from backend → check `/api/student/projects/{id}/evaluations`
3. Check if evaluations have `status: 'active'` → check backend date calculations
4. Check browser console for errors → might be JSON parsing issue

## Related Code Sections

- **Backend evaluation endpoint**: `server.js:11454`
- **Frontend phase detection**: `CourseStudentDashboard.js:4072`
- **Frontend evaluation rendering**: `CourseStudentDashboard.js:6620`
- **EvaluationModal component**: Shows evaluation details when card is clicked
