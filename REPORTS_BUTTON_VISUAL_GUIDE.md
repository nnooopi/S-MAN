# Visual Location Guide: Reports Button in Grade Submissions

## Step-by-Step Visual Flow

### 1. Navigate to Grade Submissions
```
Professor Dashboard Sidebar
  ├─ Course Overview
  ├─ Students
  ├─ Groups
  ├─ Projects
  ├─ Tasks
  ├─ Grading
  ├─ Join Requests
  ├─ Announcements
  └─ Grade Submissions ← Click here
```

### 2. Select a Project
```
┌─────────────────────────────────────────────────┐
│                                                 │
│   [▼ Select a Project]  ← Dropdown at top     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. View Submissions List (Left Column)
```
┌────────────────────────────────┐
│  Submissions                   │
├────────────────────────────────┤
│  [Phase] [Project] Filters     │
├────────────────────────────────┤
│  ┌──────────────────────────┐ │
│  │ Group 1 - Phase 1       │ │ ← Click a submission
│  │ Submitted: Nov 3, 2025  │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ Group 2 - Phase 1       │ │
│  │ Submitted: Nov 2, 2025  │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

### 4. Submission Details View (Right Column)
```
┌─────────────────────────────────────────────────────────────┐
│  Submission Details                                         │
│                                                             │
│  Submitted by: Group 1 (Leader: John Doe)                  │
│                                                             │
│                                        ┌─────────────────┐ │
│                                        │   [✓] Graded    │ │ ← Status Pill
│                                        └─────────────────┘ │
│                                        ┌─────────────────┐ │
│                                        │ [📊] Reports    │ │ ← NEW BUTTON HERE!
│                                        └─────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Submitted On: November 3, 2025                      │  │
│  │ Type: Phase Submission                              │  │
│  │ Phase: Design Phase                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Description:                                               │
│  "We have completed all design mockups..."                  │
│                                                             │
│  Attached Files:                                            │
│  [📄 Design_Mockup.pdf] [Download]                         │
│  [📄 Wireframes.pdf] [Download]                            │
│                                                             │
│  [Member Submissions Section...]                            │
│  [Evaluations Section...]                                   │
│  [Grading Section...]                                       │
└─────────────────────────────────────────────────────────────┘
```

### 5. Reports Modal Opens When Button is Clicked
```
┌───────────────────────────────────────────────────────────────────┐
│  Group Reports                                          [X] Close │
│  Group 1 - Project Alpha                                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────── Project Information ─────────────────────┐│
│  │ Project Title: Project Alpha                                 ││
│  │ Start Date: Oct 1, 2025     Due Date: Dec 15, 2025          ││
│  │ Status: Ongoing                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─────────────────── Team Members (5) ─────────────────────────┐│
│  │ [👤 John Doe - Leader] [👤 Jane Smith] [👤 Bob Wilson]      ││
│  │ [👤 Alice Brown] [👤 Charlie Davis]                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌───────────────────── Task Summary ───────────────────────────┐│
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        ││
│  │  │   12    │  │    3    │  │    2    │  │   17    │        ││
│  │  │Completed│  │ Pending │  │Revision │  │  Total  │        ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ℹ️ For detailed charts and timeline, check the Reports tab     │
│     in the student dashboard.                                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Button Specifications

### Visual Appearance
- **Background Color**: #872341 (Maroon)
- **Text Color**: White
- **Border**: None
- **Border Radius**: 8px
- **Padding**: 8px 16px
- **Font Size**: 13px
- **Font Weight**: 600
- **Icon**: 📊 Chart Bar (FaChartBar)
- **Shadow**: 0 2px 4px rgba(135, 35, 65, 0.2)

### Hover State
- **Background Color**: #BE3144 (Lighter Maroon)
- **Transform**: translateY(-1px)
- **Shadow**: 0 4px 8px rgba(135, 35, 65, 0.3)

### Position
- **Location**: Right column, top-right area
- **Alignment**: flex-end (right-aligned)
- **Below**: Status pill (Graded/Ungraded)
- **Gap**: 8px from status pill

### HTML Structure
```
<div style="display: flex; flexDirection: column; alignItems: flex-end; gap: 8px">
  <!-- Status Pill -->
  <span style="...">
    [✓] Graded / [⏰] Ungraded
  </span>
  
  <!-- Reports Button -->
  <button style="..." onClick={openReportsModal}>
    <FaChartBar /> Reports
  </button>
</div>
```

## Modal Specifications

### Layout
- **Position**: Fixed, centered on screen
- **Width**: 95% of viewport, max 1400px
- **Max Height**: 90vh
- **Background**: White
- **Border Radius**: 16px
- **Shadow**: 0 20px 60px rgba(0, 0, 0, 0.3)
- **Backdrop**: rgba(0, 0, 0, 0.7)
- **z-index**: 10000

### Sections
1. **Header** (sticky, 24px padding)
   - Title: "Group Reports" (28px, bold, #872341)
   - Subtitle: Group name + Project title (14px, #6B7280)
   - Close button (X icon, top-right)

2. **Content** (32px padding)
   - Project Information Card
   - Team Members Card
   - Task Summary Card
   - Info Notice

### Scrolling
- Modal header is sticky (stays at top when scrolling)
- Content scrolls independently
- Smooth scrolling behavior

## Color Legend

### Status Colors
- 🟢 **Completed**: #D1FAE5 (light green background), #059669 (text)
- 🟡 **Pending**: #FEF3C7 (light yellow background), #D97706 (text)
- 🔴 **Revision**: #FEE2E2 (light red background), #DC2626 (text)
- ⚪ **Total**: #E5E7EB (light gray background), #374151 (text)

### UI Colors
- **Primary**: #872341 (Maroon - buttons, headings)
- **Secondary**: #6B7280 (Gray - labels, secondary text)
- **Background**: #F9FAFB (Light gray - cards)
- **Border**: #E5E7EB (Light gray - borders)
- **Success**: #10B981 (Green - completed status)
- **Warning**: #F59E0B (Yellow - pending status)
- **Error**: #EF4444 (Red - error/revision status)
- **Info**: #3B82F6 (Blue - info notices)

## Accessibility Features

### Keyboard Navigation
- Modal can be closed with Escape key (browser default)
- Buttons are focusable with Tab key
- Click handlers respect keyboard events

### Screen Readers
- Semantic HTML structure
- Proper heading hierarchy (h2, h3)
- Alt text for images
- ARIA labels on buttons

### Visual Clarity
- High contrast text (WCAG AA compliant)
- Clear visual hierarchy
- Sufficient padding and spacing
- Readable font sizes (14px+)

## Responsive Behavior

### Desktop (> 1400px)
- Modal at max-width 1400px, centered
- Grid layouts use all columns
- Full spacing and padding

### Tablet (768px - 1399px)
- Modal width 95% of viewport
- Grid adjusts to fewer columns
- Maintained spacing

### Mobile (< 768px)
- Modal width 95% of viewport
- Grid becomes single column
- Reduced padding (20px)
- Scrollable content

## Interaction States

### Idle
- Button visible below status pill
- Maroon background (#872341)
- No effects

### Hover
- Background lightens to #BE3144
- Slight upward translation (-1px)
- Shadow increases

### Click
- Opens modal immediately
- Shows loading spinner while fetching
- Disables button during loading

### Loading
- Modal displays with spinner
- "Loading reports data..." text
- Centered in modal content area

### Loaded
- Spinner disappears
- Content fades in
- All data displayed

### Error
- Notification toast appears
- Modal remains open (can retry)
- Error message in notification

### Close
- Click X button or backdrop
- Modal fades out
- Returns to submission detail view

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Opera 76+

### Features Used
- CSS Flexbox (widely supported)
- CSS Grid (widely supported)
- Fetch API (widely supported)
- ES6+ JavaScript (requires transpilation)
- React Hooks (requires React 16.8+)

### Fallbacks
- No special fallbacks needed
- Modern CSS features with broad support
- Graceful degradation for older browsers
