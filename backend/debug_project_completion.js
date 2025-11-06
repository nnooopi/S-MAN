const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugProjectCompletion() {
  console.log('🔍 Debugging Project Completion submissions...');
  
  try {
    // Check if there are any project submissions
    const { data: projectSubmissions, error: projError } = await supabase
      .from('project_submissions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (projError) {
      console.error('❌ Error querying project_submissions:', projError);
      return;
    }
    
    console.log('📋 Project submissions found:', projectSubmissions?.length || 0);
    
    if (projectSubmissions && projectSubmissions.length > 0) {
      const latest = projectSubmissions[0];
      console.log('🏁 Latest project submission:', {
        id: latest.id,
        project_id: latest.project_id,
        group_id: latest.group_id,
        submitted_by: latest.submitted_by,
        submission_date: latest.submission_date,
        file_urls: latest.file_urls?.length || 0
      });
      
      // Check if there are any phases for this project
      const { data: phases, error: phaseError } = await supabase
        .from('project_phases')
        .select('id, phase_number, title')
        .eq('project_id', latest.project_id)
        .order('phase_number');
        
      console.log('📊 Phases for this project:', phases?.length || 0);
      phases?.forEach(phase => {
        console.log(`  - Phase ${phase.phase_number}: ${phase.title} (ID: ${phase.id})`);
      });
      
      // Check if there are any tasks for these phases
      if (phases && phases.length > 0) {
        for (const phase of phases) {
          const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('id, title, assigned_to')
            .eq('phase_id', phase.id);
            
          console.log(`📋 Tasks in Phase ${phase.phase_number}:`, tasks?.length || 0);
          tasks?.forEach(task => {
            console.log(`    - ${task.title} (assigned to: ${task.assigned_to})`);
          });
        }
      }
      
      // Check group members
      const { data: members, error: memberError } = await supabase
        .from('course_group_members')
        .select(`
          student_id,
          role,
          studentaccounts(first_name, last_name)
        `)
        .eq('group_id', latest.group_id)
        .eq('is_active', true);
        
      console.log('👥 Group members:', members?.length || 0);
      members?.forEach(member => {
        console.log(`  - ${member.studentaccounts?.first_name} ${member.studentaccounts?.last_name} (${member.role}) - ID: ${member.student_id}`);
      });
    }
    
    // Check frozen submissions
    const { data: frozen, error: frozenError } = await supabase
      .from('frozen_task_submissions')
      .select('*')
      .order('frozen_at', { ascending: false });
      
    console.log('🧊 Frozen task submissions:', frozen?.length || 0);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugProjectCompletion();