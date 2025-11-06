# Evaluation Phase Days Display Guide

## Current Status
- ✅ `breathe_phase_days` is already displayed in the Phase Timeline Modal
- ❌ `evaluation_buffer_days` is NOT currently displayed

## Where to Add Evaluation Buffer Days Display

### 1. **Phase Timeline Modal** (Line 7326-7500)
**Location:** `renderProjectDashboard()` > Phase Timeline Modal

**Current Display:** Shows phase circles with:
- Phase number
- Start date
- Phase title
- "Current" status if active

**What to Add:**
Below the phase details, add info about:
- Evaluation deadline (Project Due Date - evaluation_buffer_days)
- Days buffer remaining

**Implementation:**
```javascript
// After phase title, add:
<div style={{
  fontSize: '0.85rem',
  color: '#E67E22',
  marginTop: '0.3rem',
  fontWeight: '500'
}}>
  📋 Eval Deadline: {formatDate(evaluationDeadline)}
</div>

{selectedProject.evaluation_buffer_days > 0 && (
  <div style={{
    fontSize: '0.8rem',
    color: '#3B82F6',
    marginTop: '0.2rem'
  }}>
    ⏳ {selectedProject.evaluation_buffer_days} day{selectedProject.evaluation_buffer_days !== 1 ? 's' : ''} before project due
  </div>
)}
```

### 2. **Gantt Chart Timeline Info** (Line 22682)
**Current Display:**
```
⏱️ Breathe Phase: X days between phases (not shown on timeline)
```

**Add After:**
```javascript
{selectedGanttProject?.evaluation_buffer_days > 0 && (
  <div style={{ marginTop: '4px', color: '#E67E22', fontWeight: '500' }}>
    📋 Evaluation Period: {selectedGanttProject.evaluation_buffer_days} day{selectedGanttProject.evaluation_buffer_days !== 1 ? 's' : ''} buffer before due date
  </div>
)}
```

### 3. **Similar Location in Reports/Gantt** (Line 25901)
Same as #2 - add evaluation buffer display in the same manner

## Key Points

### What breathe_phase_days does:
- Days BETWEEN phases for students to rest
- Automatically added to start date of next phase
- **Not shown on timeline** (visual spacing is organic)

### What evaluation_buffer_days does:
- Days BEFORE project due date for evaluation period
- Limits phase end dates (phases can't end after this buffer starts)
- **Should be shown** to inform students when evaluation period begins

## Calculation Example

```
Project Settings:
- Project Due Date: Oct 31, 2025 12:00 PM
- Evaluation Buffer Days: 2
- Breathe Phase Days: 1

Evaluation Deadline = Oct 31 - 2 days = Oct 29, 2025 12:00 PM
(Last day students can submit work)

Phase Timeline Example:
Phase 1: Oct 23 - Oct 26
Phase 2: Oct 27 - Oct 29 (eval buffer starts Oct 29 00:00)
  ↓
  1 day breathe = Oct 30 (auto-calculated)
Evaluation Period: Oct 29 - Oct 31
```

## Files to Modify

1. **CourseStudentDashboard.js**
   - Line ~7450: Phase details section in Phase Timeline Modal
   - Line ~22682: Gantt chart info section
   - Line ~25901: Reports Gantt info section

## What Students Will See

**In Phase Timeline Modal:**
```
┌─────────────┐
│   Phase 1   │
│ Oct 23-31   │
│ Planning... │
│             │
│ 📋 Eval Due: Oct 29
│ ⏳ 2 days before due
└─────────────┘
```

**In Gantt Chart Info:**
```
💡 Timeline: Project Overview (2 phases) • Oct 23 - Oct 31 • 9 days
⏱️ Breathe Phase: 1 day between phases (not shown on timeline)
📋 Evaluation Period: 2 days buffer before due date
```

## Next Steps

Once you're ready, I can add these displays to:
1. Phase Timeline Modal circles
2. Gantt chart information section
3. Any other relevant views showing project timeline

Would you like me to implement these changes now?
