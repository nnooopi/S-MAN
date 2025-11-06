const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qorkowgfjjuwxelumuut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

async function debugQuery() {
  console.log('🔍 DEBUGGING LEADER DASHBOARD QUERY');
  console.log('='.repeat(50));
  
  const studentId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  
  console.log('1. TESTING THE EXACT FAILING QUERY:');
  try {
    let { data: leaderMemberships, error: membershipError } = await supabase
      .from('course_group_members')
      .select('*, course_groups(*)')
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    console.log('Direct query result:', leaderMemberships);
    console.log('Direct query error:', membershipError);
  } catch (error) {
    console.log('Direct query exception:', error.message);
  }
  
  console.log('\n2. TESTING SIMPLIFIED QUERY (no join):');
  try {
    const { data: simpleMemberships, error: simpleError } = await supabase
      .from('course_group_members')
      .select('*')
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    console.log('Simple query result:', simpleMemberships);
    console.log('Simple query error:', simpleError);
  } catch (error) {
    console.log('Simple query exception:', error.message);
  }
  
  console.log('\n3. TESTING MANUAL JOIN APPROACH:');
  try {
    // First get the memberships
    const { data: memberships, error: memberError } = await supabase
      .from('course_group_members')
      .select('*')
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    console.log('Step 1 - Memberships:', memberships);
    
    if (memberships && memberships.length > 0) {
      // Then get the course groups
      const groupIds = memberships.map(m => m.group_id);
      const { data: courseGroups, error: groupError } = await supabase
        .from('course_groups')
        .select('*')
        .in('id', groupIds);
      
      console.log('Step 2 - Course Groups:', courseGroups);
      
      // Manually combine
      const combined = memberships.map(membership => {
        const courseGroup = courseGroups?.find(cg => cg.id === membership.group_id);
        return {
          ...membership,
          course_groups: courseGroup
        };
      });
      
      console.log('Step 3 - Combined Result:', combined);
    }
  } catch (error) {
    console.log('Manual join exception:', error.message);
  }
  
  console.log('\n4. TESTING DIFFERENT JOIN SYNTAX:');
  try {
    const { data: altMemberships, error: altError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups (
          *
        )
      `)
      .eq('student_id', studentId)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    console.log('Alternative join result:', altMemberships);
    console.log('Alternative join error:', altError);
  } catch (error) {
    console.log('Alternative join exception:', error.message);
  }
}

debugQuery().catch(console.error);