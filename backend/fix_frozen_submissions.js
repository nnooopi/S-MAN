const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Copy the freezing functions from student-leader-api.js
async function captureAllTaskSubmissionsForProject(projectId, groupId, leaderId) {
  try {
    console.log('🔍 [PROJECT-FREEZE] Starting comprehensive task submission capture for project:', projectId);
    
    // Get ALL phases for this project
    const { data: projectPhases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title')
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

async function captureTaskSubmissionsForPhase(phaseId, groupId, leaderId) {
  try {
    console.log('🔍 [FREEZE] Starting task submission capture for phase:', phaseId, 'group:', groupId);
    
    // Get all group members
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
      
      // PRIORITY 1: Look for approved revision submissions first
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

async function createFrozenSubmission(task, studentId, originalSubmission, phaseId, groupId, leaderId, submissionType = 'no_submission', isRevision = false) {
  try {
    // Determine the display status and data based on submission type and whether it's a revision
    let displayStatus, submissionText, fileUrls, submittedAt;
    
    switch(submissionType) {
      case 'approved_revision':
        displayStatus = 'approved';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_paths || '[]'; 
        submittedAt = originalSubmission?.submitted_at || originalSubmission?.created_at || null;
        break;
        
      case 'approved_original':
        displayStatus = 'approved';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_urls || '[]';
        submittedAt = originalSubmission?.submission_date || originalSubmission?.created_at || null;
        break;
        
      case 'latest_revision':
        displayStatus = originalSubmission?.status || 'pending';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_paths || '[]';
        submittedAt = originalSubmission?.submitted_at || originalSubmission?.created_at || null;
        break;
        
      case 'latest_original':
        displayStatus = originalSubmission?.status || 'pending';
        submissionText = originalSubmission?.submission_text || null;
        fileUrls = originalSubmission?.file_urls || '[]';
        submittedAt = originalSubmission?.submission_date || originalSubmission?.created_at || null;
        break;
        
      case 'assigned_no_submission':
        displayStatus = 'assigned_no_submission';
        submissionText = 'Task was assigned but no submission was made';
        fileUrls = '[]';
        submittedAt = null;
        break;
        
      default:
        displayStatus = 'no_submission';
        submissionText = 'No task assigned or submitted';
        fileUrls = '[]';
        submittedAt = null;
    }
    
    const frozenData = {
      task_id: task.id,
      phase_id: phaseId,
      group_id: groupId,
      student_id: studentId,
      original_submission_id: originalSubmission?.id || null,
      task_title: task.title,
      task_description: task.description,
      submission_text: submissionText,
      file_urls: fileUrls,
      original_status: displayStatus,
      original_submitted_at: submittedAt,
      frozen_at: new Date().toISOString(),
      frozen_by_leader: leaderId,
      attempt_number: isRevision ? originalSubmission?.revision_attempt_number || 0 : originalSubmission?.attempt_number || 0,
      submission_type: submissionType,
      is_revision_based: isRevision
    };
    
    console.log(`📸 [FREEZE] Creating frozen submission for ${task.title}:`, {
      student_id: studentId,
      submission_type: submissionType,
      status: displayStatus,
      has_original: !!originalSubmission,
      is_revision_based: isRevision
    });
    
    // Create new frozen submission
    const { error: createError } = await supabase
      .from('frozen_task_submissions')
      .insert(frozenData);
      
    if (createError) {
      console.error('❌ [FREEZE] Error creating frozen submission:', createError);
    } else {
      console.log('✅ [FREEZE] Frozen submission created');
    }
    
  } catch (error) {
    console.error('❌ [FREEZE] Error in createFrozenSubmission:', error);
  }
}

async function fixExistingProjectSubmission() {
  console.log('🔧 Fixing existing project submission - adding missing frozen task submissions...');
  
  const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8';
  const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
  const leaderId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  
  await captureAllTaskSubmissionsForProject(projectId, groupId, leaderId);
  
  console.log('🎉 Fix completed! Check frozen_task_submissions table now.');
}

fixExistingProjectSubmission();