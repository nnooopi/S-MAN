const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

// =================== GET ENDPOINTS ===================

/**
 * GET /api/task-assignment/projects
 * Get all active projects for a leader
 */
router.get('/projects', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all active projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title, description, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (projectError) {
      console.error('Error fetching projects:', projectError);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    res.json({ projects: projects || [] });
  } catch (error) {
    console.error('Error in GET /projects:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/task-assignment/projects/:projectId/members
 * Get all group members for a project (group that current leader is part of)
 */
router.get('/projects/:projectId/members', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { projectId } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get current user's student account
    const { data: currentStudent, error: studentError } = await supabase
      .from('studentaccounts')
      .select('id, email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (studentError || !currentStudent) {
      return res.status(404).json({ error: 'Student account not found' });
    }

    // Get the project to find its course_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get the group that this student is a leader of in that course
    const { data: groups, error: groupError } = await supabase
      .from('course_groups')
      .select(`
        id,
        course_group_members (
          id,
          student_id,
          role,
          studentaccounts (
            id,
            first_name,
            last_name,
            email,
            profile_image_url
          )
        )
      `)
      .eq('course_id', project.course_id)
      .eq('course_group_members.student_id', currentStudent.id)
      .eq('course_group_members.role', 'leader');

    if (groupError) {
      console.error('Error fetching groups:', groupError);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    if (!groups || groups.length === 0) {
      return res.status(403).json({ error: 'User is not a leader of any group for this project' });
    }

    // Get all members from the leader's group
    const groupId = groups[0].id;
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        id,
        student_id,
        role,
        studentaccounts (
          id,
          first_name,
          last_name,
          email,
          profile_image_url
        )
      `)
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    // Format member data
    const formattedMembers = (groupMembers || [])
      .filter(member => member.studentaccounts) // Ensure student data exists
      .map(member => ({
        student_id: member.student_id,
        name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
        email: member.studentaccounts.email,
        role: member.role,
        profile_image_url: member.studentaccounts.profile_image_url
      }));

    res.json({ 
      members: formattedMembers,
      groupId: groupId
    });
  } catch (error) {
    console.error('Error in GET /projects/:projectId/members:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/task-assignment/projects/:projectId/phases
 * Get all phases for a project with min/max task limits
 */
router.get('/projects/:projectId/phases', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { projectId } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get project with min/max tasks
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, min_tasks_per_member, max_tasks_per_member')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('📌 [PROJECT] Min tasks:', project.min_tasks_per_member, 'Max tasks:', project.max_tasks_per_member);

    // Get project phases
    const { data: phases, error: phaseError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title, description, start_date, end_date')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });

    if (phaseError) {
      console.error('Error fetching phases:', phaseError);
      return res.status(500).json({ error: 'Failed to fetch phases' });
    }

    console.log('📋 [PHASES] Fetched phases:', phases.map(p => ({ id: p.id, phase_number: p.phase_number })));

    // Build array of phase IDs for the .in() filter
    const phaseIds = phases.map(p => p.id);
    console.log('🔍 [PHASE IDS] Looking for eval forms and breathe periods for:', phaseIds);

    // Fetch phase evaluation forms separately
    const { data: phaseEvalForms, error: evalError } = await supabase
      .from('phase_evaluation_forms')
      .select('id, phase_id, available_from, due_date')
      .in('phase_id', phaseIds);

    console.log('📅 [EVAL FORMS] Fetched:', phaseEvalForms?.length || 0, 'forms -', phaseEvalForms?.map(f => ({ phase_id: f.phase_id, available_from: f.available_from })));

    if (evalError) {
      console.error('❌ [EVAL ERROR] Error fetching phase evaluation forms:', evalError);
      // Don't fail - just continue with null eval dates
    }

    // Fetch phase breathe periods separately
    const { data: breathePeriods, error: breatheError } = await supabase
      .from('phase_breathe_periods')
      .select('id, phase_id, start_date, end_date, duration_days')
      .in('phase_id', phaseIds);

    console.log('⏱️ [BREATHE PERIODS] Fetched:', breathePeriods?.length || 0, 'periods -', breathePeriods?.map(b => ({ phase_id: b.phase_id, start_date: b.start_date })));

    if (breatheError) {
      console.error('❌ [BREATHE ERROR] Error fetching phase breathe periods:', breatheError);
      // Don't fail - just continue with null breathe dates
    }

    // Create maps for merging
    const evalFormsMap = {};
    (phaseEvalForms || []).forEach(form => {
      evalFormsMap[form.phase_id] = form;
    });

    const breathePeriodsMap = {};
    (breathePeriods || []).forEach(period => {
      breathePeriodsMap[period.phase_id] = period;
    });

    // Merge evaluation forms and breathe periods into phases
    const enrichedPhases = phases.map(phase => {
      const evalForm = evalFormsMap[phase.id];
      const breathePeriod = breathePeriodsMap[phase.id];
      return {
        ...phase,
        evaluation_available_from: evalForm?.available_from || null,
        evaluation_due_date: evalForm?.due_date || null,
        breathe_start_date: breathePeriod?.start_date || null,
        breathe_end_date: breathePeriod?.end_date || null,
        breathe_duration_days: breathePeriod?.duration_days || null
      };
    });

    console.log('✨ [ENRICHED PHASES]:', enrichedPhases.map(p => ({
      phase_number: p.phase_number,
      hasEval: !!(p.evaluation_available_from && p.evaluation_due_date),
      hasBrethe: !!(p.breathe_start_date && p.breathe_end_date)
    })));

    res.json({ 
      project: {
        id: project.id,
        min_tasks_per_member: project.min_tasks_per_member,
        max_tasks_per_member: project.max_tasks_per_member
      },
      phases: enrichedPhases || [] 
    });
  } catch (error) {
    console.error('Error in GET /projects/:projectId/phases:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/task-assignment/projects/:projectId/member-task-counts
 * Get the count of tasks assigned to each member in a project
 */
router.get('/projects/:projectId/member-task-counts', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { projectId } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get all tasks assigned to members in this project, grouped by member
    const { data: taskCounts, error: tasksError } = await supabase
      .from('tasks')
      .select('assigned_to_student_id')
      .eq('project_id', projectId)
      .not('assigned_to_student_id', 'is', null);

    if (tasksError) {
      console.error('Error fetching task counts:', tasksError);
      return res.status(500).json({ error: 'Failed to fetch task counts' });
    }

    // Group tasks by member
    const memberTaskCounts = {};
    (taskCounts || []).forEach(task => {
      const memberId = task.assigned_to_student_id;
      memberTaskCounts[memberId] = (memberTaskCounts[memberId] || 0) + 1;
    });

    console.log('📊 [MEMBER TASK COUNTS]:', memberTaskCounts);

    res.json({ memberTaskCounts });
  } catch (error) {
    console.error('Error in GET /member-task-counts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =================== POST ENDPOINTS ===================

/**
 * POST /api/task-assignment/create
 * Create a new task assignment for a student
 * 
 * Body: {
 *   project_id: string,
 *   student_id: string,
 *   phase_id: string,
 *   title: string,
 *   description: string,
 *   max_attempts: number,
 *   due_date: string (YYYY-MM-DD),
 *   due_time: string (HH:MM, optional),
 *   available_until_date: string (YYYY-MM-DD, optional),
 *   available_until_time: string (HH:MM, optional),
 *   file_types_allowed: string[] (optional)
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      project_id,
      student_id,
      phase_id,
      title,
      description,
      max_attempts = 1,
      due_date,
      due_time,
      available_until_date,
      available_until_time,
      file_types_allowed = []
    } = req.body;

    // Validation
    if (!project_id || !student_id || !phase_id || !title || !description || !due_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: project_id, student_id, phase_id, title, description, due_date' 
      });
    }

    // Verify current user is a leader of the group that contains the target student
    const { data: currentStudent } = await supabase
      .from('studentaccounts')
      .select('id')
      .eq('id', user.id)
      .single();

    // Get current user's group for this project
    const { data: project } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', project_id)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: leaderGroups } = await supabase
      .from('course_groups')
      .select(`
        id,
        course_group_members (
          student_id,
          role
        )
      `)
      .eq('course_id', project.course_id)
      .eq('course_group_members.student_id', currentStudent.id)
      .eq('course_group_members.role', 'leader');

    if (!leaderGroups || leaderGroups.length === 0) {
      return res.status(403).json({ error: 'You must be a leader to assign tasks' });
    }

    // Verify target student is in the leader's group
    const groupId = leaderGroups[0].id;
    const { data: targetMember } = await supabase
      .from('course_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .single();

    if (!targetMember) {
      return res.status(403).json({ error: 'Target student is not in your group' });
    }

    // Get the phase to validate dates against phase boundaries
    const { data: phaseData } = await supabase
      .from('project_phases')
      .select('start_date, end_date')
      .eq('id', phase_id)
      .single();

    if (!phaseData) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Build due date/time first (combine date and time before validation)
    let dueDateTime = due_date;
    if (due_time) {
      dueDateTime = `${due_date}T${due_time}:00`;
    } else {
      dueDateTime = `${due_date}T00:00:00`;
    }

    // Validate due date is within phase bounds
    const dueDateObj = new Date(dueDateTime);
    const phaseStart = new Date(phaseData.start_date);
    const phaseEnd = new Date(phaseData.end_date);
    const now = new Date();

    // Check if due date is in the past
    if (dueDateObj < now) {
      return res.status(400).json({ 
        error: 'Due date cannot be in the past' 
      });
    }

    if (dueDateObj < phaseStart || dueDateObj > phaseEnd) {
      return res.status(400).json({ 
        error: `Due date must be within the phase period (${phaseData.start_date} to ${phaseData.end_date})` 
      });
    }

    // Validate available_until date if provided
    let availableUntilDateTime = null;
    if (available_until_date) {
      availableUntilDateTime = available_until_date;
      if (available_until_time) {
        availableUntilDateTime = `${available_until_date}T${available_until_time}:00`;
      } else {
        availableUntilDateTime = `${available_until_date}T00:00:00`;
      }

      const availUntilObj = new Date(availableUntilDateTime);
      
      if (availUntilObj < now) {
        return res.status(400).json({ 
          error: 'Available until date cannot be in the past' 
        });
      }

      if (availUntilObj < phaseStart || availUntilObj > phaseEnd) {
        return res.status(400).json({ 
          error: `Available until date must be within the phase period (${phaseData.start_date} to ${phaseData.end_date})` 
        });
      }

      // Check if due_date is after available_until_date
      if (dueDateObj > availUntilObj) {
        return res.status(400).json({ 
          error: 'Due date cannot be after the available until date' 
        });
      }
    }

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        project_id,
        phase_id,
        title,
        description,
        assigned_to: student_id,
        assigned_by: user.id,
        max_attempts,
        due_date: dueDateTime,
        available_until: availableUntilDateTime,
        file_types_allowed: file_types_allowed.length > 0 ? file_types_allowed : [],
        created_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return res.status(500).json({ error: 'Failed to create task', details: taskError.message });
    }

    // Log activity
    await supabase
      .from('activities_log')
      .insert({
        user_id: user.id,
        action: 'task_assigned',
        description: `Assigned task "${title}" to student`,
        entity_type: 'task',
        entity_id: task.id,
        created_at: new Date().toISOString()
      });

    res.status(201).json({ 
      success: true,
      message: 'Task assigned successfully',
      task: task
    });
  } catch (error) {
    console.error('Error in POST /create:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * POST /api/task-assignment/bulk-create
 * Create multiple task assignments at once
 * 
 * Body: {
 *   project_id: string,
 *   phase_id: string,
 *   student_ids: string[],
 *   title: string,
 *   description: string,
 *   max_attempts: number,
 *   due_date: string (YYYY-MM-DD),
 *   due_time: string (HH:MM, optional),
 *   available_until_date: string (YYYY-MM-DD, optional),
 *   available_until_time: string (HH:MM, optional),
 *   file_types_allowed: string[] (optional)
 * }
 */
router.post('/bulk-create', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      project_id,
      phase_id,
      student_ids,
      title,
      description,
      max_attempts = 1,
      due_date,
      due_time,
      available_until_date,
      available_until_time,
      file_types_allowed = []
    } = req.body;

    // Validation
    if (!project_id || !phase_id || !student_ids || student_ids.length === 0 || !title || !description || !due_date) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Verify current user is a leader
    const { data: currentStudent } = await supabase
      .from('studentaccounts')
      .select('id')
      .eq('id', user.id)
      .single();

    // Get project to find course_id
    const { data: projectData } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', project_id)
      .single();

    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: leaderGroups } = await supabase
      .from('course_groups')
      .select('id')
      .eq('course_id', projectData.course_id)
      .eq('course_group_members.student_id', currentStudent.id)
      .eq('course_group_members.role', 'leader');

    if (!leaderGroups || leaderGroups.length === 0) {
      return res.status(403).json({ error: 'You must be a leader to assign tasks' });
    }

    // Get the phase to validate dates against phase boundaries
    const { data: phaseData } = await supabase
      .from('project_phases')
      .select('start_date, end_date')
      .eq('id', phase_id)
      .single();

    if (!phaseData) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Build due date/time first (combine date and time before validation)
    let dueDateTime = due_date;
    if (due_time) {
      dueDateTime = `${due_date}T${due_time}:00`;
    } else {
      dueDateTime = `${due_date}T00:00:00`;
    }

    // Validate due date is within phase bounds
    const dueDateObj = new Date(dueDateTime);
    const phaseStart = new Date(phaseData.start_date);
    const phaseEnd = new Date(phaseData.end_date);
    const now = new Date();

    // Check if due date is in the past
    if (dueDateObj < now) {
      return res.status(400).json({ 
        error: 'Due date cannot be in the past' 
      });
    }

    if (dueDateObj < phaseStart || dueDateObj > phaseEnd) {
      return res.status(400).json({ 
        error: `Due date must be within the phase period (${phaseData.start_date} to ${phaseData.end_date})` 
      });
    }

    // Validate available_until date if provided
    let availableUntilDateTime = null;
    if (available_until_date) {
      availableUntilDateTime = available_until_date;
      if (available_until_time) {
        availableUntilDateTime = `${available_until_date}T${available_until_time}:00`;
      } else {
        availableUntilDateTime = `${available_until_date}T00:00:00`;
      }

      const availUntilObj = new Date(availableUntilDateTime);
      
      if (availUntilObj < now) {
        return res.status(400).json({ 
          error: 'Available until date cannot be in the past' 
        });
      }

      if (availUntilObj < phaseStart || availUntilObj > phaseEnd) {
        return res.status(400).json({ 
          error: `Available until date must be within the phase period (${phaseData.start_date} to ${phaseData.end_date})` 
        });
      }

      // Check if due_date is after available_until_date
      if (dueDateObj > availUntilObj) {
        return res.status(400).json({ 
          error: 'Due date cannot be after the available until date' 
        });
      }
    }

    // Create tasks for all students
    const tasks = student_ids.map(student_id => ({
      project_id,
      phase_id,
      title,
      description,
      assigned_to: student_id,
      assigned_by: user.id,
      max_attempts,
      due_date: dueDateTime,
      available_until: availableUntilDateTime,
      file_types_allowed: file_types_allowed.length > 0 ? file_types_allowed : [],
      created_at: new Date().toISOString(),
      is_active: true
    }));

    const { data: createdTasks, error: bulkError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (bulkError) {
      console.error('Error creating bulk tasks:', bulkError);
      return res.status(500).json({ error: 'Failed to create tasks', details: bulkError.message });
    }

    res.status(201).json({ 
      success: true,
      message: `Successfully assigned task to ${createdTasks.length} students`,
      tasks: createdTasks
    });
  } catch (error) {
    console.error('Error in POST /bulk-create:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// =================== GET ASSIGNMENT HISTORY ===================

/**
 * GET /api/task-assignment/my-assignments
 * Get all tasks assigned by current user
 */
router.get('/my-assignments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get tasks assigned by this user
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        studentaccounts:assigned_to (
          id,
          first_name,
          last_name,
          email
        ),
        project_phases (
          id,
          phase_number,
          title
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching assignments:', tasksError);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json({ 
      assignments: tasks || [],
      count: (tasks || []).length
    });
  } catch (error) {
    console.error('Error in GET /my-assignments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/task-assignment/projects/:projectId/phases/:phaseId/assignments
 * Get all task assignments for a specific phase to calculate member task counts
 */
router.get('/projects/:projectId/phases/:phaseId/assignments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { projectId, phaseId } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this project (is a leader in any group for this project)
    const { data: projectGroups, error: groupError } = await supabase
      .from('course_groups')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (groupError) {
      console.error('Error verifying project access:', groupError);
      return res.status(500).json({ error: 'Failed to verify project access' });
    }

    if (!projectGroups || projectGroups.length === 0) {
      return res.status(403).json({ error: 'Project not found or you do not have access' });
    }

    // Get all task assignments for this phase
    const { data: assignments, error: assignmentsError } = await supabase
      .from('tasks')
      .select('id, assigned_to_student_id, assigned_to, phase_id')
      .eq('phase_id', phaseId)
      .eq('is_active', true)
      .in('group_id', projectGroups.map(g => g.id));

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json({
      assignments: assignments || [],
      count: (assignments || []).length
    });
  } catch (error) {
    console.error('Error in GET /phases/:phaseId/assignments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
