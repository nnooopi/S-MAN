# Custom Rubric & Evaluation Form Upload - Testing Guide

## What Was Fixed

When users uploaded custom rubric or evaluation form files, they were not being saved to the backend database. This fix ensures files are:
1. Converted to base64 on the frontend
2. Uploaded to Supabase Storage on the backend
3. Stored with file paths in the database

## How to Test

### Test Scenario 1: Project with Custom Rubric

**Steps:**
1. Go to create a new project
2. In "Project Rubric" section, select **"Upload Custom Rubric"** 
3. Upload a PDF file (any PDF will do)
4. Complete the project creation
5. Submit the form

**Expected Result:**
- Project is created successfully
- In the database, `projects.rubric_file_url` should have a value like: `projects/{courseId}/{timestamp}_rubric_*.pdf`
- File should exist in Supabase Storage bucket

**Database Check:**
```sql
SELECT id, title, rubric_file_url FROM projects WHERE title = '{your_project_name}';
```
Should return a non-NULL `rubric_file_url` value.

---

### Test Scenario 2: Project with Custom Evaluation Form

**Steps:**
1. Go to create a new project
2. In "Project Evaluation" section, select **"Upload Custom Form"**
3. Upload a PDF file
4. Complete the project creation
5. Submit the form

**Expected Result:**
- Project is created successfully  
- In the database, `projects.evaluation_form_file_url` should have a value
- File should exist in Supabase Storage

**Database Check:**
```sql
SELECT id, title, evaluation_form_file_url FROM projects WHERE title = '{your_project_name}';
```
Should return a non-NULL `evaluation_form_file_url` value.

---

### Test Scenario 3: Phase with Custom Rubric

**Steps:**
1. Create a project and add a phase
2. In the phase section, set "Phase Rubric" to **"Upload Custom Rubric"**
3. Upload a PDF file for the rubric
4. Complete project creation

**Expected Result:**
- Project and phase are created
- In the database, `project_phases.rubric_file_url` should have a value
- File exists in Supabase Storage

**Database Check:**
```sql
SELECT id, title, rubric_file_url FROM project_phases 
WHERE project_id = '{your_project_id}';
```
Should return a non-NULL `rubric_file_url` value.

---

### Test Scenario 4: Phase with Custom Evaluation Form

**Steps:**
1. Create a project and add a phase
2. In the phase section, set "Phase Evaluation" to **"Custom Form"**
3. Upload a PDF file for the evaluation form
4. Complete project creation

**Expected Result:**
- Project and phase are created
- In the database, `project_phases.evaluation_form_file_url` should have a value
- File exists in Supabase Storage

**Database Check:**
```sql
SELECT id, title, evaluation_form_file_url FROM project_phases 
WHERE project_id = '{your_project_id}';
```
Should return a non-NULL `evaluation_form_file_url` value.

---

### Test Scenario 5: Mixed - Custom Rubric + Built-in Evaluation

**Steps:**
1. Create a project
2. Set "Project Rubric" to **"Upload Custom Rubric"** and upload a file
3. Set "Project Evaluation" to **"Built-in Evaluation"** with criteria
4. Complete project creation

**Expected Result:**
- Both custom rubric file and built-in evaluation criteria are saved
- `projects.rubric_file_url` is non-NULL
- `project_evaluation_forms` table has the built-in evaluation data
- No `evaluation_form_file_url` in projects (since it's built-in)

---

## Console Log Indicators

### Frontend
Look for these in browser console when submitting:
```
🚀 Creating project with data: {
  projectRubricType: "custom",
  projectEvaluationType: "custom",
  hasRubricFile: true,           ← File is being sent
  hasEvaluationForm: true        ← File is being sent
}
```

### Backend
Look for these in server logs:
```
📤 Uploading custom rubric file...
📤 Uploading custom evaluation form...
✅ File uploaded: projects/{courseId}/{timestamp}_rubric_*.pdf
✅ File uploaded: projects/{courseId}/{timestamp}_evaluation_*.pdf
```

---

## Troubleshooting

### Files Not Saving

**Check 1: Browser Console**
- Open Developer Tools (F12)
- Go to Console tab
- Look for errors when uploading
- Check Network tab - is the POST request including file data?

**Check 2: Server Logs**
- Stop and restart the backend server
- Look for "📤 Uploading..." messages
- Check for error messages

**Check 3: Database**
```sql
-- Check if project was created
SELECT * FROM projects WHERE title = '{project_name}';

-- Check URL fields (should not be NULL)
SELECT rubric_file_url, evaluation_form_file_url FROM projects;
```

**Check 4: Storage Bucket**
- Log into Supabase dashboard
- Go to Storage
- Check bucket: `custom-files`
- Look for folder: `projects/{courseId}/`
- Files should be named like: `{timestamp}_rubric_*.pdf` or `{timestamp}_evaluation_*.pdf`

---

## File Upload Path Format

Files are stored at:
```
Supabase Storage (bucket: custom-files)
└── projects/
    └── {courseId}/
        ├── 1729686400000_rubric_1234.pdf
        ├── 1729686400001_evaluation_5678.pdf
        ├── phase_1_rubric_1729686400002.pdf
        └── phase_1_evaluation_1729686400003.pdf
```

The `rubric_file_url` and `evaluation_form_file_url` in the database will store the path:
- `projects/{courseId}/1729686400000_rubric_1234.pdf`

**Bucket Name**: `custom-files`
**Authentication**: Backend uses Supabase Service Role Key

---

## Rollback

If something goes wrong, you can:

1. **Delete files from storage** (optional, won't affect DB)
2. **Clear the file URLs from database:**
   ```sql
   UPDATE projects SET rubric_file_url = NULL, 
                      evaluation_form_file_url = NULL 
   WHERE course_id = '{courseId}';
   
   UPDATE project_phases SET rubric_file_url = NULL,
                             evaluation_form_file_url = NULL
   WHERE project_id IN (SELECT id FROM projects WHERE course_id = '{courseId}');
   ```

---

## Success Indicators

When everything is working correctly:
- ✅ Projects created with custom rubric files
- ✅ Projects created with custom evaluation forms
- ✅ Phases created with custom rubric files
- ✅ Phases created with custom evaluation forms
- ✅ File URLs stored in database
- ✅ Files physically stored in Supabase Storage
- ✅ No console errors or 500 server errors
