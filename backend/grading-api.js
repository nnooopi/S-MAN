const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware to authenticate professor
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
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get professor details
    const { data: professor, error: professorError } = await supabase
      .from('professoraccounts')
      .select('*')
      .eq('id', user.id)
      .single();

    if (professorError || !professor) {
      return res.status(403).json({ error: 'Professor account not found' });
    }

    req.user = professor;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// GET /api/grading/projects/:projectId/groups - Get groups that have submitted for a project
router.get('/projects/:projectId/groups', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 Getting groups with submissions for project:', projectId);
    
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

    // Get groups that have submitted for this project
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select(`
        id,
        status,
        submission_date,
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
      groups: submissions || []
    });

  } catch (error) {
    console.error('Error getting groups with submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/grading/groups/:groupId/project/:projectId - Get detailed submission data for a group's project
router.get('/groups/:groupId/project/:projectId', authenticateProfessor, async (req, res) => {
  try {
    const { groupId, projectId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 Getting detailed submissions for group:', groupId, 'project:', projectId);
    
    // Verify access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        course:courses(
          professor_id
        )
      `)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project || project.course.professor_id !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project submission
    const { data: projectSubmission, error: projectSubmissionError } = await supabase
      .from('project_submissions')
      .select(`
        *,
        submitted_by_student:studentaccounts(
          id,
          first_name,
          last_name,
          student_number
        )
      `)
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .single();

    if (projectSubmissionError) {
      console.error('Error fetching project submission:', projectSubmissionError);
      return res.status(500).json({ error: projectSubmissionError.message });
    }

    // Get all phases for this project
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });

    if (phasesError) {
      console.error('Error fetching phases:', phasesError);
      return res.status(500).json({ error: phasesError.message });
    }

    console.log(`🔍 Found ${phases?.length || 0} phases for project ${projectId}:`, phases?.map(p => ({ id: p.id, title: p.title })));

    // Get phase submissions for this group
    const phaseIds = phases.map(phase => phase.id);
    let phaseSubmissions = [];
    
    if (phaseIds.length > 0) {
      const { data: phaseSubmissionsData, error: phaseSubmissionsError } = await supabase
        .from('phase_submissions')
        .select(`
          *,
          phase:project_phases(
            id,
            title,
            phase_number,
            description
          ),
          submitted_by_student:studentaccounts(
            id,
            first_name,
            last_name,
            student_number
          )
        `)
        .in('phase_id', phaseIds)
        .eq('group_id', groupId)
        .order('phase.phase_number', { ascending: true });

      if (!phaseSubmissionsError) {
        phaseSubmissions = phaseSubmissionsData || [];
      }
    }

    // Get tasks for each phase and their submissions
    let taskSubmissions = [];
    console.log(`🔄 Processing ${phases?.length || 0} phases for task submissions...`);
    
    for (const phase of phases || []) {
      console.log(`\n🔍 Processing phase: "${phase.title}" (${phase.id})`);
      
      // Get tasks for this phase
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          phase_id,
          assigned_to,
          due_date,
          task_type
        `)
        .eq('phase_id', phase.id)
        .order('created_at', { ascending: true });
        
      console.log(`📋 Found ${tasks?.length || 0} tasks for phase "${phase.title}"`);

      if (tasksError) {
        console.error(`❌ Error getting tasks for phase ${phase.title}:`, tasksError);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        console.log(`⚠️ No tasks found for phase "${phase.title}", skipping...`);
        continue;
      }
      
      // Get task submissions for each task assigned to members of this group
      // First, check if we have frozen submissions (from when leader submitted phase)
        console.log(`🔍 Checking for frozen task submissions for phase ${phase.id} (${phase.title})`);
        
        const { data: frozenSubmissions, error: frozenError } = await supabase
          .from('frozen_task_submissions')
          .select(`
            *,
            student:studentaccounts(
              id,
              first_name,
              last_name,
              student_number
            )
          `)
          .eq('phase_id', phase.id)
          .eq('group_id', groupId)
          .order('frozen_at', { ascending: false });
          
        console.log(`🔍 Frozen query result for phase ${phase.title}:`, { 
          error: frozenError, 
          found: frozenSubmissions?.length || 0,
          phaseId: phase.id,
          groupId: groupId
        });
          
        if (!frozenError && frozenSubmissions && frozenSubmissions.length > 0) {
          console.log(`✅ Found ${frozenSubmissions.length} frozen task submissions for phase ${phase.title}`);
          
          // Use frozen submissions (these are the "final" versions when leader submitted)
          const frozenTaskSubmissions = frozenSubmissions.map(frozen => ({
            id: frozen.id,
            task_id: frozen.task_id,
            submitted_by: frozen.student_id,
            submission_text: frozen.submission_text,
            file_urls: frozen.file_urls,
            status: frozen.original_status,
            submitted_at: frozen.original_submitted_at || frozen.frozen_at,
            is_frozen: true,
            frozen_at: frozen.frozen_at,
            frozen_by_leader: frozen.frozen_by_leader,
            task: {
              id: frozen.task_id,
              title: frozen.task_title,
              description: frozen.task_description,
              task_type: 'frozen',
              due_date: null
            },
            submitted_by_student: frozen.student,
            phase: {
              id: phase.id,
              phase_number: phase.phase_number,
              title: phase.title
            }
          }));
          
          taskSubmissions.push(...frozenTaskSubmissions);
        } else {
          console.log(`⚠️ No frozen submissions found for phase ${phase.title}, using live task submissions`);
          
          // Fallback to regular task submissions (live data)
          for (const task of tasks) {
            const { data: taskSubs, error: taskSubsError } = await supabase
              .from('task_submissions')
              .select(`
                *,
                task:tasks(
                  id,
                  title,
                  description,
                  task_type,
                  due_date
                ),
                submitted_by_student:studentaccounts(
                  id,
                  first_name,
                  last_name,
                  student_number
                )
              `)
              .eq('task_id', task.id)
              .order('submitted_at', { ascending: false });

            if (!taskSubsError && taskSubs) {
              // Filter to only show submissions from group members
              const groupMemberIds = group?.members?.map(m => m.student.id) || [];
              const groupTaskSubs = taskSubs.filter(sub => 
                groupMemberIds.includes(sub.submitted_by)
              );
              
              // Add phase info and mark as live
              const taskSubsWithPhase = groupTaskSubs.map(sub => ({
                ...sub,
                is_frozen: false,
                phase: {
                  id: phase.id,
                  phase_number: phase.phase_number,
                  title: phase.title
                }
              }));
              taskSubmissions.push(...taskSubsWithPhase);
            }
          }
        }
      }
    }

    // Get group information
    const { data: group, error: groupError } = await supabase
      .from('course_groups')
      .select(`
        *,
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
      `)
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Error fetching group:', groupError);
      return res.status(500).json({ error: groupError.message });
    }

    console.log('✅ Found project submission,', phaseSubmissions.length, 'phase submissions, and', taskSubmissions.length, 'task submissions');

    res.json({
      success: true,
      project,
      group,
      projectSubmission,
      phases,
      phaseSubmissions,
      taskSubmissions
    });

  } catch (error) {
    console.error('Error getting detailed group submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grading/project-submissions/:submissionId/grade - Grade a project submission
router.post('/project-submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, individualGrades } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading project submission:', submissionId);
    
    // Update the project submission
    const { error: updateError } = await supabase
      .from('project_submissions')
      .update({
        grade: grade,
        feedback: feedback,
        graded_by: professorId,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Handle individual grades if provided
    if (individualGrades && Array.isArray(individualGrades)) {
      for (const individualGrade of individualGrades) {
        const { studentId, grade: studentGrade, feedback: studentFeedback } = individualGrade;
        
        // Check if individual grade already exists
        const { data: existingGrade, error: checkError } = await supabase
          .from('individual_grades')
          .select('id')
          .eq('project_submission_id', submissionId)
          .eq('student_id', studentId)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking individual grade:', checkError);
          continue;
        }
        
        if (existingGrade) {
          // Update existing individual grade
          const { error: updateIndividualError } = await supabase
            .from('individual_grades')
            .update({
              grade: studentGrade,
              feedback: studentFeedback,
              graded_by: professorId,
              graded_at: new Date().toISOString()
            })
            .eq('id', existingGrade.id);
            
          if (updateIndividualError) {
            console.error('Error updating individual grade:', updateIndividualError);
          }
        } else {
          // Create new individual grade
          const { error: insertIndividualError } = await supabase
            .from('individual_grades')
            .insert({
              project_submission_id: submissionId,
              student_id: studentId,
              grade: studentGrade,
              feedback: studentFeedback,
              grade_type: 'project',
              graded_by: professorId
            });
            
          if (insertIndividualError) {
            console.error('Error inserting individual grade:', insertIndividualError);
          }
        }
      }
    }
    
    console.log('✅ Project submission graded successfully');
    
    res.json({
      success: true,
      message: 'Project submission graded successfully'
    });
    
  } catch (error) {
    console.error('Error grading project submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grading/phase-submissions/:submissionId/grade - Grade a phase submission
router.post('/phase-submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, individualGrades } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading phase submission:', submissionId);
    
    // Update the phase submission
    const { error: updateError } = await supabase
      .from('phase_submissions')
      .update({
        grade: grade,
        feedback: feedback,
        graded_by: professorId,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Handle individual grades if provided
    if (individualGrades && Array.isArray(individualGrades)) {
      for (const individualGrade of individualGrades) {
        const { studentId, grade: studentGrade, feedback: studentFeedback } = individualGrade;
        
        // Check if individual grade already exists
        const { data: existingGrade, error: checkError } = await supabase
          .from('individual_grades')
          .select('id')
          .eq('phase_submission_id', submissionId)
          .eq('student_id', studentId)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking individual grade:', checkError);
          continue;
        }
        
        if (existingGrade) {
          // Update existing individual grade
          const { error: updateIndividualError } = await supabase
            .from('individual_grades')
            .update({
              grade: studentGrade,
              feedback: studentFeedback,
              graded_by: professorId,
              graded_at: new Date().toISOString()
            })
            .eq('id', existingGrade.id);
            
          if (updateIndividualError) {
            console.error('Error updating individual grade:', updateIndividualError);
          }
        } else {
          // Create new individual grade
          const { error: insertIndividualError } = await supabase
            .from('individual_grades')
            .insert({
              phase_submission_id: submissionId,
              student_id: studentId,
              grade: studentGrade,
              feedback: studentFeedback,
              grade_type: 'phase',
              graded_by: professorId
            });
            
          if (insertIndividualError) {
            console.error('Error inserting individual grade:', insertIndividualError);
          }
        }
      }
    }
    
    console.log('✅ Phase submission graded successfully');
    
    res.json({
      success: true,
      message: 'Phase submission graded successfully'
    });
    
  } catch (error) {
    console.error('Error grading phase submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grading/task-submissions/:submissionId/grade - Grade a task submission
router.post('/task-submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const professorId = req.user.id;
    
    console.log('📝 Grading task submission:', submissionId);
    
    // Get task submission details
    const { data: taskSubmission, error: taskSubmissionError } = await supabase
      .from('task_submissions')
      .select('student_id, group_id')
      .eq('id', submissionId)
      .single();
    
    if (taskSubmissionError || !taskSubmission) {
      throw new Error('Task submission not found');
    }
    
    // Update the task submission
    const { error: updateError } = await supabase
      .from('task_submissions')
      .update({
        grade: grade,
        feedback: feedback,
        graded_by: professorId,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Create individual grade record for task
    const { error: insertIndividualError } = await supabase
      .from('individual_grades')
      .upsert({
        task_submission_id: submissionId,
        student_id: taskSubmission.student_id,
        group_id: taskSubmission.group_id,
        grade: grade,
        feedback: feedback,
        grade_type: 'task',
        graded_by: professorId,
        is_override: false
      });
        
    if (insertIndividualError) {
      console.error('Error inserting individual task grade:', insertIndividualError);
    }
    
    console.log('✅ Task submission graded successfully');
    
    res.json({
      success: true,
      message: 'Task submission graded successfully'
    });
    
  } catch (error) {
    console.error('Error grading task submission:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;