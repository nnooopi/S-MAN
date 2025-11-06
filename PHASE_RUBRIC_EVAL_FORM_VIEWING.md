# Phase Rubric and Evaluation Form Viewing Implementation

## Overview
Implemented the "View Rubric" and "View Evaluation Form" functionality for phase deliverables in the Student Dashboard. Students can now view both built-in and custom rubrics/evaluation forms for each phase.

## Features Implemented

### 1. Frontend (CourseStudentDashboard.js)

#### New State Variables
```javascript
const [showPhaseRubricModal, setShowPhaseRubricModal] = useState(false);
const [showPhaseEvalFormModal, setShowPhaseEvalFormModal] = useState(false);
const [phaseRubricData, setPhaseRubricData] = useState(null);
const [phaseEvalFormData, setPhaseEvalFormData] = useState(null);
const [rubricLoading, setRubricLoading] = useState(false);
const [evalFormLoading, setEvalFormLoading] = useState(false);
```

#### Fetch Functions Added
- `fetchPhaseRubric(phaseId, setRubricData, setLoading)` - Fetches rubric data from backend
- `fetchPhaseEvaluationForm(phaseId, setEvalFormData, setLoading)` - Fetches evaluation form data from backend

#### Updated Button Handlers
**View Rubric Button:**
```javascript
onClick={() => {
  console.log('View rubric clicked for phase:', phase.id);
  fetchPhaseRubric(phase.id, setPhaseRubricData, setRubricLoading);
  setShowPhaseRubricModal(true);
}}
```

**View Evaluation Form Button:**
```javascript
onClick={() => {
  console.log('View evaluation form clicked for phase:', phase.id);
  fetchPhaseEvaluationForm(phase.id, setPhaseEvalFormData, setEvalFormLoading);
  setShowPhaseEvalFormModal(true);
}}
```

#### Modal Components Created

**Phase Rubric Modal:**
- Shows loading spinner while fetching
- Displays error messages if rubric not found or fetch fails
- **For Custom Rubrics:**
  - Shows file indicator badge
  - Embeds PDF/file in iframe
  - Provides download button
- **For Built-in Rubrics:**
  - Shows total points badge
  - Displays instructions
  - Lists all criteria with names, descriptions, and max points

**Phase Evaluation Form Modal:**
- Shows loading spinner while fetching
- Displays error messages if form not found or fetch fails
- **For Custom Forms:**
  - Shows file indicator badge
  - Embeds PDF/file in iframe
  - Provides download button
- **For Built-in Forms:**
  - Shows total points badge
  - Displays instructions
  - Lists all criteria with names, descriptions, and max points

### 2. Backend (server.js)

#### New API Endpoints

**GET `/api/student/phases/:phaseId/rubric`**
- Authenticates student
- Verifies student enrollment in the phase's course
- Checks for custom rubric first (`phase_custom_rubrics` table)
- Falls back to built-in rubric (`phase_rubrics` and `phase_rubric_criteria` tables)
- Returns appropriate data structure:

**Custom Rubric Response:**
```json
{
  "is_custom": true,
  "file_url": "https://...",
  "file_name": "rubric.pdf",
  "created_at": "...",
  "updated_at": "..."
}
```

**Built-in Rubric Response:**
```json
{
  "is_custom": false,
  "id": "uuid",
  "phase_id": "uuid",
  "instructions": "...",
  "total_points": 100,
  "criteria": [
    {
      "id": "uuid",
      "name": "Criterion Name",
      "description": "...",
      "max_points": 25,
      "order_index": 0
    }
  ]
}
```

**GET `/api/student/phases/:phaseId/evaluation-form`**
- Authenticates student
- Verifies student enrollment in the phase's course
- Fetches evaluation form from `phase_evaluation_forms` table
- Checks `is_custom_evaluation` flag and `custom_file_url`
- Returns built-in criteria from `phase_evaluation_criteria` or custom file info

**Custom Evaluation Form Response:**
```json
{
  "is_custom": true,
  "custom_file_url": "https://...",
  "custom_file_name": "eval_form.pdf",
  "id": "uuid",
  "phase_id": "uuid",
  "instructions": "...",
  "total_points": 100,
  "available_from": "...",
  "due_date": "..."
}
```

**Built-in Evaluation Form Response:**
```json
{
  "is_custom": false,
  "id": "uuid",
  "phase_id": "uuid",
  "instructions": "...",
  "total_points": 100,
  "available_from": "...",
  "due_date": "...",
  "criteria": [
    {
      "id": "uuid",
      "name": "Criterion Name",
      "description": "...",
      "max_points": 25,
      "order_index": 0
    }
  ]
}
```

## Database Tables Used

### Phase Rubrics
- `phase_rubrics` - Built-in rubric metadata
- `phase_rubric_criteria` - Built-in rubric criteria
- `phase_custom_rubrics` - Custom rubric file uploads

### Phase Evaluation Forms
- `phase_evaluation_forms` - Evaluation form metadata (has `is_custom_evaluation` flag)
- `phase_evaluation_criteria` - Built-in evaluation criteria
- Custom files stored in `custom_file_url` field

## User Experience

### Built-in Rubric/Form Display
1. User clicks "View Rubric" or "View Evaluation Form"
2. Loading spinner appears
3. Modal displays:
   - Header with title
   - Total points badge (green background)
   - Instructions section (gray background)
   - Criteria cards showing:
     - Criterion name (bold)
     - Max points (blue badge on right)
     - Description text

### Custom Rubric/Form Display
1. User clicks "View Rubric" or "View Evaluation Form"
2. Loading spinner appears
3. Modal displays:
   - Header with title
   - File type indicator badge (blue background)
   - Embedded PDF/file viewer (iframe, 600px height)
   - Download button with icon

### Error Handling
- **404 Error**: "No rubric/form found for this phase"
- **Other Errors**: "Failed to load rubric/form"
- **403 Error**: "Access denied - not enrolled in course"

## Styling Details
- Modal overlay: Semi-transparent black background (rgba(0, 0, 0, 0.5))
- Modal container: White, rounded corners (12px), max-width 800px
- Modal header: Sticky, white background with bottom border
- Close button: Gray with hover effect (light gray background on hover)
- Criteria cards: Light gray background (#FAFAFA), bordered
- Points badges: Dark teal background (#34656D), white text
- Download button: Matches site theme (#34656D)

## Testing Checklist

### Built-in Rubric
- [ ] Click "View Rubric" button
- [ ] Verify modal opens
- [ ] Check total points display
- [ ] Verify all criteria are shown
- [ ] Check criterion descriptions
- [ ] Verify max points for each criterion
- [ ] Close modal and reopen

### Custom Rubric
- [ ] Click "View Rubric" for phase with custom rubric
- [ ] Verify modal shows file indicator
- [ ] Check PDF/file displays in iframe
- [ ] Click download button
- [ ] Verify file downloads correctly

### Built-in Evaluation Form
- [ ] Click "View Evaluation Form" button
- [ ] Verify modal opens
- [ ] Check total points display
- [ ] Verify all criteria are shown
- [ ] Check criterion descriptions
- [ ] Verify max points for each criterion

### Custom Evaluation Form
- [ ] Click "View Evaluation Form" for phase with custom form
- [ ] Verify modal shows file indicator
- [ ] Check PDF/file displays in iframe
- [ ] Click download button
- [ ] Verify file downloads correctly

### Error Cases
- [ ] Test with phase that has no rubric (should show error)
- [ ] Test with phase that has no evaluation form (should show error)
- [ ] Test with unenrolled student (should get 403 error)

## Notes
- Implementation follows the same pattern as project rubric/evaluation form viewing
- Both built-in and custom types are supported
- Full authentication and authorization checks in place
- Consistent styling with rest of the application
- Responsive modal design

