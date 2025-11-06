# SimplifiedProjectCreator Component Analysis

## Overview
The `SimplifiedProjectCreator` is a modal component used by `CourseProfessorDashboard` to create new projects. It's a comprehensive form wizard with a step-by-step interface that guides professors through project setup with multiple phases, rubrics, and evaluations.

**File Location:** `frontend/src/components/SimplifiedProjectCreator.js`  
**File Size:** 3,195 lines  
**Purpose:** Multi-step project creation modal with phase management, rubric configuration, and evaluation setup

---

## Component Props

```javascript
{
  onClose: function,              // Callback to close the modal
  onProjectCreated: function,     // Callback when project is successfully created
  courseId: string               // The course ID for the new project
}
```

---

## State Management

### 1. **Form Data State** (formData)
Main project configuration:
```javascript
{
  title: '',                          // Project name
  description: '',                    // Project description
  startDate: '',                      // Project start date (ISO format)
  dueDate: '',                        // Project due date (ISO format)
  fileTypesAllowed: [],              // Array of allowed file types (e.g., ['pdf', 'doc'])
  maxFileSizeMb: 10,                 // Max file size in MB
  minTasksPerMember: 1,              // Min tasks per team member
  maxTasksPerMember: 5,              // Max tasks per team member
  breathePhaseDays: 0,               // Days between phases
  projectRubricType: '',             // 'builtin' or 'upload'
  projectRubricFile: null,           // Uploaded rubric file object
  projectEvaluationType: '',         // 'builtin' or 'custom'
  projectEvaluationDeadline: '',     // Evaluation deadline (ISO format)
  projectEvaluationForm: null        // Uploaded evaluation form file object
}
```

### 2. **Built-in Evaluation State** (builtInEvaluation)
Default evaluation criteria used when `projectEvaluationType === 'builtin'`:
```javascript
{
  criteria: [
    { name: 'Contribution', maxPoints: 20, description: '...' },
    { name: 'Compliance', maxPoints: 15, description: '...' },
    { name: 'Quality Work', maxPoints: 25, description: '...' },
    { name: 'Cooperation', maxPoints: 15, description: '...' },
    { name: 'Overall Performance', maxPoints: 25, description: '...' }
  ],
  totalPoints: 100,
  instructions: 'Rate your groupmates according to the following criteria...'
}
```

### 3. **Phases State** (phases)
Array of project phases:
```javascript
[
  {
    id: 'phase-1',                      // Unique phase ID
    name: 'Phase 1',                    // Phase title
    description: '',                    // Phase description
    startDate: '',                      // Phase start date (ISO format)
    endDate: '',                        // Phase end date (ISO format)
    file_types_allowed: [],            // File types for this phase
    rubricType: '',                     // 'builtin' or 'upload'
    rubricFile: null,                  // Uploaded rubric for this phase
    evaluation_form_type: '',          // 'builtin' or 'custom'
    evaluation_form: null,             // Uploaded evaluation form for this phase
    tasks: []                          // Tasks within phase
  },
  // ... more phases
]
```

### 4. **Project Rubric State** (projectRubric)
Default project evaluation rubric:
```javascript
{
  instructions: 'Your project will be evaluated using...',
  criteria: [
    { name: 'Quality of Work', maxPoints: 25, description: '...' },
    { name: 'Technical Implementation', maxPoints: 25, description: '...' },
    // ... more criteria
  ],
  totalPoints: 100
}
```

### 5. **UI State**
- `loading: boolean` - Loading/submission state
- `error: string` - Error message to display
- `selectedCategory: string|null` - Selected file type category
- `selectedPhaseCategory: object` - Selected category per phase for file type selection
- `currentStep: string` - Current step in wizard ('project-setup', 'phases', 'rubric-evaluation')
- `completedSteps: Set` - Track which steps have been completed

---

## Step Structure

The component has a **step-by-step wizard** with 3 main steps:

### Step 1: **Project Setup** (`project-setup`)
**Fields:**
- Project title (required)
- Project description
- Start date (DateTimePicker, ISO format)
- Due date (DateTimePicker, ISO format)
- File types allowed (categorized selector)
- Max file size (MB)
- Min/Max tasks per member
- Breathing phase days (buffer between phases)

**Subsections:**
- Basic Information
- Timeline
- File Restrictions

### Step 2: **Phases** (`phases`)
**Features:**
- Add/remove phases
- For each phase:
  - Phase name, description
  - Start/end dates (DateTimePicker, ISO format)
  - File types allowed for phase
  - Rubric type (builtin/upload)
  - Evaluation form type (builtin/custom)
  - File uploads if custom

**Subsections:**
- Phase Configuration
- Rubric & Evaluation per phase

### Step 3: **Rubric & Evaluation** (`rubric-evaluation`)
**Project-level settings:**
- Project rubric type (builtin/upload)
- Project evaluation type (builtin/custom)
- Evaluation deadline (DateTimePicker, ISO format)
- File uploads for custom rubrics/evaluations

**Subsections:**
- Project Rubric Setup
- Project Evaluation Setup

---

## Key Handler Functions

### 1. **handleInputChange(field, value)**
Updates a field in `formData`:
```javascript
const handleInputChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### 2. **handleFileTypesChange(selectedTypes)**
Updates allowed file types in formData:
```javascript
const handleFileTypesChange = (selectedTypes) => {
  setFormData(prev => ({
    ...prev,
    fileTypesAllowed: selectedTypes
  }));
};
```

### 3. **handlePhaseFileTypesChange(phaseIndex, fileType)**
Toggles a file type for a specific phase:
```javascript
const handlePhaseFileTypesChange = (phaseIndex, fileType) => {
  // Toggles fileType in phases[phaseIndex].file_types_allowed
};
```

### 4. **handleFileUpload(field, file)**
Stores uploaded file in formData (for rubrics/evaluations):
```javascript
const handleFileUpload = (field, file) => {
  setFormData(prev => ({
    ...prev,
    [field]: file
  }));
};
```

### 5. **handlePhaseFileUpload(phaseIndex, field, file)**
Stores uploaded file in a specific phase:
```javascript
const handlePhaseFileUpload = (phaseIndex, field, file) => {
  // Updates phases[phaseIndex][field] = file
};
```

### 6. **handleSubmit(e)** ⭐ **MAIN SUBMISSION**
**Validation Steps:**
1. ✓ Project title required
2. ✓ Due date required
3. ✓ Project rubric type selected
4. ✓ Project evaluation type selected
5. ✓ At least one phase exists
6. ✓ Each phase has: name, description, start/end dates, rubric type, evaluation type
7. ✓ Rubric files uploaded if upload type selected
8. ✓ Evaluation forms uploaded if custom type selected

**Submission Process:**
1. Converts all files to Base64 using FileReader API
2. Builds projectData object with:
   - Form fields
   - Converted phase files
   - Built-in rubric (if builtin type)
   - Built-in evaluation (if builtin type)
   - Course ID
3. POSTs to `/api/professor/course/{courseId}/projects`
4. On success: calls `onProjectCreated()` and `onClose()`
5. On error: displays error message

**API Call:**
```javascript
POST /api/professor/course/{courseId}/projects
Content-Type: application/json
Authorization: Bearer {token}

{
  title, description, startDate, dueDate,
  fileTypesAllowed, maxFileSizeMb,
  minTasksPerMember, maxTasksPerMember,
  breathePhaseDays, courseId,
  projectRubricType, projectRubricFile,
  projectEvaluationType, projectEvaluationForm,
  projectEvaluationDeadline,
  phases: [
    {
      name, description, startDate, endDate,
      file_types_allowed, rubricType, rubricFileData,
      evaluation_form_type, evaluationFormData
    }
  ],
  projectRubric, builtInEvaluation
}
```

---

## Date Handling

**Important:** All dates are converted using **DateTimePicker** from Material-UI with **dayjs adapter**

**Date Format:** ISO 8601 with timezone (via `.toISOString()`)

**Fields using DateTimePicker:**
- `formData.startDate` (Project start)
- `formData.dueDate` (Project due)
- `formData.projectEvaluationDeadline` (Evaluation deadline)
- `phase.startDate` (Phase start)
- `phase.endDate` (Phase end)

**Example:**
```javascript
<DateTimePicker
  value={dayjs(formData.startDate)}
  onChange={(newValue) => {
    handleInputChange('startDate', newValue.toISOString());
  }}
  format="YYYY-MM-DD HH:mm"
/>
```

---

## File Type Management

### File Type Categories:
```javascript
{
  'Documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
  'Images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
  'Videos': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
  'Audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  'Archives': ['zip', 'rar', '7z', 'tar', 'gz'],
  'Programming': ['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'],
  'Data': ['csv', 'json', 'xml', 'sql', 'xlsx', 'xls'],
  'Presentations': ['ppt', 'pptx', 'odp'],
  'Other': ['exe', 'dmg', 'iso', 'bin']
}
```

**Selection UI:**
- Two-panel layout: Categories on left, file types on right
- Click category to expand file types
- Click file types to toggle selection
- Shows count of selected types

---

## Integration with Backend

### Project Creation Endpoint
**POST** `/api/professor/course/{courseId}/projects`

**Expected Backend Processing:**
1. Receives project data with all fields
2. Creates project record with:
   - Title, description, dates
   - File restrictions
   - Task settings
3. Creates associated phases with:
   - Phase metadata
   - Phase-specific rubrics/evaluations
   - File type restrictions per phase
4. Handles file uploads:
   - Stores rubric files
   - Stores evaluation forms
   - Returns file URLs

**Error Handling:**
- Throws errors if validation fails
- Component catches and displays error message
- Loading state managed during submission

---

## Key Features

### ✅ Multi-Step Wizard
- Step navigation with completion tracking
- Breadcrumb-style sidebar
- Subsection indicators

### ✅ Phase Management
- Add/remove phases dynamically
- Each phase has independent configuration
- Dates auto-suggested based on breathing days

### ✅ Flexible Rubrics
- Built-in default rubric templates
- Upload custom rubric files
- Per-phase and per-project rubrics

### ✅ Flexible Evaluations
- Built-in peer evaluation criteria
- Custom evaluation forms
- Per-phase and per-project evaluations

### ✅ File Type Control
- Categorized file type selector
- Project-wide and phase-specific restrictions
- Size limits configurable

### ✅ Date/Time Management
- Material-UI DateTimePicker
- ISO 8601 format with timezone
- Proper date validation

### ✅ Base64 File Transmission
- Converts files to Base64 strings
- Transmits via JSON
- Supports multiple file uploads

---

## Data Flow

```
1. User opens CourseProfessorDashboard
2. Clicks "Create Project"
3. SimplifiedProjectCreator modal opens with courseId
4. User fills Step 1 (Project Setup)
5. User creates phases in Step 2 (Phases)
6. User configures rubrics/evaluations in Step 3
7. User clicks "Create Project"
8. handleSubmit():
   - Validates all required fields
   - Converts files to Base64
   - Builds projectData object
   - POSTs to /api/professor/course/{courseId}/projects
9. Backend processes and creates project
10. onProjectCreated() refreshes professor dashboard
11. Modal closes
```

---

## Important Notes

### Date Timezone Handling
- All dates are sent as **ISO 8601 strings** with timezone information via `.toISOString()`
- Backend should detect ISO format and handle timezone conversion properly
- See: Lines 840, 857, 1154, 1416, 1433 for date picker implementations

### File Upload Process
- Files are **NOT sent as FormData**
- Instead converted to **Base64 strings** and sent as JSON
- Backend should decode Base64 and save to Supabase Storage
- File paths use **flat structure**: `${courseId}_${timestamp}_${fileName}` (to avoid RLS issues)

### Validation
- Frontend validates before submission
- Comprehensive error messages guide user
- Backend should also validate all fields

### State Management
- No Redux or context used
- All state local to component using `useState`
- Parent component controls modal visibility

---

## Common Tasks

### To Add a New Field to Project:
1. Add field to `formData` initial state
2. Add input in Step 1 form
3. Handle in `handleInputChange`
4. Include in `handleSubmit` submission data
5. Add validation in `handleSubmit` if required

### To Add a New Phase Feature:
1. Add field to phase object in `phases` state
2. Create handler: `handlePhaseXChange(phaseIndex, value)`
3. Add UI input in phase rendering
4. Include in submission payload

### To Modify Rubric Criteria:
1. Update `projectRubric.criteria` array
2. Update `builtInEvaluation.criteria` array
3. Adjust `totalPoints` if needed
4. Changes apply to all new projects

---

## UI Components Used

- **Icons:** lucide-react (X, Plus, Trash2, Upload, FileText, ChevronDown, AlertCircle, CheckCircle, RotateCcw)
- **Date Picker:** @mui/x-date-pickers (DateTimePicker, LocalizationProvider, AdapterDayjs)
- **Date Library:** dayjs

---

## CSS Classes (Main)

```css
.modal-overlay              /* Full-screen overlay */
.two-column-project-modal   /* Main modal container */
.modal-header               /* Header with title and close button */
.modal-body                 /* Main content area with sidebar + content */
.steps-sidebar              /* Left sidebar with step list */
.step-item                  /* Individual step in sidebar */
.step-item.active           /* Current step styling */
.step-item.completed        /* Completed step styling */
.content-area               /* Right content area */
.step-content               /* Content for each step */
.form-section               /* Form section grouping */
.form-group                 /* Individual form field */
.form-row                   /* Row of form fields */
.file-types-container       /* File type selector container */
.categories-panel           /* Categories panel in file selector */
.file-types-panel           /* File types panel in file selector */
.modal-footer               /* Footer with action buttons */
.error-alert                /* Error message display */
```

---

## Summary

The **SimplifiedProjectCreator** is a sophisticated, multi-step project creation wizard that allows professors to:
- Define project metadata (title, description, dates)
- Create multiple phases with independent configurations
- Set up project-wide and phase-specific rubrics and evaluations
- Restrict file types and sizes
- Configure task distribution among team members
- Submit everything as a single project creation request

It's tightly integrated with the Material-UI date picker system and uses Base64 file encoding for uploads. The component is completely self-contained with local state management and event handlers for all user interactions.
