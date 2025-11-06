const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFrozenTable() {
  console.log('🧪 Testing frozen_task_submissions table...');
  
  try {
    // Test if table exists by querying it
    const { data, error } = await supabase
      .from('frozen_task_submissions')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Error querying frozen_task_submissions table:', error);
      console.log('🔧 You may need to run the SQL file to create the table:');
      console.log('   Execute: frozen_task_submissions_table.sql');
    } else {
      console.log('✅ frozen_task_submissions table exists and is accessible');
      console.log('📊 Current record count:', data?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrozenTable();