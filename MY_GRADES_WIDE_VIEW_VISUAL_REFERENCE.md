# My Grades Wide View - Visual Reference

## UI Layout

### Top Toggle Bar
```
┌────────────────────────────────────────────────┐
│  [Project] [Phase] [Wide] ← View Mode Selector │
├────────────────────────────────────────────────┤
│ (Search & Sort Controls for Project/Phase mode)│
└────────────────────────────────────────────────┘
```

### Wide View Card Layout (Responsive Grid)

```
┌──────────────────────────────────────────────────┐
│                  WIDE VIEW CARDS                 │
│                  (Grid Layout)                   │
└──────────────────────────────────────────────────┘

Desktop (Multiple columns):
┌────────────┬──────────────┐ ┌────────────┬──────────────┐
│   LEFT     │   RIGHT      │ │   LEFT     │   RIGHT      │
│   GRADES   │   DETAILS    │ │   GRADES   │   DETAILS    │
└────────────┴──────────────┘ └────────────┴──────────────┘

Tablet/Mobile (Fewer columns):
┌────────────┬──────────────┐
│   LEFT     │   RIGHT      │
│   GRADES   │   DETAILS    │
└────────────┴──────────────┘

Mobile (Single column):
┌──────────────────────────────┐
│        LEFT SIDE             │
│  ┌──────────────────────────┐│
│  │    Group Grade: 85%      ││
│  ├──────────────────────────┤│
│  │ Individual Grade: 90%    ││
│  └──────────────────────────┘│
├──────────────────────────────┤
│      RIGHT SIDE              │
│  Project Title               │
│  Description...              │
│  Due: Jan 15, 2024           │
│  Graded by: Prof. Smith      │
│  Final: 87%                  │
└──────────────────────────────┘
```

## Card Structure (Desktop - 60% width example)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────────┬─────────────────────────────────────┐ │
│  │             │                                     │ │
│  │  GROUP      │  Project Title                      │ │
│  │             │  This is the project description    │ │
│  │   85%       │  that appears here                  │ │
│  │             │                                     │ │
│  │  200px      │  Description: Lorem ipsum dolor...  │ │
│  │  FIXED      │                                     │ │
│  │             │  Due: January 15, 2024              │ │
│  ├─────────────┤                                     │ │
│  │             │  Graded by: Prof. Jane Smith       │ │
│  │ INDIVIDUAL  │                                     │ │
│  │             │  ┌─────────────────────────────┐   │ │
│  │   92%       │  │ Final Grade: 87%            │   │ │
│  │             │  └─────────────────────────────┘   │ │
│  │             │                                     │ │
│  │ (FLEX GROW) │  ┌─────────────────────────────┐   │ │
│  │             │  │ Feedback: Excellent work on│   │ │
│  │             │  │ the project...              │   │ │
│  │             │  └─────────────────────────────┘   │ │
│  │             │                                     │ │
│  └─────────────┴─────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘

Colors & Typography:
- 200px LEFT section: Background #f8f9fa, Border-right #e2e8f0
- Grade values: Font-size 32px, Font-weight 800
  - >= 75%: #059669 (Green)
  - >= 50%: #f59e0b (Orange)
  - < 50%: #dc2626 (Red)
  - None: #cbd5e0 (Gray)
- Title: Font-size 16px, Font-weight 700
- Labels: Font-size 11px, Font-weight 700, UPPERCASE
- Right section: Flex 1, Flex column, Justify space-between
```

## Responsive Breakpoints

### Desktop (≥1024px)
```
minmax(600px, 1fr) → Multiple cards per row
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Card 1  │ │ Card 2  │ │ Card 3  │
└─────────┘ └─────────┘ └─────────┘
```

### Tablet (768px-1023px)
```
minmax(600px, 1fr) → 1-2 cards per row
┌─────────────┐ ┌─────────────┐
│   Card 1    │ │   Card 2    │
└─────────────┘ └─────────────┘
```

### Mobile (<768px)
```
minmax(600px, 1fr) → 1 card per row (with scroll)
┌─────────────────┐
│     Card 1      │
└─────────────────┘
```

## View Modes Comparison

```
┌─────────────────────────────────────────────────────────┐
│ MODE        │ LAYOUT    │ GRADES SIDE-BY-SIDE │ DETAILS │
├─────────────────────────────────────────────────────────┤
│ Project     │ List      │ No (Separate)       │ Minimal │
│ Phase       │ List      │ No (Separate)       │ Minimal │
│ Wide        │ Grid      │ YES ← Left side     │ Rich    │
└─────────────────────────────────────────────────────────┘
```

## Data Flow in Wide View

```
User selects "Wide" view
        ↓
gradesViewMode = 'wide'
        ↓
renderMyGrades() checks mode
        ↓
if (gradesViewMode === 'wide')
        ↓
renderMyGradesWideView() executed
        ↓
Check gradesViewFilter:
  ├─ 'project' → Show projects with grades
  └─ 'phase' → Show phases with grades
        ↓
Map data to card objects with:
  - id, type, title, description
  - groupGrade, individualGrade, finalGrade
  - gradedBy, feedback, dates
        ↓
Render responsive grid of cards
        ↓
Each card displays:
  LEFT:  Group Grade | Individual Grade
  RIGHT: Title, Description, Metadata, Feedback
        ↓
User can hover for visual feedback
```

## Color Coding System

### Grade Performance Colors
```
Performance  │ Background        │ Text Color  │ Grade Range
─────────────┼──────────────────┼─────────────┼──────────────
Excellent    │ #ecfdf5 (Light G)│ #059669 (G) │ ≥ 75%
Satisfactory │ #fffbeb (Light O)│ #d97706 (O) │ 50-74%
Needs Work   │ #fef2f2 (Light R)│ #dc2626 (R) │ < 50%
No Grade     │ #f1f5f9 (Light G)│ #cbd5e0 (Gray) │ N/A
```

### UI Colors
```
Element              │ Color Code │ Usage
─────────────────────┼────────────┼──────────────────────
Primary Button       │ #872341    │ Active view mode btn
Secondary Text       │ #64748b    │ Labels, descriptions
Light Background     │ #f8f9fa    │ Card left section
Border Color         │ #e2e8f0    │ Card borders
Dark Text            │ #1e293b    │ Headings
```

## Interactive States

### Button States (View Toggle)
```
Inactive:  White bg, gray border, gray text
  ↓ hover
Hovered:   White bg, maroon border, gray text
  
Active:    Maroon bg (#872341), maroon border, white text
```

### Card States
```
Normal:    Gray shadow, no transform
  ↓ hover
Hovered:   Larger shadow, translateY(-4px)
```

## Accessibility Features

- Proper heading hierarchy (h3 for titles)
- Color contrast for visibility
- Descriptive button titles/tooltips
- Keyboard-friendly toggle buttons
- Screen reader compatible structure

## Animation Details

### View Toggle Buttons
```
Transition: all 0.2s
- background-color
- border-color
- color
```

### Cards
```
Transition: all 0.3s ease
- box-shadow
- transform
Duration: 300ms
```

## Empty States

When no grades available:
```
┌──────────────────────────────────────────┐
│                                          │
│          🎓 Graduation Cap Icon         │
│                                          │
│          No Grades Found                │
│          No project grades available    │
│                                          │
│              (Centered)                 │
│                                          │
└──────────────────────────────────────────┘
```

## Performance Optimizations

1. **Grid Auto-Fill**: `grid-template-columns: repeat(auto-fill, minmax(600px, 1fr))`
   - Automatic responsive behavior
   - No media queries needed
   - Adapts to container width

2. **CSS Transitions**: Smooth animations without heavy JS
   - transform (GPU accelerated)
   - opacity
   - box-shadow

3. **Data Mapping**: Single pass through arrays
   - Filter by course_id
   - Map to card object structure

4. **No Redundant Renders**: Conditional at function entry
   - Early return if wide mode
   - Prevents unnecessary computation
