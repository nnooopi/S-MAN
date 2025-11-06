const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

// Student authentication middleware
const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      return res.status(401).json({ error: 'Student not found' });
    }

    req.user = user;
    req.student = student;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now - we'll validate based on task requirements
    cb(null, true);
  }
});

// POST /api/tasks/submit - Submit work for a task
router.post('/submit', upload.array('files', 10), async (req, res) => {
  try {
    console.log('🔍 === REVISION SUBMISSION DEBUG START ===');
    console.log('🔍 Endpoint: /api/tasks/submit');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Files:', req.files?.length || 0);
    
    const { task_id, submission_text } = req.body;
    const submitted_by = req.user.id;
    const files = req.files || [];
    
    console.log('📤 Submitting task:', task_id, 'by student:', submitted_by);
    
    // Verify task exists and user can submit
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        project_phases(phase_number, title),
        projects(title)
      `)
      .eq('id', task_id)
      .eq('assigned_to', submitted_by)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    // Check if task allows submissions - be more permissive
    // Only block submissions if task is explicitly completed or approved
    const blockedStatuses = ['completed', 'approved'];
    if (task.status && blockedStatuses.includes(task.status)) {
      return res.status(400).json({ 
        error: 'Task is already completed or approved',
        current_status: task.status 
      });
    }
    
    // Get current attempt count from task_submissions table
    const { count: attemptCount } = await supabase
      .from('task_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task_id)
      .eq('submitted_by', submitted_by);
    
    console.log('📊 Current attempt count for task:', task_id, 'by user:', submitted_by, 'count:', attemptCount);
    
    // Check if this is a revision by looking for existing submissions
    const { data: existingSubmissions } = await supabase
      .from('task_submissions')
      .select('id, attempt_number')
      .eq('task_id', task_id)
      .eq('submitted_by', submitted_by)
      .order('created_at', { ascending: true });
    
    // Check if this is a revision by looking at task status or explicit flag
    const isRevision = task.status === 'to_revise' || req.body.is_revision === 'true';
    
    console.log('📊 Submission type check:', {
      task_status: task.status,
      is_revision_flag: req.body.is_revision,
      is_revision: isRevision,
      existing_submissions_count: existingSubmissions?.length || 0
    });
    
    console.log('🔍 === REVISION SUBMISSION DEBUG END ===');
    
    // For new submissions (not revisions), check max attempts limit
    if (!isRevision && task.max_attempts && task.max_attempts > 0) {
      if ((task.current_attempts || 0) >= task.max_attempts) {
        return res.status(400).json({ 
          error: `Maximum attempts (${task.max_attempts}) exceeded`,
          current_attempts: task.current_attempts || 0,
          max_attempts: task.max_attempts
        });
      }
    }
    
    // Validate file types if specified
    if (task.file_types_allowed && files.length > 0) {
      let allowedTypes = [];
      if (typeof task.file_types_allowed === 'string') {
        try {
          allowedTypes = JSON.parse(task.file_types_allowed);
        } catch {
          allowedTypes = task.file_types_allowed.split(',').map(t => t.trim());
        }
      } else if (Array.isArray(task.file_types_allowed)) {
        allowedTypes = task.file_types_allowed;
      }
      
      if (allowedTypes.length > 0) {
        for (const file of files) {
          const fileExtension = file.originalname.split('.').pop().toLowerCase();
          if (!allowedTypes.includes(fileExtension)) {
            return res.status(400).json({ 
              error: `File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}` 
            });
          }
        }
      }
    }
    
        // Upload files to Supabase storage with attempt number
    const file_paths = [];
    if (files.length > 0) {
          // Calculate attempt number for file naming based on submission type
          let attemptNumber;
          if (isRevision) {
            // For revisions, use the latest attempt number from existing submissions
            const latestSubmission = existingSubmissions?.[existingSubmissions.length - 1];
            attemptNumber = latestSubmission?.attempt_number || 1;
          } else {
            // For new attempts, increment the count
            attemptNumber = Math.max(1, (attemptCount || 0) + 1);
          }
          
      for (const file of files) {
            // Create organized file path: task_id/attempt_number/filename
            const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${task_id}/attempt_${attemptNumber}/${Date.now()}_${sanitizedFileName}`;
            const filePath = fileName;
            
            console.log('📁 Uploading file:', filePath, 'for attempt:', attemptNumber, 'type:', isRevision ? 'revision' : 'new');
        
        const { error: uploadError } = await supabase.storage
          .from('task-submissions')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });
        
        if (uploadError) {
          console.error('File upload error:', uploadError);
          return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
        }
        
        file_paths.push(fileName);
      }
    }
    
    if (isRevision) {
      // Get the original submission to link revision
      const { data: originalSubmission, error: origError } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', task_id)
        .eq('submitted_by', submitted_by)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (origError || !originalSubmission) {
        return res.status(400).json({ error: 'Original submission not found for revision' });
      }
      
      // Count existing revisions to determine revision number
      const { count: revisionCount } = await supabase
        .from('revision_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('original_submission_id', originalSubmission.id);
      
      // Use provided revision number or calculate next one
      const revisionNumber = req.body.revision_number ? parseInt(req.body.revision_number) : (revisionCount || 0) + 1;
      
      // Submit as revision
      const { data: revision, error: revisionError } = await supabase
        .from('revision_submissions')
        .insert({
          original_submission_id: originalSubmission.id,
          task_id: task_id,
          submitted_by: submitted_by,
          revision_attempt_number: revisionNumber, // Fixed: use correct field name
          submission_text: submission_text || null,
          file_paths: file_paths,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (revisionError) {
        console.error('Revision submission error:', revisionError);
        return res.status(500).json({ error: revisionError.message });
      }
      
      // Update task status to pending
      await supabase
        .from('tasks')
        .update({
          status: 'to_revise', // Keep as to_revise, don't change to pending_review
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id);
      
      console.log('✅ Task status kept as to_revise for revision submission, task:', task_id);
      
      console.log('✅ Revision submitted successfully:', revision.id);
      console.log('✅ Revision status:', revision.status);
      console.log('✅ Task status after revision:', 'to_revise');
      
      res.json({
        success: true,
        submission: revision,
        type: 'revision',
        revision_number: revisionNumber,
        message: `Revision ${revisionNumber} submitted successfully`
      });
      
    } else {
      // Submit as regular submission (new attempt)
      const attemptNumber = Math.max(1, (task.current_attempts || 0) + 1);
      console.log('📊 Creating new submission - attempt number:', attemptNumber, 'for task:', task_id);
      
      // Check if submission is late
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const availableUntil = task.available_until ? new Date(task.available_until) : null;
      const isLate = now > dueDate && (!availableUntil || now <= availableUntil);
      
      console.log('🕐 Late check - Now:', now.toISOString(), 'Due:', dueDate.toISOString(), 'Available until:', availableUntil?.toISOString(), 'Is late:', isLate);
      
      // Create the submission
      const { data: submission, error: submissionError } = await supabase
        .from('task_submissions')
        .insert({
          task_id: task_id,
          submitted_by: submitted_by,
          submission_text: submission_text || null,
          file_urls: JSON.stringify(file_paths || []),
          status: 'pending',
          submission_date: new Date().toISOString(),
          attempt_number: attemptNumber,
          is_late: isLate
        })
        .select()
        .single();
      
      if (submissionError) {
        console.error('Task submission error:', submissionError);
        return res.status(500).json({ error: submissionError.message });
      }
      
      // Update task with new attempt count - don't change status, keep as 'to_revise' or whatever it currently is
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
          current_attempts: attemptNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id);
      
      if (taskUpdateError) {
        console.error('Task update error:', taskUpdateError);
        // Don't fail the submission, just log the error
      } else {
        console.log('✅ Task attempt count updated to:', attemptNumber, 'for task:', task_id);
      }
      
      console.log('✅ Task submitted successfully:', submission.id, 'attempt:', attemptNumber);
      res.json({
        success: true,
        submission: submission,
        type: 'original',
        attempt_number: attemptNumber,
        message: `Task submitted successfully (Attempt ${attemptNumber})`
      });
    }
    
  } catch (error) {
    console.error('Task submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/submission-history - Get complete submission history
router.get('/:taskId/submission-history', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    
    console.log('📋 Getting submission history for task:', taskId, 'by student:', student_id);
    
    // Verify access to task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, title')
      .eq('id', taskId)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is the assignee or a group member who can view
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('student_id, group_id, role')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();
    
    if (membershipError || (!membershipError && task.assigned_to !== student_id && membership.role !== 'leader')) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }
    
    // Get original submissions
    const { data: originalSubmissions, error: origError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submitted_by,
        submission_text,
        file_urls,
        status,
        submission_date,
        created_at,
        updated_at,
        studentaccounts!task_submissions_submitted_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (origError) {
      console.error('Error fetching original submissions:', origError);
      return res.status(500).json({ error: origError.message });
    }
    
    // Get revision submissions
    const { data: revisionSubmissions, error: revError } = await supabase
      .from('revision_submissions')
      .select(`
        id,
        task_id,
        submitted_by,
        original_submission_id,
        revision_attempt_number,
        submission_text,
        file_paths,
        status,
        submitted_at,
        review_comments,
        reviewed_at,
        created_at,
        studentaccounts!revision_submissions_submitted_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (revError) {
      console.error('Error fetching revision submissions:', revError);
    }
    
    // Get feedback for all submissions (both original and revision)
    const originalSubmissionIds = (originalSubmissions || []).map(s => s.id);
    const revisionSubmissionIds = (revisionSubmissions || []).map(s => s.id);
    
    // Fetch feedback for original submissions
    const { data: originalFeedbacks, error: originalFeedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        submission_id,
        revision_submission_id,
        submission_type,
        feedback_by,
        feedback_text,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .in('submission_id', originalSubmissionIds)
      .eq('submission_type', 'task_submission')
      .order('created_at', { ascending: true });
    
    // Fetch feedback for revision submissions
    const { data: revisionFeedbacks, error: revisionFeedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        submission_id,
        revision_submission_id,
        submission_type,
        feedback_by,
        feedback_text,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .in('revision_submission_id', revisionSubmissionIds)
      .eq('submission_type', 'revision_submission')
      .order('created_at', { ascending: true });
    
    // Combine all feedback
    const feedbacks = [...(originalFeedbacks || []), ...(revisionFeedbacks || [])];
    
    if (originalFeedbackError) {
      console.warn('Error fetching original feedback:', originalFeedbackError);
    }
    if (revisionFeedbackError) {
      console.warn('Error fetching revision feedback:', revisionFeedbackError);
    }
    
    // Organize submissions by attempt number
    const attempts = {};
    
    // Process original submissions
    (originalSubmissions || []).forEach((submission, index) => {
      const attemptNumber = index + 1;
      
      // Parse file_urls if it's a string (stored as JSON in TEXT column)
      let fileUrls = [];
      if (submission.file_urls) {
        try {
          fileUrls = typeof submission.file_urls === 'string' 
            ? JSON.parse(submission.file_urls) 
            : submission.file_urls;
        } catch (e) {
          console.error('Error parsing file_urls:', e);
          fileUrls = [];
        }
      }
      
      attempts[attemptNumber] = {
        attempt_number: attemptNumber,
        original_submission: {
          ...submission,
          file_urls: Array.isArray(fileUrls) 
            ? fileUrls.map(path => {
                const { data: { publicUrl } } = supabase.storage
                  .from('task-submissions')
                  .getPublicUrl(`task-submissions/${path}`);
                return publicUrl;
              })
            : [],
          author_name: `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}`,
          author_email: submission.studentaccounts.email,
          author_profile_image: submission.studentaccounts.profile_image_url 
            ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${submission.studentaccounts.profile_image_url}`
            : null
        },
        revisions: [],
        feedback: (feedbacks || []).filter(f => 
          (f.submission_type === 'task_submission' && f.submission_id === submission.id) ||
          (f.submission_type === 'revision_submission' && f.revision_submission_id === submission.id)
        ).map(f => ({
          ...f,
          author_name: `${f.studentaccounts.first_name} ${f.studentaccounts.last_name}`,
          author_email: f.studentaccounts.email,
          author_profile_image: f.studentaccounts.profile_image_url
            ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${f.studentaccounts.profile_image_url}`
            : null
        }))
      };
    });
    
    // Process revision submissions
    (revisionSubmissions || []).forEach(revision => {
      // Find which original submission this revision belongs to
      const originalSubmission = (originalSubmissions || []).find(orig => orig.id === revision.original_submission_id);
      if (originalSubmission) {
        const attemptNumber = (originalSubmissions || []).indexOf(originalSubmission) + 1;
        if (attempts[attemptNumber]) {
          attempts[attemptNumber].revisions.push({
            ...revision,
            file_urls: revision.file_paths?.map(path => {
              const { data: { publicUrl } } = supabase.storage
                .from('task-submissions')
                .getPublicUrl(`task-submissions/${path}`);
              return publicUrl;
            }) || [],
            author_name: `${revision.studentaccounts.first_name} ${revision.studentaccounts.last_name}`,
            author_email: revision.studentaccounts.email,
            author_profile_image: revision.studentaccounts.profile_image_url
              ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${revision.studentaccounts.profile_image_url}`
              : null,
            feedback: (feedbacks || []).filter(f => 
              (f.submission_type === 'revision_submission' && f.revision_submission_id === revision.id)
            ).map(f => ({
              ...f,
              author_name: `${f.studentaccounts.first_name} ${f.studentaccounts.last_name}`,
              author_email: f.studentaccounts.email,
              author_profile_image: f.studentaccounts.profile_image_url
                ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${f.studentaccounts.profile_image_url}`
                : null
            }))
          });
        }
      }
    });
    
    res.json({
      success: true,
      task: task,
      attempts: Object.values(attempts).sort((a, b) => a.attempt_number - b.attempt_number)
    });
    
  } catch (error) {
    console.error('Error fetching submission history:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/feedback - Submit feedback on a submission
router.post('/feedback', async (req, res) => {
  try {
    const { submission_id, feedback_text, submission_type = 'original', rating } = req.body;
    const feedback_by = req.user.id;
    
    console.log('💬 Submitting feedback on submission:', submission_id, 'type:', submission_type, 'by:', feedback_by);
    
    // Determine which table and type to use
    const isRevision = submission_type === 'revision';
    const submissionTable = isRevision ? 'revision_submissions' : 'task_submissions';
    const feedbackSubmissionType = isRevision ? 'revision_submission' : 'task_submission';
    
    // Verify the submission exists and get task_id
    const { data: submission, error: submissionError } = await supabase
      .from(submissionTable)
      .select('task_id, submitted_by')
      .eq('id', submission_id)
      .single();
    
    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError);
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Verify user is in the same group as the task assignee
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', feedback_by)
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group member' });
    }
    
    // Check if the student is a leader
    const { data: leaderCheck, error: leaderError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', feedback_by)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    const isLeader = !leaderError && leaderCheck && leaderCheck.role === 'leader';
    
    // Prepare feedback data
    const feedbackData = {
      submission_type: feedbackSubmissionType,
      feedback_by: feedback_by,
      feedback_text: feedback_text,
      is_from_leader: isLeader,
      created_at: new Date().toISOString()
    };
    
    // Add the appropriate submission reference
    if (isRevision) {
      feedbackData.revision_submission_id = submission_id;
      feedbackData.submission_id = null;
    } else {
      feedbackData.submission_id = submission_id;
      feedbackData.revision_submission_id = null;
    }
    
    // Add rating if provided
    if (rating && rating >= 1 && rating <= 5) {
      feedbackData.rating = rating;
    }
    
    // Create feedback entry
    const { data: feedback, error: feedbackError } = await supabase
      .from('task_feedback')
      .insert(feedbackData)
      .select(`
        *,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .single();
    
    if (feedbackError) {
      console.error('Feedback submission error:', feedbackError);
      return res.status(500).json({ error: feedbackError.message });
    }
    
    console.log('✅ Feedback submitted successfully:', feedback.id);
    res.json({
      success: true,
      feedback: {
        ...feedback,
        author_name: `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}`,
        author_email: feedback.studentaccounts.email,
        author_profile_image: feedback.studentaccounts.profile_image_url
          ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${feedback.studentaccounts.profile_image_url}`
          : null,
        submission_type: feedbackSubmissionType
      },
      message: `Feedback submitted successfully for ${isRevision ? 'revision' : 'original'} submission`
    });
    
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/files - Get all files from all attempts for a task
router.get('/:taskId/files', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    
    console.log('📁 Getting files for task:', taskId, 'by student:', student_id);
    
    // Verify access to task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, assigned_to')
      .eq('id', taskId)
      .eq('assigned_to', student_id)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    // Get all submissions with files
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select('id, attempt_number, file_urls, submission_date, status')
      .eq('task_id', taskId)
      .eq('submitted_by', student_id)
      .order('created_at', { ascending: true });
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }
    
    // Process files for each attempt
    const attemptsWithFiles = await Promise.all((submissions || []).map(async (submission) => {
      let fileUrls = [];
      if (submission.file_urls) {
        try {
          fileUrls = typeof submission.file_urls === 'string' 
            ? JSON.parse(submission.file_urls) 
            : submission.file_urls;
        } catch (e) {
          console.error('Error parsing file_urls:', e);
          fileUrls = [];
        }
      }
      
      // Generate public URLs for each file
      const filesWithUrls = await Promise.all(fileUrls.map(async (filePath) => {
        const { data: { publicUrl } } = supabase.storage
          .from('task-submissions')
          .getPublicUrl(filePath);
        
        // Get file metadata to get size
        const { data: fileInfo, error: fileError } = await supabase.storage
          .from('task-submissions')
          .list(filePath.split('/').slice(0, -1).join('/'), {
            search: filePath.split('/').pop()
          });
        
        let fileSize = 0;
        if (!fileError && fileInfo && fileInfo.length > 0) {
          fileSize = fileInfo[0].metadata?.size || 0;
        }
        
        // Extract filename from path
        const fileName = filePath.split('/').pop();
        
        return {
          path: filePath,
          url: publicUrl,
          filename: fileName,
          downloadUrl: `/api/files/task-submissions/${filePath}`,
          size: fileSize
        };
      }));
      
      return {
        attempt_number: submission.attempt_number,
        submission_id: submission.id,
        submission_date: submission.submission_date,
        status: submission.status,
        files: filesWithUrls,
        file_count: filesWithUrls.length
      };
    }));
    
    console.log('📁 Found', attemptsWithFiles.length, 'attempts with files');
    res.json({
      success: true,
      task_id: taskId,
      task_title: task.title,
      attempts: attemptsWithFiles,
      total_attempts: attemptsWithFiles.length
    });
    
  } catch (error) {
    console.error('Error getting task files:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/attempts - Get attempt information for a task
router.get('/:taskId/attempts', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    
    console.log('📊 Getting attempt info for task:', taskId, 'by student:', student_id);
    
    // Get task information
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, max_attempts, current_attempts, status')
      .eq('id', taskId)
      .eq('assigned_to', student_id)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    // Get submission history
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select('id, attempt_number, status, submission_date, created_at')
      .eq('task_id', taskId)
      .eq('submitted_by', student_id)
      .order('created_at', { ascending: true });
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }
    
    // Get revision count
    const { count: revisionCount } = await supabase
      .from('revision_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('submitted_by', student_id);
    
    const attemptInfo = {
      task_id: taskId,
      task_title: task.title,
      max_attempts: task.max_attempts,
      current_attempts: task.current_attempts || 0,
      actual_submissions: submissions?.length || 0,
      revision_count: revisionCount || 0,
      status: task.status,
      submissions: submissions || [],
      can_submit: !task.max_attempts || (submissions?.length || 0) < task.max_attempts,
      remaining_attempts: task.max_attempts ? Math.max(0, task.max_attempts - (submissions?.length || 0)) : null
    };
    
    console.log('📊 Attempt info:', attemptInfo);
    res.json(attemptInfo);
    
  } catch (error) {
    console.error('Error getting attempt info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get feedback for a specific revision attempt
router.get('/:taskId/revision-attempts/:revisionNumber/feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId, revisionNumber } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching feedback for task:', taskId, 'revision:', revisionNumber);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get the revision submission for this revision number
    const { data: revisionSubmission, error: revisionError } = await supabase
      .from('revision_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('revision_attempt_number', parseInt(revisionNumber))
      .single();

    if (revisionError || !revisionSubmission) {
      return res.status(404).json({ error: 'Revision submission not found' });
    }

    // Get feedback for this revision submission
    const { data: feedback, error: feedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        feedback_text,
        rating,
        is_from_leader,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('revision_submission_id', revisionSubmission.id)
      .eq('submission_type', 'revision_submission')
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('Error fetching revision attempt feedback:', feedbackError);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    // Process feedback to include proper profile image URLs
    const feedbackWithUrls = (feedback || []).map(fb => {
      let profileImageUrl = null;
      if (fb.studentaccounts?.profile_image_url) {
        if (fb.studentaccounts.profile_image_url.startsWith('http')) {
          profileImageUrl = fb.studentaccounts.profile_image_url;
        } else {
          profileImageUrl = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${fb.studentaccounts.profile_image_url}`;
        }
      }
      
      return {
        ...fb,
        studentaccounts: {
          ...fb.studentaccounts,
          profile_image_url: profileImageUrl
        }
      };
    });

    res.json({
      success: true,
      feedback: feedbackWithUrls
    });

  } catch (error) {
    console.error('Error fetching revision attempt feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback for a specific attempt
router.get('/:taskId/attempts/:attemptNumber/feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId, attemptNumber } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching feedback for task:', taskId, 'attempt:', attemptNumber);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get the submission for this attempt
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('attempt_number', parseInt(attemptNumber))
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found for this attempt' });
    }

    // Get feedback for this submission with user details
    const { data: feedback, error: feedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        feedback_text,
        rating,
        is_from_leader,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('submission_id', submission.id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    // Construct proper profile image URLs
    const feedbackWithUrls = (feedback || []).map(fb => {
      let profileImageUrl = null;
      if (fb.studentaccounts?.profile_image_url) {
        if (fb.studentaccounts.profile_image_url.startsWith('http')) {
          profileImageUrl = fb.studentaccounts.profile_image_url;
        } else {
          profileImageUrl = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${fb.studentaccounts.profile_image_url}`;
        }
      }
      
      return {
        ...fb,
        studentaccounts: {
          ...fb.studentaccounts,
          profile_image_url: profileImageUrl
        }
      };
    });

    res.json({
      success: true,
      feedback: feedbackWithUrls
    });

  } catch (error) {
    console.error('Error in feedback endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit feedback for a specific revision attempt
router.post('/:taskId/revision-attempts/:revisionNumber/feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId, revisionNumber } = req.params;
    const { feedback_text } = req.body;
    const studentId = req.user.id;

    console.log('🔍 Submitting feedback for task:', taskId, 'revision:', revisionNumber);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get the revision submission for this revision number
    const { data: revisionSubmission, error: revisionError } = await supabase
      .from('revision_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('revision_attempt_number', parseInt(revisionNumber))
      .single();

    if (revisionError || !revisionSubmission) {
      return res.status(404).json({ error: 'Revision submission not found' });
    }

    // Check if the student is a leader
    const { data: leaderCheck, error: leaderError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    const isLeader = !leaderError && leaderCheck && leaderCheck.role === 'leader';

    // Insert feedback for this revision submission
    const { data: newFeedback, error: insertError } = await supabase
      .from('task_feedback')
      .insert({
        revision_submission_id: revisionSubmission.id,
        feedback_by: studentId,
        feedback_text: feedback_text.trim(),
        is_from_leader: isLeader,
        submission_type: 'revision_submission'
      })
      .select(`
        *,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, email, profile_image_url)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting revision attempt feedback:', insertError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    res.json({
      success: true,
      feedback: newFeedback
    });

  } catch (error) {
    console.error('Error submitting revision attempt feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit feedback for a specific attempt
router.post('/:taskId/attempts/:attemptNumber/feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId, attemptNumber } = req.params;
    const { feedback_text, rating } = req.body;
    const studentId = req.user.id;

    console.log('🔍 Submitting feedback for task:', taskId, 'attempt:', attemptNumber);

    if (!feedback_text || feedback_text.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback text is required' });
    }

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get the submission for this attempt
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('attempt_number', parseInt(attemptNumber))
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found for this attempt' });
    }

    // Check if student is in the same group as the task assignee
    const { data: studentGroup, error: groupError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    const { data: assigneeGroup, error: assigneeGroupError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', task.assigned_to)
      .eq('is_active', true)
      .single();

    if (groupError || assigneeGroupError || !studentGroup || !assigneeGroup) {
      return res.status(403).json({ error: 'Unable to verify group membership' });
    }

    if (studentGroup.group_id !== assigneeGroup.group_id) {
      return res.status(403).json({ error: 'You can only provide feedback to tasks from your group members' });
    }

    // Check if the student is a leader
    const { data: leaderCheck, error: leaderError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    const isLeader = !leaderError && leaderCheck && leaderCheck.role === 'leader';

    // Insert feedback
    const { data: newFeedback, error: insertError } = await supabase
      .from('task_feedback')
      .insert({
        submission_id: submission.id,
        feedback_by: studentId,
        feedback_text: feedback_text.trim(),
        rating: rating || null,
        is_from_leader: isLeader,
        submission_type: 'task_submission'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: newFeedback
    });

  } catch (error) {
    console.error('Error in feedback submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:taskId/leader-feedback - Get leader feedback for a task
router.get('/:taskId/leader-feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching leader feedback for task:', taskId, 'by student:', studentId);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      console.log('🔍 Task access denied:', taskError);
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    console.log('🔍 Task access verified:', task.id);

    // Get the submission that was marked for revision (has review_comments)
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select(`
        id, 
        attempt_number,
        status, 
        review_comments,
        reviewed_at,
        reviewed_by,
        created_at,
        studentaccounts!task_submissions_reviewed_by_fkey(
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('task_id', taskId)
      .not('review_comments', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (submissionError || !submission) {
      console.log('🔍 No submission with review comments found for task:', taskId);
      console.log('🔍 Submission error:', submissionError);
      
      // Let's also check what submissions exist for this task
      const { data: allSubmissions, error: allSubmissionsError } = await supabase
        .from('task_submissions')
        .select('id, status, review_comments, attempt_number')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      console.log('🔍 All submissions for this task:', allSubmissions);
      
      return res.status(404).json({ error: 'No revision request found for this task' });
    }

    console.log('🔍 Submission with review comments found:', submission.id, 'status:', submission.status);
    console.log('🔍 Review comments:', submission.review_comments);
    console.log('🔍 Reviewed by:', submission.reviewed_by);

    // Construct proper profile image URL
    const leaderProfileImageUrl = submission.studentaccounts?.profile_image_url
      ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${submission.studentaccounts.profile_image_url}`
      : null;

    res.json({
      success: true,
      leader_feedback: {
        id: submission.id,
        attempt_number: submission.attempt_number,
        feedback_text: submission.review_comments,
        created_at: submission.reviewed_at,
        leader_name: submission.studentaccounts ? 
          `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}` : 
          'Unknown Leader',
        leader_profile_image: leaderProfileImageUrl
      }
    });

  } catch (error) {
    console.error('Error fetching leader feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:taskId/feedback - Get all feedback for a task
router.get('/:taskId/feedback', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching feedback for task:', taskId, 'by student:', studentId);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get all feedback for this task
    const { data: feedback, error: feedbackError } = await supabase
      .from('task_feedback')
      .select(`
        *,
        studentaccounts!task_feedback_feedback_by_fkey(
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .or(`submission_id.in.(
        select id from task_submissions where task_id = '${taskId}'
      ),revision_submission_id.in.(
        select id from revision_submissions where task_id = '${taskId}'
      )`)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    // Process feedback to include author information
    const processedFeedback = (feedback || []).map(fb => ({
      ...fb,
      author_name: fb.studentaccounts ? 
        `${fb.studentaccounts.first_name} ${fb.studentaccounts.last_name}` : 
        'Unknown',
      author_profile_image: fb.studentaccounts?.profile_image_url
        ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${fb.studentaccounts.profile_image_url}`
        : null
    }));

    res.json({
      success: true,
      feedback: processedFeedback,
      count: processedFeedback.length
    });

  } catch (error) {
    console.error('Error fetching task feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:taskId/submissions - Get all submissions for a task
router.get('/:taskId/submissions', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching submissions for task:', taskId, 'by student:', studentId);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get all task submissions for this task
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        submission_text,
        file_urls,
        status,
        submission_date,
        created_at,
        updated_at,
        review_comments,
        reviewed_at,
        reviewed_by,
        studentaccounts!task_submissions_reviewed_by_fkey(
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    // Process submissions to include reviewer information
    const processedSubmissions = (submissions || []).map(submission => ({
      ...submission,
      reviewed_by_name: submission.studentaccounts ? 
        `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}` : 
        null,
      reviewed_by_profile_image: submission.studentaccounts?.profile_image_url
        ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${submission.studentaccounts.profile_image_url}`
        : null
    }));

    res.json({
      success: true,
      submissions: processedSubmissions,
      count: processedSubmissions.length
    });

  } catch (error) {
    console.error('Error fetching task submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:taskId/revision-attempts - Get revision attempts for a task
router.get('/:taskId/revision-attempts', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const studentId = req.user.id;

    console.log('🔍 Fetching revision attempts for task:', taskId);

    // Verify student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, project_id')
      .eq('id', taskId)
      .eq('assigned_to', studentId)
      .single();

    if (taskError || !task) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    // Get all revision submissions for this task
    const { data: revisions, error: revisionsError } = await supabase
      .from('revision_submissions')
      .select(`
        id,
        revision_attempt_number,
        status,
        submitted_at,
        created_at,
        submission_text,
        file_paths,
        review_comments,
        reviewed_at,
        reviewed_by,
        studentaccounts!revision_submissions_reviewed_by_fkey(
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('task_id', taskId)
      .order('revision_attempt_number', { ascending: true });

    if (revisionsError) {
      console.error('Error fetching revision attempts:', revisionsError);
      return res.status(500).json({ error: 'Failed to fetch revision attempts' });
    }

    console.log('🔍 Raw revisions data from database:', revisions);

    // Calculate next revision number
    const nextRevisionNumber = revisions.length > 0 ? Math.max(...revisions.map(r => r.revision_attempt_number)) + 1 : 1;

    // Process revisions to include download URLs and review information
    const processedRevisions = (revisions || []).map(revision => ({
      id: revision.id,
      revision_number: revision.revision_attempt_number, // Map to correct field
      status: revision.status,
      submitted_at: revision.submitted_at,
      created_at: revision.created_at,
      submission_text: revision.submission_text,
      review_comments: revision.review_comments,
      reviewed_at: revision.reviewed_at,
      reviewed_by: revision.reviewed_by,
      reviewed_by_name: revision.studentaccounts ? 
        `${revision.studentaccounts.first_name} ${revision.studentaccounts.last_name}` : 
        null,
      reviewed_by_profile_image: revision.studentaccounts?.profile_image_url
        ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${revision.studentaccounts.profile_image_url}`
        : null,
      files: (revision.file_paths || []).map((filePath, index) => ({
        id: `${revision.id}_${index}`, // Generate a unique ID
        filename: filePath.split('/').pop(), // Extract filename from path
        size: 0, // Size not available in file_paths
        downloadUrl: `/api/files/task-submissions/${filePath}`
      }))
    }));

    res.json({
      success: true,
      revisions: processedRevisions,
      next_revision_number: nextRevisionNumber,
      total_revisions: revisions.length
    });

  } catch (error) {
    console.error('Error fetching revision attempts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;