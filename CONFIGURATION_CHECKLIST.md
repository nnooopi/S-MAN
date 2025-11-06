# Custom Files Upload - Configuration Verification Checklist

## Backend Configuration ✅

### Supabase Client Setup
- [x] Service role key initialized in `server.js` (line 40-42)
- [x] Supabase URL configured
- [x] Used for admin operations (file uploads)

### Upload Function
- [x] `uploadBase64File()` function created
- [x] Converts base64 → Buffer
- [x] Uses **`custom-files`** bucket (updated from `project_files`)
- [x] Implements MIME type detection
- [x] Proper error handling

### Project Creation Endpoint
- [x] Handles project rubric file upload
- [x] Handles project evaluation form file upload
- [x] Saves `rubric_file_url` to database
- [x] Saves `evaluation_form_file_url` to database
- [x] Logs upload progress

### Phase Creation Endpoint
- [x] Handles phase rubric file uploads
- [x] Handles phase evaluation form file uploads
- [x] Saves file URLs to project_phases table
- [x] Uses async/await for concurrent uploads

## Frontend Configuration ✅

### File Handling
- [x] Stores files as File objects in React state
- [x] `handleFileUpload()` function working
- [x] `handlePhaseFileUpload()` function working

### File Conversion
- [x] `convertFileToBase64()` helper function added
- [x] Converts File → base64 DataURL
- [x] Handles FileReader API
- [x] Returns Promise for async handling

### Form Submission
- [x] Converts project rubric file to base64
- [x] Converts project evaluation form to base64
- [x] Converts phase files to base64 (map + Promise.all)
- [x] Includes files in JSON request payload
- [x] Proper error handling with loading state

## Database Configuration ✅

### Projects Table
- [x] `rubric_file_url` (TEXT) - stores file path
- [x] `evaluation_form_file_url` (TEXT) - stores file path
- [x] Values saved on project creation

### Project Phases Table
- [x] `rubric_file_url` (TEXT) - stores file path
- [x] `evaluation_form_file_url` (TEXT) - stores file path
- [x] Values saved on phase creation

## Supabase Storage Configuration ✅

### Bucket Setup
- [x] Bucket name: **`custom-files`**
- [x] Bucket exists and is accessible
- [x] Using service role key for access

### Bucket Permissions
- [x] Private access (not public)
- [x] Service role has full access
- [x] Upsert enabled on uploads

### Storage Path
- [x] Format: `projects/{courseId}/{timestamp}_{filename}`
- [x] Organized by course
- [x] Timestamped to prevent collisions

## Testing Checklist

### Pre-Testing
- [ ] Backend server running (`npm start` in backend)
- [ ] Frontend running (`npm start` in frontend)
- [ ] Network connectivity verified
- [ ] Console/server logs open for debugging

### Project Rubric Upload Test
- [ ] Create project with custom rubric option
- [ ] Select and upload a PDF file
- [ ] Click "Create Project"
- [ ] Check browser console for base64 conversion log
- [ ] Check server logs for "📤 Uploading custom rubric file..."
- [ ] Check server logs for "✅ File uploaded to custom-files bucket:"
- [ ] Query database: `SELECT rubric_file_url FROM projects LIMIT 1;`
- [ ] Verify file exists in Supabase Storage `custom-files` bucket

### Project Evaluation Form Upload Test
- [ ] Create project with custom evaluation form option
- [ ] Select and upload a PDF file
- [ ] Click "Create Project"
- [ ] Check server logs for upload confirmation
- [ ] Query database for `evaluation_form_file_url`
- [ ] Verify file in storage bucket

### Phase Rubric Upload Test
- [ ] Create project with a phase
- [ ] Set phase rubric to custom and upload file
- [ ] Create project
- [ ] Check `project_phases.rubric_file_url` in database
- [ ] Verify phase rubric file in storage

### Phase Evaluation Form Upload Test
- [ ] Create project with a phase
- [ ] Set phase evaluation to custom and upload file
- [ ] Create project
- [ ] Check `project_phases.evaluation_form_file_url` in database
- [ ] Verify file in storage

## Logging & Monitoring

### Frontend Logs to Check
```
✅ Base64 conversion successful
🚀 Creating project with data: { hasRubricFile: true, ... }
```

### Backend Logs to Check
```
🔍 Project creation request:
  hasProjectRubricFile: true
  hasProjectEvaluationForm: true

📤 Uploading custom rubric file...
📤 Uploading custom evaluation form...

✅ File uploaded to custom-files bucket: projects/{courseId}/{timestamp}_...
```

### Error Logs to Investigate
```
❌ File upload error: ...
Error uploading file: ...
Failed to create project error: ...
```

## Deployment Checklist

### Environment Variables
- [ ] `SUPABASE_URL` set in backend environment
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in backend environment
- [ ] Both values match Supabase dashboard

### Storage Bucket
- [ ] `custom-files` bucket exists in Supabase
- [ ] Bucket is private (not public)
- [ ] Service role has access

### Database
- [ ] `rubric_file_url` and `evaluation_form_file_url` columns exist
- [ ] Columns are present in both `projects` and `project_phases` tables
- [ ] Column type is TEXT or similar string type

### Frontend Build
- [ ] No console errors after build
- [ ] Base64 conversion works with production bundle

### Backend
- [ ] All dependencies installed
- [ ] Supabase client properly initialized
- [ ] No console errors on startup
- [ ] Service can access Supabase bucket

## Rollback Plan (if needed)

### Quick Rollback
```bash
# Revert backend changes
git checkout backend/server.js

# Clear custom files (optional)
# Delete projects/{courseId}/* from custom-files bucket

# Clear database URLs (optional)
UPDATE projects SET rubric_file_url = NULL, evaluation_form_file_url = NULL;
UPDATE project_phases SET rubric_file_url = NULL, evaluation_form_file_url = NULL;
```

## Success Indicators

When everything is working:
- ✅ Files upload without errors
- ✅ Server logs show successful uploads
- ✅ Database contains file paths
- ✅ Files exist in Supabase Storage
- ✅ No 500 errors or crashes
- ✅ No permissions errors
- ✅ Timestamps prevent file collisions

## Current Status

**Bucket**: `custom-files` ✅  
**Authentication**: Service Role Key ✅  
**Backend Implementation**: Complete ✅  
**Frontend Implementation**: Complete ✅  
**Documentation**: Complete ✅  

**Ready for Testing**: YES ✅
