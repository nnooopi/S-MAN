# Custom Rubric & Evaluation Form Upload Fix

## Problem
When users selected "custom" evaluation form type and uploaded a rubric/evaluation file, they were not being saved to the backend. The files were stored locally in the frontend but were never transmitted or persisted to the database.

## Root Cause
1. **Frontend Issue**: File objects cannot be serialized to JSON directly. The frontend was storing File objects but never converting them for transmission.
2. **Backend Issue**: The backend wasn't processing the file data or saving the file URLs to the database (`rubric_file_url` and `evaluation_form_file_url` fields).

## Solution

### Frontend Changes (`SimplifiedProjectCreator.js`)

#### 1. Convert Files to Base64
Added a helper function to convert File objects to base64 data URIs before sending:

```javascript
const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};
```

#### 2. Process Files Before Submission
Updated the `handleSubmit` function to:
- Convert project rubric file to base64 (if custom type selected)
- Convert project evaluation form file to base64 (if custom type selected)
- Convert phase rubric files to base64 (if custom type selected)
- Convert phase evaluation form files to base64 (if custom type selected)
- Include the base64 data in the request payload

#### 3. Build Complete Project Data
The projectData now includes:
```javascript
{
  ...formData,
  projectRubricFile: projectRubricFileData,        // base64 if custom
  projectEvaluationForm: projectEvaluationFormData, // base64 if custom
  phases: [...],  // includes rubricFileData and evaluationFormData
  builtInEvaluation: ...,
  projectRubric: ...
}
```

### Backend Changes (`server.js`)

#### 1. Added File Upload Helper Function
Created `uploadBase64File()` function that:
- Accepts base64-encoded file data
- Extracts the base64 string from the data URI
- Converts it to a Buffer
- Determines the appropriate MIME type
- Uploads to Supabase Storage at `projects/{courseId}/filename`
- Returns the file path for storage in the database

```javascript
const uploadBase64File = async (base64Data, fileName) => {
  // Convert base64 to buffer
  const base64String = base64Data.split(',')[1] || base64Data;
  const fileBuffer = Buffer.from(base64String, 'base64');
  
  // Upload to Supabase Storage
  const filePath = `projects/${courseId}/${Date.now()}_${fileName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project_files')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });
  
  return filePath;
};
```

#### 2. Updated Project Creation
Modified project data to include file URLs:
```javascript
const projectData = {
  // ... other fields
  rubric_file_url: rubricFileUrl,           // from custom file upload
  evaluation_form_file_url: evaluationFormFileUrl  // from custom file upload
};
```

#### 3. Updated Phase Creation
Modified phase creation to:
- Process each phase's file uploads asynchronously
- Upload custom rubric files (if rubricType === 'custom')
- Upload custom evaluation form files (if evaluation_form_type === 'custom')
- Include file URLs in the phase data

## Database Fields Used

### Projects Table
- `rubric_file_url` (text) - URL/path to custom rubric file
- `evaluation_form_file_url` (text) - URL/path to custom evaluation form file

### Project Phases Table
- `rubric_file_url` (text) - URL/path to phase-specific custom rubric
- `evaluation_form_file_url` (text) - URL/path to phase-specific custom evaluation form

## Storage Structure
Files are uploaded to Supabase Storage in this structure:
```
custom-files (bucket)
└── projects/
    └── {courseId}/
        ├── {timestamp}_rubric_*.pdf
        ├── {timestamp}_evaluation_*.pdf
        ├── phase_1_rubric_*.pdf
        ├── phase_1_evaluation_*.pdf
        └── ...
```

**Bucket**: `custom-files`
**Authentication**: Uses Supabase Service Role Key for admin access

## Data Flow

### Upload Process
```
User uploads file in UI
  ↓
File stored as File object in React state
  ↓
User clicks "Create Project"
  ↓
Frontend converts File → base64
  ↓
Frontend sends projectData with base64 files to backend
  ↓
Backend receives base64 files
  ↓
Backend converts base64 → Buffer
  ↓
Backend uploads Buffer to Supabase Storage
  ↓
Backend saves file path to database (projects/project_phases table)
  ↓
Project & phases created successfully ✅
```

### Retrieval Process
When retrieving projects/phases, the file URLs are fetched from the database and can be used to:
- Display download links for professors
- Link to files for students
- Validate that custom files were uploaded

## Testing

### Test Case 1: Project with Custom Rubric
1. Create project with `projectRubricType = 'custom'`
2. Upload a PDF file for rubric
3. Create project
4. Verify `projects.rubric_file_url` is populated in database

### Test Case 2: Project with Custom Evaluation Form
1. Create project with `projectEvaluationType = 'custom'`
2. Upload a PDF file for evaluation form
3. Create project
4. Verify `projects.evaluation_form_file_url` is populated in database

### Test Case 3: Phase with Custom Rubric
1. Add a phase with `rubricType = 'custom'`
2. Upload a PDF file for phase rubric
3. Create project
4. Verify `project_phases.rubric_file_url` is populated in database

### Test Case 4: Phase with Custom Evaluation Form
1. Add a phase with `evaluation_form_type = 'custom'`
2. Upload a PDF file for phase evaluation form
3. Create project
4. Verify `project_phases.evaluation_form_file_url` is populated in database

## Console Logs Added
Backend now logs:
- ✅ Files being processed
- 📤 Upload progress for each file
- 📁 Storage bucket information
- ✅ Successful uploads with file paths
- ❌ Any upload errors

This helps with debugging and monitoring.

## Limitations & Future Improvements

### Current Implementation
- Uses base64 encoding (works for moderate file sizes)
- Files stored in Supabase Storage bucket
- Single file path stored per rubric/evaluation type

### Possible Future Improvements
1. **File Size Limits**: Consider implementing file size validation
2. **Multiple Files**: Support multiple files per rubric/evaluation
3. **File Versioning**: Track file versions for updates
4. **Direct Upload**: Use presigned URLs for large file uploads
5. **File Preview**: Store file metadata (size, type, upload date)

## Debugging

If files aren't being saved:

1. **Check Frontend Console**
   - Verify base64 conversion is successful
   - Check network tab - does the request include file data?
   - Look for console errors during file conversion

2. **Check Backend Logs**
   - Look for "📤 Uploading custom..." messages
   - Check for "✅ File uploaded:" confirmations
   - Look for upload errors (❌)

3. **Check Database**
   - Query: `SELECT rubric_file_url, evaluation_form_file_url FROM projects WHERE id = ?`
   - Should have non-null values if upload succeeded

4. **Check Storage**
   - Access Supabase dashboard
   - Browse `project_files` bucket
   - Verify files are present in `projects/{courseId}/` folder

## Files Modified
- `frontend/src/components/SimplifiedProjectCreator.js` - Added base64 conversion logic
- `backend/server.js` - Added file upload handling and storage persistence
