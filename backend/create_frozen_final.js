const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFrozenSubmissionsWithCorrectData() {
  console.log('🔍 Getting correct task IDs and creating frozen submissions...');
  
  try {
    // Get the actual task IDs for the project
    const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8';
    const phaseId = '108d3c32-96ce-42ac-ae3a-56803eb9b23c'; // Phase 1
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
    const leaderId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
    
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
        .select('*')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      console.log(`📊 Originals: ${originals?.length || 0}, Revisions: ${revisions?.length || 0}`);
      
      let selectedSubmission = null;
      let submissionType = 'no_submission';
      let isRevision = false;
      
      // PRIORITY LOGIC
      if (revisions && revisions.length > 0) {
        const approvedRevision = revisions.find(rev => rev.status === 'approved');
        if (approvedRevision) {
          selectedSubmission = approvedRevision;
          submissionType = 'approved_revision';
          isRevision = true;
          console.log(`✅ Using approved revision (attempt ${approvedRevision.revision_attempt_number})`);
        } else {
          selectedSubmission = revisions[0];
          submissionType = 'latest_revision';
          isRevision = true;
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
            console.log(`✅ Using approved original`);
          } else if (!selectedSubmission) {
            selectedSubmission = originals[0];
            submissionType = 'latest_original';
            isRevision = false;
            console.log(`📋 Using latest original (status: ${selectedSubmission.status})`);
          }
        }
      }
      
      if (!selectedSubmission) {
        submissionType = 'assigned_no_submission';
        console.log(`📝 No submission found - assigned but not submitted`);
      }
      
      // Prepare frozen data
      let displayStatus, submissionText, fileUrls, submittedAt;
      
      switch(submissionType) {
        case 'approved_revision':
          displayStatus = 'approved';
          submissionText = selectedSubmission?.submission_text || null;
          fileUrls = selectedSubmission?.file_paths ? JSON.stringify(selectedSubmission.file_paths) : '[]';
          submittedAt = selectedSubmission?.submitted_at || selectedSubmission?.created_at || null;
          break;
          
        case 'approved_original':
          displayStatus = 'approved';
          submissionText = selectedSubmission?.submission_text || null;
          fileUrls = selectedSubmission?.file_urls || '[]';
          submittedAt = selectedSubmission?.submission_date || selectedSubmission?.created_at || null;
          break;
          
        case 'latest_revision':
          displayStatus = selectedSubmission?.status || 'pending';
          submissionText = selectedSubmission?.submission_text || null;
          fileUrls = selectedSubmission?.file_paths ? JSON.stringify(selectedSubmission.file_paths) : '[]';
          submittedAt = selectedSubmission?.submitted_at || selectedSubmission?.created_at || null;
          break;
          
        case 'latest_original':
          displayStatus = selectedSubmission?.status || 'pending';
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
        original_submission_id: selectedSubmission?.id || null,
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
      
      console.log(`📸 Creating frozen submission...`);
      
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
    
    console.log('\n🎉 All frozen submissions created! Check the frozen_task_submissions table.');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
  }
}

createFrozenSubmissionsWithCorrectData();