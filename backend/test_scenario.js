const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qorkowgfjjuwxelumuut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

async function testExactScenario() {
  const projectId = 'b9c79161-1bac-4906-bb3b-87f5b48371eb';
  const knownLeaderEmail = 'mbsoriano4936val@student.fatima.edu.ph';
  
  console.log('🧪 Testing exact scenario from frontend error...\n');

  console.log('=== STEP 1: GET PROJECT INFO ===');
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, course_id, title')
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error('❌ Project error:', projectError);
    return;
  }
  console.log('📋 Project found:', project);

  console.log('\n=== STEP 2: LOOKUP STUDENT BY EMAIL ===');
  const { data: student, error: studentError } = await supabase
    .from('studentaccounts')
    .select('id, email, first_name, last_name')
    .eq('email', knownLeaderEmail)
    .single();

  if (studentError) {
    console.error('❌ Student error:', studentError);
    return;
  }
  console.log('👤 Student found:', student);

  console.log('\n=== STEP 3: CHECK LEADER MEMBERSHIPS FOR THIS STUDENT ===');
  const { data: memberships, error: membershipError } = await supabase
    .from('course_group_members')
    .select(`
      id,
      group_id,
      student_id,
      role,
      is_active,
      course_groups (
        id,
        course_id,
        group_name,
        is_active
      )
    `)
    .eq('student_id', student.id)
    .eq('role', 'leader')
    .eq('is_active', true);

  if (membershipError) {
    console.error('❌ Membership error:', membershipError);
    return;
  }

  console.log('👥 Leader memberships found:', memberships?.length || 0);
  memberships?.forEach((m, i) => {
    console.log(`  ${i + 1}. Group: ${m.course_groups?.group_name} | Course: ${m.course_groups?.course_id}`);
  });

  console.log('\n=== STEP 4: CHECK AUTHORIZATION FOR THIS PROJECT ===');
  const validMembership = memberships?.find(m => 
    m.course_groups && 
    m.course_groups.course_id === project.course_id &&
    m.course_groups.is_active
  );

  if (validMembership) {
    console.log('✅ AUTHORIZATION SUCCESS!');
    console.log('✅ Valid membership found:', {
      membershipId: validMembership.id,
      groupId: validMembership.group_id,
      groupName: validMembership.course_groups.group_name,
      courseId: validMembership.course_groups.course_id,
      projectCourseId: project.course_id,
      match: validMembership.course_groups.course_id === project.course_id
    });
  } else {
    console.log('❌ AUTHORIZATION FAILED!');
    console.log('Available courses:', memberships?.map(m => m.course_groups?.course_id) || []);
    console.log('Required course:', project.course_id);
  }

  console.log('\n=== STEP 5: SIMULATE WHAT THE MIDDLEWARE SHOULD DO ===');
  // This simulates what our authentication middleware should set
  const reqUserObject = {
    id: student.id, // This should be the DB student ID
    email: student.email,
    firstName: student.first_name,
    lastName: student.last_name,
    fullName: `${student.first_name} ${student.last_name}`
  };

  console.log('👤 req.user object that middleware should create:', reqUserObject);

  // Test the query that the leader dashboard endpoint would run
  console.log('\n=== STEP 6: TEST THE ACTUAL LEADER DASHBOARD QUERY ===');
  const { data: dashboardMemberships, error: dashboardError } = await supabase
    .from('course_group_members')
    .select('*, course_groups(*)')
    .eq('student_id', reqUserObject.id) // Using the ID from req.user
    .eq('role', 'leader')
    .eq('is_active', true);

  console.log('🔍 Dashboard query result:', dashboardMemberships?.length || 0, 'memberships');
  if (dashboardError) {
    console.error('❌ Dashboard query error:', dashboardError);
  }

  const dashboardValidMembership = dashboardMemberships?.find(m =>
    m.course_groups &&
    m.course_groups.course_id === project.course_id &&
    m.course_groups.is_active
  );

  if (dashboardValidMembership) {
    console.log('✅ DASHBOARD AUTHORIZATION SHOULD WORK!');
  } else {
    console.log('❌ DASHBOARD AUTHORIZATION WOULD FAIL!');
    console.log('This means there\'s a bug in the authentication middleware or the query logic.');
  }
}

testExactScenario();