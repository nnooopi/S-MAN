# Gantt Chart Implementation Details

## Table Structure

### ColGroup Definition
```jsx
<colgroup>
  <col style={{ width: `${nameColumnWidth}px` }} />
  {timelineDays.map((_, index) => (
    <col key={`col-body-${index}`} style={{ width: `${DAY_WIDTH}px` }} />
  ))}
</colgroup>
```

**Purpose:**
- Defines fixed column widths
- First column: Member/Task name (resizable)
- Subsequent columns: One per day in timeline
- Ensures all rows use same column widths

---

## Header Section (THead)

### Row 1: Date Headers
```jsx
<tr>
  <th>Group Members</th>  {/* Name column */}
  {timelineDays.map((day, index) => (
    <th key={`header-${index}`}>
      {day.getDate()}      {/* Day number: 1, 2, 3... */}
      {day.toLocaleDateString('en-US', { month: 'short' })}  {/* Oct, Nov... */}
      {isToday && 'TODAY'}
      {isStartDate && 'START'}
      {isEndDate && 'END'}
    </th>
  ))}
</tr>
```

**Width Calculation:**
- Each `<th>` has `width: DAY_WIDTH`
- Exactly matches body columns via `<col>` definitions

---

### Row 2: Timeline Info (Start/End/Duration)
```jsx
<tr>
  <th>Timeline Info</th>
  <td colSpan={Math.max(1, Math.ceil(timelineDays.length / 8))}>
    {/* Green START indicator */}
  </td>
  <td colSpan={Math.max(1, Math.ceil(timelineDays.length / 8))}>
    {/* Gray DURATION info */}
  </td>
  <td colSpan={remaining columns}>
    {/* Red END indicator */}
  </td>
</tr>
```

**Logic:**
- Divides timeline into thirds visually
- Start info takes first ~33% of columns
- Duration takes middle ~33%
- End takes final ~33%
- All columns still covered

---

## Data Rows (Tbody)

### Phase Header Rows
```jsx
{phases.map(phase => (
  <tr key={`phase-${phase.id}`}>
    <td style={{ width: nameColumnWidth }}>
      Phase {phase.phase_number}: {phase.title}
    </td>
    {/* One td per day - filled for phase duration */}
    {timelineDays.map((_, dayIdx) => (
      dayIdx >= phaseStartDay && dayIdx < phaseEndDay ? (
        <td style={{ backgroundColor: phaseColor }}>
          {dayIdx === phaseStartDay && 'Phase label'}
        </td>
      ) : (
        <td style={{ backgroundColor: '#F9FAFB' }}></td>
      )
    ))}
  </tr>
))}
```

**Rendering Logic:**
```javascript
// Calculate phase date range in days
const phaseStartDay = Math.floor((phaseStart - timelineStart) / dayMs);
const phaseEndDay = phaseStartDay + phaseDurationDays;

// For each day in timeline
for (let dayIdx = 0; dayIdx < timelineDays.length; dayIdx++) {
  if (dayIdx >= phaseStartDay && dayIdx < phaseEndDay) {
    // Phase is active this day - use phase color
  } else {
    // Phase not active - empty cell
  }
}
```

---

### Task Rows
```jsx
{tasks.map(task => {
  // Calculate task span in days
  const taskStartDay = Math.floor((taskStart - timelineStart) / dayMs);
  const taskEndDay = Math.floor((taskEnd - timelineStart) / dayMs);
  
  return (
    <tr key={`task-${task.id}`}>
      <td>{task.title}</td>
      {timelineDays.map((_, dayIdx) => {
        if (dayIdx >= taskStartDay && dayIdx <= taskEndDay) {
          // Task active this day
          if (dayIdx === taskStartDay) {
            // First day - render member pill
            return <td>{memberPill}</td>;
          } else {
            // Continuation - empty
            return <td></td>;
          }
        } else {
          // Task not active - empty
          return <td></td>;
        }
      })}
    </tr>
  );
})}
```

**Member Pill Rendering:**
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: phaseColor,
  borderRadius: '17px',
  padding: '0 12px'
}}>
  {/* Profile Picture */}
  <div style={{
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    overflow: 'hidden'
  }}>
    <img src={memberImage} />
  </div>
  
  {/* Member Name */}
  <span>{memberName}</span>
</div>
```

---

## Evaluation Phase Rows

Similar structure to phase rows, but with special handling:

```jsx
{phase.evaluation_available_from && phase.evaluation_due_date ? (
  <tr key={`eval-${phase.id}`}>
    <td>
      {isLastPhase && hasProjectEval ? 'Project Evaluation' : 'Phase Evaluation'}
    </td>
    {createEvaluationCells(evalStart, evalEnd, timelineDays)}
  </tr>
) : null}
```

**Color Coding:**
- Last phase with project evaluation: Green (#10B981)
- Regular phase evaluation: Purple (#8B5CF6)

---

## Breathe Phase Rows

```jsx
{phase.breathe_start_date && phase.breathe_end_date ? (
  <tr key={`breathe-${phase.id}`}>
    <td>Breathe Phase</td>
    {createBreatheCells(breatheStart, breatheEnd, timelineDays)}
  </tr>
) : null}
```

**Color:** Amber/Orange (#F59E0B)

---

## Width Calculations

### Adaptive Day Width Algorithm
```javascript
const getAdaptiveDayWidth = (containerWidth) => {
  const timelineDays = getGanttTimelineDays();
  const dayCount = timelineDays.length;
  
  if (!containerWidth || containerWidth <= 0 || dayCount <= 0) {
    // Fallback based on duration
    if (dayCount <= 3) return 300;
    if (dayCount <= 7) return 150;
    if (dayCount <= 14) return 100;
    if (dayCount <= 30) return 70;
    return 50;
  }
  
  // Calculate width to show 10 days at once
  const availableWidth = containerWidth - nameColumnWidth;
  const visibleDays = Math.min(dayCount, 10);
  const calculatedWidth = availableWidth / visibleDays;
  
  // Enforce minimum for readability
  const minWidth = 80;
  return Math.max(minWidth, calculatedWidth);
};
```

### Total Timeline Width
```javascript
const totalWidth = timelineDays.length * DAY_WIDTH;
const timelinePixelWidth = nameColumnWidth + totalWidth;
```

---

## Date Range Calculation

### Getting Timeline Bounds
```javascript
const getGanttDateRange = () => {
  if (!selectedGanttProject) return { start: null, end: null };
  
  if (selectedGanttPhase) {
    // Single phase selected
    return {
      start: new Date(selectedGanttPhase.start_date),
      end: new Date(selectedGanttPhase.end_date)
    };
  }
  
  // All phases selected - get project boundaries
  const phases = selectedGanttProject.project_phases || [];
  if (phases.length === 0) return { start: null, end: null };
  
  const starts = phases.map(p => new Date(p.start_date));
  const ends = phases.map(p => new Date(p.end_date));
  
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends))
  };
};
```

### Generating Daily Timeline
```javascript
const getGanttTimelineDays = () => {
  const { start, end } = getGanttDateRange();
  if (!start || !end) return [];
  
  const days = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);  // Normalize to midnight
  
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);  // Normalize to midnight
  
  // Generate all days between start and end (inclusive)
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);  // Move to next day
  }
  
  return days;
};
```

---

## Task Position Calculation

```javascript
const getTaskPosition = (task, dayWidth) => {
  const { start, end } = getGanttDateRange();
  if (!start || !end || !task.due_date) return { left: '0px', width: `${dayWidth}px` };
  
  // Task timeline: created_at to due_date
  const taskStart = new Date(task.created_at);
  taskStart.setHours(0, 0, 0, 0);  // Normalize
  
  const taskEnd = new Date(task.due_date);
  taskEnd.setHours(0, 0, 0, 0);  // Normalize
  
  const timelineStart = new Date(start);
  timelineStart.setHours(0, 0, 0, 0);  // Normalize
  
  // Calculate day offsets
  const taskStartDay = Math.max(0, Math.floor((taskStart - timelineStart) / (1000 * 60 * 60 * 24)));
  const taskDurationDays = Math.max(1, Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1);
  
  return {
    left: `${(taskStartDay * dayWidth) + 4}px`,      // Add 4px margin
    width: `${(taskDurationDays * dayWidth) - 8}px`, // Subtract 8px margins
    startDate: taskStart,
    endDate: taskEnd
  };
};
```

---

## Scroll Container Setup

```jsx
<div style={{
  minWidth: '100%',
  position: 'relative',
  overflowX: 'auto',    // Horizontal scroll
  overflowY: 'auto',    // Vertical scroll
  flex: 1,
  maxHeight: '100%'
}}>
  {/* Tables go here */}
</div>
```

**Key Points:**
- `overflowX: 'auto'` - Scroll when timeline exceeds screen width
- `overflowY: 'auto'` - Scroll when content exceeds max height
- `flex: 1` - Fill available vertical space in container
- `position: 'relative'` - Reference for absolute positioned elements

---

## Column Resizing

```javascript
const handleColumnResize = (e) => {
  setIsResizing(true);
  const startX = e.clientX;
  const startWidth = nameColumnWidth;
  
  const handleMouseMove = (moveEvent) => {
    const delta = moveEvent.clientX - startX;
    const newWidth = Math.max(150, Math.min(400, startWidth + delta));
    setNameColumnWidth(newWidth);
  };
  
  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

**Constraints:**
- Minimum width: 150px
- Maximum width: 400px
- Updates state to trigger re-render with new column width

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| HTML Tables | ✓ | ✓ | ✓ | ✓ |
| tableLayout: fixed | ✓ | ✓ | ✓ | ✓ |
| colgroup | ✓ | ✓ | ✓ | ✓ |
| Flexbox (pills) | ✓ | ✓ | ✓ | ✓ |
| CSS Grid | ✓ | ✓ | ✓ | ✓ |
| Overflow scroll | ✓ | ✓ | ✓ | ✓ |

---

## Performance Metrics

**Typical Rendering:**
- 30-day project: ~60 columns
- 10 team members: ~10 task rows per phase
- 3 phases: 30 data rows + headers
- Total cells: ~2000-3000 td elements

**Optimization Strategies:**
1. `tableLayout: fixed` - No need to calculate column widths
2. Fixed column widths - CSS handles alignment
3. Efficient date calculations - Single pass through timeline
4. React keys - Proper reconciliation with `key={index}`

---

## Known Limitations

1. **Very Long Timelines (200+ days)**
   - May need pagination or virtual scrolling
   - Horizontal scroll required
   - Recommend splitting into phases

2. **Large Teams (50+ members)**
   - Each member has multiple task rows
   - May need filtering or grouping UI

3. **Mobile Responsiveness**
   - Horizontal scroll required for timelines
   - Recommend tablet (768px+) minimum width

---

## Future Enhancements

- [ ] Virtual scrolling for 1000+ rows
- [ ] Timeline pagination (view weeks/months separately)
- [ ] Drag-to-resize task durations
- [ ] Click member pill to view details
- [ ] Export timeline as PNG/PDF
- [ ] Print-friendly view
- [ ] Mobile-optimized compact view
