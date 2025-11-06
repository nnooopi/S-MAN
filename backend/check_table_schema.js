const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableSchema() {
  console.log('🔍 Checking frozen_task_submissions table schema...');
  
  try {
    // Try to insert a minimal record without the problematic columns
    const testData = {
      task_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      phase_id: '00000000-0000-0000-0000-000000000000',
      group_id: '00000000-0000-0000-0000-000000000000', 
      student_id: '00000000-0000-0000-0000-000000000000',
      task_title: 'Test Task',
      original_status: 'approved',
      frozen_by_leader: '00000000-0000-0000-0000-000000000000',
      submission_type: 'approved_revision'
      // Note: NOT including is_revision_based to test
    };
    
    const { data, error } = await supabase
      .from('frozen_task_submissions')
      .insert(testData)
      .select();
      
    if (error) {
      console.error('❌ Error inserting test data:', error);
      console.log('\n🔧 SOLUTION: You need to run the SQL file to update the table schema:');
      console.log('   Execute: frozen_task_submissions_table.sql in your database');
      console.log('   This will add the missing columns like is_revision_based');
    } else {
      console.log('✅ Table schema looks good - test insert worked');
      
      // Clean up test data
      await supabase
        .from('frozen_task_submissions')
        .delete()
        .eq('task_title', 'Test Task');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkTableSchema();