// CLEAN Grading API - Consolidates all submission types for professor view
const express = require('express');
// Supabase authentication middleware (same as original grading API)
const authenticateProfessor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get professor details
    const { data: professor, error: professorError } = await supabase
      .from('professoraccounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (professorError || !professor) {
      console.error('❌ Professor lookup error:', professorError);
      return res.status(403).json({ error: 'Professor account not found' });
    }

    console.log('✅ CLEAN GRADING: Professor authenticated:', professor.email);
    req.user = professor;
    next();
  } catch (error) {
    console.error('❌ Authentication error in clean grading API:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// GET /api/grading-clean/projects/:id - Get project details
router.get('/projects/:id', authenticateProfessor, async (req, res) => {
  try {
    const { id } = req.params;
    const professorId = req.user.id;

    console.log('📚 Fetching project:', id, 'for professor:', professorId);

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id, title, description, due_date, created_at, created_by, evaluation_form_type,
        course:courses!inner(id, course_name, course_code, professor_id)
      `)
      .eq('id', id)
      .eq('courses.professor_id', professorId)
      .single();

    if (error) {
      console.error('❌ Project fetch error:', error);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('✅ Project fetched successfully:', project.title);
    res.json(project);
  } catch (error) {
    console.error('❌ Unexpected error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// GET /api/grading-clean/courses/:id - Get course details
router.get('/courses/:id', authenticateProfessor, async (req, res) => {
  try {
    const { id } = req.params;
    const professorId = req.user.id;

    console.log('🏫 Fetching course:', id, 'for professor:', professorId);

    const { data: course, error } = await supabase
      .from('courses')
      .select('id, course_name, course_code, section, semester, school_year, professor_id')
      .eq('id', id)
      .eq('professor_id', professorId)
      .single();

    if (error) {
      console.error('❌ Course fetch error:', error);
      return res.status(404).json({ error: 'Course not found' });
    }

    console.log('✅ Course fetched successfully:', course.course_name);
    res.json(course);
  } catch (error) {
    console.error('❌ Unexpected error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// GET /api/grading-clean/projects/:projectId/groups - Get groups that have submitted for a project
router.get('/projects/:projectId/groups', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 CLEAN GRADING: Getting groups with submissions for project:', projectId);
    
    // Verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`*, course:courses(professor_id)`)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project || project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get groups that have submitted for this project
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select(`
        group_id,
        submission_date,
        status,
        group:course_groups(
          id,
          group_number,
          group_name,
          members:course_group_members(
            student_id,
            role,
            student:studentaccounts(
              id,
              first_name,
              last_name,
              student_number
            )
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

    // Get phase submissions counts for each group
    const { data: phases } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId);

    const phaseIds = phases?.map(p => p.id) || [];
    
    // Enhance submissions with additional info
    const enhancedGroups = [];
    
    for (const submission of submissions || []) {
      const groupId = submission.group_id;
      
      // Count phase submissions for this group
      let phaseSubmissionCount = 0;
      if (phaseIds.length > 0) {
        const { data: phaseSubmissions } = await supabase
          .from('phase_submissions')
          .select('id')
          .in('phase_id', phaseIds)
          .eq('group_id', groupId);
        
        phaseSubmissionCount = phaseSubmissions?.length || 0;
      }
      
      enhancedGroups.push({
        id: submission.group_id,
        name: submission.group?.group_name || `Group ${submission.group?.group_number}`,
        memberCount: submission.group?.members?.length || 0,
        hasProjectSubmission: true,
        phaseSubmissions: phaseSubmissionCount,
        projectSubmissionDate: submission.submission_date,
        status: submission.status,
        members: submission.group?.members || []
      });
    }

    res.json({
      success: true,
      project,
      groups: enhancedGroups
    });

  } catch (error) {
    console.error('❌ Error in clean grading groups API:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/grading-clean/groups/:groupId/project/:projectId - CONSOLIDATED grading view
router.get('/groups/:groupId/project/:projectId', authenticateProfessor, async (req, res) => {
  try {
    const { groupId, projectId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 CLEAN GRADING: Getting consolidated submissions for group:', groupId, 'project:', projectId);
    
    // Verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`*, course:courses(professor_id)`)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project || project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 1. Get PROJECT SUBMISSION (Final deliverable)
    console.log('📋 STEP 1: Getting project submission...');
    const { data: projectSubmission } = await supabase
      .from('project_submissions')
      .select(`
        *,
        submitted_by_student:studentaccounts(id, first_name, last_name, student_number)
      `)
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .single();

    console.log(`✅ PROJECT: ${projectSubmission ? 'Found' : 'Not found'} project submission`);

    // 2. Get PHASE SUBMISSIONS (Individual phase deliverables)
    console.log('📋 STEP 2: Getting phase submissions...');
    const { data: phases } = await supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });

    let phaseSubmissions = [];
    if (phases?.length > 0) {
      const phaseIds = phases.map(phase => phase.id);
      const { data: phaseSubmissionsData, error: phaseError } = await supabase
        .from('phase_submissions')
        .select(`
          *,
          phase:project_phases(id, title, phase_number, description),
          submitted_by_student:studentaccounts(id, first_name, last_name, student_number)
        `)
        .in('phase_id', phaseIds)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      
      if (phaseError) {
        console.error('❌ Error getting phase submissions:', phaseError);
      }
      
      phaseSubmissions = phaseSubmissionsData || [];
    }

    console.log(`✅ PHASES: Found ${phaseSubmissions.length} phase submissions`);

    // 3. Get FROZEN TASK SUBMISSIONS (Member tasks at project completion)
    console.log('📋 STEP 3: Getting frozen task submissions...');
    const { data: frozenTaskSubmissions, error: frozenError } = await supabase
      .from('frozen_task_submissions')
      .select(`
        id,
        task_id,
        phase_id,
        group_id,
        student_id,
        task_title,
        original_status,
        frozen_at,
        frozen_by_leader,
        original_submission_id,
        student:studentaccounts!frozen_task_submissions_student_id_fkey(id, first_name, last_name, student_number),
        phase:project_phases!frozen_task_submissions_phase_id_fkey(id, title, phase_number),
        original_submission:task_submissions!frozen_task_submissions_original_submission_id_fkey(
          id,
          submission_text,
          file_urls,
          submission_date
        )
      `)
      .eq('group_id', groupId)
      .order('frozen_at', { ascending: false });
      
    if (frozenError) {
      console.error('❌ Error getting frozen task submissions:', frozenError);
    }

    console.log(`✅ FROZEN TASKS: Found ${frozenTaskSubmissions?.length || 0} frozen task submissions`);

    // Format frozen submissions for display
    const taskSubmissions = frozenTaskSubmissions?.map(frozen => ({
      id: frozen.id,
      task_id: frozen.task_id,
      task_title: frozen.task_title,
      task_description: '', // Not available in frozen table
      task_number: 0, // Not available in frozen table
      submitted_by: frozen.student_id,
      submitted_by_student: frozen.student,
      submission_text: frozen.original_submission?.submission_text || '',
      file_urls: frozen.original_submission?.file_urls || [],
      status: 'frozen',
      original_status: frozen.original_status,
      submitted_at: frozen.original_submission?.submission_date || frozen.frozen_at,
      submission_date: frozen.original_submission?.submission_date || frozen.frozen_at,
      is_frozen: true,
      frozen_at: frozen.frozen_at,
      phase_id: frozen.phase_id,
      phase: frozen.phase,
      original_submission_id: frozen.original_submission_id
    })) || [];

    // 4. Get group information
    console.log('📋 STEP 4: Getting group information...');
    const { data: group } = await supabase
      .from('course_groups')
      .select(`
        *,
        members:course_group_members(
          student_id,
          role,
          is_active,
          student:studentaccounts(id, first_name, last_name, student_number)
        )
      `)
      .eq('id', groupId)
      .single();

    console.log(`✅ GROUP: Found group with ${group?.members?.length || 0} members`);

    // SUMMARY
    const summary = {
      projectSubmission: projectSubmission ? 1 : 0,
      phaseSubmissions: phaseSubmissions.length,
      taskSubmissions: taskSubmissions.length,
      totalSubmissions: (projectSubmission ? 1 : 0) + phaseSubmissions.length + taskSubmissions.length
    };

    console.log('✅ GRADING CONSOLIDATED:', summary);

    res.json({
      success: true,
      project,
      group,
      projectSubmission,
      phases: phases || [],
      phaseSubmissions,
      taskSubmissions,
      summary
    });

  } catch (error) {
    console.error('❌ Error in clean grading API:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grading-clean/project-submissions/:id/grade - Grade a project submission
router.post('/project-submissions/:id/grade', authenticateProfessor, async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, feedback, individualGrades } = req.body;
    const professorId = req.user.id;
    
    console.log('🎯 GRADING: Project submission', id, 'Grade:', grade);
    
    // Verify professor has access to this submission
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select(`
        *,
        project:projects(id, course_id),
        course:projects(course:courses(professor_id))
      `)
      .eq('id', id)
      .single();
    
    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Check access
    const { data: project } = await supabase
      .from('projects')
      .select('course:courses(professor_id)')
      .eq('id', submission.project_id)
      .single();
    
    if (!project || project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update the grade
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('project_submissions')
      .update({
        grade: parseFloat(grade),
        feedback: feedback || null,
        graded_at: new Date().toISOString(),
        graded_by: professorId
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating project grade:', updateError);
      return res.status(500).json({ error: 'Failed to update grade' });
    }
    
    // Handle individual grades if provided
    if (individualGrades && individualGrades.length > 0) {
      for (const individualGrade of individualGrades) {
        if (individualGrade.grade) {
          // Store individual grades in a separate table or field
          // This would require additional database schema
          console.log('Individual grade for student', individualGrade.studentId, ':', individualGrade.grade);
        }
      }
    }
    
    console.log('✅ PROJECT GRADED successfully');
    
    res.json({
      success: true,
      submission: updatedSubmission
    });
    
  } catch (error) {
    console.error('❌ Error in project grading:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grading-clean/phase-submissions/:id/grade - Grade a phase submission
router.post('/phase-submissions/:id/grade', authenticateProfessor, async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, feedback } = req.body;
    const professorId = req.user.id;
    
    console.log('🎯 GRADING: Phase submission', id, 'Grade:', grade);
    
    // Verify professor has access to this submission
    const { data: submission, error: submissionError } = await supabase
      .from('phase_submissions')
      .select(`
        *,
        phase:project_phases(
          id,
          project_id,
          project:projects(
            course:courses(professor_id)
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Phase submission not found' });
    }
    
    // Check access
    if (submission.phase.project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update the grade
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('phase_submissions')
      .update({
        grade: parseFloat(grade),
        feedback: feedback || null,
        graded_at: new Date().toISOString(),
        graded_by: professorId
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating phase grade:', updateError);
      return res.status(500).json({ error: 'Failed to update grade' });
    }
    
    console.log('✅ PHASE GRADED successfully');
    
    res.json({
      success: true,
      submission: updatedSubmission
    });
    
  } catch (error) {
    console.error('❌ Error in phase grading:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;