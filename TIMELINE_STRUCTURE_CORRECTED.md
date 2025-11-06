# Correct Timeline Structure: Phase and Project Evaluations

**Updated**: October 24, 2025
**Status**: ✅ Fixed
**Key Change**: Evaluation phases now appear AFTER EVERY PHASE, not just the last one

---

## Corrected Understanding

Your system has a specific timeline structure where:

1. **Each Phase has an Evaluation Phase** - After every phase ends, there's an evaluation window
2. **Same Evaluation Form is Reused** - The `phase_evaluation_forms` table has ONE entry per phase, but it's asked to be submitted repeatedly during the evaluation phase
3. **Project Evaluation Only on Last** - The `project_evaluation_forms` appears ONLY during the LAST evaluation phase
4. **Breathe Phase is Optional** - Between each evaluation and next phase, there's an optional "breathe" period

---

## Timeline Structure

```
START
  ↓
PHASE 1 (Oct 24 - Oct 26)
  ↓
EVALUATION PHASE (Purple) (Oct 26, 4pm - Oct 28, 4pm)
  ↓
BREATHE PHASE (Orange, 2 days) [if enabled]
  ↓
PHASE 2 (Oct 28 - Oct 30)
  ↓
EVALUATION PHASE (Purple) (Oct 30, 4pm - Nov 1, 4pm)
  ↓
BREATHE PHASE (Orange, 2 days) [if enabled]
  ↓
PHASE 3 (Nov 1 - Nov 3)
  ↓
EVALUATION PHASE (Purple + Green) (Nov 3, 4pm - Nov 5, 4pm)
  ├─ Purple: Phase Evaluation (for Phase 3)
  └─ Green: Project Evaluation (for entire project - ONLY HERE)
  ↓
BREATHE PHASE (Orange, 2 days) [if enabled]
  ↓
DUE DATE (Nov 5, 12am)
```

---

## Database Tables

### `phase_evaluation_forms`
- **One per phase** - Each phase has exactly one evaluation form
- **Fields**: `available_from`, `due_date`, `instructions`, `total_points`
- **Used**: During the evaluation window after that phase ends
- **Resubmission**: Users can submit this form multiple times during the evaluation window
- **Linked via**: `phase_id` → `project_phases(id)`

**Example**:
```sql
Phase 1 evaluation_form: Oct 26, 4pm - Oct 28, 4pm
Phase 2 evaluation_form: Oct 30, 4pm - Nov 1, 4pm  (REUSED same form structure)
Phase 3 evaluation_form: Nov 3, 4pm - Nov 5, 4pm   (REUSED same form structure)
```

### `project_evaluation_forms`
- **One per project** - Only ONE project evaluation form per project
- **Fields**: `available_from`, `due_date`, `instructions`, `total_points`
- **Used**: ONLY during the last evaluation phase
- **Linked via**: `project_id` → `projects(id)`

**Example**:
```sql
Project evaluation_form appears ONLY on Nov 3, 4pm - Nov 5, 4pm (last evaluation phase)
```

---

## Frontend Timeline Rendering

**File**: `frontend/src/components/CourseStudentDashboard.js` (Lines 7507-7695)

### Logic:
```javascript
selectedProject.project_phases
  .sort((a, b) => a.phase_number - b.phase_number)
  .map((phase, index) => {
    const isLastPhase = index === selectedProject.project_phases.length - 1;
    const hasEvalDates = phase.evaluation_available_from && phase.evaluation_due_date;
    
    return (
      <>
        {/* 1. PHASE CARD */}
        
        {/* 2. EVALUATION PHASE - Show AFTER every phase if it has eval dates */}
        {hasEvalDates && (
          <>
            {/* Purple: Phase Evaluation */}
            
            {/* Green: Project Evaluation - ONLY if isLastPhase */}
            {isLastPhase && project_evaluation_forms.length > 0 && (
              <>Green card</>
            )}
          </>
        )}
        
        {/* 3. BREATHE PHASE - Show after evaluation if breathe_phase_days > 0 */}
      </>
    );
  })
```

### Rendering Order (per phase):
1. **Phase Card** - Black border, shows phase dates
2. **Evaluation Phase** (if has evaluation dates):
   - **Purple Card** - Phase evaluation (always)
   - **Green Card** - Project evaluation (only on last phase)
3. **Breathe Phase** (if breathe_phase_days > 0) - Orange dashed border
4. **Connector Line** - To next phase

---

## Backend API

**File**: `backend/student-leader-api.js` (Lines 45-125)

**GET /api/student-leader/projects**:
```javascript
.select(`
  ...
  project_phases(
    id,
    phase_number,
    title,
    description,
    start_date,
    end_date,
    evaluation_available_from,  // ← From phase_evaluation_forms
    evaluation_due_date         // ← From phase_evaluation_forms
  ),
  project_evaluation_forms(     // ← Added
    id,
    available_from,
    due_date,
    instructions,
    total_points
  )
`)
```

**Response Structure**:
```javascript
{
  project_phases: [
    {
      id: "...",
      phase_number: 1,
      evaluation_available_from: "2025-10-26T16:00:00+00:00",
      evaluation_due_date: "2025-10-28T15:59:59.999+00:00",
      ...
    },
    {
      id: "...",
      phase_number: 2,
      evaluation_available_from: "2025-10-30T16:00:00+00:00",
      evaluation_due_date: "2025-11-01T15:59:59.999+00:00",
      ...
    },
    {
      id: "...",
      phase_number: 3,
      evaluation_available_from: "2025-11-03T16:00:00+00:00",
      evaluation_due_date: "2025-11-05T15:59:59.999+00:00",
      ...
    }
  ],
  project_evaluation_forms: [
    {
      id: "2a0cd999-15c7-4fe5-bb0b-7efecd83d8a5",
      available_from: "2025-11-03T16:00:00+00:00",  // Same as Phase 3 evaluation
      due_date: "2025-11-05T15:59:59.999+00:00",
      instructions: "Rate your groupmates...",
      total_points: 100
    }
  ]
}
```

---

## Color Scheme

| Component | Color | Hex | Icon | When | Notes |
|-----------|-------|-----|------|------|-------|
| Phase | Black | #000000 | Number | Every phase | Normal work period |
| Evaluation Phase | Purple | #8B5CF6 | Clipboard | After every phase | Phase evaluation window |
| Project Evaluation | Green | #10B981 | Clipboard | Last evaluation phase only | Project evaluation |
| Breathe | Orange | #F59E0B | Clock | Between phases | Optional buffer |

---

## Example Scenario

**Project**: "Build a Website"
**Start**: Oct 24, 8:55 PM
**Due**: Nov 5, 12:00 AM
**Phases**: 3
**Breathe Days**: 2 days

### Timeline Display:
```
[Start] Oct 24, 8:55 PM
   ↓
[Phase 1] Oct 24, 8:55 PM - Oct 26, 11:59 PM
   ↓
[Eval Phase] Oct 26, 4:00 PM - Oct 28, 3:59 PM (Purple)
   ↓
[Breathe] 2 days (Orange)
   ↓
[Phase 2] Oct 28, 12:00 AM - Oct 30, 11:59 PM
   ↓
[Eval Phase] Oct 30, 4:00 PM - Nov 1, 3:59 PM (Purple)
   ↓
[Breathe] 2 days (Orange)
   ↓
[Phase 3] Nov 1, 12:00 AM - Nov 3, 11:59 PM
   ↓
[Eval Phase] Nov 3, 4:00 PM - Nov 5, 3:59 PM (Purple + Green)
│
├─ Phase Evaluation (Purple)
└─ Project Evaluation (Green) ← ONLY HERE
   ↓
[Breathe] 2 days (Orange)
   ↓
[Due Date] Nov 5, 12:00 AM
```

---

## Key Implementation Details

### 1. Evaluation Phase Appears After Every Phase
```javascript
{hasEvalDates && (
  <>
    {/* Purple Phase Eval Card */}
  </>
)}
```

### 2. Project Evaluation Only on Last
```javascript
{isLastPhase && selectedProject.project_evaluation_forms?.length > 0 && (
  <>
    {/* Green Project Eval Card */}
  </>
)}
```

### 3. Breathe Phase After Each Evaluation
```javascript
{selectedProject.breathe_phase_days > 0 && (
  <>
    {/* Orange Breathe Card */}
  </>
)}
```

### 4. Connector Lines Between Everything
```javascript
{hasEvalDates && <div style={{...connector...}}></div>}
{selectedProject.breathe_phase_days > 0 && <div style={{...connector...}}></div>}
```

---

## Testing Steps

1. **Restart Backend** (changes to API)
   ```powershell
   npm start
   ```

2. **Refresh Frontend**
   ```
   Ctrl+Shift+R or Cmd+Shift+R
   ```

3. **Open Project Timeline Modal**

4. **Verify Timeline Shows**:
   - [ ] Phase 1 → Eval Phase (Purple) → Breathe → Phase 2
   - [ ] Phase 2 → Eval Phase (Purple) → Breathe → Phase 3
   - [ ] Phase 3 → Eval Phase (Purple + Green) → Breathe → Due Date
   - [ ] All dates format correctly
   - [ ] No console errors

5. **Console Debug**:
   ```javascript
   // Check phases have evaluation dates
   console.log(selectedProject.project_phases);
   
   // Check project has evaluation forms
   console.log(selectedProject.project_evaluation_forms);
   ```

---

## Database Verification

### Check Phase Evaluation Forms
```sql
SELECT 
  pf.id,
  pf.phase_number,
  pef.available_from,
  pef.due_date
FROM project_phases pf
LEFT JOIN phase_evaluation_forms pef ON pf.id = pef.phase_id
WHERE pf.project_id = 'ce6cfb75-ea75-4c4e-94c2-18ecda401992'
ORDER BY pf.phase_number;

-- Expected: One row per phase with evaluation dates
```

### Check Project Evaluation Forms
```sql
SELECT 
  id,
  project_id,
  available_from,
  due_date
FROM project_evaluation_forms
WHERE project_id = 'ce6cfb75-ea75-4c4e-94c2-18ecda401992';

-- Expected: One row with dates matching last phase evaluation
```

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/student-leader-api.js` | Added `project_evaluation_forms` to query |
| `frontend/src/components/CourseStudentDashboard.js` | Show evaluation phase after EVERY phase, not just last |

---

## Important Notes

✅ **Each phase HAS an evaluation window** - defined in `phase_evaluation_forms`

✅ **Same evaluation form is reused** - All phases use similar evaluation criteria, can be submitted multiple times

✅ **Project eval only on last** - Only appears during the final evaluation phase

✅ **Breathe phase is optional** - Only shows if `breathe_phase_days > 0`

✅ **Timeline shows everything** - All phases, all evaluations, all breathe periods in one horizontal scroll

---

## Expected Result

The Project Timeline Modal now correctly displays:
- Every phase with dates
- An evaluation phase after every phase
- Breathe periods between them
- Project evaluation ONLY on the last evaluation phase
- All connected with visual connector lines
- Proper color coding (black phases, purple evals, green project eval, orange breathe)

**Visual**: `START → 1 → EVAL → BREATHE → 2 → EVAL → BREATHE → 3 → EVAL+PROJ → BREATHE → DUE`

