# Phase Timeline Visualization - October 24, 2025

## Feature Overview

The Phase Modal now displays a comprehensive timeline showing:
1. **Phase Work Period** - When regular work/tasks happen
2. **Breathe Phase** (optional) - Breathing room between phases (no work)
3. **Evaluation Phase** - When peer evaluations are active

## Visual Timeline

```
┌──────────────────┐     ┌──────┐     ┌──────────────────┐
│ Phase Work       │ →   │Breathe│ →  │   Evaluation     │
│ Jan 1 - Jan 10   │     │1 day  │    │ Jan 12 - Jan 13  │
└──────────────────┘     └──────┘     └──────────────────┘
      (Teal)           (Orange)           (Purple)
```

## Implementation Details

### Location
- **File**: `frontend/src/components/CourseStudentDashboard.js`
- **Component**: `PhaseModal` (Lines 28771+)
- **New Section**: Phase Timeline (inserted before Phase Description)

### When Breathe Phase Shows
The breathe phase block only appears if:
- `phase.breathe_phase_days > 0` (greater than 0)
- `phase.end_date` is set

**If no breathe days are configured**: The breathe phase bar is hidden automatically

### When Evaluation Phase Shows
The evaluation phase block appears if:
- `phase.evaluation_available_from` is set
- `phase.evaluation_due_date` is set

### Colors Used
| Phase | Color | Hex Code |
|-------|-------|----------|
| Phase Work | Teal | #34656D |
| Breathe | Orange | #F59E0B |
| Evaluation | Purple | #8B5CF6 |

## User Experience

### For Phases WITH Breathe Days (e.g., breathe_phase_days = 2)
```
[Phase Work] → [Breathe] → [Evaluation]
```
All three sections display in sequence

### For Phases WITHOUT Breathe Days (e.g., breathe_phase_days = 0)
```
[Phase Work] → [Evaluation]
```
Breathe phase is automatically hidden

### Legend
At the bottom of the timeline, a color-coded legend shows:
- ✅ Phase Work Period - Always shown
- ✅ Breathe Phase (No work) - Only if breathe_phase_days > 0
- ✅ Evaluation Window - Only if evaluation dates are set

## Database Requirements

The timeline uses these fields from `project_phases`:
- `start_date` - Phase start
- `end_date` - Phase end
- `breathe_phase_days` - Breathing room (from parent project)
- `evaluation_available_from` - When evaluations open
- `evaluation_due_date` - When evaluations close

## Example Scenarios

### Scenario 1: Standard Phase (with breathe days)
```
Breathe Phase Days: 2
Evaluation Phase Days: 2
start_date: 2025-01-01
end_date: 2025-01-10

Timeline shows:
[Jan 1-10 Work] → [Jan 11-12 Breathe] → [Jan 13-14 Evaluation]
```

### Scenario 2: No Breathe Days
```
Breathe Phase Days: 0
Evaluation Phase Days: 2
start_date: 2025-01-01
end_date: 2025-01-10

Timeline shows:
[Jan 1-10 Work] → [Jan 11-12 Evaluation]
(Breathe phase hidden)
```

### Scenario 3: First Phase (no evaluation available yet)
```
If evaluation_available_from = NULL:

Timeline shows:
[Jan 1-10 Work] → [Jan 11 Breathe]
(Evaluation phase hidden - not yet set up)
```

## Calculation Logic (Backend)

The backend automatically calculates these dates when a project is created:

```
evaluation_available_from = phase.end_date + project.breathe_phase_days
evaluation_due_date = evaluation_available_from + project.evaluation_phase_days
```

**Example with Phase 1:**
```
Phase 1 ends:          2025-01-10
Breathe phase days:    2
Evaluation days:       2

evaluation_available_from = 2025-01-10 + 2 days = 2025-01-12
evaluation_due_date     = 2025-01-12 + 2 days = 2025-01-14
```

## Styling

The timeline is responsive and:
- ✅ Wraps on mobile devices
- ✅ Maintains aspect ratio
- ✅ Proper spacing with arrows (→) between phases
- ✅ Clear date labels under each phase
- ✅ Color legend that only shows active phases

## Testing Checklist

When testing this feature:
- [ ] Phase modal opens when clicking on a phase circle
- [ ] Breathe phase appears when breathe_phase_days > 0
- [ ] Breathe phase disappears when breathe_phase_days = 0
- [ ] Evaluation phase shows with correct dates
- [ ] Legend items match displayed phases
- [ ] Responsive on mobile (timeline wraps)
- [ ] All date formats are consistent
- [ ] Colors match the design system

## Future Enhancements

Possible improvements:
1. **Interactive Timeline**: Click phases to see more details
2. **Hover Tooltips**: Show task counts per phase
3. **Current Position**: Highlight current date on timeline
4. **Phase Stats**: Show completion % on each block
5. **Export**: Download timeline as image
