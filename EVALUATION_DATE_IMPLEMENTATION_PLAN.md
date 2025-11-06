# Evaluation & Rubric Date Implementation Plan

## Problem Statement
Currently, phase and project evaluations have no hard-coded due dates or availability start dates. Custom/uploaded rubrics and evaluations are encoded directly in the projects/project_phases table columns, which makes them difficult to manage and query.

## Requirements

### Date Calculation Logic
**Timeline Flow:**
```
Phase 1 End (Oct 1 11:59 PM)
  ↓
Evaluation Phase Start (Oct 2 12:00 AM)
  ↓ evaluation_phase_days (e.g., 2 days)
Evaluation Phase End (Oct 3 11:59 PM)
  ↓
Breathe Phase Start (Oct 4 12:00 AM)
  ↓ breathe_phase_days (e.g., 2 days)
Breathe Phase End (Oct 5 11:59 PM)
  ↓
Phase 2 Start (Oct 6 12:00 AM or later)
```

### Key Rules:
1. **Evaluation phase always starts the day after phase ends** (12:00 AM)
2. **Evaluation duration** = `evaluationPhaseDays` setting
3. **Breathe phase starts after evaluation ends** (if configured)
4. **Next phase can only start after** evaluation + breathe phase complete
5. **All dates are in ISO 8601 format** with timezone

---

## Current Database Structure

### Projects Table
```sql
projects (
  id uuid PRIMARY KEY,
  course_id uuid FK → courses(id),
  title varchar,
  description text,
  start_date timestamptz,
  due_date timestamptz,
  breathe_phase_days smallint,  -- ✅ Already exists
  project_evaluation_deadline timestamptz,
  project_evaluation_type text,  -- 'builtin' | 'custom'
  project_rubric_type text,      -- 'builtin' | 'upload'
  rubric text,                   -- ❌ Encoded JSON/text
  rubric_file_url text,
  evaluation_form_type varchar,
  evaluation_form_file_url text,
  ...
)
```

### Project Phases Table
```sql
project_phases (
  id uuid PRIMARY KEY,
  project_id uuid FK → projects(id),
  phase_number int,
  title varchar,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  file_types_allowed text,
  rubric text,                  -- ❌ Encoded JSON/text
  rubric_file_url text,
  evaluation_form_type varchar,
  evaluation_form_file_url text,
  max_attempts int,
  ...
)
```

### Built-in Evaluation Tables (existing)
```sql
-- Project-level built-in evaluation
project_evaluation_forms (
  id uuid PRIMARY KEY,
  project_id uuid UNIQUE FK → projects(id),
  instructions text,
  total_points int,
  created_at timestamptz,
  updated_at timestamptz
  -- ❌ Missing: available_from, due_date
)

project_evaluation_criteria (
  id uuid PRIMARY KEY,
  project_evaluation_form_id uuid FK → project_evaluation_forms(id),
  name varchar,
  description text,
  max_points int,
  order_index int,
  ...
)

-- Phase-level built-in evaluation
phase_evaluation_forms (
  id uuid PRIMARY KEY,
  phase_id uuid UNIQUE FK → project_phases(id),
  instructions text,
  total_points int,
  created_at timestamptz,
  updated_at timestamptz
  -- ❌ Missing: available_from, due_date
)

phase_evaluation_criteria (
  id uuid PRIMARY KEY,
  phase_evaluation_form_id uuid FK → phase_evaluation_forms(id),
  name varchar,
  description text,
  max_points int,
  order_index int,
  ...
)
```

### Built-in Rubric Tables (existing)
```sql
-- Project-level built-in rubric
project_rubrics (
  id uuid PRIMARY KEY,
  project_id uuid UNIQUE FK → projects(id),
  instructions text,
  total_points int,
  created_at timestamptz,
  updated_at timestamptz
)

project_rubric_criteria (
  id uuid PRIMARY KEY,
  project_rubric_id uuid FK → project_rubrics(id),
  name varchar,
  description text,
  max_points int,
  order_index int,
  ...
)

-- Phase-level built-in rubric
phase_rubrics (
  id uuid PRIMARY KEY,
  phase_id uuid UNIQUE FK → project_phases(id),
  instructions text,
  total_points int,
  created_at timestamptz,
  updated_at timestamptz
)

phase_rubric_criteria (
  id uuid PRIMARY KEY,
  phase_rubric_id uuid FK → phase_rubrics(id),
  name varchar,
  description text,
  max_points int,
  order_index int,
  ...
)
```

---

## New Database Structure

### 1. Add Date Fields to Built-in Evaluation Tables ⭐

**Update `project_evaluation_forms`:**
```sql
ALTER TABLE project_evaluation_forms
ADD COLUMN available_from timestamptz,
ADD COLUMN due_date timestamptz;
```

**Update `phase_evaluation_forms`:**
```sql
ALTER TABLE phase_evaluation_forms
ADD COLUMN available_from timestamptz,
ADD COLUMN due_date timestamptz;
```

### 2. Create Custom Evaluation Tables ⭐ **NEW**

**Phase Custom Evaluations:**
```sql
CREATE TABLE phase_custom_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id uuid UNIQUE NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  file_url text NOT NULL,                    -- Uploaded evaluation form file
  file_name varchar(255),                     -- Original file name
  available_from timestamptz NOT NULL,        -- Calculated: phase.end_date + 1 day
  due_date timestamptz NOT NULL,              -- Calculated: available_from + evaluation_phase_days
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_phase_custom_evaluations_phase_id ON phase_custom_evaluations(phase_id);
CREATE INDEX idx_phase_custom_evaluations_due_date ON phase_custom_evaluations(due_date);
```

**Project Custom Evaluations:**
```sql
CREATE TABLE project_custom_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,                    -- Uploaded evaluation form file
  file_name varchar(255),                     -- Original file name
  available_from timestamptz NOT NULL,        -- Calculated: last phase end + 1 day
  due_date timestamptz NOT NULL,              -- Set by professor (project_evaluation_deadline)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_project_custom_evaluations_project_id ON project_custom_evaluations(project_id);
CREATE INDEX idx_project_custom_evaluations_due_date ON project_custom_evaluations(due_date);
```

### 3. Create Custom Rubric Tables ⭐ **NEW**

**Phase Custom Rubrics:**
```sql
CREATE TABLE phase_custom_rubrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id uuid UNIQUE NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  file_url text NOT NULL,                    -- Uploaded rubric file
  file_name varchar(255),                     -- Original file name
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_phase_custom_rubrics_phase_id ON phase_custom_rubrics(phase_id);
```

**Project Custom Rubrics:**
```sql
CREATE TABLE project_custom_rubrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,                    -- Uploaded rubric file
  file_name varchar(255),                     -- Original file name
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_project_custom_rubrics_project_id ON project_custom_rubrics(project_id);
```

### 4. Add New Field to Projects Table ⭐

```sql
ALTER TABLE projects
ADD COLUMN evaluation_phase_days smallint DEFAULT 2;  -- Days for evaluation phase duration
```

---

## Frontend Changes

### SimplifiedProjectCreator.js Updates

#### 1. Add New State Field

```javascript
const [formData, setFormData] = useState({
  // ... existing fields
  breathePhaseDays: 0,
  evaluationPhaseDays: 2,  // ⭐ NEW: Days for evaluation phase
  projectEvaluationDeadline: '',
  // ...
});
```

#### 2. Add UI Input for Evaluation Phase Days

In Step 1 (Project Setup), add input field:
```jsx
<div className="form-group">
  <label>Evaluation Phase Days</label>
  <input
    type="number"
    min="0"
    max="30"
    value={formData.evaluationPhaseDays}
    onChange={(e) => handleInputChange('evaluationPhaseDays', parseInt(e.target.value) || 0)}
  />
  <small>Number of days allocated for peer evaluations after each phase ends</small>
</div>
```

#### 3. Implement Date Calculation Functions

```javascript
// Calculate evaluation start date (day after phase ends at 12:00 AM)
const calculateEvaluationStartDate = (phaseEndDate) => {
  const phaseEnd = dayjs(phaseEndDate);
  return phaseEnd.add(1, 'day').startOf('day').toISOString();  // Next day 12:00 AM
};

// Calculate evaluation due date
const calculateEvaluationDueDate = (evaluationStartDate, evaluationDays) => {
  const start = dayjs(evaluationStartDate);
  return start.add(evaluationDays, 'day').endOf('day').toISOString();  // End at 11:59 PM
};

// Calculate breathe phase end date
const calculateBreathePhaseEnd = (evaluationDueDate, breatheDays) => {
  if (breatheDays === 0) return evaluationDueDate;
  const evalEnd = dayjs(evaluationDueDate);
  return evalEnd.add(breatheDays, 'day').endOf('day').toISOString();  // End at 11:59 PM
};

// Get minimum allowed date for next phase
const getMinimumPhaseStartDate = (previousPhase, evaluationDays, breatheDays) => {
  if (!previousPhase || !previousPhase.endDate) return null;
  
  const phaseEnd = dayjs(previousPhase.endDate);
  const evalEnd = phaseEnd.add(1, 'day').add(evaluationDays, 'day');  // +1 day for start, +eval days
  const breatheEnd = breatheDays > 0 ? evalEnd.add(breatheDays, 'day') : evalEnd;
  
  return breatheEnd.add(1, 'day').startOf('day').toDate();  // Next day 12:00 AM
};
```

#### 4. Update Phase DateTimePicker with Restrictions

```jsx
<DateTimePicker
  label="Phase Start Date"
  value={dayjs(phase.startDate)}
  onChange={(newValue) => {
    handlePhaseChange(phaseIndex, 'startDate', newValue.toISOString());
  }}
  minDate={getMinimumPhaseStartDate(
    phases[phaseIndex - 1],
    formData.evaluationPhaseDays,
    formData.breathePhaseDays
  )}
  shouldDisableDate={(date) => {
    const minDate = getMinimumPhaseStartDate(
      phases[phaseIndex - 1],
      formData.evaluationPhaseDays,
      formData.breathePhaseDays
    );
    return minDate && dayjs(date).isBefore(dayjs(minDate), 'day');
  }}
  format="YYYY-MM-DD HH:mm"
/>
```

#### 5. Calculate and Include Dates in Submission

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  // ... validation ...
  
  // Calculate evaluation dates for each phase
  const phasesWithEvaluationDates = phases.map((phase, index) => {
    const evaluationStartDate = calculateEvaluationStartDate(phase.endDate);
    const evaluationDueDate = calculateEvaluationDueDate(
      evaluationStartDate,
      formData.evaluationPhaseDays
    );
    
    return {
      ...phase,
      evaluation_available_from: evaluationStartDate,
      evaluation_due_date: evaluationDueDate
    };
  });
  
  // Calculate project evaluation dates (after last phase)
  const lastPhase = phasesWithEvaluationDates[phasesWithEvaluationDates.length - 1];
  const projectEvaluationStartDate = calculateEvaluationStartDate(lastPhase.evaluation_due_date);
  
  const projectData = {
    ...formData,
    phases: phasesWithEvaluationDates,
    project_evaluation_available_from: projectEvaluationStartDate,
    // project_evaluation_deadline already set by professor
  };
  
  // ... file conversion and API call ...
};
```

---

## Backend Changes

### 1. Update Project Creation API

**File:** `backend/server.js` (or routes file)

**Endpoint:** `POST /api/professor/course/:courseId/projects`

```javascript
router.post('/api/professor/course/:courseId/projects', async (req, res) => {
  const {
    title, description, startDate, dueDate,
    breathePhaseDays, evaluationPhaseDays,  // ⭐ NEW
    projectRubricType, projectRubricFile,
    projectEvaluationType, projectEvaluationForm,
    projectEvaluationDeadline,
    project_evaluation_available_from,  // ⭐ NEW (calculated on frontend)
    phases,
    projectRubric,  // Built-in rubric data
    builtInEvaluation,  // Built-in evaluation data
    ...rest
  } = req.body;
  
  const { courseId } = req.params;
  
  try {
    // 1. Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        course_id: courseId,
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
        breathe_phase_days: breathePhaseDays,
        evaluation_phase_days: evaluationPhaseDays,  // ⭐ NEW
        project_rubric_type: projectRubricType,
        project_evaluation_type: projectEvaluationType,
        project_evaluation_deadline: projectEvaluationDeadline,
        created_by: req.user.id,
        ...rest
      })
      .select()
      .single();
    
    if (projectError) throw projectError;
    
    // 2. Handle Project Rubric
    if (projectRubricType === 'builtin' && projectRubric) {
      // Create built-in rubric
      const { data: rubricForm, error: rubricError } = await supabase
        .from('project_rubrics')
        .insert({
          project_id: project.id,
          instructions: projectRubric.instructions,
          total_points: projectRubric.totalPoints
        })
        .select()
        .single();
      
      if (rubricError) throw rubricError;
      
      // Insert rubric criteria
      const criteriaInserts = projectRubric.criteria.map(c => ({
        project_rubric_id: rubricForm.id,
        name: c.name,
        description: c.description,
        max_points: c.maxPoints,
        order_index: c.order_index || 0
      }));
      
      await supabase.from('project_rubric_criteria').insert(criteriaInserts);
      
    } else if (projectRubricType === 'upload' && projectRubricFile) {
      // ⭐ Upload to Supabase Storage and save to project_custom_rubrics
      const fileBuffer = Buffer.from(projectRubricFile.split(',')[1], 'base64');
      const fileName = `${courseId}_${Date.now()}_project_rubric.pdf`;
      const filePath = `custom-files/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-files')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const fileUrl = `/api/storage/custom-files/${fileName}`;
      
      // ⭐ Insert into project_custom_rubrics table
      await supabase
        .from('project_custom_rubrics')
        .insert({
          project_id: project.id,
          file_url: fileUrl,
          file_name: fileName
        });
    }
    
    // 3. Handle Project Evaluation
    if (projectEvaluationType === 'builtin' && builtInEvaluation) {
      // ⭐ Create built-in evaluation with dates
      const { data: evalForm, error: evalError } = await supabase
        .from('project_evaluation_forms')
        .insert({
          project_id: project.id,
          instructions: builtInEvaluation.instructions,
          total_points: builtInEvaluation.totalPoints,
          available_from: project_evaluation_available_from,  // ⭐ NEW
          due_date: projectEvaluationDeadline  // ⭐ NEW
        })
        .select()
        .single();
      
      if (evalError) throw evalError;
      
      // Insert evaluation criteria
      const criteriaInserts = builtInEvaluation.criteria.map(c => ({
        project_evaluation_form_id: evalForm.id,
        name: c.name,
        description: c.description,
        max_points: c.maxPoints,
        order_index: c.order_index || 0
      }));
      
      await supabase.from('project_evaluation_criteria').insert(criteriaInserts);
      
    } else if (projectEvaluationType === 'custom' && projectEvaluationForm) {
      // ⭐ Upload and save to project_custom_evaluations
      const fileBuffer = Buffer.from(projectEvaluationForm.split(',')[1], 'base64');
      const fileName = `${courseId}_${Date.now()}_project_evaluation.pdf`;
      const filePath = `custom-files/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-files')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const fileUrl = `/api/storage/custom-files/${fileName}`;
      
      // ⭐ Insert into project_custom_evaluations table
      await supabase
        .from('project_custom_evaluations')
        .insert({
          project_id: project.id,
          file_url: fileUrl,
          file_name: fileName,
          available_from: project_evaluation_available_from,  // ⭐ NEW
          due_date: projectEvaluationDeadline  // ⭐ NEW
        });
    }
    
    // 4. Create Phases
    for (let i = 0; i < phases.length; i++) {
      const phaseData = phases[i];
      
      const { data: phase, error: phaseError } = await supabase
        .from('project_phases')
        .insert({
          project_id: project.id,
          phase_number: i + 1,
          title: phaseData.name,
          description: phaseData.description,
          start_date: phaseData.startDate,
          end_date: phaseData.endDate,
          file_types_allowed: phaseData.file_types_allowed?.join(',') || '',
          max_attempts: phaseData.max_attempts || 3
        })
        .select()
        .single();
      
      if (phaseError) throw phaseError;
      
      // 5. Handle Phase Rubric
      if (phaseData.rubricType === 'builtin' && phaseData.rubric) {
        const { data: rubricForm, error: rubricError } = await supabase
          .from('phase_rubrics')
          .insert({
            phase_id: phase.id,
            instructions: phaseData.rubric.instructions,
            total_points: phaseData.rubric.totalPoints
          })
          .select()
          .single();
        
        if (rubricError) throw rubricError;
        
        const criteriaInserts = phaseData.rubric.criteria.map(c => ({
          phase_rubric_id: rubricForm.id,
          name: c.name,
          description: c.description,
          max_points: c.maxPoints,
          order_index: c.order_index || 0
        }));
        
        await supabase.from('phase_rubric_criteria').insert(criteriaInserts);
        
      } else if (phaseData.rubricType === 'upload' && phaseData.rubricFileData) {
        // ⭐ Upload and save to phase_custom_rubrics
        const fileBuffer = Buffer.from(phaseData.rubricFileData.split(',')[1], 'base64');
        const fileName = `${courseId}_${Date.now()}_phase${i + 1}_rubric.pdf`;
        const filePath = `custom-files/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-files')
          .upload(filePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        const fileUrl = `/api/storage/custom-files/${fileName}`;
        
        await supabase
          .from('phase_custom_rubrics')
          .insert({
            phase_id: phase.id,
            file_url: fileUrl,
            file_name: fileName
          });
      }
      
      // 6. Handle Phase Evaluation
      if (phaseData.evaluation_form_type === 'builtin' && phaseData.evaluation) {
        // ⭐ Create built-in evaluation with dates
        const { data: evalForm, error: evalError } = await supabase
          .from('phase_evaluation_forms')
          .insert({
            phase_id: phase.id,
            instructions: phaseData.evaluation.instructions,
            total_points: phaseData.evaluation.totalPoints,
            available_from: phaseData.evaluation_available_from,  // ⭐ NEW (from frontend)
            due_date: phaseData.evaluation_due_date  // ⭐ NEW (from frontend)
          })
          .select()
          .single();
        
        if (evalError) throw evalError;
        
        const criteriaInserts = phaseData.evaluation.criteria.map(c => ({
          phase_evaluation_form_id: evalForm.id,
          name: c.name,
          description: c.description,
          max_points: c.maxPoints,
          order_index: c.order_index || 0
        }));
        
        await supabase.from('phase_evaluation_criteria').insert(criteriaInserts);
        
      } else if (phaseData.evaluation_form_type === 'custom' && phaseData.evaluationFormData) {
        // ⭐ Upload and save to phase_custom_evaluations
        const fileBuffer = Buffer.from(phaseData.evaluationFormData.split(',')[1], 'base64');
        const fileName = `${courseId}_${Date.now()}_phase${i + 1}_evaluation.pdf`;
        const filePath = `custom-files/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-files')
          .upload(filePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        const fileUrl = `/api/storage/custom-files/${fileName}`;
        
        await supabase
          .from('phase_custom_evaluations')
          .insert({
            phase_id: phase.id,
            file_url: fileUrl,
            file_name: fileName,
            available_from: phaseData.evaluation_available_from,  // ⭐ NEW (from frontend)
            due_date: phaseData.evaluation_due_date  // ⭐ NEW (from frontend)
          });
      }
    }
    
    res.json({ success: true, project });
    
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Implementation Steps

### Phase 1: Database Schema ⭐
1. Create migration SQL file
2. Add `evaluation_phase_days` to `projects` table
3. Add `available_from` and `due_date` to built-in evaluation tables
4. Create 4 new custom tables:
   - `phase_custom_evaluations`
   - `project_custom_evaluations`
   - `phase_custom_rubrics`
   - `project_custom_rubrics`
5. Create indexes
6. Run migration on development database

### Phase 2: Frontend Logic ⭐
1. Add `evaluationPhaseDays` to `formData` state
2. Add UI input for evaluation phase days in Step 1
3. Implement date calculation functions
4. Update phase DateTimePicker with min date restrictions
5. Add date graying logic (shouldDisableDate)
6. Calculate evaluation dates in handleSubmit
7. Include dates in submission payload
8. Test date calculations with various scenarios

### Phase 3: Backend API ⭐
1. Update project creation endpoint
2. Handle new `evaluation_phase_days` field
3. Save built-in evaluations to existing tables with dates
4. Save custom rubrics to new `*_custom_rubrics` tables
5. Save custom evaluations to new `*_custom_evaluations` tables with dates
6. Remove old encoded rubric/evaluation data from projects/phases tables (deprecated)
7. Test complete project creation flow

### Phase 4: Testing & Validation ⭐
1. Test date calculations for single phase
2. Test date calculations for multiple phases
3. Test with evaluation days = 0
4. Test with breathe days = 0
5. Test with both > 0
6. Verify dates stored correctly in database
7. Verify custom files uploaded correctly
8. Test UI date picker restrictions

---

## Migration SQL Script

```sql
-- Phase 1: Add new field to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS evaluation_phase_days smallint DEFAULT 2;

-- Phase 2: Add date fields to built-in evaluation tables
ALTER TABLE project_evaluation_forms
ADD COLUMN IF NOT EXISTS available_from timestamptz,
ADD COLUMN IF NOT EXISTS due_date timestamptz;

ALTER TABLE phase_evaluation_forms
ADD COLUMN IF NOT EXISTS available_from timestamptz,
ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Phase 3: Create custom rubric tables
CREATE TABLE IF NOT EXISTS phase_custom_rubrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id uuid UNIQUE NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_custom_rubrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phase 4: Create custom evaluation tables
CREATE TABLE IF NOT EXISTS phase_custom_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id uuid UNIQUE NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name varchar(255),
  available_from timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_custom_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name varchar(255),
  available_from timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phase 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_phase_custom_rubrics_phase_id 
  ON phase_custom_rubrics(phase_id);

CREATE INDEX IF NOT EXISTS idx_project_custom_rubrics_project_id 
  ON project_custom_rubrics(project_id);

CREATE INDEX IF NOT EXISTS idx_phase_custom_evaluations_phase_id 
  ON phase_custom_evaluations(phase_id);

CREATE INDEX IF NOT EXISTS idx_phase_custom_evaluations_due_date 
  ON phase_custom_evaluations(due_date);

CREATE INDEX IF NOT EXISTS idx_project_custom_evaluations_project_id 
  ON project_custom_evaluations(project_id);

CREATE INDEX IF NOT EXISTS idx_project_custom_evaluations_due_date 
  ON project_custom_evaluations(due_date);

-- Phase 6: Add comments for documentation
COMMENT ON TABLE phase_custom_rubrics IS 'Stores uploaded custom rubric files for project phases';
COMMENT ON TABLE project_custom_rubrics IS 'Stores uploaded custom rubric files for entire projects';
COMMENT ON TABLE phase_custom_evaluations IS 'Stores uploaded custom evaluation forms for project phases with availability dates';
COMMENT ON TABLE project_custom_evaluations IS 'Stores uploaded custom evaluation forms for entire projects with availability dates';
COMMENT ON COLUMN projects.evaluation_phase_days IS 'Number of days allocated for peer evaluations after each phase ends';
```

---

## Summary

This implementation adds proper date management to evaluations and creates dedicated tables for custom rubrics and evaluations, making the system more maintainable and queryable. All date calculations are performed on the frontend and sent to the backend as ISO 8601 timestamps, ensuring timezone consistency across the application.

**Key Benefits:**
- ✅ Clear evaluation timelines with enforced dates
- ✅ Dedicated tables for custom files (no more encoded JSON)
- ✅ Proper relationships and foreign keys
- ✅ Queryable evaluation deadlines
- ✅ Automatic date validation in UI
- ✅ Consistent date handling with timezone support
