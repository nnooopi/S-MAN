# Project Evaluation Modal - Built-In & Custom Support ✅

## Overview
The `ProjectEvaluationModal.js` has been successfully updated to support both **built-in** and **custom** project evaluations, matching the exact design and functionality of the `EvaluationModal.js`.

---

## Frontend Changes

### 1. **State Management Updates**

#### New State Variables Added:
```javascript
// File upload state for custom evaluations
const [uploading, setUploading] = useState(false);
const [uploadedFileName, setUploadedFileName] = useState(null);
const [selectedFile, setSelectedFile] = useState(null);

// Determine evaluation type
const isCustomEvaluation = evaluation?.is_custom_evaluation === true;
const isBuiltInEvaluation = evaluation?.is_custom_evaluation === false;
```

### 2. **New Functions for Custom Evaluations**

#### `handleFileUpload(e)`
- Validates file size (max 10MB)
- Validates file type (PDF, DOC, DOCX only)
- Stores selected file in state

#### `handleViewPDF()`
- Opens custom evaluation form PDF in new tab
- Uses `evaluation.custom_file_url`

#### `handleDownloadPDF()`
- Downloads the custom evaluation form
- Uses `evaluation.custom_file_name` or `evaluation.file_name`

#### `handleSubmitCustomEvaluation()`
- Uploads completed evaluation file to backend
- Submits via `/api/project-evaluations/{formId}/submit-custom` endpoint
- Uses FormData for file upload

### 3. **UI Layout Changes**

The modal now renders two different layouts based on `is_custom_evaluation`:

#### **Built-in Evaluation Layout** (when `is_custom_evaluation = false`)
- Two-column layout with sidebar navigation
- Left sidebar: Project Details → Members → Review & Submit
- Right content: Evaluation criteria forms
- Footer: Previous/Next navigation + Submit button

#### **Custom Evaluation Layout** (when `is_custom_evaluation = true`)
- Single full-width centered layout
- Pink/rose themed design matching phase evaluations
- Sections:
  1. **Header**: Pink circle icon with "Project Evaluation Form" title
  2. **Info Pills**: Points and Due Date badges
  3. **Instructions**: If provided
  4. **Action Buttons**: View Form (pink) + Download (blue)
  5. **Divider**: "THEN" separator
  6. **Upload Area**: Drag & drop or click to upload
  7. **File Ready View**: Change File + Submit buttons

---

## Backend Structure (from `relationships.txt`)

### Tables Involved

#### **1. `project_evaluation_forms`**
Stores the evaluation form definition (both built-in and custom).

**Key Columns:**
```sql
id                          uuid PRIMARY KEY
project_id                  uuid REFERENCES projects(id)
is_custom_evaluation        boolean DEFAULT false
custom_file_url             text (for custom forms)
custom_file_name            varchar (for custom forms)
evaluation_available_from   timestamp with time zone
due_date                    timestamp with time zone
total_points                integer
instructions                text
created_at                  timestamp with time zone
```

#### **2. `project_evaluation_criteria`**
Stores criteria for built-in evaluations only.

**Key Columns:**
```sql
id                          uuid PRIMARY KEY
project_evaluation_form_id  uuid REFERENCES project_evaluation_forms(id)
name                        varchar NOT NULL
description                 text
max_points                  integer NOT NULL
order_index                 integer DEFAULT 0
```

#### **3. `project_evaluation_submissions`**
Stores student submissions for both built-in and custom evaluations.

**Key Columns:**
```sql
id                          uuid PRIMARY KEY
project_id                  uuid NOT NULL REFERENCES projects(id)
group_id                    uuid NOT NULL REFERENCES course_groups(id)
project_evaluation_form_id  uuid NOT NULL REFERENCES project_evaluation_forms(id)
evaluator_id                uuid NOT NULL REFERENCES studentaccounts(id)
evaluated_member_id         uuid (nullable, for built-in evaluations)
is_custom_evaluation        boolean DEFAULT false
evaluation_data             jsonb
status                      varchar DEFAULT 'not_started'
submitted_at                timestamp with time zone
custom_file_url             text (for custom evaluation submissions)
custom_file_name            varchar (for custom evaluation submissions)
```

---

## Backend API Endpoints Required

### **1. Submit Built-in Project Evaluation**

**Endpoint:**
```
POST /api/project-evaluations/:formId/submit
```

**Request Body:**
```json
{
  "evaluation_data": {
    "project_id": "uuid",
    "group_id": "uuid",
    "project_evaluation_form_id": "uuid",
    "evaluated_members": {
      "member_uuid_1": {
        "criteria": {
          "criterion_id_1": 8,
          "criterion_id_2": 9
        },
        "total": 17
      },
      "member_uuid_2": {
        "criteria": {
          "criterion_id_1": 7,
          "criterion_id_2": 10
        },
        "total": 17
      }
    },
    "progress": {
      "member_uuid_1": {
        "completed_criteria": 2,
        "total_criteria": 2
      },
      "member_uuid_2": {
        "completed_criteria": 2,
        "total_criteria": 2
      }
    },
    "aggregate_total": 34
  },
  "status": "submitted"
}
```

**Response:**
```json
{
  "message": "Project evaluation submitted successfully",
  "submission": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2025-10-27T12:00:00Z"
  }
}
```

**Backend Logic:**
1. Verify `formId` exists and is a valid built-in project evaluation form
2. Verify student is a member of the group
3. Check if submission already exists (prevent duplicates)
4. Validate all group members have been evaluated
5. Insert/update submission in `project_evaluation_submissions`:
   ```sql
   INSERT INTO project_evaluation_submissions (
     project_id,
     group_id,
     project_evaluation_form_id,
     evaluator_id,
     evaluation_data,
     status,
     is_custom_evaluation,
     submitted_at
   ) VALUES (
     $project_id,
     $group_id,
     $form_id,
     $current_user_id,
     $evaluation_data_jsonb,
     'submitted',
     false,
     NOW()
   )
   ON CONFLICT (project_evaluation_form_id, evaluator_id)
   DO UPDATE SET
     evaluation_data = EXCLUDED.evaluation_data,
     status = EXCLUDED.status,
     submitted_at = NOW();
   ```

---

### **2. Submit Custom Project Evaluation**

**Endpoint:**
```
POST /api/project-evaluations/:formId/submit-custom
```

**Request Body:** `multipart/form-data`
```
file: File (PDF/DOC/DOCX, max 10MB)
project_id: uuid
group_id: uuid
project_evaluation_form_id: uuid
```

**Response:**
```json
{
  "message": "Custom evaluation submitted successfully",
  "submission": {
    "id": "uuid",
    "custom_file_url": "https://...",
    "custom_file_name": "evaluation.pdf",
    "status": "submitted",
    "submitted_at": "2025-10-27T12:00:00Z"
  }
}
```

**Backend Logic:**
1. Verify `formId` exists and is a custom project evaluation form
2. Verify student is a member of the group
3. Validate file size and type
4. Upload file to Supabase Storage:
   - Bucket: `custom-evaluation-submissions` or similar
   - Path: `projects/{project_id}/evaluations/{form_id}/{user_id}_{timestamp}.{ext}`
5. Insert/update submission in `project_evaluation_submissions`:
   ```sql
   INSERT INTO project_evaluation_submissions (
     project_id,
     group_id,
     project_evaluation_form_id,
     evaluator_id,
     is_custom_evaluation,
     custom_file_url,
     custom_file_name,
     status,
     submitted_at
   ) VALUES (
     $project_id,
     $group_id,
     $form_id,
     $current_user_id,
     true,
     $uploaded_file_url,
     $original_filename,
     'submitted',
     NOW()
   )
   ON CONFLICT (project_evaluation_form_id, evaluator_id)
   DO UPDATE SET
     custom_file_url = EXCLUDED.custom_file_url,
     custom_file_name = EXCLUDED.custom_file_name,
     status = EXCLUDED.status,
     submitted_at = NOW();
   ```

---

## Data Flow Examples

### **Built-in Project Evaluation Flow**

1. **Student opens project evaluation card**
   - Frontend checks `is_custom_evaluation = false`
   - Loads `project_evaluation_forms` with criteria
   - Loads `project_evaluation_criteria` for the form
   - Renders two-column layout with sidebar navigation

2. **Student evaluates each team member**
   - Fills in scores for each criterion
   - Progress tracked in real-time
   - Data stored in `evaluationData` state

3. **Student submits evaluation**
   - Frontend sends aggregated JSONB data to backend
   - Backend validates and saves to `project_evaluation_submissions`
   - `evaluation_data` column stores full JSONB structure

### **Custom Project Evaluation Flow**

1. **Student opens custom project evaluation card**
   - Frontend checks `is_custom_evaluation = true`
   - Loads `custom_file_url` and `custom_file_name` from form
   - Renders centered single-column layout

2. **Student views/downloads form**
   - Downloads blank form from `custom_file_url`
   - Completes form offline

3. **Student uploads completed form**
   - Drag & drop or click to upload
   - Frontend validates file (size, type)
   - File stored in `selectedFile` state

4. **Student submits evaluation**
   - Frontend sends file via multipart/form-data
   - Backend uploads to Supabase Storage
   - Backend saves file URL to `project_evaluation_submissions.custom_file_url`

---

## Key Design Decisions

### **1. Conditional Rendering**
- Single modal component handles both types
- Cleaner codebase, easier maintenance
- Similar to how `EvaluationModal.js` works

### **2. Color Scheme**
- **Built-in**: Violet theme (`#a855f7`)
- **Custom**: Pink/Rose theme (`#ec4899`)
- Matches phase evaluation design

### **3. Read-Only Mode**
- Triggered when `status === 'submitted'`
- Green banner displays "read-only" message
- All inputs and buttons disabled
- Applies to both built-in and custom

### **4. File Upload UX**
- Drag & drop support
- Visual feedback on hover
- File preview before submit
- Change file option before final submit

---

## Testing Checklist

### **Built-in Project Evaluations**
- [ ] Modal opens with sidebar navigation
- [ ] Can navigate through: Project Details → Members → Review & Submit
- [ ] Evaluation criteria loads correctly
- [ ] Scores update member totals in real-time
- [ ] Aggregate total calculates correctly
- [ ] Submit button validates all members evaluated
- [ ] Submission successful and modal closes
- [ ] Reopening shows read-only mode
- [ ] Previous/Next navigation works

### **Custom Project Evaluations**
- [ ] Modal opens with centered layout
- [ ] Custom form file name displays
- [ ] Points and due date pills show
- [ ] Instructions section displays (if present)
- [ ] View Form button opens PDF in new tab
- [ ] Download button downloads file correctly
- [ ] Drag & drop file upload works
- [ ] Click to browse file upload works
- [ ] File validation works (size, type)
- [ ] File preview shows selected file name
- [ ] Change File button clears selection
- [ ] Submit button uploads and submits successfully
- [ ] Reopening shows read-only mode

---

## Next Steps for Backend Team

1. **Create/verify API endpoints:**
   - `POST /api/project-evaluations/:formId/submit`
   - `POST /api/project-evaluations/:formId/submit-custom`

2. **Set up Supabase Storage bucket:**
   - Name: `custom-evaluation-submissions`
   - RLS policies for student access
   - File size limits enforced

3. **Add validation logic:**
   - Verify student is group member
   - Prevent duplicate submissions
   - Validate file types and sizes
   - Check evaluation window (available_from, due_date)

4. **Update project evaluation cards query:**
   - Include `is_custom_evaluation` flag
   - Include `custom_file_url` and `custom_file_name` for custom forms
   - Include submission status for read-only mode

---

## Summary

The `ProjectEvaluationModal.js` now provides a **unified, beautiful, and functional interface** for both built-in and custom project evaluations, matching the design of phase evaluations. The backend structure supports both types through the same tables with different data formats (JSONB for built-in, file URLs for custom).

✅ **Frontend:** Complete
⏳ **Backend:** Endpoints need implementation
📝 **Testing:** Ready for QA

