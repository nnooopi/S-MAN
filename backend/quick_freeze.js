const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simplified version that works with current table schema
async function createFrozenSubmissionSimple(task, studentId, originalSubmission, phaseId, groupId, leaderId, submissionType = 'no_submission', isRevision = false) {
  try {
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
        displayStatus = 'no_submission'; // Use valid enum value
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
    
    // Simplified data structure without problematic columns
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

async function quickFreezeExistingSubmissions() {
  console.log('🚀 Quick freeze with current table schema...');
  
  const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8';
  const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
  const leaderId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  const phaseId = '108d3c32-96ce-42ac-ae3a-56803eb9b23c'; // Phase 1
  
  // Manually create the 5 submissions we identified
  const submissions = [
    {
      task: {id: '1', title: 'Essay on Global Warming', description: 'Climate essay'},
      studentId: leaderId,
      submission: null,
      submissionType: 'assigned_no_submission',
      isRevision: false
    },
    {
      task: {id: '2', title: 'Essay on Political Dynasties', description: 'Politics essay'},
      studentId: leaderId,
      submission: {id: 'rev1', submission_text: 'Political dynasties content', file_paths: [], submitted_at: '2025-09-26T16:23:17.919Z', revision_attempt_number: 1},
      submissionType: 'approved_revision',
      isRevision: true
    },
    {
      task: {id: '3', title: 'testestestes', description: 'Test task'},
      studentId: leaderId,
      submission: {id: 'rev2', submission_text: 'Test content', file_paths: [], submitted_at: '2025-09-25T04:56:07.562Z', revision_attempt_number: 2},
      submissionType: 'approved_revision',
      isRevision: true
    },
    {
      task: {id: '4', title: 'zzzzzzzzz', description: 'Another test'},
      studentId: leaderId,
      submission: null,
      submissionType: 'assigned_no_submission',
      isRevision: false
    },
    {
      task: {id: '5', title: '111111111111111', description: 'Number test'},
      studentId: leaderId,
      submission: {id: 'rev3', submission_text: 'Number content', file_paths: [], submitted_at: '2025-09-25T09:01:37.168Z', revision_attempt_number: 3},
      submissionType: 'approved_revision',
      isRevision: true
    }
  ];
  
  for (const sub of submissions) {
    await createFrozenSubmissionSimple(
      sub.task,
      sub.studentId, 
      sub.submission,
      phaseId,
      groupId,
      leaderId,
      sub.submissionType,
      sub.isRevision
    );
  }
  
  console.log('✅ Quick freeze completed!');
}

quickFreezeExistingSubmissions();