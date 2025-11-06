# EXACT IMPLEMENTATION ANALYSIS - Current State

## THE PROBLEM

The phase type detection logic exists in THREE different places, causing inconsistency:

### 1. **Phase Detection on Project Load** (`detectCurrentPhase` function)
Sets `currentPhaseType` on ONE phase object (the detected current/active phase)
```javascript
// In detectCurrentPhase():
activePhase.currentPhaseType = 'evaluation';  // Only on detected active phase
setCurrentPhase(activePhase);
```

### 2. **Phase Navigation** (`navigateToNextPhase` / `navigateToPreviousPhase`)
When navigating, manually sets `currentPhaseType` on the viewedPhase
```javascript
setViewedPhase({ ...currentPhaseObj, currentPhaseType: 'evaluation' });
```

### 3. **Project Evaluation Phase Detection** (Dashboard rendering)
Tries to detect phase type from the unmodified project_phases array
```javascript
// In evaluations column rendering:
isLastEvalPhase = !remainingPhases.some(p => 
  p.currentPhaseType === 'evaluation' ||  // ❌ NOT SET on most phases!
  p.phase_type === 'evaluation' ||         // ❌ Column doesn't exist in DB!
  p.phase_type_id?.includes('evaluation')  // ❌ Column doesn't exist in DB!
);
```

---

## THE ROOT CAUSE

When comparing remaining phases:
- `currentPhaseType` is only set on `viewedPhase` or `currentPhase` 
- Other phases in the `project_phases` array don't have `currentPhaseType` set
- Database has NO `phase_type` or `phase_type_id` columns
- Therefore, the check ALWAYS fails for remaining phases
- `isLastEvalPhase` becomes TRUE even when there ARE more evaluation phases

---

## CORRECT LOGIC (Based on Database Schema)

Phase type determination should be based on phase timing logic:

```sql
-- Pseudocode for determining phase type
CASE 
  WHEN evaluation_available_from <= now() AND evaluation_due_date >= now() 
    THEN 'evaluation'
  WHEN breathe_start_date <= now() AND breathe_end_date >= now() 
    THEN 'breathe'
  WHEN start_date <= now() AND end_date >= now() 
    THEN 'work'
  ELSE 'upcoming' 
END
```

### Phase Type Determination Rules

For any phase, check in this order:
1. **Evaluation Phase**: if `evaluation_available_from` ≤ now ≤ `evaluation_due_date`
2. **Breathe Phase**: if `breathe_start_date` ≤ now ≤ `breathe_end_date`
3. **Work Phase**: if `start_date` ≤ now ≤ `end_date`
4. **Upcoming**: if now < `start_date`

---

## CURRENT IMPLEMENTATION

### Database Columns Available (from relationships.txt)

**project_phases table:**
- id, project_id, phase_number, title, description
- start_date, end_date
- is_active, created_at, updated_at
- file_types_allowed, rubric, rubric_file_url
- evaluation_form_type, evaluation_form_file_url, max_attempts

**MISSING THESE (but code looks for them):**
- phase_type ❌
- phase_type_id ❌

**Phase Timing - Need to look for:**
- evaluation_available_from ✓ (seen in code)
- evaluation_due_date ✓ (seen in code)
- breathe_start_date ✓ (seen in code)
- breathe_end_date ✓ (seen in code)

---

## FIX STRATEGY

### Option 1: Add Phase Type Determination Function (RECOMMENDED)

Create a helper function that computes phase type dynamically:

```javascript
// Helper function to determine phase type at a given time
const getPhaseTypeAtTime = (phase, time = new Date()) => {
  const now = new Date(time);
  
  // Check evaluation window
  if (phase.evaluation_available_from && phase.evaluation_due_date) {
    const evalStart = new Date(phase.evaluation_available_from);
    const evalEnd = new Date(phase.evaluation_due_date);
    if (now >= evalStart && now <= evalEnd) {
      return 'evaluation';
    }
  }
  
  // Check breathe window
  if (phase.breathe_start_date && phase.breathe_end_date) {
    const breatheStart = new Date(phase.breathe_start_date);
    const breatheEnd = new Date(phase.breathe_end_date);
    if (now >= breatheStart && now <= breatheEnd) {
      return 'breathe';
    }
  }
  
  // Check work window
  const workStart = new Date(phase.start_date);
  const workEnd = new Date(phase.end_date);
  if (now >= workStart && now <= workEnd) {
    return 'work';
  }
  
  return 'upcoming';
};

// Usage:
const isLastEvalPhase = !remainingPhases.some(phase => 
  getPhaseTypeAtTime(phase) === 'evaluation'
);
```

### Option 2: Pre-compute Phase Types When Loading Project

When loading selectedProject, compute all phase types upfront:

```javascript
const projectWithPhaseTypes = {
  ...project,
  project_phases: project.project_phases.map(phase => ({
    ...phase,
    phaseType: getPhaseTypeAtTime(phase)
  }))
};
```

Then use the precomputed type:

```javascript
isLastEvalPhase = !remainingPhases.some(p => 
  p.phaseType === 'evaluation'
);
```

---

## ACTUAL DATABASE SCHEMA

### project_phases Table Structure

```
id                          UUID
project_id                  UUID → FK projects(id)
phase_number               INTEGER (1, 2, 3, ...)
title                      VARCHAR ("Phase 1 - Work", etc.)
description                TEXT
start_date                 TIMESTAMP WITHOUT TIME ZONE (work phase start)
end_date                   TIMESTAMP WITHOUT TIME ZONE (work phase end)
is_active                  BOOLEAN
created_at                 TIMESTAMP WITH TIME ZONE
updated_at                 TIMESTAMP WITH TIME ZONE
file_types_allowed         TEXT (JSON array)
rubric                     TEXT
rubric_file_url            TEXT
evaluation_form_type       VARCHAR ('builtin' or 'custom')
evaluation_form_file_url   TEXT
max_attempts               INTEGER
```

### Missing from DB but implied by code:
- evaluation_available_from (Timestamp - evaluation window start)
- evaluation_due_date (Timestamp - evaluation window end)
- breathe_start_date (Timestamp - breathe window start)
- breathe_end_date (Timestamp - breathe window end)

These timing columns are likely in the database but NOT in the relationships.txt file shown!

---

## VERIFICATION NEEDED

### Quick SQL Check
```sql
-- Check if these columns actually exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_phases' 
AND column_name IN (
  'evaluation_available_from',
  'evaluation_due_date',
  'breathe_start_date',
  'breathe_end_date',
  'phase_type',
  'phase_type_id'
);
```

### In Code (CourseStudentDashboard.js)
The timing columns ARE being used in phase detection:
- Line 6267-6269: Check `evaluation_available_from` and `evaluation_due_date`
- Line 6271-6273: Check `breathe_start_date` and `breathe_end_date`

So these columns DO exist in the database!

---

## PROJECT EVALUATION DISPLAY LOGIC

### Current (Buggy) Logic
```javascript
const isLastEvalPhase = !remainingPhases.some(p => 
  p.currentPhaseType === 'evaluation' ||  // ❌ Not set on most phases
  p.phase_type === 'evaluation' ||         // ❌ Doesn't exist in DB
  p.phase_type_id?.includes('evaluation')  // ❌ Doesn't exist in DB
);

if (isLastEvalPhase && projectEvaluationData) {
  // Show project evaluation card
}
```

### Correct Logic
```javascript
// Helper function exists already but not called here
const getPhaseTypeAtTime = (phase) => {
  const now = new Date();
  
  if (phase.evaluation_available_from && phase.evaluation_due_date) {
    const evalStart = new Date(phase.evaluation_available_from);
    const evalEnd = new Date(phase.evaluation_due_date);
    if (now >= evalStart && now <= evalEnd) {
      return 'evaluation';
    }
  }
  
  if (phase.breathe_start_date && phase.breathe_end_date) {
    const breatheStart = new Date(phase.breathe_start_date);
    const breatheEnd = new Date(phase.breathe_end_date);
    if (now >= breatheStart && now <= breatheEnd) {
      return 'breathe';
    }
  }
  
  const workStart = new Date(phase.start_date);
  const workEnd = new Date(phase.end_date);
  if (now >= workStart && now <= workEnd) {
    return 'work';
  }
  
  return 'upcoming';
};

// Use this for determining last evaluation phase
const isLastEvalPhase = !remainingPhases.some(p => 
  getPhaseTypeAtTime(p) === 'evaluation'
);
```

---

## SUMMARY: What Needs to Happen

1. ✅ Phase timing columns DO exist in database (evaluation_available_from, evaluation_due_date, breathe_start_date, breathe_end_date)
2. ❌ Phase type detection NOT being used when checking remaining phases for project eval
3. ❌ Code is looking for non-existent columns (phase_type, phase_type_id)
4. 🔧 FIX: Call `getPhaseTypeAtTime()` or similar function when checking if phase is evaluation type
5. 🔧 FIX: Only show project evaluation on truly LAST evaluation phase

---

## FILES TO MODIFY

**frontend/src/components/CourseStudentDashboard.js**
- Line ~6920-6933: Fix the project eval phase detection logic
- Create a shared phase type detection function if it doesn't exist
- Use phase timing columns instead of non-existent phase_type columns
