const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFrozenSubmissionsFixed() {
  console.log('🔍 Creating frozen submissions with fixed foreign key handling...');
  
  try {
    // Clear any existing frozen submissions for this phase/group first
    const phaseId = '108d3c32-96ce-42ac-ae3a-56803eb9b23c'; // Phase 1
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
    const leaderId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
    
    console.log('🧹 Clearing existing frozen submissions...');
    await supabase
      .from('frozen_task_submissions')
      .delete()
      .eq('phase_id', phaseId)
      .eq('group_id', groupId);
    
    // Get the actual task IDs for the project
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, description, assigned_to')
      .eq('phase_id', phaseId);
      
    if (taskError) {
      console.error('❌ Error getting tasks:', taskError);
      return;
    }
    
    console.log('📋 Found tasks:', tasks?.length || 0);
    
    for (const task of tasks || []) {
      console.log(`\n🎯 Processing task: ${task.title} (ID: ${task.id})`);
      
      // Get original submissions
      const { data: originals, error: origError } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      // Get revision submissions
      const { data: revisions, error: revError } = await supabase
        .from('revision_submissions')
        .select('*, original_submission_id')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      console.log(`📊 Originals: ${originals?.length || 0}, Revisions: ${revisions?.length || 0}`);
      
      let selectedSubmission = null;
      let submissionType = 'no_submission';
      let isRevision = false;
      let originalSubmissionId = null; // This should reference task_submissions table only
      
      // PRIORITY LOGIC
      if (revisions && revisions.length > 0) {
        const approvedRevision = revisions.find(rev => rev.status === 'approved');
        if (approvedRevision) {
          selectedSubmission = approvedRevision;
          submissionType = 'approved_revision';
          isRevision = true;
          originalSubmissionId = approvedRevision.original_submission_id; // Use the FK to task_submissions
          console.log(`✅ Using approved revision (attempt ${approvedRevision.revision_attempt_number})`);
        } else {
          selectedSubmission = revisions[0];
          submissionType = 'latest_revision';
          isRevision = true;
          originalSubmissionId = selectedSubmission.original_submission_id; // Use the FK to task_submissions
          console.log(`📋 Using latest revision (status: ${selectedSubmission.status})`);
        }
      }
      
      if (!selectedSubmission || submissionType === 'latest_revision') {
        if (originals && originals.length > 0) {
          const approvedOriginal = originals.find(orig => orig.status === 'approved');
          if (approvedOriginal && submissionType !== 'latest_revision') {
            selectedSubmission = approvedOriginal;
            submissionType = 'approved_original';
            isRevision = false;
            originalSubmissionId = approvedOriginal.id; // Direct reference to task_submissions
            console.log(`✅ Using approved original`);
          } else if (!selectedSubmission) {
            selectedSubmission = originals[0];
            submissionType = 'latest_original';
            isRevision = false;
            originalSubmissionId = selectedSubmission.id; // Direct reference to task_submissions
            console.log(`📋 Using latest original (status: ${selectedSubmission.status})`);
          }
        }
      }
      
      if (!selectedSubmission) {
        submissionType = 'assigned_no_submission';
        originalSubmissionId = null; // No submission to reference
        console.log(`📝 No submission found - assigned but not submitted`);
      }
      
      // Prepare frozen data
      let displayStatus, submissionText, fileUrls, submittedAt;
      
      switch(submissionType) {
        case 'approved_revision':
        case 'latest_revision':
          displayStatus = submissionType === 'approved_revision' ? 'approved' : (selectedSubmission?.status || 'pending');
          submissionText = selectedSubmission?.submission_text || null;
          fileUrls = selectedSubmission?.file_paths ? JSON.stringify(selectedSubmission.file_paths) : '[]';
          submittedAt = selectedSubmission?.submitted_at || selectedSubmission?.created_at || null;
          break;
          
        case 'approved_original':
        case 'latest_original':
          displayStatus = submissionType === 'approved_original' ? 'approved' : (selectedSubmission?.status || 'pending');
          submissionText = selectedSubmission?.submission_text || null;
          fileUrls = selectedSubmission?.file_urls || '[]';
          submittedAt = selectedSubmission?.submission_date || selectedSubmission?.created_at || null;
          break;
          
        case 'assigned_no_submission':
          displayStatus = 'no_submission';
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
        student_id: task.assigned_to,
        original_submission_id: originalSubmissionId, // Now correctly references task_submissions only
        task_title: task.title,
        task_description: task.description,
        submission_text: submissionText,
        file_urls: fileUrls,
        original_status: displayStatus,
        original_submitted_at: submittedAt,
        frozen_at: new Date().toISOString(),
        frozen_by_leader: leaderId,
        attempt_number: isRevision ? selectedSubmission?.revision_attempt_number || 0 : selectedSubmission?.attempt_number || 0
      };
      
      console.log(`📸 Creating frozen submission (${submissionType})...`);
      
      // Insert frozen submission
      const { error: insertError } = await supabase
        .from('frozen_task_submissions')
        .insert(frozenData);
        
      if (insertError) {
        console.error('❌ Error creating frozen submission:', insertError);
      } else {
        console.log('✅ Frozen submission created successfully');
      }
    }
    
    // Verify the results
    const { data: frozen, error: frozenError } = await supabase
      .from('frozen_task_submissions')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('group_id', groupId);
      
    console.log(`\n🎉 Process complete! Created ${frozen?.length || 0} frozen submissions.`);
    
    frozen?.forEach((sub, i) => {
      console.log(`  ${i+1}. ${sub.task_title}: ${sub.original_status} (${sub.submission_text?.slice(0, 50)}...)`);
    });
    
  } catch (error) {
    console.error('❌ Process failed:', error);
  }
}

createFrozenSubmissionsFixed();