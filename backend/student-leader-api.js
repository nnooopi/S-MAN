const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use your existing Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Get allowed file types from request (will be passed from frontend)
    const allowedTypes = req.body.allowedFileTypes ? JSON.parse(req.body.allowedFileTypes) : [];
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.length === 0 || allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

// Authentication middleware
router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    console.error('❌ No authenticated user found in student-leader middleware');
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

// In student_leader_api.js, replace the problematic section with:

router.get('/projects', async (req, res) => {
  try {
    console.log('🔍 Fetching active projects for student leader...');
    
    // 🔴 FIX: Remove project_evaluation_forms to avoid ambiguous FK constraint error
    // The project_evaluation_forms has duplicate FK constraints causing Supabase embedding to fail
    // We'll fetch the data separately if needed
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        created_at,
        breathe_phase_days,
        evaluation_phase_days,
        rubric_file_url,
        evaluation_form_type,
        evaluation_form_file_url,
        course_id,
        min_tasks_per_member,
        max_tasks_per_member,
        courses(
          course_name,
          course_code,
          professor_id,
          professoraccounts(first_name, last_name)
        ),
        project_phases(
          id,
          phase_number,
          title,
          description,
          start_date,
          end_date
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching projects:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error.details || 'See server logs for details'
      });
    }

    // DEBUG: Log what we got from the query
    console.log('🔍 [BACKEND DEBUG] First project phases:', JSON.stringify(projects[0]?.project_phases?.[0], null, 2));

    // Format the response to match expected structure
    const formattedProjects = projects.map(project => {
      // Calculate evaluation dates for each phase
      const projectPhasesWithEvals = project.project_phases.map((phase, index) => {
        // Evaluation phase starts at phase end_date + 1 second (becomes next day 12:00 AM)
        const evalStartDate = new Date(new Date(phase.end_date).getTime() + 1000); // +1 second = next day 12:00 AM
        
        // Evaluation phase ends after evaluation_phase_days days
        const evalEndDate = new Date(evalStartDate.getTime() + (project.evaluation_phase_days * 24 * 60 * 60 * 1000));
        
        return {
          ...phase,
          evaluation_available_from: evalStartDate.toISOString(),
          evaluation_due_date: evalEndDate.toISOString()
        };
      });

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        created_at: project.created_at,
        breathe_phase_days: project.breathe_phase_days,
        evaluation_phase_days: project.evaluation_phase_days,
        rubric_file_url: project.rubric_file_url,
        evaluation_form_type: project.evaluation_form_type,
        evaluation_form_file_url: project.evaluation_form_file_url,
        course_id: project.course_id,
        min_tasks_per_member: project.min_tasks_per_member,
        max_tasks_per_member: project.max_tasks_per_member,
        course_name: project.courses?.course_name || 'Unknown Course',
        course_code: project.courses?.course_code || 'N/A',
        professor_name: project.courses?.professoraccounts ? 
          `${project.courses.professoraccounts.first_name} ${project.courses.professoraccounts.last_name}` : 
          'Unknown Professor',
        project_phases: projectPhasesWithEvals,
        project_evaluation_forms: project.project_evaluation_forms || []
      };
    });

    console.log(`✅ Found ${formattedProjects.length} active projects`);
    res.json({
      success: true,
      projects: formattedProjects,
      count: formattedProjects.length
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching projects:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/student-leader/projects/:projectId/phases - Get project phases for students
router.get('/projects/:projectId/phases', async (req, res) => {
  try {
    const { projectId } = req.params;
    const leader_id = req.user.id;
    
    console.log('📋 Getting project phases for project:', projectId, 'by leader:', leader_id);
    
    // Verify leader has access to this project by checking their group membership
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Get project phases
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select(`
        id,
        phase_number,
        title,
        description,
        start_date,
        end_date,
        is_active,
        file_types_allowed,
        max_attempts,
        evaluation_form_type,
        rubric,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });
    
    if (phasesError) {
      console.error('Error fetching project phases:', phasesError);
      return res.status(500).json({ error: phasesError.message });
    }
    
    console.log('✅ Successfully fetched', phases?.length || 0, 'phases');
    
    res.json({
      success: true,
      phases: phases || []
    });
    
  } catch (error) {
    console.error('Error getting project phases:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/projects/:projectId/phases-with-submissions - Get project phases with submission status
router.get('/projects/:projectId/phases-with-submissions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const leader_id = req.user.id;
    
    console.log('📋 Getting project phases with submission status for project:', projectId, 'by leader:', leader_id);
    
    // Verify leader has access to this project by checking their group membership
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Get project details for due date and project completion
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('title, due_date')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return res.status(500).json({ error: projectError.message });
    }
    
    // Get project phases with full details including max_attempts
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select(`
        id,
        phase_number,
        title,
        description,
        start_date,
        end_date,
        file_types_allowed,
        evaluation_form_type,
        max_attempts,
        created_at
      `)
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });
    
    if (phasesError) {
      console.error('Error fetching project phases:', phasesError);
      return res.status(500).json({ error: phasesError.message });
    }
    
    // Get existing phase submissions for the leader's group with attempt information
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_submissions')
      .select(`
        id,
        phase_id,
        submission_text,
        file_urls,
        submission_date,
        grade,
        graded_by,
        status,
        is_late,
        attempt_number
      `)
      .eq('group_id', leaderMembership.group_id)
      .in('phase_id', phases?.map(p => p.id) || [])
      .order('phase_id, attempt_number', { ascending: true });
    
    if (submissionsError) {
      console.error('Error fetching phase submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    // Get project completion submission
    const { data: projectSubmission, error: projectSubmissionError } = await supabase
      .from('project_submissions')
      .select(`
        id,
        submission_text,
        file_urls,
        submission_date,
        grade,
        graded_by,
        status,
        is_late
      `)
      .eq('project_id', projectId)
      .eq('group_id', leaderMembership.group_id)
      .single();

    if (projectSubmissionError && projectSubmissionError.code !== 'PGRST116') {
      console.error('Error fetching project submission:', projectSubmissionError);
    }
    
    const currentDate = new Date();
    
    // Combine phases with submission status and attempt information + date validation
    const phasesWithSubmissions = phases?.map(phase => {
      const phaseSubmissions = submissions?.filter(s => s.phase_id === phase.id) || [];
      const maxAttempts = phase.max_attempts || 1;
      const currentAttempts = phaseSubmissions.length;
      const latestSubmission = phaseSubmissions[phaseSubmissions.length - 1]; // Last attempt
      
      // Date validation
      const startDate = new Date(phase.start_date);
      const endDate = new Date(phase.end_date);
      const isWithinDateRange = currentDate >= startDate && currentDate <= endDate;
      const isPastDue = currentDate > endDate;
      const isNotStarted = currentDate < startDate;
      
      return {
        ...phase,
        hasSubmission: phaseSubmissions.length > 0,
        submission: latestSubmission || null,
        submissions: phaseSubmissions, // All submissions for history
        status: latestSubmission ? (latestSubmission.grade !== null ? 'graded' : 'submitted') : 'pending',
        // Attempt tracking
        maxAttempts: maxAttempts,
        currentAttempts: currentAttempts,
        canSubmit: currentAttempts < maxAttempts && isWithinDateRange,
        attemptHistory: phaseSubmissions.map(sub => ({
          attempt_number: sub.attempt_number,
          submission_date: sub.submission_date,
          status: sub.grade !== null ? 'graded' : sub.status,
          grade: sub.grade
        })),
        // Date validation info
        dateRestriction: {
          isWithinRange: isWithinDateRange,
          isPastDue: isPastDue,
          isNotStarted: isNotStarted,
          startDate: phase.start_date,
          endDate: phase.end_date,
          message: isNotStarted ? `Phase starts on ${startDate.toLocaleDateString()}` :
                   isPastDue ? `Phase ended on ${endDate.toLocaleDateString()}` :
                   isWithinDateRange ? 'Phase is currently active' : ''
        }
      };
    }) || [];

    // Create virtual "Project Completion" phase
    const maxPhaseNumber = Math.max(...phases.map(p => p.phase_number), 0);
    const projectCompletionPhase = {
      id: `project-completion-${projectId}`,
      phase_number: maxPhaseNumber + 1,
      title: 'Project Completion',
      description: 'Final project submission and completion',
      start_date: phases.length > 0 ? phases[phases.length - 1].end_date : project.due_date,
      end_date: project.due_date,
      file_types_allowed: ['pdf', 'doc', 'docx', 'zip', 'rar'], // Common project file types
      evaluation_form_type: null,
      max_attempts: 1,
      created_at: new Date().toISOString(),
      hasSubmission: !!projectSubmission,
      submission: projectSubmission || null,
      submissions: projectSubmission ? [projectSubmission] : [],
      status: projectSubmission ? (projectSubmission.grade !== null ? 'graded' : 'submitted') : 'pending',
      maxAttempts: 1,
      currentAttempts: projectSubmission ? 1 : 0,
      canSubmit: !projectSubmission && new Date() <= new Date(project.due_date),
      attemptHistory: projectSubmission ? [{
        attempt_number: 1,
        submission_date: projectSubmission.submission_date,
        status: projectSubmission.grade !== null ? 'graded' : projectSubmission.status,
        grade: projectSubmission.grade
      }] : [],
      dateRestriction: {
        isWithinRange: new Date() <= new Date(project.due_date),
        isPastDue: new Date() > new Date(project.due_date),
        isNotStarted: false,
        startDate: phases.length > 0 ? phases[phases.length - 1].end_date : null,
        endDate: project.due_date,
        message: new Date() > new Date(project.due_date) ? 
          `Project deadline was ${new Date(project.due_date).toLocaleDateString()}` :
          `Project deadline: ${new Date(project.due_date).toLocaleDateString()}`
      },
      isProjectCompletion: true
    };

    // Add project completion phase to the list
    const allPhases = [...phasesWithSubmissions, projectCompletionPhase];
    
    console.log('✅ Successfully fetched', allPhases.length, 'phases with submission status and attempts (including project completion)');
    
    res.json({
      success: true,
      phases: allPhases
    });
    
  } catch (error) {
    console.error('Error getting project phases with submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/projects/:projectId/limits
router.get('/projects/:projectId/limits', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('🔧 Getting project limits for:', projectId, 'by student:', student_id);
    
    // First verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // ✅ DIRECT PROJECT QUERY
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, min_tasks_per_member, max_tasks_per_member')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log('📊 Direct project query result:', {
      min_tasks: project.min_tasks_per_member,
      max_tasks: project.max_tasks_per_member,
      types: {
        min: typeof project.min_tasks_per_member,
        max: typeof project.max_tasks_per_member
      }
    });
    
    res.json({
      min_tasks_per_member: project.min_tasks_per_member || 0,
      max_tasks_per_member: project.max_tasks_per_member || 10
    });
    
  } catch (error) {
    console.error('Error getting project limits:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/projects/:projectId/member-task-counts
router.get('/projects/:projectId/member-task-counts', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('📊 Getting member task counts for:', projectId, 'by student:', student_id);
    
    // First verify the user is a leader and get their group
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        role
      `)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Get all members in the same group
    const { data: members, error } = await supabase
      .from('course_group_members')
      .select(`
        student_id
      `)
      .eq('group_id', leaderMembership.group_id)
      .eq('is_active', true);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Get task counts for each member
    const task_counts = {};
    
    for (const member of members) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('assigned_to', member.student_id)
        .eq('is_active', true);
      
      task_counts[member.student_id] = count || 0;
    }
    
    console.log('✅ Task counts retrieved:', task_counts);
    res.json({ task_counts });
    
  } catch (error) {
    console.error('Error getting member task counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/assign-task
router.post('/assign-task', async (req, res) => {
  try {
    const {
      project_id,
      assigned_to,
      title,
      description,
      due_date,
      available_until,
      max_attempts,
      file_types_allowed
    } = req.body;
    
    const assigned_by = req.user.id;
    
    console.log('📋 Assigning task:', title, 'to student:', assigned_to, 'by leader:', assigned_by);
    
    // Verify leader permissions
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        role
      `)
      .eq('student_id', assigned_by)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Verify the assigned_to student is in the same group
    const { data: memberMembership, error: memberError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('student_id', assigned_to)
      .eq('group_id', leaderMembership.group_id)
      .eq('is_active', true)
      .single();
    
    if (memberError || !memberMembership) {
      return res.status(400).json({ error: 'Cannot assign task to student not in your group' });
    }
    
    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id,
        assigned_to,
        assigned_by,
        title,
        description,
        due_date,
        available_until,
        max_attempts: max_attempts || 1,
        file_types_allowed,
        status: 'pending',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating task:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Task created successfully:', task.id);
    res.json({ success: true, task });
    
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/student-leader/projects/:projectId/members

// ✅ UPDATED: GET /api/student-leader/projects/:projectId/members
router.get('/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    // Get the leader's group for this project
    const { data: leaderGroup, error: leaderError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        course_groups(
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderGroup) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Verify project belongs to this course
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .eq('course_id', leaderGroup.course_groups.course_id)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // ✅ FIXED: Get ALL group members (including the leader)
    const { data: members, error } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        role,
        studentaccounts(
          id,
          first_name,
          last_name,
          email,
          profile_image_url
        )
      `)
      .eq('group_id', leaderGroup.group_id);

    if (error) throw error;

    // Get task completion counts for each member
    const memberIds = members.map(m => m.student_id);
    const { data: completions, error: completionError } = await supabase
      .from('tasks')
      .select('assigned_to')
      .in('assigned_to', memberIds)
      .eq('project_id', projectId)
      .eq('status', 'completed');

    if (completionError) {
      console.warn('Warning getting completions:', completionError);
    }

    // Count completed tasks per member
    const completionCounts = (completions || []).reduce((acc, task) => {
      acc[task.assigned_to] = (acc[task.assigned_to] || 0) + 1;
      return acc;
    }, {});

    // ✅ UPDATED: Format response with corrected image URLs
    const result = members.map(member => ({
      student_id: member.student_id,
      name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
      email: member.studentaccounts.email,
      avatar_url: member.studentaccounts.profile_image_url, // Keep original path
      role: member.role,
      completed_tasks: completionCounts[member.student_id] || 0
    }));
    
    console.log('✅ Project members retrieved:', result.length, 'members');
    console.log('🔍 Sample member data:', result[0]);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting project members:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/projects/:projectId/members/:memberId/submissions
router.get('/projects/:projectId/members/:memberId/submissions', async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const student_id = req.user.id;
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Get member's tasks for this project with phase information
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        status,
        assigned_to,
        created_at,
        phase_id,
        project_phases(
          id,
          phase_number,
          title
        )
      `)
      .eq('assigned_to', memberId)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // Get submissions for these tasks
    const taskIds = tasks.map(t => t.id);
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submission_text,
        file_urls,
        status,
        submission_date,
        created_at
      `)
      .in('task_id', taskIdsForQuery)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.warn('Warning getting submissions:', submissionsError);
    }

    // Get revision submissions for these tasks
    const { data: revisionSubmissions, error: revisionError } = await supabase
      .from('revision_submissions')
      .select(`
        id,
        task_id,
        original_submission_id,
        submission_text,
        file_paths,
        status,
        revision_attempt_number,
        created_at,
        submitted_at
      `)
      .in('task_id', taskIdsForQuery)
      .eq('submitted_by', memberId)
      .order('created_at', { ascending: false });

    if (revisionError) {
      console.warn('Warning getting revision submissions:', revisionError);
    }

    // Get feedback for these submissions
    const submissionIds = (submissions || []).map(s => s.id);
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('task_feedback')
      .select('submission_id, feedback_text, rating, created_at')
      .in('submission_id', submissionIds)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.warn('Warning getting feedback:', feedbackError);
    }

    // Combine tasks with their submissions and revision submissions
    const result = tasks.map(task => {
      const taskSubmissions = (submissions || []).filter(s => s.task_id === task.id);
      const taskRevisions = (revisionSubmissions || []).filter(r => r.task_id === task.id);
      const latestSubmission = taskSubmissions[0]; // Most recent submission
      const latestRevision = taskRevisions[0]; // Most recent revision
      const submissionFeedback = latestSubmission ? 
        (feedbackData || []).find(f => f.submission_id === latestSubmission.id) : null;
      
      // Determine the current status and what to show
      let currentStatus = task.status;
      let displaySubmission = latestSubmission;
      
      // Check for approved revisions first - they take highest precedence
      if (latestRevision && latestRevision.status === 'approved') {
        currentStatus = 'completed'; // Show as completed if revision is approved
        displaySubmission = {
          id: latestRevision.id,
          task_id: latestRevision.task_id,
          submission_text: latestRevision.submission_text,
          file_urls: JSON.stringify(latestRevision.file_paths || []),
          status: 'approved', // Keep the approved status for display
          created_at: latestRevision.submitted_at,
          is_revision: true,
          revision_attempt_number: latestRevision.revision_attempt_number
        };
      }
      // If there's a pending revision, that takes precedence
      else if (latestRevision && latestRevision.status === 'pending') {
        currentStatus = 'pending_revision_review';
        displaySubmission = {
          id: latestRevision.id,
          task_id: latestRevision.task_id,
          submission_text: latestRevision.submission_text,
          file_urls: JSON.stringify(latestRevision.file_paths || []),
          status: latestRevision.status,
          created_at: latestRevision.submitted_at,
          is_revision: true,
          revision_attempt_number: latestRevision.revision_attempt_number
        };
      }
      // Check if the original submission is approved
      else if (latestSubmission && latestSubmission.status === 'approved') {
        currentStatus = 'completed'; // Show as completed if original submission is approved
      }
      
      return {
        id: displaySubmission?.id || `task-${task.id}`,
        task_id: task.id,
        task_title: task.title,
        task_description: task.description,
        due_date: task.due_date,
        status: currentStatus === 'completed' ? 'completed' : (displaySubmission?.status || currentStatus || 'assigned'),
        submission_text: displaySubmission?.submission_text,
        file_urls: displaySubmission?.file_urls ? 
          (typeof displaySubmission.file_urls === 'string' ? 
            JSON.parse(displaySubmission.file_urls) : 
            displaySubmission.file_urls) : [],
        feedback: submissionFeedback?.feedback_text,
        rating: submissionFeedback?.rating,
        submitted_at: displaySubmission?.submission_date || displaySubmission?.created_at,
        created_at: task.created_at,
        is_revision: displaySubmission?.is_revision || false,
        revision_attempt_number: displaySubmission?.revision_attempt_number,
        has_revisions: taskRevisions.length > 0,
        revision_count: taskRevisions.length,
        // Add phase information
        phase_info: task.project_phases ? {
          phase_id: task.project_phases.id,
          phase_number: task.project_phases.phase_number,
          phase_title: task.project_phases.title
        } : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting member submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/submissions/:submissionId/ask-revise
router.post('/submissions/:submissionId/ask-revise', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback } = req.body;
    const student_id = req.user.id;
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Check if it's a revision submission or regular submission
    let updateResult;
    
    // First check if it's a revision submission
    const { data: revisionSubmission, error: revError } = await supabase
      .from('revision_submissions')
      .select('id, task_id')
      .eq('id', submissionId)
      .single();
    
    if (revisionSubmission) {
      // Update revision submission status and add feedback
      const { data, error } = await supabase
        .from('revision_submissions')
        .update({
          status: 'revision_requested',
          reviewed_at: new Date().toISOString(),
          reviewed_by: student_id,
          review_comments: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select();
      
      updateResult = { data, error };
      
      // Also update the main task status to 'to_revise' again
      if (!error) {
        await supabase
          .from('tasks')
          .update({
            status: 'to_revise',
            updated_at: new Date().toISOString()
          })
          .eq('id', revisionSubmission.task_id);
      }
    } else {
      // Try task_submissions (regular submissions)
      const { data: submission, error: subError } = await supabase
        .from('task_submissions')
        .select('id, task_id')
        .eq('id', submissionId)
        .single();
      
      if (submission) {
        // Update task submission status
        const { data, error } = await supabase
          .from('task_submissions')
          .update({
            status: 'revision_requested',
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)
          .select();
        
        updateResult = { data, error };
        
        // Don't create feedback entry in task_feedback table for revision requests
        // The leader's feedback is already stored in task_submissions.review_comments
        // and will be displayed in the Leader Request Section of RevisionModal
        
        // Update the main task status to 'to_revise'
        if (!error) {
          await supabase
            .from('tasks')
            .update({
              status: 'to_revise',
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.task_id);
        }
      } else {
        // Try updating task directly (fallback)
        const { data, error } = await supabase
          .from('tasks')
          .update({
            status: 'to_revise',
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)
          .select();
        updateResult = { data, error };
      }
    }

    if (updateResult.error) throw updateResult.error;

    res.json({ message: 'Revision request sent successfully', data: updateResult.data });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/submissions/:submissionId/mark-complete  
router.post('/submissions/:submissionId/mark-complete', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback } = req.body;
    const student_id = req.user.id;
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Check if it's a revision submission or regular submission
    let updateResult;
    
    // First check if it's a revision submission
    const { data: revisionSubmission, error: revError } = await supabase
      .from('revision_submissions')
      .select('id, task_id')
      .eq('id', submissionId)
      .single();
    
    if (revisionSubmission) {
      // Update revision submission status and add feedback
      const { data, error } = await supabase
        .from('revision_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: student_id,
          review_comments: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select();
      
      updateResult = { data, error };
      
      // Update the main task status to 'completed'
      if (!error) {
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', revisionSubmission.task_id);
      }
    } else {
      // Try task_submissions (regular submissions)
      const { data: submission, error: subError } = await supabase
        .from('task_submissions')
        .select('id, task_id')
        .eq('id', submissionId)
        .single();
      
      if (submission) {
        // Update task submission status
        const { data, error } = await supabase
          .from('task_submissions')
          .update({
            status: 'approved',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)
          .select();
        
        updateResult = { data, error };
        
        // Create feedback entry in task_feedback table if feedback provided
        if (!error && feedback) {
          const { error: feedbackError } = await supabase
            .from('task_feedback')
            .insert({
              submission_id: submissionId,
              feedback_by: student_id,
              feedback_text: feedback,
              created_at: new Date().toISOString()
            });
          
          if (feedbackError) {
            console.error('Failed to create feedback:', feedbackError);
          }
        }
        
        // Update the main task status to 'completed'
        if (!error) {
          await supabase
            .from('tasks')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.task_id);
        }
      } else {
        // Try updating task directly (fallback)
        const { data, error } = await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)
          .select();
        updateResult = { data, error };
      }
    }

    if (updateResult.error) throw updateResult.error;

    res.json({ message: 'Task marked as complete', data: updateResult.data });
  } catch (error) {
    console.error('Error marking task as complete:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== TASK MANAGEMENT ENDPOINTS ===================

// GET /api/student-leader/projects/:projectId/assigned-tasks - Get all assigned tasks for a project
router.get('/projects/:projectId/assigned-tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('📋 Getting assigned tasks for project:', projectId, 'by leader:', student_id);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Get all tasks assigned by this leader for the project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        available_until,
        max_attempts,
        file_types_allowed,
        status,
        phase_id,
        created_at,
        updated_at,
        studentaccounts!tasks_assigned_to_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .eq('assigned_by', student_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    // Get submission counts for each task
    const taskIds = tasks.map(t => t.id);
    const { data: submissionCounts, error: submissionError } = await supabase
      .from('task_submissions')
      .select('task_id')
      .in('task_id', taskIds);

    if (submissionError) {
      console.warn('Warning getting submission counts:', submissionError);
    }

    // Count submissions per task
    const submissionCountsMap = (submissionCounts || []).reduce((acc, sub) => {
      acc[sub.task_id] = (acc[sub.task_id] || 0) + 1;
      return acc;
    }, {});

    // Format response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      available_until: task.available_until,
      max_attempts: task.max_attempts,
      file_types_allowed: task.file_types_allowed,
      status: task.status,
      phase_id: task.phase_id,
      assigned_to_name: `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`,
      assigned_to_email: task.studentaccounts.email,
      assigned_to_id: task.studentaccounts.id,
      submissions_count: submissionCountsMap[task.id] || 0,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));

    console.log(`✅ Found ${formattedTasks.length} assigned tasks`);
    res.json({
      success: true,
      tasks: formattedTasks,
      count: formattedTasks.length
    });

  } catch (error) {
    console.error('Error getting assigned tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/projects/:projectId/phases/:phaseId/tasks - Get all tasks for a specific phase
router.get('/projects/:projectId/phases/:phaseId/tasks', async (req, res) => {
  try {
    const { projectId, phaseId } = req.params;
    const student_id = req.user.id;
    
    console.log('📋 Getting tasks for project:', projectId, 'phase:', phaseId, 'by leader:', student_id);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Get all tasks for this phase
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        available_until,
        max_attempts,
        current_attempts,
        file_types_allowed,
        status,
        phase_id,
        assigned_to,
        assigned_by,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log(`✅ Found ${tasks.length} tasks for phase ${phaseId}`);
    res.json(tasks || []);

  } catch (error) {
    console.error('Error getting phase tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/tasks/:taskId/submissions - Get submissions for a specific task
router.get('/tasks/:taskId/submissions', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    
    console.log('📄 Getting submissions for task:', taskId, 'by leader:', student_id);
    
    // Verify the task belongs to this leader
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_by, title')
      .eq('id', taskId)
      .eq('assigned_by', student_id)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Get submissions for this task
    const { data: submissions, error: submissionError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        submission_text,
        file_urls,
        status,
        feedback,
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

    if (submissionError) {
      console.error('❌ Error fetching submissions:', submissionError);
      return res.status(500).json({ error: submissionError.message });
    }

    // Process submissions to include review information
    const processedSubmissions = (submissions || []).map(submission => ({
      ...submission,
      reviewed_by_name: submission.studentaccounts ? 
        `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}` : 
        null,
      reviewed_by_profile_image: submission.studentaccounts?.profile_image_url
        ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${submission.studentaccounts.profile_image_url}`
        : null
    }));

    console.log(`✅ Found ${submissions?.length || 0} submissions for task`);
    res.json({
      success: true,
      task: { id: task.id, title: task.title },
      submissions: processedSubmissions,
      count: submissions?.length || 0
    });

  } catch (error) {
    console.error('Error getting task submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/tasks/:taskId/latest-status - Get latest status for a task
router.get('/tasks/:taskId/latest-status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;

    console.log('📊 Getting latest status for task:', taskId);

    // First verify the task exists and get basic info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, assigned_to, assigned_by')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('❌ Task not found:', taskError);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify the requesting user is either the assignee or the assigner
    if (task.assigned_to !== student_id && task.assigned_by !== student_id) {
      return res.status(403).json({ error: 'Not authorized to view this task status' });
    }

    // Strategy: Check for latest status in this priority:
    // 1. Latest revision_submission (if exists)
    // 2. Latest task_submission (if no revision)
    // 3. Task status (if no submissions at all)

    // Check for latest revision submission
    const { data: latestRevision, error: revisionError } = await supabase
      .from('revision_submissions')
      .select('status, submitted_at, revision_attempt_number')
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRevision) {
      console.log('✅ Latest status from revision_submission:', latestRevision.status);
      return res.json({
        success: true,
        status: latestRevision.status,
        source: 'revision_submission',
        submitted_at: latestRevision.submitted_at,
        revision_attempt: latestRevision.revision_attempt_number
      });
    }

    // Check for latest task submission (original submission)
    const { data: latestSubmission, error: submissionError } = await supabase
      .from('task_submissions')
      .select('status, submission_date, attempt_number')
      .eq('task_id', taskId)
      .order('submission_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSubmission) {
      console.log('✅ Latest status from task_submission:', latestSubmission.status);
      return res.json({
        success: true,
        status: latestSubmission.status,
        source: 'task_submission',
        submitted_at: latestSubmission.submission_date,
        attempt_number: latestSubmission.attempt_number
      });
    }

    // No submissions found, return task status
    console.log('✅ No submissions found, using task status:', task.status);
    return res.json({
      success: true,
      status: task.status || 'pending',
      source: 'task',
      submitted_at: null
    });

  } catch (error) {
    console.error('❌ Error getting latest task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/student-leader/tasks/:taskId - Update a task
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    const {
      title,
      description,
      due_date,
      available_until,
      max_attempts,
      file_types_allowed,
      has_existing_submissions
    } = req.body;
    
    console.log('✏️ Updating task:', taskId, 'by leader:', student_id);
    
    // Verify the task belongs to this leader
    const { data: existingTask, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id, 
        assigned_by, 
        assigned_to, 
        title, 
        project_id,
        phase_id,
        project_phases(
          id,
          end_date,
          title
        ),
        studentaccounts!tasks_assigned_to_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', taskId)
      .eq('assigned_by', student_id)
      .single();
    
    if (taskError || !existingTask) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Check if the phase has ended
    const phaseEndDate = new Date(existingTask.project_phases.end_date);
    const now = new Date();

    if (now > phaseEndDate) {
      return res.status(400).json({ 
        error: 'Cannot modify task - phase has ended',
        phase_title: existingTask.project_phases.title,
        phase_end_date: existingTask.project_phases.end_date
      });
    }

    // Update the task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        due_date,
        available_until,
        max_attempts,
        file_types_allowed,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating task:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // If task has existing submissions, create a notification for the assigned member
    if (has_existing_submissions) {
      try {
        // Create notification
        const notificationData = {
          user_id: existingTask.assigned_to,
          type: 'task_updated',
          title: 'Task Updated',
          message: `The task "${title}" has been updated by your group leader. Please review the changes.`,
          data: JSON.stringify({
            task_id: taskId,
            task_title: title,
            project_id: existingTask.project_id,
            updated_by: student_id,
            has_submissions: true
          }),
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.warn('⚠️ Warning: Could not create notification:', notificationError);
        } else {
          console.log('✅ Notification sent to member about task update');
        }

      } catch (notificationErr) {
        console.warn('⚠️ Warning: Notification error:', notificationErr);
      }
    }

    console.log('✅ Task updated successfully:', updatedTask.id);
    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
      notification_sent: has_existing_submissions
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/student-leader/tasks/:taskId - Delete a task (soft delete)
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    
    console.log('🗑️ Deleting task:', taskId, 'by leader:', student_id);
    
    // Verify the task belongs to this leader
    const { data: existingTask, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id, 
        assigned_by, 
        assigned_to, 
        title,
        phase_id,
        project_phases(
          id,
          end_date,
          title
        )
      `)
      .eq('id', taskId)
      .eq('assigned_by', student_id)
      .single();

    if (taskError || !existingTask) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Check if the phase has ended
    const phaseEndDate = new Date(existingTask.project_phases.end_date);
    const now = new Date();

    if (now > phaseEndDate) {
      return res.status(400).json({ 
        error: 'Cannot delete task - phase has ended',
        phase_title: existingTask.project_phases.title,
        phase_end_date: existingTask.project_phases.end_date
      });
    }    // Check if task has submissions
    const { data: submissions, error: submissionError } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId);

    // Delete all revision submissions first (to avoid FK constraint issues)
    if (submissions && submissions.length > 0) {
      console.log(`🗑️ Deleting ${submissions.length} submissions and their revisions...`);
      
      // Delete revision submissions
      const { error: revisionDeleteError } = await supabase
        .from('revision_submissions')
        .delete()
        .eq('task_id', taskId);

      if (revisionDeleteError) {
        console.error('❌ Error deleting revision submissions:', revisionDeleteError);
        // Continue anyway - might not have revisions
      }

      // Delete task submissions
      const { error: submissionDeleteError } = await supabase
        .from('task_submissions')
        .delete()
        .eq('task_id', taskId);

      if (submissionDeleteError) {
        console.error('❌ Error deleting task submissions:', submissionDeleteError);
        return res.status(500).json({ error: 'Failed to delete task submissions' });
      }

      console.log('✅ Deleted all submissions and revisions');
    }

    // Soft delete the task
    const { error: deleteError } = await supabase
      .from('tasks')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (deleteError) {
      console.error('❌ Error deleting task:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    console.log('✅ Task deleted successfully:', taskId);
    res.json({
      success: true,
      message: 'Task and all related submissions deleted successfully',
      deleted_submissions: submissions?.length || 0
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/student-leader/member-submissions/:projectId/:memberId - Get detailed member submissions
router.get('/member-submissions/:projectId/:memberId', async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const leader_id = req.user.id;
    
    console.log('📋 Getting member submissions - Project:', projectId, 'Member:', memberId, 'Leader:', leader_id);
    
    // Verify leader permissions
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Verify the member is in the same group
    const { data: memberMembership, error: memberError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('student_id', memberId)
      .eq('group_id', leaderMembership.group_id)
      .eq('is_active', true)
      .single();
    
    if (memberError || !memberMembership) {
      return res.status(400).json({ error: 'Member not found in your group' });
    }
    
    // Get all tasks assigned to this member for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        max_attempts,
        file_types_allowed,
        status,
        created_at,
        project_phases(phase_number, title, start_date, end_date)
      `)
      .eq('project_id', projectId)
      .eq('assigned_to', memberId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }
    
    const taskIds = (tasks || []).map(t => t.id);
    
    if (taskIds.length === 0) {
      return res.json({
        success: true,
        member_id: memberId,
        tasks: []
      });
    }
    
    // Get original submissions for all tasks
    const { data: originalSubmissions, error: origError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submission_text,
        file_urls,
        status,
        submission_date,
        created_at
      `)
      .in('task_id', taskIdsForQuery)
      .eq('submitted_by', memberId)
      .order('created_at', { ascending: false });
    
    if (origError) {
      console.error('Error fetching original submissions:', origError);
    }
    
    // Get revision submissions for all tasks
    const { data: revisionSubmissions, error: revError } = await supabase
      .from('revision_submissions')
      .select(`
        id,
        task_id,
        original_submission_id,
        revision_attempt_number,
        submission_text,
        file_paths,
        status,
        submitted_at,
        review_comments,
        reviewed_at,
        created_at
      `)
      .in('task_id', taskIdsForQuery)
      .eq('submitted_by', memberId)
      .order('created_at', { ascending: false });
    
    if (revError) {
      console.error('Error fetching revision submissions:', revError);
    }
    
    // Get feedback for all submissions (both original and revisions)
    const allOriginalIds = (originalSubmissions || []).map(s => s.id);
    const allRevisionIds = (revisionSubmissions || []).map(s => s.id);

    // Get feedback for original submissions
    const { data: originalFeedbacks, error: origFeedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        submission_id,
        revision_submission_id,
        submission_type,
        feedback_by,
        feedback_text,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, profile_image_url)
      `)
      .in('submission_id', allOriginalIds)
      .eq('submission_type', 'original')
      .order('created_at', { ascending: true });

    // Get feedback for revision submissions
    const { data: revisionFeedbacks, error: revFeedbackError } = await supabase
      .from('task_feedback')
      .select(`
        id,
        submission_id,
        revision_submission_id,
        submission_type,
        feedback_by,
        feedback_text,
        created_at,
        studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, profile_image_url)
      `)
      .in('revision_submission_id', allRevisionIds)
      .eq('submission_type', 'revision')
      .order('created_at', { ascending: true });

    const feedbacks = [
      ...(originalFeedbacks || []),
      ...(revisionFeedbacks || [])
    ];

    if (origFeedbackError) {
      console.warn('Error fetching original feedback:', origFeedbackError);
    }
    if (revFeedbackError) {
      console.warn('Error fetching revision feedback:', revFeedbackError);
    }    // Organize data by task with submission attempts
    const tasksWithSubmissions = (tasks || []).map(task => {
      const taskOriginalSubmissions = (originalSubmissions || []).filter(s => s.task_id === task.id);
      const taskRevisionSubmissions = (revisionSubmissions || []).filter(s => s.task_id === task.id);
      
      // Group submissions by attempt number
      const attempts = [];
      
      taskOriginalSubmissions.forEach((submission, index) => {
        const attemptNumber = index + 1;
        const relatedRevisions = taskRevisionSubmissions.filter(r => r.original_submission_id === submission.id);
        
        const submissionFeedback = (feedbacks || []).filter(f => 
          f.submission_type === 'original' && f.submission_id === submission.id
        );
        
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
        
        const attempt = {
          attempt_number: attemptNumber,
          original_submission: {
            id: submission.id,
            submission_text: submission.submission_text,
            file_paths: fileUrls,
            file_urls: Array.isArray(fileUrls) 
              ? fileUrls.map(path => `/api/files/task-submissions/${path}`)
              : [],
            status: submission.status,
            submitted_at: submission.submission_date,
            feedback: submissionFeedback.map(f => ({
              ...f,
              author_name: `${f.studentaccounts.first_name} ${f.studentaccounts.last_name}`,
              author_profile_image: f.studentaccounts.profile_image_url
                ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${f.studentaccounts.profile_image_url}`
                : null
            }))
          },
          revisions: relatedRevisions.map(revision => {
            const revisionFeedback = (feedbacks || []).filter(f => 
              f.submission_type === 'revision' && f.revision_submission_id === revision.id
            );
      
      return {
              id: revision.id,
              revision_number: revision.revision_attempt_number,
              submission_text: revision.submission_text,
              file_paths: revision.file_paths,
              file_urls: revision.file_paths?.map(path => `/api/files/task-submissions/${path}`) || [],
              status: revision.status,
              submitted_at: revision.submitted_at,
              review_comments: revision.review_comments,
              reviewed_at: revision.reviewed_at,
              feedback: revisionFeedback.map(f => ({
                ...f,
                author_name: `${f.studentaccounts.first_name} ${f.studentaccounts.last_name}`,
                author_profile_image: f.studentaccounts.profile_image_url
                  ? `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${f.studentaccounts.profile_image_url}`
                  : null
              }))
            };
          }).sort((a, b) => a.revision_number - b.revision_number)
        };
        
        attempts.push(attempt);
      });
      
      // Determine current submission status
      let currentSubmissionStatus = 'not_submitted';
      let latestSubmission = null;
      
      if (attempts.length > 0) {
        const lastAttempt = attempts[attempts.length - 1];
        const lastRevision = lastAttempt.revisions[lastAttempt.revisions.length - 1];
        
        if (lastRevision) {
          latestSubmission = lastRevision;
          currentSubmissionStatus = lastRevision.status;
        } else {
          latestSubmission = lastAttempt.original_submission;
          currentSubmissionStatus = lastAttempt.original_submission.status;
        }
      }
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        max_attempts: task.max_attempts,
        file_types_allowed: task.file_types_allowed,
        task_status: task.status,
        phase_info: task.project_phases,
        current_submission_status: currentSubmissionStatus,
        total_attempts: attempts.length,
        latest_submission: latestSubmission,
        attempts: attempts
      };
    });
    
    res.json({
      success: true,
      member_id: memberId,
      tasks: tasksWithSubmissions
    });
    
  } catch (error) {
    console.error('Error fetching member submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/submissions/:submissionId/approve - Approve a submission
router.post('/submissions/:submissionId/approve', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, submission_type = 'original' } = req.body;
    const leader_id = req.user.id;
    
    console.log('✅ Approving submission:', submissionId, 'type:', submission_type, 'by leader:', leader_id);
    
    // Verify leader permissions
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    const submissionTable = submission_type === 'revision' ? 'revision_submissions' : 'task_submissions';
    
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from(submissionTable)
      .select('id, task_id, submitted_by')
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Verify the submitter is in leader's group
    const { data: memberMembership, error: memberError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('student_id', submission.submitted_by)
      .eq('group_id', leaderMembership.group_id)
      .eq('is_active', true)
      .single();
    
    if (memberError || !memberMembership) {
      return res.status(403).json({ error: 'Cannot approve submission from member not in your group' });
    }
    
    // Update submission status to approved
    const { error: updateError } = await supabase
      .from(submissionTable)
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: leader_id,
        review_comments: feedback || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);
    
    if (updateError) {
      console.error('Error updating submission:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    // Update task status to completed
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submission.task_id);
    
    if (taskUpdateError) {
      console.error('Error updating task status:', taskUpdateError);
    }
    
    // Add feedback if provided
    if (feedback) {
      const feedbackData = {
        feedback_by: leader_id,
        feedback_text: feedback,
        submission_type: submission_type,
        created_at: new Date().toISOString()
      };

      // Set the correct foreign key based on submission type
      if (submission_type === 'revision') {
        feedbackData.revision_submission_id = submissionId;
        feedbackData.submission_id = null;
      } else {
        feedbackData.submission_id = submissionId;
        feedbackData.revision_submission_id = null;
      }

      const { error: feedbackError } = await supabase
        .from('task_feedback')
        .insert(feedbackData);
      
      if (feedbackError) {
        console.warn('Error adding feedback:', feedbackError);
      }
    }
    
    console.log('✅ Submission approved successfully');
    res.json({
      success: true,
      message: 'Submission approved successfully'
    });
    
  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/submissions/:submissionId/request-revision - Request revision
router.post('/submissions/:submissionId/request-revision', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, submission_type = 'original' } = req.body;
    const leader_id = req.user.id;
    
    console.log('🔄 Requesting revision for submission:', submissionId, 'type:', submission_type, 'by leader:', leader_id);
    
    if (!feedback || feedback.trim() === '') {
      return res.status(400).json({ error: 'Feedback is required when requesting revision' });
    }
    
    // Verify leader permissions
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    const submissionTable = submission_type === 'revision' ? 'revision_submissions' : 'task_submissions';
    
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from(submissionTable)
      .select('id, task_id, submitted_by')
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Verify the submitter is in leader's group
    const { data: memberMembership, error: memberError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('student_id', submission.submitted_by)
      .eq('group_id', leaderMembership.group_id)
      .eq('is_active', true)
      .single();
    
    if (memberError || !memberMembership) {
      return res.status(403).json({ error: 'Cannot request revision from member not in your group' });
    }
    
    // Update submission status to revision_requested
    const { error: updateError } = await supabase
      .from(submissionTable)
      .update({
        status: 'revision_requested',
        reviewed_at: new Date().toISOString(),
        reviewed_by: leader_id,
        review_comments: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);
    
    if (updateError) {
      console.error('Error updating submission:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    
    // Update task status to to_revise
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        status: 'to_revise',
        updated_at: new Date().toISOString()
      })
      .eq('id', submission.task_id);
    
    if (taskUpdateError) {
      console.error('Error updating task status:', taskUpdateError);
    }
    
    // Add feedback using the correct submission reference based on type
    const feedbackData = {
      submission_type: submission_type === 'revision' ? 'revision_submission' : 'task_submission',
      feedback_by: leader_id,
      feedback_text: feedback,
      created_at: new Date().toISOString()
    };
    
    // Set the appropriate submission reference
    if (submission_type === 'revision') {
      feedbackData.revision_submission_id = submissionId;
      feedbackData.submission_id = null;
    } else {
      feedbackData.submission_id = submissionId;
      feedbackData.revision_submission_id = null;
    }
    
    const { error: feedbackError } = await supabase
      .from('task_feedback')
      .insert(feedbackData);
    
    if (feedbackError) {
      console.warn('Error adding feedback:', feedbackError);
    }
    
    console.log('✅ Revision requested successfully');
    res.json({
      success: true,
      message: 'Revision requested successfully'
    });
    
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student-leader/phase-submissions - Create or update phase submission
router.post('/phase-submissions', async (req, res) => {
  try {
    const { phase_id, submission_text, file_urls } = req.body;
    const submitted_by = req.user.id;
    
    console.log('📝 Creating/updating phase submission for phase:', phase_id, 'by leader:', submitted_by);
    console.log('🔍 [PHASE-SUBMISSIONS DEBUG] Request body:', {
      phase_id,
      submission_text,
      file_urls,
      file_urls_type: typeof file_urls,
      file_urls_length: Array.isArray(file_urls) ? file_urls.length : 'not array'
    });
    
    // Verify leader has access and get their group
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', submitted_by)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    console.log('👥 Leader group ID:', leaderMembership.group_id);
    
    // Check if submission already exists
    const { data: existingSubmission, error: existingError } = await supabase
      .from('phase_submissions')
      .select('*')
      .eq('phase_id', phase_id)
      .eq('group_id', leaderMembership.group_id)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log('🔍 [PHASE-SUBMISSIONS DEBUG] Existing submission check:', {
      found: !!existingSubmission,
      error: existingError?.message,
      existing_file_urls: existingSubmission?.file_urls,
      existing_file_urls_type: typeof existingSubmission?.file_urls,
      existing_attempt: existingSubmission?.attempt_number
    });
    
    let result;
    if (existingSubmission) {
      // Check if we already have valid file URLs and incoming request has null/empty file URLs
      const hasValidFileUrls = file_urls && Array.isArray(file_urls) && 
                              file_urls.some(url => url !== null && url !== undefined && url !== '');
      const hasExistingFiles = existingSubmission.file_urls && 
                              existingSubmission.file_urls !== 'null' &&
                              existingSubmission.file_urls !== '[]';
      
      // If existing submission has files and incoming request has null/empty files, 
      // this is likely a duplicate call from frontend after files were already uploaded
      if (hasExistingFiles && !hasValidFileUrls) {
        console.log('🚨 [PHASE-SUBMISSIONS DEBUG] Preventing duplicate submission - files already uploaded');
        console.log('🔒 [PHASE-SUBMISSIONS DEBUG] Existing files:', existingSubmission.file_urls);
        console.log('🔒 [PHASE-SUBMISSIONS DEBUG] Incoming files:', file_urls);
        
        // Return the existing submission without creating a duplicate
        return res.json({
          success: true,
          submission: existingSubmission,
          action: 'no_change',
          message: 'Files already uploaded, no changes needed'
        });
      }
      
      // IMPORTANT: Don't overwrite existing file URLs with null/empty values!
      let fileUrlsToSave;
      
      if (hasValidFileUrls) {
        // Only update if we have valid file URLs
        fileUrlsToSave = JSON.stringify(file_urls.filter(url => url !== null && url !== undefined && url !== ''));
        console.log('📁 [PHASE-SUBMISSIONS DEBUG] Using new file URLs:', fileUrlsToSave);
      } else {
        // Keep existing file URLs if new ones are invalid
        fileUrlsToSave = existingSubmission.file_urls;
        console.log('🔒 [PHASE-SUBMISSIONS DEBUG] Preserving existing file URLs:', fileUrlsToSave);
      }
      
      console.log('🚨 [PHASE-SUBMISSIONS DEBUG] UPDATE PATH - About to update with:', {
        original_file_urls: existingSubmission.file_urls,
        new_file_urls: file_urls,
        hasValidFileUrls: hasValidFileUrls,
        final_file_urls_to_save: fileUrlsToSave,
        will_preserve_existing: !hasValidFileUrls
      });
      
      // Update existing submission
      const { data: updateResult, error: updateError } = await supabase
        .from('phase_submissions')
        .update({
          submission_text,
          file_urls: fileUrlsToSave,
          submission_date: new Date().toISOString(),
          grade: null, // Reset grade when resubmitting
          status: 'submitted'
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating phase submission:', updateError);
        return res.status(500).json({ error: updateError.message });
      }
      
      result = updateResult;
      console.log('✅ Phase submission updated successfully');
      console.log('🔍 [PHASE-SUBMISSIONS DEBUG] Updated result file_urls:', result.file_urls);
    } else {
      console.log('➕ [PHASE-SUBMISSIONS DEBUG] CREATE PATH - Creating new submission');
      // Create new submission
      const { data: createResult, error: createError } = await supabase
        .from('phase_submissions')
        .insert({
          phase_id,
          group_id: leaderMembership.group_id,
          submitted_by,
          submission_text,
          file_urls: JSON.stringify(file_urls || []),
          submission_date: new Date().toISOString(),
          status: 'submitted',
          is_late: false // Phase submissions don't have due dates, so always false
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating phase submission:', createError);
        return res.status(500).json({ error: createError.message });
      }
      
      result = createResult;
      console.log('✅ Phase submission created successfully');
    }

    // 🔒 CAPTURE/FREEZE MEMBER TASK SUBMISSIONS AT MOMENT OF PHASE SUBMISSION
    console.log('🔒 Capturing member task submissions for phase:', phase_id);
    await captureTaskSubmissionsForPhase(phase_id, leaderMembership.group_id, submitted_by);

    res.json({
      success: true,
      submission: result,
      action: existingSubmission ? 'updated' : 'created'
    });

  } catch (error) {
    console.error('Error handling phase submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔒 HELPER FUNCTION: Capture/freeze member task submissions when leader submits phase
async function captureTaskSubmissionsForPhase(phaseId, groupId, leaderId) {
  try {
    console.log('🔍 [FREEZE] Starting task submission capture for phase:', phaseId, 'group:', groupId);
    
    // Get all group members (excluding leader for now, but we can include them if needed)
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        role,
        studentaccounts(
          id,
          first_name,
          last_name,
          student_number
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);
      
    if (membersError) {
      console.error('❌ [FREEZE] Error getting group members:', membersError);
      return;
    }
    
    console.log('👥 [FREEZE] Found', groupMembers?.length || 0, 'group members');
    
    // Get all tasks for this phase
    const { data: phaseTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, description')
      .eq('phase_id', phaseId);
      
    if (tasksError) {
      console.error('❌ [FREEZE] Error getting phase tasks:', tasksError);
      return;
    }
    
    console.log('📋 [FREEZE] Found', phaseTasks?.length || 0, 'tasks for phase');
    
    // For each task assigned to group members, capture their latest submission
    for (const task of phaseTasks || []) {
      const assignedMember = groupMembers?.find(member => 
        member.student_id === task.assigned_to
      );
      
      if (!assignedMember) {
        console.log(`⚠️ [FREEZE] Task ${task.title} assigned to someone outside group`);
        continue;
      }
      
      console.log(`🎯 [FREEZE] Capturing submissions for task: ${task.title} (assigned to: ${assignedMember.studentaccounts.first_name})`);
      
      // COMPREHENSIVE LOGIC: Check BOTH task_submissions AND revision_submissions
      // PRIORITY: 1. Approved revisions, 2. Approved original, 3. Latest revision, 4. Latest original, 5. Assigned no submission
      
      // Get ALL original task submissions for this task by this member
      const { data: originalSubmissions, error: originalError } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      // Get ALL revision submissions for this task by this member  
      const { data: revisionSubmissions, error: revisionError } = await supabase
        .from('revision_submissions')
        .select('*')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      if (originalError) {
        console.error('❌ [FREEZE] Error getting original submissions:', originalError);
        continue;
      }
      
      if (revisionError) {
        console.error('❌ [FREEZE] Error getting revision submissions:', revisionError);
        continue;
      }
      
      let selectedSubmission = null;
      let submissionType = 'no_submission';
      let isRevision = false;
      
      console.log(`📊 [FREEZE] Found ${originalSubmissions?.length || 0} original + ${revisionSubmissions?.length || 0} revision submissions`);
      
      // PRIORITY 1: Look for approved revision submissions first (most recent work)
      if (revisionSubmissions && revisionSubmissions.length > 0) {
        const approvedRevision = revisionSubmissions.find(rev => rev.status === 'approved');
        
        if (approvedRevision) {
          selectedSubmission = approvedRevision;
          submissionType = 'approved_revision';
          isRevision = true;
          console.log(`✅ [FREEZE] Found APPROVED REVISION for ${task.title}`);
        } else {
          // PRIORITY 3: Use latest revision (any status) if no approved revision
          selectedSubmission = revisionSubmissions[0]; // Already ordered by latest
          submissionType = 'latest_revision';
          isRevision = true;
          console.log(`📋 [FREEZE] Using LATEST REVISION for ${task.title} (status: ${selectedSubmission.status})`);
        }
      }
      
      // PRIORITY 2 & 4: Check original submissions if no revision found or no approved revision
      if (!selectedSubmission || submissionType === 'latest_revision') {
        if (originalSubmissions && originalSubmissions.length > 0) {
          const approvedOriginal = originalSubmissions.find(orig => orig.status === 'approved');
          
          if (approvedOriginal && submissionType !== 'latest_revision') {
            // Only use approved original if we don't already have a revision
            selectedSubmission = approvedOriginal;
            submissionType = 'approved_original';
            isRevision = false;
            console.log(`✅ [FREEZE] Found APPROVED ORIGINAL for ${task.title}`);
          } else if (!selectedSubmission) {
            // Use latest original if no revision at all
            selectedSubmission = originalSubmissions[0];
            submissionType = 'latest_original';
            isRevision = false;
            console.log(`📋 [FREEZE] Using LATEST ORIGINAL for ${task.title} (status: ${selectedSubmission.status})`);
          }
        }
      }
      
      // PRIORITY 5: Task is assigned but no submission exists
      if (!selectedSubmission) {
        console.log(`📝 [FREEZE] No submission found for ASSIGNED task: ${task.title}`);
        submissionType = 'assigned_no_submission';
      }
      // Create frozen version of this submission with proper type labeling
      await createFrozenSubmission(task, assignedMember.student_id, selectedSubmission, phaseId, groupId, leaderId, submissionType, isRevision);
    }
    
    console.log('✅ [FREEZE] Task submission capture completed');
    
  } catch (error) {
    console.error('❌ [FREEZE] Error in captureTaskSubmissionsForPhase:', error);
  }
}

// 🏁 Capture ALL task submissions from ALL phases for Project Completion
async function captureAllTaskSubmissionsForProject(projectId, groupId, leaderId) {
  try {
    console.log('🔍 [PROJECT-FREEZE] Starting comprehensive task submission capture for project:', projectId);
    
    // Get ALL phases for this project
    const { data: projectPhases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title, start_date, end_date')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });
      
    if (phasesError) {
      console.error('❌ [PROJECT-FREEZE] Error getting project phases:', phasesError);
      return;
    }
    
    console.log('📋 [PROJECT-FREEZE] Found', projectPhases?.length || 0, 'phases to process');
    
    // For each phase, capture all task submissions
    for (const phase of projectPhases || []) {
      console.log(`🔒 [PROJECT-FREEZE] Processing Phase ${phase.phase_number}: ${phase.title}`);
      await captureTaskSubmissionsForPhase(phase.id, groupId, leaderId);
    }
    
    console.log('✅ [PROJECT-FREEZE] Comprehensive task submission capture completed for all phases');
    
  } catch (error) {
    console.error('❌ [PROJECT-FREEZE] Error in captureAllTaskSubmissionsForProject:', error);
  }
}

// 📸 Create a frozen snapshot of a task submission (original or revision)
async function createFrozenSubmission(task, studentId, originalSubmission, phaseId, groupId, leaderId, submissionType = 'no_submission', isRevision = false) {
  try {
    // Determine the display status and data based on submission type and whether it's a revision
    let displayStatus, submissionText, fileUrls, submittedAt;
    let originalSubmissionId = null;
    
    switch(submissionType) {
      case 'approved_revision':
        displayStatus = 'approved';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_paths ? JSON.stringify(originalSubmission.file_paths) : '[]';
        submittedAt = originalSubmission?.submitted_at || originalSubmission?.created_at || null;
        originalSubmissionId = originalSubmission?.original_submission_id || null; // FK to task_submissions
        break;
        
      case 'approved_original':
        displayStatus = 'approved';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_urls || '[]'; // Original submissions use file_urls
        submittedAt = originalSubmission?.submission_date || originalSubmission?.created_at || null;
        originalSubmissionId = originalSubmission?.id || null; // Direct reference to task_submissions
        break;
        
      case 'latest_revision':
        displayStatus = originalSubmission?.status || 'pending';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_paths ? JSON.stringify(originalSubmission.file_paths) : '[]';
        submittedAt = originalSubmission?.submitted_at || originalSubmission?.created_at || null;
        originalSubmissionId = originalSubmission?.original_submission_id || null; // FK to task_submissions
        break;
        
      case 'latest_original':
        displayStatus = originalSubmission?.status || 'pending';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_urls || '[]'; // Original submissions use file_urls
        submittedAt = originalSubmission?.submission_date || originalSubmission?.created_at || null;
        originalSubmissionId = originalSubmission?.id || null; // Direct reference to task_submissions
        break;
        
      case 'assigned_no_submission':
        displayStatus = 'no_submission';
        submissionText = 'Task was assigned but no submission was made';
        fileUrls = '[]';
        submittedAt = null;
        originalSubmissionId = null;
        break;
        
      default:
        displayStatus = 'no_submission';
        submissionText = 'No task assigned or submitted';
        fileUrls = '[]';
        submittedAt = null;
        originalSubmissionId = null;
    }
    
    const frozenData = {
      task_id: task.id,
      phase_id: phaseId,
      group_id: groupId,
      student_id: studentId,
      original_submission_id: originalSubmissionId, // Now correctly handles FK constraints
      task_title: task.title,
      task_description: task.description,
      submission_text: submissionText,
      file_urls: fileUrls, // Store normalized as file_urls regardless of source
      original_status: displayStatus,
      original_submitted_at: submittedAt,
      frozen_at: new Date().toISOString(),
      frozen_by_leader: leaderId,
      attempt_number: isRevision ? originalSubmission?.revision_attempt_number || 0 : originalSubmission?.attempt_number || 0
      // NOTE: Removed submission_type and is_revision_based for current schema compatibility
    };
    
    console.log(`📸 [FREEZE] Creating frozen submission for ${task.title}:`, {
      student_id: studentId,
      submission_type: submissionType,
      status: displayStatus,
      has_original: !!originalSubmission,
      is_revision_based: isRevision
    });
    
    // Check if we already have a frozen version for this phase/task/student combination
    const { data: existingFrozen, error: existingError } = await supabase
      .from('frozen_task_submissions')
      .select('id')
      .eq('phase_id', phaseId)
      .eq('task_id', task.id)
      .eq('student_id', studentId)
      .eq('group_id', groupId)
      .maybeSingle();
      
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ [FREEZE] Error checking existing frozen submission:', existingError);
      return;
    }
    
    if (existingFrozen) {
      // Update existing frozen submission
      console.log('🔄 [FREEZE] Updating existing frozen submission');
      const { error: updateError } = await supabase
        .from('frozen_task_submissions')
        .update(frozenData)
        .eq('id', existingFrozen.id);
        
      if (updateError) {
        console.error('❌ [FREEZE] Error updating frozen submission:', updateError);
      } else {
        console.log('✅ [FREEZE] Frozen submission updated');
      }
    } else {
      // Create new frozen submission
      console.log('➕ [FREEZE] Creating new frozen submission');
      const { error: createError } = await supabase
        .from('frozen_task_submissions')
        .insert(frozenData);
        
      if (createError) {
        console.error('❌ [FREEZE] Error creating frozen submission:', createError);
        // If the table doesn't exist, we'll create it
        if (createError.code === '42P01') {
          console.log('📝 [FREEZE] frozen_task_submissions table needs to be created');
        }
      } else {
        console.log('✅ [FREEZE] Frozen submission created');
      }
    }
    
  } catch (error) {
    console.error('❌ [FREEZE] Error in createFrozenSubmission:', error);
  }
}

// POST /api/student-leader/upload-phase-file - Upload single or multiple files for phase submission
router.post('/upload-phase-file', upload.fields([
  { name: 'file', maxCount: 1 },      // For single file upload (backward compatibility)
  { name: 'files', maxCount: 10 }     // For multiple file upload  
]), async (req, res) => {
  try {
    const { phaseId } = req.body;
    const leader_id = req.user.id;
    
    console.log('=== PHASE FILE UPLOAD DEBUG START ===');
    console.log('📎 Phase ID:', phaseId);
    
    // Check if this is a project completion submission
    if (phaseId && phaseId.toString().startsWith('project-completion-')) {
      console.log('🏁 Detected project completion submission, handling differently...');
      const projectId = phaseId.toString().replace('project-completion-', '');
      
      // Handle both single and multiple file uploads
      let files = [];
      if (req.files.file) files = req.files.file;           // Single file upload
      if (req.files.files) files = [...files, ...req.files.files]; // Multiple files upload
      
      console.log('👤 Leader ID:', leader_id);
      console.log('📁 Files received:', files ? files.length : 0);
      console.log('🏁 Project ID extracted:', projectId);
      
      if (!files || files.length === 0) {
        console.log('❌ No files provided');
        return res.status(400).json({ error: 'No files provided' });
      }

      // Verify user is a leader
      const { data: leaderCheck, error: leaderError } = await supabase
        .from('course_group_members')
        .select('group_id, role')
        .eq('student_id', leader_id)
        .eq('role', 'leader')
        .eq('is_active', true);

      if (leaderError || !leaderCheck || leaderCheck.length === 0) {
        console.log('❌ User is not a leader of any group');
        return res.status(403).json({ error: 'Access denied - must be group leader' });
      }

      const groupId = leaderCheck[0].group_id;
      console.log('🏢 Using Group ID:', groupId);

      // Upload files to Supabase Storage for project completion
      const uploadedFiles = [];
      const timestamp = Date.now();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${timestamp}-${i + 1}-${file.originalname}`;
        const filePath = `project-completion/${projectId}/${groupId}/${fileName}`;
        
        console.log(`📤 Uploading project completion file ${i + 1}/${files.length}: ${fileName}`);
        
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-submissions')
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              duplex: 'half'
            });
          
          if (uploadError) {
            console.error(`❌ Upload failed for file ${fileName}:`, uploadError);
            throw new Error(`Failed to upload ${file.originalname}: ${uploadError.message}`);
          }
          
          // Get the public URL for the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('task-submissions')
            .getPublicUrl(filePath);
          
          uploadedFiles.push({
            originalName: file.originalname,
            fileName: fileName,
            filePath: filePath,
            url: publicUrl,
            size: file.size,
            mimetype: file.mimetype
          });
          
          console.log(`✅ Project completion file ${i + 1} uploaded successfully: ${fileName}`);
          
        } catch (uploadError) {
          console.error(`❌ File upload error for ${fileName}:`, uploadError);
          throw uploadError;
        }
      }
      
      console.log('✅ All project completion files uploaded successfully');
      console.log('=== PROJECT COMPLETION FILE UPLOAD DEBUG END ===');
      
      return res.json({
        success: true,
        message: `${files.length} file(s) uploaded successfully for project completion`,
        files: uploadedFiles
      });
    }
    
    // Handle both single and multiple file uploads
    let files = [];
    if (req.files.file) files = req.files.file;           // Single file upload
    if (req.files.files) files = [...files, ...req.files.files]; // Multiple files upload
    console.log('👤 Leader ID:', leader_id);
    console.log('📁 Files received:', files ? files.length : 0);
    console.log('📄 File details:', files ? files.map(f => ({
      name: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      extension: f.originalname.split('.').pop()
    })) : []);
    
    if (!files || files.length === 0) {
      console.log('❌ No files provided');
      return res.status(400).json({ error: 'No files provided' });
    }
    
    console.log('🔍 Checking leader access for phase...');
    
    // First verify user is a leader of any group
    const { data: leaderCheck, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true);

    console.log('�‍💼 Leader check result:', { 
      error: leaderError, 
      groupsFound: leaderCheck?.length || 0,
      groups: leaderCheck?.map(g => g.group_id) || []
    });

    if (leaderError || !leaderCheck || leaderCheck.length === 0) {
      console.log('❌ User is not a leader of any group');
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    // Get the group_id for this leader (use first group if multiple)
    const groupId = leaderCheck[0].group_id;
    console.log('🏢 Using Group ID:', groupId);

    // Verify the phase exists and get phase info
    console.log('📋 Fetching phase information...');
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('file_types_allowed, title, project_id, max_attempts, end_date')
      .eq('id', phaseId)
      .single();
      
    console.log('📋 Phase query result:', { error: phaseError, phase: phase });

    if (phaseError || !phase) {
      console.log('❌ Phase not found');
      return res.status(404).json({ error: 'Phase not found' });
    }
    console.log('✅ Phase found:', phase.title);

    // Check if leader can submit based on member task deadlines
    console.log('🕐 Checking if leader can submit based on member task deadlines...');
    const { data: memberTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('due_date, assigned_to')
      .eq('phase_id', phaseId)
      .neq('assigned_to', leader_id); // Exclude leader's own tasks

    if (tasksError) {
      console.error('❌ Error fetching member tasks:', tasksError);
      return res.status(500).json({ error: 'Error checking member task deadlines' });
    }

    const now = new Date();
    if (memberTasks && memberTasks.length > 0) {
      const latestTaskDeadline = new Date(Math.max(...memberTasks.map(task => new Date(task.due_date))));
      console.log('📅 Latest member task deadline:', latestTaskDeadline);
      console.log('📅 Current time:', now);
      
      if (now <= latestTaskDeadline) {
        console.log('❌ Cannot submit: Member tasks are still pending');
        return res.status(403).json({ 
          error: 'Cannot submit phase deliverables until all member task deadlines have passed',
          latest_deadline: latestTaskDeadline.toISOString(),
          message: 'Please wait until all assigned member tasks are due before submitting phase deliverables'
        });
      }
    }
    console.log('✅ All member task deadlines have passed, leader can submit');

    // Check attempt limits
    console.log('🔢 Checking attempt limits...');
    const maxAttempts = phase.max_attempts || 1;
    console.log('📊 Max attempts allowed:', maxAttempts);

    // Get current submission count
    const { data: existingSubmissions, error: countError } = await supabase
      .from('phase_submissions')
      .select('attempt_number')
      .eq('phase_id', phaseId)
      .eq('group_id', groupId)
      .order('attempt_number', { ascending: false });

    if (countError) {
      console.error('❌ Error checking submission count:', countError);
      return res.status(500).json({ error: 'Error checking submission attempts' });
    }

    const currentAttemptCount = existingSubmissions?.length || 0;
    console.log('📊 Current attempts:', currentAttemptCount, 'of', maxAttempts);

    if (currentAttemptCount >= maxAttempts) {
      console.log('❌ Maximum attempts reached');
      return res.status(403).json({ 
        error: 'Maximum submission attempts reached',
        current_attempts: currentAttemptCount,
        max_attempts: maxAttempts,
        message: `You have reached the maximum number of submission attempts (${maxAttempts}) for this phase`
      });
    }

    console.log('✅ Attempts validation passed, proceeding with upload');

    // Parse allowed file types
    let allowedTypes = [];
    if (phase.file_types_allowed) {
      try {
        allowedTypes = Array.isArray(phase.file_types_allowed) 
          ? phase.file_types_allowed 
          : (typeof phase.file_types_allowed === 'string' 
              ? JSON.parse(phase.file_types_allowed) 
              : []);
      } catch (parseError) {
        console.log('⚠️ Error parsing file types, treating as comma-separated:', parseError);
        allowedTypes = phase.file_types_allowed.split(',').map(t => t.trim());
      }
    }
    console.log('📝 Allowed file types:', allowedTypes);

    const uploadedFiles = [];
    console.log('📤 Starting file upload process...');

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      
      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.originalname} (${fileExtension})`);

      // Validate file type if restrictions exist
      if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
        console.log(`❌ File type .${fileExtension} not allowed. Allowed: ${allowedTypes.join(', ')}`);
        return res.status(400).json({ 
          error: `File type .${fileExtension} is not allowed for this phase. Allowed types: ${allowedTypes.join(', ')}` 
        });
      }
      console.log(`✅ File type .${fileExtension} is allowed`);

      // Create unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `phase_${phaseId}_${groupId}_${timestamp}_${randomString}_${file.originalname}`;
      const filePath = `phase-submissions/${fileName}`;
      
      console.log(`🔄 Uploading to storage: ${filePath}`);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-submissions')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          metadata: {
            phase_id: phaseId,
            group_id: groupId,
            uploaded_by: leader_id,
            original_name: file.originalname
          }
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        return res.status(500).json({ error: `Failed to upload ${file.originalname}: ${uploadError.message}` });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-submissions')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        filename: file.originalname,
        url: publicUrl,
        path: filePath,
        size: file.size,
        type: file.mimetype
      });
      
      console.log(`✅ File ${i + 1} uploaded successfully: ${file.originalname}`);
    }

    // Save all uploaded files to the database
    const allFileUrls = uploadedFiles.map(f => f.url);
    console.log('💾 Saving submission to database...');
    console.log('📁 File URLs to save:', allFileUrls);
    console.log('🔍 DEBUG - uploadedFiles structure:', uploadedFiles);
    console.log('🔍 DEBUG - allFileUrls length:', allFileUrls.length);
    console.log('🔍 DEBUG - individual URLs:', allFileUrls.forEach((url, i) => console.log(`  ${i}: ${url}`)));

    // Check if submission already exists (we already validated attempts above)
    console.log('🔍 Final submission creation...');

    // Determine next attempt number (we already validated this is allowed)
    let nextAttemptNumber = 1;
    if (existingSubmissions && existingSubmissions.length > 0) {
      nextAttemptNumber = (existingSubmissions[0].attempt_number || 0) + 1;
    }
    console.log('🔄 Creating attempt number:', nextAttemptNumber, 'of', maxAttempts);

    if (existingSubmissions && existingSubmissions.length > 0) {
      // Create new submission attempt (don't update existing)
      const { error: insertError } = await supabase
        .from('phase_submissions')
        .insert({
          phase_id: phaseId,
          group_id: groupId,
          submitted_by: leader_id,
          file_urls: JSON.stringify(allFileUrls.filter(url => url !== null && url !== undefined)),
          submission_date: new Date().toISOString(),
          status: 'submitted',
          attempt_number: nextAttemptNumber
        });

      if (insertError) {
        console.error('❌ Failed to create new attempt:', insertError);
        return res.status(500).json({ error: 'Failed to save submission to database' });
      }
      console.log('✅ New submission attempt created successfully');

    } else {
      // Create new submission
      console.log('� Creating new submission record...');
      const { error: insertError } = await supabase
        .from('phase_submissions')
        .insert({
          phase_id: phaseId,
          group_id: groupId,
          submitted_by: leader_id,
          file_urls: JSON.stringify(allFileUrls.filter(url => url !== null && url !== undefined)),
          submission_date: new Date().toISOString(),
          status: 'submitted',
          attempt_number: 1
        });

      if (insertError) {
        console.error('❌ Failed to create submission:', insertError);
        return res.status(500).json({ error: 'Failed to save submission to database' });
      }
      console.log('✅ New submission created successfully');
    }
    
    console.log('�🎉 All files uploaded and saved successfully');
    console.log('📊 Upload summary:', {
      totalFiles: uploadedFiles.length,
      files: uploadedFiles.map(f => f.filename)
    });
    console.log('=== PHASE FILE UPLOAD DEBUG END ===');
    
    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
      message: `Successfully uploaded ${uploadedFiles.length} file(s) as attempt ${nextAttemptNumber}/${maxAttempts}`,
      note: "All files stored in one submission record"
    });

  } catch (error) {
    console.error('❌ Error in upload-phase-file endpoint:', error);
    console.log('=== PHASE FILE UPLOAD DEBUG END (ERROR) ===');
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// GET /api/student-leader/phase-attempts/:phaseId - Get all submission attempts for a phase
router.get('/phase-attempts/:phaseId', async (req, res) => {
  try {
    const { phaseId } = req.params;
    const leader_id = req.user.id;

    console.log('📋 Getting phase attempts for phase:', phaseId, 'by leader:', leader_id);

    // Get leader's group
    const { data: leaderGroup, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    if (leaderError || !leaderGroup) {
      console.log('❌ Leader check failed');
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }

    const groupId = leaderGroup.group_id;

    // Get phase info including max attempts
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('max_attempts, title, due_date')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Get all submission attempts for this phase/group
    console.log('🔍 [DEBUG] Querying phase_submissions with:', { phaseId, groupId });
    const { data: attempts, error: attemptsError } = await supabase
      .from('phase_submissions')
      .select(`
        id,
        attempt_number,
        file_urls,
        submission_date,
        status,
        grade,
        feedback,
        is_late
      `)
      .eq('phase_id', phaseId)
      .eq('group_id', groupId)
      .order('attempt_number', { ascending: true });

    console.log('🔍 [DEBUG] Raw attempts query result:', { 
      attempts: attempts?.length || 0, 
      attemptsError,
      data: attempts 
    });

    if (attemptsError) {
      console.error('Error getting attempts:', attemptsError);
      return res.status(500).json({ error: 'Failed to get submission attempts' });
    }

    // Parse file_urls for each attempt
    const attemptsWithFiles = attempts?.map(attempt => ({
      ...attempt,
      file_urls: (() => {
        try {
          if (!attempt.file_urls) return [];
          return Array.isArray(attempt.file_urls) ? 
            attempt.file_urls : 
            JSON.parse(attempt.file_urls);
        } catch (e) {
          console.warn('Failed to parse file_urls for attempt:', attempt.id);
          return [];
        }
      })()
    })) || [];

    const response = {
      success: true,
      phase: {
        id: phaseId,
        title: phase.title,
        due_date: phase.due_date,
        max_attempts: phase.max_attempts
      },
      attempts: attemptsWithFiles,
      summary: {
        total_attempts: attemptsWithFiles.length,
        max_attempts: phase.max_attempts,
        remaining_attempts: phase.max_attempts - attemptsWithFiles.length,
        can_submit_more: attemptsWithFiles.length < phase.max_attempts,
        latest_attempt: attemptsWithFiles.length > 0 ? 
          attemptsWithFiles[attemptsWithFiles.length - 1] : null
      }
    };

    console.log('✅ Retrieved attempts:', {
      phase: phase.title,
      attempts: attemptsWithFiles.length,
      maxAttempts: phase.max_attempts,
      groupId,
      phaseId
    });

    console.log('🔍 [DEBUG] Full response being sent:', response);

    res.json(response);

  } catch (error) {
    console.error('Error in phase-attempts endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student-leader/upload-phase-files - Upload files for phase submission
router.post('/upload-phase-files', upload.array('files', 5), async (req, res) => {
  try {
    const { phaseId, allowedFileTypes } = req.body;
    const leader_id = req.user.id;
    const files = req.files;
    
    console.log('📎 Uploading files for phase:', phaseId, 'by leader:', leader_id);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Verify leader has access
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Get phase info to validate file types
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('file_types_allowed')
      .eq('id', phaseId)
      .single();
      
    if (phaseError || !phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    
    const allowedTypes = Array.isArray(phase.file_types_allowed) 
      ? phase.file_types_allowed 
      : (typeof phase.file_types_allowed === 'string' 
          ? JSON.parse(phase.file_types_allowed) 
          : []);
    
    const uploadedFiles = [];
    const uploadPromises = files.map(async (file) => {
      const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
      
      // Double-check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
        throw new Error(`File type .${fileExtension} is not allowed for this phase`);
      }
      
      // Create unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `phase_${phaseId}_${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `phase-submissions/${filename}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-submissions')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          metadata: {
            phase_id: phaseId,
            group_id: leaderMembership.group_id,
            uploaded_by: leader_id,
            original_name: file.originalname
          }
        });
      
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw new Error(`Failed to upload ${file.originalname}: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-submissions')
        .getPublicUrl(filePath);
      
      return {
        filename: file.originalname,
        url: publicUrl,
        path: filePath,
        size: file.size,
        type: file.mimetype
      };
    });
    
    try {
      const results = await Promise.all(uploadPromises);
      uploadedFiles.push(...results);
      
      console.log('✅ Successfully uploaded', uploadedFiles.length, 'files');
      
      res.json({
        success: true,
        files: uploadedFiles,
        count: uploadedFiles.length
      });
      
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      res.status(500).json({ error: uploadError.message });
    }
    
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get member tasks for a specific phase OR all tasks for project completion
router.get('/member-tasks/:studentId/:phaseId', async (req, res) => {
  try {
    const { studentId, phaseId } = req.params;
    
    console.log(`🔍 [DEBUG] Getting tasks and submissions for student: ${studentId}, phase: ${phaseId}`);
    console.log(`🔍 [DEBUG] Request user:`, req.user);
    
    // Check if this is project completion (not a real phase)
    const isProjectCompletion = phaseId.toString().startsWith('project-completion-');
    
    let tasks = [];
    
    if (isProjectCompletion) {
      // FOR PROJECT COMPLETION: Get ALL tasks from ALL phases of the project
      const projectId = phaseId.toString().replace('project-completion-', '');
      console.log(`🏁 [DEBUG] PROJECT COMPLETION MODE: Getting all tasks for project ${projectId}, student ${studentId}`);
      
      // Get all phases for this project first
      const { data: projectPhases, error: phasesError } = await supabase
        .from('project_phases')
        .select('id, phase_number, title, project_id, start_date, end_date')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: true });
        
      if (phasesError) {
        console.error('❌ Error fetching project phases:', phasesError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch project phases',
          error: phasesError.message 
        });
      }
      
      console.log(`📋 [DEBUG] Found ${projectPhases?.length || 0} phases for project`);
      
      if (projectPhases && projectPhases.length > 0) {
        const phaseIds = projectPhases.map(p => p.id);
        
        // Get ALL tasks assigned to this student across ALL phases of this project
        const { data: allTasks, error: allTasksError } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            due_date,
            phase_id,
            assigned_to,
            assigned_by,
            created_at,
            updated_at,
            phase_info:project_phases(
              id,
              phase_number,
              title
            )
          `)
          .eq('assigned_to', studentId)
          .in('phase_id', phaseIds)
          .order('created_at', { ascending: true });
          
        if (allTasksError) {
          console.error('❌ Error fetching all project tasks:', allTasksError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch project tasks',
            error: allTasksError.message 
          });
        }
        
        tasks = allTasks || [];
        console.log(`✅ [DEBUG] PROJECT COMPLETION: Found ${tasks.length} total tasks across all phases`);
      }
    } else {
      // FOR REGULAR PHASE: Get tasks only for this specific phase
      console.log(`📋 [DEBUG] REGULAR PHASE MODE: Getting tasks for phase ${phaseId}`);
      
      const { data: phaseTasks, error: phaseTasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          phase_id,
          assigned_to,
          assigned_by,
          created_at,
          updated_at
        `)
        .eq('assigned_to', studentId)
        .eq('phase_id', phaseId)
        .order('created_at', { ascending: true });

      if (phaseTasksError) {
        console.error('❌ Error fetching phase tasks:', phaseTasksError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch phase tasks',
          error: phaseTasksError.message 
        });
      }
      
      tasks = phaseTasks || [];
      console.log(`✅ [DEBUG] REGULAR PHASE: Found ${tasks.length} tasks for phase`);
    }

    console.log(`📝 [DEBUG] Total tasks to process: ${tasks?.length || 0}`);

    // For each task, get the BEST submission using priority logic
    const tasksWithSubmissions = await Promise.all(
      (tasks || []).map(async (task) => {
        console.log(`🔍 [DEBUG] Getting submissions for task ID: ${task.id}, student: ${studentId}`);
        
        // APPLY SAME PRIORITY LOGIC AS FREEZE SYSTEM:
        // 1. Approved revisions, 2. Approved originals, 3. Latest revisions, 4. Latest originals, 5. No submission
        
        // Get ALL original task submissions
        const { data: originalSubmissions, error: originalError } = await supabase
          .from('task_submissions')
          .select(`
            id,
            task_id,
            submitted_by,
            submission_text,
            file_urls,
            submission_date,
            is_late,
            attempt_number,
            status,
            reviewed_by,
            reviewed_at,
            review_comments,
            created_at
          `)
          .eq('task_id', task.id)
          .eq('submitted_by', studentId)
          .order('created_at', { ascending: false });

        // Get ALL revision submissions for this task by this student
        const { data: revisionSubmissions, error: revisionError } = await supabase
          .from('revision_submissions')
          .select(`
            id,
            original_submission_id,
            task_id,
            submitted_by,
            revision_attempt_number,
            submission_text,
            file_paths,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            review_comments,
            created_at
          `)
          .eq('task_id', task.id)
          .eq('submitted_by', studentId)
          .order('created_at', { ascending: false });

        if (originalError) {
          console.error(`❌ Error fetching original submissions for task ${task.id}:`, originalError);
        }
        
        if (revisionError) {
          console.error(`❌ Error fetching revision submissions for task ${task.id}:`, revisionError);
        }

        let finalSubmission = null;
        let submissionType = 'no_submission';
        let hasSubmission = false;
        
        console.log(`📊 [DEBUG] Task ${task.id}: ${originalSubmissions?.length || 0} originals, ${revisionSubmissions?.length || 0} revisions`);

        // PRIORITY 1: Approved revision submissions (most important)
        if (revisionSubmissions && revisionSubmissions.length > 0) {
          const approvedRevision = revisionSubmissions.find(rev => rev.status === 'approved');
          
          if (approvedRevision) {
            // Get the original submission to check if it was late
            const originalSubmission = originalSubmissions?.find(sub => sub.id === approvedRevision.original_submission_id);
            const wasOriginallyLate = originalSubmission?.is_late || false;
            
            // Convert revision format to match expected format
            finalSubmission = {
              id: approvedRevision.id,
              task_id: approvedRevision.task_id,
              submitted_by: approvedRevision.submitted_by,
              submission_text: approvedRevision.submission_text || '',
              file_urls: approvedRevision.file_paths ? JSON.stringify(Object.values(approvedRevision.file_paths)) : '[]',
              submission_date: approvedRevision.submitted_at,
              is_late: wasOriginallyLate, // Inherit late status from original submission
              attempt_number: approvedRevision.revision_attempt_number,
              status: approvedRevision.status,
              reviewed_by: approvedRevision.reviewed_by,
              reviewed_at: approvedRevision.reviewed_at,
              review_comments: approvedRevision.review_comments,
              revision_number: approvedRevision.revision_attempt_number
            };
            submissionType = 'approved_revision';
            hasSubmission = true;
            console.log(`✅ [DEBUG] PRIORITY 1: Using approved revision for task ${task.id}`);
          } else {
            // PRIORITY 3: Latest revision (any status)
            const latestRevision = revisionSubmissions[0];
            // Get the original submission to check if it was late
            const originalSubmission = originalSubmissions?.find(sub => sub.id === latestRevision.original_submission_id);
            const wasOriginallyLate = originalSubmission?.is_late || false;
            
            finalSubmission = {
              id: latestRevision.id,
              task_id: latestRevision.task_id,
              submitted_by: latestRevision.submitted_by,
              submission_text: latestRevision.submission_text || '',
              file_urls: latestRevision.file_paths ? JSON.stringify(Object.values(latestRevision.file_paths)) : '[]',
              submission_date: latestRevision.submitted_at,
              is_late: wasOriginallyLate, // Inherit late status from original submission
              attempt_number: latestRevision.revision_attempt_number,
              status: latestRevision.status,
              reviewed_by: latestRevision.reviewed_by,
              reviewed_at: latestRevision.reviewed_at,
              review_comments: latestRevision.review_comments,
              revision_number: latestRevision.revision_attempt_number
            };
            submissionType = 'latest_revision';
            hasSubmission = true;
            console.log(`📋 [DEBUG] PRIORITY 3: Using latest revision for task ${task.id} (status: ${finalSubmission.status})`);
          }
        }

        // PRIORITY 2 & 4: Check original submissions if no approved revision found
        if ((!finalSubmission || submissionType === 'latest_revision') && originalSubmissions && originalSubmissions.length > 0) {
          const approvedOriginal = originalSubmissions.find(orig => orig.status === 'approved');
          
          if (approvedOriginal && submissionType !== 'latest_revision') {
            // PRIORITY 2: Approved original (only if no revision at all)
            finalSubmission = approvedOriginal;
            submissionType = 'approved_original';
            hasSubmission = true;
            console.log(`✅ [DEBUG] PRIORITY 2: Using approved original for task ${task.id}`);
          } else if (!finalSubmission) {
            // PRIORITY 4: Latest original (only if no revisions at all)
            finalSubmission = originalSubmissions[0];
            submissionType = 'latest_original';
            hasSubmission = true;
            console.log(`📋 [DEBUG] PRIORITY 4: Using latest original for task ${task.id} (status: ${finalSubmission.status})`);
          }
        }

        // PRIORITY 5: No submission
        if (!finalSubmission) {
          console.log(`❌ [DEBUG] PRIORITY 5: No submission found for task ${task.id}`);
          submissionType = 'no_submission';
          hasSubmission = false;
        }

        const taskWithSubmission = {
          ...task,
          submission: finalSubmission,
          submissionType,
          hasSubmission
        };

        console.log(`📋 [DEBUG] Final task data with best submission (${submissionType}):`, {
          taskId: task.id,
          taskTitle: task.title,
          submissionType,
          status: finalSubmission?.status || 'none',
          hasSubmission
        });
        
        return taskWithSubmission;
      })
    );

    console.log(`✅ [DEBUG] Final response - ${tasksWithSubmissions.length} tasks with submissions`);
    console.log(`📤 [DEBUG] Sending response:`, JSON.stringify(tasksWithSubmissions, null, 2));
    
    res.json(tasksWithSubmissions || []);

  } catch (error) {
    console.error('❌ [DEBUG] Error in member tasks endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Debug endpoint to check all tasks (no auth for testing)
router.get('/debug-tasks-simple', async (req, res) => {
  try {
    console.log('🐛 [DEBUG] Checking all tasks in database (no auth)...');
    
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        assigned_to,
        assigned_by,
        phase_id,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching all tasks:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🐛 [DEBUG] Found tasks:', allTasks);
    
    // Also check task_submissions
    const { data: submissions, error: submissionError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        student_id,
        file_url,
        status,
        submission_date
      `)
      .order('submission_date', { ascending: false })
      .limit(10);

    if (submissionError) {
      console.error('❌ Error fetching submissions:', submissionError);
    }

    console.log('🐛 [DEBUG] Found submissions:', submissions);

    res.json({
      tasks: allTasks || [],
      submissions: submissions || [],
      taskCount: allTasks?.length || 0,
      submissionCount: submissions?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in debug tasks endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check all tasks
router.get('/debug-tasks', async (req, res) => {
  try {
    console.log('🐛 [DEBUG] Checking all tasks in database...');
    
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching all tasks:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🐛 [DEBUG] Found tasks:', allTasks);
    res.json(allTasks || []);

  } catch (error) {
    console.error('❌ Error in debug tasks endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student-leader/download-file - Download submitted files
router.get('/download-file', async (req, res) => {
  try {
    const { fileUrl } = req.query;
    const student_id = req.user.id;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }
    
    console.log('📥 Download request for file:', fileUrl);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    if (membershipError || !membership || membership.length === 0) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Extract file path from URL - handle different URL formats
    let filePath = '';
    
    console.log('🔍 Processing fileUrl:', fileUrl);
    
    // Handle full Supabase storage URL format
    if (fileUrl.includes('.supabase.co/storage/v1/object/public/task-submissions/')) {
      const urlParts = fileUrl.split('/storage/v1/object/public/task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from public URL:', filePath);
    }
    // Handle storage object URL format  
    else if (fileUrl.includes('.supabase.co/storage/v1/object/task-submissions/')) {
      const urlParts = fileUrl.split('/storage/v1/object/task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from object URL:', filePath);
    }
    // Handle relative path with task-submissions/
    else if (fileUrl.includes('task-submissions/')) {
      const urlParts = fileUrl.split('task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from relative path:', filePath);
    }
    // Handle case where it might just be a filename (look in common directories)
    else if (!fileUrl.includes('/') && fileUrl.includes('_')) {
      // This looks like a filename with our naming convention
      // Try common storage paths
      const possiblePaths = [
        fileUrl, // Direct filename
        `phase-submissions/${fileUrl}`,
        `task-submissions/${fileUrl}`,
        `files/${fileUrl}`
      ];
      
      console.log('🔍 Trying to locate file in possible paths:', possiblePaths);
      
      // Try each path until we find the file
      for (const testPath of possiblePaths) {
        try {
          console.log(`🔍 Testing path: ${testPath}`);
          const { data: testData, error: testError } = await supabase.storage
            .from('task-submissions')
            .download(testPath);
            
          if (!testError && testData) {
            filePath = testPath;
            console.log('✅ Found file at path:', filePath);
            break;
          }
        } catch (e) {
          console.log(`❌ Path ${testPath} not found, continuing...`);
        }
      }
    }
    // Handle direct file path
    else {
      filePath = fileUrl;
      console.log('📁 Using direct path:', filePath);
    }
    
    console.log('📁 Extracted file path:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid file URL format' });
    }
    
    // Download file from Supabase storage using the correct method
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('task-submissions')
      .download(filePath);
      
    if (downloadError) {
      console.error('❌ File download error:', downloadError);
      
      // Try alternative download method if the first fails
      const { data: publicUrlData } = supabase.storage
        .from('task-submissions')
        .getPublicUrl(filePath);
        
      if (publicUrlData?.publicUrl) {
        console.log('🔄 Trying alternative download method...');
        try {
          const response = await fetch(publicUrlData.publicUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          const filename = filePath.split('/').pop() || 'downloaded_file';
          const originalName = filename.replace(/^.*?_.*?_.*?_.*?_/, ''); // Remove prefix to get original filename
          
          res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.send(Buffer.from(buffer));
          return;
          
        } catch (fetchError) {
          console.error('❌ Alternative download failed:', fetchError);
        }
      }
      
      return res.status(404).json({ error: 'File not found or access denied', details: downloadError.message });
    }
    
    // Get filename from path
    const filename = filePath.split('/').pop() || 'downloaded_file';
    const originalName = filename.replace(/^.*?_.*?_.*?_.*?_/, ''); // Remove prefix to get original filename
    
    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', fileData.type || 'application/octet-stream');
    
    console.log('✅ File download successful:', originalName);
    
    // Stream the file data
    const buffer = Buffer.from(await fileData.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Error in download endpoint:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// GET /api/student-leader/project-completion/:projectId - Check if project completion is allowed
router.get('/project-completion/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('🔍 Checking project completion eligibility for project:', projectId);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role, group_id')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    if (membershipError || !membership || membership.length === 0) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    const groupId = membership[0].group_id;
    
    // Get all phases for this project
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title, start_date, end_date')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });
      
    if (phasesError) {
      console.error('❌ Error fetching phases:', phasesError);
      return res.status(500).json({ error: 'Error fetching project phases' });
    }
    
    // Check if each phase has at least one submission
    const phasesWithoutSubmissions = [];
    
    for (const phase of phases) {
      const { data: submissions, error: submissionsError } = await supabase
        .from('phase_submissions')
        .select('id')
        .eq('phase_id', phase.id)
        .eq('group_id', groupId)
        .limit(1);
        
      if (submissionsError) {
        console.error(`❌ Error checking submissions for phase ${phase.phase_number}:`, submissionsError);
        return res.status(500).json({ error: 'Error checking phase submissions' });
      }
      
      if (!submissions || submissions.length === 0) {
        phasesWithoutSubmissions.push({
          phase_number: phase.phase_number,
          title: phase.title
        });
      }
    }
    
    // Check if project submission already exists
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('id, status, submission_date, grade')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .single();
      
    if (submissionError && submissionError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ Error checking project submission:', submissionError);
      return res.status(500).json({ error: 'Error checking project submission' });
    }
    
    const canSubmit = true; // TEMPORARILY DISABLED: phasesWithoutSubmissions.length === 0;
    
    console.log(`📊 Project completion check result (SAFEGUARD DISABLED):`, {
      projectId,
      groupId,
      totalPhases: phases.length,
      phasesWithoutSubmissions: phasesWithoutSubmissions.length,
      canSubmit,
      hasExistingSubmission: !!existingSubmission
    });
    
    res.json({
      success: true,
      canSubmit,
      totalPhases: phases.length,
      phasesWithoutSubmissions,
      existingSubmission: existingSubmission || null,
      requirements: {
        allPhasesCompleted: phasesWithoutSubmissions.length === 0,
        message: phasesWithoutSubmissions.length > 0 
          ? `You must submit files for all phases before completing the project. Missing: ${phasesWithoutSubmissions.map(p => `Phase ${p.phase_number}`).join(', ')}`
          : 'All requirements met. You can now submit your project completion.'
      }
    });
    
  } catch (error) {
    console.error('❌ Error in project completion check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student-leader/project-completion/:projectId - Submit project completion
router.post('/project-completion/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { submission_text, file_urls } = req.body;
    const student_id = req.user.id;
    
    console.log('📤 Project completion submission for project:', projectId);
    console.log('📄 Submission text:', submission_text);
    console.log('� File URLs:', file_urls);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role, group_id')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    if (membershipError || !membership || membership.length === 0) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    const groupId = membership[0].group_id;
    
    // 🧪 TEMPORARY FOR TESTING: Eligibility check disabled
    console.log('🧪 TESTING MODE: Skipping all eligibility checks for project completion');
    
    
    // Check if all phases have submissions (requirement check)
    const eligibilityResponse = await fetch(`${req.protocol}://${req.get('host')}/api/student-leader/project-completion/${projectId}`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    
    if (!eligibilityResponse.ok) {
      return res.status(500).json({ error: 'Error checking project completion eligibility' });
    }
    
    const eligibilityData = await eligibilityResponse.json();
    
    if (!eligibilityData.canSubmit) {
      return res.status(403).json({ 
        error: 'Cannot submit project completion',
        message: eligibilityData.requirements.message,
        phasesWithoutSubmissions: eligibilityData.phasesWithoutSubmissions
      });
    }
    
    // Check if submission already exists
    if (eligibilityData.existingSubmission) {
      return res.status(409).json({ 
        error: 'Project completion already submitted',
        submission: eligibilityData.existingSubmission
      });
    }
    
    
    // Use provided file URLs (files were already uploaded via upload-phase-file endpoint)
    if (!file_urls || file_urls.length === 0) {
      return res.status(400).json({ error: 'No files provided for project completion' });
    }
    
    console.log('� Using pre-uploaded files:', file_urls.length);

    
    // Get project due date to check if submission is late
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('due_date')
      .eq('id', projectId)
      .single();
      
    const isLate = project ? new Date() > new Date(project.due_date) : false;
    
    // Create project submission record
    const { data: submission, error: insertError } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        group_id: groupId,
        submitted_by: student_id,
        file_urls: file_urls,
        submission_text: submission_text || 'Project Completion Submission',
        is_late: isLate
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error creating project submission:', insertError);
      return res.status(500).json({ error: 'Failed to create project submission record' });
    }
    
    console.log('✅ Project completion submitted successfully:', submission.id);
    
    // 🔒 CRITICAL: CAPTURE/FREEZE ALL MEMBER TASK SUBMISSIONS FROM ALL PHASES
    console.log('🔒 Starting comprehensive task submission freeze for Project Completion...');
    await captureAllTaskSubmissionsForProject(projectId, groupId, student_id);
    
    res.json({
      success: true,
      submission: {
        id: submission.id,
        project_id: submission.project_id,
        group_id: submission.group_id,
        file_urls: submission.file_urls,
        submission_date: submission.submission_date,
        status: submission.status,
        is_late: submission.is_late
      },
      message: 'Project completion submitted successfully',
      filesUploaded: file_urls.length
    });
    
  } catch (error) {
    console.error('❌ Error in project completion submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student-leader/submission-review - Get all submissions for review
router.get('/submission-review', async (req, res) => {
  try {
    const leader_id = req.user.id;
    const { projectId, memberId } = req.query;
    
    console.log('📋 Getting submission review data - Leader:', leader_id, 'Project:', projectId, 'Member:', memberId);
    
    // Verify leader permissions
    const { data: leaderMembership, error: leaderError } = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', leader_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();
    
    if (leaderError || !leaderMembership) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    // Get all projects for this leader's group
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        due_date,
        courses(
          course_groups(
            id,
            group_name
          )
        )
      `)
      .eq('courses.course_groups.id', leaderMembership.group_id)
      .eq('is_active', true);
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }
    
    // Get all group members (including the leader)
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        role,
        studentaccounts(
          id,
          first_name,
          last_name,
          student_number,
          profile_image_url
        )
      `)
      .eq('group_id', leaderMembership.group_id);
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }
    
    // Build project filter
    let projectFilter = {};
    if (projectId) {
      projectFilter.project_id = projectId;
    } else if (projects.length > 0) {
      projectFilter.project_id = { in: projects.map(p => p.id) };
    }
    
    // Build member filter
    let memberFilter = {};
    if (memberId) {
      memberFilter.assigned_to = memberId;
    } else if (members.length > 0) {
      memberFilter.assigned_to = { in: members.map(m => m.student_id) };
    }
    
    // Get all tasks for the filtered projects and members
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        due_date,
        project_id,
        assigned_to,
        project_phases(
          id,
          phase_number,
          title
        )
      `)
      .eq('is_active', true);
    
    // Apply project filter
    if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (projects.length > 0) {
      query = query.in('project_id', projects.map(p => p.id));
    }
    
    // Apply member filter
    if (memberId) {
      query = query.eq('assigned_to', memberId);
    } else if (members.length > 0) {
      query = query.in('assigned_to', members.map(m => m.student_id));
    }
    
    const { data: tasks, error: tasksError } = await query;
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }
    
    if (!tasks || tasks.length === 0) {
      return res.json({
        success: true,
        submissions: [],
        projects: projects || [],
        members: members.map(m => m.studentaccounts) || []
      });
    }
    
    const taskIdsForQuery = tasks.map(t => t.id);
    
    // Get original submissions
    const { data: originalSubmissions, error: origError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submission_text,
        file_urls,
        status,
        submission_date,
        review_comments,
        reviewed_at,
        attempt_number,
        created_at
      `)
      .in('task_id', taskIdsForQuery)
      .order('created_at', { ascending: false });
    
    
    // Get revision submissions
    const { data: revisionSubmissions, error: revError } = await supabase
      .from('revision_submissions')
      .select(`
        id,
        task_id,
        original_submission_id,
        revision_attempt_number,
        submission_text,
        file_paths,
        status,
        submitted_at,
        review_comments,
        reviewed_at,
        created_at
      `)
      .in('task_id', taskIdsForQuery)
      .order('created_at', { ascending: false });
    
    // Combine and process submissions - group by task and show all attempts
    const taskGroups = new Map(); // Group submissions by task
    
    // Process original submissions
    (originalSubmissions || []).forEach(submission => {
      const task = tasks.find(t => t.id === submission.task_id);
      const member = members.find(m => m.student_id === task.assigned_to);
      
      if (task && member) {
        console.log('🔍 Processing submission:', {
          id: submission.id,
          task_title: task.title,
          attempt_number: submission.attempt_number,
          submission_date: submission.submission_date
        });
        
        const submissionData = {
          id: submission.id,
          task_id: submission.task_id,
          task_title: task.title,
          member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
          member_id: member.student_id,
          member_role: member.role,
          is_leader: member.role === 'leader',
          submission_text: submission.submission_text,
          files: submission.file_urls ? JSON.parse(submission.file_urls) : [],
          status: submission.status,
          submitted_at: submission.submission_date,
          review_comments: submission.review_comments,
          reviewed_at: submission.reviewed_at,
          submission_type: 'original',
          attempt_number: submission.attempt_number,
          phase_number: task.project_phases?.phase_number || 1,
          phase_title: task.project_phases?.title || 'Unknown Phase'
        };
        
        // Group by task
        if (!taskGroups.has(submission.task_id)) {
          taskGroups.set(submission.task_id, {
            task_id: submission.task_id,
            task_title: task.title,
            member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
            member_id: member.student_id,
            member_role: member.role,
            is_leader: member.role === 'leader',
            phase_number: task.project_phases?.phase_number || 1,
            phase_title: task.project_phases?.title || 'Unknown Phase',
            attempts: []
          });
        }
        
        taskGroups.get(submission.task_id).attempts.push(submissionData);
      }
    });
    
    // Process revision submissions
    (revisionSubmissions || []).forEach(submission => {
      const task = tasks.find(t => t.id === submission.task_id);
      const member = members.find(m => m.student_id === task.assigned_to);
      
      if (task && member) {
        const submissionData = {
          id: submission.id,
          task_id: submission.task_id,
          task_title: task.title,
          member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
          member_id: member.student_id,
          member_role: member.role,
          is_leader: member.role === 'leader',
          submission_text: submission.submission_text,
          files: submission.file_paths || [],
          status: submission.status,
          submitted_at: submission.submitted_at,
          review_comments: submission.review_comments,
          reviewed_at: submission.reviewed_at,
          submission_type: 'revision',
          revision_number: submission.revision_attempt_number,
          attempt_number: submission.revision_attempt_number,
          phase_number: task.project_phases?.phase_number || 1,
          phase_title: task.project_phases?.title || 'Unknown Phase'
        };
        
        // Group by task
        if (!taskGroups.has(submission.task_id)) {
          taskGroups.set(submission.task_id, {
            task_id: submission.task_id,
            task_title: task.title,
            member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
            member_id: member.student_id,
            member_role: member.role,
            is_leader: member.role === 'leader',
            phase_number: task.project_phases?.phase_number || 1,
            phase_title: task.project_phases?.title || 'Unknown Phase',
            attempts: []
          });
        }
        
        taskGroups.get(submission.task_id).attempts.push(submissionData);
      }
    });
    
    // Sort attempts within each task by submission date (newest first)
    const allSubmissions = Array.from(taskGroups.values()).map(taskGroup => {
      console.log('🔍 Task group before sorting:', {
        task_title: taskGroup.task_title,
        attempts: taskGroup.attempts.map(a => ({
          id: a.id,
          attempt_number: a.attempt_number,
          submitted_at: a.submitted_at
        }))
      });
      
      taskGroup.attempts.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      
      console.log('🔍 Task group after sorting:', {
        task_title: taskGroup.task_title,
        attempts: taskGroup.attempts.map(a => ({
          id: a.id,
          attempt_number: a.attempt_number,
          submitted_at: a.submitted_at
        }))
      });
      
      return taskGroup;
    });
    
    // Sort task groups by most recent attempt date
    allSubmissions.sort((a, b) => {
      const aLatest = a.attempts[0]?.submitted_at || 0;
      const bLatest = b.attempts[0]?.submitted_at || 0;
      return new Date(bLatest) - new Date(aLatest);
    });
    
    console.log('✅ Submission review data prepared:', {
      submissions: allSubmissions.length,
      projects: projects.length,
      members: members.length,
      taskIds: allSubmissions.map(s => s.task_id)
    });
    
    // Check for duplicate task_ids
    const taskIdsForCheck = allSubmissions.map(s => s.task_id);
    const uniqueTaskIds = [...new Set(taskIdsForCheck)];
    if (taskIdsForCheck.length !== uniqueTaskIds.length) {
      console.log('⚠️ DUPLICATE TASK IDs DETECTED:', {
        total: taskIdsForCheck.length,
        unique: uniqueTaskIds.length,
        duplicates: taskIdsForCheck.filter((id, index) => taskIdsForCheck.indexOf(id) !== index)
      });
    }
    
    res.json({
      success: true,
      submissions: allSubmissions,
      projects: projects || [],
      members: members.map(m => m.studentaccounts) || []
    });
    
  } catch (error) {
    console.error('Error getting submission review data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;