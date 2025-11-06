const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentTableStructure() {
  console.log('🔍 Checking current table structure...');
  
  try {
    // Try a select to see what columns are available
    const { data, error } = await supabase
      .from('frozen_task_submissions')
      .select('*')
      .limit(0);
      
    if (error) {
      console.error('❌ Error checking table:', error);
    } else {
      console.log('✅ Table accessible, columns available for insert/select');
    }
    
    // Now try inserting real data with known good task IDs
    console.log('🧪 Attempting insert with real task data...');
    
    // Use actual task IDs from your data
    const testData = {
      task_id: 'b8737fcf-1936-4f8a-9ccd-e7e0ee5f2af7', // Essay on Global Warming
      phase_id: '108d3c32-96ce-42ac-ae3a-56803eb9b23c', // Phase 1
      group_id: 'ed82fd19-d1df-4ac7-9813-99aff39b516b',
      student_id: 'b7c6af2a-1fcb-4b72-ae69-088672884006', 
      task_title: 'Essay on Global Warming',
      task_description: 'Write an essay about climate change',
      submission_text: 'Task was assigned but no submission was made',
      file_urls: '[]',
      original_status: 'no_submission',
      frozen_by_leader: 'b7c6af2a-1fcb-4b72-ae69-088672884006'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('frozen_task_submissions')
      .insert(testData)
      .select();
      
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Test insert successful!', insertData);
      
      // Clean up
      await supabase
        .from('frozen_task_submissions')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkCurrentTableStructure();