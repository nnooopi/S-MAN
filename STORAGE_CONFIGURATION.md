# Storage Configuration Reference

## Current Setup

### Supabase Bucket
- **Name**: `custom-files`
- **Authentication**: Service Role Key (for admin operations)
- **Purpose**: Stores custom rubric and evaluation form files for projects and phases

### File Upload Flow

```
Frontend (React)
  ↓ [File as File object]
  ↓ Converts to base64 DataURL
  ↓ Sends in JSON POST request
  │
Backend (Node.js + Express)
  ↓ Receives base64 string
  ↓ Extracts base64 payload
  ↓ Converts to Buffer
  ↓ Uses supabase.storage.from('custom-files').upload()
  ↓ Uses SUPABASE_SERVICE_ROLE_KEY for authentication
  ↓ Uploads to custom-files bucket
  │
Supabase Storage
  ↓ Stores file at: projects/{courseId}/{timestamp}_{filename}
  ↓ Returns path to backend
  │
Backend Database
  ↓ Saves file path to:
    - projects.rubric_file_url
    - projects.evaluation_form_file_url
    - project_phases.rubric_file_url
    - project_phases.evaluation_form_file_url
```

### Service Role Key
The backend uses `SUPABASE_SERVICE_ROLE_KEY` configured in `server.js`:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

This key allows:
- Full read/write access to all storage buckets
- Required for server-side file operations
- Should never be exposed to frontend

### Bucket Permissions
The `custom-files` bucket should be configured with:
- **Public access**: No (files should be private)
- **Storage permissions**: Accessible via authenticated Supabase client
- **Service role access**: Full access

### File Path Structure
```
custom-files/
└── projects/
    └── {courseId}/
        ├── 1729686400000_rubric_sample.pdf
        ├── 1729686400001_evaluation_sample.pdf
        ├── phase_1_rubric_1729686400002.pdf
        ├── phase_1_evaluation_1729686400003.pdf
        ├── phase_2_rubric_1729686400004.pdf
        └── phase_2_evaluation_1729686400005.pdf
```

### Database Records
File paths are stored as:
```sql
projects:
  - rubric_file_url: "projects/{courseId}/1729686400000_rubric_sample.pdf"
  - evaluation_form_file_url: "projects/{courseId}/1729686400001_evaluation_sample.pdf"

project_phases:
  - rubric_file_url: "projects/{courseId}/phase_1_rubric_1729686400002.pdf"
  - evaluation_form_file_url: "projects/{courseId}/phase_1_evaluation_1729686400003.pdf"
```

### Environment Variables
Set these in your `.env` file or production environment:

```bash
# Supabase Configuration
SUPABASE_URL=https://qorkowgfjjuwxelumuut.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### How to Get Service Role Key
1. Go to Supabase Dashboard
2. Navigate to Settings → API
3. Look for "service_role" key in the "Project API keys" section
4. Copy and use in backend environment

### File Upload Process in Backend

```javascript
// Called when professor uploads custom file
const uploadBase64File = async (base64Data, fileName) => {
  // 1. Extract base64 from DataURL
  const base64String = base64Data.split(',')[1];
  
  // 2. Convert to Buffer
  const fileBuffer = Buffer.from(base64String, 'base64');
  
  // 3. Determine MIME type
  const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
  
  // 4. Build file path
  const filePath = `projects/${courseId}/${Date.now()}_${fileName}`;
  
  // 5. Upload using service role
  const { data, error } = await supabase.storage
    .from('custom-files')  // ← Uses custom-files bucket
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });
  
  // 6. Return path (not the full URL, just the path)
  return filePath;
};
```

### Retrieving Files
When you need to retrieve files:

```javascript
// Get the public URL for a file
const { data } = supabase.storage
  .from('custom-files')
  .getPublicUrl('projects/{courseId}/1729686400000_rubric_sample.pdf');

// Or download file
const { data, error } = await supabase.storage
  .from('custom-files')
  .download('projects/{courseId}/1729686400000_rubric_sample.pdf');
```

### Troubleshooting

**Issue**: "Unauthorized" error when uploading
- **Solution**: Ensure backend is using the service role key, not the anon key

**Issue**: File not found in storage
- **Solution**: Check that the bucket name is exactly `custom-files` (case-sensitive)

**Issue**: File URL is NULL in database
- **Solution**: Check server logs for "❌ File upload error" messages

**Issue**: Can't access bucket in Supabase dashboard
- **Solution**: Make sure the bucket exists; create it if needed
