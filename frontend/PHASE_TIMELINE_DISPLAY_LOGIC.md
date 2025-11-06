# Phase Timeline Display - Complete Logic Guide

## Current Behavior
When you click on the project dashboard and view phases, you see phase circles with basic info.

## What It SHOULD Show

### Scenario 1: Multiple Phases
```
Project Due Date: Oct 31
Breathe Phase Days: 1
Evaluation Buffer Days: 2

TIMELINE DISPLAY:
┌────────────────────────────────────────────────────────────────┐
│ PHASE 1              BREATHE     PHASE 2              BREATHE   │
│ Oct 1 - Oct 5   +    1 day   +   Oct 7 - Oct 15   +   1 day   │
│                                                                 │
│              EVALUATION PHASE (Oct 29 - Oct 31)                │
│              (Project Due - 2 days = Oct 29)                   │
└────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Single Phase (Your Case!)
```
Project Due Date: Oct 31
Breathe Phase Days: 1 (doesn't matter for single phase)
Evaluation Buffer Days: 2

TIMELINE DISPLAY:
┌──────────────────────────────────────────────────┐
│ PHASE 1              EVALUATION PHASE             │
│ Oct 1 - Oct 5   +    Oct 5 - Oct 29 (work ends)  │
│                      Oct 29 - Oct 31 (eval)      │
└──────────────────────────────────────────────────┘

For single phase:
- Phase end date shown
- Then EVALUATION PHASE period begins (Project Due - 2 days)
- Breathe phase doesn't apply to single phase before evaluation
```

## Phase Circle Information Structure

### Each Phase Circle Should Show:

```
┌─────────────────────────┐
│    PHASE 1              │
│  ────────────────       │
│                         │
│  📅 Oct 1 - Oct 5       │ ← Start and End dates
│  📋 Planning Phase      │ ← Phase title/description
│  ✅ Current Phase       │ ← Status badge (if active)
│                         │
│  After Phase:           │
│  ⏱️ +1 day breathe      │ ← Breathe phase gap
│  📅 Oct 5 → Oct 6       │
│                         │
└─────────────────────────┘
```

### After Last Phase - Evaluation Period:

```
┌─────────────────────────┐
│    EVALUATION PHASE     │
│  ────────────────       │
│                         │
│  📋 Oct 29 - Oct 31     │ ← Calc: Due Date - Buffer Days
│  (2 days before due)    │ ← Buffer period
│  Eval Deadline: Oct 29  │ ← Last day to submit work
│                         │
│  📊 For assessments     │
│                         │
└─────────────────────────┘
```

## Display Logic for Phase Timeline Modal

### Current Renders:
```javascript
.map((phase, index) => {
  return (
    <PhaseCircle>
      {formatDate(phase.start_date)}
      Phase {phase.phase_number}
      {phase.title}
      {isActive && "Current"}
    </PhaseCircle>
  );
})
```

### Should Render:
```javascript
.map((phase, index) => {
  const isLastPhase = index === selectedProject.project_phases.length - 1;
  const hasNextPhase = index < selectedProject.project_phases.length - 1;
  
  return (
    <PhaseCircle>
      {/* PHASE INFO */}
      {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
      Phase {phase.phase_number}
      {phase.title}
      {isActive && "Current"}
      
      {/* BREATHE PHASE GAP (if not last phase) */}
      {hasNextPhase && selectedProject.breathe_phase_days > 0 && (
        <BreathePhaseBadge>
          ⏱️ +{selectedProject.breathe_phase_days} day gap
        </BreathePhaseBadge>
      )}
      
      {/* EVALUATION PHASE (only after last phase) */}
      {isLastPhase && (
        <EvaluationPhaseBadge>
          📋 Evaluation: {formatDate(evaluationStartDate)} - {formatDate(projectDueDate)}
          ⏳ {selectedProject.evaluation_buffer_days} days before due
          Deadline: {formatDate(evaluationDeadlineDate)}
        </EvaluationPhaseBadge>
      )}
    </PhaseCircle>
  );
})
```

## Calculation Logic

### For Breathe Phase (between phases):
```javascript
const nextPhaseStartDate = new Date(nextPhase.start_date);
const currentPhaseEndDate = new Date(currentPhase.end_date);
const breatheGapDays = selectedProject.breathe_phase_days;

// Display: "After Phase 1: +1 day gap before Phase 2"
// Visual: Line connecting Phase 1 end → Phase 2 start with label
```

### For Evaluation Phase (after all phases):
```javascript
const projectDueDate = new Date(selectedProject.due_date);
const evaluationBufferDays = selectedProject.evaluation_buffer_days;

// Evaluation starts X days before due date
const evaluationStartDate = new Date(projectDueDate);
evaluationStartDate.setDate(evaluationStartDate.getDate() - evaluationBufferDays);

// Last day to submit work = evaluation start date
const submissionDeadline = evaluationStartDate;

// Display info:
// "📋 Evaluation Period: {evaluationStartDate} - {projectDueDate}"
// "⏳ {evaluationBufferDays} days before project due date"
// "Deadline to submit work: {submissionDeadline}"
```

## Visual Timeline Example - Single Phase

```
Current:
┌────────┐
│Phase 1 │
│Oct 1-5 │
│        │
└────────┘

Should Be:
┌────────┐ + ┌──────────────────────┐
│Phase 1 │   │ EVALUATION PHASE     │
│Oct 1-5 │   │ Oct 29 - Oct 31      │
│        │ + │ (2 days buffer)      │
│        │   │ Submit by: Oct 29    │
└────────┘   └──────────────────────┘
   │              │
   └──────────────┘
   Oct 5 to Oct 29 = work period + eval buffer
```

## What Each Component Should Show

### Phase Circle
- Phase number
- Start date - End date
- Phase title
- Status ("Current" or empty)

### Breathing Period Badge (between phases)
- "⏱️ +X day breathe"
- Visual: Smaller circle or connecting line
- Shows gap between Phase N and Phase N+1

### Evaluation Period (after last phase)
- "📋 Evaluation Period"
- Start date - Due date
- "⏳ X days before project due date"
- "Deadline to submit work: [date]"
- Visual: Different color (orange/yellow) to distinguish

## Implementation Order

1. ✅ Add calculation helper functions
   - `getEvaluationPeriodDates(project)`
   - `getBreathePhaseDates(phase, project, phaseIndex)`

2. ✅ Update phase circle rendering
   - Add end date display
   - Add "is last phase" check
   - Add breathe phase badge if not last
   - Add evaluation period if last

3. ✅ Style the badges
   - Breathe phase: Blue, smaller
   - Evaluation phase: Orange, prominent
   - Include icons and spacing

4. ✅ Update modal content sizing
   - Account for more content per circle
   - Ensure responsive layout

## Files to Modify

**CourseStudentDashboard.js:**
- Lines 7326-7500: Phase Timeline Modal
  - Add calculation logic
  - Update phase circle rendering
  - Add badge components
  - Update styling

## Expected Result

When viewing phases in Project Dashboard:
```
Timeline Modal Opens:

─────────────────────────────────────────────────────────────

    PHASE 1              ⏱️ +1 DAY         EVALUATION PHASE
   Oct 1-5              BREATHE            Oct 29-31
   Planning Phase                          (2 days buffer)
   ✅ Current
                                           Deadline: Oct 29
                                           
─────────────────────────────────────────────────────────────
```

Single phase example:
```
    PHASE 1                               EVALUATION PHASE
   Oct 1-5                                Oct 29-31
   Planning Phase                         (2 days buffer)
                                          
                                          Deadline: Oct 29
```

Is this the correct understanding of what should be displayed? 🎯
