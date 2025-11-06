const express = require('express');

// Export a function that takes the supabase client and authenticateProfessor middleware
module.exports = (supabase, authenticateProfessor) => {
  const router = express.Router();

  // Use the passed authenticateProfessor middleware instead of creating our own
  const verifyProfessor = authenticateProfessor;

  // Get all phase deliverable submissions for a course
  router.get('/courses/:courseId/phase-deliverable-submissions', verifyProfessor, async (req, res) => {
    try {
      const { courseId } = req.params;
      const professorId = req.user?.id || req.professorId; // Use req.user.id from authenticateProfessor
      
      console.log('📊 [Router Phase] Endpoint reached');
      console.log('📊 [Router Phase] courseId:', courseId);
      console.log('📊 [Router Phase] professorId:', professorId);
      console.log('📊 [Router Phase] req.user:', req.user);

      // First verify the professor owns this course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('professor_id', professorId)
        .single();

      console.log('📊 [Router Phase] Course lookup result:', {
        found: !!course,
        courseProfessorId: course?.professor_id,
        requestProfessorId: professorId,
        match: course?.professor_id === professorId,
        error: courseError?.message
      });

      if (courseError || !course) {
        console.log('❌ [Router Phase] Course not found or access denied');
        return res.status(404).json({ error: 'Course not found or access denied' });
      }

      // Get all projects for this course
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('course_id', courseId);

      if (projectError || !projects || projects.length === 0) {
        // No projects in this course, return empty submissions
        return res.json({ submissions: [] });
      }

      // Get project IDs
      const projectIds = projects.map(p => p.id);

      // Get all phase deliverable submissions for these projects
      const { data: submissions, error } = await supabase
        .from('phase_deliverable_submissions')
        .select(`
          *,
          projects (
            id,
            title,
            course_id
          ),
          project_phases (
            id,
            phase_number,
            title,
            end_date
          ),
          course_groups (
            id,
            group_name,
            group_number
          )
        `)
        .in('project_id', projectIds)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching phase submissions:', error);
        return res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
      }

      // Transform to camelCase for frontend consistency
      const formattedSubmissions = (submissions || []).map(sub => ({
        id: sub.id,
        projectId: sub.project_id,
        projectTitle: sub.projects?.title,
        phaseId: sub.phase_id,
        phaseNumber: sub.project_phases?.phase_number,
        phaseTitle: sub.project_phases?.title,
        groupId: sub.group_id,
        groupName: sub.course_groups?.group_name || `Group ${sub.course_groups?.group_number || sub.group_id || '?'}`,
        submittedBy: sub.submitted_by,
        submittedAt: sub.submitted_at,
        files: sub.files,
        submissionText: sub.submission_text,
        status: sub.status,
        grade: sub.grade,
        maxGrade: sub.max_grade,
        gradedAt: sub.graded_at,
        gradedBy: sub.graded_by,
        instructorFeedback: sub.instructor_feedback,
        isResubmission: sub.is_resubmission,
        resubmissionNumber: sub.resubmission_number,
        originalSubmissionId: sub.original_submission_id,
        phaseSnapshot: sub.phase_snapshot,
        memberTasks: sub.member_tasks,
        evaluationSubmissions: sub.evaluation_submissions,
        memberInclusions: sub.member_inclusions,
        validationResults: sub.validation_results
      }));

      return res.json({ submissions: formattedSubmissions || [] });
    } catch (error) {
      console.error('Error in phase submissions route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all project deliverable submissions for a course
  router.get('/courses/:courseId/project-deliverable-submissions', verifyProfessor, async (req, res) => {
    try {
      const { courseId } = req.params;
      const professorId = req.user?.id || req.professorId; // Use req.user.id from authenticateProfessor
      
      console.log('📊 [Router Project] Endpoint reached');
      console.log('📊 [Router Project] courseId:', courseId);
      console.log('📊 [Router Project] professorId:', professorId);
      console.log('📊 [Router Project] req.user:', req.user);

      // First verify the professor owns this course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('professor_id', professorId)
        .single();

      console.log('📊 [Router Project] Course lookup result:', {
        found: !!course,
        courseProfessorId: course?.professor_id,
        requestProfessorId: professorId,
        match: course?.professor_id === professorId,
        error: courseError?.message
      });

      if (courseError || !course) {
        console.log('❌ [Router Project] Course not found or access denied');
        return res.status(404).json({ error: 'Course not found or access denied' });
      }

      // Get all projects for this course
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('course_id', courseId);

      if (projectError || !projects || projects.length === 0) {
        // No projects in this course, return empty submissions
        return res.json({ submissions: [] });
      }

      // Get project IDs
      const projectIds = projects.map(p => p.id);

      // Get all project deliverable submissions for these projects
      const { data: submissions, error } = await supabase
        .from('project_deliverable_submissions')
        .select(`
          *,
          projects (
            id,
            title,
            course_id,
            due_date
          ),
          course_groups (
            id,
            group_name,
            group_number
          )
        `)
        .in('project_id', projectIds)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching project submissions:', error);
        return res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
      }

      // Transform to camelCase for frontend consistency
      const formattedSubmissions = (submissions || []).map(sub => ({
        id: sub.id,
        projectId: sub.project_id,
        projectTitle: sub.projects?.title,
        groupId: sub.group_id,
        groupName: sub.course_groups?.group_name || `Group ${sub.course_groups?.group_number || sub.group_id || '?'}`,
        submittedBy: sub.submitted_by,
        submittedAt: sub.submitted_at,
        files: sub.files,
        submissionText: sub.submission_text,
        status: sub.status,
        grade: sub.grade,
        maxGrade: sub.max_grade,
        gradedAt: sub.graded_at,
        gradedBy: sub.graded_by,
        instructorFeedback: sub.instructor_feedback,
        isResubmission: sub.is_resubmission,
        resubmissionNumber: sub.resubmission_number,
        originalSubmissionId: sub.original_submission_id,
        projectSnapshot: sub.project_snapshot,
        memberTasks: sub.member_tasks,
        evaluationSubmissions: sub.evaluation_submissions,
        memberInclusions: sub.member_inclusions,
        validationResults: sub.validation_results,
        phaseDeliverables: sub.phase_deliverables
      }));

      return res.json({ submissions: formattedSubmissions || [] });
    } catch (error) {
      console.error('Error in project submissions route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Grade a phase deliverable submission
  router.post('/phase-deliverable-submissions/:submissionId/grade', verifyProfessor, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, instructor_feedback, status } = req.body;

      // Validate input
      if (grade === undefined || grade === null) {
        return res.status(400).json({ error: 'Grade is required' });
      }

      // Get the submission to verify access
      const { data: submission, error: fetchError } = await supabase
        .from('phase_deliverable_submissions')
        .select(`
          *,
          projects!inner(
            id,
            course_id,
            courses!inner(
              professor_id
            )
          )
        `)
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Verify professor owns the course
      if (submission.projects.courses.professor_id !== req.professorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the submission with grade
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('phase_deliverable_submissions')
        .update({
          grade: parseFloat(grade),
          instructor_feedback: instructor_feedback || null,
          status: status || 'graded',
          graded_by: req.professorId,
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating submission:', updateError);
        return res.status(500).json({ error: 'Failed to save grade' });
      }

      return res.json({ 
        message: 'Grade saved successfully', 
        submission: updatedSubmission 
      });
    } catch (error) {
      console.error('Error in grade submission route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Grade a project deliverable submission
  router.post('/project-deliverable-submissions/:submissionId/grade', verifyProfessor, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, instructor_feedback, status } = req.body;

      // Validate input
      if (grade === undefined || grade === null) {
        return res.status(400).json({ error: 'Grade is required' });
      }

      // Get the submission to verify access
      const { data: submission, error: fetchError } = await supabase
        .from('project_deliverable_submissions')
        .select(`
          *,
          projects!inner(
            id,
            course_id,
            courses!inner(
              professor_id
            )
          )
        `)
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Verify professor owns the course
      if (submission.projects.courses.professor_id !== req.professorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the submission with grade
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('project_deliverable_submissions')
        .update({
          grade: parseFloat(grade),
          instructor_feedback: instructor_feedback || null,
          status: status || 'graded',
          graded_by: req.professorId,
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating submission:', updateError);
        return res.status(500).json({ error: 'Failed to save grade' });
      }

      return res.json({ 
        message: 'Grade saved successfully', 
        submission: updatedSubmission 
      });
    } catch (error) {
      console.error('Error in grade submission route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

