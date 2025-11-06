const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Use your existing Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

// Helper function to detect current phase based on date
const detectCurrentPhase = (phases) => {
  if (!phases || phases.length === 0) return null;
  
  const now = new Date();
  return phases.find(phase => {
    const startDate = new Date(phase.start_date);
    const endDate = new Date(phase.end_date);
    return now >= startDate && now <= endDate;
  });
};

// Helper function to convert profile image URLs
const getProfileImageUrl = (studentId, profileImagePath) => {
  if (!profileImagePath) return null;
  
  // If it's already an API path, return as-is
  if (profileImagePath.startsWith('/api/files/') || profileImagePath.startsWith('http')) {
    return profileImagePath;
  }
  
  // If it's just a filename, construct the full API path
  const fileName = profileImagePath.split('/').pop() || profileImagePath;
  return `/api/files/studentaccounts/${studentId}/${fileName}`;
};

// GET /api/student/courses - Get all enrolled courses
router.get('/courses', async (req, res) => {
  try {
    // Add safety check for req.user
    if (!req.user || !req.user.id) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const student_id = req.user.id;
    
    console.log('📚 Getting courses for student:', student_id);
    
    const { data: enrollments, error } = await supabase
      .from('course_students')
      .select(`
        *,
        courses!inner(*)
      `)
      .eq('student_id', student_id)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const courses = (enrollments || []).map(enrollment => ({
      ...enrollment.courses,
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at
    }));
    
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/course/:courseId/projects - Get active projects for course
router.get('/course/:courseId/projects', async (req, res) => {
  try {
    // Add safety check for req.user
    if (!req.user || !req.user.id) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { courseId } = req.params;
    const student_id = req.user.id;
    
    console.log('📋 Getting projects for course:', courseId, 'student:', student_id);
    
    // Get projects with phases that are not past due date
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(*),
        courses!inner(course_name, course_code)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .gt('due_date', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Check if student has group and get role for each project
    const projectsWithStatus = await Promise.all(
      (projects || []).map(async (project) => {
        const { data: membership } = await supabase
          .from('course_group_members')
          .select(`
            role,
            position,
            course_groups!inner(
              group_name,
              courses!inner(
                projects!inner(id)
              )
            )
          `)
          .eq('student_id', student_id)
          .eq('is_active', true)
          .eq('course_groups.courses.projects.id', project.id)
          .single();
        
        return {
          ...project,
          studentRole: membership?.role || null,
          studentPosition: membership?.position || null,
          groupName: membership?.course_groups?.group_name || null,
          hasGroup: !!membership
        };
      })
    );
    
    res.json(projectsWithStatus);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/dashboard/groups - Get student's group memberships
router.get('/dashboard/groups', async (req, res) => {
  try {
    // Add safety check for req.user
    if (!req.user || !req.user.id) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const student_id = req.user.id;
    
    console.log('👥 Getting groups for student:', student_id);
    
    const { data: groupMemberships, error } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(*)
        )
      `)
      .eq('student_id', student_id);
    
    if (error) {
      console.error('Error fetching groups:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const enhancedData = await Promise.all(
      (groupMemberships || []).map(async (membership) => {
        // Get all members of this group
        const { data: allGroupMembers, error: membersError } = await supabase
          .from('course_group_members')
          .select(`
            *,
            studentaccounts!inner(
              id,
              first_name,
              last_name,
              profile_image_url,
              student_number
            )
          `)
          .eq('group_id', membership.course_groups.id);

        if (membersError) {
          console.error('Error fetching group members:', membersError);
        }

        // Format members data
        const members = (allGroupMembers || []).map(member => ({
          id: member.id,
          student_id: member.student_id,
          full_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
          first_name: member.studentaccounts.first_name,
          last_name: member.studentaccounts.last_name,
          profile_image_url: member.studentaccounts.profile_image_url 
            ? getProfileImageUrl(member.student_id, member.studentaccounts.profile_image_url)
            : null,
          student_number: member.studentaccounts.student_number,
          role: member.role,
          position: member.position
        }));

        return {
          id: membership.id,
          group_id: membership.course_groups.id,
          group_name: membership.course_groups.group_name,
          group_number: membership.course_groups.group_number,
          role: membership.role,
          position: membership.position,
          course_id: membership.course_groups.course_id,
          course_name: membership.course_groups.courses.course_name,
          course_code: membership.course_groups.courses.course_code,
          section: membership.course_groups.courses.section,
          assigned_at: membership.assigned_at,
          members: members
        };
      })
    );
    
    res.json({
      success: true,
      data: enhancedData
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add authentication check to all other routes
router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    console.error('❌ No authenticated user found in middleware');
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

// GET /api/student/projects/:projectId/dashboard - Get project-specific dashboard data
router.get('/projects/:projectId/dashboard', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('📊 Getting project dashboard for:', projectId, 'student:', student_id);
    
    // Verify student has access to this project through group membership
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(
            projects!inner(id)
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .eq('course_groups.courses.projects.id', projectId)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Get complete project data (SKIP project_evaluation_forms due to duplicate FK constraints)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(*),
        courses(course_name, course_code, section)
      `)
      .eq('id', projectId)
      .single();

    console.log('📅 [PROJECT QUERY] Error:', projectError);
    console.log('📅 [PROJECT QUERY] Project found:', !!project);
    console.log('📅 [PROJECT QUERY] Project phases count:', project?.project_phases?.length);

    if (projectError || !project) {
      console.error('❌ Project query failed or no project found');
      return res.status(404).json({ error: 'Project not found' });
    }

    // NOW fetch phase_evaluation_forms separately and merge them
    if (project.project_phases && Array.isArray(project.project_phases) && project.project_phases.length > 0) {
      console.log('📅 [FETCHING EVAL FORMS] Getting phase_evaluation_forms for phases:', project.project_phases.map(p => p.id).join(', '));
      
      const phaseIds = project.project_phases.map(p => p.id);
      
      const { data: phaseEvalForms, error: evalFormsError } = await supabase
        .from('phase_evaluation_forms')
        .select('id, phase_id, available_from, due_date')
        .in('phase_id', phaseIds);
      
      const { data: breathePeriods, error: breatheError } = await supabase
        .from('phase_breathe_periods')
        .select('id, phase_id, start_date, end_date, duration_days')
        .in('phase_id', phaseIds);
      
      console.log('📅 [QUERY RESULT] Error:', evalFormsError);
      console.log('📅 [QUERY RESULT] Data count:', phaseEvalForms?.length || 0);
      console.log('📅 [QUERY RESULT] Raw data:', phaseEvalForms);
      console.log('⏸️ [BREATHE PERIODS] Error:', breatheError);
      console.log('⏸️ [BREATHE PERIODS] Data count:', breathePeriods?.length || 0);
      
      if (evalFormsError) {
        console.error('❌ Error fetching phase evaluation forms:', evalFormsError);
      }
      if (breatheError) {
        console.error('❌ Error fetching breathe periods:', breatheError);
      }
      
      if (phaseEvalForms && phaseEvalForms.length > 0) {
        console.log('📅 [EVAL FORMS RECEIVED]:', phaseEvalForms);
        
        // Create a map of phase_id -> evaluation form
        const evalFormsMap = {};
        (phaseEvalForms || []).forEach(form => {
          evalFormsMap[form.phase_id] = form;
        });
        
        console.log('📅 [EVAL FORMS MAP]:', evalFormsMap);
        
        // Create a map of phase_id -> breathe period
        const breathePeriodsMap = {};
        (breathePeriods || []).forEach(period => {
          breathePeriodsMap[period.phase_id] = period;
        });
        
        console.log('⏸️ [BREATHE PERIODS MAP]:', breathePeriodsMap);
        
        // Merge the evaluation forms and breathe periods into project_phases
        project.project_phases = project.project_phases.map(phase => {
          const evalForm = evalFormsMap[phase.id];
          const breathePeriod = breathePeriodsMap[phase.id];
          console.log(`📅 [MERGE PHASE ${phase.phase_number}] Found eval form:`, evalForm, 'breathe period:', breathePeriod);
          return {
            ...phase,
            evaluation_available_from: evalForm?.available_from || null,
            evaluation_due_date: evalForm?.due_date || null,
            breathe_start_date: breathePeriod?.start_date || null,
            breathe_end_date: breathePeriod?.end_date || null,
            breathe_duration_days: breathePeriod?.duration_days || null
          };
        });
      } else {
        console.warn('⚠️  No phase evaluation forms found - setting all to null');
        project.project_phases = project.project_phases.map(phase => ({
          ...phase,
          evaluation_available_from: null,
          evaluation_due_date: null,
          breathe_start_date: null,
          breathe_end_date: null,
          breathe_duration_days: null
        }));
      }
    }
    
    console.log('📅 [FLATTENED] After flattening:', project.project_phases?.map(p => ({
      id: p.id,
      phase_number: p.phase_number,
      evaluation_available_from: p.evaluation_available_from,
      evaluation_due_date: p.evaluation_due_date,
      breathe_start_date: p.breathe_start_date,
      breathe_end_date: p.breathe_end_date,
      breathe_duration_days: p.breathe_duration_days
    })));

    // 🔧 NEW: Fetch project evaluation forms
    const { data: projectEvalForms, error: projectEvalError } = await supabase
      .from('project_evaluation_forms')
      .select(`
        id,
        project_id,
        available_from,
        due_date,
        is_custom_evaluation,
        custom_file_url,
        custom_file_name,
        total_points,
        criteria:project_evaluation_criteria!fk_project_eval_criteria_form_id(*)
      `)
      .eq('project_id', projectId);
    
    console.log('📋 [PROJECT EVAL FORMS] Error:', projectEvalError);
    console.log('📋 [PROJECT EVAL FORMS] Found:', projectEvalForms?.length || 0, 'forms');
    console.log('📋 [PROJECT EVAL FORMS] Data:', projectEvalForms);
    
    if (projectEvalForms && projectEvalForms.length > 0) {
      project.project_evaluation_forms = projectEvalForms;
      console.log('✅ [PROJECT EVAL FORMS] Added to project:', projectEvalForms.length, 'forms');
    } else {
      project.project_evaluation_forms = [];
      console.log('⚠️ [PROJECT EVAL FORMS] No forms found for project');
    }

    // Get all group members with properly formatted image URLs
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        studentaccounts!inner(first_name, last_name, student_number, email, profile_image_url)
      `)
      .eq('group_id', membership.course_groups.id)
      .eq('is_active', true);
    
    // Format the group members with proper image URLs
    const formattedGroupMembers = (groupMembers || []).map(member => {
  let profileImageUrl = null;
  
  if (member.studentaccounts?.profile_image_url) {
    profileImageUrl = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${member.studentaccounts.profile_image_url}`;
  }
  
  return {
    ...member,
    studentaccounts: {
      ...member.studentaccounts,
      profile_image_url: profileImageUrl
    }
  };
});
    
    // Get project tasks assigned to this student
    const { data: myTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        project_phases!inner(title, phase_number),
        task_submissions(*)
      `)
      .eq('project_id', projectId)
      .eq('assigned_to', student_id)
      .eq('is_active', true)
      .order('due_date', { ascending: true });
    
    // Calculate activity statistics
    const totalTasks = myTasks?.length || 0;
    const completedTasks = myTasks?.filter(t => t.status === 'completed').length || 0;
    const pendingTasks = myTasks?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = myTasks?.filter(t => t.status === 'in_progress').length || 0;
    
    const stats = {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks
    };
    
    res.json({
      project,
      group: membership.course_groups,
      groupMembers: formattedGroupMembers,
      myTasks: myTasks || [],
      stats,
      userRole: membership.role,
      groupInfo: membership.course_groups,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get project dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/my-tasks - Get tasks assigned to student
// GET /api/student/my-tasks - Get tasks assigned to student with enhanced phase information
// GET /api/student/my-tasks - Enhanced debugging version with revision submissions and feedback
router.get('/my-tasks', async (req, res) => {
  try {
    // Debug: log incoming request context
    console.log('🛠️ /api/student/my-tasks called - req.query:', req.query);
    console.log('🛠️ /api/student/my-tasks - req.user present:', !!req.user);

    // If authentication middleware failed to attach user, return early
    if (!req.user || !req.user.id) {
      console.warn('🚫 /api/student/my-tasks called without authenticated user');
      return res.status(401).json({ error: 'Authentication required for student endpoints' });
    }

    const student_id = req.user.id;
    const { status, projectId } = req.query;

    console.log('📝 Getting tasks for student:', student_id, 'project:', projectId);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        projects!inner(title, due_date, courses!inner(course_name)),
        project_phases!inner(title, phase_number, start_date, end_date),
        studentaccounts!tasks_assigned_by_fkey(first_name, last_name),
        task_submissions(
          *,
          task_feedback(
            *,
          studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, profile_image_url)
          )
        )
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: tasks, error: tasksError } = await query
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('❌ Get my tasks error:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('📊 Raw tasks from database:', tasks?.length || 0, 'tasks found');
    
    // Get revision submissions for all tasks with their feedback
    const taskIds = tasks?.map(t => t.id) || [];
    let revisionSubmissions = [];
    
    if (taskIds.length > 0) {
      const { data: revisions, error: revisionError } = await supabase
        .from('revision_submissions')
        .select(`
          *,
          task_feedback(
            *,
            studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name, profile_image_url)
          )
        `)
        .in('task_id', taskIds)
        .eq('submitted_by', student_id)
        .order('created_at', { ascending: false });
      
      if (!revisionError) {
        revisionSubmissions = revisions || [];
        console.log('📝 Found revision submissions:', revisionSubmissions.length);
      } else {
        console.warn('⚠️ Error fetching revision submissions:', revisionError);
      }
    }
    
    // ✅ Enhanced phase processing with defensive checks and debugging
    const normalizedTasks = Array.isArray(tasks) ? tasks : (tasks ? [tasks] : []);

    const enhancedTasks = (normalizedTasks || []).map((task, index) => {
      try {
        console.log(`🔍 Processing task ${index + 1}:`, {
          id: task.id,
          title: task.title,
          // show whether project_phases is array/object/null for debugging
          project_phases_type: Array.isArray(task.project_phases) ? 'array' : (task.project_phases ? typeof task.project_phases : 'null')
        });

        // project_phases may be an array (many-to-one) or a single object depending on DB shape.
        const phase = Array.isArray(task.project_phases) ? task.project_phases[0] : task.project_phases;

        if (!phase) {
          console.log(`⚠️ No phase found for task ${task.title || task.id}`);
          const safeSubmissions = (task.task_submissions || []).map(submission => ({
            ...submission,
            existing_feedback: (submission.task_feedback || []).map(feedback => {
              // Construct full profile image URL for feedback authors
              let authorProfileImage = null;
              if (feedback.studentaccounts?.profile_image_url) {
                authorProfileImage = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${feedback.studentaccounts.profile_image_url}`;
              }
              
              return {
                ...feedback,
                author_name: feedback.studentaccounts ? `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}` : 'Unknown',
                // Use constructed full URL
                author_profile_image: authorProfileImage
              };
            })
          }));

          return {
            ...task,
            phase_info: null,
            task_submissions: safeSubmissions
          };
        }

        const now = new Date();
        const phaseStart = new Date(phase.start_date);
        const phaseEnd = new Date(phase.end_date);

        let phaseStatus = 'upcoming';
        if (!isNaN(phaseStart.getTime()) && !isNaN(phaseEnd.getTime())) {
          if (now >= phaseStart && now <= phaseEnd) {
            phaseStatus = 'active';
          } else if (now > phaseEnd) {
            phaseStatus = 'completed';
          }
        }

        const phaseInfo = {
          title: phase.title || null,
          phase_number: phase.phase_number || null,
          status: phaseStatus,
          start_date: phase.start_date || null,
          end_date: phase.end_date || null
        };

        // Add revision submissions for this task with feedback (if any)
        const taskRevisions = (revisionSubmissions || []).filter(rev => rev.task_id === task.id)
          .map(revision => ({
            ...revision,
            existing_feedback: (revision.task_feedback || []).map(feedback => {
              // Construct full profile image URL for feedback authors
              let authorProfileImage = null;
              if (feedback.studentaccounts?.profile_image_url) {
                authorProfileImage = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${feedback.studentaccounts.profile_image_url}`;
              }
              
              return {
                ...feedback,
                author_name: feedback.studentaccounts ? `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}` : 'Unknown',
                // Use constructed full URL
                author_profile_image: authorProfileImage
              };
            })
          }));

        // Enhance task submissions with feedback (safe defaults)
        const enhancedSubmissions = (task.task_submissions || []).map(submission => ({
          ...submission,
          existing_feedback: (submission.task_feedback || []).map(feedback => {
            // Construct full profile image URL for feedback authors
            let authorProfileImage = null;
            if (feedback.studentaccounts?.profile_image_url) {
              authorProfileImage = `https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/studentaccounts/${feedback.studentaccounts.profile_image_url}`;
            }
            
            return {
              ...feedback,
              author_name: feedback.studentaccounts ? `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}` : 'Unknown',
              // Use constructed full URL
              author_profile_image: authorProfileImage
            };
          })
        }));

        // Group submissions by attempts with proper revision handling
        const groupedSubmissions = [];
        const regularSubmissions = enhancedSubmissions.sort((a, b) => 
          new Date(a.submission_date || a.created_at) - new Date(b.submission_date || b.created_at)
        );

        // Process each regular submission as an attempt
        regularSubmissions.forEach((submission, attemptIndex) => {
          const attemptNumber = attemptIndex + 1;
          
          // Get all revisions for this original submission
          const relatedRevisions = taskRevisions
            .filter(rev => rev.original_submission_id === submission.id)
            .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

          // Create the attempt group with original submission
          const attemptGroup = {
            attempt_number: attemptNumber,
            original_submission: {
              ...submission,
              is_revision: false,
              attempt_number: attemptNumber,
              revision_number: null
            },
            revisions: relatedRevisions.map((rev, revIndex) => ({
              id: rev.id,
              task_id: rev.task_id,
              submitted_by: rev.submitted_by,
              submission_text: rev.submission_text,
              file_urls: JSON.stringify(rev.file_paths || []),
              status: rev.status,
              submission_date: rev.submitted_at,
              created_at: rev.submitted_at,
              updated_at: rev.updated_at,
              review_comments: rev.review_comments,
              is_revision: true,
              revision_number: revIndex + 1,
              revision_attempt_number: rev.revision_attempt_number,
              original_submission_id: rev.original_submission_id,
              existing_feedback: rev.existing_feedback || [],
              attempt_number: attemptNumber
            })),
            latest_status: relatedRevisions.length > 0 ? 
              relatedRevisions[relatedRevisions.length - 1].status : submission.status,
            has_pending_revision: relatedRevisions.some(rev => rev.status === 'pending'),
            needs_new_revision: submission.status === 'revision_requested' && 
                               !relatedRevisions.some(rev => rev.status === 'pending')
          };

          groupedSubmissions.push(attemptGroup);

          // If there are revisions, also create separate attempt entries for each revision
          // This creates the "Attempt #1 (Revision 1)" structure you want
          relatedRevisions.forEach((revision, revIndex) => {
            const revisionAttemptGroup = {
              attempt_number: attemptNumber,
              revision_number: revIndex + 1,
              is_revision_attempt: true,
              original_submission: null, // No original for revision attempts
              revisions: [{
                id: revision.id,
                task_id: revision.task_id,
                submitted_by: revision.submitted_by,
                submission_text: revision.submission_text,
                file_urls: JSON.stringify(revision.file_paths || []),
                status: revision.status,
                submission_date: revision.submitted_at,
                created_at: revision.submitted_at,
                updated_at: revision.updated_at,
                review_comments: revision.review_comments,
                is_revision: true,
                revision_number: revIndex + 1,
                revision_attempt_number: revision.revision_attempt_number,
                original_submission_id: revision.original_submission_id,
                existing_feedback: revision.existing_feedback || [],
                attempt_number: attemptNumber
              }],
              latest_status: revision.status,
              has_pending_revision: revision.status === 'pending',
              needs_new_revision: revision.status === 'revision_requested'
            };
            
            groupedSubmissions.push(revisionAttemptGroup);
          });
        });

        // Sort grouped submissions by attempt number and revision number
        groupedSubmissions.sort((a, b) => {
          if (a.attempt_number !== b.attempt_number) {
            return b.attempt_number - a.attempt_number; // Latest attempts first
          }
          // Within same attempt, show original first, then revisions
          if (a.is_revision_attempt && !b.is_revision_attempt) return 1;
          if (!a.is_revision_attempt && b.is_revision_attempt) return -1;
          if (a.is_revision_attempt && b.is_revision_attempt) {
            return b.revision_number - a.revision_number; // Latest revisions first
          }
          return 0;
        });

        // Flatten all submissions for backward compatibility
        const allSubmissions = [];
        groupedSubmissions.forEach(group => {
          if (group.original_submission) {
            allSubmissions.push(group.original_submission);
          }
          allSubmissions.push(...group.revisions);
        });
        allSubmissions.sort((a, b) => new Date(a.submission_date || a.created_at) - new Date(b.submission_date || b.created_at));

        // Determine current status based on latest submissions and revisions
        let currentTaskStatus = task.status;
        const latestSubmissionGroup = groupedSubmissions[0]; // Most recent due to sorting
        
        if (latestSubmissionGroup) {
          // Check if any submission is approved/accepted
          const hasApprovedSubmission = allSubmissions.some(sub => 
            sub.status === 'approved' || sub.status === 'accepted'
          );
          
          if (hasApprovedSubmission) {
            currentTaskStatus = 'completed';
          } else if (latestSubmissionGroup.has_pending_revision) {
            currentTaskStatus = 'to_revise'; // Keep in revision column when revision is pending
          } else if (latestSubmissionGroup.needs_new_revision) {
            currentTaskStatus = 'to_revise';
          } else if (latestSubmissionGroup.latest_status === 'pending') {
            // If task was originally marked for revision, keep it in revision column
            if (task.status === 'to_revise') {
              currentTaskStatus = 'to_revise';
            } else {
              currentTaskStatus = 'pending_review';
            }
          }
        }

        console.log(`📋 Task ${task.title || task.id} status analysis:`, {
          originalStatus: task.status,
          currentStatus: currentTaskStatus,
          regularSubmissions: enhancedSubmissions.length || 0,
          revisionSubmissions: taskRevisions.length,
          groupedAttempts: groupedSubmissions.length,
          latestGroupStatus: latestSubmissionGroup?.latest_status,
          hasPendingRevision: latestSubmissionGroup?.has_pending_revision,
          totalSubmissions: allSubmissions.length
        });

        return {
          ...task,
          status: currentTaskStatus,
          phase_status: phaseStatus,
          phase_info: phaseInfo,
          revision_submissions: taskRevisions,
          grouped_submissions: groupedSubmissions,
          task_submissions: allSubmissions
        };
      } catch (taskErr) {
        console.error(`❌ Error processing task at index ${index} (id: ${task?.id || 'unknown'}):`, taskErr);
        // Return a safe placeholder so the endpoint continues to function
        return {
          ...task,
          error_processing: true,
          phase_info: null,
          task_submissions: task?.task_submissions || []
        };
      }
    }) || [];

    console.log('🎯 Enhanced tasks with phase info and feedback:', enhancedTasks.length);
    
    // Debug: Log unique phases found
    const uniquePhases = enhancedTasks
      .map(task => task.phase_info)
      .filter(phase => phase)
      .filter((phase, index, self) => 
        self.findIndex(p => p.phase_number === phase.phase_number) === index
      );
    
    console.log('🎯 Unique phases found:', uniquePhases);

    res.json(enhancedTasks);
  } catch (error) {
    console.error('❌ Get my tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});
// GET /api/student/announcements - Get course announcements
router.get('/announcements', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('📢 Getting announcements for student:', student_id);
    
    // Get student's enrolled courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('student_id', student_id)
      .eq('is_active', true);
    
    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }
    
    const courseIds = (enrollments || []).map(e => e.course_id);
    
    if (courseIds.length === 0) {
      return res.json([]);
    }
    
    // Get announcements for enrolled courses
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select(`
        *,
        courses!inner(course_name, course_code),
        professoraccounts!announcements_created_by_fkey(first_name, last_name)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching announcements:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const formattedAnnouncements = (announcements || []).map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'info',
      author: announcement.professoraccounts ? 
        `${announcement.professoraccounts.first_name} ${announcement.professoraccounts.last_name}` : 
        'Professor',
      created_at: announcement.created_at,
      course_name: announcement.courses?.course_name,
      course_code: announcement.courses?.course_code
    }));
    
    res.json(formattedAnnouncements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/notifications - Get student notifications
router.get('/notifications', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('🔔 Getting notifications for student:', student_id);
    
    const notifications = [];
    
    // Get task-related notifications
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects!inner(title),
        task_submissions(status, reviewed_at, review_comments)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);
    
    if (tasks && !tasksError) {
      tasks.forEach(task => {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const isOverdue = dueDate < now && task.status !== 'completed';
        const dueSoon = (dueDate - now) / (1000 * 60 * 60 * 24) <= 2 && !isOverdue;
        
        if (isOverdue) {
          notifications.push({
            id: `overdue-${task.id}`,
            type: 'overdue',
            priority: 'high',
            title: 'Overdue Task',
            message: `Task "${task.title}" is overdue`,
            date: task.due_date,
            taskId: task.id
          });
        } else if (dueSoon) {
          notifications.push({
            id: `due-soon-${task.id}`,
            type: 'due_soon',
            priority: 'medium',
            title: 'Task Due Soon',
            message: `Task "${task.title}" is due soon`,
            date: task.due_date,
            taskId: task.id
          });
        }
        
        // Check for feedback
        if (task.task_submissions && task.task_submissions.length > 0) {
          const latestSubmission = task.task_submissions[task.task_submissions.length - 1];
          if (latestSubmission.status === 'reviewed' && latestSubmission.review_comments) {
            notifications.push({
              id: `feedback-${task.id}`,
              type: 'feedback',
              priority: 'medium',
              title: 'New Feedback',
              message: `You have new feedback on "${task.title}"`,
              date: latestSubmission.reviewed_at,
              taskId: task.id
            });
          }
        }
      });
    }
    
    // Sort by priority and date
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.date) - new Date(a.date);
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/grades - Get student grades
router.get('/grades', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('📊 Getting grades for student:', student_id);
    
    const allGrades = [];
    
    // Get phase grades
    const { data: phaseGrades, error: phaseGradesError } = await supabase
      .from('phase_grades')
      .select(`
        *,
        project_phases!inner(
          title, 
          phase_number,
          projects!inner(title, courses!inner(course_name, course_code))
        ),
        professoraccounts!phase_grades_graded_by_fkey(first_name, last_name)
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });
    
    if (!phaseGradesError && phaseGrades) {
      phaseGrades.forEach(grade => {
        allGrades.push({
          id: `phase-${grade.id}`,
          assignment_name: `${grade.project_phases.projects.title} - ${grade.project_phases.title}`,
          grade: grade.final_phase_grade || grade.individual_grade,
          max_grade: 100,
          feedback: grade.feedback,
          graded_at: grade.graded_at,
          type: 'phase',
          course_name: grade.project_phases.projects.courses.course_name,
          course_code: grade.project_phases.projects.courses.course_code,
          graded_by: grade.professoraccounts ? 
            `${grade.professoraccounts.first_name} ${grade.professoraccounts.last_name}` : 
            'Professor'
        });
      });
    }
    
    // Get final project grades
    const { data: projectGrades, error: projectGradesError } = await supabase
      .from('project_grades')
      .select(`
        *,
        projects!inner(title, courses!inner(course_name, course_code)),
        professoraccounts!project_grades_graded_by_fkey(first_name, last_name)
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });
    
    if (!projectGradesError && projectGrades) {
      projectGrades.forEach(grade => {
        allGrades.push({
          id: `project-${grade.id}`,
          assignment_name: `${grade.projects.title} - Final Project`,
          grade: grade.final_grade || grade.individual_grade,
          max_grade: 100,
          feedback: grade.comments,
          graded_at: grade.graded_at || grade.created_at,
          type: 'project',
          course_name: grade.projects.courses.course_name,
          course_code: grade.projects.courses.course_code,
          graded_by: grade.professoraccounts ? 
            `${grade.professoraccounts.first_name} ${grade.professoraccounts.last_name}` : 
            'Professor'
        });
      });
    }
    
    // Sort all grades by date
    allGrades.sort((a, b) => new Date(b.graded_at) - new Date(a.graded_at));
    
    res.json(allGrades);
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/evaluations - Get student evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('📝 Getting evaluations for student:', student_id);
    
    const { data: evaluations, error } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(title, phase_number, projects!inner(title)),
        course_groups!inner(group_name)
      `)
      .eq('evaluator_id', student_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching evaluations:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const formattedEvaluations = (evaluations || []).map(evaluation => ({
      id: evaluation.id,
      phase_name: evaluation.project_phases?.title || `Phase ${evaluation.project_phases?.phase_number}`,
      project_name: evaluation.project_phases?.projects?.title,
      evaluation_type: 'Peer Evaluation',
      status: 'completed',
      submitted_at: evaluation.created_at,
      group_name: evaluation.course_groups?.group_name
    }));
    
    res.json(formattedEvaluations);
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/member/:memberId/activity - Get member activity details
router.get('/member/:memberId/activity', async (req, res) => {
  try {
    const { memberId } = req.params;
    const student_id = req.user.id;
    
    console.log('👤 Getting member activity for:', memberId, 'by student:', student_id);
    
    // Verify that the requesting student is in the same group as the member
    const { data: groupCheck, error: groupCheckError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        course_groups!inner(
          course_group_members!inner(student_id)
        )
      `)
      .eq('id', memberId)
      .single();
    
    if (groupCheckError || !groupCheck) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Check if requesting student is in the same group
    const isInSameGroup = groupCheck.course_groups.course_group_members.some(
      member => member.student_id === student_id
    );
    
    if (!isInSameGroup) {
      return res.status(403).json({ error: 'Unauthorized access to member activity' });
    }
    
    // Get member's assigned tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_submissions(*),
        project_phases!inner(title)
      `)
      .eq('assigned_to', memberId)
      .eq('is_active', true)
      .order('due_date', { ascending: true });
    
    // Get member's recent feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('task_feedback')
      .select(`
        *,
        task_submissions!inner(
          tasks!inner(title)
        )
      `)
      .eq('task_submissions.submitted_by', memberId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    res.json({
      tasks: tasks || [],
      recentFeedback: feedback || []
    });
  } catch (error) {
    console.error('Get member activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/member-tasks - Get tasks and submissions for a specific member
// GET /api/student/member-tasks - Get tasks and submissions for a specific member
router.get('/member-tasks', async (req, res) => {
  try {
    const { studentId, projectId } = req.query;
    const requesting_student_id = req.user.id;
    
    console.log('👤 Getting member tasks for student:', studentId, 'project:', projectId, 'requested by:', requesting_student_id);
    
    // ✅ VALIDATION: Check if studentId and projectId are provided
    if (!studentId || !projectId) {
      console.error('❌ Missing required parameters:', { studentId, projectId });
      return res.status(400).json({ error: 'Missing studentId or projectId' });
    }
    
    // Verify that the requesting student is in the same group as the target student
    const { data: requestingMembership, error: requestingError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(id, group_name)
      `)
      .eq('student_id', requesting_student_id)
      .eq('is_active', true)
      .single();
    
    if (requestingError || !requestingMembership) {
      console.error('❌ Requesting student not found in any group:', requestingError);
      return res.status(403).json({ error: 'You are not a member of any group' });
    }
    
    console.log('✅ Requesting student group:', requestingMembership);
    
    // Check if the target student is in the same group
    const { data: targetMembership, error: targetError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(id, group_name)
      `)
      .eq('student_id', studentId)
      .eq('group_id', requestingMembership.group_id)
      .eq('is_active', true)
      .single();
    
    if (targetError || !targetMembership) {
      console.error('❌ Target student not in same group:', targetError);
      return res.status(403).json({ error: 'Student not in your group' });
    }
    
    console.log('✅ Target student is in same group:', targetMembership);
    
    // Get member's tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        project_phases!inner(title, phase_number, start_date, end_date),
        task_submissions(*)
      `)
      .eq('assigned_to', studentId)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('due_date', { ascending: true });
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: 'Error fetching tasks' });
    }
    
    console.log('📊 Found tasks:', tasks?.length || 0);
    
    // Get member's submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select(`
        *,
        tasks!inner(title, description, due_date, project_id),
        task_feedback(
          *,
          studentaccounts!task_feedback_feedback_by_fkey(first_name, last_name)
        )
      `)
      .eq('submitted_by', studentId)
      .eq('tasks.project_id', projectId)
      .order('submission_date', { ascending: false });
    
    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: 'Error fetching submissions' });
    }
    
    console.log('📊 Found submissions:', submissions?.length || 0);
    
    // Enhance tasks with phase info
    const enhancedTasks = tasks?.map(task => {
      const phase = task.project_phases;
      const now = new Date();
      const phaseStart = new Date(phase.start_date);
      const phaseEnd = new Date(phase.end_date);
      
      let phaseStatus = 'upcoming';
      if (now >= phaseStart && now <= phaseEnd) {
        phaseStatus = 'active';
      } else if (now > phaseEnd) {
        phaseStatus = 'completed';
      }
      
      return {
        ...task,
        phase_info: {
          title: phase.title,
          phase_number: phase.phase_number,
          status: phaseStatus,
          start_date: phase.start_date,
          end_date: phase.end_date
        }
      };
    }) || [];
    
    // Enhance submissions with existing feedback
    const enhancedSubmissions = submissions?.map(submission => ({
      ...submission,
      task: submission.tasks,
      existing_feedback: submission.task_feedback?.map(feedback => ({
        ...feedback,
        author_name: feedback.studentaccounts ? 
          `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}` : 
          'Unknown'
      })) || []
    })) || [];
    
    res.json({
      tasks: enhancedTasks,
      submissions: enhancedSubmissions
    });
    
  } catch (error) {
    console.error('❌ Get member tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student/submit-feedback - Submit feedback for a task submission
router.post('/submit-feedback', async (req, res) => {
  try {
    const { submission_id, feedback_text } = req.body;
    const feedback_by = req.user.id;
    
    console.log('💬 Submitting feedback for submission:', submission_id);
    
    const { data, error } = await supabase
      .from('task_feedback')
      .insert({
        submission_id,
        feedback_by,
        feedback_text,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, feedback: data });
    
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/student/submit-revision - Submit revision for a task
router.post('/submit-revision', upload.array('files', 10), async (req, res) => {
  try {
    const { 
      task_id, 
      original_submission_id,
      submission_text
    } = req.body;
    const submitted_by = req.user.id;
    const files = req.files || [];
    
    console.log('🔄 Submitting revision for task:', task_id);
    console.log('📁 Files received:', files.length);
    
    // Get the original submission to verify it exists
    const { data: originalSubmission, error: originalError } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('id', original_submission_id)
      .single();
    
    if (originalError || !originalSubmission) {
      return res.status(400).json({ error: 'Original submission not found' });
    }

    // Count existing revisions for this original submission to get the next revision number
    const { data: existingRevisions, error: revisionCountError } = await supabase
      .from('revision_submissions')
      .select('id')
      .eq('original_submission_id', original_submission_id);
    
    const revisionNumber = (existingRevisions?.length || 0) + 1;
    
    // Upload files if any
    const file_paths = [];
    if (files.length > 0) {
      // Determine attempt number from original submission
      const attemptNumber = originalSubmission.attempt_number || 1;
      
      for (const file of files) {
        // Create organized file path: task_id/attempt_number/filename
        const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${task_id}/attempt_${attemptNumber}/${Date.now()}_${sanitizedFileName}`;
        const filePath = fileName;
        
        console.log('📁 Uploading revision file:', filePath, 'revision:', revisionNumber);
        
        const { error: uploadError } = await supabase.storage
          .from('task-submissions')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });
        
        if (uploadError) {
          console.error('Revision file upload error:', uploadError);
          return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
        }
        
        file_paths.push(fileName);
      }
    }
    
    // Insert the revision
    const { data: revision, error: revisionError } = await supabase
      .from('revision_submissions')
      .insert({
        task_id,
        submitted_by,
        original_submission_id,
        submission_text: submission_text || null,
        file_paths: file_paths || [],
        status: 'pending',
        submitted_at: new Date().toISOString(),
        revision_attempt_number: revisionNumber
      })
      .select()
      .single();
    
    if (revisionError) {
      console.error('Error submitting revision:', revisionError);
      return res.status(500).json({ error: revisionError.message });
    }

    // Don't update the task status - keep it as 'to_revise' so the revision remains in the revision column
    
    console.log('✅ Revision submitted successfully:', revision.id);
    res.json({ 
      success: true, 
      revision,
      message: 'Revision submitted successfully' 
    });
    
  } catch (error) {
    console.error('Submit revision error:', error);
    res.status(500).json({ error: error.message });
  }
});



//// GRADES

// Add these endpoints to your student-course-api.js file

// GET /api/student/projects/:projectId/grades - Get detailed project grades
router.get('/projects/:projectId/grades', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('📊 === DETAILED PROJECT GRADES START ===');
    console.log('📊 Project ID:', projectId);
    console.log('📊 Student ID:', student_id);
    
    // Verify student has access to this project
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(
            projects!inner(id)
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .eq('course_groups.courses.projects.id', projectId)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Get project details with phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(*),
        courses(course_name, course_code)
      `)
      .eq('id', projectId)
      .single();

    // Get phase deliverable submissions (grades) for this student's group
    const { data: phaseGrades, error: phaseGradesError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`
        id,
        phase_id,
        group_id,
        grade,
        max_grade,
        graded_by,
        graded_at,
        instructor_feedback,
        status,
        member_tasks,
        project_phases:project_phases(
          id,
          title, 
          phase_number,
          start_date,
          end_date,
          project_id
        ),
        professoraccounts(first_name, last_name)
      `)
      .eq('group_id', membership.group_id)
      .eq('project_phases.project_id', projectId)
      .eq('status', 'graded')
      .order('project_phases.phase_number', { ascending: true });

    // Get phase submissions for this student's group
    const { data: phaseSubmissions, error: phaseSubmissionsError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`
        id,
        phase_id,
        grade,
        max_grade,
        status,
        submitted_at,
        member_tasks,
        project_phases:project_phases(
          id,
          title,
          phase_number,
          start_date,
          end_date
        )
      `)
      .eq('group_id', membership.group_id)
      .eq('project_phases.project_id', projectId)
      .order('project_phases.phase_number', { ascending: true });

    // Get task grades for this student - NOT USED ANYMORE (using phase submissions)
    const { data: taskGrades, error: taskGradesError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`id`)
      .eq('group_id', membership.group_id)
      .limit(0);

    // Get task submissions for this student - NOT USED ANYMORE
    const { data: taskSubmissions, error: taskSubmissionsError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`id`)
      .eq('group_id', membership.group_id)
      .limit(0);

    // Get evaluations submitted by this student
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(
          title,
          phase_number,
          start_date,
          end_date
        )
      `)
      .eq('evaluator_id', student_id)
      .eq('project_phases.project_id', projectId)
      .order('project_phases.phase_number', { ascending: true });

    // Get project final grade from project_deliverable_submissions
    const { data: projectGrade, error: projectGradeError } = await supabase
      .from('project_deliverable_submissions')
      .select(`
        id,
        grade,
        max_grade,
        graded_by,
        graded_at,
        instructor_feedback,
        status,
        member_tasks,
        professoraccounts(first_name, last_name)
      `)
      .eq('project_id', projectId)
      .eq('group_id', membership.group_id)
      .eq('status', 'graded')
      .single();

    console.log('✅ Detailed project grades retrieved');
    console.log('📊 === DETAILED PROJECT GRADES COMPLETE ===');

    res.json({
      project,
      group: membership.course_groups,
      phaseGrades: phaseGrades || [],
      phaseSubmissions: phaseSubmissions || [],
      taskGrades: taskGrades || [],
      taskSubmissions: taskSubmissions || [],
      evaluations: evaluations || [],
      projectGrade: projectGrade || null,
      userRole: membership.role
    });

  } catch (error) {
    console.error('💥 Detailed project grades error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/grades/overview - Get grades overview for all projects and phases
// ❌ DISABLED: Old grades/overview endpoint - Now using the NEW one in server.js (line 14345)
// This old endpoint returns ALL grades (including not-submitted) which causes null displays
// The new endpoint only returns GRADED submissions with proper member_tasks handling
/*
router.get('/grades/overview', async (req, res) => {
    
    // Step 1: Get the student's group IDs with course info
    console.log('📊 Step 1: Fetching group memberships from course_group_members...');
    const { data: groupMemberships, error: memberError } = await supabase
      .from('course_group_members')
      .select('group_id, course_groups(id, course_id)')
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (memberError) {
      console.error('❌ Error fetching group memberships:', memberError);
      return res.status(500).json({ error: memberError.message });
    }

    console.log('📊 Group memberships response:', JSON.stringify(groupMemberships, null, 2));
    
    const groupIds = groupMemberships?.map(m => m.group_id).filter(Boolean) || [];
    const courseIds = [...new Set(groupMemberships?.map(m => m.course_groups?.course_id).filter(Boolean))] || [];
    console.log('📊 Extracted group IDs:', groupIds);
    console.log('📊 Extracted course IDs:', courseIds);

    if (groupIds.length === 0 || courseIds.length === 0) {
      console.log('📊 Student is not in any groups/courses, returning empty array');
      return res.json([]);
    }

    const grades = [];
    
    // ===== STEP 2: GET ALL PROJECTS FOR THE STUDENT'S COURSES =====
    console.log('📊 Step 2: Fetching ALL projects for courses:', courseIds);
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, course_id, is_active')
      .in('course_id', courseIds)
      .order('created_at', { ascending: true });

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }
    console.log('📊 Found', allProjects?.length || 0, 'projects in student\'s courses');

    // ===== STEP 3: GET ALL PHASES FOR THESE PROJECTS =====
    const projectIds = allProjects?.map(p => p.id) || [];
    console.log('📊 Step 3: Fetching ALL phases for', projectIds.length, 'projects');
    const { data: allPhases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, project_id, phase_number, title')
      .in('project_id', projectIds)
      .order('project_id', { ascending: true })
      .order('phase_number', { ascending: true });

    if (phasesError) {
      console.error('❌ Error fetching phases:', phasesError);
      return res.status(500).json({ error: phasesError.message });
    }
    console.log('📊 Found', allPhases?.length || 0, 'phases across all projects');
    
    // ===== STEP 4: GET PROJECT DELIVERABLE SUBMISSIONS =====
    console.log('📊 Step 4: Fetching project deliverable submissions...');
    console.log('📊 Querying for group_ids:', groupIds);
    const { data: projectDeliverables, error: projectError } = await supabase
      .from('project_deliverable_submissions')
      .select(`
        id,
        group_id,
        project_id,
        projects(id, title),
        grade,
        member_tasks,
        instructor_feedback,
        submitted_at,
        graded_at,
        graded_by,
        professoraccounts!project_deliverable_submissions_graded_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .in('group_id', groupIds);

    if (projectError) {
      console.error('❌ Project deliverables error:', projectError);
      return res.status(500).json({ error: projectError.message });
    }

    console.log('📊 Project deliverables result:', projectDeliverables ? projectDeliverables.length : 0, 'records found');
    if (projectDeliverables && projectDeliverables.length > 0) {
      console.log('📊 Sample project submission:', JSON.stringify(projectDeliverables[0], null, 2));
      projectDeliverables.forEach(submission => {
        console.log('📊 Processing submission:', submission.id, 'projects:', submission.projects);
        if (submission.projects) {
          // Extract individual grade for current student from member_tasks
          let individualGrade = null;
          if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
            const studentTask = submission.member_tasks.find(task => task.member_id === student_id);
            individualGrade = studentTask?.individual_grade || null;
            console.log('📊 Found individual grade for student:', individualGrade);
          }

          const professor = submission.professoraccounts;
          const professorName = professor 
            ? `${professor.first_name} ${professor.last_name}`.trim()
            : null;

          grades.push({
            id: submission.id,
            projectId: submission.project_id,
            projectTitle: submission.projects.title,
            type: 'project',
            groupGrade: submission.grade,
            individualGrade: individualGrade,
            maxGrade: 100,
            status: submission.graded_at ? 'graded' : 'pending',
            gradedAt: submission.graded_at,
            gradedBy: submission.graded_by,
            gradedByName: professorName,
            feedback: submission.instructor_feedback
          });
        }
      });
    } else {
      console.log('📊 No project deliverable submissions found for groups:', groupIds);
    }

    // ===== GET PHASE DELIVERABLE GRADES =====
    console.log('📊 Step 3: Fetching phase deliverable submissions...');
    const { data: phaseDeliverables, error: phaseError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`
        id,
        group_id,
        project_id,
        phase_id,
        phase_snapshot,
        projects(id, title),
        grade,
        member_tasks,
        instructor_feedback,
        submitted_at,
        graded_at,
        graded_by,
        professoraccounts!phase_deliverable_submissions_graded_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .in('group_id', groupIds);

    if (phaseError) {
      console.error('❌ Phase deliverables error:', phaseError);
      return res.status(500).json({ error: phaseError.message });
    }

    console.log('📊 Phase deliverables result:', phaseDeliverables ? phaseDeliverables.length : 0, 'records found');
    if (phaseDeliverables && phaseDeliverables.length > 0) {
      console.log('📊 Sample phase submission:', JSON.stringify(phaseDeliverables[0], null, 2));
      phaseDeliverables.forEach(submission => {
        if (submission.projects) {
          // Extract individual grade for current student from member_tasks
          let individualGrade = null;
          if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
            const studentTask = submission.member_tasks.find(task => task.member_id === student_id);
            individualGrade = studentTask?.individual_grade || null;
          }

          // Extract phase_number from phase_snapshot
          const phaseNumber = submission.phase_snapshot?.phase_number || null;
          
          const professor = submission.professoraccounts;
          const professorName = professor 
            ? `${professor.first_name} ${professor.last_name}`.trim()
            : null;

          grades.push({
            id: submission.id,
            projectId: submission.project_id,
            projectTitle: submission.projects.title,
            type: 'phase',
            phaseId: submission.phase_id,  // ✅ ADD THIS - Include phase_id
            phaseNumber: phaseNumber,
            groupGrade: submission.grade,
            individualGrade: individualGrade,
            maxGrade: 100,
            status: submission.graded_at ? 'graded' : 'pending',
            gradedAt: submission.graded_at,
            gradedBy: submission.graded_by,
            gradedByName: professorName,
            feedback: submission.instructor_feedback
          });
        }
      });
    } else {
      console.log('📊 No phase deliverable submissions found for groups:', groupIds);
    }

    // ===== STEP 7: BUILD COMPLETE GRADE SHEET =====
    console.log('📊 Step 7: Building complete grade sheet with ALL projects and phases...');
    
    // Create a map of submissions for quick lookup
    const projectSubmissionMap = new Map();
    projectDeliverables?.forEach(sub => {
      projectSubmissionMap.set(sub.project_id, sub);
    });
    
    const phaseSubmissionMap = new Map();
    phaseDeliverables?.forEach(sub => {
      phaseSubmissionMap.set(`${sub.project_id}_${sub.phase_id}`, sub);
    });
    
    const completeGrades = [];
    
    // Process each project
    allProjects?.forEach(project => {
      const submission = projectSubmissionMap.get(project.id);
      
      let individualGrade = null;
      let professorName = null;
      
      if (submission) {
        // Extract individual grade
        if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
          const studentTask = submission.member_tasks.find(task => task.member_id === student_id);
          individualGrade = studentTask?.individual_grade || null;
        }
        
        // Get professor name
        const professor = submission.professoraccounts;
        professorName = professor 
          ? `${professor.first_name} ${professor.last_name}`.trim()
          : null;
      }
      
      completeGrades.push({
        id: submission?.id || null,
        projectId: project.id,
        projectTitle: project.title,
        type: 'project',
        groupGrade: submission?.grade || null,
        individualGrade: individualGrade,
        maxGrade: 100,
        status: submission?.graded_at ? 'graded' : (submission ? 'submitted' : 'not-submitted'),
        gradedAt: submission?.graded_at || null,
        gradedBy: submission?.graded_by || null,
        gradedByName: professorName,
        feedback: submission?.instructor_feedback || null
      });
      
      // Process all phases for this project
      const projectPhases = allPhases?.filter(phase => phase.project_id === project.id) || [];
      projectPhases.forEach(phase => {
        const phaseSubmission = phaseSubmissionMap.get(`${project.id}_${phase.id}`);
        
        let phaseIndividualGrade = null;
        let phaseProfessorName = null;
        
        if (phaseSubmission) {
          // Extract individual grade
          if (phaseSubmission.member_tasks && Array.isArray(phaseSubmission.member_tasks)) {
            const studentTask = phaseSubmission.member_tasks.find(task => task.member_id === student_id);
            phaseIndividualGrade = studentTask?.individual_grade || null;
          }
          
          // Get professor name
          const professor = phaseSubmission.professoraccounts;
          phaseProfessorName = professor 
            ? `${professor.first_name} ${professor.last_name}`.trim()
            : null;
        }
        
        completeGrades.push({
          id: phaseSubmission?.id || null,
          projectId: project.id,
          projectTitle: project.title,
          type: 'phase',
          phaseId: phase.id,
          phaseNumber: phase.phase_number,
          phaseTitle: phase.title,
          groupGrade: phaseSubmission?.grade || null,
          individualGrade: phaseIndividualGrade,
          maxGrade: 100,
          status: phaseSubmission?.graded_at ? 'graded' : (phaseSubmission ? 'submitted' : 'not-submitted'),
          gradedAt: phaseSubmission?.graded_at || null,
          gradedBy: phaseSubmission?.graded_by || null,
          gradedByName: phaseProfessorName,
          feedback: phaseSubmission?.instructor_feedback || null
        });
      });
    });

    console.log('✅ Grades overview complete - returning', completeGrades.length, 'grades');
    console.log('📊 Grades breakdown:');
    console.log('  - Project grades:', completeGrades.filter(g => g.type === 'project').length);
    console.log('  - Phase grades:', completeGrades.filter(g => g.type === 'phase').length);
    console.log('  - Graded:', completeGrades.filter(g => g.status === 'graded').length);
    console.log('  - Submitted (not graded):', completeGrades.filter(g => g.status === 'submitted').length);
    console.log('  - Not submitted:', completeGrades.filter(g => g.status === 'not-submitted').length);
    console.log('📊 === GRADES OVERVIEW END ===');

    res.json(completeGrades);

  } catch (error) {
    console.error('💥 Grades overview error:', error);
    res.status(500).json({ error: error.message });
  }
});
*/

// Add this endpoint to your student_api.js file

// GET /api/student/projects/:projectId/evaluations - Get evaluations for a specific project
router.get('/projects/:projectId/evaluations', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;
    
    console.log('📝 === PROJECT EVALUATIONS START ===');
    console.log('📝 Project ID:', projectId);
    console.log('📝 Student ID:', student_id);
    
    // Verify student has access to this project
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(
            projects!inner(id)
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .eq('course_groups.courses.projects.id', projectId)
      .single();
    
    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Get phase evaluations submitted by this student
    const { data: phaseEvaluations, error: phaseEvaluationsError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(
          title,
          phase_number,
          start_date,
          end_date,
          project_id
        )
      `)
      .eq('evaluator_id', student_id)
      .eq('project_phases.project_id', projectId)
      .order('project_phases.phase_number', { ascending: true });

    // Get final project evaluations
    const { data: finalEvaluations, error: finalEvaluationsError } = await supabase
      .from('final_project_evaluations')
      .select(`
        *,
        projects!inner(title, id)
      `)
      .eq('evaluator_id', student_id)
      .eq('projects.id', projectId);

    // Get peer evaluations (evaluations about this student from others)
    const { data: peerEvaluations, error: peerEvaluationsError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(
          title,
          phase_number,
          start_date,
          end_date
        ),
        studentaccounts!evaluation_forms_evaluator_id_fkey(first_name, last_name)
      `)
      .eq('evaluated_student_id', student_id)
      .eq('project_phases.project_id', projectId)
      .order('project_phases.phase_number', { ascending: true });

    console.log('✅ Project evaluations retrieved');
    console.log('📝 Phase evaluations:', phaseEvaluations?.length || 0);
    console.log('📝 Final evaluations:', finalEvaluations?.length || 0);
    console.log('📝 Peer evaluations:', peerEvaluations?.length || 0);
    console.log('📝 === PROJECT EVALUATIONS COMPLETE ===');

    res.json({
      phaseEvaluations: phaseEvaluations || [],
      finalEvaluations: finalEvaluations || [],
      peerEvaluations: peerEvaluations || [],
      groupId: membership.group_id,
      userRole: membership.role
    });

  } catch (error) {
    console.error('💥 Project evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/evaluations/overview - Get evaluation overview for all projects
router.get('/evaluations/overview', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('📝 === EVALUATIONS OVERVIEW START ===');
    console.log('📝 Student ID:', student_id);
    
    // Get all evaluations submitted by this student
    const { data: submittedEvaluations, error: submittedError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(
          title,
          phase_number,
          projects!inner(title, id, courses!inner(course_name))
        )
      `)
      .eq('evaluator_id', student_id)
      .order('created_at', { ascending: false });

    // Get all evaluations received by this student (peer evaluations)
    const { data: receivedEvaluations, error: receivedError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases!inner(
          title,
          phase_number,
          projects!inner(title, id, courses!inner(course_name))
        ),
        studentaccounts!evaluation_forms_evaluator_id_fkey(first_name, last_name)
      `)
      .eq('evaluated_student_id', student_id)
      .order('created_at', { ascending: false });

    // Get final project evaluations
    const { data: finalEvaluations, error: finalError } = await supabase
      .from('final_project_evaluations')
      .select(`
        *,
        projects!inner(title, id, courses!inner(course_name))
      `)
      .eq('evaluator_id', student_id)
      .order('created_at', { ascending: false });

    console.log('✅ Evaluations overview retrieved');
    console.log('📝 === EVALUATIONS OVERVIEW COMPLETE ===');

    res.json({
      submittedEvaluations: submittedEvaluations || [],
      receivedEvaluations: receivedEvaluations || [],
      finalEvaluations: finalEvaluations || []
    });

  } catch (error) {
    console.error('💥 Evaluations overview error:', error);
    res.status(500).json({ error: error.message });
  }
});



// Enhanced Announcements endpoint with filtering and search
router.get('/announcements/enhanced', async (req, res) => {
  try {
    const student_id = req.user.id;
    const { type, search, limit = 20, offset = 0 } = req.query;
    
    console.log('📢 Enhanced announcements request:', { student_id, type, search, limit });
    
    // Get student's enrolled courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('student_id', student_id)
      .eq('is_active', true);
    
    if (enrollmentsError) {
      return res.status(500).json({ error: enrollmentsError.message });
    }
    
    const courseIds = (enrollments || []).map(e => e.course_id);
    if (courseIds.length === 0) {
      return res.json({ announcements: [], total: 0 });
    }
    
    // Build query
    let query = supabase
      .from('announcements')
      .select(`
        *,
        courses!inner(course_name, course_code),
        professoraccounts!announcements_created_by_fkey(first_name, last_name)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true);
    
    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    // Apply pagination and ordering
    const { data: announcements, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Format announcements
    const formattedAnnouncements = (announcements || []).map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'general',
      author: announcement.professoraccounts ? 
        `${announcement.professoraccounts.first_name} ${announcement.professoraccounts.last_name}` : 
        'Professor',
      created_at: announcement.created_at,
      updated_at: announcement.updated_at,
      course_name: announcement.courses?.course_name,
      course_code: announcement.courses?.course_code,
      priority: announcement.priority || 'medium'
    }));
    
    res.json({
      announcements: formattedAnnouncements,
      total: count || formattedAnnouncements.length,
      hasMore: (offset + limit) < (count || 0)
    });
    
  } catch (error) {
    console.error('Enhanced announcements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced Notifications endpoint with comprehensive notification types
router.get('/notifications/enhanced', async (req, res) => {
  try {
    const student_id = req.user.id;
    const { type, read_status, limit = 50, offset = 0 } = req.query;
    
    console.log('🔔 Enhanced notifications request:', { student_id, type, read_status, limit });
    
    const notifications = [];
    
    // Get task-related notifications
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects!inner(title, courses!inner(course_name)),
        project_phases!inner(title, phase_number),
        task_submissions(*)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);
    
    if (tasks && !tasksError) {
      tasks.forEach(task => {
        const now = new Date();
        const dueDate = new Date(task.due_date);
        const availableUntil = new Date(task.available_until);
        const isOverdue = dueDate < now && task.status !== 'completed';
        const dueSoon = (dueDate - now) / (1000 * 60 * 60 * 24) <= 2 && !isOverdue;
        const expiringAccess = (availableUntil - now) / (1000 * 60 * 60 * 24) <= 1 && availableUntil > now;
        
        // Overdue notifications
        if (isOverdue) {
          notifications.push({
            id: `overdue-${task.id}`,
            type: 'overdue',
            priority: 'high',
            title: '⚠️ Overdue Task',
            message: `Task "${task.title}" is overdue. Please submit as soon as possible.`,
            date: task.due_date,
            taskId: task.id,
            actionable: true,
            read: false,
            details: {
              taskTitle: task.title,
              dueDate: task.due_date,
              projectTitle: task.projects.title,
              course: task.projects.courses.course_name,
              phase: task.project_phases.title,
              daysOverdue: Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
            }
          });
        }
        
        // Due soon notifications
        if (dueSoon) {
          const hoursLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60));
          notifications.push({
            id: `due-soon-${task.id}`,
            type: 'task',
            priority: 'medium',
            title: '🕐 Task Due Soon',
            message: `Task "${task.title}" is due in ${hoursLeft} hours.`,
            date: task.due_date,
            taskId: task.id,
            actionable: true,
            read: false,
            details: {
              taskTitle: task.title,
              dueDate: task.due_date,
              projectTitle: task.projects.title,
              hoursLeft: hoursLeft
            }
          });
        }
        
        // Access expiring notifications
        if (expiringAccess) {
          notifications.push({
            id: `access-expiring-${task.id}`,
            type: 'system',
            priority: 'medium',
            title: '⏰ Task Access Expiring',
            message: `Access to "${task.title}" expires soon. Submit before it's too late!`,
            date: task.available_until,
            taskId: task.id,
            actionable: true,
            read: false,
            details: {
              taskTitle: task.title,
              expiresAt: task.available_until,
              projectTitle: task.projects.title
            }
          });
        }
        
        // Submission feedback notifications
        if (task.task_submissions && task.task_submissions.length > 0) {
          task.task_submissions.forEach(submission => {
            if (submission.review_comments && submission.reviewed_at) {
              const reviewDate = new Date(submission.reviewed_at);
              const daysSinceReview = (now - reviewDate) / (1000 * 60 * 60 * 24);
              
              if (daysSinceReview <= 7) { // Show feedback from last 7 days
                notifications.push({
                  id: `feedback-${submission.id}`,
                  type: 'feedback',
                  priority: submission.status === 'revision_required' ? 'high' : 'medium',
                  title: submission.status === 'approved' ? '✅ Task Approved' : 
                         submission.status === 'revision_required' ? '📝 Revision Requested' : 
                         '💭 New Feedback',
                  message: `Your submission for "${task.title}" has been reviewed.`,
                  date: submission.reviewed_at,
                  taskId: task.id,
                  submissionId: submission.id,
                  actionable: true,
                  read: false,
                  details: {
                    taskTitle: task.title,
                    reviewer: 'Group Leader',
                    feedback: submission.review_comments,
                    status: submission.status,
                    submissionDate: submission.submission_date
                  }
                });
              }
            }
          });
        }
      });
    }
    
    // Get grade notifications
    const { data: phaseGrades, error: gradeError } = await supabase
      .from('phase_grades')
      .select(`
        *,
        project_phases!inner(
          title, 
          projects!inner(title, courses!inner(course_name))
        ),
        professoraccounts!phase_grades_graded_by_fkey(first_name, last_name)
      `)
      .eq('student_id', student_id)
      .gte('graded_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()); // Last 14 days
    
    if (phaseGrades && !gradeError) {
      phaseGrades.forEach(grade => {
        notifications.push({
          id: `grade-${grade.id}`,
          type: 'grade',
          priority: 'medium',
          title: '📊 New Grade Posted',
          message: `Your grade for "${grade.project_phases.title}" has been posted.`,
          date: grade.graded_at,
          actionable: true,
          read: false,
          details: {
            assignmentName: `${grade.project_phases.projects.title} - ${grade.project_phases.title}`,
            grade: grade.final_phase_grade || grade.individual_grade,
            gradedBy: grade.professoraccounts ? 
              `${grade.professoraccounts.first_name} ${grade.professoraccounts.last_name}` : 
              'Professor',
            feedback: grade.feedback,
            course: grade.project_phases.projects.courses.course_name
          }
        });
      });
    }
    
    // Get project/phase deadline changes (system notifications)
    // This would require tracking changes in your database
    
    // Get group activity notifications
    const { data: groupMemberships } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(group_name, courses!inner(course_name))
      `)
      .eq('student_id', student_id)
      .eq('is_active', true);
    
    if (groupMemberships) {
      groupMemberships.forEach(membership => {
        // New group assignment notification
        const assignedDate = new Date(membership.assigned_at);
        const daysSinceAssigned = (new Date() - assignedDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceAssigned <= 3) {
          notifications.push({
            id: `group-assigned-${membership.id}`,
            type: 'system',
            priority: 'medium',
            title: '👥 Group Assignment',
            message: `You've been assigned to ${membership.course_groups.group_name} as ${membership.role}.`,
            date: membership.assigned_at,
            actionable: false,
            read: false,
            details: {
              groupName: membership.course_groups.group_name,
              role: membership.role,
              course: membership.course_groups.courses.course_name,
              assignedBy: 'Professor'
            }
          });
        }
      });
    }
    
    // Sort notifications by date (newest first)
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply filters
    let filteredNotifications = notifications;
    
    if (type && type !== 'all') {
      filteredNotifications = notifications.filter(n => n.type === type);
    }
    
    if (read_status === 'unread') {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    } else if (read_status === 'read') {
      filteredNotifications = filteredNotifications.filter(n => n.read);
    }
    
    // Apply pagination
    const paginatedNotifications = filteredNotifications.slice(offset, offset + parseInt(limit));
    
    res.json({
      notifications: paginatedNotifications,
      total: filteredNotifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      hasMore: (offset + parseInt(limit)) < filteredNotifications.length,
      summary: {
        total: notifications.length,
        byType: {
          task: notifications.filter(n => n.type === 'task').length,
          feedback: notifications.filter(n => n.type === 'feedback').length,
          grade: notifications.filter(n => n.type === 'grade').length,
          overdue: notifications.filter(n => n.type === 'overdue').length,
          system: notifications.filter(n => n.type === 'system').length
        },
        byPriority: {
          high: notifications.filter(n => n.priority === 'high').length,
          medium: notifications.filter(n => n.priority === 'medium').length,
          low: notifications.filter(n => n.priority === 'low').length
        }
      }
    });
    
  } catch (error) {
    console.error('Enhanced notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read/unread
router.post('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { read = true } = req.body;
    const student_id = req.user.id;
    
    // In a real implementation, you'd store notification read states in database
    // For now, just return success
    console.log(`Marking notification ${notificationId} as ${read ? 'read' : 'unread'} for student ${student_id}`);
    
    res.json({ 
      success: true, 
      message: `Notification marked as ${read ? 'read' : 'unread'}` 
    });
    
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete('/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const student_id = req.user.id;
    
    console.log(`🗑️ Deleting notification ${notificationId} for student ${student_id}`);
    
    // Validate notification ID format
    if (!notificationId) {
      return res.status(400).json({ 
        error: 'Notification ID is required' 
      });
    }
    
    // Parse notification ID to determine type and source
    const notificationParts = notificationId.split('-');
    if (notificationParts.length < 2) {
      return res.status(400).json({ 
        error: 'Invalid notification ID format' 
      });
    }
    
    const [notificationType, sourceId] = notificationParts;
    
    // In a real implementation, you would:
    // 1. Check if the notification belongs to the authenticated user
    // 2. Store deleted notification IDs in a user_deleted_notifications table
    // 3. Or implement soft delete on notification records
    
    // For now, we'll simulate the deletion by storing it in a hypothetical table
    try {
      // Example: Store deleted notification reference
      const { error: deleteError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          student_id: student_id,
          notification_id: notificationId,
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,notification_id'
        });
      
      if (deleteError) {
        console.error('Error storing delete preference:', deleteError);
        // Continue anyway - this is just preference storage
      }
      
      // Log the deletion for audit purposes
      console.log(`📝 Notification ${notificationId} marked as deleted for student ${student_id}`);
      
      res.json({
        success: true,
        message: 'Notification deleted successfully',
        deletedNotificationId: notificationId,
        deletedAt: new Date().toISOString()
      });
      
    } catch (dbError) {
      console.error('Database error during notification deletion:', dbError);
      
      // Even if database storage fails, we can still return success
      // since this is mainly a UI preference
      res.json({
        success: true,
        message: 'Notification deleted successfully (preference not stored)',
        deletedNotificationId: notificationId,
        deletedAt: new Date().toISOString(),
        warning: 'Delete preference could not be persisted'
      });
    }
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      details: error.message 
    });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', async (req, res) => {
  try {
    const student_id = req.user.id;
    const { type } = req.body; // Optional: only mark specific type as read
    
    console.log(`📖 Marking all notifications as read for student ${student_id}`, type ? `of type: ${type}` : '');
    
    // In a real implementation, you would:
    // 1. Update all unread notifications for this user
    // 2. Or store a "read_all_before" timestamp
    
    const readAllTimestamp = new Date().toISOString();
    
    try {
      // Store the read-all preference
      const { error: updateError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          student_id: student_id,
          read_all_before: readAllTimestamp,
          read_all_type: type || 'all',
          updated_at: readAllTimestamp
        }, {
          onConflict: 'student_id'
        });
      
      if (updateError) {
        console.error('Error storing read-all preference:', updateError);
      }
      
      res.json({
        success: true,
        message: type ? `All ${type} notifications marked as read` : 'All notifications marked as read',
        readAllTimestamp: readAllTimestamp,
        type: type || 'all'
      });
      
    } catch (dbError) {
      console.error('Database error during read-all:', dbError);
      
      res.json({
        success: true,
        message: 'All notifications marked as read (preference not stored)',
        readAllTimestamp: readAllTimestamp,
        warning: 'Read preference could not be persisted'
      });
    }
    
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to mark all notifications as read',
      details: error.message 
    });
  }
});

// Get notification settings/preferences
router.get('/notifications/settings', async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log(`⚙️ Getting notification settings for student ${student_id}`);
    
    // Get user's notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('student_id', student_id)
      .single();
    
    // Default settings if no preferences found
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      gradeNotifications: true,
      systemNotifications: true,
      feedbackNotifications: true,
      reminderTiming: {
        overdue: true,
        dueSoon: 24, // hours before due date
        accessExpiring: 24 // hours before access expires
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
    
    const userSettings = preferences ? {
      emailNotifications: preferences.email_notifications ?? defaultSettings.emailNotifications,
      pushNotifications: preferences.push_notifications ?? defaultSettings.pushNotifications,
      taskReminders: preferences.task_reminders ?? defaultSettings.taskReminders,
      gradeNotifications: preferences.grade_notifications ?? defaultSettings.gradeNotifications,
      systemNotifications: preferences.system_notifications ?? defaultSettings.systemNotifications,
      feedbackNotifications: preferences.feedback_notifications ?? defaultSettings.feedbackNotifications,
      reminderTiming: preferences.reminder_timing ?? defaultSettings.reminderTiming,
      quietHours: preferences.quiet_hours ?? defaultSettings.quietHours,
      readAllBefore: preferences.read_all_before,
      readAllType: preferences.read_all_type
    } : defaultSettings;
    
    res.json({
      success: true,
      settings: userSettings,
      hasCustomSettings: !!preferences
    });
    
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ 
      error: 'Failed to get notification settings',
      details: error.message 
    });
  }
});

// Update notification settings/preferences
router.put('/notifications/settings', async (req, res) => {
  try {
    const student_id = req.user.id;
    const settings = req.body;
    
    console.log(`⚙️ Updating notification settings for student ${student_id}:`, settings);
    
    // Validate settings object
    const allowedSettings = [
      'emailNotifications', 'pushNotifications', 'taskReminders', 
      'gradeNotifications', 'systemNotifications', 'feedbackNotifications',
      'reminderTiming', 'quietHours'
    ];
    
    const validSettings = Object.keys(settings).every(key => allowedSettings.includes(key));
    
    if (!validSettings) {
      return res.status(400).json({
        error: 'Invalid settings provided',
        allowedSettings: allowedSettings
      });
    }
    
    // Update preferences in database
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('user_notification_preferences')
      .upsert({
        student_id: student_id,
        email_notifications: settings.emailNotifications,
        push_notifications: settings.pushNotifications,
        task_reminders: settings.taskReminders,
        grade_notifications: settings.gradeNotifications,
        system_notifications: settings.systemNotifications,
        feedback_notifications: settings.feedbackNotifications,
        reminder_timing: settings.reminderTiming,
        quiet_hours: settings.quietHours,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id'
      });
    
    if (updateError) {
      return res.status(500).json({
        error: 'Failed to update notification settings',
        details: updateError.message
      });
    }
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: settings,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ 
      error: 'Failed to update notification settings',
      details: error.message 
    });
  }
});














// GET /api/student/phase-member-tasks - Get tasks for each member in a specific phase and project
router.get('/phase-member-tasks', async (req, res) => {
  try {
    const { projectId, phaseId } = req.query;
    const student_id = req.user.id;

    console.log('📋 Getting member tasks for phase:', phaseId, 'project:', projectId, 'requested by:', student_id);

    // Validate required parameters
    if (!projectId || !phaseId) {
      return res.status(400).json({ error: 'Missing projectId or phaseId' });
    }

    // Get project details including min and max tasks per member
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, min_tasks_per_member, max_tasks_per_member')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify requesting student is in a group for this project
    const { data: requestingMembership, error: requestingError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(
          id,
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (requestingError || !requestingMembership) {
      return res.status(403).json({ error: 'Not in a group' });
    }

    // Get all members in the same group
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', requestingMembership.group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    const memberIds = groupMembers.map(m => m.student_id);
    console.log('👥 Found group members:', memberIds.length);

    // Get all tasks for this project and phase assigned to group members
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        due_date,
        max_attempts,
        current_attempts,
        file_types_allowed,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .in('assigned_to', memberIds)
      .eq('is_active', true)
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('✅ Found tasks:', tasks?.length || 0);

    // Organize tasks by member
    const tasksByMember = {};
    groupMembers.forEach(member => {
      tasksByMember[member.student_id] = {
        member_id: member.student_id,
        member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
        tasks: []
      };
    });

    // Assign tasks to members
    (tasks || []).forEach(task => {
      if (tasksByMember[task.assigned_to]) {
        tasksByMember[task.assigned_to].tasks.push({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          due_date: task.due_date,
          max_attempts: task.max_attempts,
          current_attempts: task.current_attempts,
          file_types_allowed: task.file_types_allowed,
          created_at: task.created_at,
          updated_at: task.updated_at
        });
      }
    });

    // Convert to array and filter out empty members if desired
    const result = Object.values(tasksByMember);

    res.json({
      success: true,
      projectId,
      phaseId,
      minTasksPerMember: project.min_tasks_per_member || 1,
      maxTasksPerMember: project.max_tasks_per_member || 10,
      memberTasksCount: result.length,
      data: result
    });
  } catch (error) {
    console.error('Phase member tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/phase-member-evaluations - Get evaluations for each member in a specific phase and project
router.get('/phase-member-evaluations', async (req, res) => {
  try {
    const { projectId, phaseId } = req.query;
    const student_id = req.user.id;

    console.log('📋 Getting member evaluations for phase:', phaseId, 'project:', projectId, 'requested by:', student_id);

    // Validate required parameters
    if (!projectId || !phaseId) {
      return res.status(400).json({ error: 'Missing projectId or phaseId' });
    }

    // Verify requesting student is in a group for this project
    const { data: requestingMembership, error: requestingError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(
          id,
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (requestingError || !requestingMembership) {
      return res.status(403).json({ error: 'Not in a group' });
    }

    // Get all members in the same group
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', requestingMembership.group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    const memberIds = groupMembers.map(m => m.student_id);
    console.log('👥 Found group members:', memberIds.length);

    // Get all evaluations for this project and phase where members were evaluated
    const { data: evaluations, error: evalsError } = await supabase
      .from('evaluation_submissions')
      .select(`
        id,
        evaluated_student_id,
        evaluator_id,
        score,
        feedback,
        created_at,
        updated_at,
        studentaccounts!evaluation_submissions_evaluator_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .in('evaluated_student_id', memberIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (evalsError) {
      console.error('Error fetching evaluations:', evalsError);
      return res.status(500).json({ error: evalsError.message });
    }

    console.log('✅ Found evaluations:', evaluations?.length || 0);

    // Organize evaluations by evaluated member
    const evalsByMember = {};
    groupMembers.forEach(member => {
      evalsByMember[member.student_id] = {
        member_id: member.student_id,
        member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
        evaluations: []
      };
    });

    // Assign evaluations to members
    (evaluations || []).forEach(evaluation => {
      if (evalsByMember[evaluation.evaluated_student_id]) {
        evalsByMember[evaluation.evaluated_student_id].evaluations.push({
          id: evaluation.id,
          evaluator_name: `${evaluation.studentaccounts.first_name} ${evaluation.studentaccounts.last_name}`,
          score: evaluation.score,
          feedback: evaluation.feedback,
          created_at: evaluation.created_at,
          updated_at: evaluation.updated_at
        });
      }
    });

    // Convert to array
    const result = Object.values(evalsByMember);

    res.json({
      success: true,
      projectId,
      phaseId,
      memberEvalsCount: result.length,
      data: result
    });
  } catch (error) {
    console.error('Phase member evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/project-member-tasks - Get tasks for each member in a project (across all phases)
router.get('/project-member-tasks', async (req, res) => {
  try {
    const { projectId } = req.query;
    const student_id = req.user.id;

    console.log('📋 Getting member tasks for project:', projectId, 'requested by:', student_id);

    // Validate required parameters
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    // Get project details including min and max tasks per member
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, min_tasks_per_member, max_tasks_per_member')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify requesting student is in a group for this project
    const { data: requestingMembership, error: requestingError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(
          id,
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (requestingError || !requestingMembership) {
      return res.status(403).json({ error: 'Not in a group' });
    }

    // Get all members in the same group
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', requestingMembership.group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    const memberIds = groupMembers.map(m => m.student_id);
    console.log('👥 Found group members:', memberIds.length);

    // Get all phases for this project
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title, start_date, end_date')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });

    if (phasesError) {
      console.error('Error fetching phases:', phasesError);
      return res.status(500).json({ error: phasesError.message });
    }

    console.log('📅 Found phases:', phases?.length || 0);

    // Get all tasks for this project assigned to group members (across all phases)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        due_date,
        phase_id,
        max_attempts,
        current_attempts,
        file_types_allowed,
        created_at,
        updated_at,
        project_phases!inner(
          id,
          phase_number,
          title
        )
      `)
      .eq('project_id', projectId)
      .in('assigned_to', memberIds)
      .eq('is_active', true)
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('✅ Found tasks:', tasks?.length || 0);

    // Organize tasks by member
    const tasksByMember = {};
    groupMembers.forEach(member => {
      tasksByMember[member.student_id] = {
        member_id: member.student_id,
        member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
        tasks: []
      };
    });

    // Assign tasks to members
    (tasks || []).forEach(task => {
      if (tasksByMember[task.assigned_to]) {
        const phaseInfo = Array.isArray(task.project_phases) ? task.project_phases[0] : task.project_phases;
        tasksByMember[task.assigned_to].tasks.push({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          due_date: task.due_date,
          phase_id: task.phase_id,
          phase_number: phaseInfo?.phase_number || 'unknown',
          phase_title: phaseInfo?.title || 'Unknown Phase',
          max_attempts: task.max_attempts,
          current_attempts: task.current_attempts,
          file_types_allowed: task.file_types_allowed,
          created_at: task.created_at,
          updated_at: task.updated_at
        });
      }
    });

    // Convert to array
    const result = Object.values(tasksByMember);

    res.json({
      success: true,
      projectId,
      minTasksPerMember: project.min_tasks_per_member || 1,
      maxTasksPerMember: project.max_tasks_per_member || 10,
      memberTasksCount: result.length,
      phases: phases || [],
      data: result
    });
  } catch (error) {
    console.error('Project member tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/project-member-evaluations - Get evaluations for each member in a project
router.get('/project-member-evaluations', async (req, res) => {
  try {
    const { projectId } = req.query;
    const student_id = req.user.id;

    console.log('📋 Getting member evaluations for project:', projectId, 'requested by:', student_id);

    // Validate required parameters
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    // Verify requesting student is in a group for this project
    const { data: requestingMembership, error: requestingError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        student_id,
        course_groups!inner(
          id,
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (requestingError || !requestingMembership) {
      return res.status(403).json({ error: 'Not in a group' });
    }

    // Get all members in the same group
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', requestingMembership.group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    const memberIds = groupMembers.map(m => m.student_id);
    console.log('👥 Found group members:', memberIds.length);

    // Get all task evaluations for this project assigned to group members (across all phases)
    const { data: evaluations, error: evalsError } = await supabase
      .from('task_evaluations')
      .select(`
        id,
        task_id,
        evaluated_member_id,
        evaluator_name,
        score,
        feedback,
        evaluation_type,
        phase_id,
        created_at,
        updated_at,
        tasks(project_id)
      `)
      .in('evaluated_member_id', memberIds)
      .eq('tasks.project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (evalsError) {
      console.error('Error fetching evaluations:', evalsError);
      return res.status(500).json({ error: evalsError.message });
    }

    console.log('✅ Found evaluations:', evaluations?.length || 0);

    // Organize evaluations by member
    const evalsByMember = {};
    groupMembers.forEach(member => {
      evalsByMember[member.student_id] = {
        member_id: member.student_id,
        member_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
        evaluations: []
      };
    });

    // Assign evaluations to members
    (evaluations || []).forEach(evaluation => {
      if (evalsByMember[evaluation.evaluated_member_id]) {
        evalsByMember[evaluation.evaluated_member_id].evaluations.push({
          id: evaluation.id,
          task_id: evaluation.task_id,
          evaluator_name: evaluation.evaluator_name,
          score: evaluation.score,
          feedback: evaluation.feedback,
          evaluation_type: evaluation.evaluation_type,
          phase_id: evaluation.phase_id,
          created_at: evaluation.created_at,
          updated_at: evaluation.updated_at
        });
      }
    });

    // Convert to array
    const result = Object.values(evalsByMember);

    res.json({
      success: true,
      projectId,
      memberEvalsCount: result.length,
      data: result
    });
  } catch (error) {
    console.error('Project member evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/project/:projectId/feedbacks - Get all feedbacks for a project
router.get('/project/:projectId/feedbacks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📝 Fetching feedbacks for project:', projectId, 'student:', student_id);

    // Get student's group for this project
    const { data: groupMembership, error: groupError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        course_groups!inner(
          id,
          course_id
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .limit(1);

    if (groupError) {
      console.error('Error fetching group membership:', groupError);
      return res.status(500).json({ error: groupError.message });
    }

    if (!groupMembership || groupMembership.length === 0) {
      console.log('Student not in any group');
      return res.json([]);
    }

    const groupId = groupMembership[0].group_id;
    console.log('📝 Student group ID:', groupId);

    // Fetch project deliverable submission feedback
    const { data: projectSubmission, error: projectError } = await supabase
      .from('project_deliverable_submissions')
      .select(`
        id,
        instructor_feedback,
        graded_at,
        graded_by,
        grade,
        professoraccounts!project_deliverable_submissions_graded_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .not('instructor_feedback', 'is', null)
      .order('graded_at', { ascending: false });

    if (projectError) {
      console.error('Error fetching project feedbacks:', projectError);
      return res.status(500).json({ error: projectError.message });
    }

    // Fetch phase deliverable submission feedbacks
    const { data: phaseSubmissions, error: phaseError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`
        id,
        phase_id,
        instructor_feedback,
        graded_at,
        graded_by,
        grade,
        project_phases!inner(phase_number, title),
        professoraccounts!phase_deliverable_submissions_graded_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .not('instructor_feedback', 'is', null)
      .order('graded_at', { ascending: false });

    if (phaseError) {
      console.error('Error fetching phase feedbacks:', phaseError);
      return res.status(500).json({ error: phaseError.message });
    }

    console.log('📝 Found project feedbacks:', projectSubmission?.length || 0);
    console.log('📝 Found phase feedbacks:', phaseSubmissions?.length || 0);

    const feedbacks = [];

    // Add project-level feedback
    if (projectSubmission && projectSubmission.length > 0) {
      projectSubmission.forEach(submission => {
        const professor = submission.professoraccounts;
        feedbacks.push({
          id: submission.id,
          type: 'project',
          feedback: submission.instructor_feedback,
          grade: submission.grade,
          created_at: submission.graded_at,
          graded_by: submission.graded_by,
          graded_by_name: professor ? `${professor.first_name} ${professor.last_name}`.trim() : 'Unknown',
          project_id: projectId
        });
      });
    }

    // Add phase-level feedbacks
    if (phaseSubmissions && phaseSubmissions.length > 0) {
      phaseSubmissions.forEach(submission => {
        const professor = submission.professoraccounts;
        feedbacks.push({
          id: submission.id,
          type: 'phase',
          phase_id: submission.phase_id,
          phase_number: submission.project_phases?.phase_number,
          phase_title: submission.project_phases?.title,
          feedback: submission.instructor_feedback,
          grade: submission.grade,
          created_at: submission.graded_at,
          graded_by: submission.graded_by,
          graded_by_name: professor ? `${professor.first_name} ${professor.last_name}`.trim() : 'Unknown',
          project_id: projectId
        });
      });
    }

    // Sort by date (most recent first)
    feedbacks.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    console.log('✅ Returning', feedbacks.length, 'feedbacks');
    res.json(feedbacks);

  } catch (error) {
    console.error('Feedbacks error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;