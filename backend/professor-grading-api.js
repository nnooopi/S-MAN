// ============================================
// PROFESSOR GRADING API ENDPOINTS
// ============================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client (using environment variables with fallback)
const supabaseUrl = process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// MIDDLEWARE
// ============================================

// Authentication middleware for professors
const authenticateProfessor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get professor account
    const { data: professor, error: profError } = await supabase
      .from('professoraccounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profError || !professor) {
      return res.status(403).json({ error: 'Professor account not found' });
    }

    req.user = professor;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ============================================
// PROJECT SUBMISSIONS GRADING
// ============================================

// GET /api/professor-grading/projects/:projectId/submissions - Get all project submissions for grading
router.get('/projects/:projectId/submissions', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 Getting project submissions for grading:', projectId);
    
    // Verify professor has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        course:courses(
          id,
          course_name,
          professor_id
        )
      `)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get project submissions with group and student information
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select(`
        *,
        group:course_groups(
          id,
          group_name,
          group_number,
          members:course_group_members(
            id,
            role,
            student:studentaccounts(
              id,
              first_name,
              last_name,
              student_number
            )
          )
        ),
        submitted_by_student:studentaccounts(
          id,
          first_name,
          last_name,
          student_number
        ),
        group_grade:group_grades!group_grades_project_submission_id_fkey(
          id,
          grade,
          feedback,
          graded_by,
          graded_at,
          individual_overrides:individual_grades(
            id,
            student_id,
            grade,
            feedback,
            graded_by,
            graded_at,
            is_override
          )
        )
      `)
      .eq('project_id', projectId)
      .order('submission_date', { ascending: false });
    
    if (submissionsError) {
      console.error('Error fetching project submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }
    
    console.log('✅ Found', submissions?.length || 0, 'project submissions');
    
    res.json({
      success: true,
      project,
      submissions: submissions || []
    });
    
  } catch (error) {
    console.error('Error getting project submissions for grading:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/professor-grading/projects/:projectId/submissions/:submissionId/grade - Grade project submission
router.post('/projects/:projectId/submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { projectId, submissionId } = req.params;
    const { groupGrade, individualGrades, feedback, gradingCriteria } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading project submission:', submissionId);
    
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('group_id')
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      throw new Error('Project submission not found');
    }
    
    // Start transaction by creating group grade
    const { data: groupGradeData, error: groupGradeError } = await supabase
      .from('group_grades')
      .upsert({
        project_submission_id: submissionId,
        group_id: submission.group_id,
        grade: groupGrade,
        grade_type: 'project_submission',
        feedback: feedback,
        grading_criteria: gradingCriteria,
        graded_by: professorId,
        graded_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,project_submission_id'
      })
      .select()
      .single();
    
    if (groupGradeError) {
      throw groupGradeError;
    }
    
    // Update the submission status
    const { error: updateError } = await supabase
      .from('project_submissions')
      .update({
        status: 'graded',
        graded_by: professorId,
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Handle individual grades if provided
    if (individualGrades && Array.isArray(individualGrades)) {
      for (const individualGrade of individualGrades) {
        const { studentId, grade, feedback: studentFeedback } = individualGrade;
        
        // Upsert individual grade
        const { error: individualError } = await supabase
          .from('individual_grades')
          .upsert({
            group_grade_id: groupGradeData.id,
            student_id: studentId,
            group_id: submission.group_id,
            grade: grade,
            feedback: studentFeedback,
            grade_type: 'project_submission',
            is_override: true,
            graded_by: professorId,
            graded_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,group_grade_id'
          });
        
        if (individualError) {
          console.error('Error saving individual grade:', individualError);
        }
      }
    }
    
    console.log('✅ Project submission graded successfully');
    
    res.json({
      success: true,
      message: 'Project submission graded successfully',
      submissionId,
      groupGrade,
      individualGradesCount: individualGrades?.length || 0
    });
    
  } catch (error) {
    console.error('Error grading project submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PHASE SUBMISSIONS GRADING
// ============================================

// GET /api/professor-grading/projects/:projectId/phases/:phaseId/submissions - Get phase submissions for grading
router.get('/projects/:projectId/phases/:phaseId/submissions', authenticateProfessor, async (req, res) => {
  try {
    const { projectId, phaseId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 Getting phase submissions for grading:', phaseId);
    
    // Verify access
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select(`
        *,
        project:projects(
          *,
          course:courses(
            professor_id
          )
        )
      `)
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .single();
    
    if (phaseError || !phase || phase.project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get phase submissions with related data
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_submissions')
      .select(`
        *,
        group:course_groups(
          id,
          group_name,
          group_number,
          members:course_group_members(
            id,
            role,
            student:studentaccounts(
              id,
              first_name,
              last_name,
              student_number
            )
          )
        ),
        submitted_by_student:studentaccounts(
          id,
          first_name,
          last_name,
          student_number
        ),
        group_grade:group_grades!group_grades_phase_submission_id_fkey(
          id,
          grade,
          feedback,
          graded_by,
          graded_at,
          individual_overrides:individual_grades(
            id,
            student_id,
            grade,
            feedback,
            graded_by,
            graded_at,
            is_override
          )
        )
      `)
      .eq('phase_id', phaseId)
      .order('submission_date', { ascending: false });
    
    if (submissionsError) {
      console.error('Error fetching phase submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }
    
    // Get task submissions for each group in this phase
    const groupIds = submissions?.map(s => s.group_id) || [];
    let taskSubmissions = [];
    
    if (groupIds.length > 0) {
      const { data: tasks, error: tasksError } = await supabase
        .from('task_submissions')
        .select(`
          *,
          task:tasks(
            id,
            title,
            description,
            phase_id,
            assigned_to
          ),
          submitted_by_student:studentaccounts(
            id,
            first_name,
            last_name,
            student_number
          ),
          individual_grade:individual_grades!individual_grades_task_submission_id_fkey(
            id,
            student_id,
            grade,
            feedback,
            graded_by,
            graded_at,
            is_override
          )
        `)
        .in('group_id', groupIds)
        .eq('task.phase_id', phaseId);
      
      if (!tasksError) {
        taskSubmissions = tasks || [];
      }
    }
    
    console.log('✅ Found', submissions?.length || 0, 'phase submissions and', taskSubmissions.length, 'task submissions');
    
    res.json({
      success: true,
      phase,
      submissions: submissions || [],
      taskSubmissions: taskSubmissions
    });
    
  } catch (error) {
    console.error('Error getting phase submissions for grading:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/professor-grading/phases/:phaseId/submissions/:submissionId/grade - Grade phase submission
router.post('/phases/:phaseId/submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { phaseId, submissionId } = req.params;
    const { groupGrade, individualGrades, feedback, gradingCriteria } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading phase submission:', submissionId);
    
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('phase_submissions')
      .select('group_id')
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      throw new Error('Phase submission not found');
    }
    
    // Create group grade
    const { data: groupGradeData, error: groupGradeError } = await supabase
      .from('group_grades')
      .upsert({
        phase_submission_id: submissionId,
        group_id: submission.group_id,
        grade: groupGrade,
        grade_type: 'phase_submission',
        feedback: feedback,
        grading_criteria: gradingCriteria,
        graded_by: professorId,
        graded_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,phase_submission_id'
      })
      .select()
      .single();
    
    if (groupGradeError) {
      throw groupGradeError;
    }
    
    // Update phase submission
    const { error: updateError } = await supabase
      .from('phase_submissions')
      .update({
        status: 'graded',
        graded_by: professorId,
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('phase_id', phaseId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Handle individual grades
    if (individualGrades && Array.isArray(individualGrades)) {
      for (const individualGrade of individualGrades) {
        const { studentId, grade, feedback: studentFeedback } = individualGrade;
        
        await supabase
          .from('individual_grades')
          .upsert({
            group_grade_id: groupGradeData.id,
            student_id: studentId,
            group_id: submission.group_id,
            grade: grade,
            feedback: studentFeedback,
            grade_type: 'phase_submission',
            is_override: true,
            graded_by: professorId,
            graded_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,group_grade_id'
          });
      }
    }
    
    res.json({
      success: true,
      message: 'Phase submission graded successfully'
    });
    
  } catch (error) {
    console.error('Error grading phase submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TASK SUBMISSIONS GRADING
// ============================================

// POST /api/professor-grading/tasks/:taskId/submissions/:submissionId/grade - Grade task submission
router.post('/tasks/:taskId/submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { taskId, submissionId } = req.params;
    const { grade, feedback, gradingCriteria } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading task submission:', submissionId);
    
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select('submitted_by, group_id')
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      throw new Error('Task submission not found');
    }
    
    // Create individual grade for task (tasks are always individual)
    const { error: gradeError } = await supabase
      .from('individual_grades')
      .upsert({
        task_submission_id: submissionId,
        student_id: submission.submitted_by,
        group_id: submission.group_id,
        grade: grade,
        feedback: feedback,
        grade_type: 'task',
        grading_criteria: gradingCriteria,
        is_override: false, // Tasks don't have group grades to override
        graded_by: professorId,
        graded_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,task_submission_id'
      });
    
    if (gradeError) {
      throw gradeError;
    }
    
    // Update task submission status
    const { error: updateError } = await supabase
      .from('task_submissions')
      .update({
        status: 'graded',
        graded_by: professorId,
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('task_id', taskId);
    
    if (updateError) {
      throw updateError;
    }
    
    res.json({
      success: true,
      message: 'Task submission graded successfully'
    });
    
  } catch (error) {
    console.error('Error grading task submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FILE DOWNLOAD ENDPOINT
// ============================================

// GET /api/professor-grading/download-file - Download submission files
router.get('/download-file', authenticateProfessor, async (req, res) => {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    console.log('📥 Professor downloading file:', path);
    
    // Auto-detect bucket from file path
    // Phase and project deliverables are stored in the custom-files bucket
    // The path includes the subdirectory (e.g., "phase-deliverables/uuid/uuid/file.pdf")
    let bucket = 'custom-files'; // Default to custom-files for phase/project deliverables
    let filePath = path; // Keep the full path within the bucket
    
    // Only use task-submissions bucket if path contains task-specific patterns
    if (path.includes('/attempt_') || path.match(/\/[a-f0-9-]{36}\/[a-f0-9-]{36}\//)) {
      // This looks like a task submission path
      if (!path.startsWith('phase-deliverables/') && !path.startsWith('project-deliverables/')) {
        bucket = 'task-submissions';
      }
    }
    
    console.log('📦 Using bucket:', bucket, 'for file path:', filePath);
    
    // Download file from Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (error) {
      console.error('❌ Download error from bucket', bucket, ':', error);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate headers
    const fileName = path.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const buffer = Buffer.from(await data.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;