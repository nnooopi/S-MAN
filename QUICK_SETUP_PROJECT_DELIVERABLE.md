# Quick Setup: Project Deliverable Submission

## ✅ Implementation Complete!

The "Submit Anyway" button for Project Deliverable submissions is now fully implemented.

## 🚀 Setup Steps (Run These Now)

### Step 1: Create the Database Table

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Open the file `project_deliverable_submissions_schema.sql` from your project root
3. Copy ALL the contents (lines 1-489)
4. Paste into Supabase SQL Editor
5. Click **Run** or press `Ctrl+Enter`
6. You should see: `✅ Table created successfully`

**Verification Query:**
```sql
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'project_deliverable_submissions';
```
Should return 19 columns.

### Step 2: Verify Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Check if bucket `custom-files` exists
3. If it doesn't exist, create it:
   - Click "New bucket"
   - Name: `custom-files`
   - Public: ✅ Yes (or set appropriate policies)
   - File size limit: 50 MB (or as needed)

**Files will be stored in:** `custom-files/project-deliverable/{project_id}/{group_id}/`

### Step 3: Restart Backend Server

```powershell
# Stop current backend (if running)
# Ctrl+C in the terminal running the backend

# Start backend again
cd backend
node server.js
```

You should see:
```
✅ Server is running on port 5000
🔐 [INIT] URL: https://qorkowgfjjuwxelumuut.supabase.co
```

## 🧪 Test the Feature

### As a Student (Group Leader):

1. **Login** to the system
2. **Navigate** to your course
3. **Click** "Deliverables" tab
4. **Select** a project from the list
5. **Click** "Project Deliverable" (the last item in the list)
6. You should see the project deliverable form with:
   - File upload area
   - Description field
   - Member submissions (tasks per phase)
   - Group submissions (phase deliverables)
   - Project evaluation submissions
   - Member inclusion/exclusion section

7. **Upload** at least one file
8. **Fill** in the description (optional)
9. **Set** member inclusions/exclusions
10. **Click** the "Submit" button at the bottom
11. A **validation modal** will appear showing:
    - ✅ Files uploaded
    - ⚠️ Any warnings (e.g., missing evaluations)
    - ❌ Any blocking errors
12. If there are only warnings (no blocking errors), you'll see **"Submit Anyway"** button
13. **Click** "Submit Anyway"
14. You should see:
    ```
    ✅ Project deliverable submitted successfully!
    
    Submission ID: [uuid]
    Submitted at: [timestamp]
    ```
15. Page will reload and show the submitted deliverable

## 📊 What Gets Stored

When you submit, the system captures a **complete snapshot**:

### 1. Project Snapshot
- All project details
- All phases with their settings
- Start/due dates
- Evaluation settings
- Rubric types

### 2. Member Tasks
For EACH member:
- Total tasks assigned
- Tasks grouped by phase
- Each task's status (completed, pending, etc.)
- All task submissions and their history
- Attempt numbers and feedback

### 3. Evaluations
For EACH member:
- Phase evaluations (all phases)
- Project evaluation
- Submission status
- Dates submitted

### 4. Files
- All uploaded files with metadata
- Stored in Supabase Storage
- URLs for download

### 5. Member Inclusions
- Which members are included
- Which members are excluded
- Reasons for exclusion

### 6. Validation Results
- Which validations passed
- Which warnings were shown
- Any errors that were present

## 🔍 Verify in Database

After submitting, check in Supabase:

```sql
SELECT 
    id,
    project_id,
    group_id,
    submitted_by,
    submitted_at,
    status,
    jsonb_array_length(files) as file_count,
    jsonb_array_length(member_tasks) as member_count,
    jsonb_array_length(evaluation_submissions) as eval_count
FROM project_deliverable_submissions
ORDER BY submitted_at DESC
LIMIT 1;
```

## ❌ Troubleshooting

### "Table project_deliverable_submissions does not exist"
**Solution**: Run Step 1 again - the SQL schema wasn't executed

### "relation does not exist"
**Solution**: Same as above, table needs to be created

### "Storage bucket 'custom-files' not found"
**Solution**: Create the bucket in Supabase Dashboard → Storage
- Bucket name must be: `custom-files`
- Files are stored in subfolder: `project-deliverable/`

### "Only group leaders can submit"
**Solution**: Check that your student account has `role = 'leader'` in `course_group_members` table

```sql
SELECT * FROM course_group_members 
WHERE student_id = '[your-student-id]' 
AND role = 'leader';
```

### "Failed to upload file"
**Solution**: Check storage bucket permissions and size limits

### Frontend shows old data
**Solution**: Hard refresh the page (Ctrl+Shift+R) or clear browser cache

## 📁 Files Created/Modified

### Modified:
- ✅ `backend/server.js` - Added project deliverable submission endpoints

### Created:
- ✅ `PROJECT_DELIVERABLE_SUBMISSION_IMPLEMENTATION.md` - Full documentation
- ✅ `QUICK_SETUP_PROJECT_DELIVERABLE.md` - This file

### Already Exists (No Changes):
- ✅ `frontend/src/components/CourseStudentDashboard.js` - Frontend already implemented
- ✅ `project_deliverable_submissions_schema.sql` - Database schema

## ✅ You're Done When...

- [ ] SQL schema executed successfully
- [ ] Storage bucket `project-files` exists
- [ ] Backend server restarted
- [ ] Test submission completes successfully
- [ ] Data appears in `project_deliverable_submissions` table
- [ ] Files appear in Supabase Storage

## 🎉 Success!

Once all steps are complete, the "Submit Anyway" button will work perfectly, creating comprehensive project deliverable submissions with all the data shown in your modal!

