const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qorkowgfjjuwxelumuut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

async function debug403Issue() {
  console.log('🔍 DEBUGGING 403 ISSUE');
  console.log('='.repeat(50));
  
  const projectId = 'b9c79161-1bac-4906-bb3b-87f5b48371eb';
  const expectedStudentId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  
  // 1. Check project details
  console.log('1. PROJECT DETAILS:');
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, course_id, title')
    .eq('id', projectId)
    .single();
    
  console.log('Project:', project);
  console.log('Project Error:', projectError);
  
  if (!project) {
    console.log('❌ PROJECT NOT FOUND - THIS IS THE PROBLEM!');
    return;
  }
  
  // 2. Check student's leader memberships
  console.log('\n2. STUDENT LEADER MEMBERSHIPS:');
  const { data: memberships, error: membershipError } = await supabase
    .from('course_group_members')
    .select('*, course_groups(*)')
    .eq('student_id', expectedStudentId)
    .eq('role', 'leader')
    .eq('is_active', true);
    
  console.log('Memberships:', JSON.stringify(memberships, null, 2));
  console.log('Membership Error:', membershipError);
  
  // 3. Check specific course match
  console.log('\n3. COURSE MATCH CHECK:');
  if (memberships && memberships.length > 0) {
    console.log(`Project course ID: ${project.course_id}`);
    memberships.forEach((membership, i) => {
      console.log(`Membership ${i + 1}:`);
      console.log(`  - Group ID: ${membership.group_id}`);
      console.log(`  - Course ID: ${membership.course_groups?.course_id}`);
      console.log(`  - Matches project: ${membership.course_groups?.course_id === project.course_id ? '✅ YES' : '❌ NO'}`);
    });
    
    const validMembership = memberships.find(m => 
      m.course_groups && 
      m.course_groups.course_id === project.course_id &&
      m.course_groups.is_active
    );
    
    console.log('\n4. FINAL AUTHORIZATION RESULT:');
    if (validMembership) {
      console.log('✅ SHOULD BE AUTHORIZED - Valid leadership found');
      console.log('Valid membership details:', {
        groupId: validMembership.group_id,
        courseId: validMembership.course_groups.course_id,
        groupName: validMembership.course_groups.group_name
      });
    } else {
      console.log('❌ SHOULD BE DENIED - No valid leadership for this course');
    }
  } else {
    console.log('❌ NO LEADER MEMBERSHIPS FOUND');
  }
  
  // 5. Double-check by email lookup
  console.log('\n5. VERIFY BY EMAIL LOOKUP:');
  const { data: studentByEmail, error: emailError } = await supabase
    .from('studentaccounts')
    .select('id, email, first_name, last_name')
    .eq('id', expectedStudentId)
    .single();
    
  console.log('Student record:', studentByEmail);
  console.log('Email error:', emailError);
  
  if (studentByEmail) {
    console.log(`Student email: ${studentByEmail.email}`);
    
    // Check memberships by email-found student ID (should be same as expectedStudentId)
    const { data: emailMemberships, error: emailMembershipError } = await supabase
      .from('course_group_members')
      .select('*, course_groups(*)')
      .eq('student_id', studentByEmail.id)
      .eq('role', 'leader')
      .eq('is_active', true);
      
    console.log('Email-based memberships match:', JSON.stringify(emailMemberships, null, 2) === JSON.stringify(memberships, null, 2) ? '✅ SAME' : '❌ DIFFERENT');
  }
}

debug403Issue().catch(console.error);