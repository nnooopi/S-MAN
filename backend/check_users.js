const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qorkowgfjjuwxelumuut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

async function checkUserMismatch() {
  console.log('🔍 Checking for user ID mismatches...\n');

  // Get all student accounts
  const { data: students, error } = await supabase
    .from('studentaccounts')
    .select('id, email, first_name, last_name');

  if (error) {
    console.error('❌ Error getting students:', error);
    return;
  }

  console.log('📋 Students in database:');
  students.forEach(s => {
    console.log(`  ID: ${s.id} | Email: ${s.email} | Name: ${s.first_name} ${s.last_name}`);
  });

  // Check the specific leader ID we know exists
  const leaderStudentId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  const leaderStudent = students.find(s => s.id === leaderStudentId);
  
  if (leaderStudent) {
    console.log('\n✅ Leader student found:', leaderStudent);
  } else {
    console.log('\n❌ Leader student not found in database!');
  }

  // Now let's also check what email might be triggering the error
  console.log('\n=== CHECKING COURSE GROUP MEMBERS ===');
  const { data: groupMembers, error: gmError } = await supabase
    .from('course_group_members')
    .select(`
      id,
      student_id,
      role,
      studentaccounts!inner(email, first_name, last_name)
    `)
    .eq('role', 'leader')
    .eq('is_active', true);

  if (gmError) {
    console.error('❌ Error getting group members:', gmError);
  } else {
    console.log('👤 Leaders in groups:');
    groupMembers.forEach(gm => {
      console.log(`  Student ID: ${gm.student_id} | Email: ${gm.studentaccounts.email} | Name: ${gm.studentaccounts.first_name} ${gm.studentaccounts.last_name}`);
    });
  }
}

checkUserMismatch();