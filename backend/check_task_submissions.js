const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTaskSubmissions() {
  console.log('🔍 Checking task submissions that should be frozen...');
  
  try {
    // Get the specific project and phases
    const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8';
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
    
    // Check all task submissions for tasks in this project
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id, 
        title, 
        assigned_to,
        project_phases!inner(project_id, phase_number, title)
      `)
      .eq('project_phases.project_id', projectId);
      
    if (taskError) {
      console.error('❌ Error getting tasks:', taskError);
      return;
    }
    
    console.log('📋 Tasks found:', tasks?.length || 0);
    
    for (const task of tasks || []) {
      console.log(`\n🎯 Task: ${task.title}`);
      console.log(`   Phase: ${task.project_phases.phase_number} - ${task.project_phases.title}`);
      console.log(`   Assigned to: ${task.assigned_to}`);
      
      // Check original submissions
      const { data: originals, error: origError } = await supabase
        .from('task_submissions')
        .select('id, status, submission_date, submission_text')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      console.log(`   📤 Original submissions: ${originals?.length || 0}`);
      originals?.forEach((sub, i) => {
        console.log(`     ${i+1}. Status: ${sub.status}, Date: ${sub.submission_date}`);
      });
      
      // Check revision submissions
      const { data: revisions, error: revError } = await supabase
        .from('revision_submissions')
        .select('id, status, submitted_at, revision_attempt_number')
        .eq('task_id', task.id)
        .eq('submitted_by', task.assigned_to)
        .order('created_at', { ascending: false });
        
      console.log(`   📝 Revision submissions: ${revisions?.length || 0}`);
      revisions?.forEach((rev, i) => {
        console.log(`     ${i+1}. Status: ${rev.status}, Attempt: ${rev.revision_attempt_number}, Date: ${rev.submitted_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkTaskSubmissions();